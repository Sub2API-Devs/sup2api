/**
 * @smithy/signature-v4/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/signature-v4@5.4.0..5.6.4
 * pieces: chunk-kyj1a8d5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_hex_encoding } from "../../util-hex-encoding/dist-cjs/index.js";
import { require_util_utf8 } from "../../util-utf8/dist-cjs/index.js";
import { require_is_array_buffer } from "../../is-array-buffer/dist-cjs/index.js";
import { require_protocol_http } from "../../protocol-http/dist-cjs/index.js";
import { require_util_middleware } from "../../util-middleware/dist-cjs/index.js";
import { require_util_uri_escape } from "../../util-uri-escape/dist-cjs/index.js";

//@ chunk-kyj1a8d5.js:379-10813 cjs-fingerprint
var require_signature_v4 = __commonJS(function (cjsExports) {
  var toHex = require_util_hex_encoding();
  var utf8Module = require_util_utf8();
  var isArrayBuffer = require_is_array_buffer();
  var protocolsModule = require_protocol_http();
  var normalizeProvider = require_util_middleware();
  var escapeUri = require_util_uri_escape();
  var ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
  var CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
  var AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
  var SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
  var EXPIRES_QUERY_PARAM = "X-Amz-Expires";
  var SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
  var TOKEN_QUERY_PARAM = "X-Amz-Security-Token";
  var REGION_SET_PARAM = "X-Amz-Region-Set";
  var AUTH_HEADER = "authorization";
  var AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
  var DATE_HEADER = "date";
  var GENERATED_HEADERS = [AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER];
  var SIGNATURE_HEADER = SIGNATURE_QUERY_PARAM.toLowerCase();
  var SHA256_HEADER = "x-amz-content-sha256";
  var TOKEN_HEADER = TOKEN_QUERY_PARAM.toLowerCase();
  var HOST_HEADER = "host";
  var ALWAYS_UNSIGNABLE_HEADERS = {
    authorization: true,
    "cache-control": true,
    connection: true,
    expect: true,
    from: true,
    "keep-alive": true,
    "max-forwards": true,
    pragma: true,
    referer: true,
    te: true,
    trailer: true,
    "transfer-encoding": true,
    upgrade: true,
    "user-agent": true,
    "x-amzn-trace-id": true,
  };
  var PROXY_HEADER_PATTERN = /^proxy-/;
  var SEC_HEADER_PATTERN = /^sec-/;
  var UNSIGNABLE_PATTERNS = [/^proxy-/i, /^sec-/i];
  var ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
  var ALGORITHM_IDENTIFIER_V4A = "AWS4-ECDSA-P256-SHA256";
  var EVENT_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256-PAYLOAD";
  var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
  var MAX_CACHE_SIZE = 50;
  var KEY_TYPE_IDENTIFIER = "aws4_request";
  var MAX_PRESIGNED_TTL = 604800;
  var signingKeyCache = {};
  var cacheQueue = [];
  var createScope = (shortDate, region, service) =>
    `${shortDate}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`;
  var getSigningKey = async (sha256Constructor, credentials, shortDate, region, service) => {
    let credsHash = await hmac(sha256Constructor, credentials.secretAccessKey, credentials.accessKeyId);
    let cacheKey = `${shortDate}:${region}:${service}:${toHex.toHex(credsHash)}:${credentials.sessionToken}`;
    if (cacheKey in signingKeyCache) return signingKeyCache[cacheKey];
    cacheQueue.push(cacheKey);
    while (cacheQueue.length > MAX_CACHE_SIZE) delete signingKeyCache[cacheQueue.shift()];
    let key = `AWS4${credentials.secretAccessKey}`;
    for (let signable of [shortDate, region, service, KEY_TYPE_IDENTIFIER])
      key = await hmac(sha256Constructor, key, signable);
    return (signingKeyCache[cacheKey] = key);
  };
  var clearCredentialCache = () => {
    cacheQueue.length = 0;
    Object.keys(signingKeyCache).forEach((cacheKey) => {
      delete signingKeyCache[cacheKey];
    });
  };
  var hmac = (ctor, secret, data) => {
    let hash = new ctor(secret);
    hash.update(utf8Module.toUint8Array(data));
    return hash.digest();
  };
  var getCanonicalHeaders = ({ headers }, unsignableHeaders, signableHeaders) => {
    let canonical = {};
    for (let headerName of Object.keys(headers).sort()) {
      if (headers[headerName] == null) continue;
      let canonicalHeaderName = headerName.toLowerCase();
      if (
        canonicalHeaderName in ALWAYS_UNSIGNABLE_HEADERS ||
        unsignableHeaders?.has(canonicalHeaderName) ||
        PROXY_HEADER_PATTERN.test(canonicalHeaderName) ||
        SEC_HEADER_PATTERN.test(canonicalHeaderName)
      ) {
        if (!signableHeaders || (signableHeaders && !signableHeaders.has(canonicalHeaderName))) continue;
      }
      canonical[canonicalHeaderName] = headers[headerName].trim().replace(/\s+/g, " ");
    }
    return canonical;
  };
  var getPayloadHash = async ({ headers, body }, sha256Constructor) => {
    for (let headerName of Object.keys(headers))
      if (headerName.toLowerCase() === SHA256_HEADER) return headers[headerName];
    if (body == null) return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    else if (typeof body === "string" || ArrayBuffer.isView(body) || isArrayBuffer.isArrayBuffer(body)) {
      let hasher = new sha256Constructor();
      hasher.update(utf8Module.toUint8Array(body));
      return toHex.toHex(await hasher.digest());
    }
    return UNSIGNED_PAYLOAD;
  };
  class HeaderFormatter {
    format(headers) {
      let chunks = [];
      for (let headerName of Object.keys(headers)) {
        let bytes = utf8Module.fromUtf8(headerName);
        chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
      }
      let out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
      let position = 0;
      for (let chunk of chunks) {
        out.set(chunk, position);
        position += chunk.byteLength;
      }
      return out;
    }
    formatHeaderValue(header) {
      switch (header.type) {
        case "boolean":
          return Uint8Array.from([header.value ? 0 : 1]);
        case "byte":
          return Uint8Array.from([2, header.value]);
        case "short":
          let dataView = new DataView(new ArrayBuffer(3));
          dataView.setUint8(0, 3);
          dataView.setInt16(1, header.value, false);
          return new Uint8Array(dataView.buffer);
        case "integer":
          let intView = new DataView(new ArrayBuffer(5));
          intView.setUint8(0, 4);
          intView.setInt32(1, header.value, false);
          return new Uint8Array(intView.buffer);
        case "long":
          let longBytes = new Uint8Array(9);
          longBytes[0] = 5;
          longBytes.set(header.value.bytes, 1);
          return longBytes;
        case "binary":
          let binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
          binView.setUint8(0, 6);
          binView.setUint16(1, header.value.byteLength, false);
          let binBytes = new Uint8Array(binView.buffer);
          binBytes.set(header.value, 3);
          return binBytes;
        case "string":
          let utf8Bytes = utf8Module.fromUtf8(header.value);
          let strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
          strView.setUint8(0, 7);
          strView.setUint16(1, utf8Bytes.byteLength, false);
          let strBytes = new Uint8Array(strView.buffer);
          strBytes.set(utf8Bytes, 3);
          return strBytes;
        case "timestamp":
          let tsBytes = new Uint8Array(9);
          tsBytes[0] = 8;
          tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
          return tsBytes;
        case "uuid":
          if (!UUID_PATTERN.test(header.value)) throw Error(`Invalid UUID received: ${header.value}`);
          let uuidBytes = new Uint8Array(17);
          uuidBytes[0] = 9;
          uuidBytes.set(toHex.fromHex(header.value.replace(/\-/g, "")), 1);
          return uuidBytes;
      }
    }
  }
  var UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  class Int64 {
    bytes;
    constructor(bytes) {
      this.bytes = bytes;
      if (bytes.byteLength !== 8) throw Error("Int64 buffers must be exactly 8 bytes");
    }
    static fromNumber(number) {
      if (number > 9223372036854776000 || number < -9223372036854776000)
        throw Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
      let bytes = new Uint8Array(8);
      for (
        let i = 7, remaining = Math.abs(Math.round(number));
        i > -1 && remaining > 0;
        i--, remaining /= 256
      )
        bytes[i] = remaining;
      if (number < 0) negate(bytes);
      return new Int64(bytes);
    }
    valueOf() {
      let bytes = this.bytes.slice(0);
      let negative = bytes[0] & 128;
      if (negative) negate(bytes);
      return parseInt(toHex.toHex(bytes), 16) * (negative ? -1 : 1);
    }
    toString() {
      return String(this.valueOf());
    }
  }
  function negate(bytes) {
    for (let i = 0; i < 8; i++) bytes[i] ^= 255;
    for (let i = 7; i > -1; i--) {
      bytes[i]++;
      if (bytes[i] !== 0) break;
    }
  }
  var hasHeader = (headerName, headers) => {
    headerName = headerName.toLowerCase();
    for (let key of Object.keys(headers)) if (headerName === key.toLowerCase()) return true;
    return false;
  };
  var moveHeadersToQuery = (request, options = {}) => {
    let { headers, query = {} } = protocolsModule.HttpRequest.clone(request);
    for (let key of Object.keys(headers)) {
      let lower = key.toLowerCase();
      if (
        (lower.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lower)) ||
        options.hoistableHeaders?.has(lower)
      ) {
        query[key] = headers[key];
        delete headers[key];
      }
    }
    return {
      ...request,
      headers,
      query,
    };
  };
  var prepareRequest = (request) => {
    request = protocolsModule.HttpRequest.clone(request);
    for (let key of Object.keys(request.headers))
      if (GENERATED_HEADERS.indexOf(key.toLowerCase()) > -1) delete request.headers[key];
    return request;
  };
  var getCanonicalQuery = ({ query = {} }) => {
    let keys = [];
    let serialized = {};
    for (let key of Object.keys(query)) {
      if (key.toLowerCase() === SIGNATURE_HEADER) continue;
      let encodedKey = escapeUri.escapeUri(key);
      keys.push(encodedKey);
      let value = query[key];
      if (typeof value === "string") serialized[encodedKey] = `${encodedKey}=${escapeUri.escapeUri(value)}`;
      else if (Array.isArray(value))
        serialized[encodedKey] = value
          .slice(0)
          .reduce((encoded, value) => encoded.concat([`${encodedKey}=${escapeUri.escapeUri(value)}`]), [])
          .sort()
          .join("&");
    }
    return keys
      .sort()
      .map((key) => serialized[key])
      .filter((serialized) => serialized)
      .join("&");
  };
  var iso8601 = (time) =>
    toDate(time)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");
  var toDate = (time) => {
    if (typeof time === "number") return new Date(time * 1000);
    if (typeof time === "string") {
      if (Number(time)) return new Date(Number(time) * 1000);
      return new Date(time);
    }
    return time;
  };
  class SignatureV4Base {
    service;
    regionProvider;
    credentialProvider;
    sha256;
    uriEscapePath;
    applyChecksum;
    constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
      this.service = service;
      this.sha256 = sha256;
      this.uriEscapePath = uriEscapePath;
      this.applyChecksum = typeof applyChecksum === "boolean" ? applyChecksum : true;
      this.regionProvider = normalizeProvider.normalizeProvider(region);
      this.credentialProvider = normalizeProvider.normalizeProvider(credentials);
    }
    createCanonicalRequest(request, canonicalHeaders, payloadHash) {
      let sortedHeaders = Object.keys(canonicalHeaders).sort();
      return `${request.method}
${this.getCanonicalPath(request)}
${getCanonicalQuery(request)}
${sortedHeaders.map((name) => `${name}:${canonicalHeaders[name]}`).join(`
`)}

${sortedHeaders.join(";")}
${payloadHash}`;
    }
    async createStringToSign(longDate, credentialScope, canonicalRequest, algorithmIdentifier) {
      let hash = new this.sha256();
      hash.update(utf8Module.toUint8Array(canonicalRequest));
      let hashedRequest = await hash.digest();
      return `${algorithmIdentifier}
${longDate}
${credentialScope}
${toHex.toHex(hashedRequest)}`;
    }
    getCanonicalPath({ path }) {
      if (this.uriEscapePath) {
        let normalizedPathSegments = [];
        for (let pathSegment of path.split("/")) {
          if (pathSegment?.length === 0) continue;
          if (pathSegment === ".") continue;
          if (pathSegment === "..") normalizedPathSegments.pop();
          else normalizedPathSegments.push(pathSegment);
        }
        let normalizedPath = `${path?.startsWith("/") ? "/" : ""}${normalizedPathSegments.join("/")}${normalizedPathSegments.length > 0 && path?.endsWith("/") ? "/" : ""}`;
        return escapeUri.escapeUri(normalizedPath).replace(/%2F/g, "/");
      }
      return path;
    }
    validateResolvedCredentials(credentials) {
      if (
        typeof credentials !== "object" ||
        typeof credentials.accessKeyId !== "string" ||
        typeof credentials.secretAccessKey !== "string"
      )
        throw Error("Resolved credential object is not valid");
    }
    formatDate(now) {
      let longDate = iso8601(now).replace(/[\-:]/g, "");
      return {
        longDate,
        shortDate: longDate.slice(0, 8),
      };
    }
    getCanonicalHeaderList(headers) {
      return Object.keys(headers).sort().join(";");
    }
  }
  class SignatureV4 extends SignatureV4Base {
    headerFormatter = new HeaderFormatter();
    constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
      super({
        applyChecksum,
        credentials,
        region,
        service,
        sha256,
        uriEscapePath,
      });
    }
    async presign(originalRequest, options = {}) {
      let {
        signingDate = new Date(),
        expiresIn = 3600,
        unsignableHeaders,
        unhoistableHeaders,
        signableHeaders,
        hoistableHeaders,
        signingRegion,
        signingService,
      } = options;
      let credentials = await this.credentialProvider();
      this.validateResolvedCredentials(credentials);
      let region = signingRegion ?? (await this.regionProvider());
      let { longDate, shortDate } = this.formatDate(signingDate);
      if (expiresIn > MAX_PRESIGNED_TTL)
        return Promise.reject(
          "Signature version 4 presigned URLs must have an expiration date less than one week in the future",
        );
      let scope = createScope(shortDate, region, signingService ?? this.service);
      let request = moveHeadersToQuery(prepareRequest(originalRequest), {
        unhoistableHeaders,
        hoistableHeaders,
      });
      if (credentials.sessionToken) request.query[TOKEN_QUERY_PARAM] = credentials.sessionToken;
      request.query[ALGORITHM_QUERY_PARAM] = ALGORITHM_IDENTIFIER;
      request.query[CREDENTIAL_QUERY_PARAM] = `${credentials.accessKeyId}/${scope}`;
      request.query[AMZ_DATE_QUERY_PARAM] = longDate;
      request.query[EXPIRES_QUERY_PARAM] = expiresIn.toString(10);
      let canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
      request.query[SIGNED_HEADERS_QUERY_PARAM] = this.getCanonicalHeaderList(canonicalHeaders);
      request.query[SIGNATURE_QUERY_PARAM] = await this.getSignature(
        longDate,
        scope,
        this.getSigningKey(credentials, region, shortDate, signingService),
        this.createCanonicalRequest(
          request,
          canonicalHeaders,
          await getPayloadHash(originalRequest, this.sha256),
        ),
      );
      return request;
    }
    async sign(toSign, options) {
      if (typeof toSign === "string") return this.signString(toSign, options);
      else if (toSign.headers && toSign.payload) return this.signEvent(toSign, options);
      else if (toSign.message) return this.signMessage(toSign, options);
      else return this.signRequest(toSign, options);
    }
    async signEvent(
      { headers, payload },
      { signingDate = new Date(), priorSignature, signingRegion, signingService },
    ) {
      let region = signingRegion ?? (await this.regionProvider());
      let { shortDate, longDate } = this.formatDate(signingDate);
      let scope = createScope(shortDate, region, signingService ?? this.service);
      let hashedPayload = await getPayloadHash(
        {
          headers: {},
          body: payload,
        },
        this.sha256,
      );
      let hash = new this.sha256();
      hash.update(headers);
      let hashedHeaders = toHex.toHex(await hash.digest());
      let stringToSign = [
        EVENT_ALGORITHM_IDENTIFIER,
        longDate,
        scope,
        priorSignature,
        hashedHeaders,
        hashedPayload,
      ].join(`
`);
      return this.signString(stringToSign, {
        signingDate,
        signingRegion: region,
        signingService,
      });
    }
    async signMessage(signableMessage, { signingDate = new Date(), signingRegion, signingService }) {
      return this.signEvent(
        {
          headers: this.headerFormatter.format(signableMessage.message.headers),
          payload: signableMessage.message.body,
        },
        {
          signingDate,
          signingRegion,
          signingService,
          priorSignature: signableMessage.priorSignature,
        },
      ).then((signature) => ({
        message: signableMessage.message,
        signature,
      }));
    }
    async signString(stringToSign, { signingDate = new Date(), signingRegion, signingService } = {}) {
      let credentials = await this.credentialProvider();
      this.validateResolvedCredentials(credentials);
      let region = signingRegion ?? (await this.regionProvider());
      let { shortDate } = this.formatDate(signingDate);
      let hash = new this.sha256(await this.getSigningKey(credentials, region, shortDate, signingService));
      hash.update(utf8Module.toUint8Array(stringToSign));
      return toHex.toHex(await hash.digest());
    }
    async signRequest(
      requestToSign,
      { signingDate = new Date(), signableHeaders, unsignableHeaders, signingRegion, signingService } = {},
    ) {
      let credentials = await this.credentialProvider();
      this.validateResolvedCredentials(credentials);
      let region = signingRegion ?? (await this.regionProvider());
      let request = prepareRequest(requestToSign);
      let { longDate, shortDate } = this.formatDate(signingDate);
      let scope = createScope(shortDate, region, signingService ?? this.service);
      request.headers[AMZ_DATE_HEADER] = longDate;
      if (credentials.sessionToken) request.headers[TOKEN_HEADER] = credentials.sessionToken;
      let payloadHash = await getPayloadHash(request, this.sha256);
      if (!hasHeader(SHA256_HEADER, request.headers) && this.applyChecksum)
        request.headers[SHA256_HEADER] = payloadHash;
      let canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
      let signature = await this.getSignature(
        longDate,
        scope,
        this.getSigningKey(credentials, region, shortDate, signingService),
        this.createCanonicalRequest(request, canonicalHeaders, payloadHash),
      );
      request.headers[AUTH_HEADER] =
        `${ALGORITHM_IDENTIFIER} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${this.getCanonicalHeaderList(canonicalHeaders)}, Signature=${signature}`;
      return request;
    }
    async getSignature(longDate, credentialScope, keyPromise, canonicalRequest) {
      let stringToSign = await this.createStringToSign(
        longDate,
        credentialScope,
        canonicalRequest,
        ALGORITHM_IDENTIFIER,
      );
      let hash = new this.sha256(await keyPromise);
      hash.update(utf8Module.toUint8Array(stringToSign));
      return toHex.toHex(await hash.digest());
    }
    getSigningKey(credentials, region, shortDate, service) {
      return getSigningKey(this.sha256, credentials, shortDate, region, service || this.service);
    }
  }
  var signatureV4aContainer = {
    SignatureV4a: null,
  };
  cjsExports.ALGORITHM_IDENTIFIER = ALGORITHM_IDENTIFIER;
  cjsExports.ALGORITHM_IDENTIFIER_V4A = ALGORITHM_IDENTIFIER_V4A;
  cjsExports.ALGORITHM_QUERY_PARAM = ALGORITHM_QUERY_PARAM;
  cjsExports.ALWAYS_UNSIGNABLE_HEADERS = ALWAYS_UNSIGNABLE_HEADERS;
  cjsExports.AMZ_DATE_HEADER = AMZ_DATE_HEADER;
  cjsExports.AMZ_DATE_QUERY_PARAM = AMZ_DATE_QUERY_PARAM;
  cjsExports.AUTH_HEADER = AUTH_HEADER;
  cjsExports.CREDENTIAL_QUERY_PARAM = CREDENTIAL_QUERY_PARAM;
  cjsExports.DATE_HEADER = DATE_HEADER;
  cjsExports.EVENT_ALGORITHM_IDENTIFIER = EVENT_ALGORITHM_IDENTIFIER;
  cjsExports.EXPIRES_QUERY_PARAM = EXPIRES_QUERY_PARAM;
  cjsExports.GENERATED_HEADERS = GENERATED_HEADERS;
  cjsExports.HOST_HEADER = HOST_HEADER;
  cjsExports.KEY_TYPE_IDENTIFIER = KEY_TYPE_IDENTIFIER;
  cjsExports.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
  cjsExports.MAX_PRESIGNED_TTL = MAX_PRESIGNED_TTL;
  cjsExports.PROXY_HEADER_PATTERN = PROXY_HEADER_PATTERN;
  cjsExports.REGION_SET_PARAM = REGION_SET_PARAM;
  cjsExports.SEC_HEADER_PATTERN = SEC_HEADER_PATTERN;
  cjsExports.SHA256_HEADER = SHA256_HEADER;
  cjsExports.SIGNATURE_HEADER = SIGNATURE_HEADER;
  cjsExports.SIGNATURE_QUERY_PARAM = SIGNATURE_QUERY_PARAM;
  cjsExports.SIGNED_HEADERS_QUERY_PARAM = SIGNED_HEADERS_QUERY_PARAM;
  cjsExports.SignatureV4 = SignatureV4;
  cjsExports.SignatureV4Base = SignatureV4Base;
  cjsExports.TOKEN_HEADER = TOKEN_HEADER;
  cjsExports.TOKEN_QUERY_PARAM = TOKEN_QUERY_PARAM;
  cjsExports.UNSIGNABLE_PATTERNS = UNSIGNABLE_PATTERNS;
  cjsExports.UNSIGNED_PAYLOAD = UNSIGNED_PAYLOAD;
  cjsExports.clearCredentialCache = clearCredentialCache;
  cjsExports.createScope = createScope;
  cjsExports.getCanonicalHeaders = getCanonicalHeaders;
  cjsExports.getCanonicalQuery = getCanonicalQuery;
  cjsExports.getPayloadHash = getPayloadHash;
  cjsExports.getSigningKey = getSigningKey;
  cjsExports.hasHeader = hasHeader;
  cjsExports.moveHeadersToQuery = moveHeadersToQuery;
  cjsExports.prepareRequest = prepareRequest;
  cjsExports.signatureV4aContainer = signatureV4aContainer;
});
export { require_signature_v4 };
