/**
 * plugins/functionHooks/sessionCompactHook.ts
 *
 * 2.1.316 新增：session.compact 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import { randomUUID } from "crypto";
import { createAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { attachToolResults, toPluginMessage } from "./sessionApi.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";

//@ chunk-e6aww6q8.js:1538522-1538936 placement
/**
 * 把插件可见的会话行还原为内部消息：助手行生成文本与 tool_use，用户行生成 tool_result 与文本。
 */
function pluginRowToMessage(e) {
  let n =
    e.text === ""
      ? []
      : [
          {
            type: "text",
            text: e.text,
          },
        ];
  if (e.role === "assistant") {
    let h = [
      ...n,
      ...e.toolUses.map((toolUse) => ({
        type: "tool_use",
        id: toolUse.tool_use_id,
        name: toolUse.tool,
        input: toolUse.input,
      })),
    ];
    return createAssistantMessage({
      content: h.length === 0 ? "" : h,
    });
  }
  let mapped = (e.toolResults ?? []).map((h) => ({
    type: "tool_result",
    tool_use_id: h.tool_use_id,
    content: h.text,
    ...(h.isError && {
      is_error: true,
    }),
  }));
  let s = mapped.length === 0;
  return createUserMessage({
    content: s ? e.text : [...mapped, ...n],
  });
}
//@ chunk-e6aww6q8.js:1538936-1539024 placement
/**
 * 构造插件行
 */
var pluginRow = (e) =>
  stableStringifySafe({
    role: e.role,
    text: e.text,
    toolUses: e.toolUses,
    toolResults: e.toolResults,
  });
//@ chunk-e6aww6q8.js:1539024-1539091 placement
/**
 * 附上工具结果与句柄
 */
var withToolResults = (pluginMessage, n, handle) => ({
  ...pluginMessage,
  toolUses: pluginMessage.toolUses.map(attachToolResults(n)),
  handle,
});
//@ chunk-e6aww6q8.js:1539091-1539676 placement
/**
 * session.compact 的行映射器：rowsOf 把消息转为插件行并记住每行对应的原消息组，messagesOf 把插件返回的行还原（未改动的行用原消息）。
 */
function createCompactRowMapper() {
  let e = new Map();
  return {
    rowsOf(n) {
      let r = new Map();
      for (let w of n) {
        let toolResults = toPluginMessage(w)?.toolResults;
        for (let G of toolResults ?? []) r.set(G.tool_use_id, G);
      }
      let s = [];
      let h = [];
      let y = [];
      let S = false;
      for (let w of n) {
        let pluginMessage = toPluginMessage(w);
        if (pluginMessage === undefined && S) {
          y.push(w);
          continue;
        }
        if (pluginMessage === undefined) {
          h.push(w);
          continue;
        }
        let G = withToolResults(pluginMessage, r, w.uuid);
        y = [...h, w];
        h = [];
        S = true;
        e.set(w.uuid, {
          row: G,
          messages: y,
        });
        s.push(G);
      }
      return s;
    },
    messagesOf(n) {
      let r = new Set();
      return n.flatMap((s) => {
        let h = s.handle === undefined ? undefined : e.get(s.handle);
        if (!(h !== undefined && !r.has(h.row.handle ?? "") && pluginRow(h.row) === pluginRow(s)))
          return [pluginRowToMessage(s)];
        r.add(h.row.handle ?? "");
        return h.messages;
      });
    },
  };
}
//@ chunk-e6aww6q8.js:1539676-1539856 placement
var compactResult = (e, messages) => ({
  messages,
  ...(e.tokensBefore !== undefined && {
    tokensBefore: e.tokensBefore,
  }),
  ...(e.tokensAfter !== undefined && {
    tokensAfter: e.tokensAfter,
  }),
  ...(e.usage !== undefined && {
    usage: e.usage,
  }),
});
//@ chunk-e6aww6q8.js:1539856-1540150 placement
/**
 * session.compact 链底的核心处理器：用指令执行压缩，跳过则返回 skip，否则记录结果并返回行。
 */
var createCompactCore = (compact, compactRowMapper, stepRecorder) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(s) {
    let instructions =
      s.instructions === undefined || s.instructions.trim() === "" ? undefined : s.instructions;
    let S = await compact(compactRowMapper.messagesOf(s.messages), instructions);
    if (S.skip !== undefined)
      return {
        skip: S.skip,
      };
    let messages = compactRowMapper.rowsOf(S.messages);
    stepRecorder.keep(s, {
      made: S,
      rows: messages,
    });
    return compactResult(S, messages);
  },
});
//@ chunk-e6aww6q8.js:1540150-1540238 placement
/**
 * session.compact 核心步骤
 */
var compactCoreStep = (e, result = compactResult(e, createCompactRowMapper().rowsOf(e.messages))) => ({
  kind: "core",
  record: e.record,
  result,
});
//@ chunk-e6aww6q8.js:1540238-1540357 placement
var sameRows = (messages, rows) =>
  messages.length === rows.length &&
  messages.every((r, s) => {
    let h = rows[s];
    return h !== undefined && r.handle === h.handle && pluginRow(r) === pluginRow(h);
  });
//@ chunk-e6aww6q8.js:1540395-1540565 placement = getTokenCountFromUsage (0.899)
var getTokenCountFromUsage_2 = (usage) => ({
  ...usage,
  uuid: randomUUID(),
  message: {
    ...usage.message,
    usage: {
      ...usage.message.usage,
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  },
});
//@ chunk-e6aww6q8.js:1540603-1540674 placement
/**
 * 助手行换新 uuid
 */
var reuuidAssistantRows = (messages) =>
  messages.map((n) =>
    n.type === "assistant"
      ? getTokenCountFromUsage_2(n)
      : {
          ...n,
          uuid: randomUUID(),
        },
  );
//@ chunk-e6aww6q8.js:1540674-1540788 placement
var replacedCompactResult = (e, compactRowMapper, record) => ({
  kind: "replaced",
  messages: reuuidAssistantRows(
    compactRowMapper.messagesOf(e.messages).filter((s) => !isCompactBoundaryMessage_3(s)),
  ),
  record,
  result: e,
});
//@ chunk-e6aww6q8.js:1540788-1540825 placement
/**
 * 跳过压缩
 */
var skippedCompact = (e) => ({
  kind: "skipped",
  ...e,
});
//@ chunk-e6aww6q8.js:1540825-1541723 placement
/**
 * 运行 session.compact 钩子链并记录核心是否执行。
 */
async function dispatchSessionCompactHooks(e) {
  let { trigger, instructions, messages, agentId, isIsolated, origin, signal, compact } = e;
  let G = pluginsMatchingEvent(
    "session.compact",
    {
      trigger,
      agentId,
    },
    origin,
  );
  if (isIsolated || G.length === 0) {
    let Ie = await compact([...messages], instructions);
    return Ie.skip !== undefined
      ? skippedCompact({
          reason: Ie.skip,
          ranCore: true,
        })
      : compactCoreStep(Ie);
  }
  let compactRowMapper = createCompactRowMapper();
  let stepRecorder = createStepRecorder();
  let result = await NO_CORE_AT_CHAIN_BOTTOM("session.compact", {
    core: {
      "session.compact": createCompactCore(compact, compactRowMapper, stepRecorder),
    },
    origin,
    signal,
  })({
    trigger,
    ...(agentId !== undefined && {
      agentId,
    }),
    ...(instructions !== undefined && {
      instructions,
    }),
    messages: compactRowMapper.rowsOf(messages),
  });
  let ke = `hooked by ${G.join("+")}`;
  let we = stepRecorder.ran() ? "core ran beneath" : "core never ran";
  if (result.skip !== undefined) {
    logForDebugging(`session.compact (${trigger}): skipped (${result.skip}; ${ke}); ${we}`);
    return skippedCompact({
      reason: result.skip,
      ranCore: stepRecorder.ran(),
    });
  }
  let Ee = stepRecorder.last();
  if (Ee !== undefined && sameRows(result.messages, Ee.made.rows))
    return compactCoreStep(Ee.made.made, result);
  logForDebugging(
    `session.compact (${trigger}): a hook's ${result.messages.length} messages stand (${ke}); ${we}`,
  );
  return replacedCompactResult(result, compactRowMapper, Ee?.made.made.record);
}
//@ chunk-e6aww6q8.js:1541723-1541784 placement
/**
 * 保留下层的行 uuid
 */
var keptRowUuids = (e) => e.filter((n) => toPluginMessage(n) !== undefined).map((n) => n.uuid);
//@ chunk-e6aww6q8.js:1541784-1541814 placement
/**
 * session.compact 站点规则
 */
var SESSION_COMPACT_RULES = UI_ENV_SITE_RULES["session.compact"];
//@ chunk-e6aww6q8.js:1541814-1542130 placement = getTokenCountFromUsage (1)
function getTokenCountFromUsage_3(usage) {
  return usage === undefined ||
    (usage.input_tokens === 0 &&
      usage.output_tokens === 0 &&
      !usage.cache_read_input_tokens &&
      !usage.cache_creation_input_tokens)
    ? undefined
    : {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      };
}
export {
  SESSION_COMPACT_RULES,
  keptRowUuids,
  getTokenCountFromUsage_3,
  dispatchSessionCompactHooks,
  reuuidAssistantRows,
};
