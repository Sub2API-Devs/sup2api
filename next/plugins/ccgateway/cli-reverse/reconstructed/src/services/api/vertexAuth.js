/**
 * services/api/vertexAuth.ts
 *
 * 2.1.316 新增：Vertex 认证客户端。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import {
  filteredCustomBetaHeaders,
  apiKeyHeaderFromEnv,
  clearAuthorizationHeaders,
  hasCustomApiKeyHeader,
} from "./customHeaders.js";

//@ chunk-7kayq7nc.js:158612-158670 placement
var VERTEX_OAUTH_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
//@ chunk-7kayq7nc.js:158670-158982 placement
/**
 * 构建 Vertex 用 GoogleAuth 客户端：kind=skip 时返回空头客户端；否则懒加载 google-auth-library，keyFile/凭证来自配置。
 */
async function buildVertexGoogleAuth(kind, projectId) {
  if (kind.kind === "skip")
    return {
      getClient: () => ({
        getRequestHeaders: async () => new Headers(),
      }),
    };
  let { GoogleAuth } = await import("../../utils/lazyDefaultExport.js").then((mod) =>
    __toESM(mod.default, 1),
  );
  let path = kind.kind === "keyFile" ? kind.path : undefined;
  return new GoogleAuth({
    scopes: VERTEX_OAUTH_SCOPES,
    ...(path && {
      keyFilename: path,
    }),
    ...(projectId && {
      projectId,
    }),
    clientOptions: vertexAuthClientOptions(),
  });
}
//@ chunk-7kayq7nc.js:158982-159049 placement
function vertexAuthClientOptions() {
  return {
    transporterOptions: {
      fetchImplementation: vertexMtlsFetch,
    },
  };
}
//@ chunk-7kayq7nc.js:159049-159250 placement
async function vertexMtlsFetch(url, options) {
  let tlsFetchOptions = getTLSFetchOptions(undefined);
  let options_2 = options?.agent?.options;
  if (!options_2?.cert && !options_2?.key)
    return fetch(url, {
      ...options,
      ...tlsFetchOptions,
    });
  let tls = {
    cert: options_2.cert,
    key: options_2.key,
    ...(options_2.ca && {
      ca: options_2.ca,
    }),
  };
  return fetch(url, {
    ...options,
    tls: {
      ...tlsFetchOptions.tls,
      ...tls,
    },
  });
}
//@ chunk-7kayq7nc.js:159250-159352 placement
function suppressVertexAuthRejection(client) {
  let _authClientPromise = client._authClientPromise;
  if (_authClientPromise && typeof _authClientPromise.catch === "function")
    _authClientPromise.catch(() => {});
  return client;
}
//@ chunk-7kayq7nc.js:159352-159522 placement
/**
 * 计算 Vertex 请求要固定（钉住）的残余凭证头：自定义 beta 头、Authorization、X-Api-Key。
 */
function vertexResidualCredentialPins(skipAuth = false) {
  if (skipAuth)
    return {
      ...filteredCustomBetaHeaders(),
      Authorization: skipAuth.wireAuthorization ?? null,
      ...apiKeyHeaderFromEnv(skipAuth.headers),
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
  vertexResidualCredentialPins,
  suppressVertexAuthRejection,
  buildVertexGoogleAuth,
  vertexAuthClientOptions,
};
