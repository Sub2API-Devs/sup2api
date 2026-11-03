/**
 * components/permissions/PowerShellPermissionRequest/powershellToolUseOptions.tsx
 *
 * PowerShell 权限选项生成（规则建议、目录、前缀编辑、反馈）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PowerShellPermissionRequest/powershellToolUseOptions.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";

//@ chunk-18hwfzwa.js:1395417-1395421 placement
j();
//@ chunk-18hwfzwa.js:1395421-1396518 fingerprint = powershellToolUseOptions (0.902)
function powershellToolUseOptions({
  suggestionsRow: suggestionsRow = null,
  onRejectFeedbackChange: onRejectFeedbackChange,
  onAcceptFeedbackChange: onAcceptFeedbackChange,
  yesInputMode: yesInputMode = !1,
  noInputMode: noInputMode = !1,
  editablePrefix: editablePrefix,
  onEditablePrefixChange: onEditablePrefixChange,
  hasBackendSuggestions: hasBackendSuggestions,
}) {
  let options = [];
  if (yesInputMode)
    options.push({
      type: "input",
      label: "Yes",
      value: "yes",
      placeholder: "and tell Claude what to do next",
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: !0,
    });
  else options.push({ label: "Yes", value: "yes" });
  let We = hasBackendSuggestions ?? suggestionsRow !== null;
  if (shouldShowAlwaysAllowOptions() && We) {
    let ze =
      suggestionsRow !== null &&
      suggestionsRow.applies.some(
        (Xe) =>
          Xe.type === "addDirectories" ||
          (Xe.type === "addRules" && Xe.rules.some((rule) => rule.toolName !== POWERSHELL_TOOL_NAME)),
      );
    if (editablePrefix !== void 0 && onEditablePrefixChange && !ze)
      options.push({
        type: "input",
        label: "Yes, and don\u2019t ask again for",
        value: "yes-prefix-edited",
        placeholder: "command prefix (e.g., Get-Process *)",
        initialValue: editablePrefix,
        onChange: onEditablePrefixChange,
        allowEmptySubmitToCancel: !0,
        showLabelWithValue: !0,
        labelValueSeparator: ": ",
        resetCursorOnUpdate: !0,
      });
    else if (suggestionsRow !== null)
      options.push({ label: suggestionsRow.node, value: "yes-apply-suggestions" });
  }
  if (noInputMode)
    options.push({
      type: "input",
      label: "No",
      value: "no",
      placeholder: "and tell Claude what to do differently",
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: !0,
    });
  else options.push({ label: "No", value: "no" });
  return options;
}

export { powershellToolUseOptions };
