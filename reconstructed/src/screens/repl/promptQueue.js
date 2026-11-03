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
import { join } from "path";
import { unlinkSync } from "fs";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  string,
  u,
  literal,
  E,
  _enum,
  zJt,
  record,
  M,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { LowLatencySubmitQueue } from "../../cli/print/lowLatencySubmit.js";
import { Text, Box } from "../../ink/components/Text.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { hasWaitingFor } from "../../services/artifacts/presenceSocket.js";
import { topBlockingDialog } from "../replDialogState.js";
import { isSendableQueuedCommand, isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { isMainAgentPollEventMode } from "../../utils/pollEvents.js";
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
import { y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { looksLikeSlashInput } from "../../commands.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  setCarriedPromptHash,
  CLAUDE_BG_CARRIED_PROMPTS_SHA256,
  sha256Hex,
} from "../../utils/background/envCarry.js";
import { replaceFileExclusive } from "../../services/daemon/promptStash.js";
import { plural } from "../../utils/stringUtils.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { readJobState } from "../../services/daemon/jobState.js";
import { retryFsOpSync } from "../../utils/atomicPublishWrite.js";

//@ chunk-18hwfzwa.js:51162-51177 placement
var noopSubscribe = () => {};
//@ chunk-18hwfzwa.js:51177-51927 placement
function makeAgentTurnFacade(h, taskRegistry) {
  let D = () => {
    let ke = taskRegistry.get(h);
    return isLocalAgent(ke) ? ke : undefined;
  };
  let L = () => D()?.status === "running";
  let ee = () => humanPendingMessagesOf(D());
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
        isDispatchingForModel: false,
        subscribe: () => noopSubscribe,
      },
      get abortController() {
        return D()?.abortController ?? null;
      },
      readEvidence: () => ({
        isHeldByDialog: false,
        isToolCallStarting: (taskRegistry.getTranscript(h)?.inProgressToolUseIDs.size ?? 0) > 0,
        isCompacting: false,
        isMainRequestAnnounced: false,
      }),
      interruptForSubmit: undefined,
      endsUnmovableShells: false,
    },
    messageQueue: {
      getCommandQueueSnapshot: ee,
      getCommandQueue: ee,
      subscribe: () => noopSubscribe,
      isFoldInFlight: () => false,
      isMidTurnFoldSuspended: () => false,
      promoteToNow: () => false,
      demoteFromNow: () => false,
    },
    transcript: {
      getSnapshot: () => removeMessagesByUuid(taskRegistry.getTranscript(h)?.messages ?? [], ee()),
    },
  };
}
//@ chunk-18hwfzwa.js:51927-52153 placement
function humanPendingMessagesOf(h) {
  if (h === undefined) return [];
  let x = [];
  for (let pendingMessage of h.pendingMessages)
    if (pendingMessage.origin?.kind === "human" && pendingMessage.shownAs !== undefined)
      x.push({
        value: pendingMessage.text,
        mode: "prompt",
        uuid: pendingMessage.shownAs,
        agentId: identityAgentId2(h.agentId),
        origin: pendingMessage.origin,
      });
  return x;
}
//@ chunk-18hwfzwa.js:52153-52267 placement
/**
 * 去掉 uuid 在列表中的消息。
 */
function removeMessagesByUuid(h, x) {
  if (x.length === 0) return h;
  let D = new Set(x.map((L) => L.uuid));
  return h.filter((L) => !D.has(L.uuid));
}
//@ chunk-18hwfzwa.js:52267-53091 placement
class QueuedSendNowController {
  #e;
  #t = new Map();
  #o = false;
  constructor(h) {
    this.#e = h;
  }
  sendQueuedNow = (h) => {
    if (this.#o) return false;
    for (let [D, L] of this.#t)
      if (D !== undefined && this.#e.taskRegistry.get(D) === undefined) {
        L.dispose();
        this.#t.delete(D);
      }
    let x = this.#t.get(h);
    if (x === undefined) {
      x = new LowLatencySubmitQueue({
        ...this.#n(h),
        session: this.#e.session,
        taskRegistry: this.#e.taskRegistry,
        clock: this.#e.clock,
        featureName: "input_low_latency_submit",
      });
      this.#t.set(h, x);
    }
    return x.sendQueuedNow();
  };
  dispose() {
    this.#o = true;
    for (let h of this.#t.values()) h.dispose();
    this.#t.clear();
  }
  #n(h) {
    if (h !== undefined) return makeAgentTurnFacade(h, this.#e.taskRegistry);
    let x = this.#e;
    let { turn, messageQueue, transcript } = x;
    return {
      turn: {
        agentId: undefined,
        guard: turn.guard,
        get abortController() {
          return turn.abortController;
        },
        readEvidence: () => readTurnBusyState(x),
        interruptForSubmit: () => turn.interruptForSubmit(),
        endsUnmovableShells: true,
      },
      messageQueue,
      transcript,
    };
  }
}
//@ chunk-18hwfzwa.js:53091-53520 placement
function readTurnBusyState({ turn, store, session, spinnerStore, dialogStore }) {
  let ke = spinnerStore.get();
  let state = dialogStore.getState();
  let inProgressToolUseIDs = store.getState().transcripts[mainAgentId()]?.inProgressToolUseIDs;
  return {
    isHeldByDialog:
      hasWaitingFor(session) ||
      topBlockingDialog(state) !== null ||
      state.open.some((He) => He.userInvoked === true),
    isToolCallStarting: (inProgressToolUseIDs?.size ?? 0) > 0 || ke.mode === "tool-input",
    isCompacting: ke.isCompacting,
    isMainRequestAnnounced: turn.stream.isMainRequestAwaitingResponse || turn.stream.isMainResponseStreaming,
  };
}
//@ chunk-18hwfzwa.js:53520-53567 placement
function isPollEmptyDispatchCommand(h) {
  return h.pollEmptyDispatch === true;
}
//@ chunk-18hwfzwa.js:53567-53605 placement
function isNonPollQueuedCommand(h) {
  return isSendableQueuedCommand(h) && !isPollEmptyDispatchCommand(h);
}
//@ chunk-18hwfzwa.js:53605-53663 placement
function isWakePollCommand(h) {
  return isMainAgentPollEventMode(h) && h.pollEvent?.wake === true && true;
}
//@ chunk-18hwfzwa.js:53663-55849 placement
/**
 * 闲置期的 poll 事件投递器：会话空闲时订阅事件队列，启动一轮查询来消费排队事件；若该轮未消费则报 "Queued events were not delivered…" 并保留。
 */
class PollEventIdleDelivery {
  #e;
  #t;
  #o;
  #n = false;
  #s;
  #r;
  #c;
  #i;
  #a = () => {};
  #l = () => {};
  #d = false;
  #m = false;
  #p = false;
  constructor(h) {
    this.#e = h;
    this.#t = h.guard.isActive;
    this.#o = h.guard.generation;
  }
  connect() {
    if (this.#m || this.#p) return;
    this.#m = true;
    this.#t = this.#e.guard.isActive;
    this.#o = this.#e.guard.generation;
    this.#a = this.#e.guard.subscribe(this.#u);
    this.#l = this.#e.queue.subscribe(this.#f);
    this.#f();
  }
  dispose() {
    if (this.#p) return;
    this.#p = true;
    this.#a();
    this.#l();
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
    let { guard } = this.#e;
    let { isActive, generation } = guard;
    if (isActive && !this.#t) {
      this.#n = false;
      if (this.#s !== undefined && !this.#v()) {
        this.#r = {
          ...this.#s,
          ranQuery: false,
        };
        this.#s = undefined;
      } else this.#C();
    } else if (isActive && guard.isRunning && this.#r) this.#r.ranQuery = true;
    else if (!isActive && this.#t) {
      let L = this.#r;
      this.#r = undefined;
      if (generation !== this.#o) {
        this.#n = true;
        this.#c = undefined;
        this.#i = undefined;
        this.#C();
      } else if (L === undefined) this.#b(undefined);
      else if (L.ranQuery) {
        this.#i = undefined;
        this.#b(L);
      } else if (this.#i !== undefined && isSameWakeSnapshot(this.#i, L)) this.#b(L);
      else {
        this.#i = L;
        this.#b(undefined);
      }
    }
    this.#t = isActive;
    this.#o = generation;
  }
  #y() {
    if (this.#e.guard.isActive) return;
    if (this.#n) {
      this.#C();
      return;
    }
    if (this.#e.queue.getCommandQueue().some(isNonPollQueuedCommand)) {
      this.#C();
      return;
    }
    this.#b(undefined);
  }
  #b(h) {
    if (h !== undefined) this.#g(h);
    if (this.#d) return;
    this.#d = true;
    queueMicrotask(() => {
      this.#d = false;
      if (this.#p || this.#e.guard.isActive || this.#n) return;
      try {
        this.#T();
      } catch (error) {
        this.#S(error);
      }
    });
  }
  #g(h) {
    let x = this.#w();
    if (x === undefined || !isSameWakeSnapshot(x, h)) return;
    this.#c = h;
    logError(
      Error(
        "Queued events were not delivered by the turn started for them; they stay queued until the next prompt or a newer event",
      ),
    );
  }
  #v() {
    return this.#e.queue.getCommandQueue().some(isPollEmptyDispatchCommand);
  }
  #C() {
    this.#s = undefined;
    if (this.#v()) this.#e.queue.removeByFilter(isPollEmptyDispatchCommand);
  }
  #w() {
    let commandQueue = this.#e.queue.getCommandQueue();
    let found = commandQueue.find(isWakePollCommand);
    let last = commandQueue.findLast(isWakePollCommand);
    return found === undefined || last === undefined
      ? undefined
      : {
          first: found,
          newest: last,
        };
  }
  #T() {
    let h = this.#w();
    if (h === undefined) return;
    let commandQueue = this.#e.queue.getCommandQueue();
    if (commandQueue.some(isPollEmptyDispatchCommand) || commandQueue.some(isNonPollQueuedCommand)) return;
    if (this.#c !== undefined && isSameWakeSnapshot(h, this.#c)) return;
    this.#c = undefined;
    this.#s = h;
    this.#e.queue.enqueue({
      value: [],
      mode: "prompt",
      agentId: mainAgentId(),
      isMeta: true,
      pollEmptyDispatch: true,
      skipSubmissionHooks: true,
      unlogged: true,
    });
  }
}
//@ chunk-18hwfzwa.js:55849-55913 placement
function isSameWakeSnapshot(h, x) {
  return h.first === x.first && h.newest === x.newest;
}
//@ chunk-18hwfzwa.js:56108-56177 placement
/**
 * 后台 fork 携带排队提示的文件名 adopt.json.queued-prompts 与大小/数量/TTL 上限。
 */
var ADOPT_JSON_QUEUED_PROMPTS = "adopt.json.queued-prompts";
var MAX_CARRIED_PROMPTS_BYTES = 33554432;
var MAX_CARRIED_PROMPTS = 256;
var CARRIED_PROMPTS_TTL_MS = 3600000;
//@ chunk-18hwfzwa.js:56177-56238 placement
function isLeftArrowCarriesQueuedOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_left_arrow_carries_queued", true);
}
//@ chunk-18hwfzwa.js:56238-56966 placement
/**
 * 跨进程携带的排队提示 schema：粘贴内容、提示与整份记录。
 */
var CARRIED_PASTE_SCHEMA = DoctorLazy(() =>
  u({
    id: E().int(),
    type: _enum(["text", "image"]),
    content: string(),
    mediaType: string().optional(),
    filename: string().optional(),
    dimensions: u({
      originalWidth: E().optional(),
      originalHeight: E().optional(),
      displayWidth: E().optional(),
      displayHeight: E().optional(),
    }).optional(),
    unavailable: literal(true).optional(),
    inline: literal(true).optional(),
    slashNameOnly: literal(true).optional(),
  }),
);
var CARRIED_PROMPT_SCHEMA = DoctorLazy(() =>
  u({
    value: string(),
    uuid: zJt().optional(),
    pastes: u({
      preExpansionValue: string().optional(),
      pastedContents: record(string(), CARRIED_PASTE_SCHEMA()),
      pasteTagged: literal(true).optional(),
    }).optional(),
    inputSource: _enum(["typed", "queued", "suggestion_accepted"]).optional(),
    suppressWorkflowKeyword: M().optional(),
    wait: literal(true).optional(),
    perhapsDelivered: literal(true).optional(),
  }),
);
var CARRIED_PROMPTS_FILE_SCHEMA = DoctorLazy(() =>
  u({
    writtenAtMs: E(),
    prompts: array(CARRIED_PROMPT_SCHEMA()).max(MAX_CARRIED_PROMPTS),
  }),
);
//@ chunk-18hwfzwa.js:56966-57109 placement
function isHumanPromptCommand(h) {
  return (
    isMainAgentCommand(h) &&
    (h.mode === "prompt" || h.mode === "bash") &&
    isHumanOrigin(h.origin) &&
    h.verifiedSlackHumanTurn !== true &&
    h.isMeta !== true &&
    h.passive !== true
  );
}
//@ chunk-18hwfzwa.js:57109-57426 placement
/**
 * 排队提示允许的字段。
 */
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
    h.promptSubmitted?.stopped === undefined &&
    !(looksLikeSlashInput(h.value) && !h.skipSlashCommands) &&
    Object.entries(h).every(([key, value]) => value === undefined || QUEUED_PROMPT_KEYS.has(key))
  );
}
//@ chunk-18hwfzwa.js:57672-58147 placement
function promptHasImages(h, perhapsDelivered) {
  let D = h.promptSubmitted !== undefined && h.promptSubmitted.text !== h.value;
  let filtered = Object.entries(h.pastedContents ?? {}).filter(([, value]) => !D || value.type === "image");
  return {
    value: D ? h.promptSubmitted.text : h.value,
    uuid: h.uuid,
    pastes:
      filtered.length > 0
        ? {
            preExpansionValue: D ? undefined : h.preExpansionValue,
            pastedContents: Object.fromEntries(filtered),
            pasteTagged: D ? undefined : h.pasteTagged,
          }
        : undefined,
    inputSource: h.inputSource,
    suppressWorkflowKeyword: h.suppressWorkflowKeyword,
    wait: h.wait,
    perhapsDelivered,
  };
}
//@ chunk-18hwfzwa.js:58147-58355 placement
/**
 * 序列化要携带的提示（校验 schema、超过字节上限返回 null）。
 */
function serializeCarriedPrompts(h, x) {
  let D = CARRIED_PROMPTS_FILE_SCHEMA().safeParse({
    writtenAtMs: Date.now(),
    prompts: [...h.map((ee) => promptHasImages(ee, true)), ...x.map((ee) => promptHasImages(ee))],
  });
  if (!D.success) return null;
  let L = jsonStringify(D.data);
  return Buffer.byteLength(L) > MAX_CARRIED_PROMPTS_BYTES ? null : L;
}
//@ chunk-18hwfzwa.js:58355-58885 placement
function collectCarriablePrompts(h, x = []) {
  let filtered = h.getCommandQueue().filter(isHumanPromptCommand);
  let L = (ze) => ze.uuid !== undefined && h.isFoldInFlight(ze.uuid);
  let filtered_2 = filtered.filter((ze) => L(ze) && toQueuedPromptCommand(ze));
  let filtered_3 = filtered.filter((ze) => !L(ze));
  let filtered_4 = filtered_3.filter(toQueuedPromptCommand);
  let Be = new Set([...filtered_2, ...filtered_4].map((ze) => ze.uuid));
  let filtered_5 = x.filter((ze) => ze.uuid === undefined || !Be.has(ze.uuid));
  let We =
    filtered_5.length + filtered_2.length + filtered_4.length > 0
      ? serializeCarriedPrompts([...filtered_5, ...filtered_2], filtered_4)
      : "";
  return We === null
    ? {
        leftEarlier: [],
        beingRead: [],
        carriable: [],
        stranded: filtered_3,
        fileContents: "",
      }
    : {
        leftEarlier: filtered_5,
        beingRead: filtered_2,
        carriable: filtered_4,
        stranded: filtered_3.filter((ze) => !toQueuedPromptCommand(ze)),
        fileContents: We,
      };
}
//@ chunk-18hwfzwa.js:58885-58937 placement
function writeCarriedPrompts(h, fileContents) {
  setCarriedPromptHash(h, fileContents);
  return replaceFileExclusive(join(h, ADOPT_JSON_QUEUED_PROMPTS), fileContents);
}
//@ chunk-18hwfzwa.js:58937-59109 placement
function cannotOpenAgentsQueuedMessage(h) {
  return `Cannot open agents \u2014 ${h} queued ${plural(h, "message")} can't move to the background. Press \u2190 again once Claude has read ${h === 1 ? "it" : "them"}.`;
}
//@ chunk-18hwfzwa.js:59109-59218 placement
/**
 * 判断是否为 “Cannot open agents — N queued” 提示。
 */
function isCannotOpenAgentsMessage(h) {
  let x = /^Cannot open agents \u2014 (\d+) /.exec(h)?.[1];
  return x !== undefined && h === cannotOpenAgentsQueuedMessage(Number(x));
}
//@ chunk-18hwfzwa.js:59218-59240 placement
var EMPTY_CARRIED_PROMPTS = {
  take: () => [],
};
//@ chunk-18hwfzwa.js:59240-60281 placement
/**
 * 后台 fork 子进程启动时读取父进程带过来的排队提示文件（adopt.json.queued-prompts），用环境变量里的 SHA256 校验未被篡改，返回 bound/unbound/altered 及提示列表。
 */
async function readCarriedPrompts(bgJobDir, snapshot, storageV5) {
  let CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 = env.CLAUDE_BG_CARRIED_PROMPTS_SHA256;
  env.unset(CLAUDE_BG_CARRIED_PROMPTS_SHA256);
  if (!bgJobDir || !isLeftArrowCarriesQueuedOn()) return EMPTY_CARRIED_PROMPTS;
  let ee = join(bgJobDir, ADOPT_JSON_QUEUED_PROMPTS);
  try {
    let smallFileOrNull = await readSmallFileOrNull(ee, MAX_CARRIED_PROMPTS_BYTES);
    if (smallFileOrNull === null) return EMPTY_CARRIED_PROMPTS;
    let Re = CARRIED_PROMPTS_FILE_SCHEMA().parse(jsonParse(smallFileOrNull));
    let Be = Re.prompts.some((prompt) => prompt.perhapsDelivered)
      ? carriedPromptsFromMessages(Re.prompts, snapshot)
      : Re.prompts;
    let jobState = await readJobState(bgJobDir, storageV5);
    let We =
      jobState !== null &&
      (jobState.cliVersion !== undefined ||
        (jobState.resumeSessionId !== undefined && jobState.resumeSessionId !== jobState.sessionId));
    let ze = jobState === null;
    let Xe =
      CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === undefined
        ? "unbound"
        : CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === sha256Hex(smallFileOrNull)
          ? "bound"
          : "altered";
    return {
      take: () => {
        try {
          retryFsOpSync(ee, ee, unlinkSync);
        } catch (error) {
          if (!isENOENT(error))
            logForDebugging(`[carried-prompts] not deleted, not sent: ${error}`, {
              level: "warn",
            });
          return [];
        }
        let rt = Date.now() - Re.writtenAtMs;
        let kt =
          Xe !== "bound"
            ? Xe
            : ze
              ? "no_row"
              : We
                ? "job_has_run"
                : rt > CARRIED_PROMPTS_TTL_MS
                  ? "too_old"
                  : rt < -60000
                    ? "future_dated"
                    : "sent";
        logEvent("tengu_carried_prompts_taken", {
          count: Be.length,
          already_delivered: Re.prompts.length - Be.length,
          outcome: fromEnum(kt),
          age_ms: rt,
        });
        return kt === "sent" ? Be.map(carriedToQueuedCommand) : [];
      },
    };
  } catch (error) {
    logForDebugging(`[carried-prompts] file unreadable, ignored: ${error}`, {
      level: "warn",
    });
    logEvent("tengu_carried_prompts_taken", {
      count: 0,
      outcome: fromEnum("unreadable"),
    });
    return EMPTY_CARRIED_PROMPTS;
  }
}
//@ chunk-18hwfzwa.js:60281-60517 placement
function carriedPromptsFromMessages(prompts, x) {
  let D = new Set(
    x.map((L) =>
      L.type === "user"
        ? L.uuid
        : L.type === "attachment" && L.attachment.type === "queued_command"
          ? L.attachment.source_uuid
          : undefined,
    ),
  );
  return prompts.filter((L) => !(L.perhapsDelivered && L.uuid !== undefined && D.has(L.uuid)));
}
//@ chunk-18hwfzwa.js:60517-60753 placement
/**
 * 携带的提示转为下一条执行的主线程排队命令。
 */
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
    origin: {
      kind: "human",
    },
    skipSlashCommands: true,
  };
}
//@ chunk-18hwfzwa.js:60873-60877 placement
init_react_production();
export {
  isLeftArrowCarriesQueuedOn,
  collectCarriablePrompts,
  cannotOpenAgentsQueuedMessage,
  writeCarriedPrompts,
  isHumanPromptCommand,
  isCannotOpenAgentsMessage,
  PollEventIdleDelivery,
  QueuedSendNowController,
  readCarriedPrompts,
};
