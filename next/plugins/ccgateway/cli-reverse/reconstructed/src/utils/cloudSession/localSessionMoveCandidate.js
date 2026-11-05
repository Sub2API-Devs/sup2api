/**
 * utils/cloudSession/localSessionMoveCandidate.ts
 *
 * 判定本地会话是否要改成云端会话、以及候选的会话标识（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a0z7wvnd.js (3)
 * attribution: placement 3
 */
import { normalizeUuidOrNull } from "../agentId.js";

//@ chunk-a0z7wvnd.js:227-447 placement
var CLOUD_OPTION_KEYS = [
  "environment",
  "pool",
  "project",
  "ref",
  "onBranch",
  "noMonorepo",
  "teleport",
  "attachServe",
  "persistentVolume",
  "persistentVolumeFrom",
  "correlationId",
  "forwardHomeSettings",
  "fromPr",
  "forkSession",
  "sessionId",
  "worktree",
];
//@ chunk-a0z7wvnd.js:447-796 placement
/**
 * 算出可作为本地会话迁移候选的会话标识：cloud/remote 与 resume 一致且没有互斥选项时才给。
 */
function cloudSessionIdFromOptions(options, prompt) {
  let cloudRef = options.cloud ?? options.remote;
  if (
    cloudRef === undefined ||
    options.continue ||
    prompt !== undefined ||
    CLOUD_OPTION_KEYS.some((key) => options[key] !== undefined)
  )
    return;
  let cloudId = typeof cloudRef === "string" && cloudRef.trim() !== "" ? cloudRef.trim() : undefined;
  let resumeId = typeof options.resume === "string" ? options.resume.trim() : undefined;
  let candidateId =
    cloudId === undefined
      ? resumeId
      : resumeId === undefined && options.resume === undefined
        ? cloudId
        : resumeId?.toLowerCase() === cloudId.toLowerCase()
          ? cloudId
          : undefined;
  return normalizeUuidOrNull(candidateId?.toLowerCase()) ?? undefined;
}
//@ chunk-a0z7wvnd.js:796-914 placement
/**
 * 本地会话是否要迁移到云端：非交互、print、别的后端或 stdin 非 TTY 时不给候选。
 */
function localSessionMoveCandidate(flags) {
  return flags.nonInteractive || flags.options.print || flags.hasOtherBackend || !flags.stdinIsTTY
    ? undefined
    : cloudSessionIdFromOptions(flags.options, flags.prompt);
}
export { localSessionMoveCandidate };
