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
import { o, u, U, E, M, A, oe, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw, jsonStringify } from "../../utils/slowOperations.js";
import { wTe } from "../../utils/knownEnvVars.js";
import { BG_CARRIED_ENV_KEYS, soe, stripInternalEntrypoint } from "../../utils/background/envCarry.js";
import { subprocessEnv_2 } from "../../utils/subprocessEnv.js";
import { Tus, Ile, sanitizeEnvCredentials } from "../../utils/settings/policyHelper/helperExec.js";
import { Gx, qG, HOST_MANAGED_MARKER_ENV_VARS, gj } from "../../utils/managedEnvConstants.js";
import { _us, isRemoteToolsPinStoredLogin } from "../../cli/headlessCloud/attachServe.js";
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
import { retryAfterMsOf, Mbo } from "../../bridge/bridgeMain.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { isSafeBridgeId } from "../../bridge/sessionIdCompat.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import {
  getSettingsWithErrors_2,
  getSecuritySensitiveSetting,
  getAllPolicyTierSettings,
  getPolicySettingsLoadErrors,
  getSettingsParseErrorsForSource,
} from "../../utils/settings/settings.js";

//@ chunk-3zy56vtn.js:1728-1741 placement
var Xe = 10080;
//@ chunk-3zy56vtn.js:1741-1876 placement
function readHelperConcurrencyFlag(e) {
  let n;
  try {
    n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_sordino", e);
  } catch {
    n = e;
  }
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= Xe ? n : void 0;
}
/**
 * 工具宿主辅助进程的长度上限、名称格式等常量与 schema。
 */
//@ chunk-3zy56vtn.js:1924-2574 placement
var MAX_STATUS_LINE_CHARS = 262144,
  MAX_TOOL_LABEL_CHARS = 48,
  TOOL_LABEL_RE = /^[A-Za-z0-9_.:-]+$/,
  UNKNOWN_TOOL_LABEL = "a tool",
  MAX_STATUS_CALLS = 128,
  toolLabelSchema = DoctorLazy(() =>
    o().transform((e) => (TOOL_LABEL_RE.test(e) ? e.slice(0, MAX_TOOL_LABEL_CHARS) : UNKNOWN_TOOL_LABEL)),
  ),
  callIdSchema = DoctorLazy(() => o().min(1).max(256)),
  liveCallSchema = DoctorLazy(() =>
    u({
      call_id: callIdSchema(),
      tool: toolLabelSchema(),
      state: U(["running", "asked"]),
      since: E(),
      classifier_eligible: M()
        .optional()
        .catch(void 0),
    }).transform((e) => ({
      callId: e.call_id,
      tool: e.tool,
      state: e.state,
      since: e.since,
      classifierEligible: e.classifier_eligible,
    })),
  ),
  recentCallSchema = DoctorLazy(() =>
    u({
      call_id: callIdSchema(),
      tool: toolLabelSchema(),
      ended: U(["completed", "denied", "withdrawn", "refused", "failed"]),
      code: o()
        .max(64)
        .regex(/^[a-z0-9_]+$/)
        .optional()
        .catch(void 0),
      at: E(),
    }).transform((e) => ({ callId: e.call_id, tool: e.tool, ended: e.ended, code: e.code, at: e.at })),
  );
//@ chunk-3zy56vtn.js:2574-2710 placement
function lenientArraySchema(e) {
  return A(oe())
    .transform((n) =>
      n.slice(0, MAX_STATUS_CALLS).flatMap((s) => {
        let safeParse = e.safeParse(s);
        return safeParse.success ? [safeParse.data] : [];
      }),
    )
    .catch([]);
}
//@ chunk-3zy56vtn.js:2710-2944 placement
var cloudSessionDeltaSchema = DoctorLazy(() =>
  u({
    type: T("system"),
    subtype: T("cloud_session_delta"),
    cloud_session: u({
      serving: u({ state: U(["on", "off", "pending", "revoked"]) })
        .optional()
        .catch(void 0),
      calls: u({ live: lenientArraySchema(liveCallSchema()), recent: lenientArraySchema(recentCallSchema()) })
        .optional()
        .catch(void 0),
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
  let safeParse = cloudSessionDeltaSchema().safeParse(n);
  if (!safeParse.success) return;
  let { serving: serving, calls: calls } = safeParse.data.cloud_session;
  return { serving: serving?.state, live: calls?.live ?? [], recent: calls?.recent ?? [] };
}
/**
 * 创建按行解析助手进程 stdout 的读取器：只处理包含 cloud_session_delta 的行并回调解析结果；单行超过上限时丢弃直到下一行。
 */
//@ chunk-3zy56vtn.js:3187-3468 placement
function createStatusLineReader(e) {
  let n = new StringDecoder("utf8"),
    s = "",
    c = !1;
  return function (O) {
    let C = typeof O === "string" ? O : n.write(O);
    for (;;) {
      let index = C.indexOf(`
`);
      if (index < 0) break;
      let x = s + C.slice(0, index);
      if (((C = C.slice(index + 1)), (s = ""), c)) {
        c = !1;
        continue;
      }
      let y = parseCloudSessionDelta(x);
      if (y !== void 0) e(y);
    }
    if (c) return;
    if (((s += C), s.length > MAX_STATUS_LINE_CHARS)) ((s = ""), (c = !0));
  };
}
//@ chunk-3zy56vtn.js:3468-4426 placement
var TOOL_HOST_ENV_KEYS = "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
  Le = "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
  st = 60,
  dt = 2500,
  Se = 3000,
  lt = 200,
  at = 1024,
  ut = 320,
  me = /^cse_[A-Za-z0-9_]{1,124}$/,
  ft = /^env_[A-Za-z0-9_-]{1,124}$/,
  ct = new Set(
    [
      ...wTe,
      ...BG_CARRIED_ENV_KEYS,
      ...subprocessEnv_2([...Tus, ...Gx, "CLAUDE_BRIDGE_OAUTH_TOKEN"]),
      ...qG.filter((e) => e !== "ANTHROPIC_BASE_URL"),
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
    ].map((e) => Ile(e)),
  ),
  Ne = new Set([...HOST_MANAGED_MARKER_ENV_VARS, "CLAUDE_CODE_HOST_CREDS_FILE"]),
  pt = new Set([
    ...Ne,
    "ANTHROPIC_FEDERATION_RULE_ID",
    "ANTHROPIC_ORGANIZATION_ID",
    "ANTHROPIC_PROFILE",
    "ANTHROPIC_CONFIG_DIR",
  ]),
  _t = new Set([
    ...gj.filter((e) => e.startsWith("CLAUDE_CODE_USE_")),
    "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
  ]);
/**
 * 为工具宿主助手子进程构造环境：要求能锚定到已存储登录，拒绝会把登录或流量导向别处的变量，删除内部/文件描述符变量；可选去掉 shell 密钥类变量，写入无人值守授权与并发上限。
 */
//@ chunk-3zy56vtn.js:4426-5014 placement
function buildToolHostHelperEnv(
  env_2,
  {
    unattendedGrant: unattendedGrant,
    withoutShellSecrets: withoutShellSecrets,
    guest: guest,
    testVm: testVm,
  },
) {
  let O = _us() ? isRemoteToolsPinStoredLogin() : void 0;
  if (O === void 0) throw storedLoginUnsupportedError();
  let C = Ile(O),
    b = Ile(TOOL_HOST_ENV_KEYS),
    x = Ile(Le),
    sanitizedEnv = { ...env_2 };
  for (let [W, S] of Object.entries(sanitizedEnv)) {
    let normalizedName = Ile(W);
    if (Ne.has(normalizedName) && envRedirectsSignInOrTraffic(normalizedName, S, env_2))
      throw redirectedSignInError();
    if (
      ct.has(normalizedName) ||
      normalizedName === C ||
      normalizedName === b ||
      normalizedName === x ||
      normalizedName.endsWith("_FILE_DESCRIPTOR")
    )
      delete sanitizedEnv[W];
  }
  if (
    (soe(sanitizedEnv), stripInternalEntrypoint(sanitizedEnv), (sanitizedEnv[O] = "1"), withoutShellSecrets)
  ) {
    let W = new Set(declaredEnvVarNames(env));
    for (let S of listSecretEnvNames(sanitizedEnv))
      if (!(/^(?:CLAUDE|ANTHROPIC)_/.test(S) && W.has(S))) delete sanitizedEnv[S];
    (delete sanitizedEnv.SSH_AGENT_PID,
      Object.assign(sanitizedEnv, sanitizeEnvCredentials(sanitizedEnv).respelled));
  }
  if (unattendedGrant !== void 0) sanitizedEnv[TOOL_HOST_ENV_KEYS] = unattendedGrant;
  let V = readHelperConcurrencyFlag(st);
  if (V !== void 0) sanitizedEnv[Le] = String(V);
  return sanitizedEnv;
}
/**
 * 构造发给工具宿主辅助进程的 initialize 控制请求行；请求 id 不合法时不带上。
 */
//@ chunk-3zy56vtn.js:5014-5320 placement
function buildInitializeRequestLine({ workId: workId, environmentId: environmentId }, s) {
  let c = me.test(workId) && ft.test(environmentId);
  if (!c)
    logForDebugging("[tool-host] the request ids are not in a usable form; starting the helper without them");
  return (
    jsonStringify({
      type: "control_request",
      request_id: s,
      request: {
        subtype: "initialize",
        ...(c && { attachServeRequest: { workId: workId, environmentId: environmentId } }),
      },
    }) +
    `
`
  );
}
/**
 * 检查能否启动工具宿主辅助进程：环境变量不能把登录或流量指向别处。
 */
//@ chunk-3zy56vtn.js:5320-5665 placement
function checkToolHostHelperPreconditions(e) {
  if (!_us()) return storedLoginUnsupportedError();
  for (let [s, c] of Object.entries(e)) {
    let w = Ile(s);
    if (envRedirectsSignInOrTraffic(w, c, e))
      return (
        logForDebugging(
          `[tool-host] no helper: ${w} says this process signs in or sends its traffic elsewhere`,
          { level: "error" },
        ),
        redirectedSignInError()
      );
  }
  let n = processWrapperError();
  if (n)
    return (
      logForDebugging(`[tool-host] ${n}`, { level: "error" }),
      Error("tool host helper: the process wrapper is not usable")
    );
  return;
}
/**
 * 启动工具宿主助手进程（--attach-serve、stream-json）
 */
//@ chunk-3zy56vtn.js:5665-7769 placement
function spawnToolHostHelper(
  e,
  {
    env: env,
    unattendedGrant: unattendedGrant,
    withoutShellSecrets: withoutShellSecrets,
    guest: guest,
    testVm: testVm,
    selfInvocation: selfInvocation = () => getLaunchCommand({ pinToCurrentBinary: !0 }),
    spawn: spawn = safeSpawn,
    after: after = Tt,
    killTree: killTree = killProcessGroup,
  },
) {
  let V = checkToolHostHelperPreconditions(env);
  if (V !== void 0) throw V;
  if (!me.test(e.sessionId)) throw Error("tool host helper: the session id is not usable");
  let W = selfInvocation(),
    S = spawn(
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
          unattendedGrant: unattendedGrant,
          withoutShellSecrets: withoutShellSecrets,
          ...(guest !== void 0 && { guest: guest }),
          ...(testVm !== void 0 && { testVm: testVm }),
        }),
        extendEnv: !1,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: !0,
        toolCgroupClass: "agent",
      },
    ),
    { promise: promise, resolve: resolve } = Promise.withResolvers(),
    te = [],
    j = !1,
    alloc = Buffer.alloc(0),
    K = 0,
    H,
    L = () => {};
  function Z(B, R) {
    if (j) return;
    ((j = !0), L());
    let P = redactIds(stripIgnorables(getFirstLine(alloc.toString("utf8"))));
    resolve({ code: B, signal: R, stderrFirstLine: P === "" ? void 0 : truncateToLength(P, ut) });
  }
  try {
    (S.on("exit", (R, P) => {
      if (((H = [R, P]), K <= 0)) {
        Z(R, P);
        return;
      }
      L = after(lt, () => Z(R, P));
    }),
      S.on("error", (R) => {
        if ((logForDebugging(`[tool-host] helper process error: ${redactIds(errorMessage(R))}`), !j))
          (Z(null, null), _e(S, "SIGKILL"));
      }));
    for (let R of [S.stdin, S.stdout, S.stderr]) R?.on("error", () => {});
    for (let R of [S.stdout, S.stderr])
      if (R !== null && !R.readableEnded)
        ((K += 1),
          R.once("end", () => {
            if (((K -= 1), H !== void 0 && K <= 0)) Z(...H);
          }));
    let B = createStatusLineReader((R) => {
      for (let P of te)
        try {
          P(R);
        } catch (error) {
          logForDebugging(`[tool-host] status listener failed: ${redactIds(errorMessage(error))}`);
        }
    });
    if (
      (S.stdout?.on("data", (R) => {
        if (te.length > 0) B(R);
      }),
      S.stderr?.on("data", (R) => {
        let P = at - alloc.length;
        if (P > 0) {
          let Q = typeof R === "string" ? Buffer.from(R) : R;
          alloc = Buffer.concat([alloc, Q.subarray(0, P)]);
        }
      }),
      S.pid === void 0 || S.stdin === null)
    )
      Z(null, null);
    else S.stdin.write(buildInitializeRequestLine(e, randomUUID()));
  } catch (error) {
    throw (_e(S, "SIGKILL"), error);
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
      return (
        (Y ??= new Promise((R) => {
          logForDebugging(`[tool-host] stopping helper (${B})`);
          let P = getPlatform() === "windows",
            Q = B === "released";
          try {
            if (Q)
              S.stdin?.write(
                jsonStringify({
                  type: "control_request",
                  request_id: randomUUID(),
                  request: { subtype: "end_session", reason: RELEASED },
                }) +
                  `
`,
              );
            S.stdin?.end();
          } catch {}
          if (!P && !Q) _e(S, "SIGTERM");
          let fe = after(dt, () => {
              if (P && S.pid !== void 0) killTree(S.pid).catch(() => {});
              else _e(S, "SIGKILL");
            }),
            ue = after(Se, R);
          promise.then(() => {
            (fe(), ue(), R());
          });
        })),
        Y
      );
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
  if (!n) return !1;
  if (_t.has(e)) return isEnvTruthy(n);
  return (
    pt.has(e) ||
    (e === "ANTHROPIC_BASE_URL" && !St(n, s)) ||
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
function St(e, n) {
  if (isFirstPartyAnthropicHost(e)) return !0;
  return isEnvTruthy(n.USE_LOCAL_OAUTH) && isLoopbackUrl(e);
}
//@ chunk-3zy56vtn.js:8389-8494 placement
function isLoopbackUrl(e) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(e).hostname);
  } catch {
    return !1;
  }
}
//@ chunk-3zy56vtn.js:8494-8570 placement
function Tt(e, n) {
  let s = setTimeout(n, e);
  return (s.unref(), () => clearTimeout(s));
}
//@ chunk-3zy56vtn.js:8570-8660 placement
function _e(e, n) {
  try {
    e.kill(n);
  } catch (error) {
    logForDebugging(`[tool-host] ${n} not delivered: ${redactIds(errorMessage(error))}`);
  }
}
//@ chunk-3zy56vtn.js:8660-8742 placement
var ht = 4,
  Ve = 30000,
  he = 600000,
  We = 3,
  Fe = 10,
  Ht = 3,
  wt = 2500,
  vt = 5000,
  Rt = 30000,
  yt = 64,
  kt = 128;
/**
 * 工具宿主助手主循环：处理队列条目、环境 id 校验、结果回传
 */
//@ chunk-3zy56vtn.js:8742-13508 placement
function runToolHostLoop(e) {
  let n = e.now ?? Date.now,
    s = new Map(),
    c = new Set(),
    w = new Map(),
    O = 0,
    C = new Set(),
    b = new Map(),
    x = new Map(),
    y = [],
    { NEGATIVE_INFINITY: NEGATIVE_INFINITY, NEGATIVE_INFINITY: NEGATIVE_INFINITY_2 } = Number,
    S = 0,
    D = 0,
    G = new Map(),
    te = 0;
  async function j(r, a) {
    if (a.signal.aborted) return "unsettled";
    let f = safeWorkId(r, a);
    if (f === void 0)
      return (logForDebugging("[tool-host] item or environment id unusable; item left"), "unsettled");
    if (s.has(f) || [...C].some((re) => re.workId === f)) return (K(a, f), "handled");
    if (c.has(f)) return "unsettled";
    let h = typeof r.data === "object" && r.data !== null && "id" in r.data ? r.data.id : void 0,
      X = typeof h === "string" && me.test(h) ? decodeTaggedUuid(h) : void 0;
    if (typeof h !== "string" || X === void 0 || X === decodeTaggedUuid(f))
      return (
        logForDebugging("[tool-host] session id unusable; item stopped"),
        de(s, f, !0),
        K(a, f),
        "handled"
      );
    let ce = ee(h);
    if (ce !== void 0) return H(a, f, h, ce);
    if (n() < O) return "unsettled";
    c.add(f);
    try {
      await e.api.acknowledgeWork(a.environmentId, f, a.environmentSecret, hashIdForLog(f));
    } catch (error) {
      if (L(error, f) !== "give_up") return "unsettled";
      let Ee = statusOfError(error);
      return H(a, f, h, "start_failed", Ee === 404 || Ee === 409 || Ee === 410);
    } finally {
      c.delete(f);
    }
    w.delete(f);
    let z = a.signal.aborted ? "start_failed" : ee(h);
    if (z !== void 0) return H(a, f, h, z);
    de(s, f, !0);
    let ge = n(),
      le;
    try {
      le = e.spawnHelper({ sessionId: h, workId: f, environmentId: a.environmentId, folder: e.folder });
    } catch (error) {
      return (
        logForDebugging(`[tool-host] helper not started: ${redactIds(errorMessage(error))}`, {
          level: "error",
        }),
        fe(h),
        H(a, f, h, "start_failed")
      );
    }
    let ae = b.get(h);
    D += 1;
    let pe = G.get(h);
    if (pe === void 0) ((te += 1), (pe = te), de(G, h, pe));
    let q = {
      ordinal: D,
      sessionOrdinal: pe,
      sessionId: h,
      workId: f,
      startedAt: ge,
      handle: le,
      stoppedHere: !1,
      startedTimer: void 0,
    };
    if (
      ((q.startedTimer = setTimeout(Q, Ve, q)),
      q.startedTimer.unref?.(),
      C.add(q),
      b.set(h, q),
      ae !== void 0)
    )
      (B(ae),
        se("supersede", async () => {
          (await ae.handle.stop("superseded"), Y(ae));
        }));
    if ((P(), se("exit", async () => Z(q, await le.exited)), e.onEvent !== void 0))
      le.onStatus((re) => {
        if (!q.stoppedHere && C.has(q))
          R({ kind: "status", helper: q.ordinal, session: q.sessionOrdinal, status: re });
      });
    return (
      K(a, f),
      se("status line", () => e.logger.logStatus(`Serving tools to a cloud session in ${e.folder}`)),
      R({ kind: "started", helper: q.ordinal, session: q.sessionOrdinal }),
      "handled"
    );
  }
  function ee(r) {
    if (!readSwitchSafely(e.switches.gateOn)) return "gate_off";
    if (!readSwitchSafely(e.switches.servingOn) || n() - NEGATIVE_INFINITY_2 < he) return "serving_off";
    if (!readSwitchSafely(e.switches.folderServed)) return "not_served";
    let a = n() - he,
      f = x.get(r) ?? [];
    if (count(f, (X) => X > a) >= We || count(y, (X) => X > a) >= Fe) return "at_capacity";
    let h = b.has(r) ? 1 : 0;
    return C.size - h >= ht ? "at_capacity" : void 0;
  }
  function K(r, a) {
    se("stop", () => e.api.stopWork(r.environmentId, a, r.environmentSecret, !0, hashIdForLog(a)));
  }
  function H(r, a, f, h, X = !1) {
    if ((de(s, a, !0), !X)) (ue(f, a, h), R({ kind: "refused", code: h }));
    return (K(r, a), logFeatureBad("bridge_tool_host_work", X ? "withdrawn" : h), "handled");
  }
  function L(r, a) {
    let f = statusOfError(r);
    if ((logForDebugging(`[tool-host] acknowledge failed (${f ?? "no response"})`), f === 429))
      O = n() + Math.min(retryAfterMsOf(r) ?? vt, Rt);
    let h = (w.get(a) ?? 0) + 1;
    if (Mbo(r) || h >= Ht) return (w.delete(a), "give_up");
    return (de(w, a, h), "retry");
  }
  function Z(r, a) {
    let f = n() - r.startedAt,
      h = !r.stoppedHere && a.code !== 0,
      X = h && a.code === EXIT_CONFIG_ERROR,
      ce = X && n() - NEGATIVE_INFINITY < he;
    if (X) NEGATIVE_INFINITY = n();
    let z = !h ? void 0 : ce ? "serving_off" : f < Ve ? "start_failed" : "helper_exited";
    if (z === "start_failed") fe(r.sessionId);
    if (z === "serving_off") NEGATIVE_INFINITY_2 = n();
    if (z === "start_failed" || z === "serving_off") Q(r, z);
    if ((Y(r), z !== void 0)) ue(r.sessionId, r.workId, z);
    R({ kind: "ended", helper: r.ordinal, session: r.sessionOrdinal, code: z, stoppedHere: r.stoppedHere });
    let ge = a.signal ?? `exit code ${a.code ?? "none"}`,
      le = z === void 0 ? "" : `, reported as ${z}`,
      ae = h && a.stderrFirstLine !== void 0 ? `: ${a.stderrFirstLine}` : "";
    e.logger.logVerbose(
      `Tool helper for a cloud session ended (pid ${r.handle.pid ?? "none"}, ${ge}, after ${Math.round(f / 1000)}s${le}${ae})`,
    );
  }
  function Y(r) {
    if ((Q(r), C.delete(r), b.get(r.sessionId) === r)) b.delete(r.sessionId);
    P();
  }
  function B(r) {
    ((r.stoppedHere = !0), R({ kind: "stopping", helper: r.ordinal, session: r.sessionOrdinal }));
  }
  function R(r) {
    se("event", () => e.onEvent?.(r));
  }
  function P() {
    let r = 0;
    for (let a of C) if (!a.stoppedHere) r += 1;
    if (r === S) return;
    ((S = r), se("live count report", () => e.onLiveCountChange(r)));
  }
  function Q(r, a) {
    if (r.startedTimer === void 0) return;
    if ((clearTimeout(r.startedTimer), (r.startedTimer = void 0), a === void 0))
      logFeatureOk("bridge_tool_host_work");
    else logFeatureBad("bridge_tool_host_work", a);
  }
  function fe(r) {
    let a = n();
    y = y.concat(a).slice(-Fe);
    let f = x.get(r) ?? [];
    (x.delete(r), de(x, r, f.concat(a).slice(-We)));
  }
  function ue(r, a, f) {
    se("report", () => e.api.refuseToolHost?.(r, a, f, AbortSignal.timeout(wt)));
  }
  return {
    async handle(r, a) {
      try {
        return await j(r, a);
      } catch (error) {
        (logFeatureBad("bridge_tool_host_work", "handler_threw"),
          logForDebugging(
            `[tool-host] handling a request failed unexpectedly (${describeErrorStatus(error)})`,
            { level: "error" },
          ));
        try {
          let h = safeWorkId(r, a);
          if (h !== void 0) return (de(s, h, !0), K(a, h), "handled");
        } catch {}
        return "unsettled";
      }
    },
    async sweep(r) {
      let a = r === "gate_off" ? "gate_off" : "helper_exited";
      await Promise.allSettled(
        [...C].map(async (f) => {
          if (!f.stoppedHere) (ue(f.sessionId, f.workId, a), B(f), P());
          (await f.handle.stop(r), Y(f));
        }),
      );
    },
    liveCount: () => C.size,
  };
}
//@ chunk-3zy56vtn.js:13508-13614 placement
function safeWorkId(e, n) {
  let id = e.id;
  return typeof id === "string" && id.length <= kt && isSafeBridgeId(id) && isSafeBridgeId(n.environmentId)
    ? id
    : void 0;
}
//@ chunk-3zy56vtn.js:13614-13710 placement
function se(e, n) {
  (async () => {
    try {
      await n();
    } catch (error) {
      logForDebugging(`[tool-host] ${e} failed (${describeErrorStatus(error)})`);
    }
  })();
}
/**
 * 错误带数字 status 时返回 "status N"，否则错误名或 "unknown"。旧版名 STATUS_TAG 为错配。
 */
//@ chunk-3zy56vtn.js:13710-13814 placement = STATUS_TAG (1)
function describeErrorStatus(e) {
  let n = statusOfError(e);
  if (n !== void 0) return `status ${n}`;
  return e instanceof Error ? e.name : "unknown";
}
//@ chunk-3zy56vtn.js:13814-13951 placement
function readSwitchSafely(e) {
  try {
    return e();
  } catch (error) {
    return (
      logForDebugging(
        `[tool-host] a switch could not be read, taken as off: ${redactIds(errorMessage(error))}`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-3zy56vtn.js:13951-14037 placement
function de(e, n, s) {
  e.set(n, s);
  for (let c of e.keys()) {
    if (e.size <= yt) break;
    e.delete(c);
  }
}
//@ chunk-3zy56vtn.js:14037-14147 placement
function statusOfError(e) {
  return typeof e === "object" && e !== null && "status" in e && typeof e.status === "number"
    ? e.status
    : void 0;
}
/**
 * 判断设置是否禁止 Remote Control：任一层 disableRemoteControl 为 true，或策略/flag/用户设置存在影响该键的解析错误时视为禁用。
 */
//@ chunk-3zy56vtn.js:14147-14494 placement
function isRemoteControlDisabledBySettings() {
  if (
    (or(),
    getSettingsWithErrors_2().settings.disableRemoteControl === !0 ||
      getSecuritySensitiveSetting("disableRemoteControl").some((e) => e === !0) ||
      getAllPolicyTierSettings().some((e) => e.disableRemoteControl === !0))
  )
    return !0;
  return [
    ...getPolicySettingsLoadErrors(),
    ...getSettingsParseErrorsForSource("flagSettings"),
    ...getSettingsParseErrorsForSource("userSettings"),
  ].some((e) => {
    if (e.path === "") return !0;
    if (e.statusOnly) return !1;
    return e.severity !== "warning" || e.path === "disableRemoteControl";
  });
}

export {
  isRemoteControlDisabledBySettings,
  checkToolHostHelperPreconditions,
  runToolHostLoop,
  spawnToolHostHelper,
  Se,
};
