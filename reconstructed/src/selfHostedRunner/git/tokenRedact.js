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
function redactGitArg(arg, authURL, gitURL, token) {
  if (arg === authURL && arg !== gitURL) return redactUrlCredentials(arg);
  if (arg.includes("://") && arg.includes("@")) return redactUrlCredentials(arg);
  if (token && arg.includes(token)) return arg.split(token).join("<token>");
  return arg;
}
//@ chunk-t3sg9e26.js:38282-38691 placement
function redactToken(text, authURL, token) {
  if (authURL && /:\/\/[^/]*@/.test(authURL)) text = text.split(authURL).join(redactUrlCredentials(authURL));
  if (token) text = text.split(token).join("<token>");
  return text
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
function redactUrlCredentials(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {}
  if (parsed && (parsed.username || parsed.password)) {
    let search = parsed.search || "";
    let hash = parsed.hash || "";
    return `${parsed.protocol}//<token>@${parsed.host}${parsed.pathname}${search}${hash}`;
  }
  if (parsed) return url;
  let index = url.indexOf("@");
  let index_2 = url.indexOf("://");
  if (index_2 >= 0 && index > index_2) return url.slice(0, index_2 + 3) + "<token>" + url.slice(index);
  return url;
}
//@ chunk-t3sg9e26.js:38980-39040 placement
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-t3sg9e26.js:39040-39079 placement
var FATAL_LINE_RE = /^(remote:\s+)?(fatal|error):/i;
//@ chunk-t3sg9e26.js:39079-39254 placement
function hoistFatalLines(text) {
  if (!text) return "";
  let fatal = [];
  for (let line of text.split(`
`))
    if (FATAL_LINE_RE.test(line)) fatal.push(line);
  if (fatal.length === 0) return text;
  let joined = fatal.join(`
`);
  if (text.startsWith(joined)) return text;
  return (
    joined +
    `
` +
    text
  );
}
export { redactToken, errorText, redactUrlCredentials, hoistFatalLines, FATAL_LINE_RE, redactGitArg };
