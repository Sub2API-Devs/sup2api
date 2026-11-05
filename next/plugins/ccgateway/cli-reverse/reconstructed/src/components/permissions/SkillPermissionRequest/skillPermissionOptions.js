/**
 * components/permissions/SkillPermissionRequest/skillPermissionOptions.ts
 *
 * 2.1.316 新增。skill 权限选项。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (13)
 * attribution: placement 13
 */
import { init_react_production, useContext } from "../../../../vendor/react/cjs/react.production.js";
import { isConsentRow, parseConsentSuggestions } from "../consentRows.js";
import { SKILL } from "../../../tools/SkillTool/skillToolNames.js";
import { plainDisplay } from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../../../utils/invisibleChars.js";
import { getSkillDigestRule } from "../../../utils/permissions/classifierApprovalRules.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { permissionTitleRef } from "../PermissionRequestTitle.js";
import { DialogStoreContext } from "../../../state/dialogQueue.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1442478-1442482 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1442478", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1445107-1445639 placement
/**
 * 把 Skill 权限选项转换为结果：yes、精确规则、前缀规则、no（带反馈）。
 */
function skillChoiceToResult(choice, payload, rows, feedback) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(feedback && {
          feedback,
        }),
      };
    case "yes-exact": {
      if (rows.exactRow === null || !isConsentRow(rows.exactRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: rows.exactRow.applies,
      };
    }
    case "yes-prefix": {
      if (rows.prefixRow === null || !isConsentRow(rows.prefixRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: rows.prefixRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(feedback && {
          feedback,
        }),
      };
  }
}
//@ chunk-czq1j3j2.js:1445639-1445819 placement
/**
 * 从技能调用文本中提取命令前缀（第一个空格前，去掉 /），不含通配或冒号时才返回。
 */
function getSkillCommandPrefix(skill) {
  let index = skill.indexOf(" ");
  if (index <= 0) return null;
  let prefix = skill.substring(0, index);
  if (
    (prefix.startsWith("/") ? prefix.substring(1) : prefix) === "" ||
    prefix.includes("*") ||
    prefix.includes(":")
  )
    return null;
  return prefix;
}
//@ chunk-czq1j3j2.js:1445819-1446331 placement
/**
 * 生成 "不再询问该技能" 的 localSettings 规则建议行。
 */
function buildSkillExactRule(payload, originalCwd) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: SKILL,
            ruleContent: payload.skill,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: SKILL_RULE_UPDATE_TYPES,
      renderLabel: (updates) => {
        let update = updates.length === 1 ? updates[0] : undefined;
        if (
          update === undefined ||
          update.type !== "addRules" ||
          update.rules.length !== 1 ||
          update.rules[0]?.toolName !== SKILL ||
          update.rules[0]?.ruleContent !== payload.skill
        )
          return null;
        let skillDisplay = plainDisplay(payload.skill);
        if (skillDisplay === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: skillDisplay.display,
            }),
            " ",
            "in ",
            jsxProd_default(Text, {
              bold: true,
              children: stripInvisibleChars_3(originalCwd),
            }),
          ],
        });
      },
    },
  );
}
//@ chunk-czq1j3j2.js:1446331-1446907 placement
/**
 * 生成 "不再询问 前缀:* 命令" 的 localSettings 规则建议行。
 */
function buildSkillPrefixRule(payload, originalCwd) {
  let skillCommandPrefix = getSkillCommandPrefix(payload.skill);
  if (skillCommandPrefix === null) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: SKILL,
            ruleContent: `${skillCommandPrefix}:*`,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: SKILL_RULE_UPDATE_TYPES,
      renderLabel: (updates) => {
        let update = updates.length === 1 ? updates[0] : undefined;
        if (
          update === undefined ||
          update.type !== "addRules" ||
          update.rules.length !== 1 ||
          update.rules[0]?.toolName !== SKILL ||
          update.rules[0]?.ruleContent !== `${skillCommandPrefix}:*`
        )
          return null;
        let prefixDisplay = plainDisplay(skillCommandPrefix);
        if (prefixDisplay === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: `${prefixDisplay.display}:*`,
            }),
            " commands in",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: stripInvisibleChars_3(originalCwd),
            }),
          ],
        });
      },
    },
  );
}
//@ chunk-czq1j3j2.js:1446907-1446918 placement
var HIDDEN_EXACT_RULE_LABEL = "";
//@ chunk-czq1j3j2.js:1446918-1447405 placement
/**
 * 从 ask 结果解析要显示的技能名、版本规则、是否无技能、调用名（名称不可安全显示时置空）。
 */
function resolveSkillDisplay(payload) {
  let permissionResult = payload.permissionResult;
  if (permissionResult.behavior !== "ask") return;
  let skillDigestRule = getSkillDigestRule(permissionResult);
  let forwardedMcpSkill = payload.forwardedMcpSkill;
  if (
    skillDigestRule === undefined &&
    permissionResult.metadata?.mcpSkill === undefined &&
    forwardedMcpSkill === undefined
  )
    return;
  let name = skillDigestRule?.slice(0, -72);
  let calledName = permissionResult.metadata?.command.name;
  let isUnprintableName = (name) => name !== undefined && plainDisplay(name) === null;
  let isWithoutSkill =
    calledName === undefined &&
    ((forwardedMcpSkill !== undefined && forwardedMcpSkill.name === undefined) ||
      isUnprintableName(forwardedMcpSkill?.name) ||
      isUnprintableName(name));
  let skillName = isWithoutSkill ? "" : (calledName ?? name ?? forwardedMcpSkill?.name ?? "");
  return {
    name: skillName,
    versionRule: calledName !== undefined && calledName === name ? skillDigestRule : undefined,
    isWithoutSkill,
    calledAs:
      calledName !== undefined || skillName === ""
        ? undefined
        : getCalledAsLabel(payload.input.skill, skillName),
  };
}
//@ chunk-czq1j3j2.js:1447405-1447550 placement
function getCalledAsLabel(skill, skillName) {
  if (typeof skill !== "string") return null;
  let trimmed = skill.trim();
  let normalizedSkill = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (normalizedSkill === skillName) return;
  return plainDisplay(normalizedSkill)?.display ?? null;
}
//@ chunk-czq1j3j2.js:1447550-1447611 placement
var TERMINAL_TOO_SHORT_HINT = "Make the terminal taller to approve.";
var CUT_OFFER_HINT = "";
var UNREAD_OFFER_HINT = "";
//@ chunk-czq1j3j2.js:1447611-1447635 placement
var SURVEY_QUESTION_LINE_CHARS = 20;
var NARROW_COLUMNS_WITH_HINTS = 28;
var NARROW_COLUMN_INSET = 4;
//@ chunk-czq1j3j2.js:1447635-1447840 placement
/**
 * 技能权限选项的常量：未读提示开关、显示上限与各种技能询问结果的遥测键。
 */
var SKILL_UNREAD_HINT_ENABLED = false;
var SKILL_NARROW_COLUMNS = 20;
var SKILL_ASK_REVEAL_KEYS = {
  narrower: "skill-ask-was-narrower-than-version-rule-needs",
  hint: "skill-ask-dropped-ask-rule-hint",
  held: "skill-ask-version-answer-held",
  bare: "skill-ask-settled-without-version-answer",
};
//@ chunk-czq1j3j2.js:1447840-1448052 placement
/**
 * 返回当前对话框在对话框存储中的技能询问展开记忆（无对话框上下文时为 undefined）。
 */
function useSkillAskRevealMemory() {
  let $ = useMemoCache(3);
  let titleRef = useContext(permissionTitleRef);
  let dialogStore = useContext(DialogStoreContext);
  let revealApi;
  if ($[0] !== dialogStore || $[1] !== titleRef) {
    revealApi =
      titleRef === null || dialogStore === null
        ? undefined
        : {
            has: (key) => dialogStore.hasRevealed(titleRef, SKILL_ASK_REVEAL_KEYS[key]),
            keep: (key) => {
              dialogStore.firstReveal(titleRef, SKILL_ASK_REVEAL_KEYS[key]);
            },
          };
    $[0] = dialogStore;
    $[1] = titleRef;
    $[2] = revealApi;
  } else revealApi = $[2];
  return revealApi;
}
//@ chunk-czq1j3j2.js:1448052-1448082 placement
var SKILL_RULE_UPDATE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1448052", () => {
  SKILL_RULE_UPDATE_TYPES = new Set(["addRules"]);
});
export {
  getSkillCommandPrefix,
  resolveSkillDisplay,
  useSkillAskRevealMemory,
  SKILL_NARROW_COLUMNS,
  buildSkillExactRule,
  buildSkillPrefixRule,
  HIDDEN_EXACT_RULE_LABEL,
  SKILL_UNREAD_HINT_ENABLED,
  UNREAD_OFFER_HINT,
  CUT_OFFER_HINT,
  TERMINAL_TOO_SHORT_HINT,
  skillChoiceToResult,
  NARROW_COLUMNS_WITH_HINTS,
  NARROW_COLUMN_INSET,
  SURVEY_QUESTION_LINE_CHARS,
};
