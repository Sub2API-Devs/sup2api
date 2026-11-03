/**
 * services/cloudSessions/setupProgress.ts
 *
 * 2.1.316 新增：把云会话准备事件应用到进度状态（重新开始、标记失败等）；更新单个准备步骤的状态与标签等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tp07j3pd.js (21)
 * attribution: placement 21
 */
import {
  sanitizeShortHostText,
  parseSafeInteger,
  DNS_ERROR_CACHE_MS,
  DNS_POSITIVE_CACHE_MS,
  MAX_EXPECTED_STEPS,
  sanitizeHostText,
  tailOfDnsResponse,
} from "../../utils/hooks/ssrfGuard.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { uniq, arraysEqual } from "../../utils/collections.js";
import { formatDurationCoarse } from "../../utils/format.js";

//@ chunk-tp07j3pd.js:758-771 placement
var STALE_AFTER_MS = 300000;
//@ chunk-tp07j3pd.js:771-895 placement = isBlockedV4 (0.697)
/**
 * 时间戳是否早于 5 分钟前。旧版名 isBlockedV4 配错（与 SSRF 无关）。
 */
function isStaleTimestamp(e, t) {
  let timestamp = e.data?.timestamp;
  if (typeof timestamp !== "string") return false;
  let timestamp_2 = Date.parse(timestamp);
  return !Number.isNaN(timestamp_2) && t - timestamp_2 > STALE_AFTER_MS;
}
//@ chunk-tp07j3pd.js:895-949 placement
/**
 * 云会话启动的四个步骤：provision、clone、setup_script、start_cc。
 */
var SETUP_STEPS = ["provision", "clone", "setup_script", "start_cc"];
//@ chunk-tp07j3pd.js:949-986 placement
/**
 * 判断事件里的步骤 id 是否属于四个已知步骤。
 */
function isSetupStep(id) {
  return SETUP_STEPS.includes(id);
}
//@ chunk-tp07j3pd.js:986-1005 placement
/**
 * 时间戳下限的余量（5 秒）。
 */
var TIMESTAMP_SKEW_MS = 60000;
var MIN_TIMESTAMP_MS = 5000;
//@ chunk-tp07j3pd.js:1005-1151 placement
function isLiveFrameTimestamp(e, t, n) {
  let timestamp = e.data?.timestamp;
  if (typeof timestamp !== "string") return false;
  let timestamp_2 = Date.parse(timestamp);
  return (
    Number.isFinite(timestamp_2) &&
    Math.abs(t - timestamp_2) <= TIMESTAMP_SKEW_MS &&
    timestamp_2 >= n - MIN_TIMESTAMP_MS
  );
}
//@ chunk-tp07j3pd.js:1151-1374 placement
/**
 * 新建云会话准备进度状态（步骤列表、模式、来源、计数）。
 */
function createSetupProgress(startedAt, { wake }) {
  return {
    steps: SETUP_STEPS.map((id) => ({
      id,
      status: "pending",
    })),
    sessionMode: null,
    setupSource: null,
    wake,
    startedAt,
    hasStructuredSteps: false,
    terminal: false,
    dismissed: false,
    sawLiveFrame: false,
    hadLiveCycle: false,
    queuedCount: 0,
  };
}
//@ chunk-tp07j3pd.js:1374-1535 placement
function readSetupStepFields(e) {
  let extra = e.data?.extra;
  return {
    stepId: typeof extra?.step_id === "string" ? sanitizeShortHostText(extra.step_id) : null,
    stepStatus: typeof extra?.step_status === "string" ? extra.step_status : null,
  };
}
//@ chunk-tp07j3pd.js:1535-1914 placement
/**
 * 判断一帧消息对准备进度显示的意义（notice/实时内容等）。
 */
function classifySetupFrame(e, request) {
  if (e === null || !e.hasStructuredSteps || e.terminal) return null;
  switch (request.type) {
    case "system":
      return request.subtype === "init_milestone" || request.subtype === "informational" ? "notice" : null;
    case "assistant":
      return request.isApiErrorMessage === true &&
        isPlainObject(request.message) &&
        request.message.model === SYNTHETIC_MODEL
        ? "notice"
        : null;
    case "result":
      return isPlainObject(request.runner_exit) && "phase" in request.runner_exit ? "failed" : null;
    default:
      return null;
  }
}
//@ chunk-tp07j3pd.js:1914-2182 placement
function markCurrentStepFailed(e, completedAt) {
  let o =
    e.steps.findLast((step) => step.status === "running") ??
    e.steps.find((step) => step.status === "pending");
  if (o === undefined || e.steps.some((step) => step.status === "failed")) return e;
  return {
    ...e,
    steps: e.steps.map((step) =>
      step === o
        ? {
            ...step,
            status: "failed",
            completedAt,
            detail: undefined,
          }
        : step,
    ),
  };
}
//@ chunk-tp07j3pd.js:2182-3588 placement
/**
 * 把云会话准备事件应用到进度状态（重新开始、标记失败等）。
 */
function applySetupEvent(e, t, n, o, r) {
  let extra = t.data?.extra;
  let { stepId, stepStatus } = readSetupStepFields(t);
  let s =
    (e.terminal ||
      (stepId === "provision" &&
        stepStatus !== "failed" &&
        e.steps.some((step) => step.status === "failed"))) &&
    stepId !== null &&
    stepStatus !== null
      ? {
          ...createSetupProgress(o, {
            wake: true,
          }),
          dismissed: e.hadLiveCycle,
          hadLiveCycle: e.hadLiveCycle,
        }
      : e;
  if (stepId !== null && stepStatus !== null && !s.sawLiveFrame && isLiveFrameTimestamp(t, o, r))
    s = {
      ...s,
      sawLiveFrame: true,
    };
  if (typeof extra?.session_mode === "string") {
    let sessionMode = extra.session_mode;
    if (
      (sessionMode === "new" ||
        sessionMode === "resume" ||
        sessionMode === "resume-cached" ||
        sessionMode === "setup-only") &&
      s.sessionMode !== sessionMode
    )
      s = {
        ...s,
        sessionMode,
      };
  }
  let setupSource = extra?.setup_source;
  if (
    (setupSource === "checkpoint" ||
      setupSource === "building_checkpoint" ||
      setupSource === "checkpoint_restore_failed") &&
    s.setupSource !== setupSource
  )
    s = {
      ...s,
      setupSource,
    };
  let safeInteger = parseSafeInteger(extra?.setup_script_duration_ms);
  if (
    safeInteger !== undefined &&
    safeInteger >= DNS_ERROR_CACHE_MS &&
    safeInteger <= DNS_POSITIVE_CACHE_MS &&
    s.setupScriptDurationMs !== safeInteger &&
    !s.steps.some((step) => step.id === "setup_script" && step.status === "completed")
  )
    s = {
      ...s,
      setupScriptDurationMs: safeInteger,
    };
  if (typeof extra?.expected_steps === "string") {
    let sliced = uniq(
      extra.expected_steps
        .split(",")
        .map((u) => sanitizeShortHostText(u))
        .filter((u) => u !== ""),
    ).slice(0, MAX_EXPECTED_STEPS);
    if (sliced.length > 0) {
      let u = new Map(s.steps.map((step) => [step.id, step]));
      let mapped = sliced.map(
        (m) =>
          u.get(m) ?? {
            id: m,
            status: "pending",
          },
      );
      let filtered = s.steps.filter((step) => !sliced.includes(step.id) && step.status !== "pending");
      s = {
        ...s,
        steps: [...filtered, ...mapped],
      };
    }
  }
  if (stepId !== null && stepStatus !== null)
    s = updateSetupStep(s, {
      stepId,
      stepStatus,
      extra,
      line: n,
      now: o,
    });
  else if (n !== "") {
    let index = s.steps.findIndex((step) => step.status === "running");
    if (index !== -1 && s.steps[index].detail !== n) {
      let sliced = s.steps.slice();
      sliced[index] = {
        ...sliced[index],
        detail: n,
      };
      s = {
        ...s,
        steps: sliced,
      };
    }
  }
  return s;
}
//@ chunk-tp07j3pd.js:3588-4922 placement
/**
 * 更新单个准备步骤的状态与标签。
 */
function updateSetupStep(e, { stepId, stepStatus, extra, line, now }) {
  let c = sanitizeShortHostText(stepId);
  let steps = e.steps;
  let index = steps.findIndex((step) => step.id === c);
  if (index === -1) {
    if (steps.length >= MAX_EXPECTED_STEPS) return e;
    let label = sanitizeHostText(extra?.step_label) || line;
    steps = [
      ...steps,
      {
        id: c,
        label,
        status: "pending",
      },
    ];
    index = steps.length - 1;
  }
  let s = steps[index];
  let l =
    typeof extra?.progress_label === "string" && line !== "" ? line : sanitizeHostText(extra?.step_detail);
  let p = null;
  switch (stepStatus) {
    case "started":
      if (s.status === "pending")
        p = {
          ...s,
          status: "running",
          startedAt: now,
          detail: l,
          output: tailOfDnsResponse(extra?.output),
        };
      else {
        let u = l ?? s.detail;
        let g = (s.status === "running" ? tailOfDnsResponse(extra?.output) : undefined) ?? s.output;
        if (u !== s.detail || !arraysEqual(g, s.output))
          p = {
            ...s,
            detail: u,
            output: g,
          };
      }
      break;
    case "completed":
      if (c === "clone" && (l || typeof extra?.clone_phase === "string")) break;
      if (s.status !== "completed")
        p = {
          ...s,
          status: "completed",
          completedAt: now,
          completedMode: completedSetupMode(e),
          detail: undefined,
          output: undefined,
        };
      break;
    case "failed": {
      let u = {
        ...s,
        status: "failed",
        completedAt: s.status === "failed" ? s.completedAt : now,
        error: line || undefined,
        output: tailOfDnsResponse(extra?.output) ?? s.output,
        exitCode: parseSafeInteger(extra?.exit_code) ?? s.exitCode,
      };
      if (
        s.status !== "failed" ||
        s.error !== u.error ||
        s.exitCode !== u.exitCode ||
        !arraysEqual(s.output, u.output)
      )
        p = u;
      break;
    }
    case "skipped":
      if (s.status === "pending" || s.status === "running")
        p = {
          ...s,
          status: "skipped",
          detail: undefined,
        };
      break;
    default:
      break;
  }
  if (p !== null) {
    steps = steps === e.steps ? e.steps.slice() : steps;
    steps[index] = p;
  }
  if (steps === e.steps) return e;
  let i = {
    ...e,
    steps,
    hasStructuredSteps: true,
  };
  if (c === "start_cc" && stepStatus === "completed") i = completeSetupProgress(i, now);
  return i;
}
//@ chunk-tp07j3pd.js:4922-5211 placement
function completeSetupProgress(e, completedAt) {
  if (e.terminal) return e;
  let completedMode = completedSetupMode(e);
  let steps = e.steps.map((step) =>
    step.status === "pending"
      ? {
          ...step,
          status: "skipped",
        }
      : step.status === "running"
        ? {
            ...step,
            status: "completed",
            completedAt,
            completedMode,
          }
        : step,
  );
  return {
    ...e,
    steps,
    terminal: true,
    completedAt,
    hadLiveCycle: e.hadLiveCycle || e.sawLiveFrame,
  };
}
//@ chunk-tp07j3pd.js:5211-5518 placement
/**
 * 由会话模式与准备来源推断完成方式（resume/restored/new）。
 */
function completedSetupMode(e) {
  switch (e.sessionMode) {
    case "resume":
      return "resume";
    case "resume-cached":
      switch (e.setupSource) {
        case "checkpoint":
          return "restored";
        case "checkpoint_restore_failed":
        case "building_checkpoint":
          return "new";
        case null:
          break;
      }
      return e.wake ? "resume" : "new";
    case "new":
    case "setup-only":
    case null:
      return "new";
  }
}
//@ chunk-tp07j3pd.js:5518-6181 placement
/**
 * 生成准备步骤的显示文字（创建/恢复容器、克隆、安装脚本、启动 CC）。
 */
function setupStepLabel(e, t) {
  let n = e.status === "completed";
  let o = (n ? e.completedMode : undefined) ?? t;
  switch (e.id) {
    case "provision":
      if (o === "resume") return n ? "Resumed your cloud container" : "Resuming your cloud container";
      return n ? "Set up a cloud container" : "Setting up a cloud container";
    case "clone":
      if (o !== "new") return n ? "Refreshed repository" : "Refreshing repository";
      return n ? "Cloned repository" : "Cloning repository";
    case "setup_script":
      if (e.status === "failed") return "Setup script failed";
      if (n) return o === "restored" ? "Restored from snapshot" : "Ran setup script";
      return "Running setup script";
    case "start_cc":
      return n ? "Started Claude Code" : "Starting Claude Code";
    default:
      return e.label || e.id;
  }
}
//@ chunk-tp07j3pd.js:6181-6448 placement
function setupHeadline(e, t = false) {
  if (t) return e === "resume" ? "Cloud session didn't resume" : "Cloud session didn't start";
  switch (e) {
    case "new":
      return "Setting up remote session";
    case "resume":
      return "Resuming remote session";
    case "restored":
      return "Restored from snapshot of setup script";
  }
}
//@ chunk-tp07j3pd.js:6448-6883 placement
/**
 * 步骤附注（恢复时节省的时间、进行中的进度）。
 */
function setupStepAnnotation(appState, step, n) {
  if (step.status === "completed")
    return (step.completedMode ?? n) === "restored" && appState.setupScriptDurationMs !== undefined
      ? ` \xB7 saved about ${formatDurationCoarse(appState.setupScriptDurationMs)}`
      : "";
  if (step.status !== "pending" && step.status !== "running") return "";
  switch (appState.setupSource) {
    case "building_checkpoint":
      return " \xB7 saving so your next session skips this";
    case "checkpoint_restore_failed":
      return " \xB7 couldn't use snapshot";
    case "checkpoint":
    case null:
      return "";
  }
}
//@ chunk-tp07j3pd.js:6883-7101 placement
function currentSetupLabel(e) {
  let sessionMode = e.terminal ? null : e.sessionMode;
  let n = completedSetupMode({
    sessionMode: sessionMode ?? (e.hadLiveCycle ? "resume" : null),
    setupSource: e.setupSource,
    wake: e.wake,
  });
  let last = e.steps.findLast((step) => step.status === "running");
  return (last && setupStepLabel(last, n)) || setupHeadline(n);
}
//@ chunk-tp07j3pd.js:7101-7370 placement
function setupReadySummary(e) {
  let t = completedSetupMode(e);
  let n = (e.completedAt ?? e.startedAt) - e.startedAt;
  let o = formatSetupDuration(n);
  switch (t) {
    case "new":
      return `Remote session ready in ${o}`;
    case "resume":
      return `Remote session resumed in ${o}`;
    case "restored":
      return `Remote session ready in ${o} \xB7 restored from snapshot`;
  }
}
//@ chunk-tp07j3pd.js:7370-7617 placement
function stepDurationSuffix(step, now) {
  if (step.startedAt === undefined) return "";
  if (step.status === "completed")
    return step.completedAt === undefined
      ? ""
      : ` (${formatSetupDuration(step.completedAt - step.startedAt)})`;
  let max = Math.max(0, now - step.startedAt);
  return step.status === "running" && max >= 5000 ? ` (${Math.round(max / 1000)}s)` : "";
}
//@ chunk-tp07j3pd.js:7617-7771 placement
function formatSetupDuration(e) {
  if (e < 1e4) return `${(Math.max(e, 100) / 1000).toFixed(1)}s`;
  let rounded = Math.round(e / 1000);
  if (rounded < 60) return `${rounded}s`;
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}
export {
  setupReadySummary,
  completeSetupProgress,
  isStaleTimestamp,
  createSetupProgress,
  applySetupEvent,
  currentSetupLabel,
  classifySetupFrame,
  markCurrentStepFailed,
  readSetupStepFields,
  isSetupStep,
  setupStepLabel,
  completedSetupMode,
  setupHeadline,
  setupStepAnnotation,
  stepDurationSuffix,
};
