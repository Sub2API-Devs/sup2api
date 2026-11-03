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

//@ chunk-hm0ce8vc.js:204328-205881 placement
async function fetchSourceBranch(e, n, onDebug, s, a, o, l = spawn, gitEnvironment) {
  if (s?.aborted) return;
  let h = {
    GIT_CONFIG_GLOBAL: "/dev/null",
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
  };
  let p = {
    ...process.env,
    ...gitEnvironment?.envOverrides,
    ...SAFE_GIT_ENV,
    ...(a === true ? h : undefined),
  };
  let S = gitConfigPairs(gitEnvironment?.commandScopeEntries ?? []);
  let T = (v, w, E, A = [], env = p) =>
    new Promise((resolve) => {
      let L = false;
      let D = (Te) => {
        if (L) return;
        L = true;
        clearTimeout(timer);
        s?.removeEventListener("abort", Ne);
        resolve(Te);
      };
      let oe = l("git", [...SAFE_GIT_CONFIG_ARGS, ...A, ...S, "-C", e, ...v], {
        cwd: undefined,
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
        env,
      });
      let ge = "";
      oe.stderr?.on("data", (Te) => (ge += String(Te)));
      let Ne = () => {
        oe.kill("SIGKILL");
        D("unsettled");
      };
      let timer = setTimeout(
        (Te, Ye, He, ae, fe, $e) => {
          Te(`[runner:session] ${Ye} in ${He} timed out after ${fe}ms \u2014 continuing on current HEAD`);
          ae.kill("SIGKILL");
          $e("unsettled");
        },
        E,
        onDebug,
        w,
        e,
        oe,
        E,
        D,
      );
      if (s?.aborted) Ne();
      else
        s?.addEventListener("abort", Ne, {
          once: true,
        });
      oe.on("close", (Te) => {
        if (Te === 0) {
          onDebug(`[runner:session] created outcome branch '${n}' in ${e} (${w})`);
          D("ok");
        } else {
          onDebug(`[runner:session] ${w} in ${e} exited ${Te}: ${ge.trim()}`);
          D("failed");
        }
      });
      oe.on("error", (Te) => {
        onDebug(`[runner:session] ${w} spawn failed: ${Te} \u2014 continuing on current HEAD`);
        D("unsettled");
      });
    });
  if (!o) {
    if (
      (await T(["switch", "-q", "-C", n], `switch -C '${n}'`, SIGKILL_DELAY_MS, ["-c", "alias.switch="])) !==
        "failed" ||
      s?.aborted
    )
      return;
    onDebug(`[runner:session] retrying outcome branch '${n}' as checkout -B`);
  }
  if (
    (await T(
      ["checkout", "-B", n, ...(o ? [o] : [])],
      `checkout -B '${n}'`,
      o ? GIT_WATCHDOG_MS : SIGKILL_DELAY_MS,
      [],
      a === "checkout"
        ? {
            ...p,
            ...h,
            ...ISOLATED_HOME_ENV,
          }
        : p,
    )) === "failed"
  )
    onDebug(`[runner:session] outcome branch '${n}' not created in ${e} \u2014 continuing on current HEAD`);
}
//@ chunk-hm0ce8vc.js:205881-207509 placement
/**
 * 从远端获取会话产出分支（hardenedGitUrl 与 governedAuth 互斥）。
 */
async function fetchOutcomeBranches(e, n, onDebug, s, a = spawn, o = false, l, u, h) {
  if (l && u) throw Error("fetchOutcomeBranches: hardenedGitUrl and governedAuth are mutually exclusive");
  let p = 0;
  let url = u?.url;
  let T = gitConfigPairs(h?.commandScopeEntries ?? []);
  for (let y of n) {
    if (s?.aborted) return;
    let v = `+refs/heads/${y}:refs/remotes/origin/${y}`;
    if (
      (await new Promise((resolve) => {
        let A = false;
        let G = (ge) => {
          if (A) return;
          A = true;
          clearTimeout(timer);
          s?.removeEventListener("abort", D);
          resolve(ge);
        };
        let K = a(
          "git",
          [
            "-C",
            e,
            ...SAFE_GIT_CONFIG_ARGS,
            ...(l ? remoteProxyArgs(l) : []),
            ...(url
              ? [...remoteProxyArgs(url), ...credentialHelperArgs(url), ...LFS_NO_LOCKVERIFY_ARGS]
              : []),
            ...T,
            "-c",
            "http.proxyAuthMethod=basic",
            "fetch",
            "--no-progress",
            "--no-tags",
            "--end-of-options",
            url ?? "origin",
            v,
          ],
          {
            stdio: ["ignore", "ignore", "pipe"],
            windowsHide: true,
            ...cgroupSpawnOptions("helper"),
            env: {
              ...process.env,
              ...h?.envOverrides,
              ...SAFE_GIT_ENV,
              ...(l || url
                ? {
                    GIT_CONFIG_GLOBAL: "/dev/null",
                  }
                : undefined),
              ...(u
                ? {
                    [SHR_GIT_PROXY_TOKEN]: u.getToken(),
                    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
                  }
                : undefined),
              ...(o && {
                GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
              }),
              GIT_TERMINAL_PROMPT: "0",
              GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
            },
          },
        );
        let L = "";
        K.stderr?.on("data", (ge) => (L += String(ge)));
        let D = () => {
          if (K.pid) killProcessGroup(K.pid);
          G(null);
        };
        s?.addEventListener("abort", D, {
          once: true,
        });
        let timer = setTimeout(
          (ge, Ne, me, Te) => {
            ge(
              `[runner:session] fetch outcome branch in ${Ne} timed out after ${HOOK_WORKDIR_TIMEOUT_MS}ms \u2014 continuing`,
            );
            if (me.pid) killProcessGroup(me.pid);
            Te(null);
          },
          HOOK_WORKDIR_TIMEOUT_MS,
          onDebug,
          e,
          K,
          G,
        );
        K.on("close", (ge) => {
          if (ge !== 0)
            onDebug(
              `[runner:session] fetch outcome branch in ${e} exited ${ge}: ${L.trim()} \u2014 continuing`,
            );
          G(ge);
        });
        K.on("error", (ge) => {
          onDebug(`[runner:session] fetch outcome branch spawn failed: ${ge} \u2014 continuing`);
          G(null);
        });
      })) === 0
    )
      p++;
  }
  if (n.length > 0) onDebug(`[runner:session] fetched ${p}/${n.length} outcome branch(es) in ${e}`);
}
//@ chunk-hm0ce8vc.js:207509-208603 placement
function buildSslVerifyArgs(e, n) {
  let url = e.url ?? "";
  let s = e.getAuthToken ? e.getAuthToken() : e.token;
  let authURL = e.getAuthToken ? url : withTokenInUrl(url, e.token);
  let o;
  try {
    let h = new URL(url);
    if (h.protocol === "https:" || h.protocol === "http:") o = h.origin;
  } catch {}
  let l =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    "";
  let u = [...SAFE_GIT_CONFIG_ARGS];
  if (o) {
    u.push("-c", "http.sslVerify=true");
    u.push("-c", `http.${o}.sslVerify=true`);
    u.push("-c", `http.${url}.sslVerify=true`);
    if (l) {
      u.push("-c", `http.proxy=${l}`);
      u.push("-c", `http.${o}.proxy=${l}`);
      u.push("-c", `http.${url}.proxy=${l}`);
    }
    if (s)
      if (e.getAuthToken) u.push(...credentialHelperArgs(url));
      else {
        u.push("-c", "credential.helper=");
        u.push("-c", `credential.${o}.helper=`);
      }
  }
  u.push(...gitConfigPairs(n?.commandScopeEntries ?? []));
  return {
    args: u,
    authURL,
    token: s,
    env: {
      ...process.env,
      ...n?.envOverrides,
      GIT_TERMINAL_PROMPT: "0",
      ...SAFE_GIT_ENV,
      ...(url.startsWith("file://") && {
        GIT_ALLOW_PROTOCOL: `file:${SAFE_GIT_ENV.GIT_ALLOW_PROTOCOL}`,
      }),
      GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
      SELF_HOSTED_RUNNER_HOST_CONFIG_DIR: undefined,
      ...(s && {
        GIT_CONFIG_GLOBAL: "/dev/null",
        [SHR_GIT_PROXY_TOKEN]: e.getAuthToken ? s : undefined,
      }),
    },
  };
}
//@ chunk-hm0ce8vc.js:208603-209793 placement
async function resumePushOnRelease(e, n, r, s, onDebug, o, gitEnvironment) {
  if (o?.aborted) return false;
  if (!isSafeRefName(n)) {
    onDebug(
      `[runner:session] push-on-release resume: branch '${n}' rejected by isSafeRefName (refspec metachar guard); skipping fetch`,
    );
    return false;
  }
  let sslVerifyArgs = buildSslVerifyArgs(r, gitEnvironment);
  return new Promise((resolve) => {
    let p = false;
    let S = (E) => {
      if (p) return;
      p = true;
      clearTimeout(timer);
      o?.removeEventListener("abort", T);
      resolve(E);
    };
    let T = () => {
      y.kill("SIGKILL");
      S(false);
    };
    let y = spawn(
      "git",
      [
        ...sslVerifyArgs.args,
        "-C",
        e,
        "fetch",
        "--no-write-fetch-head",
        sslVerifyArgs.authURL,
        `+refs/heads/${n}:refs/remotes/origin/${n}`,
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        cwd: undefined,
        env: sslVerifyArgs.env,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
      },
    );
    let v = "";
    y.stderr?.on("data", (E) => (v += String(E)));
    o?.addEventListener("abort", T, {
      once: true,
    });
    let timer = setTimeout(
      (E, A, G, K, L) => {
        E(
          `[runner:session] push-on-release resume: fetch '${A}' timed out after ${G}ms; starting from source HEAD (best-effort)`,
        );
        K.kill("SIGKILL");
        L(false);
      },
      s,
      onDebug,
      n,
      s,
      y,
      S,
    );
    y.on("close", (E) => {
      if (E === 0) {
        onDebug(
          `[runner:session] push-on-release resume: fetched prior '${n}' from source remote; starting from preserved work`,
        );
        S(true);
      } else {
        onDebug(
          `[runner:session] push-on-release resume: no prior '${n}' on source remote (${redactToken(v, sslVerifyArgs.authURL, sslVerifyArgs.token).trim() || `exit ${E}`}); starting from source HEAD`,
        );
        S(false);
      }
    });
    y.on("error", () => S(false));
  });
}
//@ chunk-hm0ce8vc.js:209793-210238 placement
async function revParseVerify(e, n, r = SIGKILL_DELAY_MS) {
  return new Promise((resolve) => {
    let a = false;
    let o = (p) => {
      if (a) return;
      a = true;
      clearTimeout(timer);
      resolve(p);
    };
    let l = spawn("git", [...SAFE_GIT_CONFIG_ARGS, "-C", e, "rev-parse", "--verify", n], {
      stdio: ["ignore", "pipe", "ignore"],
      cwd: undefined,
      env: {
        ...process.env,
        ...SAFE_GIT_ENV,
      },
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
    });
    let u = "";
    l.stdout?.on("data", (p) => (u += String(p)));
    let timer = setTimeout(
      (p, S) => {
        p.kill("SIGKILL");
        S(undefined);
      },
      r,
      l,
      o,
    );
    l.on("close", (p) => o(p === 0 ? u.trim() : undefined));
    l.on("error", () => o(undefined));
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
function hasGovernedMountAndUpstream(e) {
  return Boolean(e.governedMount && e.upstreamUrl);
}
//@ chunk-hm0ce8vc.js:210353-212031 placement
/**
 * 会话释放时把分支推送到上游（校验 ref 名安全）。
 */
async function pushOnRelease(canonicalPath, branch, source, s, onDebug, o) {
  if (!isSafeRefName(branch)) {
    onDebug(
      `[runner:session] push-on-release '${branch}' rejected by isSafeRefName (refspec metachar guard); skipping (best-effort)`,
    );
    return;
  }
  let l = hasGovernedMountAndUpstream(source);
  let u = l && source.governedPushUrl !== undefined ? newRunnerUpstreamName() : undefined;
  let h = l
    ? {
        ...source,
        url: source.upstreamUrl,
        getAuthToken: undefined,
        governedMount: false,
      }
    : source;
  let sslVerifyArgs = buildSslVerifyArgs(h, o);
  return new Promise((resolve) => {
    let T = false;
    let y = () => {
      if (T) return;
      T = true;
      clearTimeout(timer);
      resolve();
    };
    let v = spawn(
      "git",
      [
        ...sslVerifyArgs.args,
        "-C",
        canonicalPath,
        ...(u !== undefined
          ? [
              "-c",
              `remote.${u}.url=${sslVerifyArgs.authURL}`,
              "-c",
              `remote.${u}.pushurl=${sslVerifyArgs.authURL}`,
              "push",
              u,
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
    let w = "";
    v.stderr?.on("data", (A) => (w += String(A)));
    let timer = setTimeout(
      (A, G, K, L, D, oe) => {
        A(`[runner:session] push-on-release '${G}' from ${K} timed out after ${L}ms (best-effort)`);
        D.kill("SIGKILL");
        oe();
      },
      s,
      onDebug,
      branch,
      canonicalPath,
      s,
      v,
      y,
    );
    v.on("close", (A) => {
      if (A === 0)
        onDebug(`[runner:session] push-on-release pushed '${branch}' to source remote from ${canonicalPath}`);
      else
        onDebug(
          `[runner:session] push-on-release '${branch}' from ${canonicalPath} exited ${A}: ${redactToken(w, sslVerifyArgs.authURL, sslVerifyArgs.token).trim()} (best-effort)` +
            (l
              ? " \u2014 governed git pushes --push-outcome-on-release branches to the plain " +
                "upstream with customer-managed credentials (this runner-side push does not use the session's git-mount push URL); if this failed with an auth error, provide a git credential for the push target on the runner host or use the post-session hook" +
                (u !== undefined
                  ? "; git skips every url.*.pushInsteadOf rule for this push (global and system ones too), so the credential must work without one"
                  : "")
              : ""),
        );
      y();
    });
    v.on("error", (A) => {
      onDebug(`[runner:session] push-on-release '${branch}' spawn failed: ${A} (best-effort)`);
      y();
    });
  });
}
//@ chunk-hm0ce8vc.js:212031-213081 placement
async function runGitQuiet(
  canonicalPath,
  branch,
  needsDetach,
  onDebug,
  a,
  o = spawn,
  l = SIGKILL_DELAY_MS,
  u,
) {
  let h = gitConfigPairs(u?.commandScopeEntries ?? []);
  let p = (T, y) =>
    new Promise((resolve) => {
      let w = false;
      let E = (L) => {
        if (w) return;
        w = true;
        clearTimeout(timer);
        resolve(L);
      };
      let A = o("git", [...SAFE_GIT_CONFIG_ARGS, ...h, "-C", canonicalPath, ...T], {
        stdio: ["ignore", "ignore", "pipe"],
        cwd: undefined,
        windowsHide: true,
        ...cgroupSpawnOptions("helper"),
        env: {
          ...process.env,
          ...u?.envOverrides,
          ...SAFE_GIT_ENV,
          ...(a
            ? {
                GIT_CONFIG_GLOBAL: "/dev/null",
                CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
              }
            : undefined),
          ...(a === "checkout" ? ISOLATED_HOME_ENV : undefined),
        },
      });
      let G = "";
      A.stderr?.on("data", (L) => (G += String(L)));
      let timer = setTimeout(
        (L, D, oe, ge, Ne, me) => {
          oe(`[runner:session] ${ge} in ${Ne} timed out after ${me}ms (best-effort cleanup)`);
          L.kill("SIGKILL");
          D(null);
        },
        l,
        A,
        E,
        onDebug,
        y,
        canonicalPath,
        l,
      );
      A.on("close", (L) => {
        if (L !== 0)
          onDebug(`[runner:session] ${y} in ${canonicalPath} exited ${L}: ${G.trim()} (best-effort cleanup)`);
        E(L);
      });
      A.on("error", (L) => {
        onDebug(`[runner:session] ${y} spawn failed: ${L} (best-effort cleanup)`);
        E(null);
      });
    });
  if (needsDetach) await p(["checkout", "--detach"], "checkout --detach");
  if ((await p(["branch", "-D", "--end-of-options", branch], `branch -D '${branch}'`)) === 0)
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
function getRemoteRepoPath(e) {
  if (!e.includes("://")) {
    let match = e.match(/^[^@]+@[^:]+:(.+)$/);
    if (match) return stripGitSuffixAndTrailingSlash(match[1]);
  }
  let n;
  try {
    n = new URL(e);
  } catch {
    return "";
  }
  let replaced = n.pathname.replace(/^\/+/, "");
  return stripGitSuffixAndTrailingSlash(replaced);
}
//@ chunk-hm0ce8vc.js:213454-213518 placement
/**
 * 去掉 .git 后缀与结尾斜杠。
 */
function stripGitSuffixAndTrailingSlash(e) {
  return e.replace(/\.git$/, "").replace(/\/+$/, "");
}
//@ chunk-hm0ce8vc.js:213518-213722 placement
function isLocalhostUrl(apiBaseUrl, n) {
  let r = apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1");
  let replaced = apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  let o = `${r ? "http" : "https"}://${replaced}/v1/code/sessions/${n}`;
  return {
    sdkUrl: o,
    resumeUrl: o,
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
