/**
 * hooks/useIdeAtMentioned.ts
 *
 * 订阅 IDE 发来的 at_mentioned 通知（IDE 中选中文件插入 @ 引用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeAtMentioned.ts
 * pieces: chunk-tzghj6zv.js (4), chunk-z1n5m6nf.js (1)
 * attribution: fingerprint 2, placement 3
 */
import path from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import {
  useMemo,
  useRef,
  useEffect,
  init_react_production,
} from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { getCwd } from "../utils/cwd.js";
import { identityId2 } from "../types/ids.js";
import { ElicitationCompleteNotificationSchema } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tzghj6zv.js:5035-5158 fingerprint (2.1.88 match: AtMentionedSchema, 0.599)
var AT_MENTIONED; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var IdeAtMentionedParamsSchema;
deferInit("chunk-tzghj6zv.js:5035", () => {
  AT_MENTIONED = "at_mentioned";
  IdeAtMentionedParamsSchema = DoctorLazy(() =>
    objectSchema({
      method: literal(AT_MENTIONED),
      params: objectSchema({
        filePath: stringSchema(),
        lineStart: numberSchema().optional(),
        lineEnd: numberSchema().optional(),
      }),
    }),
  );
});
//@ chunk-tzghj6zv.js:5158-5522 placement
/**
 * 订阅 IDE 扩展的 at_mentioned 通知：把选中文件路径与行号（转成 1 起始）回调给输入框，并记 ide_at_mention 成功埋点；IDE 客户端变化时旧订阅失效。
 */
function useIdeAtMentioned(mcpClients, onMentioned) {
  let ideClient = useMemo(() => hasAccessToIDEExtensionDiffFeature(mcpClients), [mcpClients]);
  let ideClientRef = useRef(undefined);
  useEffect(() => {
    ideClientRef.current = ideClient;
    if (!ideClient) return;
    onMcpNotification(ideClient, IdeAtMentionedParamsSchema(), (notification) => {
      if (ideClientRef.current !== ideClient) return;
      try {
        let params = notification.params;
        let lineStart = params.lineStart !== undefined ? params.lineStart + 1 : undefined;
        let lineEnd = params.lineEnd !== undefined ? params.lineEnd + 1 : undefined;
        onMentioned({
          filePath: params.filePath,
          lineStart,
          lineEnd,
        });
        logFeatureOk("ide_at_mention");
      } catch (error) {
        logError(error);
        logFeatureBad("ide_at_mention", "ide_at_mention_failed");
      }
    });
  }, [ideClient, onMentioned]);
}
//@ chunk-tzghj6zv.js:5522-5756 placement
/**
 * 把 IDE 选中的位置格式化为 @相对路径#L行号 引用（前一字符非空白时补空格）。
 */
function formatAtMention(mention, trailingText) {
  let relativePath = path.relative(getCwd(), mention.filePath);
  let mentionText;
  if (mention.lineStart && mention.lineEnd)
    mentionText =
      mention.lineStart === mention.lineEnd
        ? `@${relativePath}#L${mention.lineStart} `
        : `@${relativePath}#L${mention.lineStart}-${mention.lineEnd} `;
  else mentionText = `@${relativePath} `;
  if (trailingText !== undefined && !/\s/.test(trailingText)) mentionText = ` ${mentionText}`;
  return mentionText;
}
//@ chunk-tzghj6zv.js:5756-5760 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:5756", () => {
  init_react_production();
});
//@ chunk-z1n5m6nf.js:88103-88192 fingerprint (2.1.88 match: useIdeAtMentioned, 0.56)
function useIdeAtMentioned_2(mcpClients, onAtMentioned) {
  identityId2(mcpClients.client).setNotificationHandler(
    ElicitationCompleteNotificationSchema,
    (notification) => onAtMentioned(notification.params.elicitationId),
  );
}
export { formatAtMention, useIdeAtMentioned, useIdeAtMentioned_2 };
