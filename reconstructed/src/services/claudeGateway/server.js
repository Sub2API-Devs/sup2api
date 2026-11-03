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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  timingSafeEqual,
  timingSafeEqual as timingSafeEqual_2,
  randomUUID,
  randomUUID as randomUUID_2,
} from "crypto";
import { readFile, readFile as readFile_2, readFile as readFile_3 } from "fs/promises";
import http from "http";
import { gatewayServerBlockedMessage, ProviderNotAllowedError } from "../../utils/model/allowedProviders.js";
import {
  assertNativeBinary,
  W1,
  retryPostgresConnect,
  Y1,
  V1,
  yve,
  Zd,
  oauthErrorResponse,
  Is,
  isHostEntrypointClient,
  q1,
  tO,
  X_CLIENT_REQUEST_ID,
  X_REQUEST_ID,
  withSecurityHeaders,
} from "./httpServer.js";
import { loadGatewayConfig } from "./config/load.js";
import { gatewayJsonLog, gatewayLog, printGatewayBanner } from "../gateway/gatewayBanner.js";
import { configureGatewayNetwork } from "./network.js";
import { Lu, warnIfMetadataReachable } from "./ssrfGuard.js";
import { OtelFanout, isAdminGroupMember, Q0 } from "./telemetry/otelFanout.js";
import { parseMaxHttpRequests, createOverloadWarner } from "./concurrency.js";
import { getPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { openGatewayPostgres } from "./store/postgres.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { createSpendLimitAdmin, q0, handleSpendLimitAdmin } from "./spendLimits.js";
import { createCriJwtVerifier, Lk } from "./auth/criJwt.js";
import { createPolicyWebhook } from "./policyHook.js";
import {
  deriveTokenKeys,
  signSessionJwt,
  Cf,
  qy,
  gk,
  verifySessionJwt,
  Tf,
  Ek,
  generateUserCode,
  Wy,
  Af,
  Va,
  Gy,
  If,
  generators,
  bk,
  vk,
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
import { Nu, resolveClientIp } from "./accessControl.js";
import { withTimeout, sleep } from "../../utils/sleep.js";
import { n1e, GOe } from "../../utils/settings/mdm/settings.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { gatewayIndexPage, deviceCodePage, deviceDeniedPage, signInResultPage } from "./pages.js";
import { buildGatewayProtocolDoc } from "./protocolDoc.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { p_, f_, countTokensViaUpstreams } from "./proxyRequest.js";
import { jsonErrorResponse, finalizeUpstreamResponse, GATEWAY_DIAGNOSTIC_HEADERS } from "./upstreamErrors.js";
import { findModelConfigById } from "../../utils/model/providerCaches.js";
import { zd, buildClientBootstrapConfig } from "./clientSurface.js";
import { modelsResponse } from "./models.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { handleGatewayMessagesRequest } from "./messagesHandler.js";
import { collectGatewayConfigWarnings } from "./config/warnings.js";

/**
 * claude gateway 入口：加载并校验配置、建立存储与认证、启动 HTTP 服务与遥测。
 */
//@ chunk-1ny7cxrt.js:1521692-1553390 placement
async function startClaudeGateway(e) {
  let t = gatewayServerBlockedMessage();
  if (t !== void 0) throw new ProviderNotAllowedError(t);
  assertNativeBinary();
  let n = await loadGatewayConfig(e);
  (gatewayJsonLog("config.load", {
    path: e,
    sha256: createHash("sha256").update(JSON.stringify(n)).digest("hex"),
  }),
    configureGatewayNetwork());
  let o = Lu(n.listen.trusted_proxies),
    r = Lu(n.access_control.allow_cidrs),
    s = Lu(n.access_control.deny_cidrs),
    a = Lu([...W1, "169.254.0.0/16", "fe80::/10"]),
    l = !1,
    c = !1,
    u = { device_authorization: 0, device_verify: 0 },
    f = 0,
    readiness_grace_seconds = n.store.readiness_grace_seconds,
    m = !1,
    y = null,
    b = null,
    w = !1,
    S = new OtelFanout(),
    j = parseMaxHttpRequests(getPreSettingsEnvSnapshot().BUN_CONFIG_MAX_HTTP_REQUESTS),
    M = createOverloadWarner(j),
    N = await retryPostgresConnect(() =>
      openGatewayPostgres(n.store.postgres_url, {
        auditRetentionDays: n.admin?.audit_retention_days,
        maxConnections: n.store.max_connections,
        connectTimeoutSeconds: n.store.connect_timeout_seconds,
        username: n.store.username,
        password: n.store.password,
        spendRetentionMonths: n.admin?.spend_retention_months,
        identityRetentionDays: n.admin?.identity_retention_days,
      }),
    ).catch((_e) => {
      let Fe = errorMessage(_e);
      if (Y1.test(Fe))
        throw (
          gatewayLog(
            "error",
            `could not connect to Postgres at boot: ${Fe}. Check store.postgres_url. If the database needs longer to become reachable, raise store.connect_timeout_seconds (now ${n.store.connect_timeout_seconds}s)`,
          ),
          Error(`could not connect to Postgres: ${Fe}. Check store.postgres_url in ${e}`)
        );
      if (getErrnoCode(_e) === "ERR_INVALID_URL" || _e instanceof URIError)
        throw Error(
          `store.postgres_url in ${e} is not a URL the gateway can read. It takes one host, as postgres://host:port/database; a comma-separated list of hosts is not supported. A password containing / ? # or % goes in store.password, not in the URL`,
        );
      throw _e;
    }),
    Z = { readKeys: n.admin?.read_keys ?? [], writeKeys: n.admin?.write_keys ?? [] },
    F = n.load_test_mode?.enabled
      ? await (await import("./chunk-hde10cf2.js")).startLoadTest(n.load_test_mode, N.sql).catch((_e) => {
          throw (N.close(), _e);
        })
      : void 0,
    X = createSpendLimitAdmin(N.sql, n, F?.spendFault),
    joined = [
      ...(n.oidc ? ["new sign-ins fail"] : []),
      !X
        ? "inference is not affected"
        : n.enforcement.fail_closed_on_error
          ? "signed-in developers' inference is refused with 429 'spend limit unavailable' (enforcement.fail_closed_on_error is true)"
          : "spend limits are not enforced, signed-in developers' requests pass unchecked (enforcement.fail_closed_on_error is false)",
    ].join("; "),
    Me = n.cri?.enabled === !0,
    ce =
      Me && n.cri
        ? createCriJwtVerifier({
            audience: n.cri.audience,
            orgAllowlist: n.cri.org_allowlist,
            jwksUrl: n.cri.jwks_url,
            issuer: n.cri.issuer,
          })
        : null;
  if (ce !== null) await ce.prime();
  let Ne = createPolicyWebhook(n),
    be = deriveTokenKeys(n.session.jwt_secret),
    public_url = n.listen.public_url,
    Ue = n.oidc?.groups_claim ?? "groups",
    kt = n.oidc?.email_claim ?? "email",
    je = n.oidc?.user_id_claim ?? "sub",
    Ur;
  function An(_e) {
    return typeof _e === "string" && _e.length > 0 ? _e : void 0;
  }
  function xe(_e) {
    let Fe = readClaim(_e, Ue);
    if (typeof Fe === "string") return Fe.length > 0 ? [Fe] : void 0;
    if (!Array.isArray(Fe)) return;
    let filtered = Fe.filter((bt) => typeof bt === "string" && bt.length > 0);
    return filtered.length > 0 ? filtered : void 0;
  }
  function rn(_e) {
    return readClaim(_e, Ue) !== void 0;
  }
  function Hr(_e) {
    return readFirstClaim(_e, kt) !== void 0;
  }
  async function Cs(_e, Fe, In, bt, Zr) {
    gatewayLog(
      "debug",
      `oidc id_token claim names request_id=${bt}: ${Object.keys(_e).sort().join(",")}` +
        (Zr ? `; userinfo claim names: ${Object.keys(Zr).sort().join(",")}` : ""),
    );
    let Vt = Hr(_e) ? readFirstClaim(_e, kt) : Zr ? readFirstClaim(Zr, kt) : void 0;
    if (
      (assertEmailAllowed(
        { email: Vt, email_verified: _e.email_verified ?? Zr?.email_verified },
        n.oidc?.allowed_email_domains,
      ),
      An(_e.sub) === void 0)
    )
      throw Error("IdP claims missing required `sub`");
    let Ts = An(readClaim(_e, je));
    if (Ts === void 0)
      throw Object.assign(
        Error(
          `oidc.user_id_claim names \`${je}\`, which the IdP did not send as a non-empty string. Check oidc.scopes, and oidc.scope_on_refresh if only refreshes fail`,
        ),
        { code: "USER_ID_CLAIM_MISSING" },
      );
    let ji = typeof Vt === "string" ? Vt : void 0,
      zr;
    if (Ur) {
      if (ji === void 0)
        throw Object.assign(
          Error(
            "oidc.google_groups is configured but the id_token has no email \u2014 check oidc.email_claim and that the email scope is requested",
          ),
          { code: "GOOGLE_GROUPS_UNAVAILABLE" },
        );
      zr = await Ur(ji);
    } else if (
      ((zr = rn(_e) ? xe(_e) : Zr ? xe(Zr) : void 0),
      Fe === "session.refresh" && !rn(_e) && !Zr && n.upstreams.some((upstream) => upstream.groups))
    )
      gatewayLog(
        "info",
        `refresh request_id=${bt}: no groups claim for sub=${Ts}, so only upstreams without groups serve them. If your IdP leaves groups out of the refreshed id_token, set oidc.userinfo_fallback: true`,
      );
    assertGroupAllowed(zr, n.oidc?.allowed_groups);
    let Bs = An(_e.name) ?? An(Zr?.name),
      _l = await signSessionJwt(
        { sub: Ts, email: ji, name: Bs, groups: zr },
        be,
        n.session.ttl_hours,
        public_url,
      );
    return (
      gatewayJsonLog(Fe, {
        request_id: bt,
        result: "success",
        sub: Ts,
        email: ji,
        client_ip: In,
        ttl_hours: n.session.ttl_hours,
      }),
      _l
    );
  }
  let cr = n.oidc?.google_groups;
  if (cr) Ur = await createGoogleGroupsLookup(cr);
  let tls = n.listen.tls,
    [Qt, Vd, Kr, Bi] = await Promise.all([
      n.oidc ? createOidcClient(n.oidc) : Promise.resolve(null),
      createUpstreamForwarders(n.upstreams, F?.fetch),
      resolveManagedPolicies(n),
      tls
        ? Promise.all([readFile(tls.cert, "utf8"), readFile(tls.key, "utf8")]).then(([_e, Fe]) => ({
            cert: _e,
            key: Fe,
          }))
        : Promise.resolve(void 0),
    ]),
    vr =
      Qt && n.oidc?.token_endpoint_auth_method === "private_key_jwt" && n.oidc.client_assertion
        ? createClientAssertionSigner(
            n.oidc.client_id,
            n.oidc.client_assertion,
            Qt.issuer.metadata.token_endpoint,
          )
        : void 0,
    qd = Kr?.some((_e) => _e.desktop !== void 0) ?? !1,
    joined_2 = uniq(n.oidc?.scopes ?? ["openid", "profile", "email", "offline_access"]).join(" ");
  async function rO(_e, Fe) {
    if (!n.oidc?.userinfo_fallback || !Fe || !Qt) return;
    if (Hr(_e) && (Ur !== void 0 || rn(_e))) return;
    let userinfo = await Qt.userinfo(Fe);
    if (typeof userinfo.sub !== "string" || userinfo.sub !== _e.sub)
      throw Error("userinfo sub missing or does not match id_token sub");
    return userinfo;
  }
  if (
    Qt &&
    n.oidc?.scopes &&
    !n.oidc.scopes.includes("offline_access") &&
    Array.isArray(Qt.issuer.metadata.scopes_supported) &&
    Qt.issuer.metadata.scopes_supported.includes("offline_access")
  )
    gatewayLog(
      "warn",
      "oidc.scopes omits offline_access but the IdP advertises it \u2014 refresh tokens " +
        `will not be issued; developers re-run the browser login every ${n.session.ttl_hours}h (session.ttl_hours)`,
    );
  if (
    Qt &&
    n.oidc &&
    (Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
    (n.oidc.extra_auth_params.access_type !== "offline" ||
      !(n.oidc.extra_auth_params.prompt ?? "").split(" ").includes("consent"))
  )
    gatewayLog(
      "warn",
      "oidc.issuer is accounts.google.com \u2014 Google ignores offline_access and needs " +
        `extra_auth_params: { access_type: offline, prompt: consent } and scopes: [openid, profile, email] for refresh tokens. Without both params developers re-run the browser login every ${n.session.ttl_hours}h (session.ttl_hours); without prompt: consent specifically, refresh tokens ` +
        "are issued only on each user\u2019s first login.",
    );
  if (
    Qt &&
    (Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com") &&
    (n.oidc?.allowed_groups?.length ?? 0) > 0 &&
    !n.oidc?.google_groups
  )
    gatewayLog(
      "warn",
      "oidc.allowed_groups is set but Google ID tokens do not carry a groups claim \u2014 " +
        "every login will be denied. Set oidc.google_groups to fetch Workspace groups via the Admin SDK, or use allowed_email_domains instead.",
    );
  if (
    Qt &&
    n.oidc?.google_groups &&
    !(Qt.issuer.metadata.issuer ?? "").startsWith("https://accounts.google.com")
  )
    gatewayLog(
      "warn",
      "oidc.google_groups is set but oidc.issuer is not accounts.google.com \u2014 " +
        "the Directory API only returns groups for Google Workspace users, so every login will be refused",
    );
  let Wd =
      Qt && n.oidc
        ? uniq([
            new URL(Qt.issuer.metadata.authorization_endpoint ?? n.oidc.issuer).origin,
            ...n.oidc.form_action_origins,
          ]).join(" ")
        : "",
    iO =
      Boolean(Bi) || (n.listen.public_url !== void 0 && new URL(n.listen.public_url).protocol === "https:"),
    Jg = iO ? "__Host-gw_dev" : "gw_dev",
    oO = `HttpOnly; SameSite=Lax; Path=/${iO ? "; Secure" : ""}`;
  function J1(_e) {
    let Fe = _e.headers.get("cookie") ?? "";
    for (let In of Fe.split(";")) {
      let index = In.indexOf("=");
      if (index > 0 && In.slice(0, index).trim() === Jg) return In.slice(index + 1).trim();
    }
    return null;
  }
  async function X1(_e, Fe, In, bt, Zr) {
    let Vt = (Ie, ht) => gatewayJsonLog(Ie, { request_id: bt, ...ht }),
      Ts = (Ie) =>
        N.del(Cf(Ie)).catch((ht) => {
          gatewayLog("warn", `user_code cleanup failed request_id=${bt}: ${errorMessage(ht)}`);
        }),
      ji = (Ie) => {
        let now = Date.now();
        if (now - u[Ie] < 60000) return;
        u[Ie] = now;
        let { max: max, window_seconds: window_seconds } = n.rate_limits[Ie],
          Pt = Zr
            ? ` This request carried X-Forwarded-For, which the gateway ignored because ${Fe} is not in listen.trusted_proxies. If ${Fe} is your load balancer, add it there first so each developer is counted separately. If many developers still share an address after that`
            : " If many developers share that address";
        gatewayLog(
          "warn",
          `sign-in refused: ${Fe ?? "unknown address"} went over rate_limits.${Ie}.max (${max} per ${window_seconds}s per client address).${Pt}, for example behind a NAT, raise rate_limits.${Ie}.max.${Ie === "device_verify" ? " If they do not, someone may be guessing sign-in codes." : ""} Logged at most once a minute; every refusal has an audit event with "result":"rate_limited".`,
        );
      },
      { pathname: pathname } = new URL(_e.url),
      Bs = _e.method === "GET" && (pathname === "/healthz" || pathname === "/readyz");
    if (pathname === "/v1/messages" && _e.method === "POST") F?.arrived();
    let _l = s.length > 0 || (r.length > 0 && !Bs);
    if (In !== void 0) {
      if (claimOnce().claim("gateway_xff_unparseable"))
        gatewayLog(
          "warn",
          `X-Forwarded-For via trusted proxy ${Fe} contained '${In}', which is not an IP address, so the real client is unknown; ` +
            (s.length > 0 || r.length > 0
              ? "access_control is set, so such requests get 403 (audit reason xff_unparseable). "
              : "per-IP rate limits and audit client_ip use the proxy address instead. ") +
            "Either a proxy writes something other than 'ip', 'ipv4:port' or '[ipv6]:port' (for example 'unknown', a hostname, or an IPv6 address with a port and no brackets), or listen.trusted_proxies covers hosts that are not your proxies.",
        );
      if (_l)
        return (
          Vt("access.denied", { reason: "xff_unparseable", client_ip: Fe, xff_hop: In }),
          new Response("forbidden", { status: 403 })
        );
    }
    if (Fe === void 0 && _l)
      return (
        Vt("access.denied", { reason: "client_ip_unknown" }),
        new Response("forbidden", { status: 403 })
      );
    if (Nu(Fe, s))
      return (
        Vt("access.denied", { reason: "ip_denylist", client_ip: Fe }),
        new Response("forbidden", { status: 403 })
      );
    if (_e.method === "GET" && pathname === "/healthz") return new Response("ok", { status: 200 });
    if (_e.method === "GET" && pathname === "/readyz") {
      if (readiness_grace_seconds === 0)
        try {
          return (await N.get("__readyz_probe__"), (m = !1), new Response("ready", { status: 200 }));
        } catch (error) {
          if (!m)
            ((m = !0),
              gatewayLog(
                "warn",
                `Postgres is not answering (${errorMessage(error)}), so /readyz reports not ready and whatever checks /readyz may stop sending this replica traffic or replace it. To keep reporting ready through a short outage such as a database failover, set store.readiness_grace_seconds to more seconds than the outage lasts (at most 3600)`,
              ));
          return new Response("store unavailable", { status: 503 });
        }
      if (
        ((b ??= withTimeout(N.get("__readyz_probe__"), V1, `no reply within ${V1 / 1000}s`)
          .then(
            () => {
              if (y !== null)
                gatewayLog(
                  "info",
                  `Postgres is answering again after about ${Math.round((performance.now() - y) / 1000)}s; /readyz reports ready`,
                );
              ((y = null), (w = !1));
            },
            (Ie) => {
              if (y === null)
                ((y = performance.now()),
                  gatewayLog(
                    "warn",
                    `Postgres is not answering (${errorMessage(Ie)}). /readyz keeps reporting ready for up to ${readiness_grace_seconds}s (store.readiness_grace_seconds), then reports not ready. Until Postgres is back: ${joined}`,
                  ));
            },
          )
          .finally(() => {
            b = null;
          })),
        await withTimeout(b, yve, "readyz answer bound").catch(() => {}),
        y === null)
      )
        return new Response("ready", { status: 200 });
      if (performance.now() - y <= readiness_grace_seconds * 1000)
        return new Response("ready", { status: 200 });
      if (!w)
        ((w = !0),
          gatewayLog(
            "warn",
            `Postgres has not answered for more than ${readiness_grace_seconds}s (store.readiness_grace_seconds), so /readyz now reports not ready and whatever checks /readyz may stop sending this replica traffic or replace it`,
          ));
      return new Response("store unavailable", { status: 503 });
    }
    if (r.length > 0 && !Nu(Fe, r))
      return (
        Vt("access.denied", { reason: "ip_not_allowlisted", client_ip: Fe }),
        new Response("forbidden", { status: 403 })
      );
    let now = Date.now();
    if (now - f > 60000) {
      f = now;
      let Ie = await n1e();
      (GOe(Ie.mdm, Ie.hkcu, Ie.wslInherits, Ie.whereAsked), or());
    }
    let sO = gatewayServerBlockedMessage();
    if (sO !== void 0) {
      if (claimOnce().claim("gateway_provider_policy_refusal")) gatewayLog("error", sO);
      return (
        Vt("access.denied", { reason: "provider_policy", client_ip: Fe }),
        new Response("service unavailable", { status: 503 })
      );
    }
    if (r.length === 0 && !l && Fe !== void 0 && !Nu(Fe, a))
      ((l = !0),
        Vt("access.public_client", { client_ip: Fe }),
        gatewayLog(
          "warn",
          `request from ${Fe}, which is not a private address: this gateway may be reachable from the public internet. It must not be: it can push settings that run commands on developer machines. Check the network in front of it, then set access_control.allow_cidrs (behind a proxy, set listen.trusted_proxies first so the gateway sees real client addresses)`,
        ));
    if (Zr && !c)
      ((c = !0),
        gatewayLog(
          "warn",
          `request from ${Fe} carried an X-Forwarded-For header, but ${o.length === 0 ? "listen.trusted_proxies is not set" : `${Fe} is not in listen.trusted_proxies`}, so the gateway ignored the header and used ${Fe} as the client address. If ${Fe} is your load balancer or ingress, every developer behind it shares one sign-in rate limit (rate_limits) and one address in audit events: add its source range to listen.trusted_proxies. If developers connect directly and something on their side adds the header, nothing needs to change. Logged once per start, however many requests are affected.`,
        ));
    let limits = n.limits;
    if (limits.max_url_length !== void 0 && _e.url.length > limits.max_url_length)
      return new Response("uri too long", { status: 414 });
    if (limits.max_request_header_bytes !== void 0) {
      let Ie = 0;
      for (let [ht, ot] of _e.headers) Ie += ht.length + ot.length + 4;
      if (Ie > limits.max_request_header_bytes)
        return new Response("request header fields too large", { status: 431 });
    }
    let $s = new URL(_e.url),
      pathname_2 = $s.pathname,
      Hi = n.listen.public_url ?? $s.origin;
    if (pathname_2 === "/" && _e.method === "GET")
      return gatewayIndexPage(
        Hi,
        n.oidc?.issuer ?? null,
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
        } < "u"
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
        ...(n.oidc !== void 0
          ? {
              device_authorization_endpoint: `${Hi}/oauth/device_authorization`,
              token_endpoint: `${Hi}/oauth/token`,
              grant_types_supported: [qy, "refresh_token"],
            }
          : { grant_types_supported: [] }),
        response_types_supported: [],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: ["openid", "profile", "email"],
        gateway_protocol_version: gk,
        ...(Me && { cri_enabled: !0 }),
      });
    if (pathname_2 === "/protocol" && _e.method === "GET")
      return new Response(buildGatewayProtocolDoc({ oidcConfigured: n.oidc !== void 0, criEnabled: Me }), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    let Xg = _e.headers.get("content-length");
    if (Xg === null && _e.headers.get("transfer-encoding"))
      return new Response("length required", { status: 411 });
    if (Xg !== null) {
      let Ie = Number(Xg);
      if (!Number.isFinite(Ie) || Ie < 0 || Ie > n.limits.max_request_bytes)
        return new Response("payload too large", { status: 413 });
    }
    if (n.admin && q0(pathname_2)) {
      let admin = n.admin,
        ht = _e.headers.get("authorization"),
        ot = null;
      if (admin.admin_groups.length > 0 && !_e.headers.get("x-api-key") && ht?.startsWith("Bearer ")) {
        let Pt = await verifySessionJwt(ht.slice(7), be, public_url);
        if (Pt && isAdminGroupMember(Pt.groups, admin)) ot = { sub: Pt.sub };
      }
      let Gt = await handleSpendLimitAdmin(_e, $s, N.sql, Z, ot, Fe, admin.group_limit_mode);
      if (Gt) return Gt;
    }
    if (pathname_2 === "/oauth/device_authorization" && _e.method === "POST") {
      if (!Qt) return Zd();
      if (
        (await N.incr(Tf("devauth", Fe ?? "unknown"), n.rate_limits.device_authorization.window_seconds)) >
        n.rate_limits.device_authorization.max
      )
        return (
          Vt("device.authorize", { result: "rate_limited", client_ip: Fe }),
          ji("device_authorization"),
          oauthErrorResponse(
            "slow_down",
            429,
            "Too many sign-in attempts came from your network address, which other people may share. If this keeps happening after a few minutes, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_authorization. The gateway log says which.",
          )
        );
      let ht = Ek(),
        ot = generateUserCode(),
        Gt = { status: "pending", user_code: ot, created_at: Date.now(), client_ip: Fe },
        Pt = Wy(ht);
      return (
        await Promise.all([N.set(Pt, await Af(Gt, be), Va), N.set(Cf(ot), Pt, Va)]),
        Vt("device.authorize", { result: "success", client_ip: Fe }),
        Response.json(
          {
            device_code: ht,
            user_code: ot,
            verification_uri: `${Hi}/device`,
            verification_uri_complete: `${Hi}/device?user_code=${encodeURIComponent(ot)}`,
            expires_in: Va,
            interval: Gy,
          },
          { headers: Is },
        )
      );
    }
    if (pathname_2 === "/device" && _e.method === "GET") {
      if (!Qt) return Zd();
      let Ie = $s.searchParams.get("user_code") ?? void 0;
      return deviceCodePage({ prefill: Ie, idpOrigin: Wd });
    }
    let Xd = pathname_2 === "/device/deny";
    if ((pathname_2 === "/device" || Xd) && _e.method === "POST") {
      let oidc = n.oidc;
      if (!Qt || !oidc) return Zd();
      let ht = _e.headers.get("origin"),
        ot = _e.headers.get("sec-fetch-site");
      if (!(ot !== null ? ot === "same-origin" || ot === "none" : ht !== null && ht === Hi))
        return (
          Vt("device.verify", { result: "csrf_rejected", client_ip: Fe }),
          deviceCodePage({
            idpOrigin: Wd,
            error:
              "This request came from another site and was blocked. Open the verification link directly.",
          })
        );
      if (
        (await N.incr(Tf("device", Fe ?? "unknown"), n.rate_limits.device_verify.window_seconds)) >
        n.rate_limits.device_verify.max
      )
        return (
          Vt("device.verify", { result: "rate_limited", client_ip: Fe }),
          ji("device_verify"),
          deviceCodePage({
            idpOrigin: Wd,
            error:
              "Too many attempts came from your network address, which other people may share. Wait a few minutes and try again. If this keeps happening, a gateway setting needs changing for your network: listen.trusted_proxies or rate_limits.device_verify. The gateway log says which.",
          })
        );
      let Yt;
      try {
        Yt = (await _e.formData()).get("user_code")?.toString() ?? null;
      } catch {
        Yt = null;
      }
      let Zn = Yt ? await N.get(Cf(Yt)) : null;
      if (Xd && Zn) {
        let Rs = await N.get(Zn),
          Jt = Rs ? await If(Rs, be) : null;
        if (
          Rs &&
          Jt?.status === "pending" &&
          (await N.setIfUnchanged(
            Zn,
            Rs,
            await Af({ status: "denied", user_code: Jt.user_code, created_at: Jt.created_at }, be),
            Va,
          ))
        )
          return (
            Vt("device.deny", {
              result: "denied",
              client_ip: Fe,
              requested_from: Jt.client_ip,
              requested_at: Jt.created_at && new Date(Jt.created_at).toISOString(),
            }),
            await Ts(Jt.user_code),
            deviceDeniedPage(!0)
          );
      }
      if (Xd || !Zn) {
        if ((Vt("device.verify", { result: "unknown_code", client_ip: Fe }), Xd)) return deviceDeniedPage(!1);
        return deviceCodePage({
          idpOrigin: Wd,
          error: "That code was not recognized \u2014 it may have expired. Check your device and try again.",
        });
      }
      let codeVerifier = generators.codeVerifier(),
        nonce = generators.nonce(),
        str = randomBytes(32).toString("base64url"),
        Hs = computeContentHash(str),
        xi = await bk(
          { deviceCodeKey: Zn, idpCodeVerifier: codeVerifier, nonce: nonce, browserHash: Hs },
          be,
        );
      return (
        Vt("device.verify", { result: "redirect", client_ip: Fe }),
        new Response(null, {
          status: 302,
          headers: {
            "Set-Cookie": `${Jg}=${str}; Max-Age=600; ${oO}`,
            Location: Qt.authorizationUrl({
              ...oidc.extra_auth_params,
              redirect_uri: `${Hi}/oauth/callback`,
              state: xi,
              nonce: nonce,
              ...(oidc.use_pkce && {
                code_challenge: generators.codeChallenge(codeVerifier),
                code_challenge_method: "S256",
              }),
              scope: joined_2,
              response_mode: "query",
            }),
          },
        })
      );
    }
    if (pathname_2 === "/oauth/callback") {
      let oidc = n.oidc;
      if (!Qt || !oidc) return Zd();
      let ht = $s.searchParams.get("error");
      if (ht) {
        let Sr = $s.searchParams.get("error_description");
        return signInResultPage(Sr ? `${ht}: ${Sr}` : `Identity provider returned: ${ht}`);
      }
      let ot = $s.searchParams.get("code"),
        Gt = $s.searchParams.get("state"),
        Pt = Gt ? await vk(Gt, be) : null;
      if (!ot || !Pt) return signInResultPage("This sign-in link has expired. Try again from your device.");
      let Yt = `${Jg}=; Max-Age=0; ${oO}`,
        Zn = J1(_e),
        buffer = Buffer.from(Pt.browserHash ?? "", "hex"),
        Or = Zn ? createHash("sha256").update(Zn).digest() : Buffer.alloc(0);
      if (buffer.length !== 32 || Or.length !== buffer.length || !timingSafeEqual(Or, buffer)) {
        Vt("device.callback", { result: "browser_mismatch", client_ip: Fe });
        let Sr = signInResultPage(
          "This sign-in link was started in a different browser. Open the verification link on the same device that showed the code.",
        );
        return (Sr.headers.set("Set-Cookie", Yt), Sr);
      }
      let deviceCodeKey = Pt.deviceCodeKey,
        Hs = await N.get(deviceCodeKey),
        xi = Hs ? await If(Hs, be) : null;
      if (!Hs || !xi || xi.status !== "pending")
        return signInResultPage("This device code has already been used or has expired.");
      let Rs = Hs;
      async function Jt(Sr) {
        let setIfUnchanged = await N.setIfUnchanged(deviceCodeKey, Rs, await Af(Sr, be), Va);
        if (setIfUnchanged) await Ts(Sr.user_code);
        return setIfUnchanged;
      }
      try {
        let Sr = $s.searchParams.get("iss"),
          callback = await Qt.callback(
            `${Hi}/oauth/callback`,
            { code: ot, ...(Sr && { iss: Sr }) },
            { ...(oidc.use_pkce && { code_verifier: Pt.idpCodeVerifier }), nonce: Pt.nonce },
            vr && { exchangeBody: await vr() },
          ),
          claims = callback.claims(),
          of = await Cs(claims, "session.mint", Fe, bt, await rO(claims, callback.access_token)),
          sf = await Jt({
            status: "complete",
            user_code: xi.user_code,
            created_at: xi.created_at,
            access_token: of,
            ...(callback.refresh_token && { refresh_token: callback.refresh_token }),
            expires_in: n.session.ttl_hours * 3600,
          });
        if (!sf) Vt("device.callback", { result: "not_pending", client_ip: Fe });
        let af = signInResultPage(sf ? null : "This device code has already been used or has expired.");
        return (af.headers.set("Set-Cookie", Yt), af);
      } catch (error) {
        let si = errorMessage(error);
        return (
          gatewayLog("warn", `token exchange failed request_id=${bt}: ${si}`),
          Vt("session.mint", { result: "fail", client_ip: Fe, err: si }),
          await Jt({ status: "denied", user_code: xi.user_code, created_at: xi.created_at }),
          signInResultPage("Sign-in could not be completed.")
        );
      }
    }
    if (pathname_2 === "/oauth/token" && _e.method === "POST") {
      if (!Qt) return Zd();
      let Ie;
      try {
        Ie = await _e.formData();
      } catch {
        return oauthErrorResponse("invalid_request");
      }
      let ht = Ie.get("grant_type")?.toString();
      if (ht === qy) {
        let ot = Ie.get("device_code")?.toString();
        if (!ot) return oauthErrorResponse("invalid_request");
        let Gt = Wy(ot),
          Pt = await N.get(Gt),
          Yt = Pt ? await If(Pt, be) : null;
        if (!Yt) return oauthErrorResponse("expired_token");
        if (Yt.status === "pending") {
          if ((await N.incr(Tf("poll", Gt), Gy - 1)) > 1) return oauthErrorResponse("slow_down", 429);
          return oauthErrorResponse("authorization_pending");
        }
        if (Yt.status === "denied") return (await N.del(Gt), oauthErrorResponse("access_denied"));
        return (
          await N.del(Gt),
          Response.json(
            {
              access_token: Yt.access_token,
              refresh_token: Yt.refresh_token,
              token_type: "Bearer",
              expires_in: Yt.expires_in,
            },
            { headers: Is },
          )
        );
      }
      if (ht === "refresh_token") {
        let ot = Ie.get("refresh_token")?.toString();
        if (!ot) return oauthErrorResponse("invalid_request");
        let Gt = "token_endpoint";
        try {
          let refresh = await Qt.refresh(ot, {
              exchangeBody: { ...(n.oidc?.scope_on_refresh && { scope: joined_2 }), ...(vr && (await vr())) },
            }),
            Yt;
          try {
            Yt = refresh.claims();
          } catch {
            Yt = void 0;
          }
          let Zn, Wn;
          if (Yt === void 0) {
            if (!refresh.access_token)
              throw Error("IdP refresh response had neither id_token nor access_token");
            ((Gt = "userinfo_no_id_token"), (Zn = await Qt.userinfo(refresh.access_token)));
          } else ((Zn = Yt), (Gt = "userinfo_fallback"), (Wn = await rO(Yt, refresh.access_token)));
          Gt = "claims";
          let Or = await Cs(Zn, "session.refresh", Fe, bt, Wn);
          return Response.json(
            {
              access_token: Or,
              refresh_token: refresh.refresh_token ?? ot,
              token_type: "Bearer",
              expires_in: n.session.ttl_hours * 3600,
            },
            { headers: Is },
          );
        } catch (error) {
          let Yt = error.response !== void 0 || typeof error.code === "string" || error.name === "RPError",
            Zn = error.error === "invalid_grant",
            Wn = Yt && !Zn ? "temporarily_unavailable" : "invalid_grant",
            Or = errorMessage(error);
          return (
            gatewayLog("warn", `refresh failed request_id=${bt}: ${Or} (at ${Gt}, answered ${Wn})`),
            Vt("session.refresh", { result: "fail", client_ip: Fe, err: Or, step: Gt, answer: Wn }),
            oauthErrorResponse(Wn, Wn === "temporarily_unavailable" ? 503 : 401)
          );
        }
      }
      return oauthErrorResponse("unsupported_grant_type");
    }
    let Qg = _e.headers.get("authorization"),
      ef = Qg?.startsWith("Bearer ") ? Qg.slice(7) : null,
      jt = null,
      ur = null,
      aO = !1;
    if (ef !== null)
      if (ce !== null && p_(pathname_2) && _e.method === "POST" && Lk(ef)) {
        aO = !0;
        let authenticate = await ce.authenticate(ef, bt, Fe, pathname_2);
        if (!authenticate.ok && authenticate.status === 503)
          return jsonErrorResponse(
            503,
            "api_error",
            "customer-routed inference is temporarily unavailable: the gateway cannot obtain current verification keys",
            bt,
            { "retry-after": "30" },
          );
        ((ur = authenticate.ok ? authenticate.claims : null), (jt = ur));
      } else jt = await verifySessionJwt(ef, be, public_url);
    if (!jt) {
      if (!aO)
        Vt("auth.denied", {
          reason: Qg ? "invalid_token" : "missing_token",
          path: pathname_2,
          client_ip: Fe,
        });
      return jsonErrorResponse(401, "authentication_error", "invalid token", bt);
    }
    let filtered = n.upstreams.filter(
        (upstream) => !upstream.groups || upstream.groups.some((group) => jt.groups?.includes(group)),
      ),
      filtered_2 = Vd.filter((Ie) => filtered.some((ht) => ht.name === Ie.name)),
      filtered_3 = n.models.filter(
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
            } < "u"
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
        },
        ht = { status: 404, headers: { ...Ie, ...Is } };
      if (!Kr) return new Response("not configured", ht);
      let ot = matchPolicy(Kr, jt);
      if (!ot)
        return (
          gatewayLog(
            "warn",
            `no managed policy matched for sub=${jt.sub} (groups: ${(jt.groups ?? []).join(",") || "none"}) request_id=${bt}`,
          ),
          new Response("no policy matched", ht)
        );
      let { payload: payload } = ot.policy;
      if (isHostEntrypointClient(_e.headers.get("user-agent"))) {
        if (ot.policy.desktopSessionPayload === void 0) {
          if (ot.policy.serveToDesktop !== !1)
            gatewayLog(
              "info",
              `managed policy ${ot.index} withheld from a Claude Desktop session for sub=${jt.sub}: it has no \`code\` settings request_id=${bt}`,
            );
          return new Response("not served to Claude Desktop sessions", ht);
        }
        payload = ot.policy.desktopSessionPayload;
      }
      let Pt = `"${payload.checksum}"`,
        Yt = _e.headers.get("if-none-match");
      if (Yt === "*" && zd(ot.policy))
        return (
          gatewayLog(
            "info",
            `Claude Desktop's Code tab doesn't start for sub=${jt.sub}: managed policy ${ot.index} has \`code\` settings, and Claude Code on that machine doesn't take this gateway's settings. To let the Code tab start, name this gateway in forceLoginGatewayUrl in that machine's Claude Code managed settings, and make sure the machine resolves the gateway's hostname itself and reaches it over HTTPS on a private network. request_id=${bt}`,
          ),
          new Response(null, { status: 304, headers: { ...Ie, ...Is } })
        );
      if (Yt === Pt) return new Response(null, { status: 304, headers: Ie });
      return (
        Vt("managed.serve", {
          sub: jt.sub,
          email: jt.email,
          policy_index: ot.index,
          ...(ot.indexes && { policy_indexes: ot.indexes }),
          checksum: payload.checksum,
        }),
        Response.json(payload, { headers: { ETag: Pt, ...Ie } })
      );
    }
    if (pathname_2 === "/api/oauth/usage" && _e.method === "GET") {
      if (!X) return new Response("not configured", { status: 404, headers: Is });
      return X.usage(jt, bt);
    }
    if (pathname_2 === "/user/bootstrap" && _e.method === "GET") {
      if (!Kr || !qd)
        return (
          Vt("desktop_bootstrap.denied", { reason: "not_configured", sub: jt.sub, email: jt.email }),
          jsonErrorResponse(
            404,
            "not_found_error",
            'Claude Desktop is not configured on this gateway \u2014 add a "desktop:" block to a managed policy',
            bt,
            Is,
          )
        );
      let Ie = matchPolicy(Kr, jt);
      if (!Ie || Ie.policy.desktop === void 0)
        return (
          gatewayLog(
            "warn",
            `no desktop-enabled managed policy matched for sub=${jt.sub} (groups: ${(jt.groups ?? []).join(",") || "none"}) request_id=${bt}`,
          ),
          Vt("desktop_bootstrap.denied", {
            reason: Ie ? "policy_not_opted_in" : "no_policy_matched",
            sub: jt.sub,
            email: jt.email,
          }),
          jsonErrorResponse(
            404,
            "not_found_error",
            Ie
              ? 'the policy matching this user does not opt into desktop \u2014 add a "desktop:" block to it'
              : "no policy matched",
            bt,
            Is,
          )
        );
      let ht = buildClientBootstrapConfig(
          { ...n, upstreams: filtered, models: filtered_3 },
          Ie.policy,
          jt,
          Hi,
        ),
        ot = isAdminGroupMember(jt.groups, n.admin);
      return (
        Vt("desktop_bootstrap.serve", {
          sub: jt.sub,
          email: jt.email,
          policy_index: Ie.index,
          ...(Ie.indexes && { policy_indexes: Ie.indexes }),
        }),
        Response.json(ht, { headers: { ...Is, "x-gateway-spend-admin": String(ot) } })
      );
    }
    if (pathname_2 in Q0 && _e.method === "POST") {
      let Ie = Q0[pathname_2],
        filtered = n.telemetry.forward_to.filter((Yt) => Yt[Ie]);
      if (filtered.length === 0) return new Response(null, { status: 200 });
      let arrayBuffer = await _e.arrayBuffer(),
        Gt = _e.headers.get("content-type") ?? "application/x-protobuf",
        Pt = _e.headers.get("content-encoding");
      return (S.fanout(pathname_2, arrayBuffer, Gt, Pt, filtered), new Response(null, { status: 200 }));
    }
    let lO = ur !== null ? void 0 : Kr ? matchPolicy(Kr, jt)?.policy : void 0;
    if (pathname_2 === "/v1/models" && _e.method === "GET")
      return modelsResponse(filtered_3, filtered_2, n.auto_include_builtin_models, lO);
    if (p_(pathname_2) && _e.method === "POST") {
      let Ie = { sub: jt.sub, email: jt.email },
        ht = n.load_test_mode?.enabled && ur === null ? _e.headers.get("x-load-test-user") : null;
      if (ht !== null) {
        if (!/^\d{1,7}$/.test(ht))
          return (
            Vt("inference", {
              sub: jt.sub,
              email: jt.email,
              path: pathname_2,
              model: null,
              upstream: null,
              upstream_request_id: null,
              upstream_cloud_request_id: null,
              load_test: !0,
              status: 400,
              ms: 0,
            }),
            jsonErrorResponse(
              400,
              "invalid_request_error",
              "x-load-test-user must be a whole number of at most 7 digits",
              bt,
            )
          );
      }
      let ot = ht === null ? jt : { ...jt, sub: `${jt.sub}+loadtest-${Number(ht)}` },
        Gt = {},
        Pt = null;
      if (X && pathname_2 === "/v1/messages" && ur === null) {
        let precheck = await X.precheck(ot, bt);
        if (precheck.blocked) return precheck.blocked;
        ((Gt = precheck.headers), (Pt = precheck.payingGroup));
      }
      let startTime = performance.now(),
        Zn = () => {
          Vt("inference", {
            sub: ot.sub,
            email: ot.email,
            path: pathname_2,
            model: null,
            upstream: null,
            upstream_request_id: null,
            upstream_cloud_request_id: null,
            ...q1(ur, null),
            ...(n.load_test_mode?.enabled && { load_test: !0 }),
            status: 400,
            ms: Math.round(performance.now() - startTime),
          });
        },
        arrayBuffer = await _e.arrayBuffer();
      if (pathname_2 === "/v1/messages") F?.bodyRead(arrayBuffer.byteLength, ot.sub);
      let Or;
      try {
        Or = jsonParse(Buffer.from(arrayBuffer).toString("utf8"));
      } catch {
        return (Zn(), jsonErrorResponse(400, "invalid_request_error", "invalid JSON", bt));
      }
      if (typeof Or !== "object" || Or === null || Array.isArray(Or))
        return (
          Zn(),
          jsonErrorResponse(400, "invalid_request_error", "request body must be a JSON object", bt)
        );
      let oi = { buf: arrayBuffer, parsed: Or };
      if (Ne || ur !== null) {
        let dr;
        try {
          dr = new TextEncoder().encode(jsonStringify(oi.parsed));
        } catch {
          return (
            Zn(),
            jsonErrorResponse(400, "invalid_request_error", "request body cannot be re-serialized", bt)
          );
        }
        oi.buf = dr.slice().buffer;
      }
      if (Ne) {
        let dr = f_(_e),
          precheck = await Ne.precheck(
            jt,
            oi.parsed,
            bt,
            { path: pathname_2, query: dr.search, headers: Object.fromEntries(dr.headers.entries()) },
            ur?.org,
            ur !== null ? (ur.act?.sub ?? null) : void 0,
          );
        if (precheck) return precheck;
      }
      let startTime_2 = performance.now(),
        xi = null,
        Rs;
      if (X && pathname_2 === "/v1/messages" && oi.parsed.stream !== !0 && ur === null)
        ((xi = oi.parsed), (Rs = oi.parsed.speed === "fast" ? "fast" : void 0));
      let Jt = await handleGatewayMessagesRequest(
        _e,
        pathname_2,
        filtered_2,
        filtered_3,
        n.auto_include_builtin_models,
        lO,
        n.timeouts.upstream_ttfb_ms,
        bt,
        {
          body: oi,
          ...(ur !== null && { criPrincipal: !0 }),
          ...(ur === null && { user: Ie }),
          ttfbOnSdkLegs: n.timeouts.operator_set,
        },
      );
      if (ur !== null) Jt = await finalizeUpstreamResponse(Jt, _e, bt);
      let Sr = Jt.headers.get("x-gateway-model"),
        si = Jt.headers.get("x-gateway-upstream"),
        rf = Jt.headers.get("x-gateway-upstream-model"),
        of = Jt.headers.get("x-gateway-upstream-kind"),
        sf = Jt.headers.get("x-gateway-upstream-request-id")?.match(tO)?.[0] ?? null,
        af = Jt.headers.get("x-gateway-upstream-cloud-request-id")?.match(tO)?.[0] ?? null;
      Vt("inference", {
        sub: ot.sub,
        email: ot.email,
        path: pathname_2,
        model: Sr,
        upstream: si,
        upstream_request_id: sf,
        upstream_cloud_request_id: af,
        ...q1(ur, of),
        ...(n.load_test_mode?.enabled && { load_test: !0 }),
        status: Jt.status,
        ms: Math.round(performance.now() - startTime_2),
      });
      for (let dr of GATEWAY_DIAGNOSTIC_HEADERS) Jt.headers.delete(dr);
      if ((Jt.headers.delete("x-cri-upstream-kind"), ur !== null)) {
        if (of !== null) Jt.headers.set("x-cri-upstream-kind", "cloud");
      }
      if (Jt.ok) {
        for (let [dr, lf] of Object.entries(Gt)) Jt.headers.set(dr, lf);
        Jt.headers.set("request-id", bt);
      }
      if (Jt.status >= 500) gatewayLog("warn", `upstream ${Jt.status} on ${pathname_2} request_id=${bt}`);
      if (X && pathname_2 === "/v1/messages" && ur === null) {
        let dr = xi;
        return X.meter(
          Jt,
          ot,
          Pt,
          si,
          rf,
          Sr,
          dr
            ? () => countTokensViaUpstreams(dr, filtered_2, filtered_3, n.auto_include_builtin_models, Ie)
            : null,
          Rs,
        );
      }
      return Jt;
    }
    return new Response("not found", { status: 404 });
  }
  http.maxHeaderSize = 262144;
  let serve = Bun.serve({
    hostname: n.listen.host,
    port: n.listen.port,
    idleTimeout: 0,
    development: !1,
    ...(Bi && { tls: Bi }),
    fetch: async (_e, Fe) => {
      M(Fe.pendingRequests);
      let In = Fe.requestIP(_e)?.address,
        bt = _e.headers.get("x-forwarded-for"),
        { clientIp: clientIp, badHop: badHop } = resolveClientIp(In, bt, o),
        Ts = !!bt && In !== void 0 && !Nu(In, o),
        ji = _e.headers.get(X_CLIENT_REQUEST_ID),
        zr = ji && tO.test(ji) ? ji : randomUUID(),
        Bs;
      try {
        Bs = await X1(_e, clientIp, badHop, zr, Ts);
      } catch (error) {
        (gatewayLog("error", `unhandled request_id=${zr}: ${errorMessage(error)}`),
          (Bs = jsonErrorResponse(500, "api_error", "internal server error", zr)));
      }
      return (Bs.headers.set(X_REQUEST_ID, zr), withSecurityHeaders(Bs, !!Bi));
    },
    error: (_e) => (
      gatewayLog("error", `unhandled: ${errorMessage(_e)}`),
      withSecurityHeaders(jsonErrorResponse(500, "api_error", "internal server error"), !!Bi)
    ),
  });
  printGatewayBanner(n, {
    tls: !!Bi,
    hostname: serve.hostname ?? n.listen.host,
    port: serve.port ?? n.listen.port,
    managed: !!Kr,
    outboundLimit: j,
  });
  for (let _e of collectGatewayConfigWarnings(n, Kr)) gatewayLog("warn", _e);
  return (
    warnIfMetadataReachable(),
    {
      port: serve.port ?? n.listen.port,
      stop: () => {
        (serve.stop(!0), N.close(), F?.close());
      },
      drain: async (_e) => {
        let stop = serve.stop(!1);
        await Promise.race([stop, sleep(_e)]);
        let pendingRequests = serve.pendingRequests;
        return (await serve.stop(!0), await X?.flush(), N.close(), F?.close(), pendingRequests);
      },
    }
  );
}
