/**
 * utils/permissions/sensitivePaths.ts
 *
 * 敏感路径表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yf82ynbr.js (71)
 * attribution: placement 71
 */
import { isAbsolute, sep, dirname, resolve, basename } from "path";
import { realpath } from "fs/promises";
import { checkGate_OWN_OFF_FIRST } from "../../services/analytics/growthbook.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "../auth.js";
import { OAUTH_SUFFIXED_CONFIG_FILE_NAME, GLOBAL_CLAUDE_FILE_NAMES } from "../env.js";
import { foldName, foldProtectedDirNameLower } from "./protectedDirNames.js";
import { isClaudeStatePath, CLAUDE_STATE_FILENAMES, getClaudeConfigDirs } from "./claudeStatePaths.js";
import { uniq } from "../collections.js";
import { getPlatform } from "../platform.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { Be } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { CCR_OAUTH_TOKEN_PATH, CCR_CREDENTIAL_PATHS } from "../authFileDescriptor.js";

//@ chunk-yf82ynbr.js:677-950 placement
var EDITOR_BACKUP_SUFFIX_RE = String.raw`\.sw[a-p]|\.un~|\.rej|\.save\.\d+|\.save|\.tmp|\.temp|\.bak|\.old|\.orig|\.backup|\.~\d+~|~`;
var COPY_MARK_SUFFIX_RE = String.raw`\.part(?:ial)?|\.(?:cr)?download| copy| - copy| \d+| ?\(\d+\)| \((?=[^()/]*(?:conflict|copy))[^()/]*\)|\.sync-conflict-[\w-]+`;
var BACKUP_OR_COPY_SUFFIX_RE = `${EDITOR_BACKUP_SUFFIX_RE}|${COPY_MARK_SUFFIX_RE}`;
var OFFICE_LOCK_PREFIX = ".~ (";
//@ chunk-yf82ynbr.js:950-979 placement
var TENGU_VIOLIN_MAPLE = "tengu_violin_maple";
//@ chunk-yf82ynbr.js:979-1042 placement
/**
 * sensitivePathGateEnabled：敏感路径检查的 GrowthBook 开关。
 */
async function sensitivePathGateEnabled() {
  try {
    return await checkGate_OWN_OFF_FIRST(TENGU_VIOLIN_MAPLE);
  } catch {
    return false;
  }
}
//@ chunk-yf82ynbr.js:1042-1072 placement
/**
 * neverTrueAsync：恒 false 的异步占位（构建时裁掉）。
 */
async function neverTrueAsync() {
  return false;
}
//@ chunk-yf82ynbr.js:1072-1096 placement
/**
 * neverTrue：恒 false 的占位（构建时裁掉）。
 */
function neverTrue() {
  return false;
}
//@ chunk-yf82ynbr.js:1096-3436 placement
/**
 * 敏感目录/文件名表（.ssh、.aws、.azure、.gnupg 等），用于读写权限判断
 */
var SENSITIVE_DIR_NAMES = [".ssh", ".aws", ".azure", ".gnupg", ".kube", ".docker"];
var SENSITIVE_DIR_PATHS = [
  [".config", "git"],
  [".config", "gh"],
  [".config", "glab-cli"],
  [".config", "gcloud"],
  ["appdata", "roaming", "gcloud"],
  [".cargo", "credentials"],
  [".cargo", "credentials.toml"],
  [".gem", "credentials"],
  [".m2", "settings.xml"],
  [".gradle", "gradle.properties"],
  ["documents", "powershell", "profile.ps1"],
  ["documents", "windowspowershell", "profile.ps1"],
  [".config", "powershell", "profile.ps1"],
  [".claude", "settings.json"],
  [".claude", "settings.local.json"],
  [".claude", "state", "unattended-serving-consent.json"],
  [".claude", "state", "device-mcp-consent.json"],
  [".claude", "state", "device-mcp-snapshot.json"],
  [".claude", "state", "served-calls"],
  [".claude", "state", "settings-review.json"],
  [".claude", "state"],
  ["appdata", "roaming", "github cli"],
  ["appdata", "roaming", "gh"],
  ["appdata", "roaming", "glab-cli"],
  ["appdata", "roaming", "gnupg"],
  ["appdata", "local", "microsoft", "credentials"],
  ["appdata", "roaming", "microsoft", "credentials"],
  ["appdata", "local", "microsoft", "vault"],
  ["appdata", "roaming", "microsoft", "vault"],
  ["appdata", "roaming", "microsoft", "protect"],
  ["library", "keychains"],
];
var SENSITIVE_FILE_NAMES_LIST = [
  ".netrc",
  "_netrc",
  ".git-credentials",
  ".gitconfig",
  CREDENTIALS_FILE_NAME,
  DEVICE_KEYS_FILE_NAME,
  OAUTH_SUFFIXED_CONFIG_FILE_NAME,
  ".envrc",
  ".mcp.json",
  ".npmrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".pypirc",
  ".pgpass",
  ".my.cnf",
  ".mylogin.cnf",
  ".terraformrc",
  "terraform.rc",
  "credentials.tfrc.json",
  ".boto",
  ".s3cfg",
  "kubeconfig",
  "kubeconfig.yaml",
  "kubeconfig.yml",
  "kubeconfig.json",
  ".bashrc",
  ".bash_profile",
  ".bash_login",
  ".bash_logout",
  ".bash_aliases",
  ".profile",
  ".zshrc",
  ".zshenv",
  ".zprofile",
  ".zlogin",
  ".zlogout",
  "config.fish",
  "microsoft.powershell_profile.ps1",
  "microsoft.vscode_profile.ps1",
  "microsoft.powershellise_profile.ps1",
  ".bash_history",
  ".zsh_history",
  "fish_history",
  "consolehost_history.txt",
  ".python_history",
  ".node_repl_history",
  ".psql_history",
  ".mysql_history",
];
var SENSITIVE_KEY_FILE_RE =
  /(?:\.(?:pem|key|p12|pfx|keystore|jks)|_(?:rsa|dsa|ecdsa|ed25519)(?:_sk(?:_rk(?:_.*)?)?)?|secrets?\.(?:ya?ml|json|toml))$/s;
var DOT_ENV_PREFIX = ".env";
var CLAUDE_OWN_FILE_NAME = OAUTH_SUFFIXED_CONFIG_FILE_NAME;
var NON_SECRET_FILE_SUFFIXES = ["example", "sample", "template", "dist"];
var regExp = new RegExp(`(?:${BACKUP_OR_COPY_SUFFIX_RE})$`, "i");
var regExp_2 = new RegExp(`(?:${EDITOR_BACKUP_SUFFIX_RE})$`, "i");
var regExp_3 = new RegExp(
  `(?:${BACKUP_OR_COPY_SUFFIX_RE})((?!(?:${BACKUP_OR_COPY_SUFFIX_RE})$)(?!\\.\\d+$)\\.[^./]+)$`,
  "i",
);
var BACKUP_OR_COPY_SUFFIX_REGEX = 64;
var MAX_NAME_READING_LENGTH = 255;
var MAX_PATH_SEGMENT_LENGTH = [/(?!)/, /:[^:]*$/, /:[^:]*:[^:]*$/, /:.*$/s];
var REMOTE_PREFIX_STRIP_FNS = /~[^/~.][^/~]*$/;
var EDITOR_BACKUP_SUFFIX_REGEX = "(?:BACKUP|BASE|LOCAL|REMOTE)";
var SYNC_CONFLICT_SUFFIX_PATTERN = `_${EDITOR_BACKUP_SUFFIX_REGEX}_(?:[LR]CONFL_)?\\d{2,}`;
var regExp_4 = new RegExp(`^(.*)${SYNC_CONFLICT_SUFFIX_PATTERN}(\\.[^./]*)?$`, "is");
var GIT_DIR_NAME = ".git";
var CONFIG = "config";
//@ chunk-yf82ynbr.js:3436-3748 placement
/**
 * 路径（及其大小写折叠、副本标记去除等变体）是否命中 Claude 自身状态路径。
 */
function isClaudeStatePathVariant(e, n = splitPathSegments(e)) {
  if (!isAbsolute(e)) return false;
  let r = `/${n.map(foldName).join("/")}`;
  if (
    (r === e ? [e] : [e, r]).some(
      (i) => isClaudeStatePath(i) || getBasenameVariants(i).some(isClaudeStatePath),
    )
  )
    return true;
  let o = `/${n.join("/")}`;
  if ((o === r ? [o] : [o, r]).some(anyVariantIsClaudeState)) return true;
  let s = `/${n.map((i, c) => (c === n.length - 1 ? i : stripCopyMarks(i, FULL_READINGS))).join("/")}`;
  if (s !== o && (isClaudeStatePath(s) || getBasenameVariants(s).some(isClaudeStatePath))) return true;
  return false;
}
//@ chunk-yf82ynbr.js:3748-3825 placement
/**
 * isSensitiveWithGitConfig：把 .git 下 config 也视为敏感。
 */
function isSensitiveWithGitConfig(e) {
  return isSensitivePath(e, {
    exceptFiles: NO_EXCEPT_FILES,
    withGitConfigBelowGitFolders: true,
  });
}
//@ chunk-yf82ynbr.js:3825-3839 placement
var NO_EXCEPT_FILES = new Set();
//@ chunk-yf82ynbr.js:3839-4204 placement
/**
 * 路径是否敏感：段过长、Claude 状态路径、敏感目录名、敏感路径前缀、全局 Claude 目录，或末段为敏感文件（可排除部分文件）；可选把 .git 目录下的 config 视为敏感。
 */
function isSensitivePath(e, { exceptFiles, withGitConfigBelowGitFolders }) {
  let r = splitPathSegments(e);
  if (r.some((l) => l.length > MAX_NAME_READING_LENGTH)) return true;
  if (isClaudeStatePathVariant(e, r)) return true;
  let { readingsByFold, readings, present } = expandSegmentReadings(r);
  let c = readings.at(-1) ?? [];
  return (
    readingsByFold.some((l) => l.some((a) => a.length > BACKUP_OR_COPY_SUFFIX_REGEX)) ||
    readings.some((reading) => reading.some((a) => SENSITIVE_DIR_NAMES.includes(a))) ||
    SENSITIVE_DIR_PATHS.some(
      (l) => containsSegmentSequence(readings, l) || containsSegmentSequence(present, l),
    ) ||
    (isCredentialConfigPath(present) && isSensitiveNameCheckActive()) ||
    isInGlobalClaudeFolder(readings) ||
    isInGlobalClaudeFolder(present) ||
    c.some((l) => isSensitiveBasename(l, exceptFiles)) ||
    (withGitConfigBelowGitFolders && hasConfigUnderGitDir(readings))
  );
}
//@ chunk-yf82ynbr.js:4204-4303 placement
function hasConfigUnderGitDir(readings) {
  return (
    (readings.at(-1) ?? []).some(isConfigFileName) &&
    readings.slice(0, -1).some((n) => n.some((t) => t.endsWith(GIT_DIR_NAME)))
  );
}
//@ chunk-yf82ynbr.js:4303-4480 placement
function expandSegmentReadings(e) {
  let mapped = e.map((r, o) => segmentReadings(r, o === e.length - 1));
  let mapped_2 = mapped.map((r) => uniq(r.flat()));
  return {
    readingsByFold: mapped,
    readings: mapped_2,
    present: mapped_2.filter((r, o) => o === e.length - 1 || !mapped[o]?.[0]?.some(isDecorationOnlyName)),
  };
}
//@ chunk-yf82ynbr.js:4480-4593 placement
function segmentReadings(e, leadingDot) {
  let t = expandNameReadings(e, {
    leadingDot,
  });
  return nameReadingFns(e).map((r) =>
    uniq([
      ...expandNameReadings(r(e), {
        leadingDot,
      }),
      ...t.map(r),
    ]),
  );
}
//@ chunk-yf82ynbr.js:4593-4634 placement
/**
 * segmentReadingsFlat：某段的全部读法。
 */
function segmentReadingsFlat(e) {
  return uniq(segmentReadings(e, false).flat());
}
//@ chunk-yf82ynbr.js:4634-4762 placement
function stripCopyMarks(e, n) {
  if (e.length > MAX_NAME_READING_LENGTH) return e;
  let t = e;
  for (;;) {
    let reduced = n.reduce((acc, s) => (acc === t ? s(acc) : acc), t);
    if (reduced === t || NAMELESS_NAMES.has(reduced)) return t;
    t = reduced;
  }
}
//@ chunk-yf82ynbr.js:4762-5062 placement
/**
 * 生成路径的别名变体（去掉备份/副本后缀、拆分扩展名等）用于敏感路径匹配，去掉与原路径相同的。
 */
function getPathAliasVariants(e) {
  let parts = e.split("/");
  let t = parts.at(-1) ?? "";
  let sliced = parts.slice(0, -1);
  let mapped = sliced
    .filter((l) => !isDecorationOnlyName(l))
    .map((l) => stripCopyMarks(l, COPY_MARK_READINGS));
  let s = stripCopyMarks(t, FULL_READINGS);
  let i =
    isDecorationOnlyName(t) ||
    isDecorationOnlyName(s) ||
    (t.length <= MAX_NAME_READING_LENGTH &&
      expandNameReadings(t, {
        leadingDot: true,
      }).some(isDecorationOnlyName))
      ? ""
      : s;
  let c = (l, a) => [...l, a].join("/");
  return uniq([
    c(sliced, i),
    c(sliced, stripDotHashPrefix(t)),
    c(sliced, _(t)),
    c(sliced, _(i)),
    c(mapped, t),
    c(mapped, i),
    c(mapped, _(i)),
  ]).filter((l) => l !== e);
}
//@ chunk-yf82ynbr.js:5062-5287 placement
function getBasenameVariants(e) {
  let n =
    getPlatform() === "windows" ? Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\")) : e.lastIndexOf("/");
  if (n === -1) return [];
  let sliced = e.slice(n + 1);
  return expandNameReadings(sliced, {
    leadingDot: true,
  })
    .filter((r) => r !== sliced)
    .map((r) => `${e.slice(0, n + 1)}${r}`);
}
//@ chunk-yf82ynbr.js:5287-5360 placement
function anyVariantIsClaudeState(e) {
  let pathNormalizationVariants = getPathNormalizationVariants(e);
  return pathNormalizationVariants === null
    ? true
    : pathNormalizationVariants.some(
        (pathNormalizationVariant) =>
          isAbsolute(pathNormalizationVariant) && isClaudeStatePath(pathNormalizationVariant),
      );
}
//@ chunk-yf82ynbr.js:5360-5405 placement
/**
 * isSensitiveNameOrVariant：名字或其别名变体敏感。
 */
function isSensitiveNameOrVariant(e) {
  return [e, ...getPathAliasVariants(e)].some(isSensitiveWithGitConfig);
}
//@ chunk-yf82ynbr.js:5405-5535 placement
/**
 * 判断路径最后一段（含原样与规整变体）是否为敏感文件名。
 */
function isSensitiveFileName(normalizedPath) {
  let last = splitPathSegments(normalizedPath).at(-1);
  if (last === undefined) return true;
  return nameReadingFns(last)
    .flatMap((t) => [t(last), stripTrailingJunk(t(stripTrailingJunk(last)))])
    .some((t) => isEnvFileLikeName(t) || SENSITIVE_KEY_FILE_RE.test(t));
}
//@ chunk-yf82ynbr.js:5535-5584 placement
function pathSeparatorRegex() {
  return getPlatform() === "windows" ? /[\\/]/ : "/";
}
//@ chunk-yf82ynbr.js:5584-5639 placement
function splitPathSegments(e) {
  return e.split(pathSeparatorRegex()).filter((n) => n !== "");
}
//@ chunk-yf82ynbr.js:5639-5718 placement
function containsSegmentSequence(e, n) {
  return e.some((t, r) => n.every((o, s) => e[r + s]?.includes(o) === true));
}
//@ chunk-yf82ynbr.js:5718-5845 placement = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  return filePath.some(
    (n, t) =>
      n.includes(".claude") &&
      filePath[t + 1]?.some((r) => CLAUDE_STATE_FILENAMES.some((o) => r === o || r.startsWith(`${o}.`))) ===
        true,
  );
}
//@ chunk-yf82ynbr.js:5845-5929 placement
var LIGHT_READINGS = [
  stripColonSuffix,
  stripSyncConflictMark,
  stripHashWrapper,
  stripDotHashPrefix,
  stripTrailingJunk,
];
var COPY_MARK_READINGS = [stripEditorBackupSuffix, ...LIGHT_READINGS];
var FULL_READINGS = [stripBackupSuffix, stripBackupSuffixKeepingExt, ...LIGHT_READINGS];
var DECORATION_READINGS = [...FULL_READINGS, _];
var NAMELESS_NAMES = new Set(["", ".", ".."]);
//@ chunk-yf82ynbr.js:5929-6224 placement
/**
 * 反复应用规整函数（去前导点、去副本标记等），得到名字的所有读法（有上限）。
 */
function expandNameReadings(e, { leadingDot: n = true, copyMarks: t = true } = {}) {
  let r = n ? DECORATION_READINGS : t ? FULL_READINGS : COPY_MARK_READINGS;
  if (r.every((s) => s(e) === e)) return [e];
  let o = (s, i) => {
    if (i.length === 0 || s.size > BACKUP_OR_COPY_SUFFIX_REGEX) return s;
    let filtered = uniq(i.flatMap((l) => r.map((a) => a(l)))).filter(
      (l) => !s.has(l) && !NAMELESS_NAMES.has(l),
    );
    return o(new Set([...s, ...filtered]), filtered);
  };
  return [...o(new Set([e]), [e])];
}
//@ chunk-yf82ynbr.js:6224-6305 placement
function stripBackupSuffix(e) {
  let match = regExp.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6305-6387 placement
function stripEditorBackupSuffix(e) {
  let match = regExp_2.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6387-6467 placement
function stripBackupSuffixKeepingExt(e) {
  let match = regExp_3.exec(e);
  return match === null ? e : e.slice(0, match.index) + (match[1] ?? "");
}
//@ chunk-yf82ynbr.js:6467-6549 placement
function stripColonSuffix(e) {
  let match = REMOTE_PREFIX_STRIP_FNS.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6549-6634 placement
function stripSyncConflictMark(e) {
  let match = regExp_4.exec(e);
  let t = match === null ? "" : `${match[1]}${match[2] ?? ""}`;
  return t === "" ? e : t;
}
//@ chunk-yf82ynbr.js:6634-6718 placement
function stripHashWrapper(e) {
  return e.length > 2 && e.startsWith("#") && e.endsWith("#") ? e.slice(1, -1) : e;
}
//@ chunk-yf82ynbr.js:6718-6783 placement
function stripDotHashPrefix(e) {
  return e.length > 2 && e.startsWith(".#") ? e.slice(2) : e;
}
//@ chunk-yf82ynbr.js:6783-6830 placement
function _(e) {
  return e.replace(/^\.(?=.)/s, "");
}
//@ chunk-yf82ynbr.js:6830-6856 placement
var NAME_TRAILING_JUNK = `
\r\u2028\u2029. `;
//@ chunk-yf82ynbr.js:6856-6944 placement
function stripTrailingJunk(e) {
  let n = e.length;
  while (n > 0 && NAME_TRAILING_JUNK.includes(e[n - 1] ?? "")) n -= 1;
  return e.slice(0, n);
}
//@ chunk-yf82ynbr.js:6944-7123 placement
function isDecorationOnlyName(e) {
  if (
    NAMELESS_NAMES.has(e) ||
    !DECORATION_LEAD_CHARS.includes(e[0] ?? "") ||
    e.length > MAX_NAME_READING_LENGTH
  )
    return false;
  let n = e;
  for (;;) {
    let t = stripTrailingJunk(n.replace(regExp, ""));
    let r = stripHashWrapper(t);
    let o = r === t ? stripDotHashPrefix(t) : r;
    if (o === "") return true;
    if (o === n) return false;
    n = o;
  }
}
//@ chunk-yf82ynbr.js:7123-7143 placement
/**
 * DECORATION_LEAD_CHARS：纯装饰名可能的起始字符。
 */
var DECORATION_LEAD_CHARS = `${OFFICE_LOCK_PREFIX}#${NAME_TRAILING_JUNK}`;
//@ chunk-yf82ynbr.js:7143-7361 placement
/**
 * 生成路径的规范化变体（逐段读法组合、NFKC/NFKD 与大小写折叠），组合数超限时返回 null 表示无法判定。
 */
function getPathNormalizationVariants(e) {
  if (exceedsPathVariantBudget(e)) return null;
  let n = expandPathReadings(e);
  if (n === null) return null;
  let unicodeFoldVariants = getUnicodeFoldVariants(e);
  if (unicodeFoldVariants.length === 0) return n;
  let mapped = unicodeFoldVariants.map(expandPathReadings);
  return mapped.some((o) => o === null)
    ? null
    : uniq([...n, ...unicodeFoldVariants, ...mapped.flatMap((o) => o ?? [])]).filter((o) => o !== e);
}
//@ chunk-yf82ynbr.js:7361-7455 placement
/**
 * exceedsPathVariantBudget：路径变体展开是否超出预算。
 */
function exceedsPathVariantBudget(e) {
  let parts = e.split("/");
  return (
    e.length > MAX_PATH_VARIANT_LENGTH ||
    parts.length > MAX_PATH_VARIANT_SEGMENTS ||
    parts.some((t) => t.length > MAX_NAME_READING_LENGTH)
  );
}
//@ chunk-yf82ynbr.js:7455-7909 placement
/**
 * 按段展开路径读法的笛卡尔积（中间段若可能是纯装饰名还包括省略它），超限返回 null；无变化返回空数组。
 */
function expandPathReadings(e) {
  let parts = e.split("/");
  let mapped = parts.map((o, s) => {
    let i = s === parts.length - 1;
    let c = expandNameReadings(o, {
      leadingDot: i,
      copyMarks: i,
    });
    return {
      readings: c,
      absentToo: !i && c.some(isDecorationOnlyName),
    };
  });
  if (mapped.every((o) => o.readings.length === 1 && !o.absentToo)) return [];
  let reduced = mapped.reduce(
    (acc, { readings, absentToo }) => {
      if (acc === null || readings.length > BACKUP_OR_COPY_SUFFIX_REGEX) return null;
      let flattened = acc.flatMap((l) => [
        ...readings.map((reading) => [...l, reading]),
        ...(absentToo ? [l] : []),
      ]);
      return flattened.length > BACKUP_OR_COPY_SUFFIX_REGEX ? null : flattened;
    },
    [[]],
  );
  return reduced === null ? null : uniq(reduced.map((o) => o.join("/"))).filter((o) => o !== e);
}
//@ chunk-yf82ynbr.js:7909-8069 placement
function getUnicodeFoldVariants(e) {
  if (ASCII_ONLY_RE.test(e)) return [];
  let parts = e.split("/");
  return uniq(
    UNICODE_FOLDERS.map((t) =>
      parts
        .map((r) => {
          let o = t(r);
          return o !== r && isSafeFoldVariant(o, r) ? o : r;
        })
        .join("/"),
    ),
  ).filter((t) => t !== e);
}
//@ chunk-yf82ynbr.js:8069-8271 placement
var stripIgnorableChars = (e) => e.replace(IGNORABLE_CODE_POINTS_RE, "");
var UNICODE_FOLDERS = [
  stripIgnorableChars,
  (e) => stripIgnorableChars(e).normalize("NFKC"),
  (e) =>
    stripIgnorableChars(e)
      .normalize("NFKD")
      .toLowerCase()
      .toUpperCase()
      .toLowerCase()
      .replace(/i\u0307/g, "i")
      .replace(/\u03c2/g, "\u03C3")
      .normalize("NFC"),
];
//@ chunk-yf82ynbr.js:8271-8399 placement
function isSafeFoldVariant(e, n) {
  return (
    !NAMELESS_NAMES.has(e) &&
    !e.includes("/") &&
    e.length <= MAX_NAME_READING_LENGTH &&
    [...WINDOWS_FORBIDDEN_CHARS].every((t) => e.split(t).length - 1 <= n.split(t).length - 1)
  );
}
//@ chunk-yf82ynbr.js:8399-8493 placement
var ASCII_ONLY_RE = /^[\x00-\x7f]*$/;
var IGNORABLE_CODE_POINTS_RE = /\p{Default_Ignorable_Code_Point}/gu;
var WINDOWS_FORBIDDEN_CHARS = '\\:*?"<>|';
var MAX_PATH_VARIANT_LENGTH = 4096;
var MAX_PATH_VARIANT_SEGMENTS = 256;
//@ chunk-yf82ynbr.js:8493-8681 placement
function isSensitiveBasename(e, exceptFiles = NO_EXCEPT_FILES) {
  return (
    (SENSITIVE_FILE_NAMES_LIST.includes(e) && !exceptFiles.has(e)) ||
    SENSITIVE_KEY_FILE_RE.test(e) ||
    isEnvFileLikeName(e) ||
    e.startsWith(`${CLAUDE_OWN_FILE_NAME}.`) ||
    e.startsWith(".config.json.") ||
    e.startsWith(`${CREDENTIALS_FILE_NAME}.`) ||
    e.startsWith(`${DEVICE_KEYS_FILE_NAME}.`) ||
    isNonExampleTfvars(e) ||
    isSensitiveNameInServedMode(e)
  );
}
//@ chunk-yf82ynbr.js:8681-8772 placement
function isEnvFileLikeName(e) {
  return (
    e === DOT_ENV_PREFIX ||
    (e.startsWith(`${DOT_ENV_PREFIX}.`) &&
      !NON_SECRET_FILE_SUFFIXES.includes(e.slice(DOT_ENV_PREFIX.length + 1))) ||
    endsWithEnvNotExempt(e)
  );
}
//@ chunk-yf82ynbr.js:8772-8823 placement
function isConfigFileName(e) {
  return e === CONFIG || e.startsWith(`${CONFIG}.`);
}
//@ chunk-yf82ynbr.js:8823-8885 placement
function endsWithEnvNotExempt(e) {
  return e.endsWith(DOT_ENV_PREFIX) && !isExemptFileExtension(e.slice(0, -DOT_ENV_PREFIX.length));
}
//@ chunk-yf82ynbr.js:8885-8921 placement
var TFVARS_NAME_RE = /^(.*)\.tfvars(?:\.json)?$/s;
//@ chunk-yf82ynbr.js:8921-8983 placement
function isNonExampleTfvars(e) {
  let n = TFVARS_NAME_RE.exec(e)?.[1];
  return n !== undefined && !isExemptFileExtension(n);
}
//@ chunk-yf82ynbr.js:8983-9559 placement
/**
 * SENSITIVE_SERVICE_ACCOUNT_RE：服务账号密钥文件名正则；SENSITIVE_CERT_FILE_NAMES：证书/密钥类敏感文件名；SENSITIVE_CERT_FILE_RE：证书扩展名正则（同一声明共 3 个绑定）。
 */
var SENSITIVE_FILE_NAMES = [
  "deploy_key",
  "credentials.json",
  "application_default_credentials.json",
  "fish_variables",
  "htpasswd",
  ".htdigest",
  ".msmtprc",
  ".fetchmailrc",
  ".sentryclirc",
  ".dev.vars",
  ".secrets",
  ".vault-token",
  ".dockercfg",
  ".clasprc.json",
  ".transifexrc",
  ".databrickscfg",
  ".ftpconfig",
  ".remote-sync.json",
  ".wakatime.cfg",
];
var SENSITIVE_SERVICE_ACCOUNT_RE =
  /^(?:service[-_]account(?:[-_]?key)?\.json|serviceaccountkey\.json|client_secret_.+\.apps\.googleusercontent\.com\.json|ssh_host_(?:rsa|dsa|ecdsa|ed25519)_key|fishd\.[0-9a-f]{12})$/s;
var SENSITIVE_CERT_FILE_NAMES = /^\.(?:dev\.vars\.|vault_pass)/;
var SENSITIVE_CERT_FILE_RE = /^(.*)\.(?:tfstate(?:\.\d+)?|kdbx|ovpn)$/s;
//@ chunk-yf82ynbr.js:9559-9591 placement
function isSensitiveNameInServedMode(e) {
  return isSensitiveFileNameLike(e) && isSensitiveNameCheckActive();
}
//@ chunk-yf82ynbr.js:9591-9647 placement
function isSensitiveNameCheckActive() {
  if (isCcsTenant()) return true;
  if (isHttpMcpServeInvocation()) return true;
  return false;
}
//@ chunk-yf82ynbr.js:9647-9756 placement
/**
 * 凭据配置文件的相对路径（git credentials、gh hosts.yml、gcloud 凭据库）。
 */
var CREDENTIAL_CONFIG_PATHS = [
  ["git", "credentials"],
  ["gh", "hosts.yml"],
  ["gcloud", "credentials.db"],
  ["gcloud", "access_tokens.db"],
];
//@ chunk-yf82ynbr.js:9756-9816 placement
function isCredentialConfigPath(present) {
  return CREDENTIAL_CONFIG_PATHS.some((n) => containsSegmentSequence(present.slice(-n.length), n));
}
//@ chunk-yf82ynbr.js:9816-10078 placement
/**
 * 路径（含别名变体）是否指向 git/gh/gcloud 的凭证配置文件。
 */
function isCredentialConfigPath_2(e) {
  return [e, ...getPathAliasVariants(e)].some((n) => {
    let t = splitPathSegments(n);
    if (t.some((i) => i.length > MAX_NAME_READING_LENGTH)) return true;
    let r = segmentReadings(t.at(-1) ?? "", true).flat();
    if (!CREDENTIAL_CONFIG_PATHS.some(([, i]) => r.includes(i))) return false;
    let { readingsByFold, present } = expandSegmentReadings(t);
    return (
      readingsByFold.some((i) => i.some((c) => c.length > BACKUP_OR_COPY_SUFFIX_REGEX)) ||
      isCredentialConfigPath(present)
    );
  });
}
//@ chunk-yf82ynbr.js:10078-10113 placement
/**
 * isCredentialConfigPathActive：凭证配置路径且检查生效。
 */
function isCredentialConfigPathActive(e) {
  return isCredentialConfigPath_2(e) && isSensitiveNameCheckActive();
}
//@ chunk-yf82ynbr.js:10113-10221 placement
function isSensitiveFileNameLike(e) {
  let n = SENSITIVE_CERT_FILE_RE.exec(e)?.[1];
  return (
    SENSITIVE_FILE_NAMES.includes(e) ||
    SENSITIVE_SERVICE_ACCOUNT_RE.test(e) ||
    (SENSITIVE_CERT_FILE_NAMES.test(e) && !isExemptFileExtension(e)) ||
    (n !== undefined && !isExemptFileExtension(n))
  );
}
//@ chunk-yf82ynbr.js:10221-10305 placement
/**
 * isSensitiveBasenameWithVariants：末段读法中有敏感文件名。
 */
function isSensitiveBasenameWithVariants(e) {
  return [e, ...getPathAliasVariants(e)].some((n) =>
    segmentReadings(splitPathSegments(n).at(-1) ?? "", true)
      .flat()
      .some(isSensitiveFileNameLike),
  );
}
//@ chunk-yf82ynbr.js:10305-10362 placement
function isExemptFileExtension(e) {
  return NON_SECRET_FILE_SUFFIXES.includes(e.split(".").at(-1) ?? "");
}
//@ chunk-yf82ynbr.js:10362-10453 placement
/**
 * nameReadingFns：名字读法函数列表（含冒号处理）。
 */
function nameReadingFns(e) {
  return e.includes(":")
    ? [foldName, ...MAX_PATH_SEGMENT_LENGTH.map((n) => (t) => foldProtectedDirNameLower(t.replace(n, "")))]
    : [foldName];
}
//@ chunk-yf82ynbr.js:10512-10575 placement
/**
 * isUnderSandboxPath：路径是否在某个受保护根之下。
 */
function isUnderSandboxPath(e) {
  return Be.some((n) => e === n || e.startsWith(n + sep));
}
//@ chunk-yf82ynbr.js:10575-10588 placement
/**
 * MAX_SENSITIVE_PATH_LENGTH：敏感路径长度上限。
 */
var MAX_SENSITIVE_PATH_LENGTH = 4096;
//@ chunk-yf82ynbr.js:10588-10635 placement
function safeRealpath(e) {
  return realpath(e).catch(() => {
    return;
  });
}
//@ chunk-yf82ynbr.js:10635-10824 placement
/**
 * 判断路径类别：Claude 自身或设备文件返回 own_or_device；否则名字像凭证文件时返回 credential_name（附加模式下不检查名字）。
 */
async function classifyCredentialPath(
  e,
  n,
  { attached: t = false, readable: r = false, realDirectory: o = safeRealpath } = {},
) {
  if (isUnderSandboxPath(n) || (r ? isClaudeOwnStateName(n) : await isInClaudeConfigDir(n, o)))
    return "own_or_device";
  return !t && (isSensitiveNameOrVariant(e) || (n !== e && isSensitiveNameOrVariant(n)))
    ? "credential_name"
    : undefined;
}
//@ chunk-yf82ynbr.js:10824-10879 placement
/**
 * isCredentialPath：是否是 Claude 自身或凭证类路径。
 */
async function isCredentialPath(e, n) {
  return (await classifyCredentialPath(e, n)) !== undefined;
}
//@ chunk-yf82ynbr.js:10879-11040 placement
/**
 * 路径是否在 Claude 配置目录或 CCR OAuth 令牌目录下（按真实路径比较）。
 */
async function isInClaudeConfigDir(cwd, n = safeRealpath) {
  if (isClaudeOwnStateName(cwd)) return true;
  let t = normalizeRelativePath(cwd);
  for (let r of [...getClaudeConfigDirs(), dirname(CCR_OAUTH_TOKEN_PATH)]) {
    let o = normalizeRelativePath((await n(r)) ?? resolve(r));
    if (t === o || t.startsWith(`${o}/`)) return true;
  }
  return false;
}
//@ chunk-yf82ynbr.js:11040-11078 placement
function isClaudeOwnStateName(e) {
  return isClaudeStatePath(e) || isClaudeConfigFileName(basename(e));
}
//@ chunk-yf82ynbr.js:11078-11151 placement = setCwdState (1)
function normalizeRelativePath(cwd) {
  return cwd.normalize("NFC").split(/[\\/]/).map(foldName).join("/");
}
//@ chunk-yf82ynbr.js:11151-11329 placement
function isClaudeConfigFileName(e) {
  let n = foldName(e);
  if (/^\.claude.*\.json/.test(n)) return true;
  return [...GLOBAL_CLAUDE_FILE_NAMES, ...CCR_CREDENTIAL_PATHS.map((t) => basename(t))].some((t) => {
    let r = foldName(t);
    return n === r || n === `${r}~` || n.startsWith(`${r}.`);
  });
}
export {
  isCredentialPath,
  isSensitiveBasenameWithVariants,
  isCredentialConfigPath_2,
  sensitivePathGateEnabled,
  neverTrueAsync,
  isSensitiveWithGitConfig,
  TENGU_VIOLIN_MAPLE,
  MAX_SENSITIVE_PATH_LENGTH,
  isSensitiveNameOrVariant,
  segmentReadingsFlat,
  isSensitiveFileName,
  getPathNormalizationVariants,
  exceedsPathVariantBudget,
  neverTrue,
  classifyCredentialPath,
  isUnderSandboxPath,
  isInClaudeConfigDir,
  CREDENTIAL_CONFIG_PATHS,
  isCredentialConfigPathActive,
  DECORATION_LEAD_CHARS,
  EDITOR_BACKUP_SUFFIX_REGEX,
  SYNC_CONFLICT_SUFFIX_PATTERN,
  MAX_NAME_READING_LENGTH,
  expandNameReadings,
  nameReadingFns,
  getPathAliasVariants,
};
