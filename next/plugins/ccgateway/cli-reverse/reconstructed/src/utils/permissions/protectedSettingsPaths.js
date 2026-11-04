/**
 * utils/permissions/protectedSettingsPaths.ts
 *
 * 2.1.316 新增：受保护的主目录根（HOME、USERPROFILE 等）；受保护的设置文件列表（各层级）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7wdbg1ct.js (18)
 * attribution: placement 18
 */
import { join, basename } from "path";
import { realpathSync } from "fs";
import {
  getFlagSettingsExpectedContent,
  getFlagSettingsPath,
  getFlagSettingsFilePinnedContent,
  isWorkspaceRestricted,
} from "../../bootstrap/state.js";
import {
  PROJECT_SETTING_SOURCES,
  HOME_ENV_VARS,
  getProtectedTempDirs,
  classifyPathSpelling,
} from "./protectedEnvAndGitPaths.js";
import { SETTING_SOURCES, isSettingSourceEnabled } from "../settings/constants.js";
import {
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  isRepoTierAnsweredByACopy,
  parseSettingsFileUncached,
  getSettingsForSource,
} from "../settings/settings.js";
import { parseSettingsFileIfChanged } from "../settings/settingsFileParsing.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import {
  filterPolicyPredicateEnv,
  getLatchedPreSettingsEnvSnapshot,
  getAppliedGlobalConfigEnv,
  isSettingsSourcedEnvValue,
} from "../managedEnvApply.js";
import { getEnvCaseInsensitive, hostOwnedEnvNames } from "../plugins/securityDefaultPlugin.js";
import { claudeTempDir, MAX_SAFE_TMPDIR_BYTES } from "../tempDir.js";
import { uniq } from "../collections.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { identity } from "../identity.js";
import { isNpmPluginSource } from "../plugins/officialMarketplaceNames.js";
import { spellingIn, settingsEnvKeptForChildren } from "../subprocessEnv.js";
import { isSecretEnvValue } from "../settings/policyHelper/helperEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7wdbg1ct.js:11743-11818 placement = _temp9 (1)
/**
 * protectedSettingSourcesWithFlag：受保护设置源（含 flagSettings）。
 */
function protectedSettingSourcesWithFlag() {
  return getFlagSettingsExpectedContent() === undefined && getFlagSettingsPath() !== undefined
    ? [...PROJECT_SETTING_SOURCES, "flagSettings"]
    : PROJECT_SETTING_SOURCES;
}
//@ chunk-7wdbg1ct.js:11818-11889 placement
function unprotectedEnabledSettingSources() {
  let protectedSources = protectedSettingSourcesWithFlag();
  return SETTING_SOURCES.filter(
    (candidateSource) =>
      !protectedSources.includes(candidateSource) && isSettingSourceEnabled(candidateSource),
  );
}
//@ chunk-7wdbg1ct.js:11889-12466 placement
/**
 * 受保护的设置文件列表（各层级）。
 */
function protectedSettingsFiles(location, sourceLabel = "unknown") {
  let flagSettingsPath = protectedSettingSourcesWithFlag().includes("flagSettings")
    ? getFlagSettingsPath()
    : undefined;
  let flagNames =
    flagSettingsPath === undefined
      ? []
      : [readSettingsEnvKeys(flagSettingsPath, getFlagSettingsFilePinnedContent())];
  let flattened = [
    ...PROJECT_SETTING_SOURCES.map((source) => ({
      tier: source,
      file: getSettingsFilePathForSource(source),
    })),
    {
      tier: "localSettings",
      file: getLegacyLocalSettingsFilePath(),
    },
  ].flatMap(({ tier, file }) =>
    file === undefined
      ? []
      : [
          {
            tier,
            file,
            names: readSettingsEnvKeys(file, undefined, sourceLabel),
          },
        ],
  );
  let mapped = [
    join(location.workTree, ".claude", "settings.json"),
    join(location.workTree, ".claude", "settings.local.json"),
  ]
    .filter((candidatePath) => !flattened.some(({ file }) => file === candidatePath))
    .map((candidatePath) => readSettingsEnvKeys(candidatePath, undefined, sourceLabel));
  let mapped_2 = flattened.map(({ names }) => names);
  if ([...flagNames, ...mapped_2, ...mapped].includes(null)) return null;
  return [
    ...flagNames,
    ...flattened
      .filter(({ tier }) => !isWorkspaceRestricted() && !isRepoTierAnsweredByACopy(tier))
      .map(({ names }) => names),
  ].flatMap((names) => names ?? []);
}
//@ chunk-7wdbg1ct.js:12466-12701 placement
function readSettingsEnvKeys(settingsPath, cache, label = "unknown") {
  let { settings, errors, textRead } =
    cache === undefined
      ? parseSettingsFileIfChanged(settingsPath, new Map())
      : {
          ...parseSettingsFileUncached(settingsPath, cache),
          textRead: undefined,
        };
  if (settings === null && errors.length === 0) return [];
  return settings === null || errors.some((error) => error.severity !== "warning")
    ? null
    : Object.keys(settings.env ?? {});
}
//@ chunk-7wdbg1ct.js:12701-12846 placement
function collectSettingsEnv(sources) {
  let env = {};
  for (let source of sources)
    try {
      let env_2 = getSettingsForSource(source)?.env;
      if (env_2) {
        let stringEnv = pickByHelper(env_2, (value) => typeof value === "string");
        Object.assign(env, filterPolicyPredicateEnv(stringEnv, source));
      }
    } catch {}
  return env;
}
//@ chunk-7wdbg1ct.js:12846-12964 placement
/**
 * 设置生效后的环境：全局配置 env 加上各设置来源的 env（仅在主目录变量未被改动时）。
 */
function getSettingsAppliedEnv() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  let homeUnchanged =
    latchedPreSettingsEnvSnapshot === undefined ||
    HOME_ENV_VARS.every(
      (varName) =>
        getEnvCaseInsensitive(process.env, varName) ===
        getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, varName),
    );
  return {
    ...getAppliedGlobalConfigEnv(),
    ...(homeUnchanged ? collectSettingsEnv(unprotectedEnabledSettingSources()) : {}),
  };
}
//@ chunk-7wdbg1ct.js:12964-13125 placement
/**
 * 在给定变量名里找出被设置改动过的那个（与设置加载前快照比较，主目录变量或非设置值的变化）。
 */
function findEnvChangedBySettings(names) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  let homeVars = HOME_ENV_VARS;
  return names.find((name) => {
    let envCaseInsensitive = getEnvCaseInsensitive(process.env, name);
    return (
      envCaseInsensitive !== getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, name) &&
      (homeVars.includes(name) || envCaseInsensitive !== getEnvCaseInsensitive(settingsAppliedEnv, name))
    );
  });
}
//@ chunk-7wdbg1ct.js:13125-13475 placement
/**
 * 去掉受保护环境变量。
 */
function withoutProtectedEnv(env) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return env;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  let homeEnvVars = HOME_ENV_VARS;
  let protectedNames = new Set(
    Object.keys(env).filter((key) => {
      let value = env[key];
      return (
        value !== undefined &&
        value !== getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, key) &&
        (homeEnvVars.includes(key.toUpperCase()) ||
          value !== getEnvCaseInsensitive(settingsAppliedEnv, key)) &&
        isSettingsSourcedEnvValue(key, value)
      );
    }),
  );
  if (protectedNames.size === 0) return env;
  return {
    ...pickByHelper(env, (value, key) => !protectedNames.has(key)),
    ...Object.fromEntries(
      [...protectedNames].flatMap((name) => {
        let envCaseInsensitive = getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, name);
        return envCaseInsensitive === undefined ? [] : [[name, envCaseInsensitive]];
      }),
    ),
  };
}
//@ chunk-7wdbg1ct.js:13475-13655 placement
/**
 * 受保护临时目录，加上按设置加载前环境推导出的 Claude 临时目录（超长时换短根）。
 */
function getProtectedTempDirsWithPreSettings() {
  let protectedTempDirs = getProtectedTempDirs();
  let env = getLatchedPreSettingsEnvSnapshot();
  if (env === undefined) return protectedTempDirs;
  let tmpRoot = tmpDirFromEnv(env);
  if (tmpRoot === undefined) return protectedTempDirs;
  let baseName = basename(claudeTempDir());
  let candidate = join(tmpRoot, baseName);
  let fallback =
    Buffer.byteLength(candidate) <= MAX_SAFE_TMPDIR_BYTES
      ? candidate
      : join(getTmpDirFromEnv(env) ?? tmpRoot, baseName);
  return uniq([...protectedTempDirs, candidate, fallback]);
}
//@ chunk-7wdbg1ct.js:13655-14380 placement
/**
 * 受保护的主目录根（HOME、USERPROFILE 等）。
 */
function protectedHomeRoots() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (
    latchedPreSettingsEnvSnapshot !== undefined &&
    protectedRootsState.snapshot === latchedPreSettingsEnvSnapshot
  )
    return protectedRootsState.roots;
  let env = latchedPreSettingsEnvSnapshot ?? process.env;
  let mapped = [
    getEnvCaseInsensitive(env, "HOME") ||
      (getPlatform() === "windows"
        ? getEnvCaseInsensitive(env, "USERPROFILE") ||
          (getEnvCaseInsensitive(env, "HOMEDRIVE") && getEnvCaseInsensitive(env, "HOMEPATH")
            ? `${getEnvCaseInsensitive(env, "HOMEDRIVE")}${getEnvCaseInsensitive(env, "HOMEPATH")}`
            : undefined)
        : undefined),
    tmpDirFromEnv(env),
  ]
    .filter((candidate) => candidate !== undefined && candidate !== "")
    .map((candidate) => {
      let verdict = classifyPathSpelling(candidate, candidate);
      if (verdict.verdict !== "local") {
        logForDebugging(
          `[repositorySettings] start root ${candidate} cannot be vouched for (${verdict.verdict}): it exempts nothing`,
          {
            level: "warn",
          },
        );
        return {
          roots: [],
          transient: verdict.verdict === "unreadable",
        };
      }
      try {
        let real = realpathSync(verdict.spelling);
        return {
          roots: uniq([candidate, verdict.spelling, real]),
          transient: false,
        };
      } catch {
        return {
          roots: [candidate, verdict.spelling],
          transient: false,
        };
      }
    });
  let roots = uniq(mapped.flatMap(({ roots }) => roots));
  if (latchedPreSettingsEnvSnapshot !== undefined && !mapped.some(({ transient }) => transient)) {
    protectedRootsState.snapshot = latchedPreSettingsEnvSnapshot;
    protectedRootsState.roots = roots;
  }
  return roots;
}
//@ chunk-7wdbg1ct.js:14380-14453 placement
var protectedRootsState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7wdbg1ct.js:14380", () => {
  protectedRootsState = identity(
    {
      snapshot: undefined,
      roots: [],
    },
    (state) => {
      state.snapshot = undefined;
      state.roots = [];
    },
  );
});
//@ chunk-7wdbg1ct.js:14453-14521 placement
function tmpDirFromEnv(env) {
  return (
    stripTrailingSep(getEnvCaseInsensitive(env, "CLAUDE_CODE_TMPDIR") || undefined) ?? getTmpDirFromEnv(env)
  );
}
//@ chunk-7wdbg1ct.js:14521-14624 placement
function getTmpDirFromEnv(env) {
  let readVar = (name) => getEnvCaseInsensitive(env, name) || undefined;
  let fallbackDir = "/tmp";
  return stripTrailingSep(readVar("TMPDIR") ?? readVar("TMP") ?? readVar("TEMP") ?? "/tmp");
}
//@ chunk-7wdbg1ct.js:14624-14695 placement
function stripTrailingSep(value) {
  return value !== undefined && value.length > 1 ? value.replace(/[\\/]+$/, "") : value;
}
//@ chunk-7wdbg1ct.js:14695-14737 placement
/**
 * isNpmPluginSourcePath：是否为 npm 插件来源。
 */
function isNpmPluginSourcePath(pluginRef) {
  return pluginRef !== undefined && isNpmPluginSource(pluginRef);
}
//@ chunk-7wdbg1ct.js:14737-15124 placement
/**
 * 计算插件所需的 BUN_OPTIONS 保护值。
 */
function bunOptionsGuard(pluginSourcePath, env) {
  if (isNpmPluginSourcePath(pluginSourcePath)) {
    if (hostOwnedEnvNames().some((name) => name.toUpperCase() === "BUN_OPTIONS")) return "--install=disable";
    let key = spellingIn(env, "BUN_OPTIONS");
    let current = env[key];
    let envCaseInsensitive = getEnvCaseInsensitive(getSettingsAppliedEnv(), "BUN_OPTIONS");
    let envCaseInsensitive_2 = getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot() ?? {}, "BUN_OPTIONS");
    let isUnchanged =
      current === undefined ||
      current === envCaseInsensitive ||
      (envCaseInsensitive === undefined &&
        (current === envCaseInsensitive_2 || !isSettingsSourcedEnvValue(key, current)) &&
        current !== settingsEnvKeptForChildren("BUN_OPTIONS"));
    let settingsValue = envCaseInsensitive ?? envCaseInsensitive_2;
    let keptValue = isUnchanged
      ? current
      : settingsValue !== undefined && !isSecretEnvValue("BUN_OPTIONS", settingsValue)
        ? settingsValue
        : undefined;
    return keptValue ? `--install=disable ${keptValue}` : "--install=disable";
  }
  return;
}
//@ chunk-7wdbg1ct.js:15124-15233 placement
/**
 * 删除环境对象里任意大小写的 BUN_OPTIONS 键后写入新值。
 */
function setBunOptions(env, value) {
  for (let key of Object.keys(env)) if (key.toUpperCase() === "BUN_OPTIONS") delete env[key];
  env.BUN_OPTIONS = value;
}
//@ chunk-7wdbg1ct.js:15233-15558 placement
/**
 * 检查插件是否改动 BUN_OPTIONS。
 */
function checkPluginBunOptions(pluginSourcePath, childEnv, env) {
  {
    let guarded = bunOptionsGuard(pluginSourcePath, env);
    if (guarded === undefined) return;
    if (childEnv[spellingIn(childEnv, "BUN_OPTIONS")] !== env[spellingIn(env, "BUN_OPTIONS")])
      logForDebugging(
        `Plugin ${pluginSourcePath} set BUN_OPTIONS for a program it starts; Claude Code replaced it, because programs of Anthropic Directory plugins run with Bun's automatic install off and must ship the packages they import`,
      );
    setBunOptions(childEnv, guarded);
  }
}
export {
  bunOptionsGuard,
  checkPluginBunOptions,
  isNpmPluginSourcePath,
  setBunOptions,
  protectedSettingsFiles,
  protectedSettingSourcesWithFlag,
  findEnvChangedBySettings,
  withoutProtectedEnv,
  protectedHomeRoots,
  getProtectedTempDirsWithPreSettings,
  getSettingsAppliedEnv,
};
