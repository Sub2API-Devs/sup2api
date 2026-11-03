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
var HOST_BEARER_RETRY_MS = 60000,
  rC = 3,
  id = 600000,
  oC = /^[\w.~+/-]+=*$/,
  aC = 4096;
/**
 * 宿主下发的 sessions bearer 状态：当前令牌、已见令牌代际、被拒集合、在途请求、拒绝退避计数。
 */
//@ chunk-bwbq4xvm.js:163532-163717 placement
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
function isHostHandedSessionsBearer(e) {
  let s = getHostBearerState();
  return s.given.size > 0 && s.given.has(computeContentHash(e));
}
//@ chunk-bwbq4xvm.js:163811-164131 placement
function sendableHostSessionsBearer(e) {
  let s = null;
  try {
    let a = getHostBearerState();
    if (a.given.size > 0 && e !== a.token) {
      let l = a.given.get(computeContentHash(e));
      if (l !== void 0) s = { bearer: a, handedUnder: l };
    }
  } catch {
    return e;
  }
  if (s === null) return e;
  let { bearer: bearer, handedUnder: handedUnder } = s;
  try {
    if (bearer.source !== null && bearer.source.isSignInToken(e)) return e;
    return handedUnder === bearer.generation ? heldHostSessionsBearer() : null;
  } catch {
    return null;
  }
}
//@ chunk-bwbq4xvm.js:164131-164190 placement
function heldHostSessionsBearer() {
  let e = getHostBearerState();
  return hostBearerSourceWithSignIn(e) === null ? null : e.token;
}
//@ chunk-bwbq4xvm.js:164190-164282 placement
function readHostSessionsBearer() {
  let e = getHostBearerState();
  if (hostBearerSourceWithSignIn(e) === null) return null;
  if (e.token === null) ensureHostSessionsBearer();
  return e.token;
}
//@ chunk-bwbq4xvm.js:164282-164347 placement
function setHostSessionsBearerSource(e) {
  if (((getHostBearerState().source = e), e === null)) forgetHeldHostSessionsBearer();
  else installSessionsBearerHooks(recoverHostSessionsBearer, sendableHostSessionsBearer);
}
//@ chunk-bwbq4xvm.js:164347-164559 placement
function forgetHeldHostSessionsBearer(e) {
  let s = getHostBearerState();
  ((s.token = null),
    s.generation++,
    (s.previousSignIn = e === void 0 ? null : computeContentHash(e)),
    (s.lastUnansweredAt = null),
    s.refused.clear(),
    (s.recentRefusals = 0),
    (s.lastRefusalAt = null),
    (s.refusedOutAt = null),
    (s.inFlight = null));
}
//@ chunk-bwbq4xvm.js:164559-164659 placement
function acceptPushedHostSessionsBearer(e) {
  let s = getHostBearerState();
  if (!isAcceptablePushedBearer(s, e)) return !1;
  return ((s.token = e), rememberGivenBearer(s, e), (s.lastUnansweredAt = null), !0);
}
/**
 * 确保拿到宿主 sessions bearer：已有则直接返回，否则发起（去重的）向宿主索取请求。
 */
//@ chunk-bwbq4xvm.js:164659-165326 placement
function ensureHostSessionsBearer() {
  let e = getHostBearerState(),
    s = hostBearerSourceWithSignIn(e);
  if (s === null) return Promise.resolve(null);
  if (e.token !== null) return Promise.resolve(e.token);
  if (e.inFlight !== null) return e.inFlight;
  if (
    isBearerRefusalBackoff(e) ||
    (e.lastUnansweredAt !== null && Date.now() - e.lastUnansweredAt < HOST_BEARER_RETRY_MS)
  )
    return Promise.resolve(null);
  let generation = e.generation;
  return (
    (e.inFlight = s
      .ask()
      .then(
        (r) => {
          if (e.token !== null || generation !== e.generation) return e.token;
          if (!isAcceptablePushedBearer(e, r.accessToken)) return ((e.lastUnansweredAt = Date.now()), null);
          return (
            (e.token = r.accessToken),
            rememberGivenBearer(e, r.accessToken),
            (e.lastUnansweredAt = null),
            e.token
          );
        },
        () => {
          if (e.token === null && generation === e.generation) e.lastUnansweredAt = Date.now();
          return e.token;
        },
      )
      .finally(() => {
        if (generation === e.generation) e.inFlight = null;
      })),
    e.inFlight
  );
}
/**
 * 会话令牌被拒后向宿主（SDK host）恢复 sessions bearer：返回 refused/not_held/withheld/recovered/stale/unrecovered 等结果。
 */
//@ chunk-bwbq4xvm.js:165326-166393 placement
async function recoverHostSessionsBearer(e, s = "refused") {
  let n = getHostBearerState();
  if (n.source === null || n.given.size === 0) return "not_held";
  let r = computeContentHash(e),
    a = n.given.get(r);
  if (a === void 0 || r === n.previousSignIn || n.source.isSignInToken(e)) return "not_held";
  if (s === "withheld" && n.token === e) return "recovered";
  if (s === "stale" && n.token === e) {
    if (n.inFlight !== null) await n.inFlight;
    else {
      let l = isBearerRefusalBackoff(n) ? null : hostBearerSourceWithSignIn(n);
      if (l !== null) {
        let generation = n.generation;
        ((n.inFlight = l
          .ask()
          .then(
            (h) => {
              if (
                generation === n.generation &&
                (n.token === e || n.token === null) &&
                h.accessToken !== n.token &&
                isAcceptablePushedBearer(n, h.accessToken)
              )
                ((n.token = h.accessToken), rememberGivenBearer(n, h.accessToken));
              return n.token;
            },
            () => n.token,
          )
          .finally(() => {
            if (generation === n.generation) n.inFlight = null;
          })),
          await n.inFlight);
      }
    }
    return hostBearerSourceWithSignIn(n) !== null && n.token !== null ? "recovered" : "unrecovered";
  }
  if (s === "refused" && a === n.generation) n.refused.add(r);
  if (n.token === e) {
    if (((n.token = null), s === "refused")) {
      let now = Date.now();
      if (n.lastRefusalAt === null || now - n.lastRefusalAt >= id) n.recentRefusals = 0;
      if ((n.recentRefusals++, (n.lastRefusalAt = now), n.recentRefusals >= rC)) n.refusedOutAt = now;
    }
  } else if (n.token !== null) return "recovered";
  return (await ensureHostSessionsBearer()) !== null ? "recovered" : "unrecovered";
}
//@ chunk-bwbq4xvm.js:166393-166541 placement
function rememberGivenBearer(e, s) {
  let n = computeContentHash(s);
  if ((e.given.delete(n), e.given.set(n, e.generation), e.given.size > aC))
    for (let r of e.given.keys()) {
      e.given.delete(r);
      break;
    }
}
//@ chunk-bwbq4xvm.js:166541-166578 placement
function getHostBearerState() {
  return hostSessionsBearerStates.of(getRootSession().host);
}
//@ chunk-bwbq4xvm.js:166578-166652 placement
function hostBearerSourceWithSignIn(e) {
  return e.source !== null && e.source.hasSignIn() ? e.source : null;
}
//@ chunk-bwbq4xvm.js:166652-166812 placement
function isBearerRefusalBackoff(e) {
  if (e.refusedOutAt === null) return !1;
  if (Date.now() - e.refusedOutAt < id) return !0;
  return ((e.recentRefusals = 0), (e.lastRefusalAt = null), (e.refusedOutAt = null), !1);
}
//@ chunk-bwbq4xvm.js:166812-166982 placement
function isAcceptablePushedBearer(e, s) {
  let n = hostBearerSourceWithSignIn(e);
  if (n === null || isBearerRefusalBackoff(e) || typeof s !== "string" || !oC.test(s)) return !1;
  let r = computeContentHash(s);
  return !e.refused.has(r) && r !== e.previousSignIn && !n.isSignInToken(s);
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
