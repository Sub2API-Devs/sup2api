/**
 * services/oauth/gatewayLogin/GatewayLogin.tsx
 *
 * 2.1.316 新增：网关设备码登录流程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5v6dfhf4.js (8)
 * attribution: placement 8
 */
import { errorMessage, getErrnoCode } from "../../../utils/errors.js";
import {
  PIN_STORE_SYMLINK_MESSAGE,
  PIN_STORE_UNREADABLE_MESSAGE,
  pinMismatchFromError,
  saveGatewayTlsPin,
  fetchGatewayCertificate,
  pinnedAgentFor,
  readGatewayTrust,
} from "../../gateway/vouching.js";
import { truncateToLength, printableText, cleanForDisplay } from "../../../utils/stringUtils.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create, create_2, create_3 } from "../../../../vendor/zod/lib/index.mjs";
import {
  sameOriginUrl,
  oauthErrorCode,
  gatewayTokenResponseSchema,
  replaceGatewayCredential,
  revokeUndoneSignIn,
} from "../../gateway/gatewayAuth.js";
import { logForDebugging } from "../../../utils/debug.js";
import { createStore } from "../../../state/store.js";
import { normalizeGatewayUrl } from "../../gateway/hostCheck.js";
import { resolveGatewayTrustBasis } from "../../gateway/internalNetworks.js";
import { externalHttp } from "../../http/externalHttp.js";
import { claudeCodeUserAgent } from "../../../utils/http.js";
import { sleep } from "../../../utils/sleep.js";
import { getGatewayAuth } from "../../../bootstrap/state.js";
import { saveGatewayCredential } from "../../gateway/gatewayCredentialStore.js";
import { logAuthEvent } from "../../../utils/telemetry/thirdPartyEventRecords.js";

//@ chunk-5v6dfhf4.js:691-2133 placement
/**
 * 登录未完成的说明。
 */
var GATEWAY_LOGIN_CONSTANTS = "urn:ietf:params:oauth:grant-type:device_code";
var CLAUDE_CODE = "claude_code";
var TLS_TRUST_ERRORS = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "CERT_UNTRUSTED",
]);
var MAX_CERT_TEXT_CHARS = 254;
var SIGNIN_TIMEOUT_MESSAGE = "Sign-in timed out while waiting for you to continue. Try again.";
var NO_GATEWAY_URL_MESSAGE =
  "Gateway login is required by your organization's policy, but no gateway URL is configured. Contact your IT administrator.";
var FIRST_TRUST_MESSAGE =
  "You haven't connected to this gateway before. Once trusted, it can push settings to this machine that execute commands and change your environment. Only continue if this is your organization's gateway.";
var CERT_ROTATED_MESSAGE =
  "The TLS certificate for this gateway has changed since you last connected. Only continue if your administrator has confirmed a certificate rotation.";
var FINGERPRINT_LABEL = "Certificate fingerprint (SHA-256):";
var TRUST_ACCEPT_LABEL = "Yes, trust this gateway";
var TRUST_DECLINE_LABEL =
  "A browser window should have opened. After signing in with your identity provider, confirm this code on the verification page:";
var TRUST_REJECTED_MESSAGE = "Browser didn't open? Visit:";
var PIN_MISMATCH_MESSAGE =
  "Continue only if this is your account; that organization's settings will then apply to this machine. Otherwise go back: nothing is saved, and you can sign in again.";
var LOGIN_FAILED_MESSAGE = "Yes, continue";
var LOGIN_INCOMPLETE_MESSAGE =
  "The gateway's TLS certificate changed during sign-in: it no longer matches the one you trusted. Aborting without storing credentials; start the sign-in again to review the new certificate.";
//@ chunk-5v6dfhf4.js:2133-2543 placement
function credentialsFileErrorText(error) {
  let i = errorMessage(error);
  if (i.includes(PIN_STORE_SYMLINK_MESSAGE))
    return "Claude Code's credentials file (where a gateway's TLS pin is kept) is a symlink, which it does not follow. Replace the link with the file itself and try again.";
  if (i.includes(PIN_STORE_UNREADABLE_MESSAGE))
    return "Claude Code's credentials file (where a gateway's TLS pin is kept) could not be read. Try again; if it keeps failing, check the file.";
  if (pinMismatchFromError(error) !== undefined) return LOGIN_INCOMPLETE_MESSAGE;
  return i;
}
//@ chunk-5v6dfhf4.js:2543-2713 placement
function oauthErrorDescription(error) {
  let i = error?.response?.data;
  if (typeof i !== "object" || i === null) return;
  let errorDescription = i.error_description;
  if (typeof errorDescription !== "string") return;
  return truncateToLength(printableText(errorDescription), 300).trim() || undefined;
}
//@ chunk-5v6dfhf4.js:2713-3454 placement
function tlsErrorHint(error) {
  let i = getErrnoCode(error) ?? getErrnoCode(error?.cause);
  let n = errorMessage(error);
  if (!(
    (i !== undefined && TLS_TRUST_ERRORS.has(i)) ||
    /self[- ]?signed certificate|unable to (verify the first|get (local )?issuer) certificate|certificate not trusted/i.test(
      n,
    )
  ))
    return null;
  return (
    "Could not verify the gateway's TLS certificate. If your gateway uses a private CA or self-signed certificate: Claude Code reads your OS trust " +
    "store by default on the native binary and Node \u226522.15, so if the CA is " +
    "already installed there, upgrade to a current runtime. Otherwise set " +
    "NODE_EXTRA_CA_CERTS to the CA certificate PEM file before starting \u2014 " +
    "e.g. `export NODE_EXTRA_CA_CERTS=/path/to/ca.pem` \u2014 or add it under " +
    "`env.NODE_EXTRA_CA_CERTS` in your user settings (~/.claude/settings.json)."
  );
}
//@ chunk-5v6dfhf4.js:3454-3599 placement
var GATEWAY_DISCOVERY_SCHEMA = DoctorLazy(() =>
  create({
    device_authorization_endpoint: create_2().optional(),
    token_endpoint: create_2().optional(),
    revocation_endpoint: create_2().nullish().catch(undefined),
  }),
);
//@ chunk-5v6dfhf4.js:3599-3763 placement
function sameOriginEndpoint(e, i, n) {
  let r = sameOriginUrl(e, i);
  if (r) return r;
  if (i)
    logForDebugging(
      `[gateway-login] ignoring advertised endpoint ${i} (not same-origin with ${e}); using ${n}`,
    );
  return `${e}${n}`;
}
//@ chunk-5v6dfhf4.js:3763-3919 placement
var DEVICE_AUTHORIZATION_SCHEMA = DoctorLazy(() =>
  create({
    device_code: create_2(),
    user_code: create_2(),
    verification_uri: create_2(),
    verification_uri_complete: create_2().optional(),
    expires_in: create_3(),
    interval: create_3().optional(),
  }),
);
//@ chunk-5v6dfhf4.js:3919-9825 placement
/**
 * 网关登录流程状态机：输入地址、设备码授权、轮询令牌、保存凭证。
 */
class GatewayLoginFlow {
  credentials;
  openPage;
  store = createStore({
    state: "url_input",
  });
  status = this.store;
  generation = 0;
  vouchedAtLogin = false;
  revoking = Promise.resolve();
  constructor(credentials, openPage) {
    this.credentials = credentials;
    this.openPage = openPage;
  }
  moveTo(e) {
    this.store.setState(() => e);
  }
  restart() {
    let { state } = this.store.getState();
    if (state === "saving" || state === "done" || state === "cancelled") return;
    this.generation += 1;
    this.moveTo({
      state: "url_input",
    });
  }
  cancel() {
    if (this.store.getState().state === "done") return;
    this.generation += 1;
    this.moveTo({
      state: "cancelled",
    });
  }
  trust() {
    let state = this.store.getState();
    if (state.state !== "trust_prompt") return;
    let generation = this.generation;
    saveGatewayTlsPin(state.hostname, state.fingerprint, this.credentials)
      .then(() => {
        if (generation !== this.generation) return;
        return this.startDeviceAuth(state.url, state.endpoints, state.fingerprint, state.allowlistEntry);
      })
      .catch((error) => {
        if (generation !== this.generation) return;
        this.moveTo({
          state: "error",
          message: errorMessage(error),
        });
      });
  }
  confirmAccount() {
    let state = this.store.getState();
    if (state.state !== "confirm_account") return;
    if (state.auth.expiresAt <= Date.now() && !state.auth.idpRefreshToken) {
      this.moveTo({
        state: "error",
        message: SIGNIN_TIMEOUT_MESSAGE,
      });
      return;
    }
    this.completeLogin(state.auth, state.allowlistEntry, this.generation);
  }
  async connect(e) {
    if (this.store.getState().state !== "url_input") return;
    let i = ++this.generation;
    this.moveTo({
      state: "connecting",
    });
    try {
      let n = normalizeGatewayUrl(e.url);
      let gatewayTrustBasis = await resolveGatewayTrustBasis(n, e.internalNetworks, e.namedBy);
      if (i !== this.generation) return;
      this.vouchedAtLogin = gatewayTrustBasis.basis === "vouched";
      let network = gatewayTrustBasis.basis === "network" ? gatewayTrustBasis.network : undefined;
      let entry = gatewayTrustBasis.basis === "allowlisted" ? gatewayTrustBasis.entry : undefined;
      let l =
        gatewayTrustBasis.basis === "allowlisted"
          ? gatewayTrustBasis.judged
          : network
            ? await fetchGatewayCertificate(n, 1e4, network)
            : undefined;
      if (i !== this.generation) return;
      let g = await externalHttp.get(`${n}/.well-known/oauth-authorization-server`, {
        headers: {
          "User-Agent": claudeCodeUserAgent(),
        },
        timeout: 1e4,
        ...(gatewayTrustBasis.basis === "allowlisted" && {
          httpsAgent: pinnedAgentFor(gatewayTrustBasis.judged.fingerprint, n, true),
          maxRedirects: 0,
        }),
      });
      if (i !== this.generation) return;
      let s = GATEWAY_DISCOVERY_SCHEMA().safeParse(g.data);
      let a = s.success ? s.data : undefined;
      let u = sameOriginUrl(n, a?.revocation_endpoint);
      if (a?.revocation_endpoint && !u)
        logForDebugging(
          `[gateway-login] ignoring advertised revocation endpoint ${a.revocation_endpoint} (not same-origin with ${n}); sign-out will not revoke`,
        );
      let h = {
        deviceAuthorizationEndpoint: sameOriginEndpoint(
          n,
          a?.device_authorization_endpoint,
          "/oauth/device_authorization",
        ),
        tokenEndpoint: sameOriginEndpoint(n, a?.token_endpoint, "/oauth/token"),
        ...(u && {
          revocationEndpoint: u,
        }),
      };
      let { hostname, fingerprint, localAddress, remoteAddress } = l ?? (await fetchGatewayCertificate(n));
      if (i !== this.generation) return;
      let gatewayTrust = await readGatewayTrust(hostname, this.credentials);
      if (i !== this.generation) return;
      if (gatewayTrust === fingerprint) await this.startDeviceAuth(n, h, fingerprint, entry);
      else
        this.moveTo({
          state: "trust_prompt",
          url: n,
          hostname,
          fingerprint,
          previouslyPinned: gatewayTrust,
          endpoints: h,
          allowlistEntry: entry,
          ...(network && {
            route: `from ${localAddress} to ${remoteAddress}, both inside declared ${network}`,
          }),
        });
    } catch (error) {
      if (i !== this.generation) return;
      let r = tlsErrorHint(error);
      this.moveTo(
        r
          ? {
              state: "error",
              message: r,
              detail: errorMessage(error),
            }
          : {
              state: "error",
              message: credentialsFileErrorText(error),
            },
      );
    }
  }
  async startDeviceAuth(e, i, n, r) {
    let o = ++this.generation;
    this.moveTo({
      state: "connecting",
    });
    try {
      let c = pinnedAgentFor(n, i.deviceAuthorizationEndpoint);
      let { data: l } = await externalHttp.post(
        i.deviceAuthorizationEndpoint,
        new URLSearchParams({
          surface: CLAUDE_CODE,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": claudeCodeUserAgent(),
          },
          timeout: 1e4,
          maxRedirects: 0,
          ...(c && {
            httpsAgent: c,
          }),
        },
      );
      if (o !== this.generation) return;
      let g = DEVICE_AUTHORIZATION_SCHEMA().safeParse(l);
      if (!g.success) throw Error("gateway device authorization endpoint returned malformed response");
      let s = g.data;
      let a = s.verification_uri_complete ?? s.verification_uri;
      this.openPage(a);
      this.moveTo({
        state: "polling",
        url: e,
        userCode: s.user_code,
        verificationUri: s.verification_uri,
        browserUrl: a,
      });
      await this.pollForToken(e, i, s.device_code, s.interval ?? 5, o, n, r);
    } catch (error) {
      if (o !== this.generation) return;
      if (oauthErrorCode(error) === "slow_down") {
        this.moveTo({
          state: "error",
          message: "The gateway is limiting sign-in attempts right now. Wait a few minutes and try again.",
          detail: oauthErrorDescription(error),
        });
        return;
      }
      this.moveTo({
        state: "error",
        message: credentialsFileErrorText(error),
      });
    }
  }
  async pollForToken(e, i, deviceCode, r, o, c, l) {
    let { tokenEndpoint } = i;
    let max = Math.max(1, r);
    while (o === this.generation) {
      await sleep(max * 1000);
      if (o !== this.generation) return;
      try {
        let a = pinnedAgentFor(c, tokenEndpoint);
        let { data: u } = await externalHttp.post(
          tokenEndpoint,
          new URLSearchParams({
            grant_type: GATEWAY_LOGIN_CONSTANTS,
            device_code: deviceCode,
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": claudeCodeUserAgent(),
            },
            timeout: 1e4,
            maxRedirects: 0,
            ...(a && {
              httpsAgent: a,
            }),
          },
        );
        if (o !== this.generation) return;
        let h = gatewayTokenResponseSchema().safeParse(u);
        if (!h.success) throw Error("gateway token endpoint returned malformed response");
        await this.finishLogin(e, i, h.data, o, l);
        return;
      } catch (error) {
        if (o !== this.generation) return;
        let u = oauthErrorCode(error);
        if (u === "authorization_pending") continue;
        if (u === "slow_down") {
          max += 5;
          continue;
        }
        if (u === "expired_token") {
          this.moveTo({
            state: "error",
            message: "Sign-in timed out before the browser flow completed. Try again.",
          });
          return;
        }
        if (u === "access_denied") {
          this.moveTo({
            state: "error",
            message: "Sign-in was denied in the browser.",
          });
          return;
        }
        this.moveTo({
          state: "error",
          message: credentialsFileErrorText(error),
        });
        return;
      }
    }
  }
  async finishLogin(e, i, n, r, o) {
    let email = n.email ?? "";
    let l = truncateToLength(email, 16 * MAX_CERT_TEXT_CHARS);
    let g = cleanForDisplay(l);
    let s =
      l.length < email.length || g.length > MAX_CERT_TEXT_CHARS
        ? `${truncateToLength(g, MAX_CERT_TEXT_CHARS)}\u2026`
        : g;
    let a = {
      url: e,
      jwt: n.access_token,
      expiresAt: Date.now() + n.expires_in * 1000,
      tokenEndpoint: i.tokenEndpoint,
      ...(i.revocationEndpoint && {
        revocationEndpoint: i.revocationEndpoint,
      }),
      ...(n.refresh_token && {
        idpRefreshToken: n.refresh_token,
      }),
      ...(s && {
        email: s,
      }),
      vouchedAtLogin: this.vouchedAtLogin,
    };
    let { hostname, fingerprint } = await fetchGatewayCertificate(e);
    if (r !== this.generation) return;
    let gatewayTrust = await readGatewayTrust(hostname, this.credentials);
    if (r !== this.generation) return;
    if (gatewayTrust !== fingerprint) {
      this.moveTo({
        state: "error",
        message: LOGIN_INCOMPLETE_MESSAGE,
      });
      return;
    }
    if (s) {
      this.moveTo({
        state: "confirm_account",
        auth: a,
        allowlistEntry: o,
        email: s,
      });
      return;
    }
    await this.completeLogin(a, o, r);
  }
  async completeLogin(e, i, n) {
    this.moveTo({
      state: "saving",
      email: e.email,
    });
    let gatewayAuth = getGatewayAuth();
    let o = await saveGatewayCredential(e, this.credentials, i);
    if (o.outcome !== "saved" || n !== this.generation) {
      await replaceGatewayCredential(e, gatewayAuth, this.credentials, o);
      this.revoking = revokeUndoneSignIn(e, gatewayAuth, this.credentials, o);
      if (o.outcome !== "saved" && n === this.generation) {
        logForDebugging(`[gateway-login] secureStorage write failed: ${o.message}`, {
          level: "error",
        });
        this.moveTo({
          state: "error",
          message: o.message,
        });
      }
      return;
    }
    logAuthEvent({
      action: "login",
      success: true,
      authMethod: "oauth",
    });
    this.moveTo({
      state: "done",
      email: e.email,
    });
  }
}
export {
  FINGERPRINT_LABEL,
  CERT_ROTATED_MESSAGE,
  FIRST_TRUST_MESSAGE,
  TRUST_ACCEPT_LABEL,
  PIN_MISMATCH_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  TRUST_DECLINE_LABEL,
  TRUST_REJECTED_MESSAGE,
  GatewayLoginFlow,
  NO_GATEWAY_URL_MESSAGE,
};
