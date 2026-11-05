/**
 * components/fleet/FleetList.tsx
 *
 * 2.1.316 新增：Agents 视图的滚动列表（分组头、选中、过滤、旧会话行）；Agents 视图中一个会话（job）行：状态、详情、子行、重命名/分组/删除状态等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-avy0g5d4.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getLogoDisplayData, truncatePathForDisplay } from "../../utils/logoV2Utils.js";
import { tildify } from "../../utils/path.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { Clawd } from "../LogoV2/Clawd.js";
import { Byline } from "../design-system/Byline.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectSessionModel, selectSessionEffort, selectSessionFastMode } from "./fleetActions.js";
import { resolveDispatchDefaults } from "./dispatchDefaults.js";
import { truncateToWidth, truncateStartToWidth, truncate, formatDuration } from "../../utils/format.js";
import {
  init_react_production,
  useRef,
  useLayoutEffect,
  fragmentTypeExport,
} from "../../../vendor/react/cjs/react.production.js";
import {
  isFrameRow,
  activityVerb,
  pickHighestPriorityColor,
  jobRowGlyph,
  getJobTitle,
  useAutoTitle,
  jobRowAriaLabel,
  useFleetSpinnerFrame,
  prKindOf,
  groupCollapseKey,
  isDifferentDoneGroup,
  SIMPLE_FINISHED,
  jobActivityDisplay,
  jobAgeLabel,
  jobTokenLabel,
  jobNeedsLine,
  jobBucket_2,
  formatJobAgeOrEta,
  childFrameRows,
} from "./FleetRow.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { terminalOutcome, IDLE_NEEDS, EARLIER, UNGROUPED } from "../../services/daemon/jobState.js";
import { BULLET_OPERATOR, BOXED_DIAMOND_GLYPH } from "../../constants/figures.js";
import {
  returnFalse_2,
  isTerminalDetail,
  jobPreviewText,
  stripJobPreviewText,
  deleteMethodName,
  FLEET_BUCKET_LABELS,
  shortenPath,
  FLEET_BUCKET_HINTS,
} from "./fleetRows.js";
import { toOpenableUrl } from "./fleetSessions.js";
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import { TagTabs } from "../TagTabs.js";
import { PrBadge } from "../PrBadge.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { sanitizeAttentionText } from "./sessionAttention.js";
import { logEvent } from "../../services/analytics/index.js";
import { repeatString } from "../../utils/stringUtils.js";
import { ScrollBoxDefault } from "../../ink/components/ScrollBox.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { parseBindings } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";

//@ chunk-avy0g5d4.js:100091-102504 placement
/**
 * Agents 视图底部的派发输入区（布局、简化视图、派发默认值、当前目录）。
 */
function FleetComposer(props) {
  let $ = useMemoCache(33);
  let {
    editor,
    layout,
    simpleView,
    dispatchDefaults,
    targetCwd,
    launcherCwd,
    canonicalLauncherCwd,
    originJobId,
  } = props;
  let { columns } = useTerminalSize();
  let { compactHeader, simpleBuilt, bandCounts, earlierVisible } = layout;
  let { version, cwd } = getLogoDisplayData();
  let { newSession, width, pathOwnRow } = useDispatchWindowDefaults(editor, dispatchDefaults);
  let showsTargetPath = !!cwd && targetCwd !== launcherCwd && targetCwd !== canonicalLauncherCwd;
  let path = showsTargetPath ? tildify(targetCwd) : cwd;
  let defaultsLabel;
  let pathWidth;
  if ($[0] !== newSession || $[1] !== pathOwnRow || $[2] !== width) {
    defaultsLabel = fitDispatchDefaultsLabel(newSession, width);
    pathWidth = pathOwnRow ? width : width - 3 - bunStringWidth(defaultsLabel);
    $[0] = newSession;
    $[1] = pathOwnRow;
    $[2] = width;
    $[3] = defaultsLabel;
    $[4] = pathWidth;
  } else {
    defaultsLabel = $[3];
    pathWidth = $[4];
  }
  let availablePathWidth = pathWidth;
  let displayPath = truncatePathForDisplay(
    path,
    Math.min(bunStringWidth(path), Math.max(availablePathWidth, 1)),
  );
  let highlightPath = simpleView && showsTargetPath;
  let pathElementCached;
  if ($[5] !== highlightPath || $[6] !== displayPath) {
    pathElementCached =
      displayPath &&
      jsxProd_default(Text, {
        color: highlightPath ? "suggestion" : undefined,
        dimColor: !highlightPath,
        children: displayPath,
      });
    $[5] = highlightPath;
    $[6] = displayPath;
    $[7] = pathElementCached;
  } else pathElementCached = $[7];
  let pathElement = pathElementCached;
  let clawdElement;
  if ($[8] !== columns || $[9] !== compactHeader) {
    clawdElement = !compactHeader && columns >= 70 && jsxProd_default(Clawd, {});
    $[8] = columns;
    $[9] = compactHeader;
    $[10] = clawdElement;
  } else clawdElement = $[10];
  let titleRow;
  if (
    $[11] !== compactHeader ||
    $[12] !== pathElement ||
    $[13] !== defaultsLabel ||
    $[14] !== pathOwnRow ||
    $[15] !== simpleView ||
    $[16] !== version
  ) {
    titleRow =
      !compactHeader &&
      jsxProd_default_2(Fragment, {
        children: [
          simpleView
            ? jsxProd_default_2(Text, {
                wrap: "truncate",
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Claude Code",
                  }),
                  " ",
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["v", version],
                  }),
                ],
              })
            : jsxProd_default_2(Text, {
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Claude Code",
                  }),
                  " ",
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["v", version],
                  }),
                ],
              }),
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate",
            children: [defaultsLabel, !pathOwnRow && pathElement && " \xB7 ", !pathOwnRow && pathElement],
          }),
          pathOwnRow &&
            pathElement &&
            jsxProd_default(Text, {
              wrap: "truncate",
              children: pathElement,
            }),
        ],
      });
    $[11] = compactHeader;
    $[12] = pathElement;
    $[13] = defaultsLabel;
    $[14] = pathOwnRow;
    $[15] = simpleView;
    $[16] = version;
    $[17] = titleRow;
  } else titleRow = $[17];
  let countsRow;
  if ($[18] !== bandCounts || $[19] !== earlierVisible || $[20] !== simpleBuilt) {
    countsRow = simpleBuilt
      ? jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate",
          children: jsxProd_default_2(Byline, {
            children: [
              simpleBuilt.needsCount > 0 && `${simpleBuilt.needsCount} needs you`,
              simpleBuilt.workingCount > 0 && `${simpleBuilt.workingCount} working`,
              simpleBuilt.liveCount - simpleBuilt.workingCount > 0 &&
                `${simpleBuilt.liveCount - simpleBuilt.workingCount} idle`,
              simpleBuilt.runningCount === 0 && "nothing running",
            ],
          }),
        })
      : jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default_2(Byline, {
            children: [
              `${bandCounts.blocked} awaiting input`,
              `${bandCounts.active} working`,
              `${bandCounts.completed + earlierVisible.length} completed`,
            ],
          }),
        });
    $[18] = bandCounts;
    $[19] = earlierVisible;
    $[20] = simpleBuilt;
    $[21] = countsRow;
  } else countsRow = $[21];
  let headerColumn;
  if ($[22] !== titleRow || $[23] !== countsRow) {
    headerColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [titleRow, countsRow],
    });
    $[22] = titleRow;
    $[23] = countsRow;
    $[24] = headerColumn;
  } else headerColumn = $[24];
  let headerRow;
  if ($[25] !== clawdElement || $[26] !== headerColumn) {
    headerRow = jsxProd_default_2(Box, {
      gap: 2,
      marginBottom: 1,
      children: [clawdElement, headerColumn],
    });
    $[25] = clawdElement;
    $[26] = headerColumn;
    $[27] = headerRow;
  } else headerRow = $[27];
  let originNotice;
  if ($[28] !== originJobId) {
    originNotice =
      originJobId !== undefined &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children:
            "Your conversation moved to the background \u2014 enter opens it \xB7 esc returns to it \xB7 ctrl+c twice quits",
        }),
      });
    $[28] = originJobId;
    $[29] = originNotice;
  } else originNotice = $[29];
  let composerHeader;
  if ($[30] !== headerRow || $[31] !== originNotice) {
    composerHeader = jsxProd_default_2(Fragment, {
      children: [headerRow, originNotice],
    });
    $[30] = headerRow;
    $[31] = originNotice;
    $[32] = composerHeader;
  } else composerHeader = $[32];
  return composerHeader;
}
//@ chunk-avy0g5d4.js:102504-102987 placement
/**
 * 计算派发窗口（模型、effort、快速模式）对新会话的有效默认值。
 */
function useDispatchWindowDefaults(store, launch) {
  let $ = useMemoCache(12);
  let { columns } = useTerminalSize();
  let model = useStoreSelector(store, selectSessionModel);
  let effort = useStoreSelector(store, selectSessionEffort);
  let fastMode = useStoreSelector(store, selectSessionFastMode);
  let resolvedDefaults;
  if ($[0] !== launch || $[1] !== effort || $[2] !== fastMode || $[3] !== model) {
    resolvedDefaults = resolveDispatchDefaults({
      launch,
      window: {
        model,
        effort,
        fastMode,
      },
    });
    $[0] = launch;
    $[1] = effort;
    $[2] = fastMode;
    $[3] = model;
    $[4] = resolvedDefaults;
  } else resolvedDefaults = $[4];
  let sessionDefaults = resolvedDefaults;
  let availableWidth = columns - (columns >= 70 ? 11 : 0);
  let cwdNeedsOwnRow;
  if ($[5] !== sessionDefaults || $[6] !== availableWidth) {
    let cwd = getLogoDisplayData().cwd;
    cwdNeedsOwnRow =
      !!cwd &&
      bunStringWidth(formatDispatchDefaultsLabel(sessionDefaults)) + 3 + bunStringWidth(cwd) > availableWidth;
    $[5] = sessionDefaults;
    $[6] = availableWidth;
    $[7] = cwdNeedsOwnRow;
  } else cwdNeedsOwnRow = $[7];
  let pathOwnRow = cwdNeedsOwnRow;
  let defaultsLayout;
  if ($[8] !== sessionDefaults || $[9] !== pathOwnRow || $[10] !== availableWidth) {
    defaultsLayout = {
      newSession: sessionDefaults,
      width: availableWidth,
      pathOwnRow,
    };
    $[8] = sessionDefaults;
    $[9] = pathOwnRow;
    $[10] = availableWidth;
    $[11] = defaultsLayout;
  } else defaultsLayout = $[11];
  return defaultsLayout;
}
//@ chunk-avy0g5d4.js:102987-103119 placement
/**
 * “New sessions: 模型 · effort · ultracode” 标签。
 */
function formatDispatchDefaultsLabel(newSession) {
  let effortSuffix = newSession.effort ? ` \xB7 ${newSession.effort} effort` : "";
  return `New sessions: ${newSession.model}${effortSuffix}${newSession.ultracode ? " \xB7 ultracode" : ""}`;
}
//@ chunk-avy0g5d4.js:103119-103299 placement
/**
 * 按可用宽度依次尝试完整/缩短的默认值标签，都放不下时截断模型名。
 */
function fitDispatchDefaultsLabel(newSession, width) {
  let effortSuffix = newSession.effort ? ` \xB7 ${newSession.effort} effort` : "";
  let ultracodeSuffix = newSession.ultracode ? " \xB7 ultracode" : "";
  return (
    [
      formatDispatchDefaultsLabel(newSession),
      newSession.model + effortSuffix + ultracodeSuffix,
      newSession.model + ultracodeSuffix,
    ].find((candidate) => bunStringWidth(candidate) <= width) ??
    truncateToWidth(newSession.model, Math.max(width, 1))
  );
}
//@ chunk-avy0g5d4.js:103299-103303 placement
init_react_production();
//@ chunk-avy0g5d4.js:103303-103307 placement
init_react_production();
//@ chunk-avy0g5d4.js:103340-103370 placement
function isNotFrameRow(row) {
  return !isFrameRow(row);
}
//@ chunk-avy0g5d4.js:103370-103411 placement
function hasColor(row) {
  return row.color !== undefined;
}
//@ chunk-avy0g5d4.js:103411-103441 placement
var RESERVED_NAME_SUFFIX_WIDTH = bunStringWidth(" (reserved name)");
//@ chunk-avy0g5d4.js:103441-103861 placement
/**
 * 在文本中绘制光标（反显字符）。
 */
function renderCursorText(draft, cursor, width, selected = false) {
  if (selected && draft) {
    let children = truncateStartToWidth(draft, Math.max(width - 1, 1));
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(Text, {
          inverse: true,
          children,
        }),
        jsxProd_default(Text, {
          inverse: true,
          children: " ",
        }),
      ],
    });
  }
  let { length: charStart, length: charEnd } = draft;
  for (let { segment, index } of getGraphemeSegmenter().segment(draft))
    if (index + segment.length > cursor) {
      charStart = index;
      charEnd = index + segment.length;
      break;
    }
  let cursorChar = draft.slice(charStart, charEnd) || " ";
  let sliced = draft.slice(charEnd);
  let children = truncateStartToWidth(
    draft.slice(0, charStart),
    width - bunStringWidth(cursorChar) - (sliced ? 1 : 0),
  );
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Text, {
        children,
      }),
      jsxProd_default(Text, {
        inverse: true,
        children: cursorChar,
      }),
      jsxProd_default(Text, {
        children: sliced,
      }),
    ],
  });
}
//@ chunk-avy0g5d4.js:103861-109770 placement
/**
 * Agents 视图中一个会话（job）行：状态、详情、子行、重命名/分组/删除状态。
 */
function FleetJobRow(props) {
  let $ = useMemoCache(68);
  let {
    job,
    isFocused,
    focusFg,
    isOrigin,
    logTail,
    status,
    cols,
    showVerb,
    loopKickCount,
    age,
    childRows,
    renaming,
    groupEditing,
    deleteArmed,
    deleteRefused,
    attaching,
    heldInTerminal,
  } = props;
  let outcome = terminalOutcome(job.state.state);
  let deleteRefusedNotice = outcome && job.state.tempo !== "active" ? deleteRefused : undefined;
  let hasRoomForSuffix = cols.detail - bunStringWidth("group: ") - RESERVED_NAME_SUFFIX_WIDTH >= 24;
  let activity = activityVerb(job.activity, job.state.tempo, status, outcome);
  let { color, dim } = activity;
  let rowColor = status === "busy" ? color : pickHighestPriorityColor(color, childRows);
  let rowDim = rowColor === color && dim;
  let glyph =
    attaching === "armed"
      ? undefined
      : deleteArmed?.justKilled
        ? BULLET_OPERATOR
        : attaching
          ? undefined
          : jobRowGlyph(job.state, outcome, status);
  let outputResult = job.state.output?.result;
  let resultUrl;
  if ($[0] !== outputResult || $[1] !== job.state) {
    resultUrl = outputResult && !returnFalse_2(job.state) ? toOpenableUrl(outputResult) : null;
    $[0] = outputResult;
    $[1] = job.state;
    $[2] = resultUrl;
  } else resultUrl = $[2];
  let openUrl = resultUrl;
  let plainResult = openUrl ? undefined : outputResult;
  let activeLogTail = outcome !== "success" ? logTail || undefined : undefined;
  let previewDetail =
    isOrigin && isFocused
      ? job.state.tempo === "blocked"
        ? job.state.needs
        : outcome === "failure"
          ? job.state.detail
          : undefined
      : undefined;
  let cachedDetailIsTerminal;
  if ($[3] !== job.state.detail) {
    cachedDetailIsTerminal = isTerminalDetail(job.state.detail);
    $[3] = job.state.detail;
    $[4] = cachedDetailIsTerminal;
  } else cachedDetailIsTerminal = $[4];
  let detailIsTerminal = cachedDetailIsTerminal;
  let detail =
    isOrigin &&
    job.state.tempo === "blocked" &&
    job.state.needs === IDLE_NEEDS &&
    job.state.detail &&
    !detailIsTerminal
      ? job.state.detail
      : undefined;
  let detailText =
    isOrigin && isFocused
      ? previewDetail
        ? previewDetail === IDLE_NEEDS
          ? detail
            ? jobPreviewText(job.state, detail)
            : basename(job.state.cwd) || job.state.cwd
          : jobPreviewText(job.state, previewDetail)
        : jobPreviewText(job.state, job.state.detail ?? "")
      : outcome === "success"
        ? jobPreviewText(job.state, plainResult || job.state.detail)
        : jobPreviewText(
            job.state,
            detail ||
              (!isOrigin &&
                isFocused &&
                job.state.tempo === "blocked" &&
                job.state.needs === IDLE_NEEDS &&
                "space to send it a prompt") ||
              (job.state.tempo === "blocked" && job.state.needs) ||
              (!detailIsTerminal && job.state.detail) ||
              "",
          ) ||
          (job.state.tempo === "active" && stripJobPreviewText(activeLogTail ?? "")) ||
          stripJobPreviewText(job.state.detail);
  let rawTitle;
  if ($[5] !== isOrigin || $[6] !== job.state) {
    rawTitle = getJobTitle(job.state, isOrigin);
    $[5] = isOrigin;
    $[6] = job.state;
    $[7] = rawTitle;
  } else rawTitle = $[7];
  let jobTitle = rawTitle;
  let titleColor = isAgentColorName(job.state.color)
    ? AGENT_COLOR_TO_THEME_COLOR[job.state.color]
    : undefined;
  let autoTitle = useAutoTitle(jobTitle, !!job.state.name);
  let filtered = childRows.filter(isFrameRow);
  let filtered_2 = childRows.filter(isNotFrameRow);
  let prRow = filtered_2.find(hasColor) ?? filtered_2.at(-1) ?? filtered.at(-1);
  let selectedPrefix = isFocused ? "selected, " : "";
  let ariaLabel = attaching
    ? `${selectedPrefix}opening:`
    : deleteArmed?.justKilled
      ? `${selectedPrefix}stopped:`
      : rowColor !== color
        ? `${selectedPrefix}needs attention:`
        : jobRowAriaLabel(job.activity, job.state.tempo, status, outcome, isFocused);
  const rowContainer = Box;
  const width = cols.label + 2;
  const dimColor = !isFocused && !isOrigin;
  const dimColor_2 = rowDim || (rowColor === undefined && !isFocused);
  let children;
  if ($[8] !== glyph) {
    children = glyph ?? jsxProd_default(useFleetSpinnerFrame, {});
    $[8] = glyph;
    $[9] = children;
  } else children = $[9];
  let verbText;
  if ($[10] !== rowColor || $[11] !== ariaLabel || $[12] !== dimColor_2 || $[13] !== children) {
    verbText = jsxProd_default(Text, {
      "aria-label": ariaLabel,
      color: rowColor,
      dimColor: dimColor_2,
      children,
    });
    $[10] = rowColor;
    $[11] = ariaLabel;
    $[12] = dimColor_2;
    $[13] = children;
    $[14] = verbText;
  } else verbText = $[14];
  let children_2;
  if (
    $[15] !== cols.label ||
    $[16] !== openUrl ||
    $[17] !== isFocused ||
    $[18] !== isOrigin ||
    $[19] !== jobTitle ||
    $[20] !== renaming ||
    $[21] !== autoTitle ||
    $[22] !== titleColor
  ) {
    children_2 =
      titleColor && !renaming
        ? jsxProd_default(TagTabs, {
            color: titleColor,
            bold: isFocused,
            children: openUrl
              ? jsxProd_default(Link, {
                  url: openUrl,
                  children: jobTitle,
                })
              : jobTitle,
          })
        : renaming
          ? renderCursorText(renaming.draft, renaming.cursor, cols.label)
          : autoTitle
            ? jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(Text, {
                    dimColor: !isFocused && !isOrigin,
                    children: autoTitle.display.slice(0, autoTitle.newLen),
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: autoTitle.display.slice(autoTitle.newLen),
                  }),
                ],
              })
            : openUrl
              ? jsxProd_default(Link, {
                  url: openUrl,
                  children: jobTitle,
                })
              : jobTitle;
    $[15] = cols.label;
    $[16] = openUrl;
    $[17] = isFocused;
    $[18] = isOrigin;
    $[19] = jobTitle;
    $[20] = renaming;
    $[21] = autoTitle;
    $[22] = titleColor;
    $[23] = children_2;
  } else children_2 = $[23];
  let titleText;
  if ($[24] !== isOrigin || $[25] !== children_2) {
    titleText = jsxProd_default(Text, {
      bold: isOrigin,
      children: children_2,
    });
    $[24] = isOrigin;
    $[25] = children_2;
    $[26] = titleText;
  } else titleText = $[26];
  let children_3;
  if ($[27] !== focusFg || $[28] !== titleText || $[29] !== dimColor || $[30] !== verbText) {
    children_3 = jsxProd_default_2(Text, {
      color: focusFg,
      dimColor,
      wrap: "truncate",
      children: [verbText, " ", titleText],
    });
    $[27] = focusFg;
    $[28] = titleText;
    $[29] = dimColor;
    $[30] = verbText;
    $[31] = children_3;
  } else children_3 = $[31];
  let labelBox;
  if ($[32] !== children_3 || $[33] !== width) {
    labelBox = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children: children_3,
    });
    $[32] = children_3;
    $[33] = width;
    $[34] = labelBox;
  } else labelBox = $[34];
  let detailText_2;
  if (
    $[35] !== attaching ||
    $[36] !== cols.detail ||
    $[37] !== deleteArmed ||
    $[38] !== deleteRefusedNotice ||
    $[39] !== groupEditing ||
    $[40] !== hasRoomForSuffix ||
    $[41] !== heldInTerminal ||
    $[42] !== job.state.backend ||
    $[43] !== detailText ||
    $[44] !== showVerb ||
    $[45] !== activity
  ) {
    detailText_2 = groupEditing
      ? jsxProd_default_2(Text, {
          wrap: "truncate",
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: "group: ",
            }),
            renderCursorText(
              groupEditing.draft,
              groupEditing.cursor,
              Math.max(
                cols.detail - bunStringWidth("group: ") - (hasRoomForSuffix ? RESERVED_NAME_SUFFIX_WIDTH : 0),
                8,
              ),
              groupEditing.selected,
            ),
            groupEditing.reserved
              ? jsxProd_default(Text, {
                  color: "error",
                  children: " (reserved name)",
                })
              : !hasRoomForSuffix
                ? null
                : groupEditing.isNew
                  ? jsxProd_default(Text, {
                      dimColor: true,
                      children: " (new group)",
                    })
                  : groupEditing.ungroup
                    ? jsxProd_default(Text, {
                        dimColor: true,
                        children: " (ungroup)",
                      })
                    : groupEditing.addTo
                      ? jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [" (add to ", groupEditing.addTo, ")"],
                        })
                      : null,
          ],
        })
      : attaching === "armed"
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children: "opening\u2026 \xB7 esc to cancel",
          })
        : deleteArmed
          ? jsxProd_default(Text, {
              color: deleteArmed.ungroup ? "warning" : "error",
              wrap: "truncate",
              children: deleteArmed.ungroup
                ? "ctrl+x again to ungroup"
                : deleteArmed.justKilled
                  ? `stopped \xB7 ctrl+x again to ${deleteMethodName(job.state.backend)}`
                  : `ctrl+x again to ${deleteMethodName(job.state.backend)}`,
            })
          : deleteRefusedNotice
            ? jsxProd_default_2(Text, {
                wrap: "truncate",
                children: [
                  jsxProd_default(Text, {
                    color: "error",
                    children: "not deleted",
                  }),
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 ", deleteRefusedNotice],
                  }),
                ],
              })
            : attaching
              ? jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "truncate",
                  children: "opening\u2026",
                })
              : heldInTerminal
                ? jsxProd_default(Text, {
                    wrap: "truncate",
                    children: jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(Text, {
                          color: "suggestion",
                          children: "Open in a terminal",
                        }),
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "continue it there",
                        }),
                      ],
                    }),
                  })
                : showVerb
                  ? jsxProd_default(Text, {
                      wrap: "truncate",
                      children: jsxProd_default_2(Byline, {
                        children: [
                          jsxProd_default(Text, {
                            color: activity.color,
                            dimColor: activity.dim,
                            children: activity.word,
                          }),
                          detailText &&
                            jsxProd_default(Text, {
                              dimColor: true,
                              children: detailText,
                            }),
                        ],
                      }),
                    })
                  : jsxProd_default(Text, {
                      dimColor: true,
                      wrap: "truncate",
                      children: detailText,
                    });
    $[35] = attaching;
    $[36] = cols.detail;
    $[37] = deleteArmed;
    $[38] = deleteRefusedNotice;
    $[39] = groupEditing;
    $[40] = hasRoomForSuffix;
    $[41] = heldInTerminal;
    $[42] = job.state.backend;
    $[43] = detailText;
    $[44] = showVerb;
    $[45] = activity;
    $[46] = detailText_2;
  } else detailText_2 = $[46];
  let kickBadge;
  if (
    $[47] !== attaching ||
    $[48] !== deleteArmed ||
    $[49] !== deleteRefusedNotice ||
    $[50] !== groupEditing ||
    $[51] !== heldInTerminal ||
    $[52] !== loopKickCount
  ) {
    kickBadge =
      loopKickCount && !groupEditing && !deleteArmed && !deleteRefusedNotice && !attaching && !heldInTerminal
        ? jsxProd_default(Box, {
            flexShrink: 0,
            paddingLeft: 1,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: ["\xD7", loopKickCount],
            }),
          })
        : null;
    $[47] = attaching;
    $[48] = deleteArmed;
    $[49] = deleteRefusedNotice;
    $[50] = groupEditing;
    $[51] = heldInTerminal;
    $[52] = loopKickCount;
    $[53] = kickBadge;
  } else kickBadge = $[53];
  let detailBox;
  if ($[54] !== detailText_2 || $[55] !== kickBadge) {
    detailBox = jsxProd_default_2(Box, {
      flexGrow: 1,
      width: 0,
      paddingLeft: 2,
      children: [detailText_2, kickBadge],
    });
    $[54] = detailText_2;
    $[55] = kickBadge;
    $[56] = detailBox;
  } else detailBox = $[56];
  const artifactBox =
    cols.artifact > 0
      ? jsxProd_default(Box, {
          width: cols.artifact + 2,
          flexShrink: 0,
          paddingLeft: 2,
          justifyContent: "flex-end",
          children:
            filtered_2.length > 1
              ? jsxProd_default_2(Text, {
                  color: prRow?.color,
                  dimColor: !isFocused || !prRow?.color,
                  children: [filtered_2.length, " PRs"],
                })
              : filtered_2.length === 1
                ? prRow?.prNumber !== undefined
                  ? jsxProd_default(PrBadge, {
                      number: prRow.prNumber,
                      url: prRow.row.href,
                      kind: prKindOf(prRow.row),
                      color: prRow.color,
                      dimColor: !isFocused,
                      underline: false,
                      hidePrefix: true,
                    })
                  : jsxProd_default(Text, {
                      color: focusFg,
                      dimColor: !isFocused,
                      children: "PR",
                    })
                : prRow
                  ? jsxProd_default(Link, {
                      url: prRow.row.href,
                      children: jsxProd_default_2(Text, {
                        color: "claude",
                        children: [filtered.length > 1 && `${filtered.length} `, BOXED_DIAMOND_GLYPH],
                      }),
                    })
                  : null,
        })
      : null;
  const width_2 = cols.age + 2;
  let children_4;
  if ($[57] !== age) {
    children_4 = jsxProd_default(Text, {
      dimColor: true,
      children: age,
    });
    $[57] = age;
    $[58] = children_4;
  } else children_4 = $[58];
  let ageBox;
  if ($[59] !== width_2 || $[60] !== children_4) {
    ageBox = jsxProd_default(Box, {
      width: width_2,
      flexShrink: 0,
      paddingLeft: 2,
      justifyContent: "flex-end",
      children: children_4,
    });
    $[59] = width_2;
    $[60] = children_4;
    $[61] = ageBox;
  } else ageBox = $[61];
  let row;
  if (
    $[62] !== rowContainer ||
    $[63] !== labelBox ||
    $[64] !== detailBox ||
    $[65] !== artifactBox ||
    $[66] !== ageBox
  ) {
    row = jsxProd_default_2(rowContainer, {
      children: [labelBox, detailBox, artifactBox, ageBox],
    });
    $[62] = rowContainer;
    $[63] = labelBox;
    $[64] = detailBox;
    $[65] = artifactBox;
    $[66] = ageBox;
    $[67] = row;
  } else row = $[67];
  return row;
}
//@ chunk-avy0g5d4.js:109770-109779 placement
var SESSION_ROW_INDENT = 3;
//@ chunk-avy0g5d4.js:109779-111160 placement
/**
 * 会话行的单行绘制（图标、标签、时长、令牌、状态、展开）。
 */
function FleetRowLine(props) {
  let $ = useMemoCache(27);
  let {
    icon,
    iconColor,
    iconDim,
    label,
    isOrigin,
    isFocused,
    focusFg,
    focusBg,
    age,
    tokens,
    state,
    extra,
    expanded,
    refusal,
    renaming,
    renameWidth,
    srLabel,
  } = props;
  const dimColor = iconDim || (iconColor === undefined && !isFocused);
  const pointerGlyph = isFocused ? "\u276F" : " ";
  let iconText;
  if (
    $[0] !== focusBg ||
    $[1] !== icon ||
    $[2] !== iconColor ||
    $[3] !== srLabel ||
    $[4] !== dimColor ||
    $[5] !== pointerGlyph
  ) {
    iconText = jsxProd_default_2(Text, {
      "aria-label": srLabel,
      color: iconColor,
      dimColor,
      backgroundColor: focusBg,
      children: [pointerGlyph, icon, "  "],
    });
    $[0] = focusBg;
    $[1] = icon;
    $[2] = iconColor;
    $[3] = srLabel;
    $[4] = dimColor;
    $[5] = pointerGlyph;
    $[6] = iconText;
  } else iconText = $[6];
  let labelText;
  if (
    $[7] !== focusFg ||
    $[8] !== isFocused ||
    $[9] !== isOrigin ||
    $[10] !== label ||
    $[11] !== renameWidth ||
    $[12] !== renaming
  ) {
    labelText = renaming
      ? jsxProd_default(Text, {
          children: renderCursorText(renaming.draft, renaming.cursor, renameWidth),
        })
      : jsxProd_default(Text, {
          color: focusFg,
          dimColor: !isFocused && !isOrigin,
          bold: isOrigin,
          wrap: "truncate",
          children: label,
        });
    $[7] = focusFg;
    $[8] = isFocused;
    $[9] = isOrigin;
    $[10] = label;
    $[11] = renameWidth;
    $[12] = renaming;
    $[13] = labelText;
  } else labelText = $[13];
  let headerBox;
  if ($[14] !== iconText || $[15] !== labelText) {
    headerBox = jsxProd_default_2(Box, {
      children: [iconText, labelText],
    });
    $[14] = iconText;
    $[15] = labelText;
    $[16] = headerBox;
  } else headerBox = $[16];
  let detailText;
  if (
    $[17] !== age ||
    $[18] !== expanded ||
    $[19] !== extra ||
    $[20] !== refusal ||
    $[21] !== state ||
    $[22] !== tokens
  ) {
    detailText =
      (expanded || refusal) &&
      jsxProd_default(Box, {
        paddingLeft: SESSION_ROW_INDENT,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate",
          children: jsxProd_default_2(Byline, {
            children: [
              age,
              tokens,
              refusal
                ? jsxProd_default(Text, {
                    color: "error",
                    wrap: "truncate",
                    children: refusal,
                  })
                : extra &&
                  jsxProd_default(Text, {
                    color: state.color,
                    dimColor: state.dim,
                    wrap: "truncate",
                    children: extra,
                  }),
            ],
          }),
        }),
      });
    $[17] = age;
    $[18] = expanded;
    $[19] = extra;
    $[20] = refusal;
    $[21] = state;
    $[22] = tokens;
    $[23] = detailText;
  } else detailText = $[23];
  let row;
  if ($[24] !== headerBox || $[25] !== detailText) {
    row = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [headerBox, detailText],
    });
    $[24] = headerBox;
    $[25] = detailText;
    $[26] = row;
  } else row = $[26];
  return row;
}
//@ chunk-avy0g5d4.js:111160-111192 placement
function selectEditorQuery(editor) {
  return editor.query;
}
//@ chunk-avy0g5d4.js:111192-111226 placement
function selectHistoryLoading(earlier) {
  return earlier.loading;
}
//@ chunk-avy0g5d4.js:111226-111249 placement
function returnFalse() {
  return false;
}
//@ chunk-avy0g5d4.js:111249-111264 placement
function noopEffect() {}
//@ chunk-avy0g5d4.js:111264-111303 placement
function isJobRow(row) {
  return row.kind === "job";
}
//@ chunk-avy0g5d4.js:111303-123298 placement
/**
 * Agents 视图的滚动列表（分组头、选中、过滤、旧会话行）。
 */
function FleetRowList(props) {
  let $ = useMemoCache(117);
  let {
    owners,
    layout,
    scrollRef,
    header,
    renameInput,
    groupInput,
    initialJobId,
    cwdFilter,
    simpleView,
    endsWithOlderSessionsLine,
    hasCredentials,
    mountAt,
    actions,
  } = props;
  let { roster, selection, view, attach, editor, deleteConfirm, earlier } = owners;
  let { columns, rows } = useTerminalSize();
  let { focusedIdx, hoverFocusIdx } = useStoreSelector(selection);
  let { groupMode, activeTab, groupEdit, groupPickIdx, groupPristine, renaming, previewOpen, helpOpen } =
    useStoreSelector(view);
  let { attachingJobId, warmingJobIds, newSessionOpening } = useStoreSelector(attach);
  let { prStatuses, loopKicks, logTails, deleteRefusals } = useStoreSelector(roster);
  let storeSelector = useStoreSelector(editor, selectEditorQuery);
  let { pending } = useStoreSelector(deleteConfirm);
  let storeSelector_2 = useStoreSelector(earlier, selectHistoryLoading);
  let {
    rows: rows_2,
    collapsed,
    filtered,
    byState,
    byGroup,
    isOnboarding,
    hasComposedDispatch,
    dispatchTargetGroup,
    hasMultipleOrigins,
    focusedGroup,
    groupCounts,
    earlierVisible,
    simpleBuilt,
    cols,
    ageNow,
    loopJobIds,
    focusIsFromHover,
    queryIsFilter,
  } = layout;
  let { draft, cursor } = renameInput;
  let {
    draft: draft_2,
    cursor: cursor_2,
    suggestions,
    reserved,
    isNew,
    matchesExisting,
    panelOpen,
  } = groupInput;
  let { toggleCollapse, openOrRespawn, openEarlier, openNewSessionRow } = actions;
  let jobId = renaming?.jobId ?? null;
  let getLiveStatus;
  if ($[0] !== roster) {
    getLiveStatus = (job) => roster.liveStatus(job);
    $[0] = roster;
    $[1] = getLiveStatus;
  } else getLiveStatus = $[1];
  let liveStatus = getLiveStatus;
  let setError = editor.setError;
  let makeCollapseKey;
  if ($[2] !== groupMode) {
    makeCollapseKey = (group) => groupCollapseKey(groupMode, group);
    $[2] = groupMode;
    $[3] = makeCollapseKey;
  } else makeCollapseKey = $[3];
  let collapseKeyOf = makeCollapseKey;
  let makeHeaderKey;
  if ($[4] !== groupMode) {
    makeHeaderKey = (group) => `header:${groupMode}:${group}`;
    $[4] = groupMode;
    $[5] = makeHeaderKey;
  } else makeHeaderKey = $[5];
  let headerKeyOf = makeHeaderKey;
  let columnIndent = columns >= 120 ? 1 : 0;
  let focusedRowRef = useRef(null);
  let showNoMatches =
    filtered.length === 0 && !!storeSelector && queryIsFilter && (simpleView || earlierVisible.length === 0);
  useRef(null);
  let isScrollBlocked = returnFalse;
  let groupPanelRef = useRef(null);
  let suggestionsText;
  if ($[6] !== suggestions) {
    suggestionsText = suggestions.join(`
`);
    $[6] = suggestions;
    $[7] = suggestionsText;
  } else suggestionsText = $[7];
  let suggestionsKey = suggestionsText;
  let scrollToFocused;
  if (
    $[8] !== focusIsFromHover ||
    $[9] !== focusedIdx ||
    $[10] !== rows_2 ||
    $[11] !== scrollRef ||
    $[12] !== selection
  ) {
    scrollToFocused = () => {
      let revealAtTop = selection.takeRevealAtTop(focusedIdx);
      if (!focusedRowRef.current || focusIsFromHover) {
        return;
      }
      if (focusedIdx === 0) {
        scrollRef.current?.scrollTo(0);
        return;
      }
      if (isScrollBlocked()) {
        return;
      }
      let scrollOffset = rows_2[focusedIdx]?.kind === "header" ? -1 : 0;
      scrollRef.current?.scrollToElement(focusedRowRef.current, scrollOffset, {
        block: revealAtTop ? "start" : "nearest",
      });
    };
    $[8] = focusIsFromHover;
    $[9] = focusedIdx;
    $[10] = rows_2;
    $[11] = scrollRef;
    $[12] = selection;
    $[13] = scrollToFocused;
  } else scrollToFocused = $[13];
  let scrollDeps;
  if ($[14] !== focusIsFromHover || $[15] !== focusedIdx || $[16] !== rows) {
    scrollDeps = [focusedIdx, focusIsFromHover, rows];
    $[14] = focusIsFromHover;
    $[15] = focusedIdx;
    $[16] = rows;
    $[17] = scrollDeps;
  } else scrollDeps = $[17];
  useLayoutEffect(scrollToFocused, scrollDeps);
  let olderLineDeps;
  if ($[18] !== endsWithOlderSessionsLine) {
    olderLineDeps = [endsWithOlderSessionsLine];
    $[18] = endsWithOlderSessionsLine;
    $[19] = olderLineDeps;
  } else olderLineDeps = $[19];
  useLayoutEffect(noopEffect, olderLineDeps);
  let viewportHeightRef = useRef(0);
  let rememberViewportHeight;
  if ($[20] !== helpOpen || $[21] !== scrollRef) {
    rememberViewportHeight = () => {
      if (!helpOpen) viewportHeightRef.current = scrollRef.current?.getViewportHeight() ?? 0;
    };
    $[20] = helpOpen;
    $[21] = scrollRef;
    $[22] = rememberViewportHeight;
  } else rememberViewportHeight = $[22];
  useLayoutEffect(rememberViewportHeight);
  let restoreScrollOnHelpClose;
  if ($[23] !== helpOpen || $[24] !== scrollRef) {
    restoreScrollOnHelpClose = () => {
      let viewport = scrollRef.current;
      let computedTop = focusedRowRef.current?.yogaNode?.getComputedTop();
      if (!helpOpen || !viewport || !focusedRowRef.current || computedTop === undefined) {
        return;
      }
      let offsetTop = computedTop - viewport.getScrollTop();
      if (offsetTop >= 0 && offsetTop < viewportHeightRef.current)
        viewport.scrollToElement(focusedRowRef.current, 0, {
          block: "nearest",
        });
    };
    $[23] = helpOpen;
    $[24] = scrollRef;
    $[25] = restoreScrollOnHelpClose;
  } else restoreScrollOnHelpClose = $[25];
  let helpCloseDeps;
  if ($[26] !== helpOpen) {
    helpCloseDeps = [helpOpen];
    $[26] = helpOpen;
    $[27] = helpCloseDeps;
  } else helpCloseDeps = $[27];
  useLayoutEffect(restoreScrollOnHelpClose, helpCloseDeps);
  let revealGroupPanel;
  if ($[28] !== panelOpen || $[29] !== scrollRef) {
    revealGroupPanel = () => {
      if (panelOpen && groupPanelRef.current)
        scrollRef.current?.scrollToElement(groupPanelRef.current, 0, {
          block: "nearest",
        });
    };
    $[28] = panelOpen;
    $[29] = scrollRef;
    $[30] = revealGroupPanel;
  } else revealGroupPanel = $[30];
  let panelDeps;
  if ($[31] !== panelOpen || $[32] !== groupPickIdx || $[33] !== suggestionsKey) {
    panelDeps = [panelOpen, suggestionsKey, groupPickIdx];
    $[31] = panelOpen;
    $[32] = groupPickIdx;
    $[33] = suggestionsKey;
    $[34] = panelDeps;
  } else panelDeps = $[34];
  useLayoutEffect(revealGroupPanel, panelDeps);
  let groupPanel;
  if (
    $[35] !== cols ||
    $[36] !== panelOpen ||
    $[37] !== groupPickIdx ||
    $[38] !== suggestions ||
    $[39] !== columnIndent
  ) {
    groupPanel = panelOpen
      ? (() => {
          let max = Math.max(0, Math.min(groupPickIdx - 1, suggestions.length - 4));
          let sliced = suggestions.slice(max, max + 4);
          let hiddenBelow = suggestions.length - max - sliced.length;
          let paddingLeft = columnIndent + cols.label + 4 + 7 - 2;
          return jsxProd_default_2(Box, {
            ref: groupPanelRef,
            flexDirection: "column",
            paddingLeft,
            children: [
              max > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\u2026 ", max, " above"],
                }),
              sliced.map((suggestion, suggestionIndex) => {
                let isPicked = max + suggestionIndex === groupPickIdx;
                return jsxProd_default_2(
                  Text,
                  {
                    color: isPicked ? "suggestion" : undefined,
                    dimColor: !isPicked,
                    wrap: "truncate",
                    children: [isPicked ? figures_default.pointer : " ", " ", suggestion],
                  },
                  suggestion,
                );
              }),
              hiddenBelow > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\u2026 ", hiddenBelow, " more"],
                }),
            ],
          });
        })()
      : null;
    $[35] = cols;
    $[36] = panelOpen;
    $[37] = groupPickIdx;
    $[38] = suggestions;
    $[39] = columnIndent;
    $[40] = groupPanel;
  } else groupPanel = $[40];
  let panelElement = groupPanel;
  let rowElements;
  if (
    $[41] !== activeTab ||
    $[42] !== ageNow ||
    $[43] !== attachingJobId ||
    $[44] !== byGroup ||
    $[45] !== byState ||
    $[46] !== collapseKeyOf ||
    $[47] !== collapsed ||
    $[48] !== cols ||
    $[49] !== columns ||
    $[50] !== cwdFilter ||
    $[51] !== deleteRefusals ||
    $[52] !== dispatchTargetGroup ||
    $[53] !== storeSelector_2 ||
    $[54] !== earlierVisible ||
    $[55] !== focusedGroup ||
    $[56] !== focusedIdx ||
    $[57] !== groupCounts ||
    $[58] !== cursor_2 ||
    $[59] !== draft_2 ||
    $[60] !== isNew ||
    $[61] !== matchesExisting ||
    $[62] !== reserved ||
    $[63] !== groupEdit ||
    $[64] !== groupPickIdx ||
    $[65] !== groupPristine ||
    $[66] !== panelElement ||
    $[67] !== suggestions ||
    $[68] !== hasComposedDispatch ||
    $[69] !== hasCredentials ||
    $[70] !== hasMultipleOrigins ||
    $[71] !== headerKeyOf ||
    $[72] !== hoverFocusIdx ||
    $[73] !== initialJobId ||
    $[74] !== isOnboarding ||
    $[75] !== liveStatus ||
    $[76] !== logTails ||
    $[77] !== loopJobIds ||
    $[78] !== loopKicks ||
    $[79] !== mountAt ||
    $[80] !== newSessionOpening ||
    $[81] !== openEarlier ||
    $[82] !== openNewSessionRow ||
    $[83] !== openOrRespawn ||
    $[84] !== pending ||
    $[85] !== prStatuses ||
    $[86] !== previewOpen ||
    $[87] !== storeSelector ||
    $[88] !== queryIsFilter ||
    $[89] !== cursor ||
    $[90] !== draft ||
    $[91] !== jobId ||
    $[92] !== roster ||
    $[93] !== columnIndent ||
    $[94] !== rows_2 ||
    $[95] !== selection ||
    $[96] !== setError ||
    $[97] !== simpleBuilt ||
    $[98] !== simpleView ||
    $[99] !== toggleCollapse ||
    $[100] !== warmingJobIds
  ) {
    rowElements = rows_2.map((row, rowIndex) => {
      let isFocused = rowIndex === focusedIdx;
      let isOnboardingHeader = isOnboarding && row.kind === "header";
      let isGroupHighlighted =
        row.kind === "header"
          ? hasComposedDispatch
            ? row.group === dispatchTargetGroup
            : isFocused && !isOnboardingHeader
          : !hasComposedDispatch && isFocused;
      let backgroundColor =
        !hasComposedDispatch && isFocused && rowIndex !== hoverFocusIdx && !isOnboardingHeader
          ? "userMessageBackground"
          : undefined;
      let focusColor = backgroundColor && "text";
      let selectRow = (fromHover) => {
        if (previewOpen && row.kind !== "job") {
          return;
        }
        if (rowIndex === focusedIdx) {
          if (!fromHover) selection.setHoverFocusIdx(null);
          return;
        }
        setError(null);
        if (fromHover) selection.hoverTo(rowIndex, row);
        else selection.navigateTo(rowIndex, row);
      };
      let handleEnter = () => selectRow(true);
      let handleClick = () => selectRow(false);
      if (row.kind === "header") {
        let isFocusedGroup = !hasComposedDispatch && hasMultipleOrigins && row.group === focusedGroup;
        let children = groupCounts.get(row.group) ?? 0;
        let isCollapsed = collapsed.has(collapseKeyOf(row.group));
        return jsxProd_default_2(
          Box,
          {
            ref: isFocused ? focusedRowRef : undefined,
            marginTop: rowIndex > 0 ? 1 : 0,
            flexDirection: "column",
            backgroundColor,
            onMouseEnter: storeSelector || previewOpen || isOnboarding ? undefined : handleEnter,
            onClick: isOnboarding
              ? undefined
              : () => {
                  handleClick();
                  selection.followOrigin = row.group;
                  selection.followId = null;
                  if (!queryIsFilter) toggleCollapse(row.group);
                },
            children: [
              groupEdit?.kind === "rename" && groupEdit.from === row.group
                ? jsxProd_default_2(Text, {
                    wrap: "truncate",
                    children: [
                      renderCursorText(draft_2, cursor_2, Math.max(columns - 4, 10), groupPristine),
                      groupPristine
                        ? null
                        : reserved
                          ? jsxProd_default(Text, {
                              color: "error",
                              children: " (reserved name)",
                            })
                          : matchesExisting
                            ? jsxProd_default(Text, {
                                color: "error",
                                children: " (name taken)",
                              })
                            : isNew
                              ? jsxProd_default(Text, {
                                  dimColor: true,
                                  children: " (rename group)",
                                })
                              : null,
                    ],
                  })
                : jsxProd_default_2(Text, {
                    bold: isFocusedGroup || isGroupHighlighted,
                    color: focusColor,
                    dimColor: !isGroupHighlighted,
                    children: [
                      row.group === "pinned"
                        ? "Pinned"
                        : row.group === EARLIER
                          ? "Past"
                          : byState
                            ? FLEET_BUCKET_LABELS[row.group]
                            : byGroup
                              ? row.group === UNGROUPED
                                ? "Ungrouped"
                                : truncate(row.group, Math.max(columns - 10, 10))
                              : truncatePathForDisplay(
                                  activeTab === "remote"
                                    ? sanitizeAttentionText(shortenPath(row.group))
                                    : shortenPath(row.group),
                                  Math.max(columns - 10, 10),
                                ),
                      isCollapsed &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            " ",
                            jsxProd_default(Text, {
                              dimColor: true,
                              children,
                            }),
                          ],
                        }),
                      (byState ? row.group === "done" : row.group === EARLIER) &&
                        storeSelector_2 &&
                        activeTab !== "remote" &&
                        !cwdFilter &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            " ",
                            jsxProd_default(Text, {
                              dimColor: true,
                              children: "\xB7 looking for past sessions\u2026",
                            }),
                          ],
                        }),
                    ],
                  }),
              isOnboarding &&
                !(row.group === "done" && earlierVisible.length > 0) &&
                jsxProd_default(Box, {
                  paddingLeft: 1,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: FLEET_BUCKET_HINTS[row.group],
                  }),
                }),
            ],
          },
          `h:${row.group}`,
        );
      }
      if (row.kind === "fold") {
        return jsxProd_default(
          Box,
          {
            ref: isFocused ? focusedRowRef : undefined,
            marginTop: simpleView && isDifferentDoneGroup(rows_2[rowIndex - 1], row) ? 1 : 0,
            paddingLeft: columnIndent,
            backgroundColor,
            onMouseEnter: storeSelector || previewOpen ? undefined : handleEnter,
            onClick: () => {
              handleClick();
              selection.expandCap(row.group);
              logEvent("tengu_fleetview_fold_expand", {
                hidden_count: row.hidden,
                ms_since_mount: Date.now() - mountAt,
                via_click: true,
              });
            },
            children: jsxProd_default_2(Text, {
              color: focusColor,
              dimColor: !isGroupHighlighted,
              "aria-label": `${isFocused ? "selected, " : ""}${row.hidden} more finished sessions folded:`,
              children: [
                simpleView ? (isFocused ? "\u276F" : " ") + repeatString(" ", SESSION_ROW_INDENT - 1) : "",
                row.group === SIMPLE_FINISHED
                  ? `\u2026 show all (${row.hidden} more${simpleBuilt !== null && simpleBuilt.doneFoldHiddenFailed > 0 ? ` \xB7 ${simpleBuilt.doneFoldHiddenFailed} failed` : ""})`
                  : `\u2026 ${row.hidden} more`,
              ],
            }),
          },
          `f:${row.group}`,
        );
      }
      if (row.kind === "newsession") {
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                ref: isFocused ? focusedRowRef : undefined,
                paddingLeft: columnIndent,
                backgroundColor,
                onMouseEnter: storeSelector || previewOpen ? undefined : handleEnter,
                onClick: () => {
                  handleClick();
                  openNewSessionRow(row.origin);
                },
                children: [
                  jsxProd_default_2(Text, {
                    color: focusColor ?? "suggestion",
                    "aria-label": isFocused ? "selected, new session:" : undefined,
                    children: [
                      isFocused ? "\u276F" : " ",
                      "+  ",
                      jsxProd_default(Text, {
                        underline: isFocused,
                        children: "new session",
                      }),
                    ],
                  }),
                  newSessionOpening &&
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      wrap: "truncate",
                      children: ["  ", "opening\u2026 \xB7 esc to cancel"],
                    }),
                ],
              }),
              simpleBuilt !== null &&
                !simpleBuilt.rows.some(isJobRow) &&
                jsxProd_default_2(Box, {
                  paddingLeft: columnIndent + SESSION_ROW_INDENT,
                  marginTop: 1,
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Text, {
                      bold: true,
                      children: "Nothing running in the background.",
                    }),
                    jsxProd_default(Text, {
                      dimColor: true,
                      children:
                        "Hand off a task and it keeps working while you do something else \u2014 even if you close this terminal.",
                    }),
                    !hasCredentials &&
                      jsxProd_default_2(Text, {
                        color: "warning",
                        wrap: "truncate",
                        children: [
                          "You are not logged in. Run",
                          " ",
                          jsxProd_default(Text, {
                            bold: true,
                            children: "claude /login",
                          }),
                          " first, or press",
                          " ",
                          jsxProd_default(Text, {
                            bold: true,
                            children: "l",
                          }),
                          " to log in.",
                        ],
                      }),
                    jsxProd_default_2(Box, {
                      marginTop: 1,
                      flexDirection: "column",
                      children: [
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "Start one with",
                            " ",
                            jsxProd_default(Text, {
                              color: "suggestion",
                              children: "+ new session",
                            }),
                            " above,",
                          ],
                        }),
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "or run",
                            " ",
                            jsxProd_default(Text, {
                              color: "suggestion",
                              children: 'claude --bg "task"',
                            }),
                            " from any terminal,",
                          ],
                        }),
                        jsxProd_default_2(Text, {
                          dimColor: true,
                          children: [
                            "or ",
                            jsxProd_default(Text, {
                              color: "suggestion",
                              children: "/fork",
                            }),
                            " a session you're already in.",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
            ],
          },
          "newsession",
        );
      }
      if (row.kind === "earlier") {
        let entry = row.entry;
        return jsxProd_default_2(
          Box,
          {
            ref: isFocused ? focusedRowRef : undefined,
            width: "100%",
            paddingLeft: columnIndent,
            backgroundColor,
            onMouseEnter: storeSelector || previewOpen ? undefined : handleEnter,
            onClick: () => {
              handleClick();
              openEarlier(entry, "section");
            },
            children: [
              jsxProd_default(Box, {
                flexGrow: 1,
                flexShrink: 1,
                overflow: "hidden",
                children: jsxProd_default_2(Text, {
                  color: focusColor,
                  dimColor: !isGroupHighlighted,
                  wrap: "truncate",
                  children: ["\xB7 ", entry.title],
                }),
              }),
              jsxProd_default(Box, {
                flexShrink: 0,
                marginLeft: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: formatDuration(Math.max(0, (ageNow ?? Date.now()) - entry.modified.getTime()), {
                    mostSignificantOnly: true,
                  }),
                }),
              }),
            ],
          },
          `e:${entry.sessionId}`,
        );
      }
      let job = row.job;
      if (simpleView) {
        let outcome = terminalOutcome(job.state.state);
        let status = liveStatus(job);
        let activity = jobActivityDisplay(job, liveStatus);
        let glyph =
          (outcome === "stopped" ? "\u23F9" : outcome === "failure" ? "\u2717" : null) ??
          jobRowGlyph(job.state, outcome, status);
        let isOrigin = job.id === initialJobId;
        return jsxProd_default(
          Box,
          {
            ref: isFocused ? focusedRowRef : undefined,
            flexDirection: "column",
            width: "100%",
            paddingLeft: columnIndent,
            marginTop: isDifferentDoneGroup(rows_2[rowIndex - 1], row) ? 1 : 0,
            backgroundColor,
            onMouseEnter: storeSelector || previewOpen ? undefined : handleEnter,
            onClick: (event) => {
              if (event.hyperlinkUrl && !returnFalse_2(job.state)) {
                return event.allowDefault();
              }
              if (event.isWindowActivation) {
                return event.dropAsStray();
              }
              handleClick();
              openOrRespawn(job);
            },
            children: jsxProd_default(FleetRowLine, {
              icon: glyph ?? jsxProd_default(useFleetSpinnerFrame, {}),
              iconColor: activity.color,
              iconDim: activity.dim,
              label: getJobTitle(job.state, isOrigin, true),
              renameWidth: Math.max(12, columns - columnIndent - SESSION_ROW_INDENT),
              renaming:
                jobId === job.id
                  ? {
                      draft,
                      cursor,
                    }
                  : undefined,
              isOrigin,
              isFocused,
              focusFg: focusColor,
              focusBg: backgroundColor,
              age: jobAgeLabel(job, loopJobIds, loopKicks, ageNow),
              tokens: jobTokenLabel(job, activity),
              state: activity,
              extra: jobNeedsLine(job, activity, status, columns),
              expanded: Boolean(job.state.pinned) || jobBucket_2(job.state, status) === "needs",
              refusal: deleteRefusals.get(job.id)?.notice,
              srLabel: jobRowAriaLabel(
                job.activity,
                job.state.tempo,
                status,
                outcome,
                isFocused,
                job.state.pinned === true,
              ),
            }),
          },
          job.id,
        );
      }
      let isAssigningGroup = groupEdit?.kind === "assign" && groupEdit.jobId === job.id;
      let jobElement = jsxProd_default(
        Box,
        {
          ref: isFocused ? focusedRowRef : undefined,
          width: "100%",
          paddingLeft: columnIndent,
          backgroundColor,
          onMouseEnter: storeSelector || previewOpen ? undefined : handleEnter,
          onClick: (event) => {
            if (event.hyperlinkUrl && !returnFalse_2(job.state)) {
              return event.allowDefault();
            }
            if (event.isWindowActivation) {
              return event.dropAsStray();
            }
            handleClick();
            openOrRespawn(job);
          },
          children: jsxProd_default(FleetJobRow, {
            job,
            isFocused,
            focusFg: focusColor,
            isOrigin: job.id === initialJobId,
            logTail: logTails[job.id],
            cols,
            status: liveStatus(job),
            heldInTerminal: roster.terminalHolderOf(job) !== undefined,
            showVerb: !byState,
            loopKickCount: loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.count : undefined,
            age: formatJobAgeOrEta(
              job,
              loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.nextAt : undefined,
              ageNow,
            ),
            childRows: job.state.children ? childFrameRows(job.state.children, prStatuses) : [],
            renaming:
              jobId === job.id
                ? {
                    draft,
                    cursor,
                  }
                : undefined,
            groupEditing: isAssigningGroup
              ? {
                  draft: draft_2,
                  cursor: cursor_2,
                  selected: groupPristine,
                  reserved: !groupPristine && reserved,
                  isNew: !groupPristine && isNew && groupPickIdx < 0,
                  ungroup: !groupPristine && draft_2.trim() === "" && groupPickIdx < 0 && !!job.state.group,
                  addTo: groupPristine
                    ? undefined
                    : groupPickIdx >= 0
                      ? suggestions[groupPickIdx]
                      : matchesExisting
                        ? draft_2.trim()
                        : undefined,
                }
              : undefined,
            deleteArmed:
              pending && (pending.id === job.id || pending.id === headerKeyOf(row.group))
                ? {
                    justKilled: pending.justKilled,
                    ungroup:
                      byGroup &&
                      pending.id === headerKeyOf(row.group) &&
                      row.group !== "pinned" &&
                      row.group !== UNGROUPED &&
                      row.group !== EARLIER,
                  }
                : undefined,
            deleteRefused: deleteRefusals.get(job.id)?.notice,
            attaching: attachingJobId === job.id ? "armed" : warmingJobIds.has(job.id) ? "warming" : false,
          }),
        },
        job.id,
      );
      return jsxProd_default_2(
        fragmentTypeExport,
        {
          children: [jobElement, isAssigningGroup && panelElement],
        },
        job.id,
      );
    });
    $[41] = activeTab;
    $[42] = ageNow;
    $[43] = attachingJobId;
    $[44] = byGroup;
    $[45] = byState;
    $[46] = collapseKeyOf;
    $[47] = collapsed;
    $[48] = cols;
    $[49] = columns;
    $[50] = cwdFilter;
    $[51] = deleteRefusals;
    $[52] = dispatchTargetGroup;
    $[53] = storeSelector_2;
    $[54] = earlierVisible;
    $[55] = focusedGroup;
    $[56] = focusedIdx;
    $[57] = groupCounts;
    $[58] = cursor_2;
    $[59] = draft_2;
    $[60] = isNew;
    $[61] = matchesExisting;
    $[62] = reserved;
    $[63] = groupEdit;
    $[64] = groupPickIdx;
    $[65] = groupPristine;
    $[66] = panelElement;
    $[67] = suggestions;
    $[68] = hasComposedDispatch;
    $[69] = hasCredentials;
    $[70] = hasMultipleOrigins;
    $[71] = headerKeyOf;
    $[72] = hoverFocusIdx;
    $[73] = initialJobId;
    $[74] = isOnboarding;
    $[75] = liveStatus;
    $[76] = logTails;
    $[77] = loopJobIds;
    $[78] = loopKicks;
    $[79] = mountAt;
    $[80] = newSessionOpening;
    $[81] = openEarlier;
    $[82] = openNewSessionRow;
    $[83] = openOrRespawn;
    $[84] = pending;
    $[85] = prStatuses;
    $[86] = previewOpen;
    $[87] = storeSelector;
    $[88] = queryIsFilter;
    $[89] = cursor;
    $[90] = draft;
    $[91] = jobId;
    $[92] = roster;
    $[93] = columnIndent;
    $[94] = rows_2;
    $[95] = selection;
    $[96] = setError;
    $[97] = simpleBuilt;
    $[98] = simpleView;
    $[99] = toggleCollapse;
    $[100] = warmingJobIds;
    $[101] = rowElements;
  } else rowElements = $[101];
  let noMatchesNotice;
  if ($[102] !== showNoMatches) {
    noMatchesNotice =
      showNoMatches &&
      true &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "no sessions match",
        }),
      });
    $[102] = showNoMatches;
    $[103] = noMatchesNotice;
  } else noMatchesNotice = $[103];
  let earlierLoadingNotice;
  if (
    $[104] !== activeTab ||
    $[105] !== byState ||
    $[106] !== cwdFilter ||
    $[107] !== storeSelector_2 ||
    $[108] !== rows_2 ||
    $[109] !== simpleView
  ) {
    earlierLoadingNotice =
      storeSelector_2 &&
      !simpleView &&
      activeTab !== "remote" &&
      !cwdFilter &&
      !rows_2.some((row) => row.kind === "header" && row.group === (byState ? "done" : EARLIER)) &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 looking for past sessions\u2026",
        }),
      });
    $[104] = activeTab;
    $[105] = byState;
    $[106] = cwdFilter;
    $[107] = storeSelector_2;
    $[108] = rows_2;
    $[109] = simpleView;
    $[110] = earlierLoadingNotice;
  } else earlierLoadingNotice = $[110];
  let scrollBox;
  if (
    $[111] !== header ||
    $[112] !== scrollRef ||
    $[113] !== rowElements ||
    $[114] !== noMatchesNotice ||
    $[115] !== earlierLoadingNotice
  ) {
    scrollBox = jsxProd_default_2(ScrollBoxDefault, {
      ref: scrollRef,
      flexGrow: 1,
      flexDirection: "column",
      paddingTop: 1,
      stickyScroll: false,
      children: [header, rowElements, noMatchesNotice, false, earlierLoadingNotice],
    });
    $[111] = header;
    $[112] = scrollRef;
    $[113] = rowElements;
    $[114] = noMatchesNotice;
    $[115] = earlierLoadingNotice;
    $[116] = scrollBox;
  } else scrollBox = $[116];
  return scrollBox;
}
//@ chunk-avy0g5d4.js:123298-123302 placement
init_react_production();
//@ chunk-avy0g5d4.js:123302-123341 placement
function selectSessionModel_2(state) {
  return state.sessionModel;
}
//@ chunk-avy0g5d4.js:123341-123381 placement
function selectSessionEffort_2(state) {
  return state.sessionEffort;
}
//@ chunk-avy0g5d4.js:123381-123423 placement
function createLatch() {
  let latched = false;
  return () => {
    latched = true;
  };
}
//@ chunk-avy0g5d4.js:123423-123652 placement
/**
 * Agents 视图支持的快捷键动作列表。
 */
var FLEET_KEY_ACTIONS = [
  "agents:switchView",
  "agents:togglePin",
  "agents:find",
  "agents:nextGroup",
  "agents:previousGroup",
  "agents:rename",
  "agents:setGroup",
  "chat:externalEditor",
];
var FLEET_EDITOR_SAFE_ACTIONS = new Set(["agents:switchView", "agents:togglePin", "agents:rename"]);
//@ chunk-avy0g5d4.js:123652-123697 placement
function useFleetBindings() {
  return useKeybindingContext()?.bindings ?? parseBindings(DEFAULT_BINDINGS);
}
export {
  useFleetBindings,
  useDispatchWindowDefaults,
  FleetRowList,
  FleetComposer,
  FLEET_KEY_ACTIONS,
  FLEET_EDITOR_SAFE_ACTIONS,
};
