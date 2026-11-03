/**
 * remote/tools/serve/credentialPathGuards.ts
 *
 * 2.1.316 新增：凭证文件路径与凭证命令识别守卫
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (42)
 * attribution: placement 42
 */
import { homedir } from "os";
import { join } from "path";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { logError } from "../../../utils/log.js";
import { count, uniq } from "../../../utils/collections.js";
import { io } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../../../utils/permissions/permissions.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../../utils/fsOperations.js";
import { isUntrustedLinkPath } from "../../../utils/pathResolution.js";
import { pathInAllowedWorkingPath, matchingRuleForInput } from "../../../utils/permissions/filesystem.js";
import { isENOENT } from "../../../utils/errors.js";
import { isPathAllowed } from "../../../utils/permissions/pathValidation.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../../vendor/ignore/index.js";
import { driveMountsUnder, secondRootMounts } from "../../../utils/wslMounts.js";
import { Ji } from "../../../../vendor/lodash-es/uniqBy.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import {
  POWERSHELL_WHITESPACE,
  unescapePsDoubleQuoted,
} from "../../../tools/PowerShellTool/powershellParsing.js";
import { SHELL_SPAWNER_PATTERN } from "../../../utils/powershell/dangerousCmdlets.js";

//@ chunk-tr0s0d0k.js:13957-14130 placement
function isServedEyeEnabled() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_eye", false);
    return e === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_violin_eye could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-tr0s0d0k.js:14130-14347 placement
var MAX_PATH_DEPTH_PREFIX = 32;
var stripTrailingGlobstar = (e) => e.replace(/\/\*\*$/, "");
var countPathSegments = (e) => count(e.split("/"), Boolean);
var claudeStateGlobDepth = io(
  (e) => {
    let mapped = e.map(stripTrailingGlobstar);
    return mapped.every((o) => o.startsWith("//") && !o.includes("**"))
      ? Math.max(0, ...mapped.map(countPathSegments)) + 1
      : undefined;
  },
  (e) => e.join("\x00"),
);
//@ chunk-tr0s0d0k.js:14347-14468 placement
function physicalTwinPatternDepth() {
  return (
    Math.max(
      0,
      ...[...getSessionPathsCache().physicalTwinsByPattern.values()].flatMap((e) =>
        [...e].map((n) => countPathSegments(stripTrailingGlobstar(n))),
      ),
    ) + 1
  );
}
//@ chunk-tr0s0d0k.js:14468-14526 placement
var pathDepthPrefixRegex = io((e) => new RegExp(`^/*[^/]+(?:/+[^/]+){${e - 1}}`));
//@ chunk-tr0s0d0k.js:14526-14572 placement
function truncateToPathDepth(e, n) {
  return pathDepthPrefixRegex(n).exec(e)?.[0] ?? e;
}
//@ chunk-tr0s0d0k.js:14572-14719 placement
function truncateToGuardDepth(e) {
  if (!useSecurityParser() || getPlatform() === "windows") return e;
  let n = expandPath(e);
  if (truncateToPathDepth(n, MAX_PATH_DEPTH_PREFIX) === n) return e;
  let o = claudeStateGlobDepth(claudeStateGlobs());
  return o === undefined ? e : truncateToPathDepth(n, Math.max(o, physicalTwinPatternDepth()));
}
//@ chunk-tr0s0d0k.js:14719-14798 placement
function isCredentialBasename(e) {
  let n = truncateToGuardDepth(e);
  if (isClaudeStatePath(n)) return true;
  let o = truncateToGuardDepth(e);
  return o !== n && isClaudeStatePath(o);
}
//@ chunk-tr0s0d0k.js:14798-15574 placement
function classifyCredentialPath(e, n, o) {
  try {
    if (
      [FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].some(
        (name) =>
          getDenyRuleForTool(n, {
            name,
          }) !== null ||
          getAskRuleForTool(n, {
            name,
          }) !== null,
      )
    )
      return "rule_or_settings";
    let r = walkPermissionCheckPaths(e);
    if (r.unresolved) return "unreadable";
    if ([r.landing, ...r.spellings].some(isUntrustedLinkPath)) return "unreadable";
    if (!pathInAllowedWorkingPath(r.landing, n, [r.landing], [o])) return "rule_or_settings";
    try {
      let stats = getFsImplementation().statSync(r.landing);
      if (stats.isDirectory()) return "folder";
      if (!stats.isFile()) return "not_a_file";
      if (stats.nlink !== 1) return "second_name";
    } catch (error) {
      if (!isENOENT(error)) return "unreadable";
    }
    if (
      r.spellings.some((spelling) =>
        ["read", "edit"].some((u) =>
          ["deny", "ask"].some((p) => matchingRuleForInput(spelling, n, u, p) !== null),
        ),
      )
    )
      return "rule_or_settings";
    let s = isPathAllowed(e, n, "write", r);
    return !s.allowed && s.decisionReason !== undefined ? "rule_or_settings" : undefined;
  } catch (error) {
    logError(
      Error("a served MCP relative name could not be checked", {
        cause: error,
      }),
    );
    return "unreadable";
  }
}
//@ chunk-tr0s0d0k.js:15574-15593 placement
var isPathValidModule = Re(require_ignore(), 1);
//@ chunk-tr0s0d0k.js:15652-15777 placement
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
//@ chunk-tr0s0d0k.js:15777-16183 placement
function userProfileMountRules({ mountPoint, within }) {
  let [, o] = /^users\/[^/]+((?:\/[^/]+)*)$/i.exec(within) ?? [];
  if (o !== undefined)
    return [
      {
        literal: mountPoint,
        profilesGlob: "",
        startsAt: o.split("/").filter(Boolean),
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
//@ chunk-tr0s0d0k.js:16183-16303 placement
function isUnderUserProfiles(e) {
  return wslProfileMountRules().some(
    ({ literal, profilesGlob, startsAt }) =>
      (startsAt.length > 0 && e === literal) || e.startsWith(`${literal}${profilesGlob}/`),
  );
}
//@ chunk-tr0s0d0k.js:16303-16456 placement
function credentialPathRules() {
  return [
    ...CREDENTIAL_LITERAL_MATCHERS(),
    ...wslProfileMountRules().flatMap(({ literal, profilesGlob, startsAt }) =>
      CREDENTIAL_GLOB_PATTERNS.flatMap((r) => expandCredentialGlobs(r, startsAt)).map((r) => ({
        literal,
        tail: `${profilesGlob}${r}`,
      })),
    ),
  ];
}
//@ chunk-tr0s0d0k.js:16456-16728 placement
function expandCredentialGlobs(e, startsAt) {
  let parts = e.split("/");
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
//@ chunk-tr0s0d0k.js:16728-17651 placement
/**
 * 凭据路径清单：Unix 凭据目录（.ssh/.aws/.config/gcloud 等）、凭据文件（.netrc/.npmrc/.pgpass 等）、Windows 凭据目录与文件、.claude 配置，以及编辑器备份/临时变体展开。
 */
var CREDENTIAL_PATHS = [
  ".ssh",
  ".aws",
  ".config/gcloud",
  ".azure",
  ".kube",
  ".gnupg",
  ".config/gh",
  ".config/glab-cli",
];
var CREDENTIAL_FILE_NAMES = [
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
var WINDOWS_CREDENTIAL_DIRS = [
  "AppData/Roaming/gcloud",
  "AppData/Roaming/GitHub CLI",
  "AppData/Roaming/gnupg",
  "AppData/Local/glab-cli",
];
var WINDOWS_CREDENTIAL_FILE_NAMES = [
  "_netrc",
  "AppData/Roaming/postgresql/pgpass.conf",
  "AppData/Roaming/MySQL/.mylogin.cnf",
  "AppData/Roaming/terraform.d/credentials.tfrc.json",
  "AppData/Roaming/s3cmd.ini",
];
var CLAUDE_DIR_NAMES = [".claude"];
var CLAUDE_CONFIG_FILE_GLOBS = [".claude*.json"];
var flattened = CLAUDE_CONFIG_FILE_GLOBS.flatMap((e) => [
  ...editorBackupVariants(e).flatMap((n) => [n, `${n}.*`]),
  ...tempFileVariants(e),
]);
var WINDOWS_VAULT_DIRS = [
  "AppData/Local/Microsoft/Credentials",
  "AppData/Local/Microsoft/Vault",
  "AppData/Roaming/Microsoft/Credentials",
  "AppData/Roaming/Microsoft/Vault",
  "AppData/Roaming/Microsoft/Protect",
];
//@ chunk-tr0s0d0k.js:17651-17983 placement
function shortNameVariants(e) {
  let replaced = e
    .replace(/^\.+/, "")
    .replaceAll(" ", "")
    .replace(/[+,;=[\]]/g, "_");
  let [, o = replaced, r = ""] = /^(.*)\.([^.]*)$/.exec(replaced) ?? [];
  let replaced_2 = o.replaceAll(".", "");
  if (`${replaced_2}${r && "."}${r}` === e && replaced_2.length <= 8 && r.length <= 3 && !e.includes("*"))
    return [];
  return [replaced_2.slice(0, 6), `${replaced_2.slice(0, 2)}????`].map((d) =>
    `${d}~?${r && "."}${r.slice(0, 3)}`.toUpperCase(),
  );
}
//@ chunk-tr0s0d0k.js:17983-18425 placement
/**
 * 凭据路径的 glob 组合：目录与其 `/**`、文件与 `.*` 变体、短名别名变体，以及用于字面量匹配的 matcher 构造。
 */
var CREDENTIAL_PATH_GLOBS = [
  ...CREDENTIAL_PATHS,
  ...WINDOWS_CREDENTIAL_DIRS,
  ...CLAUDE_DIR_NAMES,
  ...WINDOWS_VAULT_DIRS,
];
var CREDENTIAL_FILE_GLOBS = [
  ...CREDENTIAL_FILE_NAMES,
  ...WINDOWS_CREDENTIAL_FILE_NAMES,
  ...CLAUDE_CONFIG_FILE_GLOBS,
].flatMap((e) => [e, `${e}.*`]);
var CREDENTIAL_GLOB_PATTERNS = [
  ...CREDENTIAL_PATH_GLOBS.flatMap((e) => [e, `${e}/**`]),
  ...CREDENTIAL_FILE_GLOBS,
  ...flattened,
  ...[...CREDENTIAL_PATH_GLOBS, ...CREDENTIAL_FILE_GLOBS].flatMap((e) =>
    e.split("/").flatMap((n, o, r) => shortNameVariants(n).map((s) => [...r.slice(0, o), s].join("/"))),
  ),
];
var CREDENTIAL_LITERAL_MATCHERS = io(
  () =>
    Ji(
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
//@ chunk-tr0s0d0k.js:18425-18474 placement
function expandCredentialHomedirPaths(e) {
  return withPathAliases(e.map((n) => join(homedir(), n)));
}
//@ chunk-tr0s0d0k.js:18474-18499 placement
var HOST_CREDENTIAL_RULE_SOURCE = "hostCredential";
//@ chunk-tr0s0d0k.js:18499-18576 placement
function hostCredentialDenyRules() {
  let e = useSecurityParser()
    ? [...claudeStateGlobEntries(), ...credentialPathRules()]
    : claudeStateGlobEntries();
  return [...credentialReadDenyRules(e), ...credentialMountDenyRules(e)];
}
//@ chunk-tr0s0d0k.js:18576-18737 placement
function credentialMountDenyRules(e) {
  return secondRootMounts().flatMap(({ mountPoint, readOnly }) =>
    claudeStateGlobs(prefixRuleLiterals(mountPoint, e)).flatMap((ruleContent) => [
      {
        toolName: FILE_READ_TOOL_NAME,
        ruleContent,
      },
      ...(readOnly
        ? []
        : [
            {
              toolName: FILE_EDIT_TOOL_NAME,
              ruleContent,
            },
          ]),
    ]),
  );
}
//@ chunk-tr0s0d0k.js:18737-18809 placement
function prefixRuleLiterals(mountPoint, n) {
  return n.map((o) => ({
    ...o,
    literal: `${mountPoint}${o.literal}`,
  }));
}
//@ chunk-tr0s0d0k.js:18809-18857 placement
function defaultCredentialDenyRules() {
  return [
    ...credentialReadDenyRules(claudeStateGlobEntriesExact()),
    ...credentialMountDenyRules(claudeStateGlobEntriesExact()),
  ];
}
//@ chunk-tr0s0d0k.js:18857-19181 placement
function credentialReadDenyRules(e) {
  let platform = getPlatform();
  let o = platform === "linux" || platform === "wsl";
  return [
    ...claudeStateGlobs(e).flatMap((ruleContent) => [
      {
        toolName: FILE_READ_TOOL_NAME,
        ruleContent,
      },
      {
        toolName: FILE_EDIT_TOOL_NAME,
        ruleContent,
      },
    ]),
    ...(o
      ? [
          {
            toolName: FILE_READ_TOOL_NAME,
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
          .flatMap((r) => [r, `/usr/bin/${r}`])
          .map(bashPrefixRule)),
  ];
}
//@ chunk-tr0s0d0k.js:19181-19353 placement
function keychainCommands() {
  switch (getPlatform()) {
    case "macos":
      return ["security"];
    case "linux":
    case "wsl":
      return ["secret-tool"];
    case "windows":
      return CREDENTIAL_CMDLETS.flatMap((e) => [e, `${e}.exe`]);
    default:
      return [];
  }
}
//@ chunk-tr0s0d0k.js:19353-20092 placement
/**
 * Windows 凭据工具名清单：cmdkey/vaultcmd、PowerShell 凭据管理函数及常见凭据模块名。
 */
var CREDENTIAL_CMDLETS = ["cmdkey", "vaultcmd"];
var CREDENTIAL_MODULE_NAMES = ["PSCredentialManager", "BetterCredentials"];
var CREDENTIAL_CMDLET_NAMES_EXPANDED = [
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
var mapped = CREDENTIAL_CMDLETS.map((e) => `*${e}*`);
//@ chunk-tr0s0d0k.js:20092-20474 placement
function cmdletPattern(e) {
  if (CREDENTIAL_CMDLETS.includes(e)) return `${e}(?:\\.exe)?`;
  if (/^Cred/.test(e)) return `${e}[AW]?`;
  if (e === "vaultcli") return "vaultcli(?:\\.dll)?";
  if (CREDENTIAL_MODULE_NAMES.includes(e)) return `${e}(?:\\.ps[dm]1|(?:\\.[A-Za-z0-9_]+)+)?`;
  let index = e.indexOf("-");
  return /(?:StoredCredential|CredManCredential)$/.test(e)
    ? `${e.slice(0, index)}-(?:[^\\s'"\`;&|(){}\\[\\],-]*|[^\\s'"\`;&|(){}\\[\\],]{0,64})${e.slice(index + 1)}`
    : e;
}
//@ chunk-tr0s0d0k.js:20474-21808 placement
/**
 * Windows 命令行里的凭据访问/混淆检测正则：凭据 cmdlet、模块加载、凭据管理器类型、PasswordVault、runas、/savecred、动态执行与 powershell 调用等。
 */
var CREDENTIAL_COMMAND_RE = new RegExp(
  `(?:^|[^A-Za-z0-9_])(?:${CREDENTIAL_CMDLET_NAMES_EXPANDED.map((e) => `(${cmdletPattern(e)})`).join("|")})\\.*(?![A-Za-z0-9_.-])`,
  "i",
);
var SHELL_MODULE_LOADING_RE =
  /(?:^|[^A-Za-z0-9_])(?:(?:import|install|save|update|find|get)-module|ipmo|gmo|inmo|fimo|upmo|using[ \t]+(?:module|assembly)|#requires[ \t]+-(?:modules?|assembly)|(?:install|save|update|find)-psresource|(?:is|sv|ud|fd)res|(?:install|save|find)-package|get-command|gcm|add-type|loadfrom|loadfile|loadwithpartialname|unsafeloadfrom|loadfromassemblypath|loadfromstream|loadfromassemblyname|createinstancefrom|assemblyloadcontext)(?![A-Za-z0-9_-])|(?:assembly|activator|appdomain)\s*\]|reflection\s*\.\s*assembly|currentdomain|(?:^|[^A-Za-z0-9_])using[ \t]*(?:<#|`[\r\n])/i;
var CREDENTIAL_MODULE_USE_RE = /(?:^|[^A-Za-z0-9_])(?:(CredentialManager)|SecretManagement)(?![A-Za-z0-9_])/i;
var STORED_CREDENTIAL_USE_RE = /(?:^|[^$])(?:(Stored)|CredMan)Credential(?![A-Za-z0-9_])/i;
var PASSWORD_VAULT_USE_RE = /(?:^|[^A-Za-z0-9_])PasswordVault(?![A-Za-z0-9_.])/i;
var PASSWORD_VAULT_CAST_RE =
  /\[(?=\s*[\w.]*PasswordVault)|\[\s*(?:System\.)?Type\s*\]|New-Object|Credentials\.|(?:^|[^A-Za-z0-9_])-as(?:\s+[^\s;|&)-]|[^\sA-Za-z0-9_;|&)-])/i;
var RUNAS_COMMAND_RE = /(?:^|[^A-Za-z0-9_])runas(?:\.exe)?(?![A-Za-z0-9_])/i;
var SAVE_CREDENTIAL_FLAG_RE = /\/savecred(?![A-Za-z0-9_])/i;
var DYNAMIC_CODE_RE =
  /(?:^|[^A-Za-z0-9_-])(?:iex|invoke-expression)(?![A-Za-z0-9_-])|scriptblock\s*\]|invokescript|newscriptblock|addscript|expandstring/i;
var POWERSHELL_INVOCATION_RE = /(?:^|[^\w.-])(?:powershell|pwsh(?:-preview)?|cmd)(?:\.exe)?(?![\w-])/i;
//@ chunk-tr0s0d0k.js:21808-21862 placement
function looksLikeObfuscatedPowerShell(e) {
  return POWERSHELL_INVOCATION_RE.test(e) && /[($@{%!|]/.test(e);
}
//@ chunk-tr0s0d0k.js:21862-21961 placement
var regExp = new RegExp(POWERSHELL_WHITESPACE.source.replace(/\\[tnr]| /g, "").replace(/\+$/, ""), "g");
var DASH_VARIANTS_RE = /[\u2013-\u2015]/g;
//@ chunk-tr0s0d0k.js:21961-22081 placement
function normalizeCommandQuotes(e) {
  return e
    .replace(regExp, " ")
    .replace(DASH_VARIANTS_RE, "-")
    .replace(/[\u2018-\u201b]/g, "'")
    .replace(/[\u201c-\u201e]/g, '"');
}
//@ chunk-tr0s0d0k.js:22081-22510 placement
/**
 * 检测命令中是否调用了凭证存储工具（cmdkey、vaultcmd、CredRead*、security、secret-tool 等）。
 */
function credentialCommandIn(e) {
  let n = normalizeCommandQuotes(e);
  let match = CREDENTIAL_COMMAND_RE.exec(n);
  if (match !== null)
    return CREDENTIAL_CMDLET_NAMES_EXPANDED[match.slice(1).findIndex((s) => s !== undefined)];
  let r = DYNAMIC_CODE_RE.test(n) || looksLikeObfuscatedPowerShell(n);
  if (SHELL_MODULE_LOADING_RE.test(n) || r) {
    let match = CREDENTIAL_MODULE_USE_RE.exec(n);
    if (match !== null) return match[1] !== undefined ? "CredentialManager" : "SecretManagement";
    let match_2 = STORED_CREDENTIAL_USE_RE.exec(n);
    if (match_2 !== null) return match_2[1] !== undefined ? "Get-StoredCredential" : "Get-CredManCredential";
  }
  if (PASSWORD_VAULT_USE_RE.test(n) && (PASSWORD_VAULT_CAST_RE.test(n) || r)) return "PasswordVault";
  if (RUNAS_COMMAND_RE.test(n) && SAVE_CREDENTIAL_FLAG_RE.test(n)) return "runas";
  return;
}
//@ chunk-tr0s0d0k.js:22510-22771 placement
function readsCredentialStore(e, n = "either") {
  let o = unquoteShellWord(e);
  let r = normalizeQuotedWhitespace(e);
  let s =
    n !== "powershell" ||
    [e, o, r].some((d) => {
      let u = normalizeTurkishLetters(normalizeCommandQuotes(d));
      return (
        SHELL_SPAWNER_PATTERN.test(u) ||
        SHELL_SPAWNER_PATTERN.test(normalizeTurkishLetters(u.normalize("NFKC")))
      );
    });
  return uniq(
    [e, o, r, ...(s ? [joinLineContinuations(o), joinLineContinuations(r)] : [])].flatMap((d) => {
      let normalized = d.normalize("NFKC");
      return [d, normalizeTurkishLetters(d), normalized, normalizeTurkishLetters(normalized)];
    }),
  );
}
//@ chunk-tr0s0d0k.js:22978-23045 placement
function joinLineContinuations(e) {
  return e.replace(/\\\r?\n/g, "").replaceAll("\\", "");
}
//@ chunk-tr0s0d0k.js:23045-23115 placement
function normalizeTurkishLetters(e) {
  return e.replace(/\u0131/g, "i").replace(/\u017f/g, "s");
}
//@ chunk-tr0s0d0k.js:23115-23146 placement
function unquoteShellWord(e) {
  return normalizePowerShellArg(e, "");
}
//@ chunk-tr0s0d0k.js:23146-23178 placement
function normalizeQuotedWhitespace(e) {
  return normalizePowerShellArg(e, " ");
}
//@ chunk-tr0s0d0k.js:23178-23275 placement
function normalizePowerShellArg(e, n) {
  return decodeAnsiCQuotes(unescapePsDoubleQuoted(e.replace(/\^\r?\n/g, "")))
    .replace(/\$(?=["'])/g, "")
    .replace(QUOTE_AND_CARET_RE, n);
}
//@ chunk-tr0s0d0k.js:23275-23313 placement
var ANSI_ESCAPE_CHARS = {
  n: `
`,
  t: "\t",
  r: "\r",
  e: "\x1B",
};
//@ chunk-tr0s0d0k.js:23313-23698 placement
function decodeAnsiCQuotes(e) {
  return e.replace(
    /\$'((?:[^'\\]|\\.)*)'/g,
    (n, o) =>
      `'${o.replace(
        /\\(?:x([0-9A-Fa-f]{1,2})|u([0-9A-Fa-f]{1,4})|U([0-9A-Fa-f]{1,8})|([0-7]{1,3})|(.))/g,
        (r, s, d, u, p, h) => {
          let _ =
            s !== undefined
              ? parseInt(s, 16)
              : d !== undefined
                ? parseInt(d, 16)
                : u !== undefined
                  ? parseInt(u, 16)
                  : p !== undefined
                    ? parseInt(p, 8)
                    : undefined;
          if (_ === undefined) return ANSI_ESCAPE_CHARS[h ?? ""] ?? h ?? "";
          return _ <= 1114111 ? String.fromCodePoint(_) : "";
        },
      )}'`,
  );
}
//@ chunk-tr0s0d0k.js:23698-23728 placement
var QUOTE_AND_CARET_RE = /["'`^\u2018-\u201e]/g;
//@ chunk-tr0s0d0k.js:23728-23784 placement
function bashPrefixRule(e) {
  return {
    toolName: BASH_TOOL_NAME,
    ruleContent: `${e}:*`,
  };
}
export {
  readsCredentialStore,
  credentialCommandIn,
  HOST_CREDENTIAL_RULE_SOURCE,
  keychainCommands,
  bashPrefixRule,
  isUnderUserProfiles,
  isServedEyeEnabled,
  isCredentialBasename,
  classifyCredentialPath,
  joinLineContinuations,
  unquoteShellWord,
  credentialPathRules,
  prefixRuleLiterals,
  defaultCredentialDenyRules,
  hostCredentialDenyRules,
};
