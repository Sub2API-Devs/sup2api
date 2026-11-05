/**
 * plugins/functionHooks/imageApi.ts
 *
 * 2.1.316 新增：插件 UI 中 Image 元素在终端里的渲染
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3843785-3843832 placement
/**
 * tmux 透传提示作为替代文字
 */
var TMUX_IMAGE_ALT_TEXT; // deferred: uses TMUX_PASSTHROUGH_REQUIREMENT (../../ink/terminalImages.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3843785", () => {
  TMUX_IMAGE_ALT_TEXT = `the Image draws its alt here: ${TMUX_PASSTHROUGH_REQUIREMENT}`;
});
//@ chunk-5xgkngpb.js:3843832-3845023 placement
/**
 * 在终端里绘制插件 UI 的 Image 元素，终端不支持内联图片时显示替代文字。
 */
function renderPluginImage(facts) {
  let { hasRoot, placeholders, inlineImages, hasId, isReference, files } = facts;
  let settledPlaceholders = placeholders.state === "settled" && placeholders.value;
  let settledInline = !settledPlaceholders && inlineImages.state === "settled" && inlineImages.value;
  let filesRead = !isReference || (files.state === "settled" && files.value);
  let filesPending = !filesRead && files.state !== "settled";
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
  ].find((prefix) =>
    [placeholders.source, inlineImages.source].some((secondSource) =>
      secondSource.replace(/^probe: /, "").startsWith(prefix),
    ),
  );
  if (!settledPlaceholders && !settledInline && found !== undefined)
    return found === TMUX_PASSTHROUGH_REQUIREMENT
      ? TMUX_IMAGE_ALT_TEXT
      : `the Image draws its alt here: ${found}`;
  if (!settledPlaceholders && !settledInline)
    return `the Image draws its alt here: the terminal draws neither kitty placeholder images (${placeholders.source}) nor iTerm2 inline images (${inlineImages.source})`;
  if (!hasId) return "the Image draws its alt here: every 8-bit image id is in use";
  if (settledInline)
    return isReference
      ? "the Image draws its alt here: iTerm2 inline images carry bytes and read no file or shared-memory name; send the picture as png or rgba bytes to draw it here"
      : undefined;
  return filesPending
    ? "the terminal has not yet said whether it reads files on this machine; asked now, blit again"
    : filesRead
      ? undefined
      : `the Image draws its alt here: this terminal cannot read files on this machine (${source}); a { file } or { shm } source shows nothing, bytes still draw`;
}
//@ chunk-5xgkngpb.js:3845023-3845074 placement
/**
 * 已挂载图片表
 */
var mountedImages; // deferred: uses getPluginRegistry (../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3845023", () => {
  mountedImages = identity_2(
    () => getPluginRegistry().mountedImages,
    (map) => map().clear(),
  );
});
//@ chunk-5xgkngpb.js:3845074-3845205 placement
/**
 * 判断同一请求、同一 key 的图片是否已被其他插件占用。
 */
function isImageKeyTakenByOther(requestId, key, plugin) {
  for (let site of mountedImages().values())
    for (let image of site.images)
      if (image.requestId === requestId && image.key === key && image.plugin !== plugin) return true;
  return false;
}
//@ chunk-5xgkngpb.js:3845205-3846010 placement
function IMAGE_ELEMENT_LIMITS(request, caller) {
  let { requestId, key, source } = request;
  let site = mountedImages().get(rasterKey(requestId, key, caller.plugin));
  let images = [...(site?.images ?? [])];
  let [first] = images;
  if (site === undefined || first === undefined)
    return denyLater(
      describeForeignMount("Image", request, isImageKeyTakenByOther(requestId, key, caller.plugin)),
    );
  let columns = request.columns ?? first.columns;
  let rows = request.rows ?? first.rows;
  let filtered = images.filter((image) => image.columns === columns && image.rows === rows);
  if (filtered.length === 0)
    return denyLater(
      `the mounted Image is ${first.columns}x${first.rows}, not ${columns}x${rows}; a resize is a redraw (ui.invalidate)`,
    );
  if (!takeBlitToken(site, Date.now()))
    return denyLater(
      `more than ${MAX_BLITS_PER_SECOND} blits a second; the surface transmits at its frame rate, so one blit a frame is all that shows`,
    );
  let problem = checkImageSource(source);
  if (problem !== undefined) return denyLater(problem);
  let mapped = filtered.map((image) => image.swap(source));
  let [firstSwap] = mapped;
  if (!(firstSwap !== undefined && mapped.every((image) => image !== undefined))) return Promise.resolve({});
  let mode = firstSwap === TMUX_IMAGE_ALT_TEXT ? "tmux-passthrough" : undefined;
  return mode === undefined
    ? denyLater(firstSwap)
    : Promise.resolve({
        deny: firstSwap,
        fix: mode,
      });
}
//@ chunk-5xgkngpb.js:3846010-3846058 placement
/**
 * 是否带 source
 */
function hasImageSource(request) {
  return "source" in request && isPlainObject_6(request.source);
}
//@ chunk-5xgkngpb.js:3846058-3846215 placement
/**
 * 把插件 Image 元素挂载到按（请求, key, 插件）索引的图片站点，返回卸载函数。
 */
var mountPluginImage = (mount) =>
  mountOnSite({
    sites: mountedImages(),
    siteKey: rasterKey(mount.requestId, mount.key, mount.plugin),
    mount,
    mountsOf: (site) => site.images,
    freshSite: () => ({
      images: new Set(),
      windowStart: 0,
      blits: 0,
    }),
  });
//@ chunk-5xgkngpb.js:3846215-3846253 placement
/**
 * 附 swap
 */
var withSwap = (a, b, swap) => ({
  ...a,
  ...b,
  swap,
});
//@ chunk-5xgkngpb.js:3846253-3846306 placement
/**
 * 读当前选区
 */
var readSelectionPromise = () => Promise.resolve(currentSurfaceBinding()?.selection?.read());
export {
  readSelectionPromise,
  hasImageSource,
  IMAGE_ELEMENT_LIMITS,
  mountPluginImage,
  withSwap,
  renderPluginImage,
};
