/**
 * screens/repl/promptQueue.ts
 *
 * 2.1.316 新增。提示队列。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (24), chunk-wzw7szp3.js (4)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  stringSchema,
  objectSchema,
  literal,
  numberSchema,
  _enum,
  uuidSchema,
  record,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { LowLatencySubmitQueue } from "../../cli/print/lowLatencySubmit.js";
import { Text, Box } from "../../ink/components/Text.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { hasWaitingFor } from "../../services/artifacts/presenceSocket.js";
import { topBlockingDialog } from "../replDialogState.js";
import { isIdleDrainableMainThreadCommand, isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { isMainAgentPollEventMode } from "../../utils/pollEvents.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../../utils/env.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  errorMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../../utils/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wzw7szp3.js:1045-1058 placement
var noopSubscribe = () => {};
//@ chunk-wzw7szp3.js:1058-1800 placement
function makeAgentTurnFacade(agentId, taskRegistry, shownAsByMessage) {
  let getLocalTask = () => {
    let task = taskRegistry.get(agentId);
    return isLocalAgent(task) ? task : undefined;
  };
  let isRunning = () => getLocalTask()?.status === "running";
  let pendingMessages = () => humanPendingMessagesOf(getLocalTask(), shownAsByMessage);
  return {
    turn: {
      agentId,
      guard: {
        get isActive() {
          return isRunning();
        },
        get isRunning() {
          return isRunning();
        },
        isDispatchingForModel: false,
        subscribe: () => noopSubscribe,
      },
      get abortController() {
        return getLocalTask()?.abortController ?? null;
      },
      readEvidence: () => ({
        isHeldByDialog: false,
        isToolCallStarting: (taskRegistry.getTranscript(agentId)?.inProgressToolUseIDs.size ?? 0) > 0,
        isCompacting: false,
        isMainRequestAnnounced: false,
      }),
      interruptForSubmit: undefined,
      endsUnmovableShells: false,
    },
    messageQueue: {
      getCommandQueueSnapshot: pendingMessages,
      getCommandQueue: pendingMessages,
      subscribe: () => noopSubscribe,
      isFoldInFlight: () => false,
      isMidTurnFoldSuspended: () => false,
      promoteToNow: () => false,
      demoteFromNow: () => false,
    },
    transcript: {
      getSnapshot: () =>
        removeMessagesByUuid(
          taskRegistry.getTranscript(agentId)?.messages ?? [],
          humanPendingMessagesOf(getLocalTask()),
        ),
    },
  };
}
//@ chunk-wzw7szp3.js:1800-2053 placement
function humanPendingMessagesOf(task, shownAsByMessage) {
  if (task === undefined) return [];
  let messages = [];
  for (let pendingMessage of task.pendingMessages) {
    let uuid =
      shownAsByMessage !== undefined
        ? shownAsByMessage.get(pendingMessage)
        : pendingMessage.origin?.kind === "human"
          ? pendingMessage.shownAs
          : undefined;
    if (uuid !== undefined)
      messages.push({
        value: pendingMessage.text,
        mode: "prompt",
        uuid,
        agentId: identityAgentId2(task.agentId),
        origin: pendingMessage.origin,
      });
  }
  return messages;
}
//@ chunk-wzw7szp3.js:2053-2165 placement
/**
 * 去掉 uuid 在列表中的消息。
 */
function removeMessagesByUuid(commands, removed) {
  if (removed.length === 0) return commands;
  let uuidSet = new Set(removed.map((command) => command.uuid));
  return commands.filter((command) => !uuidSet.has(command.uuid));
}
//@ chunk-czq1j3j2.js:52766-53590 placement
class QueuedSendNowController {
  #e;
  #t = new Map();
  #o = false;
  constructor(options) {
    this.#e = options;
  }
  sendQueuedNow = (params) => {
    if (this.#o) return false;
    for (let [agentId, queue] of this.#t)
      if (agentId !== undefined && this.#e.taskRegistry.get(agentId) === undefined) {
        queue.dispose();
        this.#t.delete(agentId);
      }
    let queue = this.#t.get(params);
    if (queue === undefined) {
      queue = new LowLatencySubmitQueue({
        ...this.#n(params),
        session: this.#e.session,
        taskRegistry: this.#e.taskRegistry,
        clock: this.#e.clock,
        featureName: "input_low_latency_submit",
      });
      this.#t.set(params, queue);
    }
    return queue.sendQueuedNow();
  };
  dispose() {
    this.#o = true;
    for (let queue of this.#t.values()) queue.dispose();
    this.#t.clear();
  }
  #n(agentId) {
    if (agentId !== undefined) return makeAgentTurnFacade(agentId, this.#e.taskRegistry);
    let mainTurnSource = this.#e;
    let { turn, messageQueue, transcript } = mainTurnSource;
    return {
      turn: {
        agentId: undefined,
        guard: turn.guard,
        get abortController() {
          return turn.abortController;
        },
        readEvidence: () => readTurnBusyState(mainTurnSource),
        interruptForSubmit: () => turn.interruptForSubmit(),
        endsUnmovableShells: true,
      },
      messageQueue,
      transcript,
    };
  }
}
//@ chunk-czq1j3j2.js:53590-54019 placement
function readTurnBusyState({ turn, store, session, spinnerStore, dialogStore }) {
  let spinner = spinnerStore.get();
  let state = dialogStore.getState();
  let inProgressToolUseIDs = store.getState().transcripts[mainAgentId()]?.inProgressToolUseIDs;
  return {
    isHeldByDialog:
      hasWaitingFor(session) ||
      topBlockingDialog(state) !== null ||
      state.open.some((dialog) => dialog.userInvoked === true),
    isToolCallStarting: (inProgressToolUseIDs?.size ?? 0) > 0 || spinner.mode === "tool-input",
    isCompacting: spinner.isCompacting,
    isMainRequestAnnounced: turn.stream.isMainRequestAwaitingResponse || turn.stream.isMainResponseStreaming,
  };
}
//@ chunk-czq1j3j2.js:54019-54066 placement
function isPollEmptyDispatchCommand(command) {
  return command.pollEmptyDispatch === true;
}
//@ chunk-czq1j3j2.js:54066-54103 placement
function isNonPollQueuedCommand(command) {
  return isIdleDrainableMainThreadCommand(command) && !isPollEmptyDispatchCommand(command);
}
//@ chunk-czq1j3j2.js:54103-54195 placement
function isWakePollCommand(command) {
  return (
    isMainAgentPollEventMode(command) &&
    command.pollEvent?.wake === true &&
    (!codeModeAccepted() || command.pollEvent.startsTurn !== false)
  );
}
//@ chunk-czq1j3j2.js:54195-56381 placement
/**
 * 闲置期的 poll 事件投递器：会话空闲时订阅事件队列，启动一轮查询来消费排队事件；若该轮未消费则报 "Queued events were not delivered…" 并保留。
 */
class PollEventIdleDelivery {
  #e;
  #t;
  #o;
  #n = false;
  #r;
  #s;
  #l;
  #i;
  #a = () => {};
  #c = () => {};
  #d = false;
  #u = false;
  #p = false;
  constructor(options) {
    this.#e = options;
    this.#t = options.guard.isActive;
    this.#o = options.guard.generation;
  }
  connect() {
    if (this.#u || this.#p) return;
    this.#u = true;
    this.#t = this.#e.guard.isActive;
    this.#o = this.#e.guard.generation;
    this.#a = this.#e.guard.subscribe(this.#m);
    this.#c = this.#e.queue.subscribe(this.#f);
    this.#f();
  }
  dispose() {
    if (this.#p) return;
    this.#p = true;
    this.#a();
    this.#c();
  }
  #m = () => {
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
  #S(state) {
    if (isAbortError(state)) logForDebugging(`poll-event idle delivery listener aborted: ${state}`);
    else logError(state);
  }
  #h() {
    let { guard } = this.#e;
    let { isActive, generation } = guard;
    if (isActive && !this.#t) {
      this.#n = false;
      if (this.#r !== undefined && !this.#v()) {
        this.#s = {
          ...this.#r,
          ranQuery: false,
        };
        this.#r = undefined;
      } else this.#C();
    } else if (isActive && guard.isRunning && this.#s) this.#s.ranQuery = true;
    else if (!isActive && this.#t) {
      let wakeSnapshot = this.#s;
      this.#s = undefined;
      if (generation !== this.#o) {
        this.#n = true;
        this.#l = undefined;
        this.#i = undefined;
        this.#C();
      } else if (wakeSnapshot === undefined) this.#b(undefined);
      else if (wakeSnapshot.ranQuery) {
        this.#i = undefined;
        this.#b(wakeSnapshot);
      } else if (this.#i !== undefined && isSameWakeSnapshot(this.#i, wakeSnapshot)) this.#b(wakeSnapshot);
      else {
        this.#i = wakeSnapshot;
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
  #b(state) {
    if (state !== undefined) this.#g(state);
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
  #g(wakeSnapshot) {
    let current = this.#w();
    if (current === undefined || !isSameWakeSnapshot(current, wakeSnapshot)) return;
    this.#l = wakeSnapshot;
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
    this.#r = undefined;
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
    let wakeSnapshot = this.#w();
    if (wakeSnapshot === undefined) return;
    let commandQueue = this.#e.queue.getCommandQueue();
    if (commandQueue.some(isPollEmptyDispatchCommand) || commandQueue.some(isNonPollQueuedCommand)) return;
    if (this.#l !== undefined && isSameWakeSnapshot(wakeSnapshot, this.#l)) return;
    this.#l = undefined;
    this.#r = wakeSnapshot;
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
//@ chunk-czq1j3j2.js:56381-56445 placement
function isSameWakeSnapshot(left, right) {
  return left.first === right.first && left.newest === right.newest;
}
//@ chunk-czq1j3j2.js:56640-56709 placement
/**
 * 后台 fork 携带排队提示的文件名 adopt.json.queued-prompts 与大小/数量/TTL 上限。
 */
var ADOPT_JSON_QUEUED_PROMPTS = "adopt.json.queued-prompts";
var MAX_CARRIED_PROMPTS_BYTES = 33554432;
var MAX_CARRIED_PROMPTS = 256;
var CARRIED_PROMPTS_TTL_MS = 3600000;
//@ chunk-czq1j3j2.js:56709-56770 placement
function isLeftArrowCarriesQueuedOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_left_arrow_carries_queued", true);
}
//@ chunk-czq1j3j2.js:56770-57498 placement
/**
 * 跨进程携带的排队提示 schema：粘贴内容、提示与整份记录。
 */
var CARRIED_PASTE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CARRIED_PROMPT_SCHEMA;
var CARRIED_PROMPTS_FILE_SCHEMA;
deferInit("chunk-czq1j3j2.js:56770", () => {
  CARRIED_PASTE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      id: numberSchema().int(),
      type: _enum(["text", "image"]),
      content: stringSchema(),
      mediaType: stringSchema().optional(),
      filename: stringSchema().optional(),
      dimensions: objectSchema({
        originalWidth: numberSchema().optional(),
        originalHeight: numberSchema().optional(),
        displayWidth: numberSchema().optional(),
        displayHeight: numberSchema().optional(),
      }).optional(),
      unavailable: literal(true).optional(),
      inline: literal(true).optional(),
      slashNameOnly: literal(true).optional(),
    }),
  );
  CARRIED_PROMPT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      value: stringSchema(),
      uuid: uuidSchema().optional(),
      pastes: objectSchema({
        preExpansionValue: stringSchema().optional(),
        pastedContents: record(stringSchema(), CARRIED_PASTE_SCHEMA()),
        pasteTagged: literal(true).optional(),
      }).optional(),
      inputSource: _enum(["typed", "queued", "suggestion_accepted"]).optional(),
      suppressWorkflowKeyword: booleanSchema().optional(),
      wait: literal(true).optional(),
      perhapsDelivered: literal(true).optional(),
    }),
  );
  CARRIED_PROMPTS_FILE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      writtenAtMs: numberSchema(),
      prompts: array(CARRIED_PROMPT_SCHEMA()).max(MAX_CARRIED_PROMPTS),
    }),
  );
});
//@ chunk-czq1j3j2.js:57498-57641 placement
function isHumanPromptCommand(command) {
  return (
    isMainAgentCommand(command) &&
    (command.mode === "prompt" || command.mode === "bash") &&
    isHumanOrigin(command.origin) &&
    command.verifiedSlackHumanTurn !== true &&
    command.isMeta !== true &&
    command.passive !== true
  );
}
//@ chunk-czq1j3j2.js:57641-57971 placement
/**
 * 排队提示允许的字段。
 */
var QUEUED_PROMPT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:57641", () => {
  QUEUED_PROMPT_KEYS = new Set([
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
    "raisedFrom",
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
});
//@ chunk-czq1j3j2.js:57971-58217 placement
function toQueuedPromptCommand(command) {
  return (
    command.mode === "prompt" &&
    typeof command.value === "string" &&
    command.priority !== "later" &&
    !command.ideSelection?.text &&
    command.promptSubmitted?.stopped === undefined &&
    !(looksLikeSlashInput(command.value) && !command.skipSlashCommands) &&
    Object.entries(command).every(([key, value]) => value === undefined || QUEUED_PROMPT_KEYS.has(key))
  );
}
//@ chunk-czq1j3j2.js:58217-58692 placement
function promptHasImages(command, perhapsDelivered) {
  let editedText = command.promptSubmitted !== undefined && command.promptSubmitted.text !== command.value;
  let filtered = Object.entries(command.pastedContents ?? {}).filter(
    ([, value]) => !editedText || value.type === "image",
  );
  return {
    value: editedText ? command.promptSubmitted.text : command.value,
    uuid: command.uuid,
    pastes:
      filtered.length > 0
        ? {
            preExpansionValue: editedText ? undefined : command.preExpansionValue,
            pastedContents: Object.fromEntries(filtered),
            pasteTagged: editedText ? undefined : command.pasteTagged,
          }
        : undefined,
    inputSource: command.inputSource,
    suppressWorkflowKeyword: command.suppressWorkflowKeyword,
    wait: command.wait,
    perhapsDelivered,
  };
}
//@ chunk-czq1j3j2.js:58692-58900 placement
/**
 * 序列化要携带的提示（校验 schema、超过字节上限返回 null）。
 */
function serializeCarriedPrompts(folded, remaining) {
  let parsed = CARRIED_PROMPTS_FILE_SCHEMA().safeParse({
    writtenAtMs: Date.now(),
    prompts: [
      ...folded.map((command) => promptHasImages(command, true)),
      ...remaining.map((command) => promptHasImages(command)),
    ],
  });
  if (!parsed.success) return null;
  let serialized = jsonStringify(parsed.data);
  return Buffer.byteLength(serialized) > MAX_CARRIED_PROMPTS_BYTES ? null : serialized;
}
//@ chunk-czq1j3j2.js:58900-59430 placement
function collectCarriablePrompts(queue, carried = []) {
  let filtered = queue.getCommandQueue().filter(isHumanPromptCommand);
  let isFolding = (command) => command.uuid !== undefined && queue.isFoldInFlight(command.uuid);
  let filtered_2 = filtered.filter((command) => isFolding(command) && toQueuedPromptCommand(command));
  let filtered_3 = filtered.filter((command) => !isFolding(command));
  let remaining = filtered_3.filter(toQueuedPromptCommand);
  let uuids = new Set([...filtered_2, ...remaining].map((command) => command.uuid));
  let filtered_4 = carried.filter((prompt) => prompt.uuid === undefined || !uuids.has(prompt.uuid));
  let extra =
    filtered_4.length + filtered_2.length + remaining.length > 0
      ? serializeCarriedPrompts([...filtered_4, ...filtered_2], remaining)
      : "";
  return extra === null
    ? {
        leftEarlier: [],
        beingRead: [],
        carriable: [],
        stranded: filtered_3,
        fileContents: "",
      }
    : {
        leftEarlier: filtered_4,
        beingRead: filtered_2,
        carriable: remaining,
        stranded: filtered_3.filter((command) => !toQueuedPromptCommand(command)),
        fileContents: extra,
      };
}
//@ chunk-czq1j3j2.js:59430-59482 placement
function writeCarriedPrompts(dir, prompts) {
  setCarriedPromptHash(dir, prompts);
  return replaceFileExclusive(join(dir, ADOPT_JSON_QUEUED_PROMPTS), prompts);
}
//@ chunk-czq1j3j2.js:59482-59654 placement
function cannotOpenAgentsQueuedMessage(count) {
  return `Cannot open agents \u2014 ${count} queued ${plural(count, "message")} can't move to the background. Press \u2190 again once Claude has read ${count === 1 ? "it" : "them"}.`;
}
//@ chunk-czq1j3j2.js:59654-59763 placement
/**
 * 判断是否为 “Cannot open agents — N queued” 提示。
 */
function isCannotOpenAgentsMessage(message) {
  let match = /^Cannot open agents \u2014 (\d+) /.exec(message)?.[1];
  return match !== undefined && message === cannotOpenAgentsQueuedMessage(Number(match));
}
//@ chunk-czq1j3j2.js:59763-59785 placement
var EMPTY_CARRIED_PROMPTS = {
  take: () => [],
};
//@ chunk-czq1j3j2.js:59785-60826 placement
/**
 * 后台 fork 子进程启动时读取父进程带过来的排队提示文件（adopt.json.queued-prompts），用环境变量里的 SHA256 校验未被篡改，返回 bound/unbound/altered 及提示列表。
 */
async function readCarriedPrompts(bgJobDir, messages, storageV5) {
  let CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 = env.CLAUDE_BG_CARRIED_PROMPTS_SHA256;
  env.unset(CLAUDE_BG_CARRIED_PROMPTS_SHA256);
  if (!bgJobDir || !isLeftArrowCarriesQueuedOn()) return EMPTY_CARRIED_PROMPTS;
  let path = join(bgJobDir, ADOPT_JSON_QUEUED_PROMPTS);
  try {
    let smallFileOrNull = await readSmallFileOrNull(path, MAX_CARRIED_PROMPTS_BYTES);
    if (smallFileOrNull === null) return EMPTY_CARRIED_PROMPTS;
    let parsed = CARRIED_PROMPTS_FILE_SCHEMA().parse(jsonParse(smallFileOrNull));
    let deliveredPrompts = parsed.prompts.some((prompt) => prompt.perhapsDelivered)
      ? carriedPromptsFromMessages(parsed.prompts, messages)
      : parsed.prompts;
    let jobState = await readJobState(bgJobDir, storageV5);
    let promptSummary =
      jobState !== null &&
      (jobState.cliVersion !== undefined ||
        (jobState.resumeSessionId !== undefined && jobState.resumeSessionId !== jobState.sessionId));
    let noJob = jobState === null;
    let carriedSummary =
      CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === undefined
        ? "unbound"
        : CLAUDE_BG_CARRIED_PROMPTS_SHA256_2 === sha256Hex(smallFileOrNull)
          ? "bound"
          : "altered";
    return {
      take: () => {
        try {
          retryFsOpSync(path, path, unlinkSync);
        } catch (error) {
          if (!isENOENT(error))
            logForDebugging(`[carried-prompts] not deleted, not sent: ${error}`, {
              level: "warn",
            });
          return [];
        }
        let ageMs = Date.now() - parsed.writtenAtMs;
        let writeState =
          carriedSummary !== "bound"
            ? carriedSummary
            : noJob
              ? "no_row"
              : promptSummary
                ? "job_has_run"
                : ageMs > CARRIED_PROMPTS_TTL_MS
                  ? "too_old"
                  : ageMs < -60000
                    ? "future_dated"
                    : "sent";
        logEvent("tengu_carried_prompts_taken", {
          count: deliveredPrompts.length,
          already_delivered: parsed.prompts.length - deliveredPrompts.length,
          outcome: fromEnum(writeState),
          age_ms: ageMs,
        });
        return writeState === "sent" ? deliveredPrompts.map(carriedToQueuedCommand) : [];
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
//@ chunk-czq1j3j2.js:60826-61062 placement
function carriedPromptsFromMessages(prompts, messages) {
  let uuids = new Set(
    messages.map((message) =>
      message.type === "user"
        ? message.uuid
        : message.type === "attachment" && message.attachment.type === "queued_command"
          ? message.attachment.source_uuid
          : undefined,
    ),
  );
  return prompts.filter(
    (prompt) => !(prompt.perhapsDelivered && prompt.uuid !== undefined && uuids.has(prompt.uuid)),
  );
}
//@ chunk-czq1j3j2.js:61062-61298 placement
/**
 * 携带的提示转为下一条执行的主线程排队命令。
 */
function carriedToQueuedCommand(prompt) {
  return {
    value: prompt.value,
    uuid: prompt.uuid,
    ...prompt.pastes,
    inputSource: prompt.inputSource,
    suppressWorkflowKeyword: prompt.suppressWorkflowKeyword,
    wait: prompt.wait,
    agentId: mainAgentId(),
    mode: "prompt",
    priority: "next",
    origin: {
      kind: "human",
    },
    skipSlashCommands: true,
  };
}
//@ chunk-czq1j3j2.js:61418-61422 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:61418", () => {
  init_react_production();
});
export {
  makeAgentTurnFacade,
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
