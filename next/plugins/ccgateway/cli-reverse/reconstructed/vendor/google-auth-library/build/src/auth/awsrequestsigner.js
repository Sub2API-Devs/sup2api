/**
 * google-auth-library/build/src/auth/awsrequestsigner.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_crypto_3 } from "../crypto/crypto.js";

//@ chunk-e8d3a8an.js:121087-123454 cjs-fingerprint
var require_awsrequestsigner = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AwsRequestSigner = undefined;
  var gaxios_1 = require_gaxios_2();
  var crypto_1 = require_crypto_3();
  var AWS_ALGORITHM = "AWS4-HMAC-SHA256";
  var AWS_REQUEST_TYPE = "aws4_request";
  class AwsRequestSigner {
    getCredentials;
    region;
    crypto;
    constructor(getCredentials, region) {
      this.getCredentials = getCredentials;
      this.region = region;
      this.crypto = crypto_1.createCrypto();
    }
    async getRequestOptions(amzOptions) {
      if (!amzOptions.url) throw RangeError('"url" is required in "amzOptions"');
      let requestPayloadData =
        typeof amzOptions.data === "object" ? JSON.stringify(amzOptions.data) : amzOptions.data;
      let url = amzOptions.url;
      let method = amzOptions.method || "GET";
      let requestPayload = amzOptions.body || requestPayloadData;
      let additionalAmzHeaders = amzOptions.headers;
      let awsSecurityCredentials = await this.getCredentials();
      let uri = new URL(url);
      if (typeof requestPayload !== "string" && requestPayload !== undefined)
        throw TypeError(`'requestPayload' is expected to be a string if provided. Got: ${requestPayload}`);
      let headerMap = await generateAuthenticationHeaderMap({
        crypto: this.crypto,
        host: uri.host,
        canonicalUri: uri.pathname,
        canonicalQuerystring: uri.search.slice(1),
        method,
        region: this.region,
        securityCredentials: awsSecurityCredentials,
        requestPayload,
        additionalAmzHeaders,
      });
      let headers = gaxios_1.Gaxios.mergeHeaders(
        headerMap.amzDate
          ? {
              "x-amz-date": headerMap.amzDate,
            }
          : {},
        {
          authorization: headerMap.authorizationHeader,
          host: uri.host,
        },
        additionalAmzHeaders || {},
      );
      if (awsSecurityCredentials.token)
        gaxios_1.Gaxios.mergeHeaders(headers, {
          "x-amz-security-token": awsSecurityCredentials.token,
        });
      let awsSignedReq = {
        url,
        method,
        headers,
      };
      if (requestPayload !== undefined) awsSignedReq.body = requestPayload;
      return awsSignedReq;
    }
  }
  cjsExports.AwsRequestSigner = AwsRequestSigner;
  async function sign(signer, key, msg) {
    return await signer.signWithHmacSha256(key, msg);
  }
  async function getSigningKey(signer, key, dateStamp, region, serviceName) {
    let kDate = await sign(signer, `AWS4${key}`, dateStamp);
    let kRegion = await sign(signer, kDate, region);
    let kService = await sign(signer, kRegion, serviceName);
    return await sign(signer, kService, "aws4_request");
  }
  async function generateAuthenticationHeaderMap(options) {
    let additionalAmzHeaders = gaxios_1.Gaxios.mergeHeaders(options.additionalAmzHeaders);
    let requestPayload = options.requestPayload || "";
    let serviceName = options.host.split(".")[0];
    let now = new Date();
    let amzDate = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.[0-9]+/, "");
    let dateStamp = now.toISOString().replace(/[-]/g, "").replace(/T.*/, "");
    if (options.securityCredentials.token)
      additionalAmzHeaders.set("x-amz-security-token", options.securityCredentials.token);
    let amzHeaders = gaxios_1.Gaxios.mergeHeaders(
      {
        host: options.host,
      },
      additionalAmzHeaders.has("date")
        ? {}
        : {
            "x-amz-date": amzDate,
          },
      additionalAmzHeaders,
    );
    let canonicalHeaders = "";
    let signedHeadersList = [...amzHeaders.keys()].sort();
    signedHeadersList.forEach((key) => {
      canonicalHeaders += `${key}:${amzHeaders.get(key)}
`;
    });
    let signedHeaders = signedHeadersList.join(";");
    let payloadHash = await options.crypto.sha256DigestHex(requestPayload);
    let canonicalRequest = `${options.method.toUpperCase()}
${options.canonicalUri}
${options.canonicalQuerystring}
${canonicalHeaders}
${signedHeaders}
${payloadHash}`;
    let credentialScope = `${dateStamp}/${options.region}/${serviceName}/${AWS_REQUEST_TYPE}`;
    let stringToSign =
      `${AWS_ALGORITHM}
${amzDate}
${credentialScope}
` + (await options.crypto.sha256DigestHex(canonicalRequest));
    let signingKey = await getSigningKey(
      options.crypto,
      options.securityCredentials.secretAccessKey,
      dateStamp,
      options.region,
      serviceName,
    );
    let signature = await sign(options.crypto, signingKey, stringToSign);
    let authorizationHeader = `${AWS_ALGORITHM} Credential=${options.securityCredentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${crypto_1.fromArrayBufferToHex(signature)}`;
    return {
      amzDate: additionalAmzHeaders.has("date") ? undefined : amzDate,
      authorizationHeader,
      canonicalQuerystring: options.canonicalQuerystring,
    };
  }
});
export { require_awsrequestsigner };
