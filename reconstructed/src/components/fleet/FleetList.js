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
import { basename, basename as basename_2, basename as basename_3 } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getLogoDisplayData, truncatePathForDisplay } from "../../utils/logoV2Utils.js";
import { tildify } from "../../utils/path.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { Clawd } from "../LogoV2/Clawd.js";
import { Byline } from "../design-system/Byline.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { xb, Fb, Pb } from "./fleetActions.js";
import { resolveDispatchDefaults } from "./dispatchDefaults.js";
import { truncateToWidth, truncateStartToWidth, truncate, formatDuration } from "../../utils/format.js";
import { j, R, zt, Kc } from "../../../vendor/react/cjs/react.production.js";
import {
  wn,
  activityVerb,
  pickHighestPriorityColor,
  jobRowGlyph,
  getJobTitle,
  useAutoTitle,
  jobRowAriaLabel,
  useFleetSpinnerFrame,
  Ci,
  Sn,
  _i,
  SIMPLE_FINISHED,
  jobActivityDisplay,
  Hd,
  jd,
  jobNeedsLine,
  jobBucket_2,
  formatJobAgeOrEta,
  childFrameRows,
} from "./FleetRow.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { terminalOutcome, IDLE_NEEDS, EARLIER, UNGROUPED } from "../../services/daemon/jobState.js";
import { BULLET_OPERATOR, hf } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Io, Si, mo, stripJobPreviewText, Ao, yi, fd } from "./fleetRows.js";
import { toOpenableUrl } from "./fleetSessions.js";
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import { TagTabs } from "../TagTabs.js";
import { PrBadge } from "../PrBadge.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { sanitizeAttentionText } from "./sessionAttention.js";
import { logEvent } from "../../services/analytics/index.js";
import { repeatString } from "../../utils/stringUtils.js";
import { LI } from "../../ink/components/ScrollBox.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { parseBindings } from "../../keybindings/parser.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";

/**
 * Agents 视图底部的派发输入区（布局、简化视图、派发默认值、当前目录）。
 */
//@ chunk-93kwxas0.js:100082-102493 placement
function FleetComposer(h) {
  let me = w(33),
    {
      editor: editor,
      layout: layout,
      simpleView: simpleView,
      dispatchDefaults: dispatchDefaults,
      targetCwd: targetCwd,
      launcherCwd: launcherCwd,
      canonicalLauncherCwd: canonicalLauncherCwd,
      originJobId: originJobId,
    } = h,
    { columns: columns } = useTerminalSize(),
    {
      compactHeader: compactHeader,
      simpleBuilt: simpleBuilt,
      bandCounts: bandCounts,
      earlierVisible: earlierVisible,
    } = layout,
    { version: version, cwd: cwd } = getLogoDisplayData(),
    {
      newSession: newSession,
      width: width,
      pathOwnRow: pathOwnRow,
    } = useDispatchWindowDefaults(editor, dispatchDefaults),
    ne = !!cwd && targetCwd !== launcherCwd && targetCwd !== canonicalLauncherCwd,
    ae = ne ? tildify(targetCwd) : cwd,
    Je,
    le;
  if (me[0] !== newSession || me[1] !== pathOwnRow || me[2] !== width)
    ((Je = fitDispatchDefaultsLabel(newSession, width)),
      (le = pathOwnRow ? width : width - 3 - bunStringWidth(Je)),
      (me[0] = newSession),
      (me[1] = pathOwnRow),
      (me[2] = width),
      (me[3] = Je),
      (me[4] = le));
  else ((Je = me[3]), (le = me[4]));
  let Oe = le,
    De = truncatePathForDisplay(ae, Math.min(bunStringWidth(ae), Math.max(Oe, 1))),
    we = simpleView && ne,
    Re;
  if (me[5] !== we || me[6] !== De)
    ((Re = De && e(Text, { color: we ? "suggestion" : void 0, dimColor: !we, children: De })),
      (me[5] = we),
      (me[6] = De),
      (me[7] = Re));
  else Re = me[7];
  let je = Re,
    st;
  if (me[8] !== columns || me[9] !== compactHeader)
    ((st = !compactHeader && columns >= 70 && e(Clawd, {})),
      (me[8] = columns),
      (me[9] = compactHeader),
      (me[10] = st));
  else st = me[10];
  let mt;
  if (
    me[11] !== compactHeader ||
    me[12] !== je ||
    me[13] !== Je ||
    me[14] !== pathOwnRow ||
    me[15] !== simpleView ||
    me[16] !== version
  )
    ((mt =
      !compactHeader &&
      r(Fragment, {
        children: [
          simpleView
            ? r(Text, {
                wrap: "truncate",
                children: [
                  e(Text, { bold: !0, children: "Claude Code" }),
                  " ",
                  r(Text, { dimColor: !0, children: ["v", version] }),
                ],
              })
            : r(Text, {
                children: [
                  e(Text, { bold: !0, children: "Claude Code" }),
                  " ",
                  r(Text, { dimColor: !0, children: ["v", version] }),
                ],
              }),
          r(Text, {
            dimColor: !0,
            wrap: "truncate",
            children: [Je, !pathOwnRow && je && " \xB7 ", !pathOwnRow && je],
          }),
          pathOwnRow && je && e(Text, { wrap: "truncate", children: je }),
        ],
      })),
      (me[11] = compactHeader),
      (me[12] = je),
      (me[13] = Je),
      (me[14] = pathOwnRow),
      (me[15] = simpleView),
      (me[16] = version),
      (me[17] = mt));
  else mt = me[17];
  let Ye;
  if (me[18] !== bandCounts || me[19] !== earlierVisible || me[20] !== simpleBuilt)
    ((Ye = simpleBuilt
      ? e(Text, {
          dimColor: !0,
          wrap: "truncate",
          children: r(Byline, {
            children: [
              simpleBuilt.needsCount > 0 && `${simpleBuilt.needsCount} needs you`,
              simpleBuilt.workingCount > 0 && `${simpleBuilt.workingCount} working`,
              simpleBuilt.liveCount - simpleBuilt.workingCount > 0 &&
                `${simpleBuilt.liveCount - simpleBuilt.workingCount} idle`,
              simpleBuilt.runningCount === 0 && "nothing running",
            ],
          }),
        })
      : e(Text, {
          dimColor: !0,
          children: r(Byline, {
            children: [
              `${bandCounts.blocked} awaiting input`,
              `${bandCounts.active} working`,
              `${bandCounts.completed + earlierVisible.length} completed`,
            ],
          }),
        })),
      (me[18] = bandCounts),
      (me[19] = earlierVisible),
      (me[20] = simpleBuilt),
      (me[21] = Ye));
  else Ye = me[21];
  let Lt;
  if (me[22] !== mt || me[23] !== Ye)
    ((Lt = r(Box, { flexDirection: "column", children: [mt, Ye] })),
      (me[22] = mt),
      (me[23] = Ye),
      (me[24] = Lt));
  else Lt = me[24];
  let dt;
  if (me[25] !== st || me[26] !== Lt)
    ((dt = r(Box, { gap: 2, marginBottom: 1, children: [st, Lt] })),
      (me[25] = st),
      (me[26] = Lt),
      (me[27] = dt));
  else dt = me[27];
  let Dt;
  if (me[28] !== originJobId)
    ((Dt =
      originJobId !== void 0 &&
      e(Box, {
        marginBottom: 1,
        children: e(Text, {
          dimColor: !0,
          children:
            "Your conversation moved to the background \u2014 enter opens it \xB7 esc returns to it \xB7 ctrl+c twice quits",
        }),
      })),
      (me[28] = originJobId),
      (me[29] = Dt));
  else Dt = me[29];
  let eo;
  if (me[30] !== dt || me[31] !== Dt)
    ((eo = r(Fragment, { children: [dt, Dt] })), (me[30] = dt), (me[31] = Dt), (me[32] = eo));
  else eo = me[32];
  return eo;
}
/**
 * 计算派发窗口（模型、effort、快速模式）对新会话的有效默认值。
 */
//@ chunk-93kwxas0.js:102493-102976 placement
function useDispatchWindowDefaults(h, E) {
  let A = w(12),
    { columns: columns } = useTerminalSize(),
    C = useStoreSelector(h, xb),
    x = useStoreSelector(h, Fb),
    T = useStoreSelector(h, Pb),
    L;
  if (A[0] !== E || A[1] !== x || A[2] !== T || A[3] !== C)
    ((L = resolveDispatchDefaults({ launch: E, window: { model: C, effort: x, fastMode: T } })),
      (A[0] = E),
      (A[1] = x),
      (A[2] = T),
      (A[3] = C),
      (A[4] = L));
  else L = A[4];
  let V = L,
    D = columns - (columns >= 70 ? 11 : 0),
    U;
  if (A[5] !== V || A[6] !== D) {
    let cwd = getLogoDisplayData().cwd;
    U = !!cwd && bunStringWidth(formatDispatchDefaultsLabel(V)) + 3 + bunStringWidth(cwd) > D;
    ((A[5] = V), (A[6] = D), (A[7] = U));
  } else U = A[7];
  let X = U,
    K;
  if (A[8] !== V || A[9] !== X || A[10] !== D)
    ((K = { newSession: V, width: D, pathOwnRow: X }), (A[8] = V), (A[9] = X), (A[10] = D), (A[11] = K));
  else K = A[11];
  return K;
}
/**
 * “New sessions: 模型 · effort · ultracode” 标签。
 */
//@ chunk-93kwxas0.js:102976-103108 placement
function formatDispatchDefaultsLabel(h) {
  let E = h.effort ? ` \xB7 ${h.effort} effort` : "";
  return `New sessions: ${h.model}${E}${h.ultracode ? " \xB7 ultracode" : ""}`;
}
/**
 * 按可用宽度依次尝试完整/缩短的默认值标签，都放不下时截断模型名。
 */
//@ chunk-93kwxas0.js:103108-103288 placement
function fitDispatchDefaultsLabel(h, E) {
  let k = h.effort ? ` \xB7 ${h.effort} effort` : "",
    C = h.ultracode ? " \xB7 ultracode" : "";
  return (
    [formatDispatchDefaultsLabel(h), h.model + k + C, h.model + C].find((T) => bunStringWidth(T) <= E) ??
    truncateToWidth(h.model, Math.max(E, 1))
  );
}
//@ chunk-93kwxas0.js:103288-103292 placement
j();
//@ chunk-93kwxas0.js:103292-103296 placement
j();
//@ chunk-93kwxas0.js:103329-103359 placement
function Kb(rt) {
  return !wn(rt);
}
//@ chunk-93kwxas0.js:103359-103400 placement
function $b(Qe) {
  return Qe.color !== void 0;
}
//@ chunk-93kwxas0.js:103400-103430 placement
var qs = bunStringWidth(" (reserved name)");
/**
 * 在文本中绘制光标（反显字符）。
 */
//@ chunk-93kwxas0.js:103430-103848 placement
function renderCursorText(h, E, k, C = !1) {
  if (C && h) {
    let D = truncateStartToWidth(h, Math.max(k - 1, 1));
    return r(Fragment, {
      children: [e(Text, { inverse: !0, children: D }), e(Text, { inverse: !0, children: " " })],
    });
  }
  let { length: x, length: T } = h;
  for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(h))
    if (index + segment.length > E) {
      ((x = index), (T = index + segment.length));
      break;
    }
  let A = h.slice(x, T) || " ",
    sliced = h.slice(T),
    V = truncateStartToWidth(h.slice(0, x), k - bunStringWidth(A) - (sliced ? 1 : 0));
  return r(Fragment, {
    children: [
      e(Text, { children: V }),
      e(Text, { inverse: !0, children: A }),
      e(Text, { children: sliced }),
    ],
  });
}
/**
 * Agents 视图中一个会话（job）行：状态、详情、子行、重命名/分组/删除状态。
 */
//@ chunk-93kwxas0.js:103848-109675 placement
function FleetJobRow(h) {
  let je = w(67),
    {
      job: job,
      isFocused: isFocused,
      focusFg: focusFg,
      isOrigin: isOrigin,
      logTail: logTail,
      status: status,
      cols: cols,
      showVerb: showVerb,
      loopKickCount: loopKickCount,
      age: age,
      childRows: childRows,
      renaming: renaming,
      groupEditing: groupEditing,
      deleteArmed: deleteArmed,
      deleteRefused: deleteRefused,
      attaching: attaching,
      heldInTerminal: heldInTerminal,
    } = h,
    se = terminalOutcome(job.state.state),
    ne = se && job.state.tempo !== "active" ? deleteRefused : void 0,
    ae = cols.detail - bunStringWidth("group: ") - qs >= 24,
    me = activityVerb(job.activity, job.state.tempo, status, se),
    { color: color, dim: dim } = me,
    Oe = status === "busy" ? color : pickHighestPriorityColor(color, childRows),
    De = Oe === color && dim,
    we =
      attaching === "armed"
        ? void 0
        : deleteArmed?.justKilled
          ? BULLET_OPERATOR
          : attaching
            ? void 0
            : jobRowGlyph(job.state, se, status),
    Re = job.state.output?.result,
    st;
  if (je[0] !== Re || je[1] !== job.state)
    ((st = Re && !Io(job.state) ? toOpenableUrl(Re) : null), (je[0] = Re), (je[1] = job.state), (je[2] = st));
  else st = je[2];
  let mt = st,
    Ye = mt ? void 0 : Re,
    Lt = se !== "success" ? logTail || void 0 : void 0,
    dt =
      isOrigin && isFocused
        ? job.state.tempo === "blocked"
          ? job.state.needs
          : se === "failure"
            ? job.state.detail
            : void 0
        : void 0,
    Dt;
  if (je[3] !== job.state.detail) ((Dt = Si(job.state.detail)), (je[3] = job.state.detail), (je[4] = Dt));
  else Dt = je[4];
  let eo = Dt,
    Wt =
      isOrigin && job.state.tempo === "blocked" && job.state.needs === IDLE_NEEDS && job.state.detail && !eo
        ? job.state.detail
        : void 0,
    ke =
      isOrigin && isFocused
        ? dt
          ? dt === IDLE_NEEDS
            ? Wt
              ? mo(job.state, Wt)
              : basename_3(job.state.cwd) || job.state.cwd
            : mo(job.state, dt)
          : mo(job.state, job.state.detail ?? "")
        : se === "success"
          ? mo(job.state, Ye || job.state.detail)
          : mo(
              job.state,
              Wt ||
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
            stripJobPreviewText(job.state.detail),
    Ge;
  if (je[5] !== isOrigin || je[6] !== job.state)
    ((Ge = getJobTitle(job.state, isOrigin)), (je[5] = isOrigin), (je[6] = job.state), (je[7] = Ge));
  else Ge = je[7];
  let yt = Ge,
    Bt = isAgentColorName(job.state.color) ? AGENT_COLOR_TO_THEME_COLOR[job.state.color] : void 0,
    lt = useAutoTitle(yt, !!job.state.name),
    filtered = childRows.filter(wn),
    filtered_2 = childRows.filter(Kb),
    Ot = filtered_2.find($b) ?? filtered_2.at(-1) ?? filtered.at(-1),
    Yt = isFocused ? "selected, " : "",
    Ue = attaching
      ? `${Yt}opening:`
      : deleteArmed?.justKilled
        ? `${Yt}stopped:`
        : Oe !== color
          ? `${Yt}needs attention:`
          : jobRowAriaLabel(job.activity, job.state.tempo, status, se, isFocused);
  const Qt = Box,
    tt = cols.label + 2,
    ze = !isFocused && !isOrigin,
    Fe = De || (Oe === void 0 && !isFocused);
  let Rt;
  if (je[8] !== we) ((Rt = we ?? e(useFleetSpinnerFrame, {})), (je[8] = we), (je[9] = Rt));
  else Rt = je[9];
  let Vt;
  if (je[10] !== Oe || je[11] !== Ue || je[12] !== Fe || je[13] !== Rt)
    ((Vt = e(Text, { "aria-label": Ue, color: Oe, dimColor: Fe, children: Rt })),
      (je[10] = Oe),
      (je[11] = Ue),
      (je[12] = Fe),
      (je[13] = Rt),
      (je[14] = Vt));
  else Vt = je[14];
  let Be;
  if (
    je[15] !== cols.label ||
    je[16] !== mt ||
    je[17] !== isFocused ||
    je[18] !== isOrigin ||
    je[19] !== yt ||
    je[20] !== renaming ||
    je[21] !== lt ||
    je[22] !== Bt
  )
    ((Be =
      Bt && !renaming
        ? e(TagTabs, { color: Bt, bold: isFocused, children: mt ? e(Link, { url: mt, children: yt }) : yt })
        : renaming
          ? renderCursorText(renaming.draft, renaming.cursor, cols.label)
          : lt
            ? r(Fragment, {
                children: [
                  e(Text, { dimColor: !isFocused && !isOrigin, children: lt.display.slice(0, lt.newLen) }),
                  e(Text, { dimColor: !0, children: lt.display.slice(lt.newLen) }),
                ],
              })
            : mt
              ? e(Link, { url: mt, children: yt })
              : yt),
      (je[15] = cols.label),
      (je[16] = mt),
      (je[17] = isFocused),
      (je[18] = isOrigin),
      (je[19] = yt),
      (je[20] = renaming),
      (je[21] = lt),
      (je[22] = Bt),
      (je[23] = Be));
  else Be = je[23];
  let gt;
  if (je[24] !== isOrigin || je[25] !== Be)
    ((gt = e(Text, { bold: isOrigin, children: Be })), (je[24] = isOrigin), (je[25] = Be), (je[26] = gt));
  else gt = je[26];
  let kt;
  if (je[27] !== focusFg || je[28] !== gt || je[29] !== ze || je[30] !== Vt)
    ((kt = r(Text, { color: focusFg, dimColor: ze, wrap: "truncate", children: [Vt, " ", gt] })),
      (je[27] = focusFg),
      (je[28] = gt),
      (je[29] = ze),
      (je[30] = Vt),
      (je[31] = kt));
  else kt = je[31];
  let $e;
  if (je[32] !== kt || je[33] !== tt)
    (($e = e(Box, { width: tt, flexShrink: 0, children: kt })), (je[32] = kt), (je[33] = tt), (je[34] = $e));
  else $e = je[34];
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
  )
    ((ht = groupEditing
      ? r(Text, {
          wrap: "truncate",
          children: [
            e(Text, { dimColor: !0, children: "group: " }),
            renderCursorText(
              groupEditing.draft,
              groupEditing.cursor,
              Math.max(cols.detail - bunStringWidth("group: ") - (ae ? qs : 0), 8),
              groupEditing.selected,
            ),
            groupEditing.reserved
              ? e(Text, { color: "error", children: " (reserved name)" })
              : !ae
                ? null
                : groupEditing.isNew
                  ? e(Text, { dimColor: !0, children: " (new group)" })
                  : groupEditing.ungroup
                    ? e(Text, { dimColor: !0, children: " (ungroup)" })
                    : groupEditing.addTo
                      ? r(Text, { dimColor: !0, children: [" (add to ", groupEditing.addTo, ")"] })
                      : null,
          ],
        })
      : attaching === "armed"
        ? e(Text, { dimColor: !0, wrap: "truncate", children: "opening\u2026 \xB7 esc to cancel" })
        : deleteArmed
          ? e(Text, {
              color: deleteArmed.ungroup ? "warning" : "error",
              wrap: "truncate",
              children: deleteArmed.ungroup
                ? "ctrl+x again to ungroup"
                : deleteArmed.justKilled
                  ? "stopped \xB7 ctrl+x again to delete"
                  : "ctrl+x again to delete",
            })
          : ne
            ? r(Text, {
                wrap: "truncate",
                children: [
                  e(Text, { color: "error", children: "not deleted" }),
                  r(Text, { dimColor: !0, children: [" \xB7 ", ne] }),
                ],
              })
            : attaching
              ? e(Text, { dimColor: !0, wrap: "truncate", children: "opening\u2026" })
              : heldInTerminal
                ? e(Text, {
                    wrap: "truncate",
                    children: r(Byline, {
                      children: [
                        e(Text, { color: "suggestion", children: "Open in a terminal" }),
                        e(Text, { dimColor: !0, children: "continue it there" }),
                      ],
                    }),
                  })
                : showVerb
                  ? e(Text, {
                      wrap: "truncate",
                      children: r(Byline, {
                        children: [
                          e(Text, { color: me.color, dimColor: me.dim, children: me.word }),
                          ke && e(Text, { dimColor: !0, children: ke }),
                        ],
                      }),
                    })
                  : e(Text, { dimColor: !0, wrap: "truncate", children: ke })),
      (je[35] = attaching),
      (je[36] = cols.detail),
      (je[37] = deleteArmed),
      (je[38] = ne),
      (je[39] = groupEditing),
      (je[40] = ae),
      (je[41] = heldInTerminal),
      (je[42] = ke),
      (je[43] = showVerb),
      (je[44] = me),
      (je[45] = ht));
  else ht = je[45];
  let jt;
  if (
    je[46] !== attaching ||
    je[47] !== deleteArmed ||
    je[48] !== ne ||
    je[49] !== groupEditing ||
    je[50] !== heldInTerminal ||
    je[51] !== loopKickCount
  )
    ((jt =
      loopKickCount && !groupEditing && !deleteArmed && !ne && !attaching && !heldInTerminal
        ? e(Box, {
            flexShrink: 0,
            paddingLeft: 1,
            children: r(Text, { dimColor: !0, children: ["\xD7", loopKickCount] }),
          })
        : null),
      (je[46] = attaching),
      (je[47] = deleteArmed),
      (je[48] = ne),
      (je[49] = groupEditing),
      (je[50] = heldInTerminal),
      (je[51] = loopKickCount),
      (je[52] = jt));
  else jt = je[52];
  let We;
  if (je[53] !== ht || je[54] !== jt)
    ((We = r(Box, { flexGrow: 1, width: 0, paddingLeft: 2, children: [ht, jt] })),
      (je[53] = ht),
      (je[54] = jt),
      (je[55] = We));
  else We = je[55];
  const Jt =
      cols.artifact > 0
        ? e(Box, {
            width: cols.artifact + 2,
            flexShrink: 0,
            paddingLeft: 2,
            justifyContent: "flex-end",
            children:
              filtered_2.length > 1
                ? r(Text, {
                    color: Ot?.color,
                    dimColor: !isFocused || !Ot?.color,
                    children: [filtered_2.length, " PRs"],
                  })
                : filtered_2.length === 1
                  ? Ot?.prNumber !== void 0
                    ? e(PrBadge, {
                        number: Ot.prNumber,
                        url: Ot.row.href,
                        kind: Ci(Ot.row),
                        color: Ot.color,
                        dimColor: !isFocused,
                        underline: !1,
                        hidePrefix: !0,
                      })
                    : e(Text, { color: focusFg, dimColor: !isFocused, children: "PR" })
                  : Ot
                    ? e(Link, {
                        url: Ot.row.href,
                        children: r(Text, {
                          color: "claude",
                          children: [filtered.length > 1 && `${filtered.length} `, hf],
                        }),
                      })
                    : null,
          })
        : null,
    qe = cols.age + 2;
  let He;
  if (je[56] !== age) ((He = e(Text, { dimColor: !0, children: age })), (je[56] = age), (je[57] = He));
  else He = je[57];
  let ct;
  if (je[58] !== qe || je[59] !== He)
    ((ct = e(Box, { width: qe, flexShrink: 0, paddingLeft: 2, justifyContent: "flex-end", children: He })),
      (je[58] = qe),
      (je[59] = He),
      (je[60] = ct));
  else ct = je[60];
  let vt;
  if (je[61] !== Qt || je[62] !== $e || je[63] !== We || je[64] !== Jt || je[65] !== ct)
    ((vt = r(Qt, { children: [$e, We, Jt, ct] })),
      (je[61] = Qt),
      (je[62] = $e),
      (je[63] = We),
      (je[64] = Jt),
      (je[65] = ct),
      (je[66] = vt));
  else vt = je[66];
  return vt;
}
//@ chunk-93kwxas0.js:109675-109684 placement
var Rn = 3;
/**
 * 会话行的单行绘制（图标、标签、时长、令牌、状态、展开）。
 */
//@ chunk-93kwxas0.js:109684-111065 placement
function FleetRowLine(h) {
  let ae = w(27),
    {
      icon: icon,
      iconColor: iconColor,
      iconDim: iconDim,
      label: label,
      isOrigin: isOrigin,
      isFocused: isFocused,
      focusFg: focusFg,
      focusBg: focusBg,
      age: age,
      tokens: tokens,
      state: state,
      extra: extra,
      expanded: expanded,
      refusal: refusal,
      renaming: renaming,
      renameWidth: renameWidth,
      srLabel: srLabel,
    } = h;
  const se = iconDim || (iconColor === void 0 && !isFocused),
    ne = isFocused ? "\u276F" : " ";
  let me;
  if (
    ae[0] !== focusBg ||
    ae[1] !== icon ||
    ae[2] !== iconColor ||
    ae[3] !== srLabel ||
    ae[4] !== se ||
    ae[5] !== ne
  )
    ((me = r(Text, {
      "aria-label": srLabel,
      color: iconColor,
      dimColor: se,
      backgroundColor: focusBg,
      children: [ne, icon, "  "],
    })),
      (ae[0] = focusBg),
      (ae[1] = icon),
      (ae[2] = iconColor),
      (ae[3] = srLabel),
      (ae[4] = se),
      (ae[5] = ne),
      (ae[6] = me));
  else me = ae[6];
  let Je;
  if (
    ae[7] !== focusFg ||
    ae[8] !== isFocused ||
    ae[9] !== isOrigin ||
    ae[10] !== label ||
    ae[11] !== renameWidth ||
    ae[12] !== renaming
  )
    ((Je = renaming
      ? e(Text, { children: renderCursorText(renaming.draft, renaming.cursor, renameWidth) })
      : e(Text, {
          color: focusFg,
          dimColor: !isFocused && !isOrigin,
          bold: isOrigin,
          wrap: "truncate",
          children: label,
        })),
      (ae[7] = focusFg),
      (ae[8] = isFocused),
      (ae[9] = isOrigin),
      (ae[10] = label),
      (ae[11] = renameWidth),
      (ae[12] = renaming),
      (ae[13] = Je));
  else Je = ae[13];
  let le;
  if (ae[14] !== me || ae[15] !== Je)
    ((le = r(Box, { children: [me, Je] })), (ae[14] = me), (ae[15] = Je), (ae[16] = le));
  else le = ae[16];
  let Oe;
  if (
    ae[17] !== age ||
    ae[18] !== expanded ||
    ae[19] !== extra ||
    ae[20] !== refusal ||
    ae[21] !== state ||
    ae[22] !== tokens
  )
    ((Oe =
      (expanded || refusal) &&
      e(Box, {
        paddingLeft: Rn,
        children: e(Text, {
          dimColor: !0,
          wrap: "truncate",
          children: r(Byline, {
            children: [
              age,
              tokens,
              refusal
                ? e(Text, { color: "error", wrap: "truncate", children: refusal })
                : extra &&
                  e(Text, { color: state.color, dimColor: state.dim, wrap: "truncate", children: extra }),
            ],
          }),
        }),
      })),
      (ae[17] = age),
      (ae[18] = expanded),
      (ae[19] = extra),
      (ae[20] = refusal),
      (ae[21] = state),
      (ae[22] = tokens),
      (ae[23] = Oe));
  else Oe = ae[23];
  let De;
  if (ae[24] !== le || ae[25] !== Oe)
    ((De = r(Box, { flexDirection: "column", children: [le, Oe] })),
      (ae[24] = le),
      (ae[25] = Oe),
      (ae[26] = De));
  else De = ae[26];
  return De;
}
//@ chunk-93kwxas0.js:111065-111097 placement
function lS(lu) {
  return lu.query;
}
//@ chunk-93kwxas0.js:111097-111131 placement
function uS(cu) {
  return cu.loading;
}
//@ chunk-93kwxas0.js:111131-111154 placement
function cS() {
  return !1;
}
//@ chunk-93kwxas0.js:111154-111169 placement
function pS() {}
//@ chunk-93kwxas0.js:111169-111208 placement
function fS(pu) {
  return pu.kind === "job";
}
/**
 * Agents 视图的滚动列表（分组头、选中、过滤、旧会话行）。
 */
//@ chunk-93kwxas0.js:111208-123201 placement
function FleetRowList(h) {
  let Nt = w(117),
    {
      owners: owners,
      layout: layout,
      scrollRef: scrollRef,
      header: header,
      renameInput: renameInput,
      groupInput: groupInput,
      initialJobId: initialJobId,
      cwdFilter: cwdFilter,
      simpleView: simpleView,
      endsWithOlderSessionsLine: endsWithOlderSessionsLine,
      hasCredentials: hasCredentials,
      mountAt: mountAt,
      actions: actions,
    } = h,
    {
      roster: roster,
      selection: selection,
      view: view,
      attach: attach,
      editor: editor,
      deleteConfirm: deleteConfirm,
      earlier: earlier,
    } = owners,
    { columns: columns, rows: rows } = useTerminalSize(),
    { focusedIdx: focusedIdx, hoverFocusIdx: hoverFocusIdx } = useStoreSelector(selection),
    {
      groupMode: groupMode,
      activeTab: activeTab,
      groupEdit: groupEdit,
      groupPickIdx: groupPickIdx,
      groupPristine: groupPristine,
      renaming: renaming,
      previewOpen: previewOpen,
      helpOpen: helpOpen,
    } = useStoreSelector(view),
    {
      attachingJobId: attachingJobId,
      warmingJobIds: warmingJobIds,
      newSessionOpening: newSessionOpening,
    } = useStoreSelector(attach),
    {
      prStatuses: prStatuses,
      loopKicks: loopKicks,
      logTails: logTails,
      deleteRefusals: deleteRefusals,
    } = useStoreSelector(roster),
    Bt = useStoreSelector(editor, lS),
    { pending: pending } = useStoreSelector(deleteConfirm),
    Tt = useStoreSelector(earlier, uS),
    {
      rows: rows_2,
      collapsed: collapsed,
      filtered: filtered,
      byState: byState,
      byGroup: byGroup,
      isOnboarding: isOnboarding,
      hasComposedDispatch: hasComposedDispatch,
      dispatchTargetGroup: dispatchTargetGroup,
      hasMultipleOrigins: hasMultipleOrigins,
      focusedGroup: focusedGroup,
      groupCounts: groupCounts,
      earlierVisible: earlierVisible,
      simpleBuilt: simpleBuilt,
      cols: cols,
      ageNow: ageNow,
      loopJobIds: loopJobIds,
      focusIsFromHover: focusIsFromHover,
      queryIsFilter: queryIsFilter,
    } = layout,
    { draft: draft, cursor: cursor } = renameInput,
    {
      draft: draft_2,
      cursor: cursor_2,
      suggestions: suggestions,
      reserved: reserved,
      isNew: isNew,
      matchesExisting: matchesExisting,
      panelOpen: panelOpen,
    } = groupInput,
    {
      toggleCollapse: toggleCollapse,
      openOrRespawn: openOrRespawn,
      openEarlier: openEarlier,
      openNewSessionRow: openNewSessionRow,
    } = actions,
    pt = renaming?.jobId ?? null,
    oo;
  if (Nt[0] !== roster) ((oo = (Ce) => roster.liveStatus(Ce)), (Nt[0] = roster), (Nt[1] = oo));
  else oo = Nt[1];
  let Ke = oo,
    setError = editor.setError,
    Mt;
  if (Nt[2] !== groupMode) ((Mt = (so) => Sn(groupMode, so)), (Nt[2] = groupMode), (Nt[3] = Mt));
  else Mt = Nt[3];
  let Jo = Mt,
    vo;
  if (Nt[4] !== groupMode) ((vo = (zo) => `header:${groupMode}:${zo}`), (Nt[4] = groupMode), (Nt[5] = vo));
  else vo = Nt[5];
  let no = vo,
    _e = columns >= 120 ? 1 : 0,
    It = R(null),
    go = filtered.length === 0 && !!Bt && queryIsFilter && (simpleView || earlierVisible.length === 0);
  R(null);
  let No = cS,
    Qo = R(null),
    Po;
  if (Nt[6] !== suggestions)
    ((Po = suggestions.join(`
`)),
      (Nt[6] = suggestions),
      (Nt[7] = Po));
  else Po = Nt[7];
  let xe = Po,
    qt;
  if (
    Nt[8] !== focusIsFromHover ||
    Nt[9] !== focusedIdx ||
    Nt[10] !== rows_2 ||
    Nt[11] !== scrollRef ||
    Nt[12] !== selection
  )
    ((qt = () => {
      let takeRevealAtTop = selection.takeRevealAtTop(focusedIdx);
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
      scrollRef.current?.scrollToElement(It.current, io, { block: takeRevealAtTop ? "start" : "nearest" });
    }),
      (Nt[8] = focusIsFromHover),
      (Nt[9] = focusedIdx),
      (Nt[10] = rows_2),
      (Nt[11] = scrollRef),
      (Nt[12] = selection),
      (Nt[13] = qt));
  else qt = Nt[13];
  let bo;
  if (Nt[14] !== focusIsFromHover || Nt[15] !== focusedIdx || Nt[16] !== rows)
    ((bo = [focusedIdx, focusIsFromHover, rows]),
      (Nt[14] = focusIsFromHover),
      (Nt[15] = focusedIdx),
      (Nt[16] = rows),
      (Nt[17] = bo));
  else bo = Nt[17];
  zt(qt, bo);
  let wo;
  if (Nt[18] !== endsWithOlderSessionsLine)
    ((wo = [endsWithOlderSessionsLine]), (Nt[18] = endsWithOlderSessionsLine), (Nt[19] = wo));
  else wo = Nt[19];
  zt(pS, wo);
  let Ho = R(0),
    zr;
  if (Nt[20] !== helpOpen || Nt[21] !== scrollRef)
    ((zr = () => {
      if (!helpOpen) Ho.current = scrollRef.current?.getViewportHeight() ?? 0;
    }),
      (Nt[20] = helpOpen),
      (Nt[21] = scrollRef),
      (Nt[22] = zr));
  else zr = Nt[22];
  zt(zr);
  let Dn;
  if (Nt[23] !== helpOpen || Nt[24] !== scrollRef)
    ((Dn = () => {
      let ir = scrollRef.current;
      let kn = It.current?.yogaNode?.getComputedTop();
      if (!helpOpen || !ir || !It.current || kn === void 0) {
        return;
      }
      let Qr = kn - ir.getScrollTop();
      if (Qr >= 0 && Qr < Ho.current) ir.scrollToElement(It.current, 0, { block: "nearest" });
    }),
      (Nt[23] = helpOpen),
      (Nt[24] = scrollRef),
      (Nt[25] = Dn));
  else Dn = Nt[25];
  let Xr;
  if (Nt[26] !== helpOpen) ((Xr = [helpOpen]), (Nt[26] = helpOpen), (Nt[27] = Xr));
  else Xr = Nt[27];
  zt(Dn, Xr);
  let qi;
  if (Nt[28] !== panelOpen || Nt[29] !== scrollRef)
    ((qi = () => {
      if (panelOpen && Qo.current) scrollRef.current?.scrollToElement(Qo.current, 0, { block: "nearest" });
    }),
      (Nt[28] = panelOpen),
      (Nt[29] = scrollRef),
      (Nt[30] = qi));
  else qi = Nt[30];
  let vn;
  if (Nt[31] !== panelOpen || Nt[32] !== groupPickIdx || Nt[33] !== xe)
    ((vn = [panelOpen, xe, groupPickIdx]),
      (Nt[31] = panelOpen),
      (Nt[32] = groupPickIdx),
      (Nt[33] = xe),
      (Nt[34] = vn));
  else vn = Nt[34];
  zt(qi, vn);
  let Zr;
  if (
    Nt[35] !== cols ||
    Nt[36] !== panelOpen ||
    Nt[37] !== groupPickIdx ||
    Nt[38] !== suggestions ||
    Nt[39] !== _e
  )
    ((Zr = panelOpen
      ? (() => {
          let max = Math.max(0, Math.min(groupPickIdx - 1, suggestions.length - 4));
          let sliced = suggestions.slice(max, max + 4);
          let fo = suggestions.length - max - sliced.length;
          let ru = _e + cols.label + 4 + 7 - 2;
          return r(Box, {
            ref: Qo,
            flexDirection: "column",
            paddingLeft: ru,
            children: [
              max > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", max, " above"] }),
              sliced.map((ei, iu) => {
                let Yi = max + iu === groupPickIdx;
                return r(
                  Text,
                  {
                    color: Yi ? "suggestion" : void 0,
                    dimColor: !Yi,
                    wrap: "truncate",
                    children: [Yi ? re.pointer : " ", " ", ei],
                  },
                  ei,
                );
              }),
              fo > 0 && r(Text, { dimColor: !0, children: ["  ", "\u2026 ", fo, " more"] }),
            ],
          });
        })()
      : null),
      (Nt[35] = cols),
      (Nt[36] = panelOpen),
      (Nt[37] = groupPickIdx),
      (Nt[38] = suggestions),
      (Nt[39] = _e),
      (Nt[40] = Zr));
  else Zr = Nt[40];
  let ti = Zr,
    sr;
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
    Nt[53] !== Tt ||
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
    Nt[87] !== Bt ||
    Nt[88] !== queryIsFilter ||
    Nt[89] !== cursor ||
    Nt[90] !== draft ||
    Nt[91] !== pt ||
    Nt[92] !== roster ||
    Nt[93] !== _e ||
    Nt[94] !== rows_2 ||
    Nt[95] !== selection ||
    Nt[96] !== setError ||
    Nt[97] !== simpleBuilt ||
    Nt[98] !== simpleView ||
    Nt[99] !== toggleCollapse ||
    Nt[100] !== warmingJobIds
  )
    ((sr = rows_2.map((Ct, cn) => {
      let So = cn === focusedIdx;
      let zi = isOnboarding && Ct.kind === "header";
      let pn =
        Ct.kind === "header"
          ? hasComposedDispatch
            ? Ct.group === dispatchTargetGroup
            : So && !zi
          : !hasComposedDispatch && So;
      let jo = !hasComposedDispatch && So && cn !== hoverFocusIdx && !zi ? "userMessageBackground" : void 0;
      let Vn = jo && "text";
      let Oa = (Ta) => {
        if (previewOpen && Ct.kind !== "job") {
          return;
        }
        if (cn === focusedIdx) {
          if (!Ta) selection.setHoverFocusIdx(null);
          return;
        }
        if ((setError(null), Ta)) selection.hoverTo(cn, Ct);
        else selection.navigateTo(cn, Ct);
      };
      let Cn = () => Oa(!0);
      let fn = () => Oa(!1);
      if (Ct.kind === "header") {
        let su = !hasComposedDispatch && hasMultipleOrigins && Ct.group === focusedGroup;
        let au = groupCounts.get(Ct.group) ?? 0;
        let xa = collapsed.has(Jo(Ct.group));
        return r(
          Box,
          {
            ref: So ? It : void 0,
            marginTop: cn > 0 ? 1 : 0,
            flexDirection: "column",
            backgroundColor: jo,
            onMouseEnter: Bt || previewOpen || isOnboarding ? void 0 : Cn,
            onClick: isOnboarding
              ? void 0
              : () => {
                  if (
                    (fn(), (selection.followOrigin = Ct.group), (selection.followId = null), !queryIsFilter)
                  )
                    toggleCollapse(Ct.group);
                },
            children: [
              groupEdit?.kind === "rename" && groupEdit.from === Ct.group
                ? r(Text, {
                    wrap: "truncate",
                    children: [
                      renderCursorText(draft_2, cursor_2, Math.max(columns - 4, 10), groupPristine),
                      groupPristine
                        ? null
                        : reserved
                          ? e(Text, { color: "error", children: " (reserved name)" })
                          : matchesExisting
                            ? e(Text, { color: "error", children: " (name taken)" })
                            : isNew
                              ? e(Text, { dimColor: !0, children: " (rename group)" })
                              : null,
                    ],
                  })
                : r(Text, {
                    bold: su || pn,
                    color: Vn,
                    dimColor: !pn,
                    children: [
                      Ct.group === "pinned"
                        ? "Pinned"
                        : Ct.group === EARLIER
                          ? "Past"
                          : byState
                            ? Ao[Ct.group]
                            : byGroup
                              ? Ct.group === UNGROUPED
                                ? "Ungrouped"
                                : truncate(Ct.group, Math.max(columns - 10, 10))
                              : truncatePathForDisplay(
                                  activeTab === "remote" ? sanitizeAttentionText(yi(Ct.group)) : yi(Ct.group),
                                  Math.max(columns - 10, 10),
                                ),
                      xa && r(Fragment, { children: [" ", e(Text, { dimColor: !0, children: au })] }),
                      (byState ? Ct.group === "done" : Ct.group === EARLIER) &&
                        Tt &&
                        activeTab !== "remote" &&
                        !cwdFilter &&
                        r(Fragment, {
                          children: [
                            " ",
                            e(Text, { dimColor: !0, children: "\xB7 looking for past sessions\u2026" }),
                          ],
                        }),
                    ],
                  }),
              isOnboarding &&
                !(Ct.group === "done" && earlierVisible.length > 0) &&
                e(Box, { paddingLeft: 1, children: e(Text, { dimColor: !0, children: fd[Ct.group] }) }),
            ],
          },
          `h:${Ct.group}`,
        );
      }
      if (Ct.kind === "fold") {
        return e(
          Box,
          {
            ref: So ? It : void 0,
            marginTop: simpleView && _i(rows_2[cn - 1], Ct) ? 1 : 0,
            paddingLeft: _e,
            backgroundColor: jo,
            onMouseEnter: Bt || previewOpen ? void 0 : Cn,
            onClick: () => {
              (fn(),
                selection.expandCap(Ct.group),
                logEvent("tengu_fleetview_fold_expand", {
                  hidden_count: Ct.hidden,
                  ms_since_mount: Date.now() - mountAt,
                  via_click: !0,
                }));
            },
            children: r(Text, {
              color: Vn,
              dimColor: !pn,
              "aria-label": `${So ? "selected, " : ""}${Ct.hidden} more finished sessions folded:`,
              children: [
                simpleView ? (So ? "\u276F" : " ") + repeatString(" ", Rn - 1) : "",
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
        return r(
          Box,
          {
            flexDirection: "column",
            children: [
              r(Box, {
                ref: So ? It : void 0,
                paddingLeft: _e,
                backgroundColor: jo,
                onMouseEnter: Bt || previewOpen ? void 0 : Cn,
                onClick: () => {
                  (fn(), openNewSessionRow(Ct.origin));
                },
                children: [
                  r(Text, {
                    color: Vn ?? "suggestion",
                    "aria-label": So ? "selected, new session:" : void 0,
                    children: [
                      So ? "\u276F" : " ",
                      "+  ",
                      e(Text, { underline: So, children: "new session" }),
                    ],
                  }),
                  newSessionOpening &&
                    r(Text, {
                      dimColor: !0,
                      wrap: "truncate",
                      children: ["  ", "opening\u2026 \xB7 esc to cancel"],
                    }),
                ],
              }),
              simpleBuilt !== null &&
                !simpleBuilt.rows.some(fS) &&
                r(Box, {
                  paddingLeft: _e + Rn,
                  marginTop: 1,
                  flexDirection: "column",
                  children: [
                    e(Text, { bold: !0, children: "Nothing running in the background." }),
                    e(Text, {
                      dimColor: !0,
                      children:
                        "Hand off a task and it keeps working while you do something else \u2014 even if you close this terminal.",
                    }),
                    !hasCredentials &&
                      r(Text, {
                        color: "warning",
                        wrap: "truncate",
                        children: [
                          "You are not logged in. Run",
                          " ",
                          e(Text, { bold: !0, children: "claude /login" }),
                          " first, or press",
                          " ",
                          e(Text, { bold: !0, children: "l" }),
                          " to log in.",
                        ],
                      }),
                    r(Box, {
                      marginTop: 1,
                      flexDirection: "column",
                      children: [
                        r(Text, {
                          dimColor: !0,
                          children: [
                            "Start one with",
                            " ",
                            e(Text, { color: "suggestion", children: "+ new session" }),
                            " above,",
                          ],
                        }),
                        r(Text, {
                          dimColor: !0,
                          children: [
                            "or run",
                            " ",
                            e(Text, { color: "suggestion", children: 'claude --bg "task"' }),
                            " from any terminal,",
                          ],
                        }),
                        r(Text, {
                          dimColor: !0,
                          children: [
                            "or ",
                            e(Text, { color: "suggestion", children: "/fork" }),
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
        return r(
          Box,
          {
            ref: So ? It : void 0,
            width: "100%",
            paddingLeft: _e,
            backgroundColor: jo,
            onMouseEnter: Bt || previewOpen ? void 0 : Cn,
            onClick: () => {
              (fn(), openEarlier(entry, "section"));
            },
            children: [
              e(Box, {
                flexGrow: 1,
                flexShrink: 1,
                overflow: "hidden",
                children: r(Text, {
                  color: Vn,
                  dimColor: !pn,
                  wrap: "truncate",
                  children: ["\xB7 ", entry.title],
                }),
              }),
              e(Box, {
                flexShrink: 0,
                marginLeft: 1,
                children: e(Text, {
                  dimColor: !0,
                  children: formatDuration(Math.max(0, (ageNow ?? Date.now()) - entry.modified.getTime()), {
                    mostSignificantOnly: !0,
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
        return e(
          Box,
          {
            ref: So ? It : void 0,
            flexDirection: "column",
            width: "100%",
            paddingLeft: _e,
            marginTop: _i(rows_2[cn - 1], Ct) ? 1 : 0,
            backgroundColor: jo,
            onMouseEnter: Bt || previewOpen ? void 0 : Cn,
            onClick: (si) => {
              if (si.hyperlinkUrl && !Io(job.state)) {
                return si.allowDefault();
              }
              if (si.isWindowActivation) {
                return si.dropAsStray();
              }
              (fn(), openOrRespawn(job));
            },
            children: e(FleetRowLine, {
              icon: du ?? e(useFleetSpinnerFrame, {}),
              iconColor: Xo.color,
              iconDim: Xo.dim,
              label: getJobTitle(job.state, ii, !0),
              renameWidth: Math.max(12, columns - _e - Rn),
              renaming: pt === job.id ? { draft: draft, cursor: cursor } : void 0,
              isOrigin: ii,
              isFocused: So,
              focusFg: Vn,
              focusBg: jo,
              age: Hd(job, loopJobIds, loopKicks, ageNow),
              tokens: jd(job, Xo),
              state: Xo,
              extra: jobNeedsLine(job, Xo, ar, columns),
              expanded: Boolean(job.state.pinned) || jobBucket_2(job.state, ar) === "needs",
              refusal: deleteRefusals.get(job.id)?.notice,
              srLabel: jobRowAriaLabel(job.activity, job.state.tempo, ar, ri, So, job.state.pinned === !0),
            }),
          },
          job.id,
        );
      }
      let Fa = groupEdit?.kind === "assign" && groupEdit.jobId === job.id;
      let Xi = e(
        Box,
        {
          ref: So ? It : void 0,
          width: "100%",
          paddingLeft: _e,
          backgroundColor: jo,
          onMouseEnter: Bt || previewOpen ? void 0 : Cn,
          onClick: (li) => {
            if (li.hyperlinkUrl && !Io(job.state)) {
              return li.allowDefault();
            }
            if (li.isWindowActivation) {
              return li.dropAsStray();
            }
            (fn(), openOrRespawn(job));
          },
          children: e(FleetJobRow, {
            job: job,
            isFocused: So,
            focusFg: Vn,
            isOrigin: job.id === initialJobId,
            logTail: logTails[job.id],
            cols: cols,
            status: Ke(job),
            heldInTerminal: roster.terminalHolderOf(job) !== void 0,
            showVerb: !byState,
            loopKickCount: loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.count : void 0,
            age: formatJobAgeOrEta(
              job,
              loopJobIds.has(job.id) ? loopKicks.get(job.state.sessionId)?.nextAt : void 0,
              ageNow,
            ),
            childRows: job.state.children ? childFrameRows(job.state.children, prStatuses) : [],
            renaming: pt === job.id ? { draft: draft, cursor: cursor } : void 0,
            groupEditing: Fa
              ? {
                  draft: draft_2,
                  cursor: cursor_2,
                  selected: groupPristine,
                  reserved: !groupPristine && reserved,
                  isNew: !groupPristine && isNew && groupPickIdx < 0,
                  ungroup: !groupPristine && draft_2.trim() === "" && groupPickIdx < 0 && !!job.state.group,
                  addTo: groupPristine
                    ? void 0
                    : groupPickIdx >= 0
                      ? suggestions[groupPickIdx]
                      : matchesExisting
                        ? draft_2.trim()
                        : void 0,
                }
              : void 0,
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
                : void 0,
            deleteRefused: deleteRefusals.get(job.id)?.notice,
            attaching: attachingJobId === job.id ? "armed" : warmingJobIds.has(job.id) ? "warming" : !1,
          }),
        },
        job.id,
      );
      return r(Kc, { children: [Xi, Fa && ti] }, job.id);
    })),
      (Nt[41] = activeTab),
      (Nt[42] = ageNow),
      (Nt[43] = attachingJobId),
      (Nt[44] = byGroup),
      (Nt[45] = byState),
      (Nt[46] = Jo),
      (Nt[47] = collapsed),
      (Nt[48] = cols),
      (Nt[49] = columns),
      (Nt[50] = cwdFilter),
      (Nt[51] = deleteRefusals),
      (Nt[52] = dispatchTargetGroup),
      (Nt[53] = Tt),
      (Nt[54] = earlierVisible),
      (Nt[55] = focusedGroup),
      (Nt[56] = focusedIdx),
      (Nt[57] = groupCounts),
      (Nt[58] = cursor_2),
      (Nt[59] = draft_2),
      (Nt[60] = isNew),
      (Nt[61] = matchesExisting),
      (Nt[62] = reserved),
      (Nt[63] = groupEdit),
      (Nt[64] = groupPickIdx),
      (Nt[65] = groupPristine),
      (Nt[66] = ti),
      (Nt[67] = suggestions),
      (Nt[68] = hasComposedDispatch),
      (Nt[69] = hasCredentials),
      (Nt[70] = hasMultipleOrigins),
      (Nt[71] = no),
      (Nt[72] = hoverFocusIdx),
      (Nt[73] = initialJobId),
      (Nt[74] = isOnboarding),
      (Nt[75] = Ke),
      (Nt[76] = logTails),
      (Nt[77] = loopJobIds),
      (Nt[78] = loopKicks),
      (Nt[79] = mountAt),
      (Nt[80] = newSessionOpening),
      (Nt[81] = openEarlier),
      (Nt[82] = openNewSessionRow),
      (Nt[83] = openOrRespawn),
      (Nt[84] = pending),
      (Nt[85] = prStatuses),
      (Nt[86] = previewOpen),
      (Nt[87] = Bt),
      (Nt[88] = queryIsFilter),
      (Nt[89] = cursor),
      (Nt[90] = draft),
      (Nt[91] = pt),
      (Nt[92] = roster),
      (Nt[93] = _e),
      (Nt[94] = rows_2),
      (Nt[95] = selection),
      (Nt[96] = setError),
      (Nt[97] = simpleBuilt),
      (Nt[98] = simpleView),
      (Nt[99] = toggleCollapse),
      (Nt[100] = warmingJobIds),
      (Nt[101] = sr));
  else sr = Nt[101];
  let Wo;
  if (Nt[102] !== go)
    ((Wo =
      go &&
      !0 &&
      e(Box, { paddingLeft: 2, children: e(Text, { dimColor: !0, children: "no sessions match" }) })),
      (Nt[102] = go),
      (Nt[103] = Wo));
  else Wo = Nt[103];
  let Co;
  if (
    Nt[104] !== activeTab ||
    Nt[105] !== byState ||
    Nt[106] !== cwdFilter ||
    Nt[107] !== Tt ||
    Nt[108] !== rows_2 ||
    Nt[109] !== simpleView
  )
    ((Co =
      Tt &&
      !simpleView &&
      activeTab !== "remote" &&
      !cwdFilter &&
      !rows_2.some((Zi) => Zi.kind === "header" && Zi.group === (byState ? "done" : EARLIER)) &&
      e(Box, {
        paddingLeft: 2,
        children: e(Text, { dimColor: !0, children: "\xB7 looking for past sessions\u2026" }),
      })),
      (Nt[104] = activeTab),
      (Nt[105] = byState),
      (Nt[106] = cwdFilter),
      (Nt[107] = Tt),
      (Nt[108] = rows_2),
      (Nt[109] = simpleView),
      (Nt[110] = Co));
  else Co = Nt[110];
  let Ma;
  if (Nt[111] !== header || Nt[112] !== scrollRef || Nt[113] !== sr || Nt[114] !== Wo || Nt[115] !== Co)
    ((Ma = r(LI, {
      ref: scrollRef,
      flexGrow: 1,
      flexDirection: "column",
      paddingTop: 1,
      stickyScroll: !1,
      children: [header, sr, Wo, !1, Co],
    })),
      (Nt[111] = header),
      (Nt[112] = scrollRef),
      (Nt[113] = sr),
      (Nt[114] = Wo),
      (Nt[115] = Co),
      (Nt[116] = Ma));
  else Ma = Nt[116];
  return Ma;
}
//@ chunk-93kwxas0.js:123201-123205 placement
j();
//@ chunk-93kwxas0.js:123205-123244 placement
function wx(me) {
  return me.sessionModel;
}
//@ chunk-93kwxas0.js:123244-123284 placement
function Sx(Je) {
  return Je.sessionEffort;
}
//@ chunk-93kwxas0.js:123284-123326 placement
function yx() {
  let le = !1;
  return () => {
    le = !0;
  };
}
/**
 * Agents 视图支持的快捷键动作列表。
 */
//@ chunk-93kwxas0.js:123326-123555 placement
var FLEET_KEY_ACTIONS = [
    "agents:switchView",
    "agents:togglePin",
    "agents:find",
    "agents:nextGroup",
    "agents:previousGroup",
    "agents:rename",
    "agents:setGroup",
    "chat:externalEditor",
  ],
  FLEET_EDITOR_SAFE_ACTIONS = new Set(["agents:switchView", "agents:togglePin", "agents:rename"]);
//@ chunk-93kwxas0.js:123555-123600 placement
function Bo() {
  return useKeybindingContext()?.bindings ?? parseBindings(DEFAULT_BINDINGS);
}

export {
  Bo,
  useDispatchWindowDefaults,
  FleetRowList,
  FleetComposer,
  FLEET_KEY_ACTIONS,
  FLEET_EDITOR_SAFE_ACTIONS,
};
