/**
 * utils/background/adoptJob.ts
 *
 * 2.1.316 新增。接管后台任务。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat } from "fs/promises";
import { join } from "path";
import { ownPidSpace } from "../pidSpace.js";
import { checkMonitorHolder } from "../../services/artifacts/comments/replyYield.js";
import { isRegistrySweepPermitted, isActingAsBgJob } from "../concurrentSessions.js";
import { isProcessRunning } from "../genericProcessUtils.js";
import {
  isProcessProvablyGone,
  provenSameProcessAsync,
  ownProcStartMemo,
  procIdentityOf,
} from "../processIdentity.js";
import { isENOENT } from "../errors.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { openNoFollow_2 } from "../fsSafety/hardenedRead.js";
import { REFUSED_CAPACITY_WINDOW } from "../../services/liveReplica/liveReplica.js";

//@ chunk-czq1j3j2.js:369589-369605 placement
/**
 * probeAdoptedJob 读取 adopt.json 时的大小上限（1 MiB）。
 */
var MAX_ADOPT_JSON_BYTES = 1048576;
//@ chunk-czq1j3j2.js:369605-371305 placement
async function probeAdoptedJob(intents, storage, nowMs) {
  let states = new Map();
  let memo = new Map();
  let modules;
  let loadModules = async () =>
    (modules ??= {
      getJobDir: (await import("../../services/daemon/jobState.js")).getJobDir,
      probeDaemonJob: (await import("../../daemon/jobs/killJob.js")).probeDaemonJob,
      readRoster: (await import("../../services/daemon/roster.js")).readRoster,
      staleMs: (await import("./adopt.js")).STALE_THRESHOLD_MS,
      skewMs: (await import("./adopt.js")).CLOCK_SKEW_ALLOWANCE_MS,
    });
  for (let [jobId, intent] of intents) {
    if (intent.state !== "armed" || intent.holder !== "bg") continue;
    let { getJobDir, probeDaemonJob, readRoster, staleMs, skewMs } = await loadModules();
    if (intent.holderPidSpace !== ownPidSpace().slice(0, 160)) {
      states.set(jobId, "unproven");
      continue;
    }
    let memoize = (key, isRegistrySweepPermitted) => {
      let value = memo.get(key);
      if (value === undefined) {
        value = isRegistrySweepPermitted();
        memo.set(key, value);
      }
      return value;
    };
    states.set(
      jobId,
      await checkMonitorHolder(intent, jobId, {
        pidViewTrusted: () => memoize("trusted", isRegistrySweepPermitted),
        pidState: (pid) =>
          isProcessRunning(pid) ? "alive" : isProcessProvablyGone(pid) ? "gone" : "unknown",
        isSameProcess: provenSameProcessAsync,
        self: {
          pid: process.pid,
          token: ownProcStartMemo.token,
          actingAsJob: isActingAsBgJob(),
        },
        identityOf: (intent) =>
          procIdentityOf({
            ...(intent.holderProcStart !== undefined && {
              procStart: intent.holderProcStart,
            }),
            ...(intent.holderProcStartFt !== undefined && {
              procStartFt: intent.holderProcStartFt,
            }),
          }),
        jobDirExists: (jobId) =>
          memoize("dir:" + jobId, async () => {
            if (storage !== undefined) return true;
            try {
              await lstat(getJobDir(jobId));
              return true;
            } catch (error) {
              if (isENOENT(error)) return false;
              throw error;
            }
          }),
        jobDirTouchedRecently: (jobId) =>
          memoize("touched:" + jobId, async () => {
            try {
              let stats = await lstat(getJobDir(jobId));
              let ageMs = nowMs - stats.mtimeMs;
              return ageMs <= staleMs && -ageMs <= staleMs + skewMs;
            } catch (error) {
              if (isENOENT(error)) return false;
              throw error;
            }
          }),
        jobPresent: (jobId) =>
          memoize("present:" + jobId, async () => {
            let probe = await probeDaemonJob(jobId, storage);
            if (probe.daemonUp && probe.present) return true;
            let roster = await memoize("roster", () =>
              readRoster(
                {
                  silent: true,
                },
                storage,
              ),
            );
            if (roster.parseFailed === true || roster.inspectFailed === true)
              throw Error("roster unreadable");
            return roster.workers[jobId] !== undefined;
          }),
        freshConsentFor: (jobId, slug) =>
          memoize("consent:" + jobId + ":" + slug, () =>
            readAdoptJson(jobId, slug, storage, nowMs, getJobDir, staleMs, skewMs),
          ),
      }),
    );
  }
  return states;
}
//@ chunk-czq1j3j2.js:371305-372447 placement
async function readAdoptJson(jobId, slug, storage, nowMs, getJobDir, staleMs, skewMs = 60000) {
  let content;
  if (storage !== undefined) {
    let readResult = await storage.read([
      {
        key: STORAGE_SPACES.job(jobId, ["adopt.json"]),
        offset: 0,
        length: MAX_ADOPT_JSON_BYTES + 1,
      },
    ]);
    if (!readResult.ok) return true;
    let item = readResult.value.items[0];
    if (item === undefined || !item.found) return false;
    if (item.totalBytes > MAX_ADOPT_JSON_BYTES) return true;
    content = Buffer.from(item.value).toString("utf8");
  } else {
    let filePath = join(getJobDir(jobId), "adopt.json");
    let handle;
    try {
      let noFollow = await openNoFollow_2(filePath);
      if (!noFollow.ok) return noFollow.error.kind !== "absent";
      handle = noFollow.value;
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_ADOPT_JSON_BYTES) return true;
      let buffer = Buffer.alloc(stats.size);
      let { bytesRead } = await handle.read(buffer, 0, stats.size, 0);
      content = buffer.subarray(0, bytesRead).toString("utf8");
    } catch (error) {
      return !isENOENT(error);
    } finally {
      await handle?.close().catch(() => {});
    }
  }
  try {
    let parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return true;
    let parsed_2 = parsed;
    let writtenAtMs = typeof parsed_2.writtenAtMs === "number" ? parsed_2.writtenAtMs : undefined;
    if (parsed_2.frameLive === undefined) return false;
    if (!Array.isArray(parsed_2.frameLive)) return true;
    if (parsed_2.frameLive.length > REFUSED_CAPACITY_WINDOW) return true;
    return parsed_2.frameLive.some((entry) => {
      if (typeof entry !== "object" || entry === null) return true;
      let record = entry;
      if (record.slug !== slug) return false;
      let writtenAt = typeof record.writtenAtMs === "number" ? record.writtenAtMs : writtenAtMs;
      return (
        writtenAt === undefined || (nowMs - writtenAt <= staleMs && writtenAt - nowMs <= staleMs + skewMs)
      );
    });
  } catch {
    return true;
  }
}
export { probeAdoptedJob };
