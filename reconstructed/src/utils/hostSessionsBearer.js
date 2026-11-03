/**
 * utils/hostSessionsBearer.ts
 *
 * 2.1.316 新增：宿主下发的 sessions bearer 管理：恢复、确保、可发送判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (17)
 * attribution: placement 17
 */
import { HostScoped } from "./hostScoped.js";
import { computeContentHash } from "./commitAttribution.js";
import { installSessionsBearerHooks } from "../services/oauth/sessionsBearerHooks.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-bwbq4xvm.js:163476-163532 placement
var HOST_BEARER_RETRY_MS_2 = 60000;
var HOST_BEARER_RETRY_MS = 3;
var REFUSAL_BACKOFF_MS = 600000;
var BEARER_FORMAT_RE = /^[\w.~+/-]+=*$/;
var MAX_GIVEN_BEARERS = 4096;
//@ chunk-bwbq4xvm.js:163532-163717 placement
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
//@ chunk-bwbq4xvm.js:163717-163742 placement
var hostSessionsBearerStates = new HostScoped(() => new HostSessionsBearerState());
//@ chunk-bwbq4xvm.js:163742-163811 placement
function isHostHandedSessionsBearer(fallbackToken) {
  let hostBearerState = getHostBearerState();
  return hostBearerState.given.size > 0 && hostBearerState.given.has(computeContentHash(fallbackToken));
}
//@ chunk-bwbq4xvm.js:163811-164131 placement
function sendableHostSessionsBearer(e) {
  let s = null;
  try {
    let hostBearerState = getHostBearerState();
    if (hostBearerState.given.size > 0 && e !== hostBearerState.token) {
      let l = hostBearerState.given.get(computeContentHash(e));
      if (l !== undefined)
        s = {
          bearer: hostBearerState,
          handedUnder: l,
        };
    }
  } catch {
    return e;
  }
  if (s === null) return e;
  let { bearer, handedUnder } = s;
  try {
    if (bearer.source !== null && bearer.source.isSignInToken(e)) return e;
    return handedUnder === bearer.generation ? heldHostSessionsBearer() : null;
  } catch {
    return null;
  }
}
//@ chunk-bwbq4xvm.js:164131-164190 placement
function heldHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  return hostBearerSourceWithSignIn(hostBearerState) === null ? null : hostBearerState.token;
}
//@ chunk-bwbq4xvm.js:164190-164282 placement
function readHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  if (hostBearerSourceWithSignIn(hostBearerState) === null) return null;
  if (hostBearerState.token === null) ensureHostSessionsBearer();
  return hostBearerState.token;
}
//@ chunk-bwbq4xvm.js:164282-164347 placement
function setHostSessionsBearerSource(e) {
  getHostBearerState().source = e;
  if (e === null) forgetHeldHostSessionsBearer();
  else installSessionsBearerHooks(recoverHostSessionsBearer, sendableHostSessionsBearer);
}
//@ chunk-bwbq4xvm.js:164347-164559 placement
function forgetHeldHostSessionsBearer(e) {
  let hostBearerState = getHostBearerState();
  hostBearerState.token = null;
  hostBearerState.generation++;
  hostBearerState.previousSignIn = e === undefined ? null : computeContentHash(e);
  hostBearerState.lastUnansweredAt = null;
  hostBearerState.refused.clear();
  hostBearerState.recentRefusals = 0;
  hostBearerState.lastRefusalAt = null;
  hostBearerState.refusedOutAt = null;
  hostBearerState.inFlight = null;
}
//@ chunk-bwbq4xvm.js:164559-164659 placement
function acceptPushedHostSessionsBearer(e) {
  let hostBearerState = getHostBearerState();
  if (!isAcceptablePushedBearer(hostBearerState, e)) return false;
  hostBearerState.token = e;
  rememberGivenBearer(hostBearerState, e);
  hostBearerState.lastUnansweredAt = null;
  return true;
}
//@ chunk-bwbq4xvm.js:164659-165326 placement
/**
 * 确保拿到宿主 sessions bearer：已有则直接返回，否则发起（去重的）向宿主索取请求。
 */
function ensureHostSessionsBearer() {
  let hostBearerState = getHostBearerState();
  let s = hostBearerSourceWithSignIn(hostBearerState);
  if (s === null) return Promise.resolve(null);
  if (hostBearerState.token !== null) return Promise.resolve(hostBearerState.token);
  if (hostBearerState.inFlight !== null) return hostBearerState.inFlight;
  if (
    isBearerRefusalBackoff(hostBearerState) ||
    (hostBearerState.lastUnansweredAt !== null &&
      Date.now() - hostBearerState.lastUnansweredAt < HOST_BEARER_RETRY_MS_2)
  )
    return Promise.resolve(null);
  let generation = hostBearerState.generation;
  hostBearerState.inFlight = s
    .ask()
    .then(
      (r) => {
        if (hostBearerState.token !== null || generation !== hostBearerState.generation)
          return hostBearerState.token;
        if (!isAcceptablePushedBearer(hostBearerState, r.accessToken)) {
          hostBearerState.lastUnansweredAt = Date.now();
          return null;
        }
        hostBearerState.token = r.accessToken;
        rememberGivenBearer(hostBearerState, r.accessToken);
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
//@ chunk-bwbq4xvm.js:165326-166393 placement
/**
 * 会话令牌被拒后向宿主（SDK host）恢复 sessions bearer：返回 refused/not_held/withheld/recovered/stale/unrecovered 等结果。
 */
async function recoverHostSessionsBearer(e, s = "refused") {
  let hostBearerState = getHostBearerState();
  if (hostBearerState.source === null || hostBearerState.given.size === 0) return "not_held";
  let contentHash = computeContentHash(e);
  let a = hostBearerState.given.get(contentHash);
  if (
    a === undefined ||
    contentHash === hostBearerState.previousSignIn ||
    hostBearerState.source.isSignInToken(e)
  )
    return "not_held";
  if (s === "withheld" && hostBearerState.token === e) return "recovered";
  if (s === "stale" && hostBearerState.token === e) {
    if (hostBearerState.inFlight !== null) await hostBearerState.inFlight;
    else {
      let l = isBearerRefusalBackoff(hostBearerState) ? null : hostBearerSourceWithSignIn(hostBearerState);
      if (l !== null) {
        let generation = hostBearerState.generation;
        hostBearerState.inFlight = l
          .ask()
          .then(
            (h) => {
              if (
                generation === hostBearerState.generation &&
                (hostBearerState.token === e || hostBearerState.token === null) &&
                h.accessToken !== hostBearerState.token &&
                isAcceptablePushedBearer(hostBearerState, h.accessToken)
              ) {
                hostBearerState.token = h.accessToken;
                rememberGivenBearer(hostBearerState, h.accessToken);
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
  if (s === "refused" && a === hostBearerState.generation) hostBearerState.refused.add(contentHash);
  if (hostBearerState.token === e) {
    hostBearerState.token = null;
    if (s === "refused") {
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
//@ chunk-bwbq4xvm.js:166393-166541 placement
function rememberGivenBearer(hostBearerState, accessToken) {
  let contentHash = computeContentHash(accessToken);
  hostBearerState.given.delete(contentHash);
  hostBearerState.given.set(contentHash, hostBearerState.generation);
  if (hostBearerState.given.size > MAX_GIVEN_BEARERS)
    for (let key of hostBearerState.given.keys()) {
      hostBearerState.given.delete(key);
      break;
    }
}
//@ chunk-bwbq4xvm.js:166541-166578 placement
function getHostBearerState() {
  return hostSessionsBearerStates.of(getRootSession().host);
}
//@ chunk-bwbq4xvm.js:166578-166652 placement
function hostBearerSourceWithSignIn(hostBearerState) {
  return hostBearerState.source !== null && hostBearerState.source.hasSignIn()
    ? hostBearerState.source
    : null;
}
//@ chunk-bwbq4xvm.js:166652-166812 placement
function isBearerRefusalBackoff(hostBearerState) {
  if (hostBearerState.refusedOutAt === null) return false;
  if (Date.now() - hostBearerState.refusedOutAt < REFUSAL_BACKOFF_MS) return true;
  hostBearerState.recentRefusals = 0;
  hostBearerState.lastRefusalAt = null;
  hostBearerState.refusedOutAt = null;
  return false;
}
//@ chunk-bwbq4xvm.js:166812-166982 placement
function isAcceptablePushedBearer(hostBearerState, accessToken) {
  let n = hostBearerSourceWithSignIn(hostBearerState);
  if (
    n === null ||
    isBearerRefusalBackoff(hostBearerState) ||
    typeof accessToken !== "string" ||
    !BEARER_FORMAT_RE.test(accessToken)
  )
    return false;
  let contentHash = computeContentHash(accessToken);
  return (
    !hostBearerState.refused.has(contentHash) &&
    contentHash !== hostBearerState.previousSignIn &&
    !n.isSignInToken(accessToken)
  );
}
export {
  recoverHostSessionsBearer,
  sendableHostSessionsBearer,
  ensureHostSessionsBearer,
  heldHostSessionsBearer,
  readHostSessionsBearer,
  isHostHandedSessionsBearer,
  forgetHeldHostSessionsBearer,
  setHostSessionsBearerSource,
  acceptPushedHostSessionsBearer,
};
