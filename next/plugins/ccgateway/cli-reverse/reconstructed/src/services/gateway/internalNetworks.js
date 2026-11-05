/**
 * services/gateway/internalNetworks.ts
 *
 * 2.1.316 新增：通过代理或直连检查网关地址；判定网关可信依据（已列出、内网、担保）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (32)
 * attribution: placement 32
 */
import { isIPv4, isIPv6 } from "net";
import { createHmac, X509Certificate } from "crypto";
import { rootCertificates } from "tls";
import { lookup as lookup_2 } from "dns/promises";
import {
  PRIVATE_NETWORKS,
  NON_PUBLIC_NETWORKS,
  RESERVED_NETWORKS,
  DOCUMENTATION_NETWORKS,
} from "../../../vendor/ip-address/dist/ipv4.js";
import { ipInCidr } from "../../utils/cidr.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { UNREADABLE_SETTING_MARKER } from "../../utils/settings/types.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getCACertificates } from "../../utils/caCerts.js";
import { PEM_CERT_BLOCK_RE } from "../../utils/mtls.js";
import { logForDebugging } from "../../utils/debug.js";
import { fetchGatewayCertificate, checkVoucher } from "./vouching.js";
import { withTimeout } from "../../utils/sleep.js";
import { releaseGatewayHost, holdGatewayHostStrict } from "../../bootstrap/state.js";
import { getUsableProxyUrl, shouldBypassProxy, getProxyUrl } from "../../utils/proxy.js";
import { GatewayHostCheckError, GatewayHostCheckRetryableError, queryGatewayHostCheck } from "./hostCheck.js";
import { getHttpsHostname } from "../../tools/WebFetchTool/utils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:248419-248729 placement
/**
 * 地址是否为内网或回环（含 IPv4 映射）
 */
function isInternalAddress(address) {
  let lower = address.replace(/%.*$/, "").toLowerCase();
  if (isIPv4(lower)) return PRIVATE_NETWORKS.some((range) => ipInCidr(lower, range));
  if (!isIPv6(lower)) return false;
  let match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (match?.[1]) return isInternalAddress(match[1]);
  if (lower === "::1") return true;
  let range = parseInt(/^([0-9a-f]{1,4}):/.exec(lower)?.[1] ?? "0", 16);
  return (range >= 65152 && range <= 65215) || (range >= 64512 && range <= 65023);
}
//@ chunk-exfmq47h.js:248729-248808 placement
/**
 * 网关内部网络列表非法时的错误（带未解析的类型）。
 */
let GatewayInternalNetworksError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:248729", () => {
  GatewayInternalNetworksError = class GatewayInternalNetworksError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    unresolved;
    constructor(message, telemetry, unresolved) {
      super(message, telemetry);
      this.unresolved = unresolved;
    }
  };
});
//@ chunk-exfmq47h.js:248808-248828 placement
/**
 * 网关设置/信任相关的通用错误类型。
 */
let GatewayTrustError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:248808", () => {
  GatewayTrustError = class GatewayTrustError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-exfmq47h.js:248828-248848 placement
/**
 * 网关客户允许列表相关的错误类型。
 */
let GatewayAllowlistError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:248828", () => {
  GatewayAllowlistError = class GatewayAllowlistError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-exfmq47h.js:248848-248862 placement
/**
 * 网关内部网络的校验常量：of 是允许的最短 CIDR 前缀 8（/8 到 /32）；ES 是最多接受的块数 4。
 */
var MIN_CIDR_PREFIX = 8;
var MAX_INTERNAL_BLOCKS = 4;
//@ chunk-exfmq47h.js:248862-250184 placement
/**
 * 解析托管设置 gatewayInternalNetworks（CIDR 列表，拒绝私有/保留/文档地址）。
 */
function parseInternalNetworks(rawEntries) {
  let invalid = (problem) =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gatewayInternalNetworks in managed settings ${problem}.`,
      "gateway login: invalid gatewayInternalNetworks",
    );
  if (rawEntries.includes(UNREADABLE_SETTING_MARKER))
    throw invalid("is not a list of CIDR strings; sign-in is refused until it is fixed");
  let mapped = rawEntries.map((rawEntry) => {
    let trimmed = rawEntry.trim();
    let [address = "", prefixText = ""] = trimmed.split("/");
    let prefix = Number(prefixText);
    let reduced = address.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
    if (
      !isIPv4(address) ||
      !ipInCidr(address, trimmed) ||
      prefix < MIN_CIDR_PREFIX ||
      reduced % 2 ** (32 - prefix) !== 0
    )
      throw invalid(
        `entry "${trimmed}" is not an IPv4 block written as first-address/prefix, /${MIN_CIDR_PREFIX} to /32 (like 203.0.113.0/24, but your own)`,
      );
    let normalized = `${address}/${prefix}`;
    let found = [...PRIVATE_NETWORKS, ...NON_PUBLIC_NETWORKS, ...RESERVED_NETWORKS].find(
      (reservedRange) =>
        ipInCidr(address, reservedRange) || ipInCidr(firstLineOf(reservedRange, "/"), normalized),
    );
    if (found)
      throw invalid(
        PRIVATE_NETWORKS.includes(found)
          ? `entry "${trimmed}" overlaps private address space (${found}), where /login accepts a gateway without this key; declare only the public block your network is numbered from`
          : DOCUMENTATION_NETWORKS.includes(found)
            ? `entry "${trimmed}" overlaps ${found}, a documentation example range that is no one's network`
            : RESERVED_NETWORKS.includes(found)
              ? `entry "${trimmed}" overlaps ${found}, reserved address space no network is numbered from`
              : `entry "${trimmed}" overlaps ${found}, which VPN and NAT64 clients use locally`,
      );
    return normalized;
  });
  let blocks = normalizeCaseForComparison_2(mapped);
  if (blocks.length > MAX_INTERNAL_BLOCKS)
    throw invalid(`lists ${blocks.length} blocks; at most ${MAX_INTERNAL_BLOCKS} are accepted`);
  for (let [index, block] of blocks.entries()) {
    let found = blocks.find(
      (other, otherIndex) =>
        otherIndex > index &&
        (ipInCidr(firstLineOf(block, "/"), other) || ipInCidr(firstLineOf(other, "/"), block)),
    );
    if (found) throw invalid(`entries "${block}" and "${found}" overlap; list disjoint blocks`);
  }
  return blocks;
}
//@ chunk-exfmq47h.js:250184-250832 placement
/**
 * 检查网关实际连接地址在声明的内网中。
 */
function checkAddressInNetwork(network, address, localAddress, localAddr) {
  if (!ipInCidr(localAddr, network))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${address} answered from ${localAddr || "an unknown address"}, outside its declared network ${network}: the name resolved differently between lookup and connect. Try again.`,
      "gateway login: gateway address outside declared network",
    );
  if (!ipInCidr(localAddress, network))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Code only signs in to ${address} from inside its declared network ${network} (managed settings), and this machine is connecting from ${localAddress || "an unknown address"}, outside it. Sign in ` +
        "from the host OS on that network \u2014 not from a container, WSL2, or a " +
        `VPN whose addresses sit outside ${network}.`,
      "gateway login: this machine is outside the declared network",
    );
  return;
}
//@ chunk-exfmq47h.js:250832-250913 placement
/**
 * 受信主机名集合。
 */
var VOUCHED_HOSTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var vouchedHostSet;
deferInit("chunk-exfmq47h.js:250832", () => {
  VOUCHED_HOSTS = ["claude.fedstart.com", "claude.palantirfedstart.com"];
  vouchedHostSet = new Set([...VOUCHED_HOSTS]);
});
//@ chunk-exfmq47h.js:250913-250950 placement
/**
 * 判断主机名是否属于内置受信列表。
 */
function isVouchedHost(host) {
  return VOUCHED_HOSTS.includes(host);
}
//@ chunk-exfmq47h.js:250950-250983 placement
/**
 * 判断主机名是否在受信集合中。
 */
function isVouchedHostSetMember(host) {
  return vouchedHostSet.has(host);
}
//@ chunk-exfmq47h.js:250983-251063 placement
/**
 * 当前日期有效的客户允许列表条目（副本，为空表示未配置）。
 */
var ALLOWLIST_HMAC_KEY = "fa1b59ed47a63ea89b36bbb033a12fbfc68878f4eba30bf33d02ae50c0078d10";
var customerAllowlistEntries = [];
//@ chunk-exfmq47h.js:251063-251723 placement
/**
 * 当前日期有效的客户允许列表条目。
 */
function activeAllowlistEntries(
  entries = customerAllowlistEntries,
  nowMs = Date.now(),
  buildTimeMs = Date.parse(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
  ),
) {
  return entries.filter((entry) => {
    let notAfterMs = /^\d{4}-\d{2}-\d{2}$/.test(entry.notAfter) ? Date.parse(entry.notAfter) : NaN;
    return nowMs < notAfterMs && notAfterMs <= buildTimeMs + 31622400000;
  });
}
//@ chunk-exfmq47h.js:251723-251778 placement
/**
 * 取主机事实集合的哈希，用于允许列表判断。
 */
function allowlistFactsHash(trust) {
  return computeContentHash(
    trust.facts.toSorted().join(`
`),
  );
}
//@ chunk-exfmq47h.js:251778-251840 placement
/**
 * 对单条主机事实做 HMAC。
 */
function allowlistFactHmac(fact) {
  return createHmac("sha256", ALLOWLIST_HMAC_KEY).update(fact).digest("hex");
}
//@ chunk-exfmq47h.js:251840-251959 placement
function caPublicKeyFact(pem) {
  try {
    let publicKey = new X509Certificate(pem).publicKey;
    return `ca:${computeContentHash(
      publicKey.export({
        type: "spki",
        format: "der",
      }),
    )}`;
  } catch {
    return "ca:";
  }
}
//@ chunk-exfmq47h.js:251959-252686 placement
/**
 * 判断证书是否来自公共 CA。
 */
function describeCertificateIssuer(pem, roots = rootCertificates) {
  try {
    let cert = new X509Certificate(pem);
    let { asymmetricKeyType, asymmetricKeyDetails } = cert.publicKey;
    let fact = caPublicKeyFact(pem);
    if (roots.length === 0)
      return "this runtime has no built-in root certificates, so Claude Code cannot tell a public CA from a private one and allowlists no root";
    if (roots.some((rootPem) => caPublicKeyFact(rootPem) === fact))
      return "a root the runtime bundles, so a public CA";
    if (!cert.ca || !cert.verify(cert.publicKey)) return "not a self-signed CA certificate";
    return (
      asymmetricKeyType === "rsa"
        ? (asymmetricKeyDetails?.modulusLength ?? 0) >= 2048
        : asymmetricKeyType === "ec"
          ? ["prime256v1", "secp384r1", "secp521r1"].includes(asymmetricKeyDetails?.namedCurve ?? "")
          : asymmetricKeyType === "ed25519"
    )
      ? undefined
      : "its key is not RSA of 2048 bits or more, ECDSA on P-256, P-384 or P-521, or Ed25519";
  } catch {
    return "it is not a certificate, or its key is of a kind this runtime cannot read";
  }
}
//@ chunk-exfmq47h.js:252686-252978 placement
function findListedRoots(entries) {
  let listedFacts = new Set(entries.flatMap((entry) => entry.facts));
  return (getCACertificates() ?? [])
    .flatMap((block) => block.match(PEM_CERT_BLOCK_RE) ?? [])
    .map((pem) => ({
      fact: caPublicKeyFact(pem),
      pem,
    }))
    .filter((candidate) => listedFacts.has(allowlistFactHmac(candidate.fact)))
    .filter((root) => {
      let problem = describeCertificateIssuer(root.pem);
      if (problem !== undefined)
        logForDebugging(`[gateway] customer allowlist: a listed root is skipped: ${problem}`);
      return problem === undefined;
    });
}
//@ chunk-exfmq47h.js:252978-253222 placement
function ipCidrFacts(remoteAddress = "") {
  let replaced = remoteAddress.replace(/^::ffff:/, "");
  if (!isIPv4(replaced)) return [];
  let reduced = replaced.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
  return Array.from(
    {
      length: 33 - MIN_CIDR_PREFIX,
    },
    (entry, offset) => {
      let base = reduced - (reduced % 2 ** offset);
      return `cidr:${[24, 16, 8, 0].map((shift) => (base >>> shift) & 255).join(".")}/${32 - offset}`;
    },
  );
}
//@ chunk-exfmq47h.js:253222-254003 placement
/**
 * 用客户允许列表核对网关。
 */
async function checkCustomerAllowlist(gatewayUrl) {
  if (customerAllowlistEntries.length === 0 || !gatewayUrl.startsWith("https:")) return;
  let active = activeAllowlistEntries();
  logForDebugging(
    `[gateway] customer allowlist: ${active.length} of ${customerAllowlistEntries.length} entries count on this date`,
  );
  if (active.length === 0) return;
  for (let root of [undefined, ...findListedRoots(active)]) {
    let observed = await fetchGatewayCertificate(gatewayUrl, 1e4, undefined, {
      onlyRoot: root?.pem,
    }).catch((error) => {
      logForDebugging(
        `[gateway] customer allowlist: no usable connection to ${gatewayUrl}${root ? ", trusting only a listed root" : ""}: ${errorMessage(error)}`,
      );
      return;
    });
    if (observed === undefined) continue;
    let facts = new Set(
      [`host:${observed.hostname}`, ...ipCidrFacts(observed.remoteAddress), ...(root ? [root.fact] : [])].map(
        allowlistFactHmac,
      ),
    );
    let trust = active.find((entry) => entry.facts.every((fact) => facts.has(fact)));
    logForDebugging(
      `[gateway] customer allowlist: ${observed.hostname}, answered from ${observed.remoteAddress || "an unknown address"}${root ? ", verified under a listed root alone" : ""}: matches ${trust ? "an" : "no"} entry`,
    );
    if (trust)
      return {
        judged: observed,
        entry: allowlistFactsHash(trust),
      };
  }
  return;
}
//@ chunk-exfmq47h.js:254003-254059 placement
/**
 * 取 URL 主机名（去掉 IPv6 方括号）。
 */
function hostOf(url) {
  return url.hostname.replace(/^\[|\]$/g, "");
}
//@ chunk-exfmq47h.js:254059-254101 placement
/**
 * 主机是否受信（走内置列表）。
 */
function isHostVouched(host) {
  if (isVouchedHost(host)) return true;
  return false;
}
//@ chunk-exfmq47h.js:254101-254372 placement
var VOUCH_TIMEOUT_MS = 5000;
var LOOKUP_TIMEOUT_MS = 3000;
var TOTAL_TIMEOUT_MS = 6000;
var VOUCH_TIMEOUT_MESSAGE = "gateway vouching did not finish in time";
var LOOKUP_TIMEOUT_MESSAGE = "gateway lookups did not finish in time";
var VOUCH_FAILED_MESSAGE = "gateway login: could not confirm the host with its vouching gateway";
var NOT_SERVED_MESSAGE = "when asked, it did not name a recognized Claude gateway host that serves it";
//@ chunk-exfmq47h.js:254372-254766 placement
/**
 * 可暂停的计时器（等待 helper 时不计时）。
 */
function createPausableClock() {
  let pausedTotalMs = 0;
  let pausedAtMs;
  let pendingResume;
  return {
    clock: {
      pause() {
        pausedAtMs = Date.now();
        return () => {
          if (pausedAtMs !== undefined) {
            pausedTotalMs += Date.now() - pausedAtMs;
            pausedAtMs = undefined;
          }
          let resume = pendingResume;
          pendingResume = undefined;
          resume?.();
        };
      },
    },
    race(promise, timeoutMs) {
      let now = Date.now();
      return new Promise((resolve, reject) => {
        let timer;
        let checkDeadline = () => {
          if (pausedAtMs !== undefined) {
            pendingResume = checkDeadline;
            return;
          }
          let remainingMs = timeoutMs + pausedTotalMs - (Date.now() - now);
          if (remainingMs <= 0) {
            reject(Error(VOUCH_TIMEOUT_MESSAGE));
            return;
          }
          timer = setTimeout(checkDeadline, remainingMs);
        };
        checkDeadline();
        promise.then(
          (value) => {
            clearTimeout(timer);
            pendingResume = undefined;
            resolve(value);
          },
          (error) => {
            clearTimeout(timer);
            pendingResume = undefined;
            reject(error);
          },
        );
      });
    },
  };
}
//@ chunk-exfmq47h.js:254766-254884 placement
var PROXY_NO_CREDENTIALS_MESSAGE =
  "Claude Code has no credentials this proxy accepts: configure them in the proxy address or a proxyAuthHelper.";
//@ chunk-exfmq47h.js:254884-255013 placement
function isValidHostname(hostname) {
  return (
    hostname.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)
  );
}
//@ chunk-exfmq47h.js:255013-255095 placement
/**
 * 是否是可信任的 https 主机（无端口、非 IP、主机名合法）。
 */
function isVouchableHttpsHost(url, host) {
  return (
    url.protocol === "https:" && url.port === "" && !isIPv4(host) && !isIPv6(host) && isValidHostname(host)
  );
}
//@ chunk-exfmq47h.js:255095-255291 placement
/**
 * 判定网关可信依据，管理员可退回客户允许列表。
 */
async function resolveGatewayTrustBasis(url, internalNetworkEntries = [], namedBy = "developer") {
  try {
    return await resolveGatewayBasis(url, internalNetworkEntries, VOUCH_TIMEOUT_MS);
  } catch (error) {
    let detail =
      error instanceof GatewayAllowlistError && namedBy === "administrator"
        ? await checkCustomerAllowlist(url)
        : undefined;
    if (detail === undefined) throw error;
    return {
      basis: "allowlisted",
      ...detail,
    };
  }
}
//@ chunk-exfmq47h.js:255291-256836 placement
/**
 * 判定网关可信依据（已列出、内网、担保）。
 */
async function resolveGatewayBasis(
  gatewayUrl,
  internalNetworkEntries,
  hostCheckTimeoutMs,
  vouchTimeoutMs,
  credentials,
  voucherState = {
    voucherNamed: false,
  },
  options,
) {
  let parsedUrl = new URL(gatewayUrl);
  let hostname = hostOf(parsedUrl);
  let isIpLiteral = isIPv4(hostname) || isIPv6(hostname);
  if (parsedUrl.protocol === "https:" && vouchedHostSet.has(hostname))
    return {
      basis: "listed",
    };
  let declaredBlocks = parsedUrl.protocol === "https:" ? parseInternalNetworks(internalNetworkEntries) : [];
  let vouchBudgetMs = options === undefined ? undefined : vouchTimeoutMs;
  let now = Date.now();
  let progress = {
    proxyChecked: false,
  };
  try {
    let reachability = checkGatewayReachability(parsedUrl, hostname, isIpLiteral, declaredBlocks, progress);
    let result =
      vouchBudgetMs === undefined
        ? await reachability
        : await withTimeout(reachability, vouchBudgetMs, LOOKUP_TIMEOUT_MESSAGE).catch((error) => {
            if (error instanceof Error && error.message === LOOKUP_TIMEOUT_MESSAGE) {
              let target = progress.proxyChecked ? `gateway host ${hostname}` : "the configured HTTP proxy";
              throw new GatewayInternalNetworksError(
                `${target} could not be resolved within ${Math.max(1, Math.round(vouchBudgetMs / 1000))} seconds. Try again.`,
                "gateway login: lookups did not finish in time",
                progress.proxyChecked ? "gateway" : "proxy",
              );
            }
            throw error;
          });
    releaseGatewayHost(hostname);
    return result === undefined
      ? {
          basis: "network",
        }
      : {
          basis: "network",
          network: result,
        };
  } catch (error) {
    if (
      !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
      error instanceof GatewayTrustError ||
      (error instanceof GatewayInternalNetworksError && error.unresolved === "proxy") ||
      !isVouchableHttpsHost(parsedUrl, hostname)
    )
      throw error;
    let viaProxy = getUsableProxyUrl() !== undefined && !shouldBypassProxy(gatewayUrl);
    if (error instanceof GatewayInternalNetworksError && !viaProxy) throw error;
    let pausableClock = createPausableClock();
    let hostCheckAnswer = fetchHostCheckAnswer(
      hostname,
      hostCheckTimeoutMs,
      viaProxy,
      credentials,
      error instanceof GatewayInternalNetworksError ? undefined : errorMessage(error),
      voucherState,
      pausableClock.clock,
      options,
    );
    let remainingMs =
      vouchBudgetMs === undefined
        ? vouchTimeoutMs
        : Math.max(vouchBudgetMs - (Date.now() - now), hostCheckTimeoutMs);
    let voucher =
      remainingMs === undefined
        ? await hostCheckAnswer
        : await pausableClock.race(hostCheckAnswer, remainingMs).catch((error) => {
            if (error instanceof Error && error.message === VOUCH_TIMEOUT_MESSAGE) {
              if (!voucherState.voucherNamed)
                voucherState.notVouched =
                  "it could not be asked in time whether it is a recognized Claude gateway host";
              throw new GatewayInternalNetworksError(
                `${hostname} could not be confirmed as a recognized Claude gateway host ${vouchBudgetMs === undefined ? `within ${Math.max(1, Math.round(remainingMs / 1000))} seconds` : "in time"}. Try again.`,
                "gateway login: vouching did not finish in time",
                voucherState.voucherNamed ? "voucher" : "host",
              );
            }
            throw error;
          });
    if (voucher === undefined) throw error;
    logForDebugging(`[gateway] ${hostname} accepted: vouched for by ${voucher}`);
    holdGatewayHostStrict(hostname);
    return {
      basis: "vouched",
    };
  }
}
//@ chunk-exfmq47h.js:256836-259274 placement
/**
 * 通过代理或直连检查网关地址。
 */
async function checkGatewayReachability(
  url,
  hostname,
  isIpLiteral,
  declaredBlocks,
  progress = {
    proxyChecked: false,
  },
) {
  let href = url.href;
  let hostPort = isIPv6(hostname)
    ? `[${hostname}]:${url.port || (url.protocol === "http:" ? "80" : "443")}`
    : hostname;
  let proxyUrl = getProxyUrl();
  if (proxyUrl && !shouldBypassProxy(href)) {
    let proxyHost;
    let proxyAddresses;
    try {
      proxyHost = new URL(proxyUrl).hostname.replace(/^\[|\]$/g, "");
      if (!proxyHost) throw Error("no hostname");
      proxyAddresses =
        isIPv4(proxyHost) || isIPv6(proxyHost)
          ? [proxyHost]
          : (
              await withTimeout(
                lookup_2(proxyHost, {
                  all: true,
                }),
                1e4,
                "DNS resolution timed out",
              )
            ).map((entry) => entry.address);
    } catch {
      throw new GatewayInternalNetworksError(
        "Could not resolve the configured HTTP proxy. Connect to your organization's network and try again.",
        "gateway login: could not parse or resolve proxy host",
        "proxy",
      );
    }
    if (proxyAddresses.length === 0 || proxyAddresses.some((address) => !isInternalAddress(address)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Gateway login would go through proxy ${proxyHost}, which is not on a private network. Add ${hostPort} to NO_PROXY for a direct connection, or use a proxy on your organization's private network.`,
        "gateway login: HTTP proxy host is not private",
      );
  }
  progress.proxyChecked = true;
  let addresses;
  if (isIpLiteral) addresses = [hostname];
  else
    try {
      addresses = (
        await withTimeout(
          lookup_2(hostname, {
            all: true,
          }),
          1e4,
          "DNS resolution timed out",
        )
      ).map((entry) => entry.address);
    } catch {
      throw new GatewayInternalNetworksError(
        `Could not resolve gateway host ${hostname}. Connect to your organization's network and try again.`,
        "gateway login: could not resolve gateway host",
        "gateway",
      );
    }
  if (addresses.length === 0)
    throw new GatewayInternalNetworksError(
      `Could not resolve gateway host ${hostname}.`,
      "gateway login: gateway host resolved to zero addresses",
      "gateway",
    );
  let found = declaredBlocks.find((block) => addresses.some((address) => ipInCidr(address, block)));
  let found_2 = addresses.find((address) =>
    found ? !ipInCidr(address, found) : !isInternalAddress(address),
  );
  if (found_2 !== undefined && found)
    throw new GatewayTrustError(
      `Every address for gateway host ${hostname} must be inside its declared network ${found}, and it also resolves to ${found_2}. Publish only records inside ${found} for it.`,
      "gateway login: gateway host resolves outside its declared network",
    );
  if (found_2 !== undefined) {
    let any = addresses.some((address) => isInternalAddress(address));
    throw new GatewayAllowlistError(
      `Gateway hosts must be on your organization's private network; ${hostname} resolves to the public (or unrecognized) address ${found_2}` +
        (declaredBlocks.length > 0
          ? `, outside the networks declared in managed settings (${declaredBlocks.join(", ")})`
          : "") +
        ". " +
        (any
          ? "Every address for a gateway host must be private \u2014 if this is " +
            "a dual-stack DNS name, publish only private records for it (for example, remove the public AAAA record)."
          : isIpLiteral
            ? "Use your gateway's private (internal) address or DNS name instead."
            : "Connect to your organization's network and try again."),
      "gateway login: gateway host resolves to a public address",
    );
  }
  if (found && proxyUrl && !shouldBypassProxy(href))
    throw new GatewayTrustError(
      `${hostname} is on the declared network ${found}, which Claude Code checks over a direct connection, not through an HTTP proxy. Add ${hostPort} to NO_PROXY and try again.`,
      "gateway login: declared-network gateway behind a proxy",
    );
  return found;
}
//@ chunk-exfmq47h.js:259274-259298 placement
var HTTP_LOOPBACK = "http-loopback";
//@ chunk-exfmq47h.js:259298-259527 placement
function hostCheckRetryHint(error, hostError) {
  if (error instanceof GatewayHostCheckError) return "Try again in a few minutes.";
  switch (error instanceof GatewayHostCheckRetryableError ? error.kind : undefined) {
    case "proxy-auth":
      return PROXY_NO_CREDENTIALS_MESSAGE;
    case "http-status":
      return "Try again in a few minutes.";
    case "no-answer":
    case undefined:
      return hostError;
  }
}
//@ chunk-exfmq47h.js:259527-260628 placement
/**
 * 获取主机检查结果（可用担保方）。
 */
async function fetchHostCheckAnswer(
  hostname,
  timeoutMs,
  viaProxy,
  authorization,
  ownDeploymentNote,
  voucherState,
  helperClock,
  voucher,
) {
  if (voucher !== undefined)
    return (await checkVoucher(voucher, hostname, timeoutMs, voucherState, helperClock))
      ? voucher
      : undefined;
  let withCertificate = authorization !== undefined;
  let answer;
  try {
    answer = await queryGatewayHostCheck(hostname, hostname, {
      timeoutMs,
      presentClientCertificate: withCertificate,
      ...(withCertificate && {
        authorization,
      }),
      helperClock,
    });
  } catch (error) {
    if (error instanceof GatewayHostCheckError) {
      logForDebugging(
        `[gateway] ${hostname} not vouched: no host-check answer from it (${errorMessage(error)})`,
      );
      voucherState.notVouched = `it did not say whether it is a recognized Claude gateway host (${errorMessage(error)})`;
      return;
    }
    logForDebugging(
      `[gateway] ${hostname} could not be asked which deployment serves it (${errorMessage(error)})`,
      {
        level: "warn",
      },
    );
    let problem =
      "could not be asked " +
      (viaProxy ? "through the configured proxy " : "") +
      `whether it is a recognized Claude gateway host (${errorMessage(error)})`;
    voucherState.notVouched = `it ${problem}`;
    throw new GatewayInternalNetworksError(
      `${hostname} ${problem}. ` +
        hostCheckRetryHint(error, "Check your network connection and try again.") +
        (ownDeploymentNote === undefined
          ? ""
          : ` Or, if your organization runs the gateway at ${hostname} itself: ${ownDeploymentNote}`),
      "gateway login: could not learn which gateway deployment vouches for the host",
      "host",
    );
  }
  let canonicalHost = answer.listed ? getHttpsHostname(answer.canonical) : undefined;
  if (canonicalHost === undefined) {
    logForDebugging(
      `[gateway] ${hostname} not vouched: its own host-check answer disowns it or names no vouching deployment`,
    );
    voucherState.notVouched = NOT_SERVED_MESSAGE;
    return;
  }
  return (await checkVoucher(canonicalHost, hostname, timeoutMs, voucherState, helperClock))
    ? canonicalHost
    : undefined;
}
export {
  isVouchedHostSetMember,
  hostOf,
  isVouchedHost,
  activeAllowlistEntries,
  allowlistFactsHash,
  HTTP_LOOPBACK,
  isHostVouched,
  NOT_SERVED_MESSAGE,
  GatewayInternalNetworksError,
  hostCheckRetryHint,
  VOUCH_FAILED_MESSAGE,
  isVouchableHttpsHost,
  vouchedHostSet,
  parseInternalNetworks,
  resolveGatewayBasis,
  LOOKUP_TIMEOUT_MS,
  TOTAL_TIMEOUT_MS,
  checkAddressInNetwork,
  isInternalAddress,
  resolveGatewayTrustBasis,
};
