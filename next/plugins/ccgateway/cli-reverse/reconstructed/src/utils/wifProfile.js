/**
 * utils/wifProfile.ts
 *
 * 2.1.316 新增：工作负载身份联邦（WIF）profile：ANTHROPIC_CONFIG_DIR 下的 profile 选择、凭据与账号信息、状态行、凭据存储的沙箱拒读路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bxxnnnh4.js (44)
 * attribution: placement 44
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve, sep, isAbsolute, parse, relative, dirname, basename } from "path";
import { realpathSync, lstatSync, readFileSync } from "fs";
import { WorkloadIdentityError } from "../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, isFsInaccessible, isEISDIR, isFsInaccessibleCode } from "./errors.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { getFsImplementation } from "./fsOperations.js";
import { PathSpace } from "./resultError.js";
import { storageErrorCode } from "./storage/storageErrors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bxxnnnh4.js:6485-6608 placement
function isWIFUserOAuthDeadError(error) {
  return (
    error instanceof WorkloadIdentityError &&
    error.statusCode === null &&
    error.message.includes("has expired and no refresh is available")
  );
}
//@ chunk-bxxnnnh4.js:6608-6676 placement
var WIF_ENV_QUAD_VARS = ["ANTHROPIC_FEDERATION_RULE_ID", "ANTHROPIC_ORGANIZATION_ID"];
//@ chunk-bxxnnnh4.js:6676-6895 placement
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
//@ chunk-bxxnnnh4.js:6895-6918 placement
var wifProfileCacheByHost; // deferred: uses WifProfileCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bxxnnnh4.js:6895", () => {
  wifProfileCacheByHost = new HostScoped(() => new WifProfileCache());
});
//@ chunk-bxxnnnh4.js:6918-7073 placement
function getWIFPrecedenceSource() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.precedenceSource.filled) return cached.precedenceSource.value;
  let wifPrecedenceSource = computeWIFPrecedenceSource();
  cached.precedenceSource = {
    filled: true,
    value: wifPrecedenceSource,
  };
  return wifPrecedenceSource;
}
//@ chunk-bxxnnnh4.js:7073-7353 placement
function computeWIFPrecedenceSource() {
  let configDir = resolveConfigDir();
  let profileName = activeProfileNameFromEnv();
  if (profileName) {
    if (configDir === null) return null;
    let authType = profileAuthType(configDir, profileName);
    return authType === "oidc_federation" || authType === "user_oauth" ? "profile-explicit" : null;
  }
  if (hasEnvQuad()) return "env-quad";
  if (configDir !== null) {
    let authType = profileAuthType(configDir, resolveImplicitProfileName(configDir));
    if (authType === "oidc_federation" || authType === "user_oauth") return "profile-implicit";
  }
  return null;
}
//@ chunk-bxxnnnh4.js:7353-7575 placement
function clearWIFPrecedenceCache() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  cached.precedenceSource = {
    filled: false,
  };
  cached.authType = {
    filled: false,
  };
  cached.profileBaseUrl = {
    filled: false,
  };
  cached.federationIdentity = {
    filled: false,
  };
  cached.profileStoreDenyPaths = {
    filled: false,
  };
  cached.settingsBearerRejected = false;
  clearWIFAccountInfoCache();
}
//@ chunk-bxxnnnh4.js:7575-7629 placement
function clearWIFAccountInfoCache() {
  wifProfileCacheByHost.of(getRootSession().host).accountInfo = {
    filled: false,
  };
}
//@ chunk-bxxnnnh4.js:7629-7663 placement
function isWIFActive() {
  return getWIFPrecedenceSource() !== null;
}
//@ chunk-bxxnnnh4.js:7663-7795 placement
function getWIFAuthType() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.authType.filled) return cached.authType.value;
  let wifAuthType = computeWIFAuthType();
  cached.authType = {
    filled: true,
    value: wifAuthType,
  };
  return wifAuthType;
}
//@ chunk-bxxnnnh4.js:7795-8069 placement
function computeWIFAuthType() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null) return null;
  if (wifPrecedenceSource === "env-quad") return "oidc_federation";
  let configDir = resolveConfigDir();
  if (configDir === null) return null;
  let profileName =
    wifPrecedenceSource === "profile-explicit"
      ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
      : resolveImplicitProfileName(configDir);
  let authType = profileAuthType(configDir, profileName);
  return authType === "oidc_federation" || authType === "user_oauth" ? authType : null;
}
//@ chunk-bxxnnnh4.js:8069-8139 placement
function wouldWIFProfileYieldToClaudeAILogin() {
  return getWIFPrecedenceSource() === "profile-implicit" && getWIFAuthType() === "user_oauth";
}
//@ chunk-bxxnnnh4.js:8139-8279 placement
function getWIFAccountInfo() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.accountInfo.filled) return cached.accountInfo.value;
  let wifAccountInfo = computeWIFAccountInfo();
  cached.accountInfo = {
    filled: true,
    value: wifAccountInfo,
  };
  return wifAccountInfo;
}
//@ chunk-bxxnnnh4.js:8279-8470 placement
function computeWIFAccountInfo() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null || wifPrecedenceSource === "env-quad") return;
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  let profileName =
    wifPrecedenceSource === "profile-explicit"
      ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
      : resolveImplicitProfileName(configDir);
  return readWIFAccountInfo(configDir, profileName);
}
//@ chunk-bxxnnnh4.js:8470-8730 placement
function readWIFAccountInfo(configDir, profileName) {
  let profileFile = readProfileFile(credentialsPathFor(configDir, profileName));
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
//@ chunk-bxxnnnh4.js:8730-9258 placement
function getWIFStatusLine() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === "env-quad") {
    let id = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    return `env-quad \xB7 org ${tailOfId(process.env.ANTHROPIC_ORGANIZATION_ID ?? "")} \xB7 rule ${tailOfId(process.env.ANTHROPIC_FEDERATION_RULE_ID ?? "")}${id ? ` \xB7 ws ${id.startsWith("wrkspc_") ? tailOfId(id) : id}` : ""}`;
  }
  if (wifPrecedenceSource === "profile-explicit" || wifPrecedenceSource === "profile-implicit") {
    let configDir = resolveConfigDir();
    let profileName =
      configDir === null
        ? "default"
        : wifPrecedenceSource === "profile-explicit"
          ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
          : resolveImplicitProfileName(configDir);
    return `credentials-file \xB7 ${getWIFAuthType() ?? "unknown"} \xB7 profile ${profileName}`;
  }
  return "inactive";
}
//@ chunk-bxxnnnh4.js:9258-9316 placement
function tailOfId(id) {
  return id.length <= 6 ? id : `\u2026${id.slice(-6)}`;
}
//@ chunk-bxxnnnh4.js:9316-9466 placement
function getWIFProfileBaseUrl() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.profileBaseUrl.filled) return cached.profileBaseUrl.value;
  let wifProfileBaseUrl = computeWIFProfileBaseUrl();
  cached.profileBaseUrl = {
    filled: true,
    value: wifProfileBaseUrl,
  };
  return wifProfileBaseUrl;
}
//@ chunk-bxxnnnh4.js:9466-9810 placement
/**
 * 读取当前 WIF profile 配置中的 base_url。
 */
function computeWIFProfileBaseUrl() {
  let wifPrecedenceSource = getWIFPrecedenceSource();
  if (wifPrecedenceSource === null || wifPrecedenceSource === "env-quad") return;
  let configDir = resolveConfigDir();
  if (configDir === null) return;
  try {
    let profileName =
      wifPrecedenceSource === "profile-explicit"
        ? (process.env.ANTHROPIC_PROFILE?.trim() ?? "default")
        : resolveImplicitProfileName(configDir);
    let profileFile = readProfileFile(join(configDir, "configs", `${profileName}.json`));
    if (profileFile === null) return;
    let parsed = JSON.parse(profileFile);
    return typeof parsed.base_url === "string" && parsed.base_url.trim() ? parsed.base_url.trim() : undefined;
  } catch {
    return;
  }
}
//@ chunk-bxxnnnh4.js:9810-9989 placement
var wifProfileConfigSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bxxnnnh4.js:9810", () => {
  wifProfileConfigSchema = DoctorLazy(() =>
    objectSchema({
      organization_id: stringSchema().optional(),
      workspace_id: stringSchema().optional(),
      authentication: objectSchema({
        type: stringSchema().optional(),
        federation_rule_id: stringSchema().optional(),
      })
        .loose()
        .optional(),
    }).loose(),
  );
});
//@ chunk-bxxnnnh4.js:9989-10151 placement
function getWIFFederationIdentity() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.federationIdentity.filled) return cached.federationIdentity.value;
  let wifFederationIdentity = computeWIFFederationIdentity();
  cached.federationIdentity = {
    filled: true,
    value: wifFederationIdentity,
  };
  return wifFederationIdentity;
}
//@ chunk-bxxnnnh4.js:10151-10699 placement
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
    let parseResult = wifProfileConfigSchema().safeParse(jsonParse(profileFile));
    if (!parseResult.success || parseResult.data.authentication?.type !== "oidc_federation") return;
    return federationIdentityOf({
      organizationId: parseResult.data.organization_id,
      federationRuleId: parseResult.data.authentication.federation_rule_id,
      workspaceId: parseResult.data.workspace_id,
    });
  } catch {
    return;
  }
}
//@ chunk-bxxnnnh4.js:10699-10907 placement
function federationIdentityOf({ organizationId, federationRuleId, workspaceId }) {
  let trimmed = organizationId?.trim();
  let trimmed_2 = federationRuleId?.trim();
  if (!trimmed || !trimmed_2) return;
  let normalizedWorkspaceId = workspaceId?.trim() || undefined;
  return {
    organizationId: trimmed,
    federationRuleId: trimmed_2,
    ...(normalizedWorkspaceId !== undefined && {
      workspaceId: normalizedWorkspaceId,
    }),
  };
}
//@ chunk-bxxnnnh4.js:10907-10967 placement
function isWIFSettingsBearerRejected() {
  return wifProfileCacheByHost.of(getRootSession().host).settingsBearerRejected;
}
//@ chunk-bxxnnnh4.js:10967-11023 placement
function setWIFSettingsBearerRejected(settingsBearerRejected) {
  wifProfileCacheByHost.of(getRootSession().host).settingsBearerRejected = settingsBearerRejected;
}
//@ chunk-bxxnnnh4.js:11023-11077 placement
var PROFILE_STORE_DENY_DIRS = ["configs", "credentials"];
var PROFILE_STORE_DENY_FILES = ["active_config"];
//@ chunk-bxxnnnh4.js:11077-11271 placement
function getWIFProfileStoreDenyPaths() {
  let cached = wifProfileCacheByHost.of(getRootSession().host);
  if (cached.profileStoreDenyPaths.filled) return cached.profileStoreDenyPaths.value;
  let { value: denyPaths, complete } = computeProfileStoreDenyPaths();
  if (complete)
    cached.profileStoreDenyPaths = {
      filled: true,
      value: denyPaths,
    };
  return denyPaths;
}
//@ chunk-bxxnnnh4.js:11271-11810 placement
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
    let resolvedConfigDir = resolve(configDir);
    denied = isRootOrContainsCwd(resolvedConfigDir)
      ? {
          dirs: PROFILE_STORE_DENY_DIRS.map((relativeDir) => join(resolvedConfigDir, relativeDir)),
          files: PROFILE_STORE_DENY_FILES.map((relativeFile) => join(resolvedConfigDir, relativeFile)),
        }
      : {
          dirs: [resolvedConfigDir],
          files: [],
        };
    let filtered = credentialsRealpaths(configDir, resolveLiveProfileName(configDir)).filter(
      (credentialsPath) =>
        !denied.dirs.some((dir) => credentialsPath === dir || credentialsPath.startsWith(dir + sep)) &&
        !denied.files.includes(credentialsPath) &&
        !isRootOrContainsCwd(credentialsPath) &&
        !isDirectorySync(credentialsPath),
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
//@ chunk-bxxnnnh4.js:11810-11918 placement
function credentialsPathOrNull(configDir, profileName) {
  let path = credentialsPathFor(configDir, profileName);
  if (!path) return join(configDir, "credentials", `${profileName}.json`);
  return typeof path === "string" ? path : null;
}
//@ chunk-bxxnnnh4.js:11918-12017 placement
function credentialsRealpaths(configDir, profileName) {
  let realpath = credentialsPathOrNull(configDir, profileName);
  if (realpath === null || !realpath.trim()) return [];
  return normalizeCaseForComparison_2(
    isAbsolute(realpath) ? [resolve(realpath)] : [resolve(configDir, realpath), resolve(realpath)],
  );
}
//@ chunk-bxxnnnh4.js:12017-12091 placement
function isLoadableProfileName(name) {
  return !!name && /^[A-Za-z0-9_.-]+$/.test(name) && name !== "." && name !== "..";
}
//@ chunk-bxxnnnh4.js:12091-12157 placement
function resolveImplicitProfileName(configDir) {
  return readProfileFile(join(configDir, "active_config"))?.trim() || "default";
}
//@ chunk-bxxnnnh4.js:12157-12226 placement
function resolveLiveProfileName(configDir) {
  return process.env.ANTHROPIC_PROFILE?.trim() || resolveImplicitProfileName(configDir);
}
//@ chunk-bxxnnnh4.js:12226-12448 placement
function profileAuthType(configDir, profileName) {
  let profileFile = readProfileFile(join(configDir, "configs", `${profileName}.json`));
  if (profileFile === null) return null;
  let profileConfig;
  try {
    profileConfig = JSON.parse(profileFile);
  } catch {
    return null;
  }
  let authType = profileConfig?.authentication?.type ?? null;
  if (authType === "user_oauth") {
    if (!readProfileFile(credentialsPathFor(configDir, profileName, profileConfig))?.trim()) return null;
  }
  return authType;
}
//@ chunk-bxxnnnh4.js:12448-12632 placement
function credentialsPathFor(configDir, profileName, profileConfig) {
  if (profileConfig === undefined) {
    let profileFile = readProfileFile(join(configDir, "configs", `${profileName}.json`));
    if (profileFile !== null)
      try {
        profileConfig = JSON.parse(profileFile);
      } catch {}
  }
  return (
    profileConfig?.authentication?.credentials_path ?? join(configDir, "credentials", `${profileName}.json`)
  );
}
//@ chunk-bxxnnnh4.js:12632-12668 placement
function resolveConfigDir() {
  return configDirLocation()?.dir ?? null;
}
//@ chunk-bxxnnnh4.js:12668-12948 placement
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
//@ chunk-bxxnnnh4.js:12948-13006 placement
function activeProfileNameFromEnv() {
  return process.env.ANTHROPIC_PROFILE?.trim();
}
//@ chunk-bxxnnnh4.js:13006-13064 placement
function hasEnvQuad() {
  return WIF_ENV_QUAD_VARS.every((name) => process.env[name]?.trim());
}
//@ chunk-bxxnnnh4.js:13064-13189 placement
function isRootOrContainsCwd(path) {
  let canon = canonicalLowerPath(path);
  if (canon === parse(canon).root) return true;
  let relativePath = relative(canon, canonicalLowerPath(getFsImplementation().cwd()));
  let firstSegment = relativePath.split(sep)[0];
  return relativePath === "" || (firstSegment !== ".." && !isAbsolute(relativePath));
}
//@ chunk-bxxnnnh4.js:13189-13345 placement
function canonicalLowerPath(path) {
  let resolved = resolve(path);
  let tailPath = "";
  for (;;)
    try {
      resolved = join(realpathSync.native(resolved), tailPath);
      break;
    } catch {
      let parentDir = dirname(resolved);
      if (parentDir === resolved) {
        resolved = join(resolved, tailPath);
        break;
      }
      tailPath = tailPath ? join(basename(resolved), tailPath) : basename(resolved);
      resolved = parentDir;
    }
  return resolved.toLowerCase();
}
//@ chunk-bxxnnnh4.js:13345-13407 placement
function isDirectorySync(path) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-bxxnnnh4.js:13407-13571 placement
function readProfileFile(path) {
  let primedFiles = wifProfileCacheByHost.of(getRootSession().host).primedFiles;
  if (primedFiles !== undefined && primedFiles.has(path)) return primedFiles.get(path) ?? null;
  try {
    return readFileSync(path, "utf-8");
  } catch (error) {
    if (isFsInaccessible(error) || isEISDIR(error)) return null;
    throw error;
  }
}
//@ chunk-bxxnnnh4.js:13571-14239 placement
async function primeWIFProfileFiles(hostFiles) {
  let cache = wifProfileCacheByHost.of(getRootSession().host);
  let configLocation = configDirLocation();
  if (cache.precedenceSource.filled || configLocation === null) return;
  let { dir, space } = configLocation;
  let primedFiles = new Map();
  let readPrimedFile = async (filePath) => {
    let readResult;
    try {
      readResult = await hostFiles.hostFiles.readText(PathSpace[space](filePath));
    } catch (error) {
      logForDebugging(
        `WIF profile read-ahead: the storage backend threw reading ${filePath}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return null;
    }
    if (readResult.ok) {
      let fileContent = readResult.value.found ? readResult.value.value : null;
      primedFiles.set(filePath, fileContent);
      return fileContent;
    }
    if (isFsInaccessibleCode(storageErrorCode(readResult.error))) primedFiles.set(filePath, null);
    return null;
  };
  let envProfileName = activeProfileNameFromEnv();
  if (!envProfileName && hasEnvQuad()) return;
  let profileName = envProfileName || (await readPrimedFile(join(dir, "active_config")))?.trim() || "default";
  await readPrimedFile(join(dir, "configs", `${profileName}.json`));
  cache.primedFiles = primedFiles;
  try {
    getWIFPrecedenceSource();
    getWIFAuthType();
  } catch (error) {
    logForDebugging(`WIF profile read-ahead: left to the first reader: ${errorMessage(error)}`);
  } finally {
    cache.primedFiles = undefined;
  }
}
export {
  isWIFActive,
  getWIFAuthType,
  getWIFAccountInfo,
  getWIFPrecedenceSource,
  resolveConfigDir,
  resolveImplicitProfileName,
  clearWIFAccountInfoCache,
  readWIFAccountInfo,
  resolveLiveProfileName,
  getWIFFederationIdentity,
  getWIFProfileStoreDenyPaths,
  getWIFStatusLine,
  getWIFProfileBaseUrl,
  wouldWIFProfileYieldToClaudeAILogin,
  isWIFUserOAuthDeadError,
  isWIFSettingsBearerRejected,
  setWIFSettingsBearerRejected,
  primeWIFProfileFiles,
  clearWIFPrecedenceCache,
  isLoadableProfileName,
};
