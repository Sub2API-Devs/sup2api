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
import { join, join as join_2, join as join_3 } from "path";
import { readdir, readdir as readdir_2, open, unlink } from "fs/promises";
import { isDiskless, getSessionId } from "../bootstrap/state.js";
import { isTranscriptPersistenceDisabled } from "./sessionStorage.js";
import { Sx } from "./tempDirRealpaths.js";
import { IMAGES, nMo } from "./cleanup.js";
import { logForDebugging } from "./debug.js";
import { isFsInaccessible, getErrnoCode } from "./errors.js";
import { detectImageFormatFromBase64 } from "./imageResizer.js";
import { sir } from "./imageFormats.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";
import { makeTempSiblingPath, retryFsOp } from "./atomicPublishWrite.js";
import { getFsImplementation } from "./fsOperations.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { ZR, formatImageRef } from "../history.js";
import { PasteEvent } from "../ink/frame.js";
import { EVENT_RECORD_LIMITS } from "./telemetry/thirdPartyEventRecords.js";

//@ chunk-08s5p3av.js:4411-4428 placement
var Pe = 200,
  be = 64;
//@ chunk-08s5p3av.js:4428-4566 placement
function getImageStoreDir() {
  if (isDiskless() || isTranscriptPersistenceDisabled()) return null;
  try {
    return join_2(Sx(), getSessionId(), IMAGES);
  } catch (error) {
    return (logForDebugging(`Image store unavailable: ${error}`, { level: "warn" }), null);
  }
}
//@ chunk-08s5p3av.js:4566-4599 placement
function sDs() {
  return getImageStoreDir() !== null;
}
/**
 * 扫描图片缓存目录，返回已保存图片的最大编号。
 */
//@ chunk-08s5p3av.js:4599-4858 placement
async function getMaxStoredImageId() {
  let e = getImageStoreDir();
  if (e === null) return 0;
  let r;
  try {
    r = await readdir_2(e);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(`Could not list stored images: ${error}`, { level: "warn" });
    return 0;
  }
  let o = 0;
  for (let n of r) {
    let s = Number(nMo.exec(n)?.[1]);
    if (Number.isSafeInteger(s) && s > o) o = s;
  }
  return o;
}
//@ chunk-08s5p3av.js:4858-5069 placement
function storedImagePath(e) {
  if (!Number.isSafeInteger(e.id) || e.id < 0 || typeof e.content !== "string" || e.content === "")
    return null;
  let r = getImageStoreDir();
  if (r === null) return null;
  let o = detectImageFormatFromBase64(e.content.slice(0, be));
  return join_2(r, `${e.id}.${sir[o]}`);
}
/**
 * 为图片内容计算缓存路径并记录到粘贴内容中。
 */
//@ chunk-08s5p3av.js:5069-5172 placement = _temp (1)
function recordImagePath(e, r) {
  if (e.type !== "image") return null;
  let o = storedImagePath(e);
  if (o !== null) r((n) => mapSetBounded(n, e.id, o));
  return o;
}
//@ chunk-08s5p3av.js:5172-5248 placement
async function cLe(e, r) {
  let o = await storeImage(e);
  if (o) r((n) => mapSetBounded(n, e.id, o));
  return o;
}
/**
 * 保存粘贴内容中的所有图片，并把缓存路径记录回粘贴内容。
 */
//@ chunk-08s5p3av.js:5248-5458 placement = _temp (1)
async function storePastedImages(e, r) {
  let o = new Map();
  for (let [n, s] of Object.entries(e))
    if (s.type === "image") {
      let u = await storeImage(s);
      if (u) o.set(Number(n), u);
    }
  if (o.size > 0)
    r((n) => {
      let s = n;
      for (let [u, d] of o) s = mapSetBounded(s, u, d);
      return s;
    });
  return o;
}
/**
 * 把粘贴的图片存入 image-cache/<sessionId>/，返回路径。
 */
//@ chunk-08s5p3av.js:5458-6143 fingerprint = storeImage (0.689)
async function storeImage(content) {
  if (content.type !== "image") return null;
  try {
    let r = storedImagePath(content);
    if (r === null) return null;
    let o = await pinWriteTarget(r, [r], { createParents: !0, leaf: "replace" }),
      n = makeTempSiblingPath(o.ioPath),
      s = !1;
    try {
      let u = await open(n, "wx", 384);
      s = !0;
      try {
        (await u.writeFile(content.content, { encoding: "base64" }), await u.datasync());
      } finally {
        await u.close();
      }
      await o.recheckBeforeWrite();
      try {
        await retryFsOp(n, o.ioPath);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        (await o.recheckBeforeWrite(),
          await unlink(o.ioPath).catch(() => {}),
          await o.recheckBeforeWrite(),
          await retryFsOp(n, o.ioPath));
      }
      s = !1;
    } finally {
      if (s)
        try {
          (await o.recheckBeforeWrite(), await unlink(n));
        } catch {}
      await o.close();
    }
    return (logForDebugging(`Stored image ${content.id} to ${r}`), r);
  } catch (error) {
    return (logForDebugging(`Failed to store image: ${error}`), null);
  }
}
//@ chunk-08s5p3av.js:6143-6314 placement
function mapSetBounded(e, r, o) {
  if (e.get(r) === o) return e;
  let n = new Map(e);
  if (!n.has(r))
    while (n.size >= Pe) {
      let s = n.keys().next().value;
      if (s === void 0) break;
      n.delete(s);
    }
  return (n.set(r, o), n);
}
//@ chunk-23fm9f0d.js:2810-2831 fingerprint = IMAGE_STORE_DIR (1)
var IMAGE_STORE_DIR = "image-cache";
/**
 * 清理 image-cache 下其他会话的旧图片缓存目录。
 */
//@ chunk-23fm9f0d.js:2831-3149 fingerprint = cleanupOldImageCaches (0.943)
async function cleanupOldImageCaches() {
  let fsImpl = getFsImplementation(),
    baseDir = join_3(getClaudeConfigDir(), IMAGE_STORE_DIR),
    currentSessionId = getSessionId();
  try {
    let sessionDirs;
    try {
      sessionDirs = await fsImpl.readdir(baseDir);
    } catch {
      return;
    }
    for (let sessionDir of sessionDirs) {
      if (sessionDir.name === currentSessionId) continue;
      let sessionPath = join_3(baseDir, sessionDir.name);
      try {
        (await fsImpl.rm(sessionPath, { recursive: !0, force: !0 }),
          logForDebugging(`Cleaned up old image cache: ${sessionPath}`));
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
function cacheImagePath(h, E, { onMinted: k } = {}) {
  return (C, x) => {
    let T = h(),
      imagePath = ZR(void 0, T);
    (k?.(imagePath),
      (T[imagePath] = {
        id: imagePath,
        type: "image",
        content: C,
        mediaType: x?.mediaType ?? "image/png",
        filename: x?.filename,
        dimensions: x?.dimensions,
        sourcePath: x?.sourcePath,
      }),
      E(new PasteEvent(`${formatImageRef(imagePath)} `)));
  };
}
//@ chunk-p52gp8zk.js:9282-9407 fingerprint = evictOldestIfAtCap (0.629)
function evictOldestIfAtCap(e, n, o) {
  let r = o;
  while (r > EVENT_RECORD_LIMITS && n.size > 0) {
    let oldest = n.values().next().value;
    (n.delete(oldest), (r -= oldest.length), (e.dropped = !0));
  }
  return r;
}

export {
  getMaxStoredImageId,
  recordImagePath,
  cLe,
  cleanupOldImageCaches,
  sDs,
  storePastedImages,
  getImagePath,
  cacheImagePath,
  evictOldestIfAtCap,
};
