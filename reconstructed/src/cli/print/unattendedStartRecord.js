/**
 * cli/print/unattendedStartRecord.ts
 *
 * 2.1.316 新增：无人值守会话的启动记录：重启次数上限、首批提示分类与拒绝、用户数据目录就绪闸门、暂存文件落位提示、系统状态消息与模型覆盖追踪。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (33)
 * attribution: placement 33
 */
import { posix } from "path";
import { randomUUID } from "crypto";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  hasFreshGrowthBookFeatures,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  TURN_DISPATCH_CONSTANTS,
  TURN_DISPATCH_MAX_AGE_MS,
  $0,
  emptyObjectSchema,
  UUID_HEX_PATTERN,
  MAX_BATCHED_PROMPT_ID_CHARS,
} from "./turnDispatch.js";
import { parseHintFrames } from "../../entrypoints/sdk/controlSchemas.js";
import { count } from "../../utils/collections.js";
import { createSignal } from "../../utils/signal.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { heldUntilExit } from "../../utils/terminalShutdown.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import {
  createApiErrorMessage,
  createModelSwitchBreadcrumbs as createModelSwitchBreadcrumbs_2,
  createUserMessage,
  localCommandOutputOf,
  createSystemMessage,
} from "../../utils/messages.js";
import { ensureUserDataRoot } from "../../utils/userDataRoots.js";
import { TURN_GATE_READY } from "./turnGate.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { STAGE_FILE_HOME_MOUNT_PREFIX } from "../../utils/stageFileRoots.js";
import {
  ensureFreshGrowthBook,
  isCarriedWritesEnabled,
  awaitCarriedWritesFlag,
} from "../remoteIO/turnHandoff.js";
import { STAGED_FILES_MISSING, STAGED_FILES_STILL_COPYING } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { buildModelSwitchNotice } from "./setModelControl.js";
import { abortPrecomputeOnModelSwitch } from "../../services/compact/precomputedCompact.js";
import { modelDisplayString, getMainLoopModel } from "../../utils/model/model.js";
import { env } from "../../utils/env.js";
import { formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { managedDenyStartupRefusal, isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { classifyFallbackOrigin } from "../../services/api/refusalFallback.js";
import { isExemptDefaultResolvingPick } from "../../utils/model/defaultModel.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";

//@ chunk-tyg7f3ek.js:266801-267003 placement
/**
 * 读 tengu_whimsical_otter：服务端下发的正整数为无人值守重启次数上限（不超过 TURN_DISPATCH_CONSTANTS），否则 "off"。
 */
function getUnattendedRestartLimit() {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_whimsical_otter", null);
  let r = typeof e === "string" && /^\d+$/.test(e) ? Number(e) : e;
  return isServedFeatureSource(source) && typeof r === "number" && Number.isInteger(r) && r >= 1
    ? Math.min(r, TURN_DISPATCH_CONSTANTS)
    : "off";
}
//@ chunk-tyg7f3ek.js:267003-267215 placement
function isRestartedMember(member) {
  return (
    member.startedBy === "restart" ||
    (member.resumeReason !== undefined && member.mode !== "orphaned-permission") ||
    (member.mode === "orphaned-permission" &&
      member.handedOffTurn === undefined &&
      member.orphanedPermission?.resumesInterruptedTurn !== true)
  );
}
//@ chunk-tyg7f3ek.js:267215-267404 placement
/**
 * 判断无人值守重启是否已达上限：读工作进程状态里的 restart_starts，记录损坏或最近窗口内的启动次数达到上限时返回 true。
 */
function hasHitUnattendedRestartLimit(workerState, now = Date.now()) {
  let unattendedRestartLimit = getUnattendedRestartLimit();
  if (unattendedRestartLimit === "off") return false;
  let s =
    workerState === null || workerState.readFailed === true
      ? "malformed"
      : parseHintFrames(workerState.internal?.restart_starts);
  return (
    s === "malformed" || count(s.starts, (h) => h > now - TURN_DISPATCH_MAX_AGE_MS) >= unattendedRestartLimit
  );
}
//@ chunk-tyg7f3ek.js:267404-267441 placement
function isNonRestPromptBatch(e) {
  return classifyPromptBatch(e) !== "rest";
}
//@ chunk-tyg7f3ek.js:267441-267567 placement
/**
 * 给一批待执行提示分类：有人或外部发起的为 "new"；有重启续跑成员的为 "listed"；其余为 "rest"。
 */
function classifyPromptBatch({ members }) {
  return members.some((member) => member.startedBy === "person" || member.startedBy === "outside")
    ? "new"
    : members.some(isRestartedMember)
      ? "listed"
      : "rest";
}
//@ chunk-tyg7f3ek.js:267567-273567 placement
/**
 * 无人值守启动记录：从工作进程状态读写 restart_starts（starts 时间戳、new_frames 已见帧），判断一次重启后是否允许自动续跑、拒绝并给出提示，写入通过 sessionState 刷盘并跟踪是否落盘。
 */
class UnattendedStartRecord {
  io;
  host;
  timings;
  now;
  record;
  readBegunAt;
  readInFlight = false;
  writes = 0;
  storedThrough = 0;
  firstPersonWrite = 0;
  latestFrameWrite = INITIAL_RECORD_WRITE;
  somethingHappened = createSignal();
  firstNewBatchSeen = false;
  counted = false;
  letATurnRun = false;
  loggedFreed = false;
  constructor(io, n, host, timings = $0, now = Date.now) {
    this.io = io;
    this.host = host;
    this.timings = timings;
    this.now = now;
    this.readBegunAt = performance.now();
    this.read(n);
  }
  get freed() {
    return this.firstPersonWrite > 0 && this.storedThrough >= this.firstPersonWrite;
  }
  read(e) {
    if (this.record !== undefined || e === null || e.readFailed === true) return;
    let restartStarts = e.internal?.restart_starts;
    let hintFrames = parseHintFrames(restartStarts);
    if (hintFrames !== "malformed") {
      this.record = hintFrames;
      this.somethingHappened.emit();
      return;
    }
    let { starts, new_frames: newFrames, ...y } = emptyObjectSchema().safeParse(restartStarts).data ?? {};
    this.record = {
      starts: [],
      new_frames: [],
      unknown: y,
    };
    this.write({
      starts: Array(TURN_DISPATCH_CONSTANTS).fill(this.now()),
    });
    this.somethingHappened.emit();
  }
  readIfUnread() {
    let e = performance.now() - this.readBegunAt;
    if (
      getUnattendedRestartLimit() === "off" ||
      this.record !== undefined ||
      e < this.timings.readSpacingMs ||
      (this.readInFlight && e < this.timings.readLostMs)
    )
      return;
    let startTime = performance.now();
    this.readBegunAt = startTime;
    this.readInFlight = true;
    (async () => {
      let r = await (async () => this.io.rereadWorkerState())().catch(() => null);
      if (this.readBegunAt === startTime) this.readInFlight = false;
      try {
        this.read(r);
      } catch (error) {
        logTurnError(error);
      }
    })();
  }
  takeFrame(e, { reRun, ownLine, person }) {
    try {
      this.readIfUnread();
      if (ownLine) return;
      let lower = e?.toLowerCase();
      if (
        reRun ||
        (lower !== undefined && !lower.startsWith(ANSWER) && this.record?.new_frames.includes(lower))
      )
        return "restart";
      let y = lower !== undefined && UUID_HEX_PATTERN.test(lower) ? lower : undefined;
      let S = person && y !== undefined ? "person" : "outside";
      if (this.record !== undefined && y !== undefined)
        this.writeFrame(S === "person", {
          ...(S === "person" && {
            starts: [],
          }),
          new_frames: [y, ...this.record.new_frames].slice(0, MAX_BATCHED_PROMPT_ID_CHARS),
        });
      return S;
    } catch (error) {
      logTurnError(error);
      return;
    }
  }
  answers = {
    markOf: (e) => {
      try {
        this.readIfUnread();
        return this.record?.new_frames.includes(answerFrameKey(e)) ? "restart" : "outside";
      } catch (error) {
        logTurnError(error);
        return;
      }
    },
    queued: (e) => {
      try {
        let n = answerFrameKey(e);
        if (this.record !== undefined && !this.record.new_frames.includes(n))
          this.writeFrame(false, {
            new_frames: [n, ...this.record.new_frames].slice(0, MAX_BATCHED_PROMPT_ID_CHARS),
          });
      } catch (error) {
        logTurnError(error);
      }
    },
  };
  writeFrame(e, n) {
    if (getUnattendedRestartLimit() === "off") {
      if (n !== "once more" && this.record !== undefined) {
        this.change(this.record, n);
        this.sendOnceFlagsAreFetched(e);
      }
      return;
    }
    let r = this.write(n === "once more" ? {} : n);
    this.latestFrameWrite = r;
    if (e && this.firstPersonWrite === 0) this.firstPersonWrite = r.number;
    if (n !== "once more")
      r.flushed.then((s) => {
        if (!s) this.writeFrame(e, "once more");
      });
  }
  async sendOnceFlagsAreFetched(e) {
    try {
      await this.host.flagsFetched();
    } catch {}
    try {
      if (getUnattendedRestartLimit() !== "off") this.writeFrame(e, {});
    } catch (error) {
      logTurnError(error);
    }
  }
  async refuseStart(batch, n) {
    let batchClass;
    try {
      batchClass = classifyPromptBatch(batch);
    } catch (error) {
      logTurnError(error);
      return;
    }
    let s = batchClass === "listed" ? await this.count(n, batch) : await this.letRun(batchClass, n);
    if (s === undefined && !this.letATurnRun) {
      this.letATurnRun = true;
      logUnattendedFirstTurn(batch, batchClass);
    }
    return s;
  }
  async letRun(e, n) {
    try {
      this.readIfUnread();
      if (e === "new" && !this.firstNewBatchSeen && getUnattendedRestartLimit() !== "off") {
        this.firstNewBatchSeen = true;
        await Promise.resolve();
        let latestFrameWrite = this.latestFrameWrite;
        await this.wait(n, () => this.isSettled(latestFrameWrite) || this.host.exiting());
      }
    } catch (error) {
      logTurnError(error);
    }
    return;
  }
  async count(e, n) {
    let { members } = n;
    let s = (reason) =>
      members.some((member) => member.wakesForLostTimers === true)
        ? buildUnattendedRefusalMessage(reason, TIMERS_NOT_RESTORED_MESSAGE)
        : members.every((member) => member.mode === "task-notification" && member.startedBy === "restart")
          ? "nothing"
          : members.some((member) => member.startedBy === "restart" && isHumanOrigin(member.origin))
            ? buildUnattendedRefusalMessage(reason, UNANSWERED_AFTER_RESTART_MESSAGE)
            : buildUnattendedRefusalMessage(reason);
    let startTime = performance.now();
    let y;
    let S = {
      inWindow: -1,
      max: -1,
    };
    let R = (L) => {
      try {
        logEvent("tengu_unattended_start", {
          outcome: fromEnum(L),
          in_window: S.inWindow,
          max: S.max,
          waited_ms: Math.round(performance.now() - startTime),
        });
        logUnattendedStartOutcome(L);
      } catch (error) {
        logTurnError(error);
      }
    };
    let w = () => {
      let L = y === undefined ? -1 : this.starts().indexOf(y);
      y = undefined;
      if (L >= 0)
        this.write({
          starts: this.starts().toSpliced(L, 1),
        });
    };
    let P = () =>
      e.aborted
        ? "aborted"
        : this.host.exiting()
          ? "exiting"
          : this.freed
            ? "freed"
            : this.counted
              ? "counted"
              : undefined;
    try {
      let L = this.steps(e, P, {
        compared: (x) => {
          S = x;
        },
        wrote: (x) => {
          y = x;
        },
      });
      let q;
      for (;;) {
        switch (P()) {
          case "exiting":
            R("held");
            return await heldUntilExit();
          case "aborted":
            w();
            R("aborted");
            return "aborted";
          case "freed":
            w();
            if (!this.loggedFreed) {
              this.loggedFreed = true;
              R("freed");
            }
            return;
          case "counted":
            return;
          case undefined:
            break;
        }
        if (q === "off") {
          R("off");
          return;
        }
        if (q === "started") {
          y = undefined;
          this.counted = true;
          R("started");
          return;
        }
        if (q !== undefined) {
          w();
          R(q);
          return s(q);
        }
        let x = await L.next();
        if (x.done) q = x.value;
      }
    } catch (error) {
      logTurnError(error);
      try {
        w();
      } catch (error) {
        logTurnError(error);
      }
      R("threw");
      return s("threw");
    }
  }
  async *steps(e, n, r) {
    let s = () => n() !== undefined;
    this.readIfUnread();
    let h = false;
    let y = () => {
      h = true;
      this.somethingHappened.emit();
    };
    this.host.flagsFetched().then(y, y);
    await this.wait(e, () => h || s());
    let unattendedRestartLimit = getUnattendedRestartLimit();
    if (unattendedRestartLimit === "off") return "off";
    r.compared({
      inWindow: -1,
      max: unattendedRestartLimit,
    });
    yield;
    await this.wait(e, () => this.record !== undefined || s(), this.timings.storeWaitMs);
    yield;
    if (this.record === undefined) return "record_unread";
    r.compared({
      inWindow: this.inWindow(),
      max: unattendedRestartLimit,
    });
    if (this.inWindow() >= unattendedRestartLimit) {
      await this.wait(e, s, this.timings.spentWaitMs);
      yield;
      r.compared({
        inWindow: this.inWindow(),
        max: unattendedRestartLimit,
      });
      if (this.inWindow() >= unattendedRestartLimit) return "limit";
    }
    let R = this.now();
    r.wrote(R);
    let w = this.write({
      starts: [R, ...this.starts()],
    });
    await this.wait(e, () => this.isSettled(w) || s(), this.timings.storeWaitMs);
    return this.storedThrough >= w.number ? "started" : "unconfirmed";
  }
  starts() {
    return this.record?.starts ?? [];
  }
  inWindow() {
    let e = this.now() - TURN_DISPATCH_MAX_AGE_MS;
    return count(this.starts(), (n) => n > e);
  }
  async wait(e, n, r = this.timings.waitMs) {
    let s = performance.now() + r;
    let h = () => {};
    let y = this.somethingHappened.subscribe(() => h());
    try {
      while (!e.aborted && !n()) {
        this.readIfUnread();
        let S = s - performance.now();
        if (S <= 0) return;
        let deferred = Promise.withResolvers();
        h = deferred.resolve;
        await Promise.race([deferred.promise, sleep(Math.min(S, this.timings.lookMs), e)]);
      }
    } finally {
      y();
    }
  }
  isSettled(e) {
    return this.storedThrough >= e.number || e.flushAnswered();
  }
  change(e, n) {
    this.record = {
      ...e,
      ...n,
      starts: [...(n.starts ?? e.starts)].sort((r, s) => s - r).slice(0, TURN_DISPATCH_CONSTANTS),
    };
    return this.record;
  }
  write(e) {
    if (this.record === undefined) {
      logTurnError(Error("a write of the record before any read of it"));
      return REFUSED_RECORD_WRITE;
    }
    let n = ++this.writes;
    let { starts, new_frames: newFrames, unknown } = this.change(this.record, e);
    let y = false;
    let flushed = (async () => {
      let R = false;
      try {
        this.io.sessionState.notifyInternalMetadataChanged({
          restart_starts: {
            ...unknown,
            starts,
            new_frames: newFrames,
          },
        });
        R = (await this.io.flushSessionState()) === true;
      } catch (error) {
        logTurnError(error);
      }
      y = true;
      if (R) this.storedThrough = Math.max(this.storedThrough, n);
      this.somethingHappened.emit();
      return R;
    })();
    return {
      number: n,
      flushed,
      flushAnswered: () => y,
    };
  }
}
//@ chunk-tyg7f3ek.js:273567-273720 placement
var INITIAL_RECORD_WRITE = {
  number: 0,
  flushed: Promise.resolve(true),
  flushAnswered: () => true,
};
var REFUSED_RECORD_WRITE = {
  number: Number.POSITIVE_INFINITY,
  flushed: Promise.resolve(false),
  flushAnswered: () => true,
};
//@ chunk-tyg7f3ek.js:273720-273985 placement
function logUnattendedStartOutcome(e) {
  switch (e) {
    case "started":
    case "freed":
    case "off":
      return logFeatureOk("print_unattended_start");
    case "record_unread":
    case "unconfirmed":
      return logFeatureSad("print_unattended_start", e);
    case "limit":
    case "threw":
      return logFeatureBad("print_unattended_start", e);
    case "aborted":
    case "held":
      return;
  }
}
//@ chunk-tyg7f3ek.js:273985-274002 placement
var ANSWER = "answer:";
//@ chunk-tyg7f3ek.js:274002-274049 placement
function answerFrameKey(e) {
  return `${ANSWER}${e}`.toLowerCase();
}
//@ chunk-tyg7f3ek.js:274049-274390 placement
/**
 * 记录 tengu_unattended_start 事件：批次类别、首成员的模式与提示来源。
 */
function logUnattendedFirstTurn(batch, batchClass) {
  try {
    let r = batch.members[0];
    logEvent("tengu_unattended_start", {
      outcome: fromEnum("first_turn"),
      class: fromEnum(
        batchClass === "new"
          ? batch.members.some((member) => member.startedBy === "person")
            ? "person"
            : "outside"
          : batchClass,
      ),
      mode: fromEnumOpt(r?.mode),
      prompt_origin_kind: fromEnumOpt(r?.origin?.kind),
      prompt_origin_subkind: fromEnumOpt(
        r?.origin !== undefined && "subkind" in r.origin ? r.origin.subkind : undefined,
      ),
    });
  } catch (error) {
    logTurnError(error);
  }
}
//@ chunk-tyg7f3ek.js:274390-274410 placement
function logTurnError(error) {
  logError(error);
}
//@ chunk-tyg7f3ek.js:274410-274606 placement
function buildUnattendedRefusalMessage(reason, content) {
  return reason === "limit"
    ? createApiErrorMessage({
        content: content ?? UNATTENDED_LIMIT_MESSAGE,
        apiError: "unattended_start_limit",
        apiErrorIsTransient: false,
      })
    : createApiErrorMessage({
        content: content ?? UNATTENDED_UNCONFIRMED_MESSAGE,
        apiError: "unattended_start_unconfirmed",
        apiErrorIsTransient: false,
      });
}
//@ chunk-tyg7f3ek.js:274606-275057 placement
/**
 * 会话重启后不再自动继续时的各种提示文字。
 */
var UNATTENDED_LIMIT_MESSAGE =
  "This session restarted with no new message, and Claude has stopped continuing it automatically. Send a message to continue.";
var UNATTENDED_UNCONFIRMED_MESSAGE =
  "Claude couldn't confirm that it could continue this session on its own, so it didn't. Send a message to continue.";
var TIMERS_NOT_RESTORED_MESSAGE =
  "Timers that were pending when this session restarted weren't set again. Send a message to continue.";
var UNANSWERED_AFTER_RESTART_MESSAGE =
  "Your last message wasn't answered, because this session restarted. Please send it again.";
//@ chunk-tyg7f3ek.js:275057-275069 placement
var USER_DATA_ROOTS_WAIT_MS = 5000;
//@ chunk-tyg7f3ek.js:275069-275458 placement
/**
 * 回合前置门：确保用户数据根目录已创建，最多等待 waitMs；超时只告警一次（user_data_roots_wait_expired），不阻塞回合。
 */
function createUserDataRootsTurnGate(waitMs = USER_DATA_ROOTS_WAIT_MS) {
  let n;
  let r = false;
  return {
    name: "user_data_roots",
    beforeTurn: async ({ signal }) => {
      n ??= ensureUserDataRoot()
        .then(() => "created")
        .finally(() => {
          n = undefined;
          r = false;
        });
      if (r) return TURN_GATE_READY;
      let abortController = new AbortController();
      if (
        (await Promise.race([
          n,
          sleep(waitMs, AbortSignal.any([signal, abortController.signal])).then(() => "gave_up"),
        ]).finally(() => abortController.abort())) === "gave_up" &&
        !signal.aborted
      ) {
        r = true;
        logForDiagnosticsNoPII("warn", "user_data_roots_wait_expired", {
          wait_ms: waitMs,
        });
      }
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-tyg7f3ek.js:275488-275501 placement
var HOME_FILES_FLAG_WAIT_MS = 20000;
//@ chunk-tyg7f3ek.js:275501-275588 placement
function isStagedHomeMountPath(e) {
  return (
    typeof e === "string" &&
    isClaudeAiChatOrigin() &&
    posix.normalize(e).startsWith(`${STAGE_FILE_HOME_MOUNT_PREFIX}/`)
  );
}
//@ chunk-tyg7f3ek.js:275588-275973 placement
/**
 * 等 GrowthBook 初始化（有上限），读取 tengu_hazy_nova 得到 home 文件暂存开关 "on"/"off"/"not_loaded"，并记录等待耗时。
 */
async function waitForHomeFilesFlag(options, timeoutMs = HOME_FILES_FLAG_WAIT_MS) {
  if (!isStagedHomeMountPath(options)) return "off";
  let startTime = performance.now();
  await withDeadline(ensureFreshGrowthBook(), timeoutMs);
  let { value: s, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_hazy_nova", false);
  let y = source === "fallback" && !hasFreshGrowthBookFeatures();
  let S = y ? "not_loaded" : s ? "on" : "off";
  let waitedMs = Math.round(performance.now() - startTime);
  logEvent("tengu_stage_file_home_flag_wait", {
    home_files_flag: fromEnum(S),
    waited_ms: waitedMs,
  });
  logForDiagnosticsNoPII(y ? "warn" : "info", "stage_file_home_flag_wait", {
    home_files_flag: S,
    waited_ms: waitedMs,
  });
  return S;
}
//@ chunk-tyg7f3ek.js:275973-276476 placement
/**
 * 回合开始时放置上一回合交接带来的写入文件：没有则记 no_files；功能关闭则拒绝；否则动态加载 placeCarriedWrites 执行。
 */
async function placeCarriedWritesAtTurnStart(turn, n, r) {
  if (turn.carriedWrites === undefined) {
    if (isCarriedWritesEnabled())
      logEvent("tengu_turn_handoff_carried_writes", {
        at: lit("turn_start"),
        outcome: lit("no_files"),
      });
    return true;
  }
  if (!(await awaitCarriedWritesFlag())) {
    logEvent("tengu_turn_handoff_carried_writes", {
      at: lit("turn_start"),
      outcome: lit("refused"),
      refusal: lit("switched_off"),
    });
    logFeatureSad("ccr_turn_handoff_carried_writes", "switched_off");
    return false;
  }
  try {
    let { placeCarriedWrites } = await import("./chunk-1bmxdqa0.js");
    return await placeCarriedWrites(turn, n, r);
  } catch (error) {
    logFeatureBad("ccr_turn_handoff_carried_writes", "load_failed");
    logError(error);
    return false;
  }
}
//@ chunk-tyg7f3ek.js:276476-276486 placement
var MAX_DIRECTORIES_LISTED = 50;
//@ chunk-tyg7f3ek.js:276486-277043 placement
/**
 * 说明暂存文件可能未送达（路径可能缺失或旧），并按原因提示空间不足或文件名过长。
 */
function formatStagedFilesNotPlacedNote(paths, failureKinds) {
  let r = paths.length === 1;
  return `${paths.length} ${r ? "file" : "files"} may not have arrived here, so ${r ? "this path" : "these paths"} may be missing or hold an older copy: ${formatDirectoryList(paths)}${
    failureKinds.has("no_space")
      ? `
At least one of these copies failed with "no space left on device". Make space before the file is sent again. Ask the user before you delete one of their files.`
      : ""
  }${
    failureKinds.has("name_too_long")
      ? `
At least one of these names is too long for the file system here (the usual limit is 255 bytes). That file can arrive only after the name is made shorter.`
      : ""
  }`;
}
//@ chunk-tyg7f3ek.js:277043-277375 placement
/**
 * 有暂存文件未能落盘时，给模型发一条隐藏通知（STAGED_FILES_MISSING），说明路径和失败原因（磁盘满、文件名过长）。
 */
function noteStagedFilesNotPlaced(paths, failureKinds) {
  try {
    let r = stagedFilesNoticeCounters();
    let s = {
      file_count: paths.length,
      no_space: failureKinds.has("no_space") ? 1 : 0,
      name_too_long: failureKinds.has("name_too_long") ? 1 : 0,
    };
    logForDiagnosticsNoPII("warn", "staged_files_not_placed", {
      ...s,
      ...r,
    });
    if (r.told === 0) return false;
    enqueueHiddenNotice(STAGED_FILES_MISSING, formatStagedFilesNotPlacedNote(paths, failureKinds));
    logFeatureOk("ccr_stage_file_not_placed_note", s);
    return true;
  } catch (error) {
    logFeatureBad("ccr_stage_file_not_placed_note", "threw");
    logError(error);
    return false;
  }
}
//@ chunk-tyg7f3ek.js:277375-278647 placement
/**
 * 生成"文件仍在复制中"的模型提示：告诉模型不要说文件没到、需要时分段等待。
 */
function formatStagedFilesStillCopyingNote(paths) {
  return paths.length === 1
    ? `1 file is still being copied here, so this path may be missing or hold an older copy for now: ${formatDirectoryList(paths)}
The copy has not failed. It can take a few more minutes. While it runs, do not tell the user that the file did not arrive, and do not ask for it again, whatever an earlier message says about a missing file. If you need the file, wait for up to a minute at a time: run a foreground command that ends when the file is there or the minute is over, then look again. If it is still missing after a few minutes, tell the user that it is still being copied. Another note will tell you if the copy fails.`
    : `${paths.length} files are still being copied here, so these paths may be missing or hold an older copy for now: ${formatDirectoryList(paths)}
The copies have not failed. They can take a few more minutes. While they run, do not tell the user that these files did not arrive, and do not ask for them again, whatever an earlier message says about a missing file. If you need one of these files, wait for up to a minute at a time: run a foreground command that ends when the file is there or the minute is over, then look again. If it is still missing after a few minutes, tell the user that it is still being copied. Another note will tell you if a copy fails.`;
}
//@ chunk-tyg7f3ek.js:278647-278923 placement
function noteStagedFilesStillCopying(paths) {
  try {
    let n = stagedFilesNoticeCounters();
    logForDiagnosticsNoPII("info", "staged_files_still_copying", {
      file_count: paths.length,
      ...n,
    });
    if (n.told === 0) return false;
    enqueueHiddenNotice(STAGED_FILES_STILL_COPYING, formatStagedFilesStillCopyingNote(paths));
    logFeatureOk("ccr_stage_file_still_copying_note", {
      file_count: paths.length,
    });
    return true;
  } catch (error) {
    logFeatureBad("ccr_stage_file_still_copying_note", "threw");
    logError(error);
    return false;
  }
}
//@ chunk-tyg7f3ek.js:278923-279027 placement = formatDirectoryList (1)
/**
 * （切分错误）XML 转义后列出前若干个目录，超出部分写 "and N more"。
 */
function formatDirectoryList(directories) {
  let dirCount = directories.length - MAX_DIRECTORIES_LISTED;
  return `${directories.slice(0, MAX_DIRECTORIES_LISTED).map(escapeXml).join(", ")}${dirCount > 0 ? `, and ${dirCount} more` : ""}`;
}
//@ chunk-tyg7f3ek.js:279027-279112 placement
function stagedFilesNoticeCounters() {
  return {
    told: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_dunlin", false) === true ? 1 : 0,
    flags_loaded: hasFreshGrowthBookFeatures() ? 1 : 0,
  };
}
//@ chunk-tyg7f3ek.js:279112-279274 placement
function enqueueHiddenNotice(tag, body) {
  enqueuePendingNotification({
    value: formatTaskNotification({
      body: `
<${tag}>
${body}
</${tag}>`,
    }),
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    shouldQuery: false,
    passive: true,
  });
}
//@ chunk-tyg7f3ek.js:279311-279524 placement
function buildSystemStatusMessage(status, extra) {
  return {
    type: "system",
    subtype: "status",
    status,
    ...(extra?.compactResult !== undefined && {
      compact_result: extra.compactResult,
    }),
    ...(extra?.compactError !== undefined && {
      compact_error: extra.compactError,
    }),
    session_id: getSessionId(),
    uuid: randomUUID(),
  };
}
//@ chunk-tyg7f3ek.js:279524-280615 placement
/**
 * 输出模式下的模型切换提示集合：conversationModel 计算模型切换说明；injectModelSwitchBreadcrumbs 写入切换面包屑（远程模式附 system-reminder）；noticeRestrictedModel 提示受限模型；noticeFlagSettingsModel 按 flag 设置结果给提示。
 */
function createModelChangeNotices({ session, messages, appendToConversation, enqueue, isLaunchModelPick }) {
  function conversationModel(activeModel) {
    try {
      return buildModelSwitchNotice({
        messages: messages(),
        queriedInProcess: session.requestJournal.mainThreadRequestedInProcess(),
        activeModel,
      });
    } catch (error) {
      logError(error);
      return;
    }
  }
  function injectModelSwitchBreadcrumbs(modelArg, x) {
    abortPrecomputeOnModelSwitch(session.precompute);
    if (isLaunchModelPick?.()) return;
    let breadcrumbs = createModelSwitchBreadcrumbs_2(modelArg, modelDisplayString(x));
    appendToConversation(breadcrumbs);
    if (env.CLAUDE_CODE_REMOTE) {
      let Z = modelDisplayString(x);
      appendToConversation([
        createUserMessage({
          content: `<system-reminder>The model for this session has been changed to ${Z}. You are now running as ${Z}.</system-reminder>`,
          isMeta: true,
        }),
      ]);
    }
    for (let breadcrumb of breadcrumbs)
      if (localCommandOutputOf(breadcrumb) === "stdout")
        enqueue({
          type: "user",
          message: breadcrumb.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
          uuid: breadcrumb.uuid,
          timestamp: breadcrumb.timestamp,
          isReplay: true,
        });
  }
  let lastRestrictedModel;
  function noticeRestrictedModel(q, x) {
    if (q === lastRestrictedModel) return;
    lastRestrictedModel = q;
    let systemMessage = createSystemMessage(
      formatModelRestrictedNotice(q, x ?? getMainLoopModel()),
      "warning",
    );
    appendToConversation([systemMessage]);
    enqueue({
      ...systemMessage,
      session_id: getSessionId(),
    });
  }
  function recordAllowedModelApplied() {
    lastRestrictedModel = undefined;
  }
  function noticeFlagSettingsModel({ defaultPickRefused, model, rejected, stepDown, effectiveModel }) {
    if (defaultPickRefused) noticeRestrictedModel(getDefaultMainLoopModel(), effectiveModel());
    else if (model == null) recordAllowedModelApplied();
    else if (rejected) noticeRestrictedModel(model, effectiveModel());
    else if (stepDown !== null) noticeRestrictedModel(model, stepDown);
    else recordAllowedModelApplied();
  }
  return {
    conversationModel,
    injectModelSwitchBreadcrumbs,
    noticeRestrictedModel,
    recordAllowedModelApplied,
    noticeFlagSettingsModel,
  };
}
//@ chunk-tyg7f3ek.js:280615-280716 placement
function isDefaultModelRefusedByPolicy(model) {
  return (
    (model == null || String(model).trim().toLowerCase() === "default") &&
    managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") !== null
  );
}
//@ chunk-tyg7f3ek.js:280716-281931 placement
/**
 * 记录回合开始时的模型覆盖与当前模型，回合结束时用 resolveTurnEndModelOverride 决定是否采纳回合中的覆盖、清回默认，或提示被白名单拦下。
 */
class TurnModelOverrideTracker {
  modelOverride;
  activeModel;
  setActiveModel;
  recordAllowedModelApplied;
  noticeRestrictedModel;
  atTurnStart = {
    override: undefined,
    active: undefined,
  };
  constructor({
    modelOverride,
    activeModel,
    setActiveModel,
    recordAllowedModelApplied,
    noticeRestrictedModel,
  }) {
    this.modelOverride = modelOverride;
    this.activeModel = activeModel;
    this.setActiveModel = setActiveModel;
    this.recordAllowedModelApplied = recordAllowedModelApplied;
    this.noticeRestrictedModel = noticeRestrictedModel;
  }
  noteTurnStart() {
    this.atTurnStart = {
      override: this.modelOverride(),
      active: this.activeModel(),
    };
  }
  adoptAtTurnEnd() {
    let e = this.activeModel();
    let n = this.modelOverride();
    let decision = resolveTurnEndModelOverride({
      activeUserSpecifiedModel: e,
      activeAtTurnStart: this.atTurnStart.active,
      overrideAtTurnStart: this.atTurnStart.override,
      overrideAtTurnEnd: n,
    });
    if (decision.kind !== "keep" && e !== undefined) {
      logEvent("tengu_print_model_override_adopted", {
        from_model_scope: fromEnum(classifyFallbackOrigin(e)),
        ...(decision.kind === "adopt"
          ? {
              to_model_scope: fromEnum(classifyFallbackOrigin(decision.model)),
            }
          : {
              cleared_to_session_default: true,
            }),
        override_same_at_both_ends: n === this.atTurnStart.override,
      });
      this.setActiveModel(decision.kind === "adopt" ? decision.model : undefined);
      this.recordAllowedModelApplied();
    }
    if (decision.kind === "keep" && decision.allowedOverrideApplied) this.recordAllowedModelApplied();
    if (
      decision.kind === "keep" &&
      decision.blockedByAllowlist !== undefined &&
      (e === undefined || isExemptDefaultResolvingPick(e) || isModelAllowed(e))
    )
      this.noticeRestrictedModel(decision.blockedByAllowlist, e);
  }
}
//@ chunk-tyg7f3ek.js:281931-282558 placement
/**
 * 回合结束时决定模型覆盖：keep（附带 blockedByAllowlist / allowedOverrideApplied）、clearToSessionDefault 或 adopt。"default" 解析为默认主模型，不在允许列表里的模型不采纳。
 */
function resolveTurnEndModelOverride({
  activeUserSpecifiedModel,
  activeAtTurnStart,
  overrideAtTurnStart,
  overrideAtTurnEnd,
}) {
  if (activeUserSpecifiedModel === undefined) {
    if (overrideAtTurnEnd !== overrideAtTurnStart) {
      if (typeof overrideAtTurnEnd === "string") {
        let resolvedModel =
          overrideAtTurnEnd.trim().toLowerCase() === "default"
            ? getDefaultMainLoopModel()
            : overrideAtTurnEnd;
        if (!isModelAllowed(resolvedModel) && !isExemptDefaultResolvingPick(resolvedModel))
          return {
            kind: "keep",
            blockedByAllowlist: overrideAtTurnEnd,
          };
      }
      return {
        kind: "keep",
        allowedOverrideApplied: true,
      };
    }
    return {
      kind: "keep",
    };
  }
  if (overrideAtTurnEnd === overrideAtTurnStart && activeUserSpecifiedModel === activeAtTurnStart)
    return {
      kind: "keep",
    };
  if (overrideAtTurnEnd === null)
    return {
      kind: "clearToSessionDefault",
    };
  if (typeof overrideAtTurnEnd !== "string")
    return {
      kind: "keep",
    };
  let resolvedModel =
    overrideAtTurnEnd.trim().toLowerCase() === "default" ? getDefaultMainLoopModel() : overrideAtTurnEnd;
  if (parseUserSpecifiedModel(resolvedModel) === parseUserSpecifiedModel(activeUserSpecifiedModel))
    return {
      kind: "keep",
    };
  if (!isExemptDefaultResolvingPick(resolvedModel) && !isModelAllowed(resolvedModel))
    return {
      kind: "keep",
      blockedByAllowlist: overrideAtTurnEnd,
    };
  return {
    kind: "adopt",
    model: resolvedModel,
  };
}
export {
  createUserDataRootsTurnGate,
  hasHitUnattendedRestartLimit,
  UnattendedStartRecord,
  createModelChangeNotices,
  buildSystemStatusMessage,
  noteStagedFilesNotPlaced,
  noteStagedFilesStillCopying,
  placeCarriedWritesAtTurnStart,
  TurnModelOverrideTracker,
  isNonRestPromptBatch,
  isStagedHomeMountPath,
  waitForHomeFilesFlag,
  isDefaultModelRefusedByPolicy,
};
