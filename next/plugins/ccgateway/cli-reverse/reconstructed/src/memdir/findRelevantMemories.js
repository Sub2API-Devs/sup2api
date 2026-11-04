/**
 * memdir/findRelevantMemories.ts
 *
 * 列出可召回的记忆（MEMORY.md + 扫描到的记忆文件），并用小模型挑选与当前查询相关的记忆。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/findRelevantMemories.ts
 * pieces: chunk-7sekx49c.js (2), chunk-e6aww6q8.js (9)
 * attribution: affinity 1, fingerprint 2, placement 8
 */
import { stat } from "fs/promises";
import { sep } from "path";
import { getSideQueryThinkingSettings } from "../utils/thinking.js";
import { sideQueryWithCounter } from "../utils/sideQuery.js";
import {
  MEMORY_SELECTOR_PROMPT,
  SELECTOR_MAX_TOKENS,
  tryModelsUntilAccepted,
  iterateSelectorModels,
  regExp_16,
  isUnusableSelectorModel,
} from "./memoryRecallSelect.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonParse } from "../utils/slowOperations.js";
import { stripJsonCodeFence } from "../utils/json.js";
import { errorMessage } from "../utils/errors.js";
import { getAutoMemEntrypoint, getAutoMemPath } from "./paths.js";
import { scanMemoryFiles } from "./memoryScan.js";

//@ chunk-e6aww6q8.js:1628861-1628888 placement
var MEMDIR_RELEVANCE = "memdir_relevance";
//@ chunk-e6aww6q8.js:1628888-1628940 placement
/**
 * 记忆选择器对话的初始状态（按目录分表与最近使用）。
 */
function emptyPickerState() {
  return {
    stateByDir: {},
    lastUsage: null,
  };
}
//@ chunk-e6aww6q8.js:1628940-1629001 placement
/**
 * 清空记忆选择器对话的状态。
 */
function resetPickerState(memorySelector) {
  if (!memorySelector) return;
  memorySelector.stateByDir = {};
  memorySelector.lastUsage = null;
}
//@ chunk-e6aww6q8.js:1629001-1629042 placement
/**
 * 取指定记忆目录的选择器对话状态。
 */
function pickerStateForDir(pickerState, dir) {
  return pickerState.stateByDir[dir];
}
//@ chunk-e6aww6q8.js:1629042-1629370 placement
/**
 * 为某个记忆目录建立挑选器对话状态：首条用户消息列出可用记忆（可带缓存控制），保留旧对话的后续消息与账号上下文。
 */
function startMemoryPickerState(selectorCtx, memoryDir, memories, memoriesText, cacheControl, hydrated) {
  let prevState = selectorCtx.stateByDir[memoryDir];
  let nextState = {
    memories,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Available memories:
${memoriesText}`,
            ...(cacheControl && {
              cache_control: cacheControl,
            }),
          },
        ],
      },
      ...(prevState?.messages.slice(1) ?? []),
    ],
    hydrated,
    ...(prevState?.account && {
      account: prevState.account,
    }),
    ...(prevState?.accountScope !== undefined && {
      accountScope: prevState.accountScope,
    }),
  };
  selectorCtx.stateByDir[memoryDir] = nextState;
  return nextState;
}
//@ chunk-e6aww6q8.js:1629370-1629679 placement
/**
 * 把一问一答追加到记忆挑选器对话里，返回撤销函数（最后一条仍是这次回答时删掉这两条）。
 */
function appendPickerExchange(selectorCtx, memoryDir, text, text_2) {
  let prevState = selectorCtx.stateByDir[memoryDir];
  if (!prevState) return () => {};
  let assistantMessage = {
    role: "assistant",
    content: [
      {
        type: "text",
        text: text_2,
      },
    ],
  };
  selectorCtx.stateByDir[memoryDir] = {
    ...prevState,
    messages: [
      ...prevState.messages,
      {
        role: "user",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
      assistantMessage,
    ],
  };
  return () => {
    let currentState = selectorCtx.stateByDir[memoryDir];
    if (currentState?.messages.at(-1) === assistantMessage)
      currentState.messages = currentState.messages.slice(0, -2);
  };
}
//@ chunk-e6aww6q8.js:1629679-1630077 placement
/**
 * 设置记忆挑选器的账号上下文消息：账号范围变化时截断对话并清除旧账号；同一账号 key 不重复设置。
 */
function setPickerAccountContext(
  selectorCtx,
  memoryDir,
  account,
  cacheControl,
  accountScope = account?.scope,
) {
  let pickerState = selectorCtx.stateByDir[memoryDir];
  if (!pickerState) return;
  if (
    accountScope !== undefined &&
    pickerState.accountScope !== undefined &&
    pickerState.accountScope !== accountScope
  ) {
    pickerState.messages = pickerState.messages.slice(0, 1);
    delete pickerState.account;
  }
  if (accountScope !== undefined) pickerState.accountScope = accountScope;
  if (account === undefined) {
    delete pickerState.account;
    return;
  }
  if (pickerState.account?.key === account.key) return;
  pickerState.account = {
    key: account.key,
    names: account.names,
    message: {
      role: "user",
      content: [
        {
          type: "text",
          text: account.text,
          ...(cacheControl && {
            cache_control: cacheControl,
          }),
        },
      ],
    },
  };
}
//@ chunk-e6aww6q8.js:1630077-1630181 placement
/**
 * 生成记忆挑选器发送的消息列表：首条清单消息后插入账号上下文消息（如有），再接其余对话。
 */
function pickerMessages(pickerState) {
  let [systemMessage, ...restMessages] = pickerState.messages;
  return systemMessage === undefined
    ? restMessages
    : [systemMessage, ...(pickerState.account ? [pickerState.account.message] : []), ...restMessages];
}
//@ chunk-e6aww6q8.js:3306853-3308623 fingerprint (2.1.88 match: selectRelevantMemories, 0.434)
/**
 * 用小模型从记忆清单中挑选与当前查询相关的记忆（JSON schema 输出），结果用于自动注入相关记忆。
 */
async function selectRelevantMemories(options) {
  let {
    query,
    memoryDir,
    selectorCtx,
    history,
    turnCount,
    byFilename,
    accountNames,
    cacheControl,
    signal,
    credentials,
    selectorTurnReverts,
  } = options;
  let isKnownMemoryName = (memoryName) => byFilename.has(memoryName) || accountNames.has(memoryName);
  let text = `Select memories relevant to:
${query}`;
  let queryModel = (model) => {
    let [thinkingConfig, thinkingTokenBudget] = getSideQueryThinkingSettings(model);
    return sideQueryWithCounter({
      model,
      system: [
        {
          type: "text",
          text: MEMORY_SELECTOR_PROMPT,
          cache_control: cacheControl,
        },
      ],
      skipSystemPromptPrefix: true,
      messages: [
        ...history,
        {
          role: "user",
          content: [
            {
              type: "text",
              text,
              cache_control: cacheControl,
            },
          ],
        },
      ],
      max_tokens: SELECTOR_MAX_TOKENS + thinkingTokenBudget,
      thinking: thinkingConfig,
      output_format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            selected_memories: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: ["selected_memories"],
          additionalProperties: false,
        },
      },
      signal,
      querySource: MEMDIR_RELEVANCE,
      credentials,
    });
  };
  try {
    let { result, refusals } = await tryModelsUntilAccepted(iterateSelectorModels(), queryModel, signal);
    if (result.stop_reason === "max_tokens") {
      logFeatureSad("memory_recall_select", "output_truncated");
      logForDebugging("[memdir] selectRelevantMemories truncated at max_tokens", {
        level: "warn",
      });
      return [];
    }
    let textBlock = result.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      logFeatureSad("memory_recall_select", "no_text_block");
      logForDebugging("[memdir] selectRelevantMemories returned no text block", {
        level: "warn",
      });
      return [];
    }
    let parsed = jsonParse(stripJsonCodeFence(textBlock.text));
    selectorTurnReverts.unshift(appendPickerExchange(selectorCtx, memoryDir, text, textBlock.text));
    selectorCtx.lastUsage = {
      cacheReadInputTokens: result.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: result.usage.cache_creation_input_tokens ?? 0,
      turnCount,
    };
    if (refusals === 0) logFeatureOk("memory_recall_select");
    else logFeatureSad("memory_recall_select", "selector_model_fell_back");
    return parsed.selected_memories
      .map((selectedMemory) =>
        typeof selectedMemory !== "string" || isKnownMemoryName(selectedMemory)
          ? selectedMemory
          : selectedMemory.replace(regExp_16, ""),
      )
      .filter((selectedMemory) => typeof selectedMemory === "string" && isKnownMemoryName(selectedMemory));
  } catch (e) {
    selectorCtx.lastUsage = null;
    if (signal.aborted) return [];
    logFeatureSad(
      "memory_recall_select",
      isUnusableSelectorModel(e) ? "every_selector_model_refused" : "memory_recall_select_query_failed",
    );
    logForDebugging(`[memdir] selectRelevantMemories failed: ${errorMessage(e)}`, {
      level: "warn",
    });
    return [];
  }
}
//@ chunk-7sekx49c.js:12092-12145 affinity
/**
 * 记忆索引文件名 "MEMORY.md"、索引标题与扫描记忆文件的超时（5 秒）。
 */
var MEMORY_INDEX_NAME = "MEMORY.md";
var _ = "Index of saved memories";
var MEMORY_SCAN_TIMEOUT_MS = 5000;
//@ chunk-7sekx49c.js:12145-12672 fingerprint (2.1.88 match: findRelevantMemories, 0.534)
/**
 * 列出可召回的记忆：MEMORY.md 索引本身 + scanMemoryFiles 结果（5 秒超时），去掉与入口同一 inode 的重复。
 */
async function findRelevantMemories(storageV5) {
  let memories = [];
  let autoMemEntrypoint = getAutoMemEntrypoint();
  let entrypointStat = await stat(autoMemEntrypoint).then(
    (entryStat) => (entryStat.isFile() ? entryStat : null),
    () => null,
  );
  if (entrypointStat !== null)
    memories.push({
      name: MEMORY_INDEX_NAME,
      path: autoMemEntrypoint,
      description: _,
      type: null,
      modified_ms: entrypointStat.mtimeMs,
    });
  let scannedFiles = await scanMemoryFiles(
    getAutoMemPath(),
    AbortSignal.timeout(MEMORY_SCAN_TIMEOUT_MS),
    storageV5,
  );
  for (let file of scannedFiles) {
    if (
      entrypointStat !== null &&
      !file.filename.includes(sep) &&
      file.filename.toLowerCase() === MEMORY_INDEX_NAME.toLowerCase()
    ) {
      let fileStat = await stat(file.filePath).catch(() => null);
      if (fileStat !== null && fileStat.dev === entrypointStat.dev && fileStat.ino === entrypointStat.ino)
        continue;
    }
    memories.push({
      name: file.filename,
      path: file.filePath,
      description: file.description,
      type: file.type ?? null,
      modified_ms: file.modifiedMs,
    });
  }
  return memories;
}
export {
  emptyPickerState,
  resetPickerState,
  findRelevantMemories,
  MEMDIR_RELEVANCE,
  pickerStateForDir,
  startMemoryPickerState,
  setPickerAccountContext,
  pickerMessages,
  selectRelevantMemories,
};
