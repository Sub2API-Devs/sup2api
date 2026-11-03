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
import { t3 } from "../../utils/nativeInstaller/downloadsClient.js";
import { externalHttp } from "../http/externalHttp.js";

/**
 * 内置的发布签名公钥（SPKI），用于校验发布的模型目录。
 */
//@ chunk-g6j7q15x.js:732-1574 placement
var RELEASE_SIGNING_KEY = {
    id: "claude-code-release-signing-key",
    spkiBase64:
      "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAp28rSV5I8HmK8CK9GixBUZR/gtJxeOCsRXO4EJiej40jzBmQA3cWXGosVO82ZfFsRKVTtMC5iB/HH9sxjncrmYNWGroJNbx29m/FgYQBgkCXT4AfFl6rnnXqRGLZOerj/4AqE4yQ1GZbhBgR55Z7ro0ieKK8RHYUspBKAFHyWRhCCz6THW6YRbf0p/hG/08TOY6Sj3cJ7/AEoTRf9ZmVNX1k0KvbUSiVGpGY9OIHWgxRJUF2pArU4o/hk+sqGAgEUh8Bjvjwvz6+quLXPg+y0Y8Ugb1Fg6BUppam/zydYY/Q/+yNjnuF154gD1jEeeir8R5czs6zUHSbo2yXUpAsIdWYo5End8vGsluVmFExnUWm/fTVMGoM5Wm3v1VRepMydEnJ+atz4oQdmPQcKNAip5GJO2uyk++xFr9CpKvlR5jral92toYV/m+mur3va8ydamWBo/qG7/wt0sdS81IwH6lcu0SQ39rgKD+bdoPLv05EqVMYTFRI2QZEsWGYTMs0DOrfCIJFH50qyD0x4sWw1gEWeG3jDgY8cj2StZz+zjqzUd05CibcCzEAGm1EQg5y9D40tIsAU1OI7bpgQ9V0lC8lrqE7zJY66UK9Z1daA8jrdDi6migNjHFrXfT3V4QvMthCIO05q05SS3x2G3ZpIgmI+CePUPB1pDf+lhPkU1MCAwEAAQ==",
  },
  COMPILED_CATALOG_ROOTS = [RELEASE_SIGNING_KEY],
  MANAGED_MODEL_CATALOG_PUBLIC_KEY = "managed-model-catalog-public-key";
//@ chunk-g6j7q15x.js:1574-1657 placement
function O6n(e) {
  if (e === void 0) return;
  return e === MANAGED_MODEL_CATALOG_PUBLIC_KEY ? "managed_key" : "compiled_roots";
}
//@ chunk-g6j7q15x.js:1657-1974 placement = base64URLEncode (1)
function base64URLEncode(buffer) {
  let match = /^-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----$/.exec(buffer.trim());
  if (match === null || match[1] === void 0) return;
  let replaced = match[1].replace(/\s+/g, "");
  if (replaced.length === 0 || !/^[A-Za-z0-9+/]+=*$/.test(replaced)) return;
  let buffer_2 = Buffer.from(replaced, "base64");
  return buffer_2.length > 0 && buffer_2.toString("base64") === replaced ? new Uint8Array(buffer_2) : void 0;
}
//@ chunk-g6j7q15x.js:1974-1985 placement
var g = 2048;
/**
 * 解析目录签名公钥：要求 SPKI DER，记录密钥类型与长度，不合规时返回原因。
 */
//@ chunk-g6j7q15x.js:1985-2355 placement
function parseCatalogPublicKey(e) {
  let r = base64URLEncode(e);
  if (r === void 0) return { ok: !1, reason: "not_spki_pem" };
  let n, o;
  try {
    let a = createPublicKey({ key: Buffer.from(r), format: "der", type: "spki" });
    ((n = a.asymmetricKeyType), (o = a.asymmetricKeyDetails?.modulusLength));
  } catch {
    return { ok: !1, reason: "not_spki_pem" };
  }
  if (n !== "rsa") return { ok: !1, reason: "not_rsa" };
  if (o === void 0 || o < g) return { ok: !1, reason: "modulus_too_short" };
  return { ok: !0, der: r };
}
//@ chunk-g6j7q15x.js:2355-2427 placement
function S(e) {
  return new Uint8Array(Buffer.from(e.spkiBase64, "base64"));
}
//@ chunk-g6j7q15x.js:2427-2511 placement
var _ = "https://downloads.claude.ai/model-catalog/v1/catalog.json",
  h = ".raw-sig.json";
//@ chunk-g6j7q15x.js:2511-2560 placement
function m() {
  return { url: void 0, publicKey: void 0 };
}
/**
 * 读取托管设置中的模型目录 URL/公钥，只有来自管理员策略（或服务器已确认的远程托管设置）时才采用。
 */
//@ chunk-g6j7q15x.js:2560-2934 placement
function getManagedCatalogSource() {
  let { url: url, publicKey: publicKey } = m();
  if (url === void 0 && publicKey === void 0) return { url: void 0, publicKey: void 0 };
  let n = getPolicySettingsOrigin();
  if (!isAdminPolicyOrigin(n) && !(n === "remote" && isRemoteManagedSettingsVerified()))
    return (
      logForDebugging(
        `[publishedCatalog] ignoring managed model-catalog source settings from a non-admin policy origin (${n ?? "none"}${n === "remote" ? ", unconfirmed by the server" : ""})`,
      ),
      { url: void 0, publicKey: void 0 }
    );
  return { url: url, publicKey: publicKey };
}
//@ chunk-g6j7q15x.js:2934-3041 placement
function isManagedCatalogSourceUnverified() {
  let { url: url, publicKey: publicKey } = m();
  if (url === void 0 && publicKey === void 0) return !1;
  return getPolicySettingsOrigin() === "remote" && !isRemoteManagedSettingsVerified();
}
//@ chunk-g6j7q15x.js:3041-3163 placement
function isUnverifiedFileCatalogSource() {
  if (!isManagedCatalogSourceUnverified()) return !1;
  let { url: url } = m();
  if (url === void 0) return !1;
  try {
    return validateGitUrl(new URL(url)) === "file";
  } catch {
    return !1;
  }
}
//@ chunk-g6j7q15x.js:3163-3230 placement
function A(e = getManagedCatalogSource()) {
  return e.url ?? D(env.CLAUDE_CODE_MODEL_CATALOG_URL);
}
//@ chunk-g6j7q15x.js:3230-3328 placement
function XNo() {
  let e = A();
  if (e === void 0) return !1;
  try {
    return validateGitUrl(new URL(e)) === "file";
  } catch {
    return !1;
  }
}
//@ chunk-g6j7q15x.js:3328-3376 placement
function D(e) {
  let r = e?.trim();
  return r ? r : void 0;
}
/**
 * 确定已签名模型目录的来源：取托管设置或环境变量指定的 URL（默认官方地址），拒绝非法 URL、不支持的协议与私有/元数据主机，返回 {kind, url, trust, cacheKey}。
 */
//@ chunk-g6j7q15x.js:3376-4001 placement
function resolvePublishedCatalogSource({ ignoreEnvUrl: e = !1 } = {}) {
  let r = getManagedCatalogSource(),
    n = (e ? r.url : A(r)) ?? _,
    url;
  try {
    url = new URL(n);
  } catch {
    return (
      logForDebugging("[publishedCatalog] configured catalog URL is not a URL; published path off"),
      { ok: !1, reason: "invalid_url" }
    );
  }
  let a = validateGitUrl(url);
  if (a === void 0)
    return (
      logForDebugging(
        `[publishedCatalog] configured catalog URL has unsupported scheme ${url.protocol}; published path off`,
      ),
      { ok: !1, reason: "invalid_url" }
    );
  if (a !== "file" && isPrivateHost(url.hostname))
    return (
      logForDebugging(
        "[publishedCatalog] configured catalog URL names a loopback or metadata host; published path off",
      ),
      { ok: !1, reason: "invalid_url" }
    );
  let str = url.toString();
  return { ok: !0, source: { kind: a, url: str, trust: resolveCatalogTrust(a, r), cacheKey: JNo(str) } };
}
/**
 * 决定目录签名的信任根：托管来源或未配置公钥时只用内置根；配置了公钥但无托管 URL 时也只用内置根；公钥无效时 untrusted；否则内置根加托管公钥。
 */
//@ chunk-g6j7q15x.js:4202-4836 placement
function resolveCatalogTrust(e, r) {
  if (e === "hosted" || r.publicKey === void 0)
    return { kind: "compiled_roots", roots: COMPILED_CATALOG_ROOTS };
  if (r.url === void 0)
    return (
      logForDebugging(
        "[publishedCatalog] a managed catalog public key is set but no managed catalog URL is; the env-named URL verifies against the compiled roots only",
      ),
      { kind: "compiled_roots", roots: COMPILED_CATALOG_ROOTS }
    );
  let n = parseCatalogPublicKey(r.publicKey);
  if (!n.ok)
    return (
      logForDebugging(
        `[publishedCatalog] the managed catalog public key is not a PEM SPKI RSA public key of at least ${g} bits (${n.reason}); custom source refused`,
      ),
      { kind: "untrusted", reason: "invalid_public_key" }
    );
  return {
    kind: "managed_key",
    roots: [
      ...COMPILED_CATALOG_ROOTS,
      { id: MANAGED_MODEL_CATALOG_PUBLIC_KEY, spkiBase64: Buffer.from(n.der).toString("base64") },
    ],
  };
}
//@ chunk-g6j7q15x.js:4836-4907 placement
function JNo(e) {
  return createHash("sha256").update(e).digest("hex").slice(0, 32);
}
//@ chunk-g6j7q15x.js:4907-4937 placement
function P(e) {
  return fileURLToPath(e.url);
}
//@ chunk-g6j7q15x.js:4937-4947 placement
var CATALOG_FETCH_TIMEOUT_MS = 1e4;
//@ chunk-g6j7q15x.js:4947-5481 placement = fetchTeamMemoryHashes (0.372)
async function fetchPublishedCatalog(state, { etag: r, noCache: n = !1 } = {}) {
  try {
    return state.kind === "file"
      ? await readCatalogFile(state)
      : await fetchPublishedCatalogHttp(state, { etag: r, noCache: n });
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error);
    switch (
      (logForDebugging(`[publishedCatalog] fetch failed: ${kind}${status !== void 0 ? ` ${status}` : ""}`),
      kind)
    ) {
      case "timeout":
        return { status: "error", reason: "timeout" };
      case "network":
        return { status: "error", reason: "network" };
      case "auth":
      case "http":
        return status === void 0
          ? { status: "error", reason: isAxiosBodyOrResponseError(error) ? "too_large" : "network" }
          : { status: "error", reason: "http_status", httpStatus: status };
      case "other":
        return { status: "error", reason: "exception" };
    }
  }
}
//@ chunk-g6j7q15x.js:5481-6696 placement
async function fetchPublishedCatalogHttp(e, { etag: etag, noCache: noCache }) {
  let o = createPinnedRedirectGuard(e.url),
    a = noCache ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : void 0,
    s = await U(e.url, {
      responseType: "arraybuffer",
      timeout: CATALOG_FETCH_TIMEOUT_MS,
      maxContentLength: CATALOG_SCHEMA,
      maxBodyLength: CATALOG_SCHEMA,
      validateStatus: () => !0,
      beforeRedirect: o,
      ...((etag !== void 0 || a !== void 0) && {
        headers: { ...a, ...(etag !== void 0 && { "If-None-Match": etag }) },
      }),
    }),
    status = s.status;
  if (status === 304 && etag !== void 0)
    return (
      logForDebugging("[publishedCatalog] fetch: not modified"),
      { status: "not_modified", httpStatus: status }
    );
  if (status < 200 || status >= 300)
    return (
      logForDebugging(`[publishedCatalog] fetch: HTTP ${status}`),
      { status: "error", reason: "http_status", httpStatus: status }
    );
  let l = toUint8Array(s.data);
  if (l.length > CATALOG_SCHEMA) return { status: "error", reason: "too_large", httpStatus: status };
  let f = void 0,
    c = !1,
    d = await U(N(e.url), {
      responseType: "arraybuffer",
      timeout: CATALOG_FETCH_TIMEOUT_MS,
      maxContentLength: MAX_DOCUMENT_CHARS,
      maxBodyLength: MAX_DOCUMENT_CHARS,
      validateStatus: () => !0,
      beforeRedirect: o,
      ...(a !== void 0 && { headers: a }),
    });
  if (d.status >= 200 && d.status < 300) {
    let p = toUint8Array(d.data);
    if (p.length <= MAX_DOCUMENT_CHARS) ((c = !0), (f = safeParseJSON(Buffer.from(p).toString("utf8"), !1)));
  } else logForDebugging(`[publishedCatalog] sidecar fetch: HTTP ${d.status}`);
  return (
    logForDebugging(
      `[publishedCatalog] fetch ok: ${l.length} bytes${c ? ", sidecar present" : ", no sidecar"}`,
    ),
    {
      status: "ok",
      documentBytes: l,
      sidecar: f,
      hasSidecar: c,
      sidecarHttpStatus: d.status,
      etag: j(s.headers),
      httpStatus: status,
    }
  );
}
/**
 * 读取本地模型目录文件：无盘会话不读，限制读取大小，失败返回 read_failed。
 */
//@ chunk-g6j7q15x.js:6696-7470 placement
async function readCatalogFile(e) {
  if (isDiskless())
    return (
      logForDebugging("[publishedCatalog] file not read: a diskless session"),
      { status: "error", reason: "read_failed" }
    );
  let r = P(e),
    n = getFsImplementation(),
    bytes;
  try {
    bytes = await n.readFileBytes(r, CATALOG_SCHEMA + 1);
  } catch (error) {
    return (
      logForDebugging(`[publishedCatalog] file read failed${isENOENT(error) ? " (no such file)" : ""}`),
      { status: "error", reason: "read_failed" }
    );
  }
  if (bytes.length > CATALOG_SCHEMA) return { status: "error", reason: "too_large" };
  let a = void 0,
    s = !1;
  try {
    let fileBytes = await n.readFileBytes(`${r}${h}`, MAX_DOCUMENT_CHARS + 1);
    if (fileBytes.length <= MAX_DOCUMENT_CHARS)
      ((s = !0), (a = safeParseJSON(fileBytes.toString("utf8"), !1)));
  } catch (error) {
    if (!isENOENT(error)) logForDebugging("[publishedCatalog] sidecar read failed");
  }
  return (
    logForDebugging(
      `[publishedCatalog] file read ok: ${bytes.length} bytes${s ? ", sidecar present" : ", no sidecar"}`,
    ),
    {
      status: "ok",
      documentBytes: new Uint8Array(bytes),
      sidecar: a,
      hasSidecar: s,
      sidecarHttpStatus: void 0,
      etag: void 0,
      httpStatus: void 0,
    }
  );
}
//@ chunk-g6j7q15x.js:7470-7523 placement
function U(e, r) {
  return isAnthropicOwnedHost(e) ? t3.get(e, r) : externalHttp.get(e, r);
}
//@ chunk-g6j7q15x.js:7523-7818 placement
function createPinnedRedirectGuard(e) {
  let r = isAnthropicOwnedHost(e),
    startsWith = e.toLowerCase().startsWith("https:");
  return (o) => {
    let a = urlFromRequestOptions(o),
      s = G(a),
      u = M(a),
      l = sameOrigin(e, a),
      f = startsWith ? u === "https:" : l || u === "https:";
    if (!(s !== "" && (r ? isAnthropicOwnedHost(s) : !isAnthropicHost(s)) && f && (l || !isPrivateHost(s))))
      throw Error("[publishedCatalog] redirect refused: a hop left the host the request was pinned to");
  };
}
//@ chunk-g6j7q15x.js:7818-7893 placement
function G(e) {
  try {
    return new URL(e).hostname.toLowerCase();
  } catch {
    return "";
  }
}
//@ chunk-g6j7q15x.js:7893-7968 placement
function M(e) {
  try {
    return new URL(e).protocol.toLowerCase();
  } catch {
    return "";
  }
}
//@ chunk-g6j7q15x.js:7968-8033 placement
function N(e) {
  let r = new URL(e);
  return ((r.pathname += h), r.toString());
}
//@ chunk-g6j7q15x.js:8033-8219 placement
function toUint8Array(e) {
  if (e instanceof Uint8Array) return e;
  if (e instanceof ArrayBuffer) return new Uint8Array(e);
  if (typeof e === "string") return new TextEncoder().encode(e);
  return new Uint8Array(0);
}
//@ chunk-g6j7q15x.js:8219-8357 placement = isServerError (0.751)
function isAxiosBodyOrResponseError(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED" || err.code === "ERR_BAD_RESPONSE")
  );
}
//@ chunk-g6j7q15x.js:8357-8407 placement
function j(e) {
  let r = e?.etag;
  return isValidEtag(r) ? r : void 0;
}
//@ chunk-g6j7q15x.js:8407-8492 placement
var x = "claude-code-model-catalog-v1\x00",
  T = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" };
/**
 * 校验已签名模型目录：解析 sidecar 的签名与公钥 SHA-256，在信任根中找到对应公钥后用 WebCrypto RSA 验证"上下文前缀 + 文档字节"；返回 {ok, rootId} 或失败原因（sidecar_invalid/unknown_key/key_unusable/bad_signature）。
 */
//@ chunk-g6j7q15x.js:8492-9289 placement
async function verifyCatalogSignature({
  documentBytes: documentBytes,
  sidecar: sidecar,
  roots: roots,
  context: context = x,
}) {
  let safeParse = catalogSignatureSchema().safeParse(sidecar);
  if (!safeParse.success) return { ok: !1, reason: "sidecar_invalid" };
  let buffer = Buffer.from(safeParse.data.signature, "base64");
  if (buffer.length === 0 || buffer.toString("base64") !== safeParse.data.signature)
    return { ok: !1, reason: "sidecar_invalid" };
  let u, l;
  for (let d of roots) {
    let p = b(S(d));
    if ((await sha256HexOfBytes(p)) === safeParse.data.publicKeySha256) {
      ((u = d), (l = p));
      break;
    }
  }
  if (u === void 0 || l === void 0) return { ok: !1, reason: "unknown_key" };
  let f;
  try {
    f = await crypto.subtle.importKey("spki", l, T, !1, ["verify"]);
  } catch (error) {
    return (
      logForDebugging(
        `[publishedCatalog] trust root ${u.id} is not an importable RSA key: ${error instanceof Error ? error.name : "error"}`,
      ),
      { ok: !1, reason: "key_unusable" }
    );
  }
  let c;
  try {
    c = await crypto.subtle.verify(T.name, f, b(buffer), prefixWithSigningContext(documentBytes, context));
  } catch {
    c = !1;
  }
  return c ? { ok: !0, rootId: u.id } : { ok: !1, reason: "bad_signature" };
}
//@ chunk-g6j7q15x.js:9289-9413 placement
function prefixWithSigningContext(e, r = x) {
  let encode = new TextEncoder().encode(r),
    uint8Array = new Uint8Array(encode.length + e.length);
  return (uint8Array.set(encode), uint8Array.set(e, encode.length), uint8Array);
}
//@ chunk-g6j7q15x.js:9413-9520 placement
async function sha256HexOfBytes(e) {
  let digest = await crypto.subtle.digest("SHA-256", b(e));
  return Buffer.from(digest).toString("hex");
}
//@ chunk-g6j7q15x.js:9520-9587 placement
function b(e) {
  let uint8Array = new Uint8Array(e.byteLength);
  return (uint8Array.set(e), uint8Array);
}

export {
  _,
  isManagedCatalogSourceUnverified,
  verifyCatalogSignature,
  O6n,
  resolvePublishedCatalogSource,
  fetchPublishedCatalog,
  isUnverifiedFileCatalogSource,
  JNo,
  COMPILED_CATALOG_ROOTS,
  MANAGED_MODEL_CATALOG_PUBLIC_KEY,
  XNo,
};
