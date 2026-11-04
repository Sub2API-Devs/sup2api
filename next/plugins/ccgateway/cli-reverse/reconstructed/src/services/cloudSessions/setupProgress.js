/**
 * services/cloudSessions/setupProgress.ts
 *
 * 2.1.316 新增：把云会话准备事件应用到进度状态（重新开始、标记失败等）；更新单个准备步骤的状态与标签等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tp07j3pd.js (26)
 * attribution: placement 26
 */
import { sanitizeDisplayText, tailLines } from "../../utils/resultError.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { uniq, arraysEqual } from "../../utils/collections.js";
import { formatDurationCoarse } from "../../utils/format.js";

//@ chunk-tp07j3pd.js:376-449 placement
/**
 * 清洗主机相关展示文本（上限 512）。
 */
function sanitizeHostText(hostText) {
  return typeof hostText === "string"
    ? sanitizeDisplayText(hostText, {
        maxCodeUnits: 512,
      })
    : undefined;
}
//@ chunk-tp07j3pd.js:449-494 placement
/**
 * 清洗短主机文本（上限 64）。
 */
function sanitizeShortHostText(hostText) {
  return sanitizeDisplayText(hostText, {
    maxCodeUnits: 64,
  });
}
//@ chunk-tp07j3pd.js:494-525 placement
/**
 * DNS 结果缓存与解析限制常量（标签数、TTL 等）。
 */
var MAX_EXPECTED_STEPS = 32;
var DNS_ERROR_CACHE_MS = 1000;
var DNS_POSITIVE_CACHE_MS = 86400000;
var MAX_DNS_TAIL_LINES = 5;
//@ chunk-tp07j3pd.js:525-613 placement
/**
 * 取 DNS 响应文本的最后若干行（失败返回 undefined）。
 */
function tailOfDnsResponse(output) {
  if (typeof output !== "string") return;
  let tailLinesText = tailLines(output, MAX_DNS_TAIL_LINES);
  return tailLinesText.length === 0 ? undefined : tailLinesText;
}
//@ chunk-tp07j3pd.js:613-758 placement
function parseSafeInteger(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : undefined;
  return typeof value === "string" && /^-?\d{1,15}$/.test(value) ? Number(value) : undefined;
}
//@ chunk-tp07j3pd.js:758-771 placement
var STALE_AFTER_MS = 300000;
//@ chunk-tp07j3pd.js:771-895 placement = isBlockedV4 (0.697)
/**
 * 时间戳是否早于 5 分钟前。旧版名 isBlockedV4 配错（与 SSRF 无关）。
 */
function isStaleTimestamp(frame, now) {
  let timestamp = frame.data?.timestamp;
  if (typeof timestamp !== "string") return false;
  let timestamp_2 = Date.parse(timestamp);
  return !Number.isNaN(timestamp_2) && now - timestamp_2 > STALE_AFTER_MS;
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
function isLiveFrameTimestamp(frame, now, startedAt) {
  let timestamp = frame.data?.timestamp;
  if (typeof timestamp !== "string") return false;
  let timestamp_2 = Date.parse(timestamp);
  return (
    Number.isFinite(timestamp_2) &&
    Math.abs(now - timestamp_2) <= TIMESTAMP_SKEW_MS &&
    timestamp_2 >= startedAt - MIN_TIMESTAMP_MS
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
function readSetupStepFields(frame) {
  let extra = frame.data?.extra;
  return {
    stepId: typeof extra?.step_id === "string" ? sanitizeShortHostText(extra.step_id) : null,
    stepStatus: typeof extra?.step_status === "string" ? extra.step_status : null,
  };
}
//@ chunk-tp07j3pd.js:1535-1914 placement
/**
 * 判断一帧消息对准备进度显示的意义（notice/实时内容等）。
 */
function classifySetupFrame(progress, request) {
  if (progress === null || !progress.hasStructuredSteps || progress.terminal) return null;
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
function markCurrentStepFailed(progress, completedAt) {
  let targetStep =
    progress.steps.findLast((step) => step.status === "running") ??
    progress.steps.find((step) => step.status === "pending");
  if (targetStep === undefined || progress.steps.some((step) => step.status === "failed")) return progress;
  return {
    ...progress,
    steps: progress.steps.map((step) =>
      step === targetStep
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
function applySetupEvent(state, event, line, now, timing) {
  let extra = event.data?.extra;
  let { stepId, stepStatus } = readSetupStepFields(event);
  let nextState =
    (state.terminal ||
      (stepId === "provision" &&
        stepStatus !== "failed" &&
        state.steps.some((step) => step.status === "failed"))) &&
    stepId !== null &&
    stepStatus !== null
      ? {
          ...createSetupProgress(now, {
            wake: true,
          }),
          dismissed: state.hadLiveCycle,
          hadLiveCycle: state.hadLiveCycle,
        }
      : state;
  if (
    stepId !== null &&
    stepStatus !== null &&
    !nextState.sawLiveFrame &&
    isLiveFrameTimestamp(event, now, timing)
  )
    nextState = {
      ...nextState,
      sawLiveFrame: true,
    };
  if (typeof extra?.session_mode === "string") {
    let sessionMode = extra.session_mode;
    if (
      (sessionMode === "new" ||
        sessionMode === "resume" ||
        sessionMode === "resume-cached" ||
        sessionMode === "setup-only") &&
      nextState.sessionMode !== sessionMode
    )
      nextState = {
        ...nextState,
        sessionMode,
      };
  }
  let setupSource = extra?.setup_source;
  if (
    (setupSource === "checkpoint" ||
      setupSource === "building_checkpoint" ||
      setupSource === "checkpoint_restore_failed") &&
    nextState.setupSource !== setupSource
  )
    nextState = {
      ...nextState,
      setupSource,
    };
  let safeInteger = parseSafeInteger(extra?.setup_script_duration_ms);
  if (
    safeInteger !== undefined &&
    safeInteger >= DNS_ERROR_CACHE_MS &&
    safeInteger <= DNS_POSITIVE_CACHE_MS &&
    nextState.setupScriptDurationMs !== safeInteger &&
    !nextState.steps.some((step) => step.id === "setup_script" && step.status === "completed")
  )
    nextState = {
      ...nextState,
      setupScriptDurationMs: safeInteger,
    };
  if (typeof extra?.expected_steps === "string") {
    let sliced = uniq(
      extra.expected_steps
        .split(",")
        .map((entry) => sanitizeShortHostText(entry))
        .filter((stepName) => stepName !== ""),
    ).slice(0, MAX_EXPECTED_STEPS);
    if (sliced.length > 0) {
      let stepById = new Map(nextState.steps.map((step) => [step.id, step]));
      let mapped = sliced.map(
        (stepName) =>
          stepById.get(stepName) ?? {
            id: stepName,
            status: "pending",
          },
      );
      let filtered = nextState.steps.filter((step) => !sliced.includes(step.id) && step.status !== "pending");
      nextState = {
        ...nextState,
        steps: [...filtered, ...mapped],
      };
    }
  }
  if (stepId !== null && stepStatus !== null)
    nextState = updateSetupStep(nextState, {
      stepId,
      stepStatus,
      extra,
      line,
      now,
    });
  else if (line !== "") {
    let index = nextState.steps.findIndex((step) => step.status === "running");
    if (index !== -1 && nextState.steps[index].detail !== line) {
      let sliced = nextState.steps.slice();
      sliced[index] = {
        ...sliced[index],
        detail: line,
      };
      nextState = {
        ...nextState,
        steps: sliced,
      };
    }
  }
  return nextState;
}
//@ chunk-tp07j3pd.js:3588-4922 placement
/**
 * 更新单个准备步骤的状态与标签。
 */
function updateSetupStep(state, { stepId, stepStatus, extra, line, now }) {
  let stepKey = sanitizeShortHostText(stepId);
  let steps = state.steps;
  let index = steps.findIndex((step) => step.id === stepKey);
  if (index === -1) {
    if (steps.length >= MAX_EXPECTED_STEPS) return state;
    let label = sanitizeHostText(extra?.step_label) || line;
    steps = [
      ...steps,
      {
        id: stepKey,
        label,
        status: "pending",
      },
    ];
    index = steps.length - 1;
  }
  let step = steps[index];
  let detail =
    typeof extra?.progress_label === "string" && line !== "" ? line : sanitizeHostText(extra?.step_detail);
  let updatedStep = null;
  switch (stepStatus) {
    case "started":
      if (step.status === "pending")
        updatedStep = {
          ...step,
          status: "running",
          startedAt: now,
          detail,
          output: tailOfDnsResponse(extra?.output),
        };
      else {
        let nextDetail = detail ?? step.detail;
        let nextOutput =
          (step.status === "running" ? tailOfDnsResponse(extra?.output) : undefined) ?? step.output;
        if (nextDetail !== step.detail || !arraysEqual(nextOutput, step.output))
          updatedStep = {
            ...step,
            detail: nextDetail,
            output: nextOutput,
          };
      }
      break;
    case "completed":
      if (stepKey === "clone" && (detail || typeof extra?.clone_phase === "string")) break;
      if (step.status !== "completed")
        updatedStep = {
          ...step,
          status: "completed",
          completedAt: now,
          completedMode: completedSetupMode(state),
          detail: undefined,
          output: undefined,
        };
      break;
    case "failed": {
      let failedStep = {
        ...step,
        status: "failed",
        completedAt: step.status === "failed" ? step.completedAt : now,
        error: line || undefined,
        output: tailOfDnsResponse(extra?.output) ?? step.output,
        exitCode: parseSafeInteger(extra?.exit_code) ?? step.exitCode,
      };
      if (
        step.status !== "failed" ||
        step.error !== failedStep.error ||
        step.exitCode !== failedStep.exitCode ||
        !arraysEqual(step.output, failedStep.output)
      )
        updatedStep = failedStep;
      break;
    }
    case "skipped":
      if (step.status === "pending" || step.status === "running")
        updatedStep = {
          ...step,
          status: "skipped",
          detail: undefined,
        };
      break;
    default:
      break;
  }
  if (updatedStep !== null) {
    steps = steps === state.steps ? state.steps.slice() : steps;
    steps[index] = updatedStep;
  }
  if (steps === state.steps) return state;
  let nextState = {
    ...state,
    steps,
    hasStructuredSteps: true,
  };
  if (stepKey === "start_cc" && stepStatus === "completed") nextState = completeSetupProgress(nextState, now);
  return nextState;
}
//@ chunk-tp07j3pd.js:4922-5211 placement
function completeSetupProgress(progress, completedAt) {
  if (progress.terminal) return progress;
  let completedMode = completedSetupMode(progress);
  let steps = progress.steps.map((step) =>
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
    ...progress,
    steps,
    terminal: true,
    completedAt,
    hadLiveCycle: progress.hadLiveCycle || progress.sawLiveFrame,
  };
}
//@ chunk-tp07j3pd.js:5211-5518 placement
/**
 * 由会话模式与准备来源推断完成方式（resume/restored/new）。
 */
function completedSetupMode(progress) {
  switch (progress.sessionMode) {
    case "resume":
      return "resume";
    case "resume-cached":
      switch (progress.setupSource) {
        case "checkpoint":
          return "restored";
        case "checkpoint_restore_failed":
        case "building_checkpoint":
          return "new";
        case null:
          break;
      }
      return progress.wake ? "resume" : "new";
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
function setupStepLabel(step, fallbackMode) {
  let isCompleted = step.status === "completed";
  let mode = (isCompleted ? step.completedMode : undefined) ?? fallbackMode;
  switch (step.id) {
    case "provision":
      if (mode === "resume")
        return isCompleted ? "Resumed your cloud container" : "Resuming your cloud container";
      return isCompleted ? "Set up a cloud container" : "Setting up a cloud container";
    case "clone":
      if (mode !== "new") return isCompleted ? "Refreshed repository" : "Refreshing repository";
      return isCompleted ? "Cloned repository" : "Cloning repository";
    case "setup_script":
      if (step.status === "failed") return "Setup script failed";
      if (isCompleted) return mode === "restored" ? "Restored from snapshot" : "Ran setup script";
      return "Running setup script";
    case "start_cc":
      return isCompleted ? "Started Claude Code" : "Starting Claude Code";
    default:
      return step.label || step.id;
  }
}
//@ chunk-tp07j3pd.js:6181-6448 placement
function setupHeadline(mode, failed = false) {
  if (failed) return mode === "resume" ? "Cloud session didn't resume" : "Cloud session didn't start";
  switch (mode) {
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
function setupStepAnnotation(appState, step, fallbackMode) {
  if (step.status === "completed")
    return (step.completedMode ?? fallbackMode) === "restored" && appState.setupScriptDurationMs !== undefined
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
function currentSetupLabel(progress) {
  let sessionMode = progress.terminal ? null : progress.sessionMode;
  let mode = completedSetupMode({
    sessionMode: sessionMode ?? (progress.hadLiveCycle ? "resume" : null),
    setupSource: progress.setupSource,
    wake: progress.wake,
  });
  let last = progress.steps.findLast((step) => step.status === "running");
  return (last && setupStepLabel(last, mode)) || setupHeadline(mode);
}
//@ chunk-tp07j3pd.js:7101-7370 placement
function setupReadySummary(progress) {
  let mode = completedSetupMode(progress);
  let elapsedMs = (progress.completedAt ?? progress.startedAt) - progress.startedAt;
  let duration = formatSetupDuration(elapsedMs);
  switch (mode) {
    case "new":
      return `Remote session ready in ${duration}`;
    case "resume":
      return `Remote session resumed in ${duration}`;
    case "restored":
      return `Remote session ready in ${duration} \xB7 restored from snapshot`;
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
function formatSetupDuration(ms) {
  if (ms < 1e4) return `${(Math.max(ms, 100) / 1000).toFixed(1)}s`;
  let rounded = Math.round(ms / 1000);
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
