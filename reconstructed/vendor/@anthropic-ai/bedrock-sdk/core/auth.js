/**
 * @anthropic-ai/bedrock-sdk/core/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (1)
 * attribution: esm-fingerprint 1
 */
import assert, { default as assert_2 } from "assert";
import { D, x, M, K } from "../internal/errors.mjs";
import { ef } from "../../sdk/core/error.mjs";
import { Sha256 } from "../../../@aws-crypto/sha256-js/build/module/jsSha256.js";

//@ chunk-h87x8cg3.js:1564-3110 esm-fingerprint
var ue = (e) =>
    import("./chunk-thwbpw6e.js")
      .then(
        ({
          createCredentialChain: createCredentialChain,
          fromEnv: fromEnv,
          fromNodeProviderChain: fromNodeProviderChain,
        }) =>
          createCredentialChain(
            fromEnv(e != null ? { logger: e } : {}),
            fromNodeProviderChain({
              ...(e != null ? { logger: e } : {}),
              clientConfig: {
                ...(e != null ? { logger: e } : {}),
                requestHandler: new D.FetchHttpHandler({ requestInit: (s) => ({ ...s }) }),
              },
            }),
          ),
      )
      .catch((t) => {
        throw Error(
          `Failed to import '@aws-sdk/credential-providers'.You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicBedrock({ providerChainResolver })\` Original error: ${t.message}`,
        );
      }),
  U = async (e, t) => {
    assert(e.method, "Expected request method property to be set");
    let r;
    if (t.awsAccessKey && t.awsSecretKey)
      r = {
        accessKeyId: t.awsAccessKey,
        secretAccessKey: t.awsSecretKey,
        ...(t.awsSessionToken != null && { sessionToken: t.awsSessionToken }),
      };
    else {
      let l = await (t.providerChainResolver ? t.providerChainResolver() : ue(t.logger));
      try {
        r = await l();
      } catch (error) {
        throw new ef({
          message: "Failed to resolve AWS credentials from the credential provider chain.",
          cause: x(error),
        });
      }
    }
    let n = new M.SignatureV4({ service: "bedrock", region: t.regionName, credentials: r, sha256: Sha256 }),
      s = new URL(t.url),
      o = !e.headers
        ? {}
        : Symbol.iterator in e.headers
          ? Object.fromEntries(Array.from(e.headers).map((l) => [...l]))
          : { ...e.headers };
    (delete o.connection, (o.host = s.host));
    let fromEntries = Object.fromEntries(
        [...new Set(s.searchParams.keys())].map((l) => [l, s.searchParams.getAll(l)]),
      ),
      a = new K.HttpRequest({
        method: e.method.toUpperCase(),
        protocol: s.protocol,
        path: s.pathname,
        query: fromEntries,
        headers: o,
        body: e.body,
      });
    return (await n.sign(a)).headers;
  };

export { U };
