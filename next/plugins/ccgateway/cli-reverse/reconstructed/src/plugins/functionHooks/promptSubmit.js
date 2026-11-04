/**
 * plugins/functionHooks/promptSubmit.ts
 *
 * 2.1.316 新增：prompt.submit 事件钩子与提交改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
 */
import { randomUUID } from "crypto";
import { MANAGED } from "./classicHookBridge.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost, mainAgentId } from "../../bootstrap/state.js";
import {
  commandsDiscardedSignal,
  commandsConsumedSignal,
  getCommandQueue,
  enqueueCommand,
} from "../../utils/messageQueueManager.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import {
  requireBoundSession,
  isSlashCommandText,
  submitHoldRefusal,
  MAX_SESSION_TEXT_CHARS,
  LATER,
} from "./sessionApi.js";
import { HooksError } from "./hooksErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:767357-767413 placement
/**
 * 钩子未放行提示
 */
var PROMPT_NOT_PASSED = "a hook answered without passing the prompt on";
//@ chunk-e6aww6q8.js:767413-767502 placement
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
//@ chunk-e6aww6q8.js:767502-767550 placement
/**
 * 批次中前一条失败
 */
var BATCH_FAILED_DROP = "an earlier prompt in the batch failed";
//@ chunk-e6aww6q8.js:767550-767606 placement
/**
 * 构造核心步骤
 */
var coreStep = (run) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run,
});
//@ chunk-e6aww6q8.js:767606-767757 placement
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
//@ chunk-e6aww6q8.js:767757-767792 placement
/**
 * 提交监视状态
 */
var submitWatchState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:767757", () => {
  submitWatchState = new HostScoped(() => ({
    watching: false,
  }));
});
//@ chunk-e6aww6q8.js:767792-768237 placement
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
        commandsDiscardedSignal.subscribe((discarded) =>
          settleEach(discarded, () => ({
            drop: "the prompt was removed from the queue before it ran",
          })),
        );
        commandsConsumedSignal.subscribe((consumed) =>
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
//@ chunk-e6aww6q8.js:768237-768251 placement
/**
 * 提交等待者
 */
var submitWaiters; // deferred: uses createSubmitWaiters of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:768237", () => {
  submitWaiters = createSubmitWaiters();
});
//@ chunk-e6aww6q8.js:768251-768326 placement
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
//@ chunk-e6aww6q8.js:768326-768767 placement
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
//@ chunk-e6aww6q8.js:768767-768795 placement
/**
 * prompt.submit 站点规则
 */
var PROMPT_SUBMIT_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:768767", () => {
  PROMPT_SUBMIT_RULES = UI_ENV_SITE_RULES["prompt.submit"];
});
//@ chunk-e6aww6q8.js:768795-768864 placement
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
//@ chunk-e6aww6q8.js:768864-768907 placement
/**
 * 取出等待者
 */
var takeSubmitWaiter = (uuid) => (uuid === undefined ? undefined : submitWaiters.take(uuid));
//@ chunk-e6aww6q8.js:768907-768952 placement
/**
 * 非 undefined 或 session.start
 */
var isSubmittableEvent = (rootEvent) => rootEvent === undefined || rootEvent === "session.start";
//@ chunk-e6aww6q8.js:768952-768987 placement
/**
 * 提交标记槽
 */
var submitMarksSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:768952", () => {
  submitMarksSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:768987-769042 placement
/**
 * 记录提交标记
 */
function markSubmit(uuid, rootEvent) {
  let marks = submitMarksSlot.get();
  if (marks && isSubmittableEvent(rootEvent)) marks.add(uuid);
}
//@ chunk-e6aww6q8.js:769042-769370 placement
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
//@ chunk-e6aww6q8.js:769370-769403 placement
/**
 * 提交标记集合
 */
var submitMarks; // deferred: uses createSubmitMarks of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:769370", () => {
  submitMarks = identity_2(createSubmitMarks(), (marks) => marks.clear());
});
//@ chunk-e6aww6q8.js:769403-769489 placement
/**
 * 按回合修剪并标记
 */
function pruneAndMark(uuid, rootEvent, commandQueue) {
  if (rootEvent === "turn.start" || rootEvent === "turn.complete") {
    submitMarks.prune(commandQueue);
    submitMarks.mark(uuid);
  }
}
//@ chunk-e6aww6q8.js:769489-770392 placement
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
  let refusal = submitHoldRefusal(
    {
      plugin,
      ...options,
    },
    "$.prompt.submit",
  );
  if (refusal !== undefined)
    return Promise.resolve({
      drop: refusal,
    });
  logForDebugging(
    `$.prompt.submit (${plugin}): ` + jsonStringify(truncateToLength(text, MAX_SESSION_TEXT_CHARS)),
  );
  let uuid = randomUUID();
  let isAsUser = asUser === true;
  let settled = waitForSubmit(uuid, options.origin);
  markSubmit(uuid, options.rootEvent);
  pruneAndMark(uuid, options.rootEvent, getCommandQueue());
  enqueueCommand({
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
  takeSubmitWaiter,
  PROMPT_NOT_PASSED,
  createSubmitChainEnds,
  ensureDrop,
  PROMPT_SUBMIT_RULES,
  markSubmit,
  pruneAndMark,
  promptSubmitForPlugin,
  isSubmittableEvent,
};
