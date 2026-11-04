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
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { showScreen } from "../utils/runSteps.js";
import { AppRoot } from "./AppRoot.js";
import {
  teleportResumeCodeSession,
  checkOutTeleportedSessionBranch,
  processMessagesForTeleportResume,
} from "../utils/teleport.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tcnhgpc6.js:268-436 placement
/**
 * 云会话创建清单的初始进度状态：检查步骤进行中、创建步骤待定。
 */
function initialUploadProgress(startedAt) {
  return {
    steps: [
      {
        id: "check",
        status: "running",
        startedAt,
      },
      {
        id: "create",
        status: "pending",
      },
    ],
    rerouted: false,
    folder: false,
    bundle: null,
    fallback: null,
    requestSent: false,
  };
}
//@ chunk-tcnhgpc6.js:436-1570 placement
/**
 * 上传工作树到云会话时的进度状态转换（检查、打包、上传、创建会话）。
 */
function reduceUploadProgress(state, event, startedAt) {
  switch (event.kind) {
    case "checking":
      return event.folder === true && !state.folder
        ? {
            ...state,
            folder: true,
          }
        : state;
    case "bundling": {
      if (
        state.fallback !== null ||
        state.steps.some((step) => step.id === "bundle") ||
        !state.steps.some((step) => step.id === "create" && step.status === "pending")
      )
        return state;
      let checkedState = completeRunningStep(state, "check", "completed", startedAt);
      return {
        ...checkedState,
        steps: checkedState.steps.flatMap((step) =>
          step.id === "create"
            ? [
                {
                  id: "bundle",
                  status: "running",
                  startedAt,
                },
                ...(event.uploadedBySync === true
                  ? []
                  : [
                      {
                        id: "upload",
                        status: "pending",
                      },
                    ]),
                step,
              ]
            : [step],
        ),
        rerouted: event.rerouted,
        folder: event.folder === true,
      };
    }
    case "bundled": {
      let bundledState = completeRunningStep(state, "bundle", "completed", startedAt);
      return bundledState === state
        ? state
        : {
            ...startPendingStep(bundledState, "upload", startedAt),
            bundle: {
              sizeBytes: event.sizeBytes,
              scope: event.scope,
            },
          };
    }
    case "bundle_failed": {
      let found = state.steps.find(
        (step) => step.status === "running" && (step.id === "bundle" || step.id === "upload"),
      );
      if (found === undefined && state.fallback !== null) return state;
      let failedState =
        found === undefined ? state : completeRunningStep(state, found.id, "failed", startedAt);
      return {
        ...failedState,
        steps: failedState.steps.filter((step) => !(step.id === "upload" && step.status === "pending")),
        fallback: event.fallback,
      };
    }
    case "creating":
      return startPendingStep(
        completeRunningStep(
          completeRunningStep(state, "check", "completed", startedAt),
          "upload",
          "completed",
          startedAt,
        ),
        "create",
        startedAt,
      );
    case "request_sent":
      return state.requestSent
        ? state
        : {
            ...state,
            requestSent: true,
          };
    case "session_exists":
      return state;
    case "created":
      return completeRunningStep(state, "create", "completed", startedAt);
  }
}
//@ chunk-tcnhgpc6.js:1570-1743 placement
function completeRunningStep(state, stepId, status, completedAt) {
  return state.steps.some((step) => step.id === stepId && step.status === "running")
    ? {
        ...state,
        steps: state.steps.map((step) =>
          step.id === stepId && step.status === "running"
            ? {
                ...step,
                status,
                completedAt,
              }
            : step,
        ),
      }
    : state;
}
//@ chunk-tcnhgpc6.js:1743-1920 placement
function startPendingStep(state, stepId, startedAt) {
  return state.steps.some((step) => step.id === stepId && step.status === "pending")
    ? {
        ...state,
        steps: state.steps.map((step) =>
          step.id === stepId && step.status === "pending"
            ? {
                ...step,
                status: "running",
                startedAt,
              }
            : step,
        ),
      }
    : state;
}
//@ chunk-tcnhgpc6.js:1920-2167 placement
/**
 * 根据最后一个已开始的步骤得出云会话创建的阶段：检查、打包、上传、创建中或已创建。
 */
function uploadProgressPhase(state) {
  let last = state.steps.findLast((step) => step.status !== "pending");
  switch (last?.id) {
    case undefined:
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
/**
 * 函数 teleportProgressRow（进度行（标签/标注/详情））；位于「teleport 进度（"Teleporting session…"，校验、检出分支）」模块。
 */
function teleportProgressRow(step, detail, now) {
  return {
    label: formatCheckStep(step, detail),
    annotation: `${formatBundleStep(step, detail)}${stepDurationSuffix(step, now)}`,
    detail: noopDetail(step, detail),
  };
}
//@ chunk-tcnhgpc6.js:2384-2407 placement
function noopDetail(step, detail) {
  return;
}
//@ chunk-tcnhgpc6.js:2407-3039 placement
function formatCheckStep(step, { rerouted, folder }) {
  let isDone = step.status === "completed";
  switch (step.id) {
    case "check":
      if (folder) return isDone ? "Checked this folder" : "Checking this folder";
      return isDone ? "Checked this checkout" : "Checking this checkout";
    case "bundle":
      if (folder) return isDone ? "Packaged this folder" : "Packaging this folder";
      if (rerouted) return isDone ? "Packaged local changes" : "Packaging local changes";
      return isDone ? "Packaged this repository" : "Packaging this repository";
    case "upload":
      if (rerouted) return isDone ? "Uploaded your working tree" : "Uploading your working tree";
      return isDone ? "Uploaded this repository" : "Uploading this repository";
    case "create":
      return isDone ? "Created cloud session" : "Creating cloud session";
  }
}
//@ chunk-tcnhgpc6.js:3039-3363 placement
function formatBundleStep(step, { bundle, folder }) {
  if (bundle === null || (step.status !== "running" && step.status !== "completed")) return "";
  let sizeLabel = formatFileSize(bundle.sizeBytes);
  switch (step.id) {
    case "bundle":
      return step.status === "completed"
        ? folder
          ? ` \xB7 ${sizeLabel}`
          : ` \xB7 ${sizeLabel}, ${BUNDLE_MODE_LABELS[bundle.scope]}`
        : "";
    case "upload":
      return step.status === "completed" ? ` \xB7 ${sizeLabel}` : ` ${sizeLabel}`;
    case "check":
    case "create":
      return "";
  }
}
//@ chunk-tcnhgpc6.js:3363-3469 placement
/**
 * 云会话创建清单的标题（完成后改为过去时）。
 */
function cloudCreateTitle(state) {
  let headline = setupHeadline("new");
  return uploadProgressPhase(state) === "created"
    ? headline.replace(/^Setting up/, "Set up")
    : `${headline}\u2026`;
}
//@ chunk-tcnhgpc6.js:3469-3657 placement
/**
 * 取消云会话创建时的提示：请求已发出时说明云会话可能仍已创建。
 */
function cloudCreateCancelMessage(state) {
  return state !== null && state.requestSent
    ? "Cancelled after the create request was sent, so a cloud session may still have been created"
    : "Cancelled before a cloud session was created";
}
//@ chunk-pfn09c5f.js:14252-14256 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pfn09c5f.js:14252", () => {
  init_react_production();
});
//@ chunk-pfn09c5f.js:14256-14503 fingerprint (2.1.88 match: STEPS, 1)
var TELEPORT_SPINNER_FRAMES = ["\u25D0", "\u25D3", "\u25D1", "\u25D2"];
var TELEPORT_STEPS = [
  {
    key: "validating",
    label: "Validating session",
  },
  {
    key: "fetching_logs",
    label: "Fetching session logs",
  },
  {
    key: "fetching_branch",
    label: "Getting branch info",
  },
  {
    key: "checking_out",
    label: "Checking out branch",
  },
];
//@ chunk-pfn09c5f.js:14503-15625 fingerprint (2.1.88 match: TeleportProgress, 0.916)
function TeleportProgress(props) {
  let $ = useMemoCache(16);
  let { currentStep, sessionId } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [ref, time] = useAnimationFrame(prefersReducedMotion || isScreenReaderEnabled ? null : 100);
  let frame = Math.floor(time / 100) % TELEPORT_SPINNER_FRAMES.length;
  let t1;
  if ($[0] !== currentStep) {
    t1 = (step) => step.key === currentStep;
    $[0] = currentStep;
    $[1] = t1;
  } else t1 = $[1];
  let currentStepIndex = TELEPORT_STEPS.findIndex(t1);
  const t2 = TELEPORT_SPINNER_FRAMES[frame];
  let t3;
  if ($[2] !== t2) {
    t3 = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        bold: true,
        color: "claude",
        children: [t2, " Teleporting session\u2026"],
      }),
    });
    $[2] = t2;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== sessionId) {
    t4 =
      sessionId &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: sessionId,
        }),
      });
    $[4] = sessionId;
    $[5] = t4;
  } else t4 = $[5];
  let children;
  if ($[6] !== currentStepIndex || $[7] !== frame) {
    children = TELEPORT_STEPS.map((step, index) => {
      let isComplete = index < currentStepIndex;
      let isCurrent = index === currentStepIndex;
      let isPending = index > currentStepIndex;
      let icon;
      let color;
      if (isComplete) {
        icon = figures_default.tick;
        color = "green";
      } else if (isCurrent) {
        icon = TELEPORT_SPINNER_FRAMES[frame];
        color = "claude";
      } else {
        icon = figures_default.circle;
        color = undefined;
      }
      return jsxProd_default_2(
        Box,
        {
          flexDirection: "row",
          children: [
            jsxProd_default(Box, {
              width: 2,
              children: jsxProd_default(Text, {
                color,
                dimColor: isPending,
                children: icon,
              }),
            }),
            jsxProd_default(Text, {
              dimColor: isPending,
              bold: isCurrent,
              children: step.label,
            }),
          ],
        },
        step.key,
      );
    });
    $[6] = currentStepIndex;
    $[7] = frame;
    $[8] = children;
  } else children = $[8];
  let t6;
  if ($[9] !== children) {
    t6 = jsxProd_default(Box, {
      flexDirection: "column",
      marginLeft: 2,
      children,
    });
    $[9] = children;
    $[10] = t6;
  } else t6 = $[10];
  let t7;
  if ($[11] !== ref || $[12] !== t3 || $[13] !== t4 || $[14] !== t6) {
    t7 = jsxProd_default_2(Box, {
      ref,
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1,
      children: [t3, t4, t6],
    });
    $[11] = ref;
    $[12] = t3;
    $[13] = t4;
    $[14] = t6;
    $[15] = t7;
  } else t7 = $[15];
  return t7;
}
//@ chunk-pfn09c5f.js:15625-15941 fingerprint (2.1.88 match: teleportWithProgress, 0.866)
async function teleportWithProgress(root, sessionId) {
  let setStep = () => {};
  function TeleportProgressWrapper() {
    let [step, _setStep] = useState("validating");
    setStep = _setStep;
    return jsxProd_default(TeleportProgress, {
      currentStep: step,
      sessionId,
    });
  }
  showScreen(
    root,
    jsxProd_default(AppRoot, {
      keybindings: false,
      children: jsxProd_default(TeleportProgressWrapper, {}),
    }),
  );
  let result = await teleportResumeCodeSession(sessionId, setStep);
  setStep("checking_out");
  let { branchName, branchError } = await checkOutTeleportedSessionBranch(result.branch);
  return {
    messages: processMessagesForTeleportResume(result.log, branchError, result.environmentKind),
    branchName,
  };
}
export {
  cloudCreateCancelMessage,
  uploadProgressPhase,
  reduceUploadProgress,
  initialUploadProgress,
  cloudCreateTitle,
  teleportProgressRow,
  teleportWithProgress,
};
