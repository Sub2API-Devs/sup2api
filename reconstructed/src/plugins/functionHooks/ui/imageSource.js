/**
 * plugins/functionHooks/ui/imageSource.ts
 *
 * 钩子 UI 图片来源（png/rgba/file/shm）校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (26)
 * attribution: placement 26
 */
import { isAbsolute, isAbsolute as isAbsolute_2, isAbsolute as isAbsolute_3 } from "path";
import { getPermissionScreenAnchor } from "../../../bootstrap/state.js";
import {
  networkMountRoots,
  vHn,
  classifyHomeMount,
  ai,
  yl,
  networkMountHost,
} from "../../../utils/networkPaths.js";
import { isForeignNetworkPath } from "../../../utils/pathClassification.js";
import { hK } from "../sites/siteRules.js";
import { hasControlCharacter, base64DecodedLength, pt } from "./validateTree.js";
import { checkCellSize } from "../sites/uiSites.js";
import { getImagePath } from "../../../utils/imageStore.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";

/**
 * 判断路径是否在网络位置或其他设备上（不同于权限锚点所在卷、或 WSL/家目录挂载规则），用于拒绝访问。
 */
//@ chunk-4121qate.js:152817-153041 placement
function isNetworkOrDevicePath(e) {
  let o = getPermissionScreenAnchor(),
    r = o === null ? [] : networkMountRoots(o);
  if (networkMountRoots(e).some((f) => !r.includes(f))) return !0;
  if (!(vHn(e) || classifyHomeMount(e))) return !1;
  if (ai(e)) return o === null || isForeignNetworkPath(e, o);
  let i = yl(e) ? networkMountHost(e) : null,
    p = o === null ? null : networkMountHost(o);
  return i === null || i !== p;
}
//@ chunk-4121qate.js:153041-153167 placement
function checkGeneration(e) {
  return e === void 0 || (hK(e) && Number.isSafeInteger(e))
    ? void 0
    : "source.generation must be a whole number when given";
}
//@ chunk-4121qate.js:153167-153179 placement
var Ii = 3072;
//@ chunk-4121qate.js:153179-153191 placement
var Jr = 4096;
//@ chunk-4121qate.js:153191-153324 placement
function checkImageSize(e, o, r) {
  return hK(e) && hK(o) && e >= 1 && o >= 1 && e <= r && o <= r
    ? void 0
    : `source width and height must be whole numbers from 1 to ${r}`;
}
/**
 * 校验图片 source.file：绝对路径、无控制字符、非网络/设备路径
 */
//@ chunk-4121qate.js:153324-154039 placement
function checkImageFileSource(e, o) {
  let { format: format, width: width, height: height, generation: generation } = o;
  if (typeof e !== "string" || e === "" || !isAbsolute_2(e)) return "source.file must be an absolute path";
  if (hasControlCharacter(e) || /[\t\n\r]/.test(e)) return "source.file holds a control character";
  if (isNetworkOrDevicePath(e))
    return "source.file names a network location or device path, as spelled; the terminal would open it as the person ($.fs refuses it too)";
  if (Buffer.byteLength(e, "utf8") > Ii) return `source.file is longer than ${Ii} bytes`;
  if (format !== "png" && format !== "rgba" && format !== "rgb")
    return 'source.format must be "png", "rgba" or "rgb" beside file';
  let p = format === "png";
  if (p && (width !== void 0 || height !== void 0))
    return 'source width and height go with format "rgba" or "rgb"; a png sizes itself';
  return (p ? void 0 : checkImageSize(width, height, Jr)) ?? checkGeneration(generation);
}
//@ chunk-4121qate.js:154039-154050 placement
var bm = 255;
//@ chunk-4121qate.js:154050-154061 placement
var Sm = 255;
//@ chunk-4121qate.js:154061-154104 placement
var rS = (e, o) => checkCellSize(e, o, { columns: bm, rows: Sm });
//@ chunk-4121qate.js:154140-154201 placement
var ZRt = (e) => Object.hasOwn(e, "file") || Object.hasOwn(e, "shm");
//@ chunk-4121qate.js:154201-154249 placement
var Em = (e) => (ZRt(e) ? 0 : (base64DecodedLength(getImagePath(e) ? e.png : e.rgba) ?? 0));
//@ chunk-4121qate.js:154249-154264 placement
var eo = 2097152;
//@ chunk-4121qate.js:154264-154276 placement
var qr = 4096;
//@ chunk-4121qate.js:154276-154339 placement
var bt = { bytes: 33, typeAt: 12, type: "IHDR", widthAt: 16, heightAt: 20 };
//@ chunk-4121qate.js:154339-154373 placement
var Om = [137, 80, 78, 71, 13, 10, 26, 10];
//@ chunk-4121qate.js:154373-154852 placement
function checkPngSource(e) {
  let buffer = Buffer.from(e.slice(0, Math.ceil(bt.bytes / pt.bytes) * pt.characters), "base64");
  if (!Om.every((f, a) => buffer[a] === f)) return "source.png does not start as a PNG file does";
  if (!(buffer.length >= bt.bytes && buffer.toString("latin1", bt.typeAt, bt.widthAt) === bt.type))
    return "source.png has no IHDR header after its signature";
  let uInt32BE = buffer.readUInt32BE(bt.widthAt),
    uInt32BE_2 = buffer.readUInt32BE(bt.heightAt);
  return uInt32BE >= 1 && uInt32BE <= qr && uInt32BE_2 >= 1 && uInt32BE_2 <= qr
    ? void 0
    : `source.png declares ${uInt32BE}x${uInt32BE_2} pixels; a side is 1 to ${qr}`;
}
//@ chunk-4121qate.js:154852-155028 placement
function checkPngBase64(e) {
  let o = base64DecodedLength(e);
  if (o === void 0 || typeof e !== "string") return "source.png must be standard padded base64";
  return o > eo ? `source.png decodes to more than ${eo} bytes` : checkPngSource(e);
}
//@ chunk-4121qate.js:155028-155040 placement
var vm = 2048;
//@ chunk-4121qate.js:155040-155049 placement
var Pm = 4;
/**
 * 校验 rgba 图片来源：base64 合法、尺寸与大小在上限内。
 */
//@ chunk-4121qate.js:155049-155362 placement
function checkRgbaSource(e, o, r) {
  let n = base64DecodedLength(e);
  if (n === void 0) return "source.rgba must be standard padded base64";
  let s = checkImageSize(o, r, vm);
  if (s !== void 0) return s;
  if (n > eo) return `source.rgba decodes to more than ${eo} bytes`;
  let i = Number(o) * Number(r) * Pm;
  return n === i ? void 0 : `source.rgba decodes to ${n} bytes, not width * height * 4 (${i})`;
}
//@ chunk-4121qate.js:155362-155409 placement
var Cm = /^\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,254}$/;
/**
 * 校验 shm 图片来源：名字格式、像素格式、尺寸与代号。
 */
//@ chunk-4121qate.js:155409-155724 placement
function checkShmSource(e, o) {
  let { format: format, width: width, height: height, generation: generation } = o;
  if (typeof e !== "string" || !Cm.test(e))
    return 'source.shm must be "/" then 1 to 254 of A-Z a-z 0-9 . _ - (not "." or ".." alone), a POSIX shared-memory name';
  return format === "rgba" || format === "rgb"
    ? (checkImageSize(width, height, Jr) ?? checkGeneration(generation))
    : 'source.format must be "rgba" or "rgb" beside shm';
}
//@ chunk-4121qate.js:155724-155896 placement
var IMAGE_SOURCE_KINDS = [
  ["png", ["png"]],
  ["rgba", ["rgba", "width", "height"]],
  ["file", ["file", "format", "width", "height", "generation"]],
  ["shm", ["shm", "format", "width", "height", "generation"]],
];
//@ chunk-4121qate.js:155896-156487 placement
function checkImageSource(e) {
  let o = "{ png }, { rgba, width, height }, { file, format } or { shm, format, width, height }";
  if (!isPlainObject(e)) return `source must be ${o}`;
  let [r, n] = IMAGE_SOURCE_KINDS.filter(([a]) => Object.hasOwn(e, a));
  if (r === void 0) return `source must be ${o}`;
  let [s, i] = r;
  if (n !== void 0) return `source holds both "${s}" and "${n[0]}"; it is one of ${o}`;
  let p = i,
    found = Object.keys(e).find((a) => !p.includes(a));
  if (found !== void 0) return `source field "${found}" is not allowed beside "${s}"`;
  switch (s) {
    case "png":
      return checkPngBase64(e.png);
    case "rgba":
      return checkRgbaSource(e.rgba, e.width, e.height);
    case "file":
      return checkImageFileSource(e.file, e);
    case "shm":
      return checkShmSource(e.shm, e);
  }
}
//@ chunk-4121qate.js:156487-156523 placement
var Prs = (e) => Object.hasOwn(e, "shm");
/**
 * 把校验过的图片来源转换为渲染请求：png/rgba 带 base64，file/shm 带介质名与格式尺寸。
 */
//@ chunk-4121qate.js:156523-156899 placement
function toImageRequest(e) {
  if (getImagePath(e)) return { format: "png", base64: e.png };
  if (!ZRt(e)) {
    let { rgba: rgba, width: width, height: height } = e;
    return { format: "rgba", base64: rgba, width: width, height: height };
  }
  let o = Object.hasOwn(e, "shm") ? "shm" : "file",
    r = o === "shm",
    n = "shm" in e,
    s = "file" in e,
    i = r ? (n ? e.shm : "") : s ? e.file : "";
  return e.format === "png"
    ? { medium: o, name: i, format: "png" }
    : { medium: o, name: i, format: e.format, width: e.width, height: e.height };
}

export { rS, checkImageSource, Em, ZRt, toImageRequest, Prs, isNetworkOrDevicePath };
