/**
 * utils/attachments/skillMentions.ts
 *
 * 2.1.316 新增：技能提及附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { findInlinePasteRanges, getInlinePasteTexts } from "../../history.js";
import { isWordBoundaryAt, checkSkillPermission } from "../../tools/SkillTool/skillPermissions.js";
import { buildCommandLookup } from "../../commands.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { countWhere } from "../collections.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, unknown, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3343496-3343741 placement
/**
 * 找出文本中 /技能名 提及的位置范围（去掉末尾的点）。
 */
function findSlashMentionRanges(text) {
  let ranges = [];
  let pattern = /(^|[\s\u3002\u3001\uFF1F\uFF01])(\/[a-zA-Z][a-zA-Z0-9.:\-_]*)/g;
  let match = null;
  while ((match = pattern.exec(text)) !== null) {
    let lead = match[1] ?? "";
    let mention = match[2] ?? "";
    let mentionLength = mention.length;
    while (mention[mentionLength - 1] === ".") mentionLength--;
    let start = match.index + lead.length;
    ranges.push({
      start,
      end: start + mentionLength,
    });
  }
  return ranges;
}
//@ chunk-5xgkngpb.js:3343741-3343792 placement
/**
 * 读取 tengu_humble_emerson 开关，决定是否为用户提及的技能生成附件。
 */
function isSkillMentionAttachmentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_emerson", true);
}
//@ chunk-5xgkngpb.js:3343792-3344746 placement
/**
 * 为用户提及的技能生成附件，处理禁止模型调用的技能。
 */
function buildSkillMentionAttachments(text, commands, options) {
  let inlinePasteRanges = findInlinePasteRanges(text, options.pastedContents, true);
  let filtered = getInlinePasteTexts(options.pastedContents ?? {}, true).filter(
    (pastedText) => !text.includes(pastedText),
  );
  let mentions = new Map();
  let commandLookup;
  let userOnlyCache = new Map();
  let atPromptStart = text.startsWith("/");
  let lastAcceptedEnd = 0;
  for (let { start, end } of findSlashMentionRanges(text)) {
    if (atPromptStart && text.slice(lastAcceptedEnd, start).trim() === "") {
      lastAcceptedEnd = end;
      continue;
    }
    atPromptStart = false;
    if (!isWordBoundaryAt(text, start, end)) continue;
    let sliced = text.slice(start + 1, end);
    commandLookup ??= buildCommandLookup(commands);
    let command = commandLookup.get(sliced);
    if (command?.type !== "prompt" || mentions.has(command)) continue;
    let userOnly = userOnlyCache.get(sliced);
    if (userOnly === undefined) {
      let checkPermission = (userTypedThisTurn) =>
        checkSkillPermission(command, {
          commandName: sliced,
          userTypedThisTurn,
          isMainSession: true,
          permissionContext: options.permissionContext,
        });
      if (checkPermission(true) !== null) userOnly = null;
      else {
        let reason = checkPermission(false)?.reason;
        userOnly = reason === "disable_model_invocation" || reason === "override_disabled";
      }
      userOnlyCache.set(sliced, userOnly);
    }
    if (userOnly === null) continue;
    if (
      userOnly &&
      (!options.typed ||
        isRangeCovered(start, end, inlinePasteRanges) ||
        filtered.some((pastedText) => pastedText.includes(`/${sliced}`)))
    )
      continue;
    mentions.set(command, {
      skillName: sliced,
      userOnly,
    });
  }
  if (mentions.size > 0)
    logFeatureOk("skill_mention_note", {
      count: mentions.size,
      user_only_count: countWhere([...mentions.values()], (mention) => mention.userOnly),
    });
  return [...mentions.values()].map(({ skillName }) => ({
    type: "skill_mention",
    skillName,
  }));
}
//@ chunk-5xgkngpb.js:3344746-3344877 placement
function isRangeCovered(start, end, inlinePasteRanges) {
  let coveredUpTo = start;
  for (let [rangeStart, rangeEnd] of [...inlinePasteRanges].sort(
    (leftRange, rightRange) => leftRange[0] - rightRange[0],
  )) {
    if (rangeStart > coveredUpTo) return false;
    coveredUpTo = Math.max(coveredUpTo, rangeEnd);
    if (coveredUpTo >= end) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:3344877-3345193 placement
/**
 * 更新权限上下文中的命令级禁止规则：replace 模式用给定列表加本轮禁用工具，union 模式与现有规则合并（剔除路径例外规则）；无变化时返回原状态。
 */
function setCommandDenyRules(setToolPermissionContext, rules, mode = "replace") {
  setToolPermissionContext((prevContext) => {
    let command = prevContext.alwaysDenyRules.command;
    let nextCommandRules =
      mode === "union"
        ? normalizeCaseForComparison_2([
            ...(command ?? []),
            ...rules.filter((rule) => !PATH_RULE_CARVE_OUT_RE.test(rule)),
          ])
        : [...rules, ...(prevContext.turnDisallowedTools ?? [])];
    if (
      (command?.length ?? 0) === nextCommandRules.length &&
      (command ?? []).every((rule, index) => rule === nextCommandRules[index])
    )
      return prevContext;
    return {
      ...prevContext,
      alwaysDenyRules: {
        ...prevContext.alwaysDenyRules,
        command: nextCommandRules.length > 0 ? nextCommandRules : undefined,
      },
    };
  });
}
//@ chunk-5xgkngpb.js:3345193-3345304 placement
/**
 * 禁用工具列表 schema 与 MCP 工具名 schema。
 */
var disallowedToolsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var mcpToolNameSchema;
deferInit("chunk-5xgkngpb.js:3345193", () => {
  disallowedToolsSchema = DoctorLazy(() =>
    objectSchema({
      disallowed_tools: array(unknown()),
    }),
  );
  mcpToolNameSchema = DoctorLazy(() =>
    stringSchema()
      .max(128, {
        abort: true,
      })
      .regex(/^mcp__[A-Za-z0-9_-]+$/),
  );
});
export {
  disallowedToolsSchema,
  mcpToolNameSchema,
  isSkillMentionAttachmentEnabled,
  buildSkillMentionAttachments,
  setCommandDenyRules,
  findSlashMentionRanges,
};
