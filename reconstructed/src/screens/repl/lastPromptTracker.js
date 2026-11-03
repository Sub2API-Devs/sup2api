/**
 * screens/repl/lastPromptTracker.ts
 *
 * 2.1.316 新增。记录最后一条提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCurrentSessionFile, queueSessionMetadataEntry } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { Nqo } from "../../utils/requestReplay.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { findCommand } from "../../commands.js";
import { looksLikeCommand } from "../../utils/processUserInput/processSlashCommand.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
} from "../../utils/plugins/functionHooks/hookRegistration.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import { withExpandedPastes } from "../../utils/hooks/postSamplingHooks.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";

/**
 * rewind 后跟踪新回合消息，写入后补写 last-prompt 元数据。
 */
//@ chunk-18hwfzwa.js:1473473-1474045 placement
class LastPromptRestamp {
  #e = !1;
  #t = void 0;
  #o = new Set();
  get isDue() {
    return this.#e;
  }
  rewound() {
    if ((this.#o.clear(), getCurrentSessionFile() !== null)) ((this.#e = !0), (this.#t = getSessionId()));
  }
  conversationReplaced() {
    ((this.#e = !1), (this.#t = void 0), this.#o.clear());
  }
  turnStarts(h) {
    if (!this.#e) return;
    if (this.#t !== getSessionId()) {
      this.conversationReplaced();
      return;
    }
    for (let x of h) this.#o.add(x.uuid);
  }
  rowsQueued(h) {
    if (!h.some((x) => this.#o.has(x.uuid))) return;
    if ((this.#o.clear(), this.#t !== getSessionId())) return;
    ((this.#e = !1),
      (this.#t = void 0),
      queueSessionMetadataEntry({
        type: "last-prompt",
        leafUuid: Nqo,
        explicit: !0,
        sessionId: getSessionId(),
      }));
  }
  writeFailed(h) {
    if (h.some((x) => this.#o.has(x.uuid))) this.#o.clear();
  }
}
//@ chunk-18hwfzwa.js:1474045-1474072 placement
var oE = new SessionRootSlot(() => new LastPromptRestamp());
/**
 * 非斜杠命令或非本地命令的输入才记录为提示。
 */
//@ chunk-18hwfzwa.js:1474110-1474259 placement
function shouldRecordPrompt(h, x) {
  let D = parseSlashCommand(h);
  if (!D) return !0;
  let L = findCommand(D.commandName, x);
  if (!L) return !looksLikeCommand(D.commandName);
  return L.type !== "local" && L.type !== "local-jsx";
}
/**
 * 生成写历史记录的函数（命令参数变化时写展开后的文本，只写一次）。
 */
//@ chunk-18hwfzwa.js:1474259-1474466 placement
function createPromptHistoryWriter({ entry: entry, name: x, typed: typed, write: write }) {
  let ee = entry === void 0,
    ke = snapshotHookRegistration();
  if (entry !== void 0 && !isPromptHookObserved()) ((ee = !0), write(entry));
  return (Re) => {
    let Be = hasHookRegistrationChanged(ke);
    if (ee || entry === void 0 || Be) return;
    ((ee = !0), write(Re === typed ? entry : withExpandedPastes(entry, `/${x} ${Re}`.trim())));
  };
}
//@ chunk-18hwfzwa.js:1474466-1474487 placement
function Bqo() {
  gracefulShutdownSync(0);
}

export { Bqo, createPromptHistoryWriter, shouldRecordPrompt, oE };
