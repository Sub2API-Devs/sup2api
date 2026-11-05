/**
 * plugins/functionHooks/ui/imageSource.ts
 *
 * 钩子 UI 图片来源（png/rgba/file/shm）校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (26)
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

//@ chunk-j8f885h1.js:133993-134218 placement
/**
 * 判断路径是否在网络位置或其他设备上（不同于权限锚点所在卷、或 WSL/家目录挂载规则），用于拒绝访问。
 */
function isNetworkOrDevicePath(path) {
  let permissionScreenAnchor = getPermissionScreenAnchor();
  let anchorRoots = permissionScreenAnchor === null ? [] : networkMountRoots(permissionScreenAnchor);
  if (networkMountRoots(path).some((root) => !anchorRoots.includes(root))) return true;
  if (!(isUncOrNetworkSpelling(path) || classifyHomeMount(path))) return false;
  if (isNonWslUncPath(path))
    return permissionScreenAnchor === null || isForeignNetworkPath(path, permissionScreenAnchor);
  let pathHost = isNetworkMountRoot(path) ? networkMountHost(path) : null;
  let anchorHost = permissionScreenAnchor === null ? null : networkMountHost(permissionScreenAnchor);
  return pathHost === null || pathHost !== anchorHost;
}
//@ chunk-j8f885h1.js:134218-134344 placement
function checkGeneration(generation) {
  return generation === undefined || (isNonNegativeInt(generation) && Number.isSafeInteger(generation))
    ? undefined
    : "source.generation must be a whole number when given";
}
//@ chunk-j8f885h1.js:134344-134356 placement
/**
 * 3072
 */
var MAX_IMAGE_COLUMNS = 3072;
//@ chunk-j8f885h1.js:134356-134368 placement
/**
 * 4096
 */
var MAX_IMAGE_ROWS = 4096;
//@ chunk-j8f885h1.js:134368-134501 placement
function checkImageSize(width, height, limit) {
  return isNonNegativeInt(width) &&
    isNonNegativeInt(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= limit &&
    height <= limit
    ? undefined
    : `source width and height must be whole numbers from 1 to ${limit}`;
}
//@ chunk-j8f885h1.js:134501-135216 placement
/**
 * 校验图片 source.file：绝对路径、无控制字符、非网络/设备路径
 */
function checkImageFileSource(file, source) {
  let { format, width, height, generation } = source;
  if (typeof file !== "string" || file === "" || !isAbsolute(file))
    return "source.file must be an absolute path";
  if (hasControlCharacter(file) || /[\t\n\r]/.test(file)) return "source.file holds a control character";
  if (isNetworkOrDevicePath(file))
    return "source.file names a network location or device path, as spelled; the terminal would open it as the person ($.fs refuses it too)";
  if (Buffer.byteLength(file, "utf8") > MAX_IMAGE_COLUMNS)
    return `source.file is longer than ${MAX_IMAGE_COLUMNS} bytes`;
  if (format !== "png" && format !== "rgba" && format !== "rgb")
    return 'source.format must be "png", "rgba" or "rgb" beside file';
  let isPng = format === "png";
  if (isPng && (width !== undefined || height !== undefined))
    return 'source width and height go with format "rgba" or "rgb"; a png sizes itself';
  return (isPng ? undefined : checkImageSize(width, height, MAX_IMAGE_ROWS)) ?? checkGeneration(generation);
}
//@ chunk-j8f885h1.js:135216-135227 placement
/**
 * 255
 */
var MAX_CELL_COLUMNS = 255;
//@ chunk-j8f885h1.js:135227-135238 placement
/**
 * 255
 */
var MAX_CELL_ROWS = 255;
//@ chunk-j8f885h1.js:135238-135281 placement
/**
 * 校验图像单元格
 */
var checkImageCellSize = (columns, rows) =>
  checkCellSize(columns, rows, {
    columns: MAX_CELL_COLUMNS,
    rows: MAX_CELL_ROWS,
  });
//@ chunk-j8f885h1.js:135317-135378 placement
/**
 * file/shm 来源
 */
var isNamedImageSource = (source) => Object.hasOwn(source, "file") || Object.hasOwn(source, "shm");
//@ chunk-j8f885h1.js:135378-135426 placement
/**
 * 图像负载字节数
 */
var imagePayloadBytes = (entry) =>
  isNamedImageSource(entry) ? 0 : (base64DecodedLength(getImagePath(entry) ? entry.png : entry.rgba) ?? 0);
//@ chunk-j8f885h1.js:135426-135441 placement
/**
 * 2097152
 */
var MAX_IMAGE_BYTES = 2097152;
//@ chunk-j8f885h1.js:135441-135453 placement
/**
 * 4096
 */
var MAX_IMAGE_DIMENSION = 4096;
//@ chunk-j8f885h1.js:135453-135516 placement
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
//@ chunk-j8f885h1.js:135516-135550 placement
/**
 * PNG 魔数
 */
var PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
//@ chunk-j8f885h1.js:135550-136029 placement
function checkPngSource(base64) {
  let buffer = Buffer.from(
    base64.slice(
      0,
      Math.ceil(PNG_HEADER_LAYOUT.bytes / base64BytesPerFour.bytes) * base64BytesPerFour.characters,
    ),
    "base64",
  );
  if (!PNG_SIGNATURE.every((signatureByte, index) => buffer[index] === signatureByte))
    return "source.png does not start as a PNG file does";
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
//@ chunk-j8f885h1.js:136029-136205 placement
function checkPngBase64(base64) {
  let decodedLength = base64DecodedLength(base64);
  if (decodedLength === undefined || typeof base64 !== "string")
    return "source.png must be standard padded base64";
  return decodedLength > MAX_IMAGE_BYTES
    ? `source.png decodes to more than ${MAX_IMAGE_BYTES} bytes`
    : checkPngSource(base64);
}
//@ chunk-j8f885h1.js:136205-136217 placement
/**
 * 2048
 */
var MAX_RGBA_DIMENSION = 2048;
//@ chunk-j8f885h1.js:136217-136226 placement
/**
 * 4
 */
var RGBA_BYTES_PER_PIXEL = 4;
//@ chunk-j8f885h1.js:136226-136539 placement
/**
 * 校验 rgba 图片来源：base64 合法、尺寸与大小在上限内。
 */
function checkRgbaSource(text, width, height) {
  let decodedLength = base64DecodedLength(text);
  if (decodedLength === undefined) return "source.rgba must be standard padded base64";
  let sizeProblem = checkImageSize(width, height, MAX_RGBA_DIMENSION);
  if (sizeProblem !== undefined) return sizeProblem;
  if (decodedLength > MAX_IMAGE_BYTES) return `source.rgba decodes to more than ${MAX_IMAGE_BYTES} bytes`;
  let expectedBytes = Number(width) * Number(height) * RGBA_BYTES_PER_PIXEL;
  return decodedLength === expectedBytes
    ? undefined
    : `source.rgba decodes to ${decodedLength} bytes, not width * height * 4 (${expectedBytes})`;
}
//@ chunk-j8f885h1.js:136539-136586 placement
/**
 * /名字 格式
 */
var SHM_NAME_RE = /^\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,254}$/;
//@ chunk-j8f885h1.js:136586-136901 placement
/**
 * 校验 shm 图片来源：名字格式、像素格式、尺寸与代号。
 */
function checkShmSource(name, source) {
  let { format, width, height, generation } = source;
  if (typeof name !== "string" || !SHM_NAME_RE.test(name))
    return 'source.shm must be "/" then 1 to 254 of A-Z a-z 0-9 . _ - (not "." or ".." alone), a POSIX shared-memory name';
  return format === "rgba" || format === "rgb"
    ? (checkImageSize(width, height, MAX_IMAGE_ROWS) ?? checkGeneration(generation))
    : 'source.format must be "rgba" or "rgb" beside shm';
}
//@ chunk-j8f885h1.js:136901-137073 placement
var IMAGE_SOURCE_KINDS = [
  ["png", ["png"]],
  ["rgba", ["rgba", "width", "height"]],
  ["file", ["file", "format", "width", "height", "generation"]],
  ["shm", ["shm", "format", "width", "height", "generation"]],
];
//@ chunk-j8f885h1.js:137073-137664 placement
function checkImageSource(source) {
  let shapeText = "{ png }, { rgba, width, height }, { file, format } or { shm, format, width, height }";
  if (!isPlainObject(source)) return `source must be ${shapeText}`;
  let [firstKind, secondKind] = IMAGE_SOURCE_KINDS.filter(([kind]) => Object.hasOwn(source, kind));
  if (firstKind === undefined) return `source must be ${shapeText}`;
  let [kindName, allowedFields] = firstKind;
  if (secondKind !== undefined)
    return `source holds both "${kindName}" and "${secondKind[0]}"; it is one of ${shapeText}`;
  let fields = allowedFields;
  let found = Object.keys(source).find((key) => !fields.includes(key));
  if (found !== undefined) return `source field "${found}" is not allowed beside "${kindName}"`;
  switch (kindName) {
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
//@ chunk-j8f885h1.js:137664-137700 placement
/**
 * 是否 shm 来源
 */
var isShmSource = (source) => Object.hasOwn(source, "shm");
//@ chunk-j8f885h1.js:137700-138076 placement
/**
 * 把校验过的图片来源转换为渲染请求：png/rgba 带 base64，file/shm 带介质名与格式尺寸。
 */
function toImageRequest(entry) {
  if (getImagePath(entry))
    return {
      format: "png",
      base64: entry.png,
    };
  if (!isNamedImageSource(entry)) {
    let { rgba, width, height } = entry;
    return {
      format: "rgba",
      base64: rgba,
      width,
      height,
    };
  }
  let medium = Object.hasOwn(entry, "shm") ? "shm" : "file";
  let isShm = medium === "shm";
  let hasShm = "shm" in entry;
  let hasFile = "file" in entry;
  let name = isShm ? (hasShm ? entry.shm : "") : hasFile ? entry.file : "";
  return entry.format === "png"
    ? {
        medium,
        name,
        format: "png",
      }
    : {
        medium,
        name,
        format: entry.format,
        width: entry.width,
        height: entry.height,
      };
}
export {
  isNetworkOrDevicePath,
  checkImageSource,
  checkImageCellSize,
  imagePayloadBytes,
  isNamedImageSource,
  toImageRequest,
  isShmSource,
};
