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
function anonCredentialHelperArgs(e) {
  return credentialHelperScript("unused", e);
}
//@ chunk-t3sg9e26.js:26700-26815 placement
function credentialHelperScript(e, n) {
  return `!f() { if test "$1" = get; then printf 'username=${e}\\npassword=%s\\n' "$${n}"; fi; }; f`;
}
//@ chunk-t3sg9e26.js:26815-26861 placement
/**
 * 导出函数 `tokenCredentialHelperArgs`：参数 e，返回 credentialHelperScript("x-access-token", e)。
 */
function tokenCredentialHelperArgs(e) {
  return credentialHelperScript("x-access-token", e);
}
//@ chunk-t3sg9e26.js:26861-27008 placement
function credentialHelperArgs(e) {
  let origin = new URL(e).origin;
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
function remoteProxyArgs(e) {
  let t = ["", `${new URL(e).origin}.`, `${e}.`];
  let r = httpsProxyFromEnv();
  let s = r ? ["-c", `remote.origin.proxy=${r}`] : [];
  for (let o of t) {
    if (r) s.push("-c", `http.${o}proxy=${r}`);
    s.push("-c", `http.${o}sslVerify=true`);
  }
  return s;
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
