/**
 * utils/storage/storageV5EnvPin.ts
 *
 * 2.1.316 新增。进程启动时依据 tengu_hover_rest 固定是否使用 v5 存储后端；配置目录在启动后变化则不再交接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r2adbyns.js (4)
 * attribution: placement 4
 */
import { env } from "../env.js";
import { isStorageV5Enabled, pinStorageV5Flag } from "../hoverRest.js";
import { getClaudeConfigDirOrNull, isSameConfigDir } from "../envUtils.js";
import { logForDebugging } from "../debug.js";

//@ chunk-r2adbyns.js:340-487 placement
function pinStorageV5FromEnv(createBackend = tryCreateV5Backend) {
  let CLAUDE_CODE_HOVER_REST = env.CLAUDE_CODE_HOVER_REST;
  if (CLAUDE_CODE_HOVER_REST === undefined) return;
  if (recordHoverRestDecision(CLAUDE_CODE_HOVER_REST) !== "pinned") return;
  return {
    backend: isStorageV5Enabled() ? createBackend() : undefined,
    configHome: getClaudeConfigDirOrNull(),
  };
}
//@ chunk-r2adbyns.js:487-965 placement
/**
 * 进程启动时依据 tengu_hover_rest 固定是否使用 v5 存储后端；配置目录在启动后变化则不再交接。
 */
function adoptStorageV5EnvPin(pin) {
  let backend = isStorageV5Enabled() ? pin.backend : undefined;
  if (backend === undefined) return;
  if (!isSameConfigDir(pin.configHome)) {
    let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
    logForDebugging(
      claudeConfigDirOrNull !== null && pin.configHome !== null
        ? `CLAUDE_CONFIG_DIR now names ${claudeConfigDirOrNull}, not ${pin.configHome} where the v5 storage backend was built at start-up; not handing it on, so this process keeps today's direct file access`
        : `The v5 storage backend is not used: the config home was ${pin.configHome ?? "absent"} when it was built at start-up and is ${claudeConfigDirOrNull ?? "absent"} now`,
      {
        level: "warn",
      },
    );
    return;
  }
  return backend;
}
//@ chunk-r2adbyns.js:965-1253 placement
function recordHoverRestDecision(value) {
  if (typeof value !== "boolean")
    logForDebugging(`tengu_hover_rest served a ${typeof value}, not a boolean; treating it as off`, {
      level: "warn",
    });
  let decision = pinStorageV5Flag(value);
  if (decision === "conflict")
    logForDebugging(
      `tengu_hover_rest read ${String(value)} at a second pin in this process; keeping the first decision`,
      {
        level: "warn",
      },
    );
  return decision;
}
//@ chunk-r2adbyns.js:1253-1290 placement
function tryCreateV5Backend() {
  if (!isStorageV5Enabled()) return;
  return;
}
export { pinStorageV5FromEnv, recordHoverRestDecision, tryCreateV5Backend, adoptStorageV5EnvPin };
