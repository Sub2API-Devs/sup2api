/**
 * @anthropic-ai/bedrock-sdk/core/aws-auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (2), chunk-qhhcfyds.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import assert, { default as assert_2 } from "assert";
import { Re } from "../../../../runtime/bun-runtime.js";
import { nke } from "../../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { yat } from "../../../@smithy/signature-v4/dist-cjs/index.js";
import { ef } from "../../sdk/core/error.mjs";
import { x, k, j_qhhc, D_qhhc, N } from "../internal/errors.mjs";
import { Sha256 } from "../../../@aws-crypto/sha256-js/build/module/jsSha256.js";

//@ chunk-h87x8cg3.js:14028-14076 esm-layout
var ne = Re(nke(), 1),
  oe = Re(Kg(), 1),
  se = Re(yat(), 1);
//@ chunk-h87x8cg3.js:14099-15740 esm-fingerprint
var Fe = (e, t) =>
    import("./chunk-thwbpw6e.js")
      .then(
        ({
          createCredentialChain: createCredentialChain,
          fromEnv: fromEnv,
          fromNodeProviderChain: fromNodeProviderChain,
        }) => {
          let o = fromNodeProviderChain({
            ...(e != null ? { profile: e } : {}),
            ...(t != null ? { logger: t } : {}),
            clientConfig: {
              ...(t != null ? { logger: t } : {}),
              requestHandler: new ne.FetchHttpHandler({ requestInit: (i) => ({ ...i }) }),
            },
          });
          if (e != null) return o;
          return createCredentialChain(fromEnv(t != null ? { logger: t } : {}), o);
        },
      )
      .catch((r) => {
        throw Error(
          `Failed to import '@aws-sdk/credential-providers'. You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicAws({ providerChainResolver })\` Original error: ${r.message}`,
        );
      }),
  ae = async (e, t) => {
    assert_2(e.method, "Expected request method property to be set");
    let r;
    if (t.awsAccessKey && t.awsSecretAccessKey)
      r = {
        accessKeyId: t.awsAccessKey,
        secretAccessKey: t.awsSecretAccessKey,
        ...(t.awsSessionToken != null && { sessionToken: t.awsSessionToken }),
      };
    else {
      let l = await (t.providerChainResolver ? t.providerChainResolver() : Fe(t.awsProfile, t.logger));
      try {
        r = await l();
      } catch (error) {
        throw new ef({
          message: "Failed to resolve AWS credentials from the credential provider chain.",
          cause: x(error),
        });
      }
    }
    let n = new se.SignatureV4({
        service: t.serviceName,
        region: t.regionName,
        credentials: r,
        sha256: Sha256,
      }),
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
      a = new oe.HttpRequest({
        method: e.method.toUpperCase(),
        protocol: s.protocol,
        path: s.pathname,
        query: fromEntries,
        headers: o,
        body: e.body,
      });
    return (await n.sign(a)).headers;
  };
//@ chunk-qhhcfyds.js:2899-4536 esm-fingerprint
var te = (e, t) =>
    import("./chunk-thwbpw6e.js")
      .then(
        ({
          createCredentialChain: createCredentialChain,
          fromEnv: fromEnv,
          fromNodeProviderChain: fromNodeProviderChain,
        }) => {
          let i = fromNodeProviderChain({
            ...(e != null ? { profile: e } : {}),
            ...(t != null ? { logger: t } : {}),
            clientConfig: {
              ...(t != null ? { logger: t } : {}),
              requestHandler: new k.FetchHttpHandler({ requestInit: (s) => ({ ...s }) }),
            },
          });
          if (e != null) return i;
          return createCredentialChain(fromEnv(t != null ? { logger: t } : {}), i);
        },
      )
      .catch((r) => {
        throw Error(
          `Failed to import '@aws-sdk/credential-providers'. You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicAws({ providerChainResolver })\` Original error: ${r.message}`,
        );
      }),
  F = async (e, t) => {
    assert(e.method, "Expected request method property to be set");
    let r;
    if (t.awsAccessKey && t.awsSecretAccessKey)
      r = {
        accessKeyId: t.awsAccessKey,
        secretAccessKey: t.awsSecretAccessKey,
        ...(t.awsSessionToken != null && { sessionToken: t.awsSessionToken }),
      };
    else {
      let c = await (t.providerChainResolver ? t.providerChainResolver() : te(t.awsProfile, t.logger));
      try {
        r = await c();
      } catch (error) {
        throw new ef({
          message: "Failed to resolve AWS credentials from the credential provider chain.",
          cause: j_qhhc(error),
        });
      }
    }
    let n = new D_qhhc.SignatureV4({
        service: t.serviceName,
        region: t.regionName,
        credentials: r,
        sha256: Sha256,
      }),
      o = new URL(t.url),
      i = !e.headers
        ? {}
        : Symbol.iterator in e.headers
          ? Object.fromEntries(Array.from(e.headers).map((c) => [...c]))
          : { ...e.headers };
    (delete i.connection, (i.host = o.host));
    let fromEntries = Object.fromEntries(
        [...new Set(o.searchParams.keys())].map((c) => [c, o.searchParams.getAll(c)]),
      ),
      a = new N.HttpRequest({
        method: e.method.toUpperCase(),
        protocol: o.protocol,
        path: o.pathname,
        query: fromEntries,
        headers: i,
        body: e.body,
      });
    return (await n.sign(a)).headers;
  };

export { ae, F };
