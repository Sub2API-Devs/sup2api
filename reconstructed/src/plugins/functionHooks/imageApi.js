/**
 * plugins/functionHooks/imageApi.ts
 *
 * 2.1.316 新增：插件 UI 中 Image 元素在终端里的渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import {
  TMUX_PASSTHROUGH_REQUIREMENT,
  TMUX_OLD_VERSION_HINT,
  TMUX_OUTER_TERMINAL_HINT,
  TMUX_UNKNOWN_OUTER_TERMINAL,
  TMUX_PASSTHROUGH_UNKNOWN,
  TMUX_PANE_UNSET,
  TMUX_VERSION_UNANSWERED,
  TMUX_NOT_A_PANE,
} from "../../ink/terminalImages.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  rasterKey,
  denyLater,
  describeForeignMount,
  takeBlitToken,
  MAX_BLITS_PER_SECOND,
  mountOnSite,
} from "./ui/raster.js";
import { checkImageSource } from "./ui/imageSource.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";

//@ chunk-e6aww6q8.js:3748037-3748084 placement
/**
 * tmux 透传提示作为替代文字
 */
var TMUX_IMAGE_ALT_TEXT = `the Image draws its alt here: ${TMUX_PASSTHROUGH_REQUIREMENT}`;
//@ chunk-e6aww6q8.js:3748084-3749273 placement
/**
 * 在终端里绘制插件 UI 的 Image 元素，终端不支持内联图片时显示替代文字。
 */
function renderPluginImage(e) {
  let { hasRoot, placeholders, inlineImages, hasId, isReference, files } = e;
  let w = placeholders.state === "settled" && placeholders.value;
  let L = !w && inlineImages.state === "settled" && inlineImages.value;
  let G = !isReference || (files.state === "settled" && files.value);
  let q = !G && files.state !== "settled";
  let source = files.state === "settled" ? files.source : "";
  if (!hasRoot) return "the Image is not drawn under a terminal root";
  let found = [
    TMUX_PASSTHROUGH_REQUIREMENT,
    TMUX_OLD_VERSION_HINT,
    TMUX_OUTER_TERMINAL_HINT,
    TMUX_UNKNOWN_OUTER_TERMINAL,
    TMUX_PASSTHROUGH_UNKNOWN,
    TMUX_PANE_UNSET,
    TMUX_VERSION_UNANSWERED,
    TMUX_NOT_A_PANE,
  ].find((ke) =>
    [placeholders.source, inlineImages.source].some((we) => we.replace(/^probe: /, "").startsWith(ke)),
  );
  if (!w && !L && found !== undefined)
    return found === TMUX_PASSTHROUGH_REQUIREMENT
      ? TMUX_IMAGE_ALT_TEXT
      : `the Image draws its alt here: ${found}`;
  if (!w && !L)
    return `the Image draws its alt here: the terminal draws neither kitty placeholder images (${placeholders.source}) nor iTerm2 inline images (${inlineImages.source})`;
  if (!hasId) return "the Image draws its alt here: every 8-bit image id is in use";
  if (L)
    return isReference
      ? "the Image draws its alt here: iTerm2 inline images carry bytes and read no file or shared-memory name; send the picture as png or rgba bytes to draw it here"
      : undefined;
  return q
    ? "the terminal has not yet said whether it reads files on this machine; asked now, blit again"
    : G
      ? undefined
      : `the Image draws its alt here: this terminal cannot read files on this machine (${source}); a { file } or { shm } source shows nothing, bytes still draw`;
}
//@ chunk-e6aww6q8.js:3749273-3749324 placement
/**
 * 已挂载图片表
 */
var mountedImages = identity_2(
  () => getPluginRegistry().mountedImages,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:3749324-3749455 placement
/**
 * 判断同一请求、同一 key 的图片是否已被其他插件占用。
 */
function isImageKeyTakenByOther(requestId, key, plugin) {
  for (let s of mountedImages().values())
    for (let image of s.images)
      if (image.requestId === requestId && image.key === key && image.plugin !== plugin) return true;
  return false;
}
//@ chunk-e6aww6q8.js:3749455-3750257 placement
function IMAGE_ELEMENT_LIMITS(e, n) {
  let { requestId, key, source } = e;
  let y = mountedImages().get(rasterKey(requestId, key, n.plugin));
  let S = [...(y?.images ?? [])];
  let [w] = S;
  if (y === undefined || w === undefined)
    return denyLater(describeForeignMount("Image", e, isImageKeyTakenByOther(requestId, key, n.plugin)));
  let columns = e.columns ?? w.columns;
  let rows = e.rows ?? w.rows;
  let filtered = S.filter((Ae) => Ae.columns === columns && Ae.rows === rows);
  if (filtered.length === 0)
    return denyLater(
      `the mounted Image is ${w.columns}x${w.rows}, not ${columns}x${rows}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(y, Date.now()))
    return denyLater(
      `more than ${MAX_BLITS_PER_SECOND} blits a second; the surface transmits at its frame rate, so one blit a frame is all that shows`,
    );
  let Z = checkImageSource(source);
  if (Z !== undefined) return denyLater(Z);
  let mapped = filtered.map((Ae) => Ae.swap(source));
  let [ke] = mapped;
  if (!(ke !== undefined && mapped.every((Ae) => Ae !== undefined))) return Promise.resolve({});
  let Ee = ke === TMUX_IMAGE_ALT_TEXT ? "tmux-passthrough" : undefined;
  return Ee === undefined
    ? denyLater(ke)
    : Promise.resolve({
        deny: ke,
        fix: Ee,
      });
}
//@ chunk-e6aww6q8.js:3750257-3750305 placement
/**
 * 是否带 source
 */
function hasImageSource(e) {
  return "source" in e && isPlainObject_5(e.source);
}
//@ chunk-e6aww6q8.js:3750305-3750462 placement
/**
 * 把插件 Image 元素挂载到按（请求, key, 插件）索引的图片站点，返回卸载函数。
 */
var mountPluginImage = (e) =>
  mountOnSite({
    sites: mountedImages(),
    siteKey: rasterKey(e.requestId, e.key, e.plugin),
    mount: e,
    mountsOf: (n) => n.images,
    freshSite: () => ({
      images: new Set(),
      windowStart: 0,
      blits: 0,
    }),
  });
//@ chunk-e6aww6q8.js:3750462-3750500 placement
/**
 * 附 swap
 */
var withSwap = (e, n, swap) => ({
  ...e,
  ...n,
  swap,
});
//@ chunk-e6aww6q8.js:3750500-3750553 placement
/**
 * 读当前选区
 */
var readSelectionPromise = () => Promise.resolve(currentSurfaceBinding()?.selection?.read());
export {
  mountPluginImage,
  withSwap,
  renderPluginImage,
  readSelectionPromise,
  hasImageSource,
  IMAGE_ELEMENT_LIMITS,
};
