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
import { SRn, checkSkillPermission } from "../../tools/SkillTool/skillPermissions.js";
import { buildCommandLookup } from "../../commands.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { count, uniq } from "../collections.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, oe, o } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 找出文本中 /技能名 提及的位置范围（去掉末尾的点）。
 */
//@ chunk-e6aww6q8.js:3258765-3259010 placement
function findSlashMentionRanges(e) {
  let n = [],
    r = /(^|[\s\u3002\u3001\uFF1F\uFF01])(\/[a-zA-Z][a-zA-Z0-9.:\-_]*)/g,
    s = null;
  while ((s = r.exec(e)) !== null) {
    let h = s[1] ?? "",
      y = s[2] ?? "",
      S = y.length;
    while (y[S - 1] === ".") S--;
    let w = s.index + h.length;
    n.push({ start: w, end: w + S });
  }
  return n;
}
//@ chunk-e6aww6q8.js:3259010-3259061 placement
function kRn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_emerson", !0);
}
/**
 * 为用户提及的技能生成附件，处理禁止模型调用的技能。
 */
//@ chunk-e6aww6q8.js:3259061-3260010 placement
function buildSkillMentionAttachments(e, n, r) {
  let s = findInlinePasteRanges(e, r.pastedContents, !0),
    filtered = getInlinePasteTexts(r.pastedContents ?? {}, !0).filter((q) => !e.includes(q)),
    y = new Map(),
    S,
    w = new Map(),
    startsWith = e.startsWith("/"),
    G = 0;
  for (let { start: start, end: end } of findSlashMentionRanges(e)) {
    if (startsWith && e.slice(G, start).trim() === "") {
      G = end;
      continue;
    }
    if (((startsWith = !1), !SRn(e, start, end))) continue;
    let sliced = e.slice(start + 1, end);
    S ??= buildCommandLookup(n);
    let ke = S.get(sliced);
    if (ke?.type !== "prompt" || y.has(ke)) continue;
    let we = w.get(sliced);
    if (we === void 0) {
      let Ee = (Ae) =>
        checkSkillPermission(ke, {
          commandName: sliced,
          userTypedThisTurn: Ae,
          isMainSession: !0,
          permissionContext: r.permissionContext,
        });
      if (Ee(!0) !== null) we = null;
      else {
        let Ae = Ee(!1)?.reason;
        we = Ae === "disable_model_invocation" || Ae === "override_disabled";
      }
      w.set(sliced, we);
    }
    if (we === null) continue;
    if (we && (!r.typed || isRangeCovered(start, end, s) || filtered.some((Ee) => Ee.includes(`/${sliced}`))))
      continue;
    y.set(ke, { skillName: sliced, userOnly: we });
  }
  if (y.size > 0)
    logFeatureOk("skill_mention_note", {
      count: y.size,
      user_only_count: count([...y.values()], (q) => q.userOnly),
    });
  return [...y.values()].map(({ skillName: skillName }) => ({ type: "skill_mention", skillName: skillName }));
}
//@ chunk-e6aww6q8.js:3260010-3260141 placement
function isRangeCovered(e, n, r) {
  let s = e;
  for (let [h, y] of [...r].sort((S, w) => S[0] - w[0])) {
    if (h > s) return !1;
    if (((s = Math.max(s, y)), s >= n)) return !0;
  }
  return !1;
}
/**
 * 更新权限上下文中的命令级禁止规则：replace 模式用给定列表加本轮禁用工具，union 模式与现有规则合并（剔除路径例外规则）；无变化时返回原状态。
 */
//@ chunk-e6aww6q8.js:3260141-3260457 placement
function setCommandDenyRules(e, n, r = "replace") {
  e((s) => {
    let command = s.alwaysDenyRules.command,
      y =
        r === "union"
          ? uniq([...(command ?? []), ...n.filter((w) => !PATH_RULE_CARVE_OUT_RE.test(w))])
          : [...n, ...(s.turnDisallowedTools ?? [])];
    if ((command?.length ?? 0) === y.length && (command ?? []).every((w, L) => w === y[L])) return s;
    return { ...s, alwaysDenyRules: { ...s.alwaysDenyRules, command: y.length > 0 ? y : void 0 } };
  });
}
/**
 * 禁用工具列表 schema 与 MCP 工具名 schema。
 */
//@ chunk-e6aww6q8.js:3260457-3260568 placement
var disallowedToolsSchema = DoctorLazy(() => u({ disallowed_tools: A(oe()) })),
  mcpToolNameSchema = DoctorLazy(() =>
    o()
      .max(128, { abort: !0 })
      .regex(/^mcp__[A-Za-z0-9_-]+$/),
  );

export {
  setCommandDenyRules,
  findSlashMentionRanges,
  disallowedToolsSchema,
  mcpToolNameSchema,
  kRn,
  buildSkillMentionAttachments,
};
