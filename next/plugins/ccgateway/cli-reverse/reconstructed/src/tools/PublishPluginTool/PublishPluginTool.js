/**
 * tools/PublishPluginTool/PublishPluginTool.ts
 *
 * 2.1.316 新增：PublishPlugin 工具：发布插件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hcckvqyb.js (2)
 * attribution: placement 2
 */
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { PUBLISH_PLUGIN_TOOL_NAME, PUBLISH_PLUGIN_DESCRIPTION, joined } from "./prompt.js";
import {
  MAX_PUBLISH_OUTPUT_LINE_CHARS,
  PUBLISH_PLUGIN_INPUT_SCHEMA,
  PUBLISH_PLUGIN_OUTPUT_SCHEMA,
  publishRefusalDenial,
  publishResultToToolOutput,
} from "./constants.js";
import { isPluginPublishAllowed } from "../../services/plugins/publish/publishGate.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hcckvqyb.js:11744-11853 placement (2.1.88 match: getErrnoPath, 1)
function getErrnoPath(error) {
  let path = typeof error === "object" && error !== null && "path" in error ? error.path : undefined;
  return typeof path === "string" ? path : "";
}
//@ chunk-hcckvqyb.js:11853-12930 placement
var PublishPluginTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hcckvqyb.js:11853", () => {
  PublishPluginTool = buildTool({
    name: PUBLISH_PLUGIN_TOOL_NAME,
    searchHint: "publish or share a plugin or mod with the team or organization library",
    shouldDefer: true,
    backgrounding: "never",
    maxResultSizeChars: MAX_PUBLISH_OUTPUT_LINE_CHARS,
    async description() {
      return PUBLISH_PLUGIN_DESCRIPTION;
    },
    async prompt() {
      return joined;
    },
    get inputSchema() {
      return PUBLISH_PLUGIN_INPUT_SCHEMA();
    },
    get outputSchema() {
      return PUBLISH_PLUGIN_OUTPUT_SCHEMA();
    },
    userFacingName() {
      return "Publish plugin";
    },
    isEnabled() {
      return isPluginPublishAllowed();
    },
    isConcurrencySafe() {
      return false;
    },
    isReadOnly() {
      return false;
    },
    requiresUserInteraction() {
      return true;
    },
    toAutoClassifierInput(input) {
      return jsonStringify(input);
    },
    getToolUseSummary() {
      return "Publish a plugin to your organization's library on claude.ai";
    },
    getPath(input) {
      return getErrnoPath(input);
    },
    renderToolUseMessage(input) {
      return input.path ?? "";
    },
    create(toolContext) {
      let context = {
        ...toolContext,
        tool: PublishPluginTool,
      };
      return {
        permissionCheckFailureDecision() {
          return publishRefusalDenial("failed");
        },
        async checkPermissions(input, callOptions) {
          let { default: permissionModule } = await import("../../commands/plugin/check.lazy.js");
          return permissionModule.check(input, callOptions, context);
        },
        async call(input, callOptions) {
          let { default: publishModule } = await import("../../services/plugins/default.lazy.js");
          return {
            data: publishResultToToolOutput(await publishModule.run(input, callOptions, context)),
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        ...(result.state === "refused" && {
          is_error: true,
        }),
        content: jsonStringify(result),
      };
    },
  });
});
export { PublishPluginTool };
