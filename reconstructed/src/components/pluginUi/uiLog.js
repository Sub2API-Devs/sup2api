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
import { Ar } from "../../../runtime/bun-runtime.js";
import { createSystemMessage } from "../../utils/messages.js";
import { formatSourceLine } from "../../utils/messages/nonUserMessages.js";
import { init_react_production, P } from "../../../vendor/react/cjs/react.production.js";
import { setUiLogSink } from "../../plugins/functionHooks/uiApi.js";

//@ chunk-18hwfzwa.js:36623-36633 placement
var uiLogNamespace = {};
//@ chunk-18hwfzwa.js:36633-36697 placement
Ar(uiLogNamespace, {
  appendUiLogRow: () => appendUiLogRow,
  default: () => uiLogNamespace,
  useUiLog: () => useUiLog,
});
//@ chunk-18hwfzwa.js:1809318-1809365 placement
var uiLogRowToSystemMessage = (h) => createSystemMessage(formatSourceLine(h.plugin, h.text), "notice");
//@ chunk-18hwfzwa.js:1809365-1809578 placement
function appendUiLogRow(h, x, D) {
  let L = uiLogRowToSystemMessage(x);
  let last = h.getSnapshot().at(-1);
  if (
    D === "once" &&
    last?.type === "system" &&
    last.subtype === "informational" &&
    last.level === L.level &&
    last.content === L.content
  )
    return;
  h.apply({
    type: "append",
    messages: [L],
  });
}
//@ chunk-18hwfzwa.js:1809578-1809582 placement
init_react_production();
//@ chunk-18hwfzwa.js:1809582-1809631 placement
var useUiLog = (h) => {
  P(() => setUiLogSink((x, D) => appendUiLogRow(h, x, D)), [h]);
};
//@ chunk-18hwfzwa.js:1809631-1809635 placement
init_react_production();
export { uiLogNamespace };
