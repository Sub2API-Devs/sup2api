/**
 * utils/anthropicProfile.ts
 *
 * 2.1.316 新增：Anthropic 账户资料读取与缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hf1ad2x6.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { mkdir, unlink, readFile, writeFile } from "fs/promises";
import { CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { looseObject, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
  isFsInaccessible,
} from "./errors.js";
import { isLoadableProfileName, resolveConfigDir, resolveImplicitProfileName } from "./wifProfile.js";
import { env } from "./env.js";
import { getAPIProvider, THIRD_PARTY_PROVIDER_LABELS, isFirstPartyAnthropicHost } from "./model/providers.js";
import { getAnthropicApiKeyWithSourceAsyncSafe, isProfileAuthShadowed } from "./auth.js";
import { withWifLockForDir, resetWIFCredentialState } from "../services/oauth/wifCredentials.js";
import {
  CONFIG_FILE_VERSION,
  CREDENTIALS_FILE_VERSION,
} from "../../vendor/@anthropic-ai/sdk/core/credentials.mjs";
import { writeCredentialsFileAtomic } from "../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { logForDebugging } from "./debug.js";
import { jsonParse } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hf1ad2x6.js:703-1257 placement
/**
 * Anthropic Console 配置档登录的常量：OAuth client_id、所需 scope、created_by 标记、配置/凭据文件的 zod schema，以及各拒绝原因是否可以回退到普通登录（I）。
 */
var CONSOLE_PROFILE_CLIENT_ID; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PROFILE_LOGIN_SCOPES;
var CREATED_BY_CLAUDE_CODE;
var profileConfigSchema;
var profileCredentialsSchema;
var PROFILE_REFUSAL_FALLS_BACK;
deferInit("chunk-hf1ad2x6.js:703", () => {
  CONSOLE_PROFILE_CLIENT_ID = "41077d10-94b8-4194-be48-d251e9eb21b4";
  PROFILE_LOGIN_SCOPES = [CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_INFERENCE_SCOPE];
  CREATED_BY_CLAUDE_CODE = {
    created_by: "claude-code",
  };
  profileConfigSchema = DoctorLazy(() =>
    looseObject({
      created_by: stringSchema().optional(),
      base_url: stringSchema().optional(),
      authentication: looseObject({
        type: stringSchema(),
        client_id: stringSchema().optional(),
        credentials_path: stringSchema().optional(),
      }),
    }),
  );
  profileCredentialsSchema = DoctorLazy(() =>
    looseObject({
      created_by: stringSchema().optional(),
    }),
  );
  PROFILE_REFUSAL_FALLS_BACK = {
    no_config_dir: true,
    invalid_profile_name: true,
    foreign_profile: true,
    custom_credentials_path: true,
    api_key_env_nondispatching: true,
    wif_env_quad: false,
    third_party_provider: false,
    api_key_env: false,
    env_credential_shadow: false,
    other_deployment_profile: false,
    federation_profile: false,
    unreadable_profile: false,
  };
});
//@ chunk-hf1ad2x6.js:1257-1297 placement
/**
 * 判断该配置档拒绝原因是否允许退回普通登录。
 */
function isProfileRefusalFallsBack(errorClass) {
  return Object.hasOwn(PROFILE_REFUSAL_FALLS_BACK, errorClass);
}
//@ chunk-hf1ad2x6.js:1297-1410 placement
/**
 * 若错误是带 errorClass 的配置档登录拒绝，返回该原因是否允许退回普通登录（查 I 表），否则 null。
 */
function profileRefusalFallsBack(error) {
  if (
    !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
    error.errorClass === undefined ||
    !isProfileRefusalFallsBack(error.errorClass)
  )
    return null;
  return PROFILE_REFUSAL_FALLS_BACK[error.errorClass];
}
//@ chunk-hf1ad2x6.js:1410-1763 placement
/**
 * 不使用 Anthropic 配置 profile 的原因说明：无配置目录、profile 名无效、profile 属于其他工具、凭证路径自定义、设置了 ANTHROPIC_API_KEY。
 */
var PROFILE_REFUSAL_NOTES = {
  no_config_dir: "no Anthropic config directory was found",
  invalid_profile_name: "the configured profile name isn't valid",
  foreign_profile: "the profile on this machine belongs to another tool",
  custom_credentials_path: "the existing profile keeps its sign-in somewhere custom",
  api_key_env_nondispatching: "ANTHROPIC_API_KEY is set in this environment",
};
//@ chunk-hf1ad2x6.js:1763-1876 placement
/**
 * 从 profile 错误中取对应的拒绝说明（未知错误类别返回 null）。
 */
function profileRefusalNote(error) {
  if (
    !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
    error.errorClass === undefined ||
    !hasProfileRefusalNote(error.errorClass)
  )
    return null;
  return PROFILE_REFUSAL_NOTES[error.errorClass];
}
//@ chunk-hf1ad2x6.js:1876-1916 placement
/**
 * 判断该配置档拒绝原因是否有对应说明。
 */
function hasProfileRefusalNote(errorClass) {
  return Object.hasOwn(PROFILE_REFUSAL_NOTES, errorClass);
}
//@ chunk-hf1ad2x6.js:1916-5279 placement
/**
 * 确定 Console 配置档登录要写入的目标：拒绝 WIF 环境变量、第三方提供方、ANTHROPIC_API_KEY 或其他凭据遮蔽、找不到配置目录的情况；
 * 读取现有配置档，若属于其他工具、自定义凭据路径或其他部署则拒绝。返回 {profile, configDir, isNewProfile}。均抛带 errorClass 的 TelemetrySafeError。
 */
async function resolveConsoleProfileTarget() {
  if (
    !isLoadableProfileName(env.ANTHROPIC_PROFILE) &&
    env.ANTHROPIC_FEDERATION_RULE_ID &&
    env.ANTHROPIC_ORGANIZATION_ID
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Workload identity federation is configured in this environment (ANTHROPIC_FEDERATION_RULE_ID and ANTHROPIC_ORGANIZATION_ID), and it takes precedence over the default profile. Set ANTHROPIC_PROFILE to a profile name to sign in with a profile that outranks it.",
      "Console profile login refused: env-quad federation outranks the implicit profile",
      "wif_env_quad",
    );
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `This session uses ${THIRD_PARTY_PROVIDER_LABELS[apiProvider]}, which does not use Anthropic Console sign-in.`,
      "This session uses a third-party provider, which does not use Anthropic Console sign-in.",
      "third_party_provider",
    );
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (ANTHROPIC_API_KEY) {
    let anthropicApiKeyWithSourceAsync = await getAnthropicApiKeyWithSourceAsyncSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    if (
      anthropicApiKeyWithSourceAsync.source === "ANTHROPIC_API_KEY" &&
      anthropicApiKeyWithSourceAsync.key === ANTHROPIC_API_KEY
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ANTHROPIC_API_KEY is set in this environment and takes precedence over a profile, so a profile sign-in would not be used. Unset it to sign in this way.",
        "Console profile login refused: env credential shadows the profile",
        "api_key_env",
      );
  }
  if (isProfileAuthShadowed())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Something in this environment \u2014 an API key helper, an injected token, or a third-party provider setting \u2014 takes precedence over a profile sign-in, so it would not be used here.",
      "Console profile login refused: env credential shadows the profile",
      "env_credential_shadow",
    );
  let configDir = resolveConfigDir();
  if (configDir === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Cannot locate the Anthropic config directory. Set ANTHROPIC_CONFIG_DIR (or HOME) and try again.",
      "Console profile login refused: no config directory",
      "no_config_dir",
    );
  let profileName = resolveProfileName(configDir);
  let profileConfig = await readProfileConfig(join(configDir, "configs", `${profileName}.json`));
  if (profileConfig !== null) {
    if (profileConfig.base_url && !isFirstPartyAnthropicHost(profileConfig.base_url))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This profile is bound to a different Anthropic deployment, so Claude Code will not replace it here. Sign out of it with the tool that created it, then try again.",
        "Console profile login refused: profile bound to another deployment",
        "other_deployment_profile",
      );
    if (profileConfig.authentication.type === "oidc_federation")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This machine is set up for workload identity federation, which signs in on its own. If you need a different sign-in, ask whoever configured it.",
        "Console profile login refused: federation profile",
        "federation_profile",
      );
    if (profileConfig.authentication.type !== "user_oauth")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Claude Code cannot read the existing sign-in on this machine, so it will not overwrite it. Check the permissions on your Anthropic config directory, then try again.",
        "Console profile login refused: unreadable or unrecognized profile config",
        "unreadable_profile",
      );
    if (profileConfig.authentication.client_id !== CONSOLE_PROFILE_CLIENT_ID)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This machine already has a sign-in from another tool that Claude Code cannot replace. Sign out with that tool, then try again.",
        "Console profile login refused: profile is not a same-client login",
        "foreign_profile",
      );
    if (profileConfig.authentication.credentials_path)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This profile keeps its sign-in somewhere custom, so Claude Code cannot replace it. Sign out of it with the tool that created it, then try again.",
        "Console profile login refused: custom credentials_path",
        "custom_credentials_path",
      );
  }
  if (ANTHROPIC_API_KEY)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "ANTHROPIC_API_KEY is set in this environment. Unset it to sign in without an API key.",
      "Console profile login refused: non-dispatching env API key present",
      "api_key_env_nondispatching",
    );
  return {
    profile: profileName,
    configDir,
    isNewProfile: profileConfig === null,
  };
}
//@ chunk-hf1ad2x6.js:5279-5427 placement
/**
 * 在配置档凭据文件锁内写入 Console 登录结果（先建 credentials 目录）。
 */
async function saveConsoleProfileLogin(login) {
  let consoleProfileTarget = await resolveConsoleProfileTarget();
  await mkdir(join(consoleProfileTarget.configDir, "credentials"), {
    recursive: true,
    mode: 448,
  });
  return withWifLockForDir(
    profileCredentialsPath(consoleProfileTarget.configDir, consoleProfileTarget.profile),
    () => writeConsoleProfileFiles(login),
  );
}
//@ chunk-hf1ad2x6.js:5427-6275 placement
/**
 * 写入配置档：configs/<profile>.json（组织、工作区、user_oauth 认证）与凭据文件（access/refresh token、过期时间、scope、组织/账户信息），若无 active_config 则设为当前。
 */
async function writeConsoleProfileFiles(login) {
  let { profile, configDir, isNewProfile } = await resolveConsoleProfileTarget();
  let profileConfigPath = join(configDir, "configs", `${profile}.json`);
  await mkdir(join(configDir, "configs"), {
    recursive: true,
    mode: 448,
  });
  let profileConfig = {
    version: CONFIG_FILE_VERSION,
    organization_id: login.organizationUuid,
    workspace_id: login.workspaceId,
    authentication: {
      type: "user_oauth",
      client_id: CONSOLE_PROFILE_CLIENT_ID,
    },
    ...CREATED_BY_CLAUDE_CODE,
  };
  await writeCredentialsFileAtomic(profileConfigPath, profileConfig);
  let isNewProfile_2 = isNewProfile;
  let credentials = {
    version: CREDENTIALS_FILE_VERSION,
    type: "oauth_token",
    access_token: login.accessToken,
    refresh_token: login.refreshToken,
    expires_at: Math.floor(login.expiresAtMs / 1000),
    scope: login.scopes.join(" "),
    organization_uuid: login.organizationUuid,
    organization_name: login.organizationName,
    account_email: login.accountEmail,
  };
  await writeCredentialsFileAtomic(profileCredentialsPath(configDir, profile), {
    ...credentials,
    workspace_id: login.workspaceId,
    workspace_name: login.workspaceName,
    ...CREATED_BY_CLAUDE_CODE,
  });
  let setActive = await tryCreateExclusive(
    join(configDir, "active_config"),
    profile +
      `
`,
  );
  logForDebugging(
    `Console profile login: wrote credentials for profile ${profile}${isNewProfile_2 ? " (new profile)" : ""}${setActive ? " (set active)" : ""}`,
  );
  resetWIFCredentialState();
  return {
    profile,
    configDir,
  };
}
//@ chunk-hf1ad2x6.js:6275-6696 placement
/**
 * 退出登录时移除本工具创建的配置档凭据（在文件锁内），可选先吊销 refresh token；不存在或不是本工具创建的返回 {removed:false}。
 */
async function removeConsoleProfileCredentials({ revoke } = {}) {
  try {
    let configDir = resolveConfigDir();
    if (configDir === null)
      return {
        removed: false,
      };
    let profileName;
    try {
      profileName = resolveProfileName(configDir);
    } catch {
      return {
        removed: false,
      };
    }
    let profileConfig = await readProfileConfig(join(configDir, "configs", `${profileName}.json`));
    if (profileConfig === null || !isClaudeCodeProfile(profileConfig))
      return {
        removed: false,
      };
    if ((await readProfileCredentials(profileCredentialsPath(configDir, profileName))) === null)
      return {
        removed: false,
      };
    return await withWifLockForDir(profileCredentialsPath(configDir, profileName), () =>
      removeProfileCredentialsLocked(revoke),
    );
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        removed: false,
      };
    logForDebugging(`Logout: profile credential removal failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      removed: false,
    };
  }
}
//@ chunk-hf1ad2x6.js:6696-7271 placement
/**
 * x1s 的锁内实现：核对配置档由 Claude Code 创建，读取 refresh token 交给吊销回调，再删除凭据文件并重置 WIF 状态。
 */
async function removeProfileCredentialsLocked(revoke) {
  let configDir = resolveConfigDir();
  if (configDir === null)
    return {
      removed: false,
    };
  let profileName;
  try {
    profileName = resolveProfileName(configDir);
  } catch {
    return {
      removed: false,
    };
  }
  let profileConfig = await readProfileConfig(join(configDir, "configs", `${profileName}.json`));
  if (profileConfig === null || !isClaudeCodeProfile(profileConfig))
    return {
      removed: false,
    };
  let credentialsPath = profileCredentialsPath(configDir, profileName);
  let profileCredentials = await readProfileCredentials(credentialsPath);
  if (profileCredentials === null)
    return {
      removed: false,
    };
  let revokeResult = {
    refreshToken: profileCredentials.refreshToken,
    clientId: CONSOLE_PROFILE_CLIENT_ID,
  };
  if (revoke && revokeResult.refreshToken)
    await revoke({
      refreshToken: revokeResult.refreshToken,
      clientId: revokeResult.clientId,
    });
  try {
    await unlink(credentialsPath);
  } catch (error) {
    logForDebugging(`Logout: could not remove profile credentials: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      removed: false,
      ...revokeResult,
    };
  }
  logForDebugging(`Logout: removed credentials for profile ${profileName}`);
  resetWIFCredentialState();
  return {
    removed: true,
    ...revokeResult,
  };
}
//@ chunk-hf1ad2x6.js:7271-7511 placement
function resolveProfileName(configDir) {
  let profileName = env.ANTHROPIC_PROFILE || resolveImplicitProfileName(configDir);
  if (!isLoadableProfileName(profileName))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ANTHROPIC_PROFILE "${profileName}" is not a valid profile name (letters, digits, '_', '.', '-')`,
      "ANTHROPIC_PROFILE is not a valid profile name",
      "invalid_profile_name",
    );
  return profileName;
}
//@ chunk-hf1ad2x6.js:7511-7565 placement
/**
 * 配置档凭据文件的路径。
 */
function profileCredentialsPath(configDir, profileName) {
  return join(configDir, "credentials", `${profileName}.json`);
}
//@ chunk-hf1ad2x6.js:7565-7933 placement
/**
 * 读取配置档 JSON：不存在返回 null，不可读或格式不符视为 unreadable。
 */
async function readProfileConfig(configPath) {
  let configText;
  try {
    configText = await readFile(configPath, "utf-8");
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    if (isFsInaccessible(error))
      return {
        authentication: {
          type: "unreadable",
        },
      };
    throw error;
  }
  let parsed;
  try {
    parsed = jsonParse(configText);
  } catch (error) {
    logForDebugging(`Profile config is not JSON, treating as foreign: ${errorMessage(error)}`);
    return {
      authentication: {
        type: "unreadable",
      },
    };
  }
  let parseResult = profileConfigSchema().safeParse(parsed);
  return parseResult.success
    ? parseResult.data
    : {
        authentication: {
          type: "unreadable",
        },
      };
}
//@ chunk-hf1ad2x6.js:7933-8054 placement
function isClaudeCodeProfile(profileConfig) {
  return (
    profileConfig.created_by === CREATED_BY_CLAUDE_CODE.created_by &&
    profileConfig.authentication.type === "user_oauth" &&
    profileConfig.authentication.client_id === CONSOLE_PROFILE_CLIENT_ID
  );
}
//@ chunk-hf1ad2x6.js:8054-8339 placement
async function readProfileCredentials(credentialsPath) {
  let credentialsText;
  try {
    credentialsText = await readFile(credentialsPath, "utf-8");
  } catch (error) {
    if (isFsInaccessible(error)) return null;
    throw error;
  }
  let parsed;
  try {
    parsed = jsonParse(credentialsText);
  } catch {
    return null;
  }
  let parseResult = profileCredentialsSchema().safeParse(parsed);
  if (!parseResult.success || parseResult.data.created_by !== CREATED_BY_CLAUDE_CODE.created_by) return null;
  let refreshToken = parseResult.data.refresh_token;
  return {
    refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
  };
}
//@ chunk-hf1ad2x6.js:8339-8474 placement
/**
 * 判断给定刷新令牌是否就是 profile 中存储的那个（读取失败时视为是）。
 */
async function isStoredRefreshToken(refreshToken) {
  let configDir = resolveConfigDir();
  if (configDir === null) return false;
  try {
    let profileCredentials = await readProfileCredentials(
      profileCredentialsPath(configDir, resolveProfileName(configDir)),
    );
    return profileCredentials !== null && profileCredentials.refreshToken === refreshToken;
  } catch {
    return true;
  }
}
//@ chunk-hf1ad2x6.js:8474-8504 placement
/**
 * 恒返回 false 的能力判断。
 */
async function alwaysFalseProfileCheck() {
  return false;
}
//@ chunk-hf1ad2x6.js:8504-8620 placement (2.1.88 match: tryCreateExclusive, 1)
async function tryCreateExclusive(filePath, data) {
  try {
    await writeFile(filePath, data, {
      flag: "wx",
      mode: 420,
    });
    return true;
  } catch (e) {
    if (getErrnoCode(e) === "EEXIST") return false;
    throw e;
  }
}
export {
  alwaysFalseProfileCheck,
  removeConsoleProfileCredentials,
  resolveConsoleProfileTarget,
  profileRefusalFallsBack,
  profileRefusalNote,
  CONSOLE_PROFILE_CLIENT_ID,
  PROFILE_LOGIN_SCOPES,
  saveConsoleProfileLogin,
  isStoredRefreshToken,
};
