/**
 * bridge/sessionTags.ts
 *
 * 2.1.316 新增：桥接会话标签。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pg55apw2.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-pg55apw2.js:261-320 placement
async function $Je(n, e) {
  return (await fetchBridgeSessionTags(n, e))?.tags ?? null;
}
/**
 * 读取桥接会话的 tags 与 created_at（v2 接口，可选 access token）；失败记 debug 日志并返回 null。
 */
//@ chunk-pg55apw2.js:320-839 placement
async function fetchBridgeSessionTags(sessionId, options) {
  try {
    let s = options.getAccessToken ? await options.getAccessToken() : void 0,
      { getBridgeSessionOrStatus: getBridgeSessionOrStatus } = await import("./chunk-3eyvtwsv.js"),
      { session: session } = await getBridgeSessionOrStatus(sessionId, {
        baseUrl: options.baseUrl,
        ...(s && { getAccessToken: () => s }),
        credentials: options.credentials,
        useV2: !0,
      });
    if (!session || !Array.isArray(session.tags)) return null;
    let a = typeof session.created_at === "string" ? Date.parse(session.created_at) : Number.NaN;
    return { tags: session.tags, createdAtMs: Number.isNaN(a) ? void 0 : a };
  } catch (error) {
    return (
      logForDebugging(`[bridge:session] session tag read failed: ${errorMessage(error)}`, { level: "warn" }),
      null
    );
  }
}

export { $Je, fetchBridgeSessionTags };
