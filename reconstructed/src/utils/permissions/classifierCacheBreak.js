/**
 * utils/permissions/classifierCacheBreak.ts
 *
 * 2.1.316 新增：分类器缓存破坏检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { isDiskless } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getGitEmail as getGitEmail_2 } from "../../services/analytics/growthbook.js";
import { firstLineOf } from "../stringUtils.js";
import {
  isCacheBreakOutlineEnabled,
  isExcludedModel,
  MIN_CACHE_MISS_TOKENS,
  isCacheReadDrop,
} from "../../services/api/promptCacheBreakDetection.js";
import { streamFallbackWarning } from "../../services/api/streamFallbackWarning.js";
import { bunHashOf } from "../pastedContent.js";
import { jsonStringify } from "../slowOperations.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { uniq } from "../collections.js";
import { getAutoModeTierFromEnv } from "./yoloClassifier.js";

//@ chunk-e6aww6q8.js:2818085-2818162 placement
/**
 * isOutputLimitStop：停止原因是否因输出上限。
 */
function isOutputLimitStop(stopReason) {
  return stopReason === "max_tokens" || stopReason === "model_context_window_exceeded";
}
//@ chunk-e6aww6q8.js:2818162-2818189 placement
var USER_TAG_UNSAFE_CHARS = /[^a-zA-Z0-9._-]/g;
//@ chunk-e6aww6q8.js:2818189-2818395 placement
/**
 * 取分类器用的用户标识：GITHUB_ACTOR/USER/USERNAME，或 git 邮箱的用户名部分，清洗后截到 64 字符；无盘模式返回 null。
 */
async function getClassifierUserTag() {
  if (isDiskless()) return null;
  let e = env.GITHUB_ACTOR ?? env.USER ?? env.USERNAME;
  let n = e === undefined && !env.CLAUDE_CODE_EVAL_CONFINED ? await getGitEmail_2() : null;
  return (e ?? (n ? firstLineOf(n, "@") : null))?.replace(USER_TAG_UNSAFE_CHARS, "").slice(0, 64) || null;
}
//@ chunk-e6aww6q8.js:2818395-2818851 placement
/**
 * 缓存失效说明的常量：说明长度上限、失效类型、失效区域与请求变化字段的显示标签。
 */
var MAX_CACHE_BREAK_DETAIL = 128;
var CACHE_BREAK_KIND_LABELS = {
  first_write: "first write",
  read_dropped: "less read from the cache",
  rewrote_half: "wrote at least half the prompt",
};
var CACHE_BREAK_REGION_LABELS = {
  system: "the system prompt",
  claude_md: "the CLAUDE.md message",
  transcript: "the end of the transcript",
  action: "the action",
  none: "nothing",
};
var CACHE_BREAK_CHANGE_LABELS = {
  modelChanged: "model",
  systemPromptChanged: "system prompt",
  cacheControlChanged: "cache lifetime",
  betasChanged: "betas",
  extraBodyChanged: "extra body fields",
  thinkingChanged: "thinking",
};
//@ chunk-e6aww6q8.js:2818851-2822012 placement
/**
 * 检测分类器提示缓存被破坏的原因（首次写入、读取丢失、改写一半等）。
 */
function detectClassifierCacheBreak(cacheBreakState, requestOptions, usage, requestId, h) {
  try {
    if (!isCacheBreakOutlineEnabled() || isExcludedModel(requestOptions.model)) return;
    let promptCacheBreak = streamFallbackWarning().promptCacheBreak;
    let classifierLines = promptCacheBreak.classifierLines;
    let joined = [
      cacheBreakState.agentId ?? "",
      cacheBreakState.site,
      cacheBreakState.hostRules === undefined ? "" : bunHashOf(cacheBreakState.hostRules.host),
    ].join("\x00");
    let L = classifierLines.get(joined);
    let promptCacheRegions = buildPromptCacheRegions(requestOptions, cacheBreakState.leadingMessageCount);
    let q =
      typeof requestOptions.system === "string"
        ? [requestOptions.system]
        : (requestOptions.system ?? []).map((ze) => ze.text);
    let Z = {
      agentId: cacheBreakState.agentId,
      model: requestOptions.model,
      systemHash: bunHashOf(q.join("\x00")),
      cacheControls: stableJsonKey(promptCacheRegions.cacheControls),
      betas: stableJsonKey(requestOptions.extraBetas ?? []),
      extraBodyHash: bunHashOf(jsonStringify(requestOptions.extraBodyParams ?? {})),
      thinking: requestOptions.thinking,
      breakpoints: promptCacheRegions.breakpoints,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      sentAt: h,
      respondedAt: Date.now(),
      requestCount: (L?.requestCount ?? 0) + 1,
      remoteHost: cacheBreakState.hostRules !== undefined,
    };
    let Se = L !== undefined && h < L.respondedAt;
    let ke = L !== undefined && h < L.sentAt;
    let we = ke ? undefined : L;
    let cacheReadTokens = Z.cacheReadTokens;
    let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
    let Ie = cacheCreationInputTokens >= MIN_CACHE_MISS_TOKENS;
    let Me =
      Ie && cacheCreationInputTokens * 2 >= usage.input_tokens + cacheReadTokens + cacheCreationInputTokens;
    let We =
      L === undefined
        ? Ie
          ? "first_write"
          : undefined
        : isCacheReadDrop(L.cacheReadTokens, cacheReadTokens)
          ? "read_dropped"
          : Me
            ? "rewrote_half"
            : undefined;
    if (We !== undefined) {
      let ze = we ? locateCacheBreakRegion(we.breakpoints, promptCacheRegions) : undefined;
      let lt = we && {
        modelChanged: we.model !== Z.model,
        systemPromptChanged: we.systemHash !== Z.systemHash,
        cacheControlChanged: we.cacheControls !== Z.cacheControls,
        betasChanged: we.betas !== Z.betas,
        extraBodyChanged: we.extraBodyHash !== Z.extraBodyHash,
        thinkingChanged: we.thinking !== Z.thinking,
      };
      let Je = L && !Se ? h - L.respondedAt : undefined;
      let nt =
        we &&
        (promptCacheBreak.classifierCompactions.get(cacheBreakState.agentId) ?? []).some(
          (At) => we.sentAt < At && At <= h,
        );
      logEvent("tengu_classifier_cache_break", {
        trigger: fromEnum(We),
        querySource: agentTypeForTelemetry(requestOptions.querySource),
        classifierSite: fromEnum(cacheBreakState.caller ?? cacheBreakState.site),
        loop: fromEnum(cacheBreakState.agentId === undefined ? "main" : "agent"),
        remoteHostRules: Z.remoteHost,
        model: telemetrySafeModelName(requestOptions.model),
        requestId: sanitizeMarkName(requestId),
        callNumber: Z.requestCount,
        inputTokens: usage.input_tokens,
        cacheReadTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        prevCacheReadTokens: L?.cacheReadTokens,
        overlapped: L && Se,
        msSincePrevResponse: Je,
        is1hCacheTTL: promptCacheRegions.cacheControls.some((cacheControl) => cacheControl.ttl === "1h"),
        compactionBeforeSend: nt,
        keptThrough: fromEnumOpt(ze?.region),
        keptThroughBlocksBack: ze?.blocksBack,
        edgesMoved: ze?.edgesMoved,
        ...lt,
      });
      let joined = [
        cacheBreakState.site === "gate" ? "permission check" : cacheBreakState.site,
        cacheBreakState.agentId === undefined ? "main conversation" : "subagent",
        ...(Z.remoteHost ? ["remote host"] : []),
      ].join(", ");
      let mapped = Object.entries(lt ?? {})
        .filter(([, value]) => value)
        .map(([key]) => CACHE_BREAK_CHANGE_LABELS[key]);
      let yt = `read ${cacheReadTokens} tokens from the cache (previous request ${L?.cacheReadTokens}), wrote ${cacheCreationInputTokens}`;
      let gt = ke
        ? "sent before the previous request; not compared, because it was sent before the request it would be compared with"
        : `${Se ? "sent before the previous response arrived" : `sent ${Je} ms after the previous response`}; matches the previous request through: ${CACHE_BREAK_REGION_LABELS[ze?.region ?? "none"]}; same bytes split into different blocks: ${ze?.edgesMoved ? "yes" : "no"}; changed: ${mapped.join(", ") || "nothing"}; a compaction came before this request: ${nt ? "yes" : "no"}`;
      logForDebugging(
        `[CLASSIFIER CACHE ${We === "read_dropped" ? "BREAK" : "WRITE"}] auto-mode classifier (${joined}), call #${Z.requestCount}: ` +
          (L === undefined
            ? `first tracked request from this conversation and call site, wrote ${cacheCreationInputTokens} tokens to the cache`
            : `${CACHE_BREAK_KIND_LABELS[We]}: ${yt}; ${gt}`),
      );
    }
    if (L !== undefined && ke) {
      L.requestCount = Z.requestCount;
      return;
    }
    classifierLines.delete(joined);
    classifierLines.set(joined, Z);
    if (classifierLines.size > MAX_CACHE_BREAK_DETAIL) {
      let found = [...classifierLines].find(([, lt]) => lt.agentId !== undefined || lt.remoteHost);
      if (found) classifierLines.delete(found[0]);
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2822012-2822942 placement
/**
 * 把请求拆成 system / CLAUDE.md / 转录三个区域的块列表，用于定位提示缓存失效发生在哪个区域。
 */
function buildPromptCacheRegions(e, leadingMessageCount) {
  let r =
    typeof e.system === "string"
      ? [
          {
            type: "text",
            text: e.system,
          },
        ]
      : (e.system ?? []);
  let s = [];
  for (let block of r)
    s.push({
      block,
      region: "system",
      role: undefined,
    });
  for (let [Se, ke] of e.messages.entries()) {
    let we =
      typeof ke.content === "string"
        ? [
            {
              type: "text",
              text: ke.content,
            },
          ]
        : ke.content;
    for (let [Ee, Ae] of we.entries())
      s.push({
        block: Ae,
        region: Se < leadingMessageCount ? "claude_md" : "transcript",
        role: Ee === 0 ? ke.role : undefined,
      });
  }
  let h = [];
  let y = [];
  let S = new Map();
  let w = [];
  let L = [];
  let G = 0;
  for (let [Se, { block, region: we, role: Ee }] of s.entries()) {
    let Ae = (Ee ? `\x00${Ee}\x00` : "") + isBase64ImageBlock_2(block);
    h.push(Ae);
    G += Ae.length;
    y.push(G);
    S.set(G, Se);
    if ("cache_control" in block && block.cache_control) {
      L.push(block.cache_control);
      w.push({
        offset: G,
        region: we,
      });
    }
  }
  let last = w.at(-1);
  if (last?.region === "transcript") last.region = "action";
  let Z = {
    text: h.join(""),
    blockEnds: y,
    blockIndexByEnd: S,
    breakpoints: [],
    cacheControls: L,
    prefixHashes: new Map(),
  };
  Z.breakpoints = w.map((Se) => ({
    ...Se,
    hash: getPrefixHash(Z, Se.offset),
    edgesHash: getBlockBoundaryHash(Z, Se.offset),
  }));
  return Z;
}
//@ chunk-e6aww6q8.js:2822942-2823120 placement = isBase64ImageBlock (0.848)
function isBase64ImageBlock_2(block) {
  if (block.type === "text") return block.text;
  let n =
    block.type === "image" && block.source.type === "base64"
      ? block.source.data
      : jsonStringify({
          ...block,
          cache_control: undefined,
        });
  return `\x00${block.type}:${bunHashOf(n)}\x00`;
}
//@ chunk-e6aww6q8.js:2823120-2823237 placement
function getPrefixHash(e, offset) {
  let r = e.prefixHashes.get(offset);
  if (r === undefined) {
    r = bunHashOf(e.text.slice(0, offset));
    e.prefixHashes.set(offset, r);
  }
  return r;
}
//@ chunk-e6aww6q8.js:2823237-2823336 placement
function getBlockBoundaryHash(e, offset) {
  let r = e.blockIndexByEnd.get(offset) ?? -1;
  return bunHashOf(e.blockEnds.slice(0, r + 1).join(","));
}
//@ chunk-e6aww6q8.js:2823336-2823789 placement
function locateCacheBreakRegion(breakpoints, promptCacheRegions) {
  let r;
  let edgesMoved = false;
  for (let L of breakpoints) {
    if (L.offset > promptCacheRegions.text.length || getPrefixHash(promptCacheRegions, L.offset) !== L.hash)
      continue;
    if (
      promptCacheRegions.blockIndexByEnd.has(L.offset) &&
      getBlockBoundaryHash(promptCacheRegions, L.offset) === L.edgesHash
    )
      r = L;
    else edgesMoved = true;
  }
  if (r === undefined)
    return {
      region: "none",
      blocksBack: undefined,
      edgesMoved,
    };
  let offset = r.offset;
  let found = promptCacheRegions.breakpoints.find((breakpoint) => breakpoint.offset >= offset);
  let S = promptCacheRegions.blockIndexByEnd.get(offset);
  let w = found && promptCacheRegions.blockIndexByEnd.get(found.offset);
  return {
    region: r.region,
    blocksBack: S !== undefined && w !== undefined ? w - S : undefined,
    edgesMoved,
  };
}
//@ chunk-e6aww6q8.js:2823789-2823852 placement
function stableJsonKey(cacheControls) {
  return uniq(cacheControls.map((n) => jsonStringify(n)))
    .sort()
    .join("\x00");
}
//@ chunk-e6aww6q8.js:2823852-2823886 placement
/**
 * currentAutoModeTier：当前 auto 模式等级。
 */
function currentAutoModeTier() {
  return getAutoModeTierFromEnv().value;
}
export { currentAutoModeTier, getClassifierUserTag, detectClassifierCacheBreak, isOutputLimitStop };
