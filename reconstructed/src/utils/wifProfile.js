/**
 * utils/wifProfile.ts
 *
 * 2.1.316 新增：工作负载身份联邦（WIF）profile：ANTHROPIC_CONFIG_DIR 下的 profile 选择、凭据与账号信息、状态行、凭据存储的沙箱拒读路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-640x3zn9.js (44)
 * attribution: placement 44
 */
import { join, resolve, sep, isAbsolute, parse, relative, dirname, basename } from "path";
import { realpathSync, lstatSync, readFileSync } from "fs";
import { WorkloadIdentityError } from "../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, isFsInaccessible, isEISDIR, isFsInaccessibleCode } from "./errors.js";
import { uniq } from "./collections.js";
import { getFsImplementation } from "./fsOperations.js";
import { PathSpace } from "./resultError.js";
import { storageErrorCode } from "./storage/storageErrors.js";

//@ chunk-640x3zn9.js:6485-6608 placement
function isWIFUserOAuthDeadError(e) {
  return (
    e instanceof WorkloadIdentityError &&
    e.statusCode === null &&
    e.message.includes("has expired and no refresh is available")
  );
}
//@ chunk-640x3zn9.js:6608-6676 placement
var WIF_ENV_QUAD_VARS = ["ANTHROPIC_FEDERATION_RULE_ID", "ANTHROPIC_ORGANIZATION_ID"];
//@ chunk-640x3zn9.js:6676-6895 placement
class WifProfileCache {
  precedenceSource = {
    filled: false,
  };
  authType = {
    filled: false,
  };
  profileBaseUrl = {
    filled: false,
  };
  accountInfo = {
    filled: false,
  };
  federationIdentity = {
    filled: false,
  };
  profileStoreDenyPaths = {
    filled: false,
  };
  settingsBearerRejected = false;
  primedFiles = undefined;
}
//@ chunk-640x3zn9.js:6895-6918 placement
var wifProfileCacheByHost = new HostScoped(() => new WifProfileCache());
//@ chunk-640x3zn9.js:6918-7073 placement
function getWIFPrecedenceSource() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.precedenceSource.filled) return e.precedenceSource.value;
  let wifPrecedenceSource = computeWIFPrecedenceSource();
  e.precedenceSource = {
    filled: true,
    value: wifPrecedenceSource,
  };
  return wifPrecedenceSource;
}
//@ chunk-640x3zn9.js:7073-7353 placement
function computeWIFPrecedenceSource() {
  let configDir = resolveConfigDir();
  let n = activeProfileNameFromEnv();
  if (n) {
    if (configDir === null) return null;
    let r = profileAuthType(configDir, n);
    return r === "oidc_federation" || r === "user_oauth" ? "profile-explicit" : null;
  }
  if (hasEnvQuad()) return "env-quad";
  if (configDir !== null) {
    let r = profileAuthType(configDir, resolveImplicitProfileName(configDir));
    if (r === "oidc_federation" || r === "user_oauth") return "profile-implicit";
  }
  return null;
}
//@ chunk-640x3zn9.js:7353-7575 placement
function clearWIFPrecedenceCache() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  e.precedenceSource = {
    filled: false,
  };
  e.authType = {
    filled: false,
  };
  e.profileBaseUrl = {
    filled: false,
  };
  e.federationIdentity = {
    filled: false,
  };
  e.profileStoreDenyPaths = {
    filled: false,
  };
  e.settingsBearerRejected = false;
  clearWIFAccountInfoCache();
}
//@ chunk-640x3zn9.js:7575-7629 placement
function clearWIFAccountInfoCache() {
  wifProfileCacheByHost.of(getRootSession().host).accountInfo = {
    filled: false,
  };
}
//@ chunk-640x3zn9.js:7629-7663 placement
function isWIFActive() {
  return getWIFPrecedenceSource() !== null;
}
//@ chunk-640x3zn9.js:7663-7795 placement
function getWIFAuthType() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.authType.filled) return e.authType.value;
  let wifAuthType = computeWIFAuthType();
  e.authType = {
    filled: true,
    value: wifAuthType,
  };
  return wifAuthType;
}
//@ chunk-640x3zn9.js:7795-8069 placement
function computeWIFAuthType() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null) return null;
  if (wifPrecedenceSource === "env-quad") return "oidc_federation";
  let configDir = resolveConfigDir();
  if (configDir === null) return null;
  let r =
    wifPrecedenceSource === "profile-explicit"
      ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
      : resolveImplicitProfileName(configDir);
  let s = profileAuthType(configDir, r);
  return s === "oidc_federation" || s === "user_oauth" ? s : null;
}
//@ chunk-640x3zn9.js:8069-8139 placement
function wouldWIFProfileYieldToClaudeAILogin() {
  return getWIFPrecedenceSource() === "profile-implicit" && getWIFAuthType() === "user_oauth";
}
//@ chunk-640x3zn9.js:8139-8279 placement
function getWIFAccountInfo() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.accountInfo.filled) return e.accountInfo.value;
  let wifAccountInfo = computeWIFAccountInfo();
  e.accountInfo = {
    filled: true,
    value: wifAccountInfo,
  };
  return wifAccountInfo;
}
//@ chunk-640x3zn9.js:8279-8470 placement
function computeWIFAccountInfo() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null || wifPrecedenceSource === "env-quad") return;
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  let r =
    wifPrecedenceSource === "profile-explicit"
      ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
      : resolveImplicitProfileName(configDir);
  return readWIFAccountInfo(configDir, r);
}
//@ chunk-640x3zn9.js:8470-8730 placement
function readWIFAccountInfo(configDir, n) {
  let profileFile = readProfileFile(credentialsPathFor(configDir, n));
  if (profileFile === null) return;
  try {
    let parsed = JSON.parse(profileFile);
    return {
      organizationUuid: parsed.organization_uuid,
      organizationName: parsed.organization_name,
      accountEmail: parsed.account_email,
      workspaceId: parsed.workspace_id,
      workspaceName: parsed.workspace_name,
    };
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:8730-9258 placement
function getWIFStatusLine() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === "env-quad") {
    let trimmed = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    return `env-quad \xB7 org ${tailOfId(process.env.ANTHROPIC_ORGANIZATION_ID ?? "")} \xB7 rule ${tailOfId(process.env.ANTHROPIC_FEDERATION_RULE_ID ?? "")}${trimmed ? ` \xB7 ws ${trimmed.startsWith("wrkspc_") ? tailOfId(trimmed) : trimmed}` : ""}`;
  }
  if (wifPrecedenceSource === "profile-explicit" || wifPrecedenceSource === "profile-implicit") {
    let configDir = resolveConfigDir();
    let r =
      configDir === null
        ? "default"
        : wifPrecedenceSource === "profile-explicit"
          ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
          : resolveImplicitProfileName(configDir);
    return `credentials-file \xB7 ${getWIFAuthType() ?? "unknown"} \xB7 profile ${r}`;
  }
  return "inactive";
}
//@ chunk-640x3zn9.js:9258-9316 placement
function tailOfId(e) {
  return e.length <= 6 ? e : `\u2026${e.slice(-6)}`;
}
//@ chunk-640x3zn9.js:9316-9466 placement
function getWIFProfileBaseUrl() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.profileBaseUrl.filled) return e.profileBaseUrl.value;
  let wifProfileBaseUrl = computeWIFProfileBaseUrl();
  e.profileBaseUrl = {
    filled: true,
    value: wifProfileBaseUrl,
  };
  return wifProfileBaseUrl;
}
//@ chunk-640x3zn9.js:9466-9810 placement
/**
 * 读取当前 WIF profile 配置中的 base_url。
 */
function computeWIFProfileBaseUrl() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null || wifPrecedenceSource === "env-quad") return;
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  try {
    let r =
      wifPrecedenceSource === "profile-explicit"
        ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
        : resolveImplicitProfileName(configDir);
    let profileFile = readProfileFile(join(configDir, "configs", `${r}.json`));
    if (profileFile === null) return;
    let parsed = JSON.parse(profileFile);
    return typeof parsed.base_url === "string" && parsed.base_url.trim() ? parsed.base_url.trim() : undefined;
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:9810-9989 placement
var wifProfileConfigSchema = DoctorLazy(() =>
  u({
    organization_id: string().optional(),
    workspace_id: string().optional(),
    authentication: u({
      type: string().optional(),
      federation_rule_id: string().optional(),
    })
      .loose()
      .optional(),
  }).loose(),
);
//@ chunk-640x3zn9.js:9989-10151 placement
function getWIFFederationIdentity() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.federationIdentity.filled) return e.federationIdentity.value;
  let wifFederationIdentity = computeWIFFederationIdentity();
  e.federationIdentity = {
    filled: true,
    value: wifFederationIdentity,
  };
  return wifFederationIdentity;
}
//@ chunk-640x3zn9.js:10151-10699 placement
/**
 * 计算 WIF 联邦身份（组织 id、联邦规则 id、工作区 id）：来自环境变量四件套或当前 profile 的 oidc_federation 配置。
 */
function computeWIFFederationIdentity() {
  let source = getWIFPrecedenceSource();
  if (source === null) return;
  if (source === "env-quad")
    return federationIdentityOf({
      organizationId: env.ANTHROPIC_ORGANIZATION_ID,
      federationRuleId: env.ANTHROPIC_FEDERATION_RULE_ID,
      workspaceId: env.ANTHROPIC_WORKSPACE_ID,
    });
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  try {
    let profileFile = readProfileFile(
      join(configDir, "configs", `${resolveLiveProfileName(configDir)}.json`),
    );
    if (profileFile === null) return;
    let s = wifProfileConfigSchema().safeParse(jsonParse(profileFile));
    if (!s.success || s.data.authentication?.type !== "oidc_federation") return;
    return federationIdentityOf({
      organizationId: s.data.organization_id,
      federationRuleId: s.data.authentication.federation_rule_id,
      workspaceId: s.data.workspace_id,
    });
  } catch {
    return;
  }
}
//@ chunk-640x3zn9.js:10699-10907 placement
function federationIdentityOf({ organizationId, federationRuleId, workspaceId }) {
  let trimmed = organizationId?.trim();
  let trimmed_2 = federationRuleId?.trim();
  if (!trimmed || !trimmed_2) return;
  let a = workspaceId?.trim() || undefined;
  return {
    organizationId: trimmed,
    federationRuleId: trimmed_2,
    ...(a !== undefined && {
      workspaceId: a,
    }),
  };
}
//@ chunk-640x3zn9.js:10907-10967 placement
function isWIFSettingsBearerRejected() {
  return wifProfileCacheByHost.of(getRootSession().host).settingsBearerRejected;
}
//@ chunk-640x3zn9.js:10967-11023 placement
function setWIFSettingsBearerRejected(settingsBearerRejected) {
  wifProfileCacheByHost.of(getRootSession().host).settingsBearerRejected = settingsBearerRejected;
}
//@ chunk-640x3zn9.js:11023-11077 placement
var PROFILE_STORE_DENY_DIRS = ["configs", "credentials"];
var PROFILE_STORE_DENY_FILES = ["active_config"];
//@ chunk-640x3zn9.js:11077-11271 placement
function getWIFProfileStoreDenyPaths() {
  let e = wifProfileCacheByHost.of(getRootSession().host);
  if (e.profileStoreDenyPaths.filled) return e.profileStoreDenyPaths.value;
  let { value: n, complete } = computeProfileStoreDenyPaths();
  if (complete)
    e.profileStoreDenyPaths = {
      filled: true,
      value: n,
    };
  return n;
}
//@ chunk-640x3zn9.js:11271-11810 placement
/**
 * 计算沙箱应拒读的 WIF profile 存储路径：配置目录（若包含当前目录则只拒其中的凭据子目录与文件）以及当前 profile 的凭据文件。
 */
function computeProfileStoreDenyPaths() {
  let configDir = resolveConfigDir();
  if (configDir === null)
    return {
      value: null,
      complete: true,
    };
  let denied = {
    dirs: [configDir],
    files: [],
  };
  try {
    let r = resolve(configDir);
    denied = isRootOrContainsCwd(r)
      ? {
          dirs: PROFILE_STORE_DENY_DIRS.map((a) => join(r, a)),
          files: PROFILE_STORE_DENY_FILES.map((a) => join(r, a)),
        }
      : {
          dirs: [r],
          files: [],
        };
    let filtered = credentialsRealpaths(configDir, resolveLiveProfileName(configDir)).filter(
      (a) =>
        !denied.dirs.some((dir) => a === dir || a.startsWith(dir + sep)) &&
        !denied.files.includes(a) &&
        !isRootOrContainsCwd(a) &&
        !isDirectorySync(a),
    );
    return {
      value: {
        dirs: denied.dirs,
        files: [...denied.files, ...filtered],
      },
      complete: true,
    };
  } catch (error) {
    logForDebugging(
      `WIF profile store: could not resolve the active profile's credentials path (${errorMessage(error)}); denying the store root only`,
      {
        level: "warn",
      },
    );
    return {
      value: denied,
      complete: false,
    };
  }
}
//@ chunk-640x3zn9.js:11810-11918 placement
function credentialsPathOrNull(e, n) {
  let r = credentialsPathFor(e, n);
  if (!r) return join(e, "credentials", `${n}.json`);
  return typeof r === "string" ? r : null;
}
//@ chunk-640x3zn9.js:11918-12017 placement
function credentialsRealpaths(configDir, liveProfileName) {
  let r = credentialsPathOrNull(configDir, liveProfileName);
  if (r === null || !r.trim()) return [];
  return uniq(isAbsolute(r) ? [resolve(r)] : [resolve(configDir, r), resolve(r)]);
}
//@ chunk-640x3zn9.js:12017-12091 placement
function isLoadableProfileName(e) {
  return !!e && /^[A-Za-z0-9_.-]+$/.test(e) && e !== "." && e !== "..";
}
//@ chunk-640x3zn9.js:12091-12157 placement
function resolveImplicitProfileName(configDir) {
  return readProfileFile(join(configDir, "active_config"))?.trim() || "default";
}
//@ chunk-640x3zn9.js:12157-12226 placement
function resolveLiveProfileName(configDir) {
  return process.env.ANTHROPIC_PROFILE?.trim() || resolveImplicitProfileName(configDir);
}
//@ chunk-640x3zn9.js:12226-12448 placement
function profileAuthType(configDir, n) {
  let profileFile = readProfileFile(join(configDir, "configs", `${n}.json`));
  if (profileFile === null) return null;
  let s;
  try {
    s = JSON.parse(profileFile);
  } catch {
    return null;
  }
  let c = s?.authentication?.type ?? null;
  if (c === "user_oauth") {
    if (!readProfileFile(credentialsPathFor(configDir, n, s))?.trim()) return null;
  }
  return c;
}
//@ chunk-640x3zn9.js:12448-12632 placement
function credentialsPathFor(e, n, r) {
  if (r === undefined) {
    let profileFile = readProfileFile(join(e, "configs", `${n}.json`));
    if (profileFile !== null)
      try {
        r = JSON.parse(profileFile);
      } catch {}
  }
  return r?.authentication?.credentials_path ?? join(e, "credentials", `${n}.json`);
}
//@ chunk-640x3zn9.js:12632-12668 placement
function resolveConfigDir() {
  return configDirLocation()?.dir ?? null;
}
//@ chunk-640x3zn9.js:12668-12948 placement
function configDirLocation() {
  if (isDiskless()) return null;
  let env = process.env;
  let trimmed = env.ANTHROPIC_CONFIG_DIR?.trim();
  if (trimmed)
    return {
      dir: trimmed,
      space: "userNamed",
    };
  let trimmed_2 = env.XDG_CONFIG_HOME?.trim();
  if (trimmed_2)
    return {
      dir: join(trimmed_2, "anthropic"),
      space: "home",
    };
  let trimmed_3 = env.HOME?.trim();
  return trimmed_3
    ? {
        dir: join(trimmed_3, ".config", "anthropic"),
        space: "home",
      }
    : null;
}
//@ chunk-640x3zn9.js:12948-13006 placement
function activeProfileNameFromEnv() {
  return process.env.ANTHROPIC_PROFILE?.trim();
}
//@ chunk-640x3zn9.js:13006-13064 placement
function hasEnvQuad() {
  return WIF_ENV_QUAD_VARS.every((e) => process.env[e]?.trim());
}
//@ chunk-640x3zn9.js:13064-13189 placement
function isRootOrContainsCwd(e) {
  let n = canonicalLowerPath(e);
  if (n === parse(n).root) return true;
  let r = relative(n, canonicalLowerPath(getFsImplementation().cwd()));
  let s = r.split(sep)[0];
  return r === "" || (s !== ".." && !isAbsolute(r));
}
//@ chunk-640x3zn9.js:13189-13345 placement
function canonicalLowerPath(e) {
  let n = resolve(e);
  let r = "";
  for (;;)
    try {
      n = join(realpathSync.native(n), r);
      break;
    } catch {
      let s = dirname(n);
      if (s === n) {
        n = join(n, r);
        break;
      }
      r = r ? join(basename(n), r) : basename(n);
      n = s;
    }
  return n.toLowerCase();
}
//@ chunk-640x3zn9.js:13345-13407 placement
function isDirectorySync(e) {
  try {
    return lstatSync(e).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-640x3zn9.js:13407-13571 placement
function readProfileFile(e) {
  let primedFiles = wifProfileCacheByHost.of(getRootSession().host).primedFiles;
  if (primedFiles !== undefined && primedFiles.has(e)) return primedFiles.get(e) ?? null;
  try {
    return readFileSync(e, "utf-8");
  } catch (error) {
    if (isFsInaccessible(error) || isEISDIR(error)) return null;
    throw error;
  }
}
//@ chunk-640x3zn9.js:13571-14239 placement
async function primeWIFProfileFiles(e) {
  let n = wifProfileCacheByHost.of(getRootSession().host);
  let r = configDirLocation();
  if (n.precedenceSource.filled || r === null) return;
  let { dir, space } = r;
  let a = new Map();
  let l = async (_) => {
    let I;
    try {
      I = await e.hostFiles.readText(PathSpace[space](_));
    } catch (error) {
      logForDebugging(
        `WIF profile read-ahead: the storage backend threw reading ${_}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return null;
    }
    if (I.ok) {
      let A = I.value.found ? I.value.value : null;
      a.set(_, A);
      return A;
    }
    if (isFsInaccessibleCode(storageErrorCode(I.error))) a.set(_, null);
    return null;
  };
  let h = activeProfileNameFromEnv();
  if (!h && hasEnvQuad()) return;
  let Y = h || (await l(join(dir, "active_config")))?.trim() || "default";
  await l(join(dir, "configs", `${Y}.json`));
  n.primedFiles = a;
  try {
    getWIFPrecedenceSource();
    getWIFAuthType();
  } catch (error) {
    logForDebugging(`WIF profile read-ahead: left to the first reader: ${errorMessage(error)}`);
  } finally {
    n.primedFiles = undefined;
  }
}
export {
  getWIFStatusLine,
  getWIFAccountInfo,
  getWIFAuthType,
  getWIFPrecedenceSource,
  wouldWIFProfileYieldToClaudeAILogin,
  isWIFActive,
  getWIFProfileBaseUrl,
  getWIFProfileStoreDenyPaths,
  isWIFUserOAuthDeadError,
  clearWIFPrecedenceCache,
  resolveConfigDir,
  isWIFSettingsBearerRejected,
  setWIFSettingsBearerRejected,
  resolveImplicitProfileName,
  clearWIFAccountInfoCache,
  readWIFAccountInfo,
  resolveLiveProfileName,
  getWIFFederationIdentity,
  primeWIFProfileFiles,
  isLoadableProfileName,
};
