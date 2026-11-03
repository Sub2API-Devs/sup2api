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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useUnattendedNotice, DenialLimitFallbackNotice } from "./UnattendedAutoBlockNotice.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { truncateToWidth } from "../../utils/format.js";
import { countCharInString, getFirstLine } from "../../utils/stringUtils.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";

//@ chunk-0e8j1zzj.js:19288-19341 callgraph-fingerprint = _temp (1)
function selectToolPermissionContextMode(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-0e8j1zzj.js:19341-19404 layout
function renderRuleExplanation(Cn, children) {
  return jsxProd_default(Blockquote, {
    multiline: needsGutter(Cn),
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
//@ chunk-0e8j1zzj.js:19762-21481 fingerprint = stringsForDecisionReason (0.747)
function stringsForDecisionReason(decisionReason, toolType, permissionMode) {
  if (!decisionReason) return null;
  let c = (m) => displayField(m).text;
  if (decisionReason.type === "classifier") {
    if (decisionReason.classifier === "auto-mode")
      return {
        reasonString: `Auto mode needs your confirmation for this ${toolType}.
${c(ensureNoReasonProvided(decisionReason.reason))}`,
        configString: undefined,
        themeColor: "error",
      };
    return {
      reasonString: `Classifier ${sequential.bold(c(decisionReason.classifier))} requires confirmation for this ${toolType}.
${c(decisionReason.reason)}`,
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
        let i = stringsForDecisionReason(reason.decisionReason, toolType, permissionMode);
        if (i) return i;
      }
  }
  switch (decisionReason.type) {
    case "rule": {
      let m = sequential.bold(c(formatPermissionRule(decisionReason.rule.ruleValue)));
      if (
        permissionMode === "auto" &&
        decisionReason.rule.ruleBehavior === "ask" &&
        decisionReason.rule.source !== "policySettings"
      )
        return {
          reasonString: `Ask rule ${m} overrides auto mode for this ${toolType}.`,
          configString: "/permissions to let auto mode decide",
        };
      return {
        reasonString: `Permission rule ${m} requires confirmation for this ${toolType}.`,
        configString:
          decisionReason.rule.source === "policySettings" ? undefined : "/permissions to update rules",
      };
    }
    case "hook": {
      let hookReasonString = decisionReason.reason
        ? `:
${c(decisionReason.reason)}`
        : ".";
      let sourceLabel = decisionReason.hookSource
        ? ` ${sequential.dim(`[${c(decisionReason.hookSource)}]`)}`
        : "";
      return {
        reasonString: `Hook ${sequential.bold(c(decisionReason.hookName))} requires confirmation for this ${toolType}${hookReasonString}${sourceLabel}`,
        configString: `${getRuleSourceFileLabel(decisionReason.hookSource)} to update hooks`,
      };
    }
    case "safetyCheck":
    case "other":
      return {
        reasonString:
          decisionReason.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON
            ? CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT
            : c(decisionReason.reason),
        configString: undefined,
      };
    case "workingDir":
      return {
        reasonString: c(decisionReason.reason),
        configString: "/permissions to update rules",
      };
    case "sandboxOverride": {
      let replaces = decisionReason.replaces;
      if (replaces === undefined) return null;
      let u = stringsForDecisionReason(replaces.decisionReason, toolType, permissionMode);
      if (u !== null)
        return {
          ...u,
          configString: undefined,
        };
      return replaces.message === undefined
        ? null
        : {
            reasonString: c(replaces.message),
            configString: undefined,
          };
    }
    default:
      return null;
  }
}
//@ chunk-0e8j1zzj.js:21481-24742 fingerprint = PermissionRuleExplanation (0.415)
/**
 * 规则解释：显示命中的规则及其来源（settings.json/插件 hooks.json/SKILL.md），auto 模式分类器原因，沙箱覆盖、连续拒绝等。
 */
function PermissionRuleExplanation(props) {
  let $ = w(29);
  let { permissionResult, toolType, rowBudget, rowColumns, hideAskRuleHint, onConsentDrawn } = props;
  let permissionMode = useAppState(selectToolPermissionContextMode);
  let disclosure =
    permissionResult?.behavior === "ask" ? permissionResult.denialLimitFallback?.disclosure : undefined;
  let f = stringsForDecisionReason(permissionResult?.decisionReason, toolType, permissionMode);
  let g =
    disclosure !== undefined && disclosure !== permissionResult?.decisionReason
      ? stringsForDecisionReason(disclosure, toolType, permissionMode)
      : null;
  let { columns, rows } = useTerminalSize();
  let unattendedNotice = useUnattendedNotice();
  let min = Math.min(12, Math.max(MAX_EXPLANATION_LINES, rowBudget ?? rows - 13 - unattendedNotice));
  let max = Math.max(1, rowColumns ?? columns - 8);
  let z = (reasonString, I, L) => {
    let b = L === undefined ? true : L;
    if (!E) {
      return reasonString;
    }
    let W = I;
    let mapped = wrapAnsi(reasonString, max, {
      trim: true,
      hard: true,
    })
      .split(
        `
`,
      )
      .map((line) => truncateToWidth(line, max));
    if (mapped.length <= W) {
      return mapped.join(`
`);
    }
    let max_2 = Math.max(1, W - 1);
    let Y = `\u2026 (+${mapped.length - max_2} more lines)`;
    return [...mapped.slice(0, max_2), ...(b ? [truncateToWidth(Y, max)] : [])].join(`
`);
  };
  let matchedAskRule = permissionResult?.behavior === "ask" ? permissionResult.matchedAskRule : undefined;
  let U =
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
  let de;
  if ($[0] !== max) {
    de = (oe, trim) =>
      oe === undefined
        ? 0
        : countCharInString(
            wrapAnsi(oe, max, {
              trim,
              hard: true,
            }),
            `
`,
          ) + 1;
    $[0] = max;
    $[1] = de;
  } else de = $[1];
  let K = de;
  let E =
    disclosure !== undefined ||
    rowBudget !== undefined ||
    permissionResult?.decisionReason?.type === "sandboxOverride" ||
    K(f?.reasonString, false) + K(U?.reasonString, false) > min;
  let Ne;
  if ($[2] !== E || $[3] !== K) {
    Ne = ($e) => (E ? K($e, true) : 0);
    $[2] = E;
    $[3] = K;
    $[4] = Ne;
  } else Ne = $[4];
  let We = Ne;
  let ae = rowBudget !== undefined || min < 12;
  let J =
    g && ae
      ? [
          truncateToWidth(getFirstLine(g.reasonString), max),
          ...g.reasonString
            .split(
              `
`,
            )
            .slice(1),
        ].join(`
`)
      : g?.reasonString;
  let Oe = {
    consent: We(f?.reasonString),
    streak: We(J),
    askRule: We(U?.reasonString),
  };
  let Ye;
  if ($[5] !== ae) {
    Ye = ae
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
    $[5] = ae;
    $[6] = Ye;
  } else Ye = $[6];
  let He = Ye;
  let pe = {
    consent: Math.min(Oe.consent, He.consent),
    streak: Math.min(Oe.streak, He.streak),
    askRule: Math.min(Oe.askRule, He.askRule),
  };
  let ne = min - (pe.consent + pe.streak + pe.askRule);
  for (const ht of ae ? ["streak", "consent", "askRule"] : ["consent", "streak", "askRule"]) {
    if (ne <= 0) {
      break;
    }
    let min = Math.min(Oe[ht] - pe[ht], ne);
    pe[ht] = pe[ht] + min;
    ne = ne - min;
  }
  let yt = f !== null && f !== undefined ? z(f.reasonString, pe.consent) : undefined;
  let qe = f !== null && f !== undefined ? z(f.reasonString, pe.consent, false) : undefined;
  P(() => {
    onConsentDrawn?.(qe);
  }, [onConsentDrawn, qe]);
  let ge = J !== undefined ? z(J, pe.streak) : undefined;
  let bt = U ? z(U.reasonString, pe.askRule) : undefined;
  let Ge;
  if ($[7] !== permissionResult) {
    Ge = jsxProd_default(DenialLimitFallbackNotice, {
      permissionResult,
    });
    $[7] = permissionResult;
    $[8] = Ge;
  } else Ge = $[8];
  let dt = Ge;
  if (!f && !U && !g) {
    return dt;
  }
  let kt =
    f?.themeColor ??
    (permissionResult?.decisionReason?.type === "hook" && permissionMode === "auto" ? "warning" : undefined);
  let Ie = renderRuleExplanation;
  let Ke;
  if ($[9] !== yt || $[10] !== f || $[11] !== kt) {
    Ke =
      f &&
      Ie(
        yt ?? f.reasonString,
        kt
          ? jsxProd_default(Text, {
              color: kt,
              children: yt ?? f.reasonString,
            })
          : jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: yt ?? f.reasonString,
              }),
            }),
      );
    $[9] = yt;
    $[10] = f;
    $[11] = kt;
    $[12] = Ke;
  } else Ke = $[12];
  let Tn;
  if ($[13] !== f) {
    Tn =
      f?.configString &&
      jsxProd_default(Text, {
        dimColor: true,
        children: f.configString,
      });
    $[13] = f;
    $[14] = Tn;
  } else Tn = $[14];
  let Re;
  if ($[15] !== U || $[16] !== bt || $[17] !== hideAskRuleHint || $[18] !== f?.configString) {
    Re =
      U &&
      jsxProd_default_2(Fragment, {
        children: [
          Ie(
            bt ?? U.reasonString,
            jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: bt ?? U.reasonString,
              }),
            }),
          ),
          U.configString &&
            hideAskRuleHint !== true &&
            U.configString !== f?.configString &&
            jsxProd_default(Text, {
              dimColor: true,
              children: U.configString,
            }),
        ],
      });
    $[15] = U;
    $[16] = bt;
    $[17] = hideAskRuleHint;
    $[18] = f?.configString;
    $[19] = Re;
  } else Re = $[19];
  let ye;
  if ($[20] !== ge || $[21] !== g) {
    ye =
      g &&
      Ie(
        ge ?? g.reasonString,
        g.themeColor
          ? jsxProd_default(Text, {
              color: g.themeColor,
              children: ge ?? g.reasonString,
            })
          : jsxProd_default(Text, {
              children: jsxProd_default(Ansi, {
                children: ge ?? g.reasonString,
              }),
            }),
      );
    $[20] = ge;
    $[21] = g;
    $[22] = ye;
  } else ye = $[22];
  let Xe;
  if ($[23] !== dt || $[24] !== Ke || $[25] !== Tn || $[26] !== Re || $[27] !== ye) {
    Xe = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [Ke, Tn, Re, ye, dt],
    });
    $[23] = dt;
    $[24] = Ke;
    $[25] = Tn;
    $[26] = Re;
    $[27] = ye;
    $[28] = Xe;
  } else Xe = $[28];
  return Xe;
}
export { MAX_EXPLANATION_LINES, PermissionRuleExplanation };
