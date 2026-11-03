/**
 * upstreamproxy/_new/buildGhGuardScript.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1k6d6j2b.js (1)
 * attribution: sole-consumer-new 1
 */
import { PROXY_INJECTED_MARKER } from "../../utils/subprocessEnv.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";

/**
 * 生成 gh 包装脚本片段：已有用户令牌、非 github.com 主机或仓库/origin 指向其他主机时直接执行原 gh，否则继续走代理。
 */
//@ chunk-1k6d6j2b.js:263-2319 sole-consumer-new
function buildGhGuardScript(ghPath, allowInjectedToken = !1) {
  return (
    (!allowInjectedToken
      ? `if [ -n "\${GH_TOKEN:-}\${GITHUB_TOKEN:-}\${GH_ENTERPRISE_TOKEN:-}\${GITHUB_ENTERPRISE_TOKEN:-}" ]; then
  exec '${ghPath}' "$@"
fi
`
      : `case "\${GH_TOKEN:-}" in ''|'${PROXY_INJECTED_MARKER}') ;; *) exec '${ghPath}' "$@" ;; esac
case "\${GITHUB_TOKEN:-}" in ''|'${PROXY_INJECTED_MARKER}') ;; *) exec '${ghPath}' "$@" ;; esac
if [ -n "\${GH_ENTERPRISE_TOKEN:-}\${GITHUB_ENTERPRISE_TOKEN:-}" ]; then
  exec '${ghPath}' "$@"
fi
`) +
    `host="\${GH_HOST:-}"
repo="\${GH_REPO:-}"
prev=''
for a in "$@"; do
  if [ "$prev" = '--hostname' ]; then host="$a"; prev=''; continue; fi
  if [ "$prev" = '--repo' ]; then repo="$a"; prev=''; continue; fi
  case "$a" in
    --hostname) prev='--hostname' ;;
    --hostname=*) host="\${a#--hostname=}" ;;
    -R|--repo) prev='--repo' ;;
    --repo=*) repo="\${a#--repo=}" ;;
    -R=*) repo="\${a#-R=}" ;;
    -R?*) repo="\${a#-R}" ;;
  esac
done
` +
    `# Hostnames are case-insensitive \u2014 normalize before every compare.
` +
    `host="$(printf %s "$host" | tr '[:upper:]' '[:lower:]')"
if [ -n "$host" ] && [ "$host" != '${GITHUB_HOST}' ]; then
  exec '${ghPath}' "$@"
fi
# A -R/--repo/GH_REPO [HOST/]OWNER/REPO (or URL) carries its own host
# and overrides the checkout. Otherwise repo-scoped commands resolve
` +
    `# their target from the checkout remote, not GH_HOST \u2014 treat a
` +
    `# non-github.com origin as a GHE signal. An EXPLICIT github.com host
# above skips the origin probe: it must not be kicked off the relay
# by the checkout heuristic.
rhost=''
if [ -n "$repo" ]; then
  case "$repo" in
    *://*) rhost="\${repo#*://}"; rhost="\${rhost%%/*}"; rhost="\${rhost##*@}"; rhost="\${rhost%%:*}" ;;
    */*/*) rhost="\${repo%%/*}" ;;
  esac
elif [ -z "$host" ]; then
  origin="$(git config --get remote.origin.url 2>/dev/null || true)"
  case "$origin" in
    *://*) rhost="\${origin#*://}"; rhost="\${rhost%%/*}"; rhost="\${rhost##*@}"; rhost="\${rhost%%:*}" ;;
    *@*:*) rhost="\${origin#*@}"; rhost="\${rhost%%:*}" ;;
  esac
fi
rhost="$(printf %s "$rhost" | tr '[:upper:]' '[:lower:]')"
if [ -n "$rhost" ] && [ "$rhost" != '${GITHUB_HOST}' ]; then
  exec '${ghPath}' "$@"
fi
`
  );
}

export { buildGhGuardScript };
