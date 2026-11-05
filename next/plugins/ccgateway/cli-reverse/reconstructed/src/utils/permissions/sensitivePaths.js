/**
 * utils/permissions/sensitivePaths.ts
 *
 * 敏感路径表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-eswddw2z.js (1), chunk-n1e79taz.js (67), chunk-pjb5ptr5.js (4)
 * attribution: placement 71, layout 1
 */
import { sep, isAbsolute, dirname, resolve, basename } from "path";
import { realpath } from "fs/promises";
import { sandboxPaths } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "../auth.js";
import { OAUTH_SUFFIXED_CONFIG_FILE_NAME, GLOBAL_CLAUDE_FILE_NAMES } from "../env.js";
import { foldName, foldProtectedDirNameLower } from "./protectedDirNames.js";
import { isClaudeStatePath, CLAUDE_STATE_FILENAMES, getClaudeConfigDirs } from "./claudeStatePaths.js";
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { getPlatform } from "../platform.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { CCR_OAUTH_TOKEN_PATH, CCR_CREDENTIAL_PATHS } from "../authFileDescriptor.js";
import { checkGate_OWN_OFF_FIRST } from "../../services/analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-eswddw2z.js:248-313 placement
/**
 * isUnderSandboxPath：路径是否在某个受保护根之下。
 */
function isUnderSandboxPath(inputPath, pathSeparator = sep) {
  return sandboxPaths.some(
    (sandboxPath) => inputPath === sandboxPath || inputPath.startsWith(sandboxPath + pathSeparator),
  );
}
//@ chunk-n1e79taz.js:678-953 placement
var EDITOR_BACKUP_SUFFIX_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COPY_MARK_SUFFIX_RE;
var BACKUP_OR_COPY_SUFFIX_RE;
var OFFICE_LOCK_PREFIX;
deferInit("chunk-n1e79taz.js:678", () => {
  EDITOR_BACKUP_SUFFIX_RE = String.raw`\.sw[a-p]|\.un~|\.rej|\.save\.\d+|\.save|\.tmp|\.temp|\.bak|\.old|\.orig|\.backup|\.~\d+~|~`;
  COPY_MARK_SUFFIX_RE = String.raw`\.part(?:ial)?|\.(?:cr)?download| copy| - copy| \d+| ?\(\d+\)| \((?=[^()/]*(?:conflict|copy))[^()/]*\)|\.sync-conflict-[\w-]+`;
  BACKUP_OR_COPY_SUFFIX_RE = `${EDITOR_BACKUP_SUFFIX_RE}|${COPY_MARK_SUFFIX_RE}`;
  OFFICE_LOCK_PREFIX = ".~ (";
});
//@ chunk-n1e79taz.js:953-3297 placement
/**
 * 敏感目录与文件名的表：ne 常见敏感目录名；te 敏感目录路径段；re 敏感文件名；w 敏感密钥文件后缀正则；d DOT_ENV 前缀；oe Claude 自用文件名；G 非机密后缀；M/se/ie 三种匹配正则；f 名称变体条数上限 64；U$e 255 与 le 是路径读长上限与切分正则；ce 远程前缀正则；w3o/E3o/ae 编辑器备份与同步冲突后缀；ue/x 是 .git 与 config。
 */
var SENSITIVE_DIR_NAMES; // deferred: uses CREDENTIALS_FILE_NAME (../auth.js) of its import cycle while loading; runs once the cycle is complete
var SENSITIVE_DIR_PATHS;
var SENSITIVE_FILE_NAMES_LIST;
var SENSITIVE_KEY_FILE_RE;
var DOT_ENV_PREFIX;
var CLAUDE_OWN_FILE_NAME;
var NON_SECRET_FILE_SUFFIXES;
var regExp;
var regExp_2;
var regExp_3;
var MAX_NAME_VARIANTS;
var MAX_NAME_READING_LENGTH;
var PATH_SEGMENT_SPLIT_RES;
var REMOTE_PREFIX_RE;
var EDITOR_BACKUP_SUFFIX_SOURCE;
var SYNC_CONFLICT_SUFFIX_PATTERN;
var BACKUP_OR_COPY_SUFFIX_REGEX;
var GIT_DIR_NAME;
var CONFIG;
deferInit("chunk-n1e79taz.js:953", () => {
  SENSITIVE_DIR_NAMES = [".ssh", ".aws", ".azure", ".gnupg", ".kube", ".docker"];
  SENSITIVE_DIR_PATHS = [
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
  SENSITIVE_FILE_NAMES_LIST = [
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
  SENSITIVE_KEY_FILE_RE =
    /(?:\.(?:pem|key|p12|pfx|keystore|jks)|_(?:rsa|dsa|ecdsa|ed25519)(?:_sk(?:_rk(?:_.*)?)?)?|secrets?\.(?:ya?ml|json|toml))$/s;
  DOT_ENV_PREFIX = ".env";
  CLAUDE_OWN_FILE_NAME = OAUTH_SUFFIXED_CONFIG_FILE_NAME;
  NON_SECRET_FILE_SUFFIXES = ["example", "sample", "template", "dist"];
  regExp = new RegExp(`(?:${BACKUP_OR_COPY_SUFFIX_RE})$`, "i");
  regExp_2 = new RegExp(`(?:${EDITOR_BACKUP_SUFFIX_RE})$`, "i");
  regExp_3 = new RegExp(
    `(?:${BACKUP_OR_COPY_SUFFIX_RE})((?!(?:${BACKUP_OR_COPY_SUFFIX_RE})$)(?!\\.\\d+$)\\.[^./]+)$`,
    "i",
  );
  MAX_NAME_VARIANTS = 64;
  MAX_NAME_READING_LENGTH = 255;
  PATH_SEGMENT_SPLIT_RES = [/(?!)/, /:[^:]*$/, /:[^:]*:[^:]*$/, /:.*$/s];
  REMOTE_PREFIX_RE = /~[^/~.][^/~]*$/;
  EDITOR_BACKUP_SUFFIX_SOURCE = "(?:BACKUP|BASE|LOCAL|REMOTE)";
  SYNC_CONFLICT_SUFFIX_PATTERN = `_${EDITOR_BACKUP_SUFFIX_SOURCE}_(?:[LR]CONFL_)?\\d{2,}`;
  BACKUP_OR_COPY_SUFFIX_REGEX = new RegExp(`^(.*)${SYNC_CONFLICT_SUFFIX_PATTERN}(\\.[^./]*)?$`, "is");
  GIT_DIR_NAME = ".git";
  CONFIG = "config";
});
//@ chunk-n1e79taz.js:3297-3610 placement
/**
 * 路径（及其大小写折叠、副本标记去除等变体）是否命中 Claude 自身状态路径。
 */
function isClaudeStatePathVariant(inputPath, segments = splitPathSegments(inputPath)) {
  if (!isAbsolute(inputPath)) return false;
  let foldedPath = `/${segments.map(foldName).join("/")}`;
  if (
    (foldedPath === inputPath ? [inputPath] : [inputPath, foldedPath]).some(
      (variant) => isClaudeStatePath(variant) || getBasenameVariants(variant).some(isClaudeStatePath),
    )
  )
    return true;
  let originalSpelling = `/${segments.join("/")}`;
  if (
    (originalSpelling === foldedPath ? [originalSpelling] : [originalSpelling, foldedPath]).some(
      anyVariantIsClaudeState,
    )
  )
    return true;
  let strippedSpelling = `/${segments.map((segment, index) => (index === segments.length - 1 ? segment : stripCopyMarks(segment, FULL_READINGS))).join("/")}`;
  if (
    strippedSpelling !== originalSpelling &&
    (isClaudeStatePath(strippedSpelling) || getBasenameVariants(strippedSpelling).some(isClaudeStatePath))
  )
    return true;
  return false;
}
//@ chunk-n1e79taz.js:3610-3687 placement
/**
 * isSensitiveWithGitConfig：把 .git 下 config 也视为敏感。
 */
function isSensitiveWithGitConfig(inputPath) {
  return isSensitivePath(inputPath, {
    exceptFiles: NO_EXCEPT_FILES,
    withGitConfigBelowGitFolders: true,
  });
}
//@ chunk-n1e79taz.js:3687-3701 placement
var NO_EXCEPT_FILES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n1e79taz.js:3687", () => {
  NO_EXCEPT_FILES = new Set();
});
//@ chunk-n1e79taz.js:3701-4081 placement
/**
 * 路径是否敏感：段过长、Claude 状态路径、敏感目录名、敏感路径前缀、全局 Claude 目录，或末段为敏感文件（可排除部分文件）；可选把 .git 目录下的 config 视为敏感。
 */
function isSensitivePath(inputPath, { exceptFiles, withGitConfigBelowGitFolders }) {
  let segments = splitPathSegments(inputPath);
  if (segments.some((segment) => segment.length > MAX_NAME_READING_LENGTH)) return true;
  if (isClaudeStatePathVariant(inputPath, segments)) return true;
  let { readingsByFold, readings, present } = expandSegmentReadings(segments);
  let baseReadings = readings.at(-1) ?? [];
  return (
    readingsByFold.some((foldGroup) => foldGroup.some((variant) => variant.length > MAX_NAME_VARIANTS)) ||
    readings.some((reading) => reading.some((name) => SENSITIVE_DIR_NAMES.includes(name))) ||
    SENSITIVE_DIR_PATHS.some(
      (dirPath) => containsSegmentSequence(readings, dirPath) || containsSegmentSequence(present, dirPath),
    ) ||
    (isCredentialConfigPath(present) && isSensitiveNameCheckActive()) ||
    isInGlobalClaudeFolder(readings) ||
    isInGlobalClaudeFolder(present) ||
    baseReadings.some((name) => isSensitiveBasename(name, exceptFiles)) ||
    (withGitConfigBelowGitFolders && hasConfigUnderGitDir(readings))
  );
}
//@ chunk-n1e79taz.js:4081-4181 placement
function hasConfigUnderGitDir(segments) {
  return (
    (segments.at(-1) ?? []).some(isConfigFileName) &&
    segments.slice(0, -1).some((segment) => segment.some((name) => name.endsWith(GIT_DIR_NAME)))
  );
}
//@ chunk-n1e79taz.js:4181-4358 placement
function expandSegmentReadings(segments) {
  let mapped = segments.map((segment, index) => segmentReadings(segment, index === segments.length - 1));
  let mapped_2 = mapped.map((readings) => normalizeCaseForComparison_2(readings.flat()));
  return {
    readingsByFold: mapped,
    readings: mapped_2,
    present: mapped_2.filter(
      (readings, index) => index === segments.length - 1 || !mapped[index]?.[0]?.some(isDecorationOnlyName),
    ),
  };
}
//@ chunk-n1e79taz.js:4358-4471 placement
function segmentReadings(name, leadingDot) {
  let baseReadings = expandNameReadings(name, {
    leadingDot,
  });
  return nameReadingFns(name).map((foldFn) =>
    normalizeCaseForComparison_2([
      ...expandNameReadings(foldFn(name), {
        leadingDot,
      }),
      ...baseReadings.map(foldFn),
    ]),
  );
}
//@ chunk-n1e79taz.js:4471-4512 placement
/**
 * segmentReadingsFlat：某段的全部读法。
 */
function segmentReadingsFlat(name) {
  return normalizeCaseForComparison_2(segmentReadings(name, false).flat());
}
//@ chunk-n1e79taz.js:4512-4553 layout
function segmentReadingsCaseFolded(name) {
  return normalizeCaseForComparison_2(segmentReadings(name, true).flat());
}
//@ chunk-n1e79taz.js:4553-4681 placement
function stripCopyMarks(name, readings) {
  if (name.length > MAX_NAME_READING_LENGTH) return name;
  let current = name;
  for (;;) {
    let reduced = readings.reduce((acc, reading) => (acc === current ? reading(acc) : acc), current);
    if (reduced === current || NAMELESS_NAMES.has(reduced)) return current;
    current = reduced;
  }
}
//@ chunk-n1e79taz.js:4681-4981 placement
/**
 * 生成路径的别名变体（去掉备份/副本后缀、拆分扩展名等）用于敏感路径匹配，去掉与原路径相同的。
 */
function getPathAliasVariants(inputPath) {
  let parts = inputPath.split("/");
  let baseName = parts.at(-1) ?? "";
  let sliced = parts.slice(0, -1);
  let mapped = sliced
    .filter((segment) => !isDecorationOnlyName(segment))
    .map((segment) => stripCopyMarks(segment, COPY_MARK_READINGS));
  let strippedBase = stripCopyMarks(baseName, FULL_READINGS);
  let baseReading =
    isDecorationOnlyName(baseName) ||
    isDecorationOnlyName(strippedBase) ||
    (baseName.length <= MAX_NAME_READING_LENGTH &&
      expandNameReadings(baseName, {
        leadingDot: true,
      }).some(isDecorationOnlyName))
      ? ""
      : strippedBase;
  let joinVariant = (pathParts, base) => [...pathParts, base].join("/");
  return normalizeCaseForComparison_2([
    joinVariant(sliced, baseReading),
    joinVariant(sliced, stripDotHashPrefix(baseName)),
    joinVariant(sliced, stripLeadingDot(baseName)),
    joinVariant(sliced, stripLeadingDot(baseReading)),
    joinVariant(mapped, baseName),
    joinVariant(mapped, baseReading),
    joinVariant(mapped, stripLeadingDot(baseReading)),
  ]).filter((variant) => variant !== inputPath);
}
//@ chunk-n1e79taz.js:4981-5206 placement
function getBasenameVariants(inputPath) {
  let separatorIndex =
    getPlatform() === "windows"
      ? Math.max(inputPath.lastIndexOf("/"), inputPath.lastIndexOf("\\"))
      : inputPath.lastIndexOf("/");
  if (separatorIndex === -1) return [];
  let sliced = inputPath.slice(separatorIndex + 1);
  return expandNameReadings(sliced, {
    leadingDot: true,
  })
    .filter((reading) => reading !== sliced)
    .map((reading) => `${inputPath.slice(0, separatorIndex + 1)}${reading}`);
}
//@ chunk-n1e79taz.js:5206-5279 placement
function anyVariantIsClaudeState(path) {
  let pathNormalizationVariants = getPathNormalizationVariants(path);
  return pathNormalizationVariants === null
    ? true
    : pathNormalizationVariants.some(
        (pathNormalizationVariant) =>
          isAbsolute(pathNormalizationVariant) && isClaudeStatePath(pathNormalizationVariant),
      );
}
//@ chunk-n1e79taz.js:5279-5324 placement
/**
 * isSensitiveNameOrVariant：名字或其别名变体敏感。
 */
function isSensitiveNameOrVariant(name) {
  return [name, ...getPathAliasVariants(name)].some(isSensitiveWithGitConfig);
}
//@ chunk-n1e79taz.js:5324-5458 placement
/**
 * 判断路径最后一段（含原样与规整变体）是否为敏感文件名。
 */
function isSensitiveFileName(filePath) {
  let last = splitPathSegments(filePath).at(-1);
  if (last === undefined) return true;
  return nameReadingFns(last)
    .flatMap((readName) => [readName(last), stripTrailingJunk(readName(stripTrailingJunk(last)))])
    .some((name) => isEnvFileLikeName(name) || SENSITIVE_KEY_FILE_RE.test(name));
}
//@ chunk-n1e79taz.js:5458-5508 placement
function pathSeparatorRegex() {
  return getPlatform() === "windows" ? /[\\/]/ : "/";
}
//@ chunk-n1e79taz.js:5508-5564 placement
function splitPathSegments(inputPath) {
  return inputPath.split(pathSeparatorRegex()).filter((segment) => segment !== "");
}
//@ chunk-n1e79taz.js:5564-5645 placement
function containsSegmentSequence(segments, sequence) {
  return segments.some((segment, index) =>
    sequence.every((name, offset) => segments[index + offset]?.includes(name) === true),
  );
}
//@ chunk-n1e79taz.js:5645-5774 placement (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder(filePath) {
  return filePath.some(
    (segment, index) =>
      segment.includes(".claude") &&
      filePath[index + 1]?.some((nextSegment) =>
        CLAUDE_STATE_FILENAMES.some(
          (fileName) => nextSegment === fileName || nextSegment.startsWith(`${fileName}.`),
        ),
      ) === true,
  );
}
//@ chunk-n1e79taz.js:5774-5860 placement
var LIGHT_READINGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COPY_MARK_READINGS;
var FULL_READINGS;
var DECORATION_READINGS;
var NAMELESS_NAMES;
deferInit("chunk-n1e79taz.js:5774", () => {
  LIGHT_READINGS = [
    stripColonSuffix,
    stripSyncConflictMark,
    stripHashWrapper,
    stripDotHashPrefix,
    stripTrailingJunk,
  ];
  COPY_MARK_READINGS = [stripEditorBackupSuffix, ...LIGHT_READINGS];
  FULL_READINGS = [stripBackupSuffix, stripBackupSuffixKeepingExt, ...LIGHT_READINGS];
  DECORATION_READINGS = [...FULL_READINGS, stripLeadingDot];
  NAMELESS_NAMES = new Set(["", ".", ".."]);
});
//@ chunk-n1e79taz.js:5860-6157 placement
/**
 * 反复应用规整函数（去前导点、去副本标记等），得到名字的所有读法（有上限）。
 */
function expandNameReadings(name, { leadingDot = true, copyMarks = true } = {}) {
  let readings = leadingDot ? DECORATION_READINGS : copyMarks ? FULL_READINGS : COPY_MARK_READINGS;
  if (readings.every((reading) => reading(name) === name)) return [name];
  let expand = (known, frontier) => {
    if (frontier.length === 0 || known.size > MAX_NAME_VARIANTS) return known;
    let frontier_2 = normalizeCaseForComparison_2(
      frontier.flatMap((variant) => readings.map((fn) => fn(variant))),
    ).filter((next) => !known.has(next) && !NAMELESS_NAMES.has(next));
    return expand(new Set([...known, ...frontier_2]), frontier_2);
  };
  return [...expand(new Set([name]), [name])];
}
//@ chunk-n1e79taz.js:6157-6238 placement
function stripBackupSuffix(name) {
  let match = regExp.exec(name);
  return match === null || match.index === 0 ? name : name.slice(0, match.index);
}
//@ chunk-n1e79taz.js:6238-6319 placement
function stripEditorBackupSuffix(name) {
  let match = regExp_2.exec(name);
  return match === null || match.index === 0 ? name : name.slice(0, match.index);
}
//@ chunk-n1e79taz.js:6319-6398 placement
function stripBackupSuffixKeepingExt(name) {
  let match = regExp_3.exec(name);
  return match === null ? name : name.slice(0, match.index) + (match[1] ?? "");
}
//@ chunk-n1e79taz.js:6398-6479 placement
function stripColonSuffix(name) {
  let match = REMOTE_PREFIX_RE.exec(name);
  return match === null || match.index === 0 ? name : name.slice(0, match.index);
}
//@ chunk-n1e79taz.js:6479-6564 placement
function stripSyncConflictMark(name) {
  let match = BACKUP_OR_COPY_SUFFIX_REGEX.exec(name);
  let stripped = match === null ? "" : `${match[1]}${match[2] ?? ""}`;
  return stripped === "" ? name : stripped;
}
//@ chunk-n1e79taz.js:6564-6648 placement
function stripHashWrapper(name) {
  return name.length > 2 && name.startsWith("#") && name.endsWith("#") ? name.slice(1, -1) : name;
}
//@ chunk-n1e79taz.js:6648-6713 placement
function stripDotHashPrefix(name) {
  return name.length > 2 && name.startsWith(".#") ? name.slice(2) : name;
}
//@ chunk-n1e79taz.js:6713-6760 placement
function stripLeadingDot(name) {
  return name.replace(/^\.(?=.)/s, "");
}
//@ chunk-n1e79taz.js:6760-6786 placement
var NAME_TRAILING_JUNK = `
\r\u2028\u2029. `;
//@ chunk-n1e79taz.js:6786-6876 placement
function stripTrailingJunk(name) {
  let end = name.length;
  while (end > 0 && NAME_TRAILING_JUNK.includes(name[end - 1] ?? "")) end -= 1;
  return name.slice(0, end);
}
//@ chunk-n1e79taz.js:6876-7057 placement
function isDecorationOnlyName(name) {
  if (
    NAMELESS_NAMES.has(name) ||
    !DECORATION_LEAD_CHARS.includes(name[0] ?? "") ||
    name.length > MAX_NAME_READING_LENGTH
  )
    return false;
  let current = name;
  for (;;) {
    let trimmed = stripTrailingJunk(current.replace(regExp, ""));
    let unwrapped = stripHashWrapper(trimmed);
    let nextName = unwrapped === trimmed ? stripDotHashPrefix(trimmed) : unwrapped;
    if (nextName === "") return true;
    if (nextName === current) return false;
    current = nextName;
  }
}
//@ chunk-n1e79taz.js:7057-7077 placement
/**
 * DECORATION_LEAD_CHARS：纯装饰名可能的起始字符。
 */
var DECORATION_LEAD_CHARS; // deferred: uses EDITOR_BACKUP_SUFFIX_RE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n1e79taz.js:7057", () => {
  DECORATION_LEAD_CHARS = `${OFFICE_LOCK_PREFIX}#${NAME_TRAILING_JUNK}`;
});
//@ chunk-n1e79taz.js:7077-7296 placement
/**
 * 生成路径的规范化变体（逐段读法组合、NFKC/NFKD 与大小写折叠），组合数超限时返回 null 表示无法判定。
 */
function getPathNormalizationVariants(inputPath) {
  if (exceedsPathVariantBudget(inputPath)) return null;
  let pathReadings = expandPathReadings(inputPath);
  if (pathReadings === null) return null;
  let unicodeFoldVariants = getUnicodeFoldVariants(inputPath);
  if (unicodeFoldVariants.length === 0) return pathReadings;
  let mapped = unicodeFoldVariants.map(expandPathReadings);
  return mapped.some((foldReadings) => foldReadings === null)
    ? null
    : normalizeCaseForComparison_2([
        ...pathReadings,
        ...unicodeFoldVariants,
        ...mapped.flatMap((variantList) => variantList ?? []),
      ]).filter((variant) => variant !== inputPath);
}
//@ chunk-n1e79taz.js:7296-7390 placement
/**
 * exceedsPathVariantBudget：路径变体展开是否超出预算。
 */
function exceedsPathVariantBudget(inputPath) {
  let parts = inputPath.split("/");
  return (
    inputPath.length > MAX_PATH_VARIANT_LENGTH ||
    parts.length > MAX_PATH_VARIANT_SEGMENTS ||
    parts.some((part) => part.length > MAX_NAME_READING_LENGTH)
  );
}
//@ chunk-n1e79taz.js:7390-7848 placement
/**
 * 按段展开路径读法的笛卡尔积（中间段若可能是纯装饰名还包括省略它），超限返回 null；无变化返回空数组。
 */
function expandPathReadings(inputPath) {
  let parts = inputPath.split("/");
  let mapped = parts.map((part, index) => {
    let isLast = index === parts.length - 1;
    let readings = expandNameReadings(part, {
      leadingDot: isLast,
      copyMarks: isLast,
    });
    return {
      readings,
      absentToo: !isLast && readings.some(isDecorationOnlyName),
    };
  });
  if (mapped.every((partReadings) => partReadings.readings.length === 1 && !partReadings.absentToo))
    return [];
  let reduced = mapped.reduce(
    (acc, { readings, absentToo }) => {
      if (acc === null || readings.length > MAX_NAME_VARIANTS) return null;
      let flattened = acc.flatMap((prefix) => [
        ...readings.map((reading) => [...prefix, reading]),
        ...(absentToo ? [prefix] : []),
      ]);
      return flattened.length > MAX_NAME_VARIANTS ? null : flattened;
    },
    [[]],
  );
  return reduced === null
    ? null
    : normalizeCaseForComparison_2(reduced.map((variant) => variant.join("/"))).filter(
        (variant) => variant !== inputPath,
      );
}
//@ chunk-n1e79taz.js:7848-8009 placement
function getUnicodeFoldVariants(inputPath) {
  if (ASCII_ONLY_RE.test(inputPath)) return [];
  let parts = inputPath.split("/");
  return normalizeCaseForComparison_2(
    UNICODE_FOLDERS.map((fold) =>
      parts
        .map((part) => {
          let folded = fold(part);
          return folded !== part && isSafeFoldVariant(folded, part) ? folded : part;
        })
        .join("/"),
    ),
  ).filter((variant) => variant !== inputPath);
}
//@ chunk-n1e79taz.js:8009-8211 placement
var stripIgnorableChars = (text) => text.replace(IGNORABLE_CODE_POINTS_RE, "");
var UNICODE_FOLDERS = [
  stripIgnorableChars,
  (text) => stripIgnorableChars(text).normalize("NFKC"),
  (text) =>
    stripIgnorableChars(text)
      .normalize("NFKD")
      .toLowerCase()
      .toUpperCase()
      .toLowerCase()
      .replace(/i\u0307/g, "i")
      .replace(/\u03c2/g, "\u03C3")
      .normalize("NFC"),
];
//@ chunk-n1e79taz.js:8211-8339 placement
function isSafeFoldVariant(folded, original) {
  return (
    !NAMELESS_NAMES.has(folded) &&
    !folded.includes("/") &&
    folded.length <= MAX_NAME_READING_LENGTH &&
    [...WINDOWS_FORBIDDEN_CHARS].every(
      (character) => folded.split(character).length - 1 <= original.split(character).length - 1,
    )
  );
}
//@ chunk-n1e79taz.js:8339-8433 placement
var ASCII_ONLY_RE = /^[\x00-\x7f]*$/;
var IGNORABLE_CODE_POINTS_RE = /\p{Default_Ignorable_Code_Point}/gu;
var WINDOWS_FORBIDDEN_CHARS = '\\:*?"<>|';
var MAX_PATH_VARIANT_LENGTH = 4096;
var MAX_PATH_VARIANT_SEGMENTS = 256;
//@ chunk-n1e79taz.js:8433-8620 placement
function isSensitiveBasename(baseName, exceptFiles = NO_EXCEPT_FILES) {
  return (
    (SENSITIVE_FILE_NAMES_LIST.includes(baseName) && !exceptFiles.has(baseName)) ||
    SENSITIVE_KEY_FILE_RE.test(baseName) ||
    isEnvFileLikeName(baseName) ||
    baseName.startsWith(`${CLAUDE_OWN_FILE_NAME}.`) ||
    baseName.startsWith(".config.json.") ||
    baseName.startsWith(`${CREDENTIALS_FILE_NAME}.`) ||
    baseName.startsWith(`${DEVICE_KEYS_FILE_NAME}.`) ||
    isNonExampleTfvars(baseName) ||
    isSensitiveNameInServedMode(baseName)
  );
}
//@ chunk-n1e79taz.js:8620-8711 placement
function isEnvFileLikeName(name) {
  return (
    name === DOT_ENV_PREFIX ||
    (name.startsWith(`${DOT_ENV_PREFIX}.`) &&
      !NON_SECRET_FILE_SUFFIXES.includes(name.slice(DOT_ENV_PREFIX.length + 1))) ||
    endsWithEnvNotExempt(name)
  );
}
//@ chunk-n1e79taz.js:8711-8762 placement
function isConfigFileName(name) {
  return name === CONFIG || name.startsWith(`${CONFIG}.`);
}
//@ chunk-n1e79taz.js:8762-8824 placement
function endsWithEnvNotExempt(name) {
  return name.endsWith(DOT_ENV_PREFIX) && !isExemptFileExtension(name.slice(0, -DOT_ENV_PREFIX.length));
}
//@ chunk-n1e79taz.js:8824-8860 placement
var TFVARS_NAME_RE = /^(.*)\.tfvars(?:\.json)?$/s;
//@ chunk-n1e79taz.js:8860-8922 placement
function isNonExampleTfvars(name) {
  let extension = TFVARS_NAME_RE.exec(name)?.[1];
  return extension !== undefined && !isExemptFileExtension(extension);
}
//@ chunk-n1e79taz.js:8922-9498 placement
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
//@ chunk-n1e79taz.js:9498-9532 placement
function isSensitiveNameInServedMode(name) {
  return isSensitiveFileNameLike(name) && isSensitiveNameCheckActive();
}
//@ chunk-n1e79taz.js:9532-9588 placement
function isSensitiveNameCheckActive() {
  if (isCcsTenant()) return true;
  if (isHttpMcpServeInvocation()) return true;
  return false;
}
//@ chunk-n1e79taz.js:9588-9697 placement
/**
 * 凭据配置文件的相对路径（git credentials、gh hosts.yml、gcloud 凭据库）。
 */
var CREDENTIAL_CONFIG_PATHS = [
  ["git", "credentials"],
  ["gh", "hosts.yml"],
  ["gcloud", "credentials.db"],
  ["gcloud", "access_tokens.db"],
];
//@ chunk-n1e79taz.js:9697-9759 placement
function isCredentialConfigPath(present) {
  return CREDENTIAL_CONFIG_PATHS.some((segments) =>
    containsSegmentSequence(present.slice(-segments.length), segments),
  );
}
//@ chunk-n1e79taz.js:9759-10023 placement
/**
 * 路径（含别名变体）是否指向 git/gh/gcloud 的凭证配置文件。
 */
function isCredentialConfigPath_2(inputPath) {
  return [inputPath, ...getPathAliasVariants(inputPath)].some((variantPath) => {
    let segments = splitPathSegments(variantPath);
    if (segments.some((segment) => segment.length > MAX_NAME_READING_LENGTH)) return true;
    let baseNameReadings = segmentReadings(segments.at(-1) ?? "", true).flat();
    if (!CREDENTIAL_CONFIG_PATHS.some(([, credentialName]) => baseNameReadings.includes(credentialName)))
      return false;
    let { readingsByFold, present } = expandSegmentReadings(segments);
    return (
      readingsByFold.some((foldGroup) => foldGroup.some((variant) => variant.length > MAX_NAME_VARIANTS)) ||
      isCredentialConfigPath(present)
    );
  });
}
//@ chunk-n1e79taz.js:10023-10058 placement
/**
 * isCredentialConfigPathActive：凭证配置路径且检查生效。
 */
function isCredentialConfigPathActive(inputPath) {
  return isCredentialConfigPath_2(inputPath) && isSensitiveNameCheckActive();
}
//@ chunk-n1e79taz.js:10058-10168 placement
function isSensitiveFileNameLike(name) {
  let stem = SENSITIVE_CERT_FILE_RE.exec(name)?.[1];
  return (
    SENSITIVE_FILE_NAMES.includes(name) ||
    SENSITIVE_SERVICE_ACCOUNT_RE.test(name) ||
    (SENSITIVE_CERT_FILE_NAMES.test(name) && !isExemptFileExtension(name)) ||
    (stem !== undefined && !isExemptFileExtension(stem))
  );
}
//@ chunk-n1e79taz.js:10168-10254 placement
/**
 * isSensitiveBasenameWithVariants：末段读法中有敏感文件名。
 */
function isSensitiveBasenameWithVariants(inputPath) {
  return [inputPath, ...getPathAliasVariants(inputPath)].some((variantPath) =>
    segmentReadings(splitPathSegments(variantPath).at(-1) ?? "", true)
      .flat()
      .some(isSensitiveFileNameLike),
  );
}
//@ chunk-n1e79taz.js:10254-10311 placement
function isExemptFileExtension(name) {
  return NON_SECRET_FILE_SUFFIXES.includes(name.split(".").at(-1) ?? "");
}
//@ chunk-n1e79taz.js:10311-10401 placement
/**
 * nameReadingFns：名字读法函数列表（含冒号处理）。
 */
function nameReadingFns(name) {
  return name.includes(":")
    ? [
        foldName,
        ...PATH_SEGMENT_SPLIT_RES.map(
          (pattern) => (segment) => foldProtectedDirNameLower(segment.replace(pattern, "")),
        ),
      ]
    : [foldName];
}
//@ chunk-n1e79taz.js:10401-10414 placement
/**
 * MAX_SENSITIVE_PATH_LENGTH：敏感路径长度上限。
 */
var MAX_SENSITIVE_PATH_LENGTH = 4096;
//@ chunk-n1e79taz.js:10414-10461 placement
function safeRealpath(inputPath) {
  return realpath(inputPath).catch(() => {
    return;
  });
}
//@ chunk-n1e79taz.js:10461-10650 placement
/**
 * 判断路径类别：Claude 自身或设备文件返回 own_or_device；否则名字像凭证文件时返回 credential_name（附加模式下不检查名字）。
 */
async function classifyCredentialPath(
  inputPath,
  resolvedPath,
  { attached = false, readable = false, realDirectory = safeRealpath } = {},
) {
  if (
    isUnderSandboxPath(resolvedPath) ||
    (readable ? isClaudeOwnStateName(resolvedPath) : await isInClaudeConfigDir(resolvedPath, realDirectory))
  )
    return "own_or_device";
  return !attached &&
    (isSensitiveNameOrVariant(inputPath) ||
      (resolvedPath !== inputPath && isSensitiveNameOrVariant(resolvedPath)))
    ? "credential_name"
    : undefined;
}
//@ chunk-n1e79taz.js:10650-10705 placement
/**
 * isCredentialPath：是否是 Claude 自身或凭证类路径。
 */
async function isCredentialPath(inputPath, resolvedPath) {
  return (await classifyCredentialPath(inputPath, resolvedPath)) !== undefined;
}
//@ chunk-n1e79taz.js:10705-10867 placement
/**
 * 路径是否在 Claude 配置目录或 CCR OAuth 令牌目录下（按真实路径比较）。
 */
async function isInClaudeConfigDir(cwdPath, realDirectory = safeRealpath) {
  if (isClaudeOwnStateName(cwdPath)) return true;
  let normalizedCwd = normalizeRelativePath(cwdPath);
  for (let configDir of [...getClaudeConfigDirs(), dirname(CCR_OAUTH_TOKEN_PATH)]) {
    let normalizedConfigDir = normalizeRelativePath((await realDirectory(configDir)) ?? resolve(configDir));
    if (normalizedCwd === normalizedConfigDir || normalizedCwd.startsWith(`${normalizedConfigDir}/`))
      return true;
  }
  return false;
}
//@ chunk-n1e79taz.js:10867-10905 placement
function isClaudeOwnStateName(inputPath) {
  return isClaudeStatePath(inputPath) || isClaudeConfigFileName(basename(inputPath));
}
//@ chunk-n1e79taz.js:10905-10978 placement (2.1.88 match: setCwdState, 1)
function normalizeRelativePath(cwd) {
  return cwd.normalize("NFC").split(/[\\/]/).map(foldName).join("/");
}
//@ chunk-n1e79taz.js:10978-11156 placement
function isClaudeConfigFileName(fileName) {
  let foldedName = foldName(fileName);
  if (/^\.claude.*\.json/.test(foldedName)) return true;
  return [
    ...GLOBAL_CLAUDE_FILE_NAMES,
    ...CCR_CREDENTIAL_PATHS.map((credentialPath) => basename(credentialPath)),
  ].some((knownName) => {
    let foldedKnown = foldName(knownName);
    return (
      foldedName === foldedKnown ||
      foldedName === `${foldedKnown}~` ||
      foldedName.startsWith(`${foldedKnown}.`)
    );
  });
}
//@ chunk-pjb5ptr5.js:228-257 placement
var TENGU_VIOLIN_MAPLE = "tengu_violin_maple";
//@ chunk-pjb5ptr5.js:257-320 placement
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
//@ chunk-pjb5ptr5.js:320-350 placement
/**
 * neverTrueAsync：恒 false 的异步占位（构建时裁掉）。
 */
async function neverTrueAsync() {
  return false;
}
//@ chunk-pjb5ptr5.js:350-374 placement
/**
 * neverTrue：恒 false 的占位（构建时裁掉）。
 */
function neverTrue() {
  return false;
}
export {
  sensitivePathGateEnabled,
  neverTrueAsync,
  isSensitiveWithGitConfig,
  isSensitiveFileName,
  neverTrue,
  classifyCredentialPath,
  isUnderSandboxPath,
  isInClaudeConfigDir,
  getPathNormalizationVariants,
  isSensitiveNameOrVariant,
  exceedsPathVariantBudget,
  BACKUP_OR_COPY_SUFFIX_RE,
  SENSITIVE_DIR_NAMES,
  SENSITIVE_DIR_PATHS,
  CREDENTIAL_CONFIG_PATHS,
  MAX_NAME_READING_LENGTH,
  nameReadingFns,
  stripTrailingJunk,
  expandNameReadings,
  MAX_NAME_VARIANTS,
  isSensitiveBasename,
  isSensitiveFileNameLike,
  segmentReadingsFlat,
  pathSeparatorRegex,
  containsSegmentSequence,
  isClaudeStatePathVariant,
  hasConfigUnderGitDir,
  getUnicodeFoldVariants,
  getPathAliasVariants,
  segmentReadingsCaseFolded,
  isCredentialConfigPath_2,
  isSensitiveBasenameWithVariants,
  isInGlobalClaudeFolder,
  MAX_SENSITIVE_PATH_LENGTH,
  isCredentialPath,
  TENGU_VIOLIN_MAPLE,
  isCredentialConfigPathActive,
  DECORATION_LEAD_CHARS,
  EDITOR_BACKUP_SUFFIX_SOURCE,
  SYNC_CONFLICT_SUFFIX_PATTERN,
};
