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
var watchdogStateSlot = new HostScoped(() => new ResourceWatchdogState());
//@ chunk-e6aww6q8.js:3296898-3296937 placement
function watchdogState() {
  return watchdogStateSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3296937-3297202 placement
function memoryPressureTransition(e, n) {
  let r;
  if (n >= MEMORY_WATCHDOG_THRESHOLD_BYTES) {
    if (e.drainArmed) r = "drain";
    e.drainArmed = false;
    e.warnArmed = false;
  } else if (n >= DISK_WATCHDOG_THRESHOLD_BYTES) {
    if (e.drainArmed === false && n < MEMORY_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS)
      e.drainArmed = true;
    if (e.warnArmed) r = "low";
    e.warnArmed = false;
  } else {
    if (n < MEMORY_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS) e.drainArmed = true;
    if (n < DISK_WATCHDOG_THRESHOLD_BYTES - WATCHDOG_CHECK_INTERVAL_MS) e.warnArmed = true;
  }
  return r;
}
//@ chunk-e6aww6q8.js:3297202-3297304 placement
function checkFreeThreshold(e, n, r) {
  let s = r * MEMORY_WATCHDOG_TARGET_LIMIT_BYTES;
  if (n < s) {
    let armed = e.armed;
    e.armed = false;
    return armed;
  }
  if (n >= s * DISK_WATCHDOG_KILL_THRESHOLD_BYTES) rearmWatchdog(e);
  return false;
}
//@ chunk-e6aww6q8.js:3297304-3297680 placement
/**
 * 由 statfs 结果计算磁盘使用比例、可用与总量（MB）、块使用百分比，有 inode 信息时取两者较大的使用比例。
 */
function diskUsageFromStatfs(e) {
  let n = e.frsize !== undefined && e.frsize > 0n ? e.frsize : e.bsize;
  let r = e.blocks * n;
  if (r <= 0n) return;
  let s = e.bavail * n;
  let h = 1024n * 1024n;
  let y = 1 - Number((s * 10000n) / r) / 1e4;
  let S = {
    usedFraction: y,
    availMB: Number(s / h),
    totalMB: Number(r / h),
    blockUsedPct: Math.round(y * 100),
  };
  if (e.files > 0n) {
    let w = 1 - Number((e.ffree * 10000n) / e.files) / 1e4;
    S.inodeUsedPct = Math.round(w * 100);
    S.usedFraction = Math.max(y, w);
  }
  return S;
}
//@ chunk-e6aww6q8.js:3297680-3298066 placement
/**
 * 带截止时间读取磁盘使用情况；超时则标记读取卡住，不再发起新读取，直到那次读取返回后记下迟到的结果。
 */
async function readDiskUsage(e) {
  let n = watchdogState();
  if (n.diskReadStuck) return;
  let r = statfs(e, {
    bigint: true,
  })
    .then((h) => ({
      reading: diskUsageFromStatfs(h),
    }))
    .catch(() => ({
      reading: undefined,
    }));
  let s = await withDeadline(r, MACHINE_STATUS_TTL_MS);
  if (s === undefined) {
    if (shouldReportWatchdog())
      logForDebugging(
        `resource watchdog: a disk read missed its ${MACHINE_STATUS_TTL_MS}ms deadline; not asking again until it returns`,
      );
    n.diskReadStuck = true;
    r.then((h) => {
      n.diskReadStuck = false;
      n.lateDiskReading = h.reading;
    });
  }
  return s?.reading;
}
//@ chunk-e6aww6q8.js:3298066-3298157 placement
/**
 * hasWatchdogObservation：是否已观测到磁盘或内存紧张。
 */
function hasWatchdogObservation() {
  let e = watchdogState();
  return e.diskFree.status !== undefined || e.memoryFree.status !== undefined;
}
//@ chunk-e6aww6q8.js:3298157-3298486 placement
/**
 * 磁盘或内存不足时生成 critical_system_reminder 附件；已告知过且消息里仍有同样提醒的不重复。
 */
function lowResourceReminders(normalizedMessages) {
  let n = watchdogState();
  return [n.diskFree, n.memoryFree].flatMap((r) => {
    let { status } = r;
    if (
      status === undefined ||
      (r.told &&
        normalizedMessages.some(
          (h) =>
            h.type === "attachment" &&
            h.attachment.type === "critical_system_reminder" &&
            h.attachment.content === status,
        ))
    )
      return [];
    r.told = true;
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
async function runResourceWatchdog(e) {
  let n = watchdogState();
  let lateDiskReading = n.lateDiskReading;
  n.lateDiskReading = undefined;
  let s = isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_DISK_WATCHDOG, false);
  let h =
    isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_MEMORY_WATCHDOG, false);
  let { diskLowGib, memoryLowGib } = lowResourceThresholds();
  let w = shouldReportWatchdog();
  if (!s) {
    n.warnArmed = true;
    n.drainArmed = true;
  }
  if (!h)
    n.memoryFractions = {
      warnArmed: true,
      drainArmed: true,
    };
  if (diskLowGib === 0) rearmWatchdog(n.diskFree);
  if (memoryLowGib === 0) rearmWatchdog(n.memoryFree);
  let L = n.lockPath !== undefined;
  if ((s || h) && !L) {
    let diskWatchdogLock = acquireDiskWatchdogLock(n);
    L = diskWatchdogLock !== "held" && diskWatchdogLock !== "error";
    if (diskWatchdogLock === "error" && !n.lockErrorReported) {
      n.lockErrorReported = true;
      if (w) logFeatureBad("ccr_disk_watchdog", "lock_unavailable");
    }
    if (diskWatchdogLock === "no_temp_root" && !n.lockErrorReported) {
      n.lockErrorReported = true;
      if (w) logFeatureSad("ccr_disk_watchdog", "no_temp_root");
    }
  }
  let G = s && L;
  let q = h && L;
  let Z = G || diskLowGib > 0 ? ((await readDiskUsage(e)) ?? lateDiskReading) : undefined;
  if (Z) {
    let ke = G ? memoryPressureTransition(n, Z.usedFraction) : undefined;
    if (ke) {
      let we = {
        used_pct: Math.round(Z.usedFraction * 100),
        block_used_pct: Z.blockUsedPct,
        avail_mb: Z.availMB,
        total_mb: Z.totalMB,
      };
      if (Z.inodeUsedPct !== undefined) we.inode_used_pct = Z.inodeUsedPct;
      if (w) {
        logForDebugging(`resource watchdog: disk_${ke} (${we.used_pct}% used, ${we.avail_mb}MB free)`);
        logEvent(ke === "drain" ? "tengu_disk_drain" : "tengu_disk_low", we);
      }
      logForDiagnosticsNoPII(ke === "drain" ? "error" : "warn", `disk_${ke}`, we);
    }
    if (diskLowGib > 0) {
      let we = Z.availMB * DISK_WATCHDOG_WARN_THRESHOLD_BYTES;
      if (checkFreeThreshold(n.diskFree, we, diskLowGib)) {
        if (w) logForDebugging(`resource watchdog: disk_free_low (${Z.availMB}MB free)`);
        n.diskFree.status = `Low disk space: ${formatFileSize(we)} is free on the filesystem holding the working directory.`;
        n.diskFree.told = false;
      }
    }
  }
  let Se = q || memoryLowGib > 0 ? await getMachineMemoryStatus() : undefined;
  if (Se) {
    let ke = 1 - Se.availableBytes / Se.totalBytes;
    let we = q ? memoryPressureTransition(n.memoryFractions, ke) : undefined;
    if (we) {
      let Ee = {
        used_pct: Math.round(ke * 100),
        avail_mb: Math.floor(Se.availableBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES),
        total_mb: Math.floor(Se.totalBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES),
        cgroup_limited: Se.limitedByCgroup ? 1 : 0,
        ...(Se.oomKills !== undefined && {
          oom_kills: Se.oomKills,
        }),
      };
      if (w) {
        logForDebugging(`resource watchdog: memory_${we} (${Ee.used_pct}% used, ${Ee.avail_mb}MB available)`);
        logEvent(we === "drain" ? "tengu_memory_drain" : "tengu_memory_low", Ee);
      }
      logForDiagnosticsNoPII(we === "drain" ? "error" : "warn", `memory_${we}`, Ee);
    }
    if (memoryLowGib > 0 && checkFreeThreshold(n.memoryFree, Se.availableBytes, memoryLowGib)) {
      if (w)
        logForDebugging(
          `resource watchdog: memory_free_low (${Math.floor(Se.availableBytes / DISK_WATCHDOG_WARN_THRESHOLD_BYTES)}MB available)`,
        );
      n.memoryFree.status = `Low memory: ${formatFileSize(Se.availableBytes)} is available to this session.`;
      n.memoryFree.told = false;
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
  let r = watchdogState();
  if (r.timer !== undefined) return;
  r.timer = setInterval(runWatchdogOnce, MEMORY_WATCHDOG_FLAG);
  r.timer.unref?.();
  if (shouldReportWatchdog()) logFeatureOk("ccr_disk_watchdog");
}
//@ chunk-e6aww6q8.js:3300932-3301060 placement
function processStartTime(e) {
  try {
    let file = readFileSync(`/proc/${e}/stat`, "utf8");
    return file.slice(file.lastIndexOf(")") + 2).split(" ")[19] ?? "";
  } catch {
    return "";
  }
}
//@ chunk-e6aww6q8.js:3301060-3301168 placement
function isLockHolderAlive(e, n) {
  try {
    process.kill(e, 0);
  } catch {
    return false;
  }
  if (n === "") return true;
  let r = processStartTime(e);
  return r === "" || r === n;
}
//@ chunk-e6aww6q8.js:3301168-3302052 placement
function acquireDiskWatchdogLock(e) {
  let n = `${env.CLAUDE_CODE_DIAGNOSTICS_FILE}.disk-watchdog.pid`;
  if (env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY)
    try {
      let r = claudeTempDir();
      mkdirSync(r, {
        recursive: true,
        mode: 448,
      });
      verifyTempDirOwnership(r);
      n = join(r, RESOURCE_WATCHDOG_PID);
    } catch (error) {
      if (
        isDiskFullErrno(error) ||
        (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
          error.errorClass === TEMP_ROOT_VOLUME_FULL)
      )
        return "disk_full";
      if (!e.lockErrorReported) logError(error);
      return "no_temp_root";
    }
  for (let idx = 0; idx < 2; idx++) {
    let s = false;
    try {
      writeFileSync(n, `${process.pid}:${processStartTime(process.pid)}`, {
        flag: "wx",
      });
      s = true;
    } catch (error) {
      if (isDiskFullErrno(error)) return "disk_full";
      let certFile = readCertFileSync(n, DISK_WATCHDOG_FLAG, {
        refuseLinkOnWindows: true,
      });
      if (certFile.kind !== "ok") return "error";
      let trimmed = certFile.text.trim();
      let [w, L = ""] = trimmed.split(":");
      let G = Number(w);
      if (Number.isInteger(G) && G > 0 && isLockHolderAlive(G, L)) return "held";
      let q = `${n}.stale.${process.pid}`;
      try {
        renameSync(n, q);
      } catch {
        continue;
      }
      let certFile_2 = readCertFileSync(q, DISK_WATCHDOG_FLAG, {
        refuseLinkOnWindows: true,
      });
      if (certFile_2.kind !== "ok" || certFile_2.text.trim() !== trimmed) {
        try {
          renameSync(q, n);
        } catch {}
        return "held";
      }
      try {
        unlinkSync(q);
      } catch {}
      continue;
    }
    if (s) {
      e.lockPath = n;
      registerCleanup(() => {
        releaseWatchdogLock(e);
      });
      return "acquired";
    }
  }
  return "error";
}
//@ chunk-e6aww6q8.js:3302052-3302188 placement
function releaseWatchdogLock(e) {
  if (e.lockPath === undefined) return;
  try {
    if (basename(e.lockPath) === RESOURCE_WATCHDOG_PID) verifyTempDirOwnership(dirname(e.lockPath));
    unlinkSync(e.lockPath);
  } catch {}
  e.lockPath = undefined;
}
//@ chunk-e6aww6q8.js:3302188-3302241 placement
function rearmWatchdog(e) {
  e.armed = true;
  e.status = undefined;
  e.told = false;
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
