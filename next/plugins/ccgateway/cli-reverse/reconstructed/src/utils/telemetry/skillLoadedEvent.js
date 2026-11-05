/**
 * utils/telemetry/skillLoadedEvent.ts
 *
 * 会话开始时为已加载 Skill 发 tengu_skill_loaded。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/skillLoadedEvent.ts
 * pieces: chunk-n0gp41wj.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { parsePluginIdentifier_2, isOfficialMarketplaceName_3 } from "../plugins/pluginIdentifier.js";
import { isToolDetailsLoggingEnabled } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "./events.js";
import { fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { hashPluginId } from "./pluginTelemetry.js";

//@ chunk-n0gp41wj.js:8909-9328 placement
function skillLoadedSource(skillName, command, invocationTrigger, agentContext) {
  let source = command?.type === "prompt" ? command.source : undefined;
  let pluginInfo = command?.type === "prompt" ? command.pluginInfo : undefined;
  let marketplace = pluginInfo ? parsePluginIdentifier_2(pluginInfo.repository).marketplace : undefined;
  let mayLogName =
    source === "builtin" ||
    source === "bundled" ||
    (source === "plugin" && isOfficialMarketplaceName_3(marketplace)) ||
    isToolDetailsLoggingEnabled();
  logOTelEvent(
    "skill_activated",
    {
      "skill.name": mayLogName ? skillName : "custom_skill",
      invocation_trigger: invocationTrigger,
      ...(source && {
        "skill.source": source,
      }),
      ...(command?.kind && {
        "skill.kind": command.kind,
      }),
      ...(mayLogName &&
        pluginInfo && {
          "plugin.name": pluginInfo.pluginManifest.name,
        }),
      ...(mayLogName &&
        marketplace && {
          "marketplace.name": marketplace,
        }),
    },
    agentContext,
  );
}
//@ chunk-n0gp41wj.js:9328-9469 fingerprint (2.1.88 match: logSkillsLoaded, 0.497)
/**
 * 会话开始时为每个已加载 Skill 发 tengu_skill_loaded 事件（带插件来源字段）。
 */
function logSkillsLoaded(source, loadedFrom, kind, createdBy) {
  return {
    ...(source && {
      skill_source: fromEnum(source),
    }),
    ...(loadedFrom && {
      skill_loaded_from: fromEnum(loadedFrom),
    }),
    ...(kind && {
      skill_kind: fromEnum(kind),
    }),
    ...(createdBy && {
      skill_created_by: fromEnum(createdBy),
    }),
  };
}
//@ chunk-n0gp41wj.js:9469-9520 placement
/**
 * 技能名哈希字段。
 */
function skillNameHashFields(skillName) {
  return {
    skill_name_hash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(skillName)),
  };
}
//@ chunk-n0gp41wj.js:9520-9624 placement
/**
 * 父技能名哈希与命令名字段。
 */
function parentSkillFields(skillName, canonicalName) {
  if (!skillName) return {};
  return {
    parent_skill_name_hash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(skillName)),
    parent_command_name: parentCommandName(skillName, canonicalName),
  };
}
//@ chunk-n0gp41wj.js:9624-9666 placement
/**
 * 父命令名（非官方记 custom）。
 */
function parentCommandName(skillName, mayLogName) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(mayLogName ? skillName : "custom");
}
//@ chunk-n0gp41wj.js:9666-9850 placement
/**
 * 生成遥测用 skill 名：MCP 记 "mcp"，内置/打包/官方市场用原名，其余记 "custom" 并附名称哈希。
 */
function sanitizeSkillNameForTelemetry({ rawName, canonicalName, isMcp, isBuiltIn, isBundled, isOfficial }) {
  let sanitized = isMcp ? "mcp" : isBuiltIn || isBundled || isOfficial ? rawName : "custom";
  return {
    sanitizedName: fromSanitizer_SANITIZER_OUTPUT_ONLY(sanitized),
    skillNameHash: sanitized === "custom" ? skillNameHashFields(canonicalName) : {},
  };
}
export {
  parentCommandName,
  sanitizeSkillNameForTelemetry,
  parentSkillFields,
  logSkillsLoaded,
  skillLoadedSource,
  skillNameHashFields,
};
