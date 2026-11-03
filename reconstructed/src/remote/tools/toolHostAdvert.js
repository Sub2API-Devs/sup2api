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
  Se,
} from "./toolHostHelper.js";
import { ge } from "../../utils/identity.js";

//@ chunk-3zy56vtn.js:14494-14548 placement
var bt = { macos: "darwin", linux: "linux", windows: "win32" };
//@ chunk-3zy56vtn.js:14548-15868 placement
async function advertiseToolHost(e) {
  let gate = e.gate();
  if (gate === !1) return { kind: "withdraw", blocker: "gate_off" };
  let localDeviceFlag = e.localDeviceFlag();
  if (localDeviceFlag === !1) return { kind: "withdraw", blocker: "flag_off" };
  let c = bt[e.platform()];
  if (c === void 0) return { kind: "withdraw", blocker: "platform" };
  let offReason = await e.offReason();
  if (offReason !== void 0 && offReason !== "unknown") return { kind: "withdraw", blocker: offReason };
  if (!(await e.signsInFromStoredLogin())) return { kind: "withdraw", blocker: "not_stored_login" };
  let gitEntry = await e.gitEntry();
  if (gitEntry === "other") return { kind: "withdraw", blocker: "not_git_checkout" };
  if (await e.inExcludedRepository()) return { kind: "withdraw", blocker: "excluded_repository" };
  if (gate === "unknown" || localDeviceFlag === "unknown")
    return { kind: "unknown", waitingOn: "feature_flags" };
  if (offReason === "unknown") return { kind: "unknown", waitingOn: "policy" };
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
    ...(gitEntry === "absent" && { withoutGit: !0 }),
  };
}
//@ chunk-3zy56vtn.js:15868-16305 placement
function liveToolHostChecks(e, n, s = readRadiantHeron) {
  return {
    gate: s,
    localDeviceFlag: () => (isViolinWoodServedOff() ? !1 : isViolinWoodEnabledCached() || "unknown"),
    platform: getPlatform,
    offReason: async () => {
      let c = remoteToolServingOffReason(e);
      if (c === "profile_dirs_unread" || c === "profile_dirs_unreadable")
        (await primeWindowsProfileDirs(), (c = remoteToolServingOffReason(e)));
      if (c !== void 0) return c;
      let { servedToolsUnavailableReason: servedToolsUnavailableReason } =
          await import("./chunk-012rhzq5.js"),
        O = servedToolsUnavailableReason();
      return O === "policy_org" && !isPolicyLimitsCacheLoaded() ? "unknown" : O;
    },
    signsInFromStoredLogin: () => hasStoredLoginRefreshToken(n),
    gitEntry: () => classifyGitEntry(e),
    inExcludedRepository: () => inExcludedRepository(e),
  };
}
//@ chunk-3zy56vtn.js:16305-16437 placement
async function hasStoredLoginRefreshToken(e) {
  if (getBridgeTokenOverride() !== void 0 || !startupReadsStoredLogin()) return !1;
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
        await stat(e).catch((w) => {
          if (!isFsInaccessible(w)) logError(toError(w));
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
var ADVERT_RETRY_DELAY_MS = 3000,
  ADVERT_WAIT_BUDGET_MS = 120000,
  WITHDRAW_BLOCKER_BY_WAIT = {
    feature_flags: "flags_unloaded",
    policy: "policy_unloaded",
    failed_read: "error",
  },
  MIN_READVERTISE_INTERVAL_MS = 1e4,
  READVERTISE_WINDOW_MS = 60000;
//@ chunk-3zy56vtn.js:16812-18426 placement
async function watchToolHostAdvert({
  dir: dir,
  credentials: credentials,
  log: log,
  checks: checks = liveToolHostChecks(dir, credentials),
  signals: signals = [
    onServingMuteRecheck,
    onComplianceTaintsChanged,
    onPolicyVerdictHeldStart,
    onWindowsProfileDirsSettled,
  ],
  refuse: refuse,
  onVerdict: onVerdict,
}) {
  let b = { kind: "unknown", waitingOn: "feature_flags" },
    x = "gate_off",
    y = !1,
    V,
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    S,
    startTime = performance.now(),
    G;
  function te(H) {
    if (H.kind !== "unknown") return ((startTime = void 0), clearTimeout(G), (G = void 0), H);
    startTime ??= performance.now();
    let L = ADVERT_WAIT_BUDGET_MS - (performance.now() - startTime);
    if (L <= 0) return { kind: "withdraw", blocker: WITHDRAW_BLOCKER_BY_WAIT[H.waitingOn] };
    if (G === void 0)
      ((G = setTimeout(() => {
        ((G = void 0), j());
      }, L)),
        G.unref?.());
    return H;
  }
  async function j() {
    try {
      let H;
      try {
        H = await advertiseToolHost(checks);
        let Y = H.kind === "advertise" ? refuse?.() : void 0;
        if (Y !== void 0) H = { kind: "withdraw", blocker: Y };
      } catch (error) {
        (logError(toError(error)), (H = { kind: "unknown", waitingOn: "failed_read" }));
      }
      if (y) return;
      let L = te(H);
      if (((b = L), onVerdict?.(L), L.kind === "unknown")) return;
      let Z = L.kind === "advertise" ? (L.withoutGit ? "advertised_without_git" : "advertised") : L.blocker;
      if (Z !== x)
        ((x = Z),
          log(
            `cloud sessions may use this folder: ${L.kind === "advertise" ? (L.withoutGit ? "yes (not the top folder of a git repository)" : "yes") : `no (${L.blocker})`}`,
          ));
    } catch (error) {
      logError(toError(error));
    }
  }
  function ee() {
    if (V !== void 0) {
      V();
      return;
    }
    if (y || S !== void 0) return;
    if (b.kind === "unknown") {
      j();
      return;
    }
    let H = Date.now() - NEGATIVE_INFINITY,
      L =
        H >= 0 && H < READVERTISE_WINDOW_MS
          ? Math.max(MIN_READVERTISE_INTERVAL_MS, READVERTISE_WINDOW_MS - H)
          : MIN_READVERTISE_INTERVAL_MS;
    ((S = setTimeout(() => {
      ((S = void 0), (NEGATIVE_INFINITY = Date.now()), j());
    }, L)),
      S.unref?.());
  }
  await j();
  let mapped = signals.map((H) => H(ee));
  if (b.kind === "unknown" && b.waitingOn === "feature_flags") {
    let abortController = new AbortController();
    ((V = () => {
      j().then(() => {
        if (b.kind !== "unknown") abortController.abort();
      });
    }),
      await sleep(ADVERT_RETRY_DELAY_MS, abortController.signal),
      (V = void 0));
  }
  return {
    getToolHostAdvert: () =>
      b.kind === "advertise" ? { kind: "advertise", advert: b.advert } : { kind: b.kind },
    stop: () => {
      y = !0;
      for (let H of mapped) H();
      (clearTimeout(S), (S = void 0), clearTimeout(G), (G = void 0));
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
function liveToolHostSwitches({
  dir: dir,
  checks: checks,
  isOfferingFolder: isOfferingFolder,
  hasAccessToken: hasAccessToken,
}) {
  function w() {
    return remoteToolServingOffReason(dir, { ignoringMute: !0 });
  }
  return {
    gateOn: () => checks.gate() === !0 && checks.localDeviceFlag() === !0 && !isRemoteToolServingMuted(),
    servingOn: () => {
      if (!hasAccessToken() || !isOfferingFolder() || helperRefusal() !== void 0) return !1;
      let O = w();
      if (O !== void 0 && O !== "launched_from_home") return !1;
      return !isRemoteControlDisabledBySettings();
    },
    folderServed: () => w() !== "launched_from_home",
  };
}
//@ chunk-3zy56vtn.js:18888-19039 placement
function helperRefusal(e = Je()) {
  let n = checkToolHostHelperPreconditions(e);
  if (n === void 0) return;
  return n.message.includes("signs in or sends its traffic elsewhere") ? "other_sign_in" : "no_helper";
}
//@ chunk-3zy56vtn.js:19039-19114 placement
function buildToolHostWorkHandler(e, n) {
  return runToolHostLoop({ ...e, spawnHelper: (s) => spawnToolHostHelper(s, { env: Je(), ...n }) });
}
//@ chunk-3zy56vtn.js:19114-19191 placement
async function sweepToolHostForShutdown(e) {
  try {
    await withDeadline(e.sweep("shutdown"), Se);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-3zy56vtn.js:19191-19224 placement
function Je() {
  return process.env;
}
//@ chunk-jd7h5dfe.js:227-260 placement
var A = ge(new Map(), (o) => o.clear());

export {
  liveToolHostChecks,
  liveToolHostSwitches,
  isSwitchedOffRemotely,
  watchToolHostAdvert,
  helperRefusal,
  buildToolHostWorkHandler,
  sweepToolHostForShutdown,
};
