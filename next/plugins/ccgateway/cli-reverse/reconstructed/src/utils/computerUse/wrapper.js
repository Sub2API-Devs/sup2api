/**
 * utils/computerUse/wrapper.tsx
 *
 * （匹配存疑）最小 reducer 容器 {state, dispatch}。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/wrapper.tsx
 * pieces: chunk-nw81sbzb.js (1)
 * attribution: fingerprint 1
 */
import { parseWebpHeader, jpegSofComponentCount, buffer } from "../imageFormats.js";
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import {
  MAX_IMAGE_COPY_BYTES,
  MAX_IMAGE_SIDE_PX,
  imageTileCount,
  IMAGE_TILE_SIZE_PX,
  weakSet_2,
} from "../mediaLimits.js";
import { fitImageDimensions } from "../imageResizer.js";

//@ chunk-nw81sbzb.js:18340-19052 fingerprint (2.1.88 match: getComputerUseMCPToolOverrides, 0.373)
function getComputerUseMCPToolOverrides(bytes, fileBytes, limits, statedLength) {
  if (bytes.length === fileBytes.length) return "copy_is_original";
  let webpHeader = parseWebpHeader(bytes);
  let scale = jpegSofComponentCount(bytes);
  let webpHeader_2 = parseWebpHeader(fileBytes);
  if (sniffImageMediaType(bytes) !== "image/jpeg") return "copy_unusable";
  if (
    (statedLength !== undefined && statedLength !== bytes.length) ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    return "copy_cut_short";
  if (
    bytes.length > MAX_IMAGE_COPY_BYTES ||
    !buffer(bytes) ||
    (scale !== 1 && scale !== 3) ||
    webpHeader === undefined ||
    webpHeader.width > Math.min(limits.maxWidth, MAX_IMAGE_SIDE_PX) ||
    webpHeader.height > Math.min(limits.maxHeight, MAX_IMAGE_SIDE_PX) ||
    (limits.maxImageTokens !== undefined &&
      imageTileCount(webpHeader.width, webpHeader.height) > limits.maxImageTokens) ||
    webpHeader_2 === undefined
  )
    return "copy_unusable";
  let width = fitImageDimensions(webpHeader_2.width, webpHeader_2.height, limits);
  if (
    Math.max(webpHeader.width, webpHeader.height) < Math.max(...width) - IMAGE_TILE_SIZE_PX ||
    Math.min(webpHeader.width, webpHeader.height) < Math.min(...width) - IMAGE_TILE_SIZE_PX
  )
    return "copy_too_small";
  let block = {
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: bytes.toString("base64"),
    },
  };
  weakSet_2.add(block);
  return block;
}
export { getComputerUseMCPToolOverrides };
