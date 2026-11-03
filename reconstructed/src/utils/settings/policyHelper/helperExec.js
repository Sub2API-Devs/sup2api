/**
 * utils/settings/policyHelper/helperExec.ts
 *
 * policyHelper 执行与重试（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (44)
 * attribution: placement 44
 */
import { win32, win32 as win32_2, posix } from "path";
import { uniq } from "../../collections.js";
import { Ge, ht, We, yn, $i, POWERSHELL_NONINTERACTIVE_ARGS } from "../../shell/powershellDetection.js";
import { getPlatform } from "../../platform.js";
import {
  Nps,
  MAX_HELPER_RETRIES,
  MAX_HELPER_MS,
  PATH_OR_SCRIPT_MESSAGE,
  validateInlineHelper,
  Hps,
  $ps,
  PS1_WILDCARD_MESSAGE,
  Mps,
  fOn,
  Dps,
  isNormalizedHelperPath,
} from "../types.js";
import { getPlanSlug_2 } from "../../plans.js";
import { withDeadline, fullJitterBackoffMs, sleep } from "../../sleep.js";
import { getErrnoCode } from "../../errors.js";
import { getFsImplementation } from "../../fsOperations.js";
import { containsCredential, redactJvmOptionsEnvValue, helperProcessEnv } from "./helperEnv.js";
import { stripControlChars } from "../writeQueues.js";
import { truncateToLength } from "../../stringUtils.js";
import { logForDebugging } from "../../debug.js";
import { HELPER_TIMEOUT_MS, R, MAX_HELPER_OUTPUT_BYTES, HELPER_OUTPUT_SCHEMA } from "./policyHelper.js";
import { AQ } from "../managedSettingsFiles.js";
import { Mr } from "./helperRemote.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { safeParseJSON } from "../../json.js";
import { validatePayloadAndLog } from "./helperPayload.js";
import { serializeSettingsErrors } from "../../fileStateCache.js";

//@ chunk-q8cqcff6.js:21656-22068 placement
var POWERSHELL_HELPER_PATHS =
    "PowerShell not found at any of its stock install locations on C: (fixed absolute candidates only; PATH is never consulted)",
  CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH = "CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH",
  CLAUDE_CODE_POLICY_HELPER_PS1_PATH = "CLAUDE_CODE_POLICY_HELPER_PS1_PATH",
  Bi = `$env:PSModulePath = $env:${CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH}; `,
  zi =
    "if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {} }; ";
//@ chunk-q8cqcff6.js:22068-22186 placement
function wrapPowerShellCommand(e) {
  return `${Bi}${zi}$LASTEXITCODE = 0; try { ${e} } catch { Write-Error $_; exit 1 }; exit $LASTEXITCODE`;
}
//@ chunk-q8cqcff6.js:22186-22268 placement
var Vi = wrapPowerShellCommand(`& ($env:${CLAUDE_CODE_POLICY_HELPER_PS1_PATH})`),
  ji = wrapPowerShellCommand("Invoke-Expression (@($input) -join [char]10)");
//@ chunk-q8cqcff6.js:22268-22403 placement
function psModulePath(e) {
  return uniq([
    `${e}\\Modules`,
    `${Ge}\\PowerShell\\Modules`,
    `${Ge}\\WindowsPowerShell\\Modules`,
    `${ht}\\Modules`,
  ]).join(";");
}
//@ chunk-q8cqcff6.js:22403-22465 placement
function Ji(e) {
  return uniq([e, We, yn, `${We}\\Wbem`, ht]).join(";");
}
/**
 * policyHelper 解释器环境清理用的常量：安全 PATHEXT、.NET 注入前缀、pwsh 与 sh 要删除的变量和前缀、安全 POSIX PATH。
 */
//@ chunk-q8cqcff6.js:22465-23093 placement
var SAFE_PATHEXT = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC",
  DOTNET_ENV_PREFIXES = ["DOTNET_", "COMPLUS_", "COR_", "CORECLR_", "APPDOMAIN_MANAGER_"],
  PWSH_STRIPPED_ENV = new Set([
    "DEVPATH",
    "__PSLOCKDOWNPOLICY",
    "PSMODULEANALYSISCACHEPATH",
    "PSMODULEPATH",
    "PATH",
    "PATHEXT",
    "COMSPEC",
    "TERM",
    CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH,
    CLAUDE_CODE_POLICY_HELPER_PS1_PATH,
  ]),
  SH_STRIPPED_ENV_PREFIXES = ["LD_", "DYLD_", "BASH_FUNC_", "__BASH_FUNC<", "LC_"],
  SH_STRIPPED_ENV = new Set([
    "ENV",
    "BASH_ENV",
    "SHELLOPTS",
    "PS4",
    "GCONV_PATH",
    "IFS",
    "PWD",
    "CDPATH",
    "OLDPWD",
    "TMOUT",
    "POSIXLY_CORRECT",
    "BASHOPTS",
    "BASH_COMPAT",
    "EXECIGNORE",
    "BASH_SOURCE_PATH",
    "BASH_LOADABLES_PATH",
    "GLOBIGNORE",
    "GLOBSORT",
    "LOCPATH",
    "PATH_LOCALE",
    "NLSPATH",
    "LANG",
    "TMPDIR",
    "TMP",
    "TEMP",
  ]),
  SAFE_POSIX_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
//@ chunk-q8cqcff6.js:23093-23209 placement
function deleteEnvMatching(e, n, r, s) {
  for (let S of Object.keys(e)) {
    let E = s(S);
    if (n.has(E) || r.some((h) => E.startsWith(h))) delete e[S];
  }
}
/**
 * 按路由的解释器调整 policyHelper 环境：sh 删除危险变量并固定 PATH 与 LC_ALL；pwsh 删除 .NET 注入变量，设置模块路径、PATH、PATHEXT、COMSPEC、TERM 与 ps1 路径。
 */
//@ chunk-q8cqcff6.js:23209-23562 placement
function interpreterEnv(e, n) {
  let r = { ...e };
  switch (n.routedInterpreter) {
    case void 0:
      return r;
    case "sh":
      return (
        deleteEnvMatching(r, SH_STRIPPED_ENV, SH_STRIPPED_ENV_PREFIXES, (s) => s),
        (r.PATH = SAFE_POSIX_PATH),
        (r.LC_ALL = "C"),
        r
      );
    case "pwsh": {
      deleteEnvMatching(r, PWSH_STRIPPED_ENV, DOTNET_ENV_PREFIXES, (S) => S.toUpperCase());
      let dir = win32_2.dirname(n.file);
      if (
        ((r.PSModulePath = psModulePath(dir)),
        (r[CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH] = r.PSModulePath),
        (r.PATH = Ji(dir)),
        (r.PATHEXT = SAFE_PATHEXT),
        (r.COMSPEC = $i),
        (r.TERM = "dumb"),
        n.ps1Path !== void 0)
      )
        r[CLAUDE_CODE_POLICY_HELPER_PS1_PATH] = n.ps1Path;
      return r;
    }
  }
}
//@ chunk-q8cqcff6.js:23562-23623 placement
function An(e) {
  return getPlatform() === "windows" ? win32_2.dirname(e.file) : "/";
}
/**
 * 生成 policyHelper 的启动计划：内联脚本用 /bin/sh -s 或 PowerShell 执行；路径型在 Windows 上的 .ps1 经 PowerShell 运行，否则直接执行该文件；无路径无脚本报 bad_path。
 */
//@ chunk-q8cqcff6.js:23623-24010 placement
function helperLaunchPlan(e) {
  if (e.script != null) {
    if (e.interpreter === "sh")
      return { plan: { file: "/bin/sh", args: ["-s"], input: e.script, routedInterpreter: "sh" } };
    return pwshPlan({ args: [...POWERSHELL_NONINTERACTIVE_ARGS, "-Command", ji], input: e.script });
  }
  let { path: path } = e;
  if (path == null) return { error: "no path or script configured", code: "bad_path" };
  if (getPlatform() !== "windows" || !Nps(path)) return { plan: { file: path, args: [] } };
  return pwshPlan({ args: [...POWERSHELL_NONINTERACTIVE_ARGS, "-Command", Vi], ps1Path: path });
}
//@ chunk-q8cqcff6.js:24010-24148 placement
function pwshPlan(e) {
  let n = getPlanSlug_2();
  if (n === null) return { error: POWERSHELL_HELPER_PATHS, code: "interpreter_unavailable" };
  return { plan: { file: n, routedInterpreter: "pwsh", ...e } };
}
//@ chunk-q8cqcff6.js:24148-24423 placement
async function checkHelperFile(e, n, r) {
  if (e.routedInterpreter !== void 0) return null;
  let s;
  try {
    s = await withDeadline(statCached(e.file, r), n);
  } catch (error) {
    return `cannot stat path (${getErrnoCode(error) ?? "unknown error"}): ${e.file}`;
  }
  if (s === void 0) return Pt(e.file, n);
  return s.isFile() ? null : `path is not a regular file: ${e.file}`;
}
//@ chunk-q8cqcff6.js:24423-24539 placement
function statCached(e, n) {
  let r = n.get(e);
  if (r === void 0) {
    ((r = getFsImplementation().stat(e)), n.set(e, r));
    let s = () => n.delete(e);
    r.then(s, s);
  }
  return r;
}
//@ chunk-q8cqcff6.js:24539-24613 placement
function Pt(e, n) {
  return `cannot stat path (timed out after ${n} ms): ${e}`;
}
/**
 * policyHelper 子进程需清除的凭据类环境变量表
 */
//@ chunk-q8cqcff6.js:24613-29058 placement
var CREDENTIAL_SCRUB_ENV_VARS = [
    "ANTHROPIC_API_KEY",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
    "CLAUDE_CODE_ARTIFACTS_API_TOKEN",
    "CLAUDE_CODE_MEMORY_API_TOKEN",
    "CLAUDE_CODE_SLACK_TAG_TOKEN",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_FOUNDRY_API_KEY",
    "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
    "ANTHROPIC_AWS_API_KEY",
    "ANTHROPIC_CUSTOM_HEADERS",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_BEARER_TOKEN_BEDROCK",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_GHA_CREDS_PATH",
    "AZURE_CLIENT_SECRET",
    "IDENTITY_HEADER",
    "MSI_SECRET",
    "AZURE_CLIENT_CERTIFICATE_PATH",
    "AZURE_CLIENT_CERTIFICATE_PASSWORD",
    "AZURE_PASSWORD",
    "AZURE_FEDERATED_TOKEN_FILE",
    "AWS_WEB_IDENTITY_TOKEN_FILE",
    "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
    "AWS_CONTAINER_CREDENTIALS_FULL_URI",
    "AWS_CONTAINER_AUTHORIZATION_TOKEN",
    "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE",
    "CLOUDSDK_AUTH_ACCESS_TOKEN",
    "GOOGLE_OAUTH_ACCESS_TOKEN",
    "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
    "HF_TOKEN",
    "HUGGING_FACE_HUB_TOKEN",
    "HUGGINGFACEHUB_API_TOKEN",
    "NODE_AUTH_TOKEN",
    "NUGET_AUTH_TOKEN",
    "CARGO_REGISTRY_TOKEN",
    "TWINE_PASSWORD",
    "TWINE_USERNAME",
    "PYPI_TOKEN",
    "PYPI_API_TOKEN",
    "UV_PUBLISH_TOKEN",
    "UV_PUBLISH_PASSWORD",
    "UV_PUBLISH_USERNAME",
    "FLIT_PASSWORD",
    "FLIT_USERNAME",
    "HATCH_INDEX_AUTH",
    "HATCH_INDEX_USER",
    "GEM_HOST_API_KEY",
    "MATURIN_PYPI_TOKEN",
    "MATURIN_PASSWORD",
    "MATURIN_USERNAME",
    "CONAN_LOGIN_USERNAME",
    "CONAN_PASSWORD",
    "ANACONDA_API_TOKEN",
    "BINSTAR_API_TOKEN",
    "VAULT_TOKEN",
    "VAULT_AUTH_TOKEN",
    "VAULT_ROLE_ID",
    "VAULT_SECRET_ID",
    "CONSUL_HTTP_TOKEN",
    "CONSUL_HTTP_AUTH",
    "NOMAD_TOKEN",
    "NOMAD_HTTP_AUTH",
    "CI_REGISTRY_USER",
    "CI_DEPLOY_USER",
    "JF_USER",
    "FASTLANE_SESSION",
    "MATCH_GIT_BASIC_AUTHORIZATION",
    "SONAR_TOKEN",
    "SONARQUBE_SCANNER_PARAMS",
    "SONAR_SCANNER_JSON_PARAMS",
    "SLACK_WEBHOOK_URL",
    "SLACK_WEBHOOK",
    "DISCORD_WEBHOOK",
    "DISCORD_WEBHOOK_URL",
    "TEAMS_WEBHOOK_URL",
    "MS_TEAMS_WEBHOOK_URI",
    "ANTHROPIC_IDENTITY_TOKEN",
    "ANTHROPIC_IDENTITY_TOKEN_FILE",
    "CLOUDSDK_AUTH_ACCESS_TOKEN_FILE",
    "CLOUDSDK_AUTH_AUTHORIZATION_TOKEN_FILE",
    "AZURE_AUTH_LOCATION",
    "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
    "ACTIONS_ID_TOKEN_REQUEST_URL",
    "ACTIONS_RUNTIME_TOKEN",
    "ACTIONS_RUNTIME_URL",
    "ALL_INPUTS",
    "VSS_NUGET_EXTERNAL_FEED_ENDPOINTS",
    "ARTIFACTS_CREDENTIALPROVIDER_EXTERNAL_FEED_ENDPOINTS",
    "VSS_NUGET_ACCESSTOKEN",
    "ARTIFACTS_CREDENTIALPROVIDER_ACCESSTOKEN",
    "COMPOSER_AUTH",
    "OVERRIDE_GITHUB_TOKEN",
    "DEFAULT_WORKFLOW_TOKEN",
    "SSH_SIGNING_KEY",
  ],
  io = [
    "AWS_SHARED_CREDENTIALS_FILE",
    "AWS_CONFIG_FILE",
    "CLOUDSDK_CONFIG",
    "AZURE_CONFIG_DIR",
    "KUBECONFIG",
    "NETRC",
    "PGPASSFILE",
    "PGSERVICEFILE",
    "DOCKER_CONFIG",
    "GH_CONFIG_DIR",
    "GNUPGHOME",
    "NPM_CONFIG_USERCONFIG",
    "NPM_CONFIG_GLOBALCONFIG",
    "SSH_AUTH_SOCK",
    "GIT_SSH_COMMAND",
    "GIT_SSH",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "SSH_AGENT_PID",
    "TF_CLI_CONFIG_FILE",
    "WGETRC",
    "PIP_CONFIG_FILE",
    "UV_CONFIG_FILE",
    "RCLONE_CONFIG",
    "BOTO_CONFIG",
    "BOTO_PATH",
    "S3CMD_CONFIG",
    "SOPS_AGE_KEY_FILE",
    "ANSIBLE_VAULT_PASSWORD_FILE",
    "ANSIBLE_VAULT_IDENTITY_LIST",
    "ANSIBLE_CONFIG",
    "GOAUTH",
    "SBT_CREDENTIALS",
    "COURSIER_CREDENTIALS",
    "CONSUL_HTTP_TOKEN_FILE",
    "SYSTEM_WGETRC",
    "CLOUDSDK_ROOT_DIR",
    "M2_HOME",
    "MAVEN_HOME",
    "LEIN_HOME",
    "SSLKEYLOGFILE",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM",
    "XDG_CONFIG_HOME",
    "XDG_CONFIG_DIRS",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "XDG_RUNTIME_DIR",
    "HELM_REGISTRY_CONFIG",
    "HELM_REPOSITORY_CONFIG",
    "HELM_CONFIG_HOME",
    "REGISTRY_AUTH_FILE",
    "DOCKER_CERT_PATH",
    "SSL_CLIENT_CERT",
    "GIT_SSL_CERT",
    "GIT_SSL_KEY",
    "PIP_CLIENT_CERT",
    "PGSSLKEY",
    "VAULT_CLIENT_KEY",
    "VAULT_CLIENT_CERT",
    "CONSUL_CLIENT_KEY",
    "CONSUL_CLIENT_CERT",
    "NOMAD_CLIENT_KEY",
    "NOMAD_CLIENT_CERT",
    "PGSSLCERT",
    "PGSYSCONFDIR",
    "CURL_HOME",
    "CARGO_HOME",
    "COMPOSER_HOME",
    "GRADLE_USER_HOME",
    "BUNDLE_CONFIG",
    "BUNDLE_USER_CONFIG",
    "BUNDLE_USER_HOME",
    "BUNDLE_APP_CONFIG",
    "POETRY_CONFIG_DIR",
    "COURSIER_CONFIG_DIR",
    "HEX_HOME",
    "HF_HOME",
    "HF_TOKEN_PATH",
    "HF_STORED_TOKENS_PATH",
    "CONDARC",
    "BUN_CONFIG_FILE",
    "GOENV",
    "NPM_CONFIG_PREFIX",
    "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
    "CLAUDE_CONFIG_DIR",
    "ANTHROPIC_CONFIG_DIR",
    "ANTHROPIC_PROFILE",
    "CLAUDE_CODE_FEDERATION_CACHE_DIR",
    "CLAUDE_SECURESTORAGE_CONFIG_DIR",
  ],
  Ln = [
    "PIP_INDEX_URL",
    "PIP_EXTRA_INDEX_URL",
    "PIP_FIND_LINKS",
    "UV_INDEX_URL",
    "UV_EXTRA_INDEX_URL",
    "UV_DEFAULT_INDEX",
    "UV_INDEX",
    "UV_FIND_LINKS",
    "UV_PUBLISH_URL",
    "TWINE_REPOSITORY_URL",
    "FLIT_INDEX_URL",
    "HATCH_INDEX_REPO",
    "NPM_CONFIG_REGISTRY",
    "YARN_REGISTRY",
    "YARN_NPM_REGISTRY_SERVER",
    "YARN_NPM_PUBLISH_REGISTRY",
    "COREPACK_NPM_REGISTRY",
    "BUN_CONFIG_REGISTRY",
    "GOPROXY",
  ],
  oo = new Set(Ln),
  so =
    /^(?:CARGO_REGISTRIES_[A-Z0-9_]+_INDEX|POETRY_REPOSITORIES_[A-Z0-9_]+_URL|NPM_CONFIG_@[^:]+:REGISTRY)$/i;
/**
 * 判断环境变量是否为包索引地址类变量（含 INPUT_ 前缀形式）。
 */
//@ chunk-q8cqcff6.js:29058-29165 placement
function isPackageIndexEnv(e) {
  let replaced = e
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/^INPUT_/, "");
  return oo.has(replaced) || so.test(replaced);
}
//@ chunk-q8cqcff6.js:29165-29247 placement
function Fn(e) {
  return PACKAGE_INDEX_ENV_VARS[
    e
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/^INPUT_/, "")
  ];
}
//@ chunk-q8cqcff6.js:29247-29489 placement
var PACKAGE_INDEX_ENV_VARS = {
    PIP_EXTRA_INDEX_URL: "PIP_INDEX_URL",
    PIP_FIND_LINKS: "PIP_INDEX_URL",
    UV_EXTRA_INDEX_URL: "UV_DEFAULT_INDEX",
    UV_INDEX: "UV_DEFAULT_INDEX",
    UV_FIND_LINKS: "UV_DEFAULT_INDEX",
  },
  HTTP_INDEX_INVALID = "http://index.invalid/",
  Hn = { UV_DEFAULT_INDEX: ["UV_INDEX_URL"] };
//@ chunk-q8cqcff6.js:29489-29557 placement
function vus(e, n) {
  return [n, ...(Hn[n] ?? [])].some((r) => (e[r] ?? "") !== "");
}
//@ chunk-q8cqcff6.js:29557-29591 placement
var ao = /^[a-z][a-z0-9+.-]*:\/\//i;
/**
 * 去掉 URL 中的用户名密码（或令牌型用户名），查询串含凭证时清除查询与片段；无法解析时按正则去掉 userinfo。
 */
//@ chunk-q8cqcff6.js:29591-30034 placement
function stripUrlCredentials(e) {
  let startsWith = e.startsWith("//"),
    r;
  try {
    r = new URL(startsWith ? `https:${e}` : e);
  } catch {
    let replaced = e.replace(/^([a-z][a-z0-9+.-]*:)?\/\/[^/?#]*@/i, "$1//");
    return containsCredential(replaced)
      ? { text: HTTP_INDEX_INVALID, cut: !0 }
      : { text: replaced, cut: !1, stripped: replaced !== e };
  }
  let s = r.password !== "" || (r.username !== "" && /(^|\+)https?:$/i.test(r.protocol)),
    S = s;
  if (s) ((r.username = ""), (r.password = ""));
  let E = !1;
  if (containsCredential(uo(r.search))) ((r.search = ""), (r.hash = ""), (E = !0));
  let href = r.href;
  return { text: startsWith ? href.replace(/^https:/, "") : href, cut: E, stripped: S };
}
//@ chunk-q8cqcff6.js:30034-30098 placement
function uo(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}
/**
 * 清洗包索引类环境变量的值：按分隔符逐段去除 URL 凭证，含凭证无法清理的段替换为无效占位（GOPROXY 改为 off 并截断后续），返回新值与是否截断/去除过。
 */
//@ chunk-q8cqcff6.js:30098-30820 placement
function sanitizeIndexUrlEnv(e, n) {
  if (n.trim() === "") return { value: n, cut: !1, stripped: !1 };
  let matches = /^(?:INPUT_)?GOPROXY$/i.test(e),
    hasFallbackVar = !/^INPUT_/i.test(e) && Fn(e) !== void 0,
    cut = !1,
    stripped = !1,
    stopped = !1,
    separator = matches ? /(\s*[,|]\s*|\s+)/ : hasFallbackVar ? /(\s+)/ : null,
    joined = (separator === null ? [n] : n.split(separator))
      .flatMap((v) => {
        if (stopped) return [];
        let match = /^([A-Za-z0-9_.-]+=)(?=[a-z][a-z0-9+.-]*:\/\/|\/\/)/i.exec(v),
          x = match ? match[1] : "",
          sliced = v.slice(x.length);
        if (!sliced.startsWith("//") && !ao.test(sliced)) {
          if (v.trim() !== "" && containsCredential(v))
            return ((cut = !0), (stripped = !0), [matches ? "off" : HTTP_INDEX_INVALID]);
          return [v];
        }
        let G = stripUrlCredentials(sliced);
        if (
          ((stripped ||= G.cut || G.stripped === !0), G.cut || (G.stripped && (matches || hasFallbackVar)))
        ) {
          if (((cut = !0), matches)) return ((stopped = !0), ["off"]);
        }
        return [x + G.text];
      })
      .join("");
  if (matches) joined = joined.replace(/[,|\s]+$/, "");
  if (joined !== "" && containsCredential(joined))
    return { value: matches ? "off" : HTTP_INDEX_INVALID, cut: !0, stripped: !0 };
  return { value: joined === "" ? HTTP_INDEX_INVALID : joined, cut: cut, stripped: stripped };
}
//@ chunk-q8cqcff6.js:30820-30859 placement
function LRi(e) {
  return sanitizeIndexEnvs(e).respelled;
}
/**
 * 清洗整个环境中的凭证：包索引地址去凭证，JVM 选项删除含凭证的参数，返回改写值与丢失凭证的变量名。
 */
//@ chunk-q8cqcff6.js:30859-31065 placement
function sanitizeEnvCredentials(e) {
  let n = sanitizeIndexEnvs(e);
  for (let [r, s] of Object.entries(e)) {
    if (s === void 0) continue;
    let S = typeof s === "string" ? s : String(s),
      E = redactJvmOptionsEnvValue(r, S);
    if (E !== void 0 && E !== S) ((n.respelled[r] = E), n.lostCredential.push(r));
  }
  return n;
}
/**
 * 对所有包索引类环境变量做凭证清洗，记录改写后的值与丢失凭证的变量；被截断时补一个只含源地址的回退变量（若原本未设置）。
 */
//@ chunk-q8cqcff6.js:31065-31406 placement
function sanitizeIndexEnvs(e) {
  let n = {},
    r = [];
  for (let [s, S] of Object.entries(e)) {
    if (S === void 0 || !isPackageIndexEnv(s)) continue;
    let E = typeof S === "string" ? S : String(S),
      h = sanitizeIndexUrlEnv(s, E);
    if (h.value !== E) {
      if (((n[s] = h.value), h.cut || h.stripped)) r.push(s);
    }
    if (h.cut) {
      let y = indexFallbackEnv(s, h.value);
      if (y !== void 0 && !vus(e, y.name) && n[y.name] === void 0) n[y.name] = y.value;
    }
  }
  return { respelled: n, lostCredential: r };
}
/**
 * 为被截断的包索引变量构造回退变量：取值中第一个 URL 的源地址，失败时用无效占位。
 */
//@ chunk-q8cqcff6.js:31406-31780 placement
function indexFallbackEnv(e, n) {
  let r = /^INPUT_/i.test(e) ? void 0 : Fn(e);
  if (r === void 0) return;
  let found = n
      .split(/\s+|,|\|/)
      .map((E) => E.replace(/^[A-Za-z0-9_.-]+=(?=[a-z][a-z0-9+.-]*:\/\/|\/\/)/i, ""))
      .find((E) => E.startsWith("//") || /^https?:\/\//i.test(E)),
    S = HTTP_INDEX_INVALID;
  if (found !== void 0)
    try {
      let origin = new URL(found.startsWith("//") ? `https:${found}` : found).origin;
      S = origin === "null" ? HTTP_INDEX_INVALID : `${origin}/`;
    } catch {
      S = HTTP_INDEX_INVALID;
    }
  return { name: r, value: S };
}
/**
 * 列出开启子进程环境清理时要删除的变量名（含 INPUT_ 与 npm 小写形式）。
 */
//@ chunk-q8cqcff6.js:31780-31900 placement
function scrubbedEnvNames() {
  return (
    initEnvScrubFlag(),
    Ne ? io.flatMap((e) => [e, `INPUT_${e}`, ...(e.startsWith("NPM_CONFIG_") ? [e.toLowerCase()] : [])]) : []
  );
}
/**
 * 初始化子进程环境清理开关（显式开启，或在 GitHub Actions 中且未显式关闭）。
 */
//@ chunk-q8cqcff6.js:31900-32017 placement
function initEnvScrubFlag() {
  let envClaudeCodeSubprocessEnvScrub = process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB;
  Ne ??=
    isEnvTruthy(envClaudeCodeSubprocessEnvScrub) ||
    (isEnvTruthy(process.env.GITHUB_ACTIONS) && !go(envClaudeCodeSubprocessEnvScrub));
}
//@ chunk-q8cqcff6.js:32017-32024 placement
var Ne;
//@ chunk-q8cqcff6.js:32024-32049 placement
function HRi() {
  Ne = void 0;
}
//@ chunk-q8cqcff6.js:32049-32130 placement
function go(e) {
  return e !== void 0 && /^(?:0|false|no|off)$/i.test(String(e).trim());
}
//@ chunk-q8cqcff6.js:32130-32248 placement = isEnvTruthy (1)
function isEnvTruthy(envVar) {
  let n = envVar === void 0 ? void 0 : String(envVar).trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}
//@ chunk-q8cqcff6.js:32248-32750 placement
var flattened = CREDENTIAL_SCRUB_ENV_VARS.flatMap((e) => [e, `INPUT_${e}`]),
  Tus = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_CUSTOM_HEADERS",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
    "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
    "CLAUDE_CODE_ARTIFACTS_API_TOKEN",
    "CLAUDE_CODE_MEMORY_API_TOKEN",
    "CLAUDE_CODE_SLACK_TAG_TOKEN",
    "ANTHROPIC_FOUNDRY_API_KEY",
    "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
    "ANTHROPIC_AWS_API_KEY",
    "ANTHROPIC_IDENTITY_TOKEN",
    "ANTHROPIC_IDENTITY_TOKEN_FILE",
    "ALL_INPUTS",
  ],
  flattened_2 = Tus.flatMap((e) => [e, `INPUT_${e}`]);
//@ chunk-q8cqcff6.js:32750-32807 placement
function Ile(e) {
  return e.toUpperCase().replace(/-/g, "_");
}
//@ chunk-q8cqcff6.js:85680-85706 placement
var Is = 500,
  Ns = 250,
  Cs = 4000;
//@ chunk-q8cqcff6.js:85706-85926 placement
function isRetryableHelperFailure(e) {
  switch (e) {
    case "exit_nonzero":
    case "timed_out":
    case "not_a_file":
    case "interpreter_unavailable":
      return !0;
    case "bad_path":
    case "oversize":
    case "parse_failed":
    case "envelope_invalid":
    case "schema_rejected":
      return !1;
  }
}
//@ chunk-q8cqcff6.js:85926-85938 placement
var ir = 2048;
//@ chunk-q8cqcff6.js:85938-86101 placement
function truncateHelperOutput(e) {
  let n = stripControlChars(e);
  if (n.length <= ir) return n;
  let r = truncateToLength(n, ir);
  return `${r}\u2026 (+${n.length - r.length} chars not shown; the full output is in the debug log)`;
}
//@ chunk-q8cqcff6.js:86101-86596 placement
async function runPolicyHelperWithRetry(e, n, r, s) {
  let S = n ? e.retries : void 0,
    E = S !== void 0 && Number.isInteger(S) && S > 0 ? Math.min(S, MAX_HELPER_RETRIES) : 0;
  for (let h = 1; ; h++) {
    let y = await runPolicyHelperOnce(e, n, r);
    if (!("error" in y)) return { ...y, attempts: h };
    let P = truncateHelperOutput(y.error),
      O = { error: h > 1 ? `after ${h} attempts: ${P}` : P, code: y.code, attempts: h };
    if (h > E || !isRetryableHelperFailure(y.code) || !s()) return O;
    let T = fullJitterBackoffMs({ baseMs: Is, floorMs: Ns, capMs: Cs, attempt: h - 1 });
    if (
      (logForDebugging(`policyHelper attempt ${h} of ${E + 1} failed [${y.code}]; retrying in ${T}ms: ${P}`, {
        level: "warn",
      }),
      await sleep(T),
      !s())
    )
      return O;
  }
}
/**
 * 执行一次 policyHelper（校验路径、取输出、解析信封）
 */
//@ chunk-q8cqcff6.js:86596-89059 placement
async function runPolicyHelperOnce(e, n, r) {
  let s = xr(),
    S = validateHelperConfig(e, s, n, r);
  if (S) return { error: S, code: "bad_path" };
  let E = helperLaunchPlan(e);
  if ("error" in E) return E;
  let { plan: plan } = E,
    min = Math.min(e.timeoutMs ?? HELPER_TIMEOUT_MS, MAX_HELPER_MS),
    startTime = performance.now(),
    O = await checkHelperFile(plan, min, R.pendingStats);
  if (O) return { error: O, code: "not_a_file" };
  let ceil = Math.ceil(min - (performance.now() - startTime));
  if (ceil <= 0) return { error: Pt(plan.file, min), code: "not_a_file" };
  let v;
  if (!r || plan.input !== void 0) v = An(plan);
  else if (e.path === void 0) return { error: "remote-armed helper has no path", code: "bad_path" };
  else v = (s === "win32" ? win32 : posix).dirname(e.path);
  let M = AQ(() => {
      let env = process.env;
      return interpreterEnv(r ? helperProcessEnv(Mr?.() ?? env, s) : env, plan);
    }),
    {
      stdout: stdout,
      stderr: stderr,
      code: code,
      error: error,
      maxBufferExceeded: maxBufferExceeded,
      timedOut: timedOut,
    } = await execFileNoThrowWithCwd(plan.file, plan.args, {
      timeout: ceil,
      cwd: v,
      useToolMemoryCgroup: !1,
      maxBuffer: MAX_HELPER_OUTPUT_BYTES + 1,
      env: {
        ...M,
        CLAUDE_CODE_VERSION: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      },
      extendEnv: !1,
      stdin: plan.input === void 0 ? "ignore" : "pipe",
      input: plan.input,
    });
  if (stderr) logForDebugging(`policyHelper stderr: ${stderr}`, { level: "debug" });
  if (maxBufferExceeded)
    return {
      error: `${stderr.length > stdout.length ? "stderr" : "stdout"} exceeded ${MAX_HELPER_OUTPUT_BYTES} bytes`,
      code: "oversize",
    };
  if (timedOut) return { error: `timed out after ${min}ms`, code: "timed_out" };
  let j = (ee) => {
    if (stdout) logForDebugging(`policyHelper stdout: ${stdout}`, { level: "debug" });
    return ee;
  };
  if (code !== 0)
    return j({ error: `exited with code ${code}: ${stderr || stdout || error || ""}`, code: "exit_nonzero" });
  if (Buffer.byteLength(stdout, "utf8") > MAX_HELPER_OUTPUT_BYTES)
    return { error: `stdout exceeded ${MAX_HELPER_OUTPUT_BYTES} bytes`, code: "oversize" };
  let Z = safeParseJSON(stdout, !1);
  if (Z === null || typeof Z !== "object")
    return j({ error: "stdout is not a JSON object", code: "parse_failed" });
  let safeParse = HELPER_OUTPUT_SCHEMA().safeParse(Z);
  if (!safeParse.success)
    return j({ error: `invalid envelope: ${safeParse.error.message}`, code: "envelope_invalid" });
  let ie = {},
    re = [];
  if (safeParse.data.managedSettings !== void 0) {
    let ee = validatePayloadAndLog(safeParse.data.managedSettings, "policyHelper");
    if ("error" in ee) return j({ error: ee.error, code: "schema_rejected" });
    if (((re = ee.warnings), r)) ((re = serializeSettingsErrors(re)), delete ee.settings.claudeMd);
    ie.managedSettings = ee.settings;
  }
  if (safeParse.data.claudeMd !== void 0) ie.claudeMd = safeParse.data.claudeMd;
  if (safeParse.data.appendSystemPrompt !== void 0) ie.appendSystemPrompt = safeParse.data.appendSystemPrompt;
  return { output: ie, warnings: re };
}
//@ chunk-q8cqcff6.js:89059-89112 placement
function xr() {
  return getPlatform() === "windows" ? "win32" : "posix";
}
//@ chunk-q8cqcff6.js:89112-89347 placement
function validateHelperConfig(e, n, r, s) {
  if (e.script == null && e.interpreter == null) return validatePolicyHelperPath(e.path, n, r, s);
  if (!r) return "inline scripts are not supported on the singular policyHelper key";
  if (e.path != null) return PATH_OR_SCRIPT_MESSAGE;
  return validateInlineHelper(e, n === "win32" ? "windows" : "linux");
}
//@ chunk-q8cqcff6.js:89347-90356 placement
function validatePolicyHelperPath(e, n, r, s) {
  let S = n === "win32" ? win32 : posix;
  if (typeof e !== "string") return "path must be a string";
  if (!S.isAbsolute(e)) return `path must be absolute: ${e}`;
  if (n === "win32") {
    if (r && !Hps.test(e)) return `path must end in .exe or .ps1 on Windows: ${e}`;
    if (!r && !e.toLowerCase().endsWith(".exe")) return `path must end in .exe on Windows: ${e}`;
    if ($ps(e)) return `${PS1_WILDCARD_MESSAGE}: ${e}`;
  }
  if (s && (n === "win32" ? Mps(e) : fOn(e) || Dps(e)))
    return `path must not be a UNC, network-automount (/net, /Network/Servers, or macOS /.vol /.file /.nofollow /.resolve) or kernel magic-link (/proc, /dev/fd) path when delivered via remote managed settings: ${e}`;
  if (!isNormalizedHelperPath(e, n, { rejectDriveRelative: n === "win32" }))
    return n === "win32"
      ? `path must be a drive-qualified (C:\\...) or UNC path in normalized form (no "." or ".." segments, no doubled or trailing separators, no ":" or trailing "."/space in a component, no device-namespace prefix): ${e}`
      : `path must be in normalized form (no "." or ".." segments, no doubled or trailing separators): ${e}`;
  return null;
}

export {
  flattened,
  sanitizeIndexUrlEnv,
  HTTP_INDEX_INVALID,
  sanitizeEnvCredentials,
  Tus,
  Ile,
  HRi,
  initEnvScrubFlag,
  flattened_2,
  scrubbedEnvNames,
  isPackageIndexEnv,
  indexFallbackEnv,
  vus,
  Ne,
  Ln,
  PACKAGE_INDEX_ENV_VARS,
  Hn,
  runPolicyHelperWithRetry,
  xr,
  validateHelperConfig,
  LRi,
};
