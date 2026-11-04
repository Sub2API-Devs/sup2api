/**
 * @anthropic-ai/sdk/core/credentials.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (7)
 * attribution: esm-fingerprint 4, esm-layout 2, affinity 1
 */
import { readFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { readEnv } from "../internal/utils/env.mjs";
import { getPlatform } from "../internal/detect-platform.mjs";
import { getWIFPrecedenceSource } from "../../../../src/utils/wifProfile.js";
import { isDiskless } from "../../../../src/bootstrap/state.js";
import { logForDebugging } from "../../../../src/utils/debug.js";
import { errorMessage } from "../../../../src/utils/errors.js";
import { federationCacheDir } from "../../../../src/utils/subprocessEnv.js";
import { computeContentHash } from "../../../../src/utils/commitAttribution.js";

//@ chunk-3wydcdvj.js:4720-4767 esm-fingerprint
var CONFIG_FILE_VERSION = "1.0";
var CREDENTIALS_FILE_VERSION = "1.0";
var PROFILE_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
//@ chunk-3wydcdvj.js:4767-5123 esm-fingerprint
function validateProfileName(name) {
  if (!name) throw Error("profile name is empty");
  if (name === "." || name === "..") throw Error(`profile name "${name}" is not allowed`);
  if (name.includes("/") || name.includes("\\"))
    throw Error(`profile name "${name}" must not contain path separators`);
  if (!PROFILE_NAME_PATTERN.test(name))
    throw Error(
      `profile name "${name}" contains disallowed characters (allowed: letters, digits, '_', '.', '-')`,
    );
}
//@ chunk-3wydcdvj.js:5123-6947 esm-layout
var loadConfig = async (profile) => (await loadConfigWithSource(profile))?.config ?? null;
var loadConfigWithSource = async (profile) => {
  var _a;
  var _b;
  let rootConfigPath = await getRootConfigPath_2();
  if (rootConfigPath === null) return null;
  let profileName = profile ?? (await getActiveProfileName());
  if (profileName === null) return null;
  validateProfileName(profileName);
  let { fs, path } = await import("../../../../src/child_process.lazy.js");
  let configPath = path.join(rootConfigPath, "configs", `${profileName}.json`);
  let configRaw;
  try {
    configRaw = await fs.promises.readFile(configPath, "utf-8");
  } catch (err) {
    if (err?.code !== "ENOENT") throw Error(`failed to read config file ${configPath}: ${err}`);
    configRaw = null;
  }
  if (configRaw === null) {
    let organizationId = readEnv("ANTHROPIC_ORGANIZATION_ID");
    let identityTokenFile = readEnv("ANTHROPIC_IDENTITY_TOKEN_FILE");
    let federationRuleId = readEnv("ANTHROPIC_FEDERATION_RULE_ID");
    if (federationRuleId && organizationId)
      return {
        fromFile: false,
        config: {
          organization_id: organizationId,
          workspace_id: readEnv("ANTHROPIC_WORKSPACE_ID"),
          base_url: readEnv("ANTHROPIC_BASE_URL"),
          authentication: {
            type: "oidc_federation",
            federation_rule_id: federationRuleId,
            service_account_id: readEnv("ANTHROPIC_SERVICE_ACCOUNT_ID"),
            identity_token: identityTokenFile
              ? {
                  source: "file",
                  path: identityTokenFile,
                }
              : undefined,
            scope: readEnv("ANTHROPIC_SCOPE"),
          },
        },
      };
    return null;
  }
  let config;
  try {
    config = JSON.parse(configRaw);
  } catch (err) {
    throw Error(`failed to parse config file ${configPath}: ${err}`);
  }
  if (!config.authentication) throw Error(`config file ${configPath} is missing "authentication"`);
  let authType = config.authentication.type;
  if (authType !== "oidc_federation" && authType !== "user_oauth")
    throw Error(`authentication.type "${authType}" is not a known authentication type`);
  config.organization_id ?? (config.organization_id = readEnv("ANTHROPIC_ORGANIZATION_ID"));
  config.workspace_id ?? (config.workspace_id = readEnv("ANTHROPIC_WORKSPACE_ID"));
  config.base_url ?? (config.base_url = readEnv("ANTHROPIC_BASE_URL"));
  (_a = config.authentication).scope ?? (_a.scope = readEnv("ANTHROPIC_SCOPE"));
  if (config.authentication.type === "oidc_federation") {
    if (!config.authentication.identity_token) {
      let identityTokenFile = readEnv("ANTHROPIC_IDENTITY_TOKEN_FILE");
      if (identityTokenFile)
        config.authentication.identity_token = {
          source: "file",
          path: identityTokenFile,
        };
    }
    if (!config.authentication.federation_rule_id)
      config.authentication.federation_rule_id = readEnv("ANTHROPIC_FEDERATION_RULE_ID") ?? "";
    (_b = config.authentication).service_account_id ??
      (_b.service_account_id = readEnv("ANTHROPIC_SERVICE_ACCOUNT_ID"));
  }
  return {
    config,
    fromFile: true,
  };
};
//@ chunk-3wydcdvj.js:6947-8059 esm-fingerprint
var getRootConfigPath = async (config, profile) => {
  if (config?.authentication.credentials_path) return config.authentication.credentials_path;
  let rootConfigPath = await getRootConfigPath_2();
  if (!rootConfigPath) return null;
  let profileName = profile ?? (await getActiveProfileName());
  if (!profileName) return null;
  validateProfileName(profileName);
  let { path } = await import("../../../../src/child_process.lazy.js");
  return path.join(rootConfigPath, "credentials", `${profileName}.json`);
};
var getRootConfigPath_2 = async () => {
  if (!supportsLocalConfigFiles()) return null;
  let { path } = await import("../../../../src/child_process.lazy.js");
  let configDir = readEnv("ANTHROPIC_CONFIG_DIR");
  if (configDir) return configDir;
  if (getPlatform()["X-Stainless-OS"] === "Windows") {
    let appData = readEnv("APPDATA");
    if (appData) return path.join(appData, "Anthropic");
    let userProfile = readEnv("USERPROFILE");
    if (userProfile) return path.join(userProfile, "AppData", "Roaming", "Anthropic");
    return null;
  }
  let xdgConfigHome = readEnv("XDG_CONFIG_HOME");
  if (xdgConfigHome) return path.join(xdgConfigHome, "anthropic");
  let home = readEnv("HOME");
  if (home) return path.join(home, ".config", "anthropic");
  return null;
};
var supportsLocalConfigFiles = () => {
  let runtime = getPlatform()["X-Stainless-Runtime"];
  return runtime === "node" || runtime === "deno";
};
var getActiveProfileName = async () => {
  let rootConfigPath = await getRootConfigPath_2();
  if (!rootConfigPath) return null;
  let profileName = readEnv("ANTHROPIC_PROFILE");
  if (profileName) return profileName;
  let { fs, path } = await import("../../../../src/child_process.lazy.js");
  let filePath = path.join(rootConfigPath, "active_config");
  try {
    return (await fs.promises.readFile(filePath, "utf-8")).trim() || "default";
  } catch (err) {
    if (err?.code !== "ENOENT") throw Error(`failed to read ${filePath}: ${err}`);
    return "default";
  }
};
//@ chunk-3wydcdvj.js:21071-21113 affinity
var readEnvVar = (name) => process.env[name]?.trim() || undefined;
//@ chunk-3wydcdvj.js:21113-21619 esm-fingerprint
async function loadEnvQuadConfig() {
  if (getWIFPrecedenceSource() === "env-quad") {
    let federationRuleId = readEnvVar("ANTHROPIC_FEDERATION_RULE_ID");
    let organizationId = readEnvVar("ANTHROPIC_ORGANIZATION_ID");
    if (federationRuleId && organizationId) {
      let identityTokenFile = readEnvVar("ANTHROPIC_IDENTITY_TOKEN_FILE");
      if (identityTokenFile && isDiskless()) return null;
      return {
        organization_id: organizationId,
        workspace_id: readEnvVar("ANTHROPIC_WORKSPACE_ID"),
        base_url: readEnvVar("ANTHROPIC_BASE_URL"),
        authentication: {
          type: "oidc_federation",
          federation_rule_id: federationRuleId,
          service_account_id: readEnvVar("ANTHROPIC_SERVICE_ACCOUNT_ID"),
          identity_token: identityTokenFile
            ? {
                source: "file",
                path: identityTokenFile,
              }
            : undefined,
          scope: readEnvVar("ANTHROPIC_SCOPE"),
        },
      };
    }
  }
  if (isDiskless()) return null;
  return loadConfig();
}
//@ chunk-3wydcdvj.js:21619-22799 esm-layout
async function buildWifTokenCache(config, log) {
  if (config.authentication.type !== "oidc_federation") return null;
  let path = config.authentication.identity_token?.path;
  let identityToken;
  if (path)
    try {
      identityToken = (await readFile(path, "utf-8")).trim();
    } catch (error) {
      logForDebugging(
        `wif: cannot read identity token at ${path} (${errorMessage(error)}); federation token cache disabled`,
      );
      return null;
    }
  else identityToken = readEnvVar("ANTHROPIC_IDENTITY_TOKEN");
  if (!identityToken) {
    logForDebugging("wif: no identity token; federation token cache disabled");
    return null;
  }
  let cacheDir = federationCacheDir();
  if (cacheDir === null) {
    logForDebugging("wif: no config directory, or a diskless session; federation token cache disabled");
    return null;
  }
  try {
    await mkdir(cacheDir, {
      recursive: true,
      mode: 448,
    });
    {
      let dirStats = await stat(cacheDir);
      let modeBits = dirStats.mode & 511;
      if (modeBits & 63) {
        logForDebugging(
          `wif: ${cacheDir} is mode 0o${modeBits.toString(8)} (filesystem ignores modes, or directory pre-existed shared); federation token cache disabled`,
        );
        return null;
      }
      let uid = process.getuid?.();
      if (uid !== undefined && dirStats.uid !== uid) {
        logForDebugging(
          `wif: ${cacheDir} is owned by uid ${dirStats.uid}, not ${uid}; federation token cache disabled`,
        );
        return null;
      }
    }
  } catch (error) {
    logForDebugging(
      `wif: cannot prepare ${cacheDir} (${errorMessage(error)}); federation token cache disabled`,
    );
    return null;
  }
  let contentHash = computeContentHash(
    JSON.stringify([
      config.authentication.federation_rule_id,
      config.organization_id,
      config.workspace_id ?? "",
      config.authentication.service_account_id ?? "",
      config.authentication.scope ?? "",
      log,
      computeContentHash(identityToken),
    ]),
  );
  return join(cacheDir, `${contentHash}.json`);
}
export {
  CREDENTIALS_FILE_VERSION,
  loadConfigWithSource,
  getRootConfigPath,
  loadEnvQuadConfig,
  buildWifTokenCache,
  CONFIG_FILE_VERSION,
};
