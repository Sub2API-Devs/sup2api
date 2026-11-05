/**
 * google-auth-library/build/src/gtoken/getCredentials.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_errorWithCode } from "./errorWithCode.js";

//@ chunk-e8d3a8an.js:86929-88473 cjs-fingerprint
var require_getCredentials = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getCredentials = getCredentials;
  var path = importMetaRequire("path");
  var fs = importMetaRequire("fs");
  var util_1 = importMetaRequire("util");
  var errorWithCode_1 = require_errorWithCode();
  var readFile = fs.readFile
    ? util_1.promisify(fs.readFile)
    : async () => {
        throw new errorWithCode_1.ErrorWithCode("use key rather than keyFile.", "MISSING_CREDENTIALS");
      };
  var ExtensionFiles;
  (function (ExtensionFiles) {
    ExtensionFiles.JSON = ".json";
    ExtensionFiles.DER = ".der";
    ExtensionFiles.CRT = ".crt";
    ExtensionFiles.PEM = ".pem";
    ExtensionFiles.P12 = ".p12";
    ExtensionFiles.PFX = ".pfx";
  })(ExtensionFiles || (ExtensionFiles = {}));
  class JsonCredentialsProvider {
    keyFilePath;
    constructor(keyFilePath) {
      this.keyFilePath = keyFilePath;
    }
    async getCredentials() {
      let key = await readFile(this.keyFilePath, "utf8");
      let body;
      try {
        body = JSON.parse(key);
      } catch (error) {
        throw Error(`Invalid JSON key file: ${error.message}`);
      }
      let privateKey = body.private_key;
      let clientEmail = body.client_email;
      if (!privateKey || !clientEmail)
        throw new errorWithCode_1.ErrorWithCode(
          "private_key and client_email are required.",
          "MISSING_CREDENTIALS",
        );
      return {
        privateKey,
        clientEmail,
      };
    }
  }
  class PemCredentialsProvider {
    keyFilePath;
    constructor(keyFilePath) {
      this.keyFilePath = keyFilePath;
    }
    async getCredentials() {
      return {
        privateKey: await readFile(this.keyFilePath, "utf8"),
      };
    }
  }
  class P12CredentialsProvider {
    async getCredentials() {
      throw new errorWithCode_1.ErrorWithCode(
        "*.p12 certificates are not supported after v6.1.2. Consider utilizing *.json format or converting *.p12 to *.pem using the OpenSSL CLI.",
        "UNKNOWN_CERTIFICATE_TYPE",
      );
    }
  }
  class CredentialsProviderFactory {
    static create(keyFilePath) {
      switch (path.extname(keyFilePath)) {
        case ExtensionFiles.JSON:
          return new JsonCredentialsProvider(keyFilePath);
        case ExtensionFiles.DER:
        case ExtensionFiles.CRT:
        case ExtensionFiles.PEM:
          return new PemCredentialsProvider(keyFilePath);
        case ExtensionFiles.P12:
        case ExtensionFiles.PFX:
          return new P12CredentialsProvider();
        default:
          throw new errorWithCode_1.ErrorWithCode(
            "Unknown certificate type. Type is determined based on file extension. Current supported extensions are *.json, and *.pem.",
            "UNKNOWN_CERTIFICATE_TYPE",
          );
      }
    }
  }
  async function getCredentials(keyFile) {
    return CredentialsProviderFactory.create(keyFile).getCredentials();
  }
});
export { require_getCredentials };
