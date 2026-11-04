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
  PROCESS_WRAPPER_ENV,
  processWrapperArgv,
} from "./processWrapper.js";
import { logFeatureBadAsync } from "../services/analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush, flushAnalyticsBeforeExit } from "../cli/exit.js";
import { withHostOwnedEnv } from "./settings/hostEnvWrites.js";
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
async function execRelaunch({ proactivity, pinToCurrentBinary } = {}) {
  assertProgramLaunchAllowed();
  await new Promise((resolve) => setImmediate(resolve));
  if (!(await isProcessWrapperUsable())) {
    await logFeatureBadAsync("agent_launcher", "relaunch_launcher_not_runnable");
    process.stderr.write(`
${processWrapperError() ?? `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then start claude again`}
`);
    return exitAfterAnalyticsFlush(1);
  }
  let launchSpec = withHostOwnedEnv(() => ({
    invocation: getLaunchCommand({
      pinToCurrentBinary,
    }),
    env: {
      ...process.env,
    },
  }));
  let { cmd, prefixArgs } = launchSpec.invocation;
  let argv = process.argv.slice(2);
  let childEnv = withLaunchValuesOfHybridConnection(withoutProtectedEnv(launchSpec.env));
  noopStdinReset(childEnv);
  delete childEnv[CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE];
  Object.assign(childEnv, getRelaunchTerminalSizeEnv());
  noopRelaunch(childEnv, argv);
  delete childEnv[RELAUNCH_PROACTIVITY_BASELINE_ENV];
  delete childEnv[CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED];
  delete childEnv[CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON];
  delete childEnv[CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL];
  if (proactivity) {
    Object.assign(childEnv, proactivityLevelEnv(proactivity));
    if (hasExplicitPermissionMode(argv))
      Object.assign(childEnv, proactivityBaselineEnv(proactivity), undecidedProactivityEnv(proactivity));
  }
  pauseNonBlockingStdout();
  if (getPlatform() === "windows") {
    for (let signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
      process.removeAllListeners(signal);
      process.on(signal, () => {});
    }
    await Promise.all([
      withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (relaunch)").catch(() => {}),
      flushAnalyticsBeforeExit(),
    ]);
    resetWindowsStdinMode();
    let windowsChild = spawnSync(cmd, [...prefixArgs, ...argv], {
      stdio: "inherit",
      env: childEnv,
    });
    if (windowsChild.error) {
      process.stderr.write(`Failed to relaunch Claude Code: ${windowsChild.error.message}
`);
      setBgExitCause("relaunch_child_error");
    }
    process.exit(windowsChild.status ?? 1);
  }
  let child = spawn(cmd, [...prefixArgs, ...argv], {
    stdio: "inherit",
    env: childEnv,
  });
  closeInheritedTtyFds();
  let forwardedSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (let signal of forwardedSignals)
    process.on(signal, () => {
      try {
        child.kill(signal);
      } catch {}
    });
  return new Promise(() => {
    child.on("close", (exitCode, exitSignal) => {
      let signalExitCode = exitSignal ? 128 + (constants.signals[exitSignal] ?? 0) : 0;
      process.exit(exitCode ?? signalExitCode);
    });
    child.on("error", (spawnError) => {
      process.stderr.write(`Failed to relaunch Claude Code: ${spawnError.message}
`);
      setBgExitCause("relaunch_child_error");
      process.exit(1);
    });
  });
}
export { execRelaunch };
