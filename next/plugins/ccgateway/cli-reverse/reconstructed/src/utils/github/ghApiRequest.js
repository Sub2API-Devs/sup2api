/**
 * utils/github/ghApiRequest.ts
 *
 * 2.1.316 新增。gh api 请求（代理、重定向）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ntm2y5qw.js (21)
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

//@ chunk-ntm2y5qw.js:28497-28581 placement
/**
 * 生成"读不到会话 GitHub 代理 CA 证书"的错误文案。
 */
function proxyCaBundleError(errnoCode) {
  return `could not read this session's GitHub proxy CA bundle (${errnoCode}).`;
}
//@ chunk-ntm2y5qw.js:28581-28657 placement
function jqArgs(expression, args) {
  return [...(args === "windows" ? ["--binary"] : []), "-r", "-c", ` ${expression}`];
}
//@ chunk-ntm2y5qw.js:28657-32305 placement
/**
 * 内置 `gh api` 实现：在没有 GitHub CLI 的云会话中，经会话 GitHub 代理转发 REST 请求，填充 {owner}/{repo}/{branch}，校验主机与路径，支持分页、字段、--jq。
 */
async function runBuiltinGhApi(options, context, ghesHosts) {
  if (isEssentialTrafficOnly())
    throw new GhApiRequestError(
      "the built-in gh api is off in this session: nonessential network traffic is disabled (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)",
    );
  let apiBase = context.apiOrigin ?? githubApiBase(GITHUB_HOST);
  let absoluteEndpoint = resolveAbsoluteEndpoint(options.endpoint, apiBase, ghesHosts);
  let repoContext = new GhRepoContext(
    context.cwd,
    context.ghRepo,
    absoluteEndpoint?.host ?? options.host,
    ghesHosts,
  );
  let params = await buildFieldParams(options.rawFields, options.typedFields, async (value) => {
    if (value.startsWith("@")) return (await readInputBody(value.slice(1), context)).toString("utf8");
    if (/^[+-]?\d+$/.test(value) && Number.isSafeInteger(Number(value))) return Number(value);
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      case "null":
        return null;
      default:
        return repoContext.fill(value, false);
    }
  });
  let hasInputFile = options.inputFile !== undefined;
  let upper = (options.method ?? (params.size > 0 || hasInputFile ? "POST" : "GET")).toUpperCase();
  if (options.paginate && upper !== "GET")
    throw new GhApiRequestError(
      "the `--paginate` option is not supported for non-GET requests; with fields the method is POST unless `-X GET` sends them as query parameters",
    );
  let filledEndpoint = await repoContext.fill(options.endpoint, true);
  let absoluteEndpoint_2 = resolveAbsoluteEndpoint(filledEndpoint, apiBase, ghesHosts);
  if (
    absoluteEndpoint_2?.host !== absoluteEndpoint?.host ||
    absoluteEndpoint_2?.apiBase !== absoluteEndpoint?.apiBase
  )
    throw new GhApiRequestError(
      "filling in {owner}, {repo} or {branch} would change the host of the endpoint: spell the endpoint out",
    );
  let requestedHost = absoluteEndpoint_2?.host ?? options.host ?? repoContext.pathFilledFromHost();
  let { host, apiBase: apiBase_2 } =
    absoluteEndpoint_2 ?? resolveTargetHost(requestedHost ?? GITHUB_HOST, apiBase, ghesHosts);
  let hostNote;
  if (host !== GITHUB_HOST && ghesHosts === ANY) {
    let hostSource =
      absoluteEndpoint_2 !== undefined
        ? "the host in the endpoint URL"
        : options.host !== undefined
          ? "the host --hostname names"
          : `the host of ${remoteDescription(repoContext.pathFilledFromRemote())}`;
    hostNote = `${host}, not ${GITHUB_HOST}: ${hostSource}.`;
  }
  let url = ghIsDangerousCallback(filledEndpoint, apiBase_2);
  let body;
  if (upper === "GET" || hasInputFile) {
    for (let [key, value] of flattenParamEntries(params)) url.searchParams.append(key, value);
    if (options.inputFile !== undefined) body = await readInputBody(options.inputFile, context);
  } else if (params.size > 0) body = Buffer.from(jsonStringify(mapToPlainObject(params)), "utf8");
  if (options.paginate && !url.searchParams.has("per_page")) url.searchParams.set("per_page", "100");
  let headers = ghRequestHeaders(options.headers, body !== undefined);
  let jqPath = options.jq === undefined ? undefined : whichOnPath("jq", context.path);
  if (jqPath === null)
    throw new GhApiRequestError(
      "--jq needs jq, which is not installed on this machine (not found on PATH): run the command without --jq and pipe the output to a JSON tool that is installed.",
    );
  try {
    new X509Certificate(context.ca);
  } catch {
    throw new GhApiRequestError(proxyCaBundleError("no certificate in it"));
  }
  let tlsOptions = {
    ca: context.ca,
    rejectUnauthorized: true,
  };
  let agent = new ConnectProxyAgent(context.proxyUrl, tlsOptions);
  agent.options = {
    ...agent.options,
    ...tlsOptions,
  };
  let requestOptions = {
    httpsAgent: agent,
    proxy: false,
    responseType: "arraybuffer",
    validateStatus: () => true,
    maxRedirects: 0,
    maxContentLength: GH_API_DEFAULTS,
    maxBodyLength: GH_API_DEFAULTS_2,
    timeout: PROXY_CONNECT_TIMEOUT_MS,
  };
  let willNoteHost = hostNote !== undefined;
  let statusState = {
    answered: false,
  };
  let wroteArrayOpen = false;
  let wroteArrayItem = false;
  for (;;) {
    let response;
    try {
      response = await requestFollowingRedirects(
        {
          method: upper,
          url,
          body,
          headers,
        },
        requestOptions,
        apiBase_2,
        statusState,
      );
    } catch (error) {
      let refusalNote =
        willNoteHost &&
        requestHostNote(hostNote, statusState.answered, isClientStatus(findProxyError(error)?.connectStatus));
      if (!refusalNote) throw error;
      await context.write(
        "stderr",
        `gh: ${ghProxyRefusalText(error, context.statusUrl)}
${refusalNote}`,
      );
      return 1;
    }
    let isErrorStatus = response.status > 299;
    let pendingHostNote = hostNote;
    hostNote = undefined;
    if (pendingHostNote !== undefined && !isErrorStatus)
      await context.write("stderr", requestHostNote(pendingHostNote, true, false));
    let nextUrl = options.paginate
      ? /<([^>]+)>;\s*rel="next"/.exec(String(response.headers.link ?? ""))?.[1]
      : undefined;
    if (options.include) await context.write("stdout", formatResponseHead(response));
    let bodyBuffer = response.data;
    if (bodyBuffer.length > 0 && !options.silent)
      if (jqPath !== undefined && options.jq !== undefined && !isErrorStatus) {
        let jqResult = await execFileNoThrowWithCwd(jqPath, jqArgs(options.jq, getPlatform()), {
          cwd: context.cwd,
          input: bodyBuffer,
          timeout: PROXY_CONNECT_TIMEOUT_MS,
          stripFinalNewline: false,
          preserveOutputOnError: true,
        });
        await context.write("stdout", jqResult.stdout);
        if (jqResult.code !== 0) {
          await context.write("stderr", escapeControlChars(jqResult.stderr));
          return 1;
        }
      } else if (
        options.paginate &&
        !options.include &&
        !isErrorStatus &&
        /[/+]json(;|$)/.test(String(response.headers["content-type"] ?? "")) &&
        bodyBuffer[0] === OPEN_BRACKET_CODE &&
        bodyBuffer.at(-1) === CLOSE_BRACKET_CODE
      ) {
        let chunk = bodyBuffer.subarray(1, -1);
        if (!wroteArrayOpen) {
          await context.write("stdout", "[");
          wroteArrayOpen = true;
        }
        if (chunk.some((byte) => !HEADER_VALUE_SPACE_CODES.has(byte))) {
          if (wroteArrayItem) await context.write("stdout", ",");
          await context.write("stdout", chunk);
          wroteArrayItem = true;
        }
      } else await context.write("stdout", bodyBuffer);
    if (isErrorStatus) {
      await context.write(
        "stderr",
        `gh: ${escapeControlChars(describeApiError(response.status, bodyBuffer))}
`,
      );
      let included = [401, 403, 404].includes(response.status);
      let statusNote =
        willNoteHost &&
        requestHostNote(pendingHostNote, true, included || response.headers["x-proxy-error"] !== undefined);
      if (statusNote) await context.write("stderr", statusNote);
      else if (ghesHosts !== ANY && requestedHost === undefined && ghesHosts.length > 0 && included)
        await context.write(
          "stderr",
          `this request went to ${GITHUB_HOST}; for a repository on ${ghesHosts.join(" or ")}, add --hostname <host> or write the endpoint as repos/{owner}/{repo}/...
`,
        );
      return 1;
    }
    if (nextUrl === undefined) {
      if (wroteArrayOpen) await context.write("stdout", "]");
      return 0;
    }
    url = preserveQueryOnRepoRedirect(ghIsDangerousCallback(nextUrl, apiBase_2), url, apiBase_2);
  }
}
//@ chunk-ntm2y5qw.js:32305-32427 placement
/**
 * 错误输出中附加请求去往的主机说明。
 */
function requestHostNote(host, answered, withProxyNote) {
  if (host === undefined)
    return withProxyNote
      ? `${ACTIONS_PROXY_NOTE}
`
      : "";
  return `this request ${answered ? "went to" : "was for"} ${host}${withProxyNote ? ` ${ACTIONS_PROXY_NOTE}` : ""}
`;
}
//@ chunk-ntm2y5qw.js:32427-32720 placement
/**
 * /repositories/<id> 重定向到 /repos/<owner>/<repo> 时保留原查询串。
 */
function preserveQueryOnRepoRedirect(url, apiUrl, apiBase) {
  let replaced = new URL(apiBase).pathname.replace(/\/$/, "");
  let match = /^\/repositories\/\d+(\/.*?)?\/?$/.exec(url.pathname.slice(replaced.length));
  let match_2 = /^\/repos\/[^/]+\/[^/]+(\/.*?)?\/?$/.exec(apiUrl.pathname.slice(replaced.length));
  if (match === null || match_2 === null || match[1] !== match_2[1]) return url;
  let apiUrl_2 = new URL(apiUrl);
  apiUrl_2.search = url.search;
  return apiUrl_2;
}
//@ chunk-ntm2y5qw.js:32720-33112 placement
/**
 * 发送请求并跟随重定向（有次数上限，303 等改为 GET/HEAD，每跳校验目标）。
 */
async function requestFollowingRedirects(request, options, apiBase, statusState) {
  let currentRequest = request;
  for (let j = 0; ; j++) {
    let response = await sendByMethod(currentRequest, options);
    statusState.answered = true;
    let location = response.headers.location;
    if (!REDIRECT_STATUS_SET.has(response.status) || typeof location !== "string" || location === "")
      return response;
    if (j === MAX_PAGINATION_PAGES)
      throw new GhApiRequestError(`stopped after ${MAX_PAGINATION_PAGES} redirects`);
    let url = checkGhRedirect(location, currentRequest.url, apiBase);
    currentRequest =
      response.status === 307 || response.status === 308
        ? {
            ...currentRequest,
            url,
          }
        : {
            method: currentRequest.method === "HEAD" ? "HEAD" : "GET",
            url,
            body: undefined,
            headers: {
              ...currentRequest.headers,
              "content-type": false,
            },
          };
  }
}
//@ chunk-ntm2y5qw.js:33112-33579 placement
/**
 * 按方法调用外部 HTTP 客户端（仅 GET/HEAD/POST/PUT/PATCH/DELETE）。
 */
function sendByMethod({ method, url, body, headers }, options) {
  let requestOptions = {
    ...options,
    headers,
  };
  switch (method) {
    case "GET":
      return externalHttp.get(url.href, {
        ...requestOptions,
        data: body,
      });
    case "HEAD":
      return externalHttp.head(url.href, requestOptions);
    case "POST":
      return externalHttp.post(url.href, body ?? Buffer.alloc(0), requestOptions);
    case "PUT":
      return externalHttp.put(url.href, body ?? Buffer.alloc(0), requestOptions);
    case "PATCH":
      return externalHttp.patch(url.href, body ?? Buffer.alloc(0), requestOptions);
    case "DELETE":
      return externalHttp.delete(url.href, {
        ...requestOptions,
        data: body,
      });
    default:
      throw new GhApiRequestError("unsupported method; use GET, HEAD, POST, PUT, PATCH or DELETE");
  }
}
//@ chunk-ntm2y5qw.js:33579-33733 placement
/**
 * 解析目标主机与 API 基址（github.com、已配置的 GHE 或任意 GHE 校验）。
 */
function resolveTargetHost(host, apiBase, ghesHosts) {
  if (host === GITHUB_HOST)
    return {
      host,
      apiBase,
    };
  if (ghesHosts !== ANY)
    return {
      host,
      apiBase: githubApiBase(host),
    };
  let enterpriseHost = resolveEnterpriseHost(host);
  if ("refusal" in enterpriseHost) throw new GhApiRequestError(enterpriseHost.refusal);
  return enterpriseHost;
}
//@ chunk-ntm2y5qw.js:33733-34350 placement
/**
 * 端点是完整 URL 时校验主机与同源，返回目标主机。
 */
function resolveAbsoluteEndpoint(endpoint, apiBase, ghesHosts) {
  let index = endpoint.indexOf("://");
  if (index === -1) return;
  assertCleanEndpoint(endpoint);
  let pathStart = endpoint.slice(index + 3).search(/[/?#]/);
  let authority = pathStart === -1 ? endpoint : endpoint.slice(0, index + 3 + pathStart);
  if (!/[/?#]/.test(endpoint.slice(0, index)) && hasRepoPlaceholder(authority))
    throw new GhApiRequestError(
      "{owner}, {repo} and {branch} are filled in only in the path and query of an endpoint: this one is a URL with a placeholder before its path",
    );
  let originalUrl = URL.parse(endpoint);
  if (!originalUrl) throw new GhApiRequestError(INVALID_ENDPOINT_PATH_TEXT);
  let isServedHost = ghesHosts !== ANY && ghesHosts.includes(originalUrl.hostname);
  let isOwnEnterpriseHost =
    originalUrl.protocol === "https:" &&
    originalUrl.hostname !== new URL(apiBase).hostname &&
    !isGithubDotCom(originalUrl.hostname);
  if (isOwnEnterpriseHost && !isServedHost && ghesHosts !== ANY)
    throw new GhApiRequestError(hostNotServedText(originalUrl.hostname, ghesHosts));
  let targetHost = resolveTargetHost(
    isServedHost || isOwnEnterpriseHost ? originalUrl.hostname : GITHUB_HOST,
    apiBase,
    ghesHosts,
  );
  if (!isSameOriginWithoutCredentials(originalUrl, new URL(targetHost.apiBase)))
    throw new GhApiRequestError(restPathOnlyText(targetHost.apiBase));
  return targetHost;
}
//@ chunk-ntm2y5qw.js:34350-34416 placement
function isClientStatus(connectStatus) {
  return (
    connectStatus !== undefined &&
    connectStatus >= 400 &&
    connectStatus < 500 &&
    connectStatus !== 408 &&
    connectStatus !== 429
  );
}
//@ chunk-ntm2y5qw.js:34416-34728 placement (2.1.88 match: ghIsDangerousCallback, 0.807)
function ghIsDangerousCallback(_rawCommand, args) {
  assertCleanEndpoint(_rawCommand);
  let parsedUrl;
  try {
    if (_rawCommand.includes("://")) parsedUrl = new URL(_rawCommand);
    else {
      let replaced = new URL(args).pathname.replace(/^\/|\/$/g, "");
      let replaced_2 = _rawCommand.replace(/^\//, "");
      let stripApiBase =
        replaced !== "" && `${replaced_2.toLowerCase()}/`.startsWith(`${replaced.toLowerCase()}/`);
      parsedUrl = new URL(
        stripApiBase ? replaced_2.slice(replaced.length).replace(/^\//, "") : replaced_2,
        `${args}/`,
      );
    }
  } catch {
    throw new GhApiRequestError(INVALID_ENDPOINT_PATH_TEXT);
  }
  return checkSameOriginPath(parsedUrl, args, restPathOnlyText(args));
}
//@ chunk-ntm2y5qw.js:34728-34869 placement
/**
 * 端点含制表符、换行、控制字符或反斜杠时报错。
 */
function assertCleanEndpoint(endpoint) {
  if (/[\p{Cc}\\]|(?! )\s/u.test(endpoint))
    throw new GhApiRequestError(
      "the endpoint contains a tab, a line break, a control character or a backslash",
    );
}
//@ chunk-ntm2y5qw.js:34869-35004 placement
/**
 * 只接受 REST 路径的提示。
 */
function restPathOnlyText(apiBase) {
  return `this gh sends requests to ${apiBase.replace("https://", "")} only; give a REST path such as repos/{owner}/{repo}/pulls`;
}
//@ chunk-ntm2y5qw.js:35004-35790 placement
function checkGhRedirect(location, url, apiBase) {
  let redirectUrl;
  try {
    redirectUrl = new URL(location, url);
  } catch {
    throw new GhApiRequestError("refusing a redirect whose Location is not a URL");
  }
  let hostLabel =
    redirectUrl.host === "" || redirectUrl.host.length > MAX_PAGE_BODY_BYTES
      ? "another host"
      : `${redirectUrl.protocol}//${redirectUrl.host}`;
  let credentialNote =
    redirectUrl.username === "" && redirectUrl.password === ""
      ? ""
      : " with a username or password in its URL";
  let baseUrl = new URL(apiBase);
  return checkSameOriginPath(
    redirectUrl,
    apiBase,
    `refusing a redirect to ${hostLabel}${credentialNote}: this gh sends requests to ${apiBase} only, and running the command again or with other flags will not change that.` +
      (redirectUrl.hostname !== "" && redirectUrl.hostname !== baseUrl.hostname
        ? " GitHub serves logs, archives, artifacts and release files from other hosts, which this built-in gh does not contact."
        : "") +
      (ACTIONS_ENDPOINT_RE.test(url.pathname)
        ? " For a failed CI job read repos/{owner}/{repo}/actions/runs/<run-id>/jobs (its steps) and repos/{owner}/{repo}/check-runs/<check-run-id>/annotations."
        : ""),
  );
}
//@ chunk-ntm2y5qw.js:35790-35889 placement (2.1.88 match: isPermittedRedirect, 0.763)
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
//@ chunk-ntm2y5qw.js:35889-36115 placement
/**
 * 校验 URL 与 API 基址同源且路径在其下，去掉 hash。
 */
function checkSameOriginPath(originalUrl, location, refusalText) {
  let redirectUrl = new URL(location);
  if (!isSameOriginWithoutCredentials(originalUrl, redirectUrl)) throw new GhApiRequestError(refusalText);
  let pathProblem = checkEndpointPath(originalUrl.pathname, redirectUrl.pathname !== "/");
  if (pathProblem !== undefined) throw new GhApiRequestError(pathProblem);
  if (redirectUrl.pathname !== "/" && !originalUrl.pathname.startsWith(`${redirectUrl.pathname}/`))
    throw new GhApiRequestError(refusalText);
  originalUrl.hash = "";
  return originalUrl;
}
//@ chunk-ntm2y5qw.js:36115-37241 placement
function ghRequestHeaders(headers, hasBody) {
  let headerMap = {
    accept: "*/*",
    "x-github-api-version": GITHUB_API_VERSION,
    "content-type": hasBody && "application/json; charset=utf-8",
  };
  for (let header of headers) {
    let index = header.indexOf(":");
    if (index === -1)
      throw new GhApiRequestError(`header "${truncateLabel(header)}" requires a value separated by ':'`);
    let lower = header.slice(0, index).trim().toLowerCase();
    let trimmed = header.slice(index + 1).trim();
    if (!ALLOWED_HEADER_NAMES.has(lower))
      throw new GhApiRequestError(
        `the ${/^[a-z0-9-]+$/.test(lower) ? `${lower} ` : ""}header cannot be set through this session's GitHub proxy; headers that can: ${[...ALLOWED_HEADER_NAMES].join(", ")}`,
      );
    if (/[^\P{Cc}\t]/u.test(trimmed))
      throw new GhApiRequestError(`the ${lower} header value contains a control character`);
    headerMap[lower] = trimmed;
  }
  return {
    ...headerMap,
    authorization: `token ${PROXY_INJECTED_MARKER}`,
    "user-agent": `claude-code-gh-standin/${
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
      }.VERSION
    }`,
  };
}
//@ chunk-ntm2y5qw.js:37241-37662 placement
/**
 * 读取 --input（文件或标准输入），超过上限时报错。
 */
async function readInputBody(source, context) {
  let tooLargeError = new GhApiRequestError(
    `${source === "-" ? "standard input" : truncateLabel(source)} is larger than ${GH_API_DEFAULTS_2 / 1048576} MB, the most this gh sends`,
  );
  if (source === "-") {
    let chunks = [];
    let totalBytes = 0;
    for await (let chunk of context.stdin) {
      let buffer = Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > GH_API_DEFAULTS_2) throw tooLargeError;
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }
  let body;
  try {
    await using handle = await open(source, "r");
    body = await readHandleUpTo(handle, GH_API_DEFAULTS_2 + 1);
  } catch (error) {
    throw new GhApiRequestError(
      `could not read ${truncateLabel(source)} (${getErrnoCode(error) ?? "unreadable"})`,
    );
  }
  if (body.length > GH_API_DEFAULTS_2) throw tooLargeError;
  return body;
}
//@ chunk-ntm2y5qw.js:37662-37971 placement
/**
 * 把状态行与响应头格式化为 HTTP/1.1 头文本（--include）。
 */
function formatResponseHead(response) {
  let lines = [`HTTP/1.1 ${response.status} ${response.statusText}`.trimEnd()];
  for (let [key, value] of Object.entries(response.headers).sort(([leftKey], [rightKey]) =>
    leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0,
  )) {
    let replaced = key.replace(
      /(^|-)([a-z])/g,
      (whole, separator, letter) => `${separator}${letter.toUpperCase()}`,
    );
    for (let value_2 of Array.isArray(value) ? value : [value]) lines.push(`${replaced}: ${String(value_2)}`);
  }
  return `${lines.join(`\r
`)}\r
\r
`;
}
//@ chunk-ntm2y5qw.js:37971-38416 placement
/**
 * 从 GitHub 错误响应体提取 message/errors 文本。
 */
function describeApiError(status, body) {
  let parsed;
  try {
    parsed = body.length <= MAX_JQ_INPUT_BYTES ? jsonParse(body.toString("utf8")) : undefined;
  } catch {
    parsed = undefined;
  }
  let result = ghApiErrorSchema().safeParse(parsed);
  if (!result.success) return `HTTP ${status}`;
  let { message, errors } = result.data;
  if (typeof errors === "string" && errors !== "") return message ? `${errors} (${message})` : errors;
  if (message) return `${message} (HTTP ${status})`;
  let messages = [];
  for (let entry of Array.isArray(errors) ? errors : []) {
    let parsedEntry = ghApiMessageSchema().safeParse(entry);
    if (typeof entry === "string") messages.push(entry);
    else if (parsedEntry.success) messages.push(parsedEntry.data.message);
  }
  return messages.length > 0
    ? messages.join(`
`)
    : `HTTP ${status}`;
}
//@ chunk-ntm2y5qw.js:38416-39414 placement
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
    let statusText = describeHttpStatus(connectStatus);
    if (isClientStatus(connectStatus))
      return `this session's GitHub proxy refused the connection (${statusText}); do not retry unchanged`;
    let retryAfterValue = String(proxyError.headers["retry-after"] ?? "");
    let retryAfterSeconds = /^\d{1,3}$/.test(retryAfterValue) ? Number(retryAfterValue) : 0;
    let waitText =
      retryAfterSeconds > 1 && retryAfterSeconds <= MAX_REDIRECTS
        ? `${retryAfterSeconds} seconds`
        : "a few seconds";
    return (
      `this session's GitHub proxy could not open the connection (${statusText}); nothing was sent. This can be temporary: wait ${waitText} and run the command once more. ` +
      (statusUrl === undefined
        ? "If it fails again, stop."
        : `If it fails again, stop and read GET ${statusUrl} for the proxy's state.`)
    );
  }
  if (isAxiosError(error) && error.message.includes("maxContentLength"))
    return `the response is larger than ${GH_API_DEFAULTS / 1048576} MB, the most this gh reads; ask for less (per_page, a narrower endpoint)`;
  if (isAxiosError(error) && error.message.includes("maxBodyLength")) return "the request body is too large";
  let code = isAxiosError(error) ? error.code : getErrnoCode(error);
  return `could not reach GitHub through this session's GitHub proxy${code === undefined ? "" : ` (${code})`}`;
}
export { runBuiltinGhApi, ghProxyRefusalText, proxyCaBundleError };
