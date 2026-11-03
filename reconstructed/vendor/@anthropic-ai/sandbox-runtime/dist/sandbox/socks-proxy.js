/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/socks-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (9)
 * attribution: esm-layout 3, esm-fingerprint 6
 */
import { yR } from "../../../../@pondwader/socks5-server/dist/index.mjs";
import { SRT, Iwn } from "./sandbox-utils.js";
import { At } from "../utils/debug.js";
import { Twn, JF, rsr, osr, D3r, ssr } from "./parent-proxy.js";
import { ol } from "./resolved-address-guard.js";

//@ chunk-fq0cr76a.js:698926-698968 esm-layout
var buffer = Buffer.from([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
//@ chunk-fq0cr76a.js:698968-700805 esm-fingerprint
function bR(e) {
  let n = yR();
  if (e.proxyAuthToken)
    n.setAuthHandler((h, y, b) => {
      if ((h.username === SRT || h.username.startsWith(`${SRT}.`)) && h.password === e.proxyAuthToken) y();
      else (At("SOCKS auth rejected", { level: "error" }), b());
    });
  n.setRulesetValidator((h) => {
    if (e.refuseOpaqueTunnels) {
      (At(`SOCKS CONNECT to ${JSON.stringify(h.destAddress)}:${h.destPort} refused (refuseOpaqueTunnels)`),
        e.onTunnelRefused?.(h.destPort, h.destAddress, Iwn(h.username)),
        h.socket.end(buffer, () => h.socket.destroy()));
      return;
    }
    return r(h);
  });
  async function r(h) {
    try {
      let { destAddress: destAddress, destPort: destPort } = h;
      if (!Twn(destAddress))
        return (At(`Rejecting malformed SOCKS host: ${JSON.stringify(destAddress)}`, { level: "error" }), !1);
      if (
        (At(`Connection request to ${destAddress}:${destPort}`),
        !(await e.filter(destPort, destAddress, Iwn(h.username))))
      )
        return (At(`Connection blocked to ${destAddress}:${destPort}`, { level: "error" }), !1);
      return (At(`Connection allowed to ${destAddress}:${destPort}`), !0);
    } catch (error) {
      return (At(`Error validating connection: ${error}`, { level: "error" }), !1);
    }
  }
  n.setConnectionHandler((h, y) => {
    let b = JF(h.destAddress) ?? h.destAddress,
      destPort = h.destPort,
      w = !1,
      R;
    (h.socket.once("close", () => {
      ((w = !0), R?.destroy());
    }),
      h.socket.on("error", () => R?.destroy()));
    let D = e.parentProxy && !rsr(e.parentProxy, b) ? osr(e.parentProxy, { isHttps: !0 }) : void 0;
    (D ? D3r(D, b, destPort) : ssr(b, destPort, e.lookupFor?.(destPort, Iwn(h.username))))
      .then((L) => {
        if (((R = L), L.on("error", () => h.socket.destroy()), w)) {
          L.destroy();
          return;
        }
        (y("REQUEST_GRANTED"), L.pipe(h.socket), h.socket.pipe(L), L.on("close", () => h.socket.destroy()));
      })
      .catch((L) => {
        if ((At(`SOCKS connect to ${b}:${destPort} failed: ${L.message}`, { level: "error" }), !w))
          try {
            y(ol(L) ? "CONNECTION_NOT_ALLOWED" : "HOST_UNREACHABLE");
          } catch {}
      });
  });
  let s = new Set();
  return {
    handleConnection(h) {
      if ((h.setNoDelay(), s.add(h), h.once("close", () => s.delete(h)), !e.proxyAuthToken)) {
        n._handleConnection(h);
        return;
      }
      RH(h, (y) => {
        if (y) {
          n._handleConnection(h);
          return;
        }
        IH(h, e).catch(() => h.destroy());
      });
    },
    async close() {
      for (let h of s) h.destroy();
      s.clear();
    },
  };
}
//@ chunk-fq0cr76a.js:700805-700819 esm-layout
var AH = 0,
  CH = 2;
//@ chunk-fq0cr76a.js:700819-701161 esm-fingerprint
function RH(e, n) {
  let alloc = Buffer.alloc(0),
    s = (h) => {
      if (((alloc = Buffer.concat([alloc, h])), alloc.length < 2)) return;
      if (alloc[0] !== 5) {
        (e.off("data", s), e.destroy());
        return;
      }
      let y = alloc[1];
      if (alloc.length < 2 + y) return;
      (e.off("data", s), e.pause());
      let included = alloc.subarray(2, 2 + y).includes(CH),
        w = included ? alloc : alloc.subarray(2 + y);
      if (w.length > 0) e.unshift(w);
      n(included);
    };
  (e.on("data", s), e.once("error", () => e.off("data", s)));
}
//@ chunk-fq0cr76a.js:701161-701748 esm-fingerprint
async function IH(e, n) {
  e.write(Buffer.from([5, AH]));
  let r = await NH(e);
  if (r === void 0) {
    e.destroy();
    return;
  }
  let { host: host, port: port } = r;
  if (!Twn(host)) {
    e.end(CE(2));
    return;
  }
  let y = n.probeUnauthenticated ? await n.probeUnauthenticated(port, host) : {};
  if (
    (At(
      `SOCKS unauthenticated client refused for ${host}:${port}` +
        (y.deniedReason !== void 0 ? " (denied by policy)" : ""),
    ),
    port !== 22)
  ) {
    e.end(CE(2));
    return;
  }
  let b =
    y.deniedReason ??
    "This proxy requires authentication, and this client did not offer an authentication method, so the connection was refused.";
  (e.write(CE(0)),
    e.write(
      Buffer.from(`SSH-2.0-policy_refusal\r
`),
    ),
    e.end(kH(b)));
}
//@ chunk-fq0cr76a.js:701748-701805 esm-layout
function CE(e) {
  return Buffer.from([5, e, 0, 1, 0, 0, 0, 0, 0, 0]);
}
//@ chunk-fq0cr76a.js:701805-702561 esm-fingerprint
function NH(e) {
  return new Promise((n) => {
    let alloc = Buffer.alloc(0),
      s = (b) => {
        (e.off("data", y), clearTimeout(h), n(b));
      },
      h = setTimeout(() => s(void 0), 5000),
      y = (b) => {
        if (((alloc = Buffer.concat([alloc, b])), alloc.length < 4)) return;
        if (alloc[0] !== 5 || alloc[1] !== 1) {
          s(void 0);
          return;
        }
        let S = alloc[3];
        if (S === 1) {
          if (alloc.length < 10) return;
          let joined = Array.from(alloc.subarray(4, 8)).join(".");
          s({ host: joined, port: alloc.readUInt16BE(8) });
        } else if (S === 3) {
          if (alloc.length < 5) return;
          let w = alloc[4];
          if (alloc.length < 5 + w + 2) return;
          s({ host: alloc.subarray(5, 5 + w).toString("utf8"), port: alloc.readUInt16BE(5 + w) });
        } else if (S === 4) {
          if (alloc.length < 22) return;
          let w = [];
          for (let R = 0; R < 16; R += 2) w.push(alloc.readUInt16BE(4 + R).toString(16));
          s({ host: w.join(":"), port: alloc.readUInt16BE(20) });
        } else s(void 0);
      };
    (e.on("data", y), e.resume(), e.once("error", () => s(void 0)), e.once("close", () => s(void 0)));
  });
}
//@ chunk-fq0cr76a.js:702561-702857 esm-fingerprint
function kH(e) {
  let sliced = e.replace(/[\x00-\x1f\x7f-\x9f]+/g, " ").slice(0, 1000),
    buffer = Buffer.from(sliced, "utf8"),
    alloc = Buffer.alloc(0),
    buffer_2 = Buffer.concat([Buffer.from([1]), Fm(1), Fm(buffer.length), buffer, Fm(alloc.length), alloc]),
    y = 8 - ((5 + buffer_2.length) % 8);
  if (y < 4) y += 8;
  return Buffer.concat([Fm(1 + buffer_2.length + y), Buffer.from([y]), buffer_2, Buffer.alloc(y)]);
}
//@ chunk-fq0cr76a.js:702857-702924 esm-fingerprint
function Fm(e) {
  let alloc = Buffer.alloc(4);
  return (alloc.writeUInt32BE(e, 0), alloc);
}

export { bR };
