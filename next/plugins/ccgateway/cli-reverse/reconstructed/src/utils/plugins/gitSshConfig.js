/**
 * utils/plugins/gitSshConfig.ts
 *
 * 2.1.316 新增：git ssh 配置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, delimiter, join } from "path";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "../tempDir.js";
import { logForDebugging } from "../debug.js";
import { readGitConfigScoped } from "../git/gitConfigFilters.js";
import { gitConfigEnvOf } from "../git/gitLanes.js";
import {
  getEnvVarCaseInsensitiveOnWindows,
  unknownSshCommandVariant,
  wrapWithCdCommand,
  homeDirOrDefault,
  withGitNoPromptEnv,
  runGitWithCeilingDirs,
  prepareGitWorkDir,
} from "../gitSafeExec.js";
import { getPlatform } from "../platform.js";
import { safeSpawn } from "../safeSpawn.js";
import { GIT_PROBE_TIMEOUT_MS } from "./pluginManifestRead.js";
import { isGitHubSshLikelyConfigured } from "./marketplaceManager.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { whichAsync } from "../which.js";

//@ chunk-5xgkngpb.js:738718-740039 placement
/**
 * 读取用户的 git ssh 设置，为插件与市场克隆生成临时 ssh 配置。
 */
async function resolveGitSshConfig(remoteUrl) {
  if (remoteUrl.startsWith("file://")) return {};
  let env = process.env;
  let tempRoot = resolve_2(tmpdir());
  let tempDir = tempRoot.includes(delimiter)
    ? undefined
    : await mkdtemp(join(tempRoot, "claude-ssh-config-")).catch(() => {
        return;
      });
  if (tempDir === undefined) {
    logForDebugging(
      `[plugins] could not read your git ssh settings: no private temporary directory could be made under ${tempRoot} (the path must not contain '${delimiter}'). Plugin and marketplace clones ignore your core.sshCommand and ssh.variant and use GIT_SSH_COMMAND, GIT_SSH or plain ssh. Set CLAUDE_CODE_TMPDIR to a usable directory to fix this.`,
      {
        level: "error",
      },
    );
    return {};
  }
  try {
    let gitConfigScoped = await readGitConfigScoped(tempDir, "^(core\\.sshcommand|ssh\\.variant)$", {
      envPins: {
        ...gitConfigEnvOf(env).env,
        GIT_CEILING_DIRECTORIES: tempRoot,
      },
      base: env,
    });
    if (gitConfigScoped === null) {
      logForDebugging(
        "[plugins] could not read your git ssh settings (git config failed or timed out). Plugin and marketplace clones ignore your core.sshCommand and ssh.variant and use GIT_SSH_COMMAND, GIT_SSH or plain ssh.",
        {
          level: "error",
        },
      );
      return {};
    }
    let lookupKey = (key) => gitConfigScoped.findLast(([entryKey]) => entryKey === key)?.[1];
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_COMMAND");
    let sshCommand =
      envVarCaseInsensitiveOnWindows !== undefined && envVarCaseInsensitiveOnWindows.trim() !== ""
        ? undefined
        : lookupKey("core.sshcommand");
    let sshVariant =
      getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT") === undefined
        ? lookupKey("ssh.variant")
        : undefined;
    let detectedVariant =
      getPlatform() === "windows" || (sshVariant !== undefined && sshVariant !== "auto")
        ? undefined
        : unknownSshCommandVariant(env, sshCommand);
    let variant =
      detectedVariant !== undefined &&
      (await probeSshCommand(wrapWithCdCommand(homeDirOrDefault(), detectedVariant), env, tempDir))
        ? "ssh"
        : sshVariant;
    return {
      ...(sshCommand !== undefined && {
        command: sshCommand,
      }),
      ...(variant !== undefined && {
        variant,
      }),
    };
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:740039-740311 placement
/**
 * 探测 ssh 命令是否可用：sh -c '<cmd> -G -o SendEnv=GIT_PROTOCOL example.invalid'，超时按进程组 SIGKILL，返回退出码是否为 0。
 */
async function probeSshCommand(sshCommand, env, cwd) {
  let child;
  try {
    child = safeSpawn(
      "sh",
      ["-c", `${sshCommand} "$@"`, sshCommand, "-G", "-o", "SendEnv=GIT_PROTOCOL", "example.invalid"],
      {
        cwd,
        env,
        stdio: "ignore",
        detached: true,
        windowsHide: true,
      },
    );
  } catch {
    return false;
  }
  let timer = setTimeout(killProcessGroup, GIT_PROBE_TIMEOUT_MS, child.pid);
  let { exitCode } = await child;
  clearTimeout(timer);
  return exitCode === 0;
}
//@ chunk-5xgkngpb.js:740311-740380 placement (2.1.88 match: killCaffeinate, 1)
function killProcessGroup(pid) {
  try {
    if (pid !== undefined) process.kill(-pid, "SIGKILL");
  } catch {}
}
//@ chunk-5xgkngpb.js:740380-740442 placement
/**
 * sshCloneFallback：SSH 探测与降级提示。
 */
function sshCloneFallback(notify) {
  let probeResult;
  return {
    notify,
    probeSsh: () => (probeResult ??= isGitHubSshLikelyConfigured()),
  };
}
//@ chunk-5xgkngpb.js:740442-740510 placement
/**
 * sshNotConfiguredMessage：SSH 未配置改走 HTTPS 的说明。
 */
function sshNotConfiguredMessage(url) {
  return `SSH not configured, cloning via HTTPS: ${url}`;
}
//@ chunk-5xgkngpb.js:740510-740578 placement
/**
 * httpsFailedRetrySshMessage：HTTPS 失败改走 SSH 的说明。
 */
function httpsFailedRetrySshMessage(url) {
  return `HTTPS clone failed, retrying with SSH: ${url}`;
}
//@ chunk-5xgkngpb.js:740578-741548 placement
async function readGitSshCommand(fallback, remoteUrl, gitContext, isWindows) {
  let onWindows = getPlatform() === "windows";
  if (onWindows !== isWindows) return false;
  let noPromptEnv = withGitNoPromptEnv();
  if (
    getEnvVarCaseInsensitiveOnWindows(noPromptEnv, "GIT_SSH_COMMAND") !== undefined ||
    getEnvVarCaseInsensitiveOnWindows(noPromptEnv, "GIT_SSH") !== undefined
  )
    return false;
  let gitSshConfig = await resolveGitSshConfig(remoteUrl);
  if (gitSshConfig.command !== undefined) return false;
  let { pinArgs, env } = runGitWithCeilingDirs(gitContext, gitSshConfig);
  let urlResult = await execFileNoThrow(gitExe(), ["ls-remote", "--get-url", "--", remoteUrl], {
    ...(await prepareGitWorkDir(gitContext, env)),
    stdin: "ignore",
    timeout: 5000,
  });
  if (urlResult.code !== 0 || urlResult.stdout.trim() !== remoteUrl) {
    logForDebugging(
      `GitHub SSH URL is rewritten by git config, or git could not say (code=${urlResult.code}): staying on SSH`,
    );
    return false;
  }
  if (onWindows) {
    let probeResult = await execFileNoThrow(gitExe(), [...pinArgs, "ls-remote", "--", remoteUrl], {
      ...(await prepareGitWorkDir(gitContext, {
        ...env,
        GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND} -G >&2`,
      })),
      stdin: "ignore",
      timeout: 5000,
    });
    return !probeResult.timedOut && hasDirectGitHubSshHost(probeResult.stderr);
  }
  if ((await fallback.probeSsh()) !== "not-configured") return false;
  if ((await whichAsync("ssh")) === null) return true;
  let sshProbe = await execFileNoThrow("ssh", ["-G", "git@github.com"], {
    cwd: homeDirOrDefault(),
    timeout: 5000,
  });
  if (sshProbe.code === 0 && hasDirectGitHubSshHost(sshProbe.stdout)) return true;
  logForDebugging(
    `ssh -G does not show git@github.com going straight to github.com (code=${sshProbe.code}): staying on SSH`,
  );
  return false;
}
//@ chunk-5xgkngpb.js:741548-741713 placement
function hasDirectGitHubSshHost(output) {
  let mapped = output
    .split(
      `
`,
    )
    .map((line) => line.trim().toLowerCase());
  return (
    mapped.includes("hostname github.com") &&
    !mapped.some((line) => /^proxy(command|jump)(?! none$)/.test(line))
  );
}
//@ chunk-5xgkngpb.js:741713-741823 placement
function isSshAuthFailureOutput(stderr) {
  return stderr.includes("Permission denied (publickey") || stderr.includes("Host key verification failed");
}
export {
  resolveGitSshConfig,
  readGitSshCommand,
  isSshAuthFailureOutput,
  sshNotConfiguredMessage,
  httpsFailedRetrySshMessage,
  sshCloneFallback,
};
