/**
 * utils/hostEnvironment.ts
 *
 * 2.1.316 新增：宿主级状态（内置技能、内置插件、工作流、MCP 内置工具等注册表）；Map 中取值，缺失时创建等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d161y6b9.js (8), chunk-zx81qjk9.js (6)
 * attribution: placement 14
 */
import { createSignal } from "./signal.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getGatewayAuth } from "../bootstrap/state.js";
import { env } from "./env.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { isTelemetryDisabled } from "./privacyLevel.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-zx81qjk9.js:297-309 placement
var CLI = "cli";
//@ chunk-zx81qjk9.js:309-2915 placement
/**
 * 宿主级状态（内置技能、内置插件、工作流、MCP 内置工具等注册表）。
 */
class HostEnvironmentState {
  bundledSkills = [];
  bundledSkillKillSwitchSurvivors = new Set();
  bundledSkillSessionResetHooks = [];
  bundledSkillsInitialized = false;
  shippedTablesFillFailed = false;
  bundledSkillFilesElsewhere = undefined;
  commandsOffHere = undefined;
  attachedFolderSkills = undefined;
  builtinToolsServedByMcp = undefined;
  builtinCommandTable = undefined;
  builtinCommandNames = undefined;
  shippedCommandNames = undefined;
  loadedCommands = new Map();
  skillToolCommands = new Map();
  slashCommandToolSkills = new Map();
  skillIndex = new Map();
  reservedSpellingsByLoadedResult = new WeakMap();
  loadedResultsMissingTrustedNames = new WeakSet();
  skillDirCommands = new Map();
  dynamicSkillStates = new Map();
  dynamicSkillStateKey = () => CLI;
  dynamicSkillsLoaded = createSignal();
  skillsChanged = createSignal();
  isAnnouncingFreshLoad = false;
  shadowedBundledSkills = undefined;
  fallbackShadowTelemetryLogged = new Set();
  skillContentIntern = new Map();
  skillFiles = new WeakMap();
  builtinPlugins = new Map();
  builtinPluginsInitialized = false;
  builtinPluginFailures = new Map();
  builtinPluginWiredSkills = new WeakMap();
  bundledWorkflows = [];
  markdownFiles = new Map();
  markdownScansGivenUp = 0;
  agentDefinitions = new Map();
  projectAgentsElsewhere = [];
  namesNotShown = new Set();
  realSkillRootByCommand = new WeakMap();
  projectOutputStylesElsewhere = [];
  outputStyleDirStyles = new Map();
  allOutputStyles = new Map();
  routines = new Map();
  routineCronTasks = new Map();
  allWorkflows = new Map();
  reservedSpellingsFor(loadedResult, compute) {
    let spellings = this.reservedSpellingsByLoadedResult.get(loadedResult);
    if (spellings) return spellings;
    let computedSpellings = compute();
    this.reservedSpellingsByLoadedResult.set(loadedResult, computedSpellings);
    return computedSpellings;
  }
  refusedReservedSkillNames() {
    return Array.from(
      this.dynamicSkillStates.get(this.dynamicSkillStateKey())?.refusedReservedNames.values() ?? [],
    );
  }
  markLoadedResultMissingTrustedNames(loadedResult) {
    this.loadedResultsMissingTrustedNames.add(loadedResult);
  }
  loadedResultIsMissingTrustedNames(loadedResult) {
    return this.loadedResultsMissingTrustedNames.has(loadedResult);
  }
  clearLoadCaches() {
    this.invalidateCommands();
    this.skillDirCommands.clear();
    this.markdownFiles.clear();
    this.agentDefinitions.clear();
    this.outputStyleDirStyles.clear();
    this.allOutputStyles.clear();
    this.routines.clear();
    this.routineCronTasks.clear();
    this.allWorkflows.clear();
    this.namesNotShown.clear();
  }
  invalidateCommands() {
    this.builtinCommandTable = undefined;
    this.builtinCommandNames = undefined;
    this.shippedCommandNames = undefined;
    this.loadedCommands.clear();
    this.skillToolCommands.clear();
    this.slashCommandToolSkills.clear();
    this.skillIndex.clear();
  }
  invalidateSkillDirs() {
    this.skillDirCommands.clear();
    let state = this.dynamicSkillStates.get(this.dynamicSkillStateKey());
    if (state) {
      state.conditionalSkills.clear();
      state.activatedConditionalSkillNames.clear();
    }
  }
  evictDynamicSkillState(stateKey) {
    this.dynamicSkillStates.delete(stateKey);
    let keyPrefix = `${stateKey}:`;
    for (let key of [...this.skillDirCommands.keys()])
      if (key.startsWith(keyPrefix)) this.skillDirCommands.delete(key);
  }
}
//@ chunk-zx81qjk9.js:2915-3003 placement
/**
 * Map 中取值，缺失时创建。
 */
function getOrCreate(map, key, createValue) {
  let existing = map.get(key);
  if (existing !== undefined) return existing;
  let value = createValue();
  map.set(key, value);
  return value;
}
//@ chunk-zx81qjk9.js:3003-3036 placement
/**
 * undefined 键映射为 \0。
 */
function keyOrNull(key) {
  return key ?? "\x00";
}
//@ chunk-zx81qjk9.js:3036-3059 placement
var providerManagedHostRegistry; // deferred: uses HostEnvironmentState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zx81qjk9.js:3036", () => {
  providerManagedHostRegistry = new HostScoped(() => new HostEnvironmentState());
});
//@ chunk-zx81qjk9.js:3059-3095 placement
/**
 * 取当前宿主状态。
 */
function getHostState() {
  return providerManagedHostRegistry.of(getRootSession().host);
}
//@ chunk-d161y6b9.js:334-425 placement (2.1.88 match: withoutHostManagedProviderVars, 1)
function withoutHostManagedProviderVars() {
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return false;
  if (!isFirstPartyProvider()) return true;
  return false;
}
//@ chunk-d161y6b9.js:425-523 placement
/**
 * 判断是否为 BYOC 环境且未启用 Datadog。
 */
function isByocDatadogDisabled() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" && !env.CLAUDE_CODE_BYOC_ENABLE_DATADOG;
}
//@ chunk-d161y6b9.js:523-583 placement
function isCustomOauthUrlSet() {
  return env.CLAUDE_CODE_CUSTOM_OAUTH_URL !== undefined;
}
//@ chunk-d161y6b9.js:583-616 placement
/**
 * 是否允许 Datadog 上报。
 */
function isDatadogAllowed() {
  return !isTelemetryDisabled() && !isCustomOauthUrlSet();
}
//@ chunk-d161y6b9.js:616-665 placement
/**
 * 是否为第三方提供商、网关或自定义 OAuth。
 */
function isFirstPartyTelemetryBlocked() {
  return (
    isTelemetryDisabled() ||
    withoutHostManagedProviderVars() ||
    getGatewayAuth() !== null ||
    isCustomOauthUrlSet()
  );
}
//@ chunk-d161y6b9.js:665-709 placement
/**
 * 判断反馈调查的 OTEL 上报是否开启。
 */
function isFeedbackSurveyOtelOn() {
  return withoutHostManagedProviderVars() || getGatewayAuth() !== null || isCustomOauthUrlSet();
}
//@ chunk-d161y6b9.js:709-777 placement
/**
 * CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL。
 */
function isFeedbackSurveyForOtel() {
  return env.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL;
}
//@ chunk-d161y6b9.js:777-821 placement
/**
 * 是否跳过反馈调查。
 */
function shouldSkipFeedbackSurvey() {
  if (isFeedbackSurveyForOtel()) return false;
  return isTelemetryDisabled();
}
export {
  getHostState,
  isFirstPartyTelemetryBlocked,
  isFeedbackSurveyForOtel,
  isDatadogAllowed,
  shouldSkipFeedbackSurvey,
  keyOrNull,
  getOrCreate,
  isFeedbackSurveyOtelOn,
  isByocDatadogDisabled,
};
