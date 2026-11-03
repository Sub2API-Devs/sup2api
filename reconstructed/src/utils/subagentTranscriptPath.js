/**
 * utils/subagentTranscriptPath.ts
 *
 * 2.1.316 新增：子代理记录路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-afa5mksf.js (1)
 * attribution: placement 1
 */
import { mailboxKeyOf } from "./swarm/teammateMessageRepair.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { MAX_SIDE_PATH_DEPTH, validateStorageKey } from "./storage/storageKeys.js";

/**
 * 计算子代理转录旁路文件的存储键（替换 .jsonl 后缀，或在会话 sidecar 空间下按代理路径生成）。
 */
//@ chunk-afa5mksf.js:304-583 placement
function subagentSidecarKey(a, t) {
  return mailboxKeyOf(
    a,
    (e) => e.replace(/\.jsonl$/, t),
    (e) => {
      if (e.namespace !== "transcript" || e.agentId === void 0) return;
      let n = ["subagents", ...(e.agentRelPath ?? []), `agent-${e.agentId}${t}`],
        sidecar = STORAGE_SPACES.sidecar(e.projectKey, e.sessionId, n);
      return n.length <= MAX_SIDE_PATH_DEPTH && validateStorageKey(sidecar) === void 0 ? sidecar : void 0;
    },
  );
}

export { subagentSidecarKey };
