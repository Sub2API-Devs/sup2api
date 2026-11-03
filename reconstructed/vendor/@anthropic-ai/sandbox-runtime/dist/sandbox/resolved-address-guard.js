/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/resolved-address-guard.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { networkInterfaces } from "os";
import { BlockList, isIP, isIP as isIP_2, isIP as isIP_3, isIP as isIP_4, isIP as isIP_5 } from "net";
import { lookup } from "dns";
import { u8o, Pqt, CTt, rli, oli, M3r } from "./address.js";
import { _8o } from "./domain-pattern.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:650968-651542 esm-fingerprint
var u5 = [
    "100.100.100.200",
    "168.63.129.16",
    "192.0.0.192",
    "fd00:ec2::/32",
    "fd20:ce::254",
    "fd00:c1::a9fe:a9fe",
    "fd00:42::42",
    "fd00:a9fe:a9fe::1",
    "fd00:100::100:200",
  ],
  kC = [
    ["a loopback address", u8o],
    ["an unspecified address", ["0.0.0.0/8", "::"]],
    ["a link-local address", ["169.254.0.0/16", "fe80::/10"]],
    ["a multicast address", ["224.0.0.0/4", "ff00::/8"]],
    ["the broadcast address", ["255.255.255.255"]],
    ["a cloud metadata address", u5],
  ],
  d5 = [
    "a deny-listed address",
    ...kC.map(([e]) => e),
    "a listed address",
    "one of this host's addresses",
    "a non-loopback address",
    "an unparsable address",
  ];
//@ chunk-fq0cr76a.js:651542-651650 esm-fingerprint
function f5() {
  let e;
  try {
    e = networkInterfaces();
  } catch {
    return [];
  }
  return Object.values(e)
    .flat()
    .flatMap((n) => (n ? [n.address] : []));
}
//@ chunk-fq0cr76a.js:651650-651865 esm-fingerprint
class ResolvedAddressDeniedError extends Error {
  constructor(e, n, r) {
    super(`Connection to ${e} blocked: ${n}`);
    ((this.hostname = e),
      (this.reason = n),
      (this.addresses = r),
      (this.code = "ERR_SRT_RESOLVED_ADDRESS_DENIED"),
      (this.name = "ResolvedAddressDeniedError"));
  }
}
//@ chunk-fq0cr76a.js:651865-651903 esm-layout
function ol(e) {
  return e instanceof ResolvedAddressDeniedError;
}
//@ chunk-fq0cr76a.js:651903-652198 esm-fingerprint
function xm(e) {
  let n = { anyPort: new BlockList(), byPort: new Map() };
  for (let r of e) {
    let { range: range, port: port } = typeof r === "string" ? { range: r, port: void 0 } : r,
      y = port === void 0 ? n.anyPort : n.byPort.get(port);
    if (!y) n.byPort.set(port, (y = new BlockList()));
    if (!Pqt(y, range)) throw Error(`Invalid IP address or CIDR range: ${JSON.stringify(range)}`);
  }
  return n;
}
//@ chunk-fq0cr76a.js:652198-652285 esm-fingerprint
function cE(e, n, r) {
  let s = e.byPort.get(r);
  return CTt(e.anyPort, n) || (s !== void 0 && CTt(s, n));
}
//@ chunk-fq0cr76a.js:652285-653509 esm-fingerprint
function Of(e = {}) {
  let n = xm(_8o(e.deniedDomains ?? [])),
    r = xm(_8o(e.allowedDomains ?? [])),
    s = [...kC.map(([w, R]) => [w, xm(R)]), ["a listed address", xm(e.deniedResolvedAddresses ?? [])]],
    h = e.resolve ?? lookup,
    y = () => {
      let w = new BlockList();
      for (let R of (e.localAddresses ?? f5)()) Pqt(w, R);
      return w;
    },
    b = (w, R, D, O) => {
      if (isIP_3(w)) return;
      if (!isIP_3(R)) return "an unparsable address";
      let L = rli(R),
        V = (q) => cE(q, R, D) || (L !== void 0 && cE(q, L, D));
      if (V(n)) return "a deny-listed address";
      if (cE(r, R, D)) return;
      if (oli(w)) return M3r(R) ? void 0 : "a non-loopback address";
      let K = s.find(([, q]) => V(q))?.[0];
      if (K) return K;
      if (CTt(O, R) || (L !== void 0 && CTt(O, L))) return "one of this host's addresses";
      return;
    };
  return {
    permits: (w, R, D) => b(w, R, D, y()) === void 0,
    lookupFor: (w) => (R, D, O) => {
      h(R, { ...D, all: !0 }, (L, V) => {
        if (L) {
          O(L, []);
          return;
        }
        let K = y(),
          q = [],
          Z = [],
          J = new Set();
        for (let Se of V) {
          let ue = b(R, Se.address, w, K);
          if (ue === void 0) q.push(Se);
          else (Z.push(Se.address), J.add(ue));
        }
        let filtered = d5.filter((Se) => J.has(Se));
        if (Z.length) At(`Denied address(es) for ${R}:${w}: ${Z.join(", ")} (${filtered.join("; ")})`);
        let ae = q[0];
        if (!ae) {
          let Se = Z.length
            ? new ResolvedAddressDeniedError(R, `resolved to ${filtered.join(" / ")}`, Z)
            : Object.assign(Error(`getaddrinfo ENOTFOUND ${R}`), { code: "ENOTFOUND" });
          O(Se, []);
          return;
        }
        if (D.all) O(null, q);
        else O(null, ae.address, ae.family);
      });
    },
  };
}

export { ol, Of };
