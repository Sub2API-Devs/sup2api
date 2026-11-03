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
import { R, y, P, init_react_production, yt } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import {
  buildParameterRows,
  MAX_PARAMETER_VALUE_CHARS,
  cardHeaderRows,
  PARAMETER_VALUE_MAX_LINES,
  ParameterCard,
} from "./ToolParameterDisplay.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { renderToolUseByName } from "../messages/toolUseRenderers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  serializeApprovalPayload,
  replaceLineBreaks,
  needsGutter,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  isUnrenderableEntry,
  buildToolDontAskAgainRule,
  fallbackChoiceToResult,
  describeToolInputEntry,
  isMissingEntry,
  entryDisplayWidth,
  ToolInputEntries,
} from "./ToolInputEntries.js";
import { useSettingsErrors, WORKFLOW_HINT_TEXT } from "../../hooks/notifs/useSettingsErrors.js";
import { getOriginalCwd, onAttacherCapsChange } from "../../bootstrap/state.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useUnattendedNotice } from "./UnattendedAutoBlockNotice.js";
import { wrapToMaxLines } from "../../utils/format.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PermissionPrompt } from "./PermissionPrompt.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Blockquote } from "../Blockquote.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "./PermissionRuleExplanation.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";

//@ chunk-0e8j1zzj.js:44119-44356 placement
/**
 * 是否不能提供"总是允许"
 */
function isAlwaysAllowUnavailable(o) {
  let decisionReason = o.permissionResult.decisionReason;
  return (
    findSafetyCheckReason(decisionReason, (c) => !c.classifierApprovable) !== undefined ||
    o.isAskCappedByOrg ||
    o.permissionResult.inPlaceOfClassifier === true ||
    o.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(o.requestSource)
  );
}
//@ chunk-0e8j1zzj.js:44356-44421 placement
function shouldOfferAlwaysAllow(payload) {
  return (
    payload.showAlwaysAllow && !isAlwaysAllowUnavailable(payload) && isRuleableToolName(payload.toolName)
  );
}
//@ chunk-0e8j1zzj.js:44421-44448 layout
var FALLBACK_MIN_ROWS = 2;
var FALLBACK_MAX_ROWS = 16;
var FALLBACK_ROWS_RESERVED = 24;
var FALLBACK_MIN_COLUMNS = 80;
//@ chunk-0e8j1zzj.js:44448-44528 layout
function fallbackDialogRows(o, t) {
  return o && t.columns >= FALLBACK_MIN_COLUMNS
    ? Math.max(FALLBACK_MIN_ROWS, Math.min(FALLBACK_MAX_ROWS, t.rows - FALLBACK_ROWS_RESERVED))
    : FALLBACK_MIN_ROWS;
}
//@ chunk-0e8j1zzj.js:44528-54584 fingerprint = FallbackPermissionRequest (0.322)
/**
 * 通用权限请求：渲染工具的 renderToolUseMessage 摘要（失败时退回参数表格），显示规则解释；选项允许一次/不再询问（工具级规则）/启用 auto/拒绝并反馈。
 */
function FallbackPermissionRequest(props) {
  let $ = w(164);
  let { payload, answer, wouldTakeAnswer } = props;
  let m = R(null);
  let terminalSize = useTerminalSize();
  let h;
  if ($[0] !== terminalSize.columns) {
    h = () => Math.max(20, Math.min(40, terminalSize.columns - 6));
    $[0] = terminalSize.columns;
    $[1] = h;
  } else h = $[1];
  let [k, f] = y(h);
  let g;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    g = () => {
      if (m.current) {
        let { width } = measureElement(m.current);
        if (width > 0) f(Math.max(20, width - 2));
      }
    };
    $[2] = g;
  } else g = $[2];
  let N;
  if ($[3] !== terminalSize.columns || $[4] !== terminalSize.rows) {
    N = [terminalSize.columns, terminalSize.rows];
    $[3] = terminalSize.columns;
    $[4] = terminalSize.rows;
    $[5] = N;
  } else N = $[5];
  P(g, N);
  let min = Math.min(k, Math.max(20, terminalSize.columns - 6));
  let A;
  if ($[6] !== min || $[7] !== payload.input || $[8] !== payload.isMcp || $[9] !== payload.paramFormatHints) {
    A = payload.isMcp ? buildParameterRows(payload.input, payload.paramFormatHints, min) : null;
    $[6] = min;
    $[7] = payload.input;
    $[8] = payload.isMcp;
    $[9] = payload.paramFormatHints;
    $[10] = A;
  } else A = $[10];
  let T = A;
  let [v] = useTheme();
  let I;
  b: {
    if (payload.renderedToolUseMessage != null) {
      let L;
      if ($[11] !== payload.renderedToolUseMessage) {
        L = {
          node: payload.renderedToolUseMessage,
          threw: false,
        };
        $[11] = payload.renderedToolUseMessage;
        $[12] = L;
      } else L = $[12];
      I = L;
      break b;
    }
    try {
      let node;
      if ($[13] !== payload.input || $[14] !== payload.toolName || $[15] !== v) {
        node = renderToolUseByName(payload.toolName, payload.input, {
          theme: v,
          verbose: true,
        });
        $[13] = payload.input;
        $[14] = payload.toolName;
        $[15] = v;
        $[16] = node;
      } else node = $[16];
      let W;
      if ($[17] !== node) {
        W = {
          node,
          threw: false,
        };
        $[17] = node;
        $[18] = W;
      } else W = $[18];
      I = W;
    } catch (error) {
      let le = error;
      let E;
      if ($[19] !== payload.toolName) {
        E =
          (logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Error rendering tool use line for ${payload.toolName}: ${le}`,
              "Error rendering tool use line (permission dialog table fallback)",
            ),
          ),
          {
            node: null,
            threw: true,
          });
        $[19] = payload.toolName;
        $[20] = E;
      } else E = $[20];
      I = E;
    }
  }
  let { node, threw } = I;
  let L;
  if ($[21] !== node) {
    L = typeof node === "string" ? serializeApprovalPayload(node) : null;
    $[21] = node;
    $[22] = L;
  } else L = $[22];
  let Y = L;
  let E;
  if ($[23] !== T || $[24] !== Y?.kind || $[25] !== payload.toolUseRenderFailed || $[26] !== threw) {
    E =
      (T?.some(isUnrenderableEntry) ?? false) ||
      payload.toolUseRenderFailed === true ||
      threw ||
      Y?.kind === "withheld";
    $[23] = T;
    $[24] = Y?.kind;
    $[25] = payload.toolUseRenderFailed;
    $[26] = threw;
    $[27] = E;
  } else E = $[27];
  let z = E;
  let W;
  if ($[28] !== payload) {
    W = shouldOfferAlwaysAllow(payload);
    $[28] = payload;
    $[29] = W;
  } else W = $[29];
  let F = W;
  let { offered, enableAutoMode } = useSettingsErrors(payload.requestSource);
  let de;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    de = getOriginalCwd();
    $[30] = de;
  } else de = $[30];
  let cwd = de;
  let ue;
  if ($[31] !== F || $[32] !== min || $[33] !== z || $[34] !== payload) {
    ue =
      F && !z
        ? buildToolDontAskAgainRule(payload, {
            cwd,
            maxLabelWidth: min - 8,
          })
        : null;
    $[31] = F;
    $[32] = min;
    $[33] = z;
    $[34] = payload;
    $[35] = ue;
  } else ue = $[35];
  let K = ue;
  let Ne;
  if ($[36] !== payload) {
    Ne = isAlwaysAllowUnavailable(payload);
    $[36] = payload;
    $[37] = Ne;
  } else Ne = $[37];
  let $e = Ne;
  let We;
  if ($[38] !== offered || $[39] !== z || $[40] !== $e) {
    We = offered && !z && !$e ? autoModeRow("workflow") : null;
    $[38] = offered;
    $[39] = z;
    $[40] = $e;
    $[41] = We;
  } else We = $[41];
  let ae = We;
  let J = payload.permissionResult.defaultToNo === true;
  let Oe;
  if (
    $[42] !== K ||
    $[43] !== answer ||
    $[44] !== enableAutoMode ||
    $[45] !== payload ||
    $[46] !== wouldTakeAnswer
  ) {
    Oe = (Ye) => {
      let { value: He, feedback } = Ye;
      if (!wouldTakeAnswer()) {
        return false;
      }
      if (He === "yes-enable-auto-mode") enableAutoMode();
      return answer(fallbackChoiceToResult(He, payload, K, feedback));
    };
    $[42] = K;
    $[43] = answer;
    $[44] = enableAutoMode;
    $[45] = payload;
    $[46] = wouldTakeAnswer;
    $[47] = Oe;
  } else Oe = $[47];
  let refusableAnswer = useRefusableAnswer(Oe);
  let answer_2 = refusableAnswer.answer;
  let Ye;
  if ($[48] !== answer_2) {
    Ye = (value, feedback) =>
      answer_2({
        value,
        feedback,
      });
    $[48] = answer_2;
    $[49] = Ye;
  } else Ye = $[49];
  let onSelect = Ye;
  let defaultFocusValue =
    refusableAnswer.refused === null
      ? J
        ? "no"
        : undefined
      : refusableAnswer.refused.value === "yes" && !J
        ? "yes"
        : "no";
  let bt;
  if ($[50] !== answer) {
    bt = () =>
      answer({
        behavior: "cancelled",
      });
    $[50] = answer;
    $[51] = bt;
  } else bt = $[51];
  let onCancel = bt;
  const description = typeof payload.description === "string" ? payload.description : "";
  let kt;
  if ($[52] !== description) {
    kt = description
      .split(
        `
`,
      )
      .filter(describeToolInputEntry)
      .join(
        `
`,
      )
      .trim();
    $[52] = description;
    $[53] = kt;
  } else kt = $[53];
  let Ie = kt;
  let Ke;
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
    if ($[54] !== Y.text) {
      Re = replaceLineBreaks(Y.text).replace(/\s+/g, " ").trim();
      $[54] = Y.text;
      $[55] = Re;
    } else Re = $[55];
    Ke = Re;
  }
  let ye = Ke;
  let Xe = payload.isMcp ? Math.max(10, min - 2) : min;
  let unattendedNotice = useUnattendedNotice();
  const Re = payload.roomyDescription === true;
  const rows = terminalSize.rows - unattendedNotice;
  let jo;
  if ($[56] !== Re || $[57] !== rows || $[58] !== terminalSize.columns) {
    jo = fallbackDialogRows(Re, {
      columns: terminalSize.columns,
      rows,
    });
    $[56] = Re;
    $[57] = rows;
    $[58] = terminalSize.columns;
    $[59] = jo;
  } else jo = $[59];
  let $o = jo;
  let zi;
  if ($[60] !== $o || $[61] !== Xe || $[62] !== Ie) {
    zi = wrapToMaxLines(Ie, Xe, $o);
    $[60] = $o;
    $[61] = Xe;
    $[62] = Ie;
    $[63] = zi;
  } else zi = $[63];
  let ze = zi;
  let Zi;
  if ($[64] !== Xe || $[65] !== Ie) {
    Zi = wrapToMaxLines(Ie, Xe, Number.MAX_SAFE_INTEGER);
    $[64] = Xe;
    $[65] = Ie;
    $[66] = Zi;
  } else Zi = $[66];
  let An = Zi;
  let xt = An !== ze;
  let [Mn, Ql] = y(false);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let Qi;
  if ($[67] === MEMO_CACHE_SENTINEL) {
    Qi = [
      {
        action: "app:toggleTranscript",
        run: () => Ql(isMissingEntry),
      },
    ];
    $[67] = Qi;
  } else Qi = $[67];
  let bindings = Qi;
  let Ji;
  if ($[68] === MEMO_CACHE_SENTINEL) {
    Ji = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    $[68] = Ji;
  } else Ji = $[68];
  let es = Ji;
  let ts;
  if ($[69] === MEMO_CACHE_SENTINEL) {
    ts = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    $[69] = ts;
  } else ts = $[69];
  let ns = ts;
  let Ft;
  if ($[70] !== K || $[71] !== ae || $[72] !== J) {
    Ft = J ? [ns, es] : [es];
    if (K !== null) {
      if (typeof K.node === "string") {
        let we;
        if ($[74] !== K.node) {
          we = {
            label: K.node,
            value: "yes-dont-ask-again",
          };
          $[74] = K.node;
          $[75] = we;
        } else we = $[75];
        Ft.push(we);
      }
    }
    if (ae !== null) {
      if (typeof ae.node === "string") {
        let we;
        if ($[76] !== ae.node) {
          we = {
            label: ae.node,
            description: WORKFLOW_HINT_TEXT,
            value: "yes-enable-auto-mode",
          };
          $[76] = ae.node;
          $[77] = we;
        } else we = $[77];
        Ft.push(we);
      }
    }
    if (!J) Ft.push(ns);
    $[70] = K;
    $[71] = ae;
    $[72] = J;
    $[73] = Ft;
  } else Ft = $[73];
  let options = Ft;
  let toolName;
  if ($[78] !== payload.toolName) {
    toolName = sanitizeToolNameForAnalytics(payload.toolName);
    $[78] = payload.toolName;
    $[79] = toolName;
  } else toolName = $[79];
  let os;
  if ($[80] !== payload.isMcp || $[81] !== toolName) {
    os = {
      toolName,
      isMcp: payload.isMcp,
    };
    $[80] = payload.isMcp;
    $[81] = toolName;
    $[82] = os;
  } else os = $[82];
  let toolAnalyticsContext = os;
  let card = payload.toolUseRenderFailed === true ? undefined : payload.card;
  if (
    card !== undefined &&
    [card.question, ...card.lines, ...card.values].reduce(entryDisplayWidth, 0) <= MAX_PARAMETER_VALUE_CHARS
  ) {
    let is =
      payload.requestSource === undefined &&
      !card.question.includes(`
`) &&
      bunStringWidth(card.question) <= Math.min(min, terminalSize.columns - 2);
    const question = is ? undefined : card.question;
    let Pn;
    if ($[83] !== card || $[84] !== k || $[85] !== question || $[86] !== terminalSize.columns) {
      Pn = cardHeaderRows(
        {
          ...card,
          question,
        },
        Math.min(k, terminalSize.columns - 6) - PARAMETER_VALUE_MAX_LINES,
      );
      $[83] = card;
      $[84] = k;
      $[85] = question;
      $[86] = terminalSize.columns;
      $[87] = Pn;
    } else Pn = $[87];
    let Ut = Pn;
    const title = is ? card.question : payload.userFacingName;
    let children;
    if ($[88] !== Ut) {
      children =
        Ut.rows.length > 0 &&
        jsxProd_default(DiffFrame, {
          children: jsxProd_default(ParameterCard, {
            card: Ut,
          }),
        });
      $[88] = Ut;
      $[89] = children;
    } else children = $[89];
    let Qe;
    if ($[90] !== children) {
      Qe = jsxProd_default(Box, {
        ref: m,
        width: "100%",
        flexDirection: "column",
        children,
      });
      $[90] = children;
      $[91] = Qe;
    } else Qe = $[91];
    const marginTop = Ut.rows.length === 0 ? 1 : 0;
    let children_2;
    if (
      $[92] !== onCancel ||
      $[93] !== onSelect ||
      $[94] !== J ||
      $[95] !== options ||
      $[96] !== payload.requestSource ||
      $[97] !== refusableAnswer.attempts ||
      $[98] !== defaultFocusValue ||
      $[99] !== toolAnalyticsContext
    ) {
      children_2 = jsxProd_default(
        PermissionPrompt,
        {
          question: null,
          options,
          defaultFocusValue,
          hideIndexes: J,
          onSelect,
          onCancel,
          toolAnalyticsContext,
          requestSource: payload.requestSource,
        },
        refusableAnswer.attempts,
      );
      $[92] = onCancel;
      $[93] = onSelect;
      $[94] = J;
      $[95] = options;
      $[96] = payload.requestSource;
      $[97] = refusableAnswer.attempts;
      $[98] = defaultFocusValue;
      $[99] = toolAnalyticsContext;
      $[100] = children_2;
    } else children_2 = $[100];
    let Fe;
    if ($[101] !== marginTop || $[102] !== children_2) {
      Fe = jsxProd_default(Box, {
        paddingX: 1,
        marginTop,
        children: children_2,
      });
      $[101] = marginTop;
      $[102] = children_2;
      $[103] = Fe;
    } else Fe = $[103];
    let ct;
    if ($[104] !== payload.requestSource || $[105] !== title || $[106] !== Qe || $[107] !== Fe) {
      ct = jsxProd_default_2(PermissionDialog_2, {
        title,
        innerPaddingX: 0,
        requestSource: payload.requestSource,
        children: [Qe, Fe],
      });
      $[104] = payload.requestSource;
      $[105] = title;
      $[106] = Qe;
      $[107] = Fe;
      $[108] = ct;
    } else ct = $[108];
    return ct;
  }
  let St;
  if (
    $[109] !== ze ||
    $[110] !== Mn ||
    $[111] !== xt ||
    $[112] !== chord ||
    $[113] !== An ||
    $[114] !== T?.length ||
    $[115] !== payload.isMcp ||
    $[116] !== payload.userFacingName
  ) {
    St =
      ze !== "" &&
      jsxProd_default_2(Box, {
        width: "100%",
        flexDirection: "column",
        paddingX: 1,
        marginTop: T?.length === 0 ? 1 : 0,
        marginBottom: payload.isMcp ? 1 : 0,
        children: [
          payload.isMcp &&
            jsxProd_default_2(Text, {
              italic: true,
              wrap: "truncate-end",
              children: [
                "About the ",
                jsxProd_default(Text, {
                  bold: true,
                  children: payload.userFacingName,
                }),
                " Tool:",
              ],
            }),
          jsxProd_default(Box, {
            borderStyle: "single",
            borderLeft: true,
            borderRight: false,
            borderTop: false,
            borderBottom: false,
            borderDimColor: true,
            paddingLeft: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              italic: payload.isMcp,
              children: Mn ? An : ze,
            }),
          }),
          xt &&
            jsxProd_default(Text, {
              dimColor: true,
              children: jsxProd_default(KeyboardShortcutHint, {
                chord,
                action: Mn ? "collapse description" : "expand description",
                parens: true,
                format: {
                  keyCase: "lower",
                },
              }),
            }),
        ],
      });
    $[109] = ze;
    $[110] = Mn;
    $[111] = xt;
    $[112] = chord;
    $[113] = An;
    $[114] = T?.length;
    $[115] = payload.isMcp;
    $[116] = payload.userFacingName;
    $[117] = St;
  } else St = $[117];
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
  ) {
    Ze = payload.isMcp
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          paddingX: 1,
          marginBottom: T?.length === 0 && ze === "" ? 1 : 0,
          children: [
            jsxProd_default(Text, {
              wrap: "truncate-end",
              children: jsxProd_default_2(Text, {
                bold: true,
                children: [payload.userFacingName, " Tool:"],
              }),
            }),
            payload.hasMcpSuffix
              ? jsxProd_default(Box, {
                  flexShrink: 0,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: " (MCP)",
                  }),
                })
              : null,
          ],
        })
      : _n;
    $[118] = ze;
    $[119] = _n;
    $[120] = T?.length;
    $[121] = payload.hasMcpSuffix;
    $[122] = payload.isMcp;
    $[123] = payload.userFacingName;
    $[124] = Ze;
  } else Ze = $[124];
  let Le;
  if (
    $[125] !== ye ||
    $[126] !== min ||
    $[127] !== T ||
    $[128] !== payload.hasMcpSuffix ||
    $[129] !== payload.userFacingName
  ) {
    Le =
      (T === null || T.length > 0) &&
      jsxProd_default(DiffFrame, {
        children:
          T !== null
            ? jsxProd_default(ToolInputEntries, {
                entries: T,
                contentColumns: min,
              })
            : jsxProd_default(Blockquote, {
                multiline: typeof ye === "string" && needsGutter(`${payload.userFacingName}(${ye})`),
                children: jsxProd_default_2(Text, {
                  children: [
                    payload.userFacingName,
                    ye != null &&
                      ye !== "" &&
                      jsxProd_default_2(Fragment, {
                        children: ["(", ye, ")"],
                      }),
                    payload.hasMcpSuffix
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: " (MCP)",
                        })
                      : "",
                  ],
                }),
              }),
      });
    $[125] = ye;
    $[126] = min;
    $[127] = T;
    $[128] = payload.hasMcpSuffix;
    $[129] = payload.userFacingName;
    $[130] = Le;
  } else Le = $[130];
  const Qe = payload.isMcp && _n;
  let et;
  if ($[131] !== Ze || $[132] !== Le || $[133] !== Qe) {
    et = jsxProd_default_2(Box, {
      ref: m,
      width: "100%",
      flexDirection: "column",
      children: [Ze, Le, Qe],
    });
    $[131] = Ze;
    $[132] = Le;
    $[133] = Qe;
    $[134] = et;
  } else et = $[134];
  const rowBudget = payload.permissionResult.inPlaceOfClassifier === true ? MAX_EXPLANATION_LINES : undefined;
  let Fe;
  if ($[135] !== payload.permissionResult || $[136] !== rowBudget) {
    Fe = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget,
    });
    $[135] = payload.permissionResult;
    $[136] = rowBudget;
    $[137] = Fe;
  } else Fe = $[137];
  let ct;
  if ($[138] !== K || $[139] !== payload.takesOverServerName) {
    ct =
      payload.takesOverServerName === true &&
      K !== null &&
      jsxProd_default(Text, {
        children: `Another MCP server owns this server's name. "Don't ask again" moves the name to this server on this computer: allow rules for that name, in every project, will apply to this server, not the other one. Plain "Yes" moves nothing.`,
      });
    $[138] = K;
    $[139] = payload.takesOverServerName;
    $[140] = ct;
  } else ct = $[140];
  let En;
  if ($[141] !== payload.note) {
    En =
      payload.note !== undefined &&
      jsxProd_default(Text, {
        children: payload.note,
      });
    $[141] = payload.note;
    $[142] = En;
  } else En = $[142];
  let Dn;
  if (
    $[143] !== onCancel ||
    $[144] !== onSelect ||
    $[145] !== J ||
    $[146] !== options ||
    $[147] !== payload.requestSource ||
    $[148] !== refusableAnswer.attempts ||
    $[149] !== defaultFocusValue ||
    $[150] !== toolAnalyticsContext
  ) {
    Dn = jsxProd_default(
      PermissionPrompt,
      {
        options,
        defaultFocusValue,
        hideIndexes: J,
        onSelect,
        onCancel,
        toolAnalyticsContext,
        requestSource: payload.requestSource,
      },
      refusableAnswer.attempts,
    );
    $[143] = onCancel;
    $[144] = onSelect;
    $[145] = J;
    $[146] = options;
    $[147] = payload.requestSource;
    $[148] = refusableAnswer.attempts;
    $[149] = defaultFocusValue;
    $[150] = toolAnalyticsContext;
    $[151] = Dn;
  } else Dn = $[151];
  let Nn;
  if ($[152] !== Fe || $[153] !== ct || $[154] !== En || $[155] !== Dn) {
    Nn = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [Fe, ct, En, Dn],
    });
    $[152] = Fe;
    $[153] = ct;
    $[154] = En;
    $[155] = Dn;
    $[156] = Nn;
  } else Nn = $[156];
  let children;
  if ($[157] !== payload.requestSource || $[158] !== et || $[159] !== Nn) {
    children = jsxProd_default_2(PermissionDialog_2, {
      title: "Tool use",
      innerPaddingX: 0,
      requestSource,
      children: [et, Nn],
    });
    $[157] = payload.requestSource;
    $[158] = et;
    $[159] = Nn;
    $[160] = children;
  } else children = $[160];
  let ss;
  if ($[161] !== xt || $[162] !== children) {
    ss = jsxProd_default(useDialogKeybindings, {
      bindings,
      active: xt,
      flexDirection: "column",
      children,
    });
    $[161] = xt;
    $[162] = children;
    $[163] = ss;
  } else ss = $[163];
  return ss;
}
//@ chunk-qgcqa405.js:301-305 placement
init_react_production();
//@ chunk-qgcqa405.js:305-337 placement
/**
 * 函数 useFallbackPermission（订阅兜底权限请求）；位于「通用工具权限请求（无专用组件的工具/MCP 工具）：工具名 + 参数表格 + 允许/不再询问/拒绝选项」模块。
 */
function useFallbackPermission() {
  return yt(onAttacherCapsChange, supportsHyperlinks);
}
export { useFallbackPermission, FallbackPermissionRequest, shouldOfferAlwaysAllow };
