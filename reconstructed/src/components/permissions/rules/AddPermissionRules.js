/**
 * components/permissions/rules/AddPermissionRules.tsx
 *
 * 添加权限规则：选择保存位置（本地项目/项目/用户设置）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/AddPermissionRules.tsx
 * pieces: chunk-p2qwpk2k.js (3)
 * attribution: fingerprint 3
 */
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { PermissionRuleDescription } from "./PermissionRuleDescription.js";
import { getRelativeSettingsFilePathForSource } from "../../../utils/settings/settings.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { Me } from "../../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { SOURCES } from "../../../utils/settings/constants.js";
import {
  applyValidatedPermissionUpdate,
  persistValidatedPermissionUpdate,
} from "../../../utils/permissions/PermissionUpdate.js";
import { logError } from "../../../utils/log.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { detectUnreachableRules } from "../../../utils/permissions/shadowedRuleDetection.js";
import { plural } from "../../../utils/stringUtils.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { Dialog } from "../../design-system/Dialog.js";

//@ chunk-p2qwpk2k.js:22240-22363 fingerprint = _temp (1)
function renderRuleListItem(ruleValue_0) {
  return r(
    Box,
    {
      flexDirection: "column",
      children: [
        e(Text, { bold: !0, children: formatPermissionRule(ruleValue_0) }),
        e(PermissionRuleDescription, { ruleValue: ruleValue_0 }),
      ],
    },
    formatPermissionRule(ruleValue_0),
  );
}
//@ chunk-p2qwpk2k.js:22363-22727 fingerprint = optionForPermissionSaveDestination (1)
function optionForPermissionSaveDestination(saveDestination) {
  switch (saveDestination) {
    case "localSettings":
      return {
        label: "Project settings (local)",
        description: `Saved in ${getRelativeSettingsFilePathForSource("localSettings")}`,
        value: saveDestination,
      };
    case "projectSettings":
      return {
        label: "Project settings",
        description: `Checked in at ${getRelativeSettingsFilePathForSource("projectSettings")}`,
        value: saveDestination,
      };
    case "userSettings":
      return {
        label: "User settings",
        description: "Saved in at ~/.claude/settings.json",
        value: saveDestination,
      };
  }
}
//@ chunk-p2qwpk2k.js:22727-24428 fingerprint = AddPermissionRules (0.948)
function AddPermissionRules(t0) {
  let $ = w(27),
    {
      onAddRules: onAddRules,
      onCancel: onCancel,
      ruleValues: ruleValues,
      ruleBehavior: ruleBehavior,
      initialContext: initialContext,
      setToolPermissionContext: setToolPermissionContext,
    } = t0,
    { storageV5: storageV5 } = Me(),
    c;
  if ($[0] === MEMO_CACHE_SENTINEL) ((c = SOURCES.map(optionForPermissionSaveDestination)), ($[0] = c));
  else c = $[0];
  let M = c,
    b;
  if (
    $[1] !== initialContext ||
    $[2] !== onAddRules ||
    $[3] !== onCancel ||
    $[4] !== ruleBehavior ||
    $[5] !== ruleValues ||
    $[6] !== setToolPermissionContext ||
    $[7] !== storageV5
  )
    ((b = (selectedValue) => {
      if (selectedValue === "cancel") {
        onCancel();
        return;
      } else if (SOURCES.includes(selectedValue)) {
        let E = selectedValue;
        let updatedContext = applyValidatedPermissionUpdate(initialContext, {
          type: "addRules",
          rules: ruleValues,
          behavior: ruleBehavior,
          destination: E,
        });
        (persistValidatedPermissionUpdate(
          { type: "addRules", rules: ruleValues, behavior: ruleBehavior, destination: E },
          storageV5,
        ).catch(logError),
          setToolPermissionContext(updatedContext));
        let rules = ruleValues.map((ruleValue) => ({
          ruleValue: ruleValue,
          ruleBehavior: ruleBehavior,
          source: E,
        }));
        let sandboxAutoAllowEnabled =
          SandboxManager.isSandboxingEnabled() && SandboxManager.isAutoAllowBashIfSandboxedEnabled();
        let newUnreachable = detectUnreachableRules(updatedContext, {
          sandboxAutoAllowEnabled: sandboxAutoAllowEnabled,
        }).filter((B) =>
          ruleValues.some(
            (rv) =>
              rv.toolName === B.rule.ruleValue.toolName && rv.ruleContent === B.rule.ruleValue.ruleContent,
          ),
        );
        onAddRules(rules, newUnreachable);
      }
    }),
      ($[1] = initialContext),
      ($[2] = onAddRules),
      ($[3] = onCancel),
      ($[4] = ruleBehavior),
      ($[5] = ruleValues),
      ($[6] = setToolPermissionContext),
      ($[7] = storageV5),
      ($[8] = b));
  else b = $[8];
  let Re = b,
    le;
  if ($[9] !== ruleValues.length)
    ((le = plural(ruleValues.length, "rule")), ($[9] = ruleValues.length), ($[10] = le));
  else le = $[10];
  let title = `Add ${ruleBehavior} permission ${le}`,
    K;
  if ($[11] !== ruleValues) ((K = ruleValues.map(renderRuleListItem)), ($[11] = ruleValues), ($[12] = K));
  else K = $[12];
  let ye;
  if ($[13] !== K)
    ((ye = e(Box, { flexDirection: "column", paddingX: 2, children: K })), ($[13] = K), ($[14] = ye));
  else ye = $[14];
  const t6 =
    ruleValues.length === 1 ? "Where should this rule be saved?" : "Where should these rules be saved?";
  let ee;
  if ($[15] !== t6) ((ee = e(Text, { children: t6 })), ($[15] = t6), ($[16] = ee));
  else ee = $[16];
  let ce;
  if ($[17] !== Re) ((ce = e(ModelSelector, { options: M, onChange: Re })), ($[17] = Re), ($[18] = ce));
  else ce = $[18];
  let te;
  if ($[19] !== ee || $[20] !== ce)
    ((te = r(Box, { flexDirection: "column", marginY: 1, children: [ee, ce] })),
      ($[19] = ee),
      ($[20] = ce),
      ($[21] = te));
  else te = $[21];
  let Se;
  if ($[22] !== onCancel || $[23] !== ye || $[24] !== te || $[25] !== title)
    ((Se = r(Dialog, { title: title, onCancel: onCancel, color: "permission", children: [ye, te] })),
      ($[22] = onCancel),
      ($[23] = ye),
      ($[24] = te),
      ($[25] = title),
      ($[26] = Se));
  else Se = $[26];
  return Se;
}

export { AddPermissionRules };
