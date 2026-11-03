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
import { FOe } from "../secureStorage/macOsKeychainHelpers.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../../services/remoteManagedSettings/consentRecords.js";
import {
  HELPER_CONSENT_STATE_ID,
  SETTINGS_FILENAME,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { POLICY_LIMITS_CACHE_FILENAME } from "../../services/policyLimits/policyState.js";
import { Wre } from "../hostScoped.js";
import { getDefaultGlobalClaudeFile, getGlobalClaudeFile, env, mapped, LEGACY_CONFIG_JSON } from "../env.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME, getDeviceKeysFilePath } from "../auth.js";
import { hsr, K8o, Q6, NTt, nwe } from "../sandbox/userNamespace.js";
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
var D = /[\\^$.*+?()[\]{}|]/g,
  N = RegExp(D.source);
//@ chunk-9ncz9ams.js:1173-1238 placement = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  return ((pattern = vde(pattern)), pattern && N.test(pattern) ? pattern.replace(D, "\\$&") : pattern);
}
//@ chunk-9ncz9ams.js:1238-1246 placement
var M = urlPatternToRegex;
//@ chunk-9ncz9ams.js:1246-1322 placement = isInGlobalClaudeFolder (1)
function getClaudeConfigDirs() {
  return uniq([getClaudeConfigDirOrNull(), join(homedir(), ".claude"), FOe()].filter((e) => e !== null));
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
    FOe() ?? "",
    ...(Wre() ? ["", ""] : [getDefaultGlobalClaudeFile(), getGlobalClaudeFile()]),
    env.CLAUDE_CODE_HOST_CREDS_FILE ?? "",
    env.TMPDIR ?? "",
    ...(Wre() ? [d("TMPDIR") ?? ""] : []),
    d("APPDATA") ?? "",
    d("LOCALAPPDATA") ?? "",
  ].join("\x00");
}
/**
 * Claude 自身状态文件/目录（配置目录、全局配置、设置、策略缓存等）的路径模式集合，用于防止工具改写。
 */
//@ chunk-9ncz9ams.js:1551-3381 placement
var claudeStatePathPatterns = io(() => {
    let e = getClaudeConfigDirs(),
      o = uniq([...(Wre() ? [] : [dirname(getDefaultGlobalClaudeFile())]), homedir()]);
    return withPathAliases([
      ...claudeStateFilePaths(),
      ...e.flatMap((t) => [join(t, CREDENTIALS_FILE_NAME), join(t, DEVICE_KEYS_FILE_NAME)]),
      ...o.flatMap((t) => mapped.map((r) => join(t, r))),
      ...e.map((t) => join(t, LEGACY_CONFIG_JSON)),
      ...(env.CLAUDE_CODE_HOST_CREDS_FILE ? [S(env.CLAUDE_CODE_HOST_CREDS_FILE)] : []),
    ]);
  }, claudeStatePathsCacheKey),
  x = io(() => {
    let e = withPathAliases(getTempRootDirs()),
      o = [
        ...claudeStatePathPatterns(),
        ...withPathAliases([join(homedir(), ".claude", "state", "unattended-serving-consent.json")]),
        ...withPathAliases([join(homedir(), ".claude", "state", "settings-review.json")]),
        ...withPathAliases(
          getClaudeConfigDirs().flatMap((t) => [
            join(t, "state", "device-mcp-consent.json"),
            join(t, "state", "device-mcp-snapshot.json"),
          ]),
        ),
        ...withPathAliases(
          getClaudeConfigDirs().flatMap((t) => CLAUDE_STATE_FILENAMES.map((r) => join(t, r))),
        ),
        ...withPathAliases(getClaudeConfigDirs().flatMap((t) => [hsr(t), K8o(t), Q6(t)])),
      ];
    return Ji(
      [
        ...o.flatMap((t) => [
          ...editorBackupVariants(basename(t)).flatMap((r) => [
            { literal: join(dirname(t), r), tail: "", place: r === basename(t) },
            { literal: join(dirname(t), r), tail: ".*", place: !1 },
          ]),
          ...tempFileVariants(basename(t)).map((r) => ({ literal: dirname(t), tail: `/${r}`, place: !1 })),
        ]),
        ...withPathAliases([
          ...getClaudeConfigDirs().flatMap((t) => [join(t, "backups"), NTt(t), nwe(t), join(t, "state")]),
          join(homedir(), ".claude", "state", "served-calls"),
          ...(getPlatform() === "macos" ? [join(homedir(), "Library", "Keychains")] : []),
          ...(getPlatform() === "windows" ? getWindowsCredentialStoreDirs() : []),
        ]).map((t) => ({ literal: t, tail: "/**", place: !0 })),
        ...withPathAliases(getClaudeConfigDirs().map((t) => getSessionsDir(t))).flatMap((t) => [
          ...editorBackupVariants("*.key").flatMap((r) => [
            { literal: t, tail: `/${r}`, place: r === "*.key" },
            { literal: t, tail: `/${r}.*`, place: !1 },
          ]),
          ...tempFileVariants("*.key").map((r) => ({ literal: t, tail: `/${r}`, place: !1 })),
        ]),
        ...e.map((t) => ({ literal: t, tail: "/claude-resume-*", place: !0 })),
        ...(getPlatform() === "macos"
          ? withPathAliases(["/var/folders"]).map((t) => ({
              literal: t,
              tail: "/*/*/*/claude-resume-*",
              place: !0,
            }))
          : []),
        ...(Wre()
          ? e.flatMap((t) => [
              { literal: t, tail: `/${CC_TENANT}*/.claude/**`, place: !0 },
              { literal: t, tail: `/${CC_TENANT}*/*/claude-resume-*`, place: !0 },
            ])
          : []),
      ],
      ({ literal: literal, tail: tail, place: place }) => `${literal}\x00${tail}\x00${place}`,
    );
  }, claudeStatePathsCacheKey),
  O4e = io(() => uniqueLiteralTailPatterns(x()), claudeStatePathsCacheKey),
  G8o = io(() => {
    let filtered = x().filter((t) => t.place),
      mapped = filtered.filter((t) => t.tail === "/**").map((t) => `${t.literal}${sep}`);
    return uniqueLiteralTailPatterns(filtered.filter((t) => !mapped.some((r) => t.literal.startsWith(r))));
  }, claudeStatePathsCacheKey);
//@ chunk-9ncz9ams.js:3381-3493 placement
function uniqueLiteralTailPatterns(e) {
  return Ji(
    e.map(({ literal: literal, tail: tail }) => ({ literal: literal, tail: tail })),
    ({ literal: literal, tail: tail }) => `${literal}\x00${tail}`,
  );
}
//@ chunk-9ncz9ams.js:3493-3726 placement
function getWindowsCredentialStoreDirs() {
  let { local: local, roaming: roaming } = getWindowsAppDataDirs();
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
      [d("LOCALAPPDATA"), join(homedir(), "AppData", "Local")].filter((e) => e !== void 0 && e !== ""),
    ),
    roaming: uniq(
      [d("APPDATA"), join(homedir(), "AppData", "Roaming")].filter((e) => e !== void 0 && e !== ""),
    ),
  };
}
//@ chunk-9ncz9ams.js:3918-3971 placement
function d(e) {
  let o = getLatchedPreSettingsEnvSnapshot();
  return o !== void 0 ? o[e] : env[e];
}
//@ chunk-9ncz9ams.js:3971-4151 placement
function getTempRootDirs() {
  let e = uniq(
    [tmpdir(), env.TMPDIR, ...(Wre() ? [d("TMPDIR")] : []), "/tmp", "/var/tmp"]
      .filter((o) => o !== void 0 && isAbsolute(o))
      .map(S),
  );
  return Wre()
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
  let index = e.lastIndexOf("."),
    t = index === -1 ? e : e.slice(0, index),
    r = index === -1 ? "" : e.slice(index);
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
  let o = getPlatform(),
    t = o === "linux" || o === "wsl",
    r = new Map();
  function l(s) {
    if (!r.has(s)) r.set(s, e.realpathIfExists(s));
    return r.get(s);
  }
  let g = new Map();
  function R(s, m) {
    let p = g.get(s);
    if (p === void 0) ((p = e.namesIn(s) ?? []), g.set(s, p));
    let regExp = new RegExp(`^${M(m).replaceAll("\\*", "[^/]*")}$`);
    return p.filter((u) => regExp.test(u)).map((u) => join(s, u));
  }
  let C = new Set(withPathAliases(getClaudeConfigDirs()).map(S)),
    T = new Set([...C, ...withPathAliases([homedir()]).map(S)]),
    O = new Set(
      O4e()
        .filter(({ tail: tail }) => tail === "/**")
        .flatMap(({ literal: literal }) => [literal, dirname(literal)])
        .filter((s) => C.has(dirname(s))),
    );
  return uniq(
    O4e().flatMap(({ literal: literal, tail: tail }) => {
      let p = dirname(literal),
        E = l(p) ?? (O.has(p) ? (((_) => _ && join(_, basename(p)))(l(dirname(p))) ?? void 0) : void 0);
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
function claudeStateGlobs(e = O4e()) {
  return uniq(
    e.map(
      ({ literal: literal, tail: tail }) =>
        `${K(escapeRuleContent(toPosixPath(literal), { escapeGlobs: !0 }))}${tail.endsWith("claude-resume-*") ? `${tail}/**` : tail}`,
    ),
  );
}
//@ chunk-9ncz9ams.js:5501-5683 placement
function isClaudeStatePath(e) {
  if (Wre()) return !1;
  let o = expandPath(e),
    t = o.includes("\\") ? o.replaceAll("\\", "/") : o;
  if (!claudeStatePathRegex(O4e()).test(t)) return !1;
  return matchingRuleForInput(e, B(claudeStateGlobs()), "read", "deny", { asSpelledOnly: !0 }) !== null;
}
//@ chunk-9ncz9ams.js:5683-5940 placement
var claudeStatePathRegex = io(
    (e) =>
      new RegExp(
        `^(?:${uniq(
          e.map(({ literal: literal, tail: tail }) =>
            (tail === "" || tail === ".*" ? dirname(literal) : literal).replaceAll("\\", "/"),
          ),
        )
          .map(M)
          .join("|")})`,
        "i",
      ),
  ),
  B = io(
    (e) => ({
      ...getEmptyToolPermissionContext(),
      alwaysDenyRules: {
        hostCredential: e.map((o) => formatPermissionRule({ toolName: FILE_READ_TOOL_NAME, ruleContent: o })),
      },
    }),
    (e) => e.join("\x00"),
  );
//@ chunk-9ncz9ams.js:5940-5997 placement
function K(e) {
  return e === "" || e.startsWith("/") ? `/${e}` : e;
}
//@ chunk-9ncz9ams.js:5997-6045 placement
function S(e) {
  return e.replace(/[\\/]+$/, "") || e;
}
/**
 * Claude 状态文件路径（全局配置、旧配置、凭证、设备密钥）。
 */
//@ chunk-cdz6g143.js:632-772 placement
function claudeStateFilePaths() {
  let o = getClaudeConfigDirOrNull(),
    r = FOe();
  if (o === null || r === null) return [getDeviceKeysFilePath()];
  let t = dirname(getGlobalClaudeFile());
  return [
    ...mapped.map((n) => join(t, n)),
    join(o, LEGACY_CONFIG_JSON),
    join(r, CREDENTIALS_FILE_NAME),
    getDeviceKeysFilePath(),
  ];
}

export {
  withPathAliases,
  getClaudeConfigDirs,
  createRealpathCache,
  claudeStatePathPatterns,
  claudeStateFilePaths,
  claudeStateGlobs,
  isClaudeStatePath,
  editorBackupVariants,
  tempFileVariants,
  O4e,
  G8o,
  CLAUDE_STATE_FILENAMES,
};
