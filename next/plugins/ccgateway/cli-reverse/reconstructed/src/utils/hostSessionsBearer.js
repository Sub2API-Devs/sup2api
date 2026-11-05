/**
 * utils/hostSessionsBearer.ts
 *
 * 2.1.316 新增：宿主下发的 sessions bearer 管理：恢复、确保、可发送判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (17)
 * attribution: placement 17
 */
import { HostScoped } from "./hostScoped.js";
import { computeContentHash } from "./commitAttribution.js";
import { installSessionsBearerHooks } from "../services/oauth/sessionsBearerHooks.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:162725-162781 placement
var HOST_BEARER_RETRY_MS_2 = 60000;
var HOST_BEARER_RETRY_MS = 3;
var REFUSAL_BACKOFF_MS = 600000;
var BEARER_FORMAT_RE = /^[\w.~+/-]+=*$/;
var MAX_GIVEN_BEARERS = 4096;
//@ chunk-7kayq7nc.js:162781-162966 placement
/**
 * 宿主下发的 sessions bearer 状态：当前令牌、已见令牌代际、被拒集合、在途请求、拒绝退避计数。
 */
class HostSessionsBearerState {
  token = null;
  given = new Map();
  refused = new Set();
  inFlight = null;
  lastUnansweredAt = null;
  recentRefusals = 0;
  lastRefusalAt = null;
  refusedOutAt = null;
  generation = 0;
  previousSignIn = null;
  source = null;
}
//@ chunk-7kayq7nc.js:162966-162991 placement
var hostSessionsBearerStates; // deferred: uses HostSessionsBearerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7kayq7nc.js:162966", () => {
  hostSessionsBearerStates = new HostScoped(() => new HostSessionsBearerState());
});
//@ chunk-7kayq7nc.js:162991-163060 placement
function isHostHandedSessionsBearer(fallbackToken) {
  let hostBearerState = getHostBearerState();
  return hostBearerState.given.size > 0 && hostBearerState.given.has(computeContentHash(fallbackToken));
}
//@ chunk-7kayq7nc.js:163060-163380 placement
function sendableHostSessionsBearer(bearer) {
  let held = null;
  try {
    let hostBearerState = getHostBearerState();
    if (hostBearerState.given.size > 0 && bearer !== hostBearerState.token) {
      let generation = hostBearerState.given.get(computeContentHash(bearer));
      if (generation !== undefined)
        held = {
          bearer: hostBearerState,
          handedUnder: generation,
        };
    }
  } catch {
    return bearer;
  }
  if (held === null) return bearer;
  let { bearer: bearer_2, handedUnder } = held;
  try {
    if (bearer_2.source !== null && bearer_2.source.isSignInToken(bearer)) return bearer;
    return handedUnder === bearer_2.generation ? heldHostSessionsBearer() : null;
  } catch {
    return null;
  }
}
//@ chunk-7kayq7nc.js:163380-163439 placement
function heldHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  return hostBearerSourceWithSignIn(hostBearerState) === null ? null : hostBearerState.token;
}
//@ chunk-7kayq7nc.js:163439-163531 placement
function readHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  if (hostBearerSourceWithSignIn(hostBearerState) === null) return null;
  if (hostBearerState.token === null) ensureHostSessionsBearer();
  return hostBearerState.token;
}
//@ chunk-7kayq7nc.js:163531-163596 placement
function setHostSessionsBearerSource(source) {
  getHostBearerState().source = source;
  if (source === null) forgetHeldHostSessionsBearer();
  else installSessionsBearerHooks(recoverHostSessionsBearer, sendableHostSessionsBearer);
}
//@ chunk-7kayq7nc.js:163596-163808 placement
function forgetHeldHostSessionsBearer(previousSignIn) {
  let hostBearerState = getHostBearerState();
  hostBearerState.token = null;
  hostBearerState.generation++;
  hostBearerState.previousSignIn = previousSignIn === undefined ? null : computeContentHash(previousSignIn);
  hostBearerState.lastUnansweredAt = null;
  hostBearerState.refused.clear();
  hostBearerState.recentRefusals = 0;
  hostBearerState.lastRefusalAt = null;
  hostBearerState.refusedOutAt = null;
  hostBearerState.inFlight = null;
}
//@ chunk-7kayq7nc.js:163808-163908 placement
function acceptPushedHostSessionsBearer(token) {
  let hostBearerState = getHostBearerState();
  if (!isAcceptablePushedBearer(hostBearerState, token)) return false;
  hostBearerState.token = token;
  rememberGivenBearer(hostBearerState, token);
  hostBearerState.lastUnansweredAt = null;
  return true;
}
//@ chunk-7kayq7nc.js:163908-164575 placement
/**
 * 确保拿到宿主 sessions bearer：已有则直接返回，否则发起（去重的）向宿主索取请求。
 */
function ensureHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  let source = hostBearerSourceWithSignIn(hostBearerState);
  if (source === null) return Promise.resolve(null);
  if (hostBearerState.token !== null) return Promise.resolve(hostBearerState.token);
  if (hostBearerState.inFlight !== null) return hostBearerState.inFlight;
  if (
    isBearerRefusalBackoff(hostBearerState) ||
    (hostBearerState.lastUnansweredAt !== null &&
      Date.now() - hostBearerState.lastUnansweredAt < HOST_BEARER_RETRY_MS_2)
  )
    return Promise.resolve(null);
  let generation = hostBearerState.generation;
  hostBearerState.inFlight = source
    .ask()
    .then(
      (answer) => {
        if (hostBearerState.token !== null || generation !== hostBearerState.generation)
          return hostBearerState.token;
        if (!isAcceptablePushedBearer(hostBearerState, answer.accessToken)) {
          hostBearerState.lastUnansweredAt = Date.now();
          return null;
        }
        hostBearerState.token = answer.accessToken;
        rememberGivenBearer(hostBearerState, answer.accessToken);
        hostBearerState.lastUnansweredAt = null;
        return hostBearerState.token;
      },
      () => {
        if (hostBearerState.token === null && generation === hostBearerState.generation)
          hostBearerState.lastUnansweredAt = Date.now();
        return hostBearerState.token;
      },
    )
    .finally(() => {
      if (generation === hostBearerState.generation) hostBearerState.inFlight = null;
    });
  return hostBearerState.inFlight;
}
//@ chunk-7kayq7nc.js:164575-165642 placement
/**
 * 会话令牌被拒后向宿主（SDK host）恢复 sessions bearer：返回 refused/not_held/withheld/recovered/stale/unrecovered 等结果。
 */
async function recoverHostSessionsBearer(token, kind = "refused") {
  let hostBearerState = getHostBearerState();
  if (hostBearerState.source === null || hostBearerState.given.size === 0) return "not_held";
  let contentHash = computeContentHash(token);
  let handedUnder = hostBearerState.given.get(contentHash);
  if (
    handedUnder === undefined ||
    contentHash === hostBearerState.previousSignIn ||
    hostBearerState.source.isSignInToken(token)
  )
    return "not_held";
  if (kind === "withheld" && hostBearerState.token === token) return "recovered";
  if (kind === "stale" && hostBearerState.token === token) {
    if (hostBearerState.inFlight !== null) await hostBearerState.inFlight;
    else {
      let source = isBearerRefusalBackoff(hostBearerState)
        ? null
        : hostBearerSourceWithSignIn(hostBearerState);
      if (source !== null) {
        let generation = hostBearerState.generation;
        hostBearerState.inFlight = source
          .ask()
          .then(
            (answer) => {
              if (
                generation === hostBearerState.generation &&
                (hostBearerState.token === token || hostBearerState.token === null) &&
                answer.accessToken !== hostBearerState.token &&
                isAcceptablePushedBearer(hostBearerState, answer.accessToken)
              ) {
                hostBearerState.token = answer.accessToken;
                rememberGivenBearer(hostBearerState, answer.accessToken);
              }
              return hostBearerState.token;
            },
            () => hostBearerState.token,
          )
          .finally(() => {
            if (generation === hostBearerState.generation) hostBearerState.inFlight = null;
          });
        await hostBearerState.inFlight;
      }
    }
    return hostBearerSourceWithSignIn(hostBearerState) !== null && hostBearerState.token !== null
      ? "recovered"
      : "unrecovered";
  }
  if (kind === "refused" && handedUnder === hostBearerState.generation)
    hostBearerState.refused.add(contentHash);
  if (hostBearerState.token === token) {
    hostBearerState.token = null;
    if (kind === "refused") {
      let now = Date.now();
      if (hostBearerState.lastRefusalAt === null || now - hostBearerState.lastRefusalAt >= REFUSAL_BACKOFF_MS)
        hostBearerState.recentRefusals = 0;
      hostBearerState.recentRefusals++;
      hostBearerState.lastRefusalAt = now;
      if (hostBearerState.recentRefusals >= HOST_BEARER_RETRY_MS) hostBearerState.refusedOutAt = now;
    }
  } else if (hostBearerState.token !== null) return "recovered";
  return (await ensureHostSessionsBearer()) !== null ? "recovered" : "unrecovered";
}
//@ chunk-7kayq7nc.js:165642-165790 placement
function rememberGivenBearer(hostBearerState, token) {
  let contentHash = computeContentHash(token);
  hostBearerState.given.delete(contentHash);
  hostBearerState.given.set(contentHash, hostBearerState.generation);
  if (hostBearerState.given.size > MAX_GIVEN_BEARERS)
    for (let key of hostBearerState.given.keys()) {
      hostBearerState.given.delete(key);
      break;
    }
}
//@ chunk-7kayq7nc.js:165790-165827 placement
function getHostBearerState() {
  return hostSessionsBearerStates.of(getRootSession().host);
}
//@ chunk-7kayq7nc.js:165827-165901 placement
function hostBearerSourceWithSignIn(hostBearerState) {
  return hostBearerState.source !== null && hostBearerState.source.hasSignIn()
    ? hostBearerState.source
    : null;
}
//@ chunk-7kayq7nc.js:165901-166061 placement
function isBearerRefusalBackoff(hostBearerState) {
  if (hostBearerState.refusedOutAt === null) return false;
  if (Date.now() - hostBearerState.refusedOutAt < REFUSAL_BACKOFF_MS) return true;
  hostBearerState.recentRefusals = 0;
  hostBearerState.lastRefusalAt = null;
  hostBearerState.refusedOutAt = null;
  return false;
}
//@ chunk-7kayq7nc.js:166061-166231 placement
function isAcceptablePushedBearer(hostBearerState, token) {
  let source = hostBearerSourceWithSignIn(hostBearerState);
  if (
    source === null ||
    isBearerRefusalBackoff(hostBearerState) ||
    typeof token !== "string" ||
    !BEARER_FORMAT_RE.test(token)
  )
    return false;
  let contentHash = computeContentHash(token);
  return (
    !hostBearerState.refused.has(contentHash) &&
    contentHash !== hostBearerState.previousSignIn &&
    !source.isSignInToken(token)
  );
}
export {
  ensureHostSessionsBearer,
  heldHostSessionsBearer,
  readHostSessionsBearer,
  isHostHandedSessionsBearer,
  recoverHostSessionsBearer,
  setHostSessionsBearerSource,
  forgetHeldHostSessionsBearer,
  acceptPushedHostSessionsBearer,
  sendableHostSessionsBearer,
};
