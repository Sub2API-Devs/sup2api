/**
 * tasks/backgroundLaunchRules.ts
 *
 * 2.1.316 新增：后台启动规则（ask/confirm）的执行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { getHostAgentPolicy } from "../utils/hostAgentPolicy.js";
import { userAbortReason } from "../utils/abortController.js";
import { logError } from "../utils/log.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { isForegroundAgentMoveDisabled } from "../tools/AgentTool/backgroundGates.js";
import { isPlainObject as isPlainObject_4 } from "../utils/isPlainObject.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-e6aww6q8.js:580780-581008 placement
var NO_BG_AGENT_TEXT =
    "Background agents cannot be started in this session right now. Run the agent without run_in_background.",
  NO_BG_AGENT_FALSE_TEXT =
    "Background agents cannot be started in this session right now. Run the agent with run_in_background: false.";
//@ chunk-e6aww6q8.js:581008-581041 placement
function bWr(e) {
  return e ? NO_BG_AGENT_FALSE_TEXT : NO_BG_AGENT_TEXT;
}
//@ chunk-e6aww6q8.js:581041-581107 placement
function D0e() {
  try {
    return getHostAgentPolicy().backgroundLaunchRule;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:581107-581171 placement
function YIt() {
  return D0e() === void 0 ? void 0 : userAbortReason("remote-cancel");
}
/**
 * 安全调用 admitsWake 判断是否允许唤醒，出错时记录并返回 false。
 */
//@ chunk-e6aww6q8.js:581171-581292 placement
function admitsWakeSafe(e, n) {
  try {
    return e.admitsWake?.(n) === !0;
  } catch (error) {
    return (logLaunchRuleError(error, "admitsWake", new AbortController().signal), !1);
  }
}
/**
 * 执行后台启动规则的 ask()/confirm()，校验返回值并处理拒绝或中止。
 */
//@ chunk-e6aww6q8.js:581292-582618 placement
function runBackgroundLaunchRules(e, n) {
  let r, s;
  try {
    let ask = e.ask(n);
    if (ask === void 0 || ask === null) return;
    if (!igo(ask)) {
      (Promise.resolve(ask).catch(() => {}),
        logError(
          Error(
            "A background launch rule's ask() returned something other than undefined or an admission (a promise, if ask is async). The call was not admitted.",
          ),
        ));
      return;
    }
    ((r = ask), (s = bWr(e.launchesByDefault === !0)));
  } catch (error) {
    logLaunchRuleError(error, "ask", n.signal);
    return;
  }
  return {
    confirm(h) {
      try {
        let confirm = r.confirm(h);
        if (confirm === void 0) return;
        let S = parseLaunchRuleAnswer(confirm);
        if (S?.kind === "refused") return S;
        if (S?.kind === "closed") return S.message.trim() === "" ? { kind: "closed", message: s } : S;
        if (S?.kind === "aborted" && h.aborted) return S;
        return (
          Promise.resolve(confirm).catch(() => {}),
          logError(
            S !== void 0
              ? Error(
                  "A background launch rule's confirm() returned 'aborted' for a call whose signal was not aborted. The launch was refused.",
                )
              : Error(
                  "A background launch rule's confirm() returned neither undefined nor a refusal. The launch was refused.",
                ),
          ),
          { kind: "closed", message: s }
        );
      } catch (error) {
        return (
          logLaunchRuleError(error, "confirm", h),
          isAbortError(error) && h.aborted ? { kind: "aborted" } : { kind: "closed", message: s }
        );
      }
    },
    handOver(h) {
      try {
        let registered = r.registered(h);
        if (registered === void 0) return !0;
        return (
          Promise.resolve(registered).catch(() => {}),
          logError(
            Error(
              "A background launch rule's registered() returned a value (a promise, if it is async). It must return nothing. The task was ended and the call refused.",
            ),
          ),
          !1
        );
      } catch (error) {
        return (logLaunchRuleError(error, "registered", n.signal), !1);
      }
    },
  };
}
//@ chunk-e6aww6q8.js:582618-583524 placement
function runBackgroundMoveRules(e, n) {
  let r;
  try {
    let backgroundLaunchRule = getHostAgentPolicy().backgroundLaunchRule;
    if (backgroundLaunchRule === void 0) return !0;
    if (!n || isForegroundAgentMoveDisabled()) return !1;
    r = backgroundLaunchRule;
  } catch (error) {
    return (
      logError(
        Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `A foreground agent was not moved to the background: this process's tool restrictions could not be read. The read threw: ${VIt(error)}`,
            "A foreground agent was not moved to the background: this process's tool restrictions could not be read.",
          ),
          { cause: error },
        ),
      ),
      !1
    );
  }
  try {
    let s = r.admitMove?.(e);
    if (s === !0 || s === !1) return s;
    return (
      Promise.resolve(s).catch(() => {}),
      logError(
        Error(
          "A background launch rule's admitMove() returned something other than true or false (a promise, if it is async). The agent stays in the foreground.",
        ),
      ),
      !1
    );
  } catch (error) {
    return (
      logError(
        Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `A background launch rule's admitMove() threw, and the agent stays in the foreground. It threw: ${VIt(error)}`,
            "A background launch rule's admitMove() threw, and the agent stays in the foreground.",
          ),
          { cause: error },
        ),
      ),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:583524-583619 placement
function VIt(e) {
  try {
    return String(errorMessage(e));
  } catch {
    return "a value that could not be made a string";
  }
}
//@ chunk-e6aww6q8.js:583619-583712 placement
function igo(e) {
  return isPlainObject_4(e) && typeof e.confirm === "function" && typeof e.registered === "function";
}
//@ chunk-e6aww6q8.js:583712-583968 placement
function parseLaunchRuleAnswer(e) {
  if (!isPlainObject_4(e)) return;
  let { kind: kind, message: message } = e;
  if (kind === "aborted") return { kind: "aborted" };
  if (kind === "refused" && typeof message === "string" && message.trim() !== "")
    return { kind: "refused", message: message };
  return kind === "closed" && typeof message === "string" ? { kind: "closed", message: message } : void 0;
}
//@ chunk-e6aww6q8.js:583968-584072 placement
function logLaunchRuleError(e, n, r) {
  if (isAbortError(e) && r.aborted) {
    logForDebugging(`background launch rule: ${n} aborted: ${errorMessage(e)}`);
    return;
  }
  logError(e);
}
//@ chunk-e6aww6q8.js:584072-584105 placement
var QIt = /^[a-zA-Z0-9_-]{1,128}$/;

export { D0e, admitsWakeSafe, runBackgroundLaunchRules, bWr, YIt, runBackgroundMoveRules, QIt };
