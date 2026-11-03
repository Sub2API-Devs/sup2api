/**
 * components/RemoteBootstrapProgress.tsx
 *
 * 2.1.316 新增。远程会话启动进度显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h93cnm7e.js (8)
 * attribution: placement 8
 */
import { init_react_production, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-h93cnm7e.js:1888-1892 placement
init_react_production();
//@ chunk-h93cnm7e.js:1892-1932 placement
function selectRemoteBootstrap(N) {
  return N.remoteBootstrap;
}
//@ chunk-h93cnm7e.js:1932-1964 placement
function nowMs() {
  return Date.now();
}
//@ chunk-h93cnm7e.js:1964-2006 placement
function isFailedStatus(v) {
  return v.status === "failed";
}
//@ chunk-h93cnm7e.js:2006-3148 placement
function RemoteBootstrapProgress() {
  let $ = w(22);
  let appState = useAppState(selectRemoteBootstrap);
  let { columns } = useTerminalSize();
  let [t, g] = y(nowMs);
  let i;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    i = () => g(Date.now());
    $[0] = i;
  } else i = $[0];
  useInterval(i, 1000);
  if (appState === null) {
    return null;
  }
  let queuedCount = appState.queuedCount;
  let a;
  let l;
  let flexDirection;
  let marginTop;
  let h;
  let d;
  if ($[1] !== columns || $[2] !== t || $[3] !== appState) {
    l = appState.steps.some(isFailedStatus);
    let A = completedSetupMode(appState);
    a = Box;
    flexDirection = "column";
    marginTop = 1;
    h = jsxProd_default_2(Text, {
      bold: true,
      children: [setupHeadline(A, l), l || A === "restored" ? "" : "\u2026"],
    });
    d = appState.steps.map((step) =>
      step.status === "skipped"
        ? null
        : jsxProd_default(
            BootstrapStepRow,
            {
              step,
              label: setupStepLabel(step, A),
              hint: step.id === "setup_script" ? setupStepAnnotation(appState, step, A) : "",
              now: t,
              columns,
            },
            step.id,
          ),
    );
    $[1] = columns;
    $[2] = t;
    $[3] = appState;
    $[4] = a;
    $[5] = l;
    $[6] = flexDirection;
    $[7] = marginTop;
    $[8] = h;
    $[9] = d;
  } else {
    a = $[4];
    l = $[5];
    flexDirection = $[6];
    marginTop = $[7];
    h = $[8];
    d = $[9];
  }
  let children;
  if ($[10] !== l || $[11] !== queuedCount) {
    children = l
      ? "Send a message to try again."
      : queuedCount > 0
        ? `${queuedCount} ${plural(queuedCount, "message")} queued \xB7 sends once the session is ready`
        : "You can start typing \u2014 messages send once the session is ready";
    $[10] = l;
    $[11] = queuedCount;
    $[12] = children;
  } else children = $[12];
  let u;
  if ($[13] !== children) {
    u = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children,
      }),
    });
    $[13] = children;
    $[14] = u;
  } else u = $[14];
  let x;
  if (
    $[15] !== a ||
    $[16] !== flexDirection ||
    $[17] !== marginTop ||
    $[18] !== h ||
    $[19] !== d ||
    $[20] !== u
  ) {
    x = jsxProd_default_2(a, {
      flexDirection,
      marginTop,
      children: [h, d, u],
    });
    $[15] = a;
    $[16] = flexDirection;
    $[17] = marginTop;
    $[18] = h;
    $[19] = d;
    $[20] = u;
    $[21] = x;
  } else x = $[21];
  return x;
}
//@ chunk-h93cnm7e.js:3148-4246 placement
function BootstrapStepRow(props) {
  let $ = w(18);
  let { step, label, hint, now, columns } = props;
  let f = useIsFullscreen() ? step.output : step.output?.slice(-1);
  switch (step.status) {
    case "completed": {
      const annotation = stepDurationSuffix(step, now) + hint;
      let m;
      if ($[0] !== label || $[1] !== annotation) {
        m = jsxProd_default(BootstrapStatusLine, {
          status: "completed",
          label,
          annotation,
        });
        $[0] = label;
        $[1] = annotation;
        $[2] = m;
      } else m = $[2];
      return m;
    }
    case "running": {
      const annotation = stepDurationSuffix(step, now) + hint;
      const detail = f === undefined ? step.detail : undefined;
      let T;
      if ($[3] !== columns || $[4] !== label || $[5] !== f || $[6] !== annotation || $[7] !== detail) {
        T = jsxProd_default(BootstrapStatusLine, {
          status: "running",
          label,
          annotation,
          detail,
          output: f,
          columns,
        });
        $[3] = columns;
        $[4] = label;
        $[5] = f;
        $[6] = annotation;
        $[7] = detail;
        $[8] = T;
      } else T = $[8];
      return T;
    }
    case "failed": {
      const annotation = step.exitCode === undefined ? "" : ` \xB7 exit code ${step.exitCode}`;
      const detail =
        step.error === label || ((step.exitCode ?? 0) > 0 && (step.output?.length ?? 0) > 0)
          ? undefined
          : step.error;
      let T;
      if (
        $[9] !== columns ||
        $[10] !== label ||
        $[11] !== step.output ||
        $[12] !== annotation ||
        $[13] !== detail
      ) {
        T = jsxProd_default(BootstrapStatusLine, {
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
        $[14] = T;
      } else T = $[14];
      return T;
    }
    case "pending": {
      let a;
      if ($[15] !== hint || $[16] !== label) {
        a = jsxProd_default(BootstrapStatusLine, {
          status: "pending",
          label,
          annotation: hint,
        });
        $[15] = hint;
        $[16] = label;
        $[17] = a;
      } else a = $[17];
      return a;
    }
    case "skipped": {
      return null;
    }
  }
}
//@ chunk-h93cnm7e.js:4246-6345 placement
function BootstrapStatusLine(props) {
  let $ = w(42);
  let { status, label, annotation, detail, output, columns, detailOverflow } = props;
  let l = annotation === undefined ? "" : annotation;
  let m = columns === undefined ? 80 : columns;
  let T = detailOverflow === undefined ? "truncate" : detailOverflow;
  let max = Math.max(20, m - 8);
  let A;
  if ($[0] !== detail || $[1] !== T || $[2] !== max) {
    A = detail === undefined || T === "wrap" ? detail : truncateToWidth(detail, max);
    $[0] = detail;
    $[1] = T;
    $[2] = max;
    $[3] = A;
  } else A = $[3];
  let b = A;
  switch (status) {
    case "completed": {
      let C;
      if ($[4] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default(Text, {
          color: "success",
          children: `  ${figures_default.tick} `,
        });
        $[4] = C;
      } else C = $[4];
      let u;
      if ($[5] !== l) {
        u = jsxProd_default(Text, {
          dimColor: true,
          children: l,
        });
        $[5] = l;
        $[6] = u;
      } else u = $[6];
      let x;
      if ($[7] !== label || $[8] !== u) {
        x = jsxProd_default_2(Box, {
          children: [
            C,
            jsxProd_default_2(Text, {
              children: [label, u],
            }),
          ],
        });
        $[7] = label;
        $[8] = u;
        $[9] = x;
      } else x = $[9];
      return x;
    }
    case "running": {
      let C;
      if ($[10] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default(Box, {
          width: 4,
          paddingLeft: 2,
          children: jsxProd_default(Spinner, {}),
        });
        $[10] = C;
      } else C = $[10];
      let u;
      if ($[11] !== l) {
        u = jsxProd_default(Text, {
          dimColor: true,
          children: l,
        });
        $[11] = l;
        $[12] = u;
      } else u = $[12];
      let x;
      if ($[13] !== label || $[14] !== u) {
        x = jsxProd_default_2(Box, {
          children: [
            C,
            jsxProd_default_2(Text, {
              children: [label, "\u2026", u],
            }),
          ],
        });
        $[13] = label;
        $[14] = u;
        $[15] = x;
      } else x = $[15];
      let N;
      if ($[16] !== b) {
        N =
          b !== undefined &&
          b !== "" &&
          jsxProd_default(Box, {
            paddingLeft: 6,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: b,
            }),
          });
        $[16] = b;
        $[17] = N;
      } else N = $[17];
      let v;
      if ($[18] !== max || $[19] !== output) {
        v = jsxProd_default(OutputLines, {
          output,
          width: max,
        });
        $[18] = max;
        $[19] = output;
        $[20] = v;
      } else v = $[20];
      let W;
      if ($[21] !== x || $[22] !== N || $[23] !== v) {
        W = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [x, N, v],
        });
        $[21] = x;
        $[22] = N;
        $[23] = v;
        $[24] = W;
      } else W = $[24];
      return W;
    }
    case "failed": {
      let C;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        C = jsxProd_default(Text, {
          color: "error",
          children: `  ${figures_default.cross} `,
        });
        $[25] = C;
      } else C = $[25];
      let u;
      if ($[26] !== l) {
        u = jsxProd_default(Text, {
          dimColor: true,
          children: l,
        });
        $[26] = l;
        $[27] = u;
      } else u = $[27];
      let x;
      if ($[28] !== label || $[29] !== u) {
        x = jsxProd_default_2(Box, {
          children: [
            C,
            jsxProd_default_2(Text, {
              children: [label, u],
            }),
          ],
        });
        $[28] = label;
        $[29] = u;
        $[30] = x;
      } else x = $[30];
      let N;
      if ($[31] !== b) {
        N =
          b !== undefined &&
          b !== "" &&
          jsxProd_default(Box, {
            paddingLeft: 6,
            children: jsxProd_default(Text, {
              color: "error",
              children: b,
            }),
          });
        $[31] = b;
        $[32] = N;
      } else N = $[32];
      let v;
      if ($[33] !== max || $[34] !== output) {
        v = jsxProd_default(OutputLines, {
          output,
          width: max,
        });
        $[33] = max;
        $[34] = output;
        $[35] = v;
      } else v = $[35];
      let W;
      if ($[36] !== x || $[37] !== N || $[38] !== v) {
        W = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [x, N, v],
        });
        $[36] = x;
        $[37] = N;
        $[38] = v;
        $[39] = W;
      } else W = $[39];
      return W;
    }
    case "pending": {
      const children = `  ${figures_default.circle} ${label}${l}`;
      let u;
      if ($[40] !== children) {
        u = jsxProd_default(Box, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        });
        $[40] = children;
        $[41] = u;
      } else u = $[41];
      return u;
    }
  }
}
//@ chunk-h93cnm7e.js:6345-6706 placement = _temp (0.696)
/**
 * 按宽度截断显示的多行输出（暗色、缩进 6），无输出时不渲染；实际只被 RemoteBootstrapProgress 使用。
 */
function OutputLines(props) {
  let $ = w(7);
  let { output, width } = props;
  if (output === undefined || output.length === 0) {
    return null;
  }
  let children;
  if ($[0] !== output || $[1] !== width) {
    let i;
    if ($[3] !== width) {
      i = (f, a) =>
        jsxProd_default(
          Text,
          {
            dimColor: true,
            children: truncateToWidth(f, width),
          },
          a,
        );
      $[3] = width;
      $[4] = i;
    } else i = $[4];
    children = output.map(i);
    $[0] = output;
    $[1] = width;
    $[2] = children;
  } else children = $[2];
  let i;
  if ($[5] !== children) {
    i = jsxProd_default(Box, {
      flexDirection: "column",
      paddingLeft: 6,
      children,
    });
    $[5] = children;
    $[6] = i;
  } else i = $[6];
  return i;
}
export { RemoteBootstrapProgress, BootstrapStatusLine };
