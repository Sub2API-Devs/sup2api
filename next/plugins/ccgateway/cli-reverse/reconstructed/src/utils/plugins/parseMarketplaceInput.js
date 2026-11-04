/**
 * utils/plugins/parseMarketplaceInput.ts
 *
 * 解析 marketplace add 的输入（SSH/HTTPS git URL、owner/repo#ref、JSON URL、本地路径、npm 包）为市场来源对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/parseMarketplaceInput.ts
 * pieces: chunk-dcmhvw5a.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { resolve } from "path";
import { homedir } from "os";
import {
  getFsImplementation,
  findIntermediateUncJunctionAsync,
  vouchedLaunchAncestry,
  UNVERIFIED_ANCESTRY,
} from "../fsOperations.js";
import { isGithubDotCom, hasBackslashInUrlAuthority, isUnsafeRemoteUrl } from "../git/githubUrl.js";
import { isGitlabHost, GIT_URL_PROTOCOLS, SSH_URL_PROTOCOLS, isGithubOrSshGithubHost } from "./schemas.js";
import { isDeviceNamespacePath } from "../pathClassification.js";
import { isUnderNetworkDirCached } from "../networkPaths.js";
import { launchCwd } from "../cwd.js";
import { getErrnoCode } from "../errors.js";
import { isSuspiciousUrl } from "../fsBoundRead.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:72144-72261 placement
var GITHUB_REPO_SLUG_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MARKETPLACE_INPUT_ERRNOS;
deferInit("chunk-dcmhvw5a.js:72144", () => {
  GITHUB_REPO_SLUG_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
  MARKETPLACE_INPUT_ERRNOS = new Set(["ENOTDIR", "ENAMETOOLONG", "ELOOP"]);
});
//@ chunk-dcmhvw5a.js:72261-75406 fingerprint (2.1.88 match: parseMarketplaceInput, 0.677)
/**
 * 解析 /plugin marketplace add 的输入：git@ SSH URL（可带 #ref）、https URL（.git 视为 git，.json 视为 url，github.com 转 github）、owner/repo[#ref]、本地路径（目录或 .json 文件）、npm 包等，返回市场来源对象或错误。
 */
async function parseMarketplaceInput(input) {
  let trimmed = input.trim();
  let fs = getFsImplementation();
  let sshMatch = trimmed.match(/^([a-zA-Z0-9._-]+@[^:]+:.+?(?:\.git)?)(#(.+))?$/);
  if (sshMatch?.[1]) {
    let url = sshMatch[1];
    let ref = sshMatch[3];
    return ref
      ? {
          source: "git",
          url,
          ref,
        }
      : {
          source: "git",
          url,
        };
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    let fragmentMatch = trimmed.match(/^([^#]+)(#(.+))?$/);
    let url = fragmentMatch?.[1] || trimmed;
    let ref = fragmentMatch?.[3];
    if (url.endsWith(".git") || url.includes("/_git/"))
      return ref
        ? {
            source: "git",
            url,
            ref,
          }
        : {
            source: "git",
            url,
          };
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_err) {
      return {
        source: "url",
        url,
      };
    }
    if (isGithubDotCom(parsed.hostname)) {
      if (parsed.pathname.match(/^\/([^/]+\/[^/]+?)(\/|\.git|$)/)?.[1] && !hasBackslashInUrlAuthority(url)) {
        let replaced = url.replace(/(?:[/?#]|%2[Ff]|%3[Ff]|%23)+$/, "");
        let index = replaced.indexOf("/", replaced.indexOf("://") + 3);
        let pathPart = index === -1 ? "" : replaced.slice(index);
        if (/^\/[^/]+\/[^/]+/.test(pathPart)) {
          let url = replaced.endsWith(".git") ? replaced : `${replaced}.git`;
          return ref
            ? {
                source: "git",
                url,
                ref,
              }
            : {
                source: "git",
                url,
              };
        }
      }
    }
    if (isGitlabHost(parsed.hostname)) {
      let filtered = parsed.pathname.split("/").filter(Boolean);
      let index = url.indexOf("/", url.indexOf("://") + 3);
      let pathSuffix = index === -1 ? "" : url.slice(index).replace(/\/+$/, "");
      let mapped = filtered.map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return null;
        }
      });
      if (
        filtered.length >= 2 &&
        pathSuffix === `/${filtered.join("/")}` &&
        !/[\t\n\r]/.test(url) &&
        !hasBackslashInUrlAuthority(url) &&
        mapped.every((decoded) => decoded !== null) &&
        mapped[0] !== "api" &&
        !mapped.includes("-")
      ) {
        let replaced = url.replace(/\/+$/, "");
        let url_2 = replaced.endsWith(".git") ? replaced : `${replaced}.git`;
        return ref
          ? {
              source: "git",
              url: url_2,
              ref,
            }
          : {
              source: "git",
              url: url_2,
            };
      }
    }
    return {
      source: "url",
      url,
    };
  }
  let isWindowsAbsPath = false;
  if (
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("~") ||
    isWindowsAbsPath
  ) {
    let resolvedPath = resolve(trimmed.startsWith("~") ? trimmed.replace(/^~/, () => homedir()) : trimmed);
    if (isDeviceNamespacePath(resolvedPath))
      return {
        error: `${resolvedPath} is a device-namespace path, which can't be checked for links to a network location. Give it without the \\\\?\\ or \\\\.\\ prefix.`,
      };
    if (!isUnderNetworkDirCached(resolvedPath)) {
      let cwd = launchCwd();
      let intermediateUncJunction = await findIntermediateUncJunctionAsync(fs, resolvedPath, {
        anchors: cwd === null ? [resolvedPath] : [cwd, resolvedPath],
        launchAncestry: vouchedLaunchAncestry(fs),
        surfaceNetworkRaw: true,
        unreadableAncestry: "unverified",
      });
      if (intermediateUncJunction !== undefined)
        return {
          unreadable: true,
          error:
            intermediateUncJunction === UNVERIFIED_ANCESTRY
              ? `Can't check ${resolvedPath} for links to a network location: a folder or link along it can't be examined. Use a directory whose folders can be read, or owner/repo or an https:// URL.`
              : `${resolvedPath} passes through a link to a network location, or to a link target that can't be checked, so it was not read. Give the link's target itself, or use a local directory, owner/repo or an https:// URL.`,
        };
    }
    let stats;
    try {
      stats = await fs.stat(resolvedPath);
    } catch (e) {
      let code = getErrnoCode(e);
      if (code === "ENOENT")
        return {
          error: `Path does not exist: ${resolvedPath}`,
        };
      return {
        ...(!MARKETPLACE_INPUT_ERRNOS.has(code ?? "") && {
          unreadable: true,
        }),
        error: `Cannot access path: ${resolvedPath} (${code ?? e})`,
      };
    }
    if (stats.isFile()) {
      if (resolvedPath.endsWith(".json"))
        return {
          source: "file",
          path: resolvedPath,
        };
      else
        return {
          error: `File path must point to a .json file (marketplace.json), but got: ${resolvedPath}`,
        };
    } else if (stats.isDirectory())
      return {
        source: "directory",
        path: resolvedPath,
      };
    else
      return {
        error: `Path is neither a file nor a directory: ${resolvedPath}`,
      };
  }
  if (trimmed.includes("/") && !trimmed.startsWith("@")) {
    if (trimmed.includes(":")) return null;
    let fragmentMatch = trimmed.match(/^([^#@]+)(?:[#@](.+))?$/);
    let repo = fragmentMatch?.[1] || trimmed;
    let ref = fragmentMatch?.[2];
    if (!GITHUB_REPO_SLUG_RE.test(repo))
      return {
        error: `'${trimmed}' is not a valid GitHub owner/repo shorthand. For a git repo, use the full https:// clone URL from your host (typically ending in .git \u2014 some hosts like Azure DevOps omit it). For a hosted marketplace.json, use its https:// URL. For a local path, use ./ or an absolute path.`,
      };
    return ref
      ? {
          source: "github",
          repo,
          ref,
        }
      : {
          source: "github",
          repo,
        };
  }
  return null;
}
//@ chunk-dcmhvw5a.js:75406-75983 placement
/**
 * 把 GitHub 仓库引用（https/ssh URL、git@host:owner/repo、owner/repo）规范成小写 `owner/repo`；非 GitHub 主机、带非法路径段或解析失败返回 null。
 */
function normalizeGithubRepoSlug(input) {
  if (isUnsafeRemoteUrl(input) || isSuspiciousUrl(input)) return null;
  let repoPath = input;
  let index = input.indexOf("://");
  if (index !== -1) {
    let parsedUrl;
    try {
      parsedUrl = new URL(input);
    } catch {
      parsedUrl = null;
    }
    let firstPathIndex = input.slice(index + 3).search(/[/?#]/) + index + 3;
    if (
      parsedUrl === null ||
      !GIT_URL_PROTOCOLS.has(parsedUrl.protocol) ||
      !(SSH_URL_PROTOCOLS.has(parsedUrl.protocol)
        ? isGithubOrSshGithubHost(parsedUrl.hostname)
        : isGithubDotCom(parsedUrl.hostname)) ||
      input[firstPathIndex] !== "/"
    )
      return null;
    repoPath = input.slice(firstPathIndex + 1).split(/[?#]/)[0] ?? "";
  } else if (input.includes(":")) {
    let index = input.indexOf(":");
    if (
      input.slice(0, index).includes("/") ||
      !isGithubOrSshGithubHost(input.slice(input.indexOf("@") + 1, index))
    )
      return null;
    repoPath = input.slice(index + 1).replace(/^\//, "");
  }
  let replaced = repoPath.replace(/\/$/, "").replace(/\.git$/i, "");
  if (!GITHUB_REPO_SLUG_RE.test(replaced) || /\/\.\.?$/.test(replaced)) return null;
  return replaced.toLowerCase();
}
export { GITHUB_REPO_SLUG_RE, normalizeGithubRepoSlug, parseMarketplaceInput };
