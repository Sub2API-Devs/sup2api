/**
 * bridge/inboundAttachmentSpill.ts
 *
 * 2.1.316 新增。为入站附件打开溢出文件并计算 sha256。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pkyq3nqg.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir, lstat, rm, open } from "fs/promises";
import { basename, join } from "path";
import { constants } from "fs";
import { createHash } from "crypto";
import { isOwnTempName, makeTempSiblingPath } from "../utils/atomicPublishWrite.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { openRegularFileForRead } from "../utils/fsSafety/boundOpen.js";

//@ chunk-pkyq3nqg.js:446-459 placement
var SPILL_FILE_MAX_AGE_MS = 300000;
//@ chunk-pkyq3nqg.js:459-1241 placement
/**
 * 为入站附件打开溢出文件并计算 sha256。
 */
async function openSpill(attachmentsDir, targetPath, mode = 384) {
  let entries = await readdir(attachmentsDir.at).catch(() => []);
  await Promise.all(
    entries
      .filter((name) => isOwnTempName(name, basename(targetPath)))
      .map(async (name) => {
        let path = join(attachmentsDir.at, name);
        let stat = await lstat(path).catch(() => {
          return;
        });
        if (stat !== undefined && stat.mtimeMs < Date.now() - SPILL_FILE_MAX_AGE_MS)
          await rm(path, {
            force: true,
          }).catch(() => {});
      }),
  );
  let tempPath = join(attachmentsDir.at, basename(makeTempSiblingPath(targetPath)));
  let handle = await open(
    tempPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
    384,
  ).catch(async (error) => {
    await attachmentsDir.release();
    throw error;
  });
  let hash = createHash("sha256");
  let size = 0;
  let closed = false;
  return {
    async write(chunk) {
      hash.update(chunk);
      size += chunk.byteLength;
      await handle.writeFile(chunk);
    },
    async finish() {
      if (mode !== 384) await handle.chmod(mode);
      let { dev, ino } = await handle.stat();
      await handle.close();
      closed = true;
      return {
        path: tempPath,
        placeAt: join(attachmentsDir.at, basename(targetPath)),
        target: targetPath,
        size,
        sha256: hash.digest("hex"),
        identity: `${dev}:${ino}`,
        release: attachmentsDir.release,
      };
    },
    async discard() {
      if (!closed) {
        await handle.close().catch(() => {});
        await rm(tempPath, {
          force: true,
        }).catch(() => {});
        await attachmentsDir.release();
      }
    },
  };
}
//@ chunk-pkyq3nqg.js:1241-1628 placement
async function sha256OfFile(path, expectedSize, identity) {
  let handle = await openRegularFileForRead(path).catch(() => null);
  if (handle === null) return null;
  try {
    let stats = await handle.stat();
    if (
      !stats.isFile() ||
      stats.size !== expectedSize ||
      (identity !== undefined && (stats.dev !== identity.dev || stats.ino !== identity.ino))
    )
      return null;
    let hash = createHash("sha256");
    for await (let chunk of handle.createReadStream({
      autoClose: false,
      end: expectedSize - 1,
      highWaterMark: 1048576,
    }))
      hash.update(chunk);
    return hash.digest("hex");
  } catch {
    return null;
  } finally {
    await handle.close().catch(() => {});
  }
}
export { sha256OfFile, openSpill };
