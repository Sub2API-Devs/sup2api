/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (106)
 * attribution: esm-fingerprint 90, esm-layout 16
 */
import * as pathModule_2 from "path";
import "path";
import "path";
import "path";
import "path";
import { fileURLToPath } from "url";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { spawnSync, spawn } from "child_process";
import * as netModule from "net";
import { once } from "events";
import "os";
import * as osModule_2 from "os";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { validateCaPair, generateCa, certThumbprint } from "./mitm-ca.js";
import {
  markedLiteralPath,
  normalizePathForSandbox,
  containsGlobCharsWin,
  isUncPath,
  expandGlobPattern,
  normalizeCaseForComparison,
  stripExtendedPathPrefix,
  isAtOrUnder,
  generateProxyEnvVars,
  encodeSandboxedCommand,
  orDefault,
  buildGitConfigEnv,
} from "./sandbox-utils.js";
import { literalReadings } from "./path-entries.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-fq0cr76a.js:777773-777887 esm-fingerprint
class WindowsSandboxError extends Error {
  constructor(code, message, subcommand) {
    super(message);
    this.name = "WindowsSandboxError";
    this.code = code;
    this.subcommand = subcommand;
  }
}
//@ chunk-fq0cr76a.js:777887-778382 esm-fingerprint
var DEFAULT_WINDOWS_PROXY_PORT_RANGE = [60080, 60089];
var WINDOWS_LOOPBACK_PROBE_PORT = 1;
var WINDOWS_ALLOW_LOOPBACK_EFFECT = `Loopback is open: sandboxed commands can connect to every TCP and UDP port on localhost (127.0.0.0/8 and ::1; port ${WINDOWS_LOOPBACK_PROBE_PORT} alone stays blocked, so the sandbox can check its own fence). Every service listening on localhost is reachable from them, and any local forwarder (a DNS stub, a SOCKS or HTTP proxy, a VPN or security agent, a tunnel) reachable there gives them a way off the machine that the network restrictions do not cover.`;
var PWSH_FLAGS = ["-NoProfile", "-Command"];
//@ chunk-fq0cr76a.js:778382-779710 esm-fingerprint
function parseWindowsBinShell(raw) {
  let systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  let cmdDefault = {
    exe: pathModule_2.win32.join(systemRoot, "System32", "cmd.exe"),
    args: ["/d", "/s", "/c"],
  };
  if (raw === undefined || raw === null) return cmdDefault;
  if (typeof raw === "object") {
    if (!pathModule_2.win32.isAbsolute(raw.exe))
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `binShell.exe must be an absolute path (got ${JSON.stringify(raw.exe)})`,
      );
    if (!Array.isArray(raw.args))
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `binShell.args must be an array (got ${JSON.stringify(raw.args)})`,
      );
    return raw;
  }
  let rawBase = pathModule_2.win32.basename(raw);
  let base = rawBase.toLowerCase();
  let isAbs = pathModule_2.win32.isAbsolute(raw);
  if (!isAbs && raw !== rawBase)
    throw new WindowsSandboxError(
      "bin_shell_invalid",
      `binShell string must be a bare token or an absolute path (got ${JSON.stringify(raw)})`,
    );
  switch (base) {
    case "bash":
    case "bash.exe":
    case "sh":
    case "sh.exe":
      if (!isAbs)
        throw new WindowsSandboxError(
          "bin_shell_invalid",
          `binShell bash path must be absolute (got ${JSON.stringify(raw)}); pass the resolved Git Bash install path`,
        );
      return {
        exe: raw,
        args: ["-c"],
      };
    case "pwsh":
    case "pwsh.exe":
      return {
        exe: isAbs ? raw : "pwsh.exe",
        args: PWSH_FLAGS,
      };
    case "powershell":
    case "powershell.exe":
      return {
        exe: isAbs
          ? raw
          : pathModule_2.win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
        args: PWSH_FLAGS,
      };
    case "cmd":
    case "cmd.exe":
      return isAbs
        ? {
            exe: raw,
            args: cmdDefault.args,
          }
        : cmdDefault;
    default:
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `unrecognised binShell ${JSON.stringify(raw)}: expected 'cmd' | 'powershell' | 'pwsh' or an absolute path to bash.exe/sh.exe/pwsh.exe/powershell.exe`,
      );
  }
}
//@ chunk-fq0cr76a.js:779710-779793 esm-fingerprint
function repoRoot() {
  let here = pathModule_2.dirname(fileURLToPath(import.meta.url));
  return pathModule_2.resolve(here, "..", "..");
}
//@ chunk-fq0cr76a.js:779793-779891 esm-fingerprint
var nodeArchToDir; // deferred: uses repoRoot of its import cycle while loading; runs once the cycle is complete
var joined;
deferInit("chunk-fq0cr76a.js:779793", () => {
  nodeArchToDir = {
    x64: "x64",
    arm64: "arm64",
  };
  joined = pathModule_2.join(repoRoot(), "vendor", "srt-win", nodeArchToDir.x64 ?? "x64", "srt-win.exe");
});
//@ chunk-fq0cr76a.js:779891-779910 esm-fingerprint
var SRT_WIN_DISPATCH_ARG1 = "--srt-win";
//@ chunk-fq0cr76a.js:779910-780278 esm-fingerprint
function resolveSrtWin(cfg) {
  if (cfg?.path === undefined)
    throw new WindowsSandboxError(
      "srt_win_not_found",
      "no srt-win path configured; set windows.srtWin.path (e.g. to the exported VENDORED_SRT_WIN_EXE constant for the packaged binary)",
    );
  if (!fsModule_2.existsSync(cfg.path))
    throw new WindowsSandboxError(
      "srt_win_not_found",
      `windows.srtWin.path is set to '${cfg.path}' but the file does not exist`,
    );
  return {
    exe: cfg.path,
    prependArgs: [SRT_WIN_DISPATCH_ARG1],
  };
}
//@ chunk-fq0cr76a.js:780278-780855 esm-fingerprint
function runSrtWin(args, opts = {}) {
  let { exe, prependArgs } = opts.srtWin ?? resolveSrtWin();
  let r = spawnSync(exe, [...prependArgs, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeoutMs ?? 15000,
    ...(opts.stdin !== undefined
      ? {
          input: opts.stdin,
        }
      : {}),
  });
  if (r.error) {
    if (r.error.code === "ETIMEDOUT")
      throw new WindowsSandboxError(
        "srt_win_timeout",
        `srt-win ${args.join(" ")} timed out after ${opts.timeoutMs ?? 15000}ms` +
          (r.signal ? ` (killed by ${r.signal})` : ""),
        args[0],
      );
    throw new WindowsSandboxError(
      "spawn_failed",
      `srt-win ${args[0]}: spawn failed: ${r.error.message}`,
      args[0],
    );
  }
  throwIfRefusedBesideOthers(args, r.status, r.stdout ?? "");
  return {
    status: r.status,
    signal: r.signal,
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
  };
}
//@ chunk-fq0cr76a.js:780855-780865 esm-layout
var SRT_WIN_EXIT_PROFILE_BUSY = 25;
//@ chunk-fq0cr76a.js:780865-780881 esm-layout
var SRT_WIN_EXIT_HELD_BY_OTHERS = 22;
var SRT_WIN_EXIT_GRANT_BLOCKED = 24;
//@ chunk-fq0cr76a.js:780881-781302 esm-fingerprint
function describeWindowsHolder(h) {
  let who = `process ${String(h.pid)}`;
  let at = String(h.path);
  switch (h.kind) {
    case "profile":
      return `${who} is a sandbox session or command`;
    case "kept_root":
      return `${who} runs on the kept write grant on ${at}`;
    case "grant":
      return `${who} holds a session grant on ${at}`;
    case "deny":
    case "deny_fdc":
    case "deny_delete":
    case "deny_satisfied":
      return `${who} holds a session deny on ${at}`;
    default:
      return `${who} holds ${String(h.kind)} on ${at}`;
  }
}
//@ chunk-fq0cr76a.js:781302-781501 esm-fingerprint
function describeWindowsHolders(stdout) {
  let held = [];
  try {
    let parsed = JSON.parse(stdout);
    if (Array.isArray(parsed.held_by)) held = parsed.held_by;
  } catch {}
  let said = held.slice(0, 8).map(describeWindowsHolder);
  if (held.length > said.length) said.push(`${held.length - said.length} more`);
  return said.join("; ");
}
//@ chunk-fq0cr76a.js:781501-782365 esm-layout
function throwIfRefusedBesideOthers(args, status, stdout) {
  if (status === SRT_WIN_EXIT_PROFILE_BUSY)
    throw new WindowsSandboxError(
      "profile_operation_in_progress",
      "The read grant on your user profile is being written or removed right now (srt-win profile grant / profile forget). Nothing in the sandbox can start until that is done; try again when it has finished.",
      args[0],
    );
  if (status !== SRT_WIN_EXIT_HELD_BY_OTHERS && status !== SRT_WIN_EXIT_GRANT_BLOCKED) return;
  let what = describeWindowsHolders(stdout);
  let who = what ? ` (${what})` : "";
  if (status === SRT_WIN_EXIT_GRANT_BLOCKED)
    throw new WindowsSandboxError(
      "profile_grant_blocked_by_session",
      `The read grant on your user profile was not changed: sandbox sessions or commands are running${who}, and the grant is written only while none is, so that no session sees it change. What was granted before is as it was. End them and run it again.`,
      args[0],
    );
  throw new WindowsSandboxError(
    "kept_grants_in_use",
    `srt-win ${args.slice(0, 2).join(" ")} removed nothing: sandbox sessions or commands are running${who}, and what they run on is not taken from under them. End them and run it again.`,
    args[0],
  );
}
//@ chunk-fq0cr76a.js:782365-783090 esm-fingerprint
function runSrtWinAsync(args, opts = {}) {
  let { exe, prependArgs } = opts.srtWin ?? resolveSrtWin();
  let timeoutMs = opts.timeoutMs ?? 15000;
  return new Promise((resolve, reject) => {
    let child = spawn(exe, [...prependArgs, ...args], {
      windowsHide: true,
    });
    let timedOut = false;
    let timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill();
          }, timeoutMs)
        : undefined;
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr?.setEncoding("utf8").on("data", (d) => (stderr += d));
    child.stdin?.on("error", () => {}).end(opts.stdin);
    child.once("error", (e) => {
      clearTimeout(timer);
      reject(
        new WindowsSandboxError("spawn_failed", `srt-win ${args[0]}: spawn failed: ${e.message}`, args[0]),
      );
    });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new WindowsSandboxError(
            "srt_win_timeout",
            `srt-win ${args.join(" ")} timed out after ${timeoutMs}ms` +
              (signal ? ` (killed by ${signal})` : ""),
            args[0],
          ),
        );
        return;
      }
      try {
        throwIfRefusedBesideOthers(args, status, stdout);
      } catch (e) {
        reject(e);
        return;
      }
      resolve({
        status,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}
//@ chunk-fq0cr76a.js:783090-783399 esm-fingerprint
function parseSrtWinJson(args, r_2) {
  if (r_2.status !== 0)
    throw new WindowsSandboxError(
      "srt_win_nonzero",
      `srt-win ${args.join(" ")} exited ${r_2.status}: ${r_2.stderr || r_2.stdout}`,
      args[0],
    );
  try {
    return JSON.parse(r_2.stdout);
  } catch (e) {
    throw new WindowsSandboxError(
      "srt_win_bad_json",
      `srt-win ${args.join(" ")}: unparseable JSON output ${JSON.stringify(r_2.stdout)}: ${e.message}`,
      args[0],
    );
  }
}
//@ chunk-fq0cr76a.js:783399-783437 esm-layout
function runSrtWinJson(args, opts) {
  return parseSrtWinJson(args, runSrtWin(args, opts));
}
//@ chunk-fq0cr76a.js:783437-783487 esm-layout
async function runSrtWinJsonAsync(args, opts) {
  return parseSrtWinJson(args, await runSrtWinAsync(args, opts));
}
//@ chunk-fq0cr76a.js:783487-783733 esm-fingerprint
function runSrtWinJsonAllowFail(args, opts) {
  let args_2 = runSrtWin(args, opts);
  let json;
  try {
    json = JSON.parse(args_2.stdout);
  } catch (e) {
    throw new WindowsSandboxError(
      "srt_win_bad_json",
      `srt-win ${args.join(" ")}: unparseable JSON output ${JSON.stringify(args_2.stdout)}: ${e.message}`,
      args[0],
    );
  }
  return {
    ok: args_2.status === 0,
    json,
    stderr: args_2.stderr,
  };
}
//@ chunk-fq0cr76a.js:783733-783813 esm-fingerprint
function wfpStatusArgs(sublayerGuid) {
  let args = ["wfp", "status"];
  if (sublayerGuid) args.push("--sublayer-guid", sublayerGuid);
  return args;
}
//@ chunk-fq0cr76a.js:783813-784007 esm-fingerprint
function mapWfpStatus(raw) {
  return {
    state: raw.state,
    filters: raw.filters,
    ...(raw.port_range && {
      portRange: raw.port_range,
    }),
    allowLoopback: raw.allow_loopback === true,
    ...(raw.user_sid && {
      userSid: raw.user_sid,
    }),
    ...(raw.hint && {
      hint: raw.hint,
    }),
  };
}
//@ chunk-fq0cr76a.js:784007-784214 esm-fingerprint
var WINDOWS_SRT_WIN_CAPABILITIES = {
  profileDenyExpansion: "profile-deny-expansion",
  keptGrantHolders: "kept-grant-holders",
  profileSessionGrantCheck: "profile-session-grant-check",
  readDenyExcept: "read-deny-except",
  execHolder: "exec-holder",
};
//@ chunk-fq0cr76a.js:784214-784280 esm-fingerprint
function missingWindowsSrtWinCapability(capabilities) {
  return Object.values(WINDOWS_SRT_WIN_CAPABILITIES).find((c) => !capabilities.includes(c));
}
//@ chunk-fq0cr76a.js:784280-784357 esm-fingerprint
function capabilityList(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
//@ chunk-fq0cr76a.js:784357-784664 esm-layout
function windowsSrtWinOutdatedError(capability, why) {
  return new WindowsSandboxError(
    "srt_win_outdated",
    `The srt-win in use is older than this library: it does not report the capability '${capability}', which ${why}. Update srt-win (the one shipped with the program embedding this library, or the package's own) to a build that matches the library. Nothing was granted.`,
  );
}
//@ chunk-fq0cr76a.js:784664-784713 esm-fingerprint
var SECLOGON_STATES = ["ok", "disabled", "missing", "cannot-read"];
//@ chunk-fq0cr76a.js:784713-785925 esm-fingerprint
function mapUserStatus(raw) {
  return {
    provisioned: raw.user.exists,
    ...(raw.user.sid && {
      sid: raw.user.sid,
    }),
    groupExists: raw.user.group_exists,
    ...(raw.user.group_sid && {
      groupSid: raw.user.group_sid,
    }),
    inBuiltinUsers: raw.user.in_builtin_users,
    inSandboxGroup: raw.user.in_sandbox_group,
    hiddenFromLogon: raw.user.hidden_from_logon,
    credPresent: raw.cred_present,
    ...(typeof raw.marker_version === "number" && {
      markerVersion: raw.marker_version,
    }),
    ...(typeof raw.setup_version === "number" && {
      setupVersion: raw.setup_version,
    }),
    realUserSid: raw.real_user_sid,
    ...(raw.ca_cert_thumb && {
      caCertThumb: raw.ca_cert_thumb,
    }),
    ...(raw.ca_cert_pem && {
      caCertPem: raw.ca_cert_pem,
    }),
    ...(raw.seclogon !== undefined &&
      SECLOGON_STATES.includes(raw.seclogon) && {
        seclogon: raw.seclogon,
      }),
    ...(raw.persistent_grants &&
      raw.persistent_grants.state !== "none" && {
        persistentGrants: {
          state: raw.persistent_grants.state === "present" ? "present" : "unknown",
          roots: raw.persistent_grants.roots ?? [],
          ...(raw.persistent_grants.reason && {
            reason: raw.persistent_grants.reason,
          }),
        },
      }),
    ...(typeof raw.session_user_sid === "string" &&
      raw.session_user_sid !== "" && {
        sessionUserSid: raw.session_user_sid,
      }),
    capabilities: capabilityList(raw.capabilities),
    ...(raw.profile_grant &&
      raw.profile_grant.state !== "none" && {
        profileGrant: {
          state: raw.profile_grant.state === "present" ? "present" : "unknown",
          ...(raw.profile_grant.reason && {
            reason: raw.profile_grant.reason,
          }),
        },
      }),
  };
}
//@ chunk-fq0cr76a.js:785925-786273 esm-layout
function seclogonDisabledMessage(seclogonState) {
  return seclogonState === "missing"
    ? "The Windows Secondary Logon service (seclogon) is not present on this machine; the sandbox cannot start without it."
    : "The Windows Secondary Logon service (seclogon) is disabled; an administrator must set its startup type to Manual (`sc.exe config seclogon start= demand`). The sandbox cannot start without it.";
}
//@ chunk-fq0cr76a.js:786273-786283 esm-layout
var SRT_WIN_EXIT_SECLOGON_DISABLED = 18;
//@ chunk-fq0cr76a.js:786283-786391 esm-fingerprint
function seclogonDisabledFrom(r_2, subcommand) {
  if (r_2.status !== SRT_WIN_EXIT_SECLOGON_DISABLED) return;
  let e = parseSrtWinLaunchError(r_2.stderr, subcommand);
  return e?.code === "seclogon_disabled" ? e : undefined;
}
//@ chunk-fq0cr76a.js:786391-786566 esm-fingerprint
async function checkWindowsSandboxStatusAsync(opts = {}) {
  let args = ["status"];
  if (opts.sublayerGuid) args.push("--sublayer-guid", opts.sublayerGuid);
  let raw = await runSrtWinJsonAsync(args, {
    srtWin: opts.srtWin,
  });
  return {
    user: mapUserStatus(raw.user),
    wfp: mapWfpStatus(raw.wfp),
  };
}
//@ chunk-fq0cr76a.js:786566-786636 esm-fingerprint
function getWindowsWfpStatus(opts = {}) {
  return mapWfpStatus(
    runSrtWinJson(wfpStatusArgs(opts.sublayerGuid), {
      srtWin: opts.srtWin,
    }),
  );
}
//@ chunk-fq0cr76a.js:786636-786718 esm-fingerprint
async function getWindowsWfpStatusAsync(opts = {}) {
  return mapWfpStatus(
    await runSrtWinJsonAsync(wfpStatusArgs(opts.sublayerGuid), {
      srtWin: opts.srtWin,
    }),
  );
}
//@ chunk-fq0cr76a.js:786718-787031 esm-fingerprint
function windowsInstallFlags(ctx, force) {
  let [lo, hi] = ctx.proxyPortRange ?? DEFAULT_WINDOWS_PROXY_PORT_RANGE;
  let [defLo, defHi] = DEFAULT_WINDOWS_PROXY_PORT_RANGE;
  return (
    (ctx.sublayerGuid ? ` --sublayer-guid ${ctx.sublayerGuid}` : "") +
    (lo !== defLo || hi !== defHi ? ` --proxy-port-range ${lo}-${hi}` : "") +
    (ctx.sandboxUser && ctx.sandboxUser !== "srt-sandbox" ? ` --sandbox-user ${ctx.sandboxUser}` : "") +
    (ctx.allowLoopback ? " --allow-loopback" : "") +
    (force ? " --force" : "")
  );
}
//@ chunk-fq0cr76a.js:787031-787100 esm-fingerprint
function windowsInstallCommand(ctx, force) {
  return "npx sandbox-runtime windows-install" + windowsInstallFlags(ctx, force);
}
//@ chunk-fq0cr76a.js:787100-787177 esm-fingerprint
function rejectsAllowLoopback(r) {
  return /unexpected argument '--allow-loopback'/.test(r.stderr);
}
//@ chunk-fq0cr76a.js:787177-787415 esm-layout
function srtWinTooOld(stderr) {
  return new WindowsSandboxError(
    "srt_win_too_old",
    `srt-win is too old for network.allowLocalBinding: it does not know \`--allow-loopback\`. Update srt-win (and re-run the install with it), or unset network.allowLocalBinding. (${stderr.trim()})`,
  );
}
//@ chunk-fq0cr76a.js:787415-788158 esm-layout
var WFP_RESIDUAL_TEXT = {
  "anonymous-egress":
    "a connect to an off-loopback destination made while impersonating the anonymous token is not blocked (no filter is keyed on that token; a sandboxed process that puts it on a thread before creating a socket is not fenced)",
  "anonymous-loopback":
    "a connect to a loopback destination made while impersonating the anonymous token is not blocked (local listeners outside the proxy port range are reachable that way)",
  "deny-only-user-sid":
    "a connect made under a copy of the sandbox token whose user SID is deny-only is not blocked (the filters cannot match that token)",
  "lowered-integrity-unprobed":
    "a lowered-integrity copy of the sandbox token could not be set up on this machine, so no connect under it was observed",
};
//@ chunk-fq0cr76a.js:788158-788223 esm-fingerprint
function isWfpResidual(s) {
  return Object.prototype.hasOwnProperty.call(WFP_RESIDUAL_TEXT, s);
}
//@ chunk-fq0cr76a.js:788223-791487 esm-fingerprint
function interpretWindowsWfpVerify(r_2, install = {}) {
  let raw;
  try {
    raw = JSON.parse(r_2.stdout);
  } catch {
    if (rejectsAllowLoopback(r_2)) throw srtWinTooOld(r_2.stderr);
    throw new WindowsSandboxError(
      "wfp_verify_unparseable",
      "WFP egress fence could not be verified \u2014 `srt-win wfp " +
        `verify\` exited ${r_2.status}` +
        (r_2.signal ? ` (signal ${r_2.signal})` : "") +
        ` with unparseable output ${JSON.stringify(r_2.stdout)} (stderr: ${JSON.stringify(r_2.stderr)})`,
    );
  }
  let outcome = (v) => v ?? "skipped";
  let probes = {
    plain: outcome(raw.egress_probe),
    anonymous: outcome(raw.anonymous_probe),
    anonymousLoopback: outcome(raw.anonymous_loopback_probe),
    denyOnly: outcome(raw.deny_only_probe),
    lowIntegrity: outcome(raw.low_integrity_probe),
    lowIntegrityLoopback: outcome(raw.low_integrity_loopback_probe),
    untrustedIntegrity: outcome(raw.untrusted_integrity_probe),
    untrustedIntegrityLoopback: outcome(raw.untrusted_integrity_loopback_probe),
    ...(raw.allow_loopback && {
      openLoopback: outcome(raw.open_loopback_probe),
    }),
  };
  let offLoopback = raw.anonymous_target ?? "no target";
  let blockedTarget = raw.egress_target ?? raw.target;
  let summary =
    `plain=${probes.plain} (${blockedTarget}), anonymous=${probes.anonymous} (${offLoopback}), anonymous-loopback=${probes.anonymousLoopback}, deny-only=${probes.denyOnly}, low-integrity=${probes.lowIntegrity} (${offLoopback}), low-integrity-loopback=${probes.lowIntegrityLoopback}, untrusted-integrity=${probes.untrustedIntegrity} (${offLoopback}), untrusted-integrity-loopback=${probes.untrustedIntegrityLoopback}` +
    (raw.allow_loopback ? `, open-loopback=${probes.openLoopback} (${raw.target})` : "");
  let session = {
    ...install,
    allowLoopback: raw.allow_loopback ?? install.allowLoopback,
  };
  if (r_2.status === 19 || raw.allow_loopback_mismatch)
    throw new WindowsSandboxError(
      "wfp_loopback_mismatch",
      "WFP egress fence does not match network.allowLocalBinding \u2014 " +
        (raw.hint ?? "the installed filter set has a different loopback mode") +
        ". Through this package: `" +
        windowsInstallCommand(session, true) +
        "`.",
    );
  let lowIl = "the sandbox user under a low-integrity copy of its token";
  let untrustedIl = "the sandbox user under an untrusted-integrity copy of its token";
  let which = [
    [probes.plain, "the sandbox user", blockedTarget],
    [probes.lowIntegrity, lowIl, raw.anonymous_target],
    [probes.lowIntegrityLoopback, lowIl, blockedTarget],
    [probes.untrustedIntegrity, untrustedIl, raw.anonymous_target],
    [probes.untrustedIntegrityLoopback, untrustedIl, blockedTarget],
  ]
    .filter(([o]) => o === "connected" || o === "refused")
    .map(([, who, tgt]) => `direct outbound from ${who} to ${tgt}`);
  if (raw.allow_loopback && probes.plain === "unreachable")
    which.push(
      `direct outbound from the sandbox user to ${blockedTarget} (no answer where the filter must refuse at once)`,
    );
  if (r_2.status === 3 || which.length > 0)
    throw new WindowsSandboxError(
      "wfp_fence_inactive",
      "WFP egress fence is not active \u2014 " +
        `${which.join(" and ") || "a direct outbound connect"} was not blocked [${summary}]. Re-run \`` +
        windowsInstallCommand(session, false) +
        `\` (one UAC prompt). (${r_2.stderr})`,
    );
  if (r_2.status !== 0)
    throw new WindowsSandboxError(
      "wfp_verify_inconclusive",
      "WFP egress fence could not be verified \u2014 probe to " +
        `${blockedTarget} was '${raw.egress_probe}' (exit ${r_2.status}) [${summary}]. The fence may be absent. Re-run \`srt-win install\`. (${r_2.stderr})`,
    );
  if (raw.egress_probe !== "blocked")
    throw new WindowsSandboxError(
      "wfp_verify_inconclusive",
      "WFP egress fence could not be verified \u2014 `srt-win wfp verify` " +
        `exited 0 but reported the plain attempt as '${raw.egress_probe ?? "missing"}' [${summary}]. (${r_2.stderr})`,
    );
  let residuals = (raw.residuals ?? []).filter(isWfpResidual);
  let warnings = residuals.map((x) => `WFP egress fence residual '${x}': ${WFP_RESIDUAL_TEXT[x]}`);
  if (probes.lowIntegrity === "skipped" || probes.untrustedIntegrity === "skipped")
    warnings.push(
      "WFP egress fence: the off-loopback lowered-integrity attempts were skipped (no off-loopback address on this machine, or an srt-win that does not make them)",
    );
  if (raw.allow_loopback) warnings.push(WINDOWS_ALLOW_LOOPBACK_EFFECT);
  return {
    target: raw.target,
    stderr: r_2.stderr,
    probes,
    residuals,
    warnings,
  };
}
//@ chunk-fq0cr76a.js:791487-792540 esm-fingerprint
async function verifyWindowsWfpEgress(opts = {}) {
  let target = opts.target;
  let server;
  if (!target) {
    let [lo, hi] = opts.proxyPortRange ?? DEFAULT_WINDOWS_PROXY_PORT_RANGE;
    for (let i = 0; i < 5; i++) {
      let s = netModule.createServer((c) => c.on("error", () => {}).destroy());
      s.listen(0, "127.0.0.1");
      await once(s, "listening");
      let p = s.address().port;
      if (p < lo || p > hi) {
        server = s;
        target = `127.0.0.1:${p}`;
        break;
      }
      s.close();
    }
    if (!target)
      throw new WindowsSandboxError(
        "wfp_verify_bind_failed",
        `verifyWindowsWfpEgress: could not bind a loopback listener outside the WFP permit range [${lo},${hi}] in 5 attempts`,
      );
  }
  let args = ["wfp", "verify", "--target", target];
  if (opts.anonymousEgress) args.push("--anonymous-egress");
  if (opts.allowLoopback) args.push("--allow-loopback");
  args.push("--write-restricted-token");
  for (let r of opts.writeRoots ?? []) args.push("--write-root", r);
  try {
    let r = await runSrtWinAsync(args, {
      timeoutMs: 30000,
      srtWin: opts.srtWin,
    });
    logForDebugging_2(`[Sandbox Windows] wfp verify exit=${r.status}: ${r.stderr || r.stdout}`);
    let seclogon = seclogonDisabledFrom(r, "wfp");
    if (seclogon) throw seclogon;
    let result = interpretWindowsWfpVerify(r, {
      sublayerGuid: opts.sublayerGuid,
      proxyPortRange: opts.proxyPortRange,
      sandboxUser: opts.sandboxUser,
      allowLoopback: opts.allowLoopback,
    });
    for (let w of result.warnings)
      logForDebugging_2(`[Sandbox Windows] ${w}`, {
        level: "warn",
      });
    return result;
  } finally {
    server?.close();
  }
}
//@ chunk-fq0cr76a.js:792540-792609 esm-fingerprint
function getWindowsSandboxUserStatus(opts = {}) {
  return mapUserStatus(
    runSrtWinJson(["user", "status"], {
      srtWin: opts.srtWin,
    }),
  );
}
//@ chunk-fq0cr76a.js:792609-792691 esm-fingerprint
async function getWindowsSandboxUserStatusAsync(opts = {}) {
  return mapUserStatus(
    await runSrtWinJsonAsync(["user", "status"], {
      srtWin: opts.srtWin,
    }),
  );
}
//@ chunk-fq0cr76a.js:792691-792797 esm-fingerprint
async function windowsTrustCaAsync(caCertPath, opts = {}) {
  let args = await runSrtWinAsync(["user", "trust-ca", caCertPath], {
    timeoutMs: 60000,
    srtWin: opts.srtWin,
  });
  checkTrustCaResult(caCertPath, args);
}
//@ chunk-fq0cr76a.js:792797-793052 esm-fingerprint
function checkTrustCaResult(caCertPath, r_2) {
  logForDebugging_2(`[Sandbox Windows] user trust-ca exit=${r_2.status}: ${r_2.stderr || r_2.stdout}`);
  let seclogon = seclogonDisabledFrom(r_2, "user");
  if (seclogon) throw seclogon;
  if (r_2.status !== 0)
    throw new WindowsSandboxError(
      "trust_ca_failed",
      `srt-win user trust-ca '${caCertPath}' failed (exit ${r_2.status}): ${r_2.stderr || r_2.stdout}`,
    );
}
//@ chunk-fq0cr76a.js:793052-793182 esm-fingerprint
function windowsStateDir() {
  let programData = process.env.ProgramData;
  if (!programData) throw Error("ProgramData is not set");
  return pathModule_2.win32.join(programData, "sandbox-runtime");
}
//@ chunk-fq0cr76a.js:793182-795427 esm-fingerprint
async function ensurePersistentWindowsCa(opts = {}) {
  let status =
    opts.status ??
    (await getWindowsSandboxUserStatusAsync({
      srtWin: opts.srtWin,
    }));
  if (!status.provisioned || !status.credPresent)
    throw Error(
      `ensurePersistentWindowsCa: sandbox user is not provisioned (user=${status.provisioned}, cred=${status.credPresent}). Run \`npx sandbox-runtime windows-install\` first.`,
    );
  let stateDir = opts.dir ? undefined : windowsStateDir();
  if (stateDir && !fsModule_2.existsSync(stateDir))
    throw Error(
      `ensurePersistentWindowsCa: state directory ${stateDir} does not exist. Run \`npx sandbox-runtime windows-install\` first.`,
    );
  let dir = opts.dir ?? pathModule_2.win32.join(stateDir, "ca");
  let jsonPath = pathModule_2.join(dir, "ca.json");
  let certPath = pathModule_2.join(dir, "cert.pem");
  let keyPath = pathModule_2.join(dir, "key.pem");
  let horizonMs = (opts.regenerateWithinDays ?? 30) * 24 * 60 * 60 * 1000;
  let atomicWrite = (p, data) => {
    let tmp = `${p}.tmp.${process.pid}`;
    fsModule_2.writeFileSync(tmp, data);
    fsModule_2.renameSync(tmp, p);
  };
  let finish = async (certPem, keyPem, thumbprint, generated) => {
    atomicWrite(certPath, certPem);
    atomicWrite(keyPath, keyPem);
    let trusted = generated || status.caCertThumb !== thumbprint;
    if (trusted) {
      let t = pathModule_2.join(dir, `.trust.${process.pid}.${Date.now()}.pem`);
      fsModule_2.writeFileSync(t, certPem);
      try {
        await windowsTrustCaAsync(t, {
          srtWin: opts.srtWin,
        });
      } finally {
        fsModule_2.rmSync(t, {
          force: true,
        });
      }
    }
    logForDebugging_2(
      `[Sandbox Windows] persistent CA ${generated ? "generated" : "reused"} (thumb=${thumbprint}${trusted && !generated ? ", trust reconciled" : ""})`,
    );
    return {
      certPem,
      keyPem,
      certPath,
      keyPath,
      thumbprint,
      generated,
      trusted,
    };
  };
  let readValid = () => {
    let stored;
    try {
      stored = JSON.parse(fsModule_2.readFileSync(jsonPath, "utf8"));
    } catch (err) {
      logForDebugging_2(`[Sandbox Windows] persistent CA ca.json unreadable (${err.message})`, {
        level: "warn",
      });
      return;
    }
    if (typeof stored.certPem !== "string" || typeof stored.keyPem !== "string") return;
    let v = validateCaPair(stored.certPem, stored.keyPem);
    if (!v.ok) {
      logForDebugging_2(`[Sandbox Windows] persistent CA invalid (${v.reason})`, {
        level: "warn",
      });
      return;
    }
    return {
      certPem: stored.certPem,
      keyPem: stored.keyPem,
      thumbprint: v.thumbprint,
      notAfter: v.notAfter,
    };
  };
  if (!opts.force) {
    let on = readValid();
    if (on && on.notAfter.getTime() - Date.now() > horizonMs)
      return await finish(on.certPem, on.keyPem, on.thumbprint, false);
    if (on)
      logForDebugging_2(
        `[Sandbox Windows] persistent CA expiring ${on.notAfter.toISOString()}; regenerating`,
        {
          level: "warn",
        },
      );
  }
  fsModule_2.mkdirSync(dir, {
    recursive: true,
  });
  try {
    let cutoff = Date.now() - 300000;
    for (let f of fsModule_2.readdirSync(dir)) {
      if (!f.includes(".tmp.") && !f.startsWith(".trust.")) continue;
      let p = pathModule_2.join(dir, f);
      if (fsModule_2.statSync(p).mtimeMs < cutoff)
        fsModule_2.rmSync(p, {
          force: true,
        });
    }
  } catch {}
  let gen = generateCa({
    cn: "sandbox-runtime persistent CA",
  });
  atomicWrite(
    jsonPath,
    JSON.stringify({
      certPem: gen.certPem,
      keyPem: gen.keyPem,
    }),
  );
  let on = readValid();
  let { certPem, keyPem, thumbprint } = on ?? {
    certPem: gen.certPem,
    keyPem: gen.keyPem,
    thumbprint: certThumbprint(gen.certPem),
  };
  return await finish(certPem, keyPem, thumbprint, true);
}
//@ chunk-fq0cr76a.js:795427-795441 esm-fingerprint
var INSTALL_TIMEOUT_MS = 120000;
//@ chunk-fq0cr76a.js:795441-795479 esm-fingerprint
function installTimeoutMs(opts) {
  return opts.timeoutMs ?? INSTALL_TIMEOUT_MS;
}
//@ chunk-fq0cr76a.js:795479-795808 esm-fingerprint
function installArgs(opts) {
  let args = ["install"];
  if (opts.sublayerGuid) args.push("--sublayer-guid", opts.sublayerGuid);
  if (opts.proxyPortRange)
    args.push("--proxy-port-range", `${opts.proxyPortRange[0]}-${opts.proxyPortRange[1]}`);
  if (opts.allowLoopback) args.push("--allow-loopback");
  if (opts.sandboxUser) args.push("--sandbox-user", opts.sandboxUser);
  if (opts.force) args.push("--force");
  return args;
}
//@ chunk-fq0cr76a.js:795808-796035 esm-fingerprint
function remapInstallTimeout(error) {
  if (error instanceof WindowsSandboxError && error.code === "srt_win_timeout")
    throw new WindowsSandboxError(
      "install_timeout",
      "srt-win install timed out \u2014 the UAC prompt may still be open. " +
        `Re-run when ready to grant elevation. (${error.message})`,
    );
  throw error;
}
//@ chunk-fq0cr76a.js:796035-796957 esm-fingerprint
function throwOnInstallFailure(r) {
  logForDebugging_2(`[Sandbox Windows] install exit=${r.status}: ${r.stderr || r.stdout}`);
  if (r.status === 0 || r.status === 10) return;
  if (rejectsAllowLoopback(r)) throw srtWinTooOld(r.stderr);
  let out = r.stderr || r.stdout;
  switch (r.status) {
    case 12:
      throw new WindowsSandboxError(
        "install_wfp_failed",
        `srt-win install: WFP filter install failed: ${out}`,
      );
    case 14:
      throw new WindowsSandboxError(
        "install_user_failed",
        `srt-win install: sandbox user provisioning failed: ${out}`,
      );
    case 13:
      throw new WindowsSandboxError(
        "install_config_conflict",
        `srt-win install: filters already exist under this sublayer with a different port range, loopback mode or sandbox-user name. Pass {force: true} to replace, or pick a different sublayerGuid. Output: ${out}`,
      );
    case 17:
      throw new WindowsSandboxError(
        "install_ambient_failed",
        `srt-win install: ambient write-deny stamping failed (stock world-writable system dirs could not be deny-stamped for the sandbox user): ${out}`,
      );
    default:
      throw new WindowsSandboxError("install_failed", `srt-win install failed (exit ${r.status}): ${out}`);
  }
}
//@ chunk-fq0cr76a.js:796957-797387 esm-fingerprint
async function installWindowsSandboxAsync(opts = {}) {
  let srtWin = opts.srtWin ?? resolveSrtWin();
  let result;
  try {
    result = await runSrtWinAsync(installArgs(opts), {
      timeoutMs: installTimeoutMs(opts),
      srtWin,
    });
  } catch (e) {
    remapInstallTimeout(e);
  }
  throwOnInstallFailure(result);
  let state = await checkWindowsSandboxStatusAsync({
    sublayerGuid: opts.sublayerGuid,
    srtWin,
  });
  if (result.status === 10)
    return {
      ...state,
      cancelled: true,
    };
  let skip = installProfileGrantSkip(opts, state.user);
  if (skip)
    return {
      ...state,
      profileGrant: skip,
    };
  opts.onProfileGrantStart?.(windowsProfileGrantNotice(osModule_2.homedir()));
  try {
    let result = await grantWindowsProfileRead(installProfileGrantOptions(opts, srtWin));
    return {
      ...state,
      profileGrant: {
        applied: true,
        userSid: state.user.realUserSid,
        result,
      },
    };
  } catch (e) {
    throwInstallProfileGrantFailure(e);
  }
}
//@ chunk-fq0cr76a.js:797387-797438 esm-fingerprint
var WINDOWS_SERVICE_ACCOUNT_SIDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:797387", () => {
  WINDOWS_SERVICE_ACCOUNT_SIDS = new Set(["S-1-5-18", "S-1-5-19", "S-1-5-20"]);
});
//@ chunk-fq0cr76a.js:797438-798181 esm-layout
function windowsProfileGrantSkipReason(user, opts = {}) {
  if (opts.skipProfileGrant) return "skipProfileGrant was set";
  let how =
    "run the install, or grantWindowsProfileRead() (`srt-win profile grant`), as the user whose sessions are to read their profile";
  if (WINDOWS_SERVICE_ACCOUNT_SIDS.has(user.realUserSid))
    return `the install ran as the service account ${user.realUserSid}, which runs no sessions; ${how}`;
  if (user.sessionUserSid === undefined)
    return `the owner of the session this install ran in could not be determined, so it is not known whose profile ${user.realUserSid} is; ${how}`;
  if (user.sessionUserSid.toUpperCase() !== user.realUserSid.toUpperCase())
    return `the install ran as ${user.realUserSid} in a session that belongs to ${user.sessionUserSid}; granting would open the installing account's profile, not the session owner's; ${how}`;
  return;
}
//@ chunk-fq0cr76a.js:798181-798259 esm-fingerprint
function installProfileGrantSkip(opts, user) {
  let reason = windowsProfileGrantSkipReason(user, opts);
  return reason === undefined
    ? undefined
    : {
        applied: false,
        reason,
      };
}
//@ chunk-fq0cr76a.js:798259-798743 esm-layout
function windowsProfileGrantNotice(profileDir) {
  return `Making ${profileDir} readable to sandboxed commands on this machine, except the excluded credential stores (SSH and GPG keys, cloud and browser sign-ins, password managers, registry hives). Readable files include package-manager configuration that can hold feed tokens: .npmrc, pip.ini, NuGet.Config, Maven settings.xml, gradle.properties, .gitconfig. Skip with --skip-profile-grant (skipProfileGrant); undo with \`srt-win profile forget\` (forgetWindowsProfileRead()).`;
}
//@ chunk-fq0cr76a.js:798743-798872 esm-fingerprint
function installProfileGrantOptions(opts, srtWin) {
  return {
    exclude: opts.profileExclude,
    timeoutMs: opts.profileGrantTimeoutMs,
    onProgress: opts.onProfileGrantProgress,
    srtWin,
  };
}
//@ chunk-fq0cr76a.js:798872-799483 esm-fingerprint
function throwInstallProfileGrantFailure(error) {
  let cause = error;
  if (
    cause instanceof WindowsSandboxError &&
    (cause.code === "profile_grant_blocked_by_session" || cause.code === "profile_operation_in_progress")
  )
    throw new WindowsSandboxError(
      cause.code,
      `The Windows sandbox is installed. ${cause.message}`,
      "profile",
    );
  let timedOut = cause instanceof WindowsSandboxError && cause.code === "srt_win_timeout";
  throw new WindowsSandboxError(
    "profile_grant_failed",
    `The Windows sandbox is installed, but the read grant on your user profile ${timedOut ? "did not finish in time" : "could not be applied"}: ${cause.message}
No session starts until it is complete. Run the install again, or grantWindowsProfileRead(), to finish it; forgetWindowsProfileRead() removes what was written.`,
    "profile",
  );
}
//@ chunk-fq0cr76a.js:799483-799931 esm-fingerprint
function uninstallWindowsSandbox(opts = {}) {
  let args = ["uninstall"];
  if (opts.sublayerGuid) args.push("--sublayer-guid", opts.sublayerGuid);
  if (opts.keepUser) args.push("--keep-user");
  let args_2 = runSrtWin(args, {
    timeoutMs:
      opts.timeoutMs ?? (opts.keepUser ? INSTALL_TIMEOUT_MS : INSTALL_TIMEOUT_MS + PROFILE_GRANT_TIMEOUT_MS),
    srtWin: opts.srtWin,
  });
  logForDebugging_2(`[Sandbox Windows] uninstall exit=${args_2.status}: ${args_2.stderr || args_2.stdout}`);
  if (args_2.status === 10)
    return {
      cancelled: true,
    };
  if (args_2.status !== 0)
    throw new WindowsSandboxError(
      "uninstall_failed",
      `srt-win uninstall failed (exit ${args_2.status}): ${args_2.stderr || args_2.stdout}`,
    );
  return {};
}
//@ chunk-fq0cr76a.js:799931-800550 esm-fingerprint
function expandWindowsFsPaths(patterns, opts) {
  let out = new Set();
  for (let entry of patterns) {
    let marked = typeof entry !== "string";
    let raw = marked ? markedLiteralPath(entry) : entry;
    let norm = normalizePathForSandbox(
      raw,
      marked
        ? {
            literal: true,
          }
        : undefined,
    );
    if (marked && containsGlobCharsWin(norm)) {
      logForDebugging_2(`[Sandbox Windows] Skipping a literal path that no file can have: ${norm}`, {
        level: "warn",
      });
      continue;
    }
    let isGlob = !marked && containsGlobCharsWin(norm);
    if (isUncPath(norm) && !isGlob) {
      out.add(norm);
      continue;
    }
    let candidates = isGlob
      ? [
          ...expandGlobPattern(norm, {
            caseInsensitive: true,
          }),
          ...literalReadings(raw, opts?.mode === "deny" ? "deny" : "allow", {
            isPattern: containsGlobCharsWin,
          }).flatMap((reading) =>
            reading.glob
              ? expandGlobPattern(reading.path, {
                  caseInsensitive: true,
                  anchor: reading.anchor,
                })
              : [],
          ),
        ]
      : [norm];
    for (let c of candidates) {
      if (
        !fsModule_2.statSync(c, {
          throwIfNoEntry: false,
        })
      ) {
        if (opts?.mode === "deny" && !isGlob) out.add(/[\\/]$/.test(raw) && !/[\\/]$/.test(c) ? c + "\\" : c);
        continue;
      }
      out.add(c);
    }
  }
  return [...out];
}
//@ chunk-fq0cr76a.js:800550-800620 esm-fingerprint
function isUnprobedWindowsPath(p) {
  return isUncPath(p) || /^[\\/]{2}[?.][\\/](?![a-z]:)/i.test(p);
}
//@ chunk-fq0cr76a.js:800620-800684 esm-fingerprint
function isNotFoundErrorCode(error) {
  let code = error?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-fq0cr76a.js:800684-800873 esm-fingerprint
function resolveWindowsPath(p) {
  if (isUnprobedWindowsPath(p))
    return {
      state: "unprobed",
    };
  try {
    return {
      state: "resolved",
      path: fsModule_2.realpathSync.native(p),
    };
  } catch (e) {
    return isNotFoundErrorCode(e)
      ? {
          state: "absent",
        }
      : {
          state: "error",
          code: e?.code ?? "unknown",
        };
  }
}
//@ chunk-fq0cr76a.js:800873-800907 esm-layout
function windowsPathKey(p) {
  return windowsPathKeyOf(p, resolveWindowsPath(p));
}
//@ chunk-fq0cr76a.js:800907-801028 esm-fingerprint
function windowsPathKeyOf(p, resolved) {
  return normalizeCaseForComparison(
    pathModule_2.win32
      .normalize(stripExtendedPathPrefix(resolved.state === "resolved" ? resolved.path : p))
      .replace(/\\/g, "/")
      .replace(/\/+$/, ""),
  );
}
//@ chunk-fq0cr76a.js:801028-801158 esm-fingerprint
function coveringWindowsPath(dirs) {
  let keys = dirs.map(windowsPathKey);
  return (p) => {
    if (keys.length === 0) return;
    let key = windowsPathKey(p);
    let covering = keys.findIndex((dir) => isAtOrUnder(key, dir));
    return covering < 0 ? undefined : dirs[covering];
  };
}
//@ chunk-fq0cr76a.js:801158-801455 esm-fingerprint
function windowsGrantsBeneathDenies(grants, denies) {
  if (grants.length === 0 || denies.length === 0) return [];
  let denyKeys = denies.map(windowsPathKey);
  let keyed = grants.map((g) => ({
    path: g,
    key: windowsPathKey(g),
  }));
  let out = new Map();
  for (let d of denyKeys) {
    let beneath = keyed.filter((g) => g.key !== d && isAtOrUnder(g.key, d));
    for (let g of beneath)
      if (!beneath.some((other) => other.key !== g.key && isAtOrUnder(g.key, other.key)) && !out.has(g.key))
        out.set(g.key, g.path);
  }
  return [...out.values()];
}
//@ chunk-fq0cr76a.js:801455-802192 esm-fingerprint
function rankWindowsFsAccess(lists) {
  let credentialDenyOver = coveringWindowsPath(lists.credentialDeny);
  let writeDenyOver = coveringWindowsPath(lists.denyWrite);
  let grantRead = new Set();
  let grantWrite = new Set();
  let rank = (list, p) => {
    let credentialDeny = credentialDenyOver(p);
    let writeDeny = list === "allowWrite" ? writeDenyOver(p) : undefined;
    if (credentialDeny === undefined && writeDeny === undefined) {
      (list === "allowRead" ? grantRead : grantWrite).add(p);
      return;
    }
    if (credentialDeny === undefined) grantRead.add(p);
    logForDebugging_2(
      `[Sandbox Windows] ${list} ${p} is at or beneath ` +
        (credentialDeny !== undefined
          ? `the credential file entry ${credentialDeny}: not granted`
          : `denyWrite ${writeDeny}: granted read only`),
      {
        level: "warn",
      },
    );
  };
  for (let p of lists.allowRead) rank("allowRead", p);
  for (let p of lists.allowWrite) rank("allowWrite", p);
  let heldRead = lists.held?.grantRead ?? [];
  let heldWrite = lists.held?.grantWrite ?? [];
  return {
    grantRead: [...grantRead],
    grantWrite: [...grantWrite],
    denyRead: [
      ...new Set([
        ...lists.denyRead,
        ...lists.credentialDeny,
        ...[...heldRead, ...heldWrite].filter((p) => credentialDenyOver(p) !== undefined),
      ]),
    ],
    denyWrite: [...new Set([...lists.denyWrite, ...heldWrite.filter((p) => writeDenyOver(p) !== undefined)])],
  };
}
//@ chunk-fq0cr76a.js:802192-802227 esm-fingerprint
function parseWindowsSandboxError(stderr) {
  return parseSrtWinLaunchError(stderr, "exec");
}
//@ chunk-fq0cr76a.js:802227-803141 esm-fingerprint
function parseSrtWinLaunchError(stderr, subcommand) {
  for (let line of stderr.split(/\r?\n/)) {
    let t = line.trim();
    if (!t.startsWith("{") || !t.includes('"code"')) continue;
    try {
      let j = JSON.parse(t);
      if (j.code === "profile_operation_in_progress")
        return new WindowsSandboxError(
          "profile_operation_in_progress",
          j.message ?? "a profile grant or forget is in progress",
          "exec",
        );
      if (j.code === "session_ended")
        return new WindowsSandboxError(
          "session_ended",
          j.message ?? "the session that started this command ended; the command was terminated",
          "exec",
        );
      if (j.code === "mapped_drive_cwd")
        return Object.assign(
          new WindowsSandboxError(
            "mapped_drive_cwd",
            j.message ?? "mapped/network-drive working directory",
            subcommand,
          ),
          {
            drive: j.drive,
          },
        );
      if (j.code === "wfp_loopback_mismatch")
        return new WindowsSandboxError(
          "wfp_loopback_mismatch",
          j.message ?? "the installed loopback mode is not this session's",
          "exec",
        );
      if (j.code === "seclogon_disabled") {
        let state = j.state === "missing" ? "missing" : "disabled";
        return Object.assign(
          new WindowsSandboxError(
            "seclogon_disabled",
            j.message ?? seclogonDisabledMessage(state),
            subcommand,
          ),
          {
            state,
          },
        );
      }
    } catch {}
  }
  return;
}
//@ chunk-fq0cr76a.js:803141-803231 esm-fingerprint
var WINDOWS_ACL_GRANT_RELEASED_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:803141", () => {
  WINDOWS_ACL_GRANT_RELEASED_STATUSES = new Set([
    "revoked",
    "stillHeld",
    "downgraded",
    "relocated",
    "noRow",
    "gone",
    "missing",
  ]);
});
//@ chunk-fq0cr76a.js:803231-803478 esm-fingerprint
function windowsAclGrantReleased(o) {
  if (typeof o !== "object" || o === null) return false;
  let { path: p, status } = o;
  if (typeof p !== "string" || typeof status !== "string") return false;
  if (!WINDOWS_ACL_GRANT_RELEASED_STATUSES.has(status)) return false;
  if (status !== "missing") return true;
  try {
    fsModule_2.lstatSync(p);
    return false;
  } catch (e) {
    return e.code === "ENOENT";
  }
}
//@ chunk-fq0cr76a.js:803478-803943 esm-fingerprint
function restoreWindowsAcl(opts) {
  let holder = opts.holderPid ?? process.pid;
  try {
    let args = runSrtWinJsonAllowFail(
      ["acl", "restore", "--holder-pid", `${holder}`, "--sandbox-user-sid", opts.sandboxUserSid, "--json"],
      {
        timeoutMs: 300000,
        srtWin: opts.srtWin,
      },
    );
    if (!args.ok)
      logForDebugging_2(
        `[Sandbox Windows] acl restore exited non-zero (per-path outcomes preserved): ${args.stderr}`,
        {
          level: "error",
        },
      );
    return Array.isArray(args.json) ? args.json : [...(args.json.paths ?? []), ...(args.json.parents ?? [])];
  } catch (e) {
    logForDebugging_2(`[Sandbox Windows] acl restore: ${e.message}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-fq0cr76a.js:803943-804041 esm-fingerprint
function allowProfileExclusionArgs(opts) {
  return (opts.allowProfileExclusions ?? []).flatMap((p) => ["--allow-profile-exclusion", p]);
}
//@ chunk-fq0cr76a.js:804041-804616 esm-fingerprint
async function grantWindowsAclPersistent(opts) {
  let holder = opts.holderPid ?? process.pid;
  let stdin = JSON.stringify({
    read: opts.read,
    write: opts.write,
    denyRead: opts.denyRead,
    denyWrite: opts.denyWrite,
  });
  let r = await runSrtWinAsync(
    [
      "acl",
      "grant",
      "--holder-pid",
      `${holder}`,
      "--sandbox-user-sid",
      opts.sandboxUserSid,
      "--persistent",
      ...allowProfileExclusionArgs(opts),
    ],
    {
      timeoutMs: 600000,
      stdin,
      srtWin: opts.srtWin,
    },
  );
  logForDebugging_2(`[Sandbox Windows] acl grant --persistent exit=${r.status}: ${r.stderr || r.stdout}`);
  if (r.status !== 0)
    throw new WindowsSandboxError(
      "acl_grant_failed",
      `srt-win acl grant --persistent exited ${r.status} ` +
        (r.status === 2 ? "(partial \u2014 some inputs skipped)" : "(failed)") +
        `: ${r.stderr || r.stdout}`,
    );
}
//@ chunk-fq0cr76a.js:804616-805058 esm-fingerprint
function revokeWindowsAclChecked(opts) {
  let holder = opts.holderPid ?? process.pid;
  let result;
  try {
    let r = runSrtWinJsonAllowFail(
      ["acl", "revoke", "--holder-pid", `${holder}`, "--sandbox-user-sid", opts.sandboxUserSid, "--json"],
      {
        timeoutMs: 300000,
        srtWin: opts.srtWin,
      },
    );
    if (!r.ok)
      logForDebugging_2(`[Sandbox Windows] acl revoke exited non-zero: ${r.stderr}`, {
        level: "error",
      });
    result = windowsAclRevokeResult(r.ok, r.json, r.stderr);
  } catch (e) {
    let detail = e.message;
    logForDebugging_2(`[Sandbox Windows] acl revoke: ${detail}`, {
      level: "error",
    });
    result = {
      complete: false,
      outcomes: undefined,
      pending: [],
      detail,
    };
  }
  return result;
}
//@ chunk-fq0cr76a.js:805058-805255 esm-fingerprint
function windowsAclRevokeResult(exitedZero, json, stderr) {
  let outcomes = Array.isArray(json) ? json : undefined;
  let unreleased = (outcomes ?? []).filter((o) => !windowsAclGrantReleased(o));
  return {
    complete: exitedZero && outcomes !== undefined && unreleased.length === 0,
    outcomes,
    pending: unreleased.map((o) => String(o?.path)),
    detail: stderr.trim() || undefined,
  };
}
//@ chunk-fq0cr76a.js:805255-805488 esm-fingerprint
var PROFILE_GRANT_STATES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROFILE_PATH_KINDS;
var WINDOWS_PROFILE_READ_ENV_VARS;
var WINDOWS_PROFILE_RECORD_VERSION;
deferInit("chunk-fq0cr76a.js:805255", () => {
  PROFILE_GRANT_STATES = new Set(["none", "current", "outdated", "incomplete", "unknown"]);
  PROFILE_PATH_KINDS = new Set(["container", "granted", "file", "denied"]);
  WINDOWS_PROFILE_READ_ENV_VARS = [
    "NPM_CONFIG_USERCONFIG",
    "GIT_CONFIG_GLOBAL",
    "PIP_CONFIG_FILE",
    "MAVEN_ARGS",
    "RUSTUP_HOME",
    "CARGO_HOME",
  ];
  WINDOWS_PROFILE_RECORD_VERSION = 1;
});
//@ chunk-fq0cr76a.js:805488-805579 esm-fingerprint
function stringList(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x !== "") ? v : undefined;
}
//@ chunk-fq0cr76a.js:805579-805930 esm-fingerprint
function profileStatusProblem(raw) {
  if (raw.record_version !== WINDOWS_PROFILE_RECORD_VERSION)
    return `srt-win reports record format ${JSON.stringify(raw.record_version)}; this library reads format ${WINDOWS_PROFILE_RECORD_VERSION}`;
  let exclusions = stringList(raw.exclusions);
  if (!exclusions || exclusions.length === 0) return "the recorded grant carries no list of excluded paths";
  if (!stringList(raw.ungranted_only)) return "the recorded grant carries no list of ungranted directories";
  return;
}
//@ chunk-fq0cr76a.js:805930-806753 esm-fingerprint
function mapProfileStatus(raw) {
  let state = PROFILE_GRANT_STATES.has(raw.state ?? "") ? raw.state : "unknown";
  let reason = raw.reason;
  let problem = state === "current" ? profileStatusProblem(raw) : undefined;
  if (problem) {
    state = "outdated";
    reason = problem;
  }
  let env = {};
  if (state === "current")
    for (let name of WINDOWS_PROFILE_READ_ENV_VARS) {
      let v = raw.env?.[name];
      if (typeof v === "string" && v !== "") env[name] = v;
    }
  return {
    state,
    ...(reason && {
      reason,
    }),
    ...(raw.profile && {
      profile: raw.profile,
    }),
    capabilities: capabilityList(raw.capabilities),
    notGranted: grantItems(raw.not_granted),
    selfClosed: grantItems(raw.self_closed),
    unverifiable: grantItems(raw.unverifiable),
    unprotected: grantItems(raw.unprotected),
    staleAllow: grantItems(raw.stale_allow),
    replacedFiles: stringList(raw.replaced_files) ?? [],
    extraExclusions: raw.extra_exclusions ?? [],
    exclusions: stringList(raw.exclusions) ?? [],
    ungrantedOnly: stringList(raw.ungranted_only) ?? [],
    counts: {
      containers: raw.containers ?? 0,
      granted: raw.granted ?? 0,
      files: raw.files ?? 0,
      denied: raw.denied ?? 0,
    },
    env,
    ...(raw.paths && {
      paths: raw.paths.filter(
        (p) => typeof p.path === "string" && typeof p.kind === "string" && PROFILE_PATH_KINDS.has(p.kind),
      ),
    }),
  };
}
//@ chunk-fq0cr76a.js:806753-806925 esm-fingerprint
function getWindowsProfileReadStatus(opts = {}) {
  let args = ["profile", "status"];
  if (opts.paths) args.push("--paths");
  let raw = runSrtWinJson(args, {
    timeoutMs: 30000,
    srtWin: opts.srtWin,
  });
  if (raw.state === "in_progress") throwIfRefusedBesideOthers(args, SRT_WIN_EXIT_PROFILE_BUSY, "");
  return mapProfileStatus(raw);
}
//@ chunk-fq0cr76a.js:806925-807110 esm-fingerprint
async function getWindowsProfileReadStatusAsync(opts = {}) {
  let args = ["profile", "status"];
  if (opts.paths) args.push("--paths");
  let raw = await runSrtWinJsonAsync(args, {
    timeoutMs: 30000,
    srtWin: opts.srtWin,
  });
  if (raw.state === "in_progress") throwIfRefusedBesideOthers(args, SRT_WIN_EXIT_PROFILE_BUSY, "");
  return mapProfileStatus(raw);
}
//@ chunk-fq0cr76a.js:807110-807125 esm-layout
var PROFILE_GRANT_TIMEOUT_MS = 1800000;
//@ chunk-fq0cr76a.js:807125-807541 esm-fingerprint
function grantItems(v) {
  return Array.isArray(v)
    ? v.flatMap((i) => {
        let { path: p, reason } = i ?? {};
        if (typeof p !== "string") return [];
        let { caller_reads: reads, cause, protected_exclusion: protectedExclusion, entry } = i;
        return [
          {
            path: p,
            reason: typeof reason === "string" ? reason : "",
            ...((typeof reads === "boolean" || reads === "unknown") && {
              callerReads: reads,
            }),
            ...(typeof cause === "string" && {
              cause,
            }),
            ...(typeof protectedExclusion === "boolean" && {
              protectedExclusion,
            }),
            ...((entry === "explicit" || entry === "inherited") && {
              entry,
            }),
          },
        ];
      })
    : [];
}
//@ chunk-fq0cr76a.js:807541-808509 esm-fingerprint
async function grantWindowsProfileRead(opts = {}) {
  let { exe, prependArgs } = opts.srtWin ?? resolveSrtWin();
  let args = profileGrantArgs(opts);
  let timeoutMs = opts.timeoutMs ?? PROFILE_GRANT_TIMEOUT_MS;
  let r = await new Promise((resolve, reject) => {
    let child = spawn(exe, [...prependArgs, ...args], {
      windowsHide: true,
    });
    let timedOut = false;
    let timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill();
          }, timeoutMs)
        : undefined;
    let stdout = "";
    let stderr = "";
    let pending = "";
    child.stdout?.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr?.setEncoding("utf8").on("data", (d) => {
      stderr += d;
      pending += d;
      let lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (let line of lines) if (line.trim() !== "") opts.onProgress?.(line);
    });
    child.stdin?.on("error", () => {}).end();
    child.once("error", (e) => {
      clearTimeout(timer);
      reject(
        new WindowsSandboxError("spawn_failed", `srt-win profile: spawn failed: ${e.message}`, "profile"),
      );
    });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      if (pending.trim() !== "") opts.onProgress?.(pending);
      if (timedOut) {
        reject(
          new WindowsSandboxError(
            "srt_win_timeout",
            `srt-win profile grant timed out after ${timeoutMs}ms; the ` +
              "grant is recorded as incomplete \u2014 run it again, or remove " +
              "it with forgetWindowsProfileRead()",
            "profile",
          ),
        );
        return;
      }
      try {
        throwIfRefusedBesideOthers(args, status, stdout);
      } catch (e) {
        reject(e);
        return;
      }
      resolve({
        status,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
  return profileGrantResult(args, r);
}
//@ chunk-fq0cr76a.js:808509-808669 esm-fingerprint
function profileGrantArgs(opts) {
  let args = ["profile", "grant", "--json"];
  for (let e of opts.exclude ?? []) args.push("--exclude", e);
  if (opts.replaceExclusions) args.push("--replace-excludes");
  return args;
}
//@ chunk-fq0cr76a.js:808669-809336 esm-fingerprint
function profileGrantResult(args, r_2) {
  logForDebugging_2(`[Sandbox Windows] profile grant exit=${r_2.status}: ${r_2.stderr.slice(-2000)}`);
  if (r_2.status !== 0)
    throw new WindowsSandboxError(
      "profile_grant_failed",
      `srt-win profile grant exited ${r_2.status}: ${r_2.stderr.slice(-2000) || r_2.stdout}`,
      "profile",
    );
  let raw = parseSrtWinJson(args, r_2);
  return {
    profile: raw.profile,
    containers: raw.containers,
    granted: raw.granted,
    files: raw.files,
    denied: raw.denied,
    placeholders: raw.placeholders,
    writes: raw.writes,
    unchanged: raw.unchanged,
    removed: raw.removed,
    skipped: raw.skipped ?? [],
    notGranted: grantItems(raw.not_granted),
    selfClosed: grantItems(raw.self_closed),
    unverifiable: grantItems(raw.unverifiable),
    unprotected: grantItems(raw.unprotected),
    staleAllow: grantItems(raw.stale_allow),
    forgottenRoots: grantItems(raw.forgotten_roots),
    elapsedMs: raw.elapsed_ms,
  };
}
//@ chunk-fq0cr76a.js:809336-809457 esm-fingerprint
async function forgetWindowsProfileReadAsync(opts = {}) {
  let r = await runSrtWinAsync(["profile", "forget", "--json"], {
    timeoutMs: opts.timeoutMs ?? PROFILE_GRANT_TIMEOUT_MS,
    srtWin: opts.srtWin,
  });
  profileForgetResult(r);
}
//@ chunk-fq0cr76a.js:809457-809728 esm-fingerprint
function profileForgetResult(r) {
  logForDebugging_2(`[Sandbox Windows] profile forget exit=${r.status}: ${r.stderr || r.stdout}`);
  if (r.status !== 0)
    throw new WindowsSandboxError(
      "profile_forget_failed",
      `The profile read grant could not be removed (srt-win profile forget exited ${r.status}): ${r.stderr || r.stdout}`,
      "profile",
    );
}
//@ chunk-fq0cr76a.js:809728-809808 esm-fingerprint
function profilePathKey(p) {
  return stripExtendedPathPrefix(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}
//@ chunk-fq0cr76a.js:809808-809912 esm-fingerprint
function exclusionComponentMatches(pattern, name) {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) return name.startsWith(pattern.slice(0, -1));
  return pattern === name;
}
//@ chunk-fq0cr76a.js:809912-810414 esm-fingerprint
function exclusionMatchedBeneath(dir, rest, top = true) {
  if (rest.length === 0) return "match";
  let entries;
  try {
    let st = fsModule_2.lstatSync(dir);
    if (st.isSymbolicLink())
      return top
        ? {
            unexamined: `'${dir}' is a link`,
          }
        : "none";
    if (!st.isDirectory()) return "none";
    entries = fsModule_2.readdirSync(dir, {
      withFileTypes: true,
    });
  } catch (e) {
    if (isNotFoundErrorCode(e)) return "none";
    let code = e?.code ?? "error";
    return {
      unexamined: `'${dir}' could not be listed (${code})`,
    };
  }
  let unexamined;
  for (let e of entries) {
    if (!exclusionComponentMatches(rest[0], normalizeCaseForComparison(e.name))) continue;
    let found = exclusionMatchedBeneath(pathModule_2.join(dir, e.name), rest.slice(1), false);
    if (found === "match") return "match";
    if (found !== "none") unexamined ?? (unexamined = found);
  }
  return unexamined ?? "none";
}
//@ chunk-fq0cr76a.js:810414-811659 esm-fingerprint
function windowsProfileExclusionConflicts(paths, grant, opts = {}) {
  if (paths.length === 0) return [];
  let access = opts.write ? "write" : "read";
  let rulesOf = (list, kind) =>
    list.map((e) => ({
      exclusion: e,
      kind,
      parts: normalizeCaseForComparison(profilePathKey(e)).split("/"),
    }));
  let ungranted = rulesOf(grant.ungrantedOnly, "ungranted-only");
  let rules = [
    ...ungranted.map((r) => ({
      ...r,
      onlyEqual: true,
    })),
    ...rulesOf(grant.exclusions, "protected").map((r) => ({
      ...r,
      onlyEqual: false,
    })),
    ...ungranted.map((r) => ({
      ...r,
      onlyEqual: false,
    })),
  ];
  if (rules.length === 0) return [];
  let admitted = new Set(opts.write ? [] : (opts.override ?? []).map(windowsPathKey));
  let out = [];
  for (let p of paths) {
    let onDisk = resolveWindowsPath(p);
    let key = windowsPathKeyOf(p, onDisk);
    let parts = key.split("/");
    for (let r of rules) {
      let shared = Math.min(parts.length, r.parts.length);
      let related = true;
      for (let i = 0; related && i < shared; i++) related = exclusionComponentMatches(r.parts[i], parts[i]);
      if (!related) continue;
      let relation =
        parts.length === r.parts.length ? "equal" : parts.length > r.parts.length ? "inside" : "above";
      if (r.onlyEqual && relation !== "equal") continue;
      let unexamined;
      if (relation === "above" && r.exclusion.includes("*")) {
        if (onDisk.state === "absent") continue;
        if (onDisk.state === "resolved") {
          let found = exclusionMatchedBeneath(onDisk.path, r.parts.slice(parts.length));
          if (found === "none") continue;
          if (found !== "match") unexamined = found.unexamined;
        } else
          unexamined =
            onDisk.state === "unprobed"
              ? `'${p}' is not on a local drive and is not examined`
              : `'${p}' could not be resolved (${onDisk.code})`;
      }
      if (r.kind === "ungranted-only") {
        if (relation === "inside") continue;
      } else if (relation !== "above" && admitted.has(key)) continue;
      out.push({
        path: p,
        exclusion: r.exclusion,
        kind: r.kind,
        access,
        relation,
        ...(unexamined === undefined
          ? {}
          : {
              unexamined,
            }),
      });
      break;
    }
  }
  return out;
}
//@ chunk-fq0cr76a.js:811659-811692 esm-fingerprint
var WINDOWS_LOOPBACK_NO_PROXY = "localhost,127.0.0.1,::1";
//@ chunk-fq0cr76a.js:811692-813329 esm-fingerprint
function wrapCommandWithSandboxWindows(p) {
  let { exe, prependArgs } = p.srtWin ?? resolveSrtWin();
  let generated = envListToObject(
    generateProxyEnvVars(
      p.httpProxyPort,
      p.socksProxyPort,
      p.caCertPath?.replace(/\\/g, "/"),
      p.proxyAuthToken,
      undefined,
      encodeSandboxedCommand(orDefault(p.command, p.commandId)),
    ),
  );
  delete generated.TMPDIR;
  delete generated.NO_PROXY;
  delete generated.no_proxy;
  if (p.allowLoopback && (p.httpProxyPort || p.socksProxyPort))
    generated.no_proxy = WINDOWS_LOOPBACK_NO_PROXY;
  let gitCfg = buildGitConfigEnv({
    safeDirs: [p.cwd ?? process.cwd(), ...(p.allowWrite ?? []), ...(p.gitSafeDirectories ?? [])],
    schannelCa: p.caCertPath !== undefined,
    opensslBackend: true,
    baseEnv: p.setEnvVars,
  });
  let argv = [exe, ...prependArgs, "exec"];
  if (p.quiet !== false) argv.push("--quiet");
  if (p.heldBy !== undefined) argv.push("--held-by", `${p.heldBy}`);
  argv.push("--write-restricted-token");
  for (let r of p.writeRoots ?? []) argv.push("--write-root", r);
  if (p.allowLoopback) argv.push("--allow-loopback");
  for (let d of p.denyRead ?? []) argv.push("--deny-read", d);
  for (let a of p.denyReadExcept ?? []) argv.push("--deny-read-except", a);
  for (let d of p.denyWrite ?? []) argv.push("--deny-write", d);
  let overlay = mergeWindowsEnv(
    {
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      ...(p.httpProxyPort
        ? {
            NODE_USE_ENV_PROXY: "1",
          }
        : {}),
    },
    p.setEnvVars ?? {},
    generated,
    gitCfg,
  );
  for (let [k, v] of Object.entries(overlay)) if (v !== undefined) argv.push("--env", `${k}=${v}`);
  argv.push("--");
  let sh = p.binShell ?? parseWindowsBinShell(undefined);
  argv.push(sh.exe, ...sh.args, p.command);
  let cmdlineEstimate = argv.reduce((n, a) => n + a.length + 3, 0);
  if (cmdlineEstimate > 30000)
    throw new WindowsSandboxError(
      "argv_too_long",
      `Windows sandbox argv is ~${cmdlineEstimate} chars (CreateProcessW limit is 32 767). Besides the command itself it carries ${p.denyRead?.length ?? 0} per-command read denies, ${p.denyReadExcept?.length ?? 0} session grants beneath them, ${p.denyWrite?.length ?? 0} write denies and ${p.writeRoots?.length ?? 0} write roots; the command was not run with fewer.`,
    );
  let env = {
    ...process.env,
    ...generated,
  };
  return {
    argv,
    env,
  };
}
//@ chunk-fq0cr76a.js:813329-813427 esm-fingerprint
var WINDOWS_PROXY_NAME_SPELLING = [
  "http_proxy",
  "https_proxy",
  "ftp_proxy",
  "all_proxy",
  "no_proxy",
  "grpc_proxy",
  "RSYNC_PROXY",
];
//@ chunk-fq0cr76a.js:813427-813645 esm-fingerprint
function mergeWindowsEnv(...layers) {
  let byName = new Map();
  for (let layer of layers)
    for (let [name, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      let folded = name.toUpperCase();
      let spelling = WINDOWS_PROXY_NAME_SPELLING.find((n) => n.toUpperCase() === folded) ?? name;
      byName.set(folded, [spelling, value]);
    }
  return Object.fromEntries(byName.values());
}
//@ chunk-fq0cr76a.js:813645-813763 esm-fingerprint
function envListToObject(list) {
  let out = {};
  for (let entry of list) {
    let eq = entry.indexOf("=");
    if (eq === -1) continue;
    out[entry.slice(0, eq)] = entry.slice(eq + 1);
  }
  return out;
}
//@ chunk-fq0cr76a.js:813763-814516 esm-layout
function windowsSetupVersionMismatch(us, sublayerGuid) {
  if (us.setupVersion === undefined || us.markerVersion === us.setupVersion) return;
  if (us.markerVersion !== undefined && us.markerVersion > us.setupVersion) {
    let sl = sublayerGuid ? ` --sublayer-guid ${sublayerGuid}` : "";
    return `The Windows sandbox on this machine was set up by a newer release (setup version ${us.markerVersion}; this release needs ${us.setupVersion}). Use that release, or replace its install with this one: \`srt-win.exe install --force${sl}\`.
Nothing is granted or run until then.`;
  }
  return (
    `The Windows sandbox on this machine was set up by a different release (setup version ${us.markerVersion ?? "unknown"}; this release needs ${us.setupVersion}). Re-run the install to upgrade it in place (one UAC prompt):
` +
    windowsInstallCommandLines(
      windowsInstallFlags(
        {
          sublayerGuid,
        },
        false,
      ),
    ) +
    "Nothing is granted or run until then."
  );
}
//@ chunk-fq0cr76a.js:814516-814675 esm-fingerprint
function windowsInstallCommandLines(flags) {
  return (
    `  npx sandbox-runtime windows-install${flags}
` +
    "  \u2014 or call installWindowsSandbox(), or run " +
    `\`srt-win.exe install${flags}\` directly.
`
  );
}
//@ chunk-fq0cr76a.js:814675-814935 esm-layout
function windowsInstallInstructions(install, force = false) {
  return (
    `Windows sandbox needs a one-time install (one UAC prompt):
` +
    windowsInstallCommandLines(
      windowsInstallFlags(
        (typeof install === "string"
          ? {
              sublayerGuid: install,
            }
          : install) ?? {},
        force,
      ),
    ) +
    "No logout is needed: the WFP filter keys on the dedicated `srt-sandbox` user's SID, so your network is unaffected."
  );
}
//@ chunk-fq0cr76a.js:814935-815036 esm-fingerprint
function settle(fn) {
  try {
    return {
      status: "fulfilled",
      value: fn(),
    };
  } catch (e) {
    return {
      status: "rejected",
      reason: e,
    };
  }
}
//@ chunk-fq0cr76a.js:815036-816931 esm-fingerprint
function interpretDependencyProbes(install, user, getWfp) {
  let { sublayerGuid, allowLoopback } = install;
  let errors = [];
  let warnings = [];
  let mode = (open) => (open ? "open" : "closed");
  let reinstallRequired;
  let loopbackMismatch;
  let result = () => ({
    errors,
    warnings,
    ...(reinstallRequired && {
      reinstallRequired,
    }),
    ...(loopbackMismatch && {
      loopbackMismatch,
    }),
  });
  if (user.status === "rejected") {
    errors.push(`srt-win user status failed: ${user.reason.message}`);
    return {
      errors,
      warnings,
    };
  }
  let us = user.value;
  if (!us.provisioned || !us.credPresent)
    errors.push(
      `Sandbox user is not provisioned (user=${us.provisioned}, cred=${us.credPresent}). ` +
        windowsInstallInstructions(install),
    );
  else {
    reinstallRequired = windowsSetupVersionMismatch(us, sublayerGuid);
    if (reinstallRequired) errors.push(reinstallRequired);
  }
  if (us.seclogon === "disabled" || us.seclogon === "missing")
    errors.push(seclogonDisabledMessage(us.seclogon));
  else if (us.seclogon === "cannot-read")
    logForDebugging_2(
      "[Sandbox Windows] Secondary Logon (seclogon) state cannot-read; a launch will show whether it is usable",
    );
  let wfp = getWfp();
  if (wfp.status === "rejected") {
    errors.push(`srt-win wfp status failed: ${wfp.reason.message}`);
    return result();
  }
  let ws = wfp.value;
  if (ws.state === "cannot-read")
    logForDebugging_2(`[Sandbox Windows] wfp status cannot-read (non-elevated): ${ws.hint}`);
  else if (ws.state === "loopback-mismatch")
    errors.push(
      `WFP filters under sublayer ${sublayerGuid ?? "(default)"} cannot be used: their loopback mode (${ws.allowLoopback ? "open" : "closed"}) is not the one the install recorded. Re-run the install for this configuration (one UAC prompt):
  ` + windowsInstallCommand(install, true),
    );
  else if (ws.state !== "installed") {
    if (us.provisioned && us.credPresent)
      errors.push(
        `WFP filters not installed under sublayer ${sublayerGuid ?? "(default)"}. ` +
          windowsInstallInstructions(install),
      );
  } else if (ws.portRange)
    logForDebugging_2(
      `[Sandbox Windows] WFP installed: ${ws.filters} filters, proxy port range ${ws.portRange[0]}-${ws.portRange[1]}, loopback ${mode(ws.allowLoopback)}`,
    );
  let fenced = us.provisioned && us.credPresent && (ws.state === "installed" || ws.state === "cannot-read");
  if (fenced && allowLoopback !== undefined && ws.allowLoopback !== allowLoopback) {
    loopbackMismatch =
      `WFP filters under sublayer ${sublayerGuid ?? "(default)"} do not match network.allowLocalBinding (installed: loopback ${mode(ws.allowLoopback)}; configured: ${mode(allowLoopback)}). Re-run the install for this configuration (one UAC prompt):
  ` + windowsInstallCommand(install, true);
    errors.push(loopbackMismatch);
  } else if (fenced && ws.allowLoopback) warnings.push(WINDOWS_ALLOW_LOOPBACK_EFFECT);
  return result();
}
//@ chunk-fq0cr76a.js:816931-817165 esm-fingerprint
function checkWindowsDependencies(opts = {}) {
  let srtWin;
  try {
    srtWin = opts.srtWin ?? resolveSrtWin();
  } catch (e) {
    return {
      errors: [e.message],
      warnings: [],
    };
  }
  logForDebugging_2(`[Sandbox Windows] using srt-win at ${srtWin.exe}`);
  return interpretDependencyProbes(
    opts,
    settle(() =>
      getWindowsSandboxUserStatus({
        srtWin,
      }),
    ),
    () =>
      settle(() =>
        getWindowsWfpStatus({
          sublayerGuid: opts.sublayerGuid,
          srtWin,
        }),
      ),
  );
}
//@ chunk-fq0cr76a.js:817165-817431 esm-fingerprint
async function checkWindowsDependenciesAsync(opts = {}) {
  let srtWin;
  try {
    srtWin = opts.srtWin ?? resolveSrtWin();
  } catch (e) {
    return {
      errors: [e.message],
      warnings: [],
    };
  }
  logForDebugging_2(`[Sandbox Windows] using srt-win at ${srtWin.exe}`);
  let [user, wfp] = await Promise.allSettled([
    getWindowsSandboxUserStatusAsync({
      srtWin,
    }),
    getWindowsWfpStatusAsync({
      sublayerGuid: opts.sublayerGuid,
      srtWin,
    }),
  ]);
  return interpretDependencyProbes(opts, user, () => wfp);
}
export {
  checkWindowsSandboxStatusAsync,
  windowsSetupVersionMismatch,
  WINDOWS_ALLOW_LOOPBACK_EFFECT,
  installWindowsSandboxAsync,
  WindowsSandboxError,
  ensurePersistentWindowsCa,
  windowsStateDir,
  parseWindowsSandboxError,
  getWindowsSandboxUserStatusAsync,
  expandWindowsFsPaths,
  WINDOWS_LOOPBACK_PROBE_PORT,
  getWindowsProfileReadStatusAsync,
  missingWindowsSrtWinCapability,
  getWindowsProfileReadStatus,
  windowsSrtWinOutdatedError,
  revokeWindowsAclChecked,
  restoreWindowsAcl,
  resolveSrtWin,
  windowsProfileExclusionConflicts,
  grantWindowsAclPersistent,
  verifyWindowsWfpEgress,
  DEFAULT_WINDOWS_PROXY_PORT_RANGE,
  checkWindowsDependencies,
  checkWindowsDependenciesAsync,
  rankWindowsFsAccess,
  wrapCommandWithSandboxWindows,
  windowsGrantsBeneathDenies,
  parseWindowsBinShell,
  SRT_WIN_DISPATCH_ARG1,
  forgetWindowsProfileReadAsync,
  uninstallWindowsSandbox,
};
