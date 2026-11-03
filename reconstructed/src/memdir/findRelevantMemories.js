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
function pickerStateForDir(e, n) {
  return e.stateByDir[n];
}
//@ chunk-e6aww6q8.js:1629042-1629370 placement
/**
 * 为某个记忆目录建立挑选器对话状态：首条用户消息列出可用记忆（可带缓存控制），保留旧对话的后续消息与账号上下文。
 */
function startMemoryPickerState(e, n, memories, s, h, hydrated) {
  let S = e.stateByDir[n];
  let w = {
    memories,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Available memories:
${s}`,
            ...(h && {
              cache_control: h,
            }),
          },
        ],
      },
      ...(S?.messages.slice(1) ?? []),
    ],
    hydrated,
    ...(S?.account && {
      account: S.account,
    }),
    ...(S?.accountScope !== undefined && {
      accountScope: S.accountScope,
    }),
  };
  e.stateByDir[n] = w;
  return w;
}
//@ chunk-e6aww6q8.js:1629370-1629679 placement
/**
 * 把一问一答追加到记忆挑选器对话里，返回撤销函数（最后一条仍是这次回答时删掉这两条）。
 */
function appendPickerExchange(selectorCtx, memoryDir, text, text_2) {
  let h = selectorCtx.stateByDir[memoryDir];
  if (!h) return () => {};
  let y = {
    role: "assistant",
    content: [
      {
        type: "text",
        text: text_2,
      },
    ],
  };
  selectorCtx.stateByDir[memoryDir] = {
    ...h,
    messages: [
      ...h.messages,
      {
        role: "user",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
      y,
    ],
  };
  return () => {
    let S = selectorCtx.stateByDir[memoryDir];
    if (S?.messages.at(-1) === y) S.messages = S.messages.slice(0, -2);
  };
}
//@ chunk-e6aww6q8.js:1629679-1630077 placement
/**
 * 设置记忆挑选器的账号上下文消息：账号范围变化时截断对话并清除旧账号；同一账号 key 不重复设置。
 */
function setPickerAccountContext(e, n, r, s, h = r?.scope) {
  let y = e.stateByDir[n];
  if (!y) return;
  if (h !== undefined && y.accountScope !== undefined && y.accountScope !== h) {
    y.messages = y.messages.slice(0, 1);
    delete y.account;
  }
  if (h !== undefined) y.accountScope = h;
  if (r === undefined) {
    delete y.account;
    return;
  }
  if (y.account?.key === r.key) return;
  y.account = {
    key: r.key,
    names: r.names,
    message: {
      role: "user",
      content: [
        {
          type: "text",
          text: r.text,
          ...(s && {
            cache_control: s,
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
function pickerMessages(e) {
  let [n, ...r] = e.messages;
  return n === undefined ? r : [n, ...(e.account ? [e.account.message] : []), ...r];
}
//@ chunk-e6aww6q8.js:3306853-3308623 fingerprint = selectRelevantMemories (0.434)
/**
 * 用小模型从记忆清单中挑选与当前查询相关的记忆（JSON schema 输出），结果用于自动注入相关记忆。
 */
async function selectRelevantMemories(e) {
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
  } = e;
  let Se = (Ee) => byFilename.has(Ee) || accountNames.has(Ee);
  let text = `Select memories relevant to:
${query}`;
  let we = (Ee) => {
    let [Ae, Ie] = getSideQueryThinkingSettings(Ee);
    return sideQueryWithCounter({
      model: Ee,
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
      max_tokens: SELECTOR_MAX_TOKENS + Ie,
      thinking: Ae,
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
    let { result: Ee, refusals } = await tryModelsUntilAccepted(iterateSelectorModels(), we, signal);
    if (Ee.stop_reason === "max_tokens") {
      logFeatureSad("memory_recall_select", "output_truncated");
      logForDebugging("[memdir] selectRelevantMemories truncated at max_tokens", {
        level: "warn",
      });
      return [];
    }
    let textBlock = Ee.content.find((block) => block.type === "text");
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
      cacheReadInputTokens: Ee.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: Ee.usage.cache_creation_input_tokens ?? 0,
      turnCount,
    };
    if (refusals === 0) logFeatureOk("memory_recall_select");
    else logFeatureSad("memory_recall_select", "selector_model_fell_back");
    return parsed.selected_memories
      .map((selectedMemory) =>
        typeof selectedMemory !== "string" || Se(selectedMemory)
          ? selectedMemory
          : selectedMemory.replace(regExp_16, ""),
      )
      .filter((We) => typeof We === "string" && Se(We));
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
//@ chunk-7sekx49c.js:12145-12672 fingerprint = findRelevantMemories (0.534)
/**
 * 列出可召回的记忆：MEMORY.md 索引本身 + scanMemoryFiles 结果（5 秒超时），去掉与入口同一 inode 的重复。
 */
async function findRelevantMemories(storageV5) {
  let e = [];
  let autoMemEntrypoint = getAutoMemEntrypoint();
  let n = await stat(autoMemEntrypoint).then(
    (t) => (t.isFile() ? t : null),
    () => null,
  );
  if (n !== null)
    e.push({
      name: MEMORY_INDEX_NAME,
      path: autoMemEntrypoint,
      description: _,
      type: null,
      modified_ms: n.mtimeMs,
    });
  let u = await scanMemoryFiles(getAutoMemPath(), AbortSignal.timeout(MEMORY_SCAN_TIMEOUT_MS), storageV5);
  for (let t of u) {
    if (
      n !== null &&
      !t.filename.includes(sep) &&
      t.filename.toLowerCase() === MEMORY_INDEX_NAME.toLowerCase()
    ) {
      let i = await stat(t.filePath).catch(() => null);
      if (i !== null && i.dev === n.dev && i.ino === n.ino) continue;
    }
    e.push({
      name: t.filename,
      path: t.filePath,
      description: t.description,
      type: t.type ?? null,
      modified_ms: t.modifiedMs,
    });
  }
  return e;
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
