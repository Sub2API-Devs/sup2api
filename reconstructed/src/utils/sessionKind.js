/**
 * utils/sessionKind.ts
 *
 * 2.1.316 新增：会话种类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { isActingAsBgJob } from "./concurrentSessions.js";
import { getTodoToolsOptIn } from "../bootstrap/state.js";
import { mainLoopCanonicalModel } from "./model/telemetryModelName.js";
import { tAr, isTodoToolLegacyModel } from "./model/legacyModelNames.js";
import { env } from "./env.js";

/**
 * 判断是否启用 Todo 工具：后台任务、显式开启、旧模型或模型未知时启用，否则看 CLAUDE_CODE_ENABLE_TODO_TOOLS。
 */
//@ chunk-e6aww6q8.js:3232784-3232917 placement
function todoToolsEnabled() {
  if (isActingAsBgJob() || getTodoToolsOptIn()) return !0;
  let e = mainLoopCanonicalModel();
  if (e === void 0 || tAr(e) || isTodoToolLegacyModel(e)) return !0;
  return env.CLAUDE_CODE_ENABLE_TODO_TOOLS === !0;
}

export { todoToolsEnabled };
