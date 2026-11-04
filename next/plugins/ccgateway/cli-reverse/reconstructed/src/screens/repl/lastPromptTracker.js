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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCurrentSessionFile, queueSessionMetadataEntry } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { ZERO_UUID } from "../../utils/requestReplay.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1473473-1474045 placement
/**
 * rewind 后跟踪新回合消息，写入后补写 last-prompt 元数据。
 */
class LastPromptRestamp {
  #e = false;
  #t = undefined;
  #o = new Set();
  get isDue() {
    return this.#e;
  }
  rewound() {
    this.#o.clear();
    if (getCurrentSessionFile() !== null) {
      this.#e = true;
      this.#t = getSessionId();
    }
  }
  conversationReplaced() {
    this.#e = false;
    this.#t = undefined;
    this.#o.clear();
  }
  turnStarts(messages) {
    if (!this.#e) return;
    if (this.#t !== getSessionId()) {
      this.conversationReplaced();
      return;
    }
    for (let message of messages) this.#o.add(message.uuid);
  }
  rowsQueued(rows) {
    if (!rows.some((row) => this.#o.has(row.uuid))) return;
    this.#o.clear();
    if (this.#t !== getSessionId()) return;
    this.#e = false;
    this.#t = undefined;
    queueSessionMetadataEntry({
      type: "last-prompt",
      leafUuid: ZERO_UUID,
      explicit: true,
      sessionId: getSessionId(),
    });
  }
  writeFailed(rows) {
    if (rows.some((row) => this.#o.has(row.uuid))) this.#o.clear();
  }
}
//@ chunk-18hwfzwa.js:1474045-1474072 placement
var lastPromptRestampSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:1474045", () => {
  lastPromptRestampSlot = new SessionRootSlot(() => new LastPromptRestamp());
});
//@ chunk-18hwfzwa.js:1474110-1474259 placement
/**
 * 非斜杠命令或非本地命令的输入才记录为提示。
 */
function shouldRecordPrompt(text, commands) {
  let slashCommand = parseSlashCommand(text);
  if (!slashCommand) return true;
  let command = findCommand(slashCommand.commandName, commands);
  if (!command) return !looksLikeCommand(slashCommand.commandName);
  return command.type !== "local" && command.type !== "local-jsx";
}
//@ chunk-18hwfzwa.js:1474259-1474466 placement
/**
 * 生成写历史记录的函数（命令参数变化时写展开后的文本，只写一次）。
 */
function createPromptHistoryWriter({ entry, name, typed, write }) {
  let pending = entry === undefined;
  let snapshot = snapshotHookRegistration();
  if (entry !== undefined && !isPromptHookObserved()) {
    pending = true;
    write(entry);
  }
  return (writtenEntry) => {
    let changed = hasHookRegistrationChanged(snapshot);
    if (pending || entry === undefined || changed) return;
    pending = true;
    write(writtenEntry === typed ? entry : withExpandedPastes(entry, `/${name} ${writtenEntry}`.trim()));
  };
}
//@ chunk-18hwfzwa.js:1474466-1474487 placement
function shutdownNow() {
  gracefulShutdownSync(0);
}
export { shutdownNow, createPromptHistoryWriter, shouldRecordPrompt, lastPromptRestampSlot };
