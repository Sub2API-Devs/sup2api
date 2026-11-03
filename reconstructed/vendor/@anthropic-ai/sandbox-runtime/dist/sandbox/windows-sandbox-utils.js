/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (106)
 * attribution: esm-fingerprint 90, esm-layout 16
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import * as pathModule_4 from "path";
import * as pathModule_5 from "path";
import {
  fileURLToPath,
  fileURLToPath as fileURLToPath_2,
  fileURLToPath as fileURLToPath_3,
  fileURLToPath as fileURLToPath_4,
} from "url";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import {
  spawnSync,
  spawnSync as spawnSync_2,
  spawnSync as spawnSync_3,
  spawn,
  spawn as spawn_2,
  spawn as spawn_3,
  spawn as spawn_4,
  spawn as spawn_5,
} from "child_process";
import * as netModule from "net";
import { once } from "events";
import * as osModule from "os";
import * as osModule_2 from "os";
import { At } from "../utils/debug.js";
import { Em, aE, Df } from "./mitm-ca.js";
import { Lqt, sS, Jxe, Hqt, usr, Mqt, oD, oS, Vot, QSe, ITt, U3r } from "./sandbox-utils.js";
import { nc } from "./path-entries.js";

//@ chunk-fq0cr76a.js:777773-777887 esm-fingerprint
class WindowsSandboxError extends Error {
  constructor(e, n, r) {
    super(n);
    ((this.name = "WindowsSandboxError"), (this.code = e), (this.subcommand = r));
  }
}
//@ chunk-fq0cr76a.js:777887-778382 esm-fingerprint
var qf = [60080, 60089],
  A3o = 1,
  z6r = `Loopback is open: sandboxed commands can connect to every TCP and UDP port on localhost (127.0.0.0/8 and ::1; port ${A3o} alone stays blocked, so the sandbox can check its own fence). Every service listening on localhost is reachable from them, and any local forwarder (a DNS stub, a SOCKS or HTTP proxy, a VPN or security agent, a tunnel) reachable there gives them a way off the machine that the network restrictions do not cover.`,
  I1 = ["-NoProfile", "-Command"];
//@ chunk-fq0cr76a.js:778382-779710 esm-fingerprint
function ex(e) {
  let n = process.env.SystemRoot ?? "C:\\Windows",
    r = { exe: pathModule_3.win32.join(n, "System32", "cmd.exe"), args: ["/d", "/s", "/c"] };
  if (e === void 0 || e === null) return r;
  if (typeof e === "object") {
    if (!pathModule_3.win32.isAbsolute(e.exe))
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `binShell.exe must be an absolute path (got ${JSON.stringify(e.exe)})`,
      );
    if (!Array.isArray(e.args))
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `binShell.args must be an array (got ${JSON.stringify(e.args)})`,
      );
    return e;
  }
  let base = pathModule_3.win32.basename(e),
    lower = base.toLowerCase(),
    isAbsolute = pathModule_3.win32.isAbsolute(e);
  if (!isAbsolute && e !== base)
    throw new WindowsSandboxError(
      "bin_shell_invalid",
      `binShell string must be a bare token or an absolute path (got ${JSON.stringify(e)})`,
    );
  switch (lower) {
    case "bash":
    case "bash.exe":
    case "sh":
    case "sh.exe":
      if (!isAbsolute)
        throw new WindowsSandboxError(
          "bin_shell_invalid",
          `binShell bash path must be absolute (got ${JSON.stringify(e)}); pass the resolved Git Bash install path`,
        );
      return { exe: e, args: ["-c"] };
    case "pwsh":
    case "pwsh.exe":
      return { exe: isAbsolute ? e : "pwsh.exe", args: I1 };
    case "powershell":
    case "powershell.exe":
      return {
        exe: isAbsolute
          ? e
          : pathModule_3.win32.join(n, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
        args: I1,
      };
    case "cmd":
    case "cmd.exe":
      return isAbsolute ? { exe: e, args: r.args } : r;
    default:
      throw new WindowsSandboxError(
        "bin_shell_invalid",
        `unrecognised binShell ${JSON.stringify(e)}: expected 'cmd' | 'powershell' | 'pwsh' or an absolute path to bash.exe/sh.exe/pwsh.exe/powershell.exe`,
      );
  }
}
//@ chunk-fq0cr76a.js:779710-779793 esm-fingerprint
function m9() {
  let dir = pathModule_3.dirname(fileURLToPath_3(import.meta.url));
  return pathModule_3.resolve(dir, "..", "..");
}
//@ chunk-fq0cr76a.js:779793-779891 esm-fingerprint
var g9 = { x64: "x64", arm64: "arm64" },
  joined = pathModule_3.join(m9(), "vendor", "srt-win", g9.x64 ?? "x64", "srt-win.exe");
//@ chunk-fq0cr76a.js:779891-779910 esm-fingerprint
var rg = "--srt-win";
//@ chunk-fq0cr76a.js:779910-780278 esm-fingerprint
function si(e) {
  if (e?.path === void 0)
    throw new WindowsSandboxError(
      "srt_win_not_found",
      "no srt-win path configured; set windows.srtWin.path (e.g. to the exported VENDORED_SRT_WIN_EXE constant for the packaged binary)",
    );
  if (!fsModule_6.existsSync(e.path))
    throw new WindowsSandboxError(
      "srt_win_not_found",
      `windows.srtWin.path is set to '${e.path}' but the file does not exist`,
    );
  return { exe: e.path, prependArgs: [rg] };
}
//@ chunk-fq0cr76a.js:780278-780855 esm-fingerprint
function tx(e, n = {}) {
  let { exe: exe, prependArgs: prependArgs } = n.srtWin ?? si(),
    h = spawnSync_3(exe, [...prependArgs, ...e], {
      encoding: "utf8",
      windowsHide: !0,
      timeout: n.timeoutMs ?? 15000,
      ...(n.stdin !== void 0 ? { input: n.stdin } : {}),
    });
  if (h.error) {
    if (h.error.code === "ETIMEDOUT")
      throw new WindowsSandboxError(
        "srt_win_timeout",
        `srt-win ${e.join(" ")} timed out after ${n.timeoutMs ?? 15000}ms` +
          (h.signal ? ` (killed by ${h.signal})` : ""),
        e[0],
      );
    throw new WindowsSandboxError("spawn_failed", `srt-win ${e[0]}: spawn failed: ${h.error.message}`, e[0]);
  }
  return (
    Yf(e, h.status, h.stdout ?? ""),
    { status: h.status, signal: h.signal, stdout: (h.stdout ?? "").trim(), stderr: (h.stderr ?? "").trim() }
  );
}
//@ chunk-fq0cr76a.js:780855-780865 esm-layout
var nx = 25;
//@ chunk-fq0cr76a.js:780865-780881 esm-layout
var y9 = 22,
  N1 = 24;
//@ chunk-fq0cr76a.js:780881-781302 esm-fingerprint
function b9(e) {
  let n = `process ${String(e.pid)}`,
    r = String(e.path);
  switch (e.kind) {
    case "profile":
      return `${n} is a sandbox session or command`;
    case "kept_root":
      return `${n} runs on the kept write grant on ${r}`;
    case "grant":
      return `${n} holds a session grant on ${r}`;
    case "deny":
    case "deny_fdc":
    case "deny_delete":
    case "deny_satisfied":
      return `${n} holds a session deny on ${r}`;
    default:
      return `${n} holds ${String(e.kind)} on ${r}`;
  }
}
//@ chunk-fq0cr76a.js:781302-781501 esm-fingerprint
function S9(e) {
  let n = [];
  try {
    let parsed = JSON.parse(e);
    if (Array.isArray(parsed.held_by)) n = parsed.held_by;
  } catch {}
  let mapped = n.slice(0, 8).map(b9);
  if (n.length > mapped.length) mapped.push(`${n.length - mapped.length} more`);
  return mapped.join("; ");
}
//@ chunk-fq0cr76a.js:781501-782365 esm-layout
function Yf(e, n, r) {
  if (n === nx)
    throw new WindowsSandboxError(
      "profile_operation_in_progress",
      "The read grant on your user profile is being written or removed right now (srt-win profile grant / profile forget). Nothing in the sandbox can start until that is done; try again when it has finished.",
      e[0],
    );
  if (n !== y9 && n !== N1) return;
  let s = S9(r),
    h = s ? ` (${s})` : "";
  if (n === N1)
    throw new WindowsSandboxError(
      "profile_grant_blocked_by_session",
      `The read grant on your user profile was not changed: sandbox sessions or commands are running${h}, and the grant is written only while none is, so that no session sees it change. What was granted before is as it was. End them and run it again.`,
      e[0],
    );
  throw new WindowsSandboxError(
    "kept_grants_in_use",
    `srt-win ${e.slice(0, 2).join(" ")} removed nothing: sandbox sessions or commands are running${h}, and what they run on is not taken from under them. End them and run it again.`,
    e[0],
  );
}
//@ chunk-fq0cr76a.js:782365-783090 esm-fingerprint
function Tu(e, n = {}) {
  let { exe: exe, prependArgs: prependArgs } = n.srtWin ?? si(),
    h = n.timeoutMs ?? 15000;
  return new Promise((y, b) => {
    let S = spawn_4(exe, [...prependArgs, ...e], { windowsHide: !0 }),
      w = !1,
      R =
        h > 0
          ? setTimeout(() => {
              ((w = !0), S.kill());
            }, h)
          : void 0,
      D = "",
      O = "";
    (S.stdout?.setEncoding("utf8").on("data", (L) => (D += L)),
      S.stderr?.setEncoding("utf8").on("data", (L) => (O += L)),
      S.stdin?.on("error", () => {}).end(n.stdin),
      S.once("error", (L) => {
        (clearTimeout(R),
          b(new WindowsSandboxError("spawn_failed", `srt-win ${e[0]}: spawn failed: ${L.message}`, e[0])));
      }),
      S.once("close", (L, V) => {
        if ((clearTimeout(R), w)) {
          b(
            new WindowsSandboxError(
              "srt_win_timeout",
              `srt-win ${e.join(" ")} timed out after ${h}ms` + (V ? ` (killed by ${V})` : ""),
              e[0],
            ),
          );
          return;
        }
        try {
          Yf(e, L, D);
        } catch (error) {
          b(error);
          return;
        }
        y({ status: L, signal: V, stdout: D.trim(), stderr: O.trim() });
      }));
  });
}
//@ chunk-fq0cr76a.js:783090-783399 esm-fingerprint
function rx(e, n) {
  if (n.status !== 0)
    throw new WindowsSandboxError(
      "srt_win_nonzero",
      `srt-win ${e.join(" ")} exited ${n.status}: ${n.stderr || n.stdout}`,
      e[0],
    );
  try {
    return JSON.parse(n.stdout);
  } catch (error) {
    throw new WindowsSandboxError(
      "srt_win_bad_json",
      `srt-win ${e.join(" ")}: unparseable JSON output ${JSON.stringify(n.stdout)}: ${error.message}`,
      e[0],
    );
  }
}
//@ chunk-fq0cr76a.js:783399-783437 esm-layout
function sx(e, n) {
  return rx(e, tx(e, n));
}
//@ chunk-fq0cr76a.js:783437-783487 esm-layout
async function sg(e, n) {
  return rx(e, await Tu(e, n));
}
//@ chunk-fq0cr76a.js:783487-783733 esm-fingerprint
function F1(e, n) {
  let r = tx(e, n),
    s;
  try {
    s = JSON.parse(r.stdout);
  } catch (error) {
    throw new WindowsSandboxError(
      "srt_win_bad_json",
      `srt-win ${e.join(" ")}: unparseable JSON output ${JSON.stringify(r.stdout)}: ${error.message}`,
      e[0],
    );
  }
  return { ok: r.status === 0, json: s, stderr: r.stderr };
}
//@ chunk-fq0cr76a.js:783733-783813 esm-fingerprint
function M1(e) {
  let n = ["wfp", "status"];
  if (e) n.push("--sublayer-guid", e);
  return n;
}
//@ chunk-fq0cr76a.js:783813-784007 esm-fingerprint
function ix(e) {
  return {
    state: e.state,
    filters: e.filters,
    ...(e.port_range && { portRange: e.port_range }),
    allowLoopback: e.allow_loopback === !0,
    ...(e.user_sid && { userSid: e.user_sid }),
    ...(e.hint && { hint: e.hint }),
  };
}
//@ chunk-fq0cr76a.js:784007-784214 esm-fingerprint
var E9 = {
  profileDenyExpansion: "profile-deny-expansion",
  keptGrantHolders: "kept-grant-holders",
  profileSessionGrantCheck: "profile-session-grant-check",
  readDenyExcept: "read-deny-except",
  execHolder: "exec-holder",
};
//@ chunk-fq0cr76a.js:784214-784280 esm-fingerprint
function ox(e) {
  return Object.values(E9).find((n) => !e.includes(n));
}
//@ chunk-fq0cr76a.js:784280-784357 esm-fingerprint
function $1(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : [];
}
//@ chunk-fq0cr76a.js:784357-784664 esm-layout
function ax(e, n) {
  return new WindowsSandboxError(
    "srt_win_outdated",
    `The srt-win in use is older than this library: it does not report the capability '${e}', which ${n}. Update srt-win (the one shipped with the program embedding this library, or the package's own) to a build that matches the library. Nothing was granted.`,
  );
}
//@ chunk-fq0cr76a.js:784664-784713 esm-fingerprint
var x9 = ["ok", "disabled", "missing", "cannot-read"];
//@ chunk-fq0cr76a.js:784713-785925 esm-fingerprint
function lx(e) {
  return {
    provisioned: e.user.exists,
    ...(e.user.sid && { sid: e.user.sid }),
    groupExists: e.user.group_exists,
    ...(e.user.group_sid && { groupSid: e.user.group_sid }),
    inBuiltinUsers: e.user.in_builtin_users,
    inSandboxGroup: e.user.in_sandbox_group,
    hiddenFromLogon: e.user.hidden_from_logon,
    credPresent: e.cred_present,
    ...(typeof e.marker_version === "number" && { markerVersion: e.marker_version }),
    ...(typeof e.setup_version === "number" && { setupVersion: e.setup_version }),
    realUserSid: e.real_user_sid,
    ...(e.ca_cert_thumb && { caCertThumb: e.ca_cert_thumb }),
    ...(e.ca_cert_pem && { caCertPem: e.ca_cert_pem }),
    ...(e.seclogon !== void 0 && x9.includes(e.seclogon) && { seclogon: e.seclogon }),
    ...(e.persistent_grants &&
      e.persistent_grants.state !== "none" && {
        persistentGrants: {
          state: e.persistent_grants.state === "present" ? "present" : "unknown",
          roots: e.persistent_grants.roots ?? [],
          ...(e.persistent_grants.reason && { reason: e.persistent_grants.reason }),
        },
      }),
    ...(typeof e.session_user_sid === "string" &&
      e.session_user_sid !== "" && { sessionUserSid: e.session_user_sid }),
    capabilities: $1(e.capabilities),
    ...(e.profile_grant &&
      e.profile_grant.state !== "none" && {
        profileGrant: {
          state: e.profile_grant.state === "present" ? "present" : "unknown",
          ...(e.profile_grant.reason && { reason: e.profile_grant.reason }),
        },
      }),
  };
}
//@ chunk-fq0cr76a.js:785925-786273 esm-layout
function V1(e) {
  return e === "missing"
    ? "The Windows Secondary Logon service (seclogon) is not present on this machine; the sandbox cannot start without it."
    : "The Windows Secondary Logon service (seclogon) is disabled; an administrator must set its startup type to Manual (`sc.exe config seclogon start= demand`). The sandbox cannot start without it.";
}
//@ chunk-fq0cr76a.js:786273-786283 esm-layout
var _9 = 18;
//@ chunk-fq0cr76a.js:786283-786391 esm-fingerprint
function W1(e, n) {
  if (e.status !== _9) return;
  let r = Q1(e.stderr, n);
  return r?.code === "seclogon_disabled" ? r : void 0;
}
//@ chunk-fq0cr76a.js:786391-786566 esm-fingerprint
async function checkWindowsSandboxStatusAsync(e = {}) {
  let n = ["status"];
  if (e.sublayerGuid) n.push("--sublayer-guid", e.sublayerGuid);
  let r = await sg(n, { srtWin: e.srtWin });
  return { user: lx(r.user), wfp: ix(r.wfp) };
}
//@ chunk-fq0cr76a.js:786566-786636 esm-fingerprint
function G1(e = {}) {
  return ix(sx(M1(e.sublayerGuid), { srtWin: e.srtWin }));
}
//@ chunk-fq0cr76a.js:786636-786718 esm-fingerprint
async function v9(e = {}) {
  return ix(await sg(M1(e.sublayerGuid), { srtWin: e.srtWin }));
}
//@ chunk-fq0cr76a.js:786718-787031 esm-fingerprint
function cx(e, n) {
  let [r, s] = e.proxyPortRange ?? qf,
    [h, y] = qf;
  return (
    (e.sublayerGuid ? ` --sublayer-guid ${e.sublayerGuid}` : "") +
    (r !== h || s !== y ? ` --proxy-port-range ${r}-${s}` : "") +
    (e.sandboxUser && e.sandboxUser !== "srt-sandbox" ? ` --sandbox-user ${e.sandboxUser}` : "") +
    (e.allowLoopback ? " --allow-loopback" : "") +
    (n ? " --force" : "")
  );
}
//@ chunk-fq0cr76a.js:787031-787100 esm-fingerprint
function ng(e, n) {
  return "npx sandbox-runtime windows-install" + cx(e, n);
}
//@ chunk-fq0cr76a.js:787100-787177 esm-fingerprint
function H1(e) {
  return /unexpected argument '--allow-loopback'/.test(e.stderr);
}
//@ chunk-fq0cr76a.js:787177-787415 esm-layout
function K1(e) {
  return new WindowsSandboxError(
    "srt_win_too_old",
    `srt-win is too old for network.allowLocalBinding: it does not know \`--allow-loopback\`. Update srt-win (and re-run the install with it), or unset network.allowLocalBinding. (${e.trim()})`,
  );
}
//@ chunk-fq0cr76a.js:787415-788158 esm-layout
var q1 = {
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
function w9(e) {
  return Object.prototype.hasOwnProperty.call(q1, e);
}
//@ chunk-fq0cr76a.js:788223-791487 esm-fingerprint
function T9(e, n = {}) {
  let r;
  try {
    r = JSON.parse(e.stdout);
  } catch {
    if (H1(e)) throw K1(e.stderr);
    throw new WindowsSandboxError(
      "wfp_verify_unparseable",
      "WFP egress fence could not be verified \u2014 `srt-win wfp " +
        `verify\` exited ${e.status}` +
        (e.signal ? ` (signal ${e.signal})` : "") +
        ` with unparseable output ${JSON.stringify(e.stdout)} (stderr: ${JSON.stringify(e.stderr)})`,
    );
  }
  let s = (K) => K ?? "skipped",
    h = {
      plain: s(r.egress_probe),
      anonymous: s(r.anonymous_probe),
      anonymousLoopback: s(r.anonymous_loopback_probe),
      denyOnly: s(r.deny_only_probe),
      lowIntegrity: s(r.low_integrity_probe),
      lowIntegrityLoopback: s(r.low_integrity_loopback_probe),
      untrustedIntegrity: s(r.untrusted_integrity_probe),
      untrustedIntegrityLoopback: s(r.untrusted_integrity_loopback_probe),
      ...(r.allow_loopback && { openLoopback: s(r.open_loopback_probe) }),
    },
    y = r.anonymous_target ?? "no target",
    b = r.egress_target ?? r.target,
    S =
      `plain=${h.plain} (${b}), anonymous=${h.anonymous} (${y}), anonymous-loopback=${h.anonymousLoopback}, deny-only=${h.denyOnly}, low-integrity=${h.lowIntegrity} (${y}), low-integrity-loopback=${h.lowIntegrityLoopback}, untrusted-integrity=${h.untrustedIntegrity} (${y}), untrusted-integrity-loopback=${h.untrustedIntegrityLoopback}` +
      (r.allow_loopback ? `, open-loopback=${h.openLoopback} (${r.target})` : ""),
    w = { ...n, allowLoopback: r.allow_loopback ?? n.allowLoopback };
  if (e.status === 19 || r.allow_loopback_mismatch)
    throw new WindowsSandboxError(
      "wfp_loopback_mismatch",
      "WFP egress fence does not match network.allowLocalBinding \u2014 " +
        (r.hint ?? "the installed filter set has a different loopback mode") +
        ". Through this package: `" +
        ng(w, !0) +
        "`.",
    );
  let R = "the sandbox user under a low-integrity copy of its token",
    D = "the sandbox user under an untrusted-integrity copy of its token",
    mapped = [
      [h.plain, "the sandbox user", b],
      [h.lowIntegrity, R, r.anonymous_target],
      [h.lowIntegrityLoopback, R, b],
      [h.untrustedIntegrity, D, r.anonymous_target],
      [h.untrustedIntegrityLoopback, D, b],
    ]
      .filter(([K]) => K === "connected" || K === "refused")
      .map(([, K, q]) => `direct outbound from ${K} to ${q}`);
  if (r.allow_loopback && h.plain === "unreachable")
    mapped.push(
      `direct outbound from the sandbox user to ${b} (no answer where the filter must refuse at once)`,
    );
  if (e.status === 3 || mapped.length > 0)
    throw new WindowsSandboxError(
      "wfp_fence_inactive",
      "WFP egress fence is not active \u2014 " +
        `${mapped.join(" and ") || "a direct outbound connect"} was not blocked [${S}]. Re-run \`` +
        ng(w, !1) +
        `\` (one UAC prompt). (${e.stderr})`,
    );
  if (e.status !== 0)
    throw new WindowsSandboxError(
      "wfp_verify_inconclusive",
      "WFP egress fence could not be verified \u2014 probe to " +
        `${b} was '${r.egress_probe}' (exit ${e.status}) [${S}]. The fence may be absent. Re-run \`srt-win install\`. (${e.stderr})`,
    );
  if (r.egress_probe !== "blocked")
    throw new WindowsSandboxError(
      "wfp_verify_inconclusive",
      "WFP egress fence could not be verified \u2014 `srt-win wfp verify` " +
        `exited 0 but reported the plain attempt as '${r.egress_probe ?? "missing"}' [${S}]. (${e.stderr})`,
    );
  let filtered = (r.residuals ?? []).filter(w9),
    mapped_2 = filtered.map((K) => `WFP egress fence residual '${K}': ${q1[K]}`);
  if (h.lowIntegrity === "skipped" || h.untrustedIntegrity === "skipped")
    mapped_2.push(
      "WFP egress fence: the off-loopback lowered-integrity attempts were skipped (no off-loopback address on this machine, or an srt-win that does not make them)",
    );
  if (r.allow_loopback) mapped_2.push(z6r);
  return { target: r.target, stderr: e.stderr, probes: h, residuals: filtered, warnings: mapped_2 };
}
//@ chunk-fq0cr76a.js:791487-792540 esm-fingerprint
async function j1(e = {}) {
  let target = e.target,
    r;
  if (!target) {
    let [h, y] = e.proxyPortRange ?? qf;
    for (let b = 0; b < 5; b++) {
      let server = netModule.createServer((R) => R.on("error", () => {}).destroy());
      (server.listen(0, "127.0.0.1"), await once(server, "listening"));
      let port = server.address().port;
      if (port < h || port > y) {
        ((r = server), (target = `127.0.0.1:${port}`));
        break;
      }
      server.close();
    }
    if (!target)
      throw new WindowsSandboxError(
        "wfp_verify_bind_failed",
        `verifyWindowsWfpEgress: could not bind a loopback listener outside the WFP permit range [${h},${y}] in 5 attempts`,
      );
  }
  let s = ["wfp", "verify", "--target", target];
  if (e.anonymousEgress) s.push("--anonymous-egress");
  if (e.allowLoopback) s.push("--allow-loopback");
  s.push("--write-restricted-token");
  for (let h of e.writeRoots ?? []) s.push("--write-root", h);
  try {
    let h = await Tu(s, { timeoutMs: 30000, srtWin: e.srtWin });
    At(`[Sandbox Windows] wfp verify exit=${h.status}: ${h.stderr || h.stdout}`);
    let y = W1(h, "wfp");
    if (y) throw y;
    let b = T9(h, {
      sublayerGuid: e.sublayerGuid,
      proxyPortRange: e.proxyPortRange,
      sandboxUser: e.sandboxUser,
      allowLoopback: e.allowLoopback,
    });
    for (let warning of b.warnings) At(`[Sandbox Windows] ${warning}`, { level: "warn" });
    return b;
  } finally {
    r?.close();
  }
}
//@ chunk-fq0cr76a.js:792540-792609 esm-fingerprint
function Y1(e = {}) {
  return lx(sx(["user", "status"], { srtWin: e.srtWin }));
}
//@ chunk-fq0cr76a.js:792609-792691 esm-fingerprint
async function Pot(e = {}) {
  return lx(await sg(["user", "status"], { srtWin: e.srtWin }));
}
//@ chunk-fq0cr76a.js:792691-792797 esm-fingerprint
async function A9(e, n = {}) {
  let r = await Tu(["user", "trust-ca", e], { timeoutMs: 60000, srtWin: n.srtWin });
  C9(e, r);
}
//@ chunk-fq0cr76a.js:792797-793052 esm-fingerprint
function C9(e, n) {
  At(`[Sandbox Windows] user trust-ca exit=${n.status}: ${n.stderr || n.stdout}`);
  let r = W1(n, "user");
  if (r) throw r;
  if (n.status !== 0)
    throw new WindowsSandboxError(
      "trust_ca_failed",
      `srt-win user trust-ca '${e}' failed (exit ${n.status}): ${n.stderr || n.stdout}`,
    );
}
//@ chunk-fq0cr76a.js:793052-793182 esm-fingerprint
function dx() {
  let envProgramdata = process.env.ProgramData;
  if (!envProgramdata) throw Error("ProgramData is not set");
  return pathModule_3.win32.join(envProgramdata, "sandbox-runtime");
}
//@ chunk-fq0cr76a.js:793182-795427 esm-fingerprint
async function ensurePersistentWindowsCa(e = {}) {
  let n = e.status ?? (await Pot({ srtWin: e.srtWin }));
  if (!n.provisioned || !n.credPresent)
    throw Error(
      `ensurePersistentWindowsCa: sandbox user is not provisioned (user=${n.provisioned}, cred=${n.credPresent}). Run \`npx sandbox-runtime windows-install\` first.`,
    );
  let r = e.dir ? void 0 : dx();
  if (r && !fsModule_6.existsSync(r))
    throw Error(
      `ensurePersistentWindowsCa: state directory ${r} does not exist. Run \`npx sandbox-runtime windows-install\` first.`,
    );
  let s = e.dir ?? pathModule_3.win32.join(r, "ca"),
    joined = pathModule_3.join(s, "ca.json"),
    joined_2 = pathModule_3.join(s, "cert.pem"),
    joined_3 = pathModule_3.join(s, "key.pem"),
    S = (e.regenerateWithinDays ?? 30) * 24 * 60 * 60 * 1000,
    w = (Z, J) => {
      let ie = `${Z}.tmp.${process.pid}`;
      (fsModule_6.writeFileSync(ie, J), fsModule_6.renameSync(ie, Z));
    },
    R = async (Z, J, ie, ae) => {
      (w(joined_2, Z), w(joined_3, J));
      let Se = ae || n.caCertThumb !== ie;
      if (Se) {
        let joined = pathModule_3.join(s, `.trust.${process.pid}.${Date.now()}.pem`);
        fsModule_6.writeFileSync(joined, Z);
        try {
          await A9(joined, { srtWin: e.srtWin });
        } finally {
          fsModule_6.rmSync(joined, { force: !0 });
        }
      }
      return (
        At(
          `[Sandbox Windows] persistent CA ${ae ? "generated" : "reused"} (thumb=${ie}${Se && !ae ? ", trust reconciled" : ""})`,
        ),
        {
          certPem: Z,
          keyPem: J,
          certPath: joined_2,
          keyPath: joined_3,
          thumbprint: ie,
          generated: ae,
          trusted: Se,
        }
      );
    },
    D = () => {
      let Z;
      try {
        Z = JSON.parse(fsModule_6.readFileSync(joined, "utf8"));
      } catch (error) {
        At(`[Sandbox Windows] persistent CA ca.json unreadable (${error.message})`, { level: "warn" });
        return;
      }
      if (typeof Z.certPem !== "string" || typeof Z.keyPem !== "string") return;
      let J = Em(Z.certPem, Z.keyPem);
      if (!J.ok) {
        At(`[Sandbox Windows] persistent CA invalid (${J.reason})`, { level: "warn" });
        return;
      }
      return { certPem: Z.certPem, keyPem: Z.keyPem, thumbprint: J.thumbprint, notAfter: J.notAfter };
    };
  if (!e.force) {
    let Z = D();
    if (Z && Z.notAfter.getTime() - Date.now() > S) return await R(Z.certPem, Z.keyPem, Z.thumbprint, !1);
    if (Z)
      At(`[Sandbox Windows] persistent CA expiring ${Z.notAfter.toISOString()}; regenerating`, {
        level: "warn",
      });
  }
  fsModule_6.mkdirSync(s, { recursive: !0 });
  try {
    let Z = Date.now() - 300000;
    for (let J of fsModule_6.readdirSync(s)) {
      if (!J.includes(".tmp.") && !J.startsWith(".trust.")) continue;
      let joined = pathModule_3.join(s, J);
      if (fsModule_6.statSync(joined).mtimeMs < Z) fsModule_6.rmSync(joined, { force: !0 });
    }
  } catch {}
  let O = aE({ cn: "sandbox-runtime persistent CA" });
  w(joined, JSON.stringify({ certPem: O.certPem, keyPem: O.keyPem }));
  let L = D(),
    {
      certPem: certPem,
      keyPem: keyPem,
      thumbprint: thumbprint,
    } = L ?? { certPem: O.certPem, keyPem: O.keyPem, thumbprint: Df(O.certPem) };
  return await R(certPem, keyPem, thumbprint, !0);
}
//@ chunk-fq0cr76a.js:795427-795441 esm-fingerprint
var QE = 120000;
//@ chunk-fq0cr76a.js:795441-795479 esm-fingerprint
function R9(e) {
  return e.timeoutMs ?? QE;
}
//@ chunk-fq0cr76a.js:795479-795808 esm-fingerprint
function I9(e) {
  let n = ["install"];
  if (e.sublayerGuid) n.push("--sublayer-guid", e.sublayerGuid);
  if (e.proxyPortRange) n.push("--proxy-port-range", `${e.proxyPortRange[0]}-${e.proxyPortRange[1]}`);
  if (e.allowLoopback) n.push("--allow-loopback");
  if (e.sandboxUser) n.push("--sandbox-user", e.sandboxUser);
  if (e.force) n.push("--force");
  return n;
}
//@ chunk-fq0cr76a.js:795808-796035 esm-fingerprint
function N9(e) {
  if (e instanceof WindowsSandboxError && e.code === "srt_win_timeout")
    throw new WindowsSandboxError(
      "install_timeout",
      "srt-win install timed out \u2014 the UAC prompt may still be open. " +
        `Re-run when ready to grant elevation. (${e.message})`,
    );
  throw e;
}
//@ chunk-fq0cr76a.js:796035-796957 esm-fingerprint
function k9(e) {
  if (
    (At(`[Sandbox Windows] install exit=${e.status}: ${e.stderr || e.stdout}`),
    e.status === 0 || e.status === 10)
  )
    return;
  if (H1(e)) throw K1(e.stderr);
  let n = e.stderr || e.stdout;
  switch (e.status) {
    case 12:
      throw new WindowsSandboxError("install_wfp_failed", `srt-win install: WFP filter install failed: ${n}`);
    case 14:
      throw new WindowsSandboxError(
        "install_user_failed",
        `srt-win install: sandbox user provisioning failed: ${n}`,
      );
    case 13:
      throw new WindowsSandboxError(
        "install_config_conflict",
        `srt-win install: filters already exist under this sublayer with a different port range, loopback mode or sandbox-user name. Pass {force: true} to replace, or pick a different sublayerGuid. Output: ${n}`,
      );
    case 17:
      throw new WindowsSandboxError(
        "install_ambient_failed",
        `srt-win install: ambient write-deny stamping failed (stock world-writable system dirs could not be deny-stamped for the sandbox user): ${n}`,
      );
    default:
      throw new WindowsSandboxError("install_failed", `srt-win install failed (exit ${e.status}): ${n}`);
  }
}
//@ chunk-fq0cr76a.js:796957-797387 esm-fingerprint
async function installWindowsSandboxAsync(e = {}) {
  let n = e.srtWin ?? si(),
    r;
  try {
    r = await Tu(I9(e), { timeoutMs: R9(e), srtWin: n });
  } catch (error) {
    N9(error);
  }
  k9(r);
  let s = await checkWindowsSandboxStatusAsync({ sublayerGuid: e.sublayerGuid, srtWin: n });
  if (r.status === 10) return { ...s, cancelled: !0 };
  let h = P9(e, s.user);
  if (h) return { ...s, profileGrant: h };
  e.onProfileGrantStart?.(L9(osModule.homedir()));
  try {
    let y = await j9(B9(e, n));
    return { ...s, profileGrant: { applied: !0, userSid: s.user.realUserSid, result: y } };
  } catch (error) {
    U9(error);
  }
}
//@ chunk-fq0cr76a.js:797387-797438 esm-fingerprint
var D9 = new Set(["S-1-5-18", "S-1-5-19", "S-1-5-20"]);
//@ chunk-fq0cr76a.js:797438-798181 esm-layout
function O9(e, n = {}) {
  if (n.skipProfileGrant) return "skipProfileGrant was set";
  let r =
    "run the install, or grantWindowsProfileRead() (`srt-win profile grant`), as the user whose sessions are to read their profile";
  if (D9.has(e.realUserSid))
    return `the install ran as the service account ${e.realUserSid}, which runs no sessions; ${r}`;
  if (e.sessionUserSid === void 0)
    return `the owner of the session this install ran in could not be determined, so it is not known whose profile ${e.realUserSid} is; ${r}`;
  if (e.sessionUserSid.toUpperCase() !== e.realUserSid.toUpperCase())
    return `the install ran as ${e.realUserSid} in a session that belongs to ${e.sessionUserSid}; granting would open the installing account's profile, not the session owner's; ${r}`;
  return;
}
//@ chunk-fq0cr76a.js:798181-798259 esm-fingerprint
function P9(e, n) {
  let r = O9(n, e);
  return r === void 0 ? void 0 : { applied: !1, reason: r };
}
//@ chunk-fq0cr76a.js:798259-798743 esm-layout
function L9(e) {
  return `Making ${e} readable to sandboxed commands on this machine, except the excluded credential stores (SSH and GPG keys, cloud and browser sign-ins, password managers, registry hives). Readable files include package-manager configuration that can hold feed tokens: .npmrc, pip.ini, NuGet.Config, Maven settings.xml, gradle.properties, .gitconfig. Skip with --skip-profile-grant (skipProfileGrant); undo with \`srt-win profile forget\` (forgetWindowsProfileRead()).`;
}
//@ chunk-fq0cr76a.js:798743-798872 esm-fingerprint
function B9(e, n) {
  return {
    exclude: e.profileExclude,
    timeoutMs: e.profileGrantTimeoutMs,
    onProgress: e.onProfileGrantProgress,
    srtWin: n,
  };
}
//@ chunk-fq0cr76a.js:798872-799483 esm-fingerprint
function U9(e) {
  let n = e;
  if (
    n instanceof WindowsSandboxError &&
    (n.code === "profile_grant_blocked_by_session" || n.code === "profile_operation_in_progress")
  )
    throw new WindowsSandboxError(n.code, `The Windows sandbox is installed. ${n.message}`, "profile");
  let r = n instanceof WindowsSandboxError && n.code === "srt_win_timeout";
  throw new WindowsSandboxError(
    "profile_grant_failed",
    `The Windows sandbox is installed, but the read grant on your user profile ${r ? "did not finish in time" : "could not be applied"}: ${n.message}
No session starts until it is complete. Run the install again, or grantWindowsProfileRead(), to finish it; forgetWindowsProfileRead() removes what was written.`,
    "profile",
  );
}
//@ chunk-fq0cr76a.js:799483-799931 esm-fingerprint
function uninstallWindowsSandbox(e = {}) {
  let n = ["uninstall"];
  if (e.sublayerGuid) n.push("--sublayer-guid", e.sublayerGuid);
  if (e.keepUser) n.push("--keep-user");
  let r = tx(n, { timeoutMs: e.timeoutMs ?? (e.keepUser ? QE : QE + hx), srtWin: e.srtWin });
  if ((At(`[Sandbox Windows] uninstall exit=${r.status}: ${r.stderr || r.stdout}`), r.status === 10))
    return { cancelled: !0 };
  if (r.status !== 0)
    throw new WindowsSandboxError(
      "uninstall_failed",
      `srt-win uninstall failed (exit ${r.status}): ${r.stderr || r.stdout}`,
    );
  return {};
}
//@ chunk-fq0cr76a.js:799931-800550 esm-fingerprint
function Au(e, n) {
  let r = new Set();
  for (let s of e) {
    let h = typeof s !== "string",
      y = h ? Lqt(s) : s,
      b = sS(y, h ? { literal: !0 } : void 0);
    if (h && Jxe(b)) {
      At(`[Sandbox Windows] Skipping a literal path that no file can have: ${b}`, { level: "warn" });
      continue;
    }
    let S = !h && Jxe(b);
    if (Hqt(b) && !S) {
      r.add(b);
      continue;
    }
    let w = S
      ? [
          ...usr(b, { caseInsensitive: !0 }),
          ...nc(y, n?.mode === "deny" ? "deny" : "allow", { isPattern: Jxe }).flatMap((R) =>
            R.glob ? usr(R.path, { caseInsensitive: !0, anchor: R.anchor }) : [],
          ),
        ]
      : [b];
    for (let R of w) {
      if (!fsModule_6.statSync(R, { throwIfNoEntry: !1 })) {
        if (n?.mode === "deny" && !S) r.add(/[\\/]$/.test(y) && !/[\\/]$/.test(R) ? R + "\\" : R);
        continue;
      }
      r.add(R);
    }
  }
  return [...r];
}
//@ chunk-fq0cr76a.js:800550-800620 esm-fingerprint
function F9(e) {
  return Hqt(e) || /^[\\/]{2}[?.][\\/](?![a-z]:)/i.test(e);
}
//@ chunk-fq0cr76a.js:800620-800684 esm-fingerprint
function isNotFoundErrorCode(e) {
  let n = e?.code;
  return n === "ENOENT" || n === "ENOTDIR";
}
//@ chunk-fq0cr76a.js:800684-800873 esm-fingerprint
function z1(e) {
  if (F9(e)) return { state: "unprobed" };
  try {
    return { state: "resolved", path: fsModule_6.realpathSync.native(e) };
  } catch (error) {
    return isNotFoundErrorCode(error)
      ? { state: "absent" }
      : { state: "error", code: error?.code ?? "unknown" };
  }
}
//@ chunk-fq0cr76a.js:800873-800907 esm-layout
function jf(e) {
  return X1(e, z1(e));
}
//@ chunk-fq0cr76a.js:800907-801028 esm-fingerprint
function X1(e, n) {
  return Mqt(
    pathModule_3.win32
      .normalize(oD(n.state === "resolved" ? n.path : e))
      .replace(/\\/g, "/")
      .replace(/\/+$/, ""),
  );
}
//@ chunk-fq0cr76a.js:801028-801158 esm-fingerprint
function k1(e) {
  let mapped = e.map(jf);
  return (r) => {
    if (mapped.length === 0) return;
    let s = jf(r),
      index = mapped.findIndex((y) => oS(s, y));
    return index < 0 ? void 0 : e[index];
  };
}
//@ chunk-fq0cr76a.js:801158-801455 esm-fingerprint
function J1(e, n) {
  if (e.length === 0 || n.length === 0) return [];
  let mapped = n.map(jf),
    mapped_2 = e.map((y) => ({ path: y, key: jf(y) })),
    h = new Map();
  for (let y of mapped) {
    let filtered = mapped_2.filter((S) => S.key !== y && oS(S.key, y));
    for (let S of filtered)
      if (!filtered.some((R) => R.key !== S.key && oS(S.key, R.key)) && !h.has(S.key)) h.set(S.key, S.path);
  }
  return [...h.values()];
}
//@ chunk-fq0cr76a.js:801455-802192 esm-fingerprint
function fx(e) {
  let n = k1(e.credentialDeny),
    r = k1(e.denyWrite),
    s = new Set(),
    h = new Set(),
    y = (w, R) => {
      let D = n(R),
        O = w === "allowWrite" ? r(R) : void 0;
      if (D === void 0 && O === void 0) {
        (w === "allowRead" ? s : h).add(R);
        return;
      }
      if (D === void 0) s.add(R);
      At(
        `[Sandbox Windows] ${w} ${R} is at or beneath ` +
          (D !== void 0
            ? `the credential file entry ${D}: not granted`
            : `denyWrite ${O}: granted read only`),
        { level: "warn" },
      );
    };
  for (let w of e.allowRead) y("allowRead", w);
  for (let w of e.allowWrite) y("allowWrite", w);
  let b = e.held?.grantRead ?? [],
    S = e.held?.grantWrite ?? [];
  return {
    grantRead: [...s],
    grantWrite: [...h],
    denyRead: [
      ...new Set([...e.denyRead, ...e.credentialDeny, ...[...b, ...S].filter((w) => n(w) !== void 0)]),
    ],
    denyWrite: [...new Set([...e.denyWrite, ...S.filter((w) => r(w) !== void 0)])],
  };
}
//@ chunk-fq0cr76a.js:802192-802227 esm-fingerprint
function px(e) {
  return Q1(e, "exec");
}
//@ chunk-fq0cr76a.js:802227-803141 esm-fingerprint
function Q1(e, n) {
  for (let r of e.split(/\r?\n/)) {
    let trimmed = r.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes('"code"')) continue;
    try {
      let parsed = JSON.parse(trimmed);
      if (parsed.code === "profile_operation_in_progress")
        return new WindowsSandboxError(
          "profile_operation_in_progress",
          parsed.message ?? "a profile grant or forget is in progress",
          "exec",
        );
      if (parsed.code === "session_ended")
        return new WindowsSandboxError(
          "session_ended",
          parsed.message ?? "the session that started this command ended; the command was terminated",
          "exec",
        );
      if (parsed.code === "mapped_drive_cwd")
        return Object.assign(
          new WindowsSandboxError(
            "mapped_drive_cwd",
            parsed.message ?? "mapped/network-drive working directory",
            n,
          ),
          { drive: parsed.drive },
        );
      if (parsed.code === "wfp_loopback_mismatch")
        return new WindowsSandboxError(
          "wfp_loopback_mismatch",
          parsed.message ?? "the installed loopback mode is not this session's",
          "exec",
        );
      if (parsed.code === "seclogon_disabled") {
        let y = parsed.state === "missing" ? "missing" : "disabled";
        return Object.assign(new WindowsSandboxError("seclogon_disabled", parsed.message ?? V1(y), n), {
          state: y,
        });
      }
    } catch {}
  }
  return;
}
//@ chunk-fq0cr76a.js:803141-803231 esm-fingerprint
var M9 = new Set(["revoked", "stillHeld", "downgraded", "relocated", "noRow", "gone", "missing"]);
//@ chunk-fq0cr76a.js:803231-803478 esm-fingerprint
function $9(e) {
  if (typeof e !== "object" || e === null) return !1;
  let { path: path, status: status } = e;
  if (typeof path !== "string" || typeof status !== "string") return !1;
  if (!M9.has(status)) return !1;
  if (status !== "missing") return !0;
  try {
    return (fsModule_6.lstatSync(path), !1);
  } catch (error) {
    return error.code === "ENOENT";
  }
}
//@ chunk-fq0cr76a.js:803478-803943 esm-fingerprint
function eI(e) {
  let n = e.holderPid ?? process.pid;
  try {
    let r = F1(["acl", "restore", "--holder-pid", `${n}`, "--sandbox-user-sid", e.sandboxUserSid, "--json"], {
      timeoutMs: 300000,
      srtWin: e.srtWin,
    });
    if (!r.ok)
      At(`[Sandbox Windows] acl restore exited non-zero (per-path outcomes preserved): ${r.stderr}`, {
        level: "error",
      });
    return Array.isArray(r.json) ? r.json : [...(r.json.paths ?? []), ...(r.json.parents ?? [])];
  } catch (error) {
    At(`[Sandbox Windows] acl restore: ${error.message}`, { level: "error" });
    return;
  }
}
//@ chunk-fq0cr76a.js:803943-804041 esm-fingerprint
function V9(e) {
  return (e.allowProfileExclusions ?? []).flatMap((n) => ["--allow-profile-exclusion", n]);
}
//@ chunk-fq0cr76a.js:804041-804616 esm-fingerprint
async function tI(e) {
  let n = e.holderPid ?? process.pid,
    json = JSON.stringify({ read: e.read, write: e.write, denyRead: e.denyRead, denyWrite: e.denyWrite }),
    s = await Tu(
      [
        "acl",
        "grant",
        "--holder-pid",
        `${n}`,
        "--sandbox-user-sid",
        e.sandboxUserSid,
        "--persistent",
        ...V9(e),
      ],
      { timeoutMs: 600000, stdin: json, srtWin: e.srtWin },
    );
  if (
    (At(`[Sandbox Windows] acl grant --persistent exit=${s.status}: ${s.stderr || s.stdout}`), s.status !== 0)
  )
    throw new WindowsSandboxError(
      "acl_grant_failed",
      `srt-win acl grant --persistent exited ${s.status} ` +
        (s.status === 2 ? "(partial \u2014 some inputs skipped)" : "(failed)") +
        `: ${s.stderr || s.stdout}`,
    );
}
//@ chunk-fq0cr76a.js:804616-805058 esm-fingerprint
function nI(e) {
  let n = e.holderPid ?? process.pid,
    r;
  try {
    let s = F1(["acl", "revoke", "--holder-pid", `${n}`, "--sandbox-user-sid", e.sandboxUserSid, "--json"], {
      timeoutMs: 300000,
      srtWin: e.srtWin,
    });
    if (!s.ok) At(`[Sandbox Windows] acl revoke exited non-zero: ${s.stderr}`, { level: "error" });
    r = W9(s.ok, s.json, s.stderr);
  } catch (error) {
    let message = error.message;
    (At(`[Sandbox Windows] acl revoke: ${message}`, { level: "error" }),
      (r = { complete: !1, outcomes: void 0, pending: [], detail: message }));
  }
  return r;
}
//@ chunk-fq0cr76a.js:805058-805255 esm-fingerprint
function W9(e, n, r) {
  let s = Array.isArray(n) ? n : void 0,
    filtered = (s ?? []).filter((y) => !$9(y));
  return {
    complete: e && s !== void 0 && filtered.length === 0,
    outcomes: s,
    pending: filtered.map((y) => String(y?.path)),
    detail: r.trim() || void 0,
  };
}
//@ chunk-fq0cr76a.js:805255-805488 esm-fingerprint
var G9 = new Set(["none", "current", "outdated", "incomplete", "unknown"]),
  H9 = new Set(["container", "granted", "file", "denied"]),
  K9 = [
    "NPM_CONFIG_USERCONFIG",
    "GIT_CONFIG_GLOBAL",
    "PIP_CONFIG_FILE",
    "MAVEN_ARGS",
    "RUSTUP_HOME",
    "CARGO_HOME",
  ],
  D1 = 1;
//@ chunk-fq0cr76a.js:805488-805579 esm-fingerprint
function Kf(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string" && n !== "") ? e : void 0;
}
//@ chunk-fq0cr76a.js:805579-805930 esm-fingerprint
function q9(e) {
  if (e.record_version !== D1)
    return `srt-win reports record format ${JSON.stringify(e.record_version)}; this library reads format ${D1}`;
  let n = Kf(e.exclusions);
  if (!n || n.length === 0) return "the recorded grant carries no list of excluded paths";
  if (!Kf(e.ungranted_only)) return "the recorded grant carries no list of ungranted directories";
  return;
}
//@ chunk-fq0cr76a.js:805930-806753 esm-fingerprint
function rI(e) {
  let n = G9.has(e.state ?? "") ? e.state : "unknown",
    reason = e.reason,
    s = n === "current" ? q9(e) : void 0;
  if (s) ((n = "outdated"), (reason = s));
  let h = {};
  if (n === "current")
    for (let y of K9) {
      let b = e.env?.[y];
      if (typeof b === "string" && b !== "") h[y] = b;
    }
  return {
    state: n,
    ...(reason && { reason: reason }),
    ...(e.profile && { profile: e.profile }),
    capabilities: $1(e.capabilities),
    notGranted: no(e.not_granted),
    selfClosed: no(e.self_closed),
    unverifiable: no(e.unverifiable),
    unprotected: no(e.unprotected),
    staleAllow: no(e.stale_allow),
    replacedFiles: Kf(e.replaced_files) ?? [],
    extraExclusions: e.extra_exclusions ?? [],
    exclusions: Kf(e.exclusions) ?? [],
    ungrantedOnly: Kf(e.ungranted_only) ?? [],
    counts: {
      containers: e.containers ?? 0,
      granted: e.granted ?? 0,
      files: e.files ?? 0,
      denied: e.denied ?? 0,
    },
    env: h,
    ...(e.paths && {
      paths: e.paths.filter(
        (path) => typeof path.path === "string" && typeof path.kind === "string" && H9.has(path.kind),
      ),
    }),
  };
}
//@ chunk-fq0cr76a.js:806753-806925 esm-fingerprint
function sI(e = {}) {
  let n = ["profile", "status"];
  if (e.paths) n.push("--paths");
  let r = sx(n, { timeoutMs: 30000, srtWin: e.srtWin });
  if (r.state === "in_progress") Yf(n, nx, "");
  return rI(r);
}
//@ chunk-fq0cr76a.js:806925-807110 esm-fingerprint
async function q6r(e = {}) {
  let n = ["profile", "status"];
  if (e.paths) n.push("--paths");
  let r = await sg(n, { timeoutMs: 30000, srtWin: e.srtWin });
  if (r.state === "in_progress") Yf(n, nx, "");
  return rI(r);
}
//@ chunk-fq0cr76a.js:807110-807125 esm-layout
var hx = 1800000;
//@ chunk-fq0cr76a.js:807125-807541 esm-fingerprint
function no(e) {
  return Array.isArray(e)
    ? e.flatMap((n) => {
        let { path: path, reason: reason } = n ?? {};
        if (typeof path !== "string") return [];
        let {
          caller_reads: caller_reads,
          cause: cause,
          protected_exclusion: protected_exclusion,
          entry: entry,
        } = n;
        return [
          {
            path: path,
            reason: typeof reason === "string" ? reason : "",
            ...((typeof caller_reads === "boolean" || caller_reads === "unknown") && {
              callerReads: caller_reads,
            }),
            ...(typeof cause === "string" && { cause: cause }),
            ...(typeof protected_exclusion === "boolean" && { protectedExclusion: protected_exclusion }),
            ...((entry === "explicit" || entry === "inherited") && { entry: entry }),
          },
        ];
      })
    : [];
}
//@ chunk-fq0cr76a.js:807541-808509 esm-fingerprint
async function j9(e = {}) {
  let { exe: exe, prependArgs: prependArgs } = e.srtWin ?? si(),
    s = Y9(e),
    h = e.timeoutMs ?? hx,
    promise = await new Promise((b, S) => {
      let w = spawn_4(exe, [...prependArgs, ...s], { windowsHide: !0 }),
        R = !1,
        D =
          h > 0
            ? setTimeout(() => {
                ((R = !0), w.kill());
              }, h)
            : void 0,
        O = "",
        L = "",
        V = "";
      (w.stdout?.setEncoding("utf8").on("data", (K) => (O += K)),
        w.stderr?.setEncoding("utf8").on("data", (K) => {
          ((L += K), (V += K));
          let parts = V.split(/\r?\n/);
          V = parts.pop() ?? "";
          for (let Z of parts) if (Z.trim() !== "") e.onProgress?.(Z);
        }),
        w.stdin?.on("error", () => {}).end(),
        w.once("error", (K) => {
          (clearTimeout(D),
            S(
              new WindowsSandboxError(
                "spawn_failed",
                `srt-win profile: spawn failed: ${K.message}`,
                "profile",
              ),
            ));
        }),
        w.once("close", (K, q) => {
          if ((clearTimeout(D), V.trim() !== "")) e.onProgress?.(V);
          if (R) {
            S(
              new WindowsSandboxError(
                "srt_win_timeout",
                `srt-win profile grant timed out after ${h}ms; the ` +
                  "grant is recorded as incomplete \u2014 run it again, or remove " +
                  "it with forgetWindowsProfileRead()",
                "profile",
              ),
            );
            return;
          }
          try {
            Yf(s, K, O);
          } catch (error) {
            S(error);
            return;
          }
          b({ status: K, signal: q, stdout: O.trim(), stderr: L.trim() });
        }));
    });
  return Z9(s, promise);
}
//@ chunk-fq0cr76a.js:808509-808669 esm-fingerprint
function Y9(e) {
  let n = ["profile", "grant", "--json"];
  for (let r of e.exclude ?? []) n.push("--exclude", r);
  if (e.replaceExclusions) n.push("--replace-excludes");
  return n;
}
//@ chunk-fq0cr76a.js:808669-809336 esm-fingerprint
function Z9(e, n) {
  if ((At(`[Sandbox Windows] profile grant exit=${n.status}: ${n.stderr.slice(-2000)}`), n.status !== 0))
    throw new WindowsSandboxError(
      "profile_grant_failed",
      `srt-win profile grant exited ${n.status}: ${n.stderr.slice(-2000) || n.stdout}`,
      "profile",
    );
  let r = rx(e, n);
  return {
    profile: r.profile,
    containers: r.containers,
    granted: r.granted,
    files: r.files,
    denied: r.denied,
    placeholders: r.placeholders,
    writes: r.writes,
    unchanged: r.unchanged,
    removed: r.removed,
    skipped: r.skipped ?? [],
    notGranted: no(r.not_granted),
    selfClosed: no(r.self_closed),
    unverifiable: no(r.unverifiable),
    unprotected: no(r.unprotected),
    staleAllow: no(r.stale_allow),
    forgottenRoots: no(r.forgotten_roots),
    elapsedMs: r.elapsed_ms,
  };
}
//@ chunk-fq0cr76a.js:809336-809457 esm-fingerprint
async function forgetWindowsProfileReadAsync(e = {}) {
  let n = await Tu(["profile", "forget", "--json"], { timeoutMs: e.timeoutMs ?? hx, srtWin: e.srtWin });
  z9(n);
}
//@ chunk-fq0cr76a.js:809457-809728 esm-fingerprint
function z9(e) {
  if ((At(`[Sandbox Windows] profile forget exit=${e.status}: ${e.stderr || e.stdout}`), e.status !== 0))
    throw new WindowsSandboxError(
      "profile_forget_failed",
      `The profile read grant could not be removed (srt-win profile forget exited ${e.status}): ${e.stderr || e.stdout}`,
      "profile",
    );
}
//@ chunk-fq0cr76a.js:809728-809808 esm-fingerprint
function X9(e) {
  return oD(e).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}
//@ chunk-fq0cr76a.js:809808-809912 esm-fingerprint
function iI(e, n) {
  if (e === "*") return !0;
  if (e.endsWith("*")) return n.startsWith(e.slice(0, -1));
  return e === n;
}
//@ chunk-fq0cr76a.js:809912-810414 esm-fingerprint
function oI(e, n, r = !0) {
  if (n.length === 0) return "match";
  let s;
  try {
    let lstatSync = fsModule_6.lstatSync(e);
    if (lstatSync.isSymbolicLink()) return r ? { unexamined: `'${e}' is a link` } : "none";
    if (!lstatSync.isDirectory()) return "none";
    s = fsModule_6.readdirSync(e, { withFileTypes: !0 });
  } catch (error) {
    if (isNotFoundErrorCode(error)) return "none";
    let b = error?.code ?? "error";
    return { unexamined: `'${e}' could not be listed (${b})` };
  }
  let h;
  for (let y of s) {
    if (!iI(n[0], Mqt(y.name))) continue;
    let b = oI(pathModule_3.join(e, y.name), n.slice(1), !1);
    if (b === "match") return "match";
    if (b !== "none") h ?? (h = b);
  }
  return h ?? "none";
}
//@ chunk-fq0cr76a.js:810414-811659 esm-fingerprint
function ig(e, n, r = {}) {
  if (e.length === 0) return [];
  let s = r.write ? "write" : "read",
    h = (R, D) => R.map((O) => ({ exclusion: O, kind: D, parts: Mqt(X9(O)).split("/") })),
    y = h(n.ungrantedOnly, "ungranted-only"),
    b = [
      ...y.map((R) => ({ ...R, onlyEqual: !0 })),
      ...h(n.exclusions, "protected").map((R) => ({ ...R, onlyEqual: !1 })),
      ...y.map((R) => ({ ...R, onlyEqual: !1 })),
    ];
  if (b.length === 0) return [];
  let S = new Set(r.write ? [] : (r.override ?? []).map(jf)),
    w = [];
  for (let R of e) {
    let D = z1(R),
      O = X1(R, D),
      parts = O.split("/");
    for (let V of b) {
      let min = Math.min(parts.length, V.parts.length),
        q = !0;
      for (let ie = 0; q && ie < min; ie++) q = iI(V.parts[ie], parts[ie]);
      if (!q) continue;
      let Z = parts.length === V.parts.length ? "equal" : parts.length > V.parts.length ? "inside" : "above";
      if (V.onlyEqual && Z !== "equal") continue;
      let J;
      if (Z === "above" && V.exclusion.includes("*")) {
        if (D.state === "absent") continue;
        if (D.state === "resolved") {
          let ie = oI(D.path, V.parts.slice(parts.length));
          if (ie === "none") continue;
          if (ie !== "match") J = ie.unexamined;
        } else
          J =
            D.state === "unprobed"
              ? `'${R}' is not on a local drive and is not examined`
              : `'${R}' could not be resolved (${D.code})`;
      }
      if (V.kind === "ungranted-only") {
        if (Z === "inside") continue;
      } else if (Z !== "above" && S.has(O)) continue;
      w.push({
        path: R,
        exclusion: V.exclusion,
        kind: V.kind,
        access: s,
        relation: Z,
        ...(J === void 0 ? {} : { unexamined: J }),
      });
      break;
    }
  }
  return w;
}
//@ chunk-fq0cr76a.js:811659-811692 esm-fingerprint
var J9 = "localhost,127.0.0.1,::1";
//@ chunk-fq0cr76a.js:811692-813329 esm-fingerprint
function aI(e) {
  let { exe: exe, prependArgs: prependArgs } = e.srtWin ?? si(),
    s = tK(
      Vot(
        e.httpProxyPort,
        e.socksProxyPort,
        e.caCertPath?.replace(/\\/g, "/"),
        e.proxyAuthToken,
        void 0,
        QSe(ITt(e.command, e.commandId)),
      ),
    );
  if (
    (delete s.TMPDIR,
    delete s.NO_PROXY,
    delete s.no_proxy,
    e.allowLoopback && (e.httpProxyPort || e.socksProxyPort))
  )
    s.no_proxy = J9;
  let h = U3r({
      safeDirs: [e.cwd ?? process.cwd(), ...(e.allowWrite ?? []), ...(e.gitSafeDirectories ?? [])],
      schannelCa: e.caCertPath !== void 0,
      opensslBackend: !0,
      baseEnv: e.setEnvVars,
    }),
    y = [exe, ...prependArgs, "exec"];
  if (e.quiet !== !1) y.push("--quiet");
  if (e.heldBy !== void 0) y.push("--held-by", `${e.heldBy}`);
  y.push("--write-restricted-token");
  for (let D of e.writeRoots ?? []) y.push("--write-root", D);
  if (e.allowLoopback) y.push("--allow-loopback");
  for (let D of e.denyRead ?? []) y.push("--deny-read", D);
  for (let D of e.denyReadExcept ?? []) y.push("--deny-read-except", D);
  for (let D of e.denyWrite ?? []) y.push("--deny-write", D);
  let b = eK(
    {
      PATH: process.env.PATH,
      PATHEXT: process.env.PATHEXT,
      ...(e.httpProxyPort ? { NODE_USE_ENV_PROXY: "1" } : {}),
    },
    e.setEnvVars ?? {},
    s,
    h,
  );
  for (let [D, O] of Object.entries(b)) if (O !== void 0) y.push("--env", `${D}=${O}`);
  y.push("--");
  let S = e.binShell ?? ex(void 0);
  y.push(S.exe, ...S.args, e.command);
  let reduced = y.reduce((D, O) => D + O.length + 3, 0);
  if (reduced > 30000)
    throw new WindowsSandboxError(
      "argv_too_long",
      `Windows sandbox argv is ~${reduced} chars (CreateProcessW limit is 32 767). Besides the command itself it carries ${e.denyRead?.length ?? 0} per-command read denies, ${e.denyReadExcept?.length ?? 0} session grants beneath them, ${e.denyWrite?.length ?? 0} write denies and ${e.writeRoots?.length ?? 0} write roots; the command was not run with fewer.`,
    );
  let R = { ...process.env, ...s };
  return { argv: y, env: R };
}
//@ chunk-fq0cr76a.js:813329-813427 esm-fingerprint
var Q9 = ["http_proxy", "https_proxy", "ftp_proxy", "all_proxy", "no_proxy", "grpc_proxy", "RSYNC_PROXY"];
//@ chunk-fq0cr76a.js:813427-813645 esm-fingerprint
function eK(...e) {
  let n = new Map();
  for (let r of e)
    for (let [s, h] of Object.entries(r)) {
      if (h === void 0) continue;
      let upper = s.toUpperCase(),
        b = Q9.find((S) => S.toUpperCase() === upper) ?? s;
      n.set(upper, [b, h]);
    }
  return Object.fromEntries(n.values());
}
//@ chunk-fq0cr76a.js:813645-813763 esm-fingerprint
function tK(e) {
  let n = {};
  for (let r of e) {
    let index = r.indexOf("=");
    if (index === -1) continue;
    n[r.slice(0, index)] = r.slice(index + 1);
  }
  return n;
}
//@ chunk-fq0cr76a.js:813763-814516 esm-layout
function kor(e, n) {
  if (e.setupVersion === void 0 || e.markerVersion === e.setupVersion) return;
  if (e.markerVersion !== void 0 && e.markerVersion > e.setupVersion) {
    let r = n ? ` --sublayer-guid ${n}` : "";
    return `The Windows sandbox on this machine was set up by a newer release (setup version ${e.markerVersion}; this release needs ${e.setupVersion}). Use that release, or replace its install with this one: \`srt-win.exe install --force${r}\`.
Nothing is granted or run until then.`;
  }
  return (
    `The Windows sandbox on this machine was set up by a different release (setup version ${e.markerVersion ?? "unknown"}; this release needs ${e.setupVersion}). Re-run the install to upgrade it in place (one UAC prompt):
` +
    lI(cx({ sublayerGuid: n }, !1)) +
    "Nothing is granted or run until then."
  );
}
//@ chunk-fq0cr76a.js:814516-814675 esm-fingerprint
function lI(e) {
  return (
    `  npx sandbox-runtime windows-install${e}
` +
    "  \u2014 or call installWindowsSandbox(), or run " +
    `\`srt-win.exe install${e}\` directly.
`
  );
}
//@ chunk-fq0cr76a.js:814675-814935 esm-layout
function O1(e, n = !1) {
  return (
    `Windows sandbox needs a one-time install (one UAC prompt):
` +
    lI(cx((typeof e === "string" ? { sublayerGuid: e } : e) ?? {}, n)) +
    "No logout is needed: the WFP filter keys on the dedicated `srt-sandbox` user's SID, so your network is unaffected."
  );
}
//@ chunk-fq0cr76a.js:814935-815036 esm-fingerprint
function P1(e) {
  try {
    return { status: "fulfilled", value: e() };
  } catch (error) {
    return { status: "rejected", reason: error };
  }
}
//@ chunk-fq0cr76a.js:815036-816931 esm-fingerprint
function cI(e, n, r) {
  let { sublayerGuid: sublayerGuid, allowLoopback: allowLoopback } = e,
    y = [],
    b = [],
    S = (q) => (q ? "open" : "closed"),
    w,
    R,
    D = () => ({
      errors: y,
      warnings: b,
      ...(w && { reinstallRequired: w }),
      ...(R && { loopbackMismatch: R }),
    });
  if (n.status === "rejected")
    return (y.push(`srt-win user status failed: ${n.reason.message}`), { errors: y, warnings: b });
  let O = n.value;
  if (!O.provisioned || !O.credPresent)
    y.push(`Sandbox user is not provisioned (user=${O.provisioned}, cred=${O.credPresent}). ` + O1(e));
  else if (((w = kor(O, sublayerGuid)), w)) y.push(w);
  if (O.seclogon === "disabled" || O.seclogon === "missing") y.push(V1(O.seclogon));
  else if (O.seclogon === "cannot-read")
    At(
      "[Sandbox Windows] Secondary Logon (seclogon) state cannot-read; a launch will show whether it is usable",
    );
  let L = r();
  if (L.status === "rejected") return (y.push(`srt-win wfp status failed: ${L.reason.message}`), D());
  let V = L.value;
  if (V.state === "cannot-read") At(`[Sandbox Windows] wfp status cannot-read (non-elevated): ${V.hint}`);
  else if (V.state === "loopback-mismatch")
    y.push(
      `WFP filters under sublayer ${sublayerGuid ?? "(default)"} cannot be used: their loopback mode (${V.allowLoopback ? "open" : "closed"}) is not the one the install recorded. Re-run the install for this configuration (one UAC prompt):
  ` + ng(e, !0),
    );
  else if (V.state !== "installed") {
    if (O.provisioned && O.credPresent)
      y.push(`WFP filters not installed under sublayer ${sublayerGuid ?? "(default)"}. ` + O1(e));
  } else if (V.portRange)
    At(
      `[Sandbox Windows] WFP installed: ${V.filters} filters, proxy port range ${V.portRange[0]}-${V.portRange[1]}, loopback ${S(V.allowLoopback)}`,
    );
  let K = O.provisioned && O.credPresent && (V.state === "installed" || V.state === "cannot-read");
  if (K && allowLoopback !== void 0 && V.allowLoopback !== allowLoopback)
    ((R =
      `WFP filters under sublayer ${sublayerGuid ?? "(default)"} do not match network.allowLocalBinding (installed: loopback ${S(V.allowLoopback)}; configured: ${S(allowLoopback)}). Re-run the install for this configuration (one UAC prompt):
  ` + ng(e, !0)),
      y.push(R));
  else if (K && V.allowLoopback) b.push(z6r);
  return D();
}
//@ chunk-fq0cr76a.js:816931-817165 esm-fingerprint
function uI(e = {}) {
  let n;
  try {
    n = e.srtWin ?? si();
  } catch (error) {
    return { errors: [error.message], warnings: [] };
  }
  return (
    At(`[Sandbox Windows] using srt-win at ${n.exe}`),
    cI(
      e,
      P1(() => Y1({ srtWin: n })),
      () => P1(() => G1({ sublayerGuid: e.sublayerGuid, srtWin: n })),
    )
  );
}
//@ chunk-fq0cr76a.js:817165-817431 esm-fingerprint
async function dI(e = {}) {
  let n;
  try {
    n = e.srtWin ?? si();
  } catch (error) {
    return { errors: [error.message], warnings: [] };
  }
  At(`[Sandbox Windows] using srt-win at ${n.exe}`);
  let [r, s] = await Promise.allSettled([
    Pot({ srtWin: n }),
    v9({ sublayerGuid: e.sublayerGuid, srtWin: n }),
  ]);
  return cI(e, r, () => s);
}

export {
  checkWindowsSandboxStatusAsync,
  kor,
  z6r,
  installWindowsSandboxAsync,
  WindowsSandboxError,
  ensurePersistentWindowsCa,
  A3o,
  dx,
  px,
  Pot,
  Au,
  q6r,
  ox,
  sI,
  ax,
  nI,
  eI,
  si,
  ig,
  tI,
  j1,
  qf,
  uI,
  dI,
  fx,
  aI,
  J1,
  ex,
  rg,
  forgetWindowsProfileReadAsync,
  uninstallWindowsSandbox,
};
