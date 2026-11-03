/**
 * components/permissions/SkillPermissionRequest/skillPermissionOptions.ts
 *
 * 2.1.316 新增。skill 权限选项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: placement 13
 */
import { init_react_production, Se } from "../../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { permissionTitleRef } from "../PermissionRequestTitle.js";
import { DialogStoreContext } from "../../../state/dialogQueue.js";

//@ chunk-18hwfzwa.js:1406026-1406030 placement
init_react_production();
//@ chunk-18hwfzwa.js:1406030-1406562 placement
/**
 * 把 Skill 权限选项转换为结果：yes、精确规则、前缀规则、no（带反馈）。
 */
function skillChoiceToResult(h, payload, D, L) {
  switch (h) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(L && {
          feedback: L,
        }),
      };
    case "yes-exact": {
      if (D.exactRow === null || !isConsentRow(D.exactRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: D.exactRow.applies,
      };
    }
    case "yes-prefix": {
      if (D.prefixRow === null || !isConsentRow(D.prefixRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: D.prefixRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(L && {
          feedback: L,
        }),
      };
  }
}
//@ chunk-18hwfzwa.js:1406562-1406742 placement
/**
 * 从技能调用文本中提取命令前缀（第一个空格前，去掉 /），不含通配或冒号时才返回。
 */
function getSkillCommandPrefix(skill) {
  let index = skill.indexOf(" ");
  if (index <= 0) return null;
  let D = skill.substring(0, index);
  if ((D.startsWith("/") ? D.substring(1) : D) === "" || D.includes("*") || D.includes(":")) return null;
  return D;
}
//@ chunk-18hwfzwa.js:1406742-1407254 placement
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
      renderLabel: (D) => {
        let L = D.length === 1 ? D[0] : undefined;
        if (
          L === undefined ||
          L.type !== "addRules" ||
          L.rules.length !== 1 ||
          L.rules[0]?.toolName !== SKILL ||
          L.rules[0]?.ruleContent !== payload.skill
        )
          return null;
        let ee = plainDisplay(payload.skill);
        if (ee === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: ee.display,
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
//@ chunk-18hwfzwa.js:1407254-1407830 placement
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
      renderLabel: (L) => {
        let ee = L.length === 1 ? L[0] : undefined;
        if (
          ee === undefined ||
          ee.type !== "addRules" ||
          ee.rules.length !== 1 ||
          ee.rules[0]?.toolName !== SKILL ||
          ee.rules[0]?.ruleContent !== `${skillCommandPrefix}:*`
        )
          return null;
        let ke = plainDisplay(skillCommandPrefix);
        if (ke === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: `${ke.display}:*`,
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
//@ chunk-18hwfzwa.js:1407830-1407841 placement
var HIDDEN_EXACT_RULE_LABEL = "";
//@ chunk-18hwfzwa.js:1407841-1408328 placement
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
  let sliced = skillDigestRule?.slice(0, -72);
  let ke = permissionResult.metadata?.command.name;
  let Re = (We) => We !== undefined && plainDisplay(We) === null;
  let Be =
    ke === undefined &&
    ((forwardedMcpSkill !== undefined && forwardedMcpSkill.name === undefined) ||
      Re(forwardedMcpSkill?.name) ||
      Re(sliced));
  let He = Be ? "" : (ke ?? sliced ?? forwardedMcpSkill?.name ?? "");
  return {
    name: He,
    versionRule: ke !== undefined && ke === sliced ? skillDigestRule : undefined,
    isWithoutSkill: Be,
    calledAs: ke !== undefined || He === "" ? undefined : getCalledAsLabel(payload.input.skill, He),
  };
}
//@ chunk-18hwfzwa.js:1408328-1408473 placement
function getCalledAsLabel(skill, x) {
  if (typeof skill !== "string") return null;
  let trimmed = skill.trim();
  let L = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (L === x) return;
  return plainDisplay(L)?.display ?? null;
}
//@ chunk-18hwfzwa.js:1408473-1408534 placement
var TERMINAL_TOO_SHORT_HINT = "Make the terminal taller to approve.";
var CUT_OFFER_HINT = "";
var UNREAD_OFFER_HINT = "";
//@ chunk-18hwfzwa.js:1408534-1408558 placement
var SURVEY_QUESTION_LINE_CHARS = 20;
var NARROW_COLUMNS_WITH_HINTS = 28;
var NARROW_COLUMN_INSET = 4;
//@ chunk-18hwfzwa.js:1408558-1408763 placement
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
//@ chunk-18hwfzwa.js:1408763-1408975 placement
/**
 * 返回当前对话框在对话框存储中的技能询问展开记忆（无对话框上下文时为 undefined）。
 */
function useSkillAskRevealMemory() {
  let $ = w(3);
  let h = Se(permissionTitleRef);
  let x = Se(DialogStoreContext);
  let L;
  if ($[0] !== x || $[1] !== h) {
    L =
      h === null || x === null
        ? undefined
        : {
            has: (ee) => x.hasRevealed(h, SKILL_ASK_REVEAL_KEYS[ee]),
            keep: (ke) => {
              x.firstReveal(h, SKILL_ASK_REVEAL_KEYS[ke]);
            },
          };
    $[0] = x;
    $[1] = h;
    $[2] = L;
  } else L = $[2];
  return L;
}
//@ chunk-18hwfzwa.js:1408975-1409005 placement
var SKILL_RULE_UPDATE_TYPES = new Set(["addRules"]);
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
