/**
 * plugins/functionHooks/surfaceApi.ts
 *
 * 2.1.316 新增：插件界面面板（surface）接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { attachedSurfaces } from "./surfaceBinding.js";
import { g2, ul } from "./panes.js";
import { QNe } from "../hooksModules/loadedModuleFilters.js";
import { hasUiLogSink, reportPluginProblem } from "./hooksWorkerClient.js";
import { toldRefusals } from "./ui/renderNotices.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:3695549-3695623 placement
var NN = () => attachedSurfaces().length > 0 || g2.get() !== void 0 || ul().getState().placements > 0;
//@ chunk-e6aww6q8.js:3695623-3695699 placement
var VU = "no-surface: no surface is attached ($.session.surfaces() is empty)";
//@ chunk-e6aww6q8.js:3695699-3695772 placement
function Kot(e) {
  return e.deny === void 0 || NN() ? e : { deny: `${VU}; ${e.deny}` };
}
/**
 * 若终端界面不可用，返回 ui.open 无法放置行的原因。
 */
//@ chunk-e6aww6q8.js:3695772-3695910 placement
function placedRowsRefusal() {
  let e = attachedSurfaces().includes("terminal") || g2.get() !== void 0,
    n = NN() ? "no attached surface draws placed rows yet" : VU;
  return e ? void 0 : n;
}
//@ chunk-e6aww6q8.js:3695910-3695971 placement
var freeze_15 = Object.freeze({ isShown: !1, isFocused: !1, isPlaced: !1 });
//@ chunk-e6aww6q8.js:3695971-3696047 placement
var DDr = (e) => (NN() ? e : Object.freeze(e.map((n) => Object.freeze({ ...n, ...freeze_15 }))));
/**
 * 没有任何界面可放置时，把 ui.open 结果改为未放置并报告一次问题。
 */
//@ chunk-e6aww6q8.js:3696047-3696242 placement
function refuseUnplacedOpen(e, n) {
  if (!e.isPlaced || NN()) return e;
  let s = QNe(n)?.environmentId,
    h = `${n}#${s} ui.open no-surface ${hasUiLogSink()}`;
  if (!toldRefusals.has(h)) (toldRefusals.add(h), reportPluginProblem(n, `ui.open: ${VU}`));
  return { isPlaced: !1, reason: VU };
}
/**
 * $.session.surface：返回首个绘制中的界面，没有时为 null。
 */
//@ chunk-e6aww6q8.js:3696242-3696367 placement
async function sessionSurfaceOp(e) {
  let n = attachedSurfaces()[0] ?? null;
  if (n === null) logForDebugging(`$.session.surface (${e}): no drawing session bound; null`);
  return n;
}
/**
 * $.session.surfaces：返回所有正在绘制的界面列表。
 */
//@ chunk-e6aww6q8.js:3696367-3696484 placement
async function sessionSurfacesOp(e) {
  let n = attachedSurfaces();
  if (n.length === 0) logForDebugging(`$.session.surfaces (${e}): nothing attached draws; []`);
  return n;
}

export { sessionSurfaceOp, sessionSurfacesOp, refuseUnplacedOpen, DDr, placedRowsRefusal, Kot };
