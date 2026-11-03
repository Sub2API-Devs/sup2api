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
import { u, literal, string, E } from "../../vendor/zod/v4/classic/schemas.js";
import { Q, R, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";
import { getCwd } from "../utils/cwd.js";
import { identityId2 } from "../types/ids.js";
import { ElicitationCompleteNotificationSchema } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

//@ chunk-tzghj6zv.js:5035-5158 fingerprint = AtMentionedSchema (0.599)
var AT_MENTIONED = "at_mentioned";
var IdeAtMentionedParamsSchema = DoctorLazy(() =>
  u({
    method: literal(AT_MENTIONED),
    params: u({
      filePath: string(),
      lineStart: E().optional(),
      lineEnd: E().optional(),
    }),
  }),
);
//@ chunk-tzghj6zv.js:5158-5522 placement
/**
 * 订阅 IDE 扩展的 at_mentioned 通知：把选中文件路径与行号（转成 1 起始）回调给输入框，并记 ide_at_mention 成功埋点；IDE 客户端变化时旧订阅失效。
 */
function useIdeAtMentioned(d, h) {
  let x = Q(() => hasAccessToIDEExtensionDiffFeature(d), [d]);
  let C = R(undefined);
  P(() => {
    C.current = x;
    if (!x) return;
    onMcpNotification(x, IdeAtMentionedParamsSchema(), (A) => {
      if (C.current !== x) return;
      try {
        let params = A.params;
        let lineStart = params.lineStart !== undefined ? params.lineStart + 1 : undefined;
        let lineEnd = params.lineEnd !== undefined ? params.lineEnd + 1 : undefined;
        h({
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
  }, [x, h]);
}
//@ chunk-tzghj6zv.js:5522-5756 placement
/**
 * 把 IDE 选中的位置格式化为 @相对路径#L行号 引用（前一字符非空白时补空格）。
 */
function formatAtMention(d, h) {
  let relativePath = path.relative(getCwd(), d.filePath);
  let C;
  if (d.lineStart && d.lineEnd)
    C =
      d.lineStart === d.lineEnd
        ? `@${relativePath}#L${d.lineStart} `
        : `@${relativePath}#L${d.lineStart}-${d.lineEnd} `;
  else C = `@${relativePath} `;
  if (h !== undefined && !/\s/.test(h)) C = ` ${C}`;
  return C;
}
//@ chunk-tzghj6zv.js:5756-5760 placement
init_react_production();
//@ chunk-z1n5m6nf.js:88103-88192 fingerprint = useIdeAtMentioned (0.56)
function useIdeAtMentioned_2(mcpClients, onAtMentioned) {
  identityId2(mcpClients.client).setNotificationHandler(
    ElicitationCompleteNotificationSchema,
    (notification) => onAtMentioned(notification.params.elicitationId),
  );
}
export { formatAtMention, useIdeAtMentioned };
