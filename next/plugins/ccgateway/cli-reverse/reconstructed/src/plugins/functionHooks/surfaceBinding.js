/**
 * plugins/functionHooks/surfaceBinding.ts
 *
 * 2.1.316 新增：插件面板与会话视图的绑定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createBindingSlot } from "./promptComposition.js";
import { clientRegistry, paneHostSlot } from "./panes.js";
import { MAX_ORIGIN_TEXT_CHARS } from "../../utils/messageOrigin.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:49581-49618 placement
/**
 * 界面绑定槽
 */
var surfaceBindingSlot; // deferred: uses createBindingSlot (./promptComposition.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49581", () => {
  surfaceBindingSlot = identity_2(createBindingSlot(), (slot) => slot.bind(undefined));
});
//@ chunk-5xgkngpb.js:49618-49634 placement
/**
 * 绑定界面
 */
var bindSurface; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49618", () => {
  bindSurface = surfaceBindingSlot.bind;
});
//@ chunk-5xgkngpb.js:49634-49668 placement
/**
 * 界面 composer
 */
var surfaceComposer = () => surfaceBindingSlot.current()?.composer;
//@ chunk-5xgkngpb.js:49668-49686 placement
/**
 * 当前界面绑定
 */
var currentSurfaceBinding; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49668", () => {
  currentSurfaceBinding = surfaceBindingSlot.current;
});
//@ chunk-5xgkngpb.js:49686-49705 placement
var release; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49686", () => {
  release = surfaceBindingSlot.release;
});
//@ chunk-5xgkngpb.js:49705-49726 placement
var whenBound; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:49705", () => {
  whenBound = surfaceBindingSlot.whenBound;
});
//@ chunk-5xgkngpb.js:49726-49846 placement
/**
 * 当前附着的绘制界面列表（本进程是终端时排在第一）。
 */
function attachedSurfaces() {
  let hasTerminal = currentSurfaceBinding()?.surface === "terminal";
  let filtered = clientRegistry.surfaces().filter((surface) => surface !== "terminal");
  return hasTerminal ? ["terminal", ...filtered] : filtered;
}
//@ chunk-5xgkngpb.js:87412-87542 placement
/**
 * 构造视口信息：是否全屏与列数（优先绑定的视口，其次 stdout 列数）。
 */
function viewportInfo(presentation) {
  let columns = paneHostSlot.get()?.columns;
  let columns_2 = process.stdout.columns;
  let hasStdoutColumns = columns_2 > 0;
  return {
    isFullscreen: presentation === "fullscreen",
    columns: columns ?? (hasStdoutColumns ? columns_2 : MAX_ORIGIN_TEXT_CHARS),
  };
}
export {
  currentSurfaceBinding,
  bindSurface,
  release,
  attachedSurfaces,
  viewportInfo,
  whenBound,
  surfaceComposer,
};
