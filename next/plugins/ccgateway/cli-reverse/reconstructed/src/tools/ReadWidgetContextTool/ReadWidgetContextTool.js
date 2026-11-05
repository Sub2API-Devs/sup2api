/**
 * tools/ReadWidgetContextTool/ReadWidgetContextTool.ts
 *
 * ReadWidgetContext 工具定义：读取 MCP App 视图共享的状态（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3), chunk-fmnbrxwy.js (1)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  zodStrictObject,
  array,
  union,
  literal,
  _enum,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { READ_WIDGET_TOOL_NAME, READ_WIDGET_TOOL_LABEL, READ_WIDGET_TOOL_DESCRIPTION } from "./prompt.js";
import { ccrWebSearchResult } from "../WebSearchTool/UI.js";
import { shouldSendWidgetStates } from "../../utils/widgetContext.js";
import { sessionRootStatesSlot, widgetStateKey } from "./widgetState.js";
import { readViewsForModel } from "./resultText.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:128174-128203 placement
var viewOnlySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:128174", () => {
  viewOnlySchema = DoctorLazy(() =>
    objectSchema({
      view: stringSchema(),
    }),
  );
});
//@ chunk-5xgkngpb.js:128203-128276 placement
function positiveIntOrZero(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}
//@ chunk-5xgkngpb.js:128276-128413 placement
function normalizeViewList(list) {
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    let parsed = viewOnlySchema().safeParse(entry);
    return parsed.success
      ? [
          {
            view: parsed.data.view,
          },
        ]
      : [];
  });
}
//@ chunk-fmnbrxwy.js:13333-14534 placement
/**
 * ReadWidgetContext 的输入 schema：可选的 view 参数，说明省略即读全部持有视图。
 */
var ReadWidgetContextInput; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var widgetContextOutputSchema;
var readWidgetContextTool;
deferInit("chunk-fmnbrxwy.js:13333", () => {
  ReadWidgetContextInput = DoctorLazy(() =>
    zodStrictObject({
      view: stringSchema()
        .optional()
        .describe(
          "A view id as a reminder named it, to read only that view; omit it to read every held view.",
        ),
    }),
  );
  widgetContextOutputSchema = DoctorLazy(() =>
    objectSchema({
      blocks: array(
        union([
          objectSchema({
            type: literal("text"),
            text: stringSchema(),
          }),
          objectSchema({
            type: literal("image"),
            source: objectSchema({
              type: literal("base64"),
              media_type: _enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
              data: stringSchema(),
            }),
          }),
        ]),
      ).describe("The views' shared text and images, or a note."),
      isError: booleanSchema(),
    }),
  );
  readWidgetContextTool = buildTool({
    name: READ_WIDGET_TOOL_NAME,
    searchHint: "read the state an MCP App view shared",
    backgrounding: "never",
    maxResultSizeChars: ccrWebSearchResult,
    skipAggregateToolResultBudget: true,
    get inputSchema() {
      return ReadWidgetContextInput();
    },
    get outputSchema() {
      return widgetContextOutputSchema();
    },
    isEnabled: shouldSendWidgetStates,
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    async description() {
      return READ_WIDGET_TOOL_LABEL;
    },
    async prompt() {
      return READ_WIDGET_TOOL_DESCRIPTION;
    },
    toAutoClassifierInput(widget) {
      return `read widget context${widget.view ? ` ${widget.view}` : ""}`;
    },
    create({ session: args, mainLoopModel }) {
      return {
        async call(callArgs) {
          let ctx = sessionRootStatesSlot.peek(args);
          return {
            data: await readViewsForModel(ctx?.states, {
              imageLimits: imageLimitsForModel(mainLoopModel()),
              view: callArgs.view,
              changedAt: (id) => ctx?.changedAt.get(widgetStateKey(id)) ?? 0,
            }),
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(data, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: data.blocks,
        ...(data.isError && {
          is_error: true,
        }),
      };
    },
    renderToolUseMessage(data) {
      return data.view ?? "";
    },
    extractSearchText() {
      return "";
    },
  });
});
export { normalizeViewList, positiveIntOrZero, readWidgetContextTool };
