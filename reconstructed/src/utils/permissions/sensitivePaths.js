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
import { Z8o, xli } from "../env.js";
import { foldName, dbr } from "./protectedDirNames.js";
import { isClaudeStatePath, CLAUDE_STATE_FILENAMES, getClaudeConfigDirs } from "./claudeStatePaths.js";
import { uniq } from "../collections.js";
import { getPlatform } from "../platform.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { Be } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { CCR_OAUTH_TOKEN_PATH, whs } from "../authFileDescriptor.js";

//@ chunk-yf82ynbr.js:677-950 placement
var EDITOR_BACKUP_SUFFIX_RE = String.raw`\.sw[a-p]|\.un~|\.rej|\.save\.\d+|\.save|\.tmp|\.temp|\.bak|\.old|\.orig|\.backup|\.~\d+~|~`,
  COPY_MARK_SUFFIX_RE = String.raw`\.part(?:ial)?|\.(?:cr)?download| copy| - copy| \d+| ?\(\d+\)| \((?=[^()/]*(?:conflict|copy))[^()/]*\)|\.sync-conflict-[\w-]+`,
  BACKUP_OR_COPY_SUFFIX_RE = `${EDITOR_BACKUP_SUFFIX_RE}|${COPY_MARK_SUFFIX_RE}`,
  OFFICE_LOCK_PREFIX = ".~ (";
//@ chunk-yf82ynbr.js:950-979 placement
var TENGU_VIOLIN_MAPLE = "tengu_violin_maple";
//@ chunk-yf82ynbr.js:979-1042 placement
async function lTt() {
  try {
    return await checkGate_OWN_OFF_FIRST(TENGU_VIOLIN_MAPLE);
  } catch {
    return !1;
  }
}
//@ chunk-yf82ynbr.js:1042-1072 placement
async function gor() {
  return !1;
}
//@ chunk-yf82ynbr.js:1072-1096 placement
function Uxe() {
  return !1;
}
/**
 * 敏感目录/文件名表（.ssh、.aws、.azure、.gnupg 等），用于读写权限判断
 */
//@ chunk-yf82ynbr.js:1096-3436 placement
var SENSITIVE_DIR_NAMES = [".ssh", ".aws", ".azure", ".gnupg", ".kube", ".docker"],
  te = [
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
  ],
  re = [
    ".netrc",
    "_netrc",
    ".git-credentials",
    ".gitconfig",
    CREDENTIALS_FILE_NAME,
    DEVICE_KEYS_FILE_NAME,
    Z8o,
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
  ],
  w =
    /(?:\.(?:pem|key|p12|pfx|keystore|jks)|_(?:rsa|dsa|ecdsa|ed25519)(?:_sk(?:_rk(?:_.*)?)?)?|secrets?\.(?:ya?ml|json|toml))$/s,
  d = ".env",
  oe = Z8o,
  G = ["example", "sample", "template", "dist"],
  regExp = new RegExp(`(?:${BACKUP_OR_COPY_SUFFIX_RE})$`, "i"),
  regExp_2 = new RegExp(`(?:${EDITOR_BACKUP_SUFFIX_RE})$`, "i"),
  regExp_3 = new RegExp(
    `(?:${BACKUP_OR_COPY_SUFFIX_RE})((?!(?:${BACKUP_OR_COPY_SUFFIX_RE})$)(?!\\.\\d+$)\\.[^./]+)$`,
    "i",
  ),
  f = 64,
  U$e = 255,
  le = [/(?!)/, /:[^:]*$/, /:[^:]*:[^:]*$/, /:.*$/s],
  ce = /~[^/~.][^/~]*$/,
  w3o = "(?:BACKUP|BASE|LOCAL|REMOTE)",
  E3o = `_${w3o}_(?:[LR]CONFL_)?\\d{2,}`,
  regExp_4 = new RegExp(`^(.*)${E3o}(\\.[^./]*)?$`, "is"),
  ue = ".git",
  CONFIG = "config";
/**
 * 路径（及其大小写折叠、副本标记去除等变体）是否命中 Claude 自身状态路径。
 */
//@ chunk-yf82ynbr.js:3436-3748 placement
function isClaudeStatePathVariant(e, n = g(e)) {
  if (!isAbsolute(e)) return !1;
  let r = `/${n.map(foldName).join("/")}`;
  if (
    (r === e ? [e] : [e, r]).some(
      (i) => isClaudeStatePath(i) || getBasenameVariants(i).some(isClaudeStatePath),
    )
  )
    return !0;
  let o = `/${n.join("/")}`;
  if ((o === r ? [o] : [o, r]).some(pe)) return !0;
  let s = `/${n.map((i, c) => (c === n.length - 1 ? i : stripCopyMarks(i, y))).join("/")}`;
  if (s !== o && (isClaudeStatePath(s) || getBasenameVariants(s).some(isClaudeStatePath))) return !0;
  return !1;
}
//@ chunk-yf82ynbr.js:3748-3825 placement
function hor(e) {
  return isSensitivePath(e, { exceptFiles: k, withGitConfigBelowGitFolders: !0 });
}
//@ chunk-yf82ynbr.js:3825-3839 placement
var k = new Set();
/**
 * 路径是否敏感：段过长、Claude 状态路径、敏感目录名、敏感路径前缀、全局 Claude 目录，或末段为敏感文件（可排除部分文件）；可选把 .git 目录下的 config 视为敏感。
 */
//@ chunk-yf82ynbr.js:3839-4204 placement
function isSensitivePath(
  e,
  { exceptFiles: exceptFiles, withGitConfigBelowGitFolders: withGitConfigBelowGitFolders },
) {
  let r = g(e);
  if (r.some((l) => l.length > U$e)) return !0;
  if (isClaudeStatePathVariant(e, r)) return !0;
  let { readingsByFold: readingsByFold, readings: readings, present: present } = expandSegmentReadings(r),
    c = readings.at(-1) ?? [];
  return (
    readingsByFold.some((l) => l.some((a) => a.length > f)) ||
    readings.some((l) => l.some((a) => SENSITIVE_DIR_NAMES.includes(a))) ||
    te.some((l) => T(readings, l) || T(present, l)) ||
    (Y(present) && h()) ||
    isInGlobalClaudeFolder(readings) ||
    isInGlobalClaudeFolder(present) ||
    c.some((l) => isSensitiveBasename(l, exceptFiles)) ||
    (withGitConfigBelowGitFolders && ge(readings))
  );
}
//@ chunk-yf82ynbr.js:4204-4303 placement
function ge(e) {
  return (e.at(-1) ?? []).some(Ae) && e.slice(0, -1).some((n) => n.some((t) => t.endsWith(ue)));
}
//@ chunk-yf82ynbr.js:4303-4480 placement
function expandSegmentReadings(e) {
  let mapped = e.map((r, o) => segmentReadings(r, o === e.length - 1)),
    mapped_2 = mapped.map((r) => uniq(r.flat()));
  return {
    readingsByFold: mapped,
    readings: mapped_2,
    present: mapped_2.filter((r, o) => o === e.length - 1 || !mapped[o]?.[0]?.some(isDecorationOnlyName)),
  };
}
//@ chunk-yf82ynbr.js:4480-4593 placement
function segmentReadings(e, n) {
  let t = expandNameReadings(e, { leadingDot: n });
  return bor(e).map((r) => uniq([...expandNameReadings(r(e), { leadingDot: n }), ...t.map(r)]));
}
//@ chunk-yf82ynbr.js:4593-4634 placement
function Eai(e) {
  return uniq(segmentReadings(e, !1).flat());
}
//@ chunk-yf82ynbr.js:4634-4762 placement
function stripCopyMarks(e, n) {
  if (e.length > U$e) return e;
  let t = e;
  for (;;) {
    let reduced = n.reduce((o, s) => (o === t ? s(o) : o), t);
    if (reduced === t || R.has(reduced)) return t;
    t = reduced;
  }
}
/**
 * 生成路径的别名变体（去掉备份/副本后缀、拆分扩展名等）用于敏感路径匹配，去掉与原路径相同的。
 */
//@ chunk-yf82ynbr.js:4762-5062 placement
function getPathAliasVariants(e) {
  let parts = e.split("/"),
    t = parts.at(-1) ?? "",
    sliced = parts.slice(0, -1),
    mapped = sliced.filter((l) => !isDecorationOnlyName(l)).map((l) => stripCopyMarks(l, B)),
    s = stripCopyMarks(t, y),
    i =
      isDecorationOnlyName(t) ||
      isDecorationOnlyName(s) ||
      (t.length <= U$e && expandNameReadings(t, { leadingDot: !0 }).some(isDecorationOnlyName))
        ? ""
        : s,
    c = (l, a) => [...l, a].join("/");
  return uniq([
    c(sliced, i),
    c(sliced, b(t)),
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
  return expandNameReadings(sliced, { leadingDot: !0 })
    .filter((r) => r !== sliced)
    .map((r) => `${e.slice(0, n + 1)}${r}`);
}
//@ chunk-yf82ynbr.js:5287-5360 placement
function pe(e) {
  let n = getPathNormalizationVariants(e);
  return n === null ? !0 : n.some((t) => isAbsolute(t) && isClaudeStatePath(t));
}
//@ chunk-yf82ynbr.js:5360-5405 placement
function _H(e) {
  return [e, ...getPathAliasVariants(e)].some(hor);
}
/**
 * 判断路径最后一段（含原样与规整变体）是否为敏感文件名。
 */
//@ chunk-yf82ynbr.js:5405-5535 placement
function isSensitiveFileName(e) {
  let at = g(e).at(-1);
  if (at === void 0) return !0;
  return bor(at)
    .flatMap((t) => [t(at), m(t(m(at)))])
    .some((t) => K(t) || w.test(t));
}
//@ chunk-yf82ynbr.js:5535-5584 placement
function _e() {
  return getPlatform() === "windows" ? /[\\/]/ : "/";
}
//@ chunk-yf82ynbr.js:5584-5639 placement
function g(e) {
  return e.split(_e()).filter((n) => n !== "");
}
//@ chunk-yf82ynbr.js:5639-5718 placement
function T(e, n) {
  return e.some((t, r) => n.every((o, s) => e[r + s]?.includes(o) === !0));
}
//@ chunk-yf82ynbr.js:5718-5845 placement = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  return filePath.some(
    (n, t) =>
      n.includes(".claude") &&
      filePath[t + 1]?.some((r) => CLAUDE_STATE_FILENAMES.some((o) => r === o || r.startsWith(`${o}.`))) ===
        !0,
  );
}
//@ chunk-yf82ynbr.js:5845-5929 placement
var P = [Ie, Re, W, b, m],
  B = [Se, ...P],
  y = [Ee, ye, ...P],
  me = [...y, _],
  R = new Set(["", ".", ".."]);
/**
 * 反复应用规整函数（去前导点、去副本标记等），得到名字的所有读法（有上限）。
 */
//@ chunk-yf82ynbr.js:5929-6224 placement
function expandNameReadings(e, { leadingDot: n = !0, copyMarks: t = !0 } = {}) {
  let r = n ? me : t ? y : B;
  if (r.every((s) => s(e) === e)) return [e];
  let o = (s, i) => {
    if (i.length === 0 || s.size > f) return s;
    let filtered = uniq(i.flatMap((l) => r.map((a) => a(l)))).filter((l) => !s.has(l) && !R.has(l));
    return o(new Set([...s, ...filtered]), filtered);
  };
  return [...o(new Set([e]), [e])];
}
//@ chunk-yf82ynbr.js:6224-6305 placement
function Ee(e) {
  let match = regExp.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6305-6387 placement
function Se(e) {
  let match = regExp_2.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6387-6467 placement
function ye(e) {
  let match = regExp_3.exec(e);
  return match === null ? e : e.slice(0, match.index) + (match[1] ?? "");
}
//@ chunk-yf82ynbr.js:6467-6549 placement
function Ie(e) {
  let match = ce.exec(e);
  return match === null || match.index === 0 ? e : e.slice(0, match.index);
}
//@ chunk-yf82ynbr.js:6549-6634 placement
function Re(e) {
  let match = regExp_4.exec(e),
    t = match === null ? "" : `${match[1]}${match[2] ?? ""}`;
  return t === "" ? e : t;
}
//@ chunk-yf82ynbr.js:6634-6718 placement
function W(e) {
  return e.length > 2 && e.startsWith("#") && e.endsWith("#") ? e.slice(1, -1) : e;
}
//@ chunk-yf82ynbr.js:6718-6783 placement
function b(e) {
  return e.length > 2 && e.startsWith(".#") ? e.slice(2) : e;
}
//@ chunk-yf82ynbr.js:6783-6830 placement
function _(e) {
  return e.replace(/^\.(?=.)/s, "");
}
//@ chunk-yf82ynbr.js:6830-6856 placement
var U = `
\r\u2028\u2029. `;
//@ chunk-yf82ynbr.js:6856-6944 placement
function m(e) {
  let n = e.length;
  while (n > 0 && U.includes(e[n - 1] ?? "")) n -= 1;
  return e.slice(0, n);
}
//@ chunk-yf82ynbr.js:6944-7123 placement
function isDecorationOnlyName(e) {
  if (R.has(e) || !O6r.includes(e[0] ?? "") || e.length > U$e) return !1;
  let n = e;
  for (;;) {
    let t = m(n.replace(regExp, "")),
      r = W(t),
      o = r === t ? b(t) : r;
    if (o === "") return !0;
    if (o === n) return !1;
    n = o;
  }
}
//@ chunk-yf82ynbr.js:7123-7143 placement
var O6r = `${OFFICE_LOCK_PREFIX}#${U}`;
/**
 * 生成路径的规范化变体（逐段读法组合、NFKC/NFKD 与大小写折叠），组合数超限时返回 null 表示无法判定。
 */
//@ chunk-yf82ynbr.js:7143-7361 placement
function getPathNormalizationVariants(e) {
  if (QSn(e)) return null;
  let n = expandPathReadings(e);
  if (n === null) return null;
  let t = getUnicodeFoldVariants(e);
  if (t.length === 0) return n;
  let mapped = t.map(expandPathReadings);
  return mapped.some((o) => o === null)
    ? null
    : uniq([...n, ...t, ...mapped.flatMap((o) => o ?? [])]).filter((o) => o !== e);
}
//@ chunk-yf82ynbr.js:7361-7455 placement
function QSn(e) {
  let parts = e.split("/");
  return e.length > Oe || parts.length > xe || parts.some((t) => t.length > U$e);
}
/**
 * 按段展开路径读法的笛卡尔积（中间段若可能是纯装饰名还包括省略它），超限返回 null；无变化返回空数组。
 */
//@ chunk-yf82ynbr.js:7455-7909 placement
function expandPathReadings(e) {
  let parts = e.split("/"),
    mapped = parts.map((o, s) => {
      let i = s === parts.length - 1,
        c = expandNameReadings(o, { leadingDot: i, copyMarks: i });
      return { readings: c, absentToo: !i && c.some(isDecorationOnlyName) };
    });
  if (mapped.every((o) => o.readings.length === 1 && !o.absentToo)) return [];
  let reduced = mapped.reduce(
    (o, { readings: readings, absentToo: absentToo }) => {
      if (o === null || readings.length > f) return null;
      let flattened = o.flatMap((l) => [...readings.map((a) => [...l, a]), ...(absentToo ? [l] : [])]);
      return flattened.length > f ? null : flattened;
    },
    [[]],
  );
  return reduced === null ? null : uniq(reduced.map((o) => o.join("/"))).filter((o) => o !== e);
}
//@ chunk-yf82ynbr.js:7909-8069 placement
function getUnicodeFoldVariants(e) {
  if (Te.test(e)) return [];
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
var stripIgnorableChars = (e) => e.replace(be, ""),
  UNICODE_FOLDERS = [
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
    !R.has(e) &&
    !e.includes("/") &&
    e.length <= U$e &&
    [...he].every((t) => e.split(t).length - 1 <= n.split(t).length - 1)
  );
}
//@ chunk-yf82ynbr.js:8399-8493 placement
var Te = /^[\x00-\x7f]*$/,
  be = /\p{Default_Ignorable_Code_Point}/gu,
  he = '\\:*?"<>|',
  Oe = 4096,
  xe = 256;
//@ chunk-yf82ynbr.js:8493-8681 placement
function isSensitiveBasename(e, n = k) {
  return (
    (re.includes(e) && !n.has(e)) ||
    w.test(e) ||
    K(e) ||
    e.startsWith(`${oe}.`) ||
    e.startsWith(".config.json.") ||
    e.startsWith(`${CREDENTIALS_FILE_NAME}.`) ||
    e.startsWith(`${DEVICE_KEYS_FILE_NAME}.`) ||
    we(e) ||
    je(e)
  );
}
//@ chunk-yf82ynbr.js:8681-8772 placement
function K(e) {
  return e === d || (e.startsWith(`${d}.`) && !G.includes(e.slice(d.length + 1))) || De(e);
}
//@ chunk-yf82ynbr.js:8772-8823 placement
function Ae(e) {
  return e === CONFIG || e.startsWith(`${CONFIG}.`);
}
//@ chunk-yf82ynbr.js:8823-8885 placement
function De(e) {
  return e.endsWith(d) && !E(e.slice(0, -d.length));
}
//@ chunk-yf82ynbr.js:8885-8921 placement
var ve = /^(.*)\.tfvars(?:\.json)?$/s;
//@ chunk-yf82ynbr.js:8921-8983 placement
function we(e) {
  let n = ve.exec(e)?.[1];
  return n !== void 0 && !E(n);
}
//@ chunk-yf82ynbr.js:8983-9559 placement
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
  ],
  Me =
    /^(?:service[-_]account(?:[-_]?key)?\.json|serviceaccountkey\.json|client_secret_.+\.apps\.googleusercontent\.com\.json|ssh_host_(?:rsa|dsa|ecdsa|ed25519)_key|fishd\.[0-9a-f]{12})$/s,
  ke = /^\.(?:dev\.vars\.|vault_pass)/,
  $e = /^(.*)\.(?:tfstate(?:\.\d+)?|kdbx|ovpn)$/s;
//@ chunk-yf82ynbr.js:9559-9591 placement
function je(e) {
  return isSensitiveFileNameLike(e) && h();
}
//@ chunk-yf82ynbr.js:9591-9647 placement
function h() {
  if (isCcsTenant()) return !0;
  if (isHttpMcpServeInvocation()) return !0;
  return !1;
}
/**
 * 凭据配置文件的相对路径（git credentials、gh hosts.yml、gcloud 凭据库）。
 */
//@ chunk-yf82ynbr.js:9647-9756 placement
var CREDENTIAL_CONFIG_PATHS = [
  ["git", "credentials"],
  ["gh", "hosts.yml"],
  ["gcloud", "credentials.db"],
  ["gcloud", "access_tokens.db"],
];
//@ chunk-yf82ynbr.js:9756-9816 placement
function Y(e) {
  return CREDENTIAL_CONFIG_PATHS.some((n) => T(e.slice(-n.length), n));
}
/**
 * 路径（含别名变体）是否指向 git/gh/gcloud 的凭证配置文件。
 */
//@ chunk-yf82ynbr.js:9816-10078 placement
function isCredentialConfigPath(e) {
  return [e, ...getPathAliasVariants(e)].some((n) => {
    let t = g(n);
    if (t.some((i) => i.length > U$e)) return !0;
    let flat = segmentReadings(t.at(-1) ?? "", !0).flat();
    if (!CREDENTIAL_CONFIG_PATHS.some(([, i]) => flat.includes(i))) return !1;
    let { readingsByFold: readingsByFold, present: present } = expandSegmentReadings(t);
    return readingsByFold.some((i) => i.some((c) => c.length > f)) || Y(present);
  });
}
//@ chunk-yf82ynbr.js:10078-10113 placement
function v3o(e) {
  return isCredentialConfigPath(e) && h();
}
//@ chunk-yf82ynbr.js:10113-10221 placement
function isSensitiveFileNameLike(e) {
  let n = $e.exec(e)?.[1];
  return SENSITIVE_FILE_NAMES.includes(e) || Me.test(e) || (ke.test(e) && !E(e)) || (n !== void 0 && !E(n));
}
//@ chunk-yf82ynbr.js:10221-10305 placement
function B$e(e) {
  return [e, ...getPathAliasVariants(e)].some((n) =>
    segmentReadings(g(n).at(-1) ?? "", !0)
      .flat()
      .some(isSensitiveFileNameLike),
  );
}
//@ chunk-yf82ynbr.js:10305-10362 placement
function E(e) {
  return G.includes(e.split(".").at(-1) ?? "");
}
//@ chunk-yf82ynbr.js:10362-10453 placement
function bor(e) {
  return e.includes(":") ? [foldName, ...le.map((n) => (t) => dbr(t.replace(n, "")))] : [foldName];
}
//@ chunk-yf82ynbr.js:10512-10575 placement
function mqt(e) {
  return Be.some((n) => e === n || e.startsWith(n + sep));
}
//@ chunk-yf82ynbr.js:10575-10588 placement
var j$e = 4096;
//@ chunk-yf82ynbr.js:10588-10635 placement
function q(e) {
  return realpath(e).catch(() => {
    return;
  });
}
/**
 * 判断路径类别：Claude 自身或设备文件返回 own_or_device；否则名字像凭证文件时返回 credential_name（附加模式下不检查名字）。
 */
//@ chunk-yf82ynbr.js:10635-10824 placement
async function classifyCredentialPath(
  e,
  n,
  { attached: t = !1, readable: r = !1, realDirectory: o = q } = {},
) {
  if (mqt(n) || (r ? J(n) : await isInClaudeConfigDir(n, o))) return "own_or_device";
  return !t && (_H(e) || (n !== e && _H(n))) ? "credential_name" : void 0;
}
//@ chunk-yf82ynbr.js:10824-10879 placement
async function Ope(e, n) {
  return (await classifyCredentialPath(e, n)) !== void 0;
}
/**
 * 路径是否在 Claude 配置目录或 CCR OAuth 令牌目录下（按真实路径比较）。
 */
//@ chunk-yf82ynbr.js:10879-11040 placement
async function isInClaudeConfigDir(e, n = q) {
  if (J(e)) return !0;
  let t = normalizeRelativePath(e);
  for (let r of [...getClaudeConfigDirs(), dirname(CCR_OAUTH_TOKEN_PATH)]) {
    let o = normalizeRelativePath((await n(r)) ?? resolve(r));
    if (t === o || t.startsWith(`${o}/`)) return !0;
  }
  return !1;
}
//@ chunk-yf82ynbr.js:11040-11078 placement
function J(e) {
  return isClaudeStatePath(e) || isClaudeConfigFileName(basename(e));
}
//@ chunk-yf82ynbr.js:11078-11151 placement = setCwdState (1)
function normalizeRelativePath(cwd) {
  return cwd.normalize("NFC").split(/[\\/]/).map(foldName).join("/");
}
//@ chunk-yf82ynbr.js:11151-11329 placement
function isClaudeConfigFileName(e) {
  let n = foldName(e);
  if (/^\.claude.*\.json/.test(n)) return !0;
  return [...xli, ...whs.map((t) => basename(t))].some((t) => {
    let r = foldName(t);
    return n === r || n === `${r}~` || n.startsWith(`${r}.`);
  });
}

export {
  Ope,
  B$e,
  isCredentialConfigPath,
  lTt,
  gor,
  hor,
  TENGU_VIOLIN_MAPLE,
  j$e,
  _H,
  Eai,
  isSensitiveFileName,
  getPathNormalizationVariants,
  QSn,
  Uxe,
  classifyCredentialPath,
  mqt,
  isInClaudeConfigDir,
  CREDENTIAL_CONFIG_PATHS,
  v3o,
  O6r,
  w3o,
  E3o,
  U$e,
  expandNameReadings,
  bor,
  getPathAliasVariants,
};
