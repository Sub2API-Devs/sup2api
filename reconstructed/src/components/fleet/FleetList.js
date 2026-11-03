/**
 * components/fleet/FleetList.tsx
 *
 * 2.1.316 新增：Agents 视图的滚动列表（分组头、选中、过滤、旧会话行）；Agents 视图中一个会话（job）行：状态、详情、子行、重命名/分组/删除状态等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (25)
 * attribution: placement 25
 */
import { basename } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { init_react_production, R, zt, Kc } from "../../../vendor/react/cjs/react.production.js";
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
import { BULLET_OPERATOR, BOXED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import {
  returnFalse_2,
  isTerminalDetail,
  jobPreviewText,
  stripJobPreviewText,
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

//@ chunk-93kwxas0.js:100082-102493 placement
/**
 * Agents 视图底部的派发输入区（布局、简化视图、派发默认值、当前目录）。
 */
function FleetComposer(props) {
  let me = w(33);
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
  let ne = !!cwd && targetCwd !== launcherCwd && targetCwd !== canonicalLauncherCwd;
  let path = ne ? tildify(targetCwd) : cwd;
  let Je;
  let le;
  if (me[0] !== newSession || me[1] !== pathOwnRow || me[2] !== width) {
    Je = fitDispatchDefaultsLabel(newSession, width);
    le = pathOwnRow ? width : width - 3 - bunStringWidth(Je);
    me[0] = newSession;
    me[1] = pathOwnRow;
    me[2] = width;
    me[3] = Je;
    me[4] = le;
  } else {
    Je = me[3];
    le = me[4];
  }
  let Oe = le;
  let De = truncatePathForDisplay(path, Math.min(bunStringWidth(path), Math.max(Oe, 1)));
  let we = simpleView && ne;
  let Re;
  if (me[5] !== we || me[6] !== De) {
    Re =
      De &&
      jsxProd_default(Text, {
        color: we ? "suggestion" : undefined,
        dimColor: !we,
        children: De,
      });
    me[5] = we;
    me[6] = De;
    me[7] = Re;
  } else Re = me[7];
  let je = Re;
  let st;
  if (me[8] !== columns || me[9] !== compactHeader) {
    st = !compactHeader && columns >= 70 && jsxProd_default(Clawd, {});
    me[8] = columns;
    me[9] = compactHeader;
    me[10] = st;
  } else st = me[10];
  let mt;
  if (
    me[11] !== compactHeader ||
    me[12] !== je ||
    me[13] !== Je ||
    me[14] !== pathOwnRow ||
    me[15] !== simpleView ||
    me[16] !== version
  ) {
    mt =
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
            children: [Je, !pathOwnRow && je && " \xB7 ", !pathOwnRow && je],
          }),
          pathOwnRow &&
            je &&
            jsxProd_default(Text, {
              wrap: "truncate",
              children: je,
            }),
        ],
      });
    me[11] = compactHeader;
    me[12] = je;
    me[13] = Je;
    me[14] = pathOwnRow;
    me[15] = simpleView;
    me[16] = version;
    me[17] = mt;
  } else mt = me[17];
  let Ye;
  if (me[18] !== bandCounts || me[19] !== earlierVisible || me[20] !== simpleBuilt) {
    Ye = simpleBuilt
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
    me[18] = bandCounts;
    me[19] = earlierVisible;
    me[20] = simpleBuilt;
    me[21] = Ye;
  } else Ye = me[21];
  let Lt;
  if (me[22] !== mt || me[23] !== Ye) {
    Lt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [mt, Ye],
    });
    me[22] = mt;
    me[23] = Ye;
    me[24] = Lt;
  } else Lt = me[24];
  let dt;
  if (me[25] !== st || me[26] !== Lt) {
    dt = jsxProd_default_2(Box, {
      gap: 2,
      marginBottom: 1,
      children: [st, Lt],
    });
    me[25] = st;
    me[26] = Lt;
    me[27] = dt;
  } else dt = me[27];
  let Dt;
  if (me[28] !== originJobId) {
    Dt =
      originJobId !== undefined &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children:
            "Your conversation moved to the background \u2014 enter opens it \xB7 esc returns to it \xB7 ctrl+c twice quits",
        }),
      });
    me[28] = originJobId;
    me[29] = Dt;
  } else Dt = me[29];
  let eo;
  if (me[30] !== dt || me[31] !== Dt) {
    eo = jsxProd_default_2(Fragment, {
      children: [dt, Dt],
    });
    me[30] = dt;
    me[31] = Dt;
    me[32] = eo;
  } else eo = me[32];
  return eo;
}
//@ chunk-93kwxas0.js:102493-102976 placement
/**
 * 计算派发窗口（模型、effort、快速模式）对新会话的有效默认值。
 */
function useDispatchWindowDefaults(h, launch) {
  let A = w(12);
  let { columns } = useTerminalSize();
  let model = useStoreSelector(h, selectSessionModel);
  let effort = useStoreSelector(h, selectSessionEffort);
  let fastMode = useStoreSelector(h, selectSessionFastMode);
  let L;
  if (A[0] !== launch || A[1] !== effort || A[2] !== fastMode || A[3] !== model) {
    L = resolveDispatchDefaults({
      launch,
      window: {
        model,
        effort,
        fastMode,
      },
    });
    A[0] = launch;
    A[1] = effort;
    A[2] = fastMode;
    A[3] = model;
    A[4] = L;
  } else L = A[4];
  let V = L;
  let D = columns - (columns >= 70 ? 11 : 0);
  let U;
  if (A[5] !== V || A[6] !== D) {
    let cwd = getLogoDisplayData().cwd;
    U = !!cwd && bunStringWidth(formatDispatchDefaultsLabel(V)) + 3 + bunStringWidth(cwd) > D;
    A[5] = V;
    A[6] = D;
    A[7] = U;
  } else U = A[7];
  let pathOwnRow = U;
  let K;
  if (A[8] !== V || A[9] !== pathOwnRow || A[10] !== D) {
    K = {
      newSession: V,
      width: D,
      pathOwnRow,
    };
    A[8] = V;
    A[9] = pathOwnRow;
    A[10] = D;
    A[11] = K;
  } else K = A[11];
  return K;
}
//@ chunk-93kwxas0.js:102976-103108 placement
/**
 * “New sessions: 模型 · effort · ultracode” 标签。
 */
function formatDispatchDefaultsLabel(h) {
  let E = h.effort ? ` \xB7 ${h.effort} effort` : "";
  return `New sessions: ${h.model}${E}${h.ultracode ? " \xB7 ultracode" : ""}`;
}
//@ chunk-93kwxas0.js:103108-103288 placement
/**
 * 按可用宽度依次尝试完整/缩短的默认值标签，都放不下时截断模型名。
 */
function fitDispatchDefaultsLabel(newSession, width) {
  let k = newSession.effort ? ` \xB7 ${newSession.effort} effort` : "";
  let C = newSession.ultracode ? " \xB7 ultracode" : "";
  return (
    [formatDispatchDefaultsLabel(newSession), newSession.model + k + C, newSession.model + C].find(
      (T) => bunStringWidth(T) <= width,
    ) ?? truncateToWidth(newSession.model, Math.max(width, 1))
  );
}
//@ chunk-93kwxas0.js:103288-103292 placement
init_react_production();
//@ chunk-93kwxas0.js:103292-103296 placement
init_react_production();
//@ chunk-93kwxas0.js:103329-103359 placement
function isNotFrameRow(rt) {
  return !isFrameRow(rt);
}
//@ chunk-93kwxas0.js:103359-103400 placement
function hasColor(Qe) {
  return Qe.color !== undefined;
}
//@ chunk-93kwxas0.js:103400-103430 placement
var RESERVED_NAME_SUFFIX_WIDTH = bunStringWidth(" (reserved name)");
//@ chunk-93kwxas0.js:103430-103848 placement
/**
 * 在文本中绘制光标（反显字符）。
 */
function renderCursorText(draft, cursor, k, C = false) {
  if (C && draft) {
    let children = truncateStartToWidth(draft, Math.max(k - 1, 1));
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
  let { length: x, length: T } = draft;
  for (let { segment, index } of getGraphemeSegmenter().segment(draft))
    if (index + segment.length > cursor) {
      x = index;
      T = index + segment.length;
      break;
    }
  let A = draft.slice(x, T) || " ";
  let sliced = draft.slice(T);
  let children = truncateStartToWidth(draft.slice(0, x), k - bunStringWidth(A) - (sliced ? 1 : 0));
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Text, {
        children,
      }),
      jsxProd_default(Text, {
        inverse: true,
        children: A,
      }),
      jsxProd_default(Text, {
        children: sliced,
      }),
    ],
  });
}
//@ chunk-93kwxas0.js:103848-109675 placement
/**
 * Agents 视图中一个会话（job）行：状态、详情、子行、重命名/分组/删除状态。
 */
function FleetJobRow(props) {
  let je = w(67);
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
  let se = terminalOutcome(job.state.state);
  let ne = se && job.state.tempo !== "active" ? deleteRefused : undefined;
  let ae = cols.detail - bunStringWidth("group: ") - RESERVED_NAME_SUFFIX_WIDTH >= 24;
  let me = activityVerb(job.activity, job.state.tempo, status, se);
  let { color, dim } = me;
  let Oe = status === "busy" ? color : pickHighestPriorityColor(color, childRows);
  let De = Oe === color && dim;
  let we =
    attaching === "armed"
      ? undefined
      : deleteArmed?.justKilled
        ? BULLET_OPERATOR
        : attaching
          ? undefined
          : jobRowGlyph(job.state, se, status);
  let Re = job.state.output?.result;
  let st;
  if (je[0] !== Re || je[1] !== job.state) {
    st = Re && !returnFalse_2(job.state) ? toOpenableUrl(Re) : null;
    je[0] = Re;
    je[1] = job.state;
    je[2] = st;
  } else st = je[2];
  let mt = st;
  let Ye = mt ? undefined : Re;
  let Lt = se !== "success" ? logTail || undefined : undefined;
  let dt =
    isOrigin && isFocused
      ? job.state.tempo === "blocked"
        ? job.state.needs
        : se === "failure"
          ? job.state.detail
          : undefined
      : undefined;
  let Dt;
  if (je[3] !== job.state.detail) {
    Dt = isTerminalDetail(job.state.detail);
    je[3] = job.state.detail;
    je[4] = Dt;
  } else Dt = je[4];
  let eo = Dt;
  let detail =
    isOrigin && job.state.tempo === "blocked" && job.state.needs === IDLE_NEEDS && job.state.detail && !eo
      ? job.state.detail
      : undefined;
  let ke =
    isOrigin && isFocused
      ? dt
        ? dt === IDLE_NEEDS
          ? detail
            ? jobPreviewText(job.state, detail)
            : basename(job.state.cwd) || job.state.cwd
          : jobPreviewText(job.state, dt)
        : jobPreviewText(job.state, job.state.detail ?? "")
      : se === "success"
        ? jobPreviewText(job.state, Ye || job.state.detail)
        : jobPreviewText(
            job.state,
            detail ||
              (!isOrigin &&
                isFocused &&
                job.state.tempo === "blocked" &&
                job.state.needs === IDLE_NEEDS &&
                "space to send it a prompt") ||
              (job.state.tempo === "blocked" && job.state.needs) ||
              (!eo && job.state.detail) ||
              "",
          ) ||
          (job.state.tempo === "active" && stripJobPreviewText(Lt ?? "")) ||
          stripJobPreviewText(job.state.detail);
  let Ge;
  if (je[5] !== isOrigin || je[6] !== job.state) {
    Ge = getJobTitle(job.state, isOrigin);
    je[5] = isOrigin;
    je[6] = job.state;
    je[7] = Ge;
  } else Ge = je[7];
  let yt = Ge;
  let Bt = isAgentColorName(job.state.color) ? AGENT_COLOR_TO_THEME_COLOR[job.state.color] : undefined;
  let autoTitle = useAutoTitle(yt, !!job.state.name);
  let filtered = childRows.filter(isFrameRow);
  let filtered_2 = childRows.filter(isNotFrameRow);
  let Ot = filtered_2.find(hasColor) ?? filtered_2.at(-1) ?? filtered.at(-1);
  let Yt = isFocused ? "selected, " : "";
  let Ue = attaching
    ? `${Yt}opening:`
    : deleteArmed?.justKilled
      ? `${Yt}stopped:`
      : Oe !== color
        ? `${Yt}needs attention:`
        : jobRowAriaLabel(job.activity, job.state.tempo, status, se, isFocused);
  const Qt = Box;
  const width = cols.label + 2;
  const dimColor = !isFocused && !isOrigin;
  const dimColor_2 = De || (Oe === undefined && !isFocused);
  let children;
  if (je[8] !== we) {
    children = we ?? jsxProd_default(useFleetSpinnerFrame, {});
    je[8] = we;
    je[9] = children;
  } else children = je[9];
  let Vt;
  if (je[10] !== Oe || je[11] !== Ue || je[12] !== dimColor_2 || je[13] !== children) {
    Vt = jsxProd_default(Text, {
      "aria-label": Ue,
      color: Oe,
      dimColor: dimColor_2,
      children,
    });
    je[10] = Oe;
    je[11] = Ue;
    je[12] = dimColor_2;
    je[13] = children;
    je[14] = Vt;
  } else Vt = je[14];
  let children_2;
  if (
    je[15] !== cols.label ||
    je[16] !== mt ||
    je[17] !== isFocused ||
    je[18] !== isOrigin ||
    je[19] !== yt ||
    je[20] !== renaming ||
    je[21] !== autoTitle ||
    je[22] !== Bt
  ) {
    children_2 =
      Bt && !renaming
        ? jsxProd_default(TagTabs, {
            color: Bt,
            bold: isFocused,
            children: mt
              ? jsxProd_default(Link, {
                  url: mt,
                  children: yt,
                })
              : yt,
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
            : mt
              ? jsxProd_default(Link, {
                  url: mt,
                  children: yt,
                })
              : yt;
    je[15] = cols.label;
    je[16] = mt;
    je[17] = isFocused;
    je[18] = isOrigin;
    je[19] = yt;
    je[20] = renaming;
    je[21] = autoTitle;
    je[22] = Bt;
    je[23] = children_2;
  } else children_2 = je[23];
  let gt;
  if (je[24] !== isOrigin || je[25] !== children_2) {
    gt = jsxProd_default(Text, {
      bold: isOrigin,
      children: children_2,
    });
    je[24] = isOrigin;
    je[25] = children_2;
    je[26] = gt;
  } else gt = je[26];
  let children_3;
  if (je[27] !== focusFg || je[28] !== gt || je[29] !== dimColor || je[30] !== Vt) {
    children_3 = jsxProd_default_2(Text, {
      color: focusFg,
      dimColor,
      wrap: "truncate",
      children: [Vt, " ", gt],
    });
    je[27] = focusFg;
    je[28] = gt;
    je[29] = dimColor;
    je[30] = Vt;
    je[31] = children_3;
  } else children_3 = je[31];
  let $e;
  if (je[32] !== children_3 || je[33] !== width) {
    $e = jsxProd_default(Box, {
      width,
      flexShrink: 0,
      children: children_3,
    });
    je[32] = children_3;
    je[33] = width;
    je[34] = $e;
  } else $e = je[34];
  let ht;
  if (
    je[35] !== attaching ||
    je[36] !== cols.detail ||
    je[37] !== deleteArmed ||
    je[38] !== ne ||
    je[39] !== groupEditing ||
    je[40] !== ae ||
    je[41] !== heldInTerminal ||
    je[42] !== ke ||
    je[43] !== showVerb ||
    je[44] !== me
  ) {
    ht = groupEditing
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
              Math.max(cols.detail - bunStringWidth("group: ") - (ae ? RESERVED_NAME_SUFFIX_WIDTH : 0), 8),
              groupEditing.selected,
            ),
            groupEditing.reserved
              ? jsxProd_default(Text, {
                  color: "error",
                  children: " (reserved name)",
                })
              : !ae
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
                  ? "stopped \xB7 ctrl+x again to delete"
                  : "ctrl+x again to delete",
            })
          : ne
            ? jsxProd_default_2(Text, {
                wrap: "truncate",
                children: [
                  jsxProd_default(Text, {
                    color: "error",
                    children: "not deleted",
                  }),
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 ", ne],
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
                            color: me.color,
                            dimColor: me.dim,
                            children: me.word,
                          }),
                          ke &&
                            jsxProd_default(Text, {
                              dimColor: true,
                              children: ke,
                            }),
                        ],
                      }),
                    })
                  : jsxProd_default(Text, {
                      dimColor: true,
                      wrap: "truncate",
                      children: ke,
                    });
    je[35] = attaching;
    je[36] = cols.detail;
    je[37] = deleteArmed;
    je[38] = ne;
    je[39] = groupEditing;
    je[40] = ae;
    je[41] = heldInTerminal;
    je[42] = ke;
    je[43] = showVerb;
    je[44] = me;
    je[45] = ht;
  } else ht = je[45];
  let jt;
  if (
    je[46] !== attaching ||
    je[47] !== deleteArmed ||
    je[48] !== ne ||
    je[49] !== groupEditing ||
    je[50] !== heldInTerminal ||
    je[51] !== loopKickCount
  ) {
    jt =
      loopKickCount && !groupEditing && !deleteArmed && !ne && !attaching && !heldInTerminal
        ? jsxProd_default(Box, {
            flexShrink: 0,
            paddingLeft: 1,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: ["\xD7", loopKickCount],
            }),
          })
        : null;
    je[46] = attaching;
    je[47] = deleteArmed;
    je[48] = ne;
    je[49] = groupEditing;
    je[50] = heldInTerminal;
    je[51] = loopKickCount;
    je[52] = jt;
  } else jt = je[52];
  let We;
  if (je[53] !== ht || je[54] !== jt) {
    We = jsxProd_default_2(Box, {
      flexGrow: 1,
      width: 0,
      paddingLeft: 2,
      children: [ht, jt],
    });
    je[53] = ht;
    je[54] = jt;
    je[55] = We;
  } else We = je[55];
  const Jt =
    cols.artifact > 0
      ? jsxProd_default(Box, {
          width: cols.artifact + 2,
          flexShrink: 0,
          paddingLeft: 2,
          justifyContent: "flex-end",
          children:
            filtered_2.length > 1
              ? jsxProd_default_2(Text, {
                  color: Ot?.color,
                  dimColor: !isFocused || !Ot?.color,
                  children: [filtered_2.length, " PRs"],
                })
              : filtered_2.length === 1
                ? Ot?.prNumber !== undefined
                  ? jsxProd_default(PrBadge, {
                      number: Ot.prNumber,
                      url: Ot.row.href,
                      kind: prKindOf(Ot.row),
                      color: Ot.color,
                      dimColor: !isFocused,
                      underline: false,
                      hidePrefix: true,
                    })
                  : jsxProd_default(Text, {
                      color: focusFg,
                      dimColor: !isFocused,
                      children: "PR",
                    })
                : Ot
                  ? jsxProd_default(Link, {
                      url: Ot.row.href,
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
  if (je[56] !== age) {
    children_4 = jsxProd_default(Text, {
      dimColor: true,
      children: age,
    });
    je[56] = age;
    je[57] = children_4;
  } else children_4 = je[57];
  let ct;
  if (je[58] !== width_2 || je[59] !== children_4) {
    ct = jsxProd_default(Box, {
      width: width_2,
      flexShrink: 0,
      paddingLeft: 2,
      justifyContent: "flex-end",
      children: children_4,
    });
    je[58] = width_2;
    je[59] = children_4;
    je[60] = ct;
  } else ct = je[60];
  let vt;
  if (je[61] !== Qt || je[62] !== $e || je[63] !== We || je[64] !== Jt || je[65] !== ct) {
    vt = jsxProd_default_2(Qt, {
      children: [$e, We, Jt, ct],
    });
    je[61] = Qt;
    je[62] = $e;
    je[63] = We;
    je[64] = Jt;
    je[65] = ct;
    je[66] = vt;
  } else vt = je[66];
  return vt;
}
//@ chunk-93kwxas0.js:109675-109684 placement
var SESSION_ROW_INDENT = 3;
//@ chunk-93kwxas0.js:109684-111065 placement
/**
 * 会话行的单行绘制（图标、标签、时长、令牌、状态、展开）。
 */
function FleetRowLine(props) {
  let ae = w(27);
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
  const ne = isFocused ? "\u276F" : " ";
  let me;
  if (
    ae[0] !== focusBg ||
    ae[1] !== icon ||
    ae[2] !== iconColor ||
    ae[3] !== srLabel ||
    ae[4] !== dimColor ||
    ae[5] !== ne
  ) {
    me = jsxProd_default_2(Text, {
      "aria-label": srLabel,
      color: iconColor,
      dimColor,
      backgroundColor: focusBg,
      children: [ne, icon, "  "],
    });
    ae[0] = focusBg;
    ae[1] = icon;
    ae[2] = iconColor;
    ae[3] = srLabel;
    ae[4] = dimColor;
    ae[5] = ne;
    ae[6] = me;
  } else me = ae[6];
  let Je;
  if (
    ae[7] !== focusFg ||
    ae[8] !== isFocused ||
    ae[9] !== isOrigin ||
    ae[10] !== label ||
    ae[11] !== renameWidth ||
    ae[12] !== renaming
  ) {
    Je = renaming
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
    ae[7] = focusFg;
    ae[8] = isFocused;
    ae[9] = isOrigin;
    ae[10] = label;
    ae[11] = renameWidth;
    ae[12] = renaming;
    ae[13] = Je;
  } else Je = ae[13];
  let le;
  if (ae[14] !== me || ae[15] !== Je) {
    le = jsxProd_default_2(Box, {
      children: [me, Je],
    });
    ae[14] = me;
    ae[15] = Je;
    ae[16] = le;
  } else le = ae[16];
  let Oe;
  if (
    ae[17] !== age ||
    ae[18] !== expanded ||
    ae[19] !== extra ||
    ae[20] !== refusal ||
    ae[21] !== state ||
    ae[22] !== tokens
  ) {
    Oe =
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
    ae[17] = age;
    ae[18] = expanded;
    ae[19] = extra;
    ae[20] = refusal;
    ae[21] = state;
    ae[22] = tokens;
    ae[23] = Oe;
  } else Oe = ae[23];
  let De;
  if (ae[24] !== le || ae[25] !== Oe) {
    De = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [le, Oe],
    });
    ae[24] = le;
    ae[25] = Oe;
    ae[26] = De;
  } else De = ae[26];
  return De;
}
//@ chunk-93kwxas0.js:111065-111097 placement
function selectEditorQuery(lu) {
  return lu.query;
}
//@ chunk-93kwxas0.js:111097-111131 placement
function selectHistoryLoading(cu) {
  return cu.loading;
}
//@ chunk-93kwxas0.js:111131-111154 placement
function returnFalse() {
  return false;
}
//@ chunk-93kwxas0.js:111154-111169 placement
function noopEffect() {}
//@ chunk-93kwxas0.js:111169-111208 placement
function isJobRow(pu) {
  return pu.kind === "job";
}
//@ chunk-93kwxas0.js:111208-123201 placement
/**
 * Agents 视图的滚动列表（分组头、选中、过滤、旧会话行）。
 */
function FleetRowList(props) {
  let Nt = w(117);
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
  let oo;
  if (Nt[0] !== roster) {
    oo = (Ce) => roster.liveStatus(Ce);
    Nt[0] = roster;
    Nt[1] = oo;
  } else oo = Nt[1];
  let Ke = oo;
  let setError = editor.setError;
  let Mt;
  if (Nt[2] !== groupMode) {
    Mt = (so) => groupCollapseKey(groupMode, so);
    Nt[2] = groupMode;
    Nt[3] = Mt;
  } else Mt = Nt[3];
  let Jo = Mt;
  let vo;
  if (Nt[4] !== groupMode) {
    vo = (zo) => `header:${groupMode}:${zo}`;
    Nt[4] = groupMode;
    Nt[5] = vo;
  } else vo = Nt[5];
  let no = vo;
  let _e = columns >= 120 ? 1 : 0;
  let It = R(null);
  let go =
    filtered.length === 0 && !!storeSelector && queryIsFilter && (simpleView || earlierVisible.length === 0);
  R(null);
  let No = returnFalse;
  let Qo = R(null);
  let Po;
  if (Nt[6] !== suggestions) {
    Po = suggestions.join(`
`);
    Nt[6] = suggestions;
    Nt[7] = Po;
  } else Po = Nt[7];
  let xe = Po;
  let qt;
  if (
    Nt[8] !== focusIsFromHover ||
    Nt[9] !== focusedIdx ||
    Nt[10] !== rows_2 ||
    Nt[11] !== scrollRef ||
    Nt[12] !== selection
  ) {
    qt = () => {
      let it = selection.takeRevealAtTop(focusedIdx);
      if (!It.current || focusIsFromHover) {
        return;
      }
      if (focusedIdx === 0) {
        scrollRef.current?.scrollTo(0);
        return;
      }
      if (No()) {
        return;
      }
      let io = rows_2[focusedIdx]?.kind === "header" ? -1 : 0;
      scrollRef.current?.scrollToElement(It.current, io, {
        block: it ? "start" : "nearest",
      });
    };
    Nt[8] = focusIsFromHover;
    Nt[9] = focusedIdx;
    Nt[10] = rows_2;
    Nt[11] = scrollRef;
    Nt[12] = selection;
    Nt[13] = qt;
  } else qt = Nt[13];
  let bo;
  if (Nt[14] !== focusIsFromHover || Nt[15] !== focusedIdx || Nt[16] !== rows) {
    bo = [focusedIdx, focusIsFromHover, rows];
    Nt[14] = focusIsFromHover;
    Nt[15] = focusedIdx;
    Nt[16] = rows;
    Nt[17] = bo;
  } else bo = Nt[17];
  zt(qt, bo);
  let wo;
  if (Nt[18] !== endsWithOlderSessionsLine) {
    wo = [endsWithOlderSessionsLine];
    Nt[18] = endsWithOlderSessionsLine;
    Nt[19] = wo;
  } else wo = Nt[19];
  zt(noopEffect, wo);
  let Ho = R(0);
  let zr;
  if (Nt[20] !== helpOpen || Nt[21] !== scrollRef) {
    zr = () => {
      if (!helpOpen) Ho.current = scrollRef.current?.getViewportHeight() ?? 0;
    };
    Nt[20] = helpOpen;
    Nt[21] = scrollRef;
    Nt[22] = zr;
  } else zr = Nt[22];
  zt(zr);
  let Dn;
  if (Nt[23] !== helpOpen || Nt[24] !== scrollRef) {
    Dn = () => {
      let ir = scrollRef.current;
      let computedTop = It.current?.yogaNode?.getComputedTop();
      if (!helpOpen || !ir || !It.current || computedTop === undefined) {
        return;
      }
      let Qr = computedTop - ir.getScrollTop();
      if (Qr >= 0 && Qr < Ho.current)
        ir.scrollToElement(It.current, 0, {
          block: "nearest",
        });
    };
    Nt[23] = helpOpen;
    Nt[24] = scrollRef;
    Nt[25] = Dn;
  } else Dn = Nt[25];
  let Xr;
  if (Nt[26] !== helpOpen) {
    Xr = [helpOpen];
    Nt[26] = helpOpen;
    Nt[27] = Xr;
  } else Xr = Nt[27];
  zt(Dn, Xr);
  let qi;
  if (Nt[28] !== panelOpen || Nt[29] !== scrollRef) {
    qi = () => {
      if (panelOpen && Qo.current)
        scrollRef.current?.scrollToElement(Qo.current, 0, {
          block: "nearest",
        });
    };
    Nt[28] = panelOpen;
    Nt[29] = scrollRef;
    Nt[30] = qi;
  } else qi = Nt[30];
  let vn;
  if (Nt[31] !== panelOpen || Nt[32] !== groupPickIdx || Nt[33] !== xe) {
    vn = [panelOpen, xe, groupPickIdx];
    Nt[31] = panelOpen;
    Nt[32] = groupPickIdx;
    Nt[33] = xe;
    Nt[34] = vn;
  } else vn = Nt[34];
  zt(qi, vn);
  let Zr;
  if (
    Nt[35] !== cols ||
    Nt[36] !== panelOpen ||
    Nt[37] !== groupPickIdx ||
    Nt[38] !== suggestions ||
    Nt[39] !== _e
  ) {
    Zr = panelOpen
      ? (() => {
          let max = Math.max(0, Math.min(groupPickIdx - 1, suggestions.length - 4));
          let sliced = suggestions.slice(max, max + 4);
          let fo = suggestions.length - max - sliced.length;
          let paddingLeft = _e + cols.label + 4 + 7 - 2;
          return jsxProd_default_2(Box, {
            ref: Qo,
            flexDirection: "column",
            paddingLeft,
            children: [
              max > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\u2026 ", max, " above"],
                }),
              sliced.map((ei, iu) => {
                let Yi = max + iu === groupPickIdx;
                return jsxProd_default_2(
                  Text,
                  {
                    color: Yi ? "suggestion" : undefined,
                    dimColor: !Yi,
                    wrap: "truncate",
                    children: [Yi ? figures_default.pointer : " ", " ", ei],
                  },
                  ei,
                );
              }),
              fo > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "\u2026 ", fo, " more"],
                }),
            ],
          });
        })()
      : null;
    Nt[35] = cols;
    Nt[36] = panelOpen;
    Nt[37] = groupPickIdx;
    Nt[38] = suggestions;
    Nt[39] = _e;
    Nt[40] = Zr;
  } else Zr = Nt[40];
  let ti = Zr;
  let sr;
  if (
    Nt[41] !== activeTab ||
    Nt[42] !== ageNow ||
    Nt[43] !== attachingJobId ||
    Nt[44] !== byGroup ||
    Nt[45] !== byState ||
    Nt[46] !== Jo ||
    Nt[47] !== collapsed ||
    Nt[48] !== cols ||
    Nt[49] !== columns ||
    Nt[50] !== cwdFilter ||
    Nt[51] !== deleteRefusals ||
    Nt[52] !== dispatchTargetGroup ||
    Nt[53] !== storeSelector_2 ||
    Nt[54] !== earlierVisible ||
    Nt[55] !== focusedGroup ||
    Nt[56] !== focusedIdx ||
    Nt[57] !== groupCounts ||
    Nt[58] !== cursor_2 ||
    Nt[59] !== draft_2 ||
    Nt[60] !== isNew ||
    Nt[61] !== matchesExisting ||
    Nt[62] !== reserved ||
    Nt[63] !== groupEdit ||
    Nt[64] !== groupPickIdx ||
    Nt[65] !== groupPristine ||
    Nt[66] !== ti ||
    Nt[67] !== suggestions ||
    Nt[68] !== hasComposedDispatch ||
    Nt[69] !== hasCredentials ||
    Nt[70] !== hasMultipleOrigins ||
    Nt[71] !== no ||
    Nt[72] !== hoverFocusIdx ||
    Nt[73] !== initialJobId ||
    Nt[74] !== isOnboarding ||
    Nt[75] !== Ke ||
    Nt[76] !== logTails ||
    Nt[77] !== loopJobIds ||
    Nt[78] !== loopKicks ||
    Nt[79] !== mountAt ||
    Nt[80] !== newSessionOpening ||
    Nt[81] !== openEarlier ||
    Nt[82] !== openNewSessionRow ||
    Nt[83] !== openOrRespawn ||
    Nt[84] !== pending ||
    Nt[85] !== prStatuses ||
    Nt[86] !== previewOpen ||
    Nt[87] !== storeSelector ||
    Nt[88] !== queryIsFilter ||
    Nt[89] !== cursor ||
    Nt[90] !== draft ||
    Nt[91] !== jobId ||
    Nt[92] !== roster ||
    Nt[93] !== _e ||
    Nt[94] !== rows_2 ||
    Nt[95] !== selection ||
    Nt[96] !== setError ||
    Nt[97] !== simpleBuilt ||
    Nt[98] !== simpleView ||
    Nt[99] !== toggleCollapse ||
    Nt[100] !== warmingJobIds
  ) {
    sr = rows_2.map((Ct, cn) => {
      let So = cn === focusedIdx;
      let zi = isOnboarding && Ct.kind === "header";
      let pn =
        Ct.kind === "header"
          ? hasComposedDispatch
            ? Ct.group === dispatchTargetGroup
            : So && !zi
          : !hasComposedDispatch && So;
      let jo =
        !hasComposedDispatch && So && cn !== hoverFocusIdx && !zi ? "userMessageBackground" : undefined;
      let Vn = jo && "text";
      let Oa = (Ta) => {
        if (previewOpen && Ct.kind !== "job") {
          return;
        }
        if (cn === focusedIdx) {
          if (!Ta) selection.setHoverFocusIdx(null);
          return;
        }
        setError(null);
        if (Ta) selection.hoverTo(cn, Ct);
        else selection.navigateTo(cn, Ct);
      };
      let Cn = () => Oa(true);
      let fn = () => Oa(false);
      if (Ct.kind === "header") {
        let su = !hasComposedDispatch && hasMultipleOrigins && Ct.group === focusedGroup;
        let children = groupCounts.get(Ct.group) ?? 0;
        let xa = collapsed.has(Jo(Ct.group));
        return jsxProd_default_2(
          Box,
          {
            ref: So ? It : undefined,
            marginTop: cn > 0 ? 1 : 0,
            flexDirection: "column",
            backgroundColor: jo,
            onMouseEnter: storeSelector || previewOpen || isOnboarding ? undefined : Cn,
            onClick: isOnboarding
              ? undefined
              : () => {
                  fn();
                  selection.followOrigin = Ct.group;
                  selection.followId = null;
                  if (!queryIsFilter) toggleCollapse(Ct.group);
                },
            children: [
              groupEdit?.kind === "rename" && groupEdit.from === Ct.group
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
                    bold: su || pn,
                    color: Vn,
                    dimColor: !pn,
                    children: [
                      Ct.group === "pinned"
                        ? "Pinned"
                        : Ct.group === EARLIER
                          ? "Past"
                          : byState
                            ? FLEET_BUCKET_LABELS[Ct.group]
                            : byGroup
                              ? Ct.group === UNGROUPED
                                ? "Ungrouped"
                                : truncate(Ct.group, Math.max(columns - 10, 10))
                              : truncatePathForDisplay(
                                  activeTab === "remote"
                                    ? sanitizeAttentionText(shortenPath(Ct.group))
                                    : shortenPath(Ct.group),
                                  Math.max(columns - 10, 10),
                                ),
                      xa &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            " ",
                            jsxProd_default(Text, {
                              dimColor: true,
                              children,
                            }),
                          ],
                        }),
                      (byState ? Ct.group === "done" : Ct.group === EARLIER) &&
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
                !(Ct.group === "done" && earlierVisible.length > 0) &&
                jsxProd_default(Box, {
                  paddingLeft: 1,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: FLEET_BUCKET_HINTS[Ct.group],
                  }),
                }),
            ],
          },
          `h:${Ct.group}`,
        );
      }
      if (Ct.kind === "fold") {
        return jsxProd_default(
          Box,
          {
            ref: So ? It : undefined,
            marginTop: simpleView && isDifferentDoneGroup(rows_2[cn - 1], Ct) ? 1 : 0,
            paddingLeft: _e,
            backgroundColor: jo,
            onMouseEnter: storeSelector || previewOpen ? undefined : Cn,
            onClick: () => {
              fn();
              selection.expandCap(Ct.group);
              logEvent("tengu_fleetview_fold_expand", {
                hidden_count: Ct.hidden,
                ms_since_mount: Date.now() - mountAt,
                via_click: true,
              });
            },
            children: jsxProd_default_2(Text, {
              color: Vn,
              dimColor: !pn,
              "aria-label": `${So ? "selected, " : ""}${Ct.hidden} more finished sessions folded:`,
              children: [
                simpleView ? (So ? "\u276F" : " ") + repeatString(" ", SESSION_ROW_INDENT - 1) : "",
                Ct.group === SIMPLE_FINISHED
                  ? `\u2026 show all (${Ct.hidden} more${simpleBuilt !== null && simpleBuilt.doneFoldHiddenFailed > 0 ? ` \xB7 ${simpleBuilt.doneFoldHiddenFailed} failed` : ""})`
                  : `\u2026 ${Ct.hidden} more`,
              ],
            }),
          },
          `f:${Ct.group}`,
        );
      }
      if (Ct.kind === "newsession") {
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                ref: So ? It : undefined,
                paddingLeft: _e,
                backgroundColor: jo,
                onMouseEnter: storeSelector || previewOpen ? undefined : Cn,
                onClick: () => {
                  fn();
                  openNewSessionRow(Ct.origin);
                },
                children: [
                  jsxProd_default_2(Text, {
                    color: Vn ?? "suggestion",
                    "aria-label": So ? "selected, new session:" : undefined,
                    children: [
                      So ? "\u276F" : " ",
                      "+  ",
                      jsxProd_default(Text, {
                        underline: So,
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
                  paddingLeft: _e + SESSION_ROW_INDENT,
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
      if (Ct.kind === "earlier") {
        let entry = Ct.entry;
        return jsxProd_default_2(
          Box,
          {
            ref: So ? It : undefined,
            width: "100%",
            paddingLeft: _e,
            backgroundColor: jo,
            onMouseEnter: storeSelector || previewOpen ? undefined : Cn,
            onClick: () => {
              fn();
              openEarlier(entry, "section");
            },
            children: [
              jsxProd_default(Box, {
                flexGrow: 1,
                flexShrink: 1,
                overflow: "hidden",
                children: jsxProd_default_2(Text, {
                  color: Vn,
                  dimColor: !pn,
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
      let job = Ct.job;
      if (simpleView) {
        let ri = terminalOutcome(job.state.state);
        let ar = Ke(job);
        let Xo = jobActivityDisplay(job, Ke);
        let du =
          (ri === "stopped" ? "\u23F9" : ri === "failure" ? "\u2717" : null) ??
          jobRowGlyph(job.state, ri, ar);
        let ii = job.id === initialJobId;
        return jsxProd_default(
          Box,
          {
            ref: So ? It : undefined,
            flexDirection: "column",
            width: "100%",
            paddingLeft: _e,
            marginTop: isDifferentDoneGroup(rows_2[cn - 1], Ct) ? 1 : 0,
            backgroundColor: jo,
            onMouseEnter: storeSelector || previewOpen ? undefined : Cn,
            onClick: (si) => {
              if (si.hyperlinkUrl && !returnFalse_2(job.state)) {
                return si.allowDefault();
              }
              if (si.isWindowActivation) {
                return si.dropAsStray();
              }
              fn();
              openOrRespawn(job);
            },
            children: jsxProd_default(FleetRowLine, {
              icon: du ?? jsxProd_default(useFleetSpinnerFrame, {}),
              iconColor: Xo.color,
              iconDim: Xo.dim,
              label: getJobTitle(job.state, ii, true),
              renameWidth: Math.max(12, columns - _e - SESSION_ROW_INDENT),
              renaming:
                jobId === job.id
                  ? {
                      draft,
                      cursor,
                    }
                  : undefined,
              isOrigin: ii,
              isFocused: So,
              focusFg: Vn,
              focusBg: jo,
              age: jobAgeLabel(job, loopJobIds, loopKicks, ageNow),
              tokens: jobTokenLabel(job, Xo),
              state: Xo,
              extra: jobNeedsLine(job, Xo, ar, columns),
              expanded: Boolean(job.state.pinned) || jobBucket_2(job.state, ar) === "needs",
              refusal: deleteRefusals.get(job.id)?.notice,
              srLabel: jobRowAriaLabel(job.activity, job.state.tempo, ar, ri, So, job.state.pinned === true),
            }),
          },
          job.id,
        );
      }
      let Fa = groupEdit?.kind === "assign" && groupEdit.jobId === job.id;
      let Xi = jsxProd_default(
        Box,
        {
          ref: So ? It : undefined,
          width: "100%",
          paddingLeft: _e,
          backgroundColor: jo,
          onMouseEnter: storeSelector || previewOpen ? undefined : Cn,
          onClick: (li) => {
            if (li.hyperlinkUrl && !returnFalse_2(job.state)) {
              return li.allowDefault();
            }
            if (li.isWindowActivation) {
              return li.dropAsStray();
            }
            fn();
            openOrRespawn(job);
          },
          children: jsxProd_default(FleetJobRow, {
            job,
            isFocused: So,
            focusFg: Vn,
            isOrigin: job.id === initialJobId,
            logTail: logTails[job.id],
            cols,
            status: Ke(job),
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
            groupEditing: Fa
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
              pending && (pending.id === job.id || pending.id === no(Ct.group))
                ? {
                    justKilled: pending.justKilled,
                    ungroup:
                      byGroup &&
                      pending.id === no(Ct.group) &&
                      Ct.group !== "pinned" &&
                      Ct.group !== UNGROUPED &&
                      Ct.group !== EARLIER,
                  }
                : undefined,
            deleteRefused: deleteRefusals.get(job.id)?.notice,
            attaching: attachingJobId === job.id ? "armed" : warmingJobIds.has(job.id) ? "warming" : false,
          }),
        },
        job.id,
      );
      return jsxProd_default_2(
        Kc,
        {
          children: [Xi, Fa && ti],
        },
        job.id,
      );
    });
    Nt[41] = activeTab;
    Nt[42] = ageNow;
    Nt[43] = attachingJobId;
    Nt[44] = byGroup;
    Nt[45] = byState;
    Nt[46] = Jo;
    Nt[47] = collapsed;
    Nt[48] = cols;
    Nt[49] = columns;
    Nt[50] = cwdFilter;
    Nt[51] = deleteRefusals;
    Nt[52] = dispatchTargetGroup;
    Nt[53] = storeSelector_2;
    Nt[54] = earlierVisible;
    Nt[55] = focusedGroup;
    Nt[56] = focusedIdx;
    Nt[57] = groupCounts;
    Nt[58] = cursor_2;
    Nt[59] = draft_2;
    Nt[60] = isNew;
    Nt[61] = matchesExisting;
    Nt[62] = reserved;
    Nt[63] = groupEdit;
    Nt[64] = groupPickIdx;
    Nt[65] = groupPristine;
    Nt[66] = ti;
    Nt[67] = suggestions;
    Nt[68] = hasComposedDispatch;
    Nt[69] = hasCredentials;
    Nt[70] = hasMultipleOrigins;
    Nt[71] = no;
    Nt[72] = hoverFocusIdx;
    Nt[73] = initialJobId;
    Nt[74] = isOnboarding;
    Nt[75] = Ke;
    Nt[76] = logTails;
    Nt[77] = loopJobIds;
    Nt[78] = loopKicks;
    Nt[79] = mountAt;
    Nt[80] = newSessionOpening;
    Nt[81] = openEarlier;
    Nt[82] = openNewSessionRow;
    Nt[83] = openOrRespawn;
    Nt[84] = pending;
    Nt[85] = prStatuses;
    Nt[86] = previewOpen;
    Nt[87] = storeSelector;
    Nt[88] = queryIsFilter;
    Nt[89] = cursor;
    Nt[90] = draft;
    Nt[91] = jobId;
    Nt[92] = roster;
    Nt[93] = _e;
    Nt[94] = rows_2;
    Nt[95] = selection;
    Nt[96] = setError;
    Nt[97] = simpleBuilt;
    Nt[98] = simpleView;
    Nt[99] = toggleCollapse;
    Nt[100] = warmingJobIds;
    Nt[101] = sr;
  } else sr = Nt[101];
  let Wo;
  if (Nt[102] !== go) {
    Wo =
      go &&
      true &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "no sessions match",
        }),
      });
    Nt[102] = go;
    Nt[103] = Wo;
  } else Wo = Nt[103];
  let Co;
  if (
    Nt[104] !== activeTab ||
    Nt[105] !== byState ||
    Nt[106] !== cwdFilter ||
    Nt[107] !== storeSelector_2 ||
    Nt[108] !== rows_2 ||
    Nt[109] !== simpleView
  ) {
    Co =
      storeSelector_2 &&
      !simpleView &&
      activeTab !== "remote" &&
      !cwdFilter &&
      !rows_2.some((Zi) => Zi.kind === "header" && Zi.group === (byState ? "done" : EARLIER)) &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 looking for past sessions\u2026",
        }),
      });
    Nt[104] = activeTab;
    Nt[105] = byState;
    Nt[106] = cwdFilter;
    Nt[107] = storeSelector_2;
    Nt[108] = rows_2;
    Nt[109] = simpleView;
    Nt[110] = Co;
  } else Co = Nt[110];
  let Ma;
  if (Nt[111] !== header || Nt[112] !== scrollRef || Nt[113] !== sr || Nt[114] !== Wo || Nt[115] !== Co) {
    Ma = jsxProd_default_2(ScrollBoxDefault, {
      ref: scrollRef,
      flexGrow: 1,
      flexDirection: "column",
      paddingTop: 1,
      stickyScroll: false,
      children: [header, sr, Wo, false, Co],
    });
    Nt[111] = header;
    Nt[112] = scrollRef;
    Nt[113] = sr;
    Nt[114] = Wo;
    Nt[115] = Co;
    Nt[116] = Ma;
  } else Ma = Nt[116];
  return Ma;
}
//@ chunk-93kwxas0.js:123201-123205 placement
init_react_production();
//@ chunk-93kwxas0.js:123205-123244 placement
function selectSessionModel_2(me) {
  return me.sessionModel;
}
//@ chunk-93kwxas0.js:123244-123284 placement
function selectSessionEffort_2(Je) {
  return Je.sessionEffort;
}
//@ chunk-93kwxas0.js:123284-123326 placement
function createLatch() {
  let le = false;
  return () => {
    le = true;
  };
}
//@ chunk-93kwxas0.js:123326-123555 placement
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
//@ chunk-93kwxas0.js:123555-123600 placement
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
