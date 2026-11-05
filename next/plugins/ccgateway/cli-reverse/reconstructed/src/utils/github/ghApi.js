/**
 * utils/github/ghApi.ts
 *
 * 2.1.316 新增。内置 gh api 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ntm2y5qw.js (39)
 * attribution: placement 39
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { SAFE_GIT_REPO_ARGS } from "../git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, union, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { runBuiltinGhApi, ghProxyRefusalText, proxyCaBundleError } from "./ghApiRequest.js";
import { writeStdStreamOrThrow, handleStreamGoneErrors } from "../process.js";
import { env } from "../env.js";
import { cliExit } from "../../cli/exit.js";
import { readHandleUpTo } from "../fsOperations.js";
import { getErrnoCode } from "../errors.js";
import { getCwd } from "../cwd.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ntm2y5qw.js:4389-4400 placement
var MAX_LABEL_CHARS = 200;
//@ chunk-ntm2y5qw.js:4400-4473 placement
/**
 * 截断过长的标签文本并在截断处加省略号。
 */
function truncateLabel(text) {
  let truncated = truncateToLength(text, MAX_LABEL_CHARS);
  return escapeControlCharsForDisplay(truncated) + (truncated.length < text.length ? "\u2026" : "");
}
//@ chunk-ntm2y5qw.js:4473-4734 placement
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
//@ chunk-ntm2y5qw.js:4734-4817 placement
function normalizeEnterpriseHost(host) {
  let lower = host.toLowerCase();
  return lower.length <= MAX_HOSTNAME_LENGTH && HOST_LABEL_RE.test(lower) ? lower : "that host";
}
//@ chunk-ntm2y5qw.js:4817-5515 placement
/**
 * 校验 GitHub Enterprise 主机名并得到 API 基址（拒绝 IP、github.com 自有域名、Anthropic 主机；ghe.com 子域用 api. 前缀）。
 */
function resolveEnterpriseHost(host) {
  let normalizedHost = normalizeHost(host);
  let safeHost = normalizeEnterpriseHost(normalizedHost);
  let dnsRefusal = {
    refusal: `${safeHost} is not a host this gh sends a request to: name a GitHub Enterprise host by its DNS name alone (no scheme, port, path or IP address).`,
  };
  if (
    normalizedHost.length > MAX_HOSTNAME_LENGTH ||
    !DNS_NAME_RE.test(normalizedHost) ||
    normalizedHost.endsWith(".localhost")
  )
    return dnsRefusal;
  let ownedDomainRefusal = {
    refusal: `${safeHost} is not a GitHub Enterprise host; ${GITHUB_HOST} itself is named as ${GITHUB_HOST}.`,
  };
  if (
    normalizedHost === GHE_HOST_SUFFIX.slice(1) ||
    GITHUB_OWNED_DOMAINS.some(
      (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
    ) ||
    isAnthropicHost(normalizedHost)
  )
    return ownedDomainRefusal;
  let resolved;
  let apiHostname;
  if (normalizedHost.endsWith(GHE_HOST_SUFFIX)) {
    let parts = normalizedHost.slice(0, -GHE_HOST_SUFFIX.length).split(".");
    let [firstLabel, secondLabel, ...extraLabels] = parts;
    let hostLabel = secondLabel === undefined ? firstLabel : secondLabel;
    if (extraLabels.length > 0 || (secondLabel !== undefined && firstLabel !== API))
      return ownedDomainRefusal;
    let enterpriseHost = hostLabel + GHE_HOST_SUFFIX;
    apiHostname = `${API}.${enterpriseHost}`;
    resolved = {
      host: enterpriseHost,
      apiBase: `https://${apiHostname}`,
    };
  } else {
    apiHostname = normalizedHost;
    resolved = {
      host: normalizedHost,
      apiBase: githubApiBase(normalizedHost),
    };
  }
  return URL.parse(resolved.apiBase)?.hostname === apiHostname ? resolved : dnsRefusal;
}
//@ chunk-ntm2y5qw.js:5515-11403 placement
/**
 * 内置 gh api 的帮助文本。
 */
var GH_API_HELP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HELP_ISSUE_COMMENT_EXAMPLE;
var HELP_ADD_LABEL_EXAMPLE;
var HELP_ARTIFACT_DOWNLOAD_NOTE;
var HELP_NO_TOKEN_NOTES;
var HELP_SEARCH_REFUSED_NOTE;
var HELP_PULLS_FOR_BRANCH_EXAMPLE;
var HELP_CLONE_EXAMPLE;
var HELP_API_LINE;
var HELP_PR_SUBCOMMAND_EXAMPLES;
var GH_SUBCOMMAND_ALIASES;
var REPO_FLAG_RE;
var REPO_URL_RE;
var REPO_SLUG_ARG_RE;
deferInit("chunk-ntm2y5qw.js:5515", () => {
  GH_API_HELP = "repos/{owner}/{repo}";
  HELP_ISSUE_COMMENT_EXAMPLE = `gh api ${GH_API_HELP}/issues/<number>/comments -f body='<text>'`;
  HELP_ADD_LABEL_EXAMPLE = `gh api ${GH_API_HELP}/issues/<number>/labels -f 'labels[]=<label>'  # add a label`;
  HELP_ARTIFACT_DOWNLOAD_NOTE =
    "which are served from another host that this gh does not follow a redirect to";
  HELP_NO_TOKEN_NOTES = [
    "Nothing to sign in to and no token to read: requests go through this session's GitHub proxy, which adds the credential.",
    "gh api user  # the account behind it, where the credential has one",
  ];
  HELP_SEARCH_REFUSED_NOTE = "where this session's GitHub proxy refuses search/";
  HELP_PULLS_FOR_BRANCH_EXAMPLE = `gh api '${GH_API_HELP}/pulls?head={owner}:{branch}&state=all'  # <number> of the current branch's pull request (a fork's: its owner in place of {owner} before the colon)`;
  HELP_CLONE_EXAMPLE = "git clone https://github.com/<owner>/<repo>.git";
  HELP_API_LINE =
    "This session's GitHub proxy creates private repositories only: keep -F private=true (--public and --internal have no form). For this call it takes plain values only, not 'key[sub]=<value>' or 'key[]=<value>'.";
  HELP_PR_SUBCOMMAND_EXAMPLES = new Map([
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
    [
      "repo create",
      [
        "gh api user/repos -f name=<name> -F private=true  # in the account behind the credential (gh api user names it); this session's GitHub proxy may refuse creating a repository",
        "gh api orgs/<org>/repos -f name=<name> -F private=true  # in an organization: an OWNER the command named is <org>, unless it is the login gh api user names",
        HELP_API_LINE,
      ],
    ],
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
  GH_SUBCOMMAND_ALIASES = new Map([
    ["new", "create"],
    ["ls", "list"],
  ]);
  REPO_FLAG_RE = /^(-R|--repo)(=|$)|^-R[^-]/;
  REPO_URL_RE = /^https?:\/\/[^/]+\/[^/]+\/[^/]+/;
  REPO_SLUG_ARG_RE = /^[^-/][^/]*(\/[^/]+){1,2}$/;
});
//@ chunk-ntm2y5qw.js:11403-12198 placement
/**
 * 对不支持的 gh 子命令给出用 gh api 或 git 的替代写法（必要时提示替换 {owner}/{repo} 与 --hostname）。
 */
function ghSubcommandAlternative(ghArgs, ghesHosts) {
  let [group, subcommand] = ghArgs;
  if (group === undefined || subcommand === undefined) return;
  let commandName = `${group} ${GH_SUBCOMMAND_ALIASES.get(subcommand) ?? subcommand}`;
  let examples = HELP_PR_SUBCOMMAND_EXAMPLES.get(commandName);
  if (examples === undefined) return;
  let hostList = ghesHosts === ANY ? "the repository's GitHub Enterprise host" : ghesHosts.join(" or ");
  let adjustedExamples =
    hostList !== ""
      ? examples.map((example) =>
          example === HELP_CLONE_EXAMPLE
            ? `git clone https://<host>/<owner>/<repo>.git  # <host>: github.com or ${hostList}`
            : example === HELP_API_LINE
              ? `${example} On github.com only: there is no form for a GitHub Enterprise host, with --hostname or without.`
              : example,
        )
      : examples;
  let sliced = ghArgs.slice(2);
  let mentionsRepo =
    adjustedExamples.some((example) => example.includes("{owner}")) &&
    (ghArgs.some((arg) => REPO_FLAG_RE.test(arg)) ||
      sliced.some(
        (arg, index) =>
          !(sliced[index - 1] ?? "").startsWith("-") &&
          (REPO_URL_RE.test(arg) || (group === "repo" && REPO_SLUG_ARG_RE.test(arg))),
      ));
  return (
    `Instead of \`gh ${commandName}\`:
${adjustedExamples.map((example) => `  ${example}`).join(`
`)}` +
    (mentionsRepo
      ? `
  The command named a repository: write that repository in place of {owner}/{repo}.` +
        (hostList !== "" ? " If it is on another host, add --hostname <host>." : "")
      : "")
  );
}
//@ chunk-ntm2y5qw.js:12198-12699 placement
/**
 * 内置 gh 的说明文案（GraphQL 不可用、内置客户端、本机没有 gh）。
 */
var GRAPHQL_UNAVAILABLE_TEXT =
  "GitHub GraphQL is not available through this session's GitHub proxy; use the REST API (gh api repos/{owner}/{repo}/...). For review threads, auto-merge and draft or ready, the proxy serves repos/{owner}/{repo}/pulls/<number>/ccr/review_threads, .../ccr/comments/<comment-id>/resolve, .../ccr/auto_merge, .../ccr/ready_for_review and .../ccr/convert_to_draft.";
var BUILTIN_GH_LABEL = "Claude Code's built-in GitHub client, not the GitHub CLI";
var NO_GH_CLI_TEXT = "no GitHub CLI was found on this machine when this session started";
//@ chunk-ntm2y5qw.js:12699-15228 placement
function ghApiUsageText(ghesHosts) {
  let isAny = ghesHosts === ANY;
  let mentionsHosts = isAny || ghesHosts.length > 0;
  return `Usage: gh api <endpoint> [flags]

This gh is ${BUILTIN_GH_LABEL}:
${NO_GH_CLI_TEXT}.
${
  isAny
    ? `It makes GitHub REST API requests to ${GITHUB_HOST}, or to the GitHub Enterprise
host of this checkout's remote (or --hostname <host>), through this session's
GitHub proxy, which supplies the credential for the hosts and repositories this
session is connected to, and has no other gh command.`
    : `It makes GitHub REST API requests to ${[GITHUB_HOST, ...ghesHosts].join(", ")} through this session's GitHub
proxy, already authenticated, and has no other gh command.`
}
A GitHub CLI installed during the session takes this one's place once it is on
PATH. On a self-hosted runner that one has only the GitHub credentials the
runner's operator provides and does not go through this session's GitHub proxy.

Flags:${
    mentionsHosts
      ? `
      --hostname <host>     GitHub host of the request${isAny ? "" : ", as GH_HOST"} (default ${GITHUB_HOST}, or the
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
-F values are filled in from GH_REPO, else from the ${mentionsHosts && !isAny ? "remotes on those hosts" : `${GITHUB_HOST} remotes`} of the
current repository: upstream, github, origin, then the others by name.${
    isAny
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
//@ chunk-ntm2y5qw.js:15228-15321 placement
var GH_HOST_NOTE = ` The host came from GH_HOST: \`--hostname ${GITHUB_HOST}\` names github.com for one command.`;
//@ chunk-ntm2y5qw.js:15321-15644 placement
/**
 * GH_HOST/GH_REPO 指向其他主机时的拒绝说明。
 */
function hostEnvVarRefusal(varName) {
  return (
    `${varName} names a host other than ${GITHUB_HOST}, and an environment variable is not used to pick a host in this session: ` +
    (varName === "GH_HOST"
      ? `pass --hostname <host> on the command instead. For ${GITHUB_HOST}, pass --hostname ${GITHUB_HOST} or unset GH_HOST.`
      : "set GH_REPO=OWNER/REPO and pass --hostname <host> on the command instead.")
  );
}
//@ chunk-ntm2y5qw.js:15644-15926 placement
/**
 * 主机不在本会话 GitHub 代理范围内的说明。
 */
function hostNotServedText(host, ghesHosts, viaEnv = false) {
  return (
    `${normalizeEnterpriseHost(host)} is not served here: this gh reaches ${[GITHUB_HOST, ...ghesHosts].join(" and ")} only, through this session's GitHub proxy. Which GitHub Enterprise Server hosts it reaches is fixed when the session starts, and nothing run in the session adds one` +
    (viaEnv ? `.${GH_HOST_NOTE}` : ".")
  );
}
//@ chunk-ntm2y5qw.js:15926-16501 placement
/**
 * gh api 带值参数、开关参数与不支持参数表。
 */
var GH_API_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GH_API_BOOLEAN_FLAGS;
var GH_API_UNSUPPORTED_FLAGS;
deferInit("chunk-ntm2y5qw.js:15926", () => {
  GH_API_VALUE_FLAGS = {
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
  GH_API_BOOLEAN_FLAGS = {
    "-i": "--include",
    "-h": "--help",
    "--include": "--include",
    "--paginate": "--paginate",
    "--silent": "--silent",
    "--help": "--help",
    "--slurp": "--slurp",
    "--verbose": "--verbose",
  };
  GH_API_UNSUPPORTED_FLAGS = new Set(["--template", "--preview", "--slurp", "--verbose"]);
});
//@ chunk-ntm2y5qw.js:16501-19133 placement
function parseGhApiArgs(ghArgs, ghHost, ghesHosts, version) {
  if (ghArgs[0] !== "api")
    return {
      kind: "refuse",
      message:
        `this gh is ${BUILTIN_GH_LABEL} (Claude Code ${version}): \`gh api <REST endpoint>\` works here, already authenticated through this session's GitHub proxy, and there is no other gh command (${NO_GH_CLI_TEXT}).
` + (ghSubcommandAlternative(ghArgs, ghesHosts) ?? "Example: gh api repos/{owner}/{repo}/pulls/123"),
    };
  let parsed = {
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
  let positional = [];
  let hostArg = ghHost;
  let hostFromEnv = true;
  let flags = [];
  for (let idx = 1; idx < ghArgs.length; idx++) {
    let arg = ghArgs[idx];
    if (arg === "--") {
      positional.push(...ghArgs.slice(idx + 1));
      break;
    }
    if (!arg.startsWith("-") || arg === "-") {
      positional.push(arg);
      continue;
    }
    let isLongFlag = arg.startsWith("--");
    let flagNames = isLongFlag ? [firstLineOf(arg, "=")] : Array.from(arg.slice(1), (char) => `-${char}`);
    for (let [flagIndex, flagName] of flagNames.entries()) {
      let booleanValue = GH_API_BOOLEAN_FLAGS[flagName];
      let valueFlag = GH_API_VALUE_FLAGS[flagName];
      if (booleanValue !== undefined) {
        if (!isLongFlag || !/=(?:false|0)$/i.test(arg)) flags.push([booleanValue, ""]);
        continue;
      }
      if (valueFlag === undefined)
        return {
          kind: "refuse",
          message: `unknown ${isLongFlag ? "flag" : "shorthand flag"}: ${truncateLabel(flagName)}

${ghApiUsageText(ghesHosts)}`,
        };
      let flagValue =
        (isLongFlag
          ? arg.includes("=")
            ? arg.slice(flagName.length + 1)
            : undefined
          : arg.slice(flagIndex + 2).replace(/^=/, "") || undefined) ?? ghArgs[++idx];
      if (flagValue === undefined)
        return {
          kind: "refuse",
          message: `flag needs an argument: ${flagName}`,
        };
      flags.push([valueFlag, flagValue]);
      break;
    }
  }
  for (let [name, value] of flags) {
    if (GH_API_UNSUPPORTED_FLAGS.has(name))
      return {
        kind: "refuse",
        message: `${name} is not supported by this built-in gh.

${ghApiUsageText(ghesHosts)}`,
      };
    switch (name) {
      case "--help":
        return {
          kind: "help",
        };
      case "--method":
        parsed.method = value;
        break;
      case "--raw-field":
        parsed.rawFields.push(value);
        break;
      case "--field":
        parsed.typedFields.push(value);
        break;
      case "--header":
        parsed.headers.push(value);
        break;
      case "--jq":
        parsed.jq = value;
        break;
      case "--input":
        parsed.inputFile = value;
        break;
      case "--hostname":
        hostArg = value;
        hostFromEnv = false;
        break;
      case "--include":
        parsed.include = true;
        break;
      case "--paginate":
        parsed.paginate = true;
        break;
      case "--silent":
        parsed.silent = true;
        break;
    }
  }
  if (hostArg !== undefined) {
    let normalizedHostArg = normalizeHost(hostArg);
    if (isGithubDotCom(hostArg)) parsed.host = GITHUB_HOST;
    else if (ghesHosts === ANY && hostFromEnv) {
      if (hostArg !== "" && !positional[0]?.includes("://"))
        return {
          kind: "refuse",
          message: hostEnvVarRefusal("GH_HOST"),
        };
    } else if (ghesHosts === ANY) {
      let enterpriseHost = resolveEnterpriseHost(hostArg);
      if ("refusal" in enterpriseHost)
        return {
          kind: "refuse",
          message: enterpriseHost.refusal,
        };
      parsed.host = enterpriseHost.host;
    } else if (ghesHosts.includes(normalizedHostArg)) parsed.host = normalizedHostArg;
    else
      return {
        kind: "refuse",
        message: hostNotServedText(hostArg, ghesHosts, hostFromEnv),
      };
  }
  let [endpoint, ...rest] = positional;
  if (endpoint === undefined || rest.length > 0)
    return {
      kind: "refuse",
      message: `accepts 1 arg(s), received ${positional.length}

${ghApiUsageText(ghesHosts)}`,
    };
  if (endpoint === "")
    return {
      kind: "refuse",
      message: "the endpoint is empty; give a REST path such as repos/{owner}/{repo}/pulls",
    };
  if (parsed.paginate && parsed.inputFile !== undefined)
    return {
      kind: "refuse",
      message: "the `--paginate` option is not supported with `--input`",
    };
  if (parsed.paginate && parsed.method !== undefined && parsed.method.toUpperCase() !== "GET")
    return {
      kind: "refuse",
      message: "the `--paginate` option is not supported for non-GET requests",
    };
  if (parsed.silent && parsed.jq !== undefined)
    return {
      kind: "refuse",
      message: "only one of `--silent` or `--jq` may be used, since `--silent` prints no response body",
    };
  parsed.endpoint = endpoint;
  return {
    kind: "api",
    options: parsed,
  };
}
//@ chunk-ntm2y5qw.js:19133-19156 placement
/**
 * -f/-F 字段解析失败时抛出的错误类型。
 */
class FieldParseError extends Error {}
//@ chunk-ntm2y5qw.js:19156-19346 placement
/**
 * 把 -f/-F 字段解析为嵌套参数表（-F 值经回调转换，如读文件）。
 */
async function buildFieldParams(rawFields, typedFields, coerceTypedValue) {
  let params = new Map();
  for (let rawField of rawFields) {
    let { keys, key, value } = parseFieldKey(rawField);
    setNestedField(params, keys, key, value);
  }
  for (let typedField of typedFields) {
    let { keys, key, value } = parseFieldKey(typedField);
    setNestedField(params, keys, key, value === undefined ? value : await coerceTypedValue(value));
  }
  return params;
}
//@ chunk-ntm2y5qw.js:19346-19419 placement
/**
 * 把 Map 形式的参数表递归转成普通对象。
 */
function mapToPlainObject(params) {
  return Object.fromEntries([...params].map(([key, value]) => [key, plainParamValue(value)]));
}
//@ chunk-ntm2y5qw.js:19419-19479 placement
/**
 * 把嵌套参数表展开为 key[sub]、key[] 形式的键值对列表。
 */
function flattenParamEntries(params) {
  let entries = [];
  for (let [key, value] of params) flattenParams(entries, key, value);
  return entries;
}
//@ chunk-ntm2y5qw.js:19479-19563 placement
function plainParamValue(value) {
  if (value instanceof Map) return mapToPlainObject(value);
  return Array.isArray(value) ? value.map(plainParamValue) : value;
}
//@ chunk-ntm2y5qw.js:19563-19736 placement
/**
 * 把嵌套参数表展开为 key[sub]、key[] 形式的键值对。
 */
function flattenParams(entries, key, value) {
  if (value instanceof Map)
    for (let [key_2, value_2] of value) flattenParams(entries, `${key}[${key_2}]`, value_2);
  else if (Array.isArray(value)) for (let element of value) flattenParams(entries, `${key}[]`, element);
  else entries.push([key, value === null ? "" : String(value)]);
}
//@ chunk-ntm2y5qw.js:19736-20203 placement
/**
 * 解析字段 “a[b][]=v” 为键路径、键名与值。
 */
function parseFieldKey(text) {
  let keys = [];
  let segmentStart = 0;
  let valueStart = 0;
  for (let j = 0; j < text.length && valueStart === 0; j++) {
    let char = text[j];
    if (char === "[") {
      if (segmentStart === 0) keys.push(text.slice(0, j));
      segmentStart = j + 1;
    } else if (char === "]") keys.push(text.slice(segmentStart, j));
    else if (char === "=") {
      if (segmentStart === 0) keys.push(text.slice(0, j));
      valueStart = j + 1;
    }
  }
  if (keys.length === 0 || keys[0] === "") throw new FieldParseError(`invalid key: "${truncateLabel(text)}"`);
  if (valueStart === 0) {
    if (keys.at(-1) !== "")
      throw new FieldParseError(`field "${truncateLabel(text)}" requires a value separated by an '=' sign`);
    return {
      keys,
      key: text,
      value: undefined,
    };
  }
  return {
    keys,
    key: text.slice(0, valueStart - 1),
    value: text.slice(valueStart),
  };
}
//@ chunk-ntm2y5qw.js:20203-20649 placement
/**
 * 按键路径把值写入参数表（[] 为数组追加，重复键报错）。
 */
function setNestedField(params, keys, key, value) {
  let cursor = params;
  let isArrayIndex = false;
  let pendingKey = "";
  for (let segment of keys) {
    if (segment === "") {
      isArrayIndex = true;
      continue;
    }
    if (pendingKey !== "") {
      cursor = nestedContainer(cursor, pendingKey, isArrayIndex ? segment : undefined);
      isArrayIndex = false;
    }
    pendingKey = segment;
  }
  let existing = cursor.get(pendingKey);
  if (!isArrayIndex) {
    if (existing !== undefined || value === undefined)
      throw new FieldParseError(
        existing !== undefined
          ? `unexpected override existing field under "${truncateLabel(pendingKey)}"`
          : `field "${truncateLabel(key)}" requires a value separated by an '=' sign`,
      );
    cursor.set(pendingKey, value);
    return;
  }
  if (existing !== undefined && !Array.isArray(existing))
    throw new FieldParseError(`expected array type under "${truncateLabel(pendingKey)}"`);
  cursor.set(pendingKey, value === undefined ? (existing ?? []) : [...(existing ?? []), value]);
}
//@ chunk-ntm2y5qw.js:20649-20991 placement
/**
 * 取得或创建下一级 map（数组元素时按需新建）。
 */
function nestedContainer(params, key, arrayKey) {
  let existing = params.get(key);
  let created = new Map();
  if (arrayKey === undefined) {
    if (existing instanceof Map) return existing;
    if (existing !== undefined) throw new FieldParseError(`expected map type under "${truncateLabel(key)}"`);
    params.set(key, created);
    return created;
  }
  if (existing !== undefined && !Array.isArray(existing))
    throw new FieldParseError(`expected array type under "${truncateLabel(key)}"`);
  let last = existing?.at(-1);
  if (last instanceof Map && !last.has(arrayKey)) return last;
  params.set(key, [...(existing ?? []), created]);
  return created;
}
//@ chunk-ntm2y5qw.js:20991-21148 placement
/**
 * 仓库上下文常量：占位符正则、优先远程名、远程配置键正则、owner/repo 形状。
 */
var GIT_CONFIG_TIMEOUT_MS = 1e4;
var REPO_PLACEHOLDER_RE = /\{(owner|repo|branch)\}|:(owner|repo|branch)\b/g;
var PREFERRED_REMOTES = ["upstream", "github", "origin"];
var REMOTE_CONFIG_KEY_PATTERN = "^remote\\..+\\.(url|gh-resolved)$";
var OWNER_REPO_RE = /^[^/]+\/[^/]+$/;
//@ chunk-ntm2y5qw.js:21148-21171 placement
/**
 * gh api 用法错误（参数或路径不合法）。
 */
class GhApiUsageError extends Error {}
//@ chunk-ntm2y5qw.js:21171-21211 placement
/**
 * 判断端点里是否含 {owner}/{repo} 之类的仓库占位符。
 */
function hasRepoPlaceholder(text) {
  return text.search(REPO_PLACEHOLDER_RE) !== -1;
}
//@ chunk-ntm2y5qw.js:21211-24203 placement
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
  constructor(cwd, ghRepo, ghRepoHost, ghesHosts) {
    this.cwd = cwd;
    this.ghRepo = ghRepo ?? "";
    this.ghRepoHost = ghRepoHost ?? GITHUB_HOST;
    this.ghesHosts = ghesHosts;
    this.host = ghRepoHost;
  }
  pathFilledFromHost() {
    return this.pathFrom?.repository.host;
  }
  pathFilledFromRemote() {
    return this.pathFrom?.remote;
  }
  async fill(template, encodeSegments) {
    let filled = new Map();
    for (let [, firstAlternative, secondAlternative] of template.matchAll(REPO_PLACEHOLDER_RE)) {
      let placeholderKey = firstAlternative ?? secondAlternative ?? "";
      if (filled.has(placeholderKey)) continue;
      if (placeholderKey === "branch") {
        let branchName = await (this.branch ??= this.findBranch());
        filled.set(
          placeholderKey,
          encodeSegments ? branchName.split("/").map(encodeURIComponent).join("/") : branchName,
        );
      } else {
        let foundRepo = await (this.repository ??= this.findRepository());
        let { owner, name: repoName } = foundRepo.repository;
        let filledValue = placeholderKey === "owner" ? owner : repoName;
        if (encodeSegments && filledValue.includes("/"))
          throw new GhApiUsageError(
            `{${placeholderKey}} would be more than one path segment here (this checkout's repository is a nested project path, not OWNER/REPO): spell the endpoint out`,
          );
        filled.set(placeholderKey, filledValue);
        if (encodeSegments) this.pathFrom = foundRepo;
      }
    }
    return template.replace(
      REPO_PLACEHOLDER_RE,
      (wholeMatch, firstAlternative, secondAlternative) =>
        filled.get(firstAlternative ?? secondAlternative ?? "") ?? wholeMatch,
    );
  }
  async findRepository() {
    return this.ghesHosts === ANY ? this.findOnAnyHost() : this.findOnServedHost(this.ghesHosts);
  }
  async remoteListing() {
    let args = ["config", "-z", "--get-regexp", REMOTE_CONFIG_KEY_PATTERN];
    return (await this.git(args)) ?? "";
  }
  ghRepoRepository() {
    return parseGitRemote(
      `https://${OWNER_REPO_RE.test(this.ghRepo) ? `${this.ghRepoHost}/` : ""}${this.ghRepo}`,
    );
  }
  async findOnServedHost(servedHosts) {
    let allServedHosts;
    let preferredHosts = [GITHUB_HOST, ...servedHosts];
    let candidateHosts = this.host === undefined ? preferredHosts : [this.host];
    if (this.ghRepo === "") {
      let listing = await this.remoteListing();
      allServedHosts = pickPreferredRemote(listing, (repository) => remoteOnHost(repository, candidateHosts));
      let found = parseRemoteConfig(listing).find(
        ({ repository }) => !remoteOnHost(repository, preferredHosts),
      );
      if (!allServedHosts && found && !preferredRemoteRepository(listing, preferredHosts))
        throw new GhApiUsageError(
          `{owner}/{repo} would be this checkout's repository, whose remote is on another host: ${hostNotServedText(found.repository.host, servedHosts)}`,
        );
    } else {
      let repoFromEnv = this.ghRepoRepository();
      if (repoFromEnv && !remoteOnHost(repoFromEnv, preferredHosts))
        throw new GhApiUsageError(hostNotServedText(repoFromEnv.host, servedHosts));
      let servedRepo = repoFromEnv && remoteOnHost(repoFromEnv, candidateHosts);
      allServedHosts = servedRepo
        ? {
            repository: servedRepo,
          }
        : undefined;
    }
    if (!allServedHosts) {
      let any = candidateHosts.some((host) => host !== GITHUB_HOST);
      throw new GhApiUsageError(
        `could not tell which ${candidateHosts.join(" or ")} repository {owner}/{repo} is: set GH_REPO=${any ? "[HOST/]" : ""}OWNER/REPO or spell the repository out in the endpoint${candidateHosts.length > 1 ? " and name its host with --hostname" : ""}`,
      );
    }
    return allServedHosts;
  }
  async findOnAnyHost() {
    let host = this.host;
    let chosen;
    if (this.ghRepo === "") {
      let listing = await this.remoteListing();
      chosen = pickPreferredRemote(listing, (repository) => remoteOnHost(repository, [host ?? GITHUB_HOST]));
      let fallbackRemote =
        chosen || host !== undefined ? undefined : pickPreferredRemote(listing, (repository) => repository);
      if (fallbackRemote) {
        let enterpriseHost = resolveEnterpriseHost(fallbackRemote.repository.host);
        if ("refusal" in enterpriseHost)
          throw new GhApiUsageError(
            `{owner}/{repo} would be the repository of ${remoteDescription(fallbackRemote.remote)}: ${enterpriseHost.refusal}`,
          );
        chosen = {
          remote: fallbackRemote.remote,
          repository: {
            ...fallbackRemote.repository,
            host: enterpriseHost.host,
          },
        };
      }
    } else {
      let repoFromEnv = this.ghRepoRepository();
      if (repoFromEnv && !OWNER_REPO_RE.test(this.ghRepo) && !isGithubDotCom(repoFromEnv.host))
        throw new GhApiUsageError(hostEnvVarRefusal("GH_REPO"));
      let servedRepo = repoFromEnv && remoteOnHost(repoFromEnv, [host ?? GITHUB_HOST]);
      chosen = servedRepo
        ? {
            repository: servedRepo,
          }
        : undefined;
    }
    if (!chosen)
      throw new GhApiUsageError(
        `could not tell which ${host === undefined ? "" : `${host} `}repository {owner}/{repo} is: set GH_REPO=OWNER/REPO or spell the repository out in the endpoint${host === undefined ? " and name its host with --hostname" : ""}`,
      );
    return chosen;
  }
  async findBranch() {
    let branch = await this.git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (branch === undefined)
      throw new GhApiUsageError("could not tell the current branch for {branch}: spell the branch out");
    return branch;
  }
  async git(args) {
    let result = await execFileNoThrowWithCwd("git", [...SAFE_GIT_REPO_ARGS, ...args], {
      cwd: this.cwd,
      env: getRemoteHostSessionCount(),
      timeout: GIT_CONFIG_TIMEOUT_MS,
      preserveOutputOnError: false,
    });
    return result.code === 0 && result.stdout.trim() !== "" ? result.stdout.trim() : undefined;
  }
}
//@ chunk-ntm2y5qw.js:24203-24292 placement
function remoteOnHost(remote, hosts) {
  let normalizedHost = isGithubDotCom(remote.host) ? GITHUB_HOST : normalizeHost(remote.host);
  return hosts.includes(normalizedHost)
    ? {
        ...remote,
        host: normalizedHost,
      }
    : undefined;
}
//@ chunk-ntm2y5qw.js:24292-24345 placement
function preferredRemoteRepository(listing, hosts) {
  return pickPreferredRemote(listing, (repository) => remoteOnHost(repository, hosts))?.repository;
}
//@ chunk-ntm2y5qw.js:24345-24648 placement
/**
 * 按 gh-resolved 标记与 upstream/github/origin 顺序选出远程及其仓库。
 */
function pickPreferredRemote(listing, matchesHost) {
  let candidates = [];
  for (let { name: remoteName, marked, repository } of parseRemoteConfig(listing)) {
    let repository_2 = matchesHost(repository);
    if (!repository_2) continue;
    let index = PREFERRED_REMOTES.indexOf(remoteName);
    candidates.push({
      name: remoteName,
      rank: marked ? -1 : index === -1 ? PREFERRED_REMOTES.length : index,
      repository: repository_2,
    });
  }
  candidates.sort(
    (left, right) => left.rank - right.rank || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  );
  let [best] = candidates;
  return (
    best && {
      repository: best.repository,
      remote: best.name,
    }
  );
}
//@ chunk-ntm2y5qw.js:24648-24778 placement
/**
 * “this checkout's remote X” 文本（名字不合法时用泛称）。
 */
function remoteDescription(remoteName) {
  return remoteName !== undefined && /^[A-Za-z0-9._-]{1,64}$/.test(remoteName)
    ? `this checkout's remote ${remoteName}`
    : "one of this checkout's remotes";
}
//@ chunk-ntm2y5qw.js:24778-25168 placement
/**
 * 解析 git config -z 的 remote.*.url/gh-resolved 输出为远程列表。
 */
function parseRemoteConfig(listing) {
  let byName = new Map();
  for (let entry of listing.split("\x00")) {
    let [key = "", value] = entry.split(
      `
`,
      2,
    );
    let match = /^remote\.(.+)\.(url|gh-resolved)$/.exec(key);
    if (value === undefined || match === null) continue;
    let [, remoteName = "", field] = match;
    let entryValue = byName.get(remoteName) ?? {
      marked: false,
    };
    if (field === "url") entryValue.url ??= value;
    else if (value === "base") entryValue.marked = true;
    byName.set(remoteName, entryValue);
  }
  return [...byName].flatMap(([name, { url, marked }]) => {
    let repository = url === undefined ? null : parseGitRemote(url);
    return repository
      ? [
          {
            name,
            marked,
            repository,
          },
        ]
      : [];
  });
}
//@ chunk-ntm2y5qw.js:25168-25212 placement
var MAX_PERCENT_DECODE_ROUNDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ENTERPRISE_API_PATH_SEGMENTS;
deferInit("chunk-ntm2y5qw.js:25168", () => {
  MAX_PERCENT_DECODE_ROUNDS = 4;
  ENTERPRISE_API_PATH_SEGMENTS = new Set(["api", "v3", "uploads"]);
});
//@ chunk-ntm2y5qw.js:25212-25841 placement
/**
 * 检查路径（反复百分号解码后）：拒绝 .. 段、GraphQL、控制字符。
 */
function checkEndpointPath(pathname, rejectsDotSegments) {
  let decodedPath = pathname;
  for (let j = 0; ; j++) {
    let replaced = decodedPath.replace(/%([0-9a-f]{2})/gi, (wholeMatch, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    if (replaced === decodedPath) break;
    if (j === MAX_PERCENT_DECODE_ROUNDS)
      return `the path is percent-encoded more than ${MAX_PERCENT_DECODE_ROUNDS} times over; spell it plainly`;
    decodedPath = replaced;
  }
  let depth = 0;
  for (let segment of decodedPath.toLowerCase().replaceAll("\\", "/").split("/")) {
    let beforeParams = firstLineOf(segment, ";");
    if (beforeParams === "..") {
      if (rejectsDotSegments)
        return "the path holds a `..` segment (percent-encoded, or with `;` parameters); spell it plainly";
      depth = 0;
    } else if (depth === 0 && /^graphql(?![a-z0-9_-])/.test(beforeParams)) return GRAPHQL_UNAVAILABLE_TEXT;
    else if (beforeParams !== "" && beforeParams !== "." && !ENTERPRISE_API_PATH_SEGMENTS.has(beforeParams))
      depth++;
  }
  return /[\0-\x1f\x7f]/.test(decodedPath) ? "the path contains an encoded control character" : undefined;
}
//@ chunk-ntm2y5qw.js:25841-26620 placement
/**
 * 内置 gh api 的默认值常量组（体积上限、超时、重定向状态码、API 版本、允许的头名等）与错误响应 schema。
 */
var GH_API_DEFAULTS_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var GH_API_DEFAULTS;
var MAX_RESPONSE_BYTES;
var MAX_JQ_INPUT_BYTES;
var PROXY_CONNECT_TIMEOUT_MS;
var MAX_PAGINATION_PAGES;
var ABORTED_EXIT_CODE;
var MAX_PAGE_BODY_BYTES;
var REDIRECT_STATUS_SET;
var GITHUB_API_VERSION;
var MAX_REDIRECTS;
var ACTIONS_ENDPOINT_RE;
var ACTIONS_PROXY_NOTE;
var INVALID_ENDPOINT_PATH_TEXT;
var OPEN_BRACKET_CODE;
var CLOSE_BRACKET_CODE;
var HEADER_VALUE_SPACE_CODES;
var ALLOWED_HEADER_NAMES;
var ghApiErrorSchema;
var ghApiMessageSchema;
deferInit("chunk-ntm2y5qw.js:25841", () => {
  GH_API_DEFAULTS_2 = 26214400;
  GH_API_DEFAULTS = 104857600;
  MAX_RESPONSE_BYTES = 8388608;
  MAX_JQ_INPUT_BYTES = 1048576;
  PROXY_CONNECT_TIMEOUT_MS = 300000;
  MAX_PAGINATION_PAGES = 5;
  ABORTED_EXIT_CODE = 141;
  MAX_PAGE_BODY_BYTES = 255;
  REDIRECT_STATUS_SET = new Set([301, 302, 303, 307, 308]);
  GITHUB_API_VERSION = "2022-11-28";
  MAX_REDIRECTS = 120;
  ACTIONS_ENDPOINT_RE = /\/(?:repos\/[^/]+\/[^/]+|repositories\/\d+)\/actions\//;
  ACTIONS_PROXY_NOTE = `This session's GitHub proxy may have no GitHub Enterprise connection for that host, or it may not be a GitHub Enterprise host; nothing run in the session adds a connection. For ${GITHUB_HOST}, add --hostname ${GITHUB_HOST}.`;
  INVALID_ENDPOINT_PATH_TEXT = "the endpoint is not a valid URL path";
  OPEN_BRACKET_CODE = 91;
  CLOSE_BRACKET_CODE = 93;
  HEADER_VALUE_SPACE_CODES = new Set([32, 9, 10, 13]);
  ALLOWED_HEADER_NAMES = new Set([
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
  ghApiErrorSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().optional().catch(undefined),
      errors: union([stringSchema(), array(unknown())])
        .optional()
        .catch(undefined),
    }),
  );
  ghApiMessageSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema(),
    }),
  );
});
//@ chunk-ntm2y5qw.js:26620-26643 placement
/**
 * gh api 请求本身失败（网络、代理）时抛出的错误。
 */
class GhApiRequestError extends Error {}
//@ chunk-ntm2y5qw.js:26643-26667 placement
/**
 * gh api 返回错误响应时抛出的错误。
 */
class GhApiResponseError extends Error {}
//@ chunk-ntm2y5qw.js:26667-27582 placement
async function ghApiVersionInfo(ghArgs, context) {
  let servedHosts =
    context.ghesHosts === ANY
      ? context.ghesHosts
      : context.ghesHosts.filter(
          (ghesHost) =>
            !ghesHost.endsWith(GHE_HOST_SUFFIX) && URL.parse(githubApiBase(ghesHost))?.hostname === ghesHost,
        );
  let ghApiArgs = parseGhApiArgs(
    ghArgs,
    context.ghHost,
    servedHosts,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  );
  try {
    switch (ghApiArgs.kind) {
      case "help":
        await context.write("stdout", ghApiUsageText(servedHosts));
        return 0;
      case "refuse":
        await context.write(
          "stderr",
          `gh: ${ghApiArgs.message}
`,
        );
        return 1;
      case "api":
        return await runBuiltinGhApi(ghApiArgs.options, context, servedHosts);
    }
  } catch (error) {
    if (error instanceof GhApiResponseError) return ABORTED_EXIT_CODE;
    await context.write(
      "stderr",
      `gh: ${ghProxyRefusalText(error, context.statusUrl)}
`,
    );
    return 1;
  }
}
//@ chunk-ntm2y5qw.js:27582-28167 placement
/**
 * 内置 gh 入口：确定代理地址、读 CA 文件、执行 gh api 并按结果退出。
 */
async function runGhApiShim({ port, caBundlePath, ghesHosts, ghArgs }) {
  let writeStream = writeStdStreamOrThrow;
  handleStreamGoneErrors(process.stdout);
  handleStreamGoneErrors(process.stderr);
  let exitCode = 1;
  let proxyUrl =
    port !== STANDALONE_PROXY ? `http://127.0.0.1:${port}` : parseLoopbackProxyUrl(env.HTTPS_PROXY);
  if (proxyUrl === undefined) {
    await writeStream(
      "stderr",
      `${GH_PROXY_UNSET_MESSAGE}
`,
    );
    cliExit(exitCode);
    return;
  }
  let ca;
  try {
    await using caHandle = await open(caBundlePath, "r");
    ca = (await readHandleUpTo(caHandle, MAX_RESPONSE_BYTES)).toString("utf8");
  } catch (error) {
    await writeStream(
      "stderr",
      `gh: ${proxyCaBundleError(getErrnoCode(error) ?? "unreadable")}
`,
    );
  }
  if (ca !== undefined)
    exitCode = await ghApiVersionInfo(ghArgs, {
      proxyUrl,
      statusUrl: port === STANDALONE_PROXY ? undefined : `${proxyUrl}/__agentproxy/status`,
      ca,
      cwd: getCwd(),
      path: env.PATH ?? "",
      ghHost: env.GH_HOST,
      ghRepo: env.GH_REPO,
      ghesHosts,
      get stdin() {
        return process.stdin;
      },
      write: writeStream,
    });
  cliExit(exitCode);
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
  runGhApiShim,
};
