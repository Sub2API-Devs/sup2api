/**
 * components/dialogs/PermissionPromptDialog.tsx
 *
 * 通用权限提示对话框：按宽度排版载荷与工具调用行，处理 auto 模式与熔断拒绝文案（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 */
import {
  getWrittenPaths,
  getLocatedPaths,
  NAME_DISCLAIMER,
  BULLET,
} from "../../utils/permissions/confusableNameMarkers.js";
import {
  cwdMatches,
  pathMatches,
  collectPathsDeep,
  heldLineMask,
  MAX_BRIDGE_MEMBERS,
  MAX_BRIDGE_HEADER_ROWS,
  MAX_BRIDGE_INIT_FAILURES,
  tooShortAdvice,
  FILES_TOO_LONG_MESSAGE,
  NO_FILES_DECLARED_MESSAGE,
  TERMINAL_TOO_SHORT_MESSAGE,
  PROCEED_QUESTION,
} from "../../hooks/useReplBridge.js";
import { MAX_VISIBLE_ITEMS } from "../permissions/wrapWidth.js";
import { useRef, useState, useEffect, useMemo } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { measureElement, topWithin } from "../../ink/hooks/useTerminalHooks.js";
import {
  buildParameterRows,
  VALUE_WRAP_WIDTH,
  MAX_PARAMETER_VALUE_CHARS,
  cardHeaderRows,
  PARAMETER_VALUE_MAX_LINES,
  ParameterCard,
} from "../permissions/ToolParameterDisplay.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { renderToolUseByName } from "../messages/toolUseRenderers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  serializeApprovalPayload,
  displayField,
  hasVisibleText,
  replaceLineBreaks,
  needsGutter,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  shouldOfferAlwaysAllow as shouldOfferAlwaysAllow_2,
  isAlwaysAllowUnavailable,
  fallbackDialogRows,
  FallbackPermissionRequest,
} from "../permissions/FallbackPermissionRequest.js";
import { useSettingsErrors, WORKFLOW_HINT_TEXT } from "../../hooks/notifs/useSettingsErrors.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  buildToolDontAskAgainRule,
  fallbackChoiceToResult,
  ToolInputEntries,
} from "../permissions/ToolInputEntries.js";
import { autoModeRow } from "../permissions/consentRows.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import { FittedOfferBody, useOfferRoom } from "../AutocompactOfferDialog.js";
import { useMeasured } from "../../ink/components/Input.js";
import { useScrollColumnContext } from "../design-system/ScrollColumn.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useUnattendedNotice } from "../permissions/UnattendedAutoBlockNotice.js";
import { wrapToMaxLines } from "../../utils/format.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint, KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { permissionChoicePrompt } from "../permissions/PermissionPrompt.js";
import { Blockquote } from "../Blockquote.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { formatHiddenRowsHint } from "../permissions/BashPermissionRequest/commandDisplay.js";
import {
  PermissionRuleExplanation,
  MAX_EXPLANATION_LINES,
} from "../permissions/PermissionRuleExplanation.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";

//@ chunk-czq1j3j2.js:1419775-1419808 placement
var WINDOWS_PATH_RE = /^\s*[A-Za-z]:(?![\\/])/;
//@ chunk-czq1j3j2.js:1419808-1421008 placement
function classifyHeldFiles(input, text) {
  let writtenPaths = getWrittenPaths(text);
  let keptPaths = getLocatedPaths(text);
  if (writtenPaths === undefined || keptPaths === undefined) return "unknown";
  let allowedPaths = [...writtenPaths, ...keptPaths];
  if (allowedPaths.length === 0 || input === null || typeof input !== "object" || Array.isArray(input))
    return;
  let heldByIndex = new Map();
  let seenPaths = new Set();
  try {
    if (Object.keys(input).some((key) => cwdMatches(key, allowedPaths))) return "unknown";
    let values = Object.values(input);
    for (let [index, value] of values.entries()) {
      if (typeof value === "string") {
        if (WINDOWS_PATH_RE.test(value)) return "unknown";
        let matches = pathMatches(value, allowedPaths);
        if (matches === "unknown") return "unknown";
        if (matches.length > 0) heldByIndex.set(index, "whole");
        for (let match of matches) seenPaths.add(match);
        continue;
      }
      let length = Array.isArray(value) ? value.length : undefined;
      if (!Array.isArray(value) || typeof length !== "number" || !(length <= MAX_VISIBLE_ITEMS)) {
        let matches = collectPathsDeep(value, allowedPaths);
        if (matches === "unknown") return "unknown";
        if (matches.length > 0) heldByIndex.set(index, "whole");
        for (let match of matches) seenPaths.add(match);
        continue;
      }
      let heldPlaces = new Set();
      let hasNonString = false;
      for (let idx = 0; idx < length; idx++) {
        let item = value[idx];
        if (typeof item === "string" && WINDOWS_PATH_RE.test(item)) return "unknown";
        let matches =
          typeof item === "string" ? pathMatches(item, allowedPaths) : collectPathsDeep(item, allowedPaths);
        if (matches === "unknown") return "unknown";
        if (matches.length > 0) {
          heldPlaces.add(idx);
          hasNonString ||= typeof item !== "string";
        }
        for (let match of matches) seenPaths.add(match);
      }
      if (hasNonString) heldByIndex.set(index, "whole");
      else if (heldPlaces.size > 0)
        heldByIndex.set(index, {
          members: length,
          places: heldPlaces,
        });
    }
    if (writtenPaths.length === 0 && heldByIndex.size === 0) return;
    return writtenPaths.every((path) => seenPaths.has(path))
      ? {
          count: values.length,
          held: heldByIndex,
        }
      : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-czq1j3j2.js:1423928-1424049 placement
/**
 * 算出权限载荷里被拒绝原因的说明段落在第几行结束，供表格渲染切分。
 */
function findPromptBodyEnd(text) {
  let lines = text.split(`
`);
  let index = lines.findIndex(
    (line, index) => index > 0 && (/^(?:\* )?"/.test(line) || line === NAME_DISCLAIMER),
  );
  return index === -1 ? lines.length : index;
}
//@ chunk-czq1j3j2.js:1424049-1433929 placement
/**
 * 通用权限提示对话框：按终端宽度排版载荷与选项、渲染工具调用行（含表格兜底），处理 auto 模式与熔断拒绝的文案。
 */
function PermissionPromptBody({ payload, answer, wouldTakeAnswer }) {
  let bodyRef = useRef(null);
  let terminalSize = useTerminalSize();
  let [bodyWidth, setBodyWidth] = useState(() => Math.max(20, Math.min(40, terminalSize.columns - 6)));
  useEffect(() => {
    if (bodyRef.current) {
      let { width } = measureElement(bodyRef.current);
      if (width > 0) setBodyWidth(Math.max(20, width - 2));
    }
  }, [terminalSize.columns, terminalSize.rows]);
  let min = Math.min(bodyWidth, Math.max(20, terminalSize.columns - 6));
  let decisionReason = payload.permissionResult.decisionReason;
  let reason =
    decisionReason?.type === "safetyCheck" && decisionReason.circuitBreaker === "connectorFileSend"
      ? decisionReason.reason
      : "";
  let fileSendMark = useMemo(
    () => (payload.isMcp ? classifyHeldFiles(payload.input, reason) : undefined),
    [payload.isMcp, payload.input, reason],
  );
  let paramWidth = min - (fileSendMark === undefined ? 0 : BULLET.length);
  let paramRows = useMemo(
    () => (payload.isMcp ? buildParameterRows(payload.input, payload.paramFormatHints, paramWidth) : null),
    [payload.isMcp, payload.input, payload.paramFormatHints, paramWidth],
  );
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let pairedRows = useMemo(
    () =>
      paramRows === null || fileSendMark === undefined
        ? undefined
        : heldLineMask(paramRows, fileSendMark, paramWidth).map((rows, index) => ({
            rows: isScreenReaderEnabled && rows.includes(true) ? [true] : rows,
            entries: [paramRows[index]],
          })),
    [paramRows, fileSendMark, paramWidth, isScreenReaderEnabled],
  );
  let [theme] = useTheme();
  let { node, threw } = useMemo(() => {
    if (payload.renderedToolUseMessage != null)
      return {
        node: payload.renderedToolUseMessage,
        threw: false,
      };
    try {
      return {
        node: renderToolUseByName(payload.toolName, payload.input, {
          theme,
          verbose: true,
        }),
        threw: false,
      };
    } catch (error) {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Error rendering tool use line for ${payload.toolName}: ${error}`,
          "Error rendering tool use line (permission dialog table fallback)",
        ),
      );
      return {
        node: null,
        threw: true,
      };
    }
  }, [payload.renderedToolUseMessage, payload.toolName, payload.input, theme]);
  let approvalPayload = useMemo(
    () => (typeof node === "string" ? serializeApprovalPayload(node) : null),
    [node],
  );
  let isUnrenderable =
    (paramRows?.some((row) => row.unrenderable === true) ?? false) ||
    payload.toolUseRenderFailed === true ||
    threw ||
    approvalPayload?.kind === "withheld";
  let offersAlwaysAllow = useMemo(() => shouldOfferAlwaysAllow_2(payload), [payload]);
  let { offered, enableAutoMode } = useSettingsErrors(payload.requestSource);
  let originalCwd = getOriginalCwd();
  let consentRow = useMemo(
    () =>
      offersAlwaysAllow && !isUnrenderable
        ? buildToolDontAskAgainRule(payload, {
            cwd: originalCwd,
            maxLabelWidth: min - 8,
          })
        : null,
    [offersAlwaysAllow, isUnrenderable, payload, originalCwd, min],
  );
  let alwaysAllowUnavailable = isAlwaysAllowUnavailable(payload);
  let autoModeConsentRow = useMemo(
    () => (offered && !isUnrenderable && !alwaysAllowUnavailable ? autoModeRow("workflow") : null),
    [offered, isUnrenderable, alwaysAllowUnavailable],
  );
  let defaultsToNo = payload.permissionResult.defaultToNo === true;
  let reasonDisplay = useMemo(() => {
    let text = displayField(reason).text;
    return {
      shown: text,
      isAsWritten: text === reason,
      isBlank: !hasVisibleText(text),
    };
  }, [reason]);
  let hasReason = reasonDisplay !== undefined;
  let shown = reasonDisplay?.shown ?? "";
  let [measuredWidth, setMeasuredWidth] = useState(null);
  let columns =
    measuredWidth?.terminalColumns === terminalSize.columns
      ? measuredWidth.columns
      : Math.max(20, terminalSize.columns - 6);
  let splitReason = useMemo(() => {
    let split = {
      opening: "",
      files: shown,
      through: "",
      hasNoFiles: false,
    };
    let lines = shown.split(`
`);
    if (lines.length < 3) return split;
    let joined = lines.slice(0, 2).join(`
`);
    let text = lines.slice(2).join(`
`);
    if (!hasVisibleText(text))
      return {
        ...split,
        hasNoFiles: true,
      };
    let joined_2 = lines.slice(2, 2 + findPromptBodyEnd(text)).join(`
`);
    return countCharInString(
      wrapText(joined, Math.max(1, columns), "wrap"),
      `
`,
    ) +
      1 >
      MAX_BRIDGE_MEMBERS
      ? {
          ...split,
          through: `${joined}
${joined_2}`,
        }
      : {
          opening: joined,
          files: text,
          through: joined_2,
          hasNoFiles: false,
        };
  }, [shown, columns]);
  let isSplit = splitReason.opening !== "";
  let contentKey = useMemo(
    () => ({
      fileSendText: shown,
      isSplit,
      description: payload.description,
      name: payload.userFacingName,
      input: payload.input,
    }),
    [shown, isSplit, payload.description, payload.userFacingName, payload.input],
  );
  let fitted = FittedOfferBody(splitReason.files, {
    isActive: hasReason,
    isCut: !isScreenReaderEnabled,
    contentKey,
  });
  if (
    fitted.isMeasured &&
    fitted.columns > 0 &&
    (measuredWidth?.terminalColumns !== terminalSize.columns || measuredWidth.columns !== fitted.columns)
  )
    setMeasuredWidth({
      terminalColumns: terminalSize.columns,
      columns: fitted.columns,
    });
  let hasHiddenReason = hasReason && (fitted.hiddenRows > 0 || fitted.hiddenAbove > 0);
  let reasonLines = useMemo(
    () =>
      countCharInString(
        wrapText(shown, Math.max(1, fitted.columns), "wrap"),
        `
`,
      ) + 1,
    [shown, fitted.columns],
  );
  let offerRoom = useOfferRoom();
  let filesRef = useRef(null);
  let filesHeight = useMeasured(() =>
    filesRef.current === null ? 0 : measureElement(filesRef.current).height,
  );
  let offerRef = useRef(null);
  let offerInnerRef = useRef(null);
  let availableRows =
    useMeasured(() => {
      if (offerRoom.box.current === null || offerRef.current === null || offerInnerRef.current === null)
        return null;
      let height = measureElement(offerRoom.box.current).height;
      return height === 0
        ? null
        : height - measureElement(offerRef.current).height - measureElement(offerInnerRef.current).height;
    }) ?? MAX_BRIDGE_HEADER_ROWS;
  let scrollColumnContext = useScrollColumnContext();
  let offerRoomHeight = useMeasured(() => {
    let box = offerRoom.box.current;
    if (box === null) return 0;
    let scrollBox = scrollColumnContext?.box.current ?? box;
    while (scrollColumnContext === null && scrollBox.parentNode !== undefined)
      scrollBox = scrollBox.parentNode;
    return Math.max(0, topWithin(box, scrollBox));
  });
  let max = Math.max(
    MAX_BRIDGE_INIT_FAILURES,
    offerRoom.rows - offerRoomHeight - availableRows - reasonLines,
  );
  let canOfferRoom = hasReason && !isScreenReaderEnabled && filesHeight > max;
  let lastColumns = max - 1;
  let [measuredKey, setMeasuredKey] = useState(null);
  let visibleFileRows =
    canOfferRoom && measuredKey?.ask === contentKey
      ? Math.min(measuredKey.start, filesHeight - lastColumns)
      : 0;
  let offerRows = canOfferRoom ? filesHeight - visibleFileRows - lastColumns : 0;
  let reasonNeedsSpace =
    reasonDisplay !== undefined &&
    (!reasonDisplay.isAsWritten || reasonDisplay.isBlank || splitReason.hasNoFiles);
  let throughLines = useMemo(
    () =>
      splitReason.through === ""
        ? 1
        : countCharInString(
            wrapText(splitReason.through, Math.max(1, fitted.columns), "wrap"),
            `
`,
          ) + 1,
    [splitReason.through, fitted.columns],
  );
  let fitsWithoutRoom =
    countCharInString(
      fitted.text,
      `
`,
    ) +
      1 >=
    throughLines;
  let filesWhole = !hasHiddenReason || (fitsWithoutRoom && (isSplit || fitted.hiddenAbove === 0));
  let reasonFits =
    reasonDisplay === undefined ||
    (!reasonNeedsSpace && fitted.isMeasured && (isScreenReaderEnabled || (fitted.fitsScreen && filesWhole)));
  let permissionResult = useMemo(
    () =>
      hasReason
        ? {
            ...payload.permissionResult,
            decisionReason: undefined,
          }
        : payload.permissionResult,
    [hasReason, payload.permissionResult],
  );
  let onAnswer = useRefusableAnswer(({ value: choice, feedback }) => {
    if (!wouldTakeAnswer()) return false;
    if (choice === "yes-enable-auto-mode") enableAutoMode();
    return answer(fallbackChoiceToResult(choice, payload, consentRow, feedback));
  });
  let answer_2 = onAnswer.answer;
  let onSelect = (choice, feedback) => {
    if (choice !== "no" && hasReason && !reasonFits) return false;
    return answer_2({
      value: choice,
      feedback,
    });
  };
  let defaultFocusValue =
    onAnswer.refused === null
      ? defaultsToNo
        ? "no"
        : undefined
      : onAnswer.refused.value === "yes" && !defaultsToNo
        ? "yes"
        : "no";
  let onCancel = () =>
    answer({
      behavior: "cancelled",
    });
  let description = useMemo(
    () =>
      (typeof payload.description === "string" ? payload.description : "")
        .split(
          `
`,
        )
        .filter((line) => hasVisibleText(line))
        .join(
          `
`,
        )
        .trim(),
    [payload.description],
  );
  let descriptionNode = useMemo(() => {
    if (approvalPayload === null) return node;
    if (approvalPayload.kind === "withheld") return approvalPayload.marker;
    return replaceLineBreaks(approvalPayload.text).replace(/\s+/g, " ").trim();
  }, [approvalPayload, node]);
  let descriptionWidth = payload.isMcp ? Math.max(10, min - 2) : min;
  let unattendedNotice = useUnattendedNotice();
  let descriptionOptions = fallbackDialogRows(payload.roomyDescription === true, {
    columns: terminalSize.columns,
    rows: terminalSize.rows - unattendedNotice,
  });
  let clippedDescription = useMemo(
    () => wrapToMaxLines(description, descriptionWidth, descriptionOptions),
    [description, descriptionWidth, descriptionOptions],
  );
  let fullDescription = useMemo(
    () => wrapToMaxLines(description, descriptionWidth, Number.MAX_SAFE_INTEGER),
    [description, descriptionWidth],
  );
  let descriptionClipped = fullDescription !== clippedDescription;
  let [expanded, setExpanded] = useState(false);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let toggleBinding = useMemo(
    () => [
      {
        action: "app:toggleTranscript",
        run: () => setExpanded((expanded) => !expanded),
      },
    ],
    [],
  );
  let bindings = hasReason
    ? [
        {
          action: "app:toggleTranscript",
          run: () => {
            if (fitted.hiddenRows === 0 && offerRows > 0) {
              setMeasuredKey({
                ask: contentKey,
                start: visibleFileRows + lastColumns,
              });
              return;
            }
            if (fitted.hiddenRows === 0) setMeasuredKey(null);
            fitted.showNextRows();
          },
        },
      ]
    : toggleBinding;
  let canExpand = descriptionClipped && !hasReason;
  let roomShown = fitted.hiddenRows === 0 && (offerRows > 0 || fitted.hiddenAbove === 0);
  let expandHint = formatShortcutHint({
    chord,
    action: offerRows > 0 || fitted.hiddenRows > 0 ? "see more" : "see the first lines",
    parens: true,
    format: {
      keyCase: "lower",
    },
  });
  let terseExpandHint = tooShortAdvice(
    formatShortcutHint({
      chord,
      action: "",
      terse: true,
      format: {
        keyCase: "lower",
      },
    }).trim(),
  );
  let reasonHint =
    reasonDisplay === undefined || reasonFits
      ? undefined
      : !reasonDisplay.isAsWritten
        ? FILES_TOO_LONG_MESSAGE
        : reasonDisplay.isBlank || splitReason.hasNoFiles
          ? NO_FILES_DECLARED_MESSAGE
          : !fitted.isMeasured
            ? undefined
            : fitted.fitsScreen && fitsWithoutRoom
              ? terseExpandHint
              : TERMINAL_TOO_SHORT_MESSAGE;
  let offerRef2 = useRef(null);
  let offerHeight = useMeasured(() =>
    offerRef2.current === null ? 0 : measureElement(offerRef2.current).width,
  );
  let offerWidth = offerHeight > 0 ? offerHeight : Math.max(1, Math.min(min, terminalSize.columns - 2));
  let minHeight = Math.max(
    ...[PROCEED_QUESTION, TERMINAL_TOO_SHORT_MESSAGE, ...(isSplit ? [] : [terseExpandHint])].map(
      (text) =>
        countCharInString(
          wrapText(text, Math.max(1, offerWidth), "wrap"),
          `
`,
        ) + 1,
    ),
  );
  let options = useMemo(() => {
    let yesOption = {
      label: "Yes",
      value: "yes",
    };
    let noOption = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    if (reasonNeedsSpace) return [noOption];
    let options = defaultsToNo ? [noOption, yesOption] : [yesOption];
    if (consentRow !== null) {
      if (typeof consentRow.node === "string")
        options.push({
          label: consentRow.node,
          value: "yes-dont-ask-again",
        });
    }
    if (autoModeConsentRow !== null) {
      if (typeof autoModeConsentRow.node === "string")
        options.push({
          label: autoModeConsentRow.node,
          description: WORKFLOW_HINT_TEXT,
          value: "yes-enable-auto-mode",
        });
    }
    if (!defaultsToNo) options.push(noOption);
    return options;
  }, [consentRow, autoModeConsentRow, defaultsToNo, reasonNeedsSpace]);
  let toolAnalyticsContext = useMemo(
    () => ({
      toolName: sanitizeToolNameForAnalytics(payload.toolName),
      isMcp: payload.isMcp,
    }),
    [payload.toolName, payload.isMcp],
  );
  let card = payload.toolUseRenderFailed === true || hasReason ? undefined : payload.card;
  if (
    card !== undefined &&
    [card.question, ...card.lines, ...card.values].reduce(
      (acc, sum) =>
        acc + bunStringWidth(sum) + (sum.split(/\r\n|[\r\n\u2028\u2029]/).length - 1) * VALUE_WRAP_WIDTH,
      0,
    ) <= MAX_PARAMETER_VALUE_CHARS
  ) {
    let value =
      payload.requestSource === undefined &&
      !card.question.includes(`
`) &&
      bunStringWidth(card.question) <= Math.min(min, terminalSize.columns - 2);
    let questionFits = cardHeaderRows(
      {
        ...card,
        question: value ? undefined : card.question,
      },
      Math.min(bodyWidth, terminalSize.columns - 6) - PARAMETER_VALUE_MAX_LINES,
    );
    return jsxProd_default_2(PermissionDialog_2, {
      title: value ? card.question : payload.userFacingName,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: [
        jsxProd_default(Box, {
          ref: bodyRef,
          width: "100%",
          flexDirection: "column",
          children:
            questionFits.rows.length > 0 &&
            jsxProd_default(DiffFrame, {
              children: jsxProd_default(ParameterCard, {
                card: questionFits,
              }),
            }),
        }),
        jsxProd_default(Box, {
          paddingX: 1,
          marginTop: questionFits.rows.length === 0 ? 1 : 0,
          children: jsxProd_default(
            permissionChoicePrompt,
            {
              question: null,
              options,
              defaultFocusValue,
              hideIndexes: defaultsToNo,
              onSelect,
              onCancel,
              toolAnalyticsContext,
              requestSource: payload.requestSource,
            },
            onAnswer.attempts,
          ),
        }),
      ],
    });
  }
  let descriptionBox =
    clippedDescription !== "" &&
    jsxProd_default_2(Box, {
      width: "100%",
      flexDirection: "column",
      paddingX: 1,
      marginTop: paramRows?.length === 0 ? 1 : 0,
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
            children: (hasReason && payload.isMcp) || expanded ? fullDescription : clippedDescription,
          }),
        }),
        canExpand &&
          jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default(KeyboardShortcutHint, {
              chord,
              action: expanded ? "collapse description" : "expand description",
              parens: true,
              format: {
                keyCase: "lower",
              },
            }),
          }),
      ],
    });
  let bodyRows = jsxProd_default_2(Fragment, {
    children: [
      (paramRows === null || paramRows.length > 0) &&
        jsxProd_default(DiffFrame, {
          children:
            pairedRows !== undefined
              ? jsxProd_default(Box, {
                  flexDirection: "column",
                  children: pairedRows.map(({ rows, entries }, lineRows) =>
                    jsxProd_default_2(
                      Box,
                      {
                        flexDirection: "row",
                        children: [
                          jsxProd_default(Box, {
                            flexDirection: "column",
                            flexShrink: 0,
                            width: BULLET.length,
                            children: rows.map((frameRow, entryRows) =>
                              jsxProd_default(
                                Box,
                                {
                                  height: 1,
                                  children:
                                    frameRow &&
                                    jsxProd_default(Text, {
                                      children: BULLET,
                                    }),
                                },
                                entryRows,
                              ),
                            ),
                          }),
                          jsxProd_default(ToolInputEntries, {
                            entries,
                            contentColumns: paramWidth,
                          }),
                        ],
                      },
                      lineRows,
                    ),
                  ),
                })
              : paramRows !== null
                ? jsxProd_default(ToolInputEntries, {
                    entries: paramRows,
                    contentColumns: min,
                  })
                : jsxProd_default(Blockquote, {
                    multiline:
                      typeof descriptionNode === "string" &&
                      needsGutter(`${payload.userFacingName}(${descriptionNode})`),
                    children: jsxProd_default_2(Text, {
                      children: [
                        payload.userFacingName,
                        descriptionNode != null &&
                          descriptionNode !== "" &&
                          jsxProd_default_2(Fragment, {
                            children: ["(", descriptionNode, ")"],
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
        }),
      payload.isMcp && descriptionBox,
    ],
  });
  return jsxProd_default(useDialogKeybindings, {
    ref: hasReason ? offerRoom.box : undefined,
    bindings,
    active: hasReason ? canOfferRoom || hasHiddenReason : descriptionClipped,
    flexDirection: "column",
    children: jsxProd_default_2(PermissionDialog_2, {
      title: "Tool use",
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: [
        jsxProd_default_2(Box, {
          ref: bodyRef,
          width: "100%",
          flexDirection: "column",
          children: [
            payload.isMcp
              ? jsxProd_default_2(Box, {
                  flexDirection: "row",
                  paddingX: 1,
                  marginBottom: paramRows?.length === 0 && clippedDescription === "" ? 1 : 0,
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
              : descriptionBox,
            hasReason
              ? jsxProd_default_2(Box, {
                  ref: offerRef,
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Box, {
                      flexDirection: "column",
                      overflowY: "hidden",
                      height: canOfferRoom ? lastColumns : undefined,
                      children: jsxProd_default(Box, {
                        ref: filesRef,
                        flexDirection: "column",
                        flexShrink: 0,
                        marginTop: -visibleFileRows,
                        children: bodyRows,
                      }),
                    }),
                    canOfferRoom &&
                      jsxProd_default(Box, {
                        paddingX: 1,
                        children: jsxProd_default(Text, {
                          dimColor: true,
                          wrap: "truncate-end",
                          children: formatHiddenRowsHint({
                            hiddenRows: offerRows,
                            hiddenAbove: visibleFileRows,
                            hint: roomShown ? expandHint : "",
                            columns: min,
                          }),
                        }),
                      }),
                  ],
                })
              : bodyRows,
          ],
        }),
        hasReason &&
          jsxProd_default(DiffFrame, {
            children: jsxProd_default_2(Box, {
              ref: offerInnerRef,
              flexDirection: "column",
              children: [
                splitReason.opening !== "" &&
                  jsxProd_default(Blockquote, {
                    multiline: true,
                    children: jsxProd_default(Box, {
                      flexDirection: "column",
                      flexGrow: 1,
                      children: jsxProd_default(Text, {
                        children: splitReason.opening,
                      }),
                    }),
                  }),
                jsxProd_default_2(Box, {
                  ref: fitted.box,
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Blockquote, {
                      multiline: true,
                      children: jsxProd_default(Box, {
                        ref: fitted.textBox,
                        flexDirection: "column",
                        flexGrow: 1,
                        children: jsxProd_default(Text, {
                          children: fitted.text,
                        }),
                      }),
                    }),
                    hasHiddenReason &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        wrap: "truncate-end",
                        children: formatHiddenRowsHint({
                          hiddenRows: fitted.hiddenRows,
                          hiddenAbove: fitted.hiddenAbove,
                          hint: roomShown ? "" : expandHint,
                          columns: fitted.columns,
                        }),
                      }),
                  ],
                }),
              ],
            }),
          }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: [
            jsxProd_default(PermissionRuleExplanation, {
              permissionResult,
              toolType: "tool",
              rowBudget:
                payload.permissionResult.inPlaceOfClassifier === true ? MAX_EXPLANATION_LINES : undefined,
            }),
            payload.takesOverServerName === true &&
              consentRow !== null &&
              jsxProd_default(Text, {
                children: `Another MCP server owns this server's name. "Don't ask again" moves the name to this server on this computer: allow rules for that name, in every project, will apply to this server, not the other one. Plain "Yes" moves nothing.`,
              }),
            payload.note !== undefined &&
              jsxProd_default(Text, {
                children: payload.note,
              }),
            jsxProd_default(
              permissionChoicePrompt,
              {
                question: hasReason
                  ? jsxProd_default(Box, {
                      ref: offerRef2,
                      flexDirection: "column",
                      minHeight,
                      children: jsxProd_default(Text, {
                        children: reasonHint ?? PROCEED_QUESTION,
                      }),
                    })
                  : reasonHint,
                options,
                defaultFocusValue,
                hideIndexes: defaultsToNo,
                onSelect,
                onCancel,
                toolAnalyticsContext,
                requestSource: payload.requestSource,
              },
              onAnswer.attempts,
            ),
          ],
        }),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1433929-1434160 placement
/**
 * 包装权限提示对话框，提取载荷、回答回调与决策原因后交给视图。
 */
function ConnectorFileSendPermissionView(props) {
  let $ = useMemoCache(3);
  let decisionReason = props.payload.permissionResult.decisionReason;
  let element;
  if ($[0] !== props || $[1] !== decisionReason) {
    element =
      decisionReason?.type === "safetyCheck" && decisionReason.circuitBreaker === "connectorFileSend"
        ? jsxProd_default(PermissionPromptBody, {
            ...props,
          })
        : jsxProd_default(FallbackPermissionRequest, {
            ...props,
          });
    $[0] = props;
    $[1] = decisionReason;
    $[2] = element;
  } else element = $[2];
  return element;
}
export { WINDOWS_PATH_RE, ConnectorFileSendPermissionView };
