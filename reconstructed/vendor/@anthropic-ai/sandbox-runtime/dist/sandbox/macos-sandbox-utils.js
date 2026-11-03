/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/macos-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (40)
 * attribution: esm-fingerprint 32, esm-layout 8
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import * as pathModule_4 from "path";
import * as pathModule_5 from "path";
import { spawn, spawn as spawn_2, spawn as spawn_3, spawn as spawn_4, spawn as spawn_5 } from "child_process";
import { sS, dsr, csr, QSe, Cwn, Ad, zot, Dqt, F3r, oS, ITt, Vot, B3r, x4e } from "./sandbox-utils.js";
import { Oqt, xTt } from "./glob-pattern.js";
import { nc } from "./path-entries.js";
import { At } from "../utils/debug.js";
import { Ym } from "./java-proxy-agent.js";
import { ha } from "../utils/which.js";
import { zee } from "../utils/shell-quote.js";
import { Eu } from "./sandbox-violation-store.js";

//@ chunk-fq0cr76a.js:758526-758857 esm-fingerprint
function G8(e = !1) {
  let n = sS(process.cwd(), { literal: !0 }),
    r = [],
    s = (y) => Hf(pathModule_2.resolve(n, y)),
    h = (y) => K8(n, y);
  for (let y of dsr) (r.push(s(y)), r.push(h(`**/${y}`)));
  for (let y of csr()) (r.push(s(y)), r.push(h(`**/${y}/**`)));
  if ((r.push(s(".git/hooks")), r.push(h("**/.git/hooks/**")), !e))
    (r.push(s(".git/config")), r.push(h("**/.git/config")));
  return r;
}
//@ chunk-fq0cr76a.js:758857-758913 esm-fingerprint
var h1 = `_${Math.random().toString(36).slice(2, 11)}_SBX`;
//@ chunk-fq0cr76a.js:758913-758962 esm-fingerprint
function H8(e) {
  return `CMD64_${QSe(e)}_END_${h1}`;
}
//@ chunk-fq0cr76a.js:758962-759040 esm-fingerprint
function gc(e) {
  return e.glob ? `(regex ${qs(g1(e))})` : `(subpath ${qs(e.path)})`;
}
//@ chunk-fq0cr76a.js:759040-759173 esm-fingerprint
function m1(e, n) {
  if (e.anchor === void 0) return n(e.path);
  let sliced = e.path.slice(e.anchor.length);
  return `^${Oqt(e.anchor)}${n(sliced).slice(1)}`;
}
//@ chunk-fq0cr76a.js:759173-759205 esm-layout
function g1(e) {
  return m1(e, xTt);
}
//@ chunk-fq0cr76a.js:759205-759237 esm-layout
function XE(e) {
  return m1(e, Cwn);
}
//@ chunk-fq0cr76a.js:759237-759315 esm-fingerprint
function ll(e) {
  return e.glob ? `(regex ${qs(XE(e))})` : `(subpath ${qs(e.path)})`;
}
//@ chunk-fq0cr76a.js:759315-759439 esm-fingerprint
function y1(e) {
  if (!e.glob) return e.path;
  let n = e.anchor ?? "";
  return n + e.path.slice(n.length).replace(/\[[^\]]*\]|[*?]+/g, "x");
}
//@ chunk-fq0cr76a.js:759439-759584 esm-fingerprint
function eg(e, n) {
  let r = [...new Set(n)];
  if (r.length === 0) return e;
  let joined = r.map((h) => `(require-not ${h})`).join(" ");
  return `(require-all ${e} ${joined})`;
}
//@ chunk-fq0cr76a.js:759584-759644 esm-fingerprint
function K8(e, n) {
  return { glob: !0, path: pathModule_2.join(e, n), anchor: e };
}
//@ chunk-fq0cr76a.js:759644-759727 esm-fingerprint
function S1(e) {
  return Ad(e) ? { glob: !0, path: sS(e) } : { glob: !1, path: sS(e, { literal: !0 }) };
}
//@ chunk-fq0cr76a.js:759727-759782 esm-fingerprint
function Hf(e) {
  return { path: sS(e, { literal: !0 }), glob: !1 };
}
//@ chunk-fq0cr76a.js:759782-759835 esm-fingerprint
function E1(e, n) {
  return (e ?? []).flatMap((r) => nc(r, n));
}
//@ chunk-fq0cr76a.js:759835-759911 esm-layout
function Qm(e, n, r) {
  return [...(n ?? []).map(S1), ...E1(n, e), ...(r ?? []).map(Hf)];
}
//@ chunk-fq0cr76a.js:759911-759949 esm-layout
function x1(e, n) {
  return e.test(y1(n));
}
//@ chunk-fq0cr76a.js:759949-759986 esm-layout
function Gf(e, n) {
  return zot(y1(e), n);
}
//@ chunk-fq0cr76a.js:759986-760195 esm-fingerprint
function Jm(e, n) {
  let r = (y) => Dqt(y)[1] ?? y,
    s = JE(n),
    h = e === "deny" || n.glob ? r(s) : F3r(s, r);
  if (h === s || h === "/" || oS(h, "/dev")) return [n];
  return [n, n.glob ? { glob: !0, path: h + n.path.slice(s.length), anchor: h } : { glob: !1, path: h }];
}
//@ chunk-fq0cr76a.js:760195-760645 esm-fingerprint
function q8(e, n, r) {
  let flattened = [...Qm("deny", e.credentialDenyOnly, void 0), ...r].flatMap((h) => Jm("deny", h));
  return {
    denies: [
      ...Qm(
        "deny",
        e.denyOnly.filter((h) => !e.credentialDenyOnly?.includes(h)),
        e.literalDenyOnly,
      ).flatMap((h) => Jm("deny", h)),
      ...flattened,
    ],
    credentialDenies: new Set(flattened),
    ownAllows: (e.ownAllowWithinDeny ?? []).map(Hf).flatMap((h) => Jm("allow", h)),
    allows: Qm("allow", e.allowWithinDeny, e.literalAllowWithinDeny).flatMap((h) => Jm("allow", h)),
    writeRoots: [...n],
  };
}
//@ chunk-fq0cr76a.js:760645-761096 esm-fingerprint
function j8(e) {
  let n = [],
    r = !1,
    mapped = e.allows.filter((allow) => !allow.glob).map((h) => h.path);
  for (let deny of e.denies) {
    let y = e.credentialDenies.has(deny);
    if (!deny.glob) {
      if (y) {
        let mapped = e.ownAllows.filter((ownAllow) => oS(ownAllow.path, deny.path)).map((R) => gc(R));
        n.push(eg(ll(deny), mapped));
      } else if (mapped.some((w) => Gf(deny, w))) n.push(ll(deny));
      continue;
    }
    let regExp = new RegExp(XE(deny));
    if (regExp.test("/")) r = !0;
    let mapped_2 = (y ? e.ownAllows : e.allows).filter((w) => x1(regExp, w)).map((w) => gc(w));
    n.push(eg(ll(deny), mapped_2));
  }
  return { filters: n, coversRoot: r };
}
//@ chunk-fq0cr76a.js:761096-761215 esm-fingerprint
function Y8(e) {
  let n = e.split(/[*?[\]]/)[0];
  if (!n || n === "/") return "/";
  return n.endsWith("/") ? n.slice(0, -1) : pathModule_2.dirname(n);
}
//@ chunk-fq0cr76a.js:761215-761283 esm-fingerprint
function JE(e) {
  if (!e.glob) return e.path;
  return e.anchor ?? Y8(e.path);
}
//@ chunk-fq0cr76a.js:761283-762077 esm-fingerprint
function z8(e, n) {
  let { denies: denies, credentialDenies: credentialDenies, writeRoots: writeRoots } = e;
  if (writeRoots.length === 0) return [];
  let mapped = writeRoots.filter((D) => D.glob).map((D) => new RegExp(g1(D))),
    mapped_2 = writeRoots.filter((D) => !D.glob).map((D) => D.path),
    S = (D) => mapped_2.some((O) => Gf({ path: D, glob: !1 }, O)) || mapped.some((O) => O.test(D)),
    w = new Set(),
    R = (D, O) => {
      for (let L of D) if (S(L) || (O && mapped_2.includes(L))) w.add(`(literal ${qs(L)})`);
    };
  for (let D of denies) {
    let O = credentialDenies.has(D),
      L = O ? [] : [...e.allows, ...writeRoots];
    if (D.glob) {
      let V = JE(D);
      if (!(
        mapped.length > 0 ||
        mapped_2.some((J) => V === J || Gf({ path: V, glob: !1 }, J) || Gf({ path: J, glob: !1 }, V))
      ))
        continue;
      let regExp = new RegExp(XE(D)),
        mapped_3 = L.filter((J) => x1(regExp, J)).map((J) => gc(J));
      if ((w.add(eg(ll(D), mapped_3)), V !== "/")) R([V, ...tg(V)], O);
    } else {
      if (!O && !S(D.path)) continue;
      let mapped = L.filter((K) => Gf(K, D.path)).map((K) => gc(K));
      (w.add(eg(ll(D), mapped)), R(tg(D.path), O));
    }
  }
  return to("deny", ["file-write-unlink"], w, n);
}
//@ chunk-fq0cr76a.js:762077-762208 esm-fingerprint
function to(e, n, r, s) {
  if (r.size === 0) return [];
  return [`(${e} ${n.join(" ")}`, ...[...r].map((h) => `  ${h}`), `  (with message "${s}"))`];
}
//@ chunk-fq0cr76a.js:762208-762330 esm-fingerprint
function tg(e) {
  let n = [],
    dir = pathModule_2.dirname(e);
  while (dir !== "/" && dir !== ".") {
    n.push(dir);
    let dir_2 = pathModule_2.dirname(dir);
    if (dir_2 === dir) break;
    dir = dir_2;
  }
  return n;
}
//@ chunk-fq0cr76a.js:762330-762346 esm-layout
var _1 = 900,
  X8 = 4;
//@ chunk-fq0cr76a.js:762346-763045 esm-fingerprint
function J8(e) {
  let n = new Map();
  for (let h of e) {
    if (h.glob) continue;
    let path = h.path,
      dir = pathModule_2.dirname(path),
      dir_2 = pathModule_2.dirname(dir);
    if (dir_2 === dir || dir === path || dir_2 === "/") continue;
    let w = n.get(dir_2);
    if (!w) ((w = new Map()), n.set(dir_2, w));
    let base = pathModule_2.basename(dir),
      D = w.get(base);
    if (!D) ((D = new Set()), w.set(base, D));
    D.add(pathModule_2.basename(path));
  }
  let r = new Set(),
    s = [];
  for (let [h, y] of n) {
    let b = new Map();
    for (let [S, w] of y) {
      let sorted = [...w].sort(),
        joined = sorted.join("\x00"),
        O = b.get(joined);
      if (!O) ((O = { dir: h, names: [], leaves: sorted }), b.set(joined, O));
      O.names.push(S);
    }
    for (let S of b.values()) {
      let w = mc(v1(S)) + mc(w1(S));
      if (((S.names = S.names.filter((R) => w + mc(Oqt(R)) <= _1)), S.names.length < X8)) continue;
      s.push(S);
      for (let R of S.names) for (let leave of S.leaves) r.add(pathModule_2.join(h, R, leave));
    }
  }
  return { groups: s, rest: e.filter((h) => !r.has(h.path)) };
}
//@ chunk-fq0cr76a.js:763045-763094 esm-layout
function mc(e) {
  return Buffer.byteLength(qs(e)) - 2;
}
//@ chunk-fq0cr76a.js:763094-763134 esm-fingerprint
function v1(e) {
  return `^${Oqt(e.dir)}/(`;
}
//@ chunk-fq0cr76a.js:763134-763199 esm-fingerprint
function w1(e) {
  return `)/(${e.leaves.map(Oqt).join("|")})(/.*)?$`;
}
//@ chunk-fq0cr76a.js:763199-763539 esm-fingerprint
function Q8(e) {
  let n = v1(e),
    r = w1(e),
    s = ")$",
    h = mc(n) + mc(r),
    y = [],
    b = [],
    S = 0;
  for (let R of e.names.map(Oqt)) {
    let D = mc(R) + (b.length === 0 ? 0 : 1);
    if (b.length > 0 && h + S + D > _1) (y.push(b), (b = []), (S = 0));
    (b.push(R), (S += b.length === 1 ? mc(R) : D));
  }
  y.push(b);
  let mapped = y.map((R) => R.join("|"));
  return {
    deny: mapped.map((R) => `(regex ${qs(n + R + r)})`),
    pins: mapped.map((R) => `(regex ${qs(n + R + ")$")})`),
  };
}
//@ chunk-fq0cr76a.js:763539-763624 esm-fingerprint
function e9(e, n) {
  return to("deny", ["file-write-unlink", "file-write-create"], T1(e), n);
}
//@ chunk-fq0cr76a.js:763624-763809 esm-fingerprint
function T1(e) {
  let n = new Set();
  for (let r of e) {
    n.add(ll(r));
    let s = JE(r);
    if (r.glob) {
      if (s === "/") continue;
      n.add(`(literal ${qs(s)})`);
    }
    for (let h of tg(s)) n.add(`(literal ${qs(h)})`);
  }
  return n;
}
//@ chunk-fq0cr76a.js:763809-764446 esm-fingerprint
function t9(e, n) {
  if (!e) return ["(allow file-read*)"];
  let r = [];
  r.push("(allow file-read*)");
  let any = e.denies.some((deny) => deny.path === "/"),
    h = new Set(e.denies.map(ll));
  r.push(...to("deny", ["file-read*"], h, n));
  let y = new Set(e.allows.map((allow) => gc(allow)));
  r.push(...to("allow", ["file-read*"], y, n));
  let b = j8(e);
  if ((r.push(...to("deny", ["file-read*"], new Set(b.filters), n)), any || b.coversRoot))
    r.push('(allow file-read* (literal "/"))');
  if (e.denies.length > 0) r.push("(allow file-read-metadata", "  (vnode-type DIRECTORY))");
  r.push(...e9(e.denies, n));
  let S = new Set(e.writeRoots.map(gc));
  return (r.push(...to("allow", ["file-write-unlink", "file-write-create"], S, n)), r);
}
//@ chunk-fq0cr76a.js:764446-764513 esm-fingerprint
function n9(e) {
  return Qm("allow", e?.allowOnly, e?.literalAllowOnly);
}
//@ chunk-fq0cr76a.js:764513-765190 esm-fingerprint
function r9(e, n, r, s) {
  if (!e) return ["(allow file-write*)"];
  let h = [],
    y = new Set();
  for (let L of s) y.add(gc(L));
  h.push(...to("allow", ["file-write*"], y, n));
  let b = [...(e.denyWithinAllow || []).map(S1), ...(e.literalDenyWithinAllow ?? []).map(Hf), ...G8(r)];
  b.push(...E1(e.denyWithinAllow, "deny"));
  let { groups: groups, rest: rest } = J8(b),
    mapped = groups.map(Q8),
    D = new Set();
  for (let { deny: deny } of mapped) for (let V of deny) D.add(V);
  for (let L of rest) D.add(ll(L));
  h.push(...to("deny", ["file-write*"], D, n));
  let O = T1(rest);
  for (let [L, { deny: V, pins: K }] of mapped.entries()) {
    for (let Z of [...V, ...K]) O.add(Z);
    let { dir: dir } = groups[L];
    for (let Z of [dir, ...tg(dir)]) O.add(`(literal ${qs(Z)})`);
  }
  return (h.push(...to("deny", ["file-write-unlink", "file-write-create"], O, n)), h);
}
//@ chunk-fq0cr76a.js:765190-772859 esm-fingerprint
function s9({
  readConfig: readConfig,
  libraryDenyEntries: libraryDenyEntries,
  writeConfig: writeConfig,
  httpProxyPort: httpProxyPort,
  socksProxyPort: socksProxyPort,
  needsNetworkRestriction: needsNetworkRestriction,
  allowUnixSockets: allowUnixSockets,
  allowAllUnixSockets: allowAllUnixSockets,
  allowLocalBinding: allowLocalBinding,
  allowMachLookup: allowMachLookup,
  allowPty: allowPty,
  allowGitConfig: allowGitConfig = !1,
  enableWeakerNetworkIsolation: enableWeakerNetworkIsolation = !1,
  allowAppleEvents: allowAppleEvents = !1,
  logTag: logTag,
}) {
  let q = [
    "(version 1)",
    `(deny default (with message "${logTag}"))`,
    "",
    `; LogTag: ${logTag}`,
    "",
    "; Essential permissions - based on Chrome sandbox policy",
    "; Process permissions",
    "(allow process-exec)",
    "(allow process-fork)",
    "(allow process-info* (target same-sandbox))",
    "(allow signal (target same-sandbox))",
    "(allow mach-priv-task-port (target same-sandbox))",
    "",
    "; User preferences",
    "(allow user-preference-read)",
    "",
    "; Mach IPC - specific services only (no wildcard)",
    "(allow mach-lookup",
    '  (global-name "com.apple.audio.systemsoundserver")',
    '  (global-name "com.apple.distributed_notifications@Uv3")',
    '  (global-name "com.apple.FontObjectsServer")',
    '  (global-name "com.apple.fonts")',
    '  (global-name "com.apple.logd")',
    '  (global-name "com.apple.lsd.mapdb")',
    '  (global-name "com.apple.PowerManagement.control")',
    '  (global-name "com.apple.system.logger")',
    '  (global-name "com.apple.system.notification_center")',
    '  (global-name "com.apple.system.opendirectoryd.libinfo")',
    '  (global-name "com.apple.system.opendirectoryd.membership")',
    '  (global-name "com.apple.bsd.dirhelper")',
    '  (global-name "com.apple.securityd.xpc")',
    '  (global-name "com.apple.coreservices.launchservicesd")',
    ")",
    "",
    ...(enableWeakerNetworkIsolation
      ? [
          "; trustd.agent - needed for Go TLS certificate verification (weaker network isolation)",
          '(allow mach-lookup (global-name "com.apple.trustd.agent"))',
        ]
      : []),
    ...(allowAppleEvents
      ? [
          "; Apple Events - opt-in; needed for open/osascript to talk to other apps (appleeventsd)",
          "(allow appleevent-send)",
          '(allow mach-lookup (global-name "com.apple.coreservices.appleevents"))',
          "; Launch Services open requests need the lsopen operation plus, on",
          "; macOS 14/15, coreservicesd and the quarantine resolver - without",
          "; these open fails with -10822 kLSServerCommunicationErr or -54",
          "(allow lsopen)",
          '(allow mach-lookup (global-name "com.apple.CoreServices.coreservicesd"))',
          '(allow mach-lookup (global-name "com.apple.coreservices.quarantine-resolver"))',
        ]
      : []),
    ...(allowMachLookup && allowMachLookup.length > 0
      ? [
          "; User-specified XPC/Mach services",
          ...allowMachLookup.map((ie) =>
            ie.endsWith("*")
              ? `(allow mach-lookup (global-name-prefix ${qs(ie.slice(0, -1))}))`
              : `(allow mach-lookup (global-name ${qs(ie)}))`,
          ),
        ]
      : []),
    "",
    "; POSIX IPC - shared memory",
    "(allow ipc-posix-shm)",
    "",
    "; POSIX IPC - semaphores for Python multiprocessing",
    "(allow ipc-posix-sem)",
    "",
    "; IOKit - specific operations only",
    "(allow iokit-open",
    '  (iokit-registry-entry-class "IOSurfaceRootUserClient")',
    '  (iokit-registry-entry-class "RootDomainUserClient")',
    '  (iokit-user-client-class "IOSurfaceSendRight")',
    ")",
    "",
    "; IOKit properties",
    "(allow iokit-get-properties)",
    "",
    "; Specific safe system-sockets, doesn't allow network access",
    "(allow system-socket (require-all (socket-domain AF_SYSTEM) (socket-protocol 2)))",
    "",
    "; sysctl - specific sysctls only",
    "(allow sysctl-read",
    '  (sysctl-name "hw.activecpu")',
    '  (sysctl-name "hw.busfrequency_compat")',
    '  (sysctl-name "hw.byteorder")',
    '  (sysctl-name "hw.cacheconfig")',
    '  (sysctl-name "hw.cachelinesize_compat")',
    '  (sysctl-name "hw.cpufamily")',
    '  (sysctl-name "hw.cpufrequency")',
    '  (sysctl-name "hw.cpufrequency_compat")',
    '  (sysctl-name "hw.cputype")',
    '  (sysctl-name "hw.l1dcachesize_compat")',
    '  (sysctl-name "hw.l1icachesize_compat")',
    '  (sysctl-name "hw.l2cachesize_compat")',
    '  (sysctl-name "hw.l3cachesize_compat")',
    '  (sysctl-name "hw.logicalcpu")',
    '  (sysctl-name "hw.logicalcpu_max")',
    '  (sysctl-name "hw.machine")',
    '  (sysctl-name "hw.memsize")',
    '  (sysctl-name "hw.ncpu")',
    '  (sysctl-name "hw.nperflevels")',
    '  (sysctl-name "hw.packages")',
    '  (sysctl-name "hw.pagesize_compat")',
    '  (sysctl-name "hw.pagesize")',
    '  (sysctl-name "hw.physicalcpu")',
    '  (sysctl-name "hw.physicalcpu_max")',
    '  (sysctl-name "hw.tbfrequency_compat")',
    '  (sysctl-name "hw.vectorunit")',
    '  (sysctl-name "kern.argmax")',
    '  (sysctl-name "kern.bootargs")',
    '  (sysctl-name "kern.hostname")',
    '  (sysctl-name "kern.maxfiles")',
    '  (sysctl-name "kern.maxfilesperproc")',
    '  (sysctl-name "kern.maxproc")',
    '  (sysctl-name "kern.ngroups")',
    '  (sysctl-name "kern.osproductversion")',
    '  (sysctl-name "kern.osrelease")',
    '  (sysctl-name "kern.ostype")',
    '  (sysctl-name "kern.osvariant_status")',
    '  (sysctl-name "kern.osversion")',
    '  (sysctl-name "kern.secure_kernel")',
    '  (sysctl-name "kern.tcsm_available")',
    '  (sysctl-name "kern.tcsm_enable")',
    '  (sysctl-name "kern.usrstack64")',
    '  (sysctl-name "kern.version")',
    '  (sysctl-name "kern.willshutdown")',
    '  (sysctl-name "machdep.cpu.brand_string")',
    '  (sysctl-name "machdep.ptrauth_enabled")',
    '  (sysctl-name "security.mac.lockdown_mode_state")',
    '  (sysctl-name "sysctl.proc_cputype")',
    '  (sysctl-name "vm.loadavg")',
    '  (sysctl-name-prefix "hw.optional.arm")',
    '  (sysctl-name-prefix "hw.optional.arm.")',
    '  (sysctl-name-prefix "hw.optional.armv8_")',
    '  (sysctl-name-prefix "hw.perflevel")',
    '  (sysctl-name-prefix "kern.proc.all")',
    '  (sysctl-name-prefix "kern.proc.pgrp.")',
    '  (sysctl-name-prefix "kern.proc.pid.")',
    '  (sysctl-name-prefix "machdep.cpu.")',
    '  (sysctl-name-prefix "net.routetable.")',
    ")",
    "",
    "; V8 thread calculations",
    "(allow sysctl-write",
    '  (sysctl-name "kern.tcsm_enable")',
    ")",
    "",
    "; Distributed notifications",
    "(allow distributed-notification-post)",
    "",
    "; Specific mach-lookup permissions for security operations",
    '(allow mach-lookup (global-name "com.apple.SecurityServer"))',
    "",
    "; File I/O on device files",
    '(allow file-ioctl (literal "/dev/null"))',
    '(allow file-ioctl (literal "/dev/zero"))',
    '(allow file-ioctl (literal "/dev/random"))',
    '(allow file-ioctl (literal "/dev/urandom"))',
    '(allow file-ioctl (literal "/dev/dtracehelper"))',
    '(allow file-ioctl (literal "/dev/tty"))',
    "",
    "(allow file-ioctl file-read-data file-write-data",
    "  (require-all",
    '    (literal "/dev/null")',
    "    (vnode-type CHARACTER-DEVICE)",
    "  )",
    ")",
    "",
  ];
  if ((q.push("; Network"), !needsNetworkRestriction)) q.push("(allow network*)");
  else {
    if (allowLocalBinding)
      (q.push('(allow network-bind (local ip "*:*"))'),
        q.push('(allow network-inbound (local ip "*:*"))'),
        q.push('(allow network-outbound (remote ip "localhost:*"))'));
    if (allowAllUnixSockets)
      (q.push("(allow system-socket (socket-domain AF_UNIX))"),
        q.push('(allow network-bind (local unix-socket (path-regex #"^/")))'),
        q.push('(allow network-outbound (remote unix-socket (path-regex #"^/")))'));
    else if (allowUnixSockets && allowUnixSockets.length > 0) {
      q.push("(allow system-socket (socket-domain AF_UNIX))");
      for (let ie of allowUnixSockets) {
        let ae = sS(ie);
        (q.push(`(allow network-bind (local unix-socket (subpath ${qs(ae)})))`),
          q.push(`(allow network-outbound (remote unix-socket (subpath ${qs(ae)})))`));
      }
    }
    if (httpProxyPort !== void 0)
      (q.push(
        ...to(
          "deny",
          ["network-bind", "network-inbound"],
          new Set([`(local ip "*:${httpProxyPort}")`]),
          logTag,
        ),
      ),
        q.push(`(allow network-outbound (remote ip "localhost:${httpProxyPort}"))`));
    if (socksProxyPort !== void 0 && socksProxyPort !== httpProxyPort)
      (q.push(
        ...to(
          "deny",
          ["network-bind", "network-inbound"],
          new Set([`(local ip "*:${socksProxyPort}")`]),
          logTag,
        ),
      ),
        q.push(`(allow network-outbound (remote ip "localhost:${socksProxyPort}"))`));
  }
  q.push("");
  let Z = n9(writeConfig),
    J =
      readConfig || libraryDenyEntries.length > 0
        ? q8(readConfig ?? { denyOnly: [] }, Z, libraryDenyEntries)
        : void 0;
  if (
    (q.push("; File read"),
    q.push(...t9(J, logTag)),
    q.push(""),
    q.push("; File write"),
    q.push(...r9(writeConfig, logTag, allowGitConfig, Z)),
    J)
  ) {
    let ie = z8(J, logTag);
    if (ie.length > 0)
      (q.push(""), q.push("; File read: keep read-denied paths inside write roots in place"), q.push(...ie));
  }
  if (allowPty)
    (q.push(""),
      q.push("; Pseudo-terminal (pty) support"),
      q.push("(allow pseudo-tty)"),
      q.push("(allow file-ioctl"),
      q.push('  (literal "/dev/ptmx")'),
      q.push('  (regex #"^/dev/ttys")'),
      q.push(")"),
      q.push("(allow file-read* file-write*"),
      q.push('  (literal "/dev/ptmx")'),
      q.push('  (regex #"^/dev/ttys")'),
      q.push(")"));
  return q.join(`
`);
}
//@ chunk-fq0cr76a.js:772859-772899 esm-layout
function qs(e) {
  return JSON.stringify(e);
}
//@ chunk-fq0cr76a.js:772899-774892 esm-fingerprint
function G6r(e) {
  let {
      command: command,
      commandId: commandId,
      needsNetworkRestriction: needsNetworkRestriction,
      httpProxyPort: httpProxyPort,
      socksProxyPort: socksProxyPort,
      proxyAuthToken: proxyAuthToken,
      caCertPath: caCertPath,
      javaAgentJarPath: javaAgentJarPath,
      allowUnixSockets: allowUnixSockets,
      allowAllUnixSockets: allowAllUnixSockets,
      allowLocalBinding: allowLocalBinding,
      allowMachLookup: allowMachLookup,
      readConfig: readConfig,
      writeConfig: writeConfig,
      unsetEnvVars: unsetEnvVars,
      setEnvVars: setEnvVars,
      maskedFileBinds: maskedFileBinds,
      degradeToDenyPaths: degradeToDenyPaths,
      allowPty: allowPty,
      allowGitConfig: allowGitConfig = !1,
      gitSafeDirectories: gitSafeDirectories,
      enableWeakerNetworkIsolation: enableWeakerNetworkIsolation = !1,
      allowAppleEvents: allowAppleEvents = !1,
      binShell: binShell,
    } = e,
    Ie = maskedFileBinds?.map((jt) => jt.realPath) ?? [];
  if (Ie.length > 0) At("[Sandbox macOS] file mask degrades to deny on macOS until the interposer lands");
  let mapped = [...Ie, ...(degradeToDenyPaths ?? [])].map(Hf),
    ft =
      (readConfig && (readConfig.denyOnly.length > 0 || (readConfig.literalDenyOnly?.length ?? 0) > 0)) ||
      mapped.length > 0,
    rt = writeConfig !== void 0,
    ut =
      (unsetEnvVars !== void 0 && unsetEnvVars.length > 0) ||
      (setEnvVars !== void 0 && Object.keys(setEnvVars).length > 0),
    we = (gitSafeDirectories?.length ?? 0) > 0;
  if (!needsNetworkRestriction && !ft && !rt && !ut && !we) return command;
  let Ae = ITt(command, commandId),
    dt = H8(Ae),
    Me = s9({
      readConfig: readConfig,
      libraryDenyEntries: mapped,
      writeConfig: writeConfig,
      httpProxyPort: httpProxyPort,
      socksProxyPort: socksProxyPort,
      needsNetworkRestriction: needsNetworkRestriction,
      allowUnixSockets: allowUnixSockets,
      allowAllUnixSockets: allowAllUnixSockets,
      allowLocalBinding: allowLocalBinding,
      allowMachLookup: allowMachLookup,
      allowPty: allowPty,
      allowGitConfig: allowGitConfig,
      enableWeakerNetworkIsolation: enableWeakerNetworkIsolation,
      allowAppleEvents: allowAppleEvents,
      logTag: dt,
    }),
    Ft = Vot(httpProxyPort, socksProxyPort, caCertPath, proxyAuthToken, writeConfig === void 0, QSe(Ae)),
    mt = Ym({
      agentJarPath: javaAgentJarPath,
      flags:
        needsNetworkRestriction &&
        (allowLocalBinding || httpProxyPort !== void 0 || socksProxyPort !== void 0)
          ? ["-Djava.net.preferIPv4Stack=true"]
          : [],
      unsetEnvVars: unsetEnvVars,
      inherited: process.env.JAVA_TOOL_OPTIONS,
    });
  if (mt !== void 0) Ft.push(`JAVA_TOOL_OPTIONS=${mt}`);
  if (gitSafeDirectories && gitSafeDirectories.length > 0) {
    let jt = B3r({ safeDirs: gitSafeDirectories, unsetEnvVars: unsetEnvVars, setEnvVars: setEnvVars });
    for (let [Rn, Xe] of Object.entries(jt)) Ft.push(`${Rn}=${Xe}`);
  }
  let Mt = binShell || "bash",
    mn = ha(Mt);
  if (!mn) throw Error(`Shell '${Mt}' not found in PATH`);
  let flattened = (unsetEnvVars ?? []).flatMap((jt) => ["-u", jt]),
    mapped_2 = Object.entries(setEnvVars ?? {}).map(([jt, Rn]) => `${jt}=${Rn}`),
    gt = zee(["env", ...flattened, ...mapped_2, ...Ft, "/usr/bin/sandbox-exec", "-p", Me, mn, "-c", command]);
  return (
    At(
      `[Sandbox macOS] Applied restrictions - network: ${!!(httpProxyPort || socksProxyPort)}, read: ${ft ? (readConfig && "allowAllExcept" in readConfig ? "allowAllExcept" : "denyAllExcept") : "none"}, write: ${writeConfig ? ("allowAllExcept" in writeConfig ? "allowAllExcept" : "denyAllExcept") : "none"}`,
    ),
    gt
  );
}
//@ chunk-fq0cr76a.js:774892-775857 esm-fingerprint
function A1(e, n, r) {
  let s = /CMD64_(.+?)_END/,
    h = /Sandbox:\s+(.+)$/,
    y = spawn_3("log", ["stream", "--predicate", `(eventMessage ENDSWITH "${h1}")`, "--style", "compact"]);
  return (
    y.stdout?.on("data", (b) => {
      let parts = b.toString().split(`
`),
        found = parts.find((K) => K.includes("Sandbox:") && K.includes("deny")),
        found_2 = parts.find((K) => K.startsWith("CMD64_"));
      if (!found) return;
      let match = found.match(h);
      if (!match?.[1]) return;
      let O = match[1],
        L,
        V;
      if (found_2) {
        if (((V = found_2.match(s)?.[1]), V))
          try {
            L = r(x4e(V));
          } catch {}
      }
      if (
        O.includes("mDNSResponder") ||
        O.includes("mach-lookup com.apple.diagnosticd") ||
        O.includes("mach-lookup com.apple.analyticsd")
      )
        return;
      if (Eu(O, L, n)) return;
      e({ line: O, command: L, encodedCommand: V, timestamp: new Date() });
    }),
    y.stderr?.on("data", (b) => {
      At(`[Sandbox Monitor] Log stream stderr: ${b.toString()}`);
    }),
    y.on("error", (b) => {
      At(`[Sandbox Monitor] Failed to start log stream: ${b.message}`);
    }),
    y.on("exit", (b) => {
      At(`[Sandbox Monitor] Log stream exited with code: ${b}`);
    }),
    () => {
      (At("[Sandbox Monitor] Stopping log monitor"), y.kill("SIGTERM"));
    }
  );
}

export { G6r, A1 };
