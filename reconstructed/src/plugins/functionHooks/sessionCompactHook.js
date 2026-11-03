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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { createAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { attachToolResults, toPluginMessage } from "./sessionApi.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";

/**
 * 把插件可见的会话行还原为内部消息：助手行生成文本与 tool_use，用户行生成 tool_result 与文本。
 */
//@ chunk-e6aww6q8.js:1538522-1538936 placement
function pluginRowToMessage(e) {
  let n = e.text === "" ? [] : [{ type: "text", text: e.text }];
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
    return createAssistantMessage({ content: h.length === 0 ? "" : h });
  }
  let mapped = (e.toolResults ?? []).map((h) => ({
      type: "tool_result",
      tool_use_id: h.tool_use_id,
      content: h.text,
      ...(h.isError && { is_error: !0 }),
    })),
    s = mapped.length === 0;
  return createUserMessage({ content: s ? e.text : [...mapped, ...n] });
}
//@ chunk-e6aww6q8.js:1538936-1539024 placement
var vK = (e) => Rs({ role: e.role, text: e.text, toolUses: e.toolUses, toolResults: e.toolResults });
//@ chunk-e6aww6q8.js:1539024-1539091 placement
var V7t = (e, n, r) => ({ ...e, toolUses: e.toolUses.map(attachToolResults(n)), handle: r });
/**
 * session.compact 的行映射器：rowsOf 把消息转为插件行并记住每行对应的原消息组，messagesOf 把插件返回的行还原（未改动的行用原消息）。
 */
//@ chunk-e6aww6q8.js:1539091-1539676 placement
function createCompactRowMapper() {
  let e = new Map();
  return {
    rowsOf(n) {
      let r = new Map();
      for (let w of n) {
        let L = toPluginMessage(w)?.toolResults;
        for (let G of L ?? []) r.set(G.tool_use_id, G);
      }
      let s = [],
        h = [],
        y = [],
        S = !1;
      for (let w of n) {
        let L = toPluginMessage(w);
        if (L === void 0 && S) {
          y.push(w);
          continue;
        }
        if (L === void 0) {
          h.push(w);
          continue;
        }
        let G = V7t(L, r, w.uuid);
        ((y = [...h, w]), (h = []), (S = !0), e.set(w.uuid, { row: G, messages: y }), s.push(G));
      }
      return s;
    },
    messagesOf(n) {
      let r = new Set();
      return n.flatMap((s) => {
        let h = s.handle === void 0 ? void 0 : e.get(s.handle);
        if (!(h !== void 0 && !r.has(h.row.handle ?? "") && vK(h.row) === vK(s)))
          return [pluginRowToMessage(s)];
        return (r.add(h.row.handle ?? ""), h.messages);
      });
    },
  };
}
//@ chunk-e6aww6q8.js:1539676-1539856 placement
var compactResult = (e, n) => ({
  messages: n,
  ...(e.tokensBefore !== void 0 && { tokensBefore: e.tokensBefore }),
  ...(e.tokensAfter !== void 0 && { tokensAfter: e.tokensAfter }),
  ...(e.usage !== void 0 && { usage: e.usage }),
});
/**
 * session.compact 链底的核心处理器：用指令执行压缩，跳过则返回 skip，否则记录结果并返回行。
 */
//@ chunk-e6aww6q8.js:1539856-1540150 placement
var createCompactCore = (e, n, r) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(s) {
    let y = s.instructions === void 0 || s.instructions.trim() === "" ? void 0 : s.instructions,
      S = await e(n.messagesOf(s.messages), y);
    if (S.skip !== void 0) return { skip: S.skip };
    let rowsOf = n.rowsOf(S.messages);
    return (r.keep(s, { made: S, rows: rowsOf }), compactResult(S, rowsOf));
  },
});
//@ chunk-e6aww6q8.js:1540150-1540238 placement
var W4e = (e, n = compactResult(e, createCompactRowMapper().rowsOf(e.messages))) => ({
  kind: "core",
  record: e.record,
  result: n,
});
//@ chunk-e6aww6q8.js:1540238-1540357 placement
var sameRows = (e, n) =>
  e.length === n.length &&
  e.every((r, s) => {
    let h = n[s];
    return h !== void 0 && r.handle === h.handle && vK(r) === vK(h);
  });
//@ chunk-e6aww6q8.js:1540395-1540565 placement = getTokenCountFromUsage (0.899)
var getTokenCountFromUsage_2 = (usage) => ({
  ...usage,
  uuid: randomUUID_20(),
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
var W1r = (e) =>
  e.map((n) => (n.type === "assistant" ? getTokenCountFromUsage_2(n) : { ...n, uuid: randomUUID_21() }));
//@ chunk-e6aww6q8.js:1540674-1540788 placement
var replacedCompactResult = (e, n, r) => ({
  kind: "replaced",
  messages: W1r(n.messagesOf(e.messages).filter((s) => !isCompactBoundaryMessage_3(s))),
  record: r,
  result: e,
});
//@ chunk-e6aww6q8.js:1540788-1540825 placement
var z4e = (e) => ({ kind: "skipped", ...e });
/**
 * 运行 session.compact 钩子链并记录核心是否执行。
 */
//@ chunk-e6aww6q8.js:1540825-1541723 placement
async function dispatchSessionCompactHooks(e) {
  let {
      trigger: trigger,
      instructions: instructions,
      messages: messages,
      agentId: agentId,
      isIsolated: isIsolated,
      origin: origin,
      signal: signal,
      compact: compact,
    } = e,
    G = pluginsMatchingEvent("session.compact", { trigger: trigger, agentId: agentId }, origin);
  if (isIsolated || G.length === 0) {
    let Ie = await compact([...messages], instructions);
    return Ie.skip !== void 0 ? z4e({ reason: Ie.skip, ranCore: !0 }) : W4e(Ie);
  }
  let q = createCompactRowMapper(),
    Z = createStepRecorder(),
    Se = await NO_CORE_AT_CHAIN_BOTTOM("session.compact", {
      core: { "session.compact": createCompactCore(compact, q, Z) },
      origin: origin,
      signal: signal,
    })({
      trigger: trigger,
      ...(agentId !== void 0 && { agentId: agentId }),
      ...(instructions !== void 0 && { instructions: instructions }),
      messages: q.rowsOf(messages),
    }),
    ke = `hooked by ${G.join("+")}`,
    we = Z.ran() ? "core ran beneath" : "core never ran";
  if (Se.skip !== void 0)
    return (
      logForDebugging(`session.compact (${trigger}): skipped (${Se.skip}; ${ke}); ${we}`),
      z4e({ reason: Se.skip, ranCore: Z.ran() })
    );
  let last = Z.last();
  if (last !== void 0 && sameRows(Se.messages, last.made.rows)) return W4e(last.made.made, Se);
  return (
    logForDebugging(
      `session.compact (${trigger}): a hook's ${Se.messages.length} messages stand (${ke}); ${we}`,
    ),
    replacedCompactResult(Se, q, last?.made.made.record)
  );
}
//@ chunk-e6aww6q8.js:1541723-1541784 placement
var q4e = (e) => e.filter((n) => toPluginMessage(n) !== void 0).map((n) => n.uuid);
//@ chunk-e6aww6q8.js:1541784-1541814 placement
var u6o = UI_ENV_SITE_RULES["session.compact"];
//@ chunk-e6aww6q8.js:1541814-1542130 placement = getTokenCountFromUsage (1)
function getTokenCountFromUsage_3(usage) {
  return usage === void 0 ||
    (usage.input_tokens === 0 &&
      usage.output_tokens === 0 &&
      !usage.cache_read_input_tokens &&
      !usage.cache_creation_input_tokens)
    ? void 0
    : {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      };
}

export { u6o, q4e, getTokenCountFromUsage_3, dispatchSessionCompactHooks, W1r };
