/**
 * services/preventSleep.ts
 *
 * 防止系统睡眠（macOS caffeinate）的入口模块；实际实现类在 _unattributed/chunk-0sfjpx19，本模块里多为错配的进程组 kill、ssh 探测与 launchctl asuser 包装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/preventSleep.ts
 * pieces: chunk-0sfjpx19.js (4)
 * attribution: placement 4
 */
import { spawn } from "child_process";
import {
  SLEEP_RELEASE_DELAY_MS,
  CAFFEINATE_TIMEOUT_SECONDS,
  CAFFEINATE_RESTART_INTERVAL_MS,
} from "../cli/print/bridgeTokenUsageMirror.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { helperProcessEnv } from "../utils/settings/policyHelper/helperEnv.js";
import { subprocessEnv } from "../utils/subprocessEnv.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0sfjpx19.js:47509-49786 placement
/**
 * 防睡眠：引用计数 acquire/release；macOS 上 spawn caffeinate -i -t 300，每 4 分钟重启一次；计数归零 30 秒后杀掉进程；退出时清理。非 macOS 不做事（Linux 预留 systemd-inhibit 字段）。
 */
class SleepPreventer {
  inhibitorProcess = null;
  restartInterval = null;
  pendingKillTimeout = null;
  refCount = 0;
  cleanupRegistered = false;
  spawnDisabledForTests = false;
  linuxInhibitor = "systemd-inhibit";
  linuxDetectionStarted = false;
  setSpawnDisabledForTests(spawnDisabledForTests) {
    this.spawnDisabledForTests = spawnDisabledForTests;
  }
  acquire() {
    this.refCount++;
    if (this.refCount === 1) {
      if (this.pendingKillTimeout !== null) {
        clearTimeout(this.pendingKillTimeout);
        this.pendingKillTimeout = null;
      }
      this.spawnInhibitor();
      this.startRestartInterval();
    }
  }
  release() {
    if (this.refCount > 0) this.refCount--;
    if (this.refCount === 0 && this.pendingKillTimeout === null) {
      this.pendingKillTimeout = setTimeout(() => {
        this.pendingKillTimeout = null;
        this.stopRestartInterval();
        this.killInhibitor();
      }, SLEEP_RELEASE_DELAY_MS);
      this.pendingKillTimeout.unref();
    }
  }
  forceStop() {
    this.refCount = 0;
    if (this.pendingKillTimeout !== null) {
      clearTimeout(this.pendingKillTimeout);
      this.pendingKillTimeout = null;
    }
    this.stopRestartInterval();
    this.killInhibitor();
  }
  isHolding() {
    return this.inhibitorProcess !== null;
  }
  getSpawnArgs() {
    if (this.spawnDisabledForTests || !isMacOS()) return null;
    let timeoutSeconds = String(CAFFEINATE_TIMEOUT_SECONDS);
    if (getPlatform() === "macos") return ["caffeinate", ["-i", "-t", timeoutSeconds]];
    return null;
  }
  startRestartInterval() {
    if (this.getSpawnArgs() === null) return;
    if (this.restartInterval !== null) return;
    this.restartInterval = setInterval(() => {
      if (this.refCount > 0 || this.pendingKillTimeout !== null) {
        logForDebugging("Restarting sleep inhibitor to maintain prevention");
        this.killInhibitor();
        this.spawnInhibitor();
      }
    }, CAFFEINATE_RESTART_INTERVAL_MS);
    this.restartInterval.unref();
  }
  stopRestartInterval() {
    if (this.restartInterval !== null) {
      clearInterval(this.restartInterval);
      this.restartInterval = null;
    }
  }
  spawnInhibitor() {
    let spawnArgs = this.getSpawnArgs();
    if (spawnArgs === null) return;
    if (this.inhibitorProcess !== null) return;
    if (!this.cleanupRegistered) {
      this.cleanupRegistered = true;
      registerCleanup(async () => {
        this.forceStop();
      });
    }
    try {
      let [command, args] = spawnArgs;
      let child = spawn(command, args, {
        stdio: "ignore",
        windowsHide: true,
        env: helperProcessEnv(subprocessEnv(), getPlatform() === "windows" ? "win32" : "posix"),
      });
      this.inhibitorProcess = child;
      child.unref();
      child.on("error", (spawnError) => {
        logForDebugging(`sleep inhibitor spawn error: ${spawnError.message}`);
        if (this.inhibitorProcess === child) this.inhibitorProcess = null;
      });
      child.on("exit", () => {
        if (this.inhibitorProcess === child) this.inhibitorProcess = null;
      });
      logForDebugging(`Started ${command} to prevent sleep`);
    } catch {
      this.inhibitorProcess = null;
    }
  }
  killInhibitor() {
    if (this.inhibitorProcess !== null) {
      let inhibitorProcess = this.inhibitorProcess;
      this.inhibitorProcess = null;
      try {
        inhibitorProcess.kill("SIGKILL");
        logForDebugging("Stopped sleep inhibitor, allowing sleep");
      } catch {}
    }
  }
}
//@ chunk-0sfjpx19.js:49786-49811 placement
var sleepPreventerByHost; // deferred: uses SleepPreventer of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:49786", () => {
  sleepPreventerByHost = new HostScoped(() => new SleepPreventer());
});
//@ chunk-0sfjpx19.js:49811-49848 placement
function getSleepPreventer() {
  return sleepPreventerByHost.of(getRootSession().host);
}
//@ chunk-0sfjpx19.js:49848-49898 placement (2.1.88 match: getReservedShortcuts, 1)
function isMacOS() {
  if (getPlatform() === "macos") return true;
  return false;
}
export { getSleepPreventer, isMacOS };
