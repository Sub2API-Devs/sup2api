/**
 * utils/git/builderGit/inTreeConfig.ts
 *
 * builderGit：检出内配置读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (15)
 * attribution: placement 15
 */
import { join, isAbsolute } from "path";
import { homedir } from "os";
import { lstat, open } from "fs/promises";
import { constants } from "fs";
import {
  repoAncestorsBelowHome,
  resolvePathSpellings,
  collectRepoSettingsReachRoots,
  settingsReachRoots,
  checkoutDirOfGitDir,
  resolveRealPathLoose,
  findHeldCheckout,
  MAX_CONFIG_WALK_BYTES,
} from "./sandboxReach.js";
import { uniq } from "../../collections.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_3,
  spellingsToCheck,
  isPathInside as isPathInside_2,
  isWindowsNonDrivePath,
  getGitConfigPaths,
  isWritableSharedFile,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { protectedHomeRoots } from "../../permissions/protectedSettingsPaths.js";
import { checkSessionTempRoot } from "./gitDirIdentity.js";
import { hasDotDotSegment } from "../../pathClassification.js";
import { buildGitEnv } from "./gitEnv.js";
import { resolveIncludePaths, MAX_INCLUDE_FILES } from "./gitConfigAudit.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { readOnlyNoFollowFlags } from "../../platformTargets.js";
import { getErrnoCode } from "../../errors.js";
import { hasNulByte, parseGitConfig } from "../gitConfigParser.js";
import { firstLineOf } from "../../stringUtils.js";

//@ chunk-s61vbvea.js:267395-270729 placement
/**
 * 读取检出内的 git 配置与 config.worktree，判断能否安全使用
 */
async function readInTreeGitConfig(repository, cwd, r) {
  for (let se of ["config", "config.worktree"]) {
    let re = join(repository, se);
    let gitConfigFile = await readGitConfigFile(re, false);
    if (gitConfigFile.kind === "unread")
      return {
        kind: "unread",
        file: re,
      };
    if (gitConfigFile.kind === "shared")
      return {
        kind: "second_name",
        file: re,
      };
    if (gitConfigFile.kind === "read" && gitConfigFile.hasInclude)
      return {
        kind: "includes",
        file: re,
      };
    if (gitConfigFile.kind === "read" && gitConfigFile.coreWorktree)
      return {
        kind: "work_tree",
        file: re,
      };
    if (gitConfigFile.kind === "read" && r && gitConfigFile.worktreeConfigOn)
      return {
        kind: "worktree_config",
        file: re,
      };
  }
  let s = repoAncestorsBelowHome(cwd);
  let h =
    s.length === 0 ? [] : uniq([homedir(), ...s].flatMap((se) => [se, ...resolvePathSpellings(se, cwd)]));
  let repoSettingsReachRoots = collectRepoSettingsReachRoots(cwd);
  if (repoSettingsReachRoots === "unreadable")
    return {
      kind: "settings_unreadable",
      file: join(cwd, ".claude"),
    };
  let S = (
    await Promise.all(
      uniq([...settingsReachRoots(cwd), ...repoSettingsReachRoots]).map(async (se) => {
        let foreignSpelling = await resolveForeignSpellingAsync(
          await classifyPathSpelling_3(se, cwd),
          cwd,
          protectedHomeRoots(),
        );
        return foreignSpelling.verdict === "local"
          ? await dropSpecialFiles(
              uniq([se, foreignSpelling.spelling, ...resolvePathSpellings(foreignSpelling.spelling, cwd)]),
            )
          : spellingsToCheck(
              foreignSpelling.verdict === "foreign"
                ? {
                    ...foreignSpelling,
                    verdict: "opaque",
                  }
                : foreignSpelling,
              cwd,
            );
      }),
    )
  ).flat();
  let w = uniq([
    ...[cwd, repository, checkoutDirOfGitDir(repository)].flatMap((se) => [
      se,
      ...resolvePathSpellings(se, cwd),
    ]),
    ...S,
    ...(await orderLocalRootsFirst(await checkSessionTempRoot(cwd), cwd)),
    ...h,
  ]);
  let R = async (se, re) => {
    if (hasDotDotSegment(re)) return true;
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(re, cwd),
      cwd,
      protectedHomeRoots(),
    );
    if (foreignSpelling.verdict !== "local") return true;
    let realPathLoose = resolveRealPathLoose(foreignSpelling.spelling, cwd);
    return (
      realPathLoose === null || se.some((ce) => isPathInside_2(ce, re) || isPathInside_2(ce, realPathLoose))
    );
  };
  let x = (se) => R(w, se);
  let P = (se) => findHeldCheckout(se, cwd);
  let j = async (includePaths) => {
    for (let re of includePaths) if (await x(re)) return re;
    return;
  };
  let gitEnv = buildGitEnv(undefined);
  let L = 0;
  let q = async (includes, re, he) => {
    for (let Se of includes) {
      let match = /^%\(prefix\)\/(.*)$/s.exec(Se);
      if (match !== null && !isAbsolute(match[1] ?? "") && Se.split(/[/\\]/).includes(".."))
        return "includes";
      let we = match !== null && isAbsolute(match[1] ?? "") ? (match[1] ?? Se) : Se;
      let includePaths = resolveIncludePaths(we, re, cwd);
      if (
        includePaths.some(
          (includePath) => includePath.includes("\uFFFD") || isWindowsNonDrivePath(includePath),
        )
      )
        return "unread";
      if ((await j(includePaths)) !== undefined) return "includes";
      for (let includePath of includePaths) {
        let Ie = await P(includePath);
        if (Ie?.kind === "unvouched") return "unread";
        if (Ie !== null)
          return {
            kind: "config_in_checkout",
            checkout: Ie.checkout,
          };
      }
      for (let includePath of includePaths) {
        L++;
        if (he >= MAX_INCLUDE_DEPTH || L > MAX_INCLUDE_FILES) return "unread";
        let gitConfigFile = await readGitConfigFile(includePath, true);
        if (gitConfigFile.kind === "unread") return "unread";
        if (gitConfigFile.kind === "shared") return "second_name";
        if (gitConfigFile.kind === "read") {
          let ke = Z(gitConfigFile);
          if (ke !== "clear") return ke;
          let Me = await q(gitConfigFile.includes, `file:${includePath}`, he + 1);
          if (Me !== "clear") return Me;
        }
      }
    }
    return "clear";
  };
  let Q = (se, file) =>
    typeof se === "string"
      ? {
          kind: se,
          file,
        }
      : {
          kind: "config_in_checkout",
          file,
          checkout: se.checkout,
        };
  let Z = (gitConfigFile) =>
    gitConfigFile.coreWorktree
      ? "work_tree"
      : r && gitConfigFile.worktreeConfigOn
        ? "worktree_config"
        : "clear";
  let gitConfigFromEnv = readGitConfigFromEnv(gitEnv);
  if (gitConfigFromEnv === null)
    return {
      kind: "unread",
      file: LAUNCH_ENV_CONFIG_NOTE,
    };
  for (let { key, value: envVar } of gitConfigFromEnv) {
    let lower = key.toLowerCase();
    if (lower === "core.worktree")
      return {
        kind: "work_tree",
        file: LAUNCH_ENV_CONFIG_NOTE,
      };
    if (r && lower === "extensions.worktreeconfig" && (envVar === undefined || isEnvDefinedFalsy(envVar)))
      return {
        kind: "worktree_config",
        file: LAUNCH_ENV_CONFIG_NOTE,
      };
    if (inTreeConfigFileKeys(lower) && envVar !== undefined) {
      let Se = await q([envVar], "command line:", 0);
      if (Se !== "clear") return Q(Se, LAUNCH_ENV_CONFIG_NOTE);
    }
  }
  let ae = uniq(getGitConfigPaths([], cwd, null, gitEnv));
  for (let se of ae) {
    if (se.includes("\uFFFD") || isWindowsNonDrivePath(se))
      return {
        kind: "unread",
        file: se,
      };
    if (s.length > 0 && (await R(h, se)))
      return {
        kind: "home_checkout",
        file: se,
        checkout: s[0],
      };
    if (await x(se))
      return {
        kind: "includes",
        file: se,
      };
    let re = await P(se);
    if (re?.kind === "unvouched")
      return {
        kind: "unread",
        file: se,
      };
    if (re !== null)
      return {
        kind: "config_in_checkout",
        file: se,
        checkout: re.checkout,
      };
    if (resolveRealPathLoose(se, cwd) === se && (await readInTreeConfig(se))) continue;
    let gitConfigFile = await readGitConfigFile(se, true);
    if (gitConfigFile.kind === "device") continue;
    if (gitConfigFile.kind === "unread")
      return {
        kind: "unread",
        file: se,
      };
    if (gitConfigFile.kind === "shared")
      return {
        kind: "second_name",
        file: se,
      };
    if (gitConfigFile.kind === "read") {
      let Se = Z(gitConfigFile);
      if (Se !== "clear")
        return {
          kind: Se,
          file: se,
        };
      let ce = await q(gitConfigFile.includes, `file:${se}`, 0);
      if (ce !== "clear") return Q(ce, se);
    }
  }
  return {
    kind: "clear",
  };
}
//@ chunk-s61vbvea.js:270729-270782 placement
/**
 * 说明这些配置来自启动环境的提示文本，以及 include 深度上限。
 */
var LAUNCH_ENV_CONFIG_NOTE = "the launch environment (GIT_CONFIG_*)";
var MAX_INCLUDE_DEPTH = 4;
//@ chunk-s61vbvea.js:270782-270872 placement
/**
 * 判断配置键是否为 include.path / includeIf.*.path。
 */
function inTreeConfigFileKeys(e) {
  return e === "include.path" || (e.startsWith("includeif.") && e.endsWith(".path"));
}
//@ chunk-s61vbvea.js:270872-271267 placement
/**
 * 解析 GIT_CONFIG_COUNT/KEY_n/VALUE_n 与 GIT_CONFIG_PARAMETERS。
 */
function readGitConfigFromEnv(e) {
  let n = [];
  let envCaseInsensitive = getEnvCaseInsensitive(e, "GIT_CONFIG_COUNT");
  if (envCaseInsensitive !== undefined && envCaseInsensitive !== "") {
    if (!/^\d+$/.test(envCaseInsensitive.trim())) return null;
    for (let j = 0; j < Number(envCaseInsensitive); j++) {
      let envCaseInsensitive = getEnvCaseInsensitive(e, `GIT_CONFIG_KEY_${j}`);
      let envCaseInsensitive_2 = getEnvCaseInsensitive(e, `GIT_CONFIG_VALUE_${j}`);
      if (envCaseInsensitive === undefined || envCaseInsensitive_2 === undefined) return null;
      n.push({
        key: envCaseInsensitive,
        value: envCaseInsensitive_2,
      });
    }
  }
  let envCaseInsensitive_2 = getEnvCaseInsensitive(e, "GIT_CONFIG_PARAMETERS");
  if (envCaseInsensitive_2 !== undefined && envCaseInsensitive_2.trim() !== "") {
    let gitConfigParameters = parseGitConfigParameters(envCaseInsensitive_2);
    if (gitConfigParameters === null) return null;
    n.push(...gitConfigParameters);
  }
  return n;
}
//@ chunk-s61vbvea.js:271267-271516 placement
async function orderLocalRootsFirst(e, n) {
  let results = await Promise.all(
    e.map(async (s) => ({
      root: s,
      local:
        (await resolveForeignSpellingAsync(await classifyPathSpelling_3(s, n), n, protectedHomeRoots()))
          .verdict === "local",
    })),
  );
  return [
    ...(await dropSpecialFiles(results.filter(({ local }) => local).map(({ root }) => root))),
    ...results.filter(({ local }) => !local).map(({ root }) => root),
  ];
}
//@ chunk-s61vbvea.js:271516-271727 placement
async function dropSpecialFiles(e) {
  return (
    await Promise.all(
      e.map(async (r) => {
        if (!isAbsolute(r)) return null;
        try {
          let s = await lstat(r);
          return s.isCharacterDevice() || s.isFIFO() || s.isSocket() ? null : r;
        } catch {
          return r;
        }
      }),
    )
  ).filter((r) => r !== null);
}
//@ chunk-s61vbvea.js:271727-271746 placement
var CONFIG_VALUE_WHITESPACE_RE = /[ \t\n\r]/;
//@ chunk-s61vbvea.js:271746-272399 placement
/**
 * 解析 GIT_CONFIG_PARAMETERS 的单引号键值列表。
 */
function parseGitConfigParameters(envCaseInsensitive) {
  let n = [];
  let r = 0;
  let s = () => {
    if (envCaseInsensitive[r] !== "'") return null;
    let h = "";
    r++;
    for (;;) {
      let index = envCaseInsensitive.indexOf("'", r);
      if (index === -1) return null;
      h += envCaseInsensitive.slice(r, index);
      r = index + 1;
      if (
        envCaseInsensitive[r] === "\\" &&
        r + 2 < envCaseInsensitive.length &&
        envCaseInsensitive[r + 2] === "'"
      ) {
        h += envCaseInsensitive[r + 1];
        r += 3;
        continue;
      }
      return h;
    }
  };
  while (r < envCaseInsensitive.length) {
    while (r < envCaseInsensitive.length && CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[r] ?? "")) r++;
    if (r >= envCaseInsensitive.length) break;
    let h = s();
    if (h === null) return null;
    if (envCaseInsensitive[r] === "=") {
      r++;
      if (r >= envCaseInsensitive.length || CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[r] ?? "")) {
        n.push({
          key: h,
          value: undefined,
        });
        continue;
      }
      let y = s();
      if (y === null) return null;
      n.push({
        key: h,
        value: y,
      });
    } else {
      let index = h.indexOf("=");
      n.push(
        index === -1
          ? {
              key: h,
              value: undefined,
            }
          : {
              key: h.slice(0, index).trim(),
              value: h.slice(index + 1),
            },
      );
    }
    if (r < envCaseInsensitive.length && !CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[r] ?? ""))
      return null;
  }
  return n;
}
//@ chunk-s61vbvea.js:272399-272480 placement
async function readInTreeConfig(e) {
  try {
    return (await lstat(e)).isCharacterDevice();
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:272480-273100 placement
async function readGitConfigFile(e, n) {
  let r;
  try {
    if (!n && getPlatform_2() === "windows" && !(await lstat(e)).isFile())
      return {
        kind: "unread",
      };
    r = await open(e, n ? constants.O_RDONLY | OPEN_CONFIG_FLAGS() : readOnlyNoFollowFlags());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
      ? {
          kind: "absent",
        }
      : {
          kind: "unread",
        };
  }
  try {
    let stats = await r.stat();
    if (stats.isCharacterDevice())
      return {
        kind: "device",
      };
    if (!stats.isFile() || stats.size > MAX_CONFIG_WALK_BYTES)
      return {
        kind: "unread",
      };
    if (await isWritableSharedFile(e, stats))
      return {
        kind: "shared",
      };
    let h = Buffer.alloc(stats.size);
    let { bytesRead } = await r.read(h, 0, stats.size, 0);
    if (bytesRead !== stats.size)
      return {
        kind: "unread",
      };
    let str = h.toString("utf8");
    return hasNulByte(str)
      ? {
          kind: "unread",
        }
      : auditWorktreeConfigKeys(str);
  } catch {
    return {
      kind: "unread",
    };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-s61vbvea.js:273100-273153 placement
function OPEN_CONFIG_FLAGS() {
  return getPlatform_2() === "windows" ? 0 : constants.O_NONBLOCK;
}
//@ chunk-s61vbvea.js:273153-273767 placement
function auditWorktreeConfigKeys(e) {
  let n = [];
  let hasInclude = false;
  let coreWorktree = false;
  let worktreeConfigOn = false;
  let saysBare = false;
  let S = true;
  let w = false;
  parseGitConfig(
    e,
    {
      header(R) {
        hasInclude ||= includesConfigKey(R.name);
        S &&= R.name === "core" && !R.quoted;
      },
      entry(R, x, envVar) {
        S &&= R?.name === "core" && !R.quoted && KNOWN_SAFE_EXTENSIONS.has(x);
        if (R === null) return;
        if (includesConfigKey(R.name) && x === "path")
          if (envVar === undefined) w = true;
          else n.push(envVar);
        if (R.name === "core" && !R.quoted && x === "worktree") coreWorktree = true;
        if (R.name === "extensions" && !R.quoted && x === "worktreeconfig")
          worktreeConfigOn = envVar === undefined || isEnvDefinedFalsy(envVar);
        if (R.name === "core" && !R.quoted && x === "bare")
          saysBare ||= envVar === undefined || isEnvDefinedFalsy(envVar);
      },
      malformed() {
        w = true;
      },
    },
    {
      maxLines: 1 / 0,
    },
  );
  return w
    ? {
        kind: "unread",
      }
    : {
        kind: "read",
        includes: n,
        hasInclude,
        coreWorktree,
        worktreeConfigOn,
        saysBare,
        inertWorktreeKeysOnly: S,
      };
}
//@ chunk-s61vbvea.js:273767-273826 placement
var KNOWN_SAFE_EXTENSIONS = new Set(["hookspath", "untrackedcache", "longpaths"]);
//@ chunk-s61vbvea.js:273826-273947 placement = isEnvDefinedFalsy (1)
function isEnvDefinedFalsy(envVar) {
  let lower = envVar.trim().toLowerCase();
  return !(["false", "no", "off", ""].includes(lower) || /^[-+]?(0x)?0+[kmg]?$/.test(lower));
}
//@ chunk-s61vbvea.js:273947-274016 placement
function includesConfigKey(name) {
  let n = firstLineOf(name, ".");
  return n === "include" || n === "includeif";
}
export {
  readInTreeGitConfig,
  LAUNCH_ENV_CONFIG_NOTE,
  readGitConfigFromEnv,
  inTreeConfigFileKeys,
  readGitConfigFile,
};
