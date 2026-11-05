/**
 * commands/advisor/advisor.ts
 *
 * 2.1.316 新增：/advisor 命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hmmw5k0q.js (1)
 * attribution: placement 1
 */
import { isAdvisorToolEnabled, getValidAdvisorAliases, setAdvisorModelCommand } from "../../utils/advisor.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { renderDefaultModelSetting } from "../../utils/model/modelDisplay.js";
import { isBridgeOrVerifiedSlackTurn } from "../../utils/promptSubmissionOrigin.js";

//@ chunk-hmmw5k0q.js:5619-6086 placement
/**
 * /advisor 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function advisorCommand(args, context) {
  if (!isAdvisorToolEnabled())
    return {
      type: "text",
      value: "The advisor is not available",
    };
  let usage = `Usage: /advisor <${[...getValidAdvisorAliases(), "off"].join("|")}>`;
  let lower = args.trim().toLowerCase();
  if (!lower || COMMON_INFO_ARGS_ALIAS.includes(lower) || COMMON_HELP_ARGS.includes(lower)) {
    let advisorSetting = context.getAdvisorSetting();
    return {
      type: "text",
      value: `${advisorSetting ? `Advisor: ${stripAnsi(renderDefaultModelSetting(advisorSetting))}` : "Advisor: off"}
${usage}`,
    };
  }
  let blocked = !isBridgeOrVerifiedSlackTurn(context);
  return {
    type: "text",
    value: setAdvisorModelCommand(
      lower === "unset" ? "off" : lower,
      context.options.mainLoopModel,
      context.setAppState,
      context.storageV5,
      blocked,
      true,
      context.getMessages?.() ?? context.messages ?? [],
    ),
  };
}
export { advisorCommand };
