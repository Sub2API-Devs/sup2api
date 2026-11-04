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
import { objectSchema, literal, numberSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ownProcStartAsync, getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-karvvxmx.js:720-860 placement
var RUN_GRANT_NAME_PATTERN; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RUN_GRANT_BYTES;
var RUN_GRANT_SCHEMA;
deferInit("chunk-karvvxmx.js:720", () => {
  RUN_GRANT_NAME_PATTERN = /^([1-9][0-9]{0,9})\.([0-9a-f]{64})$/;
  MAX_RUN_GRANT_BYTES = 4096;
  RUN_GRANT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      version: literal(1),
      pid: numberSchema().int().positive(),
      procStart: stringSchema().min(1),
      nonceSha256: stringSchema(),
    }),
  );
});
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
function runGrantPath(pid) {
  return join(unattendedRunsDir(), `${pid}.json`);
}
//@ chunk-karvvxmx.js:971-1414 placement
/**
 * 记录无人值守运行授权文件。
 */
async function writeUnattendedRunGrant() {
  try {
    let procStart = await ownProcStartAsync();
    if (procStart === undefined) return;
    let str = randomBytes(32).toString("hex");
    let path = runGrantPath(process.pid);
    await mkdir(dirname(path), {
      recursive: true,
      mode: 448,
    });
    await writeFileAtomic(
      path,
      `${jsonStringify({
        version: 1,
        pid: process.pid,
        procStart,
        nonceSha256: computeContentHash(str),
      })}
`,
      384,
    );
    await sweepStaleRunGrants();
    process.once("exit", () => {
      try {
        unlinkSync(path);
      } catch {}
    });
    return {
      token: `${process.pid}.${str}`,
      remove: async () => {
        try {
          await unlink(path);
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
async function unattendedRunGrantStands(token) {
  try {
    let match = token === undefined ? null : RUN_GRANT_NAME_PATTERN.exec(token);
    if (!match) return false;
    let pid = Number(match[1]);
    let runGrant = await readRunGrant(runGrantPath(pid));
    if (
      runGrant === undefined ||
      runGrant.pid !== pid ||
      !nonceMatches(runGrant.nonceSha256, computeContentHash(match[2])) ||
      !isProcessRunning(pid)
    )
      return false;
    return (
      (await getProcessStartTimeAsync(pid, {
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
async function readRunGrant(path) {
  let handle;
  try {
    handle = await open(path, "r");
    let buf = Buffer.alloc(MAX_RUN_GRANT_BYTES + 1);
    let { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    if (bytesRead > MAX_RUN_GRANT_BYTES) return;
    let parsed = RUN_GRANT_SCHEMA().safeParse(jsonParse(buf.subarray(0, bytesRead).toString("utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-karvvxmx.js:1926-2015 placement
/**
 * 用恒定时间比较两个 nonce 哈希是否一致。
 */
function nonceMatches(hashHex, contentHash) {
  let buffer = Buffer.from(hashHex);
  let buffer_2 = Buffer.from(contentHash);
  return buffer.length === buffer_2.length && timingSafeEqual(buffer, buffer_2);
}
//@ chunk-karvvxmx.js:2015-2188 placement
/**
 * 清理已结束进程的运行授权
 */
async function sweepStaleRunGrants() {
  try {
    for (let name of await readdir(unattendedRunsDir())) {
      let pid = Number(/^([1-9][0-9]{0,9})\.json$/.exec(name)?.[1]);
      if (Number.isInteger(pid) && !isProcessRunning(pid)) await unlink(runGrantPath(pid)).catch(() => {});
    }
  } catch {}
}
export { unattendedRunGrantStands, writeUnattendedRunGrant };
