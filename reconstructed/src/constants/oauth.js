/**
 * constants/oauth.ts
 *
 * OAuth 常量：环境（prod/staging/local）、scope 列表、各端点 URL 配置、自定义 OAuth URL 白名单与 getOauthConfig。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/oauth.ts
 * pieces: chunk-6ysndsgz.js (18), chunk-aepeg2w5.js (2)
 * attribution: affinity 1, facade-majority 16, fingerprint 1, placement 2
 */
import { uniq } from "../utils/collections.js";
import { env } from "../utils/env.js";

/**
 * OAuth 环境，本构建恒为 "prod"。
 */
//@ chunk-6ysndsgz.js:226-252 affinity
function getOauthEnvironment() {
  return "prod";
}
/**
 * OAuth 配置文件名后缀列表。
 */
//@ chunk-6ysndsgz.js:252-313 facade-majority
var OAUTH_GLOBAL_FILE_SUFFIXES = ["", "-staging-oauth", "-local-oauth", "-custom-oauth"];
/**
 * 按环境（或 CLAUDE_CODE_CUSTOM_OAUTH_URL）返回凭证文件名后缀。
 */
//@ chunk-6ysndsgz.js:313-496 facade-majority = fileSuffixForOauthConfig (1)
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
/**
 * 是否 staging OAuth 配置。
 */
//@ chunk-6ysndsgz.js:496-542 facade-majority
function isStagingOauthConfig() {
  return fileSuffixForOauthConfig() === "-staging-oauth";
}
/**
 * 长期 OAuth token 有效期 31536000 秒（一年）。
 */
//@ chunk-6ysndsgz.js:542-559 facade-majority
var LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS = 31536000;
/**
 * setup-token 默认有效天数与各 scope 常量：user:inference、user:profile、user:sessions:claude_code、user:plugins、user:projects:read/write。
 */
//@ chunk-6ysndsgz.js:559-742 facade-majority = CLAUDE_AI_PROFILE_SCOPE (0.29)
var SETUP_TOKEN_DEFAULT_EXPIRY_DAYS = Math.round(LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS / 86400),
  CLAUDE_AI_INFERENCE_SCOPE = "user:inference",
  CLAUDE_AI_PROFILE_SCOPE = "user:profile",
  CLAUDE_AI_SESSIONS_SCOPE = "user:sessions:claude_code",
  CLOUD_SESSIONS_OAUTH_SCOPES = [CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_SESSIONS_SCOPE],
  CLAUDE_AI_PLUGINS_SCOPE = "user:plugins",
  CLAUDE_AI_PROJECTS_READ_SCOPE = "user:projects:read",
  CLAUDE_AI_PROJECTS_WRITE_SCOPE = "user:projects:write";
/**
 * scope 列表含 user:inference。
 */
//@ chunk-6ysndsgz.js:742-798 facade-majority
function isClaudeAiScopeSet(t) {
  return Array.isArray(t) && t.includes(CLAUDE_AI_INFERENCE_SCOPE);
}
/**
 * Console 登录 scope：org:create_api_key + user:profile。同语句 r 为 claude.ai 登录基础 scope。
 */
//@ chunk-6ysndsgz.js:798-908 facade-majority = CLAUDE_AI_OAUTH_SCOPES (0.556)
var ORG_CREATE_API_KEY = "org:create_api_key",
  OAUTH_BETA_HEADER = "oauth-2025-04-20",
  CONSOLE_OAUTH_SCOPES = [ORG_CREATE_API_KEY, CLAUDE_AI_PROFILE_SCOPE],
  CLAUDE_AI_BASE_OAUTH_SCOPES = [
    CLAUDE_AI_PROFILE_SCOPE,
    CLAUDE_AI_INFERENCE_SCOPE,
    CLAUDE_AI_SESSIONS_SCOPE,
    "user:mcp_servers",
    "user:file_upload",
  ];
/**
 * claude.ai 登录 scope（基础 + 注册了插件 scope 时加 user:plugins）。
 */
//@ chunk-6ysndsgz.js:908-994 facade-majority
function claudeAiLoginScopes() {
  let t = getOauthConfig(),
    e = [...CLAUDE_AI_BASE_OAUTH_SCOPES];
  if (t.PLUGINS_SCOPE_REGISTERED) e.push(CLAUDE_AI_PLUGINS_SCOPE);
  return e;
}
/**
 * 所有 OAuth scope 去重合集。
 */
//@ chunk-6ysndsgz.js:994-1035 facade-majority
function allOAuthScopes() {
  return uniq([...CONSOLE_OAUTH_SCOPES, ...claudeAiLoginScopes()]);
}
/**
 * design 读写 scope。
 */
//@ chunk-6ysndsgz.js:1035-1096 facade-majority
var DESIGN_OAUTH_SCOPES = ["user:design:read", "user:design:write"],
  PROJECTS_OAUTH_SCOPES = [CLAUDE_AI_PROJECTS_READ_SCOPE, CLAUDE_AI_PROJECTS_WRITE_SCOPE];
/**
 * 从已有 scope 中挑出刷新时可保留的（projects 读写）。
 */
//@ chunk-6ysndsgz.js:1096-1186 facade-majority
function preservableScopesFrom(t) {
  if (!Array.isArray(t)) return [];
  let e = PROJECTS_OAUTH_SCOPES;
  return t.filter((o) => e.includes(o));
}
/**
 * 第一方刷新 token 时请求的 scope。
 */
//@ chunk-6ysndsgz.js:1186-1233 facade-majority
function firstPartyRefreshScopes(t) {
  return uniq([...claudeAiLoginScopes(), ...preservableScopesFrom(t)]);
}
/**
 * 生产 OAuth 端点配置（api.anthropic.com、platform.claude.com、claude.com/cai/oauth/authorize、token/create_api_key/roles 等）；c9e 为 MCP 客户端元数据 URL；u 为 staging 配置（构建中为 undefined）。
 */
//@ chunk-6ysndsgz.js:1233-2288 facade-majority = PROD_OAUTH_CONFIG (0.905)
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
    PLUGINS_SCOPE_REGISTERED: !0,
    PROJECTS_SCOPES_REGISTERED: !0,
    HYBRID_SETTINGS_SCOPE_REGISTERED: !0,
    MCP_PROXY_URL: "https://mcp-proxy.anthropic.com",
    MCP_PROXY_PATH: "/v1/mcp/{server_id}",
  },
  MCP_CLIENT_METADATA_URL = "https://claude.ai/oauth/claude-code-client-metadata",
  STAGING_OAUTH_CONFIG = void 0;
/**
 * 本地开发 OAuth 配置（CLAUDE_LOCAL_OAUTH_API_BASE/APPS_BASE/CONSOLE_BASE）。
 */
//@ chunk-6ysndsgz.js:2288-3353 fingerprint = getLocalOauthConfig (0.936)
function getLocalOauthConfig() {
  let t = process.env.CLAUDE_LOCAL_OAUTH_API_BASE?.replace(/\/$/, "") ?? "http://localhost:8000",
    e = process.env.CLAUDE_LOCAL_OAUTH_APPS_BASE?.replace(/\/$/, "") ?? "http://localhost:4000",
    o = process.env.CLAUDE_LOCAL_OAUTH_CONSOLE_BASE?.replace(/\/$/, "") ?? "http://localhost:3000";
  return {
    BASE_API_URL: t,
    CONSOLE_AUTHORIZE_URL: `${o}/oauth/authorize`,
    CLAUDE_AI_AUTHORIZE_URL: `${e}/oauth/authorize`,
    CLAUDE_AI_ORIGIN: e,
    TOKEN_URL: `${t}/v1/oauth/token`,
    API_KEY_URL: `${t}/api/oauth/claude_cli/create_api_key`,
    ROLES_URL: `${t}/api/oauth/claude_cli/roles`,
    CONSOLE_SUCCESS_URL: `${o}/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code`,
    CLAUDEAI_SUCCESS_URL: `${o}/oauth/code/success?app=claude-code`,
    MANUAL_REDIRECT_URL: `${o}/oauth/code/callback`,
    CLIENT_ID: "22422756-60c9-4084-8eb7-27705fd5cf9a",
    DESIGN_CLIENT_ID: "00000000-0000-4000-8000-000000000000",
    OAUTH_FILE_SUFFIX: "-local-oauth",
    PLUGINS_SCOPE_REGISTERED: !0,
    PROJECTS_SCOPES_REGISTERED: !0,
    HYBRID_SETTINGS_SCOPE_REGISTERED: !0,
    MCP_PROXY_URL: "http://localhost:8205",
    MCP_PROXY_PATH: "/v1/toolbox/shttp/mcp/{server_id}",
  };
}
/**
 * CLAUDE_CODE_CUSTOM_OAUTH_URL 允许的基址白名单（staging 与 fedstart）。
 */
//@ chunk-6ysndsgz.js:3353-3474 facade-majority = ALLOWED_OAUTH_BASE_URLS (1)
var ALLOWED_OAUTH_BASE_URLS = [
  "https://beacon.claude-ai.staging.ant.dev",
  "https://claude.fedstart.com",
  "https://claude-staging.fedstart.com",
];
/**
 * 按环境选内置 OAuth 配置。
 */
//@ chunk-6ysndsgz.js:3474-3571 facade-majority = getOauthConfigType (0.645)
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
/**
 * 当前 OAuth 配置：内置配置，CLAUDE_CODE_CUSTOM_OAUTH_URL 在白名单内时整体替换基址，另可覆盖 client id 等。
 */
//@ chunk-6ysndsgz.js:3571-4506 facade-majority = getOauthConfig (0.888)
function getOauthConfig() {
  let t = builtInOauthConfig(),
    oauthBaseUrl = process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL;
  if (oauthBaseUrl) {
    let base = oauthBaseUrl.replace(/\/$/, "");
    if (!ALLOWED_OAUTH_BASE_URLS.includes(base))
      throw Error("CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint.");
    t = {
      ...t,
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
      PLUGINS_SCOPE_REGISTERED: !1,
      PROJECTS_SCOPES_REGISTERED: !1,
      HYBRID_SETTINGS_SCOPE_REGISTERED: !1,
    };
  }
  let clientIdOverride = process.env.CLAUDE_CODE_OAUTH_CLIENT_ID;
  if (clientIdOverride)
    t = {
      ...t,
      CLIENT_ID: clientIdOverride,
      PLUGINS_SCOPE_REGISTERED: !1,
      PROJECTS_SCOPES_REGISTERED: !1,
      HYBRID_SETTINGS_SCOPE_REGISTERED: !1,
    };
  return t;
}
/**
 * 从 CLAUDE_CODE_OAUTH_SCOPES 环境变量读取空白分隔的 OAuth scope 列表，未设置返回 undefined。
 */
//@ chunk-aepeg2w5.js:547770-547873 placement
function oauthScopesFromEnv() {
  let e = env.CLAUDE_CODE_OAUTH_SCOPES?.split(/\s+/).filter(Boolean);
  return e?.length ? e : void 0;
}
//@ chunk-aepeg2w5.js:547873-547939 placement
var I1 = ["user:inference", "user:ccr_inference", "user:file_upload"];

export {
  getOauthConfig,
  oauthScopesFromEnv,
  I1,
  firstPartyRefreshScopes,
  isClaudeAiScopeSet,
  CLAUDE_AI_PROFILE_SCOPE,
  OAUTH_BETA_HEADER,
  MCP_CLIENT_METADATA_URL,
  ALLOWED_OAUTH_BASE_URLS,
  SETUP_TOKEN_DEFAULT_EXPIRY_DAYS,
  LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
  fileSuffixForOauthConfig,
  CLAUDE_AI_INFERENCE_SCOPE,
  OAUTH_GLOBAL_FILE_SUFFIXES,
  CLAUDE_AI_SESSIONS_SCOPE,
  CLOUD_SESSIONS_OAUTH_SCOPES,
  DESIGN_OAUTH_SCOPES,
  allOAuthScopes,
  claudeAiLoginScopes,
  CLAUDE_AI_PLUGINS_SCOPE,
  isStagingOauthConfig,
  builtInOauthConfig,
  preservableScopesFrom,
  CLAUDE_AI_PROJECTS_READ_SCOPE,
  CLAUDE_AI_PROJECTS_WRITE_SCOPE,
};
