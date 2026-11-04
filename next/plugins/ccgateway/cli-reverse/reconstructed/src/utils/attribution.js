/**
 * utils/attribution.ts
 *
 * commit/PR 署名文本（Co-Authored-By、attribution 设置、includeCoAuthoredBy 兼容）与增强 PR 署名统计（提示数、记忆访问数、Claude 贡献比例）；另混入 tyg7f3ek 的转录轮次判定代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/attribution.ts
 * pieces: chunk-e6aww6q8.js (25), chunk-s61vbvea.js (2), chunk-tyg7f3ek.js (1)
 * attribution: placement 11, layout 9, fingerprint 6, file-local 1, callgraph-fingerprint 1
 */
import { realpath, stat } from "fs/promises";
import { MAX_STRING_ARG_CHARS, CONTROL_CHARS_RE, GitListingError } from "./attributionFileClasses.js";
import {
  HTTPS_CLAUDE_COM_CLAUDE_CODE,
  isRemoteSessionLocal,
  getRemoteSessionUrl,
} from "../constants/product.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { entrypointSurfaceName } from "./entrypointKinds.js";
import { env } from "./env.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { currentRemoteSessionId } from "../tools/AgentTool/agentEffort.js";
import {
  getClientType,
  isReplBridgeActive,
  getRootSession,
  getInferenceProfileBackingModelCached,
} from "../bootstrap/state.js";
import { isSafeBridgeId } from "../bridge/sessionIdCompat.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
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
import { stripAnyVersatileSuffix, isStandardTrailer } from "./model/modelIds.js";
import { ARTIFACT_BLOCK_TAGS } from "../constants/xml.js";
import { cwdOrGitRoot } from "./git/builderGit/gitEnv.js";
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
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { isRealPromptAt } from "./transcript/deserialize.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:200854-200911 placement
/**
 * 判断字符串长度合法且不含控制字符。
 */
function isBoundedCleanString(text) {
  return text.length >= 1 && text.length <= MAX_STRING_ARG_CHARS && hasNoControlChars(text);
}
//@ chunk-s61vbvea.js:200911-200945 placement
/**
 * 判断字符串不含控制字符。
 */
function hasNoControlChars(text) {
  return !CONTROL_CHARS_RE.test(text);
}
//@ chunk-e6aww6q8.js:1469310-1469474 placement
/**
 * 生成 PR 页脚"🤖 Generated with Claude Code"，开关开启时附"via 入口名"。
 */
function getGeneratedWithFooter() {
  let footer = `\uD83E\uDD16 Generated with [Claude Code](${HTTPS_CLAUDE_COM_CLAUDE_CODE})`;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_pr_footer_surface_suffix", false)) return footer;
  let surfaceName = entrypointSurfaceName();
  return surfaceName ? `${footer} via ${surfaceName}` : footer;
}
//@ chunk-e6aww6q8.js:1469474-1470058 placement
/**
 * 返回用于提交/PR 归属的会话链接：受环境变量与设置控制；远程会话用远程会话 id，REPL 桥接（或允许仅出站时）用桥接会话 id；id 不安全或指向本地时返回 null。
 */
function getSessionAttribution({ includeOutboundOnly = false } = {}) {
  if (env.CLAUDE_CODE_SUPPRESS_SESSION_ATTRIBUTION) return null;
  if (getInitialSettings_2().attribution?.sessionUrl === false) return null;
  let remoteSessionId = currentRemoteSessionId();
  if (getClientType() === "remote" || remoteSessionId !== undefined) {
    let sessionId = remoteSessionId ?? env.CLAUDE_CODE_REMOTE_SESSION_ID;
    if (!sessionId || !isSafeBridgeId(sessionId)) return null;
    let SESSION_INGRESS_URL = env.SESSION_INGRESS_URL;
    if (isRemoteSessionLocal(sessionId, SESSION_INGRESS_URL)) return null;
    return {
      url: getRemoteSessionUrl(sessionId, SESSION_INGRESS_URL),
      sessionId,
    };
  }
  if (isReplBridgeActive() || includeOutboundOnly) {
    let replBridgeHandle = getReplBridgeHandle();
    if (!replBridgeHandle || (replBridgeHandle.outboundOnly && !includeOutboundOnly)) return null;
    if (
      !isSafeBridgeId(replBridgeHandle.bridgeSessionId) ||
      isRemoteSessionLocal(replBridgeHandle.bridgeSessionId, replBridgeHandle.sessionIngressUrl)
    )
      return null;
    return {
      url: getRemoteSessionUrl(replBridgeHandle.bridgeSessionId, replBridgeHandle.sessionIngressUrl),
      sessionId: replBridgeHandle.bridgeSessionId,
    };
  }
  return null;
}
//@ chunk-e6aww6q8.js:1470058-1470086 placement
/**
 * 占位实现，恒返回 null（无会话归属信息）。
 */
function stubAttribution(attribution) {
  return null;
}
//@ chunk-e6aww6q8.js:1470086-1470224 placement
function getSessionTrailerParts(attribution) {
  let url = attribution?.url ?? null;
  let url_2 = url !== null && isBoundedCleanString(`Claude-Session: ${url}`) ? url : null;
  let stub = stubAttribution(attribution);
  let line = stub !== null && hasNoControlChars(stub) ? stub : null;
  return {
    url: url_2,
    line,
  };
}
//@ chunk-e6aww6q8.js:1470224-1470363 placement
function appendSessionTrailer(attributionTexts, url, line) {
  let trailerLine = line ?? url;
  return {
    commit: attributionTexts.commit
      ? `${attributionTexts.commit}
Claude-Session: ${url}`
      : `Claude-Session: ${url}`,
    pr: attributionTexts.pr
      ? `${attributionTexts.pr}

${trailerLine}`
      : trailerLine,
  };
}
//@ chunk-e6aww6q8.js:1470363-1470416 placement
/**
 * 按当前会话归属与模型生成提交/PR 的归属文本。
 */
async function buildSessionAttributionTexts({ model } = {}) {
  return buildAttributionTexts(getSessionAttribution(), model);
}
//@ chunk-e6aww6q8.js:1470416-1470454 placement
/**
 * 用默认归属设置（不含会话链接）生成提交/PR 的归属文本。
 */
async function buildDefaultAttributionTexts() {
  return buildAttributionTexts(null);
}
//@ chunk-e6aww6q8.js:1470454-1470611 placement
/**
 * 生成提交与 PR 的归属文本：基础署名加上 Claude-Session 尾注（有会话链接时），并按设置模板渲染。
 */
async function buildAttributionTexts(attribution, model) {
  let attributionTexts = getAttributionTexts(model ?? getMainLoopModel());
  let sessionTrailerParts = getSessionTrailerParts(attribution);
  let trailerTexts =
    sessionTrailerParts.url !== null
      ? appendSessionTrailer(attributionTexts, sessionTrailerParts.url, sessionTrailerParts.line)
      : attributionTexts;
  return {
    commit: await applyAttributionTextHooks("commit", trailerTexts.commit),
    pr: await applyAttributionTextHooks("pr", trailerTexts.pr),
  };
}
//@ chunk-e6aww6q8.js:1470611-1470793 placement
class DeadProbeOnce {
  firedSites = new Set();
  fire(site) {
    if (this.firedSites.has(site)) return;
    this.firedSites.add(site);
    logEvent("tengu_dead_probe_include_coauthored_by", {
      site: fromEnum(site),
    });
  }
  reset() {
    this.firedSites.clear();
  }
}
//@ chunk-e6aww6q8.js:1470793-1470820 layout
var attributionDisabledSignalByHost; // deferred: uses DeadProbeOnce of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1470793", () => {
  attributionDisabledSignalByHost = new HostScoped(() => new DeadProbeOnce());
});
//@ chunk-e6aww6q8.js:1470820-1470859 layout
function getAttributionDisabledSignal() {
  return attributionDisabledSignalByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1470859-1471133 fingerprint (2.1.88 match: getAttributionTexts, 0.589)
/**
 * commit/PR 署名文本：settings.attribution.commit/pr 优先；includeCoAuthoredBy=false 时为空；默认 commit 为 `Co-Authored-By: <模型名> <noreply@anthropic.com>`，PR 为默认链接文本。
 */
function getAttributionTexts(model) {
  let model_2 = getGeneratedWithFooter();
  let defaultAttribution = `Co-Authored-By: ${getAttributionModelName(model)} <noreply@anthropic.com>`;
  let settings = getInitialSettings_2();
  let attribution = settings.attribution;
  if (attribution !== undefined && getPromptContent_2(attribution))
    return {
      commit: attribution.commit ?? defaultAttribution,
      pr: attribution.pr ?? model_2,
    };
  if (settings.includeCoAuthoredBy === false) {
    getAttributionDisabledSignal().fire("attribution_texts");
    return {
      commit: "",
      pr: "",
    };
  }
  return {
    commit: defaultAttribution,
    pr: model_2,
  };
}
//@ chunk-e6aww6q8.js:1471133-1471240 layout
function getPolicyAttributionOverrides() {
  let attribution = getSettingsForSource("policySettings")?.attribution;
  return {
    commit: Boolean(attribution?.commit),
    pr: Boolean(attribution?.pr),
  };
}
//@ chunk-e6aww6q8.js:1471240-1471500 layout
/**
 * 署名中显示的名字：可公开的模型名（如 Claude Opus 5.5），否则 Claude 或 Claude Code。
 */
function getAttributionModelName(model) {
  let isRecognized = isRecognizedModel(
    model,
    getCanonicalName(model, {
      identity: true,
    }),
  );
  if (
    isFableFamilyOrPinnedModel(model, {
      identity: true,
    }) &&
    (!isFirstPartyProvider() || isFirstPartyAnthropicBaseUrl() || isRecognized)
  ) {
    if (getPublicModelDisplayName(model) !== null) return getPublicModelName(model);
    return getCanonicalName(model, {
      identity: true,
    }).includes("claude-fable-")
      ? "Claude"
      : getPublicModelName(CLAUDE_FABLE_5_CONFIG.firstParty);
  }
  if (isRecognizedModelIdForAttribution(model)) return getPublicModelName(model);
  return isRecognized ? "Claude" : "Claude Code";
}
//@ chunk-e6aww6q8.js:1471500-1471919 layout
function isRecognizedModelIdForAttribution(modelId) {
  if (getPublicModelDisplayName(modelId) === null) return false;
  let overriddenId = reverseModelOverride(modelId);
  if (overriddenId !== modelId && Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, overriddenId)) return true;
  let canonicalName = getCanonicalName(modelId, {
    identity: true,
  });
  let lower = stripAnyVersatileSuffix(modelId).toLowerCase();
  let index = lower.indexOf(canonicalName);
  let canonicalLength = canonicalName.length;
  if (index === -1 && canonicalName.endsWith("-0")) {
    let sliced = canonicalName.slice(0, -2);
    index = lower.indexOf(sliced);
    canonicalLength = sliced.length;
  }
  if (index === -1) {
    if (!modelId.includes("application-inference-profile")) return false;
    let inferenceProfileBackingModel = getInferenceProfileBackingModelCached(
      stripAnyVersatileSuffix(modelId),
    );
    return !!inferenceProfileBackingModel && isRecognizedModelIdForAttribution(inferenceProfileBackingModel);
  }
  let sliced = lower.slice(0, index);
  let trailer = lower.slice(index + canonicalLength);
  return (sliced === "" || /[./]$/.test(sliced)) && isStandardTrailer(trailer);
}
//@ chunk-e6aww6q8.js:1471919-1471994 file-local
function isTerminalOutput(content) {
  for (let tag of ARTIFACT_BLOCK_TAGS) if (content.includes(`<${tag}>`)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:1471994-1472387 fingerprint (2.1.88 match: countUserPromptsInMessages, 1)
function countUserPromptsInMessages(messages) {
  let count = 0;
  for (let message of messages) {
    if (message.type !== "user") continue;
    let content = message.message?.content;
    if (!content) continue;
    let hasUserText = false;
    if (typeof content === "string") {
      if (isTerminalOutput(content)) continue;
      hasUserText = content.trim().length > 0;
    } else if (Array.isArray(content))
      hasUserText = content.some((block) => {
        if (!block || typeof block !== "object" || !("type" in block)) return false;
        return (
          (block.type === "text" && typeof block.text === "string" && !isTerminalOutput(block.text)) ||
          block.type === "image" ||
          block.type === "document"
        );
      });
    if (hasUserText) count++;
  }
  return count;
}
//@ chunk-e6aww6q8.js:1472387-1472571 layout
function countHumanUserPrompts(entries) {
  let nonSidechain = entries.filter(
    (entry) =>
      entry.type === "user" &&
      !("isSidechain" in entry && entry.isSidechain) &&
      !("isMeta" in entry && entry.isMeta) &&
      !("isCompactSummary" in entry && entry.isCompactSummary),
  );
  return countUserPromptsInMessages(nonSidechain);
}
//@ chunk-e6aww6q8.js:1472571-1472618 layout
var PR_ATTRIBUTION_STATS_UNKNOWN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1472571", () => {
  PR_ATTRIBUTION_STATS_UNKNOWN = Symbol("pr-attribution-stats-unknown");
});
//@ chunk-e6aww6q8.js:1472618-1473054 fingerprint (2.1.88 match: getPRAttributionData, 0.624)
/**
 * 从 AppState.attribution 计算 PR 级 Claude 贡献数据，未知时返回 PR_ATTRIBUTION_STATS_UNKNOWN。
 */
async function getPRAttributionData(appState) {
  if (!appState.attribution) return null;
  let cwd = cwdOrGitRoot();
  if (findGitRoot(cwd) === null) return null;
  let rootPath = await realpath(cwd).catch(() => cwd);
  let attributionState =
    appState.attribution.fileStates instanceof Map
      ? trackFileDeletion(appState.attribution, rootPath)
      : appState.attribution;
  let fileStates = attributionState.fileStates;
  let trackedFiles = fileStates instanceof Map ? Array.from(fileStates.keys()) : Object.keys(fileStates);
  if (trackedFiles.length === 0) return null;
  try {
    return await calculateCommitAttribution([attributionState], trackedFiles);
  } catch (error) {
    if (error instanceof GitListingError) {
      logForDebugging(`PR Attribution: skipping stats - ${error.message}`);
      return PR_ATTRIBUTION_STATS_UNKNOWN;
    }
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:1473054-1473088 layout
var MEMORY_ACCESS_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1473054", () => {
  MEMORY_ACCESS_TOOL_NAMES = new Set([
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    MEMORY_READ,
    MEMORY_WRITE,
  ]);
});
//@ chunk-e6aww6q8.js:1473088-1473370 callgraph-fingerprint (2.1.88 match: countMemoryFileAccessFromEntries, 0.661)
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
//@ chunk-e6aww6q8.js:1473370-1473876 fingerprint (2.1.88 match: getTranscriptStats, 0.865)
/**
 * 从当前转录统计用户提示数与记忆文件访问数（压缩边界后重新计数）。
 */
async function getTranscriptStats(storageV5) {
  try {
    let filePath = getTranscriptPath();
    let storageSource = wrapStorageSource(getTranscriptStorageKey(filePath, storageV5));
    let fileSize;
    if (storageSource !== undefined && storageSource.hoverRestOn) {
      let stats = await storageSource.source.backend.stat(storageSource.source.key);
      if (!stats.ok)
        return {
          promptCount: 0,
          memoryAccessCount: 0,
        };
      fileSize = stats.value.size;
    } else fileSize = (await stat(filePath)).size;
    let buf = (await readTranscriptForLoad(filePath, fileSize, storageSource)).postBoundaryBuf;
    let entries = parseJSONL(buf).filter((entry) => isPlainObject_5(entry));
    let lastBoundaryIdx = entries.findLastIndex(
      (e) => e.type === "system" && "subtype" in e && e.subtype === "compact_boundary",
    );
    let postBoundary = lastBoundaryIdx >= 0 ? entries.slice(lastBoundaryIdx + 1) : entries;
    return {
      promptCount: countHumanUserPrompts(postBoundary),
      memoryAccessCount: countMemoryFileAccessFromEntries(postBoundary),
    };
  } catch {
    return {
      promptCount: 0,
      memoryAccessCount: 0,
    };
  }
}
//@ chunk-e6aww6q8.js:1473876-1474044 layout
async function buildPRAttributionTrailer(getAppState, storageV5) {
  let attribution = getSessionAttribution({
    includeOutboundOnly: true,
  });
  let { url, line } = getSessionTrailerParts(attribution);
  let enhancedPRAttribution = await getEnhancedPRAttribution(getAppState, url, line, storageV5);
  let trailerLine = line ?? url;
  let prText =
    !trailerLine || enhancedPRAttribution.includes(trailerLine)
      ? enhancedPRAttribution
      : enhancedPRAttribution
        ? `${enhancedPRAttribution}

${trailerLine}`
        : trailerLine;
  return applyAttributionTextHooks("pr", prText);
}
//@ chunk-e6aww6q8.js:1474044-1475050 fingerprint (2.1.88 match: getEnhancedPRAttribution, 0.815)
/**
 * 增强版 PR 署名：在默认文本基础上附加 Claude 贡献比例、提示次数、记忆访问次数等统计；attribution.pr 或 includeCoAuthoredBy=false 时直接返回对应值。
 */
async function getEnhancedPRAttribution(getAppState, url, line, storageV5) {
  let storage = isStorageV5Enabled() ? storageV5 : undefined;
  let settings = getInitialSettings_2();
  if (settings.attribution?.pr !== undefined) return settings.attribution.pr;
  if (settings.includeCoAuthoredBy === false) {
    getAttributionDisabledSignal().fire("pr_base");
    return "";
  }
  let defaultAttribution = getGeneratedWithFooter();
  let appState = getAppState();
  logForDebugging(`PR Attribution: appState.attribution exists: ${!!appState.attribution}`);
  if (appState.attribution) {
    let fileStates = appState.attribution.fileStates;
    let fileStateCount = fileStates instanceof Map ? fileStates.size : Object.keys(fileStates).length;
    logForDebugging(`PR Attribution: fileStates count: ${fileStateCount}`);
  }
  let [attributionData, { promptCount, memoryAccessCount }, isInternal] = await Promise.all([
    getPRAttributionData(appState),
    getTranscriptStats(storage),
    isInternalModelRepo(cwdOrGitRoot()),
  ]);
  if (attributionData === PR_ATTRIBUTION_STATS_UNKNOWN) {
    logForDebugging("PR Attribution: returning default (stats unknown)");
    return defaultAttribution;
  }
  let claudePercent = attributionData?.summary.claudePercent ?? 0;
  logForDebugging(
    `PR Attribution: claudePercent: ${claudePercent}, promptCount: ${promptCount}, memoryAccessCount: ${memoryAccessCount}`,
  );
  let rawModelName = getCanonicalName(getMainLoopModel(), {
    identity: true,
  });
  let modelLabel = isInternal ? rawModelName : getModelFamilyForAttribution(rawModelName);
  let safeModelLabel = hasNoControlChars(modelLabel) ? modelLabel : "unknown";
  if (claudePercent === 0 && promptCount === 0 && memoryAccessCount === 0) {
    logForDebugging("PR Attribution: returning default (no data)");
    return defaultAttribution;
  }
  let memSuffix =
    memoryAccessCount > 0
      ? `, ${memoryAccessCount} ${memoryAccessCount === 1 ? "memory" : "memories"} recalled`
      : "";
  let summary = `${defaultAttribution} (${claudePercent}% ${promptCount}-shotted by ${safeModelLabel}${memSuffix})`;
  logForDebugging(`PR Attribution: returning summary: ${summary}`);
  return summary;
}
//@ chunk-tyg7f3ek.js:47443-47530 fingerprint (2.1.88 match: countUserPromptsFromEntries, 1)
function countUserPromptsFromEntries(entries, index) {
  let entry = entries[index];
  return !("isSidechain" in entry && entry.isSidechain === true) && isRealPromptAt(entries, index);
}
export {
  buildSessionAttributionTexts,
  buildDefaultAttributionTexts,
  buildPRAttributionTrailer,
  getPolicyAttributionOverrides,
  getSessionAttribution,
  countUserPromptsFromEntries,
};
