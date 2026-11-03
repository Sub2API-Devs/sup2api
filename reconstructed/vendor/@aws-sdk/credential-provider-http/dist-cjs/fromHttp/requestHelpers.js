/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/requestHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-0c72454j.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../../@smithy/property-provider/dist-cjs/index.js";
import { require_protocol_http } from "../../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_client } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_util_stream } from "../../../../@smithy/util-stream/dist-cjs/index.js";

//@ chunk-0c72454j.js:1266-1315 esm-layout
var config_1 = Re(require_property_provider());
var import_protocol_http = Re(require_protocol_http());
var import_client_2 = Re(require_client());
var serde_2 = Re(require_util_stream());
//@ chunk-0c72454j.js:1315-1525 esm-fingerprint
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
//@ chunk-0c72454j.js:1525-2461 esm-fingerprint
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
