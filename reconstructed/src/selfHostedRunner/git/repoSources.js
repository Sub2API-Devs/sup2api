/**
 * selfHostedRunner/git/repoSources.ts
 *
 * BYOC 仓库来源 URL 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (6)
 * attribution: placement 6
 */
import { basename, join } from "path";

//@ chunk-t3sg9e26.js:32452-32615 placement
/**
 * 判断字符串是否是 git 远程地址（http(s)://、ssh:// 或 user@host: 形式）。
 */
function isGitRemoteUrl(url) {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("ssh://") ||
    (!url.includes("://") && /^[A-Za-z0-9][A-Za-z0-9._-]*@[^:]+:/.test(url))
  );
}
//@ chunk-t3sg9e26.js:32615-33106 placement
/**
 * 创建一个超时或外部信号中止时都会中止的 AbortSignal，返回 {signal, dispose}（可用于 using），dispose 清定时器并解除外部监听。
 */
function createTimeoutSignal(signal, n) {
  let abortController = new AbortController();
  let timer = setTimeout((a) => a.abort(), n, abortController);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  let s;
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      abortController.abort();
      let a = () => {};
      return {
        signal: abortController.signal,
        dispose: a,
        [Symbol.dispose]: a,
      };
    }
    s = () => {
      clearTimeout(timer);
      abortController.abort();
    };
    signal.addEventListener("abort", s, {
      once: true,
    });
  }
  abortController.signal.addEventListener("abort", () => clearTimeout(timer));
  let o = () => {
    clearTimeout(timer);
    if (signal && s) signal.removeEventListener("abort", s);
  };
  return {
    signal: abortController.signal,
    dispose: o,
    [Symbol.dispose]: o,
  };
}
//@ chunk-t3sg9e26.js:33106-33562 placement
function resolveRepositoryUrl(source) {
  if (source.url) {
    if (!isGitRemoteUrl(source.url))
      throw Error(`Unsupported git URL protocol (only https/http/ssh/user@host:path allowed): ${source.url}`);
    return source.url;
  }
  switch (source.type) {
    case "github":
      return `https://github.com/${source.repo}`;
    case "github-ssh":
      throw Error(
        `github-ssh source for '${source.repo}' is missing url \u2014 SSH URLs are not synthesizable from slug alone`,
      );
    case "test-file":
      return `file://${source.repo}`;
    default:
      throw Error(`Unsupported git source type: ${source.type}`);
  }
}
//@ chunk-t3sg9e26.js:33562-33827 placement
/**
 * 把访问令牌写入 HTTPS 仓库地址（ccsr 令牌作为密码，其他作为用户名），SSH 地址与非 HTTPS 保持原样。
 */
function withTokenInUrl(e, token) {
  if (!token) return e;
  if (e.startsWith("git@") || e.startsWith("ssh://")) return e;
  let t;
  try {
    t = new URL(e);
  } catch {
    return e;
  }
  if (t.protocol !== "https:") return e;
  if (token.startsWith("sk-ant-ccsr-")) {
    t.username = "unused";
    t.password = token;
  } else t.username = token;
  return t.toString();
}
//@ chunk-t3sg9e26.js:33827-34070 placement
/**
 * 计算仓库在工作目录下的检出路径（test-file 类型取 basename），含 ./.. 段时返回空串。
 */
function repoCheckoutDir(e, n) {
  if (n.type === "test-file") {
    let r = basename(n.repo);
    if (!r || r === "." || r === "..") return "";
    return join(e, r);
  }
  let filtered = n.repo.split("/").filter((r) => r.length > 0);
  if (filtered.length === 0) return "";
  for (let r of filtered) if (r === "." || r === "..") return "";
  return join(e, ...filtered);
}
//@ chunk-t3sg9e26.js:34070-34198 placement
/**
 * 把仓库路径转成目录名片段（各段以 - 连接），含 ./.. 段时返回空串。
 */
function repoDirSlug(e) {
  let filtered = e.repo.split("/").filter((t) => t.length > 0);
  for (let t of filtered) if (t === "." || t === "..") return "";
  return filtered.join("-");
}
export {
  isGitRemoteUrl,
  repoCheckoutDir,
  repoDirSlug,
  withTokenInUrl,
  resolveRepositoryUrl,
  createTimeoutSignal,
};
