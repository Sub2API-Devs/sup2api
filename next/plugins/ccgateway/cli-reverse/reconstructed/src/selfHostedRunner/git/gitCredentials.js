/**
 * selfHostedRunner/git/gitCredentials.ts
 *
 * BYOC git 凭据助手与代理参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (7)
 * attribution: placement 7
 */
//@ chunk-t3sg9e26.js:26597-26662 placement
/**
 * 导出常量或表 `SHR_GIT_PROXY_TOKEN`：值为 "SHR_GIT_PROXY_TOKEN", uMo = ["-c", "lfs.locksverify=false"]。
 */
var SHR_GIT_PROXY_TOKEN = "SHR_GIT_PROXY_TOKEN";
var LFS_NO_LOCKVERIFY_ARGS = ["-c", "lfs.locksverify=false"];
//@ chunk-t3sg9e26.js:26662-26700 placement
/**
 * 导出函数 `anonCredentialHelperArgs`：参数 e，返回 credentialHelperScript("unused", e)。
 */
function anonCredentialHelperArgs(envVar) {
  return credentialHelperScript("unused", envVar);
}
//@ chunk-t3sg9e26.js:26700-26815 placement
function credentialHelperScript(username, envVar) {
  return `!f() { if test "$1" = get; then printf 'username=${username}\\npassword=%s\\n' "$${envVar}"; fi; }; f`;
}
//@ chunk-t3sg9e26.js:26815-26861 placement
/**
 * 导出函数 `tokenCredentialHelperArgs`：参数 e，返回 credentialHelperScript("x-access-token", e)。
 */
function tokenCredentialHelperArgs(envVar) {
  return credentialHelperScript("x-access-token", envVar);
}
//@ chunk-t3sg9e26.js:26861-27008 placement
function credentialHelperArgs(url) {
  let origin = new URL(url).origin;
  return [
    "-c",
    "credential.helper=",
    "-c",
    `credential.${origin}.helper=`,
    "-c",
    `credential.${origin}.helper=${anonCredentialHelperArgs(SHR_GIT_PROXY_TOKEN)}`,
  ];
}
//@ chunk-t3sg9e26.js:27008-27128 placement
function httpsProxyFromEnv() {
  return (
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy || ""
  );
}
//@ chunk-t3sg9e26.js:27128-27339 placement
function remoteProxyArgs(url) {
  let scopes = ["", `${new URL(url).origin}.`, `${url}.`];
  let proxy = httpsProxyFromEnv();
  let args = proxy ? ["-c", `remote.origin.proxy=${proxy}`] : [];
  for (let scope of scopes) {
    if (proxy) args.push("-c", `http.${scope}proxy=${proxy}`);
    args.push("-c", `http.${scope}sslVerify=true`);
  }
  return args;
}
export {
  anonCredentialHelperArgs,
  tokenCredentialHelperArgs,
  remoteProxyArgs,
  credentialHelperArgs,
  LFS_NO_LOCKVERIFY_ARGS,
  SHR_GIT_PROXY_TOKEN,
  httpsProxyFromEnv,
};
