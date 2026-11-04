/**
 * components/InvalidSettingsDialog.tsx
 *
 * 设置文件校验失败时的对话框（列出被跳过/按严格解读替换的值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/InvalidSettingsDialog.tsx
 * pieces: chunk-td6byj4s.js (5)
 * attribution: sole-consumer 3, affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { isBlockingSettingsIssue } from "../utils/settings/validation.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ValidationErrorsList } from "./ValidationErrorsList.js";
import { Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-td6byj4s.js:15306-15353 sole-consumer
function isNotWarning(error) {
  return error.severity !== "warning";
}
//@ chunk-td6byj4s.js:15353-15402 sole-consumer
function loadedWithoutGuard(error) {
  return error.loadedWithoutGuardHook;
}
//@ chunk-td6byj4s.js:15402-15440 sole-consumer
function isSubstituted(error) {
  return error.substituted;
}
//@ chunk-td6byj4s.js:15440-15487 affinity
function isWarning(error) {
  return error.severity === "warning";
}
//@ chunk-td6byj4s.js:15487-17218 fingerprint (2.1.88 match: InvalidSettingsDialog, 0.523)
function InvalidSettingsDialog(props) {
  let $ = useMemoCache(21);
  let { settingsErrors, onContinue, onFix, onExit } = props;
  let onChange;
  if ($[0] !== onContinue || $[1] !== onExit || $[2] !== onFix) {
    onChange = function handleSelect(value) {
      if (value === "exit") onExit();
      else if (value === "fix") onFix();
      else onContinue();
    };
    $[0] = onContinue;
    $[1] = onExit;
    $[2] = onFix;
    $[3] = onChange;
  } else onChange = $[3];
  let onChange_2 = onChange;
  let hasNonWarning;
  if ($[4] !== settingsErrors) {
    hasNonWarning = settingsErrors.some(isNotWarning);
    $[4] = settingsErrors;
    $[5] = hasNonWarning;
  } else hasNonWarning = $[5];
  let hasBlocking = hasNonWarning;
  let any = settingsErrors.some(isBlockingSettingsIssue);
  let any_2 = settingsErrors.some(loadedWithoutGuard);
  let substitutionNote = settingsErrors.some(isSubstituted)
    ? "The values listed above were replaced with their restrictive reading or skipped as noted; the rest of the file is in effect."
    : "The values listed above were skipped; the rest of the file is in effect.";
  let hookNote = settingsErrors.some(isWarning)
    ? `The hooks listed above are not loaded; no file is skipped on their account. ${substitutionNote}`
    : "The hooks listed above are not loaded; no file is skipped on their account.";
  let skipNote = any_2
    ? "Files with errors are skipped entirely, not just the invalid settings, unless the error says otherwise."
    : "Files with errors are skipped entirely, not just the invalid settings.";
  let options;
  if ($[6] !== hasBlocking) {
    options = hasBlocking
      ? [
          {
            label: "Fix with Claude",
            value: "fix",
          },
          {
            label: "Exit and fix manually",
            value: "exit",
          },
          {
            label: "Continue without these settings",
            value: "continue",
          },
        ]
      : [
          {
            label: "Continue",
            value: "continue",
          },
          {
            label: "Fix with Claude",
            value: "fix",
          },
          {
            label: "Exit and fix manually",
            value: "exit",
          },
        ];
    $[6] = hasBlocking;
    $[7] = options;
  } else options = $[7];
  let options_2 = options;
  const title = hasBlocking ? "Settings Error" : "Settings Warning";
  const onCancel = hasBlocking ? onExit : onContinue;
  let errorsList;
  if ($[8] !== settingsErrors) {
    errorsList = jsxProd_default(ValidationErrorsList, {
      errors: settingsErrors,
    });
    $[8] = settingsErrors;
    $[9] = errorsList;
  } else errorsList = $[9];
  const children = any ? skipNote : any_2 ? hookNote : substitutionNote;
  let noteText;
  if ($[10] !== children) {
    noteText = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[10] = children;
    $[11] = noteText;
  } else noteText = $[11];
  let selector;
  if ($[12] !== onChange_2 || $[13] !== options_2) {
    selector = jsxProd_default(ModelSelector, {
      options: options_2,
      onChange: onChange_2,
    });
    $[12] = onChange_2;
    $[13] = options_2;
    $[14] = selector;
  } else selector = $[14];
  let t6;
  if (
    $[15] !== title ||
    $[16] !== onCancel ||
    $[17] !== errorsList ||
    $[18] !== noteText ||
    $[19] !== selector
  ) {
    t6 = jsxProd_default_2(Dialog, {
      title,
      onCancel,
      exitOnCtrlCD: true,
      color: "warning",
      children: [errorsList, noteText, selector],
    });
    $[15] = title;
    $[16] = onCancel;
    $[17] = errorsList;
    $[18] = noteText;
    $[19] = selector;
    $[20] = t6;
  } else t6 = $[20];
  return t6;
}
export { InvalidSettingsDialog };
