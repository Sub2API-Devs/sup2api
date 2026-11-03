/**
 * services/claudeGateway/server.ts
 *
 * 2.1.316 新增：claude gateway 服务主体
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import { createHash, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { readFile } from "fs/promises";
import http from "http";
import { gatewayServerBlockedMessage, ProviderNotAllowedError } from "../../utils/model/allowedProviders.js";
import {
  assertNativeBinary,
  PRIVATE_NETWORK_RANGES,
  retryPostgresConnect,
  PG_CONNECT_REFUSED_RE,
  PG_RETRY_INTERVAL_MS,
  PG_RETRY_MAX_ATTEMPTS,
  notFoundResponse,
  oauthErrorResponse,
  NO_STORE_HEADERS,
  isHostEntrypointClient,
  criIdentityFields,
  REQUEST_ID_RE,
  X_CLIENT_REQUEST_ID,
  X_REQUEST_ID,
  withSecurityHeaders,
} from "./httpServer.js";
import { loadGatewayConfig } from "./config/load.js";
import { gatewayJsonLog, gatewayLog, printGatewayBanner } from "../gateway/gatewayBanner.js";
import { configureGatewayNetwork } from "./network.js";
import { parseCidrList, warnIfMetadataReachable } from "./ssrfGuard.js";
import { OtelFanout, isAdminGroupMember, OTLP_PATH_KINDS } from "./telemetry/otelFanout.js";
import { parseMaxHttpRequests, createOverloadWarner } from "./concurrency.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { openGatewayPostgres } from "./store/postgres.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { createSpendLimitAdmin, isSpendLimitsPath, handleSpendLimitAdmin } from "./spendLimits.js";
import { createCriJwtVerifier, isCriJwtTyp } from "./auth/criJwt.js";
import { createPolicyWebhook } from "./policyHook.js";
import {
  deriveTokenKeys,
  signSessionJwt,
  userCodeKey,
  DEVICE_CODE_GRANT_TYPE,
  DEFAULT_TOKEN_KEY_VERSION,
  verifySessionJwt,
  rateLimitKey,
  generateUserCode,
  generateUserCode_2,
  deviceCodeHashKey,
  encryptDeviceGrant,
  DEVICE_GRANT_TTL_SECONDS,
  DEVICE_GRANT_TTL_SEC,
  decryptDeviceGrant,
  generators,
  encryptOAuthState,
  decryptOAuthState,
} from "./auth/tokens.js";
import {
  readClaim,
  readFirstClaim,
  assertEmailAllowed,
  assertGroupAllowed,
  createOidcClient,
  createClientAssertionSigner,
} from "./auth/oidc.js";
import { createGoogleGroupsLookup } from "./auth/googleGroups.js";
import { createUpstreamForwarders } from "./upstreams/forward.js";
import { resolveManagedPolicies, matchPolicy } from "./config/managedPolicies.js";
import { uniq } from "../../utils/collections.js";
import { claimOnce } from "../api/verificationRequired.js";
import { isIpInRanges, resolveClientIp } from "./accessControl.js";
import { withTimeout, sleep } from "../../utils/sleep.js";
import { readMdmSnapshot, replaceMdmSetting } from "../../utils/settings/mdm/settings.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { gatewayIndexPage, deviceCodePage, deviceDeniedPage, signInResultPage } from "./pages.js";
import { buildGatewayProtocolDoc } from "./protocolDoc.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isProxiedPath, forwardedRequestParts, countTokensViaUpstreams } from "./proxyRequest.js";
import { jsonErrorResponse, finalizeUpstreamResponse, GATEWAY_DIAGNOSTIC_HEADERS } from "./upstreamErrors.js";
import { findModelConfigById } from "../../utils/model/providerCaches.js";
import { isManagedClaudeCodeDesktopSession, buildClientBootstrapConfig } from "./clientSurface.js";
import { modelsResponse } from "./models.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { handleGatewayMessagesRequest } from "./messagesHandler.js";
import { collectGatewayConfigWarnings } from "./config/warnings.js";

//@ chunk-1ny7cxrt.js:1521692-1553390 placement
/**
 * claude gateway 入口：加载并校验配置、建立存储与认证、启动 HTTP 服务与遥测。
 */
async function startClaudeGateway(e) {
  let t = gatewayServerBlockedMessage();
  if (t !== undefined) throw new ProviderNotAllowedError(t);
  assertNativeBinary();
  let gatewayConfig = await loadGatewayConfig(e);
  gatewayJsonLog("config.load", {
    path: e,
    sha256: createHash("sha256").update(JSON.stringify(gatewayConfig)).digest("hex"),
  });
  configureGatewayNetwork();
  let cidrList = parseCidrList(gatewayConfig.listen.trusted_proxies);
  let cidrList_2 = parseCidrList(gatewayConfig.access_control.allow_cidrs);
  let cidrList_3 = parseCidrList(gatewayConfig.access_control.deny_cidrs);
  let cidrList_4 = parseCidrList([...PRIVATE_NETWORK_RANGES, "169.254.0.0/16", "fe80::/10"]);
  let l = false;
  let c = false;
  let u = {
    device_authorization: 0,
    device_verify: 0,
  };
  let f = 0;
  let readinessGraceSeconds = gatewayConfig.store.readiness_grace_seconds;
  let m = false;
  let y = null;
  let b = null;
  let w = false;
  let S = new OtelFanout();
  let maxHttpRequests = parseMaxHttpRequests(getPreSettingsEnvSnapshot().BUN_CONFIG_MAX_HTTP_REQUESTS);
  let overloadWarner = createOverloadWarner(maxHttpRequests);
  let N = await retryPostgresConnect(() =>
    openGatewayPostgres(gatewayConfig.store.postgres_url, {
      auditRetentionDays: gatewayConfig.admin?.audit_retention_days,
      maxConnections: gatewayConfig.store.max_connections,
      connectTimeoutSeconds: gatewayConfig.store.connect_timeout_seconds,
      username: gatewayConfig.store.username,
      password: gatewayConfig.store.password,
      spendRetentionMonths: gatewayConfig.admin?.spend_retention_months,
      identityRetentionDays: gatewayConfig.admin?.identity_retention_days,
    }),
  ).catch((error) => {
    let Fe = errorMessage(error);
    if (PG_CONNECT_REFUSED_RE.test(Fe)) {
      gatewayLog(
        "error",
        `could not connect to Postgres at boot: ${Fe}. Check store.postgres_url. If the database needs longer to become reachable, raise store.connect_timeout_seconds (now ${gatewayConfig.store.connect_timeout_seconds}s)`,
      );
      throw Error(`could not connect to Postgres: ${Fe}. Check store.postgres_url in ${e}`);
    }
    if (getErrnoCode(error) === "ERR_INVALID_URL" || error instanceof URIError)
      throw Error(
        `store.postgres_url in ${e} is not a URL the gateway can read. It takes one host, as postgres://host:port/database; a comma-separated list of hosts is not supported. A password containing / ? # or % goes in store.password, not in the URL`,
      );
    throw error;
  });
  let keys = {
    readKeys: gatewayConfig.admin?.read_keys ?? [],
    writeKeys: gatewayConfig.admin?.write_keys ?? [],
  };
  let F = gatewayConfig.load_test_mode?.enabled
    ? await (
        await import("./chunk-hde10cf2.js")
      )
        .startLoadTest(gatewayConfig.load_test_mode, N.sql)
        .catch((error) => {
          N.close();
          throw error;
        })
    : undefined;
  let spendLimitAdmin = createSpendLimitAdmin(N.sql, gatewayConfig, F?.spendFault);
  let joined = [
    ...(gatewayConfig.oidc ? ["new sign-ins fail"] : []),
    !spendLimitAdmin
      ? "inference is not affected"
      : gatewayConfig.enforcement.fail_closed_on_error
        ? "signed-in developers' inference is refused with 429 'spend limit unavailable' (enforcement.fail_closed_on_error is true)"
        : "spend limits are not enforced, signed-in developers' requests pass unchecked (enforcement.fail_closed_on_error is false)",
  ].join("; ");
  let Me = gatewayConfig.cri?.enabled === true;
  let ce =
    Me && gatewayConfig.cri
      ? createCriJwtVerifier({
          audience: gatewayConfig.cri.audience,
          orgAllowlist: gatewayConfig.cri.org_allowlist,
          jwksUrl: gatewayConfig.cri.jwks_url,
          issuer: gatewayConfig.cri.issuer,
        })
      : null;
  if (ce !== null) await ce.prime();
  let policyWebhook = createPolicyWebhook(gatewayConfig);
  let tokenKeys = deriveTokenKeys(gatewayConfig.session.jwt_secret);
  let publicUrl = gatewayConfig.listen.public_url;
  let groupsClaim = gatewayConfig.oidc?.groups_claim ?? "groups";
  let emailClaim = gatewayConfig.oidc?.email_claim ?? "email";
  let userIdClaim = gatewayConfig.oidc?.user_id_claim ?? "sub";
  let Ur;
  function An(_e) {
    return typeof _e === "string" && _e.length > 0 ? _e : undefined;
  }
  function xe(_e) {
    let claim = readClaim(_e, groupsClaim);
    if (typeof claim === "string") return claim.length > 0 ? [claim] : undefined;
    if (!Array.isArray(claim)) return;
    let filtered = claim.filter((bt) => typeof bt === "string" && bt.length > 0);
    return filtered.length > 0 ? filtered : undefined;
  }
  function rn(_e) {
    return readClaim(_e, groupsClaim) !== undefined;
  }
  function Hr(_e) {
    return readFirstClaim(_e, emailClaim) !== undefined;
  }
  async function Cs(_e, Fe, clientIp, bt, Zr) {
    gatewayLog(
      "debug",
      `oidc id_token claim names request_id=${bt}: ${Object.keys(_e).sort().join(",")}` +
        (Zr ? `; userinfo claim names: ${Object.keys(Zr).sort().join(",")}` : ""),
    );
    let Vt = Hr(_e) ? readFirstClaim(_e, emailClaim) : Zr ? readFirstClaim(Zr, emailClaim) : undefined;
    assertEmailAllowed(
      {
        email: Vt,
        email_verified: _e.email_verified ?? Zr?.email_verified,
      },
      gatewayConfig.oidc?.allowed_email_domains,
    );
    if (An(_e.sub) === undefined) throw Error("IdP claims missing required `sub`");
    let Ts = An(readClaim(_e, userIdClaim));
    if (Ts === undefined)
      throw Object.assign(
        Error(
          `oidc.user_id_claim names \`${userIdClaim}\`, which the IdP did not send as a non-empty string. Check oidc.scopes, and oidc.scope_on_refresh if only refreshes fail`,
        ),
        {
          code: "USER_ID_CLAIM_MISSING",
        },
      );
    let ji = typeof Vt === "string" ? Vt : undefined;
    let zr;
    if (Ur) {
      if (ji === undefined)
        throw Object.assign(
          Error(
            "oidc.google_groups is configured but the id_token has no email \u2014 check oidc.email_claim and that the email scope is requested",
          ),
          {
            code: "GOOGLE_GROUPS_UNAVAILABLE",
          },
        );
      zr = await Ur(ji);
    } else {
      zr = rn(_e) ? xe(_e) : Zr ? xe(Zr) : undefined;
      if (
        Fe === "session.refresh" &&
        !rn(_e) &&
        !Zr &&
        gatewayConfig.upstreams.some((upstream) => upstream.groups)
      )
        gatewayLog(
          "info",
          `refresh request_id=${bt}: no groups claim for sub=${Ts}, so only upstreams without groups serve them. If your IdP leaves groups out of the refreshed id_token, set oidc.userinfo_fallback: true`,
        );
    }
    assertGroupAllowed(zr, gatewayConfig.oidc?.allowed_groups);
    let name = An(_e.name) ?? An(Zr?.name);
    let _l = await signSessionJwt(
      {
        sub: Ts,
        email: ji,
        name,
        groups: zr,
      },
      tokenKeys,
      gatewayConfig.session.ttl_hours,
      publicUrl,
    );
    gatewayJsonLog(Fe, {
      request_id: bt,
      result: "success",
      sub: Ts,
      email: ji,
      client_ip: clientIp,
      ttl_hours: gatewayConfig.session.ttl_hours,
    });
    return _l;
  }
  let googleGroups = gatewayConfig.oidc?.google_groups;
  if (googleGroups) Ur = await createGoogleGroupsLookup(googleGroups);
  let tls = gatewayConfig.listen.tls;
  let [Qt, upstreamForwarders, managedPolicies, Bi] = await Promise.all([
    gatewayConfig.oidc ? createOidcClient(gatewayConfig.oidc) : Promise.resolve(null),
    createUpstreamForwarders(gatewayConfig.upstreams, F?.fetch),
    resolveManagedPolicies(gatewayConfig),
    tls
      ? Promise.all([readFile(tls.cert, "utf8"), readFile(tls.key, "utf8")]).then(([_e, Fe]) => ({
          cert: _e,
          key: Fe,
        }))
      : Promise.resolve(undefined),
  ]);
  let vr =
    Qt &&
    gatewayConfig.oidc?.token_endpoint_auth_method === "private_key_jwt" &&
    gatewayConfig.oidc.client_assertion
      ? createClientAssertionSigner(
          gatewayConfig.oidc.client_id,
          gatewayConfig.oidc.client_assertion,
          Qt.issuer.metadata.token_endpoint,
        )
      : undefined;
  let qd = managedPolicies?.some((managedPolicy) => managedPolicy.desktop !== undefined) ?? false;
  let scope = uniq(gatewayConfig.oidc?.scopes ?? ["openid", "profile", "email", "offline_access"]).join(" ");
  async function rO(_e, accessToken) {
    if (!gatewayConfig.oidc?.userinfo_fallback || !accessToken || !Qt) return;
    if (Hr(_e) && (Ur !== undefined || rn(_e))) return;
    let In = await Qt.userinfo(accessToken);
    if (typeof In.sub !== "string" || In.sub !== _e.sub)
      throw Error("userinfo sub missing or does not match id_token sub");
    return In;
  }
  if (
    Qt &&
    gatewayConfig.oidc?.scopes &&
    !gatewayConfig.oidc.scopes.includes("offline_access") &&
    Array.isArray(Qt.issuer.metadata.scopes_supported) &&
    Qt.issuer.metadata.scopes_supported.includes("offline_access")
  )
    gatewayLog(
      "warn",
      "oidc.scopes omits offline_access but the IdP advertises it \u2014 refresh tokens " +
        `will not be issued; developers re-run the browser login every ${gatewayConfig.session.ttl_hours}h (session.ttl_hours)`,
    );
  if (
    Qt &&
    gatewayConfig.oidc &&
    (Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
    (gatewayConfig.oidc.extra_auth_params.access_type !== "offline" ||
      !(gatewayConfig.oidc.extra_auth_params.prompt ?? "").split(" ").includes("consent"))
  )
    gatewayLog(
      "warn",
      "oidc.issuer is accounts.google.com \u2014 Google ignores offline_access and needs " +
        `extra_auth_params: { access_type: offline, prompt: consent } and scopes: [openid, profile, email] for refresh tokens. Without both params developers re-run the browser login every ${gatewayConfig.session.ttl_hours}h (session.ttl_hours); without prompt: consent specifically, refresh tokens ` +
        "are issued only on each user\u2019s first login.",
    );
  if (
    Qt &&
    (Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
    (gatewayConfig.oidc?.allowed_groups?.length ?? 0) > 0 &&
    !gatewayConfig.oidc?.google_groups
  )
    gatewayLog(
      "warn",
      "oidc.allowed_groups is set but Google ID tokens do not carry a groups claim \u2014 " +
        "every login will be denied. Set oidc.google_groups to fetch Workspace groups via the Admin SDK, or use allowed_email_domains instead.",
    );
  if (
    Qt &&
    gatewayConfig.oidc?.google_groups &&
    !(Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com")
  )
    gatewayLog(
      "warn",
      "oidc.google_groups is set but oidc.issuer is not accounts.google.com \u2014 " +
        "the Directory API only returns groups for Google Workspace users, so every login will be refused",
    );
  let idpOrigin =
    Qt && gatewayConfig.oidc
      ? uniq([
          new URL(Qt.issuer.metadata.authorization_endpoint ?? gatewayConfig.oidc.issuer).origin,
          ...gatewayConfig.oidc.form_action_origins,
        ]).join(" ")
      : "";
  let iO =
    Boolean(Bi) ||
    (gatewayConfig.listen.public_url !== undefined &&
      new URL(gatewayConfig.listen.public_url).protocol === "https:");
  let Jg = iO ? "__Host-gw_dev" : "gw_dev";
  let oO = `HttpOnly; SameSite=Lax; Path=/${iO ? "; Secure" : ""}`;
  function J1(_e) {
    let Fe = _e.headers.get("cookie") ?? "";
    for (let In of Fe.split(";")) {
      let index = In.indexOf("=");
      if (index > 0 && In.slice(0, index).trim() === Jg) return In.slice(index + 1).trim();
    }
    return null;
  }
  async function X1(_e, clientIp, badHop, bt, Zr) {
    let Vt = (Ie, ht) =>
      gatewayJsonLog(Ie, {
        request_id: bt,
        ...ht,
      });
    let Ts = (userCode) =>
      N.del(userCodeKey(userCode)).catch((error) => {
        gatewayLog("warn", `user_code cleanup failed request_id=${bt}: ${errorMessage(error)}`);
      });
    let ji = (Ie) => {
      let now = Date.now();
      if (now - u[Ie] < 60000) return;
      u[Ie] = now;
      let { max, window_seconds: windowSeconds } = gatewayConfig.rate_limits[Ie];
      let Pt = Zr
        ? ` This request carried X-Forwarded-For, which the gateway ignored because ${clientIp} is not in listen.trusted_proxies. If ${clientIp} is your load balancer, add it there first so each developer is counted separately. If many developers still share an address after that`
        : " If many developers share that address";
      gatewayLog(
        "warn",
        `sign-in refused: ${clientIp ?? "unknown address"} went over rate_limits.${Ie}.max (${max} per ${windowSeconds}s per client address).${Pt}, for example behind a NAT, raise rate_limits.${Ie}.max.${Ie === "device_verify" ? " If they do not, someone may be guessing sign-in codes." : ""} Logged at most once a minute; every refusal has an audit event with "result":"rate_limited".`,
      );
    };
    let { pathname } = new URL(_e.url);
    let Bs = _e.method === "GET" && (pathname === "/healthz" || pathname === "/readyz");
    if (pathname === "/v1/messages" && _e.method === "POST") F?.arrived();
    let _l = cidrList_3.length > 0 || (cidrList_2.length > 0 && !Bs);
    if (badHop !== undefined) {
      if (claimOnce().claim("gateway_xff_unparseable"))
        gatewayLog(
          "warn",
          `X-Forwarded-For via trusted proxy ${clientIp} contained '${badHop}', which is not an IP address, so the real client is unknown; ` +
            (cidrList_3.length > 0 || cidrList_2.length > 0
              ? "access_control is set, so such requests get 403 (audit reason xff_unparseable). "
              : "per-IP rate limits and audit client_ip use the proxy address instead. ") +
            "Either a proxy writes something other than 'ip', 'ipv4:port' or '[ipv6]:port' (for example 'unknown', a hostname, or an IPv6 address with a port and no brackets), or listen.trusted_proxies covers hosts that are not your proxies.",
        );
      if (_l) {
        Vt("access.denied", {
          reason: "xff_unparseable",
          client_ip: clientIp,
          xff_hop: badHop,
        });
        return new Response("forbidden", {
          status: 403,
        });
      }
    }
    if (clientIp === undefined && _l) {
      Vt("access.denied", {
        reason: "client_ip_unknown",
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    if (isIpInRanges(clientIp, cidrList_3)) {
      Vt("access.denied", {
        reason: "ip_denylist",
        client_ip: clientIp,
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    if (_e.method === "GET" && pathname === "/healthz")
      return new Response("ok", {
        status: 200,
      });
    if (_e.method === "GET" && pathname === "/readyz") {
      if (readinessGraceSeconds === 0)
        try {
          await N.get("__readyz_probe__");
          m = false;
          return new Response("ready", {
            status: 200,
          });
        } catch (error) {
          if (!m) {
            m = true;
            gatewayLog(
              "warn",
              `Postgres is not answering (${errorMessage(error)}), so /readyz reports not ready and whatever checks /readyz may stop sending this replica traffic or replace it. To keep reporting ready through a short outage such as a database failover, set store.readiness_grace_seconds to more seconds than the outage lasts (at most 3600)`,
            );
          }
          return new Response("store unavailable", {
            status: 503,
          });
        }
      b ??= withTimeout(
        N.get("__readyz_probe__"),
        PG_RETRY_INTERVAL_MS,
        `no reply within ${PG_RETRY_INTERVAL_MS / 1000}s`,
      )
        .then(
          () => {
            if (y !== null)
              gatewayLog(
                "info",
                `Postgres is answering again after about ${Math.round((performance.now() - y) / 1000)}s; /readyz reports ready`,
              );
            y = null;
            w = false;
          },
          (error) => {
            if (y === null) {
              y = performance.now();
              gatewayLog(
                "warn",
                `Postgres is not answering (${errorMessage(error)}). /readyz keeps reporting ready for up to ${readinessGraceSeconds}s (store.readiness_grace_seconds), then reports not ready. Until Postgres is back: ${joined}`,
              );
            }
          },
        )
        .finally(() => {
          b = null;
        });
      await withTimeout(b, PG_RETRY_MAX_ATTEMPTS, "readyz answer bound").catch(() => {});
      if (y === null)
        return new Response("ready", {
          status: 200,
        });
      if (performance.now() - y <= readinessGraceSeconds * 1000)
        return new Response("ready", {
          status: 200,
        });
      if (!w) {
        w = true;
        gatewayLog(
          "warn",
          `Postgres has not answered for more than ${readinessGraceSeconds}s (store.readiness_grace_seconds), so /readyz now reports not ready and whatever checks /readyz may stop sending this replica traffic or replace it`,
        );
      }
      return new Response("store unavailable", {
        status: 503,
      });
    }
    if (cidrList_2.length > 0 && !isIpInRanges(clientIp, cidrList_2)) {
      Vt("access.denied", {
        reason: "ip_not_allowlisted",
        client_ip: clientIp,
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    let now = Date.now();
    if (now - f > 60000) {
      f = now;
      let mdmSnapshot = await readMdmSnapshot();
      replaceMdmSetting(mdmSnapshot.mdm, mdmSnapshot.hkcu, mdmSnapshot.wslInherits, mdmSnapshot.whereAsked);
      invalidateCommandNames();
    }
    let sO = gatewayServerBlockedMessage();
    if (sO !== undefined) {
      if (claimOnce().claim("gateway_provider_policy_refusal")) gatewayLog("error", sO);
      Vt("access.denied", {
        reason: "provider_policy",
        client_ip: clientIp,
      });
      return new Response("service unavailable", {
        status: 503,
      });
    }
    if (cidrList_2.length === 0 && !l && clientIp !== undefined && !isIpInRanges(clientIp, cidrList_4)) {
      l = true;
      Vt("access.public_client", {
        client_ip: clientIp,
      });
      gatewayLog(
        "warn",
        `request from ${clientIp}, which is not a private address: this gateway may be reachable from the public internet. It must not be: it can push settings that run commands on developer machines. Check the network in front of it, then set access_control.allow_cidrs (behind a proxy, set listen.trusted_proxies first so the gateway sees real client addresses)`,
      );
    }
    if (Zr && !c) {
      c = true;
      gatewayLog(
        "warn",
        `request from ${clientIp} carried an X-Forwarded-For header, but ${cidrList.length === 0 ? "listen.trusted_proxies is not set" : `${clientIp} is not in listen.trusted_proxies`}, so the gateway ignored the header and used ${clientIp} as the client address. If ${clientIp} is your load balancer or ingress, every developer behind it shares one sign-in rate limit (rate_limits) and one address in audit events: add its source range to listen.trusted_proxies. If developers connect directly and something on their side adds the header, nothing needs to change. Logged once per start, however many requests are affected.`,
      );
    }
    let limits = gatewayConfig.limits;
    if (limits.max_url_length !== undefined && _e.url.length > limits.max_url_length)
      return new Response("uri too long", {
        status: 414,
      });
    if (limits.max_request_header_bytes !== undefined) {
      let Ie = 0;
      for (let [ht, ot] of _e.headers) Ie += ht.length + ot.length + 4;
      if (Ie > limits.max_request_header_bytes)
        return new Response("request header fields too large", {
          status: 431,
        });
    }
    let $s = new URL(_e.url);
    let pathname_2 = $s.pathname;
    let Hi = gatewayConfig.listen.public_url ?? $s.origin;
    if (pathname_2 === "/" && _e.method === "GET")
      return gatewayIndexPage(
        Hi,
        gatewayConfig.oidc?.issuer ?? null,
        typeof {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        } !== "undefined"
          ? {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION
          : "unknown",
      );
    if (pathname_2 === "/.well-known/oauth-authorization-server")
      return Response.json({
        issuer: Hi,
        ...(gatewayConfig.oidc !== undefined
          ? {
              device_authorization_endpoint: `${Hi}/oauth/device_authorization`,
              token_endpoint: `${Hi}/oauth/token`,
              grant_types_supported: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
            }
          : {
              grant_types_supported: [],
            }),
        response_types_supported: [],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: ["openid", "profile", "email"],
        gateway_protocol_version: DEFAULT_TOKEN_KEY_VERSION,
        ...(Me && {
          cri_enabled: true,
        }),
      });
    if (pathname_2 === "/protocol" && _e.method === "GET")
      return new Response(
        buildGatewayProtocolDoc({
          oidcConfigured: gatewayConfig.oidc !== undefined,
          criEnabled: Me,
        }),
        {
          headers: {
            "content-type": "text/markdown; charset=utf-8",
          },
        },
      );
    let Xg = _e.headers.get("content-length");
    if (Xg === null && _e.headers.get("transfer-encoding"))
      return new Response("length required", {
        status: 411,
      });
    if (Xg !== null) {
      let Ie = Number(Xg);
      if (!Number.isFinite(Ie) || Ie < 0 || Ie > gatewayConfig.limits.max_request_bytes)
        return new Response("payload too large", {
          status: 413,
        });
    }
    if (gatewayConfig.admin && isSpendLimitsPath(pathname_2)) {
      let admin = gatewayConfig.admin;
      let ht = _e.headers.get("authorization");
      let oidcAdmin = null;
      if (admin.admin_groups.length > 0 && !_e.headers.get("x-api-key") && ht?.startsWith("Bearer ")) {
        let Pt = await verifySessionJwt(ht.slice(7), tokenKeys, publicUrl);
        if (Pt && isAdminGroupMember(Pt.groups, admin))
          oidcAdmin = {
            sub: Pt.sub,
          };
      }
      let Gt = await handleSpendLimitAdmin(_e, $s, N.sql, keys, oidcAdmin, clientIp, admin.group_limit_mode);
      if (Gt) return Gt;
    }
    if (pathname_2 === "/oauth/device_authorization" && _e.method === "POST") {
      if (!Qt) return notFoundResponse();
      if (
        (await N.incr(
          rateLimitKey("devauth", clientIp ?? "unknown"),
          gatewayConfig.rate_limits.device_authorization.window_seconds,
        )) > gatewayConfig.rate_limits.device_authorization.max
      ) {
        Vt("device.authorize", {
          result: "rate_limited",
          client_ip: clientIp,
        });
        ji("device_authorization");
        return oauthErrorResponse(
          "slow_down",
          429,
          "Too many sign-in attempts came from your network address, which other people may share. If this keeps happening after a few minutes, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_authorization. The gateway log says which.",
        );
      }
      let userCode = generateUserCode();
      let userCode_2 = generateUserCode_2();
      let Gt = {
        status: "pending",
        user_code: userCode_2,
        created_at: Date.now(),
        client_ip: clientIp,
      };
      let Pt = deviceCodeHashKey(userCode);
      await Promise.all([
        N.set(Pt, await encryptDeviceGrant(Gt, tokenKeys), DEVICE_GRANT_TTL_SECONDS),
        N.set(userCodeKey(userCode_2), Pt, DEVICE_GRANT_TTL_SECONDS),
      ]);
      Vt("device.authorize", {
        result: "success",
        client_ip: clientIp,
      });
      return Response.json(
        {
          device_code: userCode,
          user_code: userCode_2,
          verification_uri: `${Hi}/device`,
          verification_uri_complete: `${Hi}/device?user_code=${encodeURIComponent(userCode_2)}`,
          expires_in: DEVICE_GRANT_TTL_SECONDS,
          interval: DEVICE_GRANT_TTL_SEC,
        },
        {
          headers: NO_STORE_HEADERS,
        },
      );
    }
    if (pathname_2 === "/device" && _e.method === "GET") {
      if (!Qt) return notFoundResponse();
      let prefill = $s.searchParams.get("user_code") ?? undefined;
      return deviceCodePage({
        prefill,
        idpOrigin,
      });
    }
    let Xd = pathname_2 === "/device/deny";
    if ((pathname_2 === "/device" || Xd) && _e.method === "POST") {
      let oidc = gatewayConfig.oidc;
      if (!Qt || !oidc) return notFoundResponse();
      let ht = _e.headers.get("origin");
      let ot = _e.headers.get("sec-fetch-site");
      if (!(ot !== null ? ot === "same-origin" || ot === "none" : ht !== null && ht === Hi)) {
        Vt("device.verify", {
          result: "csrf_rejected",
          client_ip: clientIp,
        });
        return deviceCodePage({
          idpOrigin,
          error: "This request came from another site and was blocked. Open the verification link directly.",
        });
      }
      if (
        (await N.incr(
          rateLimitKey("device", clientIp ?? "unknown"),
          gatewayConfig.rate_limits.device_verify.window_seconds,
        )) > gatewayConfig.rate_limits.device_verify.max
      ) {
        Vt("device.verify", {
          result: "rate_limited",
          client_ip: clientIp,
        });
        ji("device_verify");
        return deviceCodePage({
          idpOrigin,
          error:
            "Too many attempts came from your network address, which other people may share. Wait a few minutes and try again. If this keeps happening, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_verify. The gateway log says which.",
        });
      }
      let Yt;
      try {
        Yt = (await _e.formData()).get("user_code")?.toString() ?? null;
      } catch {
        Yt = null;
      }
      let Zn = Yt ? await N.get(userCodeKey(Yt)) : null;
      if (Xd && Zn) {
        let Rs = await N.get(Zn);
        let Jt = Rs ? await decryptDeviceGrant(Rs, tokenKeys) : null;
        if (
          Rs &&
          Jt?.status === "pending" &&
          (await N.setIfUnchanged(
            Zn,
            Rs,
            await encryptDeviceGrant(
              {
                status: "denied",
                user_code: Jt.user_code,
                created_at: Jt.created_at,
              },
              tokenKeys,
            ),
            DEVICE_GRANT_TTL_SECONDS,
          ))
        ) {
          Vt("device.deny", {
            result: "denied",
            client_ip: clientIp,
            requested_from: Jt.client_ip,
            requested_at: Jt.created_at && new Date(Jt.created_at).toISOString(),
          });
          await Ts(Jt.user_code);
          return deviceDeniedPage(true);
        }
      }
      if (Xd || !Zn) {
        Vt("device.verify", {
          result: "unknown_code",
          client_ip: clientIp,
        });
        if (Xd) return deviceDeniedPage(false);
        return deviceCodePage({
          idpOrigin,
          error: "That code was not recognized \u2014 it may have expired. Check your device and try again.",
        });
      }
      let Wn = generators.codeVerifier();
      let nonce = generators.nonce();
      let str = randomBytes(32).toString("base64url");
      let browserHash = computeContentHash(str);
      let state = await encryptOAuthState(
        {
          deviceCodeKey: Zn,
          idpCodeVerifier: Wn,
          nonce,
          browserHash,
        },
        tokenKeys,
      );
      Vt("device.verify", {
        result: "redirect",
        client_ip: clientIp,
      });
      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie": `${Jg}=${str}; Max-Age=600; ${oO}`,
          Location: Qt.authorizationUrl({
            ...oidc.extra_auth_params,
            redirect_uri: `${Hi}/oauth/callback`,
            state,
            nonce,
            ...(oidc.use_pkce && {
              code_challenge: generators.codeChallenge(Wn),
              code_challenge_method: "S256",
            }),
            scope,
            response_mode: "query",
          }),
        },
      });
    }
    if (pathname_2 === "/oauth/callback") {
      let oidc = gatewayConfig.oidc;
      if (!Qt || !oidc) return notFoundResponse();
      let ht = $s.searchParams.get("error");
      if (ht) {
        let Sr = $s.searchParams.get("error_description");
        return signInResultPage(Sr ? `${ht}: ${Sr}` : `Identity provider returned: ${ht}`);
      }
      let ot = $s.searchParams.get("code");
      let Gt = $s.searchParams.get("state");
      let Pt = Gt ? await decryptOAuthState(Gt, tokenKeys) : null;
      if (!ot || !Pt) return signInResultPage("This sign-in link has expired. Try again from your device.");
      let Yt = `${Jg}=; Max-Age=0; ${oO}`;
      let Zn = J1(_e);
      let buffer = Buffer.from(Pt.browserHash ?? "", "hex");
      let Or = Zn ? createHash("sha256").update(Zn).digest() : Buffer.alloc(0);
      if (buffer.length !== 32 || Or.length !== buffer.length || !timingSafeEqual(Or, buffer)) {
        Vt("device.callback", {
          result: "browser_mismatch",
          client_ip: clientIp,
        });
        let Sr = signInResultPage(
          "This sign-in link was started in a different browser. Open the verification link on the same device that showed the code.",
        );
        Sr.headers.set("Set-Cookie", Yt);
        return Sr;
      }
      let deviceCodeKey = Pt.deviceCodeKey;
      let Hs = await N.get(deviceCodeKey);
      let xi = Hs ? await decryptDeviceGrant(Hs, tokenKeys) : null;
      if (!Hs || !xi || xi.status !== "pending")
        return signInResultPage("This device code has already been used or has expired.");
      let Rs = Hs;
      async function Jt(Sr) {
        let si = await N.setIfUnchanged(
          deviceCodeKey,
          Rs,
          await encryptDeviceGrant(Sr, tokenKeys),
          DEVICE_GRANT_TTL_SECONDS,
        );
        if (si) await Ts(Sr.user_code);
        return si;
      }
      try {
        let Sr = $s.searchParams.get("iss");
        let si = await Qt.callback(
          `${Hi}/oauth/callback`,
          {
            code: ot,
            ...(Sr && {
              iss: Sr,
            }),
          },
          {
            ...(oidc.use_pkce && {
              code_verifier: Pt.idpCodeVerifier,
            }),
            nonce: Pt.nonce,
          },
          vr && {
            exchangeBody: await vr(),
          },
        );
        let rf = si.claims();
        let accessToken = await Cs(rf, "session.mint", clientIp, bt, await rO(rf, si.access_token));
        let sf = await Jt({
          status: "complete",
          user_code: xi.user_code,
          created_at: xi.created_at,
          access_token: accessToken,
          ...(si.refresh_token && {
            refresh_token: si.refresh_token,
          }),
          expires_in: gatewayConfig.session.ttl_hours * 3600,
        });
        if (!sf)
          Vt("device.callback", {
            result: "not_pending",
            client_ip: clientIp,
          });
        let af = signInResultPage(sf ? null : "This device code has already been used or has expired.");
        af.headers.set("Set-Cookie", Yt);
        return af;
      } catch (error) {
        let si = errorMessage(error);
        gatewayLog("warn", `token exchange failed request_id=${bt}: ${si}`);
        Vt("session.mint", {
          result: "fail",
          client_ip: clientIp,
          err: si,
        });
        await Jt({
          status: "denied",
          user_code: xi.user_code,
          created_at: xi.created_at,
        });
        return signInResultPage("Sign-in could not be completed.");
      }
    }
    if (pathname_2 === "/oauth/token" && _e.method === "POST") {
      if (!Qt) return notFoundResponse();
      let Ie;
      try {
        Ie = await _e.formData();
      } catch {
        return oauthErrorResponse("invalid_request");
      }
      let str = Ie.get("grant_type")?.toString();
      if (str === DEVICE_CODE_GRANT_TYPE) {
        let str = Ie.get("device_code")?.toString();
        if (!str) return oauthErrorResponse("invalid_request");
        let Gt = deviceCodeHashKey(str);
        let Pt = await N.get(Gt);
        let Yt = Pt ? await decryptDeviceGrant(Pt, tokenKeys) : null;
        if (!Yt) return oauthErrorResponse("expired_token");
        if (Yt.status === "pending") {
          if ((await N.incr(rateLimitKey("poll", Gt), DEVICE_GRANT_TTL_SEC - 1)) > 1)
            return oauthErrorResponse("slow_down", 429);
          return oauthErrorResponse("authorization_pending");
        }
        if (Yt.status === "denied") {
          await N.del(Gt);
          return oauthErrorResponse("access_denied");
        }
        await N.del(Gt);
        return Response.json(
          {
            access_token: Yt.access_token,
            refresh_token: Yt.refresh_token,
            token_type: "Bearer",
            expires_in: Yt.expires_in,
          },
          {
            headers: NO_STORE_HEADERS,
          },
        );
      }
      if (str === "refresh_token") {
        let str = Ie.get("refresh_token")?.toString();
        if (!str) return oauthErrorResponse("invalid_request");
        let Gt = "token_endpoint";
        try {
          let Pt = await Qt.refresh(str, {
            exchangeBody: {
              ...(gatewayConfig.oidc?.scope_on_refresh && {
                scope,
              }),
              ...(vr && (await vr())),
            },
          });
          let Yt;
          try {
            Yt = Pt.claims();
          } catch {
            Yt = undefined;
          }
          let Zn;
          let Wn;
          if (Yt === undefined) {
            if (!Pt.access_token) throw Error("IdP refresh response had neither id_token nor access_token");
            Gt = "userinfo_no_id_token";
            Zn = await Qt.userinfo(Pt.access_token);
          } else {
            Zn = Yt;
            Gt = "userinfo_fallback";
            Wn = await rO(Yt, Pt.access_token);
          }
          Gt = "claims";
          let accessToken = await Cs(Zn, "session.refresh", clientIp, bt, Wn);
          return Response.json(
            {
              access_token: accessToken,
              refresh_token: Pt.refresh_token ?? str,
              token_type: "Bearer",
              expires_in: gatewayConfig.session.ttl_hours * 3600,
            },
            {
              headers: NO_STORE_HEADERS,
            },
          );
        } catch (error) {
          let Yt = error.response !== undefined || typeof error.code === "string" || error.name === "RPError";
          let Zn = error.error === "invalid_grant";
          let error_2 = Yt && !Zn ? "temporarily_unavailable" : "invalid_grant";
          let Or = errorMessage(error);
          gatewayLog("warn", `refresh failed request_id=${bt}: ${Or} (at ${Gt}, answered ${error_2})`);
          Vt("session.refresh", {
            result: "fail",
            client_ip: clientIp,
            err: Or,
            step: Gt,
            answer: error_2,
          });
          return oauthErrorResponse(error_2, error_2 === "temporarily_unavailable" ? 503 : 401);
        }
      }
      return oauthErrorResponse("unsupported_grant_type");
    }
    let Qg = _e.headers.get("authorization");
    let ef = Qg?.startsWith("Bearer ") ? Qg.slice(7) : null;
    let jt = null;
    let ur = null;
    let aO = false;
    if (ef !== null)
      if (ce !== null && isProxiedPath(pathname_2) && _e.method === "POST" && isCriJwtTyp(ef)) {
        aO = true;
        let Ie = await ce.authenticate(ef, bt, clientIp, pathname_2);
        if (!Ie.ok && Ie.status === 503)
          return jsonErrorResponse(
            503,
            "api_error",
            "customer-routed inference is temporarily unavailable: the gateway cannot obtain current verification keys",
            bt,
            {
              "retry-after": "30",
            },
          );
        ur = Ie.ok ? Ie.claims : null;
        jt = ur;
      } else jt = await verifySessionJwt(ef, tokenKeys, publicUrl);
    if (!jt) {
      if (!aO)
        Vt("auth.denied", {
          reason: Qg ? "invalid_token" : "missing_token",
          path: pathname_2,
          client_ip: clientIp,
        });
      return jsonErrorResponse(401, "authentication_error", "invalid token", bt);
    }
    let filtered = gatewayConfig.upstreams.filter(
      (upstream) => !upstream.groups || upstream.groups.some((group) => jt.groups?.includes(group)),
    );
    let filtered_2 = upstreamForwarders.filter((upstreamForwarder) =>
      filtered.some((ht) => ht.name === upstreamForwarder.name),
    );
    let filtered_3 = gatewayConfig.models.filter(
      (model) =>
        filtered.some((ht) => Object.hasOwn(model.upstream_model, ht.name)) ||
        (filtered.length > 0 && findModelConfigById(model.id) !== null),
    );
    if (pathname_2 === "/managed/settings") {
      let Ie = {
        "x-cc-gateway-version":
          typeof {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          } !== "undefined"
            ? {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            : "unknown",
        Vary: "User-Agent",
      };
      let ht = {
        status: 404,
        headers: {
          ...Ie,
          ...NO_STORE_HEADERS,
        },
      };
      if (!managedPolicies) return new Response("not configured", ht);
      let ot = matchPolicy(managedPolicies, jt);
      if (!ot) {
        gatewayLog(
          "warn",
          `no managed policy matched for sub=${jt.sub} (groups: ${(jt.groups ?? []).join(",") || "none"}) request_id=${bt}`,
        );
        return new Response("no policy matched", ht);
      }
      let { payload } = ot.policy;
      if (isHostEntrypointClient(_e.headers.get("user-agent"))) {
        if (ot.policy.desktopSessionPayload === undefined) {
          if (ot.policy.serveToDesktop !== false)
            gatewayLog(
              "info",
              `managed policy ${ot.index} withheld from a Claude Desktop session for sub=${jt.sub}: it has no \`code\` settings request_id=${bt}`,
            );
          return new Response("not served to Claude Desktop sessions", ht);
        }
        payload = ot.policy.desktopSessionPayload;
      }
      let Pt = `"${payload.checksum}"`;
      let Yt = _e.headers.get("if-none-match");
      if (Yt === "*" && isManagedClaudeCodeDesktopSession(ot.policy)) {
        gatewayLog(
          "info",
          `Claude Desktop's Code tab doesn't start for sub=${jt.sub}: managed policy ${ot.index} has \`code\` settings, and Claude Code on that machine doesn't take this gateway's settings. To let the Code tab start, name this gateway in forceLoginGatewayUrl in that machine's Claude Code managed settings, and make sure the machine resolves the gateway's hostname itself and reaches it over HTTPS on a private network. request_id=${bt}`,
        );
        return new Response(null, {
          status: 304,
          headers: {
            ...Ie,
            ...NO_STORE_HEADERS,
          },
        });
      }
      if (Yt === Pt)
        return new Response(null, {
          status: 304,
          headers: Ie,
        });
      Vt("managed.serve", {
        sub: jt.sub,
        email: jt.email,
        policy_index: ot.index,
        ...(ot.indexes && {
          policy_indexes: ot.indexes,
        }),
        checksum: payload.checksum,
      });
      return Response.json(payload, {
        headers: {
          ETag: Pt,
          ...Ie,
        },
      });
    }
    if (pathname_2 === "/api/oauth/usage" && _e.method === "GET") {
      if (!spendLimitAdmin)
        return new Response("not configured", {
          status: 404,
          headers: NO_STORE_HEADERS,
        });
      return spendLimitAdmin.usage(jt, bt);
    }
    if (pathname_2 === "/user/bootstrap" && _e.method === "GET") {
      if (!managedPolicies || !qd) {
        Vt("desktop_bootstrap.denied", {
          reason: "not_configured",
          sub: jt.sub,
          email: jt.email,
        });
        return jsonErrorResponse(
          404,
          "not_found_error",
          'Claude Desktop is not configured on this gateway \u2014 add a "desktop:" block to a managed policy',
          bt,
          NO_STORE_HEADERS,
        );
      }
      let Ie = matchPolicy(managedPolicies, jt);
      if (!Ie || Ie.policy.desktop === undefined) {
        gatewayLog(
          "warn",
          `no desktop-enabled managed policy matched for sub=${jt.sub} (groups: ${(jt.groups ?? []).join(",") || "none"}) request_id=${bt}`,
        );
        Vt("desktop_bootstrap.denied", {
          reason: Ie ? "policy_not_opted_in" : "no_policy_matched",
          sub: jt.sub,
          email: jt.email,
        });
        return jsonErrorResponse(
          404,
          "not_found_error",
          Ie
            ? 'the policy matching this user does not opt into desktop \u2014 add a "desktop:" block to it'
            : "no policy matched",
          bt,
          NO_STORE_HEADERS,
        );
      }
      let clientBootstrapConfig = buildClientBootstrapConfig(
        {
          ...gatewayConfig,
          upstreams: filtered,
          models: filtered_3,
        },
        Ie.policy,
        jt,
        Hi,
      );
      let ot = isAdminGroupMember(jt.groups, gatewayConfig.admin);
      Vt("desktop_bootstrap.serve", {
        sub: jt.sub,
        email: jt.email,
        policy_index: Ie.index,
        ...(Ie.indexes && {
          policy_indexes: Ie.indexes,
        }),
      });
      return Response.json(clientBootstrapConfig, {
        headers: {
          ...NO_STORE_HEADERS,
          "x-gateway-spend-admin": String(ot),
        },
      });
    }
    if (pathname_2 in OTLP_PATH_KINDS && _e.method === "POST") {
      let Ie = OTLP_PATH_KINDS[pathname_2];
      let filtered = gatewayConfig.telemetry.forward_to.filter((Yt) => Yt[Ie]);
      if (filtered.length === 0)
        return new Response(null, {
          status: 200,
        });
      let ot = await _e.arrayBuffer();
      let Gt = _e.headers.get("content-type") ?? "application/x-protobuf";
      let Pt = _e.headers.get("content-encoding");
      S.fanout(pathname_2, ot, Gt, Pt, filtered);
      return new Response(null, {
        status: 200,
      });
    }
    let lO = ur !== null ? undefined : managedPolicies ? matchPolicy(managedPolicies, jt)?.policy : undefined;
    if (pathname_2 === "/v1/models" && _e.method === "GET")
      return modelsResponse(filtered_3, filtered_2, gatewayConfig.auto_include_builtin_models, lO);
    if (isProxiedPath(pathname_2) && _e.method === "POST") {
      let Ie = {
        sub: jt.sub,
        email: jt.email,
      };
      let ht =
        gatewayConfig.load_test_mode?.enabled && ur === null ? _e.headers.get("x-load-test-user") : null;
      if (ht !== null) {
        if (!/^\d{1,7}$/.test(ht)) {
          Vt("inference", {
            sub: jt.sub,
            email: jt.email,
            path: pathname_2,
            model: null,
            upstream: null,
            upstream_request_id: null,
            upstream_cloud_request_id: null,
            load_test: true,
            status: 400,
            ms: 0,
          });
          return jsonErrorResponse(
            400,
            "invalid_request_error",
            "x-load-test-user must be a whole number of at most 7 digits",
            bt,
          );
        }
      }
      let ot =
        ht === null
          ? jt
          : {
              ...jt,
              sub: `${jt.sub}+loadtest-${Number(ht)}`,
            };
      let Gt = {};
      let Pt = null;
      if (spendLimitAdmin && pathname_2 === "/v1/messages" && ur === null) {
        let dr = await spendLimitAdmin.precheck(ot, bt);
        if (dr.blocked) return dr.blocked;
        Gt = dr.headers;
        Pt = dr.payingGroup;
      }
      let startTime = performance.now();
      let Zn = () => {
        Vt("inference", {
          sub: ot.sub,
          email: ot.email,
          path: pathname_2,
          model: null,
          upstream: null,
          upstream_request_id: null,
          upstream_cloud_request_id: null,
          ...criIdentityFields(ur, null),
          ...(gatewayConfig.load_test_mode?.enabled && {
            load_test: true,
          }),
          status: 400,
          ms: Math.round(performance.now() - startTime),
        });
      };
      let Wn = await _e.arrayBuffer();
      if (pathname_2 === "/v1/messages") F?.bodyRead(Wn.byteLength, ot.sub);
      let Or;
      try {
        Or = jsonParse(Buffer.from(Wn).toString("utf8"));
      } catch {
        Zn();
        return jsonErrorResponse(400, "invalid_request_error", "invalid JSON", bt);
      }
      if (typeof Or !== "object" || Or === null || Array.isArray(Or)) {
        Zn();
        return jsonErrorResponse(400, "invalid_request_error", "request body must be a JSON object", bt);
      }
      let oi = {
        buf: Wn,
        parsed: Or,
      };
      if (policyWebhook || ur !== null) {
        let dr;
        try {
          dr = new TextEncoder().encode(jsonStringify(oi.parsed));
        } catch {
          Zn();
          return jsonErrorResponse(400, "invalid_request_error", "request body cannot be re-serialized", bt);
        }
        oi.buf = dr.slice().buffer;
      }
      if (policyWebhook) {
        let dr = forwardedRequestParts(_e);
        let lf = await policyWebhook.precheck(
          jt,
          oi.parsed,
          bt,
          {
            path: pathname_2,
            query: dr.search,
            headers: Object.fromEntries(dr.headers.entries()),
          },
          ur?.org,
          ur !== null ? (ur.act?.sub ?? null) : undefined,
        );
        if (lf) return lf;
      }
      let startTime_2 = performance.now();
      let xi = null;
      let Rs;
      if (spendLimitAdmin && pathname_2 === "/v1/messages" && oi.parsed.stream !== true && ur === null) {
        xi = oi.parsed;
        Rs = oi.parsed.speed === "fast" ? "fast" : undefined;
      }
      let Jt = await handleGatewayMessagesRequest(
        _e,
        pathname_2,
        filtered_2,
        filtered_3,
        gatewayConfig.auto_include_builtin_models,
        lO,
        gatewayConfig.timeouts.upstream_ttfb_ms,
        bt,
        {
          body: oi,
          ...(ur !== null && {
            criPrincipal: true,
          }),
          ...(ur === null && {
            user: Ie,
          }),
          ttfbOnSdkLegs: gatewayConfig.timeouts.operator_set,
        },
      );
      if (ur !== null) Jt = await finalizeUpstreamResponse(Jt, _e, bt);
      let Sr = Jt.headers.get("x-gateway-model");
      let si = Jt.headers.get("x-gateway-upstream");
      let rf = Jt.headers.get("x-gateway-upstream-model");
      let upstreamKind = Jt.headers.get("x-gateway-upstream-kind");
      let upstreamRequestId =
        Jt.headers.get("x-gateway-upstream-request-id")?.match(REQUEST_ID_RE)?.[0] ?? null;
      let upstreamCloudRequestId =
        Jt.headers.get("x-gateway-upstream-cloud-request-id")?.match(REQUEST_ID_RE)?.[0] ?? null;
      Vt("inference", {
        sub: ot.sub,
        email: ot.email,
        path: pathname_2,
        model: Sr,
        upstream: si,
        upstream_request_id: upstreamRequestId,
        upstream_cloud_request_id: upstreamCloudRequestId,
        ...criIdentityFields(ur, upstreamKind),
        ...(gatewayConfig.load_test_mode?.enabled && {
          load_test: true,
        }),
        status: Jt.status,
        ms: Math.round(performance.now() - startTime_2),
      });
      for (let dr of GATEWAY_DIAGNOSTIC_HEADERS) Jt.headers.delete(dr);
      Jt.headers.delete("x-cri-upstream-kind");
      if (ur !== null) {
        if (upstreamKind !== null) Jt.headers.set("x-cri-upstream-kind", "cloud");
      }
      if (Jt.ok) {
        for (let [key, value] of Object.entries(Gt)) Jt.headers.set(key, value);
        Jt.headers.set("request-id", bt);
      }
      if (Jt.status >= 500) gatewayLog("warn", `upstream ${Jt.status} on ${pathname_2} request_id=${bt}`);
      if (spendLimitAdmin && pathname_2 === "/v1/messages" && ur === null) {
        let dr = xi;
        return spendLimitAdmin.meter(
          Jt,
          ot,
          Pt,
          si,
          rf,
          Sr,
          dr
            ? () =>
                countTokensViaUpstreams(
                  dr,
                  filtered_2,
                  filtered_3,
                  gatewayConfig.auto_include_builtin_models,
                  Ie,
                )
            : null,
          Rs,
        );
      }
      return Jt;
    }
    return new Response("not found", {
      status: 404,
    });
  }
  http.maxHeaderSize = 262144;
  let za = Bun.serve({
    hostname: gatewayConfig.listen.host,
    port: gatewayConfig.listen.port,
    idleTimeout: 0,
    development: false,
    ...(Bi && {
      tls: Bi,
    }),
    fetch: async (_e, Fe) => {
      overloadWarner(Fe.pendingRequests);
      let address = Fe.requestIP(_e)?.address;
      let bt = _e.headers.get("x-forwarded-for");
      let { clientIp, badHop } = resolveClientIp(address, bt, cidrList);
      let Ts = !!bt && address !== undefined && !isIpInRanges(address, cidrList);
      let ji = _e.headers.get(X_CLIENT_REQUEST_ID);
      let zr = ji && REQUEST_ID_RE.test(ji) ? ji : randomUUID();
      let Bs;
      try {
        Bs = await X1(_e, clientIp, badHop, zr, Ts);
      } catch (error) {
        gatewayLog("error", `unhandled request_id=${zr}: ${errorMessage(error)}`);
        Bs = jsonErrorResponse(500, "api_error", "internal server error", zr);
      }
      Bs.headers.set(X_REQUEST_ID, zr);
      return withSecurityHeaders(Bs, !!Bi);
    },
    error: (_e) => {
      gatewayLog("error", `unhandled: ${errorMessage(_e)}`);
      return withSecurityHeaders(jsonErrorResponse(500, "api_error", "internal server error"), !!Bi);
    },
  });
  printGatewayBanner(gatewayConfig, {
    tls: !!Bi,
    hostname: za.hostname ?? gatewayConfig.listen.host,
    port: za.port ?? gatewayConfig.listen.port,
    managed: !!managedPolicies,
    outboundLimit: maxHttpRequests,
  });
  for (let _e of collectGatewayConfigWarnings(gatewayConfig, managedPolicies)) gatewayLog("warn", _e);
  warnIfMetadataReachable();
  return {
    port: za.port ?? gatewayConfig.listen.port,
    stop: () => {
      za.stop(true);
      N.close();
      F?.close();
    },
    drain: async (_e) => {
      let Fe = za.stop(false);
      await Promise.race([Fe, sleep(_e)]);
      let pendingRequests = za.pendingRequests;
      await za.stop(true);
      await spendLimitAdmin?.flush();
      N.close();
      F?.close();
      return pendingRequests;
    },
  };
}
