/**
 * commands/context/index.ts
 *
 * /context 命令对象（交互版彩色网格、无头版文本）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/context/index.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:1770308-1770332 affinity
/**
 * isContextGridDisabled：构建期常量 false。
 */
function isContextCommandForceHidden() {
  return false;
}
//@ chunk-5xgkngpb.js:1770332-1770717 fingerprint (2.1.88 match: contextNonInteractive, 0.582)
/**
 * /context 命令对象（local-jsx）；描述：Visualize current context usage as a colored grid；isEnabled: ()=>!_e()&&!aen()；实现 chunk-10q8r8ck.js 的 Yn。
 */
var contextCommandDefinition = {
  name: "context",
  description: "Visualize current context usage as a colored grid",
  argumentHint: "[all]",
  isEnabled: () => !getIsNonInteractiveSession() && !isContextCommandForceHidden(),
  type: "local-jsx",
  thinClientDispatch: "control-request",
};
var contextNonInteractiveCommand = {
  type: "local",
  name: "context",
  supportsNonInteractive: true,
  description: "Show current context usage",
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  isEnabled() {
    return getIsNonInteractiveSession();
  },
  load: () => import("./context-noninteractive.js"),
};
export { contextCommandDefinition, contextNonInteractiveCommand };
