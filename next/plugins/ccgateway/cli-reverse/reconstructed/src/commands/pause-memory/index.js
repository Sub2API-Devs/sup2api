/**
 * commands/pause-memory/index.ts
 *
 * 2.1.316 新增：/pause-memory 命令对象：暂停自动记忆
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteSdkOrRemoteMode } from "../../utils/fullscreen.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

//@ chunk-5xgkngpb.js:1771171-1771630 placement
/**
 * /pause-memory 命令对象（local）；描述：{if(g_n())return"Pause automemory for this session";return"Pause account memory and local auto-memory for this session (run again to turn bo；别名 ["memory-pause","toggle-memory"]；isEnabled: ()=>!1；isHidden: {return!g_n()&&Oe(i.IS_DEMO)}；实现 chunk-8dz40wpq.js 的 q。
 */
var pauseMemoryCommandDefinition = {
  type: "local",
  name: "pause-memory",
  aliases: ["memory-pause", "toggle-memory"],
  get description() {
    if (isRemoteSdkOrRemoteMode()) return "Pause automemory for this session";
    return "Pause account memory and local auto-memory for this session (run again to turn both back on)";
  },
  isEnabled: () => false,
  get isHidden() {
    return !isRemoteSdkOrRemoteMode() && isEnvTruthy(env.IS_DEMO);
  },
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  load: () => import("./call.lazy.js"),
  userFacingName() {
    return "pause-memory";
  },
};
var pauseMemoryCommand = pauseMemoryCommandDefinition;
export { pauseMemoryCommand };
