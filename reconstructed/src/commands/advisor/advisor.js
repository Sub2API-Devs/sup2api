/**
 * commands/advisor/advisor.ts
 *
 * 2.1.316 新增：/advisor 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vhac946c.js (1)
 * attribution: placement 1
 */
import { isAdvisorToolEnabled, getValidAdvisorAliases, setAdvisorModelCommand } from "../../utils/advisor.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { Yn } from "../../utils/stripAnsi.js";
import { renderDefaultModelSetting } from "../../utils/model/modelDisplay.js";
import { _N } from "../../utils/promptSubmissionOrigin.js";

/**
 * /advisor 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-vhac946c.js:5114-5580 placement
async function advisorCommand(args, context) {
  if (!isAdvisorToolEnabled()) return { type: "text", value: "The advisor is not available" };
  let r = `Usage: /advisor <${[...getValidAdvisorAliases(), "off"].join("|")}>`,
    lower = args.trim().toLowerCase();
  if (!lower || COMMON_INFO_ARGS_ALIAS.includes(lower) || COMMON_HELP_ARGS.includes(lower)) {
    let advisorSetting = context.getAdvisorSetting();
    return {
      type: "text",
      value: `${advisorSetting ? `Advisor: ${Yn(renderDefaultModelSetting(advisorSetting))}` : "Advisor: off"}
${r}`,
    };
  }
  let a = !_N(context);
  return {
    type: "text",
    value: setAdvisorModelCommand(
      lower === "unset" ? "off" : lower,
      context.options.mainLoopModel,
      context.setAppState,
      context.storageV5,
      a,
      !0,
      context.getMessages?.() ?? context.messages ?? [],
    ),
  };
}
