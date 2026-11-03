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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
} from "path";
import { readdir, readdir as readdir_2 } from "fs/promises";
import { readWorkingFile } from "./workingFiles.js";
import { NOo } from "./deviceRuleFilter.js";
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
import { or } from "../../utils/settings/commandSyncNames.js";

/**
 * 构造不发送的条目结果：记录主文件及其非样式 import 的原因（各真实路径只记一次）。
 */
//@ chunk-axmbhcjg.js:28530-28874 placement
function buildWithheldEntry(e, n, r, o = e.destination) {
  let i = [
      { realPath: e.location.realPath, row: { path: o, reason: n } },
      ...e.imports
        .filter((u) => !u.asStyle)
        .map(({ location: location }) => ({
          realPath: location.realPath,
          row: { path: location.lexicalRel, reason: "include_not_sent" },
        })),
    ],
    s = [];
  for (let { realPath: realPath, row: row } of i) if (!r.has(realPath)) (r.add(realPath), s.push(row));
  return { entry: null, foldedIncludes: [], leftBehind: s };
}
//@ chunk-axmbhcjg.js:28874-28948 placement
function Ue(e, n) {
  return readWorkingFile(e.realConfigHome, e.realConfigHome, n.nativeRel);
}
/**
 * 把文件跳过原因映射为清点的未发送原因（符号链接、超限、敏感、拒读，其余为不可读）。
 */
//@ chunk-axmbhcjg.js:28948-29454 placement
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
var z = { covers: "all" };
//@ chunk-axmbhcjg.js:29585-29868 placement
function getPreToolUseMatchers(e) {
  if (!NOo(e)) return { covers: "matchers", matchers: [] };
  let n = jt(e);
  if (!Array.isArray(n)) return z;
  let r = [];
  for (let o of n) {
    let i = isPlainObject(o) ? o.matcher : void 0;
    if (typeof i !== "string") return z;
    if (i.trim() === "" || i === "*" || i === ".*") return z;
    r.push(i);
  }
  return { covers: "matchers", matchers: r };
}
//@ chunk-axmbhcjg.js:29868-30062 placement
function makeHookCoveragePredicate(e) {
  if (e.covers === "all") return !0;
  let matchers = e.matchers;
  if (matchers.length === 0) return !1;
  return (r) =>
    hasWildcard(r)
      ? matchers.some((o) => {
          let i = preToolUseMatcherListedTools(o);
          return i === void 0 || i.some((s) => matchRulePattern(r, s));
        })
      : matchers.some((o) => preToolUseMatcherCoversTool(o, r));
}
//@ chunk-axmbhcjg.js:30062-30231 placement
function mergePreToolUseHooks(e) {
  let filtered = e.filter(NOo);
  if (filtered.length === 0) return;
  let mapped = filtered.map(jt);
  return (
    filtered.find((i, s) => !Array.isArray(mapped[s])) ?? {
      PreToolUse: mapped.flatMap((i) => (Array.isArray(i) ? i : [])),
    }
  );
}
//@ chunk-axmbhcjg.js:30231-30309 placement
function jt(e) {
  return isPlainObject(e) && Object.hasOwn(e, "PreToolUse") ? e.PreToolUse : void 0;
}
//@ chunk-axmbhcjg.js:30309-30432 placement
function mergeHookCoverage(e, n) {
  return e.covers === "all" || n.covers === "all"
    ? z
    : { covers: "matchers", matchers: uniq([...e.matchers, ...n.matchers]) };
}
/**
 * 计算 PreToolUse 钩子对工具的覆盖：来源不完整、插件加载出错/被抑制/改名或钩子未解析时视为覆盖全部；否则合并进程守卫、各设置来源与相关插件的 matcher。
 */
//@ chunk-axmbhcjg.js:30432-31072 placement
function computePreToolUseCoverage({
  sources: sources,
  sourcesIncomplete: sourcesIncomplete,
  processGuard: processGuard,
  plugins: plugins,
  repoEnabledPluginKeys: repoEnabledPluginKeys,
}) {
  if (
    sourcesIncomplete ||
    sources.some((d) => !d.read) ||
    plugins === null ||
    plugins.errors.length > 0 ||
    plugins.warnings.some((warning) => warning.type === "project-scope-suppressed-untrusted") ||
    plugins.warnings.some(
      (warning) =>
        warning.type === "plugin-renamed" &&
        (repoEnabledPluginKeys === void 0 || repoEnabledPluginKeys.has(nfcLower(warning.source))),
    ) ||
    plugins === null
  )
    return z;
  let filtered = plugins.enabled.filter(
    (d) =>
      d.scope === "project" ||
      marketplaceSuffix(d.source) === SYNCED ||
      (d.scope !== "user" &&
        (repoEnabledPluginKeys === void 0 || repoEnabledPluginKeys.has(nfcLower(d.source)))),
  );
  if (filtered.some((d) => d.hooksConfig === void 0 && d.manifest.hooks !== void 0)) return z;
  return [
    processGuard,
    ...sources.map((d) => (d.read ? getPreToolUseMatchers(d.hooks) : z)),
    ...filtered.map((d) => getPreToolUseMatchers(d.hooksConfig)),
  ].reduce(mergeHookCoverage, { covers: "matchers", matchers: [] });
}
//@ chunk-axmbhcjg.js:31072-31177 placement
function hasHookAffectingErrors(e) {
  return e.some((n) => n.severity !== "warning" || n.path === "hooks" || n.path.startsWith("hooks."));
}
/**
 * 构造 PreToolUse 钩子覆盖计算的数据源：各设置来源的钩子、来源是否不完整、进程级守卫（主线程代理与技能钩子）、插件加载（附加不完整警告/错误）与仓库启用的插件键。
 */
//@ chunk-axmbhcjg.js:31177-32640 placement
function createHookCoverageSources(pluginOptions, getSkillHooks, settingsToCloud = isSettingsToCloudEnabled) {
  return {
    sources: SETTING_SOURCES,
    hooksOf: (o) => {
      if (o === "userSettings" || o === "flagSettings") return;
      if (o === "policySettings") return getSettingsForSource(o)?.hooks;
      let mapped = Je(o).map(readSettingsFileStrict);
      return mergePreToolUseHooks([
        ...mapped.map((s) => s?.hooks),
        getSettingsForSourceTightenOnly(o)?.hooks,
      ]);
    },
    sourcesIncomplete: () =>
      hasHookAffectingErrors(getSettingsWithErrors_2().errors) ||
      getAdditionalDirSettingsPaths().some((o) => hasHookAffectingErrors(Yt(o).errors)) ||
      (filtered_2.some((o) => !isSettingSourceEnabled(o)) && hasAgentSetting()),
    processGuard: () => {
      let o = gr(),
        filtered = (getSkillHooks() ?? []).filter((s) => s.hooks.length > 0 && !hr(s.skillRoot, o));
      return mergeHookCoverage(
        getPreToolUseMatchers(getMainThreadAgentHooks()),
        getPreToolUseMatchers({ PreToolUse: filtered }),
      );
    },
    loadPlugins: async () => {
      if (
        (await Promise.all(getAdditionalDirSettingsPaths().map(hasUntouchableRecordSpellingAsync))).some(
          Boolean,
        )
      )
        throw Error("an --add-dir settings file names another host");
      let [o, i] = await Promise.all([
          loadAllPluginsForPreview(pluginOptions),
          isSettingSourceEnabled("projectSettings") ? 0 : countUnloadedProjectSkills(),
        ]),
        s =
          i === 0
            ? o
            : {
                ...o,
                warnings: [
                  ...o.warnings,
                  {
                    type: "project-scope-suppressed-untrusted",
                    source: `(unlisted)@${SKILLS_DIR}`,
                    count: i,
                    warning:
                      "project skill directories on disk were not loaded: the project settings source is off for this process",
                  },
                ],
              },
        u = new Set(
          Xe({
            enabledPlugins: {
              ...getAddDirEnabledPlugins(),
              ...(getSettingsWithErrors_2().settings?.enabledPlugins ?? {}),
            },
          }),
        ),
        filtered = Nt().filter((m) => !u.has(m)),
        f = filtered_2.some((m) => !isSettingSourceEnabled(m))
          ? s.enabled.filter((m) => m.settings?.agent !== void 0)
          : [];
      return filtered.length === 0 && f.length === 0
        ? s
        : {
            ...s,
            errors: [
              ...s.errors,
              ...filtered.map((m) => ({
                type: "generic-error",
                source: m,
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
      new Set([...Nt(), ...Xe(getSettingsForSource("policySettings"))].map(nfcLower)),
    settingsToCloud: settingsToCloud,
  };
}
//@ chunk-axmbhcjg.js:32640-32897 placement
async function countUnloadedProjectSkills() {
  let e = join_4(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills");
  if (e === join_4(getClaudeConfigDir(), "skills")) return 0;
  if (await hasUntouchableRecordSpellingAsync(e)) return 1;
  return readdir_2(e, { withFileTypes: !0 }).then(
    (n) => count(n, (r) => r.isDirectory() || r.isSymbolicLink()),
    (n) => (["ENOENT", "ENOTDIR"].includes(getErrnoCode(n) ?? "") ? 0 : 1),
  );
}
/**
 * 判断设置里（主设置或任一来源）是否配置了 agent。
 */
//@ chunk-axmbhcjg.js:32897-33009 placement = _temp (0.703)
function hasAgentSetting() {
  return (
    getSettingsWithErrors_2().settings?.agent !== void 0 ||
    filtered_2.flatMap((e) => Je(e).map(readSettingsFileStrict)).some((e) => e?.agent !== void 0)
  );
}
//@ chunk-axmbhcjg.js:33009-33064 placement
var filtered_2 = SETTING_SOURCES.filter((e) => e !== "policySettings" && REPO_DIR_SETTING_SOURCES.has(e));
//@ chunk-axmbhcjg.js:33064-33160 placement
function gr() {
  let e = join_4(getClaudeConfigDir(), "skills");
  return {
    own: [e, join_4(getClaudeConfigDir(), "commands"), getBundledSkillsRoot()],
    synced: join_4(e, SYNCED_DIR),
  };
}
//@ chunk-axmbhcjg.js:33160-33238 placement
function hr(e, n) {
  return e !== void 0 && !Dt(n.synced, e) && n.own.some((r) => Dt(r, e));
}
//@ chunk-axmbhcjg.js:33238-33314 placement
function Dt(e, n) {
  let r = relative_3(e, n);
  return r !== "" && r.split(sep_3)[0] !== ".." && !isAbsolute_2(r);
}
//@ chunk-axmbhcjg.js:33314-33399 placement = _temp8 (1)
function Je(a_3) {
  return [
    getSettingsFilePathForSource(a_3),
    a_3 === "localSettings" ? getLegacyLocalSettingsFilePath() : void 0,
  ].filter((n) => n !== void 0);
}
/**
 * 列出每个附加目录下的 .claude/settings.json 与 settings.local.json 路径。旧版名 isClaudeSettingsPath 误配。
 */
//@ chunk-axmbhcjg.js:33399-33507 placement = isClaudeSettingsPath (1)
function getAdditionalDirSettingsPaths() {
  return getAdditionalDirectoriesForClaudeMd().flatMap((e) =>
    ["settings.json", "settings.local.json"].map((settingsPath) => join_4(e, ".claude", settingsPath)),
  );
}
//@ chunk-axmbhcjg.js:33507-33620 placement
function readSettingsFileStrict(e) {
  let { settings: settings, errors: errors } = Yt(e);
  if (hasHookAffectingErrors(errors)) throw Error("a settings file could not be read");
  return settings;
}
//@ chunk-axmbhcjg.js:33620-33707 placement
function Yt(e) {
  if (hasUntouchableRecordSpelling(e)) throw Error("a settings file names another host");
  return parseSettingsFileUncached(e);
}
//@ chunk-axmbhcjg.js:33707-33791 placement
function Nt() {
  return [
    ...filtered_2.flatMap((n) => Je(n).map(readSettingsFileStrict)),
    ...getAdditionalDirSettingsPaths().map(readSettingsFileStrict),
  ].flatMap(Xe);
}
//@ chunk-axmbhcjg.js:33791-33888 placement
function Xe(e) {
  return Object.entries(e?.enabledPlugins ?? {})
    .filter(([, n]) => n !== !1)
    .map(([n]) => n);
}
/**
 * 依次调用数据源（每步出错按保守值处理），算出 PreToolUse 钩子覆盖；设置上云开关关闭时视为覆盖全部。
 */
//@ chunk-axmbhcjg.js:33888-34348 placement
async function resolvePreToolUseCoverage(e) {
  if (
    !(await Promise.resolve()
      .then(e.settingsToCloud)
      .catch(() => !1))
  )
    return z;
  let mapped = e.sources.map((source) => {
      try {
        return { read: !0, hooks: e.hooksOf(source) };
      } catch {
        return { read: !1 };
      }
    }),
    r;
  try {
    r = e.sourcesIncomplete();
  } catch {
    r = !0;
  }
  let o;
  try {
    o = e.processGuard();
  } catch {
    o = z;
  }
  let i;
  try {
    i = await e.loadPlugins();
  } catch {
    i = null;
  }
  let s;
  try {
    s = e.repoEnabledPluginKeys?.();
  } catch {
    s = void 0;
  }
  return computePreToolUseCoverage({
    sources: mapped,
    sourcesIncomplete: r,
    processGuard: o,
    plugins: i,
    repoEnabledPluginKeys: s,
  });
}
//@ chunk-axmbhcjg.js:34348-34557 placement
async function readUserSettingsForSeed() {
  or();
  let e = getSettingsParseErrorsForSource("userSettings"),
    n = getSettingsForSource("userSettings");
  return e.some(isBlockingSettingsError) ||
    (n === null && (await Sr(getSettingsFilePathForSource("userSettings"))))
    ? { kind: "broken" }
    : { kind: "sendable", settings: n ?? {}, hasLostAnAllowEntry: e.some(Jt) };
}
//@ chunk-axmbhcjg.js:34557-34669 placement
function isBlockingSettingsError(e) {
  return (
    e.severity !== "warning" || e.path === "permissions" || (e.path.startsWith("permissions.") && !Jt(e))
  );
}
//@ chunk-axmbhcjg.js:34669-34732 placement
function Jt({ path: path }) {
  return path.startsWith("permissions.allow");
}
//@ chunk-axmbhcjg.js:34732-34831 placement
async function Sr(e) {
  try {
    return e !== void 0 && (await getFsImplementation().lstat(e)).isSymbolicLink();
  } catch {
    return !1;
  }
}

export {
  Ue,
  buildWithheldEntry,
  mapSkipReasonToLeftBehind,
  resolvePreToolUseCoverage,
  createHookCoverageSources,
  readUserSettingsForSeed,
  makeHookCoveragePredicate,
};
