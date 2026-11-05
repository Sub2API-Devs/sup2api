/**
 * utils/subagentTranscriptPath.ts
 *
 * 2.1.316 新增：子代理记录路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8dcmzqam.js (1)
 * attribution: placement 1
 */
import { mailboxKeyOf } from "./swarm/teammateMessageRepair.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { MAX_SIDE_PATH_DEPTH, validateStorageKey } from "./storage/storageKeys.js";

//@ chunk-8dcmzqam.js:304-583 placement
/**
 * 计算子代理转录旁路文件的存储键（替换 .jsonl 后缀，或在会话 sidecar 空间下按代理路径生成）。
 */
function subagentSidecarKey(sessionPath, suffix) {
  return mailboxKeyOf(
    sessionPath,
    (path) => path.replace(/\.jsonl$/, suffix),
    (key) => {
      if (key.namespace !== "transcript" || key.agentId === undefined) return;
      let relPath = ["subagents", ...(key.agentRelPath ?? []), `agent-${key.agentId}${suffix}`];
      let sidecarKey = STORAGE_SPACES.sidecar(key.projectKey, key.sessionId, relPath);
      return relPath.length <= MAX_SIDE_PATH_DEPTH && validateStorageKey(sidecarKey) === undefined
        ? sidecarKey
        : undefined;
    },
  );
}
export { subagentSidecarKey };
