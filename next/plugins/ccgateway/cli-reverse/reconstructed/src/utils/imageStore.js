/**
 * utils/imageStore.ts
 *
 * 粘贴图片缓存 <配置目录>/image-cache/<sessionId>/，按会话清理旧缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/imageStore.ts
 * pieces: chunk-2snqx25v.js (10), chunk-avy0g5d4.js (1), chunk-j8f885h1.js (1), chunk-pc3x100t.js (2), chunk-s584m62r.js (1)
 * attribution: placement 9, fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { readdir, open, unlink } from "fs/promises";
import { EVENT_RECORD_LIMITS } from "./telemetry/thirdPartyEventRecords.js";
import { getFsImplementation } from "./fsOperations.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { isTranscriptPersistenceDisabled } from "./sessionStorage.js";
import { sessionTempDirRealpath } from "./tempDirRealpaths.js";
import { IMAGES, IMAGE_FILE_NAME_RE } from "./cleanup.js";
import { isFsInaccessible, getErrnoCode } from "./errors.js";
import { detectImageFormatFromBase64 } from "./imageResizer.js";
import { MIME_TO_EXTENSION } from "./imageFormats.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";
import { makeTempSiblingPath, retryFsOp } from "./atomicPublishWrite.js";
import { mintPasteId, formatImageRef } from "../history.js";
import { PasteEvent } from "../ink/frame.js";

//@ chunk-s584m62r.js:1102-1225 fingerprint (2.1.88 match: evictOldestIfAtCap, 0.63)
function evictOldestIfAtCap(frame, records, totalBytes) {
  let remaining = totalBytes;
  while (remaining > EVENT_RECORD_LIMITS && records.size > 0) {
    let oldest = records.values().next().value;
    records.delete(oldest);
    remaining -= oldest.length;
    frame.dropped = true;
  }
  return remaining;
}
//@ chunk-j8f885h1.js:135281-135317 fingerprint (2.1.88 match: getImagePath, 1)
var getImagePath = (entry) => Object.hasOwn(entry, "png");
//@ chunk-pc3x100t.js:2818-2839 fingerprint (2.1.88 match: IMAGE_STORE_DIR, 1)
var IMAGE_STORE_DIR = "image-cache";
//@ chunk-pc3x100t.js:2839-3157 fingerprint (2.1.88 match: cleanupOldImageCaches, 0.942)
/**
 * 清理 image-cache 下其他会话的旧图片缓存目录。
 */
async function cleanupOldImageCaches() {
  let fsImpl = getFsImplementation();
  let baseDir = join(getClaudeConfigDir(), IMAGE_STORE_DIR);
  let currentSessionId = getSessionId();
  try {
    let sessionDirs;
    try {
      sessionDirs = await fsImpl.readdir(baseDir);
    } catch {
      return;
    }
    for (let sessionDir of sessionDirs) {
      if (sessionDir.name === currentSessionId) continue;
      let sessionPath = join(baseDir, sessionDir.name);
      try {
        await fsImpl.rm(sessionPath, {
          recursive: true,
          force: true,
        });
        logForDebugging(`Cleaned up old image cache: ${sessionPath}`);
      } catch {}
    }
    try {
      if ((await fsImpl.lstat(baseDir)).isDirectory()) await fsImpl.rmdir(baseDir);
    } catch {}
  } catch {}
}
//@ chunk-2snqx25v.js:4478-4495 placement
var MAX_CACHED_IMAGES = 200;
var BASE64_SNIFF_CHARS = 64;
//@ chunk-2snqx25v.js:4495-4633 placement
function getImageStoreDir() {
  if (isDiskless() || isTranscriptPersistenceDisabled()) return null;
  try {
    return join(sessionTempDirRealpath(), getSessionId(), IMAGES);
  } catch (error) {
    logForDebugging(`Image store unavailable: ${error}`, {
      level: "warn",
    });
    return null;
  }
}
//@ chunk-2snqx25v.js:4633-4666 placement
/**
 * 判断图片缓存目录是否可用。
 */
function isImageStoreAvailable() {
  return getImageStoreDir() !== null;
}
//@ chunk-2snqx25v.js:4666-4925 placement
/**
 * 扫描图片缓存目录，返回已保存图片的最大编号。
 */
async function getMaxStoredImageId() {
  let imageStoreDir = getImageStoreDir();
  if (imageStoreDir === null) return 0;
  let fileNames;
  try {
    fileNames = await readdir(imageStoreDir);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`Could not list stored images: ${error}`, {
        level: "warn",
      });
    return 0;
  }
  let maxId = 0;
  for (let fileName of fileNames) {
    let id = Number(IMAGE_FILE_NAME_RE.exec(fileName)?.[1]);
    if (Number.isSafeInteger(id) && id > maxId) maxId = id;
  }
  return maxId;
}
//@ chunk-2snqx25v.js:4925-5136 placement
function storedImagePath(content) {
  if (
    !Number.isSafeInteger(content.id) ||
    content.id < 0 ||
    typeof content.content !== "string" ||
    content.content === ""
  )
    return null;
  let imageStoreDir = getImageStoreDir();
  if (imageStoreDir === null) return null;
  let mediaType = detectImageFormatFromBase64(content.content.slice(0, BASE64_SNIFF_CHARS));
  return join(imageStoreDir, `${content.id}.${MIME_TO_EXTENSION[mediaType]}`);
}
//@ chunk-2snqx25v.js:5136-5239 placement (2.1.88 match: _temp, 1)
/**
 * 为图片内容计算缓存路径并记录到粘贴内容中。
 */
function recordImagePath(content, record) {
  if (content.type !== "image") return null;
  let imagePath = storedImagePath(content);
  if (imagePath !== null) record((pathsById) => mapSetBounded(pathsById, content.id, imagePath));
  return imagePath;
}
//@ chunk-2snqx25v.js:5239-5315 placement
/**
 * 保存图片并把缓存路径记录回粘贴内容。
 */
async function storeImageAndRecord(content, record) {
  let imagePath = await storeImage(content);
  if (imagePath) record((pathsById) => mapSetBounded(pathsById, content.id, imagePath));
  return imagePath;
}
//@ chunk-2snqx25v.js:5315-5525 placement (2.1.88 match: _temp, 1)
/**
 * 保存粘贴内容中的所有图片，并把缓存路径记录回粘贴内容。
 */
async function storePastedImages(pasteContents, record) {
  let storedById = new Map();
  for (let [key, value] of Object.entries(pasteContents))
    if (value.type === "image") {
      let imagePath = await storeImage(value);
      if (imagePath) storedById.set(Number(key), imagePath);
    }
  if (storedById.size > 0)
    record((pathsById) => {
      let next = pathsById;
      for (let [id, imagePath] of storedById) next = mapSetBounded(next, id, imagePath);
      return next;
    });
  return storedById;
}
//@ chunk-2snqx25v.js:5525-6210 fingerprint (2.1.88 match: storeImage, 0.689)
/**
 * 把粘贴的图片存入 image-cache/<sessionId>/，返回路径。
 */
async function storeImage(content) {
  if (content.type !== "image") return null;
  try {
    let imagePath = storedImagePath(content);
    if (imagePath === null) return null;
    let target = await pinWriteTarget(imagePath, [imagePath], {
      createParents: true,
      leaf: "replace",
    });
    let tempSiblingPath = makeTempSiblingPath(target.ioPath);
    let tempLeft = false;
    try {
      let handle = await open(tempSiblingPath, "wx", 384);
      tempLeft = true;
      try {
        await handle.writeFile(content.content, {
          encoding: "base64",
        });
        await handle.datasync();
      } finally {
        await handle.close();
      }
      await target.recheckBeforeWrite();
      try {
        await retryFsOp(tempSiblingPath, target.ioPath);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        await target.recheckBeforeWrite();
        await unlink(target.ioPath).catch(() => {});
        await target.recheckBeforeWrite();
        await retryFsOp(tempSiblingPath, target.ioPath);
      }
      tempLeft = false;
    } finally {
      if (tempLeft)
        try {
          await target.recheckBeforeWrite();
          await unlink(tempSiblingPath);
        } catch {}
      await target.close();
    }
    logForDebugging(`Stored image ${content.id} to ${imagePath}`);
    return imagePath;
  } catch (error) {
    logForDebugging(`Failed to store image: ${error}`);
    return null;
  }
}
//@ chunk-2snqx25v.js:6210-6381 placement
function mapSetBounded(pathsById, id, path) {
  if (pathsById.get(id) === path) return pathsById;
  let next = new Map(pathsById);
  if (!next.has(id))
    while (next.size >= MAX_CACHED_IMAGES) {
      let oldestKey = next.keys().next().value;
      if (oldestKey === undefined) break;
      next.delete(oldestKey);
    }
  next.set(id, path);
  return next;
}
//@ chunk-avy0g5d4.js:45890-46137 fingerprint (2.1.88 match: cacheImagePath, 0.652)
function cacheImagePath(getPastedContents, handlePaste, { onMinted } = {}) {
  return (content, options) => {
    let pastedContents = getPastedContents();
    let imagePath = mintPasteId(undefined, pastedContents);
    onMinted?.(imagePath);
    pastedContents[imagePath] = {
      id: imagePath,
      type: "image",
      content,
      mediaType: options?.mediaType ?? "image/png",
      filename: options?.filename,
      dimensions: options?.dimensions,
      sourcePath: options?.sourcePath,
    };
    handlePaste(new PasteEvent(`${formatImageRef(imagePath)} `));
  };
}
export {
  getMaxStoredImageId,
  cleanupOldImageCaches,
  evictOldestIfAtCap,
  cacheImagePath,
  recordImagePath,
  storeImageAndRecord,
  isImageStoreAvailable,
  storePastedImages,
  getImagePath,
};
