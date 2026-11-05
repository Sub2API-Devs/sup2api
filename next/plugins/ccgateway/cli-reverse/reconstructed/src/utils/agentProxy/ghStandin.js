/**
 * utils/agentProxy/ghStandin.ts
 *
 * gh 替身代理参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pnaj1q5d.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-pnaj1q5d.js:191-229 placement
/**
 * gh 替身代理的启动参数 --gh-standin。
 */
var GH_STANDIN_FLAG = "--gh-standin";
var GHE_HOST_SUFFIX = ".ghe.com";
//@ chunk-pnaj1q5d.js:229-463 placement
/**
 * gh 替身代理的参数与错误提示：--any-host 标志、独立代理模式名，以及会话代理未设置时的报错。
 */
var ANY_HOST_FLAG = "--any-host";
var STANDALONE_PROXY = "standalone-proxy";
var GH_PROXY_UNSET_MESSAGE =
  "gh: this session's proxy is not set (HTTPS_PROXY names no proxy on 127.0.0.1), so gh cannot reach GitHub; run gh from this session's own shell, with HTTPS_PROXY as the session set it.";
//@ chunk-pnaj1q5d.js:463-579 placement
/**
 * 解析代理地址，只接受 http://127.0.0.1 的地址，返回规范化 href。
 */
function parseLoopbackProxyUrl(value) {
  let parsedUrl = URL.parse(value?.trim() ?? "");
  return parsedUrl?.protocol === "http:" && parsedUrl.hostname === "127.0.0.1" ? parsedUrl.href : undefined;
}
//@ chunk-pnaj1q5d.js:579-1247 placement
/**
 * 生成 shell 片段：检查 HTTPS_PROXY 指向 127.0.0.1 的代理，否则报错退出，并导出 HTTPS_PROXY/https_proxy。
 */
function buildGhProxyCheckScript() {
  return `proxy="$(printf %s "\${HTTPS_PROXY:-}" | tr -d '[:space:]')"
authority="\${proxy#http://}"
authority="\${authority%%[/?#]*}"
case "$proxy" in http://*) hostport="\${authority##*@}" ;; *) hostport= ;; esac
case "$hostport" in
  127.0.0.1:*[!0-9]*|127.0.0.1:) hostport= ;;
  127.0.0.1|127.0.0.1:*) ;;
  *) hostport= ;;
esac
if [ -z "$hostport" ]; then
  printf '%s\\n' "gh: this session's proxy is not set (HTTPS_PROXY names no proxy on 127.0.0.1), so gh cannot reach GitHub; run gh from this session's own shell, with HTTPS_PROXY as the session set it." >&2
  exit 1
fi
HTTPS_PROXY="$proxy"; https_proxy="$proxy"; export HTTPS_PROXY https_proxy
`;
}
//@ chunk-pnaj1q5d.js:1247-1260 placement
var ANY = "any";
//@ chunk-pnaj1q5d.js:1260-1846 placement
function parseGhStandinArgs() {
  let [standinFlag, portArg = "", caBundlePath = "", ...rest] = process.argv.slice(2);
  if (standinFlag !== "--gh-standin") return;
  process.argv = process.argv.slice(0, 3);
  let isAnyHost = rest[0] === "--any-host";
  let hostsArg = isAnyHost || rest[0]?.startsWith("--hosts=") ? rest.shift() : undefined;
  let [separator, ...ghArgs] = rest;
  if (
    (portArg === "standalone-proxy" || (/^[1-9]\d{0,4}$/.test(portArg) && Number(portArg) <= 65535)) &&
    caBundlePath !== "" &&
    separator === "--"
  ) {
    let ghesHosts = isAnyHost ? ANY : (hostsArg?.slice(8).split(",") ?? []);
    return {
      port: portArg === "standalone-proxy" ? portArg : Number(portArg),
      caBundlePath,
      ghesHosts,
      ghArgs,
    };
  }
  process.stderr
    .write(`gh: this command is run by the gh shim Claude Code writes for a session; it is not for direct use.
`);
  process.exitCode = 1;
  return "refused";
}
//@ chunk-pnaj1q5d.js:1846-2527 placement
function describeGhStandinHosts(options) {
  let [hostsFlag, hostsDescription] =
    options.ghesHosts === ANY
      ? ["--any-host", " or the GitHub Enterprise host a command names"]
      : options.ghesHosts.length > 0
        ? ["--hosts=" + options.ghesHosts.join(","), " and the hosts named below"]
        : [undefined, ""];
  let mapped = [
    ...options.command,
    "--gh-standin",
    String(options.port),
    options.caBundlePath,
    ...(hostsFlag === undefined ? [] : [hostsFlag]),
  ].map((arg) => `'${arg}'`);
  return `#!/bin/sh
# Claude Code gh stand-in shim (auto-generated; per-session).
# No GitHub CLI was found on this machine when this session started,
# so gh here is Claude Code's own implementation of \`gh api\`: REST
# requests to github.com${hostsDescription} through the session's GitHub proxy. It reads
# no GitHub token from the environment and sends none.
exec ${mapped.join(" ")} -- "$@"
`;
}
export {
  GH_STANDIN_FLAG,
  ANY_HOST_FLAG,
  GHE_HOST_SUFFIX,
  STANDALONE_PROXY,
  describeGhStandinHosts,
  ANY,
  buildGhProxyCheckScript,
  parseLoopbackProxyUrl,
  GH_PROXY_UNSET_MESSAGE,
  parseGhStandinArgs,
};
