/**
 * plugins/functionHooks/surfaceBinding.ts
 *
 * 2.1.316 新增：插件面板与会话视图的绑定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createBindingSlot } from "./promptComposition.js";
import { clientRegistry, paneHostSlot } from "./panes.js";
import { MAX_ORIGIN_TEXT_CHARS } from "../../utils/messageOrigin.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:46982-47019 placement
/**
 * 界面绑定槽
 */
var surfaceBindingSlot; // deferred: uses createBindingSlot (./promptComposition.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:46982", () => {
  surfaceBindingSlot = identity_2(createBindingSlot(), (slot) => slot.bind(undefined));
});
//@ chunk-e6aww6q8.js:47019-47035 placement
/**
 * 绑定界面
 */
var bindSurface; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47019", () => {
  bindSurface = surfaceBindingSlot.bind;
});
//@ chunk-e6aww6q8.js:47035-47069 placement
/**
 * 界面 composer
 */
var surfaceComposer = () => surfaceBindingSlot.current()?.composer;
//@ chunk-e6aww6q8.js:47069-47087 placement
/**
 * 当前界面绑定
 */
var currentSurfaceBinding; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47069", () => {
  currentSurfaceBinding = surfaceBindingSlot.current;
});
//@ chunk-e6aww6q8.js:47087-47106 placement
var release; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47087", () => {
  release = surfaceBindingSlot.release;
});
//@ chunk-e6aww6q8.js:47106-47127 placement
var whenBound; // deferred: uses surfaceBindingSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:47106", () => {
  whenBound = surfaceBindingSlot.whenBound;
});
//@ chunk-e6aww6q8.js:47127-47247 placement
/**
 * 当前附着的绘制界面列表（本进程是终端时排在第一）。
 */
function attachedSurfaces() {
  let hasTerminal = currentSurfaceBinding()?.surface === "terminal";
  let filtered = clientRegistry.surfaces().filter((surface) => surface !== "terminal");
  return hasTerminal ? ["terminal", ...filtered] : filtered;
}
//@ chunk-e6aww6q8.js:84862-84992 placement
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
  viewportInfo,
  attachedSurfaces,
  whenBound,
  surfaceComposer,
};
