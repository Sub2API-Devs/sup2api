/**
 * utils/resourceWatchdog.ts
 *
 * 2.1.316 新增：资源看门狗
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (22)
 * attribution: placement 22
 */
import { statfs } from "fs/promises";
import { readFileSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { join, basename, dirname } from "path";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { withDeadline } from "./sleep.js";
import { MACHINE_STATUS_TTL_MS, getMachineMemoryStatus } from "./machineStatus.js";
import { logForDebugging } from "./debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { formatFileSize } from "./format.js";
import { getFsImplementation } from "./fsOperations.js";
import { env } from "./env.js";
import { claudeTempDir, verifyTempDirOwnership, TEMP_ROOT_VOLUME_FULL } from "./tempDir.js";
import { isDiskFullErrno, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { logError } from "./log.js";
import { readCertFileSync } from "./settings/policyCertificates.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { isChildSession } from "./sessionShape.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3296441-3296613 placement
var TENGU_CCR_DISK_WATCHDOG = "tengu_ccr_disk_watchdog";
var TENGU_CCR_MEMORY_WATCHDOG = "tengu_ccr_memory_watchdog";
var RESOURCE_WATCHDOG_PID = "resource-watchdog.pid";
var DISK_WATCHDOG_FLAG = 64;
var MEMORY_WATCHDOG_FLAG = 60000;
var DISK_WATCHDOG_THRESHOLD_BYTES = 0.85;
var MEMORY_WATCHDOG_THRESHOLD_BYTES = 0.95;
var WATCHDOG_CHECK_INTERVAL_MS = 0.05;
var DISK_WATCHDOG_KILL_THRESHOLD_BYTES = 1.25;
var DISK_WATCHDOG_WARN_THRESHOLD_BYTES = 1048576;
var MEMORY_WATCHDOG_TARGET_LIMIT_BYTES = 1024 * DISK_WATCHDOG_WARN_THRESHOLD_BYTES;
//@ chunk-e6aww6q8.js:3296613-3296871 placement
class ResourceWatchdogState {
  timer = undefined;
  lockPath = undefined;
  lockErrorReported = false;
  warnArmed = true;
  drainArmed = true;
  memoryFractions = {
    warnArmed: true,
    drainArmed: true,
  };
  diskFree = {
    armed: true,
    status: undefined,
    told: false,
  };
  memoryFree = {
    armed: true,
    status: undefined,
    told: false,
  };
  diskReadStuck = false;
  lateDiskReading = undefined;
}
//@ chunk-e6aww6q8.js:3296871-3296898 placement
var watchdogStateSlot; // deferred: uses ResourceWatchdogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3296871", () => {
  watchdogStateSlot = new HostScoped(() => new ResourceWatchdogState());
});
//@ chunk-e6aww6q8.js:3296898-3296937 placement
function watchdogState() {
  return watchdogStateSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3296937-3297202 placement
function memoryPressureTransition(state, usedFraction) {
  let level;
  if (usedFraction >= MEMORY_WATCHDOG_THRESHOLD_BYTES) {
    if (state.drainArmed) level = "drain";
    state.drainArmed = false;
    state.warnArmed = false;
  } else if (usedFraction >= DISK_WATCHDOG_THRESHOLD_BYTES) {
    if (
      state.drainArmed === false &&
      usedFraction < MEMORY_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS
    )
      state.drainArmed = true;
    if (state.warnArmed) level = "low";
    state.warnArmed = false;
  } else {
    if (usedFraction < MEMORY_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS) state.drainArmed = true;
    if (usedFraction < DISK_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS) state.warnArmed = true;
  }
  return level;
}
//@ chunk-e6aww6q8.js:3297202-3297304 placement
function checkFreeThreshold(freeState, freeBytes, lowGib) {
  let thresholdBytes = lowGib * MEMORY_WATCHDOG_TARGET_LIMIT_BYTES;
  if (freeBytes < thresholdBytes) {
    let armed = freeState.armed;
    freeState.armed = false;
    return armed;
  }
  if (freeBytes >= thresholdBytes * DISK_WATCHDOG_KILL_THRESHOLD_BYTES) rearmWatchdog(freeState);
  return false;
}
//@ chunk-e6aww6q8.js:3297304-3297680 placement
/**
 * 由 statfs 结果计算磁盘使用比例、可用与总量（MB）、块使用百分比，有 inode 信息时取两者较大的使用比例。
 */
function diskUsageFromStatfs(stats) {
  let blockSize = stats.frsize !== undefined && stats.frsize > 0n ? stats.frsize : stats.bsize;
  let totalBytes = stats.blocks * blockSize;
  if (totalBytes <= 0n) return;
  let availBytes = stats.bavail * blockSize;
  let bytesPerMb = 1024n * 1024n;
  let usedFraction = 1 - Number((availBytes * 10000n) / totalBytes) / 1e4;
  let usage = {
    usedFraction,
    availMB: Number(availBytes / bytesPerMb),
    totalMB: Number(totalBytes / bytesPerMb),
    blockUsedPct: Math.round(usedFraction * 100),
  };
  if (stats.files > 0n) {
    let inodeUsedFraction = 1 - Number((stats.ffree * 10000n) / stats.files) / 1e4;
    usage.inodeUsedPct = Math.round(inodeUsedFraction * 100);
    usage.usedFraction = Math.max(usedFraction, inodeUsedFraction);
  }
  return usage;
}
//@ chunk-e6aww6q8.js:3297680-3298066 placement
/**
 * 带截止时间读取磁盘使用情况；超时则标记读取卡住，不再发起新读取，直到那次读取返回后记下迟到的结果。
 */
async function readDiskUsage(rootPath) {
  let state = watchdogState();
  if (state.diskReadStuck) return;
  let readingPromise = statfs(rootPath, {
    bigint: true,
  })
    .then((stats) => ({
      reading: diskUsageFromStatfs(stats),
    }))
    .catch(() => ({
      reading: undefined,
    }));
  let settled = await withDeadline(readingPromise, MACHINE_STATUS_TTL_MS);
  if (settled === undefined) {
    if (shouldReportWatchdog())
      logForDebugging(
        `resource watchdog: a disk read missed its ${MACHINE_STATUS_TTL_MS}ms deadline; not asking again until it returns`,
      );
    state.diskReadStuck = true;
    readingPromise.then((late) => {
      state.diskReadStuck = false;
      state.lateDiskReading = late.reading;
    });
  }
  return settled?.reading;
}
//@ chunk-e6aww6q8.js:3298066-3298157 placement
/**
 * hasWatchdogObservation：是否已观测到磁盘或内存紧张。
 */
function hasWatchdogObservation() {
  let state = watchdogState();
  return state.diskFree.status !== undefined || state.memoryFree.status !== undefined;
}
//@ chunk-e6aww6q8.js:3298157-3298486 placement
/**
 * 磁盘或内存不足时生成 critical_system_reminder 附件；已告知过且消息里仍有同样提醒的不重复。
 */
function lowResourceReminders(normalizedMessages) {
  let state = watchdogState();
  return [state.diskFree, state.memoryFree].flatMap((freeState) => {
    let { status } = freeState;
    if (
      status === undefined ||
      (freeState.told &&
        normalizedMessages.some(
          (message) =>
            message.type === "attachment" &&
            message.attachment.type === "critical_system_reminder" &&
            message.attachment.content === status,
        ))
    )
      return [];
    freeState.told = true;
    if (shouldReportWatchdog()) logFeatureOk("low_resource_notice");
    return [
      {
        type: "critical_system_reminder",
        content: status,
      },
    ];
  });
}
//@ chunk-e6aww6q8.js:3298486-3300595 placement
/**
 * 资源看门狗：定期检查磁盘空间，持锁运行并记录遥测。
 */
async function runResourceWatchdog(rootPath) {
  let state = watchdogState();
  let lateDiskReading = state.lateDiskReading;
  state.lateDiskReading = undefined;
  let diskWatchdogOn =
    isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_DISK_WATCHDOG, false);
  let memoryWatchdogOn =
    isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_MEMORY_WATCHDOG, false);
  let { diskLowGib, memoryLowGib } = lowResourceThresholds();
  let reporting = shouldReportWatchdog();
  if (!diskWatchdogOn) {
    state.warnArmed = true;
    state.drainArmed = true;
  }
  if (!memoryWatchdogOn)
    state.memoryFractions = {
      warnArmed: true,
      drainArmed: true,
    };
  if (diskLowGib === 0) rearmWatchdog(state.diskFree);
  if (memoryLowGib === 0) rearmWatchdog(state.memoryFree);
  let lockHeld = state.lockPath !== undefined;
  if ((diskWatchdogOn || memoryWatchdogOn) && !lockHeld) {
    let diskWatchdogLock = acquireDiskWatchdogLock(state);
    lockHeld = diskWatchdogLock !== "held" && diskWatchdogLock !== "error";
    if (diskWatchdogLock === "error" && !state.lockErrorReported) {
      state.lockErrorReported = true;
      if (reporting) logFeatureBad("ccr_disk_watchdog", "lock_unavailable");
    }
    if (diskWatchdogLock === "no_temp_root" && !state.lockErrorReported) {
      state.lockErrorReported = true;
      if (reporting) logFeatureSad("ccr_disk_watchdog", "no_temp_root");
    }
  }
  let diskActive = diskWatchdogOn && lockHeld;
  let memoryActive = memoryWatchdogOn && lockHeld;
  let diskUsage =
    diskActive || diskLowGib > 0 ? ((await readDiskUsage(rootPath)) ?? lateDiskReading) : undefined;
  if (diskUsage) {
    let diskLevel = diskActive ? memoryPressureTransition(state, diskUsage.usedFraction) : undefined;
    if (diskLevel) {
      let diskFields = {
        used_pct: Math.round(diskUsage.usedFraction * 100),
        block_used_pct: diskUsage.blockUsedPct,
        avail_mb: diskUsage.availMB,
        total_mb: diskUsage.totalMB,
      };
      if (diskUsage.inodeUsedPct !== undefined) diskFields.inode_used_pct = diskUsage.inodeUsedPct;
      if (reporting) {
        logForDebugging(
          `resource watchdog: disk_${diskLevel} (${diskFields.used_pct}% used, ${diskFields.avail_mb}MB free)`,
        );
        logEvent(diskLevel === "drain" ? "tengu_disk_drain" : "tengu_disk_low", diskFields);
      }
      logForDiagnosticsNoPII(diskLevel === "drain" ? "error" : "warn", `disk_${diskLevel}`, diskFields);
    }
    if (diskLowGib > 0) {
      let freeBytes = diskUsage.availMB * DISK_WATCHDOG_WARN_THRESHOLD_BYTES;
      if (checkFreeThreshold(state.diskFree, freeBytes, diskLowGib)) {
        if (reporting) logForDebugging(`resource watchdog: disk_free_low (${diskUsage.availMB}MB free)`);
        state.diskFree.status = `Low disk space: ${formatFileSize(freeBytes)} is free on the filesystem holding the working directory.`;
        state.diskFree.told = false;
      }
    }
  }
  let memoryStatus = memoryActive || memoryLowGib > 0 ? await getMachineMemoryStatus() : undefined;
  if (memoryStatus) {
    let usedFraction = 1 - memoryStatus.availableBytes / memoryStatus.totalBytes;
    let memoryLevel = memoryActive
      ? memoryPressureTransition(state.memoryFractions, usedFraction)
      : undefined;
    if (memoryLevel) {
      let memoryFields = {
        used_pct: Math.round(usedFraction * 100),
        avail_mb: Math.floor(memoryStatus.availableBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES),
        total_mb: Math.floor(memoryStatus.totalBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES),
        cgroup_limited: memoryStatus.limitedByCgroup ? 1 : 0,
        ...(memoryStatus.oomKills !== undefined && {
          oom_kills: memoryStatus.oomKills,
        }),
      };
      if (reporting) {
        logForDebugging(
          `resource watchdog: memory_${memoryLevel} (${memoryFields.used_pct}% used, ${memoryFields.avail_mb}MB available)`,
        );
        logEvent(memoryLevel === "drain" ? "tengu_memory_drain" : "tengu_memory_low", memoryFields);
      }
      logForDiagnosticsNoPII(
        memoryLevel === "drain" ? "error" : "warn",
        `memory_${memoryLevel}`,
        memoryFields,
      );
    }
    if (memoryLowGib > 0 && checkFreeThreshold(state.memoryFree, memoryStatus.availableBytes, memoryLowGib)) {
      if (reporting)
        logForDebugging(
          `resource watchdog: memory_free_low (${Math.floor(memoryStatus.availableBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES)}MB available)`,
        );
      state.memoryFree.status = `Low memory: ${formatFileSize(memoryStatus.availableBytes)} is available to this session.`;
      state.memoryFree.told = false;
    }
  }
}
//@ chunk-e6aww6q8.js:3300595-3300652 placement
function runWatchdogOnce() {
  try {
    runResourceWatchdog(getFsImplementation().cwd()).catch(() => {});
  } catch {}
}
//@ chunk-e6aww6q8.js:3300652-3300729 placement
/**
 * startWatchdogSafe：启动看门狗（失败只记日志）。
 */
function startWatchdogSafe() {
  try {
    startResourceWatchdog();
  } catch {
    if (shouldReportWatchdog()) logFeatureBad("ccr_disk_watchdog", "boot_error");
  }
}
//@ chunk-e6aww6q8.js:3300729-3300932 placement
function startResourceWatchdog() {
  let { diskLowGib, memoryLowGib } = lowResourceThresholds();
  if (!isWatchdogTelemetryEnabled() && diskLowGib === 0 && memoryLowGib === 0) return;
  let state = watchdogState();
  if (state.timer !== undefined) return;
  state.timer = setInterval(runWatchdogOnce, MEMORY_WATCHDOG_FLAG);
  state.timer.unref?.();
  if (shouldReportWatchdog()) logFeatureOk("ccr_disk_watchdog");
}
//@ chunk-e6aww6q8.js:3300932-3301060 placement
function processStartTime(pid) {
  try {
    let file = readFileSync(`/proc/${pid}/stat`, "utf8");
    return file.slice(file.lastIndexOf(")") + 2).split(" ")[19] ?? "";
  } catch {
    return "";
  }
}
//@ chunk-e6aww6q8.js:3301060-3301168 placement
function isLockHolderAlive(pid, expectedStartTime) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  if (expectedStartTime === "") return true;
  let startTime = processStartTime(pid);
  return startTime === "" || startTime === expectedStartTime;
}
//@ chunk-e6aww6q8.js:3301168-3302052 placement
function acquireDiskWatchdogLock(state) {
  let lockPath = `${env.CLAUDE_CODE_DIAGNOSTICS_FILE}.disk-watchdog.pid`;
  if (env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY)
    try {
      let tempDir = claudeTempDir();
      mkdirSync(tempDir, {
        recursive: true,
        mode: 448,
      });
      verifyTempDirOwnership(tempDir);
      lockPath = join(tempDir, RESOURCE_WATCHDOG_PID);
    } catch (error) {
      if (
        isDiskFullErrno(error) ||
        (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
          error.errorClass === TEMP_ROOT_VOLUME_FULL)
      )
        return "disk_full";
      if (!state.lockErrorReported) logError(error);
      return "no_temp_root";
    }
  for (let idx = 0; idx < 2; idx++) {
    let wroteLock = false;
    try {
      writeFileSync(lockPath, `${process.pid}:${processStartTime(process.pid)}`, {
        flag: "wx",
      });
      wroteLock = true;
    } catch (error) {
      if (isDiskFullErrno(error)) return "disk_full";
      let certFile = readCertFileSync(lockPath, DISK_WATCHDOG_FLAG, {
        refuseLinkOnWindows: true,
      });
      if (certFile.kind !== "ok") return "error";
      let trimmed = certFile.text.trim();
      let [pidText, startTimeText = ""] = trimmed.split(":");
      let holderPid = Number(pidText);
      if (Number.isInteger(holderPid) && holderPid > 0 && isLockHolderAlive(holderPid, startTimeText))
        return "held";
      let stalePath = `${lockPath}.stale.${process.pid}`;
      try {
        renameSync(lockPath, stalePath);
      } catch {
        continue;
      }
      let certFile_2 = readCertFileSync(stalePath, DISK_WATCHDOG_FLAG, {
        refuseLinkOnWindows: true,
      });
      if (certFile_2.kind !== "ok" || certFile_2.text.trim() !== trimmed) {
        try {
          renameSync(stalePath, lockPath);
        } catch {}
        return "held";
      }
      try {
        unlinkSync(stalePath);
      } catch {}
      continue;
    }
    if (wroteLock) {
      state.lockPath = lockPath;
      registerCleanup(() => {
        releaseWatchdogLock(state);
      });
      return "acquired";
    }
  }
  return "error";
}
//@ chunk-e6aww6q8.js:3302052-3302188 placement
function releaseWatchdogLock(state) {
  if (state.lockPath === undefined) return;
  try {
    if (basename(state.lockPath) === RESOURCE_WATCHDOG_PID) verifyTempDirOwnership(dirname(state.lockPath));
    unlinkSync(state.lockPath);
  } catch {}
  state.lockPath = undefined;
}
//@ chunk-e6aww6q8.js:3302188-3302241 placement
function rearmWatchdog(freeState) {
  freeState.armed = true;
  freeState.status = undefined;
  freeState.told = false;
}
//@ chunk-e6aww6q8.js:3302241-3302368 placement
function isWatchdogTelemetryEnabled() {
  if (env.CLAUDECODE) return false;
  return env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY || Boolean(env.CLAUDE_CODE_DIAGNOSTICS_FILE);
}
//@ chunk-e6aww6q8.js:3302368-3302470 placement
function shouldReportWatchdog() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND !== "byoc" || env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY;
}
//@ chunk-e6aww6q8.js:3302470-3302627 placement
function lowResourceThresholds() {
  return isChildSession()
    ? {
        diskLowGib: 0,
        memoryLowGib: 0,
      }
    : {
        diskLowGib: env.CLAUDE_CODE_WARN_DISK_FREE_GIB ?? 0,
        memoryLowGib: env.CLAUDE_CODE_WARN_MEMORY_FREE_GIB ?? 0,
      };
}
export { startWatchdogSafe, hasWatchdogObservation, lowResourceReminders };
