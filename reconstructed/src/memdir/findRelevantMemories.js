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
import { aN } from "../utils/sideQuery.js";
import {
  MEMORY_SELECTOR_PROMPT,
  SELECTOR_MAX_TOKENS,
  tryModelsUntilAccepted,
  iterateSelectorModels,
  regExp_16,
  hCn,
} from "./memoryRecallSelect.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonParse } from "../utils/slowOperations.js";
import { $U } from "../utils/json.js";
import { errorMessage } from "../utils/errors.js";
import { getAutoMemEntrypoint, getAutoMemPath } from "./paths.js";
import { scanMemoryFiles } from "./memoryScan.js";

//@ chunk-e6aww6q8.js:1628861-1628888 placement
var MEMDIR_RELEVANCE = "memdir_relevance";
//@ chunk-e6aww6q8.js:1628888-1628940 placement
function efe() {
  return { stateByDir: {}, lastUsage: null };
}
//@ chunk-e6aww6q8.js:1628940-1629001 placement
function i6(e) {
  if (!e) return;
  ((e.stateByDir = {}), (e.lastUsage = null));
}
//@ chunk-e6aww6q8.js:1629001-1629042 placement
function XJt(e, n) {
  return e.stateByDir[n];
}
/**
 * 为某个记忆目录建立挑选器对话状态：首条用户消息列出可用记忆（可带缓存控制），保留旧对话的后续消息与账号上下文。
 */
//@ chunk-e6aww6q8.js:1629042-1629370 placement
function startMemoryPickerState(e, n, r, s, h, y) {
  let S = e.stateByDir[n],
    w = {
      memories: r,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Available memories:
${s}`,
              ...(h && { cache_control: h }),
            },
          ],
        },
        ...(S?.messages.slice(1) ?? []),
      ],
      hydrated: y,
      ...(S?.account && { account: S.account }),
      ...(S?.accountScope !== void 0 && { accountScope: S.accountScope }),
    };
  return ((e.stateByDir[n] = w), w);
}
/**
 * 把一问一答追加到记忆挑选器对话里，返回撤销函数（最后一条仍是这次回答时删掉这两条）。
 */
//@ chunk-e6aww6q8.js:1629370-1629679 placement
function appendPickerExchange(e, n, r, s) {
  let h = e.stateByDir[n];
  if (!h) return () => {};
  let y = { role: "assistant", content: [{ type: "text", text: s }] };
  return (
    (e.stateByDir[n] = {
      ...h,
      messages: [...h.messages, { role: "user", content: [{ type: "text", text: r }] }, y],
    }),
    () => {
      let S = e.stateByDir[n];
      if (S?.messages.at(-1) === y) S.messages = S.messages.slice(0, -2);
    }
  );
}
/**
 * 设置记忆挑选器的账号上下文消息：账号范围变化时截断对话并清除旧账号；同一账号 key 不重复设置。
 */
//@ chunk-e6aww6q8.js:1629679-1630077 placement
function setPickerAccountContext(e, n, r, s, h = r?.scope) {
  let y = e.stateByDir[n];
  if (!y) return;
  if (h !== void 0 && y.accountScope !== void 0 && y.accountScope !== h)
    ((y.messages = y.messages.slice(0, 1)), delete y.account);
  if (h !== void 0) y.accountScope = h;
  if (r === void 0) {
    delete y.account;
    return;
  }
  if (y.account?.key === r.key) return;
  y.account = {
    key: r.key,
    names: r.names,
    message: { role: "user", content: [{ type: "text", text: r.text, ...(s && { cache_control: s }) }] },
  };
}
/**
 * 生成记忆挑选器发送的消息列表：首条清单消息后插入账号上下文消息（如有），再接其余对话。
 */
//@ chunk-e6aww6q8.js:1630077-1630181 placement
function pickerMessages(e) {
  let [n, ...r] = e.messages;
  return n === void 0 ? r : [n, ...(e.account ? [e.account.message] : []), ...r];
}
/**
 * 用小模型从记忆清单中挑选与当前查询相关的记忆（JSON schema 输出），结果用于自动注入相关记忆。
 */
//@ chunk-e6aww6q8.js:3306853-3308623 fingerprint = selectRelevantMemories (0.434)
async function selectRelevantMemories(e) {
  let {
      query: query,
      memoryDir: memoryDir,
      selectorCtx: selectorCtx,
      history: history,
      turnCount: turnCount,
      byFilename: byFilename,
      accountNames: accountNames,
      cacheControl: cacheControl,
      signal: signal,
      credentials: credentials,
      selectorTurnReverts: selectorTurnReverts,
    } = e,
    Se = (Ee) => byFilename.has(Ee) || accountNames.has(Ee),
    ke = `Select memories relevant to:
${query}`,
    we = (Ee) => {
      let [Ae, Ie] = getSideQueryThinkingSettings(Ee);
      return aN({
        model: Ee,
        system: [{ type: "text", text: MEMORY_SELECTOR_PROMPT, cache_control: cacheControl }],
        skipSystemPromptPrefix: !0,
        messages: [
          ...history,
          { role: "user", content: [{ type: "text", text: ke, cache_control: cacheControl }] },
        ],
        max_tokens: SELECTOR_MAX_TOKENS + Ie,
        thinking: Ae,
        output_format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { selected_memories: { type: "array", items: { type: "string" } } },
            required: ["selected_memories"],
            additionalProperties: !1,
          },
        },
        signal: signal,
        querySource: MEMDIR_RELEVANCE,
        credentials: credentials,
      });
    };
  try {
    let { result: Ee, refusals: refusals } = await tryModelsUntilAccepted(
      iterateSelectorModels(),
      we,
      signal,
    );
    if (Ee.stop_reason === "max_tokens")
      return (
        logFeatureSad("memory_recall_select", "output_truncated"),
        logForDebugging("[memdir] selectRelevantMemories truncated at max_tokens", { level: "warn" }),
        []
      );
    let textBlock = Ee.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text")
      return (
        logFeatureSad("memory_recall_select", "no_text_block"),
        logForDebugging("[memdir] selectRelevantMemories returned no text block", { level: "warn" }),
        []
      );
    let parsed = jsonParse($U(textBlock.text));
    if (
      (selectorTurnReverts.unshift(appendPickerExchange(selectorCtx, memoryDir, ke, textBlock.text)),
      (selectorCtx.lastUsage = {
        cacheReadInputTokens: Ee.usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: Ee.usage.cache_creation_input_tokens ?? 0,
        turnCount: turnCount,
      }),
      refusals === 0)
    )
      logFeatureOk("memory_recall_select");
    else logFeatureSad("memory_recall_select", "selector_model_fell_back");
    return parsed.selected_memories
      .map((selected_memory) =>
        typeof selected_memory !== "string" || Se(selected_memory)
          ? selected_memory
          : selected_memory.replace(regExp_16, ""),
      )
      .filter((We) => typeof We === "string" && Se(We));
  } catch (error) {
    if (((selectorCtx.lastUsage = null), signal.aborted)) return [];
    return (
      logFeatureSad(
        "memory_recall_select",
        hCn(error) ? "every_selector_model_refused" : "memory_recall_select_query_failed",
      ),
      logForDebugging(`[memdir] selectRelevantMemories failed: ${errorMessage(error)}`, { level: "warn" }),
      []
    );
  }
}
//@ chunk-7sekx49c.js:12092-12145 affinity
var MEMORY_INDEX_NAME = "MEMORY.md",
  _ = "Index of saved memories",
  N = 5000;
/**
 * 列出可召回的记忆：MEMORY.md 索引本身 + scanMemoryFiles 结果（5 秒超时），去掉与入口同一 inode 的重复。
 */
//@ chunk-7sekx49c.js:12145-12672 fingerprint = findRelevantMemories (0.534)
async function findRelevantMemories(o) {
  let e = [],
    l = getAutoMemEntrypoint(),
    n = await stat(l).then(
      (t) => (t.isFile() ? t : null),
      () => null,
    );
  if (n !== null)
    e.push({ name: MEMORY_INDEX_NAME, path: l, description: _, type: null, modified_ms: n.mtimeMs });
  let u = await scanMemoryFiles(getAutoMemPath(), AbortSignal.timeout(N), o);
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
  efe,
  i6,
  findRelevantMemories,
  MEMDIR_RELEVANCE,
  XJt,
  startMemoryPickerState,
  setPickerAccountContext,
  pickerMessages,
  selectRelevantMemories,
};
