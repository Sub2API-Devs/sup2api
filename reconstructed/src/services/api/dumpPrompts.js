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
import { join, dirname, join as join_2, join as join_3 } from "path";
import { promises } from "fs";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getSessionId, isDiskless } from "../../bootstrap/state.js";
import { Ws } from "./streamFallbackWarning.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { fetchWithRequestBodyCompression } from "./gzipRequestBody.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { SXn } from "./incrementalRequestBody.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { isUncachedSystemBlock } from "./promptCacheBreakDetection.js";
import { cleanupOldFilesMatching } from "../../utils/cleanup.js";
import { Pai } from "../../utils/sandbox/celHostFunctions.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { noop } from "../../utils/batchedLogWriter.js";

/**
 * 请求转储用的常量：核心字段集合、带 thread 的字段集合、去除计费头动态字段与 tk 的正则、保留数量。
 */
//@ chunk-98z6pwp4.js:703-1016 placement
var DUMP_CORE_KEYS = new Set([
    "model",
    "system",
    "tools",
    "max_tokens",
    "thinking",
    "output_config",
    "context_management",
    "metadata",
  ]),
  DUMP_THREAD_KEYS = new Set([...DUMP_CORE_KEYS, "thread"]),
  VOLATILE_ATTRIBUTION_PATTERN =
    / cc_(?:prev_req|prompt_id|turn_origin|prompt_index|turn_index|workload|prev_msg|prev_prompt_index|prev_turn_index)=[^;"\\]*;/g,
  VOLATILE_TOKEN_PATTERN = /,\\"tk\\":\\"[0-9a-fA-F-]{36}\\"/g,
  DUMP_MAX_FILES = 5;
//@ chunk-98z6pwp4.js:1016-1037 placement
class l {
  recording = !0;
}
//@ chunk-98z6pwp4.js:1037-1060 placement
var A = new HostScoped(() => new l());
//@ chunk-98z6pwp4.js:1060-1105 placement
function w() {
  return A.of(getRootSession().host).recording;
}
/**
 * 子代理结束时删除其提示转储状态，并记下它已写过的初始化数据哈希。
 */
//@ chunk-98z6pwp4.js:1105-1247 placement
function retireAgentDumpState(t) {
  let { stateByAgent: stateByAgent, retiredInitHashes: retiredInitHashes } = Ws().dumpPrompts,
    r = stateByAgent.get(t)?.writtenInitDataHash;
  if ((stateByAgent.delete(t), r !== void 0)) retiredInitHashes.set(t, r);
}
//@ chunk-98z6pwp4.js:1247-1343 placement
function dWs() {
  (Ws().dumpPrompts.stateByAgent.clear(), Ws().dumpPrompts.retiredInitHashes.clear());
}
//@ chunk-98z6pwp4.js:1343-1364 placement
function H(t) {
  return;
}
//@ chunk-98z6pwp4.js:1364-1426 placement = getDumpPromptsPath (1)
function getDumpPromptsPath_2(agentIdOrSessionId) {
  return join(getClaudeConfigDir(), "dump-prompts", `${agentIdOrSessionId ?? getSessionId()}.jsonl`);
}
//@ chunk-98z6pwp4.js:1426-1660 placement
function appendDumpLine(path, line, storage, onWritten) {
  Ws()
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
      (await promises.mkdir(dirname(path), { recursive: !0 }),
        await promises.appendFile(
          path,
          line +
            `
`,
        ),
        onWritten());
    })
    .catch(() => {});
}
/**
 * 写转储的回调（本构建里写入逻辑被裁空，只复位 dumpInFlight）。
 */
//@ chunk-98z6pwp4.js:1660-1727 layout
function writePromptDump(t, n, e, r, s) {
  try {
    return;
  } catch {
  } finally {
    e.dumpInFlight = !1;
  }
}
/**
 * 开启转储时返回包装 fetch：POST 且有请求体时异步写转储（同一代理同时只有一个在写），然后照常发请求；未开启返回默认 fetch。
 */
//@ chunk-98z6pwp4.js:1727-2233 callgraph-fingerprint = createDumpPromptsFetch (0.259)
function createDumpPromptsFetch(t, n) {
  if (!w()) return fetchWithRequestBodyCompression;
  let filePath = getDumpPromptsPath_2(t),
    r =
      isStorageV5Enabled() && n !== void 0 ? { storageV5: n, key: STORAGE_SPACES.log(t, "apiDump") } : void 0,
    s = async (input, init) => {
      let { stateByAgent: stateByAgent, retiredInitHashes: retiredInitHashes } = Ws().dumpPrompts,
        m = retiredInitHashes.get(t),
        state = stateByAgent.get(t) ?? {
          initialized: m !== void 0,
          lastInitDataHash: m ?? "",
          writtenInitDataHash: m,
          dumpInFlight: !1,
        };
      if ((stateByAgent.set(t, state), init?.method === "POST" && init.body && !state.dumpInFlight)) {
        state.dumpInFlight = !0;
        let iso = new Date().toISOString();
        setImmediate(
          writePromptDump,
          Buffer.isBuffer(init.body) ? init.body.toString() : init.body,
          iso,
          state,
          filePath,
          r,
        );
      }
      return fetchWithRequestBodyCompression(input, init);
    };
  return (SXn(s), s);
}
//@ chunk-98z6pwp4.js:2233-2501 placement
function isThreadContinuation(t) {
  let n = t.get("thread");
  if (n === void 0) return !1;
  let e = jsonParseRaw(n);
  if (typeof e !== "object" || e === null || !("type" in e) || e.type !== "continue") return !1;
  if (!t.has("tools")) return !0;
  let r = jsonParseRaw(t.get("system") ?? "null");
  return Array.isArray(r) && r.length > 0 && r.every((s) => isUncachedSystemBlock(s));
}
/**
 * dump-prompts 文件路径（配置目录下 dump-prompts/*.jsonl）。
 */
//@ chunk-23fm9f0d.js:28667-28730 fingerprint = getDumpPromptsPath (1)
function getDumpPromptsPath() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "dump-prompts"), ".jsonl", !0, Pai);
}
/**
 * 判断 400 "differing field(s)" 错误是否涉及 system/tools（缓存前缀快照不一致），用于决定是否重新初始化提示词快照。
 */
//@ chunk-e6aww6q8.js:2603522-2603807 fingerprint = initFingerprint (0.508)
function initFingerprint(e, n) {
  if (!n.system && !n.tools) return !1;
  if (!(e instanceof Ot)) return !0;
  let match = /differing field\(s\):\s*([A-Za-z_,\s-]+)/i.exec(e.message);
  if (!match) return !0;
  let mapped = match[1].split(",").map((h) => h.trim().toLowerCase());
  return (n.system && mapped.includes("system")) || (n.tools && mapped.includes("tools"));
}
/**
 * 追加写文件，目录不存在时先建目录再写。
 */
//@ chunk-k7fgdyw5.js:1618-1738 fingerprint = appendToFile (0.853)
async function appendToFile(e, r, o) {
  let s = getFsImplementation();
  try {
    await s.appendFile(r, o);
  } catch {
    (await s.mkdir(e).catch(noop), await s.appendFile(r, o));
  }
}

export {
  retireAgentDumpState,
  getDumpPromptsPath,
  createDumpPromptsFetch,
  dWs,
  initFingerprint,
  appendToFile,
};
