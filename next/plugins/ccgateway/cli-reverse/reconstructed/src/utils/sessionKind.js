/**
 * utils/sessionKind.ts
 *
 * 2.1.316 新增：会话种类
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isActingAsBgJob } from "./concurrentSessions.js";
import { getTodoToolsOptIn } from "../bootstrap/state.js";
import { mainLoopCanonicalModel } from "./model/telemetryModelName.js";
import { isInferenceProfileModelId, isTodoToolLegacyModel } from "./model/legacyModelNames.js";
import { env } from "./env.js";

//@ chunk-5xgkngpb.js:3317423-3317556 placement
/**
 * 判断是否启用 Todo 工具：后台任务、显式开启、旧模型或模型未知时启用，否则看 CLAUDE_CODE_ENABLE_TODO_TOOLS。
 */
function todoToolsEnabled() {
  if (isActingAsBgJob() || getTodoToolsOptIn()) return true;
  let model = mainLoopCanonicalModel();
  if (model === undefined || isInferenceProfileModelId(model) || isTodoToolLegacyModel(model)) return true;
  return env.CLAUDE_CODE_ENABLE_TODO_TOOLS === true;
}
export { todoToolsEnabled };
