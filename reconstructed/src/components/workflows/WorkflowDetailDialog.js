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
  HORIZONTAL_LINE_GLYPH,
  RETURN_SYMBOL,
  UP_ARROW,
  DOWN_ARROW,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  normalizeTaskText,
  MAX_TASK_DETAIL_LINES,
  MIN_TASK_ROWS,
  WorkflowTaskList,
} from "./WorkflowTaskList.js";
import { identity } from "../../tools/REPLTool/constants.js";
import {
  truncateToWidth,
  splitByDisplayWidth,
  formatTokens,
  formatDuration,
  formatBarElapsed,
} from "../../utils/format.js";
import {
  TASK_TODO_TOOL_NAMES,
  MAX_TRANSCRIPT_TOOL_RESULTS,
  readWorkflowAgentTranscript,
} from "../../tasks/LocalWorkflowTask/workflowTranscript.js";
import { RESPONSE_CONNECTOR } from "../../constants/figures.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
import { clockContext, defaultSetTimeout } from "../../ink/components/ClockContext.js";
import { USAGE_LIMIT_SUFFIX, USAGE_LIMIT_TEXT } from "../../utils/usageLimitText.js";
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
//@ chunk-axsvbsqv.js:14662-15241 placement
/**
 * 渲染工作流内单个工具调用的标题行：状态符号（运行中、无结果、成功、错误）、工具名与按宽度截断的摘要。
 */
function renderWorkflowCallHeader({ call: o, state, width, indent }) {
  let marker;
  let suffix = null;
  switch (state) {
    case "running":
      marker = {
        text: BLACK_CIRCLE,
        dimColor: true,
      };
      suffix = {
        text: " \xB7 running",
        dimColor: true,
      };
      break;
    case "unanswered":
      marker = {
        text: DOTTED_CIRCLE,
        dimColor: true,
      };
      suffix = {
        text: " \xB7 no result",
        dimColor: true,
      };
      break;
    case "ok":
      marker = {
        text: BLACK_CIRCLE,
        color: "success",
      };
      break;
    case "error":
      marker = {
        text: BLACK_CIRCLE,
        color: "error",
      };
      suffix = {
        text: " \xB7 error",
        color: "error",
      };
      break;
  }
  let max = Math.max(
    1,
    width -
      bunStringWidth(indent) -
      bunStringWidth(marker.text) -
      1 -
      (suffix ? bunStringWidth(suffix.text) : 0),
  );
  let toolName = normalizeTaskText(identity(o.name));
  let remaining = max - bunStringWidth(toolName);
  let label =
    remaining < 0
      ? truncateToWidth(toolName, max)
      : o.summary && remaining > 3
        ? `${toolName}(${truncateToWidth(normalizeTaskText(o.summary), remaining - 2)})`
        : toolName;
  return [
    {
      text: indent,
    },
    marker,
    {
      text: ` ${label}`,
      dimColor: state !== "running",
    },
    ...(suffix ? [suffix] : []),
  ];
}
//@ chunk-axsvbsqv.js:15241-15808 placement
/**
 * 渲染工具调用的完整行：标题、输入字段，以及结果（空、内容或"未记录"）。
 */
function renderWorkflowCallLines({ call: o, state, width, indent }) {
  let lines = [
    renderWorkflowCallHeader({
      call: o,
      state,
      width,
      indent,
    }),
  ];
  if (TASK_TODO_TOOL_NAMES.includes(o.name)) return lines;
  let fieldIndent = `${indent}  `;
  renderCallFields(lines, o.fields, {
    indent: fieldIndent,
    width,
    maxLines: MAX_TASK_DETAIL_LINES,
  });
  let resultPrefix = `${fieldIndent}${RESPONSE_CONNECTOR}  `;
  if (o.result && o.result.head === "")
    lines.push([
      {
        text: truncateToWidth(`${resultPrefix}(empty)`, width),
        color: o.result.isError ? "error" : undefined,
        dimColor: !o.result.isError,
      },
    ]);
  else if (o.result)
    renderWrappedText(lines, o.result, {
      firstPrefix: resultPrefix,
      restPrefix: " ".repeat(bunStringWidth(resultPrefix)),
      width,
      maxLines: MIN_TASK_ROWS,
      color: o.result.isError ? "error" : undefined,
    });
  else if (state === "unanswered")
    lines.push([
      {
        text: truncateToWidth(`${resultPrefix}(none recorded)`, width),
        dimColor: true,
      },
    ]);
  return lines;
}
//@ chunk-axsvbsqv.js:15808-16294 placement
/**
 * 按行数预算渲染调用的输入字段（键过宽时单独成行），最后汇总隐藏的行与字符数。
 */
function renderCallFields(lines, fields, { indent, width, maxLines }) {
  let p = maxLines;
  let h = 0;
  let b = 0;
  let x = `${indent}  `;
  for (let A of fields) {
    if (p <= 0) {
      h += A.lineCount;
      continue;
    }
    let v = normalizeTaskText(A.key);
    let T = `${indent}${v}: `;
    if (
      !(
        A.lineCount === 1 &&
        A.truncatedChars === 0 &&
        bunStringWidth(T) + bunStringWidth(normalizeTaskText(A.head)) <= width
      ) &&
      bunStringWidth(T) > Math.floor(width / 2)
    ) {
      lines.push([
        {
          text: truncateToWidth(`${indent}${v}:`, width),
          dimColor: true,
        },
      ]);
      p--;
      T = x;
      if (p <= 0) {
        h += A.lineCount;
        continue;
      }
    }
    let I = renderWrappedText(lines, A, {
      firstPrefix: T,
      restPrefix: x,
      width,
      maxLines: p,
      color: undefined,
      reportHidden: false,
    });
    p -= I.lines;
    h += I.hiddenLines;
    b += I.hiddenChars;
  }
  pushHiddenSummary(lines, indent, width, h, b);
}
//@ chunk-axsvbsqv.js:16294-16901 placement
/**
 * 把文本按宽度与行数上限折行输出（首行与续行前缀不同），返回渲染行数与隐藏的行/字符数，可选追加隐藏提示。
 */
function renderWrappedText(o, i, { firstPrefix, restPrefix, width, maxLines, color, reportHidden = true }) {
  let lines = i.head.split(`
`);
  let rendered = 0;
  let max = Math.max(0, i.lineCount - lines.length);
  let complete = true;
  let max_2 = Math.max(1, width - bunStringWidth(restPrefix));
  t: for (let [N, E] of lines.entries()) {
    let V = normalizeTaskText(E);
    let J = truncateToLength(V, (maxLines - rendered + 1) * width);
    let z = rendered === 0 ? Math.max(1, width - bunStringWidth(firstPrefix)) : max_2;
    let L = splitByDisplayWidth(J, z)[0] ?? "";
    let sliced = J.slice(L.length);
    let H = sliced ? [L, ...splitByDisplayWidth(sliced, max_2)] : [L];
    for (let [Y, pt] of H.entries()) {
      if (rendered >= maxLines) {
        max += lines.length - N;
        complete = false;
        break t;
      }
      o.push([
        {
          text: (rendered === 0 && Y === 0 ? firstPrefix : restPrefix) + pt,
          color,
          dimColor: color === undefined,
        },
      ]);
      rendered++;
    }
    if (J.length < V.length) {
      max += lines.length - N;
      complete = false;
      break;
    }
  }
  let truncatedChars = complete ? i.truncatedChars : 0;
  if (reportHidden) pushHiddenSummary(o, restPrefix, width, max, truncatedChars);
  return {
    lines: rendered,
    hiddenLines: max,
    hiddenChars: truncatedChars,
  };
}
//@ chunk-axsvbsqv.js:16901-17047 placement
function pushHiddenSummary(o, i, width, u, d) {
  let p = u > 0 ? `\u2026 ${u} more ${plural(u, "line")}` : d > 0 ? `\u2026 +${d} chars` : "";
  if (p)
    o.push([
      {
        text: truncateToWidth(`${i}${p}`, width),
        dimColor: true,
      },
    ]);
}
//@ chunk-axsvbsqv.js:17047-17146 placement
function renderStyledLine(A, v) {
  return jsxProd_default(
    Text,
    {
      color: A.color,
      dimColor: A.dimColor,
      bold: A.bold ?? false,
      children: A.text,
    },
    v,
  );
}
//@ chunk-axsvbsqv.js:17146-17172 placement
function renderNothing() {
  return null;
}
//@ chunk-axsvbsqv.js:17172-17333 placement
function computeScrollWindow(o, i, viewport) {
  if (i <= viewport)
    return {
      from: 0,
      to: i,
      above: 0,
      below: 0,
    };
  let floored = Math.floor(viewport / 2);
  let max = Math.max(0, Math.min(o - floored, i - viewport));
  let p = max + viewport;
  return {
    from: max,
    to: p,
    above: max,
    below: i - p,
  };
}
//@ chunk-axsvbsqv.js:17333-17395 placement
function isRunningState(o) {
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
//@ chunk-axsvbsqv.js:17628-17971 placement
/**
 * 按代理状态给出显示符号与颜色（完成、失败、跳过、阻塞、排队/中断、运行中）。
 */
function getAgentStateGlyph(agentDisplayState) {
  switch (agentDisplayState) {
    case "done":
      return {
        glyph: figures_default.tick,
        color: "success",
      };
    case "failed":
      return {
        glyph: figures_default.cross,
        color: "error",
      };
    case "skipped":
      return {
        glyph: figures_default.cross,
        color: "subtle",
      };
    case "blocked":
      return {
        glyph: figures_default.cross,
        color: "permission",
      };
    case "queued":
    case "interrupted":
      return {
        glyph: DOTTED_CIRCLE,
        color: "subtle",
      };
    case "running":
      return {
        glyph: BLACK_CIRCLE,
        color: "subtle",
      };
  }
}
//@ chunk-axsvbsqv.js:17971-18055 placement
var WORKFLOW_TASK_FILTERS = [
  "all",
  "running",
  "queued",
  "failed",
  "done",
  "skipped",
  "blocked",
  "interrupted",
];
//@ chunk-axsvbsqv.js:18055-18124 placement
function agentCountLabel(o, filterLabel) {
  return filterLabel ? `showing ${o} ${filterLabel}` : `${o} ${plural(o, "agent")}`;
}
//@ chunk-axsvbsqv.js:18124-18231 placement
function describeEmptyAgentList(o, filterLabel) {
  if (o.status === "not-started") return "Not started yet";
  return filterLabel ? `No ${filterLabel} agents` : "No agents";
}
//@ chunk-axsvbsqv.js:18231-18283 placement
function clamp(cardScroll, i, l) {
  return Math.max(i, Math.min(l, cardScroll));
}
//@ chunk-axsvbsqv.js:18283-18914 placement
/**
 * 汇总代理行的统计：模型（含回退）、隔离方式、token 数、空闲时长与状态标签，以及耗时。
 */
function getAgentRowStats(agent, now) {
  let status = getAgentDisplayState(agent, now);
  let modelLabel = modelTransitionText(agent.fallbackModel ?? agent.model, undefined);
  let stats = [];
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
    (status === "running" && agent.startedAt != null ? Math.max(0, Date.now() - agent.startedAt) : undefined);
  return {
    model: modelLabel,
    stats: stats.join(" \xB7 "),
    time: elapsedMs != null ? formatBarElapsed(elapsedMs) : "",
  };
}
//@ chunk-axsvbsqv.js:18914-18923 placement
var WORKFLOW_HEADER_ROWS = 6;
//@ chunk-axsvbsqv.js:18923-19429 placement
/**
 * 渲染代理行右侧：模型 · 统计信息，加右对齐的耗时，按宽度依次截断统计与模型。
 */
function renderAgentRowTail(agent, width, isSelected, now) {
  if (width <= 0) return [];
  let { model, stats, time } = getAgentRowStats(agent, now);
  let color = isSelected ? "permission" : undefined;
  let dim = !isSelected;
  let clip = (J, z) => (z <= 0 ? "" : truncateToWidth(J, z));
  let timeText = time ? clip(time, width).padStart(Math.min(WORKFLOW_HEADER_ROWS, width)) : "";
  let available = timeText ? width - bunStringWidth(timeText) - 1 : width;
  let separatorWidth = (modelText, statsText) => (modelText && statsText ? 3 : 0);
  let modelText = model;
  let statsText = stats;
  if (
    bunStringWidth(modelText) + separatorWidth(modelText, statsText) + bunStringWidth(statsText) >
    available
  ) {
    statsText = clip(statsText, available - bunStringWidth(modelText) - separatorWidth(modelText, statsText));
    if (
      bunStringWidth(modelText) + separatorWidth(modelText, statsText) + bunStringWidth(statsText) >
      available
    )
      modelText = clip(
        modelText,
        available - bunStringWidth(statsText) - separatorWidth(modelText, statsText),
      );
  }
  let separator = modelText && statsText ? " \xB7 " : "";
  let max = Math.max(
    0,
    width -
      bunStringWidth(modelText) -
      bunStringWidth(separator) -
      bunStringWidth(statsText) -
      bunStringWidth(timeText),
  );
  return [
    {
      text: modelText,
      color,
      dimColor: dim,
    },
    {
      text: separator,
      color,
      dimColor: dim,
    },
    {
      text: statsText,
      color,
      dimColor: dim,
    },
    {
      text: " ".repeat(max),
    },
    {
      text: timeText,
      color,
      dimColor: dim,
    },
  ];
}
//@ chunk-axsvbsqv.js:19429-19445 placement
var MAX_AGENT_NAME_WIDTH = 40;
var MIN_AGENT_NAME_WIDTH = 30;
//@ chunk-axsvbsqv.js:19445-19622 placement
function getAgentLabelWidth(agents, i) {
  let min = Math.min(
    MAX_AGENT_NAME_WIDTH,
    Math.max(22, i - MIN_AGENT_NAME_WIDTH),
    Math.max(4, Math.min(i, Math.max(12, i - WORKFLOW_HEADER_ROWS - 1))),
  );
  let reduced = agents.reduce((acc, p) => Math.max(acc, bunStringWidth(p.label)), 0);
  return Math.min(Math.max(12, reduced), min);
}
//@ chunk-axsvbsqv.js:19622-19862 placement
function fitSegments(segs, width) {
  let l = 0;
  for (let idx = 0; idx < segs.length; idx++) {
    let d = segs[idx];
    let p = bunStringWidth(d.text);
    if (l + p > width) {
      let h = width - l;
      let b = h > 0 ? truncateToWidth(d.text, h) : "";
      let sliced = segs.slice(0, idx);
      if (b)
        sliced.push({
          ...d,
          text: b,
        });
      return {
        segs: sliced,
        pad: Math.max(0, h - bunStringWidth(b)),
      };
    }
    l += p;
  }
  return {
    segs,
    pad: Math.max(0, width - l),
  };
}
//@ chunk-axsvbsqv.js:19862-20129 placement
function SegmentLine(props) {
  let $ = w(7);
  let { segs, width } = props;
  let d;
  let p;
  if ($[0] !== segs || $[1] !== width) {
    let { segs: segs_2, pad } = fitSegments(segs, width);
    d = segs_2.map(renderStyledLine);
    p = " ".repeat(pad);
    $[0] = segs;
    $[1] = width;
    $[2] = d;
    $[3] = p;
  } else {
    d = $[2];
    p = $[3];
  }
  let x;
  if ($[4] !== d || $[5] !== p) {
    x = jsxProd_default_2(Fragment, {
      children: [d, p],
    });
    $[4] = d;
    $[5] = p;
    $[6] = x;
  } else x = $[6];
  return x;
}
//@ chunk-axsvbsqv.js:20129-20530 placement
/**
 * 渲染带竖线边框的一行分段文本（超宽截断）。
 */
function BoxedSegmentLine(props) {
  let $ = w(7);
  let { segs, contentWidth } = props;
  let d;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    d = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", _S.pipe, " "],
    });
    $[0] = d;
  } else d = $[0];
  let p;
  if ($[1] !== contentWidth || $[2] !== segs) {
    p = jsxProd_default(SegmentLine, {
      segs,
      width: contentWidth,
    });
    $[1] = contentWidth;
    $[2] = segs;
    $[3] = p;
  } else p = $[3];
  let h;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", _S.pipe],
    });
    $[4] = h;
  } else h = $[4];
  let b;
  if ($[5] !== p) {
    b = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [d, p, h],
    });
    $[5] = p;
    $[6] = b;
  } else b = $[6];
  return b;
}
//@ chunk-axsvbsqv.js:20530-20654 placement
function formatScrollRange(scrollWindow, i) {
  let arrowUp = scrollWindow.from > 0 ? figures_default.arrowUp : " ";
  let arrowDown = scrollWindow.to < i ? figures_default.arrowDown : " ";
  return `${arrowUp} ${scrollWindow.from + 1}${Gxi}${scrollWindow.to} of ${i} ${arrowDown}`;
}
//@ chunk-axsvbsqv.js:20654-20887 placement
function ScrollRangeIndicator(props) {
  let $ = w(5);
  let { win, total } = props;
  let d;
  if ($[0] !== total || $[1] !== win) {
    d = formatScrollRange(win, total);
    $[0] = total;
    $[1] = win;
    $[2] = d;
  } else d = $[2];
  const children = `  ${d}`;
  let h;
  if ($[3] !== children) {
    h = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    $[3] = children;
    $[4] = h;
  } else h = $[4];
  return h;
}
//@ chunk-axsvbsqv.js:20887-23906 placement
/**
 * 工作流详情中的代理列表栏。
 */
function WorkflowAgentsPane(props) {
  let $ = w(53);
  let { phase, selectedAgent, level, contentWidth, viewport, tight, workflowActive, filterLabel } = props;
  let agents = phase.agents;
  let T;
  if ($[0] !== contentWidth) {
    T = HORIZONTAL_LINE_GLYPH.repeat(contentWidth + 2);
    $[0] = contentWidth;
    $[1] = T;
  } else T = $[1];
  let M = T;
  let I;
  let N;
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
    let scrollWindow = computeScrollWindow(selectedAgent, agents.length, viewport);
    N = [];
    let V = agentCountLabel(agents.length, filterLabel);
    if (tight) {
      let J = truncateToWidth(` \xB7 ${V}`, Math.max(1, contentWidth - 1));
      let max = Math.max(1, contentWidth - bunStringWidth(J));
      let text;
      if ($[14] !== phase.title || $[15] !== max) {
        text = truncateToWidth(phase.title, max);
        $[14] = phase.title;
        $[15] = max;
        $[16] = text;
      } else text = $[16];
      let B;
      if ($[17] !== text) {
        B = {
          text,
          color: "permission",
          bold: true,
        };
        $[17] = text;
        $[18] = B;
      } else B = $[18];
      let H;
      if ($[19] !== J) {
        H = {
          text: J,
          dimColor: true,
        };
        $[19] = J;
        $[20] = H;
      } else H = $[20];
      let segs;
      if ($[21] !== B || $[22] !== H) {
        segs = [B, H];
        $[21] = B;
        $[22] = H;
        $[23] = segs;
      } else segs = $[23];
      let pt;
      if ($[24] !== contentWidth || $[25] !== segs) {
        pt = jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs,
          },
          "title",
        );
        $[24] = contentWidth;
        $[25] = segs;
        $[26] = pt;
      } else pt = $[26];
      N.push(pt);
    } else {
      N.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: truncateToWidth(phase.title, contentWidth),
                color: "permission",
                bold: true,
              },
            ],
          },
          "title",
        ),
      );
      N.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: truncateToWidth(V, contentWidth),
                dimColor: true,
              },
            ],
          },
          "count",
        ),
      );
      N.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: "",
              },
            ],
          },
          "gap",
        ),
      );
    }
    let gt = N.length;
    if (agents.length === 0) {
      let text;
      if ($[27] !== filterLabel || $[28] !== phase) {
        text = describeEmptyAgentList(phase, filterLabel);
        $[27] = filterLabel;
        $[28] = phase;
        $[29] = text;
      } else text = $[29];
      let segs;
      if ($[30] !== text) {
        segs = [
          {
            text,
            dimColor: true,
          },
        ];
        $[30] = text;
        $[31] = segs;
      } else segs = $[31];
      let H;
      if ($[32] !== contentWidth || $[33] !== segs) {
        H = jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs,
          },
          "empty",
        );
        $[32] = contentWidth;
        $[33] = segs;
        $[34] = H;
      } else H = $[34];
      N.push(H);
    } else {
      let agentLabelWidth = getAgentLabelWidth(agents, contentWidth - 5);
      for (let from = scrollWindow.from; from < scrollWindow.to; from++) {
        let agent = agents[from];
        let isSelected = level === "agents" && from === selectedAgent;
        let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(agent, workflowActive));
        let ot = truncateToWidth(agent.label, agentLabelWidth);
        let rt = " ".repeat(Math.max(0, agentLabelWidth - bunStringWidth(ot)));
        let max = Math.max(0, contentWidth - (agentLabelWidth + 5));
        N.push(
          jsxProd_default(
            BoxedSegmentLine,
            {
              contentWidth,
              segs: [
                {
                  text: isSelected ? figures_default.pointer : " ",
                  color: "permission",
                },
                {
                  text: " ",
                },
                {
                  text: glyph,
                  color,
                },
                {
                  text: " ",
                },
                {
                  text: `${ot}${rt}`,
                  color: isSelected ? "permission" : undefined,
                  dimColor: !isSelected && isRunningState(agent),
                },
                {
                  text: " ",
                },
                ...renderAgentRowTail(agent, max, isSelected, workflowActive),
              ],
            },
            `a-${from}`,
          ),
        );
      }
    }
    let G = N.length - gt;
    for (let dt = G; dt < viewport; dt++)
      N.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: "",
              },
            ],
          },
          `pad-${dt}`,
        ),
      );
    if (agents.length > viewport) {
      let St = ` ${formatScrollRange(scrollWindow, agents.length)} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(St));
      let L;
      if ($[35] !== max) {
        L = HORIZONTAL_LINE_GLYPH.repeat(max);
        $[35] = max;
        $[36] = L;
      } else L = $[36];
      let B;
      if ($[37] !== L) {
        B = jsxProd_default_2(Text, {
          color: "text",
          children: [" ", Kk.bottomLeft, L],
        });
        $[37] = L;
        $[38] = B;
      } else B = $[38];
      let H;
      if ($[39] !== St) {
        H = jsxProd_default(Text, {
          dimColor: true,
          children: St,
        });
        $[39] = St;
        $[40] = H;
      } else H = $[40];
      let Y;
      if ($[41] === MEMO_CACHE_SENTINEL) {
        Y = jsxProd_default(Text, {
          color: "text",
          children: Kk.bottomRight,
        });
        $[41] = Y;
      } else Y = $[41];
      let pt;
      if ($[42] !== B || $[43] !== H) {
        pt = jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [B, H, Y],
        });
        $[42] = B;
        $[43] = H;
        $[44] = pt;
      } else pt = $[44];
      I = pt;
    } else {
      let L;
      if ($[45] !== M) {
        L = jsxProd_default_2(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", Kk.bottomLeft, M, Kk.bottomRight],
        });
        $[45] = M;
        $[46] = L;
      } else L = $[46];
      I = L;
    }
    $[2] = agents;
    $[3] = M;
    $[4] = contentWidth;
    $[5] = filterLabel;
    $[6] = level;
    $[7] = phase;
    $[8] = selectedAgent;
    $[9] = tight;
    $[10] = viewport;
    $[11] = workflowActive;
    $[12] = I;
    $[13] = N;
  } else {
    I = $[12];
    N = $[13];
  }
  let L;
  if ($[47] !== M) {
    L = jsxProd_default_2(Text, {
      color: "text",
      wrap: "truncate-end",
      children: [" ", Kk.topLeft, M, Kk.topRight],
    });
    $[47] = M;
    $[48] = L;
  } else L = $[48];
  let B;
  if ($[49] !== I || $[50] !== N || $[51] !== L) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [L, N, I],
    });
    $[49] = I;
    $[50] = N;
    $[51] = L;
    $[52] = B;
  } else B = $[52];
  return B;
}
//@ chunk-axsvbsqv.js:23906-24523 placement
/**
 * 渲染带竖线边框的两栏行，左右各自按宽度渲染分段文本。
 */
function TwoColumnRow(props) {
  let $ = w(12);
  let { left, right, leftWidth, rightWidth } = props;
  let leftEdge;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    leftEdge = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", _S.pipe, " "],
    });
    $[0] = leftEdge;
  } else leftEdge = $[0];
  let leftCell;
  if ($[1] !== left || $[2] !== leftWidth) {
    leftCell = jsxProd_default(SegmentLine, {
      segs: left,
      width: leftWidth,
    });
    $[1] = left;
    $[2] = leftWidth;
    $[3] = leftCell;
  } else leftCell = $[3];
  let separator;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    separator = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", _S.pipe, " "],
    });
    $[4] = separator;
  } else separator = $[4];
  let rightCell;
  if ($[5] !== right || $[6] !== rightWidth) {
    rightCell = jsxProd_default(SegmentLine, {
      segs: right,
      width: rightWidth,
    });
    $[5] = right;
    $[6] = rightWidth;
    $[7] = rightCell;
  } else rightCell = $[7];
  let rightEdge;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    rightEdge = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", _S.pipe],
    });
    $[8] = rightEdge;
  } else rightEdge = $[8];
  let row;
  if ($[9] !== leftCell || $[10] !== rightCell) {
    row = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [leftEdge, leftCell, separator, rightCell, rightEdge],
    });
    $[9] = leftCell;
    $[10] = rightCell;
    $[11] = row;
  } else row = $[11];
  return row;
}
//@ chunk-axsvbsqv.js:24523-24889 placement
/**
 * 渲染分节标题线：可选标签与标签尾注，其余用横线填满宽度。
 */
function renderSectionRule(o, i) {
  let l = [];
  let u = 0;
  if (i.label) {
    let h = ` ${truncateToWidth(i.label.text, Math.max(1, o - 2))} `;
    u += bunStringWidth(h);
    l.push(
      jsxProd_default(
        Text,
        {
          color: i.label.color ?? "text",
          bold: i.label.bold,
          children: h,
        },
        "label",
      ),
    );
  }
  let d = i.tag ? ` ${truncateToWidth(i.tag, Math.max(0, o - u - 2))} ` : "";
  let max = Math.max(0, o - u - bunStringWidth(d));
  l.push(
    jsxProd_default(
      Text,
      {
        color: "text",
        children: HORIZONTAL_LINE_GLYPH.repeat(max),
      },
      "dash",
    ),
  );
  if (d)
    l.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: d,
        },
        "tag",
      ),
    );
  return l;
}
//@ chunk-axsvbsqv.js:24889-25789 placement
function SplitPaneBorder(props) {
  let $ = w(20);
  let { pos, leftWidth, rightWidth, leftTitle, rightTitle, leftTag, rightTag } = props;
  let x = pos === "top" ? Kk.topLeft : Kk.bottomLeft;
  let children = pos === "top" ? _S.teeDown : _S.teeUp;
  let children_2 = pos === "top" ? Kk.topRight : Kk.bottomRight;
  let M;
  if ($[0] !== x) {
    M = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", x],
    });
    $[0] = x;
    $[1] = M;
  } else M = $[1];
  const I = leftWidth + 2;
  let N;
  if ($[2] !== leftTag || $[3] !== leftTitle || $[4] !== I) {
    N = renderSectionRule(I, {
      label: leftTitle
        ? {
            text: leftTitle,
          }
        : undefined,
      tag: leftTag,
    });
    $[2] = leftTag;
    $[3] = leftTitle;
    $[4] = I;
    $[5] = N;
  } else N = $[5];
  let E;
  if ($[6] !== children) {
    E = jsxProd_default(Text, {
      color: "text",
      children,
    });
    $[6] = children;
    $[7] = E;
  } else E = $[7];
  const V = rightWidth + 2;
  let J;
  if ($[8] !== rightTag || $[9] !== rightTitle || $[10] !== V) {
    J = renderSectionRule(V, {
      label: rightTitle
        ? {
            text: rightTitle,
          }
        : undefined,
      tag: rightTag,
    });
    $[8] = rightTag;
    $[9] = rightTitle;
    $[10] = V;
    $[11] = J;
  } else J = $[11];
  let z;
  if ($[12] !== children_2) {
    z = jsxProd_default(Text, {
      color: "text",
      children: children_2,
    });
    $[12] = children_2;
    $[13] = z;
  } else z = $[13];
  let L;
  if ($[14] !== M || $[15] !== N || $[16] !== E || $[17] !== J || $[18] !== z) {
    L = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [M, N, E, J, z],
    });
    $[14] = M;
    $[15] = N;
    $[16] = E;
    $[17] = J;
    $[18] = z;
    $[19] = L;
  } else L = $[19];
  return L;
}
//@ chunk-axsvbsqv.js:25789-26371 placement
/**
 * 渲染工作流阶段行：选中指针、状态符号（完成/失败/序号）、标题与完成进度。
 */
function renderPhaseRow(phase, index, selectedIndex, focus, width) {
  let isSelected = index === selectedIndex;
  let isDone = phase.status === "done";
  let isFailed = phase.status === "failed";
  let marker = isDone ? figures_default.tick : isFailed ? figures_default.cross : String(index + 1);
  let markerColor = isSelected ? "permission" : isDone ? "success" : isFailed ? "error" : "subtle";
  let progress = phase.totalCount > 0 ? `${phase.doneCount}/${phase.totalCount}` : "";
  let pointer = focus === "phases" && isSelected ? `${figures_default.pointer} ` : "  ";
  let prefixWidth = bunStringWidth(pointer) + bunStringWidth(marker) + 1;
  let progressWidth = progress ? 1 + bunStringWidth(progress) : 0;
  let title = truncateToWidth(phase.title, Math.max(1, width - prefixWidth - progressWidth));
  let max = Math.max(0, width - prefixWidth - bunStringWidth(title) - progressWidth);
  let notStarted = !isSelected && phase.status === "not-started";
  let segments = [
    {
      text: pointer,
      color: isSelected ? "permission" : undefined,
    },
    {
      text: marker,
      color: markerColor,
    },
    {
      text: " ",
    },
    {
      text: title,
      color: isSelected ? "permission" : undefined,
      dimColor: notStarted,
    },
    {
      text: " ".repeat(max),
    },
  ];
  if (progress)
    segments.push(
      {
        text: " ",
      },
      {
        text: progress,
        color: isSelected ? "permission" : "subtle",
      },
    );
  return segments;
}
//@ chunk-axsvbsqv.js:26371-26696 placement
/**
 * 生成代理列表中一行的分段：选中指针、状态符号、按宽度补齐的名称，以及右侧详情分段。
 */
function renderAgentRow(agent, i, clampedAgent, level, rightWidth, agentLabelWidth, now) {
  let isSelected = level === "agents" && i === clampedAgent;
  let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(agent, now));
  let v = truncateToWidth(agent.label, agentLabelWidth);
  let T = " ".repeat(Math.max(0, agentLabelWidth - bunStringWidth(v)));
  let max = Math.max(0, rightWidth - (agentLabelWidth + 4));
  return [
    {
      text: isSelected ? figures_default.pointer : " ",
      color: "permission",
    },
    {
      text: glyph,
      color,
    },
    {
      text: " ",
    },
    {
      text: `${v}${T}`,
      color: isSelected ? "permission" : undefined,
      dimColor: !isSelected && isRunningState(agent),
    },
    {
      text: " ",
    },
    ...renderAgentRowTail(agent, max, isSelected, now),
  ];
}
//@ chunk-axsvbsqv.js:26696-26933 placement
function renderCompactAgentRow(o, i, clampedAgent, leftWidth, workflowActive) {
  let p = i === clampedAgent;
  let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(o, workflowActive));
  let text = truncateToWidth(o.label, Math.max(1, leftWidth - 4));
  return [
    {
      text: p ? `${figures_default.pointer} ` : "  ",
      color: "permission",
    },
    {
      text: glyph,
      color,
    },
    {
      text: " ",
    },
    {
      text,
      color: p ? "permission" : undefined,
      dimColor: !p && isRunningState(o),
    },
  ];
}
//@ chunk-axsvbsqv.js:26933-28627 placement
function WorkflowPhasesPane(props) {
  let $ = w(41);
  let {
    phases,
    selectedPhase,
    clampedPhase,
    clampedAgent,
    level,
    leftWidth,
    rightWidth,
    viewport,
    workflowActive,
    filterLabel,
  } = props;
  let agents = selectedPhase.agents;
  let I;
  let N;
  let pos;
  let leftWidth_2;
  let rightWidth_2;
  let leftTag;
  let rightTag;
  let flexDirection;
  let H;
  let Y;
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
    let scrollWindow = computeScrollWindow(clampedPhase, phases.length, viewport);
    let scrollWindow_2 = computeScrollWindow(clampedAgent, agents.length, viewport);
    let agentLabelWidth = getAgentLabelWidth(agents, rightWidth - 4);
    let ft = [];
    for (let idx = 0; idx < viewport; idx++) {
      let index = scrollWindow.from + idx;
      let U = scrollWindow_2.from + idx;
      let left =
        index < scrollWindow.to ? renderPhaseRow(phases[index], index, clampedPhase, level, leftWidth) : [];
      let ot;
      if (U < scrollWindow_2.to)
        ot = renderAgentRow(agents[U], U, clampedAgent, level, rightWidth, agentLabelWidth, workflowActive);
      else if (agents.length === 0 && idx === 0)
        ot = [
          {
            text: describeEmptyAgentList(selectedPhase, filterLabel),
            dimColor: true,
          },
        ];
      else ot = [];
      ft.push(
        jsxProd_default(
          TwoColumnRow,
          {
            left,
            right: ot,
            leftWidth,
            rightWidth,
          },
          idx,
        ),
      );
    }
    const title = selectedPhase.title;
    let W;
    if ($[21] !== agents.length || $[22] !== filterLabel) {
      W = agentCountLabel(agents.length, filterLabel);
      $[21] = agents.length;
      $[22] = filterLabel;
      $[23] = W;
    } else W = $[23];
    let rightTitle = `${title} \xB7 ${W}`;
    N = Box;
    flexDirection = "column";
    if ($[24] !== leftWidth || $[25] !== rightTitle || $[26] !== rightWidth) {
      H = jsxProd_default(SplitPaneBorder, {
        pos: "top",
        leftWidth,
        rightWidth,
        leftTitle: "Phases",
        rightTitle,
      });
      $[24] = leftWidth;
      $[25] = rightTitle;
      $[26] = rightWidth;
      $[27] = H;
    } else H = $[27];
    Y = ft;
    I = SplitPaneBorder;
    pos = "bottom";
    leftWidth_2 = leftWidth;
    rightWidth_2 = rightWidth;
    leftTag = phases.length > viewport ? formatScrollRange(scrollWindow, phases.length) : undefined;
    rightTag = agents.length > viewport ? formatScrollRange(scrollWindow_2, agents.length) : undefined;
    $[0] = agents;
    $[1] = clampedAgent;
    $[2] = clampedPhase;
    $[3] = filterLabel;
    $[4] = leftWidth;
    $[5] = level;
    $[6] = phases;
    $[7] = rightWidth;
    $[8] = selectedPhase;
    $[9] = viewport;
    $[10] = workflowActive;
    $[11] = I;
    $[12] = N;
    $[13] = pos;
    $[14] = leftWidth_2;
    $[15] = rightWidth_2;
    $[16] = leftTag;
    $[17] = rightTag;
    $[18] = flexDirection;
    $[19] = H;
    $[20] = Y;
  } else {
    I = $[11];
    N = $[12];
    pos = $[13];
    leftWidth_2 = $[14];
    rightWidth_2 = $[15];
    leftTag = $[16];
    rightTag = $[17];
    flexDirection = $[18];
    H = $[19];
    Y = $[20];
  }
  let rt;
  if (
    $[28] !== I ||
    $[29] !== pos ||
    $[30] !== leftWidth_2 ||
    $[31] !== rightWidth_2 ||
    $[32] !== leftTag ||
    $[33] !== rightTag
  ) {
    rt = jsxProd_default(I, {
      pos,
      leftWidth: leftWidth_2,
      rightWidth: rightWidth_2,
      leftTag,
      rightTag,
    });
    $[28] = I;
    $[29] = pos;
    $[30] = leftWidth_2;
    $[31] = rightWidth_2;
    $[32] = leftTag;
    $[33] = rightTag;
    $[34] = rt;
  } else rt = $[34];
  let W;
  if ($[35] !== N || $[36] !== flexDirection || $[37] !== H || $[38] !== Y || $[39] !== rt) {
    W = jsxProd_default_2(N, {
      flexDirection,
      children: [H, Y, rt],
    });
    $[35] = N;
    $[36] = flexDirection;
    $[37] = H;
    $[38] = Y;
    $[39] = rt;
    $[40] = W;
  } else W = $[40];
  return W;
}
//@ chunk-axsvbsqv.js:28627-28662 placement
var WORKFLOW_INDENT_STEP = 2;
var MAX_AGENT_ROWS = 20;
var WORKFLOW_SPINNER_FRAMES = MAX_TRANSCRIPT_TOOL_RESULTS;
var REFRESH_FAST_MS = 100;
var REFRESH_SLOW_MS = 250;
//@ chunk-axsvbsqv.js:28662-29466 placement
function useWorkflowAgentTranscript(workflowRunId, agentId, lastProgressAt, promptFramed) {
  let $ = w(13);
  let [d, p] = y(null);
  let b = Se(clockContext)?.setTimeout ?? defaultSetTimeout;
  let x = R(undefined);
  let A = R(0);
  let v = R(0);
  let T = R(null);
  let I;
  let N;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    I = () => () => {
      T.current = null;
    };
    N = [];
    $[0] = I;
    $[1] = N;
  } else {
    I = $[0];
    N = $[1];
  }
  P(I, N);
  let E;
  if ($[2] !== agentId || $[3] !== promptFramed || $[4] !== b || $[5] !== workflowRunId) {
    E = () => {
      if (!workflowRunId || !agentId) {
        return;
      }
      T.current = {
        runId: workflowRunId,
        agentId,
      };
      let V = (A.current = A.current + 1);
      let z = () => {
        readWorkflowAgentTranscript(workflowRunId, agentId, {
          promptFramed,
        })
          .catch(renderNothing)
          .then((transcript) => {
            if (V > v.current && T.current?.runId === workflowRunId && T.current.agentId === agentId) {
              v.current = V;
              x.current = agentId;
              p({
                agentId,
                transcript,
              });
            }
          });
      };
      if (x.current === agentId) {
        return b(z, REFRESH_SLOW_MS);
      }
      z();
    };
    $[2] = agentId;
    $[3] = promptFramed;
    $[4] = b;
    $[5] = workflowRunId;
    $[6] = E;
  } else E = $[6];
  let L;
  if (
    $[7] !== agentId ||
    $[8] !== promptFramed ||
    $[9] !== lastProgressAt ||
    $[10] !== b ||
    $[11] !== workflowRunId
  ) {
    L = [workflowRunId, agentId, lastProgressAt, promptFramed, b];
    $[7] = agentId;
    $[8] = promptFramed;
    $[9] = lastProgressAt;
    $[10] = b;
    $[11] = workflowRunId;
    $[12] = L;
  } else L = $[12];
  P(E, L);
  if (!workflowRunId || !agentId) {
    return null;
  }
  if (!d || d.agentId !== agentId) {
    return "loading";
  }
  return d.transcript;
}
//@ chunk-axsvbsqv.js:29466-29603 placement
function wrapLines(o, i) {
  let l = [];
  for (let line of o.split(`
`)) {
    if (line === "") {
      l.push("");
      continue;
    }
    for (let d of splitByDisplayWidth(line, Math.max(1, i))) l.push(d);
  }
  return l;
}
//@ chunk-axsvbsqv.js:29603-30006 placement
/**
 * 渲染可折叠段：标题（超过折叠行数时显示总行数与展开提示）、正文（折叠时截取）与剩余行提示，返回隐藏行数。
 */
function pushCollapsibleSection({ lines, title, body, collapsedLines, expanded, indent, width }) {
  let b = body.length - collapsedLines;
  let x = b >= 2 ? b : 0;
  let A = [
    {
      text: title,
      bold: true,
      dimColor: true,
    },
  ];
  if (x > 0)
    A.push({
      text: truncateToWidth(
        ` \xB7 ${body.length} lines${expanded ? "" : ` \xB7 ${RETURN_SYMBOL} expand`}`,
        width - bunStringWidth(title),
      ),
      dimColor: true,
    });
  lines.push(A);
  let v = expanded || x === 0 ? body : body.slice(0, collapsedLines);
  for (let T of v) lines.push(T);
  if (!expanded && x > 0)
    lines.push([
      {
        text: truncateToWidth(`${indent}\u2026 ${x} more ${plural(x, "line")}`, width),
        dimColor: true,
      },
    ]);
  return x;
}
//@ chunk-axsvbsqv.js:30006-30087 placement
function addPrecedingGrowth(scroll, folds) {
  let l = 0;
  for (let u of folds) {
    if (scroll < u.end) break;
    l += u.growth;
  }
  return scroll + l;
}
//@ chunk-axsvbsqv.js:30087-30207 placement
function mapRowThroughGrowth(scroll, folds) {
  let l = 0;
  for (let u of folds) {
    let d = u.end + l;
    if (scroll < d) break;
    if (scroll < d + u.growth) return u.end;
    l += u.growth;
  }
  return scroll - l;
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
//@ chunk-axsvbsqv.js:30341-34482 placement
/**
 * 工作流详情中的代理卡片。
 */
function WorkflowAgentCard({ agent, status, transcript, expanded, width, nowMs }) {
  let h = [];
  let b = "  ";
  let max = Math.max(8, width - 2);
  let A = transcript === "loading" ? null : transcript;
  let { glyph, color } = getAgentStateGlyph(status);
  let M = [];
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
        ? agent.label.endsWith(USAGE_LIMIT_SUFFIX)
          ? USAGE_LIMIT_TEXT
          : "throttled"
        : agent.lastAttemptReason === "user-retry"
          ? "user retry"
          : "stalled";
    M.push(`attempt ${agent.attempt} (${W})`);
  }
  let I = bunStringWidth(glyph) + 1 + bunStringWidth(AGENT_STATE_LABELS[status]);
  let N = M.length > 0 ? truncateToWidth(` \xB7 ${M.join(" \xB7 ")}`, Math.max(0, width - I)) : "";
  h.push([
    {
      text: glyph,
      color,
    },
    {
      text: " ",
    },
    {
      text: AGENT_STATE_LABELS[status],
      color,
      bold: true,
    },
    ...(N
      ? [
          {
            text: N,
            dimColor: true,
          },
        ]
      : []),
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
  if (E.length > 0)
    h.push([
      {
        text: truncateToWidth(E.join(" \xB7 "), width),
        dimColor: true,
      },
    ]);
  h.push([
    {
      text: "",
    },
  ]);
  let toolCalls = status !== "queued" && A ? A.toolCalls : [];
  let J = status === "running";
  let filtered = toolCalls.filter((toolCall) => getCallDisplayState(toolCall, J) === "running");
  let L = toolCalls;
  let tasks = A?.tasks ?? [];
  let H =
    tasks.length > 0
      ? WorkflowTaskList({
          tasks,
          expanded: false,
          width,
          indent: "  ",
        })
      : null;
  let Y =
    tasks.length > 0
      ? WorkflowTaskList({
          tasks,
          expanded: true,
          width,
          indent: "  ",
        })
      : null;
  let pt = expanded ? Y : H;
  let gt = L.length > 0 || (pt?.capped ?? false);
  let wt = transcript !== "loading" && transcript?.prompt ? transcript.prompt : (agent.promptPreview ?? "");
  let body = wt
    ? wrapLines(wt, max).map((W) => [
        {
          text: "  " + W,
          dimColor: true,
        },
      ])
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
            dimColor: true,
          },
        ],
      ];
  let at = pushCollapsibleSection({
    lines: h,
    title: "Prompt",
    body,
    collapsedLines: WORKFLOW_INDENT_STEP,
    expanded,
    indent: "  ",
    width,
  });
  let ct = at > 0 ? at - 1 : 0;
  let U = ct;
  let X = [
    {
      end: h.length - (expanded ? U : 0),
      growth: ct,
    },
  ];
  h.push([
    {
      text: "",
    },
  ]);
  if (pt && H && Y) {
    for (let line of pt.lines) h.push(line);
    let W = Y.lines.length - H.lines.length;
    U += W;
    X.push({
      end: h.length - (expanded ? U : 0),
      growth: W,
    });
    h.push([
      {
        text: "",
      },
    ]);
  }
  if (status !== "queued") {
    let W = L.length - WORKFLOW_SPINNER_FRAMES;
    let max = Math.max(0, W - WORKFLOW_SPINNER_FRAMES);
    while (false) W--;
    let filtered = L.filter((Rt, yt) => yt >= W || getCallDisplayState(Rt, J) === "running");
    let St = [];
    for (let [Rt, yt] of filtered.entries()) {
      if (Rt > 0)
        St.push([
          {
            text: "",
          },
        ]);
      let state = getCallDisplayState(yt, J);
      St.push(
        ...renderWorkflowCallLines({
          call: yt,
          state,
          width,
          indent: "  ",
        }),
      );
    }
    let kt = "";
    if (L.length > filtered.length)
      kt = ` \xB7 ${filtered.length <= WORKFLOW_SPINNER_FRAMES ? "last " : ""}${filtered.length} of ${L.length} tool calls`;
    let max_2 = Math.max(0, width - bunStringWidth("Activity"));
    let ee = ` \xB7 ${RETURN_SYMBOL} expand`;
    kt =
      !expanded && gt && bunStringWidth(kt) + bunStringWidth(ee) <= max_2
        ? kt + ee
        : truncateToWidth(kt, max_2);
    h.push([
      {
        text: "Activity",
        bold: true,
        dimColor: true,
      },
      ...(kt
        ? [
            {
              text: kt,
              dimColor: true,
            },
          ]
        : []),
    ]);
    if (L.length > 0) {
      if (expanded) for (let yt of St) h.push(yt);
      else
        for (let yt of filtered) {
          let state = getCallDisplayState(yt, J);
          h.push(
            renderWorkflowCallHeader({
              call: yt,
              state,
              width,
              indent: "  ",
            }),
          );
        }
      let Rt = St.length - filtered.length;
      U += Rt;
      X.push({
        end: h.length - (expanded ? U : 0),
        growth: Rt,
      });
    } else if (agent.lastToolName != null) {
      let Rt = agent.lastToolSummary ? `(${agent.lastToolSummary})` : "";
      let yt = identity(agent.lastToolName);
      h.push([
        {
          text: truncateToWidth(`  ${yt}${Rt}`, width),
          dimColor: true,
        },
      ]);
    } else
      h.push([
        {
          text: `  ${status === "running" ? "No tool calls yet." : "No tool calls."}`,
          dimColor: true,
        },
      ]);
    h.push([
      {
        text: "",
      },
    ]);
  }
  let ot = [];
  switch (status) {
    case "queued":
      ot.push([
        {
          text: "  Waiting for an agent slot.",
          dimColor: true,
        },
      ]);
      break;
    case "running":
      ot.push([
        {
          text: `${"  "}Still running\u2026`,
          dimColor: true,
        },
      ]);
      break;
    case "interrupted":
      ot.push([
        {
          text: "  The workflow stopped before this agent finished.",
          dimColor: true,
        },
      ]);
      break;
    case "skipped":
      ot.push([
        {
          text: "  Skipped by user.",
          dimColor: true,
        },
      ]);
      break;
    case "blocked":
    case "failed": {
      for (let W of wrapLines(agent.error ?? "failed", max))
        ot.push([
          {
            text: "  " + W,
            color: "error",
          },
        ]);
      break;
    }
    case "done": {
      let W =
        transcript !== "loading" && transcript?.finalText
          ? transcript.finalText
          : (agent.resultPreview ?? "");
      if (!W) {
        ot.push([
          {
            text: "  " + (transcript === "loading" ? "Loading\u2026" : "(empty)"),
            dimColor: true,
          },
        ]);
        break;
      }
      let G = renderJsonOutcomeLines(W, max);
      if (G)
        for (let dt of G)
          ot.push([
            {
              text: "  ",
            },
            ...dt,
          ]);
      else
        for (let dt of wrapLines(W, max))
          ot.push([
            {
              text: "  " + dt,
            },
          ]);
      break;
    }
  }
  let rt = pushCollapsibleSection({
    lines: h,
    title: "Outcome",
    body: ot,
    collapsedLines: MAX_AGENT_ROWS,
    expanded,
    indent: "  ",
    width,
  });
  return {
    lines: h,
    expandable: at > 0 || rt > 0 || gt,
    folds: X,
    detailExpandable: gt,
  };
}
//@ chunk-axsvbsqv.js:34482-36147 placement
function WorkflowAgentDetailPane(props) {
  let $ = w(42);
  let {
    phase,
    clampedAgent,
    agentLabel,
    detailLines,
    cardScroll,
    leftWidth,
    rightWidth,
    viewport,
    workflowActive,
    filterLabel,
  } = props;
  let agents = phase.agents;
  let I;
  let N;
  let pos;
  let leftWidth_2;
  let rightWidth_2;
  let leftTag;
  let rightTag;
  let flexDirection;
  let H;
  let Y;
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
    let scrollWindow = computeScrollWindow(clampedAgent, agents.length, viewport);
    let max = Math.max(0, detailLines.length - viewport);
    let wt = clamp(cardScroll, 0, max);
    let min = Math.min(detailLines.length, wt + viewport);
    let at = [];
    for (let idx = 0; idx < viewport; idx++) {
      let U = scrollWindow.from + idx;
      let left =
        U < scrollWindow.to
          ? renderCompactAgentRow(agents[U], U, clampedAgent, leftWidth, workflowActive)
          : [];
      let ot = wt + idx;
      let right = ot < min ? detailLines[ot] : [];
      at.push(
        jsxProd_default(
          TwoColumnRow,
          {
            left,
            right,
            leftWidth,
            rightWidth,
          },
          idx,
        ),
      );
    }
    N = Box;
    flexDirection = "column";
    const title = phase.title;
    let G;
    if ($[21] !== agents.length || $[22] !== filterLabel) {
      G = agentCountLabel(agents.length, filterLabel);
      $[21] = agents.length;
      $[22] = filterLabel;
      $[23] = G;
    } else G = $[23];
    const leftTitle = `${title} \xB7 ${G}`;
    if ($[24] !== agentLabel || $[25] !== leftWidth || $[26] !== rightWidth || $[27] !== leftTitle) {
      H = jsxProd_default(SplitPaneBorder, {
        pos: "top",
        leftWidth,
        rightWidth,
        leftTitle,
        rightTitle: agentLabel,
      });
      $[24] = agentLabel;
      $[25] = leftWidth;
      $[26] = rightWidth;
      $[27] = leftTitle;
      $[28] = H;
    } else H = $[28];
    Y = at;
    I = SplitPaneBorder;
    pos = "bottom";
    leftWidth_2 = leftWidth;
    rightWidth_2 = rightWidth;
    leftTag = agents.length > viewport ? formatScrollRange(scrollWindow, agents.length) : undefined;
    rightTag =
      detailLines.length > viewport
        ? formatScrollRange(
            {
              from: wt,
              to: min,
            },
            detailLines.length,
          )
        : undefined;
    $[0] = agentLabel;
    $[1] = agents;
    $[2] = cardScroll;
    $[3] = clampedAgent;
    $[4] = detailLines;
    $[5] = filterLabel;
    $[6] = leftWidth;
    $[7] = phase.title;
    $[8] = rightWidth;
    $[9] = viewport;
    $[10] = workflowActive;
    $[11] = I;
    $[12] = N;
    $[13] = pos;
    $[14] = leftWidth_2;
    $[15] = rightWidth_2;
    $[16] = leftTag;
    $[17] = rightTag;
    $[18] = flexDirection;
    $[19] = H;
    $[20] = Y;
  } else {
    I = $[11];
    N = $[12];
    pos = $[13];
    leftWidth_2 = $[14];
    rightWidth_2 = $[15];
    leftTag = $[16];
    rightTag = $[17];
    flexDirection = $[18];
    H = $[19];
    Y = $[20];
  }
  let W;
  if (
    $[29] !== I ||
    $[30] !== pos ||
    $[31] !== leftWidth_2 ||
    $[32] !== rightWidth_2 ||
    $[33] !== leftTag ||
    $[34] !== rightTag
  ) {
    W = jsxProd_default(I, {
      pos,
      leftWidth: leftWidth_2,
      rightWidth: rightWidth_2,
      leftTag,
      rightTag,
    });
    $[29] = I;
    $[30] = pos;
    $[31] = leftWidth_2;
    $[32] = rightWidth_2;
    $[33] = leftTag;
    $[34] = rightTag;
    $[35] = W;
  } else W = $[35];
  let G;
  if ($[36] !== N || $[37] !== flexDirection || $[38] !== H || $[39] !== Y || $[40] !== W) {
    G = jsxProd_default_2(N, {
      flexDirection,
      children: [H, Y, W],
    });
    $[36] = N;
    $[37] = flexDirection;
    $[38] = H;
    $[39] = Y;
    $[40] = W;
    $[41] = G;
  } else G = $[41];
  return G;
}
//@ chunk-axsvbsqv.js:36147-38187 placement
function WorkflowAgentDetail(props) {
  let $ = w(43);
  let { agentLabel, position, detailLines, cardScroll, contentWidth, viewport } = props;
  let x;
  if ($[0] !== contentWidth) {
    x = HORIZONTAL_LINE_GLYPH.repeat(contentWidth + 2);
    $[0] = contentWidth;
    $[1] = x;
  } else x = $[1];
  let A = x;
  let max = Math.max(0, detailLines.length - viewport);
  let T;
  let M;
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
    let I = clamp(cardScroll, 0, max);
    let min = Math.min(detailLines.length, I + viewport);
    M = [];
    let E = ` \xB7 ${position}`;
    const max_2 = Math.max(1, contentWidth - bunStringWidth(E));
    let text;
    if ($[12] !== agentLabel || $[13] !== max_2) {
      text = truncateToWidth(agentLabel, max_2);
      $[12] = agentLabel;
      $[13] = max_2;
      $[14] = text;
    } else text = $[14];
    let z;
    if ($[15] !== text) {
      z = {
        text,
        color: "permission",
        bold: true,
      };
      $[15] = text;
      $[16] = z;
    } else z = $[16];
    let L;
    if ($[17] !== E) {
      L = {
        text: E,
        dimColor: true,
      };
      $[17] = E;
      $[18] = L;
    } else L = $[18];
    let segs;
    if ($[19] !== z || $[20] !== L) {
      segs = [z, L];
      $[19] = z;
      $[20] = L;
      $[21] = segs;
    } else segs = $[21];
    let H;
    if ($[22] !== contentWidth || $[23] !== segs) {
      H = jsxProd_default(
        BoxedSegmentLine,
        {
          contentWidth,
          segs,
        },
        "title",
      );
      $[22] = contentWidth;
      $[23] = segs;
      $[24] = H;
    } else H = $[24];
    M.push(H);
    for (let Y = I; Y < min; Y++)
      M.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: detailLines[Y],
          },
          `l-${Y}`,
        ),
      );
    for (let idx = min - I; idx < viewport; idx++)
      M.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: "",
              },
            ],
          },
          `pad-${idx}`,
        ),
      );
    if (detailLines.length > viewport) {
      let gt = ` ${formatScrollRange(
        {
          from: I,
          to: min,
        },
        detailLines.length,
      )} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(gt));
      let ft;
      if ($[25] !== max) {
        ft = HORIZONTAL_LINE_GLYPH.repeat(max);
        $[25] = max;
        $[26] = ft;
      } else ft = $[26];
      let at;
      if ($[27] !== ft) {
        at = jsxProd_default_2(Text, {
          color: "text",
          children: [" ", Kk.bottomLeft, ft],
        });
        $[27] = ft;
        $[28] = at;
      } else at = $[28];
      let ct;
      if ($[29] !== gt) {
        ct = jsxProd_default(Text, {
          dimColor: true,
          children: gt,
        });
        $[29] = gt;
        $[30] = ct;
      } else ct = $[30];
      let U;
      if ($[31] === MEMO_CACHE_SENTINEL) {
        U = jsxProd_default(Text, {
          color: "text",
          children: Kk.bottomRight,
        });
        $[31] = U;
      } else U = $[31];
      let X;
      if ($[32] !== ct || $[33] !== at) {
        X = jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [at, ct, U],
        });
        $[32] = ct;
        $[33] = at;
        $[34] = X;
      } else X = $[34];
      T = X;
    } else {
      let ft;
      if ($[35] !== A) {
        ft = jsxProd_default_2(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", Kk.bottomLeft, A, Kk.bottomRight],
        });
        $[35] = A;
        $[36] = ft;
      } else ft = $[36];
      T = ft;
    }
    $[2] = agentLabel;
    $[3] = A;
    $[4] = cardScroll;
    $[5] = contentWidth;
    $[6] = detailLines;
    $[7] = max;
    $[8] = position;
    $[9] = viewport;
    $[10] = T;
    $[11] = M;
  } else {
    T = $[10];
    M = $[11];
  }
  let V;
  if ($[37] !== A) {
    V = jsxProd_default_2(Text, {
      color: "text",
      wrap: "truncate-end",
      children: [" ", Kk.topLeft, A, Kk.topRight],
    });
    $[37] = A;
    $[38] = V;
  } else V = $[38];
  let J;
  if ($[39] !== T || $[40] !== M || $[41] !== V) {
    J = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [V, M, T],
    });
    $[39] = T;
    $[40] = M;
    $[41] = V;
    $[42] = J;
  } else J = $[42];
  return J;
}
//@ chunk-axsvbsqv.js:38187-44815 placement
/**
 * WorkflowDetailDialog：工作流详情对话框，阶段/代理两栏，支持暂停、恢复、跳过与重试代理。
 */
function WorkflowDetailDialog({
  workflow,
  onDone,
  onBack,
  onKill,
  onSkipAgent,
  onRetryAgent,
  onPause,
  onResume,
  initialPhaseIndex,
  promptVisibleBelow = false,
}) {
  useRegisterOverlay("workflow-detail-dialog");
  let { availableRows, width, rows } = useWorkflowProgressRows(promptVisibleBelow);
  let max = Math.max(12, width - 6);
  let N = ElapsedClock(workflow);
  let E = Q(() => workflowPhaseRows(workflow), [workflow.workflowProgress, workflow.phases]);
  let V = Q(() => sumPhaseCounts(E, workflow.agentCount), [E, workflow.agentCount]);
  let [J, z] = y(() => (initialPhaseIndex !== undefined ? Math.max(0, initialPhaseIndex) : 0));
  let [L, B] = y(0);
  let [H, Y] = y(initialPhaseIndex !== undefined ? "agents" : "phases");
  let [pt, gt] = y(false);
  let [wt, ft] = y({
    scroll: 0,
    expanded: false,
  });
  let { scroll, expanded } = wt;
  let [U, X] = y("all");
  let min = Math.min(J, Math.max(0, E.length - 1));
  let rt = E[min];
  let W = workflow.status === "running";
  let G = Q(() => {
    if (!rt || U === "all" || H === "phases") return rt;
    return {
      ...rt,
      agents: rt.agents.filter((agent) => getAgentDisplayState(agent, W) === U),
    };
  }, [rt, U, H, W]);
  let dt = G ? Math.min(L, Math.max(0, G.agents.length - 1)) : 0;
  let [St, kt] = y(false);
  let zt = workflow.script.length > 0;
  let defaultName = Q(() => {
    if (!zt) return "";
    let workflowScript = parseWorkflowScript(workflow.script);
    if (!("error" in workflowScript)) return workflowScript.meta.name;
    return slugifyWorkflowName(workflow.summary ?? workflow.description);
  }, [zt, workflow.script, workflow.summary, workflow.description]);
  let Rt = Q(() => workflowDescription(workflow), [workflow.script, workflow.description, workflow.summary]);
  let { name: yt, subtext, stats } = workflowStatusLine(workflow, Rt, V, N);
  function fe() {
    ft({
      scroll: 0,
      expanded: false,
    });
  }
  function qe(K) {
    z((Ct) => clamp(clamp(Ct, 0, E.length - 1) + K, 0, E.length - 1));
    B(0);
    fe();
  }
  function sn(K) {
    if (!G) return;
    B((Ct) => clamp(clamp(Ct, 0, G.agents.length - 1) + K, 0, G.agents.length - 1));
    fe();
  }
  function po(K) {
    ft((Ct) => ({
      ...Ct,
      scroll: Math.max(0, Ct.scroll + K),
    }));
  }
  function oe(K) {
    if (H === "phases") {
      qe(K);
      return;
    }
    sn(K);
  }
  function fo() {
    gt(false);
    if (H === "agent") {
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
    if (rt && rt.agents.length > 0) {
      B(0);
      X("all");
      Y("agents");
    }
  }
  function mo() {
    if (!st || !rt) return;
    if (U !== "all") {
      X("all");
      B(rt.agents.indexOf(st));
    }
    fe();
    if (workflowAgentTranscript === "loading") gt(true);
    else Y("agent");
  }
  function go() {
    if (!rt || pt) return;
    let K = new Set(rt.agents.map((agent) => getAgentDisplayState(agent, W)));
    X((Ct) => {
      let index = WORKFLOW_TASK_FILTERS.indexOf(Ct);
      for (let idx = 0; idx < WORKFLOW_TASK_FILTERS.length; idx++) {
        index = (index + 1) % WORKFLOW_TASK_FILTERS.length;
        let ls = WORKFLOW_TASK_FILTERS[index];
        if (ls === "all" || K.has(ls)) break;
      }
      return WORKFLOW_TASK_FILTERS[index];
    });
    B(0);
    fe();
  }
  let st = H !== "phases" && G ? G.agents[dt] : undefined;
  let Yt = st ? getAgentDisplayState(st, W) : undefined;
  let ve = !!st && isRunningState(st) && !!st.agentId && !!onSkipAgent;
  let We = !!st && isRunningState(st) && !!st.agentId && !!onRetryAgent;
  let se = width - 9;
  let cn = G ? Math.max(14, ...G.agents.map((agent) => 4 + bunStringWidth(agent.label))) : 14;
  let max_2 = Math.max(12, Math.min(30, cn, se - 30));
  let ho = se - max_2;
  let pn = H === "agent" && E.length > 0 && width >= 64 && ho >= 30;
  let Yr = pn ? ho : max;
  let workflowAgentTranscript = useWorkflowAgentTranscript(
    workflow.workflowRunId,
    st?.agentId,
    st?.lastProgressAt,
    st?.promptFramed,
  );
  let timeout = useTimeout(pt ? REFRESH_FAST_MS : null);
  if (pt) {
    if (!st) gt(false);
    else if (workflowAgentTranscript !== "loading" || timeout) {
      gt(false);
      Y("agent");
    }
  }
  let Qr = Yt === "queued" || Yt === "running" ? Math.floor(Date.now() / 1000) * 1000 : 0;
  let Ue = Q(
    () =>
      H === "agent" && st && Yt
        ? WorkflowAgentCard({
            agent: st,
            status: Yt,
            transcript: workflowAgentTranscript,
            expanded,
            width: Yr,
            nowMs: Qr,
          })
        : {
            lines: [],
            expandable: false,
            folds: [],
            detailExpandable: false,
          },
    [H, st, Yt, workflowAgentTranscript, expanded, Yr, Qr],
  );
  let lines = Ue.lines;
  function Pi() {
    if (st && isRunningState(st) && st.agentId) onSkipAgent?.(st.agentId);
  }
  function Ni() {
    if (st && isRunningState(st) && st.agentId) onRetryAgent?.(st.agentId);
  }
  MessageActionsKeybindings(
    {
      "confirm:previous": () => oe(-1),
      "confirm:next": () => oe(1),
    },
    {
      context: "Confirmation",
    },
  );
  let fn = workflow.status === "running" && !!onPause;
  let mn = workflow.status === "paused" && !!workflow.scriptPath && !!workflow.workflowRunId && !!onResume;
  let Xr = workflow.status === "running" && !!onKill && H === "phases";
  function Oi() {
    if (fn) onPause?.();
    else if (mn) onResume?.(buildResumePrompt(workflow));
  }
  let onKeyDown = (event) => {
    if (event.ctrl || event.meta) return;
    if (event.key === "j") {
      event.preventDefault();
      if (H === "agent") po(1);
      else oe(1);
    } else if (event.key === "k") {
      event.preventDefault();
      if (H === "agent") po(-1);
      else oe(-1);
    } else if (event.key === "return" || event.key === "right") {
      event.preventDefault();
      if (H === "phases") an();
      else if (H === "agents") mo();
      else if (event.key === "return" && Ue.expandable) {
        if (!expanded && Ue.detailExpandable) logFeatureOk("workflow_agent_card_detail");
        let { folds } = Ue;
        ft(({ scroll, expanded }) => ({
          expanded: !expanded,
          scroll: expanded ? mapRowThroughGrowth(scroll, folds) : addPrecedingGrowth(scroll, folds),
        }));
      }
    } else if (event.key === "left") {
      event.preventDefault();
      fo();
    } else if (event.key === "r" && We) {
      event.preventDefault();
      Ni();
    } else if (event.key === "x" && ve) {
      event.preventDefault();
      Pi();
    } else if (event.key === "x" && Xr) {
      event.preventDefault();
      onKill?.();
    } else if (event.key === " ") {
      event.preventDefault();
      onDone();
    } else if (event.key === "p" && (fn || mn)) {
      event.preventDefault();
      Oi();
    } else if (event.key === "f" && H === "agents") {
      event.preventDefault();
      go();
    } else if (event.key === "s" && zt) {
      event.preventDefault();
      kt(true);
    }
  };
  let wo = E.length > 0;
  if (St)
    return jsxProd_default(WorkflowSaveDialog, {
      script: workflow.script,
      defaultName,
      onDone: (K) => {
        if (K) onDone(K);
        else kt(false);
      },
    });
  let Qt = availableRows < 18;
  let Zr = availableRows - (Qt ? 8 : 11);
  let max_3 = Math.max(1, Zr - 3);
  let gn = E.length > max_3;
  let es = gn ? Math.max(1, max_3 - 1) : E.length;
  let viewport = Math.max(1, Zr - es - (gn ? 1 : 0));
  let scrollWindow = computeScrollWindow(min, E.length, es);
  let max_4 = Math.max(
    14,
    ...E.map((K, Ct) => {
      let Mt =
        K.status === "done"
          ? figures_default.tick
          : K.status === "failed"
            ? figures_default.cross
            : String(Ct + 1);
      let le = K.totalCount > 0 ? `${K.doneCount}/${K.totalCount}` : "";
      return 2 + bunStringWidth(Mt) + 1 + bunStringWidth(K.title) + (le ? 1 + bunStringWidth(le) : 0);
    }),
  );
  let max_5 = Math.max(12, Math.min(34, max_4, se - 24));
  let ns = se - max_5;
  let Hi = H !== "agent" && wo && width >= 64 && ns >= 20;
  let max_6 = Math.max(1, availableRows - (Qt ? 7 : 8));
  let max_7 = Math.max(3, availableRows - (Qt ? 8 : 9));
  let ss = pn ? max_6 : max_7;
  let max_8 = Math.max(0, lines.length - ss);
  if (scroll > max_8)
    ft({
      scroll: max_8,
      expanded,
    });
  let Je = U !== "all" && H !== "phases" ? AGENT_STATE_LABELS[U].toLowerCase() : undefined;
  let Wt = [];
  if (H === "agent") {
    Wt.push(`${UP_ARROW}${DOWN_ARROW} agent`);
    if (lines.length > ss) Wt.push("j/k scroll");
    if (Ue.expandable) Wt.push(`${RETURN_SYMBOL} ${expanded ? "collapse" : "expand"}`);
  } else if (wo) Wt.push(`${UP_ARROW}${DOWN_ARROW} select`);
  if (ve) Wt.push("x stop");
  if (Xr) Wt.push("x stop workflow");
  if (We) Wt.push("r restart");
  if (fn) Wt.push("p pause");
  else if (mn) Wt.push("p resume");
  if (H === "agents" && wo) Wt.push(Je ? `f filter: ${Je}` : "f filter");
  Wt.push("esc back");
  if (zt) Wt.push("s save");
  let joined = Wt.join(" \xB7 ");
  return jsxProd_default(FocusColumn, {
    onKeyDown,
    children: jsxProd_default(Dialog, {
      title: null,
      hideBorder: true,
      hideInputGuide: true,
      onCancel: fo,
      color: "text",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        width,
        minHeight: Math.max(Qt ? 8 : 12, Math.min(availableRows - 1, rows - 6)),
        maxHeight: Math.max(Qt ? 8 : 11, availableRows - 1),
        overflowY: "hidden",
        children: [
          !wo
            ? jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(HintText, {
                    children: "No agents yet.",
                  }),
                  jsxProd_default(Box, {
                    flexGrow: 1,
                  }),
                ],
              })
            : H === "agent" && st && G
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(WorkflowHeader, {
                      name: yt,
                      subtext,
                      stats,
                      width,
                    }),
                    !Qt &&
                      jsxProd_default(Box, {
                        height: 1,
                      }),
                    pn
                      ? jsxProd_default(WorkflowAgentDetailPane, {
                          phase: G,
                          clampedAgent: dt,
                          agentLabel: st.label,
                          detailLines: lines,
                          cardScroll: scroll,
                          leftWidth: max_2,
                          rightWidth: ho,
                          viewport: max_6,
                          workflowActive: W,
                          filterLabel: Je,
                        })
                      : jsxProd_default(WorkflowAgentDetail, {
                          agentLabel: st.label,
                          position: `${dt + 1}/${G.agents.length}`,
                          detailLines: lines,
                          cardScroll: scroll,
                          contentWidth: max,
                          viewport: max_7,
                        }),
                    jsxProd_default(Box, {
                      flexGrow: 1,
                    }),
                  ],
                })
              : Hi && G
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(WorkflowHeader, {
                        name: yt,
                        subtext,
                        stats,
                        width,
                      }),
                      !Qt &&
                        jsxProd_default(Box, {
                          height: 1,
                        }),
                      jsxProd_default(WorkflowPhasesPane, {
                        phases: E,
                        selectedPhase: G,
                        clampedPhase: min,
                        clampedAgent: dt,
                        level: H === "phases" ? "phases" : "agents",
                        leftWidth: max_5,
                        rightWidth: ns,
                        viewport: max_6,
                        workflowActive: W,
                        filterLabel: Je,
                      }),
                      jsxProd_default(Box, {
                        flexGrow: 1,
                      }),
                    ],
                  })
                : jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(WorkflowHeader, {
                        name: yt,
                        subtext,
                        stats,
                        width,
                      }),
                      !Qt &&
                        jsxProd_default(Box, {
                          height: 1,
                        }),
                      E.slice(scrollWindow.from, scrollWindow.to).map((K, Ct) => {
                        let Mt = scrollWindow.from + Ct;
                        return jsxProd_default(
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
                      gn &&
                        jsxProd_default(ScrollRangeIndicator, {
                          win: scrollWindow,
                          total: E.length,
                        }),
                      jsxProd_default(Box, {
                        flexGrow: 1,
                      }),
                      G
                        ? jsxProd_default(WorkflowAgentsPane, {
                            phase: G,
                            selectedAgent: dt,
                            level: H === "phases" ? "phases" : "agents",
                            contentWidth: max,
                            viewport,
                            tight: Qt,
                            workflowActive: W,
                            filterLabel: Je,
                          })
                        : null,
                    ],
                  }),
          jsxProd_default_2(Text, {
            dimColor: true,
            italic: true,
            wrap: "truncate-end",
            children: [" ", joined],
          }),
        ],
      }),
    }),
  });
}
export { WorkflowDetailDialog };
