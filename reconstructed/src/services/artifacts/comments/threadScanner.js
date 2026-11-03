/**
 * services/artifacts/comments/threadScanner.ts
 *
 * 2.1.316 新增：扫描 artifact 评论线程、发现新评论
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (30)
 * attribution: placement 30
 */
import { createHash } from "crypto";
import {
  resetLedgerSlug,
  flushAutoreactLedger,
  ze,
  takeLedgerEntry,
  claimLedgerOwnership,
} from "./autoreactLedger.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../analytics/featureTelemetry.js";
import {
  getMaxAutoTurns,
  ra,
  getConfirmDwellMs,
  Jn,
  Ls,
  computeAutoReactBackoff,
  isCommentReadGated,
  refreshFastAckFlag,
  getAutoReactRateLimit,
} from "./autoreactGates.js";
import { sanitizeDisplayTitle } from "../../../utils/textNormalize.js";
import { Ar, updateUnreadCounts, bFt } from "./threadPrompts.js";
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
import { MUs } from "../replyYield.js";
import { createDenialTrackingState } from "../../../utils/permissions/denialTracking.js";
import { readArtifactComments } from "./commentsRead.js";
import { isFrameLiveTokenLeaseEnabled } from "../frameFlags.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { processArtifactThread, collectPendingSummons, dn, checkReplyPermission } from "./autoreact.js";
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
import { getAutoModeClassifierRole, j3n } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { St } from "./autoreactState.js";
import { zjt } from "../../../utils/permissions/permissionPromptHost.js";
import { isHostEntrypoint } from "../../../utils/entrypointKinds.js";
import { canHandToThreadAgent } from "./backgroundAgent.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";

/**
 * 重置某 artifact 的自动回复记录：台账条目清空线程，内存状态清掉线程与基线并更新账号，随后立即刷写台账。
 */
//@ chunk-9tgt55am.js:64634-64780 placement
function resetAutoReactForSlug(e) {
  resetLedgerSlug(e);
  let t = getLiveState().autoReact.artifacts.get(e);
  if (!t) {
    flushAutoreactLedger({ flush: !0 });
    return;
  }
  (clearArtifactThreads(t), (t.accountUuid = ze() ?? t.accountUuid), flushAutoreactLedger({ flush: !0 }));
}
//@ chunk-9tgt55am.js:64780-64891 placement
function clearArtifactThreads(e) {
  (e.threads.clear(),
    (e.baselined = !1),
    (e.everBaselined = !1),
    (e.stampHighWater = null),
    (e.lastReadDigest = null));
}
/**
 * 用台账条目恢复某 artifact 的自动回复状态：时间戳高水位、基线标志、回合时间戳、各线程已见/已发送/自己的回复 id 等，并打点。
 */
//@ chunk-9tgt55am.js:64891-65550 placement
function rehydrateFromLedger(state, ledgerEntry) {
  if (ledgerEntry === null) return;
  ((state.stampHighWater = ledgerEntry.stampHighWater),
    (state.everBaselined = ledgerEntry.everBaselined),
    (state.everHadThreads = ledgerEntry.everHadThreads),
    (state.turnTimestamps = [...ledgerEntry.turnTimestamps]),
    (state.lastScanAt = ledgerEntry.savedAt));
  for (let n of ledgerEntry.threads ?? [])
    state.threads.set(n.id, {
      lastAutoReplyAt: null,
      activatedAt: n.activatedAt,
      activatedAtObserved: n.activatedAtObserved,
      seen: new Set(n.seen),
      sentToClaudeAt: new Map(n.sent),
      ownReplyIds: new Set(n.ownReplyIds),
      ...(n.ownReplyIdsIncomplete === !0 && { ownReplyIdsIncomplete: !0 }),
      consecutiveAuto: 0,
      breakerOpen: !1,
      consecutivePipelineDenials: 0,
      deferNoticed: new Set(),
    });
  logFeatureOk("artifact_comments_autoreact", {
    ledger_rehydrated: !0,
    ledger_threads: ledgerEntry.threads?.length ?? -1,
  });
}
/**
 * 取（或新建）某 artifact 的自动回复内存状态；新建时从台账恢复；账号变化且不在扫描中时清空线程并换账号。
 */
//@ chunk-9tgt55am.js:65550-66220 placement
function getAutoReactArtifactState(slug) {
  let { artifacts: artifacts } = getLiveState().autoReact,
    state = artifacts.get(slug),
    accountUuid = ze();
  if (state && accountUuid !== null && state.accountUuid !== accountUuid && !state.scanning) {
    if (state.accountUuid !== null) clearArtifactThreads(state);
    state.accountUuid = accountUuid;
  }
  if (!state)
    ((state = {
      threads: new Map(),
      turnTimestamps: [],
      forecastTimestamps: [],
      scanning: !1,
      defaultModeNoticed: !1,
      autoModeDeclineNoticed: !1,
      heldReplyDeclined: !1,
      heldReplyChain: null,
      lastReplyDeclinedByAutoMode: !1,
      capNoticed: !1,
      ruleWithheldNoted: !1,
      planModeNoticed: !1,
      lastProbeAllowed: !1,
      lastProbeDeniedBy: null,
      lastScanAt: null,
      pipelineDeniedNoticed: !1,
      busyValveNoticed: !1,
      baselined: !1,
      everBaselined: !1,
      everHadThreads: !1,
      stampHighWater: null,
      lastReadDigest: null,
      emptyHintReadAt: null,
      accountUuid: accountUuid,
    }),
      artifacts.set(slug, state),
      rehydrateFromLedger(state, takeLedgerEntry(slug)));
  return state;
}
/**
 * 清掉一小时前的自动回合时间戳，返回本小时自动回合数是否仍低于上限。
 */
//@ chunk-9tgt55am.js:66220-66332 placement
function withinHourlyTurnCap(e, t) {
  return (
    (e.turnTimestamps = e.turnTimestamps.filter((turnTimestamp) => t - turnTimestamp < 3600000)),
    e.turnTimestamps.length < getMaxAutoTurns()
  );
}
/**
 * 取 artifact 名字并做成带双引号的安全显示文本（内部引号与同形字换成单引号）；取不到时返回给定的默认值。
 */
//@ chunk-9tgt55am.js:66332-66495 placement
function quoteArtifactName(e, t) {
  let n = e?.();
  if (n === void 0 || n === "") return t;
  let a = sanitizeDisplayTitle(n);
  if (a === null) return t;
  return `"${Ar(a.replace(/"/g, "'").replace(QUOTE_HOMOGLYPHS, "'").replace(SINGLE_QUOTE_RUNS, "'"))}"`;
}
//@ chunk-9tgt55am.js:66495-66712 placement
function splitPublishMessages(e) {
  let publishTranscript = e.publishTranscript,
    n = publishTranscript !== void 0 ? getSyntheticToolMessages(publishTranscript) : [];
  if (n.length === 0) return { publishMessages: [], publishTranscript: publishTranscript };
  return { publishMessages: e.context.messages.at(-1) === n.at(-1) ? [] : n, publishTranscript: void 0 };
}
//@ chunk-9tgt55am.js:66712-66822 placement
function appendContextMessages(e, t) {
  return { ...e, messages: [...e.messages, ...(e.sameTurnToolUses ?? []), ...t], sameTurnToolUses: void 0 };
}
//@ chunk-9tgt55am.js:66822-67009 placement
function withPublishTranscript(e) {
  if (e.publishTranscript === void 0) return e;
  let { publishMessages: publishMessages, publishTranscript: publishTranscript } = splitPublishMessages(e);
  if (publishMessages.length === 0) return e;
  return {
    ...e,
    publishTranscript: publishTranscript,
    context: appendContextMessages(e.context, publishMessages),
  };
}
/**
 * 安排一次评论线程扫描（防抖合并）：根据是 seed/confirm/reentry/普通唤醒决定延迟，正在扫描时登记重扫参数，已有定时器时合并待确认/待播种的唤醒并重设定时器；到点后执行扫描。
 */
//@ chunk-9tgt55am.js:67009-69418 placement
function scheduleThreadScan(wake) {
  if (!isAutoreactArmed()) return;
  if (isSlugYielded(wake.slug)) MUs();
  let t = armSummonState(wake.slug),
    n = wake.getWiring?.(),
    context = n?.context ?? wake.context,
    { publishMessages: publishMessages, publishTranscript: publishTranscript } = splitPublishMessages({
      publishTranscript: n !== void 0 ? n.publishTranscript : wake.publishTranscript,
      context: context,
    }),
    wakeArgs = {
      ...wake,
      suppressSummonStatus: wake.suppressSummonStatus ?? t,
      pickUpRecentSummons: wake.pickUpRecentSummons === !0 && wake.seed === !0 && !t,
      publishTranscript: publishTranscript,
      context: {
        ...(publishMessages.length > 0 ? appendContextMessages(context, publishMessages) : context),
        permissionLayers: void 0,
        abortController: wake.abort,
        onPermissionDenial: void 0,
        localDenialTracking: createDenialTrackingState(),
      },
    },
    artifactState = getAutoReactArtifactState(wakeArgs.slug),
    wakeState = getSummonWakeState(wakeArgs.slug),
    minGapMs = ra(),
    now = Date.now(),
    startTime = performance.now(),
    isKick = wakeArgs.seed !== !0 && wakeArgs.confirm !== !0 && wakeArgs.reentry !== !0;
  if (isKick) ((wakeState.kickSettled = !1), (wakeState.newestKickAt = startTime), wakeState.kickCount++);
  wakeState.lastWakeArgs = wake;
  let confirmDelayMs = wakeState.kickSettled
    ? 0
    : Math.min(Math.max(0, wakeState.newestKickAt + getConfirmDwellMs() - startTime), getConfirmDwellMs());
  if (wakeState.coalesceTimer || artifactState.scanning) {
    if (wakeArgs.idlePass !== void 0) wakeState.idlePassOwed = wakeArgs.idlePass;
    let pendingConfirm = wakeState.pendingConfirm;
    if (isKick && wakeState.coalesceTimer && pendingConfirm !== null) {
      let wake = pendingConfirm.wake,
        q = {
          ...wakeArgs,
          confirm: !0,
          ...(wake.confirmBase !== void 0 && { confirmBase: wake.confirmBase }),
          ...(wake.confirmAfter !== void 0 && { confirmAfter: wake.confirmAfter }),
          suppressSummonStatus: wake.suppressSummonStatus !== !1 && wakeArgs.suppressSummonStatus,
        };
      pendingConfirm.wake = q;
      let min = Math.min(startTime + getConfirmDwellMs(), pendingConfirm.armedAt + minGapMs);
      (clearTimeout(wakeState.coalesceTimer),
        (pendingConfirm.dueAt = Math.max(min, pendingConfirm.dueAt)),
        (wakeState.coalesceTimer = setTimeout(
          runScheduledScan,
          Jn(pendingConfirm.dueAt - startTime),
          wakeState,
          q,
        )));
    }
    let pendingSeed = wakeState.pendingSeed;
    if (wakeState.coalesceTimer && pendingSeed !== null && wakeArgs.confirm !== !0) {
      let wake = pendingSeed.wake,
        q = wakeArgs.seed === !0 && wakeArgs.reentry !== !0 && (wakeArgs.deferMs ?? 0) > 0,
        x = wakeArgs.seed === !0 ? Math.max(minGapMs, q ? (wakeArgs.deferMs ?? 0) : 0) : confirmDelayMs,
        Y = isKick ? startTime + x : Math.min(pendingSeed.dueAt, startTime + x),
        z = {
          ...wakeArgs,
          seed: !0,
          ...((wake.pickUpRecentSummons === !0 || wakeArgs.pickUpRecentSummons === !0) && {
            pickUpRecentSummons: !0,
          }),
          suppressSummonStatus: wake.suppressSummonStatus !== !1 && wakeArgs.suppressSummonStatus,
        };
      ((wakeState.pendingSeed = q ? { wake: z, dueAt: Y } : null),
        (wakeState.lastScanScheduledAt = now + (Y - startTime)),
        clearTimeout(wakeState.coalesceTimer),
        (wakeState.coalesceTimer = setTimeout(runScheduledScan, Jn(Y - startTime), wakeState, z)));
    }
    if (((wakeState.rescanWanted = artifactState.scanning), artifactState.scanning)) {
      let rescanArgs = wakeState.rescanArgs,
        q =
          rescanArgs?.seed === !0 && wakeArgs.seed !== !0
            ? { ...wakeArgs, seed: !0, pickUpRecentSummons: rescanArgs.pickUpRecentSummons }
            : wakeArgs;
      wakeState.rescanArgs =
        rescanArgs !== null && rescanArgs.suppressSummonStatus === !1
          ? { ...q, suppressSummonStatus: !1 }
          : q;
    }
    return;
  }
  let w = wakeState.lastScanScheduledAt !== 0 && now - wakeState.lastScanScheduledAt < minGapMs,
    L = wakeArgs.seed === !0 && wakeArgs.reentry !== !0 && (wakeArgs.deferMs ?? 0) > 0,
    delayMs =
      wakeArgs.confirm === !0
        ? confirmDelayMs
        : L
          ? Math.max(minGapMs, wakeArgs.deferMs ?? 0)
          : wakeArgs.seed === !0 || w
            ? minGapMs
            : wakeArgs.reentry === !0
              ? confirmDelayMs
              : 0;
  if (wakeArgs.confirm !== !0) wakeState.lastScanScheduledAt = now + delayMs;
  ((wakeState.pendingConfirm =
    wakeArgs.confirm === !0 ? { wake: wakeArgs, armedAt: startTime, dueAt: startTime + delayMs } : null),
    (wakeState.pendingSeed = L ? { wake: wakeArgs, dueAt: startTime + delayMs } : null),
    (wakeState.coalesceTimer = setTimeout(runScheduledScan, Jn(delayMs), wakeState, wakeArgs)));
}
//@ chunk-9tgt55am.js:69418-69646 placement
function runScheduledScan(e, t) {
  ((e.coalesceTimer = null), (e.pendingConfirm = null), (e.pendingSeed = null));
  let n = scanArtifactThreads(withPublishTranscript(t))
    .catch(() => {
      logFeatureSad("artifact_comments_autoreact", "scan_error");
    })
    .finally(() => {
      if (e.inFlightScan === n) e.inFlightScan = null;
    });
  e.inFlightScan = n;
}
//@ chunk-9tgt55am.js:69646-69885 placement
function clearReadRetry(e, t) {
  if (t && e.readRetryAttempts > 0)
    logFeatureOk("artifact_comments_autoreact", {
      read_retry_cleared: !0,
      retry_attempts: e.readRetryAttempts,
    });
  if (((e.readRetryAttempts = 0), e.readRetryTimer !== null))
    (clearTimeout(e.readRetryTimer), (e.readRetryTimer = null));
}
/**
 * 评论读取失败后按退避安排重试扫描；超过最大次数时打点放弃并清零。
 */
//@ chunk-9tgt55am.js:69885-70216 placement
function scheduleReadRetry(e, t, n) {
  if (e.readRetryTimer !== null) return;
  let readRetryAttempts = e.readRetryAttempts,
    r = Ls();
  if (r === 0) {
    e.readRetryAttempts = 0;
    return;
  }
  if (readRetryAttempts >= r) {
    (logFeatureSad("artifact_comments_autoreact", "read_retry_gave_up", {
      retry_attempts: readRetryAttempts,
    }),
      (e.readRetryAttempts = 0));
    return;
  }
  ((e.readRetryAttempts = readRetryAttempts + 1),
    (e.readRetryTimer = setTimeout(runReadRetry, computeAutoReactBackoff(readRetryAttempts, n), e, t)),
    e.readRetryTimer.unref?.());
}
//@ chunk-9tgt55am.js:70216-70416 placement
function runReadRetry(e, t) {
  if (((e.readRetryTimer = null), isSlugStoppedAnywhere(t.slug) || t.abort.signal.aborted)) {
    e.readRetryAttempts = 0;
    return;
  }
  scheduleThreadScan({
    ...t,
    confirm: void 0,
    confirmBase: void 0,
    confirmAfter: void 0,
    idlePass: void 0,
    reentry: !0,
  });
}
//@ chunk-9tgt55am.js:70416-70429 placement
var ya = 60000;
/**
 * 对还没有任何评论线程的 artifact 提前完成基线：确认没有待处理唤醒、扫描、重试，自动回复已开启且读取不受规则限制后，取消定时器、记基线与空摘要并刷写台账；返回是否完成。
 */
//@ chunk-9tgt55am.js:70429-71253 placement
function settleEmptyArtifact(slug, wakeSnapshot, readAt) {
  let wakeState = getSummonWakeState(slug),
    lastWakeArgs = wakeState.lastWakeArgs,
    artifactState = getLiveState().autoReact.artifacts.get(slug);
  if (
    lastWakeArgs === null ||
    artifactState === void 0 ||
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
    return !1;
  let d = lastWakeArgs.getWiring?.()?.context ?? lastWakeArgs.context;
  if (
    isCommentReadGated(
      { ...d, permissionLayers: void 0 },
      { slug: slug, env: lastWakeArgs.env },
      lastWakeArgs.url,
    )
  )
    return !1;
  if (artifactState.ruleWithheldNoted)
    ((artifactState.ruleWithheldNoted = !1), emitSummonArm(getLiveState().live, slug));
  return (
    clearTimeout(wakeState.coalesceTimer),
    (wakeState.coalesceTimer = null),
    (wakeState.pendingSeed = null),
    (wakeState.lastScanScheduledAt = 0),
    claimLedgerOwnership(d.storageV5),
    clearReadRetry(wakeState, !1),
    (artifactState.lastScanAt = Date.now()),
    (artifactState.baselined = !0),
    (artifactState.everBaselined = !0),
    (artifactState.lastReadDigest = digestThreads([], artifactState)),
    (artifactState.emptyHintReadAt = readAt),
    (artifactState.stampHighWater ??= new Date(readAt - ya).toISOString()),
    updateUnreadCounts(slug, [], bFt(slug)),
    flushAutoreactLedger(),
    !0
  );
}
/**
 * 扫描单个 artifact 的评论线程，处理空闲补扫、忙碌跳过并派发新评论。
 */
//@ chunk-9tgt55am.js:71253-75009 placement
async function scanArtifactThreads(e) {
  let t = getSummonWakeState(e.slug),
    idlePassOwed = t.idlePassOwed;
  t.idlePassOwed = null;
  let a = e.idlePass === "owed" || idlePassOwed === "owed" ? "owed" : (e.idlePass ?? idlePassOwed ?? void 0);
  if (isSlugStoppedAnywhere(e.slug)) return;
  let { slug: slug, url: url, tool: tool, context: context, notify: notify } = e;
  if (isCommentReadGated(context, { slug: slug, env: e.env }, url)) {
    let Q = getAutoReactArtifactState(slug);
    if (e.seed === !0) Q.baselined = !1;
    if (!Q.ruleWithheldNoted)
      ((Q.ruleWithheldNoted = !0),
        logFeatureSad("artifact_comments_autoreact", "rule_withheld"),
        emitSummonArm(getLiveState().live, slug));
    return;
  }
  if (getAutoReactArtifactState(slug).ruleWithheldNoted)
    ((getAutoReactArtifactState(slug).ruleWithheldNoted = !1), emitSummonArm(getLiveState().live, slug));
  let C = quoteArtifactName(e.getTitle, url);
  claimLedgerOwnership(context.storageV5);
  let R = getAutoReactArtifactState(slug);
  R.scanning = !0;
  let b = scanStamp(slug),
    N = R.baselined && e.seed !== !0,
    { stampHighWater: stampHighWater, emptyHintReadAt: emptyHintReadAt } = R;
  if (e.seed === !0) R.baselined = !1;
  let { cancelGeneration: cancelGeneration, newestKickAt: newestKickAt } = t,
    D = getConfirmDwellMs(),
    G = D === 0 || performance.now() - newestKickAt >= D,
    V = "unread",
    q,
    x = !1,
    Y = !1,
    z = null;
  try {
    let Q = bFt(slug),
      [, I] = await Promise.all([
        refreshFastAckFlag(),
        readArtifactComments(
          { slug: slug, env: e.env },
          context.abortController.signal,
          context.credentials,
          e.confirm === !0 ? "artifact_autoreact_confirm_read" : "artifact_autoreact_scan_read",
          { skipBootProbe: isFrameLiveTokenLeaseEnabled() },
        ),
      ]),
      j = e.pickUpRecentSummons === !0;
    if (I.err !== null) {
      if (
        (logFeatureSad("artifact_comments_autoreact", "read_failed", {
          retryable: I.retryable === !0,
          retry_attempts: t.readRetryAttempts,
        }),
        (R.lastReadDigest = null),
        (Y = a === "owed"),
        I.retryable === !0)
      )
        z = { retryAfterMs: I.retryAfterMs };
      else clearReadRetry(t, !1);
      if (I.status === 401 || I.status === 403 || I.status === 404) e.onReadRefused?.();
      return;
    }
    if ((clearReadRetry(t, !0), (R.lastScanAt = Date.now()), I.threadsDegraded === !0)) {
      ((R.everHadThreads = !0),
        logFeatureSad("artifact_comments_autoreact", "read_degraded"),
        (R.lastReadDigest = null),
        (Y = a === "owed"));
      return;
    }
    if (I.threadsDropped === !0) Y = a === "owed";
    if (scanStamp(slug) === b) updateUnreadCounts(slug, I.threads, Q, I.threadsDropped === !0);
    let Z = I.threadsDropped === !0 || scanStamp(slug) !== b ? null : digestThreads(I.threads, R);
    if (e.confirm === !0) {
      let confirmBase = e.confirmBase;
      logFeatureOk("artifact_comments_autoreact", {
        confirm_read: !0,
        rescued: Z !== null && confirmBase !== void 0 && confirmBase !== Z,
        noref: Z === null || confirmBase === void 0,
        after: fromEnum(e.confirmAfter ?? "unread"),
      });
    }
    if (Z === null) ((V = "noref"), (R.lastReadDigest = null));
    else
      ((V = R.lastReadDigest === null ? "noref" : Z !== R.lastReadDigest ? "changed" : "unchanged"),
        (R.lastReadDigest = Z),
        (q = Z));
    if (I.threads.length > 0 || I.threadsDropped === !0) R.everHadThreads = !0;
    let ce = !1;
    for (let thread of I.threads) {
      if (scanStamp(slug) !== b) {
        logFeatureSad("artifact_comments_autoreact", "scan_stopped_by_kill");
        return;
      }
      let me = await processArtifactThread({
        slug: slug,
        url: url,
        artifactName: C,
        thread: thread,
        tool: tool,
        context: context,
        notify: notify,
        artifactState: R,
        scanGen: b,
        actOnFirstSight: N,
        liveSightBoundary: stampHighWater,
        suppressSummonStatus: e.suppressSummonStatus !== !1,
        pickUpRecentSummons: j,
        threadsDropped: I.threadsDropped === !0,
        readThreads: I.threads,
        hintMissed:
          emptyHintReadAt !== null && (parseTimestamp(thread.createdAt) ?? 0) < emptyHintReadAt - ya,
      });
      if (me === "deferred_first_sight") ce = !0;
      if (me === "deferred_busy") x = !0;
    }
    if (emptyHintReadAt !== null && !ce && I.threadsDropped !== !0) {
      R.emptyHintReadAt = null;
      let le = 1 / 0;
      for (let thread of I.threads) le = Math.min(le, parseTimestamp(thread.createdAt) ?? 1 / 0);
      if (le < emptyHintReadAt)
        logFeatureSad("artifact_live_subscribe", "comment_hint_stale", {
          older_by_s: Math.round((emptyHintReadAt - le) / 1000),
        });
    }
    if (
      !ce &&
      I.threadsDropped !== !0 &&
      !(I.threads.length === 0 && (R.threads.size > 0 || R.everHadThreads)) &&
      isAutoreactArmed() &&
      !isSlugStoppedAnywhere(slug) &&
      scanStamp(slug) === b
    )
      ((R.baselined = !0), (R.everBaselined = !0));
  } finally {
    if (((R.scanning = !1), flushAutoreactLedger(), G && t.newestKickAt === newestKickAt)) t.kickSettled = !0;
    if (t.rescanWanted) {
      t.rescanWanted = !1;
      let Q = t.rescanArgs ?? e;
      ((t.rescanArgs = null), scheduleThreadScan({ ...Q, reentry: !0 }));
    } else if (
      !t.kickSettled &&
      t.newestKickAt !== 0 &&
      scanStamp(slug) === b &&
      !isSlugStoppedAnywhere(slug)
    )
      scheduleThreadScan({
        ...e,
        seed: void 0,
        reentry: void 0,
        idlePass: void 0,
        confirm: !0,
        confirmBase: q,
        confirmAfter: V,
      });
    if (
      z !== null &&
      scanStamp(slug) === b &&
      t.cancelGeneration === cancelGeneration &&
      !isSlugStoppedAnywhere(slug)
    )
      scheduleReadRetry(t, e, z.retryAfterMs);
    if (
      (x || Y) &&
      scanStamp(slug) === b &&
      t.cancelGeneration === cancelGeneration &&
      !isSlugStoppedAnywhere(slug)
    ) {
      let Q = e.suppressSummonStatus === !1 || (t.idleRescanCancel !== null && t.idleRescanUnmuted);
      t.idleRescanCancel?.();
      let I = runWhenForegroundIdle(
        () => {
          if (t.idleRescanCancel === I) ((t.idleRescanCancel = null), (t.idleRescanUnmuted = !1));
          if (!isSlugStoppedAnywhere(slug))
            scheduleThreadScan({
              ...e,
              ...(Q && { suppressSummonStatus: !1 }),
              seed: void 0,
              confirm: void 0,
              reentry: !0,
              idlePass: x ? "owed" : "retry",
            });
        },
        e.abort.signal,
        getAutoReactRateLimit(),
      );
      ((t.idleRescanCancel = I), (t.idleRescanUnmuted = Q));
    }
  }
}
/**
 * 计算线程列表的 sha256 摘要（线程 id、外部解决时间、激活时间、非自己回复的评论 id 与发送时间），用于判断是否有变化；遇到降级数据返回 null。
 */
//@ chunk-9tgt55am.js:75009-75552 placement
function digestThreads(threads, scanState) {
  let compareById = (r, s) => (r.id < s.id ? -1 : 1),
    hash = createHash("sha256");
  for (let r of [...threads].sort(compareById)) {
    let s = scanState.threads.get(r.id);
    if (
      r.commentsDegraded === !0 ||
      r.resolvedDegraded === !0 ||
      r.activatedAtDegraded === !0 ||
      s?.ownReplyIdsIncomplete === !0 ||
      r.comments.some((comment) => comment.toClaudeAtDegraded === !0)
    )
      return null;
    let resolvedByOthers = r.resolved && r.resolvedByClaude !== !0;
    hash.update(`${r.id}|${resolvedByOthers ? (r.resolvedAt ?? "r") : ""}|${r.activatedAt ?? ""}|`);
    for (let h of [...r.comments].sort(compareById))
      if (s?.ownReplyIds.has(h.id) !== !0) hash.update(`${h.id}@${h.toClaudeAt ?? ""}|`);
    hash.update(`
`);
  }
  return hash.digest("hex");
}
/**
 * 记录本会话自己发出的回复 id（账户纪元不符且不是自己发的回复时忽略）；缺少 id 时标记记录不完整。
 */
//@ chunk-9tgt55am.js:75552-75733 placement
function recordOwnReply(e, { commentId: commentId, epoch: epoch }) {
  if (epoch !== getLiveState().accountEpoch && !(commentId !== void 0 && isOwnPostedReply(commentId))) return;
  if (commentId !== void 0 && commentId !== "") (e.seen.add(commentId), e.ownReplyIds.add(commentId));
  else e.ownReplyIdsIncomplete = !0;
}
/**
 * 返回自己回复的 id 集合与扫描行 id；记录不完整时返回 undefined。
 */
//@ chunk-9tgt55am.js:75733-75834 placement
function getOwnReplyInfo(e, t) {
  return e.ownReplyIdsIncomplete === !0 ? void 0 : { ownReplyIds: e.ownReplyIds, scanRowIds: t };
}
/**
 * 把回复权限被拒的原因归类：规则拒绝、自动模式拒绝（含分类器不可用、无结论），其他为 blocked。
 */
//@ chunk-9tgt55am.js:75834-76201 placement
function describeReplyDenial(e) {
  let decisionReason = e.decisionReason;
  if (decisionReason.type === "rule") return { reason: "denied_by_rule", errorCode: "denied_by_rule" };
  if (decisionReason.type === "classifier" && decisionReason.classifier === "auto-mode")
    return {
      reason: "denied_by_auto_mode",
      errorCode:
        decisionReason.reason === CLASSIFIER_UNAVAILABLE_REASON
          ? "auto_mode_unavailable"
          : decisionReason.noVerdict === !0
            ? "auto_mode_no_verdict"
            : "denied_by_auto_mode",
    };
  return { reason: "blocked", errorCode: "denied_other" };
}
//@ chunk-9tgt55am.js:76201-76238 placement
var TENGU_SORREL_TRELLIS_GUSSET = "tengu_sorrel_trellis_gusset";
//@ chunk-9tgt55am.js:76238-76273 placement
function ba() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_GUSSET, !1) === !0;
}
//@ chunk-9tgt55am.js:76273-76310 placement
function no(e) {
  return getAutoModeArbiterIssue(e) === void 0;
}
/**
 * 检查自动模式下能否用分类器做仲裁：角色不是 arbiter 或该 beta 已退役时返回原因。
 */
//@ chunk-9tgt55am.js:76310-76444 placement
function getAutoModeArbiterIssue(e) {
  let { mode: mode } = getToolPermissionContext(e);
  if (getAutoModeClassifierRole(mode) !== "arbiter") return "classifier_role_not_arbiter";
  return j3n(mode) ? void 0 : "arbiter_beta_retired";
}
/**
 * 判断线程最后一条代理回复之后是否没有新的召唤/人类评论/激活手势（即最后一条代理回复仍然是最新回应）。
 */
//@ chunk-9tgt55am.js:76444-76906 placement
function isLastAgentReplyCurrent(e) {
  let {
      thread: thread,
      threadState: threadState,
      trigger: trigger,
      summonsForOrdering: summonsForOrdering,
    } = e,
    lastIndex = thread.comments.findLastIndex((C) => getCommentAuthorKind(C) === "agent"),
    d = thread.comments[lastIndex];
  if (d === void 0) return !1;
  let any = summonsForOrdering.some(
      (C) => thread.comments.findIndex((comment) => comment.id === C.id) > lastIndex,
    ),
    y =
      trigger === "activation" &&
      e.activatedAt != null &&
      (thread.comments.some((comment, R) => R > lastIndex && getCommentAuthorKind(comment) === "human") ||
        hasCommentSentAfter(
          [{ id: "activation-gesture", account: "", text: "", toClaudeAt: e.activatedAt }],
          d,
        ));
  return (
    (trigger === "activation" || !threadState.ownReplyIds.has(d.id)) &&
    !any &&
    !y &&
    !hasCommentSentAfter(summonsForOrdering, d)
  );
}
//@ chunk-9tgt55am.js:76906-76942 placement
var TENGU_SORREL_TRELLIS_NEWEL = "tengu_sorrel_trellis_newel";
//@ chunk-9tgt55am.js:76942-76977 placement
function gd() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SORREL_TRELLIS_NEWEL, !1) === !0;
}
/**
 * 判断能否为线程派生后台回复：线程已激活、有待处理召唤且未被宿主认领、有回复工具和本地源页、未超每小时上限、宿主入口下能交给线程代理，最后检查回复权限；出错返回 false。
 */
//@ chunk-9tgt55am.js:76977-77497 placement
async function canForkThreadReply(options) {
  let { slug: slug, url: url, thread: thread, context: context, replyTool: replyTool } = options;
  try {
    let d = collectPendingSummons(thread, options.threadState),
      h =
        d !== null &&
        d.summons.some(
          (summon) =>
            summon.toClaudeAt !== void 0 && St(slug, thread.id, summon.toClaudeAt, { hostSeeded: !1 }),
        );
    if (
      !thread.claudeActivated ||
      d === null ||
      h ||
      replyTool === void 0 ||
      dn(thread, slug, context.artifactRegistries.recordedPages) === void 0 ||
      zjt() === null ||
      !withinHourlyTurnCap(options.artifactState, Date.now()) ||
      (isHostEntrypoint() && !(await canHandToThreadAgent(slug, thread.id)))
    )
      return !1;
    return await checkReplyPermissionSafe({
      url: url,
      thread: thread,
      context: context,
      replyTool: replyTool,
    });
  } catch (error) {
    if (!isAbortError(error))
      (logError(error), logFeatureBad("artifact_comments_autoreact", "fork_gate_error"));
    return !1;
  }
}
/**
 * 安全地检查回复权限：出错时记日志打点（中断除外）并返回 false。
 */
//@ chunk-9tgt55am.js:77497-77626 placement
async function checkReplyPermissionSafe(e) {
  try {
    return await checkReplyPermission(e);
  } catch (error) {
    if (!isAbortError(error))
      (logError(error), logFeatureBad("artifact_comments_autoreact", "fork_gate_error"));
    return !1;
  }
}

export {
  scheduleThreadScan,
  ba,
  recordOwnReply,
  getAutoModeArbiterIssue,
  gd,
  isLastAgentReplyCurrent,
  describeReplyDenial,
  canForkThreadReply,
  checkReplyPermissionSafe,
  withinHourlyTurnCap,
  no,
  getOwnReplyInfo,
  getAutoReactArtifactState,
  resetAutoReactForSlug,
  quoteArtifactName,
  settleEmptyArtifact,
};
