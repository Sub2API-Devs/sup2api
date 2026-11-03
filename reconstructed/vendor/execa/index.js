/**
 * execa/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (8)
 * attribution: placement 2, esm-layout 1, esm-fingerprint 4, affinity 1
 */
import pe, { default as re, default as Mr, default as No } from "process";
import path, { default as path_2 } from "path";
import { Buffer as jo, Buffer as vo } from "buffer";
import child_process from "child_process";
import { Re } from "../../runtime/bun-runtime.js";
import { WSr } from "../cross-spawn/index.js";
import { Kt } from "../npm-run-path/index.js";
import { enabled, We } from "./lib/verbose.js";
import { Yt } from "./lib/stdio.js";
import { Ue, Ke, ze } from "./lib/command.js";
import { rn, nn, on, en, tn } from "./lib/kill.js";
import { M } from "./lib/error.js";
import { De, Tn } from "./lib/promise.js";
import { Wt } from "../human-signals/build/src/realtime.js";
import { wn, Cn, En, bn } from "./lib/stream.js";
import { sn } from "./lib/pipe.js";

//@ chunk-m4p5zn6n.js:7096-7115 placement
var Rn = Re(WSr(), 1);
//@ chunk-m4p5zn6n.js:7223-7413 placement
function Ce(e) {
  let n =
      typeof e === "string"
        ? `
`
        : `
`.charCodeAt(),
    r = typeof e === "string" ? "\r" : "\r".charCodeAt();
  if (e[e.length - 1] === n) e = e.slice(0, -1);
  if (e[e.length - 1] === r) e = e.slice(0, -1);
  return e;
}
//@ chunk-m4p5zn6n.js:27831-28526 esm-layout
var Do = 1e8,
  Uo = ({
    env: env,
    extendEnv: extendEnv,
    preferLocal: preferLocal,
    localDir: localDir,
    execPath: execPath,
  }) => {
    let u = extendEnv ? { ...pe.env, ...env } : env;
    if (preferLocal) return Kt({ env: u, cwd: localDir, execPath: execPath });
    return u;
  },
  _n = (e, n, r = {}) => {
    let _parse = Rn.default._parse(e, n, r);
    if (
      ((e = _parse.command),
      (n = _parse.args),
      (r = _parse.options),
      (r = {
        maxBuffer: Do,
        buffer: !0,
        stripFinalNewline: !0,
        extendEnv: !0,
        preferLocal: !1,
        localDir: r.cwd || pe.cwd(),
        execPath: pe.execPath,
        encoding: "utf8",
        reject: !0,
        cleanup: !0,
        all: !1,
        windowsHide: !0,
        verbose: enabled,
        ...r,
      }),
      (r.env = Uo(r)),
      (r.stdio = Yt(r)),
      pe.platform === "win32" && path.basename(e, ".exe") === "cmd")
    )
      n.unshift("/q");
    return { file: e, args: n, options: r, parsed: _parse };
  },
  U = (e, n, r) => {
    if (typeof n !== "string" && !jo.isBuffer(n)) return r === void 0 ? void 0 : "";
    if (e.stripFinalNewline) return Ce(n);
    return n;
  };
//@ chunk-m4p5zn6n.js:28526-29569 esm-fingerprint
function WMt(e, n, r) {
  let o = _n(e, n, r),
    s = Ue(e, n),
    u = Ke(e, n);
  (We(u, o.options), rn(o.options));
  let d;
  try {
    d = child_process.spawn(o.file, o.args, o.options);
  } catch (error) {
    let E = new child_process.ChildProcess(),
      reject = Promise.reject(
        M({
          error: error,
          stdout: "",
          stderr: "",
          all: "",
          command: s,
          escapedCommand: u,
          parsed: o,
          timedOut: !1,
          isCanceled: !1,
          killed: !1,
        }),
      );
    return (De(E, reject), E);
  }
  let l = Tn(d),
    f = nn(d, o.options, l),
    p = on(d, o.options, f),
    h = { isCanceled: !1 };
  ((d.kill = en.bind(null, d.kill.bind(d))), (d.cancel = tn.bind(null, d, h)));
  let y = Wt(async () => {
    let [{ error: w, exitCode: E, signal: v, timedOut: A }, H, V, Y] = await wn(d, o.options, p),
      et = U(o.options, H),
      tt = U(o.options, V),
      nt = U(o.options, Y);
    if (w || E !== 0 || v !== null) {
      let rt = M({
        error: w,
        exitCode: E,
        signal: v,
        stdout: et,
        stderr: tt,
        all: nt,
        command: s,
        escapedCommand: u,
        parsed: o,
        timedOut: A,
        isCanceled: h.isCanceled || (o.options.signal ? o.options.signal.aborted : !1),
        killed: d.killed,
      });
      if (!o.options.reject) return rt;
      throw rt;
    }
    return {
      command: s,
      escapedCommand: u,
      exitCode: 0,
      stdout: et,
      stderr: tt,
      all: nt,
      failed: !1,
      timedOut: !1,
      isCanceled: !1,
      killed: !1,
    };
  });
  return (Cn(d, o.options), (d.all = En(d, o.options)), sn(d), De(d, y), d);
}
//@ chunk-m4p5zn6n.js:29569-30299 esm-fingerprint
function B(e, n, r) {
  let o = _n(e, n, r),
    s = Ue(e, n),
    u = Ke(e, n);
  We(u, o.options);
  let d = bn(o.options),
    l;
  try {
    l = child_process.spawnSync(o.file, o.args, { ...o.options, input: d });
  } catch (error) {
    throw M({
      error: error,
      stdout: "",
      stderr: "",
      all: "",
      command: s,
      escapedCommand: u,
      parsed: o,
      timedOut: !1,
      isCanceled: !1,
      killed: !1,
    });
  }
  let f = U(o.options, l.stdout, l.error),
    p = U(o.options, l.stderr, l.error);
  if (l.error || l.status !== 0 || l.signal !== null) {
    let h = M({
      stdout: f,
      stderr: p,
      error: l.error,
      signal: l.signal,
      exitCode: l.status,
      command: s,
      escapedCommand: u,
      parsed: o,
      timedOut: l.error && l.error.code === "ETIMEDOUT",
      isCanceled: !1,
      killed: l.signal !== null,
    });
    if (!o.options.reject) return h;
    throw h;
  }
  return {
    command: s,
    escapedCommand: u,
    exitCode: 0,
    stdout: f,
    stderr: p,
    failed: !1,
    timedOut: !1,
    isCanceled: !1,
    killed: !1,
  };
}
//@ chunk-m4p5zn6n.js:30299-30439 esm-fingerprint
var Bo = ({ input: input, inputFile: inputFile, stdio: stdio }) =>
    input === void 0 && inputFile === void 0 && stdio === void 0 ? { stdin: "inherit" } : {},
  An = (e = {}) => ({ preferLocal: !0, ...Bo(e), ...e });
//@ chunk-m4p5zn6n.js:30439-30740 esm-fingerprint
function $n(e) {
  function n(r, ...o) {
    if (!Array.isArray(r)) return $n({ ...e, ...r });
    let [s, ...u] = ze(r, o);
    return WMt(s, u, An(e));
  }
  return (
    (n.sync = (r, ...o) => {
      if (!Array.isArray(r))
        throw TypeError("Please use $(options).sync`command` instead of $.sync(options)`command`.");
      let [s, ...u] = ze(r, o);
      return B(s, u, An(e));
    }),
    n
  );
}
//@ chunk-m4p5zn6n.js:30740-30752 affinity
var oa = $n();

export { WMt, B };
