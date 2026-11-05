/**
 * services/claudeGateway/server.ts
 *
 * 2.1.316 新增：claude gateway 服务主体
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (1)
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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

//@ chunk-1hnjmk23.js:1534807-1567298 placement
/**
 * claude gateway 入口：加载并校验配置、建立存储与认证、启动 HTTP 服务与遥测。
 */
async function startClaudeGateway(configPath) {
  let blockedMessage = gatewayServerBlockedMessage();
  if (blockedMessage !== undefined) throw new ProviderNotAllowedError(blockedMessage);
  assertNativeBinary();
  let gatewayConfig = await loadGatewayConfig(configPath);
  gatewayJsonLog("config.load", {
    path: configPath,
    sha256: createHash("sha256").update(JSON.stringify(gatewayConfig)).digest("hex"),
  });
  configureGatewayNetwork();
  let cidrList = parseCidrList(gatewayConfig.listen.trusted_proxies);
  let cidrList_2 = parseCidrList(gatewayConfig.access_control.allow_cidrs);
  let cidrList_3 = parseCidrList(gatewayConfig.access_control.deny_cidrs);
  let cidrList_4 = parseCidrList([...PRIVATE_NETWORK_RANGES, "169.254.0.0/16", "fe80::/10"]);
  let publicClientWarned = false;
  let ignoredXffWarned = false;
  let rateLimitWarnAt = {
    device_authorization: 0,
    device_verify: 0,
  };
  let lastMdmRefreshAt = 0;
  let readinessGraceSeconds = gatewayConfig.store.readiness_grace_seconds;
  let pgDownWarned = false;
  let pgDownSince = null;
  let readyzProbe = null;
  let readyzDownWarned = false;
  let otelFanout = new OtelFanout();
  let maxHttpRequests = parseMaxHttpRequests(getPreSettingsEnvSnapshot().BUN_CONFIG_MAX_HTTP_REQUESTS);
  let overloadWarner = createOverloadWarner(maxHttpRequests);
  let store = await retryPostgresConnect(() =>
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
    let message = errorMessage(error);
    if (PG_CONNECT_REFUSED_RE.test(message)) {
      gatewayLog(
        "error",
        `could not connect to Postgres at boot: ${message}. Check store.postgres_url. If the database needs longer to become reachable, raise store.connect_timeout_seconds (now ${gatewayConfig.store.connect_timeout_seconds}s)`,
      );
      throw Error(`could not connect to Postgres: ${message}. Check store.postgres_url in ${configPath}`);
    }
    if (getErrnoCode(error) === "ERR_INVALID_URL" || error instanceof URIError)
      throw Error(
        `store.postgres_url in ${configPath} is not a URL the gateway can read. It takes one host, as postgres://host:port/database; a comma-separated list of hosts is not supported. A password containing / ? # or % goes in store.password, not in the URL`,
      );
    throw error;
  });
  let keys = {
    readKeys: gatewayConfig.admin?.read_keys ?? [],
    writeKeys: gatewayConfig.admin?.write_keys ?? [],
  };
  let loadTest = gatewayConfig.load_test_mode?.enabled
    ? await (
        await import("../gateway/startLoadTest.lazy.js")
      )
        .startLoadTest(gatewayConfig.load_test_mode, store.sql)
        .catch((error) => {
          store.close();
          throw error;
        })
    : undefined;
  let spendLimitAdmin = createSpendLimitAdmin(store.sql, gatewayConfig, loadTest?.spendFault);
  let joined = [
    ...(gatewayConfig.oidc ? ["new sign-ins fail"] : []),
    !spendLimitAdmin
      ? "inference is not affected"
      : gatewayConfig.enforcement.fail_closed_on_error
        ? "signed-in developers' inference is refused with 429 'spend limit unavailable' (enforcement.fail_closed_on_error is true)"
        : "spend limits are not enforced, signed-in developers' requests pass unchecked (enforcement.fail_closed_on_error is false)",
  ].join("; ");
  let criEnabled = gatewayConfig.cri?.enabled === true;
  let criVerifier =
    criEnabled && gatewayConfig.cri
      ? createCriJwtVerifier({
          audience: gatewayConfig.cri.audience,
          orgAllowlist: gatewayConfig.cri.org_allowlist,
          jwksUrl: gatewayConfig.cri.jwks_url,
          issuer: gatewayConfig.cri.issuer,
        })
      : null;
  if (criVerifier !== null) await criVerifier.prime();
  let policyWebhook = createPolicyWebhook(gatewayConfig);
  let tokenKeys = deriveTokenKeys(gatewayConfig.session.jwt_secret);
  let publicUrl = gatewayConfig.listen.public_url;
  let groupsClaim = gatewayConfig.oidc?.groups_claim ?? "groups";
  let emailClaim = gatewayConfig.oidc?.email_claim ?? "email";
  let userIdClaim = gatewayConfig.oidc?.user_id_claim ?? "sub";
  let googleGroupsLookup;
  function nonEmptyString(value) {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
  function groupsFromClaims(claims) {
    let claim = readClaim(claims, groupsClaim);
    if (typeof claim === "string") return claim.length > 0 ? [claim] : undefined;
    if (!Array.isArray(claim)) return;
    let filtered = claim.filter((groupValue) => typeof groupValue === "string" && groupValue.length > 0);
    return filtered.length > 0 ? filtered : undefined;
  }
  function hasGroupsClaim(claims) {
    return readClaim(claims, groupsClaim) !== undefined;
  }
  function hasEmailClaim(claims) {
    return readFirstClaim(claims, emailClaim) !== undefined;
  }
  async function mintSessionForClaims(
    claims,
    eventName,
    clientIp,
    requestId,
    userinfoClaims,
    noIdTokenOnRefresh = false,
  ) {
    gatewayLog(
      "debug",
      `oidc id_token claim names request_id=${requestId}: ${Object.keys(claims).sort().join(",")}` +
        (userinfoClaims ? `; userinfo claim names: ${Object.keys(userinfoClaims).sort().join(",")}` : ""),
    );
    let email = hasEmailClaim(claims)
      ? readFirstClaim(claims, emailClaim)
      : userinfoClaims
        ? readFirstClaim(userinfoClaims, emailClaim)
        : undefined;
    assertEmailAllowed(
      {
        email,
        email_verified: claims.email_verified ?? userinfoClaims?.email_verified,
      },
      gatewayConfig.oidc?.allowed_email_domains,
    );
    if (nonEmptyString(claims.sub) === undefined) throw Error("IdP claims missing required `sub`");
    let sub = nonEmptyString(readClaim(claims, userIdClaim));
    if (sub === undefined)
      throw Object.assign(
        Error(
          `oidc.user_id_claim names \`${userIdClaim}\`, which the IdP did not send as a non-empty string. Check oidc.scopes, and oidc.scope_on_refresh if only refreshes fail`,
        ),
        {
          code: "USER_ID_CLAIM_MISSING",
        },
      );
    let claimEmail = typeof email === "string" ? email : undefined;
    let groups;
    if (googleGroupsLookup) {
      if (claimEmail === undefined)
        throw Object.assign(
          Error(
            "oidc.google_groups is configured but the id_token has no email \u2014 check oidc.email_claim and that the email scope is requested",
          ),
          {
            code: "GOOGLE_GROUPS_UNAVAILABLE",
          },
        );
      groups = await googleGroupsLookup(claimEmail);
    } else {
      groups = hasGroupsClaim(claims)
        ? groupsFromClaims(claims)
        : userinfoClaims
          ? groupsFromClaims(userinfoClaims)
          : undefined;
      if (
        eventName === "session.refresh" &&
        !hasGroupsClaim(claims) &&
        !userinfoClaims &&
        gatewayConfig.upstreams.some((upstream) => upstream.groups)
      )
        gatewayLog(
          "info",
          `refresh request_id=${requestId}: no groups claim for sub=${sub}, so only upstreams without groups serve them. ${noIdTokenOnRefresh ? "Your IdP sent no id_token on this refresh, and its userinfo response had no groups. If this developer is in a group, set your IdP to add groups to its userinfo response. Some IdPs send an id_token on refresh only when oidc.scope_on_refresh is true" : "If your IdP leaves groups out of the refreshed id_token, set oidc.userinfo_fallback: true"}`,
        );
    }
    assertGroupAllowed(groups, gatewayConfig.oidc?.allowed_groups);
    let name = nonEmptyString(claims.name) ?? nonEmptyString(userinfoClaims?.name);
    let sessionJwt = await signSessionJwt(
      {
        sub,
        email: claimEmail,
        name,
        groups,
      },
      tokenKeys,
      gatewayConfig.session.ttl_hours,
      publicUrl,
    );
    gatewayJsonLog(eventName, {
      request_id: requestId,
      result: "success",
      sub,
      email: claimEmail,
      client_ip: clientIp,
      ttl_hours: gatewayConfig.session.ttl_hours,
    });
    return sessionJwt;
  }
  let googleGroups = gatewayConfig.oidc?.google_groups;
  if (googleGroups) googleGroupsLookup = await createGoogleGroupsLookup(googleGroups);
  let tls = gatewayConfig.listen.tls;
  let [oidcClient, upstreamForwarders, managedPolicies, tlsConfig] = await Promise.all([
    gatewayConfig.oidc ? createOidcClient(gatewayConfig.oidc) : Promise.resolve(null),
    createUpstreamForwarders(gatewayConfig.upstreams, loadTest?.fetch),
    resolveManagedPolicies(gatewayConfig),
    tls
      ? Promise.all([readFile(tls.cert, "utf8"), readFile(tls.key, "utf8")]).then(([cert, key]) => ({
          cert,
          key,
        }))
      : Promise.resolve(undefined),
  ]);
  let clientAssertionSigner =
    oidcClient &&
    gatewayConfig.oidc?.token_endpoint_auth_method === "private_key_jwt" &&
    gatewayConfig.oidc.client_assertion
      ? createClientAssertionSigner(
          gatewayConfig.oidc.client_id,
          gatewayConfig.oidc.client_assertion,
          oidcClient.issuer.metadata.token_endpoint,
        )
      : undefined;
  let desktopPolicies =
    managedPolicies?.some((managedPolicy) => managedPolicy.desktop !== undefined) ?? false;
  let scope = normalizeCaseForComparison_2(
    gatewayConfig.oidc?.scopes ?? ["openid", "profile", "email", "offline_access"],
  ).join(" ");
  async function fetchUserinfo(claims, accessToken) {
    if (!gatewayConfig.oidc?.userinfo_fallback || !accessToken || !oidcClient) return;
    if (hasEmailClaim(claims) && (googleGroupsLookup !== undefined || hasGroupsClaim(claims))) return;
    let userinfo = await oidcClient.userinfo(accessToken);
    if (typeof userinfo.sub !== "string" || userinfo.sub !== claims.sub)
      throw Error("userinfo sub missing or does not match id_token sub");
    return userinfo;
  }
  if (
    oidcClient &&
    gatewayConfig.oidc?.scopes &&
    !gatewayConfig.oidc.scopes.includes("offline_access") &&
    Array.isArray(oidcClient.issuer.metadata.scopes_supported) &&
    oidcClient.issuer.metadata.scopes_supported.includes("offline_access")
  )
    gatewayLog(
      "warn",
      "oidc.scopes omits offline_access but the IdP advertises it \u2014 refresh tokens " +
        `will not be issued; developers re-run the browser login every ${gatewayConfig.session.ttl_hours}h (session.ttl_hours)`,
    );
  if (
    oidcClient &&
    gatewayConfig.oidc &&
    (oidcClient.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
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
    oidcClient &&
    (oidcClient.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
    (gatewayConfig.oidc?.allowed_groups?.length ?? 0) > 0 &&
    !gatewayConfig.oidc?.google_groups
  )
    gatewayLog(
      "warn",
      "oidc.allowed_groups is set but Google ID tokens do not carry a groups claim \u2014 " +
        "every login will be denied. Set oidc.google_groups to fetch Workspace groups via the Admin SDK, or use allowed_email_domains instead.",
    );
  if (
    oidcClient &&
    gatewayConfig.oidc?.google_groups &&
    !(oidcClient.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com")
  )
    gatewayLog(
      "warn",
      "oidc.google_groups is set but oidc.issuer is not accounts.google.com \u2014 " +
        "the Directory API only returns groups for Google Workspace users, so every login will be refused",
    );
  let idpOrigin =
    oidcClient && gatewayConfig.oidc
      ? normalizeCaseForComparison_2([
          new URL(oidcClient.issuer.metadata.authorization_endpoint ?? gatewayConfig.oidc.issuer).origin,
          ...gatewayConfig.oidc.form_action_origins,
        ]).join(" ")
      : "";
  let secureCookies =
    Boolean(tlsConfig) ||
    (gatewayConfig.listen.public_url !== undefined &&
      new URL(gatewayConfig.listen.public_url).protocol === "https:");
  let cookieName = secureCookies ? "__Host-gw_dev" : "gw_dev";
  let cookieAttrs = `HttpOnly; SameSite=Lax; Path=/${secureCookies ? "; Secure" : ""}`;
  function readCookie(request) {
    let cookieHeader = request.headers.get("cookie") ?? "";
    for (let part of cookieHeader.split(";")) {
      let index = part.indexOf("=");
      if (index > 0 && part.slice(0, index).trim() === cookieName) return part.slice(index + 1).trim();
    }
    return null;
  }
  async function handleRequest(request, clientIp, badHop, requestId, ignoredXff) {
    let audit = (eventName, fields) =>
      gatewayJsonLog(eventName, {
        request_id: requestId,
        ...fields,
      });
    let cleanupUserCode = (userCode) =>
      store.del(userCodeKey(userCode)).catch((error) => {
        gatewayLog("warn", `user_code cleanup failed request_id=${requestId}: ${errorMessage(error)}`);
      });
    let warnRateLimited = (kind) => {
      let now = Date.now();
      if (now - rateLimitWarnAt[kind] < 60000) return;
      rateLimitWarnAt[kind] = now;
      let { max, window_seconds: windowSeconds } = gatewayConfig.rate_limits[kind];
      let advice = ignoredXff
        ? ` This request carried X-Forwarded-For, which the gateway ignored because ${clientIp} is not in listen.trusted_proxies. If ${clientIp} is your load balancer and adds the connecting address to that header itself, list it there first so each developer is counted separately. If it is your load balancer but does not, or many developers still share an address after that`
        : " If many developers share that address";
      gatewayLog(
        "warn",
        `sign-in refused: ${clientIp ?? "unknown address"} went over rate_limits.${kind}.max (${max} per ${windowSeconds}s per client address).${advice}, for example behind a NAT, raise rate_limits.${kind}.max.${kind === "device_verify" ? " If they do not, someone may be guessing sign-in codes." : ""} Logged at most once a minute; every refusal has an audit event with "result":"rate_limited".`,
      );
    };
    let { pathname } = new URL(request.url);
    let isHealthPath = request.method === "GET" && (pathname === "/healthz" || pathname === "/readyz");
    if (pathname === "/v1/messages" && request.method === "POST") loadTest?.arrived();
    let accessControlActive = cidrList_3.length > 0 || (cidrList_2.length > 0 && !isHealthPath);
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
      if (accessControlActive) {
        audit("access.denied", {
          reason: "xff_unparseable",
          client_ip: clientIp,
          xff_hop: badHop,
        });
        return new Response("forbidden", {
          status: 403,
        });
      }
    }
    if (clientIp === undefined && accessControlActive) {
      audit("access.denied", {
        reason: "client_ip_unknown",
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    if (isIpInRanges(clientIp, cidrList_3)) {
      audit("access.denied", {
        reason: "ip_denylist",
        client_ip: clientIp,
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    if (request.method === "GET" && pathname === "/healthz")
      return new Response("ok", {
        status: 200,
      });
    if (request.method === "GET" && pathname === "/readyz") {
      if (readinessGraceSeconds === 0)
        try {
          await store.get("__readyz_probe__");
          pgDownWarned = false;
          return new Response("ready", {
            status: 200,
          });
        } catch (error) {
          if (!pgDownWarned) {
            pgDownWarned = true;
            gatewayLog(
              "warn",
              `Postgres is not answering (${errorMessage(error)}), so /readyz reports not ready and whatever checks /readyz may stop sending this replica traffic or replace it. To keep reporting ready through a short outage such as a database failover, set store.readiness_grace_seconds to more seconds than the outage lasts (at most 3600)`,
            );
          }
          return new Response("store unavailable", {
            status: 503,
          });
        }
      readyzProbe ??= withTimeout(
        store.get("__readyz_probe__"),
        PG_RETRY_INTERVAL_MS,
        `no reply within ${PG_RETRY_INTERVAL_MS / 1000}s`,
      )
        .then(
          () => {
            if (pgDownSince !== null)
              gatewayLog(
                "info",
                `Postgres is answering again after about ${Math.round((performance.now() - pgDownSince) / 1000)}s; /readyz reports ready`,
              );
            pgDownSince = null;
            readyzDownWarned = false;
          },
          (error) => {
            if (pgDownSince === null) {
              pgDownSince = performance.now();
              gatewayLog(
                "warn",
                `Postgres is not answering (${errorMessage(error)}). /readyz keeps reporting ready for up to ${readinessGraceSeconds}s (store.readiness_grace_seconds), then reports not ready. Until Postgres is back: ${joined}`,
              );
            }
          },
        )
        .finally(() => {
          readyzProbe = null;
        });
      await withTimeout(readyzProbe, PG_RETRY_MAX_ATTEMPTS, "readyz answer bound").catch(() => {});
      if (pgDownSince === null)
        return new Response("ready", {
          status: 200,
        });
      if (performance.now() - pgDownSince <= readinessGraceSeconds * 1000)
        return new Response("ready", {
          status: 200,
        });
      if (!readyzDownWarned) {
        readyzDownWarned = true;
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
      audit("access.denied", {
        reason: "ip_not_allowlisted",
        client_ip: clientIp,
      });
      return new Response("forbidden", {
        status: 403,
      });
    }
    let now = Date.now();
    if (now - lastMdmRefreshAt > 60000) {
      lastMdmRefreshAt = now;
      let mdmSnapshot = await readMdmSnapshot();
      replaceMdmSetting(mdmSnapshot.mdm, mdmSnapshot.hkcu, mdmSnapshot.wslInherits, mdmSnapshot.whereAsked);
      invalidateCommandNames();
    }
    let blockedMessage = gatewayServerBlockedMessage();
    if (blockedMessage !== undefined) {
      if (claimOnce().claim("gateway_provider_policy_refusal")) gatewayLog("error", blockedMessage);
      audit("access.denied", {
        reason: "provider_policy",
        client_ip: clientIp,
      });
      return new Response("service unavailable", {
        status: 503,
      });
    }
    if (
      cidrList_2.length === 0 &&
      !publicClientWarned &&
      clientIp !== undefined &&
      !isIpInRanges(clientIp, cidrList_4)
    ) {
      publicClientWarned = true;
      audit("access.public_client", {
        client_ip: clientIp,
      });
      gatewayLog(
        "warn",
        `request from ${clientIp}, which is not a private address: this gateway may be reachable from the public internet. It must not be: it can push settings that run commands on developer machines. Check the network in front of it, then set access_control.allow_cidrs (behind a proxy that adds X-Forwarded-For itself, set listen.trusted_proxies first so the gateway sees real client addresses)`,
      );
    }
    if (ignoredXff && !ignoredXffWarned) {
      ignoredXffWarned = true;
      gatewayLog(
        "warn",
        `request from ${clientIp} carried an X-Forwarded-For header, but ${cidrList.length === 0 ? "listen.trusted_proxies is not set" : `${clientIp} is not in listen.trusted_proxies`}, so the gateway ignored the header and used ${clientIp} as the client address. If ${clientIp} is your load balancer or ingress, every developer behind it shares one sign-in rate limit (rate_limits), and access_control and audit events see only that address. List its source range, and nothing wider, in listen.trusted_proxies only if it adds the connecting address to the header itself, or if clients can reach it only through another proxy that does. If it only passes on what clients send, listing it lets them fake their address and get past access_control and rate_limits. Have it add the address before you list it, or raise rate_limits instead. If developers connect to the gateway directly and something on their side adds the header, nothing needs to change. Logged once per start, however many requests are affected.`,
      );
    }
    let limits = gatewayConfig.limits;
    if (limits.max_url_length !== undefined && request.url.length > limits.max_url_length)
      return new Response("uri too long", {
        status: 414,
      });
    if (limits.max_request_header_bytes !== undefined) {
      let headerBytes = 0;
      for (let [name, value] of request.headers) headerBytes += name.length + value.length + 4;
      if (headerBytes > limits.max_request_header_bytes)
        return new Response("request header fields too large", {
          status: 431,
        });
    }
    let url = new URL(request.url);
    let pathname_2 = url.pathname;
    let baseUrl = gatewayConfig.listen.public_url ?? url.origin;
    if (pathname_2 === "/" && request.method === "GET")
      return gatewayIndexPage(
        baseUrl,
        gatewayConfig.oidc?.issuer ?? null,
        typeof {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        } !== "undefined"
          ? {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION
          : "unknown",
      );
    if (pathname_2 === "/.well-known/oauth-authorization-server")
      return Response.json({
        issuer: baseUrl,
        ...(gatewayConfig.oidc !== undefined
          ? {
              device_authorization_endpoint: `${baseUrl}/oauth/device_authorization`,
              token_endpoint: `${baseUrl}/oauth/token`,
              grant_types_supported: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
            }
          : {
              grant_types_supported: [],
            }),
        response_types_supported: [],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: ["openid", "profile", "email"],
        gateway_protocol_version: DEFAULT_TOKEN_KEY_VERSION,
        ...(criEnabled && {
          cri_enabled: true,
        }),
      });
    if (pathname_2 === "/protocol" && request.method === "GET")
      return new Response(
        buildGatewayProtocolDoc({
          oidcConfigured: gatewayConfig.oidc !== undefined,
          criEnabled,
        }),
        {
          headers: {
            "content-type": "text/markdown; charset=utf-8",
          },
        },
      );
    let contentLength = request.headers.get("content-length");
    if (contentLength === null && request.headers.get("transfer-encoding"))
      return new Response("length required", {
        status: 411,
      });
    if (contentLength !== null) {
      let length = Number(contentLength);
      if (!Number.isFinite(length) || length < 0 || length > gatewayConfig.limits.max_request_bytes)
        return new Response("payload too large", {
          status: 413,
        });
    }
    if (gatewayConfig.admin && isSpendLimitsPath(pathname_2)) {
      let admin = gatewayConfig.admin;
      let authHeader = request.headers.get("authorization");
      let oidcAdmin = null;
      if (
        admin.admin_groups.length > 0 &&
        !request.headers.get("x-api-key") &&
        authHeader?.startsWith("Bearer ")
      ) {
        let sessionClaims = await verifySessionJwt(authHeader.slice(7), tokenKeys, publicUrl);
        if (sessionClaims && isAdminGroupMember(sessionClaims.groups, admin))
          oidcAdmin = {
            sub: sessionClaims.sub,
          };
      }
      let adminResponse = await handleSpendLimitAdmin(
        request,
        url,
        store.sql,
        keys,
        oidcAdmin,
        clientIp,
        admin.group_limit_mode,
      );
      if (adminResponse) return adminResponse;
    }
    if (pathname_2 === "/oauth/device_authorization" && request.method === "POST") {
      if (!oidcClient) return notFoundResponse();
      if (
        (await store.incr(
          rateLimitKey("devauth", clientIp ?? "unknown"),
          gatewayConfig.rate_limits.device_authorization.window_seconds,
        )) > gatewayConfig.rate_limits.device_authorization.max
      ) {
        audit("device.authorize", {
          result: "rate_limited",
          client_ip: clientIp,
        });
        warnRateLimited("device_authorization");
        return oauthErrorResponse(
          "slow_down",
          429,
          "Too many sign-in attempts came from your network address, which other people may share. If this keeps happening after a few minutes, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_authorization. The gateway log says which.",
        );
      }
      let deviceCode = generateUserCode();
      let userCode = generateUserCode_2();
      let grant = {
        status: "pending",
        user_code: userCode,
        created_at: Date.now(),
        client_ip: clientIp,
      };
      let deviceCodeKey = deviceCodeHashKey(deviceCode);
      await Promise.all([
        store.set(deviceCodeKey, await encryptDeviceGrant(grant, tokenKeys), DEVICE_GRANT_TTL_SECONDS),
        store.set(userCodeKey(userCode), deviceCodeKey, DEVICE_GRANT_TTL_SECONDS),
      ]);
      audit("device.authorize", {
        result: "success",
        client_ip: clientIp,
      });
      return Response.json(
        {
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: `${baseUrl}/device`,
          verification_uri_complete: `${baseUrl}/device?user_code=${encodeURIComponent(userCode)}`,
          expires_in: DEVICE_GRANT_TTL_SECONDS,
          interval: DEVICE_GRANT_TTL_SEC,
        },
        {
          headers: NO_STORE_HEADERS,
        },
      );
    }
    if (pathname_2 === "/device" && request.method === "GET") {
      if (!oidcClient) return notFoundResponse();
      let prefill = url.searchParams.get("user_code") ?? undefined;
      return deviceCodePage({
        prefill,
        idpOrigin,
      });
    }
    let isDeny = pathname_2 === "/device/deny";
    if ((pathname_2 === "/device" || isDeny) && request.method === "POST") {
      let oidc = gatewayConfig.oidc;
      if (!oidcClient || !oidc) return notFoundResponse();
      let origin = request.headers.get("origin");
      let fetchSite = request.headers.get("sec-fetch-site");
      if (
        !(fetchSite !== null
          ? fetchSite === "same-origin" || fetchSite === "none"
          : origin !== null && origin === baseUrl)
      ) {
        audit("device.verify", {
          result: "csrf_rejected",
          client_ip: clientIp,
        });
        return deviceCodePage({
          idpOrigin,
          error: "This request came from another site and was blocked. Open the verification link directly.",
        });
      }
      if (
        (await store.incr(
          rateLimitKey("device", clientIp ?? "unknown"),
          gatewayConfig.rate_limits.device_verify.window_seconds,
        )) > gatewayConfig.rate_limits.device_verify.max
      ) {
        audit("device.verify", {
          result: "rate_limited",
          client_ip: clientIp,
        });
        warnRateLimited("device_verify");
        return deviceCodePage({
          idpOrigin,
          error:
            "Too many attempts came from your network address, which other people may share. Wait a few minutes and try again. If this keeps happening, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_verify. The gateway log says which.",
        });
      }
      let userCode;
      try {
        userCode = (await request.formData()).get("user_code")?.toString() ?? null;
      } catch {
        userCode = null;
      }
      let grantKey = userCode ? await store.get(userCodeKey(userCode)) : null;
      if (isDeny && grantKey) {
        let rawGrant = await store.get(grantKey);
        let grant = rawGrant ? await decryptDeviceGrant(rawGrant, tokenKeys) : null;
        if (
          rawGrant &&
          grant?.status === "pending" &&
          (await store.setIfUnchanged(
            grantKey,
            rawGrant,
            await encryptDeviceGrant(
              {
                status: "denied",
                user_code: grant.user_code,
                created_at: grant.created_at,
              },
              tokenKeys,
            ),
            DEVICE_GRANT_TTL_SECONDS,
          ))
        ) {
          audit("device.deny", {
            result: "denied",
            client_ip: clientIp,
            requested_from: grant.client_ip,
            requested_at: grant.created_at && new Date(grant.created_at).toISOString(),
          });
          await cleanupUserCode(grant.user_code);
          return deviceDeniedPage(true);
        }
      }
      if (isDeny || !grantKey) {
        audit("device.verify", {
          result: "unknown_code",
          client_ip: clientIp,
        });
        if (isDeny) return deviceDeniedPage(false);
        return deviceCodePage({
          idpOrigin,
          error: "That code was not recognized \u2014 it may have expired. Check your device and try again.",
        });
      }
      let codeVerifier = generators.codeVerifier();
      let nonce = generators.nonce();
      let str = randomBytes(32).toString("base64url");
      let browserHash = computeContentHash(str);
      let state = await encryptOAuthState(
        {
          deviceCodeKey: grantKey,
          idpCodeVerifier: codeVerifier,
          nonce,
          browserHash,
        },
        tokenKeys,
      );
      audit("device.verify", {
        result: "redirect",
        client_ip: clientIp,
      });
      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie": `${cookieName}=${str}; Max-Age=600; ${cookieAttrs}`,
          Location: oidcClient.authorizationUrl({
            ...oidc.extra_auth_params,
            redirect_uri: `${baseUrl}/oauth/callback`,
            state,
            nonce,
            ...(oidc.use_pkce && {
              code_challenge: generators.codeChallenge(codeVerifier),
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
      if (!oidcClient || !oidc) return notFoundResponse();
      let errorCode = url.searchParams.get("error");
      if (errorCode) {
        let description = url.searchParams.get("error_description");
        return signInResultPage(
          description ? `${errorCode}: ${description}` : `Identity provider returned: ${errorCode}`,
        );
      }
      let code = url.searchParams.get("code");
      let stateParam = url.searchParams.get("state");
      let oauthState = stateParam ? await decryptOAuthState(stateParam, tokenKeys) : null;
      if (!code || !oauthState)
        return signInResultPage("This sign-in link has expired. Try again from your device.");
      let clearCookie = `${cookieName}=; Max-Age=0; ${cookieAttrs}`;
      let browserCookie = readCookie(request);
      let buffer = Buffer.from(oauthState.browserHash ?? "", "hex");
      let browserHash = browserCookie ? createHash("sha256").update(browserCookie).digest() : Buffer.alloc(0);
      if (
        buffer.length !== 32 ||
        browserHash.length !== buffer.length ||
        !timingSafeEqual(browserHash, buffer)
      ) {
        audit("device.callback", {
          result: "browser_mismatch",
          client_ip: clientIp,
        });
        let page = signInResultPage(
          "This sign-in link was started in a different browser. Open the verification link on the same device that showed the code.",
        );
        page.headers.set("Set-Cookie", clearCookie);
        return page;
      }
      let deviceCodeKey = oauthState.deviceCodeKey;
      let rawGrant = await store.get(deviceCodeKey);
      let grant = rawGrant ? await decryptDeviceGrant(rawGrant, tokenKeys) : null;
      if (!rawGrant || !grant || grant.status !== "pending")
        return signInResultPage("This device code has already been used or has expired.");
      let currentGrant = rawGrant;
      async function writeGrant(grant) {
        let updated = await store.setIfUnchanged(
          deviceCodeKey,
          currentGrant,
          await encryptDeviceGrant(grant, tokenKeys),
          DEVICE_GRANT_TTL_SECONDS,
        );
        if (updated) await cleanupUserCode(grant.user_code);
        return updated;
      }
      try {
        let iss = url.searchParams.get("iss");
        let callbackResult = await oidcClient.callback(
          `${baseUrl}/oauth/callback`,
          {
            code,
            ...(iss && {
              iss,
            }),
          },
          {
            ...(oidc.use_pkce && {
              code_verifier: oauthState.idpCodeVerifier,
            }),
            nonce: oauthState.nonce,
          },
          clientAssertionSigner && {
            exchangeBody: await clientAssertionSigner(),
          },
        );
        let claims = callbackResult.claims();
        let accessToken = await mintSessionForClaims(
          claims,
          "session.mint",
          clientIp,
          requestId,
          await fetchUserinfo(claims, callbackResult.access_token),
        );
        let written = await writeGrant({
          status: "complete",
          user_code: grant.user_code,
          created_at: grant.created_at,
          access_token: accessToken,
          ...(callbackResult.refresh_token && {
            refresh_token: callbackResult.refresh_token,
          }),
          expires_in: gatewayConfig.session.ttl_hours * 3600,
        });
        if (!written)
          audit("device.callback", {
            result: "not_pending",
            client_ip: clientIp,
          });
        let page = signInResultPage(
          written ? null : "This device code has already been used or has expired.",
        );
        page.headers.set("Set-Cookie", clearCookie);
        return page;
      } catch (error) {
        let message = errorMessage(error);
        gatewayLog("warn", `token exchange failed request_id=${requestId}: ${message}`);
        audit("session.mint", {
          result: "fail",
          client_ip: clientIp,
          err: message,
        });
        await writeGrant({
          status: "denied",
          user_code: grant.user_code,
          created_at: grant.created_at,
        });
        return signInResultPage("Sign-in could not be completed.");
      }
    }
    if (pathname_2 === "/oauth/token" && request.method === "POST") {
      if (!oidcClient) return notFoundResponse();
      let form;
      try {
        form = await request.formData();
      } catch {
        return oauthErrorResponse("invalid_request");
      }
      let str = form.get("grant_type")?.toString();
      if (str === DEVICE_CODE_GRANT_TYPE) {
        let deviceCode = form.get("device_code")?.toString();
        if (!deviceCode) return oauthErrorResponse("invalid_request");
        let deviceCodeKey = deviceCodeHashKey(deviceCode);
        let rawGrant = await store.get(deviceCodeKey);
        let grant = rawGrant ? await decryptDeviceGrant(rawGrant, tokenKeys) : null;
        if (!grant) return oauthErrorResponse("expired_token");
        if (grant.status === "pending") {
          if ((await store.incr(rateLimitKey("poll", deviceCodeKey), DEVICE_GRANT_TTL_SEC - 1)) > 1)
            return oauthErrorResponse("slow_down", 429);
          return oauthErrorResponse("authorization_pending");
        }
        if (grant.status === "denied") {
          await store.del(deviceCodeKey);
          return oauthErrorResponse("access_denied");
        }
        await store.del(deviceCodeKey);
        return Response.json(
          {
            access_token: grant.access_token,
            refresh_token: grant.refresh_token,
            token_type: "Bearer",
            expires_in: grant.expires_in,
          },
          {
            headers: NO_STORE_HEADERS,
          },
        );
      }
      if (str === "refresh_token") {
        let str = form.get("refresh_token")?.toString();
        if (!str) return oauthErrorResponse("invalid_request");
        let step = "token_endpoint";
        try {
          let refreshResult = await oidcClient.refresh(str, {
            exchangeBody: {
              ...(gatewayConfig.oidc?.scope_on_refresh && {
                scope,
              }),
              ...(clientAssertionSigner && (await clientAssertionSigner())),
            },
          });
          let claims;
          try {
            claims = refreshResult.claims();
          } catch {
            claims = undefined;
          }
          let effectiveClaims;
          let userinfoClaims;
          if (claims === undefined) {
            if (!refreshResult.access_token)
              throw Error("IdP refresh response had neither id_token nor access_token");
            step = "userinfo_no_id_token";
            effectiveClaims = await oidcClient.userinfo(refreshResult.access_token);
          } else {
            effectiveClaims = claims;
            step = "userinfo_fallback";
            userinfoClaims = await fetchUserinfo(claims, refreshResult.access_token);
          }
          step = "claims";
          let accessToken = await mintSessionForClaims(
            effectiveClaims,
            "session.refresh",
            clientIp,
            requestId,
            userinfoClaims,
            claims === undefined,
          );
          return Response.json(
            {
              access_token: accessToken,
              refresh_token: refreshResult.refresh_token ?? str,
              token_type: "Bearer",
              expires_in: gatewayConfig.session.ttl_hours * 3600,
            },
            {
              headers: NO_STORE_HEADERS,
            },
          );
        } catch (error) {
          let isIdpError =
            error.response !== undefined || typeof error.code === "string" || error.name === "RPError";
          let isInvalidGrant = error.error === "invalid_grant";
          let error_2 = isIdpError && !isInvalidGrant ? "temporarily_unavailable" : "invalid_grant";
          let message = errorMessage(error);
          gatewayLog(
            "warn",
            `refresh failed request_id=${requestId}: ${message} (at ${step}, answered ${error_2})`,
          );
          audit("session.refresh", {
            result: "fail",
            client_ip: clientIp,
            err: message,
            step,
            answer: error_2,
          });
          return oauthErrorResponse(error_2, error_2 === "temporarily_unavailable" ? 503 : 401);
        }
      }
      return oauthErrorResponse("unsupported_grant_type");
    }
    let authHeader = request.headers.get("authorization");
    let bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let sessionClaims = null;
    let criClaims = null;
    let triedCri = false;
    if (bearerToken !== null)
      if (
        criVerifier !== null &&
        isProxiedPath(pathname_2) &&
        request.method === "POST" &&
        isCriJwtTyp(bearerToken)
      ) {
        triedCri = true;
        let criResult = await criVerifier.authenticate(bearerToken, requestId, clientIp, pathname_2);
        if (!criResult.ok && criResult.status === 503)
          return jsonErrorResponse(
            503,
            "api_error",
            "customer-routed inference is temporarily unavailable: the gateway cannot obtain current verification keys",
            requestId,
            {
              "retry-after": "30",
            },
          );
        criClaims = criResult.ok ? criResult.claims : null;
        sessionClaims = criClaims;
      } else sessionClaims = await verifySessionJwt(bearerToken, tokenKeys, publicUrl);
    if (!sessionClaims) {
      if (!triedCri)
        audit("auth.denied", {
          reason: authHeader ? "invalid_token" : "missing_token",
          path: pathname_2,
          client_ip: clientIp,
        });
      return jsonErrorResponse(401, "authentication_error", "invalid token", requestId);
    }
    let filtered = gatewayConfig.upstreams.filter(
      (upstream) =>
        !upstream.groups || upstream.groups.some((group) => sessionClaims.groups?.includes(group)),
    );
    let upstreams = upstreamForwarders.filter((upstreamForwarder) =>
      filtered.some((upstream) => upstream.name === upstreamForwarder.name),
    );
    let models = gatewayConfig.models.filter(
      (model) =>
        filtered.some((upstream) => Object.hasOwn(model.upstream_model, upstream.name)) ||
        (filtered.length > 0 && findModelConfigById(model.id) !== null),
    );
    if (pathname_2 === "/managed/settings") {
      let baseHeaders = {
        "x-cc-gateway-version":
          typeof {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          } !== "undefined"
            ? {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            : "unknown",
        Vary: "User-Agent",
      };
      let notFoundHeaders = {
        status: 404,
        headers: {
          ...baseHeaders,
          ...NO_STORE_HEADERS,
        },
      };
      if (!managedPolicies) return new Response("not configured", notFoundHeaders);
      let matched = matchPolicy(managedPolicies, sessionClaims);
      if (!matched) {
        gatewayLog(
          "warn",
          `no managed policy matched for sub=${sessionClaims.sub} (groups: ${(sessionClaims.groups ?? []).join(",") || "none"}) request_id=${requestId}`,
        );
        return new Response("no policy matched", notFoundHeaders);
      }
      let { payload } = matched.policy;
      if (isHostEntrypointClient(request.headers.get("user-agent"))) {
        if (matched.policy.desktopSessionPayload === undefined) {
          if (matched.policy.serveToDesktop !== false)
            gatewayLog(
              "info",
              `managed policy ${matched.index} withheld from a Claude Desktop session for sub=${sessionClaims.sub}: it has no \`code\` settings request_id=${requestId}`,
            );
          return new Response("not served to Claude Desktop sessions", notFoundHeaders);
        }
        payload = matched.policy.desktopSessionPayload;
      }
      let etag = `"${payload.checksum}"`;
      let ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === "*" && isManagedClaudeCodeDesktopSession(matched.policy)) {
        gatewayLog(
          "info",
          `Claude Desktop's Code tab doesn't start for sub=${sessionClaims.sub}: managed policy ${matched.index} has \`code\` settings, and Claude Code on that machine doesn't take this gateway's settings. To let the Code tab start, name this gateway in forceLoginGatewayUrl in that machine's Claude Code managed settings, and make sure the machine resolves the gateway's hostname itself and reaches it over HTTPS on a private network. request_id=${requestId}`,
        );
        return new Response(null, {
          status: 304,
          headers: {
            ...baseHeaders,
            ...NO_STORE_HEADERS,
          },
        });
      }
      if (ifNoneMatch === etag)
        return new Response(null, {
          status: 304,
          headers: baseHeaders,
        });
      audit("managed.serve", {
        sub: sessionClaims.sub,
        email: sessionClaims.email,
        policy_index: matched.index,
        ...(matched.indexes && {
          policy_indexes: matched.indexes,
        }),
        checksum: payload.checksum,
      });
      return Response.json(payload, {
        headers: {
          ETag: etag,
          ...baseHeaders,
        },
      });
    }
    if (pathname_2 === "/api/oauth/usage" && request.method === "GET") {
      if (!spendLimitAdmin)
        return new Response("not configured", {
          status: 404,
          headers: NO_STORE_HEADERS,
        });
      return spendLimitAdmin.usage(sessionClaims, requestId);
    }
    if (pathname_2 === "/user/bootstrap" && request.method === "GET") {
      if (!managedPolicies || !desktopPolicies) {
        audit("desktop_bootstrap.denied", {
          reason: "not_configured",
          sub: sessionClaims.sub,
          email: sessionClaims.email,
        });
        return jsonErrorResponse(
          404,
          "not_found_error",
          'Claude Desktop is not configured on this gateway \u2014 add a "desktop:" block to a managed policy',
          requestId,
          NO_STORE_HEADERS,
        );
      }
      let matched = matchPolicy(managedPolicies, sessionClaims);
      if (!matched || matched.policy.desktop === undefined) {
        gatewayLog(
          "warn",
          `no desktop-enabled managed policy matched for sub=${sessionClaims.sub} (groups: ${(sessionClaims.groups ?? []).join(",") || "none"}) request_id=${requestId}`,
        );
        audit("desktop_bootstrap.denied", {
          reason: matched ? "policy_not_opted_in" : "no_policy_matched",
          sub: sessionClaims.sub,
          email: sessionClaims.email,
        });
        return jsonErrorResponse(
          404,
          "not_found_error",
          matched
            ? 'the policy matching this user does not opt into desktop \u2014 add a "desktop:" block to it'
            : "no policy matched",
          requestId,
          NO_STORE_HEADERS,
        );
      }
      let clientBootstrapConfig = buildClientBootstrapConfig(
        {
          ...gatewayConfig,
          upstreams: filtered,
          models,
        },
        matched.policy,
        sessionClaims,
        baseUrl,
      );
      let isSpendAdmin = isAdminGroupMember(sessionClaims.groups, gatewayConfig.admin);
      audit("desktop_bootstrap.serve", {
        sub: sessionClaims.sub,
        email: sessionClaims.email,
        policy_index: matched.index,
        ...(matched.indexes && {
          policy_indexes: matched.indexes,
        }),
      });
      return Response.json(clientBootstrapConfig, {
        headers: {
          ...NO_STORE_HEADERS,
          "x-gateway-spend-admin": String(isSpendAdmin),
        },
      });
    }
    if (pathname_2 in OTLP_PATH_KINDS && request.method === "POST") {
      let signalKind = OTLP_PATH_KINDS[pathname_2];
      let filtered = gatewayConfig.telemetry.forward_to.filter((target) => target[signalKind]);
      if (filtered.length === 0)
        return new Response(null, {
          status: 200,
        });
      let body = await request.arrayBuffer();
      let contentType = request.headers.get("content-type") ?? "application/x-protobuf";
      let contentEncoding = request.headers.get("content-encoding");
      otelFanout.fanout(pathname_2, body, contentType, contentEncoding, filtered);
      return new Response(null, {
        status: 200,
      });
    }
    let matchedPolicy =
      criClaims !== null
        ? undefined
        : managedPolicies
          ? matchPolicy(managedPolicies, sessionClaims)?.policy
          : undefined;
    if (pathname_2 === "/v1/models" && request.method === "GET")
      return modelsResponse(models, upstreams, gatewayConfig.auto_include_builtin_models, matchedPolicy);
    if (isProxiedPath(pathname_2) && request.method === "POST") {
      let user = {
        sub: sessionClaims.sub,
        email: sessionClaims.email,
      };
      let loadTestUser =
        gatewayConfig.load_test_mode?.enabled && criClaims === null
          ? request.headers.get("x-load-test-user")
          : null;
      if (loadTestUser !== null) {
        if (!/^\d{1,7}$/.test(loadTestUser)) {
          audit("inference", {
            sub: sessionClaims.sub,
            email: sessionClaims.email,
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
            requestId,
          );
        }
      }
      let principal =
        loadTestUser === null
          ? sessionClaims
          : {
              ...sessionClaims,
              sub: `${sessionClaims.sub}+loadtest-${Number(loadTestUser)}`,
            };
      let spendHeaders = {};
      let payingGroup = null;
      if (spendLimitAdmin && pathname_2 === "/v1/messages" && criClaims === null) {
        let spendResult = await spendLimitAdmin.precheck(principal, requestId);
        if (spendResult.blocked) return spendResult.blocked;
        spendHeaders = spendResult.headers;
        payingGroup = spendResult.payingGroup;
      }
      let startTime = performance.now();
      let logBadRequest = () => {
        audit("inference", {
          sub: principal.sub,
          email: principal.email,
          path: pathname_2,
          model: null,
          upstream: null,
          upstream_request_id: null,
          upstream_cloud_request_id: null,
          ...criIdentityFields(criClaims, null),
          ...(gatewayConfig.load_test_mode?.enabled && {
            load_test: true,
          }),
          status: 400,
          ms: Math.round(performance.now() - startTime),
        });
      };
      let bodyBuf = await request.arrayBuffer();
      if (pathname_2 === "/v1/messages") loadTest?.bodyRead(bodyBuf.byteLength, principal.sub);
      let parsedJson;
      try {
        parsedJson = jsonParse(Buffer.from(bodyBuf).toString("utf8"));
      } catch {
        logBadRequest();
        return jsonErrorResponse(400, "invalid_request_error", "invalid JSON", requestId);
      }
      if (typeof parsedJson !== "object" || parsedJson === null || Array.isArray(parsedJson)) {
        logBadRequest();
        return jsonErrorResponse(
          400,
          "invalid_request_error",
          "request body must be a JSON object",
          requestId,
        );
      }
      let bodyParts = {
        buf: bodyBuf,
        parsed: parsedJson,
      };
      if (policyWebhook || criClaims !== null) {
        let encoded;
        try {
          encoded = new TextEncoder().encode(jsonStringify(bodyParts.parsed));
        } catch {
          logBadRequest();
          return jsonErrorResponse(
            400,
            "invalid_request_error",
            "request body cannot be re-serialized",
            requestId,
          );
        }
        bodyParts.buf = encoded.slice().buffer;
      }
      if (policyWebhook) {
        let requestParts = forwardedRequestParts(request);
        let webhookResponse = await policyWebhook.precheck(
          sessionClaims,
          bodyParts.parsed,
          requestId,
          {
            path: pathname_2,
            query: requestParts.search,
            headers: Object.fromEntries(requestParts.headers.entries()),
          },
          criClaims?.org,
          criClaims !== null ? (criClaims.act?.sub ?? null) : undefined,
        );
        if (webhookResponse) return webhookResponse;
      }
      let startTime_2 = performance.now();
      let speedRequest = null;
      let speed;
      if (
        spendLimitAdmin &&
        pathname_2 === "/v1/messages" &&
        bodyParts.parsed.stream !== true &&
        criClaims === null
      ) {
        speedRequest = bodyParts.parsed;
        speed = bodyParts.parsed.speed === "fast" ? "fast" : undefined;
      }
      let response = await handleGatewayMessagesRequest(
        request,
        pathname_2,
        upstreams,
        models,
        gatewayConfig.auto_include_builtin_models,
        matchedPolicy,
        gatewayConfig.timeouts.upstream_ttfb_ms,
        requestId,
        {
          body: bodyParts,
          ...(criClaims !== null && {
            criPrincipal: true,
          }),
          ...(criClaims === null && {
            user,
          }),
          ttfbOnSdkLegs: gatewayConfig.timeouts.operator_set,
        },
      );
      if (criClaims !== null) response = await finalizeUpstreamResponse(response, request, requestId);
      let model = response.headers.get("x-gateway-model");
      let upstreamName = response.headers.get("x-gateway-upstream");
      let upstreamModel = response.headers.get("x-gateway-upstream-model");
      let upstreamKind = response.headers.get("x-gateway-upstream-kind");
      let upstreamRequestId =
        response.headers.get("x-gateway-upstream-request-id")?.match(REQUEST_ID_RE)?.[0] ?? null;
      let upstreamCloudRequestId =
        response.headers.get("x-gateway-upstream-cloud-request-id")?.match(REQUEST_ID_RE)?.[0] ?? null;
      audit("inference", {
        sub: principal.sub,
        email: principal.email,
        path: pathname_2,
        model,
        upstream: upstreamName,
        upstream_request_id: upstreamRequestId,
        upstream_cloud_request_id: upstreamCloudRequestId,
        ...criIdentityFields(criClaims, upstreamKind),
        ...(gatewayConfig.load_test_mode?.enabled && {
          load_test: true,
        }),
        status: response.status,
        ms: Math.round(performance.now() - startTime_2),
      });
      for (let header of GATEWAY_DIAGNOSTIC_HEADERS) response.headers.delete(header);
      response.headers.delete("x-cri-upstream-kind");
      if (criClaims !== null) {
        if (upstreamKind !== null) response.headers.set("x-cri-upstream-kind", "cloud");
      }
      if (response.ok) {
        for (let [key, value] of Object.entries(spendHeaders)) response.headers.set(key, value);
        response.headers.set("request-id", requestId);
      }
      if (response.status >= 500)
        gatewayLog("warn", `upstream ${response.status} on ${pathname_2} request_id=${requestId}`);
      if (spendLimitAdmin && pathname_2 === "/v1/messages" && criClaims === null) {
        let speedBody = speedRequest;
        return spendLimitAdmin.meter(
          response,
          principal,
          payingGroup,
          upstreamName,
          upstreamModel,
          model,
          speedBody
            ? () =>
                countTokensViaUpstreams(
                  speedBody,
                  upstreams,
                  models,
                  gatewayConfig.auto_include_builtin_models,
                  user,
                )
            : null,
          speed,
        );
      }
      return response;
    }
    return new Response("not found", {
      status: 404,
    });
  }
  http.maxHeaderSize = 262144;
  let server = Bun.serve({
    hostname: gatewayConfig.listen.host,
    port: gatewayConfig.listen.port,
    idleTimeout: 0,
    development: false,
    ...(tlsConfig && {
      tls: tlsConfig,
    }),
    fetch: async (request, server) => {
      overloadWarner(server.pendingRequests);
      let address = server.requestIP(request)?.address;
      let xffHeader = request.headers.get("x-forwarded-for");
      let { clientIp, badHop } = resolveClientIp(address, xffHeader, cidrList);
      let ignoredXff = !!xffHeader && address !== undefined && !isIpInRanges(address, cidrList);
      let clientRequestId = request.headers.get(X_CLIENT_REQUEST_ID);
      let requestId = clientRequestId && REQUEST_ID_RE.test(clientRequestId) ? clientRequestId : randomUUID();
      let response;
      try {
        response = await handleRequest(request, clientIp, badHop, requestId, ignoredXff);
      } catch (error) {
        gatewayLog("error", `unhandled request_id=${requestId}: ${errorMessage(error)}`);
        response = jsonErrorResponse(500, "api_error", "internal server error", requestId);
      }
      response.headers.set(X_REQUEST_ID, requestId);
      return withSecurityHeaders(response, !!tlsConfig);
    },
    error: (error) => {
      gatewayLog("error", `unhandled: ${errorMessage(error)}`);
      return withSecurityHeaders(jsonErrorResponse(500, "api_error", "internal server error"), !!tlsConfig);
    },
  });
  printGatewayBanner(gatewayConfig, {
    tls: !!tlsConfig,
    hostname: server.hostname ?? gatewayConfig.listen.host,
    port: server.port ?? gatewayConfig.listen.port,
    managed: !!managedPolicies,
    outboundLimit: maxHttpRequests,
  });
  for (let warning of collectGatewayConfigWarnings(gatewayConfig, managedPolicies))
    gatewayLog("warn", warning);
  warnIfMetadataReachable();
  return {
    port: server.port ?? gatewayConfig.listen.port,
    stop: () => {
      server.stop(true);
      store.close();
      loadTest?.close();
    },
    drain: async (timeoutMs) => {
      let stopped = server.stop(false);
      await Promise.race([stopped, sleep(timeoutMs)]);
      let pendingRequests = server.pendingRequests;
      await server.stop(true);
      await spendLimitAdmin?.flush();
      store.close();
      loadTest?.close();
      return pendingRequests;
    },
  };
}
export { startClaudeGateway };
