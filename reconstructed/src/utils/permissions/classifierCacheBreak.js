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
import { Ws } from "../../services/api/streamFallbackWarning.js";
import { sT } from "../pastedContent.js";
import { jsonStringify } from "../slowOperations.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { ye } from "../startupMarks.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { uniq } from "../collections.js";
import { getAutoModeTierFromEnv } from "./yoloClassifier.js";

//@ chunk-e6aww6q8.js:2818085-2818162 placement
function bjr(e) {
  return e === "max_tokens" || e === "model_context_window_exceeded";
}
//@ chunk-e6aww6q8.js:2818162-2818189 placement
var akr = /[^a-zA-Z0-9._-]/g;
/**
 * 取分类器用的用户标识：GITHUB_ACTOR/USER/USERNAME，或 git 邮箱的用户名部分，清洗后截到 64 字符；无盘模式返回 null。
 */
//@ chunk-e6aww6q8.js:2818189-2818395 placement
async function getClassifierUserTag() {
  if (isDiskless()) return null;
  let e = env.GITHUB_ACTOR ?? env.USER ?? env.USERNAME,
    n = e === void 0 && !env.CLAUDE_CODE_EVAL_CONFINED ? await getGitEmail_2() : null;
  return (e ?? (n ? firstLineOf(n, "@") : null))?.replace(akr, "").slice(0, 64) || null;
}
/**
 * 缓存失效说明的常量：说明长度上限、失效类型、失效区域与请求变化字段的显示标签。
 */
//@ chunk-e6aww6q8.js:2818395-2818851 placement
var MAX_CACHE_BREAK_DETAIL = 128,
  CACHE_BREAK_KIND_LABELS = {
    first_write: "first write",
    read_dropped: "less read from the cache",
    rewrote_half: "wrote at least half the prompt",
  },
  CACHE_BREAK_REGION_LABELS = {
    system: "the system prompt",
    claude_md: "the CLAUDE.md message",
    transcript: "the end of the transcript",
    action: "the action",
    none: "nothing",
  },
  CACHE_BREAK_CHANGE_LABELS = {
    modelChanged: "model",
    systemPromptChanged: "system prompt",
    cacheControlChanged: "cache lifetime",
    betasChanged: "betas",
    extraBodyChanged: "extra body fields",
    thinkingChanged: "thinking",
  };
/**
 * 检测分类器提示缓存被破坏的原因（首次写入、读取丢失、改写一半等）。
 */
//@ chunk-e6aww6q8.js:2818851-2822012 placement
function detectClassifierCacheBreak(e, n, r, s, h) {
  try {
    if (!isCacheBreakOutlineEnabled() || isExcludedModel(n.model)) return;
    let promptCacheBreak = Ws().promptCacheBreak,
      classifierLines = promptCacheBreak.classifierLines,
      joined = [e.agentId ?? "", e.site, e.hostRules === void 0 ? "" : sT(e.hostRules.host)].join("\x00"),
      L = classifierLines.get(joined),
      G = buildPromptCacheRegions(n, e.leadingMessageCount),
      q = typeof n.system === "string" ? [n.system] : (n.system ?? []).map((ze) => ze.text),
      Z = {
        agentId: e.agentId,
        model: n.model,
        systemHash: sT(q.join("\x00")),
        cacheControls: L_n(G.cacheControls),
        betas: L_n(n.extraBetas ?? []),
        extraBodyHash: sT(jsonStringify(n.extraBodyParams ?? {})),
        thinking: n.thinking,
        breakpoints: G.breakpoints,
        cacheReadTokens: r.cache_read_input_tokens ?? 0,
        sentAt: h,
        respondedAt: Date.now(),
        requestCount: (L?.requestCount ?? 0) + 1,
        remoteHost: e.hostRules !== void 0,
      },
      Se = L !== void 0 && h < L.respondedAt,
      ke = L !== void 0 && h < L.sentAt,
      we = ke ? void 0 : L,
      cacheReadTokens = Z.cacheReadTokens,
      Ae = r.cache_creation_input_tokens ?? 0,
      Ie = Ae >= MIN_CACHE_MISS_TOKENS,
      Me = Ie && Ae * 2 >= r.input_tokens + cacheReadTokens + Ae,
      We =
        L === void 0
          ? Ie
            ? "first_write"
            : void 0
          : isCacheReadDrop(L.cacheReadTokens, cacheReadTokens)
            ? "read_dropped"
            : Me
              ? "rewrote_half"
              : void 0;
    if (We !== void 0) {
      let ze = we ? locateCacheBreakRegion(we.breakpoints, G) : void 0,
        lt = we && {
          modelChanged: we.model !== Z.model,
          systemPromptChanged: we.systemHash !== Z.systemHash,
          cacheControlChanged: we.cacheControls !== Z.cacheControls,
          betasChanged: we.betas !== Z.betas,
          extraBodyChanged: we.extraBodyHash !== Z.extraBodyHash,
          thinkingChanged: we.thinking !== Z.thinking,
        },
        Je = L && !Se ? h - L.respondedAt : void 0,
        nt =
          we &&
          (promptCacheBreak.classifierCompactions.get(e.agentId) ?? []).some(
            (At) => we.sentAt < At && At <= h,
          );
      logEvent("tengu_classifier_cache_break", {
        trigger: fromEnum(We),
        querySource: agentTypeForTelemetry(n.querySource),
        classifierSite: fromEnum(e.caller ?? e.site),
        loop: fromEnum(e.agentId === void 0 ? "main" : "agent"),
        remoteHostRules: Z.remoteHost,
        model: telemetrySafeModelName(n.model),
        requestId: ye(s),
        callNumber: Z.requestCount,
        inputTokens: r.input_tokens,
        cacheReadTokens: cacheReadTokens,
        cacheCreationTokens: Ae,
        prevCacheReadTokens: L?.cacheReadTokens,
        overlapped: L && Se,
        msSincePrevResponse: Je,
        is1hCacheTTL: G.cacheControls.some((cacheControl) => cacheControl.ttl === "1h"),
        compactionBeforeSend: nt,
        keptThrough: fromEnumOpt(ze?.region),
        keptThroughBlocksBack: ze?.blocksBack,
        edgesMoved: ze?.edgesMoved,
        ...lt,
      });
      let joined = [
          e.site === "gate" ? "permission check" : e.site,
          e.agentId === void 0 ? "main conversation" : "subagent",
          ...(Z.remoteHost ? ["remote host"] : []),
        ].join(", "),
        mapped = Object.entries(lt ?? {})
          .filter(([, At]) => At)
          .map(([At]) => CACHE_BREAK_CHANGE_LABELS[At]),
        yt = `read ${cacheReadTokens} tokens from the cache (previous request ${L?.cacheReadTokens}), wrote ${Ae}`,
        gt = ke
          ? "sent before the previous request; not compared, because it was sent before the request it would be compared with"
          : `${Se ? "sent before the previous response arrived" : `sent ${Je} ms after the previous response`}; matches the previous request through: ${CACHE_BREAK_REGION_LABELS[ze?.region ?? "none"]}; same bytes split into different blocks: ${ze?.edgesMoved ? "yes" : "no"}; changed: ${mapped.join(", ") || "nothing"}; a compaction came before this request: ${nt ? "yes" : "no"}`;
      logForDebugging(
        `[CLASSIFIER CACHE ${We === "read_dropped" ? "BREAK" : "WRITE"}] auto-mode classifier (${joined}), call #${Z.requestCount}: ` +
          (L === void 0
            ? `first tracked request from this conversation and call site, wrote ${Ae} tokens to the cache`
            : `${CACHE_BREAK_KIND_LABELS[We]}: ${yt}; ${gt}`),
      );
    }
    if (L !== void 0 && ke) {
      L.requestCount = Z.requestCount;
      return;
    }
    if (
      (classifierLines.delete(joined),
      classifierLines.set(joined, Z),
      classifierLines.size > MAX_CACHE_BREAK_DETAIL)
    ) {
      let found = [...classifierLines].find(([, lt]) => lt.agentId !== void 0 || lt.remoteHost);
      if (found) classifierLines.delete(found[0]);
    }
  } catch (error) {
    logError(error);
  }
}
/**
 * 把请求拆成 system / CLAUDE.md / 转录三个区域的块列表，用于定位提示缓存失效发生在哪个区域。
 */
//@ chunk-e6aww6q8.js:2822012-2822942 placement
function buildPromptCacheRegions(e, n) {
  let r = typeof e.system === "string" ? [{ type: "text", text: e.system }] : (e.system ?? []),
    s = [];
  for (let Se of r) s.push({ block: Se, region: "system", role: void 0 });
  for (let [Se, ke] of e.messages.entries()) {
    let we = typeof ke.content === "string" ? [{ type: "text", text: ke.content }] : ke.content;
    for (let [Ee, Ae] of we.entries())
      s.push({ block: Ae, region: Se < n ? "claude_md" : "transcript", role: Ee === 0 ? ke.role : void 0 });
  }
  let h = [],
    y = [],
    S = new Map(),
    w = [],
    L = [],
    G = 0;
  for (let [Se, { block: ke, region: we, role: Ee }] of s.entries()) {
    let Ae = (Ee ? `\x00${Ee}\x00` : "") + isBase64ImageBlock_2(ke);
    if ((h.push(Ae), (G += Ae.length), y.push(G), S.set(G, Se), "cache_control" in ke && ke.cache_control))
      (L.push(ke.cache_control), w.push({ offset: G, region: we }));
  }
  let at = w.at(-1);
  if (at?.region === "transcript") at.region = "action";
  let Z = {
    text: h.join(""),
    blockEnds: y,
    blockIndexByEnd: S,
    breakpoints: [],
    cacheControls: L,
    prefixHashes: new Map(),
  };
  return (
    (Z.breakpoints = w.map((Se) => ({
      ...Se,
      hash: getPrefixHash(Z, Se.offset),
      edgesHash: getBlockBoundaryHash(Z, Se.offset),
    }))),
    Z
  );
}
//@ chunk-e6aww6q8.js:2822942-2823120 placement = isBase64ImageBlock (0.848)
function isBase64ImageBlock_2(block) {
  if (block.type === "text") return block.text;
  let n =
    block.type === "image" && block.source.type === "base64"
      ? block.source.data
      : jsonStringify({ ...block, cache_control: void 0 });
  return `\x00${block.type}:${sT(n)}\x00`;
}
//@ chunk-e6aww6q8.js:2823120-2823237 placement
function getPrefixHash(e, n) {
  let r = e.prefixHashes.get(n);
  if (r === void 0) ((r = sT(e.text.slice(0, n))), e.prefixHashes.set(n, r));
  return r;
}
//@ chunk-e6aww6q8.js:2823237-2823336 placement
function getBlockBoundaryHash(e, n) {
  let r = e.blockIndexByEnd.get(n) ?? -1;
  return sT(e.blockEnds.slice(0, r + 1).join(","));
}
//@ chunk-e6aww6q8.js:2823336-2823789 placement
function locateCacheBreakRegion(e, n) {
  let r,
    s = !1;
  for (let L of e) {
    if (L.offset > n.text.length || getPrefixHash(n, L.offset) !== L.hash) continue;
    if (n.blockIndexByEnd.has(L.offset) && getBlockBoundaryHash(n, L.offset) === L.edgesHash) r = L;
    else s = !0;
  }
  if (r === void 0) return { region: "none", blocksBack: void 0, edgesMoved: s };
  let offset = r.offset,
    found = n.breakpoints.find((breakpoint) => breakpoint.offset >= offset),
    S = n.blockIndexByEnd.get(offset),
    w = found && n.blockIndexByEnd.get(found.offset);
  return { region: r.region, blocksBack: S !== void 0 && w !== void 0 ? w - S : void 0, edgesMoved: s };
}
//@ chunk-e6aww6q8.js:2823789-2823852 placement
function L_n(e) {
  return uniq(e.map((n) => jsonStringify(n)))
    .sort()
    .join("\x00");
}
//@ chunk-e6aww6q8.js:2823852-2823886 placement
function bJe() {
  return getAutoModeTierFromEnv().value;
}

export { bJe, getClassifierUserTag, detectClassifierCacheBreak, bjr };
