/**
 * query/deps.ts
 *
 * queryLoop 的可注入依赖（测试可替换）：callModel、autocompact、uuid、now。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query/deps.ts
 * pieces: chunk-ha3km179.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { randomUUID } from "crypto";
import { NullBytePathError, UnstablePathError } from "../utils/path.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { SENDMESSAGE, stripObservableFields } from "../tools/SendMessageTool/constants.js";
import { queryModelWithStreaming } from "../services/api/claude.js";
import { runAutoCompactIfNeeded } from "../services/compact/autoCompact.js";

//@ chunk-ha3km179.js:142929-143374 placement
/**
 * 调用工具的 backfillObservableInput 补全可观察输入（失败时原样传递）。
 */
function backfillObservableInput(toolByName, input, toolName) {
  if (toolByName === undefined) return stripSendMessageArgs(toolName, input);
  if (!toolByName.backfillObservableInput) return null;
  let observableInput = {
    ...input,
  };
  try {
    let backfilled = toolByName.backfillObservableInput(observableInput) === true;
    return Object.keys(observableInput).some((key) => !(key in input)) || backfilled ? observableInput : null;
  } catch (error) {
    if (error instanceof NullBytePathError || error instanceof UnstablePathError) {
      logForDebugging(
        `${toolByName.name}: backfillObservableInput met a path that is refused (${error.name}); passing the tool input on as the model sent it`,
      );
      return null;
    }
    logError(withTelemetryMessage(toError(error), "backfillObservableInput threw"));
    return stripSendMessageArgs(toolName, input);
  }
}
//@ chunk-ha3km179.js:143374-143423 placement
/**
 * 去掉可观察字段
 */
function stripSendMessageArgs(toolName, input) {
  return toolName === SENDMESSAGE ? (stripObservableFields(input) ?? null) : null;
}
//@ chunk-ha3km179.js:143460-143553 fingerprint = productionDeps (0.873)
/**
 * productionDeps：callModel=queryModelWithStreaming、autocompact、uuid=randomUUID、now=ISO 时间串。
 */
function productionDeps() {
  return {
    callModel: queryModelWithStreaming,
    autocompact: runAutoCompactIfNeeded,
    uuid: randomUUID,
    now: () => new Date().toISOString(),
  };
}
export { productionDeps, backfillObservableInput };
