/**
 * services/extractMemories/memdirResync.ts
 *
 * 2.1.316 新增：记忆目录重同步：检测成功的工具调用后重新同步 memdir。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-70rvh5wm.js (41)
 * attribution: placement 39, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { expandPath } from "../../utils/path.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage, AbortError, isAbortError } from "../../utils/errors.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { countWhere } from "../../utils/collections.js";
import { hasToolResultBlock, SYNTHETIC_MODEL } from "../../utils/messages.js";
import { isLocalCommandMessage } from "../../utils/messages/localCommandTags.js";
import { MEMORY_MUTATING_TOOLS } from "../../memdir/memoryTool.js";
import { MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { isAutoMemPath } from "../../memdir/paths.js";
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { env } from "../../utils/env.js";
import { getDefaultHaikuModel } from "../../utils/model/planModeModel.js";
import { getSmallFastModel, unlessManagedDeniedModel } from "../../utils/model/smallFastModel.js";
import { isPermittedByOrgModelPolicy } from "../../utils/model/defaultModel.js";
import { getSideQueryThinkingSettings } from "../../utils/thinking.js";
import {
  collectToolsUsedBeforeSummary,
  toolsUsedManifestText,
  streamPrefixesPresent,
} from "../../utils/messages/untrustedArtifactContent.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { sideQueryWithCounter } from "../../utils/sideQuery.js";
import { safeParseJSON, stripJsonCodeFence } from "../../utils/json.js";
import { APIConnectionTimeoutError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-70rvh5wm.js:2286-2826 placement
/**
 * 后台记忆/梦境写入文件后，逐个重新同步主会话的文件读取状态（记调试日志说明是内容还是仅时间变化），把解析成功的路径作为待通知的记忆更新入队。
 */
async function resyncMemoryWrites(context, notice) {
  if (notice.paths.length === 0) return;
  let resolvedPaths = [];
  for (let path of notice.paths)
    try {
      let expanded = expandPath(path);
      resolvedPaths.push(expanded);
      let result = await logFileStateResync(context.readFileState, expanded, {
        requireReadBeforeWrite: true,
      });
      if (result !== null)
        logForDebugging(
          `[memdir] re-synced readFileState for ${path} after the background ${notice.source} pass wrote it (${result === "changed" ? "content changed" : "mtime only, content identical"})`,
        );
    } catch (error) {
      logForDebugging(
        `[memdir] left ${jsonStringify(path)} out of the background ${notice.source} pass's change notice, could not resolve it: ${errorMessage(error)}`,
      );
    }
  if (resolvedPaths.length === 0) return;
  context.enqueuePendingMemoryUpdate({
    ...notice,
    paths: normalizeCaseForComparison_2(resolvedPaths),
  });
}
//@ chunk-70rvh5wm.js:2885-2904 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-70rvh5wm.js:2885", () => {
  weakSet = new WeakSet();
});
//@ chunk-70rvh5wm.js:2904-2976 placement
/**
 * 把规则描述成 “the <行为> rule \"<规则>\"”。
 */
function describeRuleBlock(block) {
  return `the ${block.ruleBehavior} rule "${permissionRuleValueFromString(block.ruleValue)}"`;
}
//@ chunk-70rvh5wm.js:2976-3378 placement
/**
 * 每个上下文只提示一次：某权限规则（拒绝或需逐次批准）阻止后台向记忆目录保存，规则移除后会恢复保存。
 */
function describeMemoryRuleBlock(message, ruleBlock, autoMemPath) {
  if (weakSet.has(message)) return;
  weakSet.add(message);
  let blockDescription = `${describeRuleBlock(ruleBlock)} (from ${getSettingSourceDisplayNameLowercase(ruleBlock.source)})`;
  let effect =
    ruleBlock.ruleBehavior === "deny"
      ? `${blockDescription} blocks those writes`
      : `${blockDescription} needs your approval for each write, and background saving can't ask`;
  return `Claude isn't saving memories to ${autoMemPath} in the background: ${effect}. Saving resumes once that rule is removed or no longer covers that folder, and may then include what was skipped.`;
}
//@ chunk-70rvh5wm.js:3378-3574 placement
/**
 * 注册一个"saving memories"的回合后记忆任务（运行中、不写入记录），返回任务 id。
 */
function registerPostTurnMemoryTask(taskRegistry, abortController) {
  let taskId = generateTaskId("post_turn_memory");
  let task = {
    ...createTaskStateBase(taskId, "post_turn_memory", "saving memories"),
    type: "post_turn_memory",
    status: "running",
    skipTranscript: true,
    abortController,
  };
  taskRegistry.register(task);
  return taskId;
}
//@ chunk-70rvh5wm.js:3574-3803 placement
/**
 * 把运行中的记忆任务标为结束状态（completed/failed/killed），并发出不写入记录的环境型任务通知。
 */
function finishMemoryTask(taskId, taskRegistry, status) {
  let finished = false;
  taskRegistry.update(taskId, (task) => {
    if (task.status !== "running") return task;
    finished = true;
    return {
      ...task,
      status,
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
    };
  });
  if (finished)
    emitTaskNotification(taskId, status === "killed" ? "stopped" : status, {
      skipTranscript: true,
      ambient: true,
    });
}
//@ chunk-70rvh5wm.js:3803-3984 placement
class MemoryExtractorSlots {
  extractor = null;
  drainer = async () => {};
  disarm = () => {};
  owedWithin = () => false;
  onPassEnded = null;
  onPassSkipped = null;
  savePlace = null;
  placeNow = null;
  restoredPlace = null;
  restoredPlaceAt = null;
}
//@ chunk-70rvh5wm.js:3984-4008 placement
/**
 * 按宿主保存的记忆提取器槽位。
 */
var memoryExtractorSlots; // deferred: uses MemoryExtractorSlots of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-70rvh5wm.js:3984", () => {
  memoryExtractorSlots = new HostScoped(() => new MemoryExtractorSlots());
});
//@ chunk-70rvh5wm.js:4008-4224 placement
/**
 * 判断用户文字是否算"实质内容"的常量：最少词数、按字计词的文字系统正则（汉字/假名/泰文等）、问号字符集、可忽略的结尾字符正则。
 */
var MIN_PROSE_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHAR_COUNTED_SCRIPTS_RE;
var QUESTION_MARKS;
var TRAILING_IGNORABLE_RE;
deferInit("chunk-70rvh5wm.js:4008", () => {
  MIN_PROSE_WORDS = 2;
  CHAR_COUNTED_SCRIPTS_RE =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/gu;
  QUESTION_MARKS = new Set(["?", "\uFF1F", "\u061F"]);
  TRAILING_IGNORABLE_RE = /^[\s\p{P}\p{S}\p{M}]$/u;
});
//@ chunk-70rvh5wm.js:4224-4272 placement
/**
 * 统计按空白切分的词数。
 */
function countWords(text) {
  return countWhere(text.split(/\s+/), Boolean);
}
//@ chunk-70rvh5wm.js:4272-4317 placement
/**
 * 统计按字计词文字系统（汉字、假名、泰文等）的字符数。
 */
function countScriptChars(text) {
  return text.match(CHAR_COUNTED_SCRIPTS_RE)?.length ?? 0;
}
//@ chunk-70rvh5wm.js:4317-4363 placement
/**
 * 文字是否达到要求的词数（按字计词的文字按比例折算）。
 */
function hasEnoughProse(text, minWords) {
  return countWords(text) >= minWords || countScriptChars(text) >= minWords * MIN_PROSE_WORDS;
}
//@ chunk-70rvh5wm.js:4363-4422 placement
/**
 * 文字折算成“散文词数”。
 */
function proseWordEquivalent(text) {
  return Math.max(countWords(text), Math.floor(countScriptChars(text) / MIN_PROSE_WORDS));
}
//@ chunk-70rvh5wm.js:4422-4510 placement
/**
 * 把回合数分档（0-2、3-9、10-39、40+）。
 */
function turnCountBucket(turns) {
  if (turns < 3) return "0-2";
  if (turns < 10) return "3-9";
  if (turns < 40) return "10-39";
  return "40+";
}
//@ chunk-70rvh5wm.js:4510-4635 placement
function endsWithQuestion(assistantPlainText) {
  let chars = [...assistantPlainText];
  for (let k = chars.length - 1; k >= 0; k--) {
    let char = chars[k];
    if (QUESTION_MARKS.has(char)) return true;
    if (!TRAILING_IGNORABLE_RE.test(char)) return false;
  }
  return false;
}
//@ chunk-70rvh5wm.js:4635-4695 placement
/**
 * 判断消息是否为对话回合（user 或 assistant）。
 */
function isConversationTurn(message) {
  return message.type === "user" || message.type === "assistant";
}
//@ chunk-70rvh5wm.js:4695-4858 placement
/**
 * 统计指定消息之后的有效回合数；找不到该消息或未指定时统计全部。
 */
function countTurnsSince(messages, sinceUuid) {
  if (sinceUuid === null || sinceUuid === undefined) return countWhere(messages, isConversationTurn);
  let found = false;
  let turnCount = 0;
  for (let message of messages) {
    if (!found) {
      if (message.uuid === sinceUuid) found = true;
      continue;
    }
    if (isConversationTurn(message)) turnCount++;
  }
  if (!found) return countWhere(messages, isConversationTurn);
  return turnCount;
}
//@ chunk-70rvh5wm.js:4858-4867 placement
/**
 * 记忆提取前至少间隔的回合数默认值（3）。
 */
var MIN_TURNS_SINCE = 3;
//@ chunk-70rvh5wm.js:4867-4955 placement
/**
 * 过滤掉 uuid 在给定集合里的消息。
 */
function messagesNotIn(messages, messages_2) {
  let excludedUuids = new Set(messages_2.map((message) => message.uuid));
  return messages.filter((message) => !excludedUuids.has(message.uuid));
}
//@ chunk-70rvh5wm.js:4955-5053 placement
/**
 * 消息里是否有 max_turns_reached 附件。
 */
function hasMaxTurnsReached(messages) {
  return messages.some(
    (message) => message.type === "attachment" && message.attachment.type === "max_turns_reached",
  );
}
//@ chunk-70rvh5wm.js:5053-5137 placement
/**
 * 最后一条助手消息是否为 API 错误。
 */
function lastAssistantWasApiError(messages) {
  return messages.findLast((message) => message.type === "assistant")?.isApiErrorMessage === true;
}
//@ chunk-70rvh5wm.js:5137-5312 layout
function afterAnchorMessages(messages, allMessages, anchorUuid, afterAnchorInterrupted = false) {
  let index =
    allMessages === undefined
      ? -1
      : messages.findIndex((fromInterrupt) => fromInterrupt.uuid === allMessages);
  if (index !== -1) return keepConversationTail(messages.slice(index + 1), anchorUuid);
  if (anchorUuid)
    return keepConversationTail(
      afterAnchorInterrupted ? messages.slice(lastKeptIndex(messages)) : messages,
      true,
    );
  return allMessages === undefined && keepConversationTail(messages, false);
}
//@ chunk-70rvh5wm.js:5312-5491 layout
function lastKeptIndex(messages) {
  return Math.max(
    messages.findLastIndex(
      (message) =>
        message.type === "user" &&
        message.interruptedByShutdown !== true &&
        !hasToolResultBlock(message.message.content) &&
        !(message.promptSource === undefined && isLocalCommandMessage(message)) &&
        getUserTurnText(message) !== undefined,
    ),
    0,
  );
}
//@ chunk-70rvh5wm.js:5491-5961 placement
function keepConversationTail(messages, candidateMessages) {
  let successfulWriteIds = new Set();
  for (let message of messages) {
    if (message.type === "user") {
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (message) =>
            message.type === "tool_result" &&
            message.is_error !== true &&
            successfulWriteIds.has(message.tool_use_id),
        )
      )
        return true;
      continue;
    }
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (candidateMessages && block.type === "tool_use" && MEMORY_MUTATING_TOOLS.has(block.name))
        return true;
      if (block.type === "tool_use" && block.name === MEMORY_WRITE) {
        successfulWriteIds.add(block.id);
        continue;
      }
      let readToolFilePaths = collectReadToolFilePaths(block);
      if (readToolFilePaths !== undefined && isAutoMemPath(readToolFilePaths)) return true;
    }
  }
  return false;
}
//@ chunk-70rvh5wm.js:5961-5970 placement
/**
 * 判定用户文字“有实质内容”的最小词数（3）。
 */
var MIN_CONTENT_WORDS = 3;
//@ chunk-70rvh5wm.js:5970-6169 placement
function isSubstantialUserMessage(message) {
  if (message.type !== "user" || message.isMeta) return false;
  let content = message.message.content;
  if (typeof content === "string") return countWords(content) >= MIN_CONTENT_WORDS;
  if (!Array.isArray(content)) return false;
  return content.some((content) => content.type === "text" && countWords(content.text) >= MIN_CONTENT_WORDS);
}
//@ chunk-70rvh5wm.js:6169-6478 placement
/**
 * 从后往前找最后一个人类回合的 uuid（普通用户消息，或非元消息的队列命令附件的源 uuid），找不到时用备用消息的 uuid。
 */
function getLastHumanTurnUuid(messages, personPrompt) {
  for (let k = messages.length - 1; k >= 0; k--) {
    let message = messages[k];
    if (message === undefined || !isHumanTurn(message)) continue;
    if (message.type === "user") {
      if (!message.isMeta) return message.uuid;
    } else if (
      message.type === "attachment" &&
      message.attachment.type === "queued_command" &&
      !message.attachment.isMeta &&
      message.attachment.source_uuid !== undefined
    )
      return message.attachment.source_uuid;
  }
  return personPrompt?.uuid;
}
//@ chunk-70rvh5wm.js:6478-6614 placement
/**
 * 判断指定消息之后是否有实质性的回合；找不到该消息时检查全部。
 */
function hasSubstantialTurnSince(messages, sinceUuid) {
  let started = sinceUuid === undefined;
  for (let message of messages) {
    if (!started) {
      if (message.uuid === sinceUuid) started = true;
      continue;
    }
    if (isSubstantialUserMessage(message)) return true;
  }
  if (!started) return messages.some(isSubstantialUserMessage);
  return false;
}
//@ chunk-70rvh5wm.js:6614-6718 placement
function sliceAfterUuid(messages, sinceUuid) {
  if (sinceUuid === undefined) return messages;
  let index = messages.findIndex((message) => message.uuid === sinceUuid);
  return index === -1 ? messages : messages.slice(index + 1);
}
//@ chunk-70rvh5wm.js:6718-7001 placement
function getUserTurnText(message) {
  if (message.type === "attachment") {
    let { attachment } = message;
    return attachment.type === "queued_command" && !attachment.isMeta
      ? contentToText(attachment.prompt)
      : undefined;
  }
  if (message.type !== "user" || message.isMeta || message.isCompactSummary) return;
  let content = message.message.content;
  if (Array.isArray(content) && content.every((prompt) => prompt.type === "tool_result")) return;
  return contentToText(content);
}
//@ chunk-70rvh5wm.js:7001-7103 placement
function contentToText(content) {
  return typeof content === "string"
    ? content
    : content.filter((block) => block.type === "text").map((block) => block.text).join(`
`);
}
//@ chunk-70rvh5wm.js:7103-7210 placement
function getAssistantPlainText(message) {
  if (message.type !== "assistant") return;
  let content = message.message.content;
  return Array.isArray(content) ? contentToText(content) : undefined;
}
//@ chunk-70rvh5wm.js:7210-7393 placement
/**
 * 判断最近一个用户回合是否值得记忆提取：窗口内有实质内容，或最后的用户文字非空且是在回答助手的提问。
 */
function isMemoryCandidateTurn(messages, minWords, minWords_2) {
  let last = messages
    .flatMap((message, index) => {
      let userTurnText = getUserTurnText(message);
      return userTurnText === undefined
        ? []
        : [
            {
              index,
              text: userTurnText,
            },
          ];
    })
    .at(-1);
  if (last === undefined) return false;
  return (
    hasEnoughProse(lastUserTurnText(messages, minWords_2), minWords) ||
    (last.text.trim() !== "" && answersAssistantQuestion(messages, last.index))
  );
}
//@ chunk-70rvh5wm.js:7393-7475 placement
/**
 * 取最后 r 个用户回合的文本。
 */
function lastUserTurnText(messages, count) {
  return messages.flatMap((message) => getUserTurnText(message) ?? []).slice(-Math.max(count, 1)).join(`
`);
}
//@ chunk-70rvh5wm.js:7475-7617 placement
function answersAssistantQuestion(messages, index) {
  for (let k = index - 1; k >= 0; k--) {
    let message = messages[k];
    if (getUserTurnText(message) !== undefined) return false;
    let assistantPlainText = getAssistantPlainText(message);
    if (assistantPlainText !== undefined && assistantPlainText.trim() !== "")
      return endsWithQuestion(assistantPlainText);
  }
  return false;
}
//@ chunk-70rvh5wm.js:7617-8139 placement
/**
 * 统计某 uuid 之后的用户回合：总回合数、人类亲写回合数与字数、任务通知回合数、无来源标记回合数、正文词数。
 */
function summarizeUserTurns(messages, sinceUuid) {
  let turns = sliceAfterUuid(messages, sinceUuid).flatMap((message) => {
    let userTurnText = getUserTurnText(message);
    if (userTurnText === undefined) return [];
    let origin =
      message.type === "attachment" && message.attachment.type === "queued_command"
        ? message.attachment.origin
        : message.type === "user"
          ? message.origin
          : undefined;
    return [
      {
        message,
        text: userTurnText,
        origin,
      },
    ];
  });
  let ownWordsTurns = turns.filter((turn) => isHumanTurn(turn.message));
  return {
    userTurns: turns.length,
    ownWordsTurns: ownWordsTurns.length,
    ownWordsChars: ownWordsTurns.reduce((acc, ownWordsTurn) => acc + ownWordsTurn.text.length, 0),
    taskNotificationTurns: countWhere(turns, (turn) => turn.origin?.kind === "task-notification"),
    unstampedTurns: countWhere(turns, (turn) => turn.origin === undefined),
    proseWords: proseWordEquivalent(
      turns.map((turn) => turn.text).join(`
`),
    ),
  };
}
//@ chunk-70rvh5wm.js:8139-8336 placement (2.1.88 match: collectReadToolFilePaths, 1)
function collectReadToolFilePaths(messages) {
  if (messages.type !== "tool_use" || (messages.name !== EDIT && messages.name !== FILE_WRITE_TOOL_NAME))
    return;
  let input = messages.input;
  if (typeof input === "object" && input !== null && "file_path" in input) {
    let filePath = input.file_path;
    return typeof filePath === "string" ? filePath : undefined;
  }
  return;
}
//@ chunk-70rvh5wm.js:8336-8535 placement
/**
 * 记忆"初看"判断的常量：输出 token 上限、超时、只回答 JSON 的指令、分隔符、省略号，以及按"新/旧 × 用户/助手"排列的填充优先级。
 */
var FIRST_LOOK_MAX_TOKENS = 64;
var FIRST_LOOK_TIMEOUT_MS = 20000;
var FIRST_LOOK_ANSWER_INSTRUCTION =
  'Answer with JSON only: {"write_likely": true} or {"write_likely": false}.';
var EXCHANGE_SEPARATOR = `

`;
var ELLIPSIS = "\u2026";
var FILL_PRIORITY = [
  {
    fresh: true,
    user: true,
  },
  {
    fresh: true,
    user: false,
  },
  {
    fresh: false,
    user: true,
  },
  {
    fresh: false,
    user: false,
  },
];
//@ chunk-70rvh5wm.js:8535-9322 placement
/**
 * 为记忆"初看"挑选最近的对话片段：从后往前收集最多 N 个用户回合（跳过 API 错误、合成模型与任务通知），按"新的用户、新的助手、旧的用户、旧的助手"优先级装入字符预算（超出部分截取尾部），最新一条不是新消息时返回空。
 */
function buildFirstLookExchanges(messages, sinceUuid, maxUserTurns, maxChars) {
  let sinceIndex = sinceUuid === undefined ? -1 : messages.findIndex((message) => message.uuid === sinceUuid);
  let entries = [];
  let userTurnCount = 0;
  for (let k = messages.length - 1; k >= 0; k--) {
    let message = messages[k];
    let body =
      message.type === "assistant"
        ? message.isApiErrorMessage || message.message.model === SYNTHETIC_MODEL
          ? undefined
          : getAssistantPlainText(message)
        : isTaskNotificationTurn(message)
          ? undefined
          : getUserTurnText(message);
    if (body === undefined || body.trim() === "") continue;
    let isUser = message.type !== "assistant";
    entries.push({
      user: isUser,
      fresh: k > sinceIndex,
      body: body.trim(),
    });
    if (isUser && ++userTurnCount >= maxUserTurns) break;
  }
  if (!entries[0]?.fresh)
    return {
      text: "",
      userTurns: 0,
    };
  let chosen = new Map();
  let budgetLeft = maxChars;
  for (let { fresh, user } of FILL_PRIORITY)
    for (let [index, entry] of entries.entries()) {
      if (entry.fresh !== fresh || entry.user !== user) continue;
      let prefix = user ? "User: " : "Assistant: ";
      let overhead = (chosen.size > 0 ? EXCHANGE_SEPARATOR.length : 0) + prefix.length;
      if (overhead + entry.body.length <= budgetLeft) {
        chosen.set(index, prefix + entry.body);
        budgetLeft -= overhead + entry.body.length;
        continue;
      }
      let roomForTail = budgetLeft - overhead - ELLIPSIS.length;
      if (roomForTail > 0) chosen.set(index, prefix + ELLIPSIS + takeLastChars(entry.body, roomForTail));
      budgetLeft = 0;
      break;
    }
  return {
    text: entries
      .map((entry, index) => chosen.get(index))
      .filter((segment) => segment !== undefined)
      .reverse()
      .join(EXCHANGE_SEPARATOR),
    userTurns: userTurnCount,
  };
}
//@ chunk-70rvh5wm.js:9322-11328 placement
/**
 * 用小模型做记忆提取前的"初看"：在超时内问模型最近对话是否可能需要写记忆（JSON 布尔），检查组织模型策略与托管拒绝；无法判断或出错时返回 error（不跳过本次提取）；返回判定、模型、耗时、输入长度与用户回合数。
 */
async function runMemoryFirstLook({
  config: options,
  messages,
  sinceUuid,
  window: maxUserTurns,
  signal,
  credentials,
}) {
  let now = Date.now();
  let model = options.model ?? "";
  let inputText = "";
  let userTurns = 0;
  let finish = (verdict, exchanges) => {
    if (exchanges !== undefined) logFeatureSad("ccr_memory_first_look", exchanges);
    else if (verdict !== "empty") logFeatureOk("ccr_memory_first_look");
    return {
      verdict,
      error: exchanges,
      model,
      durationMs: Date.now() - now,
      inputChars: inputText.length,
      userTurns,
    };
  };
  let deadline = createCombinedAbortSignal(signal, {
    timeoutMs: FIRST_LOOK_TIMEOUT_MS,
    refTimer: true,
  });
  try {
    let policyModel = options.model ?? env.ANTHROPIC_SMALL_FAST_MODEL ?? getDefaultHaikuModel();
    model = options.model ?? getSmallFastModel();
    let firstLookExchanges = buildFirstLookExchanges(
      messages,
      sinceUuid,
      maxUserTurns,
      options.maxInputChars,
    );
    inputText = firstLookExchanges.text;
    userTurns = firstLookExchanges.userTurns;
    if (inputText === "") return finish("empty");
    if (!isPermittedByOrgModelPolicy(model)) {
      logForDebugging(
        `[extractMemories] first look: ${model} is not permitted by the organization's model policy; the pass is not skipped`,
      );
      return finish("error", "policy");
    }
    if (unlessManagedDeniedModel(policyModel) !== policyModel || unlessManagedDeniedModel(model) !== model) {
      logForDebugging(
        `[extractMemories] first look: managed settings deny the first look's model (${policyModel}, sent as ${model}); the pass is not skipped`,
      );
      return finish("error", "managed_denied");
    }
    let [thinking, thinkingBudget] = getSideQueryThinkingSettings(model);
    let toolsUsed = collectToolsUsedBeforeSummary(messages, undefined, false);
    let manifestText = toolsUsed.length > 0 ? toolsUsedManifestText(toolsUsed) : "";
    let joined = streamPrefixesPresent(messages)
      .map(
        (modelName) => `${modelName}
`,
      )
      .join("");
    let texts = await raceWithAbortSignal(
      sideQueryWithCounter({
        model,
        system: options.instruction,
        skipSystemPromptPrefix: true,
        messages: [
          {
            role: "user",
            content: `${manifestText}${joined}<exchanges>
${inputText}
</exchanges>

${FIRST_LOOK_ANSWER_INSTRUCTION}`,
          },
        ],
        max_tokens: FIRST_LOOK_MAX_TOKENS + thinkingBudget,
        thinking,
        output_format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              write_likely: {
                type: "boolean",
              },
            },
            required: ["write_likely"],
            additionalProperties: false,
          },
        },
        timeout: FIRST_LOOK_TIMEOUT_MS,
        maxRetries: 0,
        signal: deadline.signal,
        forceAttributionHeader: true,
        querySource: "extract_memories_first_look",
        credentials,
      }),
      deadline.signal,
      () => new AbortError(),
    );
    let found = texts.content.find((block) => block.type === "text");
    let parsed = found?.type === "text" ? safeParseJSON(stripJsonCodeFence(found.text), false) : null;
    let writeLikely =
      typeof parsed === "object" && parsed !== null && "write_likely" in parsed
        ? parsed.write_likely
        : undefined;
    if (typeof writeLikely !== "boolean") {
      logForDebugging(
        `[extractMemories] first look: the model did not answer {"write_likely": true|false} (stop reason ${texts.stop_reason}); the pass is not skipped`,
      );
      return finish("error", "no_boolean");
    }
    return finish(writeLikely ? "yes" : "no");
  } catch (error) {
    logForDebugging(`[extractMemories] first look failed: ${errorMessage(error)}; the pass is not skipped`);
    return finish(
      "error",
      error instanceof APIConnectionTimeoutError || (deadline.signal.aborted && !signal.aborted)
        ? "timeout"
        : isAbortError(error)
          ? "aborted"
          : "api_error",
    );
  } finally {
    deadline.cleanup();
  }
}
//@ chunk-70rvh5wm.js:11328-11560 placement
function isTaskNotificationTurn(message) {
  let origin =
    message.type === "attachment" && message.attachment.type === "queued_command"
      ? resolveTaskNotificationOrigin(message.attachment.origin, message.attachment.commandMode)
      : message.type === "user"
        ? message.origin
        : undefined;
  return origin?.kind === "task-notification" && origin.subkind !== "scheduled-trigger";
}
export {
  collectReadToolFilePaths,
  MIN_TURNS_SINCE,
  memoryExtractorSlots,
  countTurnsSince,
  afterAnchorMessages,
  summarizeUserTurns,
  isMemoryCandidateTurn,
  hasSubstantialTurnSince,
  turnCountBucket,
  proseWordEquivalent,
  lastUserTurnText,
  describeRuleBlock,
  describeMemoryRuleBlock,
  runMemoryFirstLook,
  registerPostTurnMemoryTask,
  getLastHumanTurnUuid,
  messagesNotIn,
  hasMaxTurnsReached,
  lastAssistantWasApiError,
  resyncMemoryWrites,
  finishMemoryTask,
};
