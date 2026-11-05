/**
 * google-auth-library/build/src/auth/executable-response.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:128266-130576 cjs-fingerprint
var require_executable_response = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InvalidSubjectTokenError =
    cjsExports.InvalidMessageFieldError =
    cjsExports.InvalidCodeFieldError =
    cjsExports.InvalidTokenTypeFieldError =
    cjsExports.InvalidExpirationTimeFieldError =
    cjsExports.InvalidSuccessFieldError =
    cjsExports.InvalidVersionFieldError =
    cjsExports.ExecutableResponseError =
    cjsExports.ExecutableResponse =
      undefined;
  var SAML_SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:saml2";
  var OIDC_SUBJECT_TOKEN_TYPE1 = "urn:ietf:params:oauth:token-type:id_token";
  var OIDC_SUBJECT_TOKEN_TYPE2 = "urn:ietf:params:oauth:token-type:jwt";
  class ExecutableResponse {
    version;
    success;
    expirationTime;
    tokenType;
    errorCode;
    errorMessage;
    subjectToken;
    constructor(responseJson) {
      if (!responseJson.version)
        throw new InvalidVersionFieldError("Executable response must contain a 'version' field.");
      if (responseJson.success === undefined)
        throw new InvalidSuccessFieldError("Executable response must contain a 'success' field.");
      this.version = responseJson.version;
      this.success = responseJson.success;
      if (this.success) {
        this.expirationTime = responseJson.expiration_time;
        this.tokenType = responseJson.token_type;
        if (
          this.tokenType !== SAML_SUBJECT_TOKEN_TYPE &&
          this.tokenType !== OIDC_SUBJECT_TOKEN_TYPE1 &&
          this.tokenType !== OIDC_SUBJECT_TOKEN_TYPE2
        )
          throw new InvalidTokenTypeFieldError(
            `Executable response must contain a 'token_type' field when successful and it must be one of ${OIDC_SUBJECT_TOKEN_TYPE1}, ${OIDC_SUBJECT_TOKEN_TYPE2}, or ${SAML_SUBJECT_TOKEN_TYPE}.`,
          );
        if (this.tokenType === SAML_SUBJECT_TOKEN_TYPE) {
          if (!responseJson.saml_response)
            throw new InvalidSubjectTokenError(
              `Executable response must contain a 'saml_response' field when token_type=${SAML_SUBJECT_TOKEN_TYPE}.`,
            );
          this.subjectToken = responseJson.saml_response;
        } else {
          if (!responseJson.id_token)
            throw new InvalidSubjectTokenError(
              `Executable response must contain a 'id_token' field when token_type=${OIDC_SUBJECT_TOKEN_TYPE1} or ${OIDC_SUBJECT_TOKEN_TYPE2}.`,
            );
          this.subjectToken = responseJson.id_token;
        }
      } else {
        if (!responseJson.code)
          throw new InvalidCodeFieldError(
            "Executable response must contain a 'code' field when unsuccessful.",
          );
        if (!responseJson.message)
          throw new InvalidMessageFieldError(
            "Executable response must contain a 'message' field when unsuccessful.",
          );
        this.errorCode = responseJson.code;
        this.errorMessage = responseJson.message;
      }
    }
    isValid() {
      return !this.isExpired() && this.success;
    }
    isExpired() {
      return this.expirationTime !== undefined && this.expirationTime < Math.round(Date.now() / 1000);
    }
  }
  cjsExports.ExecutableResponse = ExecutableResponse;
  class ExecutableResponseError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
  cjsExports.ExecutableResponseError = ExecutableResponseError;
  class InvalidVersionFieldError extends ExecutableResponseError {}
  cjsExports.InvalidVersionFieldError = InvalidVersionFieldError;
  class InvalidSuccessFieldError extends ExecutableResponseError {}
  cjsExports.InvalidSuccessFieldError = InvalidSuccessFieldError;
  class InvalidExpirationTimeFieldError extends ExecutableResponseError {}
  cjsExports.InvalidExpirationTimeFieldError = InvalidExpirationTimeFieldError;
  class InvalidTokenTypeFieldError extends ExecutableResponseError {}
  cjsExports.InvalidTokenTypeFieldError = InvalidTokenTypeFieldError;
  class InvalidCodeFieldError extends ExecutableResponseError {}
  cjsExports.InvalidCodeFieldError = InvalidCodeFieldError;
  class InvalidMessageFieldError extends ExecutableResponseError {}
  cjsExports.InvalidMessageFieldError = InvalidMessageFieldError;
  class InvalidSubjectTokenError extends ExecutableResponseError {}
  cjsExports.InvalidSubjectTokenError = InvalidSubjectTokenError;
});
export { require_executable_response };
