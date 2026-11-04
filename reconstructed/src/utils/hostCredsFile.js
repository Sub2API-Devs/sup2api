/**
 * utils/hostCredsFile.ts
 *
 * CLAUDE_CODE_HOST_CREDS_FILE 宿主凭据文件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8p2yt59w.js (7)
 * attribution: placement 7
 */
import { isAbsolute } from "path";
import { open } from "fs/promises";
import { BASE_URL_ENV_VARS, PROVIDER_CREDENTIAL_ENV_VARS, isHelperEnvVar } from "./managedEnvConstants.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { create_16, create_3, create_2, zodCoerce, create, create_20 } from "../../vendor/zod/lib/index.mjs";
import { env } from "./env.js";
import { getHostAuthTokenRefreshCallback, setHostAuthTokenRefreshCallback } from "../bootstrap/state.js";
import { isFirstPartyProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";
import { jsonParse } from "./slowOperations.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { getProcessCreationTimeMsAsync } from "./processIdentity.js";
import { isENOENT, errorMessage } from "./errors.js";
import { isEnvTruthy } from "./envUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8p2yt59w.js:723-1097 placement
/**
 * 宿主凭据文件的常量与状态：可接收的环境变量集合、文件 schema（env、过期时间、pid、进程启动时间）、已应用的键等。
 */
var HOST_CRED_ENV_KEYS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var SEEDABLE_ENV_KEYS;
var hostCredsFileSchema;
var HOST_CREDS_POLL_MS;
var appliedEnvKeys;
var hostCredsState;
deferInit("chunk-8p2yt59w.js:723", () => {
  HOST_CRED_ENV_KEYS = new Set(BASE_URL_ENV_VARS);
  SEEDABLE_ENV_KEYS = new Set([
    ...PROVIDER_CREDENTIAL_ENV_VARS,
    ...BASE_URL_ENV_VARS.filter(
      (envKey) =>
        envKey !== "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL" &&
        !envKey.startsWith("CLAUDE_CODE_ARTIFACT") &&
        !isHelperEnvVar(envKey),
    ),
    "ANTHROPIC_CUSTOM_HEADERS",
    "CLAUDE_CODE_SKIP_VERTEX_AUTH",
  ]);
  hostCredsFileSchema = DoctorLazy(() => {
    let procStartField = create_16([create_3(), create_2()]).pipe(zodCoerce.number());
    return create({
      env: create_20(create_2()),
      expiresAt: procStartField.nullable().default(null),
      pid: create_3().int(),
      procStart: procStartField,
    });
  });
  HOST_CREDS_POLL_MS = 2000;
  appliedEnvKeys = new Set();
  hostCredsState = null;
});
//@ chunk-8p2yt59w.js:1097-1175 placement
/**
 * 宿主认证用的环境变量名（未指定时用 ANTHROPIC_AUTH_TOKEN）。
 */
function hostAuthEnvVarName() {
  return env.CLAUDE_CODE_HOST_AUTH_ENV_VAR || "ANTHROPIC_AUTH_TOKEN";
}
//@ chunk-8p2yt59w.js:1175-1261 placement = withoutHostManagedProviderVars (1)
function withoutHostManagedProviderVars() {
  return (
    !!getHostAuthTokenRefreshCallback() &&
    (!(isFirstPartyProvider() && isFirstPartyAnthropicBaseUrl()) || env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)
  );
}
//@ chunk-8p2yt59w.js:1261-2105 placement
/**
 * 读取 CLAUDE_CODE_HOST_CREDS_FILE（拒绝组/他人可读）
 */
async function readHostCredsFile() {
  let CLAUDE_CODE_HOST_CREDS_FILE = env.CLAUDE_CODE_HOST_CREDS_FILE;
  if (!CLAUDE_CODE_HOST_CREDS_FILE || !isAbsolute(CLAUDE_CODE_HOST_CREDS_FILE)) return null;
  let handle;
  try {
    handle = await open(CLAUDE_CODE_HOST_CREDS_FILE, "r");
    let stats = await handle.stat();
    if (stats.size > 65536) return null;
    if (getPlatform() !== "windows") {
      if ((stats.mode & 63) !== 0 || stats.uid !== process.getuid?.()) {
        logForDebugging(
          "ignoring CLAUDE_CODE_HOST_CREDS_FILE with group/other-readable mode or wrong owner",
          {
            level: "warn",
          },
        );
        return null;
      }
    }
    let content = await handle.readFile({
      encoding: "utf8",
    });
    let parsed = hostCredsFileSchema().safeParse(jsonParse(content));
    if (!parsed.success || !Number.isFinite(parsed.data.procStart)) return null;
    let creds = parsed.data;
    if (!isProcessRunning(creds.pid)) return null;
    let processCreationTimeMs = await getProcessCreationTimeMsAsync(creds.pid);
    if (
      processCreationTimeMs !== null &&
      Math.abs(creds.procStart - processCreationTimeMs) > HOST_CREDS_POLL_MS
    )
      return null;
    if (creds.expiresAt !== null && creds.expiresAt < Date.now()) return null;
    let seedableEnv = {};
    for (let [key, value] of Object.entries(creds.env))
      if (SEEDABLE_ENV_KEYS.has(key)) seedableEnv[key] = value;
    return {
      ...creds,
      env: seedableEnv,
    };
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`readHostCredsFile failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-8p2yt59w.js:2105-3022 placement
async function loadHostCredentials() {
  if (getHostAuthTokenRefreshCallback()) return;
  if (!env.CLAUDE_CODE_HOST_CREDS_FILE || !isEnvTruthy(env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) return;
  let hostCredsFile = await readHostCredsFile();
  if (hostCredsFile) {
    let endpointEnv = new Map();
    let otherEnv = {};
    for (let [key, value] of Object.entries(hostCredsFile.env))
      if (HOST_CRED_ENV_KEYS.has(key)) seedEndpointEnv(endpointEnv, key, value);
      else otherEnv[key] = value;
    hostCredsState = endpointEnv;
    applyHostCredsEnv(otherEnv);
  } else
    logForDebugging(
      `CLAUDE_CODE_HOST_CREDS_FILE is set (${env.CLAUDE_CODE_HOST_CREDS_FILE}) but no usable host credentials were read`,
      {
        level: "warn",
      },
    );
  setHostAuthTokenRefreshCallback(async () => {
    let hostCredsFile = await readHostCredsFile();
    if (!hostCredsFile) throw Error("host-creds file re-read failed (missing/stale/expired)");
    let otherEnv = {};
    for (let [key, value] of Object.entries(hostCredsFile.env))
      if (!HOST_CRED_ENV_KEYS.has(key)) otherEnv[key] = value;
      else if (hostCredsState && hostCredsState.get(key) !== value) {
        logForDebugging(`host-creds refresh rejected: endpoint changed (${key})`, {
          level: "warn",
        });
        throw Error("host-creds refresh rejected: endpoint changed");
      }
    let authEnvKey = hostAuthEnvVarName();
    if (appliedEnvKeys.has(authEnvKey) && !otherEnv[authEnvKey])
      throw Error("host-creds refresh dropped the bearer key");
    if (!hostCredsState) {
      let endpointEnv = new Map();
      for (let [key, value] of Object.entries(hostCredsFile.env))
        if (HOST_CRED_ENV_KEYS.has(key)) seedEndpointEnv(endpointEnv, key, value);
      hostCredsState = endpointEnv;
    }
    applyHostCredsEnv(otherEnv);
    return {
      authToken: otherEnv[authEnvKey] ?? null,
    };
  });
}
//@ chunk-8p2yt59w.js:3022-3224 placement
function seedEndpointEnv(endpoints, envKey, value) {
  let launchValue = process.env[envKey];
  if (launchValue && launchValue !== value) {
    logForDebugging(
      `host-creds seed: keeping the launch env's ${envKey}; the file names a different endpoint`,
      {
        level: "warn",
      },
    );
    endpoints.set(envKey, launchValue);
    return;
  }
  process.env[envKey] = value;
  endpoints.set(envKey, value);
}
//@ chunk-8p2yt59w.js:3224-3343 placement
function applyHostCredsEnv(envValues) {
  for (let appliedEnvKey of appliedEnvKeys)
    if (!(appliedEnvKey in envValues)) delete process.env[appliedEnvKey];
  Object.assign(process.env, envValues);
  appliedEnvKeys = new Set(Object.keys(envValues));
}
export { loadHostCredentials, withoutHostManagedProviderVars, hostAuthEnvVarName };
