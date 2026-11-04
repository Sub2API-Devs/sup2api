/**
 * remote/tools/toolHostAdvert.ts
 *
 * 2.1.316 新增：工具宿主通告常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3zy56vtn.js (13), chunk-jd7h5dfe.js (1)
 * attribution: placement 14
 */
import { lstat, stat } from "fs/promises";
import { join } from "path";
import { identity } from "../../utils/identity.js";
import { readRadiantHeron } from "../../utils/featureFlagReadout.js";
import { isViolinWoodServedOff, isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import { getPlatform } from "../../utils/platform.js";
import {
  remoteToolServingOffReason,
  onServingMuteRecheck,
  isRemoteToolServingMuted,
} from "../../services/remoteTools/servingGates.js";
import {
  primeWindowsProfileDirs,
  onWindowsProfileDirsSettled,
} from "../../services/remoteTools/windowsProfileDirs.js";
import { isPolicyLimitsCacheLoaded } from "../../services/policyLimits/policyEvidence.js";
import { inExcludedRepository } from "../../utils/git/excludedRepository.js";
import { getBridgeTokenOverride } from "../../bridge/bridgeConfig.js";
import { startupReadsStoredLogin } from "../../utils/auth.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { getErrnoCode, isFsInaccessible, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { onComplianceTaintsChanged } from "../../services/policyLimits/complianceTaints.js";
import { onPolicyVerdictHeldStart } from "../../services/policyLimits/policyState.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  isRemoteControlDisabledBySettings,
  checkToolHostHelperPreconditions,
  runToolHostLoop,
  spawnToolHostHelper,
  SIGKILL_GRACE_MS,
} from "./toolHostHelper.js";

//@ chunk-jd7h5dfe.js:227-260 placement
var scopedMap = identity(new Map(), (map) => map.clear());
//@ chunk-3zy56vtn.js:14494-14548 placement
var PLATFORM_TO_NODE_NAME = {
  macos: "darwin",
  linux: "linux",
  windows: "win32",
};
//@ chunk-3zy56vtn.js:14548-15868 placement
async function advertiseToolHost(checks) {
  let gate = checks.gate();
  if (gate === false)
    return {
      kind: "withdraw",
      blocker: "gate_off",
    };
  let localFlag = checks.localDeviceFlag();
  if (localFlag === false)
    return {
      kind: "withdraw",
      blocker: "flag_off",
    };
  let nodeName = PLATFORM_TO_NODE_NAME[checks.platform()];
  if (nodeName === undefined)
    return {
      kind: "withdraw",
      blocker: "platform",
    };
  let offReason = await checks.offReason();
  if (offReason !== undefined && offReason !== "unknown")
    return {
      kind: "withdraw",
      blocker: offReason,
    };
  if (!(await checks.signsInFromStoredLogin()))
    return {
      kind: "withdraw",
      blocker: "not_stored_login",
    };
  let gitEntry = await checks.gitEntry();
  if (gitEntry === "other")
    return {
      kind: "withdraw",
      blocker: "not_git_checkout",
    };
  if (await checks.inExcludedRepository())
    return {
      kind: "withdraw",
      blocker: "excluded_repository",
    };
  if (gate === "unknown" || localFlag === "unknown")
    return {
      kind: "unknown",
      waitingOn: "feature_flags",
    };
  if (offReason === "unknown")
    return {
      kind: "unknown",
      waitingOn: "policy",
    };
  return {
    kind: "advertise",
    advert: {
      cliVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      platform: nodeName,
    },
    ...(gitEntry === "absent" && {
      withoutGit: true,
    }),
  };
}
//@ chunk-3zy56vtn.js:15868-16305 placement
function liveToolHostChecks(dir, credentials, gate = readRadiantHeron) {
  return {
    gate,
    localDeviceFlag: () => (isViolinWoodServedOff() ? false : isViolinWoodEnabledCached() || "unknown"),
    platform: getPlatform,
    offReason: async () => {
      let reason = remoteToolServingOffReason(dir);
      if (reason === "profile_dirs_unread" || reason === "profile_dirs_unreadable") {
        await primeWindowsProfileDirs();
        reason = remoteToolServingOffReason(dir);
      }
      if (reason !== undefined) return reason;
      let { servedToolsUnavailableReason } = await import("./servedToolsAttachOptions.lazy.js");
      let unavailable = servedToolsUnavailableReason();
      return unavailable === "policy_org" && !isPolicyLimitsCacheLoaded() ? "unknown" : unavailable;
    },
    signsInFromStoredLogin: () => hasStoredLoginRefreshToken(credentials),
    gitEntry: () => classifyGitEntry(dir),
    inExcludedRepository: () => inExcludedRepository(dir),
  };
}
//@ chunk-3zy56vtn.js:16305-16437 placement
async function hasStoredLoginRefreshToken(credentials) {
  if (getBridgeTokenOverride() !== undefined || !startupReadsStoredLogin()) return false;
  let async = await getSecureStorage().readAsync(credentials);
  return Boolean(async?.claudeAiOauth?.refreshToken);
}
//@ chunk-3zy56vtn.js:16437-16693 placement
async function classifyGitEntry(dir) {
  try {
    let stats = await lstat(join(dir, ".git"));
    return stats.isDirectory() || stats.isFile() ? "root" : "other";
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return (
        await stat(dir).catch((error) => {
          if (!isFsInaccessible(error)) logError(toError(error));
          return;
        })
      )?.isDirectory()
        ? "absent"
        : "other";
    if (!isFsInaccessible(error)) logError(toError(error));
    return "other";
  }
}
//@ chunk-3zy56vtn.js:16693-16812 placement
var ADVERT_RETRY_DELAY_MS = 3000;
var ADVERT_WAIT_BUDGET_MS = 120000;
var WITHDRAW_BLOCKER_BY_WAIT = {
  feature_flags: "flags_unloaded",
  policy: "policy_unloaded",
  failed_read: "error",
};
var MIN_READVERTISE_INTERVAL_MS = 1e4;
var READVERTISE_WINDOW_MS = 60000;
//@ chunk-3zy56vtn.js:16812-18426 placement
async function watchToolHostAdvert({
  dir,
  credentials,
  log,
  checks = liveToolHostChecks(dir, credentials),
  signals = [
    onServingMuteRecheck,
    onComplianceTaintsChanged,
    onPolicyVerdictHeldStart,
    onWindowsProfileDirsSettled,
  ],
  refuse,
  onVerdict,
}) {
  let verdict = {
    kind: "unknown",
    waitingOn: "feature_flags",
  };
  let blocker = "gate_off";
  let stopped = false;
  let cancelFeatureWait;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let reAdvertiseTimer;
  let startTime = performance.now();
  let advertWaitTimer;
  function settleVerdict(verdict) {
    if (verdict.kind !== "unknown") {
      startTime = undefined;
      clearTimeout(advertWaitTimer);
      advertWaitTimer = undefined;
      return verdict;
    }
    startTime ??= performance.now();
    let remainingMs = ADVERT_WAIT_BUDGET_MS - (performance.now() - startTime);
    if (remainingMs <= 0)
      return {
        kind: "withdraw",
        blocker: WITHDRAW_BLOCKER_BY_WAIT[verdict.waitingOn],
      };
    if (advertWaitTimer === undefined) {
      advertWaitTimer = setTimeout(() => {
        advertWaitTimer = undefined;
        refreshAdvert();
      }, remainingMs);
      advertWaitTimer.unref?.();
    }
    return verdict;
  }
  async function refreshAdvert() {
    try {
      let nextVerdict;
      try {
        nextVerdict = await advertiseToolHost(checks);
        let refusal = nextVerdict.kind === "advertise" ? refuse?.() : undefined;
        if (refusal !== undefined)
          nextVerdict = {
            kind: "withdraw",
            blocker: refusal,
          };
      } catch (error) {
        logError(toError(error));
        nextVerdict = {
          kind: "unknown",
          waitingOn: "failed_read",
        };
      }
      if (stopped) return;
      let settledVerdict = settleVerdict(nextVerdict);
      verdict = settledVerdict;
      onVerdict?.(settledVerdict);
      if (settledVerdict.kind === "unknown") return;
      let nextBlocker =
        settledVerdict.kind === "advertise"
          ? settledVerdict.withoutGit
            ? "advertised_without_git"
            : "advertised"
          : settledVerdict.blocker;
      if (nextBlocker !== blocker) {
        blocker = nextBlocker;
        log(
          `cloud sessions may use this folder: ${settledVerdict.kind === "advertise" ? (settledVerdict.withoutGit ? "yes (not the top folder of a git repository)" : "yes") : `no (${settledVerdict.blocker})`}`,
        );
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  function onSignal() {
    if (cancelFeatureWait !== undefined) {
      cancelFeatureWait();
      return;
    }
    if (stopped || reAdvertiseTimer !== undefined) return;
    if (verdict.kind === "unknown") {
      refreshAdvert();
      return;
    }
    let sinceAdvertMs = Date.now() - NEGATIVE_INFINITY;
    let delayMs =
      sinceAdvertMs >= 0 && sinceAdvertMs < READVERTISE_WINDOW_MS
        ? Math.max(MIN_READVERTISE_INTERVAL_MS, READVERTISE_WINDOW_MS - sinceAdvertMs)
        : MIN_READVERTISE_INTERVAL_MS;
    reAdvertiseTimer = setTimeout(() => {
      reAdvertiseTimer = undefined;
      NEGATIVE_INFINITY = Date.now();
      refreshAdvert();
    }, delayMs);
    reAdvertiseTimer.unref?.();
  }
  await refreshAdvert();
  let mapped = signals.map((signal) => signal(onSignal));
  if (verdict.kind === "unknown" && verdict.waitingOn === "feature_flags") {
    let abortController = new AbortController();
    cancelFeatureWait = () => {
      refreshAdvert().then(() => {
        if (verdict.kind !== "unknown") abortController.abort();
      });
    };
    await sleep(ADVERT_RETRY_DELAY_MS, abortController.signal);
    cancelFeatureWait = undefined;
  }
  return {
    getToolHostAdvert: () =>
      verdict.kind === "advertise"
        ? {
            kind: "advertise",
            advert: verdict.advert,
          }
        : {
            kind: verdict.kind,
          },
    stop: () => {
      stopped = true;
      for (let unsubscribe of mapped) unsubscribe();
      clearTimeout(reAdvertiseTimer);
      reAdvertiseTimer = undefined;
      clearTimeout(advertWaitTimer);
      advertWaitTimer = undefined;
    },
  };
}
//@ chunk-3zy56vtn.js:18426-18540 placement
function isSwitchedOffRemotely(verdict) {
  return (
    verdict.kind === "withdraw" &&
    (verdict.blocker === "gate_off" || verdict.blocker === "flag_off" || verdict.blocker === "muted")
  );
}
//@ chunk-3zy56vtn.js:18540-18888 placement
function liveToolHostSwitches({ dir, checks, isOfferingFolder, hasAccessToken }) {
  function offReasonIgnoringMute() {
    return remoteToolServingOffReason(dir, {
      ignoringMute: true,
    });
  }
  return {
    gateOn: () => checks.gate() === true && checks.localDeviceFlag() === true && !isRemoteToolServingMuted(),
    servingOn: () => {
      if (!hasAccessToken() || !isOfferingFolder() || helperRefusal() !== undefined) return false;
      let offReason = offReasonIgnoringMute();
      if (offReason !== undefined && offReason !== "launched_from_home") return false;
      return !isRemoteControlDisabledBySettings();
    },
    folderServed: () => offReasonIgnoringMute() !== "launched_from_home",
  };
}
//@ chunk-3zy56vtn.js:18888-19039 placement
function helperRefusal(envVars = getProcessEnv()) {
  let refusal = checkToolHostHelperPreconditions(envVars);
  if (refusal === undefined) return;
  return refusal.message.includes("signs in or sends its traffic elsewhere") ? "other_sign_in" : "no_helper";
}
//@ chunk-3zy56vtn.js:19039-19114 placement
function buildToolHostWorkHandler(options, spawnExtra) {
  return runToolHostLoop({
    ...options,
    spawnHelper: (work) =>
      spawnToolHostHelper(work, {
        env: getProcessEnv(),
        ...spawnExtra,
      }),
  });
}
//@ chunk-3zy56vtn.js:19114-19191 placement
async function sweepToolHostForShutdown(toolHost) {
  try {
    await withDeadline(toolHost.sweep("shutdown"), SIGKILL_GRACE_MS);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-3zy56vtn.js:19191-19224 placement
function getProcessEnv() {
  return process.env;
}
export {
  liveToolHostChecks,
  liveToolHostSwitches,
  isSwitchedOffRemotely,
  watchToolHostAdvert,
  helperRefusal,
  buildToolHostWorkHandler,
  sweepToolHostForShutdown,
};
