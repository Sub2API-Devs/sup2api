/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (8), chunk-r0ads4ty.js (52), chunk-vp5gef34.js (1)
 * attribution: affinity 6, esm-fingerprint 37, esm-layout 18
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import { sep, sep as sep_2, sep as sep_3, join, join as join_2 } from "path";
import { homedir } from "os";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import {
  open,
  open as open_2,
  realpath,
  realpath as realpath_2,
  stat,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readdir,
} from "fs/promises";
import { xTt, X, O, W } from "./glob-pattern.js";
import { JSe } from "../utils/real-path.js";
import { zv } from "../utils/platform.js";
import { At } from "../utils/debug.js";
import { escapeInvalidCharClasses } from "../../../../../src/utils/sandbox/windowsSandbox.js";
import { urlPatternToRegex, countCharInString } from "../../../../../src/utils/stringUtils.js";
import { $c } from "../../../../../src/utils/platformTargets.js";
import { N, Pe, we } from "../../../../../src/memdir/memoryIndex.js";
import { isENOENT } from "../../../../../src/utils/errors.js";

//@ chunk-r0ads4ty.js:3804-3856 esm-fingerprint
function Cwn(e) {
  return xTt(e).slice(0, -1) + "(/.*)?$";
}
//@ chunk-r0ads4ty.js:3856-4006 esm-fingerprint
var dsr = [
    ".gitconfig",
    ".gitmodules",
    ".bashrc",
    ".bash_profile",
    ".zshrc",
    ".zprofile",
    ".profile",
    ".ripgreprc",
    ".mcp.json",
  ],
  oe = [".git", ".vscode", ".idea"];
//@ chunk-r0ads4ty.js:4006-4095 esm-fingerprint
function csr() {
  return [...oe.filter((e) => e !== ".git"), ".claude/commands", ".claude/agents"];
}
//@ chunk-r0ads4ty.js:4095-4134 esm-layout
function Mqt(e) {
  return e.toLowerCase();
}
//@ chunk-r0ads4ty.js:4134-4197 esm-layout
function oS(e, t) {
  return e === t || e.startsWith(t === "/" ? "/" : t + "/");
}
//@ chunk-r0ads4ty.js:4197-4237 esm-layout
function zot(e, t) {
  return e !== t && oS(e, t);
}
//@ chunk-r0ads4ty.js:4237-4350 esm-fingerprint
function* Rwn(e) {
  for (let index = e.lastIndexOf("/"); index > 0; index = e.lastIndexOf("/", index - 1))
    yield e.slice(0, index);
  if (e !== "/") yield "/";
}
//@ chunk-r0ads4ty.js:4350-4421 esm-layout
function Dqt(e) {
  try {
    let t = JSe(e);
    if (t !== e) return [e, t];
  } catch {}
  return [e];
}
//@ chunk-r0ads4ty.js:4421-4522 esm-fingerprint
function F3r(e, t) {
  if (e === "/") return e;
  let r = t(pathModule.dirname(e));
  return `${r === "/" ? "" : r}/${pathModule.basename(e)}`;
}
//@ chunk-r0ads4ty.js:4522-4576 esm-fingerprint
function xwn() {
  try {
    return process.cwd();
  } catch {
    return;
  }
}
//@ chunk-r0ads4ty.js:4576-4674 esm-fingerprint
function R4e(e) {
  let t = e?.code;
  return t === "ENOENT" || t === "ENOTDIR" || t === "ELOOP" || t === "ENAMETOOLONG";
}
//@ chunk-r0ads4ty.js:4674-4763 esm-layout
function Ad(e) {
  return e.includes("*") || e.includes("?") || e.includes("[") || e.includes("]");
}
//@ chunk-r0ads4ty.js:4763-4819 esm-layout
function Jxe(e) {
  return e.includes("*") || e.includes("?");
}
//@ chunk-r0ads4ty.js:4819-4872 esm-fingerprint
function PTt(e) {
  return zv() === "windows" ? Jxe(e) : Ad(e);
}
//@ chunk-r0ads4ty.js:4872-5121 esm-layout
function Lqt(e) {
  let t = e;
  if (t === null || typeof t !== "object" || typeof t.path !== "string" || t.path === "" || t.literal !== !0)
    throw TypeError(
      `A filesystem path entry must be a path, or { path, literal: true }; got ${JSON.stringify(e) ?? String(e)}`,
    );
  return t.path;
}
//@ chunk-r0ads4ty.js:5121-5243 esm-fingerprint
function oD(e) {
  if (/^\\\\\?\\unc\\/i.test(e)) return "\\\\" + e.slice(8);
  if (e.startsWith("\\\\?\\")) return e.slice(4);
  return e;
}
//@ chunk-r0ads4ty.js:5243-5337 esm-fingerprint
function Hqt(e) {
  let toNamespacedPath = pathModule.win32.toNamespacedPath(e);
  return /^[\\/]{2}[?.][\\/]unc[\\/]/i.test(toNamespacedPath);
}
//@ chunk-r0ads4ty.js:5337-5388 esm-fingerprint
function uy(e) {
  return e.replace(/\/\*\*$/, "") || "/";
}
//@ chunk-r0ads4ty.js:5388-5901 esm-fingerprint
function Pwn(e, t) {
  let normalized = pathModule.normalize(e),
    normalized_2 = pathModule.normalize(t);
  if (normalized_2 === normalized) return !1;
  if (normalized.startsWith("/tmp/") && normalized_2 === "/private" + normalized) return !1;
  if (normalized.startsWith("/var/") && normalized_2 === "/private" + normalized) return !1;
  if (normalized_2 === "/") return !0;
  if (normalized_2.split("/").filter(Boolean).length <= 1) return !0;
  if (normalized.startsWith(normalized_2 + "/")) return !0;
  let f = normalized;
  if (normalized.startsWith("/tmp/")) f = "/private" + normalized;
  else if (normalized.startsWith("/var/")) f = "/private" + normalized;
  if (f !== normalized && f.startsWith(normalized_2 + "/")) return !0;
  let startsWith = normalized_2.startsWith(normalized + "/"),
    o = f !== normalized && normalized_2.startsWith(f + "/");
  if (!(f !== normalized && normalized_2 === f) && !startsWith && !o) return !0;
  return !1;
}
//@ chunk-r0ads4ty.js:5901-5992 esm-fingerprint
function Nqt(e) {
  if (e === "~") return homedir();
  if (e.startsWith("~/")) return homedir() + e.slice(1);
  return e;
}
//@ chunk-r0ads4ty.js:5992-6165 esm-fingerprint
function Kot(e) {
  let t = homedir(),
    r = /^[A-Za-z]:/.test(t) ? t.slice(0, 2) : "",
    n = r ? t.slice(2) : t;
  return e
    .replace(/%USERPROFILE%/gi, t)
    .replace(/%HOMEDRIVE%/gi, r)
    .replace(/%HOMEPATH%/gi, n);
}
//@ chunk-r0ads4ty.js:6165-6239 esm-fingerprint
function S8o(e) {
  return e.replace(/\/{2,}/g, "/").replace(/\/\.(?=\/)/g, "");
}
//@ chunk-r0ads4ty.js:6239-6453 esm-fingerprint
function z(e) {
  if (zv() !== "windows" && /(?:^|\/)\.\.(?:\/|$)/.test(e))
    At(
      `[Sandbox] "${e}" could not be resolved and still contains a ".." component, so a rule spelled this way may not match.`,
      { level: "warn" },
    );
  return e;
}
//@ chunk-r0ads4ty.js:6453-7151 esm-fingerprint
function sS(e, t) {
  let r = (c) => !t?.literal && PTt(c);
  if (zv() === "windows") {
    if (((e = oD(Kot(e))), /^[a-z]:/.test(e))) e = e[0].toUpperCase() + e.slice(1);
    if (Hqt(e) && !r(e)) return pathModule.win32.normalize(e);
  }
  if (zv() !== "windows" && e.endsWith("/") && !r(e)) e = e.replace(/\/+$/, "") || "/";
  let n = Nqt(e);
  if (n === e && !pathModule.isAbsolute(e)) n = pathModule.resolve(process.cwd(), e);
  if (zv() !== "windows") n = S8o(n);
  if (r(n)) {
    let c = zv() === "windows" ? /[*?]/ : /[*?[\]]/,
      f = n.split(c)[0];
    if (f && f !== "/") {
      let a = f.endsWith("/") ? f.slice(0, -1) : pathModule.dirname(f);
      try {
        let o = JSe(a);
        if (!Pwn(a, o)) {
          let sliced = n.slice(a.length);
          return z(o + sliced);
        }
      } catch {}
    }
    return z(n);
  }
  if (zv() !== "windows" && n !== "") n = n.replace(/\/\.$/, "").replace(/\/+$/, "") || "/";
  try {
    let c = JSe(n);
    if (!Pwn(n, c)) n = c;
  } catch {}
  return z(n);
}
//@ chunk-r0ads4ty.js:7151-7322 esm-fingerprint
var ie = [
    "/dev/stdout",
    "/dev/stderr",
    "/dev/null",
    "/dev/tty",
    "/dev/dtracehelper",
    "/dev/autofs_nowait",
    "/tmp/claude",
    "/private/tmp/claude",
  ],
  te = [".npm/_logs", ".claude/debug"];
//@ chunk-r0ads4ty.js:7322-7448 esm-fingerprint
function BP(e) {
  let t = homedir(),
    r = !e || e.denyRead.length === 0 ? te : ce(t, e.denyRead, e.allowRead);
  return [...ie, ...r.map((n) => pathModule.join(t, n))];
}
//@ chunk-r0ads4ty.js:7448-7780 esm-fingerprint
function ce(e, t, r = []) {
  let n = [...new Set([e, sS(e, { literal: !0 })])],
    mapped = t.map((a) => ae(a)),
    mapped_2 = r
      .flatMap((a) => {
        if (typeof a !== "string") return [Lqt(a)];
        let o = uy(a);
        return PTt(o) ? [] : [o];
      })
      .map((a) => sS(a, { literal: !0 }));
  return te.filter((a) => {
    let mapped_3 = n.map((i) => pathModule.join(i, a));
    return !mapped.some(
      (i) => mapped_3.some(i) && !mapped_2.some((s) => i(s) && mapped_3.some((C) => oS(C, s))),
    );
  });
}
//@ chunk-r0ads4ty.js:7780-7989 esm-fingerprint
function ae(e) {
  if (typeof e !== "string") {
    let n = sS(Lqt(e), { literal: !0 });
    return (c) => oS(c, n);
  }
  let t = uy(e);
  if (PTt(t)) {
    let n = le(sS(t));
    return n === null ? () => !0 : (c) => n.test(c);
  }
  let r = sS(t, { literal: !0 });
  return (n) => oS(n, r);
}
//@ chunk-r0ads4ty.js:7989-8144 esm-fingerprint
function le(e) {
  let t = K.get(e);
  if (t === void 0) {
    try {
      ((t = new RegExp(Cwn(e))), t.test(""));
    } catch {
      t = null;
    }
    if (((Z += e.length), Z > fe)) (K.clear(), (Z = e.length));
    K.set(e, t);
  }
  return t;
}
//@ chunk-r0ads4ty.js:8144-8387 esm-layout
var K = new Map(),
  Z = 0,
  fe = 1048576,
  ue = [
    "NODE_EXTRA_CA_CERTS",
    "SSL_CERT_FILE",
    "CURL_CA_BUNDLE",
    "REQUESTS_CA_BUNDLE",
    "PIP_CERT",
    "GIT_SSL_CAINFO",
    "AWS_CA_BUNDLE",
    "CARGO_HTTP_CAINFO",
    "DENO_CERT",
    "CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE",
    "NIX_SSL_CERT_FILE",
  ];
//@ chunk-r0ads4ty.js:8387-10384 esm-fingerprint
function Vot(e, t, r, n, c, f) {
  let a = he(f),
    o = a === SRT ? a : encodeURIComponent(a),
    i = n ? `${o}:${n}@` : "",
    s = ["SANDBOX_RUNTIME=1"];
  if (!c) {
    let I = process.env.CLAUDE_CODE_TMPDIR || process.env.CLAUDE_TMPDIR || "/tmp/claude";
    s.push(`TMPDIR=${I}`);
  }
  if (r) for (let I of ue) s.push(`${I}=${r}`);
  if (!e && !t) return s;
  let joined = [
    "localhost",
    "127.0.0.1",
    "::1",
    "169.254.0.0/16",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
  ].join(",");
  (s.push(`NO_PROXY=${joined}`), s.push(`no_proxy=${joined}`));
  let w = n ? "127.0.0.1" : "localhost",
    S = n && e === t ? "127.0.0.1" : "localhost";
  if (e) {
    if (
      (s.push(`HTTP_PROXY=http://${i}${w}:${e}`),
      s.push(`HTTPS_PROXY=http://${i}${w}:${e}`),
      s.push(`http_proxy=http://${i}${w}:${e}`),
      s.push(`https_proxy=http://${i}${w}:${e}`),
      n)
    )
      s.push("GIT_CONFIG_PARAMETERS='http.proxyAuthMethod=basic'");
  }
  let A = e ? `http://${i}${w}:${e}` : `socks5h://${i}${S}:${t}`;
  if (
    (s.push(`ALL_PROXY=${A}`),
    s.push(`all_proxy=${A}`),
    s.push(`GRPC_PROXY=${A}`),
    s.push(`grpc_proxy=${A}`),
    t)
  ) {
    let p = zv();
    if (p === "macos" && n && e === t) {
      let buffer = Buffer.from(`${a}:${n}`);
      s.push(
        `SRT_SSH_PROXY_COMMAND=${de(t, buffer.toString("base64"))}`,
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand="/bin/sh -c 'eval \\"\\\${SRT_SSH_PROXY_COMMAND:?unset, but GIT_SSH_COMMAND needs it}\\"' sh '%h' %p"`,
      );
    } else if (p === "macos")
      s.push(
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand='nc -X 5 -x localhost:${t} %h %p'`,
      );
    else if (p === "linux" && e) {
      let E = n ? `,proxyauth=${a}:${n}` : "";
      s.push(
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand='socat - PROXY:${w}:%h:%p,proxyport=${e}${E}'`,
      );
    }
    if (
      (s.push(`FTP_PROXY=socks5h://${i}${S}:${t}`),
      s.push(`ftp_proxy=socks5h://${i}${S}:${t}`),
      s.push(`RSYNC_PROXY=${S}:${t}`),
      s.push(`DOCKER_HTTP_PROXY=http://${i}${e ? w : S}:${e || t}`),
      s.push(`DOCKER_HTTPS_PROXY=http://${i}${e ? w : S}:${e || t}`),
      e)
    ) {
      if (
        (s.push("CLOUDSDK_PROXY_TYPE=http"),
        s.push(`CLOUDSDK_PROXY_ADDRESS=${w}`),
        s.push(`CLOUDSDK_PROXY_PORT=${e}`),
        n)
      )
        (s.push(`CLOUDSDK_PROXY_USERNAME=${a}`), s.push(`CLOUDSDK_PROXY_PASSWORD=${n}`));
    }
  }
  return s;
}
//@ chunk-r0ads4ty.js:10384-10971 esm-layout
function de(e, t, r = "/usr/bin/nc") {
  return `LC_ALL=C; no() { printf "sandbox proxy: %s\\n" "$*" >&2; exit 1; }; case $1 in ""|*[!A-Za-z0-9._:-]*) no bad host;; *:*) set -- "[$1]" "$2";; esac; case $2 in ""|*[!0-9]*) no bad port;; esac; exec 3<&0; { printf "CONNECT %s HTTP/1.1\\r\\nHost: %s\\r\\nProxy-Authorization: Basic ${t}\\r\\n\\r\\n" "$1:$2" "$1:$2"; exec /bin/cat <&3; } | ${r} 127.0.0.1 ${e} | { read -r v why; while read -r v; do case $v in ""|?) break;; esac; done; case $why in "200 "*) exec /bin/cat;; esac; why=\${why%?}; no "$1:$2: \${why:-no answer}"; } & exec >&-; wait $!`;
}
//@ chunk-r0ads4ty.js:10971-10980 esm-layout
var pe = 8;
//@ chunk-r0ads4ty.js:10980-11702 esm-fingerprint
function U3r(e) {
  if (e.baseEnv?.GIT_CONFIG_COUNT === "0") return {};
  let int = Number.parseInt(e.baseEnv?.GIT_CONFIG_COUNT ?? "", 10),
    r = Number.isFinite(int) && int >= 0 ? int : 0,
    n = r,
    c = {},
    f = (o, i) => {
      ((c[`GIT_CONFIG_KEY_${n}`] = o), (c[`GIT_CONFIG_VALUE_${n}`] = i), n++);
    },
    a = [
      ...new Set(
        e.safeDirs
          .filter((safeDir) => !!safeDir)
          .map((o) => {
            let replaced = o.replace(/\\/g, "/").replace(/\/+$/, "");
            if (replaced === "" || /^[A-Za-z]:$/.test(replaced)) return `${replaced}/`;
            return replaced;
          }),
      ),
    ];
  if (a.length > pe) f("safe.directory", "*");
  else for (let o of a) (f("safe.directory", o), f("safe.directory", o.endsWith("/") ? `${o}*` : `${o}/*`));
  if (e.schannelCa) (f("http.schannelUseSSLCAInfo", "true"), f("http.schannelCheckRevoke", "false"));
  if (e.opensslBackend) f("http.sslBackend", "openssl");
  if (n === r) return {};
  return ((c.GIT_CONFIG_COUNT = String(n)), c);
}
//@ chunk-r0ads4ty.js:11702-11894 esm-fingerprint
function B3r(e) {
  let t = { GIT_CONFIG_COUNT: process.env.GIT_CONFIG_COUNT };
  for (let r of e.unsetEnvVars ?? []) delete t[r];
  return (Object.assign(t, e.setEnvVars ?? {}), U3r({ safeDirs: e.safeDirs, baseEnv: t }));
}
//@ chunk-r0ads4ty.js:11894-11906 esm-layout
var w8o = 100;
//@ chunk-r0ads4ty.js:11906-11937 esm-layout
function ITt(e, t) {
  return !t ? e : t;
}
//@ chunk-r0ads4ty.js:11937-12015 esm-fingerprint
function QSe(e) {
  let sliced = e.slice(0, w8o);
  return Buffer.from(sliced).toString("base64");
}
//@ chunk-r0ads4ty.js:12015-12079 esm-fingerprint
function x4e(e) {
  return Buffer.from(e, "base64").toString("utf8");
}
//@ chunk-r0ads4ty.js:12079-12136 esm-fingerprint
var SRT = "srt",
  ne = 255,
  E8o = ne - Buffer.byteLength(`${SRT}.`);
//@ chunk-r0ads4ty.js:12136-12226 esm-layout
function he(e) {
  if (!e) return SRT;
  let t = `${SRT}.${e}`;
  return Buffer.byteLength(t) <= ne ? t : SRT;
}
//@ chunk-r0ads4ty.js:12226-12357 esm-fingerprint
function Iwn(e) {
  if (!e || !e.startsWith(`${SRT}.`)) return;
  let sliced = e.slice(SRT.length + 1);
  if (!sliced || Buffer.byteLength(sliced) > E8o) return;
  return sliced;
}
//@ chunk-r0ads4ty.js:12357-12422 esm-fingerprint
function Own(e) {
  for (;;) {
    let t = e.next();
    if (t.done) return t.value;
  }
}
//@ chunk-r0ads4ty.js:12422-12432 esm-layout
var me = 10;
//@ chunk-r0ads4ty.js:12432-12684 esm-fingerprint
async function ili(e, t) {
  t?.throwIfAborted();
  let startTime = performance.now();
  for (;;) {
    let n = e.next();
    if (!n.done && performance.now() - startTime < me) continue;
    if (!n.done) await new Promise((c) => setImmediate(c));
    if ((t?.throwIfAborted(), n.done)) return n.value;
    startTime = performance.now();
  }
}
//@ chunk-r0ads4ty.js:12684-12728 esm-layout
function usr(e, t = {}) {
  return $e(e, t).matches;
}
//@ chunk-r0ads4ty.js:12728-14314 esm-fingerprint
function Se(e, t) {
  let regExp = new RegExp(xTt(e), t),
    n = uy(e),
    c = n !== e ? new RegExp(xTt(n), t) : void 0,
    f = {
      splits: !1,
      start: [0],
      next: () => [0],
      matches: (p, E, _) => regExp.test(_),
      matchesDirectoryForm: (p, E, _) => c?.test(_) === !0,
    },
    a = [],
    o = X({ kind: O.Star }),
    i = (p) => {
      let mapped = p.map(X),
        _ = new Map(),
        T = (d) => a.push({ then: d }) - 1,
        R = (d, y) => {
          let m = `${d}${y ? "*" : ""}`,
            b = _.get(m);
          if (b !== void 0) return b;
          if (!y && p[d]?.kind === O.GlobstarSlash) {
            let u = T(void 0);
            return (_.set(m, u), (a[u].then = R(d + 1, !1)), u);
          }
          if (!y && p[d]?.kind === O.Globstar && d === p.length - 1) {
            let u = T(void 0);
            return (_.set(m, u), u);
          }
          let x = { edges: [] },
            D = a.push(x) - 1;
          _.set(m, D);
          let g = (u, v) => {
              x.edges.push({ regex: new RegExp(`^${u}$`, t), to: v });
            },
            l = y ? o : "";
          for (let u = d; ; u++) {
            let v = p[u];
            if (v === void 0) {
              g(l, void 0);
              break;
            }
            if (v.kind === O.Separator) {
              g(l, R(u + 1, !1));
              break;
            }
            if (v.kind === O.Globstar) (g(l + o, T(R(u + 1, !0))), (l += o));
            else if (v.kind === O.GlobstarSlash) g(l + o, T(R(u + 1, !1)));
            else if (v.kind === O.Set && v.matchesSeparator) (g(l, R(u + 1, !1)), (l += `(?!/)${mapped[u]}`));
            else l += mapped[u];
          }
          return D;
        };
      return R(0, !1);
    },
    s,
    C;
  try {
    if (((s = [i(W(e))]), (C = a.length), c)) s.push(i(W(n)));
  } catch {
    return f;
  }
  let w = (p, E) => {
      for (let _ = E; _ !== void 0 && !p.has(_);) {
        p.add(_);
        let T = a[_];
        _ = "then" in T ? T.then : void 0;
      }
    },
    S = (p) => [...p].sort((E, _) => E - _),
    A = (p, E, _) =>
      p.some((T) => {
        if (T >= C !== _) return !1;
        let R = a[T];
        return "then" in R
          ? R.then === void 0
          : R.edges.some((edge) => edge.to === void 0 && edge.regex.test(E));
      }),
    I = new Set();
  for (let p of s) w(I, p);
  return {
    splits: !0,
    start: S(I),
    next: (p, E) => {
      let _ = new Set();
      for (let T of p) {
        let R = a[T];
        if ("then" in R) w(_, T);
        else for (let edge of R.edges) if (edge.to !== void 0 && edge.regex.test(E)) w(_, edge.to);
      }
      return S(_);
    },
    matches: (p, E) => A(p, E, !1),
    matchesDirectoryForm: (p, E) => A(p, E, !0),
  };
}
//@ chunk-r0ads4ty.js:14314-14429 esm-fingerprint
function v8o(e) {
  let t = e.split(/[*?[\]]/)[0];
  if (!t) return "";
  return t.endsWith("/") ? t.slice(0, -1) : pathModule.posix.dirname(t);
}
//@ chunk-r0ads4ty.js:14429-14468 esm-layout
function k8o(e) {
  return e === "" || e === "/";
}
//@ chunk-r0ads4ty.js:14468-14493 esm-layout
function $qt(e) {
  return e;
}
//@ chunk-r0ads4ty.js:14493-14534 esm-layout
function $e(e, t = {}) {
  return Own(fsr(e, t));
}
//@ chunk-r0ads4ty.js:14534-18917 esm-fingerprint
function* fsr(e, t = {}) {
  let r = {
      baseLocation: "",
      matches: [],
      directoryMatches: [],
      symlinks: new Set(),
      uninspectableLinks: new Set(),
      unlisted: [],
      realOf: new Map(),
    },
    n = t.anchor === void 0 ? void 0 : $qt(t.anchor),
    c = n === void 0 ? $qt(sS(e)) : $qt(e).slice(n.length);
  if (n !== void 0 && (!/[^/]/.test(n) || !$qt(e).startsWith(n) || !(n.endsWith("/") || /^(\/|$)/.test(c))))
    throw TypeError(`Glob pattern ${e} does not lie beneath the anchor ${t.anchor}`);
  let f = v8o(c),
    a = f === "/" ? "" : f,
    o = n === void 0 ? f : n + a;
  if (k8o(o))
    return (
      At(`[Sandbox] Glob pattern has no literal directory below the root to start from, skipping: ${e}`, {
        level: "warn",
      }),
      r
    );
  let i = t.caseInsensitive ? "is" : "s",
    s = Se(c, i);
  if (t.followSymlinkedDirectories && !s.splits)
    At(
      `[Sandbox] Glob pattern ${e} cannot be followed one path component at a time, so it is matched against real paths only and not through symlinked directories`,
      { level: "warn" },
    );
  let C = new Map(),
    w = t.listings ?? new Map(),
    S = [],
    A = (d) => d?.code,
    I = (d, y, m, b, x) => {
      try {
        return m(d);
      } catch (error) {
        if (y === d) throw error;
        let g;
        try {
          g = m(y);
        } catch (error_2) {
          throw b(error) && !b(error_2) ? error_2 : error;
        }
        if (!b(error) && A(error) !== "ENAMETOOLONG")
          (At(
            `[Sandbox] ${d} could not be read for glob pattern ${e}, so it is covered whole, whatever ${y} leads to: ${error}`,
            { level: "warn" },
          ),
            x());
        return g;
      }
    },
    p = new Map(),
    E = (d, y) => {
      let m = p.get(y);
      if (m !== void 0) return m;
      let b;
      try {
        let x = !1;
        b = {
          ...I(
            y,
            d,
            (g) => ({ isDirectory: fsModule_2.statSync(g).isDirectory(), real: JSe(g) }),
            R4e,
            () => (x = !0),
          ),
          unread: x,
        };
      } catch (error) {
        b = R4e(error) ? "absent" : "uninspectable";
      }
      return (p.set(y, b), b);
    },
    _ = (d, y, m) => {
      if (
        d.isFile() ||
        d.isDirectory() ||
        d.isSymbolicLink() ||
        d.isFIFO() ||
        d.isSocket() ||
        d.isCharacterDevice() ||
        d.isBlockDevice()
      )
        return d;
      let { name: b } = d,
        joined = pathModule.join(y, b),
        D = "other";
      try {
        let lstatSync = fsModule_2.lstatSync(joined);
        if (lstatSync.isDirectory()) D = "directory";
        else if (lstatSync.isSymbolicLink()) D = "link";
      } catch {
        try {
          let isDirectory = fsModule_2.statSync(joined).isDirectory();
          if (JSe(joined) !== pathModule.join(m, b)) D = "link";
          else if (isDirectory) D = "directory";
        } catch (error) {
          let l = error?.code;
          if (l === "ELOOP") D = "link";
          else if (l !== "ENOENT")
            ((D = "directory"),
              w.set(pathModule.join(m, b), error instanceof Error ? error : Error(String(error))));
        }
      }
      return { name: b, isDirectory: () => D === "directory", isSymbolicLink: () => D === "link" };
    },
    T = /^[A-Za-z]:$/.test(o) ? `${o}/` : o,
    R = T;
  try {
    R = JSe(T);
  } catch {}
  ((r.baseLocation = R),
    S.push({
      dir: T,
      real: R,
      short: T.length < R.length ? T : R,
      positions: (n === void 0 ? o : a).split("/").reduce(s.next, s.start),
    }));
  for (let d = S.pop(); d !== void 0; d = S.pop()) {
    let { dir: dir, real: real } = d,
      b = C.get(real) ?? { listedFor: new Set() };
    C.set(real, b);
    let filtered = d.positions.filter((position) => !b.listedFor.has(position));
    if (filtered.length === 0) continue;
    yield;
    let D = () => {
        if (b.unlisted) return;
        if (((b.unlisted = !0), r.unlisted.push(dir), real !== dir)) r.realOf.set(dir, real);
      },
      g;
    try {
      let l = w.get(real);
      if (l instanceof Error) throw l;
      ((g =
        l ??
        I(
          real,
          d.short,
          (u) => fsModule_2.readdirSync(u, { withFileTypes: !0 }).map((v) => _(v, u, real)),
          (u) => A(u) === "ENOENT",
          D,
        )),
        w.set(real, g));
    } catch (error) {
      let u = A(error);
      if (
        (At(`[Sandbox] Error listing ${dir} for glob pattern ${e}: ${error}`, {
          level: u === "ENOENT" ? "info" : "warn",
        }),
        u !== "ENOENT")
      ) {
        if (t.listings !== void 0) w.set(real, error instanceof Error ? error : Error(String(error)));
        D();
      }
      continue;
    }
    for (let l of filtered) b.listedFor.add(l);
    for (let l of g) {
      if (s.splits && !l.isDirectory() && !l.isSymbolicLink() && !s.matches(filtered, l.name, "")) continue;
      let joined = pathModule.join(dir, l.name),
        joined_2 = pathModule.join(real, l.name),
        Y = $qt(joined),
        H = n !== void 0 && Y.startsWith(n) ? Y.slice(n.length) : Y,
        matches = s.matches(filtered, l.name, H);
      if (matches) r.matches.push(joined);
      if (l.isDirectory()) {
        let Q = s.next(filtered, l.name),
          q = t.withDirectoryForm === !0 && s.matchesDirectoryForm(filtered, l.name, H);
        if (q) r.directoryMatches.push(joined);
        if ((matches || q) && joined_2 !== joined) r.realOf.set(joined, joined_2);
        if (Q.length > 0)
          S.push({ dir: joined, real: joined_2, short: pathModule.join(d.short, l.name), positions: Q });
        continue;
      }
      if (!l.isSymbolicLink()) {
        if (matches && joined_2 !== joined) r.realOf.set(joined, joined_2);
        continue;
      }
      if ((r.symlinks.add(joined), !t.followSymlinkedDirectories)) continue;
      let F = t.withDirectoryForm === !0 && s.matchesDirectoryForm(filtered, l.name, H),
        j = s.splits ? s.next(filtered, l.name) : [];
      if (!matches && !F && j.length === 0) continue;
      let joined_3 = pathModule.join(d.short, l.name),
        N = E(joined_3, joined_2);
      if (N === "absent") continue;
      let k = N === "uninspectable" || N.unread;
      if (k) {
        if ((r.uninspectableLinks.add(joined), F)) r.directoryMatches.push(joined);
      }
      if (N === "uninspectable") continue;
      if (k && (matches || (F && N.isDirectory))) r.matches.push(N.real === "/" ? real : N.real);
      if (matches && !k) r.realOf.set(joined, N.real);
      if (!N.isDirectory) continue;
      if (F && !k) (r.directoryMatches.push(joined), r.realOf.set(joined, N.real));
      if (j.length === 0) continue;
      if (oS(real, N.real) || oS(R, N.real)) {
        At(
          `[Sandbox] Not following symlink ${joined} -> ${N.real} for glob pattern ${e}: it leads back up the tree`,
        );
        continue;
      }
      (At(`[Sandbox] Following symlink ${joined} -> ${N.real} for glob pattern ${e}`),
        S.push({
          dir: N.real,
          real: N.real,
          short: joined_3.length < N.real.length ? joined_3 : N.real,
          positions: j,
        }));
    }
  }
  return r;
}
//@ chunk-fq0cr76a.js:857514-857561 affinity
var v0 = "(.*/)?",
  zae = 3,
  gM = 4096,
  Xae = /\[[^\]]*\*/;
//@ chunk-fq0cr76a.js:857561-857651 affinity
function yM(e) {
  if (e.length > gM) return { kind: "tooCostly" };
  return EM(e, T0(Cwn(e)), T0(xTt(e)));
}
//@ chunk-fq0cr76a.js:857651-858025 esm-fingerprint
function bM(e) {
  if (e.length > gM) return { kind: "tooCostly" };
  let n = `^${e
    .replace(/[.^$+{}()|\\]/g, "\\$&")
    .replace(/\[([^\]]*?)$/g, "\\[$1")
    .replace(/\*\*\//g, "__GLOBSTAR_SLASH__")
    .replace(/\*\*/g, "__GLOBSTAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__GLOBSTAR_SLASH__/g, v0)
    .replace(/__GLOBSTAR__/g, ".*")}$`;
  return EM(e, escapeInvalidCharClasses(T0(`${n.slice(0, -1)}(/.*)?$`)), escapeInvalidCharClasses(T0(n)));
}
//@ chunk-fq0cr76a.js:858025-858091 esm-fingerprint
function SM(e) {
  let n = `^${e === "/" ? "" : urlPatternToRegex(e)}(/.*)?$`;
  return xM(n, n);
}
//@ chunk-fq0cr76a.js:858091-858254 affinity
function EM(e, n, r) {
  try {
    let s = xM(n, r);
    if (Xae.test(e) || Jae(r)) return { kind: "tooCostly" };
    return { kind: "read", translation: s };
  } catch (error) {
    return { kind: "unreadable", error: error };
  }
}
//@ chunk-fq0cr76a.js:858254-858359 affinity
function xM(e, n) {
  return { anyCase: new RegExp(e, "is"), ownCase: new RegExp(e, "s"), exactly: new RegExp(n, "is") };
}
//@ chunk-fq0cr76a.js:858359-858419 affinity
function T0(e) {
  return e.replace(/(?:\(\.\*\/\)\?){2,}/g, v0);
}
//@ chunk-fq0cr76a.js:858419-858597 affinity
function Jae(e) {
  let replaced = e.replace(/\.\*\$$/, "$"),
    replaced_2 = replaced.replaceAll(`/${v0}`, "/"),
    s = (replaced.length - replaced_2.length) / v0.length,
    h = replaced_2.split(".*").length - 1;
  return countCharInString(replaced_2, "*") - h + 2 * Math.max(0, s + 2 * h - 1) > zae;
}
//@ chunk-vp5gef34.js:15549-19463 esm-fingerprint
var j = Symbol("transient-read-failure"),
  En = (e) => {
    let t = e?.code;
    return t === "ENOENT" || t === "ENOTDIR" || t === "ELOOP" || t === "ENAMETOOLONG";
  },
  Pn = (e) => {
    let t = e?.code;
    return t === "EACCES" || t === "EPERM";
  },
  A = (e) => (En(e) ? "structural" : Pn(e) ? "permission" : "other"),
  ut = async (e, t) => {
    let n = await open(e, $c());
    try {
      let stats = await n.stat();
      if (!stats.isFile()) throw Object.assign(Error("not a regular file"), { code: "ENOTREG" });
      if (t?.maxBytes !== void 0 && stats.size > t.maxBytes)
        throw Object.assign(Error("exceeds the read cap"), { code: "EFBIG" });
      if (t?.withinReal !== void 0) {
        let s = await realpath_2(e).catch((i) => {
          if (A(i) === "structural") return;
          throw i;
        });
        if (s === void 0 || !s.startsWith(t.withinReal + sep_2))
          throw Object.assign(Error("resolves outside the store root"), { code: "ENOTREG" });
        let r = await stat(s).catch((i) => {
          if (A(i) === "structural") return;
          throw i;
        });
        if (r === void 0) throw Object.assign(Error("resolves outside the store root"), { code: "ENOTREG" });
        if (r.dev !== stats.dev || r.ino !== stats.ino)
          throw Object.assign(Error("inode changed during read; retry"), { code: "EAGAIN" });
      }
      return await n.readFile();
    } finally {
      await n.close();
    }
  },
  ft = (e) => {
    let t = e?.code;
    return t === "ENOTREG" || t === "ELOOP" || t === "EFBIG";
  },
  fe_vp5g = Symbol("not-a-regular-file"),
  pt = async (e, t, n) =>
    lstat_2(join(e, t)).then(
      (o) => !o.isFile() || (n !== void 0 && o.size > n),
      (o) => A(o) === "structural",
    ),
  mt = async (e, t) => {
    if (!(await pt(e, t))) return !1;
    return realpath_2(e).then(
      () => !0,
      () => !1,
    );
  },
  ht = async (e, t, n, o = C) => {
    if (e.pathToId.get(n) === void 0) return !1;
    let r = await realpath_2(t).catch(() => j);
    if (typeof r !== "string") return !1;
    let i = await ut(join(t, n), { withinReal: r, maxBytes: o.maxFileBytes }).catch((l) =>
      ft(l) ? fe_vp5g : A(l) === "structural" ? void 0 : j,
    );
    if (i === j) return !1;
    if (i === fe_vp5g) return N(e, n);
    if (i === void 0) {
      if (!(await mt(t, n))) return !1;
      return N(e, n);
    }
    if (i.byteLength > o.maxFileBytes) return N(e, n);
    let decode = new TextDecoder().decode(i),
      c = await lstat_2(join(t, n)).catch(() => {
        return;
      });
    return (
      Pe(e, we(n, decode), { hash: gt(decode), size: c?.size ?? i.byteLength, mtimeMs: c?.mtimeMs ?? 0 }),
      !0
    );
  },
  C = { excludeBasenames: ["MEMORY.md"], maxFiles: 2000, maxFileBytes: 1048576 },
  textEncoder = new TextEncoder(),
  gt = (e) => {
    let encode = textEncoder.encode(e),
      n = -2078137563,
      o = -873292572;
    for (let r = 0; r < encode.length; r++) {
      n ^= encode[r];
      let i = n & 65535,
        a = n >>> 16,
        c = o & 65535,
        l = o >>> 16,
        d = i * 179,
        h = d & 65535;
      d = a * 179 + (d >>> 16);
      let u = d & 65535;
      d = c * 179 + (d >>> 16);
      let p = d & 65535;
      d = l * 179 + (d >>> 16);
      let f = d & 65535,
        m = n << 8,
        g = (o << 8) | (n >>> 24),
        S = h + (m & 65535),
        I = u + (m >>> 16) + (S >>> 16);
      ((n = (I << 16) | (S & 65535)), (o = (((f << 16) | p) + g + m + (I >>> 16)) | 0));
    }
    let s = (r) => (r >>> 0).toString(16).padStart(8, "0");
    return s(o) + s(n);
  },
  De = (e, t) => {
    if (t.excludeLog?.(e)) return !0;
    if (t.isRecallVisible !== void 0 && !t.isRecallVisible(e)) return !0;
    if (t.excludePrefixes?.some((o) => e.startsWith(o))) return !0;
    if (t.excludePaths !== void 0) return t.excludePaths.has(e);
    let sliced = e.slice(e.lastIndexOf("/") + 1);
    return t.excludeBasenames.includes(sliced);
  },
  Rn = async (e, t = C) => {
    let n = [],
      o = new Set(),
      s = !1,
      r = [""];
    while (r.length > 0) {
      let f = r.pop(),
        m = await readdir(join(e, f), { withFileTypes: !0 }).catch((g) => {
          if (f === "") {
            if (isENOENT(g)) return ((s = !0), []);
            throw g;
          }
          switch (A(g)) {
            case "permission":
              return (o.add(f), []);
            case "structural":
              return [];
            default:
              throw g;
          }
        });
      for (let g of m) {
        let S = f === "" ? g.name : `${f}/${g.name}`;
        if (g.isSymbolicLink()) continue;
        if (g.isDirectory()) {
          if (t.excludePrefixes?.some((I) => `${S}/`.startsWith(I)) ?? !1) continue;
          r.push(S);
        } else n.push(S);
      }
    }
    let sorted = n
        .filter((f) => f.endsWith(".md"))
        .filter((f) => !De(f, t))
        .sort(),
      a = new Set(),
      settled = await Promise.allSettled(
        sorted.map(async (f) => {
          let m = await lstat_2(join(e, f)).catch((g) => {
            switch (A(g)) {
              case "structural":
                return;
              case "permission":
                a.add(f);
                return;
              default:
                throw g;
            }
          });
          return m !== void 0 && m.isFile() && m.size <= t.maxFileBytes
            ? { path: f, size: m.size, mtimeMs: m.mtimeMs }
            : void 0;
        }),
      ),
      found = settled.find((f) => f.status === "rejected");
    if (found !== void 0 && found.status === "rejected") throw found.reason;
    let filtered = settled
        .map((f) => (f.status === "fulfilled" ? f.value : void 0))
        .filter((f) => f !== void 0),
      h =
        filtered.length <= t.maxFiles
          ? filtered
          : filtered
              .toSorted((f, m) => m.mtimeMs - f.mtimeMs)
              .slice(0, t.maxFiles)
              .toSorted((f, m) => (f.path < m.path ? -1 : 1)),
      u = new Set(h.map((f) => f.path)),
      p = new Set(filtered.filter((f) => !u.has(f.path)).map((f) => f.path));
    return { files: h, skipped: a, skippedSubtrees: o, rootMissing: s, capDropped: p };
  };

export {
  BP,
  Nqt,
  oD,
  Kot,
  Ad,
  uy,
  C,
  Rn,
  A,
  j,
  De,
  pt,
  ut,
  ft,
  fe_vp5g,
  mt,
  gt,
  ht,
  yM,
  bM,
  SM,
  Jxe,
  Pwn,
  usr,
  Vot,
  Lqt,
  Hqt,
  $qt,
  S8o,
  R4e,
  PTt,
  sS,
  QSe,
  w8o,
  Iwn,
  SRT,
  x4e,
  ITt,
  fsr,
  Own,
  xwn,
  ili,
  v8o,
  k8o,
  oS,
  dsr,
  csr,
  Mqt,
  F3r,
  zot,
  Rwn,
  B3r,
  Dqt,
  Cwn,
  E8o,
  U3r,
};
