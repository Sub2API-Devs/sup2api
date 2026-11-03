/**
 * components/permissions/FallbackPermissionRequest.tsx
 *
 * 通用工具权限请求（无专用组件的工具/MCP 工具）：工具名 + 参数表格 + 允许/不再询问/拒绝选项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FallbackPermissionRequest.tsx
 * pieces: chunk-0e8j1zzj.js (5), chunk-qgcqa405.js (2)
 * attribution: placement 4, layout 2, fingerprint 1
 */
import { findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import { isRemoteOrPluginAgent } from "../../utils/agentContext.js";
import { isRuleableToolName, autoModeRow } from "./consentRows.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { R, y, P, j, yt } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { buildParameterRows, _o, cardHeaderRows, Eo, ParameterCard } from "./ToolParameterDisplay.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { UHt } from "../messages/toolUseRenderers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  serializeApprovalPayload,
  replaceLineBreaks,
  needsGutter,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  Kl,
  buildToolDontAskAgainRule,
  fallbackChoiceToResult,
  Xl,
  zl,
  Zl,
  ToolInputEntries,
} from "./_new/ToolInputEntries.js";
import { useSettingsErrors, n$n } from "../../hooks/notifs/useSettingsErrors.js";
import { getOriginalCwd, onAttacherCapsChange } from "../../bootstrap/state.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useUnattendedNotice } from "./UnattendedAutoBlockNotice.js";
import { wrapToMaxLines } from "../../utils/format.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PermissionPrompt } from "./PermissionPrompt.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Blockquote } from "../Blockquote.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "./PermissionRuleExplanation.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";

/**
 * 是否不能提供"总是允许"
 */
//@ chunk-0e8j1zzj.js:44119-44356 placement
function isAlwaysAllowUnavailable(o) {
  let decisionReason = o.permissionResult.decisionReason;
  return (
    findSafetyCheckReason(decisionReason, (c) => !c.classifierApprovable) !== void 0 ||
    o.isAskCappedByOrg ||
    o.permissionResult.inPlaceOfClassifier === !0 ||
    o.permissionResult.oneTimeAnswersOnly === !0 ||
    isRemoteOrPluginAgent(o.requestSource)
  );
}
//@ chunk-0e8j1zzj.js:44356-44421 placement
function shouldOfferAlwaysAllow(o) {
  return o.showAlwaysAllow && !isAlwaysAllowUnavailable(o) && isRuleableToolName(o.toolName);
}
//@ chunk-0e8j1zzj.js:44421-44448 layout
var wi = 2,
  Al = 16,
  Ml = 24,
  Pl = 80;
//@ chunk-0e8j1zzj.js:44448-44528 layout
function Si(o, t) {
  return o && t.columns >= Pl ? Math.max(wi, Math.min(Al, t.rows - Ml)) : wi;
}
/**
 * 通用权限请求：渲染工具的 renderToolUseMessage 摘要（失败时退回参数表格），显示规则解释；选项允许一次/不再询问（工具级规则）/启用 auto/拒绝并反馈。
 */
//@ chunk-0e8j1zzj.js:44528-54584 fingerprint = FallbackPermissionRequest (0.322)
function FallbackPermissionRequest(t0) {
  let $ = w(164),
    { payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer } = t0,
    m = R(null),
    u = useTerminalSize(),
    h;
  if ($[0] !== u.columns)
    ((h = () => Math.max(20, Math.min(40, u.columns - 6))), ($[0] = u.columns), ($[1] = h));
  else h = $[1];
  let [k, f] = y(h),
    g;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((g = () => {
      if (m.current) {
        let { width: width } = measureElement(m.current);
        if (width > 0) f(Math.max(20, width - 2));
      }
    }),
      ($[2] = g));
  else g = $[2];
  let N;
  if ($[3] !== u.columns || $[4] !== u.rows)
    ((N = [u.columns, u.rows]), ($[3] = u.columns), ($[4] = u.rows), ($[5] = N));
  else N = $[5];
  P(g, N);
  let min = Math.min(k, Math.max(20, u.columns - 6)),
    A;
  if ($[6] !== min || $[7] !== payload.input || $[8] !== payload.isMcp || $[9] !== payload.paramFormatHints)
    ((A = payload.isMcp ? buildParameterRows(payload.input, payload.paramFormatHints, min) : null),
      ($[6] = min),
      ($[7] = payload.input),
      ($[8] = payload.isMcp),
      ($[9] = payload.paramFormatHints),
      ($[10] = A));
  else A = $[10];
  let T = A,
    [v] = useTheme(),
    I;
  b: {
    if (payload.renderedToolUseMessage != null) {
      let L;
      if ($[11] !== payload.renderedToolUseMessage)
        ((L = { node: payload.renderedToolUseMessage, threw: !1 }),
          ($[11] = payload.renderedToolUseMessage),
          ($[12] = L));
      else L = $[12];
      I = L;
      break b;
    }
    try {
      let E;
      if ($[13] !== payload.input || $[14] !== payload.toolName || $[15] !== v)
        ((E = UHt(payload.toolName, payload.input, { theme: v, verbose: !0 })),
          ($[13] = payload.input),
          ($[14] = payload.toolName),
          ($[15] = v),
          ($[16] = E));
      else E = $[16];
      let W;
      if ($[17] !== E) ((W = { node: E, threw: !1 }), ($[17] = E), ($[18] = W));
      else W = $[18];
      I = W;
    } catch (error) {
      let le = error;
      let E;
      if ($[19] !== payload.toolName)
        ((E =
          (logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Error rendering tool use line for ${payload.toolName}: ${le}`,
              "Error rendering tool use line (permission dialog table fallback)",
            ),
          ),
          { node: null, threw: !0 })),
          ($[19] = payload.toolName),
          ($[20] = E));
      else E = $[20];
      I = E;
    }
  }
  let { node: node, threw: threw } = I,
    L;
  if ($[21] !== node)
    ((L = typeof node === "string" ? serializeApprovalPayload(node) : null), ($[21] = node), ($[22] = L));
  else L = $[22];
  let Y = L,
    E;
  if ($[23] !== T || $[24] !== Y?.kind || $[25] !== payload.toolUseRenderFailed || $[26] !== threw)
    ((E = (T?.some(Kl) ?? !1) || payload.toolUseRenderFailed === !0 || threw || Y?.kind === "withheld"),
      ($[23] = T),
      ($[24] = Y?.kind),
      ($[25] = payload.toolUseRenderFailed),
      ($[26] = threw),
      ($[27] = E));
  else E = $[27];
  let z = E,
    W;
  if ($[28] !== payload) ((W = shouldOfferAlwaysAllow(payload)), ($[28] = payload), ($[29] = W));
  else W = $[29];
  let F = W,
    { offered: offered, enableAutoMode: enableAutoMode } = useSettingsErrors(payload.requestSource),
    de;
  if ($[30] === MEMO_CACHE_SENTINEL) ((de = getOriginalCwd()), ($[30] = de));
  else de = $[30];
  let oe = de,
    ue;
  if ($[31] !== F || $[32] !== min || $[33] !== z || $[34] !== payload)
    ((ue = F && !z ? buildToolDontAskAgainRule(payload, { cwd: oe, maxLabelWidth: min - 8 }) : null),
      ($[31] = F),
      ($[32] = min),
      ($[33] = z),
      ($[34] = payload),
      ($[35] = ue));
  else ue = $[35];
  let K = ue,
    Ne;
  if ($[36] !== payload) ((Ne = isAlwaysAllowUnavailable(payload)), ($[36] = payload), ($[37] = Ne));
  else Ne = $[37];
  let $e = Ne,
    We;
  if ($[38] !== offered || $[39] !== z || $[40] !== $e)
    ((We = offered && !z && !$e ? autoModeRow("workflow") : null),
      ($[38] = offered),
      ($[39] = z),
      ($[40] = $e),
      ($[41] = We));
  else We = $[41];
  let ae = We,
    J = payload.permissionResult.defaultToNo === !0,
    Oe;
  if (
    $[42] !== K ||
    $[43] !== answer ||
    $[44] !== enableAutoMode ||
    $[45] !== payload ||
    $[46] !== wouldTakeAnswer
  )
    ((Oe = (Ye) => {
      let { value: He, feedback: feedback } = Ye;
      if (!wouldTakeAnswer()) {
        return !1;
      }
      if (He === "yes-enable-auto-mode") enableAutoMode();
      return answer(fallbackChoiceToResult(He, payload, K, feedback));
    }),
      ($[42] = K),
      ($[43] = answer),
      ($[44] = enableAutoMode),
      ($[45] = payload),
      ($[46] = wouldTakeAnswer),
      ($[47] = Oe));
  else Oe = $[47];
  let ne = useRefusableAnswer(Oe),
    answer_2 = ne.answer,
    Ye;
  if ($[48] !== answer_2)
    ((Ye = (value, feedback) => answer_2({ value: value, feedback: feedback })),
      ($[48] = answer_2),
      ($[49] = Ye));
  else Ye = $[49];
  let qe = Ye,
    ge = ne.refused === null ? (J ? "no" : void 0) : ne.refused.value === "yes" && !J ? "yes" : "no",
    bt;
  if ($[50] !== answer) ((bt = () => answer({ behavior: "cancelled" })), ($[50] = answer), ($[51] = bt));
  else bt = $[51];
  let Ge = bt;
  const dt = typeof payload.description === "string" ? payload.description : "";
  let kt;
  if ($[52] !== dt)
    ((kt = dt
      .split(
        `
`,
      )
      .filter(Xl)
      .join(
        `
`,
      )
      .trim()),
      ($[52] = dt),
      ($[53] = kt));
  else kt = $[53];
  let Ie = kt,
    Ke;
  Tn: {
    if (Y === null) {
      Ke = node;
      break Tn;
    }
    if (Y.kind === "withheld") {
      Ke = Y.marker;
      break Tn;
    }
    let Re;
    if ($[54] !== Y.text)
      ((Re = replaceLineBreaks(Y.text).replace(/\s+/g, " ").trim()), ($[54] = Y.text), ($[55] = Re));
    else Re = $[55];
    Ke = Re;
  }
  let ye = Ke,
    Xe = payload.isMcp ? Math.max(10, min - 2) : min,
    Xi = useUnattendedNotice();
  const Re = payload.roomyDescription === !0,
    Cn = u.rows - Xi;
  let jo;
  if ($[56] !== Re || $[57] !== Cn || $[58] !== u.columns)
    ((jo = Si(Re, { columns: u.columns, rows: Cn })),
      ($[56] = Re),
      ($[57] = Cn),
      ($[58] = u.columns),
      ($[59] = jo));
  else jo = $[59];
  let $o = jo,
    zi;
  if ($[60] !== $o || $[61] !== Xe || $[62] !== Ie)
    ((zi = wrapToMaxLines(Ie, Xe, $o)), ($[60] = $o), ($[61] = Xe), ($[62] = Ie), ($[63] = zi));
  else zi = $[63];
  let ze = zi,
    Zi;
  if ($[64] !== Xe || $[65] !== Ie)
    ((Zi = wrapToMaxLines(Ie, Xe, Number.MAX_SAFE_INTEGER)), ($[64] = Xe), ($[65] = Ie), ($[66] = Zi));
  else Zi = $[66];
  let An = Zi,
    xt = An !== ze,
    [Mn, Ql] = y(!1),
    Wo = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    Qi;
  if ($[67] === MEMO_CACHE_SENTINEL)
    ((Qi = [{ action: "app:toggleTranscript", run: () => Ql(zl) }]), ($[67] = Qi));
  else Qi = $[67];
  let Jl = Qi,
    Ji;
  if ($[68] === MEMO_CACHE_SENTINEL)
    ((Ji = { label: "Yes", value: "yes", feedbackConfig: { type: "accept" } }), ($[68] = Ji));
  else Ji = $[68];
  let es = Ji,
    ts;
  if ($[69] === MEMO_CACHE_SENTINEL)
    ((ts = { label: "No", value: "no", feedbackConfig: { type: "reject" } }), ($[69] = ts));
  else ts = $[69];
  let ns = ts,
    Ft;
  if ($[70] !== K || $[71] !== ae || $[72] !== J) {
    Ft = J ? [ns, es] : [es];
    if (K !== null) {
      if (typeof K.node === "string") {
        let we;
        if ($[74] !== K.node)
          ((we = { label: K.node, value: "yes-dont-ask-again" }), ($[74] = K.node), ($[75] = we));
        else we = $[75];
        Ft.push(we);
      }
    }
    if (ae !== null) {
      if (typeof ae.node === "string") {
        let we;
        if ($[76] !== ae.node)
          ((we = { label: ae.node, description: n$n, value: "yes-enable-auto-mode" }),
            ($[76] = ae.node),
            ($[77] = we));
        else we = $[77];
        Ft.push(we);
      }
    }
    if (!J) Ft.push(ns);
    (($[70] = K), ($[71] = ae), ($[72] = J), ($[73] = Ft));
  } else Ft = $[73];
  let Rt = Ft,
    we;
  if ($[78] !== payload.toolName)
    ((we = sanitizeToolNameForAnalytics(payload.toolName)), ($[78] = payload.toolName), ($[79] = we));
  else we = $[79];
  let os;
  if ($[80] !== payload.isMcp || $[81] !== we)
    ((os = { toolName: we, isMcp: payload.isMcp }), ($[80] = payload.isMcp), ($[81] = we), ($[82] = os));
  else os = $[82];
  let wt = os,
    be = payload.toolUseRenderFailed === !0 ? void 0 : payload.card;
  if (be !== void 0 && [be.question, ...be.lines, ...be.values].reduce(Zl, 0) <= _o) {
    let is =
      payload.requestSource === void 0 &&
      !be.question.includes(`
`) &&
      bunStringWidth(be.question) <= Math.min(min, u.columns - 2);
    const St = is ? void 0 : be.question;
    let Pn;
    if ($[83] !== be || $[84] !== k || $[85] !== St || $[86] !== u.columns)
      ((Pn = cardHeaderRows({ ...be, question: St }, Math.min(k, u.columns - 6) - Eo)),
        ($[83] = be),
        ($[84] = k),
        ($[85] = St),
        ($[86] = u.columns),
        ($[87] = Pn));
    else Pn = $[87];
    let Ut = Pn;
    const Ze = is ? be.question : payload.userFacingName;
    let Le;
    if ($[88] !== Ut)
      ((Le = Ut.rows.length > 0 && e(DiffFrame, { children: e(ParameterCard, { card: Ut }) })),
        ($[88] = Ut),
        ($[89] = Le));
    else Le = $[89];
    let Qe;
    if ($[90] !== Le)
      ((Qe = e(Box, { ref: m, width: "100%", flexDirection: "column", children: Le })),
        ($[90] = Le),
        ($[91] = Qe));
    else Qe = $[91];
    const et = Ut.rows.length === 0 ? 1 : 0;
    let tt;
    if (
      $[92] !== Ge ||
      $[93] !== qe ||
      $[94] !== J ||
      $[95] !== Rt ||
      $[96] !== payload.requestSource ||
      $[97] !== ne.attempts ||
      $[98] !== ge ||
      $[99] !== wt
    )
      ((tt = e(
        PermissionPrompt,
        {
          question: null,
          options: Rt,
          defaultFocusValue: ge,
          hideIndexes: J,
          onSelect: qe,
          onCancel: Ge,
          toolAnalyticsContext: wt,
          requestSource: payload.requestSource,
        },
        ne.attempts,
      )),
        ($[92] = Ge),
        ($[93] = qe),
        ($[94] = J),
        ($[95] = Rt),
        ($[96] = payload.requestSource),
        ($[97] = ne.attempts),
        ($[98] = ge),
        ($[99] = wt),
        ($[100] = tt));
    else tt = $[100];
    let Fe;
    if ($[101] !== et || $[102] !== tt)
      ((Fe = e(Box, { paddingX: 1, marginTop: et, children: tt })),
        ($[101] = et),
        ($[102] = tt),
        ($[103] = Fe));
    else Fe = $[103];
    let ct;
    if ($[104] !== payload.requestSource || $[105] !== Ze || $[106] !== Qe || $[107] !== Fe)
      ((ct = r(PermissionDialog_2, {
        title: Ze,
        innerPaddingX: 0,
        requestSource: payload.requestSource,
        children: [Qe, Fe],
      })),
        ($[104] = payload.requestSource),
        ($[105] = Ze),
        ($[106] = Qe),
        ($[107] = Fe),
        ($[108] = ct));
    else ct = $[108];
    return ct;
  }
  let St;
  if (
    $[109] !== ze ||
    $[110] !== Mn ||
    $[111] !== xt ||
    $[112] !== Wo ||
    $[113] !== An ||
    $[114] !== T?.length ||
    $[115] !== payload.isMcp ||
    $[116] !== payload.userFacingName
  )
    ((St =
      ze !== "" &&
      r(Box, {
        width: "100%",
        flexDirection: "column",
        paddingX: 1,
        marginTop: T?.length === 0 ? 1 : 0,
        marginBottom: payload.isMcp ? 1 : 0,
        children: [
          payload.isMcp &&
            r(Text, {
              italic: !0,
              wrap: "truncate-end",
              children: ["About the ", e(Text, { bold: !0, children: payload.userFacingName }), " Tool:"],
            }),
          e(Box, {
            borderStyle: "single",
            borderLeft: !0,
            borderRight: !1,
            borderTop: !1,
            borderBottom: !1,
            borderDimColor: !0,
            paddingLeft: 1,
            children: e(Text, { dimColor: !0, italic: payload.isMcp, children: Mn ? An : ze }),
          }),
          xt &&
            e(Text, {
              dimColor: !0,
              children: e(KeyboardShortcutHint, {
                chord: Wo,
                action: Mn ? "collapse description" : "expand description",
                parens: !0,
                format: { keyCase: "lower" },
              }),
            }),
        ],
      })),
      ($[109] = ze),
      ($[110] = Mn),
      ($[111] = xt),
      ($[112] = Wo),
      ($[113] = An),
      ($[114] = T?.length),
      ($[115] = payload.isMcp),
      ($[116] = payload.userFacingName),
      ($[117] = St));
  else St = $[117];
  let _n = St;
  const requestSource = payload.requestSource;
  let Ze;
  if (
    $[118] !== ze ||
    $[119] !== _n ||
    $[120] !== T?.length ||
    $[121] !== payload.hasMcpSuffix ||
    $[122] !== payload.isMcp ||
    $[123] !== payload.userFacingName
  )
    ((Ze = payload.isMcp
      ? r(Box, {
          flexDirection: "row",
          paddingX: 1,
          marginBottom: T?.length === 0 && ze === "" ? 1 : 0,
          children: [
            e(Text, {
              wrap: "truncate-end",
              children: r(Text, { bold: !0, children: [payload.userFacingName, " Tool:"] }),
            }),
            payload.hasMcpSuffix
              ? e(Box, { flexShrink: 0, children: e(Text, { dimColor: !0, children: " (MCP)" }) })
              : null,
          ],
        })
      : _n),
      ($[118] = ze),
      ($[119] = _n),
      ($[120] = T?.length),
      ($[121] = payload.hasMcpSuffix),
      ($[122] = payload.isMcp),
      ($[123] = payload.userFacingName),
      ($[124] = Ze));
  else Ze = $[124];
  let Le;
  if (
    $[125] !== ye ||
    $[126] !== min ||
    $[127] !== T ||
    $[128] !== payload.hasMcpSuffix ||
    $[129] !== payload.userFacingName
  )
    ((Le =
      (T === null || T.length > 0) &&
      e(DiffFrame, {
        children:
          T !== null
            ? e(ToolInputEntries, { entries: T, contentColumns: min })
            : e(Blockquote, {
                multiline: typeof ye === "string" && needsGutter(`${payload.userFacingName}(${ye})`),
                children: r(Text, {
                  children: [
                    payload.userFacingName,
                    ye != null && ye !== "" && r(Fragment, { children: ["(", ye, ")"] }),
                    payload.hasMcpSuffix ? e(Text, { dimColor: !0, children: " (MCP)" }) : "",
                  ],
                }),
              }),
      })),
      ($[125] = ye),
      ($[126] = min),
      ($[127] = T),
      ($[128] = payload.hasMcpSuffix),
      ($[129] = payload.userFacingName),
      ($[130] = Le));
  else Le = $[130];
  const Qe = payload.isMcp && _n;
  let et;
  if ($[131] !== Ze || $[132] !== Le || $[133] !== Qe)
    ((et = r(Box, { ref: m, width: "100%", flexDirection: "column", children: [Ze, Le, Qe] })),
      ($[131] = Ze),
      ($[132] = Le),
      ($[133] = Qe),
      ($[134] = et));
  else et = $[134];
  const tt = payload.permissionResult.inPlaceOfClassifier === !0 ? MAX_EXPLANATION_LINES : void 0;
  let Fe;
  if ($[135] !== payload.permissionResult || $[136] !== tt)
    ((Fe = e(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget: tt,
    })),
      ($[135] = payload.permissionResult),
      ($[136] = tt),
      ($[137] = Fe));
  else Fe = $[137];
  let ct;
  if ($[138] !== K || $[139] !== payload.takesOverServerName)
    ((ct =
      payload.takesOverServerName === !0 &&
      K !== null &&
      e(Text, {
        children: `Another MCP server owns this server's name. "Don't ask again" moves the name to this server on this computer: allow rules for that name, in every project, will apply to this server, not the other one. Plain "Yes" moves nothing.`,
      })),
      ($[138] = K),
      ($[139] = payload.takesOverServerName),
      ($[140] = ct));
  else ct = $[140];
  let En;
  if ($[141] !== payload.note)
    ((En = payload.note !== void 0 && e(Text, { children: payload.note })),
      ($[141] = payload.note),
      ($[142] = En));
  else En = $[142];
  let Dn;
  if (
    $[143] !== Ge ||
    $[144] !== qe ||
    $[145] !== J ||
    $[146] !== Rt ||
    $[147] !== payload.requestSource ||
    $[148] !== ne.attempts ||
    $[149] !== ge ||
    $[150] !== wt
  )
    ((Dn = e(
      PermissionPrompt,
      {
        options: Rt,
        defaultFocusValue: ge,
        hideIndexes: J,
        onSelect: qe,
        onCancel: Ge,
        toolAnalyticsContext: wt,
        requestSource: payload.requestSource,
      },
      ne.attempts,
    )),
      ($[143] = Ge),
      ($[144] = qe),
      ($[145] = J),
      ($[146] = Rt),
      ($[147] = payload.requestSource),
      ($[148] = ne.attempts),
      ($[149] = ge),
      ($[150] = wt),
      ($[151] = Dn));
  else Dn = $[151];
  let Nn;
  if ($[152] !== Fe || $[153] !== ct || $[154] !== En || $[155] !== Dn)
    ((Nn = r(Box, { flexDirection: "column", paddingX: 1, children: [Fe, ct, En, Dn] })),
      ($[152] = Fe),
      ($[153] = ct),
      ($[154] = En),
      ($[155] = Dn),
      ($[156] = Nn));
  else Nn = $[156];
  let On;
  if ($[157] !== payload.requestSource || $[158] !== et || $[159] !== Nn)
    ((On = r(PermissionDialog_2, {
      title: "Tool use",
      innerPaddingX: 0,
      requestSource: requestSource,
      children: [et, Nn],
    })),
      ($[157] = payload.requestSource),
      ($[158] = et),
      ($[159] = Nn),
      ($[160] = On));
  else On = $[160];
  let ss;
  if ($[161] !== xt || $[162] !== On)
    ((ss = e(useDialogKeybindings, { bindings: Jl, active: xt, flexDirection: "column", children: On })),
      ($[161] = xt),
      ($[162] = On),
      ($[163] = ss));
  else ss = $[163];
  return ss;
}
//@ chunk-qgcqa405.js:301-305 placement
j();
//@ chunk-qgcqa405.js:305-337 placement
function wJe() {
  return yt(onAttacherCapsChange, supportsHyperlinks);
}

export { wJe, FallbackPermissionRequest, shouldOfferAlwaysAllow };
