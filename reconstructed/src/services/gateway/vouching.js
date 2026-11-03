/**
 * services/gateway/vouching.ts
 *
 * 2.1.316 新增：获取网关证书指纹（Bun 版本限制）；验证网关主机（https、担保或允许列表）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (14)
 * attribution: placement 14
 */
import { connect, checkServerIdentity } from "tls";
import { request as request_2, request as request_3, Agent, Agent as Agent_2 } from "https";
import { request } from "http";
import { isIPv4, isIPv6 } from "net";
import { lookup } from "dns";
import {
  yF,
  NOT_SERVED_MESSAGE,
  Et,
  hostCheckRetryHint,
  VOUCH_FAILED_MESSAGE,
  hostOf,
  US,
  Xa,
  parseInternalNetworks,
  resolveGatewayBasis,
  LOOKUP_TIMEOUT_MS,
  TOTAL_TIMEOUT_MS,
  HTTP_LOOPBACK,
  checkAddressInNetwork,
  isInternalAddress,
} from "./internalNetworks.js";
import { logForDebugging } from "../../utils/debug.js";
import { queryGatewayHostCheck, classifyTlsError } from "./hostCheck.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { holdGatewayHostStrict } from "../../bootstrap/state.js";
import { getUsableProxyUrl, shouldBypassProxy, proxyTlsOptions } from "../../utils/proxy.js";
import { satisfies } from "../../utils/semver.js";
import { caListFor, getCACertificates } from "../../utils/caCerts.js";
import { anthropicHostOf } from "../../utils/anthropicHosts.js";
import { getMTLSConfig } from "../../utils/mtls.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { ipInCidr } from "../../utils/cidr.js";

/**
 * 由担保部署确认网关主机（[gateway] 日志）。
 */
//@ chunk-aepeg2w5.js:251301-252330 placement
async function checkVoucher(e, n, r, s, h) {
  if (!yF(e))
    return (
      logForDebugging(`[gateway] ${n} not vouched: it names no recognized vouching deployment`),
      (s.notVouched = NOT_SERVED_MESSAGE),
      !1
    );
  s.voucherNamed = !0;
  let y;
  try {
    y = await queryGatewayHostCheck(e, n, { helperClock: h, timeoutMs: r, presentClientCertificate: !0 });
  } catch (error) {
    throw (
      logForDebugging(`[gateway] could not confirm ${n} with ${e}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      new Et(
        `${e} could not confirm that ${n} is a recognized Claude gateway host (${errorMessage(error)}). ` +
          hostCheckRetryHint(
            error,
            `Your network must allow HTTPS connections to ${e}, and ${n} must point at it in DNS. Try again.`,
          ),
        VOUCH_FAILED_MESSAGE,
        "voucher",
      )
    );
  }
  if (!y.listed)
    return (
      logForDebugging(`[gateway] ${n} not vouched: ${e} does not list it`),
      (s.notVouched = `${e} does not list it among the gateway hosts it serves`),
      !1
    );
  if (y.served !== !0)
    throw new Et(
      y.served === null
        ? `${e} could not confirm right now that ${n} is a recognized Claude gateway host (it could not check DNS). Try again in a few minutes.`
        : `${e} reports that ${n}, one of its gateway hosts, does not currently point at it in DNS (a record that host's administrator can correct).`,
      VOUCH_FAILED_MESSAGE,
      "voucher",
    );
  return !0;
}
/**
 * 验证网关主机（https、担保或允许列表）。
 */
//@ chunk-aepeg2w5.js:252330-253577 placement
async function verifyGatewayHost(e, n = [], r, s, h) {
  let y = new URL(e);
  if (y.protocol !== "https:") return { verified: !1, reason: "it is not reached over https." };
  let S = { voucherNamed: !1 },
    w =
      s === void 0
        ? void 0
        : () => ({
            verified: !1,
            reason: S.notVouched === void 0 ? s : `${s.replace(/\.\s*$/, "")}, and ${S.notVouched}.`,
          }),
    R = hostOf(y);
  if (w && !US(y, R)) return w();
  if (!Xa.has(R))
    try {
      parseInternalNetworks(n);
    } catch (error) {
      return (holdGatewayHostStrict(R), { unresolvedReason: errorMessage(error) });
    }
  try {
    let x = await resolveGatewayBasis(e, n, LOOKUP_TIMEOUT_MS, TOTAL_TIMEOUT_MS, r, S, h);
    if (x.basis === "vouched") return { verified: !0, vouched: !0 };
    if (w) return w();
    let P = x.basis === "network" ? x.network : void 0;
    if (P !== void 0)
      return (
        await fetchGatewayCertificate(e, 1e4, P).catch((F) => {
          let L = classifyTlsError(F);
          throw F instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            ? F
            : new Et(
                `Could not connect to gateway host ${R} to check it` +
                  (L ? ` (${L})` : "") +
                  ". Connect to your organization's network and try again.",
                "gateway session: declared-network probe did not complete",
                "probe",
              );
        }),
        { verified: !0, network: P }
      );
    return { verified: !0 };
  } catch (error) {
    if (error instanceof Et) holdGatewayHostStrict(R);
    if (h !== void 0 && error instanceof Et && S.notVouched === void 0)
      return { unresolvedReason: errorMessage(error) };
    if (
      error instanceof Et &&
      !(error.unresolved === "gateway" && getUsableProxyUrl() !== void 0 && !shouldBypassProxy(e)) &&
      !(w && error.unresolved !== "voucher")
    )
      return { unresolvedReason: errorMessage(error) };
    return (
      logForDebugging(`[gateway] host not accepted as a managed-settings source: ${errorMessage(error)}`, {
        level: "warn",
      }),
      w?.() ?? { verified: !1, reason: errorMessage(error) }
    );
  }
}
/**
 * 获取网关证书指纹（Bun 版本限制）。
 */
//@ chunk-aepeg2w5.js:253577-254870 placement
async function fetchGatewayCertificate(e, n = 1e4, r, s) {
  if (s?.onlyRoot !== void 0 && !0 && !satisfies("1.4.4", ">=1.4.0"))
    throw Error("this runtime, Bun 1.3 or earlier, trusts its own store beside the one root given");
  let h = new URL(e),
    y = hostOf(h);
  if (h.protocol !== "https:") return { hostname: y, fingerprint: HTTP_LOOPBACK };
  let S = h.port ? Number(h.port) : 443,
    w = caListFor(anthropicHostOf(e)),
    R = getMTLSConfig(),
    x = getUsableProxyUrl(),
    P = x && !shouldBypassProxy(e) ? await connectThroughProxy(x, y, S, n) : void 0;
  return new Promise((F, L) => {
    let G = connect(
      {
        host: y,
        port: S,
        ...proxyTlsOptions(y),
        socket: P,
        timeout: n,
        ...(s === void 0 ? R : { rejectUnauthorized: !0 }),
        ...(s?.onlyRoot === void 0 ? w && { ca: w } : { ca: [s.onlyRoot] }),
      },
      () => {
        try {
          let j = G.localAddress ?? "",
            ee = P ? "" : (G.remoteAddress ?? ""),
            q =
              s?.onlyRoot === void 0 ||
              G.getPeerX509Certificate()?.checkHost(y, { wildcards: !1, subject: "never" }) !== void 0,
            peerCertificate = G.getPeerCertificate(),
            re =
              typeof peerCertificate?.fingerprint256 === "string"
                ? peerCertificate.fingerprint256.replaceAll(":", "").toLowerCase()
                : "";
          G.destroy();
          let se = r === void 0 ? void 0 : checkAddressInNetwork(r, y, j, ee);
          if (se) L(se);
          else if (!q) L(Error("the certificate does not carry the exact DNS hostname in a subjectAltName"));
          else if (!re) L(Error("could not read TLS certificate fingerprint"));
          else F({ hostname: y, fingerprint: re, localAddress: j, remoteAddress: ee });
        } catch (error) {
          (G.destroy(), L(Error(errorMessage(error))));
        }
      },
    );
    (G.setTimeout(n),
      G.once("error", (j) => L(Error(errorMessage(j)))),
      G.once("timeout", () => {
        (G.destroy(), P?.destroy(), L(Error("TLS connection timed out")));
      }));
  });
}
/**
 * 通过 HTTP(S) 代理 CONNECT 到网关。
 */
//@ chunk-aepeg2w5.js:254870-255578 placement
function connectThroughProxy(e, n, r, s = 1e4) {
  let h = new URL(e),
    y = h.protocol === "https:",
    S = y ? request_2 : request,
    w = n.includes(":") ? `[${n}]` : n,
    R = { Host: `${w}:${r}` };
  if (h.username) {
    let F = `${decodeURIComponent(h.username)}:${decodeURIComponent(h.password)}`;
    R["Proxy-Authorization"] = "Basic " + Buffer.from(F).toString("base64");
  }
  let x = getCACertificates(),
    P = hostOf(h);
  return new Promise((F, L) => {
    let G = S({
      host: P,
      port: h.port || (y ? 443 : 80),
      method: "CONNECT",
      path: `${w}:${r}`,
      timeout: s,
      headers: R,
      ...(y && { ...(x && { ca: x }), ...getMTLSConfig(), ...proxyTlsOptions(P) }),
    });
    (G.once("connect", (j, ee) => {
      if (j.statusCode !== 200) (ee.destroy(), L(Error(`proxy CONNECT failed: ${j.statusCode}`)));
      else F(ee);
    }),
      G.once("error", (j) => L(Error(errorMessage(j)))),
      G.once("timeout", () => {
        (G.destroy(), L(Error("proxy CONNECT timed out")));
      }),
      G.end());
  });
}
/**
 * 网关 TLS 固定存储被拒/不可读的消息。
 */
//@ chunk-aepeg2w5.js:255578-255732 placement
var PIN_STORE_SYMLINK_MESSAGE = "gateway TLS pin store refused: the credentials file is a symlink",
  PIN_STORE_UNREADABLE_MESSAGE = "gateway TLS pin store unreadable: the credentials file could not be read";
/**
 * 读取保存的网关信任记录（证书固定）。
 */
//@ chunk-aepeg2w5.js:255732-256136 placement
async function readGatewayTrust(e, n) {
  let async = await getSecureStorage().readAsync(n),
    s = async?.gatewayTrust?.[e];
  if (s !== void 0) return s;
  if ((!async || Object.keys(async).length === 0) && isStorageV5Enabled() && n !== void 0) {
    let credentialsStrict = await n.readCredentialsStrict();
    switch (credentialsStrict.state) {
      case "present":
        return credentialsStrict.data.gatewayTrust?.[e];
      case "refused-symlink":
        throw Error(PIN_STORE_SYMLINK_MESSAGE);
      case "read-failed":
        throw Error(PIN_STORE_UNREADABLE_MESSAGE);
      case "absent":
      case "corrupt":
        return;
      default: {
        let S = credentialsStrict;
        throw Error(PIN_STORE_UNREADABLE_MESSAGE);
      }
    }
  }
  return;
}
//@ chunk-aepeg2w5.js:256136-256188 placement
var Lpr = "gateway host resolved to a public address";
/**
 * 创建带证书固定的 HTTPS agent。
 */
//@ chunk-aepeg2w5.js:256188-256671 placement
function createPinnedAgent(e, n) {
  let r = new URL(e),
    s = hostOf(r),
    h = isIPv4(s) || isIPv6(s);
  if (
    r.protocol !== "https:" ||
    Xa.has(s) ||
    (h && n === void 0) ||
    (getUsableProxyUrl() !== void 0 && !shouldBypassProxy(e))
  )
    return;
  let y = caListFor(anthropicHostOf(e)),
    S = new Agent({ ...getMTLSConfig(), ...(y && { ca: y }), lookup: privateOnlyLookup(n) });
  if (n !== void 0) {
    let w = S.createConnection.bind(S);
    S.createConnection = (R, x) => {
      let P = w(R, x);
      return (
        P?.prependOnceListener("connect", () => {
          let { localAddress: localAddress = "", remoteAddress: remoteAddress = "" } = P,
            G = checkAddressInNetwork(n, s, localAddress, remoteAddress);
          if (G) P.destroy(Object.assign(Error(Lpr), { code: "EADDRNOTPRIVATE", cause: G }));
        }),
        P
      );
    };
  }
  return S;
}
//@ chunk-aepeg2w5.js:256671-256927 placement
function privateOnlyLookup(e) {
  return function (r, s, h) {
    lookup(r, { ...s, all: !0 }, (y, S) => {
      let w = S ?? [],
        found = w.find((P) => (e ? !ipInCidr(P.address, e) : !isInternalAddress(P.address))),
        x = y ?? (found ? Object.assign(Error(Lpr), { code: "EADDRNOTPRIVATE" }) : null);
      if (s.all) h(x, x ? [] : w);
      else h(x, w[0]?.address ?? "", w[0]?.family);
    });
  };
}
//@ chunk-aepeg2w5.js:256927-256999 placement
var Npr = "gateway TLS certificate does not match the pinned fingerprint";
/**
 * 从错误中取证书固定不匹配信息。
 */
//@ chunk-aepeg2w5.js:256999-257375 placement
function pinMismatchFromError(e) {
  let n = typeof e === "object" && e !== null && "cause" in e ? e.cause : void 0;
  for (let r of [e, n])
    if (
      r instanceof Error &&
      r.message.includes(Npr) &&
      "pinnedFingerprint" in r &&
      typeof r.pinnedFingerprint === "string" &&
      "presentedFingerprint" in r &&
      typeof r.presentedFingerprint === "string"
    )
      return { pinnedFingerprint: r.pinnedFingerprint, presentedFingerprint: r.presentedFingerprint };
  return;
}
/**
 * 证书固定的 TLS 选项（校验指纹）。
 */
//@ chunk-aepeg2w5.js:257375-257733 placement
function pinnedTlsOptions(e, n, r = !1) {
  let s = caListFor(anthropicHostOf(n));
  return new Agent({
    ...(r ? { rejectUnauthorized: !0 } : getMTLSConfig()),
    ...(s && { ca: s }),
    checkServerIdentity: (h, y) => {
      let S = checkServerIdentity(h, y);
      if (S) return S;
      let w = typeof y.fingerprint256 === "string" ? y.fingerprint256.replaceAll(":", "").toLowerCase() : "";
      if (w !== e) {
        let R = { pinnedFingerprint: e, presentedFingerprint: w };
        return Object.assign(Error(Npr), R);
      }
      return;
    },
  });
}
/**
 * 按信任记录生成固定证书的 agent（经 HTTPS 代理时不能固定并记录）。
 */
//@ chunk-aepeg2w5.js:257733-258015 placement
function pinnedAgentFor(e, n, r = !1) {
  if (!e || new URL(n).protocol !== "https:") return;
  if (getUsableProxyUrl() && !shouldBypassProxy(n)) {
    logForDebugging(
      `[gateway] ${new URL(n).host} is reached through the HTTPS proxy \u2014 per-request cert pin not applied (known gap; list the gateway in NO_PROXY to pin)`,
      { level: "warn" },
    );
    return;
  }
  return pinnedTlsOptions(e, n, r);
}
/**
 * 把网关 TLS 固定写入安全存储。
 */
//@ chunk-aepeg2w5.js:258015-258220 placement
async function saveGatewayTlsPin(e, n, r) {
  let mutate = await getSecureStorage().mutate(
    (h) => ({ ...h, gatewayTrust: { ...(h.gatewayTrust ?? {}), [e]: n } }),
    r,
  );
  if (!mutate.success)
    throw Error(`Failed to persist gateway TLS pin${mutate.warning ? `: ${mutate.warning}` : ""}`);
}

export {
  verifyGatewayHost,
  fetchGatewayCertificate,
  readGatewayTrust,
  pinnedAgentFor,
  createPinnedAgent,
  PIN_STORE_SYMLINK_MESSAGE,
  PIN_STORE_UNREADABLE_MESSAGE,
  Npr,
  pinMismatchFromError,
  Lpr,
  saveGatewayTlsPin,
  checkVoucher,
};
