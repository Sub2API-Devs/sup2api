/**
 * daemon/deadProbe.ts
 *
 * 2.1.316 新增：确认进程身份未变后发送 SIGTERM。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xtdqw4wv.js (6)
 * attribution: placement 6
 */
import { readFile } from "fs/promises";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getProcessStartTimeAsync } from "../utils/processIdentity.js";
import { killProcessGroup } from "../utils/auth/lockHolderLiveness.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xtdqw4wv.js:442-618 placement
class AdoptTicksTokenLogger {
  firedSites = new Set();
  fire(site) {
    if (this.firedSites.has(site)) return;
    this.firedSites.add(site);
    logEvent("tengu_dead_probe_adopt_ticks_token", {
      site: fromEnum(site),
    });
  }
  reset() {
    this.firedSites.clear();
  }
}
//@ chunk-xtdqw4wv.js:618-641 placement
var deadProbeSlot; // deferred: uses AdoptTicksTokenLogger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xtdqw4wv.js:618", () => {
  deadProbeSlot = new HostScoped(() => new AdoptTicksTokenLogger());
});
//@ chunk-xtdqw4wv.js:641-676 placement
function deadProbe() {
  return deadProbeSlot.of(getRootSession().host);
}
//@ chunk-xtdqw4wv.js:676-704 placement
/**
 * 函数 fireDeadProbe（触发探测）。
 */
function fireDeadProbe(site) {
  deadProbe().fire(site);
}
//@ chunk-xtdqw4wv.js:704-886 placement
/**
 * 从 /proc/<pid>/stat 读取进程启动时刻（clock ticks），用于确认进程身份；失败返回 null。
 */
async function readProcessStartTicks(pid) {
  try {
    let file = await readFile(`/proc/${pid}/stat`, "utf-8");
    let index = file.lastIndexOf(")");
    let parts = file.slice(index + 2).split(" ");
    let startTicks = Number(parts[19]);
    return Number.isFinite(startTicks) ? startTicks : null;
  } catch {
    return null;
  }
}
//@ chunk-xtdqw4wv.js:886-1106 placement
/**
 * 确认进程身份未变后发送 SIGTERM。
 */
async function killIfSameProcess(pid, startTimeTicks, procStart) {
  if (procStart !== undefined) {
    if (
      (await getProcessStartTimeAsync(pid, {
        skipCache: true,
      })) !== procStart
    )
      return;
  } else if (startTimeTicks !== undefined) {
    fireDeadProbe("kill_gate");
    if ((await readProcessStartTicks(pid)) !== startTimeTicks) return;
  } else return;
  await killProcessGroup(pid, "SIGTERM", {
    groupMembersByPidToo: true,
  }).catch(() => {});
}
export { readProcessStartTicks, killIfSameProcess, fireDeadProbe };
