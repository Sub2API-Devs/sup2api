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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Blockquote } from "../Blockquote.js";
import { needsGutter, displayField } from "../../utils/permissions/approvalPayloadSerialization.js";
import { het } from "../../utils/messages.js";
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
function ea(Cn, jo) {
  return e(Blockquote, { multiline: needsGutter(Cn), children: jo });
}
//@ chunk-0e8j1zzj.js:19404-19413 layout
var MAX_EXPLANATION_LINES = 7;
//@ chunk-0e8j1zzj.js:19413-19546 layout
function getRuleSourceFileLabel(o) {
  if (o?.startsWith("plugin")) return "plugin hooks.json";
  if (o?.startsWith("skill")) return "SKILL.md";
  return "settings.json";
}
//@ chunk-0e8j1zzj.js:19546-19762 layout
function findAskRule(o) {
  if (o?.type === "rule" && o.rule.ruleBehavior === "ask") return o.rule;
  if (o?.type === "subcommandResults") {
    for (let t of o.reasons.values())
      if (t.behavior === "ask") {
        let d = findAskRule(t.decisionReason);
        if (d) return d;
      }
  }
  return;
}
//@ chunk-0e8j1zzj.js:19762-21481 fingerprint = stringsForDecisionReason (0.747)
function stringsForDecisionReason(o, t, d) {
  if (!o) return null;
  let c = (m) => displayField(m).text;
  if (o.type === "classifier") {
    if (o.classifier === "auto-mode")
      return {
        reasonString: `Auto mode needs your confirmation for this ${t}.
${c(het(o.reason))}`,
        configString: void 0,
        themeColor: "error",
      };
    return {
      reasonString: `Classifier ${sequential.bold(c(o.classifier))} requires confirmation for this ${t}.
${c(o.reason)}`,
      configString: void 0,
    };
  }
  if (o.type === "subcommandResults") {
    let m = findAskRule(o);
    if (m) return stringsForDecisionReason({ type: "rule", rule: m }, t, d);
    for (let u of o.reasons.values())
      if (u.behavior === "ask" || u.behavior === "passthrough") {
        let i = stringsForDecisionReason(u.decisionReason, t, d);
        if (i) return i;
      }
  }
  switch (o.type) {
    case "rule": {
      let bold = sequential.bold(c(formatPermissionRule(o.rule.ruleValue)));
      if (d === "auto" && o.rule.ruleBehavior === "ask" && o.rule.source !== "policySettings")
        return {
          reasonString: `Ask rule ${bold} overrides auto mode for this ${t}.`,
          configString: "/permissions to let auto mode decide",
        };
      return {
        reasonString: `Permission rule ${bold} requires confirmation for this ${t}.`,
        configString: o.rule.source === "policySettings" ? void 0 : "/permissions to update rules",
      };
    }
    case "hook": {
      let m = o.reason
          ? `:
${c(o.reason)}`
          : ".",
        u = o.hookSource ? ` ${sequential.dim(`[${c(o.hookSource)}]`)}` : "";
      return {
        reasonString: `Hook ${sequential.bold(c(o.hookName))} requires confirmation for this ${t}${m}${u}`,
        configString: `${getRuleSourceFileLabel(o.hookSource)} to update hooks`,
      };
    }
    case "safetyCheck":
    case "other":
      return {
        reasonString:
          o.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON
            ? CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT
            : c(o.reason),
        configString: void 0,
      };
    case "workingDir":
      return { reasonString: c(o.reason), configString: "/permissions to update rules" };
    case "sandboxOverride": {
      let replaces = o.replaces;
      if (replaces === void 0) return null;
      let u = stringsForDecisionReason(replaces.decisionReason, t, d);
      if (u !== null) return { ...u, configString: void 0 };
      return replaces.message === void 0 ? null : { reasonString: c(replaces.message), configString: void 0 };
    }
    default:
      return null;
  }
}
/**
 * 规则解释：显示命中的规则及其来源（settings.json/插件 hooks.json/SKILL.md），auto 模式分类器原因，沙箱覆盖、连续拒绝等。
 */
//@ chunk-0e8j1zzj.js:21481-24742 fingerprint = PermissionRuleExplanation (0.415)
function PermissionRuleExplanation(t0) {
  let $ = w(29),
    {
      permissionResult: permissionResult,
      toolType: toolType,
      rowBudget: rowBudget,
      rowColumns: rowColumns,
      hideAskRuleHint: hideAskRuleHint,
      onConsentDrawn: onConsentDrawn,
    } = t0,
    permissionMode = useAppState(selectToolPermissionContextMode),
    k = permissionResult?.behavior === "ask" ? permissionResult.denialLimitFallback?.disclosure : void 0,
    f = stringsForDecisionReason(permissionResult?.decisionReason, toolType, permissionMode),
    g =
      k !== void 0 && k !== permissionResult?.decisionReason
        ? stringsForDecisionReason(k, toolType, permissionMode)
        : null,
    { columns: columns, rows: rows } = useTerminalSize(),
    x = useUnattendedNotice(),
    min = Math.min(12, Math.max(MAX_EXPLANATION_LINES, rowBudget ?? rows - 13 - x)),
    max = Math.max(1, rowColumns ?? columns - 8),
    z = (v, I, L) => {
      let b = L === void 0 ? !0 : L;
      if (!E) {
        return v;
      }
      let W = I;
      let mapped = wrapAnsi(v, max, { trim: !0, hard: !0 })
        .split(
          `
`,
        )
        .map((le) => truncateToWidth(le, max));
      if (mapped.length <= W) {
        return mapped.join(`
`);
      }
      let max_2 = Math.max(1, W - 1);
      let Y = `\u2026 (+${mapped.length - max_2} more lines)`;
      return [...mapped.slice(0, max_2), ...(b ? [truncateToWidth(Y, max)] : [])].join(`
`);
    },
    F = permissionResult?.behavior === "ask" ? permissionResult.matchedAskRule : void 0,
    U =
      F !== void 0 && findAskRule(permissionResult?.decisionReason) === void 0
        ? stringsForDecisionReason({ type: "rule", rule: F }, toolType, permissionMode)
        : null,
    de;
  if ($[0] !== max)
    ((de = (oe, ue) =>
      oe === void 0
        ? 0
        : countCharInString(
            wrapAnsi(oe, max, { trim: ue, hard: !0 }),
            `
`,
          ) + 1),
      ($[0] = max),
      ($[1] = de));
  else de = $[1];
  let K = de,
    E =
      k !== void 0 ||
      rowBudget !== void 0 ||
      permissionResult?.decisionReason?.type === "sandboxOverride" ||
      K(f?.reasonString, !1) + K(U?.reasonString, !1) > min,
    Ne;
  if ($[2] !== E || $[3] !== K) ((Ne = ($e) => (E ? K($e, !0) : 0)), ($[2] = E), ($[3] = K), ($[4] = Ne));
  else Ne = $[4];
  let We = Ne,
    ae = rowBudget !== void 0 || min < 12,
    J =
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
        : g?.reasonString,
    Oe = { consent: We(f?.reasonString), streak: We(J), askRule: We(U?.reasonString) },
    Ye;
  if ($[5] !== ae)
    ((Ye = ae ? { consent: 2, streak: 3, askRule: 2 } : { consent: 4, streak: 4, askRule: 4 }),
      ($[5] = ae),
      ($[6] = Ye));
  else Ye = $[6];
  let He = Ye,
    pe = {
      consent: Math.min(Oe.consent, He.consent),
      streak: Math.min(Oe.streak, He.streak),
      askRule: Math.min(Oe.askRule, He.askRule),
    },
    ne = min - (pe.consent + pe.streak + pe.askRule);
  for (const ht of ae ? ["streak", "consent", "askRule"] : ["consent", "streak", "askRule"]) {
    if (ne <= 0) {
      break;
    }
    let min = Math.min(Oe[ht] - pe[ht], ne);
    ((pe[ht] = pe[ht] + min), (ne = ne - min));
  }
  let yt = f !== null && f !== void 0 ? z(f.reasonString, pe.consent) : void 0,
    qe = f !== null && f !== void 0 ? z(f.reasonString, pe.consent, !1) : void 0;
  P(() => {
    onConsentDrawn?.(qe);
  }, [onConsentDrawn, qe]);
  let ge = J !== void 0 ? z(J, pe.streak) : void 0,
    bt = U ? z(U.reasonString, pe.askRule) : void 0,
    Ge;
  if ($[7] !== permissionResult)
    ((Ge = e(DenialLimitFallbackNotice, { permissionResult: permissionResult })),
      ($[7] = permissionResult),
      ($[8] = Ge));
  else Ge = $[8];
  let dt = Ge;
  if (!f && !U && !g) {
    return dt;
  }
  let kt =
      f?.themeColor ??
      (permissionResult?.decisionReason?.type === "hook" && permissionMode === "auto" ? "warning" : void 0),
    Ie = ea,
    Ke;
  if ($[9] !== yt || $[10] !== f || $[11] !== kt)
    ((Ke =
      f &&
      Ie(
        yt ?? f.reasonString,
        kt
          ? e(Text, { color: kt, children: yt ?? f.reasonString })
          : e(Text, { children: e(Ansi, { children: yt ?? f.reasonString }) }),
      )),
      ($[9] = yt),
      ($[10] = f),
      ($[11] = kt),
      ($[12] = Ke));
  else Ke = $[12];
  let Tn;
  if ($[13] !== f)
    ((Tn = f?.configString && e(Text, { dimColor: !0, children: f.configString })),
      ($[13] = f),
      ($[14] = Tn));
  else Tn = $[14];
  let Re;
  if ($[15] !== U || $[16] !== bt || $[17] !== hideAskRuleHint || $[18] !== f?.configString)
    ((Re =
      U &&
      r(Fragment, {
        children: [
          Ie(bt ?? U.reasonString, e(Text, { children: e(Ansi, { children: bt ?? U.reasonString }) })),
          U.configString &&
            hideAskRuleHint !== !0 &&
            U.configString !== f?.configString &&
            e(Text, { dimColor: !0, children: U.configString }),
        ],
      })),
      ($[15] = U),
      ($[16] = bt),
      ($[17] = hideAskRuleHint),
      ($[18] = f?.configString),
      ($[19] = Re));
  else Re = $[19];
  let ye;
  if ($[20] !== ge || $[21] !== g)
    ((ye =
      g &&
      Ie(
        ge ?? g.reasonString,
        g.themeColor
          ? e(Text, { color: g.themeColor, children: ge ?? g.reasonString })
          : e(Text, { children: e(Ansi, { children: ge ?? g.reasonString }) }),
      )),
      ($[20] = ge),
      ($[21] = g),
      ($[22] = ye));
  else ye = $[22];
  let Xe;
  if ($[23] !== dt || $[24] !== Ke || $[25] !== Tn || $[26] !== Re || $[27] !== ye)
    ((Xe = r(Box, { marginBottom: 1, flexDirection: "column", children: [Ke, Tn, Re, ye, dt] })),
      ($[23] = dt),
      ($[24] = Ke),
      ($[25] = Tn),
      ($[26] = Re),
      ($[27] = ye),
      ($[28] = Xe));
  else Xe = $[28];
  return Xe;
}

export { MAX_EXPLANATION_LINES, PermissionRuleExplanation };
