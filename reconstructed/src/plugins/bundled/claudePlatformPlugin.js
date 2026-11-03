/**
 * plugins/bundled/claudePlatformPlugin.ts
 *
 * 2.1.316 新增：内置 Claude 平台插件（managed agents CLI 相关）定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad0qz7kc.js (11)
 * attribution: placement 11
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { eagerParseCliFlag } from "../../utils/cliArgs.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getToolSearchMode } from "../../utils/toolSearch.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import {
  complianceTaintsSettled,
  isPolicyVerdictAbsent,
} from "../../services/policyLimits/policyVerdicts.js";
import { isSessionVerdictDisowned } from "../../services/policyLimits/policyEvidence.js";
import { getComplianceTaints } from "../../services/policyLimits/complianceTaints.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
} from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { registerBuiltinPlugin, isBuiltinPluginAvailable } from "../builtinPlugins.js";
import { Jme } from "../../skills/bundledSkillsGate.js";

//@ chunk-ad0qz7kc.js:3822-3831 placement
var f = {};
//@ chunk-ad0qz7kc.js:3831-4029 placement
Ar(f, {
  MCP_SERVERS: () => s,
  PLUGIN_DESCRIPTION: () => CLAUDE_PLATFORM_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_CLAUDE_PLATFORM,
  PLUGIN_VERSION: () => a,
  availabilityFlag: () => o,
  default: () => f,
  isAvailable: () => isClaudePlatformAvailable,
  mayUseServer: () => n,
  registerPlugin: () => registerClaudePlatformPlugin,
  skills: () => loadClaudeApiSkills,
});
//@ chunk-ad0qz7kc.js:4029-4071 placement
function o() {
  return "tengu_peppy_crescent";
}
/**
 * Claude 平台插件可用条件：交互式、非后台、非 --agent-id、非 bare、tool search 为 tst、第一方 API、合规无污点且开关开启。
 */
//@ chunk-ad0qz7kc.js:4071-4311 placement
function isClaudePlatformAvailable() {
  return (
    getIsInteractive() &&
    !isBgSession() &&
    eagerParseCliFlag("--agent-id") === void 0 &&
    !isBareMode() &&
    !isCustomizationDisabled("mcpAutoDiscovered") &&
    getToolSearchMode() === "tst" &&
    !isEssentialTrafficOnly() &&
    isFirstPartyBaseUrl() &&
    isFirstPartyAnthropicHost(
      getInitialSettings_2().env?.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    ) &&
    complianceTaintsSettled() &&
    !isPolicyVerdictAbsent() &&
    !isSessionVerdictDisowned() &&
    getComplianceTaints().length === 0 &&
    getFeatureValue_SESSION_PINNED(o(), !1) === !0
  );
}
//@ chunk-ad0qz7kc.js:4311-4383 placement
function n() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(o(), !1);
  return isClaudePlatformAvailable() && e === !0 && isServedFeatureSource(source);
}
//@ chunk-ad0qz7kc.js:4383-4453 placement
var s = { docs: { type: "http", url: "https://platform.claude.com/docs/mcp" } };
//@ chunk-ad0qz7kc.js:4453-4617 placement
var CLAUDE_PLATFORM_DESCRIPTION =
  "Connects Claude to the Claude Platform developer docs (platform.claude.com) so it can search and read them while building with the Claude API (/claude-api)";
//@ chunk-ad0qz7kc.js:4617-4651 placement
var CC_PLUGIN_CLAUDE_PLATFORM = "cc-plugin-claude-platform";
//@ chunk-ad0qz7kc.js:4651-4665 placement
var a = "0.1.0";
/**
 * 加载 claude-api 技能定义（CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL 时禁用，内置同名技能时让位）。
 */
//@ chunk-ad0qz7kc.js:4665-4885 placement
function loadClaudeApiSkills() {
  let { claudeApiSkillDefinition: claudeApiSkillDefinition } = require("./chunk-7dsm65bp.js"),
    r = env.CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL === !0,
    d = claudeApiSkillDefinition({ disabled: r });
  return [
    {
      ...d,
      isEnabled: () =>
        !r && !getHostState().bundledSkills.some((bundledSkill) => bundledSkill.name === d.name),
    },
  ];
}
/**
 * 注册内置 Claude 平台插件（技能与 MCP 服务器）。
 */
//@ chunk-ad0qz7kc.js:4885-5053 placement
function registerClaudePlatformPlugin() {
  let e;
  registerBuiltinPlugin({
    name: CC_PLUGIN_CLAUDE_PLATFORM,
    description: CLAUDE_PLATFORM_DESCRIPTION,
    version: a,
    isAvailable: isClaudePlatformAvailable,
    get skills() {
      return isBuiltinPluginAvailable(CC_PLUGIN_CLAUDE_PLATFORM) && !Jme("claude-api")
        ? (e ??= loadClaudeApiSkills())
        : void 0;
    },
    mcpServers: s,
    mayConnectMcpServer: n,
  });
}
