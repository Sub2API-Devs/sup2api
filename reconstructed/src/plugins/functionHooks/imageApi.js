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
import { TMUX_PASSTHROUGH_REQUIREMENT, H2o, N2o, $2o, F2o, B2o, U2o, j2o } from "../../ink/terminalImages.js";
import { ge } from "../../utils/identity.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { ext, K5e, describeForeignMount, takeBlitToken, wfr, mountOnSite } from "./ui/raster.js";
import { checkImageSource } from "./ui/imageSource.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { lp } from "./surfaceBinding.js";

//@ chunk-e6aww6q8.js:3748037-3748084 placement
var est = `the Image draws its alt here: ${TMUX_PASSTHROUGH_REQUIREMENT}`;
/**
 * 在终端里绘制插件 UI 的 Image 元素，终端不支持内联图片时显示替代文字。
 */
//@ chunk-e6aww6q8.js:3748084-3749273 placement
function renderPluginImage(e) {
  let {
      hasRoot: hasRoot,
      placeholders: placeholders,
      inlineImages: inlineImages,
      hasId: hasId,
      isReference: isReference,
      files: files,
    } = e,
    w = placeholders.state === "settled" && placeholders.value,
    L = !w && inlineImages.state === "settled" && inlineImages.value,
    G = !isReference || (files.state === "settled" && files.value),
    q = !G && files.state !== "settled",
    Z = files.state === "settled" ? files.source : "";
  if (!hasRoot) return "the Image is not drawn under a terminal root";
  let found = [TMUX_PASSTHROUGH_REQUIREMENT, H2o, N2o, $2o, F2o, B2o, U2o, j2o].find((ke) =>
    [placeholders.source, inlineImages.source].some((we) => we.replace(/^probe: /, "").startsWith(ke)),
  );
  if (!w && !L && found !== void 0)
    return found === TMUX_PASSTHROUGH_REQUIREMENT ? est : `the Image draws its alt here: ${found}`;
  if (!w && !L)
    return `the Image draws its alt here: the terminal draws neither kitty placeholder images (${placeholders.source}) nor iTerm2 inline images (${inlineImages.source})`;
  if (!hasId) return "the Image draws its alt here: every 8-bit image id is in use";
  if (L)
    return isReference
      ? "the Image draws its alt here: iTerm2 inline images carry bytes and read no file or shared-memory name; send the picture as png or rgba bytes to draw it here"
      : void 0;
  return q
    ? "the terminal has not yet said whether it reads files on this machine; asked now, blit again"
    : G
      ? void 0
      : `the Image draws its alt here: this terminal cannot read files on this machine (${Z}); a { file } or { shm } source shows nothing, bytes still draw`;
}
//@ chunk-e6aww6q8.js:3749273-3749324 placement
var gY = ge(
  () => getPluginRegistry().mountedImages,
  (e) => e().clear(),
);
/**
 * 判断同一请求、同一 key 的图片是否已被其他插件占用。
 */
//@ chunk-e6aww6q8.js:3749324-3749455 placement
function isImageKeyTakenByOther(e, n, r) {
  for (let s of gY().values())
    for (let image of s.images) if (image.requestId === e && image.key === n && image.plugin !== r) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:3749455-3750257 placement
function IMAGE_ELEMENT_LIMITS(e, n) {
  let { requestId: requestId, key: key, source: source } = e,
    y = gY().get(ext(requestId, key, n.plugin)),
    S = [...(y?.images ?? [])],
    [w] = S;
  if (y === void 0 || w === void 0)
    return K5e(describeForeignMount("Image", e, isImageKeyTakenByOther(requestId, key, n.plugin)));
  let L = e.columns ?? w.columns,
    G = e.rows ?? w.rows,
    filtered = S.filter((Ae) => Ae.columns === L && Ae.rows === G);
  if (filtered.length === 0)
    return K5e(
      `the mounted Image is ${w.columns}x${w.rows}, not ${L}x${G}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(y, Date.now()))
    return K5e(
      `more than ${wfr} blits a second; the surface transmits at its frame rate, so one blit a frame is all that shows`,
    );
  let Z = checkImageSource(source);
  if (Z !== void 0) return K5e(Z);
  let mapped = filtered.map((Ae) => Ae.swap(source)),
    [ke] = mapped;
  if (!(ke !== void 0 && mapped.every((Ae) => Ae !== void 0))) return Promise.resolve({});
  let Ee = ke === est ? "tmux-passthrough" : void 0;
  return Ee === void 0 ? K5e(ke) : Promise.resolve({ deny: ke, fix: Ee });
}
//@ chunk-e6aww6q8.js:3750257-3750305 placement
function HHr(e) {
  return "source" in e && isPlainObject_4(e.source);
}
/**
 * 把插件 Image 元素挂载到按（请求, key, 插件）索引的图片站点，返回卸载函数。
 */
//@ chunk-e6aww6q8.js:3750305-3750462 placement
var mountPluginImage = (e) =>
  mountOnSite({
    sites: gY(),
    siteKey: ext(e.requestId, e.key, e.plugin),
    mount: e,
    mountsOf: (n) => n.images,
    freshSite: () => ({ images: new Set(), windowStart: 0, blits: 0 }),
  });
//@ chunk-e6aww6q8.js:3750462-3750500 placement
var l$i = (e, n, r) => ({ ...e, ...n, swap: r });
//@ chunk-e6aww6q8.js:3750500-3750553 placement
var ELn = () => Promise.resolve(lp()?.selection?.read());

export { mountPluginImage, l$i, renderPluginImage, ELn, HHr, IMAGE_ELEMENT_LIMITS };
