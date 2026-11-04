/**
 * components/permissions/BashPermissionRequest/bashToolUseOptions.tsx
 *
 * Bash 权限选项生成：yes / yes-apply-suggestions / yes-prefix-edited / yes-enable-auto-mode / no（含反馈输入）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/BashPermissionRequest/bashToolUseOptions.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 1, layout 3, callgraph-fingerprint 1
 */
import { extractOutputRedirections } from "../../../utils/bash/commands.js";
import { WORKFLOW_HINT_TEXT } from "../../../hooks/notifs/useSettingsErrors.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import {
  AUTO_MODE_ROW_LABELS,
  ruleMatchesTool,
  parseConsentSuggestions,
  CONSENT_UPDATE_TYPES,
  parseSuggestionRows,
  isConsentRow,
  directoryRow,
} from "../consentRows.js";

//@ chunk-18hwfzwa.js:1325769-1325863 fingerprint = stripBashRedirections (1)
function stripBashRedirections(command) {
  let { commandWithoutRedirections, redirections } = extractOutputRedirections(command);
  return redirections.length > 0 ? commandWithoutRedirections : command;
}
//@ chunk-18hwfzwa.js:1325863-1327111 layout = powershellToolUseOptions (0.831)
function powershellToolUseOptions_2({
  suggestionsRow = null,
  decisionReason,
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
  editablePrefix,
  onEditablePrefixChange,
  hasBackendSuggestions,
  showEnableAutoModeOption = false,
  enableAutoModeDescription = WORKFLOW_HINT_TEXT,
}) {
  let options = [];
  if (yesInputMode)
    options.push({
      type: "input",
      label: "Yes",
      value: "yes",
      placeholder: "and tell Claude what to do next",
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
    });
  else
    options.push({
      label: "Yes",
      value: "yes",
    });
  if (shouldShowAlwaysAllowOptions()) {
    let hasNonPowerShellSuggestions =
      suggestionsRow !== null &&
      suggestionsRow.applies.some(
        (update) =>
          update.type === "addDirectories" ||
          (update.type === "addRules" && update.rules.some((rule) => rule.toolName !== BASH_TOOL_NAME)),
      );
    if (
      editablePrefix !== undefined &&
      onEditablePrefixChange &&
      !hasNonPowerShellSuggestions &&
      (hasBackendSuggestions ?? suggestionsRow !== null)
    )
      options.push({
        type: "input",
        label: "Yes, and don\u2019t ask again for",
        value: "yes-prefix-edited",
        placeholder: "command prefix (e.g., npm run *)",
        initialValue: editablePrefix,
        onChange: onEditablePrefixChange,
        allowEmptySubmitToCancel: true,
        showLabelWithValue: true,
        labelValueSeparator: ": ",
        resetCursorOnUpdate: true,
      });
    else if (suggestionsRow !== null)
      options.push({
        label: suggestionsRow.node,
        value: "yes-apply-suggestions",
      });
  }
  if (showEnableAutoModeOption)
    options.push({
      label: AUTO_MODE_ROW_LABELS.workflow,
      description: enableAutoModeDescription,
      value: "yes-enable-auto-mode",
    });
  if (noInputMode)
    options.push({
      type: "input",
      label: "No",
      value: "no",
      placeholder: "and tell Claude what to do differently",
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
    });
  else
    options.push({
      label: "No",
      value: "no",
    });
  return options;
}
//@ chunk-18hwfzwa.js:1327111-1327138 layout
var bashRuleLabelPredicate = (rule) => ruleMatchesTool(rule, BASH_TOOL_NAME, stripBashRedirections);
//@ chunk-18hwfzwa.js:1327138-1327242 layout
/**
 * 把 Bash 权限建议解析为同意选项行（只显示特定更新类型，标签按 Bash 规则渲染并去掉重定向）。
 */
function parseBashConsentSuggestions(suggestions, options) {
  return parseConsentSuggestions(suggestions, {
    displayedTypes: CONSENT_UPDATE_TYPES,
    labelPredicate: bashRuleLabelPredicate,
    renderLabel: (suggestion) =>
      parseSuggestionRows(suggestion, BASH_TOOL_NAME, stripBashRedirections, options),
  });
}
//@ chunk-18hwfzwa.js:1327242-1327894 callgraph-fingerprint = bashToolUseOptions (0.243)
/**
 * Bash 权限选项：允许一次；"Yes, and don't ask again for <前缀/命令>"（应用建议规则或编辑后的前缀）；可选开启 auto 模式；拒绝（可附反馈）。
 */
function bashToolUseOptions(choice, payload, selectedRow, extra = {}) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(extra.feedback && {
          feedback: extra.feedback,
        }),
      };
    case "yes-apply-suggestions": {
      if (selectedRow === null || !isConsentRow(selectedRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: selectedRow.applies,
      };
    }
    case "yes-prefix-edited": {
      let label = directoryRow(extra.editablePrefixSeed, extra.editablePrefix, BASH_TOOL_NAME);
      if (label === null)
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: label.applies,
      };
    }
    case "yes-enable-auto-mode":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "no":
      return {
        behavior: "deny",
        ...(extra.feedback && {
          feedback: extra.feedback,
        }),
      };
  }
}
export { parseBashConsentSuggestions, powershellToolUseOptions_2, bashToolUseOptions };
