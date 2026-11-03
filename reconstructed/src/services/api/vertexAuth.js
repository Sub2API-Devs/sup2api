/**
 * services/api/vertexAuth.ts
 *
 * 2.1.316 新增：Vertex 认证客户端。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (6)
 * attribution: placement 6
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import {
  filteredCustomBetaHeaders,
  apiKeyHeaderFromEnv,
  clearAuthorizationHeaders,
  hasCustomApiKeyHeader,
} from "./customHeaders.js";

//@ chunk-bwbq4xvm.js:159363-159421 placement
var VERTEX_OAUTH_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
/**
 * 构建 Vertex 用 GoogleAuth 客户端：kind=skip 时返回空头客户端；否则懒加载 google-auth-library，keyFile/凭证来自配置。
 */
//@ chunk-bwbq4xvm.js:159421-159733 placement
async function buildVertexGoogleAuth(e, s) {
  if (e.kind === "skip") return { getClient: () => ({ getRequestHeaders: async () => new Headers() }) };
  let { GoogleAuth: GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1)),
    r = e.kind === "keyFile" ? e.path : void 0;
  return new GoogleAuth({
    scopes: VERTEX_OAUTH_SCOPES,
    ...(r && { keyFilename: r }),
    ...(s && { projectId: s }),
    clientOptions: vertexAuthClientOptions(),
  });
}
//@ chunk-bwbq4xvm.js:159733-159800 placement
function vertexAuthClientOptions() {
  return { transporterOptions: { fetchImplementation: vertexMtlsFetch } };
}
//@ chunk-bwbq4xvm.js:159800-160001 placement
async function vertexMtlsFetch(e, s) {
  let n = getTLSFetchOptions(void 0),
    r = s?.agent?.options;
  if (!r?.cert && !r?.key) return fetch(e, { ...s, ...n });
  let a = { cert: r.cert, key: r.key, ...(r.ca && { ca: r.ca }) };
  return fetch(e, { ...s, tls: { ...n.tls, ...a } });
}
//@ chunk-bwbq4xvm.js:160001-160103 placement
function suppressVertexAuthRejection(e) {
  let _authClientPromise = e._authClientPromise;
  if (_authClientPromise && typeof _authClientPromise.catch === "function")
    _authClientPromise.catch(() => {});
  return e;
}
/**
 * 计算 Vertex 请求要固定（钉住）的残余凭证头：自定义 beta 头、Authorization、X-Api-Key。
 */
//@ chunk-bwbq4xvm.js:160103-160273 placement
function vertexResidualCredentialPins(e = !1) {
  if (e)
    return {
      ...filteredCustomBetaHeaders(),
      Authorization: e.wireAuthorization ?? null,
      ...apiKeyHeaderFromEnv(e.headers),
    };
  return {
    ...clearAuthorizationHeaders(),
    ...filteredCustomBetaHeaders(),
    Authorization: null,
    ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
  };
}

export {
  vertexAuthClientOptions,
  vertexResidualCredentialPins,
  suppressVertexAuthRejection,
  buildVertexGoogleAuth,
};
