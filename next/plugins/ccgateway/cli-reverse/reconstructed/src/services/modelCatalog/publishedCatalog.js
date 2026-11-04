/**
 * services/modelCatalog/publishedCatalog.ts
 *
 * 2.1.316 新增：签名发布的模型目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g6j7q15x.js (35)
 * attribution: placement 35
 */
import { createPublicKey, createHash } from "crypto";
import { fileURLToPath } from "url";
import { getPolicySettingsOrigin, isAdminPolicyOrigin } from "../../utils/settings/settings.js";
import { isRemoteManagedSettingsVerified } from "../remoteManagedSettings/remoteSettingsState.js";
import { logForDebugging } from "../../utils/debug.js";
import { validateGitUrl } from "../../utils/plugins/pluginLoader.js";
import { env } from "../../utils/env.js";
import { isPrivateHost, urlFromRequestOptions, sameOrigin } from "../../utils/network/privateHostCheck.js";
import { classifyAxiosError, isENOENT } from "../../utils/errors.js";
import {
  CATALOG_SCHEMA,
  MAX_DOCUMENT_CHARS,
  isValidEtag,
  catalogSignatureSchema,
} from "../../utils/model/modelCatalog/servedCatalog.js";
import { safeParseJSON } from "../../utils/json.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { isAnthropicOwnedHost, isAnthropicHost } from "../../utils/anthropicHosts.js";
import { publicCdnGuardedClient } from "../../utils/nativeInstaller/downloadsClient.js";
import { externalHttp } from "../http/externalHttp.js";

//@ chunk-g6j7q15x.js:732-1574 placement
/**
 * 内置的发布签名公钥（SPKI），用于校验发布的模型目录。
 */
var RELEASE_SIGNING_KEY = {
  id: "claude-code-release-signing-key",
  spkiBase64:
    "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAp28rSV5I8HmK8CK9GixBUZR/gtJxeOCsRXO4EJiej40jzBmQA3cWXGosVO82ZfFsRKVTtMC5iB/HH9sxjncrmYNWGroJNbx29m/FgYQBgkCXT4AfFl6rnnXqRGLZOerj/4AqE4yQ1GZbhBgR55Z7ro0ieKK8RHYUspBKAFHyWRhCCz6THW6YRbf0p/hG/08TOY6Sj3cJ7/AEoTRf9ZmVNX1k0KvbUSiVGpGY9OIHWgxRJUF2pArU4o/hk+sqGAgEUh8Bjvjwvz6+quLXPg+y0Y8Ugb1Fg6BUppam/zydYY/Q/+yNjnuF154gD1jEeeir8R5czs6zUHSbo2yXUpAsIdWYo5End8vGsluVmFExnUWm/fTVMGoM5Wm3v1VRepMydEnJ+atz4oQdmPQcKNAip5GJO2uyk++xFr9CpKvlR5jral92toYV/m+mur3va8ydamWBo/qG7/wt0sdS81IwH6lcu0SQ39rgKD+bdoPLv05EqVMYTFRI2QZEsWGYTMs0DOrfCIJFH50qyD0x4sWw1gEWeG3jDgY8cj2StZz+zjqzUd05CibcCzEAGm1EQg5y9D40tIsAU1OI7bpgQ9V0lC8lrqE7zJY66UK9Z1daA8jrdDi6migNjHFrXfT3V4QvMthCIO05q05SS3x2G3ZpIgmI+CePUPB1pDf+lhPkU1MCAwEAAQ==",
};
var COMPILED_CATALOG_ROOTS = [RELEASE_SIGNING_KEY];
var MANAGED_MODEL_CATALOG_PUBLIC_KEY = "managed-model-catalog-public-key";
//@ chunk-g6j7q15x.js:1574-1657 placement
/**
 * 判断签名公钥来源（托管密钥/编译内置）。
 */
function classifyKeySource(key) {
  if (key === undefined) return;
  return key === MANAGED_MODEL_CATALOG_PUBLIC_KEY ? "managed_key" : "compiled_roots";
}
//@ chunk-g6j7q15x.js:1657-1974 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(buffer) {
  let match = /^-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----$/.exec(buffer.trim());
  if (match === null || match[1] === undefined) return;
  let replaced = match[1].replace(/\s+/g, "");
  if (replaced.length === 0 || !/^[A-Za-z0-9+/]+=*$/.test(replaced)) return;
  let buffer_2 = Buffer.from(replaced, "base64");
  return buffer_2.length > 0 && buffer_2.toString("base64") === replaced
    ? new Uint8Array(buffer_2)
    : undefined;
}
//@ chunk-g6j7q15x.js:1974-1985 placement
/**
 * RSA 公钥的最小位数（2048）。
 */
var MIN_RSA_BITS = 2048;
//@ chunk-g6j7q15x.js:1985-2355 placement
/**
 * 解析目录签名公钥：要求 SPKI DER，记录密钥类型与长度，不合规时返回原因。
 */
function parseCatalogPublicKey(buffer) {
  let der = base64URLEncode(buffer);
  if (der === undefined)
    return {
      ok: false,
      reason: "not_spki_pem",
    };
  let keyType;
  let modulusLength;
  try {
    let publicKey = createPublicKey({
      key: Buffer.from(der),
      format: "der",
      type: "spki",
    });
    keyType = publicKey.asymmetricKeyType;
    modulusLength = publicKey.asymmetricKeyDetails?.modulusLength;
  } catch {
    return {
      ok: false,
      reason: "not_spki_pem",
    };
  }
  if (keyType !== "rsa")
    return {
      ok: false,
      reason: "not_rsa",
    };
  if (modulusLength === undefined || modulusLength < MIN_RSA_BITS)
    return {
      ok: false,
      reason: "modulus_too_short",
    };
  return {
    ok: true,
    der,
  };
}
//@ chunk-g6j7q15x.js:2355-2427 placement
/**
 * 把 spkiBase64 转成字节。
 */
function spkiBytes(root) {
  return new Uint8Array(Buffer.from(root.spkiBase64, "base64"));
}
//@ chunk-g6j7q15x.js:2427-2511 placement
/**
 * 签名 sidecar 文件的后缀。
 */
var _ = "https://downloads.claude.ai/model-catalog/v1/catalog.json";
var SIG_SIDECAR_SUFFIX = ".raw-sig.json";
//@ chunk-g6j7q15x.js:2511-2560 placement
/**
 * 空的托管目录来源。
 */
function emptyManagedSource() {
  return {
    url: undefined,
    publicKey: undefined,
  };
}
//@ chunk-g6j7q15x.js:2560-2934 placement
/**
 * 读取托管设置中的模型目录 URL/公钥，只有来自管理员策略（或服务器已确认的远程托管设置）时才采用。
 */
function getManagedCatalogSource() {
  let { url, publicKey } = emptyManagedSource();
  if (url === undefined && publicKey === undefined)
    return {
      url: undefined,
      publicKey: undefined,
    };
  let policySettingsOrigin = getPolicySettingsOrigin();
  if (
    !isAdminPolicyOrigin(policySettingsOrigin) &&
    !(policySettingsOrigin === "remote" && isRemoteManagedSettingsVerified())
  ) {
    logForDebugging(
      `[publishedCatalog] ignoring managed model-catalog source settings from a non-admin policy origin (${policySettingsOrigin ?? "none"}${policySettingsOrigin === "remote" ? ", unconfirmed by the server" : ""})`,
    );
    return {
      url: undefined,
      publicKey: undefined,
    };
  }
  return {
    url,
    publicKey,
  };
}
//@ chunk-g6j7q15x.js:2934-3041 placement
function isManagedCatalogSourceUnverified() {
  let { url, publicKey } = emptyManagedSource();
  if (url === undefined && publicKey === undefined) return false;
  return getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
}
//@ chunk-g6j7q15x.js:3041-3163 placement
function isUnverifiedFileCatalogSource() {
  if (!isManagedCatalogSourceUnverified()) return false;
  let { url } = emptyManagedSource();
  if (url === undefined) return false;
  try {
    return validateGitUrl(new URL(url)) === "file";
  } catch {
    return false;
  }
}
//@ chunk-g6j7q15x.js:3163-3230 placement
/**
 * 取模型目录 URL（托管设置优先，其次环境变量）。
 */
function catalogUrl(managedCatalogSource = getManagedCatalogSource()) {
  return managedCatalogSource.url ?? trimmedOrUndefined(env.CLAUDE_CODE_MODEL_CATALOG_URL);
}
//@ chunk-g6j7q15x.js:3230-3328 placement
/**
 * 判断目录来源是否为 file://。
 */
function isFileCatalogSource() {
  let configuredUrl = catalogUrl();
  if (configuredUrl === undefined) return false;
  try {
    return validateGitUrl(new URL(configuredUrl)) === "file";
  } catch {
    return false;
  }
}
//@ chunk-g6j7q15x.js:3328-3376 placement
/**
 * 去空白，空则 undefined。
 */
function trimmedOrUndefined(value) {
  let trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
//@ chunk-g6j7q15x.js:3376-4001 placement
/**
 * 确定已签名模型目录的来源：取托管设置或环境变量指定的 URL（默认官方地址），拒绝非法 URL、不支持的协议与私有/元数据主机，返回 {kind, url, trust, cacheKey}。
 */
function resolvePublishedCatalogSource({ ignoreEnvUrl = false } = {}) {
  let managedCatalogSource = getManagedCatalogSource();
  let rawUrl = (ignoreEnvUrl ? managedCatalogSource.url : catalogUrl(managedCatalogSource)) ?? _;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    logForDebugging("[publishedCatalog] configured catalog URL is not a URL; published path off");
    return {
      ok: false,
      reason: "invalid_url",
    };
  }
  let schemeKind = validateGitUrl(url);
  if (schemeKind === undefined) {
    logForDebugging(
      `[publishedCatalog] configured catalog URL has unsupported scheme ${url.protocol}; published path off`,
    );
    return {
      ok: false,
      reason: "invalid_url",
    };
  }
  if (schemeKind !== "file" && isPrivateHost(url.hostname)) {
    logForDebugging(
      "[publishedCatalog] configured catalog URL names a loopback or metadata host; published path off",
    );
    return {
      ok: false,
      reason: "invalid_url",
    };
  }
  let url_2 = url.toString();
  return {
    ok: true,
    source: {
      kind: schemeKind,
      url: url_2,
      trust: resolveCatalogTrust(schemeKind, managedCatalogSource),
      cacheKey: shortHash(url_2),
    },
  };
}
//@ chunk-g6j7q15x.js:4202-4836 placement
/**
 * 决定目录签名的信任根：托管来源或未配置公钥时只用内置根；配置了公钥但无托管 URL 时也只用内置根；公钥无效时 untrusted；否则内置根加托管公钥。
 */
function resolveCatalogTrust(kind, managedCatalogSource) {
  if (kind === "hosted" || managedCatalogSource.publicKey === undefined)
    return {
      kind: "compiled_roots",
      roots: COMPILED_CATALOG_ROOTS,
    };
  if (managedCatalogSource.url === undefined) {
    logForDebugging(
      "[publishedCatalog] a managed catalog public key is set but no managed catalog URL is; the env-named URL verifies against the compiled roots only",
    );
    return {
      kind: "compiled_roots",
      roots: COMPILED_CATALOG_ROOTS,
    };
  }
  let catalogPublicKey = parseCatalogPublicKey(managedCatalogSource.publicKey);
  if (!catalogPublicKey.ok) {
    logForDebugging(
      `[publishedCatalog] the managed catalog public key is not a PEM SPKI RSA public key of at least ${MIN_RSA_BITS} bits (${catalogPublicKey.reason}); custom source refused`,
    );
    return {
      kind: "untrusted",
      reason: "invalid_public_key",
    };
  }
  return {
    kind: "managed_key",
    roots: [
      ...COMPILED_CATALOG_ROOTS,
      {
        id: MANAGED_MODEL_CATALOG_PUBLIC_KEY,
        spkiBase64: Buffer.from(catalogPublicKey.der).toString("base64"),
      },
    ],
  };
}
//@ chunk-g6j7q15x.js:4836-4907 placement
/**
 * 取 32 位十六进制短哈希。
 */
function shortHash(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}
//@ chunk-g6j7q15x.js:4907-4937 placement
/**
 * 把 file URL 转成本地路径。
 */
function fileUrlToPathOf(state) {
  return fileURLToPath(state.url);
}
//@ chunk-g6j7q15x.js:4937-4947 placement
var CATALOG_FETCH_TIMEOUT_MS = 1e4;
//@ chunk-g6j7q15x.js:4947-5481 placement (2.1.88 match: fetchTeamMemoryHashes, 0.372)
async function fetchPublishedCatalog(state, { etag, noCache = false } = {}) {
  try {
    return state.kind === "file"
      ? await readCatalogFile(state)
      : await fetchPublishedCatalogHttp(state, {
          etag,
          noCache,
        });
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    switch (
      (logForDebugging(`[publishedCatalog] fetch failed: ${kind}${status !== undefined ? ` ${status}` : ""}`),
      kind)
    ) {
      case "timeout":
        return {
          status: "error",
          reason: "timeout",
        };
      case "network":
        return {
          status: "error",
          reason: "network",
        };
      case "auth":
      case "http":
        return status === undefined
          ? {
              status: "error",
              reason: isAxiosBodyOrResponseError(error) ? "too_large" : "network",
            }
          : {
              status: "error",
              reason: "http_status",
              httpStatus: status,
            };
      case "other":
        return {
          status: "error",
          reason: "exception",
        };
    }
  }
}
//@ chunk-g6j7q15x.js:5481-6696 placement
async function fetchPublishedCatalogHttp(state, { etag, noCache }) {
  let beforeRedirect = createPinnedRedirectGuard(state.url);
  let noCacheHeaders = noCache
    ? {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      }
    : undefined;
  let response = await fetchByOwnership(state.url, {
    responseType: "arraybuffer",
    timeout: CATALOG_FETCH_TIMEOUT_MS,
    maxContentLength: CATALOG_SCHEMA,
    maxBodyLength: CATALOG_SCHEMA,
    validateStatus: () => true,
    beforeRedirect,
    ...((etag !== undefined || noCacheHeaders !== undefined) && {
      headers: {
        ...noCacheHeaders,
        ...(etag !== undefined && {
          "If-None-Match": etag,
        }),
      },
    }),
  });
  let status = response.status;
  if (status === 304 && etag !== undefined) {
    logForDebugging("[publishedCatalog] fetch: not modified");
    return {
      status: "not_modified",
      httpStatus: status,
    };
  }
  if (status < 200 || status >= 300) {
    logForDebugging(`[publishedCatalog] fetch: HTTP ${status}`);
    return {
      status: "error",
      reason: "http_status",
      httpStatus: status,
    };
  }
  let uint8Array = toUint8Array(response.data);
  if (uint8Array.length > CATALOG_SCHEMA)
    return {
      status: "error",
      reason: "too_large",
      httpStatus: status,
    };
  let sidecar = undefined;
  let hasSidecar = false;
  let sidecarResponse = await fetchByOwnership(sidecarUrl(state.url), {
    responseType: "arraybuffer",
    timeout: CATALOG_FETCH_TIMEOUT_MS,
    maxContentLength: MAX_DOCUMENT_CHARS,
    maxBodyLength: MAX_DOCUMENT_CHARS,
    validateStatus: () => true,
    beforeRedirect,
    ...(noCacheHeaders !== undefined && {
      headers: noCacheHeaders,
    }),
  });
  if (sidecarResponse.status >= 200 && sidecarResponse.status < 300) {
    let uint8Array = toUint8Array(sidecarResponse.data);
    if (uint8Array.length <= MAX_DOCUMENT_CHARS) {
      hasSidecar = true;
      sidecar = safeParseJSON(Buffer.from(uint8Array).toString("utf8"), false);
    }
  } else logForDebugging(`[publishedCatalog] sidecar fetch: HTTP ${sidecarResponse.status}`);
  logForDebugging(
    `[publishedCatalog] fetch ok: ${uint8Array.length} bytes${hasSidecar ? ", sidecar present" : ", no sidecar"}`,
  );
  return {
    status: "ok",
    documentBytes: uint8Array,
    sidecar,
    hasSidecar,
    sidecarHttpStatus: sidecarResponse.status,
    etag: etagOf(response.headers),
    httpStatus: status,
  };
}
//@ chunk-g6j7q15x.js:6696-7470 placement
/**
 * 读取本地模型目录文件：无盘会话不读，限制读取大小，失败返回 read_failed。
 */
async function readCatalogFile(state) {
  if (isDiskless()) {
    logForDebugging("[publishedCatalog] file not read: a diskless session");
    return {
      status: "error",
      reason: "read_failed",
    };
  }
  let filePath = fileUrlToPathOf(state);
  let fsImplementation = getFsImplementation();
  let bytes;
  try {
    bytes = await fsImplementation.readFileBytes(filePath, CATALOG_SCHEMA + 1);
  } catch (error) {
    logForDebugging(`[publishedCatalog] file read failed${isENOENT(error) ? " (no such file)" : ""}`);
    return {
      status: "error",
      reason: "read_failed",
    };
  }
  if (bytes.length > CATALOG_SCHEMA)
    return {
      status: "error",
      reason: "too_large",
    };
  let sidecar = undefined;
  let hasSidecar = false;
  try {
    let fileBytes = await fsImplementation.readFileBytes(
      `${filePath}${SIG_SIDECAR_SUFFIX}`,
      MAX_DOCUMENT_CHARS + 1,
    );
    if (fileBytes.length <= MAX_DOCUMENT_CHARS) {
      hasSidecar = true;
      sidecar = safeParseJSON(fileBytes.toString("utf8"), false);
    }
  } catch (error) {
    if (!isENOENT(error)) logForDebugging("[publishedCatalog] sidecar read failed");
  }
  logForDebugging(
    `[publishedCatalog] file read ok: ${bytes.length} bytes${hasSidecar ? ", sidecar present" : ", no sidecar"}`,
  );
  return {
    status: "ok",
    documentBytes: new Uint8Array(bytes),
    sidecar,
    hasSidecar,
    sidecarHttpStatus: undefined,
    etag: undefined,
    httpStatus: undefined,
  };
}
//@ chunk-g6j7q15x.js:7470-7523 placement
/**
 * 按主机归属选择 fetch 实现（自有主机走内置通道）。
 */
function fetchByOwnership(url, options) {
  return isAnthropicOwnedHost(url)
    ? publicCdnGuardedClient.get(url, options)
    : externalHttp.get(url, options);
}
//@ chunk-g6j7q15x.js:7523-7818 placement
function createPinnedRedirectGuard(url) {
  let isOwnedHost = isAnthropicOwnedHost(url);
  let isHttps = url.toLowerCase().startsWith("https:");
  return (options) => {
    let targetUrl = urlFromRequestOptions(options);
    let targetHost = hostOf(targetUrl);
    let targetProtocol = protocolOf(targetUrl);
    let isSameOrigin = sameOrigin(url, targetUrl);
    let protocolOk = isHttps ? targetProtocol === "https:" : isSameOrigin || targetProtocol === "https:";
    if (!(
      targetHost !== "" &&
      (isOwnedHost ? isAnthropicOwnedHost(targetHost) : !isAnthropicHost(targetHost)) &&
      protocolOk &&
      (isSameOrigin || !isPrivateHost(targetHost))
    ))
      throw Error("[publishedCatalog] redirect refused: a hop left the host the request was pinned to");
  };
}
//@ chunk-g6j7q15x.js:7818-7893 placement
/**
 * 取 URL 主机名（无效返回空串）。
 */
function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
//@ chunk-g6j7q15x.js:7893-7968 placement
/**
 * 取 URL 协议（无效返回空串）。
 */
function protocolOf(url) {
  try {
    return new URL(url).protocol.toLowerCase();
  } catch {
    return "";
  }
}
//@ chunk-g6j7q15x.js:7968-8033 placement
/**
 * 在地址后加上签名 sidecar 后缀。
 */
function sidecarUrl(url) {
  let parsedUrl = new URL(url);
  parsedUrl.pathname += SIG_SIDECAR_SUFFIX;
  return parsedUrl.toString();
}
//@ chunk-g6j7q15x.js:8033-8219 placement
function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === "string") return new TextEncoder().encode(value);
  return new Uint8Array(0);
}
//@ chunk-g6j7q15x.js:8219-8357 placement (2.1.88 match: isServerError, 0.751)
function isAxiosBodyOrResponseError(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED" || err.code === "ERR_BAD_RESPONSE")
  );
}
//@ chunk-g6j7q15x.js:8357-8407 placement
/**
 * 取合法 etag。
 */
function etagOf(headers) {
  let etag = headers?.etag;
  return isValidEtag(etag) ? etag : undefined;
}
//@ chunk-g6j7q15x.js:8407-8492 placement
/**
 * 验签使用的 RSA 算法与哈希。
 */
var SIGNING_CONTEXT = "claude-code-model-catalog-v1\x00";
var RSA_VERIFY_ALGO = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-512",
};
//@ chunk-g6j7q15x.js:8492-9289 placement
/**
 * 校验已签名模型目录：解析 sidecar 的签名与公钥 SHA-256，在信任根中找到对应公钥后用 WebCrypto RSA 验证"上下文前缀 + 文档字节"；返回 {ok, rootId} 或失败原因（sidecar_invalid/unknown_key/key_unusable/bad_signature）。
 */
async function verifyCatalogSignature({ documentBytes, sidecar, roots, context = SIGNING_CONTEXT }) {
  let parsed = catalogSignatureSchema().safeParse(sidecar);
  if (!parsed.success)
    return {
      ok: false,
      reason: "sidecar_invalid",
    };
  let buffer = Buffer.from(parsed.data.signature, "base64");
  if (buffer.length === 0 || buffer.toString("base64") !== parsed.data.signature)
    return {
      ok: false,
      reason: "sidecar_invalid",
    };
  let matchedRoot;
  let matchedSpki;
  for (let root of roots) {
    let uint8 = toUint8(spkiBytes(root));
    if ((await sha256HexOfBytes(uint8)) === parsed.data.publicKeySha256) {
      matchedRoot = root;
      matchedSpki = uint8;
      break;
    }
  }
  if (matchedRoot === undefined || matchedSpki === undefined)
    return {
      ok: false,
      reason: "unknown_key",
    };
  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey("spki", matchedSpki, RSA_VERIFY_ALGO, false, ["verify"]);
  } catch (error) {
    logForDebugging(
      `[publishedCatalog] trust root ${matchedRoot.id} is not an importable RSA key: ${error instanceof Error ? error.name : "error"}`,
    );
    return {
      ok: false,
      reason: "key_unusable",
    };
  }
  let valid;
  try {
    valid = await crypto.subtle.verify(
      RSA_VERIFY_ALGO.name,
      cryptoKey,
      toUint8(buffer),
      prefixWithSigningContext(documentBytes, context),
    );
  } catch {
    valid = false;
  }
  return valid
    ? {
        ok: true,
        rootId: matchedRoot.id,
      }
    : {
        ok: false,
        reason: "bad_signature",
      };
}
//@ chunk-g6j7q15x.js:9289-9413 placement
function prefixWithSigningContext(documentBytes, context = SIGNING_CONTEXT) {
  let contextBytes = new TextEncoder().encode(context);
  let uint8Array = new Uint8Array(contextBytes.length + documentBytes.length);
  uint8Array.set(contextBytes);
  uint8Array.set(documentBytes, contextBytes.length);
  return uint8Array;
}
//@ chunk-g6j7q15x.js:9413-9520 placement
async function sha256HexOfBytes(view) {
  let digest = await crypto.subtle.digest("SHA-256", toUint8(view));
  return Buffer.from(digest).toString("hex");
}
//@ chunk-g6j7q15x.js:9520-9587 placement
/**
 * 把 Buffer 转成 Uint8Array。
 */
function toUint8(view) {
  let uint8Array = new Uint8Array(view.byteLength);
  uint8Array.set(view);
  return uint8Array;
}
export {
  _,
  isManagedCatalogSourceUnverified,
  verifyCatalogSignature,
  classifyKeySource,
  resolvePublishedCatalogSource,
  fetchPublishedCatalog,
  isUnverifiedFileCatalogSource,
  shortHash,
  COMPILED_CATALOG_ROOTS,
  MANAGED_MODEL_CATALOG_PUBLIC_KEY,
  isFileCatalogSource,
};
