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
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PluginCommand } from "../plugin/PluginSettings.js";
import { pluginRelevanceInputs } from "../../utils/plugins/pluginRelevance.js";
import { buildSkillDoctorContext } from "../skill-doctor/skillDoctor.js";

//@ chunk-qey4tpm4.js:17005-17330 placement
/**
 * /plugin 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function renderContextCommand(onDone, context, args) {
  let isRemote = getRemoteCaps() !== null;
  return jsxProd_default(PluginCommand, {
    onComplete: onDone,
    args,
    commands: context.options.commands,
    cloudSession: isRemote,
    getSessionContext: () => pluginRelevanceInputs(context.messages, context.readFileState),
    getSkillStatsInputs: () => buildSkillDoctorContext(context),
    getReloadCacheImpactOptions: isRemote
      ? undefined
      : () => ({
          model: context.options.mainLoopModel,
          dynamicMcpConfig: context.options.dynamicMcpConfig,
        }),
  });
}
export { renderContextCommand };
