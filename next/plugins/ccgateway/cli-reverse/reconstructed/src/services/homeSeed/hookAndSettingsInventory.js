/**
 * services/homeSeed/hookAndSettingsInventory.ts
 *
 * 2.1.316 新增：钩子与设置清点
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (29)
 * attribution: placement 29
 */
import { join, relative, sep, isAbsolute } from "path";
import { readdir } from "fs/promises";
import { readWorkingFile } from "./workingFiles.js";
import { hasPreToolUseHooks } from "./deviceRuleFilter.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { hasWildcard, matchRulePattern } from "../../utils/permissions/permissionRuleParser.js";
import { preToolUseMatcherListedTools, preToolUseMatcherCoversTool } from "../../utils/hooks.js";
import { uniq, count } from "../../utils/collections.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED, SKILLS_DIR } from "../../utils/telemetry/pluginTelemetry.js";
import { isSettingsToCloudEnabled } from "../analytics/violinGates.js";
import {
  SETTING_SOURCES,
  isSettingSourceEnabled,
  REPO_DIR_SETTING_SOURCES,
} from "../../utils/settings/constants.js";
import {
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
  getSettingsWithErrors_2,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  parseSettingsFileUncached,
  getSettingsParseErrorsForSource,
} from "../../utils/settings/settings.js";
import {
  getMainThreadAgentHooks,
  getProjectConfigRoot,
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import {
  hasUntouchableRecordSpellingAsync,
  hasUntouchableRecordSpelling,
  getFsImplementation,
} from "../../utils/fsOperations.js";
import { loadAllPluginsForPreview } from "../../utils/plugins/pluginLoader.js";
import { getAddDirEnabledPlugins } from "../../utils/plugins/addDirPluginSettings.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getBundledSkillsRoot } from "../../utils/permissions/filesystem.js";
import { SYNCED_DIR } from "../../utils/plugins/syncedItems.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-axmbhcjg.js:28530-28874 placement
/**
 * 构造不发送的条目结果：记录主文件及其非样式 import 的原因（各真实路径只记一次）。
 */
function buildWithheldEntry(candidate, reason, seenReal, path = candidate.destination) {
  let rows = [
    {
      realPath: candidate.location.realPath,
      row: {
        path,
        reason,
      },
    },
    ...candidate.imports
      .filter((importEntry) => !importEntry.asStyle)
      .map(({ location }) => ({
        realPath: location.realPath,
        row: {
          path: location.lexicalRel,
          reason: "include_not_sent",
        },
      })),
  ];
  let leftBehind = [];
  for (let { realPath, row } of rows)
    if (!seenReal.has(realPath)) {
      seenReal.add(realPath);
      leftBehind.push(row);
    }
  return {
    entry: null,
    foldedIncludes: [],
    leftBehind,
  };
}
//@ chunk-axmbhcjg.js:28874-28948 placement
/**
 * 以本地路径读取一个工作文件。
 */
function readNativeWorkingFile(walkState, location) {
  return readWorkingFile(walkState.realConfigHome, walkState.realConfigHome, location.nativeRel);
}
//@ chunk-axmbhcjg.js:28948-29454 placement
/**
 * 把文件跳过原因映射为清点的未发送原因（符号链接、超限、敏感、拒读，其余为不可读）。
 */
function mapSkipReasonToLeftBehind(reason) {
  switch (reason) {
    case "symlink":
    case "hard_link":
      return "symlink_not_sent";
    case "too_large":
      return "over_cap";
    case "sensitive":
    case "sensitive_tracked":
    case "host_config":
      return "sensitive";
    case "read_denied":
    case "rules_unreadable":
      return "read_denied";
    case "content_filter":
    case "filtered":
    case "dependency_dir":
    case "outside_root":
    case "changed":
    case "not_regular_file":
    case "lane_path":
    case "over_budget":
    case "left_behind":
    case "unreadable":
    case "upload_failed":
    case "unpushed_only":
    case "ignored":
      return "unreadable";
  }
}
//@ chunk-axmbhcjg.js:29564-29585 placement
/**
 * 表示“覆盖全部”的钩子覆盖结果。
 */
var ALWAYS_COVERS = {
  covers: "all",
};
//@ chunk-axmbhcjg.js:29585-29868 placement
function getPreToolUseMatchers(settings) {
  if (!hasPreToolUseHooks(settings))
    return {
      covers: "matchers",
      matchers: [],
    };
  let hooks = PreToolUseHooksOf(settings);
  if (!Array.isArray(hooks)) return ALWAYS_COVERS;
  let matchers = [];
  for (let entry of hooks) {
    let matcher = isPlainObject(entry) ? entry.matcher : undefined;
    if (typeof matcher !== "string") return ALWAYS_COVERS;
    if (matcher.trim() === "" || matcher === "*" || matcher === ".*") return ALWAYS_COVERS;
    matchers.push(matcher);
  }
  return {
    covers: "matchers",
    matchers,
  };
}
//@ chunk-axmbhcjg.js:29868-30062 placement
function makeHookCoveragePredicate(hookCoverage) {
  if (hookCoverage.covers === "all") return true;
  let matchers = hookCoverage.matchers;
  if (matchers.length === 0) return false;
  return (covers) =>
    hasWildcard(covers)
      ? matchers.some((matcher) => {
          let oneMatcher = preToolUseMatcherListedTools(matcher);
          return (
            oneMatcher === undefined || oneMatcher.some((matchers) => matchRulePattern(covers, matchers))
          );
        })
      : matchers.some((matcher) => preToolUseMatcherCoversTool(matcher, covers));
}
//@ chunk-axmbhcjg.js:30062-30231 placement
function mergePreToolUseHooks(settingsList) {
  let filtered = settingsList.filter(hasPreToolUseHooks);
  if (filtered.length === 0) return;
  let mapped = filtered.map(PreToolUseHooksOf);
  return (
    filtered.find((settings, index) => !Array.isArray(mapped[index])) ?? {
      PreToolUse: mapped.flatMap((hooks) => (Array.isArray(hooks) ? hooks : [])),
    }
  );
}
//@ chunk-axmbhcjg.js:30231-30309 placement
/**
 * 取设置里 PreToolUse 钩子配置。
 */
function PreToolUseHooksOf(settings) {
  return isPlainObject(settings) && Object.hasOwn(settings, "PreToolUse") ? settings.PreToolUse : undefined;
}
//@ chunk-axmbhcjg.js:30309-30432 placement
function mergeHookCoverage(preToolUseMatchers, preToolUseMatchers_2) {
  return preToolUseMatchers.covers === "all" || preToolUseMatchers_2.covers === "all"
    ? ALWAYS_COVERS
    : {
        covers: "matchers",
        matchers: uniq([...preToolUseMatchers.matchers, ...preToolUseMatchers_2.matchers]),
      };
}
//@ chunk-axmbhcjg.js:30432-31072 placement
/**
 * 计算 PreToolUse 钩子对工具的覆盖：来源不完整、插件加载出错/被抑制/改名或钩子未解析时视为覆盖全部；否则合并进程守卫、各设置来源与相关插件的 matcher。
 */
function computePreToolUseCoverage({
  sources,
  sourcesIncomplete,
  processGuard,
  plugins,
  repoEnabledPluginKeys,
}) {
  if (
    sourcesIncomplete ||
    sources.some((source) => !source.read) ||
    plugins === null ||
    plugins.errors.length > 0 ||
    plugins.warnings.some((warning) => warning.type === "project-scope-suppressed-untrusted") ||
    plugins.warnings.some(
      (warning) =>
        warning.type === "plugin-renamed" &&
        (repoEnabledPluginKeys === undefined || repoEnabledPluginKeys.has(nfcLower(warning.source))),
    ) ||
    plugins === null
  )
    return ALWAYS_COVERS;
  let filtered = plugins.enabled.filter(
    (sources) =>
      sources.scope === "project" ||
      marketplaceSuffix(sources.source) === SYNCED ||
      (sources.scope !== "user" &&
        (repoEnabledPluginKeys === undefined || repoEnabledPluginKeys.has(nfcLower(sources.source)))),
  );
  if (
    filtered.some(
      (processGuard) => processGuard.hooksConfig === undefined && processGuard.manifest.hooks !== undefined,
    )
  )
    return ALWAYS_COVERS;
  return [
    processGuard,
    ...sources.map((source) => (source.read ? getPreToolUseMatchers(source.hooks) : ALWAYS_COVERS)),
    ...filtered.map((plugins) => getPreToolUseMatchers(plugins.hooksConfig)),
  ].reduce(mergeHookCoverage, {
    covers: "matchers",
    matchers: [],
  });
}
//@ chunk-axmbhcjg.js:31072-31177 placement
function hasHookAffectingErrors(errors) {
  return errors.some(
    (error) => error.severity !== "warning" || error.path === "hooks" || error.path.startsWith("hooks."),
  );
}
//@ chunk-axmbhcjg.js:31177-32640 placement
/**
 * 构造 PreToolUse 钩子覆盖计算的数据源：各设置来源的钩子、来源是否不完整、进程级守卫（主线程代理与技能钩子）、插件加载（附加不完整警告/错误）与仓库启用的插件键。
 */
function createHookCoverageSources(pluginOptions, getSkillHooks, settingsToCloud = isSettingsToCloudEnabled) {
  return {
    sources: SETTING_SOURCES,
    hooksOf: (source) => {
      if (source === "userSettings" || source === "flagSettings") return;
      if (source === "policySettings") return getSettingsForSource(source)?.hooks;
      let mapped = settingsPathsForSource(source).map(readSettingsFileStrict);
      return mergePreToolUseHooks([
        ...mapped.map((settings) => settings?.hooks),
        getSettingsForSourceTightenOnly(source)?.hooks,
      ]);
    },
    sourcesIncomplete: () =>
      hasHookAffectingErrors(getSettingsWithErrors_2().errors) ||
      getAdditionalDirSettingsPaths().some((path) =>
        hasHookAffectingErrors(readSettingsStrict(path).errors),
      ) ||
      (filtered_2.some((source) => !isSettingSourceEnabled(source)) && hasAgentSetting()),
    processGuard: () => {
      let skillRoots = skillDirs();
      let PreToolUse = (getSkillHooks() ?? []).filter(
        (skillHook) => skillHook.hooks.length > 0 && !isOwnSkillRoot(skillHook.skillRoot, skillRoots),
      );
      return mergeHookCoverage(
        getPreToolUseMatchers(getMainThreadAgentHooks()),
        getPreToolUseMatchers({
          PreToolUse,
        }),
      );
    },
    loadPlugins: async () => {
      if (
        (await Promise.all(getAdditionalDirSettingsPaths().map(hasUntouchableRecordSpellingAsync))).some(
          Boolean,
        )
      )
        throw Error("an --add-dir settings file names another host");
      let [allPluginsForPreview, suppressedSkills] = await Promise.all([
        loadAllPluginsForPreview(pluginOptions),
        isSettingSourceEnabled("projectSettings") ? 0 : countUnloadedProjectSkills(),
      ]);
      let plugins =
        suppressedSkills === 0
          ? allPluginsForPreview
          : {
              ...allPluginsForPreview,
              warnings: [
                ...allPluginsForPreview.warnings,
                {
                  type: "project-scope-suppressed-untrusted",
                  source: `(unlisted)@${SKILLS_DIR}`,
                  count: suppressedSkills,
                  warning:
                    "project skill directories on disk were not loaded: the project settings source is off for this process",
                },
              ],
            };
      let loadedIds = new Set(
        enabledPluginIds({
          enabledPlugins: {
            ...getAddDirEnabledPlugins(),
            ...(getSettingsWithErrors_2().settings?.enabledPlugins ?? {}),
          },
        }),
      );
      let filtered = allEnabledPluginIds().filter((pluginId) => !loadedIds.has(pluginId));
      let unresolvedAgents = filtered_2.some((source) => !isSettingSourceEnabled(source))
        ? plugins.enabled.filter((plugin) => plugin.settings?.agent !== undefined)
        : [];
      return filtered.length === 0 && unresolvedAgents.length === 0
        ? plugins
        : {
            ...plugins,
            errors: [
              ...plugins.errors,
              ...filtered.map((source) => ({
                type: "generic-error",
                source,
                error: "enabled in a settings file this process did not load",
              })),
              ...unresolvedAgents.map((plugin) => ({
                type: "generic-error",
                source: plugin.source,
                error: "names a main-thread agent this process did not resolve",
              })),
            ],
          };
    },
    repoEnabledPluginKeys: () =>
      new Set(
        [...allEnabledPluginIds(), ...enabledPluginIds(getSettingsForSource("policySettings"))].map(nfcLower),
      ),
    settingsToCloud,
  };
}
//@ chunk-axmbhcjg.js:32640-32897 placement
async function countUnloadedProjectSkills() {
  let dir = join(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills");
  if (dir === join(getClaudeConfigDir(), "skills")) return 0;
  if (await hasUntouchableRecordSpellingAsync(dir)) return 1;
  return readdir(dir, {
    withFileTypes: true,
  }).then(
    (entries) => count(entries, (count) => count.isDirectory() || count.isSymbolicLink()),
    (error) => (["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "") ? 0 : 1),
  );
}
//@ chunk-axmbhcjg.js:32897-33009 placement = _temp (0.703)
/**
 * 判断设置里（主设置或任一来源）是否配置了 agent。
 */
function hasAgentSetting() {
  return (
    getSettingsWithErrors_2().settings?.agent !== undefined ||
    filtered_2
      .flatMap((source) => settingsPathsForSource(source).map(readSettingsFileStrict))
      .some((source) => source?.agent !== undefined)
  );
}
//@ chunk-axmbhcjg.js:33009-33064 placement
var filtered_2; // deferred: uses SETTING_SOURCES (../../utils/settings/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-axmbhcjg.js:33009", () => {
  filtered_2 = SETTING_SOURCES.filter(
    (source) => source !== "policySettings" && REPO_DIR_SETTING_SOURCES.has(source),
  );
});
//@ chunk-axmbhcjg.js:33064-33160 placement
/**
 * 技能目录：自有的 skills/commands/bundled 与同步目录。
 */
function skillDirs() {
  let opposite = join(getClaudeConfigDir(), "skills");
  return {
    own: [opposite, join(getClaudeConfigDir(), "commands"), getBundledSkillsRoot()],
    synced: join(opposite, SYNCED_DIR),
  };
}
//@ chunk-axmbhcjg.js:33160-33238 placement
/**
 * 技能根目录是否属于自有目录（不在同步目录里）。
 */
function isOwnSkillRoot(parent, info) {
  return (
    parent !== undefined &&
    !isPathUnder(info.synced, parent) &&
    info.own.some((own) => isPathUnder(own, parent))
  );
}
//@ chunk-axmbhcjg.js:33238-33314 placement
/**
 * 判断路径是否位于给定目录之下。
 */
function isPathUnder(child, parent) {
  let rel = relative(child, parent);
  return rel !== "" && rel.split(sep)[0] !== ".." && !isAbsolute(rel);
}
//@ chunk-axmbhcjg.js:33314-33399 placement = _temp8 (1)
/**
 * 某设置来源对应的配置文件路径（localSettings 还带旧路径）。
 */
function settingsPathsForSource(a_3) {
  return [
    getSettingsFilePathForSource(a_3),
    a_3 === "localSettings" ? getLegacyLocalSettingsFilePath() : undefined,
  ].filter((source) => source !== undefined);
}
//@ chunk-axmbhcjg.js:33399-33507 placement = isClaudeSettingsPath (1)
/**
 * 列出每个附加目录下的 .claude/settings.json 与 settings.local.json 路径。旧版名 isClaudeSettingsPath 误配。
 */
function getAdditionalDirSettingsPaths() {
  return getAdditionalDirectoriesForClaudeMd().flatMap((dir) =>
    ["settings.json", "settings.local.json"].map((settingsPath) => join(dir, ".claude", settingsPath)),
  );
}
//@ chunk-axmbhcjg.js:33507-33620 placement
function readSettingsFileStrict(path) {
  let { settings, errors } = readSettingsStrict(path);
  if (hasHookAffectingErrors(errors)) throw Error("a settings file could not be read");
  return settings;
}
//@ chunk-axmbhcjg.js:33620-33707 placement
/**
 * 严格读取设置文件（含其他主机的记录时抛错）。
 */
function readSettingsStrict(path) {
  if (hasUntouchableRecordSpelling(path)) throw Error("a settings file names another host");
  return parseSettingsFileUncached(path);
}
//@ chunk-axmbhcjg.js:33707-33791 placement
/**
 * 汇总附加目录里启用的插件 id。
 */
function allEnabledPluginIds() {
  return [
    ...filtered_2.flatMap((source) => settingsPathsForSource(source).map(readSettingsFileStrict)),
    ...getAdditionalDirSettingsPaths().map(readSettingsFileStrict),
  ].flatMap(enabledPluginIds);
}
//@ chunk-axmbhcjg.js:33791-33888 placement
/**
 * 取某设置里启用的插件 id。
 */
function enabledPluginIds(settingsForSource) {
  return Object.entries(settingsForSource?.enabledPlugins ?? {})
    .filter(([, value]) => value !== false)
    .map(([key]) => key);
}
//@ chunk-axmbhcjg.js:33888-34348 placement
/**
 * 依次调用数据源（每步出错按保守值处理），算出 PreToolUse 钩子覆盖；设置上云开关关闭时视为覆盖全部。
 */
async function resolvePreToolUseCoverage(hookCoverageSources) {
  if (
    !(await Promise.resolve()
      .then(hookCoverageSources.settingsToCloud)
      .catch(() => false))
  )
    return ALWAYS_COVERS;
  let sources = hookCoverageSources.sources.map((source) => {
    try {
      return {
        read: true,
        hooks: hookCoverageSources.hooksOf(source),
      };
    } catch {
      return {
        read: false,
      };
    }
  });
  let incomplete;
  try {
    incomplete = hookCoverageSources.sourcesIncomplete();
  } catch {
    incomplete = true;
  }
  let guard;
  try {
    guard = hookCoverageSources.processGuard();
  } catch {
    guard = ALWAYS_COVERS;
  }
  let plugins;
  try {
    plugins = await hookCoverageSources.loadPlugins();
  } catch {
    plugins = null;
  }
  let repoKeys;
  try {
    repoKeys = hookCoverageSources.repoEnabledPluginKeys?.();
  } catch {
    repoKeys = undefined;
  }
  return computePreToolUseCoverage({
    sources,
    sourcesIncomplete: incomplete,
    processGuard: guard,
    plugins,
    repoEnabledPluginKeys: repoKeys,
  });
}
//@ chunk-axmbhcjg.js:34348-34557 placement
async function readUserSettingsForSeed() {
  invalidateCommandNames();
  let settingsParseErrorsForSource = getSettingsParseErrorsForSource("userSettings");
  let settingsForSource = getSettingsForSource("userSettings");
  return settingsParseErrorsForSource.some(isBlockingSettingsError) ||
    (settingsForSource === null && (await isSymlink(getSettingsFilePathForSource("userSettings"))))
    ? {
        kind: "broken",
      }
    : {
        kind: "sendable",
        settings: settingsForSource ?? {},
        hasLostAnAllowEntry: settingsParseErrorsForSource.some(isPermissionsAllowPath),
      };
}
//@ chunk-axmbhcjg.js:34557-34669 placement
function isBlockingSettingsError(error) {
  return (
    error.severity !== "warning" ||
    error.path === "permissions" ||
    (error.path.startsWith("permissions.") && !isPermissionsAllowPath(error))
  );
}
//@ chunk-axmbhcjg.js:34669-34732 placement
/**
 * 判断错误路径是否属于 permissions.allow。
 */
function isPermissionsAllowPath({ path }) {
  return path.startsWith("permissions.allow");
}
//@ chunk-axmbhcjg.js:34732-34831 placement
/**
 * 判断路径是否为符号链接（读不到视为否）。
 */
async function isSymlink(settingsFilePathForSource) {
  try {
    return (
      settingsFilePathForSource !== undefined &&
      (await getFsImplementation().lstat(settingsFilePathForSource)).isSymbolicLink()
    );
  } catch {
    return false;
  }
}
export {
  readNativeWorkingFile,
  buildWithheldEntry,
  mapSkipReasonToLeftBehind,
  resolvePreToolUseCoverage,
  createHookCoverageSources,
  readUserSettingsForSeed,
  makeHookCoveragePredicate,
};
