/**
 * commands/brief.ts
 *
 * /brief 命令：切换仅摘要输出模式，配置来自 tengu_kairos_brief_config
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/brief.ts
 * pieces: chunk-gv7qjj2t.js (3)
 * attribution: fingerprint 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isBriefEntitled } from "../tools/BriefTool/BriefTool.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { setUserMsgOptIn } from "../bootstrap/state.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";

//@ chunk-gv7qjj2t.js:3446-3517 fingerprint (2.1.88 match: DEFAULT_BRIEF_CONFIG, 1)
/**
 * DEFAULT_BRIEF_CONFIG：同旧版。
 */
var BRIEF_CONFIG_SCHEMA = DoctorLazy(() =>
  objectSchema({
    enable_slash_command: booleanSchema(),
  }),
);
var DEFAULT_BRIEF_CONFIG = {
  enable_slash_command: false,
};
//@ chunk-gv7qjj2t.js:3517-3614 fingerprint (2.1.88 match: getBriefConfig, 1)
function getBriefConfig() {
  let raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief_config", DEFAULT_BRIEF_CONFIG);
  let parsed = BRIEF_CONFIG_SCHEMA().safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_BRIEF_CONFIG;
}
//@ chunk-gv7qjj2t.js:3614-4541 fingerprint (2.1.88 match: brief, 0.95)
/**
 * /brief 命令对象（local-jsx）；描述：Toggle brief-only mode；isEnabled: ()=>i().enable_slash_command。
 */
var briefCommandDefinition = {
  type: "local-jsx",
  name: "brief",
  description: "Toggle brief-only mode",
  isEnabled: () => getBriefConfig().enable_slash_command,
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(onDone, context) {
        let newState = !context.getAppState().isBriefOnly;
        if (newState && !isBriefEntitled()) {
          logEvent("tengu_brief_mode_toggled", {
            enabled: false,
            gated: true,
            source: lit("slash_command"),
          });
          onDone("Brief tool is not enabled for your account", {
            display: "system",
          });
          return null;
        }
        setUserMsgOptIn(newState);
        context.onQueryEvent?.({
          type: "apply_flag_settings",
          settings: {
            isBriefOnly: newState,
          },
        });
        logEvent("tengu_brief_mode_toggled", {
          enabled: newState,
          gated: false,
          source: lit("slash_command"),
        });
        let metaMessages = [
          `<system-reminder>
${newState ? `Brief mode is now enabled. Use the ${BRIEF_TOOL_NAME} tool for all user-facing output \u2014 plain text outside it is hidden from the user's view.` : `Brief mode is now disabled. The ${BRIEF_TOOL_NAME} tool is no longer available \u2014 reply with plain text.`}
</system-reminder>`,
        ];
        onDone(newState ? "Brief-only mode enabled" : "Brief-only mode disabled", {
          display: "system",
          metaMessages,
        });
        return null;
      },
    }),
};
var briefCommand = briefCommandDefinition;
export { briefCommand };
