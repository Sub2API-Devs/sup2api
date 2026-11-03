/**
 * commands/skills/skillOverrideEdit.ts
 *
 * 2.1.316 新增：处理技能状态编辑请求（开关模型调用等），检查插件/作者/保留名/更高优先级配置限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wf4qcsws.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, U, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { DCe } from "../../utils/commandPredicates.js";
import {
  sortSkillsForListing,
  buildSkillOverrideContext,
  getLockedSkillOverride,
  getEffectiveSkillStates,
  diffSkillOverrides,
} from "../../skills/claudeAiSkillConflicts.js";
import { getCommands } from "../../commands.js";
import { updateSettingsForSource, settleBackgroundSettingsWork } from "../../utils/settings/settings.js";

//@ chunk-wf4qcsws.js:11911-12154 placement
var SkillOverrideEditSchema = DoctorLazy(() =>
  zodStrictObject({
    name: o().min(1).max(500),
    state: U(["on", "name-only", "user-invocable-only", "off"]),
    handles: zodStrictObject({
      unqualified_name: o().max(500).optional(),
      aliases: A(o().max(500)).max(20).optional(),
      bare_name_reserved: M().optional(),
    }).optional(),
  }),
);
/**
 * 处理技能状态编辑请求（开关模型调用等），检查插件/作者/保留名/更高优先级配置限制。
 */
//@ chunk-wf4qcsws.js:12154-13666 placement
async function runSkillOverrideEdit(m, c, l) {
  let safeParse = SkillOverrideEditSchema().safeParse(m);
  if (!safeParse.success) {
    let e = safeParse.error.issues[0];
    return {
      ok: !1,
      error: e
        ? `Not a skill state edit (${e.path.map(String).join(".") || "edit"}: ${e.message}).`
        : "Not a skill state edit.",
    };
  }
  let t = safeParse.data;
  if (!DCe(t.name))
    return {
      ok: !1,
      error:
        "Settings can't store an entry with this skill's name; rename its folder or file to configure it.",
    };
  let i = sortSkillsForListing(await getCommands(c, l)),
    filtered = i.filter((e) => e.name === t.name);
  if (filtered.length > 0 && t.handles?.bare_name_reserved !== void 0)
    filtered = filtered.map((e) => {
      let d = { ...e, bareNameReserved: t.handles?.bare_name_reserved };
      return ((i[i.indexOf(e)] = d), d);
    });
  if (filtered.length === 0) {
    let e = {
      name: t.name,
      type: "prompt",
      unqualifiedName: t.handles?.bare_name_reserved ? void 0 : t.handles?.unqualified_name,
      aliases: t.handles?.aliases,
    };
    ((filtered = [e]), i.push(e));
  }
  let s = buildSkillOverrideContext(i),
    found = filtered.map((e) => s.locked.get(e) ?? getLockedSkillOverride(e)).find(Boolean);
  if (found)
    return {
      ok: !1,
      error:
        found.source === "plugin"
          ? "A plugin skill is managed with the plugin, not here."
          : found.source === "author"
            ? "This skill's own file turns model invocation off; its state cannot be changed here."
            : found.source === "reserved-name"
              ? "Settings can't store an entry with this skill's name; rename its folder or file to configure it."
              : "A higher-priority configuration sets this skill's state; it cannot be changed here.",
    };
  let merged = Object.assign(Object.create(null), getEffectiveSkillStates(i, s), { [t.name]: t.state }),
    {
      diff: diff,
      writes: writes,
      effectiveChanged: effectiveChanged,
    } = diffSkillOverrides(filtered, merged, s);
  if (writes > 0) {
    let { error: error } = await updateSettingsForSource(
      "localSettings",
      { skillOverrides: diff },
      void 0,
      l,
    );
    if (error) return { ok: !1, error: error.message };
    await settleBackgroundSettingsWork();
  }
  return { ok: !0, written: t, changed: effectiveChanged > 0 };
}
