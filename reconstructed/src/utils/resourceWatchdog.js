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
import { statfs, statfs as statfs_2, statfs as statfs_3 } from "fs/promises";
import {
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
  mkdirSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  unlinkSync as unlinkSync_2,
} from "fs";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { withDeadline } from "./sleep.js";
import { QZe, getMachineMemoryStatus } from "./machineStatus.js";
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
var TENGU_CCR_DISK_WATCHDOG = "tengu_ccr_disk_watchdog",
  TENGU_CCR_MEMORY_WATCHDOG = "tengu_ccr_memory_watchdog",
  RESOURCE_WATCHDOG_PID = "resource-watchdog.pid",
  WRn = 64,
  mxr = 60000,
  GRn = 0.85,
  JZe = 0.95,
  ZZe = 0.05,
  gxr = 1.25,
  Kne = 1048576,
  hxr = 1024 * Kne;
//@ chunk-e6aww6q8.js:3296613-3296871 placement
class ResourceWatchdogState {
  timer = void 0;
  lockPath = void 0;
  lockErrorReported = !1;
  warnArmed = !0;
  drainArmed = !0;
  memoryFractions = { warnArmed: !0, drainArmed: !0 };
  diskFree = { armed: !0, status: void 0, told: !1 };
  memoryFree = { armed: !0, status: void 0, told: !1 };
  diskReadStuck = !1;
  lateDiskReading = void 0;
}
//@ chunk-e6aww6q8.js:3296871-3296898 placement
var yxr = new HostScoped(() => new ResourceWatchdogState());
//@ chunk-e6aww6q8.js:3296898-3296937 placement
function Vne() {
  return yxr.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3296937-3297202 placement
function memoryPressureTransition(e, n) {
  let r;
  if (n >= JZe) {
    if (e.drainArmed) r = "drain";
    ((e.drainArmed = !1), (e.warnArmed = !1));
  } else if (n >= GRn) {
    if (e.drainArmed === !1 && n < JZe - ZZe) e.drainArmed = !0;
    if (e.warnArmed) r = "low";
    e.warnArmed = !1;
  } else {
    if (n < JZe - ZZe) e.drainArmed = !0;
    if (n < GRn - ZZe) e.warnArmed = !0;
  }
  return r;
}
//@ chunk-e6aww6q8.js:3297202-3297304 placement
function checkFreeThreshold(e, n, r) {
  let s = r * hxr;
  if (n < s) {
    let armed = e.armed;
    return ((e.armed = !1), armed);
  }
  if (n >= s * gxr) eet(e);
  return !1;
}
/**
 * 由 statfs 结果计算磁盘使用比例、可用与总量（MB）、块使用百分比，有 inode 信息时取两者较大的使用比例。
 */
//@ chunk-e6aww6q8.js:3297304-3297680 placement
function diskUsageFromStatfs(e) {
  let n = e.frsize !== void 0 && e.frsize > 0n ? e.frsize : e.bsize,
    r = e.blocks * n;
  if (r <= 0n) return;
  let s = e.bavail * n,
    h = 1024n * 1024n,
    y = 1 - Number((s * 10000n) / r) / 1e4,
    S = {
      usedFraction: y,
      availMB: Number(s / h),
      totalMB: Number(r / h),
      blockUsedPct: Math.round(y * 100),
    };
  if (e.files > 0n) {
    let w = 1 - Number((e.ffree * 10000n) / e.files) / 1e4;
    ((S.inodeUsedPct = Math.round(w * 100)), (S.usedFraction = Math.max(y, w)));
  }
  return S;
}
/**
 * 带截止时间读取磁盘使用情况；超时则标记读取卡住，不再发起新读取，直到那次读取返回后记下迟到的结果。
 */
//@ chunk-e6aww6q8.js:3297680-3298066 placement
async function readDiskUsage(e) {
  let n = Vne();
  if (n.diskReadStuck) return;
  let r = statfs_2(e, { bigint: !0 })
      .then((h) => ({ reading: diskUsageFromStatfs(h) }))
      .catch(() => ({ reading: void 0 })),
    s = await withDeadline(r, QZe);
  if (s === void 0) {
    if (shouldReportWatchdog())
      logForDebugging(
        `resource watchdog: a disk read missed its ${QZe}ms deadline; not asking again until it returns`,
      );
    ((n.diskReadStuck = !0),
      r.then((h) => {
        ((n.diskReadStuck = !1), (n.lateDiskReading = h.reading));
      }));
  }
  return s?.reading;
}
//@ chunk-e6aww6q8.js:3298066-3298157 placement
function JRn() {
  let e = Vne();
  return e.diskFree.status !== void 0 || e.memoryFree.status !== void 0;
}
/**
 * 磁盘或内存不足时生成 critical_system_reminder 附件；已告知过且消息里仍有同样提醒的不重复。
 */
//@ chunk-e6aww6q8.js:3298157-3298486 placement
function lowResourceReminders(e) {
  let n = Vne();
  return [n.diskFree, n.memoryFree].flatMap((r) => {
    let { status: status } = r;
    if (
      status === void 0 ||
      (r.told &&
        e.some(
          (h) =>
            h.type === "attachment" &&
            h.attachment.type === "critical_system_reminder" &&
            h.attachment.content === status,
        ))
    )
      return [];
    if (((r.told = !0), shouldReportWatchdog())) logFeatureOk("low_resource_notice");
    return [{ type: "critical_system_reminder", content: status }];
  });
}
/**
 * 资源看门狗：定期检查磁盘空间，持锁运行并记录遥测。
 */
//@ chunk-e6aww6q8.js:3298486-3300595 placement
async function runResourceWatchdog(e) {
  let n = Vne(),
    lateDiskReading = n.lateDiskReading;
  n.lateDiskReading = void 0;
  let s = isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_DISK_WATCHDOG, !1),
    h = isWatchdogTelemetryEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CCR_MEMORY_WATCHDOG, !1),
    { diskLowGib: diskLowGib, memoryLowGib: memoryLowGib } = lowResourceThresholds(),
    w = shouldReportWatchdog();
  if (!s) ((n.warnArmed = !0), (n.drainArmed = !0));
  if (!h) n.memoryFractions = { warnArmed: !0, drainArmed: !0 };
  if (diskLowGib === 0) eet(n.diskFree);
  if (memoryLowGib === 0) eet(n.memoryFree);
  let L = n.lockPath !== void 0;
  if ((s || h) && !L) {
    let ke = acquireDiskWatchdogLock(n);
    if (((L = ke !== "held" && ke !== "error"), ke === "error" && !n.lockErrorReported)) {
      if (((n.lockErrorReported = !0), w)) logFeatureBad("ccr_disk_watchdog", "lock_unavailable");
    }
    if (ke === "no_temp_root" && !n.lockErrorReported) {
      if (((n.lockErrorReported = !0), w)) logFeatureSad("ccr_disk_watchdog", "no_temp_root");
    }
  }
  let G = s && L,
    q = h && L,
    Z = G || diskLowGib > 0 ? ((await readDiskUsage(e)) ?? lateDiskReading) : void 0;
  if (Z) {
    let ke = G ? memoryPressureTransition(n, Z.usedFraction) : void 0;
    if (ke) {
      let we = {
        used_pct: Math.round(Z.usedFraction * 100),
        block_used_pct: Z.blockUsedPct,
        avail_mb: Z.availMB,
        total_mb: Z.totalMB,
      };
      if (Z.inodeUsedPct !== void 0) we.inode_used_pct = Z.inodeUsedPct;
      if (w)
        (logForDebugging(`resource watchdog: disk_${ke} (${we.used_pct}% used, ${we.avail_mb}MB free)`),
          logEvent(ke === "drain" ? "tengu_disk_drain" : "tengu_disk_low", we));
      logForDiagnosticsNoPII(ke === "drain" ? "error" : "warn", `disk_${ke}`, we);
    }
    if (diskLowGib > 0) {
      let we = Z.availMB * Kne;
      if (checkFreeThreshold(n.diskFree, we, diskLowGib)) {
        if (w) logForDebugging(`resource watchdog: disk_free_low (${Z.availMB}MB free)`);
        ((n.diskFree.status = `Low disk space: ${formatFileSize(we)} is free on the filesystem holding the working directory.`),
          (n.diskFree.told = !1));
      }
    }
  }
  let Se = q || memoryLowGib > 0 ? await getMachineMemoryStatus() : void 0;
  if (Se) {
    let ke = 1 - Se.availableBytes / Se.totalBytes,
      we = q ? memoryPressureTransition(n.memoryFractions, ke) : void 0;
    if (we) {
      let Ee = {
        used_pct: Math.round(ke * 100),
        avail_mb: Math.floor(Se.availableBytes / Kne),
        total_mb: Math.floor(Se.totalBytes / Kne),
        cgroup_limited: Se.limitedByCgroup ? 1 : 0,
        ...(Se.oomKills !== void 0 && { oom_kills: Se.oomKills }),
      };
      if (w)
        (logForDebugging(
          `resource watchdog: memory_${we} (${Ee.used_pct}% used, ${Ee.avail_mb}MB available)`,
        ),
          logEvent(we === "drain" ? "tengu_memory_drain" : "tengu_memory_low", Ee));
      logForDiagnosticsNoPII(we === "drain" ? "error" : "warn", `memory_${we}`, Ee);
    }
    if (memoryLowGib > 0 && checkFreeThreshold(n.memoryFree, Se.availableBytes, memoryLowGib)) {
      if (w)
        logForDebugging(
          `resource watchdog: memory_free_low (${Math.floor(Se.availableBytes / Kne)}MB available)`,
        );
      ((n.memoryFree.status = `Low memory: ${formatFileSize(Se.availableBytes)} is available to this session.`),
        (n.memoryFree.told = !1));
    }
  }
}
//@ chunk-e6aww6q8.js:3300595-3300652 placement
function bxr() {
  try {
    runResourceWatchdog(getFsImplementation().cwd()).catch(() => {});
  } catch {}
}
//@ chunk-e6aww6q8.js:3300652-3300729 placement
function j8s() {
  try {
    startResourceWatchdog();
  } catch {
    if (shouldReportWatchdog()) logFeatureBad("ccr_disk_watchdog", "boot_error");
  }
}
//@ chunk-e6aww6q8.js:3300729-3300932 placement
function startResourceWatchdog() {
  let { diskLowGib: diskLowGib, memoryLowGib: memoryLowGib } = lowResourceThresholds();
  if (!isWatchdogTelemetryEnabled() && diskLowGib === 0 && memoryLowGib === 0) return;
  let r = Vne();
  if (r.timer !== void 0) return;
  if (((r.timer = setInterval(bxr, mxr)), r.timer.unref?.(), shouldReportWatchdog()))
    logFeatureOk("ccr_disk_watchdog");
}
//@ chunk-e6aww6q8.js:3300932-3301060 placement
function processStartTime(e) {
  try {
    let n = readFileSync_6(`/proc/${e}/stat`, "utf8");
    return n.slice(n.lastIndexOf(")") + 2).split(" ")[19] ?? "";
  } catch {
    return "";
  }
}
//@ chunk-e6aww6q8.js:3301060-3301168 placement
function isLockHolderAlive(e, n) {
  try {
    process.kill(e, 0);
  } catch {
    return !1;
  }
  if (n === "") return !0;
  let r = processStartTime(e);
  return r === "" || r === n;
}
//@ chunk-e6aww6q8.js:3301168-3302052 placement
function acquireDiskWatchdogLock(e) {
  let n = `${env.CLAUDE_CODE_DIAGNOSTICS_FILE}.disk-watchdog.pid`;
  if (env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY)
    try {
      let r = claudeTempDir();
      (mkdirSync(r, { recursive: !0, mode: 448 }),
        verifyTempDirOwnership(r),
        (n = join_90(r, RESOURCE_WATCHDOG_PID)));
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
  for (let r = 0; r < 2; r++) {
    let s = !1;
    try {
      (writeFileSync(n, `${process.pid}:${processStartTime(process.pid)}`, { flag: "wx" }), (s = !0));
    } catch (error) {
      if (isDiskFullErrno(error)) return "disk_full";
      let y = readCertFileSync(n, WRn, { refuseLinkOnWindows: !0 });
      if (y.kind !== "ok") return "error";
      let trimmed = y.text.trim(),
        [w, L = ""] = trimmed.split(":"),
        G = Number(w);
      if (Number.isInteger(G) && G > 0 && isLockHolderAlive(G, L)) return "held";
      let q = `${n}.stale.${process.pid}`;
      try {
        renameSync(n, q);
      } catch {
        continue;
      }
      let Z = readCertFileSync(q, WRn, { refuseLinkOnWindows: !0 });
      if (Z.kind !== "ok" || Z.text.trim() !== trimmed) {
        try {
          renameSync(q, n);
        } catch {}
        return "held";
      }
      try {
        unlinkSync_2(q);
      } catch {}
      continue;
    }
    if (s)
      return (
        (e.lockPath = n),
        registerCleanup(() => {
          releaseWatchdogLock(e);
        }),
        "acquired"
      );
  }
  return "error";
}
//@ chunk-e6aww6q8.js:3302052-3302188 placement
function releaseWatchdogLock(e) {
  if (e.lockPath === void 0) return;
  try {
    if (basename_50(e.lockPath) === RESOURCE_WATCHDOG_PID) verifyTempDirOwnership(dirname_50(e.lockPath));
    unlinkSync_2(e.lockPath);
  } catch {}
  e.lockPath = void 0;
}
//@ chunk-e6aww6q8.js:3302188-3302241 placement
function eet(e) {
  ((e.armed = !0), (e.status = void 0), (e.told = !1));
}
//@ chunk-e6aww6q8.js:3302241-3302368 placement
function isWatchdogTelemetryEnabled() {
  if (env.CLAUDECODE) return !1;
  return env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY || Boolean(env.CLAUDE_CODE_DIAGNOSTICS_FILE);
}
//@ chunk-e6aww6q8.js:3302368-3302470 placement
function shouldReportWatchdog() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND !== "byoc" || env.CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY;
}
//@ chunk-e6aww6q8.js:3302470-3302627 placement
function lowResourceThresholds() {
  return isChildSession()
    ? { diskLowGib: 0, memoryLowGib: 0 }
    : {
        diskLowGib: env.CLAUDE_CODE_WARN_DISK_FREE_GIB ?? 0,
        memoryLowGib: env.CLAUDE_CODE_WARN_MEMORY_FREE_GIB ?? 0,
      };
}

export { j8s, JRn, lowResourceReminders };
