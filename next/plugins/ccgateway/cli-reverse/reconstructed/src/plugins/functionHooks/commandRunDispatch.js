/**
 * plugins/functionHooks/commandRunDispatch.ts
 *
 * 2.1.316 新增：斜杠命令经 command.run 钩子链分发执行，并处理中断、出队等结果
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 19
 */
import {
  createDeltaStepRecorder,
  areBuiltinModulesLoaded,
  withExitCode,
} from "../../utils/messages/toolDeltas.js";
import { releaseServerHold } from "./pluginLifecycle.js";
import { pluginCommandRegistry, commandRunResult } from "./commandHooks.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { toError } from "../../utils/errors.js";
import { sourceLabel } from "../../utils/messages/nonUserMessages.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { getCommandName as getCommandName_2 } from "../../commands.js";
import { viewportInfo } from "./surfaceBinding.js";
import { unwrapAbortReason, isSilentAbortReason } from "../../utils/abortController.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { HooksError } from "./hooksErrors.js";
import { onProcessRootHost, getRootSession } from "../../bootstrap/state.js";
import { commandsDiscarded, commandsConsumed } from "../../utils/messageQueueManager.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { createSignal, createLazySignal } from "../../utils/signal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:5200280-5201702 placement
/**
 * 斜杠命令经 command.run 钩子链执行：钩子可改写或代答，链底运行真正的命令，并记录被丢弃的答复。
 */
async function dispatchCommandRunHooks({ input, engine, queued, ahead, signal }) {
  let { core, runs } = createDeltaStepRecorder(engine);
  let joined = ahead?.join(input, core, signal);
  if (joined === undefined) await releaseServerHold(pluginCommandRegistry.ownerOf(input.command));
  let matches =
    joined === undefined
      ? pluginsMatchingEvent(
          "command.run",
          {
            command: input.command,
          },
          queued?.origin,
        )
      : await joined.hooking;
  if (!(joined !== undefined || queued?.origin !== undefined || matches.length > 0)) {
    let ran = await engine.run(input.args);
    queued?.settle(commandRunResult(engine.textOf(ran), engine.contextOf(ran)));
    return {
      kind: "engine",
      ran,
    };
  }
  let builtinsLoaded = areBuiltinModulesLoaded(matches);
  let answer;
  try {
    answer = await (joined?.answer ??
      NO_CORE_AT_CHAIN_BOTTOM("command.run", {
        core: {
          "command.run": core,
        },
        origin: queued?.origin,
        signal,
      })(input));
  } catch (error) {
    queued?.fail(toError(error));
    throw error;
  }
  let takesText = answer.text !== undefined && !builtinsLoaded;
  let pluginLabel = takesText ? matches.map(sourceLabel).join("+") : undefined;
  let text = takesText ? `${pluginLabel}: ${answer.text}` : answer.text;
  let ownRun = runs.of(answer.ref);
  let lastRun = ownRun ?? runs.last();
  let { exitCode } = answer;
  if (!lastRun) {
    queued?.settle(commandRunResult(answer.text, answer.context, exitCode));
    return withExitCode(
      {
        kind: "answered",
        text,
        plugin: pluginLabel,
        context: answer.context,
      },
      exitCode,
    );
  }
  let isTextUnchanged = text === undefined || (ownRun !== undefined && ownRun.made.text === answer.text);
  let isContextUnchanged =
    answer.context === undefined ||
    stableStringifySafe(answer.context) === stableStringifySafe(lastRun.made.context ?? []);
  let delta = {
    text: isTextUnchanged ? undefined : text,
    plugin: isTextUnchanged ? undefined : pluginLabel,
    context: isContextUnchanged ? undefined : answer.context,
  };
  let isNoChange = isTextUnchanged && isContextUnchanged;
  let retold = isNoChange ? undefined : engine.retell(lastRun.made.ran, delta);
  if (!isNoChange && retold === undefined)
    logForDebugging(
      `command.run /${input.command}: a hook's own answer after next() dropped; the command ran and its effect is not a record the answer can stand on (hooked by ${matches.join("+")})`,
    );
  let isRetold = retold !== undefined;
  let hasNewText = isRetold && delta.text !== undefined;
  let hasNewContext = isRetold && delta.context !== undefined;
  queued?.settle(
    commandRunResult(
      hasNewText ? answer.text : lastRun.made.text,
      hasNewContext ? answer.context : lastRun.made.context,
      exitCode,
    ),
  );
  return withExitCode(
    {
      kind: "engine",
      ran: retold ?? lastRun.made.ran,
    },
    exitCode,
  );
}
//@ chunk-5xgkngpb.js:5201702-5201728 placement
/**
 * command.run 的站点规则
 */
var COMMAND_RUN_SITE_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5201702", () => {
  COMMAND_RUN_SITE_RULES = UI_ENV_SITE_RULES["command.run"];
});
//@ chunk-5xgkngpb.js:5201728-5201815 placement
/**
 * 构造 command.run 事件
 */
var commandRunEvent = (command, args, presentation) => ({
  command: getCommandName_2(command),
  args,
  origin: {
    kind: "composer",
  },
  presentation: viewportInfo(presentation),
});
//@ chunk-5xgkngpb.js:5201815-5201873 placement
/**
 * 命令运行前被打断
 */
var TURN_INTERRUPTED_TEXT = "the turn was interrupted before the command ran";
//@ chunk-5xgkngpb.js:5201873-5202032 placement
/**
 * 命令被中断时的处理结果：插件排队或关闭时不留消息，静默中止只留输入，否则加中断标记；不查询模型。
 */
function interruptedCommandResult({ signal, typed, marker, isQueuedByPlugin }) {
  let reason = unwrapAbortReason(signal.reason);
  let isSilent = isQueuedByPlugin || reason === "shutdown";
  let isSilentReason = isSilentAbortReason(reason);
  return {
    messages: isSilent ? [] : isSilentReason ? typed : [...typed, marker],
    shouldQuery: false,
  };
}
//@ chunk-5xgkngpb.js:5202032-5202164 placement
var COMMAND_DID_NOT_RUN_MESSAGE =
  "the command did not go through command.run (no command of that name was enabled by then, or it was refused before it ran)";
//@ chunk-5xgkngpb.js:5202164-5202199 placement
/**
 * 命令监视状态
 */
var commandWatchState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:5202164", () => {
  commandWatchState = new HostScoped(() => ({
    watching: false,
  }));
});
//@ chunk-5xgkngpb.js:5202199-5202612 placement
/**
 * 排队命令的等待者表：按 uuid 登记，命令丢弃时以错误结算。
 */
function createQueuedCommandWaiters() {
  let waiters = new Map();
  function take(uuid) {
    let waiter = waiters.get(uuid);
    waiters.delete(uuid);
    return waiter;
  }
  function failAll(commands, reason) {
    for (let command of commands)
      if (command.uuid !== undefined) take(command.uuid)?.fail(new HooksError(reason));
  }
  return {
    record: (uuid, waiter) => {
      let watchState = onProcessRootHost(commandWatchState);
      if (!watchState.watching) {
        watchState.watching = true;
        commandsDiscarded.subscribe((commands) =>
          failAll(commands, "the command was removed from the queue before it ran"),
        );
        commandsConsumed.subscribe((commands) =>
          failAll(commands, "the command left the queue as text for the model; it did not run"),
        );
      }
      waiters.set(uuid, waiter);
    },
    take,
  };
}
//@ chunk-5xgkngpb.js:5202612-5202626 placement
/**
 * 排队命令的等待者
 */
var queuedCommandWaiters; // deferred: uses createQueuedCommandWaiters of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5202612", () => {
  queuedCommandWaiters = createQueuedCommandWaiters();
});
//@ chunk-5xgkngpb.js:5202626-5202957 placement
/**
 * 取出排队命令对应的等待者，提供 settle/fail/handOn；释放时未结算则以"未经 command.run"失败。
 */
function takeQueuedCommandWaiter(uuid) {
  let waiter = uuid === undefined ? undefined : queuedCommandWaiters.take(uuid);
  let isSettled = false;
  return {
    origin: waiter?.origin,
    settle(result) {
      isSettled = true;
      waiter?.settle(result);
    },
    fail(error) {
      isSettled = true;
      waiter?.fail(error);
    },
    handOn(signal) {
      if (isSettled || waiter === undefined || uuid === undefined) return;
      isSettled = true;
      queuedCommandWaiters.record(uuid, waiter);
      signal.addEventListener(
        "abort",
        () => {
          queuedCommandWaiters.take(uuid)?.fail(new HooksError(TURN_INTERRUPTED_TEXT));
        },
        {
          once: true,
        },
      );
    },
    [Symbol.dispose]() {
      if (!isSettled) {
        isSettled = true;
        waiter?.fail(new HooksError(COMMAND_DID_NOT_RUN_MESSAGE));
      }
    },
  };
}
//@ chunk-5xgkngpb.js:5202957-5202992 placement
/**
 * 同参命令分发表
 */
var inflightCommandRuns; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:5202957", () => {
  inflightCommandRuns = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-5xgkngpb.js:5202992-5203048 placement
/**
 * 取出进行中的同参分发
 */
function takeInflightRun(command) {
  let run = inflightCommandRuns.get(command);
  inflightCommandRuns.delete(command);
  return run;
}
//@ chunk-5xgkngpb.js:5203048-5203403 placement
/**
 * 若当前有同名同参的 command.run 分发在等，返回它以加入；释放时未加入则停止该分发。
 */
function joinCommandRunDispatch(key) {
  let run = key === undefined ? undefined : takeInflightRun(key);
  let joined = false;
  return {
    join(input, core, signal) {
      let isSameInput = run?.input.command === input.command && run.input.args === input.args;
      if (run === undefined || !isSameInput) return;
      joined = true;
      run.seat(core);
      if (signal?.aborted) run.stop(signal.reason);
      signal?.addEventListener("abort", () => run.stop(signal.reason), {
        once: true,
      });
      return run;
    },
    [Symbol.dispose]() {
      if (!joined) run?.stop("the dispatch ended without running the command");
    },
  };
}
//@ chunk-5xgkngpb.js:5203403-5203481 placement
/**
 * 等待命令结算
 */
var waitForCommandSettle = (uuid, origin) =>
  new Promise((resolve, reject) => {
    queuedCommandWaiters.record(uuid, {
      origin,
      settle: resolve,
      fail: reject,
    });
  });
//@ chunk-5xgkngpb.js:5203481-5203517 placement
/**
 * 命令集合信号 A
 */
var commandSetSignalA; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:5203481", () => {
  commandSetSignalA = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:5203517-5203553 placement
/**
 * 命令集合信号 B
 */
var commandSetSignalB; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:5203517", () => {
  commandSetSignalB = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-5xgkngpb.js:5203553-5203577 placement
/**
 * 命令运行信号槽
 */
var commandRunSignalSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:5203553", () => {
  commandRunSignalSlot = new HostScoped(() => createSignal());
});
//@ chunk-5xgkngpb.js:5203577-5203616 placement
/**
 * 取命令运行信号
 */
function commandRunSignal() {
  return commandRunSignalSlot.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:5203616-5203632 placement
/**
 * 惰性信号
 */
var lazyCommandRunSignal; // deferred: uses commandRunSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:5203616", () => {
  lazyCommandRunSignal = createLazySignal(commandRunSignal);
});
export {
  inflightCommandRuns,
  takeInflightRun,
  dispatchCommandRunHooks,
  commandRunEvent,
  COMMAND_RUN_SITE_RULES,
  waitForCommandSettle,
  lazyCommandRunSignal,
  commandSetSignalA,
  commandSetSignalB,
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
};
