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
  wigglyDoveFieldCodeLr,
  wigglyDoveFieldCodeNg,
  wigglyDoveFieldCodeKi,
  wigglyDoveFieldCodeTn,
  wigglyDoveFieldCodeNy,
  wigglyDoveFieldCodeAx,
  wigglyDoveFieldCodeMz,
  wigglyDoveFieldCodeIa,
  isWigglyDoveHeader,
  TENGU_WIGGLY_DOVE,
  wigglyDoveFieldCodeTt,
  wigglyDoveFieldCodeBf,
  wigglyDoveFieldCodeOh,
  wigglyDoveFieldCodeOz,
  wigglyDoveFieldCodeFy,
  wigglyDoveFieldCodeRl,
  wigglyDoveFieldCodeYb,
  wigglyDoveFieldCodeNv,
  wigglyDoveFieldCodeZb,
  wigglyDoveFieldCodeVt,
  wigglyDoveFieldCodeFs,
  wigglyDoveFieldCodePh,
  wigglyDoveFieldCodeVd,
  wigglyDoveFieldCodeXf,
  wigglyDoveFieldCodeZr,
  wigglyDoveFieldCodeZx,
  wigglyDoveFieldCodeIi,
  wigglyDoveFieldCodeFz,
  wigglyDoveFieldCodeVy,
  wigglyDoveFieldCodeBm,
  wigglyDoveFieldCodeZi,
  wigglyDoveFieldCodeKb,
  wigglyDoveFieldCodeWb,
  wigglyDoveFieldCodeSw,
  wigglyDoveFieldCodeWj,
  wigglyDoveFieldCodeXu,
  wigglyDoveFieldCodeUm,
  wigglyDoveFieldCodeSa,
  wigglyDoveFieldCodeSu,
  wigglyDoveFieldCodeHo,
  wigglyDoveFieldCodeZg,
  wigglyDoveFieldCodeXb,
  wigglyDoveFieldCodeKh,
  wigglyDoveFieldCodeZl,
  wigglyDoveFieldCodeXs,
  wigglyDoveFieldCodeYm,
  wigglyDoveFieldCodeNp,
  wigglyDoveFieldCodeOm,
  wigglyDoveFieldCodePf,
  wigglyDoveFieldCodeBt,
  wigglyDoveFieldCodeVo,
  wigglyDoveFieldCodeIy,
  wigglyDoveFieldCodeZz,
  wigglyDoveFieldCodeBo,
  wigglyDoveFieldCodeQl,
  wigglyDoveFieldCodeMb,
  wigglyDoveFieldCodePd,
  wigglyDoveFieldCodeBq,
  wigglyDoveFieldCodeTg,
  wigglyDoveFieldCodeVr,
  wigglyDoveFieldCodeV,
  wigglyDoveFieldCodeYw,
  wigglyDoveFieldCodeJm,
  wigglyDoveFieldCodeYi,
  wigglyDoveFieldCodeWm,
  wigglyDoveFieldCodeHg,
  wigglyDoveFieldCodeYl,
  wigglyDoveFieldCodeBx,
  wigglyDoveFieldCodeQi,
  wigglyDoveFieldCodeOb,
  wigglyDoveFieldCodeSk,
  wigglyDoveFieldCodeRf,
  wigglyDoveFieldCodeWl,
  wigglyDoveFieldCodeFu,
  wigglyDoveFieldCodeRt,
  wigglyDoveFieldCodeVb,
  wigglyDoveFieldCodeMa,
  wigglyDoveFieldCodeMo,
  wigglyDoveFieldCodeJy,
  wigglyDoveHeaderName,
} from "./wigglyDove.js";
import { logError } from "../../utils/log.js";
import { isAntBuild, isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { getCwdOrNull } from "../../utils/cwd.js";
import { findGitRoot, findCanonicalGitRoot, findRepoRemoteSlug } from "../../utils/git.js";
import { getSessionFlags, getSessionFlagReaders } from "./sessionFlags.js";
import { envDynamic } from "../../utils/envDynamic.js";
import { getEntrypointOnRequests, isCcsTenant, getPromptId, getSessionId } from "../../bootstrap/state.js";
import { CLI_ENTRYPOINT } from "../../utils/entrypointKinds.js";
import { isAutoModeActive } from "../../utils/permissions/autoModeState.js";
import { getComputerUseSession } from "../../utils/computerUse/session.js";
import { getCustomHeaders as getCustomHeaders_3 } from "./client.js";
import { effectiveEnvSnapshot } from "../../utils/settings/envSources.js";
import { isFirstPartyApiBackend, assumesFirstPartyBaseUrl } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import {
  sfToken,
  sfString,
  sfInnerList,
  isTextField,
  sfBoolean,
  serializeSfDictionary,
} from "../../utils/structuredFields.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
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
import { identity } from "../../utils/identity.js";
import { RETRY_ON_529_QUERY_SOURCES } from "./withRetry.js";
import { textLengthAndLines } from "../../utils/auth.js";

//@ chunk-hwmsct5x.js:257395-257434 placement
/**
 * 请求头 SF 字典（键值对头）的限额：最多 32 项、键 128、值 128，另留键长余量。
 */
var MAX_HEADER_DICT_MEMBERS = 32;
var MAX_HEADER_KEY_LENGTH = 128;
var MAX_HEADER_VALUE_LENGTH = 128;
var HEADER_KEY_RESERVE = 20;
var MAX_URL_PATH_CHARS = MAX_HEADER_DICT_MEMBERS - HEADER_KEY_RESERVE;
//@ chunk-hwmsct5x.js:257434-257461 placement
function senderAddressHeaderValue(e) {
  return wigglyDoveFieldCodeLr();
}
//@ chunk-hwmsct5x.js:257461-257669 placement
var SUMMARY_QUERY_SOURCES = new Set([
  "compact",
  "agent_summary",
  "away_summary",
  "tool_use_summary_generation",
]);
var CLASSIFIER_QUERY_SOURCES = new Set([
  "auto_mode",
  "auto_mode_investigator",
  "compact_fab_check",
  "agent_classifier",
  "subagent_config_classifier",
]);
//@ chunk-hwmsct5x.js:257669-257715 placement
function isClassifierQuerySource(e) {
  if (CLASSIFIER_QUERY_SOURCES.has(e)) return true;
  return false;
}
//@ chunk-hwmsct5x.js:257715-257880 placement
function querySourceFlag(querySource) {
  let n = classifyQuerySource(querySource);
  if (querySource === undefined || n === undefined) return wigglyDoveFieldCodeNg();
  if (n === "main" || n === "subagent") return wigglyDoveFieldCodeKi();
  if (isClassifierQuerySource(querySource)) return wigglyDoveFieldCodeTn();
  if (SUMMARY_QUERY_SOURCES.has(querySource)) return wigglyDoveFieldCodeNy();
  return wigglyDoveFieldCodeNg();
}
//@ chunk-hwmsct5x.js:257880-258372 placement
function getSandboxPosture(sessionFlagReaders, n, r) {
  if (sessionFlagReaders === null) return null;
  let s = n === undefined || n === "bypassPermissions" || (n === "plan" && r);
  let h = false;
  try {
    h = sessionFlagReaders.areUnsandboxedCommandsAllowed() === false;
  } catch (error) {
    logError(error);
  }
  if (s && !h)
    return {
      toolSandboxActive: false,
      egressRestricted: false,
      hostAllowlistEnforced: false,
    };
  try {
    let y = sessionFlagReaders.isEgressRestricted();
    return {
      toolSandboxActive: sessionFlagReaders.isToolSandboxActive(),
      egressRestricted: y,
      hostAllowlistEnforced: y && sessionFlagReaders.isHostAllowlistEnforced(),
    };
  } catch (error) {
    logError(error);
    return {
      toolSandboxActive: false,
      egressRestricted: false,
      hostAllowlistEnforced: false,
    };
  }
}
//@ chunk-hwmsct5x.js:258372-258494 placement
function runtimeEnvironmentFlag() {
  if (isAntBuild()) return wigglyDoveFieldCodeAx();
  if (env.KUBERNETES_SERVICE_HOST) return wigglyDoveFieldCodeMz();
  if (env.isCI || env.GITHUB_ACTIONS) return wigglyDoveFieldCodeIa();
  return;
}
//@ chunk-hwmsct5x.js:258494-258708 placement
function repoSlugForHeader() {
  try {
    let cwdOrNull = getCwdOrNull();
    let n = cwdOrNull === null ? null : findGitRoot(cwdOrNull);
    let r = n === null ? null : findCanonicalGitRoot(n);
    let s = r === null ? null : findRepoRemoteSlug(r);
    if (s === null || !PRINTABLE_ASCII_RE.test(s)) return;
    let sliced = s.split(/[?#]/, 1)[0].slice(0, MAX_HEADER_VALUE_LENGTH - 2);
    return sliced === "" ? undefined : sliced;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-hwmsct5x.js:258708-259918 placement
/**
 * 收集查询源、权限模式、bypass 可用性、沙箱姿态等，组成随请求发送的客户端上下文。
 */
async function buildRequestContextHeaders(
  querySource,
  permissionContext,
  toolNames,
  classifierJudgesServedCall = false,
) {
  let sessionFlags = getSessionFlags();
  let containerRuntime = await envDynamic();
  let w = permissionContext?.mode ?? sessionFlags?.currentPermissionMode ?? sessionFlags?.permissionMode;
  let S =
    permissionContext?.isBypassPermissionsModeAvailable ?? sessionFlags?.bypassPermissionsAvailable !== false;
  let entrypointOnRequests = getEntrypointOnRequests();
  let R = false;
  return {
    querySource,
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
    entrypoint:
      entrypointOnRequests !== undefined &&
      (isCcsTenant() || (isKnownEntrypoint(entrypointOnRequests) && entrypointOnRequests !== CLI_ENTRYPOINT))
        ? entrypointOnRequests
        : env.CLAUDE_CODE_ENTRYPOINT,
    claudeCodeServerTenant: false,
    ...false,
    permissionMode: w,
    bypassPermissionsAvailable: S,
    autoModeActive: isAutoModeActive(),
    ...{},
    classifierJudgesServedCall,
    computerUseActive: getComputerUseSession().binding !== undefined,
    containerRuntime,
    posture: getSandboxPosture(getSessionFlagReaders(), w, S),
    platform: "linux",
    hostEnvironment: runtimeEnvironmentFlag(),
    monorepoCheckout: false,
    gitOrigin: repoSlugForHeader(),
    githubHostedRunner: isEnvTruthy(env.GITHUB_ACTIONS) && env.RUNNER_ENVIRONMENT === "github-hosted",
    internetReachable: undefined,
    overrides: {
      extensions: [],
    },
  };
}
//@ chunk-hwmsct5x.js:259918-259965 placement
var SAFE_HEADER_NAME_RE = /^[a-z][a-z0-9_]*$/;
var PRINTABLE_ASCII_RE = /^[\x20-\x7E]*$/;
//@ chunk-hwmsct5x.js:259965-260152 placement = getCustomHeaders (1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (!getCustomHeaders_3(customHeadersEnv ?? "").some(([r, s]) => isWigglyDoveHeader(r) && s !== ""))
    return false;
  try {
    return customHeadersEnv?.trim() === effectiveEnvSnapshot().ANTHROPIC_CUSTOM_HEADERS?.trim();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-hwmsct5x.js:260152-260218 placement
function isWigglyDoveHeaderEnabled() {
  if (!isFirstPartyApiBackend()) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WIGGLY_DOVE, false)) return false;
  return isFirstPartyBaseUrlSafe();
}
//@ chunk-hwmsct5x.js:260218-260291 placement
function isFirstPartyBaseUrlSafe() {
  if (assumesFirstPartyBaseUrl()) return true;
  try {
    return isFirstPartyBaseUrl();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-hwmsct5x.js:260291-260325 placement
/**
 * 导出函数 `canSendWigglyDoveHeader`：返回 eh() && !getCustomHeaders()。
 */
function canSendWigglyDoveHeader() {
  return isWigglyDoveHeaderEnabled() && !getCustomHeaders();
}
//@ chunk-hwmsct5x.js:260325-260370 placement
function headerNameOrRedacted(e) {
  return SAFE_HEADER_NAME_RE.test(e) ? sfToken(e) : sfString(e);
}
//@ chunk-hwmsct5x.js:260370-260633 placement
function autoModeFlags(e) {
  if (e.classifierJudgesServedCall === true)
    return [
      {
        key: wigglyDoveFieldCodeTt(),
        value: sfInnerList([sfToken(senderAddressHeaderValue(e))]),
      },
    ];
  let permissionMode = e.permissionMode;
  if (permissionMode === undefined) return [];
  let r =
    permissionMode === "auto" ||
    (permissionMode === "plan" && e.autoModeActive && !e.bypassPermissionsAvailable);
  return [
    {
      key: wigglyDoveFieldCodeTt(),
      value: sfInnerList(r ? [sfToken(senderAddressHeaderValue(e))] : []),
    },
  ];
}
//@ chunk-hwmsct5x.js:260633-261384 placement
function encodeEnvironmentFlags(e) {
  let { overrides } = e;
  let r = [];
  let s;
  let h;
  if (false);
  else if (e.containerRuntime !== undefined)
    r.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(containerRuntimeLabel(e.containerRuntime)),
    });
  else if (e.githubHostedRunner)
    r.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeOh()),
    });
  else if (e.posture === null)
    r.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeOz()),
    });
  else if (e.posture.toolSandboxActive)
    switch (e.platform) {
      case "linux":
        r.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeFy()),
        });
        break;
      case "darwin":
        r.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeRl()),
        });
        h = wigglyDoveFieldCodeYb();
        break;
      default:
        r.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeRl()),
        });
        h = e.platform === "win32" ? wigglyDoveFieldCodeNv() : wigglyDoveFieldCodeZb();
        break;
    }
  else {
    r.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeVt()),
    });
    s = e.hostEnvironment ?? wigglyDoveFieldCodeFs();
    if (e.hostEnvironment === undefined)
      h = e.platform === "linux" ? wigglyDoveFieldCodePh() : wigglyDoveFieldCodeZb();
  }
  let w = s;
  if (w !== undefined)
    r.push({
      key: wigglyDoveFieldCodeVd(),
      value: sfToken(w),
    });
  let S = h;
  if (S !== undefined)
    r.push({
      key: wigglyDoveFieldCodeXf(),
      value: sfString(S),
    });
  return r;
}
//@ chunk-hwmsct5x.js:261384-261433 placement
function containerRuntimeLabel(containerRuntime) {
  return containerRuntime === "bubblewrap" ? wigglyDoveFieldCodeFy() : wigglyDoveFieldCodeZr();
}
//@ chunk-hwmsct5x.js:261433-261664 placement
function egressPostureFlags(e) {
  if (e.posture === null)
    return [
      {
        key: wigglyDoveFieldCodeZx(),
        value: sfToken(wigglyDoveFieldCodeIi()),
      },
    ];
  if (!e.posture.egressRestricted)
    return [
      {
        key: wigglyDoveFieldCodeZx(),
        value: sfToken(wigglyDoveFieldCodeFz()),
      },
    ];
  return [
    {
      key: wigglyDoveFieldCodeZx(),
      value: sfToken(e.posture.hostAllowlistEnforced ? wigglyDoveFieldCodeVy() : wigglyDoveFieldCodeBm()),
    },
    {
      key: wigglyDoveFieldCodeZi(),
      value: sfToken(wigglyDoveFieldCodeKb()),
    },
  ];
}
//@ chunk-hwmsct5x.js:261664-261686 placement
function noopSenderHeader(e) {
  return;
}
//@ chunk-hwmsct5x.js:261686-262168 placement
var ENTRYPOINT_CODES = {
  cli: wigglyDoveFieldCodeWb,
  mcp: wigglyDoveFieldCodeSw,
  "sdk-cli": wigglyDoveFieldCodeWj,
  "sdk-ts": wigglyDoveFieldCodeXu,
  "sdk-py": wigglyDoveFieldCodeUm,
  bench: wigglyDoveFieldCodeSa,
  "claude-vscode": wigglyDoveFieldCodeSu,
  "claude-code-github-action": wigglyDoveFieldCodeHo,
  "local-agent": wigglyDoveFieldCodeZg,
  local_agent: wigglyDoveFieldCodeXb,
  "claude-desktop": wigglyDoveFieldCodeKh,
  remote: wigglyDoveFieldCodeZl,
  remote_baku: wigglyDoveFieldCodeXs,
  remote_cowork: wigglyDoveFieldCodeYm,
  remote_trigger: wigglyDoveFieldCodeNp,
  remote_cowork_trigger: wigglyDoveFieldCodeOm,
  remote_desktop: wigglyDoveFieldCodePf,
  remote_mobile: wigglyDoveFieldCodeBt,
  remote_projects: wigglyDoveFieldCodeVo,
  claude_in_slack: wigglyDoveFieldCodeIy,
  "claude-in-slack": wigglyDoveFieldCodeZz,
  "claude-in-teams": wigglyDoveFieldCodeBo,
  "claude-desktop-3p": wigglyDoveFieldCodeQl,
  "claude-security": wigglyDoveFieldCodeMb,
  "ssh-remote": wigglyDoveFieldCodePd,
  "claude-coworker": wigglyDoveFieldCodeBq,
  "claude-coworker-terminal": wigglyDoveFieldCodeTg,
};
//@ chunk-hwmsct5x.js:262168-262210 placement
function isKnownEntrypoint(e) {
  return Object.hasOwn(ENTRYPOINT_CODES, e);
}
//@ chunk-hwmsct5x.js:262210-262251 placement
function entrypointCodeValue(entrypoint) {
  return isKnownEntrypoint(entrypoint) ? ENTRYPOINT_CODES[entrypoint]() : wigglyDoveFieldCodeVr();
}
//@ chunk-hwmsct5x.js:262251-263203 placement
function encodeClientIdentityFlags(requestContextHeaders) {
  let { overrides } = requestContextHeaders;
  let r =
    !requestContextHeaders.claudeCodeServerTenant &&
    (requestContextHeaders.entrypoint === "sdk-ts" || requestContextHeaders.entrypoint === "sdk-py");
  let s = [
    {
      key: wigglyDoveFieldCodeV(),
      value: isTextField(1),
    },
    {
      key: wigglyDoveFieldCodeYw(),
      value: sfToken(wigglyDoveFieldCodeJm()),
    },
  ];
  let h = undefined;
  let y = requestContextHeaders.claudeCodeServerTenant
    ? wigglyDoveFieldCodeYi()
    : (h ?? (r ? undefined : wigglyDoveFieldCodeWm()));
  if (y !== undefined)
    s.push({
      key: wigglyDoveFieldCodeHg(),
      value: headerNameOrRedacted(y),
    });
  s.push(
    {
      key: wigglyDoveFieldCodeYl(),
      value: sfToken(r ? wigglyDoveFieldCodeBx() : wigglyDoveFieldCodeQi()),
    },
    {
      key: wigglyDoveFieldCodeOb(),
      value: sfString(requestContextHeaders.clientVersion),
    },
  );
  if (requestContextHeaders.entrypoint !== undefined && requestContextHeaders.entrypoint !== "") {
    let R = entrypointCodeValue(requestContextHeaders.entrypoint);
    if (R !== undefined)
      s.push({
        key: wigglyDoveFieldCodeSk(),
        value: sfString(R),
      });
  }
  let w = undefined;
  if (w !== undefined)
    s.push({
      key: wigglyDoveFieldCodeRf(),
      value: sfString(w),
    });
  s.push({
    key: wigglyDoveFieldCodeWl(),
    value: sfToken(querySourceFlag(requestContextHeaders.querySource)),
  });
  s.push(...autoModeFlags(requestContextHeaders));
  let S = noopSenderHeader(requestContextHeaders);
  s.push(
    ...(S?.members ?? [
      ...encodeEnvironmentFlags(requestContextHeaders),
      ...egressPostureFlags(requestContextHeaders),
    ]),
  );
  if (requestContextHeaders.computerUseActive)
    s.push(
      {
        key: wigglyDoveFieldCodeFu(),
        value: sfBoolean(true),
      },
      {
        key: wigglyDoveFieldCodeRt(),
        value: sfToken(requestContextHeaders.hostEnvironment ?? wigglyDoveFieldCodeFs()),
      },
    );
  let E = [];
  if (requestContextHeaders.monorepoCheckout) E.push(sfToken(wigglyDoveFieldCodeVb()));
  if (requestContextHeaders.internetReachable === true) E.push(sfToken(wigglyDoveFieldCodeMa()));
  if (E.length > 0)
    s.push({
      key: wigglyDoveFieldCodeMo(),
      value: sfInnerList(E),
    });
  if (requestContextHeaders.gitOrigin !== undefined)
    s.push({
      key: wigglyDoveFieldCodeJy(),
      value: sfString(requestContextHeaders.gitOrigin),
    });
  return s;
}
//@ chunk-hwmsct5x.js:263203-263291 placement
function serializeHeadersSfDictionary(e) {
  return serializeSfDictionary(e, {
    maxMembers: MAX_HEADER_DICT_MEMBERS,
    maxKeyLength: MAX_HEADER_KEY_LENGTH,
    maxValueLength: MAX_HEADER_VALUE_LENGTH,
    onDrop: noteHeaderMemberDropped,
  });
}
//@ chunk-hwmsct5x.js:263291-263451 placement
function noteHeaderMemberDropped(e, n) {
  let headerMemberDropsNoted = streamFallbackWarning().headerMemberDropsNoted;
  if (headerMemberDropsNoted.has(e)) return;
  headerMemberDropsNoted.add(e);
  logForDebugging(`${wigglyDoveHeaderName()}: dropped ${e} (${n}); the rest of the header is sent`, {
    level: "warn",
  });
}
//@ chunk-hwmsct5x.js:263451-263632 placement = getCustomHeaders (1)
function getCustomHeaders_2() {
  let customHeaders = {};
  let n = wigglyDoveHeaderName();
  for (let line of (env.ANTHROPIC_CUSTOM_HEADERS ?? "").split(/\n|\r\n/)) {
    let colonIdx = line.indexOf(":");
    let h = colonIdx >= 0 ? line.slice(0, colonIdx).trim() : "";
    if (h !== n && isWigglyDoveHeader(h)) customHeaders[h] = undefined;
  }
  return customHeaders;
}
//@ chunk-hwmsct5x.js:263632-263803 placement
async function buildClientIdentityHeader({
  querySource,
  permissionContext,
  toolNames,
  classifierJudgesServedCall,
}) {
  if (!isWigglyDoveHeaderEnabled()) return;
  try {
    return serializeHeadersSfDictionary(
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
function identityHeaders(permissionContextHeaderValue, n) {
  if (permissionContextHeaderValue === undefined) return {};
  let r = {};
  for (let key of Object.keys(n)) if (isWigglyDoveHeader(key)) r[key] = undefined;
  if (getCustomHeaders()) {
    for (let [s, h] of getCustomHeaders_3(env.ANTHROPIC_CUSTOM_HEADERS ?? ""))
      if (isWigglyDoveHeader(s)) r[s] = h;
    return r;
  }
  if (streamFallbackWarning().once("own_header_logged"))
    logForDebugging(`${wigglyDoveHeaderName()}: ${permissionContextHeaderValue}`);
  return {
    ...r,
    ...getCustomHeaders_2(),
    [wigglyDoveHeaderName()]: permissionContextHeaderValue,
  };
}
//@ chunk-hwmsct5x.js:264097-264240 placement
var SENDER_ADDR_PATH = "/worker/sender_addr";
var SENDER_ADDR_WAIT_MS = 500;
var SENDER_ADDR_TTL_MS = 45000;
var TENGU_JAUNTY_PIKE = "tengu_jaunty_pike";
var TENGU_SUNNY_GARDEN = "tengu_sunny_garden";
var SENDER_ADDR_RETRIES = 3;
var X_SSR_CLIENT_IP = "x-ssr-client-ip";
var X_SSR_CLIENT_IP_SIG = "x-ssr-client-ip-sig";
//@ chunk-hwmsct5x.js:264240-264358 placement
function getCcrSenderAddressKey(e, n) {
  if (!isCcsTenant()) return;
  let r = turnAttributionKeyFor(e);
  let s = n ?? getPromptId() ?? undefined;
  return r !== undefined && s !== undefined
    ? {
        event: r,
        run: s,
      }
    : undefined;
}
//@ chunk-hwmsct5x.js:264358-264587 placement
async function attachSenderAddress(headers, n) {
  try {
    let startTime = performance.now();
    let ccrSenderAddress = await fetchCcrSenderAddress(n, false);
    let { waits } = streamFallbackWarning().ccsSenderAddr;
    waits.firstMs ??= performance.now() - startTime;
    waits.unsignedCalls += ccrSenderAddress ? 0 : 1;
    if (ccrSenderAddress) {
      headers.set(X_SSR_CLIENT_IP, ccrSenderAddress.ip);
      headers.set(X_SSR_CLIENT_IP_SIG, ccrSenderAddress.sig);
    }
  } catch (error) {
    headers.delete(X_SSR_CLIENT_IP);
    headers.delete(X_SSR_CLIENT_IP_SIG);
    logError(error);
  }
}
//@ chunk-hwmsct5x.js:264587-265488 placement
/**
 * 向 CCR 查询当前事件/运行的发送方地址（x-ssr-client-ip 及签名），带缓存与并发去重。
 */
async function fetchCcrSenderAddress(e, n) {
  let { asking, held } = streamFallbackWarning().ccsSenderAddr;
  let h = `${e.event}|${e.run}`;
  let y = held.get(h);
  if (y !== undefined && Date.now() - y.at < SENDER_ADDR_TTL_MS) return y.pair;
  let w = asking.get(h);
  if (w === undefined) {
    let R = true;
    let uRLSearchParams = new URLSearchParams({
      event: e.event,
      run: e.run,
    });
    let O = AbortSignal.timeout(SENDER_ADDR_WAIT_MS);
    w = {
      answer: apiClient
        .get(`${SENDER_ADDR_PATH}?${uRLSearchParams}`, {
          host: "ccr-session",
          auth: "session-jwt",
          signal: O,
        })
        .then((P) => {
          R = P.ok;
          let H = P.ok && P.status === 200 ? P.data : undefined;
          let j = H?.[X_SSR_CLIENT_IP];
          let z = H?.[X_SSR_CLIENT_IP_SIG];
          return typeof j === "string" &&
            j.length <= 45 &&
            isIP(j) !== 0 &&
            typeof z === "string" &&
            /^[\x21-\x7e]{1,256}$/.test(z)
            ? {
                ip: j,
                sig: z,
              }
            : undefined;
        })
        .catch((error) => {
          logForDebugging(
            `No sender address from CCR: ${O.aborted ? `no answer in ${SENDER_ADDR_WAIT_MS} ms` : errorMessage(error)}`,
          );
          return;
        })
        .finally(() => {
          asking.delete(h);
          streamFallbackWarning().ccsSenderAddr.waits.asks += R ? 1 : 0;
        }),
      mayBeTooSoon: n,
    };
    asking.set(h, w);
  }
  let answer = await w.answer;
  if (answer === undefined && w.mayBeTooSoon) return n ? undefined : fetchCcrSenderAddress(e, false);
  let now = Date.now();
  for (let [R, L] of held) if (now - L.at >= SENDER_ADDR_TTL_MS) held.delete(R);
  held.set(h, {
    pair: answer,
    at: now,
  });
  return answer;
}
//@ chunk-hwmsct5x.js:265488-265683 placement
async function prefetchCcrSenderAddress(e, n = false) {
  try {
    let { asking } = streamFallbackWarning().ccsSenderAddr;
    let s = `${e.event}|${e.run}`;
    let h = asking.get(s);
    fetchCcrSenderAddress(e, n).catch(logError);
    if (asking.get(s) !== h && (n || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAUNTY_PIKE, false)))
      for (let j = 0; j < SENDER_ADDR_RETRIES; j++) await yieldToEventLoop();
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-hwmsct5x.js:265683-265807 placement
function logSenderAddressFailure(error) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the early ask for a sender's address threw: ${errorMessage(error)}`,
      "the early ask for a sender's address threw",
    ),
  );
}
//@ chunk-hwmsct5x.js:265807-265880 placement
/**
 * 导出函数 `isSunnyGardenSenderAddress`：返回 ( isCcsTenant() && isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SUNNY_GARDEN, !1) ); …。
 */
function isSunnyGardenSenderAddress() {
  try {
    return (
      isCcsTenant() &&
      isFirstPartyApiBackend() &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SUNNY_GARDEN, false)
    );
  } catch (error) {
    logSenderAddressFailure(error);
    return false;
  }
}
//@ chunk-hwmsct5x.js:265880-265990 placement
/**
 * 按会话预取 CCR 发送方地址，失败只记录。
 */
async function prefetchSenderAddressFor(e) {
  try {
    let n = e === undefined ? undefined : getCcrSenderAddressKey(undefined, e);
    if (n !== undefined) await prefetchCcrSenderAddress(n, true);
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-hwmsct5x.js:265990-266068 placement
function baseRequestHeaders() {
  return {
    "x-app": isBgSession() ? "cli-bg" : "cli",
    "User-Agent": getUserAgent(),
    [X_CLAUDE_CODE_SESSION_ID]: getSessionId(),
  };
}
//@ chunk-hwmsct5x.js:266068-266151 placement
function getForwardableEnvHeaders() {
  let e = new Set(customHeaderNames());
  return wi(baseRequestHeaders(), (n, r) => e.has(r) || checkValueChars(n) !== null);
}
//@ chunk-hwmsct5x.js:266151-266416 placement
/**
 * 未监视回复暂存流的常量：哪些查询来源的回复要暂存（subagent/auxiliary/compaction）、脉冲/增量事件字节前缀、LF/CR/BOM 字节、最多暂存 256 KB 与发送状态。
 */
var HELD_REPLY_SOURCES = new Set(["subagent", "auxiliary", "compaction"]);
var CONTENT_BLOCK_DELTA_EVENT_BYTES = Buffer.from(`event: content_block_delta
`);
var PING_EVENT_BYTES = Buffer.from(`event: ping
`);
var EVENT_PREFIX_BYTES = Buffer.from("event");
var NEWLINE_EVENT_BYTES = Buffer.from(`
event`);
var LF = 10;
var CR = 13;
var UTF8_BOM_BYTES = Buffer.from("\uFEFF");
var MAX_HELD_BYTES = 262144;
var heldReplyState = identity(
  {
    isSent: false,
  },
  (e) => {
    e.isSent = false;
  },
);
//@ chunk-hwmsct5x.js:266416-266503 placement
function heldReplyHoldMs(e) {
  return e !== undefined && HELD_REPLY_SOURCES.has(e) ? (env.CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS ?? 0) : 0;
}
//@ chunk-aepeg2w5.js:378332-378423 placement
/**
 * 查询来源是否为主线程或代理。
 */
function isMainOrAgentQuerySource(querySource) {
  if (querySource === undefined) return true;
  if (querySource.startsWith("agent:")) return true;
  return RETRY_ON_529_QUERY_SOURCES.has(querySource);
}
//@ chunk-aepeg2w5.js:378423-378511 placement
/**
 * 导出函数 `isRetryOn529Source`：参数 e，返回 !1; let n = RETRY_ON_529_QUERY_SOURCES; return e.startsWith("agent:") || n.has(e)。
 */
function isRetryOn529Source(querySource) {
  if (querySource === undefined) return false;
  let n = RETRY_ON_529_QUERY_SOURCES;
  return querySource.startsWith("agent:") || n.has(querySource);
}
//@ chunk-aepeg2w5.js:378511-378686 placement
/**
 * 把查询来源分为 main/subagent/auxiliary。
 */
function classifyQuerySource(querySource) {
  if (querySource === undefined) return;
  if (querySource.startsWith("repl_main_thread") || querySource === "sdk") return "main";
  if (querySource.startsWith("agent:") || querySource === "hook_agent") return "subagent";
  return "auxiliary";
}
//@ chunk-aepeg2w5.js:378686-378736 placement
/**
 * 是否为主线程查询。
 */
function isMainQuerySource(querySource) {
  return querySource === undefined || classifyQuerySource(querySource) === "main";
}
//@ chunk-aepeg2w5.js:378736-378808 placement
/**
 * 是否为 auto mode 分类器查询。
 */
function isAutoModeQuerySource(querySource) {
  return querySource === "auto_mode" || querySource === "auto_mode_investigator" || false;
}
//@ chunk-aepeg2w5.js:378808-378875 placement
function querySourceFamily(e) {
  let index = e.indexOf(":");
  return index > 0 ? e.slice(0, index) : undefined;
}
//@ chunk-aepeg2w5.js:378875-378955 placement
/**
 * 自定义 agent 来源归一为 agent:custom。
 */
function normalizeAgentQuerySource(querySource) {
  if (querySource?.startsWith("agent:custom:")) return "agent:custom";
  return querySource;
}
//@ chunk-aepeg2w5.js:378955-379097 placement
/**
 * 请求分类请求头 x-claude-code-request-class 与 x-claude-code-agent-type，及允许的请求类别列表。
 */
var X_CLAUDE_CODE_REQUEST_CLASS = "x-claude-code-request-class";
var X_CLAUDE_CODE_AGENT_TYPE = "x-claude-code-agent-type";
var REQUEST_CLASSES = ["main", "subagent", "workflow", "compaction", "auxiliary", "side_reply"];
//@ chunk-aepeg2w5.js:379097-379296 placement
/**
 * 由查询来源确定请求通道（compaction、workflow、subagent 等），可被显式指定覆盖。
 */
function requestLaneFor(source, agentContext, requestClass) {
  if (source === undefined) return;
  if (requestClass !== undefined) return requestClass;
  if (source === "compact") return "compaction";
  let s = classifyQuerySource(source);
  if (s === "subagent" && agentContext.agentType === "subagent" && agentContext.workflowRunId)
    return "workflow";
  return s;
}
//@ chunk-aepeg2w5.js:379296-379320 placement
var AGENT_BUILTIN = "agent:builtin:";
//@ chunk-aepeg2w5.js:379320-379537 placement
/**
 * 由 agent:* 查询来源得出代理种类（teammate、内置代理名、custom）。
 */
function agentKindFor(source, agentContext) {
  if (source === undefined || !source.startsWith("agent:")) return;
  if (agentContext.agentType === "teammate") return "teammate";
  if (source.startsWith(AGENT_BUILTIN)) return source.slice(AGENT_BUILTIN.length) || undefined;
  if (source.startsWith("agent:custom")) return "custom";
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
//@ chunk-aepeg2w5.js:379677-379941 placement
/**
 * 请求头值非法（发送前拒绝）的错误。
 */
class InvalidRequestHeaderValueError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  header;
  source;
  constructor(e, header, source) {
    super(e, "request header value rejected before send: not a valid HTTP header value");
    this.header = header;
    this.source = source;
    this.name = "InvalidRequestHeaderValueError";
  }
  get isUserSupplied() {
    return this.source !== "claude-code";
  }
}
//@ chunk-aepeg2w5.js:379941-381099 placement
/**
 * 保留的请求头名与环境变量到请求头的映射。
 */
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
]);
var RESERVED_HEADER_SOURCE_ENV = {
  "x-client-app": "CLAUDE_AGENT_SDK_CLIENT_APP",
  "x-claude-remote-container-id": "CLAUDE_CODE_CONTAINER_ID",
  "x-claude-remote-session-id": "CLAUDE_CODE_REMOTE_SESSION_ID",
  "User-Agent": "User-Agent environment",
};
var CREDENTIAL_SOURCE_LABELS = {
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
//@ chunk-aepeg2w5.js:381099-382670 placement
/**
 * 校验 x-api-key/Authorization/自定义头的值，非法时抛出带来源的错误。
 */
function validateAuthHeaders({
  apiKey,
  getApiKeySource,
  authToken,
  getAuthTokenSource,
  defaultHeaders,
  authorizationSource,
  customHeaderNames,
  envSuppliedHeaderNames,
}) {
  if (apiKey !== null && isInvalidHeaderPair("x-api-key", apiKey)) {
    let apiKeySource = getApiKeySource();
    throw new InvalidRequestHeaderValueError(
      `Invalid X-Api-Key header value${CREDENTIAL_SOURCE_LABELS[apiKeySource]}: ${describeInvalidHeaderValue(apiKey)}.`,
      "X-Api-Key",
      apiKeySource,
    );
  }
  for (let [key, value] of Object.entries(defaultHeaders)) {
    if (typeof value !== "string" || !isInvalidHeaderPair(key, value)) continue;
    let index = customHeaderNames.indexOf(key);
    let F = `distinct header ${index + 1} of ${customHeaderNames.length} parsed from ANTHROPIC_CUSTOM_HEADERS`;
    if (isInvalidHeaderName(key))
      throw new InvalidRequestHeaderValueError(
        index === -1
          ? `Invalid request header name: the HTTP runtime does not accept it (${characterCount(key.length)}).`
          : `Invalid name for ${F}: the HTTP runtime does not accept it (${characterCount(key.length)}).`,
        "other",
        index === -1 ? "claude-code" : "ANTHROPIC_CUSTOM_HEADERS",
      );
    let L = RESERVED_HEADER_SOURCE_ENV[key];
    if (L !== undefined && envSuppliedHeaderNames.has(key))
      throw new InvalidRequestHeaderValueError(
        `Invalid ${key} header value${CREDENTIAL_SOURCE_LABELS[L]}: ${describeInvalidHeaderValue(value)}.`,
        "other",
        L,
      );
    let G = key === "Authorization" && authorizationSource !== null;
    if (key.toLowerCase() === "authorization") {
      let j = G ? authorizationSource : index === -1 ? "unknown" : "ANTHROPIC_CUSTOM_HEADERS";
      let ee = G && value.startsWith("Bearer ") ? value.slice(7) : value;
      throw new InvalidRequestHeaderValueError(
        `Invalid Authorization header value${CREDENTIAL_SOURCE_LABELS[j]}: ${describeInvalidHeaderValue(ee)}.`,
        "Authorization",
        j,
      );
    }
    if (index !== -1)
      throw new InvalidRequestHeaderValueError(
        `Invalid value for ${F}: ${describeInvalidHeaderValue(value)}.`,
        key.toLowerCase() === "x-api-key" ? "X-Api-Key" : "other",
        "ANTHROPIC_CUSTOM_HEADERS",
      );
    if (L !== undefined)
      throw new InvalidRequestHeaderValueError(
        `Invalid ${key} header value${CREDENTIAL_SOURCE_LABELS[L]}: ${describeInvalidHeaderValue(value)}.`,
        "other",
        L,
      );
    throw new InvalidRequestHeaderValueError(
      RESERVED_REQUEST_HEADERS.has(key)
        ? `Invalid ${key} header value: ${describeInvalidHeaderValue(value)}.`
        : `Invalid request header value: ${describeInvalidHeaderValue(value)}.`,
      "other",
      "claude-code",
    );
  }
  if (authToken !== null && isInvalidHeaderPair("authorization", `Bearer ${authToken}`)) {
    let authTokenSource = getAuthTokenSource();
    throw new InvalidRequestHeaderValueError(
      `Invalid Authorization header value${CREDENTIAL_SOURCE_LABELS[authTokenSource]}: ${describeInvalidHeaderValue(authToken)}.`,
      "Authorization",
      authTokenSource,
    );
  }
}
//@ chunk-aepeg2w5.js:382670-382738 placement
function isInvalidHeaderPair(e, n) {
  try {
    new Headers([[e, n]]);
    return false;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:382738-382806 placement
function isInvalidHeaderName(e) {
  try {
    new Headers([[e, "x"]]);
    return false;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:382806-382945 placement
function describeInvalidHeaderValue(e) {
  let n = checkValueChars(e);
  let r = textLengthAndLines(e);
  return n === null
    ? `it contains a character the HTTP runtime does not accept (${characterCount(r.length)})`
    : describeUnsafeValue(n, r);
}
//@ chunk-aepeg2w5.js:382945-383005 placement
function characterCount(e) {
  return e === 1 ? "1 character" : `${e} characters`;
}
//@ chunk-aepeg2w5.js:383035-383607 placement
/**
 * 已知内容块类型集合。
 */
var KNOWN_CONTENT_BLOCK_TYPES = {
  advisor_tool_result: true,
  bash_code_execution_tool_result: true,
  code_execution_tool_result: true,
  compaction: true,
  container_upload: true,
  document: true,
  fallback: true,
  image: true,
  mcp_tool_listing: true,
  mcp_tool_result: true,
  mcp_tool_use: true,
  redacted_thinking: true,
  search_result: true,
  server_tool_use: true,
  text: true,
  text_editor_code_execution_tool_result: true,
  thinking: true,
  tool_result: true,
  tool_search_tool_result: true,
  tool_addition: true,
  tool_removal: true,
  tool_use: true,
  web_fetch_tool_result: true,
  web_search_tool_result: true,
};
var EXTRA_ALLOWLISTED_BLOCK_TYPES = ["connector_text", "mid_conv_system", "tool_reference"];
var ALLOWLISTED_BLOCK_TYPES = new Set([
  ...Object.keys(KNOWN_CONTENT_BLOCK_TYPES),
  ...EXTRA_ALLOWLISTED_BLOCK_TYPES,
]);
//@ chunk-aepeg2w5.js:383607-383661 placement
/**
 * 是否为已知内容块类型。
 */
function isKnownContentBlockType(type) {
  return typeof type === "string" && ALLOWLISTED_BLOCK_TYPES.has(type);
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
/**
 * 导出函数 `allowlistedBlockType`：参数 e，返回 Sp.has(e) ? e : `non-allowlisted (${e.length} chars)`。
 */
function allowlistedBlockType(e) {
  return ALLOWLISTED_BLOCK_TYPES.has(e) ? e : `non-allowlisted (${e.length} chars)`;
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
]);
var NON_ALLOWLISTED_PATTERN = /^non-allowlisted \(\d{1,4} chars\)$/;
//@ chunk-aepeg2w5.js:384083-384163 placement
function redactUnknownBlockType(e) {
  return isKnownBlockType(e) || NON_ALLOWLISTED_PATTERN.test(e) ? e : `non-allowlisted (${e.length} chars)`;
}
//@ chunk-aepeg2w5.js:384163-384217 placement
function isKnownBlockType(e) {
  return ALLOWLISTED_BLOCK_TYPES.has(e) || KNOWN_BLOCK_TYPES.has(e) || KNOWN_ENUM_VALUES.has(e);
}
export {
  isKnownContentBlockType,
  isAutoModeQuerySource,
  isSunnyGardenSenderAddress,
  prefetchSenderAddressFor,
  classifyQuerySource,
  querySourceFamily,
  normalizeAgentQuerySource,
  InvalidRequestHeaderValueError,
  getCcrSenderAddressKey,
  prefetchCcrSenderAddress,
  canSendWigglyDoveHeader,
  isMainOrAgentQuerySource,
  getForwardableEnvHeaders,
  isMainQuerySource,
  redactUnknownBlockType,
  validateAuthHeaders,
  allowlistedBlockType,
  requestLaneFor,
  agentKindFor,
  isRetryOn529Source,
  buildClientIdentityHeader,
  baseRequestHeaders,
  X_CLAUDE_REMOTE_SESSION_ORIGIN,
  X_CLAUDE_CODE_REQUEST_CLASS,
  X_CLAUDE_CODE_AGENT_TYPE,
  X_CLAUDE_CODE_PROMPT_ID,
  identityHeaders,
  X_COWORK_ENROLLMENT,
  attachSenderAddress,
  heldReplyHoldMs,
  LF,
  CR,
  UTF8_BOM_BYTES,
  EVENT_PREFIX_BYTES,
  CONTENT_BLOCK_DELTA_EVENT_BYTES,
  PING_EVENT_BYTES,
  MAX_HELD_BYTES,
  heldReplyState,
  NEWLINE_EVENT_BYTES,
  REQUEST_CLASSES,
  X_CLAUDE_CODE_SESSION_ID,
};
