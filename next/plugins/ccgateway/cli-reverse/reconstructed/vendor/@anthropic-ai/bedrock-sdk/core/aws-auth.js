/**
 * @anthropic-ai/bedrock-sdk/core/aws-auth.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (2), chunk-f7kbssbx.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import assert from "assert";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_signature_v4 } from "../../../@smithy/signature-v4/dist-cjs/index.js";
import { APIConnectionError } from "../../sdk/core/error.mjs";
import {
  castToError_2,
  import_fetch_http_handler_2,
  castToError_3,
  import_signature_v4_2_2,
  import_protocol_http_2_2,
} from "../internal/errors.mjs";
import { Sha256 } from "../../../@aws-crypto/sha256-js/build/module/jsSha256.js";

//@ chunk-b8zxeazh.js:14028-14076 esm-layout
var import_fetch_http_handler_3 = __toESM(require_fetch_http_handler(), 1);
var import_protocol_http_2 = __toESM(require_protocol_http(), 1);
var import_signature_v4_2 = __toESM(require_signature_v4(), 1);
//@ chunk-b8zxeazh.js:14099-15740 esm-fingerprint
var defaultProviderChainResolver_2 = (profile, logger) =>
  import("../../../@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js")
    .then(({ createCredentialChain, fromEnv, fromNodeProviderChain }) => {
      let nodeProviderChain = fromNodeProviderChain({
        ...(profile != null
          ? {
              profile,
            }
          : {}),
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
          requestHandler: new import_fetch_http_handler_3.FetchHttpHandler({
            requestInit: (httpRequest) => ({
              ...httpRequest,
            }),
          }),
        },
      });
      if (profile != null) return nodeProviderChain;
      return createCredentialChain(
        fromEnv(
          logger != null
            ? {
                logger,
              }
            : {},
        ),
        nodeProviderChain,
      );
    })
    .catch((error) => {
      throw Error(
        `Failed to import '@aws-sdk/credential-providers'. You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicAws({ providerChainResolver })\` Original error: ${error.message}`,
      );
    });
var getAuthHeaders_2 = async (req, props) => {
  assert(req.method, "Expected request method property to be set");
  let credentials;
  if (props.awsAccessKey && props.awsSecretAccessKey)
    credentials = {
      accessKeyId: props.awsAccessKey,
      secretAccessKey: props.awsSecretAccessKey,
      ...(props.awsSessionToken != null && {
        sessionToken: props.awsSessionToken,
      }),
    };
  else {
    let provider = await (props.providerChainResolver
      ? props.providerChainResolver()
      : defaultProviderChainResolver_2(props.awsProfile, props.logger));
    try {
      credentials = await provider();
    } catch (err) {
      throw new APIConnectionError({
        message: "Failed to resolve AWS credentials from the credential provider chain.",
        cause: castToError_2(err),
      });
    }
  }
  let signer = new import_signature_v4_2.SignatureV4({
    service: props.serviceName,
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
  let request = new import_protocol_http_2.HttpRequest({
    method: req.method.toUpperCase(),
    protocol: url.protocol,
    path: url.pathname,
    query,
    headers,
    body: req.body,
  });
  return (await signer.sign(request)).headers;
};
//@ chunk-f7kbssbx.js:2899-4536 esm-fingerprint
var defaultProviderChainResolver = (profile, logger) =>
  import("../../../@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js")
    .then(({ createCredentialChain, fromEnv, fromNodeProviderChain }) => {
      let nodeProviderChain = fromNodeProviderChain({
        ...(profile != null
          ? {
              profile,
            }
          : {}),
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
          requestHandler: new import_fetch_http_handler_2.FetchHttpHandler({
            requestInit: (httpRequest) => ({
              ...httpRequest,
            }),
          }),
        },
      });
      if (profile != null) return nodeProviderChain;
      return createCredentialChain(
        fromEnv(
          logger != null
            ? {
                logger,
              }
            : {},
        ),
        nodeProviderChain,
      );
    })
    .catch((error) => {
      throw Error(
        `Failed to import '@aws-sdk/credential-providers'. You can provide a custom \`providerChainResolver\` in the client options if your runtime does not have access to '@aws-sdk/credential-providers': \`new AnthropicAws({ providerChainResolver })\` Original error: ${error.message}`,
      );
    });
var getAuthHeaders = async (req, props) => {
  assert(req.method, "Expected request method property to be set");
  let credentials;
  if (props.awsAccessKey && props.awsSecretAccessKey)
    credentials = {
      accessKeyId: props.awsAccessKey,
      secretAccessKey: props.awsSecretAccessKey,
      ...(props.awsSessionToken != null && {
        sessionToken: props.awsSessionToken,
      }),
    };
  else {
    let provider = await (props.providerChainResolver
      ? props.providerChainResolver()
      : defaultProviderChainResolver(props.awsProfile, props.logger));
    try {
      credentials = await provider();
    } catch (err) {
      throw new APIConnectionError({
        message: "Failed to resolve AWS credentials from the credential provider chain.",
        cause: castToError_3(err),
      });
    }
  }
  let signer = new import_signature_v4_2_2.SignatureV4({
    service: props.serviceName,
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
  let request = new import_protocol_http_2_2.HttpRequest({
    method: req.method.toUpperCase(),
    protocol: url.protocol,
    path: url.pathname,
    query,
    headers,
    body: req.body,
  });
  return (await signer.sign(request)).headers;
};
export { getAuthHeaders_2, getAuthHeaders };
