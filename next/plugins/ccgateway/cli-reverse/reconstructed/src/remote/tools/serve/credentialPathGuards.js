/**
 * remote/tools/serve/credentialPathGuards.ts
 *
 * 2.1.316 新增：凭证文件路径与凭证命令识别守卫
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6d2p9h2d.js (42)
 * attribution: placement 42
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir } from "os";
import { join } from "path";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { logError } from "../../../utils/log.js";
import { countWhere } from "../../../utils/collections.js";
import { memoizeAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getSessionPathsCache } from "../../../utils/sessionPathsCache.js";
import { useSecurityParser } from "../../../tools/BashTool/readOnlyShellCheck.js";
import { getPlatform } from "../../../utils/platform.js";
import { expandPath } from "../../../utils/path.js";
import {
  claudeStateGlobs,
  isClaudeStatePath,
  editorBackupVariants,
  tempFileVariants,
  withPathAliases,
  claudeStateGlobEntries,
  claudeStateGlobEntriesExact,
} from "../../../utils/permissions/claudeStatePaths.js";
import { READ } from "../../../tools/FileReadTool/constants.js";
import { EDIT } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { getDenyRuleForTool, findAskRuleForTool } from "../../../utils/permissions/permissions.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../../utils/fsOperations.js";
import { isUntrustedLinkPath } from "../../../utils/pathResolution.js";
import {
  pathInAllowedWorkingPath,
  matchingRuleForInput,
  normalizeCaseForComparison_2,
} from "../../../utils/permissions/filesystem.js";
import { isENOENT } from "../../../utils/errors.js";
import { isPathAllowed } from "../../../utils/permissions/pathValidation.js";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../../vendor/ignore/index.js";
import { driveMountsUnder, secondRootMounts } from "../../../utils/wslMounts.js";
import { uniqByExport } from "../../../../vendor/lodash-es/uniqBy.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import {
  POWERSHELL_WHITESPACE,
  unescapePsDoubleQuoted,
} from "../../../tools/PowerShellTool/powershellParsing.js";
import { SHELL_SPAWNER_PATTERN } from "../../../utils/powershell/dangerousCmdlets.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-6d2p9h2d.js:14204-14377 placement
function isServedEyeEnabled() {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_eye", false);
    return value === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_violin_eye could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-6d2p9h2d.js:14377-14594 placement
var MAX_PATH_DEPTH_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var stripTrailingGlobstar;
var countPathSegments;
var claudeStateGlobDepth;
deferInit("chunk-6d2p9h2d.js:14377", () => {
  MAX_PATH_DEPTH_PREFIX = 32;
  stripTrailingGlobstar = (pattern) => pattern.replace(/\/\*\*$/, "");
  countPathSegments = (path) => countWhere(path.split("/"), Boolean);
  claudeStateGlobDepth = memoizeAlias(
    (globs) => {
      let mapped = globs.map(stripTrailingGlobstar);
      return mapped.every((glob) => glob.startsWith("//") && !glob.includes("**"))
        ? Math.max(0, ...mapped.map(countPathSegments)) + 1
        : undefined;
    },
    (globs) => globs.join("\x00"),
  );
});
//@ chunk-6d2p9h2d.js:14594-14715 placement
function physicalTwinPatternDepth() {
  return (
    Math.max(
      0,
      ...[...getSessionPathsCache().physicalTwinsByPattern.values()].flatMap((paths) =>
        [...paths].map((path) => countPathSegments(stripTrailingGlobstar(path))),
      ),
    ) + 1
  );
}
//@ chunk-6d2p9h2d.js:14715-14773 placement
var pathDepthPrefixRegex; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6d2p9h2d.js:14715", () => {
  pathDepthPrefixRegex = memoizeAlias((depth) => new RegExp(`^/*[^/]+(?:/+[^/]+){${depth - 1}}`));
});
//@ chunk-6d2p9h2d.js:14773-14819 placement
function truncateToPathDepth(path, depth) {
  return pathDepthPrefixRegex(depth).exec(path)?.[0] ?? path;
}
//@ chunk-6d2p9h2d.js:14819-14966 placement
function truncateToGuardDepth(path) {
  if (!useSecurityParser() || getPlatform() === "windows") return path;
  let expanded = expandPath(path);
  if (truncateToPathDepth(expanded, MAX_PATH_DEPTH_PREFIX) === expanded) return path;
  let stateDepth = claudeStateGlobDepth(claudeStateGlobs());
  return stateDepth === undefined
    ? path
    : truncateToPathDepth(expanded, Math.max(stateDepth, physicalTwinPatternDepth()));
}
//@ chunk-6d2p9h2d.js:14966-15045 placement
function isCredentialBasename(path) {
  let guardTruncated = truncateToGuardDepth(path);
  if (isClaudeStatePath(guardTruncated)) return true;
  let stateTruncated = truncateToGuardDepth(path);
  return stateTruncated !== guardTruncated && isClaudeStatePath(stateTruncated);
}
//@ chunk-6d2p9h2d.js:15045-15821 placement
function classifyCredentialPath(name, toolPermissionContext, cwd) {
  try {
    if (
      [READ, EDIT, FILE_WRITE_TOOL_NAME].some(
        (name) =>
          getDenyRuleForTool(toolPermissionContext, {
            name,
          }) !== null ||
          findAskRuleForTool(toolPermissionContext, {
            name,
          }) !== null,
      )
    )
      return "rule_or_settings";
    let checked = walkPermissionCheckPaths(name);
    if (checked.unresolved) return "unreadable";
    if ([checked.landing, ...checked.spellings].some(isUntrustedLinkPath)) return "unreadable";
    if (!pathInAllowedWorkingPath(checked.landing, toolPermissionContext, [checked.landing], [cwd]))
      return "rule_or_settings";
    try {
      let stats = getFsImplementation().statSync(checked.landing);
      if (stats.isDirectory()) return "folder";
      if (!stats.isFile()) return "not_a_file";
      if (stats.nlink !== 1) return "second_name";
    } catch (error) {
      if (!isENOENT(error)) return "unreadable";
    }
    if (
      checked.spellings.some((spelling) =>
        ["read", "edit"].some((op) =>
          ["deny", "ask"].some(
            (behavior) => matchingRuleForInput(spelling, toolPermissionContext, op, behavior) !== null,
          ),
        ),
      )
    )
      return "rule_or_settings";
    let allowed = isPathAllowed(name, toolPermissionContext, "write", checked);
    return !allowed.allowed && allowed.decisionReason !== undefined ? "rule_or_settings" : undefined;
  } catch (error) {
    logError(
      Error("a served MCP relative name could not be checked", {
        cause: error,
      }),
    );
    return "unreadable";
  }
}
//@ chunk-6d2p9h2d.js:15821-15840 placement
var isPathValidModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6d2p9h2d.js:15821", () => {
  isPathValidModule = __toESM(require_ignore(), 1);
});
//@ chunk-6d2p9h2d.js:15899-16024 placement
function wslProfileMountRules() {
  if (getPlatform() !== "wsl") return [];
  return [
    {
      literal: "/mnt",
      profilesGlob: "/?/Users/*",
      startsAt: [],
    },
    ...driveMountsUnder("/").flatMap(userProfileMountRules),
  ];
}
//@ chunk-6d2p9h2d.js:16024-16430 placement
function userProfileMountRules({ mountPoint, within }) {
  let [, rest] = /^users\/[^/]+((?:\/[^/]+)*)$/i.exec(within) ?? [];
  if (rest !== undefined)
    return [
      {
        literal: mountPoint,
        profilesGlob: "",
        startsAt: rest.split("/").filter(Boolean),
      },
    ];
  if (/^users$/i.test(within))
    return [
      {
        literal: mountPoint,
        profilesGlob: "/*",
        startsAt: [],
      },
    ];
  if (within !== "") return [];
  return /\/[^/]$/.test(mountPoint)
    ? [
        {
          literal: mountPoint.slice(0, -2),
          profilesGlob: "/?/Users/*",
          startsAt: [],
        },
      ]
    : [
        {
          literal: mountPoint,
          profilesGlob: "/Users/*",
          startsAt: [],
        },
      ];
}
//@ chunk-6d2p9h2d.js:16430-16550 placement
function isUnderUserProfiles(path) {
  return wslProfileMountRules().some(
    ({ literal, profilesGlob, startsAt }) =>
      (startsAt.length > 0 && path === literal) || path.startsWith(`${literal}${profilesGlob}/`),
  );
}
//@ chunk-6d2p9h2d.js:16550-16703 placement
function credentialPathRules() {
  return [
    ...CREDENTIAL_LITERAL_MATCHERS(),
    ...wslProfileMountRules().flatMap(({ literal, profilesGlob, startsAt }) =>
      CREDENTIAL_GLOB_PATTERNS.flatMap((glob) => expandCredentialGlobs(glob, startsAt)).map((tail) => ({
        literal,
        tail: `${profilesGlob}${tail}`,
      })),
    ),
  ];
}
//@ chunk-6d2p9h2d.js:16703-16975 placement
function expandCredentialGlobs(glob, startsAt) {
  let parts = glob.split("/");
  let joined = startsAt.join("/");
  if (startsAt.length > 0 && !isPathValidModule.default.isPathValid(joined)) return ["", "/**"];
  if (
    startsAt.length > 0 &&
    !isPathValidModule
      .default()
      .add(`/${parts.slice(0, startsAt.length).join("/")}`)
      .ignores(joined)
  )
    return [];
  return startsAt.length >= parts.length ? ["", "/**"] : [`/${parts.slice(startsAt.length).join("/")}`];
}
//@ chunk-6d2p9h2d.js:16975-17898 placement
/**
 * 凭据路径清单：Unix 凭据目录（.ssh/.aws/.config/gcloud 等）、凭据文件（.netrc/.npmrc/.pgpass 等）、Windows 凭据目录与文件、.claude 配置，以及编辑器备份/临时变体展开。
 */
var CREDENTIAL_PATHS; // deferred: uses editorBackupVariants (../../../utils/permissions/claudeStatePaths.js) of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_FILE_NAMES;
var WINDOWS_CREDENTIAL_DIRS;
var WINDOWS_CREDENTIAL_FILE_NAMES;
var CLAUDE_DIR_NAMES;
var CLAUDE_CONFIG_FILE_GLOBS;
var flattened;
var WINDOWS_VAULT_DIRS;
deferInit("chunk-6d2p9h2d.js:16975", () => {
  CREDENTIAL_PATHS = [
    ".ssh",
    ".aws",
    ".config/gcloud",
    ".azure",
    ".kube",
    ".gnupg",
    ".config/gh",
    ".config/glab-cli",
  ];
  CREDENTIAL_FILE_NAMES = [
    ".docker/config.json",
    ".netrc",
    ".git-credentials",
    ".config/git/credentials",
    ".npmrc",
    ".pypirc",
    ".cargo/credentials",
    ".cargo/credentials.toml",
    ".gem/credentials",
    ".pgpass",
    ".my.cnf",
    ".mylogin.cnf",
    ".terraform.d/credentials.tfrc.json",
    ".boto",
    ".s3cfg",
  ];
  WINDOWS_CREDENTIAL_DIRS = [
    "AppData/Roaming/gcloud",
    "AppData/Roaming/GitHub CLI",
    "AppData/Roaming/gnupg",
    "AppData/Local/glab-cli",
  ];
  WINDOWS_CREDENTIAL_FILE_NAMES = [
    "_netrc",
    "AppData/Roaming/postgresql/pgpass.conf",
    "AppData/Roaming/MySQL/.mylogin.cnf",
    "AppData/Roaming/terraform.d/credentials.tfrc.json",
    "AppData/Roaming/s3cmd.ini",
  ];
  CLAUDE_DIR_NAMES = [".claude"];
  CLAUDE_CONFIG_FILE_GLOBS = [".claude*.json"];
  flattened = CLAUDE_CONFIG_FILE_GLOBS.flatMap((glob) => [
    ...editorBackupVariants(glob).flatMap((variant) => [variant, `${variant}.*`]),
    ...tempFileVariants(glob),
  ]);
  WINDOWS_VAULT_DIRS = [
    "AppData/Local/Microsoft/Credentials",
    "AppData/Local/Microsoft/Vault",
    "AppData/Roaming/Microsoft/Credentials",
    "AppData/Roaming/Microsoft/Vault",
    "AppData/Roaming/Microsoft/Protect",
  ];
});
//@ chunk-6d2p9h2d.js:17898-18230 placement
function shortNameVariants(name) {
  let replaced = name
    .replace(/^\.+/, "")
    .replaceAll(" ", "")
    .replace(/[+,;=[\]]/g, "_");
  let [, base = replaced, ext = ""] = /^(.*)\.([^.]*)$/.exec(replaced) ?? [];
  let replaced_2 = base.replaceAll(".", "");
  if (
    `${replaced_2}${ext && "."}${ext}` === name &&
    replaced_2.length <= 8 &&
    ext.length <= 3 &&
    !name.includes("*")
  )
    return [];
  return [replaced_2.slice(0, 6), `${replaced_2.slice(0, 2)}????`].map((prefix) =>
    `${prefix}~?${ext && "."}${ext.slice(0, 3)}`.toUpperCase(),
  );
}
//@ chunk-6d2p9h2d.js:18230-18672 placement
/**
 * 凭据路径的 glob 组合：目录与其 `/**`、文件与 `.*` 变体、短名别名变体，以及用于字面量匹配的 matcher 构造。
 */
var CREDENTIAL_PATH_GLOBS; // deferred: uses CREDENTIAL_PATHS of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_FILE_GLOBS;
var CREDENTIAL_GLOB_PATTERNS;
var CREDENTIAL_LITERAL_MATCHERS;
deferInit("chunk-6d2p9h2d.js:18230", () => {
  CREDENTIAL_PATH_GLOBS = [
    ...CREDENTIAL_PATHS,
    ...WINDOWS_CREDENTIAL_DIRS,
    ...CLAUDE_DIR_NAMES,
    ...WINDOWS_VAULT_DIRS,
  ];
  CREDENTIAL_FILE_GLOBS = [
    ...CREDENTIAL_FILE_NAMES,
    ...WINDOWS_CREDENTIAL_FILE_NAMES,
    ...CLAUDE_CONFIG_FILE_GLOBS,
  ].flatMap((glob) => [glob, `${glob}.*`]);
  CREDENTIAL_GLOB_PATTERNS = [
    ...CREDENTIAL_PATH_GLOBS.flatMap((glob) => [glob, `${glob}/**`]),
    ...CREDENTIAL_FILE_GLOBS,
    ...flattened,
    ...[...CREDENTIAL_PATH_GLOBS, ...CREDENTIAL_FILE_GLOBS].flatMap((glob) =>
      glob
        .split("/")
        .flatMap((segment, index, segments) =>
          shortNameVariants(segment).map((variant) => [...segments.slice(0, index), variant].join("/")),
        ),
    ),
  ];
  CREDENTIAL_LITERAL_MATCHERS = memoizeAlias(
    () =>
      uniqByExport(
        [
          ...expandCredentialHomedirPaths(CREDENTIAL_PATHS).flatMap((literal) => [
            {
              literal,
              tail: "",
            },
            {
              literal,
              tail: "/**",
            },
          ]),
          ...expandCredentialHomedirPaths(CREDENTIAL_FILE_NAMES).flatMap((literal) => [
            {
              literal,
              tail: "",
            },
            {
              literal,
              tail: ".*",
            },
          ]),
        ],
        ({ literal, tail }) => `${literal}\x00${tail}`,
      ),
    () => homedir(),
  );
});
//@ chunk-6d2p9h2d.js:18672-18721 placement
function expandCredentialHomedirPaths(relPaths) {
  return withPathAliases(relPaths.map((relPath) => join(homedir(), relPath)));
}
//@ chunk-6d2p9h2d.js:18721-18746 placement
var HOST_CREDENTIAL_RULE_SOURCE = "hostCredential";
//@ chunk-6d2p9h2d.js:18746-18823 placement
function hostCredentialDenyRules() {
  let stateGlobs = useSecurityParser()
    ? [...claudeStateGlobEntries(), ...credentialPathRules()]
    : claudeStateGlobEntries();
  return [...credentialReadDenyRules(stateGlobs), ...credentialMountDenyRules(stateGlobs)];
}
//@ chunk-6d2p9h2d.js:18823-18984 placement
function credentialMountDenyRules(stateGlobs) {
  return secondRootMounts().flatMap(({ mountPoint, readOnly }) =>
    claudeStateGlobs(prefixRuleLiterals(mountPoint, stateGlobs)).flatMap((ruleContent) => [
      {
        toolName: READ,
        ruleContent,
      },
      ...(readOnly
        ? []
        : [
            {
              toolName: EDIT,
              ruleContent,
            },
          ]),
    ]),
  );
}
//@ chunk-6d2p9h2d.js:18984-19056 placement
function prefixRuleLiterals(mountPoint, entries) {
  return entries.map((entry) => ({
    ...entry,
    literal: `${mountPoint}${entry.literal}`,
  }));
}
//@ chunk-6d2p9h2d.js:19056-19104 placement
function defaultCredentialDenyRules() {
  return [
    ...credentialReadDenyRules(claudeStateGlobEntriesExact()),
    ...credentialMountDenyRules(claudeStateGlobEntriesExact()),
  ];
}
//@ chunk-6d2p9h2d.js:19104-19428 placement
function credentialReadDenyRules(stateGlobs) {
  let platform = getPlatform();
  let isUnix = platform === "linux" || platform === "wsl";
  return [
    ...claudeStateGlobs(stateGlobs).flatMap((ruleContent) => [
      {
        toolName: READ,
        ruleContent,
      },
      {
        toolName: EDIT,
        ruleContent,
      },
    ]),
    ...(isUnix
      ? [
          {
            toolName: READ,
            ruleContent: "//proc/**/environ",
          },
        ]
      : []),
    ...(platform === "windows"
      ? [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME].flatMap((toolName) =>
          mapped.map((ruleContent) => ({
            toolName,
            ruleContent,
          })),
        )
      : keychainCommands()
          .flatMap((command) => [command, `/usr/bin/${command}`])
          .map(bashPrefixRule)),
  ];
}
//@ chunk-6d2p9h2d.js:19428-19600 placement
function keychainCommands() {
  switch (getPlatform()) {
    case "macos":
      return ["security"];
    case "linux":
    case "wsl":
      return ["secret-tool"];
    case "windows":
      return CREDENTIAL_CMDLETS.flatMap((cmdlet) => [cmdlet, `${cmdlet}.exe`]);
    default:
      return [];
  }
}
//@ chunk-6d2p9h2d.js:19600-20339 placement
/**
 * Windows 凭据工具名清单：cmdkey/vaultcmd、PowerShell 凭据管理函数及常见凭据模块名。
 */
var CREDENTIAL_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CREDENTIAL_MODULE_NAMES;
var CREDENTIAL_CMDLET_NAMES_EXPANDED;
var mapped;
deferInit("chunk-6d2p9h2d.js:19600", () => {
  CREDENTIAL_CMDLETS = ["cmdkey", "vaultcmd"];
  CREDENTIAL_MODULE_NAMES = ["PSCredentialManager", "BetterCredentials"];
  CREDENTIAL_CMDLET_NAMES_EXPANDED = [
    ...CREDENTIAL_CMDLETS,
    "CredRead",
    "CredReadDomainCredentials",
    "CredWrite",
    "CredWriteDomainCredentials",
    "CredDelete",
    "CredEnumerate",
    "CredFindBestCredential",
    "CredBackupCredentials",
    "CredRestoreCredentials",
    "vaultcli",
    "Get-StoredCredential",
    "New-StoredCredential",
    "Remove-StoredCredential",
    "Get-CredManCredential",
    "New-CredManCredential",
    "Remove-CredManCredential",
    ...CREDENTIAL_MODULE_NAMES,
    "Find-Credential",
    "Test-Credential",
    "Set-Credential",
    "Remove-Credential",
    "Get-Secret",
    "Get-SecretInfo",
    "Set-Secret",
    "Set-SecretInfo",
    "Remove-Secret",
    "Get-SecretVault",
    "Register-SecretVault",
    "Unregister-SecretVault",
    "Unlock-SecretVault",
    "Test-SecretVault",
    "Set-SecretVaultDefault",
  ];
  mapped = CREDENTIAL_CMDLETS.map((cmdlet) => `*${cmdlet}*`);
});
//@ chunk-6d2p9h2d.js:20339-20721 placement
function cmdletPattern(name) {
  if (CREDENTIAL_CMDLETS.includes(name)) return `${name}(?:\\.exe)?`;
  if (/^Cred/.test(name)) return `${name}[AW]?`;
  if (name === "vaultcli") return "vaultcli(?:\\.dll)?";
  if (CREDENTIAL_MODULE_NAMES.includes(name)) return `${name}(?:\\.ps[dm]1|(?:\\.[A-Za-z0-9_]+)+)?`;
  let index = name.indexOf("-");
  return /(?:StoredCredential|CredManCredential)$/.test(name)
    ? `${name.slice(0, index)}-(?:[^\\s'"\`;&|(){}\\[\\],-]*|[^\\s'"\`;&|(){}\\[\\],]{0,64})${name.slice(index + 1)}`
    : name;
}
//@ chunk-6d2p9h2d.js:20721-22055 placement
/**
 * Windows 命令行里的凭据访问/混淆检测正则：凭据 cmdlet、模块加载、凭据管理器类型、PasswordVault、runas、/savecred、动态执行与 powershell 调用等。
 */
var CREDENTIAL_COMMAND_RE; // deferred: uses CREDENTIAL_CMDLETS of its import cycle while loading; runs once the cycle is complete
var SHELL_MODULE_LOADING_RE;
var CREDENTIAL_MODULE_USE_RE;
var STORED_CREDENTIAL_USE_RE;
var PASSWORD_VAULT_USE_RE;
var PASSWORD_VAULT_CAST_RE;
var RUNAS_COMMAND_RE;
var SAVE_CREDENTIAL_FLAG_RE;
var DYNAMIC_CODE_RE;
var POWERSHELL_INVOCATION_RE;
deferInit("chunk-6d2p9h2d.js:20721", () => {
  CREDENTIAL_COMMAND_RE = new RegExp(
    `(?:^|[^A-Za-z0-9_])(?:${CREDENTIAL_CMDLET_NAMES_EXPANDED.map((name) => `(${cmdletPattern(name)})`).join("|")})\\.*(?![A-Za-z0-9_.-])`,
    "i",
  );
  SHELL_MODULE_LOADING_RE =
    /(?:^|[^A-Za-z0-9_])(?:(?:import|install|save|update|find|get)-module|ipmo|gmo|inmo|fimo|upmo|using[ \t]+(?:module|assembly)|#requires[ \t]+-(?:modules?|assembly)|(?:install|save|update|find)-psresource|(?:is|sv|ud|fd)res|(?:install|save|find)-package|get-command|gcm|add-type|loadfrom|loadfile|loadwithpartialname|unsafeloadfrom|loadfromassemblypath|loadfromstream|loadfromassemblyname|createinstancefrom|assemblyloadcontext)(?![A-Za-z0-9_-])|(?:assembly|activator|appdomain)\s*\]|reflection\s*\.\s*assembly|currentdomain|(?:^|[^A-Za-z0-9_])using[ \t]*(?:<#|`[\r\n])/i;
  CREDENTIAL_MODULE_USE_RE = /(?:^|[^A-Za-z0-9_])(?:(CredentialManager)|SecretManagement)(?![A-Za-z0-9_])/i;
  STORED_CREDENTIAL_USE_RE = /(?:^|[^$])(?:(Stored)|CredMan)Credential(?![A-Za-z0-9_])/i;
  PASSWORD_VAULT_USE_RE = /(?:^|[^A-Za-z0-9_])PasswordVault(?![A-Za-z0-9_.])/i;
  PASSWORD_VAULT_CAST_RE =
    /\[(?=\s*[\w.]*PasswordVault)|\[\s*(?:System\.)?Type\s*\]|New-Object|Credentials\.|(?:^|[^A-Za-z0-9_])-as(?:\s+[^\s;|&)-]|[^\sA-Za-z0-9_;|&)-])/i;
  RUNAS_COMMAND_RE = /(?:^|[^A-Za-z0-9_])runas(?:\.exe)?(?![A-Za-z0-9_])/i;
  SAVE_CREDENTIAL_FLAG_RE = /\/savecred(?![A-Za-z0-9_])/i;
  DYNAMIC_CODE_RE =
    /(?:^|[^A-Za-z0-9_-])(?:iex|invoke-expression)(?![A-Za-z0-9_-])|scriptblock\s*\]|invokescript|newscriptblock|addscript|expandstring/i;
  POWERSHELL_INVOCATION_RE = /(?:^|[^\w.-])(?:powershell|pwsh(?:-preview)?|cmd)(?:\.exe)?(?![\w-])/i;
});
//@ chunk-6d2p9h2d.js:22055-22109 placement
function looksLikeObfuscatedPowerShell(command) {
  return POWERSHELL_INVOCATION_RE.test(command) && /[($@{%!|]/.test(command);
}
//@ chunk-6d2p9h2d.js:22109-22208 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DASH_VARIANTS_RE;
deferInit("chunk-6d2p9h2d.js:22109", () => {
  regExp = new RegExp(POWERSHELL_WHITESPACE.source.replace(/\\[tnr]| /g, "").replace(/\+$/, ""), "g");
  DASH_VARIANTS_RE = /[\u2013-\u2015]/g;
});
//@ chunk-6d2p9h2d.js:22208-22328 placement
function normalizeCommandQuotes(command) {
  return command
    .replace(regExp, " ")
    .replace(DASH_VARIANTS_RE, "-")
    .replace(/[\u2018-\u201b]/g, "'")
    .replace(/[\u201c-\u201e]/g, '"');
}
//@ chunk-6d2p9h2d.js:22328-22757 placement
/**
 * 检测命令中是否调用了凭证存储工具（cmdkey、vaultcmd、CredRead*、security、secret-tool 等）。
 */
function credentialCommandIn(command) {
  let normalized = normalizeCommandQuotes(command);
  let match = CREDENTIAL_COMMAND_RE.exec(normalized);
  if (match !== null)
    return CREDENTIAL_CMDLET_NAMES_EXPANDED[match.slice(1).findIndex((group) => group !== undefined)];
  let isDynamic = DYNAMIC_CODE_RE.test(normalized) || looksLikeObfuscatedPowerShell(normalized);
  if (SHELL_MODULE_LOADING_RE.test(normalized) || isDynamic) {
    let match = CREDENTIAL_MODULE_USE_RE.exec(normalized);
    if (match !== null) return match[1] !== undefined ? "CredentialManager" : "SecretManagement";
    let match_2 = STORED_CREDENTIAL_USE_RE.exec(normalized);
    if (match_2 !== null) return match_2[1] !== undefined ? "Get-StoredCredential" : "Get-CredManCredential";
  }
  if (PASSWORD_VAULT_USE_RE.test(normalized) && (PASSWORD_VAULT_CAST_RE.test(normalized) || isDynamic))
    return "PasswordVault";
  if (RUNAS_COMMAND_RE.test(normalized) && SAVE_CREDENTIAL_FLAG_RE.test(normalized)) return "runas";
  return;
}
//@ chunk-6d2p9h2d.js:22757-23018 placement
function readsCredentialStore(command, mode = "either") {
  let unquoted = unquoteShellWord(command);
  let whitespaceNormalized = normalizeQuotedWhitespace(command);
  let hasSpawner =
    mode !== "powershell" ||
    [command, unquoted, whitespaceNormalized].some((variant) => {
      let folded = normalizeTurkishLetters(normalizeCommandQuotes(variant));
      return (
        SHELL_SPAWNER_PATTERN.test(folded) ||
        SHELL_SPAWNER_PATTERN.test(normalizeTurkishLetters(folded.normalize("NFKC")))
      );
    });
  return normalizeCaseForComparison_2(
    [
      command,
      unquoted,
      whitespaceNormalized,
      ...(hasSpawner ? [joinLineContinuations(unquoted), joinLineContinuations(whitespaceNormalized)] : []),
    ].flatMap((variant) => {
      let normalized = variant.normalize("NFKC");
      return [variant, normalizeTurkishLetters(variant), normalized, normalizeTurkishLetters(normalized)];
    }),
  );
}
//@ chunk-6d2p9h2d.js:23225-23292 placement
function joinLineContinuations(command) {
  return command.replace(/\\\r?\n/g, "").replaceAll("\\", "");
}
//@ chunk-6d2p9h2d.js:23292-23362 placement
function normalizeTurkishLetters(text) {
  return text.replace(/\u0131/g, "i").replace(/\u017f/g, "s");
}
//@ chunk-6d2p9h2d.js:23362-23393 placement
function unquoteShellWord(word) {
  return normalizePowerShellArg(word, "");
}
//@ chunk-6d2p9h2d.js:23393-23425 placement
function normalizeQuotedWhitespace(word) {
  return normalizePowerShellArg(word, " ");
}
//@ chunk-6d2p9h2d.js:23425-23522 placement
function normalizePowerShellArg(arg, replacement) {
  return decodeAnsiCQuotes(unescapePsDoubleQuoted(arg.replace(/\^\r?\n/g, "")))
    .replace(/\$(?=["'])/g, "")
    .replace(QUOTE_AND_CARET_RE, replacement);
}
//@ chunk-6d2p9h2d.js:23522-23560 placement
var ANSI_ESCAPE_CHARS = {
  n: `
`,
  t: "\t",
  r: "\r",
  e: "\x1B",
};
//@ chunk-6d2p9h2d.js:23560-23945 placement
function decodeAnsiCQuotes(text) {
  return text.replace(
    /\$'((?:[^'\\]|\\.)*)'/g,
    (match, body) =>
      `'${body.replace(
        /\\(?:x([0-9A-Fa-f]{1,2})|u([0-9A-Fa-f]{1,4})|U([0-9A-Fa-f]{1,8})|([0-7]{1,3})|(.))/g,
        (escapeMatch, hex2, hex4, hex8, octal, other) => {
          let code =
            hex2 !== undefined
              ? parseInt(hex2, 16)
              : hex4 !== undefined
                ? parseInt(hex4, 16)
                : hex8 !== undefined
                  ? parseInt(hex8, 16)
                  : octal !== undefined
                    ? parseInt(octal, 8)
                    : undefined;
          if (code === undefined) return ANSI_ESCAPE_CHARS[other ?? ""] ?? other ?? "";
          return code <= 1114111 ? String.fromCodePoint(code) : "";
        },
      )}'`,
  );
}
//@ chunk-6d2p9h2d.js:23945-23975 placement
var QUOTE_AND_CARET_RE = /["'`^\u2018-\u201e]/g;
//@ chunk-6d2p9h2d.js:23975-24031 placement
function bashPrefixRule(prefix) {
  return {
    toolName: BASH_TOOL_NAME,
    ruleContent: `${prefix}:*`,
  };
}
export {
  readsCredentialStore,
  credentialCommandIn,
  HOST_CREDENTIAL_RULE_SOURCE,
  keychainCommands,
  bashPrefixRule,
  isServedEyeEnabled,
  isCredentialBasename,
  classifyCredentialPath,
  unquoteShellWord,
  joinLineContinuations,
  credentialPathRules,
  prefixRuleLiterals,
  defaultCredentialDenyRules,
  hostCredentialDenyRules,
  isUnderUserProfiles,
};
