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
import { ge } from "../../utils/identity.js";
import { createBindingSlot } from "./promptComposition.js";
import { vk, g2 } from "./panes.js";
import { $_t } from "../../utils/messageOrigin.js";

//@ chunk-e6aww6q8.js:46982-47019 placement
var NC = ge(createBindingSlot(), (e) => e.bind(void 0));
//@ chunk-e6aww6q8.js:47019-47035 placement
var K$o = NC.bind;
//@ chunk-e6aww6q8.js:47035-47069 placement
var G3 = () => NC.current()?.composer;
//@ chunk-e6aww6q8.js:47069-47087 placement
var lp = NC.current;
//@ chunk-e6aww6q8.js:47087-47106 placement
var release = NC.release;
//@ chunk-e6aww6q8.js:47106-47127 placement
var whenBound = NC.whenBound;
/**
 * 当前附着的绘制界面列表（本进程是终端时排在第一）。
 */
//@ chunk-e6aww6q8.js:47127-47247 placement
function attachedSurfaces() {
  let e = lp()?.surface === "terminal",
    filtered = vk.surfaces().filter((r) => r !== "terminal");
  return e ? ["terminal", ...filtered] : filtered;
}
/**
 * 构造视口信息：是否全屏与列数（优先绑定的视口，其次 stdout 列数）。
 */
//@ chunk-e6aww6q8.js:84862-84992 placement
function viewportInfo(e) {
  let n = g2.get()?.columns,
    columns = process.stdout.columns,
    s = columns > 0;
  return { isFullscreen: e === "fullscreen", columns: n ?? (s ? columns : $_t) };
}

export { lp, K$o, release, viewportInfo, attachedSurfaces, whenBound, G3 };
