/**
 * services/gateway/internalNetworks.ts
 *
 * 2.1.316 新增：通过代理或直连检查网关地址；判定网关可信依据（已列出、内网、担保）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (32)
 * attribution: placement 32
 */
import { isIPv4, isIPv6 } from "net";
import { createHmac, X509Certificate } from "crypto";
import { rootCertificates } from "tls";
import { lookup as lookup_2 } from "dns/promises";
import { rf, fF, vS, PS } from "../../../vendor/ip-address/dist/ipv4.js";
import { ipInCidr } from "../../utils/cidr.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { UNREADABLE_SETTING_MARKER } from "../../utils/settings/types.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
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

//@ chunk-aepeg2w5.js:238905-239215 placement
/**
 * 地址是否为内网或回环（含 IPv4 映射）
 */
function isInternalAddress(e) {
  let lower = e.replace(/%.*$/, "").toLowerCase();
  if (isIPv4(lower)) return rf.some((h) => ipInCidr(lower, h));
  if (!isIPv6(lower)) return false;
  let match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (match?.[1]) return isInternalAddress(match[1]);
  if (lower === "::1") return true;
  let s = parseInt(/^([0-9a-f]{1,4}):/.exec(lower)?.[1] ?? "0", 16);
  return (s >= 65152 && s <= 65215) || (s >= 64512 && s <= 65023);
}
//@ chunk-aepeg2w5.js:239215-239294 placement
/**
 * 网关内部网络列表非法时的错误（带未解析的类型）。
 */
class GatewayInternalNetworksError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unresolved;
  constructor(e, n, unresolved) {
    super(e, n);
    this.unresolved = unresolved;
  }
}
//@ chunk-aepeg2w5.js:239294-239314 placement
/**
 * 网关设置/信任相关的通用错误类型。
 */
class GatewayTrustError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:239314-239334 placement
/**
 * 网关客户允许列表相关的错误类型。
 */
class GatewayAllowlistError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:239334-239348 placement
/**
 * 最多接受的内部网络块数（4）。
 */
var MIN_INTERNAL_PREFIX = 8;
var MAX_INTERNAL_BLOCKS = 4;
//@ chunk-aepeg2w5.js:239348-240670 placement
/**
 * 解析托管设置 gatewayInternalNetworks（CIDR 列表，拒绝私有/保留/文档地址）。
 */
function parseInternalNetworks(e) {
  let n = (h) =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gatewayInternalNetworks in managed settings ${h}.`,
      "gateway login: invalid gatewayInternalNetworks",
    );
  if (e.includes(UNREADABLE_SETTING_MARKER))
    throw n("is not a list of CIDR strings; sign-in is refused until it is fixed");
  let mapped = e.map((h) => {
    let trimmed = h.trim();
    let [S = "", w = ""] = trimmed.split("/");
    let R = Number(w);
    let reduced = S.split(".").reduce((acc, G) => acc * 256 + Number(G), 0);
    if (!isIPv4(S) || !ipInCidr(S, trimmed) || R < MIN_INTERNAL_PREFIX || reduced % 2 ** (32 - R) !== 0)
      throw n(
        `entry "${trimmed}" is not an IPv4 block written as first-address/prefix, /${MIN_INTERNAL_PREFIX} to /32 (like 203.0.113.0/24, but your own)`,
      );
    let P = `${S}/${R}`;
    let found = [...rf, ...fF, ...vS].find((L) => ipInCidr(S, L) || ipInCidr(firstLineOf(L, "/"), P));
    if (found)
      throw n(
        rf.includes(found)
          ? `entry "${trimmed}" overlaps private address space (${found}), where /login accepts a gateway without this key; declare only the public block your network is numbered from`
          : PS.includes(found)
            ? `entry "${trimmed}" overlaps ${found}, a documentation example range that is no one's network`
            : vS.includes(found)
              ? `entry "${trimmed}" overlaps ${found}, reserved address space no network is numbered from`
              : `entry "${trimmed}" overlaps ${found}, which VPN and NAT64 clients use locally`,
      );
    return P;
  });
  let s = uniq(mapped);
  if (s.length > MAX_INTERNAL_BLOCKS)
    throw n(`lists ${s.length} blocks; at most ${MAX_INTERNAL_BLOCKS} are accepted`);
  for (let [h, y] of s.entries()) {
    let found = s.find(
      (w, R) => R > h && (ipInCidr(firstLineOf(y, "/"), w) || ipInCidr(firstLineOf(w, "/"), y)),
    );
    if (found) throw n(`entries "${y}" and "${found}" overlap; list disjoint blocks`);
  }
  return s;
}
//@ chunk-aepeg2w5.js:240670-241318 placement
/**
 * 检查网关实际连接地址在声明的内网中。
 */
function checkAddressInNetwork(e, n, localAddress, s) {
  if (!ipInCidr(s, e))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} answered from ${s || "an unknown address"}, outside its declared network ${e}: the name resolved differently between lookup and connect. Try again.`,
      "gateway login: gateway address outside declared network",
    );
  if (!ipInCidr(localAddress, e))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Code only signs in to ${n} from inside its declared network ${e} (managed settings), and this machine is connecting from ${localAddress || "an unknown address"}, outside it. Sign in ` +
        "from the host OS on that network \u2014 not from a container, WSL2, or a " +
        `VPN whose addresses sit outside ${e}.`,
      "gateway login: this machine is outside the declared network",
    );
  return;
}
//@ chunk-aepeg2w5.js:241318-241399 placement
/**
 * 受信主机名集合。
 */
var VOUCHED_HOSTS = ["claude.fedstart.com", "claude.palantirfedstart.com"];
var vouchedHostSet = new Set([...VOUCHED_HOSTS]);
//@ chunk-aepeg2w5.js:241399-241436 placement
/**
 * 判断主机名是否属于内置受信列表。
 */
function isVouchedHost(e) {
  return VOUCHED_HOSTS.includes(e);
}
//@ chunk-aepeg2w5.js:241436-241469 placement
/**
 * 判断主机名是否在受信集合中。
 */
function isVouchedHostSetMember(e) {
  return vouchedHostSet.has(e);
}
//@ chunk-aepeg2w5.js:241469-241549 placement
/**
 * 当前日期有效的客户允许列表条目（副本，为空表示未配置）。
 */
var ALLOWLIST_HMAC_KEY = "fa1b59ed47a63ea89b36bbb033a12fbfc68878f4eba30bf33d02ae50c0078d10";
var customerAllowlistEntries = [];
//@ chunk-aepeg2w5.js:241549-242209 placement
/**
 * 当前日期有效的客户允许列表条目。
 */
function activeAllowlistEntries(
  e = customerAllowlistEntries,
  n = Date.now(),
  r = Date.parse(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME,
  ),
) {
  return e.filter((s) => {
    let h = /^\d{4}-\d{2}-\d{2}$/.test(s.notAfter) ? Date.parse(s.notAfter) : NaN;
    return n < h && h <= r + 31622400000;
  });
}
//@ chunk-aepeg2w5.js:242209-242264 placement
/**
 * 取主机事实集合的哈希，用于允许列表判断。
 */
function allowlistFactsHash(e) {
  return computeContentHash(
    e.facts.toSorted().join(`
`),
  );
}
//@ chunk-aepeg2w5.js:242264-242326 placement
/**
 * 对单条主机事实做 HMAC。
 */
function allowlistFactHmac(fact) {
  return createHmac("sha256", ALLOWLIST_HMAC_KEY).update(fact).digest("hex");
}
//@ chunk-aepeg2w5.js:242326-242445 placement
function caPublicKeyFact(e) {
  try {
    let publicKey = new X509Certificate(e).publicKey;
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
//@ chunk-aepeg2w5.js:242445-243172 placement
/**
 * 判断证书是否来自公共 CA。
 */
function describeCertificateIssuer(e, n = rootCertificates) {
  try {
    let r = new X509Certificate(e);
    let { asymmetricKeyType, asymmetricKeyDetails } = r.publicKey;
    let y = caPublicKeyFact(e);
    if (n.length === 0)
      return "this runtime has no built-in root certificates, so Claude Code cannot tell a public CA from a private one and allowlists no root";
    if (n.some((w) => caPublicKeyFact(w) === y)) return "a root the runtime bundles, so a public CA";
    if (!r.ca || !r.verify(r.publicKey)) return "not a self-signed CA certificate";
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
//@ chunk-aepeg2w5.js:243172-243464 placement
function findListedRoots(e) {
  let n = new Set(e.flatMap((r) => r.facts));
  return (getCACertificates() ?? [])
    .flatMap((r) => r.match(PEM_CERT_BLOCK_RE) ?? [])
    .map((r) => ({
      fact: caPublicKeyFact(r),
      pem: r,
    }))
    .filter((r) => n.has(allowlistFactHmac(r.fact)))
    .filter((r) => {
      let s = describeCertificateIssuer(r.pem);
      if (s !== undefined) logForDebugging(`[gateway] customer allowlist: a listed root is skipped: ${s}`);
      return s === undefined;
    });
}
//@ chunk-aepeg2w5.js:243464-243708 placement
function ipCidrFacts(remoteAddress = "") {
  let replaced = remoteAddress.replace(/^::ffff:/, "");
  if (!isIPv4(replaced)) return [];
  let reduced = replaced.split(".").reduce((acc, h) => acc * 256 + Number(h), 0);
  return Array.from(
    {
      length: 33 - MIN_INTERNAL_PREFIX,
    },
    (s, h) => {
      let y = reduced - (reduced % 2 ** h);
      return `cidr:${[24, 16, 8, 0].map((S) => (y >>> S) & 255).join(".")}/${32 - h}`;
    },
  );
}
//@ chunk-aepeg2w5.js:243708-244489 placement
/**
 * 用客户允许列表核对网关。
 */
async function checkCustomerAllowlist(e) {
  if (customerAllowlistEntries.length === 0 || !e.startsWith("https:")) return;
  let n = activeAllowlistEntries();
  logForDebugging(
    `[gateway] customer allowlist: ${n.length} of ${customerAllowlistEntries.length} entries count on this date`,
  );
  if (n.length === 0) return;
  for (let r of [undefined, ...findListedRoots(n)]) {
    let s = await fetchGatewayCertificate(e, 1e4, undefined, {
      onlyRoot: r?.pem,
    }).catch((error) => {
      logForDebugging(
        `[gateway] customer allowlist: no usable connection to ${e}${r ? ", trusting only a listed root" : ""}: ${errorMessage(error)}`,
      );
      return;
    });
    if (s === undefined) continue;
    let h = new Set(
      [`host:${s.hostname}`, ...ipCidrFacts(s.remoteAddress), ...(r ? [r.fact] : [])].map(allowlistFactHmac),
    );
    let found = n.find((S) => S.facts.every((fact) => h.has(fact)));
    logForDebugging(
      `[gateway] customer allowlist: ${s.hostname}, answered from ${s.remoteAddress || "an unknown address"}${r ? ", verified under a listed root alone" : ""}: matches ${found ? "an" : "no"} entry`,
    );
    if (found)
      return {
        judged: s,
        entry: allowlistFactsHash(found),
      };
  }
  return;
}
//@ chunk-aepeg2w5.js:244489-244545 placement
/**
 * 取 URL 主机名（去掉 IPv6 方括号）。
 */
function hostOf(e) {
  return e.hostname.replace(/^\[|\]$/g, "");
}
//@ chunk-aepeg2w5.js:244545-244587 placement
/**
 * 主机是否受信（走内置列表）。
 */
function isHostVouched(e) {
  if (isVouchedHost(e)) return true;
  return false;
}
//@ chunk-aepeg2w5.js:244587-244858 placement
var VOUCH_TIMEOUT_MS = 5000;
var LOOKUP_TIMEOUT_MS = 3000;
var TOTAL_TIMEOUT_MS = 6000;
var VOUCH_TIMEOUT_MESSAGE = "gateway vouching did not finish in time";
var LOOKUP_TIMEOUT_MESSAGE = "gateway lookups did not finish in time";
var VOUCH_FAILED_MESSAGE = "gateway login: could not confirm the host with its vouching gateway";
var NOT_SERVED_MESSAGE = "when asked, it did not name a recognized Claude gateway host that serves it";
//@ chunk-aepeg2w5.js:244858-245252 placement
/**
 * 可暂停的计时器（等待 helper 时不计时）。
 */
function createPausableClock() {
  let e = 0;
  let n;
  let r;
  return {
    clock: {
      pause() {
        n = Date.now();
        return () => {
          if (n !== undefined) {
            e += Date.now() - n;
            n = undefined;
          }
          let h = r;
          r = undefined;
          h?.();
        };
      },
    },
    race(h, y) {
      let now = Date.now();
      return new Promise((resolve, reject) => {
        let x;
        let P = () => {
          if (n !== undefined) {
            r = P;
            return;
          }
          let F = y + e - (Date.now() - now);
          if (F <= 0) {
            reject(Error(VOUCH_TIMEOUT_MESSAGE));
            return;
          }
          x = setTimeout(P, F);
        };
        P();
        h.then(
          (F) => {
            clearTimeout(x);
            r = undefined;
            resolve(F);
          },
          (error) => {
            clearTimeout(x);
            r = undefined;
            reject(error);
          },
        );
      });
    },
  };
}
//@ chunk-aepeg2w5.js:245252-245370 placement
var PROXY_NO_CREDENTIALS_MESSAGE =
  "Claude Code has no credentials this proxy accepts: configure them in the proxy address or a proxyAuthHelper.";
//@ chunk-aepeg2w5.js:245370-245499 placement
function isValidHostname(e) {
  return (
    e.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(e)
  );
}
//@ chunk-aepeg2w5.js:245499-245581 placement
/**
 * 是否是可信任的 https 主机（无端口、非 IP、主机名合法）。
 */
function isVouchableHttpsHost(e, n) {
  return e.protocol === "https:" && e.port === "" && !isIPv4(n) && !isIPv6(n) && isValidHostname(n);
}
//@ chunk-aepeg2w5.js:245581-245777 placement
/**
 * 判定网关可信依据，管理员可退回客户允许列表。
 */
async function resolveGatewayTrustBasis(e, internalNetworks = [], namedBy = "developer") {
  try {
    return await resolveGatewayBasis(e, internalNetworks, VOUCH_TIMEOUT_MS);
  } catch (error) {
    let h =
      error instanceof GatewayAllowlistError && namedBy === "administrator"
        ? await checkCustomerAllowlist(e)
        : undefined;
    if (h === undefined) throw error;
    return {
      basis: "allowlisted",
      ...h,
    };
  }
}
//@ chunk-aepeg2w5.js:245777-247322 placement
/**
 * 判定网关可信依据（已列出、内网、担保）。
 */
async function resolveGatewayBasis(
  e,
  n,
  r,
  s,
  h,
  y = {
    voucherNamed: false,
  },
  S,
) {
  let w = new URL(e);
  let R = hostOf(w);
  let x = isIPv4(R) || isIPv6(R);
  if (w.protocol === "https:" && vouchedHostSet.has(R))
    return {
      basis: "listed",
    };
  let P = w.protocol === "https:" ? parseInternalNetworks(n) : [];
  let F = S === undefined ? undefined : s;
  let now = Date.now();
  let G = {
    proxyChecked: false,
  };
  try {
    let j = checkGatewayReachability(w, R, x, P, G);
    let ee =
      F === undefined
        ? await j
        : await withTimeout(j, F, LOOKUP_TIMEOUT_MESSAGE).catch((error) => {
            if (error instanceof Error && error.message === LOOKUP_TIMEOUT_MESSAGE) {
              let Q = G.proxyChecked ? `gateway host ${R}` : "the configured HTTP proxy";
              throw new GatewayInternalNetworksError(
                `${Q} could not be resolved within ${Math.max(1, Math.round(F / 1000))} seconds. Try again.`,
                "gateway login: lookups did not finish in time",
                G.proxyChecked ? "gateway" : "proxy",
              );
            }
            throw error;
          });
    releaseGatewayHost(R);
    return ee === undefined
      ? {
          basis: "network",
        }
      : {
          basis: "network",
          network: ee,
        };
  } catch (error) {
    if (
      !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
      error instanceof GatewayTrustError ||
      (error instanceof GatewayInternalNetworksError && error.unresolved === "proxy") ||
      !isVouchableHttpsHost(w, R)
    )
      throw error;
    let ee = getUsableProxyUrl() !== undefined && !shouldBypassProxy(e);
    if (error instanceof GatewayInternalNetworksError && !ee) throw error;
    let pausableClock = createPausableClock();
    let hostCheckAnswer = fetchHostCheckAnswer(
      R,
      r,
      ee,
      h,
      error instanceof GatewayInternalNetworksError ? undefined : errorMessage(error),
      y,
      pausableClock.clock,
      S,
    );
    let re = F === undefined ? s : Math.max(F - (Date.now() - now), r);
    let se =
      re === undefined
        ? await hostCheckAnswer
        : await pausableClock.race(hostCheckAnswer, re).catch((error) => {
            if (error instanceof Error && error.message === VOUCH_TIMEOUT_MESSAGE) {
              if (!y.voucherNamed)
                y.notVouched = "it could not be asked in time whether it is a recognized Claude gateway host";
              throw new GatewayInternalNetworksError(
                `${R} could not be confirmed as a recognized Claude gateway host ${F === undefined ? `within ${Math.max(1, Math.round(re / 1000))} seconds` : "in time"}. Try again.`,
                "gateway login: vouching did not finish in time",
                y.voucherNamed ? "voucher" : "host",
              );
            }
            throw error;
          });
    if (se === undefined) throw error;
    logForDebugging(`[gateway] ${R} accepted: vouched for by ${se}`);
    holdGatewayHostStrict(R);
    return {
      basis: "vouched",
    };
  }
}
//@ chunk-aepeg2w5.js:247322-249760 placement
/**
 * 通过代理或直连检查网关地址。
 */
async function checkGatewayReachability(
  e,
  n,
  r,
  s,
  h = {
    proxyChecked: false,
  },
) {
  let href = e.href;
  let S = isIPv6(n) ? `[${n}]:${e.port || (e.protocol === "http:" ? "80" : "443")}` : n;
  let proxyUrl = getProxyUrl();
  if (proxyUrl && !shouldBypassProxy(href)) {
    let F;
    let L;
    try {
      F = new URL(proxyUrl).hostname.replace(/^\[|\]$/g, "");
      if (!F) throw Error("no hostname");
      L =
        isIPv4(F) || isIPv6(F)
          ? [F]
          : (
              await withTimeout(
                lookup_2(F, {
                  all: true,
                }),
                1e4,
                "DNS resolution timed out",
              )
            ).map((ee) => ee.address);
    } catch {
      throw new GatewayInternalNetworksError(
        "Could not resolve the configured HTTP proxy. Connect to your organization's network and try again.",
        "gateway login: could not parse or resolve proxy host",
        "proxy",
      );
    }
    if (L.length === 0 || L.some((j) => !isInternalAddress(j)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Gateway login would go through proxy ${F}, which is not on a private network. Add ${S} to NO_PROXY for a direct connection, or use a proxy on your organization's private network.`,
        "gateway login: HTTP proxy host is not private",
      );
  }
  h.proxyChecked = true;
  let R;
  if (r) R = [n];
  else
    try {
      R = (
        await withTimeout(
          lookup_2(n, {
            all: true,
          }),
          1e4,
          "DNS resolution timed out",
        )
      ).map((F) => F.address);
    } catch {
      throw new GatewayInternalNetworksError(
        `Could not resolve gateway host ${n}. Connect to your organization's network and try again.`,
        "gateway login: could not resolve gateway host",
        "gateway",
      );
    }
  if (R.length === 0)
    throw new GatewayInternalNetworksError(
      `Could not resolve gateway host ${n}.`,
      "gateway login: gateway host resolved to zero addresses",
      "gateway",
    );
  let found = s.find((F) => R.some((L) => ipInCidr(L, F)));
  let found_2 = R.find((F) => (found ? !ipInCidr(F, found) : !isInternalAddress(F)));
  if (found_2 !== undefined && found)
    throw new GatewayTrustError(
      `Every address for gateway host ${n} must be inside its declared network ${found}, and it also resolves to ${found_2}. Publish only records inside ${found} for it.`,
      "gateway login: gateway host resolves outside its declared network",
    );
  if (found_2 !== undefined) {
    let any = R.some((L) => isInternalAddress(L));
    throw new GatewayAllowlistError(
      `Gateway hosts must be on your organization's private network; ${n} resolves to the public (or unrecognized) address ${found_2}` +
        (s.length > 0 ? `, outside the networks declared in managed settings (${s.join(", ")})` : "") +
        ". " +
        (any
          ? "Every address for a gateway host must be private \u2014 if this is " +
            "a dual-stack DNS name, publish only private records for it (for example, remove the public AAAA record)."
          : r
            ? "Use your gateway's private (internal) address or DNS name instead."
            : "Connect to your organization's network and try again."),
      "gateway login: gateway host resolves to a public address",
    );
  }
  if (found && proxyUrl && !shouldBypassProxy(href))
    throw new GatewayTrustError(
      `${n} is on the declared network ${found}, which Claude Code checks over a direct connection, not through an HTTP proxy. Add ${S} to NO_PROXY and try again.`,
      "gateway login: declared-network gateway behind a proxy",
    );
  return found;
}
//@ chunk-aepeg2w5.js:249760-249784 placement
var HTTP_LOOPBACK = "http-loopback";
//@ chunk-aepeg2w5.js:249784-250013 placement
function hostCheckRetryHint(error, n) {
  if (error instanceof GatewayHostCheckError) return "Try again in a few minutes.";
  switch (error instanceof GatewayHostCheckRetryableError ? error.kind : undefined) {
    case "proxy-auth":
      return PROXY_NO_CREDENTIALS_MESSAGE;
    case "http-status":
      return "Try again in a few minutes.";
    case "no-answer":
    case undefined:
      return n;
  }
}
//@ chunk-aepeg2w5.js:250013-251114 placement
/**
 * 获取主机检查结果（可用担保方）。
 */
async function fetchHostCheckAnswer(e, timeoutMs, r, s, h, y, helperClock, w) {
  if (w !== undefined) return (await checkVoucher(w, e, timeoutMs, y, helperClock)) ? w : undefined;
  let R = s !== undefined;
  let x;
  try {
    x = await queryGatewayHostCheck(e, e, {
      timeoutMs,
      presentClientCertificate: R,
      ...(R && {
        authorization: s,
      }),
      helperClock,
    });
  } catch (error) {
    if (error instanceof GatewayHostCheckError) {
      logForDebugging(`[gateway] ${e} not vouched: no host-check answer from it (${errorMessage(error)})`);
      y.notVouched = `it did not say whether it is a recognized Claude gateway host (${errorMessage(error)})`;
      return;
    }
    logForDebugging(`[gateway] ${e} could not be asked which deployment serves it (${errorMessage(error)})`, {
      level: "warn",
    });
    let L =
      "could not be asked " +
      (r ? "through the configured proxy " : "") +
      `whether it is a recognized Claude gateway host (${errorMessage(error)})`;
    y.notVouched = `it ${L}`;
    throw new GatewayInternalNetworksError(
      `${e} ${L}. ` +
        hostCheckRetryHint(error, "Check your network connection and try again.") +
        (h === undefined ? "" : ` Or, if your organization runs the gateway at ${e} itself: ${h}`),
      "gateway login: could not learn which gateway deployment vouches for the host",
      "host",
    );
  }
  let P = x.listed ? getHttpsHostname(x.canonical) : undefined;
  if (P === undefined) {
    logForDebugging(
      `[gateway] ${e} not vouched: its own host-check answer disowns it or names no vouching deployment`,
    );
    y.notVouched = NOT_SERVED_MESSAGE;
    return;
  }
  return (await checkVoucher(P, e, timeoutMs, y, helperClock)) ? P : undefined;
}
export {
  isVouchedHostSetMember,
  hostOf,
  isVouchedHost,
  activeAllowlistEntries,
  allowlistFactsHash,
  HTTP_LOOPBACK,
  resolveGatewayTrustBasis,
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
};
