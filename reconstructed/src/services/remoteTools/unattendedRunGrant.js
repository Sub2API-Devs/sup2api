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
import { u, literal, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { ownProcStartAsync, getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";

//@ chunk-karvvxmx.js:720-860 placement
var RUN_GRANT_NAME_PATTERN = /^([1-9][0-9]{0,9})\.([0-9a-f]{64})$/;
var MAX_RUN_GRANT_BYTES = 4096;
var RUN_GRANT_SCHEMA = DoctorLazy(() =>
  u({
    version: literal(1),
    pid: E().int().positive(),
    procStart: string().min(1),
    nonceSha256: string(),
  }),
);
//@ chunk-karvvxmx.js:860-931 placement
/**
 * 无人值守运行授权目录（~/.claude/state/unattended-serving-runs）。
 */
function unattendedRunsDir() {
  return join(homedir(), ".claude", "state", "unattended-serving-runs");
}
//@ chunk-karvvxmx.js:931-971 placement
/**
 * 指定 PID 的授权文件路径。
 */
function runGrantPath(n) {
  return join(unattendedRunsDir(), `${n}.json`);
}
//@ chunk-karvvxmx.js:971-1414 placement
/**
 * 记录无人值守运行授权文件。
 */
async function writeUnattendedRunGrant() {
  try {
    let n = await ownProcStartAsync();
    if (n === undefined) return;
    let str = randomBytes(32).toString("hex");
    let r = runGrantPath(process.pid);
    await mkdir(dirname(r), {
      recursive: true,
      mode: 448,
    });
    await writeFileAtomic(
      r,
      `${jsonStringify({
        version: 1,
        pid: process.pid,
        procStart: n,
        nonceSha256: computeContentHash(str),
      })}
`,
      384,
    );
    await sweepStaleRunGrants();
    process.once("exit", () => {
      try {
        unlinkSync(r);
      } catch {}
    });
    return {
      token: `${process.pid}.${str}`,
      remove: async () => {
        try {
          await unlink(r);
        } catch {}
      },
    };
  } catch (error) {
    logForDebugging(`unattended run grant: not recorded (${errorMessage(error)})`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-karvvxmx.js:1414-1656 placement
async function unattendedRunGrantStands(n) {
  try {
    let e = n === undefined ? null : RUN_GRANT_NAME_PATTERN.exec(n);
    if (!e) return false;
    let r = Number(e[1]);
    let runGrant = await readRunGrant(runGrantPath(r));
    if (
      runGrant === undefined ||
      runGrant.pid !== r ||
      !nonceMatches(runGrant.nonceSha256, computeContentHash(e[2])) ||
      !isProcessRunning(r)
    )
      return false;
    return (
      (await getProcessStartTimeAsync(r, {
        skipCache: true,
      })) === runGrant.procStart
    );
  } catch {
    return false;
  }
}
//@ chunk-karvvxmx.js:1656-1926 placement
/**
 * 读运行授权文件
 */
async function readRunGrant(n) {
  let e;
  try {
    e = await open(n, "r");
    let r = Buffer.alloc(MAX_RUN_GRANT_BYTES + 1);
    let { bytesRead } = await e.read(r, 0, r.length, 0);
    if (bytesRead > MAX_RUN_GRANT_BYTES) return;
    let s = RUN_GRANT_SCHEMA().safeParse(jsonParse(r.subarray(0, bytesRead).toString("utf8")));
    return s.success ? s.data : undefined;
  } catch {
    return;
  } finally {
    await e?.close().catch(() => {});
  }
}
//@ chunk-karvvxmx.js:1926-2015 placement
/**
 * 用恒定时间比较两个 nonce 哈希是否一致。
 */
function nonceMatches(n, contentHash) {
  let buffer = Buffer.from(n);
  let buffer_2 = Buffer.from(contentHash);
  return buffer.length === buffer_2.length && timingSafeEqual(buffer, buffer_2);
}
//@ chunk-karvvxmx.js:2015-2188 placement
/**
 * 清理已结束进程的运行授权
 */
async function sweepStaleRunGrants() {
  try {
    for (let n of await readdir(unattendedRunsDir())) {
      let e = Number(/^([1-9][0-9]{0,9})\.json$/.exec(n)?.[1]);
      if (Number.isInteger(e) && !isProcessRunning(e)) await unlink(runGrantPath(e)).catch(() => {});
    }
  } catch {}
}
export { unattendedRunGrantStands };
