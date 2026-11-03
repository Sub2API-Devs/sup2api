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
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { applyPromptEdit } from "../../plugins/functionHooks/sessionEvents.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { JB } from "../../plugins/functionHooks/ui/renderInstances.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-18hwfzwa.js:865011-865048 placement
var freeze_4 = Object.freeze({ kind: "undo" });
//@ chunk-18hwfzwa.js:865048-865052 placement
j();
//@ chunk-18hwfzwa.js:865052-865312 placement
function relayPromptEdits(h) {
  let [x] = y(() => applyPromptEdit(h)),
    D = useStoreSelector(JB(), () => hasModuleHookingSite("prompt.edit"));
  return (
    P(() => {
      (x.setHooked(D),
        logForDebugging(
          D
            ? "prompt.edit: hooked; the composer relays its edits to the chain"
            : "prompt.edit: unhooked; the composer relays nothing",
        ));
    }, [x, D]),
    P(() => () => x.dispose(), [x]),
    x
  );
}
//@ chunk-18hwfzwa.js:865312-865316 placement
j();

export { relayPromptEdits, freeze_4 };
