/**
 * gcp-metadata/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: gcp-metadata@7.0.0..8.1.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../gaxios/build/cjs/src/index.js";
import { require_json_bigint } from "../../../json-bigint/index.js";
import { require_gcp_residency } from "./gcp-residency.js";
import { require_google_logging_utils } from "../../../google-logging-utils/build/src/index.js";

//@ chunk-e8d3a8an.js:50294-55402 cjs-fingerprint
var require_gcp_metadata = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    (function () {
      var ownKeys = function (o) {
        ownKeys =
          Object.getOwnPropertyNames ||
          function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
          };
        return ownKeys(o);
      };
      return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, import_star) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(import_star, p))
          __createBinding(import_star, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.gcpResidencyCache =
    cjsExports.METADATA_SERVER_DETECTION =
    cjsExports.HEADERS =
    cjsExports.HEADER_VALUE =
    cjsExports.HEADER_NAME =
    cjsExports.SECONDARY_HOST_ADDRESS =
    cjsExports.HOST_ADDRESS =
    cjsExports.BASE_PATH =
      undefined;
  cjsExports.instance = instance;
  cjsExports.project = project;
  cjsExports.universe = universe;
  cjsExports.bulk = bulk;
  cjsExports.isAvailable = isAvailable;
  cjsExports.resetIsAvailableCache = resetIsAvailableCache;
  cjsExports.getGCPResidency = getGCPResidency;
  cjsExports.setGCPResidency = setGCPResidency;
  cjsExports.requestTimeout = requestTimeout;
  var gaxios_1 = require_gaxios_2();
  var jsonBigint = require_json_bigint();
  var gcp_residency_1 = require_gcp_residency();
  var logger = __importStar(require_google_logging_utils());
  cjsExports.BASE_PATH = "/computeMetadata/v1";
  cjsExports.HOST_ADDRESS = "http://169.254.169.254";
  cjsExports.SECONDARY_HOST_ADDRESS = "http://metadata.google.internal.";
  cjsExports.HEADER_NAME = "Metadata-Flavor";
  cjsExports.HEADER_VALUE = "Google";
  cjsExports.HEADERS = Object.freeze({
    [cjsExports.HEADER_NAME]: cjsExports.HEADER_VALUE,
  });
  var log = logger.log("gcp-metadata");
  cjsExports.METADATA_SERVER_DETECTION = Object.freeze({
    "assume-present": "don't try to ping the metadata server, but assume it's present",
    none: "don't try to ping the metadata server, but don't try to use it either",
    "bios-only": "treat the result of a BIOS probe as canonical (don't fall back to pinging)",
    "ping-only": "skip the BIOS probe, and go straight to pinging",
  });
  function getBaseUrl(baseUrl) {
    if (!baseUrl)
      baseUrl = process.env.GCE_METADATA_IP || process.env.GCE_METADATA_HOST || cjsExports.HOST_ADDRESS;
    if (!/^https?:\/\//.test(baseUrl)) baseUrl = `http://${baseUrl}`;
    return new URL(cjsExports.BASE_PATH, baseUrl).href;
  }
  function validate(options) {
    Object.keys(options).forEach((key) => {
      switch (key) {
        case "params":
        case "property":
        case "headers":
          break;
        case "qs":
          throw Error("'qs' is not a valid configuration option. Please use 'params' instead.");
        default:
          throw Error(`'${key}' is not a valid configuration option.`);
      }
    });
  }
  async function metadataAccessor(type, options = {}, noResponseRetries = 3, fastFail = false) {
    let headers = new Headers(cjsExports.HEADERS);
    let metadataKey = "";
    let params = {};
    if (typeof type === "object") {
      let metadataAccessor = type;
      new Headers(metadataAccessor.headers).forEach((value, key) => headers.set(key, value));
      metadataKey = metadataAccessor.metadataKey;
      params = metadataAccessor.params || params;
      noResponseRetries = metadataAccessor.noResponseRetries || noResponseRetries;
      fastFail = metadataAccessor.fastFail || fastFail;
    } else metadataKey = type;
    if (typeof options === "string") metadataKey += `/${options}`;
    else {
      validate(options);
      if (options.property) metadataKey += `/${options.property}`;
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
      params = options.params || params;
    }
    let requestMethod = fastFail ? fastFailMetadataRequest : gaxios_1.request;
    let req = {
      url: `${getBaseUrl()}/${metadataKey}`,
      headers,
      retryConfig: {
        noResponseRetries,
      },
      params,
      responseType: "text",
      timeout: requestTimeout(),
    };
    log.info("instance request %j", req);
    let res = await requestMethod(req);
    log.info("instance metadata is %s", res.data);
    let metadataFlavor = res.headers.get(cjsExports.HEADER_NAME);
    if (metadataFlavor !== cjsExports.HEADER_VALUE)
      throw RangeError(
        `Invalid response from metadata service: incorrect ${cjsExports.HEADER_NAME} header. Expected '${cjsExports.HEADER_VALUE}', got ${metadataFlavor ? `'${metadataFlavor}'` : "no header"}`,
      );
    if (typeof res.data === "string")
      try {
        return jsonBigint.parse(res.data);
      } catch {}
    return res.data;
  }
  async function fastFailMetadataRequest(options) {
    let secondaryOptions = {
      ...options,
      url: options.url?.toString().replace(getBaseUrl(), getBaseUrl(cjsExports.SECONDARY_HOST_ADDRESS)),
    };
    let r1 = gaxios_1.request(options);
    let r2 = gaxios_1.request(secondaryOptions);
    return Promise.any([r1, r2]);
  }
  function instance(options) {
    return metadataAccessor("instance", options);
  }
  function project(options) {
    return metadataAccessor("project", options);
  }
  function universe(options) {
    return metadataAccessor("universe", options);
  }
  async function bulk(properties) {
    let r_2 = {};
    await Promise.all(
      properties.map((item) =>
        (async () => {
          let res = await metadataAccessor(item);
          let key = item.metadataKey;
          r_2[key] = res;
        })(),
      ),
    );
    return r_2;
  }
  function detectGCPAvailableRetries() {
    return process.env.DETECT_GCP_RETRIES ? Number(process.env.DETECT_GCP_RETRIES) : 0;
  }
  var cachedIsAvailableResponse;
  async function isAvailable() {
    if (process.env.METADATA_SERVER_DETECTION) {
      let value = process.env.METADATA_SERVER_DETECTION.trim().toLocaleLowerCase();
      if (!(value in cjsExports.METADATA_SERVER_DETECTION))
        throw RangeError(
          `Unknown \`METADATA_SERVER_DETECTION\` env variable. Got \`${value}\`, but it should be \`${Object.keys(cjsExports.METADATA_SERVER_DETECTION).join("`, `")}\`, or unset`,
        );
      switch (value) {
        case "assume-present":
          return true;
        case "none":
          return false;
        case "bios-only":
          return getGCPResidency();
        case "ping-only":
      }
    }
    try {
      if (cachedIsAvailableResponse === undefined)
        cachedIsAvailableResponse = metadataAccessor(
          "instance",
          undefined,
          detectGCPAvailableRetries(),
          !(process.env.GCE_METADATA_IP || process.env.GCE_METADATA_HOST),
        );
      await cachedIsAvailableResponse;
      return true;
    } catch (error) {
      let err = error;
      if (process.env.DEBUG_AUTH) console.info(err);
      if (err.type === "request-timeout") return false;
      if (err.response && err.response.status === 404) return false;
      else {
        if (
          !(err.response && err.response.status === 404) &&
          (!err.code ||
            !["EHOSTDOWN", "EHOSTUNREACH", "ENETUNREACH", "ENOENT", "ENOTFOUND", "ECONNREFUSED"].includes(
              err.code.toString(),
            ))
        ) {
          let code = "UNKNOWN";
          if (err.code) code = err.code.toString();
          process.emitWarning(
            `received unexpected error = ${err.message} code = ${code}`,
            "MetadataLookupWarning",
          );
        }
        return false;
      }
    }
  }
  function resetIsAvailableCache() {
    cachedIsAvailableResponse = undefined;
  }
  cjsExports.gcpResidencyCache = null;
  function getGCPResidency() {
    if (cjsExports.gcpResidencyCache === null) setGCPResidency();
    return cjsExports.gcpResidencyCache;
  }
  function setGCPResidency(value = null) {
    cjsExports.gcpResidencyCache = value !== null ? value : gcp_residency_1.detectGCPResidency();
  }
  function requestTimeout() {
    return getGCPResidency() ? 0 : 3000;
  }
  __exportStar(require_gcp_residency(), cjsExports);
});
export { require_gcp_metadata };
