/**
 * components/pluginUi/promptEditHook.ts
 *
 * 2.1.316 新增。prompt.edit 插件钩子桥接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { applyPromptEdit } from "../../plugins/functionHooks/sessionEvents.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { renderVersions } from "../../plugins/functionHooks/ui/renderInstances.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:865011-865048 placement
var undoPromptOrigin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:865011", () => {
  undoPromptOrigin = Object.freeze({
    kind: "undo",
  });
});
//@ chunk-18hwfzwa.js:865048-865052 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:865048", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:865052-865312 placement
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
//@ chunk-18hwfzwa.js:865312-865316 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:865312", () => {
  init_react_production();
});
export { relayPromptEdits, undoPromptOrigin };
