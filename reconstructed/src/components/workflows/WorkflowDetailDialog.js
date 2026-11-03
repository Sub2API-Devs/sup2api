/**
 * components/workflows/WorkflowDetailDialog.tsx
 *
 * 2.1.316 新增（门面模块 WorkflowDetailDialog）。工作流详情对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (45)
 * attribution: placement 45
 */
import {
  BLACK_CIRCLE,
  DOTTED_CIRCLE,
  T8,
  RETURN_SYMBOL,
  UP_ARROW,
  DOWN_ARROW,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Le, kl, Sl, WorkflowTaskList } from "./WorkflowTaskList.js";
import { pae } from "../../tools/REPLTool/constants.js";
import {
  truncateToWidth,
  splitByDisplayWidth,
  formatTokens,
  formatDuration,
  formatBarElapsed,
} from "../../utils/format.js";
import { xn, bn, readWorkflowAgentTranscript } from "../../tasks/LocalWorkflowTask/workflowTranscript.js";
import { RESPONSE_CONNECTOR } from "../../constants/figures.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  modelTransitionText,
  useWorkflowProgressRows,
  ElapsedClock,
  workflowPhaseRows,
  sumPhaseCounts,
  workflowDescription,
  workflowStatusLine,
  WorkflowHeader,
  WorkflowPhaseRow,
} from "../workflow/WorkflowProgress.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { _S, Gxi, Kk } from "../../../vendor/chart.js/dist/chart.js";
import { y, Se, R, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { _T, $L } from "../../ink/components/ClockContext.js";
import { w7n, Ehn } from "../../utils/usageLimitText.js";
import { renderJsonOutcomeLines } from "./outcomeRender.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { buildResumePrompt } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { WorkflowSaveDialog } from "./WorkflowSaveDialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";
import { HintText } from "../design-system/HintText.js";

//@ chunk-axsvbsqv.js:14537-14662 placement
function getCallDisplayState(o, i) {
  if (o.result === null) return i && o.fromLastResponse ? "running" : "unanswered";
  return o.result.isError ? "error" : "ok";
}
/**
 * 渲染工作流内单个工具调用的标题行：状态符号（运行中、无结果、成功、错误）、工具名与按宽度截断的摘要。
 */
//@ chunk-axsvbsqv.js:14662-15241 placement
function renderWorkflowCallHeader({ call: o, state: state, width: width, indent: indent }) {
  let marker,
    suffix = null;
  switch (state) {
    case "running":
      ((marker = { text: BLACK_CIRCLE, dimColor: !0 }), (suffix = { text: " \xB7 running", dimColor: !0 }));
      break;
    case "unanswered":
      ((marker = { text: DOTTED_CIRCLE, dimColor: !0 }),
        (suffix = { text: " \xB7 no result", dimColor: !0 }));
      break;
    case "ok":
      marker = { text: BLACK_CIRCLE, color: "success" };
      break;
    case "error":
      ((marker = { text: BLACK_CIRCLE, color: "error" }), (suffix = { text: " \xB7 error", color: "error" }));
      break;
  }
  let max = Math.max(
      1,
      width -
        bunStringWidth(indent) -
        bunStringWidth(marker.text) -
        1 -
        (suffix ? bunStringWidth(suffix.text) : 0),
    ),
    toolName = Le(pae(o.name)),
    remaining = max - bunStringWidth(toolName),
    label =
      remaining < 0
        ? truncateToWidth(toolName, max)
        : o.summary && remaining > 3
          ? `${toolName}(${truncateToWidth(Le(o.summary), remaining - 2)})`
          : toolName;
  return [
    { text: indent },
    marker,
    { text: ` ${label}`, dimColor: state !== "running" },
    ...(suffix ? [suffix] : []),
  ];
}
/**
 * 渲染工具调用的完整行：标题、输入字段，以及结果（空、内容或"未记录"）。
 */
//@ chunk-axsvbsqv.js:15241-15808 placement
function renderWorkflowCallLines({ call: o, state: state, width: width, indent: indent }) {
  let lines = [renderWorkflowCallHeader({ call: o, state: state, width: width, indent: indent })];
  if (xn.includes(o.name)) return lines;
  let fieldIndent = `${indent}  `;
  renderCallFields(lines, o.fields, { indent: fieldIndent, width: width, maxLines: kl });
  let resultPrefix = `${fieldIndent}${RESPONSE_CONNECTOR}  `;
  if (o.result && o.result.head === "")
    lines.push([
      {
        text: truncateToWidth(`${resultPrefix}(empty)`, width),
        color: o.result.isError ? "error" : void 0,
        dimColor: !o.result.isError,
      },
    ]);
  else if (o.result)
    renderWrappedText(lines, o.result, {
      firstPrefix: resultPrefix,
      restPrefix: " ".repeat(bunStringWidth(resultPrefix)),
      width: width,
      maxLines: Sl,
      color: o.result.isError ? "error" : void 0,
    });
  else if (state === "unanswered")
    lines.push([{ text: truncateToWidth(`${resultPrefix}(none recorded)`, width), dimColor: !0 }]);
  return lines;
}
/**
 * 按行数预算渲染调用的输入字段（键过宽时单独成行），最后汇总隐藏的行与字符数。
 */
//@ chunk-axsvbsqv.js:15808-16294 placement
function renderCallFields(o, i, { indent: indent, width: width, maxLines: maxLines }) {
  let p = maxLines,
    h = 0,
    b = 0,
    x = `${indent}  `;
  for (let A of i) {
    if (p <= 0) {
      h += A.lineCount;
      continue;
    }
    let v = Le(A.key),
      T = `${indent}${v}: `;
    if (
      !(
        A.lineCount === 1 &&
        A.truncatedChars === 0 &&
        bunStringWidth(T) + bunStringWidth(Le(A.head)) <= width
      ) &&
      bunStringWidth(T) > Math.floor(width / 2)
    ) {
      if (
        (o.push([{ text: truncateToWidth(`${indent}${v}:`, width), dimColor: !0 }]), p--, (T = x), p <= 0)
      ) {
        h += A.lineCount;
        continue;
      }
    }
    let I = renderWrappedText(o, A, {
      firstPrefix: T,
      restPrefix: x,
      width: width,
      maxLines: p,
      color: void 0,
      reportHidden: !1,
    });
    ((p -= I.lines), (h += I.hiddenLines), (b += I.hiddenChars));
  }
  pushHiddenSummary(o, indent, width, h, b);
}
/**
 * 把文本按宽度与行数上限折行输出（首行与续行前缀不同），返回渲染行数与隐藏的行/字符数，可选追加隐藏提示。
 */
//@ chunk-axsvbsqv.js:16294-16901 placement
function renderWrappedText(
  o,
  i,
  {
    firstPrefix: firstPrefix,
    restPrefix: restPrefix,
    width: width,
    maxLines: maxLines,
    color: color,
    reportHidden: reportHidden = !0,
  },
) {
  let parts = i.head.split(`
`),
    rendered = 0,
    max = Math.max(0, i.lineCount - parts.length),
    complete = !0,
    max_2 = Math.max(1, width - bunStringWidth(restPrefix));
  t: for (let [N, E] of parts.entries()) {
    let V = Le(E),
      J = truncateToLength(V, (maxLines - rendered + 1) * width),
      z = rendered === 0 ? Math.max(1, width - bunStringWidth(firstPrefix)) : max_2,
      L = splitByDisplayWidth(J, z)[0] ?? "",
      sliced = J.slice(L.length),
      H = sliced ? [L, ...splitByDisplayWidth(sliced, max_2)] : [L];
    for (let [Y, pt] of H.entries()) {
      if (rendered >= maxLines) {
        ((max += parts.length - N), (complete = !1));
        break t;
      }
      (o.push([
        {
          text: (rendered === 0 && Y === 0 ? firstPrefix : restPrefix) + pt,
          color: color,
          dimColor: color === void 0,
        },
      ]),
        rendered++);
    }
    if (J.length < V.length) {
      ((max += parts.length - N), (complete = !1));
      break;
    }
  }
  let I = complete ? i.truncatedChars : 0;
  if (reportHidden) pushHiddenSummary(o, restPrefix, width, max, I);
  return { lines: rendered, hiddenLines: max, hiddenChars: I };
}
//@ chunk-axsvbsqv.js:16901-17047 placement
function pushHiddenSummary(o, i, l, u, d) {
  let p = u > 0 ? `\u2026 ${u} more ${plural(u, "line")}` : d > 0 ? `\u2026 +${d} chars` : "";
  if (p) o.push([{ text: truncateToWidth(`${i}${p}`, l), dimColor: !0 }]);
}
//@ chunk-axsvbsqv.js:17047-17146 placement
function hc(A, v) {
  return e(Text, { color: A.color, dimColor: A.dimColor, bold: A.bold ?? !1, children: A.text }, v);
}
//@ chunk-axsvbsqv.js:17146-17172 placement
function bc() {
  return null;
}
//@ chunk-axsvbsqv.js:17172-17333 placement
function computeScrollWindow(o, i, l) {
  if (i <= l) return { from: 0, to: i, above: 0, below: 0 };
  let floored = Math.floor(l / 2),
    max = Math.max(0, Math.min(o - floored, i - l)),
    p = max + l;
  return { from: max, to: p, above: max, below: i - p };
}
//@ chunk-axsvbsqv.js:17333-17395 placement
function It(o) {
  return o.state === "start" || o.state === "progress";
}
//@ chunk-axsvbsqv.js:17395-17628 placement
function getAgentDisplayState(o, i) {
  if (o.state === "done") return "done";
  if (o.state === "error") {
    if (o.skipped) return "skipped";
    if (o.blocked) return "blocked";
    return "failed";
  }
  if (!i) return "interrupted";
  return o.queuedAt != null && o.startedAt == null ? "queued" : "running";
}
/**
 * 按代理状态给出显示符号与颜色（完成、失败、跳过、阻塞、排队/中断、运行中）。
 */
//@ chunk-axsvbsqv.js:17628-17971 placement
function getAgentStateGlyph(o) {
  switch (o) {
    case "done":
      return { glyph: re.tick, color: "success" };
    case "failed":
      return { glyph: re.cross, color: "error" };
    case "skipped":
      return { glyph: re.cross, color: "subtle" };
    case "blocked":
      return { glyph: re.cross, color: "permission" };
    case "queued":
    case "interrupted":
      return { glyph: DOTTED_CIRCLE, color: "subtle" };
    case "running":
      return { glyph: BLACK_CIRCLE, color: "subtle" };
  }
}
//@ chunk-axsvbsqv.js:17971-18055 placement
var Jt = ["all", "running", "queued", "failed", "done", "skipped", "blocked", "interrupted"];
//@ chunk-axsvbsqv.js:18055-18124 placement
function He(o, i) {
  return i ? `showing ${o} ${i}` : `${o} ${plural(o, "agent")}`;
}
//@ chunk-axsvbsqv.js:18124-18231 placement
function describeEmptyAgentList(o, i) {
  if (o.status === "not-started") return "Not started yet";
  return i ? `No ${i} agents` : "No agents";
}
//@ chunk-axsvbsqv.js:18231-18283 placement
function Dt(o, i, l) {
  return Math.max(i, Math.min(l, o));
}
/**
 * 汇总代理行的统计：模型（含回退）、隔离方式、token 数、空闲时长与状态标签，以及耗时。
 */
//@ chunk-axsvbsqv.js:18283-18914 placement
function getAgentRowStats(agent, now) {
  let status = getAgentDisplayState(agent, now),
    modelLabel = modelTransitionText(agent.fallbackModel ?? agent.model, void 0),
    stats = [];
  if (agent.isolation != null) stats.push(agent.isolation);
  if (agent.tokens != null) stats.push(`${formatTokens(agent.tokens)} tok`);
  if (status === "running" && agent.lastProgressAt != null) {
    let floored = Math.floor((Date.now() - agent.lastProgressAt) / 1000);
    if (floored >= 30) stats.push(`idle ${formatDuration(floored * 1000)}`);
  }
  if (status === "queued") stats.push("queued");
  if (status === "interrupted") stats.push("stopped");
  if (status === "skipped") stats.push("skipped");
  if (status === "blocked") stats.push("blocked");
  if (status === "failed") stats.push("failed");
  let elapsedMs =
    agent.durationMs ??
    (status === "running" && agent.startedAt != null ? Math.max(0, Date.now() - agent.startedAt) : void 0);
  return {
    model: modelLabel,
    stats: stats.join(" \xB7 "),
    time: elapsedMs != null ? formatBarElapsed(elapsedMs) : "",
  };
}
//@ chunk-axsvbsqv.js:18914-18923 placement
var Ii = 6;
/**
 * 渲染代理行右侧：模型 · 统计信息，加右对齐的耗时，按宽度依次截断统计与模型。
 */
//@ chunk-axsvbsqv.js:18923-19429 placement
function renderAgentRowTail(agent, width, isSelected, now) {
  if (width <= 0) return [];
  let { model: model, stats: stats, time: time } = getAgentRowStats(agent, now),
    color = isSelected ? "permission" : void 0,
    dim = !isSelected,
    clip = (J, z) => (z <= 0 ? "" : truncateToWidth(J, z)),
    timeText = time ? clip(time, width).padStart(Math.min(Ii, width)) : "",
    available = timeText ? width - bunStringWidth(timeText) - 1 : width,
    separatorWidth = (J, z) => (J && z ? 3 : 0),
    modelText = model,
    statsText = stats;
  if (
    bunStringWidth(modelText) + separatorWidth(modelText, statsText) + bunStringWidth(statsText) >
    available
  ) {
    if (
      ((statsText = clip(
        statsText,
        available - bunStringWidth(modelText) - separatorWidth(modelText, statsText),
      )),
      bunStringWidth(modelText) + separatorWidth(modelText, statsText) + bunStringWidth(statsText) >
        available)
    )
      modelText = clip(
        modelText,
        available - bunStringWidth(statsText) - separatorWidth(modelText, statsText),
      );
  }
  let separator = modelText && statsText ? " \xB7 " : "",
    max = Math.max(
      0,
      width -
        bunStringWidth(modelText) -
        bunStringWidth(separator) -
        bunStringWidth(statsText) -
        bunStringWidth(timeText),
    );
  return [
    { text: modelText, color: color, dimColor: dim },
    { text: separator, color: color, dimColor: dim },
    { text: statsText, color: color, dimColor: dim },
    { text: " ".repeat(max) },
    { text: timeText, color: color, dimColor: dim },
  ];
}
//@ chunk-axsvbsqv.js:19429-19445 placement
var fa = 40,
  ma = 30;
//@ chunk-axsvbsqv.js:19445-19622 placement
function getAgentLabelWidth(o, i) {
  let min = Math.min(fa, Math.max(22, i - ma), Math.max(4, Math.min(i, Math.max(12, i - Ii - 1)))),
    reduced = o.reduce((d, p) => Math.max(d, bunStringWidth(p.label)), 0);
  return Math.min(Math.max(12, reduced), min);
}
//@ chunk-axsvbsqv.js:19622-19862 placement
function fitSegments(o, i) {
  let l = 0;
  for (let u = 0; u < o.length; u++) {
    let d = o[u],
      p = bunStringWidth(d.text);
    if (l + p > i) {
      let h = i - l,
        b = h > 0 ? truncateToWidth(d.text, h) : "",
        sliced = o.slice(0, u);
      if (b) sliced.push({ ...d, text: b });
      return { segs: sliced, pad: Math.max(0, h - bunStringWidth(b)) };
    }
    l += p;
  }
  return { segs: o, pad: Math.max(0, i - l) };
}
//@ chunk-axsvbsqv.js:19862-20129 placement
function SegmentLine(o) {
  let $ = w(7),
    { segs: segs, width: width } = o,
    d,
    p;
  if ($[0] !== segs || $[1] !== width) {
    let { segs: segs_2, pad: pad } = fitSegments(segs, width);
    d = segs_2.map(hc);
    p = " ".repeat(pad);
    (($[0] = segs), ($[1] = width), ($[2] = d), ($[3] = p));
  } else ((d = $[2]), (p = $[3]));
  let x;
  if ($[4] !== d || $[5] !== p) ((x = r(Fragment, { children: [d, p] })), ($[4] = d), ($[5] = p), ($[6] = x));
  else x = $[6];
  return x;
}
/**
 * 渲染带竖线边框的一行分段文本（超宽截断）。
 */
//@ chunk-axsvbsqv.js:20129-20530 placement
function BoxedSegmentLine(o) {
  let $ = w(7),
    { segs: segs, contentWidth: contentWidth } = o,
    d;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((d = r(Text, { color: "text", children: [" ", _S.pipe, " "] })), ($[0] = d));
  else d = $[0];
  let p;
  if ($[1] !== contentWidth || $[2] !== segs)
    ((p = e(SegmentLine, { segs: segs, width: contentWidth })),
      ($[1] = contentWidth),
      ($[2] = segs),
      ($[3] = p));
  else p = $[3];
  let h;
  if ($[4] === MEMO_CACHE_SENTINEL) ((h = r(Text, { color: "text", children: [" ", _S.pipe] })), ($[4] = h));
  else h = $[4];
  let b;
  if ($[5] !== p) ((b = r(Text, { wrap: "truncate-end", children: [d, p, h] })), ($[5] = p), ($[6] = b));
  else b = $[6];
  return b;
}
//@ chunk-axsvbsqv.js:20530-20654 placement
function formatScrollRange(o, i) {
  let l = o.from > 0 ? re.arrowUp : " ",
    u = o.to < i ? re.arrowDown : " ";
  return `${l} ${o.from + 1}${Gxi}${o.to} of ${i} ${u}`;
}
//@ chunk-axsvbsqv.js:20654-20887 placement
function ScrollRangeIndicator(o) {
  let $ = w(5),
    { win: win, total: total } = o,
    d;
  if ($[0] !== total || $[1] !== win)
    ((d = formatScrollRange(win, total)), ($[0] = total), ($[1] = win), ($[2] = d));
  else d = $[2];
  const p = `  ${d}`;
  let h;
  if ($[3] !== p)
    ((h = e(Text, { dimColor: !0, wrap: "truncate-end", children: p })), ($[3] = p), ($[4] = h));
  else h = $[4];
  return h;
}
/**
 * 工作流详情中的代理列表栏。
 */
//@ chunk-axsvbsqv.js:20887-23906 placement
function WorkflowAgentsPane(o) {
  let $ = w(53),
    {
      phase: phase,
      selectedAgent: selectedAgent,
      level: level,
      contentWidth: contentWidth,
      viewport: viewport,
      tight: tight,
      workflowActive: workflowActive,
      filterLabel: filterLabel,
    } = o,
    agents = phase.agents,
    T;
  if ($[0] !== contentWidth) ((T = T8.repeat(contentWidth + 2)), ($[0] = contentWidth), ($[1] = T));
  else T = $[1];
  let M = T,
    I,
    N;
  if (
    $[2] !== agents ||
    $[3] !== M ||
    $[4] !== contentWidth ||
    $[5] !== filterLabel ||
    $[6] !== level ||
    $[7] !== phase ||
    $[8] !== selectedAgent ||
    $[9] !== tight ||
    $[10] !== viewport ||
    $[11] !== workflowActive
  ) {
    let E = computeScrollWindow(selectedAgent, agents.length, viewport);
    N = [];
    let V = He(agents.length, filterLabel);
    if (tight) {
      let J = truncateToWidth(` \xB7 ${V}`, Math.max(1, contentWidth - 1));
      let max = Math.max(1, contentWidth - bunStringWidth(J));
      let L;
      if ($[14] !== phase.title || $[15] !== max)
        ((L = truncateToWidth(phase.title, max)), ($[14] = phase.title), ($[15] = max), ($[16] = L));
      else L = $[16];
      let B;
      if ($[17] !== L) ((B = { text: L, color: "permission", bold: !0 }), ($[17] = L), ($[18] = B));
      else B = $[18];
      let H;
      if ($[19] !== J) ((H = { text: J, dimColor: !0 }), ($[19] = J), ($[20] = H));
      else H = $[20];
      let Y;
      if ($[21] !== B || $[22] !== H) ((Y = [B, H]), ($[21] = B), ($[22] = H), ($[23] = Y));
      else Y = $[23];
      let pt;
      if ($[24] !== contentWidth || $[25] !== Y)
        ((pt = e(BoxedSegmentLine, { contentWidth: contentWidth, segs: Y }, "title")),
          ($[24] = contentWidth),
          ($[25] = Y),
          ($[26] = pt));
      else pt = $[26];
      N.push(pt);
    } else
      (N.push(
        e(
          BoxedSegmentLine,
          {
            contentWidth: contentWidth,
            segs: [{ text: truncateToWidth(phase.title, contentWidth), color: "permission", bold: !0 }],
          },
          "title",
        ),
      ),
        N.push(
          e(
            BoxedSegmentLine,
            { contentWidth: contentWidth, segs: [{ text: truncateToWidth(V, contentWidth), dimColor: !0 }] },
            "count",
          ),
        ),
        N.push(e(BoxedSegmentLine, { contentWidth: contentWidth, segs: [{ text: "" }] }, "gap")));
    let gt = N.length;
    if (agents.length === 0) {
      let L;
      if ($[27] !== filterLabel || $[28] !== phase)
        ((L = describeEmptyAgentList(phase, filterLabel)),
          ($[27] = filterLabel),
          ($[28] = phase),
          ($[29] = L));
      else L = $[29];
      let B;
      if ($[30] !== L) ((B = [{ text: L, dimColor: !0 }]), ($[30] = L), ($[31] = B));
      else B = $[31];
      let H;
      if ($[32] !== contentWidth || $[33] !== B)
        ((H = e(BoxedSegmentLine, { contentWidth: contentWidth, segs: B }, "empty")),
          ($[32] = contentWidth),
          ($[33] = B),
          ($[34] = H));
      else H = $[34];
      N.push(H);
    } else {
      let wt = getAgentLabelWidth(agents, contentWidth - 5);
      for (let from = E.from; from < E.to; from++) {
        let at = agents[from];
        let ct = level === "agents" && from === selectedAgent;
        let { glyph: glyph, color: color } = getAgentStateGlyph(getAgentDisplayState(at, workflowActive));
        let ot = truncateToWidth(at.label, wt);
        let repeat = " ".repeat(Math.max(0, wt - bunStringWidth(ot)));
        let max = Math.max(0, contentWidth - (wt + 5));
        N.push(
          e(
            BoxedSegmentLine,
            {
              contentWidth: contentWidth,
              segs: [
                { text: ct ? re.pointer : " ", color: "permission" },
                { text: " " },
                { text: glyph, color: color },
                { text: " " },
                { text: `${ot}${repeat}`, color: ct ? "permission" : void 0, dimColor: !ct && It(at) },
                { text: " " },
                ...renderAgentRowTail(at, max, ct, workflowActive),
              ],
            },
            `a-${from}`,
          ),
        );
      }
    }
    let G = N.length - gt;
    for (let dt = G; dt < viewport; dt++)
      N.push(e(BoxedSegmentLine, { contentWidth: contentWidth, segs: [{ text: "" }] }, `pad-${dt}`));
    if (agents.length > viewport) {
      let St = ` ${formatScrollRange(E, agents.length)} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(St));
      let L;
      if ($[35] !== max) ((L = T8.repeat(max)), ($[35] = max), ($[36] = L));
      else L = $[36];
      let B;
      if ($[37] !== L)
        ((B = r(Text, { color: "text", children: [" ", Kk.bottomLeft, L] })), ($[37] = L), ($[38] = B));
      else B = $[38];
      let H;
      if ($[39] !== St) ((H = e(Text, { dimColor: !0, children: St })), ($[39] = St), ($[40] = H));
      else H = $[40];
      let Y;
      if ($[41] === MEMO_CACHE_SENTINEL)
        ((Y = e(Text, { color: "text", children: Kk.bottomRight })), ($[41] = Y));
      else Y = $[41];
      let pt;
      if ($[42] !== B || $[43] !== H)
        ((pt = r(Text, { wrap: "truncate-end", children: [B, H, Y] })),
          ($[42] = B),
          ($[43] = H),
          ($[44] = pt));
      else pt = $[44];
      I = pt;
    } else {
      let L;
      if ($[45] !== M)
        ((L = r(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", Kk.bottomLeft, M, Kk.bottomRight],
        })),
          ($[45] = M),
          ($[46] = L));
      else L = $[46];
      I = L;
    }
    (($[2] = agents),
      ($[3] = M),
      ($[4] = contentWidth),
      ($[5] = filterLabel),
      ($[6] = level),
      ($[7] = phase),
      ($[8] = selectedAgent),
      ($[9] = tight),
      ($[10] = viewport),
      ($[11] = workflowActive),
      ($[12] = I),
      ($[13] = N));
  } else ((I = $[12]), (N = $[13]));
  let L;
  if ($[47] !== M)
    ((L = r(Text, { color: "text", wrap: "truncate-end", children: [" ", Kk.topLeft, M, Kk.topRight] })),
      ($[47] = M),
      ($[48] = L));
  else L = $[48];
  let B;
  if ($[49] !== I || $[50] !== N || $[51] !== L)
    ((B = r(Box, { flexDirection: "column", children: [L, N, I] })),
      ($[49] = I),
      ($[50] = N),
      ($[51] = L),
      ($[52] = B));
  else B = $[52];
  return B;
}
/**
 * 渲染带竖线边框的两栏行，左右各自按宽度渲染分段文本。
 */
//@ chunk-axsvbsqv.js:23906-24523 placement
function TwoColumnRow(o) {
  let $ = w(12),
    { left: left, right: right, leftWidth: leftWidth, rightWidth: rightWidth } = o,
    leftEdge;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((leftEdge = r(Text, { color: "text", children: [" ", _S.pipe, " "] })), ($[0] = leftEdge));
  else leftEdge = $[0];
  let leftCell;
  if ($[1] !== left || $[2] !== leftWidth)
    ((leftCell = e(SegmentLine, { segs: left, width: leftWidth })),
      ($[1] = left),
      ($[2] = leftWidth),
      ($[3] = leftCell));
  else leftCell = $[3];
  let separator;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((separator = r(Text, { color: "text", children: [" ", _S.pipe, " "] })), ($[4] = separator));
  else separator = $[4];
  let rightCell;
  if ($[5] !== right || $[6] !== rightWidth)
    ((rightCell = e(SegmentLine, { segs: right, width: rightWidth })),
      ($[5] = right),
      ($[6] = rightWidth),
      ($[7] = rightCell));
  else rightCell = $[7];
  let rightEdge;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((rightEdge = r(Text, { color: "text", children: [" ", _S.pipe] })), ($[8] = rightEdge));
  else rightEdge = $[8];
  let row;
  if ($[9] !== leftCell || $[10] !== rightCell)
    ((row = r(Text, {
      wrap: "truncate-end",
      children: [leftEdge, leftCell, separator, rightCell, rightEdge],
    })),
      ($[9] = leftCell),
      ($[10] = rightCell),
      ($[11] = row));
  else row = $[11];
  return row;
}
/**
 * 渲染分节标题线：可选标签与标签尾注，其余用横线填满宽度。
 */
//@ chunk-axsvbsqv.js:24523-24889 placement
function renderSectionRule(o, i) {
  let l = [],
    u = 0;
  if (i.label) {
    let h = ` ${truncateToWidth(i.label.text, Math.max(1, o - 2))} `;
    ((u += bunStringWidth(h)),
      l.push(e(Text, { color: i.label.color ?? "text", bold: i.label.bold, children: h }, "label")));
  }
  let d = i.tag ? ` ${truncateToWidth(i.tag, Math.max(0, o - u - 2))} ` : "",
    max = Math.max(0, o - u - bunStringWidth(d));
  if ((l.push(e(Text, { color: "text", children: T8.repeat(max) }, "dash")), d))
    l.push(e(Text, { dimColor: !0, children: d }, "tag"));
  return l;
}
//@ chunk-axsvbsqv.js:24889-25789 placement
function SplitPaneBorder(o) {
  let $ = w(20),
    {
      pos: pos,
      leftWidth: leftWidth,
      rightWidth: rightWidth,
      leftTitle: leftTitle,
      rightTitle: rightTitle,
      leftTag: leftTag,
      rightTag: rightTag,
    } = o,
    x = pos === "top" ? Kk.topLeft : Kk.bottomLeft,
    A = pos === "top" ? _S.teeDown : _S.teeUp,
    v = pos === "top" ? Kk.topRight : Kk.bottomRight,
    M;
  if ($[0] !== x) ((M = r(Text, { color: "text", children: [" ", x] })), ($[0] = x), ($[1] = M));
  else M = $[1];
  const I = leftWidth + 2;
  let N;
  if ($[2] !== leftTag || $[3] !== leftTitle || $[4] !== I)
    ((N = renderSectionRule(I, { label: leftTitle ? { text: leftTitle } : void 0, tag: leftTag })),
      ($[2] = leftTag),
      ($[3] = leftTitle),
      ($[4] = I),
      ($[5] = N));
  else N = $[5];
  let E;
  if ($[6] !== A) ((E = e(Text, { color: "text", children: A })), ($[6] = A), ($[7] = E));
  else E = $[7];
  const V = rightWidth + 2;
  let J;
  if ($[8] !== rightTag || $[9] !== rightTitle || $[10] !== V)
    ((J = renderSectionRule(V, { label: rightTitle ? { text: rightTitle } : void 0, tag: rightTag })),
      ($[8] = rightTag),
      ($[9] = rightTitle),
      ($[10] = V),
      ($[11] = J));
  else J = $[11];
  let z;
  if ($[12] !== v) ((z = e(Text, { color: "text", children: v })), ($[12] = v), ($[13] = z));
  else z = $[13];
  let L;
  if ($[14] !== M || $[15] !== N || $[16] !== E || $[17] !== J || $[18] !== z)
    ((L = r(Text, { wrap: "truncate-end", children: [M, N, E, J, z] })),
      ($[14] = M),
      ($[15] = N),
      ($[16] = E),
      ($[17] = J),
      ($[18] = z),
      ($[19] = L));
  else L = $[19];
  return L;
}
/**
 * 渲染工作流阶段行：选中指针、状态符号（完成/失败/序号）、标题与完成进度。
 */
//@ chunk-axsvbsqv.js:25789-26371 placement
function renderPhaseRow(phase, index, selectedIndex, focus, width) {
  let isSelected = index === selectedIndex,
    isDone = phase.status === "done",
    isFailed = phase.status === "failed",
    marker = isDone ? re.tick : isFailed ? re.cross : String(index + 1),
    markerColor = isSelected ? "permission" : isDone ? "success" : isFailed ? "error" : "subtle",
    progress = phase.totalCount > 0 ? `${phase.doneCount}/${phase.totalCount}` : "",
    pointer = focus === "phases" && isSelected ? `${re.pointer} ` : "  ",
    prefixWidth = bunStringWidth(pointer) + bunStringWidth(marker) + 1,
    progressWidth = progress ? 1 + bunStringWidth(progress) : 0,
    title = truncateToWidth(phase.title, Math.max(1, width - prefixWidth - progressWidth)),
    max = Math.max(0, width - prefixWidth - bunStringWidth(title) - progressWidth),
    notStarted = !isSelected && phase.status === "not-started",
    segments = [
      { text: pointer, color: isSelected ? "permission" : void 0 },
      { text: marker, color: markerColor },
      { text: " " },
      { text: title, color: isSelected ? "permission" : void 0, dimColor: notStarted },
      { text: " ".repeat(max) },
    ];
  if (progress) segments.push({ text: " " }, { text: progress, color: isSelected ? "permission" : "subtle" });
  return segments;
}
/**
 * 生成代理列表中一行的分段：选中指针、状态符号、按宽度补齐的名称，以及右侧详情分段。
 */
//@ chunk-axsvbsqv.js:26371-26696 placement
function renderAgentRow(o, i, l, u, d, p, h) {
  let b = u === "agents" && i === l,
    { glyph: glyph, color: color } = getAgentStateGlyph(getAgentDisplayState(o, h)),
    v = truncateToWidth(o.label, p),
    repeat = " ".repeat(Math.max(0, p - bunStringWidth(v))),
    max = Math.max(0, d - (p + 4));
  return [
    { text: b ? re.pointer : " ", color: "permission" },
    { text: glyph, color: color },
    { text: " " },
    { text: `${v}${repeat}`, color: b ? "permission" : void 0, dimColor: !b && It(o) },
    { text: " " },
    ...renderAgentRowTail(o, max, b, h),
  ];
}
//@ chunk-axsvbsqv.js:26696-26933 placement
function renderCompactAgentRow(o, i, l, u, d) {
  let p = i === l,
    { glyph: glyph, color: color } = getAgentStateGlyph(getAgentDisplayState(o, d)),
    x = truncateToWidth(o.label, Math.max(1, u - 4));
  return [
    { text: p ? `${re.pointer} ` : "  ", color: "permission" },
    { text: glyph, color: color },
    { text: " " },
    { text: x, color: p ? "permission" : void 0, dimColor: !p && It(o) },
  ];
}
//@ chunk-axsvbsqv.js:26933-28627 placement
function WorkflowPhasesPane(o) {
  let $ = w(41),
    {
      phases: phases,
      selectedPhase: selectedPhase,
      clampedPhase: clampedPhase,
      clampedAgent: clampedAgent,
      level: level,
      leftWidth: leftWidth,
      rightWidth: rightWidth,
      viewport: viewport,
      workflowActive: workflowActive,
      filterLabel: filterLabel,
    } = o,
    agents = selectedPhase.agents,
    I,
    N,
    E,
    V,
    J,
    z,
    L,
    B,
    H,
    Y;
  if (
    $[0] !== agents ||
    $[1] !== clampedAgent ||
    $[2] !== clampedPhase ||
    $[3] !== filterLabel ||
    $[4] !== leftWidth ||
    $[5] !== level ||
    $[6] !== phases ||
    $[7] !== rightWidth ||
    $[8] !== selectedPhase ||
    $[9] !== viewport ||
    $[10] !== workflowActive
  ) {
    let pt = computeScrollWindow(clampedPhase, phases.length, viewport);
    let gt = computeScrollWindow(clampedAgent, agents.length, viewport);
    let wt = getAgentLabelWidth(agents, rightWidth - 4);
    let ft = [];
    for (let at = 0; at < viewport; at++) {
      let ct = pt.from + at;
      let U = gt.from + at;
      let X = ct < pt.to ? renderPhaseRow(phases[ct], ct, clampedPhase, level, leftWidth) : [];
      let ot;
      if (U < gt.to) ot = renderAgentRow(agents[U], U, clampedAgent, level, rightWidth, wt, workflowActive);
      else if (agents.length === 0 && at === 0)
        ot = [{ text: describeEmptyAgentList(selectedPhase, filterLabel), dimColor: !0 }];
      else ot = [];
      ft.push(e(TwoColumnRow, { left: X, right: ot, leftWidth: leftWidth, rightWidth: rightWidth }, at));
    }
    const title = selectedPhase.title;
    let W;
    if ($[21] !== agents.length || $[22] !== filterLabel)
      ((W = He(agents.length, filterLabel)), ($[21] = agents.length), ($[22] = filterLabel), ($[23] = W));
    else W = $[23];
    let G = `${title} \xB7 ${W}`;
    N = Box;
    B = "column";
    if ($[24] !== leftWidth || $[25] !== G || $[26] !== rightWidth)
      ((H = e(SplitPaneBorder, {
        pos: "top",
        leftWidth: leftWidth,
        rightWidth: rightWidth,
        leftTitle: "Phases",
        rightTitle: G,
      })),
        ($[24] = leftWidth),
        ($[25] = G),
        ($[26] = rightWidth),
        ($[27] = H));
    else H = $[27];
    Y = ft;
    I = SplitPaneBorder;
    E = "bottom";
    V = leftWidth;
    J = rightWidth;
    z = phases.length > viewport ? formatScrollRange(pt, phases.length) : void 0;
    L = agents.length > viewport ? formatScrollRange(gt, agents.length) : void 0;
    (($[0] = agents),
      ($[1] = clampedAgent),
      ($[2] = clampedPhase),
      ($[3] = filterLabel),
      ($[4] = leftWidth),
      ($[5] = level),
      ($[6] = phases),
      ($[7] = rightWidth),
      ($[8] = selectedPhase),
      ($[9] = viewport),
      ($[10] = workflowActive),
      ($[11] = I),
      ($[12] = N),
      ($[13] = E),
      ($[14] = V),
      ($[15] = J),
      ($[16] = z),
      ($[17] = L),
      ($[18] = B),
      ($[19] = H),
      ($[20] = Y));
  } else
    ((I = $[11]),
      (N = $[12]),
      (E = $[13]),
      (V = $[14]),
      (J = $[15]),
      (z = $[16]),
      (L = $[17]),
      (B = $[18]),
      (H = $[19]),
      (Y = $[20]));
  let rt;
  if ($[28] !== I || $[29] !== E || $[30] !== V || $[31] !== J || $[32] !== z || $[33] !== L)
    ((rt = e(I, { pos: E, leftWidth: V, rightWidth: J, leftTag: z, rightTag: L })),
      ($[28] = I),
      ($[29] = E),
      ($[30] = V),
      ($[31] = J),
      ($[32] = z),
      ($[33] = L),
      ($[34] = rt));
  else rt = $[34];
  let W;
  if ($[35] !== N || $[36] !== B || $[37] !== H || $[38] !== Y || $[39] !== rt)
    ((W = r(N, { flexDirection: B, children: [H, Y, rt] })),
      ($[35] = N),
      ($[36] = B),
      ($[37] = H),
      ($[38] = Y),
      ($[39] = rt),
      ($[40] = W));
  else W = $[40];
  return W;
}
//@ chunk-axsvbsqv.js:28627-28662 placement
var Qa = 2,
  Xa = 20,
  Rr = bn,
  fi = 100,
  mi = 250;
//@ chunk-axsvbsqv.js:28662-29466 placement
function useWorkflowAgentTranscript(o, i, l, u) {
  let $ = w(13),
    [d, p] = y(null),
    b = Se(_T)?.setTimeout ?? $L,
    x = R(void 0),
    A = R(0),
    v = R(0),
    T = R(null),
    I,
    N;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((I = () => () => {
      T.current = null;
    }),
      (N = []),
      ($[0] = I),
      ($[1] = N));
  else ((I = $[0]), (N = $[1]));
  P(I, N);
  let E;
  if ($[2] !== i || $[3] !== u || $[4] !== b || $[5] !== o)
    ((E = () => {
      if (!o || !i) {
        return;
      }
      T.current = { runId: o, agentId: i };
      let V = (A.current = A.current + 1);
      let z = () => {
        readWorkflowAgentTranscript(o, i, { promptFramed: u })
          .catch(bc)
          .then((J) => {
            if (V > v.current && T.current?.runId === o && T.current.agentId === i)
              ((v.current = V), (x.current = i), p({ agentId: i, transcript: J }));
          });
      };
      if (x.current === i) {
        return b(z, mi);
      }
      z();
    }),
      ($[2] = i),
      ($[3] = u),
      ($[4] = b),
      ($[5] = o),
      ($[6] = E));
  else E = $[6];
  let L;
  if ($[7] !== i || $[8] !== u || $[9] !== l || $[10] !== b || $[11] !== o)
    ((L = [o, i, l, u, b]), ($[7] = i), ($[8] = u), ($[9] = l), ($[10] = b), ($[11] = o), ($[12] = L));
  else L = $[12];
  if ((P(E, L), !o || !i)) {
    return null;
  }
  if (!d || d.agentId !== i) {
    return "loading";
  }
  return d.transcript;
}
//@ chunk-axsvbsqv.js:29466-29603 placement
function wrapLines(o, i) {
  let l = [];
  for (let u of o.split(`
`)) {
    if (u === "") {
      l.push("");
      continue;
    }
    for (let d of splitByDisplayWidth(u, Math.max(1, i))) l.push(d);
  }
  return l;
}
/**
 * 渲染可折叠段：标题（超过折叠行数时显示总行数与展开提示）、正文（折叠时截取）与剩余行提示，返回隐藏行数。
 */
//@ chunk-axsvbsqv.js:29603-30006 placement
function pushCollapsibleSection({
  lines: lines,
  title: title,
  body: body,
  collapsedLines: collapsedLines,
  expanded: expanded,
  indent: indent,
  width: width,
}) {
  let b = body.length - collapsedLines,
    x = b >= 2 ? b : 0,
    A = [{ text: title, bold: !0, dimColor: !0 }];
  if (x > 0)
    A.push({
      text: truncateToWidth(
        ` \xB7 ${body.length} lines${expanded ? "" : ` \xB7 ${RETURN_SYMBOL} expand`}`,
        width - bunStringWidth(title),
      ),
      dimColor: !0,
    });
  lines.push(A);
  let v = expanded || x === 0 ? body : body.slice(0, collapsedLines);
  for (let T of v) lines.push(T);
  if (!expanded && x > 0)
    lines.push([
      { text: truncateToWidth(`${indent}\u2026 ${x} more ${plural(x, "line")}`, width), dimColor: !0 },
    ]);
  return x;
}
//@ chunk-axsvbsqv.js:30006-30087 placement
function ki(o, i) {
  let l = 0;
  for (let u of i) {
    if (o < u.end) break;
    l += u.growth;
  }
  return o + l;
}
//@ chunk-axsvbsqv.js:30087-30207 placement
function mapRowThroughGrowth(o, i) {
  let l = 0;
  for (let u of i) {
    let d = u.end + l;
    if (o < d) break;
    if (o < d + u.growth) return u.end;
    l += u.growth;
  }
  return o - l;
}
//@ chunk-axsvbsqv.js:30207-30341 placement
var AGENT_STATE_LABELS = {
  queued: "Queued",
  running: "Running",
  done: "Completed",
  failed: "Failed",
  skipped: "Skipped",
  blocked: "Blocked",
  interrupted: "Stopped",
};
/**
 * 工作流详情中的代理卡片。
 */
//@ chunk-axsvbsqv.js:30341-34482 placement
function WorkflowAgentCard({
  agent: agent,
  status: status,
  transcript: transcript,
  expanded: expanded,
  width: width,
  nowMs: nowMs,
}) {
  let h = [],
    b = "  ",
    max = Math.max(8, width - 2),
    A = transcript === "loading" ? null : transcript,
    { glyph: glyph, color: color } = getAgentStateGlyph(status),
    M = [];
  if (agent.model != null) M.push(modelTransitionText(agent.model, agent.fallbackModel));
  if (agent.agentType != null) M.push(agent.agentType);
  if (agent.isolation != null)
    M.push(
      agent.isolation === "remote" && agent.remoteSessionId
        ? `remote ${agent.remoteSessionId}`
        : agent.isolation,
    );
  if (agent.cached) M.push("from resume journal");
  if (agent.attempt != null && agent.attempt > 1) {
    let W =
      agent.lastAttemptReason === "throttled"
        ? agent.label.endsWith(w7n)
          ? Ehn
          : "throttled"
        : agent.lastAttemptReason === "user-retry"
          ? "user retry"
          : "stalled";
    M.push(`attempt ${agent.attempt} (${W})`);
  }
  let I = bunStringWidth(glyph) + 1 + bunStringWidth(AGENT_STATE_LABELS[status]),
    N = M.length > 0 ? truncateToWidth(` \xB7 ${M.join(" \xB7 ")}`, Math.max(0, width - I)) : "";
  h.push([
    { text: glyph, color: color },
    { text: " " },
    { text: AGENT_STATE_LABELS[status], color: color, bold: !0 },
    ...(N ? [{ text: N, dimColor: !0 }] : []),
  ]);
  let E = [];
  if (agent.tokens != null) E.push(`${formatTokens(agent.tokens)} tok`);
  if (agent.toolCalls != null && agent.toolCalls > 0)
    E.push(`${agent.toolCalls} ${plural(agent.toolCalls, "tool call")}`);
  if (agent.durationMs != null) E.push(formatDuration(agent.durationMs));
  if (status === "queued" && agent.queuedAt != null)
    E.push(`waiting ${formatDuration(Math.max(0, nowMs - agent.queuedAt))}`);
  if (status === "running" && agent.lastProgressAt != null) {
    let floored = Math.floor((nowMs - agent.lastProgressAt) / 1000);
    if (floored >= 30) E.push(`idle ${formatDuration(floored * 1000)}`);
  }
  if (E.length > 0) h.push([{ text: truncateToWidth(E.join(" \xB7 "), width), dimColor: !0 }]);
  h.push([{ text: "" }]);
  let V = status !== "queued" && A ? A.toolCalls : [],
    J = status === "running",
    filtered = V.filter((W) => getCallDisplayState(W, J) === "running"),
    L = V,
    B = A?.tasks ?? [],
    H = B.length > 0 ? WorkflowTaskList({ tasks: B, expanded: !1, width: width, indent: "  " }) : null,
    Y = B.length > 0 ? WorkflowTaskList({ tasks: B, expanded: !0, width: width, indent: "  " }) : null,
    pt = expanded ? Y : H,
    gt = L.length > 0 || (pt?.capped ?? !1),
    wt = transcript !== "loading" && transcript?.prompt ? transcript.prompt : (agent.promptPreview ?? ""),
    ft = wt
      ? wrapLines(wt, max).map((W) => [{ text: "  " + W, dimColor: !0 }])
      : [
          [
            {
              text:
                "  " +
                (status === "queued"
                  ? "Available once the agent starts."
                  : transcript === "loading"
                    ? "Loading\u2026"
                    : status === "running"
                      ? "Not available yet (agent still running)."
                      : "Transcript not available."),
              dimColor: !0,
            },
          ],
        ],
    at = pushCollapsibleSection({
      lines: h,
      title: "Prompt",
      body: ft,
      collapsedLines: Qa,
      expanded: expanded,
      indent: "  ",
      width: width,
    }),
    ct = at > 0 ? at - 1 : 0,
    U = ct,
    X = [{ end: h.length - (expanded ? U : 0), growth: ct }];
  if ((h.push([{ text: "" }]), pt && H && Y)) {
    for (let line of pt.lines) h.push(line);
    let W = Y.lines.length - H.lines.length;
    ((U += W), X.push({ end: h.length - (expanded ? U : 0), growth: W }), h.push([{ text: "" }]));
  }
  if (status !== "queued") {
    let W = L.length - Rr,
      max = Math.max(0, W - Rr);
    while (!1) W--;
    let filtered = L.filter((Rt, yt) => yt >= W || getCallDisplayState(Rt, J) === "running"),
      St = [];
    for (let [Rt, yt] of filtered.entries()) {
      if (Rt > 0) St.push([{ text: "" }]);
      let Ot = getCallDisplayState(yt, J);
      St.push(...renderWorkflowCallLines({ call: yt, state: Ot, width: width, indent: "  " }));
    }
    let kt = "";
    if (L.length > filtered.length)
      kt = ` \xB7 ${filtered.length <= Rr ? "last " : ""}${filtered.length} of ${L.length} tool calls`;
    let max_2 = Math.max(0, width - bunStringWidth("Activity")),
      ee = ` \xB7 ${RETURN_SYMBOL} expand`;
    if (
      ((kt =
        !expanded && gt && bunStringWidth(kt) + bunStringWidth(ee) <= max_2
          ? kt + ee
          : truncateToWidth(kt, max_2)),
      h.push([{ text: "Activity", bold: !0, dimColor: !0 }, ...(kt ? [{ text: kt, dimColor: !0 }] : [])]),
      L.length > 0)
    ) {
      if (expanded) for (let yt of St) h.push(yt);
      else
        for (let yt of filtered) {
          let Ot = getCallDisplayState(yt, J);
          h.push(renderWorkflowCallHeader({ call: yt, state: Ot, width: width, indent: "  " }));
        }
      let Rt = St.length - filtered.length;
      ((U += Rt), X.push({ end: h.length - (expanded ? U : 0), growth: Rt }));
    } else if (agent.lastToolName != null) {
      let Rt = agent.lastToolSummary ? `(${agent.lastToolSummary})` : "",
        yt = pae(agent.lastToolName);
      h.push([{ text: truncateToWidth(`  ${yt}${Rt}`, width), dimColor: !0 }]);
    } else
      h.push([{ text: `  ${status === "running" ? "No tool calls yet." : "No tool calls."}`, dimColor: !0 }]);
    h.push([{ text: "" }]);
  }
  let ot = [];
  switch (status) {
    case "queued":
      ot.push([{ text: "  Waiting for an agent slot.", dimColor: !0 }]);
      break;
    case "running":
      ot.push([{ text: `${"  "}Still running\u2026`, dimColor: !0 }]);
      break;
    case "interrupted":
      ot.push([{ text: "  The workflow stopped before this agent finished.", dimColor: !0 }]);
      break;
    case "skipped":
      ot.push([{ text: "  Skipped by user.", dimColor: !0 }]);
      break;
    case "blocked":
    case "failed": {
      for (let W of wrapLines(agent.error ?? "failed", max)) ot.push([{ text: "  " + W, color: "error" }]);
      break;
    }
    case "done": {
      let W =
        transcript !== "loading" && transcript?.finalText
          ? transcript.finalText
          : (agent.resultPreview ?? "");
      if (!W) {
        ot.push([{ text: "  " + (transcript === "loading" ? "Loading\u2026" : "(empty)"), dimColor: !0 }]);
        break;
      }
      let G = renderJsonOutcomeLines(W, max);
      if (G) for (let dt of G) ot.push([{ text: "  " }, ...dt]);
      else for (let dt of wrapLines(W, max)) ot.push([{ text: "  " + dt }]);
      break;
    }
  }
  let rt = pushCollapsibleSection({
    lines: h,
    title: "Outcome",
    body: ot,
    collapsedLines: Xa,
    expanded: expanded,
    indent: "  ",
    width: width,
  });
  return { lines: h, expandable: at > 0 || rt > 0 || gt, folds: X, detailExpandable: gt };
}
//@ chunk-axsvbsqv.js:34482-36147 placement
function WorkflowAgentDetailPane(o) {
  let $ = w(42),
    {
      phase: phase,
      clampedAgent: clampedAgent,
      agentLabel: agentLabel,
      detailLines: detailLines,
      cardScroll: cardScroll,
      leftWidth: leftWidth,
      rightWidth: rightWidth,
      viewport: viewport,
      workflowActive: workflowActive,
      filterLabel: filterLabel,
    } = o,
    agents = phase.agents,
    I,
    N,
    E,
    V,
    J,
    z,
    L,
    B,
    H,
    Y;
  if (
    $[0] !== agentLabel ||
    $[1] !== agents ||
    $[2] !== cardScroll ||
    $[3] !== clampedAgent ||
    $[4] !== detailLines ||
    $[5] !== filterLabel ||
    $[6] !== leftWidth ||
    $[7] !== phase.title ||
    $[8] !== rightWidth ||
    $[9] !== viewport ||
    $[10] !== workflowActive
  ) {
    let pt = computeScrollWindow(clampedAgent, agents.length, viewport);
    let max = Math.max(0, detailLines.length - viewport);
    let wt = Dt(cardScroll, 0, max);
    let min = Math.min(detailLines.length, wt + viewport);
    let at = [];
    for (let ct = 0; ct < viewport; ct++) {
      let U = pt.from + ct;
      let X = U < pt.to ? renderCompactAgentRow(agents[U], U, clampedAgent, leftWidth, workflowActive) : [];
      let ot = wt + ct;
      let rt = ot < min ? detailLines[ot] : [];
      at.push(e(TwoColumnRow, { left: X, right: rt, leftWidth: leftWidth, rightWidth: rightWidth }, ct));
    }
    N = Box;
    B = "column";
    const title = phase.title;
    let G;
    if ($[21] !== agents.length || $[22] !== filterLabel)
      ((G = He(agents.length, filterLabel)), ($[21] = agents.length), ($[22] = filterLabel), ($[23] = G));
    else G = $[23];
    const dt = `${title} \xB7 ${G}`;
    if ($[24] !== agentLabel || $[25] !== leftWidth || $[26] !== rightWidth || $[27] !== dt)
      ((H = e(SplitPaneBorder, {
        pos: "top",
        leftWidth: leftWidth,
        rightWidth: rightWidth,
        leftTitle: dt,
        rightTitle: agentLabel,
      })),
        ($[24] = agentLabel),
        ($[25] = leftWidth),
        ($[26] = rightWidth),
        ($[27] = dt),
        ($[28] = H));
    else H = $[28];
    Y = at;
    I = SplitPaneBorder;
    E = "bottom";
    V = leftWidth;
    J = rightWidth;
    z = agents.length > viewport ? formatScrollRange(pt, agents.length) : void 0;
    L = detailLines.length > viewport ? formatScrollRange({ from: wt, to: min }, detailLines.length) : void 0;
    (($[0] = agentLabel),
      ($[1] = agents),
      ($[2] = cardScroll),
      ($[3] = clampedAgent),
      ($[4] = detailLines),
      ($[5] = filterLabel),
      ($[6] = leftWidth),
      ($[7] = phase.title),
      ($[8] = rightWidth),
      ($[9] = viewport),
      ($[10] = workflowActive),
      ($[11] = I),
      ($[12] = N),
      ($[13] = E),
      ($[14] = V),
      ($[15] = J),
      ($[16] = z),
      ($[17] = L),
      ($[18] = B),
      ($[19] = H),
      ($[20] = Y));
  } else
    ((I = $[11]),
      (N = $[12]),
      (E = $[13]),
      (V = $[14]),
      (J = $[15]),
      (z = $[16]),
      (L = $[17]),
      (B = $[18]),
      (H = $[19]),
      (Y = $[20]));
  let W;
  if ($[29] !== I || $[30] !== E || $[31] !== V || $[32] !== J || $[33] !== z || $[34] !== L)
    ((W = e(I, { pos: E, leftWidth: V, rightWidth: J, leftTag: z, rightTag: L })),
      ($[29] = I),
      ($[30] = E),
      ($[31] = V),
      ($[32] = J),
      ($[33] = z),
      ($[34] = L),
      ($[35] = W));
  else W = $[35];
  let G;
  if ($[36] !== N || $[37] !== B || $[38] !== H || $[39] !== Y || $[40] !== W)
    ((G = r(N, { flexDirection: B, children: [H, Y, W] })),
      ($[36] = N),
      ($[37] = B),
      ($[38] = H),
      ($[39] = Y),
      ($[40] = W),
      ($[41] = G));
  else G = $[41];
  return G;
}
//@ chunk-axsvbsqv.js:36147-38187 placement
function WorkflowAgentDetail(o) {
  let $ = w(43),
    {
      agentLabel: agentLabel,
      position: position,
      detailLines: detailLines,
      cardScroll: cardScroll,
      contentWidth: contentWidth,
      viewport: viewport,
    } = o,
    x;
  if ($[0] !== contentWidth) ((x = T8.repeat(contentWidth + 2)), ($[0] = contentWidth), ($[1] = x));
  else x = $[1];
  let A = x,
    max = Math.max(0, detailLines.length - viewport),
    T,
    M;
  if (
    $[2] !== agentLabel ||
    $[3] !== A ||
    $[4] !== cardScroll ||
    $[5] !== contentWidth ||
    $[6] !== detailLines ||
    $[7] !== max ||
    $[8] !== position ||
    $[9] !== viewport
  ) {
    let I = Dt(cardScroll, 0, max);
    let min = Math.min(detailLines.length, I + viewport);
    M = [];
    let E = ` \xB7 ${position}`;
    const max_2 = Math.max(1, contentWidth - bunStringWidth(E));
    let J;
    if ($[12] !== agentLabel || $[13] !== max_2)
      ((J = truncateToWidth(agentLabel, max_2)), ($[12] = agentLabel), ($[13] = max_2), ($[14] = J));
    else J = $[14];
    let z;
    if ($[15] !== J) ((z = { text: J, color: "permission", bold: !0 }), ($[15] = J), ($[16] = z));
    else z = $[16];
    let L;
    if ($[17] !== E) ((L = { text: E, dimColor: !0 }), ($[17] = E), ($[18] = L));
    else L = $[18];
    let B;
    if ($[19] !== z || $[20] !== L) ((B = [z, L]), ($[19] = z), ($[20] = L), ($[21] = B));
    else B = $[21];
    let H;
    if ($[22] !== contentWidth || $[23] !== B)
      ((H = e(BoxedSegmentLine, { contentWidth: contentWidth, segs: B }, "title")),
        ($[22] = contentWidth),
        ($[23] = B),
        ($[24] = H));
    else H = $[24];
    M.push(H);
    for (let Y = I; Y < min; Y++)
      M.push(e(BoxedSegmentLine, { contentWidth: contentWidth, segs: detailLines[Y] }, `l-${Y}`));
    for (let pt = min - I; pt < viewport; pt++)
      M.push(e(BoxedSegmentLine, { contentWidth: contentWidth, segs: [{ text: "" }] }, `pad-${pt}`));
    if (detailLines.length > viewport) {
      let gt = ` ${formatScrollRange({ from: I, to: min }, detailLines.length)} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(gt));
      let ft;
      if ($[25] !== max) ((ft = T8.repeat(max)), ($[25] = max), ($[26] = ft));
      else ft = $[26];
      let at;
      if ($[27] !== ft)
        ((at = r(Text, { color: "text", children: [" ", Kk.bottomLeft, ft] })), ($[27] = ft), ($[28] = at));
      else at = $[28];
      let ct;
      if ($[29] !== gt) ((ct = e(Text, { dimColor: !0, children: gt })), ($[29] = gt), ($[30] = ct));
      else ct = $[30];
      let U;
      if ($[31] === MEMO_CACHE_SENTINEL)
        ((U = e(Text, { color: "text", children: Kk.bottomRight })), ($[31] = U));
      else U = $[31];
      let X;
      if ($[32] !== ct || $[33] !== at)
        ((X = r(Text, { wrap: "truncate-end", children: [at, ct, U] })),
          ($[32] = ct),
          ($[33] = at),
          ($[34] = X));
      else X = $[34];
      T = X;
    } else {
      let ft;
      if ($[35] !== A)
        ((ft = r(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", Kk.bottomLeft, A, Kk.bottomRight],
        })),
          ($[35] = A),
          ($[36] = ft));
      else ft = $[36];
      T = ft;
    }
    (($[2] = agentLabel),
      ($[3] = A),
      ($[4] = cardScroll),
      ($[5] = contentWidth),
      ($[6] = detailLines),
      ($[7] = max),
      ($[8] = position),
      ($[9] = viewport),
      ($[10] = T),
      ($[11] = M));
  } else ((T = $[10]), (M = $[11]));
  let V;
  if ($[37] !== A)
    ((V = r(Text, { color: "text", wrap: "truncate-end", children: [" ", Kk.topLeft, A, Kk.topRight] })),
      ($[37] = A),
      ($[38] = V));
  else V = $[38];
  let J;
  if ($[39] !== T || $[40] !== M || $[41] !== V)
    ((J = r(Box, { flexDirection: "column", children: [V, M, T] })),
      ($[39] = T),
      ($[40] = M),
      ($[41] = V),
      ($[42] = J));
  else J = $[42];
  return J;
}
/**
 * WorkflowDetailDialog：工作流详情对话框，阶段/代理两栏，支持暂停、恢复、跳过与重试代理。
 */
//@ chunk-axsvbsqv.js:38187-44815 placement
function WorkflowDetailDialog({
  workflow: workflow,
  onDone: onDone,
  onBack: onBack,
  onKill: onKill,
  onSkipAgent: onSkipAgent,
  onRetryAgent: onRetryAgent,
  onPause: onPause,
  onResume: onResume,
  initialPhaseIndex: initialPhaseIndex,
  promptVisibleBelow: promptVisibleBelow = !1,
}) {
  useRegisterOverlay("workflow-detail-dialog");
  let {
      availableRows: availableRows,
      width: width,
      rows: rows,
    } = useWorkflowProgressRows(promptVisibleBelow),
    max = Math.max(12, width - 6),
    N = ElapsedClock(workflow),
    E = Q(() => workflowPhaseRows(workflow), [workflow.workflowProgress, workflow.phases]),
    V = Q(() => sumPhaseCounts(E, workflow.agentCount), [E, workflow.agentCount]),
    [J, z] = y(() => (initialPhaseIndex !== void 0 ? Math.max(0, initialPhaseIndex) : 0)),
    [L, B] = y(0),
    [H, Y] = y(initialPhaseIndex !== void 0 ? "agents" : "phases"),
    [pt, gt] = y(!1),
    [wt, ft] = y({ scroll: 0, expanded: !1 }),
    { scroll: scroll, expanded: expanded } = wt,
    [U, X] = y("all"),
    min = Math.min(J, Math.max(0, E.length - 1)),
    rt = E[min],
    W = workflow.status === "running",
    G = Q(() => {
      if (!rt || U === "all" || H === "phases") return rt;
      return { ...rt, agents: rt.agents.filter((agent) => getAgentDisplayState(agent, W) === U) };
    }, [rt, U, H, W]),
    dt = G ? Math.min(L, Math.max(0, G.agents.length - 1)) : 0,
    [St, kt] = y(!1),
    zt = workflow.script.length > 0,
    ee = Q(() => {
      if (!zt) return "";
      let K = parseWorkflowScript(workflow.script);
      if (!("error" in K)) return K.meta.name;
      return slugifyWorkflowName(workflow.summary ?? workflow.description);
    }, [zt, workflow.script, workflow.summary, workflow.description]),
    Rt = Q(() => workflowDescription(workflow), [workflow.script, workflow.description, workflow.summary]),
    { name: yt, subtext: subtext, stats: stats } = workflowStatusLine(workflow, Rt, V, N);
  function fe() {
    ft({ scroll: 0, expanded: !1 });
  }
  function qe(K) {
    (z((Ct) => Dt(Dt(Ct, 0, E.length - 1) + K, 0, E.length - 1)), B(0), fe());
  }
  function sn(K) {
    if (!G) return;
    (B((Ct) => Dt(Dt(Ct, 0, G.agents.length - 1) + K, 0, G.agents.length - 1)), fe());
  }
  function po(K) {
    ft((Ct) => ({ ...Ct, scroll: Math.max(0, Ct.scroll + K) }));
  }
  function oe(K) {
    if (H === "phases") {
      qe(K);
      return;
    }
    sn(K);
  }
  function fo() {
    if ((gt(!1), H === "agent")) {
      Y("agents");
      return;
    }
    if (H === "agents") {
      Y("phases");
      return;
    }
    if (onBack) onBack();
    else onDone();
  }
  function an() {
    if (rt && rt.agents.length > 0) (B(0), X("all"), Y("agents"));
  }
  function mo() {
    if (!st || !rt) return;
    if (U !== "all") (X("all"), B(rt.agents.indexOf(st)));
    if ((fe(), bo === "loading")) gt(!0);
    else Y("agent");
  }
  function go() {
    if (!rt || pt) return;
    let K = new Set(rt.agents.map((agent) => getAgentDisplayState(agent, W)));
    (X((Ct) => {
      let index = Jt.indexOf(Ct);
      for (let le = 0; le < Jt.length; le++) {
        index = (index + 1) % Jt.length;
        let ls = Jt[index];
        if (ls === "all" || K.has(ls)) break;
      }
      return Jt[index];
    }),
      B(0),
      fe());
  }
  let st = H !== "phases" && G ? G.agents[dt] : void 0,
    Yt = st ? getAgentDisplayState(st, W) : void 0,
    ve = !!st && It(st) && !!st.agentId && !!onSkipAgent,
    We = !!st && It(st) && !!st.agentId && !!onRetryAgent,
    se = width - 9,
    cn = G ? Math.max(14, ...G.agents.map((agent) => 4 + bunStringWidth(agent.label))) : 14,
    max_2 = Math.max(12, Math.min(30, cn, se - 30)),
    ho = se - max_2,
    pn = H === "agent" && E.length > 0 && width >= 64 && ho >= 30,
    Yr = pn ? ho : max,
    bo = useWorkflowAgentTranscript(
      workflow.workflowRunId,
      st?.agentId,
      st?.lastProgressAt,
      st?.promptFramed,
    ),
    Di = useTimeout(pt ? fi : null);
  if (pt) {
    if (!st) gt(!1);
    else if (bo !== "loading" || Di) (gt(!1), Y("agent"));
  }
  let Qr = Yt === "queued" || Yt === "running" ? Math.floor(Date.now() / 1000) * 1000 : 0,
    Ue = Q(
      () =>
        H === "agent" && st && Yt
          ? WorkflowAgentCard({
              agent: st,
              status: Yt,
              transcript: bo,
              expanded: expanded,
              width: Yr,
              nowMs: Qr,
            })
          : { lines: [], expandable: !1, folds: [], detailExpandable: !1 },
      [H, st, Yt, bo, expanded, Yr, Qr],
    ),
    lines = Ue.lines;
  function Pi() {
    if (st && It(st) && st.agentId) onSkipAgent?.(st.agentId);
  }
  function Ni() {
    if (st && It(st) && st.agentId) onRetryAgent?.(st.agentId);
  }
  MessageActionsKeybindings(
    { "confirm:previous": () => oe(-1), "confirm:next": () => oe(1) },
    { context: "Confirmation" },
  );
  let fn = workflow.status === "running" && !!onPause,
    mn = workflow.status === "paused" && !!workflow.scriptPath && !!workflow.workflowRunId && !!onResume,
    Xr = workflow.status === "running" && !!onKill && H === "phases";
  function Oi() {
    if (fn) onPause?.();
    else if (mn) onResume?.(buildResumePrompt(workflow));
  }
  let Fi = (K) => {
      if (K.ctrl || K.meta) return;
      if (K.key === "j")
        if ((K.preventDefault(), H === "agent")) po(1);
        else oe(1);
      else if (K.key === "k")
        if ((K.preventDefault(), H === "agent")) po(-1);
        else oe(-1);
      else if (K.key === "return" || K.key === "right") {
        if ((K.preventDefault(), H === "phases")) an();
        else if (H === "agents") mo();
        else if (K.key === "return" && Ue.expandable) {
          if (!expanded && Ue.detailExpandable) logFeatureOk("workflow_agent_card_detail");
          let { folds: folds } = Ue;
          ft(({ scroll: scroll, expanded: expanded }) => ({
            expanded: !expanded,
            scroll: expanded ? mapRowThroughGrowth(scroll, folds) : ki(scroll, folds),
          }));
        }
      } else if (K.key === "left") (K.preventDefault(), fo());
      else if (K.key === "r" && We) (K.preventDefault(), Ni());
      else if (K.key === "x" && ve) (K.preventDefault(), Pi());
      else if (K.key === "x" && Xr) (K.preventDefault(), onKill?.());
      else if (K.key === " ") (K.preventDefault(), onDone());
      else if (K.key === "p" && (fn || mn)) (K.preventDefault(), Oi());
      else if (K.key === "f" && H === "agents") (K.preventDefault(), go());
      else if (K.key === "s" && zt) (K.preventDefault(), kt(!0));
    },
    wo = E.length > 0;
  if (St)
    return e(WorkflowSaveDialog, {
      script: workflow.script,
      defaultName: ee,
      onDone: (K) => {
        if (K) onDone(K);
        else kt(!1);
      },
    });
  let Qt = availableRows < 18,
    Zr = availableRows - (Qt ? 8 : 11),
    max_3 = Math.max(1, Zr - 3),
    gn = E.length > max_3,
    es = gn ? Math.max(1, max_3 - 1) : E.length,
    max_4 = Math.max(1, Zr - es - (gn ? 1 : 0)),
    yo = computeScrollWindow(min, E.length, es),
    max_5 = Math.max(
      14,
      ...E.map((K, Ct) => {
        let Mt = K.status === "done" ? re.tick : K.status === "failed" ? re.cross : String(Ct + 1),
          le = K.totalCount > 0 ? `${K.doneCount}/${K.totalCount}` : "";
        return 2 + bunStringWidth(Mt) + 1 + bunStringWidth(K.title) + (le ? 1 + bunStringWidth(le) : 0);
      }),
    ),
    max_6 = Math.max(12, Math.min(34, max_5, se - 24)),
    ns = se - max_6,
    Hi = H !== "agent" && wo && width >= 64 && ns >= 20,
    max_7 = Math.max(1, availableRows - (Qt ? 7 : 8)),
    max_8 = Math.max(3, availableRows - (Qt ? 8 : 9)),
    ss = pn ? max_7 : max_8,
    max_9 = Math.max(0, lines.length - ss);
  if (scroll > max_9) ft({ scroll: max_9, expanded: expanded });
  let Je = U !== "all" && H !== "phases" ? AGENT_STATE_LABELS[U].toLowerCase() : void 0,
    Wt = [];
  if (H === "agent") {
    if ((Wt.push(`${UP_ARROW}${DOWN_ARROW} agent`), lines.length > ss)) Wt.push("j/k scroll");
    if (Ue.expandable) Wt.push(`${RETURN_SYMBOL} ${expanded ? "collapse" : "expand"}`);
  } else if (wo) Wt.push(`${UP_ARROW}${DOWN_ARROW} select`);
  if (ve) Wt.push("x stop");
  if (Xr) Wt.push("x stop workflow");
  if (We) Wt.push("r restart");
  if (fn) Wt.push("p pause");
  else if (mn) Wt.push("p resume");
  if (H === "agents" && wo) Wt.push(Je ? `f filter: ${Je}` : "f filter");
  if ((Wt.push("esc back"), zt)) Wt.push("s save");
  let joined = Wt.join(" \xB7 ");
  return e(FocusColumn, {
    onKeyDown: Fi,
    children: e(Dialog, {
      title: null,
      hideBorder: !0,
      hideInputGuide: !0,
      onCancel: fo,
      color: "text",
      children: r(Box, {
        flexDirection: "column",
        width: width,
        minHeight: Math.max(Qt ? 8 : 12, Math.min(availableRows - 1, rows - 6)),
        maxHeight: Math.max(Qt ? 8 : 11, availableRows - 1),
        overflowY: "hidden",
        children: [
          !wo
            ? r(Fragment, {
                children: [e(HintText, { children: "No agents yet." }), e(Box, { flexGrow: 1 })],
              })
            : H === "agent" && st && G
              ? r(Fragment, {
                  children: [
                    e(WorkflowHeader, { name: yt, subtext: subtext, stats: stats, width: width }),
                    !Qt && e(Box, { height: 1 }),
                    pn
                      ? e(WorkflowAgentDetailPane, {
                          phase: G,
                          clampedAgent: dt,
                          agentLabel: st.label,
                          detailLines: lines,
                          cardScroll: scroll,
                          leftWidth: max_2,
                          rightWidth: ho,
                          viewport: max_7,
                          workflowActive: W,
                          filterLabel: Je,
                        })
                      : e(WorkflowAgentDetail, {
                          agentLabel: st.label,
                          position: `${dt + 1}/${G.agents.length}`,
                          detailLines: lines,
                          cardScroll: scroll,
                          contentWidth: max,
                          viewport: max_8,
                        }),
                    e(Box, { flexGrow: 1 }),
                  ],
                })
              : Hi && G
                ? r(Fragment, {
                    children: [
                      e(WorkflowHeader, { name: yt, subtext: subtext, stats: stats, width: width }),
                      !Qt && e(Box, { height: 1 }),
                      e(WorkflowPhasesPane, {
                        phases: E,
                        selectedPhase: G,
                        clampedPhase: min,
                        clampedAgent: dt,
                        level: H === "phases" ? "phases" : "agents",
                        leftWidth: max_6,
                        rightWidth: ns,
                        viewport: max_7,
                        workflowActive: W,
                        filterLabel: Je,
                      }),
                      e(Box, { flexGrow: 1 }),
                    ],
                  })
                : r(Fragment, {
                    children: [
                      e(WorkflowHeader, { name: yt, subtext: subtext, stats: stats, width: width }),
                      !Qt && e(Box, { height: 1 }),
                      E.slice(yo.from, yo.to).map((K, Ct) => {
                        let Mt = yo.from + Ct;
                        return e(
                          WorkflowPhaseRow,
                          {
                            index: Mt + 1,
                            title: K.title,
                            done: K.doneCount,
                            total: K.totalCount,
                            status: K.status,
                            selected: Mt === min,
                          },
                          `${Mt}-${K.title}`,
                        );
                      }),
                      gn && e(ScrollRangeIndicator, { win: yo, total: E.length }),
                      e(Box, { flexGrow: 1 }),
                      G
                        ? e(WorkflowAgentsPane, {
                            phase: G,
                            selectedAgent: dt,
                            level: H === "phases" ? "phases" : "agents",
                            contentWidth: max,
                            viewport: max_4,
                            tight: Qt,
                            workflowActive: W,
                            filterLabel: Je,
                          })
                        : null,
                    ],
                  }),
          r(Text, { dimColor: !0, italic: !0, wrap: "truncate-end", children: [" ", joined] }),
        ],
      }),
    }),
  });
}

export { WorkflowDetailDialog };
