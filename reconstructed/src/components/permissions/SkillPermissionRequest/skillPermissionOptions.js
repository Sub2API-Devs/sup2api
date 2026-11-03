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
import { j, Se } from "../../../../vendor/react/cjs/react.production.js";
import { isConsentRow, parseConsentSuggestions } from "../consentRows.js";
import { SKILL } from "../../../tools/SkillTool/skillToolNames.js";
import { plainDisplay } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { hr } from "../../../utils/invisibleChars.js";
import { getSkillDigestRule } from "../../../utils/permissions/classifierApprovalRules.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { ODe } from "../PermissionRequestTitle.js";
import { DialogStoreContext } from "../../../state/dialogQueue.js";

//@ chunk-18hwfzwa.js:1406026-1406030 placement
j();
/**
 * 把 Skill 权限选项转换为结果：yes、精确规则、前缀规则、no（带反馈）。
 */
//@ chunk-18hwfzwa.js:1406030-1406562 placement
function skillChoiceToResult(h, x, D, L) {
  switch (h) {
    case "yes":
      return { behavior: "allow", updatedInput: x.input, ...(L && { feedback: L }) };
    case "yes-exact": {
      if (D.exactRow === null || !isConsentRow(D.exactRow))
        return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.exactRow.applies };
    }
    case "yes-prefix": {
      if (D.prefixRow === null || !isConsentRow(D.prefixRow))
        return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.prefixRow.applies };
    }
    case "no":
      return { behavior: "deny", ...(L && { feedback: L }) };
  }
}
/**
 * 从技能调用文本中提取命令前缀（第一个空格前，去掉 /），不含通配或冒号时才返回。
 */
//@ chunk-18hwfzwa.js:1406562-1406742 placement
function getSkillCommandPrefix(h) {
  let index = h.indexOf(" ");
  if (index <= 0) return null;
  let substring = h.substring(0, index);
  if (
    (substring.startsWith("/") ? substring.substring(1) : substring) === "" ||
    substring.includes("*") ||
    substring.includes(":")
  )
    return null;
  return substring;
}
/**
 * 生成 "不再询问该技能" 的 localSettings 规则建议行。
 */
//@ chunk-18hwfzwa.js:1406742-1407254 placement
function buildSkillExactRule(h, x) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: SKILL, ruleContent: h.skill }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: Fyt,
      renderLabel: (D) => {
        let L = D.length === 1 ? D[0] : void 0;
        if (
          L === void 0 ||
          L.type !== "addRules" ||
          L.rules.length !== 1 ||
          L.rules[0]?.toolName !== SKILL ||
          L.rules[0]?.ruleContent !== h.skill
        )
          return null;
        let ee = plainDisplay(h.skill);
        if (ee === null) return null;
        return r(Text, {
          children: [
            "Yes, and don't ask again for ",
            e(Text, { bold: !0, children: ee.display }),
            " ",
            "in ",
            e(Text, { bold: !0, children: hr(x) }),
          ],
        });
      },
    },
  );
}
/**
 * 生成 "不再询问 前缀:* 命令" 的 localSettings 规则建议行。
 */
//@ chunk-18hwfzwa.js:1407254-1407830 placement
function buildSkillPrefixRule(h, x) {
  let D = getSkillCommandPrefix(h.skill);
  if (D === null) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: SKILL, ruleContent: `${D}:*` }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: Fyt,
      renderLabel: (L) => {
        let ee = L.length === 1 ? L[0] : void 0;
        if (
          ee === void 0 ||
          ee.type !== "addRules" ||
          ee.rules.length !== 1 ||
          ee.rules[0]?.toolName !== SKILL ||
          ee.rules[0]?.ruleContent !== `${D}:*`
        )
          return null;
        let ke = plainDisplay(D);
        if (ke === null) return null;
        return r(Text, {
          children: [
            "Yes, and don't ask again for",
            " ",
            e(Text, { bold: !0, children: `${ke.display}:*` }),
            " commands in",
            " ",
            e(Text, { bold: !0, children: hr(x) }),
          ],
        });
      },
    },
  );
}
//@ chunk-18hwfzwa.js:1407830-1407841 placement
var m0o = "";
/**
 * 从 ask 结果解析要显示的技能名、版本规则、是否无技能、调用名（名称不可安全显示时置空）。
 */
//@ chunk-18hwfzwa.js:1407841-1408328 placement
function resolveSkillDisplay(h) {
  let permissionResult = h.permissionResult;
  if (permissionResult.behavior !== "ask") return;
  let D = getSkillDigestRule(permissionResult),
    forwardedMcpSkill = h.forwardedMcpSkill;
  if (D === void 0 && permissionResult.metadata?.mcpSkill === void 0 && forwardedMcpSkill === void 0) return;
  let ee = D?.slice(0, -72),
    ke = permissionResult.metadata?.command.name,
    Re = (We) => We !== void 0 && plainDisplay(We) === null,
    Be =
      ke === void 0 &&
      ((forwardedMcpSkill !== void 0 && forwardedMcpSkill.name === void 0) ||
        Re(forwardedMcpSkill?.name) ||
        Re(ee)),
    He = Be ? "" : (ke ?? ee ?? forwardedMcpSkill?.name ?? "");
  return {
    name: He,
    versionRule: ke !== void 0 && ke === ee ? D : void 0,
    isWithoutSkill: Be,
    calledAs: ke !== void 0 || He === "" ? void 0 : getCalledAsLabel(h.input.skill, He),
  };
}
//@ chunk-18hwfzwa.js:1408328-1408473 placement
function getCalledAsLabel(h, x) {
  if (typeof h !== "string") return null;
  let trimmed = h.trim(),
    L = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (L === x) return;
  return plainDisplay(L)?.display ?? null;
}
//@ chunk-18hwfzwa.js:1408473-1408534 placement
var f0o = "Make the terminal taller to approve.",
  g0o = "",
  Oyt = "";
//@ chunk-18hwfzwa.js:1408534-1408558 placement
var h0o = 20,
  y0o = 28,
  S0o = 4;
/**
 * 技能权限选项的常量：未读提示开关、显示上限与各种技能询问结果的遥测键。
 */
//@ chunk-18hwfzwa.js:1408558-1408763 placement
var SKILL_UNREAD_HINT_ENABLED = !1,
  SKILL_NARROW_COLUMNS = 20,
  SKILL_ASK_REVEAL_KEYS = {
    narrower: "skill-ask-was-narrower-than-version-rule-needs",
    hint: "skill-ask-dropped-ask-rule-hint",
    held: "skill-ask-version-answer-held",
    bare: "skill-ask-settled-without-version-answer",
  };
/**
 * 返回当前对话框在对话框存储中的技能询问展开记忆（无对话框上下文时为 undefined）。
 */
//@ chunk-18hwfzwa.js:1408763-1408975 placement
function useSkillAskRevealMemory() {
  let $ = w(3),
    h = Se(ODe),
    x = Se(DialogStoreContext),
    L;
  if ($[0] !== x || $[1] !== h)
    ((L =
      h === null || x === null
        ? void 0
        : {
            has: (ee) => x.hasRevealed(h, SKILL_ASK_REVEAL_KEYS[ee]),
            keep: (ke) => {
              x.firstReveal(h, SKILL_ASK_REVEAL_KEYS[ke]);
            },
          }),
      ($[0] = x),
      ($[1] = h),
      ($[2] = L));
  else L = $[2];
  return L;
}
//@ chunk-18hwfzwa.js:1408975-1409005 placement
var Fyt = new Set(["addRules"]);

export {
  getSkillCommandPrefix,
  resolveSkillDisplay,
  useSkillAskRevealMemory,
  SKILL_NARROW_COLUMNS,
  buildSkillExactRule,
  buildSkillPrefixRule,
  m0o,
  SKILL_UNREAD_HINT_ENABLED,
  Oyt,
  g0o,
  f0o,
  skillChoiceToResult,
  y0o,
  S0o,
  h0o,
};
