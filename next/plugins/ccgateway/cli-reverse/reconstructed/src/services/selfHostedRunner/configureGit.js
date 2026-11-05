/**
 * services/selfHostedRunner/configureGit.ts
 *
 * 2.1.316 新增。self-hosted runner 的 --configure-git：配置签名、代理凭据助手与 coauthor hook，并给出操作员 git 配置警告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k0vx09kc.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-k0vx09kc.js:702-745 placement
/**
 * 把 execFile 包装成 promise 版本，用于 git 与 API 调用。
 */
var execFileAsync = promisify(execFile);
var SAFE_GIT_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;
var MIN_GIT_VERSION = [2, 34];
//@ chunk-k0vx09kc.js:745-854 placement
function parseGitVersion(output) {
  let match = /git version (\d+)\.(\d+)/.exec(output);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}
//@ chunk-k0vx09kc.js:854-949 placement
function isGitVersionSupported(output) {
  let gitVersion = parseGitVersion(output);
  if (gitVersion === null) return null;
  let [major, minor] = gitVersion;
  let [minMajor, minMinor] = MIN_GIT_VERSION;
  return major > minMajor || (major === minMajor && minor >= minMinor);
}
//@ chunk-k0vx09kc.js:949-2145 placement
async function configureGitForSigning(options) {
  let stdout = (
    await execFileAsync("git", ["--version"], {
      windowsHide: true,
    })
  ).stdout;
  let versionSupported = isGitVersionSupported(stdout);
  if (versionSupported === null)
    options.onStatus(
      `[runner:git] --configure-git: could not parse git version from "${stdout.trim()}"; proceeding without version check`,
    );
  else if (!versionSupported) {
    let [minMajor, minMinor] = MIN_GIT_VERSION;
    throw Error(
      `--configure-git requires git >= ${minMajor}.${minMinor} for SSH commit signing (found: ${stdout.trim()}). Upgrade git in your runner image, or omit --configure-git and manage git identity yourself`,
    );
  }
  let runnerDir = join(options.baseDir, ".runner");
  await mkdir(runnerDir, {
    recursive: true,
  });
  let codeSignPath = join(runnerDir, "code-sign");
  let pubKeyPath = join(runnerDir, "commit_signing_key.pub");
  let wrapperScript = codeSignWrapperScript(options.execPath);
  await writeFile(codeSignPath, wrapperScript, {
    mode: 493,
  });
  await chmod(codeSignPath, 493);
  await writeFile(pubKeyPath, "");
  let configEntries = [
    ["user.name", "Claude"],
    ["user.email", "noreply@anthropic.com"],
    ["gpg.format", "ssh"],
    ["gpg.ssh.program", codeSignPath],
    ["user.signingkey", pubKeyPath],
    ["commit.gpgsign", "true"],
    ["tag.gpgsign", "true"],
    ["push.negotiate", "true"],
  ];
  let configTarget = options.gitConfigPath ? ["--file", options.gitConfigPath] : ["--global"];
  for (let [configKey, configValue] of configEntries)
    await execFileAsync("git", ["config", ...configTarget, "--replace-all", configKey, configValue], {
      windowsHide: true,
    });
  options.onStatus(
    `[runner:git] --configure-git: identity=Claude <noreply@anthropic.com>, gpg.ssh.program=${codeSignPath}`,
  );
  let hookInstall = await installCoauthorHooks(runnerDir, configTarget, options.onStatus);
  return hookInstall.installed
    ? {
        shimPath: codeSignPath,
      }
    : {
        shimPath: codeSignPath,
        operatorHooksPath: hookInstall.existingHooksPath,
      };
}
//@ chunk-k0vx09kc.js:2145-2287 placement
function codeSignWrapperScript(execPath) {
  return `#!/bin/sh
BIN="$CLAUDE_RUNNER_CLAUDE_BIN"
[ -n "$BIN" ] || BIN='${shellQuote(execPath)}'
exec "$BIN" self-hosted-runner code-sign "$@"
`;
}
//@ chunk-k0vx09kc.js:2287-2437 placement
function codeSignArtifacts(baseDir, execPath) {
  let runnerDir = join(baseDir, ".runner");
  return [
    {
      path: join(runnerDir, "code-sign"),
      content: codeSignWrapperScript(execPath),
      mode: 493,
    },
    {
      path: join(runnerDir, "commit_signing_key.pub"),
      content: "",
      mode: 420,
    },
  ];
}
//@ chunk-k0vx09kc.js:2437-2480 placement
function configureGitGovernedEntries(baseDir) {
  return configureGitOverlayEntries(join(baseDir, ".runner"));
}
//@ chunk-k0vx09kc.js:2480-2785 placement
function configureGitOverlayEntries(runnerDir) {
  return [
    ["user.name", "Claude"],
    ["user.email", "noreply@anthropic.com"],
    ["user.signingkey", join(runnerDir, "commit_signing_key.pub")],
    ["gpg.format", "ssh"],
    ["gpg.ssh.program", join(runnerDir, "code-sign")],
    ["commit.gpgsign", "true"],
    ["tag.gpgsign", "true"],
    ["push.negotiate", "true"],
    ["core.hooksPath", join(runnerDir, "git-hooks")],
  ];
}
//@ chunk-k0vx09kc.js:2785-3012 placement
function relocateConfigureGitArtifacts(artifacts, baseDir, targetDir) {
  let runnerPrefix = join(baseDir, ".runner") + sep;
  return artifacts.map((artifact) => {
    if (!artifact.path.startsWith(runnerPrefix))
      throw Error("relocateConfigureGitArtifacts: artifact path is not under {baseDir}/.runner/");
    return {
      ...artifact,
      path: join(targetDir, artifact.path.slice(runnerPrefix.length)),
    };
  });
}
//@ chunk-k0vx09kc.js:3012-3122 placement
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
//@ chunk-k0vx09kc.js:3122-3247 placement
var GIT_PROXY_CRED_HELPER_CONTENT = `#!/bin/sh
test "$1" = get || exit 0
printf "username=unused\\npassword=%s\\n" "$CLAUDE_CODE_SESSION_ACCESS_TOKEN"
`;
//@ chunk-k0vx09kc.js:3247-3302 placement
function gitProxyCredHelperPath(baseDir) {
  return join(baseDir, ".runner", "git-proxy-cred");
}
//@ chunk-k0vx09kc.js:3302-3475 placement
function coauthorHookStubs(baseDir) {
  let hooksDir = join(baseDir, ".runner", "git-hooks");
  return [
    ...GIT_HOOK_NAMES.map((hookName) => ({
      path: join(hooksDir, hookName),
      content: COAUTHOR_HOOK_SCRIPT,
    })),
    ...["commit-msg", "prepare-commit-msg"].map((hookName) => ({
      path: join(hooksDir, hookName),
      content: COMMIT_MSG_HOOK_SCRIPT,
    })),
  ];
}
//@ chunk-k0vx09kc.js:3475-4214 placement
async function configureGitProxyCredential(options) {
  let replaced = options.apiBaseUrl.replace(/\/+$/, "");
  let apiHost;
  try {
    apiHost = new URL(replaced).host;
  } catch {
    throw Error(`--use-anthropic-git-proxy: apiBaseUrl is not a valid URL: ${replaced}`);
  }
  let runnerDir = join(options.baseDir, ".runner");
  await mkdir(runnerDir, {
    recursive: true,
  });
  let helperPath = gitProxyCredHelperPath(options.baseDir);
  await writeFile(helperPath, GIT_PROXY_CRED_HELPER_CONTENT, {
    mode: 448,
  });
  await chmod(helperPath, 448);
  let configTarget = options.gitConfigPath ? ["--file", options.gitConfigPath] : ["--global"];
  let configEntries = [
    [`credential.https://${apiHost}.helper`, `!'${shellQuote(helperPath)}'`],
    [`credential.https://${apiHost}.useHttpPath`, "false"],
    [`credential.https://${apiHost}.username`, "unused"],
    [`http.https://${apiHost}/.proactiveAuth`, "basic"],
  ];
  for (let [configKey, configValue] of configEntries)
    await execFileAsync("git", ["config", ...configTarget, "--replace-all", configKey, configValue], {
      windowsHide: true,
    });
  options.onStatus(
    `[runner:git] --use-anthropic-git-proxy: credential helper registered for https://${apiHost} (${helperPath})`,
  );
  return replaced;
}
//@ chunk-k0vx09kc.js:5148-5948 placement
/**
 * 读取 git --system 配置（含来源）
 */
async function readSystemGitConfig(envVars) {
  let output;
  try {
    output = (
      await execFileAsync("git", ["config", "--system", "--includes", "--show-origin", "-z", "--list"], {
        cwd: "/",
        windowsHide: true,
        timeout: GIT_CONFIG_TIMEOUT_MS,
        maxBuffer: 4194304,
        ...(envVars && {
          env: envVars,
        }),
      })
    ).stdout;
  } catch (error) {
    let caughtError = error;
    let failureDetail =
      getErrnoCode(error) ??
      (caughtError !== null && typeof caughtError === "object"
        ? typeof caughtError.signal === "string"
          ? `killed by ${caughtError.signal}${caughtError.killed === true ? ", timed out" : ""}`
          : caughtError.code !== undefined
            ? `exit ${String(caughtError.code)}`
            : "error"
        : "error");
    return {
      files: [],
      unverifiable: `the system configuration could not be listed (${failureDetail})`,
    };
  }
  let parts = output.split("\x00");
  let files = [];
  for (let partIndex = 0; partIndex + 1 < parts.length; partIndex += 2) {
    let filePath = stripFilePrefix(parts[partIndex]);
    if (!parts[partIndex].startsWith("file:") || !isNormalizedAbsolutePath(filePath))
      return {
        files,
        unverifiable: `git reports a source that is not a plainly spelled absolute file path (${quoteConfigValueForLog(filePath)}; write [include] paths absolute, without '.' or '..' components)`,
      };
    if (!files.includes(filePath)) files.push(filePath);
  }
  return {
    files,
  };
}
//@ chunk-k0vx09kc.js:5948-6175 placement
/**
 * 路径可写或由当前用户拥有
 */
async function isWritableOrOwned(startPath) {
  let currentPath = startPath;
  for (;;)
    try {
      await access(currentPath, constants.W_OK);
      return true;
    } catch (error) {
      if (isENOENT(error)) {
        let parentPath = dirname(currentPath);
        if (parentPath === currentPath) return false;
        currentPath = parentPath;
        continue;
      }
      let uid = process.getuid?.();
      if (uid !== undefined && uid !== 0)
        try {
          if ((await lstat(currentPath)).uid === uid) return true;
        } catch {}
      return false;
    }
}
//@ chunk-k0vx09kc.js:6175-6247 placement
var isWithinDir = (targetPath, baseDir) =>
  baseDir !== undefined &&
  baseDir !== "" &&
  (resolve(targetPath) === resolve(baseDir) || resolve(targetPath).startsWith(resolve(baseDir) + sep));
//@ chunk-k0vx09kc.js:6247-6933 placement
async function resolveHookGitPrograms(options) {
  let sessionReachable = options?.sessionReachable ?? isWritableOrOwned;
  let HOME = options?.env ? options.env.HOME : env.HOME;
  let PATH = options?.env ? options.env.PATH : env.PATH;
  let skippedPaths = [];
  let filtered = (PATH ?? "").split(delimiter).filter((dirEntry) => {
    if (dirEntry === "" || !isAbsolute(dirEntry)) return false;
    if (isWithinDir(dirEntry, HOME) || isWithinDir(dirEntry, options?.baseDir)) {
      skippedPaths.push(dirEntry);
      return false;
    }
    return true;
  });
  let findProgram = async (programName) => {
    for (let dirEntry of filtered) {
      let programPath = join(dirEntry, programName);
      try {
        await access(programPath, constants.X_OK);
      } catch {
        continue;
      }
      if (
        (await describeWritableChain(programPath, sessionReachable)) !== undefined ||
        (await describeWritableChain(dirEntry, sessionReachable)) !== undefined
      ) {
        skippedPaths.push(programPath);
        continue;
      }
      return programPath;
    }
    return;
  };
  let inertProgram = "/nonexistent-gpg";
  for (let falsePath of ["/bin/false", "/usr/bin/false"]) {
    try {
      await access(falsePath, constants.X_OK);
    } catch {
      continue;
    }
    if (
      (await describeWritableChain(falsePath, sessionReachable)) === undefined &&
      (await describeWritableChain(dirname(falsePath), sessionReachable)) === undefined
    ) {
      inertProgram = falsePath;
      break;
    }
  }
  let [gpgPath, gpgsmPath, sshKeygenPath] = await Promise.all([
    findProgram("gpg"),
    findProgram("gpgsm"),
    findProgram("ssh-keygen"),
  ]);
  return {
    gpg: gpgPath ?? inertProgram,
    gpgsm: gpgsmPath ?? inertProgram,
    sshKeygen: sshKeygenPath ?? inertProgram,
    inert: inertProgram,
    skipped: skippedPaths,
  };
}
//@ chunk-k0vx09kc.js:6933-7061 placement
function isRunnerHooksDir(hooksPath, runnerHooksDir) {
  let normalizePath = (targetPath) => resolve(targetPath).replace(/[\\/]+$/, "");
  return (
    (runnerHooksDir !== undefined && normalizePath(hooksPath) === normalizePath(runnerHooksDir)) ||
    normalizePath(hooksPath).endsWith(join(sep + ".runner", "git-hooks"))
  );
}
//@ chunk-k0vx09kc.js:7061-8876 placement
async function readOperatorGitSnapshot(options) {
  let sessionReachable = options?.sessionReachable ?? isWritableOrOwned;
  let systemConfigFiles = options?.systemConfigFiles ?? readSystemGitConfig;
  let HOME = options?.env ? options.env.HOME : env.HOME;
  function scopesWithValue(source) {
    return options?.lifecycleHooks ? getGitConfigScopesWithValue(source, options.env) : [];
  }
  let [
    { system: hooksPath, systemOrigin: hooksPathOrigin, global: globalHooksPath },
    sshCommandScopes,
    askPassScopes,
    lfsFilterScopes,
  ] = await Promise.all([
    readSystemAndGlobalGitConfigPath("core.hooksPath", options?.env),
    scopesWithValue("core.sshCommand"),
    scopesWithValue("core.askPass"),
    scopesWithValue("filter.lfs.clean"),
  ]);
  let isForeignHooksPath = (candidatePath) => candidatePath !== undefined && !isRunnerHooksDir(candidatePath);
  let snapshot = {
    ...(isForeignHooksPath(globalHooksPath) && {
      ignoredGlobalHooksPath: globalHooksPath,
    }),
    ...(sshCommandScopes.length > 0 && {
      sshCommandScopes,
    }),
    ...(askPassScopes.length > 0 && {
      askPassScopes,
    }),
    ...(lfsFilterScopes.length > 0 && {
      lfsFilterScopes,
    }),
  };
  if (isForeignHooksPath(hooksPath)) {
    let exclusionReason;
    if (hooksPathOrigin === undefined || !isNormalizedAbsolutePath(hooksPathOrigin))
      exclusionReason = `git does not report a plainly spelled absolute file path as its origin (${quoteConfigValueForLog(hooksPathOrigin ?? "")}) \u2014 cannot verify it is out of the sessions' reach`;
    else {
      let systemConfig = await systemConfigFiles(options?.env);
      if (systemConfig.unverifiable !== undefined)
        exclusionReason = `${systemConfig.unverifiable} \u2014 cannot verify it is out of the sessions' reach`;
      else if (!systemConfig.files.includes(hooksPathOrigin))
        exclusionReason = `the system configuration changed while it was being read (${quoteConfigValueForLog(hooksPathOrigin)} is no longer among its files) \u2014 cannot verify it is out of the sessions' reach`;
      else
        for (let file of systemConfig.files) {
          let lstatFailure = await lstat(file).then(
            () => {
              return;
            },
            (error) => getErrnoCode(error) ?? "error",
          );
          let writableReason =
            lstatFailure !== undefined
              ? `is listed by git but cannot be found as reported (${lstatFailure}) \u2014 cannot verify it is out of the sessions' reach`
              : await describeWritableChain(file, sessionReachable);
          if (writableReason !== undefined) {
            exclusionReason =
              file === hooksPathOrigin
                ? `it comes from ${quoteConfigValueForLog(file)}, which ${writableReason}`
                : `one of the files the system configuration reads, ${quoteConfigValueForLog(file)}, ${writableReason}`;
            break;
          }
        }
    }
    if (exclusionReason === undefined)
      if (!isAbsolute(hooksPath))
        exclusionReason = "it is relative (git would resolve it inside each repository)";
      else if (!isNormalizedAbsolutePath(hooksPath))
        exclusionReason = `it is not spelled as a plain absolute path (${quoteConfigValueForLog(hooksPath)}) \u2014 write it without '.' or '..' components`;
      else if (isWithinDir(hooksPath, HOME) || isWithinDir(hooksPath, options?.baseDir))
        exclusionReason = "it points under the runner HOME / --base-dir, which sessions can write";
      else {
        let chainReason = await describeWritableChain(hooksPath, sessionReachable);
        exclusionReason =
          chainReason !== undefined
            ? `its target directory ${chainReason}`
            : await findWritableEntryIn(hooksPath, sessionReachable);
      }
    if (exclusionReason === undefined) snapshot.hooksPath = hooksPath;
    else
      snapshot.ignoredSystemHooksPath = {
        value: hooksPath,
        reason: exclusionReason,
      };
  }
  return snapshot;
}
//@ chunk-k0vx09kc.js:8876-8886 placement
var MAX_WRITABLE_CHAIN_HOPS = 32;
//@ chunk-k0vx09kc.js:8886-9149 placement
/**
 * 找目录中可被 runner 用户写的条目
 */
async function findWritableEntryIn(dirPath, sessionReachable) {
  let names;
  try {
    names = (await readdir(dirPath)).sort();
  } catch (error) {
    return isENOENT(error)
      ? "its target directory does not exist"
      : `its target directory cannot be listed (${getErrnoCode(error) ?? "error"})`;
  }
  for (let entryName of names) {
    let writableReason = await describeWritableChain(join(dirPath, entryName), sessionReachable);
    if (writableReason !== undefined) return `${quoteConfigValueForLog(entryName)} in it ${writableReason}`;
  }
  return;
}
//@ chunk-k0vx09kc.js:9149-9928 placement
/**
 * 沿符号链接检查路径是否可被 runner 用户写
 */
async function describeWritableChain(
  startPath,
  sessionReachable,
  limits = {
    hops: MAX_WRITABLE_CHAIN_HOPS,
  },
) {
  let normalizedPath = stripTrailingSlashes(startPath);
  let currentPath = normalizedPath;
  for (;;) {
    if (await sessionReachable(currentPath))
      return currentPath === normalizedPath
        ? "is writable by (or belongs to) this runner's user"
        : `resolves to ${quoteConfigValueForLog(currentPath)}, which this runner's user can write or owns`;
    let isLink;
    try {
      isLink = (await lstat(currentPath)).isSymbolicLink();
    } catch (error) {
      if (currentPath === normalizedPath) {
        if (isENOENT(error)) return;
        return `cannot be examined (${getErrnoCode(error) ?? "error"})`;
      }
      return `is a link that does not resolve (${quoteConfigValueForLog(currentPath)})`;
    }
    if (!isLink) return;
    if (limits.hops <= 0) return "is a link with too many levels of indirection";
    limits.hops--;
    let linkTarget;
    try {
      linkTarget = await readlink(currentPath);
    } catch (error) {
      return `is a link that cannot be read (${getErrnoCode(error) ?? "error"})`;
    }
    currentPath = resolve(dirname(currentPath), linkTarget);
    let parentReason = await describeWritableChain(dirname(currentPath), sessionReachable, limits);
    if (parentReason !== undefined)
      return limits.hops <= 0
        ? `is a link with too many levels of indirection (through ${quoteConfigValueForLog(dirname(currentPath))})`
        : `resolves into ${quoteConfigValueForLog(dirname(currentPath))}, a directory that ${parentReason} (the target could be replaced)`;
  }
}
//@ chunk-k0vx09kc.js:9928-9947 placement
var FORMAT_CHAR_RE = /^\p{Cf}$/u;
//@ chunk-k0vx09kc.js:9947-10170 placement (2.1.88 match: needsWidthCompensation, 0.79)
function quoteConfigValueForLog(char) {
  let jsonText = jsonStringify(char);
  let safeText = "";
  for (let char of jsonText) {
    let cp = char.codePointAt(0);
    if ((cp >= 127 && cp <= 159) || cp === 8232 || cp === 8233 || FORMAT_CHAR_RE.test(char))
      for (let idx = 0; idx < char.length; idx++)
        safeText += `\\u${char.charCodeAt(idx).toString(16).padStart(4, "0")}`;
    else safeText += char;
  }
  return safeText;
}
//@ chunk-k0vx09kc.js:10170-13913 placement
/**
 * self-hosted runner 的 --configure-git：配置签名、代理凭据助手与 coauthor hook，并给出操作员 git 配置警告。
 */
function operatorGitSnapshotWarnings(
  snapshot,
  { isRoot, operatorSshInEnv = false, askpassSource = "none", postSessionHook = false, envHooksPath = false },
) {
  let warnings = [];
  if (snapshot.ignoredSystemHooksPath !== undefined) {
    let ignoredSystemHooksPath = snapshot.ignoredSystemHooksPath;
    warnings.push(
      `[runner:warn] the system git config sets core.hooksPath=${quoteConfigValueForLog(ignoredSystemHooksPath.value)}, which is NOT applied inside lifecycle hooks because ${ignoredSystemHooksPath.reason}. ` +
        (isRoot
          ? "This runner runs as root, so no configuration file is out of the sessions' reach: export it as a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment instead \u2014 and run the runner as an unprivileged user."
          : "Use an absolute path outside the runner's HOME/--base-dir in a root-owned file, naming a directory whose hook files are root-owned too (or export it as a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment)."),
    );
  }
  if (snapshot.ignoredGlobalHooksPath !== undefined)
    warnings.push(
      `[runner:warn] the global git config sets core.hooksPath=${quoteConfigValueForLog(snapshot.ignoredGlobalHooksPath)}, which is NOT applied inside lifecycle hooks (checkout / post-session): every session this runner hosts can write that file. Git run by those hooks takes core.hooksPath only from the system git config (git config --system) or from a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair exported in the runner's own environment; move it there if your hooks need it. The session's own git is unaffected.`,
    );
  if (snapshot.sshCommandScopes !== undefined && !operatorSshInEnv)
    warnings.push(
      `[runner:warn] core.sshCommand is set in the ${snapshot.sshCommandScopes.join(" and ")} git config but is NOT used inside lifecycle hooks (checkout / post-session): git run by those hooks uses plain ssh unless the runner's own environment sets GIT_SSH_COMMAND (or GIT_SSH). If your hooks reach git remotes over ssh and need that command (a deploy key, a jump host), copy its value into GIT_SSH_COMMAND in the runner's environment; if they do not, no action is needed. ` +
        (snapshot.sshCommandScopes.includes("global")
          ? "Copy only a command you set yourself: every session this runner hosts can write the global file. "
          : "") +
        "The session's own git is unaffected.",
    );
  if (snapshot.askPassScopes !== undefined && askpassSource !== "own")
    warnings.push(
      `[runner:warn] core.askPass is set in the ${snapshot.askPassScopes.join(" and ")} git config but is NOT used inside lifecycle hooks (checkout / post-session): git run by those hooks takes a credential-prompt program only from the runner's own environment, as GIT_ASKPASS (an SSH_ASKPASS there is handed on as GIT_ASKPASS) or as a core.askPass GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair. ` +
        (askpassSource === "handedOn"
          ? "Here hook git will use the SSH_ASKPASS program from the runner's environment in its place. "
          : "") +
        "If your hooks get https credentials from the program core.askPass names, copy its path into GIT_ASKPASS in the runner's environment; if they do not, no action is needed. " +
        (snapshot.askPassScopes.includes("global")
          ? "Copy only a path you set yourself: every session this runner hosts can write the global file. "
          : "") +
        "The session's own git is unaffected.",
    );
  if (
    snapshot.lfsFilterScopes !== undefined &&
    postSessionHook &&
    snapshot.hooksPath === undefined &&
    !envHooksPath
  )
    warnings.push(
      `[runner:warn] git-lfs is set up in the ${snapshot.lfsFilterScopes.join(" and ")} git config and this runner has a post-session hook. Git run inside the runner's lifecycle hooks runs no repository or global git hooks, so git-lfs's pre-push hook does not run there and a plain "git push" from the post-session hook sends LFS pointers WITHOUT their objects. The runner cannot see whether your hook already handles this: in it, run "git-lfs push <remote> <branch>" BEFORE "git push" (or "git-lfs push --all <remote> <branch>" after it), or point core.hooksPath, ${isRoot ? "as" : "in the system git config or as"} a GIT_CONFIG_KEY_n/GIT_CONFIG_VALUE_n pair in the runner's environment, at a root-owned directory that holds git-lfs's pre-push hook. The session's own git is unaffected.`,
    );
  return warnings;
}
//@ chunk-k0vx09kc.js:13913-14777 placement
/**
 * 安装 coauthor hook，已有 core.hooksPath 时拒绝
 */
async function installCoauthorHooks(baseDir, configTarget, onStatus) {
  let hooksDir = join(baseDir, "git-hooks");
  let existingHooksPath;
  if (configTarget[0] === "--file")
    existingHooksPath = await readGitConfigPath(configTarget, "core.hooksPath");
  else {
    let systemAndGlobalGitConfigPath = await readSystemAndGlobalGitConfigPath("core.hooksPath");
    existingHooksPath = systemAndGlobalGitConfigPath.global ?? systemAndGlobalGitConfigPath.system ?? "";
  }
  if (existingHooksPath !== "" && !isRunnerHooksDir(existingHooksPath, hooksDir)) {
    onStatus(
      `[runner:git] --configure-git: core.hooksPath already set (${quoteConfigValueForLog(existingHooksPath)}); skipping Co-authored-by hook install so existing hooks keep running for the session's own git (lifecycle ` +
        "hooks follow the system config / runner environment only \u2014 see " +
        "the lifecycle-hooks status line)",
    );
    return {
      installed: false,
      existingHooksPath,
    };
  }
  await mkdir(hooksDir, {
    recursive: true,
  });
  for (let hookName of GIT_HOOK_NAMES) {
    let hookPath = join(hooksDir, hookName);
    await writeFile(hookPath, COAUTHOR_HOOK_SCRIPT, {
      mode: 493,
    });
    await chmod(hookPath, 493);
  }
  for (let hookName of ["commit-msg", "prepare-commit-msg"]) {
    let hookPath = join(hooksDir, hookName);
    await writeFile(hookPath, COMMIT_MSG_HOOK_SCRIPT, {
      mode: 493,
    });
    await chmod(hookPath, 493);
  }
  await execFileAsync("git", ["config", ...configTarget, "--replace-all", "core.hooksPath", hooksDir], {
    windowsHide: true,
  });
  onStatus(`[runner:git] --configure-git: core.hooksPath=${hooksDir}`);
  return {
    installed: true,
  };
}
//@ chunk-k0vx09kc.js:14777-15823 placement
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
//@ chunk-k0vx09kc.js:15823-15868 placement (2.1.88 match: shellQuote, 1)
function shellQuote(s) {
  return s.replace(/'/g, "'\\''");
}
//@ chunk-k0vx09kc.js:15868-16328 placement
/**
 * 解析 ssh-keygen -Y sign 参数
 */
function parseSshKeygenSignArgs(argv) {
  let isSign = false;
  let namespace;
  let keyFile;
  let bufferFile;
  for (let idx = 0; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg === "-Y" && argv[idx + 1] === "sign") {
      isSign = true;
      idx++;
    } else if (arg === "-n") namespace = argv[++idx];
    else if (arg === "-f") keyFile = argv[++idx];
    else if (arg.startsWith("-")) {
      if (argv[idx + 1] !== undefined && !argv[idx + 1].startsWith("-")) idx++;
    } else if (bufferFile === undefined) bufferFile = arg;
  }
  if (!isSign)
    throw Error(`code-sign: only SSH-style signing (-Y sign) is supported; got: ${argv.join(" ")}`);
  if (!bufferFile) throw Error("code-sign: no file specified to sign");
  return {
    bufferFile: resolve(bufferFile),
    namespace,
    keyFile,
  };
}
//@ chunk-k0vx09kc.js:16328-18217 placement
/**
 * 为会话配置 git 代理凭据助手
 */
async function configureGitProxyCredentialUnchecked(sshKeygenSignArgs, options) {
  let sessionId =
    options.env.CLAUDE_CODE_REMOTE_SESSION_ID ||
    options.env.CLAUDE_RUNNER_SESSION_ID?.replace(/^session_/, "cse_");
  let CLAUDE_CODE_SESSION_ACCESS_TOKEN = options.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
  let replaced = (
    options.env.ANTHROPIC_BASE_URL ||
    options.env.SESSION_INGRESS_URL ||
    options.env.CLAUDE_RUNNER_API_BASE_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!sessionId || !SAFE_GIT_KEY_REGEX.test(sessionId))
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
  let endpointUrl = `${replaced}/v1/code/sessions/${sessionId}/sign-commit`;
  let fn = await options.fetchFn(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-environment-runner-version": `shr-${
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
      authorization: `Bearer ${CLAUDE_CODE_SESSION_ACCESS_TOKEN}`,
    },
    body,
    ...getProxyFetchOptions({
      url: endpointUrl,
    }),
    ...getTLSFetchOptions(undefined),
    signal: AbortSignal.timeout(30000),
  });
  if (!fn.ok) {
    let responseText = await fn.text().catch(() => "");
    throw Error(
      `code-sign: sign-commit returned HTTP ${fn.status}` +
        (responseText ? `: ${truncateWithEllipsis(responseText, 200)}` : ""),
    );
  }
  let body_2 = await fn.json();
  if (!body_2.signature) throw Error("code-sign: response missing signature");
  let sigPath = `${sshKeygenSignArgs.bufferFile}.sig`;
  await writeFile(sigPath, body_2.signature);
  return sigPath;
}
//@ chunk-k0vx09kc.js:18217-18422 placement
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
//@ chunk-k0vx09kc.js:18422-18481 placement
function truncateWithEllipsis(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) + "\u2026" : text;
}
//@ chunk-k0vx09kc.js:18481-18672 placement
async function selfHostedRunnerCodeSignMain(argv) {
  try {
    let sshKeygenSignArgs = parseSshKeygenSignArgs(argv);
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
  GIT_PROXY_CRED_HELPER_CONTENT,
  coauthorHookStubs,
  codeSignArtifacts,
  configureGitForSigning,
  configureGitProxyCredential,
  gitProxyCredHelperPath,
  operatorGitSnapshotWarnings,
  quoteConfigValueForLog,
  readOperatorGitSnapshot,
  resolveHookGitPrograms,
  selfHostedRunnerCodeSignMain,
};
