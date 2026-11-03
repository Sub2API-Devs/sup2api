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
import { request as request_2, Agent } from "https";
import { request } from "http";
import { isIPv4, isIPv6 } from "net";
import { lookup } from "dns";
import {
  isHostVouched,
  NOT_SERVED_MESSAGE,
  GatewayInternalNetworksError,
  hostCheckRetryHint,
  VOUCH_FAILED_MESSAGE,
  hostOf,
  isVouchableHttpsHost,
  vouchedHostSet,
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

//@ chunk-aepeg2w5.js:251301-252330 placement
/**
 * 由担保部署确认网关主机（[gateway] 日志）。
 */
async function checkVoucher(e, n, timeoutMs, s, helperClock) {
  if (!isHostVouched(e)) {
    logForDebugging(`[gateway] ${n} not vouched: it names no recognized vouching deployment`);
    s.notVouched = NOT_SERVED_MESSAGE;
    return false;
  }
  s.voucherNamed = true;
  let y;
  try {
    y = await queryGatewayHostCheck(e, n, {
      helperClock,
      timeoutMs,
      presentClientCertificate: true,
    });
  } catch (error) {
    logForDebugging(`[gateway] could not confirm ${n} with ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new GatewayInternalNetworksError(
      `${e} could not confirm that ${n} is a recognized Claude gateway host (${errorMessage(error)}). ` +
        hostCheckRetryHint(
          error,
          `Your network must allow HTTPS connections to ${e}, and ${n} must point at it in DNS. Try again.`,
        ),
      VOUCH_FAILED_MESSAGE,
      "voucher",
    );
  }
  if (!y.listed) {
    logForDebugging(`[gateway] ${n} not vouched: ${e} does not list it`);
    s.notVouched = `${e} does not list it among the gateway hosts it serves`;
    return false;
  }
  if (y.served !== true)
    throw new GatewayInternalNetworksError(
      y.served === null
        ? `${e} could not confirm right now that ${n} is a recognized Claude gateway host (it could not check DNS). Try again in a few minutes.`
        : `${e} reports that ${n}, one of its gateway hosts, does not currently point at it in DNS (a record that host's administrator can correct).`,
      VOUCH_FAILED_MESSAGE,
      "voucher",
    );
  return true;
}
//@ chunk-aepeg2w5.js:252330-253577 placement
/**
 * 验证网关主机（https、担保或允许列表）。
 */
async function verifyGatewayHost(e, n = [], r, s, voucher) {
  let y = new URL(e);
  if (y.protocol !== "https:")
    return {
      verified: false,
      reason: "it is not reached over https.",
    };
  let S = {
    voucherNamed: false,
  };
  let w =
    s === undefined
      ? undefined
      : () => ({
          verified: false,
          reason: S.notVouched === undefined ? s : `${s.replace(/\.\s*$/, "")}, and ${S.notVouched}.`,
        });
  let R = hostOf(y);
  if (w && !isVouchableHttpsHost(y, R)) return w();
  if (!vouchedHostSet.has(R))
    try {
      parseInternalNetworks(n);
    } catch (error) {
      holdGatewayHostStrict(R);
      return {
        unresolvedReason: errorMessage(error),
      };
    }
  try {
    let gatewayBasis = await resolveGatewayBasis(e, n, LOOKUP_TIMEOUT_MS, TOTAL_TIMEOUT_MS, r, S, voucher);
    if (gatewayBasis.basis === "vouched")
      return {
        verified: true,
        vouched: true,
      };
    if (w) return w();
    let network = gatewayBasis.basis === "network" ? gatewayBasis.network : undefined;
    if (network !== undefined) {
      await fetchGatewayCertificate(e, 1e4, network).catch((error) => {
        let L = classifyTlsError(error);
        throw error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? error
          : new GatewayInternalNetworksError(
              `Could not connect to gateway host ${R} to check it` +
                (L ? ` (${L})` : "") +
                ". Connect to your organization's network and try again.",
              "gateway session: declared-network probe did not complete",
              "probe",
            );
      });
      return {
        verified: true,
        network,
      };
    }
    return {
      verified: true,
    };
  } catch (error) {
    if (error instanceof GatewayInternalNetworksError) holdGatewayHostStrict(R);
    if (voucher !== undefined && error instanceof GatewayInternalNetworksError && S.notVouched === undefined)
      return {
        unresolvedReason: errorMessage(error),
      };
    if (
      error instanceof GatewayInternalNetworksError &&
      !(error.unresolved === "gateway" && getUsableProxyUrl() !== undefined && !shouldBypassProxy(e)) &&
      !(w && error.unresolved !== "voucher")
    )
      return {
        unresolvedReason: errorMessage(error),
      };
    logForDebugging(`[gateway] host not accepted as a managed-settings source: ${errorMessage(error)}`, {
      level: "warn",
    });
    return (
      w?.() ?? {
        verified: false,
        reason: errorMessage(error),
      }
    );
  }
}
//@ chunk-aepeg2w5.js:253577-254870 placement
/**
 * 获取网关证书指纹（Bun 版本限制）。
 */
async function fetchGatewayCertificate(e, timeout = 1e4, network, s) {
  if (s?.onlyRoot !== undefined && true && !satisfies("1.4.4", ">=1.4.0"))
    throw Error("this runtime, Bun 1.3 or earlier, trusts its own store beside the one root given");
  let h = new URL(e);
  let y = hostOf(h);
  if (h.protocol !== "https:")
    return {
      hostname: y,
      fingerprint: HTTP_LOOPBACK,
    };
  let S = h.port ? Number(h.port) : 443;
  let w = caListFor(anthropicHostOf(e));
  let mtlsConfig = getMTLSConfig();
  let usableProxyUrl = getUsableProxyUrl();
  let P =
    usableProxyUrl && !shouldBypassProxy(e)
      ? await connectThroughProxy(usableProxyUrl, y, S, timeout)
      : undefined;
  return new Promise((resolve, reject) => {
    let G = connect(
      {
        host: y,
        port: S,
        ...proxyTlsOptions(y),
        socket: P,
        timeout,
        ...(s === undefined
          ? mtlsConfig
          : {
              rejectUnauthorized: true,
            }),
        ...(s?.onlyRoot === undefined
          ? w && {
              ca: w,
            }
          : {
              ca: [s.onlyRoot],
            }),
      },
      () => {
        try {
          let localAddress = G.localAddress ?? "";
          let ee = P ? "" : (G.remoteAddress ?? "");
          let q =
            s?.onlyRoot === undefined ||
            G.getPeerX509Certificate()?.checkHost(y, {
              wildcards: false,
              subject: "never",
            }) !== undefined;
          let peerCertificate = G.getPeerCertificate();
          let re =
            typeof peerCertificate?.fingerprint256 === "string"
              ? peerCertificate.fingerprint256.replaceAll(":", "").toLowerCase()
              : "";
          G.destroy();
          let se = network === undefined ? undefined : checkAddressInNetwork(network, y, localAddress, ee);
          if (se) reject(se);
          else if (!q)
            reject(Error("the certificate does not carry the exact DNS hostname in a subjectAltName"));
          else if (!re) reject(Error("could not read TLS certificate fingerprint"));
          else
            resolve({
              hostname: y,
              fingerprint: re,
              localAddress,
              remoteAddress: ee,
            });
        } catch (error) {
          G.destroy();
          reject(Error(errorMessage(error)));
        }
      },
    );
    G.setTimeout(timeout);
    G.once("error", (j) => reject(Error(errorMessage(j))));
    G.once("timeout", () => {
      G.destroy();
      P?.destroy();
      reject(Error("TLS connection timed out"));
    });
  });
}
//@ chunk-aepeg2w5.js:254870-255578 placement
/**
 * 通过 HTTP(S) 代理 CONNECT 到网关。
 */
function connectThroughProxy(usableProxyUrl, n, r, timeout = 1e4) {
  let h = new URL(usableProxyUrl);
  let y = h.protocol === "https:";
  let S = y ? request_2 : request;
  let w = n.includes(":") ? `[${n}]` : n;
  let R = {
    Host: `${w}:${r}`,
  };
  if (h.username) {
    let F = `${decodeURIComponent(h.username)}:${decodeURIComponent(h.password)}`;
    R["Proxy-Authorization"] = "Basic " + Buffer.from(F).toString("base64");
  }
  let caCertificates = getCACertificates();
  let P = hostOf(h);
  return new Promise((resolve, reject) => {
    let G = S({
      host: P,
      port: h.port || (y ? 443 : 80),
      method: "CONNECT",
      path: `${w}:${r}`,
      timeout,
      headers: R,
      ...(y && {
        ...(caCertificates && {
          ca: caCertificates,
        }),
        ...getMTLSConfig(),
        ...proxyTlsOptions(P),
      }),
    });
    G.once("connect", (j, ee) => {
      if (j.statusCode !== 200) {
        ee.destroy();
        reject(Error(`proxy CONNECT failed: ${j.statusCode}`));
      } else resolve(ee);
    });
    G.once("error", (j) => reject(Error(errorMessage(j))));
    G.once("timeout", () => {
      G.destroy();
      reject(Error("proxy CONNECT timed out"));
    });
    G.end();
  });
}
//@ chunk-aepeg2w5.js:255578-255732 placement
/**
 * 网关 TLS 固定存储被拒/不可读的消息。
 */
var PIN_STORE_SYMLINK_MESSAGE = "gateway TLS pin store refused: the credentials file is a symlink";
var PIN_STORE_UNREADABLE_MESSAGE = "gateway TLS pin store unreadable: the credentials file could not be read";
//@ chunk-aepeg2w5.js:255732-256136 placement
/**
 * 读取保存的网关信任记录（证书固定）。
 */
async function readGatewayTrust(e, n) {
  let async = await getSecureStorage().readAsync(n);
  let s = async?.gatewayTrust?.[e];
  if (s !== undefined) return s;
  if ((!async || Object.keys(async).length === 0) && isStorageV5Enabled() && n !== undefined) {
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
/**
 * 网关主机解析到公网地址时的错误文案。
 */
var PUBLIC_ADDRESS_MODEL_MESSAGE = "gateway host resolved to a public address";
//@ chunk-aepeg2w5.js:256188-256671 placement
/**
 * 创建带证书固定的 HTTPS agent。
 */
function createPinnedAgent(e, network) {
  let r = new URL(e);
  let s = hostOf(r);
  let h = isIPv4(s) || isIPv6(s);
  if (
    r.protocol !== "https:" ||
    vouchedHostSet.has(s) ||
    (h && network === undefined) ||
    (getUsableProxyUrl() !== undefined && !shouldBypassProxy(e))
  )
    return;
  let y = caListFor(anthropicHostOf(e));
  let S = new Agent({
    ...getMTLSConfig(),
    ...(y && {
      ca: y,
    }),
    lookup: privateOnlyLookup(network),
  });
  if (network !== undefined) {
    let w = S.createConnection.bind(S);
    S.createConnection = (R, x) => {
      let P = w(R, x);
      P?.prependOnceListener("connect", () => {
        let { localAddress = "", remoteAddress = "" } = P;
        let G = checkAddressInNetwork(network, s, localAddress, remoteAddress);
        if (G)
          P.destroy(
            Object.assign(Error(PUBLIC_ADDRESS_MODEL_MESSAGE), {
              code: "EADDRNOTPRIVATE",
              cause: G,
            }),
          );
      });
      return P;
    };
  }
  return S;
}
//@ chunk-aepeg2w5.js:256671-256927 placement
function privateOnlyLookup(e) {
  return function (r, s, h) {
    lookup(
      r,
      {
        ...s,
        all: true,
      },
      (y, S) => {
        let w = S ?? [];
        let found = w.find((P) => (e ? !ipInCidr(P.address, e) : !isInternalAddress(P.address)));
        let x =
          y ??
          (found
            ? Object.assign(Error(PUBLIC_ADDRESS_MODEL_MESSAGE), {
                code: "EADDRNOTPRIVATE",
              })
            : null);
        if (s.all) h(x, x ? [] : w);
        else h(x, w[0]?.address ?? "", w[0]?.family);
      },
    );
  };
}
//@ chunk-aepeg2w5.js:256927-256999 placement
/**
 * 网关 TLS 证书与固定指纹不符时的错误文案。
 */
var PIN_MISMATCH_MESSAGE = "gateway TLS certificate does not match the pinned fingerprint";
//@ chunk-aepeg2w5.js:256999-257375 placement
/**
 * 从错误中取证书固定不匹配信息。
 */
function pinMismatchFromError(e) {
  let cause = typeof e === "object" && e !== null && "cause" in e ? e.cause : undefined;
  for (let r of [e, cause])
    if (
      r instanceof Error &&
      r.message.includes(PIN_MISMATCH_MESSAGE) &&
      "pinnedFingerprint" in r &&
      typeof r.pinnedFingerprint === "string" &&
      "presentedFingerprint" in r &&
      typeof r.presentedFingerprint === "string"
    )
      return {
        pinnedFingerprint: r.pinnedFingerprint,
        presentedFingerprint: r.presentedFingerprint,
      };
  return;
}
//@ chunk-aepeg2w5.js:257375-257733 placement
/**
 * 证书固定的 TLS 选项（校验指纹）。
 */
function pinnedTlsOptions(e, n, r = false) {
  let s = caListFor(anthropicHostOf(n));
  return new Agent({
    ...(r
      ? {
          rejectUnauthorized: true,
        }
      : getMTLSConfig()),
    ...(s && {
      ca: s,
    }),
    checkServerIdentity: (h, y) => {
      let S = checkServerIdentity(h, y);
      if (S) return S;
      let w = typeof y.fingerprint256 === "string" ? y.fingerprint256.replaceAll(":", "").toLowerCase() : "";
      if (w !== e) {
        let R = {
          pinnedFingerprint: e,
          presentedFingerprint: w,
        };
        return Object.assign(Error(PIN_MISMATCH_MESSAGE), R);
      }
      return;
    },
  });
}
//@ chunk-aepeg2w5.js:257733-258015 placement
/**
 * 按信任记录生成固定证书的 agent（经 HTTPS 代理时不能固定并记录）。
 */
function pinnedAgentFor(e, n, r = false) {
  if (!e || new URL(n).protocol !== "https:") return;
  if (getUsableProxyUrl() && !shouldBypassProxy(n)) {
    logForDebugging(
      `[gateway] ${new URL(n).host} is reached through the HTTPS proxy \u2014 per-request cert pin not applied (known gap; list the gateway in NO_PROXY to pin)`,
      {
        level: "warn",
      },
    );
    return;
  }
  return pinnedTlsOptions(e, n, r);
}
//@ chunk-aepeg2w5.js:258015-258220 placement
/**
 * 把网关 TLS 固定写入安全存储。
 */
async function saveGatewayTlsPin(hostname, fingerprint, credentials) {
  let s = await getSecureStorage().mutate(
    (h) => ({
      ...h,
      gatewayTrust: {
        ...(h.gatewayTrust ?? {}),
        [hostname]: fingerprint,
      },
    }),
    credentials,
  );
  if (!s.success) throw Error(`Failed to persist gateway TLS pin${s.warning ? `: ${s.warning}` : ""}`);
}
export {
  verifyGatewayHost,
  fetchGatewayCertificate,
  readGatewayTrust,
  pinnedAgentFor,
  createPinnedAgent,
  PIN_STORE_SYMLINK_MESSAGE,
  PIN_STORE_UNREADABLE_MESSAGE,
  PIN_MISMATCH_MESSAGE,
  pinMismatchFromError,
  PUBLIC_ADDRESS_MODEL_MESSAGE,
  saveGatewayTlsPin,
  checkVoucher,
};
