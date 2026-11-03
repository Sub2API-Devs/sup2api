/**
 * utils/github/ghApiRequest.ts
 *
 * 2.1.316 新增。gh api 请求（代理、重定向）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fy5kn7m3.js (21)
 * attribution: placement 21
 */
import { X509Certificate } from "crypto";
import { open } from "fs/promises";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import {
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
} from "./ghApi.js";
import { githubApiBase, GITHUB_HOST, isGithubDotCom } from "../git/githubUrl.js";
import { ANY } from "../agentProxy/ghStandin.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { whichOnPath } from "../which.js";
import { ConnectProxyAgent, findProxyError, describeHttpStatus } from "../proxy.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { getPlatform } from "../platform.js";
import { escapeControlChars } from "../stringUtils.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { PROXY_INJECTED_MARKER } from "../subprocessEnv.js";
import { readHandleUpTo } from "../fsOperations.js";
import { getErrnoCode } from "../errors.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-fy5kn7m3.js:27481-27565 placement
/**
 * 生成"读不到会话 GitHub 代理 CA 证书"的错误文案。
 */
function proxyCaBundleError(e) {
  return `could not read this session's GitHub proxy CA bundle (${e}).`;
}
//@ chunk-fy5kn7m3.js:27565-27641 placement
function jqArgs(e, platform) {
  return [...(platform === "windows" ? ["--binary"] : []), "-r", "-c", ` ${e}`];
}
//@ chunk-fy5kn7m3.js:27641-31289 placement
/**
 * 内置 `gh api` 实现：在没有 GitHub CLI 的云会话中，经会话 GitHub 代理转发 REST 请求，填充 {owner}/{repo}/{branch}，校验主机与路径，支持分页、字段、--jq。
 */
async function runBuiltinGhApi(options, t, ghesHosts) {
  if (isEssentialTrafficOnly())
    throw new GhApiRequestError(
      "the built-in gh api is off in this session: nonessential network traffic is disabled (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)",
    );
  let apiBase = t.apiOrigin ?? githubApiBase(GITHUB_HOST);
  let absoluteEndpoint = resolveAbsoluteEndpoint(options.endpoint, apiBase, ghesHosts);
  let a = new GhRepoContext(t.cwd, t.ghRepo, absoluteEndpoint?.host ?? options.host, ghesHosts);
  let fieldParams = await buildFieldParams(options.rawFields, options.typedFields, async (w) => {
    if (w.startsWith("@")) return (await readInputBody(w.slice(1), t)).toString("utf8");
    if (/^[+-]?\d+$/.test(w) && Number.isSafeInteger(Number(w))) return Number(w);
    switch (w) {
      case "true":
        return true;
      case "false":
        return false;
      case "null":
        return null;
      default:
        return a.fill(w, false);
    }
  });
  let h = options.inputFile !== undefined;
  let upper = (options.method ?? (fieldParams.size > 0 || h ? "POST" : "GET")).toUpperCase();
  if (options.paginate && upper !== "GET")
    throw new GhApiRequestError(
      "the `--paginate` option is not supported for non-GET requests; with fields the method is POST unless `-X GET` sends them as query parameters",
    );
  let y = await a.fill(options.endpoint, true);
  let absoluteEndpoint_2 = resolveAbsoluteEndpoint(y, apiBase, ghesHosts);
  if (
    absoluteEndpoint_2?.host !== absoluteEndpoint?.host ||
    absoluteEndpoint_2?.apiBase !== absoluteEndpoint?.apiBase
  )
    throw new GhApiRequestError(
      "filling in {owner}, {repo} or {branch} would change the host of the endpoint: spell the endpoint out",
    );
  let b = absoluteEndpoint_2?.host ?? options.host ?? a.pathFilledFromHost();
  let { host, apiBase: apiBase_2 } =
    absoluteEndpoint_2 ?? resolveTargetHost(b ?? GITHUB_HOST, apiBase, ghesHosts);
  let G;
  if (host !== GITHUB_HOST && ghesHosts === ANY) {
    let w =
      absoluteEndpoint_2 !== undefined
        ? "the host in the endpoint URL"
        : options.host !== undefined
          ? "the host --hostname names"
          : `the host of ${remoteDescription(a.pathFilledFromRemote())}`;
    G = `${host}, not ${GITHUB_HOST}: ${w}.`;
  }
  let S = ghIsDangerousCallback(y, apiBase_2);
  let H;
  if (upper === "GET" || h) {
    for (let [w, U] of flattenParamEntries(fieldParams)) S.searchParams.append(w, U);
    if (options.inputFile !== undefined) H = await readInputBody(options.inputFile, t);
  } else if (fieldParams.size > 0) H = Buffer.from(jsonStringify(mapToPlainObject(fieldParams)), "utf8");
  if (options.paginate && !S.searchParams.has("per_page")) S.searchParams.set("per_page", "100");
  let headers = ghRequestHeaders(options.headers, H !== undefined);
  let N = options.jq === undefined ? undefined : whichOnPath("jq", t.path);
  if (N === null)
    throw new GhApiRequestError(
      "--jq needs jq, which is not installed on this machine (not found on PATH): run the command without --jq and pipe the output to a JSON tool that is installed.",
    );
  try {
    new X509Certificate(t.ca);
  } catch {
    throw new GhApiRequestError(proxyCaBundleError("no certificate in it"));
  }
  let z = {
    ca: t.ca,
    rejectUnauthorized: true,
  };
  let L = new ConnectProxyAgent(t.proxyUrl, z);
  L.options = {
    ...L.options,
    ...z,
  };
  let nt = {
    httpsAgent: L,
    proxy: false,
    responseType: "arraybuffer",
    validateStatus: () => true,
    maxRedirects: 0,
    maxContentLength: GH_API_DEFAULTS,
    maxBodyLength: GH_API_DEFAULTS_2,
    timeout: PROXY_CONNECT_TIMEOUT_MS,
  };
  let he = G !== undefined;
  let ue = {
    answered: false,
  };
  let W = false;
  let ce = false;
  for (;;) {
    let w;
    try {
      w = await requestFollowingRedirects(
        {
          method: upper,
          url: S,
          body: H,
          headers,
        },
        nt,
        apiBase_2,
        ue,
      );
    } catch (error) {
      let v = he && requestHostNote(G, ue.answered, isClientStatus(findProxyError(error)?.connectStatus));
      if (!v) throw error;
      await t.write(
        "stderr",
        `gh: ${ghProxyRefusalText(error, t.statusUrl)}
${v}`,
      );
      return 1;
    }
    let U = w.status > 299;
    let Y = G;
    G = undefined;
    if (Y !== undefined && !U) await t.write("stderr", requestHostNote(Y, true, false));
    let pe = options.paginate ? /<([^>]+)>;\s*rel="next"/.exec(String(w.headers.link ?? ""))?.[1] : undefined;
    if (options.include) await t.write("stdout", formatResponseHead(w));
    let F = w.data;
    if (F.length > 0 && !options.silent)
      if (N !== undefined && options.jq !== undefined && !U) {
        let R = await execFileNoThrowWithCwd(N, jqArgs(options.jq, getPlatform()), {
          cwd: t.cwd,
          input: F,
          timeout: PROXY_CONNECT_TIMEOUT_MS,
          stripFinalNewline: false,
          preserveOutputOnError: true,
        });
        await t.write("stdout", R.stdout);
        if (R.code !== 0) {
          await t.write("stderr", escapeControlChars(R.stderr));
          return 1;
        }
      } else if (
        options.paginate &&
        !options.include &&
        !U &&
        /[/+]json(;|$)/.test(String(w.headers["content-type"] ?? "")) &&
        F[0] === OPEN_BRACKET_CODE &&
        F.at(-1) === CLOSE_BRACKET_CODE
      ) {
        let chunk = F.subarray(1, -1);
        if (!W) {
          await t.write("stdout", "[");
          W = true;
        }
        if (chunk.some((v) => !HEADER_VALUE_SPACE_CODES.has(v))) {
          if (ce) await t.write("stdout", ",");
          await t.write("stdout", chunk);
          ce = true;
        }
      } else await t.write("stdout", F);
    if (U) {
      await t.write(
        "stderr",
        `gh: ${escapeControlChars(describeApiError(w.status, F))}
`,
      );
      let included = [401, 403, 404].includes(w.status);
      let v = he && requestHostNote(Y, true, included || w.headers["x-proxy-error"] !== undefined);
      if (v) await t.write("stderr", v);
      else if (ghesHosts !== ANY && b === undefined && ghesHosts.length > 0 && included)
        await t.write(
          "stderr",
          `this request went to ${GITHUB_HOST}; for a repository on ${ghesHosts.join(" or ")}, add --hostname <host> or write the endpoint as repos/{owner}/{repo}/...
`,
        );
      return 1;
    }
    if (pe === undefined) {
      if (W) await t.write("stdout", "]");
      return 0;
    }
    S = preserveQueryOnRepoRedirect(ghIsDangerousCallback(pe, apiBase_2), S, apiBase_2);
  }
}
//@ chunk-fy5kn7m3.js:31289-31411 placement
/**
 * 错误输出中附加请求去往的主机说明。
 */
function requestHostNote(e, t, s) {
  if (e === undefined)
    return s
      ? `${ACTIONS_PROXY_NOTE}
`
      : "";
  return `this request ${t ? "went to" : "was for"} ${e}${s ? ` ${ACTIONS_PROXY_NOTE}` : ""}
`;
}
//@ chunk-fy5kn7m3.js:31411-31704 placement
/**
 * /repositories/<id> 重定向到 /repos/<owner>/<repo> 时保留原查询串。
 */
function preserveQueryOnRepoRedirect(e, t, apiBase) {
  let replaced = new URL(apiBase).pathname.replace(/\/$/, "");
  let match = /^\/repositories\/\d+(\/.*?)?\/?$/.exec(e.pathname.slice(replaced.length));
  let match_2 = /^\/repos\/[^/]+\/[^/]+(\/.*?)?\/?$/.exec(t.pathname.slice(replaced.length));
  if (match === null || match_2 === null || match[1] !== match_2[1]) return e;
  let d = new URL(t);
  d.search = e.search;
  return d;
}
//@ chunk-fy5kn7m3.js:31704-32096 placement
/**
 * 发送请求并跟随重定向（有次数上限，303 等改为 GET/HEAD，每跳校验目标）。
 */
async function requestFollowingRedirects(e, t, apiBase, r) {
  let n = e;
  for (let j = 0; ; j++) {
    let d = await sendByMethod(n, t);
    r.answered = true;
    let location = d.headers.location;
    if (!REDIRECT_STATUS_SET.has(d.status) || typeof location !== "string" || location === "") return d;
    if (j === MAX_PAGINATION_PAGES)
      throw new GhApiRequestError(`stopped after ${MAX_PAGINATION_PAGES} redirects`);
    let url = checkGhRedirect(location, n.url, apiBase);
    n =
      d.status === 307 || d.status === 308
        ? {
            ...n,
            url,
          }
        : {
            method: n.method === "HEAD" ? "HEAD" : "GET",
            url,
            body: undefined,
            headers: {
              ...n.headers,
              "content-type": false,
            },
          };
  }
}
//@ chunk-fy5kn7m3.js:32096-32563 placement
/**
 * 按方法调用外部 HTTP 客户端（仅 GET/HEAD/POST/PUT/PATCH/DELETE）。
 */
function sendByMethod({ method, url, body, headers }, n) {
  let a = {
    ...n,
    headers,
  };
  switch (method) {
    case "GET":
      return externalHttp.get(url.href, {
        ...a,
        data: body,
      });
    case "HEAD":
      return externalHttp.head(url.href, a);
    case "POST":
      return externalHttp.post(url.href, body ?? Buffer.alloc(0), a);
    case "PUT":
      return externalHttp.put(url.href, body ?? Buffer.alloc(0), a);
    case "PATCH":
      return externalHttp.patch(url.href, body ?? Buffer.alloc(0), a);
    case "DELETE":
      return externalHttp.delete(url.href, {
        ...a,
        data: body,
      });
    default:
      throw new GhApiRequestError("unsupported method; use GET, HEAD, POST, PUT, PATCH or DELETE");
  }
}
//@ chunk-fy5kn7m3.js:32563-32717 placement
/**
 * 解析目标主机与 API 基址（github.com、已配置的 GHE 或任意 GHE 校验）。
 */
function resolveTargetHost(e, apiBase, s) {
  if (e === GITHUB_HOST)
    return {
      host: e,
      apiBase,
    };
  if (s !== ANY)
    return {
      host: e,
      apiBase: githubApiBase(e),
    };
  let enterpriseHost = resolveEnterpriseHost(e);
  if ("refusal" in enterpriseHost) throw new GhApiRequestError(enterpriseHost.refusal);
  return enterpriseHost;
}
//@ chunk-fy5kn7m3.js:32717-33334 placement
/**
 * 端点是完整 URL 时校验主机与同源，返回目标主机。
 */
function resolveAbsoluteEndpoint(e, apiBase, s) {
  let index = e.indexOf("://");
  if (index === -1) return;
  assertCleanEndpoint(e);
  let n = e.slice(index + 3).search(/[/?#]/);
  let a = n === -1 ? e : e.slice(0, index + 3 + n);
  if (!/[/?#]/.test(e.slice(0, index)) && hasRepoPlaceholder(a))
    throw new GhApiRequestError(
      "{owner}, {repo} and {branch} are filled in only in the path and query of an endpoint: this one is a URL with a placeholder before its path",
    );
  let originalUrl = URL.parse(e);
  if (!originalUrl) throw new GhApiRequestError(INVALID_ENDPOINT_PATH_TEXT);
  let h = s !== ANY && s.includes(originalUrl.hostname);
  let l =
    originalUrl.protocol === "https:" &&
    originalUrl.hostname !== new URL(apiBase).hostname &&
    !isGithubDotCom(originalUrl.hostname);
  if (l && !h && s !== ANY) throw new GhApiRequestError(hostNotServedText(originalUrl.hostname, s));
  let targetHost = resolveTargetHost(h || l ? originalUrl.hostname : GITHUB_HOST, apiBase, s);
  if (!isSameOriginWithoutCredentials(originalUrl, new URL(targetHost.apiBase)))
    throw new GhApiRequestError(restPathOnlyText(targetHost.apiBase));
  return targetHost;
}
//@ chunk-fy5kn7m3.js:33334-33400 placement
function isClientStatus(connectStatus) {
  return (
    connectStatus !== undefined &&
    connectStatus >= 400 &&
    connectStatus < 500 &&
    connectStatus !== 408 &&
    connectStatus !== 429
  );
}
//@ chunk-fy5kn7m3.js:33400-33712 placement = ghIsDangerousCallback (0.808)
function ghIsDangerousCallback(_rawCommand, args) {
  assertCleanEndpoint(_rawCommand);
  let s;
  try {
    if (_rawCommand.includes("://")) s = new URL(_rawCommand);
    else {
      let replaced = new URL(args).pathname.replace(/^\/|\/$/g, "");
      let replaced_2 = _rawCommand.replace(/^\//, "");
      let a = replaced !== "" && `${replaced_2.toLowerCase()}/`.startsWith(`${replaced.toLowerCase()}/`);
      s = new URL(a ? replaced_2.slice(replaced.length).replace(/^\//, "") : replaced_2, `${args}/`);
    }
  } catch {
    throw new GhApiRequestError(INVALID_ENDPOINT_PATH_TEXT);
  }
  return checkSameOriginPath(s, args, restPathOnlyText(args));
}
//@ chunk-fy5kn7m3.js:33712-33853 placement
/**
 * 端点含制表符、换行、控制字符或反斜杠时报错。
 */
function assertCleanEndpoint(e) {
  if (/[\p{Cc}\\]|(?! )\s/u.test(e))
    throw new GhApiRequestError(
      "the endpoint contains a tab, a line break, a control character or a backslash",
    );
}
//@ chunk-fy5kn7m3.js:33853-33988 placement
/**
 * 只接受 REST 路径的提示。
 */
function restPathOnlyText(e) {
  return `this gh sends requests to ${e.replace("https://", "")} only; give a REST path such as repos/{owner}/{repo}/pulls`;
}
//@ chunk-fy5kn7m3.js:33988-34774 placement
function checkGhRedirect(location, url, s) {
  let r;
  try {
    r = new URL(location, url);
  } catch {
    throw new GhApiRequestError("refusing a redirect whose Location is not a URL");
  }
  let n = r.host === "" || r.host.length > MAX_PAGE_BODY_BYTES ? "another host" : `${r.protocol}//${r.host}`;
  let a = r.username === "" && r.password === "" ? "" : " with a username or password in its URL";
  let d = new URL(s);
  return checkSameOriginPath(
    r,
    s,
    `refusing a redirect to ${n}${a}: this gh sends requests to ${s} only, and running the command again or with other flags will not change that.` +
      (r.hostname !== "" && r.hostname !== d.hostname
        ? " GitHub serves logs, archives, artifacts and release files from other hosts, which this built-in gh does not contact."
        : "") +
      (ACTIONS_ENDPOINT_RE.test(url.pathname)
        ? " For a failed CI job read repos/{owner}/{repo}/actions/runs/<run-id>/jobs (its steps) and repos/{owner}/{repo}/check-runs/<check-run-id>/annotations."
        : ""),
  );
}
//@ chunk-fy5kn7m3.js:34774-34873 placement = isPermittedRedirect (0.763)
/**
 * 两个 URL 协议与 host 相同且原 URL 不带凭证。
 */
function isSameOriginWithoutCredentials(originalUrl, redirectUrl) {
  return (
    originalUrl.protocol === redirectUrl.protocol &&
    originalUrl.host === redirectUrl.host &&
    originalUrl.username === "" &&
    originalUrl.password === ""
  );
}
//@ chunk-fy5kn7m3.js:34873-35099 placement
/**
 * 校验 URL 与 API 基址同源且路径在其下，去掉 hash。
 */
function checkSameOriginPath(originalUrl, t, s) {
  let redirectUrl = new URL(t);
  if (!isSameOriginWithoutCredentials(originalUrl, redirectUrl)) throw new GhApiRequestError(s);
  let n = checkEndpointPath(originalUrl.pathname, redirectUrl.pathname !== "/");
  if (n !== undefined) throw new GhApiRequestError(n);
  if (redirectUrl.pathname !== "/" && !originalUrl.pathname.startsWith(`${redirectUrl.pathname}/`))
    throw new GhApiRequestError(s);
  originalUrl.hash = "";
  return originalUrl;
}
//@ chunk-fy5kn7m3.js:35099-36225 placement
function ghRequestHeaders(headers, t) {
  let s = {
    accept: "*/*",
    "x-github-api-version": GITHUB_API_VERSION,
    "content-type": t && "application/json; charset=utf-8",
  };
  for (let r of headers) {
    let index = r.indexOf(":");
    if (index === -1)
      throw new GhApiRequestError(`header "${truncateLabel(r)}" requires a value separated by ':'`);
    let lower = r.slice(0, index).trim().toLowerCase();
    let trimmed = r.slice(index + 1).trim();
    if (!ALLOWED_HEADER_NAMES.has(lower))
      throw new GhApiRequestError(
        `the ${/^[a-z0-9-]+$/.test(lower) ? `${lower} ` : ""}header cannot be set through this session's GitHub proxy; headers that can: ${[...ALLOWED_HEADER_NAMES].join(", ")}`,
      );
    if (/[^\P{Cc}\t]/u.test(trimmed))
      throw new GhApiRequestError(`the ${lower} header value contains a control character`);
    s[lower] = trimmed;
  }
  return {
    ...s,
    authorization: `token ${PROXY_INJECTED_MARKER}`,
    "user-agent": `claude-code-gh-standin/${
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
      }.VERSION
    }`,
  };
}
//@ chunk-fy5kn7m3.js:36225-36646 placement
/**
 * 读取 --input（文件或标准输入），超过上限时报错。
 */
async function readInputBody(e, t) {
  let s = new GhApiRequestError(
    `${e === "-" ? "standard input" : truncateLabel(e)} is larger than ${GH_API_DEFAULTS_2 / 1048576} MB, the most this gh sends`,
  );
  if (e === "-") {
    let n = [];
    let a = 0;
    for await (let d of t.stdin) {
      let buffer = Buffer.from(d);
      a += buffer.length;
      if (a > GH_API_DEFAULTS_2) throw s;
      n.push(buffer);
    }
    return Buffer.concat(n);
  }
  let r;
  try {
    await using n = await open(e, "r");
    r = await readHandleUpTo(n, GH_API_DEFAULTS_2 + 1);
  } catch (error) {
    throw new GhApiRequestError(
      `could not read ${truncateLabel(e)} (${getErrnoCode(error) ?? "unreadable"})`,
    );
  }
  if (r.length > GH_API_DEFAULTS_2) throw s;
  return r;
}
//@ chunk-fy5kn7m3.js:36646-36955 placement
/**
 * 把状态行与响应头格式化为 HTTP/1.1 头文本（--include）。
 */
function formatResponseHead(e) {
  let t = [`HTTP/1.1 ${e.status} ${e.statusText}`.trimEnd()];
  for (let [key, value] of Object.entries(e.headers).sort(([n], [a]) => (n < a ? -1 : n > a ? 1 : 0))) {
    let replaced = key.replace(/(^|-)([a-z])/g, (a, d, h) => `${d}${h.toUpperCase()}`);
    for (let a of Array.isArray(value) ? value : [value]) t.push(`${replaced}: ${String(a)}`);
  }
  return `${t.join(`\r
`)}\r
\r
`;
}
//@ chunk-fy5kn7m3.js:36955-37400 placement
/**
 * 从 GitHub 错误响应体提取 message/errors 文本。
 */
function describeApiError(status, t) {
  let s;
  try {
    s = t.length <= MAX_JQ_INPUT_BYTES ? jsonParse(t.toString("utf8")) : undefined;
  } catch {
    s = undefined;
  }
  let r = ghApiErrorSchema().safeParse(s);
  if (!r.success) return `HTTP ${status}`;
  let { message, errors } = r.data;
  if (typeof errors === "string" && errors !== "") return message ? `${errors} (${message})` : errors;
  if (message) return `${message} (HTTP ${status})`;
  let d = [];
  for (let h of Array.isArray(errors) ? errors : []) {
    let l = ghApiMessageSchema().safeParse(h);
    if (typeof h === "string") d.push(h);
    else if (l.success) d.push(l.data.message);
  }
  return d.length > 0
    ? d.join(`
`)
    : `HTTP ${status}`;
}
//@ chunk-fy5kn7m3.js:37400-38398 placement
function ghProxyRefusalText(error, statusUrl) {
  if (
    error instanceof GhApiRequestError ||
    error instanceof FieldParseError ||
    error instanceof GhApiUsageError
  )
    return error.message;
  let proxyError = findProxyError(error);
  if (proxyError !== undefined) {
    let connectStatus = proxyError.connectStatus;
    let a = describeHttpStatus(connectStatus);
    if (isClientStatus(connectStatus))
      return `this session's GitHub proxy refused the connection (${a}); do not retry unchanged`;
    let d = String(proxyError.headers["retry-after"] ?? "");
    let h = /^\d{1,3}$/.test(d) ? Number(d) : 0;
    let l = h > 1 && h <= MAX_REDIRECTS ? `${h} seconds` : "a few seconds";
    return (
      `this session's GitHub proxy could not open the connection (${a}); nothing was sent. This can be temporary: wait ${l} and run the command once more. ` +
      (statusUrl === undefined
        ? "If it fails again, stop."
        : `If it fails again, stop and read GET ${statusUrl} for the proxy's state.`)
    );
  }
  if (isAxiosError(error) && error.message.includes("maxContentLength"))
    return `the response is larger than ${GH_API_DEFAULTS / 1048576} MB, the most this gh reads; ask for less (per_page, a narrower endpoint)`;
  if (isAxiosError(error) && error.message.includes("maxBodyLength")) return "the request body is too large";
  let r = isAxiosError(error) ? error.code : getErrnoCode(error);
  return `could not reach GitHub through this session's GitHub proxy${r === undefined ? "" : ` (${r})`}`;
}
export { runBuiltinGhApi, ghProxyRefusalText, proxyCaBundleError };
