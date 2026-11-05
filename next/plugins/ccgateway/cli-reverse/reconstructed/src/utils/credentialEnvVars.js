/**
 * utils/credentialEnvVars.ts
 *
 * 2.1.316 新增：凭据类环境变量清单
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:603064-604172 placement
/**
 * 工具专用的凭据类环境变量（MCP_CLIENT_SECRET 等）。
 */
var CREDENTIAL_ENV_VARS; // deferred: uses flattened (./settings/policyHelper/helperExec.js) of its import cycle while loading; runs once the cycle is complete
var flattened;
var TOOL_ENV_VARS;
var CLOUD_CREDENTIAL_ENV_VARS;
var GIT_CREDENTIAL_ENV_VARS;
deferInit("chunk-5xgkngpb.js:603064", () => {
  CREDENTIAL_ENV_VARS = [
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
  flattened = CREDENTIAL_ENV_VARS.flatMap((varName) => [varName, `INPUT_${varName}`]);
  TOOL_ENV_VARS = [
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
  CLOUD_CREDENTIAL_ENV_VARS = new Set([
    "GH_ENTERPRISE_TOKEN",
    "GITHUB_ENTERPRISE_TOKEN",
    "HF_TOKEN",
    "HUGGING_FACE_HUB_TOKEN",
    "HUGGINGFACEHUB_API_TOKEN",
  ]);
  GIT_CREDENTIAL_ENV_VARS = [
    ...flattened_3.filter((varName) => !CLOUD_CREDENTIAL_ENV_VARS.has(varName.replace(/^INPUT_/, ""))),
    ...TOOL_ENV_VARS.flatMap((varName) => [varName, `INPUT_${varName}`]),
  ];
});
//@ chunk-5xgkngpb.js:604172-604357 placement
/**
 * 判断环境变量名是否为凭据类（含 INPUT_ 前缀、git 配置参数、cargo token、bundle 凭据等）。
 */
function isCredentialEnvVar(name) {
  let name_2 = name.replace(/^INPUT_/, "");
  return (
    isChildScrubbedCredentialFamily(name) ||
    /^GIT_CONFIG_(?:PARAMETERS|(?:KEY|VALUE)_\d+)$/.test(name_2) ||
    /^CARGO_REGISTRIES_[A-Z0-9_]+_TOKEN$/.test(name_2) ||
    isCredentialUserEnv(name_2) ||
    BUNDLE_CREDENTIAL_ENV_REGEX.test(name_2)
  );
}
//@ chunk-5xgkngpb.js:604357-604558 placement
/**
 * 判断字符串（含 NFKC 规范化与 URL 解码后）是否包含通配符 *。
 */
function containsWildcard(value) {
  try {
    if (value.normalize("NFKC").includes("*") || /%2a/i.test(value)) return true;
    return value.includes("%") && decodeURIComponent(value).normalize("NFKC").includes("*");
  } catch (error) {
    return !(error instanceof URIError);
  }
}
//@ chunk-5xgkngpb.js:604558-604660 placement
/**
 * 凭据环境变量集合：额外列表、凭据变量与密钥变量（大写）。
 */
var EXTRA_CREDENTIAL_ENV_VARS; // deferred: uses CREDENTIAL_ENV_VARS of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_ENV_VARS_2;
var SECRET_ENV_VARS;
deferInit("chunk-5xgkngpb.js:604558", () => {
  EXTRA_CREDENTIAL_ENV_VARS = new Set();
  CREDENTIAL_ENV_VARS_2 = new Set(flattened.map((varName) => varName.toUpperCase()));
  SECRET_ENV_VARS = new Set(GIT_CREDENTIAL_ENV_VARS.map((varName) => varName.toUpperCase()));
});
//@ chunk-5xgkngpb.js:604935-605141 placement
/**
 * 受保护的环境变量集合（含 INPUT_ 变体）与各提供商的 base URL 变量。
 */
var PROTECTED_ENV_VARS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var BASE_URL_ENV_VARS;
deferInit("chunk-5xgkngpb.js:604935", () => {
  PROTECTED_ENV_VARS = new Set(
    [...AUTH_TOKEN_ENV_VARS.flatMap((varName) => [varName, `INPUT_${varName}`]), ...flattened].map(
      (varName) => varName.toUpperCase(),
    ),
  );
  BASE_URL_ENV_VARS = new Set(
    [
      ...BASE_URL_ENV_VARS_2.filter((varName) => varName.endsWith("_BASE_URL")),
      "CLAUDE_CODE_API_BASE_URL",
    ].flatMap((varName) => [varName, `INPUT_${varName}`]),
  );
});
//@ chunk-5xgkngpb.js:605141-605196 placement
/**
 * 判断某 base URL 环境变量的值里是否含凭据。
 */
function isBaseUrlWithCredential(varName, value) {
  return value !== undefined && BASE_URL_ENV_VARS.has(varName) && containsCredential(value);
}
//@ chunk-5xgkngpb.js:605196-605294 placement
/**
 * 判断某环境变量在子进程里是否需要擦除（凭据或显式擦除名单）。
 */
function shouldScrubEnvEntry(varName, value) {
  if (!shouldScrubSubprocessEnv()) return false;
  return (
    (value !== undefined && !isGitConfigOrProxyEnvName(varName) && isSecretEnvValue(varName, value)) ||
    (scrubbedEnvNames().length > 0 && armedRunnerShedsName(varName))
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
