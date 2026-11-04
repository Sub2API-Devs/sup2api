/**
 * components/permissions/PermissionRuleExplanation.tsx
 *
 * 解释为什么需要确认：命中的规则及来源文件、auto 模式分类器原因、沙箱覆盖等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRuleExplanation.tsx
 * pieces: chunk-0e8j1zzj.js (7)
 * attribution: callgraph-fingerprint 1, layout 4, fingerprint 2
 */
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Blockquote } from "../Blockquote.js";
import { needsGutter, displayField } from "../../utils/permissions/approvalPayloadSerialization.js";
import { ensureNoReasonProvided } from "../../utils/messages.js";
import { sequential } from "../../utils/sequential.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import {
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
  CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT,
} from "../../types/permissions.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useUnattendedNotice, DenialLimitFallbackNotice } from "./UnattendedAutoBlockNotice.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { truncateToWidth } from "../../utils/format.js";
import { countCharInString, getFirstLine } from "../../utils/stringUtils.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";

//@ chunk-0e8j1zzj.js:19288-19341 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectToolPermissionContextMode(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-0e8j1zzj.js:19341-19404 layout
function renderRuleExplanation(text, children) {
  return jsxProd_default(Blockquote, {
    multiline: needsGutter(text),
    children,
  });
}
//@ chunk-0e8j1zzj.js:19404-19413 layout
var MAX_EXPLANATION_LINES = 7;
//@ chunk-0e8j1zzj.js:19413-19546 layout
function getRuleSourceFileLabel(hookSource) {
  if (hookSource?.startsWith("plugin")) return "plugin hooks.json";
  if (hookSource?.startsWith("skill")) return "SKILL.md";
  return "settings.json";
}
//@ chunk-0e8j1zzj.js:19546-19762 layout
function findAskRule(decisionReason) {
  if (decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask")
    return decisionReason.rule;
  if (decisionReason?.type === "subcommandResults") {
    for (let reason of decisionReason.reasons.values())
      if (reason.behavior === "ask") {
        let askRule = findAskRule(reason.decisionReason);
        if (askRule) return askRule;
      }
  }
  return;
}
//@ chunk-0e8j1zzj.js:19762-21481 fingerprint (2.1.88 match: stringsForDecisionReason, 0.747)
function stringsForDecisionReason(decisionReason, toolType, permissionMode) {
  if (!decisionReason) return null;
  let displayTextOf = (field) => displayField(field).text;
  if (decisionReason.type === "classifier") {
    if (decisionReason.classifier === "auto-mode")
      return {
        reasonString: `Auto mode needs your confirmation for this ${toolType}.
${displayTextOf(ensureNoReasonProvided(decisionReason.reason))}`,
        configString: undefined,
        themeColor: "error",
      };
    return {
      reasonString: `Classifier ${sequential.bold(displayTextOf(decisionReason.classifier))} requires confirmation for this ${toolType}.
${displayTextOf(decisionReason.reason)}`,
      configString: undefined,
    };
  }
  if (decisionReason.type === "subcommandResults") {
    let askRule = findAskRule(decisionReason);
    if (askRule)
      return stringsForDecisionReason(
        {
          type: "rule",
          rule: askRule,
        },
        toolType,
        permissionMode,
      );
    for (let reason of decisionReason.reasons.values())
      if (reason.behavior === "ask" || reason.behavior === "passthrough") {
        let strings = stringsForDecisionReason(reason.decisionReason, toolType, permissionMode);
        if (strings) return strings;
      }
  }
  switch (decisionReason.type) {
    case "rule": {
      let ruleLabel = sequential.bold(displayTextOf(formatPermissionRule(decisionReason.rule.ruleValue)));
      if (
        permissionMode === "auto" &&
        decisionReason.rule.ruleBehavior === "ask" &&
        decisionReason.rule.source !== "policySettings"
      )
        return {
          reasonString: `Ask rule ${ruleLabel} overrides auto mode for this ${toolType}.`,
          configString: "/permissions to let auto mode decide",
        };
      return {
        reasonString: `Permission rule ${ruleLabel} requires confirmation for this ${toolType}.`,
        configString:
          decisionReason.rule.source === "policySettings" ? undefined : "/permissions to update rules",
      };
    }
    case "hook": {
      let hookReasonString = decisionReason.reason
        ? `:
${displayTextOf(decisionReason.reason)}`
        : ".";
      let sourceLabel = decisionReason.hookSource
        ? ` ${sequential.dim(`[${displayTextOf(decisionReason.hookSource)}]`)}`
        : "";
      return {
        reasonString: `Hook ${sequential.bold(displayTextOf(decisionReason.hookName))} requires confirmation for this ${toolType}${hookReasonString}${sourceLabel}`,
        configString: `${getRuleSourceFileLabel(decisionReason.hookSource)} to update hooks`,
      };
    }
    case "safetyCheck":
    case "other":
      return {
        reasonString:
          decisionReason.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON
            ? CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT
            : displayTextOf(decisionReason.reason),
        configString: undefined,
      };
    case "workingDir":
      return {
        reasonString: displayTextOf(decisionReason.reason),
        configString: "/permissions to update rules",
      };
    case "sandboxOverride": {
      let replaces = decisionReason.replaces;
      if (replaces === undefined) return null;
      let reasonText = stringsForDecisionReason(replaces.decisionReason, toolType, permissionMode);
      if (reasonText !== null)
        return {
          ...reasonText,
          configString: undefined,
        };
      return replaces.message === undefined
        ? null
        : {
            reasonString: displayTextOf(replaces.message),
            configString: undefined,
          };
    }
    default:
      return null;
  }
}
//@ chunk-0e8j1zzj.js:21481-24742 fingerprint (2.1.88 match: PermissionRuleExplanation, 0.415)
/**
 * 规则解释：显示命中的规则及其来源（settings.json/插件 hooks.json/SKILL.md），auto 模式分类器原因，沙箱覆盖、连续拒绝等。
 */
function PermissionRuleExplanation(props) {
  let $ = useMemoCache(29);
  let { permissionResult, toolType, rowBudget, rowColumns, hideAskRuleHint, onConsentDrawn } = props;
  let permissionMode = useAppState(selectToolPermissionContextMode);
  let disclosure =
    permissionResult?.behavior === "ask" ? permissionResult.denialLimitFallback?.disclosure : undefined;
  let consentStrings = stringsForDecisionReason(permissionResult?.decisionReason, toolType, permissionMode);
  let disclosureStrings =
    disclosure !== undefined && disclosure !== permissionResult?.decisionReason
      ? stringsForDecisionReason(disclosure, toolType, permissionMode)
      : null;
  let { columns, rows } = useTerminalSize();
  let unattendedNotice = useUnattendedNotice();
  let min = Math.min(12, Math.max(MAX_EXPLANATION_LINES, rowBudget ?? rows - 13 - unattendedNotice));
  let max = Math.max(1, rowColumns ?? columns - 8);
  let clampText = (reasonString, maxLines, appendMore) => {
    let appendEllipsis = appendMore === undefined ? true : appendMore;
    if (!clampEnabled) {
      return reasonString;
    }
    let limit = maxLines;
    let mapped = wrapAnsi(reasonString, max, {
      trim: true,
      hard: true,
    })
      .split(
        `
`,
      )
      .map((line) => truncateToWidth(line, max));
    if (mapped.length <= limit) {
      return mapped.join(`
`);
    }
    let max_2 = Math.max(1, limit - 1);
    let moreLine = `\u2026 (+${mapped.length - max_2} more lines)`;
    return [...mapped.slice(0, max_2), ...(appendEllipsis ? [truncateToWidth(moreLine, max)] : [])].join(`
`);
  };
  let matchedAskRule = permissionResult?.behavior === "ask" ? permissionResult.matchedAskRule : undefined;
  let askRuleStrings =
    matchedAskRule !== undefined && findAskRule(permissionResult?.decisionReason) === undefined
      ? stringsForDecisionReason(
          {
            type: "rule",
            rule: matchedAskRule,
          },
          toolType,
          permissionMode,
        )
      : null;
  let countLines;
  if ($[0] !== max) {
    countLines = (text, trim) =>
      text === undefined
        ? 0
        : countCharInString(
            wrapAnsi(text, max, {
              trim,
              hard: true,
            }),
            `
`,
          ) + 1;
    $[0] = max;
    $[1] = countLines;
  } else countLines = $[1];
  let countLinesFor = countLines;
  let clampEnabled =
    disclosure !== undefined ||
    rowBudget !== undefined ||
    permissionResult?.decisionReason?.type === "sandboxOverride" ||
    countLinesFor(consentStrings?.reasonString, false) + countLinesFor(askRuleStrings?.reasonString, false) >
      min;
  let clampReason;
  if ($[2] !== clampEnabled || $[3] !== countLinesFor) {
    clampReason = (text) => (clampEnabled ? countLinesFor(text, true) : 0);
    $[2] = clampEnabled;
    $[3] = countLinesFor;
    $[4] = clampReason;
  } else clampReason = $[4];
  let clampReasonFor = clampReason;
  let isCompact = rowBudget !== undefined || min < 12;
  let streakReason =
    disclosureStrings && isCompact
      ? [
          truncateToWidth(getFirstLine(disclosureStrings.reasonString), max),
          ...disclosureStrings.reasonString
            .split(
              `
`,
            )
            .slice(1),
        ].join(`
`)
      : disclosureStrings?.reasonString;
  let reasonLengths = {
    consent: clampReasonFor(consentStrings?.reasonString),
    streak: clampReasonFor(streakReason),
    askRule: clampReasonFor(askRuleStrings?.reasonString),
  };
  let maxLinesByKind;
  if ($[5] !== isCompact) {
    maxLinesByKind = isCompact
      ? {
          consent: 2,
          streak: 3,
          askRule: 2,
        }
      : {
          consent: 4,
          streak: 4,
          askRule: 4,
        };
    $[5] = isCompact;
    $[6] = maxLinesByKind;
  } else maxLinesByKind = $[6];
  let maxLinesByKind_2 = maxLinesByKind;
  let drawnLines = {
    consent: Math.min(reasonLengths.consent, maxLinesByKind_2.consent),
    streak: Math.min(reasonLengths.streak, maxLinesByKind_2.streak),
    askRule: Math.min(reasonLengths.askRule, maxLinesByKind_2.askRule),
  };
  let remainingRows = min - (drawnLines.consent + drawnLines.streak + drawnLines.askRule);
  for (const kind of isCompact ? ["streak", "consent", "askRule"] : ["consent", "streak", "askRule"]) {
    if (remainingRows <= 0) {
      break;
    }
    let min = Math.min(reasonLengths[kind] - drawnLines[kind], remainingRows);
    drawnLines[kind] = drawnLines[kind] + min;
    remainingRows = remainingRows - min;
  }
  let consentText =
    consentStrings !== null && consentStrings !== undefined
      ? clampText(consentStrings.reasonString, drawnLines.consent)
      : undefined;
  let consentFullText =
    consentStrings !== null && consentStrings !== undefined
      ? clampText(consentStrings.reasonString, drawnLines.consent, false)
      : undefined;
  useEffect(() => {
    onConsentDrawn?.(consentFullText);
  }, [onConsentDrawn, consentFullText]);
  let streakText = streakReason !== undefined ? clampText(streakReason, drawnLines.streak) : undefined;
  let askRuleText = askRuleStrings ? clampText(askRuleStrings.reasonString, drawnLines.askRule) : undefined;
  let fallbackNotice;
  if ($[7] !== permissionResult) {
    fallbackNotice = jsxProd_default(DenialLimitFallbackNotice, {
      permissionResult,
    });
    $[7] = permissionResult;
    $[8] = fallbackNotice;
  } else fallbackNotice = $[8];
  let fallbackNotice_2 = fallbackNotice;
  if (!consentStrings && !askRuleStrings && !disclosureStrings) {
    return fallbackNotice_2;
  }
  let themeColor =
    consentStrings?.themeColor ??
    (permissionResult?.decisionReason?.type === "hook" && permissionMode === "auto" ? "warning" : undefined);
  let ruleRenderer = renderRuleExplanation;
  let consentBlock;
  if ($[9] !== consentText || $[10] !== consentStrings || $[11] !== themeColor) {
    consentBlock =
      consentStrings &&
      ruleRenderer(
        consentText ?? consentStrings.reasonString,
        themeColor
          ? jsxProd_default(Text, {
              color: themeColor,
              children: consentText ?? consentStrings.reasonString,
            })
          : jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: consentText ?? consentStrings.reasonString,
              }),
            }),
      );
    $[9] = consentText;
    $[10] = consentStrings;
    $[11] = themeColor;
    $[12] = consentBlock;
  } else consentBlock = $[12];
  let consentConfigText;
  if ($[13] !== consentStrings) {
    consentConfigText =
      consentStrings?.configString &&
      jsxProd_default(Text, {
        dimColor: true,
        children: consentStrings.configString,
      });
    $[13] = consentStrings;
    $[14] = consentConfigText;
  } else consentConfigText = $[14];
  let askRuleBlock;
  if (
    $[15] !== askRuleStrings ||
    $[16] !== askRuleText ||
    $[17] !== hideAskRuleHint ||
    $[18] !== consentStrings?.configString
  ) {
    askRuleBlock =
      askRuleStrings &&
      jsxProd_default_2(Fragment, {
        children: [
          ruleRenderer(
            askRuleText ?? askRuleStrings.reasonString,
            jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: askRuleText ?? askRuleStrings.reasonString,
              }),
            }),
          ),
          askRuleStrings.configString &&
            hideAskRuleHint !== true &&
            askRuleStrings.configString !== consentStrings?.configString &&
            jsxProd_default(Text, {
              dimColor: true,
              children: askRuleStrings.configString,
            }),
        ],
      });
    $[15] = askRuleStrings;
    $[16] = askRuleText;
    $[17] = hideAskRuleHint;
    $[18] = consentStrings?.configString;
    $[19] = askRuleBlock;
  } else askRuleBlock = $[19];
  let disclosureBlock;
  if ($[20] !== streakText || $[21] !== disclosureStrings) {
    disclosureBlock =
      disclosureStrings &&
      ruleRenderer(
        streakText ?? disclosureStrings.reasonString,
        disclosureStrings.themeColor
          ? jsxProd_default(Text, {
              color: disclosureStrings.themeColor,
              children: streakText ?? disclosureStrings.reasonString,
            })
          : jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: streakText ?? disclosureStrings.reasonString,
              }),
            }),
      );
    $[20] = streakText;
    $[21] = disclosureStrings;
    $[22] = disclosureBlock;
  } else disclosureBlock = $[22];
  let content;
  if (
    $[23] !== fallbackNotice_2 ||
    $[24] !== consentBlock ||
    $[25] !== consentConfigText ||
    $[26] !== askRuleBlock ||
    $[27] !== disclosureBlock
  ) {
    content = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [consentBlock, consentConfigText, askRuleBlock, disclosureBlock, fallbackNotice_2],
    });
    $[23] = fallbackNotice_2;
    $[24] = consentBlock;
    $[25] = consentConfigText;
    $[26] = askRuleBlock;
    $[27] = disclosureBlock;
    $[28] = content;
  } else content = $[28];
  return content;
}
export { MAX_EXPLANATION_LINES, PermissionRuleExplanation };
