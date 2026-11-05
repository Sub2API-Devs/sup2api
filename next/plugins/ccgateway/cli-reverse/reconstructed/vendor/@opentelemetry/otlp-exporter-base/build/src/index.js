/**
 * @opentelemetry/otlp-exporter-base/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_OTLPExporterBase } from "./OTLPExporterBase.js";
import { require_types } from "./types.js";
import { require_shared_configuration } from "./configuration/shared-configuration.js";
import { require_legacy_node_configuration } from "./configuration/legacy-node-configuration.js";
import { require_otlp_network_export_delegate } from "./otlp-network-export-delegate.js";

//@ chunk-vxhm2nqe.js:5266-6325 cjs-fingerprint
var require_otlp_exporter_base = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createOtlpNetworkExportDelegate =
    cjsExports.CompressionAlgorithm =
    cjsExports.getSharedConfigurationDefaults =
    cjsExports.mergeOtlpSharedConfigurationWithDefaults =
    cjsExports.OTLPExporterError =
    cjsExports.OTLPExporterBase =
      undefined;
  var OTLPExporterBase_1 = require_OTLPExporterBase();
  Object.defineProperty(cjsExports, "OTLPExporterBase", {
    enumerable: true,
    get: function () {
      return OTLPExporterBase_1.OTLPExporterBase;
    },
  });
  var types_1 = require_types();
  Object.defineProperty(cjsExports, "OTLPExporterError", {
    enumerable: true,
    get: function () {
      return types_1.OTLPExporterError;
    },
  });
  var shared_configuration_1 = require_shared_configuration();
  Object.defineProperty(cjsExports, "mergeOtlpSharedConfigurationWithDefaults", {
    enumerable: true,
    get: function () {
      return shared_configuration_1.mergeOtlpSharedConfigurationWithDefaults;
    },
  });
  Object.defineProperty(cjsExports, "getSharedConfigurationDefaults", {
    enumerable: true,
    get: function () {
      return shared_configuration_1.getSharedConfigurationDefaults;
    },
  });
  var legacy_node_configuration_1 = require_legacy_node_configuration();
  Object.defineProperty(cjsExports, "CompressionAlgorithm", {
    enumerable: true,
    get: function () {
      return legacy_node_configuration_1.CompressionAlgorithm;
    },
  });
  var otlp_network_export_delegate_1 = require_otlp_network_export_delegate();
  Object.defineProperty(cjsExports, "createOtlpNetworkExportDelegate", {
    enumerable: true,
    get: function () {
      return otlp_network_export_delegate_1.createOtlpNetworkExportDelegate;
    },
  });
});
export { require_otlp_exporter_base };
