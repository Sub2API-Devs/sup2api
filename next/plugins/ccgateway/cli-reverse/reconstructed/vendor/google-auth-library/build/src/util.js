/**
 * google-auth-library/build/src/util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:60582-61969 cjs-fingerprint
var require_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LRUCache = undefined;
  cjsExports.snakeToCamel = snakeToCamel;
  cjsExports.originalOrCamelOptions = originalOrCamelOptions;
  cjsExports.removeUndefinedValuesInObject = removeUndefinedValuesInObject;
  cjsExports.isValidFile = isValidFile;
  cjsExports.getWellKnownCertificateConfigFileLocation = getWellKnownCertificateConfigFileLocation;
  var fs = importMetaRequire("fs");
  var os = importMetaRequire("os");
  var path = importMetaRequire("path");
  var WELL_KNOWN_CERTIFICATE_CONFIG_FILE = "certificate_config.json";
  var CLOUDSDK_CONFIG_DIRECTORY = "gcloud";
  function snakeToCamel(str) {
    return str.replace(/([_][^_])/g, (match) => match.slice(1).toUpperCase());
  }
  function originalOrCamelOptions(obj) {
    function get(key) {
      let o = obj || {};
      return o[key] ?? o[snakeToCamel(key)];
    }
    return {
      get,
    };
  }
  class LRUCache {
    capacity;
    #e = new Map();
    maxAge;
    constructor(options) {
      this.capacity = options.capacity;
      this.maxAge = options.maxAge;
    }
    #t(key, value) {
      this.#e.delete(key);
      this.#e.set(key, {
        value,
        lastAccessed: Date.now(),
      });
    }
    set(key, value) {
      this.#t(key, value);
      this.#r();
    }
    get(key) {
      let item = this.#e.get(key);
      if (!item) return;
      this.#t(key, item.value);
      this.#r();
      return item.value;
    }
    #r() {
      let cutoffDate = this.maxAge ? Date.now() - this.maxAge : 0;
      let oldestItem = this.#e.entries().next();
      while (
        !oldestItem.done &&
        (this.#e.size > this.capacity || oldestItem.value[1].lastAccessed < cutoffDate)
      ) {
        this.#e.delete(oldestItem.value[0]);
        oldestItem = this.#e.entries().next();
      }
    }
  }
  cjsExports.LRUCache = LRUCache;
  function removeUndefinedValuesInObject(object) {
    Object.entries(object).forEach(([key, value]) => {
      if (value === undefined || value === "undefined") delete object[key];
    });
    return object;
  }
  async function isValidFile(obj) {
    try {
      return (await fs.promises.lstat(obj)).isFile();
    } catch (e) {
      return false;
    }
  }
  function getWellKnownCertificateConfigFileLocation() {
    let configDir =
      process.env.CLOUDSDK_CONFIG ||
      (_isWindows()
        ? path.join(process.env.APPDATA || "", CLOUDSDK_CONFIG_DIRECTORY)
        : path.join(process.env.HOME || "", ".config", CLOUDSDK_CONFIG_DIRECTORY));
    return path.join(configDir, WELL_KNOWN_CERTIFICATE_CONFIG_FILE);
  }
  function _isWindows() {
    return os.platform().startsWith("win");
  }
});
export { require_util };
