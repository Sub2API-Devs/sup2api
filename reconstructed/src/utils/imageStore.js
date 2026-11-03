/**
 * utils/imageStore.ts
 *
 * 粘贴图片缓存 <配置目录>/image-cache/<sessionId>/，按会话清理旧缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/imageStore.ts
 * pieces: chunk-08s5p3av.js (10), chunk-23fm9f0d.js (2), chunk-4121qate.js (1), chunk-93kwxas0.js (1), chunk-p52gp8zk.js (1)
 * attribution: placement 9, fingerprint 6
 */
import { join } from "path";
import { readdir, open, unlink } from "fs/promises";
import { isDiskless, getSessionId } from "../bootstrap/state.js";
import { isTranscriptPersistenceDisabled } from "./sessionStorage.js";
import { sessionTempDirRealpath } from "./tempDirRealpaths.js";
import { IMAGES, IMAGE_FILE_NAME_RE } from "./cleanup.js";
import { logForDebugging } from "./debug.js";
import { isFsInaccessible, getErrnoCode } from "./errors.js";
import { detectImageFormatFromBase64 } from "./imageResizer.js";
import { MIME_TO_EXTENSION } from "./imageFormats.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";
import { makeTempSiblingPath, retryFsOp } from "./atomicPublishWrite.js";
import { getFsImplementation } from "./fsOperations.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { mintPasteId, formatImageRef } from "../history.js";
import { PasteEvent } from "../ink/frame.js";
import { EVENT_RECORD_LIMITS } from "./telemetry/thirdPartyEventRecords.js";

//@ chunk-08s5p3av.js:4411-4428 placement
var MAX_CACHED_IMAGES = 200;
var BASE64_SNIFF_CHARS = 64;
//@ chunk-08s5p3av.js:4428-4566 placement
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
//@ chunk-08s5p3av.js:4566-4599 placement
/**
 * 判断图片缓存目录是否可用。
 */
function isImageStoreAvailable() {
  return getImageStoreDir() !== null;
}
//@ chunk-08s5p3av.js:4599-4858 placement
/**
 * 扫描图片缓存目录，返回已保存图片的最大编号。
 */
async function getMaxStoredImageId() {
  let imageStoreDir = getImageStoreDir();
  if (imageStoreDir === null) return 0;
  let r;
  try {
    r = await readdir(imageStoreDir);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`Could not list stored images: ${error}`, {
        level: "warn",
      });
    return 0;
  }
  let o = 0;
  for (let n of r) {
    let s = Number(IMAGE_FILE_NAME_RE.exec(n)?.[1]);
    if (Number.isSafeInteger(s) && s > o) o = s;
  }
  return o;
}
//@ chunk-08s5p3av.js:4858-5069 placement
function storedImagePath(e) {
  if (!Number.isSafeInteger(e.id) || e.id < 0 || typeof e.content !== "string" || e.content === "")
    return null;
  let imageStoreDir = getImageStoreDir();
  if (imageStoreDir === null) return null;
  let o = detectImageFormatFromBase64(e.content.slice(0, BASE64_SNIFF_CHARS));
  return join(imageStoreDir, `${e.id}.${MIME_TO_EXTENSION[o]}`);
}
//@ chunk-08s5p3av.js:5069-5172 placement = _temp (1)
/**
 * 为图片内容计算缓存路径并记录到粘贴内容中。
 */
function recordImagePath(newContent, r) {
  if (newContent.type !== "image") return null;
  let o = storedImagePath(newContent);
  if (o !== null) r((n) => mapSetBounded(n, newContent.id, o));
  return o;
}
//@ chunk-08s5p3av.js:5172-5248 placement
/**
 * 保存图片并把缓存路径记录回粘贴内容。
 */
async function storeImageAndRecord(newContent, r) {
  let o = await storeImage(newContent);
  if (o) r((n) => mapSetBounded(n, newContent.id, o));
  return o;
}
//@ chunk-08s5p3av.js:5248-5458 placement = _temp (1)
/**
 * 保存粘贴内容中的所有图片，并把缓存路径记录回粘贴内容。
 */
async function storePastedImages(e, r) {
  let o = new Map();
  for (let [key, value] of Object.entries(e))
    if (value.type === "image") {
      let u = await storeImage(value);
      if (u) o.set(Number(key), u);
    }
  if (o.size > 0)
    r((n) => {
      let s = n;
      for (let [u, d] of o) s = mapSetBounded(s, u, d);
      return s;
    });
  return o;
}
//@ chunk-08s5p3av.js:5458-6143 fingerprint = storeImage (0.689)
/**
 * 把粘贴的图片存入 image-cache/<sessionId>/，返回路径。
 */
async function storeImage(content) {
  if (content.type !== "image") return null;
  try {
    let r = storedImagePath(content);
    if (r === null) return null;
    let o = await pinWriteTarget(r, [r], {
      createParents: true,
      leaf: "replace",
    });
    let tempSiblingPath = makeTempSiblingPath(o.ioPath);
    let s = false;
    try {
      let u = await open(tempSiblingPath, "wx", 384);
      s = true;
      try {
        await u.writeFile(content.content, {
          encoding: "base64",
        });
        await u.datasync();
      } finally {
        await u.close();
      }
      await o.recheckBeforeWrite();
      try {
        await retryFsOp(tempSiblingPath, o.ioPath);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        await o.recheckBeforeWrite();
        await unlink(o.ioPath).catch(() => {});
        await o.recheckBeforeWrite();
        await retryFsOp(tempSiblingPath, o.ioPath);
      }
      s = false;
    } finally {
      if (s)
        try {
          await o.recheckBeforeWrite();
          await unlink(tempSiblingPath);
        } catch {}
      await o.close();
    }
    logForDebugging(`Stored image ${content.id} to ${r}`);
    return r;
  } catch (error) {
    logForDebugging(`Failed to store image: ${error}`);
    return null;
  }
}
//@ chunk-08s5p3av.js:6143-6314 placement
function mapSetBounded(e, id, o) {
  if (e.get(id) === o) return e;
  let n = new Map(e);
  if (!n.has(id))
    while (n.size >= MAX_CACHED_IMAGES) {
      let s = n.keys().next().value;
      if (s === undefined) break;
      n.delete(s);
    }
  n.set(id, o);
  return n;
}
//@ chunk-23fm9f0d.js:2810-2831 fingerprint = IMAGE_STORE_DIR (1)
var IMAGE_STORE_DIR = "image-cache";
//@ chunk-23fm9f0d.js:2831-3149 fingerprint = cleanupOldImageCaches (0.943)
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
//@ chunk-4121qate.js:154104-154140 fingerprint = getImagePath (1)
var getImagePath = (e) => Object.hasOwn(e, "png");
//@ chunk-93kwxas0.js:45837-46084 fingerprint = cacheImagePath (0.654)
function cacheImagePath(h, handlePaste, { onMinted: k } = {}) {
  return (content, x) => {
    let T = h();
    let imagePath = mintPasteId(undefined, T);
    k?.(imagePath);
    T[imagePath] = {
      id: imagePath,
      type: "image",
      content,
      mediaType: x?.mediaType ?? "image/png",
      filename: x?.filename,
      dimensions: x?.dimensions,
      sourcePath: x?.sourcePath,
    };
    handlePaste(new PasteEvent(`${formatImageRef(imagePath)} `));
  };
}
//@ chunk-p52gp8zk.js:9282-9407 fingerprint = evictOldestIfAtCap (0.629)
function evictOldestIfAtCap(e, n, o) {
  let r = o;
  while (r > EVENT_RECORD_LIMITS && n.size > 0) {
    let oldest = n.values().next().value;
    n.delete(oldest);
    r -= oldest.length;
    e.dropped = true;
  }
  return r;
}
export {
  getMaxStoredImageId,
  recordImagePath,
  storeImageAndRecord,
  cleanupOldImageCaches,
  isImageStoreAvailable,
  storePastedImages,
  getImagePath,
  cacheImagePath,
  evictOldestIfAtCap,
};
