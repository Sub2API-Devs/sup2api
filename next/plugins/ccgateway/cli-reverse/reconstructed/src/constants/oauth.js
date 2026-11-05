/**
 * constants/oauth.ts
 *
 * OAuth 常量：环境（prod/staging/local）、scope 列表、各端点 URL 配置、自定义 OAuth URL 白名单与 getOauthConfig。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/oauth.ts
 * pieces: chunk-exfmq47h.js (2), chunk-tzbg5px3.js (18)
 * attribution: placement 2, affinity 1, facade-majority 16, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import { env } from "../utils/env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tzbg5px3.js:226-252 affinity
/**
 * OAuth 环境，本构建恒为 "prod"。
 */
function getOauthEnvironment() {
  return "prod";
}
//@ chunk-tzbg5px3.js:252-313 facade-majority
/**
 * OAuth 配置文件名后缀列表。
 */
var OAUTH_GLOBAL_FILE_SUFFIXES = ["", "-staging-oauth", "-local-oauth", "-custom-oauth"];
//@ chunk-tzbg5px3.js:313-496 facade-majority (2.1.88 match: fileSuffixForOauthConfig, 1)
/**
 * 按环境（或 CLAUDE_CODE_CUSTOM_OAUTH_URL）返回凭证文件名后缀。
 */
function fileSuffixForOauthConfig() {
  if (process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return "-custom-oauth";
  switch (getOauthEnvironment()) {
    case "local":
      return "-local-oauth";
    case "staging":
      return "-staging-oauth";
    case "prod":
      return "";
  }
}
//@ chunk-tzbg5px3.js:496-542 facade-majority
/**
 * 是否 staging OAuth 配置。
 */
function isStagingOauthConfig() {
  return fileSuffixForOauthConfig() === "-staging-oauth";
}
//@ chunk-tzbg5px3.js:542-559 facade-majority
/**
 * 长期 OAuth token 有效期 31536000 秒（一年）。
 */
var LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS = 31536000;
//@ chunk-tzbg5px3.js:559-742 facade-majority (2.1.88 match: CLAUDE_AI_PROFILE_SCOPE, 0.29)
/**
 * setup-token 默认有效天数与各 scope 常量：user:inference、user:profile、user:sessions:claude_code、user:plugins、user:projects:read/write。
 */
var SETUP_TOKEN_DEFAULT_EXPIRY_DAYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLAUDE_AI_INFERENCE_SCOPE;
var CLAUDE_AI_PROFILE_SCOPE;
var CLAUDE_AI_SESSIONS_SCOPE;
var CLOUD_SESSIONS_OAUTH_SCOPES;
var CLAUDE_AI_PLUGINS_SCOPE;
var CLAUDE_AI_PROJECTS_READ_SCOPE;
var CLAUDE_AI_PROJECTS_WRITE_SCOPE;
deferInit("chunk-tzbg5px3.js:559", () => {
  SETUP_TOKEN_DEFAULT_EXPIRY_DAYS = Math.round(LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS / 86400);
  CLAUDE_AI_INFERENCE_SCOPE = "user:inference";
  CLAUDE_AI_PROFILE_SCOPE = "user:profile";
  CLAUDE_AI_SESSIONS_SCOPE = "user:sessions:claude_code";
  CLOUD_SESSIONS_OAUTH_SCOPES = [CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_SESSIONS_SCOPE];
  CLAUDE_AI_PLUGINS_SCOPE = "user:plugins";
  CLAUDE_AI_PROJECTS_READ_SCOPE = "user:projects:read";
  CLAUDE_AI_PROJECTS_WRITE_SCOPE = "user:projects:write";
});
//@ chunk-tzbg5px3.js:742-798 facade-majority
/**
 * scope 列表含 user:inference。
 */
function isClaudeAiScopeSet(scopes) {
  return Array.isArray(scopes) && scopes.includes(CLAUDE_AI_INFERENCE_SCOPE);
}
//@ chunk-tzbg5px3.js:798-908 facade-majority (2.1.88 match: CLAUDE_AI_OAUTH_SCOPES, 0.556)
/**
 * Console 登录 scope：org:create_api_key + user:profile。同语句 r 为 claude.ai 登录基础 scope。
 */
var ORG_CREATE_API_KEY; // deferred: uses SETUP_TOKEN_DEFAULT_EXPIRY_DAYS of its import cycle while loading; runs once the cycle is complete
var OAUTH_BETA_HEADER;
var CONSOLE_OAUTH_SCOPES;
var CLAUDE_AI_BASE_OAUTH_SCOPES;
deferInit("chunk-tzbg5px3.js:798", () => {
  ORG_CREATE_API_KEY = "org:create_api_key";
  OAUTH_BETA_HEADER = "oauth-2025-04-20";
  CONSOLE_OAUTH_SCOPES = [ORG_CREATE_API_KEY, CLAUDE_AI_PROFILE_SCOPE];
  CLAUDE_AI_BASE_OAUTH_SCOPES = [
    CLAUDE_AI_PROFILE_SCOPE,
    CLAUDE_AI_INFERENCE_SCOPE,
    CLAUDE_AI_SESSIONS_SCOPE,
    "user:mcp_servers",
    "user:file_upload",
  ];
});
//@ chunk-tzbg5px3.js:908-994 facade-majority
/**
 * claude.ai 登录 scope（基础 + 注册了插件 scope 时加 user:plugins）。
 */
function claudeAiLoginScopes() {
  let oauthConfig = getOauthConfig();
  let scopes = [...CLAUDE_AI_BASE_OAUTH_SCOPES];
  if (oauthConfig.PLUGINS_SCOPE_REGISTERED) scopes.push(CLAUDE_AI_PLUGINS_SCOPE);
  return scopes;
}
//@ chunk-tzbg5px3.js:994-1035 facade-majority
/**
 * 所有 OAuth scope 去重合集。
 */
function allOAuthScopes() {
  return normalizeCaseForComparison_2([...CONSOLE_OAUTH_SCOPES, ...claudeAiLoginScopes()]);
}
//@ chunk-tzbg5px3.js:1035-1096 facade-majority
/**
 * design 读写 scope。
 */
var DESIGN_OAUTH_SCOPES; // deferred: uses SETUP_TOKEN_DEFAULT_EXPIRY_DAYS of its import cycle while loading; runs once the cycle is complete
var PROJECTS_OAUTH_SCOPES;
deferInit("chunk-tzbg5px3.js:1035", () => {
  DESIGN_OAUTH_SCOPES = ["user:design:read", "user:design:write"];
  PROJECTS_OAUTH_SCOPES = [CLAUDE_AI_PROJECTS_READ_SCOPE, CLAUDE_AI_PROJECTS_WRITE_SCOPE];
});
//@ chunk-tzbg5px3.js:1096-1186 facade-majority
/**
 * 从已有 scope 中挑出刷新时可保留的（projects 读写）。
 */
function preservableScopesFrom(scopes) {
  if (!Array.isArray(scopes)) return [];
  let preservable = PROJECTS_OAUTH_SCOPES;
  return scopes.filter((scope) => preservable.includes(scope));
}
//@ chunk-tzbg5px3.js:1186-1233 facade-majority
/**
 * 第一方刷新 token 时请求的 scope。
 */
function firstPartyRefreshScopes(scopes) {
  return normalizeCaseForComparison_2([...claudeAiLoginScopes(), ...preservableScopesFrom(scopes)]);
}
//@ chunk-tzbg5px3.js:1233-2288 facade-majority (2.1.88 match: PROD_OAUTH_CONFIG, 0.905)
/**
 * 生产 OAuth 端点配置（api.anthropic.com、platform.claude.com、claude.com/cai/oauth/authorize、token/create_api_key/roles 等）；c9e 为 MCP 客户端元数据 URL；u 为 staging 配置（构建中为 undefined）。
 */
var PROD_OAUTH_CONFIG = {
  BASE_API_URL: "https://api.anthropic.com",
  CONSOLE_AUTHORIZE_URL: "https://platform.claude.com/oauth/authorize",
  CLAUDE_AI_AUTHORIZE_URL: "https://claude.com/cai/oauth/authorize",
  CLAUDE_AI_ORIGIN: "https://claude.ai",
  TOKEN_URL: "https://platform.claude.com/v1/oauth/token",
  API_KEY_URL: "https://api.anthropic.com/api/oauth/claude_cli/create_api_key",
  ROLES_URL: "https://api.anthropic.com/api/oauth/claude_cli/roles",
  CONSOLE_SUCCESS_URL:
    "https://platform.claude.com/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code",
  CLAUDEAI_SUCCESS_URL: "https://platform.claude.com/oauth/code/success?app=claude-code",
  MANUAL_REDIRECT_URL: "https://platform.claude.com/oauth/code/callback",
  CLIENT_ID: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  DESIGN_CLIENT_ID: "59637612-477b-4836-a601-b0589eda7704",
  OAUTH_FILE_SUFFIX: "",
  PLUGINS_SCOPE_REGISTERED: true,
  PROJECTS_SCOPES_REGISTERED: true,
  HYBRID_SETTINGS_SCOPE_REGISTERED: true,
  MCP_PROXY_URL: "https://mcp-proxy.anthropic.com",
  MCP_PROXY_PATH: "/v1/mcp/{server_id}",
};
var MCP_CLIENT_METADATA_URL = "https://claude.ai/oauth/claude-code-client-metadata";
var STAGING_OAUTH_CONFIG = undefined;
//@ chunk-tzbg5px3.js:2288-3353 fingerprint (2.1.88 match: getLocalOauthConfig, 0.936)
/**
 * 本地开发 OAuth 配置（CLAUDE_LOCAL_OAUTH_API_BASE/APPS_BASE/CONSOLE_BASE）。
 */
function getLocalOauthConfig() {
  let api = process.env.CLAUDE_LOCAL_OAUTH_API_BASE?.replace(/\/$/, "") ?? "http://localhost:8000";
  let apps = process.env.CLAUDE_LOCAL_OAUTH_APPS_BASE?.replace(/\/$/, "") ?? "http://localhost:4000";
  let consoleBase =
    process.env.CLAUDE_LOCAL_OAUTH_CONSOLE_BASE?.replace(/\/$/, "") ?? "http://localhost:3000";
  return {
    BASE_API_URL: api,
    CONSOLE_AUTHORIZE_URL: `${consoleBase}/oauth/authorize`,
    CLAUDE_AI_AUTHORIZE_URL: `${apps}/oauth/authorize`,
    CLAUDE_AI_ORIGIN: apps,
    TOKEN_URL: `${api}/v1/oauth/token`,
    API_KEY_URL: `${api}/api/oauth/claude_cli/create_api_key`,
    ROLES_URL: `${api}/api/oauth/claude_cli/roles`,
    CONSOLE_SUCCESS_URL: `${consoleBase}/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code`,
    CLAUDEAI_SUCCESS_URL: `${consoleBase}/oauth/code/success?app=claude-code`,
    MANUAL_REDIRECT_URL: `${consoleBase}/oauth/code/callback`,
    CLIENT_ID: "22422756-60c9-4084-8eb7-27705fd5cf9a",
    DESIGN_CLIENT_ID: "00000000-0000-4000-8000-000000000000",
    OAUTH_FILE_SUFFIX: "-local-oauth",
    PLUGINS_SCOPE_REGISTERED: true,
    PROJECTS_SCOPES_REGISTERED: true,
    HYBRID_SETTINGS_SCOPE_REGISTERED: true,
    MCP_PROXY_URL: "http://localhost:8205",
    MCP_PROXY_PATH: "/v1/toolbox/shttp/mcp/{server_id}",
  };
}
//@ chunk-tzbg5px3.js:3353-3474 facade-majority (2.1.88 match: ALLOWED_OAUTH_BASE_URLS, 1)
/**
 * CLAUDE_CODE_CUSTOM_OAUTH_URL 允许的基址白名单（staging 与 fedstart）。
 */
var ALLOWED_OAUTH_BASE_URLS = [
  "https://beacon.claude-ai.staging.ant.dev",
  "https://claude.fedstart.com",
  "https://claude-staging.fedstart.com",
];
//@ chunk-tzbg5px3.js:3474-3571 facade-majority (2.1.88 match: getOauthConfigType, 0.645)
/**
 * 按环境选内置 OAuth 配置。
 */
function builtInOauthConfig() {
  switch (getOauthEnvironment()) {
    case "local":
      return getLocalOauthConfig();
    case "staging":
      return STAGING_OAUTH_CONFIG ?? PROD_OAUTH_CONFIG;
    case "prod":
      return PROD_OAUTH_CONFIG;
  }
}
//@ chunk-tzbg5px3.js:3571-4506 facade-majority (2.1.88 match: getOauthConfig, 0.888)
/**
 * 当前 OAuth 配置：内置配置，CLAUDE_CODE_CUSTOM_OAUTH_URL 在白名单内时整体替换基址，另可覆盖 client id 等。
 */
function getOauthConfig() {
  let config = builtInOauthConfig();
  let oauthBaseUrl = process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL;
  if (oauthBaseUrl) {
    let base = oauthBaseUrl.replace(/\/$/, "");
    if (!ALLOWED_OAUTH_BASE_URLS.includes(base))
      throw Error("CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint.");
    config = {
      ...config,
      BASE_API_URL: base,
      CONSOLE_AUTHORIZE_URL: `${base}/oauth/authorize`,
      CLAUDE_AI_AUTHORIZE_URL: `${base}/oauth/authorize`,
      CLAUDE_AI_ORIGIN: base,
      TOKEN_URL: `${base}/v1/oauth/token`,
      API_KEY_URL: `${base}/api/oauth/claude_cli/create_api_key`,
      ROLES_URL: `${base}/api/oauth/claude_cli/roles`,
      CONSOLE_SUCCESS_URL: `${base}/oauth/code/success?app=claude-code`,
      CLAUDEAI_SUCCESS_URL: `${base}/oauth/code/success?app=claude-code`,
      MANUAL_REDIRECT_URL: `${base}/oauth/code/callback`,
      OAUTH_FILE_SUFFIX: "-custom-oauth",
      PLUGINS_SCOPE_REGISTERED: false,
      PROJECTS_SCOPES_REGISTERED: false,
      HYBRID_SETTINGS_SCOPE_REGISTERED: false,
    };
  }
  let clientIdOverride = process.env.CLAUDE_CODE_OAUTH_CLIENT_ID;
  if (clientIdOverride)
    config = {
      ...config,
      CLIENT_ID: clientIdOverride,
      PLUGINS_SCOPE_REGISTERED: false,
      PROJECTS_SCOPES_REGISTERED: false,
      HYBRID_SETTINGS_SCOPE_REGISTERED: false,
    };
  return config;
}
//@ chunk-exfmq47h.js:560010-560113 placement
/**
 * 从 CLAUDE_CODE_OAUTH_SCOPES 环境变量读取空白分隔的 OAuth scope 列表，未设置返回 undefined。
 */
function oauthScopesFromEnv() {
  let filtered = env.CLAUDE_CODE_OAUTH_SCOPES?.split(/\s+/).filter(Boolean);
  return filtered?.length ? filtered : undefined;
}
//@ chunk-exfmq47h.js:560113-560179 placement
var OAUTH_DEFAULT_SCOPES = ["user:inference", "user:ccr_inference", "user:file_upload"];
export {
  getOauthConfig,
  fileSuffixForOauthConfig,
  OAUTH_GLOBAL_FILE_SUFFIXES,
  CLAUDE_AI_INFERENCE_SCOPE,
  OAUTH_BETA_HEADER,
  SETUP_TOKEN_DEFAULT_EXPIRY_DAYS,
  LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
  claudeAiLoginScopes,
  preservableScopesFrom,
  CLAUDE_AI_PROJECTS_READ_SCOPE,
  CLAUDE_AI_PROJECTS_WRITE_SCOPE,
  builtInOauthConfig,
  ALLOWED_OAUTH_BASE_URLS,
  oauthScopesFromEnv,
  OAUTH_DEFAULT_SCOPES,
  firstPartyRefreshScopes,
  isClaudeAiScopeSet,
  CLAUDE_AI_PROFILE_SCOPE,
  DESIGN_OAUTH_SCOPES,
  MCP_CLIENT_METADATA_URL,
  allOAuthScopes,
  CLAUDE_AI_PLUGINS_SCOPE,
  CLAUDE_AI_SESSIONS_SCOPE,
  CLOUD_SESSIONS_OAUTH_SCOPES,
  isStagingOauthConfig,
};
