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
  let n = protectedSettingSourcesWithFlag();
  return SETTING_SOURCES.filter((e) => !n.includes(e) && isSettingSourceEnabled(e));
}
//@ chunk-7wdbg1ct.js:11889-12466 placement
/**
 * 受保护的设置文件列表（各层级）。
 */
function protectedSettingsFiles(n, e = "unknown") {
  let o = protectedSettingSourcesWithFlag().includes("flagSettings") ? getFlagSettingsPath() : undefined;
  let r = o === undefined ? [] : [readSettingsEnvKeys(o, getFlagSettingsFilePinnedContent())];
  let flattened = [
    ...PROJECT_SETTING_SOURCES.map((l) => ({
      tier: l,
      file: getSettingsFilePathForSource(l),
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
            names: readSettingsEnvKeys(file, undefined, e),
          },
        ],
  );
  let mapped = [
    join(n.workTree, ".claude", "settings.json"),
    join(n.workTree, ".claude", "settings.local.json"),
  ]
    .filter((l) => !flattened.some(({ file }) => file === l))
    .map((l) => readSettingsEnvKeys(l, undefined, e));
  let mapped_2 = flattened.map(({ names }) => names);
  if ([...r, ...mapped_2, ...mapped].includes(null)) return null;
  return [
    ...r,
    ...flattened
      .filter(({ tier }) => !isWorkspaceRestricted() && !isRepoTierAnsweredByACopy(tier))
      .map(({ names }) => names),
  ].flatMap((l) => l ?? []);
}
//@ chunk-7wdbg1ct.js:12466-12701 placement
function readSettingsEnvKeys(n, e, o = "unknown") {
  let { settings, errors, textRead } =
    e === undefined
      ? parseSettingsFileIfChanged(n, new Map())
      : {
          ...parseSettingsFileUncached(n, e),
          textRead: undefined,
        };
  if (settings === null && errors.length === 0) return [];
  return settings === null || errors.some((error) => error.severity !== "warning")
    ? null
    : Object.keys(settings.env ?? {});
}
//@ chunk-7wdbg1ct.js:12701-12846 placement
function collectSettingsEnv(n) {
  let e = {};
  for (let o of n)
    try {
      let env = getSettingsForSource(o)?.env;
      if (env) {
        let i = pickByHelper(env, (s) => typeof s === "string");
        Object.assign(e, filterPolicyPredicateEnv(i, o));
      }
    } catch {}
  return e;
}
//@ chunk-7wdbg1ct.js:12846-12964 placement
/**
 * 设置生效后的环境：全局配置 env 加上各设置来源的 env（仅在主目录变量未被改动时）。
 */
function getSettingsAppliedEnv() {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  let e =
    latchedPreSettingsEnvSnapshot === undefined ||
    HOME_ENV_VARS.every(
      (o) =>
        getEnvCaseInsensitive(process.env, o) === getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, o),
    );
  return {
    ...getAppliedGlobalConfigEnv(),
    ...(e ? collectSettingsEnv(unprotectedEnabledSettingSources()) : {}),
  };
}
//@ chunk-7wdbg1ct.js:12964-13125 placement
/**
 * 在给定变量名里找出被设置改动过的那个（与设置加载前快照比较，主目录变量或非设置值的变化）。
 */
function findEnvChangedBySettings(n) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  let r = HOME_ENV_VARS;
  return n.find((i) => {
    let envCaseInsensitive = getEnvCaseInsensitive(process.env, i);
    return (
      envCaseInsensitive !== getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, i) &&
      (r.includes(i) || envCaseInsensitive !== getEnvCaseInsensitive(settingsAppliedEnv, i))
    );
  });
}
//@ chunk-7wdbg1ct.js:13125-13475 placement
/**
 * 去掉受保护环境变量。
 */
function withoutProtectedEnv(n) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return n;
  let settingsAppliedEnv = getSettingsAppliedEnv();
  let r = HOME_ENV_VARS;
  let i = new Set(
    Object.keys(n).filter((key) => {
      let u = n[key];
      return (
        u !== undefined &&
        u !== getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, key) &&
        (r.includes(key.toUpperCase()) || u !== getEnvCaseInsensitive(settingsAppliedEnv, key)) &&
        isSettingsSourcedEnvValue(key, u)
      );
    }),
  );
  if (i.size === 0) return n;
  return {
    ...pickByHelper(n, (s, u) => !i.has(u)),
    ...Object.fromEntries(
      [...i].flatMap((s) => {
        let envCaseInsensitive = getEnvCaseInsensitive(latchedPreSettingsEnvSnapshot, s);
        return envCaseInsensitive === undefined ? [] : [[s, envCaseInsensitive]];
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
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  if (latchedPreSettingsEnvSnapshot === undefined) return protectedTempDirs;
  let o = tmpDirFromEnv(latchedPreSettingsEnvSnapshot);
  if (o === undefined) return protectedTempDirs;
  let r = basename(claudeTempDir());
  let i = join(o, r);
  let s =
    Buffer.byteLength(i) <= MAX_SAFE_TMPDIR_BYTES
      ? i
      : join(getTmpDirFromEnv(latchedPreSettingsEnvSnapshot) ?? o, r);
  return uniq([...protectedTempDirs, i, s]);
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
  let e = latchedPreSettingsEnvSnapshot ?? process.env;
  let mapped = [
    getEnvCaseInsensitive(e, "HOME") ||
      (getPlatform() === "windows"
        ? getEnvCaseInsensitive(e, "USERPROFILE") ||
          (getEnvCaseInsensitive(e, "HOMEDRIVE") && getEnvCaseInsensitive(e, "HOMEPATH")
            ? `${getEnvCaseInsensitive(e, "HOMEDRIVE")}${getEnvCaseInsensitive(e, "HOMEPATH")}`
            : undefined)
        : undefined),
    tmpDirFromEnv(e),
  ]
    .filter((u) => u !== undefined && u !== "")
    .map((u) => {
      let l = classifyPathSpelling(u, u);
      if (l.verdict !== "local") {
        logForDebugging(
          `[repositorySettings] start root ${u} cannot be vouched for (${l.verdict}): it exempts nothing`,
          {
            level: "warn",
          },
        );
        return {
          roots: [],
          transient: l.verdict === "unreadable",
        };
      }
      try {
        let c = realpathSync(l.spelling);
        return {
          roots: uniq([u, l.spelling, c]),
          transient: false,
        };
      } catch {
        return {
          roots: [u, l.spelling],
          transient: false,
        };
      }
    });
  let s = uniq(mapped.flatMap(({ roots }) => roots));
  if (latchedPreSettingsEnvSnapshot !== undefined && !mapped.some(({ transient }) => transient)) {
    protectedRootsState.snapshot = latchedPreSettingsEnvSnapshot;
    protectedRootsState.roots = s;
  }
  return s;
}
//@ chunk-7wdbg1ct.js:14380-14453 placement
var protectedRootsState = identity(
  {
    snapshot: undefined,
    roots: [],
  },
  (n) => {
    n.snapshot = undefined;
    n.roots = [];
  },
);
//@ chunk-7wdbg1ct.js:14453-14521 placement
function tmpDirFromEnv(n) {
  return stripTrailingSep(getEnvCaseInsensitive(n, "CLAUDE_CODE_TMPDIR") || undefined) ?? getTmpDirFromEnv(n);
}
//@ chunk-7wdbg1ct.js:14521-14624 placement
function getTmpDirFromEnv(n) {
  let e = (r) => getEnvCaseInsensitive(n, r) || undefined;
  let o = "/tmp";
  return stripTrailingSep(e("TMPDIR") ?? e("TMP") ?? e("TEMP") ?? "/tmp");
}
//@ chunk-7wdbg1ct.js:14624-14695 placement
function stripTrailingSep(n) {
  return n !== undefined && n.length > 1 ? n.replace(/[\\/]+$/, "") : n;
}
//@ chunk-7wdbg1ct.js:14695-14737 placement
/**
 * isNpmPluginSourcePath：是否为 npm 插件来源。
 */
function isNpmPluginSourcePath(promptShellPluginId) {
  return promptShellPluginId !== undefined && isNpmPluginSource(promptShellPluginId);
}
//@ chunk-7wdbg1ct.js:14737-15124 placement
/**
 * 计算插件所需的 BUN_OPTIONS 保护值。
 */
function bunOptionsGuard(n, e) {
  if (isNpmPluginSourcePath(n)) {
    if (hostOwnedEnvNames().some((y) => y.toUpperCase() === "BUN_OPTIONS")) return "--install=disable";
    let o = spellingIn(e, "BUN_OPTIONS");
    let r = e[o];
    let envCaseInsensitive = getEnvCaseInsensitive(getSettingsAppliedEnv(), "BUN_OPTIONS");
    let envCaseInsensitive_2 = getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot() ?? {}, "BUN_OPTIONS");
    let u =
      r === undefined ||
      r === envCaseInsensitive ||
      (envCaseInsensitive === undefined &&
        (r === envCaseInsensitive_2 || !isSettingsSourcedEnvValue(o, r)) &&
        r !== settingsEnvKeptForChildren("BUN_OPTIONS"));
    let l = envCaseInsensitive ?? envCaseInsensitive_2;
    let c = u ? r : l !== undefined && !isSecretEnvValue("BUN_OPTIONS", l) ? l : undefined;
    return c ? `--install=disable ${c}` : "--install=disable";
  }
  return;
}
//@ chunk-7wdbg1ct.js:15124-15233 placement
/**
 * 删除环境对象里任意大小写的 BUN_OPTIONS 键后写入新值。
 */
function setBunOptions(n, e) {
  for (let key of Object.keys(n)) if (key.toUpperCase() === "BUN_OPTIONS") delete n[key];
  n.BUN_OPTIONS = e;
}
//@ chunk-7wdbg1ct.js:15233-15558 placement
/**
 * 检查插件是否改动 BUN_OPTIONS。
 */
function checkPluginBunOptions(n, e, o) {
  {
    let r = bunOptionsGuard(n, o);
    if (r === undefined) return;
    if (e[spellingIn(e, "BUN_OPTIONS")] !== o[spellingIn(o, "BUN_OPTIONS")])
      logForDebugging(
        `Plugin ${n} set BUN_OPTIONS for a program it starts; Claude Code replaced it, because programs of Anthropic Directory plugins run with Bun's automatic install off and must ship the packages they import`,
      );
    setBunOptions(e, r);
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
