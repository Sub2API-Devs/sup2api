/**
 * bridge/projectsReplyEvaluation.ts
 *
 * 2.1.316 新增。Projects 线程回复闸门：本回合没回复项目线程时要求模型补回复或声明无需回复。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pzvrh90y.js (1), chunk-wrdsh6q8.js (19)
 * attribution: placement 20
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { aliasCanonicalNames, HEARTHBOT } from "../services/mcp/ccrMetaMcp.js";
import { buildMcpToolName, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  stringSchema,
  int,
  objectSchema,
  array,
  booleanSchema,
  record,
  unknown,
} from "../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../utils/json.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { isCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { withDeadline } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { analyzeTurnTail } from "../utils/turnOrigin.js";
import {
  PROJECTS_REPLY_GATE_PREFIX,
  isHarnessMetaMessage,
  getLastAssistantMessage,
  SYNTHETIC_MODEL,
} from "../utils/messages.js";
import { countWhere } from "../utils/collections.js";
import { isTaskNotificationOrigin } from "../utils/backgroundSessionResume.js";
import { restoredTaskMarkSymbol } from "../utils/messageKinds.js";
import { matchesToolName } from "../Tool.js";
import { parseExternalEventWake, isSessionInboxWake } from "../utils/externalEventWake.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-pzvrh90y.js:226-254 placement
var NO_REPLY_SUFFIX = "__no_reply_needed";
//@ chunk-wrdsh6q8.js:913-948 placement
var TENGU_RC_THREAD_REPLY_GATE = "tengu_rc_thread_reply_gate";
//@ chunk-wrdsh6q8.js:948-978 placement
function isProjectsReplyGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RC_THREAD_REPLY_GATE, true);
}
//@ chunk-wrdsh6q8.js:978-1822 placement
/**
 * Projects 回复闸门的常量与参数 schema：no_reply_needed 工具名、每类追问上限 4、以及 terminal_tools/ask_text/status_nudge 等字段的 zod 校验。
 */
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS; // deferred: uses buildMcpToolName (../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS;
var mapped;
var NO_REPLY_NEEDED_TOOL_NAME;
var RC_OWNER;
var MAX_ASKS_AFTER_PERSON;
var MAX_TERMINAL_TOOLS;
var projectsReplyGateParamsSchema;
var WAIT_SECONDS_SLACK;
var waitInputSchema;
var trimmedPromptSchema;
deferInit("chunk-wrdsh6q8.js:978", () => {
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = 5000;
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS = 1000;
  mapped = aliasCanonicalNames([
    "reply",
    "no_reply_needed",
    "post_message",
    "react",
    "update_message",
    "update_status",
  ]).map((toolName) => buildMcpToolName(HEARTHBOT, toolName));
  NO_REPLY_NEEDED_TOOL_NAME = buildMcpToolName(HEARTHBOT, "no_reply_needed");
  RC_OWNER = "rc_owner";
  MAX_ASKS_AFTER_PERSON = 4;
  MAX_TERMINAL_TOOLS = 64;
  projectsReplyGateParamsSchema = DoctorLazy(() => {
    let toolName = stringSchema().min(1).max(256);
    let askText = stringSchema().trim().min(1).max(4096);
    let maxAsks = int().min(0).max(MAX_ASKS_AFTER_PERSON);
    return objectSchema({
      terminal_tools: array(toolName).min(1).max(MAX_TERMINAL_TOOLS),
      ask_text: askText,
      max_asks_after_person: maxAsks,
      max_asks_after_server_event: maxAsks,
      max_asks_after_own_task: maxAsks.optional(),
      skip_while_worker_out: booleanSchema().optional(),
      max_asks_after_error: maxAsks.optional(),
      ask_texts_after_error: record(toolName, askText)
        .refine((askTexts) => Object.keys(askTexts).length <= MAX_TERMINAL_TOOLS)
        .optional(),
      skip_retry_while_server_down: booleanSchema().optional(),
      status_nudge: unknown().optional(),
      prompt_reminder: unknown().optional(),
    });
  });
  WAIT_SECONDS_SLACK = 60;
  waitInputSchema = DoctorLazy(() =>
    objectSchema({
      seconds: int().min(1).max(86400),
      visible_tools: array(stringSchema().min(1).max(128)).min(1).max(32),
      text: stringSchema().trim().min(1).max(2048),
    }),
  );
  trimmedPromptSchema = DoctorLazy(() => stringSchema().trim().min(1).max(2048));
});
//@ chunk-wrdsh6q8.js:1822-3060 placement
/**
 * 解析项目回复闸门策略 JSON（终端工具、发问上限、状态提示等），非法字段给出路径。
 */
function parseReplyGatePolicy(raw) {
  let parsed = projectsReplyGateParamsSchema().safeParse(safeParseJSON(raw, false));
  if (!parsed.success)
    return {
      invalidField: (parsed.error.issues[0]?.path ?? [])
        .filter((segment, segmentIndex) => segmentIndex === 0 || typeof segment === "number")
        .join("."),
    };
  let statusNudge = waitInputSchema().safeParse(parsed.data.status_nudge);
  let promptReminder = trimmedPromptSchema().safeParse(parsed.data.prompt_reminder);
  return {
    policy: {
      terminalTools: parsed.data.terminal_tools,
      askText: parsed.data.ask_text,
      maxAsksAfterPerson: parsed.data.max_asks_after_person,
      maxAsksAfterServerEvent: parsed.data.max_asks_after_server_event,
      ...(parsed.data.max_asks_after_own_task !== undefined && {
        maxAsksAfterOwnTask: parsed.data.max_asks_after_own_task,
      }),
      ...(parsed.data.skip_while_worker_out !== undefined && {
        skipWhileWorkerOut: parsed.data.skip_while_worker_out,
      }),
      ...(parsed.data.max_asks_after_error !== undefined && {
        maxAsksAfterError: parsed.data.max_asks_after_error,
      }),
      ...(parsed.data.ask_texts_after_error !== undefined && {
        askTextsAfterError: new Map(Object.entries(parsed.data.ask_texts_after_error)),
      }),
      ...(parsed.data.skip_retry_while_server_down !== undefined && {
        skipRetryWhileServerDown: parsed.data.skip_retry_while_server_down,
      }),
      ...(statusNudge.success && {
        statusNudge: {
          seconds: Math.max(WAIT_SECONDS_SLACK, statusNudge.data.seconds),
          visibleTools: statusNudge.data.visible_tools,
          text: statusNudge.data.text,
        },
      }),
      ...(promptReminder.success && {
        promptReminder: promptReminder.data,
      }),
    },
    unreadBlocks: [
      ...(parsed.data.status_nudge !== undefined && !statusNudge.success ? ["status_nudge"] : []),
      ...(parsed.data.prompt_reminder !== undefined && !promptReminder.success ? ["prompt_reminder"] : []),
    ],
  };
}
//@ chunk-wrdsh6q8.js:3060-3358 placement
/**
 * 策略被忽略时的说明文案。
 */
function replyGatePolicyIgnoredLine(name, problem) {
  let why =
    "longerThan" in problem
      ? `its text is over the limit of ${problem.longerThan} characters`
      : problem.invalidField === ""
        ? "it is not a JSON object"
        : `its ${problem.invalidField} is missing or invalid`;
  return `ignoring ${name}: ${why}, so Claude will not be re-prompted when a turn ends without a reply tool call`;
}
//@ chunk-wrdsh6q8.js:3358-3456 placement
var TASK_LIKE_TOOLS; // deferred: uses AGENT (../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var TURN_ENDING_STOP_REASONS;
deferInit("chunk-wrdsh6q8.js:3358", () => {
  TASK_LIKE_TOOLS = [AGENT, TASK, WORKFLOW_TOOL_NAME];
  TURN_ENDING_STOP_REASONS = new Set([
    "max_tokens",
    "model_context_window_exceeded",
    "pause_turn",
    "refusal",
  ]);
});
//@ chunk-wrdsh6q8.js:3456-3569 placement
function isProjectsReplyMountConnected(appState) {
  let found = appState.mcp.clients.find((client) => client.name === HEARTHBOT);
  return found !== undefined && found.type === "connected" && isCliOwnedConfig(found.config);
}
//@ chunk-wrdsh6q8.js:3569-3781 placement
async function joinProjectsMountBeforeFirstCommand(mountJoined, getAppState, waitMs) {
  if (!isProjectsReplyGateEnabled()) return;
  let startTime = performance.now();
  let settled = await withDeadline(
    mountJoined.then(() => true),
    waitMs,
  );
  logEvent("tengu_bridge_projects_mount_wait", {
    waited_ms: Math.round(performance.now() - startTime),
    settled: settled === true,
    connected: isProjectsReplyMountConnected(getAppState()),
  });
}
//@ chunk-wrdsh6q8.js:3781-3955 placement
function isUnansweredProjectsRun(messages) {
  let decider = analyzeTurnTail(messages).decider;
  let deciderMessage = decider === null ? undefined : messages[decider.index];
  if (decider === null || deciderMessage === undefined) return false;
  return (
    (getMetaUserText(deciderMessage)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true ||
      isPersonAuthoredTurn(deciderMessage)) &&
    !findErroredReplyCall(messages.slice(decider.index + 1), mapped).answered
  );
}
//@ chunk-wrdsh6q8.js:3955-5863 placement
/**
 * 判定本次轮次结束后是否要提醒 Claude 回复：已回答/跳过/仍静默/发提醒，含发问上限计数。
 */
function evaluateProjectsReplyGate(messages, incomingMessages, policy, onVerdict) {
  let decider = analyzeTurnTail(messages).decider;
  let askCount = 0;
  let cursor = decider;
  while (cursor !== null) {
    let message = messages[cursor.index];
    if (getMetaUserText(message)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true) askCount++;
    else if (policy.kind !== "policy" || message === undefined || !isHarnessMetaMessage(message)) break;
    cursor = analyzeTurnTail(messages.slice(0, cursor.index)).decider;
  }
  let openingMessage = cursor === null ? undefined : messages[cursor.index];
  let opener = openerKind(openingMessage, cursor);
  let personOpened = opener === "person";
  let askCap = maxAsksForReplyGate(policy, openingMessage, opener);
  if (askCount === 0 && askCap === 0) {
    onVerdict?.({
      verdict: "skip",
      why: "not_held",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  let tailMessages = [...messages.slice(decider === null ? 0 : decider.index + 1), ...incomingMessages];
  if (!tailMessages.some(isRealAssistantMessage)) {
    onVerdict?.({
      verdict: "skip",
      why: "no_completion",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  let consideredMessages =
    policy.kind === "policy"
      ? [...messages.slice(cursor === null ? 0 : cursor.index + 1), ...incomingMessages]
      : tailMessages;
  let { answered, noReplyOnly, erroredTerminalTool, firstErroredAt } = findErroredReplyCall(
    consideredMessages,
    policy.kind === "policy" ? policy.policy.terminalTools : mapped,
  );
  if (answered) {
    onVerdict?.({
      verdict: "answered",
      opener,
    });
    return {
      kind: "answered",
      noReplyOnly,
      personOpened,
    };
  }
  if (policy.kind === "policy" && policy.replMode === true) {
    onVerdict?.({
      verdict: "skip",
      why: "repl_mode",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  if (
    policy.kind === "policy" &&
    (getLastAssistantMessage(incomingMessages)?.isApiErrorMessage === true ||
      TURN_ENDING_STOP_REASONS.has(
        tailMessages.findLast(isRealAssistantMessage)?.message.stop_reason ?? null,
      ))
  ) {
    onVerdict?.({
      verdict: "skip",
      why: "unclean_stop",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  if (
    policy.kind === "policy" &&
    policy.policy.skipWhileWorkerOut === true &&
    policy.coordinatorMode === true &&
    policy.workerStillRunning === true &&
    (opener === "own_task" ||
      (cursor !== null && findErroredReplyCall(consideredMessages, TASK_LIKE_TOOLS).answered))
  ) {
    onVerdict?.({
      verdict: "skip",
      why: "worker_out",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  let reason = erroredTerminalTool !== undefined ? "reply_errored" : "silent_turn";
  let askBudget =
    policy.kind === "policy" && policy.policy.maxAsksAfterError !== undefined && firstErroredAt !== undefined
      ? {
          used: countWhere(
            consideredMessages.slice(firstErroredAt + 1),
            (message) => getMetaUserText(message)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true,
          ),
          cap: policy.policy.maxAsksAfterError,
          cap_of: "after_error",
        }
      : {
          used: askCount,
          cap: askCap,
          cap_of: "opener",
        };
  let capReached =
    askBudget.used >= askBudget.cap
      ? askBudget
      : askCount >= MAX_ASKS_AFTER_PERSON
        ? {
            used: askCount,
            cap: MAX_ASKS_AFTER_PERSON,
            cap_of: "turn",
          }
        : undefined;
  if (capReached !== undefined && askCount === 0) {
    onVerdict?.({
      verdict: "skip",
      why: "no_ask_after_error",
      opener,
    });
    return {
      kind: "skip",
    };
  }
  if (capReached !== undefined) {
    onVerdict?.({
      verdict: "still_silent",
      reason,
      opener,
      ...capReached,
    });
    return {
      kind: "still_silent",
      reason,
      personOpened,
    };
  }
  onVerdict?.({
    verdict: "bounce",
    reason,
    opener,
    ...askBudget,
  });
  return {
    kind: "bounce",
    reason,
    text: `${PROJECTS_REPLY_GATE_PREFIX} ${replyGateBounceText(policy, erroredTerminalTool)}`,
    personOpened,
  };
}
//@ chunk-wrdsh6q8.js:5863-6155 placement
/**
 * 回复闸门允许的追问次数
 */
function maxAsksForReplyGate(policy, openingMessage, kind) {
  switch (policy.kind) {
    case "remote_control":
      return openingMessage !== undefined && isPersonAuthoredTurn(openingMessage) ? 1 : 0;
    case "policy":
      switch (kind) {
        case "person":
          return policy.policy.maxAsksAfterPerson;
        case "own_task":
          return policy.policy.maxAsksAfterOwnTask ?? policy.policy.maxAsksAfterServerEvent;
        case "other":
          return policy.policy.maxAsksAfterServerEvent;
      }
  }
}
//@ chunk-wrdsh6q8.js:6155-6300 placement
function openerKind(message, tail) {
  if (message !== undefined && (tail?.userDriven === true || isProjectsUserTurn(message))) return "person";
  return isTaskNotificationOrigin(
    tail?.origin,
    message?.type === "user" ? message[restoredTaskMarkSymbol] : undefined,
  )
    ? "own_task"
    : "other";
}
//@ chunk-wrdsh6q8.js:6300-6528 placement
/**
 * 终止工具是否全是不可用的 MCP 工具且对应 server 已失败/需认证/停用。
 */
function areTerminalToolServersDown(policy, tools, servers) {
  let downServers = servers.filter(
    (server) => server.type === "failed" || server.type === "needs-auth" || server.type === "disabled",
  );
  let terminalTools = tools.filter((tool) =>
    policy.terminalTools.some((terminalTool) => matchesToolName(tool, terminalTool)),
  );
  return (
    terminalTools.length > 0 &&
    terminalTools.every(
      (tool) => tool.isMcp === true && downServers.some((server) => isToolFromMcpServer(tool, server.name)),
    )
  );
}
//@ chunk-wrdsh6q8.js:6528-7212 placement
/**
 * 回复闸门要求模型重新回复时的提示文本
 */
function replyGateBounceText(policy, erroredTerminalTool) {
  switch (policy.kind) {
    case "remote_control":
      return erroredTerminalTool !== undefined
        ? `Your \`${erroredTerminalTool}\` call this turn returned an error, so nothing reached the project thread. Call \`${policy.toolNames.reply}\` again with what the thread should see, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`
        : `Your last turn ended without a terminal \`mcp__${HEARTHBOT}__*\` tool call, so nothing reached the project thread: plain text is not delivered there. Call \`${policy.toolNames.reply}\` now with what the thread should see, \`${policy.toolNames.status}\` if you dispatched work that reports back later, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`;
    case "policy":
      return (
        (erroredTerminalTool !== undefined
          ? policy.policy.askTextsAfterError?.get(erroredTerminalTool)
          : undefined) ?? policy.policy.askText
      );
  }
}
//@ chunk-wrdsh6q8.js:7212-7276 placement
function isRealAssistantMessage(message) {
  return message.type === "assistant" && message.message.model !== SYNTHETIC_MODEL;
}
//@ chunk-wrdsh6q8.js:7276-7391 placement
function getMetaUserText(message) {
  return message?.type === "user" && message.isMeta === true && typeof message.message.content === "string"
    ? message.message.content
    : undefined;
}
//@ chunk-wrdsh6q8.js:7391-7619 placement
/**
 * 是否为人发起的 Projects 回合或 rc_owner 发送者
 */
function isPersonAuthoredTurn(message) {
  if (isProjectsUserTurn(message)) return true;
  if (message.type !== "user") return false;
  let content = message.message.content;
  let text =
    typeof content === "string" ? content : content[0]?.type === "text" ? content[0].text : undefined;
  if (text === undefined) return false;
  let externalEventWake = parseExternalEventWake(text);
  return (
    externalEventWake !== null &&
    isSessionInboxWake(externalEventWake) &&
    externalEventWake.data.sender_kind === RC_OWNER
  );
}
//@ chunk-wrdsh6q8.js:7619-7776 placement (2.1.88 match: buildTranscriptEntries, 0.788)
/**
 * 消息或排队命令是否标为 projectsUserTurn
 */
function isProjectsUserTurn(message) {
  return message.type === "attachment"
    ? message.attachment.type === "queued_command" && message.attachment.projectsUserTurn === true
    : message.type === "user" && message.projectsUserTurn === true;
}
//@ chunk-wrdsh6q8.js:7776-8384 placement
/**
 * 找本回合返回错误的回复工具调用
 */
function findErroredReplyCall(messages, terminalTools) {
  let erroredToolUseIds = new Set();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block.type === "tool_result" && block.is_error === true) erroredToolUseIds.add(block.tool_use_id);
  }
  let noReplyOnly = false;
  let erroredTerminalTool;
  let firstErroredAt;
  for (let [index, message] of messages.entries()) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || !terminalTools.includes(block.name)) continue;
      if (erroredToolUseIds.has(block.id)) {
        erroredTerminalTool = block.name;
        firstErroredAt ??= index;
        continue;
      }
      if (!block.name.endsWith(NO_REPLY_SUFFIX))
        return {
          answered: true,
          noReplyOnly: false,
          erroredTerminalTool: undefined,
          firstErroredAt: undefined,
        };
      noReplyOnly = true;
    }
  }
  return {
    answered: noReplyOnly,
    noReplyOnly,
    erroredTerminalTool: noReplyOnly ? undefined : erroredTerminalTool,
    firstErroredAt: noReplyOnly ? undefined : firstErroredAt,
  };
}
export {
  parseReplyGatePolicy,
  replyGatePolicyIgnoredLine,
  NO_REPLY_SUFFIX,
  isProjectsReplyGateEnabled,
  isProjectsReplyMountConnected,
  isUnansweredProjectsRun,
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS,
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS,
  areTerminalToolServersDown,
  evaluateProjectsReplyGate,
  joinProjectsMountBeforeFirstCommand,
};
