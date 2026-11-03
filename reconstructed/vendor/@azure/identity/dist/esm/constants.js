/**
 * @azure/identity/dist/esm/constants.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */

/**
 * @azure/identity 常量：SDK 版本、Azure CLI client id、默认 tenant "common"。
 */
//@ chunk-mrx6y2r5.js:22297-22370 esm-fingerprint
var SDK_VERSION = "4.10.1",
  DEVELOPER_SIGN_ON_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
  COMMON = "common",
  AzureAuthorityHosts;
//@ chunk-mrx6y2r5.js:22370-22602 esm-fingerprint
(function (e) {
  ((e.AzureChina = "https://login.chinacloudapi.cn"),
    (e.AzureGermany = "https://login.microsoftonline.de"),
    (e.AzureGovernment = "https://login.microsoftonline.us"),
    (e.AzurePublicCloud = "https://login.microsoftonline.com"));
})(AzureAuthorityHosts || (AzureAuthorityHosts = {}));
//@ chunk-mrx6y2r5.js:22602-22705 esm-fingerprint
var AzurePublicCloud = AzureAuthorityHosts.AzurePublicCloud,
  LOGIN_MICROSOFTONLINE_COM = "login.microsoftonline.com",
  ALL_TENANTS = ["*"],
  CAE = "cae",
  NOCAE = "nocae",
  MSAL_CACHE = "msal.cache";

export {
  MSAL_CACHE,
  NOCAE,
  CAE,
  DEVELOPER_SIGN_ON_CLIENT_ID,
  ALL_TENANTS,
  SDK_VERSION,
  AzurePublicCloud,
  LOGIN_MICROSOFTONLINE_COM,
  COMMON,
};
