/**
 * @anthropic-ai/bedrock-sdk/core/auth.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import assert from "assert";
import {
  import_fetch_http_handler,
  castToError_2,
  import_signature_v4,
  import_protocol_http,
} from "../internal/errors.mjs";
import { APIConnectionError } from "../../sdk/core/error.mjs";
import { Sha256 } from "../../../@aws-crypto/sha256-js/build/module/jsSha256.js";

//@ chunk-b8zxeazh.js:1564-3110 esm-fingerprint
var DEFAULT_PROVIDER_CHAIN_RESOLVER = (logger) =>
  import("../../../@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js")
    .then(({ createCredentialChain, fromEnv, fromNodeProviderChain }) =>
      createCredentialChain(
        fromEnv(
          logger != null
            ? {
                logger,
              }
            : {},
        ),
        fromNodeProviderChain({
          ...(logger != null
            ? {
                logger,
              }
            : {}),
          clientConfig: {
            ...(logger != null
              ? {
                  logger,
                }
              : {}),
            requestHandler: new import_fetch_http_handler.FetchHttpHandler({
              requestInit: (httpRequest) => ({
                ...httpRequest,
              }),
            }),
          },
        }),
      ),
    )
    .catch((error) => {
      throw Error(
        `Failed to import '@aws-sdk/credential-providers'.You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicBedrock({ providerChainResolver })\` Original error: ${error.message}`,
      );
    });
var getAuthHeaders = async (req, props) => {
  assert(req.method, "Expected request method property to be set");
  let credentials;
  if (props.awsAccessKey && props.awsSecretKey)
    credentials = {
      accessKeyId: props.awsAccessKey,
      secretAccessKey: props.awsSecretKey,
      ...(props.awsSessionToken != null && {
        sessionToken: props.awsSessionToken,
      }),
    };
  else {
    let provider = await (props.providerChainResolver
      ? props.providerChainResolver()
      : DEFAULT_PROVIDER_CHAIN_RESOLVER(props.logger));
    try {
      credentials = await provider();
    } catch (err) {
      throw new APIConnectionError({
        message: "Failed to resolve AWS credentials from the credential provider chain.",
        cause: castToError_2(err),
      });
    }
  }
  let signer = new import_signature_v4.SignatureV4({
    service: "bedrock",
    region: props.regionName,
    credentials,
    sha256: Sha256,
  });
  let url = new URL(props.url);
  let headers = !req.headers
    ? {}
    : Symbol.iterator in req.headers
      ? Object.fromEntries(Array.from(req.headers).map((header) => [...header]))
      : {
          ...req.headers,
        };
  delete headers.connection;
  headers.host = url.host;
  let query = Object.fromEntries(
    [...new Set(url.searchParams.keys())].map((key) => [key, url.searchParams.getAll(key)]),
  );
  let request = new import_protocol_http.HttpRequest({
    method: req.method.toUpperCase(),
    protocol: url.protocol,
    path: url.pathname,
    query,
    headers,
    body: req.body,
  });
  return (await signer.sign(request)).headers;
};
export { getAuthHeaders };
