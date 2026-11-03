/**
 * services/remoteTools/unattendedRunGrant.ts
 *
 * 2.1.316 新增。记录无人值守运行授权文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-karvvxmx.js (8)
 * attribution: placement 8
 */
import { join, dirname } from "path";
import { homedir } from "os";
import { randomBytes, timingSafeEqual } from "crypto";
import { mkdir, unlink, open, readdir } from "fs/promises";
import { unlinkSync } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { ownProcStartAsync, getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";

//@ chunk-karvvxmx.js:720-860 placement
var RUN_GRANT_NAME_PATTERN = /^([1-9][0-9]{0,9})\.([0-9a-f]{64})$/,
  MAX_RUN_GRANT_BYTES = 4096,
  RUN_GRANT_SCHEMA = DoctorLazy(() =>
    u({ version: T(1), pid: E().int().positive(), procStart: o().min(1), nonceSha256: o() }),
  );
//@ chunk-karvvxmx.js:860-931 placement
function l() {
  return join(homedir(), ".claude", "state", "unattended-serving-runs");
}
//@ chunk-karvvxmx.js:931-971 placement
function a(n) {
  return join(l(), `${n}.json`);
}
/**
 * 记录无人值守运行授权文件。
 */
//@ chunk-karvvxmx.js:971-1414 placement
async function writeUnattendedRunGrant() {
  try {
    let n = await ownProcStartAsync();
    if (n === void 0) return;
    let str = randomBytes(32).toString("hex"),
      r = a(process.pid);
    return (
      await mkdir(dirname(r), { recursive: !0, mode: 448 }),
      await writeFileAtomic(
        r,
        `${jsonStringify({ version: 1, pid: process.pid, procStart: n, nonceSha256: computeContentHash(str) })}
`,
        384,
      ),
      await sweepStaleRunGrants(),
      process.once("exit", () => {
        try {
          unlinkSync(r);
        } catch {}
      }),
      {
        token: `${process.pid}.${str}`,
        remove: async () => {
          try {
            await unlink(r);
          } catch {}
        },
      }
    );
  } catch (error) {
    logForDebugging(`unattended run grant: not recorded (${errorMessage(error)})`, { level: "warn" });
    return;
  }
}
//@ chunk-karvvxmx.js:1414-1656 placement
async function unattendedRunGrantStands(n) {
  try {
    let e = n === void 0 ? null : RUN_GRANT_NAME_PATTERN.exec(n);
    if (!e) return !1;
    let r = Number(e[1]),
      i = await readRunGrant(a(r));
    if (i === void 0 || i.pid !== r || !j(i.nonceSha256, computeContentHash(e[2])) || !isProcessRunning(r))
      return !1;
    return (await getProcessStartTimeAsync(r, { skipCache: !0 })) === i.procStart;
  } catch {
    return !1;
  }
}
/**
 * 读运行授权文件
 */
//@ chunk-karvvxmx.js:1656-1926 placement
async function readRunGrant(n) {
  let e;
  try {
    e = await open(n, "r");
    let alloc = Buffer.alloc(MAX_RUN_GRANT_BYTES + 1),
      { bytesRead: bytesRead } = await e.read(alloc, 0, alloc.length, 0);
    if (bytesRead > MAX_RUN_GRANT_BYTES) return;
    let safeParse = RUN_GRANT_SCHEMA().safeParse(jsonParse(alloc.subarray(0, bytesRead).toString("utf8")));
    return safeParse.success ? safeParse.data : void 0;
  } catch {
    return;
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-karvvxmx.js:1926-2015 placement
function j(n, e) {
  let buffer = Buffer.from(n),
    buffer_2 = Buffer.from(e);
  return buffer.length === buffer_2.length && timingSafeEqual(buffer, buffer_2);
}
/**
 * 清理已结束进程的运行授权
 */
//@ chunk-karvvxmx.js:2015-2188 placement
async function sweepStaleRunGrants() {
  try {
    for (let n of await readdir(l())) {
      let e = Number(/^([1-9][0-9]{0,9})\.json$/.exec(n)?.[1]);
      if (Number.isInteger(e) && !isProcessRunning(e)) await unlink(a(e)).catch(() => {});
    }
  } catch {}
}

export { unattendedRunGrantStands };
