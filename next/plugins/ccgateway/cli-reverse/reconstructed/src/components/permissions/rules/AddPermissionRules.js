/**
 * components/permissions/rules/AddPermissionRules.tsx
 *
 * 添加权限规则：选择保存位置（本地项目/项目/用户设置）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/AddPermissionRules.tsx
 * pieces: chunk-h5wy8vq5.js (3)
 * attribution: fingerprint 3
 */
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";
import { PermissionRuleDescription } from "./PermissionRuleDescription.js";
import { getRelativeSettingsFilePathForSource } from "../../../utils/settings/settings.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../design-system/ThemeProvider.js";
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

//@ chunk-h5wy8vq5.js:23359-23482 fingerprint (2.1.88 match: _temp, 1)
function renderRuleListItem(ruleValue) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: permissionRuleValueFromString(ruleValue),
        }),
        jsxProd_default(PermissionRuleDescription, {
          ruleValue,
        }),
      ],
    },
    permissionRuleValueFromString(ruleValue),
  );
}
//@ chunk-h5wy8vq5.js:23482-23846 fingerprint (2.1.88 match: optionForPermissionSaveDestination, 1)
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
//@ chunk-h5wy8vq5.js:23846-25547 fingerprint (2.1.88 match: AddPermissionRules, 0.948)
function AddPermissionRules(props) {
  let $ = useMemoCache(27);
  let { onAddRules, onCancel, ruleValues, ruleBehavior, initialContext, setToolPermissionContext } = props;
  let { storageV5 } = useTheme_2();
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = SOURCES.map(optionForPermissionSaveDestination);
    $[0] = t1;
  } else t1 = $[0];
  let allOptions = t1;
  let t2;
  if (
    $[1] !== initialContext ||
    $[2] !== onAddRules ||
    $[3] !== onCancel ||
    $[4] !== ruleBehavior ||
    $[5] !== ruleValues ||
    $[6] !== setToolPermissionContext ||
    $[7] !== storageV5
  ) {
    t2 = (selectedValue) => {
      if (selectedValue === "cancel") {
        onCancel();
        return;
      } else if (SOURCES.includes(selectedValue)) {
        let destination = selectedValue;
        let updatedContext = applyValidatedPermissionUpdate(initialContext, {
          type: "addRules",
          rules: ruleValues,
          behavior: ruleBehavior,
          destination,
        });
        persistValidatedPermissionUpdate(
          {
            type: "addRules",
            rules: ruleValues,
            behavior: ruleBehavior,
            destination,
          },
          storageV5,
        ).catch(logError);
        setToolPermissionContext(updatedContext);
        let rules = ruleValues.map((ruleValue) => ({
          ruleValue,
          ruleBehavior,
          source: destination,
        }));
        let sandboxAutoAllowEnabled =
          SandboxManager.isSandboxingEnabled() && SandboxManager.isAutoAllowBashIfSandboxedEnabled();
        let newUnreachable = detectUnreachableRules(updatedContext, {
          sandboxAutoAllowEnabled,
        }).filter((unreachableRule) =>
          ruleValues.some(
            (rv) =>
              rv.toolName === unreachableRule.rule.ruleValue.toolName &&
              rv.ruleContent === unreachableRule.rule.ruleValue.ruleContent,
          ),
        );
        onAddRules(rules, newUnreachable);
      }
    };
    $[1] = initialContext;
    $[2] = onAddRules;
    $[3] = onCancel;
    $[4] = ruleBehavior;
    $[5] = ruleValues;
    $[6] = setToolPermissionContext;
    $[7] = storageV5;
    $[8] = t2;
  } else t2 = $[8];
  let onSelect = t2;
  let t3;
  if ($[9] !== ruleValues.length) {
    t3 = plural(ruleValues.length, "rule");
    $[9] = ruleValues.length;
    $[10] = t3;
  } else t3 = $[10];
  let title = `Add ${ruleBehavior} permission ${t3}`;
  let children;
  if ($[11] !== ruleValues) {
    children = ruleValues.map(renderRuleListItem);
    $[11] = ruleValues;
    $[12] = children;
  } else children = $[12];
  let dialogBox;
  if ($[13] !== children) {
    dialogBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: 2,
      children,
    });
    $[13] = children;
    $[14] = dialogBox;
  } else dialogBox = $[14];
  const children_2 =
    ruleValues.length === 1 ? "Where should this rule be saved?" : "Where should these rules be saved?";
  let t7;
  if ($[15] !== children_2) {
    t7 = jsxProd_default(Text, {
      children: children_2,
    });
    $[15] = children_2;
    $[16] = t7;
  } else t7 = $[16];
  let t8;
  if ($[17] !== onSelect) {
    t8 = jsxProd_default(ModelSelector, {
      options: allOptions,
      onChange: onSelect,
    });
    $[17] = onSelect;
    $[18] = t8;
  } else t8 = $[18];
  let t9;
  if ($[19] !== t7 || $[20] !== t8) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginY: 1,
      children: [t7, t8],
    });
    $[19] = t7;
    $[20] = t8;
    $[21] = t9;
  } else t9 = $[21];
  let t10;
  if ($[22] !== onCancel || $[23] !== dialogBox || $[24] !== t9 || $[25] !== title) {
    t10 = jsxProd_default_2(Dialog, {
      title,
      onCancel,
      color: "permission",
      children: [dialogBox, t9],
    });
    $[22] = onCancel;
    $[23] = dialogBox;
    $[24] = t9;
    $[25] = title;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
export { AddPermissionRules };
