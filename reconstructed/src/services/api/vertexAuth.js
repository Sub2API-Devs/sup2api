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
//@ chunk-bwbq4xvm.js:159421-159733 placement
/**
 * 构建 Vertex 用 GoogleAuth 客户端：kind=skip 时返回空头客户端；否则懒加载 google-auth-library，keyFile/凭证来自配置。
 */
async function buildVertexGoogleAuth(e, s) {
  if (e.kind === "skip")
    return {
      getClient: () => ({
        getRequestHeaders: async () => new Headers(),
      }),
    };
  let { GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1));
  let path = e.kind === "keyFile" ? e.path : undefined;
  return new GoogleAuth({
    scopes: VERTEX_OAUTH_SCOPES,
    ...(path && {
      keyFilename: path,
    }),
    ...(s && {
      projectId: s,
    }),
    clientOptions: vertexAuthClientOptions(),
  });
}
//@ chunk-bwbq4xvm.js:159733-159800 placement
function vertexAuthClientOptions() {
  return {
    transporterOptions: {
      fetchImplementation: vertexMtlsFetch,
    },
  };
}
//@ chunk-bwbq4xvm.js:159800-160001 placement
async function vertexMtlsFetch(e, s) {
  let tlsFetchOptions = getTLSFetchOptions(undefined);
  let options = s?.agent?.options;
  if (!options?.cert && !options?.key)
    return fetch(e, {
      ...s,
      ...tlsFetchOptions,
    });
  let a = {
    cert: options.cert,
    key: options.key,
    ...(options.ca && {
      ca: options.ca,
    }),
  };
  return fetch(e, {
    ...s,
    tls: {
      ...tlsFetchOptions.tls,
      ...a,
    },
  });
}
//@ chunk-bwbq4xvm.js:160001-160103 placement
function suppressVertexAuthRejection(e) {
  let _authClientPromise = e._authClientPromise;
  if (_authClientPromise && typeof _authClientPromise.catch === "function")
    _authClientPromise.catch(() => {});
  return e;
}
//@ chunk-bwbq4xvm.js:160103-160273 placement
/**
 * 计算 Vertex 请求要固定（钉住）的残余凭证头：自定义 beta 头、Authorization、X-Api-Key。
 */
function vertexResidualCredentialPins(e = false) {
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
    ...(!hasCustomApiKeyHeader() && {
      "X-Api-Key": null,
    }),
  };
}
export {
  vertexAuthClientOptions,
  vertexResidualCredentialPins,
  suppressVertexAuthRejection,
  buildVertexGoogleAuth,
};
