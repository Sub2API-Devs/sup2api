/**
 * commands/fast/index.ts
 *
 * /fast 命令对象（[on|off]，一方 API 且未禁用快速模式时可见）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/fast/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { defaultOpusLabel, isFastModeEnabled } from "../../utils/fastMode.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2083123-2083565 fingerprint (2.1.88 match: fast, 0.634)
/**
 * /fast 命令对象（local-jsx）；描述：{return`Toggle fast mode (${U4()})`}；isHidden: {return!ys()}；实现 chunk-sfatdaes.js 的 Fji。
 */
var fastCommandDefinition = {
  type: "local-jsx",
  name: "fast",
  get description() {
    return `Toggle fast mode (${defaultOpusLabel()})`;
  },
  get isHidden() {
    return !isFastModeEnabled();
  },
  argumentHint: "[on|off]",
  immediate: true,
  requires: {
    ink: true,
  },
  thinClientDispatch: "control-request",
};
var fastNonInteractiveCommand = {
  type: "local",
  name: "fast",
  supportsNonInteractive: true,
  get description() {
    return `Toggle fast mode (${defaultOpusLabel()})`;
  },
  argumentHint: "[on|off]",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var versionCommand = fastCommandDefinition;
export { versionCommand, fastNonInteractiveCommand };
