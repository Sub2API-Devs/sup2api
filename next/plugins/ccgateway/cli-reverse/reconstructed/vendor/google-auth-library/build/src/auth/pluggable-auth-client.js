/**
 * google-auth-library/build/src/auth/pluggable-auth-client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_baseexternalclient } from "./baseexternalclient.js";
import { require_executable_response } from "./executable-response.js";
import { require_pluggable_auth_handler } from "./pluggable-auth-handler.js";

//@ chunk-e8d3a8an.js:132752-135197 cjs-fingerprint
var require_pluggable_auth_client = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PluggableAuthClient = cjsExports.ExecutableError = undefined;
  var baseexternalclient_1 = require_baseexternalclient();
  var executable_response_1 = require_executable_response();
  var pluggable_auth_handler_1 = require_pluggable_auth_handler();
  var pluggable_auth_handler_2 = require_pluggable_auth_handler();
  Object.defineProperty(cjsExports, "ExecutableError", {
    enumerable: true,
    get: function () {
      return pluggable_auth_handler_2.ExecutableError;
    },
  });
  var DEFAULT_EXECUTABLE_TIMEOUT_MILLIS = 30000;
  var MINIMUM_EXECUTABLE_TIMEOUT_MILLIS = 5000;
  var MAXIMUM_EXECUTABLE_TIMEOUT_MILLIS = 120000;
  var GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES = "GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES";
  var MAXIMUM_EXECUTABLE_VERSION = 1;
  class PluggableAuthClient extends baseexternalclient_1.BaseExternalAccountClient {
    command;
    timeoutMillis;
    outputFile;
    handler;
    constructor(options) {
      super(options);
      if (!options.credential_source.executable)
        throw Error('No valid Pluggable Auth "credential_source" provided.');
      this.command = options.credential_source.executable.command;
      if (!this.command) throw Error('No valid Pluggable Auth "credential_source" provided.');
      if (options.credential_source.executable.timeout_millis === undefined)
        this.timeoutMillis = DEFAULT_EXECUTABLE_TIMEOUT_MILLIS;
      else {
        this.timeoutMillis = options.credential_source.executable.timeout_millis;
        if (
          this.timeoutMillis < MINIMUM_EXECUTABLE_TIMEOUT_MILLIS ||
          this.timeoutMillis > MAXIMUM_EXECUTABLE_TIMEOUT_MILLIS
        )
          throw Error(
            `Timeout must be between ${MINIMUM_EXECUTABLE_TIMEOUT_MILLIS} and ${MAXIMUM_EXECUTABLE_TIMEOUT_MILLIS} milliseconds.`,
          );
      }
      this.outputFile = options.credential_source.executable.output_file;
      this.handler = new pluggable_auth_handler_1.PluggableAuthHandler({
        command: this.command,
        timeoutMillis: this.timeoutMillis,
        outputFile: this.outputFile,
      });
      this.credentialSourceType = "executable";
    }
    async retrieveSubjectToken() {
      if (process.env[GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES] !== "1")
        throw Error(
          "Pluggable Auth executables need to be explicitly allowed to run by setting the GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES environment Variable to 1.",
        );
      let executableResponse = undefined;
      if (this.outputFile) executableResponse = await this.handler.retrieveCachedResponse();
      if (!executableResponse) {
        let envMap = new Map();
        envMap.set("GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE", this.audience);
        envMap.set("GOOGLE_EXTERNAL_ACCOUNT_TOKEN_TYPE", this.subjectTokenType);
        envMap.set("GOOGLE_EXTERNAL_ACCOUNT_INTERACTIVE", "0");
        if (this.outputFile) envMap.set("GOOGLE_EXTERNAL_ACCOUNT_OUTPUT_FILE", this.outputFile);
        let serviceAccountEmail = this.getServiceAccountEmail();
        if (serviceAccountEmail)
          envMap.set("GOOGLE_EXTERNAL_ACCOUNT_IMPERSONATED_EMAIL", serviceAccountEmail);
        executableResponse = await this.handler.retrieveResponseFromExecutable(envMap);
      }
      if (executableResponse.version > MAXIMUM_EXECUTABLE_VERSION)
        throw Error(
          `Version of executable is not currently supported, maximum supported version is ${MAXIMUM_EXECUTABLE_VERSION}.`,
        );
      if (!executableResponse.success)
        throw new pluggable_auth_handler_1.ExecutableError(
          executableResponse.errorMessage,
          executableResponse.errorCode,
        );
      if (this.outputFile) {
        if (!executableResponse.expirationTime)
          throw new executable_response_1.InvalidExpirationTimeFieldError(
            "The executable response must contain the `expiration_time` field for successful responses when an output_file has been specified in the configuration.",
          );
      }
      if (executableResponse.isExpired()) throw Error("Executable response is expired.");
      return executableResponse.subjectToken;
    }
  }
  cjsExports.PluggableAuthClient = PluggableAuthClient;
});
export { require_pluggable_auth_client };
