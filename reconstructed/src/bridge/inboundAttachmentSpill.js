/**
 * bridge/inboundAttachmentSpill.ts
 *
 * 2.1.316 新增。为入站附件打开溢出文件并计算 sha256。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5wx09b4h.js (3)
 * attribution: placement 3
 */
import { readdir, lstat, rm, open } from "fs/promises";
import { basename, join } from "path";
import { constants } from "fs";
import { createHash } from "crypto";
import { isOwnTempName, makeTempSiblingPath } from "../utils/atomicPublishWrite.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { openRegularFileForRead } from "../utils/fsSafety/boundOpen.js";

//@ chunk-5wx09b4h.js:479-492 placement
var SPILL_FILE_MAX_AGE_MS = 300000;
//@ chunk-5wx09b4h.js:492-1274 placement
/**
 * 为入站附件打开溢出文件并计算 sha256。
 */
async function openSpill(attachmentsDir, e, i = 384) {
  let r = await readdir(attachmentsDir.at).catch(() => []);
  await Promise.all(
    r
      .filter((t) => isOwnTempName(t, basename(e)))
      .map(async (t) => {
        let o = join(attachmentsDir.at, t);
        let d = await lstat(o).catch(() => {
          return;
        });
        if (d !== undefined && d.mtimeMs < Date.now() - SPILL_FILE_MAX_AGE_MS)
          await rm(o, {
            force: true,
          }).catch(() => {});
      }),
  );
  let n = join(attachmentsDir.at, basename(makeTempSiblingPath(e)));
  let s = await open(n, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384).catch(
    async (error) => {
      await attachmentsDir.release();
      throw error;
    },
  );
  let hash = createHash("sha256");
  let size = 0;
  let f = false;
  return {
    async write(t) {
      hash.update(t);
      size += t.byteLength;
      await s.writeFile(t);
    },
    async finish() {
      if (i !== 384) await s.chmod(i);
      let { dev, ino } = await s.stat();
      await s.close();
      f = true;
      return {
        path: n,
        placeAt: join(attachmentsDir.at, basename(e)),
        target: e,
        size,
        sha256: hash.digest("hex"),
        identity: `${dev}:${ino}`,
        release: attachmentsDir.release,
      };
    },
    async discard() {
      if (!f) {
        await s.close().catch(() => {});
        await rm(n, {
          force: true,
        }).catch(() => {});
        await attachmentsDir.release();
      }
    },
  };
}
//@ chunk-5wx09b4h.js:1274-1615 placement
async function sha256OfFile(path, e) {
  let i = await openRegularFileForRead(path).catch(() => null);
  if (i === null) return null;
  try {
    let stats = await i.stat();
    if (!stats.isFile() || stats.size !== e) return null;
    let hash = createHash("sha256");
    for await (let s of i.createReadStream({
      autoClose: false,
      end: e - 1,
      highWaterMark: 1048576,
    }))
      hash.update(s);
    return hash.digest("hex");
  } catch {
    return null;
  } finally {
    await i.close().catch(() => {});
  }
}
export { sha256OfFile, openSpill };
