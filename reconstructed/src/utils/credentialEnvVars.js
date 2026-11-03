/**
 * utils/credentialEnvVars.ts
 *
 * 2.1.316 新增：凭据类环境变量清单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { flattened as flattened_3, scrubbedEnvNames } from "./settings/policyHelper/helperExec.js";
import {
  isChildScrubbedCredentialFamily,
  shouldScrubSubprocessEnv,
  armedRunnerShedsName,
} from "./subprocessEnv.js";
import {
  isCredentialUserEnv,
  BUNDLE_CREDENTIAL_ENV_REGEX,
  containsCredential,
  isGitConfigOrProxyEnvName,
  isSecretEnvValue,
} from "./settings/policyHelper/helperEnv.js";
import { AUTH_TOKEN_ENV_VARS, BASE_URL_ENV_VARS as BASE_URL_ENV_VARS_2 } from "./managedEnvConstants.js";

//@ chunk-e6aww6q8.js:594203-595311 placement
/**
 * 工具专用的凭据类环境变量（MCP_CLIENT_SECRET 等）。
 */
var CREDENTIAL_ENV_VARS = [
  "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
  "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
  "CLAUDE_CODE_HOST_CREDS_FILE",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "MCP_CLIENT_SECRET",
  "MCP_XAA_IDP_CLIENT_SECRET",
  "ENVIRONMENT_SERVICE_KEY",
  "SELF_HOSTED_RUNNER_POOL_SECRET",
  "SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET",
];
var flattened = CREDENTIAL_ENV_VARS.flatMap((e) => [e, `INPUT_${e}`]);
var TOOL_ENV_VARS = [
  "AWS_CONTAINER_AUTHORIZATION_TOKEN",
  "ANTHROPIC_IDENTITY_TOKEN",
  "CLOUDSDK_AUTH_ACCESS_TOKEN",
  "GOOGLE_OAUTH_ACCESS_TOKEN",
  "AZURE_CLIENT_CERTIFICATE_PASSWORD",
  "AZURE_PASSWORD",
  "CLAUDE_CODE_CLIENT_KEY_PASSPHRASE",
  "CLAUDE_CODE_CLIENT_KEY",
  "CLAUDE_CODE_CLIENT_CERT",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "ALL_PROXY",
  "https_proxy",
  "http_proxy",
  "all_proxy",
  "CARGO_REGISTRY_TOKEN",
  "NPM_TOKEN",
  "CODEARTIFACT_AUTH_TOKEN",
  "PIP_INDEX_URL",
  "PIP_EXTRA_INDEX_URL",
  "UV_INDEX_URL",
  "UV_EXTRA_INDEX_URL",
  "UV_DEFAULT_INDEX",
  "UV_INDEX",
  "GOPROXY",
  "GOAUTH",
  "PYPI_TOKEN",
  "TWINE_PASSWORD",
];
var CLOUD_CREDENTIAL_ENV_VARS = new Set([
  "GH_ENTERPRISE_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "HF_TOKEN",
  "HUGGING_FACE_HUB_TOKEN",
  "HUGGINGFACEHUB_API_TOKEN",
]);
var GIT_CREDENTIAL_ENV_VARS = [
  ...flattened_3.filter((e) => !CLOUD_CREDENTIAL_ENV_VARS.has(e.replace(/^INPUT_/, ""))),
  ...TOOL_ENV_VARS.flatMap((e) => [e, `INPUT_${e}`]),
];
//@ chunk-e6aww6q8.js:595311-595496 placement
/**
 * 判断环境变量名是否为凭据类（含 INPUT_ 前缀、git 配置参数、cargo token、bundle 凭据等）。
 */
function isCredentialEnvVar(e) {
  let replaced = e.replace(/^INPUT_/, "");
  return (
    isChildScrubbedCredentialFamily(e) ||
    /^GIT_CONFIG_(?:PARAMETERS|(?:KEY|VALUE)_\d+)$/.test(replaced) ||
    /^CARGO_REGISTRIES_[A-Z0-9_]+_TOKEN$/.test(replaced) ||
    isCredentialUserEnv(replaced) ||
    BUNDLE_CREDENTIAL_ENV_REGEX.test(replaced)
  );
}
//@ chunk-e6aww6q8.js:595496-595697 placement
/**
 * 判断字符串（含 NFKC 规范化与 URL 解码后）是否包含通配符 *。
 */
function containsWildcard(e) {
  try {
    if (e.normalize("NFKC").includes("*") || /%2a/i.test(e)) return true;
    return e.includes("%") && decodeURIComponent(e).normalize("NFKC").includes("*");
  } catch (error) {
    return !(error instanceof URIError);
  }
}
//@ chunk-e6aww6q8.js:595697-595799 placement
/**
 * 凭据环境变量集合：额外列表、凭据变量与密钥变量（大写）。
 */
var EXTRA_CREDENTIAL_ENV_VARS = new Set();
var CREDENTIAL_ENV_VARS_2 = new Set(flattened.map((e) => e.toUpperCase()));
var SECRET_ENV_VARS = new Set(GIT_CREDENTIAL_ENV_VARS.map((e) => e.toUpperCase()));
//@ chunk-e6aww6q8.js:596074-596280 placement
/**
 * 受保护的环境变量集合（含 INPUT_ 变体）与各提供商的 base URL 变量。
 */
var PROTECTED_ENV_VARS = new Set(
  [...AUTH_TOKEN_ENV_VARS.flatMap((e) => [e, `INPUT_${e}`]), ...flattened].map((e) => e.toUpperCase()),
);
var BASE_URL_ENV_VARS = new Set(
  [...BASE_URL_ENV_VARS_2.filter((e) => e.endsWith("_BASE_URL")), "CLAUDE_CODE_API_BASE_URL"].flatMap((e) => [
    e,
    `INPUT_${e}`,
  ]),
);
//@ chunk-e6aww6q8.js:596280-596335 placement
/**
 * 判断某 base URL 环境变量的值里是否含凭据。
 */
function isBaseUrlWithCredential(e, n) {
  return n !== undefined && BASE_URL_ENV_VARS.has(e) && containsCredential(n);
}
//@ chunk-e6aww6q8.js:596335-596433 placement
/**
 * 判断某环境变量在子进程里是否需要擦除（凭据或显式擦除名单）。
 */
function shouldScrubEnvEntry(e, n) {
  if (!shouldScrubSubprocessEnv()) return false;
  return (
    (n !== undefined && !isGitConfigOrProxyEnvName(e) && isSecretEnvValue(e, n)) ||
    (scrubbedEnvNames().length > 0 && armedRunnerShedsName(e))
  );
}
export {
  CREDENTIAL_ENV_VARS_2,
  SECRET_ENV_VARS,
  isCredentialEnvVar,
  isBaseUrlWithCredential,
  shouldScrubEnvEntry,
  PROTECTED_ENV_VARS,
  EXTRA_CREDENTIAL_ENV_VARS,
  containsWildcard,
};
