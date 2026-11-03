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
import { isAbsolute } from "path";
import { getPermissionScreenAnchor } from "../../../bootstrap/state.js";
import {
  networkMountRoots,
  isUncOrNetworkSpelling,
  classifyHomeMount,
  isNonWslUncPath,
  isNetworkMountRoot,
  networkMountHost,
} from "../../../utils/networkPaths.js";
import { isForeignNetworkPath } from "../../../utils/pathClassification.js";
import { isNonNegativeInt } from "../sites/siteRules.js";
import { hasControlCharacter, base64DecodedLength, base64BytesPerFour } from "./validateTree.js";
import { checkCellSize } from "../sites/uiSites.js";
import { getImagePath } from "../../../utils/imageStore.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";

//@ chunk-4121qate.js:152817-153041 placement
/**
 * 判断路径是否在网络位置或其他设备上（不同于权限锚点所在卷、或 WSL/家目录挂载规则），用于拒绝访问。
 */
function isNetworkOrDevicePath(e) {
  let permissionScreenAnchor = getPermissionScreenAnchor();
  let r = permissionScreenAnchor === null ? [] : networkMountRoots(permissionScreenAnchor);
  if (networkMountRoots(e).some((f) => !r.includes(f))) return true;
  if (!(isUncOrNetworkSpelling(e) || classifyHomeMount(e))) return false;
  if (isNonWslUncPath(e))
    return permissionScreenAnchor === null || isForeignNetworkPath(e, permissionScreenAnchor);
  let i = isNetworkMountRoot(e) ? networkMountHost(e) : null;
  let p = permissionScreenAnchor === null ? null : networkMountHost(permissionScreenAnchor);
  return i === null || i !== p;
}
//@ chunk-4121qate.js:153041-153167 placement
function checkGeneration(generation) {
  return generation === undefined || (isNonNegativeInt(generation) && Number.isSafeInteger(generation))
    ? undefined
    : "source.generation must be a whole number when given";
}
//@ chunk-4121qate.js:153167-153179 placement
/**
 * 3072
 */
var MAX_IMAGE_COLUMNS = 3072;
//@ chunk-4121qate.js:153179-153191 placement
/**
 * 4096
 */
var MAX_IMAGE_ROWS = 4096;
//@ chunk-4121qate.js:153191-153324 placement
function checkImageSize(width, height, r) {
  return isNonNegativeInt(width) &&
    isNonNegativeInt(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= r &&
    height <= r
    ? undefined
    : `source width and height must be whole numbers from 1 to ${r}`;
}
//@ chunk-4121qate.js:153324-154039 placement
/**
 * 校验图片 source.file：绝对路径、无控制字符、非网络/设备路径
 */
function checkImageFileSource(file, o) {
  let { format, width, height, generation } = o;
  if (typeof file !== "string" || file === "" || !isAbsolute(file))
    return "source.file must be an absolute path";
  if (hasControlCharacter(file) || /[\t\n\r]/.test(file)) return "source.file holds a control character";
  if (isNetworkOrDevicePath(file))
    return "source.file names a network location or device path, as spelled; the terminal would open it as the person ($.fs refuses it too)";
  if (Buffer.byteLength(file, "utf8") > MAX_IMAGE_COLUMNS)
    return `source.file is longer than ${MAX_IMAGE_COLUMNS} bytes`;
  if (format !== "png" && format !== "rgba" && format !== "rgb")
    return 'source.format must be "png", "rgba" or "rgb" beside file';
  let p = format === "png";
  if (p && (width !== undefined || height !== undefined))
    return 'source width and height go with format "rgba" or "rgb"; a png sizes itself';
  return (p ? undefined : checkImageSize(width, height, MAX_IMAGE_ROWS)) ?? checkGeneration(generation);
}
//@ chunk-4121qate.js:154039-154050 placement
/**
 * 255
 */
var MAX_CELL_COLUMNS = 255;
//@ chunk-4121qate.js:154050-154061 placement
/**
 * 255
 */
var MAX_CELL_ROWS = 255;
//@ chunk-4121qate.js:154061-154104 placement
/**
 * 校验图像单元格
 */
var checkImageCellSize = (columns, rows) =>
  checkCellSize(columns, rows, {
    columns: MAX_CELL_COLUMNS,
    rows: MAX_CELL_ROWS,
  });
//@ chunk-4121qate.js:154140-154201 placement
/**
 * file/shm 来源
 */
var isNamedImageSource = (e) => Object.hasOwn(e, "file") || Object.hasOwn(e, "shm");
//@ chunk-4121qate.js:154201-154249 placement
/**
 * 图像负载字节数
 */
var imagePayloadBytes = (source) =>
  isNamedImageSource(source)
    ? 0
    : (base64DecodedLength(getImagePath(source) ? source.png : source.rgba) ?? 0);
//@ chunk-4121qate.js:154249-154264 placement
/**
 * 2097152
 */
var MAX_IMAGE_BYTES = 2097152;
//@ chunk-4121qate.js:154264-154276 placement
/**
 * 4096
 */
var MAX_IMAGE_DIMENSION = 4096;
//@ chunk-4121qate.js:154276-154339 placement
/**
 * PNG IHDR 偏移
 */
var PNG_HEADER_LAYOUT = {
  bytes: 33,
  typeAt: 12,
  type: "IHDR",
  widthAt: 16,
  heightAt: 20,
};
//@ chunk-4121qate.js:154339-154373 placement
/**
 * PNG 魔数
 */
var PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
//@ chunk-4121qate.js:154373-154852 placement
function checkPngSource(e) {
  let buffer = Buffer.from(
    e.slice(0, Math.ceil(PNG_HEADER_LAYOUT.bytes / base64BytesPerFour.bytes) * base64BytesPerFour.characters),
    "base64",
  );
  if (!PNG_SIGNATURE.every((f, a) => buffer[a] === f)) return "source.png does not start as a PNG file does";
  if (!(
    buffer.length >= PNG_HEADER_LAYOUT.bytes &&
    buffer.toString("latin1", PNG_HEADER_LAYOUT.typeAt, PNG_HEADER_LAYOUT.widthAt) === PNG_HEADER_LAYOUT.type
  ))
    return "source.png has no IHDR header after its signature";
  let uInt32BE = buffer.readUInt32BE(PNG_HEADER_LAYOUT.widthAt);
  let uInt32BE_2 = buffer.readUInt32BE(PNG_HEADER_LAYOUT.heightAt);
  return uInt32BE >= 1 &&
    uInt32BE <= MAX_IMAGE_DIMENSION &&
    uInt32BE_2 >= 1 &&
    uInt32BE_2 <= MAX_IMAGE_DIMENSION
    ? undefined
    : `source.png declares ${uInt32BE}x${uInt32BE_2} pixels; a side is 1 to ${MAX_IMAGE_DIMENSION}`;
}
//@ chunk-4121qate.js:154852-155028 placement
function checkPngBase64(e) {
  let o = base64DecodedLength(e);
  if (o === undefined || typeof e !== "string") return "source.png must be standard padded base64";
  return o > MAX_IMAGE_BYTES ? `source.png decodes to more than ${MAX_IMAGE_BYTES} bytes` : checkPngSource(e);
}
//@ chunk-4121qate.js:155028-155040 placement
/**
 * 2048
 */
var MAX_SHM_NAME = 2048;
//@ chunk-4121qate.js:155040-155049 placement
/**
 * 4
 */
var RGBA_BYTES_PER_PIXEL = 4;
//@ chunk-4121qate.js:155049-155362 placement
/**
 * 校验 rgba 图片来源：base64 合法、尺寸与大小在上限内。
 */
function checkRgbaSource(rgba, width, height) {
  let n = base64DecodedLength(rgba);
  if (n === undefined) return "source.rgba must be standard padded base64";
  let s = checkImageSize(width, height, MAX_SHM_NAME);
  if (s !== undefined) return s;
  if (n > MAX_IMAGE_BYTES) return `source.rgba decodes to more than ${MAX_IMAGE_BYTES} bytes`;
  let i = Number(width) * Number(height) * RGBA_BYTES_PER_PIXEL;
  return n === i ? undefined : `source.rgba decodes to ${n} bytes, not width * height * 4 (${i})`;
}
//@ chunk-4121qate.js:155362-155409 placement
/**
 * /名字 格式
 */
var SHM_NAME_RE = /^\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,254}$/;
//@ chunk-4121qate.js:155409-155724 placement
/**
 * 校验 shm 图片来源：名字格式、像素格式、尺寸与代号。
 */
function checkShmSource(e, o) {
  let { format, width, height, generation } = o;
  if (typeof e !== "string" || !SHM_NAME_RE.test(e))
    return 'source.shm must be "/" then 1 to 254 of A-Z a-z 0-9 . _ - (not "." or ".." alone), a POSIX shared-memory name';
  return format === "rgba" || format === "rgb"
    ? (checkImageSize(width, height, MAX_IMAGE_ROWS) ?? checkGeneration(generation))
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
function checkImageSource(source) {
  let o = "{ png }, { rgba, width, height }, { file, format } or { shm, format, width, height }";
  if (!isPlainObject(source)) return `source must be ${o}`;
  let [r, n] = IMAGE_SOURCE_KINDS.filter(([a]) => Object.hasOwn(source, a));
  if (r === undefined) return `source must be ${o}`;
  let [s, i] = r;
  if (n !== undefined) return `source holds both "${s}" and "${n[0]}"; it is one of ${o}`;
  let p = i;
  let found = Object.keys(source).find((key) => !p.includes(key));
  if (found !== undefined) return `source field "${found}" is not allowed beside "${s}"`;
  switch (s) {
    case "png":
      return checkPngBase64(source.png);
    case "rgba":
      return checkRgbaSource(source.rgba, source.width, source.height);
    case "file":
      return checkImageFileSource(source.file, source);
    case "shm":
      return checkShmSource(source.shm, source);
  }
}
//@ chunk-4121qate.js:156487-156523 placement
/**
 * 是否 shm 来源
 */
var isShmSource = (e) => Object.hasOwn(e, "shm");
//@ chunk-4121qate.js:156523-156899 placement
/**
 * 把校验过的图片来源转换为渲染请求：png/rgba 带 base64，file/shm 带介质名与格式尺寸。
 */
function toImageRequest(source) {
  if (getImagePath(source))
    return {
      format: "png",
      base64: source.png,
    };
  if (!isNamedImageSource(source)) {
    let { rgba, width, height } = source;
    return {
      format: "rgba",
      base64: rgba,
      width,
      height,
    };
  }
  let o = Object.hasOwn(source, "shm") ? "shm" : "file";
  let r = o === "shm";
  let n = "shm" in source;
  let s = "file" in source;
  let name = r ? (n ? source.shm : "") : s ? source.file : "";
  return source.format === "png"
    ? {
        medium: o,
        name,
        format: "png",
      }
    : {
        medium: o,
        name,
        format: source.format,
        width: source.width,
        height: source.height,
      };
}
export {
  checkImageCellSize,
  checkImageSource,
  imagePayloadBytes,
  isNamedImageSource,
  toImageRequest,
  isShmSource,
  isNetworkOrDevicePath,
};
