/**
 * plugins/functionHooks/surfaceApi.ts
 *
 * 2.1.316 新增：插件界面面板（surface）接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { attachedSurfaces } from "./surfaceBinding.js";
import { paneHostSlot, paneRegistry } from "./panes.js";
import { findLoadedModule } from "../hooksModules/loadedModuleFilters.js";
import { hasUiLogSink, reportPluginProblem } from "./hooksWorkerClient.js";
import { toldRefusals } from "./ui/renderNotices.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3791194-3791268 placement
/**
 * 是否有可用界面
 */
var hasSurface = () =>
  attachedSurfaces().length > 0 ||
  paneHostSlot.get() !== undefined ||
  paneRegistry().getState().placements > 0;
//@ chunk-5xgkngpb.js:3791268-3791344 placement
/**
 * 无界面原因
 */
var NO_SURFACE_REASON = "no-surface: no surface is attached ($.session.surfaces() is empty)";
//@ chunk-5xgkngpb.js:3791344-3791417 placement
/**
 * 无界面时补原因
 */
function withSurfaceReason(answer) {
  return answer.deny === undefined || hasSurface()
    ? answer
    : {
        deny: `${NO_SURFACE_REASON}; ${answer.deny}`,
      };
}
//@ chunk-5xgkngpb.js:3791417-3791555 placement
/**
 * 若终端界面不可用，返回 ui.open 无法放置行的原因。
 */
function placedRowsRefusal() {
  let hasTerminal = attachedSurfaces().includes("terminal") || paneHostSlot.get() !== undefined;
  let reason = hasSurface() ? "no attached surface draws placed rows yet" : NO_SURFACE_REASON;
  return hasTerminal ? undefined : reason;
}
//@ chunk-5xgkngpb.js:3791555-3791616 placement
var UNPLACED_SURFACE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3791555", () => {
  UNPLACED_SURFACE_FLAGS = Object.freeze({
    isShown: false,
    isFocused: false,
    isPlaced: false,
  });
});
//@ chunk-5xgkngpb.js:3791616-3791692 placement
/**
 * 无界面则未放置
 */
var unplacedWhenNoSurface = (panes) =>
  hasSurface()
    ? panes
    : Object.freeze(
        panes.map((pane) =>
          Object.freeze({
            ...pane,
            ...UNPLACED_SURFACE_FLAGS,
          }),
        ),
      );
//@ chunk-5xgkngpb.js:3791692-3791887 placement
/**
 * 没有任何界面可放置时，把 ui.open 结果改为未放置并报告一次问题。
 */
function refuseUnplacedOpen(result, plugin) {
  if (!result.isPlaced || hasSurface()) return result;
  let environmentId = findLoadedModule(plugin)?.environmentId;
  let dedupeKey = `${plugin}#${environmentId} ui.open no-surface ${hasUiLogSink()}`;
  if (!toldRefusals.has(dedupeKey)) {
    toldRefusals.add(dedupeKey);
    reportPluginProblem(plugin, `ui.open: ${NO_SURFACE_REASON}`);
  }
  return {
    isPlaced: false,
    reason: NO_SURFACE_REASON,
  };
}
//@ chunk-5xgkngpb.js:3791887-3792012 placement
/**
 * $.session.surface：返回首个绘制中的界面，没有时为 null。
 */
async function sessionSurfaceOp(plugin) {
  let surface = attachedSurfaces()[0] ?? null;
  if (surface === null) logForDebugging(`$.session.surface (${plugin}): no drawing session bound; null`);
  return surface;
}
//@ chunk-5xgkngpb.js:3792012-3792129 placement
/**
 * $.session.surfaces：返回所有正在绘制的界面列表。
 */
async function sessionSurfacesOp(plugin) {
  let surfaces = attachedSurfaces();
  if (surfaces.length === 0) logForDebugging(`$.session.surfaces (${plugin}): nothing attached draws; []`);
  return surfaces;
}
export {
  sessionSurfaceOp,
  sessionSurfacesOp,
  refuseUnplacedOpen,
  unplacedWhenNoSurface,
  placedRowsRefusal,
  withSurfaceReason,
};
