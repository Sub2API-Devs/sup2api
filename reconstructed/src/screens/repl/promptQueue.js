/**
 * screens/repl/promptQueue.ts
 *
 * 2.1.316 新增。提示队列。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (28)
 * attribution: placement 28
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { unlinkSync } from "fs";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { Mr } from "../../utils/agentId.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o, u, T, E, U, zJt, pe, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { LowLatencySubmitQueue } from "../../cli/print/lowLatencySubmit.js";
import { Text, Box } from "../../ink/components/Text.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { mzn } from "../../services/artifacts/presenceSocket.js";
import { topBlockingDialog } from "../replDialogState.js";
import { Ffe, $f } from "../../utils/messageQueueManager.js";
import { qar } from "../../utils/pollEvents.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import {
  errorMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../../utils/errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, j } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { looksLikeSlashInput } from "../../commands.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { XIs, CLAUDE_BG_CARRIED_PROMPTS_SHA256, Lbo } from "../../utils/background/envCarry.js";
import { replaceFileExclusive } from "../../services/daemon/promptStash.js";
import { plural } from "../../utils/stringUtils.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { readJobState } from "../../services/daemon/jobState.js";
import { retryFsOpSync } from "../../utils/atomicPublishWrite.js";

//@ chunk-18hwfzwa.js:51162-51177 placement
var mLe = () => {};
//@ chunk-18hwfzwa.js:51177-51927 placement
function makeAgentTurnFacade(h, x) {
  let D = () => {
      let ke = x.get(h);
      return isLocalAgent(ke) ? ke : void 0;
    },
    L = () => D()?.status === "running",
    ee = () => humanPendingMessagesOf(D());
  return {
    turn: {
      agentId: h,
      guard: {
        get isActive() {
          return L();
        },
        get isRunning() {
          return L();
        },
        isDispatchingForModel: !1,
        subscribe: () => mLe,
      },
      get abortController() {
        return D()?.abortController ?? null;
      },
      readEvidence: () => ({
        isHeldByDialog: !1,
        isToolCallStarting: (x.getTranscript(h)?.inProgressToolUseIDs.size ?? 0) > 0,
        isCompacting: !1,
        isMainRequestAnnounced: !1,
      }),
      interruptForSubmit: void 0,
      endsUnmovableShells: !1,
    },
    messageQueue: {
      getCommandQueueSnapshot: ee,
      getCommandQueue: ee,
      subscribe: () => mLe,
      isFoldInFlight: () => !1,
      isMidTurnFoldSuspended: () => !1,
      promoteToNow: () => !1,
      demoteFromNow: () => !1,
    },
    transcript: { getSnapshot: () => removeMessagesByUuid(x.getTranscript(h)?.messages ?? [], ee()) },
  };
}
//@ chunk-18hwfzwa.js:51927-52153 placement
function humanPendingMessagesOf(h) {
  if (h === void 0) return [];
  let x = [];
  for (let pendingMessage of h.pendingMessages)
    if (pendingMessage.origin?.kind === "human" && pendingMessage.shownAs !== void 0)
      x.push({
        value: pendingMessage.text,
        mode: "prompt",
        uuid: pendingMessage.shownAs,
        agentId: Mr(h.agentId),
        origin: pendingMessage.origin,
      });
  return x;
}
/**
 * 去掉 uuid 在列表中的消息。
 */
//@ chunk-18hwfzwa.js:52153-52267 placement
function removeMessagesByUuid(h, x) {
  if (x.length === 0) return h;
  let D = new Set(x.map((L) => L.uuid));
  return h.filter((L) => !D.has(L.uuid));
}
//@ chunk-18hwfzwa.js:52267-53091 placement
class QueuedSendNowController {
  #e;
  #t = new Map();
  #o = !1;
  constructor(h) {
    this.#e = h;
  }
  sendQueuedNow = (h) => {
    if (this.#o) return !1;
    for (let [D, L] of this.#t)
      if (D !== void 0 && this.#e.taskRegistry.get(D) === void 0) (L.dispose(), this.#t.delete(D));
    let x = this.#t.get(h);
    if (x === void 0)
      ((x = new LowLatencySubmitQueue({
        ...this.#n(h),
        session: this.#e.session,
        taskRegistry: this.#e.taskRegistry,
        clock: this.#e.clock,
        featureName: "input_low_latency_submit",
      })),
        this.#t.set(h, x));
    return x.sendQueuedNow();
  };
  dispose() {
    this.#o = !0;
    for (let h of this.#t.values()) h.dispose();
    this.#t.clear();
  }
  #n(h) {
    if (h !== void 0) return makeAgentTurnFacade(h, this.#e.taskRegistry);
    let x = this.#e,
      { turn: turn, messageQueue: messageQueue, transcript: transcript } = x;
    return {
      turn: {
        agentId: void 0,
        guard: turn.guard,
        get abortController() {
          return turn.abortController;
        },
        readEvidence: () => readTurnBusyState(x),
        interruptForSubmit: () => turn.interruptForSubmit(),
        endsUnmovableShells: !0,
      },
      messageQueue: messageQueue,
      transcript: transcript,
    };
  }
}
//@ chunk-18hwfzwa.js:53091-53520 placement
function readTurnBusyState({
  turn: turn,
  store: store,
  session: session,
  spinnerStore: spinnerStore,
  dialogStore: dialogStore,
}) {
  let ke = spinnerStore.get(),
    state = dialogStore.getState(),
    Be = store.getState().transcripts[mainAgentId()]?.inProgressToolUseIDs;
  return {
    isHeldByDialog:
      mzn(session) || topBlockingDialog(state) !== null || state.open.some((He) => He.userInvoked === !0),
    isToolCallStarting: (Be?.size ?? 0) > 0 || ke.mode === "tool-input",
    isCompacting: ke.isCompacting,
    isMainRequestAnnounced: turn.stream.isMainRequestAwaitingResponse || turn.stream.isMainResponseStreaming,
  };
}
//@ chunk-18hwfzwa.js:53520-53567 placement
function qG(h) {
  return h.pollEmptyDispatch === !0;
}
//@ chunk-18hwfzwa.js:53567-53605 placement
function hLe(h) {
  return Ffe(h) && !qG(h);
}
//@ chunk-18hwfzwa.js:53605-53663 placement
function SLe(h) {
  return qar(h) && h.pollEvent?.wake === !0 && !0;
}
/**
 * 闲置期的 poll 事件投递器：会话空闲时订阅事件队列，启动一轮查询来消费排队事件；若该轮未消费则报 "Queued events were not delivered…" 并保留。
 */
//@ chunk-18hwfzwa.js:53663-55849 placement
class PollEventIdleDelivery {
  #e;
  #t;
  #o;
  #n = !1;
  #s;
  #r;
  #c;
  #i;
  #a = () => {};
  #l = () => {};
  #d = !1;
  #m = !1;
  #p = !1;
  constructor(h) {
    ((this.#e = h), (this.#t = h.guard.isActive), (this.#o = h.guard.generation));
  }
  connect() {
    if (this.#m || this.#p) return;
    ((this.#m = !0),
      (this.#t = this.#e.guard.isActive),
      (this.#o = this.#e.guard.generation),
      (this.#a = this.#e.guard.subscribe(this.#u)),
      (this.#l = this.#e.queue.subscribe(this.#f)),
      this.#f());
  }
  dispose() {
    if (this.#p) return;
    ((this.#p = !0), this.#a(), this.#l());
  }
  #u = () => {
    try {
      this.#h();
    } catch (error) {
      this.#S(error);
    }
  };
  #f = () => {
    try {
      this.#y();
    } catch (error) {
      this.#S(error);
    }
  };
  #S(h) {
    if (isAbortError(h)) logForDebugging(`poll-event idle delivery listener aborted: ${h}`);
    else logError(h);
  }
  #h() {
    let { guard: guard } = this.#e,
      { isActive: isActive, generation: generation } = guard;
    if (isActive && !this.#t)
      if (((this.#n = !1), this.#s !== void 0 && !this.#v()))
        ((this.#r = { ...this.#s, ranQuery: !1 }), (this.#s = void 0));
      else this.#C();
    else if (isActive && guard.isRunning && this.#r) this.#r.ranQuery = !0;
    else if (!isActive && this.#t) {
      let L = this.#r;
      if (((this.#r = void 0), generation !== this.#o))
        ((this.#n = !0), (this.#c = void 0), (this.#i = void 0), this.#C());
      else if (L === void 0) this.#b(void 0);
      else if (L.ranQuery) ((this.#i = void 0), this.#b(L));
      else if (this.#i !== void 0 && ure(this.#i, L)) this.#b(L);
      else ((this.#i = L), this.#b(void 0));
    }
    ((this.#t = isActive), (this.#o = generation));
  }
  #y() {
    if (this.#e.guard.isActive) return;
    if (this.#n) {
      this.#C();
      return;
    }
    if (this.#e.queue.getCommandQueue().some(hLe)) {
      this.#C();
      return;
    }
    this.#b(void 0);
  }
  #b(h) {
    if (h !== void 0) this.#g(h);
    if (this.#d) return;
    ((this.#d = !0),
      queueMicrotask(() => {
        if (((this.#d = !1), this.#p || this.#e.guard.isActive || this.#n)) return;
        try {
          this.#T();
        } catch (error) {
          this.#S(error);
        }
      }));
  }
  #g(h) {
    let x = this.#w();
    if (x === void 0 || !ure(x, h)) return;
    ((this.#c = h),
      logError(
        Error(
          "Queued events were not delivered by the turn started for them; they stay queued until the next prompt or a newer event",
        ),
      ));
  }
  #v() {
    return this.#e.queue.getCommandQueue().some(qG);
  }
  #C() {
    if (((this.#s = void 0), this.#v())) this.#e.queue.removeByFilter(qG);
  }
  #w() {
    let commandQueue = this.#e.queue.getCommandQueue(),
      found = commandQueue.find(SLe),
      last = commandQueue.findLast(SLe);
    return found === void 0 || last === void 0 ? void 0 : { first: found, newest: last };
  }
  #T() {
    let h = this.#w();
    if (h === void 0) return;
    let commandQueue = this.#e.queue.getCommandQueue();
    if (commandQueue.some(qG) || commandQueue.some(hLe)) return;
    if (this.#c !== void 0 && ure(h, this.#c)) return;
    ((this.#c = void 0),
      (this.#s = h),
      this.#e.queue.enqueue({
        value: [],
        mode: "prompt",
        agentId: mainAgentId(),
        isMeta: !0,
        pollEmptyDispatch: !0,
        skipSubmissionHooks: !0,
        unlogged: !0,
      }));
  }
}
//@ chunk-18hwfzwa.js:55849-55913 placement
function ure(h, x) {
  return h.first === x.first && h.newest === x.newest;
}
//@ chunk-18hwfzwa.js:56108-56177 placement
var ADOPT_JSON_QUEUED_PROMPTS = "adopt.json.queued-prompts",
  CLe = 33554432,
  rMt = 256,
  sMt = 3600000;
//@ chunk-18hwfzwa.js:56177-56238 placement
function isLeftArrowCarriesQueuedOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_left_arrow_carries_queued", !0);
}
/**
 * 跨进程携带的排队提示 schema：粘贴内容、提示与整份记录。
 */
//@ chunk-18hwfzwa.js:56238-56966 placement
var CARRIED_PASTE_SCHEMA = DoctorLazy(() =>
    u({
      id: E().int(),
      type: U(["text", "image"]),
      content: o(),
      mediaType: o().optional(),
      filename: o().optional(),
      dimensions: u({
        originalWidth: E().optional(),
        originalHeight: E().optional(),
        displayWidth: E().optional(),
        displayHeight: E().optional(),
      }).optional(),
      unavailable: T(!0).optional(),
      inline: T(!0).optional(),
      slashNameOnly: T(!0).optional(),
    }),
  ),
  CARRIED_PROMPT_SCHEMA = DoctorLazy(() =>
    u({
      value: o(),
      uuid: zJt().optional(),
      pastes: u({
        preExpansionValue: o().optional(),
        pastedContents: pe(o(), CARRIED_PASTE_SCHEMA()),
        pasteTagged: T(!0).optional(),
      }).optional(),
      inputSource: U(["typed", "queued", "suggestion_accepted"]).optional(),
      suppressWorkflowKeyword: M().optional(),
      wait: T(!0).optional(),
      perhapsDelivered: T(!0).optional(),
    }),
  ),
  CARRIED_PROMPTS_FILE_SCHEMA = DoctorLazy(() =>
    u({ writtenAtMs: E(), prompts: A(CARRIED_PROMPT_SCHEMA()).max(rMt) }),
  );
//@ chunk-18hwfzwa.js:56966-57109 placement
function isHumanPromptCommand(h) {
  return (
    $f(h) &&
    (h.mode === "prompt" || h.mode === "bash") &&
    isHumanOrigin(h.origin) &&
    h.verifiedSlackHumanTurn !== !0 &&
    h.isMeta !== !0 &&
    h.passive !== !0
  );
}
/**
 * 排队提示允许的字段。
 */
//@ chunk-18hwfzwa.js:57109-57426 placement
var QUEUED_PROMPT_KEYS = new Set([
  "value",
  "uuid",
  "preExpansionValue",
  "pastedContents",
  "pasteTagged",
  "inputSource",
  "suppressWorkflowKeyword",
  "wait",
  "agentId",
  "mode",
  "priority",
  "origin",
  "skipSlashCommands",
  "timestamp",
  "submittedAtMs",
  "composerEnter",
  "historyEntry",
  "promptSubmitted",
  "ideSelection",
  "deliveryId",
  "attachmentSourceUuid",
]);
//@ chunk-18hwfzwa.js:57426-57672 placement
function toQueuedPromptCommand(h) {
  return (
    h.mode === "prompt" &&
    typeof h.value === "string" &&
    h.priority !== "later" &&
    !h.ideSelection?.text &&
    h.promptSubmitted?.stopped === void 0 &&
    !(looksLikeSlashInput(h.value) && !h.skipSlashCommands) &&
    Object.entries(h).every(([x, D]) => D === void 0 || QUEUED_PROMPT_KEYS.has(x))
  );
}
//@ chunk-18hwfzwa.js:57672-58147 placement
function promptHasImages(h, x) {
  let D = h.promptSubmitted !== void 0 && h.promptSubmitted.text !== h.value,
    filtered = Object.entries(h.pastedContents ?? {}).filter(([, ee]) => !D || ee.type === "image");
  return {
    value: D ? h.promptSubmitted.text : h.value,
    uuid: h.uuid,
    pastes:
      filtered.length > 0
        ? {
            preExpansionValue: D ? void 0 : h.preExpansionValue,
            pastedContents: Object.fromEntries(filtered),
            pasteTagged: D ? void 0 : h.pasteTagged,
          }
        : void 0,
    inputSource: h.inputSource,
    suppressWorkflowKeyword: h.suppressWorkflowKeyword,
    wait: h.wait,
    perhapsDelivered: x,
  };
}
/**
 * 序列化要携带的提示（校验 schema、超过字节上限返回 null）。
 */
//@ chunk-18hwfzwa.js:58147-58355 placement
function serializeCarriedPrompts(h, x) {
  let safeParse = CARRIED_PROMPTS_FILE_SCHEMA().safeParse({
    writtenAtMs: Date.now(),
    prompts: [...h.map((ee) => promptHasImages(ee, !0)), ...x.map((ee) => promptHasImages(ee))],
  });
  if (!safeParse.success) return null;
  let L = jsonStringify(safeParse.data);
  return Buffer.byteLength(L) > CLe ? null : L;
}
//@ chunk-18hwfzwa.js:58355-58885 placement
function collectCarriablePrompts(h, x = []) {
  let filtered = h.getCommandQueue().filter(isHumanPromptCommand),
    L = (ze) => ze.uuid !== void 0 && h.isFoldInFlight(ze.uuid),
    filtered_2 = filtered.filter((ze) => L(ze) && toQueuedPromptCommand(ze)),
    filtered_3 = filtered.filter((ze) => !L(ze)),
    filtered_4 = filtered_3.filter(toQueuedPromptCommand),
    Be = new Set([...filtered_2, ...filtered_4].map((ze) => ze.uuid)),
    filtered_5 = x.filter((ze) => ze.uuid === void 0 || !Be.has(ze.uuid)),
    We =
      filtered_5.length + filtered_2.length + filtered_4.length > 0
        ? serializeCarriedPrompts([...filtered_5, ...filtered_2], filtered_4)
        : "";
  return We === null
    ? { leftEarlier: [], beingRead: [], carriable: [], stranded: filtered_3, fileContents: "" }
    : {
        leftEarlier: filtered_5,
        beingRead: filtered_2,
        carriable: filtered_4,
        stranded: filtered_3.filter((ze) => !toQueuedPromptCommand(ze)),
        fileContents: We,
      };
}
//@ chunk-18hwfzwa.js:58885-58937 placement
function xLe(h, x) {
  return (XIs(h, x), replaceFileExclusive(join_2(h, ADOPT_JSON_QUEUED_PROMPTS), x));
}
//@ chunk-18hwfzwa.js:58937-59109 placement
function cannotOpenAgentsQueuedMessage(h) {
  return `Cannot open agents \u2014 ${h} queued ${plural(h, "message")} can't move to the background. Press \u2190 again once Claude has read ${h === 1 ? "it" : "them"}.`;
}
/**
 * 判断是否为 “Cannot open agents — N queued” 提示。
 */
//@ chunk-18hwfzwa.js:59109-59218 placement
function isCannotOpenAgentsMessage(h) {
  let x = /^Cannot open agents \u2014 (\d+) /.exec(h)?.[1];
  return x !== void 0 && h === cannotOpenAgentsQueuedMessage(Number(x));
}
//@ chunk-18hwfzwa.js:59218-59240 placement
var fre = { take: () => [] };
/**
 * 后台 fork 子进程启动时读取父进程带过来的排队提示文件（adopt.json.queued-prompts），用环境变量里的 SHA256 校验未被篡改，返回 bound/unbound/altered 及提示列表。
 */
//@ chunk-18hwfzwa.js:59240-60281 placement
async function readCarriedPrompts(h, x, D) {
  let CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 = env.CLAUDE_BG_CARRIED_PROMPTS_SHA256;
  if ((env.unset(CLAUDE_BG_CARRIED_PROMPTS_SHA256), !h || !isLeftArrowCarriesQueuedOn())) return fre;
  let ee = join_2(h, ADOPT_JSON_QUEUED_PROMPTS);
  try {
    let ke = await readSmallFileOrNull(ee, CLe);
    if (ke === null) return fre;
    let parse = CARRIED_PROMPTS_FILE_SCHEMA().parse(jsonParse(ke)),
      Be = parse.prompts.some((prompt) => prompt.perhapsDelivered)
        ? carriedPromptsFromMessages(parse.prompts, x)
        : parse.prompts,
      He = await readJobState(h, D),
      We =
        He !== null &&
        (He.cliVersion !== void 0 || (He.resumeSessionId !== void 0 && He.resumeSessionId !== He.sessionId)),
      ze = He === null,
      Xe =
        CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === void 0
          ? "unbound"
          : CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === Lbo(ke)
            ? "bound"
            : "altered";
    return {
      take: () => {
        try {
          retryFsOpSync(ee, ee, unlinkSync);
        } catch (error) {
          if (!isENOENT(error))
            logForDebugging(`[carried-prompts] not deleted, not sent: ${error}`, { level: "warn" });
          return [];
        }
        let rt = Date.now() - parse.writtenAtMs,
          kt =
            Xe !== "bound"
              ? Xe
              : ze
                ? "no_row"
                : We
                  ? "job_has_run"
                  : rt > sMt
                    ? "too_old"
                    : rt < -60000
                      ? "future_dated"
                      : "sent";
        return (
          logEvent("tengu_carried_prompts_taken", {
            count: Be.length,
            already_delivered: parse.prompts.length - Be.length,
            outcome: fromEnum(kt),
            age_ms: rt,
          }),
          kt === "sent" ? Be.map(carriedToQueuedCommand) : []
        );
      },
    };
  } catch (error) {
    return (
      logForDebugging(`[carried-prompts] file unreadable, ignored: ${error}`, { level: "warn" }),
      logEvent("tengu_carried_prompts_taken", { count: 0, outcome: fromEnum("unreadable") }),
      fre
    );
  }
}
//@ chunk-18hwfzwa.js:60281-60517 placement
function carriedPromptsFromMessages(h, x) {
  let D = new Set(
    x.map((L) =>
      L.type === "user"
        ? L.uuid
        : L.type === "attachment" && L.attachment.type === "queued_command"
          ? L.attachment.source_uuid
          : void 0,
    ),
  );
  return h.filter((L) => !(L.perhapsDelivered && L.uuid !== void 0 && D.has(L.uuid)));
}
/**
 * 携带的提示转为下一条执行的主线程排队命令。
 */
//@ chunk-18hwfzwa.js:60517-60753 placement
function carriedToQueuedCommand(h) {
  return {
    value: h.value,
    uuid: h.uuid,
    ...h.pastes,
    inputSource: h.inputSource,
    suppressWorkflowKeyword: h.suppressWorkflowKeyword,
    wait: h.wait,
    agentId: mainAgentId(),
    mode: "prompt",
    priority: "next",
    origin: { kind: "human" },
    skipSlashCommands: !0,
  };
}
//@ chunk-18hwfzwa.js:60873-60877 placement
j();

export {
  isLeftArrowCarriesQueuedOn,
  collectCarriablePrompts,
  cannotOpenAgentsQueuedMessage,
  xLe,
  isHumanPromptCommand,
  isCannotOpenAgentsMessage,
  PollEventIdleDelivery,
  QueuedSendNowController,
  readCarriedPrompts,
};
