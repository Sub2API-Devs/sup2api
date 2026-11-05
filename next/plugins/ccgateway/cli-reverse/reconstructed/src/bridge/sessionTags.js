/**
 * bridge/sessionTags.ts
 *
 * 2.1.316 新增：桥接会话标签。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rxz88nw9.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-rxz88nw9.js:261-320 placement
/**
 * 读取桥接会话的 tags（v2 接口，可选 access token）；失败只记 debug 日志并返回 null。
 */
async function readBridgeSessionTags(sessionId, options) {
  return (await fetchBridgeSessionTags(sessionId, options))?.tags ?? null;
}
//@ chunk-rxz88nw9.js:320-839 placement
/**
 * 读取桥接会话的 tags 与 created_at（v2 接口，可选 access token）；失败记 debug 日志并返回 null。
 */
async function fetchBridgeSessionTags(sessionId, options) {
  try {
    let accessToken = options.getAccessToken ? await options.getAccessToken() : undefined;
    let { getBridgeSessionOrStatus } = await import("./createSession.js");
    let { session } = await getBridgeSessionOrStatus(sessionId, {
      baseUrl: options.baseUrl,
      ...(accessToken && {
        getAccessToken: () => accessToken,
      }),
      credentials: options.credentials,
      useV2: true,
    });
    if (!session || !Array.isArray(session.tags)) return null;
    let createdAtMs = typeof session.created_at === "string" ? Date.parse(session.created_at) : Number.NaN;
    return {
      tags: session.tags,
      createdAtMs: Number.isNaN(createdAtMs) ? undefined : createdAtMs,
    };
  } catch (error) {
    logForDebugging(`[bridge:session] session tag read failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return null;
  }
}
export { readBridgeSessionTags, fetchBridgeSessionTags };
