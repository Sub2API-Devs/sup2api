/**
 * selfHostedRunner/git/tokenRedact.ts
 *
 * 日志中隐藏令牌（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (6)
 * attribution: placement 6
 */

//@ chunk-t3sg9e26.js:38120-38282 placement
function redactGitArg(e, authURL, gitURL, r) {
  if (e === authURL && e !== gitURL) return redactUrlCredentials(e);
  if (e.includes("://") && e.includes("@")) return redactUrlCredentials(e);
  if (r && e.includes(r)) return e.split(r).join("<token>");
  return e;
}
//@ chunk-t3sg9e26.js:38282-38691 placement
function redactToken(e, authURL, token) {
  if (authURL && /:\/\/[^/]*@/.test(authURL)) e = e.split(authURL).join(redactUrlCredentials(authURL));
  if (token) e = e.split(token).join("<token>");
  return e
    .replace(/sk-ant-ccsr-[A-Za-z0-9_.-]+/g, "<token>")
    .replace(/sk-ant-[A-Za-z0-9_.-]+/g, "<token>")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "<token>")
    .replace(/gh[psour]_[A-Za-z0-9]+/g, "<token>")
    .replace(
      /gl(?:pat|dt|rt|ft|soat|oas|agent|ptt|cbt|imt|ffct)-[A-Za-z0-9_=-]+(?:\.[0-9a-z]{9})?/g,
      "<token>",
    );
}
//@ chunk-t3sg9e26.js:38691-38980 placement
function redactUrlCredentials(e) {
  let n;
  try {
    n = new URL(e);
  } catch {}
  if (n && (n.username || n.password)) {
    let search = n.search || "";
    let hash = n.hash || "";
    return `${n.protocol}//<token>@${n.host}${n.pathname}${search}${hash}`;
  }
  if (n) return e;
  let index = e.indexOf("@");
  let index_2 = e.indexOf("://");
  if (index_2 >= 0 && index > index_2) return e.slice(0, index_2 + 3) + "<token>" + e.slice(index);
  return e;
}
//@ chunk-t3sg9e26.js:38980-39040 placement
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-t3sg9e26.js:39040-39079 placement
var FATAL_LINE_RE = /^(remote:\s+)?(fatal|error):/i;
//@ chunk-t3sg9e26.js:39079-39254 placement
function hoistFatalLines(e) {
  if (!e) return "";
  let n = [];
  for (let line of e.split(`
`))
    if (FATAL_LINE_RE.test(line)) n.push(line);
  if (n.length === 0) return e;
  let joined = n.join(`
`);
  if (e.startsWith(joined)) return e;
  return (
    joined +
    `
` +
    e
  );
}
export { redactToken, errorText, redactUrlCredentials, hoistFatalLines, FATAL_LINE_RE, redactGitArg };
