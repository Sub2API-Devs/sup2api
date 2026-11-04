/**
 * services/selfHostedRunner/outcomeBranches.ts
 *
 * 2.1.316 新增：自托管 runner 会话结束后的分支收集：fetch 结果分支、push-on-release
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (13)
 * attribution: placement 13
 */
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import {
  SAFE_GIT_ENV,
  SAFE_GIT_CONFIG_ARGS,
  GIT_WATCHDOG_MS,
} from "../../selfHostedRunner/git/fetchErrors.js";
import { gitConfigPairs } from "../../selfHostedRunner/git/proxyTrust.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { SIGKILL_DELAY_MS, HOOK_WORKDIR_TIMEOUT_MS } from "./launcherHooks.js";
import { ISOLATED_HOME_ENV } from "../../selfHostedRunner/git/repoPrepare.js";
import {
  remoteProxyArgs,
  credentialHelperArgs,
  LFS_NO_LOCKVERIFY_ARGS,
  SHR_GIT_PROXY_TOKEN,
} from "../../selfHostedRunner/git/gitCredentials.js";
import { env } from "../../utils/env.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { withTokenInUrl } from "../../selfHostedRunner/git/repoSources.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { redactToken } from "../../selfHostedRunner/git/tokenRedact.js";
import { beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 5 modules closed by ./launcherHooks.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/services/selfHostedRunner/launcherHooks.js");
//@ chunk-hm0ce8vc.js:204328-205881 placement
async function fetchSourceBranch(
  repoDir,
  branchName,
  onDebug,
  abortSignal,
  isolateMode,
  startPoint,
  spawnImpl = spawn,
  gitEnvironment,
) {
  if (abortSignal?.aborted) return;
  let isolatedEnv = {
    GIT_CONFIG_GLOBAL: "/dev/null",
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
  };
  let baseEnv = {
    ...process.env,
    ...gitEnvironment?.envOverrides,
    ...SAFE_GIT_ENV,
    ...(isolateMode === true ? isolatedEnv : undefined),
  };
  let configArgs = gitConfigPairs(gitEnvironment?.commandScopeEntries ?? []);
  let runGit = (args, label, timeoutMs, extraArgs = [], env = baseEnv) =>
    new Promise((resolve) => {
      let isSettled = false;
      let finish = (outcome) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        abortSignal?.removeEventListener("abort", onAbort);
        resolve(outcome);
      };
      let child = spawnImpl(
        "git",
        [...SAFE_GIT_CONFIG_ARGS, ...extraArgs, ...configArgs, "-C", repoDir, ...args],
        {
          cwd: undefined,
          stdio: ["ignore", "ignore", "pipe"],
          windowsHide: true,
          ...cgroupSpawnOptions("helper"),
          env,
        },
      );
      let stderr = "";
      child.stderr?.on("data", (data) => (stderr += String(data)));
      let onAbort = () => {
        child.kill("SIGKILL");
        finish("unsettled");
      };
      let timer = setTimeout(
        (onDebug, label, dir, child, timeoutMs, finish) => {
          onDebug(
            `[runner:session] ${label} in ${dir} timed out after ${timeoutMs}ms \u2014 continuing on current HEAD`,
          );
          child.kill("SIGKILL");
          finish("unsettled");
        },
        timeoutMs,
        onDebug,
        label,
        repoDir,
        child,
        timeoutMs,
        finish,
      );
      if (abortSignal?.aborted) onAbort();
      else
        abortSignal?.addEventListener("abort", onAbort, {
          once: true,
        });
      child.on("close", (exitCode) => {
        if (exitCode === 0) {
          onDebug(`[runner:session] created outcome branch '${branchName}' in ${repoDir} (${label})`);
          finish("ok");
        } else {
          onDebug(`[runner:session] ${label} in ${repoDir} exited ${exitCode}: ${stderr.trim()}`);
          finish("failed");
        }
      });
      child.on("error", (error) => {
        onDebug(`[runner:session] ${label} spawn failed: ${error} \u2014 continuing on current HEAD`);
        finish("unsettled");
      });
    });
  if (!startPoint) {
    if (
      (await runGit(["switch", "-q", "-C", branchName], `switch -C '${branchName}'`, SIGKILL_DELAY_MS, [
        "-c",
        "alias.switch=",
      ])) !== "failed" ||
      abortSignal?.aborted
    )
      return;
    onDebug(`[runner:session] retrying outcome branch '${branchName}' as checkout -B`);
  }
  if (
    (await runGit(
      ["checkout", "-B", branchName, ...(startPoint ? [startPoint] : [])],
      `checkout -B '${branchName}'`,
      startPoint ? GIT_WATCHDOG_MS : SIGKILL_DELAY_MS,
      [],
      isolateMode === "checkout"
        ? {
            ...baseEnv,
            ...isolatedEnv,
            ...ISOLATED_HOME_ENV,
          }
        : baseEnv,
    )) === "failed"
  )
    onDebug(
      `[runner:session] outcome branch '${branchName}' not created in ${repoDir} \u2014 continuing on current HEAD`,
    );
}
//@ chunk-hm0ce8vc.js:205881-207509 placement
/**
 * 从远端获取会话产出分支（hardenedGitUrl 与 governedAuth 互斥）。
 */
async function fetchOutcomeBranches(
  repoDir,
  branches,
  onDebug,
  abortSignal,
  spawnImpl = spawn,
  allowFileProtocol = false,
  hardenedGitUrl,
  governedAuth,
  gitEnvironment,
) {
  if (hardenedGitUrl && governedAuth)
    throw Error("fetchOutcomeBranches: hardenedGitUrl and governedAuth are mutually exclusive");
  let fetchedCount = 0;
  let url = governedAuth?.url;
  let configArgs = gitConfigPairs(gitEnvironment?.commandScopeEntries ?? []);
  for (let branch of branches) {
    if (abortSignal?.aborted) return;
    let refspec = `+refs/heads/${branch}:refs/remotes/origin/${branch}`;
    if (
      (await new Promise((resolve) => {
        let isSettled = false;
        let finish = (exitCode) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          abortSignal?.removeEventListener("abort", onAbort);
          resolve(exitCode);
        };
        let child = spawnImpl(
          "git",
          [
            "-C",
            repoDir,
            ...SAFE_GIT_CONFIG_ARGS,
            ...(hardenedGitUrl ? remoteProxyArgs(hardenedGitUrl) : []),
            ...(url
              ? [...remoteProxyArgs(url), ...credentialHelperArgs(url), ...LFS_NO_LOCKVERIFY_ARGS]
              : []),
            ...configArgs,
            "-c",
            "http.proxyAuthMethod=basic",
            "fetch",
            "--no-progress",
            "--no-tags",
            "--end-of-options",
            url ?? "origin",
            refspec,
          ],
          {
            stdio: ["ignore", "ignore", "pipe"],
            windowsHide: true,
            ...cgroupSpawnOptions("helper"),
            env: {
              ...process.env,
              ...gitEnvironment?.envOverrides,
              ...SAFE_GIT_ENV,
              ...(hardenedGitUrl || url
                ? {
                    GIT_CONFIG_GLOBAL: "/dev/null",
                  }
                : undefined),
              ...(governedAuth
                ? {
                    [SHR_GIT_PROXY_TOKEN]: governedAuth.getToken(),
                    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
                  }
                : undefined),
              ...(allowFileProtocol && {
                GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
              }),
              GIT_TERMINAL_PROMPT: "0",
              GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
            },
          },
        );
        let stderr = "";
        child.stderr?.on("data", (data) => (stderr += String(data)));
        let onAbort = () => {
          if (child.pid) killProcessGroup(child.pid);
          finish(null);
        };
        abortSignal?.addEventListener("abort", onAbort, {
          once: true,
        });
        let timer = setTimeout(
          (onDebug, dir, child, finish) => {
            onDebug(
              `[runner:session] fetch outcome branch in ${dir} timed out after ${HOOK_WORKDIR_TIMEOUT_MS}ms \u2014 continuing`,
            );
            if (child.pid) killProcessGroup(child.pid);
            finish(null);
          },
          HOOK_WORKDIR_TIMEOUT_MS,
          onDebug,
          repoDir,
          child,
          finish,
        );
        child.on("close", (exitCode) => {
          if (exitCode !== 0)
            onDebug(
              `[runner:session] fetch outcome branch in ${repoDir} exited ${exitCode}: ${stderr.trim()} \u2014 continuing`,
            );
          finish(exitCode);
        });
        child.on("error", (error) => {
          onDebug(`[runner:session] fetch outcome branch spawn failed: ${error} \u2014 continuing`);
          finish(null);
        });
      })) === 0
    )
      fetchedCount++;
  }
  if (branches.length > 0)
    onDebug(`[runner:session] fetched ${fetchedCount}/${branches.length} outcome branch(es) in ${repoDir}`);
}
//@ chunk-hm0ce8vc.js:207509-208603 placement
function buildSslVerifyArgs(source, gitEnvironment) {
  let url = source.url ?? "";
  let token = source.getAuthToken ? source.getAuthToken() : source.token;
  let authURL = source.getAuthToken ? url : withTokenInUrl(url, source.token);
  let urlOrigin;
  try {
    let parsedUrl = new URL(url);
    if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") urlOrigin = parsedUrl.origin;
  } catch {}
  let proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    "";
  let args = [...SAFE_GIT_CONFIG_ARGS];
  if (urlOrigin) {
    args.push("-c", "http.sslVerify=true");
    args.push("-c", `http.${urlOrigin}.sslVerify=true`);
    args.push("-c", `http.${url}.sslVerify=true`);
    if (proxyUrl) {
      args.push("-c", `http.proxy=${proxyUrl}`);
      args.push("-c", `http.${urlOrigin}.proxy=${proxyUrl}`);
      args.push("-c", `http.${url}.proxy=${proxyUrl}`);
    }
    if (token)
      if (source.getAuthToken) args.push(...credentialHelperArgs(url));
      else {
        args.push("-c", "credential.helper=");
        args.push("-c", `credential.${urlOrigin}.helper=`);
      }
  }
  args.push(...gitConfigPairs(gitEnvironment?.commandScopeEntries ?? []));
  return {
    args,
    authURL,
    token,
    env: {
      ...process.env,
      ...gitEnvironment?.envOverrides,
      GIT_TERMINAL_PROMPT: "0",
      ...SAFE_GIT_ENV,
      ...(url.startsWith("file://") && {
        GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
      }),
      GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
      SELF_HOSTED_RUNNER_HOST_CONFIG_DIR: undefined,
      ...(token && {
        GIT_CONFIG_GLOBAL: "/dev/null",
        [SHR_GIT_PROXY_TOKEN]: source.getAuthToken ? token : undefined,
      }),
    },
  };
}
//@ chunk-hm0ce8vc.js:208603-209793 placement
async function resumePushOnRelease(
  canonicalPath,
  branch,
  source,
  timeoutMs,
  onDebug,
  signal,
  gitEnvironment,
) {
  if (signal?.aborted) return false;
  if (!isSafeRefName(branch)) {
    onDebug(
      `[runner:session] push-on-release resume: branch '${branch}' rejected by isSafeRefName (refspec metachar guard); skipping fetch`,
    );
    return false;
  }
  let sslVerifyArgs = buildSslVerifyArgs(source, gitEnvironment);
  return new Promise((resolve) => {
    let settled = false;
    let finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(ok);
    };
    let onAbort = () => {
      child.kill("SIGKILL");
      finish(false);
    };
    let child = spawn(
      "git",
      [
        ...sslVerifyArgs.args,
        "-C",
        canonicalPath,
        "fetch",
        "--no-write-fetch-head",
        sslVerifyArgs.authURL,
        `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        cwd: undefined,
        env: sslVerifyArgs.env,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
      },
    );
    let stderrText = "";
    child.stderr?.on("data", (chunk) => (stderrText += String(chunk)));
    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
    let timer = setTimeout(
      (log, branchName, limitMs, spawned, complete) => {
        log(
          `[runner:session] push-on-release resume: fetch '${branchName}' timed out after ${limitMs}ms; starting from source HEAD (best-effort)`,
        );
        spawned.kill("SIGKILL");
        complete(false);
      },
      timeoutMs,
      onDebug,
      branch,
      timeoutMs,
      child,
      finish,
    );
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        onDebug(
          `[runner:session] push-on-release resume: fetched prior '${branch}' from source remote; starting from preserved work`,
        );
        finish(true);
      } else {
        onDebug(
          `[runner:session] push-on-release resume: no prior '${branch}' on source remote (${redactToken(stderrText, sslVerifyArgs.authURL, sslVerifyArgs.token).trim() || `exit ${exitCode}`}); starting from source HEAD`,
        );
        finish(false);
      }
    });
    child.on("error", () => finish(false));
  });
}
//@ chunk-hm0ce8vc.js:209793-210238 placement
async function revParseVerify(canonicalPath, ref, timeoutMs = SIGKILL_DELAY_MS) {
  return new Promise((resolve) => {
    let settled = false;
    let finish = (sha) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(sha);
    };
    let child = spawn("git", [...SAFE_GIT_CONFIG_ARGS, "-C", canonicalPath, "rev-parse", "--verify", ref], {
      stdio: ["ignore", "pipe", "ignore"],
      cwd: undefined,
      env: {
        ...process.env,
        ...SAFE_GIT_ENV,
      },
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    let stdoutText = "";
    child.stdout?.on("data", (chunk) => (stdoutText += String(chunk)));
    let timer = setTimeout(
      (spawned, complete) => {
        spawned.kill("SIGKILL");
        complete(undefined);
      },
      timeoutMs,
      child,
      finish,
    );
    child.on("close", (exitCode) => finish(exitCode === 0 ? stdoutText.trim() : undefined));
    child.on("error", () => finish(undefined));
  });
}
//@ chunk-hm0ce8vc.js:210238-210291 placement
/**
 * 生成 claude-runner-upstream-<uuid> 形式的上游分支名。
 */
function newRunnerUpstreamName() {
  return `claude-runner-upstream-${randomUUID()}`;
}
//@ chunk-hm0ce8vc.js:210291-210353 placement
/**
 * 判断是否同时有受管挂载与上游地址。
 */
function hasGovernedMountAndUpstream(source) {
  return Boolean(source.governedMount && source.upstreamUrl);
}
//@ chunk-hm0ce8vc.js:210353-212031 placement
/**
 * 会话释放时把分支推送到上游（校验 ref 名安全）。
 */
async function pushOnRelease(canonicalPath, branch, source, timeoutMs, onDebug, gitEnvironment) {
  if (!isSafeRefName(branch)) {
    onDebug(
      `[runner:session] push-on-release '${branch}' rejected by isSafeRefName (refspec metachar guard); skipping (best-effort)`,
    );
    return;
  }
  let mountRouted = hasGovernedMountAndUpstream(source);
  let upstreamName =
    mountRouted && source.governedPushUrl !== undefined ? newRunnerUpstreamName() : undefined;
  let pushSource = mountRouted
    ? {
        ...source,
        url: source.upstreamUrl,
        getAuthToken: undefined,
        governedMount: false,
      }
    : source;
  let sslVerifyArgs = buildSslVerifyArgs(pushSource, gitEnvironment);
  return new Promise((resolve) => {
    let settled = false;
    let finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    let child = spawn(
      "git",
      [
        ...sslVerifyArgs.args,
        "-C",
        canonicalPath,
        ...(upstreamName !== undefined
          ? [
              "-c",
              `remote.${upstreamName}.url=${sslVerifyArgs.authURL}`,
              "-c",
              `remote.${upstreamName}.pushurl=${sslVerifyArgs.authURL}`,
              "push",
              upstreamName,
            ]
          : ["push", sslVerifyArgs.authURL]),
        `refs/heads/${branch}:refs/heads/${branch}`,
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        cwd: undefined,
        env: sslVerifyArgs.env,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
      },
    );
    let stderrText = "";
    child.stderr?.on("data", (chunk) => (stderrText += String(chunk)));
    let timer = setTimeout(
      (log, branchName, repoPath, limitMs, spawned, complete) => {
        log(
          `[runner:session] push-on-release '${branchName}' from ${repoPath} timed out after ${limitMs}ms (best-effort)`,
        );
        spawned.kill("SIGKILL");
        complete();
      },
      timeoutMs,
      onDebug,
      branch,
      canonicalPath,
      timeoutMs,
      child,
      finish,
    );
    child.on("close", (exitCode) => {
      if (exitCode === 0)
        onDebug(`[runner:session] push-on-release pushed '${branch}' to source remote from ${canonicalPath}`);
      else
        onDebug(
          `[runner:session] push-on-release '${branch}' from ${canonicalPath} exited ${exitCode}: ${redactToken(stderrText, sslVerifyArgs.authURL, sslVerifyArgs.token).trim()} (best-effort)` +
            (mountRouted
              ? " \u2014 governed git pushes --push-outcome-on-release branches to the plain " +
                "upstream with customer-managed credentials (this runner-side push does not use the session's git-mount push URL); if this failed with an auth error, provide a git credential for the push target on the runner host or use the post-session hook" +
                (upstreamName !== undefined
                  ? "; git skips every url.*.pushInsteadOf rule for this push (global and system ones too), so the credential must work without one"
                  : "")
              : ""),
        );
      finish();
    });
    child.on("error", (error) => {
      onDebug(`[runner:session] push-on-release '${branch}' spawn failed: ${error} (best-effort)`);
      finish();
    });
  });
}
//@ chunk-hm0ce8vc.js:212031-213081 placement
async function runGitQuiet(
  canonicalPath,
  branch,
  needsDetach,
  onDebug,
  isolateMode,
  spawnFn = spawn,
  timeoutMs = SIGKILL_DELAY_MS,
  gitEnvironment,
) {
  let configArgs = gitConfigPairs(gitEnvironment?.commandScopeEntries ?? []);
  let runGit = (gitArgs, label) =>
    new Promise((resolve) => {
      let settled = false;
      let finish = (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(exitCode);
      };
      let child = spawnFn("git", [...SAFE_GIT_CONFIG_ARGS, ...configArgs, "-C", canonicalPath, ...gitArgs], {
        stdio: ["ignore", "ignore", "pipe"],
        cwd: undefined,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
        env: {
          ...process.env,
          ...gitEnvironment?.envOverrides,
          ...SAFE_GIT_ENV,
          ...(isolateMode
            ? {
                GIT_CONFIG_GLOBAL: "/dev/null",
                CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
              }
            : undefined),
          ...(isolateMode === "checkout" ? ISOLATED_HOME_ENV : undefined),
        },
      });
      let stderrText = "";
      child.stderr?.on("data", (chunk) => (stderrText += String(chunk)));
      let timer = setTimeout(
        (spawned, complete, log, stepLabel, repoPath, limitMs) => {
          log(
            `[runner:session] ${stepLabel} in ${repoPath} timed out after ${limitMs}ms (best-effort cleanup)`,
          );
          spawned.kill("SIGKILL");
          complete(null);
        },
        timeoutMs,
        child,
        finish,
        onDebug,
        label,
        canonicalPath,
        timeoutMs,
      );
      child.on("close", (exitCode) => {
        if (exitCode !== 0)
          onDebug(
            `[runner:session] ${label} in ${canonicalPath} exited ${exitCode}: ${stderrText.trim()} (best-effort cleanup)`,
          );
        finish(exitCode);
      });
      child.on("error", (error) => {
        onDebug(`[runner:session] ${label} spawn failed: ${error} (best-effort cleanup)`);
        finish(null);
      });
    });
  if (needsDetach) await runGit(["checkout", "--detach"], "checkout --detach");
  if ((await runGit(["branch", "-D", "--end-of-options", branch], `branch -D '${branch}'`)) === 0)
    onDebug(`[runner:session] deleted outcome branch '${branch}' from ${canonicalPath}`);
}
//@ chunk-hm0ce8vc.js:213081-213272 placement = ghIsDangerousCallback (0.82)
function getRemoteHostname(url) {
  if (!url.includes("://")) {
    let match = url.match(/^[^@]+@([^:/]+):.+$/);
    return match ? match[1].toLowerCase() : undefined;
  }
  try {
    let lower = new URL(url).hostname.toLowerCase();
    return lower === "" ? undefined : lower;
  } catch {
    return;
  }
}
//@ chunk-hm0ce8vc.js:213272-213454 placement = ghIsDangerousCallback (0.808)
function getRemoteRepoPath(url) {
  if (!url.includes("://")) {
    let match = url.match(/^[^@]+@[^:]+:(.+)$/);
    if (match) return stripGitSuffixAndTrailingSlash(match[1]);
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "";
  }
  let path = parsedUrl.pathname.replace(/^\/+/, "");
  return stripGitSuffixAndTrailingSlash(path);
}
//@ chunk-hm0ce8vc.js:213454-213518 placement
/**
 * 去掉 .git 后缀与结尾斜杠。
 */
function stripGitSuffixAndTrailingSlash(path) {
  return path.replace(/\.git$/, "").replace(/\/+$/, "");
}
//@ chunk-hm0ce8vc.js:213518-213722 placement
function isLocalhostUrl(apiBaseUrl, sessionId) {
  let isLocal = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
  let replaced = apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  let url = `${isLocal ? "http" : "https"}://${replaced}/v1/code/sessions/${sessionId}`;
  return {
    sdkUrl: url,
    resumeUrl: url,
  };
}
export {
  getRemoteHostname,
  fetchOutcomeBranches,
  resumePushOnRelease,
  fetchSourceBranch,
  revParseVerify,
  isLocalhostUrl,
  hasGovernedMountAndUpstream,
  pushOnRelease,
  runGitQuiet,
  getRemoteRepoPath,
};
