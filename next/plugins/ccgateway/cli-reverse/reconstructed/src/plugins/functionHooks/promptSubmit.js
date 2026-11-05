/**
 * plugins/functionHooks/promptSubmit.ts
 *
 * 2.1.316 新增：prompt.submit 事件钩子与提交改写
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { MANAGED } from "./classicHookBridge.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost, mainAgentId } from "../../bootstrap/state.js";
import {
  commandsDiscarded,
  commandsConsumed,
  getCommandQueue,
  enqueue,
} from "../../utils/messageQueueManager.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import {
  requireBoundSession,
  isSlashCommandText,
  checkPromptSubmitArgs,
  submitHoldRefusal,
  MAX_SESSION_TEXT_CHARS,
  LATER,
} from "./sessionApi.js";
import { HooksError } from "./hooksErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:778336-778392 placement
/**
 * 钩子未放行提示
 */
var PROMPT_NOT_PASSED = "a hook answered without passing the prompt on";
//@ chunk-5xgkngpb.js:778392-778481 placement
/**
 * 保证有 drop
 */
function ensureDrop(answered, made) {
  let madeDrop = made?.drop === undefined ? undefined : made;
  return answered.drop !== undefined
    ? answered
    : (madeDrop ?? {
        drop: PROMPT_NOT_PASSED,
      });
}
//@ chunk-5xgkngpb.js:778481-778529 placement
/**
 * 批次中前一条失败
 */
var BATCH_FAILED_DROP = "an earlier prompt in the batch failed";
//@ chunk-5xgkngpb.js:778529-778585 placement
/**
 * 构造核心步骤
 */
var coreStep = (run) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run,
});
//@ chunk-5xgkngpb.js:778585-778736 placement
var createManagedSubmitHandler = (runHooks, noteManagedText) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(request, bottom) {
    let outcome = await runHooks(request.text, {
      managedHooksOnly: true,
    });
    noteManagedText(request.text);
    return outcome.drop === undefined ? bottom(request) : outcome;
  },
});
//@ chunk-5xgkngpb.js:778736-778771 placement
/**
 * 提交监视状态
 */
var submitWatchState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:778736", () => {
  submitWatchState = new HostScoped(() => ({
    watching: false,
  }));
});
//@ chunk-5xgkngpb.js:778771-779216 placement
/**
 * 跟踪排队中的提示提交：被移出队列时以丢弃结算，以文本形式交给模型时以文本结算。
 */
function createSubmitWaiters() {
  let waitersByUuid = new Map();
  function take(uuid) {
    let waiter = waitersByUuid.get(uuid);
    waitersByUuid.delete(uuid);
    return waiter;
  }
  function settleEach(commands, makeOutcome) {
    for (let command of commands) {
      if (command.uuid === undefined) continue;
      take(command.uuid)?.settle(makeOutcome(command));
    }
  }
  return {
    record: (uuid, waiter) => {
      let watchState = onProcessRootHost(submitWatchState);
      if (!watchState.watching) {
        watchState.watching = true;
        commandsDiscarded.subscribe((discarded) =>
          settleEach(discarded, () => ({
            drop: "the prompt was removed from the queue before it ran",
          })),
        );
        commandsConsumed.subscribe((consumed) =>
          settleEach(consumed, (command) => {
            let value = command.value;
            return {
              text:
                typeof value === "string"
                  ? value
                  : extractTextContent_2(
                      value,
                      `
`,
                    ),
            };
          }),
        );
      }
      waitersByUuid.set(uuid, waiter);
    },
    take,
    settleEach,
  };
}
//@ chunk-5xgkngpb.js:779216-779230 placement
/**
 * 提交等待者
 */
var submitWaiters; // deferred: uses createSubmitWaiters of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:779216", () => {
  submitWaiters = createSubmitWaiters();
});
//@ chunk-5xgkngpb.js:779230-779305 placement
/**
 * 释放时丢弃等待项
 */
var disposeDropsWaiting = (uuids) => ({
  [Symbol.dispose]: () => {
    submitWaiters.settleEach(uuids, () => ({
      drop: BATCH_FAILED_DROP,
    }));
  },
});
//@ chunk-5xgkngpb.js:779305-779746 placement
/**
 * 为 prompt.submit 构造链两端：托管钩子处理器与核心处理器（运行 UserPromptSubmit 钩子并记录每步结果）。
 */
function createSubmitChainEnds(runHooks, perform = (request) => Promise.resolve(request)) {
  let stepRecorder = createStepRecorder();
  let managedText;
  let arrivedContext;
  let managed = createManagedSubmitHandler(runHooks, (text) => {
    managedText = text;
  });
  async function runBeforeCore(request) {
    arrivedContext = request.context;
    let outcome = await runHooks(
      request.text,
      request.text === managedText
        ? {
            managedHooksExcluded: true,
          }
        : {},
    );
    let hasContext = request.context !== undefined && request.context.length > 0;
    let kept =
      outcome.drop === undefined
        ? {
            text: outcome.text,
            origin: request.origin,
            ...(hasContext && {
              context: request.context,
            }),
          }
        : outcome;
    stepRecorder.keep(request.text, kept);
    return kept;
  }
  let core = coreStep(async (request) => {
    let kept = await runBeforeCore(request);
    return kept.drop === undefined ? perform(kept) : kept;
  });
  return {
    managed,
    core,
    runs: stepRecorder,
    arrivedContext: () => arrivedContext,
  };
}
//@ chunk-5xgkngpb.js:779746-779774 placement
/**
 * prompt.submit 站点规则
 */
var PROMPT_SUBMIT_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:779746", () => {
  PROMPT_SUBMIT_RULES = UI_ENV_SITE_RULES["prompt.submit"];
});
//@ chunk-5xgkngpb.js:779774-779843 placement
/**
 * 等待提交结果
 */
var waitForSubmit = (uuid, origin) =>
  new Promise((resolve) => {
    submitWaiters.record(uuid, {
      origin,
      settle: resolve,
    });
  });
//@ chunk-5xgkngpb.js:779843-779886 placement
/**
 * 取出等待者
 */
var takeSubmitWaiter = (uuid) => (uuid === undefined ? undefined : submitWaiters.take(uuid));
//@ chunk-5xgkngpb.js:779886-779931 placement
/**
 * 非 undefined 或 session.start
 */
var isSubmittableEvent = (rootEvent) => rootEvent === undefined || rootEvent === "session.start";
//@ chunk-5xgkngpb.js:779931-779966 placement
/**
 * 提交标记槽
 */
var submitMarksSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:779931", () => {
  submitMarksSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:779966-780021 placement
/**
 * 记录提交标记
 */
function markSubmit(uuid, rootEvent) {
  let marks = submitMarksSlot.get();
  if (marks && isSubmittableEvent(rootEvent)) marks.add(uuid);
}
//@ chunk-5xgkngpb.js:780021-780349 placement
/**
 * 提交标记集合：标记、查询，并按当前队列修剪。
 */
function createSubmitMarks() {
  let marked = new Set();
  let aside = new Set();
  return {
    mark: (uuid) => {
      marked.add(uuid);
    },
    has: (uuid) => uuid !== undefined && marked.has(uuid),
    prune: (commands) => {
      let queued = new Set(commands.map((command) => command.uuid));
      for (let uuid of marked) if (!queued.has(uuid) && !aside.has(uuid)) marked.delete(uuid);
    },
    setAside: (uuids) => {
      for (let uuid of uuids) if (marked.has(uuid)) aside.add(uuid);
    },
    putBack: () => {
      aside.clear();
    },
    isAnyAside: () => aside.size > 0,
    clear: () => {
      marked.clear();
      aside.clear();
    },
  };
}
//@ chunk-5xgkngpb.js:780349-780382 placement
/**
 * 提交标记集合
 */
var submitMarks; // deferred: uses createSubmitMarks of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:780349", () => {
  submitMarks = identity_2(createSubmitMarks(), (marks) => marks.clear());
});
//@ chunk-5xgkngpb.js:780382-780468 placement
/**
 * 按回合修剪并标记
 */
function pruneAndMark(uuid, rootEvent, commandQueue) {
  if (rootEvent === "turn.start" || rootEvent === "turn.complete") {
    submitMarks.prune(commandQueue);
    submitMarks.mark(uuid);
  }
}
//@ chunk-5xgkngpb.js:780468-781490 placement
/**
 * 插件 $.prompt.submit：把一段文本作为用户提示提交给模型。
 */
function promptSubmitForPlugin(
  { text, attachments, asUser },
  plugin,
  options = {
    origin: [plugin],
  },
) {
  requireBoundSession(plugin, "$.prompt.submit");
  if (typeof text !== "string" || text.trim() === "")
    return Promise.reject(new HooksError(`${plugin}: $.prompt.submit takes { text } (a non-empty prompt)`));
  if (isSlashCommandText(text))
    return Promise.reject(
      new HooksError(
        `${plugin}: $.prompt.submit submits a prompt to the model; a text beginning with / would run a command as the user; run one with $.command.run({ command })`,
      ),
    );
  if (attachments && attachments.length > 0)
    return Promise.reject(
      new HooksError(`${plugin}: $.prompt.submit takes text alone; attachments cannot be submitted`),
    );
  let refusal = checkPromptSubmitArgs(
    {
      plugin,
      ...options,
    },
    "$.prompt.submit",
  );
  if (refusal !== undefined) return Promise.reject(new HooksError(`${plugin}: $.prompt.submit: ${refusal}`));
  let holdRefusal = submitHoldRefusal(
    {
      plugin,
      ...options,
    },
    "$.prompt.submit",
  );
  if (holdRefusal !== undefined)
    return Promise.resolve({
      drop: holdRefusal,
    });
  logForDebugging(
    `$.prompt.submit (${plugin}): ` + jsonStringify(truncateToLength(text, MAX_SESSION_TEXT_CHARS)),
  );
  let uuid = randomUUID();
  let isAsUser = asUser === true;
  let settled = waitForSubmit(uuid, options.origin);
  markSubmit(uuid, options.rootEvent);
  pruneAndMark(uuid, options.rootEvent, getCommandQueue());
  enqueue({
    agentId: mainAgentId(),
    mode: "prompt",
    value: text,
    uuid,
    priority: LATER,
    origin: isAsUser
      ? {
          kind: "plugin",
          name: plugin,
          asUser: true,
        }
      : {
          kind: "plugin",
          name: plugin,
        },
    queuedUnder: options.origin,
  });
  return settled;
}
export {
  submitMarks,
  submitMarksSlot,
  disposeDropsWaiting,
  PROMPT_SUBMIT_RULES,
  promptSubmitForPlugin,
  markSubmit,
  pruneAndMark,
  isSubmittableEvent,
  takeSubmitWaiter,
  PROMPT_NOT_PASSED,
  createSubmitChainEnds,
  ensureDrop,
};
