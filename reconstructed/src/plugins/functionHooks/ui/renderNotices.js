/**
 * plugins/functionHooks/ui/renderNotices.ts
 *
 * 钩子渲染提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (2)
 * attribution: placement 2
 */
import { identity as identity_2 } from "../../../utils/identity.js";
import { hasUiLogSink, reportPluginProblem } from "../hooksWorkerClient.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:305803-305837 placement
var toldRefusals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:305803", () => {
  toldRefusals = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-s61vbvea.js:305837-305918 placement
function tellOnce({ key, lead, text }) {
  if (!hasUiLogSink() || toldRefusals.has(key)) return;
  toldRefusals.add(key);
  reportPluginProblem(lead, text);
}
export { tellOnce, toldRefusals };
