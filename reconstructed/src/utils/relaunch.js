/**
 * utils/relaunch.ts
 *
 * 2.1.316 新增：重启自身进程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sv7j935w.js (2)
 * attribution: placement 2
 */
import { isatty } from "tty";
import { closeSync } from "fs";
import { spawnSync, spawn } from "child_process";
import { constants } from "os";
import { assertProgramLaunchAllowed } from "./disklessSession.js";
import {
  isProcessWrapperUsable,
  processWrapperError,
  PROCESS_WRAPPER_ENV_2,
  processWrapperArgv,
} from "./processWrapper.js";
import { logFeatureBadAsync } from "../services/analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush, flushAnalyticsBeforeExit } from "../cli/exit.js";
import { withHostOwnedEnv } from "./settings/managedSettingsFiles.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { withLaunchValuesOfHybridConnection } from "./managedEnvApply.js";
import { withoutProtectedEnv } from "./permissions/protectedSettingsPaths.js";
import { noopStdinReset, resetWindowsStdinMode } from "./windowsStdin.js";
import { CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE, getRelaunchTerminalSizeEnv } from "./relaunchTerminalSize.js";
import { noopRelaunch } from "./stubs.js";
import {
  RELAUNCH_PROACTIVITY_BASELINE_ENV,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON,
  CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL,
  proactivityLevelEnv,
  hasExplicitPermissionMode,
  proactivityBaselineEnv,
  undecidedProactivityEnv,
} from "./proactivityRelaunch.js";
import { pauseNonBlockingStdout } from "../ink/nonBlockingStdout.js";
import { getPlatform } from "./platform.js";
import { withTimeout } from "./sleep.js";
import { drainRegisteredWriteQueues } from "./settings/writeQueues.js";
import { setBgExitCause } from "./bgExitSidecars.js";

//@ chunk-sv7j935w.js:4136-4222 placement
function closeInheritedTtyFds() {
  for (let i = 0; i < 32; i++) {
    if (i === 1 || i === 2) continue;
    try {
      if (isatty(i)) closeSync(i);
    } catch {}
  }
}
//@ chunk-sv7j935w.js:4222-5704 placement
async function execRelaunch({ proactivity: o, pinToCurrentBinary: l } = {}) {
  assertProgramLaunchAllowed();
  await new Promise((resolve) => setImmediate(resolve));
  if (!(await isProcessWrapperUsable())) {
    await logFeatureBadAsync("agent_launcher", "relaunch_launcher_not_runnable");
    process.stderr.write(`
${processWrapperError() ?? `${PROCESS_WRAPPER_ENV_2}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then start claude again`}
`);
    return exitAfterAnalyticsFlush(1);
  }
  let s = withHostOwnedEnv(() => ({
    invocation: getLaunchCommand({
      pinToCurrentBinary: l,
    }),
    env: {
      ...process.env,
    },
  }));
  let { cmd, prefixArgs } = s.invocation;
  let sliced = process.argv.slice(2);
  let e = withLaunchValuesOfHybridConnection(withoutProtectedEnv(s.env));
  noopStdinReset(e);
  delete e[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE];
  Object.assign(e, getRelaunchTerminalSizeEnv());
  noopRelaunch(e, sliced);
  delete e[RELAUNCH_PROACTIVITY_BASELINE_ENV];
  delete e[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED];
  delete e[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON];
  delete e[CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL];
  if (o) {
    Object.assign(e, proactivityLevelEnv(o));
    if (hasExplicitPermissionMode(sliced))
      Object.assign(e, proactivityBaselineEnv(o), undecidedProactivityEnv(o));
  }
  pauseNonBlockingStdout();
  if (getPlatform() === "windows") {
    for (let t of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
      process.removeAllListeners(t);
      process.on(t, () => {});
    }
    await Promise.all([
      withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (relaunch)").catch(() => {}),
      flushAnalyticsBeforeExit(),
    ]);
    resetWindowsStdinMode();
    let r = spawnSync(cmd, [...prefixArgs, ...sliced], {
      stdio: "inherit",
      env: e,
    });
    if (r.error) {
      process.stderr.write(`Failed to relaunch Claude Code: ${r.error.message}
`);
      setBgExitCause("relaunch_child_error");
    }
    process.exit(r.status ?? 1);
  }
  let i = spawn(cmd, [...prefixArgs, ...sliced], {
    stdio: "inherit",
    env: e,
  });
  closeInheritedTtyFds();
  let m = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (let r of m)
    process.on(r, () => {
      try {
        i.kill(r);
      } catch {}
    });
  return new Promise(() => {
    i.on("close", (r, t) => {
      let u = t ? 128 + (constants.signals[t] ?? 0) : 0;
      process.exit(r ?? u);
    });
    i.on("error", (r) => {
      process.stderr.write(`Failed to relaunch Claude Code: ${r.message}
`);
      setBgExitCause("relaunch_child_error");
      process.exit(1);
    });
  });
}
