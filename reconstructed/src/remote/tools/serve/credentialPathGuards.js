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
import { homedir, homedir as homedir_2 } from "os";
import { join, join as join_2, join as join_3 } from "path";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { logError } from "../../../utils/log.js";
import { count, uniq } from "../../../utils/collections.js";
import { io } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getSessionPathsCache } from "../../../utils/sessionPathsCache.js";
import { nLe } from "../../../tools/BashTool/readOnlyShellCheck.js";
import { getPlatform } from "../../../utils/platform.js";
import { expandPath } from "../../../utils/path.js";
import {
  claudeStateGlobs,
  isClaudeStatePath,
  editorBackupVariants,
  tempFileVariants,
  withPathAliases,
  O4e,
  G8o,
} from "../../../utils/permissions/claudeStatePaths.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../../../utils/permissions/permissions.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../../utils/fsOperations.js";
import { ck } from "../../../utils/pathResolution.js";
import { pathInAllowedWorkingPath, matchingRuleForInput } from "../../../utils/permissions/filesystem.js";
import { isENOENT } from "../../../utils/errors.js";
import { isPathAllowed } from "../../../utils/permissions/pathValidation.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Vpe } from "../../../../vendor/ignore/index.js";
import { driveMountsUnder, Dst } from "../../../utils/wslMounts.js";
import { Ji } from "../../../../vendor/lodash-es/uniqBy.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { POWERSHELL_WHITESPACE, gP } from "../../../tools/PowerShellTool/powershellParsing.js";
import { SHELL_SPAWNER_PATTERN } from "../../../utils/powershell/dangerousCmdlets.js";

//@ chunk-tr0s0d0k.js:13957-14130 placement
function isServedEyeEnabled() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_eye", !1);
    return e === !0 && source !== "override";
  } catch (error) {
    return (logError(Error("tengu_violin_eye could not be read", { cause: error })), !1);
  }
}
//@ chunk-tr0s0d0k.js:14130-14347 placement
var MAX_PATH_DEPTH_PREFIX = 32,
  stripTrailingGlobstar = (e) => e.replace(/\/\*\*$/, ""),
  countPathSegments = (e) => count(e.split("/"), Boolean),
  claudeStateGlobDepth = io(
    (e) => {
      let mapped = e.map(stripTrailingGlobstar);
      return mapped.every((o) => o.startsWith("//") && !o.includes("**"))
        ? Math.max(0, ...mapped.map(countPathSegments)) + 1
        : void 0;
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
var Ho = io((e) => new RegExp(`^/*[^/]+(?:/+[^/]+){${e - 1}}`));
//@ chunk-tr0s0d0k.js:14526-14572 placement
function Ln(e, n) {
  return Ho(n).exec(e)?.[0] ?? e;
}
//@ chunk-tr0s0d0k.js:14572-14719 placement
function truncateToGuardDepth(e) {
  if (!nLe() || getPlatform() === "windows") return e;
  let n = expandPath(e);
  if (Ln(n, MAX_PATH_DEPTH_PREFIX) === n) return e;
  let o = claudeStateGlobDepth(claudeStateGlobs());
  return o === void 0 ? e : Ln(n, Math.max(o, physicalTwinPatternDepth()));
}
//@ chunk-tr0s0d0k.js:14719-14798 placement
function isCredentialBasename(e) {
  let n = truncateToGuardDepth(e);
  if (isClaudeStatePath(n)) return !0;
  let o = truncateToGuardDepth(e);
  return o !== n && isClaudeStatePath(o);
}
//@ chunk-tr0s0d0k.js:14798-15574 placement
function classifyCredentialPath(e, n, o) {
  try {
    if (
      [FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].some(
        (d) => getDenyRuleForTool(n, { name: d }) !== null || getAskRuleForTool(n, { name: d }) !== null,
      )
    )
      return "rule_or_settings";
    let r = walkPermissionCheckPaths(e);
    if (r.unresolved) return "unreadable";
    if ([r.landing, ...r.spellings].some(ck)) return "unreadable";
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
    return !s.allowed && s.decisionReason !== void 0 ? "rule_or_settings" : void 0;
  } catch (error) {
    return (
      logError(Error("a served MCP relative name could not be checked", { cause: error })),
      "unreadable"
    );
  }
}
//@ chunk-tr0s0d0k.js:15574-15593 placement
var on = Re(Vpe(), 1);
//@ chunk-tr0s0d0k.js:15652-15777 placement
function wslProfileMountRules() {
  if (getPlatform() !== "wsl") return [];
  return [
    { literal: "/mnt", profilesGlob: "/?/Users/*", startsAt: [] },
    ...driveMountsUnder("/").flatMap(userProfileMountRules),
  ];
}
//@ chunk-tr0s0d0k.js:15777-16183 placement
function userProfileMountRules({ mountPoint: mountPoint, within: within }) {
  let [, o] = /^users\/[^/]+((?:\/[^/]+)*)$/i.exec(within) ?? [];
  if (o !== void 0)
    return [{ literal: mountPoint, profilesGlob: "", startsAt: o.split("/").filter(Boolean) }];
  if (/^users$/i.test(within)) return [{ literal: mountPoint, profilesGlob: "/*", startsAt: [] }];
  if (within !== "") return [];
  return /\/[^/]$/.test(mountPoint)
    ? [{ literal: mountPoint.slice(0, -2), profilesGlob: "/?/Users/*", startsAt: [] }]
    : [{ literal: mountPoint, profilesGlob: "/Users/*", startsAt: [] }];
}
//@ chunk-tr0s0d0k.js:16183-16303 placement
function isUnderUserProfiles(e) {
  return wslProfileMountRules().some(
    ({ literal: literal, profilesGlob: profilesGlob, startsAt: startsAt }) =>
      (startsAt.length > 0 && e === literal) || e.startsWith(`${literal}${profilesGlob}/`),
  );
}
//@ chunk-tr0s0d0k.js:16303-16456 placement
function credentialPathRules() {
  return [
    ...Xo(),
    ...wslProfileMountRules().flatMap(
      ({ literal: literal, profilesGlob: profilesGlob, startsAt: startsAt }) =>
        Qo.flatMap((r) => expandCredentialGlobs(r, startsAt)).map((r) => ({
          literal: literal,
          tail: `${profilesGlob}${r}`,
        })),
    ),
  ];
}
//@ chunk-tr0s0d0k.js:16456-16728 placement
function expandCredentialGlobs(e, n) {
  let parts = e.split("/"),
    joined = n.join("/");
  if (n.length > 0 && !on.default.isPathValid(joined)) return ["", "/**"];
  if (
    n.length > 0 &&
    !on
      .default()
      .add(`/${parts.slice(0, n.length).join("/")}`)
      .ignores(joined)
  )
    return [];
  return n.length >= parts.length ? ["", "/**"] : [`/${parts.slice(n.length).join("/")}`];
}
//@ chunk-tr0s0d0k.js:16728-17651 placement
var CREDENTIAL_PATHS = [
    ".ssh",
    ".aws",
    ".config/gcloud",
    ".azure",
    ".kube",
    ".gnupg",
    ".config/gh",
    ".config/glab-cli",
  ],
  Zn = [
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
  ],
  zo = [
    "AppData/Roaming/gcloud",
    "AppData/Roaming/GitHub CLI",
    "AppData/Roaming/gnupg",
    "AppData/Local/glab-cli",
  ],
  Go = [
    "_netrc",
    "AppData/Roaming/postgresql/pgpass.conf",
    "AppData/Roaming/MySQL/.mylogin.cnf",
    "AppData/Roaming/terraform.d/credentials.tfrc.json",
    "AppData/Roaming/s3cmd.ini",
  ],
  Ko = [".claude"],
  Yn = [".claude*.json"],
  flattened = Yn.flatMap((e) => [
    ...editorBackupVariants(e).flatMap((n) => [n, `${n}.*`]),
    ...tempFileVariants(e),
  ]),
  Yo = [
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
      .replace(/[+,;=[\]]/g, "_"),
    [, o = replaced, r = ""] = /^(.*)\.([^.]*)$/.exec(replaced) ?? [],
    replaced_2 = o.replaceAll(".", "");
  if (`${replaced_2}${r && "."}${r}` === e && replaced_2.length <= 8 && r.length <= 3 && !e.includes("*"))
    return [];
  return [replaced_2.slice(0, 6), `${replaced_2.slice(0, 2)}????`].map((d) =>
    `${d}~?${r && "."}${r.slice(0, 3)}`.toUpperCase(),
  );
}
//@ chunk-tr0s0d0k.js:17983-18425 placement
var CREDENTIAL_PATH_GLOBS = [...CREDENTIAL_PATHS, ...zo, ...Ko, ...Yo],
  flattened_2 = [...Zn, ...Go, ...Yn].flatMap((e) => [e, `${e}.*`]),
  Qo = [
    ...CREDENTIAL_PATH_GLOBS.flatMap((e) => [e, `${e}/**`]),
    ...flattened_2,
    ...flattened,
    ...[...CREDENTIAL_PATH_GLOBS, ...flattened_2].flatMap((e) =>
      e.split("/").flatMap((n, o, r) => shortNameVariants(n).map((s) => [...r.slice(0, o), s].join("/"))),
    ),
  ],
  Xo = io(
    () =>
      Ji(
        [
          ...zn(CREDENTIAL_PATHS).flatMap((e) => [
            { literal: e, tail: "" },
            { literal: e, tail: "/**" },
          ]),
          ...zn(Zn).flatMap((e) => [
            { literal: e, tail: "" },
            { literal: e, tail: ".*" },
          ]),
        ],
        ({ literal: literal, tail: tail }) => `${literal}\x00${tail}`,
      ),
    () => homedir_2(),
  );
//@ chunk-tr0s0d0k.js:18425-18474 placement
function zn(e) {
  return withPathAliases(e.map((n) => join_2(homedir_2(), n)));
}
//@ chunk-tr0s0d0k.js:18474-18499 placement
var HOST_CREDENTIAL_RULE_SOURCE = "hostCredential";
//@ chunk-tr0s0d0k.js:18499-18576 placement
function hostCredentialDenyRules() {
  let e = nLe() ? [...O4e(), ...credentialPathRules()] : O4e();
  return [...credentialReadDenyRules(e), ...credentialMountDenyRules(e)];
}
//@ chunk-tr0s0d0k.js:18576-18737 placement
function credentialMountDenyRules(e) {
  return Dst().flatMap(({ mountPoint: mountPoint, readOnly: readOnly }) =>
    claudeStateGlobs(prefixRuleLiterals(mountPoint, e)).flatMap((r) => [
      { toolName: FILE_READ_TOOL_NAME, ruleContent: r },
      ...(readOnly ? [] : [{ toolName: FILE_EDIT_TOOL_NAME, ruleContent: r }]),
    ]),
  );
}
//@ chunk-tr0s0d0k.js:18737-18809 placement
function prefixRuleLiterals(e, n) {
  return n.map((o) => ({ ...o, literal: `${e}${o.literal}` }));
}
//@ chunk-tr0s0d0k.js:18809-18857 placement
function defaultCredentialDenyRules() {
  return [...credentialReadDenyRules(G8o()), ...credentialMountDenyRules(G8o())];
}
//@ chunk-tr0s0d0k.js:18857-19181 placement
function credentialReadDenyRules(e) {
  let n = getPlatform(),
    o = n === "linux" || n === "wsl";
  return [
    ...claudeStateGlobs(e).flatMap((r) => [
      { toolName: FILE_READ_TOOL_NAME, ruleContent: r },
      { toolName: FILE_EDIT_TOOL_NAME, ruleContent: r },
    ]),
    ...(o ? [{ toolName: FILE_READ_TOOL_NAME, ruleContent: "//proc/**/environ" }] : []),
    ...(n === "windows"
      ? [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME].flatMap((r) =>
          mapped.map((s) => ({ toolName: r, ruleContent: s })),
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
var CREDENTIAL_CMDLETS = ["cmdkey", "vaultcmd"],
  ut = ["PSCredentialManager", "BetterCredentials"],
  ft = [
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
    ...ut,
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
  ],
  mapped = CREDENTIAL_CMDLETS.map((e) => `*${e}*`);
//@ chunk-tr0s0d0k.js:20092-20474 placement
function cmdletPattern(e) {
  if (CREDENTIAL_CMDLETS.includes(e)) return `${e}(?:\\.exe)?`;
  if (/^Cred/.test(e)) return `${e}[AW]?`;
  if (e === "vaultcli") return "vaultcli(?:\\.dll)?";
  if (ut.includes(e)) return `${e}(?:\\.ps[dm]1|(?:\\.[A-Za-z0-9_]+)+)?`;
  let index = e.indexOf("-");
  return /(?:StoredCredential|CredManCredential)$/.test(e)
    ? `${e.slice(0, index)}-(?:[^\\s'"\`;&|(){}\\[\\],-]*|[^\\s'"\`;&|(){}\\[\\],]{0,64})${e.slice(index + 1)}`
    : e;
}
//@ chunk-tr0s0d0k.js:20474-21808 placement
var CREDENTIAL_COMMAND_RE = new RegExp(
    `(?:^|[^A-Za-z0-9_])(?:${ft.map((e) => `(${cmdletPattern(e)})`).join("|")})\\.*(?![A-Za-z0-9_.-])`,
    "i",
  ),
  or =
    /(?:^|[^A-Za-z0-9_])(?:(?:import|install|save|update|find|get)-module|ipmo|gmo|inmo|fimo|upmo|using[ \t]+(?:module|assembly)|#requires[ \t]+-(?:modules?|assembly)|(?:install|save|update|find)-psresource|(?:is|sv|ud|fd)res|(?:install|save|find)-package|get-command|gcm|add-type|loadfrom|loadfile|loadwithpartialname|unsafeloadfrom|loadfromassemblypath|loadfromstream|loadfromassemblyname|createinstancefrom|assemblyloadcontext)(?![A-Za-z0-9_-])|(?:assembly|activator|appdomain)\s*\]|reflection\s*\.\s*assembly|currentdomain|(?:^|[^A-Za-z0-9_])using[ \t]*(?:<#|`[\r\n])/i,
  rr = /(?:^|[^A-Za-z0-9_])(?:(CredentialManager)|SecretManagement)(?![A-Za-z0-9_])/i,
  sr = /(?:^|[^$])(?:(Stored)|CredMan)Credential(?![A-Za-z0-9_])/i,
  ir = /(?:^|[^A-Za-z0-9_])PasswordVault(?![A-Za-z0-9_.])/i,
  ar =
    /\[(?=\s*[\w.]*PasswordVault)|\[\s*(?:System\.)?Type\s*\]|New-Object|Credentials\.|(?:^|[^A-Za-z0-9_])-as(?:\s+[^\s;|&)-]|[^\sA-Za-z0-9_;|&)-])/i,
  dr = /(?:^|[^A-Za-z0-9_])runas(?:\.exe)?(?![A-Za-z0-9_])/i,
  lr = /\/savecred(?![A-Za-z0-9_])/i,
  cr =
    /(?:^|[^A-Za-z0-9_-])(?:iex|invoke-expression)(?![A-Za-z0-9_-])|scriptblock\s*\]|invokescript|newscriptblock|addscript|expandstring/i,
  ur = /(?:^|[^\w.-])(?:powershell|pwsh(?:-preview)?|cmd)(?:\.exe)?(?![\w-])/i;
//@ chunk-tr0s0d0k.js:21808-21862 placement
function fr(e) {
  return ur.test(e) && /[($@{%!|]/.test(e);
}
//@ chunk-tr0s0d0k.js:21862-21961 placement
var regExp = new RegExp(POWERSHELL_WHITESPACE.source.replace(/\\[tnr]| /g, "").replace(/\+$/, ""), "g"),
  pr = /[\u2013-\u2015]/g;
//@ chunk-tr0s0d0k.js:21961-22081 placement
function normalizeCommandQuotes(e) {
  return e
    .replace(regExp, " ")
    .replace(pr, "-")
    .replace(/[\u2018-\u201b]/g, "'")
    .replace(/[\u201c-\u201e]/g, '"');
}
/**
 * 检测命令中是否调用了凭证存储工具（cmdkey、vaultcmd、CredRead*、security、secret-tool 等）。
 */
//@ chunk-tr0s0d0k.js:22081-22510 placement
function credentialCommandIn(e) {
  let n = normalizeCommandQuotes(e),
    match = CREDENTIAL_COMMAND_RE.exec(n);
  if (match !== null) return ft[match.slice(1).findIndex((s) => s !== void 0)];
  let r = cr.test(n) || fr(n);
  if (or.test(n) || r) {
    let match = rr.exec(n);
    if (match !== null) return match[1] !== void 0 ? "CredentialManager" : "SecretManagement";
    let match_2 = sr.exec(n);
    if (match_2 !== null) return match_2[1] !== void 0 ? "Get-StoredCredential" : "Get-CredManCredential";
  }
  if (ir.test(n) && (ar.test(n) || r)) return "PasswordVault";
  if (dr.test(n) && lr.test(n)) return "runas";
  return;
}
//@ chunk-tr0s0d0k.js:22510-22771 placement
function readsCredentialStore(e, n = "either") {
  let o = unquoteShellWord(e),
    r = gr(e),
    s =
      n !== "powershell" ||
      [e, o, r].some((d) => {
        let u = Ee(normalizeCommandQuotes(d));
        return SHELL_SPAWNER_PATTERN.test(u) || SHELL_SPAWNER_PATTERN.test(Ee(u.normalize("NFKC")));
      });
  return uniq(
    [e, o, r, ...(s ? [joinLineContinuations(o), joinLineContinuations(r)] : [])].flatMap((d) => {
      let normalized = d.normalize("NFKC");
      return [d, Ee(d), normalized, Ee(normalized)];
    }),
  );
}
//@ chunk-tr0s0d0k.js:22978-23045 placement
function joinLineContinuations(e) {
  return e.replace(/\\\r?\n/g, "").replaceAll("\\", "");
}
//@ chunk-tr0s0d0k.js:23045-23115 placement
function Ee(e) {
  return e.replace(/\u0131/g, "i").replace(/\u017f/g, "s");
}
//@ chunk-tr0s0d0k.js:23115-23146 placement
function unquoteShellWord(e) {
  return _t(e, "");
}
//@ chunk-tr0s0d0k.js:23146-23178 placement
function gr(e) {
  return _t(e, " ");
}
//@ chunk-tr0s0d0k.js:23178-23275 placement
function _t(e, n) {
  return decodeAnsiCQuotes(gP(e.replace(/\^\r?\n/g, "")))
    .replace(/\$(?=["'])/g, "")
    .replace(yr, n);
}
//@ chunk-tr0s0d0k.js:23275-23313 placement
var hr = {
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
            s !== void 0
              ? parseInt(s, 16)
              : d !== void 0
                ? parseInt(d, 16)
                : u !== void 0
                  ? parseInt(u, 16)
                  : p !== void 0
                    ? parseInt(p, 8)
                    : void 0;
          if (_ === void 0) return hr[h ?? ""] ?? h ?? "";
          return _ <= 1114111 ? String.fromCodePoint(_) : "";
        },
      )}'`,
  );
}
//@ chunk-tr0s0d0k.js:23698-23728 placement
var yr = /["'`^\u2018-\u201e]/g;
//@ chunk-tr0s0d0k.js:23728-23784 placement
function bashPrefixRule(e) {
  return { toolName: BASH_TOOL_NAME, ruleContent: `${e}:*` };
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
