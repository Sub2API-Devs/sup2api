/**
 * services/selfHostedRunner/configureGit.ts
 *
 * 2.1.316 新增。self-hosted runner 的 --configure-git：配置签名、代理凭据助手与 coauthor hook，并给出操作员 git 配置警告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qcqdqsn4.js (34)
 * attribution: placement 34
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { join, sep, dirname, resolve, delimiter, isAbsolute } from "path";
import { mkdir, writeFile, chmod, access, lstat, readdir, readlink, readFile } from "fs/promises";
import { constants } from "fs";
import {
  GIT_CONFIG_TIMEOUT_MS,
  stripFilePrefix,
  isNormalizedAbsolutePath,
  getGitConfigScopesWithValue,
  readSystemAndGlobalGitConfigPath,
  stripTrailingSlashes,
  readGitConfigPath,
} from "../../utils/git/gitConfig.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";

//@ chunk-qcqdqsn4.js:702-745 placement
/**
 * 把 execFile 包装成 promise 版本，用于 git 与 API 调用。
 */
var execFileAsync = promisify(execFile);
var SAFE_GIT_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;
var MIN_GIT_VERSION = [2, 34];
//@ chunk-qcqdqsn4.js:745-854 placement
function parseGitVersion(e) {
  let match = /git version (\d+)\.(\d+)/.exec(e);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}
//@ chunk-qcqdqsn4.js:854-949 placement
function isGitVersionSupported(stdout) {
  let gitVersion = parseGitVersion(stdout);
  if (gitVersion === null) return null;
  let [o, s] = gitVersion;
  let [t, r] = MIN_GIT_VERSION;
  return o > t || (o === t && s >= r);
}
//@ chunk-qcqdqsn4.js:949-2145 placement
async function configureGitForSigning(e) {
  let stdout = (
    await execFileAsync("git", ["--version"], {
      windowsHide: true,
    })
  ).stdout;
  let o = isGitVersionSupported(stdout);
  if (o === null)
    e.onStatus(
      `[runner:git] --configure-git: could not parse git version from "${stdout.trim()}"; proceeding without version check`,
    );
  else if (!o) {
    let [d, u] = MIN_GIT_VERSION;
    throw Error(
      `--configure-git requires git >= ${d}.${u} for SSH commit signing (found: ${stdout.trim()}). Upgrade git in your runner image, or omit --configure-git and manage git identity yourself`,
    );
  }
  let s = join(e.baseDir, ".runner");
  await mkdir(s, {
    recursive: true,
  });
  let t = join(s, "code-sign");
  let r = join(s, "commit_signing_key.pub");
  let a = codeSignWrapperScript(e.execPath);
  await writeFile(t, a, {
    mode: 493,
  });
  await chmod(t, 493);
  await writeFile(r, "");
  let g = [
    ["user.name", "Claude"],
    ["user.email", "noreply@anthropic.com"],
    ["gpg.format", "ssh"],
    ["gpg.ssh.program", t],
    ["user.signingkey", r],
    ["commit.gpgsign", "true"],
    ["tag.gpgsign", "true"],
    ["push.negotiate", "true"],
  ];
  let h = e.gitConfigPath ? ["--file", e.gitConfigPath] : ["--global"];
  for (let [d, u] of g)
    await execFileAsync("git", ["config", ...h, "--replace-all", d, u], {
      windowsHide: true,
    });
  e.onStatus(`[runner:git] --configure-git: identity=Claude <noreply@anthropic.com>, gpg.ssh.program=${t}`);
  let f = await installCoauthorHooks(s, h, e.onStatus);
  return f.installed
    ? {
        shimPath: t,
      }
    : {
        shimPath: t,
        operatorHooksPath: f.existingHooksPath,
      };
}
//@ chunk-qcqdqsn4.js:2145-2287 placement
function codeSignWrapperScript(e) {
  return `#!/bin/sh
BIN="$CLAUDE_RUNNER_CLAUDE_BIN"
[ -n "$BIN" ] || BIN='${shellQuote(e)}'
exec "$BIN" self-hosted-runner code-sign "$@"
`;
}
//@ chunk-qcqdqsn4.js:2287-2437 placement
function codeSignArtifacts(e, n) {
  let o = join(e, ".runner");
  return [
    {
      path: join(o, "code-sign"),
      content: codeSignWrapperScript(n),
      mode: 493,
    },
    {
      path: join(o, "commit_signing_key.pub"),
      content: "",
      mode: 420,
    },
  ];
}
//@ chunk-qcqdqsn4.js:2437-2480 placement
function configureGitGovernedEntries(baseDir) {
  return configureGitOverlayEntries(join(baseDir, ".runner"));
}
//@ chunk-qcqdqsn4.js:2480-2785 placement
function configureGitOverlayEntries(e) {
  return [
    ["user.name", "Claude"],
    ["user.email", "noreply@anthropic.com"],
    ["user.signingkey", join(e, "commit_signing_key.pub")],
    ["gpg.format", "ssh"],
    ["gpg.ssh.program", join(e, "code-sign")],
    ["commit.gpgsign", "true"],
    ["tag.gpgsign", "true"],
    ["push.negotiate", "true"],
    ["core.hooksPath", join(e, "git-hooks")],
  ];
}
//@ chunk-qcqdqsn4.js:2785-3012 placement
function relocateConfigureGitArtifacts(e, baseDir, o) {
  let s = join(baseDir, ".runner") + sep;
  return e.map((t) => {
    if (!t.path.startsWith(s))
      throw Error("relocateConfigureGitArtifacts: artifact path is not under {baseDir}/.runner/");
    return {
      ...t,
      path: join(o, t.path.slice(s.length)),
    };
  });
}
//@ chunk-qcqdqsn4.js:3012-3122 placement
async function readGitVersion() {
  try {
    let { stdout } = await execFileAsync("git", ["--version"], {
      windowsHide: true,
    });
    return stdout;
  } catch {
    return "";
  }
}
//@ chunk-qcqdqsn4.js:3122-3247 placement
var GIT_PROXY_CRED_HELPER_CONTENT = `#!/bin/sh
test "$1" = get || exit 0
printf "username=unused\\npassword=%s\\n" "$CLAUDE_CODE_SESSION_ACCESS_TOKEN"
`;
//@ chunk-qcqdqsn4.js:3247-3302 placement
function gitProxyCredHelperPath(baseDir) {
  return join(baseDir, ".runner", "git-proxy-cred");
}
//@ chunk-qcqdqsn4.js:3302-3475 placement
function coauthorHookStubs(e) {
  let n = join(e, ".runner", "git-hooks");
  return [
    ...GIT_HOOK_NAMES.map((o) => ({
      path: join(n, o),
      content: COAUTHOR_HOOK_SCRIPT,
    })),
    ...["commit-msg", "prepare-commit-msg"].map((o) => ({
      path: join(n, o),
      content: COMMIT_MSG_HOOK_SCRIPT,
    })),
  ];
}
//@ chunk-qcqdqsn4.js:3475-4214 placement
async function configureGitProxyCredential(e) {
  let replaced = e.apiBaseUrl.replace(/\/+$/, "");
  let o;
  try {
    o = new URL(replaced).host;
  } catch {
    throw Error(`--use-anthropic-git-proxy: apiBaseUrl is not a valid URL: ${replaced}`);
  }
  let s = join(e.baseDir, ".runner");
  await mkdir(s, {
    recursive: true,
  });
  let t = gitProxyCredHelperPath(e.baseDir);
  await writeFile(t, GIT_PROXY_CRED_HELPER_CONTENT, {
    mode: 448,
  });
  await chmod(t, 448);
  let r = e.gitConfigPath ? ["--file", e.gitConfigPath] : ["--global"];
  let a = [
    [`credential.https://${o}.helper`, `!'${shellQuote(t)}'`],
    [`credential.https://${o}.useHttpPath`, "false"],
    [`credential.https://${o}.username`, "unused"],
    [`http.https://${o}/.proactiveAuth`, "basic"],
  ];
  for (let [g, h] of a)
    await execFileAsync("git", ["config", ...r, "--replace-all", g, h], {
      windowsHide: true,
    });
  e.onStatus(`[runner:git] --use-anthropic-git-proxy: credential helper registered for https://${o} (${t})`);
  return replaced;
}
//@ chunk-qcqdqsn4.js:5148-5948 placement
/**
 * 读取 git --system 配置（含来源）
 */
async function readSystemGitConfig(e) {
  let n;
  try {
    n = (
      await execFileAsync("git", ["config", "--system", "--includes", "--show-origin", "-z", "--list"], {
        cwd: "/",
        windowsHide: true,
        timeout: GIT_CONFIG_TIMEOUT_MS,
        maxBuffer: 4194304,
        ...(e && {
          env: e,
        }),
      })
    ).stdout;
  } catch (error) {
    let r = error;
    let a =
      getErrnoCode(error) ??
      (r !== null && typeof r === "object"
        ? typeof r.signal === "string"
          ? `killed by ${r.signal}${r.killed === true ? ", timed out" : ""}`
          : r.code !== undefined
            ? `exit ${String(r.code)}`
            : "error"
        : "error");
    return {
      files: [],
      unverifiable: `the system configuration could not be listed (${a})`,
    };
  }
  let parts = n.split("\x00");
  let s = [];
  for (let t = 0; t + 1 < parts.length; t += 2) {
    let r = stripFilePrefix(parts[t]);
    if (!parts[t].startsWith("file:") || !isNormalizedAbsolutePath(r))
      return {
        files: s,
        unverifiable: `git reports a source that is not a plainly spelled absolute file path (${quoteConfigValueForLog(r)}; write [include] paths absolute, without '.' or '..' components)`,
      };
    if (!s.includes(r)) s.push(r);
  }
  return {
    files: s,
  };
}
//@ chunk-qcqdqsn4.js:5948-6175 placement
/**
 * 路径可写或由当前用户拥有
 */
async function isWritableOrOwned(e) {
  let n = e;
  for (;;)
    try {
      await access(n, constants.W_OK);
      return true;
    } catch (error) {
      if (isENOENT(error)) {
        let t = dirname(n);
        if (t === n) return false;
        n = t;
        continue;
      }
      let s = process.getuid?.();
      if (s !== undefined && s !== 0)
        try {
          if ((await lstat(n)).uid === s) return true;
        } catch {}
      return false;
    }
}
//@ chunk-qcqdqsn4.js:6175-6247 placement
var isWithinDir = (e, baseDir) =>
  baseDir !== undefined &&
  baseDir !== "" &&
  (resolve(e) === resolve(baseDir) || resolve(e).startsWith(resolve(baseDir) + sep));
//@ chunk-qcqdqsn4.js:6247-6933 placement
async function resolveHookGitPrograms(e) {
  let sessionReachable = e?.sessionReachable ?? isWritableOrOwned;
  let HOME = e?.env ? e.env.HOME : env.HOME;
  let PATH = e?.env ? e.env.PATH : env.PATH;
  let t = [];
  let filtered = (PATH ?? "").split(delimiter).filter((u) => {
    if (u === "" || !isAbsolute(u)) return false;
    if (isWithinDir(u, HOME) || isWithinDir(u, e?.baseDir)) {
      t.push(u);
      return false;
    }
    return true;
  });
  let a = async (u) => {
    for (let m of filtered) {
      let l = join(m, u);
      try {
        await access(l, constants.X_OK);
      } catch {
        continue;
      }
      if (
        (await describeWritableChain(l, sessionReachable)) !== undefined ||
        (await describeWritableChain(m, sessionReachable)) !== undefined
      ) {
        t.push(l);
        continue;
      }
      return l;
    }
    return;
  };
  let g = "/nonexistent-gpg";
  for (let u of ["/bin/false", "/usr/bin/false"]) {
    try {
      await access(u, constants.X_OK);
    } catch {
      continue;
    }
    if (
      (await describeWritableChain(u, sessionReachable)) === undefined &&
      (await describeWritableChain(dirname(u), sessionReachable)) === undefined
    ) {
      g = u;
      break;
    }
  }
  let [h, f, d] = await Promise.all([a("gpg"), a("gpgsm"), a("ssh-keygen")]);
  return {
    gpg: h ?? g,
    gpgsm: f ?? g,
    sshKeygen: d ?? g,
    inert: g,
    skipped: t,
  };
}
//@ chunk-qcqdqsn4.js:6933-7061 placement
function isRunnerHooksDir(e, n) {
  let o = (s) => resolve(s).replace(/[\\/]+$/, "");
  return (n !== undefined && o(e) === o(n)) || o(e).endsWith(join(sep + ".runner", "git-hooks"));
}
//@ chunk-qcqdqsn4.js:7061-8876 placement
async function readOperatorGitSnapshot(e) {
  let sessionReachable = e?.sessionReachable ?? isWritableOrOwned;
  let systemConfigFiles = e?.systemConfigFiles ?? readSystemGitConfig;
  let HOME = e?.env ? e.env.HOME : env.HOME;
  function t(source) {
    return e?.lifecycleHooks ? getGitConfigScopesWithValue(source, e.env) : [];
  }
  let [{ system: r, systemOrigin: a, global: g }, h, f, d] = await Promise.all([
    readSystemAndGlobalGitConfigPath("core.hooksPath", e?.env),
    t("core.sshCommand"),
    t("core.askPass"),
    t("filter.lfs.clean"),
  ]);
  let u = (l) => l !== undefined && !isRunnerHooksDir(l);
  let m = {
    ...(u(g) && {
      ignoredGlobalHooksPath: g,
    }),
    ...(h.length > 0 && {
      sshCommandScopes: h,
    }),
    ...(f.length > 0 && {
      askPassScopes: f,
    }),
    ...(d.length > 0 && {
      lfsFilterScopes: d,
    }),
  };
  if (u(r)) {
    let l;
    if (a === undefined || !isNormalizedAbsolutePath(a))
      l = `git does not report a plainly spelled absolute file path as its origin (${quoteConfigValueForLog(a ?? "")}) \u2014 cannot verify it is out of the sessions' reach`;
    else {
      let S = await systemConfigFiles(e?.env);
      if (S.unverifiable !== undefined)
        l = `${S.unverifiable} \u2014 cannot verify it is out of the sessions' reach`;
      else if (!S.files.includes(a))
        l = `the system configuration changed while it was being read (${quoteConfigValueForLog(a)} is no longer among its files) \u2014 cannot verify it is out of the sessions' reach`;
      else
        for (let file of S.files) {
          let D = await lstat(file).then(
            () => {
              return;
            },
            (error) => getErrnoCode(error) ?? "error",
          );
          let C =
            D !== undefined
              ? `is listed by git but cannot be found as reported (${D}) \u2014 cannot verify it is out of the sessions' reach`
              : await describeWritableChain(file, sessionReachable);
          if (C !== undefined) {
            l =
              file === a
                ? `it comes from ${quoteConfigValueForLog(file)}, which ${C}`
                : `one of the files the system configuration reads, ${quoteConfigValueForLog(file)}, ${C}`;
            break;
          }
        }
    }
    if (l === undefined)
      if (!isAbsolute(r)) l = "it is relative (git would resolve it inside each repository)";
      else if (!isNormalizedAbsolutePath(r))
        l = `it is not spelled as a plain absolute path (${quoteConfigValueForLog(r)}) \u2014 write it without '.' or '..' components`;
      else if (isWithinDir(r, HOME) || isWithinDir(r, e?.baseDir))
        l = "it points under the runner HOME / --base-dir, which sessions can write";
      else {
        let S = await describeWritableChain(r, sessionReachable);
        l = S !== undefined ? `its target directory ${S}` : await findWritableEntryIn(r, sessionReachable);
      }
    if (l === undefined) m.hooksPath = r;
    else
      m.ignoredSystemHooksPath = {
        value: r,
        reason: l,
      };
  }
  return m;
}
//@ chunk-qcqdqsn4.js:8876-8886 placement
var MAX_WRITABLE_CHAIN_HOPS = 32;
//@ chunk-qcqdqsn4.js:8886-9149 placement
/**
 * 找目录中可被 runner 用户写的条目
 */
async function findWritableEntryIn(e, sessionReachable) {
  let o;
  try {
    o = (await readdir(e)).sort();
  } catch (error) {
    return isENOENT(error)
      ? "its target directory does not exist"
      : `its target directory cannot be listed (${getErrnoCode(error) ?? "error"})`;
  }
  for (let s of o) {
    let t = await describeWritableChain(join(e, s), sessionReachable);
    if (t !== undefined) return `${quoteConfigValueForLog(s)} in it ${t}`;
  }
  return;
}
//@ chunk-qcqdqsn4.js:9149-9928 placement
/**
 * 沿符号链接检查路径是否可被 runner 用户写
 */
async function describeWritableChain(
  e,
  sessionReachable,
  o = {
    hops: MAX_WRITABLE_CHAIN_HOPS,
  },
) {
  let s = stripTrailingSlashes(e);
  let t = s;
  for (;;) {
    if (await sessionReachable(t))
      return t === s
        ? "is writable by (or belongs to) this runner's user"
        : `resolves to ${quoteConfigValueForLog(t)}, which this runner's user can write or owns`;
    let r;
    try {
      r = (await lstat(t)).isSymbolicLink();
    } catch (error) {
      if (t === s) {
        if (isENOENT(error)) return;
        return `cannot be examined (${getErrnoCode(error) ?? "error"})`;
      }
      return `is a link that does not resolve (${quoteConfigValueForLog(t)})`;
    }
    if (!r) return;
    if (o.hops <= 0) return "is a link with too many levels of indirection";
    o.hops--;
    let a;
    try {
      a = await readlink(t);
    } catch (error) {
      return `is a link that cannot be read (${getErrnoCode(error) ?? "error"})`;
    }
    t = resolve(dirname(t), a);
    let g = await describeWritableChain(dirname(t), sessionReachable, o);
    if (g !== undefined)
      return o.hops <= 0
        ? `is a link with too many levels of indirection (through ${quoteConfigValueForLog(dirname(t))})`
        : `resolves into ${quoteConfigValueForLog(dirname(t))}, a directory that ${g} (the target could be replaced)`;
  }
}
//@ chunk-qcqdqsn4.js:9928-9947 placement
var FORMAT_CHAR_RE = /^\p{Cf}$/u;
//@ chunk-qcqdqsn4.js:9947-10170 placement = needsWidthCompensation (0.79)
function quoteConfigValueForLog(char) {
  let n = jsonStringify(char);
  let o = "";
  for (let s of n) {
    let cp = s.codePointAt(0);
    if ((cp >= 127 && cp <= 159) || cp === 8232 || cp === 8233 || FORMAT_CHAR_RE.test(s))
      for (let idx = 0; idx < s.length; idx++) o += `\\u${s.charCodeAt(idx).toString(16).padStart(4, "0")}`;
    else o += s;
  }
  return o;
}
//@ chunk-qcqdqsn4.js:10170-13913 placement
/**
 * self-hosted runner 的 --configure-git：配置签名、代理凭据助手与 coauthor hook，并给出操作员 git 配置警告。
 */
function operatorGitSnapshotWarnings(
  e,
  { isRoot, operatorSshInEnv = false, askpassSource = "none", postSessionHook = false, envHooksPath = false },
) {
  let a = [];
  if (e.ignoredSystemHooksPath !== undefined) {
    let ignoredSystemHooksPath = e.ignoredSystemHooksPath;
    a.push(
      `[runner:warn] the system git config sets core.hooksPath=${quoteConfigValueForLog(ignoredSystemHooksPath.value)}, which is NOT applied inside lifecycle hooks because ${ignoredSystemHooksPath.reason}. ` +
        (isRoot
          ? "This runner runs as root, so no configuration file is out of the sessions' reach: export it as a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment instead \u2014 and run the runner as an unprivileged user."
          : "Use an absolute path outside the runner's HOME/--base-dir in a root-owned file, naming a directory whose hook files are root-owned too (or export it as a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment)."),
    );
  }
  if (e.ignoredGlobalHooksPath !== undefined)
    a.push(
      `[runner:warn] the global git config sets core.hooksPath=${quoteConfigValueForLog(e.ignoredGlobalHooksPath)}, which is NOT applied inside lifecycle hooks (checkout / post-session): every session this runner hosts can write that file. Git run by those hooks takes core.hooksPath only from the system git config (git config --system) or from a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair exported in the runner's own environment; move it there if your hooks need it. The session's own git is unaffected.`,
    );
  if (e.sshCommandScopes !== undefined && !operatorSshInEnv)
    a.push(
      `[runner:warn] core.sshCommand is set in the ${e.sshCommandScopes.join(" and ")} git config but is NOT used inside lifecycle hooks (checkout / post-session): git run by those hooks uses plain ssh unless the runner's own environment sets GIT_SSH_COMMAND (or GIT_SSH). If your hooks reach git remotes over ssh and need that command (a deploy key, a jump host), copy its value into GIT_SSH_COMMAND in the runner's environment; if they do not, no action is needed. ` +
        (e.sshCommandScopes.includes("global")
          ? "Copy only a command you set yourself: every session this runner hosts can write the global file. "
          : "") +
        "The session's own git is unaffected.",
    );
  if (e.askPassScopes !== undefined && askpassSource !== "own")
    a.push(
      `[runner:warn] core.askPass is set in the ${e.askPassScopes.join(" and ")} git config but is NOT used inside lifecycle hooks (checkout / post-session): git run by those hooks takes a credential-prompt program only from the runner's own environment, as GIT_ASKPASS (an SSH_ASKPASS there is handed on as GIT_ASKPASS) or as a core.askPass GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair. ` +
        (askpassSource === "handedOn"
          ? "Here hook git will use the SSH_ASKPASS program from the runner's environment in its place. "
          : "") +
        "If your hooks get https credentials from the program core.askPass names, copy its path into GIT_ASKPASS in the runner's environment; if they do not, no action is needed. " +
        (e.askPassScopes.includes("global")
          ? "Copy only a path you set yourself: every session this runner hosts can write the global file. "
          : "") +
        "The session's own git is unaffected.",
    );
  if (e.lfsFilterScopes !== undefined && postSessionHook && e.hooksPath === undefined && !envHooksPath)
    a.push(
      `[runner:warn] git-lfs is set up in the ${e.lfsFilterScopes.join(" and ")} git config and this runner has a post-session hook. Git run inside the runner's lifecycle hooks runs no repository or global git hooks, so git-lfs's pre-push hook does not run there and a plain "git push" from the post-session hook sends LFS pointers WITHOUT their objects. The runner cannot see whether your hook already handles this: in it, run "git-lfs push <remote> <branch>" BEFORE "git push" (or "git-lfs push --all <remote> <branch>" after it), or point core.hooksPath, ${isRoot ? "as" : "in the system git config or as"} a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment, at a root-owned directory that holds git-lfs's pre-push hook. The session's own git is unaffected.`,
    );
  return a;
}
//@ chunk-qcqdqsn4.js:13913-14777 placement
/**
 * 安装 coauthor hook，已有 core.hooksPath 时拒绝
 */
async function installCoauthorHooks(e, n, onStatus) {
  let s = join(e, "git-hooks");
  let t;
  if (n[0] === "--file") t = await readGitConfigPath(n, "core.hooksPath");
  else {
    let systemAndGlobalGitConfigPath = await readSystemAndGlobalGitConfigPath("core.hooksPath");
    t = systemAndGlobalGitConfigPath.global ?? systemAndGlobalGitConfigPath.system ?? "";
  }
  if (t !== "" && !isRunnerHooksDir(t, s)) {
    onStatus(
      `[runner:git] --configure-git: core.hooksPath already set (${quoteConfigValueForLog(t)}); skipping Co-authored-by hook install so existing hooks keep running for the session's own git (lifecycle ` +
        "hooks follow the system config / runner environment only \u2014 see " +
        "the lifecycle-hooks status line)",
    );
    return {
      installed: false,
      existingHooksPath: t,
    };
  }
  await mkdir(s, {
    recursive: true,
  });
  for (let r of GIT_HOOK_NAMES) {
    let a = join(s, r);
    await writeFile(a, COAUTHOR_HOOK_SCRIPT, {
      mode: 493,
    });
    await chmod(a, 493);
  }
  for (let r of ["commit-msg", "prepare-commit-msg"]) {
    let a = join(s, r);
    await writeFile(a, COMMIT_MSG_HOOK_SCRIPT, {
      mode: 493,
    });
    await chmod(a, 493);
  }
  await execFileAsync("git", ["config", ...n, "--replace-all", "core.hooksPath", s], {
    windowsHide: true,
  });
  onStatus(`[runner:git] --configure-git: core.hooksPath=${s}`);
  return {
    installed: true,
  };
}
//@ chunk-qcqdqsn4.js:14777-15823 placement
/**
 * git 支持的 hook 名单
 */
var GIT_HOOK_NAMES = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "reference-transaction",
  "fsmonitor-watchman",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "post-index-change",
];
var COAUTHOR_HOOK_SCRIPT = `#!/bin/sh
common_dir=$(git rev-parse --git-common-dir 2>/dev/null) || common_dir=.git
local_hook="$common_dir/hooks/$(basename "$0")"
[ -x "$local_hook" ] && exec "$local_hook" "$@"
exit 0
`;
var COMMIT_MSG_HOOK_SCRIPT = `#!/bin/sh
common_dir=$(git rev-parse --git-common-dir 2>/dev/null) || common_dir=.git
local_hook="$common_dir/hooks/$(basename "$0")"
if [ -x "$local_hook" ]; then
  "$local_hook" "$@" || exit $?
fi
email="$CCR_SESSION_ACCOUNT_EMAIL"
nl='
'
case "$email" in
  ''|*'<'*|*'>'*|*"$nl"*) email='' ;;
esac
if [ -n "$email" ] && printf %s "$email" | LC_ALL=C grep -q '[^ -~]'; then
  email=''
fi
if [ -n "$email" ]; then
  name="\${email%%@*}"
  git interpret-trailers --in-place \\
    --if-exists addIfDifferent \\
    --trailer "Co-authored-by: $name <$email>" "$1"
fi
exit 0
`;
//@ chunk-qcqdqsn4.js:15823-15868 placement = shellQuote (1)
function shellQuote(s) {
  return s.replace(/'/g, "'\\''");
}
//@ chunk-qcqdqsn4.js:15868-16328 placement
/**
 * 解析 ssh-keygen -Y sign 参数
 */
function parseSshKeygenSignArgs(e) {
  let n = false;
  let namespace;
  let keyFile;
  let t;
  for (let idx = 0; idx < e.length; idx++) {
    let a = e[idx];
    if (a === "-Y" && e[idx + 1] === "sign") {
      n = true;
      idx++;
    } else if (a === "-n") namespace = e[++idx];
    else if (a === "-f") keyFile = e[++idx];
    else if (a.startsWith("-")) {
      if (e[idx + 1] !== undefined && !e[idx + 1].startsWith("-")) idx++;
    } else if (t === undefined) t = a;
  }
  if (!n) throw Error(`code-sign: only SSH-style signing (-Y sign) is supported; got: ${e.join(" ")}`);
  if (!t) throw Error("code-sign: no file specified to sign");
  return {
    bufferFile: resolve(t),
    namespace,
    keyFile,
  };
}
//@ chunk-qcqdqsn4.js:16328-18217 placement
/**
 * 为会话配置 git 代理凭据助手
 */
async function configureGitProxyCredentialUnchecked(sshKeygenSignArgs, n) {
  let o = n.env.CLAUDE_CODE_REMOTE_SESSION_ID || n.env.CLAUDE_RUNNER_SESSION_ID?.replace(/^session_/, "cse_");
  let CLAUDE_CODE_SESSION_ACCESS_TOKEN = n.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
  let replaced = (
    n.env.ANTHROPIC_BASE_URL ||
    n.env.SESSION_INGRESS_URL ||
    n.env.CLAUDE_RUNNER_API_BASE_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!o || !SAFE_GIT_KEY_REGEX.test(o))
    throw Error(
      "code-sign: CLAUDE_CODE_REMOTE_SESSION_ID (child) / CLAUDE_RUNNER_SESSION_ID (lifecycle hook) is unset or malformed \u2014 " +
        "is this process a descendant of a runner-spawned session or hook?",
    );
  if (!CLAUDE_CODE_SESSION_ACCESS_TOKEN) throw Error("code-sign: CLAUDE_CODE_SESSION_ACCESS_TOKEN is unset");
  if (!replaced)
    throw Error(
      "code-sign: ANTHROPIC_BASE_URL (child) / CLAUDE_RUNNER_API_BASE_URL (lifecycle hook) is unset",
    );
  let contents = await readFile(sshKeygenSignArgs.bufferFile, "utf8");
  let gitObjectFormat = await readGitObjectFormat();
  let body = JSON.stringify({
    contents,
    source: {
      type: "git_repository",
    },
    git_object_format: gitObjectFormat,
  });
  let h = `${replaced}/v1/code/sessions/${o}/sign-commit`;
  let fn = await n.fetchFn(h, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-environment-runner-version": `shr-${
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
      authorization: `Bearer ${CLAUDE_CODE_SESSION_ACCESS_TOKEN}`,
    },
    body,
    ...getProxyFetchOptions({
      url: h,
    }),
    ...getTLSFetchOptions(undefined),
    signal: AbortSignal.timeout(30000),
  });
  if (!fn.ok) {
    let m = await fn.text().catch(() => "");
    throw Error(
      `code-sign: sign-commit returned HTTP ${fn.status}` + (m ? `: ${truncateWithEllipsis(m, 200)}` : ""),
    );
  }
  let body_2 = await fn.json();
  if (!body_2.signature) throw Error("code-sign: response missing signature");
  let u = `${sshKeygenSignArgs.bufferFile}.sig`;
  await writeFile(u, body_2.signature);
  return u;
}
//@ chunk-qcqdqsn4.js:18217-18422 placement
/**
 * 读取仓库对象格式 sha1/sha256
 */
async function readGitObjectFormat() {
  let { stdout, code } = await execFileNoThrow("git", ["rev-parse", "--show-object-format"], {
    useCwd: false,
    stdin: "ignore",
    stderr: "ignore",
    maxBuffer: 1048576,
  });
  return code === 0 && stdout.trim() === "sha256" ? "sha256" : "sha1";
}
//@ chunk-qcqdqsn4.js:18422-18481 placement
function truncateWithEllipsis(e, n) {
  return e.length > n ? e.slice(0, n) + "\u2026" : e;
}
//@ chunk-qcqdqsn4.js:18481-18672 placement
async function selfHostedRunnerCodeSignMain(e) {
  try {
    let sshKeygenSignArgs = parseSshKeygenSignArgs(e);
    await configureGitProxyCredentialUnchecked(sshKeygenSignArgs, {
      env: process.env,
      fetchFn: fetch,
    });
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
    process.exit(1);
  }
}
export {
  readGitVersion,
  parseGitVersion,
  configureGitGovernedEntries,
  relocateConfigureGitArtifacts,
  configureGitOverlayEntries,
  execFileAsync,
};
