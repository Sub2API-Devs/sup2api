/**
 * @azure/identity/dist/esm/constants.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
//@ chunk-mrx6y2r5.js:22297-22370 esm-fingerprint
/**
 * @azure/identity 常量：SDK 版本、Azure CLI client id、默认 tenant "common"。
 */
var SDK_VERSION = "4.10.1";
var DEVELOPER_SIGN_ON_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
var DefaultTenantId = "common";
var AzureAuthorityHosts;
//@ chunk-mrx6y2r5.js:22370-22602 esm-fingerprint
(function (AzureAuthorityHosts) {
  AzureAuthorityHosts.AzureChina = "https://login.chinacloudapi.cn";
  AzureAuthorityHosts.AzureGermany = "https://login.microsoftonline.de";
  AzureAuthorityHosts.AzureGovernment = "https://login.microsoftonline.us";
  AzureAuthorityHosts.AzurePublicCloud = "https://login.microsoftonline.com";
})(AzureAuthorityHosts || (AzureAuthorityHosts = {}));
//@ chunk-mrx6y2r5.js:22602-22705 esm-fingerprint
var DefaultAuthorityHost = AzureAuthorityHosts.AzurePublicCloud;
var DefaultAuthority = "login.microsoftonline.com";
var ALL_TENANTS = ["*"];
var CAE = "cae";
var CACHE_NON_CAE_SUFFIX = "nocae";
var DEFAULT_TOKEN_CACHE_NAME = "msal.cache";
export {
  DEFAULT_TOKEN_CACHE_NAME,
  CACHE_NON_CAE_SUFFIX,
  CAE,
  DEVELOPER_SIGN_ON_CLIENT_ID,
  ALL_TENANTS,
  SDK_VERSION,
  DefaultAuthorityHost,
  DefaultAuthority,
  DefaultTenantId,
};
