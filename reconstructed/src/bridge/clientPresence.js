/**
 * bridge/clientPresence.ts
 *
 * 2.1.316 新增。向 /v1/code/sessions/:id/client/presence 定时上报客户端在线心跳。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5mabxk9z.js (3)
 * attribution: placement 3
 */
import { randomUUID as Ude } from "crypto";
import { stat } from "fs/promises";
import { env } from "../utils/env.js";
import { isUncOrDevicePath } from "../utils/pathClassification.js";
import { isWslUncPath } from "../utils/networkPaths.js";
import { isENOENT } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { getClientPlatform } from "../utils/http.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { getTerminalFocus, onInteraction, onTerminalFocusChange } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5mabxk9z.js:631-698 placement
var PRESENCE_PULSE_MIN_INTERVAL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var _;
var NOOP_PRESENCE_PULSE;
deferInit("chunk-5mabxk9z.js:631", () => {
  PRESENCE_PULSE_MIN_INTERVAL_MS = 5000;
  _ = Ude();
  NOOP_PRESENCE_PULSE = {
    teardown: () => {},
    pulseIfClientPresent: () => {},
  };
});
//@ chunk-5mabxk9z.js:698-904 placement
async function hasClientPresenceMarker() {
  let CLAUDE_CLIENT_PRESENCE_FILE = env.CLAUDE_CLIENT_PRESENCE_FILE;
  if (!CLAUDE_CLIENT_PRESENCE_FILE) return false;
  if (isUncOrDevicePath(CLAUDE_CLIENT_PRESENCE_FILE) && !isWslUncPath(CLAUDE_CLIENT_PRESENCE_FILE))
    return false;
  try {
    await stat(CLAUDE_CLIENT_PRESENCE_FILE);
    return true;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`[presence] client-presence-marker stat failed: ${error}`);
    return false;
  }
}
//@ chunk-5mabxk9z.js:904-3011 placement
function startClientPresencePulse(
  sessionId,
  baseUrl,
  getAuthHeaders,
  onUnauthorized = () => Promise.resolve(false),
) {
  if (isEssentialTrafficOnly()) return NOOP_PRESENCE_PULSE;
  let config = {
    sessionId,
    baseUrl,
    getAuthHeaders,
    onUnauthorized,
  };
  let logPrefix = `[presence session=${sessionId}]`;
  let connectedAt = null;
  let lastPulseAt = 0;
  let resolved = Promise.resolve();
  let sendPulse = async (kind, body) => {
    let authHeaders = await config.getAuthHeaders();
    if (authHeaders === null) {
      logForDebugging(`${logPrefix} ${kind} skipped (no credential to send under)`);
      return null;
    }
    if (!isFirstPartyProvider()) {
      logForDebugging(`${logPrefix} ${kind} skipped (non-first-party provider)`);
      return null;
    }
    let url = `${config.baseUrl}/v1/code/sessions/${config.sessionId}/client/presence`;
    logForDebugging(`${logPrefix} ${kind} \u2192 ${url}`);
    return axios_default
      .post(
        url,
        {
          client_id: _,
          ...body,
        },
        {
          headers: {
            ...authHeaders,
            "anthropic-version": "2023-06-01",
            "anthropic-client-platform": getClientPlatform(),
          },
          timeout: PRESENCE_PULSE_MIN_INTERVAL_MS,
          validateStatus: () => true,
        },
      )
      .then(
        (response) => {
          if (response.status >= 400) logForDebugging(`${logPrefix} ${kind} got ${response.status}`);
          let authorizationHeader = response.config?.headers?.get?.("Authorization");
          return {
            status: response.status,
            sentHeaders:
              typeof authorizationHeader === "string"
                ? {
                    ...authHeaders,
                    Authorization: authorizationHeader,
                  }
                : lacksAuthorizationHeader(response.config)
                  ? null
                  : authHeaders,
          };
        },
        (error) => {
          logForDebugging(
            `${logPrefix} ${kind} failed: ${axios_default.isAxiosError(error) ? (error.code ?? "request_error") : "error"}`,
          );
          return null;
        },
      );
  };
  let pulse = async (options) => {
    let pulseKind = options.clear === true ? "clear" : "pulse";
    if (!isFirstPartyProvider()) {
      logForDebugging(`${logPrefix} ${pulseKind} skipped (non-first-party provider)`);
      return;
    }
    try {
      let firstResult = await sendPulse(pulseKind, options);
      if (
        firstResult?.status === 401 &&
        (firstResult.sentHeaders === null || (await config.onUnauthorized(firstResult.sentHeaders, "first")))
      ) {
        logForDebugging(
          `${logPrefix} ${pulseKind} retrying ${firstResult.sentHeaders === null ? "once: the first went with no credential" : "after credential refresh"}`,
        );
        let retryResult = await sendPulse(pulseKind, options);
        if (retryResult?.status === 401 && retryResult.sentHeaders !== null)
          config.onUnauthorized(retryResult.sentHeaders, "resend").catch(() => {});
      }
    } catch (error) {
      logForDebugging(
        `${logPrefix} ${pulseKind} skipped (credential unavailable: ${error instanceof Error ? error.name : "error"})`,
      );
    }
  };
  let pulseNow = () => {
    let now = Date.now();
    lastPulseAt = now;
    connectedAt ??= new Date(now).toISOString();
    let request = pulse({
      connected_at: connectedAt,
    });
    resolved = resolved.then(() => request);
    return request;
  };
  let pulseIfDue = () => {
    if (getTerminalFocus() === false) {
      logForDebugging(`${logPrefix} pulse skipped (terminal blurred)`);
      return;
    }
    if (Date.now() - lastPulseAt < PRESENCE_PULSE_MIN_INTERVAL_MS) return;
    pulseNow();
  };
  let unsubscribeInteraction = onInteraction(pulseIfDue);
  let unsubscribeFocus = onTerminalFocusChange(() => {
    let terminalFocus = getTerminalFocus();
    logForDebugging(
      `${logPrefix} terminal focus \u2192 ${terminalFocus === undefined ? "unknown" : terminalFocus ? "focused" : "blurred"}`,
    );
    if (terminalFocus === true) pulseIfDue();
  });
  logForDebugging(`${logPrefix} wired`);
  let tornDown = false;
  return {
    teardown() {
      if (tornDown) return;
      tornDown = true;
      unsubscribeInteraction?.();
      unsubscribeInteraction = null;
      unsubscribeFocus?.();
      unsubscribeFocus = null;
      if (connectedAt !== null)
        resolved.then(() =>
          pulse({
            clear: true,
          }),
        );
      connectedAt = null;
    },
    pulseIfClientPresent() {
      if (tornDown || Date.now() - lastPulseAt < PRESENCE_PULSE_MIN_INTERVAL_MS) return;
      hasClientPresenceMarker().then((hasMarker) => {
        if (hasMarker && !tornDown && Date.now() - lastPulseAt >= PRESENCE_PULSE_MIN_INTERVAL_MS) {
          logForDebugging(`${logPrefix} client-presence-marker active \u2192 pulse`);
          pulseNow();
        }
      });
    },
  };
}
export { startClientPresencePulse };
