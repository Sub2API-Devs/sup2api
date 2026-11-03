/**
 * components/workflow/WorkflowProgress.tsx
 *
 * 2.1.316 新增：工作流运行进度显示（阶段、子代理行、汇总）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xvcy52fk.js (43)
 * attribution: placement 43
 */
import { j, Kc, y } from "../../../vendor/react/cjs/react.production.js";
import { getMarketingNameForModel } from "../../utils/model/model.js";
import { displayModelName } from "../../utils/model/validateModel.js";
import { RIGHT_ARROW, BLACK_CIRCLE, T8 } from "../../utils/permissions/autoModeRulesPrompt.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { formatTokens, formatDuration, truncateToWidth, formatBarElapsed } from "../../utils/format.js";
import { plural, Dr } from "../../utils/stringUtils.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { count } from "../../utils/collections.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { pps } from "../../../vendor/chart.js/dist/chart.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useInterval } from "../../ink/components/Input.js";
import { BRAILLE_FULL_BLOCK } from "../../constants/figures.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { OJs } from "../../utils/usageLimitText.js";

//@ chunk-xvcy52fk.js:918-922 placement
j();
//@ chunk-xvcy52fk.js:922-1045 placement
function modelTransitionText(l, t) {
  let a = (i) => getMarketingNameForModel(i) ?? displayModelName(i);
  if (t != null) return `${l == null ? "" : `${a(l)} `}${RIGHT_ARROW} ${a(t)}`;
  return l != null ? a(l) : "";
}
//@ chunk-xvcy52fk.js:1045-1086 placement
function _t(ge) {
  return ge.state === "done";
}
//@ chunk-xvcy52fk.js:1086-1128 placement
function jt(pe) {
  return pe.state === "error";
}
//@ chunk-xvcy52fk.js:1128-1193 placement
function zt(ee) {
  return ee.state === "start" || ee.state === "progress";
}
//@ chunk-xvcy52fk.js:1193-1232 placement
function Vt(v) {
  return v.state === "done";
}
//@ chunk-xvcy52fk.js:1232-1272 placement
function Bt(T) {
  return T.state === "error";
}
//@ chunk-xvcy52fk.js:1272-1328 placement
function Ut(v, T) {
  return e(Text, { dimColor: !0, children: v }, T);
}
//@ chunk-xvcy52fk.js:1328-1642 placement
function collectWorkflowProgress(l) {
  let t = new Map(),
    a = [],
    i = new Map();
  for (let o of l)
    if (o.type === "workflow_agent") t.set(o.index, o);
    else if (o.type === "workflow_log") a.push(o.message);
    else if (o.type === "workflow_phase") i.set(o.index, { title: o.title, kind: o.kind });
  return { agents: [...t.values()].sort((o, d) => o.index - d.index), logs: a, phaseTitles: i };
}
//@ chunk-xvcy52fk.js:1642-1950 placement
function groupAgentsByPhase(l, t) {
  if (!l.some((i) => i.phaseIndex != null)) return null;
  let a = new Map();
  for (let i of l) {
    let o = i.phaseIndex ?? 0,
      d = a.get(o);
    if (!d) {
      let c = t.get(o);
      ((d = { phaseIndex: o, title: c?.title ?? `Phase ${o}`, kind: c?.kind, agents: [] }), a.set(o, d));
    }
    d.agents.push(i);
  }
  return [...a.values()].sort((i, o) => i.phaseIndex - o.phaseIndex);
}
//@ chunk-xvcy52fk.js:1950-3756 placement
function WorkflowAgentRow(l) {
  let g = w(31),
    { row: row, isLast: isLast } = l,
    i = isLast ? "\u2514\u2500" : "\u251C\u2500",
    o = row.state === "start" || row.state === "progress",
    d;
  c: switch (row.state) {
    case "done": {
      d = "success";
      break c;
    }
    case "error": {
      d = "error";
      break c;
    }
    case "start":
    case "progress": {
      d = "running";
    }
  }
  let m;
  if (
    g[0] !== o ||
    g[1] !== row.agentType ||
    g[2] !== row.durationMs ||
    g[3] !== row.fallbackModel ||
    g[4] !== row.model ||
    g[5] !== row.tokens ||
    g[6] !== row.toolCalls
  ) {
    m = [];
    if (row.agentType != null) m.push(row.agentType);
    if (row.model != null || row.fallbackModel != null) {
      let u;
      if (g[8] !== row.fallbackModel || g[9] !== row.model)
        ((u = modelTransitionText(row.model, row.fallbackModel)),
          (g[8] = row.fallbackModel),
          (g[9] = row.model),
          (g[10] = u));
      else u = g[10];
      m.push(u);
    }
    if (row.tokens != null) {
      let u;
      if (g[11] !== row.tokens) ((u = formatTokens(row.tokens)), (g[11] = row.tokens), (g[12] = u));
      else u = g[12];
      m.push(`${u} tok`);
    }
    if (row.toolCalls != null && row.toolCalls > 0) {
      const toolCalls = row.toolCalls;
      let f;
      if (g[13] !== row.toolCalls)
        ((f = plural(row.toolCalls, "tool")), (g[13] = row.toolCalls), (g[14] = f));
      else f = g[14];
      m.push(`${toolCalls} ${f}`);
    }
    if (row.durationMs != null) {
      let u;
      if (g[15] !== row.durationMs)
        ((u = formatDuration(row.durationMs)), (g[15] = row.durationMs), (g[16] = u));
      else u = g[16];
      m.push(u);
    }
    if (o && m.length === 0) m.push("\u2026running");
    ((g[0] = o),
      (g[1] = row.agentType),
      (g[2] = row.durationMs),
      (g[3] = row.fallbackModel),
      (g[4] = row.model),
      (g[5] = row.tokens),
      (g[6] = row.toolCalls),
      (g[7] = m));
  } else m = g[7];
  let u;
  if (g[17] !== d) ((u = e(StatusIcon, { status: d })), (g[17] = d), (g[18] = u));
  else u = g[18];
  const label = row.label;
  let p;
  if (g[19] !== m)
    ((p = m.length > 0 && r(Text, { dimColor: !0, children: ["  ", m.join(" \xB7 ")] })),
      (g[19] = m),
      (g[20] = p));
  else p = g[20];
  let h;
  if (g[21] !== row.error || g[22] !== row.state)
    ((h =
      row.state === "error" &&
      row.error &&
      r(Text, { color: "error", children: [" ", "\u2014", " ", row.error] })),
      (g[21] = row.error),
      (g[22] = row.state),
      (g[23] = h));
  else h = g[23];
  let C;
  if (g[24] !== o || g[25] !== row.label || g[26] !== u || g[27] !== p || g[28] !== h || g[29] !== i)
    ((C = e(Box, {
      paddingLeft: 1,
      children: r(Text, { dimColor: o, children: [i, " ", u, " ", label, p, h] }),
    })),
      (g[24] = o),
      (g[25] = row.label),
      (g[26] = u),
      (g[27] = p),
      (g[28] = h),
      (g[29] = i),
      (g[30] = C));
  else C = g[30];
  return C;
}
//@ chunk-xvcy52fk.js:3756-5648 placement
function WorkflowPhaseGroup(l) {
  let o = w(41),
    { group: group, verbose: verbose, width: width } = l,
    d;
  if (o[0] !== group.agents) ((d = group.agents.filter(_t)), (o[0] = group.agents), (o[1] = d));
  else d = o[1];
  let c = d,
    g,
    m,
    u,
    f,
    p;
  if (o[2] !== c.length || o[3] !== group.agents || o[4] !== verbose) {
    let filtered = group.agents.filter(jt);
    let filtered_2 = group.agents.filter(zt);
    p = group.agents.length;
    m = c.length;
    u = filtered.length;
    g = m + u === p && p > 0;
    f = verbose ? group.agents : [...filtered, ...filtered_2];
    ((o[2] = c.length),
      (o[3] = group.agents),
      (o[4] = verbose),
      (o[5] = g),
      (o[6] = m),
      (o[7] = u),
      (o[8] = f),
      (o[9] = p));
  } else ((g = o[5]), (m = o[6]), (u = o[7]), (f = o[8]), (p = o[9]));
  let b = f,
    x = group.agents[0]?.model,
    M;
  if (o[10] !== x || o[11] !== group.agents)
    ((M = x && group.agents.every((agent) => agent.model === x) ? modelTransitionText(x, void 0) : void 0),
      (o[10] = x),
      (o[11] = group.agents),
      (o[12] = M));
  else M = o[12];
  let P = M,
    v = !g ? "running" : u > 0 ? "error" : "success";
  const T = group.kind === "child" ? "permission" : "subtle";
  let G;
  if (o[13] !== group.title)
    ((G = e(Text, { bold: !0, children: group.title })), (o[13] = group.title), (o[14] = G));
  else G = o[14];
  let W;
  if (o[15] !== v) ((W = e(StatusIcon, { status: v })), (o[15] = v), (o[16] = W));
  else W = o[16];
  const D = P && ` \xB7 ${P}`;
  let E;
  if (o[17] !== u)
    ((E = u > 0 && r(Text, { color: "error", children: [" ", "\xB7", " ", u, " failed"] })),
      (o[17] = u),
      (o[18] = E));
  else E = o[18];
  let _;
  if (o[19] !== m || o[20] !== D || o[21] !== E || o[22] !== p)
    ((_ = r(Text, { dimColor: !0, children: [m, "/", p, D, E] })),
      (o[19] = m),
      (o[20] = D),
      (o[21] = E),
      (o[22] = p),
      (o[23] = _));
  else _ = o[23];
  let z;
  if (o[24] !== G || o[25] !== W || o[26] !== _)
    ((z = e(Box, { paddingX: 1, children: r(Text, { children: [G, "  ", W, " ", _] }) })),
      (o[24] = G),
      (o[25] = W),
      (o[26] = _),
      (o[27] = z));
  else z = o[27];
  let U;
  if (o[28] !== m || o[29] !== verbose)
    ((U =
      !verbose &&
      m > 0 &&
      e(Box, {
        paddingLeft: 1,
        children: r(Text, {
          dimColor: !0,
          children: [e(StatusIcon, { status: "success" }), " ", m, " done"],
        }),
      })),
      (o[28] = m),
      (o[29] = verbose),
      (o[30] = U));
  else U = o[30];
  let X;
  if (o[31] !== b) {
    let N;
    if (o[33] !== b.length)
      ((N = (Z, Y) => e(WorkflowAgentRow, { row: Z, isLast: Y === b.length - 1 }, Z.index)),
        (o[33] = b.length),
        (o[34] = N));
    else N = o[34];
    X = b.map(N);
    ((o[31] = b), (o[32] = X));
  } else X = o[32];
  let N;
  if (o[35] !== z || o[36] !== U || o[37] !== X || o[38] !== T || o[39] !== width)
    ((N = r(Box, {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: T,
      alignSelf: "flex-start",
      width: width,
      children: [z, U, X],
    })),
      (o[35] = z),
      (o[36] = U),
      (o[37] = X),
      (o[38] = T),
      (o[39] = width),
      (o[40] = N));
  else N = o[40];
  return N;
}
//@ chunk-xvcy52fk.js:5648-5657 placement
var _e = 8;
//@ chunk-xvcy52fk.js:5657-6778 placement
function WorkflowAgentList(l) {
  let i = w(26),
    { agents: agents, verbose: verbose } = l,
    o;
  if (i[0] !== agents || i[1] !== verbose)
    ((o = verbose ? agents : agents.slice(-_e)), (i[0] = agents), (i[1] = verbose), (i[2] = o));
  else o = i[2];
  let d = o,
    c = agents.length - d.length,
    g;
  if (i[3] !== agents) ((g = count(agents, Vt)), (i[3] = agents), (i[4] = g));
  else g = i[4];
  let m = g,
    u = count(agents, Bt);
  const f = agents.length;
  let p;
  if (i[5] !== agents.length) ((p = plural(agents.length, "agent")), (i[5] = agents.length), (i[6] = p));
  else p = i[6];
  let h;
  if (i[7] !== u)
    ((h = u > 0 && r(Text, { color: "error", children: [" ", "\xB7", " ", u, " failed"] })),
      (i[7] = u),
      (i[8] = h));
  else h = i[8];
  let C;
  if (i[9] !== agents.length || i[10] !== m || i[11] !== p || i[12] !== h)
    ((C = r(Text, { children: [f, " ", p, " ", "\xB7", " ", m, " done", h] })),
      (i[9] = agents.length),
      (i[10] = m),
      (i[11] = p),
      (i[12] = h),
      (i[13] = C));
  else C = i[13];
  let b;
  if (i[14] !== c || i[15] !== d) {
    let x;
    if (i[17] !== c || i[18] !== d.length)
      ((x = (M, A) => e(WorkflowAgentRow, { row: M, isLast: A === d.length - 1 && c === 0 }, M.index)),
        (i[17] = c),
        (i[18] = d.length),
        (i[19] = x));
    else x = i[19];
    b = d.map(x);
    ((i[14] = c), (i[15] = d), (i[16] = b));
  } else b = i[16];
  let x;
  if (i[20] !== c)
    ((x =
      c > 0 &&
      e(Box, {
        paddingLeft: 1,
        children: r(Text, { dimColor: !0, children: ["\u2514\u2500 \xB7 \xB7 \xB7 +", c, " more"] }),
      })),
      (i[20] = c),
      (i[21] = x));
  else x = i[21];
  let P;
  if (i[22] !== C || i[23] !== b || i[24] !== x)
    ((P = r(Box, { flexDirection: "column", children: [C, b, x] })),
      (i[22] = C),
      (i[23] = b),
      (i[24] = x),
      (i[25] = P));
  else P = i[25];
  return P;
}
/**
 * 工作流进度主体：按阶段分组显示子代理状态与日志。
 */
//@ chunk-xvcy52fk.js:6778-7809 placement
function WorkflowProgressBody(l) {
  let g = w(18),
    { collected: collected, verbose: verbose, width: width } = l,
    { agents: agents, logs: logs, phaseTitles: phaseTitles } = collected;
  if (agents.length === 0 && logs.length === 0) {
    return null;
  }
  let m, u, f, p, h;
  if (g[0] !== agents || g[1] !== logs || g[2] !== phaseTitles || g[3] !== verbose || g[4] !== width) {
    let C = groupAgentsByPhase(agents, phaseTitles);
    let b;
    if (g[10] !== logs) ((b = logs.at(-1)), (g[10] = logs), (g[11] = b));
    else b = g[11];
    let x = b;
    let sliced = logs.slice(-3, -1);
    m = Box;
    u = "column";
    f =
      x &&
      e(Box, {
        marginBottom: C || agents.length > 0 ? 1 : 0,
        children: r(Text, { children: [re.pointer, " ", x] }),
      });
    p = C
      ? e(Box, {
          flexDirection: "column",
          children: C.map((A, P) =>
            r(
              Kc,
              {
                children: [
                  e(WorkflowPhaseGroup, { group: A, verbose: verbose, width: width }),
                  P < C.length - 1 &&
                    e(Box, { paddingLeft: 3, children: e(Text, { dimColor: !0, children: "\u2193" }) }),
                ],
              },
              A.phaseIndex,
            ),
          ),
        })
      : agents.length > 0
        ? e(WorkflowAgentList, { agents: agents, verbose: verbose })
        : null;
    h =
      sliced.length > 0 &&
      e(Box, { flexDirection: "column", paddingLeft: 3, marginTop: 1, children: sliced.map(Ut) });
    ((g[0] = agents),
      (g[1] = logs),
      (g[2] = phaseTitles),
      (g[3] = verbose),
      (g[4] = width),
      (g[5] = m),
      (g[6] = u),
      (g[7] = f),
      (g[8] = p),
      (g[9] = h));
  } else ((m = g[5]), (u = g[6]), (f = g[7]), (p = g[8]), (h = g[9]));
  let b;
  if (g[12] !== m || g[13] !== u || g[14] !== f || g[15] !== p || g[16] !== h)
    ((b = r(m, { flexDirection: u, children: [f, p, h] })),
      (g[12] = m),
      (g[13] = u),
      (g[14] = f),
      (g[15] = p),
      (g[16] = h),
      (g[17] = b));
  else b = g[17];
  return b;
}
//@ chunk-xvcy52fk.js:7809-7813 placement
j();
//@ chunk-xvcy52fk.js:7813-7845 placement
function An() {
  return Date.now();
}
//@ chunk-xvcy52fk.js:7845-7859 placement
var R = 4,
  Ze = 80;
//@ chunk-xvcy52fk.js:7859-8055 placement
function useSpinnerGlyph(l) {
  let t = w(2),
    a;
  if (t[0] === MEMO_CACHE_SENTINEL) ((a = pps()), (t[0] = a));
  else a = t[0];
  let i = a,
    [o, d] = y(0),
    c = usePrefersReducedMotion(),
    g;
  if (t[1] === MEMO_CACHE_SENTINEL) ((g = () => d((m) => (m + 1) % i.length)), (t[1] = g));
  else g = t[1];
  return (useInterval(g, l && !c ? Ze : null), i[o % i.length]);
}
//@ chunk-xvcy52fk.js:8055-8700 placement
function ProgressBar(l) {
  let o = w(14),
    { done: t, total: total, running: running } = l,
    d;
  if (o[0] !== t || o[1] !== total)
    ((d = total > 0 ? Math.round((t / total) * R) : 0), (o[0] = t), (o[1] = total), (o[2] = d));
  else d = o[2];
  let c = d,
    min = Math.min(running ? R - 1 : R, Math.max(0, c)),
    m = running ? Math.min(R - min, 1) : 0,
    u = R - min - m,
    f = useSpinnerGlyph(m > 0),
    p;
  if (o[3] !== min)
    ((p = min > 0 && e(Text, { color: "success", children: BRAILLE_FULL_BLOCK.repeat(min) })),
      (o[3] = min),
      (o[4] = p));
  else p = o[4];
  let h;
  if (o[5] !== f || o[6] !== m)
    ((h = m > 0 && e(Text, { color: "success", children: f })), (o[5] = f), (o[6] = m), (o[7] = h));
  else h = o[7];
  let C;
  if (o[8] !== u)
    ((C = u > 0 && e(Text, { color: "subtle", dimColor: !0, children: BRAILLE_FULL_BLOCK.repeat(u) })),
      (o[8] = u),
      (o[9] = C));
  else C = o[9];
  let b;
  if (o[10] !== p || o[11] !== h || o[12] !== C)
    ((b = r(Text, { children: [p, h, C] })), (o[10] = p), (o[11] = h), (o[12] = C), (o[13] = b));
  else b = o[13];
  return b;
}
//@ chunk-xvcy52fk.js:8700-8716 placement
var WORKFLOW_PROGRESS_LIMITS = 9,
  Je = 12;
//@ chunk-xvcy52fk.js:8716-9082 placement
function useWorkflowProgressRows(l) {
  let o = w(9),
    t = useTerminalSize(),
    { rows: rows } = useScrollViewportSize(t),
    i = Tl(),
    d;
  if (o[0] !== i || o[1] !== l || o[2] !== rows)
    ((d = i
      ? rows
      : isFullscreenActive()
        ? Math.floor(rows / 2)
        : l
          ? Math.max(Je, rows - WORKFLOW_PROGRESS_LIMITS)
          : rows),
      (o[0] = i),
      (o[1] = l),
      (o[2] = rows),
      (o[3] = d));
  else d = o[3];
  let c = d,
    { columns: columns } = t,
    max = Math.max(24, columns - 6),
    u;
  if (o[4] !== c || o[5] !== columns || o[6] !== rows || o[7] !== max)
    ((u = { availableRows: c, width: max, rows: rows, columns: columns }),
      (o[4] = c),
      (o[5] = columns),
      (o[6] = rows),
      (o[7] = max),
      (o[8] = u));
  else u = o[8];
  return u;
}
//@ chunk-xvcy52fk.js:9082-9282 placement
function ElapsedClock(l) {
  let o = w(1),
    t = l.status === "running",
    [a, i] = y(An),
    d;
  if (o[0] === MEMO_CACHE_SENTINEL) ((d = () => i(Date.now())), (o[0] = d));
  else d = o[0];
  return (
    useInterval(d, t ? 1000 : null),
    Math.max(0, (l.endTime ?? a) - l.startTime - (l.totalPausedMs ?? 0))
  );
}
//@ chunk-xvcy52fk.js:9282-9292 placement
var ue = 17;
//@ chunk-xvcy52fk.js:9292-10718 placement
function WorkflowPhaseRow(l) {
  let P = w(28),
    {
      index: index,
      title: title,
      done: i,
      total: total,
      status: status,
      selected: selected,
      trailing: trailing,
    } = l,
    m = selected === void 0 ? !1 : selected,
    u = trailing === void 0 ? "" : trailing,
    f = status === "done",
    p = status === "failed",
    h = f || p,
    C = m ? "permission" : f ? "success" : p ? "error" : "subtle",
    b = m ? re.pointer : " ",
    x = f ? re.tick : p ? re.cross : String(index),
    M = bunStringWidth(b) + 1 + bunStringWidth(x) + 1,
    max = Math.max(1, ue - M),
    v;
  if (P[0] !== title || P[1] !== max)
    ((v = truncateToWidth(title, max)), (P[0] = title), (P[1] = max), (P[2] = v));
  else v = P[2];
  let T = v,
    G = `${b} ${x} ${T}`,
    max_2 = Math.max(0, ue - bunStringWidth(G)),
    D = total > 0 ? `${i}/${total}` : "";
  const E = m ? "permission" : void 0;
  let _;
  if (P[3] !== b || P[4] !== E)
    ((_ = e(Text, { color: E, children: b })), (P[3] = b), (P[4] = E), (P[5] = _));
  else _ = P[5];
  let z;
  if (P[6] !== C || P[7] !== x)
    ((z = e(Text, { color: C, children: x })), (P[6] = C), (P[7] = x), (P[8] = z));
  else z = P[8];
  const U = m ? "permission" : f ? "success" : p ? "error" : void 0,
    X = !m && !h;
  let N;
  if (P[9] !== T || P[10] !== U || P[11] !== X)
    ((N = e(Text, { color: U, dimColor: X, children: T })),
      (P[9] = T),
      (P[10] = U),
      (P[11] = X),
      (P[12] = N));
  else N = P[12];
  let Z;
  if (P[13] !== max_2) ((Z = " ".repeat(max_2)), (P[13] = max_2), (P[14] = Z));
  else Z = P[14];
  let Y;
  if (P[15] !== Z || P[16] !== _ || P[17] !== z || P[18] !== N)
    ((Y = r(Text, { wrap: "truncate-end", children: [_, " ", z, " ", N, Z] })),
      (P[15] = Z),
      (P[16] = _),
      (P[17] = z),
      (P[18] = N),
      (P[19] = Y));
  else Y = P[19];
  const ge = m ? "permission" : f ? "success" : p ? "error" : void 0,
    pe = !m && !h,
    ee = u ? `  ${u}` : "";
  let fe;
  if (P[20] !== D || P[21] !== ge || P[22] !== pe || P[23] !== ee)
    ((fe = r(Text, { wrap: "truncate-end", color: ge, dimColor: pe, children: [D, ee] })),
      (P[20] = D),
      (P[21] = ge),
      (P[22] = pe),
      (P[23] = ee),
      (P[24] = fe));
  else fe = P[24];
  let wt;
  if (P[25] !== Y || P[26] !== fe)
    ((wt = r(Box, { children: [Y, fe] })), (P[25] = Y), (P[26] = fe), (P[27] = wt));
  else wt = P[27];
  return wt;
}
//@ chunk-xvcy52fk.js:10718-11745 placement
function WorkflowSummaryRow(l) {
  let p = w(23),
    {
      name: t,
      done: a,
      total: total,
      running: running,
      elapsedMs: elapsedMs,
      complete: complete,
      dotState: dotState,
      phaseText: phaseText,
      selected: selected,
    } = l,
    f = selected === void 0 ? !1 : selected,
    h;
  if (p[0] !== elapsedMs)
    ((h = elapsedMs !== void 0 ? formatBarElapsed(elapsedMs) : void 0), (p[0] = elapsedMs), (p[1] = h));
  else h = p[1];
  let C = h,
    b = complete ? ` \xB7 ${re.ellipsis} to view` : "",
    x = dotState === "failed" ? "error" : "success",
    M;
  if (p[2] !== x) ((M = e(Text, { color: x, children: BLACK_CIRCLE })), (p[2] = x), (p[3] = M));
  else M = p[3];
  let A;
  if (p[4] !== t || p[5] !== f)
    ((A = t ? r(Text, { color: f ? "claude" : void 0, bold: f, children: [t, " "] }) : null),
      (p[4] = t),
      (p[5] = f),
      (p[6] = A));
  else A = p[6];
  let P;
  if (p[7] !== a || p[8] !== running || p[9] !== total)
    ((P = e(ProgressBar, { done: a, total: total, running: running })),
      (p[7] = a),
      (p[8] = running),
      (p[9] = total),
      (p[10] = P));
  else P = p[10];
  const v = !f,
    T = phaseText ? ` \xB7 ${phaseText}` : "",
    G = ` \xB7 ${a}/${total} agents`,
    W = C ? ` \xB7 ${C}` : "";
  let D;
  if (p[11] !== b || p[12] !== f || p[13] !== v || p[14] !== T || p[15] !== G || p[16] !== W)
    ((D = r(Text, { dimColor: v, bold: f, children: [T, G, W, b] })),
      (p[11] = b),
      (p[12] = f),
      (p[13] = v),
      (p[14] = T),
      (p[15] = G),
      (p[16] = W),
      (p[17] = D));
  else D = p[17];
  let E;
  if (p[18] !== D || p[19] !== M || p[20] !== A || p[21] !== P)
    ((E = r(Text, { wrap: "truncate-end", children: [M, " ", A, P, D] })),
      (p[18] = D),
      (p[19] = M),
      (p[20] = A),
      (p[21] = P),
      (p[22] = E));
  else E = p[22];
  return E;
}
//@ chunk-xvcy52fk.js:11745-12627 placement
function WorkflowHeader(l) {
  let c = w(17),
    { name: t, subtext: subtext, stats: stats, width: width } = l,
    d = Tl(),
    g;
  if (c[0] !== d || c[1] !== width)
    ((g = !d && e(Text, { color: "text", wrap: "truncate-end", children: T8.repeat(Math.max(1, width)) })),
      (c[0] = d),
      (c[1] = width),
      (c[2] = g));
  else g = c[2];
  let m;
  if (c[3] !== t)
    ((m = r(Text, { bold: !0, color: "permission", wrap: "truncate-end", children: [" ", t] })),
      (c[3] = t),
      (c[4] = m));
  else m = c[4];
  let u;
  if (c[5] !== subtext)
    ((u = e(Box, {
      flexGrow: 1,
      flexShrink: 1,
      overflow: "hidden",
      children: r(Text, { dimColor: !0, wrap: "truncate-end", children: [" ", subtext] }),
    })),
      (c[5] = subtext),
      (c[6] = u));
  else u = c[6];
  let f;
  if (c[7] !== stats)
    ((f = stats
      ? e(Box, { flexShrink: 0, children: r(Text, { dimColor: !0, children: [stats, " "] }) })
      : null),
      (c[7] = stats),
      (c[8] = f));
  else f = c[8];
  let p;
  if (c[9] !== u || c[10] !== f || c[11] !== width)
    ((p = r(Box, { width: width, overflow: "hidden", children: [u, f] })),
      (c[9] = u),
      (c[10] = f),
      (c[11] = width),
      (c[12] = p));
  else p = c[12];
  let h;
  if (c[13] !== g || c[14] !== m || c[15] !== p)
    ((h = r(Box, { flexDirection: "column", children: [g, m, p] })),
      (c[13] = g),
      (c[14] = m),
      (c[15] = p),
      (c[16] = h));
  else h = c[16];
  return h;
}
//@ chunk-xvcy52fk.js:12627-13056 placement
function agentStateCounts(l) {
  let t = count(l.agents, (u) => u.state === "done"),
    a = count(l.agents, (u) => u.state === "error"),
    i = l.agents.length,
    o = t + a === i && i > 0,
    d = 0,
    c = 1 / 0,
    g = 0;
  for (let agent of l.agents) {
    if (agent.tokens) d += agent.tokens;
    if (agent.startedAt != null) {
      if (agent.startedAt < c) c = agent.startedAt;
      let f = agent.lastProgressAt ?? agent.startedAt;
      if (f > g) g = f;
    }
  }
  let m = c < 1 / 0 ? g - c : 0;
  return {
    title: l.title,
    status: o ? (a > 0 ? "failed" : "done") : "running",
    agents: l.agents,
    doneCount: t,
    totalCount: i,
    tokens: d,
    durationMs: m,
  };
}
//@ chunk-xvcy52fk.js:13056-13165 placement
function emptyPhaseRow(l) {
  return {
    title: l,
    status: "not-started",
    agents: [],
    doneCount: 0,
    totalCount: 0,
    tokens: 0,
    durationMs: 0,
  };
}
//@ chunk-xvcy52fk.js:13165-13210 placement
function ft(l) {
  return l.toLowerCase().trim();
}
//@ chunk-xvcy52fk.js:13210-13317 placement
function phaseTitlesMatch(l, t) {
  let a = ft(l),
    i = ft(t);
  if (!a || !i) return a === i;
  return a === i || a.startsWith(i) || i.startsWith(a);
}
//@ chunk-xvcy52fk.js:13317-13562 placement
function alignPhaseRows(l, t) {
  let a = new Set(),
    i = [];
  function o(d) {
    for (let c of t) {
      if (a.has(c)) continue;
      if (phaseTitlesMatch(d, c.title)) return (a.add(c), c);
    }
    return;
  }
  for (let d of l ?? []) {
    let c = o(d.title);
    i.push(c ? agentStateCounts(c) : emptyPhaseRow(d.title));
  }
  for (let d of t) if (!a.has(d)) i.push(agentStateCounts(d));
  return i;
}
//@ chunk-xvcy52fk.js:13562-13760 placement
function workflowPhaseRows(l) {
  let t = collectWorkflowProgress(l.workflowProgress),
    a = groupAgentsByPhase(t.agents, t.phaseTitles) ?? [],
    i = alignPhaseRows(l.phases, a);
  if (i.length === 0 && t.agents.length > 0)
    return [agentStateCounts({ phaseIndex: 0, title: "Agents", agents: t.agents })];
  return i;
}
//@ chunk-xvcy52fk.js:13760-13770 placement
var me = 16;
//@ chunk-xvcy52fk.js:13770-13800 placement
function noWorkflowFooter(l, t) {
  return null;
}
//@ chunk-xvcy52fk.js:13800-14015 placement
var PHASE_NAME_WIDTH = me + 8,
  AEIOU = "aeiou",
  GERUND_OVERRIDES = new Map([
    ["commit", "committing"],
    ["submit", "submitting"],
    ["format", "formatting"],
    ["edit", "editing"],
    ["exit", "exiting"],
    ["setup", null],
    ["cleanup", null],
    ["init", null],
  ]),
  SIMPLE_VERB_RE = /^[A-Za-z]{3,12}$/;
//@ chunk-xvcy52fk.js:14015-14450 placement
function normalizePhaseTitle(l) {
  if (!SIMPLE_VERB_RE.test(l)) return l;
  let lower = l.toLowerCase(),
    a = GERUND_OVERRIDES.get(lower);
  if (a !== void 0) return a === null ? l : l[0] + a.slice(1);
  if (lower.endsWith("ing")) return l;
  if (lower.endsWith("ie")) return `${l.slice(0, -2)}ying`;
  if (lower.endsWith("e") && !lower.endsWith("ee") && !lower.endsWith("ye")) return `${l.slice(0, -1)}ing`;
  let at = lower.at(-1);
  if (
    lower.length <= 4 &&
    !AEIOU.includes(lower.at(-3)) &&
    AEIOU.includes(lower.at(-2)) &&
    !AEIOU.includes(at) &&
    !"wxy".includes(at)
  )
    return `${l}${at}ing`;
  return `${l}ing`;
}
//@ chunk-xvcy52fk.js:14450-14463 placement
var De = " & ";
//@ chunk-xvcy52fk.js:14463-14791 placement
function phaseTitleSummary(l) {
  let { titles: titles, positionStart: positionStart, totalPhases: totalPhases } = l,
    mapped = titles.map((c) => normalizePhaseTitle(Dr(c)));
  if (mapped.length === 1) return `${truncateToWidth(mapped[0] ?? "", me)} (${positionStart}/${totalPhases})`;
  if (mapped.length === 2) {
    let joined = mapped.map((m) => truncateToWidth(m, me)).join(De),
      floored = Math.floor((PHASE_NAME_WIDTH - De.length) / 2);
    return bunStringWidth(joined) <= PHASE_NAME_WIDTH
      ? joined
      : mapped.map((m) => truncateToWidth(m, floored)).join(De);
  }
  let d = ` +${mapped.length - 1}`;
  return truncateToWidth(mapped[0] ?? "", me - bunStringWidth(d)) + d;
}
//@ chunk-xvcy52fk.js:14791-14916 placement
function sumPhaseCounts(l, t) {
  let a = 0,
    i = 0;
  for (let o of l) ((a += o.doneCount), (i += o.totalCount));
  return { doneAgents: a, totalAgents: Math.max(t, i, a) };
}
//@ chunk-xvcy52fk.js:14916-15073 placement
function workflowDescription(l) {
  if (l.script.length > 0) {
    let t = parseWorkflowScript(l.script);
    if (!("error" in t) && t.meta.description) return t.meta.description;
  }
  return l.description || l.summary || "";
}
//@ chunk-xvcy52fk.js:15073-15476 placement
function workflowStatusLine(l, t, a, i) {
  let o =
      l.status === "completed"
        ? " \xB7 done"
        : l.status === "killed"
          ? " \xB7 stopped"
          : l.status === "paused"
            ? " \xB7 paused"
            : isTerminalTaskStatus(l.status)
              ? " \xB7 failed"
              : "",
    d = l.status === "running" && l.rateLimitWait !== void 0 ? OJs(l.rateLimitWait.resetsAt) : t,
    c = `${a.doneAgents}/${a.totalAgents} ${plural(a.totalAgents, "agent")} \xB7 ${formatBarElapsed(i)}${o}`;
  return { name: l.workflowName ?? l.summary ?? l.description, subtext: d, stats: c };
}
//@ chunk-xvcy52fk.js:15476-15868 placement
function countWorkflowAgents(l, t = 0) {
  let a = 0,
    i = 0,
    o = 0,
    d = 0,
    c = !1;
  for (let u of l) {
    if (u.type !== "workflow_agent") continue;
    if ((a++, u.state === "done")) (i++, d++);
    else if (u.state === "error") (o++, d++);
    else if (u.state === "start" || u.state === "progress") {
      if (((c = !0), u.startedAt !== void 0 || u.queuedAt === void 0 || (u.tokens ?? 0) > 0)) d++;
    }
  }
  let max = Math.max(t, a),
    m = !c && a > 0 && i + o >= max;
  return { done: i, failedCount: o, running: c, total: max, started: d, complete: m };
}

export {
  countWorkflowAgents,
  ElapsedClock,
  WORKFLOW_PROGRESS_LIMITS,
  collectWorkflowProgress,
  WorkflowProgressBody,
  noWorkflowFooter,
  WorkflowSummaryRow,
  phaseTitleSummary,
  modelTransitionText,
  useWorkflowProgressRows,
  workflowPhaseRows,
  sumPhaseCounts,
  workflowDescription,
  workflowStatusLine,
  WorkflowHeader,
  WorkflowPhaseRow,
};
