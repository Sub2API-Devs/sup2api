/**
 * daemon/deadProbe.ts
 *
 * 2.1.316 新增：确认进程身份未变后发送 SIGTERM。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gg3tj8q5.js (6)
 * attribution: placement 6
 */
import { readFile } from "fs/promises";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getProcessStartTimeAsync } from "../utils/processIdentity.js";
import { killProcessGroup } from "../utils/auth/lockHolderLiveness.js";

//@ chunk-gg3tj8q5.js:442-618 placement
class AdoptTicksTokenLogger {
  firedSites = new Set();
  fire(e) {
    if (this.firedSites.has(e)) return;
    this.firedSites.add(e);
    logEvent("tengu_dead_probe_adopt_ticks_token", {
      site: fromEnum(e),
    });
  }
  reset() {
    this.firedSites.clear();
  }
}
//@ chunk-gg3tj8q5.js:618-641 placement
var deadProbeSlot = new HostScoped(() => new AdoptTicksTokenLogger());
//@ chunk-gg3tj8q5.js:641-676 placement
function deadProbe() {
  return deadProbeSlot.of(getRootSession().host);
}
//@ chunk-gg3tj8q5.js:676-704 placement
/**
 * 函数 fireDeadProbe（触发探测）。
 */
function fireDeadProbe(e) {
  deadProbe().fire(e);
}
//@ chunk-gg3tj8q5.js:704-886 placement
/**
 * 从 /proc/<pid>/stat 读取进程启动时刻（clock ticks），用于确认进程身份；失败返回 null。
 */
async function readProcessStartTicks(e) {
  try {
    let file = await readFile(`/proc/${e}/stat`, "utf-8");
    let index = file.lastIndexOf(")");
    let parts = file.slice(index + 2).split(" ");
    let i = Number(parts[19]);
    return Number.isFinite(i) ? i : null;
  } catch {
    return null;
  }
}
//@ chunk-gg3tj8q5.js:886-1080 placement
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
  await killProcessGroup(pid, "SIGTERM").catch(() => {});
}
export { fireDeadProbe, readProcessStartTicks, killIfSameProcess };
