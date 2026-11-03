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
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { mHe, SAFE_GIT_CONFIG_ARGS, GIT_WATCHDOG_MS } from "../../selfHostedRunner/git/fetchErrors.js";
import { DUt } from "../../selfHostedRunner/git/proxyTrust.js";
import { Nd } from "../../utils/toolCgroup.js";
import { Dr, Cd } from "./launcherHooks.js";
import { ISOLATED_HOME_ENV } from "../../selfHostedRunner/git/repoPrepare.js";
import {
  remoteProxyArgs,
  credentialHelperArgs,
  uMo,
  SHR_GIT_PROXY_TOKEN,
} from "../../selfHostedRunner/git/gitCredentials.js";
import { env } from "../../utils/env.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { withTokenInUrl } from "../../selfHostedRunner/git/repoSources.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { redactToken } from "../../selfHostedRunner/git/tokenRedact.js";

//@ chunk-hm0ce8vc.js:204328-205881 placement
async function fetchSourceBranch(e, n, r, s, a, o, l = spawn, u) {
  if (s?.aborted) return;
  let h = { GIT_CONFIG_GLOBAL: "/dev/null", CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0 },
    p = { ...process.env, ...u?.envOverrides, ...mHe, ...(a === !0 ? h : void 0) },
    S = DUt(u?.commandScopeEntries ?? []),
    T = (v, w, E, A = [], G = p) =>
      new Promise((K) => {
        let L = !1,
          D = (Te) => {
            if (L) return;
            ((L = !0), clearTimeout(me), s?.removeEventListener("abort", Ne), K(Te));
          },
          oe = l("git", [...SAFE_GIT_CONFIG_ARGS, ...A, ...S, "-C", e, ...v], {
            cwd: void 0,
            stdio: ["ignore", "ignore", "pipe"],
            windowsHide: !0,
            ...Nd("helper"),
            env: G,
          }),
          ge = "";
        oe.stderr?.on("data", (Te) => (ge += String(Te)));
        let Ne = () => {
            (oe.kill("SIGKILL"), D("unsettled"));
          },
          me = setTimeout(
            (Te, Ye, He, ae, fe, $e) => {
              (Te(
                `[runner:session] ${Ye} in ${He} timed out after ${fe}ms \u2014 continuing on current HEAD`,
              ),
                ae.kill("SIGKILL"),
                $e("unsettled"));
            },
            E,
            r,
            w,
            e,
            oe,
            E,
            D,
          );
        if (s?.aborted) Ne();
        else s?.addEventListener("abort", Ne, { once: !0 });
        (oe.on("close", (Te) => {
          if (Te === 0) (r(`[runner:session] created outcome branch '${n}' in ${e} (${w})`), D("ok"));
          else (r(`[runner:session] ${w} in ${e} exited ${Te}: ${ge.trim()}`), D("failed"));
        }),
          oe.on("error", (Te) => {
            (r(`[runner:session] ${w} spawn failed: ${Te} \u2014 continuing on current HEAD`),
              D("unsettled"));
          }));
      });
  if (!o) {
    if (
      (await T(["switch", "-q", "-C", n], `switch -C '${n}'`, Dr, ["-c", "alias.switch="])) !== "failed" ||
      s?.aborted
    )
      return;
    r(`[runner:session] retrying outcome branch '${n}' as checkout -B`);
  }
  if (
    (await T(
      ["checkout", "-B", n, ...(o ? [o] : [])],
      `checkout -B '${n}'`,
      o ? GIT_WATCHDOG_MS : Dr,
      [],
      a === "checkout" ? { ...p, ...h, ...ISOLATED_HOME_ENV } : p,
    )) === "failed"
  )
    r(`[runner:session] outcome branch '${n}' not created in ${e} \u2014 continuing on current HEAD`);
}
/**
 * 从远端获取会话产出分支（hardenedGitUrl 与 governedAuth 互斥）。
 */
//@ chunk-hm0ce8vc.js:205881-207509 placement
async function fetchOutcomeBranches(e, n, r, s, a = spawn, o = !1, l, u, h) {
  if (l && u) throw Error("fetchOutcomeBranches: hardenedGitUrl and governedAuth are mutually exclusive");
  let p = 0,
    S = u?.url,
    T = DUt(h?.commandScopeEntries ?? []);
  for (let y of n) {
    if (s?.aborted) return;
    let v = `+refs/heads/${y}:refs/remotes/origin/${y}`;
    if (
      (await new Promise((E) => {
        let A = !1,
          G = (ge) => {
            if (A) return;
            ((A = !0), clearTimeout(oe), s?.removeEventListener("abort", D), E(ge));
          },
          K = a(
            "git",
            [
              "-C",
              e,
              ...SAFE_GIT_CONFIG_ARGS,
              ...(l ? remoteProxyArgs(l) : []),
              ...(S ? [...remoteProxyArgs(S), ...credentialHelperArgs(S), ...uMo] : []),
              ...T,
              "-c",
              "http.proxyAuthMethod=basic",
              "fetch",
              "--no-progress",
              "--no-tags",
              "--end-of-options",
              S ?? "origin",
              v,
            ],
            {
              stdio: ["ignore", "ignore", "pipe"],
              windowsHide: !0,
              ...Nd("helper"),
              env: {
                ...process.env,
                ...h?.envOverrides,
                ...mHe,
                ...(l || S ? { GIT_CONFIG_GLOBAL: "/dev/null" } : void 0),
                ...(u
                  ? { [SHR_GIT_PROXY_TOKEN]: u.getToken(), CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0 }
                  : void 0),
                ...(o && { GIT_ALLOW_PROTOCOL: `file:${mHe.GIT_ALLOW_PROTOCOL}` }),
                GIT_TERMINAL_PROMPT: "0",
                GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
              },
            },
          ),
          L = "";
        K.stderr?.on("data", (ge) => (L += String(ge)));
        let D = () => {
          if (K.pid) killProcessGroup(K.pid);
          G(null);
        };
        s?.addEventListener("abort", D, { once: !0 });
        let oe = setTimeout(
          (ge, Ne, me, Te) => {
            if (
              (ge(`[runner:session] fetch outcome branch in ${Ne} timed out after ${Cd}ms \u2014 continuing`),
              me.pid)
            )
              killProcessGroup(me.pid);
            Te(null);
          },
          Cd,
          r,
          e,
          K,
          G,
        );
        (K.on("close", (ge) => {
          if (ge !== 0)
            r(`[runner:session] fetch outcome branch in ${e} exited ${ge}: ${L.trim()} \u2014 continuing`);
          G(ge);
        }),
          K.on("error", (ge) => {
            (r(`[runner:session] fetch outcome branch spawn failed: ${ge} \u2014 continuing`), G(null));
          }));
      })) === 0
    )
      p++;
  }
  if (n.length > 0) r(`[runner:session] fetched ${p}/${n.length} outcome branch(es) in ${e}`);
}
//@ chunk-hm0ce8vc.js:207509-208603 placement
function buildSslVerifyArgs(e, n) {
  let r = e.url ?? "",
    s = e.getAuthToken ? e.getAuthToken() : e.token,
    a = e.getAuthToken ? r : withTokenInUrl(r, e.token),
    o;
  try {
    let h = new URL(r);
    if (h.protocol === "https:" || h.protocol === "http:") o = h.origin;
  } catch {}
  let l =
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.ALL_PROXY ||
      process.env.all_proxy ||
      "",
    u = [...SAFE_GIT_CONFIG_ARGS];
  if (o) {
    if (
      (u.push("-c", "http.sslVerify=true"),
      u.push("-c", `http.${o}.sslVerify=true`),
      u.push("-c", `http.${r}.sslVerify=true`),
      l)
    )
      (u.push("-c", `http.proxy=${l}`),
        u.push("-c", `http.${o}.proxy=${l}`),
        u.push("-c", `http.${r}.proxy=${l}`));
    if (s)
      if (e.getAuthToken) u.push(...credentialHelperArgs(r));
      else (u.push("-c", "credential.helper="), u.push("-c", `credential.${o}.helper=`));
  }
  return (
    u.push(...DUt(n?.commandScopeEntries ?? [])),
    {
      args: u,
      authURL: a,
      token: s,
      env: {
        ...process.env,
        ...n?.envOverrides,
        GIT_TERMINAL_PROMPT: "0",
        ...mHe,
        ...(r.startsWith("file://") && { GIT_ALLOW_PROTOCOL: `file:${mHe.GIT_ALLOW_PROTOCOL}` }),
        GIT_SSH_COMMAND: `${process.env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o ConnectTimeout=30`,
        SELF_HOSTED_RUNNER_HOST_CONFIG_DIR: void 0,
        ...(s && { GIT_CONFIG_GLOBAL: "/dev/null", [SHR_GIT_PROXY_TOKEN]: e.getAuthToken ? s : void 0 }),
      },
    }
  );
}
//@ chunk-hm0ce8vc.js:208603-209793 placement
async function resumePushOnRelease(e, n, r, s, a, o, l) {
  if (o?.aborted) return !1;
  if (!isSafeRefName(n))
    return (
      a(
        `[runner:session] push-on-release resume: branch '${n}' rejected by isSafeRefName (refspec metachar guard); skipping fetch`,
      ),
      !1
    );
  let u = buildSslVerifyArgs(r, l);
  return new Promise((h) => {
    let p = !1,
      S = (E) => {
        if (p) return;
        ((p = !0), clearTimeout(w), o?.removeEventListener("abort", T), h(E));
      },
      T = () => {
        (y.kill("SIGKILL"), S(!1));
      },
      y = spawn(
        "git",
        [
          ...u.args,
          "-C",
          e,
          "fetch",
          "--no-write-fetch-head",
          u.authURL,
          `+refs/heads/${n}:refs/remotes/origin/${n}`,
        ],
        { stdio: ["ignore", "ignore", "pipe"], cwd: void 0, env: u.env, windowsHide: !0, ...Nd("helper") },
      ),
      v = "";
    (y.stderr?.on("data", (E) => (v += String(E))), o?.addEventListener("abort", T, { once: !0 }));
    let w = setTimeout(
      (E, A, G, K, L) => {
        (E(
          `[runner:session] push-on-release resume: fetch '${A}' timed out after ${G}ms; starting from source HEAD (best-effort)`,
        ),
          K.kill("SIGKILL"),
          L(!1));
      },
      s,
      a,
      n,
      s,
      y,
      S,
    );
    (y.on("close", (E) => {
      if (E === 0)
        (a(
          `[runner:session] push-on-release resume: fetched prior '${n}' from source remote; starting from preserved work`,
        ),
          S(!0));
      else
        (a(
          `[runner:session] push-on-release resume: no prior '${n}' on source remote (${redactToken(v, u.authURL, u.token).trim() || `exit ${E}`}); starting from source HEAD`,
        ),
          S(!1));
    }),
      y.on("error", () => S(!1)));
  });
}
//@ chunk-hm0ce8vc.js:209793-210238 placement
async function revParseVerify(e, n, r = Dr) {
  return new Promise((s) => {
    let a = !1,
      o = (p) => {
        if (a) return;
        ((a = !0), clearTimeout(h), s(p));
      },
      l = spawn("git", [...SAFE_GIT_CONFIG_ARGS, "-C", e, "rev-parse", "--verify", n], {
        stdio: ["ignore", "pipe", "ignore"],
        cwd: void 0,
        env: { ...process.env, ...mHe },
        windowsHide: !0,
        ...Nd("helper"),
      }),
      u = "";
    l.stdout?.on("data", (p) => (u += String(p)));
    let h = setTimeout(
      (p, S) => {
        (p.kill("SIGKILL"), S(void 0));
      },
      r,
      l,
      o,
    );
    (l.on("close", (p) => o(p === 0 ? u.trim() : void 0)), l.on("error", () => o(void 0)));
  });
}
//@ chunk-hm0ce8vc.js:210238-210291 placement
function Kf() {
  return `claude-runner-upstream-${randomUUID_2()}`;
}
//@ chunk-hm0ce8vc.js:210291-210353 placement
function hu(e) {
  return Boolean(e.governedMount && e.upstreamUrl);
}
/**
 * 会话释放时把分支推送到上游（校验 ref 名安全）。
 */
//@ chunk-hm0ce8vc.js:210353-212031 placement
async function pushOnRelease(e, n, r, s, a, o) {
  if (!isSafeRefName(n)) {
    a(
      `[runner:session] push-on-release '${n}' rejected by isSafeRefName (refspec metachar guard); skipping (best-effort)`,
    );
    return;
  }
  let l = hu(r),
    u = l && r.governedPushUrl !== void 0 ? Kf() : void 0,
    h = l ? { ...r, url: r.upstreamUrl, getAuthToken: void 0, governedMount: !1 } : r,
    p = buildSslVerifyArgs(h, o);
  return new Promise((S) => {
    let T = !1,
      y = () => {
        if (T) return;
        ((T = !0), clearTimeout(E), S());
      },
      v = spawn(
        "git",
        [
          ...p.args,
          "-C",
          e,
          ...(u !== void 0
            ? ["-c", `remote.${u}.url=${p.authURL}`, "-c", `remote.${u}.pushurl=${p.authURL}`, "push", u]
            : ["push", p.authURL]),
          `refs/heads/${n}:refs/heads/${n}`,
        ],
        { stdio: ["ignore", "ignore", "pipe"], cwd: void 0, env: p.env, windowsHide: !0, ...Nd("helper") },
      ),
      w = "";
    v.stderr?.on("data", (A) => (w += String(A)));
    let E = setTimeout(
      (A, G, K, L, D, oe) => {
        (A(`[runner:session] push-on-release '${G}' from ${K} timed out after ${L}ms (best-effort)`),
          D.kill("SIGKILL"),
          oe());
      },
      s,
      a,
      n,
      e,
      s,
      v,
      y,
    );
    (v.on("close", (A) => {
      if (A === 0) a(`[runner:session] push-on-release pushed '${n}' to source remote from ${e}`);
      else
        a(
          `[runner:session] push-on-release '${n}' from ${e} exited ${A}: ${redactToken(w, p.authURL, p.token).trim()} (best-effort)` +
            (l
              ? " \u2014 governed git pushes --push-outcome-on-release branches to the plain " +
                "upstream with customer-managed credentials (this runner-side push does not use the session's git-mount push URL); if this failed with an auth error, provide a git credential for the push target on the runner host or use the post-session hook" +
                (u !== void 0
                  ? "; git skips every url.*.pushInsteadOf rule for this push (global and system ones too), so the credential must work without one"
                  : "")
              : ""),
        );
      y();
    }),
      v.on("error", (A) => {
        (a(`[runner:session] push-on-release '${n}' spawn failed: ${A} (best-effort)`), y());
      }));
  });
}
//@ chunk-hm0ce8vc.js:212031-213081 placement
async function runGitQuiet(e, n, r, s, a, o = spawn, l = Dr, u) {
  let h = DUt(u?.commandScopeEntries ?? []),
    p = (T, y) =>
      new Promise((v) => {
        let w = !1,
          E = (L) => {
            if (w) return;
            ((w = !0), clearTimeout(K), v(L));
          },
          A = o("git", [...SAFE_GIT_CONFIG_ARGS, ...h, "-C", e, ...T], {
            stdio: ["ignore", "ignore", "pipe"],
            cwd: void 0,
            windowsHide: !0,
            ...Nd("helper"),
            env: {
              ...process.env,
              ...u?.envOverrides,
              ...mHe,
              ...(a ? { GIT_CONFIG_GLOBAL: "/dev/null", CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0 } : void 0),
              ...(a === "checkout" ? ISOLATED_HOME_ENV : void 0),
            },
          }),
          G = "";
        A.stderr?.on("data", (L) => (G += String(L)));
        let K = setTimeout(
          (L, D, oe, ge, Ne, me) => {
            (oe(`[runner:session] ${ge} in ${Ne} timed out after ${me}ms (best-effort cleanup)`),
              L.kill("SIGKILL"),
              D(null));
          },
          l,
          A,
          E,
          s,
          y,
          e,
          l,
        );
        (A.on("close", (L) => {
          if (L !== 0) s(`[runner:session] ${y} in ${e} exited ${L}: ${G.trim()} (best-effort cleanup)`);
          E(L);
        }),
          A.on("error", (L) => {
            (s(`[runner:session] ${y} spawn failed: ${L} (best-effort cleanup)`), E(null));
          }));
      });
  if (r) await p(["checkout", "--detach"], "checkout --detach");
  if ((await p(["branch", "-D", "--end-of-options", n], `branch -D '${n}'`)) === 0)
    s(`[runner:session] deleted outcome branch '${n}' from ${e}`);
}
//@ chunk-hm0ce8vc.js:213081-213272 placement = ghIsDangerousCallback (0.82)
function getRemoteHostname(e) {
  if (!e.includes("://")) {
    let match = e.match(/^[^@]+@([^:/]+):.+$/);
    return match ? match[1].toLowerCase() : void 0;
  }
  try {
    let lower = new URL(e).hostname.toLowerCase();
    return lower === "" ? void 0 : lower;
  } catch {
    return;
  }
}
//@ chunk-hm0ce8vc.js:213272-213454 placement = ghIsDangerousCallback (0.808)
function getRemoteRepoPath(e) {
  if (!e.includes("://")) {
    let match = e.match(/^[^@]+@[^:]+:(.+)$/);
    if (match) return zd(match[1]);
  }
  let n;
  try {
    n = new URL(e);
  } catch {
    return "";
  }
  let replaced = n.pathname.replace(/^\/+/, "");
  return zd(replaced);
}
//@ chunk-hm0ce8vc.js:213454-213518 placement
function zd(e) {
  return e.replace(/\.git$/, "").replace(/\/+$/, "");
}
//@ chunk-hm0ce8vc.js:213518-213722 placement
function isLocalhostUrl(e, n) {
  let r = e.includes("localhost") || e.includes("127.0.0.1"),
    replaced = e.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    o = `${r ? "http" : "https"}://${replaced}/v1/code/sessions/${n}`;
  return { sdkUrl: o, resumeUrl: o };
}

export {
  getRemoteHostname,
  fetchOutcomeBranches,
  resumePushOnRelease,
  fetchSourceBranch,
  revParseVerify,
  isLocalhostUrl,
  hu,
  pushOnRelease,
  runGitQuiet,
  getRemoteRepoPath,
};
