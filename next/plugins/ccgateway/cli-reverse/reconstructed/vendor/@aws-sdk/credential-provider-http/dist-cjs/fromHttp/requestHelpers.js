/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/requestHelpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-48h98ags.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../../@smithy/property-provider/dist-cjs/index.js";
import { require_protocol_http } from "../../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_util_stream } from "../../../../@smithy/util-stream/dist-cjs/index.js";

//@ chunk-48h98ags.js:1266-1315 esm-layout
var config_1 = __toESM(require_property_provider());
var import_protocol_http = __toESM(require_protocol_http());
var import_client_2 = __toESM(require_client());
var serde_2 = __toESM(require_util_stream());
//@ chunk-48h98ags.js:1315-1525 esm-fingerprint
function createGetRequest(url) {
  return new import_protocol_http.HttpRequest({
    protocol: url.protocol,
    hostname: url.hostname,
    port: Number(url.port),
    path: url.pathname,
    query: Array.from(url.searchParams.entries()).reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {}),
    fragment: url.hash,
  });
}
//@ chunk-48h98ags.js:1525-2461 esm-fingerprint
async function getCredentials(response, logger) {
  let str = await serde_2.sdkStreamMixin(response.body).transformToString();
  if (response.statusCode === 200) {
    let parsed = JSON.parse(str);
    if (
      typeof parsed.AccessKeyId !== "string" ||
      typeof parsed.SecretAccessKey !== "string" ||
      typeof parsed.Token !== "string" ||
      typeof parsed.Expiration !== "string"
    )
      throw new config_1.CredentialsProviderError(
        "HTTP credential provider response not of the required format, an object matching: { AccessKeyId: string, SecretAccessKey: string, Token: string, Expiration: string(rfc3339) }",
        {
          logger,
        },
      );
    return {
      accessKeyId: parsed.AccessKeyId,
      secretAccessKey: parsed.SecretAccessKey,
      sessionToken: parsed.Token,
      expiration: import_client_2.parseRfc3339DateTime(parsed.Expiration),
    };
  }
  if (response.statusCode >= 400 && response.statusCode < 500) {
    let parsedBody = {};
    try {
      parsedBody = JSON.parse(str);
    } catch (e) {}
    throw Object.assign(
      new config_1.CredentialsProviderError(`Server responded with status: ${response.statusCode}`, {
        logger,
      }),
      {
        Code: parsedBody.Code,
        Message: parsedBody.Message,
      },
    );
  }
  throw new config_1.CredentialsProviderError(`Server responded with status: ${response.statusCode}`, {
    logger,
  });
}
export { createGetRequest, getCredentials };
