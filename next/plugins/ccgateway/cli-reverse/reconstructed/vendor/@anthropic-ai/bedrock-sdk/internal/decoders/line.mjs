/**
 * @anthropic-ai/bedrock-sdk/internal/decoders/line.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-mgs2qfsy.js (2)
 * attribution: esm-layout 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_google_auth_library } from "../../../../google-auth-library/build/src/index.js";
import { AnthropicError } from "../../../sdk/core/error.mjs";

//@ chunk-mgs2qfsy.js:1734-2859 esm-layout
var import_google_auth_library = __toESM(require_google_auth_library(), 1);
var __classPrivateFieldSet = function (receiver, state, value, kind, f) {
  if (kind === "m") throw TypeError("Private method is not writable");
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot write private member to an object whose class did not declare it");
  if (kind === "a") f.call(receiver, value);
  else if (f) f.value = value;
  else state.set(receiver, value);
  return value;
};
var __classPrivateFieldGet = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AnthropicGoogleCloud_instances;
var _AnthropicGoogleCloud_bearerTokenProvider;
var _AnthropicGoogleCloud_googleAuth;
var _AnthropicGoogleCloud_authClient;
var _AnthropicGoogleCloud_authClientPromise;
var _AnthropicGoogleCloud_workspaceURL;
var _AnthropicGoogleCloud_organizationURL;
var _AnthropicGoogleCloud_isBaseURLOverridden;
var _AnthropicGoogleCloud_awaitReady;
var _AnthropicGoogleCloud_getBearerToken;
var GOOGLE_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
var GLOBAL = "global";
var projectLocationURL = (project, location) =>
  `https://claude.googleapis.com/v1/projects/${project}/locations/${location}`;
var workspaceInvokeURL = (project, location, workspaceId) =>
  `${projectLocationURL(project, location)}/workspaces/${workspaceId}/invoke`;
var organizationInvokeURL = (project, location) =>
  `${projectLocationURL(project, location)}/claudeOrganization/invoke`;
var ORGANIZATIONS_PATH_PREFIX = "/v1/organizations/";
var HTTPS_UNRESOLVED_INVALID = "https://unresolved.invalid";
var NO_PROJECT_HINT =
  "Set `project` or the `ANTHROPIC_GOOGLE_CLOUD_PROJECT` environment variable (or provide `baseURL`).";
var CREDENTIAL_OPTIONS = ["apiKey", "authToken", "credentials", "config", "profile"];
//@ chunk-mgs2qfsy.js:6243-6703 placement (moved: shares a binding it assigns)
_AnthropicGoogleCloud_bearerTokenProvider = new WeakMap();
_AnthropicGoogleCloud_googleAuth = new WeakMap();
_AnthropicGoogleCloud_authClient = new WeakMap();
_AnthropicGoogleCloud_authClientPromise = new WeakMap();
_AnthropicGoogleCloud_workspaceURL = new WeakMap();
_AnthropicGoogleCloud_organizationURL = new WeakMap();
_AnthropicGoogleCloud_instances = new WeakSet();
_AnthropicGoogleCloud_isBaseURLOverridden = function () {
  return this.baseURL !== __classPrivateFieldGet(this, _AnthropicGoogleCloud_workspaceURL, "f");
};
_AnthropicGoogleCloud_awaitReady = async function () {
  if (
    !__classPrivateFieldGet(
      this,
      _AnthropicGoogleCloud_instances,
      "m",
      _AnthropicGoogleCloud_isBaseURLOverridden,
    ).call(this)
  )
    await this.ready;
};
_AnthropicGoogleCloud_getBearerToken = async function () {
  if (__classPrivateFieldGet(this, _AnthropicGoogleCloud_bearerTokenProvider, "f"))
    return await __classPrivateFieldGet(this, _AnthropicGoogleCloud_bearerTokenProvider, "f").call(this);
  let authClient = await __classPrivateFieldGet(this, _AnthropicGoogleCloud_authClientPromise, "f");
  let { token } = await authClient.getAccessToken();
  if (!token)
    throw new AnthropicError("Failed to obtain a Google access token from Application Default Credentials.");
  return token;
};
export {
  CREDENTIAL_OPTIONS,
  GLOBAL,
  workspaceInvokeURL,
  NO_PROJECT_HINT,
  _AnthropicGoogleCloud_instances,
  _AnthropicGoogleCloud_bearerTokenProvider,
  _AnthropicGoogleCloud_googleAuth,
  _AnthropicGoogleCloud_authClient,
  _AnthropicGoogleCloud_authClientPromise,
  _AnthropicGoogleCloud_workspaceURL,
  _AnthropicGoogleCloud_organizationURL,
  HTTPS_UNRESOLVED_INVALID,
  __classPrivateFieldSet,
  organizationInvokeURL,
  import_google_auth_library,
  GOOGLE_CLOUD_PLATFORM_SCOPE,
  __classPrivateFieldGet,
  _AnthropicGoogleCloud_isBaseURLOverridden,
  ORGANIZATIONS_PATH_PREFIX,
  _AnthropicGoogleCloud_awaitReady,
  _AnthropicGoogleCloud_getBearerToken,
};
