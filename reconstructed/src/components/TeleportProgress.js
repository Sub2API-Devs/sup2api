/**
 * components/TeleportProgress.tsx
 *
 * teleport 进度（"Teleporting session…"，校验、检出分支）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportProgress.tsx
 * pieces: chunk-pfn09c5f.js (4), chunk-tcnhgpc6.js (12)
 * attribution: placement 13, fingerprint 3
 */
import { stepDurationSuffix, setupHeadline } from "../services/cloudSessions/setupProgress.js";
import { formatFileSize } from "../utils/format.js";
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { showScreen } from "../utils/runSteps.js";
import { AppRoot } from "./AppRoot.js";
import {
  teleportResumeCodeSession,
  checkOutTeleportedSessionBranch,
  processMessagesForTeleportResume,
} from "../utils/teleport.js";

/**
 * 云会话创建清单的初始进度状态：检查步骤进行中、创建步骤待定。
 */
//@ chunk-tcnhgpc6.js:268-436 placement
function initialUploadProgress(e) {
  return {
    steps: [
      { id: "check", status: "running", startedAt: e },
      { id: "create", status: "pending" },
    ],
    rerouted: !1,
    folder: !1,
    bundle: null,
    fallback: null,
    requestSent: !1,
  };
}
/**
 * 上传工作树到云会话时的进度状态转换（检查、打包、上传、创建会话）。
 */
//@ chunk-tcnhgpc6.js:436-1570 placement
function reduceUploadProgress(e, a, r) {
  switch (a.kind) {
    case "checking":
      return a.folder === !0 && !e.folder ? { ...e, folder: !0 } : e;
    case "bundling": {
      if (
        e.fallback !== null ||
        e.steps.some((step) => step.id === "bundle") ||
        !e.steps.some((step) => step.id === "create" && step.status === "pending")
      )
        return e;
      let t = completeRunningStep(e, "check", "completed", r);
      return {
        ...t,
        steps: t.steps.flatMap((step) =>
          step.id === "create"
            ? [
                { id: "bundle", status: "running", startedAt: r },
                ...(a.uploadedBySync === !0 ? [] : [{ id: "upload", status: "pending" }]),
                step,
              ]
            : [step],
        ),
        rerouted: a.rerouted,
        folder: a.folder === !0,
      };
    }
    case "bundled": {
      let t = completeRunningStep(e, "bundle", "completed", r);
      return t === e
        ? e
        : { ...startPendingStep(t, "upload", r), bundle: { sizeBytes: a.sizeBytes, scope: a.scope } };
    }
    case "bundle_failed": {
      let found = e.steps.find(
        (step) => step.status === "running" && (step.id === "bundle" || step.id === "upload"),
      );
      if (found === void 0 && e.fallback !== null) return e;
      let n = found === void 0 ? e : completeRunningStep(e, found.id, "failed", r);
      return {
        ...n,
        steps: n.steps.filter((step) => !(step.id === "upload" && step.status === "pending")),
        fallback: a.fallback,
      };
    }
    case "creating":
      return startPendingStep(
        completeRunningStep(completeRunningStep(e, "check", "completed", r), "upload", "completed", r),
        "create",
        r,
      );
    case "request_sent":
      return e.requestSent ? e : { ...e, requestSent: !0 };
    case "session_exists":
      return e;
    case "created":
      return completeRunningStep(e, "create", "completed", r);
  }
}
//@ chunk-tcnhgpc6.js:1570-1743 placement
function completeRunningStep(e, a, r, t) {
  return e.steps.some((step) => step.id === a && step.status === "running")
    ? {
        ...e,
        steps: e.steps.map((step) =>
          step.id === a && step.status === "running" ? { ...step, status: r, completedAt: t } : step,
        ),
      }
    : e;
}
//@ chunk-tcnhgpc6.js:1743-1920 placement
function startPendingStep(e, a, r) {
  return e.steps.some((step) => step.id === a && step.status === "pending")
    ? {
        ...e,
        steps: e.steps.map((step) =>
          step.id === a && step.status === "pending" ? { ...step, status: "running", startedAt: r } : step,
        ),
      }
    : e;
}
/**
 * 根据最后一个已开始的步骤得出云会话创建的阶段：检查、打包、上传、创建中或已创建。
 */
//@ chunk-tcnhgpc6.js:1920-2167 placement
function uploadProgressPhase(e) {
  let last = e.steps.findLast((r) => r.status !== "pending");
  switch (last?.id) {
    case void 0:
    case "check":
      return "checking";
    case "bundle":
      return "bundling";
    case "upload":
      return "uploading";
    case "create":
      return last.status === "completed" ? "created" : "creating";
  }
}
//@ chunk-tcnhgpc6.js:2167-2295 placement
var BUNDLE_MODE_LABELS = {
  all: "with history",
  current_branch: "current branch only",
  head: "current history only",
  squashed: "snapshot without history",
};
//@ chunk-tcnhgpc6.js:2295-2384 placement
function Vfo(e, a, r) {
  return {
    label: formatCheckStep(e, a),
    annotation: `${formatBundleStep(e, a)}${stepDurationSuffix(e, r)}`,
    detail: i(e, a),
  };
}
//@ chunk-tcnhgpc6.js:2384-2407 placement
function i(e, a) {
  return;
}
//@ chunk-tcnhgpc6.js:2407-3039 placement
function formatCheckStep(e, { rerouted: rerouted, folder: folder }) {
  let t = e.status === "completed";
  switch (e.id) {
    case "check":
      if (folder) return t ? "Checked this folder" : "Checking this folder";
      return t ? "Checked this checkout" : "Checking this checkout";
    case "bundle":
      if (folder) return t ? "Packaged this folder" : "Packaging this folder";
      if (rerouted) return t ? "Packaged local changes" : "Packaging local changes";
      return t ? "Packaged this repository" : "Packaging this repository";
    case "upload":
      if (rerouted) return t ? "Uploaded your working tree" : "Uploading your working tree";
      return t ? "Uploaded this repository" : "Uploading this repository";
    case "create":
      return t ? "Created cloud session" : "Creating cloud session";
  }
}
//@ chunk-tcnhgpc6.js:3039-3363 placement
function formatBundleStep(e, { bundle: bundle, folder: folder }) {
  if (bundle === null || (e.status !== "running" && e.status !== "completed")) return "";
  let t = formatFileSize(bundle.sizeBytes);
  switch (e.id) {
    case "bundle":
      return e.status === "completed"
        ? folder
          ? ` \xB7 ${t}`
          : ` \xB7 ${t}, ${BUNDLE_MODE_LABELS[bundle.scope]}`
        : "";
    case "upload":
      return e.status === "completed" ? ` \xB7 ${t}` : ` ${t}`;
    case "check":
    case "create":
      return "";
  }
}
/**
 * 云会话创建清单的标题（完成后改为过去时）。
 */
//@ chunk-tcnhgpc6.js:3363-3469 placement
function cloudCreateTitle(e) {
  let a = setupHeadline("new");
  return uploadProgressPhase(e) === "created" ? a.replace(/^Setting up/, "Set up") : `${a}\u2026`;
}
/**
 * 取消云会话创建时的提示：请求已发出时说明云会话可能仍已创建。
 */
//@ chunk-tcnhgpc6.js:3469-3657 placement
function cloudCreateCancelMessage(e) {
  return e !== null && e.requestSent
    ? "Cancelled after the create request was sent, so a cloud session may still have been created"
    : "Cancelled before a cloud session was created";
}
//@ chunk-pfn09c5f.js:14252-14256 placement
j();
//@ chunk-pfn09c5f.js:14256-14503 fingerprint = STEPS (1)
var TELEPORT_SPINNER_FRAMES = ["\u25D0", "\u25D3", "\u25D1", "\u25D2"],
  TELEPORT_STEPS = [
    { key: "validating", label: "Validating session" },
    { key: "fetching_logs", label: "Fetching session logs" },
    { key: "fetching_branch", label: "Getting branch info" },
    { key: "checking_out", label: "Checking out branch" },
  ];
//@ chunk-pfn09c5f.js:14503-15625 fingerprint = TeleportProgress (0.916)
function TeleportProgress(t0) {
  let $ = w(16),
    { currentStep: currentStep, sessionId: sessionId } = t0,
    P = usePrefersReducedMotion(),
    p = useIsScreenReaderEnabled(),
    [a, I] = useAnimationFrame(P || p ? null : 100),
    l = Math.floor(I / 100) % TELEPORT_SPINNER_FRAMES.length,
    L;
  if ($[0] !== currentStep) ((L = (U) => U.key === currentStep), ($[0] = currentStep), ($[1] = L));
  else L = $[1];
  let currentStepIndex = TELEPORT_STEPS.findIndex(L);
  const t2 = TELEPORT_SPINNER_FRAMES[l];
  let f;
  if ($[2] !== t2)
    ((f = e(Box, {
      marginBottom: 1,
      children: r(Text, { bold: !0, color: "claude", children: [t2, " Teleporting session\u2026"] }),
    })),
      ($[2] = t2),
      ($[3] = f));
  else f = $[3];
  let h;
  if ($[4] !== sessionId)
    ((h = sessionId && e(Box, { marginBottom: 1, children: e(Text, { dimColor: !0, children: sessionId }) })),
      ($[4] = sessionId),
      ($[5] = h));
  else h = $[5];
  let b;
  if ($[6] !== currentStepIndex || $[7] !== l)
    ((b = TELEPORT_STEPS.map((step, index) => {
      let Z = index < currentStepIndex;
      let V = index === currentStepIndex;
      let X = index > currentStepIndex;
      let k;
      let x;
      if (Z) ((k = re.tick), (x = "green"));
      else if (V) ((k = TELEPORT_SPINNER_FRAMES[l]), (x = "claude"));
      else ((k = re.circle), (x = void 0));
      return r(
        Box,
        {
          flexDirection: "row",
          children: [
            e(Box, { width: 2, children: e(Text, { color: x, dimColor: X, children: k }) }),
            e(Text, { dimColor: X, bold: V, children: step.label }),
          ],
        },
        step.key,
      );
    })),
      ($[6] = currentStepIndex),
      ($[7] = l),
      ($[8] = b));
  else b = $[8];
  let S;
  if ($[9] !== b)
    ((S = e(Box, { flexDirection: "column", marginLeft: 2, children: b })), ($[9] = b), ($[10] = S));
  else S = $[10];
  let Y;
  if ($[11] !== a || $[12] !== f || $[13] !== h || $[14] !== S)
    ((Y = r(Box, { ref: a, flexDirection: "column", paddingX: 1, paddingY: 1, children: [f, h, S] })),
      ($[11] = a),
      ($[12] = f),
      ($[13] = h),
      ($[14] = S),
      ($[15] = Y));
  else Y = $[15];
  return Y;
}
//@ chunk-pfn09c5f.js:15625-15941 fingerprint = teleportWithProgress (0.866)
async function teleportWithProgress(root, sessionId) {
  let setStep = () => {};
  function TeleportProgressWrapper() {
    let [l, o] = y("validating");
    return ((setStep = o), e(TeleportProgress, { currentStep: l, sessionId: sessionId }));
  }
  showScreen(root, e(AppRoot, { keybindings: !1, children: e(TeleportProgressWrapper, {}) }));
  let result = await teleportResumeCodeSession(sessionId, setStep);
  setStep("checking_out");
  let { branchName: branchName, branchError: branchError } = await checkOutTeleportedSessionBranch(
    result.branch,
  );
  return {
    messages: processMessagesForTeleportResume(result.log, branchError, result.environmentKind),
    branchName: branchName,
  };
}

export {
  cloudCreateCancelMessage,
  uploadProgressPhase,
  reduceUploadProgress,
  initialUploadProgress,
  cloudCreateTitle,
  Vfo,
};
