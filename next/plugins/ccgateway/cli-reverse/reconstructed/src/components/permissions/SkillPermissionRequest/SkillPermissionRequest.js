/**
 * components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 *
 * Skill 工具权限请求：技能名与安全检查结果，允许/应用建议/拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/SkillPermissionRequest/SkillPermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: sole-consumer 3, affinity 2, fingerprint 2, placement 2, layout 1
 */
import {
  parseConsentSuggestions,
  DISPLAYED_UPDATE_TYPES,
  MAX_CONSENT_RULE_WIDTH,
  CONSENT_ROW_LIMITS,
  parseModeSuggestions,
  combineRows,
} from "../consentRows.js";
import { generateShellSuggestionsLabel } from "../shellPermissionHelpers.js";
import { findSafetyCheckReason } from "../../../utils/permissions/permissions.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { processResponse } from "../../../hooks/useSwarmPermissionPoller.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  needsGutter,
  displayField,
  plainDisplay,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { formatQuotedList } from "../../../utils/websocketSummary.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { sandboxHostsSummary, formatHiddenRowsHint } from "../BashPermissionRequest/commandDisplay.js";
import { MAX_EXPLANATION_LINES, PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { permissionChoicePrompt } from "../PermissionPrompt.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import {
  init_react_production,
  useMemo,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
} from "../../../../vendor/react/cjs/react.production.js";
import {
  getSkillCommandPrefix,
  resolveSkillDisplay,
  useSkillAskRevealMemory,
  SKILL_NARROW_COLUMNS,
  buildSkillExactRule,
  buildSkillPrefixRule,
  HIDDEN_EXACT_RULE_LABEL,
  SKILL_UNREAD_HINT_ENABLED,
  UNREAD_OFFER_HINT,
  CUT_OFFER_HINT,
  TERMINAL_TOO_SHORT_HINT,
  skillChoiceToResult,
  NARROW_COLUMNS_WITH_HINTS,
  NARROW_COLUMN_INSET,
  SURVEY_QUESTION_LINE_CHARS,
} from "./skillPermissionOptions.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { TerminalSizeContext } from "../../../ink/terminalModes.js";
import { fitsWithMeta } from "../PermissionRequestTitle.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1413440-1414264 sole-consumer
/**
 * 从权限结果的 suggestions 生成同意行：规则类一行，addDirectories 目录（有总数上限、防御性读取）一行，多行合并。
 */
function buildSuggestionRows(payload) {
  let suggestions =
    "suggestions" in payload.permissionResult ? payload.permissionResult.suggestions : undefined;
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
  let rows = [];
  let consentSuggestions = parseConsentSuggestions(suggestions, {
    displayedTypes: DISPLAYED_UPDATE_TYPES,
    renderLabel: generateShellSuggestionsLabel,
  });
  if (consentSuggestions !== null) rows.push(consentSuggestions);
  let directories = [];
  let isValid = false;
  try {
    let suggestionCount = suggestions.length;
    isValid =
      typeof suggestionCount === "number" &&
      Number.isSafeInteger(suggestionCount) &&
      suggestionCount >= 0 &&
      suggestionCount <= MAX_CONSENT_RULE_WIDTH;
    if (isValid) {
      let remainingBudget = MAX_CONSENT_RULE_WIDTH * CONSENT_ROW_LIMITS;
      for (let idx = 0; idx < suggestionCount && isValid; idx++)
        try {
          let suggestion = suggestions[idx];
          if (suggestion === null || typeof suggestion !== "object" || suggestion.type !== "addDirectories")
            continue;
          let directories_2 = suggestion.directories;
          if (!Array.isArray(directories_2)) continue;
          let directoryCount = directories_2.length;
          if (
            typeof directoryCount !== "number" ||
            !Number.isSafeInteger(directoryCount) ||
            directoryCount < 0
          )
            continue;
          remainingBudget -= directoryCount;
          if (remainingBudget < 0) {
            isValid = false;
            break;
          }
          for (let idx = 0; idx < directoryCount; idx++) directories.push(directories_2[idx]);
        } catch {}
    }
  } catch {
    isValid = false;
  }
  if (isValid && directories.length > 0) {
    let modeSuggestions = parseModeSuggestions(directories);
    if (modeSuggestions !== null) rows.push(modeSuggestions);
  }
  let [firstRow, ...restRows] = rows;
  if (firstRow === undefined) return null;
  return restRows.length === 0 ? firstRow : combineRows(firstRow, ...restRows);
}
//@ chunk-czq1j3j2.js:1414264-1414434 sole-consumer
function hasBlockingSafetyCheck(payload) {
  let decisionReason =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : undefined;
  return (
    findSafetyCheckReason(decisionReason, (check) => !check.classifierApprovable) !== undefined ||
    payload.isAskCappedByOrg
  );
}
//@ chunk-czq1j3j2.js:1414434-1414605 sole-consumer
function isSkillInputWithheld(payload) {
  return (
    payload.command?.kind === "withheld" ||
    payload.mcp?.argsDisplay?.kind === "withheld" ||
    payload.ws?.url.kind === "withheld" ||
    (payload.command === undefined && payload.mcp === undefined && payload.ws === undefined)
  );
}
//@ chunk-czq1j3j2.js:1414605-1414659 affinity
function displayTextOf(text) {
  return text.kind === "full" ? text.text : text.marker;
}
//@ chunk-czq1j3j2.js:1414659-1418187 fingerprint (2.1.88 match: SkillPermissionRequest, 0.304)
/**
 * Skill 权限：显示技能名、来源与安全检查，选项允许 / 应用建议规则 / 拒绝。
 */
function SkillPermissionRequest(props) {
  let $ = useMemoCache(50);
  let { payload, answer } = props;
  let suggestionRows;
  if ($[0] !== payload) {
    suggestionRows =
      payload.showAlwaysAllow && !hasBlockingSafetyCheck(payload) && !isSkillInputWithheld(payload)
        ? buildSuggestionRows(payload)
        : null;
    $[0] = payload;
    $[1] = suggestionRows;
  } else suggestionRows = $[1];
  let suggestionRows_2 = suggestionRows;
  let onSelect;
  if ($[2] !== answer || $[3] !== payload || $[4] !== suggestionRows_2) {
    onSelect = (choice, feedback) => answer(processResponse(choice, payload, suggestionRows_2, feedback));
    $[2] = answer;
    $[3] = payload;
    $[4] = suggestionRows_2;
    $[5] = onSelect;
  } else onSelect = $[5];
  let onSelect_2 = onSelect;
  let onCancel;
  if ($[6] !== answer) {
    onCancel = () =>
      answer({
        behavior: "deny",
      });
    $[6] = answer;
    $[7] = onCancel;
  } else onCancel = $[7];
  let onCancel_2 = onCancel;
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let noOption;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    noOption = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    $[8] = noOption;
  } else noOption = $[8];
  let noOption_2 = noOption;
  let yesOption;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    yesOption = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    $[9] = yesOption;
  } else yesOption = $[9];
  let yesOption_2 = yesOption;
  let options;
  if ($[10] !== hideIndexes || $[11] !== suggestionRows_2) {
    options = hideIndexes ? [noOption_2, yesOption_2] : [yesOption_2];
    if (suggestionRows_2 !== null) {
      let applyOption;
      if ($[13] !== suggestionRows_2.node) {
        applyOption = {
          label: suggestionRows_2.node,
          value: "yes-apply-suggestions",
        };
        $[13] = suggestionRows_2.node;
        $[14] = applyOption;
      } else applyOption = $[14];
      options.push(applyOption);
    }
    if (!hideIndexes) options.push(noOption_2);
    $[10] = hideIndexes;
    $[11] = suggestionRows_2;
    $[12] = options;
  } else options = $[12];
  let options_2 = options;
  const requestSource = payload.requestSource;
  const monitorDescription = payload.monitorDescription ?? "";
  let multiline;
  if ($[15] !== monitorDescription) {
    multiline = needsGutter(monitorDescription);
    $[15] = monitorDescription;
    $[16] = multiline;
  } else multiline = $[16];
  let children;
  if ($[17] !== payload.monitorDescription) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: payload.monitorDescription,
    });
    $[17] = payload.monitorDescription;
    $[18] = children;
  } else children = $[18];
  let descriptionBox;
  if ($[19] !== multiline || $[20] !== children) {
    descriptionBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: jsxProd_default(Blockquote, {
        multiline,
        children,
      }),
    });
    $[19] = multiline;
    $[20] = children;
    $[21] = descriptionBox;
  } else descriptionBox = $[21];
  let children_2;
  if (
    $[22] !== payload.command ||
    $[23] !== payload.intervalMs ||
    $[24] !== payload.mcp ||
    $[25] !== payload.ws
  ) {
    children_2 = payload.mcp
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Text, {
              children: [
                "Poll",
                " ",
                jsxProd_default_2(Text, {
                  bold: true,
                  children: [payload.mcp.server, "/", payload.mcp.tool],
                }),
                " ",
                "every ",
                payload.intervalMs / 1000,
                "s",
              ],
            }),
            payload.mcp.argsDisplay !== undefined
              ? jsxProd_default(Blockquote, {
                  multiline: payload.mcp.argsDisplay.kind === "full" && payload.mcp.argsDisplay.needsGutter,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["args: ", displayTextOf(payload.mcp.argsDisplay)],
                  }),
                })
              : null,
          ],
        })
      : payload.ws
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Blockquote, {
                multiline: payload.ws.url.kind === "full" && payload.ws.url.needsGutter,
                children: jsxProd_default_2(Text, {
                  children: [
                    "Open WebSocket ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: displayTextOf(payload.ws.url),
                    }),
                  ],
                }),
              }),
              payload.ws.protocolsWithheld === true
                ? jsxProd_default_2(Text, {
                    children: [
                      "subprotocols:",
                      " ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "(cannot be shown in full \u2014 deny unless expected)",
                      }),
                    ],
                  })
                : payload.ws.protocols !== undefined && payload.ws.protocols.length > 0
                  ? jsxProd_default_2(Text, {
                      children: [
                        "subprotocols:",
                        " ",
                        jsxProd_default(Text, {
                          bold: true,
                          children: formatQuotedList(payload.ws.protocols),
                        }),
                      ],
                    })
                  : null,
            ],
          })
        : payload.command
          ? jsxProd_default(Blockquote, {
              multiline: payload.command.kind === "full" && payload.command.needsGutter,
              children: jsxProd_default(Text, {
                children: displayTextOf(payload.command),
              }),
            })
          : null;
    $[22] = payload.command;
    $[23] = payload.intervalMs;
    $[24] = payload.mcp;
    $[25] = payload.ws;
    $[26] = children_2;
  } else children_2 = $[26];
  let commandFrame;
  if ($[27] !== children_2) {
    commandFrame = jsxProd_default(DiffFrame, {
      children: children_2,
    });
    $[27] = children_2;
    $[28] = commandFrame;
  } else commandFrame = $[28];
  let hostsSummary;
  if ($[29] !== payload.networkAllowHosts) {
    hostsSummary =
      payload.networkAllowHosts !== undefined &&
      payload.networkAllowHosts.length > 0 &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(sandboxHostsSummary, {
          hosts: payload.networkAllowHosts,
        }),
      });
    $[29] = payload.networkAllowHosts;
    $[30] = hostsSummary;
  } else hostsSummary = $[30];
  const toolType = payload.mcp || payload.ws ? "tool" : "command";
  const rowBudget = hideIndexes ? MAX_EXPLANATION_LINES : undefined;
  let ruleExplanation;
  if ($[31] !== payload.permissionResult || $[32] !== toolType || $[33] !== rowBudget) {
    ruleExplanation = jsxProd_default(PermissionRuleExplanation, {
      permissionResult: payload.permissionResult,
      toolType,
      rowBudget,
    });
    $[31] = payload.permissionResult;
    $[32] = toolType;
    $[33] = rowBudget;
    $[34] = ruleExplanation;
  } else ruleExplanation = $[34];
  let prompt;
  if (
    $[35] !== onCancel_2 ||
    $[36] !== onSelect_2 ||
    $[37] !== hideIndexes ||
    $[38] !== options_2 ||
    $[39] !== payload.requestSource
  ) {
    prompt = jsxProd_default(permissionChoicePrompt, {
      options: options_2,
      hideIndexes,
      onSelect: onSelect_2,
      onCancel: onCancel_2,
      requestSource: payload.requestSource,
    });
    $[35] = onCancel_2;
    $[36] = onSelect_2;
    $[37] = hideIndexes;
    $[38] = options_2;
    $[39] = payload.requestSource;
    $[40] = prompt;
  } else prompt = $[40];
  let bodyBox;
  if ($[41] !== hostsSummary || $[42] !== ruleExplanation || $[43] !== prompt) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [hostsSummary, ruleExplanation, prompt],
    });
    $[41] = hostsSummary;
    $[42] = ruleExplanation;
    $[43] = prompt;
    $[44] = bodyBox;
  } else bodyBox = $[44];
  let dialog;
  if (
    $[45] !== payload.requestSource ||
    $[46] !== descriptionBox ||
    $[47] !== commandFrame ||
    $[48] !== bodyBox
  ) {
    dialog = jsxProd_default_2(PermissionDialog_2, {
      title: MONITOR,
      innerPaddingX: 0,
      requestSource,
      children: [descriptionBox, commandFrame, bodyBox],
    });
    $[45] = payload.requestSource;
    $[46] = descriptionBox;
    $[47] = commandFrame;
    $[48] = bodyBox;
    $[49] = dialog;
  } else dialog = $[49];
  return dialog;
}
//@ chunk-czq1j3j2.js:1445103-1445107 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1445103", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1448082-1448239 affinity
function shouldOfferAlwaysAllow(payload) {
  let decisionReason = payload.permissionResult.decisionReason;
  let isUnapprovableCheck = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  return payload.showAlwaysAllow && !isUnapprovableCheck && !payload.isAskCappedByOrg;
}
//@ chunk-czq1j3j2.js:1448239-1448333 fingerprint (2.1.88 match: _temp, 0.71)
function shouldOfferExactSkillRule(input) {
  return (
    shouldOfferAlwaysAllow(input) &&
    input.skill !== "" &&
    !input.skill.endsWith(":*") &&
    !input.skill.endsWith(" *")
  );
}
//@ chunk-czq1j3j2.js:1448333-1448396 layout
function shouldOfferPrefixSkillRule(payload) {
  if (!shouldOfferAlwaysAllow(payload)) return false;
  return getSkillCommandPrefix(payload.skill) !== null;
}
//@ chunk-czq1j3j2.js:1448396-1452044 placement
/**
 * skill 使用权限请求对话框。
 */
function SkillUsePermissionDialog({ payload, answer }) {
  let originalCwd = getOriginalCwd();
  let skillDescription = useMemo(
    () => (payload.skillDescription ? displayField(payload.skillDescription) : undefined),
    [payload.skillDescription],
  );
  let skillDisplay = useMemo(() => resolveSkillDisplay(payload), [payload]);
  let hasSkill = skillDisplay !== undefined;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let skillName = plainDisplay(skillDisplay?.name ?? payload.skill);
  let title = skillName !== null ? `Use skill "${skillName.display}"?` : null;
  let { columns } = useScrollViewportSize(
    useContext(TerminalSizeContext) ?? {
      rows: 0,
      columns: 0,
    },
  );
  let titleFits = title !== null && (!hasSkill || fitsWithMeta(title, payload.requestSource, columns - 2));
  let isWithoutSkill = skillDisplay?.isWithoutSkill === true;
  let calledAs = skillDisplay?.calledAs;
  let descriptionText = isWithoutSkill ? "" : (skillDescription?.text ?? "");
  let contentText = !hasSkill
    ? ""
    : titleFits || skillName === null
      ? descriptionText
      : `"${skillName.display}"
${descriptionText}`;
  let decisionReason = payload.permissionResult.decisionReason;
  let reason =
    decisionReason !== undefined && "reason" in decisionReason && typeof decisionReason.reason === "string"
      ? decisionReason.reason
      : "";
  let skillAskRevealMemory = useSkillAskRevealMemory();
  let display = skillName?.display ?? "";
  let contentKey = useMemo(
    () => ({
      shownNameText: display,
      descriptionText,
      reasonText: reason,
    }),
    [display, descriptionText, reason],
  );
  let offerBody = FittedOfferBody(contentText, {
    isActive: hasSkill,
    isCut: !isScreenReaderEnabled,
    contentKey,
    keptForRequest: skillAskRevealMemory,
  });
  let offersStanding = offerBody.offersStanding && !offerBody.isStandingHeld;
  let matchedAskRule =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.matchedAskRule : undefined;
  let isNarrow = columns < SKILL_NARROW_COLUMNS;
  let [wasNarrow, setWasNarrow] = useState(() => skillAskRevealMemory?.has("narrower") ?? false);
  useEffect(() => {
    if (hasSkill && isNarrow) setWasNarrow(true);
  }, [hasSkill, isNarrow]);
  useLayoutEffect(() => {
    if (hasSkill && isNarrow) skillAskRevealMemory?.keep("narrower");
  }, [hasSkill, isNarrow, skillAskRevealMemory]);
  let canOfferExact = offersStanding && !isNarrow && !wasNarrow;
  let permissionResult = useMemo(
    () => payload.permissionResult,
    [payload.permissionResult, hasSkill, matchedAskRule],
  );
  let exactRule = useMemo(() => {
    if (skillDisplay !== undefined) return null;
    return shouldOfferExactSkillRule(payload) ? buildSkillExactRule(payload, originalCwd) : null;
  }, [payload, originalCwd, skillDisplay, matchedAskRule, canOfferExact, isScreenReaderEnabled]);
  let prefixRule = useMemo(
    () =>
      resolveSkillDisplay(payload) === undefined && shouldOfferPrefixSkillRule(payload)
        ? buildSkillPrefixRule(payload, originalCwd)
        : null,
    [payload, originalCwd],
  );
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let options = useMemo(() => {
    let noOption = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    let yesOption = {
      label: "Yes",
      value: "yes",
      feedbackConfig: {
        type: "accept",
      },
    };
    let optionList = hideIndexes ? [noOption, yesOption] : [yesOption];
    if (exactRule !== null) {
      let blockExact = hasSkill && !canOfferExact;
      optionList.push({
        label: blockExact ? HIDDEN_EXACT_RULE_LABEL : exactRule.node,
        value: "yes-exact",
        disabled: blockExact,
      });
    }
    if (prefixRule !== null)
      optionList.push({
        label: prefixRule.node,
        value: "yes-prefix",
      });
    if (!hideIndexes) optionList.push(noOption);
    return optionList;
  }, [exactRule, prefixRule, hideIndexes, hasSkill, canOfferExact]);
  let toolAnalyticsContext = useMemo(
    () => ({
      toolName: sanitizeToolNameForAnalytics(payload.toolName),
      isMcp: payload.isMcp,
    }),
    [payload.toolName, payload.isMcp],
  );
  let [consentDrawn, setConsentDrawn] = useState();
  let unusedStatus = undefined;
  let showUnreadHint = unusedStatus === "both" || (unusedStatus === "unread" && SKILL_UNREAD_HINT_ENABLED);
  let canAnswerYes = !hasSkill || false;
  let showTooShort =
    hasSkill && !isWithoutSkill && offerBody.isMeasured && !offerBody.fitsScreen && !isScreenReaderEnabled;
  let [askRuleHintShown, setAskRuleHintShown] = useState(() => skillAskRevealMemory?.has("hint") ?? false);
  useEffect(() => {
    if (showTooShort && matchedAskRule !== undefined) setAskRuleHintShown(true);
  }, [showTooShort, matchedAskRule]);
  useLayoutEffect(() => {
    if (showTooShort && matchedAskRule !== undefined) skillAskRevealMemory?.keep("hint");
  }, [showTooShort, matchedAskRule, skillAskRevealMemory]);
  let unusedHint = undefined;
  let offerHint =
    !hasSkill || isWithoutSkill || showUnreadHint
      ? undefined
      : unusedStatus === "unread"
        ? UNREAD_OFFER_HINT
        : unusedStatus === "cut"
          ? CUT_OFFER_HINT
          : undefined;
  let question =
    (showTooShort
      ? offerHint === undefined && unusedHint !== undefined
        ? unusedHint.tooShort
        : TERMINAL_TOO_SHORT_HINT
      : offerHint) ??
    (calledAs === null ? UNREAD_OFFER_HINT : unusedHint !== undefined ? unusedHint.question : undefined);
  let onSelect = (choice, feedback) => {
    if ((choice !== "no" && !canAnswerYes) || (choice === "yes-exact" && hasSkill && !canOfferExact))
      return false;
    return answer(
      skillChoiceToResult(
        choice,
        payload,
        {
          exactRow: exactRule,
          prefixRow: prefixRule,
        },
        feedback,
      ),
    );
  };
  let onCancel = () =>
    answer({
      behavior: "deny",
    });
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let showNextRows = offerBody.showNextRows;
  let bindings = useMemo(
    () => [
      {
        action: "app:toggleTranscript",
        run: showNextRows,
      },
    ],
    [showNextRows],
  );
  let hasHiddenRows = hasSkill && (offerBody.hiddenRows > 0 || offerBody.hiddenAbove > 0);
  let rowColumns =
    hasSkill && columns < NARROW_COLUMNS_WITH_HINTS ? Math.max(1, columns - NARROW_COLUMN_INSET) : undefined;
  let dialog = jsxProd_default_2(PermissionDialog_2, {
    title: titleFits ? title : "Use this skill?",
    innerPaddingX: 0,
    requestSource: payload.requestSource,
    marginTop: hasSkill ? 0 : 1,
    children: [
      jsxProd_default(Box, {
        paddingX: 1,
        children: jsxProd_default(Text, {
          children: "Claude may use instructions, code, or files from this Skill.",
        }),
      }),
      hasSkill
        ? jsxProd_default(DiffFrame, {
            children: jsxProd_default_2(Box, {
              ref: offerBody.box,
              flexDirection: "column",
              children: [
                jsxProd_default(Blockquote, {
                  multiline: true,
                  children: jsxProd_default(Box, {
                    ref: offerBody.textBox,
                    flexDirection: "column",
                    flexGrow: 1,
                    children: jsxProd_default(Text, {
                      dimColor: true,
                      children: offerBody.text,
                    }),
                  }),
                }),
                hasHiddenRows &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: formatHiddenRowsHint({
                      hiddenRows: offerBody.hiddenRows,
                      hiddenAbove: offerBody.hiddenAbove,
                      hint: formatShortcutHint({
                        chord,
                        action: offerBody.hiddenRows > 0 ? "see more" : "see the first lines",
                        parens: true,
                        format: {
                          keyCase: "lower",
                        },
                      }),
                      columns: offerBody.columns,
                    }),
                  }),
              ],
            }),
          })
        : skillDescription !== undefined
          ? jsxProd_default(DiffFrame, {
              children: jsxProd_default(Blockquote, {
                multiline: skillDescription.needsGutter,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: skillDescription.text,
                }),
              }),
            })
          : null,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 1,
        children: [
          jsxProd_default(PermissionRuleExplanation, {
            permissionResult,
            toolType: "tool",
            rowBudget:
              rowColumns !== undefined
                ? Math.ceil((MAX_EXPLANATION_LINES * SURVEY_QUESTION_LINE_CHARS) / rowColumns) + 1
                : hasSkill || hideIndexes
                  ? MAX_EXPLANATION_LINES
                  : undefined,
            rowColumns,
            hideAskRuleHint: hasSkill && askRuleHintShown,
            onConsentDrawn: hasSkill ? setConsentDrawn : undefined,
          }),
          jsxProd_default(permissionChoicePrompt, {
            options,
            hideIndexes,
            onSelect,
            onCancel,
            question: undefined,
            toolAnalyticsContext,
            requestSource: payload.requestSource,
          }),
        ],
      }),
    ],
  });
  return hasSkill
    ? jsxProd_default(useDialogKeybindings, {
        bindings,
        active: hasHiddenRows,
        flexDirection: "column",
        children: dialog,
      })
    : dialog;
}
export { SkillUsePermissionDialog, SkillPermissionRequest };
