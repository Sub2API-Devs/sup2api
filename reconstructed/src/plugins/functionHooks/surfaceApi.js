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
import { paneHostSlot, paneRegistry } from "./panes.js";
import { findLoadedModule } from "../hooksModules/loadedModuleFilters.js";
import { hasUiLogSink, reportPluginProblem } from "./hooksWorkerClient.js";
import { toldRefusals } from "./ui/renderNotices.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:3695549-3695623 placement
/**
 * 是否有可用界面
 */
var hasSurface = () =>
  attachedSurfaces().length > 0 ||
  paneHostSlot.get() !== undefined ||
  paneRegistry().getState().placements > 0;
//@ chunk-e6aww6q8.js:3695623-3695699 placement
/**
 * 无界面原因
 */
var NO_SURFACE_REASON = "no-surface: no surface is attached ($.session.surfaces() is empty)";
//@ chunk-e6aww6q8.js:3695699-3695772 placement
/**
 * 无界面时补原因
 */
function withSurfaceReason(e) {
  return e.deny === undefined || hasSurface()
    ? e
    : {
        deny: `${NO_SURFACE_REASON}; ${e.deny}`,
      };
}
//@ chunk-e6aww6q8.js:3695772-3695910 placement
/**
 * 若终端界面不可用，返回 ui.open 无法放置行的原因。
 */
function placedRowsRefusal() {
  let e = attachedSurfaces().includes("terminal") || paneHostSlot.get() !== undefined;
  let n = hasSurface() ? "no attached surface draws placed rows yet" : NO_SURFACE_REASON;
  return e ? undefined : n;
}
//@ chunk-e6aww6q8.js:3695910-3695971 placement
var dOn = Object.freeze({
  isShown: false,
  isFocused: false,
  isPlaced: false,
});
//@ chunk-e6aww6q8.js:3695971-3696047 placement
/**
 * 无界面则未放置
 */
var unplacedWhenNoSurface = (e) =>
  hasSurface()
    ? e
    : Object.freeze(
        e.map((n) =>
          Object.freeze({
            ...n,
            ...dOn,
          }),
        ),
      );
//@ chunk-e6aww6q8.js:3696047-3696242 placement
/**
 * 没有任何界面可放置时，把 ui.open 结果改为未放置并报告一次问题。
 */
function refuseUnplacedOpen(e, plugin) {
  if (!e.isPlaced || hasSurface()) return e;
  let environmentId = findLoadedModule(plugin)?.environmentId;
  let h = `${plugin}#${environmentId} ui.open no-surface ${hasUiLogSink()}`;
  if (!toldRefusals.has(h)) {
    toldRefusals.add(h);
    reportPluginProblem(plugin, `ui.open: ${NO_SURFACE_REASON}`);
  }
  return {
    isPlaced: false,
    reason: NO_SURFACE_REASON,
  };
}
//@ chunk-e6aww6q8.js:3696242-3696367 placement
/**
 * $.session.surface：返回首个绘制中的界面，没有时为 null。
 */
async function sessionSurfaceOp(plugin) {
  let n = attachedSurfaces()[0] ?? null;
  if (n === null) logForDebugging(`$.session.surface (${plugin}): no drawing session bound; null`);
  return n;
}
//@ chunk-e6aww6q8.js:3696367-3696484 placement
/**
 * $.session.surfaces：返回所有正在绘制的界面列表。
 */
async function sessionSurfacesOp(plugin) {
  let n = attachedSurfaces();
  if (n.length === 0) logForDebugging(`$.session.surfaces (${plugin}): nothing attached draws; []`);
  return n;
}
export {
  sessionSurfaceOp,
  sessionSurfacesOp,
  refuseUnplacedOpen,
  unplacedWhenNoSurface,
  placedRowsRefusal,
  withSurfaceReason,
};
