/**
 * cli/_new/UnattendedStartRecord.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (33)
 * attribution: sole-consumer-new 33
 */
import { posix, posix as posix_2, posix as posix_3 } from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  hasFreshGrowthBookFeatures,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { TURN_DISPATCH_CONSTANTS, NP, freeze, G0, K0, Uy } from "../print/turnDispatch.js";
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
  btt,
  createSystemMessage,
} from "../../utils/messages.js";
import { ensureUserDataRoot } from "../../utils/userDataRoots.js";
import { TURN_GATE_READY } from "../print/turnGate.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { STAGE_FILE_HOME_MOUNT_PREFIX } from "../../utils/stageFileRoots.js";
import { ensureFreshGrowthBook, aQe, awaitCarriedWritesFlag } from "../remoteIO/turnHandoff.js";
import { STAGED_FILES_MISSING, STAGED_FILES_STILL_COPYING } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { buildModelSwitchNotice } from "../print/setModelControl.js";
import { abortPrecomputeOnModelSwitch } from "../../services/compact/precomputedCompact.js";
import { modelDisplayString, getMainLoopModel } from "../../utils/model/model.js";
import { env } from "../../utils/env.js";
import { formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { managedDenyStartupRefusal, isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { classifyFallbackOrigin } from "../../services/api/refusalFallback.js";
import { isExemptDefaultResolvingPick } from "../../utils/model/defaultModel.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";

/**
 * 读 tengu_whimsical_otter：服务端下发的正整数为无人值守重启次数上限（不超过 TURN_DISPATCH_CONSTANTS），否则 "off"。
 */
//@ chunk-tyg7f3ek.js:266801-267003 sole-consumer-new
function getUnattendedRestartLimit() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_whimsical_otter",
      null,
    ),
    r = typeof e === "string" && /^\d+$/.test(e) ? Number(e) : e;
  return isServedFeatureSource(source) && typeof r === "number" && Number.isInteger(r) && r >= 1
    ? Math.min(r, TURN_DISPATCH_CONSTANTS)
    : "off";
}
//@ chunk-tyg7f3ek.js:267003-267215 sole-consumer-new
function isRestartedMember(member) {
  return (
    member.startedBy === "restart" ||
    (member.resumeReason !== void 0 && member.mode !== "orphaned-permission") ||
    (member.mode === "orphaned-permission" &&
      member.handedOffTurn === void 0 &&
      member.orphanedPermission?.resumesInterruptedTurn !== !0)
  );
}
/**
 * 判断无人值守重启是否已达上限：读工作进程状态里的 restart_starts，记录损坏或最近窗口内的启动次数达到上限时返回 true。
 */
//@ chunk-tyg7f3ek.js:267215-267404 sole-consumer-new
function hasHitUnattendedRestartLimit(workerState, now = Date.now()) {
  let r = getUnattendedRestartLimit();
  if (r === "off") return !1;
  let s =
    workerState === null || workerState.readFailed === !0
      ? "malformed"
      : parseHintFrames(workerState.internal?.restart_starts);
  return s === "malformed" || count(s.starts, (h) => h > now - NP) >= r;
}
//@ chunk-tyg7f3ek.js:267404-267441 sole-consumer-new
function QP(e) {
  return classifyPromptBatch(e) !== "rest";
}
/**
 * 给一批待执行提示分类：有人或外部发起的为 "new"；有重启续跑成员的为 "listed"；其余为 "rest"。
 */
//@ chunk-tyg7f3ek.js:267441-267567 sole-consumer-new
function classifyPromptBatch({ members: members }) {
  return members.some((n) => n.startedBy === "person" || n.startedBy === "outside")
    ? "new"
    : members.some(isRestartedMember)
      ? "listed"
      : "rest";
}
/**
 * 无人值守启动记录：从工作进程状态读写 restart_starts（starts 时间戳、new_frames 已见帧），判断一次重启后是否允许自动续跑、拒绝并给出提示，写入通过 sessionState 刷盘并跟踪是否落盘。
 */
//@ chunk-tyg7f3ek.js:267567-273567 sole-consumer-new
class UnattendedStartRecord {
  io;
  host;
  timings;
  now;
  record;
  readBegunAt;
  readInFlight = !1;
  writes = 0;
  storedThrough = 0;
  firstPersonWrite = 0;
  latestFrameWrite = INITIAL_RECORD_WRITE;
  somethingHappened = createSignal();
  firstNewBatchSeen = !1;
  counted = !1;
  letATurnRun = !1;
  loggedFreed = !1;
  constructor(e, n, r, s = freeze, h = Date.now) {
    this.io = e;
    this.host = r;
    this.timings = s;
    this.now = h;
    ((this.readBegunAt = performance.now()), this.read(n));
  }
  get freed() {
    return this.firstPersonWrite > 0 && this.storedThrough >= this.firstPersonWrite;
  }
  read(e) {
    if (this.record !== void 0 || e === null || e.readFailed === !0) return;
    let n = e.internal?.restart_starts,
      r = parseHintFrames(n);
    if (r !== "malformed") {
      ((this.record = r), this.somethingHappened.emit());
      return;
    }
    let { starts: starts, new_frames: new_frames, ...y } = G0().safeParse(n).data ?? {};
    ((this.record = { starts: [], new_frames: [], unknown: y }),
      this.write({ starts: Array(TURN_DISPATCH_CONSTANTS).fill(this.now()) }),
      this.somethingHappened.emit());
  }
  readIfUnread() {
    let e = performance.now() - this.readBegunAt;
    if (
      getUnattendedRestartLimit() === "off" ||
      this.record !== void 0 ||
      e < this.timings.readSpacingMs ||
      (this.readInFlight && e < this.timings.readLostMs)
    )
      return;
    let startTime = performance.now();
    ((this.readBegunAt = startTime),
      (this.readInFlight = !0),
      (async () => {
        let r = await (async () => this.io.rereadWorkerState())().catch(() => null);
        if (this.readBegunAt === startTime) this.readInFlight = !1;
        try {
          this.read(r);
        } catch (error) {
          mi(error);
        }
      })());
  }
  takeFrame(e, { reRun: n, ownLine: r, person: s }) {
    try {
      if ((this.readIfUnread(), r)) return;
      let h = e?.toLowerCase();
      if (n || (h !== void 0 && !h.startsWith(ANSWER) && this.record?.new_frames.includes(h)))
        return "restart";
      let y = h !== void 0 && K0.test(h) ? h : void 0,
        S = s && y !== void 0 ? "person" : "outside";
      if (this.record !== void 0 && y !== void 0)
        this.writeFrame(S === "person", {
          ...(S === "person" && { starts: [] }),
          new_frames: [y, ...this.record.new_frames].slice(0, Uy),
        });
      return S;
    } catch (error) {
      mi(error);
      return;
    }
  }
  answers = {
    markOf: (e) => {
      try {
        return (this.readIfUnread(), this.record?.new_frames.includes(HP(e)) ? "restart" : "outside");
      } catch (error) {
        mi(error);
        return;
      }
    },
    queued: (e) => {
      try {
        let n = HP(e);
        if (this.record !== void 0 && !this.record.new_frames.includes(n))
          this.writeFrame(!1, { new_frames: [n, ...this.record.new_frames].slice(0, Uy) });
      } catch (error) {
        mi(error);
      }
    },
  };
  writeFrame(e, n) {
    if (getUnattendedRestartLimit() === "off") {
      if (n !== "once more" && this.record !== void 0)
        (this.change(this.record, n), this.sendOnceFlagsAreFetched(e));
      return;
    }
    let write = this.write(n === "once more" ? {} : n);
    if (((this.latestFrameWrite = write), e && this.firstPersonWrite === 0))
      this.firstPersonWrite = write.number;
    if (n !== "once more")
      write.flushed.then((s) => {
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
      mi(error);
    }
  }
  async refuseStart(e, n) {
    let r;
    try {
      r = classifyPromptBatch(e);
    } catch (error) {
      mi(error);
      return;
    }
    let s = r === "listed" ? await this.count(n, e) : await this.letRun(r, n);
    if (s === void 0 && !this.letATurnRun) ((this.letATurnRun = !0), logUnattendedFirstTurn(e, r));
    return s;
  }
  async letRun(e, n) {
    try {
      if (
        (this.readIfUnread(), e === "new" && !this.firstNewBatchSeen && getUnattendedRestartLimit() !== "off")
      ) {
        ((this.firstNewBatchSeen = !0), await Promise.resolve());
        let latestFrameWrite = this.latestFrameWrite;
        await this.wait(n, () => this.isSettled(latestFrameWrite) || this.host.exiting());
      }
    } catch (error) {
      mi(error);
    }
    return;
  }
  async count(e, n) {
    let { members: members } = n,
      s = (L) =>
        members.some((q) => q.wakesForLostTimers === !0)
          ? buildUnattendedRefusalMessage(L, TIMERS_NOT_RESTORED_MESSAGE)
          : members.every((q) => q.mode === "task-notification" && q.startedBy === "restart")
            ? "nothing"
            : members.some((q) => q.startedBy === "restart" && isHumanOrigin(q.origin))
              ? buildUnattendedRefusalMessage(L, UNANSWERED_AFTER_RESTART_MESSAGE)
              : buildUnattendedRefusalMessage(L),
      startTime = performance.now(),
      y,
      S = { inWindow: -1, max: -1 },
      R = (L) => {
        try {
          (logEvent("tengu_unattended_start", {
            outcome: fromEnum(L),
            in_window: S.inWindow,
            max: S.max,
            waited_ms: Math.round(performance.now() - startTime),
          }),
            logUnattendedStartOutcome(L));
        } catch (error) {
          mi(error);
        }
      },
      w = () => {
        let L = y === void 0 ? -1 : this.starts().indexOf(y);
        if (((y = void 0), L >= 0)) this.write({ starts: this.starts().toSpliced(L, 1) });
      },
      P = () =>
        e.aborted
          ? "aborted"
          : this.host.exiting()
            ? "exiting"
            : this.freed
              ? "freed"
              : this.counted
                ? "counted"
                : void 0;
    try {
      let steps = this.steps(e, P, {
          compared: (x) => {
            S = x;
          },
          wrote: (x) => {
            y = x;
          },
        }),
        q;
      for (;;) {
        switch (P()) {
          case "exiting":
            return (R("held"), await heldUntilExit());
          case "aborted":
            return (w(), R("aborted"), "aborted");
          case "freed":
            if ((w(), !this.loggedFreed)) ((this.loggedFreed = !0), R("freed"));
            return;
          case "counted":
            return;
          case void 0:
            break;
        }
        if (q === "off") {
          R("off");
          return;
        }
        if (q === "started") {
          ((y = void 0), (this.counted = !0), R("started"));
          return;
        }
        if (q !== void 0) return (w(), R(q), s(q));
        let x = await steps.next();
        if (x.done) q = x.value;
      }
    } catch (error) {
      mi(error);
      try {
        w();
      } catch (error) {
        mi(error);
      }
      return (R("threw"), s("threw"));
    }
  }
  async *steps(e, n, r) {
    let s = () => n() !== void 0;
    this.readIfUnread();
    let h = !1,
      y = () => {
        ((h = !0), this.somethingHappened.emit());
      };
    (this.host.flagsFetched().then(y, y), await this.wait(e, () => h || s()));
    let S = getUnattendedRestartLimit();
    if (S === "off") return "off";
    if (
      (r.compared({ inWindow: -1, max: S }),
      yield,
      await this.wait(e, () => this.record !== void 0 || s(), this.timings.storeWaitMs),
      yield,
      this.record === void 0)
    )
      return "record_unread";
    if ((r.compared({ inWindow: this.inWindow(), max: S }), this.inWindow() >= S)) {
      if (
        (await this.wait(e, s, this.timings.spentWaitMs),
        yield,
        r.compared({ inWindow: this.inWindow(), max: S }),
        this.inWindow() >= S)
      )
        return "limit";
    }
    let now = this.now();
    r.wrote(now);
    let write = this.write({ starts: [now, ...this.starts()] });
    return (
      await this.wait(e, () => this.isSettled(write) || s(), this.timings.storeWaitMs),
      this.storedThrough >= write.number ? "started" : "unconfirmed"
    );
  }
  starts() {
    return this.record?.starts ?? [];
  }
  inWindow() {
    let e = this.now() - NP;
    return count(this.starts(), (n) => n > e);
  }
  async wait(e, n, r = this.timings.waitMs) {
    let s = performance.now() + r,
      h = () => {},
      subscribe = this.somethingHappened.subscribe(() => h());
    try {
      while (!e.aborted && !n()) {
        this.readIfUnread();
        let S = s - performance.now();
        if (S <= 0) return;
        let withResolvers = Promise.withResolvers();
        ((h = withResolvers.resolve),
          await Promise.race([withResolvers.promise, sleep(Math.min(S, this.timings.lookMs), e)]));
      }
    } finally {
      subscribe();
    }
  }
  isSettled(e) {
    return this.storedThrough >= e.number || e.flushAnswered();
  }
  change(e, n) {
    return (
      (this.record = {
        ...e,
        ...n,
        starts: [...(n.starts ?? e.starts)].sort((r, s) => s - r).slice(0, TURN_DISPATCH_CONSTANTS),
      }),
      this.record
    );
  }
  write(e) {
    if (this.record === void 0)
      return (mi(Error("a write of the record before any read of it")), REFUSED_RECORD_WRITE);
    let n = ++this.writes,
      { starts: starts, new_frames: new_frames, unknown: unknown } = this.change(this.record, e),
      y = !1,
      S = (async () => {
        let R = !1;
        try {
          (this.io.sessionState.notifyInternalMetadataChanged({
            restart_starts: { ...unknown, starts: starts, new_frames: new_frames },
          }),
            (R = (await this.io.flushSessionState()) === !0));
        } catch (error) {
          mi(error);
        }
        if (((y = !0), R)) this.storedThrough = Math.max(this.storedThrough, n);
        return (this.somethingHappened.emit(), R);
      })();
    return { number: n, flushed: S, flushAnswered: () => y };
  }
}
//@ chunk-tyg7f3ek.js:273567-273720 sole-consumer-new
var INITIAL_RECORD_WRITE = { number: 0, flushed: Promise.resolve(!0), flushAnswered: () => !0 },
  REFUSED_RECORD_WRITE = {
    number: Number.POSITIVE_INFINITY,
    flushed: Promise.resolve(!1),
    flushAnswered: () => !0,
  };
//@ chunk-tyg7f3ek.js:273720-273985 sole-consumer-new
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
//@ chunk-tyg7f3ek.js:273985-274002 sole-consumer-new
var ANSWER = "answer:";
//@ chunk-tyg7f3ek.js:274002-274049 sole-consumer-new
function HP(e) {
  return `${ANSWER}${e}`.toLowerCase();
}
/**
 * 记录 tengu_unattended_start 事件：批次类别、首成员的模式与提示来源。
 */
//@ chunk-tyg7f3ek.js:274049-274390 sole-consumer-new
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
        r?.origin !== void 0 && "subkind" in r.origin ? r.origin.subkind : void 0,
      ),
    });
  } catch (error) {
    mi(error);
  }
}
//@ chunk-tyg7f3ek.js:274390-274410 sole-consumer-new
function mi(e) {
  logError(e);
}
//@ chunk-tyg7f3ek.js:274410-274606 sole-consumer-new
function buildUnattendedRefusalMessage(reason, content) {
  return reason === "limit"
    ? createApiErrorMessage({
        content: content ?? UNATTENDED_LIMIT_MESSAGE,
        apiError: "unattended_start_limit",
        apiErrorIsTransient: !1,
      })
    : createApiErrorMessage({
        content: content ?? UNATTENDED_UNCONFIRMED_MESSAGE,
        apiError: "unattended_start_unconfirmed",
        apiErrorIsTransient: !1,
      });
}
/**
 * 会话重启后不再自动继续时的各种提示文字。
 */
//@ chunk-tyg7f3ek.js:274606-275057 sole-consumer-new
var UNATTENDED_LIMIT_MESSAGE =
    "This session restarted with no new message, and Claude has stopped continuing it automatically. Send a message to continue.",
  UNATTENDED_UNCONFIRMED_MESSAGE =
    "Claude couldn't confirm that it could continue this session on its own, so it didn't. Send a message to continue.",
  TIMERS_NOT_RESTORED_MESSAGE =
    "Timers that were pending when this session restarted weren't set again. Send a message to continue.",
  UNANSWERED_AFTER_RESTART_MESSAGE =
    "Your last message wasn't answered, because this session restarted. Please send it again.";
//@ chunk-tyg7f3ek.js:275057-275069 sole-consumer-new
var dW = 5000;
/**
 * 回合前置门：确保用户数据根目录已创建，最多等待 waitMs；超时只告警一次（user_data_roots_wait_expired），不阻塞回合。
 */
//@ chunk-tyg7f3ek.js:275069-275458 sole-consumer-new
function createUserDataRootsTurnGate(waitMs = dW) {
  let n,
    r = !1;
  return {
    name: "user_data_roots",
    beforeTurn: async ({ signal: signal }) => {
      if (
        ((n ??= ensureUserDataRoot()
          .then(() => "created")
          .finally(() => {
            ((n = void 0), (r = !1));
          })),
        r)
      )
        return TURN_GATE_READY;
      let abortController = new AbortController();
      if (
        (await Promise.race([
          n,
          sleep(waitMs, AbortSignal.any([signal, abortController.signal])).then(() => "gave_up"),
        ]).finally(() => abortController.abort())) === "gave_up" &&
        !signal.aborted
      )
        ((r = !0), logForDiagnosticsNoPII("warn", "user_data_roots_wait_expired", { wait_ms: waitMs }));
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-tyg7f3ek.js:275488-275501 sole-consumer-new
var uW = 20000;
//@ chunk-tyg7f3ek.js:275501-275588 sole-consumer-new
function By(e) {
  return (
    typeof e === "string" &&
    isClaudeAiChatOrigin() &&
    posix.normalize(e).startsWith(`${STAGE_FILE_HOME_MOUNT_PREFIX}/`)
  );
}
/**
 * 等 GrowthBook 初始化（有上限），读取 tengu_hazy_nova 得到 home 文件暂存开关 "on"/"off"/"not_loaded"，并记录等待耗时。
 */
//@ chunk-tyg7f3ek.js:275588-275973 sole-consumer-new
async function waitForHomeFilesFlag(options, timeoutMs = uW) {
  if (!By(options)) return "off";
  let startTime = performance.now();
  await withDeadline(ensureFreshGrowthBook(), timeoutMs);
  let { value: s, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_hazy_nova", !1),
    y = source === "fallback" && !hasFreshGrowthBookFeatures(),
    S = y ? "not_loaded" : s ? "on" : "off",
    rounded = Math.round(performance.now() - startTime);
  return (
    logEvent("tengu_stage_file_home_flag_wait", { home_files_flag: fromEnum(S), waited_ms: rounded }),
    logForDiagnosticsNoPII(y ? "warn" : "info", "stage_file_home_flag_wait", {
      home_files_flag: S,
      waited_ms: rounded,
    }),
    S
  );
}
/**
 * 回合开始时放置上一回合交接带来的写入文件：没有则记 no_files；功能关闭则拒绝；否则动态加载 placeCarriedWrites 执行。
 */
//@ chunk-tyg7f3ek.js:275973-276476 sole-consumer-new
async function placeCarriedWritesAtTurnStart(turn, n, r) {
  if (turn.carriedWrites === void 0) {
    if (aQe())
      logEvent("tengu_turn_handoff_carried_writes", { at: lit("turn_start"), outcome: lit("no_files") });
    return !0;
  }
  if (!(await awaitCarriedWritesFlag()))
    return (
      logEvent("tengu_turn_handoff_carried_writes", {
        at: lit("turn_start"),
        outcome: lit("refused"),
        refusal: lit("switched_off"),
      }),
      logFeatureSad("ccr_turn_handoff_carried_writes", "switched_off"),
      !1
    );
  try {
    let { placeCarriedWrites: placeCarriedWrites } = await import("./chunk-1bmxdqa0.js");
    return await placeCarriedWrites(turn, n, r);
  } catch (error) {
    return (logFeatureBad("ccr_turn_handoff_carried_writes", "load_failed"), logError(error), !1);
  }
}
//@ chunk-tyg7f3ek.js:276476-276486 sole-consumer-new
var JP = 50;
/**
 * 说明暂存文件可能未送达（路径可能缺失或旧），并按原因提示空间不足或文件名过长。
 */
//@ chunk-tyg7f3ek.js:276486-277043 sole-consumer-new
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
/**
 * 有暂存文件未能落盘时，给模型发一条隐藏通知（STAGED_FILES_MISSING），说明路径和失败原因（磁盘满、文件名过长）。
 */
//@ chunk-tyg7f3ek.js:277043-277375 sole-consumer-new
function noteStagedFilesNotPlaced(paths, failureKinds) {
  try {
    let r = tM(),
      s = {
        file_count: paths.length,
        no_space: failureKinds.has("no_space") ? 1 : 0,
        name_too_long: failureKinds.has("name_too_long") ? 1 : 0,
      };
    if ((logForDiagnosticsNoPII("warn", "staged_files_not_placed", { ...s, ...r }), r.told === 0)) return !1;
    return (
      enqueueHiddenNotice(STAGED_FILES_MISSING, formatStagedFilesNotPlacedNote(paths, failureKinds)),
      logFeatureOk("ccr_stage_file_not_placed_note", s),
      !0
    );
  } catch (error) {
    return (logFeatureBad("ccr_stage_file_not_placed_note", "threw"), logError(error), !1);
  }
}
/**
 * 生成"文件仍在复制中"的模型提示：告诉模型不要说文件没到、需要时分段等待。
 */
//@ chunk-tyg7f3ek.js:277375-278647 sole-consumer-new
function formatStagedFilesStillCopyingNote(paths) {
  return paths.length === 1
    ? `1 file is still being copied here, so this path may be missing or hold an older copy for now: ${formatDirectoryList(paths)}
The copy has not failed. It can take a few more minutes. While it runs, do not tell the user that the file did not arrive, and do not ask for it again, whatever an earlier message says about a missing file. If you need the file, wait for up to a minute at a time: run a foreground command that ends when the file is there or the minute is over, then look again. If it is still missing after a few minutes, tell the user that it is still being copied. Another note will tell you if the copy fails.`
    : `${paths.length} files are still being copied here, so these paths may be missing or hold an older copy for now: ${formatDirectoryList(paths)}
The copies have not failed. They can take a few more minutes. While they run, do not tell the user that these files did not arrive, and do not ask for them again, whatever an earlier message says about a missing file. If you need one of these files, wait for up to a minute at a time: run a foreground command that ends when the file is there or the minute is over, then look again. If it is still missing after a few minutes, tell the user that it is still being copied. Another note will tell you if a copy fails.`;
}
//@ chunk-tyg7f3ek.js:278647-278923 sole-consumer-new
function noteStagedFilesStillCopying(paths) {
  try {
    let n = tM();
    if (
      (logForDiagnosticsNoPII("info", "staged_files_still_copying", { file_count: paths.length, ...n }),
      n.told === 0)
    )
      return !1;
    return (
      enqueueHiddenNotice(STAGED_FILES_STILL_COPYING, formatStagedFilesStillCopyingNote(paths)),
      logFeatureOk("ccr_stage_file_still_copying_note", { file_count: paths.length }),
      !0
    );
  } catch (error) {
    return (logFeatureBad("ccr_stage_file_still_copying_note", "threw"), logError(error), !1);
  }
}
/**
 * （切分错误）XML 转义后列出前若干个目录，超出部分写 "and N more"。
 */
//@ chunk-tyg7f3ek.js:278923-279027 sole-consumer-new = formatDirectoryList (1)
function formatDirectoryList(directories) {
  let n = directories.length - JP;
  return `${directories.slice(0, JP).map(escapeXml).join(", ")}${n > 0 ? `, and ${n} more` : ""}`;
}
//@ chunk-tyg7f3ek.js:279027-279112 sole-consumer-new
function tM() {
  return {
    told: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_dunlin", !1) === !0 ? 1 : 0,
    flags_loaded: hasFreshGrowthBookFeatures() ? 1 : 0,
  };
}
//@ chunk-tyg7f3ek.js:279112-279274 sole-consumer-new
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
    skipAttachments: !0,
    priority: "next",
    shouldQuery: !1,
    passive: !0,
  });
}
//@ chunk-tyg7f3ek.js:279311-279524 sole-consumer-new
function buildSystemStatusMessage(status, extra) {
  return {
    type: "system",
    subtype: "status",
    status: status,
    ...(extra?.compactResult !== void 0 && { compact_result: extra.compactResult }),
    ...(extra?.compactError !== void 0 && { compact_error: extra.compactError }),
    session_id: getSessionId(),
    uuid: randomUUID_10(),
  };
}
/**
 * 输出模式下的模型切换提示集合：conversationModel 计算模型切换说明；injectModelSwitchBreadcrumbs 写入切换面包屑（远程模式附 system-reminder）；noticeRestrictedModel 提示受限模型；noticeFlagSettingsModel 按 flag 设置结果给提示。
 */
//@ chunk-tyg7f3ek.js:279524-280615 sole-consumer-new
function createModelChangeNotices({
  session: session,
  messages: messages,
  appendToConversation: appendToConversation,
  enqueue: enqueue,
  isLaunchModelPick: isLaunchModelPick,
}) {
  function conversationModel(q) {
    try {
      return buildModelSwitchNotice({
        messages: messages(),
        queriedInProcess: session.requestJournal.mainThreadRequestedInProcess(),
        activeModel: q,
      });
    } catch (error) {
      logError(error);
      return;
    }
  }
  function injectModelSwitchBreadcrumbs(q, x) {
    if ((abortPrecomputeOnModelSwitch(session.precompute), isLaunchModelPick?.())) return;
    let breadcrumbs = createModelSwitchBreadcrumbs_2(q, modelDisplayString(x));
    if ((appendToConversation(breadcrumbs), env.CLAUDE_CODE_REMOTE)) {
      let Z = modelDisplayString(x);
      appendToConversation([
        createUserMessage({
          content: `<system-reminder>The model for this session has been changed to ${Z}. You are now running as ${Z}.</system-reminder>`,
          isMeta: !0,
        }),
      ]);
    }
    for (let Z of breadcrumbs)
      if (btt(Z) === "stdout")
        enqueue({
          type: "user",
          message: Z.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
          uuid: Z.uuid,
          timestamp: Z.timestamp,
          isReplay: !0,
        });
  }
  let lastRestrictedModel;
  function noticeRestrictedModel(q, x) {
    if (q === lastRestrictedModel) return;
    lastRestrictedModel = q;
    let G = createSystemMessage(formatModelRestrictedNotice(q, x ?? getMainLoopModel()), "warning");
    (appendToConversation([G]), enqueue({ ...G, session_id: getSessionId() }));
  }
  function recordAllowedModelApplied() {
    lastRestrictedModel = void 0;
  }
  function noticeFlagSettingsModel({
    defaultPickRefused: defaultPickRefused,
    model: model,
    rejected: rejected,
    stepDown: stepDown,
    effectiveModel: effectiveModel,
  }) {
    if (defaultPickRefused) noticeRestrictedModel(getDefaultMainLoopModel(), effectiveModel());
    else if (model == null) recordAllowedModelApplied();
    else if (rejected) noticeRestrictedModel(model, effectiveModel());
    else if (stepDown !== null) noticeRestrictedModel(model, stepDown);
    else recordAllowedModelApplied();
  }
  return {
    conversationModel: conversationModel,
    injectModelSwitchBreadcrumbs: injectModelSwitchBreadcrumbs,
    noticeRestrictedModel: noticeRestrictedModel,
    recordAllowedModelApplied: recordAllowedModelApplied,
    noticeFlagSettingsModel: noticeFlagSettingsModel,
  };
}
//@ chunk-tyg7f3ek.js:280615-280716 sole-consumer-new
function isDefaultModelRefusedByPolicy(model) {
  return (
    (model == null || String(model).trim().toLowerCase() === "default") &&
    managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch") !== null
  );
}
/**
 * 记录回合开始时的模型覆盖与当前模型，回合结束时用 resolveTurnEndModelOverride 决定是否采纳回合中的覆盖、清回默认，或提示被白名单拦下。
 */
//@ chunk-tyg7f3ek.js:280716-281931 sole-consumer-new
class TurnModelOverrideTracker {
  modelOverride;
  activeModel;
  setActiveModel;
  recordAllowedModelApplied;
  noticeRestrictedModel;
  atTurnStart = { override: void 0, active: void 0 };
  constructor({
    modelOverride: e,
    activeModel: n,
    setActiveModel: r,
    recordAllowedModelApplied: s,
    noticeRestrictedModel: h,
  }) {
    ((this.modelOverride = e),
      (this.activeModel = n),
      (this.setActiveModel = r),
      (this.recordAllowedModelApplied = s),
      (this.noticeRestrictedModel = h));
  }
  noteTurnStart() {
    this.atTurnStart = { override: this.modelOverride(), active: this.activeModel() };
  }
  adoptAtTurnEnd() {
    let activeModel = this.activeModel(),
      modelOverride = this.modelOverride(),
      decision = resolveTurnEndModelOverride({
        activeUserSpecifiedModel: activeModel,
        activeAtTurnStart: this.atTurnStart.active,
        overrideAtTurnStart: this.atTurnStart.override,
        overrideAtTurnEnd: modelOverride,
      });
    if (decision.kind !== "keep" && activeModel !== void 0)
      (logEvent("tengu_print_model_override_adopted", {
        from_model_scope: fromEnum(classifyFallbackOrigin(activeModel)),
        ...(decision.kind === "adopt"
          ? { to_model_scope: fromEnum(classifyFallbackOrigin(decision.model)) }
          : { cleared_to_session_default: !0 }),
        override_same_at_both_ends: modelOverride === this.atTurnStart.override,
      }),
        this.setActiveModel(decision.kind === "adopt" ? decision.model : void 0),
        this.recordAllowedModelApplied());
    if (decision.kind === "keep" && decision.allowedOverrideApplied) this.recordAllowedModelApplied();
    if (
      decision.kind === "keep" &&
      decision.blockedByAllowlist !== void 0 &&
      (activeModel === void 0 || isExemptDefaultResolvingPick(activeModel) || isModelAllowed(activeModel))
    )
      this.noticeRestrictedModel(decision.blockedByAllowlist, activeModel);
  }
}
/**
 * 回合结束时决定模型覆盖：keep（附带 blockedByAllowlist / allowedOverrideApplied）、clearToSessionDefault 或 adopt。"default" 解析为默认主模型，不在允许列表里的模型不采纳。
 */
//@ chunk-tyg7f3ek.js:281931-282558 sole-consumer-new
function resolveTurnEndModelOverride({
  activeUserSpecifiedModel: activeUserSpecifiedModel,
  activeAtTurnStart: activeAtTurnStart,
  overrideAtTurnStart: overrideAtTurnStart,
  overrideAtTurnEnd: overrideAtTurnEnd,
}) {
  if (activeUserSpecifiedModel === void 0) {
    if (overrideAtTurnEnd !== overrideAtTurnStart) {
      if (typeof overrideAtTurnEnd === "string") {
        let resolvedModel =
          overrideAtTurnEnd.trim().toLowerCase() === "default"
            ? getDefaultMainLoopModel()
            : overrideAtTurnEnd;
        if (!isModelAllowed(resolvedModel) && !isExemptDefaultResolvingPick(resolvedModel))
          return { kind: "keep", blockedByAllowlist: overrideAtTurnEnd };
      }
      return { kind: "keep", allowedOverrideApplied: !0 };
    }
    return { kind: "keep" };
  }
  if (overrideAtTurnEnd === overrideAtTurnStart && activeUserSpecifiedModel === activeAtTurnStart)
    return { kind: "keep" };
  if (overrideAtTurnEnd === null) return { kind: "clearToSessionDefault" };
  if (typeof overrideAtTurnEnd !== "string") return { kind: "keep" };
  let resolvedModel =
    overrideAtTurnEnd.trim().toLowerCase() === "default" ? getDefaultMainLoopModel() : overrideAtTurnEnd;
  if (parseUserSpecifiedModel(resolvedModel) === parseUserSpecifiedModel(activeUserSpecifiedModel))
    return { kind: "keep" };
  if (!isExemptDefaultResolvingPick(resolvedModel) && !isModelAllowed(resolvedModel))
    return { kind: "keep", blockedByAllowlist: overrideAtTurnEnd };
  return { kind: "adopt", model: resolvedModel };
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
  QP,
  By,
  waitForHomeFilesFlag,
  isDefaultModelRefusedByPolicy,
};
