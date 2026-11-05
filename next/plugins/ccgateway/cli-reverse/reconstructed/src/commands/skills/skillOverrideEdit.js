/**
 * commands/skills/skillOverrideEdit.ts
 *
 * 2.1.316 新增：处理技能状态编辑请求（开关模型调用等），检查插件/作者/保留名/更高优先级配置限制。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tehxjwcj.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  _enum,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isNotProtoKey } from "../../utils/commandPredicates.js";
import {
  sortSkillsForListing,
  buildSkillOverrideContext,
  getLockedSkillOverride,
  getEffectiveSkillStates,
  diffSkillOverrides,
} from "../../skills/claudeAiSkillConflicts.js";
import { getCommands } from "../../commands.js";
import { updateSettingsForSource, settleBackgroundSettingsWork } from "../../utils/settings/settings.js";

//@ chunk-tehxjwcj.js:13059-13302 placement
var SkillOverrideEditSchema = DoctorLazy(() =>
  zodStrictObject({
    name: stringSchema().min(1).max(500),
    state: _enum(["on", "name-only", "user-invocable-only", "off"]),
    handles: zodStrictObject({
      unqualified_name: stringSchema().max(500).optional(),
      aliases: array(stringSchema().max(500)).max(20).optional(),
      bare_name_reserved: booleanSchema().optional(),
    }).optional(),
  }),
);
//@ chunk-tehxjwcj.js:13302-14814 placement
/**
 * 处理技能状态编辑请求（开关模型调用等），检查插件/作者/保留名/更高优先级配置限制。
 */
async function runSkillOverrideEdit(edit, cwd, storage) {
  let parsed = SkillOverrideEditSchema().safeParse(edit);
  if (!parsed.success) {
    let firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      error: firstIssue
        ? `Not a skill state edit (${firstIssue.path.map(String).join(".") || "edit"}: ${firstIssue.message}).`
        : "Not a skill state edit.",
    };
  }
  let parsedEdit = parsed.data;
  if (!isNotProtoKey(parsedEdit.name))
    return {
      ok: false,
      error:
        "Settings can't store an entry with this skill's name; rename its folder or file to configure it.",
    };
  let sortedCommands = sortSkillsForListing(await getCommands(cwd, storage));
  let commands = sortedCommands.filter((command) => command.name === parsedEdit.name);
  if (commands.length > 0 && parsedEdit.handles?.bare_name_reserved !== undefined)
    commands = commands.map((command) => {
      let patchedCommand = {
        ...command,
        bareNameReserved: parsedEdit.handles?.bare_name_reserved,
      };
      sortedCommands[sortedCommands.indexOf(command)] = patchedCommand;
      return patchedCommand;
    });
  if (commands.length === 0) {
    let placeholderCommand = {
      name: parsedEdit.name,
      type: "prompt",
      unqualifiedName: parsedEdit.handles?.bare_name_reserved
        ? undefined
        : parsedEdit.handles?.unqualified_name,
      aliases: parsedEdit.handles?.aliases,
    };
    commands = [placeholderCommand];
    sortedCommands.push(placeholderCommand);
  }
  let context = buildSkillOverrideContext(sortedCommands);
  let found = commands
    .map((command) => context.locked.get(command) ?? getLockedSkillOverride(command))
    .find(Boolean);
  if (found)
    return {
      ok: false,
      error:
        found.source === "plugin"
          ? "A plugin skill is managed with the plugin, not here."
          : found.source === "author"
            ? "This skill's own file turns model invocation off; its state cannot be changed here."
            : found.source === "reserved-name"
              ? "Settings can't store an entry with this skill's name; rename its folder or file to configure it."
              : "A higher-priority configuration sets this skill's state; it cannot be changed here.",
    };
  let merged = Object.assign(Object.create(null), getEffectiveSkillStates(sortedCommands, context), {
    [parsedEdit.name]: parsedEdit.state,
  });
  let { diff, writes, effectiveChanged } = diffSkillOverrides(commands, merged, context);
  if (writes > 0) {
    let { error } = await updateSettingsForSource(
      "localSettings",
      {
        skillOverrides: diff,
      },
      undefined,
      storage,
    );
    if (error)
      return {
        ok: false,
        error: error.message,
      };
    await settleBackgroundSettingsWork();
  }
  return {
    ok: true,
    written: parsedEdit,
    changed: effectiveChanged > 0,
  };
}
export { runSkillOverrideEdit };
