/**
 * utils/telemetry/skillLoadedEvent.ts
 *
 * 会话开始时为已加载 Skill 发 tengu_skill_loaded。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/skillLoadedEvent.ts
 * pieces: chunk-csq9ftr9.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { parsePluginIdentifier_2, isOfficialMarketplaceName_3 } from "../plugins/pluginIdentifier.js";
import { isToolDetailsLoggingEnabled } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "./events.js";
import { fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { hashPluginId } from "./pluginTelemetry.js";

//@ chunk-csq9ftr9.js:8909-9328 placement
function skillLoadedSource(e, n, r, s) {
  let g = n?.type === "prompt" ? n.source : void 0,
    f = n?.type === "prompt" ? n.pluginInfo : void 0,
    m = f ? parsePluginIdentifier_2(f.repository).marketplace : void 0,
    y =
      g === "builtin" ||
      g === "bundled" ||
      (g === "plugin" && isOfficialMarketplaceName_3(m)) ||
      isToolDetailsLoggingEnabled();
  logOTelEvent(
    "skill_activated",
    {
      "skill.name": y ? e : "custom_skill",
      invocation_trigger: r,
      ...(g && { "skill.source": g }),
      ...(n?.kind && { "skill.kind": n.kind }),
      ...(y && f && { "plugin.name": f.pluginManifest.name }),
      ...(y && m && { "marketplace.name": m }),
    },
    s,
  );
}
/**
 * 会话开始时为每个已加载 Skill 发 tengu_skill_loaded 事件（带插件来源字段）。
 */
//@ chunk-csq9ftr9.js:9328-9469 fingerprint = logSkillsLoaded (0.497)
function logSkillsLoaded(e, n, r, s) {
  return {
    ...(e && { skill_source: fromEnum(e) }),
    ...(n && { skill_loaded_from: fromEnum(n) }),
    ...(r && { skill_kind: fromEnum(r) }),
    ...(s && { skill_created_by: fromEnum(s) }),
  };
}
//@ chunk-csq9ftr9.js:9469-9520 placement
function rYo(e) {
  return { skill_name_hash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(e)) };
}
/**
 * 父技能名哈希与命令名字段。
 */
//@ chunk-csq9ftr9.js:9520-9624 placement
function parentSkillFields(e, n) {
  if (!e) return {};
  return {
    parent_skill_name_hash: fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(e)),
    parent_command_name: sYo(e, n),
  };
}
//@ chunk-csq9ftr9.js:9624-9666 placement
function sYo(e, n) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(n ? e : "custom");
}
/**
 * 生成遥测用 skill 名：MCP 记 "mcp"，内置/打包/官方市场用原名，其余记 "custom" 并附名称哈希。
 */
//@ chunk-csq9ftr9.js:9666-9850 placement
function sanitizeSkillNameForTelemetry({
  rawName: rawName,
  canonicalName: canonicalName,
  isMcp: isMcp,
  isBuiltIn: isBuiltIn,
  isBundled: isBundled,
  isOfficial: isOfficial,
}) {
  let m = isMcp ? "mcp" : isBuiltIn || isBundled || isOfficial ? rawName : "custom";
  return {
    sanitizedName: fromSanitizer_SANITIZER_OUTPUT_ONLY(m),
    skillNameHash: m === "custom" ? rYo(canonicalName) : {},
  };
}

export { sanitizeSkillNameForTelemetry, logSkillsLoaded, skillLoadedSource, rYo, parentSkillFields, sYo };
