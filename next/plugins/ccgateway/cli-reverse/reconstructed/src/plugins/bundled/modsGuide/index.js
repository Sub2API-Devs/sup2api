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
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
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

//@ chunk-sc72x544.js:3476-3691 placement
/**
 * modsGuide 插件扫描清单。
 */
var MODS_GUIDE_MANIFEST = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
    scan: {
      hooks: ["ui.render"],
      calls: ["clock.every", "clock.now", "env.get", "settings.read", "ui.blit", "ui.resolve"],
      env: {
        reads: ["FORCE_COLOR", "NO_COLOR", "TERM"],
        writes: [],
      },
    },
    files: {},
  };
});
//@ chunk-sc72x544.js:3691-3700 placement
var indexNamespace = {};
//@ chunk-sc72x544.js:3700-3848 placement
__export(indexNamespace, {
  PLUGIN_DESCRIPTION: () => PLUGIN_DESCRIPTION,
  PLUGIN_NAME: () => PLUGIN_NAME,
  availabilityFlag: () => availabilityFlag,
  default: () => indexNamespace,
  isAvailable: () => isAvailable,
  isOnByDefault: () => isOnByDefault,
  registerPlugin: () => registerPlugin,
});
//@ chunk-sc72x544.js:19803-20600 placement
function register(on) {
  let playedUntil = new Map();
  on(
    "ui.render",
    {
      component: "AskUserQuestion",
      requestId: ENGINE_ASK_ID,
      props: {
        metadataSource: "mod_hot_reload",
      },
    },
    async (ctx, payload, next) => {
      let hostRow = await next(payload);
      if (!(payload.component === "AskUserQuestion" && isExplained(payload.props.questions))) return hostRow;
      let prefersReducedMotion = (await ctx.settings.read()).prefersReducedMotion === true;
      if (payload.surface !== "terminal")
        return remoteGuide(ctx.ui.resolve(payload), hostRow, prefersReducedMotion);
      let columns = payload.viewport?.columns ?? UNMEASURED_COLUMNS;
      let rows = payload.viewport?.rows ?? PANEL_ROWS_MIN;
      let fits = columns >= SCENE_COLUMNS + CARD_INSET && rows >= PANEL_ROWS_MIN;
      if (
        isPlainTerminal({
          noColor: await ctx.env.get("NO_COLOR"),
          forceColor: await ctx.env.get("FORCE_COLOR"),
          term: await ctx.env.get("TERM"),
        }) ||
        !fits
      )
        return hostRow;
      let isStill = prefersReducedMotion || columns < MOVING_COLUMNS_MIN;
      let requestId = payload.requestId;
      let now = await ctx.clock.now();
      if (!isStill && (playedUntil.get(requestId) ?? 0) <= now) {
        playedUntil.set(requestId, now + RUN_MS_MAX);
        playScene(
          {
            paint: async (cells) =>
              (
                await ctx.ui.blit({
                  requestId,
                  key: SCENE_KEY,
                  cells,
                })
              ).deny === undefined,
            ended: () => playedUntil.delete(requestId),
          },
          (ms, fn) => ctx.clock.every(ms, fn),
        );
      }
      return terminalGuide(ctx.ui.resolve(payload), hostRow, cellsOf(frameOf(0)));
    },
  );
}
//@ chunk-sc72x544.js:20600-20695 placement
var registerPlugin = () =>
  registerBuiltinPlugin({
    name: PLUGIN_NAME,
    description: PLUGIN_DESCRIPTION,
    isAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, clawdCookingNamespace, () => MODS_GUIDE_MANIFEST()),
  });
export { register, indexNamespace, registerPlugin };
