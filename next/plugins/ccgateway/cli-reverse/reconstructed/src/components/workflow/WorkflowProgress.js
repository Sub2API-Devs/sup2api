/**
 * components/workflow/WorkflowProgress.tsx
 *
 * 2.1.316 新增：工作流运行进度显示（阶段、子代理行、汇总）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g916dfgc.js (43)
 * attribution: placement 43
 */
import {
  init_react_production,
  fragmentTypeExport,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import { getMarketingNameForModel } from "../../utils/model/model.js";
import { displayModelName } from "../../utils/model/validateModel.js";
import {
  RIGHT_ARROW,
  BRAILLE_FULL_BLOCK,
  BLACK_CIRCLE,
  HORIZONTAL_LINE_GLYPH,
} from "../../constants/figures.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { formatTokens, formatDuration, truncateToWidth, formatBarElapsed } from "../../utils/format.js";
import { plural, collapseWhitespace } from "../../utils/stringUtils.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { countWhere } from "../../utils/collections.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getBrailleSpinnerFrames } from "../../../vendor/chart.js/dist/chart.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useInterval } from "../../ink/components/Input.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { isStopReason } from "../../tasks/LocalWorkflowTask/workflowStopReasons.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { pausedUsageLine } from "../../utils/usageLimitText.js";
import { hasStartedOrQueued } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g916dfgc.js:959-963 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g916dfgc.js:959", () => {
  init_react_production();
});
//@ chunk-g916dfgc.js:963-1086 placement
function modelTransitionText(id, id_2) {
  let formatModel = (id) => getMarketingNameForModel(id) ?? displayModelName(id);
  if (id_2 != null) return `${id == null ? "" : `${formatModel(id)} `}${RIGHT_ARROW} ${formatModel(id_2)}`;
  return id != null ? formatModel(id) : "";
}
//@ chunk-g916dfgc.js:1086-1127 placement (2.1.88 match: AGENT_VERB, 0.386)
function isDoneState(agent) {
  return agent.state === "done";
}
//@ chunk-g916dfgc.js:1127-1169 placement
function isErrorState(agent) {
  return agent.state === "error";
}
//@ chunk-g916dfgc.js:1169-1234 placement
function isRunningStep(member) {
  return member.state === "start" || member.state === "progress";
}
//@ chunk-g916dfgc.js:1234-1273 placement
function isDoneStep(member) {
  return member.state === "done";
}
//@ chunk-g916dfgc.js:1273-1313 placement
function isErrorStep(member) {
  return member.state === "error";
}
//@ chunk-g916dfgc.js:1313-1369 placement
function renderDimText(children, key) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children,
    },
    key,
  );
}
//@ chunk-g916dfgc.js:1369-1683 placement
function collectWorkflowProgress(events) {
  let agentByIndex = new Map();
  let logs = [];
  let phaseTitleByIndex = new Map();
  for (let event of events)
    if (event.type === "workflow_agent") agentByIndex.set(event.index, event);
    else if (event.type === "workflow_log") logs.push(event.message);
    else if (event.type === "workflow_phase")
      phaseTitleByIndex.set(event.index, {
        title: event.title,
        kind: event.kind,
      });
  return {
    agents: [...agentByIndex.values()].sort((agentA, agentB) => agentA.index - agentB.index),
    logs,
    phaseTitles: phaseTitleByIndex,
  };
}
//@ chunk-g916dfgc.js:1683-1991 placement
function groupAgentsByPhase(agents, phaseTitles) {
  if (!agents.some((agent) => agent.phaseIndex != null)) return null;
  let groupByPhase = new Map();
  for (let agent of agents) {
    let phaseIndex = agent.phaseIndex ?? 0;
    let group = groupByPhase.get(phaseIndex);
    if (!group) {
      let phaseTitle = phaseTitles.get(phaseIndex);
      group = {
        phaseIndex,
        title: phaseTitle?.title ?? `Phase ${phaseIndex}`,
        kind: phaseTitle?.kind,
        agents: [],
      };
      groupByPhase.set(phaseIndex, group);
    }
    group.agents.push(agent);
  }
  return [...groupByPhase.values()].sort((groupA, groupB) => groupA.phaseIndex - groupB.phaseIndex);
}
//@ chunk-g916dfgc.js:1991-3797 placement
function WorkflowAgentRow(props) {
  let $ = useMemoCache(31);
  let { row, isLast } = props;
  let connector = isLast ? "\u2514\u2500" : "\u251C\u2500";
  let isRunning = row.state === "start" || row.state === "progress";
  let status;
  c: switch (row.state) {
    case "done": {
      status = "success";
      break c;
    }
    case "error": {
      status = "error";
      break c;
    }
    case "start":
    case "progress": {
      status = "running";
    }
  }
  let metaParts;
  if (
    $[0] !== isRunning ||
    $[1] !== row.agentType ||
    $[2] !== row.durationMs ||
    $[3] !== row.fallbackModel ||
    $[4] !== row.model ||
    $[5] !== row.tokens ||
    $[6] !== row.toolCalls
  ) {
    metaParts = [];
    if (row.agentType != null) metaParts.push(row.agentType);
    if (row.model != null || row.fallbackModel != null) {
      let modelText;
      if ($[8] !== row.fallbackModel || $[9] !== row.model) {
        modelText = modelTransitionText(row.model, row.fallbackModel);
        $[8] = row.fallbackModel;
        $[9] = row.model;
        $[10] = modelText;
      } else modelText = $[10];
      metaParts.push(modelText);
    }
    if (row.tokens != null) {
      let tokenText;
      if ($[11] !== row.tokens) {
        tokenText = formatTokens(row.tokens);
        $[11] = row.tokens;
        $[12] = tokenText;
      } else tokenText = $[12];
      metaParts.push(`${tokenText} tok`);
    }
    if (row.toolCalls != null && row.toolCalls > 0) {
      const toolCalls = row.toolCalls;
      let toolLabel;
      if ($[13] !== row.toolCalls) {
        toolLabel = plural(row.toolCalls, "tool");
        $[13] = row.toolCalls;
        $[14] = toolLabel;
      } else toolLabel = $[14];
      metaParts.push(`${toolCalls} ${toolLabel}`);
    }
    if (row.durationMs != null) {
      let durationText;
      if ($[15] !== row.durationMs) {
        durationText = formatDuration(row.durationMs);
        $[15] = row.durationMs;
        $[16] = durationText;
      } else durationText = $[16];
      metaParts.push(durationText);
    }
    if (isRunning && metaParts.length === 0) metaParts.push("\u2026running");
    $[0] = isRunning;
    $[1] = row.agentType;
    $[2] = row.durationMs;
    $[3] = row.fallbackModel;
    $[4] = row.model;
    $[5] = row.tokens;
    $[6] = row.toolCalls;
    $[7] = metaParts;
  } else metaParts = $[7];
  let statusIcon;
  if ($[17] !== status) {
    statusIcon = jsxProd_default(StatusIcon, {
      status,
    });
    $[17] = status;
    $[18] = statusIcon;
  } else statusIcon = $[18];
  const label = row.label;
  let metaElement;
  if ($[19] !== metaParts) {
    metaElement =
      metaParts.length > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["  ", metaParts.join(" \xB7 ")],
      });
    $[19] = metaParts;
    $[20] = metaElement;
  } else metaElement = $[20];
  let errorElement;
  if ($[21] !== row.error || $[22] !== row.state) {
    errorElement =
      row.state === "error" &&
      row.error &&
      jsxProd_default_2(Text, {
        color: "error",
        children: [" ", "\u2014", " ", row.error],
      });
    $[21] = row.error;
    $[22] = row.state;
    $[23] = errorElement;
  } else errorElement = $[23];
  let rowElement;
  if (
    $[24] !== isRunning ||
    $[25] !== row.label ||
    $[26] !== statusIcon ||
    $[27] !== metaElement ||
    $[28] !== errorElement ||
    $[29] !== connector
  ) {
    rowElement = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default_2(Text, {
        dimColor: isRunning,
        children: [connector, " ", statusIcon, " ", label, metaElement, errorElement],
      }),
    });
    $[24] = isRunning;
    $[25] = row.label;
    $[26] = statusIcon;
    $[27] = metaElement;
    $[28] = errorElement;
    $[29] = connector;
    $[30] = rowElement;
  } else rowElement = $[30];
  return rowElement;
}
//@ chunk-g916dfgc.js:3797-5689 placement
function WorkflowPhaseGroup(props) {
  let $ = useMemoCache(41);
  let { group, verbose, width } = props;
  let doneAgents;
  if ($[0] !== group.agents) {
    doneAgents = group.agents.filter(isDoneState);
    $[0] = group.agents;
    $[1] = doneAgents;
  } else doneAgents = $[1];
  let doneAgents_ = doneAgents;
  let isAllSettled;
  let doneCount;
  let errorCount;
  let shownAgents;
  let totalCount;
  if ($[2] !== doneAgents_.length || $[3] !== group.agents || $[4] !== verbose) {
    let filtered = group.agents.filter(isErrorState);
    let filtered_2 = group.agents.filter(isRunningStep);
    totalCount = group.agents.length;
    doneCount = doneAgents_.length;
    errorCount = filtered.length;
    isAllSettled = doneCount + errorCount === totalCount && totalCount > 0;
    shownAgents = verbose ? group.agents : [...filtered, ...filtered_2];
    $[2] = doneAgents_.length;
    $[3] = group.agents;
    $[4] = verbose;
    $[5] = isAllSettled;
    $[6] = doneCount;
    $[7] = errorCount;
    $[8] = shownAgents;
    $[9] = totalCount;
  } else {
    isAllSettled = $[5];
    doneCount = $[6];
    errorCount = $[7];
    shownAgents = $[8];
    totalCount = $[9];
  }
  let shownAgents_ = shownAgents;
  let model = group.agents[0]?.model;
  let sharedModelText;
  if ($[10] !== model || $[11] !== group.agents) {
    sharedModelText =
      model && group.agents.every((agent) => agent.model === model)
        ? modelTransitionText(model, undefined)
        : undefined;
    $[10] = model;
    $[11] = group.agents;
    $[12] = sharedModelText;
  } else sharedModelText = $[12];
  let sharedModelText_ = sharedModelText;
  let status = !isAllSettled ? "running" : errorCount > 0 ? "error" : "success";
  const borderColor = group.kind === "child" ? "permission" : "subtle";
  let titleElement;
  if ($[13] !== group.title) {
    titleElement = jsxProd_default(Text, {
      bold: true,
      children: group.title,
    });
    $[13] = group.title;
    $[14] = titleElement;
  } else titleElement = $[14];
  let statusIcon;
  if ($[15] !== status) {
    statusIcon = jsxProd_default(StatusIcon, {
      status,
    });
    $[15] = status;
    $[16] = statusIcon;
  } else statusIcon = $[16];
  const modelSuffix = sharedModelText_ && ` \xB7 ${sharedModelText_}`;
  let failedElement;
  if ($[17] !== errorCount) {
    failedElement =
      errorCount > 0 &&
      jsxProd_default_2(Text, {
        color: "error",
        children: [" ", "\xB7", " ", errorCount, " failed"],
      });
    $[17] = errorCount;
    $[18] = failedElement;
  } else failedElement = $[18];
  let progressElement;
  if ($[19] !== doneCount || $[20] !== modelSuffix || $[21] !== failedElement || $[22] !== totalCount) {
    progressElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [doneCount, "/", totalCount, modelSuffix, failedElement],
    });
    $[19] = doneCount;
    $[20] = modelSuffix;
    $[21] = failedElement;
    $[22] = totalCount;
    $[23] = progressElement;
  } else progressElement = $[23];
  let headerElement;
  if ($[24] !== titleElement || $[25] !== statusIcon || $[26] !== progressElement) {
    headerElement = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default_2(Text, {
        children: [titleElement, "  ", statusIcon, " ", progressElement],
      }),
    });
    $[24] = titleElement;
    $[25] = statusIcon;
    $[26] = progressElement;
    $[27] = headerElement;
  } else headerElement = $[27];
  let collapsedDoneElement;
  if ($[28] !== doneCount || $[29] !== verbose) {
    collapsedDoneElement =
      !verbose &&
      doneCount > 0 &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            jsxProd_default(StatusIcon, {
              status: "success",
            }),
            " ",
            doneCount,
            " done",
          ],
        }),
      });
    $[28] = doneCount;
    $[29] = verbose;
    $[30] = collapsedDoneElement;
  } else collapsedDoneElement = $[30];
  let agentRows;
  if ($[31] !== shownAgents_) {
    let renderRow;
    if ($[33] !== shownAgents_.length) {
      renderRow = (agentRow, rowIndex) =>
        jsxProd_default(
          WorkflowAgentRow,
          {
            row: agentRow,
            isLast: rowIndex === shownAgents_.length - 1,
          },
          agentRow.index,
        );
      $[33] = shownAgents_.length;
      $[34] = renderRow;
    } else renderRow = $[34];
    agentRows = shownAgents_.map(renderRow);
    $[31] = shownAgents_;
    $[32] = agentRows;
  } else agentRows = $[32];
  let groupElement;
  if (
    $[35] !== headerElement ||
    $[36] !== collapsedDoneElement ||
    $[37] !== agentRows ||
    $[38] !== borderColor ||
    $[39] !== width
  ) {
    groupElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      borderStyle: "single",
      borderColor,
      alignSelf: "flex-start",
      width,
      children: [headerElement, collapsedDoneElement, agentRows],
    });
    $[35] = headerElement;
    $[36] = collapsedDoneElement;
    $[37] = agentRows;
    $[38] = borderColor;
    $[39] = width;
    $[40] = groupElement;
  } else groupElement = $[40];
  return groupElement;
}
//@ chunk-g916dfgc.js:5689-5698 placement
var WORKFLOW_ROW_HEIGHT = 8;
//@ chunk-g916dfgc.js:5698-6819 placement
function WorkflowAgentList(props) {
  let $ = useMemoCache(26);
  let { agents, verbose } = props;
  let visibleAgents;
  if ($[0] !== agents || $[1] !== verbose) {
    visibleAgents = verbose ? agents : agents.slice(-WORKFLOW_ROW_HEIGHT);
    $[0] = agents;
    $[1] = verbose;
    $[2] = visibleAgents;
  } else visibleAgents = $[2];
  let visibleAgents_ = visibleAgents;
  let hiddenCount = agents.length - visibleAgents_.length;
  let doneCount;
  if ($[3] !== agents) {
    doneCount = countWhere(agents, isDoneStep);
    $[3] = agents;
    $[4] = doneCount;
  } else doneCount = $[4];
  let doneCount_ = doneCount;
  let errorCount = countWhere(agents, isErrorStep);
  const totalCount = agents.length;
  let agentLabel;
  if ($[5] !== agents.length) {
    agentLabel = plural(agents.length, "agent");
    $[5] = agents.length;
    $[6] = agentLabel;
  } else agentLabel = $[6];
  let failedElement;
  if ($[7] !== errorCount) {
    failedElement =
      errorCount > 0 &&
      jsxProd_default_2(Text, {
        color: "error",
        children: [" ", "\xB7", " ", errorCount, " failed"],
      });
    $[7] = errorCount;
    $[8] = failedElement;
  } else failedElement = $[8];
  let summaryElement;
  if ($[9] !== agents.length || $[10] !== doneCount_ || $[11] !== agentLabel || $[12] !== failedElement) {
    summaryElement = jsxProd_default_2(Text, {
      children: [totalCount, " ", agentLabel, " ", "\xB7", " ", doneCount_, " done", failedElement],
    });
    $[9] = agents.length;
    $[10] = doneCount_;
    $[11] = agentLabel;
    $[12] = failedElement;
    $[13] = summaryElement;
  } else summaryElement = $[13];
  let rowElements;
  if ($[14] !== hiddenCount || $[15] !== visibleAgents_) {
    let renderRow;
    if ($[17] !== hiddenCount || $[18] !== visibleAgents_.length) {
      renderRow = (agentRow, rowIndex) =>
        jsxProd_default(
          WorkflowAgentRow,
          {
            row: agentRow,
            isLast: rowIndex === visibleAgents_.length - 1 && hiddenCount === 0,
          },
          agentRow.index,
        );
      $[17] = hiddenCount;
      $[18] = visibleAgents_.length;
      $[19] = renderRow;
    } else renderRow = $[19];
    rowElements = visibleAgents_.map(renderRow);
    $[14] = hiddenCount;
    $[15] = visibleAgents_;
    $[16] = rowElements;
  } else rowElements = $[16];
  let moreElement;
  if ($[20] !== hiddenCount) {
    moreElement =
      hiddenCount > 0 &&
      jsxProd_default(Box, {
        paddingLeft: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u2514\u2500 \xB7 \xB7 \xB7 +", hiddenCount, " more"],
        }),
      });
    $[20] = hiddenCount;
    $[21] = moreElement;
  } else moreElement = $[21];
  let listElement;
  if ($[22] !== summaryElement || $[23] !== rowElements || $[24] !== moreElement) {
    listElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [summaryElement, rowElements, moreElement],
    });
    $[22] = summaryElement;
    $[23] = rowElements;
    $[24] = moreElement;
    $[25] = listElement;
  } else listElement = $[25];
  return listElement;
}
//@ chunk-g916dfgc.js:6819-7850 placement
/**
 * 工作流进度主体：按阶段分组显示子代理状态与日志。
 */
function WorkflowProgressBody(props) {
  let $ = useMemoCache(18);
  let { collected, verbose, width } = props;
  let { agents, logs, phaseTitles } = collected;
  if (agents.length === 0 && logs.length === 0) {
    return null;
  }
  let BoxComponent;
  let flexDirection;
  let latestLogElement;
  let bodyElement;
  let earlierLogsElement;
  if ($[0] !== agents || $[1] !== logs || $[2] !== phaseTitles || $[3] !== verbose || $[4] !== width) {
    let phaseGroups = groupAgentsByPhase(agents, phaseTitles);
    let latestLog;
    if ($[10] !== logs) {
      latestLog = logs.at(-1);
      $[10] = logs;
      $[11] = latestLog;
    } else latestLog = $[11];
    let latestLog_ = latestLog;
    let sliced = logs.slice(-3, -1);
    BoxComponent = Box;
    flexDirection = "column";
    latestLogElement =
      latestLog_ &&
      jsxProd_default(Box, {
        marginBottom: phaseGroups || agents.length > 0 ? 1 : 0,
        children: jsxProd_default_2(Text, {
          children: [figures_default.pointer, " ", latestLog_],
        }),
      });
    bodyElement = phaseGroups
      ? jsxProd_default(Box, {
          flexDirection: "column",
          children: phaseGroups.map((phaseGroup, groupIndex) =>
            jsxProd_default_2(
              fragmentTypeExport,
              {
                children: [
                  jsxProd_default(WorkflowPhaseGroup, {
                    group: phaseGroup,
                    verbose,
                    width,
                  }),
                  groupIndex < phaseGroups.length - 1 &&
                    jsxProd_default(Box, {
                      paddingLeft: 3,
                      children: jsxProd_default(Text, {
                        dimColor: true,
                        children: "\u2193",
                      }),
                    }),
                ],
              },
              phaseGroup.phaseIndex,
            ),
          ),
        })
      : agents.length > 0
        ? jsxProd_default(WorkflowAgentList, {
            agents,
            verbose,
          })
        : null;
    earlierLogsElement =
      sliced.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        paddingLeft: 3,
        marginTop: 1,
        children: sliced.map(renderDimText),
      });
    $[0] = agents;
    $[1] = logs;
    $[2] = phaseTitles;
    $[3] = verbose;
    $[4] = width;
    $[5] = BoxComponent;
    $[6] = flexDirection;
    $[7] = latestLogElement;
    $[8] = bodyElement;
    $[9] = earlierLogsElement;
  } else {
    BoxComponent = $[5];
    flexDirection = $[6];
    latestLogElement = $[7];
    bodyElement = $[8];
    earlierLogsElement = $[9];
  }
  let rootElement;
  if (
    $[12] !== BoxComponent ||
    $[13] !== flexDirection ||
    $[14] !== latestLogElement ||
    $[15] !== bodyElement ||
    $[16] !== earlierLogsElement
  ) {
    rootElement = jsxProd_default_2(BoxComponent, {
      flexDirection,
      children: [latestLogElement, bodyElement, earlierLogsElement],
    });
    $[12] = BoxComponent;
    $[13] = flexDirection;
    $[14] = latestLogElement;
    $[15] = bodyElement;
    $[16] = earlierLogsElement;
    $[17] = rootElement;
  } else rootElement = $[17];
  return rootElement;
}
//@ chunk-g916dfgc.js:7850-7854 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g916dfgc.js:7850", () => {
  init_react_production();
});
//@ chunk-g916dfgc.js:7854-7886 placement
function nowMs() {
  return Date.now();
}
//@ chunk-g916dfgc.js:7886-7900 placement
var WORKFLOW_INDENT = 4;
var WORKFLOW_LABEL_WIDTH = 80;
//@ chunk-g916dfgc.js:7900-8096 placement
function useSpinnerGlyph(active) {
  let $ = useMemoCache(2);
  let frames;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    frames = getBrailleSpinnerFrames();
    $[0] = frames;
  } else frames = $[0];
  let frames_ = frames;
  let [frameIndex, setFrameIndex] = useState(0);
  let prefersReducedMotion = usePrefersReducedMotion();
  let advanceFrame;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    advanceFrame = () => setFrameIndex((previous) => (previous + 1) % frames_.length);
    $[1] = advanceFrame;
  } else advanceFrame = $[1];
  useInterval(advanceFrame, active && !prefersReducedMotion ? WORKFLOW_LABEL_WIDTH : null);
  return frames_[frameIndex % frames_.length];
}
//@ chunk-g916dfgc.js:8096-8741 placement
function ProgressBar(props) {
  let $ = useMemoCache(14);
  let { done, total, running } = props;
  let filledCells;
  if ($[0] !== done || $[1] !== total) {
    filledCells = total > 0 ? Math.round((done / total) * WORKFLOW_INDENT) : 0;
    $[0] = done;
    $[1] = total;
    $[2] = filledCells;
  } else filledCells = $[2];
  let filledCells_ = filledCells;
  let min = Math.min(running ? WORKFLOW_INDENT - 1 : WORKFLOW_INDENT, Math.max(0, filledCells_));
  let spinnerCells = running ? Math.min(WORKFLOW_INDENT - min, 1) : 0;
  let emptyCells = WORKFLOW_INDENT - min - spinnerCells;
  let children = useSpinnerGlyph(spinnerCells > 0);
  let filledElement;
  if ($[3] !== min) {
    filledElement =
      min > 0 &&
      jsxProd_default(Text, {
        color: "success",
        children: BRAILLE_FULL_BLOCK.repeat(min),
      });
    $[3] = min;
    $[4] = filledElement;
  } else filledElement = $[4];
  let spinnerElement;
  if ($[5] !== children || $[6] !== spinnerCells) {
    spinnerElement =
      spinnerCells > 0 &&
      jsxProd_default(Text, {
        color: "success",
        children,
      });
    $[5] = children;
    $[6] = spinnerCells;
    $[7] = spinnerElement;
  } else spinnerElement = $[7];
  let emptyElement;
  if ($[8] !== emptyCells) {
    emptyElement =
      emptyCells > 0 &&
      jsxProd_default(Text, {
        color: "subtle",
        dimColor: true,
        children: BRAILLE_FULL_BLOCK.repeat(emptyCells),
      });
    $[8] = emptyCells;
    $[9] = emptyElement;
  } else emptyElement = $[9];
  let barElement;
  if ($[10] !== filledElement || $[11] !== spinnerElement || $[12] !== emptyElement) {
    barElement = jsxProd_default_2(Text, {
      children: [filledElement, spinnerElement, emptyElement],
    });
    $[10] = filledElement;
    $[11] = spinnerElement;
    $[12] = emptyElement;
    $[13] = barElement;
  } else barElement = $[13];
  return barElement;
}
//@ chunk-g916dfgc.js:8741-8757 placement
/**
 * 导出值：WORKFLOW_MAX_ROWS（12：最多行）。
 */
var WORKFLOW_PROGRESS_LIMITS = 9;
var WORKFLOW_MAX_ROWS = 12;
//@ chunk-g916dfgc.js:8757-9096 placement
function useWorkflowProgressRows(promptVisibleBelow) {
  let $ = useMemoCache(8);
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let availableRows;
  if ($[0] !== hasScrollViewport || $[1] !== promptVisibleBelow || $[2] !== rows) {
    availableRows = hasScrollViewport
      ? rows
      : isFullscreenActive()
        ? Math.floor(rows / 2)
        : promptVisibleBelow
          ? Math.max(WORKFLOW_MAX_ROWS, rows - WORKFLOW_PROGRESS_LIMITS)
          : rows;
    $[0] = hasScrollViewport;
    $[1] = promptVisibleBelow;
    $[2] = rows;
    $[3] = availableRows;
  } else availableRows = $[3];
  let availableRows_2 = availableRows;
  let { columns } = terminalSize;
  let width = Math.max(24, columns - 6);
  let layout;
  if ($[4] !== availableRows_2 || $[5] !== rows || $[6] !== width) {
    layout = {
      availableRows: availableRows_2,
      width,
      rows,
    };
    $[4] = availableRows_2;
    $[5] = rows;
    $[6] = width;
    $[7] = layout;
  } else layout = $[7];
  return layout;
}
//@ chunk-g916dfgc.js:9096-9296 placement
function ElapsedClock(task) {
  let $ = useMemoCache(1);
  let isRunning = task.status === "running";
  let [now, setNow] = useState(nowMs);
  let tick;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    tick = () => setNow(Date.now());
    $[0] = tick;
  } else tick = $[0];
  useInterval(tick, isRunning ? 1000 : null);
  return Math.max(0, (task.endTime ?? now) - task.startTime - (task.totalPausedMs ?? 0));
}
//@ chunk-g916dfgc.js:9296-9306 placement
var WORKFLOW_PROGRESS_WIDTH = 17;
//@ chunk-g916dfgc.js:9306-10732 placement
function WorkflowPhaseRow(props) {
  let $ = useMemoCache(28);
  let { index, title, done: doneCount, total, status, selected, trailing } = props;
  let isSelected = selected === undefined ? false : selected;
  let trailingText = trailing === undefined ? "" : trailing;
  let isDone = status === "done";
  let isFailed = status === "failed";
  let isSettled = isDone || isFailed;
  let color = isSelected ? "permission" : isDone ? "success" : isFailed ? "error" : "subtle";
  let pointer = isSelected ? figures_default.pointer : " ";
  let marker = isDone ? figures_default.tick : isFailed ? figures_default.cross : String(index);
  let prefixWidth = bunStringWidth(pointer) + 1 + bunStringWidth(marker) + 1;
  let max = Math.max(1, WORKFLOW_PROGRESS_WIDTH - prefixWidth);
  let titleText;
  if ($[0] !== title || $[1] !== max) {
    titleText = truncateToWidth(title, max);
    $[0] = title;
    $[1] = max;
    $[2] = titleText;
  } else titleText = $[2];
  let titleText_ = titleText;
  let headText = `${pointer} ${marker} ${titleText_}`;
  let max_2 = Math.max(0, WORKFLOW_PROGRESS_WIDTH - bunStringWidth(headText));
  let countText = total > 0 ? `${doneCount}/${total}` : "";
  const color_2 = isSelected ? "permission" : undefined;
  let pointerElement;
  if ($[3] !== pointer || $[4] !== color_2) {
    pointerElement = jsxProd_default(Text, {
      color: color_2,
      children: pointer,
    });
    $[3] = pointer;
    $[4] = color_2;
    $[5] = pointerElement;
  } else pointerElement = $[5];
  let markerElement;
  if ($[6] !== color || $[7] !== marker) {
    markerElement = jsxProd_default(Text, {
      color,
      children: marker,
    });
    $[6] = color;
    $[7] = marker;
    $[8] = markerElement;
  } else markerElement = $[8];
  const color_3 = isSelected ? "permission" : isDone ? "success" : isFailed ? "error" : undefined;
  const dimColor = !isSelected && !isSettled;
  let titleElement;
  if ($[9] !== titleText_ || $[10] !== color_3 || $[11] !== dimColor) {
    titleElement = jsxProd_default(Text, {
      color: color_3,
      dimColor,
      children: titleText_,
    });
    $[9] = titleText_;
    $[10] = color_3;
    $[11] = dimColor;
    $[12] = titleElement;
  } else titleElement = $[12];
  let padding;
  if ($[13] !== max_2) {
    padding = " ".repeat(max_2);
    $[13] = max_2;
    $[14] = padding;
  } else padding = $[14];
  let headElement;
  if ($[15] !== padding || $[16] !== pointerElement || $[17] !== markerElement || $[18] !== titleElement) {
    headElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [pointerElement, " ", markerElement, " ", titleElement, padding],
    });
    $[15] = padding;
    $[16] = pointerElement;
    $[17] = markerElement;
    $[18] = titleElement;
    $[19] = headElement;
  } else headElement = $[19];
  const color_4 = isSelected ? "permission" : isDone ? "success" : isFailed ? "error" : undefined;
  const dimColor_2 = !isSelected && !isSettled;
  const trailingSuffix = trailingText ? `  ${trailingText}` : "";
  let trailingElement;
  if ($[20] !== countText || $[21] !== color_4 || $[22] !== dimColor_2 || $[23] !== trailingSuffix) {
    trailingElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      color: color_4,
      dimColor: dimColor_2,
      children: [countText, trailingSuffix],
    });
    $[20] = countText;
    $[21] = color_4;
    $[22] = dimColor_2;
    $[23] = trailingSuffix;
    $[24] = trailingElement;
  } else trailingElement = $[24];
  let rowElement;
  if ($[25] !== headElement || $[26] !== trailingElement) {
    rowElement = jsxProd_default_2(Box, {
      children: [headElement, trailingElement],
    });
    $[25] = headElement;
    $[26] = trailingElement;
    $[27] = rowElement;
  } else rowElement = $[27];
  return rowElement;
}
//@ chunk-g916dfgc.js:10732-11759 placement
function WorkflowSummaryRow(props) {
  let $ = useMemoCache(23);
  let { name, done: doneCount, total, running, elapsedMs, complete, dotState, phaseText, selected } = props;
  let isSelected = selected === undefined ? false : selected;
  let elapsedText;
  if ($[0] !== elapsedMs) {
    elapsedText = elapsedMs !== undefined ? formatBarElapsed(elapsedMs) : undefined;
    $[0] = elapsedMs;
    $[1] = elapsedText;
  } else elapsedText = $[1];
  let elapsedLabel = elapsedText;
  let viewHintSuffix = complete ? ` \xB7 ${figures_default.ellipsis} to view` : "";
  let color = dotState === "failed" ? "error" : "success";
  let dotElement;
  if ($[2] !== color) {
    dotElement = jsxProd_default(Text, {
      color,
      children: BLACK_CIRCLE,
    });
    $[2] = color;
    $[3] = dotElement;
  } else dotElement = $[3];
  let nameElement;
  if ($[4] !== name || $[5] !== isSelected) {
    nameElement = name
      ? jsxProd_default_2(Text, {
          color: isSelected ? "claude" : undefined,
          bold: isSelected,
          children: [name, " "],
        })
      : null;
    $[4] = name;
    $[5] = isSelected;
    $[6] = nameElement;
  } else nameElement = $[6];
  let progressBarElement;
  if ($[7] !== doneCount || $[8] !== running || $[9] !== total) {
    progressBarElement = jsxProd_default(ProgressBar, {
      done: doneCount,
      total,
      running,
    });
    $[7] = doneCount;
    $[8] = running;
    $[9] = total;
    $[10] = progressBarElement;
  } else progressBarElement = $[10];
  const dimColor = !isSelected;
  const phaseSuffix = phaseText ? ` \xB7 ${phaseText}` : "";
  const agentCountSuffix = ` \xB7 ${doneCount}/${total} agents`;
  const elapsedSuffix = elapsedLabel ? ` \xB7 ${elapsedLabel}` : "";
  let statsTextElement;
  if (
    $[11] !== viewHintSuffix ||
    $[12] !== isSelected ||
    $[13] !== dimColor ||
    $[14] !== phaseSuffix ||
    $[15] !== agentCountSuffix ||
    $[16] !== elapsedSuffix
  ) {
    statsTextElement = jsxProd_default_2(Text, {
      dimColor,
      bold: isSelected,
      children: [phaseSuffix, agentCountSuffix, elapsedSuffix, viewHintSuffix],
    });
    $[11] = viewHintSuffix;
    $[12] = isSelected;
    $[13] = dimColor;
    $[14] = phaseSuffix;
    $[15] = agentCountSuffix;
    $[16] = elapsedSuffix;
    $[17] = statsTextElement;
  } else statsTextElement = $[17];
  let rowElement;
  if (
    $[18] !== statsTextElement ||
    $[19] !== dotElement ||
    $[20] !== nameElement ||
    $[21] !== progressBarElement
  ) {
    rowElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [dotElement, " ", nameElement, progressBarElement, statsTextElement],
    });
    $[18] = statsTextElement;
    $[19] = dotElement;
    $[20] = nameElement;
    $[21] = progressBarElement;
    $[22] = rowElement;
  } else rowElement = $[22];
  return rowElement;
}
//@ chunk-g916dfgc.js:11759-12641 placement
function WorkflowHeader(props) {
  let $ = useMemoCache(17);
  let { name, subtext, stats, width } = props;
  let hasScrollViewport = useHasScrollViewport();
  let dividerElement;
  if ($[0] !== hasScrollViewport || $[1] !== width) {
    dividerElement =
      !hasScrollViewport &&
      jsxProd_default(Text, {
        color: "text",
        wrap: "truncate-end",
        children: HORIZONTAL_LINE_GLYPH.repeat(Math.max(1, width)),
      });
    $[0] = hasScrollViewport;
    $[1] = width;
    $[2] = dividerElement;
  } else dividerElement = $[2];
  let nameElement;
  if ($[3] !== name) {
    nameElement = jsxProd_default_2(Text, {
      bold: true,
      color: "permission",
      wrap: "truncate-end",
      children: [" ", name],
    });
    $[3] = name;
    $[4] = nameElement;
  } else nameElement = $[4];
  let subtextBox;
  if ($[5] !== subtext) {
    subtextBox = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      overflow: "hidden",
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "truncate-end",
        children: [" ", subtext],
      }),
    });
    $[5] = subtext;
    $[6] = subtextBox;
  } else subtextBox = $[6];
  let statsBox;
  if ($[7] !== stats) {
    statsBox = stats
      ? jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [stats, " "],
          }),
        })
      : null;
    $[7] = stats;
    $[8] = statsBox;
  } else statsBox = $[8];
  let subtextRowBox;
  if ($[9] !== subtextBox || $[10] !== statsBox || $[11] !== width) {
    subtextRowBox = jsxProd_default_2(Box, {
      width,
      overflow: "hidden",
      children: [subtextBox, statsBox],
    });
    $[9] = subtextBox;
    $[10] = statsBox;
    $[11] = width;
    $[12] = subtextRowBox;
  } else subtextRowBox = $[12];
  let headerBox;
  if ($[13] !== dividerElement || $[14] !== nameElement || $[15] !== subtextRowBox) {
    headerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [dividerElement, nameElement, subtextRowBox],
    });
    $[13] = dividerElement;
    $[14] = nameElement;
    $[15] = subtextRowBox;
    $[16] = headerBox;
  } else headerBox = $[16];
  return headerBox;
}
//@ chunk-g916dfgc.js:12641-13085 placement
function agentStateCounts(workflowProgress) {
  let doneCount = countWhere(workflowProgress.agents, (agent) => agent.state === "done");
  let errorCount = countWhere(
    workflowProgress.agents,
    (otherAgent) => otherAgent.state === "error" && !isStopReason(otherAgent.error),
  );
  let totalCount = workflowProgress.agents.length;
  let isAllSettled = doneCount + errorCount === totalCount && totalCount > 0;
  let tokens = 0;
  let earliestStart = 1 / 0;
  let latestProgress = 0;
  for (let agent of workflowProgress.agents) {
    if (agent.tokens) tokens += agent.tokens;
    if (agent.startedAt != null) {
      if (agent.startedAt < earliestStart) earliestStart = agent.startedAt;
      let lastProgressAt = agent.lastProgressAt ?? agent.startedAt;
      if (lastProgressAt > latestProgress) latestProgress = lastProgressAt;
    }
  }
  let durationMs = earliestStart < 1 / 0 ? latestProgress - earliestStart : 0;
  return {
    title: workflowProgress.title,
    status: isAllSettled ? (errorCount > 0 ? "failed" : "done") : "running",
    agents: workflowProgress.agents,
    doneCount,
    totalCount,
    tokens,
    durationMs,
  };
}
//@ chunk-g916dfgc.js:13085-13194 placement
function emptyPhaseRow(title) {
  return {
    title,
    status: "not-started",
    agents: [],
    doneCount: 0,
    totalCount: 0,
    tokens: 0,
    durationMs: 0,
  };
}
//@ chunk-g916dfgc.js:13194-13239 placement
function normalizeLabel(label) {
  return label.toLowerCase().trim();
}
//@ chunk-g916dfgc.js:13239-13346 placement
function phaseTitlesMatch(phaseTitle, label) {
  let normalizedPhase = normalizeLabel(phaseTitle);
  let normalizedTitle = normalizeLabel(label);
  if (!normalizedPhase || !normalizedTitle) return normalizedPhase === normalizedTitle;
  return (
    normalizedPhase === normalizedTitle ||
    normalizedPhase.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedPhase)
  );
}
//@ chunk-g916dfgc.js:13346-13591 placement
function alignPhaseRows(phases, agents) {
  let usedAgents = new Set();
  let rows = [];
  function takeMatchingAgent(phaseTitle) {
    for (let agentEntry of agents) {
      if (usedAgents.has(agentEntry)) continue;
      if (phaseTitlesMatch(phaseTitle, agentEntry.title)) {
        usedAgents.add(agentEntry);
        return agentEntry;
      }
    }
    return;
  }
  for (let phase of phases ?? []) {
    let matchedAgent = takeMatchingAgent(phase.title);
    rows.push(matchedAgent ? agentStateCounts(matchedAgent) : emptyPhaseRow(phase.title));
  }
  for (let remainingAgent of agents)
    if (!usedAgents.has(remainingAgent)) rows.push(agentStateCounts(remainingAgent));
  return rows;
}
//@ chunk-g916dfgc.js:13591-13789 placement
function workflowPhaseRows(workflow) {
  let workflowProgress = collectWorkflowProgress(workflow.workflowProgress);
  let groupedAgents = groupAgentsByPhase(workflowProgress.agents, workflowProgress.phaseTitles) ?? [];
  let phaseRows = alignPhaseRows(workflow.phases, groupedAgents);
  if (phaseRows.length === 0 && workflowProgress.agents.length > 0)
    return [
      agentStateCounts({
        phaseIndex: 0,
        title: "Agents",
        agents: workflowProgress.agents,
      }),
    ];
  return phaseRows;
}
//@ chunk-g916dfgc.js:13789-13799 placement
var WORKFLOW_COLUMN_WIDTH = 16;
//@ chunk-g916dfgc.js:13799-13829 placement
function noWorkflowFooter(collected, unusedFooterProps) {
  return null;
}
//@ chunk-g916dfgc.js:13829-14044 placement
var PHASE_NAME_WIDTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AEIOU;
var GERUND_OVERRIDES;
var SIMPLE_VERB_RE;
deferInit("chunk-g916dfgc.js:13829", () => {
  PHASE_NAME_WIDTH = WORKFLOW_COLUMN_WIDTH + 8;
  AEIOU = "aeiou";
  GERUND_OVERRIDES = new Map([
    ["commit", "committing"],
    ["submit", "submitting"],
    ["format", "formatting"],
    ["edit", "editing"],
    ["exit", "exiting"],
    ["setup", null],
    ["cleanup", null],
    ["init", null],
  ]);
  SIMPLE_VERB_RE = /^[A-Za-z]{3,12}$/;
});
//@ chunk-g916dfgc.js:14044-14479 placement
function normalizePhaseTitle(title) {
  if (!SIMPLE_VERB_RE.test(title)) return title;
  let lower = title.toLowerCase();
  let override = GERUND_OVERRIDES.get(lower);
  if (override !== undefined) return override === null ? title : title[0] + override.slice(1);
  if (lower.endsWith("ing")) return title;
  if (lower.endsWith("ie")) return `${title.slice(0, -2)}ying`;
  if (lower.endsWith("e") && !lower.endsWith("ee") && !lower.endsWith("ye"))
    return `${title.slice(0, -1)}ing`;
  let last = lower.at(-1);
  if (
    lower.length <= 4 &&
    !AEIOU.includes(lower.at(-3)) &&
    AEIOU.includes(lower.at(-2)) &&
    !AEIOU.includes(last) &&
    !"wxy".includes(last)
  )
    return `${title}${last}ing`;
  return `${title}ing`;
}
//@ chunk-g916dfgc.js:14479-14492 placement
var LABEL_JOINER = " & ";
//@ chunk-g916dfgc.js:14492-14820 placement
function phaseTitleSummary(titleSummary) {
  let { titles, positionStart, totalPhases } = titleSummary;
  let mapped = titles.map((title) => normalizePhaseTitle(collapseWhitespace(title)));
  if (mapped.length === 1)
    return `${truncateToWidth(mapped[0] ?? "", WORKFLOW_COLUMN_WIDTH)} (${positionStart}/${totalPhases})`;
  if (mapped.length === 2) {
    let joined = mapped
      .map((shortTitle) => truncateToWidth(shortTitle, WORKFLOW_COLUMN_WIDTH))
      .join(LABEL_JOINER);
    let floored = Math.floor((PHASE_NAME_WIDTH - LABEL_JOINER.length) / 2);
    return bunStringWidth(joined) <= PHASE_NAME_WIDTH
      ? joined
      : mapped.map((shrunkTitle) => truncateToWidth(shrunkTitle, floored)).join(LABEL_JOINER);
  }
  let remainderSuffix = ` +${mapped.length - 1}`;
  return (
    truncateToWidth(mapped[0] ?? "", WORKFLOW_COLUMN_WIDTH - bunStringWidth(remainderSuffix)) +
    remainderSuffix
  );
}
//@ chunk-g916dfgc.js:14820-14945 placement
function sumPhaseCounts(phaseRows, agentCount) {
  let doneAgentCount = 0;
  let totalAgentCount = 0;
  for (let row of phaseRows) {
    doneAgentCount += row.doneCount;
    totalAgentCount += row.totalCount;
  }
  return {
    doneAgents: doneAgentCount,
    totalAgents: Math.max(agentCount, totalAgentCount, doneAgentCount),
  };
}
//@ chunk-g916dfgc.js:14945-15102 placement
function workflowDescription(workflow) {
  if (workflow.script.length > 0) {
    let workflowScript = parseWorkflowScript(workflow.script);
    if (!("error" in workflowScript) && workflowScript.meta.description)
      return workflowScript.meta.description;
  }
  return workflow.description || workflow.summary || "";
}
//@ chunk-g916dfgc.js:15102-15505 placement
function workflowStatusLine(workflow, defaultSubtext, agentCounts, elapsedMs) {
  let statusSuffix =
    workflow.status === "completed"
      ? " \xB7 done"
      : workflow.status === "killed"
        ? " \xB7 stopped"
        : workflow.status === "paused"
          ? " \xB7 paused"
          : isTerminalTaskStatus(workflow.status)
            ? " \xB7 failed"
            : "";
  let subtext =
    workflow.status === "running" && workflow.rateLimitWait !== undefined
      ? pausedUsageLine(workflow.rateLimitWait.resetsAt)
      : defaultSubtext;
  let stats = `${agentCounts.doneAgents}/${agentCounts.totalAgents} ${plural(agentCounts.totalAgents, "agent")} \xB7 ${formatBarElapsed(elapsedMs)}${statusSuffix}`;
  return {
    name: workflow.workflowName ?? workflow.summary ?? workflow.description,
    subtext,
    stats,
  };
}
//@ chunk-g916dfgc.js:15505-15845 placement
function countWorkflowAgents(messages, agentCount = 0) {
  let totalAgentCount = 0;
  let doneCount = 0;
  let errorCount = 0;
  let startedCount = 0;
  let isRunning = false;
  for (let message of messages) {
    if (message.type !== "workflow_agent") continue;
    totalAgentCount++;
    if (message.state === "done") {
      doneCount++;
      startedCount++;
    } else if (message.state === "error") {
      errorCount++;
      startedCount++;
    } else if (message.state === "start" || message.state === "progress") {
      isRunning = true;
      if (hasStartedOrQueued(message)) startedCount++;
    }
  }
  let max = Math.max(agentCount, totalAgentCount);
  let complete = !isRunning && totalAgentCount > 0 && doneCount + errorCount >= max;
  return {
    done: doneCount,
    failedCount: errorCount,
    running: isRunning,
    total: max,
    started: startedCount,
    complete,
  };
}
export {
  collectWorkflowProgress,
  WorkflowProgressBody,
  countWorkflowAgents,
  noWorkflowFooter,
  WorkflowSummaryRow,
  phaseTitleSummary,
  ElapsedClock,
  WORKFLOW_PROGRESS_LIMITS,
  modelTransitionText,
  useWorkflowProgressRows,
  workflowPhaseRows,
  sumPhaseCounts,
  workflowDescription,
  workflowStatusLine,
  WorkflowHeader,
  WorkflowPhaseRow,
};
