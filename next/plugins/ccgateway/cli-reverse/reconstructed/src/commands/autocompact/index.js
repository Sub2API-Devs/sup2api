/**
 * commands/autocompact/index.ts
 *
 * 2.1.316 新增：/autocompact 命令对象：查看与调整自动压缩窗口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession, getIsRemoteMode } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:1768606-1769156 placement
/**
 * /autocompact 命令对象（local-jsx）；描述：Set how full the context gets before auto-summarizing；isEnabled: ()=>!_e()；isHidden: false；实现 chunk-qqj12s77.js 的 vo。
 */
var autocompactCommand = {
  type: "local-jsx",
  name: "autocompact",
  description: "Set how full the context gets before auto-summarizing",
  immediate: true,
  isEnabled: () => !getIsNonInteractiveSession(),
  isHidden: false,
  argumentHint: "[auto|<tokens>]",
  userFacingName() {
    return "autocompact";
  },
};
var autocompactNonInteractiveCommand = {
  type: "local",
  name: "autocompact",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  description: "Configure the auto-compact window size",
  get isHidden() {
    return !getIsNonInteractiveSession() && !getIsRemoteMode();
  },
  isEnabled() {
    return getIsNonInteractiveSession() || getIsRemoteMode();
  },
  argumentHint: "[auto|<tokens>]",
  load: () => import("./autocompact.js"),
  userFacingName() {
    return "autocompact";
  },
};
export { autocompactCommand, autocompactNonInteractiveCommand };
