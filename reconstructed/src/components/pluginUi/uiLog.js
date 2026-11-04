/**
 * components/pluginUi/uiLog.ts
 *
 * 2.1.316 新增。插件 UI 日志。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { createSystemMessage } from "../../utils/messages.js";
import { formatSourceLine } from "../../utils/messages/nonUserMessages.js";
import { init_react_production, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { setUiLogSink } from "../../plugins/functionHooks/uiApi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:36623-36633 placement
var uiLogNamespace = {};
//@ chunk-18hwfzwa.js:36633-36697 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:36633", () => {
  __export(uiLogNamespace, {
    appendUiLogRow: () => appendUiLogRow,
    default: () => uiLogNamespace,
    useUiLog: () => useUiLog,
  });
});
//@ chunk-18hwfzwa.js:1809318-1809365 placement
var uiLogRowToSystemMessage = (row) => createSystemMessage(formatSourceLine(row.plugin, row.text), "notice");
//@ chunk-18hwfzwa.js:1809365-1809578 placement
function appendUiLogRow(sink, row, mode) {
  let message = uiLogRowToSystemMessage(row);
  let last = sink.getSnapshot().at(-1);
  if (
    mode === "once" &&
    last?.type === "system" &&
    last.subtype === "informational" &&
    last.level === message.level &&
    last.content === message.content
  )
    return;
  sink.apply({
    type: "append",
    messages: [message],
  });
}
//@ chunk-18hwfzwa.js:1809578-1809582 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1809578", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1809582-1809631 placement
var useUiLog = (sink) => {
  useEffect(() => setUiLogSink((row, mode) => appendUiLogRow(sink, row, mode)), [sink]);
};
//@ chunk-18hwfzwa.js:1809631-1809635 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1809631", () => {
  init_react_production();
});
export { uiLogNamespace };
