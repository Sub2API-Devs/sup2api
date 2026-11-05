/**
 * services/artifacts/liveSubscribe.ts
 *
 * 2.1.316 新增：artifact 实时订阅
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { acceptVersionNotAhead, VERSION_TS_PREFIX_RE, PASSIVE } from "./pageScripts.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { isPublishInFlight, isOwnPublishedVer } from "./ownPublishes.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { fetchBoot } from "./boot.js";
import { PUBLIC_OUTSIDE_ORG_WATCH_CAUSE, CONTROL_PLANE_REQUEST_TIMEOUT_MS } from "./orgScope.js";
import { liveChannelCredential, isPublishingRole } from "./audience.js";
import { triState } from "./shareEntries.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-m0ks5273.js:18163-18486 placement
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
//@ chunk-m0ks5273.js:18486-18798 placement
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
//@ chunk-m0ks5273.js:18798-18968 placement
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
//@ chunk-m0ks5273.js:18968-19190 placement
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
//@ chunk-m0ks5273.js:19190-19283 placement
/**
 * 记录已听过的版本号：与给定版本相同时清除记录。
 */
function forgetHeardVersion(slug, ver) {
  let heardVersions = getLiveState().live.heardVersions;
  if (ver === undefined || heardVersions.get(slug)?.ver === ver) heardVersions.delete(slug);
}
//@ chunk-m0ks5273.js:19283-19377 placement
function maxVersion(a, b) {
  if (a === undefined || b === undefined) return a ?? b;
  let cmp = compareNumericPrefix(a, b);
  return cmp !== null && cmp < 0 ? b : a;
}
//@ chunk-m0ks5273.js:34252-35272 placement
/**
 * 获取 artifact 的实时订阅信息：拉取 boot（可走精简版本），失败时返回错误及其他组织/不可用/无应答标志；组织外公开的 artifact 返回 publicOutsideOrg；成功返回令牌、传输方式（live/sync）、版本、编辑者、过期时间、能否续期与标题。
 */
async function fetchLiveChannelToken(
  slug,
  signal,
  credentials,
  { syncLive = false, lean: leanVersion } = {},
) {
  let env = claudeAiEnvironment();
  let boot = await fetchBoot(
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
      ...(isUnavailableStatus(boot.status) && {
        unavailable: true,
      }),
      ...(boot.errorCode === "boot_request_error" && {
        noAnswer: true,
      }),
    };
  if (boot.assetToken === undefined)
    return {
      err: PUBLIC_OUTSIDE_ORG_WATCH_CAUSE,
      publicOutsideOrg: true,
    };
  let subscription = liveChannelCredential(boot.data);
  let isSyncClient = boot.data.syncClient === true;
  let row = triState(boot.data.outsideWriter);
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
    ...(boot.data.perm?.role === "owner" && {
      owner: true,
    }),
    ...(row !== undefined && {
      outsideWriter: row,
    }),
  };
}
//@ chunk-m0ks5273.js:35272-35343 placement
function finiteNumber(subscriptionTokenExp) {
  return typeof subscriptionTokenExp === "number" && Number.isFinite(subscriptionTokenExp)
    ? subscriptionTokenExp
    : undefined;
}
//@ chunk-m0ks5273.js:35343-35404 placement
/**
 * 导出函数 `isRetryableStatus`：参数 e，返回 e !== void 0 && (e >= 500 || e === 429 || e === 408)。
 */
function isUnavailableStatus(status) {
  return status !== undefined && (status >= 500 || status === 429 || status === 408);
}
//@ chunk-m0ks5273.js:35404-35981 placement
/**
 * 调用 /api/frame/watch-token 续期实时监听令牌；任何失败都返回 renew_miss（可带状态码），成功返回新令牌、版本与过期时间。
 */
async function renewLiveChannelToken(slug, signal, credentials) {
  let response;
  try {
    response = await frameApi.post(
      `/api/frame/watch-token/${slug}?vn=${PASSIVE}`,
      {},
      {
        refreshOAuth: true,
        credentials,
        headers: buildFrameHeaders(),
        timeout: CONTROL_PLANE_REQUEST_TIMEOUT_MS,
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
  let liveState = liveChannelCredential(data);
  let token = liveState?.transport === "live" ? liveState.token : undefined;
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
//@ chunk-m0ks5273.js:35981-36049 placement
function isWriterEditor(boot) {
  return boot.assetToken !== undefined && isPublishingRole(boot.data.perm?.role);
}
export {
  checkBehindLive,
  forgetHeardVersion,
  isUnavailableStatus,
  renewLiveChannelToken,
  fetchLiveChannelToken,
  recordHeardVersion,
  getUntoldLiveVersion,
  markLiveVersionTold,
};
