/**
 * remote/tools/toolHostHelper.ts
 *
 * 工具宿主助手进程（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3zy56vtn.js (29)
 * attribution: placement 29
 */
import { StringDecoder } from "string_decoder";
import { randomUUID } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string, u, _enum, E, M, array, unknown, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw, jsonStringify } from "../../utils/slowOperations.js";
import { KNOWN_HOST_ENV_VARS } from "../../utils/knownEnvVars.js";
import {
  BG_CARRIED_ENV_KEYS_2,
  stripCoworkHostEnvKeys,
  stripInternalEntrypoint,
} from "../../utils/background/envCarry.js";
import { subprocessEnv_2 } from "../../utils/subprocessEnv.js";
import {
  CREDENTIAL_SCRUB_VARS_WITH_INPUT,
  envVarToUpperSnake,
  sanitizeEnvCredentials,
} from "../../utils/settings/policyHelper/helperExec.js";
import {
  PROVIDER_CREDENTIAL_ENV_VARS,
  BASE_URL_ENV_VARS,
  HOST_MANAGED_MARKER_ENV_VARS,
  PROVIDER_SELECTION_ENV_VARS,
} from "../../utils/managedEnvConstants.js";
import { isAlwaysTrue, isRemoteToolsPinStoredLogin } from "../../cli/headlessCloud/attachServe.js";
import { declaredEnvVarNames, env } from "../../utils/env.js";
import { listSecretEnvNames } from "../../utils/settings/policyHelper/helperEnv.js";
import { logForDebugging } from "../../utils/debug.js";
import { processWrapperError } from "../../utils/processWrapper.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { getFirstLine, truncateToLength } from "../../utils/stringUtils.js";
import { errorMessage } from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { RELEASED } from "./protocolConstants.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";
import { hashIdForLog } from "../../bridge/debugUtils.js";
import { count } from "../../utils/collections.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { retryAfterMsOf, hasFatalClientStatus } from "../../bridge/bridgeMain.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { isSafeBridgeId } from "../../bridge/sessionIdCompat.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  getSettingsWithErrors_2,
  getSecuritySensitiveSetting,
  getAllPolicyTierSettings,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
} from "../../utils/settings/settings.js";

//@ chunk-3zy56vtn.js:1728-1741 placement
var MAX_HELPER_CONCURRENCY = 10080;
//@ chunk-3zy56vtn.js:1741-1876 placement
function readHelperConcurrencyFlag(e) {
  let n;
  try {
    n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_sordino", e);
  } catch {
    n = e;
  }
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_HELPER_CONCURRENCY
    ? n
    : undefined;
}
//@ chunk-3zy56vtn.js:1924-2574 placement
/**
 * 工具宿主辅助进程的长度上限、名称格式等常量与 schema。
 */
var MAX_STATUS_LINE_CHARS = 262144;
var MAX_TOOL_LABEL_CHARS = 48;
var TOOL_LABEL_RE = /^[A-Za-z0-9_.:-]+$/;
var UNKNOWN_TOOL_LABEL = "a tool";
var MAX_STATUS_CALLS = 128;
var toolLabelSchema = DoctorLazy(() =>
  string().transform((e) => (TOOL_LABEL_RE.test(e) ? e.slice(0, MAX_TOOL_LABEL_CHARS) : UNKNOWN_TOOL_LABEL)),
);
var callIdSchema = DoctorLazy(() => string().min(1).max(256));
var liveCallSchema = DoctorLazy(() =>
  u({
    call_id: callIdSchema(),
    tool: toolLabelSchema(),
    state: _enum(["running", "asked"]),
    since: E(),
    classifier_eligible: M().optional().catch(undefined),
  }).transform((e) => ({
    callId: e.call_id,
    tool: e.tool,
    state: e.state,
    since: e.since,
    classifierEligible: e.classifier_eligible,
  })),
);
var recentCallSchema = DoctorLazy(() =>
  u({
    call_id: callIdSchema(),
    tool: toolLabelSchema(),
    ended: _enum(["completed", "denied", "withdrawn", "refused", "failed"]),
    code: string()
      .max(64)
      .regex(/^[a-z0-9_]+$/)
      .optional()
      .catch(undefined),
    at: E(),
  }).transform((e) => ({
    callId: e.call_id,
    tool: e.tool,
    ended: e.ended,
    code: e.code,
    at: e.at,
  })),
);
//@ chunk-3zy56vtn.js:2574-2710 placement
function lenientArraySchema(e) {
  return array(unknown())
    .transform((n) =>
      n.slice(0, MAX_STATUS_CALLS).flatMap((s) => {
        let c = e.safeParse(s);
        return c.success ? [c.data] : [];
      }),
    )
    .catch([]);
}
//@ chunk-3zy56vtn.js:2710-2944 placement
var cloudSessionDeltaSchema = DoctorLazy(() =>
  u({
    type: literal("system"),
    subtype: literal("cloud_session_delta"),
    cloud_session: u({
      serving: u({
        state: _enum(["on", "off", "pending", "revoked"]),
      })
        .optional()
        .catch(undefined),
      calls: u({
        live: lenientArraySchema(liveCallSchema()),
        recent: lenientArraySchema(recentCallSchema()),
      })
        .optional()
        .catch(undefined),
    }),
  }),
);
//@ chunk-3zy56vtn.js:2944-3187 placement
function parseCloudSessionDelta(e) {
  if (!e.includes("cloud_session_delta")) return;
  let n;
  try {
    n = jsonParseRaw(e);
  } catch {
    return;
  }
  let s = cloudSessionDeltaSchema().safeParse(n);
  if (!s.success) return;
  let { serving, calls } = s.data.cloud_session;
  return {
    serving: serving?.state,
    live: calls?.live ?? [],
    recent: calls?.recent ?? [],
  };
}
//@ chunk-3zy56vtn.js:3187-3468 placement
/**
 * 创建按行解析助手进程 stdout 的读取器：只处理包含 cloud_session_delta 的行并回调解析结果；单行超过上限时丢弃直到下一行。
 */
function createStatusLineReader(e) {
  let n = new StringDecoder("utf8");
  let s = "";
  let c = false;
  return function (O) {
    let C = typeof O === "string" ? O : n.write(O);
    for (;;) {
      let index = C.indexOf(`
`);
      if (index < 0) break;
      let x = s + C.slice(0, index);
      C = C.slice(index + 1);
      s = "";
      if (c) {
        c = false;
        continue;
      }
      let cloudSessionDelta = parseCloudSessionDelta(x);
      if (cloudSessionDelta !== undefined) e(cloudSessionDelta);
    }
    if (c) return;
    s += C;
    if (s.length > MAX_STATUS_LINE_CHARS) {
      s = "";
      c = true;
    }
  };
}
//@ chunk-3zy56vtn.js:3468-4426 placement
/**
 * 工具宿主助手子进程的环境裁剪：无人值守开关与会话键、要携带的登录/路径类变量、会改写登录或流量的变量（拒绝）、提供方选择变量，以及会话/环境 id 的正则。
 */
var TOOL_HOST_ENV_KEYS = "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED";
var IDLE_RELEASE_ENV_KEY = "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES";
var DEFAULT_HELPER_CONCURRENCY = 60;
var SIGTERM_GRACE_MS = 2500;
var SIGKILL_GRACE_MS = 3000;
var EXIT_DRAIN_GRACE_MS = 200;
var MAX_LINE_VALUE = 1024;
var MAX_STDERR_FIRST_LINE_CHARS = 320;
var SESSION_ID_RE = /^cse_[A-Za-z0-9_]{1,124}$/;
var ENVIRONMENT_ID_RE = /^env_[A-Za-z0-9_-]{1,124}$/;
var CARRIED_ENV_KEYS = new Set(
  [
    ...KNOWN_HOST_ENV_VARS,
    ...BG_CARRIED_ENV_KEYS_2,
    ...subprocessEnv_2([
      ...CREDENTIAL_SCRUB_VARS_WITH_INPUT,
      ...PROVIDER_CREDENTIAL_ENV_VARS,
      "CLAUDE_BRIDGE_OAUTH_TOKEN",
    ]),
    ...BASE_URL_ENV_VARS.filter((e) => e !== "ANTHROPIC_BASE_URL"),
    "CLAUDE_BRIDGE_BASE_URL",
    "CLAUDE_BRIDGE_SESSION_INGRESS_URL",
    "CLAUDE_REMOTE_TOOLS_BRIDGE_URL",
    "CLAUDE_BG_AUTH_SNAPSHOT_PATH",
    "CLAUDE_CODE_ACCOUNT_UUID",
    "CLAUDE_CODE_ORGANIZATION_UUID",
    "CLAUDE_CODE_USER_EMAIL",
    "CLAUDE_CODE_ENVIRONMENT_KIND",
    "CLAUDE_CODE_SESSION_KIND",
    "CLAUDE_BG_SESSION_PERMISSION_RULES",
    "CLAUDE_JOB_DIR",
  ].map((e) => envVarToUpperSnake(e)),
);
var HOST_MARKER_ENV_KEYS = new Set([...HOST_MANAGED_MARKER_ENV_VARS, "CLAUDE_CODE_HOST_CREDS_FILE"]);
var BLOCKED_TRAFFIC_ENV_KEYS = new Set([
  ...HOST_MARKER_ENV_KEYS,
  "ANTHROPIC_FEDERATION_RULE_ID",
  "ANTHROPIC_ORGANIZATION_ID",
  "ANTHROPIC_PROFILE",
  "ANTHROPIC_CONFIG_DIR",
]);
var PROVIDER_SELECTION_ENV_KEYS = new Set([
  ...PROVIDER_SELECTION_ENV_VARS.filter((e) => e.startsWith("CLAUDE_CODE_USE_")),
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
]);
//@ chunk-3zy56vtn.js:4426-5014 placement
/**
 * 为工具宿主助手子进程构造环境：要求能锚定到已存储登录，拒绝会把登录或流量导向别处的变量，删除内部/文件描述符变量；可选去掉 shell 密钥类变量，写入无人值守授权与并发上限。
 */
function buildToolHostHelperEnv(env_2, { unattendedGrant, withoutShellSecrets, guest, testVm }) {
  let O = isAlwaysTrue() ? isRemoteToolsPinStoredLogin() : undefined;
  if (O === undefined) throw storedLoginUnsupportedError();
  let C = envVarToUpperSnake(O);
  let b = envVarToUpperSnake(TOOL_HOST_ENV_KEYS);
  let x = envVarToUpperSnake(IDLE_RELEASE_ENV_KEY);
  let sanitizedEnv = {
    ...env_2,
  };
  for (let [key, value] of Object.entries(sanitizedEnv)) {
    let normalizedName = envVarToUpperSnake(key);
    if (HOST_MARKER_ENV_KEYS.has(normalizedName) && envRedirectsSignInOrTraffic(normalizedName, value, env_2))
      throw redirectedSignInError();
    if (
      CARRIED_ENV_KEYS.has(normalizedName) ||
      normalizedName === C ||
      normalizedName === b ||
      normalizedName === x ||
      normalizedName.endsWith("_FILE_DESCRIPTOR")
    )
      delete sanitizedEnv[key];
  }
  stripCoworkHostEnvKeys(sanitizedEnv);
  stripInternalEntrypoint(sanitizedEnv);
  sanitizedEnv[O] = "1";
  if (withoutShellSecrets) {
    let W = new Set(declaredEnvVarNames(env));
    for (let S of listSecretEnvNames(sanitizedEnv))
      if (!(/^(?:CLAUDE|ANTHROPIC)_/.test(S) && W.has(S))) delete sanitizedEnv[S];
    delete sanitizedEnv.SSH_AGENT_PID;
    Object.assign(sanitizedEnv, sanitizeEnvCredentials(sanitizedEnv).respelled);
  }
  if (unattendedGrant !== undefined) sanitizedEnv[TOOL_HOST_ENV_KEYS] = unattendedGrant;
  let helperConcurrencyFlag = readHelperConcurrencyFlag(DEFAULT_HELPER_CONCURRENCY);
  if (helperConcurrencyFlag !== undefined) sanitizedEnv[IDLE_RELEASE_ENV_KEY] = String(helperConcurrencyFlag);
  return sanitizedEnv;
}
//@ chunk-3zy56vtn.js:5014-5320 placement
/**
 * 构造发给工具宿主辅助进程的 initialize 控制请求行；请求 id 不合法时不带上。
 */
function buildInitializeRequestLine({ workId, environmentId }, requestId) {
  let c = SESSION_ID_RE.test(workId) && ENVIRONMENT_ID_RE.test(environmentId);
  if (!c)
    logForDebugging("[tool-host] the request ids are not in a usable form; starting the helper without them");
  return (
    jsonStringify({
      type: "control_request",
      request_id: requestId,
      request: {
        subtype: "initialize",
        ...(c && {
          attachServeRequest: {
            workId,
            environmentId,
          },
        }),
      },
    }) +
    `
`
  );
}
//@ chunk-3zy56vtn.js:5320-5665 placement
/**
 * 检查能否启动工具宿主辅助进程：环境变量不能把登录或流量指向别处。
 */
function checkToolHostHelperPreconditions(e) {
  if (!isAlwaysTrue()) return storedLoginUnsupportedError();
  for (let [key, value] of Object.entries(e)) {
    let w = envVarToUpperSnake(key);
    if (envRedirectsSignInOrTraffic(w, value, e)) {
      logForDebugging(
        `[tool-host] no helper: ${w} says this process signs in or sends its traffic elsewhere`,
        {
          level: "error",
        },
      );
      return redirectedSignInError();
    }
  }
  let n = processWrapperError();
  if (n) {
    logForDebugging(`[tool-host] ${n}`, {
      level: "error",
    });
    return Error("tool host helper: the process wrapper is not usable");
  }
  return;
}
//@ chunk-3zy56vtn.js:5665-7769 placement
/**
 * 启动工具宿主助手进程（--attach-serve、stream-json）
 */
function spawnToolHostHelper(
  e,
  {
    env,
    unattendedGrant,
    withoutShellSecrets,
    guest,
    testVm,
    selfInvocation = () =>
      getLaunchCommand({
        pinToCurrentBinary: true,
      }),
    spawn = safeSpawn,
    after = afterMs,
    killTree = killProcessGroup,
  },
) {
  let V = checkToolHostHelperPreconditions(env);
  if (V !== undefined) throw V;
  if (!SESSION_ID_RE.test(e.sessionId)) throw Error("tool host helper: the session id is not usable");
  let W = selfInvocation();
  let S = spawn(
    W.cmd,
    [
      ...W.prefixArgs,
      "--attach-serve",
      e.sessionId,
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
    ],
    {
      cwd: e.folder,
      env: buildToolHostHelperEnv(env, {
        unattendedGrant,
        withoutShellSecrets,
        ...(guest !== undefined && {
          guest,
        }),
        ...(testVm !== undefined && {
          testVm,
        }),
      }),
      extendEnv: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      toolCgroupClass: "agent",
    },
  );
  let { promise, resolve } = Promise.withResolvers();
  let te = [];
  let j = false;
  let ee = Buffer.alloc(0);
  let K = 0;
  let H;
  let L = () => {};
  function Z(code, signal) {
    if (j) return;
    j = true;
    L();
    let P = redactIds(stripIgnorables(getFirstLine(ee.toString("utf8"))));
    resolve({
      code,
      signal,
      stderrFirstLine: P === "" ? undefined : truncateToLength(P, MAX_STDERR_FIRST_LINE_CHARS),
    });
  }
  try {
    S.on("exit", (code, signal) => {
      H = [code, signal];
      if (K <= 0) {
        Z(code, signal);
        return;
      }
      L = after(EXIT_DRAIN_GRACE_MS, () => Z(code, signal));
    });
    S.on("error", (R) => {
      logForDebugging(`[tool-host] helper process error: ${redactIds(errorMessage(R))}`);
      if (!j) {
        Z(null, null);
        killQuietly(S, "SIGKILL");
      }
    });
    for (let R of [S.stdin, S.stdout, S.stderr]) R?.on("error", () => {});
    for (let R of [S.stdout, S.stderr])
      if (R !== null && !R.readableEnded) {
        K += 1;
        R.once("end", () => {
          K -= 1;
          if (H !== undefined && K <= 0) Z(...H);
        });
      }
    let statusLineReader = createStatusLineReader((R) => {
      for (let P of te)
        try {
          P(R);
        } catch (error) {
          logForDebugging(`[tool-host] status listener failed: ${redactIds(errorMessage(error))}`);
        }
    });
    S.stdout?.on("data", (R) => {
      if (te.length > 0) statusLineReader(R);
    });
    S.stderr?.on("data", (R) => {
      let P = MAX_LINE_VALUE - ee.length;
      if (P > 0) {
        let Q = typeof R === "string" ? Buffer.from(R) : R;
        ee = Buffer.concat([ee, Q.subarray(0, P)]);
      }
    });
    if (S.pid === undefined || S.stdin === null) Z(null, null);
    else S.stdin.write(buildInitializeRequestLine(e, randomUUID()));
  } catch (error) {
    killQuietly(S, "SIGKILL");
    throw error;
  }
  let Y;
  return {
    pid: S.pid,
    exited: promise,
    onStatus(B) {
      te.push(B);
    },
    stop(B) {
      if (j) return Promise.resolve();
      Y ??= new Promise((resolve) => {
        logForDebugging(`[tool-host] stopping helper (${B})`);
        let P = getPlatform() === "windows";
        let Q = B === "released";
        try {
          if (Q)
            S.stdin?.write(
              jsonStringify({
                type: "control_request",
                request_id: randomUUID(),
                request: {
                  subtype: "end_session",
                  reason: RELEASED,
                },
              }) +
                `
`,
            );
          S.stdin?.end();
        } catch {}
        if (!P && !Q) killQuietly(S, "SIGTERM");
        let fe = after(SIGTERM_GRACE_MS, () => {
          if (P && S.pid !== undefined) killTree(S.pid).catch(() => {});
          else killQuietly(S, "SIGKILL");
        });
        let ue = after(SIGKILL_GRACE_MS, resolve);
        promise.then(() => {
          fe();
          ue();
          resolve();
        });
      });
      return Y;
    },
  };
}
//@ chunk-3zy56vtn.js:7769-7904 placement
function redactIds(e) {
  return e.replace(
    /(?:cse|session|env)_[A-Za-z0-9_-]{16,}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g,
    "<id>",
  );
}
//@ chunk-3zy56vtn.js:7904-8062 placement
function envRedirectsSignInOrTraffic(e, n, s) {
  if (!n) return false;
  if (PROVIDER_SELECTION_ENV_KEYS.has(e)) return isEnvTruthy(n);
  return (
    BLOCKED_TRAFFIC_ENV_KEYS.has(e) ||
    (e === "ANTHROPIC_BASE_URL" && !isAcceptableBaseUrl(n, s)) ||
    (e.startsWith("CLAUDE_LOCAL_OAUTH_") && !isLoopbackUrl(n))
  );
}
//@ chunk-3zy56vtn.js:8062-8162 placement
function storedLoginUnsupportedError() {
  return Error("tool host helper: this build cannot hold a helper to the stored login");
}
//@ chunk-3zy56vtn.js:8162-8263 placement
function redirectedSignInError() {
  return Error("tool host helper: this process signs in or sends its traffic elsewhere");
}
//@ chunk-3zy56vtn.js:8318-8389 placement
function isAcceptableBaseUrl(e, n) {
  if (isFirstPartyAnthropicHost(e)) return true;
  return isEnvTruthy(n.USE_LOCAL_OAUTH) && isLoopbackUrl(e);
}
//@ chunk-3zy56vtn.js:8389-8494 placement
function isLoopbackUrl(e) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(e).hostname);
  } catch {
    return false;
  }
}
//@ chunk-3zy56vtn.js:8494-8570 placement
function afterMs(e, n) {
  let timer = setTimeout(n, e);
  timer.unref();
  return () => clearTimeout(timer);
}
//@ chunk-3zy56vtn.js:8570-8660 placement
function killQuietly(e, n) {
  try {
    e.kill(n);
  } catch (error) {
    logForDebugging(`[tool-host] ${n} not delivered: ${redactIds(errorMessage(error))}`);
  }
}
//@ chunk-3zy56vtn.js:8660-8742 placement
var MAX_ACTIVE_HELPERS = 4;
var MIN_HEALTHY_RUN_MS = 30000;
var SERVING_OFF_MEMORY_MS = 600000;
var MAX_REFUSALS_PER_ENV = 3;
var MAX_REFUSALS_TOTAL = 10;
var MAX_ACK_RETRIES = 3;
var REFUSE_REPORT_TIMEOUT_MS = 2500;
var DEFAULT_RETRY_AFTER_MS = 5000;
var MAX_RETRY_AFTER_MS = 30000;
var MAX_TRACKED_IDENTITIES = 64;
var MAX_ENVIRONMENT_ID_CHARS = 128;
//@ chunk-3zy56vtn.js:8742-13508 placement
/**
 * 工具宿主助手主循环：处理队列条目、环境 id 校验、结果回传
 */
function runToolHostLoop(e) {
  let now = e.now ?? Date.now;
  let s = new Map();
  let c = new Set();
  let w = new Map();
  let O = 0;
  let C = new Set();
  let b = new Map();
  let x = new Map();
  let y = [];
  let { NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number;
  let S = 0;
  let ordinal = 0;
  let G = new Map();
  let te = 0;
  async function j(r, a) {
    if (a.signal.aborted) return "unsettled";
    let f = safeWorkId(r, a);
    if (f === undefined) {
      logForDebugging("[tool-host] item or environment id unusable; item left");
      return "unsettled";
    }
    if (s.has(f) || [...C].some((re) => re.workId === f)) {
      K(a, f);
      return "handled";
    }
    if (c.has(f)) return "unsettled";
    let id = typeof r.data === "object" && r.data !== null && "id" in r.data ? r.data.id : undefined;
    let X = typeof id === "string" && SESSION_ID_RE.test(id) ? decodeTaggedUuid(id) : undefined;
    if (typeof id !== "string" || X === undefined || X === decodeTaggedUuid(f)) {
      logForDebugging("[tool-host] session id unusable; item stopped");
      setBounded(s, f, true);
      K(a, f);
      return "handled";
    }
    let ce = ee(id);
    if (ce !== undefined) return H(a, f, id, ce);
    if (now() < O) return "unsettled";
    c.add(f);
    try {
      await e.api.acknowledgeWork(a.environmentId, f, a.environmentSecret, hashIdForLog(f));
    } catch (error) {
      if (L(error, f) !== "give_up") return "unsettled";
      let Ee = statusOfError(error);
      return H(a, f, id, "start_failed", Ee === 404 || Ee === 409 || Ee === 410);
    } finally {
      c.delete(f);
    }
    w.delete(f);
    let z = a.signal.aborted ? "start_failed" : ee(id);
    if (z !== undefined) return H(a, f, id, z);
    setBounded(s, f, true);
    let startedAt = now();
    let le;
    try {
      le = e.spawnHelper({
        sessionId: id,
        workId: f,
        environmentId: a.environmentId,
        folder: e.folder,
      });
    } catch (error) {
      logForDebugging(`[tool-host] helper not started: ${redactIds(errorMessage(error))}`, {
        level: "error",
      });
      fe(id);
      return H(a, f, id, "start_failed");
    }
    let ae = b.get(id);
    ordinal += 1;
    let pe = G.get(id);
    if (pe === undefined) {
      te += 1;
      pe = te;
      setBounded(G, id, pe);
    }
    let q = {
      ordinal,
      sessionOrdinal: pe,
      sessionId: id,
      workId: f,
      startedAt,
      handle: le,
      stoppedHere: false,
      startedTimer: undefined,
    };
    q.startedTimer = setTimeout(Q, MIN_HEALTHY_RUN_MS, q);
    q.startedTimer.unref?.();
    C.add(q);
    b.set(id, q);
    if (ae !== undefined) {
      B(ae);
      runLogged("supersede", async () => {
        await ae.handle.stop("superseded");
        Y(ae);
      });
    }
    P();
    runLogged("exit", async () => Z(q, await le.exited));
    if (e.onEvent !== undefined)
      le.onStatus((status) => {
        if (!q.stoppedHere && C.has(q))
          R({
            kind: "status",
            helper: q.ordinal,
            session: q.sessionOrdinal,
            status,
          });
      });
    K(a, f);
    runLogged("status line", () => e.logger.logStatus(`Serving tools to a cloud session in ${e.folder}`));
    R({
      kind: "started",
      helper: q.ordinal,
      session: q.sessionOrdinal,
    });
    return "handled";
  }
  function ee(id) {
    if (!readSwitchSafely(e.switches.gateOn)) return "gate_off";
    if (!readSwitchSafely(e.switches.servingOn) || now() - NEGATIVE_INFINITY_2 < SERVING_OFF_MEMORY_MS)
      return "serving_off";
    if (!readSwitchSafely(e.switches.folderServed)) return "not_served";
    let a = now() - SERVING_OFF_MEMORY_MS;
    let f = x.get(id) ?? [];
    if (count(f, (X) => X > a) >= MAX_REFUSALS_PER_ENV || count(y, (X) => X > a) >= MAX_REFUSALS_TOTAL)
      return "at_capacity";
    let h = b.has(id) ? 1 : 0;
    return C.size - h >= MAX_ACTIVE_HELPERS ? "at_capacity" : undefined;
  }
  function K(r, a) {
    runLogged("stop", () => e.api.stopWork(r.environmentId, a, r.environmentSecret, true, hashIdForLog(a)));
  }
  function H(r, a, id, h, X = false) {
    setBounded(s, a, true);
    if (!X) {
      ue(id, a, h);
      R({
        kind: "refused",
        code: h,
      });
    }
    K(r, a);
    logFeatureBad("bridge_tool_host_work", X ? "withdrawn" : h);
    return "handled";
  }
  function L(error, a) {
    let f = statusOfError(error);
    logForDebugging(`[tool-host] acknowledge failed (${f ?? "no response"})`);
    if (f === 429) O = now() + Math.min(retryAfterMsOf(error) ?? DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
    let h = (w.get(a) ?? 0) + 1;
    if (hasFatalClientStatus(error) || h >= MAX_ACK_RETRIES) {
      w.delete(a);
      return "give_up";
    }
    setBounded(w, a, h);
    return "retry";
  }
  function Z(r, exited) {
    let f = now() - r.startedAt;
    let h = !r.stoppedHere && exited.code !== 0;
    let X = h && exited.code === EXIT_CONFIG_ERROR;
    let ce = X && now() - NEGATIVE_INFINITY < SERVING_OFF_MEMORY_MS;
    if (X) NEGATIVE_INFINITY = now();
    let z = !h ? undefined : ce ? "serving_off" : f < MIN_HEALTHY_RUN_MS ? "start_failed" : "helper_exited";
    if (z === "start_failed") fe(r.sessionId);
    if (z === "serving_off") NEGATIVE_INFINITY_2 = now();
    if (z === "start_failed" || z === "serving_off") Q(r, z);
    Y(r);
    if (z !== undefined) ue(r.sessionId, r.workId, z);
    R({
      kind: "ended",
      helper: r.ordinal,
      session: r.sessionOrdinal,
      code: z,
      stoppedHere: r.stoppedHere,
    });
    let ge = exited.signal ?? `exit code ${exited.code ?? "none"}`;
    let le = z === undefined ? "" : `, reported as ${z}`;
    let ae = h && exited.stderrFirstLine !== undefined ? `: ${exited.stderrFirstLine}` : "";
    e.logger.logVerbose(
      `Tool helper for a cloud session ended (pid ${r.handle.pid ?? "none"}, ${ge}, after ${Math.round(f / 1000)}s${le}${ae})`,
    );
  }
  function Y(r) {
    Q(r);
    C.delete(r);
    if (b.get(r.sessionId) === r) b.delete(r.sessionId);
    P();
  }
  function B(r) {
    r.stoppedHere = true;
    R({
      kind: "stopping",
      helper: r.ordinal,
      session: r.sessionOrdinal,
    });
  }
  function R(r) {
    runLogged("event", () => e.onEvent?.(r));
  }
  function P() {
    let r = 0;
    for (let a of C) if (!a.stoppedHere) r += 1;
    if (r === S) return;
    S = r;
    runLogged("live count report", () => e.onLiveCountChange(r));
  }
  function Q(r, a) {
    if (r.startedTimer === undefined) return;
    clearTimeout(r.startedTimer);
    r.startedTimer = undefined;
    if (a === undefined) logFeatureOk("bridge_tool_host_work");
    else logFeatureBad("bridge_tool_host_work", a);
  }
  function fe(r) {
    let a = now();
    y = y.concat(a).slice(-MAX_REFUSALS_TOTAL);
    let f = x.get(r) ?? [];
    x.delete(r);
    setBounded(x, r, f.concat(a).slice(-MAX_REFUSALS_PER_ENV));
  }
  function ue(sessionId, workId, f) {
    runLogged("report", () =>
      e.api.refuseToolHost?.(sessionId, workId, f, AbortSignal.timeout(REFUSE_REPORT_TIMEOUT_MS)),
    );
  }
  return {
    async handle(r, a) {
      try {
        return await j(r, a);
      } catch (error) {
        logFeatureBad("bridge_tool_host_work", "handler_threw");
        logForDebugging(
          `[tool-host] handling a request failed unexpectedly (${describeErrorStatus(error)})`,
          {
            level: "error",
          },
        );
        try {
          let h = safeWorkId(r, a);
          if (h !== undefined) {
            setBounded(s, h, true);
            K(a, h);
            return "handled";
          }
        } catch {}
        return "unsettled";
      }
    },
    async sweep(r) {
      let a = r === "gate_off" ? "gate_off" : "helper_exited";
      await Promise.allSettled(
        [...C].map(async (f) => {
          if (!f.stoppedHere) {
            ue(f.sessionId, f.workId, a);
            B(f);
            P();
          }
          await f.handle.stop(r);
          Y(f);
        }),
      );
    },
    liveCount: () => C.size,
  };
}
//@ chunk-3zy56vtn.js:13508-13614 placement
function safeWorkId(e, n) {
  let id = e.id;
  return typeof id === "string" &&
    id.length <= MAX_ENVIRONMENT_ID_CHARS &&
    isSafeBridgeId(id) &&
    isSafeBridgeId(n.environmentId)
    ? id
    : undefined;
}
//@ chunk-3zy56vtn.js:13614-13710 placement
function runLogged(e, n) {
  (async () => {
    try {
      await n();
    } catch (error) {
      logForDebugging(`[tool-host] ${e} failed (${describeErrorStatus(error)})`);
    }
  })();
}
//@ chunk-3zy56vtn.js:13710-13814 placement = STATUS_TAG (1)
/**
 * 错误带数字 status 时返回 "status N"，否则错误名或 "unknown"。旧版名 STATUS_TAG 为错配。
 */
function describeErrorStatus(error) {
  let n = statusOfError(error);
  if (n !== undefined) return `status ${n}`;
  return error instanceof Error ? error.name : "unknown";
}
//@ chunk-3zy56vtn.js:13814-13951 placement
function readSwitchSafely(e) {
  try {
    return e();
  } catch (error) {
    logForDebugging(
      `[tool-host] a switch could not be read, taken as off: ${redactIds(errorMessage(error))}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-3zy56vtn.js:13951-14037 placement
function setBounded(e, n, s) {
  e.set(n, s);
  for (let key of e.keys()) {
    if (e.size <= MAX_TRACKED_IDENTITIES) break;
    e.delete(key);
  }
}
//@ chunk-3zy56vtn.js:14037-14147 placement
function statusOfError(e) {
  return typeof e === "object" && e !== null && "status" in e && typeof e.status === "number"
    ? e.status
    : undefined;
}
//@ chunk-3zy56vtn.js:14147-14494 placement
/**
 * 判断设置是否禁止 Remote Control：任一层 disableRemoteControl 为 true，或策略/flag/用户设置存在影响该键的解析错误时视为禁用。
 */
function isRemoteControlDisabledBySettings() {
  invalidateCommandNames();
  if (
    getSettingsWithErrors_2().settings.disableRemoteControl === true ||
    getSecuritySensitiveSetting("disableRemoteControl").some((e) => e === true) ||
    getAllPolicyTierSettings().some((e) => e.disableRemoteControl === true)
  )
    return true;
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
  ].some((e) => {
    if (e.path === "") return true;
    if (e.statusOnly) return false;
    return e.severity !== "warning" || e.path === "disableRemoteControl";
  });
}
export {
  isRemoteControlDisabledBySettings,
  checkToolHostHelperPreconditions,
  runToolHostLoop,
  spawnToolHostHelper,
  SIGKILL_GRACE_MS,
};
