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
var S = 300000;
/**
 * 为入站附件打开溢出文件并计算 sha256。
 */
//@ chunk-5wx09b4h.js:492-1274 placement
async function openSpill(a, e, i = 384) {
  let r = await readdir(a.at).catch(() => []);
  await Promise.all(
    r
      .filter((t) => isOwnTempName(t, basename(e)))
      .map(async (t) => {
        let o = join(a.at, t),
          d = await lstat(o).catch(() => {
            return;
          });
        if (d !== void 0 && d.mtimeMs < Date.now() - S) await rm(o, { force: !0 }).catch(() => {});
      }),
  );
  let n = join(a.at, basename(makeTempSiblingPath(e))),
    s = await open(n, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, 384).catch(
      async (t) => {
        throw (await a.release(), t);
      },
    ),
    m = createHash("sha256"),
    p = 0,
    f = !1;
  return {
    async write(t) {
      (m.update(t), (p += t.byteLength), await s.writeFile(t));
    },
    async finish() {
      if (i !== 384) await s.chmod(i);
      let { dev: dev, ino: ino } = await s.stat();
      return (
        await s.close(),
        (f = !0),
        {
          path: n,
          placeAt: join(a.at, basename(e)),
          target: e,
          size: p,
          sha256: m.digest("hex"),
          identity: `${dev}:${ino}`,
          release: a.release,
        }
      );
    },
    async discard() {
      if (!f)
        (await s.close().catch(() => {}), await rm(n, { force: !0 }).catch(() => {}), await a.release());
    },
  };
}
//@ chunk-5wx09b4h.js:1274-1615 placement
async function sha256OfFile(a, e) {
  let i = await openRegularFileForRead(a).catch(() => null);
  if (i === null) return null;
  try {
    let stats = await i.stat();
    if (!stats.isFile() || stats.size !== e) return null;
    let n = createHash("sha256");
    for await (let s of i.createReadStream({ autoClose: !1, end: e - 1, highWaterMark: 1048576 }))
      n.update(s);
    return n.digest("hex");
  } catch {
    return null;
  } finally {
    await i.close().catch(() => {});
  }
}

export { sha256OfFile, openSpill };
