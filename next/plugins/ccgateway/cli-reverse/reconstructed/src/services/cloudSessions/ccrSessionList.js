/**
 * services/cloudSessions/ccrSessionList.ts
 *
 * 2.1.316 新增。分页遍历 /v1/code/sessions 云会话列表，过滤已归档、桥接与内部占位会话，超出页数预算时标注截断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pzf4a1kg.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAPIProvider } from "../../utils/model/providers.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-pzf4a1kg.js:262-317 placement
/**
 * 会话列表最多翻多少页（10），超出标记截断。
 */
var MAX_LIST_PAGES = 10;
var CCR_LIST_TARGET_VISIBLE = 50;
var CCR_SESSION_ID_RE = /^(?:session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-pzf4a1kg.js:317-381 placement
/**
 * 判断会话标题是否可展示（非空且不是内部占位标题）。
 */
function hasDisplayTitle(session) {
  let title = (session.title ?? "").trim();
  return title !== "" && !isInternalHuskTitle(title);
}
//@ chunk-pzf4a1kg.js:381-476 placement
function isInternalHuskTitle(title) {
  return title.includes("__CBU_POOLED__") || title === "__warming__" || title.startsWith("ditto:");
}
//@ chunk-pzf4a1kg.js:476-2254 placement
/**
 * 分页遍历 /v1/code/sessions 云会话列表，过滤已归档、桥接与内部占位会话，超出页数预算时标注截断。
 */
async function walkCcrSessionList(options) {
  if (getAPIProvider() !== "firstParty") return [];
  try {
    await import("./chunk-p4cn1jqa.lazy.js");
    let { axiosGetWithRetry, prepareApiRequest, getOAuthRequestHeaders } =
      await import("../../utils/teleport/api.js");
    let { getOauthConfig } = await import("../../constants/oauth.js");
    let { accessToken } = await prepareApiRequest(options?.credentials);
    let joined = (options?.statuses ?? []).map((status) => `&statuses=${status}`).join("");
    let baseUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions?limit=100${joined}`;
    let headers = {
      ...getOAuthRequestHeaders(accessToken),
      ...(options?.requestReason && {
        "anthropic-client-request-reason": options.requestReason,
      }),
    };
    let seenIds = new Set();
    let sessions = [];
    let fetchedCount = 0;
    let cursor = null;
    let page = 0;
    for (; page < MAX_LIST_PAGES; page++) {
      let pageUrl = cursor ? `${baseUrl}&cursor=${encodeURIComponent(cursor)}` : baseUrl;
      let pageResponse;
      try {
        pageResponse = await axiosGetWithRetry(pageUrl, {
          headers,
          timeout: 15000,
        });
      } catch (error) {
        if (options?.throwOnError) throw error;
        let { logForDebugging } = await import("../../utils/debug.js");
        logForDebugging(
          `[ccr:list] page ${page} failed (${sessions.length} rows so far): ${errorMessage(error)}`,
        );
        break;
      }
      fetchedCount += pageResponse.data.data.length;
      for (let session of pageResponse.data.data) {
        if (seenIds.has(session.id)) continue;
        seenIds.add(session.id);
        if (
          session.status !== "archived" &&
          (options?.includeBridgeKind || session.environment_kind !== "bridge") &&
          CCR_SESSION_ID_RE.test(session.id) &&
          (options?.includeBridgeKind && session.environment_kind === "bridge"
            ? !isInternalHuskTitle((session.title ?? "").trim())
            : hasDisplayTitle(session)) &&
          (options?.accept?.(session) ?? true)
        )
          sessions.push(session);
      }
      cursor = pageResponse.data.next_cursor ?? null;
      let last = pageResponse.data.data.at(-1);
      let lastEventMs = last ? Date.parse(last.last_event_at ?? last.created_at) : Number.NaN;
      if (
        !cursor ||
        (!options?.exhaustive && sessions.length >= CCR_LIST_TARGET_VISIBLE) ||
        (options?.stopWhenOlderThan !== undefined &&
          !Number.isNaN(lastEventMs) &&
          lastEventMs < options.stopWhenOlderThan)
      )
        break;
    }
    let { logForDebugging } = await import("../../utils/debug.js");
    let truncated = page >= MAX_LIST_PAGES && cursor !== null;
    if (options?.status) {
      options.status.truncated = truncated;
      options.status.moreRemain = Boolean(cursor);
    }
    logForDebugging(
      `[ccr:list]: ${fetchedCount} fetched, ${sessions.length} after archive/bridge/husk${options?.accept ? "/accept" : ""} filter${truncated ? ` (TRUNCATED: ${MAX_LIST_PAGES}-page budget exhausted with more remaining)` : ""}`,
    );
    return sessions;
  } catch (error) {
    if (options?.throwOnError) throw error;
    let { logForDebugging } = await import("../../utils/debug.js");
    logForDebugging(`[ccr:list] failed: ${errorMessage(error)}`);
  }
  return [];
}
export { isInternalHuskTitle, CCR_SESSION_ID_RE, CCR_LIST_TARGET_VISIBLE, walkCcrSessionList };
