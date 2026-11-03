/**
 * components/agents/AgentsMenu.tsx
 *
 * /agents 菜单主组件；本模块混入大量 auto 模式规则（allow/soft_deny/hard_deny）与设置来源判定代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentsMenu.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-82kqcve8.js (1), chunk-p2qwpk2k.js (5)
 * attribution: fingerprint 3, placement 4, callgraph-witnessed 1
 */
import {
  getAutoModeRuleCategoryLabel,
  getRuleSourceBadge,
  getAutoModeSectionColor,
  RULE_LABEL_WIDTH,
  AUTO_MODE_RULE_SECTIONS,
  splitByWidth,
  isNotEnvironmentSection,
  toRuleKeyPair,
  sortRuleEntries,
  ruleText,
  normalizedRuleText,
  isEnvironmentSection,
  toDisplayRule,
  toDisplayRuleNoTag,
  ruleSource,
  describeRuleSource,
  isUserSettingsRule,
  isNonUserSettingsRule,
  ruleKey,
  padSectionLabel,
  MAX_RULE_ROWS,
  ruleKeyValuePair,
} from "../permissions/rules/autoModeRuleEdits.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getDefaultExternalAutoModeRules } from "../../utils/permissions/yoloClassifier.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { useTabsWidth, useTabHeaderFocus } from "../design-system/Tabs.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { R, P } from "../../../vendor/react/cjs/react.production.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { uniqueLabels } from "../../utils/permissions/approvalPayloadSerialization.js";
import { uniq, count } from "../../utils/collections.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { SearchBox } from "../SearchBox.js";
import { ModelSelector } from "./ModelSelector.js";
import { permissionModeSignal } from "../../utils/permissions/permissionSetup.js";

//@ chunk-p2qwpk2k.js:42457-42729 placement
/**
 * 渲染自动模式规则的分类标签（按分区着色），并附加规则来源说明。
 */
function AutoModeRuleLabel(mo) {
  let autoModeRuleCategoryLabel = getAutoModeRuleCategoryLabel(mo.section);
  let Dr = mo.legacy ? "legacy" : getRuleSourceBadge(mo.source);
  if (!Dr) {
    return jsxProd_default(Text, {
      color: getAutoModeSectionColor(mo.section),
      children: autoModeRuleCategoryLabel.padEnd(RULE_LABEL_WIDTH),
    });
  }
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Text, {
        color: getAutoModeSectionColor(mo.section),
        children: autoModeRuleCategoryLabel,
      }),
      jsxProd_default(Text, {
        dimColor: true,
        children: ` \xB7 ${Dr}`.padEnd(RULE_LABEL_WIDTH - autoModeRuleCategoryLabel.length),
      }),
    ],
  });
}
//@ chunk-p2qwpk2k.js:42828-42962 placement
/**
 * 计算各自动模式规则分区内置规则的数量（只算一次）。
 */
function useBuiltinRuleCounts() {
  let $ = w(1);
  let i;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let defaultExternalAutoModeRules = getDefaultExternalAutoModeRules();
    i = Object.fromEntries(
      AUTO_MODE_RULE_SECTIONS.map((a) => [a, defaultExternalAutoModeRules[a]?.length ?? 0]),
    );
    $[0] = i;
  } else i = $[0];
  return i;
}
//@ chunk-p2qwpk2k.js:44000-44147 placement
/**
 * 按显示宽度截断文本（按字素切分），超出时末尾加省略号。
 */
function truncateWithEllipsis(h, i) {
  if (bunStringWidth(h) <= i) return h;
  let m = "";
  let a = 0;
  for (let { segment } of getGraphemeSegmenter().segment(h)) {
    let g = bunStringWidth(segment);
    if (a + g > i - 1) break;
    m += segment;
    a += g;
  }
  return `${m}\u2026`;
}
//@ chunk-p2qwpk2k.js:44147-44417 placement
/**
 * 按显示宽度把文本按单词折行，过长的单词强制拆开。
 */
function wrapWithIndent(h, i) {
  let m = [];
  let a = "";
  let f = 0;
  let g = () => {
    if (a.length > 0) {
      m.push(a);
      a = "";
      f = 0;
    }
  };
  for (let v of h.split(" ")) {
    let x = bunStringWidth(v) > i ? splitByWidth(v, i) : [v];
    for (let C of x) {
      let c = bunStringWidth(C);
      if (f === 0) {
        a = C;
        f = c;
      } else if (f + 1 + c <= i) {
        a = `${a} ${C}`;
        f += 1 + c;
      } else {
        g();
        a = C;
        f = c;
      }
    }
  }
  g();
  return m.join(`
${" ".repeat(RULE_LABEL_WIDTH)}`);
}
//@ chunk-p2qwpk2k.js:44417-49860 callgraph-witnessed = AgentsMenu (0.027)
function AgentsMenu(props) {
  let $ = w(64);
  let {
    entries,
    searchQuery,
    isSearchMode,
    isFocused,
    onAddNew,
    onSelectEntry,
    onCancel,
    onHeaderFocusChange,
    cursorOffset,
    defaultFocusValue,
    builtinsState,
    onSelectBuiltins,
    onSelectEnvironment,
  } = props;
  let builtinRuleCounts = useBuiltinRuleCounts();
  let V;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    V = getDefaultExternalAutoModeRules().environment ?? [];
    $[0] = V;
  } else V = $[0];
  let L = V;
  let tabsWidth = useTabsWidth();
  let { columns } = useTerminalSize();
  let { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus();
  let agentDefinitions = R(null);
  let K;
  let ye;
  if ($[1] !== blurHeader || $[2] !== headerFocused || $[3] !== isSearchMode) {
    K = () => {
      if (isSearchMode && headerFocused) blurHeader(agentDefinitions.current);
    };
    ye = [isSearchMode, headerFocused, blurHeader];
    $[1] = blurHeader;
    $[2] = headerFocused;
    $[3] = isSearchMode;
    $[4] = K;
    $[5] = ye;
  } else {
    K = $[4];
    ye = $[5];
  }
  P(K, ye);
  useFocusOnMount(agentDefinitions, isSearchMode);
  let ue = headerFocused && !isSearchMode;
  let ee;
  let ce;
  if ($[6] !== ue || $[7] !== onHeaderFocusChange) {
    ee = () => {
      onHeaderFocusChange(ue);
    };
    ce = [ue, onHeaderFocusChange];
    $[6] = ue;
    $[7] = onHeaderFocusChange;
    $[8] = ee;
    $[9] = ce;
  } else {
    ee = $[8];
    ce = $[9];
  }
  P(ee, ce);
  let te = builtinsState.environment.control !== "internalTemplate";
  let Se;
  if ($[10] !== entries || $[11] !== te) {
    Se = te ? entries.filter(isNotEnvironmentSection) : entries;
    $[10] = entries;
    $[11] = te;
    $[12] = Se;
  } else Se = $[12];
  let de = Se;
  let X;
  if ($[13] !== de) {
    X = new Map(de.map(toRuleKeyPair));
    $[13] = de;
    $[14] = X;
  } else X = $[14];
  let Ve = X;
  let Le;
  if (
    $[15] !== builtinsState ||
    $[16] !== builtinRuleCounts ||
    $[17] !== entries ||
    $[18] !== te ||
    $[19] !== de ||
    $[20] !== searchQuery ||
    $[21] !== tabsWidth ||
    $[22] !== columns
  ) {
    let lower = searchQuery.toLowerCase();
    let allAgents_0 = sortRuleEntries(de).filter(
      (a_6) => !searchQuery || a_6.text.toLowerCase().includes(lower),
    );
    let Ge = uniqueLabels(allAgents_0.map(ruleText), normalizedRuleText);
    let ot = te ? sortRuleEntries(entries).filter(isEnvironmentSection) : [];
    let at = ot.length > 0;
    let Ze = at ? ot.map(toDisplayRule) : L.map(toDisplayRuleNoTag);
    let environment = builtinsState.environment;
    let joined = uniq(ot.map(ruleSource)).map(describeRuleSource).join(" and ");
    let any = ot.some(isUserSettingsRule);
    let any_2 = ot.some(isNonUserSettingsRule);
    let rt = !any_2 ? "enter to edit" : any ? "enter to edit your entries" : "enter to add your own";
    let dt = !at
      ? `Built-in default document${environment.control === "otherSource" ? ` \xB7 kept by ${describeRuleSource(environment.source ?? "userSettings")}` : ""} \xB7 enter to edit`
      : `${environment.enabled ? "Extends" : "Replaces"} the built-in default \xB7 from ${joined} \xB7 ${rt}`;
    let Qe;
    if ($[24] !== builtinsState) {
      Qe = (agent_0) => {
        let Ht = builtinsState[agent_0];
        if (agent_0 === "environment") {
          return Ht.control === "internalTemplate";
        }
        return !(Ht.control === "otherSource" && !Ht.enabled);
      };
      $[24] = builtinsState;
      $[25] = Qe;
    } else Qe = $[25];
    let ko = Qe;
    let Do = searchQuery.length > 0 && Ze.some((fr) => fr.text.toLowerCase().includes(lower));
    let Ut = te && (searchQuery ? Do : true);
    let W = allAgents_0.length + (Ut ? 1 : 0) + (searchQuery ? 0 : 1 + count(AUTO_MODE_RULE_SECTIONS, ko));
    let N = String(W).length + 2;
    let max = Math.max(1, (tabsWidth ?? columns - 4) - 4 - N - RULE_LABEL_WIDTH);
    let ge = AutoModeRuleLabel;
    let ke;
    if ($[26] !== max) {
      ke = (value_0) => {
        let Wt = wrapWithIndent(value_0, max);
        let lines = Wt.split(`
`);
        if (lines.length <= 3) {
          return Wt;
        }
        return (
          lines.slice(0, 3).join(`
`) +
          `
${" ".repeat(RULE_LABEL_WIDTH)}\u2026 (+${lines.length - 3} lines)`
        );
      };
      $[26] = max;
      $[27] = ke;
    } else ke = $[27];
    let gr = ke;
    let rn = (vr, Po) => ({
      label: jsxProd_default_2(Text, {
        children: [
          ge(vr),
          vr.structure
            ? jsxProd_default(Text, {
                dimColor: true,
                children: gr(Ge[Po] ?? ""),
              })
            : gr(Ge[Po] ?? ""),
        ],
      }),
      value: ruleKey(vr),
    });
    let sn = padSectionLabel;
    let wr = () => {
      let sliced = Ze.slice(0, MAX_RULE_ROWS);
      let ro = Ze.length - sliced.length;
      return {
        label: jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              color: getAutoModeSectionColor("environment"),
              children: "Environment".padEnd(RULE_LABEL_WIDTH),
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: truncateWithEllipsis(dt, max),
            }),
            sliced.map((br, Cr) =>
              jsxProd_default(
                Text,
                {
                  dimColor: true,
                  children: `
${sn(br.tag)}${truncateWithEllipsis(br.text, max)}`,
                },
                Cr,
              ),
            ),
            ro > 0
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: `
${" ".repeat(RULE_LABEL_WIDTH)}\u2026 (+${ro} more ${ro === 1 ? "line" : "lines"})`,
                })
              : null,
          ],
        }),
        value: "environment-document",
      };
    };
    let ct;
    if ($[28] !== builtinsState || $[29] !== builtinRuleCounts) {
      ct = (a_8) => {
        let $t = builtinsState[a_8];
        let Fo = $t.enabled ? "[x]" : "[ ]";
        let Rr = builtinRuleCounts[a_8] ?? 0;
        if ($t.control === "internalTemplate") {
          return {
            label: jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  color: getAutoModeSectionColor(a_8),
                  children: getAutoModeRuleCategoryLabel(a_8).padEnd(RULE_LABEL_WIDTH),
                }),
                a_8 === "environment" ? "Built-in environment" : "Built-in rules",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "",
                }),
              ],
            }),
            value: `builtins:${a_8}`,
          };
        }
        return {
          label: jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                color: getAutoModeSectionColor(a_8),
                children: getAutoModeRuleCategoryLabel(a_8).padEnd(RULE_LABEL_WIDTH),
              }),
              `${Fo} Built-in rules`,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  ` \xB7 ${Rr}${$t.enabled ? "" : " \xB7 off"}`,
                  $t.control === "user" || $t.control === "empty"
                    ? ""
                    : ` \xB7 from ${describeRuleSource($t.source ?? "policySettings")}`,
                ],
              }),
            ],
          }),
          value: `builtins:${a_8}`,
        };
      };
      $[28] = builtinsState;
      $[29] = builtinRuleCounts;
      $[30] = ct;
    } else ct = $[30];
    let Su = ct;
    Le = searchQuery
      ? [...allAgents_0.map(rn), ...(Ut ? [wr()] : [])]
      : [
          {
            label: `Add a new rule${figures_default.ellipsis}`,
            value: "add-new-rule",
          },
          ...AUTO_MODE_RULE_SECTIONS.flatMap((ln) => {
            if (ln === "environment" && te) {
              return [wr()];
            }
            let mapped = allAgents_0
              .map(ruleKeyValuePair)
              .filter((so) => {
                let [Oi] = so;
                return Oi.section === ln;
              })
              .map((value) => {
                let [xu, Au] = value;
                return rn(xu, Au);
              });
            return ko(ln) ? [Su(ln), ...mapped] : mapped;
          }),
        ];
    $[15] = builtinsState;
    $[16] = builtinRuleCounts;
    $[17] = entries;
    $[18] = te;
    $[19] = de;
    $[20] = searchQuery;
    $[21] = tabsWidth;
    $[22] = columns;
    $[23] = Le;
  } else Le = $[23];
  let lo = Le;
  const tabIndex = isSearchMode ? 0 : undefined;
  let onFocus;
  if ($[31] !== blurHeader || $[32] !== isSearchMode) {
    onFocus = isSearchMode ? () => blurHeader(agentDefinitions.current) : undefined;
    $[31] = blurHeader;
    $[32] = isSearchMode;
    $[33] = onFocus;
  } else onFocus = $[33];
  let ct;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    ct = jsxProd_default(Text, {
      wrap: "wrap-trim",
      children:
        "Extra rules for auto mode. Rules are plain sentences; new rules are saved to your user settings.",
    });
    $[34] = ct;
  } else ct = $[34];
  const isFocused_2 = isSearchMode && !headerFocused;
  let io;
  if (
    $[35] !== cursorOffset ||
    $[36] !== isFocused ||
    $[37] !== searchQuery ||
    $[38] !== isFocused_2 ||
    $[39] !== tabsWidth
  ) {
    io = jsxProd_default(Box, {
      marginBottom: 1,
      marginTop: 1,
      flexDirection: "column",
      children: jsxProd_default(SearchBox, {
        query: searchQuery,
        isFocused: isFocused_2,
        isTerminalFocused: isFocused,
        width: tabsWidth,
        cursorOffset,
      }),
    });
    $[35] = cursorOffset;
    $[36] = isFocused;
    $[37] = searchQuery;
    $[38] = isFocused_2;
    $[39] = tabsWidth;
    $[40] = io;
  } else io = $[40];
  let onChange;
  if (
    $[41] !== blurHeader ||
    $[42] !== Ve ||
    $[43] !== headerFocused ||
    $[44] !== onAddNew ||
    $[45] !== onHeaderFocusChange ||
    $[46] !== onSelectBuiltins ||
    $[47] !== onSelectEntry ||
    $[48] !== onSelectEnvironment
  ) {
    onChange = (a_7) => {
      if (headerFocused) {
        blurHeader();
        onHeaderFocusChange(false);
      }
      if (a_7 === "add-new-rule") {
        onAddNew();
        return;
      }
      if (a_7 === "environment-document") {
        onSelectEnvironment();
        return;
      }
      if (a_7.startsWith("builtins:")) {
        onSelectBuiltins(a_7.slice(9));
        return;
      }
      let Sr = Ve.get(a_7);
      if (Sr) onSelectEntry(Sr);
    };
    $[41] = blurHeader;
    $[42] = Ve;
    $[43] = headerFocused;
    $[44] = onAddNew;
    $[45] = onHeaderFocusChange;
    $[46] = onSelectBuiltins;
    $[47] = onSelectEntry;
    $[48] = onSelectEnvironment;
    $[49] = onChange;
  } else onChange = $[49];
  const visibleOptionCount = Math.min(10, lo.length);
  const isDisabled = isSearchMode || headerFocused;
  const pointerWhileDisabled = !isSearchMode;
  let st;
  if (
    $[50] !== defaultFocusValue ||
    $[51] !== focusHeader ||
    $[52] !== onCancel ||
    $[53] !== lo ||
    $[54] !== onChange ||
    $[55] !== visibleOptionCount ||
    $[56] !== isDisabled ||
    $[57] !== pointerWhileDisabled
  ) {
    st = jsxProd_default(ModelSelector, {
      options: lo,
      defaultFocusValue,
      onChange,
      onCancel,
      visibleOptionCount,
      isDisabled,
      hidePromptWhileDisabled: true,
      pointerWhileDisabled,
      onUpFromFirstItem: focusHeader,
    });
    $[50] = defaultFocusValue;
    $[51] = focusHeader;
    $[52] = onCancel;
    $[53] = lo;
    $[54] = onChange;
    $[55] = visibleOptionCount;
    $[56] = isDisabled;
    $[57] = pointerWhileDisabled;
    $[58] = st;
  } else st = $[58];
  let Bt;
  if ($[59] !== onFocus || $[60] !== io || $[61] !== st || $[62] !== tabIndex) {
    Bt = jsxProd_default_2(Box, {
      ref: agentDefinitions,
      flexDirection: "column",
      tabIndex,
      onFocus,
      children: [ct, io, st],
    });
    $[59] = onFocus;
    $[60] = io;
    $[61] = st;
    $[62] = tabIndex;
    $[63] = Bt;
  } else Bt = $[63];
  return Bt;
}
//@ chunk-18hwfzwa.js:342935-343157 fingerprint = _temp3 (0.687)
/**
 * 更新 AppState 的 toolPermissionContext（可传函数），仅在实际变化时于下一 tick 发出权限变更信号。
 */
function setToolPermissionContextAndNotify(h, x) {
  let D = false;
  h((L) => {
    let ee = typeof x === "function" ? x(L.toolPermissionContext) : x;
    if (ee === L.toolPermissionContext) return L;
    D = true;
    return {
      ...L,
      toolPermissionContext: ee,
    };
  });
  if (!D) return;
  setImmediate(() => {
    permissionModeSignal.emit();
  });
}
//@ chunk-18hwfzwa.js:687519-687576 fingerprint = _temp (0.673)
function selectAgentDefinitionsActiveAgents(s) {
  return s.agentDefinitions.activeAgents;
}
//@ chunk-82kqcve8.js:254881-255014 fingerprint = _temp6 (0.753)
function getNonProjectAdditionalDirectories(a_1) {
  return Array.from(a_1.additionalWorkingDirectories.values())
    .filter((additionalWorkingDirectory) => additionalWorkingDirectory.source !== "projectSettings")
    .map((additionalWorkingDirectory) => additionalWorkingDirectory.path);
}
export {
  getNonProjectAdditionalDirectories,
  setToolPermissionContextAndNotify,
  selectAgentDefinitionsActiveAgents,
  AgentsMenu,
};
