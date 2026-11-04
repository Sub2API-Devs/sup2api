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
  RESPONSE_CONNECTOR,
  HORIZONTAL_LINE_GLYPH,
  RETURN_SYMBOL,
  UP_ARROW,
  DOWN_ARROW,
} from "../../constants/figures.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TREE_GLYPHS, EN_DASH, ROUNDED_BOX_CORNERS } from "../../../vendor/chart.js/dist/chart.js";
import {
  useState,
  useContext,
  useRef,
  useEffect,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-axsvbsqv.js:14537-14662 placement
function getCallDisplayState(call, isLive) {
  if (call.result === null) return isLive && call.fromLastResponse ? "running" : "unanswered";
  return call.result.isError ? "error" : "ok";
}
//@ chunk-axsvbsqv.js:14662-15241 placement
/**
 * 渲染工作流内单个工具调用的标题行：状态符号（运行中、无结果、成功、错误）、工具名与按宽度截断的摘要。
 */
function renderWorkflowCallHeader({ call, state, width, indent }) {
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
  let toolName = normalizeTaskText(identity(call.name));
  let remaining = max - bunStringWidth(toolName);
  let label =
    remaining < 0
      ? truncateToWidth(toolName, max)
      : call.summary && remaining > 3
        ? `${toolName}(${truncateToWidth(normalizeTaskText(call.summary), remaining - 2)})`
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
function renderWorkflowCallLines({ call, state, width, indent }) {
  let lines = [
    renderWorkflowCallHeader({
      call,
      state,
      width,
      indent,
    }),
  ];
  if (TASK_TODO_TOOL_NAMES.includes(call.name)) return lines;
  let fieldIndent = `${indent}  `;
  renderCallFields(lines, call.fields, {
    indent: fieldIndent,
    width,
    maxLines: MAX_TASK_DETAIL_LINES,
  });
  let resultPrefix = `${fieldIndent}${RESPONSE_CONNECTOR}  `;
  if (call.result && call.result.head === "")
    lines.push([
      {
        text: truncateToWidth(`${resultPrefix}(empty)`, width),
        color: call.result.isError ? "error" : undefined,
        dimColor: !call.result.isError,
      },
    ]);
  else if (call.result)
    renderWrappedText(lines, call.result, {
      firstPrefix: resultPrefix,
      restPrefix: " ".repeat(bunStringWidth(resultPrefix)),
      width,
      maxLines: MIN_TASK_ROWS,
      color: call.result.isError ? "error" : undefined,
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
  let remainingLines = maxLines;
  let hiddenLines = 0;
  let hiddenChars = 0;
  let continuationPrefix = `${indent}  `;
  for (let field of fields) {
    if (remainingLines <= 0) {
      hiddenLines += field.lineCount;
      continue;
    }
    let fieldKey = normalizeTaskText(field.key);
    let fieldPrefix = `${indent}${fieldKey}: `;
    if (
      !(
        field.lineCount === 1 &&
        field.truncatedChars === 0 &&
        bunStringWidth(fieldPrefix) + bunStringWidth(normalizeTaskText(field.head)) <= width
      ) &&
      bunStringWidth(fieldPrefix) > Math.floor(width / 2)
    ) {
      lines.push([
        {
          text: truncateToWidth(`${indent}${fieldKey}:`, width),
          dimColor: true,
        },
      ]);
      remainingLines--;
      fieldPrefix = continuationPrefix;
      if (remainingLines <= 0) {
        hiddenLines += field.lineCount;
        continue;
      }
    }
    let result = renderWrappedText(lines, field, {
      firstPrefix: fieldPrefix,
      restPrefix: continuationPrefix,
      width,
      maxLines: remainingLines,
      color: undefined,
      reportHidden: false,
    });
    remainingLines -= result.lines;
    hiddenLines += result.hiddenLines;
    hiddenChars += result.hiddenChars;
  }
  pushHiddenSummary(lines, indent, width, hiddenLines, hiddenChars);
}
//@ chunk-axsvbsqv.js:16294-16901 placement
/**
 * 把文本按宽度与行数上限折行输出（首行与续行前缀不同），返回渲染行数与隐藏的行/字符数，可选追加隐藏提示。
 */
function renderWrappedText(
  lines,
  wrapped,
  { firstPrefix, restPrefix, width, maxLines, color, reportHidden = true },
) {
  let lines_2 = wrapped.head.split(`
`);
  let rendered = 0;
  let max = Math.max(0, wrapped.lineCount - lines_2.length);
  let complete = true;
  let max_2 = Math.max(1, width - bunStringWidth(restPrefix));
  t: for (let [lineIndex, rawLine] of lines_2.entries()) {
    let lineText = normalizeTaskText(rawLine);
    let truncatedText = truncateToLength(lineText, (maxLines - rendered + 1) * width);
    let firstWidth = rendered === 0 ? Math.max(1, width - bunStringWidth(firstPrefix)) : max_2;
    let firstChunk = splitByDisplayWidth(truncatedText, firstWidth)[0] ?? "";
    let sliced = truncatedText.slice(firstChunk.length);
    let segments = sliced ? [firstChunk, ...splitByDisplayWidth(sliced, max_2)] : [firstChunk];
    for (let [segmentIndex, segmentText] of segments.entries()) {
      if (rendered >= maxLines) {
        max += lines_2.length - lineIndex;
        complete = false;
        break t;
      }
      lines.push([
        {
          text: (rendered === 0 && segmentIndex === 0 ? firstPrefix : restPrefix) + segmentText,
          color,
          dimColor: color === undefined,
        },
      ]);
      rendered++;
    }
    if (truncatedText.length < lineText.length) {
      max += lines_2.length - lineIndex;
      complete = false;
      break;
    }
  }
  let truncatedChars = complete ? wrapped.truncatedChars : 0;
  if (reportHidden) pushHiddenSummary(lines, restPrefix, width, max, truncatedChars);
  return {
    lines: rendered,
    hiddenLines: max,
    hiddenChars: truncatedChars,
  };
}
//@ chunk-axsvbsqv.js:16901-17047 placement
function pushHiddenSummary(lines, indent, width, hiddenLines, hiddenChars) {
  let summary =
    hiddenLines > 0
      ? `\u2026 ${hiddenLines} more ${plural(hiddenLines, "line")}`
      : hiddenChars > 0
        ? `\u2026 +${hiddenChars} chars`
        : "";
  if (summary)
    lines.push([
      {
        text: truncateToWidth(`${indent}${summary}`, width),
        dimColor: true,
      },
    ]);
}
//@ chunk-axsvbsqv.js:17047-17146 placement
function renderStyledLine(segment, key) {
  return jsxProd_default(
    Text,
    {
      color: segment.color,
      dimColor: segment.dimColor,
      bold: segment.bold ?? false,
      children: segment.text,
    },
    key,
  );
}
//@ chunk-axsvbsqv.js:17146-17172 placement
function renderNothing() {
  return null;
}
//@ chunk-axsvbsqv.js:17172-17333 placement
function computeScrollWindow(scrollRow, totalRows, viewport) {
  if (totalRows <= viewport)
    return {
      from: 0,
      to: totalRows,
      above: 0,
      below: 0,
    };
  let floored = Math.floor(viewport / 2);
  let max = Math.max(0, Math.min(scrollRow - floored, totalRows - viewport));
  let endRow = max + viewport;
  return {
    from: max,
    to: endRow,
    above: max,
    below: totalRows - endRow,
  };
}
//@ chunk-axsvbsqv.js:17333-17395 placement
function isRunningState(row) {
  return row.state === "start" || row.state === "progress";
}
//@ chunk-axsvbsqv.js:17395-17628 placement
function getAgentDisplayState(agent, isWorkflowActive) {
  if (agent.state === "done") return "done";
  if (agent.state === "error") {
    if (agent.skipped) return "skipped";
    if (agent.blocked) return "blocked";
    return "failed";
  }
  if (!isWorkflowActive) return "interrupted";
  return agent.queuedAt != null && agent.startedAt == null ? "queued" : "running";
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
function agentCountLabel(count, filterLabel) {
  return filterLabel ? `showing ${count} ${filterLabel}` : `${count} ${plural(count, "agent")}`;
}
//@ chunk-axsvbsqv.js:18124-18231 placement
function describeEmptyAgentList(workflow, filterLabel) {
  if (workflow.status === "not-started") return "Not started yet";
  return filterLabel ? `No ${filterLabel} agents` : "No agents";
}
//@ chunk-axsvbsqv.js:18231-18283 placement
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
  let clip = (text, maxWidth) => (maxWidth <= 0 ? "" : truncateToWidth(text, maxWidth));
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
function getAgentLabelWidth(agents, width) {
  let min = Math.min(
    MAX_AGENT_NAME_WIDTH,
    Math.max(22, width - MIN_AGENT_NAME_WIDTH),
    Math.max(4, Math.min(width, Math.max(12, width - WORKFLOW_HEADER_ROWS - 1))),
  );
  let reduced = agents.reduce((acc, agent) => Math.max(acc, bunStringWidth(agent.label)), 0);
  return Math.min(Math.max(12, reduced), min);
}
//@ chunk-axsvbsqv.js:19622-19862 placement
function fitSegments(segs, width) {
  let usedWidth = 0;
  for (let idx = 0; idx < segs.length; idx++) {
    let segment = segs[idx];
    let segmentWidth = bunStringWidth(segment.text);
    if (usedWidth + segmentWidth > width) {
      let remainingWidth = width - usedWidth;
      let truncatedText = remainingWidth > 0 ? truncateToWidth(segment.text, remainingWidth) : "";
      let sliced = segs.slice(0, idx);
      if (truncatedText)
        sliced.push({
          ...segment,
          text: truncatedText,
        });
      return {
        segs: sliced,
        pad: Math.max(0, remainingWidth - bunStringWidth(truncatedText)),
      };
    }
    usedWidth += segmentWidth;
  }
  return {
    segs,
    pad: Math.max(0, width - usedWidth),
  };
}
//@ chunk-axsvbsqv.js:19862-20129 placement
function SegmentLine(props) {
  let $ = useMemoCache(7);
  let { segs, width } = props;
  let styledSegments;
  let padding;
  if ($[0] !== segs || $[1] !== width) {
    let { segs: segs_2, pad } = fitSegments(segs, width);
    styledSegments = segs_2.map(renderStyledLine);
    padding = " ".repeat(pad);
    $[0] = segs;
    $[1] = width;
    $[2] = styledSegments;
    $[3] = padding;
  } else {
    styledSegments = $[2];
    padding = $[3];
  }
  let lineElement;
  if ($[4] !== styledSegments || $[5] !== padding) {
    lineElement = jsxProd_default_2(Fragment, {
      children: [styledSegments, padding],
    });
    $[4] = styledSegments;
    $[5] = padding;
    $[6] = lineElement;
  } else lineElement = $[6];
  return lineElement;
}
//@ chunk-axsvbsqv.js:20129-20530 placement
/**
 * 渲染带竖线边框的一行分段文本（超宽截断）。
 */
function BoxedSegmentLine(props) {
  let $ = useMemoCache(7);
  let { segs, contentWidth } = props;
  let leftPipe;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    leftPipe = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", TREE_GLYPHS.pipe, " "],
    });
    $[0] = leftPipe;
  } else leftPipe = $[0];
  let segmentLineElement;
  if ($[1] !== contentWidth || $[2] !== segs) {
    segmentLineElement = jsxProd_default(SegmentLine, {
      segs,
      width: contentWidth,
    });
    $[1] = contentWidth;
    $[2] = segs;
    $[3] = segmentLineElement;
  } else segmentLineElement = $[3];
  let rightPipe;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    rightPipe = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", TREE_GLYPHS.pipe],
    });
    $[4] = rightPipe;
  } else rightPipe = $[4];
  let boxedLineElement;
  if ($[5] !== segmentLineElement) {
    boxedLineElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [leftPipe, segmentLineElement, rightPipe],
    });
    $[5] = segmentLineElement;
    $[6] = boxedLineElement;
  } else boxedLineElement = $[6];
  return boxedLineElement;
}
//@ chunk-axsvbsqv.js:20530-20654 placement
function formatScrollRange(scrollWindow, totalRows) {
  let arrowUp = scrollWindow.from > 0 ? figures_default.arrowUp : " ";
  let arrowDown = scrollWindow.to < totalRows ? figures_default.arrowDown : " ";
  return `${arrowUp} ${scrollWindow.from + 1}${EN_DASH}${scrollWindow.to} of ${totalRows} ${arrowDown}`;
}
//@ chunk-axsvbsqv.js:20654-20887 placement
function ScrollRangeIndicator(props) {
  let $ = useMemoCache(5);
  let { win, total } = props;
  let rangeText;
  if ($[0] !== total || $[1] !== win) {
    rangeText = formatScrollRange(win, total);
    $[0] = total;
    $[1] = win;
    $[2] = rangeText;
  } else rangeText = $[2];
  const children = `  ${rangeText}`;
  let indicatorElement;
  if ($[3] !== children) {
    indicatorElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    $[3] = children;
    $[4] = indicatorElement;
  } else indicatorElement = $[4];
  return indicatorElement;
}
//@ chunk-axsvbsqv.js:20887-23906 placement
/**
 * 工作流详情中的代理列表栏。
 */
function WorkflowAgentsPane(props) {
  let $ = useMemoCache(53);
  let { phase, selectedAgent, level, contentWidth, viewport, tight, workflowActive, filterLabel } = props;
  let agents = phase.agents;
  let topRule;
  if ($[0] !== contentWidth) {
    topRule = HORIZONTAL_LINE_GLYPH.repeat(contentWidth + 2);
    $[0] = contentWidth;
    $[1] = topRule;
  } else topRule = $[1];
  let ruleLine = topRule;
  let bottomBorderElement;
  let rows;
  if (
    $[2] !== agents ||
    $[3] !== ruleLine ||
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
    rows = [];
    let countLabel = agentCountLabel(agents.length, filterLabel);
    if (tight) {
      let countSuffix = truncateToWidth(` \xB7 ${countLabel}`, Math.max(1, contentWidth - 1));
      let max = Math.max(1, contentWidth - bunStringWidth(countSuffix));
      let text;
      if ($[14] !== phase.title || $[15] !== max) {
        text = truncateToWidth(phase.title, max);
        $[14] = phase.title;
        $[15] = max;
        $[16] = text;
      } else text = $[16];
      let titleSegment;
      if ($[17] !== text) {
        titleSegment = {
          text,
          color: "permission",
          bold: true,
        };
        $[17] = text;
        $[18] = titleSegment;
      } else titleSegment = $[18];
      let countSegment;
      if ($[19] !== countSuffix) {
        countSegment = {
          text: countSuffix,
          dimColor: true,
        };
        $[19] = countSuffix;
        $[20] = countSegment;
      } else countSegment = $[20];
      let segs;
      if ($[21] !== titleSegment || $[22] !== countSegment) {
        segs = [titleSegment, countSegment];
        $[21] = titleSegment;
        $[22] = countSegment;
        $[23] = segs;
      } else segs = $[23];
      let titleLineElement;
      if ($[24] !== contentWidth || $[25] !== segs) {
        titleLineElement = jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs,
          },
          "title",
        );
        $[24] = contentWidth;
        $[25] = segs;
        $[26] = titleLineElement;
      } else titleLineElement = $[26];
      rows.push(titleLineElement);
    } else {
      rows.push(
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
      rows.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: [
              {
                text: truncateToWidth(countLabel, contentWidth),
                dimColor: true,
              },
            ],
          },
          "count",
        ),
      );
      rows.push(
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
    let rowCountBeforeAgents = rows.length;
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
      let emptyLineElement;
      if ($[32] !== contentWidth || $[33] !== segs) {
        emptyLineElement = jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs,
          },
          "empty",
        );
        $[32] = contentWidth;
        $[33] = segs;
        $[34] = emptyLineElement;
      } else emptyLineElement = $[34];
      rows.push(emptyLineElement);
    } else {
      let agentLabelWidth = getAgentLabelWidth(agents, contentWidth - 5);
      for (let from = scrollWindow.from; from < scrollWindow.to; from++) {
        let agent = agents[from];
        let isSelected = level === "agents" && from === selectedAgent;
        let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(agent, workflowActive));
        let agentLabelText = truncateToWidth(agent.label, agentLabelWidth);
        let labelPadding = " ".repeat(Math.max(0, agentLabelWidth - bunStringWidth(agentLabelText)));
        let max = Math.max(0, contentWidth - (agentLabelWidth + 5));
        rows.push(
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
                  text: `${agentLabelText}${labelPadding}`,
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
    let agentRowCount = rows.length - rowCountBeforeAgents;
    for (let padRowIndex = agentRowCount; padRowIndex < viewport; padRowIndex++)
      rows.push(
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
          `pad-${padRowIndex}`,
        ),
      );
    if (agents.length > viewport) {
      let scrollRangeText = ` ${formatScrollRange(scrollWindow, agents.length)} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(scrollRangeText));
      let bottomRule;
      if ($[35] !== max) {
        bottomRule = HORIZONTAL_LINE_GLYPH.repeat(max);
        $[35] = max;
        $[36] = bottomRule;
      } else bottomRule = $[36];
      let bottomLeftElement;
      if ($[37] !== bottomRule) {
        bottomLeftElement = jsxProd_default_2(Text, {
          color: "text",
          children: [" ", ROUNDED_BOX_CORNERS.bottomLeft, bottomRule],
        });
        $[37] = bottomRule;
        $[38] = bottomLeftElement;
      } else bottomLeftElement = $[38];
      let scrollRangeElement;
      if ($[39] !== scrollRangeText) {
        scrollRangeElement = jsxProd_default(Text, {
          dimColor: true,
          children: scrollRangeText,
        });
        $[39] = scrollRangeText;
        $[40] = scrollRangeElement;
      } else scrollRangeElement = $[40];
      let bottomRightElement;
      if ($[41] === MEMO_CACHE_SENTINEL) {
        bottomRightElement = jsxProd_default(Text, {
          color: "text",
          children: ROUNDED_BOX_CORNERS.bottomRight,
        });
        $[41] = bottomRightElement;
      } else bottomRightElement = $[41];
      let scrollFooterElement;
      if ($[42] !== bottomLeftElement || $[43] !== scrollRangeElement) {
        scrollFooterElement = jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [bottomLeftElement, scrollRangeElement, bottomRightElement],
        });
        $[42] = bottomLeftElement;
        $[43] = scrollRangeElement;
        $[44] = scrollFooterElement;
      } else scrollFooterElement = $[44];
      bottomBorderElement = scrollFooterElement;
    } else {
      let plainFooterElement;
      if ($[45] !== ruleLine) {
        plainFooterElement = jsxProd_default_2(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", ROUNDED_BOX_CORNERS.bottomLeft, ruleLine, ROUNDED_BOX_CORNERS.bottomRight],
        });
        $[45] = ruleLine;
        $[46] = plainFooterElement;
      } else plainFooterElement = $[46];
      bottomBorderElement = plainFooterElement;
    }
    $[2] = agents;
    $[3] = ruleLine;
    $[4] = contentWidth;
    $[5] = filterLabel;
    $[6] = level;
    $[7] = phase;
    $[8] = selectedAgent;
    $[9] = tight;
    $[10] = viewport;
    $[11] = workflowActive;
    $[12] = bottomBorderElement;
    $[13] = rows;
  } else {
    bottomBorderElement = $[12];
    rows = $[13];
  }
  let topBorderElement;
  if ($[47] !== ruleLine) {
    topBorderElement = jsxProd_default_2(Text, {
      color: "text",
      wrap: "truncate-end",
      children: [" ", ROUNDED_BOX_CORNERS.topLeft, ruleLine, ROUNDED_BOX_CORNERS.topRight],
    });
    $[47] = ruleLine;
    $[48] = topBorderElement;
  } else topBorderElement = $[48];
  let paneBox;
  if ($[49] !== bottomBorderElement || $[50] !== rows || $[51] !== topBorderElement) {
    paneBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [topBorderElement, rows, bottomBorderElement],
    });
    $[49] = bottomBorderElement;
    $[50] = rows;
    $[51] = topBorderElement;
    $[52] = paneBox;
  } else paneBox = $[52];
  return paneBox;
}
//@ chunk-axsvbsqv.js:23906-24523 placement
/**
 * 渲染带竖线边框的两栏行，左右各自按宽度渲染分段文本。
 */
function TwoColumnRow(props) {
  let $ = useMemoCache(12);
  let { left, right, leftWidth, rightWidth } = props;
  let leftEdge;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    leftEdge = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", TREE_GLYPHS.pipe, " "],
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
      children: [" ", TREE_GLYPHS.pipe, " "],
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
      children: [" ", TREE_GLYPHS.pipe],
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
function renderSectionRule(width, section) {
  let segments = [];
  let usedWidth = 0;
  if (section.label) {
    let labelText = ` ${truncateToWidth(section.label.text, Math.max(1, width - 2))} `;
    usedWidth += bunStringWidth(labelText);
    segments.push(
      jsxProd_default(
        Text,
        {
          color: section.label.color ?? "text",
          bold: section.label.bold,
          children: labelText,
        },
        "label",
      ),
    );
  }
  let tagText = section.tag ? ` ${truncateToWidth(section.tag, Math.max(0, width - usedWidth - 2))} ` : "";
  let max = Math.max(0, width - usedWidth - bunStringWidth(tagText));
  segments.push(
    jsxProd_default(
      Text,
      {
        color: "text",
        children: HORIZONTAL_LINE_GLYPH.repeat(max),
      },
      "dash",
    ),
  );
  if (tagText)
    segments.push(
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: tagText,
        },
        "tag",
      ),
    );
  return segments;
}
//@ chunk-axsvbsqv.js:24889-25789 placement
function SplitPaneBorder(props) {
  let $ = useMemoCache(20);
  let { pos, leftWidth, rightWidth, leftTitle, rightTitle, leftTag, rightTag } = props;
  let leftCornerGlyph = pos === "top" ? ROUNDED_BOX_CORNERS.topLeft : ROUNDED_BOX_CORNERS.bottomLeft;
  let children = pos === "top" ? TREE_GLYPHS.teeDown : TREE_GLYPHS.teeUp;
  let children_2 = pos === "top" ? ROUNDED_BOX_CORNERS.topRight : ROUNDED_BOX_CORNERS.bottomRight;
  let leftCornerElement;
  if ($[0] !== leftCornerGlyph) {
    leftCornerElement = jsxProd_default_2(Text, {
      color: "text",
      children: [" ", leftCornerGlyph],
    });
    $[0] = leftCornerGlyph;
    $[1] = leftCornerElement;
  } else leftCornerElement = $[1];
  const leftRuleWidth = leftWidth + 2;
  let leftRuleSegments;
  if ($[2] !== leftTag || $[3] !== leftTitle || $[4] !== leftRuleWidth) {
    leftRuleSegments = renderSectionRule(leftRuleWidth, {
      label: leftTitle
        ? {
            text: leftTitle,
          }
        : undefined,
      tag: leftTag,
    });
    $[2] = leftTag;
    $[3] = leftTitle;
    $[4] = leftRuleWidth;
    $[5] = leftRuleSegments;
  } else leftRuleSegments = $[5];
  let teeElement;
  if ($[6] !== children) {
    teeElement = jsxProd_default(Text, {
      color: "text",
      children,
    });
    $[6] = children;
    $[7] = teeElement;
  } else teeElement = $[7];
  const rightRuleWidth = rightWidth + 2;
  let rightRuleSegments;
  if ($[8] !== rightTag || $[9] !== rightTitle || $[10] !== rightRuleWidth) {
    rightRuleSegments = renderSectionRule(rightRuleWidth, {
      label: rightTitle
        ? {
            text: rightTitle,
          }
        : undefined,
      tag: rightTag,
    });
    $[8] = rightTag;
    $[9] = rightTitle;
    $[10] = rightRuleWidth;
    $[11] = rightRuleSegments;
  } else rightRuleSegments = $[11];
  let rightCornerElement;
  if ($[12] !== children_2) {
    rightCornerElement = jsxProd_default(Text, {
      color: "text",
      children: children_2,
    });
    $[12] = children_2;
    $[13] = rightCornerElement;
  } else rightCornerElement = $[13];
  let borderLineElement;
  if (
    $[14] !== leftCornerElement ||
    $[15] !== leftRuleSegments ||
    $[16] !== teeElement ||
    $[17] !== rightRuleSegments ||
    $[18] !== rightCornerElement
  ) {
    borderLineElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [leftCornerElement, leftRuleSegments, teeElement, rightRuleSegments, rightCornerElement],
    });
    $[14] = leftCornerElement;
    $[15] = leftRuleSegments;
    $[16] = teeElement;
    $[17] = rightRuleSegments;
    $[18] = rightCornerElement;
    $[19] = borderLineElement;
  } else borderLineElement = $[19];
  return borderLineElement;
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
function renderAgentRow(agent, agentIndex, clampedAgent, level, rightWidth, agentLabelWidth, now) {
  let isSelected = level === "agents" && agentIndex === clampedAgent;
  let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(agent, now));
  let labelText = truncateToWidth(agent.label, agentLabelWidth);
  let labelPadding = " ".repeat(Math.max(0, agentLabelWidth - bunStringWidth(labelText)));
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
      text: `${labelText}${labelPadding}`,
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
function renderCompactAgentRow(agent, agentIndex, clampedAgent, leftWidth, workflowActive) {
  let isSelected = agentIndex === clampedAgent;
  let { glyph, color } = getAgentStateGlyph(getAgentDisplayState(agent, workflowActive));
  let text = truncateToWidth(agent.label, Math.max(1, leftWidth - 4));
  return [
    {
      text: isSelected ? `${figures_default.pointer} ` : "  ",
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
      color: isSelected ? "permission" : undefined,
      dimColor: !isSelected && isRunningState(agent),
    },
  ];
}
//@ chunk-axsvbsqv.js:26933-28627 placement
function WorkflowPhasesPane(props) {
  let $ = useMemoCache(41);
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
  let borderComponent;
  let containerComponent;
  let pos;
  let leftWidth_2;
  let rightWidth_2;
  let leftTag;
  let rightTag;
  let flexDirection;
  let topBorderElement;
  let rowElements;
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
    let rowElements_2 = [];
    for (let idx = 0; idx < viewport; idx++) {
      let index = scrollWindow.from + idx;
      let agentRowIndex = scrollWindow_2.from + idx;
      let left =
        index < scrollWindow.to ? renderPhaseRow(phases[index], index, clampedPhase, level, leftWidth) : [];
      let rightSegments;
      if (agentRowIndex < scrollWindow_2.to)
        rightSegments = renderAgentRow(
          agents[agentRowIndex],
          agentRowIndex,
          clampedAgent,
          level,
          rightWidth,
          agentLabelWidth,
          workflowActive,
        );
      else if (agents.length === 0 && idx === 0)
        rightSegments = [
          {
            text: describeEmptyAgentList(selectedPhase, filterLabel),
            dimColor: true,
          },
        ];
      else rightSegments = [];
      rowElements_2.push(
        jsxProd_default(
          TwoColumnRow,
          {
            left,
            right: rightSegments,
            leftWidth,
            rightWidth,
          },
          idx,
        ),
      );
    }
    const title = selectedPhase.title;
    let countLabel;
    if ($[21] !== agents.length || $[22] !== filterLabel) {
      countLabel = agentCountLabel(agents.length, filterLabel);
      $[21] = agents.length;
      $[22] = filterLabel;
      $[23] = countLabel;
    } else countLabel = $[23];
    let rightTitle = `${title} \xB7 ${countLabel}`;
    containerComponent = Box;
    flexDirection = "column";
    if ($[24] !== leftWidth || $[25] !== rightTitle || $[26] !== rightWidth) {
      topBorderElement = jsxProd_default(SplitPaneBorder, {
        pos: "top",
        leftWidth,
        rightWidth,
        leftTitle: "Phases",
        rightTitle,
      });
      $[24] = leftWidth;
      $[25] = rightTitle;
      $[26] = rightWidth;
      $[27] = topBorderElement;
    } else topBorderElement = $[27];
    rowElements = rowElements_2;
    borderComponent = SplitPaneBorder;
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
    $[11] = borderComponent;
    $[12] = containerComponent;
    $[13] = pos;
    $[14] = leftWidth_2;
    $[15] = rightWidth_2;
    $[16] = leftTag;
    $[17] = rightTag;
    $[18] = flexDirection;
    $[19] = topBorderElement;
    $[20] = rowElements;
  } else {
    borderComponent = $[11];
    containerComponent = $[12];
    pos = $[13];
    leftWidth_2 = $[14];
    rightWidth_2 = $[15];
    leftTag = $[16];
    rightTag = $[17];
    flexDirection = $[18];
    topBorderElement = $[19];
    rowElements = $[20];
  }
  let bottomBorderElement;
  if (
    $[28] !== borderComponent ||
    $[29] !== pos ||
    $[30] !== leftWidth_2 ||
    $[31] !== rightWidth_2 ||
    $[32] !== leftTag ||
    $[33] !== rightTag
  ) {
    bottomBorderElement = jsxProd_default(borderComponent, {
      pos,
      leftWidth: leftWidth_2,
      rightWidth: rightWidth_2,
      leftTag,
      rightTag,
    });
    $[28] = borderComponent;
    $[29] = pos;
    $[30] = leftWidth_2;
    $[31] = rightWidth_2;
    $[32] = leftTag;
    $[33] = rightTag;
    $[34] = bottomBorderElement;
  } else bottomBorderElement = $[34];
  let paneElement;
  if (
    $[35] !== containerComponent ||
    $[36] !== flexDirection ||
    $[37] !== topBorderElement ||
    $[38] !== rowElements ||
    $[39] !== bottomBorderElement
  ) {
    paneElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [topBorderElement, rowElements, bottomBorderElement],
    });
    $[35] = containerComponent;
    $[36] = flexDirection;
    $[37] = topBorderElement;
    $[38] = rowElements;
    $[39] = bottomBorderElement;
    $[40] = paneElement;
  } else paneElement = $[40];
  return paneElement;
}
//@ chunk-axsvbsqv.js:28627-28662 placement
var WORKFLOW_INDENT_STEP; // deferred: uses MAX_TRANSCRIPT_PROMPT_CHARS (../../tasks/LocalWorkflowTask/workflowTranscript.js) of its import cycle while loading; runs once the cycle is complete
var MAX_AGENT_ROWS;
var WORKFLOW_SPINNER_FRAMES;
var REFRESH_FAST_MS;
var REFRESH_SLOW_MS;
deferInit("chunk-axsvbsqv.js:28627", () => {
  WORKFLOW_INDENT_STEP = 2;
  MAX_AGENT_ROWS = 20;
  WORKFLOW_SPINNER_FRAMES = MAX_TRANSCRIPT_TOOL_RESULTS;
  REFRESH_FAST_MS = 100;
  REFRESH_SLOW_MS = 250;
});
//@ chunk-axsvbsqv.js:28662-29466 placement
function useWorkflowAgentTranscript(workflowRunId, agentIndex, lastProgressAt, promptFramed) {
  let $ = useMemoCache(13);
  let [loadedTranscript, setLoadedTranscript] = useState(null);
  let setTimeoutImpl = useContext(clockContext)?.setTimeout ?? defaultSetTimeout;
  let lastLoadedAgentIdRef = useRef(undefined);
  let requestIdRef = useRef(0);
  let appliedRequestIdRef = useRef(0);
  let activeRequestRef = useRef(null);
  let cleanupEffect;
  let cleanupDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    cleanupEffect = () => () => {
      activeRequestRef.current = null;
    };
    cleanupDeps = [];
    $[0] = cleanupEffect;
    $[1] = cleanupDeps;
  } else {
    cleanupEffect = $[0];
    cleanupDeps = $[1];
  }
  useEffect(cleanupEffect, cleanupDeps);
  let loadEffect;
  if ($[2] !== agentIndex || $[3] !== promptFramed || $[4] !== setTimeoutImpl || $[5] !== workflowRunId) {
    loadEffect = () => {
      if (!workflowRunId || !agentIndex) {
        return;
      }
      activeRequestRef.current = {
        runId: workflowRunId,
        agentId: agentIndex,
      };
      let requestId = (requestIdRef.current = requestIdRef.current + 1);
      let loadTranscript = () => {
        readWorkflowAgentTranscript(workflowRunId, agentIndex, {
          promptFramed,
        })
          .catch(renderNothing)
          .then((transcript) => {
            if (
              requestId > appliedRequestIdRef.current &&
              activeRequestRef.current?.runId === workflowRunId &&
              activeRequestRef.current.agentId === agentIndex
            ) {
              appliedRequestIdRef.current = requestId;
              lastLoadedAgentIdRef.current = agentIndex;
              setLoadedTranscript({
                agentId: agentIndex,
                transcript,
              });
            }
          });
      };
      if (lastLoadedAgentIdRef.current === agentIndex) {
        return setTimeoutImpl(loadTranscript, REFRESH_SLOW_MS);
      }
      loadTranscript();
    };
    $[2] = agentIndex;
    $[3] = promptFramed;
    $[4] = setTimeoutImpl;
    $[5] = workflowRunId;
    $[6] = loadEffect;
  } else loadEffect = $[6];
  let effectDeps;
  if (
    $[7] !== agentIndex ||
    $[8] !== promptFramed ||
    $[9] !== lastProgressAt ||
    $[10] !== setTimeoutImpl ||
    $[11] !== workflowRunId
  ) {
    effectDeps = [workflowRunId, agentIndex, lastProgressAt, promptFramed, setTimeoutImpl];
    $[7] = agentIndex;
    $[8] = promptFramed;
    $[9] = lastProgressAt;
    $[10] = setTimeoutImpl;
    $[11] = workflowRunId;
    $[12] = effectDeps;
  } else effectDeps = $[12];
  useEffect(loadEffect, effectDeps);
  if (!workflowRunId || !agentIndex) {
    return null;
  }
  if (!loadedTranscript || loadedTranscript.agentId !== agentIndex) {
    return "loading";
  }
  return loadedTranscript.transcript;
}
//@ chunk-axsvbsqv.js:29466-29603 placement
function wrapLines(text, maxWidth) {
  let wrappedLines = [];
  for (let line of text.split(`
`)) {
    if (line === "") {
      wrappedLines.push("");
      continue;
    }
    for (let chunk of splitByDisplayWidth(line, Math.max(1, maxWidth))) wrappedLines.push(chunk);
  }
  return wrappedLines;
}
//@ chunk-axsvbsqv.js:29603-30006 placement
/**
 * 渲染可折叠段：标题（超过折叠行数时显示总行数与展开提示）、正文（折叠时截取）与剩余行提示，返回隐藏行数。
 */
function pushCollapsibleSection({ lines, title, body, collapsedLines, expanded, indent, width }) {
  let hiddenLineCount = body.length - collapsedLines;
  let collapsedExtraLines = hiddenLineCount >= 2 ? hiddenLineCount : 0;
  let headerSegments = [
    {
      text: title,
      bold: true,
      dimColor: true,
    },
  ];
  if (collapsedExtraLines > 0)
    headerSegments.push({
      text: truncateToWidth(
        ` \xB7 ${body.length} lines${expanded ? "" : ` \xB7 ${RETURN_SYMBOL} expand`}`,
        width - bunStringWidth(title),
      ),
      dimColor: true,
    });
  lines.push(headerSegments);
  let visibleBodyLines = expanded || collapsedExtraLines === 0 ? body : body.slice(0, collapsedLines);
  for (let bodyLine of visibleBodyLines) lines.push(bodyLine);
  if (!expanded && collapsedExtraLines > 0)
    lines.push([
      {
        text: truncateToWidth(
          `${indent}\u2026 ${collapsedExtraLines} more ${plural(collapsedExtraLines, "line")}`,
          width,
        ),
        dimColor: true,
      },
    ]);
  return collapsedExtraLines;
}
//@ chunk-axsvbsqv.js:30006-30087 placement
function addPrecedingGrowth(scroll, folds) {
  let growthBefore = 0;
  for (let fold of folds) {
    if (scroll < fold.end) break;
    growthBefore += fold.growth;
  }
  return scroll + growthBefore;
}
//@ chunk-axsvbsqv.js:30087-30207 placement
function mapRowThroughGrowth(scroll, folds) {
  let growthBefore = 0;
  for (let fold of folds) {
    let foldEnd = fold.end + growthBefore;
    if (scroll < foldEnd) break;
    if (scroll < foldEnd + fold.growth) return fold.end;
    growthBefore += fold.growth;
  }
  return scroll - growthBefore;
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
  let lines = [];
  let indent = "  ";
  let max = Math.max(8, width - 2);
  let loadedTranscript = transcript === "loading" ? null : transcript;
  let { glyph, color } = getAgentStateGlyph(status);
  let metaParts = [];
  if (agent.model != null) metaParts.push(modelTransitionText(agent.model, agent.fallbackModel));
  if (agent.agentType != null) metaParts.push(agent.agentType);
  if (agent.isolation != null)
    metaParts.push(
      agent.isolation === "remote" && agent.remoteSessionId
        ? `remote ${agent.remoteSessionId}`
        : agent.isolation,
    );
  if (agent.cached) metaParts.push("from resume journal");
  if (agent.attempt != null && agent.attempt > 1) {
    let attemptReasonText =
      agent.lastAttemptReason === "throttled"
        ? agent.label.endsWith(USAGE_LIMIT_SUFFIX)
          ? USAGE_LIMIT_TEXT
          : "throttled"
        : agent.lastAttemptReason === "user-retry"
          ? "user retry"
          : "stalled";
    metaParts.push(`attempt ${agent.attempt} (${attemptReasonText})`);
  }
  let headerWidth = bunStringWidth(glyph) + 1 + bunStringWidth(AGENT_STATE_LABELS[status]);
  let metaSuffix =
    metaParts.length > 0
      ? truncateToWidth(` \xB7 ${metaParts.join(" \xB7 ")}`, Math.max(0, width - headerWidth))
      : "";
  lines.push([
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
    ...(metaSuffix
      ? [
          {
            text: metaSuffix,
            dimColor: true,
          },
        ]
      : []),
  ]);
  let statParts = [];
  if (agent.tokens != null) statParts.push(`${formatTokens(agent.tokens)} tok`);
  if (agent.toolCalls != null && agent.toolCalls > 0)
    statParts.push(`${agent.toolCalls} ${plural(agent.toolCalls, "tool call")}`);
  if (agent.durationMs != null) statParts.push(formatDuration(agent.durationMs));
  if (status === "queued" && agent.queuedAt != null)
    statParts.push(`waiting ${formatDuration(Math.max(0, nowMs - agent.queuedAt))}`);
  if (status === "running" && agent.lastProgressAt != null) {
    let floored = Math.floor((nowMs - agent.lastProgressAt) / 1000);
    if (floored >= 30) statParts.push(`idle ${formatDuration(floored * 1000)}`);
  }
  if (statParts.length > 0)
    lines.push([
      {
        text: truncateToWidth(statParts.join(" \xB7 "), width),
        dimColor: true,
      },
    ]);
  lines.push([
    {
      text: "",
    },
  ]);
  let toolCalls = status !== "queued" && loadedTranscript ? loadedTranscript.toolCalls : [];
  let isRunning = status === "running";
  let filtered = toolCalls.filter((toolCall) => getCallDisplayState(toolCall, isRunning) === "running");
  let toolCalls_2 = toolCalls;
  let tasks = loadedTranscript?.tasks ?? [];
  let collapsedTaskLines =
    tasks.length > 0
      ? WorkflowTaskList({
          tasks,
          expanded: false,
          width,
          indent: "  ",
        })
      : null;
  let expandedTaskLines =
    tasks.length > 0
      ? WorkflowTaskList({
          tasks,
          expanded: true,
          width,
          indent: "  ",
        })
      : null;
  let taskLines = expanded ? expandedTaskLines : collapsedTaskLines;
  let hasActivityDetail = toolCalls_2.length > 0 || (taskLines?.capped ?? false);
  let promptText =
    transcript !== "loading" && transcript?.prompt ? transcript.prompt : (agent.promptPreview ?? "");
  let body = promptText
    ? wrapLines(promptText, max).map((promptLine) => [
        {
          text: "  " + promptLine,
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
  let promptHiddenLines = pushCollapsibleSection({
    lines,
    title: "Prompt",
    body,
    collapsedLines: WORKFLOW_INDENT_STEP,
    expanded,
    indent: "  ",
    width,
  });
  let promptGrowth = promptHiddenLines > 0 ? promptHiddenLines - 1 : 0;
  let hiddenGrowth = promptGrowth;
  let folds = [
    {
      end: lines.length - (expanded ? hiddenGrowth : 0),
      growth: promptGrowth,
    },
  ];
  lines.push([
    {
      text: "",
    },
  ]);
  if (taskLines && collapsedTaskLines && expandedTaskLines) {
    for (let line of taskLines.lines) lines.push(line);
    let taskGrowth = expandedTaskLines.lines.length - collapsedTaskLines.lines.length;
    hiddenGrowth += taskGrowth;
    folds.push({
      end: lines.length - (expanded ? hiddenGrowth : 0),
      growth: taskGrowth,
    });
    lines.push([
      {
        text: "",
      },
    ]);
  }
  if (status !== "queued") {
    let visibleToolCount = toolCalls_2.length - WORKFLOW_SPINNER_FRAMES;
    let max = Math.max(0, visibleToolCount - WORKFLOW_SPINNER_FRAMES);
    while (false) visibleToolCount--;
    let filtered = toolCalls_2.filter(
      (toolCall, callIndex) =>
        callIndex >= visibleToolCount || getCallDisplayState(toolCall, isRunning) === "running",
    );
    let callLines = [];
    for (let [callIndex, toolCall] of filtered.entries()) {
      if (callIndex > 0)
        callLines.push([
          {
            text: "",
          },
        ]);
      let state = getCallDisplayState(toolCall, isRunning);
      callLines.push(
        ...renderWorkflowCallLines({
          call: toolCall,
          state,
          width,
          indent: "  ",
        }),
      );
    }
    let activitySuffix = "";
    if (toolCalls_2.length > filtered.length)
      activitySuffix = ` \xB7 ${filtered.length <= WORKFLOW_SPINNER_FRAMES ? "last " : ""}${filtered.length} of ${toolCalls_2.length} tool calls`;
    let max_2 = Math.max(0, width - bunStringWidth("Activity"));
    let expandHint = ` \xB7 ${RETURN_SYMBOL} expand`;
    activitySuffix =
      !expanded && hasActivityDetail && bunStringWidth(activitySuffix) + bunStringWidth(expandHint) <= max_2
        ? activitySuffix + expandHint
        : truncateToWidth(activitySuffix, max_2);
    lines.push([
      {
        text: "Activity",
        bold: true,
        dimColor: true,
      },
      ...(activitySuffix
        ? [
            {
              text: activitySuffix,
              dimColor: true,
            },
          ]
        : []),
    ]);
    if (toolCalls_2.length > 0) {
      if (expanded) for (let line of callLines) lines.push(line);
      else
        for (let toolCall of filtered) {
          let state = getCallDisplayState(toolCall, isRunning);
          lines.push(
            renderWorkflowCallHeader({
              call: toolCall,
              state,
              width,
              indent: "  ",
            }),
          );
        }
      let callGrowth = callLines.length - filtered.length;
      hiddenGrowth += callGrowth;
      folds.push({
        end: lines.length - (expanded ? hiddenGrowth : 0),
        growth: callGrowth,
      });
    } else if (agent.lastToolName != null) {
      let lastToolSummaryText = agent.lastToolSummary ? `(${agent.lastToolSummary})` : "";
      let lastToolName = identity(agent.lastToolName);
      lines.push([
        {
          text: truncateToWidth(`  ${lastToolName}${lastToolSummaryText}`, width),
          dimColor: true,
        },
      ]);
    } else
      lines.push([
        {
          text: `  ${status === "running" ? "No tool calls yet." : "No tool calls."}`,
          dimColor: true,
        },
      ]);
    lines.push([
      {
        text: "",
      },
    ]);
  }
  let outcomeLines = [];
  switch (status) {
    case "queued":
      outcomeLines.push([
        {
          text: "  Waiting for an agent slot.",
          dimColor: true,
        },
      ]);
      break;
    case "running":
      outcomeLines.push([
        {
          text: `${"  "}Still running\u2026`,
          dimColor: true,
        },
      ]);
      break;
    case "interrupted":
      outcomeLines.push([
        {
          text: "  The workflow stopped before this agent finished.",
          dimColor: true,
        },
      ]);
      break;
    case "skipped":
      outcomeLines.push([
        {
          text: "  Skipped by user.",
          dimColor: true,
        },
      ]);
      break;
    case "blocked":
    case "failed": {
      for (let errorLine of wrapLines(agent.error ?? "failed", max))
        outcomeLines.push([
          {
            text: "  " + errorLine,
            color: "error",
          },
        ]);
      break;
    }
    case "done": {
      let finalText =
        transcript !== "loading" && transcript?.finalText
          ? transcript.finalText
          : (agent.resultPreview ?? "");
      if (!finalText) {
        outcomeLines.push([
          {
            text: "  " + (transcript === "loading" ? "Loading\u2026" : "(empty)"),
            dimColor: true,
          },
        ]);
        break;
      }
      let jsonOutcomeLines = renderJsonOutcomeLines(finalText, max);
      if (jsonOutcomeLines)
        for (let jsonLine of jsonOutcomeLines)
          outcomeLines.push([
            {
              text: "  ",
            },
            ...jsonLine,
          ]);
      else
        for (let textLine of wrapLines(finalText, max))
          outcomeLines.push([
            {
              text: "  " + textLine,
            },
          ]);
      break;
    }
  }
  let outcomeHiddenLines = pushCollapsibleSection({
    lines,
    title: "Outcome",
    body: outcomeLines,
    collapsedLines: MAX_AGENT_ROWS,
    expanded,
    indent: "  ",
    width,
  });
  return {
    lines,
    expandable: promptHiddenLines > 0 || outcomeHiddenLines > 0 || hasActivityDetail,
    folds,
    detailExpandable: hasActivityDetail,
  };
}
//@ chunk-axsvbsqv.js:34482-36147 placement
function WorkflowAgentDetailPane(props) {
  let $ = useMemoCache(42);
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
  let borderComponent;
  let containerComponent;
  let pos;
  let leftWidth_2;
  let rightWidth_2;
  let leftTag;
  let rightTag;
  let flexDirection;
  let topBorderElement;
  let rowElements;
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
    let clampedCardScroll = clamp(cardScroll, 0, max);
    let min = Math.min(detailLines.length, clampedCardScroll + viewport);
    let rowElements_2 = [];
    for (let idx = 0; idx < viewport; idx++) {
      let agentRowIndex = scrollWindow.from + idx;
      let left =
        agentRowIndex < scrollWindow.to
          ? renderCompactAgentRow(
              agents[agentRowIndex],
              agentRowIndex,
              clampedAgent,
              leftWidth,
              workflowActive,
            )
          : [];
      let detailLineIndex = clampedCardScroll + idx;
      let right = detailLineIndex < min ? detailLines[detailLineIndex] : [];
      rowElements_2.push(
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
    containerComponent = Box;
    flexDirection = "column";
    const title = phase.title;
    let countLabel;
    if ($[21] !== agents.length || $[22] !== filterLabel) {
      countLabel = agentCountLabel(agents.length, filterLabel);
      $[21] = agents.length;
      $[22] = filterLabel;
      $[23] = countLabel;
    } else countLabel = $[23];
    const leftTitle = `${title} \xB7 ${countLabel}`;
    if ($[24] !== agentLabel || $[25] !== leftWidth || $[26] !== rightWidth || $[27] !== leftTitle) {
      topBorderElement = jsxProd_default(SplitPaneBorder, {
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
      $[28] = topBorderElement;
    } else topBorderElement = $[28];
    rowElements = rowElements_2;
    borderComponent = SplitPaneBorder;
    pos = "bottom";
    leftWidth_2 = leftWidth;
    rightWidth_2 = rightWidth;
    leftTag = agents.length > viewport ? formatScrollRange(scrollWindow, agents.length) : undefined;
    rightTag =
      detailLines.length > viewport
        ? formatScrollRange(
            {
              from: clampedCardScroll,
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
    $[11] = borderComponent;
    $[12] = containerComponent;
    $[13] = pos;
    $[14] = leftWidth_2;
    $[15] = rightWidth_2;
    $[16] = leftTag;
    $[17] = rightTag;
    $[18] = flexDirection;
    $[19] = topBorderElement;
    $[20] = rowElements;
  } else {
    borderComponent = $[11];
    containerComponent = $[12];
    pos = $[13];
    leftWidth_2 = $[14];
    rightWidth_2 = $[15];
    leftTag = $[16];
    rightTag = $[17];
    flexDirection = $[18];
    topBorderElement = $[19];
    rowElements = $[20];
  }
  let bottomBorderElement;
  if (
    $[29] !== borderComponent ||
    $[30] !== pos ||
    $[31] !== leftWidth_2 ||
    $[32] !== rightWidth_2 ||
    $[33] !== leftTag ||
    $[34] !== rightTag
  ) {
    bottomBorderElement = jsxProd_default(borderComponent, {
      pos,
      leftWidth: leftWidth_2,
      rightWidth: rightWidth_2,
      leftTag,
      rightTag,
    });
    $[29] = borderComponent;
    $[30] = pos;
    $[31] = leftWidth_2;
    $[32] = rightWidth_2;
    $[33] = leftTag;
    $[34] = rightTag;
    $[35] = bottomBorderElement;
  } else bottomBorderElement = $[35];
  let paneElement;
  if (
    $[36] !== containerComponent ||
    $[37] !== flexDirection ||
    $[38] !== topBorderElement ||
    $[39] !== rowElements ||
    $[40] !== bottomBorderElement
  ) {
    paneElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [topBorderElement, rowElements, bottomBorderElement],
    });
    $[36] = containerComponent;
    $[37] = flexDirection;
    $[38] = topBorderElement;
    $[39] = rowElements;
    $[40] = bottomBorderElement;
    $[41] = paneElement;
  } else paneElement = $[41];
  return paneElement;
}
//@ chunk-axsvbsqv.js:36147-38187 placement
function WorkflowAgentDetail(props) {
  let $ = useMemoCache(43);
  let { agentLabel, position, detailLines, cardScroll, contentWidth, viewport } = props;
  let ruleLine;
  if ($[0] !== contentWidth) {
    ruleLine = HORIZONTAL_LINE_GLYPH.repeat(contentWidth + 2);
    $[0] = contentWidth;
    $[1] = ruleLine;
  } else ruleLine = $[1];
  let rule = ruleLine;
  let max = Math.max(0, detailLines.length - viewport);
  let bottomBorderElement;
  let rows;
  if (
    $[2] !== agentLabel ||
    $[3] !== rule ||
    $[4] !== cardScroll ||
    $[5] !== contentWidth ||
    $[6] !== detailLines ||
    $[7] !== max ||
    $[8] !== position ||
    $[9] !== viewport
  ) {
    let scrollTop = clamp(cardScroll, 0, max);
    let min = Math.min(detailLines.length, scrollTop + viewport);
    rows = [];
    let positionSuffix = ` \xB7 ${position}`;
    const max_2 = Math.max(1, contentWidth - bunStringWidth(positionSuffix));
    let text;
    if ($[12] !== agentLabel || $[13] !== max_2) {
      text = truncateToWidth(agentLabel, max_2);
      $[12] = agentLabel;
      $[13] = max_2;
      $[14] = text;
    } else text = $[14];
    let labelSegment;
    if ($[15] !== text) {
      labelSegment = {
        text,
        color: "permission",
        bold: true,
      };
      $[15] = text;
      $[16] = labelSegment;
    } else labelSegment = $[16];
    let positionSegment;
    if ($[17] !== positionSuffix) {
      positionSegment = {
        text: positionSuffix,
        dimColor: true,
      };
      $[17] = positionSuffix;
      $[18] = positionSegment;
    } else positionSegment = $[18];
    let segs;
    if ($[19] !== labelSegment || $[20] !== positionSegment) {
      segs = [labelSegment, positionSegment];
      $[19] = labelSegment;
      $[20] = positionSegment;
      $[21] = segs;
    } else segs = $[21];
    let titleLineElement;
    if ($[22] !== contentWidth || $[23] !== segs) {
      titleLineElement = jsxProd_default(
        BoxedSegmentLine,
        {
          contentWidth,
          segs,
        },
        "title",
      );
      $[22] = contentWidth;
      $[23] = segs;
      $[24] = titleLineElement;
    } else titleLineElement = $[24];
    rows.push(titleLineElement);
    for (let lineIndex = scrollTop; lineIndex < min; lineIndex++)
      rows.push(
        jsxProd_default(
          BoxedSegmentLine,
          {
            contentWidth,
            segs: detailLines[lineIndex],
          },
          `l-${lineIndex}`,
        ),
      );
    for (let idx = min - scrollTop; idx < viewport; idx++)
      rows.push(
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
      let scrollRangeText = ` ${formatScrollRange(
        {
          from: scrollTop,
          to: min,
        },
        detailLines.length,
      )} `;
      let max = Math.max(0, contentWidth + 2 - bunStringWidth(scrollRangeText));
      let bottomRule;
      if ($[25] !== max) {
        bottomRule = HORIZONTAL_LINE_GLYPH.repeat(max);
        $[25] = max;
        $[26] = bottomRule;
      } else bottomRule = $[26];
      let bottomLeftElement;
      if ($[27] !== bottomRule) {
        bottomLeftElement = jsxProd_default_2(Text, {
          color: "text",
          children: [" ", ROUNDED_BOX_CORNERS.bottomLeft, bottomRule],
        });
        $[27] = bottomRule;
        $[28] = bottomLeftElement;
      } else bottomLeftElement = $[28];
      let scrollRangeElement;
      if ($[29] !== scrollRangeText) {
        scrollRangeElement = jsxProd_default(Text, {
          dimColor: true,
          children: scrollRangeText,
        });
        $[29] = scrollRangeText;
        $[30] = scrollRangeElement;
      } else scrollRangeElement = $[30];
      let bottomRightElement;
      if ($[31] === MEMO_CACHE_SENTINEL) {
        bottomRightElement = jsxProd_default(Text, {
          color: "text",
          children: ROUNDED_BOX_CORNERS.bottomRight,
        });
        $[31] = bottomRightElement;
      } else bottomRightElement = $[31];
      let bottomFooterElement;
      if ($[32] !== scrollRangeElement || $[33] !== bottomLeftElement) {
        bottomFooterElement = jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [bottomLeftElement, scrollRangeElement, bottomRightElement],
        });
        $[32] = scrollRangeElement;
        $[33] = bottomLeftElement;
        $[34] = bottomFooterElement;
      } else bottomFooterElement = $[34];
      bottomBorderElement = bottomFooterElement;
    } else {
      let ruleElement;
      if ($[35] !== rule) {
        ruleElement = jsxProd_default_2(Text, {
          color: "text",
          wrap: "truncate-end",
          children: [" ", ROUNDED_BOX_CORNERS.bottomLeft, rule, ROUNDED_BOX_CORNERS.bottomRight],
        });
        $[35] = rule;
        $[36] = ruleElement;
      } else ruleElement = $[36];
      bottomBorderElement = ruleElement;
    }
    $[2] = agentLabel;
    $[3] = rule;
    $[4] = cardScroll;
    $[5] = contentWidth;
    $[6] = detailLines;
    $[7] = max;
    $[8] = position;
    $[9] = viewport;
    $[10] = bottomBorderElement;
    $[11] = rows;
  } else {
    bottomBorderElement = $[10];
    rows = $[11];
  }
  let overflowRuleElement;
  if ($[37] !== rule) {
    overflowRuleElement = jsxProd_default_2(Text, {
      color: "text",
      wrap: "truncate-end",
      children: [" ", ROUNDED_BOX_CORNERS.topLeft, rule, ROUNDED_BOX_CORNERS.topRight],
    });
    $[37] = rule;
    $[38] = overflowRuleElement;
  } else overflowRuleElement = $[38];
  let footerBox;
  if ($[39] !== bottomBorderElement || $[40] !== rows || $[41] !== overflowRuleElement) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [overflowRuleElement, rows, bottomBorderElement],
    });
    $[39] = bottomBorderElement;
    $[40] = rows;
    $[41] = overflowRuleElement;
    $[42] = footerBox;
  } else footerBox = $[42];
  return footerBox;
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
  let elapsedMs = ElapsedClock(workflow);
  let phaseRows = useMemo(() => workflowPhaseRows(workflow), [workflow.workflowProgress, workflow.phases]);
  let agentCounts = useMemo(
    () => sumPhaseCounts(phaseRows, workflow.agentCount),
    [phaseRows, workflow.agentCount],
  );
  let [phaseIndex, setPhaseIndex] = useState(() =>
    initialPhaseIndex !== undefined ? Math.max(0, initialPhaseIndex) : 0,
  );
  let [agentIndex, setAgentIndex] = useState(0);
  let [level, setLevel] = useState(initialPhaseIndex !== undefined ? "agents" : "phases");
  let [isAwaitingTranscript, setIsAwaitingTranscript] = useState(false);
  let [cardScrollState, setCardScrollState] = useState({
    scroll: 0,
    expanded: false,
  });
  let { scroll, expanded } = cardScrollState;
  let [agentFilter, setAgentFilter] = useState("all");
  let min = Math.min(phaseIndex, Math.max(0, phaseRows.length - 1));
  let currentPhaseRow = phaseRows[min];
  let isWorkflowRunning = workflow.status === "running";
  let visiblePhaseRow = useMemo(() => {
    if (!currentPhaseRow || agentFilter === "all" || level === "phases") return currentPhaseRow;
    return {
      ...currentPhaseRow,
      agents: currentPhaseRow.agents.filter(
        (agent) => getAgentDisplayState(agent, isWorkflowRunning) === agentFilter,
      ),
    };
  }, [currentPhaseRow, agentFilter, level, isWorkflowRunning]);
  let clampedAgentIndex = visiblePhaseRow
    ? Math.min(agentIndex, Math.max(0, visiblePhaseRow.agents.length - 1))
    : 0;
  let [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  let hasScript = workflow.script.length > 0;
  let defaultName = useMemo(() => {
    if (!hasScript) return "";
    let workflowScript = parseWorkflowScript(workflow.script);
    if (!("error" in workflowScript)) return workflowScript.meta.name;
    return slugifyWorkflowName(workflow.summary ?? workflow.description);
  }, [hasScript, workflow.script, workflow.summary, workflow.description]);
  let description = useMemo(
    () => workflowDescription(workflow),
    [workflow.script, workflow.description, workflow.summary],
  );
  let {
    name: workflowName,
    subtext,
    stats,
  } = workflowStatusLine(workflow, description, agentCounts, elapsedMs);
  function resetCardScroll() {
    setCardScrollState({
      scroll: 0,
      expanded: false,
    });
  }
  function movePhase(delta) {
    setPhaseIndex((currentIndex) =>
      clamp(clamp(currentIndex, 0, phaseRows.length - 1) + delta, 0, phaseRows.length - 1),
    );
    setAgentIndex(0);
    resetCardScroll();
  }
  function moveAgent(delta) {
    if (!visiblePhaseRow) return;
    setAgentIndex((currentIndex) =>
      clamp(
        clamp(currentIndex, 0, visiblePhaseRow.agents.length - 1) + delta,
        0,
        visiblePhaseRow.agents.length - 1,
      ),
    );
    resetCardScroll();
  }
  function scrollCard(delta) {
    setCardScrollState((previousState) => ({
      ...previousState,
      scroll: Math.max(0, previousState.scroll + delta),
    }));
  }
  function moveSelection(delta) {
    if (level === "phases") {
      movePhase(delta);
      return;
    }
    moveAgent(delta);
  }
  function goBack() {
    setIsAwaitingTranscript(false);
    if (level === "agent") {
      setLevel("agents");
      return;
    }
    if (level === "agents") {
      setLevel("phases");
      return;
    }
    if (onBack) onBack();
    else onDone();
  }
  function openAgentsLevel() {
    if (currentPhaseRow && currentPhaseRow.agents.length > 0) {
      setAgentIndex(0);
      setAgentFilter("all");
      setLevel("agents");
    }
  }
  function openAgentDetail() {
    if (!selectedAgent || !currentPhaseRow) return;
    if (agentFilter !== "all") {
      setAgentFilter("all");
      setAgentIndex(currentPhaseRow.agents.indexOf(selectedAgent));
    }
    resetCardScroll();
    if (workflowAgentTranscript === "loading") setIsAwaitingTranscript(true);
    else setLevel("agent");
  }
  function cycleAgentFilter() {
    if (!currentPhaseRow || isAwaitingTranscript) return;
    let presentStates = new Set(
      currentPhaseRow.agents.map((agent) => getAgentDisplayState(agent, isWorkflowRunning)),
    );
    setAgentFilter((currentFilter) => {
      let index = WORKFLOW_TASK_FILTERS.indexOf(currentFilter);
      for (let idx = 0; idx < WORKFLOW_TASK_FILTERS.length; idx++) {
        index = (index + 1) % WORKFLOW_TASK_FILTERS.length;
        let candidateFilter = WORKFLOW_TASK_FILTERS[index];
        if (candidateFilter === "all" || presentStates.has(candidateFilter)) break;
      }
      return WORKFLOW_TASK_FILTERS[index];
    });
    setAgentIndex(0);
    resetCardScroll();
  }
  let selectedAgent =
    level !== "phases" && visiblePhaseRow ? visiblePhaseRow.agents[clampedAgentIndex] : undefined;
  let selectedAgentStatus = selectedAgent
    ? getAgentDisplayState(selectedAgent, isWorkflowRunning)
    : undefined;
  let canSkipAgent =
    !!selectedAgent && isRunningState(selectedAgent) && !!selectedAgent.agentId && !!onSkipAgent;
  let canRetryAgent =
    !!selectedAgent && isRunningState(selectedAgent) && !!selectedAgent.agentId && !!onRetryAgent;
  let contentWidth = width - 9;
  let agentLabelWidth = visiblePhaseRow
    ? Math.max(14, ...visiblePhaseRow.agents.map((agent) => 4 + bunStringWidth(agent.label)))
    : 14;
  let max_2 = Math.max(12, Math.min(30, agentLabelWidth, contentWidth - 30));
  let detailPaneWidth = contentWidth - max_2;
  let isSplitAgentView = level === "agent" && phaseRows.length > 0 && width >= 64 && detailPaneWidth >= 30;
  let cardWidth = isSplitAgentView ? detailPaneWidth : max;
  let workflowAgentTranscript = useWorkflowAgentTranscript(
    workflow.workflowRunId,
    selectedAgent?.agentId,
    selectedAgent?.lastProgressAt,
    selectedAgent?.promptFramed,
  );
  let timeout = useTimeout(isAwaitingTranscript ? REFRESH_FAST_MS : null);
  if (isAwaitingTranscript) {
    if (!selectedAgent) setIsAwaitingTranscript(false);
    else if (workflowAgentTranscript !== "loading" || timeout) {
      setIsAwaitingTranscript(false);
      setLevel("agent");
    }
  }
  let nowMs =
    selectedAgentStatus === "queued" || selectedAgentStatus === "running"
      ? Math.floor(Date.now() / 1000) * 1000
      : 0;
  let agentCard = useMemo(
    () =>
      level === "agent" && selectedAgent && selectedAgentStatus
        ? WorkflowAgentCard({
            agent: selectedAgent,
            status: selectedAgentStatus,
            transcript: workflowAgentTranscript,
            expanded,
            width: cardWidth,
            nowMs,
          })
        : {
            lines: [],
            expandable: false,
            folds: [],
            detailExpandable: false,
          },
    [level, selectedAgent, selectedAgentStatus, workflowAgentTranscript, expanded, cardWidth, nowMs],
  );
  let lines = agentCard.lines;
  function skipSelectedAgent() {
    if (selectedAgent && isRunningState(selectedAgent) && selectedAgent.agentId)
      onSkipAgent?.(selectedAgent.agentId);
  }
  function retrySelectedAgent() {
    if (selectedAgent && isRunningState(selectedAgent) && selectedAgent.agentId)
      onRetryAgent?.(selectedAgent.agentId);
  }
  MessageActionsKeybindings(
    {
      "confirm:previous": () => moveSelection(-1),
      "confirm:next": () => moveSelection(1),
    },
    {
      context: "Confirmation",
    },
  );
  let canPause = workflow.status === "running" && !!onPause;
  let canResume =
    workflow.status === "paused" && !!workflow.scriptPath && !!workflow.workflowRunId && !!onResume;
  let canKill = workflow.status === "running" && !!onKill && level === "phases";
  function togglePause() {
    if (canPause) onPause?.();
    else if (canResume) onResume?.(buildResumePrompt(workflow));
  }
  let onKeyDown = (event) => {
    if (event.ctrl || event.meta) return;
    if (event.key === "j") {
      event.preventDefault();
      if (level === "agent") scrollCard(1);
      else moveSelection(1);
    } else if (event.key === "k") {
      event.preventDefault();
      if (level === "agent") scrollCard(-1);
      else moveSelection(-1);
    } else if (event.key === "return" || event.key === "right") {
      event.preventDefault();
      if (level === "phases") openAgentsLevel();
      else if (level === "agents") openAgentDetail();
      else if (event.key === "return" && agentCard.expandable) {
        if (!expanded && agentCard.detailExpandable) logFeatureOk("workflow_agent_card_detail");
        let { folds } = agentCard;
        setCardScrollState(({ scroll, expanded }) => ({
          expanded: !expanded,
          scroll: expanded ? mapRowThroughGrowth(scroll, folds) : addPrecedingGrowth(scroll, folds),
        }));
      }
    } else if (event.key === "left") {
      event.preventDefault();
      goBack();
    } else if (event.key === "r" && canRetryAgent) {
      event.preventDefault();
      retrySelectedAgent();
    } else if (event.key === "x" && canSkipAgent) {
      event.preventDefault();
      skipSelectedAgent();
    } else if (event.key === "x" && canKill) {
      event.preventDefault();
      onKill?.();
    } else if (event.key === " ") {
      event.preventDefault();
      onDone();
    } else if (event.key === "p" && (canPause || canResume)) {
      event.preventDefault();
      togglePause();
    } else if (event.key === "f" && level === "agents") {
      event.preventDefault();
      cycleAgentFilter();
    } else if (event.key === "s" && hasScript) {
      event.preventDefault();
      setIsSaveDialogOpen(true);
    }
  };
  let hasAgents = phaseRows.length > 0;
  if (isSaveDialogOpen)
    return jsxProd_default(WorkflowSaveDialog, {
      script: workflow.script,
      defaultName,
      onDone: (saveResult) => {
        if (saveResult) onDone(saveResult);
        else setIsSaveDialogOpen(false);
      },
    });
  let isCompact = availableRows < 18;
  let bodyRows = availableRows - (isCompact ? 8 : 11);
  let max_3 = Math.max(1, bodyRows - 3);
  let hasPhaseOverflow = phaseRows.length > max_3;
  let phaseViewport = hasPhaseOverflow ? Math.max(1, max_3 - 1) : phaseRows.length;
  let viewport = Math.max(1, bodyRows - phaseViewport - (hasPhaseOverflow ? 1 : 0));
  let scrollWindow = computeScrollWindow(min, phaseRows.length, phaseViewport);
  let max_4 = Math.max(
    14,
    ...phaseRows.map((phaseRow, phaseIndex) => {
      let statusGlyph =
        phaseRow.status === "done"
          ? figures_default.tick
          : phaseRow.status === "failed"
            ? figures_default.cross
            : String(phaseIndex + 1);
      let countText = phaseRow.totalCount > 0 ? `${phaseRow.doneCount}/${phaseRow.totalCount}` : "";
      return (
        2 +
        bunStringWidth(statusGlyph) +
        1 +
        bunStringWidth(phaseRow.title) +
        (countText ? 1 + bunStringWidth(countText) : 0)
      );
    }),
  );
  let max_5 = Math.max(12, Math.min(34, max_4, contentWidth - 24));
  let phasesPaneWidth = contentWidth - max_5;
  let isSplitPhaseView = level !== "agent" && hasAgents && width >= 64 && phasesPaneWidth >= 20;
  let max_6 = Math.max(1, availableRows - (isCompact ? 7 : 8));
  let max_7 = Math.max(3, availableRows - (isCompact ? 8 : 9));
  let cardViewport = isSplitAgentView ? max_6 : max_7;
  let max_8 = Math.max(0, lines.length - cardViewport);
  if (scroll > max_8)
    setCardScrollState({
      scroll: max_8,
      expanded,
    });
  let filterLabel =
    agentFilter !== "all" && level !== "phases" ? AGENT_STATE_LABELS[agentFilter].toLowerCase() : undefined;
  let hints = [];
  if (level === "agent") {
    hints.push(`${UP_ARROW}${DOWN_ARROW} agent`);
    if (lines.length > cardViewport) hints.push("j/k scroll");
    if (agentCard.expandable) hints.push(`${RETURN_SYMBOL} ${expanded ? "collapse" : "expand"}`);
  } else if (hasAgents) hints.push(`${UP_ARROW}${DOWN_ARROW} select`);
  if (canSkipAgent) hints.push("x stop");
  if (canKill) hints.push("x stop workflow");
  if (canRetryAgent) hints.push("r restart");
  if (canPause) hints.push("p pause");
  else if (canResume) hints.push("p resume");
  if (level === "agents" && hasAgents) hints.push(filterLabel ? `f filter: ${filterLabel}` : "f filter");
  hints.push("esc back");
  if (hasScript) hints.push("s save");
  let joined = hints.join(" \xB7 ");
  return jsxProd_default(FocusColumn, {
    onKeyDown,
    children: jsxProd_default(Dialog, {
      title: null,
      hideBorder: true,
      hideInputGuide: true,
      onCancel: goBack,
      color: "text",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        width,
        minHeight: Math.max(isCompact ? 8 : 12, Math.min(availableRows - 1, rows - 6)),
        maxHeight: Math.max(isCompact ? 8 : 11, availableRows - 1),
        overflowY: "hidden",
        children: [
          !hasAgents
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
            : level === "agent" && selectedAgent && visiblePhaseRow
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(WorkflowHeader, {
                      name: workflowName,
                      subtext,
                      stats,
                      width,
                    }),
                    !isCompact &&
                      jsxProd_default(Box, {
                        height: 1,
                      }),
                    isSplitAgentView
                      ? jsxProd_default(WorkflowAgentDetailPane, {
                          phase: visiblePhaseRow,
                          clampedAgent: clampedAgentIndex,
                          agentLabel: selectedAgent.label,
                          detailLines: lines,
                          cardScroll: scroll,
                          leftWidth: max_2,
                          rightWidth: detailPaneWidth,
                          viewport: max_6,
                          workflowActive: isWorkflowRunning,
                          filterLabel,
                        })
                      : jsxProd_default(WorkflowAgentDetail, {
                          agentLabel: selectedAgent.label,
                          position: `${clampedAgentIndex + 1}/${visiblePhaseRow.agents.length}`,
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
              : isSplitPhaseView && visiblePhaseRow
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(WorkflowHeader, {
                        name: workflowName,
                        subtext,
                        stats,
                        width,
                      }),
                      !isCompact &&
                        jsxProd_default(Box, {
                          height: 1,
                        }),
                      jsxProd_default(WorkflowPhasesPane, {
                        phases: phaseRows,
                        selectedPhase: visiblePhaseRow,
                        clampedPhase: min,
                        clampedAgent: clampedAgentIndex,
                        level: level === "phases" ? "phases" : "agents",
                        leftWidth: max_5,
                        rightWidth: phasesPaneWidth,
                        viewport: max_6,
                        workflowActive: isWorkflowRunning,
                        filterLabel,
                      }),
                      jsxProd_default(Box, {
                        flexGrow: 1,
                      }),
                    ],
                  })
                : jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(WorkflowHeader, {
                        name: workflowName,
                        subtext,
                        stats,
                        width,
                      }),
                      !isCompact &&
                        jsxProd_default(Box, {
                          height: 1,
                        }),
                      phaseRows.slice(scrollWindow.from, scrollWindow.to).map((phaseRow, indexInWindow) => {
                        let rowIndex = scrollWindow.from + indexInWindow;
                        return jsxProd_default(
                          WorkflowPhaseRow,
                          {
                            index: rowIndex + 1,
                            title: phaseRow.title,
                            done: phaseRow.doneCount,
                            total: phaseRow.totalCount,
                            status: phaseRow.status,
                            selected: rowIndex === min,
                          },
                          `${rowIndex}-${phaseRow.title}`,
                        );
                      }),
                      hasPhaseOverflow &&
                        jsxProd_default(ScrollRangeIndicator, {
                          win: scrollWindow,
                          total: phaseRows.length,
                        }),
                      jsxProd_default(Box, {
                        flexGrow: 1,
                      }),
                      visiblePhaseRow
                        ? jsxProd_default(WorkflowAgentsPane, {
                            phase: visiblePhaseRow,
                            selectedAgent: clampedAgentIndex,
                            level: level === "phases" ? "phases" : "agents",
                            contentWidth: max,
                            viewport,
                            tight: isCompact,
                            workflowActive: isWorkflowRunning,
                            filterLabel,
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
