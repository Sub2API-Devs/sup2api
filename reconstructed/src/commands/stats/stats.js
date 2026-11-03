/**
 * commands/stats/stats.tsx
 *
 * 沿用旧版路径：/stats 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/stats/stats.tsx
 * pieces: chunk-ej3ckp70.js (1)
 * attribution: placement 1
 */
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { call } from "../skill-doctor/skill-doctor.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PluginCommand } from "../plugin/PluginSettings.js";
import { KWn } from "../../utils/plugins/pluginRelevance.js";
import { buildSkillDoctorContext } from "../skill-doctor/skillDoctor.js";

/**
 * /stats 命令入口：无人值守后台会话直接输出文本结果；否则渲染 PluginCommand（stats 页），附带技能统计与缓存影响等上下文。
 */
//@ chunk-ej3ckp70.js:17042-17457 placement
var callStatsCommand = async (onDone, context) => {
  if (isUnattendedBgSession()) {
    let t = await call("", context);
    return (onDone(t.type === "text" ? t.value : void 0, { display: "system" }), null);
  }
  return e(PluginCommand, {
    onComplete: onDone,
    args: "stats",
    showSkillDoctorRedirectMessage: !0,
    commands: context.options.commands,
    getSessionContext: () => KWn(context.messages, context.readFileState),
    getSkillStatsInputs: () => buildSkillDoctorContext(context),
    getReloadCacheImpactOptions: () => ({
      model: context.options.mainLoopModel,
      dynamicMcpConfig: context.options.dynamicMcpConfig,
    }),
  });
};
