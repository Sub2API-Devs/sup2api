/**
 * components/pluginUi/promptEditHook.ts
 *
 * 2.1.316 新增。prompt.edit 插件钩子桥接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 4
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { applyPromptEdit } from "../../plugins/functionHooks/sessionEvents.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { renderVersions } from "../../plugins/functionHooks/ui/renderInstances.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:884823-884827 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:884823", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:891748-891752 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:891748", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:897895-897932 placement
var undoPromptOrigin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:897895", () => {
  undoPromptOrigin = Object.freeze({
    kind: "undo",
  });
});
//@ chunk-czq1j3j2.js:897936-898196 placement
function relayPromptEdits(composer) {
  let [relay] = useState(() => applyPromptEdit(composer));
  let isHooked = useStoreSelector(renderVersions(), () => hasModuleHookingSite("prompt.edit"));
  useEffect(() => {
    relay.setHooked(isHooked);
    logForDebugging(
      isHooked
        ? "prompt.edit: hooked; the composer relays its edits to the chain"
        : "prompt.edit: unhooked; the composer relays nothing",
    );
  }, [relay, isHooked]);
  useEffect(() => () => relay.dispose(), [relay]);
  return relay;
}
export { relayPromptEdits, undoPromptOrigin };
