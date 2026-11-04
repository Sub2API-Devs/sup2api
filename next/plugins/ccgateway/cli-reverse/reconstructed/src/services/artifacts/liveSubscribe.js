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
import { acceptVersionNotAhead, VERSION_TS_PREFIX_RE, PASSIVE } from "./pageScripts.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { isPublishInFlight, isOwnPublishedVer } from "./ownPublishes.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { PUBLIC_OUTSIDE_ORG_NOTE, ACCESS_PROBE_TIMEOUT_MS } from "./orgScope.js";
import { getLiveSubscriptionToken, isWriterRole } from "./audience.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-jv307fw4.js:18146-18469 placement
/**
 * 记录实时订阅听到的某 artifact 新版本（只接受比已记录更新的合法版本；时间超前的版本跳过并只打点一次）。
 */
function recordHeardVersion(slug, ver) {
  let { live } = getLiveState();
  if (acceptVersionNotAhead(ver) === undefined) {
    if (!live.heardAheadOfClockReported && VERSION_TS_PREFIX_RE.test(ver)) {
      live.heardAheadOfClockReported = true;
      logFeatureSad("artifact_live_subscribe", "heard_version_skipped_ahead_of_clock");
    }
    return;
  }
  let heard = live.heardVersions.get(slug);
  let cmp = heard === undefined ? 1 : compareNumericPrefix(ver, heard.ver);
  if (cmp !== null && cmp > 0)
    live.heardVersions.set(slug, {
      ver,
      toldTo: new Set(),
    });
}
//@ chunk-jv307fw4.js:18469-18781 placement
/**
 * 判断某个已读版本是否落后于实时听到/携带的最新版本（排除自己正在或已发布的版本）；返回 behind 与最新版本。
 */
function checkBehindLive(slug, heardVersion) {
  let { supervisors, heardVersions } = getLiveState().live;
  let supervisor = supervisors.get(slug);
  if (supervisor === undefined || heardVersion === undefined)
    return {
      behind: false,
    };
  let liveVer = maxVersion(
    acceptVersionNotAhead(heardVersions.get(slug)?.ver),
    acceptVersionNotAhead(supervisor.carriedVer),
  );
  if (
    liveVer === undefined ||
    isPublishInFlight(supervisor.ownPublishes, slug) ||
    isOwnPublishedVer(supervisor.ownPublishes, slug, liveVer)
  )
    return {
      behind: false,
    };
  let cmp = compareNumericPrefix(liveVer, heardVersion);
  return cmp !== null && cmp > 0
    ? {
        behind: true,
        liveVer,
      }
    : {
        behind: false,
      };
}
//@ chunk-jv307fw4.js:18781-18951 placement
/**
 * 判断某 artifact 是否落后于实时版本且该版本尚未告知给指定 agent；需要告知时返回实时版本。
 */
function getUntoldLiveVersion(slug, heldVer, agentId) {
  let behind = checkBehindLive(slug, heldVer);
  if (!behind.behind) return;
  let heard = getLiveState().live.heardVersions.get(slug);
  return heard?.ver === behind.liveVer && heard.toldTo.has(agentId ?? "main")
    ? undefined
    : {
        liveVer: behind.liveVer,
      };
}
//@ chunk-jv307fw4.js:18951-19173 placement
/**
 * 记录某实时版本已告知给指定 agent（同版本追加告知对象，更新的版本替换记录）。
 */
function markLiveVersionTold(slug, liveVer, agentId) {
  if (acceptVersionNotAhead(liveVer) === undefined) return;
  let heardVersions = getLiveState().live.heardVersions;
  let heard = heardVersions.get(slug);
  let agentKey = agentId ?? "main";
  if (heard?.ver === liveVer) {
    heard.toldTo.add(agentKey);
    return;
  }
  let cmp = heard === undefined ? -1 : compareNumericPrefix(heard.ver, liveVer);
  if (cmp !== null && cmp < 0)
    heardVersions.set(slug, {
      ver: liveVer,
      toldTo: new Set([agentKey]),
    });
}
//@ chunk-jv307fw4.js:19173-19266 placement
/**
 * 记录已听过的版本号：与给定版本相同时清除记录。
 */
function forgetHeardVersion(slug, ver) {
  let heardVersions = getLiveState().live.heardVersions;
  if (ver === undefined || heardVersions.get(slug)?.ver === ver) heardVersions.delete(slug);
}
//@ chunk-jv307fw4.js:19266-19360 placement
function maxVersion(a, b) {
  if (a === undefined || b === undefined) return a ?? b;
  let cmp = compareNumericPrefix(a, b);
  return cmp !== null && cmp < 0 ? b : a;
}
//@ chunk-jv307fw4.js:34155-35071 placement
/**
 * 获取 artifact 的实时订阅信息：拉取 boot（可走精简版本），失败时返回错误及其他组织/不可用/无应答标志；组织外公开的 artifact 返回 publicOutsideOrg；成功返回令牌、传输方式（live/sync）、版本、编辑者、过期时间、能否续期与标题。
 */
async function fetchLiveSubscription(
  slug,
  signal,
  credentials,
  { syncLive = false, lean: leanVersion } = {},
) {
  let env = claudeAiEnvironment();
  let boot = await fetchArtifactBootWithProbe(
    {
      slug,
      env,
    },
    "artifact_live_subscribe",
    signal,
    {
      agentPeer: syncLive,
      syncLive,
      watchBoot: true,
      ...(leanVersion !== undefined && {
        lean: {
          version: leanVersion,
          mustCarry: (tool) =>
            "subscriptionToken" in tool &&
            "syncToken" in tool &&
            "syncClient" in tool &&
            "subscriptionTokenExp" in tool &&
            "watchTokenRenewEnabled" in tool &&
            "perm" in tool,
        },
      }),
      credentials,
    },
  );
  if (boot.err !== null)
    return {
      err: boot.err,
      ...(boot.status && {
        status: boot.status,
      }),
      ...(boot.otherOrg && {
        otherOrg: true,
      }),
      ...(isRetryableStatus(boot.status) && {
        unavailable: true,
      }),
      ...(boot.errorCode === "boot_request_error" && {
        noAnswer: true,
      }),
    };
  if (boot.assetToken === undefined)
    return {
      err: PUBLIC_OUTSIDE_ORG_NOTE,
      publicOutsideOrg: true,
    };
  let subscription = getLiveSubscriptionToken(boot.data);
  let isSyncClient = boot.data.syncClient === true;
  return {
    err: null,
    token: subscription?.token,
    transport: subscription?.transport ?? (isSyncClient ? "sync" : "live"),
    ver: boot.ver,
    editor: isWriterEditor(boot),
    tokenExp: isSyncClient ? undefined : finiteNumber(boot.data.subscriptionTokenExp),
    renewable: subscription?.transport === "live" && boot.data.watchTokenRenewEnabled === true,
    ...(typeof boot.data.title === "string" && {
      title: boot.data.title,
    }),
  };
}
//@ chunk-jv307fw4.js:35071-35142 placement
function finiteNumber(subscriptionTokenExp) {
  return typeof subscriptionTokenExp === "number" && Number.isFinite(subscriptionTokenExp)
    ? subscriptionTokenExp
    : undefined;
}
//@ chunk-jv307fw4.js:35142-35203 placement
/**
 * 导出函数 `isRetryableStatus`：参数 e，返回 e !== void 0 && (e >= 500 || e === 429 || e === 408)。
 */
function isRetryableStatus(status) {
  return status !== undefined && (status >= 500 || status === 429 || status === 408);
}
//@ chunk-jv307fw4.js:35203-35780 placement
/**
 * 调用 /api/frame/watch-token 续期实时监听令牌；任何失败都返回 renew_miss（可带状态码），成功返回新令牌、版本与过期时间。
 */
async function renewWatchToken(slug, signal, credentials) {
  let response;
  try {
    response = await frameApi.post(
      `/api/frame/watch-token/${slug}?vn=${PASSIVE}`,
      {},
      {
        refreshOAuth: true,
        credentials,
        headers: buildFrameHeaders(),
        timeout: ACCESS_PROBE_TIMEOUT_MS,
        signal,
      },
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    return {
      err: "renew_miss",
    };
  }
  if (!response.ok || !response.fromFrame || response.status < 200 || response.status >= 300)
    return {
      err: "renew_miss",
      ...(response.ok && {
        status: response.status,
      }),
    };
  let data = response.data ?? {};
  let liveSubscriptionToken = getLiveSubscriptionToken(data);
  let token = liveSubscriptionToken?.transport === "live" ? liveSubscriptionToken.token : undefined;
  if (!data.ver || !SAFE_ERROR_CODE_RE.test(data.ver) || token === undefined)
    return {
      err: "renew_miss",
      status: response.status,
    };
  return {
    err: null,
    token,
    transport: "live",
    ver: data.ver,
    editor: undefined,
    tokenExp: finiteNumber(data.subscriptionTokenExp),
    renewable: true,
  };
}
//@ chunk-jv307fw4.js:35780-35848 placement
function isWriterEditor(boot) {
  return boot.assetToken !== undefined && isWriterRole(boot.data.perm?.role);
}
export {
  isRetryableStatus,
  getUntoldLiveVersion,
  markLiveVersionTold,
  checkBehindLive,
  forgetHeardVersion,
  renewWatchToken,
  fetchLiveSubscription,
  recordHeardVersion,
};
