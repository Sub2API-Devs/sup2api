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
import { join, dirname, basename, sep, isAbsolute } from "path";
import { homedir, tmpdir } from "os";
import { vde } from "../../../vendor/lodash-es/toString.js";
import { uniq } from "../collections.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { keychainProjectDirs } from "../secureStorage/macOsKeychainHelpers.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../../services/remoteManagedSettings/consentRecords.js";
import {
  HELPER_CONSENT_STATE_ID,
  SETTINGS_FILENAME,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { POLICY_LIMITS_CACHE_FILENAME } from "../../services/policyLimits/policyState.js";
import { isDiskless } from "../hostScoped.js";
import { getDefaultGlobalClaudeFile, getGlobalClaudeFile, env, mapped, LEGACY_CONFIG_JSON } from "../env.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME, getDeviceKeysFilePath } from "../auth.js";
import {
  daemonControlKeyFile,
  daemonPipeKeyFile,
  daemonRosterFile,
  daemonAuthDir,
  daemonDispatchDir,
} from "../sandbox/userNamespace.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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

//@ chunk-9ncz9ams.js:1126-1173 placement
var REGEX_SPECIAL_CHARS_RE = /[\\^$.*+?()[\]{}|]/g;
var REGEX_SPECIAL_CHARS_PROBE = RegExp(REGEX_SPECIAL_CHARS_RE.source);
//@ chunk-9ncz9ams.js:1173-1238 placement = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  pattern = vde(pattern);
  return pattern && REGEX_SPECIAL_CHARS_PROBE.test(pattern)
    ? pattern.replace(REGEX_SPECIAL_CHARS_RE, "\\$&")
    : pattern;
}
//@ chunk-9ncz9ams.js:1238-1246 placement
var urlPatternToRegexCached = urlPatternToRegex;
//@ chunk-9ncz9ams.js:1246-1322 placement = isInGlobalClaudeFolder (1)
function getClaudeConfigDirs() {
  return uniq(
    [getClaudeConfigDirOrNull(), join(homedir(), ".claude"), keychainProjectDirs()].filter((e) => e !== null),
  );
}
//@ chunk-9ncz9ams.js:1322-1348 placement
var CLAUDE_STATE_FILENAMES = [
  REMOTE_SETTINGS_CONSENT_FILE,
  HELPER_CONSENT_STATE_ID,
  SETTINGS_FILENAME,
  POLICY_LIMITS_CACHE_FILENAME,
];
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
var claudeStatePathPatterns = io(() => {
  let claudeConfigDirs = getClaudeConfigDirs();
  let o = uniq([...(isDiskless() ? [] : [dirname(getDefaultGlobalClaudeFile())]), homedir()]);
  return withPathAliases([
    ...claudeStateFilePaths(),
    ...claudeConfigDirs.flatMap((claudeConfigDir) => [
      join(claudeConfigDir, CREDENTIALS_FILE_NAME),
      join(claudeConfigDir, DEVICE_KEYS_FILE_NAME),
    ]),
    ...o.flatMap((t) => mapped.map((r) => join(t, r))),
    ...claudeConfigDirs.map((claudeConfigDir) => join(claudeConfigDir, LEGACY_CONFIG_JSON)),
    ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [stripTrailingSlashes(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
  ]);
}, claudeStatePathsCacheKey);
var claudeStateGlobPatterns = io(() => {
  let e = withPathAliases(getTempRootDirs());
  let o = [
    ...claudeStatePathPatterns(),
    ...withPathAliases([join(homedir(), ".claude", "state", "unattended-serving-consent.json")]),
    ...withPathAliases([join(homedir(), ".claude", "state", "settings-review.json")]),
    ...withPathAliases(
      getClaudeConfigDirs().flatMap((t) => [
        join(t, "state", "device-mcp-consent.json"),
        join(t, "state", "device-mcp-snapshot.json"),
      ]),
    ),
    ...withPathAliases(getClaudeConfigDirs().flatMap((t) => CLAUDE_STATE_FILENAMES.map((r) => join(t, r)))),
    ...withPathAliases(
      getClaudeConfigDirs().flatMap((t) => [
        daemonControlKeyFile(t),
        daemonPipeKeyFile(t),
        daemonRosterFile(t),
      ]),
    ),
  ];
  return Ji(
    [
      ...o.flatMap((t) => [
        ...editorBackupVariants(basename(t)).flatMap((r) => [
          {
            literal: join(dirname(t), r),
            tail: "",
            place: r === basename(t),
          },
          {
            literal: join(dirname(t), r),
            tail: ".*",
            place: false,
          },
        ]),
        ...tempFileVariants(basename(t)).map((r) => ({
          literal: dirname(t),
          tail: `/${r}`,
          place: false,
        })),
      ]),
      ...withPathAliases([
        ...getClaudeConfigDirs().flatMap((t) => [
          join(t, "backups"),
          daemonAuthDir(t),
          daemonDispatchDir(t),
          join(t, "state"),
        ]),
        join(homedir(), ".claude", "state", "served-calls"),
        ...(getPlatform() === "macos" ? [join(homedir(), "Library", "Keychains")] : []),
        ...(getPlatform() === "windows" ? getWindowsCredentialStoreDirs() : []),
      ]).map((literal) => ({
        literal,
        tail: "/**",
        place: true,
      })),
      ...withPathAliases(getClaudeConfigDirs().map((t) => getSessionsDir(t))).flatMap((literal) => [
        ...editorBackupVariants("*.key").flatMap((r) => [
          {
            literal,
            tail: `/${r}`,
            place: r === "*.key",
          },
          {
            literal,
            tail: `/${r}.*`,
            place: false,
          },
        ]),
        ...tempFileVariants("*.key").map((r) => ({
          literal,
          tail: `/${r}`,
          place: false,
        })),
      ]),
      ...e.map((literal) => ({
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
        ? e.flatMap((literal) => [
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
var claudeStateGlobEntries = io(
  () => uniqueLiteralTailPatterns(claudeStateGlobPatterns()),
  claudeStatePathsCacheKey,
);
var claudeStateGlobEntriesExact = io(() => {
  let filtered = claudeStateGlobPatterns().filter((t) => t.place);
  let mapped = filtered.filter((t) => t.tail === "/**").map((t) => `${t.literal}${sep}`);
  return uniqueLiteralTailPatterns(filtered.filter((t) => !mapped.some((r) => t.literal.startsWith(r))));
}, claudeStatePathsCacheKey);
//@ chunk-9ncz9ams.js:3381-3493 placement
function uniqueLiteralTailPatterns(e) {
  return Ji(
    e.map(({ literal, tail }) => ({
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
    ...local.flatMap((t) => [join(t, "Microsoft", "Credentials"), join(t, "Microsoft", "Vault")]),
    ...roaming.flatMap((t) => [
      join(t, "Microsoft", "Credentials"),
      join(t, "Microsoft", "Vault"),
      join(t, "Microsoft", "Protect"),
    ]),
  ]);
}
//@ chunk-9ncz9ams.js:3726-3918 placement
function getWindowsAppDataDirs() {
  return {
    local: uniq(
      [readLatchedEnv("LOCALAPPDATA"), join(homedir(), "AppData", "Local")].filter(
        (e) => e !== undefined && e !== "",
      ),
    ),
    roaming: uniq(
      [readLatchedEnv("APPDATA"), join(homedir(), "AppData", "Roaming")].filter(
        (e) => e !== undefined && e !== "",
      ),
    ),
  };
}
//@ chunk-9ncz9ams.js:3918-3971 placement
function readLatchedEnv(e) {
  let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
  return latchedPreSettingsEnvSnapshot !== undefined ? latchedPreSettingsEnvSnapshot[e] : env[e];
}
//@ chunk-9ncz9ams.js:3971-4151 placement
function getTempRootDirs() {
  let e = uniq(
    [tmpdir(), env.TMPDIR, ...(isDiskless() ? [readLatchedEnv("TMPDIR")] : []), "/tmp", "/var/tmp"]
      .filter((o) => o !== undefined && isAbsolute(o))
      .map(stripTrailingSlashes),
  );
  return isDiskless()
    ? uniq(e.map((o) => (basename(dirname(o)).startsWith(CC_TENANT) ? dirname(dirname(o)) : o)))
    : e;
}
//@ chunk-9ncz9ams.js:4151-4170 placement
var CC_TENANT = "cc-tenant-";
//@ chunk-9ncz9ams.js:4170-4248 placement
function editorBackupVariants(e) {
  return [e, `.${e}`, `#${e}#`, `.#${e}`].flatMap((o) => [o, `${o}~`]);
}
//@ chunk-9ncz9ams.js:4248-4491 placement
function tempFileVariants(e) {
  let index = e.lastIndexOf(".");
  let t = index === -1 ? e : e.slice(0, index);
  let r = index === -1 ? "" : e.slice(index);
  return [
    ...["", ".", "#", ".#"].flatMap((l) => [
      `${l}${e}~*`,
      ...["BACKUP", "BASE", "LOCAL", "REMOTE"].map((g) => `${l}${t}_${g}_*${r === "" ? "" : `${r}*`}`),
    ]),
    `#${e}#~*`,
  ];
}
//@ chunk-9ncz9ams.js:4491-4545 placement
function withPathAliases(e) {
  return uniq(e.flatMap((o) => [o, ...getPathsForPermissionCheck(o)]));
}
//@ chunk-9ncz9ams.js:4545-5360 placement
function createRealpathCache(e) {
  let platform = getPlatform();
  let t = platform === "linux" || platform === "wsl";
  let r = new Map();
  function l(s) {
    if (!r.has(s)) r.set(s, e.realpathIfExists(s));
    return r.get(s);
  }
  let g = new Map();
  function R(s, m) {
    let p = g.get(s);
    if (p === undefined) {
      p = e.namesIn(s) ?? [];
      g.set(s, p);
    }
    let regExp = new RegExp(`^${urlPatternToRegexCached(m).replaceAll("\\*", "[^/]*")}$`);
    return p.filter((u) => regExp.test(u)).map((u) => join(s, u));
  }
  let C = new Set(withPathAliases(getClaudeConfigDirs()).map(stripTrailingSlashes));
  let T = new Set([...C, ...withPathAliases([homedir()]).map(stripTrailingSlashes)]);
  let O = new Set(
    claudeStateGlobEntries()
      .filter(({ tail }) => tail === "/**")
      .flatMap(({ literal }) => [literal, dirname(literal)])
      .filter((s) => C.has(dirname(s))),
  );
  return uniq(
    claudeStateGlobEntries().flatMap(({ literal, tail }) => {
      let p = dirname(literal);
      let E =
        l(p) ?? (O.has(p) ? (((_) => _ && join(_, basename(p)))(l(dirname(p))) ?? undefined) : undefined);
      if (!E) return [];
      let u = join(E, basename(literal));
      if (tail === "") return [l(u) ?? u];
      if (tail === "/**") return [`${u}/`];
      let L = `${tail.startsWith("/") && T.has(literal) ? (l(literal) ?? u) : u}${tail}`;
      if (!t) return [L];
      let P = dirname(L);
      return R(l(P) ?? P, basename(L));
    }),
  );
}
//@ chunk-9ncz9ams.js:5360-5501 placement
function claudeStateGlobs(e = claudeStateGlobEntries()) {
  return uniq(
    e.map(
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
function isClaudeStatePath(e) {
  if (isDiskless()) return false;
  let o = expandPath(e);
  let t = o.includes("\\") ? o.replaceAll("\\", "/") : o;
  if (!claudeStatePathRegex(claudeStateGlobEntries()).test(t)) return false;
  return (
    matchingRuleForInput(e, claudeStateDenyContext(claudeStateGlobs()), "read", "deny", {
      asSpelledOnly: true,
    }) !== null
  );
}
//@ chunk-9ncz9ams.js:5683-5940 placement
var claudeStatePathRegex = io(
  (e) =>
    new RegExp(
      `^(?:${uniq(
        e.map(({ literal, tail }) =>
          (tail === "" || tail === ".*" ? dirname(literal) : literal).replaceAll("\\", "/"),
        ),
      )
        .map(urlPatternToRegexCached)
        .join("|")})`,
      "i",
    ),
);
var claudeStateDenyContext = io(
  (e) => ({
    ...getEmptyToolPermissionContext(),
    alwaysDenyRules: {
      hostCredential: e.map((ruleContent) =>
        formatPermissionRule({
          toolName: FILE_READ_TOOL_NAME,
          ruleContent,
        }),
      ),
    },
  }),
  (e) => e.join("\x00"),
);
//@ chunk-9ncz9ams.js:5940-5997 placement
function ensureLeadingSlash(e) {
  return e === "" || e.startsWith("/") ? `/${e}` : e;
}
//@ chunk-9ncz9ams.js:5997-6045 placement
function stripTrailingSlashes(e) {
  return e.replace(/[\\/]+$/, "") || e;
}
//@ chunk-cdz6g143.js:632-772 placement
/**
 * Claude 状态文件路径（全局配置、旧配置、凭证、设备密钥）。
 */
function claudeStateFilePaths() {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let r = keychainProjectDirs();
  if (claudeConfigDirOrNull === null || r === null) return [getDeviceKeysFilePath()];
  let t = dirname(getGlobalClaudeFile());
  return [
    ...mapped.map((n) => join(t, n)),
    join(claudeConfigDirOrNull, LEGACY_CONFIG_JSON),
    join(r, CREDENTIALS_FILE_NAME),
    getDeviceKeysFilePath(),
  ];
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
