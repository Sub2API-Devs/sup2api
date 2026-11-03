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
import { y, parseSafeInteger, k, B, _, M, S } from "../../utils/hooks/ssrfGuard.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { uniq, arraysEqual } from "../../utils/collections.js";
import { formatDurationCoarse } from "../../utils/format.js";

//@ chunk-tp07j3pd.js:758-771 placement
var STALE_AFTER_MS = 300000;
/**
 * 时间戳是否早于 5 分钟前。旧版名 isBlockedV4 配错（与 SSRF 无关）。
 */
//@ chunk-tp07j3pd.js:771-895 placement = isBlockedV4 (0.697)
function isStaleTimestamp(e, t) {
  let n = e.data?.timestamp;
  if (typeof n !== "string") return !1;
  let parse = Date.parse(n);
  return !Number.isNaN(parse) && t - parse > STALE_AFTER_MS;
}
//@ chunk-tp07j3pd.js:895-949 placement
var R = ["provision", "clone", "setup_script", "start_cc"];
//@ chunk-tp07j3pd.js:949-986 placement
function rCs(e) {
  return R.includes(e);
}
//@ chunk-tp07j3pd.js:986-1005 placement
var w = 60000,
  C = 5000;
//@ chunk-tp07j3pd.js:1005-1151 placement
function isLiveFrameTimestamp(e, t, n) {
  let o = e.data?.timestamp;
  if (typeof o !== "string") return !1;
  let parse = Date.parse(o);
  return Number.isFinite(parse) && Math.abs(t - parse) <= w && parse >= n - C;
}
/**
 * 新建云会话准备进度状态（步骤列表、模式、来源、计数）。
 */
//@ chunk-tp07j3pd.js:1151-1374 placement
function createSetupProgress(e, { wake: wake }) {
  return {
    steps: R.map((n) => ({ id: n, status: "pending" })),
    sessionMode: null,
    setupSource: null,
    wake: wake,
    startedAt: e,
    hasStructuredSteps: !1,
    terminal: !1,
    dismissed: !1,
    sawLiveFrame: !1,
    hadLiveCycle: !1,
    queuedCount: 0,
  };
}
//@ chunk-tp07j3pd.js:1374-1535 placement
function readSetupStepFields(e) {
  let t = e.data?.extra;
  return {
    stepId: typeof t?.step_id === "string" ? y(t.step_id) : null,
    stepStatus: typeof t?.step_status === "string" ? t.step_status : null,
  };
}
/**
 * 判断一帧消息对准备进度显示的意义（notice/实时内容等）。
 */
//@ chunk-tp07j3pd.js:1535-1914 placement
function classifySetupFrame(e, t) {
  if (e === null || !e.hasStructuredSteps || e.terminal) return null;
  switch (t.type) {
    case "system":
      return t.subtype === "init_milestone" || t.subtype === "informational" ? "notice" : null;
    case "assistant":
      return t.isApiErrorMessage === !0 && isPlainObject(t.message) && t.message.model === SYNTHETIC_MODEL
        ? "notice"
        : null;
    case "result":
      return isPlainObject(t.runner_exit) && "phase" in t.runner_exit ? "failed" : null;
    default:
      return null;
  }
}
//@ chunk-tp07j3pd.js:1914-2182 placement
function markCurrentStepFailed(e, t) {
  let o =
    e.steps.findLast((r) => r.status === "running") ?? e.steps.find((step) => step.status === "pending");
  if (o === void 0 || e.steps.some((step) => step.status === "failed")) return e;
  return {
    ...e,
    steps: e.steps.map((step) =>
      step === o ? { ...step, status: "failed", completedAt: t, detail: void 0 } : step,
    ),
  };
}
/**
 * 把云会话准备事件应用到进度状态（重新开始、标记失败等）。
 */
//@ chunk-tp07j3pd.js:2182-3588 placement
function applySetupEvent(e, t, n, o, r) {
  let d = t.data?.extra,
    { stepId: stepId, stepStatus: stepStatus } = readSetupStepFields(t),
    s =
      (e.terminal ||
        (stepId === "provision" &&
          stepStatus !== "failed" &&
          e.steps.some((step) => step.status === "failed"))) &&
      stepId !== null &&
      stepStatus !== null
        ? { ...createSetupProgress(o, { wake: !0 }), dismissed: e.hadLiveCycle, hadLiveCycle: e.hadLiveCycle }
        : e;
  if (stepId !== null && stepStatus !== null && !s.sawLiveFrame && isLiveFrameTimestamp(t, o, r))
    s = { ...s, sawLiveFrame: !0 };
  if (typeof d?.session_mode === "string") {
    let session_mode = d.session_mode;
    if (
      (session_mode === "new" ||
        session_mode === "resume" ||
        session_mode === "resume-cached" ||
        session_mode === "setup-only") &&
      s.sessionMode !== session_mode
    )
      s = { ...s, sessionMode: session_mode };
  }
  let l = d?.setup_source;
  if (
    (l === "checkpoint" || l === "building_checkpoint" || l === "checkpoint_restore_failed") &&
    s.setupSource !== l
  )
    s = { ...s, setupSource: l };
  let p = parseSafeInteger(d?.setup_script_duration_ms);
  if (
    p !== void 0 &&
    p >= k &&
    p <= B &&
    s.setupScriptDurationMs !== p &&
    !s.steps.some((step) => step.id === "setup_script" && step.status === "completed")
  )
    s = { ...s, setupScriptDurationMs: p };
  if (typeof d?.expected_steps === "string") {
    let sliced = uniq(
      d.expected_steps
        .split(",")
        .map((u) => y(u))
        .filter((u) => u !== ""),
    ).slice(0, _);
    if (sliced.length > 0) {
      let u = new Map(s.steps.map((step) => [step.id, step])),
        mapped = sliced.map((m) => u.get(m) ?? { id: m, status: "pending" }),
        filtered = s.steps.filter((step) => !sliced.includes(step.id) && step.status !== "pending");
      s = { ...s, steps: [...filtered, ...mapped] };
    }
  }
  if (stepId !== null && stepStatus !== null)
    s = updateSetupStep(s, { stepId: stepId, stepStatus: stepStatus, extra: d, line: n, now: o });
  else if (n !== "") {
    let index = s.steps.findIndex((step) => step.status === "running");
    if (index !== -1 && s.steps[index].detail !== n) {
      let sliced = s.steps.slice();
      ((sliced[index] = { ...sliced[index], detail: n }), (s = { ...s, steps: sliced }));
    }
  }
  return s;
}
/**
 * 更新单个准备步骤的状态与标签。
 */
//@ chunk-tp07j3pd.js:3588-4922 placement
function updateSetupStep(e, { stepId: stepId, stepStatus: stepStatus, extra: extra, line: line, now: now }) {
  let c = y(stepId),
    steps = e.steps,
    index = steps.findIndex((u) => u.id === c);
  if (index === -1) {
    if (steps.length >= _) return e;
    let u = M(extra?.step_label) || line;
    ((steps = [...steps, { id: c, label: u, status: "pending" }]), (index = steps.length - 1));
  }
  let s = steps[index],
    l = typeof extra?.progress_label === "string" && line !== "" ? line : M(extra?.step_detail),
    p = null;
  switch (stepStatus) {
    case "started":
      if (s.status === "pending")
        p = { ...s, status: "running", startedAt: now, detail: l, output: S(extra?.output) };
      else {
        let u = l ?? s.detail,
          g = (s.status === "running" ? S(extra?.output) : void 0) ?? s.output;
        if (u !== s.detail || !arraysEqual(g, s.output)) p = { ...s, detail: u, output: g };
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
          detail: void 0,
          output: void 0,
        };
      break;
    case "failed": {
      let u = {
        ...s,
        status: "failed",
        completedAt: s.status === "failed" ? s.completedAt : now,
        error: line || void 0,
        output: S(extra?.output) ?? s.output,
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
      if (s.status === "pending" || s.status === "running") p = { ...s, status: "skipped", detail: void 0 };
      break;
    default:
      break;
  }
  if (p !== null) ((steps = steps === e.steps ? e.steps.slice() : steps), (steps[index] = p));
  if (steps === e.steps) return e;
  let i = { ...e, steps: steps, hasStructuredSteps: !0 };
  if (c === "start_cc" && stepStatus === "completed") i = completeSetupProgress(i, now);
  return i;
}
//@ chunk-tp07j3pd.js:4922-5211 placement
function completeSetupProgress(e, t) {
  if (e.terminal) return e;
  let n = completedSetupMode(e),
    mapped = e.steps.map((step) =>
      step.status === "pending"
        ? { ...step, status: "skipped" }
        : step.status === "running"
          ? { ...step, status: "completed", completedAt: t, completedMode: n }
          : step,
    );
  return {
    ...e,
    steps: mapped,
    terminal: !0,
    completedAt: t,
    hadLiveCycle: e.hadLiveCycle || e.sawLiveFrame,
  };
}
/**
 * 由会话模式与准备来源推断完成方式（resume/restored/new）。
 */
//@ chunk-tp07j3pd.js:5211-5518 placement
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
/**
 * 生成准备步骤的显示文字（创建/恢复容器、克隆、安装脚本、启动 CC）。
 */
//@ chunk-tp07j3pd.js:5518-6181 placement
function setupStepLabel(e, t) {
  let n = e.status === "completed",
    o = (n ? e.completedMode : void 0) ?? t;
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
function setupHeadline(e, t = !1) {
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
/**
 * 步骤附注（恢复时节省的时间、进行中的进度）。
 */
//@ chunk-tp07j3pd.js:6448-6883 placement
function setupStepAnnotation(e, t, n) {
  if (t.status === "completed")
    return (t.completedMode ?? n) === "restored" && e.setupScriptDurationMs !== void 0
      ? ` \xB7 saved about ${formatDurationCoarse(e.setupScriptDurationMs)}`
      : "";
  if (t.status !== "pending" && t.status !== "running") return "";
  switch (e.setupSource) {
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
  let t = e.terminal ? null : e.sessionMode,
    n = completedSetupMode({
      sessionMode: t ?? (e.hadLiveCycle ? "resume" : null),
      setupSource: e.setupSource,
      wake: e.wake,
    }),
    last = e.steps.findLast((r) => r.status === "running");
  return (last && setupStepLabel(last, n)) || setupHeadline(n);
}
//@ chunk-tp07j3pd.js:7101-7370 placement
function setupReadySummary(e) {
  let t = completedSetupMode(e),
    n = (e.completedAt ?? e.startedAt) - e.startedAt,
    o = formatSetupDuration(n);
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
function stepDurationSuffix(e, t) {
  if (e.startedAt === void 0) return "";
  if (e.status === "completed")
    return e.completedAt === void 0 ? "" : ` (${formatSetupDuration(e.completedAt - e.startedAt)})`;
  let max = Math.max(0, t - e.startedAt);
  return e.status === "running" && max >= 5000 ? ` (${Math.round(max / 1000)}s)` : "";
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
  rCs,
  setupStepLabel,
  completedSetupMode,
  setupHeadline,
  setupStepAnnotation,
  stepDurationSuffix,
};
