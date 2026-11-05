/**
 * components/pluginUi/uiLog.ts
 *
 * 2.1.316 新增。插件 UI 日志。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { init_react_production, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { createSystemMessage } from "../../utils/messages.js";
import { formatSourceLine } from "../../utils/messages/nonUserMessages.js";
import { setUiLogSink } from "../../plugins/functionHooks/uiApi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:38184-38194 placement
var uiLogNamespace = {};
//@ chunk-czq1j3j2.js:38194-38258 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:38194", () => {
  __export(uiLogNamespace, {
    appendUiLogRow: () => appendUiLogRow,
    default: () => uiLogNamespace,
    useUiLog: () => useUiLog,
  });
});
//@ chunk-czq1j3j2.js:1845500-1845504 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1845500", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1849059-1849063 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1849059", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1857297-1857344 placement
var uiLogRowToSystemMessage = (row) => createSystemMessage(formatSourceLine(row.plugin, row.text), "notice");
//@ chunk-czq1j3j2.js:1857344-1857557 placement
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
//@ chunk-czq1j3j2.js:1857561-1857610 placement
var useUiLog = (sink) => {
  useEffect(() => setUiLogSink((row, mode) => appendUiLogRow(sink, row, mode)), [sink]);
};
export { uiLogNamespace };
