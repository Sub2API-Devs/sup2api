/**
 * utils/github/ghApi.ts
 *
 * 2.1.316 新增。内置 gh api 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fy5kn7m3.js (39)
 * attribution: placement 39
 */
import { open } from "fs/promises";
import { truncateToLength, escapeControlCharsForDisplay, firstLineOf } from "../stringUtils.js";
import {
  GITHUB_HOST,
  HOST_LABEL_RE,
  normalizeHost,
  githubApiBase,
  isGithubDotCom,
} from "../git/githubUrl.js";
import {
  GHE_HOST_SUFFIX,
  ANY,
  STANDALONE_PROXY,
  parseLoopbackProxyUrl,
  GH_PROXY_UNSET_MESSAGE,
} from "../agentProxy/ghStandin.js";
import { isAnthropicHost } from "../anthropicHosts.js";
import { parseGitRemote } from "../detectRepository.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { BMt } from "../git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, union, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { runBuiltinGhApi, ghProxyRefusalText, proxyCaBundleError } from "./ghApiRequest.js";
import { writeStdStreamOrThrow, handleStreamGoneErrors } from "../process.js";
import { env } from "../env.js";
import { cliExit } from "../../cli/exit.js";
import { readHandleUpTo } from "../fsOperations.js";
import { getErrnoCode } from "../errors.js";
import { getCwd } from "../cwd.js";

//@ chunk-fy5kn7m3.js:4054-4065 placement
var MAX_LABEL_CHARS = 200;
//@ chunk-fy5kn7m3.js:4065-4139 placement
/**
 * 截断过长的标签文本并在截断处加省略号。
 */
function truncateLabel(e) {
  let t = truncateToLength(e, MAX_LABEL_CHARS);
  return escapeControlCharsForDisplay(t) + (t.length < e.length ? "\u2026" : "");
}
//@ chunk-fy5kn7m3.js:4139-4400 placement
/**
 * 主机名长度上限、DNS 名正则、GitHub 自有域名列表。
 */
var MAX_HOSTNAME_LENGTH = 255;
var DNS_NAME_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{1,63}|xn--[a-z0-9-]{1,59})$/;
var GITHUB_OWNED_DOMAINS = [
  GITHUB_HOST,
  "githubusercontent.com",
  "ghcr.io",
  "github.dev",
  "githubpreview.dev",
  "github.io",
  "github.app",
  "githubapp.com",
  "githubassets.com",
  "githubcopilot.com",
];
var API = "api";
//@ chunk-fy5kn7m3.js:4400-4483 placement
function normalizeEnterpriseHost(e) {
  let lower = e.toLowerCase();
  return lower.length <= MAX_HOSTNAME_LENGTH && HOST_LABEL_RE.test(lower) ? lower : "that host";
}
//@ chunk-fy5kn7m3.js:4483-5181 placement
/**
 * 校验 GitHub Enterprise 主机名并得到 API 基址（拒绝 IP、github.com 自有域名、Anthropic 主机；ghe.com 子域用 api. 前缀）。
 */
function resolveEnterpriseHost(e) {
  let t = normalizeHost(e);
  let s = normalizeEnterpriseHost(t);
  let r = {
    refusal: `${s} is not a host this gh sends a request to: name a GitHub Enterprise host by its DNS name alone (no scheme, port, path or IP address).`,
  };
  if (t.length > MAX_HOSTNAME_LENGTH || !DNS_NAME_RE.test(t) || t.endsWith(".localhost")) return r;
  let n = {
    refusal: `${s} is not a GitHub Enterprise host; ${GITHUB_HOST} itself is named as ${GITHUB_HOST}.`,
  };
  if (
    t === GHE_HOST_SUFFIX.slice(1) ||
    GITHUB_OWNED_DOMAINS.some((h) => t === h || t.endsWith(`.${h}`)) ||
    isAnthropicHost(t)
  )
    return n;
  let a;
  let d;
  if (t.endsWith(GHE_HOST_SUFFIX)) {
    let parts = t.slice(0, -GHE_HOST_SUFFIX.length).split(".");
    let [l, y, ...g] = parts;
    let b = y === undefined ? l : y;
    if (g.length > 0 || (y !== undefined && l !== API)) return n;
    let f = b + GHE_HOST_SUFFIX;
    d = `${API}.${f}`;
    a = {
      host: f,
      apiBase: `https://${d}`,
    };
  } else {
    d = t;
    a = {
      host: t,
      apiBase: githubApiBase(t),
    };
  }
  return URL.parse(a.apiBase)?.hostname === d ? a : r;
}
//@ chunk-fy5kn7m3.js:5181-10500 placement
/**
 * 内置 gh api 的帮助文本。
 */
var GH_API_HELP = "repos/{owner}/{repo}";
var HELP_ISSUE_COMMENT_EXAMPLE = `gh api ${GH_API_HELP}/issues/<number>/comments -f body='<text>'`;
var HELP_ADD_LABEL_EXAMPLE = `gh api ${GH_API_HELP}/issues/<number>/labels -f 'labels[]=<label>'  # add a label`;
var HELP_ARTIFACT_DOWNLOAD_NOTE =
  "which are served from another host that this gh does not follow a redirect to";
var HELP_NO_TOKEN_NOTES = [
  "Nothing to sign in to and no token to read: requests go through this session's GitHub proxy, which adds the credential.",
  "gh api user  # the account behind it, where the credential has one",
];
var HELP_SEARCH_REFUSED_NOTE = "where this session's GitHub proxy refuses search/";
var HELP_PULLS_FOR_BRANCH_EXAMPLE = `gh api '${GH_API_HELP}/pulls?head={owner}:{branch}&state=all'  # <number> of the current branch's pull request (a fork's: its owner in place of {owner} before the colon)`;
var HELP_CLONE_EXAMPLE = "git clone https://github.com/<owner>/<repo>.git";
var HELP_PR_SUBCOMMAND_EXAMPLES = new Map([
  [
    "pr create",
    [
      `gh api ${GH_API_HELP}/pulls -f title='<title>' -f head='<branch>' -f base='<base branch>' -f body='<text>'  # a draft: add -F draft=true`,
    ],
  ],
  [
    "pr view",
    [
      `gh api ${GH_API_HELP}/pulls/<number>`,
      `gh api ${GH_API_HELP}/pulls/<number>/ccr/review_threads  # its review threads`,
      `gh api ${GH_API_HELP}/issues/<number>/comments  # its conversation comments`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  ["pr list", [`gh api '${GH_API_HELP}/pulls?state=open&per_page=100'`]],
  [
    "pr merge",
    [
      `gh api -X PUT ${GH_API_HELP}/pulls/<number>/merge -f merge_method=squash`,
      `gh api -X PUT ${GH_API_HELP}/pulls/<number>/ccr/auto_merge -f merge_method=squash  # --auto; -X DELETE cancels it`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  ["pr comment", [HELP_ISSUE_COMMENT_EXAMPLE, HELP_PULLS_FOR_BRANCH_EXAMPLE]],
  [
    "pr checks",
    [
      `gh api ${GH_API_HELP}/commits/<sha>/check-runs`,
      `gh api ${GH_API_HELP}/pulls/<number>  # <sha> of a pull request: its head.sha`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  [
    "pr ready",
    [
      `gh api -X POST ${GH_API_HELP}/pulls/<number>/ccr/ready_for_review`,
      `gh api -X POST ${GH_API_HELP}/pulls/<number>/ccr/convert_to_draft  # --undo`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  [
    "pr review",
    [
      `gh api ${GH_API_HELP}/pulls/<number>/reviews -f event=COMMENT -f body='<text>'  # or event=REQUEST_CHANGES`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  [
    "pr diff",
    [
      `gh api ${GH_API_HELP}/pulls/<number> -H 'Accept: application/vnd.github.diff'`,
      `gh api ${GH_API_HELP}/pulls/<number>/files  # one patch per file`,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  ["pr close", [`gh api -X PATCH ${GH_API_HELP}/pulls/<number> -f state=closed`]],
  [
    "pr edit",
    [
      `gh api -X PATCH ${GH_API_HELP}/pulls/<number> -f title='<title>' -f body='<text>'`,
      HELP_ADD_LABEL_EXAMPLE,
      HELP_PULLS_FOR_BRANCH_EXAMPLE,
    ],
  ],
  [
    "pr checkout",
    ["No `gh api` form: use git.", "git fetch origin refs/pull/<number>/head && git checkout FETCH_HEAD"],
  ],
  ["issue create", [`gh api ${GH_API_HELP}/issues -f title='<title>' -f body='<text>'`]],
  [
    "issue view",
    [
      `gh api ${GH_API_HELP}/issues/<number>`,
      `gh api ${GH_API_HELP}/issues/<number>/comments  # its comments`,
    ],
  ],
  [
    "issue list",
    [
      `gh api '${GH_API_HELP}/issues?state=open&per_page=100'  # pull requests are in the list too: each has a pull_request key`,
    ],
  ],
  ["issue comment", [HELP_ISSUE_COMMENT_EXAMPLE]],
  ["issue close", [`gh api -X PATCH ${GH_API_HELP}/issues/<number> -f state=closed`]],
  [
    "issue edit",
    [
      `gh api -X PATCH ${GH_API_HELP}/issues/<number> -f title='<title>' -f body='<text>'`,
      HELP_ADD_LABEL_EXAMPLE,
    ],
  ],
  [
    "run list",
    [`gh api '${GH_API_HELP}/actions/runs?per_page=20'  # filters: branch=, event=, status=, head_sha=`],
  ],
  [
    "run view",
    [
      `gh api ${GH_API_HELP}/actions/runs/<run-id>`,
      `gh api ${GH_API_HELP}/actions/runs/<run-id>/jobs  # its jobs and their steps`,
      `gh api ${GH_API_HELP}/actions/jobs/<job-id>/logs  # --log: one job's log, where this session's GitHub proxy follows GitHub's redirect for it`,
    ],
  ],
  [
    "run rerun",
    [
      `gh api -X POST ${GH_API_HELP}/actions/runs/<run-id>/rerun-failed-jobs  # --failed`,
      `gh api -X POST ${GH_API_HELP}/actions/runs/<run-id>/rerun  # every job`,
    ],
  ],
  [
    "run watch",
    [
      "No `gh api` form: it polls. Poll the run yourself and read its status and conclusion:",
      `gh api ${GH_API_HELP}/actions/runs/<run-id>`,
    ],
  ],
  ["run cancel", [`gh api -X POST ${GH_API_HELP}/actions/runs/<run-id>/cancel`]],
  [
    "run download",
    [
      `No \`gh api\` form for downloading artifacts, ${HELP_ARTIFACT_DOWNLOAD_NOTE}. Listing them:`,
      `gh api ${GH_API_HELP}/actions/runs/<run-id>/artifacts`,
    ],
  ],
  ["workflow list", [`gh api ${GH_API_HELP}/actions/workflows`]],
  [
    "workflow view",
    [
      `gh api ${GH_API_HELP}/actions/workflows/<workflow>  # <workflow>: its file name (ci.yml) or its id`,
      `gh api ${GH_API_HELP}/actions/workflows/<workflow>/runs  # its runs`,
    ],
  ],
  [
    "workflow run",
    [
      `gh api -X POST ${GH_API_HELP}/actions/workflows/<workflow>/dispatches -f ref=<branch>  # <workflow>: its file name (ci.yml) or its id; inputs: -f 'inputs[<name>]=<value>'`,
    ],
  ],
  ["release list", [`gh api ${GH_API_HELP}/releases`]],
  [
    "release view",
    [
      `gh api ${GH_API_HELP}/releases/tags/<tag>`,
      `gh api ${GH_API_HELP}/releases/latest  # the latest release`,
    ],
  ],
  [
    "release create",
    [
      `gh api ${GH_API_HELP}/releases -f tag_name=<tag> -f name='<title>' -f body='<text>'  # this session's GitHub proxy may refuse release writes`,
      "No `gh api` form for uploading its files, which go to another host.",
    ],
  ],
  [
    "release download",
    [
      `No \`gh api\` form for downloading a release's files, ${HELP_ARTIFACT_DOWNLOAD_NOTE}. Listing them (assets):`,
      `gh api ${GH_API_HELP}/releases/tags/<tag>`,
    ],
  ],
  [
    "release upload",
    ["No `gh api` form: a release's files are uploaded to another host, which this gh does not reach."],
  ],
  ["repo view", [`gh api ${GH_API_HELP}`]],
  ["repo clone", ["No `gh api` form: use git.", HELP_CLONE_EXAMPLE]],
  ["label list", [`gh api ${GH_API_HELP}/labels`]],
  [
    "search issues",
    [
      "gh api -X GET search/issues -f q='<terms> is:issue'",
      `gh api '${GH_API_HELP}/issues?state=all&labels=<label>'  # ${HELP_SEARCH_REFUSED_NOTE}: filter a list`,
    ],
  ],
  [
    "search prs",
    [
      "gh api -X GET search/issues -f q='<terms> is:pr'",
      `gh api '${GH_API_HELP}/pulls?state=all&per_page=100'  # ${HELP_SEARCH_REFUSED_NOTE}: filter a list`,
    ],
  ],
  [
    "search code",
    [
      "gh api -X GET search/code -f q='<terms> repo:<owner>/<repo>'",
      `Search a clone of the repository instead ${HELP_SEARCH_REFUSED_NOTE}.`,
    ],
  ],
  ["search repos", ["gh api -X GET search/repositories -f q='<terms>'"]],
  ["auth status", HELP_NO_TOKEN_NOTES],
  ["auth login", HELP_NO_TOKEN_NOTES],
  ["auth token", HELP_NO_TOKEN_NOTES],
]);
var GH_SUBCOMMAND_ALIASES = new Map([
  ["new", "create"],
  ["ls", "list"],
]);
var REPO_FLAG_RE = /^(-R|--repo)(=|$)|^-R[^-]/;
var REPO_URL_RE = /^https?:\/\/[^/]+\/[^/]+\/[^/]+/;
var REPO_SLUG_ARG_RE = /^[^-/][^/]*(\/[^/]+){1,2}$/;
//@ chunk-fy5kn7m3.js:10500-11186 placement
/**
 * 对不支持的 gh 子命令给出用 gh api 或 git 的替代写法（必要时提示替换 {owner}/{repo} 与 --hostname）。
 */
function ghSubcommandAlternative(e, t) {
  let [s, r] = e;
  if (s === undefined || r === undefined) return;
  let n = `${s} ${GH_SUBCOMMAND_ALIASES.get(r) ?? r}`;
  let a = HELP_PR_SUBCOMMAND_EXAMPLES.get(n);
  if (a === undefined) return;
  let d = t === ANY ? "the repository's GitHub Enterprise host" : t.join(" or ");
  let h =
    d !== ""
      ? a.map((g) =>
          g === HELP_CLONE_EXAMPLE
            ? `git clone https://<host>/<owner>/<repo>.git  # <host>: github.com or ${d}`
            : g,
        )
      : a;
  let sliced = e.slice(2);
  let y =
    h.some((g) => g.includes("{owner}")) &&
    (e.some((g) => REPO_FLAG_RE.test(g)) ||
      sliced.some(
        (g, b) =>
          !(sliced[b - 1] ?? "").startsWith("-") &&
          (REPO_URL_RE.test(g) || (s === "repo" && REPO_SLUG_ARG_RE.test(g))),
      ));
  return (
    `Instead of \`gh ${n}\`:
${h.map((g) => `  ${g}`).join(`
`)}` +
    (y
      ? `
  The command named a repository: write that repository in place of {owner}/{repo}.` +
        (d !== "" ? " If it is on another host, add --hostname <host>." : "")
      : "")
  );
}
//@ chunk-fy5kn7m3.js:11186-11687 placement
/**
 * 内置 gh 的说明文案（GraphQL 不可用、内置客户端、本机没有 gh）。
 */
var GRAPHQL_UNAVAILABLE_TEXT =
  "GitHub GraphQL is not available through this session's GitHub proxy; use the REST API (gh api repos/{owner}/{repo}/...). For review threads, auto-merge and draft or ready, the proxy serves repos/{owner}/{repo}/pulls/<number>/ccr/review_threads, .../ccr/comments/<comment-id>/resolve, .../ccr/auto_merge, .../ccr/ready_for_review and .../ccr/convert_to_draft.";
var BUILTIN_GH_LABEL = "Claude Code's built-in GitHub client, not the GitHub CLI";
var NO_GH_CLI_TEXT = "no GitHub CLI was found on this machine when this session started";
//@ chunk-fy5kn7m3.js:11687-14216 placement
function ghApiUsageText(e) {
  let t = e === ANY;
  let s = t || e.length > 0;
  return `Usage: gh api <endpoint> [flags]

This gh is ${BUILTIN_GH_LABEL}:
${NO_GH_CLI_TEXT}.
${
  t
    ? `It makes GitHub REST API requests to ${GITHUB_HOST}, or to the GitHub Enterprise
host of this checkout's remote (or --hostname <host>), through this session's
GitHub proxy, which supplies the credential for the hosts and repositories this
session is connected to, and has no other gh command.`
    : `It makes GitHub REST API requests to ${[GITHUB_HOST, ...e].join(", ")} through this session's GitHub
proxy, already authenticated, and has no other gh command.`
}
A GitHub CLI installed during the session takes this one's place once it is on
PATH. On a self-hosted runner that one has only the GitHub credentials the
runner's operator provides and does not go through this session's GitHub proxy.

Flags:${
    s
      ? `
      --hostname <host>     GitHub host of the request${t ? "" : ", as GH_HOST"} (default ${GITHUB_HOST}, or the
                            host of the repository that fills {owner}, {repo} in the endpoint)`
      : ""
  }
  -X, --method <method>     HTTP method (default GET, or POST with parameters or --input)
  -f, --raw-field key=value String parameter
  -F, --field key=value     Typed parameter: true, false, null and integers become JSON
                            values, {owner} {repo} {branch} are filled in, @file reads a
                            file, @- reads standard input
  -H, --header 'Name: v'    Request header
      --input <file>        File to send as the request body (- for standard input)
  -i, --include             Print the response status line and headers
      --paginate            Follow the response's rel="next" links (GET only)
  -q, --jq <expression>     Filter the response with jq (needs jq on PATH; without it, pipe the
                            output to a JSON tool that is installed)
      --silent              Do not print the response body

{owner}, {repo} and {branch} (or :owner, :repo, :branch) in the endpoint and in
-F values are filled in from GH_REPO, else from the ${s && !t ? "remotes on those hosts" : `${GITHUB_HOST} remotes`} of the
current repository: upstream, github, origin, then the others by name.${
    t
      ? `
A repository with no ${GITHUB_HOST} remote is read for its other remotes the same
way, and the remote chosen names the host the request goes to.
GH_HOST and a host in GH_REPO pick no host other than ${GITHUB_HOST} here: name one
with --hostname. A request to another host says so in one line on standard error.`
      : ""
  }

Example: gh api repos/{owner}/{repo}/pulls -f title='Fix' -f head='my-branch' -f base='main'
`;
}
//@ chunk-fy5kn7m3.js:14216-14309 placement
var GH_HOST_NOTE = ` The host came from GH_HOST: \`--hostname ${GITHUB_HOST}\` names github.com for one command.`;
//@ chunk-fy5kn7m3.js:14309-14632 placement
/**
 * GH_HOST/GH_REPO 指向其他主机时的拒绝说明。
 */
function hostEnvVarRefusal(e) {
  return (
    `${e} names a host other than ${GITHUB_HOST}, and an environment variable is not used to pick a host in this session: ` +
    (e === "GH_HOST"
      ? `pass --hostname <host> on the command instead. For ${GITHUB_HOST}, pass --hostname ${GITHUB_HOST} or unset GH_HOST.`
      : "set GH_REPO=OWNER/REPO and pass --hostname <host> on the command instead.")
  );
}
//@ chunk-fy5kn7m3.js:14632-14914 placement
/**
 * 主机不在本会话 GitHub 代理范围内的说明。
 */
function hostNotServedText(e, t, s = false) {
  return (
    `${normalizeEnterpriseHost(e)} is not served here: this gh reaches ${[GITHUB_HOST, ...t].join(" and ")} only, through this session's GitHub proxy. Which GitHub Enterprise Server hosts it reaches is fixed when the session starts, and nothing run in the session adds one` +
    (s ? `.${GH_HOST_NOTE}` : ".")
  );
}
//@ chunk-fy5kn7m3.js:14914-15489 placement
/**
 * gh api 带值参数、开关参数与不支持参数表。
 */
var GH_API_VALUE_FLAGS = {
  "-X": "--method",
  "-f": "--raw-field",
  "-F": "--field",
  "-H": "--header",
  "-q": "--jq",
  "-t": "--template",
  "-p": "--preview",
  "--method": "--method",
  "--raw-field": "--raw-field",
  "--field": "--field",
  "--header": "--header",
  "--jq": "--jq",
  "--input": "--input",
  "--hostname": "--hostname",
  "--template": "--template",
  "--preview": "--preview",
  "--cache": "--cache",
};
var GH_API_BOOLEAN_FLAGS = {
  "-i": "--include",
  "-h": "--help",
  "--include": "--include",
  "--paginate": "--paginate",
  "--silent": "--silent",
  "--help": "--help",
  "--slurp": "--slurp",
  "--verbose": "--verbose",
};
var GH_API_UNSUPPORTED_FLAGS = new Set(["--template", "--preview", "--slurp", "--verbose"]);
//@ chunk-fy5kn7m3.js:15489-18121 placement
function parseGhApiArgs(e, ghHost, s, r) {
  if (e[0] !== "api")
    return {
      kind: "refuse",
      message:
        `this gh is ${BUILTIN_GH_LABEL} (Claude Code ${r}): \`gh api <REST endpoint>\` works here, already authenticated through this session's GitHub proxy, and there is no other gh command (${NO_GH_CLI_TEXT}).
` + (ghSubcommandAlternative(e, s) ?? "Example: gh api repos/{owner}/{repo}/pulls/123"),
    };
  let n = {
    endpoint: "",
    host: undefined,
    method: undefined,
    rawFields: [],
    typedFields: [],
    headers: [],
    inputFile: undefined,
    jq: undefined,
    include: false,
    paginate: false,
    silent: false,
  };
  let a = [];
  let d = ghHost;
  let h = true;
  let l = [];
  for (let idx = 1; idx < e.length; idx++) {
    let f = e[idx];
    if (f === "--") {
      a.push(...e.slice(idx + 1));
      break;
    }
    if (!f.startsWith("-") || f === "-") {
      a.push(f);
      continue;
    }
    let O = f.startsWith("--");
    let G = O ? [firstLineOf(f, "=")] : Array.from(f.slice(1), (S) => `-${S}`);
    for (let [S, H] of G.entries()) {
      let j = GH_API_BOOLEAN_FLAGS[H];
      let N = GH_API_VALUE_FLAGS[H];
      if (j !== undefined) {
        if (!O || !/=(?:false|0)$/i.test(f)) l.push([j, ""]);
        continue;
      }
      if (N === undefined)
        return {
          kind: "refuse",
          message: `unknown ${O ? "flag" : "shorthand flag"}: ${truncateLabel(H)}

${ghApiUsageText(s)}`,
        };
      let L =
        (O
          ? f.includes("=")
            ? f.slice(H.length + 1)
            : undefined
          : f.slice(S + 2).replace(/^=/, "") || undefined) ?? e[++idx];
      if (L === undefined)
        return {
          kind: "refuse",
          message: `flag needs an argument: ${H}`,
        };
      l.push([N, L]);
      break;
    }
  }
  for (let [b, f] of l) {
    if (GH_API_UNSUPPORTED_FLAGS.has(b))
      return {
        kind: "refuse",
        message: `${b} is not supported by this built-in gh.

${ghApiUsageText(s)}`,
      };
    switch (b) {
      case "--help":
        return {
          kind: "help",
        };
      case "--method":
        n.method = f;
        break;
      case "--raw-field":
        n.rawFields.push(f);
        break;
      case "--field":
        n.typedFields.push(f);
        break;
      case "--header":
        n.headers.push(f);
        break;
      case "--jq":
        n.jq = f;
        break;
      case "--input":
        n.inputFile = f;
        break;
      case "--hostname":
        d = f;
        h = false;
        break;
      case "--include":
        n.include = true;
        break;
      case "--paginate":
        n.paginate = true;
        break;
      case "--silent":
        n.silent = true;
        break;
    }
  }
  if (d !== undefined) {
    let b = normalizeHost(d);
    if (isGithubDotCom(d)) n.host = GITHUB_HOST;
    else if (s === ANY && h) {
      if (d !== "" && !a[0]?.includes("://"))
        return {
          kind: "refuse",
          message: hostEnvVarRefusal("GH_HOST"),
        };
    } else if (s === ANY) {
      let enterpriseHost = resolveEnterpriseHost(d);
      if ("refusal" in enterpriseHost)
        return {
          kind: "refuse",
          message: enterpriseHost.refusal,
        };
      n.host = enterpriseHost.host;
    } else if (s.includes(b)) n.host = b;
    else
      return {
        kind: "refuse",
        message: hostNotServedText(d, s, h),
      };
  }
  let [y, ...g] = a;
  if (y === undefined || g.length > 0)
    return {
      kind: "refuse",
      message: `accepts 1 arg(s), received ${a.length}

${ghApiUsageText(s)}`,
    };
  if (y === "")
    return {
      kind: "refuse",
      message: "the endpoint is empty; give a REST path such as repos/{owner}/{repo}/pulls",
    };
  if (n.paginate && n.inputFile !== undefined)
    return {
      kind: "refuse",
      message: "the `--paginate` option is not supported with `--input`",
    };
  if (n.paginate && n.method !== undefined && n.method.toUpperCase() !== "GET")
    return {
      kind: "refuse",
      message: "the `--paginate` option is not supported for non-GET requests",
    };
  if (n.silent && n.jq !== undefined)
    return {
      kind: "refuse",
      message: "only one of `--silent` or `--jq` may be used, since `--silent` prints no response body",
    };
  n.endpoint = y;
  return {
    kind: "api",
    options: n,
  };
}
//@ chunk-fy5kn7m3.js:18121-18144 placement
/**
 * -f/-F 字段解析失败时抛出的错误类型。
 */
class FieldParseError extends Error {}
//@ chunk-fy5kn7m3.js:18144-18334 placement
/**
 * 把 -f/-F 字段解析为嵌套参数表（-F 值经回调转换，如读文件）。
 */
async function buildFieldParams(rawFields, typedFields, s) {
  let r = new Map();
  for (let n of rawFields) {
    let { keys, key, value: h } = parseFieldKey(n);
    setNestedField(r, keys, key, h);
  }
  for (let n of typedFields) {
    let { keys, key, value: h } = parseFieldKey(n);
    setNestedField(r, keys, key, h === undefined ? h : await s(h));
  }
  return r;
}
//@ chunk-fy5kn7m3.js:18334-18407 placement
/**
 * 把 Map 形式的参数表递归转成普通对象。
 */
function mapToPlainObject(e) {
  return Object.fromEntries([...e].map(([t, s]) => [t, plainParamValue(s)]));
}
//@ chunk-fy5kn7m3.js:18407-18466 placement
/**
 * 把嵌套参数表展开为 key[sub]、key[] 形式的键值对列表。
 */
function flattenParamEntries(fieldParams) {
  let t = [];
  for (let [s, r] of fieldParams) flattenParams(t, s, r);
  return t;
}
//@ chunk-fy5kn7m3.js:18466-18550 placement
function plainParamValue(e) {
  if (e instanceof Map) return mapToPlainObject(e);
  return Array.isArray(e) ? e.map(plainParamValue) : e;
}
//@ chunk-fy5kn7m3.js:18550-18720 placement
/**
 * 把嵌套参数表展开为 key[sub]、key[] 形式的键值对。
 */
function flattenParams(e, t, s) {
  if (s instanceof Map) for (let [r, n] of s) flattenParams(e, `${t}[${r}]`, n);
  else if (Array.isArray(s)) for (let r of s) flattenParams(e, `${t}[]`, r);
  else e.push([t, s === null ? "" : String(s)]);
}
//@ chunk-fy5kn7m3.js:18720-19187 placement
/**
 * 解析字段 “a[b][]=v” 为键路径、键名与值。
 */
function parseFieldKey(e) {
  let t = [];
  let s = 0;
  let r = 0;
  for (let j = 0; j < e.length && r === 0; j++) {
    let a = e[j];
    if (a === "[") {
      if (s === 0) t.push(e.slice(0, j));
      s = j + 1;
    } else if (a === "]") t.push(e.slice(s, j));
    else if (a === "=") {
      if (s === 0) t.push(e.slice(0, j));
      r = j + 1;
    }
  }
  if (t.length === 0 || t[0] === "") throw new FieldParseError(`invalid key: "${truncateLabel(e)}"`);
  if (r === 0) {
    if (t.at(-1) !== "")
      throw new FieldParseError(`field "${truncateLabel(e)}" requires a value separated by an '=' sign`);
    return {
      keys: t,
      key: e,
      value: undefined,
    };
  }
  return {
    keys: t,
    key: e.slice(0, r - 1),
    value: e.slice(r),
  };
}
//@ chunk-fy5kn7m3.js:19187-19633 placement
/**
 * 按键路径把值写入参数表（[] 为数组追加，重复键报错）。
 */
function setNestedField(e, keys, key, r) {
  let n = e;
  let a = false;
  let d = "";
  for (let l of keys) {
    if (l === "") {
      a = true;
      continue;
    }
    if (d !== "") {
      n = nestedContainer(n, d, a ? l : undefined);
      a = false;
    }
    d = l;
  }
  let h = n.get(d);
  if (!a) {
    if (h !== undefined || r === undefined)
      throw new FieldParseError(
        h !== undefined
          ? `unexpected override existing field under "${truncateLabel(d)}"`
          : `field "${truncateLabel(key)}" requires a value separated by an '=' sign`,
      );
    n.set(d, r);
    return;
  }
  if (h !== undefined && !Array.isArray(h))
    throw new FieldParseError(`expected array type under "${truncateLabel(d)}"`);
  n.set(d, r === undefined ? (h ?? []) : [...(h ?? []), r]);
}
//@ chunk-fy5kn7m3.js:19633-19975 placement
/**
 * 取得或创建下一级 map（数组元素时按需新建）。
 */
function nestedContainer(e, t, s) {
  let r = e.get(t);
  let n = new Map();
  if (s === undefined) {
    if (r instanceof Map) return r;
    if (r !== undefined) throw new FieldParseError(`expected map type under "${truncateLabel(t)}"`);
    e.set(t, n);
    return n;
  }
  if (r !== undefined && !Array.isArray(r))
    throw new FieldParseError(`expected array type under "${truncateLabel(t)}"`);
  let last = r?.at(-1);
  if (last instanceof Map && !last.has(s)) return last;
  e.set(t, [...(r ?? []), n]);
  return n;
}
//@ chunk-fy5kn7m3.js:19975-20132 placement
/**
 * 仓库上下文常量：占位符正则、优先远程名、远程配置键正则、owner/repo 形状。
 */
var GIT_CONFIG_TIMEOUT_MS = 1e4;
var REPO_PLACEHOLDER_RE = /\{(owner|repo|branch)\}|:(owner|repo|branch)\b/g;
var PREFERRED_REMOTES = ["upstream", "github", "origin"];
var REMOTE_CONFIG_KEY_PATTERN = "^remote\\..+\\.(url|gh-resolved)$";
var OWNER_REPO_RE = /^[^/]+\/[^/]+$/;
//@ chunk-fy5kn7m3.js:20132-20155 placement
/**
 * gh api 用法错误（参数或路径不合法）。
 */
class GhApiUsageError extends Error {}
//@ chunk-fy5kn7m3.js:20155-20195 placement
/**
 * 判断端点里是否含 {owner}/{repo} 之类的仓库占位符。
 */
function hasRepoPlaceholder(e) {
  return e.search(REPO_PLACEHOLDER_RE) !== -1;
}
//@ chunk-fy5kn7m3.js:20195-23187 placement
/**
 * 内置 gh api 的仓库上下文（owner/repo/branch 推断与占位符填充）。
 */
class GhRepoContext {
  cwd;
  ghRepo;
  ghRepoHost;
  ghesHosts;
  host;
  repository;
  branch;
  pathFrom;
  constructor(cwd, ghRepo, s, ghesHosts) {
    this.cwd = cwd;
    this.ghRepo = ghRepo ?? "";
    this.ghRepoHost = s ?? GITHUB_HOST;
    this.ghesHosts = ghesHosts;
    this.host = s;
  }
  pathFilledFromHost() {
    return this.pathFrom?.repository.host;
  }
  pathFilledFromRemote() {
    return this.pathFrom?.remote;
  }
  async fill(e, t) {
    let s = new Map();
    for (let [, r, n] of e.matchAll(REPO_PLACEHOLDER_RE)) {
      let a = r ?? n ?? "";
      if (s.has(a)) continue;
      if (a === "branch") {
        let d = await (this.branch ??= this.findBranch());
        s.set(a, t ? d.split("/").map(encodeURIComponent).join("/") : d);
      } else {
        let d = await (this.repository ??= this.findRepository());
        let { owner, name: l } = d.repository;
        let y = a === "owner" ? owner : l;
        if (t && y.includes("/"))
          throw new GhApiUsageError(
            `{${a}} would be more than one path segment here (this checkout's repository is a nested project path, not OWNER/REPO): spell the endpoint out`,
          );
        s.set(a, y);
        if (t) this.pathFrom = d;
      }
    }
    return e.replace(REPO_PLACEHOLDER_RE, (r, n, a) => s.get(n ?? a ?? "") ?? r);
  }
  async findRepository() {
    return this.ghesHosts === ANY ? this.findOnAnyHost() : this.findOnServedHost(this.ghesHosts);
  }
  async remoteListing() {
    let e = ["config", "-z", "--get-regexp", REMOTE_CONFIG_KEY_PATTERN];
    return (await this.git(e)) ?? "";
  }
  ghRepoRepository() {
    return parseGitRemote(
      `https://${OWNER_REPO_RE.test(this.ghRepo) ? `${this.ghRepoHost}/` : ""}${this.ghRepo}`,
    );
  }
  async findOnServedHost(e) {
    let t;
    let s = [GITHUB_HOST, ...e];
    let r = this.host === undefined ? s : [this.host];
    if (this.ghRepo === "") {
      let n = await this.remoteListing();
      t = pickPreferredRemote(n, (d) => remoteOnHost(d, r));
      let found = parseRemoteConfig(n).find(({ repository }) => !remoteOnHost(repository, s));
      if (!t && found && !preferredRemoteRepository(n, s))
        throw new GhApiUsageError(
          `{owner}/{repo} would be this checkout's repository, whose remote is on another host: ${hostNotServedText(found.repository.host, e)}`,
        );
    } else {
      let n = this.ghRepoRepository();
      if (n && !remoteOnHost(n, s)) throw new GhApiUsageError(hostNotServedText(n.host, e));
      let a = n && remoteOnHost(n, r);
      t = a
        ? {
            repository: a,
          }
        : undefined;
    }
    if (!t) {
      let any = r.some((a) => a !== GITHUB_HOST);
      throw new GhApiUsageError(
        `could not tell which ${r.join(" or ")} repository {owner}/{repo} is: set GH_REPO=${any ? "[HOST/]" : ""}OWNER/REPO or spell the repository out in the endpoint${r.length > 1 ? " and name its host with --hostname" : ""}`,
      );
    }
    return t;
  }
  async findOnAnyHost() {
    let host = this.host;
    let t;
    if (this.ghRepo === "") {
      let s = await this.remoteListing();
      t = pickPreferredRemote(s, (n) => remoteOnHost(n, [host ?? GITHUB_HOST]));
      let r = t || host !== undefined ? undefined : pickPreferredRemote(s, (n) => n);
      if (r) {
        let enterpriseHost = resolveEnterpriseHost(r.repository.host);
        if ("refusal" in enterpriseHost)
          throw new GhApiUsageError(
            `{owner}/{repo} would be the repository of ${remoteDescription(r.remote)}: ${enterpriseHost.refusal}`,
          );
        t = {
          remote: r.remote,
          repository: {
            ...r.repository,
            host: enterpriseHost.host,
          },
        };
      }
    } else {
      let s = this.ghRepoRepository();
      if (s && !OWNER_REPO_RE.test(this.ghRepo) && !isGithubDotCom(s.host))
        throw new GhApiUsageError(hostEnvVarRefusal("GH_REPO"));
      let r = s && remoteOnHost(s, [host ?? GITHUB_HOST]);
      t = r
        ? {
            repository: r,
          }
        : undefined;
    }
    if (!t)
      throw new GhApiUsageError(
        `could not tell which ${host === undefined ? "" : `${host} `}repository {owner}/{repo} is: set GH_REPO=OWNER/REPO or spell the repository out in the endpoint${host === undefined ? " and name its host with --hostname" : ""}`,
      );
    return t;
  }
  async findBranch() {
    let e = await this.git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (e === undefined)
      throw new GhApiUsageError("could not tell the current branch for {branch}: spell the branch out");
    return e;
  }
  async git(e) {
    let t = await execFileNoThrowWithCwd("git", [...BMt, ...e], {
      cwd: this.cwd,
      env: getRemoteHostSessionCount(),
      timeout: GIT_CONFIG_TIMEOUT_MS,
      preserveOutputOnError: false,
    });
    return t.code === 0 && t.stdout.trim() !== "" ? t.stdout.trim() : undefined;
  }
}
//@ chunk-fy5kn7m3.js:23187-23276 placement
function remoteOnHost(e, t) {
  let s = isGithubDotCom(e.host) ? GITHUB_HOST : normalizeHost(e.host);
  return t.includes(s)
    ? {
        ...e,
        host: s,
      }
    : undefined;
}
//@ chunk-fy5kn7m3.js:23276-23329 placement
function preferredRemoteRepository(e, t) {
  return pickPreferredRemote(e, (s) => remoteOnHost(s, t))?.repository;
}
//@ chunk-fy5kn7m3.js:23329-23632 placement
/**
 * 按 gh-resolved 标记与 upstream/github/origin 顺序选出远程及其仓库。
 */
function pickPreferredRemote(e, t) {
  let s = [];
  for (let { name: n, marked, repository } of parseRemoteConfig(e)) {
    let h = t(repository);
    if (!h) continue;
    let index = PREFERRED_REMOTES.indexOf(n);
    s.push({
      name: n,
      rank: marked ? -1 : index === -1 ? PREFERRED_REMOTES.length : index,
      repository: h,
    });
  }
  s.sort((n, a) => n.rank - a.rank || (n.name < a.name ? -1 : n.name > a.name ? 1 : 0));
  let [r] = s;
  return (
    r && {
      repository: r.repository,
      remote: r.name,
    }
  );
}
//@ chunk-fy5kn7m3.js:23632-23762 placement
/**
 * “this checkout's remote X” 文本（名字不合法时用泛称）。
 */
function remoteDescription(e) {
  return e !== undefined && /^[A-Za-z0-9._-]{1,64}$/.test(e)
    ? `this checkout's remote ${e}`
    : "one of this checkout's remotes";
}
//@ chunk-fy5kn7m3.js:23762-24152 placement
/**
 * 解析 git config -z 的 remote.*.url/gh-resolved 输出为远程列表。
 */
function parseRemoteConfig(e) {
  let t = new Map();
  for (let s of e.split("\x00")) {
    let [r = "", n] = s.split(
      `
`,
      2,
    );
    let match = /^remote\.(.+)\.(url|gh-resolved)$/.exec(r);
    if (n === undefined || match === null) continue;
    let [, d = "", h] = match;
    let l = t.get(d) ?? {
      marked: false,
    };
    if (h === "url") l.url ??= n;
    else if (n === "base") l.marked = true;
    t.set(d, l);
  }
  return [...t].flatMap(([s, { url: r, marked: n }]) => {
    let a = r === undefined ? null : parseGitRemote(r);
    return a
      ? [
          {
            name: s,
            marked: n,
            repository: a,
          },
        ]
      : [];
  });
}
//@ chunk-fy5kn7m3.js:24152-24196 placement
var MAX_PERCENT_DECODE_ROUNDS = 4;
var ENTERPRISE_API_PATH_SEGMENTS = new Set(["api", "v3", "uploads"]);
//@ chunk-fy5kn7m3.js:24196-24825 placement
/**
 * 检查路径（反复百分号解码后）：拒绝 .. 段、GraphQL、控制字符。
 */
function checkEndpointPath(pathname, t) {
  let s = pathname;
  for (let j = 0; ; j++) {
    let replaced = s.replace(/%([0-9a-f]{2})/gi, (d, h) => String.fromCharCode(Number.parseInt(h, 16)));
    if (replaced === s) break;
    if (j === MAX_PERCENT_DECODE_ROUNDS)
      return `the path is percent-encoded more than ${MAX_PERCENT_DECODE_ROUNDS} times over; spell it plainly`;
    s = replaced;
  }
  let r = 0;
  for (let n of s.toLowerCase().replaceAll("\\", "/").split("/")) {
    let a = firstLineOf(n, ";");
    if (a === "..") {
      if (t)
        return "the path holds a `..` segment (percent-encoded, or with `;` parameters); spell it plainly";
      r = 0;
    } else if (r === 0 && /^graphql(?![a-z0-9_-])/.test(a)) return GRAPHQL_UNAVAILABLE_TEXT;
    else if (a !== "" && a !== "." && !ENTERPRISE_API_PATH_SEGMENTS.has(a)) r++;
  }
  return /[\0-\x1f\x7f]/.test(s) ? "the path contains an encoded control character" : undefined;
}
//@ chunk-fy5kn7m3.js:24825-25604 placement
/**
 * 内置 gh api 的默认值常量组（体积上限、超时、重定向状态码、API 版本、允许的头名等）与错误响应 schema。
 */
var GH_API_DEFAULTS_2 = 26214400;
var GH_API_DEFAULTS = 104857600;
var MAX_RESPONSE_BYTES = 8388608;
var MAX_JQ_INPUT_BYTES = 1048576;
var PROXY_CONNECT_TIMEOUT_MS = 300000;
var MAX_PAGINATION_PAGES = 5;
var ABORTED_EXIT_CODE = 141;
var MAX_PAGE_BODY_BYTES = 255;
var REDIRECT_STATUS_SET = new Set([301, 302, 303, 307, 308]);
var GITHUB_API_VERSION = "2022-11-28";
var MAX_REDIRECTS = 120;
var ACTIONS_ENDPOINT_RE = /\/(?:repos\/[^/]+\/[^/]+|repositories\/\d+)\/actions\//;
var ACTIONS_PROXY_NOTE = `This session's GitHub proxy may have no GitHub Enterprise connection for that host, or it may not be a GitHub Enterprise host; nothing run in the session adds a connection. For ${GITHUB_HOST}, add --hostname ${GITHUB_HOST}.`;
var INVALID_ENDPOINT_PATH_TEXT = "the endpoint is not a valid URL path";
var OPEN_BRACKET_CODE = 91;
var CLOSE_BRACKET_CODE = 93;
var HEADER_VALUE_SPACE_CODES = new Set([32, 9, 10, 13]);
var ALLOWED_HEADER_NAMES = new Set([
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "time-zone",
  "x-github-api-version",
  "x-github-next-global-id",
]);
var ghApiErrorSchema = DoctorLazy(() =>
  u({
    message: string().optional().catch(undefined),
    errors: union([string(), array(unknown())])
      .optional()
      .catch(undefined),
  }),
);
var ghApiMessageSchema = DoctorLazy(() =>
  u({
    message: string(),
  }),
);
//@ chunk-fy5kn7m3.js:25604-25627 placement
/**
 * gh api 请求本身失败（网络、代理）时抛出的错误。
 */
class GhApiRequestError extends Error {}
//@ chunk-fy5kn7m3.js:25627-25651 placement
/**
 * gh api 返回错误响应时抛出的错误。
 */
class GhApiResponseError extends Error {}
//@ chunk-fy5kn7m3.js:25651-26566 placement
async function ghApiVersionInfo(ghArgs, t) {
  let s =
    t.ghesHosts === ANY
      ? t.ghesHosts
      : t.ghesHosts.filter(
          (ghesHost) =>
            !ghesHost.endsWith(GHE_HOST_SUFFIX) && URL.parse(githubApiBase(ghesHost))?.hostname === ghesHost,
        );
  let ghApiArgs = parseGhApiArgs(
    ghArgs,
    t.ghHost,
    s,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  );
  try {
    switch (ghApiArgs.kind) {
      case "help":
        await t.write("stdout", ghApiUsageText(s));
        return 0;
      case "refuse":
        await t.write(
          "stderr",
          `gh: ${ghApiArgs.message}
`,
        );
        return 1;
      case "api":
        return await runBuiltinGhApi(ghApiArgs.options, t, s);
    }
  } catch (error) {
    if (error instanceof GhApiResponseError) return ABORTED_EXIT_CODE;
    await t.write(
      "stderr",
      `gh: ${ghProxyRefusalText(error, t.statusUrl)}
`,
    );
    return 1;
  }
}
//@ chunk-fy5kn7m3.js:26566-27151 placement
/**
 * 内置 gh 入口：确定代理地址、读 CA 文件、执行 gh api 并按结果退出。
 */
async function runGhApiShim({ port, caBundlePath, ghesHosts, ghArgs }) {
  let n = writeStdStreamOrThrow;
  handleStreamGoneErrors(process.stdout);
  handleStreamGoneErrors(process.stderr);
  let a = 1;
  let d = port !== STANDALONE_PROXY ? `http://127.0.0.1:${port}` : parseLoopbackProxyUrl(env.HTTPS_PROXY);
  if (d === undefined) {
    await n(
      "stderr",
      `${GH_PROXY_UNSET_MESSAGE}
`,
    );
    cliExit(a);
    return;
  }
  let h;
  try {
    await using l = await open(caBundlePath, "r");
    h = (await readHandleUpTo(l, MAX_RESPONSE_BYTES)).toString("utf8");
  } catch (error) {
    await n(
      "stderr",
      `gh: ${proxyCaBundleError(getErrnoCode(error) ?? "unreadable")}
`,
    );
  }
  if (h !== undefined)
    a = await ghApiVersionInfo(ghArgs, {
      proxyUrl: d,
      statusUrl: port === STANDALONE_PROXY ? undefined : `${d}/__agentproxy/status`,
      ca: h,
      cwd: getCwd(),
      path: env.PATH ?? "",
      ghHost: env.GH_HOST,
      ghRepo: env.GH_REPO,
      ghesHosts,
      get stdin() {
        return process.stdin;
      },
      write: n,
    });
  cliExit(a);
}
export {
  GhApiResponseError,
  GhApiRequestError,
  GhRepoContext,
  buildFieldParams,
  remoteDescription,
  flattenParamEntries,
  mapToPlainObject,
  GH_API_DEFAULTS,
  GH_API_DEFAULTS_2,
  PROXY_CONNECT_TIMEOUT_MS,
  OPEN_BRACKET_CODE,
  CLOSE_BRACKET_CODE,
  HEADER_VALUE_SPACE_CODES,
  ACTIONS_PROXY_NOTE,
  REDIRECT_STATUS_SET,
  MAX_PAGINATION_PAGES,
  resolveEnterpriseHost,
  hasRepoPlaceholder,
  INVALID_ENDPOINT_PATH_TEXT,
  hostNotServedText,
  MAX_PAGE_BODY_BYTES,
  ACTIONS_ENDPOINT_RE,
  checkEndpointPath,
  GITHUB_API_VERSION,
  truncateLabel,
  ALLOWED_HEADER_NAMES,
  MAX_JQ_INPUT_BYTES,
  ghApiErrorSchema,
  ghApiMessageSchema,
  FieldParseError,
  GhApiUsageError,
  MAX_REDIRECTS,
};
