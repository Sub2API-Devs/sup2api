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
import { join, join as join_2, basename, basename as basename_2 } from "path";
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
  aqt,
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
import { Do } from "../git/gitSafeEnv.js";
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
import { ge } from "../identity.js";
import { isNpmPluginSource } from "../plugins/officialMarketplaceNames.js";
import { spellingIn, settingsEnvKeptForChildren } from "../subprocessEnv.js";
import { isSecretEnvValue } from "../settings/policyHelper/helperEnv.js";

//@ chunk-7wdbg1ct.js:11743-11818 placement = _temp9 (1)
function E6r() {
  return getFlagSettingsExpectedContent() === void 0 && getFlagSettingsPath() !== void 0
    ? [...PROJECT_SETTING_SOURCES, "flagSettings"]
    : PROJECT_SETTING_SOURCES;
}
//@ chunk-7wdbg1ct.js:11818-11889 placement
function Hn() {
  let n = E6r();
  return SETTING_SOURCES.filter((e) => !n.includes(e) && isSettingSourceEnabled(e));
}
/**
 * 受保护的设置文件列表（各层级）。
 */
//@ chunk-7wdbg1ct.js:11889-12466 placement
function protectedSettingsFiles(n, e = "unknown") {
  let o = E6r().includes("flagSettings") ? getFlagSettingsPath() : void 0,
    r = o === void 0 ? [] : [readSettingsEnvKeys(o, getFlagSettingsFilePinnedContent())],
    flattened = [
      ...PROJECT_SETTING_SOURCES.map((l) => ({ tier: l, file: getSettingsFilePathForSource(l) })),
      { tier: "localSettings", file: getLegacyLocalSettingsFilePath() },
    ].flatMap(({ tier: tier, file: file }) =>
      file === void 0 ? [] : [{ tier: tier, file: file, names: readSettingsEnvKeys(file, void 0, e) }],
    ),
    mapped = [
      join(n.workTree, ".claude", "settings.json"),
      join(n.workTree, ".claude", "settings.local.json"),
    ]
      .filter((l) => !flattened.some(({ file: file }) => file === l))
      .map((l) => readSettingsEnvKeys(l, void 0, e)),
    mapped_2 = flattened.map(({ names: names }) => names);
  if ([...r, ...mapped_2, ...mapped].includes(null)) return null;
  return [
    ...r,
    ...flattened
      .filter(({ tier: tier }) => !isWorkspaceRestricted() && !isRepoTierAnsweredByACopy(tier))
      .map(({ names: names }) => names),
  ].flatMap((l) => l ?? []);
}
//@ chunk-7wdbg1ct.js:12466-12701 placement
function readSettingsEnvKeys(n, e, o = "unknown") {
  let {
    settings: settings,
    errors: errors,
    textRead: textRead,
  } = e === void 0
    ? parseSettingsFileIfChanged(n, new Map())
    : { ...parseSettingsFileUncached(n, e), textRead: void 0 };
  if (settings === null && errors.length === 0) return [];
  return settings === null || errors.some((u) => u.severity !== "warning")
    ? null
    : Object.keys(settings.env ?? {});
}
//@ chunk-7wdbg1ct.js:12701-12846 placement
function collectSettingsEnv(n) {
  let e = {};
  for (let o of n)
    try {
      let r = getSettingsForSource(o)?.env;
      if (r) {
        let i = Do(r, (s) => typeof s === "string");
        Object.assign(e, filterPolicyPredicateEnv(i, o));
      }
    } catch {}
  return e;
}
/**
 * 设置生效后的环境：全局配置 env 加上各设置来源的 env（仅在主目录变量未被改动时）。
 */
//@ chunk-7wdbg1ct.js:12846-12964 placement
function getSettingsAppliedEnv() {
  let n = getLatchedPreSettingsEnvSnapshot(),
    e =
      n === void 0 ||
      HOME_ENV_VARS.every((o) => getEnvCaseInsensitive(process.env, o) === getEnvCaseInsensitive(n, o));
  return { ...getAppliedGlobalConfigEnv(), ...(e ? collectSettingsEnv(Hn()) : {}) };
}
/**
 * 在给定变量名里找出被设置改动过的那个（与设置加载前快照比较，主目录变量或非设置值的变化）。
 */
//@ chunk-7wdbg1ct.js:12964-13125 placement
function findEnvChangedBySettings(n) {
  let e = getLatchedPreSettingsEnvSnapshot();
  if (e === void 0) return;
  let o = getSettingsAppliedEnv(),
    r = HOME_ENV_VARS;
  return n.find((i) => {
    let s = getEnvCaseInsensitive(process.env, i);
    return s !== getEnvCaseInsensitive(e, i) && (r.includes(i) || s !== getEnvCaseInsensitive(o, i));
  });
}
/**
 * 去掉受保护环境变量。
 */
//@ chunk-7wdbg1ct.js:13125-13475 placement
function withoutProtectedEnv(n) {
  let e = getLatchedPreSettingsEnvSnapshot();
  if (e === void 0) return n;
  let o = getSettingsAppliedEnv(),
    r = HOME_ENV_VARS,
    i = new Set(
      Object.keys(n).filter((s) => {
        let u = n[s];
        return (
          u !== void 0 &&
          u !== getEnvCaseInsensitive(e, s) &&
          (r.includes(s.toUpperCase()) || u !== getEnvCaseInsensitive(o, s)) &&
          isSettingsSourcedEnvValue(s, u)
        );
      }),
    );
  if (i.size === 0) return n;
  return {
    ...Do(n, (s, u) => !i.has(u)),
    ...Object.fromEntries(
      [...i].flatMap((s) => {
        let u = getEnvCaseInsensitive(e, s);
        return u === void 0 ? [] : [[s, u]];
      }),
    ),
  };
}
/**
 * 受保护临时目录，加上按设置加载前环境推导出的 Claude 临时目录（超长时换短根）。
 */
//@ chunk-7wdbg1ct.js:13475-13655 placement
function getProtectedTempDirsWithPreSettings() {
  let n = getProtectedTempDirs(),
    e = getLatchedPreSettingsEnvSnapshot();
  if (e === void 0) return n;
  let o = pn(e);
  if (o === void 0) return n;
  let r = basename(claudeTempDir()),
    i = join(o, r),
    s = Buffer.byteLength(i) <= MAX_SAFE_TMPDIR_BYTES ? i : join(getTmpDirFromEnv(e) ?? o, r);
  return uniq([...n, i, s]);
}
/**
 * 受保护的主目录根（HOME、USERPROFILE 等）。
 */
//@ chunk-7wdbg1ct.js:13655-14380 placement
function protectedHomeRoots() {
  let n = getLatchedPreSettingsEnvSnapshot();
  if (n !== void 0 && F.snapshot === n) return F.roots;
  let e = n ?? process.env,
    mapped = [
      getEnvCaseInsensitive(e, "HOME") ||
        (getPlatform() === "windows"
          ? getEnvCaseInsensitive(e, "USERPROFILE") ||
            (getEnvCaseInsensitive(e, "HOMEDRIVE") && getEnvCaseInsensitive(e, "HOMEPATH")
              ? `${getEnvCaseInsensitive(e, "HOMEDRIVE")}${getEnvCaseInsensitive(e, "HOMEPATH")}`
              : void 0)
          : void 0),
      pn(e),
    ]
      .filter((u) => u !== void 0 && u !== "")
      .map((u) => {
        let l = aqt(u, u);
        if (l.verdict !== "local")
          return (
            logForDebugging(
              `[repositorySettings] start root ${u} cannot be vouched for (${l.verdict}): it exempts nothing`,
              { level: "warn" },
            ),
            { roots: [], transient: l.verdict === "unreadable" }
          );
        try {
          let c = realpathSync(l.spelling);
          return { roots: uniq([u, l.spelling, c]), transient: !1 };
        } catch {
          return { roots: [u, l.spelling], transient: !1 };
        }
      }),
    s = uniq(mapped.flatMap(({ roots: roots }) => roots));
  if (n !== void 0 && !mapped.some(({ transient: transient }) => transient))
    ((F.snapshot = n), (F.roots = s));
  return s;
}
//@ chunk-7wdbg1ct.js:14380-14453 placement
var F = ge({ snapshot: void 0, roots: [] }, (n) => {
  ((n.snapshot = void 0), (n.roots = []));
});
//@ chunk-7wdbg1ct.js:14453-14521 placement
function pn(n) {
  return En(getEnvCaseInsensitive(n, "CLAUDE_CODE_TMPDIR") || void 0) ?? getTmpDirFromEnv(n);
}
//@ chunk-7wdbg1ct.js:14521-14624 placement
function getTmpDirFromEnv(n) {
  let e = (r) => getEnvCaseInsensitive(n, r) || void 0,
    o = "/tmp";
  return En(e("TMPDIR") ?? e("TMP") ?? e("TEMP") ?? "/tmp");
}
//@ chunk-7wdbg1ct.js:14624-14695 placement
function En(n) {
  return n !== void 0 && n.length > 1 ? n.replace(/[\\/]+$/, "") : n;
}
//@ chunk-7wdbg1ct.js:14695-14737 placement
function VSn(n) {
  return n !== void 0 && isNpmPluginSource(n);
}
/**
 * 计算插件所需的 BUN_OPTIONS 保护值。
 */
//@ chunk-7wdbg1ct.js:14737-15124 placement
function bunOptionsGuard(n, e) {
  if (VSn(n)) {
    if (hostOwnedEnvNames().some((y) => y.toUpperCase() === "BUN_OPTIONS")) return "--install=disable";
    let o = spellingIn(e, "BUN_OPTIONS"),
      r = e[o],
      i = getEnvCaseInsensitive(getSettingsAppliedEnv(), "BUN_OPTIONS"),
      s = getEnvCaseInsensitive(getLatchedPreSettingsEnvSnapshot() ?? {}, "BUN_OPTIONS"),
      u =
        r === void 0 ||
        r === i ||
        (i === void 0 &&
          (r === s || !isSettingsSourcedEnvValue(o, r)) &&
          r !== settingsEnvKeptForChildren("BUN_OPTIONS")),
      l = i ?? s,
      c = u ? r : l !== void 0 && !isSecretEnvValue("BUN_OPTIONS", l) ? l : void 0;
    return c ? `--install=disable ${c}` : "--install=disable";
  }
  return;
}
/**
 * 删除环境对象里任意大小写的 BUN_OPTIONS 键后写入新值。
 */
//@ chunk-7wdbg1ct.js:15124-15233 placement
function setBunOptions(n, e) {
  for (let o of Object.keys(n)) if (o.toUpperCase() === "BUN_OPTIONS") delete n[o];
  n.BUN_OPTIONS = e;
}
/**
 * 检查插件是否改动 BUN_OPTIONS。
 */
//@ chunk-7wdbg1ct.js:15233-15558 placement
function checkPluginBunOptions(n, e, o) {
  {
    let r = bunOptionsGuard(n, o);
    if (r === void 0) return;
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
  VSn,
  setBunOptions,
  protectedSettingsFiles,
  E6r,
  findEnvChangedBySettings,
  withoutProtectedEnv,
  protectedHomeRoots,
  getProtectedTempDirsWithPreSettings,
  getSettingsAppliedEnv,
};
