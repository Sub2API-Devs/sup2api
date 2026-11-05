/**
 * cli/print/unattendedStartRecord.ts
 *
 * 2.1.316 新增：无人值守会话的启动记录：重启次数上限、首批提示分类与拒绝、用户数据目录就绪闸门、暂存文件落位提示、系统状态消息与模型覆盖追踪。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (36)
 * attribution: placement 33, layout 3
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
  TURN_DISPATCH_WAITS,
  emptyObjectSchema,
  UUID_HEX_PATTERN,
  MAX_BATCHED_PROMPT_ID_CHARS,
} from "./turnDispatch.js";
import { parseHintFrames } from "../../entrypoints/sdk/controlSchemas.js";
import { countWhere } from "../../utils/collections.js";
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
  createSystemMessage,
  createModelSwitchBreadcrumbs,
  createUserMessage,
  localCommandOutputOf,
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
import { formatModelRestrictedNotice, displayModelName } from "../../utils/model/validateModel.js";
import { getMainLoopModel, modelDisplayString } from "../../utils/model/model.js";
import { buildModelSwitchNotice } from "./setModelControl.js";
import { abortPrecomputeOnModelSwitch } from "../../services/compact/precomputedCompact.js";
import { env } from "../../utils/env.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { managedDenyStartupRefusal, isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { classifyFallbackOrigin } from "../../services/api/refusalFallback.js";
import { isExemptDefaultResolvingPick } from "../../utils/model/defaultModel.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:295932-296134 placement
/**
 * 读 tengu_whimsical_otter：服务端下发的正整数为无人值守重启次数上限（不超过 TURN_DISPATCH_CONSTANTS），否则 "off"。
 */
function getUnattendedRestartLimit() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_whimsical_otter", null);
  let limit = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return isServedFeatureSource(source) && typeof limit === "number" && Number.isInteger(limit) && limit >= 1
    ? Math.min(limit, TURN_DISPATCH_CONSTANTS)
    : "off";
}
//@ chunk-0yw3taqg.js:296134-296346 placement
function isRestartedMember(member) {
  return (
    member.startedBy === "restart" ||
    (member.resumeReason !== undefined && member.mode !== "orphaned-permission") ||
    (member.mode === "orphaned-permission" &&
      member.handedOffTurn === undefined &&
      member.orphanedPermission?.resumesInterruptedTurn !== true)
  );
}
//@ chunk-0yw3taqg.js:296346-296535 placement
/**
 * 判断无人值守重启是否已达上限：读工作进程状态里的 restart_starts，记录损坏或最近窗口内的启动次数达到上限时返回 true。
 */
function hasHitUnattendedRestartLimit(workerState, now = Date.now()) {
  let unattendedRestartLimit = getUnattendedRestartLimit();
  if (unattendedRestartLimit === "off") return false;
  let frames =
    workerState === null || workerState.readFailed === true
      ? "malformed"
      : parseHintFrames(workerState.internal?.restart_starts);
  return (
    frames === "malformed" ||
    countWhere(frames.starts, (at) => at > now - TURN_DISPATCH_MAX_AGE_MS) >= unattendedRestartLimit
  );
}
//@ chunk-0yw3taqg.js:296535-296572 placement
function isNonRestPromptBatch(batch) {
  return classifyPromptBatch(batch) !== "rest";
}
//@ chunk-0yw3taqg.js:296572-296698 placement
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
//@ chunk-0yw3taqg.js:296698-302698 placement
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
  constructor(io, restored, host, timings = TURN_DISPATCH_WAITS, now = Date.now) {
    this.io = io;
    this.host = host;
    this.timings = timings;
    this.now = now;
    this.readBegunAt = performance.now();
    this.read(restored);
  }
  get freed() {
    return this.firstPersonWrite > 0 && this.storedThrough >= this.firstPersonWrite;
  }
  read(state) {
    if (this.record !== undefined || state === null || state.readFailed === true) return;
    let restartStarts = state.internal?.restart_starts;
    let hintFrames = parseHintFrames(restartStarts);
    if (hintFrames !== "malformed") {
      this.record = hintFrames;
      this.somethingHappened.emit();
      return;
    }
    let {
      starts,
      new_frames: newFrames,
      ...unknown
    } = emptyObjectSchema().safeParse(restartStarts).data ?? {};
    this.record = {
      starts: [],
      new_frames: [],
      unknown,
    };
    this.write({
      starts: Array(TURN_DISPATCH_CONSTANTS).fill(this.now()),
    });
    this.somethingHappened.emit();
  }
  readIfUnread() {
    let sinceRead = performance.now() - this.readBegunAt;
    if (
      getUnattendedRestartLimit() === "off" ||
      this.record !== undefined ||
      sinceRead < this.timings.readSpacingMs ||
      (this.readInFlight && sinceRead < this.timings.readLostMs)
    )
      return;
    let startTime = performance.now();
    this.readBegunAt = startTime;
    this.readInFlight = true;
    (async () => {
      let state = await (async () => this.io.rereadWorkerState())().catch(() => null);
      if (this.readBegunAt === startTime) this.readInFlight = false;
      try {
        this.read(state);
      } catch (error) {
        logTurnError(error);
      }
    })();
  }
  takeFrame(uuid, { reRun, ownLine, person }) {
    try {
      this.readIfUnread();
      if (ownLine) return;
      let lower = uuid?.toLowerCase();
      if (
        reRun ||
        (lower !== undefined && !lower.startsWith(ANSWER) && this.record?.new_frames.includes(lower))
      )
        return "restart";
      let frameUuid = lower !== undefined && UUID_HEX_PATTERN.test(lower) ? lower : undefined;
      let kind = person && frameUuid !== undefined ? "person" : "outside";
      if (this.record !== undefined && frameUuid !== undefined)
        this.writeFrame(kind === "person", {
          ...(kind === "person" && {
            starts: [],
          }),
          new_frames: [frameUuid, ...this.record.new_frames].slice(0, MAX_BATCHED_PROMPT_ID_CHARS),
        });
      return kind;
    } catch (error) {
      logTurnError(error);
      return;
    }
  }
  answers = {
    markOf: (uuid) => {
      try {
        this.readIfUnread();
        return this.record?.new_frames.includes(answerFrameKey(uuid)) ? "restart" : "outside";
      } catch (error) {
        logTurnError(error);
        return;
      }
    },
    queued: (uuid) => {
      try {
        let key = answerFrameKey(uuid);
        if (this.record !== undefined && !this.record.new_frames.includes(key))
          this.writeFrame(false, {
            new_frames: [key, ...this.record.new_frames].slice(0, MAX_BATCHED_PROMPT_ID_CHARS),
          });
      } catch (error) {
        logTurnError(error);
      }
    },
  };
  writeFrame(person, next) {
    if (getUnattendedRestartLimit() === "off") {
      if (next !== "once more" && this.record !== undefined) {
        this.change(this.record, next);
        this.sendOnceFlagsAreFetched(person);
      }
      return;
    }
    let write = this.write(next === "once more" ? {} : next);
    this.latestFrameWrite = write;
    if (person && this.firstPersonWrite === 0) this.firstPersonWrite = write.number;
    if (next !== "once more")
      write.flushed.then((flushed) => {
        if (!flushed) this.writeFrame(person, "once more");
      });
  }
  async sendOnceFlagsAreFetched(person) {
    try {
      await this.host.flagsFetched();
    } catch {}
    try {
      if (getUnattendedRestartLimit() !== "off") this.writeFrame(person, {});
    } catch (error) {
      logTurnError(error);
    }
  }
  async refuseStart(batch, signal) {
    let batchClass;
    try {
      batchClass = classifyPromptBatch(batch);
    } catch (error) {
      logTurnError(error);
      return;
    }
    let refusal =
      batchClass === "listed" ? await this.count(signal, batch) : await this.letRun(batchClass, signal);
    if (refusal === undefined && !this.letATurnRun) {
      this.letATurnRun = true;
      logUnattendedFirstTurn(batch, batchClass);
    }
    return refusal;
  }
  async letRun(batchClass, signal) {
    try {
      this.readIfUnread();
      if (batchClass === "new" && !this.firstNewBatchSeen && getUnattendedRestartLimit() !== "off") {
        this.firstNewBatchSeen = true;
        await Promise.resolve();
        let latestFrameWrite = this.latestFrameWrite;
        await this.wait(signal, () => this.isSettled(latestFrameWrite) || this.host.exiting());
      }
    } catch (error) {
      logTurnError(error);
    }
    return;
  }
  async count(signal, batch) {
    let { members } = batch;
    let refusalMessage = (reason) =>
      members.some((member) => member.wakesForLostTimers === true)
        ? buildUnattendedRefusalMessage(reason, TIMERS_NOT_RESTORED_MESSAGE)
        : members.every((member) => member.mode === "task-notification" && member.startedBy === "restart")
          ? "nothing"
          : members.some((member) => member.startedBy === "restart" && isHumanOrigin(member.origin))
            ? buildUnattendedRefusalMessage(reason, UNANSWERED_AFTER_RESTART_MESSAGE)
            : buildUnattendedRefusalMessage(reason);
    let startTime = performance.now();
    let written;
    let compared = {
      inWindow: -1,
      max: -1,
    };
    let report = (outcome) => {
      try {
        logEvent("tengu_unattended_start", {
          outcome: fromEnum(outcome),
          in_window: compared.inWindow,
          max: compared.max,
          waited_ms: Math.round(performance.now() - startTime),
        });
        logUnattendedStartOutcome(outcome);
      } catch (error) {
        logTurnError(error);
      }
    };
    let undoStart = () => {
      let index = written === undefined ? -1 : this.starts().indexOf(written);
      written = undefined;
      if (index >= 0)
        this.write({
          starts: this.starts().toSpliced(index, 1),
        });
    };
    let state = () =>
      signal.aborted
        ? "aborted"
        : this.host.exiting()
          ? "exiting"
          : this.freed
            ? "freed"
            : this.counted
              ? "counted"
              : undefined;
    try {
      let steps = this.steps(signal, state, {
        compared: (reported) => {
          compared = reported;
        },
        wrote: (recorded) => {
          written = recorded;
        },
      });
      let stepResult;
      for (;;) {
        switch (state()) {
          case "exiting":
            report("held");
            return await heldUntilExit();
          case "aborted":
            undoStart();
            report("aborted");
            return "aborted";
          case "freed":
            undoStart();
            if (!this.loggedFreed) {
              this.loggedFreed = true;
              report("freed");
            }
            return;
          case "counted":
            return;
          case undefined:
            break;
        }
        if (stepResult === "off") {
          report("off");
          return;
        }
        if (stepResult === "started") {
          written = undefined;
          this.counted = true;
          report("started");
          return;
        }
        if (stepResult !== undefined) {
          undoStart();
          report(stepResult);
          return refusalMessage(stepResult);
        }
        let step = await steps.next();
        if (step.done) stepResult = step.value;
      }
    } catch (error) {
      logTurnError(error);
      try {
        undoStart();
      } catch (error) {
        logTurnError(error);
      }
      report("threw");
      return refusalMessage("threw");
    }
  }
  async *steps(signal, state, hooks) {
    let stateChanged = () => state() !== undefined;
    this.readIfUnread();
    let flagsFetched = false;
    let onFlags = () => {
      flagsFetched = true;
      this.somethingHappened.emit();
    };
    this.host.flagsFetched().then(onFlags, onFlags);
    await this.wait(signal, () => flagsFetched || stateChanged());
    let unattendedRestartLimit = getUnattendedRestartLimit();
    if (unattendedRestartLimit === "off") return "off";
    hooks.compared({
      inWindow: -1,
      max: unattendedRestartLimit,
    });
    yield;
    await this.wait(signal, () => this.record !== undefined || stateChanged(), this.timings.storeWaitMs);
    yield;
    if (this.record === undefined) return "record_unread";
    hooks.compared({
      inWindow: this.inWindow(),
      max: unattendedRestartLimit,
    });
    if (this.inWindow() >= unattendedRestartLimit) {
      await this.wait(signal, stateChanged, this.timings.spentWaitMs);
      yield;
      hooks.compared({
        inWindow: this.inWindow(),
        max: unattendedRestartLimit,
      });
      if (this.inWindow() >= unattendedRestartLimit) return "limit";
    }
    let now = this.now();
    hooks.wrote(now);
    let write = this.write({
      starts: [now, ...this.starts()],
    });
    await this.wait(signal, () => this.isSettled(write) || stateChanged(), this.timings.storeWaitMs);
    return this.storedThrough >= write.number ? "started" : "unconfirmed";
  }
  starts() {
    return this.record?.starts ?? [];
  }
  inWindow() {
    let cutoff = this.now() - TURN_DISPATCH_MAX_AGE_MS;
    return countWhere(this.starts(), (at) => at > cutoff);
  }
  async wait(signal, done, waitMs = this.timings.waitMs) {
    let deadline = performance.now() + waitMs;
    let wake = () => {};
    let unsubscribe = this.somethingHappened.subscribe(() => wake());
    try {
      while (!signal.aborted && !done()) {
        this.readIfUnread();
        let left = deadline - performance.now();
        if (left <= 0) return;
        let deferred = Promise.withResolvers();
        wake = deferred.resolve;
        await Promise.race([deferred.promise, sleep(Math.min(left, this.timings.lookMs), signal)]);
      }
    } finally {
      unsubscribe();
    }
  }
  isSettled(write) {
    return this.storedThrough >= write.number || write.flushAnswered();
  }
  change(record, patch) {
    this.record = {
      ...record,
      ...patch,
      starts: [...(patch.starts ?? record.starts)].sort((a, b) => b - a).slice(0, TURN_DISPATCH_CONSTANTS),
    };
    return this.record;
  }
  write(patch) {
    if (this.record === undefined) {
      logTurnError(Error("a write of the record before any read of it"));
      return REFUSED_RECORD_WRITE;
    }
    let number = ++this.writes;
    let { starts, new_frames: newFrames, unknown } = this.change(this.record, patch);
    let answered = false;
    let flushed = (async () => {
      let flushed = false;
      try {
        this.io.sessionState.notifyInternalMetadataChanged({
          restart_starts: {
            ...unknown,
            starts,
            new_frames: newFrames,
          },
        });
        flushed = (await this.io.flushSessionState()) === true;
      } catch (error) {
        logTurnError(error);
      }
      answered = true;
      if (flushed) this.storedThrough = Math.max(this.storedThrough, number);
      this.somethingHappened.emit();
      return flushed;
    })();
    return {
      number,
      flushed,
      flushAnswered: () => answered,
    };
  }
}
//@ chunk-0yw3taqg.js:302698-302851 placement
var INITIAL_RECORD_WRITE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REFUSED_RECORD_WRITE;
deferInit("chunk-0yw3taqg.js:302698", () => {
  INITIAL_RECORD_WRITE = {
    number: 0,
    flushed: Promise.resolve(true),
    flushAnswered: () => true,
  };
  REFUSED_RECORD_WRITE = {
    number: Number.POSITIVE_INFINITY,
    flushed: Promise.resolve(false),
    flushAnswered: () => true,
  };
});
//@ chunk-0yw3taqg.js:302851-303116 placement
function logUnattendedStartOutcome(outcome) {
  switch (outcome) {
    case "started":
    case "freed":
    case "off":
      return logFeatureOk("print_unattended_start");
    case "record_unread":
    case "unconfirmed":
      return logFeatureSad("print_unattended_start", outcome);
    case "limit":
    case "threw":
      return logFeatureBad("print_unattended_start", outcome);
    case "aborted":
    case "held":
      return;
  }
}
//@ chunk-0yw3taqg.js:303116-303133 placement
var ANSWER = "answer:";
//@ chunk-0yw3taqg.js:303133-303180 placement
function answerFrameKey(uuid) {
  return `${ANSWER}${uuid}`.toLowerCase();
}
//@ chunk-0yw3taqg.js:303180-303521 placement
/**
 * 记录 tengu_unattended_start 事件：批次类别、首成员的模式与提示来源。
 */
function logUnattendedFirstTurn(batch, batchClass) {
  try {
    let first = batch.members[0];
    logEvent("tengu_unattended_start", {
      outcome: fromEnum("first_turn"),
      class: fromEnum(
        batchClass === "new"
          ? batch.members.some((member) => member.startedBy === "person")
            ? "person"
            : "outside"
          : batchClass,
      ),
      mode: fromEnumOpt(first?.mode),
      prompt_origin_kind: fromEnumOpt(first?.origin?.kind),
      prompt_origin_subkind: fromEnumOpt(
        first?.origin !== undefined && "subkind" in first.origin ? first.origin.subkind : undefined,
      ),
    });
  } catch (error) {
    logTurnError(error);
  }
}
//@ chunk-0yw3taqg.js:303521-303541 placement
function logTurnError(error) {
  logError(error);
}
//@ chunk-0yw3taqg.js:303541-303737 placement
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
//@ chunk-0yw3taqg.js:303737-304188 placement
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
//@ chunk-0yw3taqg.js:304188-304200 placement
var USER_DATA_ROOTS_WAIT_MS = 5000;
//@ chunk-0yw3taqg.js:304200-304589 placement
/**
 * 回合前置门：确保用户数据根目录已创建，最多等待 waitMs；超时只告警一次（user_data_roots_wait_expired），不阻塞回合。
 */
function createUserDataRootsTurnGate(waitMs = USER_DATA_ROOTS_WAIT_MS) {
  let createPromise;
  let gaveUp = false;
  return {
    name: "user_data_roots",
    beforeTurn: async ({ signal }) => {
      createPromise ??= ensureUserDataRoot()
        .then(() => "created")
        .finally(() => {
          createPromise = undefined;
          gaveUp = false;
        });
      if (gaveUp) return TURN_GATE_READY;
      let abortController = new AbortController();
      if (
        (await Promise.race([
          createPromise,
          sleep(waitMs, AbortSignal.any([signal, abortController.signal])).then(() => "gave_up"),
        ]).finally(() => abortController.abort())) === "gave_up" &&
        !signal.aborted
      ) {
        gaveUp = true;
        logForDiagnosticsNoPII("warn", "user_data_roots_wait_expired", {
          wait_ms: waitMs,
        });
      }
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-0yw3taqg.js:304619-304632 placement
var HOME_FILES_FLAG_WAIT_MS = 20000;
//@ chunk-0yw3taqg.js:304632-304719 placement
function isStagedHomeMountPath(path) {
  return (
    typeof path === "string" &&
    isClaudeAiChatOrigin() &&
    posix.normalize(path).startsWith(`${STAGE_FILE_HOME_MOUNT_PREFIX}/`)
  );
}
//@ chunk-0yw3taqg.js:304719-305104 placement
/**
 * 等 GrowthBook 初始化（有上限），读取 tengu_hazy_nova 得到 home 文件暂存开关 "on"/"off"/"not_loaded"，并记录等待耗时。
 */
async function waitForHomeFilesFlag(options, timeoutMs = HOME_FILES_FLAG_WAIT_MS) {
  if (!isStagedHomeMountPath(options)) return "off";
  let startTime = performance.now();
  await withDeadline(ensureFreshGrowthBook(), timeoutMs);
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_hazy_nova", false);
  let notLoaded = source === "fallback" && !hasFreshGrowthBookFeatures();
  let state = notLoaded ? "not_loaded" : value ? "on" : "off";
  let waitedMs = Math.round(performance.now() - startTime);
  logEvent("tengu_stage_file_home_flag_wait", {
    home_files_flag: fromEnum(state),
    waited_ms: waitedMs,
  });
  logForDiagnosticsNoPII(notLoaded ? "warn" : "info", "stage_file_home_flag_wait", {
    home_files_flag: state,
    waited_ms: waitedMs,
  });
  return state;
}
//@ chunk-0yw3taqg.js:305104-305607 placement
/**
 * 回合开始时放置上一回合交接带来的写入文件：没有则记 no_files；功能关闭则拒绝；否则动态加载 placeCarriedWrites 执行。
 */
async function placeCarriedWritesAtTurnStart(turn, context, options) {
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
    let { placeCarriedWrites } = await import("../../services/turnHandoff/placeCarriedWrites.lazy.js");
    return await placeCarriedWrites(turn, context, options);
  } catch (error) {
    logFeatureBad("ccr_turn_handoff_carried_writes", "load_failed");
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:305607-305617 placement
var MAX_DIRECTORIES_LISTED = 50;
//@ chunk-0yw3taqg.js:305617-306248 placement
/**
 * 说明暂存文件可能未送达（路径可能缺失或旧），并按原因提示空间不足或文件名过长。
 */
function formatStagedFilesNotPlacedNote(paths, failureKinds) {
  let one = paths.length === 1;
  return `${paths.length} ${one ? "file" : "files"} may not have arrived here, so ${one ? "this path" : "these paths"} may be missing or hold an older copy: ${formatDirectoryList(paths)}${
    failureKinds.has("no_space")
      ? `
At least one of these copies failed with "no space left on device". That file is not sent again by itself. Make space. Then ask the user to attach it, or make it again if you made it. Ask the user before you delete one of their files.`
      : ""
  }${
    failureKinds.has("name_too_long")
      ? `
At least one of these names is too long for the file system here (the usual limit is 255 bytes). That file can arrive only after the name is made shorter.`
      : ""
  }`;
}
//@ chunk-0yw3taqg.js:306248-306580 placement
/**
 * 有暂存文件未能落盘时，给模型发一条隐藏通知（STAGED_FILES_MISSING），说明路径和失败原因（磁盘满、文件名过长）。
 */
function noteStagedFilesNotPlaced(paths, failureKinds) {
  try {
    let counters = stagedFilesNoticeCounters();
    let fields = {
      file_count: paths.length,
      no_space: failureKinds.has("no_space") ? 1 : 0,
      name_too_long: failureKinds.has("name_too_long") ? 1 : 0,
    };
    logForDiagnosticsNoPII("warn", "staged_files_not_placed", {
      ...fields,
      ...counters,
    });
    if (counters.told === 0) return false;
    enqueueHiddenNotice(STAGED_FILES_MISSING, formatStagedFilesNotPlacedNote(paths, failureKinds));
    logFeatureOk("ccr_stage_file_not_placed_note", fields);
    return true;
  } catch (error) {
    logFeatureBad("ccr_stage_file_not_placed_note", "threw");
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:306580-307852 placement
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
//@ chunk-0yw3taqg.js:307852-308128 placement
function noteStagedFilesStillCopying(paths) {
  try {
    let counters = stagedFilesNoticeCounters();
    logForDiagnosticsNoPII("info", "staged_files_still_copying", {
      file_count: paths.length,
      ...counters,
    });
    if (counters.told === 0) return false;
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
//@ chunk-0yw3taqg.js:308128-308232 placement (2.1.88 match: formatDirectoryList, 1)
/**
 * （切分错误）XML 转义后列出前若干个目录，超出部分写 "and N more"。
 */
function formatDirectoryList(directories) {
  let dirCount = directories.length - MAX_DIRECTORIES_LISTED;
  return `${directories.slice(0, MAX_DIRECTORIES_LISTED).map(escapeXml).join(", ")}${dirCount > 0 ? `, and ${dirCount} more` : ""}`;
}
//@ chunk-0yw3taqg.js:308232-308317 placement
function stagedFilesNoticeCounters() {
  return {
    told: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_dunlin", false) === true ? 1 : 0,
    flags_loaded: hasFreshGrowthBookFeatures() ? 1 : 0,
  };
}
//@ chunk-0yw3taqg.js:308317-308479 placement
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
//@ chunk-0yw3taqg.js:308516-308729 placement
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
//@ chunk-0yw3taqg.js:308729-308847 layout
function modelRestrictedNotice(requestedModel, effectiveModel, at) {
  return {
    ...createSystemMessage(formatModelRestrictedNotice(requestedModel, effectiveModel), "warning"),
    modelRestriction: {
      requestedModel: displayModelName(requestedModel),
      effectiveModel: displayModelName(effectiveModel),
      at,
    },
  };
}
//@ chunk-0yw3taqg.js:308847-308967 layout
function resumeModelRestrictedNotice(notice, model) {
  return {
    ...createSystemMessage(notice, "warning"),
    modelRestriction: {
      requestedModel: displayModelName(model),
      effectiveModel: displayModelName(getMainLoopModel()),
      at: "resume",
    },
  };
}
//@ chunk-0yw3taqg.js:308967-309136 layout
function withWireModelRestriction({ modelRestriction, ...message }) {
  return {
    ...message,
    ...(modelRestriction && {
      model_restriction: {
        requested_model: modelRestriction.requestedModel,
        effective_model: modelRestriction.effectiveModel,
        at: modelRestriction.at,
      },
    }),
    session_id: getSessionId(),
  };
}
//@ chunk-0yw3taqg.js:309136-310217 placement
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
  function injectModelSwitchBreadcrumbs(modelArg, model) {
    abortPrecomputeOnModelSwitch(session.precompute);
    if (isLaunchModelPick?.()) return;
    let breadcrumbs = createModelSwitchBreadcrumbs(modelArg, modelDisplayString(model));
    appendToConversation(breadcrumbs);
    if (env.CLAUDE_CODE_REMOTE) {
      let modelName = modelDisplayString(model);
      appendToConversation([
        createUserMessage({
          content: `<system-reminder>The model for this session has been changed to ${modelName}. You are now running as ${modelName}.</system-reminder>`,
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
  function noticeRestrictedModel(model, effective) {
    if (model === lastRestrictedModel) return;
    lastRestrictedModel = model;
    let notice = modelRestrictedNotice(model, effective ?? getMainLoopModel(), "switch");
    appendToConversation([notice]);
    enqueue(withWireModelRestriction(notice));
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
//@ chunk-0yw3taqg.js:310217-310318 placement
function isDefaultModelRefusedByPolicy(model) {
  return (
    (model == null || String(model).trim().toLowerCase() === "default") &&
    managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") !== null
  );
}
//@ chunk-0yw3taqg.js:310318-311533 placement
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
    let activeModel = this.activeModel();
    let override = this.modelOverride();
    let decision = resolveTurnEndModelOverride({
      activeUserSpecifiedModel: activeModel,
      activeAtTurnStart: this.atTurnStart.active,
      overrideAtTurnStart: this.atTurnStart.override,
      overrideAtTurnEnd: override,
    });
    if (decision.kind !== "keep" && activeModel !== undefined) {
      logEvent("tengu_print_model_override_adopted", {
        from_model_scope: fromEnum(classifyFallbackOrigin(activeModel)),
        ...(decision.kind === "adopt"
          ? {
              to_model_scope: fromEnum(classifyFallbackOrigin(decision.model)),
            }
          : {
              cleared_to_session_default: true,
            }),
        override_same_at_both_ends: override === this.atTurnStart.override,
      });
      this.setActiveModel(decision.kind === "adopt" ? decision.model : undefined);
      this.recordAllowedModelApplied();
    }
    if (decision.kind === "keep" && decision.allowedOverrideApplied) this.recordAllowedModelApplied();
    if (
      decision.kind === "keep" &&
      decision.blockedByAllowlist !== undefined &&
      (activeModel === undefined || isExemptDefaultResolvingPick(activeModel) || isModelAllowed(activeModel))
    )
      this.noticeRestrictedModel(decision.blockedByAllowlist, activeModel);
  }
}
//@ chunk-0yw3taqg.js:311533-312160 placement
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
  resumeModelRestrictedNotice,
  modelRestrictedNotice,
  hasHitUnattendedRestartLimit,
  withWireModelRestriction,
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
