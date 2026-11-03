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
  MAX_SESSION_TEXT,
  LATER,
} from "./sessionApi.js";
import { HooksError } from "./hooksErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";

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
  let r = made?.drop === undefined ? undefined : made;
  return answered.drop !== undefined
    ? answered
    : (r ?? {
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
var createManagedSubmitHandler = (e, n) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(r, s) {
    let h = await e(r.text, {
      managedHooksOnly: true,
    });
    n(r.text);
    return h.drop === undefined ? s(r) : h;
  },
});
//@ chunk-e6aww6q8.js:767757-767792 placement
/**
 * 提交监视状态
 */
var submitWatchState = new HostScoped(() => ({
  watching: false,
}));
//@ chunk-e6aww6q8.js:767792-768237 placement
/**
 * 跟踪排队中的提示提交：被移出队列时以丢弃结算，以文本形式交给模型时以文本结算。
 */
function createSubmitWaiters() {
  let e = new Map();
  function n(uuid) {
    let h = e.get(uuid);
    e.delete(uuid);
    return h;
  }
  function r(s, h) {
    for (let y of s) {
      if (y.uuid === undefined) continue;
      n(y.uuid)?.settle(h(y));
    }
  }
  return {
    record: (s, h) => {
      let y = onProcessRootHost(submitWatchState);
      if (!y.watching) {
        y.watching = true;
        commandsDiscardedSignal.subscribe((S) =>
          r(S, () => ({
            drop: "the prompt was removed from the queue before it ran",
          })),
        );
        commandsConsumedSignal.subscribe((S) =>
          r(S, (w) => {
            let L = w.value;
            return {
              text:
                typeof L === "string"
                  ? L
                  : extractTextContent_2(
                      L,
                      `
`,
                    ),
            };
          }),
        );
      }
      e.set(s, h);
    },
    take: n,
    settleEach: r,
  };
}
//@ chunk-e6aww6q8.js:768237-768251 placement
/**
 * 提交等待者
 */
var submitWaiters = createSubmitWaiters();
//@ chunk-e6aww6q8.js:768251-768326 placement
/**
 * 释放时丢弃等待项
 */
var disposeDropsWaiting = (e) => ({
  [Symbol.dispose]: () => {
    submitWaiters.settleEach(e, () => ({
      drop: BATCH_FAILED_DROP,
    }));
  },
});
//@ chunk-e6aww6q8.js:768326-768767 placement
/**
 * 为 prompt.submit 构造链两端：托管钩子处理器与核心处理器（运行 UserPromptSubmit 钩子并记录每步结果）。
 */
function createSubmitChainEnds(e, perform = (r) => Promise.resolve(r)) {
  let stepRecorder = createStepRecorder();
  let s;
  let h;
  let managed = createManagedSubmitHandler(e, (L) => {
    s = L;
  });
  async function S(L) {
    h = L.context;
    let G = await e(
      L.text,
      L.text === s
        ? {
            managedHooksExcluded: true,
          }
        : {},
    );
    let q = L.context !== undefined && L.context.length > 0;
    let Se =
      G.drop === undefined
        ? {
            text: G.text,
            origin: L.origin,
            ...(q && {
              context: L.context,
            }),
          }
        : G;
    stepRecorder.keep(L.text, Se);
    return Se;
  }
  let core = coreStep(async (L) => {
    let G = await S(L);
    return G.drop === undefined ? perform(G) : G;
  });
  return {
    managed,
    core,
    runs: stepRecorder,
    arrivedContext: () => h,
  };
}
//@ chunk-e6aww6q8.js:768767-768795 placement
/**
 * prompt.submit 站点规则
 */
var PROMPT_SUBMIT_RULES = UI_ENV_SITE_RULES["prompt.submit"];
//@ chunk-e6aww6q8.js:768795-768864 placement
/**
 * 等待提交结果
 */
var waitForSubmit = (e, origin) =>
  new Promise((resolve) => {
    submitWaiters.record(e, {
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
var isSubmittableEvent = (e) => e === undefined || e === "session.start";
//@ chunk-e6aww6q8.js:768952-768987 placement
/**
 * 提交标记槽
 */
var submitMarksSlot = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:768987-769042 placement
/**
 * 记录提交标记
 */
function markSubmit(e, rootEvent) {
  let r = submitMarksSlot.get();
  if (r && isSubmittableEvent(rootEvent)) r.add(e);
}
//@ chunk-e6aww6q8.js:769042-769370 placement
/**
 * 提交标记集合：标记、查询，并按当前队列修剪。
 */
function createSubmitMarks() {
  let e = new Set();
  let n = new Set();
  return {
    mark: (r) => {
      e.add(r);
    },
    has: (r) => r !== undefined && e.has(r),
    prune: (r) => {
      let s = new Set(r.map((h) => h.uuid));
      for (let h of e) if (!s.has(h) && !n.has(h)) e.delete(h);
    },
    setAside: (r) => {
      for (let s of r) if (e.has(s)) n.add(s);
    },
    putBack: () => {
      n.clear();
    },
    isAnyAside: () => n.size > 0,
    clear: () => {
      e.clear();
      n.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:769370-769403 placement
/**
 * 提交标记集合
 */
var submitMarks = identity_2(createSubmitMarks(), (e) => e.clear());
//@ chunk-e6aww6q8.js:769403-769489 placement
/**
 * 按回合修剪并标记
 */
function pruneAndMark(e, rootEvent, commandQueue) {
  if (rootEvent === "turn.start" || rootEvent === "turn.complete") {
    submitMarks.prune(commandQueue);
    submitMarks.mark(e);
  }
}
//@ chunk-e6aww6q8.js:769489-770392 placement
/**
 * 插件 $.prompt.submit：把一段文本作为用户提示提交给模型。
 */
function promptSubmitForPlugin(
  { text, attachments, asUser },
  plugin,
  h = {
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
  let y = submitHoldRefusal(
    {
      plugin,
      ...h,
    },
    "$.prompt.submit",
  );
  if (y !== undefined)
    return Promise.resolve({
      drop: y,
    });
  logForDebugging(`$.prompt.submit (${plugin}): ` + jsonStringify(truncateToLength(text, MAX_SESSION_TEXT)));
  let S = randomUUID();
  let w = asUser === true;
  let L = waitForSubmit(S, h.origin);
  markSubmit(S, h.rootEvent);
  pruneAndMark(S, h.rootEvent, getCommandQueue());
  enqueueCommand({
    agentId: mainAgentId(),
    mode: "prompt",
    value: text,
    uuid: S,
    priority: LATER,
    origin: w
      ? {
          kind: "plugin",
          name: plugin,
          asUser: true,
        }
      : {
          kind: "plugin",
          name: plugin,
        },
    queuedUnder: h.origin,
  });
  return L;
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
