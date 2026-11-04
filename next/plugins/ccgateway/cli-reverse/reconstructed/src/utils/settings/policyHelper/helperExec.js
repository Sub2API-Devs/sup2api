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
import { win32, posix } from "path";
import { uniq } from "../../collections.js";
import {
  PROGRAM_FILES_DIR,
  WINDOWS_POWERSHELL_DIR,
  SYSTEM32_DIR,
  WINDOWS_ROOT_DIR,
  CMD_EXE_PATH,
  POWERSHELL_NONINTERACTIVE_ARGS,
} from "../../shell/powershellDetection.js";
import { getPlatform } from "../../platform.js";
import {
  isPowerShellScript,
  MAX_HELPER_RETRIES,
  MAX_HELPER_MS,
  PATH_OR_SCRIPT_MESSAGE,
  validateInlineHelper,
  POLICY_HELPER_EXECUTABLE_RE,
  hasPowerShellGlobChars,
  PS1_WILDCARD_MESSAGE,
  looksLikeUncPath,
  isNetworkOrMacSpecialPath,
  isKernelPseudoPath,
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
import {
  HELPER_TIMEOUT_MS,
  policyHelperRunner,
  MAX_HELPER_OUTPUT_BYTES,
  HELPER_OUTPUT_SCHEMA,
} from "./policyHelper.js";
import { withHostEnvRestored } from "../hostEnvWrites.js";
import { helperOutputOverride } from "./helperRemote.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { safeParseJSON } from "../../json.js";
import { validatePayloadAndLog } from "./helperPayload.js";
import { serializeSettingsErrors } from "../../fileStateCache.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:21656-22068 placement
/**
 * POWERSHELL_NOT_FOUND_MESSAGE：找不到 PowerShell 的说明；PS_MODULE_PATH_ENV：PowerShell 模块路径环境变量（同一声明共 2 个绑定）。
 */
var POWERSHELL_HELPER_PATHS =
  "PowerShell not found at any of its stock install locations on C: (fixed absolute candidates only; PATH is never consulted)";
var CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH = "CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH";
var CLAUDE_CODE_POLICY_HELPER_PS1_PATH = "CLAUDE_CODE_POLICY_HELPER_PS1_PATH";
var POWERSHELL_NOT_FOUND_MESSAGE = `$env:PSModulePath = $env:${CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH}; `;
var PS_MODULE_PATH_ENV =
  "if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {} }; ";
//@ chunk-q8cqcff6.js:22068-22186 placement
function wrapPowerShellCommand(script) {
  return `${POWERSHELL_NOT_FOUND_MESSAGE}${PS_MODULE_PATH_ENV}$LASTEXITCODE = 0; try { ${script} } catch { Write-Error $_; exit 1 }; exit $LASTEXITCODE`;
}
//@ chunk-q8cqcff6.js:22186-22268 placement
var POLICY_HELPER_PS1_INVOKE; // deferred: uses wrapPowerShellCommand of its import cycle while loading; runs once the cycle is complete
var UTF8_OUTPUT_ENCODING_SETUP;
deferInit("chunk-q8cqcff6.js:22186", () => {
  POLICY_HELPER_PS1_INVOKE = wrapPowerShellCommand(`& ($env:${CLAUDE_CODE_POLICY_HELPER_PS1_PATH})`);
  UTF8_OUTPUT_ENCODING_SETUP = wrapPowerShellCommand("Invoke-Expression (@($input) -join [char]10)");
});
//@ chunk-q8cqcff6.js:22268-22403 placement
function psModulePath(dir) {
  return uniq([
    `${dir}\\Modules`,
    `${PROGRAM_FILES_DIR}\\PowerShell\\Modules`,
    `${PROGRAM_FILES_DIR}\\WindowsPowerShell\\Modules`,
    `${WINDOWS_POWERSHELL_DIR}\\Modules`,
  ]).join(";");
}
//@ chunk-q8cqcff6.js:22403-22465 placement
function helperTrustedPathsJoin(dir) {
  return uniq([dir, SYSTEM32_DIR, WINDOWS_ROOT_DIR, `${SYSTEM32_DIR}\\Wbem`, WINDOWS_POWERSHELL_DIR]).join(
    ";",
  );
}
//@ chunk-q8cqcff6.js:22465-23093 placement
/**
 * policyHelper 解释器环境清理用的常量：安全 PATHEXT、.NET 注入前缀、pwsh 与 sh 要删除的变量和前缀、安全 POSIX PATH。
 */
var SAFE_PATHEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DOTNET_ENV_PREFIXES;
var PWSH_STRIPPED_ENV;
var SH_STRIPPED_ENV_PREFIXES;
var SH_STRIPPED_ENV;
var SAFE_POSIX_PATH;
deferInit("chunk-q8cqcff6.js:22465", () => {
  SAFE_PATHEXT = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC";
  DOTNET_ENV_PREFIXES = ["DOTNET_", "COMPLUS_", "COR_", "CORECLR_", "APPDOMAIN_MANAGER_"];
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
  ]);
  SH_STRIPPED_ENV_PREFIXES = ["LD_", "DYLD_", "BASH_FUNC_", "__BASH_FUNC<", "LC_"];
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
  ]);
  SAFE_POSIX_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
});
//@ chunk-q8cqcff6.js:23093-23209 placement
function deleteEnvMatching(env, stripped, prefixes, normalize) {
  for (let key of Object.keys(env)) {
    let name = normalize(key);
    if (stripped.has(name) || prefixes.some((prefix) => name.startsWith(prefix))) delete env[key];
  }
}
//@ chunk-q8cqcff6.js:23209-23562 placement
/**
 * 按路由的解释器调整 policyHelper 环境：sh 删除危险变量并固定 PATH 与 LC_ALL；pwsh 删除 .NET 注入变量，设置模块路径、PATH、PATHEXT、COMSPEC、TERM 与 ps1 路径。
 */
function interpreterEnv(env, plan) {
  let out = {
    ...env,
  };
  switch (plan.routedInterpreter) {
    case undefined:
      return out;
    case "sh":
      deleteEnvMatching(out, SH_STRIPPED_ENV, SH_STRIPPED_ENV_PREFIXES, (value) => value);
      out.PATH = SAFE_POSIX_PATH;
      out.LC_ALL = "C";
      return out;
    case "pwsh": {
      deleteEnvMatching(out, PWSH_STRIPPED_ENV, DOTNET_ENV_PREFIXES, (key) => key.toUpperCase());
      let dir = win32.dirname(plan.file);
      out.PSModulePath = psModulePath(dir);
      out[CLAUDE_CODE_POLICY_HELPER_PSMODULEPATH] = out.PSModulePath;
      out.PATH = helperTrustedPathsJoin(dir);
      out.PATHEXT = SAFE_PATHEXT;
      out.COMSPEC = CMD_EXE_PATH;
      out.TERM = "dumb";
      if (plan.ps1Path !== undefined) out[CLAUDE_CODE_POLICY_HELPER_PS1_PATH] = plan.ps1Path;
      return out;
    }
  }
}
//@ chunk-q8cqcff6.js:23562-23623 placement
function helperCwdFor(plan) {
  return getPlatform() === "windows" ? win32.dirname(plan.file) : "/";
}
//@ chunk-q8cqcff6.js:23623-24010 placement
/**
 * 生成 policyHelper 的启动计划：内联脚本用 /bin/sh -s 或 PowerShell 执行；路径型在 Windows 上的 .ps1 经 PowerShell 运行，否则直接执行该文件；无路径无脚本报 bad_path。
 */
function helperLaunchPlan(config) {
  if (config.script != null) {
    if (config.interpreter === "sh")
      return {
        plan: {
          file: "/bin/sh",
          args: ["-s"],
          input: config.script,
          routedInterpreter: "sh",
        },
      };
    return pwshPlan({
      args: [...POWERSHELL_NONINTERACTIVE_ARGS, "-Command", UTF8_OUTPUT_ENCODING_SETUP],
      input: config.script,
    });
  }
  let { path } = config;
  if (path == null)
    return {
      error: "no path or script configured",
      code: "bad_path",
    };
  if (getPlatform() !== "windows" || !isPowerShellScript(path))
    return {
      plan: {
        file: path,
        args: [],
      },
    };
  return pwshPlan({
    args: [...POWERSHELL_NONINTERACTIVE_ARGS, "-Command", POLICY_HELPER_PS1_INVOKE],
    ps1Path: path,
  });
}
//@ chunk-q8cqcff6.js:24010-24148 placement
function pwshPlan(extra) {
  let planSlug = getPlanSlug_2();
  if (planSlug === null)
    return {
      error: POWERSHELL_HELPER_PATHS,
      code: "interpreter_unavailable",
    };
  return {
    plan: {
      file: planSlug,
      routedInterpreter: "pwsh",
      ...extra,
    },
  };
}
//@ chunk-q8cqcff6.js:24148-24423 placement
async function checkHelperFile(plan, timeoutMs, cache) {
  if (plan.routedInterpreter !== undefined) return null;
  let stats;
  try {
    stats = await withDeadline(statCached(plan.file, cache), timeoutMs);
  } catch (error) {
    return `cannot stat path (${getErrnoCode(error) ?? "unknown error"}): ${plan.file}`;
  }
  if (stats === undefined) return statTimeoutMessage(plan.file, timeoutMs);
  return stats.isFile() ? null : `path is not a regular file: ${plan.file}`;
}
//@ chunk-q8cqcff6.js:24423-24539 placement
function statCached(file, cache) {
  let promise = cache.get(file);
  if (promise === undefined) {
    promise = getFsImplementation().stat(file);
    cache.set(file, promise);
    let evict = () => cache.delete(file);
    promise.then(evict, evict);
  }
  return promise;
}
//@ chunk-q8cqcff6.js:24539-24613 placement
function statTimeoutMessage(file, timeoutMs) {
  return `cannot stat path (timed out after ${timeoutMs} ms): ${file}`;
}
//@ chunk-q8cqcff6.js:24613-29058 placement
/**
 * policyHelper 子进程需清除的凭据类环境变量表
 */
var CREDENTIAL_SCRUB_ENV_VARS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CREDENTIAL_SCRUB_ENV_VARS;
var CREDENTIAL_SCRUB_ENV_VARS_LOWER;
var CREDENTIAL_SCRUB_ENV_NAMES;
var CREDENTIAL_SCRUB_EXTRA_ENV_VARS;
deferInit("chunk-q8cqcff6.js:24613", () => {
  CREDENTIAL_SCRUB_ENV_VARS_2 = [
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
  ];
  CREDENTIAL_SCRUB_ENV_VARS = [
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
  ];
  CREDENTIAL_SCRUB_ENV_VARS_LOWER = [
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
  ];
  CREDENTIAL_SCRUB_ENV_NAMES = new Set(CREDENTIAL_SCRUB_ENV_VARS_LOWER);
  CREDENTIAL_SCRUB_EXTRA_ENV_VARS =
    /^(?:CARGO_REGISTRIES_[A-Z0-9_]+_INDEX|POETRY_REPOSITORIES_[A-Z0-9_]+_URL|NPM_CONFIG_@[^:]+:REGISTRY)$/i;
});
//@ chunk-q8cqcff6.js:29058-29165 placement
/**
 * 判断环境变量是否为包索引地址类变量（含 INPUT_ 前缀形式）。
 */
function isPackageIndexEnv(name) {
  let replaced = name
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/^INPUT_/, "");
  return CREDENTIAL_SCRUB_ENV_NAMES.has(replaced) || CREDENTIAL_SCRUB_EXTRA_ENV_VARS.test(replaced);
}
//@ chunk-q8cqcff6.js:29165-29247 placement
function packageIndexEnvAlias(name) {
  return PACKAGE_INDEX_ENV_VARS_2[
    name
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/^INPUT_/, "")
  ];
}
//@ chunk-q8cqcff6.js:29247-29489 placement
/**
 * PACKAGE_INDEX_ENV_VARS：包索引环境变量的别名表。
 */
var PACKAGE_INDEX_ENV_VARS_2 = {
  PIP_EXTRA_INDEX_URL: "PIP_INDEX_URL",
  PIP_FIND_LINKS: "PIP_INDEX_URL",
  UV_EXTRA_INDEX_URL: "UV_DEFAULT_INDEX",
  UV_INDEX: "UV_DEFAULT_INDEX",
  UV_FIND_LINKS: "UV_DEFAULT_INDEX",
};
var HTTP_INDEX_INVALID = "http://index.invalid/";
var PACKAGE_INDEX_ENV_VARS = {
  UV_DEFAULT_INDEX: ["UV_INDEX_URL"],
};
//@ chunk-q8cqcff6.js:29489-29557 placement
/**
 * hasAnyIndexEnv：是否设置了任一索引环境变量。
 */
function hasAnyIndexEnv(env, name) {
  return [name, ...(PACKAGE_INDEX_ENV_VARS[name] ?? [])].some((name) => (env[name] ?? "") !== "");
}
//@ chunk-q8cqcff6.js:29557-29591 placement
var URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
//@ chunk-q8cqcff6.js:29591-30034 placement
/**
 * 去掉 URL 中的用户名密码（或令牌型用户名），查询串含凭证时清除查询与片段；无法解析时按正则去掉 userinfo。
 */
function stripUrlCredentials(text) {
  let protocolRelative = text.startsWith("//");
  let url;
  try {
    url = new URL(protocolRelative ? `https:${text}` : text);
  } catch {
    let replaced = text.replace(/^([a-z][a-z0-9+.-]*:)?\/\/[^/?#]*@/i, "$1//");
    return containsCredential(replaced)
      ? {
          text: HTTP_INDEX_INVALID,
          cut: true,
        }
      : {
          text: replaced,
          cut: false,
          stripped: replaced !== text,
        };
  }
  let hadCredentials = url.password !== "" || (url.username !== "" && /(^|\+)https?:$/i.test(url.protocol));
  let stripped = hadCredentials;
  if (hadCredentials) {
    url.username = "";
    url.password = "";
  }
  let cut = false;
  if (containsCredential(decodeUriComponentSafe(url.search))) {
    url.search = "";
    url.hash = "";
    cut = true;
  }
  let href = url.href;
  return {
    text: protocolRelative ? href.replace(/^https:/, "") : href,
    cut,
    stripped,
  };
}
//@ chunk-q8cqcff6.js:30034-30098 placement
function decodeUriComponentSafe(search) {
  try {
    return decodeURIComponent(search);
  } catch {
    return search;
  }
}
//@ chunk-q8cqcff6.js:30098-30820 placement
/**
 * 清洗包索引类环境变量的值：按分隔符逐段去除 URL 凭证，含凭证无法清理的段替换为无效占位（GOPROXY 改为 off 并截断后续），返回新值与是否截断/去除过。
 */
function sanitizeIndexUrlEnv(name, value) {
  if (value.trim() === "")
    return {
      value,
      cut: false,
      stripped: false,
    };
  let matches = /^(?:INPUT_)?GOPROXY$/i.test(name);
  let hasFallbackVar = !/^INPUT_/i.test(name) && packageIndexEnvAlias(name) !== undefined;
  let cut = false;
  let stripped = false;
  let stopped = false;
  let separator = matches ? /(\s*[,|]\s*|\s+)/ : hasFallbackVar ? /(\s+)/ : null;
  let joined = (separator === null ? [value] : value.split(separator))
    .flatMap((segment) => {
      if (stopped) return [];
      let match = /^([A-Za-z0-9_.-]+=)(?=[a-z][a-z0-9+.-]*:\/\/|\/\/)/i.exec(segment);
      let prefix = match ? match[1] : "";
      let text = segment.slice(prefix.length);
      if (!text.startsWith("//") && !URL_SCHEME_RE.test(text)) {
        if (segment.trim() !== "" && containsCredential(segment)) {
          cut = true;
          stripped = true;
          return [matches ? "off" : HTTP_INDEX_INVALID];
        }
        return [segment];
      }
      let urlStripped = stripUrlCredentials(text);
      stripped ||= urlStripped.cut || urlStripped.stripped === true;
      if (urlStripped.cut || (urlStripped.stripped && (matches || hasFallbackVar))) {
        cut = true;
        if (matches) {
          stopped = true;
          return ["off"];
        }
      }
      return [prefix + urlStripped.text];
    })
    .join("");
  if (matches) joined = joined.replace(/[,|\s]+$/, "");
  if (joined !== "" && containsCredential(joined))
    return {
      value: matches ? "off" : HTTP_INDEX_INVALID,
      cut: true,
      stripped: true,
    };
  return {
    value: joined === "" ? HTTP_INDEX_INVALID : joined,
    cut,
    stripped,
  };
}
//@ chunk-q8cqcff6.js:30820-30859 placement
/**
 * sanitizedIndexEnvs：清洗后的索引环境变量。
 */
function sanitizedIndexEnvs(env) {
  return sanitizeIndexEnvs(env).respelled;
}
//@ chunk-q8cqcff6.js:30859-31065 placement
/**
 * 清洗整个环境中的凭证：包索引地址去凭证，JVM 选项删除含凭证的参数，返回改写值与丢失凭证的变量名。
 */
function sanitizeEnvCredentials(env) {
  let result = sanitizeIndexEnvs(env);
  for (let [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    let rawValue = typeof value === "string" ? value : String(value);
    let redacted = redactJvmOptionsEnvValue(key, rawValue);
    if (redacted !== undefined && redacted !== rawValue) {
      result.respelled[key] = redacted;
      result.lostCredential.push(key);
    }
  }
  return result;
}
//@ chunk-q8cqcff6.js:31065-31406 placement
/**
 * 对所有包索引类环境变量做凭证清洗，记录改写后的值与丢失凭证的变量；被截断时补一个只含源地址的回退变量（若原本未设置）。
 */
function sanitizeIndexEnvs(env) {
  let sanitizedEnv = {};
  let lost = [];
  for (let [key, value] of Object.entries(env)) {
    if (value === undefined || !isPackageIndexEnv(key)) continue;
    let rawValue = typeof value === "string" ? value : String(value);
    let sanitized = sanitizeIndexUrlEnv(key, rawValue);
    if (sanitized.value !== rawValue) {
      sanitizedEnv[key] = sanitized.value;
      if (sanitized.cut || sanitized.stripped) lost.push(key);
    }
    if (sanitized.cut) {
      let fallback = indexFallbackEnv(key, sanitized.value);
      if (
        fallback !== undefined &&
        !hasAnyIndexEnv(env, fallback.name) &&
        sanitizedEnv[fallback.name] === undefined
      )
        sanitizedEnv[fallback.name] = fallback.value;
    }
  }
  return {
    respelled: sanitizedEnv,
    lostCredential: lost,
  };
}
//@ chunk-q8cqcff6.js:31406-31780 placement
/**
 * 为被截断的包索引变量构造回退变量：取值中第一个 URL 的源地址，失败时用无效占位。
 */
function indexFallbackEnv(name, value) {
  let aliasName = /^INPUT_/i.test(name) ? undefined : packageIndexEnvAlias(name);
  if (aliasName === undefined) return;
  let found = value
    .split(/\s+|,|\|/)
    .map((segment) => segment.replace(/^[A-Za-z0-9_.-]+=(?=[a-z][a-z0-9+.-]*:\/\/|\/\/)/i, ""))
    .find((segment) => segment.startsWith("//") || /^https?:\/\//i.test(segment));
  let origin = HTTP_INDEX_INVALID;
  if (found !== undefined)
    try {
      let origin_2 = new URL(found.startsWith("//") ? `https:${found}` : found).origin;
      origin = origin_2 === "null" ? HTTP_INDEX_INVALID : `${origin_2}/`;
    } catch {
      origin = HTTP_INDEX_INVALID;
    }
  return {
    name: aliasName,
    value: origin,
  };
}
//@ chunk-q8cqcff6.js:31780-31900 placement
/**
 * 列出开启子进程环境清理时要删除的变量名（含 INPUT_ 与 npm 小写形式）。
 */
function scrubbedEnvNames() {
  initEnvScrubFlag();
  return sanitizedEnvCache
    ? CREDENTIAL_SCRUB_ENV_VARS.flatMap((name) => [
        name,
        `INPUT_${name}`,
        ...(name.startsWith("NPM_CONFIG_") ? [name.toLowerCase()] : []),
      ])
    : [];
}
//@ chunk-q8cqcff6.js:31900-32017 placement
/**
 * 初始化子进程环境清理开关（显式开启，或在 GitHub Actions 中且未显式关闭）。
 */
function initEnvScrubFlag() {
  let envClaudeCodeSubprocessEnvScrub = process.env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB;
  sanitizedEnvCache ??=
    isEnvTruthy(envClaudeCodeSubprocessEnvScrub) ||
    (isEnvTruthy(process.env.GITHUB_ACTIONS) && !isFalsyEnvValue(envClaudeCodeSubprocessEnvScrub));
}
//@ chunk-q8cqcff6.js:32017-32024 placement
/**
 * sanitizedEnvCache：清洗后环境的缓存。
 */
var sanitizedEnvCache;
//@ chunk-q8cqcff6.js:32024-32049 placement
/**
 * clearSanitizedEnvCache：清空清洗环境缓存。
 */
function clearSanitizedEnvCache() {
  sanitizedEnvCache = undefined;
}
//@ chunk-q8cqcff6.js:32049-32130 placement
function isFalsyEnvValue(value) {
  return value !== undefined && /^(?:0|false|no|off)$/i.test(String(value).trim());
}
//@ chunk-q8cqcff6.js:32130-32248 placement = isEnvTruthy (1)
function isEnvTruthy(envVar) {
  let value = envVar === undefined ? undefined : String(envVar).trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
//@ chunk-q8cqcff6.js:32248-32750 placement
/**
 * CREDENTIAL_SCRUB_VARS_WITH_INPUT：凭证变量及其 INPUT_ 前缀形式。
 */
var flattened; // deferred: uses CREDENTIAL_SCRUB_ENV_VARS_2 of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_SCRUB_VARS_WITH_INPUT;
var flattened_2;
deferInit("chunk-q8cqcff6.js:32248", () => {
  flattened = CREDENTIAL_SCRUB_ENV_VARS_2.flatMap((name) => [name, `INPUT_${name}`]);
  CREDENTIAL_SCRUB_VARS_WITH_INPUT = [
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
  ];
  flattened_2 = CREDENTIAL_SCRUB_VARS_WITH_INPUT.flatMap((name) => [name, `INPUT_${name}`]);
});
//@ chunk-q8cqcff6.js:32750-32807 placement
/**
 * envVarToUpperSnake：变量名转大写下划线。
 */
function envVarToUpperSnake(name) {
  return name.toUpperCase().replace(/-/g, "_");
}
//@ chunk-q8cqcff6.js:85680-85706 placement
var HELPER_BACKOFF_BASE_MS = 500;
var HELPER_BACKOFF_FLOOR_MS = 250;
var HELPER_BACKOFF_CAP_MS = 4000;
//@ chunk-q8cqcff6.js:85706-85926 placement
function isRetryableHelperFailure(code) {
  switch (code) {
    case "exit_nonzero":
    case "timed_out":
    case "not_a_file":
    case "interpreter_unavailable":
      return true;
    case "bad_path":
    case "oversize":
    case "parse_failed":
    case "envelope_invalid":
    case "schema_rejected":
      return false;
  }
}
//@ chunk-q8cqcff6.js:85926-85938 placement
var MAX_HELPER_OUTPUT_CHARS = 2048;
//@ chunk-q8cqcff6.js:85938-86101 placement
function truncateHelperOutput(error) {
  let text = stripControlChars(error);
  if (text.length <= MAX_HELPER_OUTPUT_CHARS) return text;
  let truncated = truncateToLength(text, MAX_HELPER_OUTPUT_CHARS);
  return `${truncated}\u2026 (+${text.length - truncated.length} chars not shown; the full output is in the debug log)`;
}
//@ chunk-q8cqcff6.js:86101-86596 placement
async function runPolicyHelperWithRetry(config, refresh, armed, alive) {
  let retries = refresh ? config.retries : undefined;
  let maxRetries =
    retries !== undefined && Number.isInteger(retries) && retries > 0
      ? Math.min(retries, MAX_HELPER_RETRIES)
      : 0;
  for (let j = 1; ; j++) {
    let result = await runPolicyHelperOnce(config, refresh, armed);
    if (!("error" in result))
      return {
        ...result,
        attempts: j,
      };
    let errorText = truncateHelperOutput(result.error);
    let failure = {
      error: j > 1 ? `after ${j} attempts: ${errorText}` : errorText,
      code: result.code,
      attempts: j,
    };
    if (j > maxRetries || !isRetryableHelperFailure(result.code) || !alive()) return failure;
    let delayMs = fullJitterBackoffMs({
      baseMs: HELPER_BACKOFF_BASE_MS,
      floorMs: HELPER_BACKOFF_FLOOR_MS,
      capMs: HELPER_BACKOFF_CAP_MS,
      attempt: j - 1,
    });
    logForDebugging(
      `policyHelper attempt ${j} of ${maxRetries + 1} failed [${result.code}]; retrying in ${delayMs}ms: ${errorText}`,
      {
        level: "warn",
      },
    );
    await sleep(delayMs);
    if (!alive()) return failure;
  }
}
//@ chunk-q8cqcff6.js:86596-89059 placement
/**
 * 执行一次 policyHelper（校验路径、取输出、解析信封）
 */
async function runPolicyHelperOnce(config, refresh, armed) {
  let family = helperPlatformFamily();
  let configError = validateHelperConfig(config, family, refresh, armed);
  if (configError)
    return {
      error: configError,
      code: "bad_path",
    };
  let launch = helperLaunchPlan(config);
  if ("error" in launch) return launch;
  let { plan } = launch;
  let min = Math.min(config.timeoutMs ?? HELPER_TIMEOUT_MS, MAX_HELPER_MS);
  let startTime = performance.now();
  let fileError = await checkHelperFile(plan, min, policyHelperRunner.pendingStats);
  if (fileError)
    return {
      error: fileError,
      code: "not_a_file",
    };
  let remainingMs = Math.ceil(min - (performance.now() - startTime));
  if (remainingMs <= 0)
    return {
      error: statTimeoutMessage(plan.file, min),
      code: "not_a_file",
    };
  let cwd;
  if (!armed || plan.input !== undefined) cwd = helperCwdFor(plan);
  else if (config.path === undefined)
    return {
      error: "remote-armed helper has no path",
      code: "bad_path",
    };
  else cwd = (family === "win32" ? win32 : posix).dirname(config.path);
  let env = withHostEnvRestored(() => {
    let env = process.env;
    return interpreterEnv(armed ? helperProcessEnv(helperOutputOverride?.() ?? env, family) : env, plan);
  });
  let { stdout, stderr, code, error, maxBufferExceeded, timedOut } = await execFileNoThrowWithCwd(
    plan.file,
    plan.args,
    {
      timeout: remainingMs,
      cwd,
      useToolMemoryCgroup: false,
      maxBuffer: MAX_HELPER_OUTPUT_BYTES + 1,
      env: {
        ...env,
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
      extendEnv: false,
      stdin: plan.input === undefined ? "ignore" : "pipe",
      input: plan.input,
    },
  );
  if (stderr)
    logForDebugging(`policyHelper stderr: ${stderr}`, {
      level: "debug",
    });
  if (maxBufferExceeded)
    return {
      error: `${stderr.length > stdout.length ? "stderr" : "stdout"} exceeded ${MAX_HELPER_OUTPUT_BYTES} bytes`,
      code: "oversize",
    };
  if (timedOut)
    return {
      error: `timed out after ${min}ms`,
      code: "timed_out",
    };
  let logStdout = (result) => {
    if (stdout)
      logForDebugging(`policyHelper stdout: ${stdout}`, {
        level: "debug",
      });
    return result;
  };
  if (code !== 0)
    return logStdout({
      error: `exited with code ${code}: ${stderr || stdout || error || ""}`,
      code: "exit_nonzero",
    });
  if (Buffer.byteLength(stdout, "utf8") > MAX_HELPER_OUTPUT_BYTES)
    return {
      error: `stdout exceeded ${MAX_HELPER_OUTPUT_BYTES} bytes`,
      code: "oversize",
    };
  let parsed = safeParseJSON(stdout, false);
  if (parsed === null || typeof parsed !== "object")
    return logStdout({
      error: "stdout is not a JSON object",
      code: "parse_failed",
    });
  let envelope = HELPER_OUTPUT_SCHEMA().safeParse(parsed);
  if (!envelope.success)
    return logStdout({
      error: `invalid envelope: ${envelope.error.message}`,
      code: "envelope_invalid",
    });
  let output = {};
  let warnings = [];
  if (envelope.data.managedSettings !== undefined) {
    let validated = validatePayloadAndLog(envelope.data.managedSettings, "policyHelper");
    if ("error" in validated)
      return logStdout({
        error: validated.error,
        code: "schema_rejected",
      });
    warnings = validated.warnings;
    if (armed) {
      warnings = serializeSettingsErrors(warnings);
      delete validated.settings.claudeMd;
    }
    output.managedSettings = validated.settings;
  }
  if (envelope.data.claudeMd !== undefined) output.claudeMd = envelope.data.claudeMd;
  if (envelope.data.appendSystemPrompt !== undefined)
    output.appendSystemPrompt = envelope.data.appendSystemPrompt;
  return {
    output,
    warnings,
  };
}
//@ chunk-q8cqcff6.js:89059-89112 placement
/**
 * helperPlatformFamily：helper 平台归类（win32/posix）。
 */
function helperPlatformFamily() {
  return getPlatform() === "windows" ? "win32" : "posix";
}
//@ chunk-q8cqcff6.js:89112-89347 placement
function validateHelperConfig(config, platform, usesScript, remote) {
  if (config.script == null && config.interpreter == null)
    return validatePolicyHelperPath(config.path, platform, usesScript, remote);
  if (!usesScript) return "inline scripts are not supported on the singular policyHelper key";
  if (config.path != null) return PATH_OR_SCRIPT_MESSAGE;
  return validateInlineHelper(config, platform === "win32" ? "windows" : "linux");
}
//@ chunk-q8cqcff6.js:89347-90356 placement
function validatePolicyHelperPath(path, platform, usesScript, remote) {
  let pathModule = platform === "win32" ? win32 : posix;
  if (typeof path !== "string") return "path must be a string";
  if (!pathModule.isAbsolute(path)) return `path must be absolute: ${path}`;
  if (platform === "win32") {
    if (usesScript && !POLICY_HELPER_EXECUTABLE_RE.test(path))
      return `path must end in .exe or .ps1 on Windows: ${path}`;
    if (!usesScript && !path.toLowerCase().endsWith(".exe"))
      return `path must end in .exe on Windows: ${path}`;
    if (hasPowerShellGlobChars(path)) return `${PS1_WILDCARD_MESSAGE}: ${path}`;
  }
  if (
    remote &&
    (platform === "win32"
      ? looksLikeUncPath(path)
      : isNetworkOrMacSpecialPath(path) || isKernelPseudoPath(path))
  )
    return `path must not be a UNC, network-automount (/net, /Network/Servers, or macOS /.vol /.file /.nofollow /.resolve) or kernel magic-link (/proc, /dev/fd) path when delivered via remote managed settings: ${path}`;
  if (
    !isNormalizedHelperPath(path, platform, {
      rejectDriveRelative: platform === "win32",
    })
  )
    return platform === "win32"
      ? `path must be a drive-qualified (C:\\...) or UNC path in normalized form (no "." or ".." segments, no doubled or trailing separators, no ":" or trailing "."/space in a component, no device-namespace prefix): ${path}`
      : `path must be in normalized form (no "." or ".." segments, no doubled or trailing separators): ${path}`;
  return null;
}
export {
  flattened,
  sanitizeIndexUrlEnv,
  HTTP_INDEX_INVALID,
  sanitizeEnvCredentials,
  CREDENTIAL_SCRUB_VARS_WITH_INPUT,
  envVarToUpperSnake,
  clearSanitizedEnvCache,
  initEnvScrubFlag,
  flattened_2,
  scrubbedEnvNames,
  isPackageIndexEnv,
  indexFallbackEnv,
  hasAnyIndexEnv,
  sanitizedEnvCache,
  CREDENTIAL_SCRUB_ENV_VARS_LOWER,
  PACKAGE_INDEX_ENV_VARS_2,
  PACKAGE_INDEX_ENV_VARS,
  runPolicyHelperWithRetry,
  helperPlatformFamily,
  validateHelperConfig,
  sanitizedIndexEnvs,
};
