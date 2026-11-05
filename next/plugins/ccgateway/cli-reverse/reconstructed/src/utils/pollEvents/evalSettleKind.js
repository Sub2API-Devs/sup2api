/**
 * utils/pollEvents/evalSettleKind.ts
 *
 * eval 结算事件 kind 的“lost”取值与 poll-event 判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fghsvs6x.js (2)
 * attribution: placement 2
 */
import { codeModeAccepted } from "../codeMode/accepted.js";
import { EVAL_SETTLE_EVENT_KIND } from "../pollEvents.js";

//@ chunk-fghsvs6x.js:263-278 placement
/**
 * eval 结算状态里的 “lost” 取值。
 */
var EVAL_LOST_STATUS = "lost";
//@ chunk-fghsvs6x.js:278-353 placement
/**
 * 判定一个 poll event 是否为 repl-eval 结算事件。
 */
function isEvalSettleCommand(command) {
  return (
    codeModeAccepted() && command.mode === "poll-event" && command.pollEvent?.kind === EVAL_SETTLE_EVENT_KIND
  );
}
export { EVAL_LOST_STATUS, isEvalSettleCommand };
