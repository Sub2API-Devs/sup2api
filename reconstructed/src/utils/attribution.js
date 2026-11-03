/**
 * utils/attribution.ts
 *
 * commit/PR 署名文本（Co-Authored-By、attribution 设置、includeCoAuthoredBy 兼容）与增强 PR 署名统计（提示数、记忆访问数、Claude 贡献比例）；另混入 tyg7f3ek 的转录轮次判定代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/attribution.ts
 * pieces: chunk-e6aww6q8.js (25), chunk-tyg7f3ek.js (1)
 * attribution: placement 9, layout 9, fingerprint 6, file-local 1, callgraph-fingerprint 1
 */
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import {
  HTTPS_CLAUDE_COM_CLAUDE_CODE,
  isRemoteSessionLocal,
  getRemoteSessionUrl,
} from "../constants/product.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { entrypointSurfaceName } from "./entrypointKinds.js";
import { env } from "./env.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { p9t } from "../tools/AgentTool/agentEffort.js";
import {
  getClientType,
  isReplBridgeActive,
  getRootSession,
  getInferenceProfileBackingModelCached,
} from "../bootstrap/state.js";
import { isSafeBridgeId } from "../bridge/sessionIdCompat.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { bZs, vqr, GitListingError } from "./attributionFileClasses.js";
import { getMainLoopModel, isFableFamilyOrPinnedModel } from "./model/model.js";
import { applyAttributionTextHooks } from "../plugins/functionHooks/attributionHooks.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { HostScoped } from "./hostScoped.js";
import { getPromptContent as getPromptContent_2 } from "../commands/commit.js";
import { isRecognizedModel, getCanonicalName } from "./model/canonicalModelName.js";
import { isFirstPartyProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { getPublicModelDisplayName, getPublicModelName } from "./model/modelDisplay.js";
import { CLAUDE_FABLE_5_CONFIG, MODEL_KEY_BY_FIRST_PARTY_ID } from "./model/configs.js";
import { reverseModelOverride } from "./model/modelStrings.js";
import { Bn, isStandardTrailer } from "./model/modelIds.js";
import { lft } from "../constants/xml.js";
import { Nnt } from "./git/builderGit/gitEnv.js";
import { findGitRoot } from "./git.js";
import {
  trackFileDeletion,
  calculateCommitAttribution,
  isInternalModelRepo,
  getModelFamilyForAttribution,
} from "./commitAttribution.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { MEMORY_READ, MEMORY_WRITE } from "../tools/MemoryTool/memoryToolNames.js";
import { isMemoryFileAccess } from "./sessionFileAccessHooks.js";
import { getTranscriptPath, wrapStorageSource, getTranscriptStorageKey } from "./sessionStorage.js";
import { readTranscriptForLoad } from "./sessionStoragePortable.js";
import { parseJSONL } from "./json.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { sBo } from "./transcript/deserialize.js";

/**
 * 生成 PR 页脚"🤖 Generated with Claude Code"，开关开启时附"via 入口名"。
 */
//@ chunk-e6aww6q8.js:1469310-1469474 placement
function getGeneratedWithFooter() {
  let e = `\uD83E\uDD16 Generated with [Claude Code](${HTTPS_CLAUDE_COM_CLAUDE_CODE})`;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_pr_footer_surface_suffix", !1)) return e;
  let n = entrypointSurfaceName();
  return n ? `${e} via ${n}` : e;
}
/**
 * 返回用于提交/PR 归属的会话链接：受环境变量与设置控制；远程会话用远程会话 id，REPL 桥接（或允许仅出站时）用桥接会话 id；id 不安全或指向本地时返回 null。
 */
//@ chunk-e6aww6q8.js:1469474-1470058 placement
function getSessionAttribution({ includeOutboundOnly: includeOutboundOnly = !1 } = {}) {
  if (env.CLAUDE_CODE_SUPPRESS_SESSION_ATTRIBUTION) return null;
  if (getInitialSettings_2().attribution?.sessionUrl === !1) return null;
  let n = p9t();
  if (getClientType() === "remote" || n !== void 0) {
    let r = n ?? env.CLAUDE_CODE_REMOTE_SESSION_ID;
    if (!r || !isSafeBridgeId(r)) return null;
    let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
    if (isRemoteSessionLocal(r, SESSION_INGRESS_URL)) return null;
    return { url: getRemoteSessionUrl(r, SESSION_INGRESS_URL), sessionId: r };
  }
  if (isReplBridgeActive() || includeOutboundOnly) {
    let r = getReplBridgeHandle();
    if (!r || (r.outboundOnly && !includeOutboundOnly)) return null;
    if (!isSafeBridgeId(r.bridgeSessionId) || isRemoteSessionLocal(r.bridgeSessionId, r.sessionIngressUrl))
      return null;
    return { url: getRemoteSessionUrl(r.bridgeSessionId, r.sessionIngressUrl), sessionId: r.bridgeSessionId };
  }
  return null;
}
//@ chunk-e6aww6q8.js:1470058-1470086 placement
function zVo(e) {
  return null;
}
//@ chunk-e6aww6q8.js:1470086-1470224 placement
function getSessionTrailerParts(e) {
  let n = e?.url ?? null,
    r = n !== null && bZs(`Claude-Session: ${n}`) ? n : null,
    s = zVo(e),
    h = s !== null && vqr(s) ? s : null;
  return { url: r, line: h };
}
//@ chunk-e6aww6q8.js:1470224-1470363 placement
function appendSessionTrailer(e, n, r) {
  let s = r ?? n;
  return {
    commit: e.commit
      ? `${e.commit}
Claude-Session: ${n}`
      : `Claude-Session: ${n}`,
    pr: e.pr
      ? `${e.pr}

${s}`
      : s,
  };
}
//@ chunk-e6aww6q8.js:1470363-1470416 placement
async function CSt({ model: e } = {}) {
  return buildAttributionTexts(getSessionAttribution(), e);
}
//@ chunk-e6aww6q8.js:1470416-1470454 placement
async function e8t() {
  return buildAttributionTexts(null);
}
/**
 * 生成提交与 PR 的归属文本：基础署名加上 Claude-Session 尾注（有会话链接时），并按设置模板渲染。
 */
//@ chunk-e6aww6q8.js:1470454-1470611 placement
async function buildAttributionTexts(e, n) {
  let r = getAttributionTexts(n ?? getMainLoopModel()),
    s = getSessionTrailerParts(e),
    h = s.url !== null ? appendSessionTrailer(r, s.url, s.line) : r;
  return {
    commit: await applyAttributionTextHooks("commit", h.commit),
    pr: await applyAttributionTextHooks("pr", h.pr),
  };
}
//@ chunk-e6aww6q8.js:1470611-1470793 placement
class DeadProbeOnce {
  firedSites = new Set();
  fire(e) {
    if (this.firedSites.has(e)) return;
    (this.firedSites.add(e), logEvent("tengu_dead_probe_include_coauthored_by", { site: fromEnum(e) }));
  }
  reset() {
    this.firedSites.clear();
  }
}
//@ chunk-e6aww6q8.js:1470793-1470820 layout
var attributionDisabledSignalByHost = new HostScoped(() => new DeadProbeOnce());
//@ chunk-e6aww6q8.js:1470820-1470859 layout
function getAttributionDisabledSignal() {
  return attributionDisabledSignalByHost.of(getRootSession().host);
}
/**
 * commit/PR 署名文本：settings.attribution.commit/pr 优先；includeCoAuthoredBy=false 时为空；默认 commit 为 `Co-Authored-By: <模型名> <noreply@anthropic.com>`，PR 为默认链接文本。
 */
//@ chunk-e6aww6q8.js:1470859-1471133 fingerprint = getAttributionTexts (0.589)
function getAttributionTexts(e) {
  let model = getGeneratedWithFooter(),
    defaultAttribution = `Co-Authored-By: ${getAttributionModelName(e)} <noreply@anthropic.com>`,
    settings = getInitialSettings_2(),
    attribution = settings.attribution;
  if (attribution !== void 0 && getPromptContent_2(attribution))
    return { commit: attribution.commit ?? defaultAttribution, pr: attribution.pr ?? model };
  if (settings.includeCoAuthoredBy === !1)
    return (getAttributionDisabledSignal().fire("attribution_texts"), { commit: "", pr: "" });
  return { commit: defaultAttribution, pr: model };
}
//@ chunk-e6aww6q8.js:1471133-1471240 layout
function getPolicyAttributionOverrides() {
  let e = getSettingsForSource("policySettings")?.attribution;
  return { commit: Boolean(e?.commit), pr: Boolean(e?.pr) };
}
/**
 * 署名中显示的名字：可公开的模型名（如 Claude Opus 5.5），否则 Claude 或 Claude Code。
 */
//@ chunk-e6aww6q8.js:1471240-1471500 layout
function getAttributionModelName(e) {
  let n = isRecognizedModel(e, getCanonicalName(e, { identity: !0 }));
  if (
    isFableFamilyOrPinnedModel(e, { identity: !0 }) &&
    (!isFirstPartyProvider() || isFirstPartyAnthropicBaseUrl() || n)
  ) {
    if (getPublicModelDisplayName(e) !== null) return getPublicModelName(e);
    return getCanonicalName(e, { identity: !0 }).includes("claude-fable-")
      ? "Claude"
      : getPublicModelName(CLAUDE_FABLE_5_CONFIG.firstParty);
  }
  if (isRecognizedModelIdForAttribution(e)) return getPublicModelName(e);
  return n ? "Claude" : "Claude Code";
}
//@ chunk-e6aww6q8.js:1471500-1471919 layout
function isRecognizedModelIdForAttribution(e) {
  if (getPublicModelDisplayName(e) === null) return !1;
  let n = reverseModelOverride(e);
  if (n !== e && Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, n)) return !0;
  let r = getCanonicalName(e, { identity: !0 }),
    lower = Bn(e).toLowerCase(),
    index = lower.indexOf(r),
    y = r.length;
  if (index === -1 && r.endsWith("-0")) {
    let sliced = r.slice(0, -2);
    ((index = lower.indexOf(sliced)), (y = sliced.length));
  }
  if (index === -1) {
    if (!e.includes("application-inference-profile")) return !1;
    let G = getInferenceProfileBackingModelCached(Bn(e));
    return !!G && isRecognizedModelIdForAttribution(G);
  }
  let sliced = lower.slice(0, index),
    sliced_2 = lower.slice(index + y);
  return (sliced === "" || /[./]$/.test(sliced)) && isStandardTrailer(sliced_2);
}
//@ chunk-e6aww6q8.js:1471919-1471994 file-local
function isTerminalOutput(content) {
  for (let tag of lft) if (content.includes(`<${tag}>`)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:1471994-1472387 fingerprint = countUserPromptsInMessages (1)
function countUserPromptsInMessages(messages) {
  let count = 0;
  for (let message of messages) {
    if (message.type !== "user") continue;
    let content = message.message?.content;
    if (!content) continue;
    let h = !1;
    if (typeof content === "string") {
      if (isTerminalOutput(content)) continue;
      h = content.trim().length > 0;
    } else if (Array.isArray(content))
      h = content.some((block) => {
        if (!block || typeof block !== "object" || !("type" in block)) return !1;
        return (
          (block.type === "text" && typeof block.text === "string" && !isTerminalOutput(block.text)) ||
          block.type === "image" ||
          block.type === "document"
        );
      });
    if (h) count++;
  }
  return count;
}
//@ chunk-e6aww6q8.js:1472387-1472571 layout
function countHumanUserPrompts(e) {
  let filtered = e.filter(
    (r) =>
      r.type === "user" &&
      !("isSidechain" in r && r.isSidechain) &&
      !("isMeta" in r && r.isMeta) &&
      !("isCompactSummary" in r && r.isCompactSummary),
  );
  return countUserPromptsInMessages(filtered);
}
//@ chunk-e6aww6q8.js:1472571-1472618 layout
var PR_ATTRIBUTION_STATS_UNKNOWN = Symbol("pr-attribution-stats-unknown");
/**
 * 从 AppState.attribution 计算 PR 级 Claude 贡献数据，未知时返回 PR_ATTRIBUTION_STATS_UNKNOWN。
 */
//@ chunk-e6aww6q8.js:1472618-1473054 fingerprint = getPRAttributionData (0.624)
async function getPRAttributionData(appState) {
  if (!appState.attribution) return null;
  let n = Nnt();
  if (findGitRoot(n) === null) return null;
  let r = await realpath_19(n).catch(() => n),
    s =
      appState.attribution.fileStates instanceof Map
        ? trackFileDeletion(appState.attribution, r)
        : appState.attribution,
    fileStates = s.fileStates,
    S = fileStates instanceof Map ? Array.from(fileStates.keys()) : Object.keys(fileStates);
  if (S.length === 0) return null;
  try {
    return await calculateCommitAttribution([s], S);
  } catch (error) {
    if (error instanceof GitListingError)
      return (
        logForDebugging(`PR Attribution: skipping stats - ${error.message}`),
        PR_ATTRIBUTION_STATS_UNKNOWN
      );
    return (logError(error), null);
  }
}
//@ chunk-e6aww6q8.js:1473054-1473088 layout
var MEMORY_ACCESS_TOOL_NAMES = new Set([
  FILE_READ_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  MEMORY_READ,
  MEMORY_WRITE,
]);
//@ chunk-e6aww6q8.js:1473088-1473370 callgraph-fingerprint = countMemoryFileAccessFromEntries (0.661)
function countMemoryFileAccessFromEntries(entries) {
  let count = 0;
  for (let entry of entries) {
    if (entry.type !== "assistant") continue;
    let content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (!block || typeof block !== "object" || !("type" in block)) continue;
      if (block.type !== "tool_use" || !MEMORY_ACCESS_TOOL_NAMES.has(block.name)) continue;
      if (isMemoryFileAccess(block.name, block.input)) count++;
    }
  }
  return count;
}
/**
 * 从当前转录统计用户提示数与记忆文件访问数（压缩边界后重新计数）。
 */
//@ chunk-e6aww6q8.js:1473370-1473876 fingerprint = getTranscriptStats (0.865)
async function getTranscriptStats(e) {
  try {
    let filePath = getTranscriptPath(),
      r = wrapStorageSource(getTranscriptStorageKey(filePath, e)),
      s;
    if (r !== void 0 && r.hoverRestOn) {
      let stats = await r.source.backend.stat(r.source.key);
      if (!stats.ok) return { promptCount: 0, memoryAccessCount: 0 };
      s = stats.value.size;
    } else s = (await stat_12(filePath)).size;
    let buf = (await readTranscriptForLoad(filePath, s, r)).postBoundaryBuf,
      filtered = parseJSONL(buf).filter((G) => isPlainObject_4(G)),
      lastBoundaryIdx = filtered.findLastIndex(
        (G) => G.type === "system" && "subtype" in G && G.subtype === "compact_boundary",
      ),
      postBoundary = lastBoundaryIdx >= 0 ? filtered.slice(lastBoundaryIdx + 1) : filtered;
    return {
      promptCount: countHumanUserPrompts(postBoundary),
      memoryAccessCount: countMemoryFileAccessFromEntries(postBoundary),
    };
  } catch {
    return { promptCount: 0, memoryAccessCount: 0 };
  }
}
//@ chunk-e6aww6q8.js:1473876-1474044 layout
async function buildPRAttributionTrailer(e, n) {
  let r = getSessionAttribution({ includeOutboundOnly: !0 }),
    { url: url, line: line } = getSessionTrailerParts(r),
    y = await getEnhancedPRAttribution(e, url, line, n),
    S = line ?? url,
    w =
      !S || y.includes(S)
        ? y
        : y
          ? `${y}

${S}`
          : S;
  return applyAttributionTextHooks("pr", w);
}
/**
 * 增强版 PR 署名：在默认文本基础上附加 Claude 贡献比例、提示次数、记忆访问次数等统计；attribution.pr 或 includeCoAuthoredBy=false 时直接返回对应值。
 */
//@ chunk-e6aww6q8.js:1474044-1475050 fingerprint = getEnhancedPRAttribution (0.815)
async function getEnhancedPRAttribution(e, n, r, s) {
  let h = isStorageV5Enabled() ? s : void 0,
    y = getInitialSettings_2();
  if (y.attribution?.pr !== void 0) return y.attribution.pr;
  if (y.includeCoAuthoredBy === !1) return (getAttributionDisabledSignal().fire("pr_base"), "");
  let settings = getGeneratedWithFooter(),
    appState = e();
  if (
    (logForDebugging(`PR Attribution: appState.attribution exists: ${!!appState.attribution}`),
    appState.attribution)
  ) {
    let fileStates = appState.attribution.fileStates,
      ze = fileStates instanceof Map ? fileStates.size : Object.keys(fileStates).length;
    logForDebugging(`PR Attribution: fileStates count: ${ze}`);
  }
  let [L, { promptCount: G, memoryAccessCount: q }, Z] = await Promise.all([
    getPRAttributionData(appState),
    getTranscriptStats(h),
    isInternalModelRepo(Nnt()),
  ]);
  if (L === PR_ATTRIBUTION_STATS_UNKNOWN)
    return (logForDebugging("PR Attribution: returning default (stats unknown)"), settings);
  let claudePercent = L?.summary.claudePercent ?? 0;
  logForDebugging(
    `PR Attribution: claudePercent: ${claudePercent}, promptCount: ${G}, memoryAccessCount: ${q}`,
  );
  let ke = getCanonicalName(getMainLoopModel(), { identity: !0 }),
    we = Z ? ke : getModelFamilyForAttribution(ke),
    Ee = vqr(we) ? we : "unknown";
  if (claudePercent === 0 && G === 0 && q === 0)
    return (logForDebugging("PR Attribution: returning default (no data)"), settings);
  let Ae = q > 0 ? `, ${q} ${q === 1 ? "memory" : "memories"} recalled` : "",
    summary = `${settings} (${claudePercent}% ${G}-shotted by ${Ee}${Ae})`;
  return (logForDebugging(`PR Attribution: returning summary: ${summary}`), summary);
}
//@ chunk-tyg7f3ek.js:47443-47530 fingerprint = countUserPromptsFromEntries (1)
function countUserPromptsFromEntries(e, n) {
  let r = e[n];
  return !("isSidechain" in r && r.isSidechain === !0) && sBo(e, n);
}

export {
  CSt,
  e8t,
  buildPRAttributionTrailer,
  getPolicyAttributionOverrides,
  getSessionAttribution,
  countUserPromptsFromEntries,
};
