/**
 * utils/codeMode/sessionResume.ts
 *
 * Code 模式会话恢复：从 transcript 路径判定 resume 来源、依据消息推断 session 是否在用 Code 模式、生成无法恢复/被拒绝的原因文案，并应用恢复计划（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2jkha5en.js (14)
 * attribution: placement 14
 */
import { resolve, relative, sep, isAbsolute, join } from "path";
import {
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
} from "../messages.js";
import { isEvalToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import {
  CODE_MODE_ONLY_TOOLS,
  isCodeModeEnabled,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isReplTypedEventsOn, pinReplTypedEvents } from "./typedEvents.js";
import {
  snapshotSessionMetadata,
  restoreSessionMetadata,
  queueSessionMetadataEntry,
  getProjectsDir,
} from "../sessionStorage.js";
import { getSessionId, clearSystemPromptSectionState } from "../../bootstrap/state.js";
import { jobsDir, JOB_PARENT_TRANSCRIPT_FILE } from "../../services/daemon/jobState.js";
import { isValidKeySegment } from "../storage/storageSpaces.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { danglingReceipts, lostEvalText } from "./lostEvals.js";
import {
  CODE_MODE_LABEL,
  CODE_MODE_EXPERIMENTAL_LABEL,
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE,
} from "../../constants/codeMode.js";
import {
  codeModeBeforePin,
  sandboxHostListsBlockCodeMode,
  setReplConversationResumed,
  unpinCodeMode,
  pinCodeMode,
} from "../codeMode.js";
import {
  refusalReasonText,
  getForesightState,
  codeModeEnvHint,
  isNotWindows,
  getForeseenWhy,
} from "../foresightStatus.js";
import { isSafeIdSegment_2 } from "../agentId.js";
import { CLAUDE_OPUS_5_5_CONFIG } from "../model/configs.js";
import { isAccepted } from "./accepted.js";
import { assertResumeNotRefused } from "../transcript/deserialize.js";

//@ chunk-2jkha5en.js:13532-13638 placement
/**
 * 无此工具的报错前缀与 repl-output/已派发行的识别正则，用于分析历史消息。
 */
var NO_SUCH_TOOL_PREFIX = "<tool_use_error>Error: No such tool available: ";
var REPL_RESULT_LEAD_RE = /^\s*(?:<repl-output[\s>]|\(dispatched #\d+\))/;
//@ chunk-2jkha5en.js:13638-14139 placement
/**
 * 扫描历史工具结果，分出 REPL 结果与“本池内”调用的 tool_use_id 集合。
 */
function collectReplResults(messages) {
  let replResult = new Set();
  let inPool = new Set();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message?.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_result") continue;
      let content = typeof block.content === "string" ? block.content : block.content?.[0];
      let text =
        typeof content === "string"
          ? content
          : content?.type === "text" && typeof content.text === "string"
            ? content.text
            : "";
      if (block.is_error !== true) {
        if (REPL_RESULT_LEAD_RE.test(text)) replResult.add(block.tool_use_id);
        inPool.add(block.tool_use_id);
        continue;
      }
      if (
        !text.startsWith(NO_SUCH_TOOL_PREFIX) &&
        text !== INTERRUPT_MESSAGE_FOR_TOOL_USE &&
        text !== TOOL_CALL_SESSION_ENDED &&
        text !== TOOL_RESULT_NOT_IN_COPY
      )
        inPool.add(block.tool_use_id);
    }
  }
  return {
    replResult,
    inPool,
  };
}
//@ chunk-2jkha5en.js:14139-14436 placement
/**
 * 按 REPL/池内工具名与结果配对，判定会话此前是否在 Code 模式里跑过。
 */
function hasReplToolCall(messages) {
  let { replResult, inPool } = collectReplResults(messages);
  let found;
  for (let message of messages) {
    if (message.type !== "assistant" || message.isVirtual) continue;
    let content = message.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (block.type !== "tool_use") continue;
      if (isEvalToolName(block.name) && replResult.has(block.id)) found = true;
      else if (CODE_MODE_ONLY_TOOLS.has(block.name) && inPool.has(block.id)) found = false;
    }
  }
  return found;
}
//@ chunk-2jkha5en.js:14436-14633 placement
/**
 * 写入 repl-mode 设置与一条 repl-mode 事件，值未变时跳过。
 */
function syncReplMode(replMode) {
  let typedEvents = replMode && isReplTypedEventsOn();
  let current = snapshotSessionMetadata();
  if (current.replMode === replMode && (current.replTypedEvents === true) === typedEvents) return;
  restoreSessionMetadata({
    replMode,
    replTypedEvents: typedEvents,
  });
  queueSessionMetadataEntry({
    type: "repl-mode",
    replMode,
    ...(typedEvents && {
      typedEvents: true,
    }),
    sessionId: getSessionId(),
  });
}
//@ chunk-2jkha5en.js:14633-14700 placement
/**
 * 按当前会话状态记录 Code 模式接受状态。
 */
function settleReplMode(force = false) {
  let enabled = isCodeModeEnabled();
  if (enabled || force || snapshotSessionMetadata().replMode !== undefined) syncReplMode(enabled);
}
//@ chunk-2jkha5en.js:14700-14967 placement
/**
 * 由 transcript 路径判定是 store 还是普通文件来源（相对原始 cwd 或 projects 目录判断）。
 */
function classifyArtifactPath(path) {
  let relativePath = resolve(path);
  let resolved = relative(getProjectsDir(), relativePath);
  if (resolved !== "" && resolved !== ".." && !resolved.startsWith(`..${sep}`) && !isAbsolute(resolved))
    return "store";
  let expanded = relative(jobsDir(), relativePath);
  if (isAbsolute(expanded)) return "file";
  let segments = expanded.split(sep);
  return segments.length === 1 + JOB_PARENT_TRANSCRIPT_FILE.length &&
    isValidKeySegment(segments[0]) &&
    JOB_PARENT_TRANSCRIPT_FILE.every((expected, index) => segments[index + 1] === expected) &&
    relativePath === join(resolve(jobsDir()), ...segments)
    ? "store"
    : "file";
}
//@ chunk-2jkha5en.js:14967-14998 placement
/**
 * 由会话状态推出 Code 模式恢复计划的入口。
 */
function lastCall(messages, turn) {
  return replModeAdvice(messages, turn);
}
//@ chunk-2jkha5en.js:14998-15510 placement
/**
 * 拼出“本会话已不在 Code 模式”的提醒文案，列出丢失的 eval。
 */
function refusedToolReminder(value, session) {
  return [
    value,
    `Do not call ${REPL_TOOL_NAME} or ${POLL}. They may still be in your tool list, but every call to them is refused. Disregard their descriptions, including the statement that you have no other tools.`,
    "Use your other tools instead.",
    "The variables and functions that your earlier scripts defined are gone.",
    ...danglingReceipts(session).map((entry) => lostEvalText(entry.evalId)),
    `If this conversation later continues in a session that gives you no tools other than ${REPL_TOOL_NAME} and ${POLL}, ${CODE_MODE_LABEL} is on there: disregard this reminder.`,
  ].join(`
- `);
}
//@ chunk-2jkha5en.js:15510-16241 placement
/**
 * 按 sdkUrlWorker/replMode 与 opt-in 状态计算恢复计划：pin/unpin/切换或在不可用时给出拒绝原因。
 */
function replModeAdvice(state, notify) {
  let forced = codeModeBeforePin() && !sandboxHostListsBlockCodeMode();
  if (!forced && state.sdkUrlWorker !== true)
    return {
      pin: undefined,
      switched: false,
      ...(state.replMode === true && resumeHint(state)),
    };
  let replMode = state.replMode ?? replModeFromMessages(state.messages) ?? false;
  let enabled = isCodeModeEnabled();
  if (!replMode) {
    if (!forced)
      return {
        pin: undefined,
        switched: false,
      };
    notify(
      `${CODE_MODE_LABEL} is on, but this session isn't using it, so it continues with the ordinary tools. New sessions use ${CODE_MODE_LABEL}.`,
    );
    return enabled
      ? {
          pin: false,
          switched: true,
        }
      : {
          pin: undefined,
          switched: false,
        };
  }
  if (forced)
    return enabled
      ? {
          pin: undefined,
          switched: false,
        }
      : {
          pin: undefined,
          unpin: true,
          switched: true,
        };
  let message = `This session was started in ${CODE_MODE_EXPERIMENTAL_LABEL}, which isn't available where it runs now. It continues with the ordinary tools and stays out of ${CODE_MODE_LABEL} from now on.`;
  notify(message);
  return {
    pin: undefined,
    switched: false,
    declined: true,
    takenOut: {
      notice: message,
      reminder: refusedToolReminder(`${CODE_MODE_LABEL} is off in this session.`, state.messages),
    },
  };
}
//@ chunk-2jkha5en.js:16241-16285 placement
/**
 * 容错包装的会话模式推断。
 */
function replModeFromMessages(messages) {
  try {
    return hasReplToolCall(messages);
  } catch {
    return;
  }
}
//@ chunk-2jkha5en.js:16285-16439 placement
/**
 * 把拒绝原因代码翻成短语（组织设置不允许、用户未开启、不可用原因）。
 */
function refusalPhrase(why) {
  return why === "admin"
    ? "your organization's settings don't allow"
    : why === "declined"
      ? "you chose not to turn on"
      : `isn't available because ${refusalReasonText(why)}`;
}
//@ chunk-2jkha5en.js:16439-18374 placement
/**
 * 生成“本会话开始于 Code 模式但此处无法恢复”的完整说明与 refusedWhy 代码，含 --resume/--model 的续跑提示。
 */
function resumeHint(state) {
  let current = getForesightState();
  let sessionLead = `This session was started in ${CODE_MODE_EXPERIMENTAL_LABEL}`;
  let cannotResume = (phrase) => `${sessionLead}, which ${phrase}, so it can't be resumed.`;
  let resumableSessionId =
    state.source === "store" && isSafeIdSegment_2(state.sessionId) ? state.sessionId : undefined;
  let withinSession = state.withinSession === true ? "exit and " : "";
  let headline = `${sessionLead}, which ${refusalPhrase("entrypoint")}, so it can't be resumed here.${resumableSessionId === undefined ? "" : ` Resume it in the terminal: ${codeModeEnvHint(1, `--resume ${resumableSessionId}`)}`}`;
  let lines = (line) => ({
    refused:
      line === "entrypoint"
        ? headline
        : `${cannotResume(refusalPhrase(line))}${resumableSessionId === undefined ? "" : line === "declined" ? ` To resume it, ${withinSession}${codeModeEnvHint(1, `--resume ${resumableSessionId}`, "step")} and choose Yes.` : line === "model" ? ` To resume it with Opus 5.5, ${withinSession}${codeModeEnvHint(1, `--model ${CLAUDE_OPUS_5_5_CONFIG.firstParty} --resume ${resumableSessionId}`, "step")}.` : ""}`,
    refusedWhy: `opt_in_refused_${line}`,
  });
  if (current.state === "refused") return lines(current.why);
  if (current.state === "on")
    return {
      refused: `${sessionLead}, which can't be turned on again until you quit Claude Code, so it can't be resumed here. To resume it, quit and ${resumableSessionId === undefined ? `start Claude Code again with ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE}=1 set` : codeModeEnvHint(1, `--resume ${resumableSessionId}`, "step")}.`,
      refusedWhy: "opt_in_on_but_mode_unavailable",
    };
  if (current.turnedOffIn === "managed")
    return {
      refused: cannotResume(refusalPhrase("admin")),
      refusedWhy: "opt_in_off_managed",
    };
  if (current.turnedOffIn === "settings")
    return {
      refused: `${cannotResume(`${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} in your settings turns off`)} To resume it, remove that value (from ~/.claude/settings.json, ~/.claude.json or the file given to --settings) and set the variable to 1 in your shell or in ~/.claude/settings.json.`,
      refusedWhy: "opt_in_off_settings",
    };
  let notice =
    resumableSessionId === undefined
      ? `To resume it, ${withinSession}start Claude Code with ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE}=1 set.`
      : isNotWindows()
        ? `To resume it, ${withinSession}run:
  ${codeModeEnvHint(1, `--resume ${resumableSessionId}`)}`
        : `To resume it, ${withinSession}${codeModeEnvHint(1, `--resume ${resumableSessionId}`)}.`;
  if (current.turnedOffIn === "shell")
    return {
      refused: `${sessionLead}, but ${CLAUDE_CODE_EXPERIMENTAL_CODE_MODE} in your shell turns ${CODE_MODE_LABEL} off, so it can't be resumed.
${notice}`,
      refusedWhy: "opt_in_off_shell",
    };
  if (state.headless === true)
    return {
      refused: headline,
      refusedWhy: "not_asked_headless",
    };
  let tip = `${cannotResume("is off")}
${notice}`;
  if (resumableSessionId === undefined)
    return {
      refused: tip,
      refusedWhy: "not_from_store",
    };
  let nextSteps = getForeseenWhy();
  if (nextSteps !== undefined && nextSteps !== "unknown") return lines(nextSteps);
  return {
    refused: tip,
    refusedWhy: "not_asked",
  };
}
//@ chunk-2jkha5en.js:18374-18530 placement
/**
 * 会话在 Code 模式下时返回“无法搬到云端”的说明。
 */
function cloudResumeRefusal() {
  return isAccepted() && isCodeModeEnabled()
    ? `This session was started in ${CODE_MODE_EXPERIMENTAL_LABEL}, which the move to the cloud can't carry yet, so it can't continue in the cloud.`
    : undefined;
}
//@ chunk-2jkha5en.js:18530-18672 placement
/**
 * 应用恢复计划：写回 repl-mode、pin/unpin 与 typedEvents，状态变化时通知。
 */
function applyReplModePin(decision) {
  assertResumeNotRefused(decision);
  setReplConversationResumed(true);
  let before = isCodeModeEnabled();
  if (decision.unpin) unpinCodeMode();
  else if (decision.pin !== undefined) pinCodeMode(decision.pin);
  pinReplTypedEvents(decision.typedEvents === true);
  if (isCodeModeEnabled() !== before) clearSystemPromptSectionState("resume");
}
export { applyReplModePin, cloudResumeRefusal, lastCall, settleReplMode, classifyArtifactPath };
