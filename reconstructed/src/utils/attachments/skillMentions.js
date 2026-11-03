/**
 * utils/attachments/skillMentions.ts
 *
 * 2.1.316 新增：技能提及附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { findInlinePasteRanges, getInlinePasteTexts } from "../../history.js";
import { isWordBoundaryAt, checkSkillPermission } from "../../tools/SkillTool/skillPermissions.js";
import { buildCommandLookup } from "../../commands.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { count, uniq } from "../collections.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, unknown, string } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:3258765-3259010 placement
/**
 * 找出文本中 /技能名 提及的位置范围（去掉末尾的点）。
 */
function findSlashMentionRanges(e) {
  let n = [];
  let r = /(^|[\s\u3002\u3001\uFF1F\uFF01])(\/[a-zA-Z][a-zA-Z0-9.:\-_]*)/g;
  let s = null;
  while ((s = r.exec(e)) !== null) {
    let h = s[1] ?? "";
    let y = s[2] ?? "";
    let S = y.length;
    while (y[S - 1] === ".") S--;
    let w = s.index + h.length;
    n.push({
      start: w,
      end: w + S,
    });
  }
  return n;
}
//@ chunk-e6aww6q8.js:3259010-3259061 placement
/**
 * 读取 tengu_humble_emerson 开关，决定是否为用户提及的技能生成附件。
 */
function isSkillMentionAttachmentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_emerson", true);
}
//@ chunk-e6aww6q8.js:3259061-3260010 placement
/**
 * 为用户提及的技能生成附件，处理禁止模型调用的技能。
 */
function buildSkillMentionAttachments(e, commands, r) {
  let inlinePasteRanges = findInlinePasteRanges(e, r.pastedContents, true);
  let filtered = getInlinePasteTexts(r.pastedContents ?? {}, true).filter((q) => !e.includes(q));
  let y = new Map();
  let S;
  let w = new Map();
  let L = e.startsWith("/");
  let G = 0;
  for (let { start, end } of findSlashMentionRanges(e)) {
    if (L && e.slice(G, start).trim() === "") {
      G = end;
      continue;
    }
    L = false;
    if (!isWordBoundaryAt(e, start, end)) continue;
    let sliced = e.slice(start + 1, end);
    S ??= buildCommandLookup(commands);
    let ke = S.get(sliced);
    if (ke?.type !== "prompt" || y.has(ke)) continue;
    let we = w.get(sliced);
    if (we === undefined) {
      let Ee = (userTypedThisTurn) =>
        checkSkillPermission(ke, {
          commandName: sliced,
          userTypedThisTurn,
          isMainSession: true,
          permissionContext: r.permissionContext,
        });
      if (Ee(true) !== null) we = null;
      else {
        let reason = Ee(false)?.reason;
        we = reason === "disable_model_invocation" || reason === "override_disabled";
      }
      w.set(sliced, we);
    }
    if (we === null) continue;
    if (
      we &&
      (!r.typed ||
        isRangeCovered(start, end, inlinePasteRanges) ||
        filtered.some((Ee) => Ee.includes(`/${sliced}`)))
    )
      continue;
    y.set(ke, {
      skillName: sliced,
      userOnly: we,
    });
  }
  if (y.size > 0)
    logFeatureOk("skill_mention_note", {
      count: y.size,
      user_only_count: count([...y.values()], (q) => q.userOnly),
    });
  return [...y.values()].map(({ skillName }) => ({
    type: "skill_mention",
    skillName,
  }));
}
//@ chunk-e6aww6q8.js:3260010-3260141 placement
function isRangeCovered(start, end, inlinePasteRanges) {
  let s = start;
  for (let [h, y] of [...inlinePasteRanges].sort((S, w) => S[0] - w[0])) {
    if (h > s) return false;
    s = Math.max(s, y);
    if (s >= end) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3260141-3260457 placement
/**
 * 更新权限上下文中的命令级禁止规则：replace 模式用给定列表加本轮禁用工具，union 模式与现有规则合并（剔除路径例外规则）；无变化时返回原状态。
 */
function setCommandDenyRules(setToolPermissionContext, n, r = "replace") {
  setToolPermissionContext((s) => {
    let command = s.alwaysDenyRules.command;
    let y =
      r === "union"
        ? uniq([...(command ?? []), ...n.filter((w) => !PATH_RULE_CARVE_OUT_RE.test(w))])
        : [...n, ...(s.turnDisallowedTools ?? [])];
    if ((command?.length ?? 0) === y.length && (command ?? []).every((w, L) => w === y[L])) return s;
    return {
      ...s,
      alwaysDenyRules: {
        ...s.alwaysDenyRules,
        command: y.length > 0 ? y : undefined,
      },
    };
  });
}
//@ chunk-e6aww6q8.js:3260457-3260568 placement
/**
 * 禁用工具列表 schema 与 MCP 工具名 schema。
 */
var disallowedToolsSchema = DoctorLazy(() =>
  u({
    disallowed_tools: array(unknown()),
  }),
);
var mcpToolNameSchema = DoctorLazy(() =>
  string()
    .max(128, {
      abort: true,
    })
    .regex(/^mcp__[A-Za-z0-9_-]+$/),
);
export {
  setCommandDenyRules,
  findSlashMentionRanges,
  disallowedToolsSchema,
  mcpToolNameSchema,
  isSkillMentionAttachmentEnabled,
  buildSkillMentionAttachments,
};
