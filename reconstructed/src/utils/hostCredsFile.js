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
import { qG, Gx, isHelperEnvVar } from "./managedEnvConstants.js";
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

/**
 * 宿主凭据文件的常量与状态：可接收的环境变量集合、文件 schema（env、过期时间、pid、进程启动时间）、已应用的键等。
 */
//@ chunk-8p2yt59w.js:723-1097 placement
var HOST_CRED_ENV_KEYS = new Set(qG),
  SEEDABLE_ENV_KEYS = new Set([
    ...Gx,
    ...qG.filter(
      (e) =>
        e !== "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL" &&
        !e.startsWith("CLAUDE_CODE_ARTIFACT") &&
        !isHelperEnvVar(e),
    ),
    "ANTHROPIC_CUSTOM_HEADERS",
    "CLAUDE_CODE_SKIP_VERTEX_AUTH",
  ]),
  hostCredsFileSchema = DoctorLazy(() => {
    let pipe = create_16([create_3(), create_2()]).pipe(zodCoerce.number());
    return create({
      env: create_20(create_2()),
      expiresAt: pipe.nullable().default(null),
      pid: create_3().int(),
      procStart: pipe,
    });
  }),
  HOST_CREDS_POLL_MS = 2000,
  appliedEnvKeys = new Set(),
  hostCredsState = null;
//@ chunk-8p2yt59w.js:1097-1175 placement
function lvt() {
  return env.CLAUDE_CODE_HOST_AUTH_ENV_VAR || "ANTHROPIC_AUTH_TOKEN";
}
//@ chunk-8p2yt59w.js:1175-1261 placement = withoutHostManagedProviderVars (1)
function withoutHostManagedProviderVars() {
  return (
    !!getHostAuthTokenRefreshCallback() &&
    (!(isFirstPartyProvider() && isFirstPartyAnthropicBaseUrl()) || env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)
  );
}
/**
 * 读取 CLAUDE_CODE_HOST_CREDS_FILE（拒绝组/他人可读）
 */
//@ chunk-8p2yt59w.js:1261-2105 placement
async function readHostCredsFile() {
  let CLAUDE_CODE_HOST_CREDS_FILE = env.CLAUDE_CODE_HOST_CREDS_FILE;
  if (!CLAUDE_CODE_HOST_CREDS_FILE || !isAbsolute(CLAUDE_CODE_HOST_CREDS_FILE)) return null;
  let r;
  try {
    r = await open(CLAUDE_CODE_HOST_CREDS_FILE, "r");
    let stats = await r.stat();
    if (stats.size > 65536) return null;
    if (getPlatform() !== "windows") {
      if ((stats.mode & 63) !== 0 || stats.uid !== process.getuid?.())
        return (
          logForDebugging(
            "ignoring CLAUDE_CODE_HOST_CREDS_FILE with group/other-readable mode or wrong owner",
            { level: "warn" },
          ),
          null
        );
    }
    let content = await r.readFile({ encoding: "utf8" }),
      safeParse = hostCredsFileSchema().safeParse(jsonParse(content));
    if (!safeParse.success || !Number.isFinite(safeParse.data.procStart)) return null;
    let a = safeParse.data;
    if (!isProcessRunning(a.pid)) return null;
    let c = await getProcessCreationTimeMsAsync(a.pid);
    if (c !== null && Math.abs(a.procStart - c) > HOST_CREDS_POLL_MS) return null;
    if (a.expiresAt !== null && a.expiresAt < Date.now()) return null;
    let _ = {};
    for (let [u, g] of Object.entries(a.env)) if (SEEDABLE_ENV_KEYS.has(u)) _[u] = g;
    return { ...a, env: _ };
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`readHostCredsFile failed: ${errorMessage(error)}`, { level: "warn" });
    return null;
  } finally {
    await r?.close().catch(() => {});
  }
}
//@ chunk-8p2yt59w.js:2105-3022 placement
async function loadHostCredentials() {
  if (getHostAuthTokenRefreshCallback()) return;
  if (!env.CLAUDE_CODE_HOST_CREDS_FILE || !isEnvTruthy(env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) return;
  let e = await readHostCredsFile();
  if (e) {
    let r = new Map(),
      n = {};
    for (let [o, s] of Object.entries(e.env))
      if (HOST_CRED_ENV_KEYS.has(o)) seedEndpointEnv(r, o, s);
      else n[o] = s;
    ((hostCredsState = r), applyHostCredsEnv(n));
  } else
    logForDebugging(
      `CLAUDE_CODE_HOST_CREDS_FILE is set (${env.CLAUDE_CODE_HOST_CREDS_FILE}) but no usable host credentials were read`,
      { level: "warn" },
    );
  setHostAuthTokenRefreshCallback(async () => {
    let r = await readHostCredsFile();
    if (!r) throw Error("host-creds file re-read failed (missing/stale/expired)");
    let n = {};
    for (let [s, a] of Object.entries(r.env))
      if (!HOST_CRED_ENV_KEYS.has(s)) n[s] = a;
      else if (hostCredsState && hostCredsState.get(s) !== a)
        throw (
          logForDebugging(`host-creds refresh rejected: endpoint changed (${s})`, { level: "warn" }),
          Error("host-creds refresh rejected: endpoint changed")
        );
    let o = lvt();
    if (appliedEnvKeys.has(o) && !n[o]) throw Error("host-creds refresh dropped the bearer key");
    if (!hostCredsState) {
      let s = new Map();
      for (let [a, c] of Object.entries(r.env)) if (HOST_CRED_ENV_KEYS.has(a)) seedEndpointEnv(s, a, c);
      hostCredsState = s;
    }
    return (applyHostCredsEnv(n), { authToken: n[o] ?? null });
  });
}
//@ chunk-8p2yt59w.js:3022-3224 placement
function seedEndpointEnv(e, r, n) {
  let o = process.env[r];
  if (o && o !== n) {
    (logForDebugging(`host-creds seed: keeping the launch env's ${r}; the file names a different endpoint`, {
      level: "warn",
    }),
      e.set(r, o));
    return;
  }
  ((process.env[r] = n), e.set(r, n));
}
//@ chunk-8p2yt59w.js:3224-3343 placement
function applyHostCredsEnv(e) {
  for (let r of appliedEnvKeys) if (!(r in e)) delete process.env[r];
  (Object.assign(process.env, e), (appliedEnvKeys = new Set(Object.keys(e))));
}

export { loadHostCredentials, withoutHostManagedProviderVars, lvt };
