/**
 * services/artifacts/contract.ts
 *
 * 2.1.316 新增：获取 frame 契约与定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, M, pe, Ue, oe, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { CONTRACT_VERSION_REGEX, CAPABILITY_NAME_REGEX } from "./capabilityDeclaration.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { errorMessage } from "../../utils/errors.js";
import { logProxyDenial } from "../../utils/sandbox/proxyDenial.js";

//@ chunk-06y4szbn.js:42449-42833 placement
var contractSchema = DoctorLazy(() =>
    u({
      version: o().regex(CONTRACT_VERSION_REGEX),
      capabilities: A(o().regex(CAPABILITY_NAME_REGEX)).max(256),
      claude: M()
        .optional()
        .catch(void 0),
      core: A(o().regex(CAPABILITY_NAME_REGEX))
        .max(256)
        .optional()
        .catch(void 0),
      features: pe(
        o().regex(CAPABILITY_NAME_REGEX),
        pe(o().regex(CAPABILITY_NAME_REGEX), Ue([pe(o(), oe()), T(!0).transform(() => ({}))])),
      )
        .optional()
        .catch(void 0),
    }),
  ),
  sl = "/api/frame/contract/latest",
  al = 262144,
  ol = 65536,
  ll = 5000,
  X_CONTRACT_MISSING_CAPS = "x-contract-missing-caps",
  dl = 16384;
/**
 * 读取 /api/frame/contract/latest 或指定版本的 artifact 页面契约（版本与能力名），区分传输/认证/客户端策略错误。
 */
//@ chunk-06y4szbn.js:42833-43730 placement
async function getFrameContract(e, n, r) {
  let s;
  try {
    s = await frameApi.get(e, {
      refreshOAuth: !0,
      ...(n.recoverOAuth401 && { recoverOAuth401: !0, storageV5: n.storageV5 }),
      headers: buildFrameHeaders(),
      maxContentLength: dl,
      ...r,
      ...(n.timeoutMs !== void 0 && { timeout: n.timeoutMs }),
      ...(n.signal && { signal: n.signal }),
      credentials: n.credentials,
    });
  } catch (error) {
    return { err: errorMessage(error), cause: "transport" };
  }
  if (!s.ok)
    return { err: `unavailable: ${s.reason}`, cause: s.reason === "no-auth" ? "no_auth" : "client_policy" };
  if (!s.fromFrame) return { err: `relay HTTP ${s.status}`, cause: "relay", status: s.status };
  if (s.status < 200 || s.status >= 300) {
    let b = logProxyDenial({
      status: s.status,
      headers: s.response?.headers,
      data: s.data,
      redact: (y) => y,
      label: "[artifact] contract fetch",
    });
    return {
      err: `HTTP ${s.status}`,
      cause: s.status === 404 ? "http_404" : s.status >= 500 ? "http_5xx" : "http_4xx",
      status: s.status,
      ...(b !== void 0 && { proxyDeny: b }),
    };
  }
  let h = s.response?.headers?.[X_CONTRACT_MISSING_CAPS];
  return { body: s.data, ...(typeof h === "string" && { missingCapsHeader: h }) };
}
//@ chunk-06y4szbn.js:43730-44066 placement
async function resolveContract(e) {
  if (e.version !== void 0 && !CONTRACT_VERSION_REGEX.test(e.version))
    return { err: "invalid contract version", cause: "malformed" };
  let n = await getFrameContract(e.version !== void 0 ? `/api/frame/contract/${e.version}` : sl, e);
  if ("err" in n) return n;
  let safeParse = contractSchema().safeParse(n.body);
  if (!safeParse.success) return { err: "malformed contract response", cause: "malformed" };
  return safeParse.data;
}
//@ chunk-06y4szbn.js:44066-44442 placement
async function fetchContractDefs(e, n, r) {
  if (!CONTRACT_VERSION_REGEX.test(e) || !CAPABILITY_NAME_REGEX.test(n))
    return { err: "invalid contract version or capability name", cause: "malformed" };
  let s = await getFrameContract(`/api/frame/contract/${e}/${n}.d.ts`, r, {
    responseType: "text",
    maxContentLength: al,
  });
  if ("err" in s) return s;
  if (typeof s.body !== "string" || s.body.trim() === "")
    return { err: "empty or non-text defs body", cause: "malformed" };
  return { dts: s.body };
}
//@ chunk-06y4szbn.js:44442-44928 placement
async function fetchContractPrompt(e, n) {
  if (!CONTRACT_VERSION_REGEX.test(e)) return { err: "invalid contract version", cause: "malformed" };
  let r = await getFrameContract(`/api/frame/contract/${e}/prompt`, n, {
    responseType: "text",
    maxContentLength: ol,
  });
  if ("err" in r) return r;
  if (typeof r.body !== "string" || r.body.trim() === "")
    return { err: "empty or non-text prompt body", cause: "malformed" };
  let s =
    r.missingCapsHeader === void 0
      ? []
      : r.missingCapsHeader
          .slice(0, 4096)
          .split(",")
          .map((h) => h.trim())
          .filter((h) => CAPABILITY_NAME_REGEX.test(h));
  return { promptMd: r.body, missingCaps: s };
}

export { resolveContract, ll, fetchContractDefs, fetchContractPrompt };
