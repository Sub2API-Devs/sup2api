/**
 * components/_new/AgentStatusRowView.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (27)
 * attribution: sole-consumer-new 27
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ElapsedClock } from "../workflow/WorkflowProgress.js";
import { formatBarElapsed, formatNumber } from "../../utils/format.js";
import { useIsScreenReaderEnabled, Decorative } from "../../ink/components/ErrorBoundary.js";
import {
  lUt,
  LARGE_WORKFLOW_STOP_HINT,
  LARGE_WORKFLOW_LABEL,
  LARGE_WORKFLOW_ICON,
} from "../Spinner/workflowStatus.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { kz, oqe, ule, ple } from "../Spinner/SpinnerAnimationRow.js";
import { clamp } from "../../ink/screen.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PAUSE_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { Em } from "../CoordinatorAgentStatus.js";
import { isTerminalTaskStatus } from "../../Task.js";

/**
 * 协调者代理状态行（悬停高亮、防误点）。
 */
//@ chunk-18hwfzwa.js:435268-436126 sole-consumer-new
function AgentStatusRow(h) {
  let rt = w(15),
    {
      row: row,
      isWarned: isWarned,
      prefixWidth: prefixWidth,
      labelWidth: labelWidth,
      rowWidth: rowWidth,
      isSelected: isSelected,
      onClick: onClick,
    } = h,
    [isHovered, We] = y(!1),
    isStrayClick = useStrayClickGuard(),
    isHighlighted = isSelected || isHovered,
    handleClick;
  if (rt[0] !== onClick || rt[1] !== isStrayClick)
    ((handleClick = (At) => {
      if (isStrayClick(At)) {
        return;
      }
      onClick();
    }),
      (rt[0] = onClick),
      (rt[1] = isStrayClick),
      (rt[2] = handleClick));
  else handleClick = rt[2];
  let It, Ot;
  if (rt[3] === MEMO_CACHE_SENTINEL) ((It = () => We(!0)), (Ot = () => We(!1)), (rt[3] = It), (rt[4] = Ot));
  else ((It = rt[3]), (Ot = rt[4]));
  let Et;
  if (
    rt[5] !== isHighlighted ||
    rt[6] !== isWarned ||
    rt[7] !== labelWidth ||
    rt[8] !== prefixWidth ||
    rt[9] !== row ||
    rt[10] !== rowWidth
  )
    ((Et =
      row.pausedStatuses !== void 0
        ? e(AgentStatusRowView, {
            row: row,
            elapsed: void 0,
            isWarned: isWarned,
            prefixWidth: prefixWidth,
            labelWidth: labelWidth,
            rowWidth: rowWidth,
            highlighted: isHighlighted,
          })
        : e(AgentStatusRowWithClock, {
            row: row,
            isWarned: isWarned,
            prefixWidth: prefixWidth,
            labelWidth: labelWidth,
            rowWidth: rowWidth,
            highlighted: isHighlighted,
          })),
      (rt[5] = isHighlighted),
      (rt[6] = isWarned),
      (rt[7] = labelWidth),
      (rt[8] = prefixWidth),
      (rt[9] = row),
      (rt[10] = rowWidth),
      (rt[11] = Et));
  else Et = rt[11];
  let Dt;
  if (rt[12] !== handleClick || rt[13] !== Et)
    ((Dt = e(Box, { onClick: handleClick, onMouseEnter: It, onMouseLeave: Ot, children: Et })),
      (rt[12] = handleClick),
      (rt[13] = Et),
      (rt[14] = Dt));
  else Dt = rt[14];
  return Dt;
}
//@ chunk-18hwfzwa.js:436126-436321 sole-consumer-new
function AgentStatusRowWithClock(h) {
  let D = w(5),
    x = ElapsedClock(h.row.clock),
    L;
  if (D[0] !== x) ((L = formatBarElapsed(x)), (D[0] = x), (D[1] = L));
  else L = D[1];
  let ee;
  if (D[2] !== h || D[3] !== L)
    ((ee = e(AgentStatusRowView, { ...h, elapsed: L })), (D[2] = h), (D[3] = L), (D[4] = ee));
  else ee = D[4];
  return ee;
}
/**
 * 代理状态行视图：进度条、百分比、耗时与标签（屏幕阅读器有简化形式）。
 */
//@ chunk-18hwfzwa.js:436321-439174 sole-consumer-new
function AgentStatusRowView(h) {
  let ze = w(62),
    {
      row: row,
      elapsed: elapsed,
      isWarned: isWarned,
      prefixWidth: prefixWidth,
      labelWidth: labelWidth,
      rowWidth: rowWidth,
      highlighted: highlighted,
    } = h,
    He = useIsScreenReaderEnabled(),
    We = !highlighted,
    Xe;
  if (ze[0] !== row) ((Xe = Rz(row, 100)), (ze[0] = row), (ze[1] = Xe));
  else Xe = ze[1];
  let rt = `${Xe}%`,
    kt,
    At,
    It,
    Ot,
    Et,
    Dt,
    Lt,
    oo,
    Xt,
    io,
    so;
  if (
    ze[2] !== We ||
    ze[3] !== elapsed ||
    ze[4] !== highlighted ||
    ze[5] !== He ||
    ze[6] !== isWarned ||
    ze[7] !== labelWidth ||
    ze[8] !== rt ||
    ze[9] !== prefixWidth ||
    ze[10] !== row ||
    ze[11] !== rowWidth
  ) {
    let po =
      row.pausedStatuses !== void 0
        ? [...row.pausedStatuses.map(lUt), { barWidth: 0, segments: [] }]
        : progressLayoutCandidates(row, elapsed, isWarned, He ? [bunStringWidth(rt)] : [20, 12, 8]);
    let ao = rowWidth - prefixWidth - labelWidth - kz;
    let bo = po.find((co) => layoutWidth(co) <= ao) ?? po.at(-1);
    const Ao = labelWidth + ao - layoutWidth(bo);
    const min = Math.min(oqe, labelWidth);
    let Ro;
    if (ze[23] !== labelWidth || ze[24] !== Ao || ze[25] !== min)
      ((Ro = clamp(Ao, min, labelWidth)),
        (ze[23] = labelWidth),
        (ze[24] = Ao),
        (ze[25] = min),
        (ze[26] = Ro));
    else Ro = ze[26];
    let Ho = Ro;
    const Io = highlighted ? `${re.pointer} ` : "  ";
    let Wo;
    if (ze[27] !== We || ze[28] !== Io)
      ((Wo = e(Text, { dimColor: We, children: Io })), (ze[27] = We), (ze[28] = Io), (ze[29] = Wo));
    else Wo = ze[29];
    const mn = !row.bulletColor && We;
    const Cn = row.pausedStatuses !== void 0 ? PAUSE_GLYPH : re.circle;
    let No;
    if (ze[30] !== row.bulletColor || ze[31] !== mn || ze[32] !== Cn)
      ((No = r(Text, { color: row.bulletColor, dimColor: mn, children: [Cn, " "] })),
        (ze[30] = row.bulletColor),
        (ze[31] = mn),
        (ze[32] = Cn),
        (ze[33] = No));
    else No = ze[33];
    if (ze[34] !== prefixWidth || ze[35] !== Wo || ze[36] !== No)
      ((so = r(Box, { width: prefixWidth, flexShrink: 0, children: [Wo, No] })),
        (ze[34] = prefixWidth),
        (ze[35] = Wo),
        (ze[36] = No),
        (ze[37] = so));
    else so = ze[37];
    let vo;
    if (ze[38] !== We || ze[39] !== row.name)
      ((vo = e(Text, { dimColor: We, wrap: "truncate", children: row.name })),
        (ze[38] = We),
        (ze[39] = row.name),
        (ze[40] = vo));
    else vo = ze[40];
    if (ze[41] !== Ho || ze[42] !== vo)
      ((It = e(Box, { width: Ho, flexShrink: 0, children: vo })),
        (ze[41] = Ho),
        (ze[42] = vo),
        (ze[43] = It));
    else It = ze[43];
    At = Box;
    oo = 1;
    Xt = 0;
    io = kz;
    kt = Text;
    Ot = "truncate-end";
    Et =
      bo.barWidth > 0 &&
      e(Decorative, {
        fallback: e(Text, { dimColor: We, children: rt }),
        children: e(ProgressBar, {
          ratio: Rz(row, bo.barWidth) / bo.barWidth,
          width: bo.barWidth,
          variant: "pill",
        }),
      });
    Dt = bo.barWidth > 0 && bo.segments.length > 0 && ule;
    let Yo;
    if (ze[44] !== We)
      ((Yo = (kn, Fn) =>
        r(
          Text,
          {
            color: kn.isWarning ? "warning" : void 0,
            dimColor: kn.isWarning ? !1 : We,
            children: [Fn > 0 && e(Text, { dimColor: We, children: ple }), kn.text],
          },
          Fn,
        )),
        (ze[44] = We),
        (ze[45] = Yo));
    else Yo = ze[45];
    Lt = bo.segments.map(Yo);
    ((ze[2] = We),
      (ze[3] = elapsed),
      (ze[4] = highlighted),
      (ze[5] = He),
      (ze[6] = isWarned),
      (ze[7] = labelWidth),
      (ze[8] = rt),
      (ze[9] = prefixWidth),
      (ze[10] = row),
      (ze[11] = rowWidth),
      (ze[12] = kt),
      (ze[13] = At),
      (ze[14] = It),
      (ze[15] = Ot),
      (ze[16] = Et),
      (ze[17] = Dt),
      (ze[18] = Lt),
      (ze[19] = oo),
      (ze[20] = Xt),
      (ze[21] = io),
      (ze[22] = so));
  } else
    ((kt = ze[12]),
      (At = ze[13]),
      (It = ze[14]),
      (Ot = ze[15]),
      (Et = ze[16]),
      (Dt = ze[17]),
      (Lt = ze[18]),
      (oo = ze[19]),
      (Xt = ze[20]),
      (io = ze[21]),
      (so = ze[22]));
  let Ao;
  if (ze[46] !== kt || ze[47] !== Ot || ze[48] !== Et || ze[49] !== Dt || ze[50] !== Lt)
    ((Ao = r(kt, { wrap: Ot, children: [Et, Dt, Lt] })),
      (ze[46] = kt),
      (ze[47] = Ot),
      (ze[48] = Et),
      (ze[49] = Dt),
      (ze[50] = Lt),
      (ze[51] = Ao));
  else Ao = ze[51];
  let Bo;
  if (ze[52] !== At || ze[53] !== Ao || ze[54] !== oo || ze[55] !== Xt || ze[56] !== io)
    ((Bo = e(At, { flexGrow: oo, width: Xt, paddingLeft: io, children: Ao })),
      (ze[52] = At),
      (ze[53] = Ao),
      (ze[54] = oo),
      (ze[55] = Xt),
      (ze[56] = io),
      (ze[57] = Bo));
  else Bo = ze[57];
  let Ro;
  if (ze[58] !== It || ze[59] !== Bo || ze[60] !== so)
    ((Ro = r(Fragment, { children: [so, It, Bo] })),
      (ze[58] = It),
      (ze[59] = Bo),
      (ze[60] = so),
      (ze[61] = Ro));
  else Ro = ze[61];
  return Ro;
}
//@ chunk-18hwfzwa.js:439174-439257 sole-consumer-new
function Rz(h, x) {
  return h.totalAgents > 0 ? Math.floor((h.doneAgents * x) / h.totalAgents) : 0;
}
//@ chunk-18hwfzwa.js:439257-439372 sole-consumer-new
function layoutWidth(h) {
  let joined = h.segments.map((segment) => segment.text).join(ple);
  return h.barWidth + bunStringWidth(h.barWidth > 0 && joined !== "" ? ule : "") + bunStringWidth(joined);
}
/**
 * 按宽度从宽到窄的进度布局候选（代理数、耗时、token、警告）。
 */
//@ chunk-18hwfzwa.js:439372-439778 sole-consumer-new
function progressLayoutCandidates(h, x, D, L) {
  let ee = h.totalAgents > 0 ? `${h.doneAgents}/${h.totalAgents}` : void 0,
    ke = h.totalTokens > 0 ? `${re.arrowDown} ${formatNumber(h.totalTokens)}` : void 0,
    Re = ke && `${ke} tokens`,
    Be = D ? LARGE_WORKFLOW_STOP_HINT : void 0,
    He = D ? LARGE_WORKFLOW_LABEL : void 0,
    We = D ? LARGE_WORKFLOW_ICON : void 0,
    ze = L[0],
    Xe = L.at(-1) ?? ze;
  return [
    progressLayout(ze, [ee, x, Re], Be),
    progressLayout(ze, [ee, x, Re], He),
    progressLayout(ze, [x, Re], He),
    progressLayout(ze, [x, Re], We),
    progressLayout(ze, [x, ke], We),
    ...L.map((rt) => progressLayout(rt, [ke], We)),
    progressLayout(Xe, [], We),
    progressLayout(Xe, [], void 0),
  ];
}
//@ chunk-18hwfzwa.js:439778-439942 sole-consumer-new
function progressLayout(h, x, D) {
  let L = [];
  for (let ee of x) if (ee !== void 0) L.push({ text: ee, isWarning: !1 });
  if (D !== void 0) L.push({ text: D, isWarning: !0 });
  return { barWidth: h, segments: L };
}
//@ chunk-18hwfzwa.js:439942-439975 sole-consumer-new
function djt(pl) {
  return pl.tasks;
}
//@ chunk-18hwfzwa.js:439975-440012 sole-consumer-new
function cjt(Gl) {
  return Gl.ultracode;
}
//@ chunk-18hwfzwa.js:440012-440055 sole-consumer-new
function mjt(gd) {
  return gd.taskDecorations;
}
//@ chunk-18hwfzwa.js:440055-440101 sole-consumer-new = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:440101-440146 sole-consumer-new
function fjt(bd) {
  return bd.agentNameRegistry;
}
//@ chunk-18hwfzwa.js:440146-440191 sole-consumer-new
function gjt(Od) {
  return Od.slackTagConnected;
}
//@ chunk-18hwfzwa.js:440191-440239 sole-consumer-new
function hjt(pc) {
  return pc.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:440239-440292 sole-consumer-new = getTaskOutputDir (0.766)
function getTaskOutputDir(Kd) {
  return Kd.footerSelection === "tasks";
}
//@ chunk-18hwfzwa.js:440292-440349 sole-consumer-new
function Sjt(ec) {
  return ec.footerSelection === "workflows";
}
//@ chunk-18hwfzwa.js:440349-440396 sole-consumer-new
function bjt(qu) {
  return qu.workflowFooterIndex;
}
//@ chunk-18hwfzwa.js:440396-440449 sole-consumer-new
function wjt(Ku) {
  return Ku.idleTeammatesExpanded ?? !1;
}
//@ chunk-18hwfzwa.js:440449-440522 sole-consumer-new
function kjt(iu) {
  return Em(iu) && (!isTerminalTaskStatus(iu.status) || iu.evictAfter !== void 0);
}
//@ chunk-18hwfzwa.js:440522-440552 sole-consumer-new
function Cjt() {
  return new Set();
}
//@ chunk-18hwfzwa.js:440552-440585 sole-consumer-new
function _jt() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:440585-440629 sole-consumer-new
function Tjt(Iu) {
  return Iu > 0 ? ` (+${Iu})` : "";
}
//@ chunk-18hwfzwa.js:440629-440678 sole-consumer-new
function Ajt(h) {
  let { row: row } = h;
  return bunStringWidth(row.name);
}
//@ chunk-18hwfzwa.js:440678-440694 sole-consumer-new
function Mjt() {}
//@ chunk-18hwfzwa.js:440694-440727 sole-consumer-new
function Ijt(Wo) {
  return Wo.tasks;
}
//@ chunk-18hwfzwa.js:440727-440770 sole-consumer-new
function Ejt(mn) {
  return mn.taskDecorations;
}
//@ chunk-18hwfzwa.js:440770-440816 sole-consumer-new = _temp2 (1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}

export {
  djt,
  cjt,
  mjt,
  selectViewingAgentTaskId,
  fjt,
  gjt,
  hjt,
  getTaskOutputDir,
  Sjt,
  bjt,
  wjt,
  kjt,
  Cjt,
  _jt,
  Tjt,
  Ajt,
  Mjt,
  AgentStatusRow,
  Ijt,
  Ejt,
  selectViewingAgentTaskId_2,
};
