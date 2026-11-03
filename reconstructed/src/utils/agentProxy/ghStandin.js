/**
 * utils/agentProxy/ghStandin.ts
 *
 * gh 替身代理参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6p9kc8f6.js (7)
 * attribution: placement 7
 */

//@ chunk-6p9kc8f6.js:191-229 placement
var Abi = "--gh-standin",
  D5e = ".ghe.com";
/**
 * gh 替身代理的参数与错误提示：--any-host 标志、独立代理模式名，以及会话代理未设置时的报错。
 */
//@ chunk-6p9kc8f6.js:229-463 placement
var ANY_HOST_FLAG = "--any-host",
  STANDALONE_PROXY = "standalone-proxy",
  GH_PROXY_UNSET_MESSAGE =
    "gh: this session's proxy is not set (HTTPS_PROXY names no proxy on 127.0.0.1), so gh cannot reach GitHub; run gh from this session's own shell, with HTTPS_PROXY as the session set it.";
/**
 * 解析代理地址，只接受 http://127.0.0.1 的地址，返回规范化 href。
 */
//@ chunk-6p9kc8f6.js:463-579 placement
function parseLoopbackProxyUrl(n) {
  let parse = URL.parse(n?.trim() ?? "");
  return parse?.protocol === "http:" && parse.hostname === "127.0.0.1" ? parse.href : void 0;
}
/**
 * 生成 shell 片段：检查 HTTPS_PROXY 指向 127.0.0.1 的代理，否则报错退出，并导出 HTTPS_PROXY/https_proxy。
 */
//@ chunk-6p9kc8f6.js:579-1247 placement
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
//@ chunk-6p9kc8f6.js:1247-1260 placement
var ANY = "any";
//@ chunk-6p9kc8f6.js:1260-1846 placement
function parseGhStandinArgs() {
  let [n, t = "", e = "", ...s] = process.argv.slice(2);
  if (n !== "--gh-standin") return;
  process.argv = process.argv.slice(0, 3);
  let o = s[0] === "--any-host",
    r = o || s[0]?.startsWith("--hosts=") ? s.shift() : void 0,
    [i, ...h] = s;
  if (
    (t === "standalone-proxy" || (/^[1-9]\d{0,4}$/.test(t) && Number(t) <= 65535)) &&
    e !== "" &&
    i === "--"
  ) {
    let a = o ? ANY : (r?.slice(8).split(",") ?? []);
    return { port: t === "standalone-proxy" ? t : Number(t), caBundlePath: e, ghesHosts: a, ghArgs: h };
  }
  return (
    process.stderr
      .write(`gh: this command is run by the gh shim Claude Code writes for a session; it is not for direct use.
`),
    (process.exitCode = 1),
    "refused"
  );
}
//@ chunk-6p9kc8f6.js:1846-2527 placement
function describeGhStandinHosts(n) {
  let [t, e] =
      n.ghesHosts === ANY
        ? ["--any-host", " or the GitHub Enterprise host a command names"]
        : n.ghesHosts.length > 0
          ? ["--hosts=" + n.ghesHosts.join(","), " and the hosts named below"]
          : [void 0, ""],
    mapped = [...n.command, "--gh-standin", String(n.port), n.caBundlePath, ...(t === void 0 ? [] : [t])].map(
      (o) => `'${o}'`,
    );
  return `#!/bin/sh
# Claude Code gh stand-in shim (auto-generated; per-session).
# No GitHub CLI was found on this machine when this session started,
# so gh here is Claude Code's own implementation of \`gh api\`: REST
# requests to github.com${e} through the session's GitHub proxy. It reads
# no GitHub token from the environment and sends none.
exec ${mapped.join(" ")} -- "$@"
`;
}

export {
  Abi,
  ANY_HOST_FLAG,
  D5e,
  STANDALONE_PROXY,
  describeGhStandinHosts,
  ANY,
  buildGhProxyCheckScript,
  parseLoopbackProxyUrl,
  GH_PROXY_UNSET_MESSAGE,
  parseGhStandinArgs,
};
