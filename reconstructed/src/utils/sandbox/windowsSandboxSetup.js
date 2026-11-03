/**
 * utils/sandbox/windowsSandboxSetup.ts
 *
 * 2.1.316 新增：Windows 沙箱配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4aaff5r7.js (12)
 * attribution: placement 12
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  rgRunner,
  CLAUDECODESANDBOX,
  formatProfileForgetHint,
  grantExecutableReadToSandboxGroup,
  describeWindowsSandboxRemedy,
} from "./windowsSandbox.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { systemRootDir } from "../claudeInChrome/windowsAppPaths.js";
import { logForDebugging } from "../debug.js";
import { safeParseJSON } from "../json.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { HostScoped } from "../hostScoped.js";
import {
  areWindowsLocalConnectionsOn,
  SandboxManager,
  resolveWindowsTlsTerminateCaSource,
  willSandboxTlsTerminate,
  REFUSED_UNTIL_RESTART,
  WITHOUT_SANDBOX_UNTIL_RESTART,
} from "./sandbox-adapter.js";
import {
  checkWindowsSandboxStatusAsync,
  windowsSetupVersionMismatch,
  WINDOWS_ALLOW_LOOPBACK_EFFECT,
  installWindowsSandboxAsync,
  WindowsSandboxError,
  ensurePersistentWindowsCa,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { seclogonStatusMessage } from "./windowsSandboxStatus.js";
import { plural } from "../stringUtils.js";
import { errorMessage } from "../errors.js";

//@ chunk-4aaff5r7.js:684-746 placement
var windowsEgressProbeSchema = DoctorLazy(() =>
  u({
    egress_probe: string().refine((s) => s !== "not-run"),
  }),
);
//@ chunk-4aaff5r7.js:746-1579 placement
async function runSandboxSetupHelper(s, b) {
  let { exe, prependArgs } = rgRunner();
  let timeout = Math.floor(s);
  let now = Date.now();
  let { exitCode, timedOut, stdout, stderr, error } = await execFileNoThrow(
    exe,
    [
      ...prependArgs,
      "wfp",
      "verify",
      "--target",
      "127.0.0.1:9",
      ...(b ? ["--allow-loopback"] : []),
      "--write-restricted-token",
    ],
    {
      timeout,
      stdin: "ignore",
      cwd: systemRootDir(),
      maxBuffer: 1e5,
    },
  );
  let max = Math.max(0, Date.now() - now);
  let max_2 = Math.max(1, Math.round(max / 1000));
  logForDebugging(
    `[sandbox] starting the sandbox account: ${timedOut ? "stopped at the time limit" : `exit ${exitCode ?? "none"}`} after ${max_2}s (limit ${s} ms): ${stderr || stdout || error || (exitCode === undefined && !timedOut ? "srt-win never ran, or something other than the limit ended it" : "no output")}`,
  );
  let C = {
    duration_ms: max,
    exit_code: exitCode ?? -1,
  };
  if (windowsEgressProbeSchema().safeParse(safeParseJSON(stdout, false)).success) {
    logFeatureOk("sandbox_windows_first_start", C);
    return {
      outcome: "started",
      seconds: max_2,
    };
  }
  let i = timedOut ? "timed_out" : "not_started";
  logFeatureSad("sandbox_windows_first_start", i, C);
  return {
    outcome: i,
    seconds: max_2,
  };
}
//@ chunk-4aaff5r7.js:1579-1719 placement
var WINDOWS_SANDBOX_SETUP_NOTICE =
  "Setting up the Windows sandbox. Approve the administrator prompt if Windows shows one. After that, set-up can take a few minutes.";
//@ chunk-4aaff5r7.js:1719-1828 placement
class SingleFlight {
  inFlight = undefined;
  run(s) {
    this.inFlight ??= s().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }
}
//@ chunk-4aaff5r7.js:1828-1851 placement
var windowsSetupSingleFlight = new HostScoped(() => new SingleFlight());
//@ chunk-4aaff5r7.js:1851-1913 placement
function setupWindowsSandboxOnce(host, b = () => {}, n = 1 / 0) {
  return windowsSetupSingleFlight.of(host).run(() => setupWindowsSandbox(b, n));
}
//@ chunk-4aaff5r7.js:1913-11343 placement
/**
 * 配置 Windows 沙箱：检查状态、运行管理员辅助程序、授予执行文件读取权限，汇总结果。
 */
async function setupWindowsSandbox(s, b) {
  let n = [];
  let srtWin = rgRunner();
  let a = areWindowsLocalConnectionsOn();
  let c = await checkWindowsSandboxStatusAsync({
    srtWin,
  }).catch(() => {
    return;
  });
  let x = c !== undefined && c.user.provisioned && c.wfp.state !== "absent" && c.wfp.allowLoopback !== a;
  let _ = seclogonStatusMessage(c?.user);
  if (
    _ !== undefined &&
    c?.user.provisioned &&
    c.user.credPresent &&
    windowsSetupVersionMismatch(c.user) === undefined &&
    (c.wfp.state === "installed" || c.wfp.state === "cannot-read") &&
    !x
  ) {
    let e = await SandboxManager.checkDependenciesAsync().catch(() => {
      return;
    });
    if (e?.errors.length === 1 && e.errors[0] === _) {
      logFeatureSad("sandbox_windows_install", "secondary_logon_unusable");
      return {
        status: "partial",
        message: `Set-up changed nothing. Run it again once this is fixed: ${_}`,
      };
    }
  }
  if (x)
    n.push(
      `The sandbox on this machine was set up with local connections ${a ? "off" : "on"}, and sandbox.network.allowLocalBinding asks for them ${a ? "on" : "off"}: this set-up replaces its network filters.`,
    );
  if (a)
    n.push(
      `Local connections are on (sandbox.network.allowLocalBinding). ${WINDOWS_ALLOW_LOOPBACK_EFFECT} To keep sandboxed commands off local ports, remove that setting and run /sandbox install again.`,
    );
  for (let e of n) s(e);
  try {
    let e = await installWindowsSandboxAsync({
      sandboxUser: CLAUDECODESANDBOX,
      allowLoopback: a,
      force: x,
      onProfileGrantStart: (i) =>
        s(
          `${i.replace(/\s*Skip with[\s\S]*$/, "")} ${SHARED_SANDBOX_ACCOUNT_NOTE} This needs no further elevation and can take a few minutes. ${formatProfileForgetHint()}`,
        ),
      onProfileGrantProgress: s,
      srtWin,
    });
    if (e.cancelled) {
      if (e.user.provisioned && e.user.credPresent) {
        let i = seclogonStatusMessage(e.user);
        if (
          i === undefined &&
          resolveWindowsTlsTerminateCaSource().source === "managed" &&
          willSandboxTlsTerminate()
        ) {
          SandboxManager.invalidateDependencyCache();
          let k = await grantSandboxExecRead(e.user);
          await SandboxManager.checkDependenciesAsync();
          if (k !== null) return k;
          logFeatureOk("sandbox_windows_install");
          return {
            status: "ok",
            message:
              "Install was cancelled at the elevation prompt, but the sandbox user is already provisioned \u2014 the sandbox TLS inspection CA is now set up and trusted for the sandbox user." +
              " Network filters can't be verified from a non-elevated process; if sandboxing doesn't start, run /sandbox install again and approve the elevation prompt." +
              getTlsRestartHint(),
          };
        }
        logFeatureSad("sandbox_windows_install", "uac_cancelled_provisioned");
        SandboxManager.invalidateDependencyCache();
        await SandboxManager.checkDependenciesAsync();
        return {
          status: "cancelled",
          message: `Install was cancelled at the elevation prompt, but the sandbox user is already provisioned. Network filters can't be verified from a non-elevated process${SandboxManager.areSandboxSettingsLockedByPolicy() ? "" : " \u2014 run /sandbox to check the current status"}; if sandboxing doesn't start, run /sandbox install again and approve the elevation prompt. If you don't have administrator rights, ask your administrator to run the sandbox set-up.${i === undefined ? "" : ` ${i}`}`,
        };
      }
      logFeatureSad("sandbox_windows_install", "uac_cancelled");
      return {
        status: "cancelled",
        message:
          "Install was cancelled at the elevation prompt. Run /sandbox install again and approve the prompt to set up the sandbox user and network filters. If you don't have administrator rights, ask your administrator to install the network filters.",
      };
    }
    let w =
      e.user.provisioned &&
      e.user.credPresent &&
      (e.wfp.state === "installed" || e.wfp.state === "cannot-read");
    let r = seclogonStatusMessage(e.user);
    let l;
    if (
      w &&
      r === undefined &&
      !(resolveWindowsTlsTerminateCaSource().source === "managed" && willSandboxTlsTerminate())
    ) {
      await grantExecutableReadToSandboxGroup({
        exePath: process.execPath,
        previous: undefined,
        getUserStatus: () => Promise.resolve(e.user),
      });
      let min = Math.min(150000, b - Date.now());
      if (min >= 1e4) l = await runSandboxSetupHelper(min, a);
      else {
        logFeatureSad("sandbox_windows_first_start", "no_time_left");
        l = "no_time_left";
      }
    }
    SandboxManager.invalidateDependencyCache();
    await SandboxManager.checkDependenciesAsync();
    if (w) {
      if (
        r === undefined &&
        resolveWindowsTlsTerminateCaSource().source === "managed" &&
        willSandboxTlsTerminate()
      ) {
        let v = await grantSandboxExecRead(e.user);
        if (v !== null) return v;
      }
      let unprotected = e.profileGrant?.applied === true ? e.profileGrant.result.unprotected : [];
      if (unprotected.length > 0) {
        logFeatureSad("sandbox_windows_install", "profile_exclusion_unprotected");
        return {
          status: "partial",
          message: `WARNING: the sandbox is installed, but ${unprotected.length} credential store(s) that set-up excludes could not be closed, and sandboxed commands CAN READ ${unprotected.length === 1 ? "it" : "them"}: ${unprotected
            .slice(0, 10)
            .map((v) => `${v.path} (${v.reason})`)
            .join(
              "; ",
            )}${unprotected.length > 10 ? "; \u2026" : ""}. Only the owner of such a path or an administrator can close it; run /sandbox install again afterwards.${profileReadableNote(e.profileGrant)}${sandboxSetupSummary(a, n)}${getTlsRestartHint()}${r === undefined ? "" : ` ${r}`}`,
        };
      }
      let k =
        e.wfp.state === "installed"
          ? "Sandbox user and network filters installed"
          : "Sandbox user and network filters installed (filters can't be verified from a non-elevated process)";
      if (r !== undefined) {
        logFeatureSad("sandbox_windows_install", "secondary_logon_unusable");
        return {
          status: "partial",
          message: `${k}.${getTlsRestartHint()}${sandboxSetupSummary(a, n)}${profileReadableNote(e.profileGrant)} ${r}`,
        };
      }
      logFeatureOk("sandbox_windows_install");
      let R = l === undefined || l === "no_time_left" ? "" : `${l.seconds} ${plural(l.seconds, "second")}`;
      let I =
        l === undefined
          ? ""
          : {
              started: ` Windows signed in the sandbox user in ${R}.`,
              timed_out: ` The sandbox user had not finished signing in after ${R}. If the sandbox fails to start, restart Claude Code. If it fails again, run /sandbox install again.`,
              not_started:
                " Claude Code couldn't sign in the sandbox user. It will try again the next time it starts the sandbox, and show the reason if that fails too.",
              no_time_left:
                " Set-up ran out of time before it could sign in the sandbox user, so the sandbox may fail to start the first time. If it does, restart Claude Code. If it fails again, run /sandbox install again.",
            }[l === "no_time_left" ? l : l.outcome];
      if (SandboxManager.isSandboxingEnabled())
        return {
          status: "ok",
          message: `${k} and active.${getTlsRestartHint()}${sandboxSetupSummary(a, n)}${profileReadableNote(e.profileGrant)}${I}`,
        };
      let F = SandboxManager.isSandboxEnabledInSettings()
        ? SandboxManager.areSandboxSettingsLockedByPolicy()
          ? "Run `claude sandbox status` in a terminal and check `installed` and `enabled` in its JSON output."
          : "Run /sandbox to check the current status."
        : SandboxManager.areSandboxSettingsLockedByPolicy()
          ? "The sandbox is off in your settings, and /sandbox cannot turn it on here, because a --settings file or managed settings control the sandbox settings. Set sandbox.enabled to true in your settings, or ask whoever manages those settings."
          : "Run /sandbox to choose a sandbox mode and turn it on.";
      return {
        status: "ok",
        message: `${k}. ${F}${getTlsRestartHint()}${sandboxSetupSummary(a, n)}${profileReadableNote(e.profileGrant)}${I}`,
      };
    }
    let y = !e.user.provisioned
      ? "user_not_provisioned"
      : !e.user.credPresent
        ? "cred_not_readable"
        : "wfp_not_installed";
    logFeatureSad("sandbox_windows_install", y);
    return {
      status: "partial",
      message: `Install completed (sandbox user: ${
        {
          user_not_provisioned: "not provisioned",
          cred_not_readable: "provisioned, credential not readable",
          wfp_not_installed: "provisioned",
        }[y]
      }, filters: ${e.wfp.state}). Run /sandbox install again to retry.`,
    };
  } catch (error) {
    SandboxManager.invalidateDependencyCache();
    let w = errorMessage(error);
    logForDebugging(`/sandbox install failed: ${w}`, {
      level: "error",
    });
    let replaced = describeWindowsSandboxRemedy(w, {
      omitCcRemedy: true,
    }).replace(/\.$/, "");
    if (error instanceof WindowsSandboxError && error.code === "install_timeout") {
      logFeatureSad("sandbox_windows_install", "uac_timeout");
      return {
        status: "error",
        message: `The install timed out after 2 minutes: ${replaced}. If an elevation prompt was showing, run /sandbox install again and respond to the prompt. If no prompt appeared, the installer may be blocked on this machine${SandboxManager.areSandboxSettingsLockedByPolicy() ? "" : " \u2014 run /sandbox to check the current status"}.`,
      };
    }
    if (error instanceof WindowsSandboxError && error.code === "profile_grant_blocked_by_session") {
      await SandboxManager.checkDependenciesAsync();
      logFeatureSad("sandbox_windows_install", "profile_grant_blocked");
      return {
        status: "partial",
        message:
          "The sandbox account and network filters are installed, but the read access to your user profile was left as it was: it is changed only while no sandboxed session or command is running on this machine, and one is (another Claude Code window, or this one if it has run a sandboxed command). Close the sessions that use the sandbox, then run `claude sandbox install` in a terminal, or /sandbox install in a new session." +
          sandboxSetupSummary(a, n),
      };
    }
    if (error instanceof WindowsSandboxError && error.code === "profile_operation_in_progress") {
      await SandboxManager.checkDependenciesAsync();
      logFeatureSad("sandbox_windows_install", "profile_operation_in_progress");
      return {
        status: "partial",
        message:
          "The sandbox account and network filters are installed, but the read access to your user profile was left as it was: another sandbox set-up step on this profile is still running (a /sandbox install in another window, or the removal of that access). Wait for it to finish, then run /sandbox install again." +
          sandboxSetupSummary(a, n),
      };
    }
    if (error instanceof WindowsSandboxError && error.code === "profile_grant_failed") {
      await SandboxManager.checkDependenciesAsync();
      logFeatureSad("sandbox_windows_install", "profile_grant_failed");
      return {
        status: "partial",
        message: `The sandbox account and network filters are installed, but your user profile could not be made readable to sandboxed commands: ${replaced.replace(/\s*No session starts until it is complete[\s\S]*$/, "").replace(/\.$/, "")}. Sandboxed commands will not start until that step completes. Run /sandbox install again to retry.${sandboxSetupSummary(a, n)}`,
      };
    }
    if (error instanceof WindowsSandboxError && error.code === "install_config_conflict") {
      logFeatureSad("sandbox_windows_install", "config_conflict");
      return {
        status: "error",
        message:
          "A sandbox network-filter set is already installed with a different configuration: under a different sandbox account name, or with the other setting for local connections (sandbox.network.allowLocalBinding) while its state could not be read. Run /sandbox install again; if it is refused again, close every Claude Code session and run claude sandbox uninstall in a terminal, then run /sandbox install.",
      };
    }
    if (/^srt-win (status|wfp|user)[ :]/.test(w)) {
      logFeatureSad("sandbox_windows_install", "status_probe_failed");
      return {
        status: "error",
        message: `The installer ran, but the sandbox status couldn't be read back afterwards: ${replaced}. ${SandboxManager.areSandboxSettingsLockedByPolicy() ? "Restart Claude Code to check again." : "Run /sandbox to check the current status."}`,
      };
    }
    logFeatureBad("sandbox_windows_install", "install_threw");
    return {
      status: "error",
      message: `Couldn't install the sandbox user and network filters: ${replaced}. Run /sandbox install again to retry.`,
    };
  }
}
//@ chunk-4aaff5r7.js:11343-11480 placement
var SHARED_SANDBOX_ACCOUNT_NOTE =
  "The sandbox account is one per machine: where other people use this machine, their sandboxed commands can read your profile too.";
//@ chunk-4aaff5r7.js:11480-12197 placement
function profileReadableNote(profileGrant) {
  if (profileGrant === undefined) return "";
  if (!profileGrant.applied)
    return ` Your user profile was not made readable to sandboxed commands (${profileGrant.reason.replace(/\.$/, "")}), so they can read nothing in it; run /sandbox install again, as the user who starts sessions, to apply that.`;
  let { profile, granted, denied, notGranted } = profileGrant.result;
  return ` Sandboxed commands can now read your user profile (${profile}) except credential stores: ${granted} folders made readable, ${denied} excluded${notGranted.length > 0 ? `, ${notGranted.length} left unreadable because their permissions could not be changed` : ""}. That includes package-manager configuration that can hold feed tokens (.npmrc, pip.ini, NuGet.Config, Maven settings.xml, gradle.properties, .gitconfig). ${SHARED_SANDBOX_ACCOUNT_NOTE} ${formatProfileForgetHint()}`;
}
//@ chunk-4aaff5r7.js:12197-12471 placement
function sandboxSetupSummary(s, b) {
  let n = SandboxManager.untilRestart();
  return `${b.map((h) => ` ${h}`).join("")}${n === undefined ? "" : ` This session started with local connections ${s ? "off" : "on"} and keeps that until it ends, so its sandbox ${n === "refused" ? "cannot run" : "is off"} now. ${n === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}.`}`;
}
//@ chunk-4aaff5r7.js:12471-13364 placement
async function grantSandboxExecRead(user) {
  let b = await grantExecutableReadToSandboxGroup({
    exePath: process.execPath,
    previous: undefined,
    getUserStatus: () => Promise.resolve(user),
  });
  try {
    await ensurePersistentWindowsCa({
      status: user,
      srtWin: rgRunner(),
    });
  } catch (error) {
    let h = errorMessage(error);
    logForDebugging(`/sandbox install: managed sandbox CA step failed: ${h}`, {
      level: "error",
    });
    let replaced = describeWindowsSandboxRemedy(h, {
      omitCcRemedy: true,
      programPermissionAdded: b?.added,
    }).replace(/\.$/, "");
    if (
      error instanceof WindowsSandboxError &&
      (error.code === "trust_ca_failed" || error.code === "spawn_failed" || error.code === "srt_win_timeout")
    ) {
      logFeatureSad("sandbox_windows_install", "trust_ca_failed");
      return {
        status: "partial",
        message: `The sandbox TLS inspection CA couldn't be trusted for the sandbox user: ${replaced}. Sandboxed HTTPS won't work \u2014 run /sandbox install again to retry.`,
      };
    }
    logFeatureSad("sandbox_windows_install", "persistent_ca_failed");
    return {
      status: "partial",
      message: `The sandbox TLS inspection CA couldn't be created: ${replaced}. Sandboxed HTTPS won't work \u2014 run /sandbox install again to retry.`,
    };
  }
  return null;
}
//@ chunk-4aaff5r7.js:13364-13493 placement
function getTlsRestartHint() {
  return willSandboxTlsTerminate() && SandboxManager.needsRestartForTlsTerminate()
    ? " Restart Claude Code to enable TLS inspection for this session."
    : "";
}
export { WINDOWS_SANDBOX_SETUP_NOTICE, setupWindowsSandboxOnce };
