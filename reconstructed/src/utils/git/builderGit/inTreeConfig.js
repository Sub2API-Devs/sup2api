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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:267395-270729 placement
/**
 * 读取检出内的 git 配置与 config.worktree，判断能否安全使用
 */
async function readInTreeGitConfig(repository, cwd, allowWorktreeConfig) {
  for (let name of ["config", "config.worktree"]) {
    let configPath = join(repository, name);
    let gitConfigFile = await readGitConfigFile(configPath, false);
    if (gitConfigFile.kind === "unread")
      return {
        kind: "unread",
        file: configPath,
      };
    if (gitConfigFile.kind === "shared")
      return {
        kind: "second_name",
        file: configPath,
      };
    if (gitConfigFile.kind === "read" && gitConfigFile.hasInclude)
      return {
        kind: "includes",
        file: configPath,
      };
    if (gitConfigFile.kind === "read" && gitConfigFile.coreWorktree)
      return {
        kind: "work_tree",
        file: configPath,
      };
    if (gitConfigFile.kind === "read" && allowWorktreeConfig && gitConfigFile.worktreeConfigOn)
      return {
        kind: "worktree_config",
        file: configPath,
      };
  }
  let ancestors = repoAncestorsBelowHome(cwd);
  let homePaths =
    ancestors.length === 0
      ? []
      : uniq([homedir(), ...ancestors].flatMap((dir) => [dir, ...resolvePathSpellings(dir, cwd)]));
  let repoSettingsReachRoots = collectRepoSettingsReachRoots(cwd);
  if (repoSettingsReachRoots === "unreadable")
    return {
      kind: "settings_unreadable",
      file: join(cwd, ".claude"),
    };
  let settingsRoots = (
    await Promise.all(
      uniq([...settingsReachRoots(cwd), ...repoSettingsReachRoots]).map(async (root) => {
        let foreignSpelling = await resolveForeignSpellingAsync(
          await classifyPathSpelling_3(root, cwd),
          cwd,
          protectedHomeRoots(),
        );
        return foreignSpelling.verdict === "local"
          ? await dropSpecialFiles(
              uniq([root, foreignSpelling.spelling, ...resolvePathSpellings(foreignSpelling.spelling, cwd)]),
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
  let roots = uniq([
    ...[cwd, repository, checkoutDirOfGitDir(repository)].flatMap((dir) => [
      dir,
      ...resolvePathSpellings(dir, cwd),
    ]),
    ...settingsRoots,
    ...(await orderLocalRootsFirst(await checkSessionTempRoot(cwd), cwd)),
    ...homePaths,
  ]);
  let isRootUnsafe = async (roots, includePath) => {
    if (hasDotDotSegment(includePath)) return true;
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(includePath, cwd),
      cwd,
      protectedHomeRoots(),
    );
    if (foreignSpelling.verdict !== "local") return true;
    let realPathLoose = resolveRealPathLoose(foreignSpelling.spelling, cwd);
    return (
      realPathLoose === null ||
      roots.some((root) => isPathInside_2(root, includePath) || isPathInside_2(root, realPathLoose))
    );
  };
  let isCovered = (includePath) => isRootUnsafe(roots, includePath);
  let findCheckout = (includePath) => findHeldCheckout(includePath, cwd);
  let firstCovered = async (includePaths) => {
    for (let includePath of includePaths) if (await isCovered(includePath)) return includePath;
    return;
  };
  let env = buildGitEnv(undefined);
  let includeCount = 0;
  let scanIncludes = async (includes, includes_2, depth) => {
    for (let includeValue of includes) {
      let match = /^%\(prefix\)\/(.*)$/s.exec(includeValue);
      if (match !== null && !isAbsolute(match[1] ?? "") && includeValue.split(/[/\\]/).includes(".."))
        return "includes";
      let expanded = match !== null && isAbsolute(match[1] ?? "") ? (match[1] ?? includeValue) : includeValue;
      let includePaths = resolveIncludePaths(expanded, includes_2, cwd);
      if (
        includePaths.some(
          (includePath) => includePath.includes("\uFFFD") || isWindowsNonDrivePath(includePath),
        )
      )
        return "unread";
      if ((await firstCovered(includePaths)) !== undefined) return "includes";
      for (let includePath of includePaths) {
        let checkout = await findCheckout(includePath);
        if (checkout?.kind === "unvouched") return "unread";
        if (checkout !== null)
          return {
            kind: "config_in_checkout",
            checkout: checkout.checkout,
          };
      }
      for (let includePath of includePaths) {
        includeCount++;
        if (depth >= MAX_INCLUDE_DEPTH || includeCount > MAX_INCLUDE_FILES) return "unread";
        let gitConfigFile = await readGitConfigFile(includePath, true);
        if (gitConfigFile.kind === "unread") return "unread";
        if (gitConfigFile.kind === "shared") return "second_name";
        if (gitConfigFile.kind === "read") {
          let hazard = classifyHazard(gitConfigFile);
          if (hazard !== "clear") return hazard;
          let nested = await scanIncludes(gitConfigFile.includes, `file:${includePath}`, depth + 1);
          if (nested !== "clear") return nested;
        }
      }
    }
    return "clear";
  };
  let resultFor = (kind, file) =>
    typeof kind === "string"
      ? {
          kind,
          file,
        }
      : {
          kind: "config_in_checkout",
          file,
          checkout: kind.checkout,
        };
  let classifyHazard = (gitConfigFile) =>
    gitConfigFile.coreWorktree
      ? "work_tree"
      : allowWorktreeConfig && gitConfigFile.worktreeConfigOn
        ? "worktree_config"
        : "clear";
  let gitConfigFromEnv = readGitConfigFromEnv(env);
  if (gitConfigFromEnv === null)
    return {
      kind: "unread",
      file: LAUNCH_ENV_CONFIG_NOTE,
    };
  for (let { key, value: envVar } of gitConfigFromEnv) {
    let key_2 = key.toLowerCase();
    if (key_2 === "core.worktree")
      return {
        kind: "work_tree",
        file: LAUNCH_ENV_CONFIG_NOTE,
      };
    if (
      allowWorktreeConfig &&
      key_2 === "extensions.worktreeconfig" &&
      (envVar === undefined || isEnvDefinedFalsy(envVar))
    )
      return {
        kind: "worktree_config",
        file: LAUNCH_ENV_CONFIG_NOTE,
      };
    if (inTreeConfigFileKeys(key_2) && envVar !== undefined) {
      let result = await scanIncludes([envVar], "command line:", 0);
      if (result !== "clear") return resultFor(result, LAUNCH_ENV_CONFIG_NOTE);
    }
  }
  let configPaths = uniq(getGitConfigPaths([], cwd, null, env));
  for (let configPath of configPaths) {
    if (configPath.includes("\uFFFD") || isWindowsNonDrivePath(configPath))
      return {
        kind: "unread",
        file: configPath,
      };
    if (ancestors.length > 0 && (await isRootUnsafe(homePaths, configPath)))
      return {
        kind: "home_checkout",
        file: configPath,
        checkout: ancestors[0],
      };
    if (await isCovered(configPath))
      return {
        kind: "includes",
        file: configPath,
      };
    let checkout = await findCheckout(configPath);
    if (checkout?.kind === "unvouched")
      return {
        kind: "unread",
        file: configPath,
      };
    if (checkout !== null)
      return {
        kind: "config_in_checkout",
        file: configPath,
        checkout: checkout.checkout,
      };
    if (resolveRealPathLoose(configPath, cwd) === configPath && (await readInTreeConfig(configPath)))
      continue;
    let gitConfigFile = await readGitConfigFile(configPath, true);
    if (gitConfigFile.kind === "device") continue;
    if (gitConfigFile.kind === "unread")
      return {
        kind: "unread",
        file: configPath,
      };
    if (gitConfigFile.kind === "shared")
      return {
        kind: "second_name",
        file: configPath,
      };
    if (gitConfigFile.kind === "read") {
      let hazard = classifyHazard(gitConfigFile);
      if (hazard !== "clear")
        return {
          kind: hazard,
          file: configPath,
        };
      let nested = await scanIncludes(gitConfigFile.includes, `file:${configPath}`, 0);
      if (nested !== "clear") return resultFor(nested, configPath);
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
function inTreeConfigFileKeys(key) {
  return key === "include.path" || (key.startsWith("includeif.") && key.endsWith(".path"));
}
//@ chunk-s61vbvea.js:270872-271267 placement
/**
 * 解析 GIT_CONFIG_COUNT/KEY_n/VALUE_n 与 GIT_CONFIG_PARAMETERS。
 */
function readGitConfigFromEnv(env) {
  let pairs = [];
  let envCaseInsensitive = getEnvCaseInsensitive(env, "GIT_CONFIG_COUNT");
  if (envCaseInsensitive !== undefined && envCaseInsensitive !== "") {
    if (!/^\d+$/.test(envCaseInsensitive.trim())) return null;
    for (let j = 0; j < Number(envCaseInsensitive); j++) {
      let envCaseInsensitive = getEnvCaseInsensitive(env, `GIT_CONFIG_KEY_${j}`);
      let envCaseInsensitive_2 = getEnvCaseInsensitive(env, `GIT_CONFIG_VALUE_${j}`);
      if (envCaseInsensitive === undefined || envCaseInsensitive_2 === undefined) return null;
      pairs.push({
        key: envCaseInsensitive,
        value: envCaseInsensitive_2,
      });
    }
  }
  let envCaseInsensitive_2 = getEnvCaseInsensitive(env, "GIT_CONFIG_PARAMETERS");
  if (envCaseInsensitive_2 !== undefined && envCaseInsensitive_2.trim() !== "") {
    let gitConfigParameters = parseGitConfigParameters(envCaseInsensitive_2);
    if (gitConfigParameters === null) return null;
    pairs.push(...gitConfigParameters);
  }
  return pairs;
}
//@ chunk-s61vbvea.js:271267-271516 placement
async function orderLocalRootsFirst(roots, launchDir) {
  let results = await Promise.all(
    roots.map(async (root) => ({
      root,
      local:
        (
          await resolveForeignSpellingAsync(
            await classifyPathSpelling_3(root, launchDir),
            launchDir,
            protectedHomeRoots(),
          )
        ).verdict === "local",
    })),
  );
  return [
    ...(await dropSpecialFiles(results.filter(({ local }) => local).map(({ root }) => root))),
    ...results.filter(({ local }) => !local).map(({ root }) => root),
  ];
}
//@ chunk-s61vbvea.js:271516-271727 placement
async function dropSpecialFiles(paths) {
  return (
    await Promise.all(
      paths.map(async (path) => {
        if (!isAbsolute(path)) return null;
        try {
          let stats = await lstat(path);
          return stats.isCharacterDevice() || stats.isFIFO() || stats.isSocket() ? null : path;
        } catch {
          return path;
        }
      }),
    )
  ).filter((path) => path !== null);
}
//@ chunk-s61vbvea.js:271727-271746 placement
var CONFIG_VALUE_WHITESPACE_RE = /[ \t\n\r]/;
//@ chunk-s61vbvea.js:271746-272399 placement
/**
 * 解析 GIT_CONFIG_PARAMETERS 的单引号键值列表。
 */
function parseGitConfigParameters(envCaseInsensitive) {
  let pairs = [];
  let pos = 0;
  let readQuoted = () => {
    if (envCaseInsensitive[pos] !== "'") return null;
    let quoted = "";
    pos++;
    for (;;) {
      let index = envCaseInsensitive.indexOf("'", pos);
      if (index === -1) return null;
      quoted += envCaseInsensitive.slice(pos, index);
      pos = index + 1;
      if (
        envCaseInsensitive[pos] === "\\" &&
        pos + 2 < envCaseInsensitive.length &&
        envCaseInsensitive[pos + 2] === "'"
      ) {
        quoted += envCaseInsensitive[pos + 1];
        pos += 3;
        continue;
      }
      return quoted;
    }
  };
  while (pos < envCaseInsensitive.length) {
    while (pos < envCaseInsensitive.length && CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[pos] ?? ""))
      pos++;
    if (pos >= envCaseInsensitive.length) break;
    let key = readQuoted();
    if (key === null) return null;
    if (envCaseInsensitive[pos] === "=") {
      pos++;
      if (
        pos >= envCaseInsensitive.length ||
        CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[pos] ?? "")
      ) {
        pairs.push({
          key,
          value: undefined,
        });
        continue;
      }
      let value = readQuoted();
      if (value === null) return null;
      pairs.push({
        key,
        value,
      });
    } else {
      let index = key.indexOf("=");
      pairs.push(
        index === -1
          ? {
              key,
              value: undefined,
            }
          : {
              key: key.slice(0, index).trim(),
              value: key.slice(index + 1),
            },
      );
    }
    if (pos < envCaseInsensitive.length && !CONFIG_VALUE_WHITESPACE_RE.test(envCaseInsensitive[pos] ?? ""))
      return null;
  }
  return pairs;
}
//@ chunk-s61vbvea.js:272399-272480 placement
async function readInTreeConfig(filePath) {
  try {
    return (await lstat(filePath)).isCharacterDevice();
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:272480-273100 placement
async function readGitConfigFile(filePath, followLink) {
  let handle;
  try {
    if (!followLink && getPlatform_2() === "windows" && !(await lstat(filePath)).isFile())
      return {
        kind: "unread",
      };
    handle = await open(
      filePath,
      followLink ? constants.O_RDONLY | OPEN_CONFIG_FLAGS() : readOnlyNoFollowFlags(),
    );
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
    let stats = await handle.stat();
    if (stats.isCharacterDevice())
      return {
        kind: "device",
      };
    if (!stats.isFile() || stats.size > MAX_CONFIG_WALK_BYTES)
      return {
        kind: "unread",
      };
    if (await isWritableSharedFile(filePath, stats))
      return {
        kind: "shared",
      };
    let buffer = Buffer.alloc(stats.size);
    let { bytesRead } = await handle.read(buffer, 0, stats.size, 0);
    if (bytesRead !== stats.size)
      return {
        kind: "unread",
      };
    let text = buffer.toString("utf8");
    return hasNulByte(text)
      ? {
          kind: "unread",
        }
      : auditWorktreeConfigKeys(text);
  } catch {
    return {
      kind: "unread",
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-s61vbvea.js:273100-273153 placement
function OPEN_CONFIG_FLAGS() {
  return getPlatform_2() === "windows" ? 0 : constants.O_NONBLOCK;
}
//@ chunk-s61vbvea.js:273153-273767 placement
function auditWorktreeConfigKeys(text) {
  let includes = [];
  let hasInclude = false;
  let coreWorktree = false;
  let worktreeConfigOn = false;
  let saysBare = false;
  let inertKeysOnly = true;
  let malformed = false;
  parseGitConfig(
    text,
    {
      header(section) {
        hasInclude ||= includesConfigKey(section.name);
        inertKeysOnly &&= section.name === "core" && !section.quoted;
      },
      entry(section, key, envVar) {
        inertKeysOnly &&= section?.name === "core" && !section.quoted && KNOWN_SAFE_EXTENSIONS.has(key);
        if (section === null) return;
        if (includesConfigKey(section.name) && key === "path")
          if (envVar === undefined) malformed = true;
          else includes.push(envVar);
        if (section.name === "core" && !section.quoted && key === "worktree") coreWorktree = true;
        if (section.name === "extensions" && !section.quoted && key === "worktreeconfig")
          worktreeConfigOn = envVar === undefined || isEnvDefinedFalsy(envVar);
        if (section.name === "core" && !section.quoted && key === "bare")
          saysBare ||= envVar === undefined || isEnvDefinedFalsy(envVar);
      },
      malformed() {
        malformed = true;
      },
    },
    {
      maxLines: 1 / 0,
    },
  );
  return malformed
    ? {
        kind: "unread",
      }
    : {
        kind: "read",
        includes,
        hasInclude,
        coreWorktree,
        worktreeConfigOn,
        saysBare,
        inertWorktreeKeysOnly: inertKeysOnly,
      };
}
//@ chunk-s61vbvea.js:273767-273826 placement
var KNOWN_SAFE_EXTENSIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:273767", () => {
  KNOWN_SAFE_EXTENSIONS = new Set(["hookspath", "untrackedcache", "longpaths"]);
});
//@ chunk-s61vbvea.js:273826-273947 placement = isEnvDefinedFalsy (1)
function isEnvDefinedFalsy(envVar) {
  let lower = envVar.trim().toLowerCase();
  return !(["false", "no", "off", ""].includes(lower) || /^[-+]?(0x)?0+[kmg]?$/.test(lower));
}
//@ chunk-s61vbvea.js:273947-274016 placement
function includesConfigKey(name) {
  let firstPart = firstLineOf(name, ".");
  return firstPart === "include" || firstPart === "includeif";
}
export {
  readInTreeGitConfig,
  LAUNCH_ENV_CONFIG_NOTE,
  readGitConfigFromEnv,
  inTreeConfigFileKeys,
  readGitConfigFile,
};
