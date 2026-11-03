/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (92)
 * attribution: esm-fingerprint 73, esm-layout 19
 */
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
} from "path";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
} from "crypto";
import { EOL } from "os";
import { Of, ol } from "./resolved-address-guard.js";
import {
  ox,
  sI,
  ax,
  nI,
  eI,
  WindowsSandboxError,
  si,
  Pot,
  kor,
  q6r,
  ensurePersistentWindowsCa,
  ig,
  tI,
  j1,
  qf,
  uI,
  dI,
  Au,
  fx,
  aI,
  J1,
  ex,
} from "./windows-sandbox-utils.js";
import { _m, DC, Eu, vm } from "./sandbox-violation-store.js";
import { RE } from "./credential-sentinel.js";
import { DE, OR, DR } from "./credential-aws-pairs.js";
import { kE, AR } from "./credential-mask-files.js";
import { ZE, jE, l1, a1, d1, WorkingDirectoryChanged, Wf } from "./linux-sandbox-utils.js";
import { At } from "../utils/debug.js";
import { iE, sE, Sm, RC } from "./mitm-ca.js";
import { x4e, QSe, ITt, BP, sS, uy, Ad, fsr, Own, xwn, ili, v8o, k8o } from "./sandbox-utils.js";
import { isr, asr, lsr, Got, Awn } from "./domain-pattern.js";
import { Twn, JF, p8o, h8o } from "./parent-proxy.js";
import { hR } from "./http-proxy.js";
import { bR } from "./socks-proxy.js";
import { xR } from "./mux-proxy.js";
import { Uh } from "./emitted-connection.js";
import { zv, sli } from "../utils/platform.js";
import { A1, G6r } from "./macos-sandbox-utils.js";
import { R1 } from "./linux-violation-monitor.js";
import { eu, Hb, Ph, Zw, Gb, Yb, qb, jb, Qc } from "./path-entries.js";
import { HR } from "./java-proxy-agent.js";
import { ha } from "../utils/which.js";
import { mx } from "./own-files.js";
import { B6r } from "./generate-seccomp-filter.js";
import { RR } from "./credential-mask-env.js";
import { zE } from "./read-deny-glob.js";

//@ chunk-fq0cr76a.js:703099-703511 esm-fingerprint
function Mm(e, n, r, s) {
  return new Promise((h, y) => {
    let [b, S] = r ?? [0, 0],
      w = b,
      R = () => {
        while (s.has(w) && w <= S) w++;
        if (w > S) {
          y(Error(`No free port in range ${b}-${S} (excluding ${[...s].join(",")})`));
          return;
        }
        let D = () => {
            (e.removeListener("error", O), h());
          },
          O = (L) => {
            if ((e.removeListener("listening", D), r && L?.code === "EADDRINUSE" && w < S)) {
              (w++, R());
              return;
            }
            y(L ?? Error("listen error"));
          };
        (e.once("error", O), e.once("listening", D), n(r ? w : 0));
      };
    R();
  });
}
//@ chunk-fq0cr76a.js:817984-818075 esm-layout
var Pe,
  lg = 0,
  Zf,
  Xf,
  Ru,
  Si,
  dl,
  hI = !1,
  mI = !1,
  ag,
  Iu,
  fl,
  pg = Of(),
  Lr,
  Cu,
  yl,
  ro,
  pl,
  cg,
  gI,
  ml,
  ug = new Set();
//@ chunk-fq0cr76a.js:818075-818209 esm-fingerprint
function vI(e) {
  let n = "";
  try {
    let stats = fsModule_3.statSync(e.exe);
    n = `${stats.size}:${stats.mtimeMs}`;
  } catch {}
  return JSON.stringify([e.exe, e.prependArgs, n]);
}
//@ chunk-fq0cr76a.js:818209-818361 esm-layout
var wI =
  "a session depends on (its read denies are written on the profile read grant's paths by srt-win, and kept grants are checked and removed there)";
//@ chunk-fq0cr76a.js:818361-818485 esm-fingerprint
function sK(e) {
  let n = vI(e);
  if (ug.has(n)) return;
  let r = ox(sI({ srtWin: e }).capabilities);
  if (r !== void 0) throw ax(r, wI);
  ug.add(n);
}
//@ chunk-fq0cr76a.js:818485-818498 esm-layout
var Jf,
  Qf = [];
//@ chunk-fq0cr76a.js:818498-821106 esm-layout
function iK(e) {
  let n = (w) => w.map((R) => R.path).join(", "),
    r = [],
    filtered = e.unprotected.filter((w) => w.entry !== void 0),
    filtered_2 = e.unprotected.filter((w) => w.entry === void 0),
    filtered_3 = e.unverifiable.filter((w) => w.callerReads === !0),
    filtered_4 = e.unverifiable.filter((w) => w.callerReads !== !0);
  if (filtered.length + filtered_2.length + filtered_3.length > 0) {
    let w = [];
    if (filtered.length > 0)
      w.push(
        `${filtered.length} READABLE THROUGH AN ENTRY THIS PRODUCT WROTE and ` +
          "could not remove \u2014 each path's reason gives the icacls command " +
          `that removes it, to be run as the object's owner or from an elevated prompt, followed by the grant again (${n(filtered)})`,
      );
    if (filtered_2.length > 0)
      w.push(`${filtered_2.length} by their own access lists, which you may not change (${n(filtered_2)})`);
    if (filtered_3.length > 0)
      w.push(
        `${filtered_3.length} whose access lists could not be read but which you can read all the same, so sandboxed commands may too (${n(filtered_3)})`,
      );
    r.push({
      code: "profile_exclusion_unprotected",
      message:
        "Paths on the exclusion list of the profile read grant could not be denied and are, or may be, readable to sandboxed commands: " +
        w.join("; ") +
        ". Only their owner or an administrator can close them.",
      paths: [...filtered, ...filtered_2, ...filtered_3],
    });
  }
  if (filtered_4.length > 0) {
    let filtered = filtered_4.filter((L) => L.callerReads === !1),
      filtered_2 = filtered_4.filter((L) => L.cause === "account_unknown"),
      filtered_3 = filtered_4.filter((L) => L.callerReads !== !1 && L.cause !== "account_unknown"),
      O = [];
    if (filtered.length > 0)
      O.push(
        `${filtered.length} whose access lists could not be read; you cannot read their content either (${n(filtered)})`,
      );
    if (filtered_2.length > 0)
      O.push(
        `${filtered_2.length} that could not be examined because the sandbox account is not known (${n(filtered_2)})`,
      );
    if (filtered_3.length > 0) O.push(`${filtered_3.length} that were not examined (${n(filtered_3)})`);
    r.push({
      code: "profile_exclusion_unverifiable",
      message:
        "Paths on the exclusion list of the profile read grant could not be denied, and whether sandboxed commands can read them was not established: " +
        O.join("; ") +
        ".",
      paths: filtered_4,
    });
  }
  if (e.staleAllow.length > 0)
    r.push({
      code: "profile_stale_allow",
      message: `${e.staleAllow.length} path(s) that have left the profile read grant still carry an entry of it that could not be removed, and are readable to sandboxed commands through it: ${n(e.staleAllow)}. None is on the exclusion list. Each path's reason gives the icacls command that removes the entry.`,
      paths: e.staleAllow,
    });
  let S = e.replacedFiles ?? [];
  if (S.length > 0)
    r.push({
      code: "profile_file_replaced",
      message: `${S.length} configuration file(s) were replaced since the profile read grant was made and are not readable to sandboxed commands; the variables that point at them are not returned: ${S.join(", ")}. Run grantWindowsProfileRead() (\`srt-win profile grant\`) again.`,
      paths: S.map((w) => ({ path: w, reason: "replaced since the grant was made" })),
    });
  return r;
}
//@ chunk-fq0cr76a.js:821106-821153 esm-layout
var ku,
  bc = new _m(),
  Sc = new RE(),
  hg = new DE(),
  ep = new kE();
//@ chunk-fq0cr76a.js:821153-821535 esm-fingerprint
function oK() {
  if (hI) return;
  let e = () => (
    ZE(),
    Rx().catch((n) => {
      At(`Cleanup failed in registerCleanup ${n}`, { level: "error" });
    })
  );
  (process.once("exit", () => {
    if ((e(), Lr)) iE(Lr);
    (Ru?.removeBackendSocketSync(), ep.dispose());
    let n = Si?.linuxBridge;
    for (let r of [n?.httpSocketPath, n?.socksSocketPath])
      try {
        if (r) fsModule_3.rmSync(r, { force: !0 });
      } catch {}
  }),
    process.once("SIGINT", e),
    process.once("SIGTERM", e),
    (hI = !0));
}
//@ chunk-fq0cr76a.js:821535-821604 esm-fingerprint
var aK = new Set(["revoked", "stillHeld", "restored", "alreadyOriginal"]);
//@ chunk-fq0cr76a.js:821604-821813 esm-fingerprint
function TI(e, n) {
  for (let r of n ?? [])
    if (!aK.has(r.status))
      At(
        `[Sandbox Windows] ${e}: '${r.path}' ${r.status} \u2014 ` +
          "ACE may be left in place; resolve and run `srt-win acl recover` to clear",
        { level: "warn" },
      );
}
//@ chunk-fq0cr76a.js:821813-822422 esm-fingerprint
function lK(e) {
  if ((TI("grant revoke", e.outcomes), e.complete)) return !0;
  let pending = e.pending;
  return (
    At(
      "[Sandbox Windows] grant revoke did not complete" +
        " \u2014 NOT running the deny restore; deny ACEs stay in place " +
        `while a grant may still be on disk. Grants possibly left in place: ${pending.length > 0 ? pending.map((r) => `'${r}'`).join(", ") : "(none reported)"}` +
        (e.detail ? `. srt-win: ${e.detail}` : "") +
        ". The next revoke retries them; after this process exits, `srt-win acl recover` does, and removes its deny ACEs once they are released (`--force` drops the record of a grant that can no longer be located).",
      { level: "error" },
    ),
    !1
  );
}
//@ chunk-fq0cr76a.js:822422-822511 esm-fingerprint
function AI(e, n) {
  let r = { sandboxUserSid: e, srtWin: n };
  if (lK(nI(r))) TI("deny restore", eI(r));
}
//@ chunk-fq0cr76a.js:822511-822534 esm-fingerprint
var cK = 1024,
  yc = new Map();
//@ chunk-fq0cr76a.js:822534-822713 esm-fingerprint
function CI(e, n) {
  let r = x4e(QSe(ITt(e, n?.commandId))),
    s = n?.commandText ?? e;
  (yc.delete(r), yc.set(r, s));
  while (yc.size > cK) {
    let h = yc.keys().next().value;
    if (h === void 0) break;
    yc.delete(h);
  }
}
//@ chunk-fq0cr76a.js:822713-822752 esm-layout
function Sx(e) {
  return yc.get(e) ?? DC(e);
}
//@ chunk-fq0cr76a.js:822752-822773 esm-layout
var yI = 22,
  mg = new Map();
//@ chunk-fq0cr76a.js:822773-823761 esm-fingerprint
function uK(e, n) {
  let r = typeof e === "string" ? x4e(QSe(e)) : "";
  if (r.replace(/\ufffd/g, "").length < yI)
    throw Error(
      `registerCommandNetworkLists: commandId must be a string of at least ${yI} characters, unpaired surrogates not counted. The id is the only thing that binds a proxy connection to this allow list, and the sandboxed process chooses which id it presents, so it must be random (at least 128 bits, e.g. 16 random bytes as base64url) and never derived from the command text, a counter or the time.`,
    );
  let s = n?.allowedDomains ?? [];
  if (!Array.isArray(s))
    throw Error("registerCommandNetworkLists: allowedDomains must be an array of strings.");
  for (let h of s)
    if (typeof h !== "string" || !isr(h))
      throw Error(`registerCommandNetworkLists: invalid allowedDomains entry ${JSON.stringify(h)}. ${asr}`);
  if ((mg.set(r, { allowedDomains: [...s] }), Pe?.network.httpProxyPort !== void 0))
    At(
      "registerCommandNetworkLists: network.httpProxyPort is set (an external proxy), so this list will never apply",
      { level: "warn" },
    );
}
//@ chunk-fq0cr76a.js:823761-823829 esm-fingerprint
function dK(e) {
  if (typeof e !== "string") return;
  mg.delete(x4e(QSe(e)));
}
//@ chunk-fq0cr76a.js:823829-823983 esm-fingerprint
function Ex(e, n) {
  let r = n ? Sx(x4e(n)) : void 0;
  if (Eu(e, r, Pe?.ignoreViolations)) return;
  bc.addViolation({ line: e, encodedCommand: n, command: r, timestamp: new Date() });
}
//@ chunk-fq0cr76a.js:823983-824051 esm-fingerprint
function vx(e, n, r, s) {
  Ex(`deny network-outbound ${e}:${n} (${r})`, s);
}
//@ chunk-fq0cr76a.js:824051-824143 esm-fingerprint
var bI = (e, n) => (r, s, h) =>
  pg.lookupFor(e)(r, s, (y, b, S) => {
    if (ol(y)) vx(r, e, y.reason, n);
    h(y, b, S);
  });
//@ chunk-fq0cr76a.js:824143-824223 esm-fingerprint
function fK(e) {
  let search = e.search(/[?#]/);
  return search === -1 ? e : `${e.slice(0, search + 1)}\u2026`;
}
//@ chunk-fq0cr76a.js:824223-824297 esm-fingerprint
function pK(e) {
  return e === !1 || (typeof e === "object" && e !== null && e.allow === !1);
}
//@ chunk-fq0cr76a.js:824297-824435 esm-fingerprint
function hK(e) {
  if (typeof e !== "object" || e === null) return;
  let { allow: allow, reason: reason } = e;
  if (allow !== !1 || typeof reason !== "string") return;
  return vm(reason) || void 0;
}
//@ chunk-fq0cr76a.js:824435-824582 esm-fingerprint
function RI(e) {
  let n = Pe?.network.deniedDomainReasons ?? {};
  return (Object.prototype.hasOwnProperty.call(n, e) ? n[e] : void 0) ?? "host is on the deny list";
}
//@ chunk-fq0cr76a.js:824582-825857 esm-fingerprint
async function SI(e, n, r, s, h) {
  let y = (w) => (vx(n, e, w, s), h?.(w), !1);
  if (!Pe) return (At("No config available, denying network request"), y("sandbox policy unavailable"));
  if (!Twn(n))
    return (At(`Denying malformed host: ${JSON.stringify(n)}:${e}`, { level: "error" }), y("malformed host"));
  let b = JF(n) ?? n;
  for (let deniedDomain of Pe.network.deniedDomains)
    if (lsr(b, e, deniedDomain)) return (At(`Denied by config rule: ${n}:${e}`), y(RI(deniedDomain)));
  for (let allowedDomain of Pe.network.allowedDomains)
    if (lsr(b, e, allowedDomain)) return (At(`Allowed by config rule: ${n}:${e}`), !0);
  if (Pe.network.strictAllowlist)
    return (At(`No matching config rule, denying: ${n}:${e}`), y("host is not on the allow list"));
  let S = s ? mg.get(x4e(s)) : void 0;
  for (let w of S?.allowedDomains ?? [])
    if (lsr(b, e, w)) return (At(`Allowed by per-command rule: ${n}:${e}`), !0);
  if (!r) return (At(`No matching rule, denying: ${n}:${e}`), y("host is not on the allow list"));
  At(`No matching rule, asking user: ${n}:${e}`);
  try {
    let w = await r({ host: n, port: e });
    if (w === !0) return (At(`User allowed: ${n}:${e}`), !0);
    if (!pK(w))
      At(
        `Ask callback answered neither a boolean nor { allow: false, reason }; treating it as a denial: ${n}:${e}`,
        { level: "warn" },
      );
    return (At(`User denied: ${n}:${e}`), y(hK(w) ?? "user denied"));
  } catch (error) {
    return (At(`Error in permission callback: ${error}`, { level: "error" }), y("permission prompt failed"));
  }
}
//@ chunk-fq0cr76a.js:825857-825945 esm-fingerprint
function mK() {
  if (!Pe?.credentials) return;
  return (e, n) => {
    Sc.substituteInHeaders(e, n, Got);
  };
}
//@ chunk-fq0cr76a.js:825945-826024 esm-fingerprint
function gK() {
  if (!Pe?.credentials) return;
  return (e) => Sc.sentinelsForHost(e, Got);
}
//@ chunk-fq0cr76a.js:826024-826125 esm-fingerprint
function yK() {
  if (!Pe?.credentials) return;
  return (e, n, r, s) => OR(hg, Pe?.credentials?.sigv4, Got)(e, n, r, s);
}
//@ chunk-fq0cr76a.js:826125-826318 esm-fingerprint
function bK(e) {
  if (!Pe?.network.mitmProxy) return;
  let { socketPath: socketPath, domains: domains } = Pe.network.mitmProxy,
    s = JF(e) ?? e;
  for (let h of domains) if (Got(s, h)) return (At(`Host ${e} matches MITM pattern ${h}`), socketPath);
  return;
}
//@ chunk-fq0cr76a.js:826318-826824 esm-fingerprint
function SK(e) {
  let n = Pe?.network.tlsTerminate?.excludeDomains;
  if (!n?.length) return !0;
  let r = JF(e) ?? e;
  for (let s of n) {
    if (!Got(r, s)) continue;
    At(`Host ${e} matches tlsTerminate.excludeDomains pattern ${s}; skipping TLS termination`);
    let namesInjectableAt = Sc.namesInjectableAt(r, Got);
    if (namesInjectableAt.length > 0)
      At(
        `tlsTerminate.excludeDomains: masked credential(s) ${namesInjectableAt.join(", ")} are configured for injection at ${e}, but its connections are not terminated, so the upstream will receive the placeholder`,
        { level: "error" },
      );
    return !1;
  }
  return !0;
}
//@ chunk-fq0cr76a.js:826824-828584 esm-fingerprint
async function EK(e, n) {
  let r = mK(),
    s = gK();
  ((Zf = hR({
    filter: (S, w, R, D, O) => SI(S, w, e, D, O),
    getMitmSocketPath: bK,
    mitmCA: Lr,
    shouldTerminateTLS: SK,
    filterRequest: Pe?.network.filterRequest,
    plaintextHeaderSet: Pe?.network.allowPlaintextHeaderSet,
    stripResponseHeaders: Pe?.network.stripResponseHeaders,
    refuseOpaqueTunnels: Pe?.network.refuseOpaqueTunnels,
    requireHostMatch: Pe?.network.requireHostMatch,
    ambiguousRequestTarget: Pe?.network.ambiguousRequestTarget,
    get maxTerminatedTunnels() {
      return Pe?.network.tlsTerminate?.maxTunnels;
    },
    get tlsHandshakeTimeoutMs() {
      return Pe?.network.tlsTerminate?.handshakeTimeoutMs;
    },
    onFilterRequestDenied: ({ method: method, url: url, reason: reason, encodedCommand: encodedCommand }) => {
      let O = method === "CONNECT" ? url : fK(url);
      Ex(`deny http-request ${method} ${O} (${reason})`, encodedCommand);
    },
    mutateHeaders: r,
    mutateHeadersPlaintext: Pe?.credentials?.allowPlaintextInject ? r : void 0,
    getBodySubstitutions: s,
    getBodySubstitutionsPlaintext: Pe?.credentials?.allowPlaintextInject ? s : void 0,
    planSigv4: yK(),
    parentProxy: fl,
    lookupFor: bI,
    proxyAuthToken: yl,
  })),
    (Xf = bR({
      filter: (S, w, R) => SI(S, w, e, R),
      parentProxy: fl,
      lookupFor: bI,
      proxyAuthToken: yl,
      refuseOpaqueTunnels: Pe?.network.refuseOpaqueTunnels,
      onTunnelRefused: (S, w, R) => {
        Ex(`deny socks-tunnel ${w}:${S} (refuseOpaqueTunnels)`, R);
      },
      probeUnauthenticated: async (S, w) => {
        if (!Pe) return {};
        let R = JF(w) ?? w;
        for (let deniedDomain of Pe.network.deniedDomains)
          if (lsr(R, S, deniedDomain)) {
            let O = RI(deniedDomain);
            return (vx(w, S, O), { deniedReason: O });
          }
        return {};
      },
    })),
    (Ru = xR({
      httpServer: Zf,
      handleSocksConnection: (S) => Xf.handleConnection(S),
      httpBackendPortRange: n,
    })));
  let h = Ru,
    listenHttpBackend = await h.listenHttpBackend();
  await Mm(
    h.server,
    (S) => h.server.listen(S, "127.0.0.1"),
    n,
    listenHttpBackend !== void 0 ? new Set([listenHttpBackend]) : new Set(),
  );
  let port = h.getPort();
  if (port === void 0) throw Error("Failed to get mux proxy server port");
  return (h.unref(), At(`Mux proxy (HTTP+SOCKS) listening on localhost:${port}`), port);
}
//@ chunk-fq0cr76a.js:828584-828677 esm-layout
async function xK(e, n, r = !1, s) {
  try {
    await _K(e, n, r, s);
  } catch (error) {
    if (Lr) iE(Lr);
    throw ((Lr = void 0), error);
  }
}
//@ chunk-fq0cr76a.js:828677-834600 esm-fingerprint
async function _K(e, n, r, s) {
  if (dl) {
    await dl;
    return;
  }
  if (((Pe = e), lg++, (fl = p8o(e.network.parentProxy)), fl))
    At(`Parent proxy configured: http=${h8o(fl.httpUrl)} https=${h8o(fl.httpsUrl)}`);
  if (((pg = Of(e.network)), e.network.tlsTerminate && e.network.mitmProxy))
    throw Error("network.tlsTerminate and network.mitmProxy are mutually exclusive");
  if (e.network.tlsTerminate) Uh();
  let tlsTerminate = e.network.tlsTerminate,
    y = zv() === "windows" && tlsTerminate !== void 0 && !tlsTerminate.caCertPath && !tlsTerminate.caKeyPath;
  Lr = tlsTerminate && !y ? sE(tlsTerminate) : void 0;
  let b = await kI();
  if (b.errors.length > 0) {
    if (b.reinstallRequired) throw new WindowsSandboxError("reinstall_required", b.reinstallRequired);
    if (b.loopbackMismatch) throw new WindowsSandboxError("wfp_loopback_mismatch", b.loopbackMismatch);
    throw Error(`Sandbox dependencies not available: ${b.errors.join(", ")}`);
  }
  if (r && zv() === "macos")
    ((ag = A1(bc.addViolation.bind(bc), Pe.ignoreViolations, Sx)), At("Started macOS sandbox log monitor"));
  if (r && zv() === "linux") {
    let S = yg();
    ((Iu = R1(bc.addViolation.bind(bc), {
      allowWritePaths: [...eu(S), ...(Pe.filesystem.disabled ? [] : BP())].map((w) => sS(w, { literal: !0 })),
      denyWritePaths: [
        ...S.denyWithinAllow.map((w) => sS(w, { literal: !0 })),
        ...(S.literalDenyWithinAllow ?? []).map((w) => sS(w, { literal: !0 })),
        ...(Pe.filesystem.disabled ? [] : jE(xx())),
      ],
      ignoreViolations: Pe.ignoreViolations,
      resolveCommandText: Sx,
    })),
      Iu.ready,
      At("Started Linux seccomp violation monitor"));
  }
  if ((oK(), zv() === "windows")) {
    ku = si(e.windows?.srtWin);
    let S = ku,
      w = await Pot({ srtWin: S });
    if (!w.provisioned || !w.credPresent)
      throw (
        (Pe = void 0),
        new WindowsSandboxError(
          "not_provisioned",
          `Windows sandbox user is not provisioned (user=${w.provisioned}, cred=${w.credPresent}). Run \`npx sandbox-runtime windows-install\` (one UAC prompt) to provision it.`,
        )
      );
    let R = kor(w, e.windows?.sublayerGuid ?? e.windows?.wfpSublayerGuid);
    if (R) throw ((Pe = void 0), new WindowsSandboxError("reinstall_required", R));
    Qf = [];
    let D = "absent",
      O = { exclusions: [], ungrantedOnly: [] };
    try {
      let L = ox(w.capabilities);
      if (L !== void 0) throw ax(L, wI);
      if ((ug.add(vI(S)), w.profileGrant)) {
        let V = await q6r({ srtWin: S });
        if (V.state !== "none" && V.state !== "current")
          throw new WindowsSandboxError(
            "profile_grant_outdated",
            `The recorded read grant on your user profile cannot be used (${V.state}${V.reason ? `: ${V.reason}` : ""}). Call grantWindowsProfileRead() (\`srt-win profile grant\`, or \`npx sandbox-runtime windows-install\` again) as the user who starts sessions to bring it up to date, or forgetWindowsProfileRead() (\`srt-win profile forget\`) to run without reading the profile. initialize() does neither itself.`,
          );
        if (V.state === "current") {
          ((O = V), (D = "granted"), (Qf = iK(V)));
          for (let K of Qf) At(`[Sandbox Windows] ${K.message}`, { level: "warn" });
        }
      }
      if (((Jf = D), D === "absent"))
        At(
          "[Sandbox Windows] no profile read grant: the user profile is not readable to sandboxed commands in this session",
        );
    } catch (error) {
      throw ((Jf = void 0), (Pe = void 0), error);
    }
    if (y && tlsTerminate)
      try {
        let L = await ensurePersistentWindowsCa({ status: w, srtWin: S });
        Lr = sE({
          caCertPem: L.certPem,
          caKeyPem: L.keyPem,
          caCertPath: L.certPath,
          caKeyPath: L.keyPath,
          extraCaCertPaths: tlsTerminate.extraCaCertPaths,
        });
      } catch (error) {
        throw ((Pe = void 0), error);
      }
    try {
      let L = [];
      try {
        L = LI(gg(e.credentials, e.network.allowedDomains));
      } catch {}
      let V = AK(e, L),
        K = Lr ? [dirname_6(Lr.trustBundlePath)] : [],
        q = s?.dangerouslyAllowReadOfProfileExclusions ?? [],
        Z = [...ig(V.grantRead, O, { override: q }), ...ig(K, O), ...ig(V.grantWrite, O, { write: !0 })];
      if (Z.length > 0) {
        let Se = (ue) => {
          let me = ue.access === "write" ? "allowWrite" : "allowRead",
            Ne =
              ue.kind === "ungranted-only"
                ? (ue.relation === "equal" ? "is" : "contains") +
                  ` ${ue.exclusion}, which is not granted as a whole (grant a directory inside it instead)`
                : ue.relation === "equal"
                  ? `is the excluded ${ue.exclusion}`
                  : ue.relation === "inside"
                    ? `lies inside the excluded ${ue.exclusion}`
                    : ue.unexamined !== void 0
                      ? `may contain the excluded ${ue.exclusion}: ${ue.unexamined}, and a path is granted only once it has been looked at`
                      : `contains the excluded ${ue.exclusion}`;
          return (
            `${me} ${ue.path} ${Ne}` +
            (ue.access === "write" && ue.relation === "above"
              ? ": a write grant on it is kept and inherited, so that path would be writable and readable if it is ever " +
                "created again \u2014 choose a narrower working directory"
              : "")
          );
        };
        throw new WindowsSandboxError(
          "profile_exclusion_read_grant",
          "The session would grant a path that reaches one excluded from reads of your user profile: " +
            Z.map(Se).join("; ") +
            ". Nothing was granted. Remove the entry, or name a path that neither is nor contains an excluded one.",
        );
      }
      let J = Lr ? [...V.grantRead, dirname_6(Lr.trustBundlePath)] : V.grantRead;
      if (!w.sid)
        throw Error(
          "sandbox user SID missing from `srt-win user status` (provisioned but in an inconsistent state)",
        );
      let sid = w.sid;
      ((pl = sid),
        await tI({
          sandboxUserSid: sid,
          read: J,
          write: V.grantWrite,
          denyRead: V.denyRead,
          denyWrite: V.denyWrite,
          allowProfileExclusions: q,
          srtWin: S,
        }),
        (ro = V),
        At(
          `[Sandbox Windows] fs applied: ${V.grantWrite.length} grantWrite, ${J.length} grantRead, ${V.denyRead.length} denyRead, ${V.denyWrite.length} denyWrite`,
        ));
      let ae = e.network?.allowLocalBinding === !0;
      if (gI !== sid || ml !== ae)
        (await j1({
          proxyPortRange: e.windows?.proxyPortRange,
          writeRoots: V.grantWrite,
          allowLoopback: ae,
          sublayerGuid: e.windows?.sublayerGuid ?? e.windows?.wfpSublayerGuid,
          sandboxUser: e.windows?.sandboxUser,
          srtWin: S,
        }),
          (gI = sid),
          (ml = ae));
      cg = BI(e);
    } catch (error) {
      if (pl) AI(pl, S);
      throw ((pl = void 0), (ro = void 0), (Jf = void 0), (Pe = void 0), error);
    }
  }
  ((dl = (async () => {
    try {
      let S = zv() === "windows" ? (Pe.windows?.proxyPortRange ?? qf) : void 0;
      yl = Pe.network.httpProxyPort !== void 0 ? void 0 : randomBytes_2(16).toString("hex");
      let R =
          Pe.network.httpProxyPort === void 0 || Pe.network.socksProxyPort === void 0
            ? await EK(n, S)
            : void 0,
        D = Pe.network.httpProxyPort ?? R,
        O = Pe.network.socksProxyPort ?? R;
      if (((Cu = (await HR(Pe.javaAgentJarPath)) ?? void 0), Lr && R !== void 0 && zv() === "windows"))
        Lr.crlUrl = `http://127.0.0.1:${R}${Sm}`;
      if (Pe.network.httpProxyPort !== void 0) At(`Using external HTTP proxy on port ${D}`);
      if (Pe.network.socksProxyPort !== void 0) At(`Using external SOCKS proxy on port ${O}`);
      let L;
      if (zv() === "linux") L = await l1(D, O, Pe.socatPath);
      let V = { httpProxyPort: D, socksProxyPort: O, linuxBridge: L };
      return ((Si = V), At("Network infrastructure initialized"), V);
    } catch (error) {
      throw (
        (dl = void 0),
        (Si = void 0),
        Rx().catch((w) => {
          At(`Cleanup failed in initializationPromise ${w}`, { level: "error" });
        }),
        error
      );
    }
  })()),
    await dl);
}
//@ chunk-fq0cr76a.js:834600-834693 esm-fingerprint
function II() {
  let e = zv();
  if (e === "linux") return sli() !== "1";
  return e === "macos" || e === "windows";
}
//@ chunk-fq0cr76a.js:834693-834726 esm-layout
function vK() {
  return Pe !== void 0;
}
//@ chunk-fq0cr76a.js:834726-835551 esm-fingerprint
function NI(e) {
  if (!II()) return { done: { errors: ["Unsupported platform"], warnings: [] } };
  let n = [],
    r = [],
    s = zv();
  if (s === "linux") {
    let h = e ?? Pe?.ripgrep ?? { command: "rg" };
    if (ha(h.command) === null) n.push(`ripgrep (${h.command}) not found`);
    let y = a1({ seccompConfig: Pe?.seccomp, bwrapPath: Pe?.bwrapPath, socatPath: Pe?.socatPath });
    (n.push(...y.errors), r.push(...y.warnings));
  } else if (s === "windows") {
    let h;
    try {
      h = si(Pe?.windows?.srtWin);
    } catch (error) {
      return (n.push(error.message), { done: { errors: n, warnings: r } });
    }
    return {
      windows: {
        sublayerGuid: Pe?.windows?.sublayerGuid ?? Pe?.windows?.wfpSublayerGuid,
        proxyPortRange: Pe?.windows?.proxyPortRange,
        sandboxUser: Pe?.windows?.sandboxUser,
        srtWin: h,
        ...(Pe && { allowLoopback: Pe.network?.allowLocalBinding === !0 }),
      },
    };
  }
  if (!Pe?.filesystem.disabled)
    try {
      let h = mx(eu(yg()));
      if (h !== void 0) r.push(h);
    } catch {}
  return { done: { errors: n, warnings: r } };
}
//@ chunk-fq0cr76a.js:835551-835627 esm-fingerprint
function wK(e) {
  let n = NI(e);
  if ("done" in n) return n.done;
  return uI(n.windows);
}
//@ chunk-fq0cr76a.js:835627-835782 esm-fingerprint
async function kI(e) {
  if (zv() === "linux" && !Pe?.seccomp?.argv0) await B6r(Pe?.seccomp?.applyPath);
  let n = NI(e);
  if ("done" in n) return n.done;
  return dI(n.windows);
}
//@ chunk-fq0cr76a.js:835782-836372 esm-fingerprint
function gg(e, n) {
  if (!e)
    return {
      denyReadPaths: [],
      unsetEnvVars: [],
      setEnvVars: {},
      maskedFileBinds: [],
      maskedFileStoreDir: void 0,
      degradeToDenyPaths: [],
    };
  let r = Du(e),
    s = [...new Set((n ?? []).map(Awn))],
    h = [];
  for (let D of e.envVars ?? []) if (D.mode === "deny") h.push(D.name);
  let { setEnvVars: setEnvVars, degradeToUnsetNames: degradeToUnsetNames } = RR(e.envVars ?? [], s, Sc);
  (h.push(...degradeToUnsetNames), DR(e.envVars ?? [], e.awsPairs, s, setEnvVars, hg));
  let S = e.files ?? [],
    { binds: binds, degradeToDenyPaths: degradeToDenyPaths } = AR(S, s, Sc, ep);
  return {
    denyReadPaths: [...new Set([...r, ...degradeToDenyPaths])],
    unsetEnvVars: [...new Set(h)],
    setEnvVars: setEnvVars,
    maskedFileBinds: binds,
    maskedFileStoreDir: ep.dirPath,
    degradeToDenyPaths: degradeToDenyPaths,
  };
}
//@ chunk-fq0cr76a.js:836372-836474 esm-fingerprint
function Du(e) {
  let n = e?.files ?? [];
  return [...new Set(n.filter((r) => r.mode === "deny").map((r) => r.path))];
}
//@ chunk-fq0cr76a.js:836474-836605 esm-fingerprint
function DI({ denyRead: denyRead, allowRead: allowRead, credentials: credentials }) {
  let s = BP(Hb([], void 0, Du(credentials)));
  return BP(Hb(denyRead, allowRead, [])).filter((h) => s.includes(h));
}
//@ chunk-fq0cr76a.js:836605-836793 esm-fingerprint
function* collectDenyPaths_2(e = [], n, r) {
  let s = yield* expandDenyPaths("deny", e, r),
    h = yield* expandDenyPaths("deny", n.denyReadPaths, r, n.degradeToDenyPaths);
  return { denyOnly: [...new Set([...s, ...h])], ...(h.length > 0 && { credentialDenyOnly: h }) };
}
//@ chunk-fq0cr76a.js:836793-836979 esm-fingerprint
function* expandDenyPaths(e, n, r, s = []) {
  let h = new Set(s),
    y = new Set();
  for (let b of Ph(n)) {
    let S = uy(b);
    if (zv() === "linux" && !h.has(b) && Ad(S)) for (let w of yield* Zw(b, S, e, r)) y.add(w);
    else y.add(S);
  }
  return [...y];
}
//@ chunk-fq0cr76a.js:836979-837153 esm-fingerprint
function fg(e, n) {
  return Ph(n)
    .map((r) => uy(r))
    .filter((r) => {
      if (zv() === "linux" && Ad(r) && !Gb(r, e))
        return (At(`[Sandbox] Skipping glob write pattern on Linux: ${r}`), !1);
      return !0;
    });
}
//@ chunk-fq0cr76a.js:837153-837304 esm-fingerprint
function* PI(e, n) {
  let matches = (yield* fsr(e, { anchor: n })).matches;
  return (
    At(`[Sandbox] Expanded allowRead glob pattern "${e}" to ${matches.length} paths on Linux`),
    matches
  );
}
//@ chunk-fq0cr76a.js:837304-837728 esm-fingerprint
function TK() {
  if (!Pe || Pe.filesystem.disabled) return { denyOnly: [], allowWithinDeny: [] };
  let e = gg(Pe.credentials, Pe.network.allowedDomains),
    n = Own(expandDenyPaths("allow", Pe.filesystem.allowRead ?? [], PI)),
    r = Yb(n, Pe.filesystem.allowRead, yg()),
    s = new Set(),
    h = new Map();
  return {
    ...Own(collectDenyPaths_2(Pe.filesystem.denyRead, e, (b, S) => zE(b, r, s, { anchor: S, listings: h }))),
    allowWithinDeny: n,
    unlistableDenyDirs: [...s],
    ...qb(Pe.filesystem.denyRead, Pe.filesystem.allowRead),
  };
}
//@ chunk-fq0cr76a.js:837728-838141 esm-fingerprint
function yg() {
  if (!Pe) return { allowOnly: BP(), denyWithinAllow: [] };
  if (Pe.filesystem.disabled) return { allowOnly: ["/"], denyWithinAllow: [] };
  let e = fg("allow", Pe.filesystem.allowWrite),
    n = fg("deny", Pe.filesystem.denyWrite);
  return {
    allowOnly: [
      ...DI({
        denyRead: Pe.filesystem.denyRead,
        allowRead: Pe.filesystem.allowRead,
        credentials: Pe.credentials,
      }),
      ...e,
    ],
    denyWithinAllow: n,
    ...jb(Pe.filesystem.allowWrite, Pe.filesystem.denyWrite),
  };
}
//@ chunk-fq0cr76a.js:838141-838516 esm-fingerprint
function AK(e, n) {
  let filesystem = e.filesystem;
  if (filesystem?.disabled) return { grantRead: [], grantWrite: [], denyRead: [...n], denyWrite: [] };
  let s = Au;
  return fx({
    allowRead: s(filesystem?.allowRead ?? [], { mode: "grant" }),
    allowWrite: s(filesystem?.allowWrite ?? [], { mode: "grant" }),
    denyRead: s(filesystem?.denyRead ?? [], { mode: "deny" }),
    denyWrite: s(filesystem?.denyWrite ?? [], { mode: "deny" }),
    credentialDeny: [...s(Du(e.credentials), { mode: "deny" }), ...n],
  });
}
//@ chunk-fq0cr76a.js:838516-838605 esm-fingerprint
function LI(e) {
  return [...e.maskedFileBinds.map((maskedFileBind) => maskedFileBind.realPath), ...e.degradeToDenyPaths];
}
//@ chunk-fq0cr76a.js:838605-838847 esm-fingerprint
function BI(e) {
  return {
    disabled: e.filesystem.disabled ?? !1,
    denyRead: [...e.filesystem.denyRead],
    denyWrite: [...e.filesystem.denyWrite],
    allowRead: [...(e.filesystem.allowRead ?? [])],
    allowWrite: [...e.filesystem.allowWrite],
    credFiles: Du(e.credentials),
  };
}
//@ chunk-fq0cr76a.js:838847-839040 esm-fingerprint
function CK(e, n) {
  return (
    e.disabled === n.disabled &&
    Qc(e.denyRead, n.denyRead) &&
    Qc(e.denyWrite, n.denyWrite) &&
    Qc(e.allowRead, n.allowRead) &&
    Qc(e.allowWrite, n.allowWrite) &&
    Qc(e.credFiles, n.credFiles)
  );
}
//@ chunk-fq0cr76a.js:839040-839088 esm-layout
function RK(e) {
  return cg !== void 0 && CK(cg, BI(e));
}
//@ chunk-fq0cr76a.js:839088-839489 esm-layout
function UI(e, n) {
  let r = (s) => (s ? "open" : "closed");
  return `network.allowLocalBinding asks for loopback ${r(e)}, but this session verified the network fence with loopback ${r(n)}. On Windows the loopback mode is fixed by the install and checked at initialize(): it cannot change for one command or through updateConfig(). Call reset() then initialize() with the new value; the installed mode must match it.`;
}
//@ chunk-fq0cr76a.js:839489-839632 esm-fingerprint
function IK() {
  if (!Pe) return {};
  let allowedDomains = Pe.network.allowedDomains,
    deniedDomains = Pe.network.deniedDomains;
  return { allowedHosts: allowedDomains, ...(deniedDomains.length > 0 && { deniedHosts: deniedDomains }) };
}
//@ chunk-fq0cr76a.js:839632-839683 esm-fingerprint
function FI() {
  return Pe?.network?.allowUnixSockets;
}
//@ chunk-fq0cr76a.js:839683-839737 esm-fingerprint
function EI() {
  return Pe?.network?.allowAllUnixSockets;
}
//@ chunk-fq0cr76a.js:839737-839789 esm-fingerprint
function wx() {
  return Pe?.network?.allowLocalBinding;
}
//@ chunk-fq0cr76a.js:839789-839839 esm-fingerprint
function MI() {
  return Pe?.network?.allowMachLookup;
}
//@ chunk-fq0cr76a.js:839839-839881 esm-fingerprint
function $I() {
  return Pe?.ignoreViolations;
}
//@ chunk-fq0cr76a.js:839881-839932 esm-fingerprint
function VI() {
  return Pe?.enableWeakerNestedSandbox;
}
//@ chunk-fq0cr76a.js:839932-839986 esm-fingerprint
function NK() {
  return Pe?.enableWeakerNetworkIsolation;
}
//@ chunk-fq0cr76a.js:839986-840028 esm-fingerprint
function kK() {
  return Pe?.allowAppleEvents;
}
//@ chunk-fq0cr76a.js:840028-840077 esm-fingerprint
function DK() {
  return Pe?.ripgrep ?? { command: "rg" };
}
//@ chunk-fq0cr76a.js:840077-840130 esm-fingerprint
function OK() {
  return Pe?.mandatoryDenySearchDepth ?? 3;
}
//@ chunk-fq0cr76a.js:840130-840186 esm-fingerprint
function xx() {
  return Pe?.filesystem?.allowGitConfig ?? !1;
}
//@ chunk-fq0cr76a.js:840186-840272 esm-fingerprint
function WI(e) {
  return [...(Pe?.git?.safeDirectories ?? []), ...(e?.git?.safeDirectories ?? [])];
}
//@ chunk-fq0cr76a.js:840272-840305 esm-fingerprint
function PK() {
  return Pe?.seccomp;
}
//@ chunk-fq0cr76a.js:840305-840329 esm-layout
function LK() {
  return yl;
}
//@ chunk-fq0cr76a.js:840329-840368 esm-fingerprint
function Tx() {
  return Si?.httpProxyPort;
}
//@ chunk-fq0cr76a.js:840368-840408 esm-fingerprint
function Ax() {
  return Si?.socksProxyPort;
}
//@ chunk-fq0cr76a.js:840408-840461 esm-fingerprint
function GI() {
  return Si?.linuxBridge?.httpSocketPath;
}
//@ chunk-fq0cr76a.js:840461-840515 esm-fingerprint
function HI() {
  return Si?.linuxBridge?.socksSocketPath;
}
//@ chunk-fq0cr76a.js:840515-840614 esm-layout
async function Cx() {
  if (!Pe) return !1;
  if (dl)
    try {
      return (await dl, !0);
    } catch {
      return !1;
    }
  return Si !== void 0;
}
//@ chunk-fq0cr76a.js:840614-840657 esm-layout
var BK = 2,
  yx = Symbol("replaced"),
  bx = !1,
  og = [];
//@ chunk-fq0cr76a.js:840657-840963 esm-fingerprint
async function UK(e) {
  if (bx)
    (e?.throwIfAborted(),
      await new Promise((r, s) => {
        let h = () => {
            (e?.removeEventListener("abort", y), r());
          },
          y = () => {
            (og.splice(og.indexOf(h), 1), s(e?.reason));
          };
        (og.push(h), e?.addEventListener("abort", y, { once: !0 }));
      }));
  bx = !0;
  let n = !1;
  return () => {
    if (n) return;
    n = !0;
    let r = og.shift();
    if (r) r();
    else bx = !1;
  };
}
//@ chunk-fq0cr76a.js:840963-841015 esm-layout
async function KI(e, n, r, s, h) {
  return qI(0, e, n, r, s, h);
}
//@ chunk-fq0cr76a.js:841015-841112 esm-layout
async function qI(e, n, r, s, h, y) {
  let b = await UK(h);
  try {
    return await FK(b, e, n, r, s, h, y);
  } finally {
    b();
  }
}
//@ chunk-fq0cr76a.js:841112-844848 esm-fingerprint
async function FK(e, n, r, s, h, y, b) {
  let S = zv(),
    w = b?.commandId;
  CI(r, b);
  let R = Pe,
    D = lg,
    O = xwn(),
    L = () => Pe !== R || lg !== D || xwn() !== O,
    V = () => (e(), qI(n + 1, r, s, h, y, b));
  function* K(ft) {
    for (;;) {
      if (L()) return yx;
      let rt = ft.next();
      if (rt.done) return rt.value;
      yield;
    }
  }
  let q = (ft) => {
      if (n < BK) return ili(K(ft), y);
      return (y?.throwIfAborted(), Own(ft));
    },
    Z = h?.filesystem !== void 0 ? (h.filesystem.disabled ?? !1) : (Pe?.filesystem.disabled ?? !1),
    J = gg(h?.credentials ?? Pe?.credentials, h?.network?.allowedDomains ?? Pe?.network?.allowedDomains),
    ie,
    ae;
  if (!Z) {
    let ft = fg("allow", h?.filesystem?.allowWrite ?? Pe?.filesystem.allowWrite ?? []);
    if (
      ((ie = {
        allowOnly: [
          ...DI({
            denyRead: h?.filesystem?.denyRead ?? Pe?.filesystem.denyRead ?? [],
            allowRead: h?.filesystem?.allowRead ?? Pe?.filesystem.allowRead,
            credentials: h?.credentials ?? Pe?.credentials,
          }),
          ...ft,
        ],
        denyWithinAllow: fg("deny", h?.filesystem?.denyWrite ?? Pe?.filesystem.denyWrite ?? []),
        ...jb(
          h?.filesystem?.allowWrite ?? Pe?.filesystem.allowWrite,
          h?.filesystem?.denyWrite ?? Pe?.filesystem.denyWrite,
        ),
      }),
      !mI)
    ) {
      mI = !0;
      try {
        let Ft = mx(eu(ie));
        if (Ft !== void 0) At(Ft, { level: "warn" });
      } catch {}
    }
    let rt = await q(
      expandDenyPaths("allow", h?.filesystem?.allowRead ?? Pe?.filesystem.allowRead ?? [], PI),
    );
    if (rt === yx) return V();
    let ut = [];
    if (Lr) ut.push(Lr.certPath, Lr.trustBundlePath);
    if (Cu) ut.push(Cu);
    rt.push(...ut);
    let we = Yb(rt, h?.filesystem?.allowRead ?? Pe?.filesystem.allowRead, ie),
      Ae = new Set(),
      dt = new Map(),
      Me = await q(
        collectDenyPaths_2(h?.filesystem?.denyRead ?? Pe?.filesystem.denyRead, J, (Ft, xn) =>
          zE(Ft, we, Ae, { anchor: xn, listings: dt }),
        ),
      );
    if ((dt.clear(), Me === yx)) return V();
    ae = {
      ...Me,
      allowWithinDeny: rt,
      ...(ut.length > 0 && { ownAllowWithinDeny: ut }),
      unlistableDenyDirs: [...Ae],
      ...qb(
        h?.filesystem?.denyRead ?? Pe?.filesystem.denyRead,
        h?.filesystem?.allowRead ?? Pe?.filesystem.allowRead,
      ),
    };
  }
  e();
  let Se = h?.network?.allowedDomains !== void 0 || Pe?.network?.allowedDomains !== void 0,
    ue = b?.denyAllNetwork === !0,
    me = Se || ue,
    Ne = Se && !ue;
  if (Ne) await Cx();
  if (L()) return V();
  let Ce = h?.allowPty ?? Pe?.allowPty,
    Ie = h?.allowNestedUserNamespaces ?? Pe?.allowNestedUserNamespaces,
    he = WI(h);
  switch (S) {
    case "macos":
      return G6r({
        command: r,
        commandId: w,
        needsNetworkRestriction: me,
        httpProxyPort: Ne ? Tx() : void 0,
        socksProxyPort: Ne ? Ax() : void 0,
        proxyAuthToken: Ne ? yl : void 0,
        caCertPath: Lr?.trustBundlePath,
        javaAgentJarPath: Ne ? Cu : void 0,
        readConfig: ae,
        writeConfig: ie,
        unsetEnvVars: J.unsetEnvVars,
        setEnvVars: J.setEnvVars,
        maskedFileBinds: J.maskedFileBinds,
        degradeToDenyPaths: J.degradeToDenyPaths,
        allowUnixSockets: ue ? void 0 : FI(),
        allowAllUnixSockets: ue ? !1 : EI(),
        allowLocalBinding: ue ? !1 : wx(),
        allowMachLookup: ue ? void 0 : MI(),
        ignoreViolations: $I(),
        allowPty: Ce,
        allowGitConfig: xx(),
        gitSafeDirectories: he,
        enableWeakerNetworkIsolation: ue ? !1 : NK(),
        allowAppleEvents: ue ? !1 : kK(),
        binShell: s,
      });
    case "linux":
      return d1({
        command: r,
        commandId: w,
        needsNetworkRestriction: me,
        httpSocketPath: Ne ? GI() : void 0,
        socksSocketPath: Ne ? HI() : void 0,
        httpProxyPort: Ne ? Si?.httpProxyPort : void 0,
        socksProxyPort: Ne ? Si?.socksProxyPort : void 0,
        proxyAuthToken: Ne ? yl : void 0,
        caCertPath: Lr?.trustBundlePath,
        javaAgentJarPath: Ne ? Cu : void 0,
        readConfig: ae,
        writeConfig: ie,
        unsetEnvVars: J.unsetEnvVars,
        setEnvVars: J.setEnvVars,
        maskedFileBinds: J.maskedFileBinds,
        maskedFileStoreDir: J.maskedFileStoreDir,
        enableWeakerNestedSandbox: ue ? !1 : VI(),
        allowNestedUserNamespaces: Ie,
        allowAllUnixSockets: ue ? !1 : EI(),
        binShell: s,
        ripgrepConfig: DK(),
        mandatoryDenySearchDepth: OK(),
        allowGitConfig: xx(),
        gitSafeDirectories: he,
        seccompConfig: PK(),
        bwrapPath: Pe?.bwrapPath,
        socatPath: Pe?.socatPath,
        observeSocketPath: Iu?.observeSocketPath,
        abortSignal: y,
      }).catch((ft) => {
        if (ft instanceof WorkingDirectoryChanged) return V();
        throw ft;
      });
    case "windows":
      throw Error(
        "wrapWithSandbox() returns a shell string and is not supported on Windows. Use SandboxManager.wrapWithSandboxArgv() and spawn the result with {shell: false}.",
      );
    default:
      throw Error(`Sandbox configuration is not supported on platform: ${S}`);
  }
}
//@ chunk-fq0cr76a.js:844848-846802 esm-fingerprint
async function MK(e, n, r, s, h, y) {
  if (zv() === "windows") {
    if (y?.denyAllNetwork === !0) throw Error("denyAllNetwork is not supported on Windows");
    let R = r?.network?.allowedDomains !== void 0 || Pe?.network?.allowedDomains !== void 0;
    if (R) await Cx();
    let D = gg(r?.credentials ?? Pe?.credentials, r?.network?.allowedDomains ?? Pe?.network?.allowedDomains),
      O = r?.filesystem,
      L = LI(D),
      V = [],
      K = [],
      q = [];
    if (!O?.disabled) {
      if (O?.allowRead?.length || O?.allowWrite?.length)
        throw Error(
          "Per-exec filesystem.allowRead/allowWrite is not supported " +
            "on Windows \u2014 `srt-win exec` only exposes per-exec " +
            "denies. Set them at the session level (initialize()).",
        );
      ((V = O?.denyRead ?? []), (K = O?.denyWrite ?? []), (q = Du(r?.credentials)));
    }
    let Z = [],
      J = [];
    if (V.length > 0 || K.length > 0 || q.length > 0 || L.length > 0) {
      let ae = new Set(ro?.denyRead ?? []),
        Se = new Set(ro?.denyWrite ?? []),
        ue = Au,
        me = fx({
          allowRead: [],
          allowWrite: [],
          denyRead: ue(V, { mode: "deny" }),
          denyWrite: ue(K, { mode: "deny" }),
          credentialDeny: [...ue(q, { mode: "deny" }), ...L],
          held: ro,
        });
      ((Z = me.denyRead.filter((Ce) => !ae.has(Ce))),
        (J = me.denyWrite.filter((Ce) => !ae.has(Ce) && !Se.has(Ce))));
    }
    sK(r?.windows?.srtWin ? si(r.windows.srtWin) : (ku ?? si(Pe?.windows?.srtWin)));
    let ie = (r?.network?.allowLocalBinding ?? wx()) === !0;
    if (ml !== void 0 && ie !== ml) throw new WindowsSandboxError("wfp_loopback_mismatch", UI(ie, ml));
    return (
      CI(e, y),
      aI({
        command: e,
        commandId: y?.commandId,
        httpProxyPort: R ? Tx() : void 0,
        socksProxyPort: R ? Ax() : void 0,
        proxyAuthToken: R ? yl : void 0,
        allowLoopback: ie,
        setEnvVars: D.setEnvVars,
        denyRead: Z,
        denyReadExcept: J1([...(ro?.grantRead ?? []), ...(ro?.grantWrite ?? [])], Z),
        denyWrite: J,
        cwd: h,
        allowWrite: ro?.grantWrite,
        gitSafeDirectories: WI(r),
        caCertPath: Lr?.trustBundlePath,
        heldBy: pl !== void 0 ? process.pid : void 0,
        writeRoots: ro?.grantWrite,
        binShell: ex(n),
        srtWin: r?.windows?.srtWin ? si(r.windows.srtWin) : (ku ?? si(Pe?.windows?.srtWin)),
      })
    );
  }
  if (typeof n === "object")
    throw Error("binShell object form is Windows-only; pass a shell path string on macOS/Linux");
  let S = await KI(e, n, r, s, y);
  return { argv: [n ?? "/bin/bash", "-c", S], env: process.env };
}
//@ chunk-fq0cr76a.js:846802-846826 esm-layout
function $K() {
  return Pe;
}
//@ chunk-fq0cr76a.js:846826-847521 esm-fingerprint
function VK(e) {
  if (zv() === "windows" && Pe && !RK(e))
    At(
      "[Sandbox Windows] updateConfig: the resolved file-access set " +
        "(filesystem.* \u222A credentials.files) changed but the ACL " +
        "stamp/grant is session-wide \u2014 call reset() then initialize() " +
        "to apply. The previously-applied set stays in effect.",
      { level: "warn" },
    );
  let n = e.network?.allowLocalBinding === !0;
  if (zv() === "windows" && Pe && ml !== void 0 && n !== ml)
    At("[Sandbox Windows] updateConfig: " + UI(n, ml) + " Commands are refused until then.", {
      level: "warn",
    });
  let r = Of(e.network),
    { filterRequest: filterRequest, ...h } = e.network;
  ((Pe = structuredClone({ ...e, network: h })),
    (Pe.network.filterRequest = filterRequest),
    lg++,
    (pg = r),
    (fl = p8o(e.network.parentProxy)),
    At("Sandbox configuration updated"));
}
//@ chunk-fq0cr76a.js:847521-847540 esm-layout
function WK() {
  Wf();
}
//@ chunk-fq0cr76a.js:847540-847552 esm-fingerprint
var GK = 1500;
//@ chunk-fq0cr76a.js:847552-848167 esm-fingerprint
function _I(e, n) {
  if (!e.pid || e.exitCode !== null || e.signalCode !== null) return Promise.resolve();
  try {
    (process.kill(e.pid, "SIGTERM"), At(`Sent SIGTERM to ${n} bridge process`));
  } catch (error) {
    if (error.code !== "ESRCH") At(`Error killing ${n} bridge: ${error}`, { level: "error" });
    return Promise.resolve();
  }
  return new Promise((r) => {
    let s = !1,
      h = () => {
        if (s) return;
        ((s = !0), clearTimeout(y), r());
      };
    e.once("exit", () => {
      (At(`${n} bridge process exited`), h());
    });
    let y = setTimeout(() => {
      if (e.exitCode === null && e.signalCode === null) {
        At(`${n} bridge did not exit, forcing SIGKILL`, { level: "warn" });
        try {
          if (e.pid) process.kill(e.pid, "SIGKILL");
        } catch {}
      }
      h();
    }, GK);
    y.unref?.();
  });
}
//@ chunk-fq0cr76a.js:848167-848409 esm-fingerprint
function HK(e) {
  return new Promise((n) => {
    if (typeof e.closeAllConnections === "function") e.closeAllConnections();
    e.close((r) => {
      if (r && r.message !== "Server is not running.")
        At(`Error closing HTTP proxy server: ${r.message}`, { level: "error" });
      n();
    });
  });
}
//@ chunk-fq0cr76a.js:848409-849445 esm-fingerprint
async function Rx() {
  if (ro && pl) AI(pl, ku);
  if (
    ((ro = void 0),
    (pl = void 0),
    (cg = void 0),
    (ku = void 0),
    (Jf = void 0),
    (Qf = []),
    ug.clear(),
    Wf({ force: !0 }),
    ag)
  )
    (ag(), (ag = void 0));
  if (Iu) (Iu.stop(), (Iu = void 0));
  if (Si?.linuxBridge) {
    let {
      httpSocketPath: httpSocketPath,
      socksSocketPath: socksSocketPath,
      httpBridgeProcess: httpBridgeProcess,
      socksBridgeProcess: socksBridgeProcess,
    } = Si.linuxBridge;
    if ((await Promise.all([_I(httpBridgeProcess, "HTTP"), _I(socksBridgeProcess, "SOCKS")]), httpSocketPath))
      try {
        (fsModule_3.rmSync(httpSocketPath, { force: !0 }), At("Cleaned up HTTP socket"));
      } catch (error) {
        At(`HTTP socket cleanup error: ${error}`, { level: "error" });
      }
    if (socksSocketPath)
      try {
        (fsModule_3.rmSync(socksSocketPath, { force: !0 }), At("Cleaned up SOCKS socket"));
      } catch (error) {
        At(`SOCKS socket cleanup error: ${error}`, { level: "error" });
      }
  }
  let e = [];
  if (Lr) e.push(RC(Lr));
  if (Ru)
    e.push(
      Ru.close().catch((n) => {
        At(`Error closing mux proxy server: ${n.message}`, { level: "error" });
      }),
    );
  if (Zf) e.push(HK(Zf));
  if (Xf) {
    let n = Xf.close().catch((r) => {
      At(`Error closing SOCKS proxy server: ${r.message}`, { level: "error" });
    });
    e.push(n);
  }
  (await Promise.all(e),
    (Ru = void 0),
    (Zf = void 0),
    (yl = void 0),
    (Xf = void 0),
    (Si = void 0),
    (dl = void 0),
    (fl = void 0),
    (pg = Of()),
    (Lr = void 0),
    (Cu = void 0),
    Sc.clear(),
    hg.clear(),
    yc.clear(),
    mg.clear(),
    ep.dispose());
}
//@ chunk-fq0cr76a.js:849445-849469 esm-layout
function KK() {
  return bc;
}
//@ chunk-fq0cr76a.js:849469-849667 esm-fingerprint
function qK(e, n) {
  if (!Pe) return n;
  let violationsForCommand = bc.getViolationsForCommand(e);
  if (violationsForCommand.length === 0) return n;
  let s = n;
  s += EOL + "<sandbox_violations>" + EOL;
  for (let h of violationsForCommand) s += h.line + EOL;
  return ((s += "</sandbox_violations>"), s);
}
//@ chunk-fq0cr76a.js:849667-850081 esm-fingerprint
function YK() {
  if (zv() !== "linux" || !Pe || Pe.filesystem.disabled) return [];
  let e = [],
    n = [...Pe.filesystem.allowWrite, ...Pe.filesystem.denyWrite];
  for (let r of n) {
    if (typeof r !== "string") continue;
    let s = uy(r);
    if (Ad(s)) e.push(r);
  }
  for (let r of [
    ...new Set([...Pe.filesystem.denyRead, ...Du(Pe.credentials)]),
    ...(Pe.filesystem.allowRead ?? []),
  ]) {
    if (typeof r !== "string") continue;
    let s = v8o(sS(r));
    if (Ad(uy(r)) && k8o(s)) e.push(r);
  }
  return e;
}
//@ chunk-fq0cr76a.js:850081-851013 esm-fingerprint
var on = {
  initialize: xK,
  isSupportedPlatform: II,
  isSandboxingEnabled: vK,
  checkDependencies: wK,
  checkDependenciesAsync: kI,
  getFsReadConfig: TK,
  getFsWriteConfig: yg,
  getNetworkRestrictionConfig: IK,
  getAllowUnixSockets: FI,
  getAllowLocalBinding: wx,
  getAllowMachLookup: MI,
  getIgnoreViolations: $I,
  getEnableWeakerNestedSandbox: VI,
  getProxyPort: Tx,
  getProxyAuthToken: LK,
  getSocksProxyPort: Ax,
  getLinuxHttpSocketPath: GI,
  getLinuxSocksSocketPath: HI,
  waitForNetworkInitialization: Cx,
  wrapWithSandbox: KI,
  wrapWithSandboxArgv: MK,
  registerCommandNetworkLists: uK,
  unregisterCommandNetworkLists: dK,
  askCallbackDenyReason: !0,
  denyAllNetworkOption: !0,
  cleanupAfterCommand: WK,
  reset: Rx,
  getMitmCA: () => Lr,
  getWindowsProfileRead: () => Jf,
  getWindowsProfileReadWarnings: () => [...Qf],
  getSentinelRegistry: () => Sc,
  getAwsPairRegistry: () => hg,
  getMaskedFileStore: () => ep,
  getSandboxViolationStore: KK,
  annotateStderrWithSandboxFailures: qK,
  getLinuxGlobPatternWarnings: YK,
  getConfig: $K,
  updateConfig: VK,
};

export { on, Mm };
