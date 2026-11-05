/**
 * tasks/scriptLaunchedAgents.ts
 *
 * 恢复上一会话里由脚本启动、仍未结束的子代理：读 sidecar 元数据并给 code mode 附 send-message 提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0fzs0p0w.js (5)
 * attribution: placement 5
 */
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { isEvalToolName } from "../tools/REPLTool/constants.js";
import {
  listSubagentIdsFromDisk,
  getAgentTranscriptPath,
  readAgentMetadata,
} from "../utils/sessionStorage.js";
import { isCodeModeEnabled } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { SENDMESSAGE } from "../tools/SendMessageTool/constants.js";
import { normalizeAgentIdOrNull } from "../utils/agentId.js";
import { keyFromMetaPath } from "../utils/storage/storageKeys.js";
import { makeSidecarReadFallback } from "../utils/agentMetadata.js";
import { isWebFetchAgent_2 } from "../tools/WebFetchTool/harnessNotes.js";
import { openNoFollow_2 } from "../utils/fsSafety/hardenedRead.js";
import { jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-0fzs0p0w.js:13054-13071 placement
var BATCH_SIZE = 32;
var MAX_SIDECAR_BYTES = 65536;
//@ chunk-0fzs0p0w.js:13071-13515 placement
/**
 * 列出上一会话由脚本（REPL 脚本）启动、且本次恢复时仍未结束的子代理：先从助手消息里收集 fork/代理工具的 tool_use id，再按批读 sidecar 元数据，返回仍可续跑的代理。仅供 ae()（REPL 模式）启用。
 */
async function findScriptLaunchedAgents(messages, seen, deps) {
  if (!codeModeAccepted()) return [];
  let toolUseIds = new Set();
  for (let message of messages) {
    if (message.type !== "assistant" || message.isVirtual === true || !Array.isArray(message.message.content))
      continue;
    for (let block of message.message.content)
      if (block.type === "tool_use" && isEvalToolName(block.name)) toolUseIds.add(block.id);
  }
  if (toolUseIds.size === 0) return [];
  let paths = (await listSubagentIdsFromDisk(deps)).filter((offset) => !seen.has(offset));
  let found = [];
  for (let start = 0; start < paths.length; start += BATCH_SIZE) {
    let batch = await Promise.all(
      paths.slice(start, start + BATCH_SIZE).map((path) => readAgentSidecar(path, toolUseIds, deps)),
    );
    for (let agent of batch) if (agent !== undefined) found.push(agent);
  }
  return found;
}
//@ chunk-0fzs0p0w.js:13515-13970 placement
/**
 * code mode 下任务通知的补充说明：提示用户用 SendMessage 的脚本形式按 id 给代理发消息，并提醒上一会话的 context handle 已失效。区分「只有一个代理」与「多个代理」两种措辞。
 */
function agentMessagingHint(toolNames, canMessage) {
  if (!codeModeAccepted() || !isCodeModeEnabled() || !toolNames.includes(SENDMESSAGE)) return "";
  return canMessage
    ? ` To message one of them, call await ${SENDMESSAGE}({to: "ID", message: "..."}) from a script, where ID is that agent's id from the list above. The previous session's contexts handles no longer work, so use the ids.`
    : ` To message it, call await ${SENDMESSAGE}({to: "ID", message: "..."}) from a script, where ID is the task id above. The previous session's contexts handles no longer work, so use the id.`;
}
//@ chunk-0fzs0p0w.js:13970-14497 placement
/**
 * 读单个 sidecar 元数据文件（.jsonl 换成 .meta.json），筛出符合恢复条件的脚本启动代理：enclosingToolUseId 在集合里、无 parentAgentId、不是前台请求、未被用户停止，返回 agentId 与描述。
 */
async function readAgentSidecar(path, declared, session) {
  let transcriptPath = normalizeAgentIdOrNull(path);
  if (transcriptPath === null) return;
  let sidecarPath = getAgentTranscriptPath(transcriptPath).replace(/\.jsonl$/, ".meta.json");
  let sidecar =
    session !== undefined && keyFromMetaPath(sidecarPath) !== undefined
      ? await readAgentMetadata(transcriptPath, session).catch(
          makeSidecarReadFallback("resume: script-launched agent scan"),
        )
      : await readSidecarAt(sidecarPath);
  if (sidecar === null) return;
  let enclosingToolUseId = sidecar.enclosingToolUseId;
  if (
    typeof enclosingToolUseId !== "string" ||
    !declared.has(enclosingToolUseId) ||
    sidecar.parentAgentId !== undefined ||
    sidecar.requestShape === "foreground" ||
    sidecar.isObserver === true ||
    sidecar.stoppedByUser === true
  )
    return;
  let { description, name } = sidecar;
  return {
    agentId: transcriptPath,
    description:
      typeof description === "string" ? description : typeof name === "string" ? name : transcriptPath,
    isWebFetchLaunch: isWebFetchAgent_2(sidecar.agentType),
  };
}
//@ chunk-0fzs0p0w.js:14497-14946 placement
/**
 * 读取 sidecar 文件（上限 64 KiB）并解析成对象；失败时记 resume 日志并返回 null。
 */
async function readSidecarAt(path) {
  let opened = await openNoFollow_2(path);
  if (!opened.ok) return null;
  let handle = opened.value;
  try {
    if (!(await handle.stat()).isFile()) return null;
    let buffer = Buffer.alloc(MAX_SIDECAR_BYTES + 1);
    let offset = 0;
    while (offset < buffer.length) {
      let { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > MAX_SIDECAR_BYTES) return null;
    let parsed = jsonParse(buffer.toString("utf8", 0, offset));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch (error) {
    logForDebugging(`resume: script-launched agent sidecar unreadable: ${error}`);
    return null;
  } finally {
    await handle.close().catch(() => {});
  }
}
export { agentMessagingHint, findScriptLaunchedAgents };
