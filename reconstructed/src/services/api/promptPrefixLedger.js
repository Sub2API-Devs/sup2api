/**
 * services/api/promptPrefixLedger.ts
 *
 * 2.1.316 新增：记录已发送提示前缀以检测缓存前缀被破坏
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import {
  snapshotRequestForCacheDiff,
  describeSnapshotDiff,
  isCacheFingerprintPart,
  ledgerComparableView,
  seedLedgerSnapshot,
  isDeferredTool,
} from "./promptCacheBreakDetection.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { escapeAngleBrackets } from "../../utils/sanitization.js";
import { P3 } from "../../../vendor/diff/libesm/patch/create.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { exactKeyValue } from "./toolDefinitionShape.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  literal,
  string,
  array,
  looseObject,
  M,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { promptPrefixLedgerFor, querySourceBucket } from "./toolSchemaWire.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:1516687-1518151 placement
/**
 * 提示前缀账本：记录已发送的前缀边界，检测模型切换或内容变化导致的缓存前缀失效。
 */
class PromptPrefixLedger {
  conversations = new WeakMap();
  check(e, n, { bindReferencedDeferredTools: r = false } = {}) {
    let s = snapshotRequestForCacheDiff(n, {
      bindReferencedDeferredTools: r,
    });
    let h = this.conversations.get(e);
    if (h === undefined) {
      h = {
        committed: undefined,
        pending: undefined,
        declared: undefined,
        committedCount: 0,
      };
      this.conversations.set(e, h);
    }
    h.pending = s;
    if (h.committed === undefined)
      return {
        status: "boundary",
        boundary: "start",
      };
    if (h.committed.model !== s.model)
      return {
        status: "boundary",
        boundary: "model_switch",
      };
    if (h.declared !== undefined)
      return {
        status: "boundary",
        boundary: h.declared,
      };
    let y = describeSnapshotDiff(h.committed, s);
    let mapped = y.filter(isCacheFingerprintPart).map(toPrefixChangeSite);
    if (mapped.length === 0)
      return {
        status: "ok",
        changes: y,
      };
    return {
      status: "violated",
      violations: mapped,
      changes: y,
      requestOrdinal: h.committedCount + 1,
      committed: ledgerComparableView(h.committed),
      outgoing: ledgerComparableView(s),
    };
  }
  commit(e) {
    let n = this.conversations.get(e);
    if (n?.pending === undefined) return;
    n.committed = n.pending;
    n.pending = undefined;
    n.declared = undefined;
    n.committedCount += 1;
  }
  rebase(e, n) {
    let r = this.conversations.get(e);
    if (r === undefined) {
      this.conversations.set(e, {
        committed: undefined,
        pending: undefined,
        declared: n,
        committedCount: 0,
      });
      return;
    }
    r.declared ??= n;
  }
  preview(e, n) {
    let r = this.conversations.get(e);
    if (r?.committed === undefined || r.declared !== undefined || r.committed.model !== n.model) return;
    return describeSnapshotDiff(r.committed, snapshotRequestForCacheDiff(n));
  }
  committedPrefix(e) {
    let committed = this.conversations.get(e)?.committed;
    return committed && ledgerComparableView(committed);
  }
  seed(e, n) {
    let r = this.conversations.get(e);
    if (r?.committed !== undefined) return false;
    this.conversations.set(e, {
      committed: seedLedgerSnapshot(n),
      pending: r?.pending,
      declared: r?.declared,
      committedCount: 0,
    });
    return true;
  }
}
//@ chunk-e6aww6q8.js:1518151-1518351 placement
function toPrefixChangeSite(e) {
  switch (e.part) {
    case "tool":
      return toToolChangeSite(e);
    case "system":
      return {
        segment: "system",
        kind: e.kind,
        index: e.index,
      };
    case "message":
      return {
        segment: "messages",
        kind: e.kind,
        index: e.index,
        role: e.role,
      };
  }
}
//@ chunk-e6aww6q8.js:1518351-1518657 placement
/**
 * 把工具列表差异项转换为提示前缀变化位置（变更、删除、新增、重排），标注是否为延迟工具。
 */
function toToolChangeSite(e) {
  switch (e.kind) {
    case "changed":
      return {
        segment: "tools",
        kind: "changed",
        tool: e.id,
        field: e.field,
        ...(isDeferredTool(e.prev) && {
          deferred: true,
        }),
      };
    case "removed":
      return {
        segment: "tools",
        kind: "removed",
        tool: e.id,
        ...(isDeferredTool(e.prev) && {
          deferred: true,
        }),
      };
    case "added":
    case "reordered":
      return {
        segment: "tools",
        kind: e.kind,
        tool: e.id,
      };
  }
}
//@ chunk-e6aww6q8.js:1518657-1518687 placement
var MAX_INLINE_DIFF_CHARS = 1200;
var MAX_SNAPSHOT_CHARS = 2400;
var MAX_DIFF_EDIT_LENGTH = 400;
//@ chunk-e6aww6q8.js:1518687-1519051 placement
/**
 * 汇总工具 schema 变化，生成"以下内容自首次发送后已变化"的提示文本和已告知的位置表。
 */
function buildPrefixChangeNotice(changes, announced) {
  let r = [];
  let s = new Map();
  for (let change of changes) {
    let y = describeToolSchemaChange(change, announced);
    if (y === undefined) continue;
    r.push(y.text);
    s.set(y.site, y.value);
  }
  if (r.length === 0) return;
  return {
    text: [
      "The following changed since it was first sent in this conversation. The earlier text above stays as sent; where they differ, the current version below is the one in effect.",
      ...r,
    ].join(`

`),
    told: s,
  };
}
//@ chunk-e6aww6q8.js:1519051-1519928 placement
function describeToolSchemaChange(change, announced) {
  switch (change.part) {
    case "tool": {
      if (change.kind !== "changed") return;
      let r = `tool:${change.id}:${change.field}`;
      let s = fieldAsText(change.next, change.field);
      if (announced.get(r) === s) return;
      let h = announced.get(r) ?? fieldAsText(change.prev, change.field);
      let serverName = mcpInfoFromString(change.id)?.serverName;
      let S =
        change.field === "description"
          ? "description"
          : change.field === "input_schema"
            ? "input schema"
            : `\`${change.field}\` field`;
      let w =
        serverName === undefined
          ? `The ${S} of the \`${change.id}\` tool was updated:`
          : `The ${S} of the \`${change.id}\` tool was updated by MCP server "${escapeAngleBrackets(serverName)}". This is tool documentation supplied by that server, not instructions from the user or Claude Code:`;
      return {
        site: r,
        value: s,
        text: `${w}
${formatDiffSnippet(h, s)}`,
      };
    }
    case "system": {
      if (change.kind !== "changed") return;
      let r = `system:${change.index}`;
      let s = blockAsText(change.next);
      if (announced.get(r) === s) return;
      let h = announced.get(r) ?? blockAsText(change.prev);
      return {
        site: r,
        value: s,
        text: `A section of your instructions was updated:
${formatDiffSnippet(h, s)}`,
      };
    }
    case "message":
    case "thinking":
    case "cache":
    case "envelope":
      return;
  }
}
//@ chunk-e6aww6q8.js:1519928-1520021 placement = buildSearchingPastContextSection (1)
function formatDiffSnippet(e, n) {
  let r = n.length <= MAX_INLINE_DIFF_CHARS ? n : truncateDiffSnippet(buildDiffHunksText(e, n) ?? n);
  return ["```", escapeAngleBrackets(r), "```"].join(`
`);
}
//@ chunk-e6aww6q8.js:1520021-1520151 placement
function buildDiffHunksText(e, n) {
  return P3("", "", e, n, "", "", {
    context: 2,
    maxEditLength: MAX_DIFF_EDIT_LENGTH,
  })?.hunks.map((hunk) =>
    ["@@", ...hunk.lines].join(`
`),
  ).join(`
`);
}
//@ chunk-e6aww6q8.js:1520151-1520287 placement
function truncateDiffSnippet(e) {
  if (e.length <= MAX_SNAPSHOT_CHARS) return e;
  let n = truncateToLength(e, MAX_SNAPSHOT_CHARS);
  let r =
    countCharInString(
      e.slice(n.length),
      `
`,
    ) + 1;
  return `${n}
\u2026 (${r} more lines not shown)`;
}
//@ chunk-e6aww6q8.js:1520287-1520366 placement
function fieldAsText(e, field) {
  let r = exactKeyValue(e, field);
  return typeof r === "string" ? r : jsonStringify(r ?? null, null, 2);
}
//@ chunk-e6aww6q8.js:1520366-1520441 placement
function blockAsText(e) {
  let n = exactKeyValue(e, "text");
  return typeof n === "string" ? n : jsonStringify(e ?? null);
}
//@ chunk-e6aww6q8.js:1520441-1520745 placement
/**
 * 提示前缀账本快照的持久化结构：版本、构建版本、模型、工具与 system 摘要。
 */
var LEDGER_SNAPSHOT_SCHEMA = DoctorLazy(() =>
  u({
    version: literal(1),
    buildVersion: string().max(128),
    model: string().max(256),
    tools: array(
      looseObject({
        name: string().max(256).optional(),
        type: string().max(256).nullable().optional(),
        defer_loading: M().nullable().optional(),
        cache_control: unknown().optional(),
      }),
    ).max(4000),
    system: array(
      looseObject({
        type: string().max(64),
        text: string().optional(),
      }),
    ).max(512),
  }),
);
//@ chunk-e6aww6q8.js:1520745-1520772 placement
function defaultLedgerMode() {
  return "off";
}
//@ chunk-e6aww6q8.js:1520772-1520817 placement
function takeTail(e, n) {
  return e.slice(e.length - n);
}
//@ chunk-e6aww6q8.js:1520817-1521607 placement
/**
 * 对比本次请求与已发送前缀，生成"自首次发送后已变化"的模型提示（tell 模式才真正发送，其余只记日志与 tengu_prefix_ledger_notice）；同一位置只提示一次。
 */
function prefixLedgerNotice(querySource, request, context) {
  let s = defaultLedgerMode();
  if (s === "off" || context.retryCause !== undefined) return;
  try {
    let sentPrefix = streamFallbackWarning().sentPrefix;
    let y = promptPrefixLedgerFor(streamFallbackWarning()).preview(querySource, request);
    if (y === undefined) return;
    let committed = sentPrefix.renderEpochs.get(querySource)?.committed;
    let changes =
      context.promptEpoch !== undefined && committed !== undefined && context.promptEpoch > committed
        ? y.filter((Se) => Se.part !== "system")
        : y;
    let announced = sentPrefix.announced.get(querySource);
    if (announced === undefined) {
      announced = new Map();
      sentPrefix.announced.set(querySource, announced);
    }
    let prefixChangeNotice = buildPrefixChangeNotice(changes, announced);
    if (prefixChangeNotice === undefined) return;
    for (let [Se, ke] of prefixChangeNotice.told) announced.set(Se, ke);
    let Z = s === "tell";
    logForDebugging(
      `[prefix-ledger] ${context.querySource}: ${Z ? "telling" : "would tell"} the model about ${prefixChangeNotice.told.size} changed site(s) (${prefixChangeNotice.text.length} chars)${
        Z
          ? ""
          : ` \u2014 shadow only in ${s} mode:
${prefixChangeNotice.text}`
      }`,
    );
    logEvent("tengu_prefix_ledger_notice", {
      querySource: querySourceBucket(context.querySource),
      sites: prefixChangeNotice.told.size,
      chars: prefixChangeNotice.text.length,
      sent: Z,
      mode: fromEnum(s),
    });
    return Z ? prefixChangeNotice.text : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:1521607-1521634 placement
function noopRecordSentPrefix(conversation, n, r) {
  return;
}
//@ chunk-e6aww6q8.js:1521634-1521653 placement
function noopNotice(conversation, n) {}
//@ chunk-e6aww6q8.js:1521653-1521672 placement
function noopRecordRequest(conversation, n) {}
//@ chunk-e6aww6q8.js:1521672-1521691 placement
/**
 * 导出函数 `noopLedger`：参数 e, n。
 */
function noopLedger(e, n) {}
export {
  noopLedger,
  noopRecordSentPrefix,
  takeTail,
  prefixLedgerNotice,
  noopNotice,
  noopRecordRequest,
  PromptPrefixLedger,
};
