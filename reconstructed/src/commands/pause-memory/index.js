/**
 * commands/pause-memory/index.ts
 *
 * 2.1.316 新增：/pause-memory 命令对象：暂停自动记忆
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { g_n } from "../../utils/fullscreen.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

/**
 * /pause-memory 命令对象（local）；描述：{if(g_n())return"Pause automemory for this session";return"Pause account memory and local auto-memory for this session (run again to turn bo；别名 ["memory-pause","toggle-memory"]；isEnabled: ()=>!1；isHidden: {return!g_n()&&Oe(i.IS_DEMO)}；实现 chunk-8dz40wpq.js 的 q。
 */
//@ chunk-e6aww6q8.js:1695801-1696260 placement
var pauseMemoryCommandDefinition = {
    type: "local",
    name: "pause-memory",
    aliases: ["memory-pause", "toggle-memory"],
    get description() {
      if (g_n()) return "Pause automemory for this session";
      return "Pause account memory and local auto-memory for this session (run again to turn both back on)";
    },
    isEnabled: () => !1,
    get isHidden() {
      return !g_n() && isEnvTruthy(env.IS_DEMO);
    },
    supportsNonInteractive: !0,
    thinClientDispatch: "post-text",
    load: () => import("./chunk-8dz40wpq.js"),
    userFacingName() {
      return "pause-memory";
    },
  },
  pauseMemoryCommand = pauseMemoryCommandDefinition;

export { pauseMemoryCommand };
