/**
 * commands/config/configArgs.ts
 *
 * 2.1.316 新增：/config set 参数形式的处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sen07jqs.js (1)
 * attribution: placement 1
 */
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS_ALIAS } from "../../constants/xml.js";
import {
  listConfigKeys,
  parseConfigShorthand,
  applyConfigShorthand,
  collapseShorthandResultOffBox,
} from "./configShorthand.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

//@ chunk-sen07jqs.js:13988-14375 placement
/**
 * /config 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runConfigSetCommand(args, context) {
  let text = args.trim();
  let lower = text.toLowerCase();
  if (!lower || COMMON_HELP_ARGS.includes(lower) || COMMON_INFO_ARGS_ALIAS.includes(lower))
    return {
      type: "text",
      value: `Usage: /config key=value [key=value ...]
${listConfigKeys(context)}`,
    };
  let settings = parseConfigShorthand(text);
  if (!settings)
    return {
      type: "text",
      value: `Expected key=value, got "${sanitizeTelemetryString(text)}". Run /config to see what's available.`,
    };
  let results = await applyConfigShorthand(settings, context);
  let offBox = isBridgeOrTransport(context.session);
  return {
    type: "text",
    value: results.map((result) => collapseShorthandResultOffBox(result, offBox)).join(`
`),
  };
}
export { runConfigSetCommand };
