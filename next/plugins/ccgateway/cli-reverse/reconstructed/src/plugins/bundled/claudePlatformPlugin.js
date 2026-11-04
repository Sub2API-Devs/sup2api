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
import { __export } from "../../../runtime/bun-runtime.js";
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
import { isBundledSkillGatedOff } from "../../skills/bundledSkillsGate.js";

//@ chunk-ad0qz7kc.js:3822-3831 placement
/**
 * 空对象默认导出
 */
var EMPTY_MODULE = {};
//@ chunk-ad0qz7kc.js:3831-4029 placement
__export(EMPTY_MODULE, {
  MCP_SERVERS: () => CLAUDE_PLATFORM_MCP_SERVERS,
  PLUGIN_DESCRIPTION: () => CLAUDE_PLATFORM_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_CLAUDE_PLATFORM,
  PLUGIN_VERSION: () => CLAUDE_PLATFORM_PLUGIN_VERSION,
  availabilityFlag: () => CLAUDE_PLATFORM_FLAG,
  default: () => EMPTY_MODULE,
  isAvailable: () => isClaudePlatformAvailable,
  mayUseServer: () => mayUseClaudePlatformServer,
  registerPlugin: () => registerClaudePlatformPlugin,
  skills: () => loadClaudeApiSkills,
});
//@ chunk-ad0qz7kc.js:4029-4071 placement
/**
 * 返回 Claude 平台插件的特性开关名 tengu_peppy_crescent。
 */
function CLAUDE_PLATFORM_FLAG() {
  return "tengu_peppy_crescent";
}
//@ chunk-ad0qz7kc.js:4071-4311 placement
/**
 * Claude 平台插件可用条件：交互式、非后台、非 --agent-id、非 bare、tool search 为 tst、第一方 API、合规无污点且开关开启。
 */
function isClaudePlatformAvailable() {
  return (
    getIsInteractive() &&
    !isBgSession() &&
    eagerParseCliFlag("--agent-id") === undefined &&
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
    getFeatureValue_SESSION_PINNED(CLAUDE_PLATFORM_FLAG(), false) === true
  );
}
//@ chunk-ad0qz7kc.js:4311-4383 placement
/**
 * 平台可用、开关为 true 且来源是服务端时才允许使用平台 MCP 服务器。
 */
function mayUseClaudePlatformServer() {
  let { value: enabled, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    CLAUDE_PLATFORM_FLAG(),
    false,
  );
  return isClaudePlatformAvailable() && enabled === true && isServedFeatureSource(source);
}
//@ chunk-ad0qz7kc.js:4383-4453 placement
/**
 * 平台 docs MCP 配置
 */
var CLAUDE_PLATFORM_MCP_SERVERS = {
  docs: {
    type: "http",
    url: "https://platform.claude.com/docs/mcp",
  },
};
//@ chunk-ad0qz7kc.js:4453-4617 placement
var CLAUDE_PLATFORM_DESCRIPTION =
  "Connects Claude to the Claude Platform developer docs (platform.claude.com) so it can search and read them while building with the Claude API (/claude-api)";
//@ chunk-ad0qz7kc.js:4617-4651 placement
var CC_PLUGIN_CLAUDE_PLATFORM = "cc-plugin-claude-platform";
//@ chunk-ad0qz7kc.js:4651-4665 placement
/**
 * 内置 claude-platform 插件的版本号 0.1.0，随插件清单一起声明。
 */
var CLAUDE_PLATFORM_PLUGIN_VERSION = "0.1.0";
//@ chunk-ad0qz7kc.js:4665-4885 placement
/**
 * 加载 claude-api 技能定义（CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL 时禁用，内置同名技能时让位）。
 */
function loadClaudeApiSkills() {
  let { claudeApiSkillDefinition } = require("../../skills/bundled/claudeApiSkill.js");
  let disabled = env.CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL === true;
  let skill = claudeApiSkillDefinition({
    disabled,
  });
  return [
    {
      ...skill,
      isEnabled: () =>
        !disabled && !getHostState().bundledSkills.some((bundledSkill) => bundledSkill.name === skill.name),
    },
  ];
}
//@ chunk-ad0qz7kc.js:4885-5053 placement
/**
 * 注册内置 Claude 平台插件（技能与 MCP 服务器）。
 */
function registerClaudePlatformPlugin() {
  let skills;
  registerBuiltinPlugin({
    name: CC_PLUGIN_CLAUDE_PLATFORM,
    description: CLAUDE_PLATFORM_DESCRIPTION,
    version: CLAUDE_PLATFORM_PLUGIN_VERSION,
    isAvailable: isClaudePlatformAvailable,
    get skills() {
      return isBuiltinPluginAvailable(CC_PLUGIN_CLAUDE_PLATFORM) && !isBundledSkillGatedOff("claude-api")
        ? (skills ??= loadClaudeApiSkills())
        : undefined;
    },
    mcpServers: CLAUDE_PLATFORM_MCP_SERVERS,
    mayConnectMcpServer: mayUseClaudePlatformServer,
  });
}
export {
  CLAUDE_PLATFORM_MCP_SERVERS,
  CLAUDE_PLATFORM_DESCRIPTION,
  CC_PLUGIN_CLAUDE_PLATFORM,
  CLAUDE_PLATFORM_PLUGIN_VERSION,
  CLAUDE_PLATFORM_FLAG,
  EMPTY_MODULE,
  isClaudePlatformAvailable,
  mayUseClaudePlatformServer,
  registerClaudePlatformPlugin,
  loadClaudeApiSkills,
};
