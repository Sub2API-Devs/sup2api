/**
 * utils/hostEnvironment.ts
 *
 * 2.1.316 新增：宿主级状态（内置技能、内置插件、工作流、MCP 内置工具等注册表）；Map 中取值，缺失时创建等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f22e0a61.js (14)
 * attribution: placement 14
 */
import { createSignal } from "./signal.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getGatewayAuth } from "../bootstrap/state.js";
import { env } from "./env.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { isTelemetryDisabled } from "./privacyLevel.js";

//@ chunk-f22e0a61.js:407-419 placement
var CLI = "cli";
//@ chunk-f22e0a61.js:419-3025 placement
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
  reservedSpellingsFor(e, t) {
    let n = this.reservedSpellingsByLoadedResult.get(e);
    if (n) return n;
    let l = t();
    this.reservedSpellingsByLoadedResult.set(e, l);
    return l;
  }
  refusedReservedSkillNames() {
    return Array.from(
      this.dynamicSkillStates.get(this.dynamicSkillStateKey())?.refusedReservedNames.values() ?? [],
    );
  }
  markLoadedResultMissingTrustedNames(e) {
    this.loadedResultsMissingTrustedNames.add(e);
  }
  loadedResultIsMissingTrustedNames(e) {
    return this.loadedResultsMissingTrustedNames.has(e);
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
    let e = this.dynamicSkillStates.get(this.dynamicSkillStateKey());
    if (e) {
      e.conditionalSkills.clear();
      e.activatedConditionalSkillNames.clear();
    }
  }
  evictDynamicSkillState(e) {
    this.dynamicSkillStates.delete(e);
    let t = `${e}:`;
    for (let key of [...this.skillDirCommands.keys()])
      if (key.startsWith(t)) this.skillDirCommands.delete(key);
  }
}
//@ chunk-f22e0a61.js:3025-3113 placement
/**
 * Map 中取值，缺失时创建。
 */
function getOrCreate(e, t, n) {
  let l = e.get(t);
  if (l !== undefined) return l;
  let s = n();
  e.set(t, s);
  return s;
}
//@ chunk-f22e0a61.js:3113-3146 placement
/**
 * undefined 键映射为 \0。
 */
function keyOrNull(e) {
  return e ?? "\x00";
}
//@ chunk-f22e0a61.js:3146-3169 placement
var providerManagedHostRegistry = new HostScoped(() => new HostEnvironmentState());
//@ chunk-f22e0a61.js:3169-3205 placement
/**
 * 取当前宿主状态。
 */
function getHostState() {
  return providerManagedHostRegistry.of(getRootSession().host);
}
//@ chunk-f22e0a61.js:3205-3296 placement = withoutHostManagedProviderVars (1)
function withoutHostManagedProviderVars() {
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return false;
  if (!isFirstPartyProvider()) return true;
  return false;
}
//@ chunk-f22e0a61.js:3296-3394 placement
/**
 * 判断是否为 BYOC 环境且未启用 Datadog。
 */
function isByocDatadogDisabled() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" && !env.CLAUDE_CODE_BYOC_ENABLE_DATADOG;
}
//@ chunk-f22e0a61.js:3394-3454 placement
function isCustomOauthUrlSet() {
  return env.CLAUDE_CODE_CUSTOM_OAUTH_URL !== undefined;
}
//@ chunk-f22e0a61.js:3454-3487 placement
/**
 * 是否允许 Datadog 上报。
 */
function isDatadogAllowed() {
  return !isTelemetryDisabled() && !isCustomOauthUrlSet();
}
//@ chunk-f22e0a61.js:3487-3536 placement
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
//@ chunk-f22e0a61.js:3536-3580 placement
/**
 * 判断反馈调查的 OTEL 上报是否开启。
 */
function isFeedbackSurveyOtelOn() {
  return withoutHostManagedProviderVars() || getGatewayAuth() !== null || isCustomOauthUrlSet();
}
//@ chunk-f22e0a61.js:3580-3648 placement
/**
 * CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL。
 */
function isFeedbackSurveyForOtel() {
  return env.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL;
}
//@ chunk-f22e0a61.js:3648-3692 placement
/**
 * 是否跳过反馈调查。
 */
function shouldSkipFeedbackSurvey() {
  if (isFeedbackSurveyForOtel()) return false;
  return isTelemetryDisabled();
}
export {
  getHostState,
  isFeedbackSurveyForOtel,
  shouldSkipFeedbackSurvey,
  keyOrNull,
  isFirstPartyTelemetryBlocked,
  isByocDatadogDisabled,
  getOrCreate,
  isFeedbackSurveyOtelOn,
  isDatadogAllowed,
};
