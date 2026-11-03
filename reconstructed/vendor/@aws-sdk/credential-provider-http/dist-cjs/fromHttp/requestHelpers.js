/**
 * @aws-sdk/credential-provider-http/dist-cjs/fromHttp/requestHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-http@3.936.0..3.972.41
 * pieces: chunk-0c72454j.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { $h } from "../../../../@smithy/property-provider/dist-cjs/index.js";
import { Kg } from "../../../../@smithy/protocol-http/dist-cjs/index.js";
import { ff } from "../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { Xns } from "../../../../@smithy/util-stream/dist-cjs/index.js";

//@ chunk-0c72454j.js:1266-1315 esm-layout
var i = Re($h()),
  C = Re(Kg()),
  l = Re(ff()),
  p = Re(Xns());
//@ chunk-0c72454j.js:1315-1525 esm-fingerprint
function _(e) {
  return new C.HttpRequest({
    protocol: e.protocol,
    hostname: e.hostname,
    port: Number(e.port),
    path: e.pathname,
    query: Array.from(e.searchParams.entries()).reduce((o, [n, r]) => ((o[n] = r), o), {}),
    fragment: e.hash,
  });
}
//@ chunk-0c72454j.js:1525-2461 esm-fingerprint
async function I(e, o) {
  let transformToString = await p.sdkStreamMixin(e.body).transformToString();
  if (e.statusCode === 200) {
    let parsed = JSON.parse(transformToString);
    if (
      typeof parsed.AccessKeyId !== "string" ||
      typeof parsed.SecretAccessKey !== "string" ||
      typeof parsed.Token !== "string" ||
      typeof parsed.Expiration !== "string"
    )
      throw new i.CredentialsProviderError(
        "HTTP credential provider response not of the required format, an object matching: { AccessKeyId: string, SecretAccessKey: string, Token: string, Expiration: string(rfc3339) }",
        { logger: o },
      );
    return {
      accessKeyId: parsed.AccessKeyId,
      secretAccessKey: parsed.SecretAccessKey,
      sessionToken: parsed.Token,
      expiration: l.parseRfc3339DateTime(parsed.Expiration),
    };
  }
  if (e.statusCode >= 400 && e.statusCode < 500) {
    let t = {};
    try {
      t = JSON.parse(transformToString);
    } catch (error) {}
    throw Object.assign(
      new i.CredentialsProviderError(`Server responded with status: ${e.statusCode}`, { logger: o }),
      { Code: t.Code, Message: t.Message },
    );
  }
  throw new i.CredentialsProviderError(`Server responded with status: ${e.statusCode}`, { logger: o });
}

export { _, I };
