/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (61), chunk-yf82ynbr.js (1)
 * attribution: esm-layout 16, esm-fingerprint 46
 */
import path, {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import {
  tmpdir,
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  endianness,
} from "os";
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
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
} from "crypto";
import { oS, dsr, csr, Mqt, R4e, xwn, F3r, zot, sS, Pwn, Rwn, QSe, ITt, B3r, Vot } from "./sandbox-utils.js";
import { JSe, b8o } from "../utils/real-path.js";
import { At } from "../utils/debug.js";
import { LR, RipgrepError } from "../utils/ripgrep.js";
import { zee } from "../utils/shell-quote.js";
import { ha } from "../utils/which.js";
import { vor } from "./generate-seccomp-filter.js";
import { Xw, Jw } from "./path-entries.js";
import { Ym } from "./java-proxy-agent.js";

//@ chunk-fq0cr76a.js:723589-723598 esm-layout
var qE = 3;
//@ chunk-fq0cr76a.js:723598-723793 esm-fingerprint
function BE(e, n) {
  let parts = e.split(path.sep),
    s = "";
  for (let h of parts) {
    if (!h) continue;
    let y = s + path.sep + h;
    try {
      if (fsModule_4.lstatSync(y).isSymbolicLink()) {
        if (n.some((w) => oS(y, w))) return y;
      }
    } catch {
      break;
    }
    s = y;
  }
  return null;
}
//@ chunk-fq0cr76a.js:723793-723803 esm-layout
var d8 = 40;
//@ chunk-fq0cr76a.js:723803-724575 esm-fingerprint
function jR(e, n) {
  try {
    return JSe(e);
  } catch {}
  let r = e,
    s = [],
    h = null;
  while (h === null) {
    let dir = path.dirname(r);
    if (dir === r) return null;
    (s.unshift(path.basename(r)), (r = dir));
    try {
      h = JSe(r);
    } catch {}
  }
  let joined = path.join(h, ...s);
  try {
    fsModule_4.readlinkSync(path.join(h, s[0]));
  } catch {
    return joined;
  }
  let b = "it goes up from too many names that are not there";
  try {
    let S = joined;
    for (let w = 0; w < d8; w++) {
      let { real: real, rest: rest, notThere: notThere } = b8o(S);
      if (notThere?.code === "EACCES") return real || "/";
      let filtered = rest.filter((V) => V !== "" && V !== ".");
      if (filtered[1] !== "..") return [real, ...filtered.slice(0, 2)].join("/") || "/";
      (n?.push(`${real}/${filtered[0]}`), (S = [real, ...filtered.slice(2)].join("/")));
    }
  } catch (error) {
    b = error;
  }
  if (n === void 0)
    At(
      `[Sandbox Linux] Where a write to ${e} would land cannot be settled: ${b}. The link on the way is masked instead, which can keep the sandbox from starting.`,
      { level: "warn" },
    );
  return null;
}
//@ chunk-fq0cr76a.js:724575-724734 esm-fingerprint
function f8(e) {
  let parts = e.split(path.sep),
    r = "";
  for (let s of parts) {
    if (!s) continue;
    let h = r + path.sep + s;
    try {
      if (!fsModule_4.statSync(h).isDirectory()) return h;
    } catch {
      break;
    }
    r = h;
  }
  return;
}
//@ chunk-fq0cr76a.js:724734-724867 esm-fingerprint
function p8(e) {
  let parts = e.split(path.sep),
    r = "";
  for (let s of parts) {
    if (!s) continue;
    let h = r + path.sep + s;
    if (!fsModule_4.existsSync(h)) return h;
    r = h;
  }
  return e;
}
//@ chunk-fq0cr76a.js:724867-724874 esm-layout
var Is;
//@ chunk-fq0cr76a.js:724874-724980 esm-fingerprint
(function (e) {
  ((e.File = "file"), (e.Directory = "directory"), (e.Held = "held"), (e.Unmakeable = "unmakeable"));
})(Is || (Is = {}));
//@ chunk-fq0cr76a.js:724980-725007 esm-fingerprint
var h8 = 2097152,
  m8 = 16914839;
//@ chunk-fq0cr76a.js:725007-725796 esm-fingerprint
function g8(e, n) {
  let r = (h) => {
      try {
        h();
        return;
      } catch (error) {
        let code = error.code;
        if (code === "EACCES" || code === "EPERM" || code === "EROFS") return code;
        throw error;
      }
    },
    s;
  try {
    s = fsModule_4.openSync(
      path.dirname(e),
      h8 | fsModule_4.constants.O_NOFOLLOW | fsModule_4.constants.O_DIRECTORY,
    );
    let h = `/proc/self/fd/${s}`;
    if (fsModule_4.readlinkSync(h) !== path.dirname(e)) return n;
    let { uid: uid, mode: mode } = fsModule_4.fstatSync(s),
      S = r(() => fsModule_4.accessSync(h, fsModule_4.constants.W_OK | fsModule_4.constants.X_OK));
    if (fsModule_4.statfsSync(h).type !== m8)
      return S === void 0 || (S === "EACCES" && uid === process.geteuid?.()) ? n : Is.Unmakeable;
    if (S === void 0) {
      let w = `${h}/${path.basename(e)}`;
      if (n === Is.File && r(() => fsModule_4.closeSync(fsModule_4.openSync(w, "wx", 292))) === void 0)
        return Is.File;
      if (r(() => fsModule_4.mkdirSync(w)) === void 0) return Is.Directory;
    }
    return r(() => fsModule_4.chmodSync(h, mode & 4095)) === void 0 ? n : Is.Unmakeable;
  } catch {
    return n;
  } finally {
    if (s !== void 0) fsModule_4.closeSync(s);
  }
}
//@ chunk-fq0cr76a.js:725796-725803 esm-layout
var hc;
//@ chunk-fq0cr76a.js:725803-725887 esm-fingerprint
(function (e) {
  ((e.Directory = "directory"), (e.File = "file"), (e.Absent = "absent"));
})(hc || (hc = {}));
//@ chunk-fq0cr76a.js:725887-725987 esm-fingerprint
function y8(e) {
  try {
    return fsModule_4.statSync(e).isDirectory() ? hc.Directory : hc.File;
  } catch {
    return hc.Absent;
  }
}
//@ chunk-fq0cr76a.js:725987-726260 esm-fingerprint
function jE(e = !1) {
  let cwd = process.cwd(),
    r = [...dsr.map((y) => path.resolve(cwd, y)), ...csr().map((y) => path.resolve(cwd, y))],
    resolved = path.resolve(cwd, ".git"),
    h = y8(resolved);
  if (h === hc.File) r.push(resolved);
  if (h === hc.Directory) {
    if ((r.push(path.resolve(cwd, ".git/hooks")), !e)) r.push(path.resolve(cwd, ".git/config"));
  }
  return r;
}
//@ chunk-fq0cr76a.js:726260-726787 esm-fingerprint
function b8(e, n, r) {
  let s = [],
    h = new Set();
  for (let y of e.split(`
`)) {
    let b = y.startsWith("rg: ") ? y.slice(4) : y;
    for (let index = b.indexOf(": "); index !== -1; index = b.indexOf(": ", index + 1))
      for (
        let resolved = path.resolve(n, b.slice(0, index));
        resolved.startsWith(n + path.sep) && !h.has(resolved);
        resolved = path.dirname(resolved)
      ) {
        h.add(resolved);
        try {
          let lstatSync = fsModule_4.lstatSync(resolved);
          if (!lstatSync.isDirectory() || lstatSync.uid !== process.getuid?.() || JSe(resolved) !== resolved)
            break;
        } catch (error) {
          if (error.code === "EACCES") continue;
          break;
        }
        try {
          fsModule_4.accessSync(resolved, fsModule_4.constants.R_OK | fsModule_4.constants.X_OK);
        } catch {
          if (path.relative(n, resolved).split(path.sep).length <= r) s.push(resolved);
        }
        break;
      }
  }
  return s;
}
//@ chunk-fq0cr76a.js:726787-727833 esm-fingerprint
async function S8(e = { command: "rg" }, n = qE, r = !1, s) {
  let cwd = process.cwd(),
    abortController = new AbortController(),
    b = s ?? abortController.signal,
    S = csr(),
    w = jE(r),
    R = [];
  for (let L of dsr) R.push("--iglob", L);
  for (let L of S) R.push("--iglob", `**/${L}/**`);
  if ((R.push("--iglob", "**/.git/hooks/**", "--iglob", "**/.git/HEAD"), !r))
    R.push("--iglob", "**/.git/config");
  let D = [];
  try {
    D = await LR(
      [
        "--files",
        "--hidden",
        "--no-ignore",
        "--no-config",
        "--line-buffered",
        "--max-depth",
        String(n + 1),
        ...R,
        "-g",
        "!**/node_modules/**",
      ],
      cwd,
      b,
      e,
    );
  } catch (error) {
    if ((b.throwIfAborted(), error instanceof RipgrepError))
      ((D = error.listed), w.push(...b8(error.stderr, cwd, n)));
    At(`[Sandbox] ripgrep scan failed: ${error}`, { level: "warn" });
  }
  let mapped = [...S, ".git/hooks", ".git/config", ".git/HEAD"].map((L) => Mqt(L).split("/"));
  for (let L of D) {
    let parts = path.relative(cwd, path.resolve(cwd, L)).split(path.sep),
      mapped_2 = parts.map(Mqt),
      q = parts.length - 1,
      Z = 1,
      J = n - 1;
    e: for (let ae = 0; ae < mapped_2.length; ae++)
      for (let Se of mapped)
        if (Se.every((ue, me) => mapped_2[ae + me] === ue)) {
          ((q = ae), (Z = Se.length), (J = n - 2));
          break e;
        }
    if (q > J) continue;
    let sliced = parts.slice(0, q + Z);
    if (mapped_2[q] === ".git" && mapped_2[q + 1] === "head") sliced[q + 1] = "hooks";
    w.push(path.join(cwd, ...sliced));
  }
  return [...new Set(w)];
}
//@ chunk-fq0cr76a.js:727833-727851 esm-layout
var $E = new Set(),
  ni;
//@ chunk-fq0cr76a.js:727851-728223 esm-fingerprint
function E8() {
  if (ni !== void 0) {
    try {
      let lstatSync = fsModule_4.lstatSync(ni);
      if (
        lstatSync.isDirectory() &&
        lstatSync.uid === process.getuid?.() &&
        (lstatSync.mode & 63) === 0 &&
        fsModule_4.readdirSync(ni).length === 0
      )
        return ni;
    } catch {}
    At(
      `[Sandbox Linux] Not reusing the empty-directory mount source, it is gone or no longer our own empty directory: ${ni}`,
    );
  }
  return (
    (ni = fsModule_4.mkdtempSync(path.join(tmpdir_4(), "claude-empty-"))),
    fsModule_4.chmodSync(ni, 448),
    ni
  );
}
//@ chunk-fq0cr76a.js:728223-728243 esm-layout
var j6r = 31,
  YR,
  ZR = !1;
//@ chunk-fq0cr76a.js:728243-728598 esm-fingerprint
function W6r(e) {
  let n = YR;
  if (n === void 0) {
    let r = "has no CapBnd or CapInh line";
    try {
      ((n = x8(fsModule_4.readFileSync("/proc/self/status", "utf8"))), (YR = n));
    } catch (error) {
      r = `could not be read (${String(error)})`;
    }
    if (n === void 0) {
      if (!ZR)
        ((ZR = !0),
          At(`[Sandbox Linux] /proc/self/status ${r} - assuming this process holds no capabilities`, {
            level: "warn",
          }));
      return !1;
    }
  }
  return ((n >> BigInt(e)) & 1n) === 1n;
}
//@ chunk-fq0cr76a.js:728598-728760 esm-fingerprint
function x8(e) {
  let match = e.match(/^CapBnd:\s*([0-9a-fA-F]+)\s*$/m),
    match_2 = e.match(/^CapInh:\s*([0-9a-fA-F]+)\s*$/m);
  return match && match_2 ? BigInt("0x" + match[1]) | BigInt("0x" + match_2[1]) : void 0;
}
//@ chunk-fq0cr76a.js:728760-728924 esm-fingerprint
function T3o({ euid: euid, hasSetfcap: hasSetfcap, usesSeccompHelper: usesSeccompHelper }) {
  let s = ["--cap-drop", "ALL"];
  if (euid !== 0) return s;
  if (!hasSetfcap) return s;
  if (usesSeccompHelper) s.push("--cap-add", "CAP_SETFCAP");
  return s;
}
//@ chunk-fq0cr76a.js:728924-729299 esm-layout
var zR = !1,
  VE = `running as uid 0 without CAP_SETFCAP in this process's capability bounding set - on kernels that enforce the CAP_SETFCAP requirement for mapping uid 0 into a user namespace (Linux 5.12 and distribution backports) every sandboxed command fails while writing a uid map ("Operation not permitted"). Grant CAP_SETFCAP to this process, or run as a non-root user`,
  UE;
//@ chunk-fq0cr76a.js:729299-729578 esm-fingerprint
function _8() {
  if (UE === void 0) {
    let n = 4096;
    try {
      let content = fsModule_4.readFileSync("/proc/self/auxv"),
        s = /64|s390x/.test("x64") ? 8 : 4,
        min = Math.min(s, 6),
        y = (b) =>
          endianness() === "BE" ? content.readUIntBE(b + s - min, min) : content.readUIntLE(b, min);
      for (let b = 0; b + 2 * s <= content.length; b += 2 * s)
        if (y(b) === 6) {
          n = y(b + s);
          break;
        }
    } catch {}
    UE = 32 * n;
  }
  return UE;
}
//@ chunk-fq0cr76a.js:729578-729650 esm-fingerprint
var XR = 4096,
  Vf = 9000,
  FE = 9,
  v8 = 4194304 | fsModule_4.constants.O_DIRECTORY,
  YE = new Set();
//@ chunk-fq0cr76a.js:729650-729702 esm-fingerprint
function WE(e) {
  return `/proc/${process.pid}/fd/${e}`;
}
//@ chunk-fq0cr76a.js:729702-730148 esm-fingerprint
function w8(e) {
  let joined = e.map((s) => s + "\x00").join(""),
    r = [];
  for (let s of new Set([tmpdir_4(), "/dev/shm"])) {
    let h;
    try {
      h = fsModule_4.openSync(s, v8 | fsModule_4.constants.O_RDWR, 384);
    } catch (error) {
      r.push(`${s}: ${GE(error)}`);
      continue;
    }
    try {
      (fsModule_4.writeFileSync(h, joined),
        fsModule_4.fchmodSync(h, 256),
        fsModule_4.closeSync(fsModule_4.openSync(WE(h), fsModule_4.constants.O_RDONLY)));
    } catch (error) {
      (r.push(`${s}: ${GE(error)}`), fsModule_4.closeSync(h));
      continue;
    }
    return (YE.add(h), h);
  }
  throw Error(`no unnamed file could be opened for it (${r.join("; ")})`);
}
//@ chunk-fq0cr76a.js:730148-730204 esm-fingerprint
function i1(e) {
  YE.delete(e);
  try {
    fsModule_4.closeSync(e);
  } catch {}
}
//@ chunk-fq0cr76a.js:730204-730265 esm-layout
function GE(e) {
  return e instanceof Error ? e.message : String(e);
}
//@ chunk-fq0cr76a.js:730265-730468 esm-fingerprint
class LinuxSandboxProfileError extends Error {
  constructor(e, n, r) {
    super(n);
    if (((this.name = "LinuxSandboxProfileError"), (this.code = e), r !== void 0))
      Object.defineProperty(this, "cause", { value: r, writable: !0, configurable: !0, enumerable: !1 });
  }
}
//@ chunk-fq0cr76a.js:730468-730617 esm-fingerprint
class WorkingDirectoryChanged extends Error {
  constructor() {
    super("The working directory changed while the command was being wrapped");
    this.name = "WorkingDirectoryChanged";
  }
}
//@ chunk-fq0cr76a.js:730617-732554 esm-fingerprint
function T8(e, n, r) {
  let s = () =>
    `${r.mandatoryDenyArgs} of its arguments are built-in write protection, in no list of the configuration: shell and tool settings and each git repository's hooks and config, in and below the working directory, and the directories holding them. For fewer, run from a directory with fewer repositories in it, or allow writing to fewer of them; a lower mandatoryDenySearchDepth leaves the deeper ones unprotected. The other ${n.length - r.mandatoryDenyArgs} are what the configuration expands to: each path takes about three arguments, each environment variable two`;
  if (n.length > Vf)
    throw new LinuxSandboxProfileError(
      "too_many_arguments",
      `Sandbox profile has ${n.length} bwrap arguments and bwrap accepts at most ${Vf} (about ${Vf / 3} mounts). ${s()}`,
    );
  let sliced = n.slice(r.start, r.end);
  if (sliced.some((L) => L.includes("\x00")))
    throw new LinuxSandboxProfileError(
      "nul_in_path",
      "Sandbox profile contains a path with a NUL byte, which neither a command line nor a file of bwrap arguments can carry",
    );
  let y = zee([e, ...n]),
    byteLength = Buffer.byteLength(y, "utf8"),
    S = _8() - 1;
  if (byteLength <= S - XR) return y;
  let w = `Sandbox profile is too long for the command line (${byteLength} bytes; past ${S - XR} it goes through a file)`;
  if (n.length + 2 > Vf)
    throw new LinuxSandboxProfileError(
      "too_many_arguments",
      `${w} and, passed through a file, would exceed the ${Vf} arguments bwrap accepts. ${s()}`,
    );
  let R;
  try {
    R = w8(sliced);
  } catch (error) {
    throw new LinuxSandboxProfileError(
      "args_file_unavailable",
      `${w} and cannot be passed through a file: ${GE(error)}`,
      error,
    );
  }
  let D = zee([
      "/bin/sh",
      "-c",
      `exec ${FE}<"$1" && shift && exec "$@"`,
      "srt-args",
      WE(R),
      e,
      ...n.slice(0, r.start),
      "--args",
      String(FE),
      ...n.slice(r.end),
    ]),
    byteLength_2 = Buffer.byteLength(D, "utf8");
  if (byteLength_2 > S)
    throw (
      i1(R),
      new LinuxSandboxProfileError(
        "command_too_long",
        `Sandboxed command is too long for one shell argument even with the mounts passed through a file (${byteLength_2} bytes; the limit here is ${S})`,
      )
    );
  return (
    At(
      `[Sandbox Linux] bwrap mounts moved to an unnamed file, read through ${WE(R)} on bwrap's fd ${FE}: the command line would be ${byteLength} bytes as one argument`,
    ),
    D
  );
}
//@ chunk-fq0cr76a.js:732554-732580 esm-layout
var ga = 0,
  Zm = 0,
  o1 = !1,
  JR = !1;
//@ chunk-fq0cr76a.js:732580-732600 esm-layout
function ZE() {
  o1 = !0;
}
//@ chunk-fq0cr76a.js:732600-732678 esm-fingerprint
function A8() {
  if (JR) return;
  (process.on("exit", () => {
    (ZE(), Wf({ force: !0 }));
  }),
    (JR = !0));
}
//@ chunk-fq0cr76a.js:732678-733667 esm-fingerprint
function Wf(e) {
  if (!e?.force) {
    if (ga > 0) ga--;
    if (ga > 0) {
      At(`[Sandbox Linux] Deferring mount point cleanup \u2014 ${ga} sandbox(es) still active`);
      return;
    }
  } else if (o1 && ga > 0) {
    At(
      `[Sandbox Linux] Leaving mount points in place while this process ends \u2014 ${ga} sandbox(es) still active`,
    );
    return;
  }
  if (e?.force) ((ga = 0), Zm++);
  let sorted = [...$E].sort((r, s) => s.length - r.length);
  for (let r of sorted)
    try {
      let stats = fsModule_4.statSync(r);
      if (stats.isFile() && stats.size === 0)
        (fsModule_4.unlinkSync(r), At(`[Sandbox Linux] Cleaned up bwrap mount point (file): ${r}`));
      else if (stats.isDirectory()) {
        if (fsModule_4.readdirSync(r).length === 0)
          (fsModule_4.rmdirSync(r), At(`[Sandbox Linux] Cleaned up bwrap mount point (dir): ${r}`));
      }
    } catch {}
  if (($E.clear(), ni !== void 0))
    try {
      (fsModule_4.rmdirSync(ni),
        At(`[Sandbox Linux] Cleaned up the empty-directory mount source: ${ni}`),
        (ni = void 0));
    } catch (error) {
      let code = error.code;
      if (code === "ENOTEMPTY")
        At(
          `[Sandbox Linux] Left the empty-directory mount source behind, something has written into it: ${ni}`,
        );
      if (code === "ENOENT" || code === "ENOTDIR") ni = void 0;
    }
  for (let r of [...YE]) i1(r);
}
//@ chunk-fq0cr76a.js:733667-733747 esm-fingerprint
function QR(e) {
  try {
    return (fsModule_4.accessSync(e, fsModule_4.constants.X_OK), !0);
  } catch {
    return !1;
  }
}
//@ chunk-fq0cr76a.js:733747-734347 esm-fingerprint
function a1(e) {
  let { seccompConfig: seccompConfig, bwrapPath: bwrapPath, socatPath: socatPath } = e ?? {},
    h = [],
    y = [],
    b = null;
  if (bwrapPath)
    if (QR(bwrapPath)) b = bwrapPath;
    else h.push(`bubblewrap (bwrap) not executable at ${bwrapPath}`);
  else if (((b = ha("bwrap")), b === null)) h.push("bubblewrap (bwrap) not installed");
  if (socatPath) {
    if (!QR(socatPath)) h.push(`socat not executable at ${socatPath}`);
  } else if (ha("socat") === null) h.push("socat not installed");
  if (!seccompConfig?.argv0 && vor(seccompConfig?.applyPath) === null)
    y.push("seccomp not available - unix socket access not restricted");
  let S = N8({ euid: process.geteuid?.(), hasSetfcap: W6r(j6r), bwrap: b });
  if (S !== null) h.push(S);
  let w = I8(b);
  if (w !== null) y.push(w);
  return { warnings: y, errors: h };
}
//@ chunk-fq0cr76a.js:734347-734373 esm-fingerprint
var MIN_COMMAND_VERSION = "0.5.0",
  commandVersionCache = new Map();
/**
 * 同步执行 cmd --version 取版本号（缓存）。
 */
//@ chunk-fq0cr76a.js:734373-734622 esm-fingerprint
function getCommandVersion(e) {
  let n = commandVersionCache.get(e);
  if (n !== void 0) return n;
  let r = spawnSync_2(e, ["--version"], {
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }),
    s = r.error === void 0 && r.status === 0 ? (/\d+(?:\.\d+)*/.exec(r.stdout ?? "")?.[0] ?? null) : null;
  return (commandVersionCache.set(e, s), s);
}
//@ chunk-fq0cr76a.js:734622-734844 esm-fingerprint
function R8(e, n) {
  let r = (y) =>
      y.split(".").map((b) => {
        let int = Number.parseInt(b, 10);
        return Number.isNaN(int) ? 0 : int;
      }),
    s = r(e),
    h = r(n);
  for (let y = 0; y < Math.max(s.length, h.length); y++) {
    let b = (s[y] ?? 0) - (h[y] ?? 0);
    if (b !== 0) return b;
  }
  return 0;
}
//@ chunk-fq0cr76a.js:734844-735149 esm-layout
function I8(e) {
  if (e === null) return null;
  let n = getCommandVersion(e);
  if (n === null || R8(n, MIN_COMMAND_VERSION) >= 0) return null;
  return `bubblewrap ${n} at ${e} is older than ${MIN_COMMAND_VERSION}: a denyRead entry or credential mask naming a path that is not a regular file (a fifo, socket or device node) cannot be applied on it. Everything else is unaffected`;
}
//@ chunk-fq0cr76a.js:735149-735306 esm-fingerprint
function N8({ euid: euid, hasSetfcap: hasSetfcap, bwrap: bwrap }) {
  if (euid !== 0 || hasSetfcap || bwrap === null) return null;
  let s = k8(bwrap);
  if (s === null) return null;
  return s === "" ? VE : `${VE} (bubblewrap: ${s})`;
}
//@ chunk-fq0cr76a.js:735306-735321 esm-layout
var n1 = new Map();
//@ chunk-fq0cr76a.js:735321-735642 esm-fingerprint
function k8(e) {
  let n = n1.get(e);
  if (n !== void 0) return n;
  let r = spawnSync_2(e, ["--unshare-user", "--dev-bind", "/", "/", "true"], {
      timeout: 5000,
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    }),
    s =
      r.error === void 0 && r.status === 0
        ? null
        : ((r.stderr ?? "")
            .split(
              `
`,
            )
            .map((h) => h.trim())
            .find((h) => h.length > 0)
            ?.slice(0, 200) ?? "");
  return (n1.set(e, s), s);
}
//@ chunk-fq0cr76a.js:735642-737365 esm-fingerprint
async function l1(e, n, r) {
  let s = r ?? "socat",
    str = randomBytes_3(8).toString("hex"),
    y = join_5(tmpdir_4(), `claude-http-${str}.sock`),
    b = join_5(tmpdir_4(), `claude-socks-${str}.sock`),
    S = [`UNIX-LISTEN:${y},fork,reuseaddr`, `TCP:localhost:${e},keepalive,keepidle=10,keepintvl=5,keepcnt=3`];
  At(`Starting HTTP bridge: ${s} ${S.join(" ")}`);
  let w = spawn(s, S, { stdio: "ignore" });
  if (
    (w.on("error", (L) => {
      At(`HTTP bridge process error: ${L}`, { level: "error" });
    }),
    w.on("exit", (L, V) => {
      At(`HTTP bridge process exited with code ${L}, signal ${V}`, { level: L === 0 ? "info" : "error" });
    }),
    !w.pid)
  )
    throw Error("Failed to start HTTP bridge process");
  let R, D;
  if (n === e) ((R = w), (D = y));
  else {
    D = b;
    let L = [
      `UNIX-LISTEN:${b},fork,reuseaddr`,
      `TCP:localhost:${n},keepalive,keepidle=10,keepintvl=5,keepcnt=3`,
    ];
    if (
      (At(`Starting SOCKS bridge: ${s} ${L.join(" ")}`),
      (R = spawn(s, L, { stdio: "ignore" })),
      R.on("error", (V) => {
        At(`SOCKS bridge process error: ${V}`, { level: "error" });
      }),
      R.on("exit", (V, K) => {
        At(`SOCKS bridge process exited with code ${V}, signal ${K}`, { level: V === 0 ? "info" : "error" });
      }),
      !R.pid)
    ) {
      if (w.pid)
        try {
          process.kill(w.pid, "SIGTERM");
        } catch {}
      throw Error("Failed to start SOCKS bridge process");
    }
  }
  let O = 5;
  for (let L = 0; L < O; L++) {
    if (!w.pid || w.killed || !R.pid || R.killed) throw Error("Linux bridge process died unexpectedly");
    try {
      if (fsModule_4.existsSync(y) && fsModule_4.existsSync(D)) {
        At(`Linux bridges ready after ${L + 1} attempts`);
        break;
      }
    } catch (error) {
      At(`Error checking sockets (attempt ${L + 1}): ${error}`, { level: "error" });
    }
    if (L === O - 1) {
      if (w.pid)
        try {
          process.kill(w.pid, "SIGTERM");
        } catch {}
      if (R.pid)
        try {
          process.kill(R.pid, "SIGTERM");
        } catch {}
      throw Error(`Failed to create bridge sockets after ${O} attempts`);
    }
    await new Promise((V) => setTimeout(V, L * 100));
  }
  return {
    httpSocketPath: y,
    socksSocketPath: D,
    httpBridgeProcess: w,
    socksBridgeProcess: R,
    httpProxyPort: e,
    socksProxyPort: n,
  };
}
//@ chunk-fq0cr76a.js:737365-737398 esm-fingerprint
var SRT_ALLOW_NESTED_USERNS = "SRT_ALLOW_NESTED_USERNS";
//@ chunk-fq0cr76a.js:737398-737441 esm-layout
function D8(e) {
  return `${SRT_ALLOW_NESTED_USERNS}=${e ? "1" : "0"} `;
}
//@ chunk-fq0cr76a.js:737441-737456 esm-layout
var r1 = new Map();
//@ chunk-fq0cr76a.js:737456-737792 esm-fingerprint
function O8(e) {
  let n = r1.get(e);
  if (n !== void 0) return n;
  let r = !1;
  try {
    if ((fsModule_4.statSync(e).mode & 2048) === 0) {
      let s = spawnSync_2(e, ["--help"], {
          timeout: 5000,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
        }),
        h = `${s.stdout ?? ""}${s.stderr ?? ""}`;
      if (s.error !== void 0 || h.trim() === "") return !1;
      r = h.includes("--disable-userns");
    }
  } catch {
    return !1;
  }
  return (r1.set(e, r), r);
}
//@ chunk-fq0cr76a.js:737792-737802 esm-layout
var s1 = !1;
//@ chunk-fq0cr76a.js:737802-737982 esm-fingerprint
function P8(e, n) {
  if (n) {
    if (!e) throw Error("seccompConfig.argv0 requires seccompConfig.applyPath");
    return `ARGV0=${zee([n])} ${zee([e])} `;
  }
  let r = vor(e);
  return r ? `${zee([r])} ` : void 0;
}
//@ chunk-fq0cr76a.js:737982-738725 esm-fingerprint
var L8 = [
  "_srt_since=",
  'while [ -r /proc/net/sockstat ] && kill -0 "$_srt_http" "$_srt_socks" 2>/dev/null; do',
  "  _srt_up=0",
  "  for _srt_counts in /proc/net/sockstat /proc/net/sockstat6; do",
  '    [ -r "$_srt_counts" ] || continue',
  "    while read -r _srt_kind _srt_skip _srt_inuse _srt_skip; do",
  '      case "$_srt_kind" in TCP: | TCP6:) _srt_up=$((_srt_up + _srt_inuse)); break ;; esac',
  '    done < "$_srt_counts"',
  "  done",
  '  [ "$_srt_up" -lt 2 ] || break',
  "  read -r _srt_now _srt_skip 2>/dev/null < /proc/uptime || break",
  "  _srt_now=1${_srt_now%.*}${_srt_now#*.}",
  '  [ "$((_srt_now - ${_srt_since:=$_srt_now}))" -lt 30 ] || break',
  "done",
  "unset _srt_since _srt_now _srt_up _srt_counts _srt_kind _srt_skip _srt_inuse _srt_http _srt_socks",
];
//@ chunk-fq0cr76a.js:738725-739277 esm-fingerprint
function B8(e, n, r, s, h, y) {
  let b = h || "bash",
    S = zee([y ?? "socat"]),
    w = "fork,reuseaddr,backlog=4096",
    R = (O, L) =>
      `{ ${S} TCP6-LISTEN:${O},ipv6only=0,fork,reuseaddr,backlog=4096 UNIX-CONNECT:${L} || exec ${S} TCP4-LISTEN:${O},fork,reuseaddr,backlog=4096 UNIX-CONNECT:${L}; } >/dev/null 2>&1 &`,
    D = [
      R(3128, e),
      "_srt_http=$!",
      R(1080, n),
      "_srt_socks=$!",
      "trap 'rc=$?; kill %1 %2 2>/dev/null; exit $rc' EXIT",
      ...L8,
    ];
  if (s) {
    let O = s + zee([b, "-c", r]),
      joined = [...D, O].join(`
`);
    return `${b} -c ${zee([joined])}`;
  } else {
    let joined = [...D, `eval ${zee([r])}`].join(`
`);
    return `${b} -c ${zee([joined])}`;
  }
}
//@ chunk-fq0cr76a.js:739277-739379 esm-fingerprint
function U8(e) {
  let n = e?.code;
  return n === "EIO" || n === "ESTALE" || n === "EMFILE" || n === "ENFILE" || n === "EAGAIN";
}
//@ chunk-fq0cr76a.js:739379-739447 esm-layout
function ME(e) {
  try {
    return e();
  } catch (error) {
    if (!U8(error)) throw error;
  }
  return e();
}
//@ chunk-fq0cr76a.js:739447-739478 esm-fingerprint
var u1 = ["/proc", "/dev", "/sys"];
//@ chunk-fq0cr76a.js:739478-740085 esm-fingerprint
function F8(e, n) {
  let { rootIsWriteRoot: rootIsWriteRoot } = n,
    s = new Set(),
    h = new Set(),
    y = new Set();
  for (let S of e) {
    if (rootIsWriteRoot && u1.some((w) => oS(S, w))) continue;
    for (
      let dir = path.dirname(S);
      dir !== "/" && !y.has(dir) && n.isWithinAllowedWrite(dir);
      dir = path.dirname(dir)
    ) {
      if ((y.add(dir), rootIsWriteRoot)) {
        if (path.dirname(dir) === "/") {
          h.add(dir);
          continue;
        }
      } else if (n.isAllowedWriteRoot(dir)) continue;
      try {
        fsModule_4.statSync(dir);
      } catch (error) {
        if (R4e(error)) continue;
      }
      s.add(dir);
    }
  }
  let b = [...h];
  if (b.length > 0) At(`[Sandbox Linux] Covering the pinned ancestors under: ${b.join(", ")}`);
  return [
    ...[...s].sort((S, w) => S.split("/").length - w.split("/").length).flatMap((S) => ["--ro-bind", S, S]),
    ...b.flatMap((S) => ["--bind", S, S]),
  ];
}
//@ chunk-fq0cr76a.js:740085-741269 esm-fingerprint
function M8(e, n) {
  let { landing: landing, allowedWritePaths: allowedWritePaths, readAllowPaths: readAllowPaths } = n;
  e.push("--tmpfs", landing);
  let y = (w) => {
      let nameLocation = n.nameLocation(w);
      if (!oS(nameLocation, landing)) return;
      let { canonical: canonical, resolved: resolved } = n.resolve(w);
      if (!resolved) {
        At(
          `[Sandbox Linux] Not restoring ${w} over denyRead tmpfs ${landing}: nothing there resolves (absent, dangling or unreadable), so the only source available is the name itself`,
          { level: "warn" },
        );
        return;
      }
      if (!oS(canonical, landing)) {
        At(
          `[Sandbox Linux] Not restoring ${w} over denyRead tmpfs ${landing}: it resolves outside it, to ${canonical}`,
          { level: "warn" },
        );
        return;
      }
      if (canonical !== nameLocation) {
        let denialAround = n.readDenialAround(canonical);
        if (denialAround !== void 0) {
          At(
            `[Sandbox Linux] Not restoring ${w} over denyRead tmpfs ${landing}: it resolves to ${canonical}, and the read section denies or masks ${denialAround}`,
            { level: "warn" },
          );
          return;
        }
      }
      return { source: canonical, dest: nameLocation };
    },
    b = [];
  for (let w of allowedWritePaths) {
    let R = y(w);
    if (R === void 0) continue;
    (e.push("--bind", R.source, R.dest),
      b.push(R),
      At(`[Sandbox Linux] Re-bound write path wiped by denyRead tmpfs: ${w}`));
  }
  let S = [];
  for (let w of readAllowPaths) {
    let R = y(w);
    if (R === void 0) continue;
    if (b.some((D) => oS(R.dest, D.dest))) continue;
    (e.push("--ro-bind", R.source, R.dest),
      S.push(R),
      At(`[Sandbox Linux] Re-allowed read access within denied region: ${w}`));
  }
  return { restoredWrites: b, restoredReads: S };
}
//@ chunk-fq0cr76a.js:741269-752374 esm-fingerprint
async function $8(e, n, r, s, h = { command: "rg" }, y = qE, b = !1, S) {
  let w = [],
    R = xwn(),
    D = [],
    O = [],
    L = 1 / 0,
    V = new Map(),
    K = new Set(),
    q = new Map(),
    Z = new Set(),
    J,
    ie = new Map(),
    ae = new Set(),
    Se = new Set(),
    ue = (ze) => {
      let ot = ie.get(ze);
      if (ot === void 0) {
        try {
          ot = ME(() => JSe(ze));
        } catch (error) {
          if (((ot = ze), Se.add(ze), !R4e(error)))
            (ae.add(ze),
              At(
                `[Sandbox Linux] Where ${ze} really is cannot be told, so what is mounted for it is mounted on this spelling, which bubblewrap may refuse: ${error}`,
                { level: "warn" },
              ));
        }
        ie.set(ze, ot);
      }
      return ot;
    },
    me = (ze) => ({ canonical: ue(ze), resolved: !Se.has(ze) }),
    Ne = (ze) => {
      let ot = ue(ze);
      return ot === ze ? [ze] : [ze, ot];
    },
    Ce = (ze) => F3r(ze, ue),
    Ie = (ze) => D.some((ot) => oS(ze, ot)),
    he = (ze) => Ie(ze) || D.some((ot) => zot(ot, ze)),
    ft = (ze) => D.includes(ze),
    rt,
    ut = () => rt ?? (rt = (e?.allowWithinDeny || []).map((ze) => sS(ze, { literal: !0 }))),
    we,
    Ae = () => we ?? (we = (e?.ownAllowWithinDeny ?? []).map((ze) => sS(ze, { literal: !0 }))),
    dt = new Set(e?.credentialDenyOnly),
    Me = (ze) => (ze ? Ae() : ut()),
    Ft = (ze) => {
      for (let ot = ze; ; ot = path.dirname(ot)) {
        if (ot === "/" && ot !== ze) return;
        try {
          let gn = ME(() => fsModule_4.statSync(ot));
          return { path: ot, isDirectory: gn.isDirectory(), isStandIn: ot !== ze };
        } catch (error) {
          if (R4e(error) || ot === "/") return;
        }
      }
    },
    xn = (ze) => {
      let ot = Ft(ze);
      if (ot === void 0) return;
      let gn = ue(ot.path);
      if (gn !== "/")
        return { landing: gn, named: ot.path, isDirectory: ot.isDirectory, isStandIn: ot.isStandIn };
      let vn = ue(path.dirname(ot.path));
      if (vn === "/") return;
      return { landing: vn, named: ot.path, isDirectory: !0, isStandIn: !0 };
    },
    mt,
    Mt = () => {
      if (mt !== void 0) return mt;
      if (!e) return [];
      let ze = [];
      for (let ot of e.denyOnly || []) {
        if (sS(ot, { literal: !0 }) !== "/") {
          ze.push(ot);
          continue;
        }
        let gn = ME(() => fsModule_4.readdirSync("/")),
          vn = dt.has(ot);
        for (let pr of gn) {
          if (u1.includes(`/${pr}`)) continue;
          let dr = ue("/" + pr);
          if (Me(vn).some(($s) => oS(dr, Ce($s)))) {
            At(`[Sandbox Linux] Root deny expansion skips /${pr}: covered by allowRead`);
            continue;
          }
          if ((ze.push("/" + pr), vn)) dt.add("/" + pr);
        }
      }
      if (fsModule_4.existsSync("/etc/ssh/ssh_config.d")) ze.push("/etc/ssh/ssh_config.d");
      return ((mt = ze), ze);
    },
    mn = (ze) => ue(ze).split("/").length,
    Nt,
    Wt = () =>
      Nt ??
      (Nt = Mt()
        .map((ze) => ({ normalizedPath: sS(ze, { literal: !0 }), isCredential: dt.has(ze) }))
        .sort((ze, ot) => mn(ze.normalizedPath) - mn(ot.normalizedPath))
        .map(({ normalizedPath: normalizedPath, isCredential: isCredential }) => {
          let gn = xn(normalizedPath);
          return {
            normalizedPath: normalizedPath,
            mount: gn,
            isCredential: isCredential,
            liftedFile:
              gn !== void 0 && !gn.isDirectory && Me(isCredential).some((vn) => Ce(vn) === gn.landing),
          };
        })),
    gt;
  if (n) {
    w.push("--ro-bind", "/", "/");
    let ze = w.length;
    for (let wn of n.allowOnly || []) {
      let In = sS(wn, { literal: !0 }),
        rn = In === "" ? "" : In.replace(/\/+$/, "") || "/";
      if ((At(`[Sandbox Linux] Processing write path: ${wn} -> ${rn}`), rn.startsWith("/dev/"))) {
        At(`[Sandbox Linux] Skipping /dev path: ${rn}`);
        continue;
      }
      if (!fsModule_4.existsSync(rn)) {
        At(`[Sandbox Linux] Skipping non-existent write path: ${rn}`);
        continue;
      }
      try {
        let sn = JSe(rn),
          replaced = rn.replace(/\/+$/, "");
        if (sn !== replaced && Pwn(rn, sn)) {
          At(
            `[Sandbox Linux] Skipping symlink write path pointing outside expected location: ${wn} -> ${sn}`,
          );
          continue;
        }
      } catch {
        At(`[Sandbox Linux] Skipping write path that could not be resolved: ${rn}`);
        continue;
      }
      (w.push("--bind", rn, rn), D.push(rn));
    }
    gt = ft("/") ? w.length : ze;
    let ot,
      gn = () => {
        if (ot !== void 0) return ot;
        let wn = (In) => (
          At(
            `[Sandbox Linux] Read-deny prediction unusable (${In}); keeping every deny placeholder, which refuses to start wherever a covering deny directory is read-only: bubblewrap cannot create a placeholder's mount point there`,
            { level: "warn" },
          ),
          { usable: !1 }
        );
        try {
          let flattened = D.flatMap(Ne),
            flattened_2 = Wt().flatMap(({ mount: mount }) => {
              if (!mount?.isDirectory) return [];
              return [...new Set([...Ne(mount.named), mount.landing])].filter((Kn) => Kn !== "/");
            });
          ot =
            ae.size > 0
              ? wn(`no canonical location for ${[...ae].join(", ")}`)
              : {
                  usable: !0,
                  allowedWritePathsBothForms: flattened,
                  prospectiveReadDenyTmpfsDirsBothForms: flattened_2,
                };
        } catch (error) {
          ot = wn(`deriving it threw: ${error}`);
        }
        return ot;
      },
      vn = n.denyWithinAllow || [],
      pr = [...vn, ...(await S8(h, y, b, S))];
    if (xwn() !== R) throw new WorkingDirectoryChanged();
    let dr = new Set(),
      Ti = new Set();
    for (let wn of pr) {
      let In = sS(wn, { literal: !0 });
      if (In.startsWith("/dev/")) continue;
      let rn = jR(In, pr);
      if (rn === null || rn.startsWith("/dev/")) continue;
      for (let Kn of Rwn(rn)) Ti.add(Kn);
      if (BE(rn, D)) continue;
      if (rn !== In) K.add(rn);
      let sn = !1;
      try {
        sn = fsModule_4.statSync(rn).isDirectory();
      } catch {
        continue;
      }
      if (!sn) continue;
      if (he(rn)) {
        let Kn = V.get(rn);
        if (Kn === void 0) ((Kn = new Set()), V.set(rn, Kn));
        Kn.add(In);
      }
    }
    let $s = new Map(),
      Ba = (wn) => {
        let In = $s.get(wn);
        if (In !== void 0) return In;
        let rn = gn(),
          sn =
            !rn.usable ||
            rn.allowedWritePathsBothForms.some(
              (allowedWritePathsBothForm) =>
                zot(allowedWritePathsBothForm, wn) &&
                rn.prospectiveReadDenyTmpfsDirsBothForms.some((prospectiveReadDenyTmpfsDirsBothForm) =>
                  oS(allowedWritePathsBothForm, prospectiveReadDenyTmpfsDirsBothForm),
                ),
            ) ||
            rn.prospectiveReadDenyTmpfsDirsBothForms.some((prospectiveReadDenyTmpfsDirsBothForm) =>
              [wn, ...(V.get(wn) ?? [])].some((Cr) => oS(Cr, prospectiveReadDenyTmpfsDirsBothForm)),
            );
        return ($s.set(wn, sn), sn);
      },
      po = [...V.keys()],
      filtered = D.filter((wn) => !po.some((In) => zot(wn, In))),
      Mc = (wn) => {
        let In = !1;
        for (let rn of po) {
          if (!zot(wn, rn)) continue;
          if (Ba(rn)) {
            if (rn === "/") {
              let sn = gn();
              if (
                sn.usable &&
                !sn.prospectiveReadDenyTmpfsDirsBothForms.some((prospectiveReadDenyTmpfsDirsBothForm) =>
                  oS(wn, prospectiveReadDenyTmpfsDirsBothForm),
                )
              )
                In = !0;
              continue;
            }
            return !1;
          }
          In = !0;
        }
        return In;
      },
      Ua = new Set(),
      Fa = (wn) => [wn, ...Rwn(wn)].find((In) => Ua.has(In)),
      $c = (wn) => {
        let In = (Rs) => {
            At(`[Sandbox Linux] No placeholder for non-existent deny path ${wn}: ${Rs}`);
            return;
          },
          rn = Fa(wn);
        if (rn !== void 0) return In(`decided with ${rn}`);
        if (!filtered.some((Rs) => oS(wn, Rs)) || Mc(wn)) return In("it is read-only there");
        let sn = f8(path.dirname(wn));
        if (sn !== void 0) {
          if (dr.has(sn)) return In(`${sn} is denied itself`);
          if (!filtered.some((Rs) => oS(path.dirname(sn), Rs)))
            return In(`${sn} is a file, in a directory that is read-only`);
          return (dr.add(sn), Ua.add(sn), { dest: sn, kind: Is.Held });
        }
        let Kn = p8(wn);
        Ua.add(Kn);
        let Cr = g8(Kn, Ti.has(Kn) ? Is.Directory : Is.File);
        if (Cr === Is.Unmakeable) Z.add(Kn);
        else ($E.add(Kn), A8());
        return { dest: Kn, kind: Cr };
      },
      ho = ({ dest: dest, kind: kind }) => {
        switch (kind) {
          case Is.Held:
            return dest;
          case Is.Directory:
            return J ?? (J = E8());
          case Is.File:
            return "/dev/null";
          case Is.Unmakeable:
            return "/dev/null";
        }
      };
    for (let [wn, In] of pr.entries()) {
      if (wn === vn.length) L = O.length;
      let rn = sS(In, { literal: !0 });
      if (rn.startsWith("/dev/")) continue;
      let sn = jR(rn);
      if (sn === null) {
        let Cr = BE(rn, D);
        if (Cr && !dr.has(Cr)) (dr.add(Cr), O.push("--ro-bind", "/dev/null", Cr), q.set(Cr, rn));
        At(`[Sandbox Linux] Deny path could not be resolved through symlinks, failing closed: ${rn}`);
        continue;
      }
      if (sn !== rn) At(`[Sandbox Linux] Resolved symlinked deny path: ${rn} -> ${sn}`);
      if (sn.startsWith("/dev/")) continue;
      if (dr.has(sn)) continue;
      dr.add(sn);
      let Kn = BE(sn, D);
      if (Kn) {
        if (!dr.has(Kn)) (dr.add(Kn), O.push("--ro-bind", "/dev/null", Kn), q.set(Kn, rn));
        At(`[Sandbox Linux] Mounted /dev/null at symlink ${Kn} to prevent symlink replacement attack`);
        continue;
      }
      if (Fa(sn) !== void 0 || !fsModule_4.existsSync(sn)) {
        let Cr = $c(sn);
        if (Cr !== void 0) {
          let { dest: dest, kind: kind } = Cr,
            $a = ho(Cr);
          (O.push("--ro-bind", $a, dest),
            q.set(dest, rn),
            At(
              kind === Is.Unmakeable
                ? `[Sandbox Linux] No mount point at ${dest}, which neither bubblewrap nor the command can create, for ${sn}`
                : `[Sandbox Linux] Mounted ${$a} at ${dest} to block creation of ${sn}`,
            ));
        }
        continue;
      }
      if (he(sn)) {
        if (!K.has(sn) && Mc(sn)) {
          At(`[Sandbox Linux] Skipping deny path already under read-only denied directory: ${sn}`);
          continue;
        }
        for (let Cr of D)
          if (zot(Cr, sn))
            At(`[Sandbox Linux] Write deny ${sn} covers allowed write path ${Cr}; ${Cr} will be read-only`, {
              level: "warn",
            });
        (O.push("--ro-bind", sn, sn), q.set(sn, rn));
      } else At(`[Sandbox Linux] Skipping deny path not within allowed paths: ${sn}`);
    }
  } else (w.push("--bind", "/", "/"), D.push("/"), (gt = w.length));
  let jt = [],
    Rn = [],
    Xe = (ze, ot) => {
      let gn = (pr) => pr.some((dr) => oS(ze, dr.dest)),
        vn = !1;
      for (let pr of jt) {
        if (oS(ze, pr.landing)) vn = !0;
        if (gn(pr.restoredWrites) || (ot === "writes and reads" && gn(pr.restoredReads))) vn = !1;
      }
      return vn;
    },
    nn = new Set(e?.unlistableDenyDirs ?? []),
    Je = new Map();
  for (let { realPath: realPath, fakePath: fakePath } of r ?? []) Je.set(ue(realPath), fakePath);
  let vt = new Set(Je.keys()),
    Lt = [
      ...Wt().flatMap(({ mount: mount, liftedFile: liftedFile }) =>
        mount === void 0 || liftedFile ? [] : [mount.landing],
      ),
      ...Je.keys(),
    ],
    ln = (ze, ot) => Lt.find((gn) => !oS(ot, gn) && (oS(gn, ze) || oS(ze, gn))),
    flattened = Wt().flatMap(({ mount: mount, isCredential: isCredential }) =>
      mount !== void 0 && isCredential ? [mount.landing] : [],
    ),
    kn = new Set(),
    zr = (ze) => {
      let found = flattened.find((gn) => oS(Ce(ze), gn));
      if (found !== void 0 && !kn.has(ze))
        (kn.add(ze),
          At(`[Sandbox Linux] ${ze} is at or beneath the credential deny ${found}: not bound back`, {
            level: "warn",
          }));
      return found === void 0;
    },
    filtered = ut().filter((ze) => Ae().includes(ze) || zr(ze)),
    filtered_2 = D.filter(zr);
  for (let { normalizedPath: normalizedPath, mount: mount, liftedFile: liftedFile } of Wt()) {
    if (mount === void 0) {
      At(
        `[Sandbox Linux] Read deny path mounts nothing this wrap can place (absent, or uninspectable, or a link to '/' with nothing but '/' holding it): ${normalizedPath}`,
      );
      continue;
    }
    let { landing: landing, isDirectory: isDirectory, isStandIn: isStandIn } = mount;
    if (Xe(landing, "writes and reads")) {
      At(`[Sandbox Linux] Skipping read deny already hidden by a denyRead tmpfs: ${landing}`);
      continue;
    }
    if (isDirectory) {
      if (isStandIn)
        At(
          `[Sandbox Linux] Read deny path ${normalizedPath} cannot be mounted where it names; hiding ${landing} instead`,
          { level: "warn" },
        );
      let Ti = nn.has(normalizedPath) || nn.has(landing);
      if (Ti)
        At(
          `[Sandbox Linux] Read-denied directory could not be listed when the glob was expanded; restoring nothing beneath it: ${landing}`,
          { level: "warn" },
        );
      let $s = isStandIn || Ti,
        Ba = M8(w, {
          landing: landing,
          allowedWritePaths: $s ? [] : filtered_2,
          readAllowPaths: $s ? [] : filtered,
          resolve: me,
          readDenialAround: (po) => ln(po, landing),
          nameLocation: Ce,
        });
      jt.push({ landing: landing, ...Ba });
    } else {
      if (liftedFile) {
        At(`[Sandbox Linux] Skipping read deny for re-allowed path: ${normalizedPath}`);
        continue;
      }
      if (vt.has(landing)) {
        At(
          `[Sandbox Linux] Skipping read deny at a destination a file mask already covers: ${normalizedPath} -> ${landing}`,
        );
        continue;
      }
      (vt.add(landing),
        w.push("--ro-bind", "/dev/null", landing),
        Rn.push({ source: "/dev/null", landing: landing }));
    }
  }
  for (let [ze, ot] of Je) (w.push("--ro-bind", ot, ze), Rn.push({ source: ot, landing: ze }));
  let ta = F8([...q.keys(), ...Rn.map((ze) => ze.landing), ...jt.map((ze) => ze.landing)], {
    rootIsWriteRoot: ft("/"),
    isWithinAllowedWrite: Ie,
    isAllowedWriteRoot: ft,
  });
  w.splice(gt, 0, ...ta);
  let La = new Set(ta),
    na = new Set();
  for (let ze = L; ze < O.length; ze += 3)
    for (let dir = path.dirname(O[ze + 2]); dir !== "/" && !na.has(dir); dir = path.dirname(dir))
      if (La.has(dir)) na.add(dir);
  let Fc = 3 * na.size,
    qi = [],
    wi = new Set();
  for (let ze = 0; ze < O.length; ze += 3) {
    let ot = O[ze + 2];
    if (Z.has(ot)) continue;
    let gn = q.get(ot) ?? ot;
    if (Rn.some((vn) => vn.landing === ot)) continue;
    if (Xe(ot, "writes")) {
      At(`[Sandbox Linux] Skipping denyWrite bind already hidden by denyRead tmpfs: ${ot}`);
      for (let vn of jt)
        for (let restoredWrite of vn.restoredWrites) {
          let dest = restoredWrite.dest;
          if (!oS(dest, ot) && !oS(dest, gn)) continue;
          if (Rn.some((Ti) => Ti.landing === dest)) {
            At(
              `[Sandbox Linux] Leaving a masked file to its mask inside dropped denyWrite bind ${ot}: ${dest}`,
            );
            continue;
          }
          if (wi.has(dest)) continue;
          (wi.add(dest),
            w.push("--ro-bind", restoredWrite.source, dest),
            qi.push(dest),
            At(
              `[Sandbox Linux] Restoring write path read-only inside dropped denyWrite bind ${ot}: ${dest}`,
            ));
        }
      continue;
    }
    if ((w.push(O[ze], O[ze + 1], ot), ze >= L)) Fc += 3;
    if ((qi.push(ot), gn !== ot)) qi.push(gn);
  }
  for (let ze of jt) {
    let found = qi.find((gn) => zot(ze.landing, gn));
    if (found !== void 0) {
      if (
        (At(`[Sandbox Linux] Re-applying denyRead tmpfs re-exposed by denyWrite bind: ${ze.landing}`),
        ze.restoredWrites.length > 0)
      )
        At(
          `[Sandbox Linux] Restoring write paths read-only inside denyWrite bind ${found}: ${ze.restoredWrites.map((restoredWrite) => restoredWrite.dest).join(", ")}`,
        );
      w.push("--tmpfs", ze.landing);
      for (let gn of [...ze.restoredWrites, ...ze.restoredReads]) w.push("--ro-bind", gn.source, gn.dest);
    }
  }
  for (let ze of Rn)
    if (qi.some((ot) => oS(ze.landing, ot)))
      (At(`[Sandbox Linux] Re-applying file mask re-exposed by denyWrite bind: ${ze.landing}`),
        w.push("--ro-bind", ze.source, ze.landing));
  if (s !== void 0) w.push("--ro-bind", s, s);
  if (J !== void 0) w.push("--ro-bind", J, J);
  return { args: w, mandatoryDenyArgs: Fc };
}
//@ chunk-fq0cr76a.js:752374-756340 esm-fingerprint
async function d1(e) {
  let {
      command: command,
      commandId: commandId,
      needsNetworkRestriction: needsNetworkRestriction,
      httpSocketPath: httpSocketPath,
      socksSocketPath: socksSocketPath,
      httpProxyPort: httpProxyPort,
      socksProxyPort: socksProxyPort,
      proxyAuthToken: proxyAuthToken,
      caCertPath: caCertPath,
      javaAgentJarPath: javaAgentJarPath,
      unsetEnvVars: unsetEnvVars,
      setEnvVars: setEnvVars,
      maskedFileBinds: maskedFileBinds,
      maskedFileStoreDir: maskedFileStoreDir,
      enableWeakerNestedSandbox: enableWeakerNestedSandbox,
      allowNestedUserNamespaces: allowNestedUserNamespaces,
      allowAllUnixSockets: allowAllUnixSockets,
      binShell: binShell,
      ripgrepConfig: ripgrepConfig = { command: "rg" },
      mandatoryDenySearchDepth: mandatoryDenySearchDepth = qE,
      allowGitConfig: allowGitConfig = !1,
      gitSafeDirectories: gitSafeDirectories,
      seccompConfig: seccompConfig,
      bwrapPath: bwrapPath,
      socatPath: socatPath,
      observeSocketPath: observeSocketPath,
      abortSignal: abortSignal,
    } = e,
    rt = Xw(e.readConfig),
    ut = Jw(e.writeConfig),
    we = (rt && rt.denyOnly.length > 0) || (maskedFileBinds !== void 0 && maskedFileBinds.length > 0),
    Ae = ut !== void 0,
    dt =
      (unsetEnvVars !== void 0 && unsetEnvVars.length > 0) ||
      (setEnvVars !== void 0 && Object.keys(setEnvVars).length > 0),
    Me = (gitSafeDirectories?.length ?? 0) > 0;
  if (!needsNetworkRestriction && !we && !Ae && !dt && !Me) return command;
  ga++;
  let Ft = Zm,
    xn = QSe(ITt(command, commandId)),
    mt = ["--new-session", "--die-with-parent"],
    Mt;
  try {
    if (!allowAllUnixSockets)
      if (((Mt = P8(seccompConfig?.applyPath, seccompConfig?.argv0)), !Mt))
        At(
          "[Sandbox Linux] apply-seccomp binary not available - unix socket blocking disabled. Install @anthropic-ai/sandbox-runtime globally for full protection.",
          { level: "warn" },
        );
      else
        ((Mt = D8(allowNestedUserNamespaces === !0) + Mt),
          At("[Sandbox Linux] Applying seccomp filter for Unix socket blocking"));
    else At("[Sandbox Linux] Skipping seccomp filter - allowAllUnixSockets is enabled");
    if (observeSocketPath && Mt)
      if (fsModule_4.existsSync(observeSocketPath))
        (mt.push("--bind", observeSocketPath, observeSocketPath),
          mt.push("--setenv", "SRT_OBSERVE_SOCK", observeSocketPath),
          mt.push("--setenv", "SRT_ENCODED_CMD", xn));
      else
        At(
          "[Sandbox Linux] observe socket missing \u2014 supervisor not running; " +
            "continuing without violation monitoring",
        );
    if (dt) {
      for (let Lt of unsetEnvVars ?? []) mt.push("--unsetenv", Lt);
      for (let [Lt, ln] of Object.entries(setEnvVars ?? {})) mt.push("--setenv", Lt, ln);
    }
    if (gitSafeDirectories && gitSafeDirectories.length > 0) {
      let Lt = B3r({ safeDirs: gitSafeDirectories, unsetEnvVars: unsetEnvVars, setEnvVars: setEnvVars });
      for (let [ln, Zt] of Object.entries(Lt)) mt.push("--setenv", ln, Zt);
    }
    if (needsNetworkRestriction) {
      if ((mt.push("--unshare-net"), httpSocketPath && socksSocketPath)) {
        if (!fsModule_4.existsSync(httpSocketPath))
          throw Error(
            `Linux HTTP bridge socket does not exist: ${httpSocketPath}. The bridge process may have died. Try reinitializing the sandbox.`,
          );
        if (!fsModule_4.existsSync(socksSocketPath))
          throw Error(
            `Linux SOCKS bridge socket does not exist: ${socksSocketPath}. The bridge process may have died. Try reinitializing the sandbox.`,
          );
        if ((mt.push("--bind", httpSocketPath, httpSocketPath), socksSocketPath !== httpSocketPath))
          mt.push("--bind", socksSocketPath, socksSocketPath);
        let Lt = Vot(3128, 1080, caCertPath, proxyAuthToken, ut === void 0, xn);
        mt.push(
          ...Lt.flatMap((Zt) => {
            let index = Zt.indexOf("="),
              sliced = Zt.slice(0, index),
              sliced_2 = Zt.slice(index + 1);
            return ["--setenv", sliced, sliced_2];
          }),
        );
        let ln = Ym({
          agentJarPath: javaAgentJarPath,
          unsetEnvVars: unsetEnvVars,
          inherited: process.env.JAVA_TOOL_OPTIONS,
        });
        if (ln !== void 0) mt.push("--setenv", "JAVA_TOOL_OPTIONS", ln);
        if (httpProxyPort !== void 0)
          mt.push("--setenv", "CLAUDE_CODE_HOST_HTTP_PROXY_PORT", String(httpProxyPort));
        if (socksProxyPort !== void 0)
          mt.push("--setenv", "CLAUDE_CODE_HOST_SOCKS_PROXY_PORT", String(socksProxyPort));
      }
    }
    let { args: args, mandatoryDenyArgs: mandatoryDenyArgs } = await $8(
        rt,
        ut,
        maskedFileBinds,
        maskedFileStoreDir,
        ripgrepConfig,
        mandatoryDenySearchDepth,
        allowGitConfig,
        abortSignal,
      ),
      Wt = mt.length;
    mt.push(...args);
    let gt = { start: Wt, end: mt.length, mandatoryDenyArgs: mandatoryDenyArgs };
    (mt.push("--dev", "/dev"), mt.push("--unshare-pid"));
    let jt = process.geteuid?.(),
      Rn = W6r(j6r);
    if (jt === 0 && !Rn && !zR) ((zR = !0), At(`[Sandbox Linux] ${VE}`, { level: "warn" }));
    if (
      (mt.push("--unshare-user", ...T3o({ euid: jt, hasSetfcap: Rn, usesSeccompHelper: Mt !== void 0 })),
      !enableWeakerNestedSandbox)
    )
      mt.push("--proc", "/proc");
    else mt.push("--bind", "/proc", "/proc");
    if ((mt.push("--unsetenv", SRT_ALLOW_NESTED_USERNS), Mt === void 0 && allowNestedUserNamespaces !== !0)) {
      let Lt = enableWeakerNestedSandbox ? null : (bwrapPath ?? ha("bwrap"));
      if (Lt !== null && O8(Lt)) mt.push("--disable-userns");
      else if (!s1)
        ((s1 = !0),
          At(
            "[Sandbox Linux] no seccomp helper in use, and bubblewrap cannot disable user namespaces (needs 0.8.0 or later, not setuid, and no enableWeakerNestedSandbox) - a sandboxed command that creates one can undo the write denies",
            { level: "warn" },
          ));
    }
    let Xe = binShell || "bash",
      nn = ha(Xe);
    if (!nn) throw Error(`Shell '${Xe}' not found in PATH`);
    if ((mt.push("--", nn, "-c"), needsNetworkRestriction && httpSocketPath && socksSocketPath)) {
      let Lt = B8(httpSocketPath, socksSocketPath, command, Mt, nn, socatPath);
      mt.push(Lt);
    } else if (Mt) {
      let Lt = Mt + zee([nn, "-c", command]);
      mt.push(Lt);
    } else mt.push(command);
    let Je = T8(bwrapPath ?? "bwrap", mt, gt),
      vt = [];
    if (needsNetworkRestriction) vt.push("network");
    if (we || Ae) vt.push("filesystem");
    if (dt) vt.push("env");
    if (Mt) vt.push("seccomp(unix-block)");
    if ((At(`[Sandbox Linux] Wrapped command with bwrap (${vt.join(", ")} restrictions)`), Zm !== Ft)) ga++;
    return Je;
  } catch (error) {
    if (Zm === Ft) Wf();
    throw error;
  }
}
//@ chunk-yf82ynbr.js:10481-10512 esm-fingerprint
var Be = ["/proc", "/sys", "/dev"];

export { T3o, W6r, j6r, ZE, jE, l1, a1, d1, WorkingDirectoryChanged, Wf, Be };
