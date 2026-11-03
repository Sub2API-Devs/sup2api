/**
 * utils/anthropicProfile.ts
 *
 * 2.1.316 新增：Anthropic 账户资料读取与缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tv8z1ygb.js (19)
 * attribution: placement 19
 */
import { join } from "path";
import { mkdir, unlink, readFile, writeFile } from "fs/promises";
import { CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { kt, o } from "../../vendor/zod/v4/classic/schemas.js";
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
import { Lns, resetWIFCredentialState } from "../services/oauth/wifCredentials.js";
import { Sbi, gAn } from "../../vendor/@anthropic-ai/sdk/core/credentials.mjs";
import { v8e } from "../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { logForDebugging } from "./debug.js";
import { jsonParse } from "./slowOperations.js";

/**
 * Anthropic Console 配置档登录的常量：OAuth client_id、所需 scope、created_by 标记、配置/凭据文件的 zod schema，以及各拒绝原因是否可以回退到普通登录（I）。
 */
//@ chunk-tv8z1ygb.js:703-1257 placement
var CONSOLE_PROFILE_CLIENT_ID = "41077d10-94b8-4194-be48-d251e9eb21b4",
  PROFILE_LOGIN_SCOPES = [CLAUDE_AI_PROFILE_SCOPE, CLAUDE_AI_INFERENCE_SCOPE],
  CREATED_BY_CLAUDE_CODE = { created_by: "claude-code" },
  profileConfigSchema = DoctorLazy(() =>
    kt({
      created_by: o().optional(),
      base_url: o().optional(),
      authentication: kt({ type: o(), client_id: o().optional(), credentials_path: o().optional() }),
    }),
  ),
  profileCredentialsSchema = DoctorLazy(() => kt({ created_by: o().optional() })),
  PROFILE_REFUSAL_FALLS_BACK = {
    no_config_dir: !0,
    invalid_profile_name: !0,
    foreign_profile: !0,
    custom_credentials_path: !0,
    api_key_env_nondispatching: !0,
    wif_env_quad: !1,
    third_party_provider: !1,
    api_key_env: !1,
    env_credential_shadow: !1,
    other_deployment_profile: !1,
    federation_profile: !1,
    unreadable_profile: !1,
  };
//@ chunk-tv8z1ygb.js:1257-1297 placement
function N(e) {
  return Object.hasOwn(PROFILE_REFUSAL_FALLS_BACK, e);
}
/**
 * 若错误是带 errorClass 的配置档登录拒绝，返回该原因是否允许退回普通登录（查 I 表），否则 null。
 */
//@ chunk-tv8z1ygb.js:1297-1410 placement
function profileRefusalFallsBack(e) {
  if (
    !(e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
    e.errorClass === void 0 ||
    !N(e.errorClass)
  )
    return null;
  return PROFILE_REFUSAL_FALLS_BACK[e.errorClass];
}
/**
 * 不使用 Anthropic 配置 profile 的原因说明：无配置目录、profile 名无效、profile 属于其他工具、凭证路径自定义、设置了 ANTHROPIC_API_KEY。
 */
//@ chunk-tv8z1ygb.js:1410-1763 placement
var PROFILE_REFUSAL_NOTES = {
  no_config_dir: "no Anthropic config directory was found",
  invalid_profile_name: "the configured profile name isn't valid",
  foreign_profile: "the profile on this machine belongs to another tool",
  custom_credentials_path: "the existing profile keeps its sign-in somewhere custom",
  api_key_env_nondispatching: "ANTHROPIC_API_KEY is set in this environment",
};
/**
 * 从 profile 错误中取对应的拒绝说明（未知错误类别返回 null）。
 */
//@ chunk-tv8z1ygb.js:1763-1876 placement
function profileRefusalNote(e) {
  if (
    !(e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) ||
    e.errorClass === void 0 ||
    !L(e.errorClass)
  )
    return null;
  return PROFILE_REFUSAL_NOTES[e.errorClass];
}
//@ chunk-tv8z1ygb.js:1876-1916 placement
function L(e) {
  return Object.hasOwn(PROFILE_REFUSAL_NOTES, e);
}
/**
 * 确定 Console 配置档登录要写入的目标：拒绝 WIF 环境变量、第三方提供方、ANTHROPIC_API_KEY 或其他凭据遮蔽、找不到配置目录的情况；
 * 读取现有配置档，若属于其他工具、自定义凭据路径或其他部署则拒绝。返回 {profile, configDir, isNewProfile}。均抛带 errorClass 的 TelemetrySafeError。
 */
//@ chunk-tv8z1ygb.js:1916-5279 placement
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
  let e = getAPIProvider();
  if (e !== "firstParty")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `This session uses ${THIRD_PARTY_PROVIDER_LABELS[e]}, which does not use Anthropic Console sign-in.`,
      "This session uses a third-party provider, which does not use Anthropic Console sign-in.",
      "third_party_provider",
    );
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (ANTHROPIC_API_KEY) {
    let l = await getAnthropicApiKeyWithSourceAsyncSafe({ skipRetrievingKeyFromApiKeyHelper: !0 });
    if (l.source === "ANTHROPIC_API_KEY" && l.key === ANTHROPIC_API_KEY)
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
  let r = resolveConfigDir();
  if (r === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Cannot locate the Anthropic config directory. Set ANTHROPIC_CONFIG_DIR (or HOME) and try again.",
      "Console profile login refused: no config directory",
      "no_config_dir",
    );
  let a = resolveProfileName(r),
    s = await readProfileConfig(join(r, "configs", `${a}.json`));
  if (s !== null) {
    if (s.base_url && !isFirstPartyAnthropicHost(s.base_url))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This profile is bound to a different Anthropic deployment, so Claude Code will not replace it here. Sign out of it with the tool that created it, then try again.",
        "Console profile login refused: profile bound to another deployment",
        "other_deployment_profile",
      );
    if (s.authentication.type === "oidc_federation")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This machine is set up for workload identity federation, which signs in on its own. If you need a different sign-in, ask whoever configured it.",
        "Console profile login refused: federation profile",
        "federation_profile",
      );
    if (s.authentication.type !== "user_oauth")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Claude Code cannot read the existing sign-in on this machine, so it will not overwrite it. Check the permissions on your Anthropic config directory, then try again.",
        "Console profile login refused: unreadable or unrecognized profile config",
        "unreadable_profile",
      );
    if (s.authentication.client_id !== CONSOLE_PROFILE_CLIENT_ID)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "This machine already has a sign-in from another tool that Claude Code cannot replace. Sign out with that tool, then try again.",
        "Console profile login refused: profile is not a same-client login",
        "foreign_profile",
      );
    if (s.authentication.credentials_path)
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
  return { profile: a, configDir: r, isNewProfile: s === null };
}
/**
 * 在配置档凭据文件锁内写入 Console 登录结果（先建 credentials 目录）。
 */
//@ chunk-tv8z1ygb.js:5279-5427 placement
async function saveConsoleProfileLogin(e) {
  let n = await resolveConsoleProfileTarget();
  return (
    await mkdir(join(n.configDir, "credentials"), { recursive: !0, mode: 448 }),
    Lns(u(n.configDir, n.profile), () => writeConsoleProfileFiles(e))
  );
}
/**
 * 写入配置档：configs/<profile>.json（组织、工作区、user_oauth 认证）与凭据文件（access/refresh token、过期时间、scope、组织/账户信息），若无 active_config 则设为当前。
 */
//@ chunk-tv8z1ygb.js:5427-6275 placement
async function writeConsoleProfileFiles(login) {
  let {
      profile: profile,
      configDir: configDir,
      isNewProfile: isNewProfile,
    } = await resolveConsoleProfileTarget(),
    s = join(configDir, "configs", `${profile}.json`);
  await mkdir(join(configDir, "configs"), { recursive: !0, mode: 448 });
  let l = {
    version: Sbi,
    organization_id: login.organizationUuid,
    workspace_id: login.workspaceId,
    authentication: { type: "user_oauth", client_id: CONSOLE_PROFILE_CLIENT_ID },
    ...CREATED_BY_CLAUDE_CODE,
  };
  await v8e(s, l);
  let c = isNewProfile,
    _ = {
      version: gAn,
      type: "oauth_token",
      access_token: login.accessToken,
      refresh_token: login.refreshToken,
      expires_at: Math.floor(login.expiresAtMs / 1000),
      scope: login.scopes.join(" "),
      organization_uuid: login.organizationUuid,
      organization_name: login.organizationName,
      account_email: login.accountEmail,
    };
  await v8e(u(configDir, profile), {
    ..._,
    workspace_id: login.workspaceId,
    workspace_name: login.workspaceName,
    ...CREATED_BY_CLAUDE_CODE,
  });
  let A = await tryCreateExclusive(
    join(configDir, "active_config"),
    profile +
      `
`,
  );
  return (
    logForDebugging(
      `Console profile login: wrote credentials for profile ${profile}${c ? " (new profile)" : ""}${A ? " (set active)" : ""}`,
    ),
    resetWIFCredentialState(),
    { profile: profile, configDir: configDir }
  );
}
/**
 * 退出登录时移除本工具创建的配置档凭据（在文件锁内），可选先吊销 refresh token；不存在或不是本工具创建的返回 {removed:false}。
 */
//@ chunk-tv8z1ygb.js:6275-6696 placement
async function removeConsoleProfileCredentials({ revoke: e } = {}) {
  try {
    let n = resolveConfigDir();
    if (n === null) return { removed: !1 };
    let r;
    try {
      r = resolveProfileName(n);
    } catch {
      return { removed: !1 };
    }
    let a = await readProfileConfig(join(n, "configs", `${r}.json`));
    if (a === null || !isClaudeCodeProfile(a)) return { removed: !1 };
    if ((await readProfileCredentials(u(n, r))) === null) return { removed: !1 };
    return await Lns(u(n, r), () => removeProfileCredentialsLocked(e));
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return { removed: !1 };
    return (
      logForDebugging(`Logout: profile credential removal failed: ${errorMessage(error)}`, {
        level: "error",
      }),
      { removed: !1 }
    );
  }
}
/**
 * x1s 的锁内实现：核对配置档由 Claude Code 创建，读取 refresh token 交给吊销回调，再删除凭据文件并重置 WIF 状态。
 */
//@ chunk-tv8z1ygb.js:6696-7271 placement
async function removeProfileCredentialsLocked(revoke) {
  let n = resolveConfigDir();
  if (n === null) return { removed: !1 };
  let r;
  try {
    r = resolveProfileName(n);
  } catch {
    return { removed: !1 };
  }
  let a = await readProfileConfig(join(n, "configs", `${r}.json`));
  if (a === null || !isClaudeCodeProfile(a)) return { removed: !1 };
  let s = u(n, r),
    l = await readProfileCredentials(s);
  if (l === null) return { removed: !1 };
  let c = { refreshToken: l.refreshToken, clientId: CONSOLE_PROFILE_CLIENT_ID };
  if (revoke && c.refreshToken) await revoke({ refreshToken: c.refreshToken, clientId: c.clientId });
  try {
    await unlink(s);
  } catch (error) {
    return (
      logForDebugging(`Logout: could not remove profile credentials: ${errorMessage(error)}`, {
        level: "error",
      }),
      { removed: !1, ...c }
    );
  }
  return (
    logForDebugging(`Logout: removed credentials for profile ${r}`),
    resetWIFCredentialState(),
    { removed: !0, ...c }
  );
}
//@ chunk-tv8z1ygb.js:7271-7511 placement
function resolveProfileName(e) {
  let n = env.ANTHROPIC_PROFILE || resolveImplicitProfileName(e);
  if (!isLoadableProfileName(n))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ANTHROPIC_PROFILE "${n}" is not a valid profile name (letters, digits, '_', '.', '-')`,
      "ANTHROPIC_PROFILE is not a valid profile name",
      "invalid_profile_name",
    );
  return n;
}
//@ chunk-tv8z1ygb.js:7511-7565 placement
function u(e, n) {
  return join(e, "credentials", `${n}.json`);
}
/**
 * 读取配置档 JSON：不存在返回 null，不可读或格式不符视为 unreadable。
 */
//@ chunk-tv8z1ygb.js:7565-7933 placement
async function readProfileConfig(e) {
  let n;
  try {
    n = await readFile(e, "utf-8");
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    if (isFsInaccessible(error)) return { authentication: { type: "unreadable" } };
    throw error;
  }
  let r;
  try {
    r = jsonParse(n);
  } catch (error) {
    return (
      logForDebugging(`Profile config is not JSON, treating as foreign: ${errorMessage(error)}`),
      { authentication: { type: "unreadable" } }
    );
  }
  let safeParse = profileConfigSchema().safeParse(r);
  return safeParse.success ? safeParse.data : { authentication: { type: "unreadable" } };
}
//@ chunk-tv8z1ygb.js:7933-8054 placement
function isClaudeCodeProfile(e) {
  return (
    e.created_by === CREATED_BY_CLAUDE_CODE.created_by &&
    e.authentication.type === "user_oauth" &&
    e.authentication.client_id === CONSOLE_PROFILE_CLIENT_ID
  );
}
//@ chunk-tv8z1ygb.js:8054-8339 placement
async function readProfileCredentials(e) {
  let n;
  try {
    n = await readFile(e, "utf-8");
  } catch (error) {
    if (isFsInaccessible(error)) return null;
    throw error;
  }
  let r;
  try {
    r = jsonParse(n);
  } catch {
    return null;
  }
  let safeParse = profileCredentialsSchema().safeParse(r);
  if (!safeParse.success || safeParse.data.created_by !== CREATED_BY_CLAUDE_CODE.created_by) return null;
  let refresh_token = safeParse.data.refresh_token;
  return { refreshToken: typeof refresh_token === "string" ? refresh_token : void 0 };
}
/**
 * 判断给定刷新令牌是否就是 profile 中存储的那个（读取失败时视为是）。
 */
//@ chunk-tv8z1ygb.js:8339-8474 placement
async function isStoredRefreshToken(e) {
  let n = resolveConfigDir();
  if (n === null) return !1;
  try {
    let r = await readProfileCredentials(u(n, resolveProfileName(n)));
    return r !== null && r.refreshToken === e;
  } catch {
    return !0;
  }
}
//@ chunk-tv8z1ygb.js:8474-8504 placement
async function I1s() {
  return !1;
}
//@ chunk-tv8z1ygb.js:8504-8620 placement = tryCreateExclusive (1)
async function tryCreateExclusive(e, n) {
  try {
    return (await writeFile(e, n, { flag: "wx", mode: 420 }), !0);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return !1;
    throw error;
  }
}

export {
  removeConsoleProfileCredentials,
  resolveConsoleProfileTarget,
  profileRefusalFallsBack,
  profileRefusalNote,
  CONSOLE_PROFILE_CLIENT_ID,
  PROFILE_LOGIN_SCOPES,
  saveConsoleProfileLogin,
  isStoredRefreshToken,
  I1s,
};
