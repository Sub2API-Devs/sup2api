/**
 * plugins/bundled/modsGuide/index.ts
 *
 * 2.1.316 新增。内置插件 modsGuide 注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sc72x544.js (5)
 * attribution: placement 5
 */
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import {
  PLUGIN_DESCRIPTION,
  PLUGIN_NAME,
  availabilityFlag,
  isAvailable,
  isOnByDefault,
  ENGINE_ASK_ID,
  isExplained,
  remoteGuide,
  UNMEASURED_COLUMNS,
  PANEL_ROWS_MIN,
  SCENE_COLUMNS,
  CARD_INSET,
  isPlainTerminal,
  MOVING_COLUMNS_MIN,
  RUN_MS_MAX,
  playScene,
  SCENE_KEY,
  terminalGuide,
  cellsOf,
  frameOf,
  clawdCookingNamespace,
} from "./clawdCooking.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";

/**
 * modsGuide 插件扫描清单。
 */
//@ chunk-sc72x544.js:3476-3691 placement
var MODS_GUIDE_MANIFEST = x(function (ai, kt) {
  kt.exports = {
    scan: {
      hooks: ["ui.render"],
      calls: ["clock.every", "clock.now", "env.get", "settings.read", "ui.blit", "ui.resolve"],
      env: { reads: ["FORCE_COLOR", "NO_COLOR", "TERM"], writes: [] },
    },
    files: {},
  };
});
//@ chunk-sc72x544.js:3691-3700 placement
var indexNamespace = {};
//@ chunk-sc72x544.js:3700-3848 placement
Ar(indexNamespace, {
  PLUGIN_DESCRIPTION: () => PLUGIN_DESCRIPTION,
  PLUGIN_NAME: () => PLUGIN_NAME,
  availabilityFlag: () => availabilityFlag,
  default: () => indexNamespace,
  isAvailable: () => isAvailable,
  isOnByDefault: () => isOnByDefault,
  registerPlugin: () => registerPlugin,
});
//@ chunk-sc72x544.js:19803-20600 placement
function register(i) {
  let r = new Map();
  i(
    "ui.render",
    { component: "AskUserQuestion", requestId: ENGINE_ASK_ID, props: { metadataSource: "mod_hot_reload" } },
    async (t, e, f) => {
      let o = await f(e);
      if (!(e.component === "AskUserQuestion" && isExplained(e.props.questions))) return o;
      let l = (await t.settings.read()).prefersReducedMotion === !0;
      if (e.surface !== "terminal") return remoteGuide(t.ui.resolve(e), o, l);
      let a = e.viewport?.columns ?? UNMEASURED_COLUMNS,
        p = e.viewport?.rows ?? PANEL_ROWS_MIN,
        c = a >= SCENE_COLUMNS + CARD_INSET && p >= PANEL_ROWS_MIN;
      if (
        isPlainTerminal({
          noColor: await t.env.get("NO_COLOR"),
          forceColor: await t.env.get("FORCE_COLOR"),
          term: await t.env.get("TERM"),
        }) ||
        !c
      )
        return o;
      let S = l || a < MOVING_COLUMNS_MIN,
        requestId = e.requestId,
        now = await t.clock.now();
      if (!S && (r.get(requestId) ?? 0) <= now)
        (r.set(requestId, now + RUN_MS_MAX),
          playScene(
            {
              paint: async (v) =>
                (await t.ui.blit({ requestId: requestId, key: SCENE_KEY, cells: v })).deny === void 0,
              ended: () => r.delete(requestId),
            },
            (v, It) => t.clock.every(v, It),
          ));
      return terminalGuide(t.ui.resolve(e), o, cellsOf(frameOf(0)));
    },
  );
}
//@ chunk-sc72x544.js:20600-20695 placement
var registerPlugin = () =>
  registerBuiltinPlugin({
    name: PLUGIN_NAME,
    description: PLUGIN_DESCRIPTION,
    isAvailable: isAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, clawdCookingNamespace, () => MODS_GUIDE_MANIFEST()),
  });

export { register };
