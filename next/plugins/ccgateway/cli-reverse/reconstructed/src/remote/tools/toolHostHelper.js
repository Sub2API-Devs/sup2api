/**
 * remote/tools/toolHostHelper.ts
 *
 * 工具宿主助手进程（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3emqeq9c.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { StringDecoder } from "string_decoder";
import { randomUUID } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  _enum,
  numberSchema,
  booleanSchema,
  array,
  unknown,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { countWhere } from "../../utils/collections.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { retryAfterMsOf, hasFatalClientStatus } from "../../bridge/bridgeMain.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { isSafeBridgeId } from "../../bridge/sessionIdCompat.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  getSettingsWithErrors,
  getSecuritySensitiveSetting,
  getAllPolicyTierSettings,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
} from "../../utils/settings/settings.js";

//@ chunk-3emqeq9c.js:1798-1811 placement
var MAX_HELPER_CONCURRENCY = 10080;
//@ chunk-3emqeq9c.js:1811-1946 placement
function readHelperConcurrencyFlag(fallback) {
  let value;
  try {
    value = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_sordino", fallback);
  } catch {
    value = fallback;
  }
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_HELPER_CONCURRENCY
    ? value
    : undefined;
}
//@ chunk-3emqeq9c.js:1994-2644 placement
/**
 * 工具宿主辅助进程的长度上限、名称格式等常量与 schema。
 */
var MAX_STATUS_LINE_CHARS = 262144;
var MAX_TOOL_LABEL_CHARS = 48;
var TOOL_LABEL_RE = /^[A-Za-z0-9_.:-]+$/;
var UNKNOWN_TOOL_LABEL = "a tool";
var MAX_STATUS_CALLS = 128;
var toolLabelSchema = DoctorLazy(() =>
  stringSchema().transform((label) =>
    TOOL_LABEL_RE.test(label) ? label.slice(0, MAX_TOOL_LABEL_CHARS) : UNKNOWN_TOOL_LABEL,
  ),
);
var callIdSchema = DoctorLazy(() => stringSchema().min(1).max(256));
var liveCallSchema = DoctorLazy(() =>
  objectSchema({
    call_id: callIdSchema(),
    tool: toolLabelSchema(),
    state: _enum(["running", "asked"]),
    since: numberSchema(),
    classifier_eligible: booleanSchema().optional().catch(undefined),
  }).transform((parsed) => ({
    callId: parsed.call_id,
    tool: parsed.tool,
    state: parsed.state,
    since: parsed.since,
    classifierEligible: parsed.classifier_eligible,
  })),
);
var recentCallSchema = DoctorLazy(() =>
  objectSchema({
    call_id: callIdSchema(),
    tool: toolLabelSchema(),
    ended: _enum(["completed", "denied", "withdrawn", "refused", "failed"]),
    code: stringSchema()
      .max(64)
      .regex(/^[a-z0-9_]+$/)
      .optional()
      .catch(undefined),
    at: numberSchema(),
  }).transform((parsed) => ({
    callId: parsed.call_id,
    tool: parsed.tool,
    ended: parsed.ended,
    code: parsed.code,
    at: parsed.at,
  })),
);
//@ chunk-3emqeq9c.js:2644-2780 placement
function lenientArraySchema(itemSchema) {
  return array(unknown())
    .transform((items) =>
      items.slice(0, MAX_STATUS_CALLS).flatMap((item) => {
        let parsed = itemSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }),
    )
    .catch([]);
}
//@ chunk-3emqeq9c.js:2780-3014 placement
var cloudSessionDeltaSchema = DoctorLazy(() =>
  objectSchema({
    type: literal("system"),
    subtype: literal("cloud_session_delta"),
    cloud_session: objectSchema({
      serving: objectSchema({
        state: _enum(["on", "off", "pending", "revoked"]),
      })
        .optional()
        .catch(undefined),
      calls: objectSchema({
        live: lenientArraySchema(liveCallSchema()),
        recent: lenientArraySchema(recentCallSchema()),
      })
        .optional()
        .catch(undefined),
    }),
  }),
);
//@ chunk-3emqeq9c.js:3014-3257 placement
function parseCloudSessionDelta(line) {
  if (!line.includes("cloud_session_delta")) return;
  let parsedJson;
  try {
    parsedJson = jsonParseRaw(line);
  } catch {
    return;
  }
  let parsed = cloudSessionDeltaSchema().safeParse(parsedJson);
  if (!parsed.success) return;
  let { serving, calls } = parsed.data.cloud_session;
  return {
    serving: serving?.state,
    live: calls?.live ?? [],
    recent: calls?.recent ?? [],
  };
}
//@ chunk-3emqeq9c.js:3257-3538 placement
/**
 * 创建按行解析助手进程 stdout 的读取器：只处理包含 cloud_session_delta 的行并回调解析结果；单行超过上限时丢弃直到下一行。
 */
function createStatusLineReader(options) {
  let decoder = new StringDecoder("utf8");
  let buffer = "";
  let ended = false;
  return function (chunk) {
    let text = typeof chunk === "string" ? chunk : decoder.write(chunk);
    for (;;) {
      let index = text.indexOf(`
`);
      if (index < 0) break;
      let line = buffer + text.slice(0, index);
      text = text.slice(index + 1);
      buffer = "";
      if (ended) {
        ended = false;
        continue;
      }
      let cloudSessionDelta = parseCloudSessionDelta(line);
      if (cloudSessionDelta !== undefined) options(cloudSessionDelta);
    }
    if (ended) return;
    buffer += text;
    if (buffer.length > MAX_STATUS_LINE_CHARS) {
      buffer = "";
      ended = true;
    }
  };
}
//@ chunk-3emqeq9c.js:3538-4496 placement
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
    ...BASE_URL_ENV_VARS.filter((envName) => envName !== "ANTHROPIC_BASE_URL"),
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
  ].map((envName) => envVarToUpperSnake(envName)),
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
  ...PROVIDER_SELECTION_ENV_VARS.filter((envName) => envName.startsWith("CLAUDE_CODE_USE_")),
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
]);
//@ chunk-3emqeq9c.js:4496-5085 placement
/**
 * 为工具宿主助手子进程构造环境：要求能锚定到已存储登录，拒绝会把登录或流量导向别处的变量，删除内部/文件描述符变量；可选去掉 shell 密钥类变量，写入无人值守授权与并发上限。
 */
function buildToolHostHelperEnv(env_2, { unattendedGrant, withoutShellSecrets, guest, testVm }) {
  let pinEnvName = isAlwaysTrue() ? isRemoteToolsPinStoredLogin() : undefined;
  if (pinEnvName === undefined) throw storedLoginUnsupportedError();
  let pinEnvNameUpper = envVarToUpperSnake(pinEnvName);
  let grantEnvName = envVarToUpperSnake(TOOL_HOST_ENV_KEYS);
  let idleReleaseEnvName = envVarToUpperSnake(IDLE_RELEASE_ENV_KEY);
  let sanitizedEnv = {
    ...env_2,
  };
  for (let [key, value] of Object.entries(sanitizedEnv)) {
    let normalizedName = envVarToUpperSnake(key);
    if (HOST_MARKER_ENV_KEYS.has(normalizedName) && envRedirectsSignInOrTraffic(normalizedName, value, env_2))
      throw redirectedSignInError();
    if (
      CARRIED_ENV_KEYS.has(normalizedName) ||
      normalizedName === pinEnvNameUpper ||
      normalizedName === grantEnvName ||
      normalizedName === idleReleaseEnvName ||
      normalizedName.endsWith("_FILE_DESCRIPTOR")
    )
      delete sanitizedEnv[key];
  }
  stripCoworkHostEnvKeys(sanitizedEnv);
  stripInternalEntrypoint(sanitizedEnv);
  sanitizedEnv[pinEnvName] = "1";
  if (withoutShellSecrets) {
    let declaredNames = new Set(declaredEnvVarNames(env));
    for (let secretName of listSecretEnvNames(sanitizedEnv))
      if (!(/^(?:CLAUDE|ANTHROPIC)_/.test(secretName) && declaredNames.has(secretName)))
        delete sanitizedEnv[secretName];
    delete sanitizedEnv.SSH_AGENT_PID;
    Object.assign(sanitizedEnv, sanitizeEnvCredentials(sanitizedEnv).respelled);
  }
  if (unattendedGrant !== undefined) sanitizedEnv[TOOL_HOST_ENV_KEYS] = unattendedGrant;
  let helperConcurrencyFlag = readHelperConcurrencyFlag(DEFAULT_HELPER_CONCURRENCY);
  if (helperConcurrencyFlag !== undefined) sanitizedEnv[IDLE_RELEASE_ENV_KEY] = String(helperConcurrencyFlag);
  return sanitizedEnv;
}
//@ chunk-3emqeq9c.js:5085-5391 placement
/**
 * 构造发给工具宿主辅助进程的 initialize 控制请求行；请求 id 不合法时不带上。
 */
function buildInitializeRequestLine({ workId, environmentId }, requestId) {
  let idsOk = SESSION_ID_RE.test(workId) && ENVIRONMENT_ID_RE.test(environmentId);
  if (!idsOk)
    logForDebugging("[tool-host] the request ids are not in a usable form; starting the helper without them");
  return (
    jsonStringify({
      type: "control_request",
      request_id: requestId,
      request: {
        subtype: "initialize",
        ...(idsOk && {
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
//@ chunk-3emqeq9c.js:5391-5736 placement
/**
 * 检查能否启动工具宿主辅助进程：环境变量不能把登录或流量指向别处。
 */
function checkToolHostHelperPreconditions(envVars) {
  if (!isAlwaysTrue()) return storedLoginUnsupportedError();
  for (let [key, value] of Object.entries(envVars)) {
    let name = envVarToUpperSnake(key);
    if (envRedirectsSignInOrTraffic(name, value, envVars)) {
      logForDebugging(
        `[tool-host] no helper: ${name} says this process signs in or sends its traffic elsewhere`,
        {
          level: "error",
        },
      );
      return redirectedSignInError();
    }
  }
  let wrapperError = processWrapperError();
  if (wrapperError) {
    logForDebugging(`[tool-host] ${wrapperError}`, {
      level: "error",
    });
    return Error("tool host helper: the process wrapper is not usable");
  }
  return;
}
//@ chunk-3emqeq9c.js:5736-7846 placement
/**
 * 启动工具宿主助手进程（--attach-serve、stream-json）
 */
function spawnToolHostHelper(
  work,
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
  let preconditionError = checkToolHostHelperPreconditions(env);
  if (preconditionError !== undefined) throw preconditionError;
  if (!SESSION_ID_RE.test(work.sessionId)) throw Error("tool host helper: the session id is not usable");
  let invocation = selfInvocation();
  let child = spawn(
    invocation.cmd,
    [
      ...invocation.prefixArgs,
      "--attach-serve",
      work.sessionId,
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
    ],
    {
      cwd: work.folder,
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
  let statusListeners = [];
  let exited = false;
  let stderrFirstLineBuf = Buffer.alloc(0);
  let openStreams = 0;
  let exitCodeSignal;
  let cancelDrainGrace = () => {};
  function finishExit(code, signal) {
    if (exited) return;
    exited = true;
    cancelDrainGrace();
    let stderrFirstLine = redactIds(stripIgnorables(getFirstLine(stderrFirstLineBuf.toString("utf8"))));
    resolve({
      code,
      signal,
      stderrFirstLine:
        stderrFirstLine === "" ? undefined : truncateToLength(stderrFirstLine, MAX_STDERR_FIRST_LINE_CHARS),
    });
  }
  try {
    child.on("exit", (code, signal) => {
      exitCodeSignal = [code, signal];
      if (openStreams <= 0) {
        finishExit(code, signal);
        return;
      }
      cancelDrainGrace = after(EXIT_DRAIN_GRACE_MS, () => finishExit(code, signal));
    });
    child.on("error", (error) => {
      logForDebugging(`[tool-host] helper process error: ${redactIds(errorMessage(error))}`);
      if (!exited) {
        finishExit(null, null);
        killQuietly(child, "SIGKILL");
      }
    });
    for (let stream of [child.stdin, child.stdout, child.stderr]) stream?.on("error", () => {});
    for (let stream of [child.stdout, child.stderr])
      if (stream !== null && !stream.readableEnded) {
        openStreams += 1;
        stream.once("end", () => {
          openStreams -= 1;
          if (exitCodeSignal !== undefined && openStreams <= 0) finishExit(...exitCodeSignal);
        });
      }
    let statusLineReader = createStatusLineReader((statusLine) => {
      for (let listener of statusListeners)
        try {
          listener(statusLine);
        } catch (error) {
          logForDebugging(`[tool-host] status listener failed: ${redactIds(errorMessage(error))}`);
        }
    });
    child.stdout?.on("data", (chunk) => {
      if (statusListeners.length > 0) statusLineReader(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      let remaining = MAX_LINE_VALUE - stderrFirstLineBuf.length;
      if (remaining > 0) {
        let bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        stderrFirstLineBuf = Buffer.concat([stderrFirstLineBuf, bytes.subarray(0, remaining)]);
      }
    });
    if (child.pid === undefined || child.stdin === null) finishExit(null, null);
    else child.stdin.write(buildInitializeRequestLine(work, randomUUID()));
  } catch (error) {
    killQuietly(child, "SIGKILL");
    throw error;
  }
  let stopPromise;
  return {
    pid: child.pid,
    exited: promise,
    onStatus(listener) {
      statusListeners.push(listener);
    },
    stop(reason) {
      if (exited) return Promise.resolve();
      stopPromise ??= new Promise((resolve) => {
        logForDebugging(`[tool-host] stopping helper (${reason})`);
        let isWindows = getPlatform() === "windows";
        let released = reason === "released";
        try {
          if (released)
            child.stdin?.write(
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
          child.stdin?.end();
        } catch {}
        if (!isWindows && !released) killQuietly(child, "SIGTERM");
        let cancelSigtermGrace = after(SIGTERM_GRACE_MS, () => {
          if (isWindows && child.pid !== undefined) killTree(child.pid).catch(() => {});
          else killQuietly(child, "SIGKILL");
        });
        let cancelSigkillGrace = after(SIGKILL_GRACE_MS, resolve);
        promise.then(() => {
          cancelSigtermGrace();
          cancelSigkillGrace();
          resolve();
        });
      });
      return stopPromise;
    },
  };
}
//@ chunk-3emqeq9c.js:7846-7981 placement
function redactIds(text) {
  return text.replace(
    /(?:cse|session|env)_[A-Za-z0-9_-]{16,}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g,
    "<id>",
  );
}
//@ chunk-3emqeq9c.js:7981-8139 placement
function envRedirectsSignInOrTraffic(name, value, envVars) {
  if (!value) return false;
  if (PROVIDER_SELECTION_ENV_KEYS.has(name)) return isEnvTruthy(value);
  return (
    BLOCKED_TRAFFIC_ENV_KEYS.has(name) ||
    (name === "ANTHROPIC_BASE_URL" && !isAcceptableBaseUrl(value, envVars)) ||
    (name.startsWith("CLAUDE_LOCAL_OAUTH_") && !isLoopbackUrl(value))
  );
}
//@ chunk-3emqeq9c.js:8139-8239 placement
function storedLoginUnsupportedError() {
  return Error("tool host helper: this build cannot hold a helper to the stored login");
}
//@ chunk-3emqeq9c.js:8239-8340 placement
function redirectedSignInError() {
  return Error("tool host helper: this process signs in or sends its traffic elsewhere");
}
//@ chunk-3emqeq9c.js:8395-8466 placement
function isAcceptableBaseUrl(url, envVars) {
  if (isFirstPartyAnthropicHost(url)) return true;
  return isEnvTruthy(envVars.USE_LOCAL_OAUTH) && isLoopbackUrl(url);
}
//@ chunk-3emqeq9c.js:8466-8571 placement
function isLoopbackUrl(url) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
//@ chunk-3emqeq9c.js:8571-8647 placement
function afterMs(ms, fn) {
  let timer = setTimeout(fn, ms);
  timer.unref();
  return () => clearTimeout(timer);
}
//@ chunk-3emqeq9c.js:8647-8737 placement
function killQuietly(child, signal) {
  try {
    child.kill(signal);
  } catch (error) {
    logForDebugging(`[tool-host] ${signal} not delivered: ${redactIds(errorMessage(error))}`);
  }
}
//@ chunk-3emqeq9c.js:8737-8819 placement
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
//@ chunk-3emqeq9c.js:8819-13589 placement
/**
 * 工具宿主助手主循环：处理队列条目、环境 id 校验、结果回传
 */
function runToolHostLoop(options) {
  let now = options.now ?? Date.now;
  let inFlight = new Map();
  let cancelled = new Set();
  let identities = new Map();
  let activeCount = 0;
  let waiters = new Set();
  let perEnvironment = new Map();
  let startedAt = new Map();
  let pending = [];
  let { NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number;
  let sequence = 0;
  let ordinal = 0;
  let sessionOrdinals = new Map();
  let nextSessionOrdinal = 0;
  async function handleWork(workItem, work) {
    if (work.signal.aborted) return "unsettled";
    let workId = safeWorkId(workItem, work);
    if (workId === undefined) {
      logForDebugging("[tool-host] item or environment id unusable; item left");
      return "unsettled";
    }
    if (inFlight.has(workId) || [...waiters].some((waiter) => waiter.workId === workId)) {
      acknowledge(work, workId);
      return "handled";
    }
    if (cancelled.has(workId)) return "unsettled";
    let id =
      typeof workItem.data === "object" && workItem.data !== null && "id" in workItem.data
        ? workItem.data.id
        : undefined;
    let decodedId = typeof id === "string" && SESSION_ID_RE.test(id) ? decodeTaggedUuid(id) : undefined;
    if (typeof id !== "string" || decodedId === undefined || decodedId === decodeTaggedUuid(workId)) {
      logForDebugging("[tool-host] session id unusable; item stopped");
      setBounded(inFlight, workId, true);
      acknowledge(work, workId);
      return "handled";
    }
    let refusalCode = refusalCodeFor(id);
    if (refusalCode !== undefined) return refuseWork(work, workId, id, refusalCode);
    if (now() < activeCount) return "unsettled";
    cancelled.add(workId);
    try {
      await options.api.acknowledgeWork(
        work.environmentId,
        workId,
        work.environmentSecret,
        hashIdForLog(workId),
      );
    } catch (error) {
      if (handleAckFailure(error, workId) !== "give_up") return "unsettled";
      let status = statusOfError(error);
      return refuseWork(work, workId, id, "start_failed", status === 404 || status === 409 || status === 410);
    } finally {
      cancelled.delete(workId);
    }
    identities.delete(workId);
    let refusalCode_2 = work.signal.aborted ? "start_failed" : refusalCodeFor(id);
    if (refusalCode_2 !== undefined) return refuseWork(work, workId, id, refusalCode_2);
    setBounded(inFlight, workId, true);
    let startedAt = now();
    let helper;
    try {
      helper = options.spawnHelper({
        sessionId: id,
        workId,
        environmentId: work.environmentId,
        folder: options.folder,
      });
    } catch (error) {
      logForDebugging(`[tool-host] helper not started: ${redactIds(errorMessage(error))}`, {
        level: "error",
      });
      recordRefusal(id);
      return refuseWork(work, workId, id, "start_failed");
    }
    let previous = perEnvironment.get(id);
    ordinal += 1;
    let sessionOrdinal = sessionOrdinals.get(id);
    if (sessionOrdinal === undefined) {
      nextSessionOrdinal += 1;
      sessionOrdinal = nextSessionOrdinal;
      setBounded(sessionOrdinals, id, sessionOrdinal);
    }
    let entry = {
      ordinal,
      sessionOrdinal,
      sessionId: id,
      workId,
      startedAt,
      handle: helper,
      stoppedHere: false,
      startedTimer: undefined,
    };
    entry.startedTimer = setTimeout(settleStartedTimer, MIN_HEALTHY_RUN_MS, entry);
    entry.startedTimer.unref?.();
    waiters.add(entry);
    perEnvironment.set(id, entry);
    if (previous !== undefined) {
      markStopping(previous);
      runLogged("supersede", async () => {
        await previous.handle.stop("superseded");
        forgetWaiter(previous);
      });
    }
    reportLiveCount();
    runLogged("exit", async () => reportHelperEnd(entry, await helper.exited));
    if (options.onEvent !== undefined)
      helper.onStatus((status) => {
        if (!entry.stoppedHere && waiters.has(entry))
          emitEvent({
            kind: "status",
            helper: entry.ordinal,
            session: entry.sessionOrdinal,
            status,
          });
      });
    acknowledge(work, workId);
    runLogged("status line", () =>
      options.logger.logStatus(`Serving tools to a cloud session in ${options.folder}`),
    );
    emitEvent({
      kind: "started",
      helper: entry.ordinal,
      session: entry.sessionOrdinal,
    });
    return "handled";
  }
  function refusalCodeFor(id) {
    if (!readSwitchSafely(options.switches.gateOn)) return "gate_off";
    if (!readSwitchSafely(options.switches.servingOn) || now() - NEGATIVE_INFINITY_2 < SERVING_OFF_MEMORY_MS)
      return "serving_off";
    if (!readSwitchSafely(options.switches.folderServed)) return "not_served";
    let windowStart = now() - SERVING_OFF_MEMORY_MS;
    let envStarts = startedAt.get(id) ?? [];
    if (
      countWhere(envStarts, (at) => at > windowStart) >= MAX_REFUSALS_PER_ENV ||
      countWhere(pending, (at) => at > windowStart) >= MAX_REFUSALS_TOTAL
    )
      return "at_capacity";
    let reuseCount = perEnvironment.has(id) ? 1 : 0;
    return waiters.size - reuseCount >= MAX_ACTIVE_HELPERS ? "at_capacity" : undefined;
  }
  function acknowledge(item, workId) {
    runLogged("stop", () =>
      options.api.stopWork(item.environmentId, workId, item.environmentSecret, true, hashIdForLog(workId)),
    );
  }
  function refuseWork(item, workId, id, code, withdrawn = false) {
    setBounded(inFlight, workId, true);
    if (!withdrawn) {
      reportRefusal(id, workId, code);
      emitEvent({
        kind: "refused",
        code,
      });
    }
    acknowledge(item, workId);
    logFeatureBad("bridge_tool_host_work", withdrawn ? "withdrawn" : code);
    return "handled";
  }
  function handleAckFailure(error, workId) {
    let status = statusOfError(error);
    logForDebugging(`[tool-host] acknowledge failed (${status ?? "no response"})`);
    if (status === 429)
      activeCount = now() + Math.min(retryAfterMsOf(error) ?? DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
    let attempts = (identities.get(workId) ?? 0) + 1;
    if (hasFatalClientStatus(error) || attempts >= MAX_ACK_RETRIES) {
      identities.delete(workId);
      return "give_up";
    }
    setBounded(identities, workId, attempts);
    return "retry";
  }
  function reportHelperEnd(entry, exited) {
    let ranMs = now() - entry.startedAt;
    let failed = !entry.stoppedHere && exited.code !== 0;
    let configError = failed && exited.code === EXIT_CONFIG_ERROR;
    let recentConfigError = configError && now() - NEGATIVE_INFINITY < SERVING_OFF_MEMORY_MS;
    if (configError) NEGATIVE_INFINITY = now();
    let code = !failed
      ? undefined
      : recentConfigError
        ? "serving_off"
        : ranMs < MIN_HEALTHY_RUN_MS
          ? "start_failed"
          : "helper_exited";
    if (code === "start_failed") recordRefusal(entry.sessionId);
    if (code === "serving_off") NEGATIVE_INFINITY_2 = now();
    if (code === "start_failed" || code === "serving_off") settleStartedTimer(entry, code);
    forgetWaiter(entry);
    if (code !== undefined) reportRefusal(entry.sessionId, entry.workId, code);
    emitEvent({
      kind: "ended",
      helper: entry.ordinal,
      session: entry.sessionOrdinal,
      code,
      stoppedHere: entry.stoppedHere,
    });
    let exitNote = exited.signal ?? `exit code ${exited.code ?? "none"}`;
    let reportedNote = code === undefined ? "" : `, reported as ${code}`;
    let stderrNote = failed && exited.stderrFirstLine !== undefined ? `: ${exited.stderrFirstLine}` : "";
    options.logger.logVerbose(
      `Tool helper for a cloud session ended (pid ${entry.handle.pid ?? "none"}, ${exitNote}, after ${Math.round(ranMs / 1000)}s${reportedNote}${stderrNote})`,
    );
  }
  function forgetWaiter(entry) {
    settleStartedTimer(entry);
    waiters.delete(entry);
    if (perEnvironment.get(entry.sessionId) === entry) perEnvironment.delete(entry.sessionId);
    reportLiveCount();
  }
  function markStopping(entry) {
    entry.stoppedHere = true;
    emitEvent({
      kind: "stopping",
      helper: entry.ordinal,
      session: entry.sessionOrdinal,
    });
  }
  function emitEvent(event) {
    runLogged("event", () => options.onEvent?.(event));
  }
  function reportLiveCount() {
    let liveCount = 0;
    for (let entry of waiters) if (!entry.stoppedHere) liveCount += 1;
    if (liveCount === sequence) return;
    sequence = liveCount;
    runLogged("live count report", () => options.onLiveCountChange(liveCount));
  }
  function settleStartedTimer(entry, code) {
    if (entry.startedTimer === undefined) return;
    clearTimeout(entry.startedTimer);
    entry.startedTimer = undefined;
    if (code === undefined) logFeatureOk("bridge_tool_host_work");
    else logFeatureBad("bridge_tool_host_work", code);
  }
  function recordRefusal(environmentId) {
    let at = now();
    pending = pending.concat(at).slice(-MAX_REFUSALS_TOTAL);
    let envStarts = startedAt.get(environmentId) ?? [];
    startedAt.delete(environmentId);
    setBounded(startedAt, environmentId, envStarts.concat(at).slice(-MAX_REFUSALS_PER_ENV));
  }
  function reportRefusal(sessionId, workId, code) {
    runLogged("report", () =>
      options.api.refuseToolHost?.(sessionId, workId, code, AbortSignal.timeout(REFUSE_REPORT_TIMEOUT_MS)),
    );
  }
  return {
    async handle(workItem, work) {
      try {
        return await handleWork(workItem, work);
      } catch (error) {
        logFeatureBad("bridge_tool_host_work", "handler_threw");
        logForDebugging(
          `[tool-host] handling a request failed unexpectedly (${describeErrorStatus(error)})`,
          {
            level: "error",
          },
        );
        try {
          let workId = safeWorkId(workItem, work);
          if (workId !== undefined) {
            setBounded(inFlight, workId, true);
            acknowledge(work, workId);
            return "handled";
          }
        } catch {}
        return "unsettled";
      }
    },
    async sweep(reason) {
      let code = reason === "gate_off" ? "gate_off" : "helper_exited";
      await Promise.allSettled(
        [...waiters].map(async (entry) => {
          if (!entry.stoppedHere) {
            reportRefusal(entry.sessionId, entry.workId, code);
            markStopping(entry);
            reportLiveCount();
          }
          await entry.handle.stop(reason);
          forgetWaiter(entry);
        }),
      );
    },
    liveCount: () => waiters.size,
  };
}
//@ chunk-3emqeq9c.js:13589-13695 placement
function safeWorkId(work, options) {
  let id = work.id;
  return typeof id === "string" &&
    id.length <= MAX_ENVIRONMENT_ID_CHARS &&
    isSafeBridgeId(id) &&
    isSafeBridgeId(options.environmentId)
    ? id
    : undefined;
}
//@ chunk-3emqeq9c.js:13695-13791 placement
function runLogged(label, run) {
  (async () => {
    try {
      await run();
    } catch (error) {
      logForDebugging(`[tool-host] ${label} failed (${describeErrorStatus(error)})`);
    }
  })();
}
//@ chunk-3emqeq9c.js:13791-13895 placement (2.1.88 match: STATUS_TAG, 1)
/**
 * 错误带数字 status 时返回 "status N"，否则错误名或 "unknown"。旧版名 STATUS_TAG 为错配。
 */
function describeErrorStatus(error) {
  let status = statusOfError(error);
  if (status !== undefined) return `status ${status}`;
  return error instanceof Error ? error.name : "unknown";
}
//@ chunk-3emqeq9c.js:13895-14032 placement
function readSwitchSafely(read) {
  try {
    return read();
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
//@ chunk-3emqeq9c.js:14032-14118 placement
function setBounded(map, key, value) {
  map.set(key, value);
  for (let key of map.keys()) {
    if (map.size <= MAX_TRACKED_IDENTITIES) break;
    map.delete(key);
  }
}
//@ chunk-3emqeq9c.js:14118-14228 placement
function statusOfError(error) {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}
//@ chunk-3emqeq9c.js:14228-14575 placement
/**
 * 判断设置是否禁止 Remote Control：任一层 disableRemoteControl 为 true，或策略/flag/用户设置存在影响该键的解析错误时视为禁用。
 */
function isRemoteControlDisabledBySettings() {
  invalidateCommandNames();
  if (
    getSettingsWithErrors().settings.disableRemoteControl === true ||
    getSecuritySensitiveSetting("disableRemoteControl").some((flag) => flag === true) ||
    getAllPolicyTierSettings().some((settings) => settings.disableRemoteControl === true)
  )
    return true;
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
  ].some((error) => {
    if (error.path === "") return true;
    if (error.statusOnly) return false;
    return error.severity !== "warning" || error.path === "disableRemoteControl";
  });
}
export {
  isRemoteControlDisabledBySettings,
  checkToolHostHelperPreconditions,
  runToolHostLoop,
  spawnToolHostHelper,
  SIGKILL_GRACE_MS,
};
