/**
 * services/cloudSessions/ccrSessionList.ts
 *
 * 2.1.316 新增。分页遍历 /v1/code/sessions 云会话列表，过滤已归档、桥接与内部占位会话，超出页数预算时标注截断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2ny09dd0.js (4)
 * attribution: placement 4
 */
import { getAPIProvider } from "../../utils/model/providers.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-2ny09dd0.js:262-317 placement
/**
 * 会话列表最多翻多少页（10），超出标记截断。
 */
var MAX_LIST_PAGES = 10;
var CCR_LIST_TARGET_VISIBLE = 50;
var CCR_SESSION_ID_RE = /^(?:session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-2ny09dd0.js:317-381 placement
/**
 * 判断会话标题是否可展示（非空且不是内部占位标题）。
 */
function hasDisplayTitle(e) {
  let trimmed = (e.title ?? "").trim();
  return trimmed !== "" && !isInternalHuskTitle(trimmed);
}
//@ chunk-2ny09dd0.js:381-476 placement
function isInternalHuskTitle(e) {
  return e.includes("__CBU_POOLED__") || e === "__warming__" || e.startsWith("ditto:");
}
//@ chunk-2ny09dd0.js:476-2254 placement
/**
 * 分页遍历 /v1/code/sessions 云会话列表，过滤已归档、桥接与内部占位会话，超出页数预算时标注截断。
 */
async function walkCcrSessionList(e) {
  if (getAPIProvider() !== "firstParty") return [];
  try {
    await import("./chunk-eg58qykf.js");
    let { axiosGetWithRetry, prepareApiRequest, getOAuthRequestHeaders } =
      await import("./chunk-6phxatm7.js");
    let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
    let { accessToken } = await prepareApiRequest(e?.credentials);
    let joined = (e?.statuses ?? []).map((c) => `&statuses=${c}`).join("");
    let m = `${getOauthConfig().BASE_API_URL}/v1/code/sessions?limit=100${joined}`;
    let headers = {
      ...getOAuthRequestHeaders(accessToken),
      ...(e?.requestReason && {
        "anthropic-client-request-reason": e.requestReason,
      }),
    };
    let g = new Set();
    let n = [];
    let h = 0;
    let s = null;
    let a = 0;
    for (; a < MAX_LIST_PAGES; a++) {
      let c = s ? `${m}&cursor=${encodeURIComponent(s)}` : m;
      let i;
      try {
        i = await axiosGetWithRetry(c, {
          headers,
          timeout: 15000,
        });
      } catch (error) {
        if (e?.throwOnError) throw error;
        let { logForDebugging } = await import("./chunk-cgjee2k6.js");
        logForDebugging(`[ccr:list] page ${a} failed (${n.length} rows so far): ${errorMessage(error)}`);
        break;
      }
      h += i.data.data.length;
      for (let t of i.data.data) {
        if (g.has(t.id)) continue;
        g.add(t.id);
        if (
          t.status !== "archived" &&
          (e?.includeBridgeKind || t.environment_kind !== "bridge") &&
          CCR_SESSION_ID_RE.test(t.id) &&
          (e?.includeBridgeKind && t.environment_kind === "bridge"
            ? !isInternalHuskTitle((t.title ?? "").trim())
            : hasDisplayTitle(t)) &&
          (e?.accept?.(t) ?? true)
        )
          n.push(t);
      }
      s = i.data.next_cursor ?? null;
      let last = i.data.data.at(-1);
      let _ = last ? Date.parse(last.last_event_at ?? last.created_at) : Number.NaN;
      if (
        !s ||
        (!e?.exhaustive && n.length >= CCR_LIST_TARGET_VISIBLE) ||
        (e?.stopWhenOlderThan !== undefined && !Number.isNaN(_) && _ < e.stopWhenOlderThan)
      )
        break;
    }
    let { logForDebugging } = await import("./chunk-cgjee2k6.js");
    let p = a >= MAX_LIST_PAGES && s !== null;
    if (e?.status) {
      e.status.truncated = p;
      e.status.moreRemain = Boolean(s);
    }
    logForDebugging(
      `[ccr:list]: ${h} fetched, ${n.length} after archive/bridge/husk${e?.accept ? "/accept" : ""} filter${p ? ` (TRUNCATED: ${MAX_LIST_PAGES}-page budget exhausted with more remaining)` : ""}`,
    );
    return n;
  } catch (error) {
    if (e?.throwOnError) throw error;
    let { logForDebugging } = await import("./chunk-cgjee2k6.js");
    logForDebugging(`[ccr:list] failed: ${errorMessage(error)}`);
  }
  return [];
}
export { isInternalHuskTitle, CCR_SESSION_ID_RE, CCR_LIST_TARGET_VISIBLE };
