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
import { w } from "../../vendor/react/compiler-runtime.js";
import { AOn } from "../utils/settings/validation.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ValidationErrorsList } from "./ValidationErrorsList.js";
import { Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-td6byj4s.js:15306-15353 sole-consumer
function xe(Ce) {
  return Ce.severity !== "warning";
}
//@ chunk-td6byj4s.js:15353-15402 sole-consumer
function ye(be) {
  return be.loadedWithoutGuardHook;
}
//@ chunk-td6byj4s.js:15402-15440 sole-consumer
function Ee(Ve) {
  return Ve.substituted;
}
//@ chunk-td6byj4s.js:15440-15487 affinity
function Fe(Pe) {
  return Pe.severity === "warning";
}
//@ chunk-td6byj4s.js:15487-17218 fingerprint = InvalidSettingsDialog (0.523)
function InvalidSettingsDialog(t0) {
  let $ = w(21),
    { settingsErrors: settingsErrors, onContinue: onContinue, onFix: onFix, onExit: onExit } = t0,
    S;
  if ($[0] !== onContinue || $[1] !== onExit || $[2] !== onFix)
    ((S = function c(value) {
      if (value === "exit") onExit();
      else if (value === "fix") onFix();
      else onContinue();
    }),
      ($[0] = onContinue),
      ($[1] = onExit),
      ($[2] = onFix),
      ($[3] = S));
  else S = $[3];
  let c = S,
    x;
  if ($[4] !== settingsErrors) ((x = settingsErrors.some(xe)), ($[4] = settingsErrors), ($[5] = x));
  else x = $[5];
  let u = x,
    any = settingsErrors.some(AOn),
    any_2 = settingsErrors.some(ye),
    D = settingsErrors.some(Ee)
      ? "The values listed above were replaced with their restrictive reading or skipped as noted; the rest of the file is in effect."
      : "The values listed above were skipped; the rest of the file is in effect.",
    y = settingsErrors.some(Fe)
      ? `The hooks listed above are not loaded; no file is skipped on their account. ${D}`
      : "The hooks listed above are not loaded; no file is skipped on their account.",
    z = any_2
      ? "Files with errors are skipped entirely, not just the invalid settings, unless the error says otherwise."
      : "Files with errors are skipped entirely, not just the invalid settings.",
    E;
  if ($[6] !== u)
    ((E = u
      ? [
          { label: "Fix with Claude", value: "fix" },
          { label: "Exit and fix manually", value: "exit" },
          { label: "Continue without these settings", value: "continue" },
        ]
      : [
          { label: "Continue", value: "continue" },
          { label: "Fix with Claude", value: "fix" },
          { label: "Exit and fix manually", value: "exit" },
        ]),
      ($[6] = u),
      ($[7] = E));
  else E = $[7];
  let m = E;
  const v = u ? "Settings Error" : "Settings Warning",
    k = u ? onExit : onContinue;
  let F;
  if ($[8] !== settingsErrors)
    ((F = e(ValidationErrorsList, { errors: settingsErrors })), ($[8] = settingsErrors), ($[9] = F));
  else F = $[9];
  const C = any ? z : any_2 ? y : D;
  let p;
  if ($[10] !== C) ((p = e(Text, { dimColor: !0, children: C })), ($[10] = C), ($[11] = p));
  else p = $[11];
  let b;
  if ($[12] !== c || $[13] !== m)
    ((b = e(ModelSelector, { options: m, onChange: c })), ($[12] = c), ($[13] = m), ($[14] = b));
  else b = $[14];
  let ee;
  if ($[15] !== v || $[16] !== k || $[17] !== F || $[18] !== p || $[19] !== b)
    ((ee = r(Dialog, { title: v, onCancel: k, exitOnCtrlCD: !0, color: "warning", children: [F, p, b] })),
      ($[15] = v),
      ($[16] = k),
      ($[17] = F),
      ($[18] = p),
      ($[19] = b),
      ($[20] = ee));
  else ee = $[20];
  return ee;
}
