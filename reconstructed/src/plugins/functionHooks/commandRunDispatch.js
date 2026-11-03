/**
 * plugins/functionHooks/commandRunDispatch.ts
 *
 * 2.1.316 新增：斜杠命令经 command.run 钩子链分发执行，并处理中断、出队等结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
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
import { commandsDiscardedSignal, commandsConsumedSignal } from "../../utils/messageQueueManager.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { createSignal, createLazySignal } from "../../utils/signal.js";

//@ chunk-e6aww6q8.js:5045155-5046561 placement
/**
 * 斜杠命令经 command.run 钩子链执行：钩子可改写或代答，链底运行真正的命令，并记录被丢弃的答复。
 */
async function dispatchCommandRunHooks({ input, engine, queued, ahead, signal }) {
  let { core, runs } = createDeltaStepRecorder(engine);
  let joined = ahead?.join(input, core, signal);
  if (joined === undefined) await releaseServerHold(pluginCommandRegistry.ownerOf(input.command));
  let L =
    joined === undefined
      ? pluginsMatchingEvent(
          "command.run",
          {
            command: input.command,
          },
          queued?.origin,
        )
      : await joined.hooking;
  if (!(joined !== undefined || queued?.origin !== undefined || L.length > 0)) {
    let gt = await engine.run(input.args);
    queued?.settle(commandRunResult(engine.textOf(gt), engine.contextOf(gt)));
    return {
      kind: "engine",
      ran: gt,
    };
  }
  let q = areBuiltinModulesLoaded(L);
  let Z;
  try {
    Z = await (joined?.answer ??
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
  let Se = Z.text !== undefined && !q;
  let ke = Se ? L.map(sourceLabel).join("+") : undefined;
  let we = Se ? `${ke}: ${Z.text}` : Z.text;
  let Ee = runs.of(Z.ref);
  let Ae = Ee ?? runs.last();
  let { exitCode } = Z;
  if (!Ae) {
    queued?.settle(commandRunResult(Z.text, Z.context, exitCode));
    return withExitCode(
      {
        kind: "answered",
        text: we,
        plugin: ke,
        context: Z.context,
      },
      exitCode,
    );
  }
  let Me = we === undefined || (Ee !== undefined && Ee.made.text === Z.text);
  let We =
    Z.context === undefined || stableStringifySafe(Z.context) === stableStringifySafe(Ae.made.context ?? []);
  let ze = {
    text: Me ? undefined : we,
    plugin: Me ? undefined : ke,
    context: We ? undefined : Z.context,
  };
  let lt = Me && We;
  let Je = lt ? undefined : engine.retell(Ae.made.ran, ze);
  if (!lt && Je === undefined)
    logForDebugging(
      `command.run /${input.command}: a hook's own answer after next() dropped; the command ran and its effect is not a record the answer can stand on (hooked by ${L.join("+")})`,
    );
  let pt = Je !== undefined;
  let Et = pt && ze.text !== undefined;
  let yt = pt && ze.context !== undefined;
  queued?.settle(commandRunResult(Et ? Z.text : Ae.made.text, yt ? Z.context : Ae.made.context, exitCode));
  return withExitCode(
    {
      kind: "engine",
      ran: Je ?? Ae.made.ran,
    },
    exitCode,
  );
}
//@ chunk-e6aww6q8.js:5046561-5046587 placement
/**
 * command.run 的站点规则
 */
var COMMAND_RUN_SITE_RULES = UI_ENV_SITE_RULES["command.run"];
//@ chunk-e6aww6q8.js:5046587-5046674 placement
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
//@ chunk-e6aww6q8.js:5046674-5046732 placement
/**
 * 命令运行前被打断
 */
var TURN_INTERRUPTED_TEXT = "the turn was interrupted before the command ran";
//@ chunk-e6aww6q8.js:5046732-5046890 placement
/**
 * 命令被中断时的处理结果：插件排队或关闭时不留消息，静默中止只留输入，否则加中断标记；不查询模型。
 */
function interruptedCommandResult({ signal, typed, marker, isQueuedByPlugin }) {
  let h = unwrapAbortReason(signal.reason);
  let y = isQueuedByPlugin || h === "shutdown";
  let S = isSilentAbortReason(h);
  return {
    messages: y ? [] : S ? typed : [...typed, marker],
    shouldQuery: false,
  };
}
//@ chunk-e6aww6q8.js:5046890-5047022 placement
var COMMAND_DID_NOT_RUN_MESSAGE =
  "the command did not go through command.run (no command of that name was enabled by then, or it was refused before it ran)";
//@ chunk-e6aww6q8.js:5047022-5047057 placement
/**
 * 命令监视状态
 */
var commandWatchState = new HostScoped(() => ({
  watching: false,
}));
//@ chunk-e6aww6q8.js:5047057-5047470 placement
/**
 * 排队命令的等待者表：按 uuid 登记，命令丢弃时以错误结算。
 */
function createQueuedCommandWaiters() {
  let e = new Map();
  function n(uuid) {
    let h = e.get(uuid);
    e.delete(uuid);
    return h;
  }
  function r(s, h) {
    for (let y of s) if (y.uuid !== undefined) n(y.uuid)?.fail(new HooksError(h));
  }
  return {
    record: (s, h) => {
      let y = onProcessRootHost(commandWatchState);
      if (!y.watching) {
        y.watching = true;
        commandsDiscardedSignal.subscribe((S) =>
          r(S, "the command was removed from the queue before it ran"),
        );
        commandsConsumedSignal.subscribe((S) =>
          r(S, "the command left the queue as text for the model; it did not run"),
        );
      }
      e.set(s, h);
    },
    take: n,
  };
}
//@ chunk-e6aww6q8.js:5047470-5047484 placement
/**
 * 排队命令的等待者
 */
var queuedCommandWaiters = createQueuedCommandWaiters();
//@ chunk-e6aww6q8.js:5047484-5047815 placement
/**
 * 取出排队命令对应的等待者，提供 settle/fail/handOn；释放时未结算则以"未经 command.run"失败。
 */
function takeQueuedCommandWaiter(e) {
  let n = e === undefined ? undefined : queuedCommandWaiters.take(e);
  let r = false;
  return {
    origin: n?.origin,
    settle(s) {
      r = true;
      n?.settle(s);
    },
    fail(s) {
      r = true;
      n?.fail(s);
    },
    handOn(s) {
      if (r || n === undefined || e === undefined) return;
      r = true;
      queuedCommandWaiters.record(e, n);
      s.addEventListener(
        "abort",
        () => {
          queuedCommandWaiters.take(e)?.fail(new HooksError(TURN_INTERRUPTED_TEXT));
        },
        {
          once: true,
        },
      );
    },
    [Symbol.dispose]() {
      if (!r) {
        r = true;
        n?.fail(new HooksError(COMMAND_DID_NOT_RUN_MESSAGE));
      }
    },
  };
}
//@ chunk-e6aww6q8.js:5047815-5047850 placement
/**
 * 同参命令分发表
 */
var inflightCommandRuns = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:5047850-5047906 placement
/**
 * 取出进行中的同参分发
 */
function takeInflightRun(e) {
  let n = inflightCommandRuns.get(e);
  inflightCommandRuns.delete(e);
  return n;
}
//@ chunk-e6aww6q8.js:5047906-5048261 placement
/**
 * 若当前有同名同参的 command.run 分发在等，返回它以加入；释放时未加入则停止该分发。
 */
function joinCommandRunDispatch(e) {
  let n = e === undefined ? undefined : takeInflightRun(e);
  let r = false;
  return {
    join(s, h, y) {
      let S = n?.input.command === s.command && n.input.args === s.args;
      if (n === undefined || !S) return;
      r = true;
      n.seat(h);
      if (y?.aborted) n.stop(y.reason);
      y?.addEventListener("abort", () => n.stop(y.reason), {
        once: true,
      });
      return n;
    },
    [Symbol.dispose]() {
      if (!r) n?.stop("the dispatch ended without running the command");
    },
  };
}
//@ chunk-e6aww6q8.js:5048261-5048339 placement
/**
 * 等待命令结算
 */
var waitForCommandSettle = (e, origin) =>
  new Promise((resolve, reject) => {
    queuedCommandWaiters.record(e, {
      origin,
      settle: resolve,
      fail: reject,
    });
  });
//@ chunk-e6aww6q8.js:5048339-5048374 placement
/**
 * 命令集合信号 A
 */
var commandSetSignalA = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:5048374-5048410 placement
/**
 * 命令集合信号 B
 */
var commandSetSignalB = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:5048410-5048434 placement
/**
 * 命令运行信号槽
 */
var commandRunSignalSlot = new HostScoped(() => createSignal());
//@ chunk-e6aww6q8.js:5048434-5048473 placement
/**
 * 取命令运行信号
 */
function commandRunSignal() {
  return commandRunSignalSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:5048473-5048489 placement
/**
 * 惰性信号
 */
var lazyCommandRunSignal = createLazySignal(commandRunSignal);
export {
  commandSetSignalA,
  commandSetSignalB,
  commandRunEvent,
  dispatchCommandRunHooks,
  lazyCommandRunSignal,
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
  inflightCommandRuns,
  COMMAND_RUN_SITE_RULES,
  waitForCommandSettle,
  takeInflightRun,
};
