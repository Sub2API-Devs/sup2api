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

/**
 * 判断字符串是否是 git 远程地址（http(s)://、ssh:// 或 user@host: 形式）。
 */
//@ chunk-t3sg9e26.js:32452-32615 placement
function isGitRemoteUrl(e) {
  return (
    e.startsWith("https://") ||
    e.startsWith("http://") ||
    e.startsWith("ssh://") ||
    (!e.includes("://") && /^[A-Za-z0-9][A-Za-z0-9._-]*@[^:]+:/.test(e))
  );
}
/**
 * 创建一个超时或外部信号中止时都会中止的 AbortSignal，返回 {signal, dispose}（可用于 using），dispose 清定时器并解除外部监听。
 */
//@ chunk-t3sg9e26.js:32615-33106 placement
function createTimeoutSignal(e, n) {
  let abortController = new AbortController(),
    r = setTimeout((a) => a.abort(), n, abortController);
  if (typeof r === "object" && "unref" in r) r.unref();
  let s;
  if (e) {
    if (e.aborted) {
      (clearTimeout(r), abortController.abort());
      let a = () => {};
      return { signal: abortController.signal, dispose: a, [Symbol.dispose]: a };
    }
    ((s = () => {
      (clearTimeout(r), abortController.abort());
    }),
      e.addEventListener("abort", s, { once: !0 }));
  }
  abortController.signal.addEventListener("abort", () => clearTimeout(r));
  let o = () => {
    if ((clearTimeout(r), e && s)) e.removeEventListener("abort", s);
  };
  return { signal: abortController.signal, dispose: o, [Symbol.dispose]: o };
}
//@ chunk-t3sg9e26.js:33106-33562 placement
function resolveRepositoryUrl(e) {
  if (e.url) {
    if (!isGitRemoteUrl(e.url))
      throw Error(`Unsupported git URL protocol (only https/http/ssh/user@host:path allowed): ${e.url}`);
    return e.url;
  }
  switch (e.type) {
    case "github":
      return `https://github.com/${e.repo}`;
    case "github-ssh":
      throw Error(
        `github-ssh source for '${e.repo}' is missing url \u2014 SSH URLs are not synthesizable from slug alone`,
      );
    case "test-file":
      return `file://${e.repo}`;
    default:
      throw Error(`Unsupported git source type: ${e.type}`);
  }
}
/**
 * 把访问令牌写入 HTTPS 仓库地址（ccsr 令牌作为密码，其他作为用户名），SSH 地址与非 HTTPS 保持原样。
 */
//@ chunk-t3sg9e26.js:33562-33827 placement
function withTokenInUrl(e, n) {
  if (!n) return e;
  if (e.startsWith("git@") || e.startsWith("ssh://")) return e;
  let t;
  try {
    t = new URL(e);
  } catch {
    return e;
  }
  if (t.protocol !== "https:") return e;
  if (n.startsWith("sk-ant-ccsr-")) ((t.username = "unused"), (t.password = n));
  else t.username = n;
  return t.toString();
}
/**
 * 计算仓库在工作目录下的检出路径（test-file 类型取 basename），含 ./.. 段时返回空串。
 */
//@ chunk-t3sg9e26.js:33827-34070 placement
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
/**
 * 把仓库路径转成目录名片段（各段以 - 连接），含 ./.. 段时返回空串。
 */
//@ chunk-t3sg9e26.js:34070-34198 placement
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
