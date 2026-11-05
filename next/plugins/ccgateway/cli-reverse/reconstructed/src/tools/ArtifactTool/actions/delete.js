/**
 * tools/ArtifactTool/actions/delete.ts
 *
 * 删除 Artifact（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zke6e043.js (11)
 * attribution: placement 11
 */
import { isCoworkHostSession } from "../../../services/artifacts/artifactToolGates.js";
import { userCanDeleteThemselves } from "../promptText.js";
import { isRemoteManagedEnvironment } from "../../../utils/remoteEnvironment.js";
import {
  frameVerbRelayActive,
  frameApi,
  threwOnRelayLeg,
  isFrameNotFoundBody,
  CCR_CREDENTIAL_REFUSED_PREFIX,
  fromUpstream,
} from "../../../services/artifacts/frameRelay.js";
import { lit } from "../../../services/analytics/safeMetadata.js";
import { buildFrameHeaders } from "../../../services/artifacts/frameApi.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { sleep } from "../../../utils/sleep.js";
import { AbortError } from "../../../utils/errors.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { describeArtifactAuthFailure } from "../../../services/artifacts/frameFlags.js";
import { uuidSlugFromUrl, ARTIFACT_DELETED_NOTE_TAG } from "../constants.js";
import { persistBridgeArtifactFrames } from "../../../utils/sessionTagRefresh.js";
import { getLiveState, revokeCodeliveredFollowups } from "../../../services/liveReplica/liveReplica.js";
import { unlinkPath } from "../../../services/artifacts/shareEntries.js";
import { endFrameLiveWatchOfDeletedArtifact } from "../../../services/artifacts/frameLive.js";
import { leaveArtifactRoomOnStop } from "../../../tasks/MonitorWsTask/MonitorWsTask.js";
import { env } from "../../../utils/env.js";
import { durableRowFor, unwatchArtifactDurably } from "../../../services/artifacts/durableWatch.js";
import { logError } from "../../../utils/log.js";

//@ chunk-zke6e043.js:978-1473 placement
function deleteUnavailableReason() {
  return isCoworkHostSession()
    ? `Deleting Artifacts isn't available in this cloud session right now, so nothing was deleted; do not retry here. If the Artifact is the user's own, ${userCanDeleteThemselves(true)}`
    : "Deleting Artifacts isn't available in this cloud session right now, so nothing was deleted; do not retry here. If the Artifact is the user's own, they can delete it themselves on claude.ai from the Artifact's own menu, or with `/artifacts` in Claude Code on their own machine (press d on the selected one).";
}
//@ chunk-zke6e043.js:1473-1507 placement
/**
 * 判断删除是否走直连（有直连且不在 frame 中继模式）。
 */
function canDeleteViaDirectRoute() {
  return isRemoteManagedEnvironment() && !frameVerbRelayActive();
}
//@ chunk-zke6e043.js:1507-1584 placement
/**
 * 中继不可用时的删除结果（失败、0 状态、relay 路径）。
 */
var RELAY_UNAVAILABLE_DELETE_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
//@ chunk-zke6e043.js:1584-1764 placement
function deleteUnconfirmedMessage(reason) {
  return `Couldn't confirm the delete (the cloud relay failed: ${reason}) \u2014 it may have gone through; check with action "list" before telling the user or trying again.`;
}
//@ chunk-zke6e043.js:1764-1789 placement
/**
 * 删除请求的响应体上限与重试退避区间。
 */
var DELETE_MAX_RESPONSE_BYTES = 65536;
var DELETE_RETRY_DEFAULT_MS = 1000;
var DELETE_RETRY_MAX_MS = 1e4;
//@ chunk-zke6e043.js:1789-1842 placement
/**
 * 字符串去空白，非字符串返回空串。
 */
function trimmedOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}
//@ chunk-zke6e043.js:1842-2156 placement
/**
 * 删除 Artifact 的埋点字段：来源（工具/对话框）、路径（relay/direct）、是否本会话创建、存在时长、距上次更新时长、是否重试。
 */
function deleteTelemetryFields(context, retried, route) {
  return {
    source: context.source === "tool" ? lit("tool") : lit("dialog"),
    route: route === "relay" ? lit("relay") : lit("direct"),
    ...(context.sessionMinted !== undefined && {
      session_minted: context.sessionMinted,
    }),
    ...(context.ageSeconds !== undefined && {
      age_s: context.ageSeconds,
    }),
    ...(context.sinceUpdateSeconds !== undefined && {
      since_update_s: context.sinceUpdateSeconds,
    }),
    ...(retried && {
      retried: true,
    }),
  };
}
//@ chunk-zke6e043.js:2156-4854 placement
async function deleteArtifact(slug, credentials, options) {
  let sendDelete = () =>
    canDeleteViaDirectRoute()
      ? Promise.resolve(RELAY_UNAVAILABLE_DELETE_RESULT)
      : frameApi.deleteRelayOnly(`/api/frame/${encodeURIComponent(slug)}`, {
          refreshOAuth: true,
          headers: buildFrameHeaders(),
          timeout: 15000,
          maxContentLength: DELETE_MAX_RESPONSE_BYTES,
          signal: options.signal,
          credentials,
        });
  let response;
  let retried = false;
  try {
    response = await sendDelete();
    if (
      response.ok &&
      response.fromFrame &&
      (response.status === 409 || response.status === 429 || response.status === 503)
    ) {
      let retryAfterHeader = response.response.headers?.["retry-after"];
      let min = Math.min(
        parseRetryAfterMs(typeof retryAfterHeader === "string" ? retryAfterHeader : undefined) ??
          DELETE_RETRY_DEFAULT_MS,
        DELETE_RETRY_MAX_MS,
      );
      await sleep(min, options.signal, {
        abortError: () => new AbortError(),
      });
      retried = true;
      response = await sendDelete();
    }
  } catch (error) {
    if (isCancel(error) || error instanceof AbortError || options.signal?.aborted) throw error;
    let onRelayLeg = threwOnRelayLeg(error);
    logFeatureBad(
      "artifact_delete",
      "request_error",
      deleteTelemetryFields(options, retried, onRelayLeg ? "relay" : "direct"),
    );
    return {
      err: onRelayLeg
        ? deleteUnconfirmedMessage("no answer")
        : "Couldn't delete the Artifact (network error)",
      reason: "request_error",
    };
  }
  let telemetry = deleteTelemetryFields(options, retried, response.route);
  if (!response.ok) {
    if (response.reason === "relay-unavailable" || response.reason === "relay-not-served") {
      logFeatureBad("artifact_delete", response.reason.replace(/-/g, "_"), {
        ...telemetry,
        status: response.status,
      });
      return {
        err: deleteUnavailableReason(),
        reason: "unavailable",
      };
    }
    logFeatureBad("artifact_delete", response.reason, telemetry);
    return {
      err:
        response.reason === "no-auth"
          ? describeArtifactAuthFailure(response.detail)
          : `Artifact delete unavailable: ${response.reason}`,
      reason: "unavailable",
    };
  }
  if (!response.fromFrame && (response.status < 200 || response.status >= 300)) {
    logFeatureBad("artifact_delete", "relay_error", {
      ...telemetry,
      status: response.status,
    });
    return {
      err: deleteUnconfirmedMessage(`HTTP ${response.status}`),
      reason: "http_failed",
      status: response.status,
    };
  }
  if (response.status === 404) {
    if (!isFrameNotFoundBody(response.data)) {
      logFeatureBad("artifact_delete", "not_found_foreign", {
        ...telemetry,
        status: 404,
      });
      return {
        err: `Couldn't confirm the delete: the "not found" answer did not come from the Artifact service (a proxy or network edge may have answered), so the Artifact may still be online \u2014 check the Artifacts list again before treating it as deleted.`,
        reason: "http_failed",
        status: 404,
      };
    }
    logFeatureSad("artifact_delete", "not_found", telemetry);
    return {
      err: null,
      alreadyGone: true,
    };
  }
  if (response.status === 403) {
    let fields = trimmedOrEmpty(response.data);
    if (/^not owner\b/.test(fields)) {
      logFeatureSad("artifact_delete", "not_owner", telemetry);
      return {
        err: "Only the Artifact's owner can delete it.",
        reason: "not_owner",
        status: 403,
      };
    }
    if (fields.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)) {
      logFeatureBad("artifact_delete", "ccr_credential_refused", telemetry);
      return {
        err: deleteUnavailableReason(),
        reason: "unavailable",
        status: 403,
      };
    }
  }
  if (response.status < 200 || response.status >= 300) {
    logFeatureBad("artifact_delete", "http_failed", {
      ...telemetry,
      status: response.status,
    });
    return {
      err:
        response.status >= 500
          ? `Couldn't confirm the delete (HTTP ${response.status}) \u2014 the Artifact may already be unreachable; retry once.`
          : `Couldn't delete the Artifact (HTTP ${response.status})`,
      reason: "http_failed",
      status: response.status,
    };
  }
  if (response.status !== 204 || (response.route === "relay" && !fromUpstream(response))) {
    logFeatureBad("artifact_delete", "ok_foreign", {
      ...telemetry,
      status: response.status,
    });
    return {
      err: `Couldn't confirm the delete: the answer (HTTP ${response.status}) was not the Artifact service's own, so the Artifact may still be online \u2014 check the Artifacts list again before treating it as deleted.`,
      reason: "http_failed",
      status: response.status,
    };
  }
  logFeatureOk("artifact_delete", telemetry);
  return {
    err: null,
    alreadyGone: false,
  };
}
//@ chunk-zke6e043.js:4854-5450 placement
/**
 * 从 AppState 中移除某个 slug：删掉对应的 frameUrls、artifactRefs、读版本与观察者条目；没有变化时返回原状态。
 */
function forgetSlugInAppState(appState, slug) {
  let keys = Object.keys(appState.frameUrls);
  let filtered = keys.filter((key) => uuidSlugFromUrl(appState.frameUrls[key].url) !== slug);
  let keptRefs = appState.artifactRefs?.filter((artifactRef) => artifactRef.slug !== slug);
  let refsChanged = (keptRefs?.length ?? 0) !== (appState.artifactRefs?.length ?? 0);
  let hadReadVersion = appState.artifactReadVersions !== undefined && slug in appState.artifactReadVersions;
  let hadObservers = appState.artifactReadObservers !== undefined && slug in appState.artifactReadObservers;
  if (filtered.length === keys.length && !refsChanged && !hadReadVersion && !hadObservers) return appState;
  let { [slug]: removedVersion, ...remainingVersions } = appState.artifactReadVersions ?? {};
  let { [slug]: removedObservers, ...remainingObservers } = appState.artifactReadObservers ?? {};
  return {
    ...appState,
    frameUrls: Object.fromEntries(filtered.map((key) => [key, appState.frameUrls[key]])),
    ...(refsChanged && {
      artifactRefs: keptRefs,
    }),
    ...(hadReadVersion && {
      artifactReadVersions: remainingVersions,
    }),
    ...(hadObservers && {
      artifactReadObservers: remainingObservers,
    }),
  };
}
//@ chunk-zke6e043.js:5450-5957 placement
/**
 * Artifact 被删除后清理本地状态：从 AppState 移除 frameUrls/引用/读版本，解除路径链接，清理类型创建、协调编辑者、监视与 live 文档订阅，必要时注销 durable 订阅。
 */
function forgetDeletedArtifact(slug, options) {
  let nextFrameUrls;
  options.updateAppState((appState) => {
    let nextState = forgetSlugInAppState(appState, slug);
    nextFrameUrls = nextState === appState ? undefined : nextState.frameUrls;
    return nextState;
  });
  if (nextFrameUrls !== undefined) persistBridgeArtifactFrames(nextFrameUrls);
  let { shareStatus, createdFromType, deferredSurface, remoteControlSkippedSlugs, coordinatorEditors } =
    getLiveState();
  for (let [filePath, entrySlug] of shareStatus.filePathToSlug) if (entrySlug === slug) unlinkPath(filePath);
  for (let [key, entry] of createdFromType) if (entry.slug === slug) createdFromType.delete(key);
  deferredSurface.delete(slug);
  remoteControlSkippedSlugs.delete(slug);
  revokeCodeliveredFollowups(slug, "page_gone");
  coordinatorEditors.delete(slug);
  endFrameLiveWatchOfDeletedArtifact(slug, options.context);
  getLiveState().liveDocWatch.stop?.(slug);
  leaveArtifactRoomOnStop(slug);
  if (env.CLAUDE_CODE_REMOTE || durableRowFor(slug) !== undefined)
    unwatchArtifactDurably({
      slug,
      context: options.context,
    }).catch(logError);
}
//@ chunk-zke6e043.js:5957-6258 placement
/**
 * 用户在 /artifacts 删除了 Artifact 的提示：链接对所有人失效、不可恢复、不能再发布到原地址，不要再把该 url 传给 Artifact 工具。
 */
function userDeletedArtifactNote(url) {
  return `<${ARTIFACT_DELETED_NOTE_TAG} url="${url}"/> The user deleted this Artifact from /artifacts: its link no longer works for anyone, it cannot be restored, and it cannot be published to again \u2014 publishing the same file creates a new Artifact at a new URL. Do not pass this url to the Artifact tool.`;
}
export {
  canDeleteViaDirectRoute,
  deleteUnavailableReason,
  deleteArtifact,
  forgetDeletedArtifact,
  userDeletedArtifactNote,
};
