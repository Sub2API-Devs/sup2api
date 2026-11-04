/**
 * utils/permissions/claudeStatePaths.ts
 *
 * 2.1.316 新增：Claude 自身状态路径模式（防止被工具改写）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9ncz9ams.js (22), chunk-cdz6g143.js (1)
 * attribution: placement 23
 */
import { dirname, join, basename, sep, isAbsolute } from "path";
import { homedir, tmpdir } from "os";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { keychainProjectDirs } from "../secureStorage/macOsKeychainHelpers.js";
import { getDeviceKeysFilePath, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "../auth.js";
import { getGlobalClaudeFile, mapped, LEGACY_CONFIG_JSON, getDefaultGlobalClaudeFile, env } from "../env.js";
import { toStringExport } from "../../../vendor/lodash-es/toString.js";
import { uniq } from "../collections.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../../services/remoteManagedSettings/consentRecords.js";
import {
  HELPER_CONSENT_STATE_ID,
  SETTINGS_FILENAME,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { POLICY_LIMITS_CACHE_FILENAME } from "../../services/policyLimits/policyState.js";
import { isDiskless } from "../hostScoped.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  daemonControlKeyFile,
  daemonPipeKeyFile,
  daemonRosterFile,
  daemonAuthDir,
  daemonDispatchDir,
} from "../../services/daemon/paths.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { getPlatform } from "../platform.js";
import { getSessionsDir } from "../sessionRecords.js";
import { getLatchedPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { escapeRuleContent } from "./permissionRuleParser.js";
import { toPosixPath, matchingRuleForInput } from "./filesystem.js";
import { expandPath } from "../path.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cdz6g143.js:632-772 placement
/**
 * Claude 状态文件路径（全局配置、旧配置、凭证、设备密钥）。
 */
function claudeStateFilePaths() {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let keychainDirs = keychainProjectDirs();
  if (claudeConfigDirOrNull === null || keychainDirs === null) return [getDeviceKeysFilePath()];
  let configDir = dirname(getGlobalClaudeFile());
  return [
    ...mapped.map((relativeStatePath) => join(configDir, relativeStatePath)),
    join(claudeConfigDirOrNull, LEGACY_CONFIG_JSON),
    join(keychainDirs, CREDENTIALS_FILE_NAME),
    getDeviceKeysFilePath(),
  ];
}
//@ chunk-9ncz9ams.js:1126-1173 placement
var REGEX_SPECIAL_CHARS_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REGEX_SPECIAL_CHARS_PROBE;
deferInit("chunk-9ncz9ams.js:1126", () => {
  REGEX_SPECIAL_CHARS_RE = /[\\^$.*+?()[\]{}|]/g;
  REGEX_SPECIAL_CHARS_PROBE = RegExp(REGEX_SPECIAL_CHARS_RE.source);
});
//@ chunk-9ncz9ams.js:1173-1238 placement (2.1.88 match: urlPatternToRegex, 1)
function urlPatternToRegex(pattern) {
  pattern = toStringExport(pattern);
  return pattern && REGEX_SPECIAL_CHARS_PROBE.test(pattern)
    ? pattern.replace(REGEX_SPECIAL_CHARS_RE, "\\$&")
    : pattern;
}
//@ chunk-9ncz9ams.js:1238-1246 placement
var urlPatternToRegexCached = urlPatternToRegex;
//@ chunk-9ncz9ams.js:1246-1322 placement (2.1.88 match: isInGlobalClaudeFolder, 1)
function getClaudeConfigDirs() {
  return uniq(
    [getClaudeConfigDirOrNull(), join(homedir(), ".claude"), keychainProjectDirs()].filter(
      (dir) => dir !== null,
    ),
  );
}
//@ chunk-9ncz9ams.js:1322-1348 placement
var CLAUDE_STATE_FILENAMES; // deferred: uses REMOTE_SETTINGS_CONSENT_FILE (../../services/remoteManagedSettings/consentRecords.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9ncz9ams.js:1322", () => {
  CLAUDE_STATE_FILENAMES = [
    REMOTE_SETTINGS_CONSENT_FILE,
    HELPER_CONSENT_STATE_ID,
    SETTINGS_FILENAME,
    POLICY_LIMITS_CACHE_FILENAME,
  ];
});
//@ chunk-9ncz9ams.js:1348-1551 placement
function claudeStatePathsCacheKey() {
  return [
    homedir(),
    getClaudeConfigDirOrNull() ?? "",
    keychainProjectDirs() ?? "",
    ...(isDiskless() ? ["", ""] : [getDefaultGlobalClaudeFile(), getGlobalClaudeFile()]),
    env.CLAUDE_CODE_HOST_CREDS_FILE ?? "",
    env.TMPDIR ?? "",
    ...(isDiskless() ? [readLatchedEnv("TMPDIR") ?? ""] : []),
    readLatchedEnv("APPDATA") ?? "",
    readLatchedEnv("LOCALAPPDATA") ?? "",
  ].join("\x00");
}
//@ chunk-9ncz9ams.js:1551-3381 placement
/**
 * Claude 自身状态文件/目录（配置目录、全局配置、设置、策略缓存等）的路径模式集合，用于防止工具改写。
 */
var claudeStatePathPatterns; // deferred: uses getClaudeConfigDirs of its import cycle while loading; runs once the cycle is complete
var claudeStateGlobPatterns;
var claudeStateGlobEntries;
var claudeStateGlobEntriesExact;
deferInit("chunk-9ncz9ams.js:1551", () => {
  claudeStatePathPatterns = memoizeAlias(() => {
    let claudeConfigDirs = getClaudeConfigDirs();
    let homeDirs = uniq([...(isDiskless() ? [] : [dirname(getDefaultGlobalClaudeFile())]), homedir()]);
    return withPathAliases([
      ...claudeStateFilePaths(),
      ...claudeConfigDirs.flatMap((claudeConfigDir) => [
        join(claudeConfigDir, CREDENTIALS_FILE_NAME),
        join(claudeConfigDir, DEVICE_KEYS_FILE_NAME),
      ]),
      ...homeDirs.flatMap((baseDir) => mapped.map((relPath) => join(baseDir, relPath))),
      ...claudeConfigDirs.map((claudeConfigDir) => join(claudeConfigDir, LEGACY_CONFIG_JSON)),
      ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [stripTrailingSlashes(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
    ]);
  }, claudeStatePathsCacheKey);
  claudeStateGlobPatterns = memoizeAlias(() => {
    let tempRoots = withPathAliases(getTempRootDirs());
    let patterns = [
      ...claudeStatePathPatterns(),
      ...withPathAliases([join(homedir(), ".claude", "state", "unattended-serving-consent.json")]),
      ...withPathAliases([join(homedir(), ".claude", "state", "settings-review.json")]),
      ...withPathAliases(
        getClaudeConfigDirs().flatMap((configDir) => [
          join(configDir, "state", "device-mcp-consent.json"),
          join(configDir, "state", "device-mcp-snapshot.json"),
        ]),
      ),
      ...withPathAliases(
        getClaudeConfigDirs().flatMap((configDir) =>
          CLAUDE_STATE_FILENAMES.map((fileName) => join(configDir, fileName)),
        ),
      ),
      ...withPathAliases(
        getClaudeConfigDirs().flatMap((configDir) => [
          daemonControlKeyFile(configDir),
          daemonPipeKeyFile(configDir),
          daemonRosterFile(configDir),
        ]),
      ),
    ];
    return uniqByExport(
      [
        ...patterns.flatMap((patternPath) => [
          ...editorBackupVariants(basename(patternPath)).flatMap((variant) => [
            {
              literal: join(dirname(patternPath), variant),
              tail: "",
              place: variant === basename(patternPath),
            },
            {
              literal: join(dirname(patternPath), variant),
              tail: ".*",
              place: false,
            },
          ]),
          ...tempFileVariants(basename(patternPath)).map((variant) => ({
            literal: dirname(patternPath),
            tail: `/${variant}`,
            place: false,
          })),
        ]),
        ...withPathAliases([
          ...getClaudeConfigDirs().flatMap((configDir) => [
            join(configDir, "backups"),
            daemonAuthDir(configDir),
            daemonDispatchDir(configDir),
            join(configDir, "state"),
          ]),
          join(homedir(), ".claude", "state", "served-calls"),
          ...(getPlatform() === "macos" ? [join(homedir(), "Library", "Keychains")] : []),
          ...(getPlatform() === "windows" ? getWindowsCredentialStoreDirs() : []),
        ]).map((literal) => ({
          literal,
          tail: "/**",
          place: true,
        })),
        ...withPathAliases(getClaudeConfigDirs().map((configDir) => getSessionsDir(configDir))).flatMap(
          (literal) => [
            ...editorBackupVariants("*.key").flatMap((variant) => [
              {
                literal,
                tail: `/${variant}`,
                place: variant === "*.key",
              },
              {
                literal,
                tail: `/${variant}.*`,
                place: false,
              },
            ]),
            ...tempFileVariants("*.key").map((variant) => ({
              literal,
              tail: `/${variant}`,
              place: false,
            })),
          ],
        ),
        ...tempRoots.map((literal) => ({
          literal,
          tail: "/claude-resume-*",
          place: true,
        })),
        ...(getPlatform() === "macos"
          ? withPathAliases(["/var/folders"]).map((literal) => ({
              literal,
              tail: "/*/*/*/claude-resume-*",
              place: true,
            }))
          : []),
        ...(isDiskless()
          ? tempRoots.flatMap((literal) => [
              {
                literal,
                tail: `/${CC_TENANT}*/.claude/**`,
                place: true,
              },
              {
                literal,
                tail: `/${CC_TENANT}*/*/claude-resume-*`,
                place: true,
              },
            ])
          : []),
      ],
      ({ literal, tail, place }) => `${literal}\x00${tail}\x00${place}`,
    );
  }, claudeStatePathsCacheKey);
  claudeStateGlobEntries = memoizeAlias(
    () => uniqueLiteralTailPatterns(claudeStateGlobPatterns()),
    claudeStatePathsCacheKey,
  );
  claudeStateGlobEntriesExact = memoizeAlias(() => {
    let filtered = claudeStateGlobPatterns().filter((entry) => entry.place);
    let mapped = filtered
      .filter((candidate) => candidate.tail === "/**")
      .map((matchingEntry) => `${matchingEntry.literal}${sep}`);
    return uniqueLiteralTailPatterns(
      filtered.filter((entry) => !mapped.some((prefix) => entry.literal.startsWith(prefix))),
    );
  }, claudeStatePathsCacheKey);
});
//@ chunk-9ncz9ams.js:3381-3493 placement
function uniqueLiteralTailPatterns(entries) {
  return uniqByExport(
    entries.map(({ literal, tail }) => ({
      literal,
      tail,
    })),
    ({ literal, tail }) => `${literal}\x00${tail}`,
  );
}
//@ chunk-9ncz9ams.js:3493-3726 placement
function getWindowsCredentialStoreDirs() {
  let { local, roaming } = getWindowsAppDataDirs();
  return uniq([
    ...local.flatMap((localDir) => [
      join(localDir, "Microsoft", "Credentials"),
      join(localDir, "Microsoft", "Vault"),
    ]),
    ...roaming.flatMap((roamingDir) => [
      join(roamingDir, "Microsoft", "Credentials"),
      join(roamingDir, "Microsoft", "Vault"),
      join(roamingDir, "Microsoft", "Protect"),
    ]),
  ]);
}
//@ chunk-9ncz9ams.js:3726-3918 placement
function getWindowsAppDataDirs() {
  return {
    local: uniq(
      [readLatchedEnv("LOCALAPPDATA"), join(homedir(), "AppData", "Local")].filter(
        (dir) => dir !== undefined && dir !== "",
      ),
    ),
    roaming: uniq(
      [readLatchedEnv("APPDATA"), join(homedir(), "AppData", "Roaming")].filter(
        (dir) => dir !== undefined && dir !== "",
      ),
    ),
  };
}
//@ chunk-9ncz9ams.js:3918-3971 placement
function readLatchedEnv(name) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  return latchedPreSettingsEnvSnapshot !== undefined ? latchedPreSettingsEnvSnapshot[name] : env[name];
}
//@ chunk-9ncz9ams.js:3971-4151 placement
function getTempRootDirs() {
  let roots = uniq(
    [tmpdir(), env.TMPDIR, ...(isDiskless() ? [readLatchedEnv("TMPDIR")] : []), "/tmp", "/var/tmp"]
      .filter((dir) => dir !== undefined && isAbsolute(dir))
      .map(stripTrailingSlashes),
  );
  return isDiskless()
    ? uniq(roots.map((dir) => (basename(dirname(dir)).startsWith(CC_TENANT) ? dirname(dirname(dir)) : dir)))
    : roots;
}
//@ chunk-9ncz9ams.js:4151-4170 placement
var CC_TENANT = "cc-tenant-";
//@ chunk-9ncz9ams.js:4170-4248 placement
function editorBackupVariants(name) {
  return [name, `.${name}`, `#${name}#`, `.#${name}`].flatMap((base) => [base, `${base}~`]);
}
//@ chunk-9ncz9ams.js:4248-4491 placement
function tempFileVariants(name) {
  let index = name.lastIndexOf(".");
  let stem = index === -1 ? name : name.slice(0, index);
  let extension = index === -1 ? "" : name.slice(index);
  return [
    ...["", ".", "#", ".#"].flatMap((prefix) => [
      `${prefix}${name}~*`,
      ...["BACKUP", "BASE", "LOCAL", "REMOTE"].map(
        (suffix) => `${prefix}${stem}_${suffix}_*${extension === "" ? "" : `${extension}*`}`,
      ),
    ]),
    `#${name}#~*`,
  ];
}
//@ chunk-9ncz9ams.js:4491-4545 placement
function withPathAliases(paths) {
  return uniq(paths.flatMap((path) => [path, ...getPathsForPermissionCheck(path)]));
}
//@ chunk-9ncz9ams.js:4545-5360 placement
function createRealpathCache(source) {
  let platform = getPlatform();
  let isLinuxLike = platform === "linux" || platform === "wsl";
  let realpathCache = new Map();
  function cachedRealpath(path) {
    if (!realpathCache.has(path)) realpathCache.set(path, source.realpathIfExists(path));
    return realpathCache.get(path);
  }
  let listingsCache = new Map();
  function expandDir(dir, pattern) {
    let names = listingsCache.get(dir);
    if (names === undefined) {
      names = source.namesIn(dir) ?? [];
      listingsCache.set(dir, names);
    }
    let regExp = new RegExp(`^${urlPatternToRegexCached(pattern).replaceAll("\\*", "[^/]*")}$`);
    return names.filter((name) => regExp.test(name)).map((name) => join(dir, name));
  }
  let configDirs = new Set(withPathAliases(getClaudeConfigDirs()).map(stripTrailingSlashes));
  let realpathRoots = new Set([...configDirs, ...withPathAliases([homedir()]).map(stripTrailingSlashes)]);
  let underConfigDirs = new Set(
    claudeStateGlobEntries()
      .filter(({ tail }) => tail === "/**")
      .flatMap(({ literal }) => [literal, dirname(literal)])
      .filter((literalPath) => configDirs.has(dirname(literalPath))),
  );
  return uniq(
    claudeStateGlobEntries().flatMap(({ literal, tail }) => {
      let parentDir = dirname(literal);
      let resolvedParent =
        cachedRealpath(parentDir) ??
        (underConfigDirs.has(parentDir)
          ? (((real) => real && join(real, basename(parentDir)))(cachedRealpath(dirname(parentDir))) ??
            undefined)
          : undefined);
      if (!resolvedParent) return [];
      let resolvedLiteral = join(resolvedParent, basename(literal));
      if (tail === "") return [cachedRealpath(resolvedLiteral) ?? resolvedLiteral];
      if (tail === "/**") return [`${resolvedLiteral}/`];
      let expanded = `${tail.startsWith("/") && realpathRoots.has(literal) ? (cachedRealpath(literal) ?? resolvedLiteral) : resolvedLiteral}${tail}`;
      if (!isLinuxLike) return [expanded];
      let expandedParent = dirname(expanded);
      return expandDir(cachedRealpath(expandedParent) ?? expandedParent, basename(expanded));
    }),
  );
}
//@ chunk-9ncz9ams.js:5360-5501 placement
function claudeStateGlobs(entries = claudeStateGlobEntries()) {
  return uniq(
    entries.map(
      ({ literal, tail }) =>
        `${ensureLeadingSlash(
          escapeRuleContent(toPosixPath(literal), {
            escapeGlobs: true,
          }),
        )}${tail.endsWith("claude-resume-*") ? `${tail}/**` : tail}`,
    ),
  );
}
//@ chunk-9ncz9ams.js:5501-5683 placement
function isClaudeStatePath(inputPath) {
  if (isDiskless()) return false;
  let expanded = expandPath(inputPath);
  let posixPath = expanded.includes("\\") ? expanded.replaceAll("\\", "/") : expanded;
  if (!claudeStatePathRegex(claudeStateGlobEntries()).test(posixPath)) return false;
  return (
    matchingRuleForInput(inputPath, claudeStateDenyContext(claudeStateGlobs()), "read", "deny", {
      asSpelledOnly: true,
    }) !== null
  );
}
//@ chunk-9ncz9ams.js:5683-5940 placement
var claudeStatePathRegex; // deferred: uses urlPatternToRegexCached of its import cycle while loading; runs once the cycle is complete
var claudeStateDenyContext;
deferInit("chunk-9ncz9ams.js:5683", () => {
  claudeStatePathRegex = memoizeAlias(
    (entries) =>
      new RegExp(
        `^(?:${uniq(
          entries.map(({ literal, tail }) =>
            (tail === "" || tail === ".*" ? dirname(literal) : literal).replaceAll("\\", "/"),
          ),
        )
          .map(urlPatternToRegexCached)
          .join("|")})`,
        "i",
      ),
  );
  claudeStateDenyContext = memoizeAlias(
    (ruleContents) => ({
      ...getEmptyToolPermissionContext(),
      alwaysDenyRules: {
        hostCredential: ruleContents.map((ruleContent) =>
          formatPermissionRule({
            toolName: FILE_READ_TOOL_NAME,
            ruleContent,
          }),
        ),
      },
    }),
    (ruleContents) => ruleContents.join("\x00"),
  );
});
//@ chunk-9ncz9ams.js:5940-5997 placement
function ensureLeadingSlash(text) {
  return text === "" || text.startsWith("/") ? `/${text}` : text;
}
//@ chunk-9ncz9ams.js:5997-6045 placement
function stripTrailingSlashes(text) {
  return text.replace(/[\\/]+$/, "") || text;
}
export {
  claudeStateFilePaths,
  withPathAliases,
  getClaudeConfigDirs,
  createRealpathCache,
  claudeStatePathPatterns,
  claudeStateGlobs,
  isClaudeStatePath,
  editorBackupVariants,
  tempFileVariants,
  claudeStateGlobEntries,
  claudeStateGlobEntriesExact,
  CLAUDE_STATE_FILENAMES,
};
