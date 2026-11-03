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
import { eao } from "../../utils/settings/types.js";
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
import { pn, Qn, queryGatewayHostCheck } from "./hostCheck.js";
import { getHttpsHostname } from "../../tools/WebFetchTool/utils.js";

/**
 * 地址是否为内网或回环（含 IPv4 映射）
 */
//@ chunk-aepeg2w5.js:238905-239215 placement
function isInternalAddress(e) {
  let lower = e.replace(/%.*$/, "").toLowerCase();
  if (isIPv4(lower)) return rf.some((h) => ipInCidr(lower, h));
  if (!isIPv6(lower)) return !1;
  let match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (match?.[1]) return isInternalAddress(match[1]);
  if (lower === "::1") return !0;
  let s = parseInt(/^([0-9a-f]{1,4}):/.exec(lower)?.[1] ?? "0", 16);
  return (s >= 65152 && s <= 65215) || (s >= 64512 && s <= 65023);
}
//@ chunk-aepeg2w5.js:239215-239294 placement
class Et extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unresolved;
  constructor(e, n, r) {
    super(e, n);
    this.unresolved = r;
  }
}
//@ chunk-aepeg2w5.js:239294-239314 placement
class qa extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:239314-239334 placement
class uf extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:239334-239348 placement
var of = 8,
  ES = 4;
/**
 * 解析托管设置 gatewayInternalNetworks（CIDR 列表，拒绝私有/保留/文档地址）。
 */
//@ chunk-aepeg2w5.js:239348-240670 placement
function parseInternalNetworks(e) {
  let n = (h) =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `gatewayInternalNetworks in managed settings ${h}.`,
      "gateway login: invalid gatewayInternalNetworks",
    );
  if (e.includes(eao)) throw n("is not a list of CIDR strings; sign-in is refused until it is fixed");
  let mapped = e.map((h) => {
      let trimmed = h.trim(),
        [S = "", w = ""] = trimmed.split("/"),
        R = Number(w),
        reduced = S.split(".").reduce((L, G) => L * 256 + Number(G), 0);
      if (!isIPv4(S) || !ipInCidr(S, trimmed) || R < of || reduced % 2 ** (32 - R) !== 0)
        throw n(
          `entry "${trimmed}" is not an IPv4 block written as first-address/prefix, /${of} to /32 (like 203.0.113.0/24, but your own)`,
        );
      let P = `${S}/${R}`,
        found = [...rf, ...fF, ...vS].find((L) => ipInCidr(S, L) || ipInCidr(firstLineOf(L, "/"), P));
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
    }),
    s = uniq(mapped);
  if (s.length > ES) throw n(`lists ${s.length} blocks; at most ${ES} are accepted`);
  for (let [h, y] of s.entries()) {
    let found = s.find(
      (w, R) => R > h && (ipInCidr(firstLineOf(y, "/"), w) || ipInCidr(firstLineOf(w, "/"), y)),
    );
    if (found) throw n(`entries "${y}" and "${found}" overlap; list disjoint blocks`);
  }
  return s;
}
/**
 * 检查网关实际连接地址在声明的内网中。
 */
//@ chunk-aepeg2w5.js:240670-241318 placement
function checkAddressInNetwork(e, n, r, s) {
  if (!ipInCidr(s, e))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} answered from ${s || "an unknown address"}, outside its declared network ${e}: the name resolved differently between lookup and connect. Try again.`,
      "gateway login: gateway address outside declared network",
    );
  if (!ipInCidr(r, e))
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Code only signs in to ${n} from inside its declared network ${e} (managed settings), and this machine is connecting from ${r || "an unknown address"}, outside it. Sign in ` +
        "from the host OS on that network \u2014 not from a container, WSL2, or a " +
        `VPN whose addresses sit outside ${e}.`,
      "gateway login: this machine is outside the declared network",
    );
  return;
}
//@ chunk-aepeg2w5.js:241318-241399 placement
var DS = ["claude.fedstart.com", "claude.palantirfedstart.com"],
  Xa = new Set([...DS]);
//@ chunk-aepeg2w5.js:241399-241436 placement
function lf(e) {
  return DS.includes(e);
}
//@ chunk-aepeg2w5.js:241436-241469 placement
function Dpr(e) {
  return Xa.has(e);
}
//@ chunk-aepeg2w5.js:241469-241549 placement
var pF = "fa1b59ed47a63ea89b36bbb033a12fbfc68878f4eba30bf33d02ae50c0078d10",
  sf = [];
/**
 * 当前日期有效的客户允许列表条目。
 */
//@ chunk-aepeg2w5.js:241549-242209 placement
function activeAllowlistEntries(
  e = sf,
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
function cf(e) {
  return computeContentHash(
    e.facts.toSorted().join(`
`),
  );
}
//@ chunk-aepeg2w5.js:242264-242326 placement
function NS(e) {
  return createHmac("sha256", pF).update(e).digest("hex");
}
//@ chunk-aepeg2w5.js:242326-242445 placement
function caPublicKeyFact(e) {
  try {
    let publicKey = new X509Certificate(e).publicKey;
    return `ca:${computeContentHash(publicKey.export({ type: "spki", format: "der" }))}`;
  } catch {
    return "ca:";
  }
}
/**
 * 判断证书是否来自公共 CA。
 */
//@ chunk-aepeg2w5.js:242445-243172 placement
function describeCertificateIssuer(e, n = rootCertificates) {
  try {
    let r = new X509Certificate(e),
      { asymmetricKeyType: asymmetricKeyType, asymmetricKeyDetails: asymmetricKeyDetails } = r.publicKey,
      y = caPublicKeyFact(e);
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
      ? void 0
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
    .map((r) => ({ fact: caPublicKeyFact(r), pem: r }))
    .filter((r) => n.has(NS(r.fact)))
    .filter((r) => {
      let s = describeCertificateIssuer(r.pem);
      if (s !== void 0) logForDebugging(`[gateway] customer allowlist: a listed root is skipped: ${s}`);
      return s === void 0;
    });
}
//@ chunk-aepeg2w5.js:243464-243708 placement
function ipCidrFacts(e = "") {
  let replaced = e.replace(/^::ffff:/, "");
  if (!isIPv4(replaced)) return [];
  let reduced = replaced.split(".").reduce((s, h) => s * 256 + Number(h), 0);
  return Array.from({ length: 33 - of }, (s, h) => {
    let y = reduced - (reduced % 2 ** h);
    return `cidr:${[24, 16, 8, 0].map((S) => (y >>> S) & 255).join(".")}/${32 - h}`;
  });
}
/**
 * 用客户允许列表核对网关。
 */
//@ chunk-aepeg2w5.js:243708-244489 placement
async function checkCustomerAllowlist(e) {
  if (sf.length === 0 || !e.startsWith("https:")) return;
  let n = activeAllowlistEntries();
  if (
    (logForDebugging(`[gateway] customer allowlist: ${n.length} of ${sf.length} entries count on this date`),
    n.length === 0)
  )
    return;
  for (let r of [void 0, ...findListedRoots(n)]) {
    let s = await fetchGatewayCertificate(e, 1e4, void 0, { onlyRoot: r?.pem }).catch((S) => {
      logForDebugging(
        `[gateway] customer allowlist: no usable connection to ${e}${r ? ", trusting only a listed root" : ""}: ${errorMessage(S)}`,
      );
      return;
    });
    if (s === void 0) continue;
    let h = new Set([`host:${s.hostname}`, ...ipCidrFacts(s.remoteAddress), ...(r ? [r.fact] : [])].map(NS)),
      found = n.find((S) => S.facts.every((fact) => h.has(fact)));
    if (
      (logForDebugging(
        `[gateway] customer allowlist: ${s.hostname}, answered from ${s.remoteAddress || "an unknown address"}${r ? ", verified under a listed root alone" : ""}: matches ${found ? "an" : "no"} entry`,
      ),
      found)
    )
      return { judged: s, entry: cf(found) };
  }
  return;
}
/**
 * 取 URL 主机名（去掉 IPv6 方括号）。
 */
//@ chunk-aepeg2w5.js:244489-244545 placement
function hostOf(e) {
  return e.hostname.replace(/^\[|\]$/g, "");
}
//@ chunk-aepeg2w5.js:244545-244587 placement
function yF(e) {
  if (lf(e)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:244587-244858 placement
var VOUCH_TIMEOUT_MS = 5000,
  LOOKUP_TIMEOUT_MS = 3000,
  TOTAL_TIMEOUT_MS = 6000,
  VOUCH_TIMEOUT_MESSAGE = "gateway vouching did not finish in time",
  LOOKUP_TIMEOUT_MESSAGE = "gateway lookups did not finish in time",
  VOUCH_FAILED_MESSAGE = "gateway login: could not confirm the host with its vouching gateway",
  NOT_SERVED_MESSAGE = "when asked, it did not name a recognized Claude gateway host that serves it";
/**
 * 可暂停的计时器（等待 helper 时不计时）。
 */
//@ chunk-aepeg2w5.js:244858-245252 placement
function createPausableClock() {
  let e = 0,
    n,
    r;
  return {
    clock: {
      pause() {
        return (
          (n = Date.now()),
          () => {
            if (n !== void 0) ((e += Date.now() - n), (n = void 0));
            let h = r;
            ((r = void 0), h?.());
          }
        );
      },
    },
    race(h, y) {
      let now = Date.now();
      return new Promise((w, R) => {
        let x,
          P = () => {
            if (n !== void 0) {
              r = P;
              return;
            }
            let F = y + e - (Date.now() - now);
            if (F <= 0) {
              R(Error(VOUCH_TIMEOUT_MESSAGE));
              return;
            }
            x = setTimeout(P, F);
          };
        (P(),
          h.then(
            (F) => {
              (clearTimeout(x), (r = void 0), w(F));
            },
            (F) => {
              (clearTimeout(x), (r = void 0), R(F));
            },
          ));
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
function US(e, n) {
  return e.protocol === "https:" && e.port === "" && !isIPv4(n) && !isIPv6(n) && isValidHostname(n);
}
/**
 * 判定网关可信依据，管理员可退回客户允许列表。
 */
//@ chunk-aepeg2w5.js:245581-245777 placement
async function resolveGatewayTrustBasis(e, n = [], r = "developer") {
  try {
    return await resolveGatewayBasis(e, n, VOUCH_TIMEOUT_MS);
  } catch (error) {
    let h = error instanceof uf && r === "administrator" ? await checkCustomerAllowlist(e) : void 0;
    if (h === void 0) throw error;
    return { basis: "allowlisted", ...h };
  }
}
/**
 * 判定网关可信依据（已列出、内网、担保）。
 */
//@ chunk-aepeg2w5.js:245777-247322 placement
async function resolveGatewayBasis(e, n, r, s, h, y = { voucherNamed: !1 }, S) {
  let w = new URL(e),
    R = hostOf(w),
    x = isIPv4(R) || isIPv6(R);
  if (w.protocol === "https:" && Xa.has(R)) return { basis: "listed" };
  let P = w.protocol === "https:" ? parseInternalNetworks(n) : [],
    F = S === void 0 ? void 0 : s,
    now = Date.now(),
    G = { proxyChecked: !1 };
  try {
    let j = checkGatewayReachability(w, R, x, P, G),
      ee =
        F === void 0
          ? await j
          : await withTimeout(j, F, LOOKUP_TIMEOUT_MESSAGE).catch((q) => {
              if (q instanceof Error && q.message === LOOKUP_TIMEOUT_MESSAGE) {
                let Q = G.proxyChecked ? `gateway host ${R}` : "the configured HTTP proxy";
                throw new Et(
                  `${Q} could not be resolved within ${Math.max(1, Math.round(F / 1000))} seconds. Try again.`,
                  "gateway login: lookups did not finish in time",
                  G.proxyChecked ? "gateway" : "proxy",
                );
              }
              throw q;
            });
    return (releaseGatewayHost(R), ee === void 0 ? { basis: "network" } : { basis: "network", network: ee });
  } catch (error) {
    if (
      !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
      error instanceof qa ||
      (error instanceof Et && error.unresolved === "proxy") ||
      !US(w, R)
    )
      throw error;
    let ee = getUsableProxyUrl() !== void 0 && !shouldBypassProxy(e);
    if (error instanceof Et && !ee) throw error;
    let q = createPausableClock(),
      Q = fetchHostCheckAnswer(
        R,
        r,
        ee,
        h,
        error instanceof Et ? void 0 : errorMessage(error),
        y,
        q.clock,
        S,
      ),
      re = F === void 0 ? s : Math.max(F - (Date.now() - now), r),
      se =
        re === void 0
          ? await Q
          : await q.race(Q, re).catch((Se) => {
              if (Se instanceof Error && Se.message === VOUCH_TIMEOUT_MESSAGE) {
                if (!y.voucherNamed)
                  y.notVouched =
                    "it could not be asked in time whether it is a recognized Claude gateway host";
                throw new Et(
                  `${R} could not be confirmed as a recognized Claude gateway host ${F === void 0 ? `within ${Math.max(1, Math.round(re / 1000))} seconds` : "in time"}. Try again.`,
                  "gateway login: vouching did not finish in time",
                  y.voucherNamed ? "voucher" : "host",
                );
              }
              throw Se;
            });
    if (se === void 0) throw error;
    return (
      logForDebugging(`[gateway] ${R} accepted: vouched for by ${se}`),
      holdGatewayHostStrict(R),
      { basis: "vouched" }
    );
  }
}
/**
 * 通过代理或直连检查网关地址。
 */
//@ chunk-aepeg2w5.js:247322-249760 placement
async function checkGatewayReachability(e, n, r, s, h = { proxyChecked: !1 }) {
  let href = e.href,
    S = isIPv6(n) ? `[${n}]:${e.port || (e.protocol === "http:" ? "80" : "443")}` : n,
    w = getProxyUrl();
  if (w && !shouldBypassProxy(href)) {
    let F, L;
    try {
      if (((F = new URL(w).hostname.replace(/^\[|\]$/g, "")), !F)) throw Error("no hostname");
      L =
        isIPv4(F) || isIPv6(F)
          ? [F]
          : (await withTimeout(lookup_2(F, { all: !0 }), 1e4, "DNS resolution timed out")).map(
              (ee) => ee.address,
            );
    } catch {
      throw new Et(
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
  h.proxyChecked = !0;
  let R;
  if (r) R = [n];
  else
    try {
      R = (await withTimeout(lookup_2(n, { all: !0 }), 1e4, "DNS resolution timed out")).map(
        (F) => F.address,
      );
    } catch {
      throw new Et(
        `Could not resolve gateway host ${n}. Connect to your organization's network and try again.`,
        "gateway login: could not resolve gateway host",
        "gateway",
      );
    }
  if (R.length === 0)
    throw new Et(
      `Could not resolve gateway host ${n}.`,
      "gateway login: gateway host resolved to zero addresses",
      "gateway",
    );
  let found = s.find((F) => R.some((L) => ipInCidr(L, F))),
    found_2 = R.find((F) => (found ? !ipInCidr(F, found) : !isInternalAddress(F)));
  if (found_2 !== void 0 && found)
    throw new qa(
      `Every address for gateway host ${n} must be inside its declared network ${found}, and it also resolves to ${found_2}. Publish only records inside ${found} for it.`,
      "gateway login: gateway host resolves outside its declared network",
    );
  if (found_2 !== void 0) {
    let any = R.some((L) => isInternalAddress(L));
    throw new uf(
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
  if (found && w && !shouldBypassProxy(href))
    throw new qa(
      `${n} is on the declared network ${found}, which Claude Code checks over a direct connection, not through an HTTP proxy. Add ${S} to NO_PROXY and try again.`,
      "gateway login: declared-network gateway behind a proxy",
    );
  return found;
}
//@ chunk-aepeg2w5.js:249760-249784 placement
var HTTP_LOOPBACK = "http-loopback";
//@ chunk-aepeg2w5.js:249784-250013 placement
function hostCheckRetryHint(e, n) {
  if (e instanceof pn) return "Try again in a few minutes.";
  switch (e instanceof Qn ? e.kind : void 0) {
    case "proxy-auth":
      return PROXY_NO_CREDENTIALS_MESSAGE;
    case "http-status":
      return "Try again in a few minutes.";
    case "no-answer":
    case void 0:
      return n;
  }
}
/**
 * 获取主机检查结果（可用担保方）。
 */
//@ chunk-aepeg2w5.js:250013-251114 placement
async function fetchHostCheckAnswer(e, n, r, s, h, y, S, w) {
  if (w !== void 0) return (await checkVoucher(w, e, n, y, S)) ? w : void 0;
  let R = s !== void 0,
    x;
  try {
    x = await queryGatewayHostCheck(e, e, {
      timeoutMs: n,
      presentClientCertificate: R,
      ...(R && { authorization: s }),
      helperClock: S,
    });
  } catch (error) {
    if (error instanceof pn) {
      (logForDebugging(`[gateway] ${e} not vouched: no host-check answer from it (${errorMessage(error)})`),
        (y.notVouched = `it did not say whether it is a recognized Claude gateway host (${errorMessage(error)})`));
      return;
    }
    logForDebugging(`[gateway] ${e} could not be asked which deployment serves it (${errorMessage(error)})`, {
      level: "warn",
    });
    let L =
      "could not be asked " +
      (r ? "through the configured proxy " : "") +
      `whether it is a recognized Claude gateway host (${errorMessage(error)})`;
    throw (
      (y.notVouched = `it ${L}`),
      new Et(
        `${e} ${L}. ` +
          hostCheckRetryHint(error, "Check your network connection and try again.") +
          (h === void 0 ? "" : ` Or, if your organization runs the gateway at ${e} itself: ${h}`),
        "gateway login: could not learn which gateway deployment vouches for the host",
        "host",
      )
    );
  }
  let P = x.listed ? getHttpsHostname(x.canonical) : void 0;
  if (P === void 0) {
    (logForDebugging(
      `[gateway] ${e} not vouched: its own host-check answer disowns it or names no vouching deployment`,
    ),
      (y.notVouched = NOT_SERVED_MESSAGE));
    return;
  }
  return (await checkVoucher(P, e, n, y, S)) ? P : void 0;
}

export {
  Dpr,
  hostOf,
  lf,
  activeAllowlistEntries,
  cf,
  HTTP_LOOPBACK,
  resolveGatewayTrustBasis,
  yF,
  NOT_SERVED_MESSAGE,
  Et,
  hostCheckRetryHint,
  VOUCH_FAILED_MESSAGE,
  US,
  Xa,
  parseInternalNetworks,
  resolveGatewayBasis,
  LOOKUP_TIMEOUT_MS,
  TOTAL_TIMEOUT_MS,
  checkAddressInNetwork,
  isInternalAddress,
};
