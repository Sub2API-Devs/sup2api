/**
 * services/gateway/vouching.ts
 *
 * 2.1.316 新增：获取网关证书指纹（Bun 版本限制）；验证网关主机（https、担保或允许列表）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (14)
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

//@ chunk-exfmq47h.js:260815-261844 placement
/**
 * 由担保部署确认网关主机（[gateway] 日志）。
 */
async function checkVoucher(voucherHost, hostname, timeoutMs, voucherState, helperClock) {
  if (!isHostVouched(voucherHost)) {
    logForDebugging(`[gateway] ${hostname} not vouched: it names no recognized vouching deployment`);
    voucherState.notVouched = NOT_SERVED_MESSAGE;
    return false;
  }
  voucherState.voucherNamed = true;
  let answer;
  try {
    answer = await queryGatewayHostCheck(voucherHost, hostname, {
      helperClock,
      timeoutMs,
      presentClientCertificate: true,
    });
  } catch (error) {
    logForDebugging(`[gateway] could not confirm ${hostname} with ${voucherHost}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new GatewayInternalNetworksError(
      `${voucherHost} could not confirm that ${hostname} is a recognized Claude gateway host (${errorMessage(error)}). ` +
        hostCheckRetryHint(
          error,
          `Your network must allow HTTPS connections to ${voucherHost}, and ${hostname} must point at it in DNS. Try again.`,
        ),
      VOUCH_FAILED_MESSAGE,
      "voucher",
    );
  }
  if (!answer.listed) {
    logForDebugging(`[gateway] ${hostname} not vouched: ${voucherHost} does not list it`);
    voucherState.notVouched = `${voucherHost} does not list it among the gateway hosts it serves`;
    return false;
  }
  if (answer.served !== true)
    throw new GatewayInternalNetworksError(
      answer.served === null
        ? `${voucherHost} could not confirm right now that ${hostname} is a recognized Claude gateway host (it could not check DNS). Try again in a few minutes.`
        : `${voucherHost} reports that ${hostname}, one of its gateway hosts, does not currently point at it in DNS (a record that host's administrator can correct).`,
      VOUCH_FAILED_MESSAGE,
      "voucher",
    );
  return true;
}
//@ chunk-exfmq47h.js:261844-263091 placement
/**
 * 验证网关主机（https、担保或允许列表）。
 */
async function verifyGatewayHost(
  gatewayUrl,
  internalNetworkEntries = [],
  credentials,
  notManagedReason,
  options,
) {
  let parsedUrl = new URL(gatewayUrl);
  if (parsedUrl.protocol !== "https:")
    return {
      verified: false,
      reason: "it is not reached over https.",
    };
  let voucherState = {
    voucherNamed: false,
  };
  let notManagedResult =
    notManagedReason === undefined
      ? undefined
      : () => ({
          verified: false,
          reason:
            voucherState.notVouched === undefined
              ? notManagedReason
              : `${notManagedReason.replace(/\.\s*$/, "")}, and ${voucherState.notVouched}.`,
        });
  let hostname = hostOf(parsedUrl);
  if (notManagedResult && !isVouchableHttpsHost(parsedUrl, hostname)) return notManagedResult();
  if (!vouchedHostSet.has(hostname))
    try {
      parseInternalNetworks(internalNetworkEntries);
    } catch (error) {
      holdGatewayHostStrict(hostname);
      return {
        unresolvedReason: errorMessage(error),
      };
    }
  try {
    let gatewayBasis = await resolveGatewayBasis(
      gatewayUrl,
      internalNetworkEntries,
      LOOKUP_TIMEOUT_MS,
      TOTAL_TIMEOUT_MS,
      credentials,
      voucherState,
      options,
    );
    if (gatewayBasis.basis === "vouched")
      return {
        verified: true,
        vouched: true,
      };
    if (notManagedResult) return notManagedResult();
    let network = gatewayBasis.basis === "network" ? gatewayBasis.network : undefined;
    if (network !== undefined) {
      await fetchGatewayCertificate(gatewayUrl, 1e4, network).catch((error) => {
        let tlsProblem = classifyTlsError(error);
        throw error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
          ? error
          : new GatewayInternalNetworksError(
              `Could not connect to gateway host ${hostname} to check it` +
                (tlsProblem ? ` (${tlsProblem})` : "") +
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
    if (error instanceof GatewayInternalNetworksError) holdGatewayHostStrict(hostname);
    if (
      options !== undefined &&
      error instanceof GatewayInternalNetworksError &&
      voucherState.notVouched === undefined
    )
      return {
        unresolvedReason: errorMessage(error),
      };
    if (
      error instanceof GatewayInternalNetworksError &&
      !(
        error.unresolved === "gateway" &&
        getUsableProxyUrl() !== undefined &&
        !shouldBypassProxy(gatewayUrl)
      ) &&
      !(notManagedResult && error.unresolved !== "voucher")
    )
      return {
        unresolvedReason: errorMessage(error),
      };
    logForDebugging(`[gateway] host not accepted as a managed-settings source: ${errorMessage(error)}`, {
      level: "warn",
    });
    return (
      notManagedResult?.() ?? {
        verified: false,
        reason: errorMessage(error),
      }
    );
  }
}
//@ chunk-exfmq47h.js:263091-264384 placement
/**
 * 获取网关证书指纹（Bun 版本限制）。
 */
async function fetchGatewayCertificate(url, timeout = 1e4, network, options) {
  if (options?.onlyRoot !== undefined && true && !satisfies("1.4.4", ">=1.4.0"))
    throw Error("this runtime, Bun 1.3 or earlier, trusts its own store beside the one root given");
  let parsedUrl = new URL(url);
  let hostname = hostOf(parsedUrl);
  if (parsedUrl.protocol !== "https:")
    return {
      hostname,
      fingerprint: HTTP_LOOPBACK,
    };
  let port = parsedUrl.port ? Number(parsedUrl.port) : 443;
  let caCerts = caListFor(anthropicHostOf(url));
  let mtlsConfig = getMTLSConfig();
  let usableProxyUrl = getUsableProxyUrl();
  let proxySocket =
    usableProxyUrl && !shouldBypassProxy(url)
      ? await connectThroughProxy(usableProxyUrl, hostname, port, timeout)
      : undefined;
  return new Promise((resolve, reject) => {
    let socket = connect(
      {
        host: hostname,
        port,
        ...proxyTlsOptions(hostname),
        socket: proxySocket,
        timeout,
        ...(options === undefined
          ? mtlsConfig
          : {
              rejectUnauthorized: true,
            }),
        ...(options?.onlyRoot === undefined
          ? caCerts && {
              ca: caCerts,
            }
          : {
              ca: [options.onlyRoot],
            }),
      },
      () => {
        try {
          let localAddress = socket.localAddress ?? "";
          let remoteAddress = proxySocket ? "" : (socket.remoteAddress ?? "");
          let hostnameChecked =
            options?.onlyRoot === undefined ||
            socket.getPeerX509Certificate()?.checkHost(hostname, {
              wildcards: false,
              subject: "never",
            }) !== undefined;
          let peerCertificate = socket.getPeerCertificate();
          let fingerprint =
            typeof peerCertificate?.fingerprint256 === "string"
              ? peerCertificate.fingerprint256.replaceAll(":", "").toLowerCase()
              : "";
          socket.destroy();
          let networkProblem =
            network === undefined
              ? undefined
              : checkAddressInNetwork(network, hostname, localAddress, remoteAddress);
          if (networkProblem) reject(networkProblem);
          else if (!hostnameChecked)
            reject(Error("the certificate does not carry the exact DNS hostname in a subjectAltName"));
          else if (!fingerprint) reject(Error("could not read TLS certificate fingerprint"));
          else
            resolve({
              hostname,
              fingerprint,
              localAddress,
              remoteAddress,
            });
        } catch (error) {
          socket.destroy();
          reject(Error(errorMessage(error)));
        }
      },
    );
    socket.setTimeout(timeout);
    socket.once("error", (error) => reject(Error(errorMessage(error))));
    socket.once("timeout", () => {
      socket.destroy();
      proxySocket?.destroy();
      reject(Error("TLS connection timed out"));
    });
  });
}
//@ chunk-exfmq47h.js:264384-265092 placement
/**
 * 通过 HTTP(S) 代理 CONNECT 到网关。
 */
function connectThroughProxy(usableProxyUrl, hostname, port, timeout = 1e4) {
  let proxyUrl = new URL(usableProxyUrl);
  let secure = proxyUrl.protocol === "https:";
  let requestFn = secure ? request_2 : request;
  let hostPort = hostname.includes(":") ? `[${hostname}]` : hostname;
  let headers = {
    Host: `${hostPort}:${port}`,
  };
  if (proxyUrl.username) {
    let credentials = `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`;
    headers["Proxy-Authorization"] = "Basic " + Buffer.from(credentials).toString("base64");
  }
  let caCertificates = getCACertificates();
  let proxyHost = hostOf(proxyUrl);
  return new Promise((resolve, reject) => {
    let request = requestFn({
      host: proxyHost,
      port: proxyUrl.port || (secure ? 443 : 80),
      method: "CONNECT",
      path: `${hostPort}:${port}`,
      timeout,
      headers,
      ...(secure && {
        ...(caCertificates && {
          ca: caCertificates,
        }),
        ...getMTLSConfig(),
        ...proxyTlsOptions(proxyHost),
      }),
    });
    request.once("connect", (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(Error(`proxy CONNECT failed: ${response.statusCode}`));
      } else resolve(socket);
    });
    request.once("error", (error) => reject(Error(errorMessage(error))));
    request.once("timeout", () => {
      request.destroy();
      reject(Error("proxy CONNECT timed out"));
    });
    request.end();
  });
}
//@ chunk-exfmq47h.js:265092-265246 placement
/**
 * 网关 TLS 固定存储被拒/不可读的消息。
 */
var PIN_STORE_SYMLINK_MESSAGE = "gateway TLS pin store refused: the credentials file is a symlink";
var PIN_STORE_UNREADABLE_MESSAGE = "gateway TLS pin store unreadable: the credentials file could not be read";
//@ chunk-exfmq47h.js:265246-265650 placement
/**
 * 读取保存的网关信任记录（证书固定）。
 */
async function readGatewayTrust(hostKey, credentials) {
  let async = await getSecureStorage().readAsync(credentials);
  let trust = async?.gatewayTrust?.[hostKey];
  if (trust !== undefined) return trust;
  if ((!async || Object.keys(async).length === 0) && isStorageV5Enabled() && credentials !== undefined) {
    let credentialsStrict = await credentials.readCredentialsStrict();
    switch (credentialsStrict.state) {
      case "present":
        return credentialsStrict.data.gatewayTrust?.[hostKey];
      case "refused-symlink":
        throw Error(PIN_STORE_SYMLINK_MESSAGE);
      case "read-failed":
        throw Error(PIN_STORE_UNREADABLE_MESSAGE);
      case "absent":
      case "corrupt":
        return;
      default: {
        let unexpected = credentialsStrict;
        throw Error(PIN_STORE_UNREADABLE_MESSAGE);
      }
    }
  }
  return;
}
//@ chunk-exfmq47h.js:265650-265702 placement
/**
 * 网关主机解析到公网地址时的错误文案。
 */
var PUBLIC_ADDRESS_MODEL_MESSAGE = "gateway host resolved to a public address";
//@ chunk-exfmq47h.js:265702-266185 placement
/**
 * 创建带证书固定的 HTTPS agent。
 */
function createPinnedAgent(url, network) {
  let parsedUrl = new URL(url);
  let hostname = hostOf(parsedUrl);
  let isIpLiteral = isIPv4(hostname) || isIPv6(hostname);
  if (
    parsedUrl.protocol !== "https:" ||
    vouchedHostSet.has(hostname) ||
    (isIpLiteral && network === undefined) ||
    (getUsableProxyUrl() !== undefined && !shouldBypassProxy(url))
  )
    return;
  let caCerts = caListFor(anthropicHostOf(url));
  let agent = new Agent({
    ...getMTLSConfig(),
    ...(caCerts && {
      ca: caCerts,
    }),
    lookup: privateOnlyLookup(network),
  });
  if (network !== undefined) {
    let createConnection = agent.createConnection.bind(agent);
    agent.createConnection = (options, callback) => {
      let socket = createConnection(options, callback);
      socket?.prependOnceListener("connect", () => {
        let { localAddress = "", remoteAddress = "" } = socket;
        let problem = checkAddressInNetwork(network, hostname, localAddress, remoteAddress);
        if (problem)
          socket.destroy(
            Object.assign(Error(PUBLIC_ADDRESS_MODEL_MESSAGE), {
              code: "EADDRNOTPRIVATE",
              cause: problem,
            }),
          );
      });
      return socket;
    };
  }
  return agent;
}
//@ chunk-exfmq47h.js:266185-266441 placement
function privateOnlyLookup(network) {
  return function (hostname, options, callback) {
    lookup(
      hostname,
      {
        ...options,
        all: true,
      },
      (error, addresses) => {
        let list = addresses ?? [];
        let found = list.find((entry) =>
          network ? !ipInCidr(entry.address, network) : !isInternalAddress(entry.address),
        );
        let finalError =
          error ??
          (found
            ? Object.assign(Error(PUBLIC_ADDRESS_MODEL_MESSAGE), {
                code: "EADDRNOTPRIVATE",
              })
            : null);
        if (options.all) callback(finalError, finalError ? [] : list);
        else callback(finalError, list[0]?.address ?? "", list[0]?.family);
      },
    );
  };
}
//@ chunk-exfmq47h.js:266441-266513 placement
/**
 * 网关 TLS 证书与固定指纹不符时的错误文案。
 */
var PIN_MISMATCH_MESSAGE = "gateway TLS certificate does not match the pinned fingerprint";
//@ chunk-exfmq47h.js:266513-266889 placement
/**
 * 从错误中取证书固定不匹配信息。
 */
function pinMismatchFromError(error) {
  let cause = typeof error === "object" && error !== null && "cause" in error ? error.cause : undefined;
  for (let candidate of [error, cause])
    if (
      candidate instanceof Error &&
      candidate.message.includes(PIN_MISMATCH_MESSAGE) &&
      "pinnedFingerprint" in candidate &&
      typeof candidate.pinnedFingerprint === "string" &&
      "presentedFingerprint" in candidate &&
      typeof candidate.presentedFingerprint === "string"
    )
      return {
        pinnedFingerprint: candidate.pinnedFingerprint,
        presentedFingerprint: candidate.presentedFingerprint,
      };
  return;
}
//@ chunk-exfmq47h.js:266889-267247 placement
/**
 * 证书固定的 TLS 选项（校验指纹）。
 */
function pinnedTlsOptions(fingerprint, url, requireVerification = false) {
  let caCerts = caListFor(anthropicHostOf(url));
  return new Agent({
    ...(requireVerification
      ? {
          rejectUnauthorized: true,
        }
      : getMTLSConfig()),
    ...(caCerts && {
      ca: caCerts,
    }),
    checkServerIdentity: (hostname, cert) => {
      let error = checkServerIdentity(hostname, cert);
      if (error) return error;
      let presentedFingerprint =
        typeof cert.fingerprint256 === "string" ? cert.fingerprint256.replaceAll(":", "").toLowerCase() : "";
      if (presentedFingerprint !== fingerprint) {
        let details = {
          pinnedFingerprint: fingerprint,
          presentedFingerprint,
        };
        return Object.assign(Error(PIN_MISMATCH_MESSAGE), details);
      }
      return;
    },
  });
}
//@ chunk-exfmq47h.js:267247-267529 placement
/**
 * 按信任记录生成固定证书的 agent（经 HTTPS 代理时不能固定并记录）。
 */
function pinnedAgentFor(credentials, url, allowAll = false) {
  if (!credentials || new URL(url).protocol !== "https:") return;
  if (getUsableProxyUrl() && !shouldBypassProxy(url)) {
    logForDebugging(
      `[gateway] ${new URL(url).host} is reached through the HTTPS proxy \u2014 per-request cert pin not applied (known gap; list the gateway in NO_PROXY to pin)`,
      {
        level: "warn",
      },
    );
    return;
  }
  return pinnedTlsOptions(credentials, url, allowAll);
}
//@ chunk-exfmq47h.js:267529-267734 placement
/**
 * 把网关 TLS 固定写入安全存储。
 */
async function saveGatewayTlsPin(hostname, fingerprint, credentials) {
  let state = await getSecureStorage().mutate(
    (current) => ({
      ...current,
      gatewayTrust: {
        ...(current.gatewayTrust ?? {}),
        [hostname]: fingerprint,
      },
    }),
    credentials,
  );
  if (!state.success)
    throw Error(`Failed to persist gateway TLS pin${state.warning ? `: ${state.warning}` : ""}`);
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
  checkVoucher,
  saveGatewayTlsPin,
};
