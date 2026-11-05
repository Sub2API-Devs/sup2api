/**
 * services/oauth/gatewayLogin/GatewayLogin.tsx
 *
 * 2.1.316 新增：网关设备码登录流程
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qj0cbf1s.js (8)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-qj0cbf1s.js:690-2132 placement
/**
 * 登录未完成的说明。
 */
var GATEWAY_LOGIN_CONSTANTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLAUDE_CODE;
var TLS_TRUST_ERRORS;
var MAX_CERT_TEXT_CHARS;
var SIGNIN_TIMEOUT_MESSAGE;
var NO_GATEWAY_URL_MESSAGE;
var FIRST_TRUST_MESSAGE;
var CERT_ROTATED_MESSAGE;
var FINGERPRINT_LABEL;
var TRUST_ACCEPT_LABEL;
var TRUST_DECLINE_LABEL;
var TRUST_REJECTED_MESSAGE;
var PIN_MISMATCH_MESSAGE;
var LOGIN_FAILED_MESSAGE;
var LOGIN_INCOMPLETE_MESSAGE;
deferInit("chunk-qj0cbf1s.js:690", () => {
  GATEWAY_LOGIN_CONSTANTS = "urn:ietf:params:oauth:grant-type:device_code";
  CLAUDE_CODE = "claude_code";
  TLS_TRUST_ERRORS = new Set([
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "CERT_UNTRUSTED",
  ]);
  MAX_CERT_TEXT_CHARS = 254;
  SIGNIN_TIMEOUT_MESSAGE = "Sign-in timed out while waiting for you to continue. Try again.";
  NO_GATEWAY_URL_MESSAGE =
    "Gateway login is required by your organization's policy, but no gateway URL is configured. Contact your IT administrator.";
  FIRST_TRUST_MESSAGE =
    "You haven't connected to this gateway before. Once trusted, it can push settings to this machine that execute commands and change your environment. Only continue if this is your organization's gateway.";
  CERT_ROTATED_MESSAGE =
    "The TLS certificate for this gateway has changed since you last connected. Only continue if your administrator has confirmed a certificate rotation.";
  FINGERPRINT_LABEL = "Certificate fingerprint (SHA-256):";
  TRUST_ACCEPT_LABEL = "Yes, trust this gateway";
  TRUST_DECLINE_LABEL =
    "A browser window should have opened. After signing in with your identity provider, confirm this code on the verification page:";
  TRUST_REJECTED_MESSAGE = "Browser didn't open? Visit:";
  PIN_MISMATCH_MESSAGE =
    "Continue only if this is your account; that organization's settings will then apply to this machine. Otherwise go back: nothing is saved, and you can sign in again.";
  LOGIN_FAILED_MESSAGE = "Yes, continue";
  LOGIN_INCOMPLETE_MESSAGE =
    "The gateway's TLS certificate changed during sign-in: it no longer matches the one you trusted. Aborting without storing credentials; start the sign-in again to review the new certificate.";
});
//@ chunk-qj0cbf1s.js:2132-2542 placement
function credentialsFileErrorText(error) {
  let message = errorMessage(error);
  if (message.includes(PIN_STORE_SYMLINK_MESSAGE))
    return "Claude Code's credentials file (where a gateway's TLS pin is kept) is a symlink, which it does not follow. Replace the link with the file itself and try again.";
  if (message.includes(PIN_STORE_UNREADABLE_MESSAGE))
    return "Claude Code's credentials file (where a gateway's TLS pin is kept) could not be read. Try again; if it keeps failing, check the file.";
  if (pinMismatchFromError(error) !== undefined) return LOGIN_INCOMPLETE_MESSAGE;
  return message;
}
//@ chunk-qj0cbf1s.js:2542-2711 placement
function oauthErrorDescription(error) {
  let body = error?.response?.data;
  if (typeof body !== "object" || body === null) return;
  let errorDescription = body.error_description;
  if (typeof errorDescription !== "string") return;
  return truncateToLength(printableText(errorDescription), 300).trim() || undefined;
}
//@ chunk-qj0cbf1s.js:2711-3452 placement
function tlsErrorHint(error) {
  let errnoCode = getErrnoCode(error) ?? getErrnoCode(error?.cause);
  let message = errorMessage(error);
  if (!(
    (errnoCode !== undefined && TLS_TRUST_ERRORS.has(errnoCode)) ||
    /self[- ]?signed certificate|unable to (verify the first|get (local )?issuer) certificate|certificate not trusted/i.test(
      message,
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
//@ chunk-qj0cbf1s.js:3452-3597 placement
var GATEWAY_DISCOVERY_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qj0cbf1s.js:3452", () => {
  GATEWAY_DISCOVERY_SCHEMA = DoctorLazy(() =>
    create({
      device_authorization_endpoint: create_2().optional(),
      token_endpoint: create_2().optional(),
      revocation_endpoint: create_2().nullish().catch(undefined),
    }),
  );
});
//@ chunk-qj0cbf1s.js:3597-3761 placement
function sameOriginEndpoint(baseUrl, advertised, pathSuffix) {
  let advertisedSameOrigin = sameOriginUrl(baseUrl, advertised);
  if (advertisedSameOrigin) return advertisedSameOrigin;
  if (advertised)
    logForDebugging(
      `[gateway-login] ignoring advertised endpoint ${advertised} (not same-origin with ${baseUrl}); using ${pathSuffix}`,
    );
  return `${baseUrl}${pathSuffix}`;
}
//@ chunk-qj0cbf1s.js:3761-3917 placement
var DEVICE_AUTHORIZATION_SCHEMA; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qj0cbf1s.js:3761", () => {
  DEVICE_AUTHORIZATION_SCHEMA = DoctorLazy(() =>
    create({
      device_code: create_2(),
      user_code: create_2(),
      verification_uri: create_2(),
      verification_uri_complete: create_2().optional(),
      expires_in: create_3(),
      interval: create_3().optional(),
    }),
  );
});
//@ chunk-qj0cbf1s.js:3917-9821 placement
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
  moveTo(state) {
    this.store.setState(() => state);
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
  async connect(input) {
    if (this.store.getState().state !== "url_input") return;
    let generation = ++this.generation;
    this.moveTo({
      state: "connecting",
    });
    try {
      let url = normalizeGatewayUrl(input.url);
      let gatewayTrustBasis = await resolveGatewayTrustBasis(url, input.internalNetworks, input.namedBy);
      if (generation !== this.generation) return;
      this.vouchedAtLogin = gatewayTrustBasis.basis === "vouched";
      let network = gatewayTrustBasis.basis === "network" ? gatewayTrustBasis.network : undefined;
      let entry = gatewayTrustBasis.basis === "allowlisted" ? gatewayTrustBasis.entry : undefined;
      let certificate =
        gatewayTrustBasis.basis === "allowlisted"
          ? gatewayTrustBasis.judged
          : network
            ? await fetchGatewayCertificate(url, 1e4, network)
            : undefined;
      if (generation !== this.generation) return;
      let discoveryResponse = await externalHttp.get(`${url}/.well-known/oauth-authorization-server`, {
        headers: {
          "User-Agent": claudeCodeUserAgent(),
        },
        timeout: 1e4,
        ...(gatewayTrustBasis.basis === "allowlisted" && {
          httpsAgent: pinnedAgentFor(gatewayTrustBasis.judged.fingerprint, url, true),
          maxRedirects: 0,
        }),
      });
      if (generation !== this.generation) return;
      let parsedDiscovery = GATEWAY_DISCOVERY_SCHEMA().safeParse(discoveryResponse.data);
      let discovery = parsedDiscovery.success ? parsedDiscovery.data : undefined;
      let revocationUrl = sameOriginUrl(url, discovery?.revocation_endpoint);
      if (discovery?.revocation_endpoint && !revocationUrl)
        logForDebugging(
          `[gateway-login] ignoring advertised revocation endpoint ${discovery.revocation_endpoint} (not same-origin with ${url}); sign-out will not revoke`,
        );
      let endpoints = {
        deviceAuthorizationEndpoint: sameOriginEndpoint(
          url,
          discovery?.device_authorization_endpoint,
          "/oauth/device_authorization",
        ),
        tokenEndpoint: sameOriginEndpoint(url, discovery?.token_endpoint, "/oauth/token"),
        ...(revocationUrl && {
          revocationEndpoint: revocationUrl,
        }),
      };
      let { hostname, fingerprint, localAddress, remoteAddress } =
        certificate ?? (await fetchGatewayCertificate(url));
      if (generation !== this.generation) return;
      let gatewayTrust = await readGatewayTrust(hostname, this.credentials);
      if (generation !== this.generation) return;
      if (gatewayTrust === fingerprint) await this.startDeviceAuth(url, endpoints, fingerprint, entry);
      else
        this.moveTo({
          state: "trust_prompt",
          url,
          hostname,
          fingerprint,
          previouslyPinned: gatewayTrust,
          endpoints,
          allowlistEntry: entry,
          ...(network && {
            route: `from ${localAddress} to ${remoteAddress}, both inside declared ${network}`,
          }),
        });
    } catch (error) {
      if (generation !== this.generation) return;
      let hint = tlsErrorHint(error);
      this.moveTo(
        hint
          ? {
              state: "error",
              message: hint,
              detail: errorMessage(error),
            }
          : {
              state: "error",
              message: credentialsFileErrorText(error),
            },
      );
    }
  }
  async startDeviceAuth(url, endpoints, fingerprint, allowlistEntry) {
    let generation = ++this.generation;
    this.moveTo({
      state: "connecting",
    });
    try {
      let agent = pinnedAgentFor(fingerprint, endpoints.deviceAuthorizationEndpoint);
      let { data: body } = await externalHttp.post(
        endpoints.deviceAuthorizationEndpoint,
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
          ...(agent && {
            httpsAgent: agent,
          }),
        },
      );
      if (generation !== this.generation) return;
      let parsed = DEVICE_AUTHORIZATION_SCHEMA().safeParse(body);
      if (!parsed.success) throw Error("gateway device authorization endpoint returned malformed response");
      let deviceAuth = parsed.data;
      let browserUrl = deviceAuth.verification_uri_complete ?? deviceAuth.verification_uri;
      this.openPage(browserUrl);
      this.moveTo({
        state: "polling",
        url,
        userCode: deviceAuth.user_code,
        verificationUri: deviceAuth.verification_uri,
        browserUrl,
      });
      await this.pollForToken(
        url,
        endpoints,
        deviceAuth.device_code,
        deviceAuth.interval ?? 5,
        generation,
        fingerprint,
        allowlistEntry,
      );
    } catch (error) {
      if (generation !== this.generation) return;
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
  async pollForToken(url, endpoints, deviceCode, intervalSeconds, generation, fingerprint, allowlistEntry) {
    let { tokenEndpoint } = endpoints;
    let max = Math.max(1, intervalSeconds);
    while (generation === this.generation) {
      await sleep(max * 1000);
      if (generation !== this.generation) return;
      try {
        let agent = pinnedAgentFor(fingerprint, tokenEndpoint);
        let { data: body } = await externalHttp.post(
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
            ...(agent && {
              httpsAgent: agent,
            }),
          },
        );
        if (generation !== this.generation) return;
        let parsed = gatewayTokenResponseSchema().safeParse(body);
        if (!parsed.success) throw Error("gateway token endpoint returned malformed response");
        await this.finishLogin(url, endpoints, parsed.data, generation, allowlistEntry);
        return;
      } catch (error) {
        if (generation !== this.generation) return;
        let errorCode = oauthErrorCode(error);
        if (errorCode === "authorization_pending") continue;
        if (errorCode === "slow_down") {
          max += 5;
          continue;
        }
        if (errorCode === "expired_token") {
          this.moveTo({
            state: "error",
            message: "Sign-in timed out before the browser flow completed. Try again.",
          });
          return;
        }
        if (errorCode === "access_denied") {
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
  async finishLogin(url, endpoints, tokens, generation, allowlistEntry) {
    let email = tokens.email ?? "";
    let clippedEmail = truncateToLength(email, 16 * MAX_CERT_TEXT_CHARS);
    let shownEmail = cleanForDisplay(clippedEmail);
    let shownEmailText =
      clippedEmail.length < email.length || shownEmail.length > MAX_CERT_TEXT_CHARS
        ? `${truncateToLength(shownEmail, MAX_CERT_TEXT_CHARS)}\u2026`
        : shownEmail;
    let auth = {
      url,
      jwt: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      tokenEndpoint: endpoints.tokenEndpoint,
      ...(endpoints.revocationEndpoint && {
        revocationEndpoint: endpoints.revocationEndpoint,
      }),
      ...(tokens.refresh_token && {
        idpRefreshToken: tokens.refresh_token,
      }),
      ...(shownEmailText && {
        email: shownEmailText,
      }),
      vouchedAtLogin: this.vouchedAtLogin,
    };
    let { hostname, fingerprint } = await fetchGatewayCertificate(url);
    if (generation !== this.generation) return;
    let gatewayTrust = await readGatewayTrust(hostname, this.credentials);
    if (generation !== this.generation) return;
    if (gatewayTrust !== fingerprint) {
      this.moveTo({
        state: "error",
        message: LOGIN_INCOMPLETE_MESSAGE,
      });
      return;
    }
    if (shownEmailText) {
      this.moveTo({
        state: "confirm_account",
        auth,
        allowlistEntry,
        email: shownEmailText,
      });
      return;
    }
    await this.completeLogin(auth, allowlistEntry, generation);
  }
  async completeLogin(auth, allowlistEntry, generation) {
    this.moveTo({
      state: "saving",
      email: auth.email,
    });
    let gatewayAuth = getGatewayAuth();
    let saveOutcome = await saveGatewayCredential(auth, this.credentials, allowlistEntry);
    if (saveOutcome.outcome !== "saved" || generation !== this.generation) {
      await replaceGatewayCredential(auth, gatewayAuth, this.credentials, saveOutcome);
      this.revoking = revokeUndoneSignIn(auth, gatewayAuth, this.credentials, saveOutcome);
      if (saveOutcome.outcome !== "saved" && generation === this.generation) {
        logForDebugging(`[gateway-login] secureStorage write failed: ${saveOutcome.message}`, {
          level: "error",
        });
        this.moveTo({
          state: "error",
          message: saveOutcome.message,
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
      email: auth.email,
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
