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
var u = 10,
  CCR_LIST_TARGET_VISIBLE = 50,
  CCR_SESSION_ID_RE = /^(?:session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-2ny09dd0.js:317-381 placement
function y(e) {
  let trimmed = (e.title ?? "").trim();
  return trimmed !== "" && !isInternalHuskTitle(trimmed);
}
//@ chunk-2ny09dd0.js:381-476 placement
function isInternalHuskTitle(e) {
  return e.includes("__CBU_POOLED__") || e === "__warming__" || e.startsWith("ditto:");
}
/**
 * 分页遍历 /v1/code/sessions 云会话列表，过滤已归档、桥接与内部占位会话，超出页数预算时标注截断。
 */
//@ chunk-2ny09dd0.js:476-2254 placement
async function walkCcrSessionList(e) {
  if (getAPIProvider() !== "firstParty") return [];
  try {
    await import("./chunk-eg58qykf.js");
    let {
        axiosGetWithRetry: axiosGetWithRetry,
        prepareApiRequest: prepareApiRequest,
        getOAuthRequestHeaders: getOAuthRequestHeaders,
      } = await import("./chunk-6phxatm7.js"),
      { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
      { accessToken: accessToken } = await prepareApiRequest(e?.credentials),
      joined = (e?.statuses ?? []).map((c) => `&statuses=${c}`).join(""),
      m = `${getOauthConfig().BASE_API_URL}/v1/code/sessions?limit=100${joined}`,
      b = {
        ...getOAuthRequestHeaders(accessToken),
        ...(e?.requestReason && { "anthropic-client-request-reason": e.requestReason }),
      },
      g = new Set(),
      n = [],
      h = 0,
      s = null,
      a = 0;
    for (; a < u; a++) {
      let c = s ? `${m}&cursor=${encodeURIComponent(s)}` : m,
        i;
      try {
        i = await axiosGetWithRetry(c, { headers: b, timeout: 15000 });
      } catch (error) {
        if (e?.throwOnError) throw error;
        let { logForDebugging: logForDebugging } = await import("./chunk-cgjee2k6.js");
        logForDebugging(`[ccr:list] page ${a} failed (${n.length} rows so far): ${errorMessage(error)}`);
        break;
      }
      h += i.data.data.length;
      for (let t of i.data.data) {
        if (g.has(t.id)) continue;
        if (
          (g.add(t.id),
          t.status !== "archived" &&
            (e?.includeBridgeKind || t.environment_kind !== "bridge") &&
            CCR_SESSION_ID_RE.test(t.id) &&
            (e?.includeBridgeKind && t.environment_kind === "bridge"
              ? !isInternalHuskTitle((t.title ?? "").trim())
              : y(t)) &&
            (e?.accept?.(t) ?? !0))
        )
          n.push(t);
      }
      s = i.data.next_cursor ?? null;
      let at = i.data.data.at(-1),
        _ = at ? Date.parse(at.last_event_at ?? at.created_at) : Number.NaN;
      if (
        !s ||
        (!e?.exhaustive && n.length >= CCR_LIST_TARGET_VISIBLE) ||
        (e?.stopWhenOlderThan !== void 0 && !Number.isNaN(_) && _ < e.stopWhenOlderThan)
      )
        break;
    }
    let { logForDebugging: logForDebugging } = await import("./chunk-cgjee2k6.js"),
      p = a >= u && s !== null;
    if (e?.status) ((e.status.truncated = p), (e.status.moreRemain = Boolean(s)));
    return (
      logForDebugging(
        `[ccr:list]: ${h} fetched, ${n.length} after archive/bridge/husk${e?.accept ? "/accept" : ""} filter${p ? ` (TRUNCATED: ${u}-page budget exhausted with more remaining)` : ""}`,
      ),
      n
    );
  } catch (error) {
    if (e?.throwOnError) throw error;
    let { logForDebugging: logForDebugging } = await import("./chunk-cgjee2k6.js");
    logForDebugging(`[ccr:list] failed: ${errorMessage(error)}`);
  }
  return [];
}

export { isInternalHuskTitle, CCR_SESSION_ID_RE, CCR_LIST_TARGET_VISIBLE };
