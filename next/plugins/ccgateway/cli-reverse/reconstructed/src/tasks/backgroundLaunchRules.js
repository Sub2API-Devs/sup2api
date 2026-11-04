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
import { isPlainObject as isPlainObject_5 } from "../utils/isPlainObject.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-e6aww6q8.js:580780-581008 placement
var NO_BG_AGENT_TEXT =
  "Background agents cannot be started in this session right now. Run the agent without run_in_background.";
var NO_BG_AGENT_FALSE_TEXT =
  "Background agents cannot be started in this session right now. Run the agent with run_in_background: false.";
//@ chunk-e6aww6q8.js:581008-581041 placement
/**
 * 按是否允许后台启动返回对应说明文案。
 */
function backgroundLaunchRuleText(launchesByDefault) {
  return launchesByDefault ? NO_BG_AGENT_FALSE_TEXT : NO_BG_AGENT_TEXT;
}
//@ chunk-e6aww6q8.js:581041-581107 placement
/**
 * 读取宿主代理策略里的后台启动规则（异常返回 undefined）。
 */
function getBackgroundLaunchRule() {
  try {
    return getHostAgentPolicy().backgroundLaunchRule;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:581107-581171 placement
function remoteCancelAbortReason() {
  return getBackgroundLaunchRule() === undefined ? undefined : userAbortReason("remote-cancel");
}
//@ chunk-e6aww6q8.js:581171-581292 placement
/**
 * 安全调用 admitsWake 判断是否允许唤醒，出错时记录并返回 false。
 */
function admitsWakeSafe(backgroundLaunchRule, agentId) {
  try {
    return backgroundLaunchRule.admitsWake?.(agentId) === true;
  } catch (error) {
    logLaunchRuleError(error, "admitsWake", new AbortController().signal);
    return false;
  }
}
//@ chunk-e6aww6q8.js:581292-582618 placement
/**
 * 执行后台启动规则的 ask()/confirm()，校验返回值并处理拒绝或中止。
 */
function runBackgroundLaunchRules(rule, request) {
  let answer;
  let message;
  try {
    let admission = rule.ask(request);
    if (admission === undefined || admission === null) return;
    if (!isConfirmableLaunchAnswer(admission)) {
      Promise.resolve(admission).catch(() => {});
      logError(
        Error(
          "A background launch rule's ask() returned something other than undefined or an admission (a promise, if ask is async). The call was not admitted.",
        ),
      );
      return;
    }
    answer = admission;
    message = backgroundLaunchRuleText(rule.launchesByDefault === true);
  } catch (error) {
    logLaunchRuleError(error, "ask", request.signal);
    return;
  }
  return {
    confirm(signal) {
      try {
        let confirmation = answer.confirm(signal);
        if (confirmation === undefined) return;
        let launchRuleAnswer = parseLaunchRuleAnswer(confirmation);
        if (launchRuleAnswer?.kind === "refused") return launchRuleAnswer;
        if (launchRuleAnswer?.kind === "closed")
          return launchRuleAnswer.message.trim() === ""
            ? {
                kind: "closed",
                message,
              }
            : launchRuleAnswer;
        if (launchRuleAnswer?.kind === "aborted" && signal.aborted) return launchRuleAnswer;
        Promise.resolve(confirmation).catch(() => {});
        logError(
          launchRuleAnswer !== undefined
            ? Error(
                "A background launch rule's confirm() returned 'aborted' for a call whose signal was not aborted. The launch was refused.",
              )
            : Error(
                "A background launch rule's confirm() returned neither undefined nor a refusal. The launch was refused.",
              ),
        );
        return {
          kind: "closed",
          message,
        };
      } catch (error) {
        logLaunchRuleError(error, "confirm", signal);
        return isAbortError(error) && signal.aborted
          ? {
              kind: "aborted",
            }
          : {
              kind: "closed",
              message,
            };
      }
    },
    handOver(task) {
      try {
        let handover = answer.registered(task);
        if (handover === undefined) return true;
        Promise.resolve(handover).catch(() => {});
        logError(
          Error(
            "A background launch rule's registered() returned a value (a promise, if it is async). It must return nothing. The task was ended and the call refused.",
          ),
        );
        return false;
      } catch (error) {
        logLaunchRuleError(error, "registered", request.signal);
        return false;
      }
    },
  };
}
//@ chunk-e6aww6q8.js:582618-583524 placement
function runBackgroundMoveRules(request, isBackgrounded) {
  let rule;
  try {
    let backgroundLaunchRule = getHostAgentPolicy().backgroundLaunchRule;
    if (backgroundLaunchRule === undefined) return true;
    if (!isBackgrounded || isForegroundAgentMoveDisabled()) return false;
    rule = backgroundLaunchRule;
  } catch (error) {
    logError(
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `A foreground agent was not moved to the background: this process's tool restrictions could not be read. The read threw: ${errorMessageString(error)}`,
          "A foreground agent was not moved to the background: this process's tool restrictions could not be read.",
        ),
        {
          cause: error,
        },
      ),
    );
    return false;
  }
  try {
    let moveAnswer = rule.admitMove?.(request);
    if (moveAnswer === true || moveAnswer === false) return moveAnswer;
    Promise.resolve(moveAnswer).catch(() => {});
    logError(
      Error(
        "A background launch rule's admitMove() returned something other than true or false (a promise, if it is async). The agent stays in the foreground.",
      ),
    );
    return false;
  } catch (error) {
    logError(
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `A background launch rule's admitMove() threw, and the agent stays in the foreground. It threw: ${errorMessageString(error)}`,
          "A background launch rule's admitMove() threw, and the agent stays in the foreground.",
        ),
        {
          cause: error,
        },
      ),
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:583524-583619 placement
function errorMessageString(error) {
  try {
    return String(errorMessage(error));
  } catch {
    return "a value that could not be made a string";
  }
}
//@ chunk-e6aww6q8.js:583619-583712 placement
function isConfirmableLaunchAnswer(value) {
  return (
    isPlainObject_5(value) && typeof value.confirm === "function" && typeof value.registered === "function"
  );
}
//@ chunk-e6aww6q8.js:583712-583968 placement
function parseLaunchRuleAnswer(value) {
  if (!isPlainObject_5(value)) return;
  let { kind, message } = value;
  if (kind === "aborted")
    return {
      kind: "aborted",
    };
  if (kind === "refused" && typeof message === "string" && message.trim() !== "")
    return {
      kind: "refused",
      message,
    };
  return kind === "closed" && typeof message === "string"
    ? {
        kind: "closed",
        message,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:583968-584072 placement
function logLaunchRuleError(error, method, signal) {
  if (isAbortError(error) && signal.aborted) {
    logForDebugging(`background launch rule: ${method} aborted: ${errorMessage(error)}`);
    return;
  }
  logError(error);
}
//@ chunk-e6aww6q8.js:584072-584105 placement
var BACKGROUND_RULE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
export {
  getBackgroundLaunchRule,
  admitsWakeSafe,
  runBackgroundLaunchRules,
  backgroundLaunchRuleText,
  remoteCancelAbortReason,
  runBackgroundMoveRules,
  BACKGROUND_RULE_ID_REGEX,
};
