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

//@ chunk-axmbhcjg.js:28530-28874 placement
/**
 * 构造不发送的条目结果：记录主文件及其非样式 import 的原因（各真实路径只记一次）。
 */
function buildWithheldEntry(e, reason, r, path = e.destination) {
  let i = [
    {
      realPath: e.location.realPath,
      row: {
        path,
        reason,
      },
    },
    ...e.imports
      .filter((u) => !u.asStyle)
      .map(({ location }) => ({
        realPath: location.realPath,
        row: {
          path: location.lexicalRel,
          reason: "include_not_sent",
        },
      })),
  ];
  let s = [];
  for (let { realPath, row } of i)
    if (!r.has(realPath)) {
      r.add(realPath);
      s.push(row);
    }
  return {
    entry: null,
    foldedIncludes: [],
    leftBehind: s,
  };
}
//@ chunk-axmbhcjg.js:28874-28948 placement
/**
 * 以本地路径读取一个工作文件。
 */
function readNativeWorkingFile(e, location) {
  return readWorkingFile(e.realConfigHome, e.realConfigHome, location.nativeRel);
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
function getPreToolUseMatchers(e) {
  if (!hasPreToolUseHooks(e))
    return {
      covers: "matchers",
      matchers: [],
    };
  let n = PreToolUseHooksOf(e);
  if (!Array.isArray(n)) return ALWAYS_COVERS;
  let r = [];
  for (let o of n) {
    let matcher = isPlainObject(o) ? o.matcher : undefined;
    if (typeof matcher !== "string") return ALWAYS_COVERS;
    if (matcher.trim() === "" || matcher === "*" || matcher === ".*") return ALWAYS_COVERS;
    r.push(matcher);
  }
  return {
    covers: "matchers",
    matchers: r,
  };
}
//@ chunk-axmbhcjg.js:29868-30062 placement
function makeHookCoveragePredicate(hookCoverage) {
  if (hookCoverage.covers === "all") return true;
  let matchers = hookCoverage.matchers;
  if (matchers.length === 0) return false;
  return (r) =>
    hasWildcard(r)
      ? matchers.some((matcher) => {
          let i = preToolUseMatcherListedTools(matcher);
          return i === undefined || i.some((s) => matchRulePattern(r, s));
        })
      : matchers.some((matcher) => preToolUseMatcherCoversTool(matcher, r));
}
//@ chunk-axmbhcjg.js:30062-30231 placement
function mergePreToolUseHooks(e) {
  let filtered = e.filter(hasPreToolUseHooks);
  if (filtered.length === 0) return;
  let mapped = filtered.map(PreToolUseHooksOf);
  return (
    filtered.find((i, s) => !Array.isArray(mapped[s])) ?? {
      PreToolUse: mapped.flatMap((i) => (Array.isArray(i) ? i : [])),
    }
  );
}
//@ chunk-axmbhcjg.js:30231-30309 placement
/**
 * 取设置里 PreToolUse 钩子配置。
 */
function PreToolUseHooksOf(e) {
  return isPlainObject(e) && Object.hasOwn(e, "PreToolUse") ? e.PreToolUse : undefined;
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
    (d) =>
      d.scope === "project" ||
      marketplaceSuffix(d.source) === SYNCED ||
      (d.scope !== "user" &&
        (repoEnabledPluginKeys === undefined || repoEnabledPluginKeys.has(nfcLower(d.source)))),
  );
  if (filtered.some((d) => d.hooksConfig === undefined && d.manifest.hooks !== undefined))
    return ALWAYS_COVERS;
  return [
    processGuard,
    ...sources.map((source) => (source.read ? getPreToolUseMatchers(source.hooks) : ALWAYS_COVERS)),
    ...filtered.map((d) => getPreToolUseMatchers(d.hooksConfig)),
  ].reduce(mergeHookCoverage, {
    covers: "matchers",
    matchers: [],
  });
}
//@ chunk-axmbhcjg.js:31072-31177 placement
function hasHookAffectingErrors(errors) {
  return errors.some((n) => n.severity !== "warning" || n.path === "hooks" || n.path.startsWith("hooks."));
}
//@ chunk-axmbhcjg.js:31177-32640 placement
/**
 * 构造 PreToolUse 钩子覆盖计算的数据源：各设置来源的钩子、来源是否不完整、进程级守卫（主线程代理与技能钩子）、插件加载（附加不完整警告/错误）与仓库启用的插件键。
 */
function createHookCoverageSources(pluginOptions, getSkillHooks, settingsToCloud = isSettingsToCloudEnabled) {
  return {
    sources: SETTING_SOURCES,
    hooksOf: (o) => {
      if (o === "userSettings" || o === "flagSettings") return;
      if (o === "policySettings") return getSettingsForSource(o)?.hooks;
      let mapped = settingsPathsForSource(o).map(readSettingsFileStrict);
      return mergePreToolUseHooks([
        ...mapped.map((s) => s?.hooks),
        getSettingsForSourceTightenOnly(o)?.hooks,
      ]);
    },
    sourcesIncomplete: () =>
      hasHookAffectingErrors(getSettingsWithErrors_2().errors) ||
      getAdditionalDirSettingsPaths().some((o) => hasHookAffectingErrors(readSettingsStrict(o).errors)) ||
      (filtered_2.some((o) => !isSettingSourceEnabled(o)) && hasAgentSetting()),
    processGuard: () => {
      let o = skillDirs();
      let PreToolUse = (getSkillHooks() ?? []).filter(
        (s) => s.hooks.length > 0 && !isOwnSkillRoot(s.skillRoot, o),
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
      let [allPluginsForPreview, i] = await Promise.all([
        loadAllPluginsForPreview(pluginOptions),
        isSettingSourceEnabled("projectSettings") ? 0 : countUnloadedProjectSkills(),
      ]);
      let s =
        i === 0
          ? allPluginsForPreview
          : {
              ...allPluginsForPreview,
              warnings: [
                ...allPluginsForPreview.warnings,
                {
                  type: "project-scope-suppressed-untrusted",
                  source: `(unlisted)@${SKILLS_DIR}`,
                  count: i,
                  warning:
                    "project skill directories on disk were not loaded: the project settings source is off for this process",
                },
              ],
            };
      let u = new Set(
        enabledPluginIds({
          enabledPlugins: {
            ...getAddDirEnabledPlugins(),
            ...(getSettingsWithErrors_2().settings?.enabledPlugins ?? {}),
          },
        }),
      );
      let filtered = allEnabledPluginIds().filter((m) => !u.has(m));
      let f = filtered_2.some((m) => !isSettingSourceEnabled(m))
        ? s.enabled.filter((m) => m.settings?.agent !== undefined)
        : [];
      return filtered.length === 0 && f.length === 0
        ? s
        : {
            ...s,
            errors: [
              ...s.errors,
              ...filtered.map((source) => ({
                type: "generic-error",
                source,
                error: "enabled in a settings file this process did not load",
              })),
              ...f.map((m) => ({
                type: "generic-error",
                source: m.source,
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
  let e = join(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills");
  if (e === join(getClaudeConfigDir(), "skills")) return 0;
  if (await hasUntouchableRecordSpellingAsync(e)) return 1;
  return readdir(e, {
    withFileTypes: true,
  }).then(
    (n) => count(n, (r) => r.isDirectory() || r.isSymbolicLink()),
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
      .flatMap((e) => settingsPathsForSource(e).map(readSettingsFileStrict))
      .some((e) => e?.agent !== undefined)
  );
}
//@ chunk-axmbhcjg.js:33009-33064 placement
var filtered_2 = SETTING_SOURCES.filter((e) => e !== "policySettings" && REPO_DIR_SETTING_SOURCES.has(e));
//@ chunk-axmbhcjg.js:33064-33160 placement
/**
 * 技能目录：自有的 skills/commands/bundled 与同步目录。
 */
function skillDirs() {
  let e = join(getClaudeConfigDir(), "skills");
  return {
    own: [e, join(getClaudeConfigDir(), "commands"), getBundledSkillsRoot()],
    synced: join(e, SYNCED_DIR),
  };
}
//@ chunk-axmbhcjg.js:33160-33238 placement
/**
 * 技能根目录是否属于自有目录（不在同步目录里）。
 */
function isOwnSkillRoot(skillRoot, n) {
  return (
    skillRoot !== undefined &&
    !isPathUnder(n.synced, skillRoot) &&
    n.own.some((r) => isPathUnder(r, skillRoot))
  );
}
//@ chunk-axmbhcjg.js:33238-33314 placement
/**
 * 判断路径是否位于给定目录之下。
 */
function isPathUnder(e, n) {
  let r = relative(e, n);
  return r !== "" && r.split(sep)[0] !== ".." && !isAbsolute(r);
}
//@ chunk-axmbhcjg.js:33314-33399 placement = _temp8 (1)
/**
 * 某设置来源对应的配置文件路径（localSettings 还带旧路径）。
 */
function settingsPathsForSource(a_3) {
  return [
    getSettingsFilePathForSource(a_3),
    a_3 === "localSettings" ? getLegacyLocalSettingsFilePath() : undefined,
  ].filter((n) => n !== undefined);
}
//@ chunk-axmbhcjg.js:33399-33507 placement = isClaudeSettingsPath (1)
/**
 * 列出每个附加目录下的 .claude/settings.json 与 settings.local.json 路径。旧版名 isClaudeSettingsPath 误配。
 */
function getAdditionalDirSettingsPaths() {
  return getAdditionalDirectoriesForClaudeMd().flatMap((e) =>
    ["settings.json", "settings.local.json"].map((settingsPath) => join(e, ".claude", settingsPath)),
  );
}
//@ chunk-axmbhcjg.js:33507-33620 placement
function readSettingsFileStrict(e) {
  let { settings, errors } = readSettingsStrict(e);
  if (hasHookAffectingErrors(errors)) throw Error("a settings file could not be read");
  return settings;
}
//@ chunk-axmbhcjg.js:33620-33707 placement
/**
 * 严格读取设置文件（含其他主机的记录时抛错）。
 */
function readSettingsStrict(e) {
  if (hasUntouchableRecordSpelling(e)) throw Error("a settings file names another host");
  return parseSettingsFileUncached(e);
}
//@ chunk-axmbhcjg.js:33707-33791 placement
/**
 * 汇总附加目录里启用的插件 id。
 */
function allEnabledPluginIds() {
  return [
    ...filtered_2.flatMap((n) => settingsPathsForSource(n).map(readSettingsFileStrict)),
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
  let r;
  try {
    r = hookCoverageSources.sourcesIncomplete();
  } catch {
    r = true;
  }
  let o;
  try {
    o = hookCoverageSources.processGuard();
  } catch {
    o = ALWAYS_COVERS;
  }
  let i;
  try {
    i = await hookCoverageSources.loadPlugins();
  } catch {
    i = null;
  }
  let s;
  try {
    s = hookCoverageSources.repoEnabledPluginKeys?.();
  } catch {
    s = undefined;
  }
  return computePreToolUseCoverage({
    sources,
    sourcesIncomplete: r,
    processGuard: o,
    plugins: i,
    repoEnabledPluginKeys: s,
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
function isBlockingSettingsError(e) {
  return (
    e.severity !== "warning" ||
    e.path === "permissions" ||
    (e.path.startsWith("permissions.") && !isPermissionsAllowPath(e))
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
