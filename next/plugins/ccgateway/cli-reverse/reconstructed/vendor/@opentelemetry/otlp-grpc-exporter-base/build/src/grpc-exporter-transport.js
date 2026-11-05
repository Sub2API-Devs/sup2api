/**
 * @opentelemetry/otlp-grpc-exporter-base/build/src/grpc-exporter-transport.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-grpc-exporter-base@0.208.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_version } from "./version.js";
import { require_grpc_js } from "../../../../@grpc/grpc-js/build/src/index.js";
import { require_create_service_client_constructor } from "./create-service-client-constructor.js";

//@ chunk-3k21nfa0.js:385939-387586 cjs-fingerprint
var require_grpc_exporter_transport = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpGrpcExporterTransport =
    cjsExports.GrpcExporterTransport =
    cjsExports.createEmptyMetadata =
    cjsExports.createSslCredentials =
    cjsExports.createInsecureCredentials =
      undefined;
  var version_1 = require_version();
  var DEFAULT_USER_AGENT = `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`;
  function createUserAgent(userAgent) {
    if (userAgent) return `${userAgent} ${DEFAULT_USER_AGENT}`;
    return DEFAULT_USER_AGENT;
  }
  var GRPC_COMPRESSION_NONE = 0;
  var GRPC_COMPRESSION_GZIP = 2;
  function toGrpcCompression(compression) {
    return compression === "gzip" ? GRPC_COMPRESSION_GZIP : GRPC_COMPRESSION_NONE;
  }
  function createInsecureCredentials() {
    let { credentials } = require_grpc_js();
    return credentials.createInsecure();
  }
  cjsExports.createInsecureCredentials = createInsecureCredentials;
  function createSslCredentials(rootCert, privateKey, certChain) {
    let { credentials } = require_grpc_js();
    return credentials.createSsl(rootCert, privateKey, certChain);
  }
  cjsExports.createSslCredentials = createSslCredentials;
  function createEmptyMetadata() {
    let { Metadata } = require_grpc_js();
    return new Metadata();
  }
  cjsExports.createEmptyMetadata = createEmptyMetadata;
  class GrpcExporterTransport {
    _parameters;
    _client;
    _metadata;
    constructor(_parameters) {
      this._parameters = _parameters;
    }
    shutdown() {
      this._client?.close();
    }
    send(data, timeoutMillis) {
      let buffer = Buffer.from(data);
      if (this._client == null) {
        let { createServiceClientConstructor } = require_create_service_client_constructor();
        try {
          this._metadata = this._parameters.metadata();
        } catch (error) {
          return Promise.resolve({
            status: "failure",
            error,
          });
        }
        let clientConstructor = createServiceClientConstructor(
          this._parameters.grpcPath,
          this._parameters.grpcName,
        );
        try {
          this._client = new clientConstructor(this._parameters.address, this._parameters.credentials(), {
            "grpc.default_compression_algorithm": toGrpcCompression(this._parameters.compression),
            "grpc.primary_user_agent": createUserAgent(this._parameters.userAgent),
          });
        } catch (error) {
          return Promise.resolve({
            status: "failure",
            error,
          });
        }
      }
      return new Promise((resolve) => {
        let deadline = Date.now() + timeoutMillis;
        if (this._metadata == null)
          return resolve({
            error: Error("metadata was null"),
            status: "failure",
          });
        this._client.export(
          buffer,
          this._metadata,
          {
            deadline,
          },
          (err, response) => {
            if (err)
              resolve({
                status: "failure",
                error: err,
              });
            else
              resolve({
                data: response,
                status: "success",
              });
          },
        );
      });
    }
  }
  cjsExports.GrpcExporterTransport = GrpcExporterTransport;
  function createOtlpGrpcExporterTransport(options) {
    return new GrpcExporterTransport(options);
  }
  cjsExports.createOtlpGrpcExporterTransport = createOtlpGrpcExporterTransport;
});
export { require_grpc_exporter_transport };
