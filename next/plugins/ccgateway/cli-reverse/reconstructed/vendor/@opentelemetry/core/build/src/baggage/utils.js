/**
 * @opentelemetry/core/build/src/baggage/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_constants_2 } from "./constants.js";

//@ chunk-7kayq7nc.js:54544-55798 cjs-fingerprint
var require_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseKeyPairsIntoRecord =
    cjsExports.parsePairKeyValue =
    cjsExports.getKeyPairs =
    cjsExports.serializeKeyPairs =
      undefined;
  var api_1 = require_api();
  var constants_1 = require_constants_2();
  function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce((hValue, current) => {
      let value = `${hValue}${hValue !== "" ? constants_1.BAGGAGE_ITEMS_SEPARATOR : ""}${current}`;
      return value.length > constants_1.BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, "");
  }
  cjsExports.serializeKeyPairs = serializeKeyPairs;
  function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(([key, value]) => {
      let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;
      if (value.metadata !== undefined)
        entry += constants_1.BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
      return entry;
    });
  }
  cjsExports.getKeyPairs = getKeyPairs;
  function parsePairKeyValue(entry) {
    if (!entry) return;
    let metadataSeparatorIndex = entry.indexOf(constants_1.BAGGAGE_PROPERTIES_SEPARATOR);
    let keyPairPart = metadataSeparatorIndex === -1 ? entry : entry.substring(0, metadataSeparatorIndex);
    let separatorIndex = keyPairPart.indexOf(constants_1.BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0) return;
    let rawKey = keyPairPart.substring(0, separatorIndex).trim();
    let rawValue = keyPairPart.substring(separatorIndex + 1).trim();
    if (!rawKey || !rawValue) return;
    let key;
    let value;
    try {
      key = decodeURIComponent(rawKey);
      value = decodeURIComponent(rawValue);
    } catch {
      return;
    }
    let metadata;
    if (metadataSeparatorIndex !== -1 && metadataSeparatorIndex < entry.length - 1) {
      let metadataString = entry.substring(metadataSeparatorIndex + 1);
      metadata = api_1.baggageEntryMetadataFromString(metadataString);
    }
    return {
      key,
      value,
      metadata,
    };
  }
  cjsExports.parsePairKeyValue = parsePairKeyValue;
  function parseKeyPairsIntoRecord(value) {
    let result = {};
    if (typeof value === "string" && value.length > 0)
      value.split(constants_1.BAGGAGE_ITEMS_SEPARATOR).forEach((entry) => {
        let keyPair = parsePairKeyValue(entry);
        if (keyPair !== undefined && keyPair.value.length > 0) result[keyPair.key] = keyPair.value;
      });
    return result;
  }
  cjsExports.parseKeyPairsIntoRecord = parseKeyPairsIntoRecord;
});
export { require_utils };
