/**
 * services/artifacts/liveSubscribe.ts
 *
 * 2.1.316 新增：artifact 实时订阅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (11)
 * attribution: placement 11
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { acceptVersionNotAhead, We, PASSIVE } from "./pageScripts.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { isPublishInFlight, isOwnPublishedVer } from "./ownPublishes.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { PUBLIC_OUTSIDE_ORG_NOTE, vFr } from "./orgScope.js";
import { getLiveSubscriptionToken, isWriterRole } from "./audience.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders, V6 } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";

/**
 * 记录实时订阅听到的某 artifact 新版本（只接受比已记录更新的合法版本；时间超前的版本跳过并只打点一次）。
 */
//@ chunk-jv307fw4.js:18146-18469 placement
function recordHeardVersion(e, n) {
  let { live: live } = getLiveState();
  if (acceptVersionNotAhead(n) === void 0) {
    if (!live.heardAheadOfClockReported && We.test(n))
      ((live.heardAheadOfClockReported = !0),
        logFeatureSad("artifact_live_subscribe", "heard_version_skipped_ahead_of_clock"));
    return;
  }
  let s = live.heardVersions.get(e),
    a = s === void 0 ? 1 : compareNumericPrefix(n, s.ver);
  if (a !== null && a > 0) live.heardVersions.set(e, { ver: n, toldTo: new Set() });
}
/**
 * 判断某个已读版本是否落后于实时听到/携带的最新版本（排除自己正在或已发布的版本）；返回 behind 与最新版本。
 */
//@ chunk-jv307fw4.js:18469-18781 placement
function checkBehindLive(e, n) {
  let { supervisors: supervisors, heardVersions: heardVersions } = getLiveState().live,
    a = supervisors.get(e);
  if (a === void 0 || n === void 0) return { behind: !1 };
  let l = xt(acceptVersionNotAhead(heardVersions.get(e)?.ver), acceptVersionNotAhead(a.carriedVer));
  if (l === void 0 || isPublishInFlight(a.ownPublishes, e) || isOwnPublishedVer(a.ownPublishes, e, l))
    return { behind: !1 };
  let d = compareNumericPrefix(l, n);
  return d !== null && d > 0 ? { behind: !0, liveVer: l } : { behind: !1 };
}
/**
 * 判断某 artifact 是否落后于实时版本且该版本尚未告知给指定 agent；需要告知时返回实时版本。
 */
//@ chunk-jv307fw4.js:18781-18951 placement
function getUntoldLiveVersion(e, n, r) {
  let s = checkBehindLive(e, n);
  if (!s.behind) return;
  let a = getLiveState().live.heardVersions.get(e);
  return a?.ver === s.liveVer && a.toldTo.has(r ?? "main") ? void 0 : { liveVer: s.liveVer };
}
/**
 * 记录某实时版本已告知给指定 agent（同版本追加告知对象，更新的版本替换记录）。
 */
//@ chunk-jv307fw4.js:18951-19173 placement
function markLiveVersionTold(e, n, r) {
  if (acceptVersionNotAhead(n) === void 0) return;
  let heardVersions = getLiveState().live.heardVersions,
    a = heardVersions.get(e),
    l = r ?? "main";
  if (a?.ver === n) {
    a.toldTo.add(l);
    return;
  }
  let d = a === void 0 ? -1 : compareNumericPrefix(a.ver, n);
  if (d !== null && d < 0) heardVersions.set(e, { ver: n, toldTo: new Set([l]) });
}
//@ chunk-jv307fw4.js:19173-19266 placement
function R5n(e, n) {
  let heardVersions = getLiveState().live.heardVersions;
  if (n === void 0 || heardVersions.get(e)?.ver === n) heardVersions.delete(e);
}
//@ chunk-jv307fw4.js:19266-19360 placement
function xt(e, n) {
  if (e === void 0 || n === void 0) return e ?? n;
  let r = compareNumericPrefix(e, n);
  return r !== null && r < 0 ? n : e;
}
/**
 * 获取 artifact 的实时订阅信息：拉取 boot（可走精简版本），失败时返回错误及其他组织/不可用/无应答标志；组织外公开的 artifact 返回 publicOutsideOrg；成功返回令牌、传输方式（live/sync）、版本、编辑者、过期时间、能否续期与标题。
 */
//@ chunk-jv307fw4.js:34155-35071 placement
async function fetchLiveSubscription(
  slug,
  signal,
  credentials,
  { syncLive: syncLive = !1, lean: leanVersion } = {},
) {
  let l = claudeAiEnvironment(),
    boot = await fetchArtifactBootWithProbe({ slug: slug, env: l }, "artifact_live_subscribe", signal, {
      agentPeer: syncLive,
      syncLive: syncLive,
      watchBoot: !0,
      ...(leanVersion !== void 0 && {
        lean: {
          version: leanVersion,
          mustCarry: (T) =>
            "subscriptionToken" in T &&
            "syncToken" in T &&
            "syncClient" in T &&
            "subscriptionTokenExp" in T &&
            "watchTokenRenewEnabled" in T &&
            "perm" in T,
        },
      }),
      credentials: credentials,
    });
  if (boot.err !== null)
    return {
      err: boot.err,
      ...(boot.status && { status: boot.status }),
      ...(boot.otherOrg && { otherOrg: !0 }),
      ...(Y9(boot.status) && { unavailable: !0 }),
      ...(boot.errorCode === "boot_request_error" && { noAnswer: !0 }),
    };
  if (boot.assetToken === void 0) return { err: PUBLIC_OUTSIDE_ORG_NOTE, publicOutsideOrg: !0 };
  let subscription = getLiveSubscriptionToken(boot.data),
    isSyncClient = boot.data.syncClient === !0;
  return {
    err: null,
    token: subscription?.token,
    transport: subscription?.transport ?? (isSyncClient ? "sync" : "live"),
    ver: boot.ver,
    editor: Yt(boot),
    tokenExp: isSyncClient ? void 0 : at(boot.data.subscriptionTokenExp),
    renewable: subscription?.transport === "live" && boot.data.watchTokenRenewEnabled === !0,
    ...(typeof boot.data.title === "string" && { title: boot.data.title }),
  };
}
//@ chunk-jv307fw4.js:35071-35142 placement
function at(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : void 0;
}
//@ chunk-jv307fw4.js:35142-35203 placement
function Y9(e) {
  return e !== void 0 && (e >= 500 || e === 429 || e === 408);
}
/**
 * 调用 /api/frame/watch-token 续期实时监听令牌；任何失败都返回 renew_miss（可带状态码），成功返回新令牌、版本与过期时间。
 */
//@ chunk-jv307fw4.js:35203-35780 placement
async function renewWatchToken(slug, signal, credentials) {
  let response;
  try {
    response = await frameApi.post(
      `/api/frame/watch-token/${slug}?vn=${PASSIVE}`,
      {},
      {
        refreshOAuth: !0,
        credentials: credentials,
        headers: buildFrameHeaders(),
        timeout: vFr,
        signal: signal,
      },
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    return { err: "renew_miss" };
  }
  if (!response.ok || !response.fromFrame || response.status < 200 || response.status >= 300)
    return { err: "renew_miss", ...(response.ok && { status: response.status }) };
  let data = response.data ?? {},
    l = getLiveSubscriptionToken(data),
    d = l?.transport === "live" ? l.token : void 0;
  if (!data.ver || !V6.test(data.ver) || d === void 0) return { err: "renew_miss", status: response.status };
  return {
    err: null,
    token: d,
    transport: "live",
    ver: data.ver,
    editor: void 0,
    tokenExp: at(data.subscriptionTokenExp),
    renewable: !0,
  };
}
//@ chunk-jv307fw4.js:35780-35848 placement
function Yt(e) {
  return e.assetToken !== void 0 && isWriterRole(e.data.perm?.role);
}

export {
  Y9,
  getUntoldLiveVersion,
  markLiveVersionTold,
  checkBehindLive,
  R5n,
  renewWatchToken,
  fetchLiveSubscription,
  recordHeardVersion,
};
