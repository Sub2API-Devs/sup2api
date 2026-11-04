/**
 * services/extractMemories/memdirResync.ts
 *
 * 2.1.316 新增：记忆目录重同步：检测成功的工具调用后重新同步 memdir。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xr4xc2mq.js (39)
 * attribution: placement 39
 */
import { expandPath } from "../../utils/path.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage, AbortError, isAbortError } from "../../utils/errors.js";
import { uniq, count } from "../../utils/collections.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { MEMORY_MUTATING_TOOLS } from "../../memdir/memoryTool.js";
import { MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { isAutoMemPath } from "../../memdir/paths.js";
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { env } from "../../utils/env.js";
import { getDefaultHaikuModel } from "../../utils/model/planModeModel.js";
import { getSmallFastModel, unlessManagedDeniedModel } from "../../utils/model/smallFastModel.js";
import { isPermittedByOrgModelPolicy } from "../../utils/model/defaultModel.js";
import { getSideQueryThinkingSettings } from "../../utils/thinking.js";
import {
  tagUntrustedArtifactContent,
  toolsUsedManifestText,
} from "../../utils/messages/untrustedArtifactContent.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { sideQueryWithCounter } from "../../utils/sideQuery.js";
import { safeParseJSON, stripJsonCodeFence } from "../../utils/json.js";
import { APIConnectionTimeoutError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xr4xc2mq.js:2141-2681 placement
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
    paths: uniq(resolvedPaths),
  });
}
//@ chunk-xr4xc2mq.js:2740-2759 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xr4xc2mq.js:2740", () => {
  weakSet = new WeakSet();
});
//@ chunk-xr4xc2mq.js:2759-2831 placement
/**
 * 把规则描述成 “the <行为> rule \"<规则>\"”。
 */
function describeRuleBlock(block) {
  return `the ${block.ruleBehavior} rule "${formatPermissionRule(block.ruleValue)}"`;
}
//@ chunk-xr4xc2mq.js:2831-3233 placement
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
//@ chunk-xr4xc2mq.js:3233-3429 placement
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
//@ chunk-xr4xc2mq.js:3429-3658 placement
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
//@ chunk-xr4xc2mq.js:3658-3825 placement
class MemoryExtractorSlots {
  extractor = null;
  drainer = async () => {};
  disarm = () => {};
  owedWithin = () => false;
  onPassEnded = null;
  onPassSkipped = null;
  savePlace = null;
  restoredPlace = null;
  restoredPlaceAt = null;
}
//@ chunk-xr4xc2mq.js:3825-3850 placement
/**
 * 按宿主保存的记忆提取器槽位。
 */
var memoryExtractorSlots; // deferred: uses MemoryExtractorSlots of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xr4xc2mq.js:3825", () => {
  memoryExtractorSlots = new HostScoped(() => new MemoryExtractorSlots());
});
//@ chunk-xr4xc2mq.js:3850-4066 placement
/**
 * 判断用户文字是否算"实质内容"的常量：最少词数、按字计词的文字系统正则（汉字/假名/泰文等）、问号字符集、可忽略的结尾字符正则。
 */
var MIN_PROSE_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CHAR_COUNTED_SCRIPTS_RE;
var QUESTION_MARKS;
var TRAILING_IGNORABLE_RE;
deferInit("chunk-xr4xc2mq.js:3850", () => {
  MIN_PROSE_WORDS = 2;
  CHAR_COUNTED_SCRIPTS_RE =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/gu;
  QUESTION_MARKS = new Set(["?", "\uFF1F", "\u061F"]);
  TRAILING_IGNORABLE_RE = /^[\s\p{P}\p{S}\p{M}]$/u;
});
//@ chunk-xr4xc2mq.js:4066-4114 placement
/**
 * 统计按空白切分的词数。
 */
function countWords(text) {
  return count(text.split(/\s+/), Boolean);
}
//@ chunk-xr4xc2mq.js:4114-4159 placement
/**
 * 统计按字计词文字系统（汉字、假名、泰文等）的字符数。
 */
function countScriptChars(text) {
  return text.match(CHAR_COUNTED_SCRIPTS_RE)?.length ?? 0;
}
//@ chunk-xr4xc2mq.js:4159-4205 placement
/**
 * 文字是否达到要求的词数（按字计词的文字按比例折算）。
 */
function hasEnoughProse(text, minWords) {
  return countWords(text) >= minWords || countScriptChars(text) >= minWords * MIN_PROSE_WORDS;
}
//@ chunk-xr4xc2mq.js:4205-4264 placement
/**
 * 文字折算成“散文词数”。
 */
function proseWordEquivalent(text) {
  return Math.max(countWords(text), Math.floor(countScriptChars(text) / MIN_PROSE_WORDS));
}
//@ chunk-xr4xc2mq.js:4264-4352 placement
/**
 * 把回合数分档（0-2、3-9、10-39、40+）。
 */
function turnCountBucket(turns) {
  if (turns < 3) return "0-2";
  if (turns < 10) return "3-9";
  if (turns < 40) return "10-39";
  return "40+";
}
//@ chunk-xr4xc2mq.js:4352-4477 placement
function endsWithQuestion(assistantPlainText) {
  let chars = [...assistantPlainText];
  for (let j = chars.length - 1; j >= 0; j--) {
    let char = chars[j];
    if (QUESTION_MARKS.has(char)) return true;
    if (!TRAILING_IGNORABLE_RE.test(char)) return false;
  }
  return false;
}
//@ chunk-xr4xc2mq.js:4477-4537 placement
/**
 * 判断消息是否为对话回合（user 或 assistant）。
 */
function isConversationTurn(message) {
  return message.type === "user" || message.type === "assistant";
}
//@ chunk-xr4xc2mq.js:4537-4700 placement
/**
 * 统计指定消息之后的有效回合数；找不到该消息或未指定时统计全部。
 */
function countTurnsSince(messages, sinceUuid) {
  if (sinceUuid === null || sinceUuid === undefined) return count(messages, isConversationTurn);
  let found = false;
  let turnCount = 0;
  for (let message of messages) {
    if (!found) {
      if (message.uuid === sinceUuid) found = true;
      continue;
    }
    if (isConversationTurn(message)) turnCount++;
  }
  if (!found) return count(messages, isConversationTurn);
  return turnCount;
}
//@ chunk-xr4xc2mq.js:4700-4709 placement
/**
 * 记忆提取前至少间隔的回合数默认值（3）。
 */
var MIN_TURNS_SINCE = 3;
//@ chunk-xr4xc2mq.js:4709-4797 placement
/**
 * 过滤掉 uuid 在给定集合里的消息。
 */
function messagesNotIn(messages, messages_2) {
  let excludedUuids = new Set(messages_2.map((message) => message.uuid));
  return messages.filter((message) => !excludedUuids.has(message.uuid));
}
//@ chunk-xr4xc2mq.js:4797-4895 placement
/**
 * 消息里是否有 max_turns_reached 附件。
 */
function hasMaxTurnsReached(messages) {
  return messages.some(
    (message) => message.type === "attachment" && message.attachment.type === "max_turns_reached",
  );
}
//@ chunk-xr4xc2mq.js:4895-4979 placement
/**
 * 最后一条助手消息是否为 API 错误。
 */
function lastAssistantWasApiError(messages) {
  return messages.findLast((message) => message.type === "assistant")?.isApiErrorMessage === true;
}
//@ chunk-xr4xc2mq.js:4979-5520 placement (2.1.88 match: hasSuccessfulToolCall, 1)
function hasSuccessfulToolCall(messages, sinceUuid, countMutating) {
  let inRange = sinceUuid === undefined;
  let successfulWriteIds = new Set();
  for (let message of messages) {
    if (!inRange) {
      if (message.uuid === sinceUuid) inRange = true;
      continue;
    }
    if (message.type === "user") {
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (block) =>
            block.type === "tool_result" &&
            block.is_error !== true &&
            successfulWriteIds.has(block.tool_use_id),
        )
      )
        return true;
      continue;
    }
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (countMutating && block.type === "tool_use" && MEMORY_MUTATING_TOOLS.has(block.name)) return true;
      if (block.type === "tool_use" && block.name === MEMORY_WRITE) {
        successfulWriteIds.add(block.id);
        continue;
      }
      let readToolFilePaths = collectReadToolFilePaths(block);
      if (readToolFilePaths !== undefined && isAutoMemPath(readToolFilePaths)) return true;
    }
  }
  return countMutating && !inRange && hasSuccessfulToolCall(messages, undefined, true);
}
//@ chunk-xr4xc2mq.js:5520-5529 placement
/**
 * 判定用户文字“有实质内容”的最小词数（3）。
 */
var MIN_CONTENT_WORDS = 3;
//@ chunk-xr4xc2mq.js:5529-5728 placement
function isSubstantialUserMessage(message) {
  if (message.type !== "user" || message.isMeta) return false;
  let content = message.message.content;
  if (typeof content === "string") return countWords(content) >= MIN_CONTENT_WORDS;
  if (!Array.isArray(content)) return false;
  return content.some((content) => content.type === "text" && countWords(content.text) >= MIN_CONTENT_WORDS);
}
//@ chunk-xr4xc2mq.js:5728-6037 placement
/**
 * 从后往前找最后一个人类回合的 uuid（普通用户消息，或非元消息的队列命令附件的源 uuid），找不到时用备用消息的 uuid。
 */
function getLastHumanTurnUuid(messages, personPrompt) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
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
//@ chunk-xr4xc2mq.js:6037-6173 placement
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
//@ chunk-xr4xc2mq.js:6173-6277 placement
function sliceAfterUuid(messages, sinceUuid) {
  if (sinceUuid === undefined) return messages;
  let index = messages.findIndex((message) => message.uuid === sinceUuid);
  return index === -1 ? messages : messages.slice(index + 1);
}
//@ chunk-xr4xc2mq.js:6277-6560 placement
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
//@ chunk-xr4xc2mq.js:6560-6662 placement
function contentToText(content) {
  return typeof content === "string"
    ? content
    : content.filter((block) => block.type === "text").map((block) => block.text).join(`
`);
}
//@ chunk-xr4xc2mq.js:6662-6769 placement
function getAssistantPlainText(message) {
  if (message.type !== "assistant") return;
  let content = message.message.content;
  return Array.isArray(content) ? contentToText(content) : undefined;
}
//@ chunk-xr4xc2mq.js:6769-6952 placement
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
//@ chunk-xr4xc2mq.js:6952-7034 placement
/**
 * 取最后 r 个用户回合的文本。
 */
function lastUserTurnText(messages, count) {
  return messages.flatMap((message) => getUserTurnText(message) ?? []).slice(-Math.max(count, 1)).join(`
`);
}
//@ chunk-xr4xc2mq.js:7034-7176 placement
function answersAssistantQuestion(messages, index) {
  for (let j = index - 1; j >= 0; j--) {
    let message = messages[j];
    if (getUserTurnText(message) !== undefined) return false;
    let assistantPlainText = getAssistantPlainText(message);
    if (assistantPlainText !== undefined && assistantPlainText.trim() !== "")
      return endsWithQuestion(assistantPlainText);
  }
  return false;
}
//@ chunk-xr4xc2mq.js:7176-7698 placement
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
    taskNotificationTurns: count(turns, (turn) => turn.origin?.kind === "task-notification"),
    unstampedTurns: count(turns, (turn) => turn.origin === undefined),
    proseWords: proseWordEquivalent(
      turns.map((turn) => turn.text).join(`
`),
    ),
  };
}
//@ chunk-xr4xc2mq.js:7698-7895 placement (2.1.88 match: collectReadToolFilePaths, 1)
function collectReadToolFilePaths(messages) {
  if (
    messages.type !== "tool_use" ||
    (messages.name !== FILE_EDIT_TOOL_NAME && messages.name !== FILE_WRITE_TOOL_NAME)
  )
    return;
  let input = messages.input;
  if (typeof input === "object" && input !== null && "file_path" in input) {
    let filePath = input.file_path;
    return typeof filePath === "string" ? filePath : undefined;
  }
  return;
}
//@ chunk-xr4xc2mq.js:7895-8094 placement
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
//@ chunk-xr4xc2mq.js:8094-8881 placement
/**
 * 为记忆"初看"挑选最近的对话片段：从后往前收集最多 N 个用户回合（跳过 API 错误、合成模型与任务通知），按"新的用户、新的助手、旧的用户、旧的助手"优先级装入字符预算（超出部分截取尾部），最新一条不是新消息时返回空。
 */
function buildFirstLookExchanges(messages, sinceUuid, maxUserTurns, maxChars) {
  let sinceIndex = sinceUuid === undefined ? -1 : messages.findIndex((message) => message.uuid === sinceUuid);
  let entries = [];
  let userTurnCount = 0;
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
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
      fresh: j > sinceIndex,
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
//@ chunk-xr4xc2mq.js:8881-10840 placement
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
    let toolsUsed = tagUntrustedArtifactContent(messages, undefined, false);
    let manifestText = toolsUsed.length > 0 ? toolsUsedManifestText(toolsUsed) : "";
    let response = await raceWithAbortSignal(
      sideQueryWithCounter({
        model,
        system: options.instruction,
        skipSystemPromptPrefix: true,
        messages: [
          {
            role: "user",
            content: `${manifestText}<exchanges>
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
    let found = response.content.find((block) => block.type === "text");
    let parsed = found?.type === "text" ? safeParseJSON(stripJsonCodeFence(found.text), false) : null;
    let writeLikely =
      typeof parsed === "object" && parsed !== null && "write_likely" in parsed
        ? parsed.write_likely
        : undefined;
    if (typeof writeLikely !== "boolean") {
      logForDebugging(
        `[extractMemories] first look: the model did not answer {"write_likely": true|false} (stop reason ${response.stop_reason}); the pass is not skipped`,
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
//@ chunk-xr4xc2mq.js:10840-11072 placement
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
  hasSuccessfulToolCall,
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
