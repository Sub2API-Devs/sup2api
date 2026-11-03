/**
 * components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 *
 * Skill 工具权限请求：技能名与安全检查结果，允许/应用建议/拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: sole-consumer 3, affinity 2, fingerprint 2, layout 1, placement 2
 */
import {
  parseConsentSuggestions,
  HCs,
  hDe,
  CONSENT_ROW_LIMITS,
  parseModeSuggestions,
  combineRows,
} from "../consentRows.js";
import { generateShellSuggestionsLabel } from "../shellPermissionHelpers.js";
import { findSafetyCheckReason } from "../../../utils/permissions/permissions.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { processResponse } from "../../../hooks/useSwarmPermissionPoller.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  needsGutter,
  displayField,
  plainDisplay,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { formatQuotedList } from "../../../utils/websocketSummary.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { sandboxHostsSummary, formatHiddenRowsHint } from "../BashPermissionRequest/commandDisplay.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { PermissionPrompt } from "../PermissionPrompt.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import {
  getSkillCommandPrefix,
  resolveSkillDisplay,
  useSkillAskRevealMemory,
  SKILL_NARROW_COLUMNS,
  buildSkillExactRule,
  buildSkillPrefixRule,
  m0o,
  SKILL_UNREAD_HINT_ENABLED,
  Oyt,
  g0o,
  f0o,
  skillChoiceToResult,
  y0o,
  S0o,
  h0o,
} from "./skillPermissionOptions.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { Q, Se, y, P, zt, j } from "../../../../vendor/react/cjs/react.production.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { TerminalSizeContext } from "../../../ink/terminalModes.js";
import { mCr } from "../PermissionRequestTitle.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";

/**
 * 从权限结果的 suggestions 生成同意行：规则类一行，addDirectories 目录（有总数上限、防御性读取）一行，多行合并。
 */
//@ chunk-18hwfzwa.js:1390671-1391495 sole-consumer
function buildSuggestionRows(h) {
  let x = "suggestions" in h.permissionResult ? h.permissionResult.suggestions : void 0;
  if (!Array.isArray(x) || x.length === 0) return null;
  let D = [],
    L = parseConsentSuggestions(x, { displayedTypes: HCs, renderLabel: generateShellSuggestionsLabel });
  if (L !== null) D.push(L);
  let ee = [],
    ke = !1;
  try {
    let He = x.length;
    if (((ke = typeof He === "number" && Number.isSafeInteger(He) && He >= 0 && He <= hDe), ke)) {
      let We = hDe * CONSENT_ROW_LIMITS;
      for (let ze = 0; ze < He && ke; ze++)
        try {
          let Xe = x[ze];
          if (Xe === null || typeof Xe !== "object" || Xe.type !== "addDirectories") continue;
          let directories = Xe.directories;
          if (!Array.isArray(directories)) continue;
          let kt = directories.length;
          if (typeof kt !== "number" || !Number.isSafeInteger(kt) || kt < 0) continue;
          if (((We -= kt), We < 0)) {
            ke = !1;
            break;
          }
          for (let At = 0; At < kt; At++) ee.push(directories[At]);
        } catch {}
    }
  } catch {
    ke = !1;
  }
  if (ke && ee.length > 0) {
    let He = parseModeSuggestions(ee);
    if (He !== null) D.push(He);
  }
  let [Re, ...Be] = D;
  if (Re === void 0) return null;
  return Be.length === 0 ? Re : combineRows(Re, ...Be);
}
//@ chunk-18hwfzwa.js:1391495-1391665 sole-consumer
function hasBlockingSafetyCheck(h) {
  let x = h.permissionResult.behavior === "ask" ? h.permissionResult.decisionReason : void 0;
  return findSafetyCheckReason(x, (D) => !D.classifierApprovable) !== void 0 || h.isAskCappedByOrg;
}
//@ chunk-18hwfzwa.js:1391665-1391836 sole-consumer
function isSkillInputWithheld(h) {
  return (
    h.command?.kind === "withheld" ||
    h.mcp?.argsDisplay?.kind === "withheld" ||
    h.ws?.url.kind === "withheld" ||
    (h.command === void 0 && h.mcp === void 0 && h.ws === void 0)
  );
}
//@ chunk-18hwfzwa.js:1391836-1391890 affinity
function kF(h) {
  return h.kind === "full" ? h.text : h.marker;
}
/**
 * Skill 权限：显示技能名、来源与安全检查，选项允许 / 应用建议规则 / 拒绝。
 */
//@ chunk-18hwfzwa.js:1391890-1395417 fingerprint = SkillPermissionRequest (0.304)
function SkillPermissionRequest(props) {
  let $ = w(50),
    { payload: payload, answer: answer } = props,
    ee;
  if ($[0] !== payload)
    ((ee =
      payload.showAlwaysAllow && !hasBlockingSafetyCheck(payload) && !isSkillInputWithheld(payload)
        ? buildSuggestionRows(payload)
        : null),
      ($[0] = payload),
      ($[1] = ee));
  else ee = $[1];
  let ke = ee,
    Re;
  if ($[2] !== answer || $[3] !== payload || $[4] !== ke)
    ((Re = (Be, He) => answer(processResponse(Be, payload, ke, He))),
      ($[2] = answer),
      ($[3] = payload),
      ($[4] = ke),
      ($[5] = Re));
  else Re = $[5];
  let We = Re,
    ze;
  if ($[6] !== answer) ((ze = () => answer({ behavior: "deny" })), ($[6] = answer), ($[7] = ze));
  else ze = $[7];
  let Xe = ze,
    rt = payload.permissionResult.inPlaceOfClassifier === !0,
    kt;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((kt = { label: "No", value: "no", feedbackConfig: { type: "reject" } }), ($[8] = kt));
  else kt = $[8];
  let At = kt,
    It;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((It = { label: "Yes", value: "yes", feedbackConfig: { type: "accept" } }), ($[9] = It));
  else It = $[9];
  let Ot = It,
    Et;
  if ($[10] !== rt || $[11] !== ke) {
    Et = rt ? [At, Ot] : [Ot];
    if (ke !== null) {
      let Dt;
      if ($[13] !== ke.node)
        ((Dt = { label: ke.node, value: "yes-apply-suggestions" }), ($[13] = ke.node), ($[14] = Dt));
      else Dt = $[14];
      Et.push(Dt);
    }
    if (!rt) Et.push(At);
    (($[10] = rt), ($[11] = ke), ($[12] = Et));
  } else Et = $[12];
  let Lt = Et;
  const requestSource = payload.requestSource,
    oo = payload.monitorDescription ?? "";
  let Xt;
  if ($[15] !== oo) ((Xt = needsGutter(oo)), ($[15] = oo), ($[16] = Xt));
  else Xt = $[16];
  let io;
  if ($[17] !== payload.monitorDescription)
    ((io = e(Text, { dimColor: !0, children: payload.monitorDescription })),
      ($[17] = payload.monitorDescription),
      ($[18] = io));
  else io = $[18];
  let so;
  if ($[19] !== Xt || $[20] !== io)
    ((so = e(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: e(Blockquote, { multiline: Xt, children: io }),
    })),
      ($[19] = Xt),
      ($[20] = io),
      ($[21] = so));
  else so = $[21];
  let po;
  if (
    $[22] !== payload.command ||
    $[23] !== payload.intervalMs ||
    $[24] !== payload.mcp ||
    $[25] !== payload.ws
  )
    ((po = payload.mcp
      ? r(Fragment, {
          children: [
            r(Text, {
              children: [
                "Poll",
                " ",
                r(Text, { bold: !0, children: [payload.mcp.server, "/", payload.mcp.tool] }),
                " ",
                "every ",
                payload.intervalMs / 1000,
                "s",
              ],
            }),
            payload.mcp.argsDisplay !== void 0
              ? e(Blockquote, {
                  multiline: payload.mcp.argsDisplay.kind === "full" && payload.mcp.argsDisplay.needsGutter,
                  children: r(Text, { dimColor: !0, children: ["args: ", kF(payload.mcp.argsDisplay)] }),
                })
              : null,
          ],
        })
      : payload.ws
        ? r(Fragment, {
            children: [
              e(Blockquote, {
                multiline: payload.ws.url.kind === "full" && payload.ws.url.needsGutter,
                children: r(Text, {
                  children: ["Open WebSocket ", e(Text, { bold: !0, children: kF(payload.ws.url) })],
                }),
              }),
              payload.ws.protocolsWithheld === !0
                ? r(Text, {
                    children: [
                      "subprotocols:",
                      " ",
                      e(Text, {
                        bold: !0,
                        children: "(cannot be shown in full \u2014 deny unless expected)",
                      }),
                    ],
                  })
                : payload.ws.protocols !== void 0 && payload.ws.protocols.length > 0
                  ? r(Text, {
                      children: [
                        "subprotocols:",
                        " ",
                        e(Text, { bold: !0, children: formatQuotedList(payload.ws.protocols) }),
                      ],
                    })
                  : null,
            ],
          })
        : payload.command
          ? e(Blockquote, {
              multiline: payload.command.kind === "full" && payload.command.needsGutter,
              children: e(Text, { children: kF(payload.command) }),
            })
          : null),
      ($[22] = payload.command),
      ($[23] = payload.intervalMs),
      ($[24] = payload.mcp),
      ($[25] = payload.ws),
      ($[26] = po));
  else po = $[26];
  let ao;
  if ($[27] !== po) ((ao = e(DiffFrame, { children: po })), ($[27] = po), ($[28] = ao));
  else ao = $[28];
  let co;
  if ($[29] !== payload.networkAllowHosts)
    ((co =
      payload.networkAllowHosts !== void 0 &&
      payload.networkAllowHosts.length > 0 &&
      e(Box, { marginBottom: 1, children: e(sandboxHostsSummary, { hosts: payload.networkAllowHosts }) })),
      ($[29] = payload.networkAllowHosts),
      ($[30] = co));
  else co = $[30];
  const bo = payload.mcp || payload.ws ? "tool" : "command",
    Ao = rt ? MAX_EXPLANATION_LINES : void 0;
  let Bo;
  if ($[31] !== payload.permissionResult || $[32] !== bo || $[33] !== Ao)
    ((Bo = e(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: bo,
      rowBudget: Ao,
    })),
      ($[31] = payload.permissionResult),
      ($[32] = bo),
      ($[33] = Ao),
      ($[34] = Bo));
  else Bo = $[34];
  let Ro;
  if ($[35] !== Xe || $[36] !== We || $[37] !== rt || $[38] !== Lt || $[39] !== payload.requestSource)
    ((Ro = e(PermissionPrompt, {
      options: Lt,
      hideIndexes: rt,
      onSelect: We,
      onCancel: Xe,
      requestSource: payload.requestSource,
    })),
      ($[35] = Xe),
      ($[36] = We),
      ($[37] = rt),
      ($[38] = Lt),
      ($[39] = payload.requestSource),
      ($[40] = Ro));
  else Ro = $[40];
  let Ho;
  if ($[41] !== co || $[42] !== Bo || $[43] !== Ro)
    ((Ho = r(Box, { flexDirection: "column", paddingX: 1, children: [co, Bo, Ro] })),
      ($[41] = co),
      ($[42] = Bo),
      ($[43] = Ro),
      ($[44] = Ho));
  else Ho = $[44];
  let Io;
  if ($[45] !== payload.requestSource || $[46] !== so || $[47] !== ao || $[48] !== Ho)
    ((Io = r(PermissionDialog_2, {
      title: MONITOR,
      innerPaddingX: 0,
      requestSource: requestSource,
      children: [so, ao, Ho],
    })),
      ($[45] = payload.requestSource),
      ($[46] = so),
      ($[47] = ao),
      ($[48] = Ho),
      ($[49] = Io));
  else Io = $[49];
  return Io;
}
//@ chunk-18hwfzwa.js:1409005-1409162 affinity
function shouldOfferAlwaysAllow(h) {
  let decisionReason = h.permissionResult.decisionReason,
    D = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return h.showAlwaysAllow && !D && !h.isAskCappedByOrg;
}
//@ chunk-18hwfzwa.js:1409162-1409256 fingerprint = _temp (0.709)
function C0o(input) {
  return (
    shouldOfferAlwaysAllow(input) &&
    input.skill !== "" &&
    !input.skill.endsWith(":*") &&
    !input.skill.endsWith(" *")
  );
}
//@ chunk-18hwfzwa.js:1409256-1409319 layout
function _0o(h) {
  if (!shouldOfferAlwaysAllow(h)) return !1;
  return getSkillCommandPrefix(h.skill) !== null;
}
/**
 * skill 使用权限请求对话框。
 */
//@ chunk-18hwfzwa.js:1409319-1412968 placement
function SkillUsePermissionDialog({ payload: payload, answer: answer }) {
  let D = getOriginalCwd(),
    L = Q(
      () => (payload.skillDescription ? displayField(payload.skillDescription) : void 0),
      [payload.skillDescription],
    ),
    ee = Q(() => resolveSkillDisplay(payload), [payload]),
    ke = ee !== void 0,
    Re = useIsScreenReaderEnabled(),
    Be = plainDisplay(ee?.name ?? payload.skill),
    He = Be !== null ? `Use skill "${Be.display}"?` : null,
    { columns: columns } = useScrollViewportSize(Se(TerminalSizeContext) ?? { rows: 0, columns: 0 }),
    ze = He !== null && (!ke || mCr(He, payload.requestSource, columns - 2)),
    Xe = ee?.isWithoutSkill === !0,
    rt = ee?.calledAs,
    kt = Xe ? "" : (L?.text ?? ""),
    At = !ke
      ? ""
      : ze || Be === null
        ? kt
        : `"${Be.display}"
${kt}`,
    decisionReason = payload.permissionResult.decisionReason,
    Ot =
      decisionReason !== void 0 && "reason" in decisionReason && typeof decisionReason.reason === "string"
        ? decisionReason.reason
        : "",
    Et = useSkillAskRevealMemory(),
    Dt = Be?.display ?? "",
    Lt = Q(() => ({ shownNameText: Dt, descriptionText: kt, reasonText: Ot }), [Dt, kt, Ot]),
    oo = FittedOfferBody(At, { isActive: ke, isCut: !Re, contentKey: Lt, keptForRequest: Et }),
    Xt = oo.offersStanding && !oo.isStandingHeld,
    io = payload.permissionResult.behavior === "ask" ? payload.permissionResult.matchedAskRule : void 0,
    so = columns < SKILL_NARROW_COLUMNS,
    [po, ao] = y(() => Et?.has("narrower") ?? !1);
  (P(() => {
    if (ke && so) ao(!0);
  }, [ke, so]),
    zt(() => {
      if (ke && so) Et?.keep("narrower");
    }, [ke, so, Et]));
  let co = Xt && !so && !po,
    bo = Q(() => payload.permissionResult, [payload.permissionResult, ke, io]),
    Ao = Q(() => {
      if (ee !== void 0) return null;
      return C0o(payload) ? buildSkillExactRule(payload, D) : null;
    }, [payload, D, ee, io, co, Re]),
    Bo = Q(
      () =>
        resolveSkillDisplay(payload) === void 0 && _0o(payload) ? buildSkillPrefixRule(payload, D) : null,
      [payload, D],
    ),
    Ro = payload.permissionResult.inPlaceOfClassifier === !0,
    Ho = Q(() => {
      let mr = { label: "No", value: "no", feedbackConfig: { type: "reject" } },
        Kn = { label: "Yes", value: "yes", feedbackConfig: { type: "accept" } },
        Wn = Ro ? [mr, Kn] : [Kn];
      if (Ao !== null) {
        let Fr = ke && !co;
        Wn.push({ label: Fr ? m0o : Ao.node, value: "yes-exact", disabled: Fr });
      }
      if (Bo !== null) Wn.push({ label: Bo.node, value: "yes-prefix" });
      if (!Ro) Wn.push(mr);
      return Wn;
    }, [Ao, Bo, Ro, ke, co]),
    Io = Q(
      () => ({ toolName: sanitizeToolNameForAnalytics(payload.toolName), isMcp: payload.isMcp }),
      [payload.toolName, payload.isMcp],
    ),
    [Wo, mn] = y(),
    Cn = void 0,
    No = Cn === "both" || (Cn === "unread" && SKILL_UNREAD_HINT_ENABLED),
    vo = !ke || !1,
    Yo = ke && !Xe && oo.isMeasured && !oo.fitsScreen && !Re,
    [kn, Fn] = y(() => Et?.has("hint") ?? !1);
  (P(() => {
    if (Yo && io !== void 0) Fn(!0);
  }, [Yo, io]),
    zt(() => {
      if (Yo && io !== void 0) Et?.keep("hint");
    }, [Yo, io, Et]));
  let bn = void 0,
    Go = !ke || Xe || No ? void 0 : Cn === "unread" ? Oyt : Cn === "cut" ? g0o : void 0,
    Mn =
      (Yo ? (Go === void 0 && bn !== void 0 ? bn.tooShort : f0o) : Go) ??
      (rt === null ? Oyt : bn !== void 0 ? bn.question : void 0),
    Xo = (mr, Kn) => {
      if ((mr !== "no" && !vo) || (mr === "yes-exact" && ke && !co)) return !1;
      return answer(skillChoiceToResult(mr, payload, { exactRow: Ao, prefixRow: Bo }, Kn));
    },
    Sn = () => answer({ behavior: "deny" }),
    $n = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    showNextRows = oo.showNextRows,
    _o = Q(() => [{ action: "app:toggleTranscript", run: showNextRows }], [showNextRows]),
    cn = ke && (oo.hiddenRows > 0 || oo.hiddenAbove > 0),
    Dn = ke && columns < y0o ? Math.max(1, columns - S0o) : void 0,
    wn = r(PermissionDialog_2, {
      title: ze ? He : "Use this skill?",
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      marginTop: ke ? 0 : 1,
      children: [
        e(Box, {
          paddingX: 1,
          children: e(Text, { children: "Claude may use instructions, code, or files from this Skill." }),
        }),
        ke
          ? e(DiffFrame, {
              children: r(Box, {
                ref: oo.box,
                flexDirection: "column",
                children: [
                  e(Blockquote, {
                    multiline: !0,
                    children: e(Box, {
                      ref: oo.textBox,
                      flexDirection: "column",
                      flexGrow: 1,
                      children: e(Text, { dimColor: !0, children: oo.text }),
                    }),
                  }),
                  cn &&
                    e(Text, {
                      dimColor: !0,
                      wrap: "truncate-end",
                      children: formatHiddenRowsHint({
                        hiddenRows: oo.hiddenRows,
                        hiddenAbove: oo.hiddenAbove,
                        hint: formatShortcutHint({
                          chord: $n,
                          action: oo.hiddenRows > 0 ? "see more" : "see the first lines",
                          parens: !0,
                          format: { keyCase: "lower" },
                        }),
                        columns: oo.columns,
                      }),
                    }),
                ],
              }),
            })
          : L !== void 0
            ? e(DiffFrame, {
                children: e(Blockquote, {
                  multiline: L.needsGutter,
                  children: e(Text, { dimColor: !0, children: L.text }),
                }),
              })
            : null,
        r(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: [
            e(PermissionRuleExplanation, {
              permissionResult: bo,
              toolType: "tool",
              rowBudget:
                Dn !== void 0
                  ? Math.ceil((MAX_EXPLANATION_LINES * h0o) / Dn) + 1
                  : ke || Ro
                    ? MAX_EXPLANATION_LINES
                    : void 0,
              rowColumns: Dn,
              hideAskRuleHint: ke && kn,
              onConsentDrawn: ke ? mn : void 0,
            }),
            e(PermissionPrompt, {
              options: Ho,
              hideIndexes: Ro,
              onSelect: Xo,
              onCancel: Sn,
              question: void 0,
              toolAnalyticsContext: Io,
              requestSource: payload.requestSource,
            }),
          ],
        }),
      ],
    });
  return ke
    ? e(useDialogKeybindings, { bindings: _o, active: cn, flexDirection: "column", children: wn })
    : wn;
}
//@ chunk-18hwfzwa.js:1412968-1412972 placement
j();

export { SkillUsePermissionDialog, SkillPermissionRequest };
