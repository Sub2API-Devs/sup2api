/**
 * services/api/requestHeaders.ts
 *
 * 2.1.316 新增：校验 x-api-key/Authorization/自定义头的值，非法时抛出带来源的错误；保留的请求头名与环境变量到请求头的映射等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (29), chunk-hwmsct5x.js (41)
 * attribution: placement 70
 */
import { isIP } from "net";
import {
  np,
  Rl,
  Jf,
  tp,
  Qf,
  ap,
  lp,
  up,
  Ti,
  TENGU_WIGGLY_DOVE,
  vl,
  tn,
  op,
  ip,
  Al,
  kl,
  dp,
  cp,
  Tl,
  sp,
  xl,
  fp,
  Uf,
  Nf,
  rp,
  xi,
  pp,
  hp,
  mp,
  gp_2,
  Hf,
  _p_2,
  wp,
  Sp_2,
  Ep,
  vp,
  Rp,
  Ap,
  kp,
  xp,
  Tp,
  Mp,
  Op,
  Pp,
  Cp,
  Ip,
  Lp,
  Fp,
  Dp,
  Up,
  Np,
  Bp,
  Hp,
  $p,
  qp,
  Wp,
  zp,
  Gp,
  Yp,
  jp,
  Tf,
  Mf,
  Gf,
  Kf,
  Yf,
  Of,
  Pf,
  Xf,
  Vf,
  Cf,
  If,
  Ff,
  Df,
  $f,
  qf,
  bp_2,
  yp,
  Wf,
  zf,
  Lo,
} from "./wigglyDove.js";
import { logError } from "../../utils/log.js";
import { isAntBuild, isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { gl } from "../../utils/cwd.js";
import { findGitRoot, findCanonicalGitRoot, findRepoRemoteSlug } from "../../utils/git.js";
import { getSessionFlags, Rf } from "./sessionFlags.js";
import { envDynamic } from "../../utils/envDynamic.js";
import { getEntrypointOnRequests, isCcsTenant, getPromptId, getSessionId } from "../../bootstrap/state.js";
import { CLI } from "../../utils/entrypointKinds.js";
import { isAutoModeActive } from "../../utils/permissions/autoModeState.js";
import { getComputerUseSession } from "../../utils/computerUse/session.js";
import { getCustomHeaders as getCustomHeaders_3 } from "./client.js";
import { cte } from "../../utils/settings/envSources.js";
import { isFirstPartyApiBackend, assumesFirstPartyBaseUrl } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { Ae, _n, Ai, isTextField, yf, serializeSfDictionary } from "../../utils/structuredFields.js";
import { Ws } from "./streamFallbackWarning.js";
import { logForDebugging } from "../../utils/debug.js";
import { turnAttributionKeyFor } from "../../utils/agentContext.js";
import { apiClient } from "../routines/routinesApi.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getUserAgent } from "../../utils/http.js";
import { customHeaderNames } from "./customHeaders.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { checkValueChars, describeUnsafeValue } from "../../utils/settings/managedSettingsKeys.js";
import { ge } from "../../utils/identity.js";
import { RETRY_ON_529_QUERY_SOURCES } from "./withRetry.js";
import { textLengthAndLines } from "../../utils/auth.js";

//@ chunk-hwmsct5x.js:257395-257434 placement
var Jp = 32,
  Sy = 128,
  Qp = 128,
  Ey = 20,
  OL = Jp - Ey;
//@ chunk-hwmsct5x.js:257434-257461 placement
function Xp(e) {
  return np();
}
//@ chunk-hwmsct5x.js:257461-257669 placement
var SUMMARY_QUERY_SOURCES = new Set([
    "compact",
    "agent_summary",
    "away_summary",
    "tool_use_summary_generation",
  ]),
  CLASSIFIER_QUERY_SOURCES = new Set([
    "auto_mode",
    "auto_mode_investigator",
    "compact_fab_check",
    "agent_classifier",
    "subagent_config_classifier",
  ]);
//@ chunk-hwmsct5x.js:257669-257715 placement
function ky(e) {
  if (CLASSIFIER_QUERY_SOURCES.has(e)) return !0;
  return !1;
}
//@ chunk-hwmsct5x.js:257715-257880 placement
function querySourceFlag(e) {
  let n = classifyQuerySource(e);
  if (e === void 0 || n === void 0) return Rl();
  if (n === "main" || n === "subagent") return Jf();
  if (ky(e)) return tp();
  if (SUMMARY_QUERY_SOURCES.has(e)) return Qf();
  return Rl();
}
//@ chunk-hwmsct5x.js:257880-258372 placement
function getSandboxPosture(e, n, r) {
  if (e === null) return null;
  let s = n === void 0 || n === "bypassPermissions" || (n === "plan" && r),
    h = !1;
  try {
    h = e.areUnsandboxedCommandsAllowed() === !1;
  } catch (error) {
    logError(error);
  }
  if (s && !h) return { toolSandboxActive: !1, egressRestricted: !1, hostAllowlistEnforced: !1 };
  try {
    let isEgressRestricted = e.isEgressRestricted();
    return {
      toolSandboxActive: e.isToolSandboxActive(),
      egressRestricted: isEgressRestricted,
      hostAllowlistEnforced: isEgressRestricted && e.isHostAllowlistEnforced(),
    };
  } catch (error) {
    return (logError(error), { toolSandboxActive: !1, egressRestricted: !1, hostAllowlistEnforced: !1 });
  }
}
//@ chunk-hwmsct5x.js:258372-258494 placement
function runtimeEnvironmentFlag() {
  if (isAntBuild()) return ap();
  if (env.KUBERNETES_SERVICE_HOST) return lp();
  if (env.isCI || env.GITHUB_ACTIONS) return up();
  return;
}
//@ chunk-hwmsct5x.js:258494-258708 placement
function repoSlugForHeader() {
  try {
    let e = gl(),
      n = e === null ? null : findGitRoot(e),
      r = n === null ? null : findCanonicalGitRoot(n),
      s = r === null ? null : findRepoRemoteSlug(r);
    if (s === null || !Iy.test(s)) return;
    let sliced = s.split(/[?#]/, 1)[0].slice(0, Qp - 2);
    return sliced === "" ? void 0 : sliced;
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 收集查询源、权限模式、bypass 可用性、沙箱姿态等，组成随请求发送的客户端上下文。
 */
//@ chunk-hwmsct5x.js:258708-259918 placement
async function buildRequestContextHeaders(e, n, r, s = !1) {
  let h = getSessionFlags(),
    y = await envDynamic(),
    w = n?.mode ?? h?.currentPermissionMode ?? h?.permissionMode,
    S = n?.isBypassPermissionsModeAvailable ?? h?.bypassPermissionsAvailable !== !1,
    E = getEntrypointOnRequests(),
    R = !1;
  return {
    querySource: e,
    clientVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    entrypoint: E !== void 0 && (isCcsTenant() || (nh(E) && E !== CLI)) ? E : env.CLAUDE_CODE_ENTRYPOINT,
    claudeCodeServerTenant: !1,
    ...!1,
    permissionMode: w,
    bypassPermissionsAvailable: S,
    autoModeActive: isAutoModeActive(),
    ...{},
    classifierJudgesServedCall: s,
    computerUseActive: getComputerUseSession().binding !== void 0,
    containerRuntime: y,
    posture: getSandboxPosture(Rf(), w, S),
    platform: "linux",
    hostEnvironment: runtimeEnvironmentFlag(),
    monorepoCheckout: !1,
    gitOrigin: repoSlugForHeader(),
    githubHostedRunner: isEnvTruthy(env.GITHUB_ACTIONS) && env.RUNNER_ENVIRONMENT === "github-hosted",
    internetReachable: void 0,
    overrides: { extensions: [] },
  };
}
//@ chunk-hwmsct5x.js:259918-259965 placement
var Cy = /^[a-z][a-z0-9_]*$/,
  Iy = /^[\x20-\x7E]*$/;
//@ chunk-hwmsct5x.js:259965-260152 placement = getCustomHeaders (1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (!getCustomHeaders_3(customHeadersEnv ?? "").some(([r, s]) => Ti(r) && s !== "")) return !1;
  try {
    return customHeadersEnv?.trim() === cte().ANTHROPIC_CUSTOM_HEADERS?.trim();
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-hwmsct5x.js:260152-260218 placement
function eh() {
  if (!isFirstPartyApiBackend()) return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WIGGLY_DOVE, !1)) return !1;
  return Ly();
}
//@ chunk-hwmsct5x.js:260218-260291 placement
function Ly() {
  if (assumesFirstPartyBaseUrl()) return !0;
  try {
    return isFirstPartyBaseUrl();
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-hwmsct5x.js:260291-260325 placement
function Nci() {
  return eh() && !getCustomHeaders();
}
//@ chunk-hwmsct5x.js:260325-260370 placement
function Fy(e) {
  return Cy.test(e) ? Ae(e) : _n(e);
}
//@ chunk-hwmsct5x.js:260370-260633 placement
function autoModeFlags(e) {
  if (e.classifierJudgesServedCall === !0) return [{ key: vl(), value: Ai([Ae(Xp(e))]) }];
  let permissionMode = e.permissionMode;
  if (permissionMode === void 0) return [];
  let r =
    permissionMode === "auto" ||
    (permissionMode === "plan" && e.autoModeActive && !e.bypassPermissionsAvailable);
  return [{ key: vl(), value: Ai(r ? [Ae(Xp(e))] : []) }];
}
//@ chunk-hwmsct5x.js:260633-261384 placement
function encodeEnvironmentFlags(e) {
  let { overrides: overrides } = e,
    r = [],
    s,
    h;
  if (!1);
  else if (e.containerRuntime !== void 0) r.push({ key: tn(), value: Ae(Ny(e.containerRuntime)) });
  else if (e.githubHostedRunner) r.push({ key: tn(), value: Ae(op()) });
  else if (e.posture === null) r.push({ key: tn(), value: Ae(ip()) });
  else if (e.posture.toolSandboxActive)
    switch (e.platform) {
      case "linux":
        r.push({ key: tn(), value: Ae(Al()) });
        break;
      case "darwin":
        (r.push({ key: tn(), value: Ae(kl()) }), (h = dp()));
        break;
      default:
        (r.push({ key: tn(), value: Ae(kl()) }), (h = e.platform === "win32" ? cp() : Tl()));
        break;
    }
  else if (
    (r.push({ key: tn(), value: Ae(sp()) }), (s = e.hostEnvironment ?? xl()), e.hostEnvironment === void 0)
  )
    h = e.platform === "linux" ? fp() : Tl();
  let w = s;
  if (w !== void 0) r.push({ key: Uf(), value: Ae(w) });
  let S = h;
  if (S !== void 0) r.push({ key: Nf(), value: _n(S) });
  return r;
}
//@ chunk-hwmsct5x.js:261384-261433 placement
function Ny(e) {
  return e === "bubblewrap" ? Al() : rp();
}
//@ chunk-hwmsct5x.js:261433-261664 placement
function egressPostureFlags(e) {
  if (e.posture === null) return [{ key: xi(), value: Ae(pp()) }];
  if (!e.posture.egressRestricted) return [{ key: xi(), value: Ae(hp()) }];
  return [
    { key: xi(), value: Ae(e.posture.hostAllowlistEnforced ? mp() : gp_2()) },
    { key: Hf(), value: Ae(_p_2()) },
  ];
}
//@ chunk-hwmsct5x.js:261664-261686 placement
function Hy(e) {
  return;
}
//@ chunk-hwmsct5x.js:261686-262168 placement
var ENTRYPOINT_CODES = {
  cli: wp,
  mcp: Sp_2,
  "sdk-cli": Ep,
  "sdk-ts": vp,
  "sdk-py": Rp,
  bench: Ap,
  "claude-vscode": kp,
  "claude-code-github-action": xp,
  "local-agent": Tp,
  local_agent: Mp,
  "claude-desktop": Op,
  remote: Pp,
  remote_baku: Cp,
  remote_cowork: Ip,
  remote_trigger: Lp,
  remote_cowork_trigger: Fp,
  remote_desktop: Dp,
  remote_mobile: Up,
  remote_projects: Np,
  claude_in_slack: Bp,
  "claude-in-slack": Hp,
  "claude-in-teams": $p,
  "claude-desktop-3p": qp,
  "claude-security": Wp,
  "ssh-remote": zp,
  "claude-coworker": Gp,
  "claude-coworker-terminal": Yp,
};
//@ chunk-hwmsct5x.js:262168-262210 placement
function nh(e) {
  return Object.hasOwn(ENTRYPOINT_CODES, e);
}
//@ chunk-hwmsct5x.js:262210-262251 placement
function $y(e) {
  return nh(e) ? ENTRYPOINT_CODES[e]() : jp();
}
//@ chunk-hwmsct5x.js:262251-263203 placement
function encodeClientIdentityFlags(e) {
  let { overrides: overrides } = e,
    r = !e.claudeCodeServerTenant && (e.entrypoint === "sdk-ts" || e.entrypoint === "sdk-py"),
    s = [
      { key: Tf(), value: isTextField(1) },
      { key: Mf(), value: Ae(Gf()) },
    ],
    h = void 0,
    y = e.claudeCodeServerTenant ? Kf() : (h ?? (r ? void 0 : Yf()));
  if (y !== void 0) s.push({ key: Of(), value: Fy(y) });
  if (
    (s.push({ key: Pf(), value: Ae(r ? Xf() : Vf()) }, { key: Cf(), value: _n(e.clientVersion) }),
    e.entrypoint !== void 0 && e.entrypoint !== "")
  ) {
    let R = $y(e.entrypoint);
    if (R !== void 0) s.push({ key: If(), value: _n(R) });
  }
  let w = void 0;
  if (w !== void 0) s.push({ key: Ff(), value: _n(w) });
  (s.push({ key: Df(), value: Ae(querySourceFlag(e.querySource)) }), s.push(...autoModeFlags(e)));
  let S = Hy(e);
  if (
    (s.push(...(S?.members ?? [...encodeEnvironmentFlags(e), ...egressPostureFlags(e)])), e.computerUseActive)
  )
    s.push({ key: $f(), value: yf(!0) }, { key: qf(), value: Ae(e.hostEnvironment ?? xl()) });
  let E = [];
  if (e.monorepoCheckout) E.push(Ae(bp_2()));
  if (e.internetReachable === !0) E.push(Ae(yp()));
  if (E.length > 0) s.push({ key: Wf(), value: Ai(E) });
  if (e.gitOrigin !== void 0) s.push({ key: zf(), value: _n(e.gitOrigin) });
  return s;
}
//@ chunk-hwmsct5x.js:263203-263291 placement
function Wy(e) {
  return serializeSfDictionary(e, {
    maxMembers: Jp,
    maxKeyLength: Sy,
    maxValueLength: Qp,
    onDrop: noteHeaderMemberDropped,
  });
}
//@ chunk-hwmsct5x.js:263291-263451 placement
function noteHeaderMemberDropped(e, n) {
  let headerMemberDropsNoted = Ws().headerMemberDropsNoted;
  if (headerMemberDropsNoted.has(e)) return;
  (headerMemberDropsNoted.add(e),
    logForDebugging(`${Lo()}: dropped ${e} (${n}); the rest of the header is sent`, { level: "warn" }));
}
//@ chunk-hwmsct5x.js:263451-263632 placement = getCustomHeaders (1)
function getCustomHeaders_2() {
  let customHeaders = {},
    n = Lo();
  for (let r of (env.ANTHROPIC_CUSTOM_HEADERS ?? "").split(/\n|\r\n/)) {
    let colonIdx = r.indexOf(":"),
      h = colonIdx >= 0 ? r.slice(0, colonIdx).trim() : "";
    if (h !== n && Ti(h)) customHeaders[h] = void 0;
  }
  return customHeaders;
}
//@ chunk-hwmsct5x.js:263632-263803 placement
async function buildClientIdentityHeader({
  querySource: querySource,
  permissionContext: permissionContext,
  toolNames: toolNames,
  classifierJudgesServedCall: classifierJudgesServedCall,
}) {
  if (!eh()) return;
  try {
    return Wy(
      encodeClientIdentityFlags(
        await buildRequestContextHeaders(
          querySource,
          permissionContext,
          toolNames,
          classifierJudgesServedCall,
        ),
      ),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-hwmsct5x.js:263803-264069 placement
function identityHeaders(e, n) {
  if (e === void 0) return {};
  let r = {};
  for (let s of Object.keys(n)) if (Ti(s)) r[s] = void 0;
  if (getCustomHeaders()) {
    for (let [s, h] of getCustomHeaders_3(env.ANTHROPIC_CUSTOM_HEADERS ?? "")) if (Ti(s)) r[s] = h;
    return r;
  }
  if (Ws().once("own_header_logged")) logForDebugging(`${Lo()}: ${e}`);
  return { ...r, ...getCustomHeaders_2(), [Lo()]: e };
}
//@ chunk-hwmsct5x.js:264097-264240 placement
var SENDER_ADDR_PATH = "/worker/sender_addr",
  SENDER_ADDR_WAIT_MS = 500,
  SENDER_ADDR_TTL_MS = 45000,
  TENGU_JAUNTY_PIKE = "tengu_jaunty_pike",
  TENGU_SUNNY_GARDEN = "tengu_sunny_garden",
  SENDER_ADDR_RETRIES = 3,
  X_SSR_CLIENT_IP = "x-ssr-client-ip",
  X_SSR_CLIENT_IP_SIG = "x-ssr-client-ip-sig";
//@ chunk-hwmsct5x.js:264240-264358 placement
function getCcrSenderAddressKey(e, n) {
  if (!isCcsTenant()) return;
  let r = turnAttributionKeyFor(e),
    s = n ?? getPromptId() ?? void 0;
  return r !== void 0 && s !== void 0 ? { event: r, run: s } : void 0;
}
//@ chunk-hwmsct5x.js:264358-264587 placement
async function attachSenderAddress(e, n) {
  try {
    let startTime = performance.now(),
      s = await fetchCcrSenderAddress(n, !1),
      { waits: waits } = Ws().ccsSenderAddr;
    if (((waits.firstMs ??= performance.now() - startTime), (waits.unsignedCalls += s ? 0 : 1), s))
      (e.set(X_SSR_CLIENT_IP, s.ip), e.set(X_SSR_CLIENT_IP_SIG, s.sig));
  } catch (error) {
    (e.delete(X_SSR_CLIENT_IP), e.delete(X_SSR_CLIENT_IP_SIG), logError(error));
  }
}
/**
 * 向 CCR 查询当前事件/运行的发送方地址（x-ssr-client-ip 及签名），带缓存与并发去重。
 */
//@ chunk-hwmsct5x.js:264587-265488 placement
async function fetchCcrSenderAddress(e, n) {
  let { asking: asking, held: held } = Ws().ccsSenderAddr,
    h = `${e.event}|${e.run}`,
    y = held.get(h);
  if (y !== void 0 && Date.now() - y.at < SENDER_ADDR_TTL_MS) return y.pair;
  let w = asking.get(h);
  if (w === void 0) {
    let R = !0,
      uRLSearchParams = new URLSearchParams({ event: e.event, run: e.run }),
      timeout = AbortSignal.timeout(SENDER_ADDR_WAIT_MS);
    ((w = {
      answer: apiClient
        .get(`${SENDER_ADDR_PATH}?${uRLSearchParams}`, {
          host: "ccr-session",
          auth: "session-jwt",
          signal: timeout,
        })
        .then((P) => {
          R = P.ok;
          let H = P.ok && P.status === 200 ? P.data : void 0,
            j = H?.[X_SSR_CLIENT_IP],
            z = H?.[X_SSR_CLIENT_IP_SIG];
          return typeof j === "string" &&
            j.length <= 45 &&
            isIP(j) !== 0 &&
            typeof z === "string" &&
            /^[\x21-\x7e]{1,256}$/.test(z)
            ? { ip: j, sig: z }
            : void 0;
        })
        .catch((P) => {
          logForDebugging(
            `No sender address from CCR: ${timeout.aborted ? `no answer in ${SENDER_ADDR_WAIT_MS} ms` : errorMessage(P)}`,
          );
          return;
        })
        .finally(() => {
          (asking.delete(h), (Ws().ccsSenderAddr.waits.asks += R ? 1 : 0));
        }),
      mayBeTooSoon: n,
    }),
      asking.set(h, w));
  }
  let answer = await w.answer;
  if (answer === void 0 && w.mayBeTooSoon) return n ? void 0 : fetchCcrSenderAddress(e, !1);
  let now = Date.now();
  for (let [R, L] of held) if (now - L.at >= SENDER_ADDR_TTL_MS) held.delete(R);
  return (held.set(h, { pair: answer, at: now }), answer);
}
//@ chunk-hwmsct5x.js:265488-265683 placement
async function prefetchCcrSenderAddress(e, n = !1) {
  try {
    let { asking: asking } = Ws().ccsSenderAddr,
      s = `${e.event}|${e.run}`,
      h = asking.get(s);
    if (
      (fetchCcrSenderAddress(e, n).catch(logError),
      asking.get(s) !== h && (n || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAUNTY_PIKE, !1)))
    )
      for (let y = 0; y < SENDER_ADDR_RETRIES; y++) await yieldToEventLoop();
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-hwmsct5x.js:265683-265807 placement
function logSenderAddressFailure(e) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the early ask for a sender's address threw: ${errorMessage(e)}`,
      "the early ask for a sender's address threw",
    ),
  );
}
//@ chunk-hwmsct5x.js:265807-265880 placement
function $ci() {
  try {
    return (
      isCcsTenant() && isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SUNNY_GARDEN, !1)
    );
  } catch (error) {
    return (logSenderAddressFailure(error), !1);
  }
}
/**
 * 按会话预取 CCR 发送方地址，失败只记录。
 */
//@ chunk-hwmsct5x.js:265880-265990 placement
async function prefetchSenderAddressFor(e) {
  try {
    let n = e === void 0 ? void 0 : getCcrSenderAddressKey(void 0, e);
    if (n !== void 0) await prefetchCcrSenderAddress(n, !0);
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-hwmsct5x.js:265990-266068 placement
function Fl() {
  return {
    "x-app": isBgSession() ? "cli-bg" : "cli",
    "User-Agent": getUserAgent(),
    [X_CLAUDE_CODE_SESSION_ID]: getSessionId(),
  };
}
//@ chunk-hwmsct5x.js:266068-266151 placement
function getForwardableEnvHeaders() {
  let e = new Set(customHeaderNames());
  return wi(Fl(), (n, r) => e.has(r) || checkValueChars(n) !== null);
}
//@ chunk-hwmsct5x.js:266151-266416 placement
var HELD_REPLY_SOURCES = new Set(["subagent", "auxiliary", "compaction"]),
  CONTENT_BLOCK_DELTA_EVENT_BYTES = Buffer.from(`event: content_block_delta
`),
  PING_EVENT_BYTES = Buffer.from(`event: ping
`),
  EVENT_PREFIX_BYTES = Buffer.from("event"),
  NEWLINE_EVENT_BYTES = Buffer.from(`
event`),
  LF = 10,
  CR = 13,
  UTF8_BOM_BYTES = Buffer.from("\uFEFF"),
  MAX_HELD_BYTES = 262144,
  heldReplyState = ge({ isSent: !1 }, (e) => {
    e.isSent = !1;
  });
//@ chunk-hwmsct5x.js:266416-266503 placement
function fh(e) {
  return e !== void 0 && HELD_REPLY_SOURCES.has(e) ? (env.CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS ?? 0) : 0;
}
/**
 * 查询来源是否为主线程或代理。
 */
//@ chunk-aepeg2w5.js:378332-378423 placement
function isMainOrAgentQuerySource(e) {
  if (e === void 0) return !0;
  if (e.startsWith("agent:")) return !0;
  return RETRY_ON_529_QUERY_SOURCES.has(e);
}
//@ chunk-aepeg2w5.js:378423-378511 placement
function MEi(e) {
  if (e === void 0) return !1;
  let n = RETRY_ON_529_QUERY_SOURCES;
  return e.startsWith("agent:") || n.has(e);
}
/**
 * 把查询来源分为 main/subagent/auxiliary。
 */
//@ chunk-aepeg2w5.js:378511-378686 placement
function classifyQuerySource(e) {
  if (e === void 0) return;
  if (e.startsWith("repl_main_thread") || e === "sdk") return "main";
  if (e.startsWith("agent:") || e === "hook_agent") return "subagent";
  return "auxiliary";
}
/**
 * 是否为主线程查询。
 */
//@ chunk-aepeg2w5.js:378686-378736 placement
function isMainQuerySource(e) {
  return e === void 0 || classifyQuerySource(e) === "main";
}
/**
 * 是否为 auto mode 分类器查询。
 */
//@ chunk-aepeg2w5.js:378736-378808 placement
function isAutoModeQuerySource(e) {
  return e === "auto_mode" || e === "auto_mode_investigator" || !1;
}
//@ chunk-aepeg2w5.js:378808-378875 placement
function gp(e) {
  let index = e.indexOf(":");
  return index > 0 ? e.slice(0, index) : void 0;
}
/**
 * 自定义 agent 来源归一为 agent:custom。
 */
//@ chunk-aepeg2w5.js:378875-378955 placement
function normalizeAgentQuerySource(e) {
  if (e?.startsWith("agent:custom:")) return "agent:custom";
  return e;
}
//@ chunk-aepeg2w5.js:378955-379097 placement
var X_CLAUDE_CODE_REQUEST_CLASS = "x-claude-code-request-class",
  X_CLAUDE_CODE_AGENT_TYPE = "x-claude-code-agent-type",
  DEi = ["main", "subagent", "workflow", "compaction", "auxiliary", "side_reply"];
/**
 * 由查询来源确定请求通道（compaction、workflow、subagent 等），可被显式指定覆盖。
 */
//@ chunk-aepeg2w5.js:379097-379296 placement
function requestLaneFor(e, n, r) {
  if (e === void 0) return;
  if (r !== void 0) return r;
  if (e === "compact") return "compaction";
  let s = classifyQuerySource(e);
  if (s === "subagent" && n.agentType === "subagent" && n.workflowRunId) return "workflow";
  return s;
}
//@ chunk-aepeg2w5.js:379296-379320 placement
var AGENT_BUILTIN = "agent:builtin:";
/**
 * 由 agent:* 查询来源得出代理种类（teammate、内置代理名、custom）。
 */
//@ chunk-aepeg2w5.js:379320-379537 placement
function agentKindFor(e, n) {
  if (e === void 0 || !e.startsWith("agent:")) return;
  if (n.agentType === "teammate") return "teammate";
  if (e.startsWith(AGENT_BUILTIN)) return e.slice(AGENT_BUILTIN.length) || void 0;
  if (e.startsWith("agent:custom")) return "custom";
  return;
}
//@ chunk-aepeg2w5.js:379537-379571 placement
var X_CLAUDE_CODE_PROMPT_ID = "x-claude-code-prompt-id";
//@ chunk-aepeg2w5.js:379571-379601 placement
var X_COWORK_ENROLLMENT = "x-cowork-enrollment";
//@ chunk-aepeg2w5.js:379601-379642 placement
var X_CLAUDE_REMOTE_SESSION_ORIGIN = "x-claude-remote-session-origin";
//@ chunk-aepeg2w5.js:379642-379677 placement
var X_CLAUDE_CODE_SESSION_ID = "X-Claude-Code-Session-Id";
/**
 * 请求头值非法（发送前拒绝）的错误。
 */
//@ chunk-aepeg2w5.js:379677-379941 placement
class InvalidRequestHeaderValueError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  header;
  source;
  constructor(e, n, r) {
    super(e, "request header value rejected before send: not a valid HTTP header value");
    this.header = n;
    this.source = r;
    this.name = "InvalidRequestHeaderValueError";
  }
  get isUserSupplied() {
    return this.source !== "claude-code";
  }
}
/**
 * 保留的请求头名与环境变量到请求头的映射。
 */
//@ chunk-aepeg2w5.js:379941-381099 placement
var RESERVED_REQUEST_HEADERS = new Set([
    "x-app",
    X_CLAUDE_CODE_SESSION_ID,
    "x-claude-code-agent-id",
    "x-claude-code-parent-agent-id",
    X_CLAUDE_CODE_PROMPT_ID,
    X_CLAUDE_CODE_REQUEST_CLASS,
    X_CLAUDE_CODE_AGENT_TYPE,
    "x-anthropic-additional-protection",
    X_CLAUDE_REMOTE_SESSION_ORIGIN,
    X_COWORK_ENROLLMENT,
  ]),
  x0 = {
    "x-client-app": "CLAUDE_AGENT_SDK_CLIENT_APP",
    "x-claude-remote-container-id": "CLAUDE_CODE_CONTAINER_ID",
    "x-claude-remote-session-id": "CLAUDE_CODE_REMOTE_SESSION_ID",
    "User-Agent": "User-Agent environment",
  },
  Ni = {
    ANTHROPIC_API_KEY: " from ANTHROPIC_API_KEY",
    apiKeyHelper: " from apiKeyHelper",
    "/login managed key": " from the saved /login API key",
    ANTHROPIC_AUTH_TOKEN: " from ANTHROPIC_AUTH_TOKEN",
    CLAUDE_CODE_OAUTH_TOKEN: " from CLAUDE_CODE_OAUTH_TOKEN",
    CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: " from the OAuth token file descriptor",
    CCR_OAUTH_TOKEN_FILE: " from the OAuth token file",
    "claude.ai": " from the saved claude.ai login",
    ANTHROPIC_CUSTOM_HEADERS: " from ANTHROPIC_CUSTOM_HEADERS",
    CLAUDE_AGENT_SDK_CLIENT_APP: " from CLAUDE_AGENT_SDK_CLIENT_APP",
    CLAUDE_CODE_CONTAINER_ID: " from CLAUDE_CODE_CONTAINER_ID",
    CLAUDE_CODE_REMOTE_SESSION_ID: " from CLAUDE_CODE_REMOTE_SESSION_ID",
    "User-Agent environment":
      " from CLAUDE_CODE_ENTRYPOINT / CLAUDE_AGENT_SDK_VERSION / CLAUDE_AGENT_SDK_CLIENT_APP",
    unknown: "",
    "claude-code": "",
  };
/**
 * 校验 x-api-key/Authorization/自定义头的值，非法时抛出带来源的错误。
 */
//@ chunk-aepeg2w5.js:381099-382670 placement
function validateAuthHeaders({
  apiKey: apiKey,
  getApiKeySource: getApiKeySource,
  authToken: authToken,
  getAuthTokenSource: getAuthTokenSource,
  defaultHeaders: defaultHeaders,
  authorizationSource: authorizationSource,
  customHeaderNames: customHeaderNames,
  envSuppliedHeaderNames: envSuppliedHeaderNames,
}) {
  if (apiKey !== null && _p("x-api-key", apiKey)) {
    let R = getApiKeySource();
    throw new InvalidRequestHeaderValueError(
      `Invalid X-Api-Key header value${Ni[R]}: ${describeInvalidHeaderValue(apiKey)}.`,
      "X-Api-Key",
      R,
    );
  }
  for (let [R, x] of Object.entries(defaultHeaders)) {
    if (typeof x !== "string" || !_p(R, x)) continue;
    let index = customHeaderNames.indexOf(R),
      F = `distinct header ${index + 1} of ${customHeaderNames.length} parsed from ANTHROPIC_CUSTOM_HEADERS`;
    if (O0(R))
      throw new InvalidRequestHeaderValueError(
        index === -1
          ? `Invalid request header name: the HTTP runtime does not accept it (${bp(R.length)}).`
          : `Invalid name for ${F}: the HTTP runtime does not accept it (${bp(R.length)}).`,
        "other",
        index === -1 ? "claude-code" : "ANTHROPIC_CUSTOM_HEADERS",
      );
    let L = x0[R];
    if (L !== void 0 && envSuppliedHeaderNames.has(R))
      throw new InvalidRequestHeaderValueError(
        `Invalid ${R} header value${Ni[L]}: ${describeInvalidHeaderValue(x)}.`,
        "other",
        L,
      );
    let G = R === "Authorization" && authorizationSource !== null;
    if (R.toLowerCase() === "authorization") {
      let j = G ? authorizationSource : index === -1 ? "unknown" : "ANTHROPIC_CUSTOM_HEADERS",
        ee = G && x.startsWith("Bearer ") ? x.slice(7) : x;
      throw new InvalidRequestHeaderValueError(
        `Invalid Authorization header value${Ni[j]}: ${describeInvalidHeaderValue(ee)}.`,
        "Authorization",
        j,
      );
    }
    if (index !== -1)
      throw new InvalidRequestHeaderValueError(
        `Invalid value for ${F}: ${describeInvalidHeaderValue(x)}.`,
        R.toLowerCase() === "x-api-key" ? "X-Api-Key" : "other",
        "ANTHROPIC_CUSTOM_HEADERS",
      );
    if (L !== void 0)
      throw new InvalidRequestHeaderValueError(
        `Invalid ${R} header value${Ni[L]}: ${describeInvalidHeaderValue(x)}.`,
        "other",
        L,
      );
    throw new InvalidRequestHeaderValueError(
      RESERVED_REQUEST_HEADERS.has(R)
        ? `Invalid ${R} header value: ${describeInvalidHeaderValue(x)}.`
        : `Invalid request header value: ${describeInvalidHeaderValue(x)}.`,
      "other",
      "claude-code",
    );
  }
  if (authToken !== null && _p("authorization", `Bearer ${authToken}`)) {
    let R = getAuthTokenSource();
    throw new InvalidRequestHeaderValueError(
      `Invalid Authorization header value${Ni[R]}: ${describeInvalidHeaderValue(authToken)}.`,
      "Authorization",
      R,
    );
  }
}
//@ chunk-aepeg2w5.js:382670-382738 placement
function _p(e, n) {
  try {
    return (new Headers([[e, n]]), !1);
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:382738-382806 placement
function O0(e) {
  try {
    return (new Headers([[e, "x"]]), !1);
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:382806-382945 placement
function describeInvalidHeaderValue(e) {
  let n = checkValueChars(e),
    r = textLengthAndLines(e);
  return n === null
    ? `it contains a character the HTTP runtime does not accept (${bp(r.length)})`
    : describeUnsafeValue(n, r);
}
//@ chunk-aepeg2w5.js:382945-383005 placement
function bp(e) {
  return e === 1 ? "1 character" : `${e} characters`;
}
/**
 * 已知内容块类型集合。
 */
//@ chunk-aepeg2w5.js:383035-383607 placement
var KNOWN_CONTENT_BLOCK_TYPES = {
    advisor_tool_result: !0,
    bash_code_execution_tool_result: !0,
    code_execution_tool_result: !0,
    compaction: !0,
    container_upload: !0,
    document: !0,
    fallback: !0,
    image: !0,
    mcp_tool_listing: !0,
    mcp_tool_result: !0,
    mcp_tool_use: !0,
    redacted_thinking: !0,
    search_result: !0,
    server_tool_use: !0,
    text: !0,
    text_editor_code_execution_tool_result: !0,
    thinking: !0,
    tool_result: !0,
    tool_search_tool_result: !0,
    tool_addition: !0,
    tool_removal: !0,
    tool_use: !0,
    web_fetch_tool_result: !0,
    web_search_tool_result: !0,
  },
  M0 = ["connector_text", "mid_conv_system", "tool_reference"],
  Sp = new Set([...Object.keys(KNOWN_CONTENT_BLOCK_TYPES), ...M0]);
/**
 * 是否为已知内容块类型。
 */
//@ chunk-aepeg2w5.js:383607-383661 placement
function isKnownContentBlockType(e) {
  return typeof e === "string" && Sp.has(e);
}
//@ chunk-aepeg2w5.js:383661-383855 placement
var KNOWN_BLOCK_TYPES = new Set([
  "audio",
  "file",
  "function",
  "image_file",
  "image_url",
  "input_audio",
  "input_file",
  "input_image",
  "input_text",
  "output_text",
  "refusal",
  "resource",
  "resource_link",
  "video",
  "video_url",
]);
//@ chunk-aepeg2w5.js:383855-383928 placement
function NEi(e) {
  return Sp.has(e) ? e : `non-allowlisted (${e.length} chars)`;
}
//@ chunk-aepeg2w5.js:383928-384083 placement
var KNOWN_ENUM_VALUES = new Set([
    "adaptive",
    "any",
    "auto",
    "base64",
    "content",
    "disabled",
    "enabled",
    "ephemeral",
    "none",
    "tool",
    "url",
  ]),
  NON_ALLOWLISTED_PATTERN = /^non-allowlisted \(\d{1,4} chars\)$/;
//@ chunk-aepeg2w5.js:384083-384163 placement
function YE(e) {
  return F0(e) || NON_ALLOWLISTED_PATTERN.test(e) ? e : `non-allowlisted (${e.length} chars)`;
}
//@ chunk-aepeg2w5.js:384163-384217 placement
function F0(e) {
  return Sp.has(e) || KNOWN_BLOCK_TYPES.has(e) || KNOWN_ENUM_VALUES.has(e);
}

export {
  isKnownContentBlockType,
  isAutoModeQuerySource,
  $ci,
  prefetchSenderAddressFor,
  classifyQuerySource,
  gp,
  normalizeAgentQuerySource,
  InvalidRequestHeaderValueError,
  getCcrSenderAddressKey,
  prefetchCcrSenderAddress,
  Nci,
  isMainOrAgentQuerySource,
  getForwardableEnvHeaders,
  isMainQuerySource,
  YE,
  validateAuthHeaders,
  NEi,
  requestLaneFor,
  agentKindFor,
  MEi,
  buildClientIdentityHeader,
  Fl,
  X_CLAUDE_REMOTE_SESSION_ORIGIN,
  X_CLAUDE_CODE_REQUEST_CLASS,
  X_CLAUDE_CODE_AGENT_TYPE,
  X_CLAUDE_CODE_PROMPT_ID,
  identityHeaders,
  X_COWORK_ENROLLMENT,
  attachSenderAddress,
  fh,
  LF,
  CR,
  UTF8_BOM_BYTES,
  EVENT_PREFIX_BYTES,
  CONTENT_BLOCK_DELTA_EVENT_BYTES,
  PING_EVENT_BYTES,
  MAX_HELD_BYTES,
  heldReplyState,
  NEWLINE_EVENT_BYTES,
  DEi,
  X_CLAUDE_CODE_SESSION_ID,
};
