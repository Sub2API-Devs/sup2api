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
  m,
  GhRepoContext,
  buildFieldParams,
  remoteDescription,
  Oe,
  ee,
  Xe,
  GH_API_DEFAULTS,
  Ne,
  Gt,
  kt,
  Ft,
  Be,
  Ht,
  Le,
  resolveEnterpriseHost,
  ke,
  ze,
  hostNotServedText,
  At,
  Pt,
  checkEndpointPath,
  Ot,
  E,
  Ie,
  Tt,
  vt,
  Ct,
  x,
  T,
  xt,
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
function We(e) {
  return `could not read this session's GitHub proxy CA bundle (${e}).`;
}
//@ chunk-fy5kn7m3.js:27565-27641 placement
function Bt(e, t) {
  return [...(t === "windows" ? ["--binary"] : []), "-r", "-c", ` ${e}`];
}
/**
 * 内置 `gh api` 实现：在没有 GitHub CLI 的云会话中，经会话 GitHub 代理转发 REST 请求，填充 {owner}/{repo}/{branch}，校验主机与路径，支持分页、字段、--jq。
 */
//@ chunk-fy5kn7m3.js:27641-31289 placement
async function runBuiltinGhApi(e, t, s) {
  if (isEssentialTrafficOnly())
    throw new m(
      "the built-in gh api is off in this session: nonessential network traffic is disabled (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)",
    );
  let r = t.apiOrigin ?? githubApiBase(GITHUB_HOST),
    n = resolveAbsoluteEndpoint(e.endpoint, r, s),
    a = new GhRepoContext(t.cwd, t.ghRepo, n?.host ?? e.host, s),
    d = await buildFieldParams(e.rawFields, e.typedFields, async (w) => {
      if (w.startsWith("@")) return (await readInputBody(w.slice(1), t)).toString("utf8");
      if (/^[+-]?\d+$/.test(w) && Number.isSafeInteger(Number(w))) return Number(w);
      switch (w) {
        case "true":
          return !0;
        case "false":
          return !1;
        case "null":
          return null;
        default:
          return a.fill(w, !1);
      }
    }),
    h = e.inputFile !== void 0,
    upper = (e.method ?? (d.size > 0 || h ? "POST" : "GET")).toUpperCase();
  if (e.paginate && upper !== "GET")
    throw new m(
      "the `--paginate` option is not supported for non-GET requests; with fields the method is POST unless `-X GET` sends them as query parameters",
    );
  let fill = await a.fill(e.endpoint, !0),
    g = resolveAbsoluteEndpoint(fill, r, s);
  if (g?.host !== n?.host || g?.apiBase !== n?.apiBase)
    throw new m(
      "filling in {owner}, {repo} or {branch} would change the host of the endpoint: spell the endpoint out",
    );
  let b = g?.host ?? e.host ?? a.pathFilledFromHost(),
    { host: host, apiBase: apiBase } = g ?? resolveTargetHost(b ?? GITHUB_HOST, r, s),
    G;
  if (host !== GITHUB_HOST && s === ANY) {
    let w =
      g !== void 0
        ? "the host in the endpoint URL"
        : e.host !== void 0
          ? "the host --hostname names"
          : `the host of ${remoteDescription(a.pathFilledFromRemote())}`;
    G = `${host}, not ${GITHUB_HOST}: ${w}.`;
  }
  let S = ghIsDangerousCallback(fill, apiBase),
    H;
  if (upper === "GET" || h) {
    for (let [w, U] of Oe(d)) S.searchParams.append(w, U);
    if (e.inputFile !== void 0) H = await readInputBody(e.inputFile, t);
  } else if (d.size > 0) H = Buffer.from(jsonStringify(ee(d)), "utf8");
  if (e.paginate && !S.searchParams.has("per_page")) S.searchParams.set("per_page", "100");
  let j = ghRequestHeaders(e.headers, H !== void 0),
    N = e.jq === void 0 ? void 0 : whichOnPath("jq", t.path);
  if (N === null)
    throw new m(
      "--jq needs jq, which is not installed on this machine (not found on PATH): run the command without --jq and pipe the output to a JSON tool that is installed.",
    );
  try {
    new X509Certificate(t.ca);
  } catch {
    throw new m(We("no certificate in it"));
  }
  let z = { ca: t.ca, rejectUnauthorized: !0 },
    L = new ConnectProxyAgent(t.proxyUrl, z);
  L.options = { ...L.options, ...z };
  let nt = {
      httpsAgent: L,
      proxy: !1,
      responseType: "arraybuffer",
      validateStatus: () => !0,
      maxRedirects: 0,
      maxContentLength: Xe,
      maxBodyLength: GH_API_DEFAULTS,
      timeout: Ne,
    },
    he = G !== void 0,
    ue = { answered: !1 },
    W = !1,
    ce = !1;
  for (;;) {
    let w;
    try {
      w = await requestFollowingRedirects({ method: upper, url: S, body: H, headers: j }, nt, apiBase, ue);
    } catch (error) {
      let v = he && requestHostNote(G, ue.answered, Ve(findProxyError(error)?.connectStatus));
      if (!v) throw error;
      return (
        await t.write(
          "stderr",
          `gh: ${ghProxyRefusalText(error, t.statusUrl)}
${v}`,
        ),
        1
      );
    }
    let U = w.status > 299,
      Y = G;
    if (((G = void 0), Y !== void 0 && !U)) await t.write("stderr", requestHostNote(Y, !0, !1));
    let pe = e.paginate ? /<([^>]+)>;\s*rel="next"/.exec(String(w.headers.link ?? ""))?.[1] : void 0;
    if (e.include) await t.write("stdout", formatResponseHead(w));
    let F = w.data;
    if (F.length > 0 && !e.silent)
      if (N !== void 0 && e.jq !== void 0 && !U) {
        let R = await execFileNoThrowWithCwd(N, Bt(e.jq, getPlatform()), {
          cwd: t.cwd,
          input: F,
          timeout: Ne,
          stripFinalNewline: !1,
          preserveOutputOnError: !0,
        });
        if ((await t.write("stdout", R.stdout), R.code !== 0))
          return (await t.write("stderr", escapeControlChars(R.stderr)), 1);
      } else if (
        e.paginate &&
        !e.include &&
        !U &&
        /[/+]json(;|$)/.test(String(w.headers["content-type"] ?? "")) &&
        F[0] === Gt &&
        F.at(-1) === kt
      ) {
        let chunk = F.subarray(1, -1);
        if (!W) (await t.write("stdout", "["), (W = !0));
        if (chunk.some((v) => !Ft.has(v))) {
          if (ce) await t.write("stdout", ",");
          (await t.write("stdout", chunk), (ce = !0));
        }
      } else await t.write("stdout", F);
    if (U) {
      await t.write(
        "stderr",
        `gh: ${escapeControlChars(describeApiError(w.status, F))}
`,
      );
      let included = [401, 403, 404].includes(w.status),
        v = he && requestHostNote(Y, !0, included || w.headers["x-proxy-error"] !== void 0);
      if (v) await t.write("stderr", v);
      else if (s !== ANY && b === void 0 && s.length > 0 && included)
        await t.write(
          "stderr",
          `this request went to ${GITHUB_HOST}; for a repository on ${s.join(" or ")}, add --hostname <host> or write the endpoint as repos/{owner}/{repo}/...
`,
        );
      return 1;
    }
    if (pe === void 0) {
      if (W) await t.write("stdout", "]");
      return 0;
    }
    S = preserveQueryOnRepoRedirect(ghIsDangerousCallback(pe, apiBase), S, apiBase);
  }
}
/**
 * 错误输出中附加请求去往的主机说明。
 */
//@ chunk-fy5kn7m3.js:31289-31411 placement
function requestHostNote(e, t, s) {
  if (e === void 0)
    return s
      ? `${Be}
`
      : "";
  return `this request ${t ? "went to" : "was for"} ${e}${s ? ` ${Be}` : ""}
`;
}
/**
 * /repositories/<id> 重定向到 /repos/<owner>/<repo> 时保留原查询串。
 */
//@ chunk-fy5kn7m3.js:31411-31704 placement
function preserveQueryOnRepoRedirect(e, t, s) {
  let replaced = new URL(s).pathname.replace(/\/$/, ""),
    match = /^\/repositories\/\d+(\/.*?)?\/?$/.exec(e.pathname.slice(replaced.length)),
    match_2 = /^\/repos\/[^/]+\/[^/]+(\/.*?)?\/?$/.exec(t.pathname.slice(replaced.length));
  if (match === null || match_2 === null || match[1] !== match_2[1]) return e;
  let d = new URL(t);
  return ((d.search = e.search), d);
}
/**
 * 发送请求并跟随重定向（有次数上限，303 等改为 GET/HEAD，每跳校验目标）。
 */
//@ chunk-fy5kn7m3.js:31704-32096 placement
async function requestFollowingRedirects(e, t, s, r) {
  let n = e;
  for (let a = 0; ; a++) {
    let d = await sendByMethod(n, t);
    r.answered = !0;
    let location = d.headers.location;
    if (!Ht.has(d.status) || typeof location !== "string" || location === "") return d;
    if (a === Le) throw new m(`stopped after ${Le} redirects`);
    let l = checkGhRedirect(location, n.url, s);
    n =
      d.status === 307 || d.status === 308
        ? { ...n, url: l }
        : {
            method: n.method === "HEAD" ? "HEAD" : "GET",
            url: l,
            body: void 0,
            headers: { ...n.headers, "content-type": !1 },
          };
  }
}
/**
 * 按方法调用外部 HTTP 客户端（仅 GET/HEAD/POST/PUT/PATCH/DELETE）。
 */
//@ chunk-fy5kn7m3.js:32096-32563 placement
function sendByMethod({ method: method, url: url, body: body, headers: headers }, n) {
  let a = { ...n, headers: headers };
  switch (method) {
    case "GET":
      return externalHttp.get(url.href, { ...a, data: body });
    case "HEAD":
      return externalHttp.head(url.href, a);
    case "POST":
      return externalHttp.post(url.href, body ?? Buffer.alloc(0), a);
    case "PUT":
      return externalHttp.put(url.href, body ?? Buffer.alloc(0), a);
    case "PATCH":
      return externalHttp.patch(url.href, body ?? Buffer.alloc(0), a);
    case "DELETE":
      return externalHttp.delete(url.href, { ...a, data: body });
    default:
      throw new m("unsupported method; use GET, HEAD, POST, PUT, PATCH or DELETE");
  }
}
/**
 * 解析目标主机与 API 基址（github.com、已配置的 GHE 或任意 GHE 校验）。
 */
//@ chunk-fy5kn7m3.js:32563-32717 placement
function resolveTargetHost(e, t, s) {
  if (e === GITHUB_HOST) return { host: e, apiBase: t };
  if (s !== ANY) return { host: e, apiBase: githubApiBase(e) };
  let r = resolveEnterpriseHost(e);
  if ("refusal" in r) throw new m(r.refusal);
  return r;
}
/**
 * 端点是完整 URL 时校验主机与同源，返回目标主机。
 */
//@ chunk-fy5kn7m3.js:32717-33334 placement
function resolveAbsoluteEndpoint(e, t, s) {
  let index = e.indexOf("://");
  if (index === -1) return;
  assertCleanEndpoint(e);
  let search = e.slice(index + 3).search(/[/?#]/),
    a = search === -1 ? e : e.slice(0, index + 3 + search);
  if (!/[/?#]/.test(e.slice(0, index)) && ke(a))
    throw new m(
      "{owner}, {repo} and {branch} are filled in only in the path and query of an endpoint: this one is a URL with a placeholder before its path",
    );
  let parse = URL.parse(e);
  if (!parse) throw new m(ze);
  let h = s !== ANY && s.includes(parse.hostname),
    l =
      parse.protocol === "https:" &&
      parse.hostname !== new URL(t).hostname &&
      !isGithubDotCom(parse.hostname);
  if (l && !h && s !== ANY) throw new m(hostNotServedText(parse.hostname, s));
  let y = resolveTargetHost(h || l ? parse.hostname : GITHUB_HOST, t, s);
  if (!isSameOriginWithoutCredentials(parse, new URL(y.apiBase))) throw new m(restPathOnlyText(y.apiBase));
  return y;
}
//@ chunk-fy5kn7m3.js:33334-33400 placement
function Ve(e) {
  return e !== void 0 && e >= 400 && e < 500 && e !== 408 && e !== 429;
}
//@ chunk-fy5kn7m3.js:33400-33712 placement = ghIsDangerousCallback (0.808)
function ghIsDangerousCallback(_rawCommand, args) {
  assertCleanEndpoint(_rawCommand);
  let s;
  try {
    if (_rawCommand.includes("://")) s = new URL(_rawCommand);
    else {
      let replaced = new URL(args).pathname.replace(/^\/|\/$/g, ""),
        replaced_2 = _rawCommand.replace(/^\//, ""),
        a = replaced !== "" && `${replaced_2.toLowerCase()}/`.startsWith(`${replaced.toLowerCase()}/`);
      s = new URL(a ? replaced_2.slice(replaced.length).replace(/^\//, "") : replaced_2, `${args}/`);
    }
  } catch {
    throw new m(ze);
  }
  return checkSameOriginPath(s, args, restPathOnlyText(args));
}
/**
 * 端点含制表符、换行、控制字符或反斜杠时报错。
 */
//@ chunk-fy5kn7m3.js:33712-33853 placement
function assertCleanEndpoint(e) {
  if (/[\p{Cc}\\]|(?! )\s/u.test(e))
    throw new m("the endpoint contains a tab, a line break, a control character or a backslash");
}
/**
 * 只接受 REST 路径的提示。
 */
//@ chunk-fy5kn7m3.js:33853-33988 placement
function restPathOnlyText(e) {
  return `this gh sends requests to ${e.replace("https://", "")} only; give a REST path such as repos/{owner}/{repo}/pulls`;
}
//@ chunk-fy5kn7m3.js:33988-34774 placement
function checkGhRedirect(e, t, s) {
  let r;
  try {
    r = new URL(e, t);
  } catch {
    throw new m("refusing a redirect whose Location is not a URL");
  }
  let n = r.host === "" || r.host.length > At ? "another host" : `${r.protocol}//${r.host}`,
    a = r.username === "" && r.password === "" ? "" : " with a username or password in its URL",
    d = new URL(s);
  return checkSameOriginPath(
    r,
    s,
    `refusing a redirect to ${n}${a}: this gh sends requests to ${s} only, and running the command again or with other flags will not change that.` +
      (r.hostname !== "" && r.hostname !== d.hostname
        ? " GitHub serves logs, archives, artifacts and release files from other hosts, which this built-in gh does not contact."
        : "") +
      (Pt.test(t.pathname)
        ? " For a failed CI job read repos/{owner}/{repo}/actions/runs/<run-id>/jobs (its steps) and repos/{owner}/{repo}/check-runs/<check-run-id>/annotations."
        : ""),
  );
}
/**
 * 两个 URL 协议与 host 相同且原 URL 不带凭证。
 */
//@ chunk-fy5kn7m3.js:34774-34873 placement = isPermittedRedirect (0.763)
function isSameOriginWithoutCredentials(originalUrl, redirectUrl) {
  return (
    originalUrl.protocol === redirectUrl.protocol &&
    originalUrl.host === redirectUrl.host &&
    originalUrl.username === "" &&
    originalUrl.password === ""
  );
}
/**
 * 校验 URL 与 API 基址同源且路径在其下，去掉 hash。
 */
//@ chunk-fy5kn7m3.js:34873-35099 placement
function checkSameOriginPath(e, t, s) {
  let r = new URL(t);
  if (!isSameOriginWithoutCredentials(e, r)) throw new m(s);
  let n = checkEndpointPath(e.pathname, r.pathname !== "/");
  if (n !== void 0) throw new m(n);
  if (r.pathname !== "/" && !e.pathname.startsWith(`${r.pathname}/`)) throw new m(s);
  return ((e.hash = ""), e);
}
//@ chunk-fy5kn7m3.js:35099-36225 placement
function ghRequestHeaders(e, t) {
  let s = {
    accept: "*/*",
    "x-github-api-version": Ot,
    "content-type": t && "application/json; charset=utf-8",
  };
  for (let r of e) {
    let index = r.indexOf(":");
    if (index === -1) throw new m(`header "${E(r)}" requires a value separated by ':'`);
    let lower = r.slice(0, index).trim().toLowerCase(),
      trimmed = r.slice(index + 1).trim();
    if (!Ie.has(lower))
      throw new m(
        `the ${/^[a-z0-9-]+$/.test(lower) ? `${lower} ` : ""}header cannot be set through this session's GitHub proxy; headers that can: ${[...Ie].join(", ")}`,
      );
    if (/[^\P{Cc}\t]/u.test(trimmed)) throw new m(`the ${lower} header value contains a control character`);
    s[lower] = trimmed;
  }
  return {
    ...s,
    authorization: `token ${PROXY_INJECTED_MARKER}`,
    "user-agent": `claude-code-gh-standin/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}`,
  };
}
/**
 * 读取 --input（文件或标准输入），超过上限时报错。
 */
//@ chunk-fy5kn7m3.js:36225-36646 placement
async function readInputBody(e, t) {
  let s = new m(
    `${e === "-" ? "standard input" : E(e)} is larger than ${GH_API_DEFAULTS / 1048576} MB, the most this gh sends`,
  );
  if (e === "-") {
    let n = [],
      a = 0;
    for await (let d of t.stdin) {
      let buffer = Buffer.from(d);
      if (((a += buffer.length), a > GH_API_DEFAULTS)) throw s;
      n.push(buffer);
    }
    return Buffer.concat(n);
  }
  let r;
  try {
    await using n = await open(e, "r");
    r = await readHandleUpTo(n, GH_API_DEFAULTS + 1);
  } catch (error) {
    throw new m(`could not read ${E(e)} (${getErrnoCode(error) ?? "unreadable"})`);
  }
  if (r.length > GH_API_DEFAULTS) throw s;
  return r;
}
/**
 * 把状态行与响应头格式化为 HTTP/1.1 头文本（--include）。
 */
//@ chunk-fy5kn7m3.js:36646-36955 placement
function formatResponseHead(e) {
  let t = [`HTTP/1.1 ${e.status} ${e.statusText}`.trimEnd()];
  for (let [s, r] of Object.entries(e.headers).sort(([n], [a]) => (n < a ? -1 : n > a ? 1 : 0))) {
    let replaced = s.replace(/(^|-)([a-z])/g, (a, d, h) => `${d}${h.toUpperCase()}`);
    for (let a of Array.isArray(r) ? r : [r]) t.push(`${replaced}: ${String(a)}`);
  }
  return `${t.join(`\r
`)}\r
\r
`;
}
/**
 * 从 GitHub 错误响应体提取 message/errors 文本。
 */
//@ chunk-fy5kn7m3.js:36955-37400 placement
function describeApiError(e, t) {
  let s;
  try {
    s = t.length <= Tt ? jsonParse(t.toString("utf8")) : void 0;
  } catch {
    s = void 0;
  }
  let safeParse = vt().safeParse(s);
  if (!safeParse.success) return `HTTP ${e}`;
  let { message: message, errors: errors } = safeParse.data;
  if (typeof errors === "string" && errors !== "") return message ? `${errors} (${message})` : errors;
  if (message) return `${message} (HTTP ${e})`;
  let d = [];
  for (let h of Array.isArray(errors) ? errors : []) {
    let safeParse = Ct().safeParse(h);
    if (typeof h === "string") d.push(h);
    else if (safeParse.success) d.push(safeParse.data.message);
  }
  return d.length > 0
    ? d.join(`
`)
    : `HTTP ${e}`;
}
//@ chunk-fy5kn7m3.js:37400-38398 placement
function ghProxyRefusalText(e, t) {
  if (e instanceof m || e instanceof x || e instanceof T) return e.message;
  let s = findProxyError(e);
  if (s !== void 0) {
    let connectStatus = s.connectStatus,
      a = describeHttpStatus(connectStatus);
    if (Ve(connectStatus))
      return `this session's GitHub proxy refused the connection (${a}); do not retry unchanged`;
    let d = String(s.headers["retry-after"] ?? ""),
      h = /^\d{1,3}$/.test(d) ? Number(d) : 0,
      l = h > 1 && h <= xt ? `${h} seconds` : "a few seconds";
    return (
      `this session's GitHub proxy could not open the connection (${a}); nothing was sent. This can be temporary: wait ${l} and run the command once more. ` +
      (t === void 0
        ? "If it fails again, stop."
        : `If it fails again, stop and read GET ${t} for the proxy's state.`)
    );
  }
  if (isAxiosError(e) && e.message.includes("maxContentLength"))
    return `the response is larger than ${Xe / 1048576} MB, the most this gh reads; ask for less (per_page, a narrower endpoint)`;
  if (isAxiosError(e) && e.message.includes("maxBodyLength")) return "the request body is too large";
  let r = isAxiosError(e) ? e.code : getErrnoCode(e);
  return `could not reach GitHub through this session's GitHub proxy${r === void 0 ? "" : ` (${r})`}`;
}

export { runBuiltinGhApi, ghProxyRefusalText, We };
