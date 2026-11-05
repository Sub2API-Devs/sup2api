/**
 * components/agents/AgentsMenu.tsx
 *
 * /agents 菜单主组件；本模块混入大量 auto 模式规则（allow/soft_deny/hard_deny）与设置来源判定代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentsMenu.tsx
 * pieces: chunk-a2q0x549.js (1), chunk-czq1j3j2.js (2), chunk-h5wy8vq5.js (5)
 * attribution: fingerprint 3, placement 4, callgraph-witnessed 1
 */
import { permissionModeSignal } from "../../utils/permissions/permissionSetup.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getDefaultExternalAutoModeRules } from "../../utils/permissions/yoloClassifier.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { uniqueLabels } from "../../utils/permissions/approvalPayloadSerialization.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { countWhere } from "../../utils/collections.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { SearchBox } from "../SearchBox.js";
import { ModelSelector } from "./ModelSelector.js";

//@ chunk-a2q0x549.js:254157-254290 fingerprint (2.1.88 match: _temp6, 0.751)
function getNonProjectAdditionalDirectories(a_1) {
  return Array.from(a_1.additionalWorkingDirectories.values())
    .filter((additionalWorkingDirectory) => additionalWorkingDirectory.source !== "projectSettings")
    .map((additionalWorkingDirectory) => additionalWorkingDirectory.path);
}
//@ chunk-czq1j3j2.js:380656-380878 fingerprint (2.1.88 match: _temp3, 0.688)
/**
 * 更新 AppState 的 toolPermissionContext（可传函数），仅在实际变化时于下一 tick 发出权限变更信号。
 */
function setToolPermissionContextAndNotify(setShowState, updater) {
  let changed = false;
  setShowState((prevState) => {
    let nextContext = typeof updater === "function" ? updater(prevState.toolPermissionContext) : updater;
    if (nextContext === prevState.toolPermissionContext) return prevState;
    changed = true;
    return {
      ...prevState,
      toolPermissionContext: nextContext,
    };
  });
  if (!changed) return;
  setImmediate(() => {
    permissionModeSignal.emit();
  });
}
//@ chunk-czq1j3j2.js:708250-708307 fingerprint (2.1.88 match: _temp, 0.673)
function selectAgentDefinitionsActiveAgents(s) {
  return s.agentDefinitions.activeAgents;
}
//@ chunk-h5wy8vq5.js:43577-43850 placement
/**
 * 渲染自动模式规则的分类标签（按分区着色），并附加规则来源说明。
 */
function AutoModeRuleLabel(rule) {
  let autoModeRuleCategoryLabel = getAutoModeRuleCategoryLabel(rule.section);
  let badge = rule.legacy ? "legacy" : getRuleSourceBadge(rule.source);
  if (!badge) {
    return jsxProd_default(Text, {
      color: getAutoModeSectionColor(rule.section),
      children: autoModeRuleCategoryLabel.padEnd(RULE_LABEL_WIDTH),
    });
  }
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Text, {
        color: getAutoModeSectionColor(rule.section),
        children: autoModeRuleCategoryLabel,
      }),
      jsxProd_default(Text, {
        dimColor: true,
        children: ` \xB7 ${badge}`.padEnd(RULE_LABEL_WIDTH - autoModeRuleCategoryLabel.length),
      }),
    ],
  });
}
//@ chunk-h5wy8vq5.js:43949-44083 placement
/**
 * 计算各自动模式规则分区内置规则的数量（只算一次）。
 */
function useBuiltinRuleCounts() {
  let $ = useMemoCache(1);
  let counts;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let defaultExternalAutoModeRules = getDefaultExternalAutoModeRules();
    counts = Object.fromEntries(
      AUTO_MODE_RULE_SECTIONS.map((section) => [section, defaultExternalAutoModeRules[section]?.length ?? 0]),
    );
    $[0] = counts;
  } else counts = $[0];
  return counts;
}
//@ chunk-h5wy8vq5.js:45121-45268 placement
/**
 * 按显示宽度截断文本（按字素切分），超出时末尾加省略号。
 */
function truncateWithEllipsis(text, maxWidth) {
  if (bunStringWidth(text) <= maxWidth) return text;
  let result = "";
  let width = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let segmentWidth = bunStringWidth(segment);
    if (width + segmentWidth > maxWidth - 1) break;
    result += segment;
    width += segmentWidth;
  }
  return `${result}\u2026`;
}
//@ chunk-h5wy8vq5.js:45268-45538 placement
/**
 * 按显示宽度把文本按单词折行，过长的单词强制拆开。
 */
function wrapWithIndent(text, maxWidth) {
  let lines = [];
  let currentLine = "";
  let currentWidth = 0;
  let flushLine = () => {
    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = "";
      currentWidth = 0;
    }
  };
  for (let word of text.split(" ")) {
    let chunks = bunStringWidth(word) > maxWidth ? splitByWidth(word, maxWidth) : [word];
    for (let chunk of chunks) {
      let chunkWidth = bunStringWidth(chunk);
      if (currentWidth === 0) {
        currentLine = chunk;
        currentWidth = chunkWidth;
      } else if (currentWidth + 1 + chunkWidth <= maxWidth) {
        currentLine = `${currentLine} ${chunk}`;
        currentWidth += 1 + chunkWidth;
      } else {
        flushLine();
        currentLine = chunk;
        currentWidth = chunkWidth;
      }
    }
  }
  flushLine();
  return lines.join(`
${" ".repeat(RULE_LABEL_WIDTH)}`);
}
//@ chunk-h5wy8vq5.js:45538-50908 callgraph-witnessed (2.1.88 match: AgentsMenu, 0.027)
function AgentsMenu(props) {
  let $ = useMemoCache(62);
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
  let defaultEnvRulesCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    defaultEnvRulesCached = getDefaultExternalAutoModeRules().environment ?? [];
    $[0] = defaultEnvRulesCached;
  } else defaultEnvRulesCached = $[0];
  let defaultEnvRules = defaultEnvRulesCached;
  let { columns } = useTerminalSize();
  let { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus();
  let agentDefinitions = useRef(null);
  let blurWhenSearchingEffect;
  let blurWhenSearchingDeps;
  if ($[1] !== blurHeader || $[2] !== headerFocused || $[3] !== isSearchMode) {
    blurWhenSearchingEffect = () => {
      if (isSearchMode && headerFocused) blurHeader(agentDefinitions.current);
    };
    blurWhenSearchingDeps = [isSearchMode, headerFocused, blurHeader];
    $[1] = blurHeader;
    $[2] = headerFocused;
    $[3] = isSearchMode;
    $[4] = blurWhenSearchingEffect;
    $[5] = blurWhenSearchingDeps;
  } else {
    blurWhenSearchingEffect = $[4];
    blurWhenSearchingDeps = $[5];
  }
  useEffect(blurWhenSearchingEffect, blurWhenSearchingDeps);
  useFocusOnMount(agentDefinitions, isSearchMode);
  let headerActive = headerFocused && !isSearchMode;
  let headerChangeEffect;
  let headerChangeDeps;
  if ($[6] !== headerActive || $[7] !== onHeaderFocusChange) {
    headerChangeEffect = () => {
      onHeaderFocusChange(headerActive);
    };
    headerChangeDeps = [headerActive, onHeaderFocusChange];
    $[6] = headerActive;
    $[7] = onHeaderFocusChange;
    $[8] = headerChangeEffect;
    $[9] = headerChangeDeps;
  } else {
    headerChangeEffect = $[8];
    headerChangeDeps = $[9];
  }
  useEffect(headerChangeEffect, headerChangeDeps);
  let hasEnvironmentControl = builtinsState.environment.control !== "internalTemplate";
  let ruleEntriesCached;
  if ($[10] !== entries || $[11] !== hasEnvironmentControl) {
    ruleEntriesCached = hasEnvironmentControl ? entries.filter(isNotEnvironmentSection) : entries;
    $[10] = entries;
    $[11] = hasEnvironmentControl;
    $[12] = ruleEntriesCached;
  } else ruleEntriesCached = $[12];
  let ruleEntries = ruleEntriesCached;
  let entryByKeyCached;
  if ($[13] !== ruleEntries) {
    entryByKeyCached = new Map(ruleEntries.map(toRuleKeyPair));
    $[13] = ruleEntries;
    $[14] = entryByKeyCached;
  } else entryByKeyCached = $[14];
  let entryByKey = entryByKeyCached;
  let options;
  if (
    $[15] !== builtinsState ||
    $[16] !== builtinRuleCounts ||
    $[17] !== entries ||
    $[18] !== hasEnvironmentControl ||
    $[19] !== ruleEntries ||
    $[20] !== searchQuery ||
    $[21] !== columns
  ) {
    let lower = searchQuery.toLowerCase();
    let allAgents_0 = sortRuleEntries(ruleEntries).filter(
      (a_6) => !searchQuery || a_6.text.toLowerCase().includes(lower),
    );
    let dedupedLabels = uniqueLabels(allAgents_0.map(ruleText), normalizedRuleText);
    let environmentEntries = hasEnvironmentControl
      ? sortRuleEntries(entries).filter(isEnvironmentSection)
      : [];
    let hasEnvironmentEntries = environmentEntries.length > 0;
    let environmentRows = hasEnvironmentEntries
      ? environmentEntries.map(toDisplayRule)
      : defaultEnvRules.map(toDisplayRuleNoTag);
    let environment = builtinsState.environment;
    let joined = normalizeCaseForComparison_2(environmentEntries.map(ruleSource))
      .map(describeRuleSource)
      .join(" and ");
    let any = environmentEntries.some(isUserSettingsRule);
    let any_2 = environmentEntries.some(isNonUserSettingsRule);
    let editHint = !any_2 ? "enter to edit" : any ? "enter to edit your entries" : "enter to add your own";
    let environmentDescription = !hasEnvironmentEntries
      ? `Built-in default document${environment.control === "otherSource" ? ` \xB7 kept by ${describeRuleSource(environment.source ?? "userSettings")}` : ""} \xB7 enter to edit`
      : `${environment.enabled ? "Extends" : "Replaces"} the built-in default \xB7 from ${joined} \xB7 ${editHint}`;
    let isSectionVisibleCached;
    if ($[23] !== builtinsState) {
      isSectionVisibleCached = (agent_0) => {
        let sectionState = builtinsState[agent_0];
        if (agent_0 === "environment") {
          return sectionState.control === "internalTemplate";
        }
        return !(sectionState.control === "otherSource" && !sectionState.enabled);
      };
      $[23] = builtinsState;
      $[24] = isSectionVisibleCached;
    } else isSectionVisibleCached = $[24];
    let isSectionVisible = isSectionVisibleCached;
    let hasEnvironmentMatch =
      searchQuery.length > 0 && environmentRows.some((row) => row.text.toLowerCase().includes(lower));
    let showEnvironmentRow = hasEnvironmentControl && (searchQuery ? hasEnvironmentMatch : true);
    let totalOptionCount =
      allAgents_0.length +
      (showEnvironmentRow ? 1 : 0) +
      (searchQuery ? 0 : 1 + countWhere(AUTO_MODE_RULE_SECTIONS, isSectionVisible));
    let countPrefixWidth = String(totalOptionCount).length + 2;
    let max = Math.max(1, columns - 4 - 4 - countPrefixWidth - RULE_LABEL_WIDTH);
    let LabelComponent = AutoModeRuleLabel;
    let wrapLabelCached;
    if ($[25] !== max) {
      wrapLabelCached = (value_0) => {
        let wrapped = wrapWithIndent(value_0, max);
        let lines = wrapped.split(`
`);
        if (lines.length <= 3) {
          return wrapped;
        }
        return (
          lines.slice(0, 3).join(`
`) +
          `
${" ".repeat(RULE_LABEL_WIDTH)}\u2026 (+${lines.length - 3} lines)`
        );
      };
      $[25] = max;
      $[26] = wrapLabelCached;
    } else wrapLabelCached = $[26];
    let wrapLabel = wrapLabelCached;
    let ruleOption = (rule, key) => ({
      label: jsxProd_default_2(Text, {
        children: [
          LabelComponent(rule),
          rule.structure
            ? jsxProd_default(Text, {
                dimColor: true,
                children: wrapLabel(dedupedLabels[key] ?? ""),
              })
            : wrapLabel(dedupedLabels[key] ?? ""),
        ],
      }),
      value: ruleKey(rule),
    });
    let padLabel = padSectionLabel;
    let environmentOption = () => {
      let sliced = environmentRows.slice(0, MAX_RULE_ROWS);
      let hiddenCount = environmentRows.length - sliced.length;
      return {
        label: jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              color: getAutoModeSectionColor("environment"),
              children: "Environment".padEnd(RULE_LABEL_WIDTH),
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: truncateWithEllipsis(environmentDescription, max),
            }),
            sliced.map((row, index) =>
              jsxProd_default(
                Text,
                {
                  dimColor: true,
                  children: `
${padLabel(row.tag)}${truncateWithEllipsis(row.text, max)}`,
                },
                index,
              ),
            ),
            hiddenCount > 0
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: `
${" ".repeat(RULE_LABEL_WIDTH)}\u2026 (+${hiddenCount} more ${hiddenCount === 1 ? "line" : "lines"})`,
                })
              : null,
          ],
        }),
        value: "environment-document",
      };
    };
    let builtinOptionCached;
    if ($[27] !== builtinsState || $[28] !== builtinRuleCounts) {
      builtinOptionCached = (a_8) => {
        let state = builtinsState[a_8];
        let checkbox = state.enabled ? "[x]" : "[ ]";
        let ruleCount = builtinRuleCounts[a_8] ?? 0;
        if (state.control === "internalTemplate") {
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
              `${checkbox} Built-in rules`,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  ` \xB7 ${ruleCount}${state.enabled ? "" : " \xB7 off"}`,
                  state.control === "user" || state.control === "empty"
                    ? ""
                    : ` \xB7 from ${describeRuleSource(state.source ?? "policySettings")}`,
                ],
              }),
            ],
          }),
          value: `builtins:${a_8}`,
        };
      };
      $[27] = builtinsState;
      $[28] = builtinRuleCounts;
      $[29] = builtinOptionCached;
    } else builtinOptionCached = $[29];
    let builtinOption = builtinOptionCached;
    options = searchQuery
      ? [...allAgents_0.map(ruleOption), ...(showEnvironmentRow ? [environmentOption()] : [])]
      : [
          {
            label: `Add a new rule${figures_default.ellipsis}`,
            value: "add-new-rule",
          },
          ...AUTO_MODE_RULE_SECTIONS.flatMap((section) => {
            if (section === "environment" && hasEnvironmentControl) {
              return [environmentOption()];
            }
            let mapped = allAgents_0
              .map(ruleKeyValuePair)
              .filter((pair) => {
                let [rule] = pair;
                return rule.section === section;
              })
              .map((value) => {
                let [rule, key] = value;
                return ruleOption(rule, key);
              });
            return isSectionVisible(section) ? [builtinOption(section), ...mapped] : mapped;
          }),
        ];
    $[15] = builtinsState;
    $[16] = builtinRuleCounts;
    $[17] = entries;
    $[18] = hasEnvironmentControl;
    $[19] = ruleEntries;
    $[20] = searchQuery;
    $[21] = columns;
    $[22] = options;
  } else options = $[22];
  let menuOptions = options;
  const tabIndex = isSearchMode ? 0 : undefined;
  let onFocus;
  if ($[30] !== blurHeader || $[31] !== isSearchMode) {
    onFocus = isSearchMode ? () => blurHeader(agentDefinitions.current) : undefined;
    $[30] = blurHeader;
    $[31] = isSearchMode;
    $[32] = onFocus;
  } else onFocus = $[32];
  let introText;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      wrap: "wrap-trim",
      children:
        "Extra rules for auto mode. Rules are plain sentences; new rules are saved to your user settings.",
    });
    $[33] = introText;
  } else introText = $[33];
  const isFocused_2 = isSearchMode && !headerFocused;
  let searchBoxElement;
  if ($[34] !== cursorOffset || $[35] !== isFocused || $[36] !== searchQuery || $[37] !== isFocused_2) {
    searchBoxElement = jsxProd_default(Box, {
      marginBottom: 1,
      marginTop: 1,
      flexDirection: "column",
      children: jsxProd_default(SearchBox, {
        query: searchQuery,
        isFocused: isFocused_2,
        isTerminalFocused: isFocused,
        cursorOffset,
      }),
    });
    $[34] = cursorOffset;
    $[35] = isFocused;
    $[36] = searchQuery;
    $[37] = isFocused_2;
    $[38] = searchBoxElement;
  } else searchBoxElement = $[38];
  let onChange;
  if (
    $[39] !== blurHeader ||
    $[40] !== entryByKey ||
    $[41] !== headerFocused ||
    $[42] !== onAddNew ||
    $[43] !== onHeaderFocusChange ||
    $[44] !== onSelectBuiltins ||
    $[45] !== onSelectEntry ||
    $[46] !== onSelectEnvironment
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
      let selectedRule = entryByKey.get(a_7);
      if (selectedRule) onSelectEntry(selectedRule);
    };
    $[39] = blurHeader;
    $[40] = entryByKey;
    $[41] = headerFocused;
    $[42] = onAddNew;
    $[43] = onHeaderFocusChange;
    $[44] = onSelectBuiltins;
    $[45] = onSelectEntry;
    $[46] = onSelectEnvironment;
    $[47] = onChange;
  } else onChange = $[47];
  const visibleOptionCount = Math.min(10, menuOptions.length);
  const isDisabled = isSearchMode || headerFocused;
  const pointerWhileDisabled = !isSearchMode;
  let selectorElement;
  if (
    $[48] !== defaultFocusValue ||
    $[49] !== focusHeader ||
    $[50] !== onCancel ||
    $[51] !== menuOptions ||
    $[52] !== onChange ||
    $[53] !== visibleOptionCount ||
    $[54] !== isDisabled ||
    $[55] !== pointerWhileDisabled
  ) {
    selectorElement = jsxProd_default(ModelSelector, {
      options: menuOptions,
      defaultFocusValue,
      onChange,
      onCancel,
      visibleOptionCount,
      isDisabled,
      hidePromptWhileDisabled: true,
      pointerWhileDisabled,
      onUpFromFirstItem: focusHeader,
    });
    $[48] = defaultFocusValue;
    $[49] = focusHeader;
    $[50] = onCancel;
    $[51] = menuOptions;
    $[52] = onChange;
    $[53] = visibleOptionCount;
    $[54] = isDisabled;
    $[55] = pointerWhileDisabled;
    $[56] = selectorElement;
  } else selectorElement = $[56];
  let menuElement;
  if ($[57] !== onFocus || $[58] !== searchBoxElement || $[59] !== selectorElement || $[60] !== tabIndex) {
    menuElement = jsxProd_default_2(Box, {
      ref: agentDefinitions,
      flexDirection: "column",
      tabIndex,
      onFocus,
      children: [introText, searchBoxElement, selectorElement],
    });
    $[57] = onFocus;
    $[58] = searchBoxElement;
    $[59] = selectorElement;
    $[60] = tabIndex;
    $[61] = menuElement;
  } else menuElement = $[61];
  return menuElement;
}
export {
  getNonProjectAdditionalDirectories,
  setToolPermissionContextAndNotify,
  selectAgentDefinitionsActiveAgents,
  AgentsMenu,
};
