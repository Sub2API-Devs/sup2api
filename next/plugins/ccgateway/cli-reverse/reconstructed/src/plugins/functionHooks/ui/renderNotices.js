/**
 * plugins/functionHooks/ui/renderNotices.ts
 *
 * 钩子渲染提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../../utils/identity.js";
import { hasUiLogSink, reportPluginProblem } from "../hooksWorkerClient.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:229230-229264 placement
var toldRefusals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:229230", () => {
  toldRefusals = identity(new Set(), (set) => set.clear());
});
//@ chunk-7jxyna5q.js:229264-229345 placement
function tellOnce({ key, lead, text }) {
  if (!hasUiLogSink() || toldRefusals.has(key)) return;
  toldRefusals.add(key);
  reportPluginProblem(lead, text);
}
export { tellOnce, toldRefusals };
