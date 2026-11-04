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
import {
  init_react_production,
  useSyncExternalStore,
  useRef,
  useState,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { onAttacherCapsChange, getOriginalCwd } from "../../bootstrap/state.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import { isRemoteOrPluginAgent } from "../../utils/agentContext.js";
import { isRuleableToolName, autoModeRow } from "./consentRows.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qgcqa405.js:301-305 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qgcqa405.js:301", () => {
  init_react_production();
});
//@ chunk-qgcqa405.js:305-337 placement
/**
 * 函数 useFallbackPermission（订阅兜底权限请求）；位于「通用工具权限请求（无专用组件的工具/MCP 工具）：工具名 + 参数表格 + 允许/不再询问/拒绝选项」模块。
 */
function useFallbackPermission() {
  return useSyncExternalStore(onAttacherCapsChange, supportsHyperlinks);
}
//@ chunk-0e8j1zzj.js:44119-44356 placement
/**
 * 是否不能提供"总是允许"
 */
function isAlwaysAllowUnavailable(props) {
  let decisionReason = props.permissionResult.decisionReason;
  return (
    findSafetyCheckReason(decisionReason, (check) => !check.classifierApprovable) !== undefined ||
    props.isAskCappedByOrg ||
    props.permissionResult.inPlaceOfClassifier === true ||
    props.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(props.requestSource)
  );
}
//@ chunk-0e8j1zzj.js:44356-44421 placement
function shouldOfferAlwaysAllow(props) {
  return props.showAlwaysAllow && !isAlwaysAllowUnavailable(props) && isRuleableToolName(props.toolName);
}
//@ chunk-0e8j1zzj.js:44421-44448 layout
var FALLBACK_MIN_ROWS = 2;
var FALLBACK_MAX_ROWS = 16;
var FALLBACK_ROWS_RESERVED = 24;
var FALLBACK_MIN_COLUMNS = 80;
//@ chunk-0e8j1zzj.js:44448-44528 layout
function fallbackDialogRows(isCompact, terminalSize) {
  return isCompact && terminalSize.columns >= FALLBACK_MIN_COLUMNS
    ? Math.max(FALLBACK_MIN_ROWS, Math.min(FALLBACK_MAX_ROWS, terminalSize.rows - FALLBACK_ROWS_RESERVED))
    : FALLBACK_MIN_ROWS;
}
//@ chunk-0e8j1zzj.js:44528-54584 fingerprint (2.1.88 match: FallbackPermissionRequest, 0.322)
/**
 * 通用权限请求：渲染工具的 renderToolUseMessage 摘要（失败时退回参数表格），显示规则解释；选项允许一次/不再询问（工具级规则）/启用 auto/拒绝并反馈。
 */
function FallbackPermissionRequest(props) {
  let $ = useMemoCache(164);
  let { payload, answer, wouldTakeAnswer } = props;
  let containerRef = useRef(null);
  let terminalSize = useTerminalSize();
  let defaultWidth;
  if ($[0] !== terminalSize.columns) {
    defaultWidth = () => Math.max(20, Math.min(40, terminalSize.columns - 6));
    $[0] = terminalSize.columns;
    $[1] = defaultWidth;
  } else defaultWidth = $[1];
  let [width, setWidth] = useState(defaultWidth);
  let measureEffect;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    measureEffect = () => {
      if (containerRef.current) {
        let { width } = measureElement(containerRef.current);
        if (width > 0) setWidth(Math.max(20, width - 2));
      }
    };
    $[2] = measureEffect;
  } else measureEffect = $[2];
  let measureDeps;
  if ($[3] !== terminalSize.columns || $[4] !== terminalSize.rows) {
    measureDeps = [terminalSize.columns, terminalSize.rows];
    $[3] = terminalSize.columns;
    $[4] = terminalSize.rows;
    $[5] = measureDeps;
  } else measureDeps = $[5];
  useEffect(measureEffect, measureDeps);
  let min = Math.min(width, Math.max(20, terminalSize.columns - 6));
  let parameterRows;
  if ($[6] !== min || $[7] !== payload.input || $[8] !== payload.isMcp || $[9] !== payload.paramFormatHints) {
    parameterRows = payload.isMcp ? buildParameterRows(payload.input, payload.paramFormatHints, min) : null;
    $[6] = min;
    $[7] = payload.input;
    $[8] = payload.isMcp;
    $[9] = payload.paramFormatHints;
    $[10] = parameterRows;
  } else parameterRows = $[10];
  let parameterRows_2 = parameterRows;
  let [theme] = useTheme();
  let renderOutcome;
  b: {
    if (payload.renderedToolUseMessage != null) {
      let renderedResult;
      if ($[11] !== payload.renderedToolUseMessage) {
        renderedResult = {
          node: payload.renderedToolUseMessage,
          threw: false,
        };
        $[11] = payload.renderedToolUseMessage;
        $[12] = renderedResult;
      } else renderedResult = $[12];
      renderOutcome = renderedResult;
      break b;
    }
    try {
      let node;
      if ($[13] !== payload.input || $[14] !== payload.toolName || $[15] !== theme) {
        node = renderToolUseByName(payload.toolName, payload.input, {
          theme,
          verbose: true,
        });
        $[13] = payload.input;
        $[14] = payload.toolName;
        $[15] = theme;
        $[16] = node;
      } else node = $[16];
      let renderResult;
      if ($[17] !== node) {
        renderResult = {
          node,
          threw: false,
        };
        $[17] = node;
        $[18] = renderResult;
      } else renderResult = $[18];
      renderOutcome = renderResult;
    } catch (error) {
      let caughtError = error;
      let failedResult;
      if ($[19] !== payload.toolName) {
        failedResult =
          (logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Error rendering tool use line for ${payload.toolName}: ${caughtError}`,
              "Error rendering tool use line (permission dialog table fallback)",
            ),
          ),
          {
            node: null,
            threw: true,
          });
        $[19] = payload.toolName;
        $[20] = failedResult;
      } else failedResult = $[20];
      renderOutcome = failedResult;
    }
  }
  let { node, threw } = renderOutcome;
  let serializedNode_2;
  if ($[21] !== node) {
    serializedNode_2 = typeof node === "string" ? serializeApprovalPayload(node) : null;
    $[21] = node;
    $[22] = serializedNode_2;
  } else serializedNode_2 = $[22];
  let serializedNode = serializedNode_2;
  let isUnrenderable;
  if (
    $[23] !== parameterRows_2 ||
    $[24] !== serializedNode?.kind ||
    $[25] !== payload.toolUseRenderFailed ||
    $[26] !== threw
  ) {
    isUnrenderable =
      (parameterRows_2?.some(isUnrenderableEntry) ?? false) ||
      payload.toolUseRenderFailed === true ||
      threw ||
      serializedNode?.kind === "withheld";
    $[23] = parameterRows_2;
    $[24] = serializedNode?.kind;
    $[25] = payload.toolUseRenderFailed;
    $[26] = threw;
    $[27] = isUnrenderable;
  } else isUnrenderable = $[27];
  let isUnrenderable_2 = isUnrenderable;
  let canAlwaysAllow;
  if ($[28] !== payload) {
    canAlwaysAllow = shouldOfferAlwaysAllow(payload);
    $[28] = payload;
    $[29] = canAlwaysAllow;
  } else canAlwaysAllow = $[29];
  let canAlwaysAllow_2 = canAlwaysAllow;
  let { offered, enableAutoMode } = useSettingsErrors(payload.requestSource);
  let cwd;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    cwd = getOriginalCwd();
    $[30] = cwd;
  } else cwd = $[30];
  let cwd_2 = cwd;
  let dontAskRule;
  if ($[31] !== canAlwaysAllow_2 || $[32] !== min || $[33] !== isUnrenderable_2 || $[34] !== payload) {
    dontAskRule =
      canAlwaysAllow_2 && !isUnrenderable_2
        ? buildToolDontAskAgainRule(payload, {
            cwd: cwd_2,
            maxLabelWidth: min - 8,
          })
        : null;
    $[31] = canAlwaysAllow_2;
    $[32] = min;
    $[33] = isUnrenderable_2;
    $[34] = payload;
    $[35] = dontAskRule;
  } else dontAskRule = $[35];
  let dontAskRule_2 = dontAskRule;
  let alwaysAllowUnavailable;
  if ($[36] !== payload) {
    alwaysAllowUnavailable = isAlwaysAllowUnavailable(payload);
    $[36] = payload;
    $[37] = alwaysAllowUnavailable;
  } else alwaysAllowUnavailable = $[37];
  let alwaysAllowUnavailable_2 = alwaysAllowUnavailable;
  let autoModeRowValue;
  if ($[38] !== offered || $[39] !== isUnrenderable_2 || $[40] !== alwaysAllowUnavailable_2) {
    autoModeRowValue =
      offered && !isUnrenderable_2 && !alwaysAllowUnavailable_2 ? autoModeRow("workflow") : null;
    $[38] = offered;
    $[39] = isUnrenderable_2;
    $[40] = alwaysAllowUnavailable_2;
    $[41] = autoModeRowValue;
  } else autoModeRowValue = $[41];
  let autoModeOption = autoModeRowValue;
  let defaultToNo = payload.permissionResult.defaultToNo === true;
  let onAnswer;
  if (
    $[42] !== dontAskRule_2 ||
    $[43] !== answer ||
    $[44] !== enableAutoMode ||
    $[45] !== payload ||
    $[46] !== wouldTakeAnswer
  ) {
    onAnswer = (choice) => {
      let { value, feedback } = choice;
      if (!wouldTakeAnswer()) {
        return false;
      }
      if (value === "yes-enable-auto-mode") enableAutoMode();
      return answer(fallbackChoiceToResult(value, payload, dontAskRule_2, feedback));
    };
    $[42] = dontAskRule_2;
    $[43] = answer;
    $[44] = enableAutoMode;
    $[45] = payload;
    $[46] = wouldTakeAnswer;
    $[47] = onAnswer;
  } else onAnswer = $[47];
  let refusableAnswer = useRefusableAnswer(onAnswer);
  let answer_2 = refusableAnswer.answer;
  let onSelect;
  if ($[48] !== answer_2) {
    onSelect = (value, feedback) =>
      answer_2({
        value,
        feedback,
      });
    $[48] = answer_2;
    $[49] = onSelect;
  } else onSelect = $[49];
  let onSelect_2 = onSelect;
  let defaultFocusValue =
    refusableAnswer.refused === null
      ? defaultToNo
        ? "no"
        : undefined
      : refusableAnswer.refused.value === "yes" && !defaultToNo
        ? "yes"
        : "no";
  let onCancel;
  if ($[50] !== answer) {
    onCancel = () =>
      answer({
        behavior: "cancelled",
      });
    $[50] = answer;
    $[51] = onCancel;
  } else onCancel = $[51];
  let onCancel_2 = onCancel;
  const description = typeof payload.description === "string" ? payload.description : "";
  let descriptionText;
  if ($[52] !== description) {
    descriptionText = description
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
    $[53] = descriptionText;
  } else descriptionText = $[53];
  let descriptionText_2 = descriptionText;
  let renderedContent;
  Tn: {
    if (serializedNode === null) {
      renderedContent = node;
      break Tn;
    }
    if (serializedNode.kind === "withheld") {
      renderedContent = serializedNode.marker;
      break Tn;
    }
    let collapsedText;
    if ($[54] !== serializedNode.text) {
      collapsedText = replaceLineBreaks(serializedNode.text).replace(/\s+/g, " ").trim();
      $[54] = serializedNode.text;
      $[55] = collapsedText;
    } else collapsedText = $[55];
    renderedContent = collapsedText;
  }
  let renderedContentStable = renderedContent;
  let contentColumns = payload.isMcp ? Math.max(10, min - 2) : min;
  let unattendedNotice = useUnattendedNotice();
  const roomy = payload.roomyDescription === true;
  const rows = terminalSize.rows - unattendedNotice;
  let maxRows;
  if ($[56] !== roomy || $[57] !== rows || $[58] !== terminalSize.columns) {
    maxRows = fallbackDialogRows(roomy, {
      columns: terminalSize.columns,
      rows,
    });
    $[56] = roomy;
    $[57] = rows;
    $[58] = terminalSize.columns;
    $[59] = maxRows;
  } else maxRows = $[59];
  let maxRows_2 = maxRows;
  let wrappedLines;
  if ($[60] !== maxRows_2 || $[61] !== contentColumns || $[62] !== descriptionText_2) {
    wrappedLines = wrapToMaxLines(descriptionText_2, contentColumns, maxRows_2);
    $[60] = maxRows_2;
    $[61] = contentColumns;
    $[62] = descriptionText_2;
    $[63] = wrappedLines;
  } else wrappedLines = $[63];
  let wrappedText = wrappedLines;
  let fullLines;
  if ($[64] !== contentColumns || $[65] !== descriptionText_2) {
    fullLines = wrapToMaxLines(descriptionText_2, contentColumns, Number.MAX_SAFE_INTEGER);
    $[64] = contentColumns;
    $[65] = descriptionText_2;
    $[66] = fullLines;
  } else fullLines = $[66];
  let fullText = fullLines;
  let isTruncated = fullText !== wrappedText;
  let [isExpanded, setIsExpanded] = useState(false);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let bindings;
  if ($[67] === MEMO_CACHE_SENTINEL) {
    bindings = [
      {
        action: "app:toggleTranscript",
        run: () => setIsExpanded(isMissingEntry),
      },
    ];
    $[67] = bindings;
  } else bindings = $[67];
  let bindings_2 = bindings;
  let yesOption;
  if ($[68] === MEMO_CACHE_SENTINEL) {
    yesOption = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    $[68] = yesOption;
  } else yesOption = $[68];
  let yesOption_2 = yesOption;
  let noOption;
  if ($[69] === MEMO_CACHE_SENTINEL) {
    noOption = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    $[69] = noOption;
  } else noOption = $[69];
  let noOption_2 = noOption;
  let options;
  if ($[70] !== dontAskRule_2 || $[71] !== autoModeOption || $[72] !== defaultToNo) {
    options = defaultToNo ? [noOption_2, yesOption_2] : [yesOption_2];
    if (dontAskRule_2 !== null) {
      if (typeof dontAskRule_2.node === "string") {
        let option;
        if ($[74] !== dontAskRule_2.node) {
          option = {
            label: dontAskRule_2.node,
            value: "yes-dont-ask-again",
          };
          $[74] = dontAskRule_2.node;
          $[75] = option;
        } else option = $[75];
        options.push(option);
      }
    }
    if (autoModeOption !== null) {
      if (typeof autoModeOption.node === "string") {
        let option;
        if ($[76] !== autoModeOption.node) {
          option = {
            label: autoModeOption.node,
            description: WORKFLOW_HINT_TEXT,
            value: "yes-enable-auto-mode",
          };
          $[76] = autoModeOption.node;
          $[77] = option;
        } else option = $[77];
        options.push(option);
      }
    }
    if (!defaultToNo) options.push(noOption_2);
    $[70] = dontAskRule_2;
    $[71] = autoModeOption;
    $[72] = defaultToNo;
    $[73] = options;
  } else options = $[73];
  let options_2 = options;
  let toolName;
  if ($[78] !== payload.toolName) {
    toolName = sanitizeToolNameForAnalytics(payload.toolName);
    $[78] = payload.toolName;
    $[79] = toolName;
  } else toolName = $[79];
  let toolAnalyticsContext;
  if ($[80] !== payload.isMcp || $[81] !== toolName) {
    toolAnalyticsContext = {
      toolName,
      isMcp: payload.isMcp,
    };
    $[80] = payload.isMcp;
    $[81] = toolName;
    $[82] = toolAnalyticsContext;
  } else toolAnalyticsContext = $[82];
  let toolAnalyticsContext_2 = toolAnalyticsContext;
  let card = payload.toolUseRenderFailed === true ? undefined : payload.card;
  if (
    card !== undefined &&
    [card.question, ...card.lines, ...card.values].reduce(entryDisplayWidth, 0) <= MAX_PARAMETER_VALUE_CHARS
  ) {
    let isInlineQuestion =
      payload.requestSource === undefined &&
      !card.question.includes(`
`) &&
      bunStringWidth(card.question) <= Math.min(min, terminalSize.columns - 2);
    const question = isInlineQuestion ? undefined : card.question;
    let cardRows;
    if ($[83] !== card || $[84] !== width || $[85] !== question || $[86] !== terminalSize.columns) {
      cardRows = cardHeaderRows(
        {
          ...card,
          question,
        },
        Math.min(width, terminalSize.columns - 6) - PARAMETER_VALUE_MAX_LINES,
      );
      $[83] = card;
      $[84] = width;
      $[85] = question;
      $[86] = terminalSize.columns;
      $[87] = cardRows;
    } else cardRows = $[87];
    let cardRows_2 = cardRows;
    const title = isInlineQuestion ? card.question : payload.userFacingName;
    let children;
    if ($[88] !== cardRows_2) {
      children =
        cardRows_2.rows.length > 0 &&
        jsxProd_default(DiffFrame, {
          children: jsxProd_default(ParameterCard, {
            card: cardRows_2,
          }),
        });
      $[88] = cardRows_2;
      $[89] = children;
    } else children = $[89];
    let cardBox;
    if ($[90] !== children) {
      cardBox = jsxProd_default(Box, {
        ref: containerRef,
        width: "100%",
        flexDirection: "column",
        children,
      });
      $[90] = children;
      $[91] = cardBox;
    } else cardBox = $[91];
    const marginTop = cardRows_2.rows.length === 0 ? 1 : 0;
    let children_2;
    if (
      $[92] !== onCancel_2 ||
      $[93] !== onSelect_2 ||
      $[94] !== defaultToNo ||
      $[95] !== options_2 ||
      $[96] !== payload.requestSource ||
      $[97] !== refusableAnswer.attempts ||
      $[98] !== defaultFocusValue ||
      $[99] !== toolAnalyticsContext_2
    ) {
      children_2 = jsxProd_default(
        PermissionPrompt,
        {
          question: null,
          options: options_2,
          defaultFocusValue,
          hideIndexes: defaultToNo,
          onSelect: onSelect_2,
          onCancel: onCancel_2,
          toolAnalyticsContext: toolAnalyticsContext_2,
          requestSource: payload.requestSource,
        },
        refusableAnswer.attempts,
      );
      $[92] = onCancel_2;
      $[93] = onSelect_2;
      $[94] = defaultToNo;
      $[95] = options_2;
      $[96] = payload.requestSource;
      $[97] = refusableAnswer.attempts;
      $[98] = defaultFocusValue;
      $[99] = toolAnalyticsContext_2;
      $[100] = children_2;
    } else children_2 = $[100];
    let promptBox;
    if ($[101] !== marginTop || $[102] !== children_2) {
      promptBox = jsxProd_default(Box, {
        paddingX: 1,
        marginTop,
        children: children_2,
      });
      $[101] = marginTop;
      $[102] = children_2;
      $[103] = promptBox;
    } else promptBox = $[103];
    let dialog;
    if ($[104] !== payload.requestSource || $[105] !== title || $[106] !== cardBox || $[107] !== promptBox) {
      dialog = jsxProd_default_2(PermissionDialog_2, {
        title,
        innerPaddingX: 0,
        requestSource: payload.requestSource,
        children: [cardBox, promptBox],
      });
      $[104] = payload.requestSource;
      $[105] = title;
      $[106] = cardBox;
      $[107] = promptBox;
      $[108] = dialog;
    } else dialog = $[108];
    return dialog;
  }
  let descriptionBox;
  if (
    $[109] !== wrappedText ||
    $[110] !== isExpanded ||
    $[111] !== isTruncated ||
    $[112] !== chord ||
    $[113] !== fullText ||
    $[114] !== parameterRows_2?.length ||
    $[115] !== payload.isMcp ||
    $[116] !== payload.userFacingName
  ) {
    descriptionBox =
      wrappedText !== "" &&
      jsxProd_default_2(Box, {
        width: "100%",
        flexDirection: "column",
        paddingX: 1,
        marginTop: parameterRows_2?.length === 0 ? 1 : 0,
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
              children: isExpanded ? fullText : wrappedText,
            }),
          }),
          isTruncated &&
            jsxProd_default(Text, {
              dimColor: true,
              children: jsxProd_default(KeyboardShortcutHint, {
                chord,
                action: isExpanded ? "collapse description" : "expand description",
                parens: true,
                format: {
                  keyCase: "lower",
                },
              }),
            }),
        ],
      });
    $[109] = wrappedText;
    $[110] = isExpanded;
    $[111] = isTruncated;
    $[112] = chord;
    $[113] = fullText;
    $[114] = parameterRows_2?.length;
    $[115] = payload.isMcp;
    $[116] = payload.userFacingName;
    $[117] = descriptionBox;
  } else descriptionBox = $[117];
  let descriptionBox_2 = descriptionBox;
  const requestSource = payload.requestSource;
  let mcpHeader;
  if (
    $[118] !== wrappedText ||
    $[119] !== descriptionBox_2 ||
    $[120] !== parameterRows_2?.length ||
    $[121] !== payload.hasMcpSuffix ||
    $[122] !== payload.isMcp ||
    $[123] !== payload.userFacingName
  ) {
    mcpHeader = payload.isMcp
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          paddingX: 1,
          marginBottom: parameterRows_2?.length === 0 && wrappedText === "" ? 1 : 0,
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
      : descriptionBox_2;
    $[118] = wrappedText;
    $[119] = descriptionBox_2;
    $[120] = parameterRows_2?.length;
    $[121] = payload.hasMcpSuffix;
    $[122] = payload.isMcp;
    $[123] = payload.userFacingName;
    $[124] = mcpHeader;
  } else mcpHeader = $[124];
  let toolUseBlock;
  if (
    $[125] !== renderedContentStable ||
    $[126] !== min ||
    $[127] !== parameterRows_2 ||
    $[128] !== payload.hasMcpSuffix ||
    $[129] !== payload.userFacingName
  ) {
    toolUseBlock =
      (parameterRows_2 === null || parameterRows_2.length > 0) &&
      jsxProd_default(DiffFrame, {
        children:
          parameterRows_2 !== null
            ? jsxProd_default(ToolInputEntries, {
                entries: parameterRows_2,
                contentColumns: min,
              })
            : jsxProd_default(Blockquote, {
                multiline:
                  typeof renderedContentStable === "string" &&
                  needsGutter(`${payload.userFacingName}(${renderedContentStable})`),
                children: jsxProd_default_2(Text, {
                  children: [
                    payload.userFacingName,
                    renderedContentStable != null &&
                      renderedContentStable !== "" &&
                      jsxProd_default_2(Fragment, {
                        children: ["(", renderedContentStable, ")"],
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
    $[125] = renderedContentStable;
    $[126] = min;
    $[127] = parameterRows_2;
    $[128] = payload.hasMcpSuffix;
    $[129] = payload.userFacingName;
    $[130] = toolUseBlock;
  } else toolUseBlock = $[130];
  const mcpDescription = payload.isMcp && descriptionBox_2;
  let headerBox;
  if ($[131] !== mcpHeader || $[132] !== toolUseBlock || $[133] !== mcpDescription) {
    headerBox = jsxProd_default_2(Box, {
      ref: containerRef,
      width: "100%",
      flexDirection: "column",
      children: [mcpHeader, toolUseBlock, mcpDescription],
    });
    $[131] = mcpHeader;
    $[132] = toolUseBlock;
    $[133] = mcpDescription;
    $[134] = headerBox;
  } else headerBox = $[134];
  const rowBudget = payload.permissionResult.inPlaceOfClassifier === true ? MAX_EXPLANATION_LINES : undefined;
  let ruleExplanation;
  if ($[135] !== payload.permissionResult || $[136] !== rowBudget) {
    ruleExplanation = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType: "tool",
      rowBudget,
    });
    $[135] = payload.permissionResult;
    $[136] = rowBudget;
    $[137] = ruleExplanation;
  } else ruleExplanation = $[137];
  let takeoverNotice;
  if ($[138] !== dontAskRule_2 || $[139] !== payload.takesOverServerName) {
    takeoverNotice =
      payload.takesOverServerName === true &&
      dontAskRule_2 !== null &&
      jsxProd_default(Text, {
        children: `Another MCP server owns this server's name. "Don't ask again" moves the name to this server on this computer: allow rules for that name, in every project, will apply to this server, not the other one. Plain "Yes" moves nothing.`,
      });
    $[138] = dontAskRule_2;
    $[139] = payload.takesOverServerName;
    $[140] = takeoverNotice;
  } else takeoverNotice = $[140];
  let noteText;
  if ($[141] !== payload.note) {
    noteText =
      payload.note !== undefined &&
      jsxProd_default(Text, {
        children: payload.note,
      });
    $[141] = payload.note;
    $[142] = noteText;
  } else noteText = $[142];
  let permissionPrompt;
  if (
    $[143] !== onCancel_2 ||
    $[144] !== onSelect_2 ||
    $[145] !== defaultToNo ||
    $[146] !== options_2 ||
    $[147] !== payload.requestSource ||
    $[148] !== refusableAnswer.attempts ||
    $[149] !== defaultFocusValue ||
    $[150] !== toolAnalyticsContext_2
  ) {
    permissionPrompt = jsxProd_default(
      PermissionPrompt,
      {
        options: options_2,
        defaultFocusValue,
        hideIndexes: defaultToNo,
        onSelect: onSelect_2,
        onCancel: onCancel_2,
        toolAnalyticsContext: toolAnalyticsContext_2,
        requestSource: payload.requestSource,
      },
      refusableAnswer.attempts,
    );
    $[143] = onCancel_2;
    $[144] = onSelect_2;
    $[145] = defaultToNo;
    $[146] = options_2;
    $[147] = payload.requestSource;
    $[148] = refusableAnswer.attempts;
    $[149] = defaultFocusValue;
    $[150] = toolAnalyticsContext_2;
    $[151] = permissionPrompt;
  } else permissionPrompt = $[151];
  let bodyBox;
  if (
    $[152] !== ruleExplanation ||
    $[153] !== takeoverNotice ||
    $[154] !== noteText ||
    $[155] !== permissionPrompt
  ) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [ruleExplanation, takeoverNotice, noteText, permissionPrompt],
    });
    $[152] = ruleExplanation;
    $[153] = takeoverNotice;
    $[154] = noteText;
    $[155] = permissionPrompt;
    $[156] = bodyBox;
  } else bodyBox = $[156];
  let children;
  if ($[157] !== payload.requestSource || $[158] !== headerBox || $[159] !== bodyBox) {
    children = jsxProd_default_2(PermissionDialog_2, {
      title: "Tool use",
      innerPaddingX: 0,
      requestSource,
      children: [headerBox, bodyBox],
    });
    $[157] = payload.requestSource;
    $[158] = headerBox;
    $[159] = bodyBox;
    $[160] = children;
  } else children = $[160];
  let dialogElement;
  if ($[161] !== isTruncated || $[162] !== children) {
    dialogElement = jsxProd_default(useDialogKeybindings, {
      bindings: bindings_2,
      active: isTruncated,
      flexDirection: "column",
      children,
    });
    $[161] = isTruncated;
    $[162] = children;
    $[163] = dialogElement;
  } else dialogElement = $[163];
  return dialogElement;
}
export { useFallbackPermission, FallbackPermissionRequest, shouldOfferAlwaysAllow };
