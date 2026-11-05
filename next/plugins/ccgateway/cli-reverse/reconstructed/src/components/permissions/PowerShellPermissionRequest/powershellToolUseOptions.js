/**
 * components/permissions/PowerShellPermissionRequest/powershellToolUseOptions.tsx
 *
 * PowerShell 权限选项生成（规则建议、目录、前缀编辑、反馈）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PowerShellPermissionRequest/powershellToolUseOptions.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1418187-1418191 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1418187", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1434164-1435261 fingerprint (2.1.88 match: powershellToolUseOptions, 0.902)
function powershellToolUseOptions({
  suggestionsRow = null,
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
  editablePrefix,
  onEditablePrefixChange,
  hasBackendSuggestions,
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
  let hasAnySuggestions = hasBackendSuggestions ?? suggestionsRow !== null;
  if (shouldShowAlwaysAllowOptions() && hasAnySuggestions) {
    let hasNonPowerShellSuggestions =
      suggestionsRow !== null &&
      suggestionsRow.applies.some(
        (update) =>
          update.type === "addDirectories" ||
          (update.type === "addRules" && update.rules.some((rule) => rule.toolName !== POWERSHELL_TOOL_NAME)),
      );
    if (editablePrefix !== undefined && onEditablePrefixChange && !hasNonPowerShellSuggestions)
      options.push({
        type: "input",
        label: "Yes, and don\u2019t ask again for",
        value: "yes-prefix-edited",
        placeholder: "command prefix (e.g., Get-Process *)",
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
export { powershellToolUseOptions };
