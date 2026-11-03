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
import { u, M } from "../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isBriefEntitled } from "../tools/BriefTool/BriefTool.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { setUserMsgOptIn } from "../bootstrap/state.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";

/**
 * DEFAULT_BRIEF_CONFIG：同旧版。
 */
//@ chunk-gv7qjj2t.js:3446-3517 fingerprint = DEFAULT_BRIEF_CONFIG (1)
var BRIEF_CONFIG_SCHEMA = DoctorLazy(() => u({ enable_slash_command: M() })),
  DEFAULT_BRIEF_CONFIG = { enable_slash_command: !1 };
//@ chunk-gv7qjj2t.js:3517-3614 fingerprint = getBriefConfig (1)
function getBriefConfig() {
  let raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief_config", DEFAULT_BRIEF_CONFIG),
    parsed = BRIEF_CONFIG_SCHEMA().safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_BRIEF_CONFIG;
}
/**
 * /brief 命令对象（local-jsx）；描述：Toggle brief-only mode；isEnabled: ()=>i().enable_slash_command。
 */
//@ chunk-gv7qjj2t.js:3614-4541 fingerprint = brief (0.95)
var briefCommandDefinition = {
    type: "local-jsx",
    name: "brief",
    description: "Toggle brief-only mode",
    isEnabled: () => getBriefConfig().enable_slash_command,
    immediate: !0,
    load: () =>
      Promise.resolve({
        async call(o, t) {
          let e = !t.getAppState().isBriefOnly;
          if (e && !isBriefEntitled())
            return (
              logEvent("tengu_brief_mode_toggled", { enabled: !1, gated: !0, source: lit("slash_command") }),
              o("Brief tool is not enabled for your account", { display: "system" }),
              null
            );
          (setUserMsgOptIn(e),
            t.onQueryEvent?.({ type: "apply_flag_settings", settings: { isBriefOnly: e } }),
            logEvent("tengu_brief_mode_toggled", { enabled: e, gated: !1, source: lit("slash_command") }));
          let s = [
            `<system-reminder>
${e ? `Brief mode is now enabled. Use the ${BRIEF_TOOL_NAME} tool for all user-facing output \u2014 plain text outside it is hidden from the user's view.` : `Brief mode is now disabled. The ${BRIEF_TOOL_NAME} tool is no longer available \u2014 reply with plain text.`}
</system-reminder>`,
          ];
          return (
            o(e ? "Brief-only mode enabled" : "Brief-only mode disabled", {
              display: "system",
              metaMessages: s,
            }),
            null
          );
        },
      }),
  },
  briefCommand = briefCommandDefinition;
