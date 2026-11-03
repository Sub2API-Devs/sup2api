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
import { j, y } from "../../vendor/react/cjs/react.production.js";
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
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { plural } from "../utils/stringUtils.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { truncateToWidth } from "../utils/format.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { Spinner } from "./Spinner.js";

//@ chunk-h93cnm7e.js:1888-1892 placement
j();
//@ chunk-h93cnm7e.js:1892-1932 placement
function selectRemoteBootstrap(N) {
  return N.remoteBootstrap;
}
//@ chunk-h93cnm7e.js:1932-1964 placement
function Se() {
  return Date.now();
}
//@ chunk-h93cnm7e.js:1964-2006 placement
function Pe(v) {
  return v.status === "failed";
}
//@ chunk-h93cnm7e.js:2006-3148 placement
function RemoteBootstrapProgress() {
  let $ = w(22),
    c = useAppState(selectRemoteBootstrap),
    { columns: columns } = useTerminalSize(),
    [t, g] = y(Se),
    i;
  if ($[0] === MEMO_CACHE_SENTINEL) ((i = () => g(Date.now())), ($[0] = i));
  else i = $[0];
  if ((useInterval(i, 1000), c === null)) {
    return null;
  }
  let queuedCount = c.queuedCount,
    a,
    l,
    m,
    T,
    h,
    d;
  if ($[1] !== columns || $[2] !== t || $[3] !== c) {
    l = c.steps.some(Pe);
    let A = completedSetupMode(c);
    a = Box;
    m = "column";
    T = 1;
    h = r(Text, { bold: !0, children: [setupHeadline(A, l), l || A === "restored" ? "" : "\u2026"] });
    d = c.steps.map((step) =>
      step.status === "skipped"
        ? null
        : e(
            BootstrapStepRow,
            {
              step: step,
              label: setupStepLabel(step, A),
              hint: step.id === "setup_script" ? setupStepAnnotation(c, step, A) : "",
              now: t,
              columns: columns,
            },
            step.id,
          ),
    );
    (($[1] = columns),
      ($[2] = t),
      ($[3] = c),
      ($[4] = a),
      ($[5] = l),
      ($[6] = m),
      ($[7] = T),
      ($[8] = h),
      ($[9] = d));
  } else ((a = $[4]), (l = $[5]), (m = $[6]), (T = $[7]), (h = $[8]), (d = $[9]));
  let C;
  if ($[10] !== l || $[11] !== queuedCount)
    ((C = l
      ? "Send a message to try again."
      : queuedCount > 0
        ? `${queuedCount} ${plural(queuedCount, "message")} queued \xB7 sends once the session is ready`
        : "You can start typing \u2014 messages send once the session is ready"),
      ($[10] = l),
      ($[11] = queuedCount),
      ($[12] = C));
  else C = $[12];
  let u;
  if ($[13] !== C)
    ((u = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: C }) })),
      ($[13] = C),
      ($[14] = u));
  else u = $[14];
  let x;
  if ($[15] !== a || $[16] !== m || $[17] !== T || $[18] !== h || $[19] !== d || $[20] !== u)
    ((x = r(a, { flexDirection: m, marginTop: T, children: [h, d, u] })),
      ($[15] = a),
      ($[16] = m),
      ($[17] = T),
      ($[18] = h),
      ($[19] = d),
      ($[20] = u),
      ($[21] = x));
  else x = $[21];
  return x;
}
//@ chunk-h93cnm7e.js:3148-4246 placement
function BootstrapStepRow(c) {
  let $ = w(18),
    { step: step, label: label, hint: hint, now: now, columns: columns } = c,
    f = useIsFullscreen() ? step.output : step.output?.slice(-1);
  switch (step.status) {
    case "completed": {
      const a = stepDurationSuffix(step, now) + hint;
      let m;
      if ($[0] !== label || $[1] !== a)
        ((m = e(BootstrapStatusLine, { status: "completed", label: label, annotation: a })),
          ($[0] = label),
          ($[1] = a),
          ($[2] = m));
      else m = $[2];
      return m;
    }
    case "running": {
      const a = stepDurationSuffix(step, now) + hint;
      const m = f === void 0 ? step.detail : void 0;
      let T;
      if ($[3] !== columns || $[4] !== label || $[5] !== f || $[6] !== a || $[7] !== m)
        ((T = e(BootstrapStatusLine, {
          status: "running",
          label: label,
          annotation: a,
          detail: m,
          output: f,
          columns: columns,
        })),
          ($[3] = columns),
          ($[4] = label),
          ($[5] = f),
          ($[6] = a),
          ($[7] = m),
          ($[8] = T));
      else T = $[8];
      return T;
    }
    case "failed": {
      const a = step.exitCode === void 0 ? "" : ` \xB7 exit code ${step.exitCode}`;
      const m =
        step.error === label || ((step.exitCode ?? 0) > 0 && (step.output?.length ?? 0) > 0)
          ? void 0
          : step.error;
      let T;
      if ($[9] !== columns || $[10] !== label || $[11] !== step.output || $[12] !== a || $[13] !== m)
        ((T = e(BootstrapStatusLine, {
          status: "failed",
          label: label,
          annotation: a,
          detail: m,
          output: step.output,
          columns: columns,
        })),
          ($[9] = columns),
          ($[10] = label),
          ($[11] = step.output),
          ($[12] = a),
          ($[13] = m),
          ($[14] = T));
      else T = $[14];
      return T;
    }
    case "pending": {
      let a;
      if ($[15] !== hint || $[16] !== label)
        ((a = e(BootstrapStatusLine, { status: "pending", label: label, annotation: hint })),
          ($[15] = hint),
          ($[16] = label),
          ($[17] = a));
      else a = $[17];
      return a;
    }
    case "skipped": {
      return null;
    }
  }
}
//@ chunk-h93cnm7e.js:4246-6345 placement
function BootstrapStatusLine(c) {
  let $ = w(42),
    {
      status: status,
      label: label,
      annotation: annotation,
      detail: detail,
      output: output,
      columns: columns,
      detailOverflow: detailOverflow,
    } = c,
    l = annotation === void 0 ? "" : annotation,
    m = columns === void 0 ? 80 : columns,
    T = detailOverflow === void 0 ? "truncate" : detailOverflow,
    max = Math.max(20, m - 8),
    A;
  if ($[0] !== detail || $[1] !== T || $[2] !== max)
    ((A = detail === void 0 || T === "wrap" ? detail : truncateToWidth(detail, max)),
      ($[0] = detail),
      ($[1] = T),
      ($[2] = max),
      ($[3] = A));
  else A = $[3];
  let b = A;
  switch (status) {
    case "completed": {
      let C;
      if ($[4] === MEMO_CACHE_SENTINEL)
        ((C = e(Text, { color: "success", children: `  ${re.tick} ` })), ($[4] = C));
      else C = $[4];
      let u;
      if ($[5] !== l) ((u = e(Text, { dimColor: !0, children: l })), ($[5] = l), ($[6] = u));
      else u = $[6];
      let x;
      if ($[7] !== label || $[8] !== u)
        ((x = r(Box, { children: [C, r(Text, { children: [label, u] })] })),
          ($[7] = label),
          ($[8] = u),
          ($[9] = x));
      else x = $[9];
      return x;
    }
    case "running": {
      let C;
      if ($[10] === MEMO_CACHE_SENTINEL)
        ((C = e(Box, { width: 4, paddingLeft: 2, children: e(Spinner, {}) })), ($[10] = C));
      else C = $[10];
      let u;
      if ($[11] !== l) ((u = e(Text, { dimColor: !0, children: l })), ($[11] = l), ($[12] = u));
      else u = $[12];
      let x;
      if ($[13] !== label || $[14] !== u)
        ((x = r(Box, { children: [C, r(Text, { children: [label, "\u2026", u] })] })),
          ($[13] = label),
          ($[14] = u),
          ($[15] = x));
      else x = $[15];
      let N;
      if ($[16] !== b)
        ((N =
          b !== void 0 &&
          b !== "" &&
          e(Box, { paddingLeft: 6, children: e(Text, { dimColor: !0, children: b }) })),
          ($[16] = b),
          ($[17] = N));
      else N = $[17];
      let v;
      if ($[18] !== max || $[19] !== output)
        ((v = e(OutputLines, { output: output, width: max })), ($[18] = max), ($[19] = output), ($[20] = v));
      else v = $[20];
      let W;
      if ($[21] !== x || $[22] !== N || $[23] !== v)
        ((W = r(Box, { flexDirection: "column", children: [x, N, v] })),
          ($[21] = x),
          ($[22] = N),
          ($[23] = v),
          ($[24] = W));
      else W = $[24];
      return W;
    }
    case "failed": {
      let C;
      if ($[25] === MEMO_CACHE_SENTINEL)
        ((C = e(Text, { color: "error", children: `  ${re.cross} ` })), ($[25] = C));
      else C = $[25];
      let u;
      if ($[26] !== l) ((u = e(Text, { dimColor: !0, children: l })), ($[26] = l), ($[27] = u));
      else u = $[27];
      let x;
      if ($[28] !== label || $[29] !== u)
        ((x = r(Box, { children: [C, r(Text, { children: [label, u] })] })),
          ($[28] = label),
          ($[29] = u),
          ($[30] = x));
      else x = $[30];
      let N;
      if ($[31] !== b)
        ((N =
          b !== void 0 &&
          b !== "" &&
          e(Box, { paddingLeft: 6, children: e(Text, { color: "error", children: b }) })),
          ($[31] = b),
          ($[32] = N));
      else N = $[32];
      let v;
      if ($[33] !== max || $[34] !== output)
        ((v = e(OutputLines, { output: output, width: max })), ($[33] = max), ($[34] = output), ($[35] = v));
      else v = $[35];
      let W;
      if ($[36] !== x || $[37] !== N || $[38] !== v)
        ((W = r(Box, { flexDirection: "column", children: [x, N, v] })),
          ($[36] = x),
          ($[37] = N),
          ($[38] = v),
          ($[39] = W));
      else W = $[39];
      return W;
    }
    case "pending": {
      const C = `  ${re.circle} ${label}${l}`;
      let u;
      if ($[40] !== C)
        ((u = e(Box, { children: e(Text, { dimColor: !0, children: C }) })), ($[40] = C), ($[41] = u));
      else u = $[41];
      return u;
    }
  }
}
/**
 * 按宽度截断显示的多行输出（暗色、缩进 6），无输出时不渲染；实际只被 RemoteBootstrapProgress 使用。
 */
//@ chunk-h93cnm7e.js:6345-6706 placement = _temp (0.696)
function OutputLines(c) {
  let $ = w(7),
    { output: output, width: width } = c;
  if (output === void 0 || output.length === 0) {
    return null;
  }
  let p;
  if ($[0] !== output || $[1] !== width) {
    let i;
    if ($[3] !== width)
      ((i = (f, a) => e(Text, { dimColor: !0, children: truncateToWidth(f, width) }, a)),
        ($[3] = width),
        ($[4] = i));
    else i = $[4];
    p = output.map(i);
    (($[0] = output), ($[1] = width), ($[2] = p));
  } else p = $[2];
  let i;
  if ($[5] !== p)
    ((i = e(Box, { flexDirection: "column", paddingLeft: 6, children: p })), ($[5] = p), ($[6] = i));
  else i = $[6];
  return i;
}

export { RemoteBootstrapProgress, BootstrapStatusLine };
