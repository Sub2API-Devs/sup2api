/**
 * services/api/dumpPrompts.ts
 *
 * 调试用：把每次 POST 的请求体追加写到 <配置目录>/dump-prompts/<会话>.jsonl（包装 fetch）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/dumpPrompts.ts
 * pieces: chunk-23fm9f0d.js (1), chunk-98z6pwp4.js (12), chunk-e6aww6q8.js (1), chunk-k7fgdyw5.js (1)
 * attribution: fingerprint 3, placement 10, layout 1, callgraph-fingerprint 1
 */
import { join, dirname } from "path";
import { promises } from "fs";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { noop } from "../../utils/batchedLogWriter.js";
import { cleanupOldFilesMatching } from "../../utils/cleanup.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { CEL_MAX_STRING_ELEMENTS } from "../../utils/sandbox/celHostFunctions.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getSessionId, isDiskless } from "../../bootstrap/state.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { fetchWithRequestBodyCompression } from "./gzipRequestBody.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { markTakesRequestBodyBytes } from "./incrementalRequestBody.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { isUncachedSystemBlock } from "./promptCacheBreakDetection.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2603522-2603807 fingerprint = initFingerprint (0.508)
/**
 * 判断 400 "differing field(s)" 错误是否涉及 system/tools（缓存前缀快照不一致），用于决定是否重新初始化提示词快照。
 */
function initFingerprint(error, fields) {
  if (!fields.system && !fields.tools) return false;
  if (!(error instanceof APIError)) return true;
  let match = /differing field\(s\):\s*([A-Za-z_,\s-]+)/i.exec(error.message);
  if (!match) return true;
  let mapped = match[1].split(",").map((field) => field.trim().toLowerCase());
  return (fields.system && mapped.includes("system")) || (fields.tools && mapped.includes("tools"));
}
//@ chunk-k7fgdyw5.js:1618-1738 fingerprint = appendToFile (0.853)
/**
 * 追加写文件，目录不存在时先建目录再写。
 */
async function appendToFile(dirPath, filePath, text) {
  let fsImplementation = getFsImplementation();
  try {
    await fsImplementation.appendFile(filePath, text);
  } catch {
    await fsImplementation.mkdir(dirPath).catch(noop);
    await fsImplementation.appendFile(filePath, text);
  }
}
//@ chunk-23fm9f0d.js:28667-28730 fingerprint = getDumpPromptsPath (1)
/**
 * dump-prompts 文件路径（配置目录下 dump-prompts/*.jsonl）。
 */
function getDumpPromptsPath() {
  return cleanupOldFilesMatching(
    join(getClaudeConfigDir(), "dump-prompts"),
    ".jsonl",
    true,
    CEL_MAX_STRING_ELEMENTS,
  );
}
//@ chunk-98z6pwp4.js:703-1016 placement
/**
 * 请求转储用的常量：核心字段集合、带 thread 的字段集合、去除计费头动态字段与 tk 的正则、保留数量。
 */
var DUMP_CORE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DUMP_THREAD_KEYS;
var VOLATILE_ATTRIBUTION_PATTERN;
var VOLATILE_TOKEN_PATTERN;
var DUMP_MAX_FILES;
deferInit("chunk-98z6pwp4.js:703", () => {
  DUMP_CORE_KEYS = new Set([
    "model",
    "system",
    "tools",
    "max_tokens",
    "thinking",
    "output_config",
    "context_management",
    "metadata",
  ]);
  DUMP_THREAD_KEYS = new Set([...DUMP_CORE_KEYS, "thread"]);
  VOLATILE_ATTRIBUTION_PATTERN =
    / cc_(?:prev_req|prompt_id|turn_origin|prompt_index|turn_index|workload|prev_msg|prev_prompt_index|prev_turn_index)=[^;"\\]*;/g;
  VOLATILE_TOKEN_PATTERN = /,\\"tk\\":\\"[0-9a-fA-F-]{36}\\"/g;
  DUMP_MAX_FILES = 5;
});
//@ chunk-98z6pwp4.js:1016-1037 placement
class DumpRecordingState {
  recording = true;
}
//@ chunk-98z6pwp4.js:1037-1060 placement
var dumpRecordingSlot; // deferred: uses DumpRecordingState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-98z6pwp4.js:1037", () => {
  dumpRecordingSlot = new HostScoped(() => new DumpRecordingState());
});
//@ chunk-98z6pwp4.js:1060-1105 placement
function isDumpRecording() {
  return dumpRecordingSlot.of(getRootSession().host).recording;
}
//@ chunk-98z6pwp4.js:1105-1247 placement
/**
 * 子代理结束时删除其提示转储状态，并记下它已写过的初始化数据哈希。
 */
function retireAgentDumpState(agentIdForCleanup) {
  let { stateByAgent, retiredInitHashes } = streamFallbackWarning().dumpPrompts;
  let writtenInitDataHash = stateByAgent.get(agentIdForCleanup)?.writtenInitDataHash;
  stateByAgent.delete(agentIdForCleanup);
  if (writtenInitDataHash !== undefined) retiredInitHashes.set(agentIdForCleanup, writtenInitDataHash);
}
//@ chunk-98z6pwp4.js:1247-1343 placement
/**
 * 导出函数 `clearDumpPromptState`。
 */
function clearDumpPromptState() {
  streamFallbackWarning().dumpPrompts.stateByAgent.clear();
  streamFallbackWarning().dumpPrompts.retiredInitHashes.clear();
}
//@ chunk-98z6pwp4.js:1343-1364 placement
function noopDump(body) {
  return;
}
//@ chunk-98z6pwp4.js:1364-1426 placement = getDumpPromptsPath (1)
function getDumpPromptsPath_2(agentIdOrSessionId) {
  return join(getClaudeConfigDir(), "dump-prompts", `${agentIdOrSessionId ?? getSessionId()}.jsonl`);
}
//@ chunk-98z6pwp4.js:1426-1660 placement
function appendDumpLine(path, line, storage, onWritten) {
  streamFallbackWarning()
    .dumpPrompts.appendQueue.run(path, async () => {
      if (storage) {
        if (
          (
            await storage.storageV5.append(storage.key, [
              {
                data:
                  line +
                  `
`,
              },
            ])
          ).ok
        )
          onWritten();
        return;
      }
      if (isDiskless()) return;
      await promises.mkdir(dirname(path), {
        recursive: true,
      });
      await promises.appendFile(
        path,
        line +
          `
`,
      );
      onWritten();
    })
    .catch(() => {});
}
//@ chunk-98z6pwp4.js:1660-1727 layout
/**
 * 写转储的回调（本构建里写入逻辑被裁空，只复位 dumpInFlight）。
 */
function writePromptDump(bodyText, timestamp, state, filePath, storageTarget) {
  try {
    return;
  } catch {
  } finally {
    state.dumpInFlight = false;
  }
}
//@ chunk-98z6pwp4.js:1727-2233 callgraph-fingerprint = createDumpPromptsFetch (0.259)
/**
 * 开启转储时返回包装 fetch：POST 且有请求体时异步写转储（同一代理同时只有一个在写），然后照常发请求；未开启返回默认 fetch。
 */
function createDumpPromptsFetch(agentIdOrSessionId, storageV5) {
  if (!isDumpRecording()) return fetchWithRequestBodyCompression;
  let filePath = getDumpPromptsPath_2(agentIdOrSessionId);
  let storageTarget =
    isStorageV5Enabled() && storageV5 !== undefined
      ? {
          storageV5,
          key: STORAGE_SPACES.log(agentIdOrSessionId, "apiDump"),
        }
      : undefined;
  let wrapperFetch = async (input, init) => {
    let { stateByAgent, retiredInitHashes } = streamFallbackWarning().dumpPrompts;
    let retiredHash = retiredInitHashes.get(agentIdOrSessionId);
    let state = stateByAgent.get(agentIdOrSessionId) ?? {
      initialized: retiredHash !== undefined,
      lastInitDataHash: retiredHash ?? "",
      writtenInitDataHash: retiredHash,
      dumpInFlight: false,
    };
    stateByAgent.set(agentIdOrSessionId, state);
    if (init?.method === "POST" && init.body && !state.dumpInFlight) {
      state.dumpInFlight = true;
      let iso = new Date().toISOString();
      setImmediate(
        writePromptDump,
        Buffer.isBuffer(init.body) ? init.body.toString() : init.body,
        iso,
        state,
        filePath,
        storageTarget,
      );
    }
    return fetchWithRequestBodyCompression(input, init);
  };
  markTakesRequestBodyBytes(wrapperFetch);
  return wrapperFetch;
}
//@ chunk-98z6pwp4.js:2233-2501 placement
function isThreadContinuation(headers) {
  let threadHeader = headers.get("thread");
  if (threadHeader === undefined) return false;
  let parsedThread = jsonParseRaw(threadHeader);
  if (
    typeof parsedThread !== "object" ||
    parsedThread === null ||
    !("type" in parsedThread) ||
    parsedThread.type !== "continue"
  )
    return false;
  if (!headers.has("tools")) return true;
  let parsedSystem = jsonParseRaw(headers.get("system") ?? "null");
  return (
    Array.isArray(parsedSystem) &&
    parsedSystem.length > 0 &&
    parsedSystem.every((block) => isUncachedSystemBlock(block))
  );
}
export {
  retireAgentDumpState,
  getDumpPromptsPath,
  createDumpPromptsFetch,
  clearDumpPromptState,
  initFingerprint,
  appendToFile,
};
