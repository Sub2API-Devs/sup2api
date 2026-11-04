/**
 * @modelcontextprotocol/sdk/dist/esm/server/auth/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (36)
 * attribution: esm-fingerprint 19, esm-layout 17
 */

//@ chunk-9z4e25ww.js:5186-5465 esm-fingerprint
class OAuthError extends Error {
  constructor(message, errorUri) {
    super(message);
    this.errorUri = errorUri;
    this.name = this.constructor.name;
  }
  toResponseObject() {
    let response = {
      error: this.errorCode,
      error_description: this.message,
    };
    if (this.errorUri) response.error_uri = this.errorUri;
    return response;
  }
  get errorCode() {
    return this.constructor.errorCode;
  }
}
//@ chunk-9z4e25ww.js:5465-5485 esm-layout
class InvalidRequestError extends OAuthError {}
//@ chunk-9z4e25ww.js:5485-5515 esm-fingerprint
InvalidRequestError.errorCode = "invalid_request";
//@ chunk-9z4e25ww.js:5515-5535 esm-layout
class InvalidClientError extends OAuthError {}
//@ chunk-9z4e25ww.js:5535-5564 esm-fingerprint
InvalidClientError.errorCode = "invalid_client";
//@ chunk-9z4e25ww.js:5564-5586 esm-layout
class InvalidGrantError extends OAuthError {}
//@ chunk-9z4e25ww.js:5586-5616 esm-fingerprint
InvalidGrantError.errorCode = "invalid_grant";
//@ chunk-9z4e25ww.js:5616-5636 esm-layout
class UnauthorizedClientError extends OAuthError {}
//@ chunk-9z4e25ww.js:5636-5670 esm-fingerprint
UnauthorizedClientError.errorCode = "unauthorized_client";
//@ chunk-9z4e25ww.js:5670-5690 esm-layout
class UnsupportedGrantTypeError extends OAuthError {}
//@ chunk-9z4e25ww.js:5690-5727 esm-fingerprint
UnsupportedGrantTypeError.errorCode = "unsupported_grant_type";
//@ chunk-9z4e25ww.js:5727-5747 esm-layout
class InvalidScopeError extends OAuthError {}
//@ chunk-9z4e25ww.js:5747-5775 esm-fingerprint
InvalidScopeError.errorCode = "invalid_scope";
//@ chunk-9z4e25ww.js:5775-5795 esm-layout
class AccessDeniedError extends OAuthError {}
//@ chunk-9z4e25ww.js:5795-5823 esm-fingerprint
AccessDeniedError.errorCode = "access_denied";
//@ chunk-9z4e25ww.js:5823-5845 esm-layout
class ServerError extends OAuthError {}
//@ chunk-9z4e25ww.js:5845-5874 esm-fingerprint
ServerError.errorCode = "server_error";
//@ chunk-9z4e25ww.js:5874-5896 esm-layout
class TemporarilyUnavailableError extends OAuthError {}
//@ chunk-9z4e25ww.js:5896-5936 esm-fingerprint
TemporarilyUnavailableError.errorCode = "temporarily_unavailable";
//@ chunk-9z4e25ww.js:5936-5956 esm-layout
class UnsupportedResponseTypeError extends OAuthError {}
//@ chunk-9z4e25ww.js:5956-5996 esm-fingerprint
UnsupportedResponseTypeError.errorCode = "unsupported_response_type";
//@ chunk-9z4e25ww.js:5996-6016 esm-layout
class UnsupportedTokenTypeError extends OAuthError {}
//@ chunk-9z4e25ww.js:6016-6053 esm-fingerprint
UnsupportedTokenTypeError.errorCode = "unsupported_token_type";
//@ chunk-9z4e25ww.js:6053-6073 esm-layout
class InvalidTokenError extends OAuthError {}
//@ chunk-9z4e25ww.js:6073-6101 esm-fingerprint
InvalidTokenError.errorCode = "invalid_token";
//@ chunk-9z4e25ww.js:6101-6121 esm-layout
class MethodNotAllowedError extends OAuthError {}
//@ chunk-9z4e25ww.js:6121-6154 esm-fingerprint
MethodNotAllowedError.errorCode = "method_not_allowed";
//@ chunk-9z4e25ww.js:6154-6176 esm-layout
class TooManyRequestsError extends OAuthError {}
//@ chunk-9z4e25ww.js:6176-6210 esm-fingerprint
TooManyRequestsError.errorCode = "too_many_requests";
//@ chunk-9z4e25ww.js:6210-6230 esm-layout
class InvalidClientMetadataError extends OAuthError {}
//@ chunk-9z4e25ww.js:6230-6268 esm-fingerprint
InvalidClientMetadataError.errorCode = "invalid_client_metadata";
//@ chunk-9z4e25ww.js:6268-6288 esm-layout
class InsufficientScopeError extends OAuthError {}
//@ chunk-9z4e25ww.js:6288-6321 esm-fingerprint
InsufficientScopeError.errorCode = "insufficient_scope";
//@ chunk-9z4e25ww.js:6321-6341 esm-layout
class InvalidTargetError extends OAuthError {}
//@ chunk-9z4e25ww.js:6341-6370 esm-fingerprint
InvalidTargetError.errorCode = "invalid_target";
//@ chunk-9z4e25ww.js:6370-6666 esm-fingerprint
var OAUTH_ERRORS = {
  [InvalidRequestError.errorCode]: InvalidRequestError,
  [InvalidClientError.errorCode]: InvalidClientError,
  [InvalidGrantError.errorCode]: InvalidGrantError,
  [UnauthorizedClientError.errorCode]: UnauthorizedClientError,
  [UnsupportedGrantTypeError.errorCode]: UnsupportedGrantTypeError,
  [InvalidScopeError.errorCode]: InvalidScopeError,
  [AccessDeniedError.errorCode]: AccessDeniedError,
  [ServerError.errorCode]: ServerError,
  [TemporarilyUnavailableError.errorCode]: TemporarilyUnavailableError,
  [UnsupportedResponseTypeError.errorCode]: UnsupportedResponseTypeError,
  [UnsupportedTokenTypeError.errorCode]: UnsupportedTokenTypeError,
  [InvalidTokenError.errorCode]: InvalidTokenError,
  [MethodNotAllowedError.errorCode]: MethodNotAllowedError,
  [TooManyRequestsError.errorCode]: TooManyRequestsError,
  [InvalidClientMetadataError.errorCode]: InvalidClientMetadataError,
  [InsufficientScopeError.errorCode]: InsufficientScopeError,
  [InvalidTargetError.errorCode]: InvalidTargetError,
};
export {
  OAuthError,
  InvalidGrantError,
  ServerError,
  TemporarilyUnavailableError,
  TooManyRequestsError,
  OAUTH_ERRORS,
  InvalidClientError,
  UnauthorizedClientError,
  InvalidClientMetadataError,
};
