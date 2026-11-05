/**
 * services/artifacts/comments/threadScanner.ts
 *
 * 2.1.316 新增：扫描 artifact 评论线程、发现新评论
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import {
  resetLedgerSlug,
  flushAutoreactLedger,
  gatewayAccountUuidLower,
  takeLedgerEntry,
  claimLedgerOwnership,
} from "./autoreactLedger.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../analytics/featureTelemetry.js";
import {
  getMaxAutoTurns,
  coalesceMs,
  getConfirmDwellMs,
  ceilRetryDelay,
  effectiveReadRetryCount,
  computeAutoReactBackoff,
  isCommentReadGated,
  refreshFastAckFlag,
  getAutoReactRateLimit,
} from "./autoreactGates.js";
import { sanitizeDisplayTitle } from "../../../utils/textNormalize.js";
import { foldFullwidthColon, updateUnreadCounts, censusGeneration } from "./threadPrompts.js";
import { QUOTE_HOMOGLYPHS, SINGLE_QUOTE_RUNS } from "../../../tools/ArtifactTool/artifactUrls.js";
import { getSyntheticToolMessages, isAutoreactArmed } from "./postReply.js";
import {
  isSlugYielded,
  armSummonState,
  getSummonWakeState,
  isSlugStoppedAnywhere,
  emitSummonArm,
  scanStamp,
} from "../summonArms.js";
import { revertGoneTakersNow } from "../replyYield.js";
import { createDenialTrackingState } from "../../../utils/permissions/denialTracking.js";
import { readArtifactComments } from "./commentsRead.js";
import { isFrameLiveTokenLeaseEnabled } from "../frameFlags.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import {
  processArtifactThread,
  collectPendingSummons,
  localSourcePathIfEditCapable,
  checkReplyPermission,
} from "./autoreact.js";
import {
  parseTimestamp,
  isOwnPostedReply,
  getCommentAuthorKind,
  hasCommentSentAfter,
} from "./commentState.js";
import { runWhenForegroundIdle } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { CLASSIFIER_UNAVAILABLE_REASON } from "../../../types/permissions.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import {
  getAutoModeClassifierRole,
  canAttachServerClassifierBeta,
} from "../../../utils/permissions/serverClassifier/arbiter.js";
import { hasSummonClaim } from "./autoreactState.js";
import { getPermissionPromptPerson } from "../../../utils/permissions/permissionPromptHost.js";
import { isHostEntrypoint } from "../../../utils/entrypointKinds.js";
import { canHandToThreadAgent } from "./backgroundAgent.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";

//@ chunk-c0pq6qyx.js:60542-60688 placement
/**
 * 重置某 artifact 的自动回复记录：台账条目清空线程，内存状态清掉线程与基线并更新账号，随后立即刷写台账。
 */
function resetAutoReactForSlug(slug) {
  resetLedgerSlug(slug);
  let artifactState = getLiveState().autoReact.artifacts.get(slug);
  if (!artifactState) {
    flushAutoreactLedger({
      flush: true,
    });
    return;
  }
  clearArtifactThreads(artifactState);
  artifactState.accountUuid = gatewayAccountUuidLower() ?? artifactState.accountUuid;
  flushAutoreactLedger({
    flush: true,
  });
}
//@ chunk-c0pq6qyx.js:60688-60799 placement
function clearArtifactThreads(slug) {
  slug.threads.clear();
  slug.baselined = false;
  slug.everBaselined = false;
  slug.stampHighWater = null;
  slug.lastReadDigest = null;
}
//@ chunk-c0pq6qyx.js:60799-61458 placement
/**
 * 用台账条目恢复某 artifact 的自动回复状态：时间戳高水位、基线标志、回合时间戳、各线程已见/已发送/自己的回复 id 等，并打点。
 */
function rehydrateFromLedger(state, ledgerEntry) {
  if (ledgerEntry === null) return;
  state.stampHighWater = ledgerEntry.stampHighWater;
  state.everBaselined = ledgerEntry.everBaselined;
  state.everHadThreads = ledgerEntry.everHadThreads;
  state.turnTimestamps = [...ledgerEntry.turnTimestamps];
  state.lastScanAt = ledgerEntry.savedAt;
  for (let thread of ledgerEntry.threads ?? [])
    state.threads.set(thread.id, {
      lastAutoReplyAt: null,
      activatedAt: thread.activatedAt,
      activatedAtObserved: thread.activatedAtObserved,
      seen: new Set(thread.seen),
      sentToClaudeAt: new Map(thread.sent),
      ownReplyIds: new Set(thread.ownReplyIds),
      ...(thread.ownReplyIdsIncomplete === true && {
        ownReplyIdsIncomplete: true,
      }),
      consecutiveAuto: 0,
      breakerOpen: false,
      consecutivePipelineDenials: 0,
      deferNoticed: new Set(),
    });
  logFeatureOk("artifact_comments_autoreact", {
    ledger_rehydrated: true,
    ledger_threads: ledgerEntry.threads?.length ?? -1,
  });
}
//@ chunk-c0pq6qyx.js:61458-62128 placement
/**
 * 取（或新建）某 artifact 的自动回复内存状态；新建时从台账恢复；账号变化且不在扫描中时清空线程并换账号。
 */
function getAutoReactArtifactState(slug) {
  let { artifacts } = getLiveState().autoReact;
  let state = artifacts.get(slug);
  let accountUuid = gatewayAccountUuidLower();
  if (state && accountUuid !== null && state.accountUuid !== accountUuid && !state.scanning) {
    if (state.accountUuid !== null) clearArtifactThreads(state);
    state.accountUuid = accountUuid;
  }
  if (!state) {
    state = {
      threads: new Map(),
      turnTimestamps: [],
      forecastTimestamps: [],
      scanning: false,
      defaultModeNoticed: false,
      autoModeDeclineNoticed: false,
      heldReplyDeclined: false,
      heldReplyChain: null,
      lastReplyDeclinedByAutoMode: false,
      capNoticed: false,
      ruleWithheldNoted: false,
      planModeNoticed: false,
      lastProbeAllowed: false,
      lastProbeDeniedBy: null,
      lastScanAt: null,
      pipelineDeniedNoticed: false,
      busyValveNoticed: false,
      baselined: false,
      everBaselined: false,
      everHadThreads: false,
      stampHighWater: null,
      lastReadDigest: null,
      emptyHintReadAt: null,
      accountUuid,
    };
    artifacts.set(slug, state);
    rehydrateFromLedger(state, takeLedgerEntry(slug));
  }
  return state;
}
//@ chunk-c0pq6qyx.js:62128-62240 placement
/**
 * 清掉一小时前的自动回合时间戳，返回本小时自动回合数是否仍低于上限。
 */
function withinHourlyTurnCap(artifactState, now) {
  artifactState.turnTimestamps = artifactState.turnTimestamps.filter(
    (turnTimestamp) => now - turnTimestamp < 3600000,
  );
  return artifactState.turnTimestamps.length < getMaxAutoTurns();
}
//@ chunk-c0pq6qyx.js:62240-62403 placement
/**
 * 取 artifact 名字并做成带双引号的安全显示文本（内部引号与同形字换成单引号）；取不到时返回给定的默认值。
 */
function quoteArtifactName(getTitle, url) {
  let title = getTitle?.();
  if (title === undefined || title === "") return url;
  let safeTitle = sanitizeDisplayTitle(title);
  if (safeTitle === null) return url;
  return `"${foldFullwidthColon(safeTitle.replace(/"/g, "'").replace(QUOTE_HOMOGLYPHS, "'").replace(SINGLE_QUOTE_RUNS, "'"))}"`;
}
//@ chunk-c0pq6qyx.js:62403-62620 placement
function splitPublishMessages(transcript) {
  let publishTranscript = transcript.publishTranscript;
  let publishMessages = publishTranscript !== undefined ? getSyntheticToolMessages(publishTranscript) : [];
  if (publishMessages.length === 0)
    return {
      publishMessages: [],
      publishTranscript,
    };
  return {
    publishMessages: transcript.context.messages.at(-1) === publishMessages.at(-1) ? [] : publishMessages,
    publishTranscript: undefined,
  };
}
//@ chunk-c0pq6qyx.js:62620-62730 placement
function appendContextMessages(context, publishMessages) {
  return {
    ...context,
    messages: [...context.messages, ...(context.sameTurnToolUses ?? []), ...publishMessages],
    sameTurnToolUses: undefined,
  };
}
//@ chunk-c0pq6qyx.js:62730-62917 placement
function withPublishTranscript(request) {
  if (request.publishTranscript === undefined) return request;
  let { publishMessages, publishTranscript } = splitPublishMessages(request);
  if (publishMessages.length === 0) return request;
  return {
    ...request,
    publishTranscript,
    context: appendContextMessages(request.context, publishMessages),
  };
}
//@ chunk-c0pq6qyx.js:62917-65326 placement
/**
 * 安排一次评论线程扫描（防抖合并）：根据是 seed/confirm/reentry/普通唤醒决定延迟，正在扫描时登记重扫参数，已有定时器时合并待确认/待播种的唤醒并重设定时器；到点后执行扫描。
 */
function scheduleThreadScan(wake) {
  if (!isAutoreactArmed()) return;
  if (isSlugYielded(wake.slug)) revertGoneTakersNow();
  let suppressSummonStatus = armSummonState(wake.slug);
  let wiring = wake.getWiring?.();
  let context = wiring?.context ?? wake.context;
  let { publishMessages, publishTranscript } = splitPublishMessages({
    publishTranscript: wiring !== undefined ? wiring.publishTranscript : wake.publishTranscript,
    context,
  });
  let wakeArgs = {
    ...wake,
    suppressSummonStatus: wake.suppressSummonStatus ?? suppressSummonStatus,
    pickUpRecentSummons: wake.pickUpRecentSummons === true && wake.seed === true && !suppressSummonStatus,
    publishTranscript,
    context: {
      ...(publishMessages.length > 0 ? appendContextMessages(context, publishMessages) : context),
      permissionLayers: undefined,
      abortController: wake.abort,
      onPermissionDenial: undefined,
      localDenialTracking: createDenialTrackingState(),
    },
  };
  let artifactState = getAutoReactArtifactState(wakeArgs.slug);
  let wakeState = getSummonWakeState(wakeArgs.slug);
  let minGapMs = coalesceMs();
  let now = Date.now();
  let startTime = performance.now();
  let isKick = wakeArgs.seed !== true && wakeArgs.confirm !== true && wakeArgs.reentry !== true;
  if (isKick) {
    wakeState.kickSettled = false;
    wakeState.newestKickAt = startTime;
    wakeState.kickCount++;
  }
  wakeState.lastWakeArgs = wake;
  let confirmDelayMs = wakeState.kickSettled
    ? 0
    : Math.min(Math.max(0, wakeState.newestKickAt + getConfirmDwellMs() - startTime), getConfirmDwellMs());
  if (wakeState.coalesceTimer || artifactState.scanning) {
    if (wakeArgs.idlePass !== undefined) wakeState.idlePassOwed = wakeArgs.idlePass;
    let pendingConfirm = wakeState.pendingConfirm;
    if (isKick && wakeState.coalesceTimer && pendingConfirm !== null) {
      let wake = pendingConfirm.wake;
      let mergedWakeArgs = {
        ...wakeArgs,
        confirm: true,
        ...(wake.confirmBase !== undefined && {
          confirmBase: wake.confirmBase,
        }),
        ...(wake.confirmAfter !== undefined && {
          confirmAfter: wake.confirmAfter,
        }),
        suppressSummonStatus: wake.suppressSummonStatus !== false && wakeArgs.suppressSummonStatus,
      };
      pendingConfirm.wake = mergedWakeArgs;
      let min = Math.min(startTime + getConfirmDwellMs(), pendingConfirm.armedAt + minGapMs);
      clearTimeout(wakeState.coalesceTimer);
      pendingConfirm.dueAt = Math.max(min, pendingConfirm.dueAt);
      wakeState.coalesceTimer = setTimeout(
        runScheduledScan,
        ceilRetryDelay(pendingConfirm.dueAt - startTime),
        wakeState,
        mergedWakeArgs,
      );
    }
    let pendingSeed = wakeState.pendingSeed;
    if (wakeState.coalesceTimer && pendingSeed !== null && wakeArgs.confirm !== true) {
      let wake = pendingSeed.wake;
      let isDeferredSeed = wakeArgs.seed === true && wakeArgs.reentry !== true && (wakeArgs.deferMs ?? 0) > 0;
      let delayMs =
        wakeArgs.seed === true
          ? Math.max(minGapMs, isDeferredSeed ? (wakeArgs.deferMs ?? 0) : 0)
          : confirmDelayMs;
      let dueAt = isKick ? startTime + delayMs : Math.min(pendingSeed.dueAt, startTime + delayMs);
      let pending = {
        ...wakeArgs,
        seed: true,
        ...((wake.pickUpRecentSummons === true || wakeArgs.pickUpRecentSummons === true) && {
          pickUpRecentSummons: true,
        }),
        suppressSummonStatus: wake.suppressSummonStatus !== false && wakeArgs.suppressSummonStatus,
      };
      wakeState.pendingSeed = isDeferredSeed
        ? {
            wake: pending,
            dueAt,
          }
        : null;
      wakeState.lastScanScheduledAt = now + (dueAt - startTime);
      clearTimeout(wakeState.coalesceTimer);
      wakeState.coalesceTimer = setTimeout(
        runScheduledScan,
        ceilRetryDelay(dueAt - startTime),
        wakeState,
        pending,
      );
    }
    wakeState.rescanWanted = artifactState.scanning;
    if (artifactState.scanning) {
      let rescanArgs = wakeState.rescanArgs;
      let pendingSeed =
        rescanArgs?.seed === true && wakeArgs.seed !== true
          ? {
              ...wakeArgs,
              seed: true,
              pickUpRecentSummons: rescanArgs.pickUpRecentSummons,
            }
          : wakeArgs;
      wakeState.rescanArgs =
        rescanArgs !== null && rescanArgs.suppressSummonStatus === false
          ? {
              ...pendingSeed,
              suppressSummonStatus: false,
            }
          : pendingSeed;
    }
    return;
  }
  let withinMinGap = wakeState.lastScanScheduledAt !== 0 && now - wakeState.lastScanScheduledAt < minGapMs;
  let isDeferredSeed = wakeArgs.seed === true && wakeArgs.reentry !== true && (wakeArgs.deferMs ?? 0) > 0;
  let delayMs =
    wakeArgs.confirm === true
      ? confirmDelayMs
      : isDeferredSeed
        ? Math.max(minGapMs, wakeArgs.deferMs ?? 0)
        : wakeArgs.seed === true || withinMinGap
          ? minGapMs
          : wakeArgs.reentry === true
            ? confirmDelayMs
            : 0;
  if (wakeArgs.confirm !== true) wakeState.lastScanScheduledAt = now + delayMs;
  wakeState.pendingConfirm =
    wakeArgs.confirm === true
      ? {
          wake: wakeArgs,
          armedAt: startTime,
          dueAt: startTime + delayMs,
        }
      : null;
  wakeState.pendingSeed = isDeferredSeed
    ? {
        wake: wakeArgs,
        dueAt: startTime + delayMs,
      }
    : null;
  wakeState.coalesceTimer = setTimeout(runScheduledScan, ceilRetryDelay(delayMs), wakeState, wakeArgs);
}
//@ chunk-c0pq6qyx.js:65326-65554 placement
function runScheduledScan(wakeState, wake) {
  wakeState.coalesceTimer = null;
  wakeState.pendingConfirm = null;
  wakeState.pendingSeed = null;
  let pendingScan = scanArtifactThreads(withPublishTranscript(wake))
    .catch(() => {
      logFeatureSad("artifact_comments_autoreact", "scan_error");
    })
    .finally(() => {
      if (wakeState.inFlightScan === pendingScan) wakeState.inFlightScan = null;
    });
  wakeState.inFlightScan = pendingScan;
}
//@ chunk-c0pq6qyx.js:65554-65793 placement
function clearReadRetry(wakeState, wake) {
  if (wake && wakeState.readRetryAttempts > 0)
    logFeatureOk("artifact_comments_autoreact", {
      read_retry_cleared: true,
      retry_attempts: wakeState.readRetryAttempts,
    });
  wakeState.readRetryAttempts = 0;
  if (wakeState.readRetryTimer !== null) {
    clearTimeout(wakeState.readRetryTimer);
    wakeState.readRetryTimer = null;
  }
}
//@ chunk-c0pq6qyx.js:65793-66124 placement
/**
 * 评论读取失败后按退避安排重试扫描；超过最大次数时打点放弃并清零。
 */
function scheduleReadRetry(scannerState, wake, retryDelayMs) {
  if (scannerState.readRetryTimer !== null) return;
  let readRetryAttempts = scannerState.readRetryAttempts;
  let retryCount = effectiveReadRetryCount();
  if (retryCount === 0) {
    scannerState.readRetryAttempts = 0;
    return;
  }
  if (readRetryAttempts >= retryCount) {
    logFeatureSad("artifact_comments_autoreact", "read_retry_gave_up", {
      retry_attempts: readRetryAttempts,
    });
    scannerState.readRetryAttempts = 0;
    return;
  }
  scannerState.readRetryAttempts = readRetryAttempts + 1;
  scannerState.readRetryTimer = setTimeout(
    runReadRetry,
    computeAutoReactBackoff(readRetryAttempts, retryDelayMs),
    scannerState,
    wake,
  );
  scannerState.readRetryTimer.unref?.();
}
//@ chunk-c0pq6qyx.js:66124-66324 placement
function runReadRetry(wakeState, wake) {
  wakeState.readRetryTimer = null;
  if (isSlugStoppedAnywhere(wake.slug) || wake.abort.signal.aborted) {
    wakeState.readRetryAttempts = 0;
    return;
  }
  scheduleThreadScan({
    ...wake,
    confirm: undefined,
    confirmBase: undefined,
    confirmAfter: undefined,
    idlePass: undefined,
    reentry: true,
  });
}
//@ chunk-c0pq6qyx.js:66324-66337 placement
var EMPTY_THREAD_GRACE_MS = 60000;
//@ chunk-c0pq6qyx.js:66337-67161 placement
/**
 * 对还没有任何评论线程的 artifact 提前完成基线：确认没有待处理唤醒、扫描、重试，自动回复已开启且读取不受规则限制后，取消定时器、记基线与空摘要并刷写台账；返回是否完成。
 */
function settleEmptyArtifact(slug, wakeSnapshot, readAt) {
  let wakeState = getSummonWakeState(slug);
  let lastWakeArgs = wakeState.lastWakeArgs;
  let artifactState = getLiveState().autoReact.artifacts.get(slug);
  if (
    lastWakeArgs === null ||
    artifactState === undefined ||
    wakeState.coalesceTimer === null ||
    wakeState.kickCount !== wakeSnapshot.kickCount ||
    wakeState.cancelGeneration !== wakeSnapshot.cancelGeneration ||
    wakeState.pendingConfirm !== null ||
    wakeState.readRetryTimer !== null ||
    wakeState.idlePassOwed !== null ||
    artifactState.scanning ||
    artifactState.threads.size > 0 ||
    artifactState.everHadThreads ||
    !isAutoreactArmed() ||
    isSlugStoppedAnywhere(slug)
  )
    return false;
  let context = lastWakeArgs.getWiring?.()?.context ?? lastWakeArgs.context;
  if (
    isCommentReadGated(
      {
        ...context,
        permissionLayers: undefined,
      },
      {
        slug,
        env: lastWakeArgs.env,
      },
      lastWakeArgs.url,
    )
  )
    return false;
  if (artifactState.ruleWithheldNoted) {
    artifactState.ruleWithheldNoted = false;
    emitSummonArm(getLiveState().live, slug);
  }
  clearTimeout(wakeState.coalesceTimer);
  wakeState.coalesceTimer = null;
  wakeState.pendingSeed = null;
  wakeState.lastScanScheduledAt = 0;
  claimLedgerOwnership(context.storageV5);
  clearReadRetry(wakeState, false);
  artifactState.lastScanAt = Date.now();
  artifactState.baselined = true;
  artifactState.everBaselined = true;
  artifactState.lastReadDigest = digestThreads([], artifactState);
  artifactState.emptyHintReadAt = readAt;
  artifactState.stampHighWater ??= new Date(readAt - EMPTY_THREAD_GRACE_MS).toISOString();
  updateUnreadCounts(slug, [], censusGeneration(slug));
  flushAutoreactLedger();
  return true;
}
//@ chunk-c0pq6qyx.js:67161-70917 placement
/**
 * 扫描单个 artifact 的评论线程，处理空闲补扫、忙碌跳过并派发新评论。
 */
async function scanArtifactThreads(request) {
  let summonWakeState = getSummonWakeState(request.slug);
  let idlePassOwed = summonWakeState.idlePassOwed;
  summonWakeState.idlePassOwed = null;
  let idlePass =
    request.idlePass === "owed" || idlePassOwed === "owed"
      ? "owed"
      : (request.idlePass ?? idlePassOwed ?? undefined);
  if (isSlugStoppedAnywhere(request.slug)) return;
  let { slug, url, tool, context, notify } = request;
  if (
    isCommentReadGated(
      context,
      {
        slug,
        env: request.env,
      },
      url,
    )
  ) {
    let autoReactArtifactState = getAutoReactArtifactState(slug);
    if (request.seed === true) autoReactArtifactState.baselined = false;
    if (!autoReactArtifactState.ruleWithheldNoted) {
      autoReactArtifactState.ruleWithheldNoted = true;
      logFeatureSad("artifact_comments_autoreact", "rule_withheld");
      emitSummonArm(getLiveState().live, slug);
    }
    return;
  }
  if (getAutoReactArtifactState(slug).ruleWithheldNoted) {
    getAutoReactArtifactState(slug).ruleWithheldNoted = false;
    emitSummonArm(getLiveState().live, slug);
  }
  let artifactName = quoteArtifactName(request.getTitle, url);
  claimLedgerOwnership(context.storageV5);
  let scanState = getAutoReactArtifactState(slug);
  scanState.scanning = true;
  let stamp = scanStamp(slug);
  let actOnFirstSight = scanState.baselined && request.seed !== true;
  let { stampHighWater, emptyHintReadAt } = scanState;
  if (request.seed === true) scanState.baselined = false;
  let { cancelGeneration, newestKickAt } = summonWakeState;
  let confirmDwellMs = getConfirmDwellMs();
  let confirmDwellElapsed = confirmDwellMs === 0 || performance.now() - newestKickAt >= confirmDwellMs;
  let baselineKind = "unread";
  let confirmBase;
  let sawError = false;
  let partial = false;
  let outcome = null;
  try {
    let generation = censusGeneration(slug);
    let [, artifactComments] = await Promise.all([
      refreshFastAckFlag(),
      readArtifactComments(
        {
          slug,
          env: request.env,
        },
        context.abortController.signal,
        context.credentials,
        request.confirm === true ? "artifact_autoreact_confirm_read" : "artifact_autoreact_scan_read",
        {
          skipBootProbe: isFrameLiveTokenLeaseEnabled(),
        },
      ),
    ]);
    let pickUpRecentSummons = request.pickUpRecentSummons === true;
    if (artifactComments.err !== null) {
      logFeatureSad("artifact_comments_autoreact", "read_failed", {
        retryable: artifactComments.retryable === true,
        retry_attempts: summonWakeState.readRetryAttempts,
      });
      scanState.lastReadDigest = null;
      partial = idlePass === "owed";
      if (artifactComments.retryable === true)
        outcome = {
          retryAfterMs: artifactComments.retryAfterMs,
        };
      else clearReadRetry(summonWakeState, false);
      if (
        artifactComments.status === 401 ||
        artifactComments.status === 403 ||
        artifactComments.status === 404
      )
        request.onReadRefused?.();
      return;
    }
    clearReadRetry(summonWakeState, true);
    scanState.lastScanAt = Date.now();
    if (artifactComments.threadsDegraded === true) {
      scanState.everHadThreads = true;
      logFeatureSad("artifact_comments_autoreact", "read_degraded");
      scanState.lastReadDigest = null;
      partial = idlePass === "owed";
      return;
    }
    if (artifactComments.threadsDropped === true) partial = idlePass === "owed";
    if (scanStamp(slug) === stamp)
      updateUnreadCounts(
        slug,
        artifactComments.threads,
        generation,
        artifactComments.threadsDropped === true,
      );
    let newThreads =
      artifactComments.threadsDropped === true || scanStamp(slug) !== stamp
        ? null
        : digestThreads(artifactComments.threads, scanState);
    if (request.confirm === true) {
      let confirmBase = request.confirmBase;
      logFeatureOk("artifact_comments_autoreact", {
        confirm_read: true,
        rescued: newThreads !== null && confirmBase !== undefined && confirmBase !== newThreads,
        noref: newThreads === null || confirmBase === undefined,
        after: fromEnum(request.confirmAfter ?? "unread"),
      });
    }
    if (newThreads === null) {
      baselineKind = "noref";
      scanState.lastReadDigest = null;
    } else {
      baselineKind =
        scanState.lastReadDigest === null
          ? "noref"
          : newThreads !== scanState.lastReadDigest
            ? "changed"
            : "unchanged";
      scanState.lastReadDigest = newThreads;
      confirmBase = newThreads;
    }
    if (artifactComments.threads.length > 0 || artifactComments.threadsDropped === true)
      scanState.everHadThreads = true;
    let stopped = false;
    for (let thread of artifactComments.threads) {
      if (scanStamp(slug) !== stamp) {
        logFeatureSad("artifact_comments_autoreact", "scan_stopped_by_kill");
        return;
      }
      let processed = await processArtifactThread({
        slug,
        url,
        artifactName,
        thread,
        tool,
        context,
        notify,
        artifactState: scanState,
        scanGen: stamp,
        actOnFirstSight,
        liveSightBoundary: stampHighWater,
        suppressSummonStatus: request.suppressSummonStatus !== false,
        pickUpRecentSummons,
        threadsDropped: artifactComments.threadsDropped === true,
        readThreads: artifactComments.threads,
        hintMissed:
          emptyHintReadAt !== null &&
          (parseTimestamp(thread.createdAt) ?? 0) < emptyHintReadAt - EMPTY_THREAD_GRACE_MS,
      });
      if (processed === "deferred_first_sight") stopped = true;
      if (processed === "deferred_busy") sawError = true;
    }
    if (emptyHintReadAt !== null && !stopped && artifactComments.threadsDropped !== true) {
      scanState.emptyHintReadAt = null;
      let earliestDueAt = 1 / 0;
      for (let thread of artifactComments.threads)
        earliestDueAt = Math.min(earliestDueAt, parseTimestamp(thread.createdAt) ?? 1 / 0);
      if (earliestDueAt < emptyHintReadAt)
        logFeatureSad("artifact_live_subscribe", "comment_hint_stale", {
          older_by_s: Math.round((emptyHintReadAt - earliestDueAt) / 1000),
        });
    }
    if (
      !stopped &&
      artifactComments.threadsDropped !== true &&
      !(artifactComments.threads.length === 0 && (scanState.threads.size > 0 || scanState.everHadThreads)) &&
      isAutoreactArmed() &&
      !isSlugStoppedAnywhere(slug) &&
      scanStamp(slug) === stamp
    ) {
      scanState.baselined = true;
      scanState.everBaselined = true;
    }
  } finally {
    scanState.scanning = false;
    flushAutoreactLedger();
    if (confirmDwellElapsed && summonWakeState.newestKickAt === newestKickAt)
      summonWakeState.kickSettled = true;
    if (summonWakeState.rescanWanted) {
      summonWakeState.rescanWanted = false;
      let rescanArgs = summonWakeState.rescanArgs ?? request;
      summonWakeState.rescanArgs = null;
      scheduleThreadScan({
        ...rescanArgs,
        reentry: true,
      });
    } else if (
      !summonWakeState.kickSettled &&
      summonWakeState.newestKickAt !== 0 &&
      scanStamp(slug) === stamp &&
      !isSlugStoppedAnywhere(slug)
    )
      scheduleThreadScan({
        ...request,
        seed: undefined,
        reentry: undefined,
        idlePass: undefined,
        confirm: true,
        confirmBase,
        confirmAfter: baselineKind,
      });
    if (
      outcome !== null &&
      scanStamp(slug) === stamp &&
      summonWakeState.cancelGeneration === cancelGeneration &&
      !isSlugStoppedAnywhere(slug)
    )
      scheduleReadRetry(summonWakeState, request, outcome.retryAfterMs);
    if (
      (sawError || partial) &&
      scanStamp(slug) === stamp &&
      summonWakeState.cancelGeneration === cancelGeneration &&
      !isSlugStoppedAnywhere(slug)
    ) {
      let nextDueAt =
        request.suppressSummonStatus === false ||
        (summonWakeState.idleRescanCancel !== null && summonWakeState.idleRescanUnmuted);
      summonWakeState.idleRescanCancel?.();
      let idleTask = runWhenForegroundIdle(
        () => {
          if (summonWakeState.idleRescanCancel === idleTask) {
            summonWakeState.idleRescanCancel = null;
            summonWakeState.idleRescanUnmuted = false;
          }
          if (!isSlugStoppedAnywhere(slug))
            scheduleThreadScan({
              ...request,
              ...(nextDueAt && {
                suppressSummonStatus: false,
              }),
              seed: undefined,
              confirm: undefined,
              reentry: true,
              idlePass: sawError ? "owed" : "retry",
            });
        },
        request.abort.signal,
        getAutoReactRateLimit(),
      );
      summonWakeState.idleRescanCancel = idleTask;
      summonWakeState.idleRescanUnmuted = nextDueAt;
    }
  }
}
//@ chunk-c0pq6qyx.js:70917-71460 placement
/**
 * 计算线程列表的 sha256 摘要（线程 id、外部解决时间、激活时间、非自己回复的评论 id 与发送时间），用于判断是否有变化；遇到降级数据返回 null。
 */
function digestThreads(threads, scanState) {
  let compareById = (a, b) => (a.id < b.id ? -1 : 1);
  let hash = createHash("sha256");
  for (let thread of [...threads].sort(compareById)) {
    let scanThread = scanState.threads.get(thread.id);
    if (
      thread.commentsDegraded === true ||
      thread.resolvedDegraded === true ||
      thread.activatedAtDegraded === true ||
      scanThread?.ownReplyIdsIncomplete === true ||
      thread.comments.some((comment) => comment.toClaudeAtDegraded === true)
    )
      return null;
    let resolvedByOthers = thread.resolved && thread.resolvedByClaude !== true;
    hash.update(
      `${thread.id}|${resolvedByOthers ? (thread.resolvedAt ?? "r") : ""}|${thread.activatedAt ?? ""}|`,
    );
    for (let comment of [...thread.comments].sort(compareById))
      if (scanThread?.ownReplyIds.has(comment.id) !== true)
        hash.update(`${comment.id}@${comment.toClaudeAt ?? ""}|`);
    hash.update(`
`);
  }
  return hash.digest("hex");
}
//@ chunk-c0pq6qyx.js:71460-71641 placement
/**
 * 记录本会话自己发出的回复 id（账户纪元不符且不是自己发的回复时忽略）；缺少 id 时标记记录不完整。
 */
function recordOwnReply(slug, { commentId, epoch }) {
  if (epoch !== getLiveState().accountEpoch && !(commentId !== undefined && isOwnPostedReply(commentId)))
    return;
  if (commentId !== undefined && commentId !== "") {
    slug.seen.add(commentId);
    slug.ownReplyIds.add(commentId);
  } else slug.ownReplyIdsIncomplete = true;
}
//@ chunk-c0pq6qyx.js:71641-71742 placement
/**
 * 返回自己回复的 id 集合与扫描行 id；记录不完整时返回 undefined。
 */
function getOwnReplyInfo(slug, scanRowIds) {
  return slug.ownReplyIdsIncomplete === true
    ? undefined
    : {
        ownReplyIds: slug.ownReplyIds,
        scanRowIds,
      };
}
//@ chunk-c0pq6qyx.js:71742-72109 placement
/**
 * 把回复权限被拒的原因归类：规则拒绝、自动模式拒绝（含分类器不可用、无结论），其他为 blocked。
 */
function describeReplyDenial(denial) {
  let decisionReason = denial.decisionReason;
  if (decisionReason.type === "rule")
    return {
      reason: "denied_by_rule",
      errorCode: "denied_by_rule",
    };
  if (decisionReason.type === "classifier" && decisionReason.classifier === "auto-mode")
    return {
      reason: "denied_by_auto_mode",
      errorCode:
        decisionReason.reason === CLASSIFIER_UNAVAILABLE_REASON
          ? "auto_mode_unavailable"
          : decisionReason.noVerdict === true
            ? "auto_mode_no_verdict"
            : "denied_by_auto_mode",
    };
  return {
    reason: "blocked",
    errorCode: "denied_other",
  };
}
//@ chunk-c0pq6qyx.js:72109-72146 placement
var TENGU_SORREL_TRELLIS_GUSSET = "tengu_sorrel_trellis_gusset";
//@ chunk-c0pq6qyx.js:72146-72181 placement
function isGussetFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_GUSSET, false) === true;
}
//@ chunk-c0pq6qyx.js:72181-72218 placement
function canUseClassifierArbiter(context) {
  return getAutoModeArbiterIssue(context) === undefined;
}
//@ chunk-c0pq6qyx.js:72218-72352 placement
/**
 * 检查自动模式下能否用分类器做仲裁：角色不是 arbiter 或该 beta 已退役时返回原因。
 */
function getAutoModeArbiterIssue(context) {
  let { mode } = getToolPermissionContext(context);
  if (getAutoModeClassifierRole(mode) !== "arbiter") return "classifier_role_not_arbiter";
  return canAttachServerClassifierBeta(mode) ? undefined : "arbiter_beta_retired";
}
//@ chunk-c0pq6qyx.js:72352-72814 placement
/**
 * 判断线程最后一条代理回复之后是否没有新的召唤/人类评论/激活手势（即最后一条代理回复仍然是最新回应）。
 */
function isLastAgentReplyCurrent(thread) {
  let { thread: thread_2, threadState, trigger, summonsForOrdering } = thread;
  let lastIndex = thread_2.comments.findLastIndex((comment) => getCommentAuthorKind(comment) === "agent");
  let lastComment = thread_2.comments[lastIndex];
  if (lastComment === undefined) return false;
  let any = summonsForOrdering.some(
    (reply) => thread_2.comments.findIndex((comment) => comment.id === reply.id) > lastIndex,
  );
  let laterReply =
    trigger === "activation" &&
    thread.activatedAt != null &&
    (thread_2.comments.some(
      (comment, commentIndex) => commentIndex > lastIndex && getCommentAuthorKind(comment) === "human",
    ) ||
      hasCommentSentAfter(
        [
          {
            id: "activation-gesture",
            account: "",
            text: "",
            toClaudeAt: thread.activatedAt,
          },
        ],
        lastComment,
      ));
  return (
    (trigger === "activation" || !threadState.ownReplyIds.has(lastComment.id)) &&
    !any &&
    !laterReply &&
    !hasCommentSentAfter(summonsForOrdering, lastComment)
  );
}
//@ chunk-c0pq6qyx.js:72814-72850 placement
var TENGU_SORREL_TRELLIS_NEWEL = "tengu_sorrel_trellis_newel";
//@ chunk-c0pq6qyx.js:72850-72885 placement
function isNewelFlagOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_NEWEL, false) === true;
}
//@ chunk-c0pq6qyx.js:72885-73406 placement
/**
 * 判断能否为线程派生后台回复：线程已激活、有待处理召唤且未被宿主认领、有回复工具和本地源页、未超每小时上限、宿主入口下能交给线程代理，最后检查回复权限；出错返回 false。
 */
async function canForkThreadReply(options) {
  let { slug, url, thread, context, replyTool } = options;
  try {
    let pendingSummons = collectPendingSummons(thread, options.threadState);
    let threadState =
      pendingSummons !== null &&
      pendingSummons.summons.some(
        (summon) =>
          summon.toClaudeAt !== undefined &&
          hasSummonClaim(slug, thread.id, summon.toClaudeAt, {
            hostSeeded: false,
          }),
      );
    if (
      !thread.claudeActivated ||
      pendingSummons === null ||
      threadState ||
      replyTool === undefined ||
      localSourcePathIfEditCapable(thread, slug, context.artifactRegistries.recordedPages) === undefined ||
      getPermissionPromptPerson() === null ||
      !withinHourlyTurnCap(options.artifactState, Date.now()) ||
      (isHostEntrypoint() && !(await canHandToThreadAgent(slug, thread.id)))
    )
      return false;
    return await checkReplyPermissionSafe({
      url,
      thread,
      context,
      replyTool,
    });
  } catch (error) {
    if (!isAbortError(error)) {
      logError(error);
      logFeatureBad("artifact_comments_autoreact", "fork_gate_error");
    }
    return false;
  }
}
//@ chunk-c0pq6qyx.js:73406-73535 placement
/**
 * 安全地检查回复权限：出错时记日志打点（中断除外）并返回 false。
 */
async function checkReplyPermissionSafe(request) {
  try {
    return await checkReplyPermission(request);
  } catch (error) {
    if (!isAbortError(error)) {
      logError(error);
      logFeatureBad("artifact_comments_autoreact", "fork_gate_error");
    }
    return false;
  }
}
export {
  scheduleThreadScan,
  isGussetFlagOn,
  recordOwnReply,
  getAutoModeArbiterIssue,
  isNewelFlagOn,
  isLastAgentReplyCurrent,
  describeReplyDenial,
  canForkThreadReply,
  checkReplyPermissionSafe,
  withinHourlyTurnCap,
  canUseClassifierArbiter,
  getOwnReplyInfo,
  getAutoReactArtifactState,
  resetAutoReactForSlug,
  quoteArtifactName,
  settleEmptyArtifact,
};
