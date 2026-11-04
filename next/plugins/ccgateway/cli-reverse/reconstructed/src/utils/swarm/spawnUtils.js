/**
 * utils/swarm/spawnUtils.ts
 *
 * pane 型 teammate 启动命令：需透传的环境变量与继承的 CLI 参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/spawnUtils.ts
 * pieces: chunk-ae5g0zb5.js (1), chunk-cne5hsvz.js (1)
 * attribution: fingerprint 1, callgraph-witnessed 1
 */
import { buildInheritedCliFlags_2 } from "../../tools/shared/spawnMultiAgent.js";
import { proactivityLevelIfActive } from "../proactivityLevel.js";
import { antBuiltinDenyRules } from "../permissions/permissionSetup.js";
import { splitRuleList } from "../permissions/disallowedToolsFlag.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { envAssignment } from "./teammateEnvForwarding.js";
import { getLaunchPermissions } from "../teleport/dirSync.js";
import { hasRunnerToolSpec, dropRunnerToolSpecs } from "../../services/selfHostedRunner/runnerToolNames.js";
import {
  getMainLoopModelOverride,
  getFlagSettingsExpectedContent,
  getFlagSettingsPath,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getProjectConfigRoot,
  getReplConfigArgv,
  getStrictMcpConfig,
  getChromeFlagOverride,
} from "../../bootstrap/state.js";
import { effortLevelValue } from "../effort.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";
import { appliedSettingSourcesArgv } from "../settings/constants.js";
import { eagerParseCliFlag, eagerParseCliFlagAll } from "../cliArgs.js";
import { safeParseJSON } from "../json.js";
import { compactJsonForTypedTransport } from "../../main.js";
import { filterPluginDirs } from "../../plugins/functionHooks/hooksWorkerClient.js";
import { getProviderState } from "../model/providerCaches.js";
import { isRestrictedLaunch } from "../../services/daemon/relaunchArgs.js";

//@ chunk-cne5hsvz.js:19463-21257 callgraph-witnessed = buildInheritedCliFlags (0.297)
/**
 * 拼出 pane 型 teammate 继承的 CLI 参数：权限模式/计划模式、--proactivity、--disallowed-tools（无法原样重放的 deny 规则直接中止派生）、--tools、--model、--effort、--settings、--managed-settings、插件目录/URL、--mcp-config、--strict-mcp-config、--chrome 等。
 */
function buildInheritedCliFlags(options) {
  let {
    planModeRequired,
    permissionMode,
    proactivityLevel,
    autoPickedByLevel,
    skipModel,
    sessionEffort,
    permissionRules,
  } = options;
  let inheritedCliFlags = buildInheritedCliFlags_2({
    planModeRequired,
    permissionMode,
    proactivityLevel,
    autoPickedByLevel,
  });
  {
    let activeProactivityLevel = proactivityLevel && proactivityLevelIfActive(proactivityLevel);
    if (activeProactivityLevel) inheritedCliFlags.push(`--proactivity ${activeProactivityLevel}`);
  }
  let builtinDenyRules = new Set(antBuiltinDenyRules());
  for (let rule of permissionRules.alwaysDenyRules.cliArg ?? [])
    if (!builtinDenyRules.has(rule)) {
      let splitRules = splitRuleList([rule]);
      if (splitRules.length !== 1 || splitRules[0] !== rule) {
        logFeatureBad("subagent_launch", "subagent_teammate_deny_unreplayable");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "A command-line deny rule cannot be handed to a teammate intact, so the teammate would not enforce it \u2014 spawn aborted",
          "spawnMultiAgent: cliArg deny rule would not survive argv replay \u2014 spawn aborted",
        );
      }
      inheritedCliFlags.push(envAssignment("--disallowed-tools", rule));
    }
  for (let tool of getLaunchPermissions().typedToolFlags.tools)
    inheritedCliFlags.push(
      envAssignment("--tools", hasRunnerToolSpec([tool]) ? dropRunnerToolSpecs(tool) : tool),
    );
  if (!skipModel) {
    let modelOverride = getMainLoopModelOverride();
    if (modelOverride) inheritedCliFlags.push(envAssignment("--model", modelOverride));
  }
  let effortValue = sessionEffort && effortLevelValue(sessionEffort);
  if (effortValue !== undefined) inheritedCliFlags.push(`--effort ${effortValue}`);
  let flagSettingsPath = getFlagSettingsExpectedContent() ?? getFlagSettingsPath();
  if (flagSettingsPath) inheritedCliFlags.push(`--settings ${shellQuoteArgs([flagSettingsPath])}`);
  let settingsPath = appliedSettingSourcesArgv();
  if (settingsPath.length > 0) inheritedCliFlags.push(shellQuoteArgs(settingsPath));
  let managedSettingsArg = eagerParseCliFlag("--managed-settings");
  if (managedSettingsArg) {
    let parsedManaged = safeParseJSON(managedSettingsArg.trim(), false);
    inheritedCliFlags.push(
      `--managed-settings ${shellQuoteArgs([parsedManaged && typeof parsedManaged === "object" && !Array.isArray(parsedManaged) ? compactJsonForTypedTransport(parsedManaged) : "invalid"])}`,
    );
  }
  let pluginDirs = filterPluginDirs(getInlinePlugins());
  for (let pluginDir of pluginDirs) inheritedCliFlags.push(`--plugin-dir ${shellQuoteArgs([pluginDir])}`);
  for (let pluginDir of getInlinePluginsNoMcp())
    inheritedCliFlags.push(`--plugin-dir-no-mcp ${shellQuoteArgs([pluginDir])}`);
  for (let pluginUrl of getInlinePluginUrls())
    inheritedCliFlags.push(`--plugin-url ${shellQuoteArgs([pluginUrl])}`);
  let sessionMode = getProjectConfigRoot();
  if (sessionMode !== null) inheritedCliFlags.push(`--project-config-root ${shellQuoteArgs([sessionMode])}`);
  for (let mcpConfigArg of eagerParseCliFlagAll("--mcp-config", getReplConfigArgv())) {
    let parsedMcp = mcpConfigArg.trim().startsWith("{") ? safeParseJSON(mcpConfigArg.trim(), false) : null;
    inheritedCliFlags.push(
      `--mcp-config ${shellQuoteArgs([parsedMcp && typeof parsedMcp === "object" && !Array.isArray(parsedMcp) ? compactJsonForTypedTransport(parsedMcp) : mcpConfigArg])}`,
    );
  }
  if (getStrictMcpConfig()) inheritedCliFlags.push("--strict-mcp-config");
  if (getProviderState().includeUnsupportedModels) inheritedCliFlags.push("--include-unsupported-models");
  let chromeFlagOverride = getChromeFlagOverride();
  if (chromeFlagOverride === true) inheritedCliFlags.push("--chrome");
  else if (chromeFlagOverride === false) inheritedCliFlags.push("--no-chrome");
  if (isRestrictedLaunch()) inheritedCliFlags.push("--restricted");
  return inheritedCliFlags.join(" ");
}
//@ chunk-ae5g0zb5.js:30138-30268 fingerprint = TEAMMATE_ENV_VARS (0.444)
/**
 * 需要透传给 pane 型 teammate 的环境变量（代理设置、CLAUDE_TEST_HEADED）。
 */
var TEAMMATE_ENV_VARS = [
  "CLAUDE_TEST_HEADED",
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "NO_PROXY",
  "no_proxy",
];
export { TEAMMATE_ENV_VARS, buildInheritedCliFlags };
