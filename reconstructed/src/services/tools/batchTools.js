/**
 * services/tools/batchTools.ts
 *
 * 2.1.316 新增：batch_tools 批量工具调用的拆分与结果重组
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (14)
 * attribution: placement 14
 */
import { findToolByName } from "../../Tool.js";
import { isMultiEntryAliasTool } from "./permissionCheckGuard.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import {
  prefixedName,
  toolCategoryForTelemetry,
  telemetryToolCategory,
  stripSuffixNumber,
  unsupportedToolsSeen,
  SUFFIX_NUMBER_RE,
} from "../api/toolDefinitionShape.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { languageErrorNameOf } from "../../utils/errors.js";
import { getRootSession } from "../../bootstrap/state.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-a76knw89.js:11390-12492 placement
/**
 * 把一次 batch_tools 调用拆成多个 tool_use（解析失败时记录）。
 */
function expandBatchToolsCall(e, n, o) {
  let toolByName = findToolByName(n, e.name);
  if (toolByName === undefined || !isMultiEntryAliasTool(toolByName)) return null;
  let c = (s) => {
    logFeatureSad("batch_tools", s, {
      tool_name: sanitizeToolNameForAnalytics(toolByName.name),
      isMcp: false,
    });
    return [
      {
        type: "tool_use",
        id: prefixedName(e.id, 0),
        name: toolByName.name,
        input: e.input,
        ...(e.caller !== undefined && {
          caller: e.caller,
        }),
      },
    ];
  };
  try {
    let s = toolByName.inputSchema.safeParse(e.input);
    if (!s.success)
      return {
        synthetics: c("parse_failed"),
        decomposed: false,
      };
    let { v1Tool, entries } = toolByName.perEntryHookInputs(s.data);
    if (entries.length === 0)
      return {
        synthetics: c("zero_entries"),
        decomposed: false,
      };
    return {
      decomposed: true,
      synthetics: entries.map((entry, T) => {
        let input = entry;
        try {
          input = o(v1Tool, entry);
        } catch (error) {
          if (error instanceof Error && error.name === "ZodError") {
            let k =
              error instanceof ZodError ? uniq(error.issues.map((issue) => issue.code)).join(",") : "unknown";
            logForDebugging(
              `Normalizing a batch entry's input for tool=${toolCategoryForTelemetry(v1Tool)} was rejected: issues ${k}; the error text (${error.message.length} characters) is not logged`,
              {
                level: "error",
              },
            );
          } else
            logError(
              Error(
                `Normalizing a batch entry's input for tool=${telemetryToolCategory(v1Tool)} failed: ${languageErrorNameOf(error)} was thrown; its text is not logged`,
              ),
            );
        }
        return {
          type: "tool_use",
          id: prefixedName(e.id, T),
          name: v1Tool.name,
          input,
          ...(e.caller !== undefined && {
            caller: e.caller,
          }),
        };
      }),
    };
  } catch {
    return {
      synthetics: c("per_entry_threw"),
      decomposed: false,
    };
  }
}
//@ chunk-a76knw89.js:12492-12640 placement
/**
 * 有多入口别名工具时，从工具列表中去掉其底层 v1 工具。
 */
function hideAliasedV1Tools(e) {
  let n;
  for (let o of e)
    if (isMultiEntryAliasTool(o)) {
      n ??= new Set();
      n.add(o.underlyingV1ToolName);
    }
  if (n === undefined) return e;
  return e.filter((o) => !n.has(o.name));
}
//@ chunk-a76knw89.js:12640-12976 placement
function isBatchToolsUse(e, tools, o) {
  let r;
  let c = [];
  for (let j = 0; j < e.length; j++) {
    let u = e[j];
    if (u.type !== "tool_use") {
      r?.push(u);
      continue;
    }
    let p = expandBatchToolsCall(u, tools, o);
    if (p === null) {
      r?.push(u);
      continue;
    }
    r ??= e.slice(0, j);
    r.push(...p.synthetics);
    if (p.decomposed) {
      c.push({
        id: u.id,
        name: u.name,
      });
      logFeatureOk("batch_tools", {
        tool_name: sanitizeToolNameForAnalytics(u.name),
        isMcp: false,
      });
    }
  }
  return {
    content: r ?? e,
    batchToolUses: c,
  };
}
//@ chunk-a76knw89.js:12976-13680 placement
/**
 * 把拆开调用的结果按原 batch 重新组合成一个 tool_result。
 */
function reassembleBatchResults(content, batchToolUses, tools) {
  if (batchToolUses === undefined || batchToolUses.length === 0) return content;
  let r = new Map();
  for (let p of batchToolUses) if (!r.has(p.id)) r.set(p.id, p);
  let c = new Map();
  for (let p of r.values()) {
    let toolByName = findToolByName(tools, p.name);
    if (toolByName === undefined || !isMultiEntryAliasTool(toolByName)) continue;
    let T = [];
    let y;
    for (let b of content)
      if (b.type === "tool_use" && stripSuffixNumber(b.id) === p.id) {
        y ??= b;
        T.push(b.input);
      }
    try {
      c.set(p.id, {
        type: "tool_use",
        id: p.id,
        name: p.name,
        input: toolByName.reassemble(T),
        ...(y?.caller !== undefined && {
          caller: y.caller,
        }),
      });
    } catch {
      let b = unsupportedToolsSeen.of(getRootSession().host);
      if (!b.has(p.id)) {
        b.add(p.id);
        logFeatureSad("batch_tools", "reassemble_threw", {
          tool_name: sanitizeToolNameForAnalytics(p.name),
          isMcp: false,
        });
      }
    }
  }
  let s = new Set();
  let u = [];
  for (let p of content) {
    if (p.type === "tool_use") {
      let h = stripSuffixNumber(p.id);
      if (h !== undefined && c.has(h)) {
        if (!s.has(h)) {
          s.add(h);
          u.push(c.get(h));
        }
        continue;
      }
    }
    u.push(p);
  }
  return u;
}
//@ chunk-a76knw89.js:13680-14996 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let o = false;
  for (let message of messages) {
    if (message.type === "assistant") {
      for (let p of message.message.content)
        if (p.type === "tool_use") {
          let toolByName = findToolByName(sinceUuid, p.name);
          if (toolByName !== undefined && isMultiEntryAliasTool(toolByName)) o = true;
        }
    }
    if (message.type === "user" && !o) {
      if (
        Array.isArray(message.message.content) &&
        message.message.content.some(
          (p) => p.type === "tool_result" && stripSuffixNumber(p.tool_use_id) !== undefined,
        )
      )
        o = true;
    }
  }
  if (!o) return messages;
  let r = new Map();
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let p of message.message.content) if (p.type === "tool_use") r.set(p.id, p);
  }
  let c = new Map();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let p of message.message.content) {
      if (p.type !== "tool_result") continue;
      let h = stripSuffixNumber(p.tool_use_id);
      if (h === undefined || !r.has(h)) continue;
      let T = c.get(h);
      if (T === undefined) {
        T = new Map();
        c.set(h, T);
      }
      if (!T.has(p.tool_use_id)) T.set(p.tool_use_id, p);
    }
  }
  if (c.size === 0) return messages;
  let s = new Set();
  return messages.flatMap((block) => {
    if (block.type !== "user" || !Array.isArray(block.message.content)) return [block];
    let p = false;
    let h = [];
    for (let T of block.message.content) {
      if (T.type !== "tool_result") {
        h.push(T);
        continue;
      }
      let toolUseId = stripSuffixNumber(T.tool_use_id);
      let b = toolUseId !== undefined ? c.get(toolUseId) : undefined;
      if (toolUseId === undefined || b === undefined) {
        h.push(T);
        continue;
      }
      p = true;
      if (s.has(toolUseId)) continue;
      s.add(toolUseId);
      let k = r.get(toolUseId);
      let toolByName = findToolByName(sinceUuid, k.name);
      let x = toolByName !== undefined && isMultiEntryAliasTool(toolByName) ? toolByName : undefined;
      h.push(formatBatchResultEntries(x, toolUseId, NO_RESULT_TEXT(x, k.input, toolUseId, b)));
    }
    if (!p) return [block];
    if (h.length === 0) return [];
    return [
      {
        ...block,
        message: {
          ...block.message,
          content: h,
        },
      },
    ];
  });
}
//@ chunk-a76knw89.js:14996-15391 placement
function NO_RESULT_TEXT(e, n, o, r) {
  let c;
  if (e !== undefined)
    try {
      let u = e.inputSchema.safeParse(n);
      if (u.success) c = e.perEntryHookInputs(u.data).entries;
    } catch {}
  let s = c?.length ?? 0;
  for (let key of r.keys()) {
    let match = SUFFIX_NUMBER_RE.exec(key);
    if (match) s = Math.max(s, Number(match[1]) + 1);
  }
  if (s > 1000) s = c?.length ?? r.size;
  return Array.from(
    {
      length: s,
    },
    (u, p) => {
      let h = r.get(prefixedName(o, p));
      return h !== undefined
        ? {
            input: c?.[p],
            result: h,
          }
        : {
            input: c?.[p],
            error: "no result",
          };
    },
  );
}
//@ chunk-a76knw89.js:15391-16297 placement
function formatBatchResultEntries(e, toolUseId, o) {
  let r = [];
  let c = "";
  let s = false;
  let u = (h) => {
    if (h.length > 0)
      c =
        c === ""
          ? h
          : `${c}
${h}`;
  };
  let p = () => {
    if (c !== "") {
      r.push({
        type: "text",
        text: c,
      });
      c = "";
    }
  };
  for (let [h, T] of o.entries()) {
    let y = T.result === undefined || T.result.is_error === true;
    if (y) s = true;
    u(`--- entry ${h + 1}${y ? " (error)" : ""} ---`);
    if (T.result !== undefined) {
      let content = T.result.content;
      if (typeof content === "string") u(content);
      else if (Array.isArray(content))
        for (let k of content)
          if (k.type === "text") u(k.text);
          else {
            p();
            r.push(k);
          }
    } else u(`[entry ${h + 1} error: ${T.error ?? "no result"}]`);
  }
  if (o.length === 1 && e !== undefined)
    u(
      `<system-reminder>Tip: ${e.name} accepts multiple entries in one call (\`${e.entryFieldName}: [{...}, {...}]\`). Batching related operations into a single call is faster than issuing them as separate or parallel calls. No action needed for this result.</system-reminder>`,
    );
  p();
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: r.length === 1 && r[0]?.type === "text" ? r[0].text : r,
    ...(s && {
      is_error: true,
    }),
  };
}
//@ chunk-a76knw89.js:16297-16312 placement
/**
 * 别名 → 工具定义的注册表。
 */
var toolAliasRegistry = new Map();
//@ chunk-a76knw89.js:16312-16345 placement
/**
 * 按别名查工具定义。
 */
function toolByAlias(e) {
  return toolAliasRegistry.get(e);
}
//@ chunk-a76knw89.js:16345-16430 placement
/**
 * 把别名列表映射成当前启用中的工具定义。
 */
function enabledToolsForAliases(e) {
  return e
    .map(toolByAlias)
    .filter((n) => n !== undefined)
    .filter((n) => n.isEnabled());
}
//@ chunk-a76knw89.js:16430-16504 placement
/**
 * 把工具的内部 V1 名换成当前对外名。
 */
function canonicalToolName(e, tools) {
  return tools.find((o) => o.underlyingV1ToolName === e)?.name ?? e;
}
//@ chunk-a76knw89.js:16504-16568 placement
/**
 * 按工具名反查它的别名。
 */
function aliasOfToolName(e) {
  for (let [n, o] of toolAliasRegistry) if (o.name === e) return n;
  return;
}
//@ chunk-a76knw89.js:16568-16634 placement
var TENGU_MARLIN_THICKET = "tengu_marlin_thicket";
var MARLIN_THICKET_FLAG = "ide";
var ideReadSlot = new SessionRootSlot(() => ({
  read: false,
}));
//@ chunk-a76knw89.js:16634-16692 placement
/**
 * 取对象自身的属性（不存在时 undefined）。
 */
function ownField(mcpLegacyKeyOwners, n) {
  return mcpLegacyKeyOwners && Object.hasOwn(mcpLegacyKeyOwners, n) ? mcpLegacyKeyOwners[n] : undefined;
}
export {
  reassembleBatchResults,
  countToolCallsSince,
  isBatchToolsUse,
  toolByAlias,
  aliasOfToolName,
  hideAliasedV1Tools,
  enabledToolsForAliases,
  ownField,
  ideReadSlot,
  TENGU_MARLIN_THICKET,
  MARLIN_THICKET_FLAG,
  canonicalToolName,
};
