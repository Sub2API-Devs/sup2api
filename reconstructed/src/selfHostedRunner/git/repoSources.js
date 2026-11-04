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
function isGitRemoteUrl(remoteUrl) {
  return (
    remoteUrl.startsWith("https://") ||
    remoteUrl.startsWith("http://") ||
    remoteUrl.startsWith("ssh://") ||
    (!remoteUrl.includes("://") && /^[A-Za-z0-9][A-Za-z0-9._-]*@[^:]+:/.test(remoteUrl))
  );
}
//@ chunk-t3sg9e26.js:32615-33106 placement
/**
 * 创建一个超时或外部信号中止时都会中止的 AbortSignal，返回 {signal, dispose}（可用于 using），dispose 清定时器并解除外部监听。
 */
function createTimeoutSignal(signal, ms) {
  let abortController = new AbortController();
  let timer = setTimeout((controller) => controller.abort(), ms, abortController);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  let onAbort;
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      abortController.abort();
      let noop = () => {};
      return {
        signal: abortController.signal,
        dispose: noop,
        [Symbol.dispose]: noop,
      };
    }
    onAbort = () => {
      clearTimeout(timer);
      abortController.abort();
    };
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  }
  abortController.signal.addEventListener("abort", () => clearTimeout(timer));
  let dispose = () => {
    clearTimeout(timer);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  };
  return {
    signal: abortController.signal,
    dispose,
    [Symbol.dispose]: dispose,
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
function withTokenInUrl(url, token) {
  if (!token) return url;
  if (url.startsWith("git@") || url.startsWith("ssh://")) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:") return url;
  if (token.startsWith("sk-ant-ccsr-")) {
    parsed.username = "unused";
    parsed.password = token;
  } else parsed.username = token;
  return parsed.toString();
}
//@ chunk-t3sg9e26.js:33827-34070 placement
/**
 * 计算仓库在工作目录下的检出路径（test-file 类型取 basename），含 ./.. 段时返回空串。
 */
function repoCheckoutDir(baseDir, source) {
  if (source.type === "test-file") {
    let dirName = basename(source.repo);
    if (!dirName || dirName === "." || dirName === "..") return "";
    return join(baseDir, dirName);
  }
  let filtered = source.repo.split("/").filter((part) => part.length > 0);
  if (filtered.length === 0) return "";
  for (let part of filtered) if (part === "." || part === "..") return "";
  return join(baseDir, ...filtered);
}
//@ chunk-t3sg9e26.js:34070-34198 placement
/**
 * 把仓库路径转成目录名片段（各段以 - 连接），含 ./.. 段时返回空串。
 */
function repoDirSlug(source) {
  let filtered = source.repo.split("/").filter((part) => part.length > 0);
  for (let part of filtered) if (part === "." || part === "..") return "";
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
