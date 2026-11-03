/**
 * commands/context/contextCommand.tsx
 *
 * 2.1.316 新增：/context 命令渲染入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qey4tpm4.js (1)
 * attribution: placement 1
 */
import { Jn } from "../../remote/remoteMode.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PluginCommand } from "../plugin/PluginSettings.js";
import { KWn } from "../../utils/plugins/pluginRelevance.js";
import { buildSkillDoctorContext } from "../skill-doctor/skillDoctor.js";

/**
 * /plugin 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-qey4tpm4.js:17005-17330 placement
async function renderContextCommand(onDone, context, args) {
  let t = Jn() !== null;
  return e(PluginCommand, {
    onComplete: onDone,
    args: args,
    commands: context.options.commands,
    cloudSession: t,
    getSessionContext: () => KWn(context.messages, context.readFileState),
    getSkillStatsInputs: () => buildSkillDoctorContext(context),
    getReloadCacheImpactOptions: t
      ? void 0
      : () => ({ model: context.options.mainLoopModel, dynamicMcpConfig: context.options.dynamicMcpConfig }),
  });
}
