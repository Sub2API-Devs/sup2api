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
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { NullBytePathError, UnstablePathError } from "../utils/path.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { SENDMESSAGE, stripObservableFields } from "../tools/SendMessageTool/constants.js";
import { queryModelWithStreaming } from "../services/api/claude.js";
import { runAutoCompactIfNeeded } from "../services/compact/autoCompact.js";

/**
 * 调用工具的 backfillObservableInput 补全可观察输入（失败时原样传递）。
 */
//@ chunk-ha3km179.js:142929-143374 placement
function backfillObservableInput(e, n, r) {
  if (e === void 0) return Uu(r, n);
  if (!e.backfillObservableInput) return null;
  let s = { ...n };
  try {
    let h = e.backfillObservableInput(s) === !0;
    return Object.keys(s).some((S) => !(S in n)) || h ? s : null;
  } catch (error) {
    if (error instanceof NullBytePathError || error instanceof UnstablePathError)
      return (
        logForDebugging(
          `${e.name}: backfillObservableInput met a path that is refused (${error.name}); passing the tool input on as the model sent it`,
        ),
        null
      );
    return (logError(withTelemetryMessage(toError(error), "backfillObservableInput threw")), Uu(r, n));
  }
}
//@ chunk-ha3km179.js:143374-143423 placement
function Uu(e, n) {
  return e === SENDMESSAGE ? (stripObservableFields(n) ?? null) : null;
}
/**
 * productionDeps：callModel=queryModelWithStreaming、autocompact、uuid=randomUUID、now=ISO 时间串。
 */
//@ chunk-ha3km179.js:143460-143553 fingerprint = productionDeps (0.873)
function productionDeps() {
  return {
    callModel: queryModelWithStreaming,
    autocompact: runAutoCompactIfNeeded,
    uuid: randomUUID_3,
    now: () => new Date().toISOString(),
  };
}

export { productionDeps, backfillObservableInput };
