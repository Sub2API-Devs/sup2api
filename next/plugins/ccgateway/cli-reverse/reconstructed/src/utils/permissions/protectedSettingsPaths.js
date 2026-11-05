/**
 * utils/permissions/protectedSettingsPaths.ts
 *
 * 2.1.316 新增：受保护的主目录根（HOME、USERPROFILE 等）；受保护的设置文件列表（各层级）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-91xvghb6.js (14), chunk-rvq35mve.js (4)
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
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { identity } from "../identity.js";
import { isNpmPluginSource } from "../plugins/officialMarketplaceNames.js";
import { spellingIn, settingsEnvKeptForChildren } from "../subprocessEnv.js";
import { isSecretEnvValue } from "../settings/policyHelper/helperEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-91xvghb6.js:11690-11765 placement (2.1.88 match: _temp9, 1)
/**
 * protectedSettingSourcesWithFlag：受保护设置源（含 flagSettings）。
 */
function protectedSettingSourcesWithFlag() {
  return getFlagSettingsExpectedContent() === undefined && getFlagSettingsPath() !== undefined
    ? [...PROJECT_SETTING_SOURCES, "flagSettings"]
    : PROJECT_SETTING_SOURCES;
}
//@ chunk-91xvghb6.js:11765-11836 placement
function unprotectedEnabledSettingSources() {
  let protectedSources = protectedSettingSourcesWithFlag();
  return SETTING_SOURCES.filter(
    (candidateSource) =>
      !protectedSources.includes(candidateSource) && isSettingSourceEnabled(candidateSource),
  );
}
//@ chunk-91xvghb6.js:11836-12413 placement (2.1.88 match: getSettingsRootPathForSource, 0.324)
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
//@ chunk-91xvghb6.js:12413-12648 placement
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
//@ chunk-91xvghb6.js:12648-12793 placement
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
//@ chunk-91xvghb6.js:12793-12910 placement
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
//@ chunk-91xvghb6.js:12910-13071 placement
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
//@ chunk-91xvghb6.js:13071-13421 placement (2.1.88 match: cacheToObject, 0.68)
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
//@ chunk-91xvghb6.js:13421-13601 placement
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
  return normalizeCaseForComparison_2([...protectedTempDirs, candidate, fallback]);
}
//@ chunk-91xvghb6.js:13601-14326 placement
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
          roots: normalizeCaseForComparison_2([candidate, verdict.spelling, real]),
          transient: false,
        };
      } catch {
        return {
          roots: [candidate, verdict.spelling],
          transient: false,
        };
      }
    });
  let roots = normalizeCaseForComparison_2(mapped.flatMap(({ roots }) => roots));
  if (latchedPreSettingsEnvSnapshot !== undefined && !mapped.some(({ transient }) => transient)) {
    protectedRootsState.snapshot = latchedPreSettingsEnvSnapshot;
    protectedRootsState.roots = roots;
  }
  return roots;
}
//@ chunk-91xvghb6.js:14326-14399 placement
var protectedRootsState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-91xvghb6.js:14326", () => {
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
//@ chunk-91xvghb6.js:14399-14467 placement
function tmpDirFromEnv(env) {
  return (
    stripTrailingSep(getEnvCaseInsensitive(env, "CLAUDE_CODE_TMPDIR") || undefined) ?? getTmpDirFromEnv(env)
  );
}
//@ chunk-91xvghb6.js:14467-14570 placement
function getTmpDirFromEnv(env) {
  let readVar = (name) => getEnvCaseInsensitive(env, name) || undefined;
  let fallbackDir = "/tmp";
  return stripTrailingSep(readVar("TMPDIR") ?? readVar("TMP") ?? readVar("TEMP") ?? "/tmp");
}
//@ chunk-91xvghb6.js:14570-14641 placement
function stripTrailingSep(value) {
  return value !== undefined && value.length > 1 ? value.replace(/[\\/]+$/, "") : value;
}
//@ chunk-rvq35mve.js:456-498 placement
/**
 * isNpmPluginSourcePath：是否为 npm 插件来源。
 */
function isNpmPluginSourcePath(pluginRef) {
  return pluginRef !== undefined && isNpmPluginSource(pluginRef);
}
//@ chunk-rvq35mve.js:498-885 placement
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
//@ chunk-rvq35mve.js:885-994 placement
/**
 * 删除环境对象里任意大小写的 BUN_OPTIONS 键后写入新值。
 */
function setBunOptions(env, value) {
  for (let key of Object.keys(env)) if (key.toUpperCase() === "BUN_OPTIONS") delete env[key];
  env.BUN_OPTIONS = value;
}
//@ chunk-rvq35mve.js:994-1319 placement
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
  checkPluginBunOptions,
  protectedHomeRoots,
  setBunOptions,
  withoutProtectedEnv,
  isNpmPluginSourcePath,
  bunOptionsGuard,
  getSettingsAppliedEnv,
  getProtectedTempDirsWithPreSettings,
  findEnvChangedBySettings,
  protectedSettingsFiles,
  protectedSettingSourcesWithFlag,
};
