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
import { identity } from "../../utils/identity.js";

//@ chunk-3zy56vtn.js:14494-14548 placement
var PLATFORM_TO_NODE_NAME = {
  macos: "darwin",
  linux: "linux",
  windows: "win32",
};
//@ chunk-3zy56vtn.js:14548-15868 placement
async function advertiseToolHost(checks) {
  let n = checks.gate();
  if (n === false)
    return {
      kind: "withdraw",
      blocker: "gate_off",
    };
  let s = checks.localDeviceFlag();
  if (s === false)
    return {
      kind: "withdraw",
      blocker: "flag_off",
    };
  let c = PLATFORM_TO_NODE_NAME[checks.platform()];
  if (c === undefined)
    return {
      kind: "withdraw",
      blocker: "platform",
    };
  let w = await checks.offReason();
  if (w !== undefined && w !== "unknown")
    return {
      kind: "withdraw",
      blocker: w,
    };
  if (!(await checks.signsInFromStoredLogin()))
    return {
      kind: "withdraw",
      blocker: "not_stored_login",
    };
  let O = await checks.gitEntry();
  if (O === "other")
    return {
      kind: "withdraw",
      blocker: "not_git_checkout",
    };
  if (await checks.inExcludedRepository())
    return {
      kind: "withdraw",
      blocker: "excluded_repository",
    };
  if (n === "unknown" || s === "unknown")
    return {
      kind: "unknown",
      waitingOn: "feature_flags",
    };
  if (w === "unknown")
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
      platform: c,
    },
    ...(O === "absent" && {
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
      let c = remoteToolServingOffReason(dir);
      if (c === "profile_dirs_unread" || c === "profile_dirs_unreadable") {
        await primeWindowsProfileDirs();
        c = remoteToolServingOffReason(dir);
      }
      if (c !== undefined) return c;
      let { servedToolsUnavailableReason } = await import("./chunk-012rhzq5.js");
      let O = servedToolsUnavailableReason();
      return O === "policy_org" && !isPolicyLimitsCacheLoaded() ? "unknown" : O;
    },
    signsInFromStoredLogin: () => hasStoredLoginRefreshToken(credentials),
    gitEntry: () => classifyGitEntry(dir),
    inExcludedRepository: () => inExcludedRepository(dir),
  };
}
//@ chunk-3zy56vtn.js:16305-16437 placement
async function hasStoredLoginRefreshToken(e) {
  if (getBridgeTokenOverride() !== undefined || !startupReadsStoredLogin()) return false;
  let async = await getSecureStorage().readAsync(e);
  return Boolean(async?.claudeAiOauth?.refreshToken);
}
//@ chunk-3zy56vtn.js:16437-16693 placement
async function classifyGitEntry(e) {
  try {
    let n = await lstat(join(e, ".git"));
    return n.isDirectory() || n.isFile() ? "root" : "other";
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return (
        await stat(e).catch((error) => {
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
  let b = {
    kind: "unknown",
    waitingOn: "feature_flags",
  };
  let x = "gate_off";
  let y = false;
  let V;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let S;
  let startTime = performance.now();
  let G;
  function te(H) {
    if (H.kind !== "unknown") {
      startTime = undefined;
      clearTimeout(G);
      G = undefined;
      return H;
    }
    startTime ??= performance.now();
    let L = ADVERT_WAIT_BUDGET_MS - (performance.now() - startTime);
    if (L <= 0)
      return {
        kind: "withdraw",
        blocker: WITHDRAW_BLOCKER_BY_WAIT[H.waitingOn],
      };
    if (G === undefined) {
      G = setTimeout(() => {
        G = undefined;
        j();
      }, L);
      G.unref?.();
    }
    return H;
  }
  async function j() {
    try {
      let H;
      try {
        H = await advertiseToolHost(checks);
        let Y = H.kind === "advertise" ? refuse?.() : undefined;
        if (Y !== undefined)
          H = {
            kind: "withdraw",
            blocker: Y,
          };
      } catch (error) {
        logError(toError(error));
        H = {
          kind: "unknown",
          waitingOn: "failed_read",
        };
      }
      if (y) return;
      let L = te(H);
      b = L;
      onVerdict?.(L);
      if (L.kind === "unknown") return;
      let Z = L.kind === "advertise" ? (L.withoutGit ? "advertised_without_git" : "advertised") : L.blocker;
      if (Z !== x) {
        x = Z;
        log(
          `cloud sessions may use this folder: ${L.kind === "advertise" ? (L.withoutGit ? "yes (not the top folder of a git repository)" : "yes") : `no (${L.blocker})`}`,
        );
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  function ee() {
    if (V !== undefined) {
      V();
      return;
    }
    if (y || S !== undefined) return;
    if (b.kind === "unknown") {
      j();
      return;
    }
    let H = Date.now() - NEGATIVE_INFINITY;
    let L =
      H >= 0 && H < READVERTISE_WINDOW_MS
        ? Math.max(MIN_READVERTISE_INTERVAL_MS, READVERTISE_WINDOW_MS - H)
        : MIN_READVERTISE_INTERVAL_MS;
    S = setTimeout(() => {
      S = undefined;
      NEGATIVE_INFINITY = Date.now();
      j();
    }, L);
    S.unref?.();
  }
  await j();
  let mapped = signals.map((signal) => signal(ee));
  if (b.kind === "unknown" && b.waitingOn === "feature_flags") {
    let abortController = new AbortController();
    V = () => {
      j().then(() => {
        if (b.kind !== "unknown") abortController.abort();
      });
    };
    await sleep(ADVERT_RETRY_DELAY_MS, abortController.signal);
    V = undefined;
  }
  return {
    getToolHostAdvert: () =>
      b.kind === "advertise"
        ? {
            kind: "advertise",
            advert: b.advert,
          }
        : {
            kind: b.kind,
          },
    stop: () => {
      y = true;
      for (let H of mapped) H();
      clearTimeout(S);
      S = undefined;
      clearTimeout(G);
      G = undefined;
    },
  };
}
//@ chunk-3zy56vtn.js:18426-18540 placement
function isSwitchedOffRemotely(e) {
  return (
    e.kind === "withdraw" && (e.blocker === "gate_off" || e.blocker === "flag_off" || e.blocker === "muted")
  );
}
//@ chunk-3zy56vtn.js:18540-18888 placement
function liveToolHostSwitches({ dir, checks, isOfferingFolder, hasAccessToken }) {
  function w() {
    return remoteToolServingOffReason(dir, {
      ignoringMute: true,
    });
  }
  return {
    gateOn: () => checks.gate() === true && checks.localDeviceFlag() === true && !isRemoteToolServingMuted(),
    servingOn: () => {
      if (!hasAccessToken() || !isOfferingFolder() || helperRefusal() !== undefined) return false;
      let O = w();
      if (O !== undefined && O !== "launched_from_home") return false;
      return !isRemoteControlDisabledBySettings();
    },
    folderServed: () => w() !== "launched_from_home",
  };
}
//@ chunk-3zy56vtn.js:18888-19039 placement
function helperRefusal(e = getProcessEnv()) {
  let n = checkToolHostHelperPreconditions(e);
  if (n === undefined) return;
  return n.message.includes("signs in or sends its traffic elsewhere") ? "other_sign_in" : "no_helper";
}
//@ chunk-3zy56vtn.js:19039-19114 placement
function buildToolHostWorkHandler(e, n) {
  return runToolHostLoop({
    ...e,
    spawnHelper: (s) =>
      spawnToolHostHelper(s, {
        env: getProcessEnv(),
        ...n,
      }),
  });
}
//@ chunk-3zy56vtn.js:19114-19191 placement
async function sweepToolHostForShutdown(e) {
  try {
    await withDeadline(e.sweep("shutdown"), SIGKILL_GRACE_MS);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-3zy56vtn.js:19191-19224 placement
function getProcessEnv() {
  return process.env;
}
//@ chunk-jd7h5dfe.js:227-260 placement
var scopedMap = identity(new Map(), (o) => o.clear());
export {
  liveToolHostChecks,
  liveToolHostSwitches,
  isSwitchedOffRemotely,
  watchToolHostAdvert,
  helperRefusal,
  buildToolHostWorkHandler,
  sweepToolHostForShutdown,
};
