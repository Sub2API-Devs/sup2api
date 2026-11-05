/**
 * components/RemoteBootstrapProgress.tsx
 *
 * 2.1.316 新增。远程会话启动进度显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4b7tnq3g.js (8)
 * attribution: placement 8
 */
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useInterval } from "../ink/components/Input.js";
import {
  completedSetupMode,
  setupHeadline,
  setupStepLabel,
  setupStepAnnotation,
  stepDurationSuffix,
} from "../services/cloudSessions/setupProgress.js";
import { Box, Text } from "../ink/components/Text.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { plural } from "../utils/stringUtils.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { truncateToWidth } from "../utils/format.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { Spinner } from "./Spinner.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4b7tnq3g.js:1903-1907 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4b7tnq3g.js:1903", () => {
  init_react_production();
});
//@ chunk-4b7tnq3g.js:1907-1947 placement
function selectRemoteBootstrap(state) {
  return state.remoteBootstrap;
}
//@ chunk-4b7tnq3g.js:1947-1979 placement
function nowMs() {
  return Date.now();
}
//@ chunk-4b7tnq3g.js:1979-2021 placement
function isFailedStatus(state) {
  return state.status === "failed";
}
//@ chunk-4b7tnq3g.js:2021-3163 placement
function RemoteBootstrapProgress() {
  let $ = useMemoCache(22);
  let appState = useAppState(selectRemoteBootstrap);
  let { columns } = useTerminalSize();
  let [props, now] = useState(nowMs);
  let setNow;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    setNow = () => now(Date.now());
    $[0] = setNow;
  } else setNow = $[0];
  useInterval(setNow, 1000);
  if (appState === null) {
    return null;
  }
  let queuedCount = appState.queuedCount;
  let tickInterval;
  let setTickInterval;
  let flexDirection;
  let marginTop;
  let textElement;
  let stepRows;
  if ($[1] !== columns || $[2] !== props || $[3] !== appState) {
    setTickInterval = appState.steps.some(isFailedStatus);
    let setupMode = completedSetupMode(appState);
    tickInterval = Box;
    flexDirection = "column";
    marginTop = 1;
    textElement = jsxProd_default_2(Text, {
      bold: true,
      children: [
        setupHeadline(setupMode, setTickInterval),
        setTickInterval || setupMode === "restored" ? "" : "\u2026",
      ],
    });
    stepRows = appState.steps.map((step) =>
      step.status === "skipped"
        ? null
        : jsxProd_default(
            BootstrapStepRow,
            {
              step,
              label: setupStepLabel(step, setupMode),
              hint: step.id === "setup_script" ? setupStepAnnotation(appState, step, setupMode) : "",
              now: props,
              columns,
            },
            step.id,
          ),
    );
    $[1] = columns;
    $[2] = props;
    $[3] = appState;
    $[4] = tickInterval;
    $[5] = setTickInterval;
    $[6] = flexDirection;
    $[7] = marginTop;
    $[8] = textElement;
    $[9] = stepRows;
  } else {
    tickInterval = $[4];
    setTickInterval = $[5];
    flexDirection = $[6];
    marginTop = $[7];
    textElement = $[8];
    stepRows = $[9];
  }
  let children;
  if ($[10] !== setTickInterval || $[11] !== queuedCount) {
    children = setTickInterval
      ? "Send a message to try again."
      : queuedCount > 0
        ? `${queuedCount} ${plural(queuedCount, "message")} queued \xB7 sends once the session is ready`
        : "You can start typing \u2014 messages send once the session is ready";
    $[10] = setTickInterval;
    $[11] = queuedCount;
    $[12] = children;
  } else children = $[12];
  let boxElement;
  if ($[13] !== children) {
    boxElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children,
      }),
    });
    $[13] = children;
    $[14] = boxElement;
  } else boxElement = $[14];
  let tickIntervalElement;
  if (
    $[15] !== tickInterval ||
    $[16] !== flexDirection ||
    $[17] !== marginTop ||
    $[18] !== textElement ||
    $[19] !== stepRows ||
    $[20] !== boxElement
  ) {
    tickIntervalElement = jsxProd_default_2(tickInterval, {
      flexDirection,
      marginTop,
      children: [textElement, stepRows, boxElement],
    });
    $[15] = tickInterval;
    $[16] = flexDirection;
    $[17] = marginTop;
    $[18] = textElement;
    $[19] = stepRows;
    $[20] = boxElement;
    $[21] = tickIntervalElement;
  } else tickIntervalElement = $[21];
  return tickIntervalElement;
}
//@ chunk-4b7tnq3g.js:3163-4261 placement
function BootstrapStepRow(props) {
  let $ = useMemoCache(18);
  let { step, label, hint, now, columns } = props;
  let outputLines = useIsFullscreen() ? step.output : step.output?.slice(-1);
  switch (step.status) {
    case "completed": {
      const annotation = stepDurationSuffix(step, now) + hint;
      let completedRow;
      if ($[0] !== label || $[1] !== annotation) {
        completedRow = jsxProd_default(BootstrapStatusLine, {
          status: "completed",
          label,
          annotation,
        });
        $[0] = label;
        $[1] = annotation;
        $[2] = completedRow;
      } else completedRow = $[2];
      return completedRow;
    }
    case "running": {
      const annotation = stepDurationSuffix(step, now) + hint;
      const detail = outputLines === undefined ? step.detail : undefined;
      let hintSuffix;
      if (
        $[3] !== columns ||
        $[4] !== label ||
        $[5] !== outputLines ||
        $[6] !== annotation ||
        $[7] !== detail
      ) {
        hintSuffix = jsxProd_default(BootstrapStatusLine, {
          status: "running",
          label,
          annotation,
          detail,
          output: outputLines,
          columns,
        });
        $[3] = columns;
        $[4] = label;
        $[5] = outputLines;
        $[6] = annotation;
        $[7] = detail;
        $[8] = hintSuffix;
      } else hintSuffix = $[8];
      return hintSuffix;
    }
    case "failed": {
      const annotation = step.exitCode === undefined ? "" : ` \xB7 exit code ${step.exitCode}`;
      const detail =
        step.error === label || ((step.exitCode ?? 0) > 0 && (step.output?.length ?? 0) > 0)
          ? undefined
          : step.error;
      let statusRow;
      if (
        $[9] !== columns ||
        $[10] !== label ||
        $[11] !== step.output ||
        $[12] !== annotation ||
        $[13] !== detail
      ) {
        statusRow = jsxProd_default(BootstrapStatusLine, {
          status: "failed",
          label,
          annotation,
          detail,
          output: step.output,
          columns,
        });
        $[9] = columns;
        $[10] = label;
        $[11] = step.output;
        $[12] = annotation;
        $[13] = detail;
        $[14] = statusRow;
      } else statusRow = $[14];
      return statusRow;
    }
    case "pending": {
      let pendingRow;
      if ($[15] !== hint || $[16] !== label) {
        pendingRow = jsxProd_default(BootstrapStatusLine, {
          status: "pending",
          label,
          annotation: hint,
        });
        $[15] = hint;
        $[16] = label;
        $[17] = pendingRow;
      } else pendingRow = $[17];
      return pendingRow;
    }
    case "skipped": {
      return null;
    }
  }
}
//@ chunk-4b7tnq3g.js:4261-6360 placement
function BootstrapStatusLine(props) {
  let $ = useMemoCache(42);
  let { status, label, annotation, detail, output, columns, detailOverflow } = props;
  let annotationText = annotation === undefined ? "" : annotation;
  let lineColumns = columns === undefined ? 80 : columns;
  let overflowMode = detailOverflow === undefined ? "truncate" : detailOverflow;
  let max = Math.max(20, lineColumns - 8);
  let detailText;
  if ($[0] !== detail || $[1] !== overflowMode || $[2] !== max) {
    detailText = detail === undefined || overflowMode === "wrap" ? detail : truncateToWidth(detail, max);
    $[0] = detail;
    $[1] = overflowMode;
    $[2] = max;
    $[3] = detailText;
  } else detailText = $[3];
  let detailText_2 = detailText;
  switch (status) {
    case "completed": {
      let tickIcon;
      if ($[4] === MEMO_CACHE_SENTINEL) {
        tickIcon = jsxProd_default(Text, {
          color: "success",
          children: `  ${figures_default.tick} `,
        });
        $[4] = tickIcon;
      } else tickIcon = $[4];
      let annotationNode;
      if ($[5] !== annotationText) {
        annotationNode = jsxProd_default(Text, {
          dimColor: true,
          children: annotationText,
        });
        $[5] = annotationText;
        $[6] = annotationNode;
      } else annotationNode = $[6];
      let completedRow;
      if ($[7] !== label || $[8] !== annotationNode) {
        completedRow = jsxProd_default_2(Box, {
          children: [
            tickIcon,
            jsxProd_default_2(Text, {
              children: [label, annotationNode],
            }),
          ],
        });
        $[7] = label;
        $[8] = annotationNode;
        $[9] = completedRow;
      } else completedRow = $[9];
      return completedRow;
    }
    case "running": {
      let spinnerBox;
      if ($[10] === MEMO_CACHE_SENTINEL) {
        spinnerBox = jsxProd_default(Box, {
          width: 4,
          paddingLeft: 2,
          children: jsxProd_default(Spinner, {}),
        });
        $[10] = spinnerBox;
      } else spinnerBox = $[10];
      let annotationNode;
      if ($[11] !== annotationText) {
        annotationNode = jsxProd_default(Text, {
          dimColor: true,
          children: annotationText,
        });
        $[11] = annotationText;
        $[12] = annotationNode;
      } else annotationNode = $[12];
      let runningRow;
      if ($[13] !== label || $[14] !== annotationNode) {
        runningRow = jsxProd_default_2(Box, {
          children: [
            spinnerBox,
            jsxProd_default_2(Text, {
              children: [label, "\u2026", annotationNode],
            }),
          ],
        });
        $[13] = label;
        $[14] = annotationNode;
        $[15] = runningRow;
      } else runningRow = $[15];
      let detailBox;
      if ($[16] !== detailText_2) {
        detailBox =
          detailText_2 !== undefined &&
          detailText_2 !== "" &&
          jsxProd_default(Box, {
            paddingLeft: 6,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: detailText_2,
            }),
          });
        $[16] = detailText_2;
        $[17] = detailBox;
      } else detailBox = $[17];
      let outputLines;
      if ($[18] !== max || $[19] !== output) {
        outputLines = jsxProd_default(OutputLines, {
          output,
          width: max,
        });
        $[18] = max;
        $[19] = output;
        $[20] = outputLines;
      } else outputLines = $[20];
      let runningBlock;
      if ($[21] !== runningRow || $[22] !== detailBox || $[23] !== outputLines) {
        runningBlock = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [runningRow, detailBox, outputLines],
        });
        $[21] = runningRow;
        $[22] = detailBox;
        $[23] = outputLines;
        $[24] = runningBlock;
      } else runningBlock = $[24];
      return runningBlock;
    }
    case "failed": {
      let crossIcon;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        crossIcon = jsxProd_default(Text, {
          color: "error",
          children: `  ${figures_default.cross} `,
        });
        $[25] = crossIcon;
      } else crossIcon = $[25];
      let annotationNode;
      if ($[26] !== annotationText) {
        annotationNode = jsxProd_default(Text, {
          dimColor: true,
          children: annotationText,
        });
        $[26] = annotationText;
        $[27] = annotationNode;
      } else annotationNode = $[27];
      let failedRow;
      if ($[28] !== label || $[29] !== annotationNode) {
        failedRow = jsxProd_default_2(Box, {
          children: [
            crossIcon,
            jsxProd_default_2(Text, {
              children: [label, annotationNode],
            }),
          ],
        });
        $[28] = label;
        $[29] = annotationNode;
        $[30] = failedRow;
      } else failedRow = $[30];
      let detailBox;
      if ($[31] !== detailText_2) {
        detailBox =
          detailText_2 !== undefined &&
          detailText_2 !== "" &&
          jsxProd_default(Box, {
            paddingLeft: 6,
            children: jsxProd_default(Text, {
              color: "error",
              children: detailText_2,
            }),
          });
        $[31] = detailText_2;
        $[32] = detailBox;
      } else detailBox = $[32];
      let outputLines;
      if ($[33] !== max || $[34] !== output) {
        outputLines = jsxProd_default(OutputLines, {
          output,
          width: max,
        });
        $[33] = max;
        $[34] = output;
        $[35] = outputLines;
      } else outputLines = $[35];
      let failedBlock;
      if ($[36] !== failedRow || $[37] !== detailBox || $[38] !== outputLines) {
        failedBlock = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [failedRow, detailBox, outputLines],
        });
        $[36] = failedRow;
        $[37] = detailBox;
        $[38] = outputLines;
        $[39] = failedBlock;
      } else failedBlock = $[39];
      return failedBlock;
    }
    case "pending": {
      const children = `  ${figures_default.circle} ${label}${annotationText}`;
      let pendingRow;
      if ($[40] !== children) {
        pendingRow = jsxProd_default(Box, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        });
        $[40] = children;
        $[41] = pendingRow;
      } else pendingRow = $[41];
      return pendingRow;
    }
  }
}
//@ chunk-4b7tnq3g.js:6360-6721 placement (2.1.88 match: _temp, 0.699)
/**
 * 按宽度截断显示的多行输出（暗色、缩进 6），无输出时不渲染；实际只被 RemoteBootstrapProgress 使用。
 */
function OutputLines(props) {
  let $ = useMemoCache(7);
  let { output, width } = props;
  if (output === undefined || output.length === 0) {
    return null;
  }
  let children;
  if ($[0] !== output || $[1] !== width) {
    let renderLine;
    if ($[3] !== width) {
      renderLine = (line, index) =>
        jsxProd_default(
          Text,
          {
            dimColor: true,
            children: truncateToWidth(line, width),
          },
          index,
        );
      $[3] = width;
      $[4] = renderLine;
    } else renderLine = $[4];
    children = output.map(renderLine);
    $[0] = output;
    $[1] = width;
    $[2] = children;
  } else children = $[2];
  let boxElement;
  if ($[5] !== children) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      paddingLeft: 6,
      children,
    });
    $[5] = children;
    $[6] = boxElement;
  } else boxElement = $[6];
  return boxElement;
}
export { RemoteBootstrapProgress, BootstrapStatusLine };
