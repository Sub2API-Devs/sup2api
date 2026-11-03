/**
 * utils/plugins/gitSshConfig.ts
 *
 * 2.1.316 新增：git ssh 配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { resolve as resolve_2, delimiter, join } from "path";
import { mkdtemp, rm as rm_2 } from "fs/promises";
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

//@ chunk-e6aww6q8.js:728195-729513 placement
/**
 * 读取用户的 git ssh 设置，为插件与市场克隆生成临时 ssh 配置。
 */
async function resolveGitSshConfig(e) {
  if (e.startsWith("file://")) return {};
  let env = process.env;
  let r = resolve_2(tmpdir());
  let s = r.includes(delimiter)
    ? undefined
    : await mkdtemp(join(r, "claude-ssh-config-")).catch(() => {
        return;
      });
  if (s === undefined) {
    logForDebugging(
      `[plugins] could not read your git ssh settings: no private temporary directory could be made under ${r} (the path must not contain '${delimiter}'). Plugin and marketplace clones ignore your core.sshCommand and ssh.variant and use GIT_SSH_COMMAND, GIT_SSH or plain ssh. Set CLAUDE_CODE_TMPDIR to a usable directory to fix this.`,
      {
        level: "error",
      },
    );
    return {};
  }
  try {
    let gitConfigScoped = await readGitConfigScoped(s, "^(core\\.sshcommand|ssh\\.variant)$", {
      envPins: {
        ...gitConfigEnvOf(env).env,
        GIT_CEILING_DIRECTORIES: r,
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
    let y = (Se) => gitConfigScoped.findLast(([ke]) => ke === Se)?.[1];
    let envVarCaseInsensitiveOnWindows = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_COMMAND");
    let w =
      envVarCaseInsensitiveOnWindows !== undefined && envVarCaseInsensitiveOnWindows.trim() !== ""
        ? undefined
        : y("core.sshcommand");
    let G =
      getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT") === undefined ? y("ssh.variant") : undefined;
    let q =
      getPlatform() === "windows" || (G !== undefined && G !== "auto")
        ? undefined
        : unknownSshCommandVariant(env, w);
    let Z =
      q !== undefined && (await probeSshCommand(wrapWithCdCommand(homeDirOrDefault(), q), env, s))
        ? "ssh"
        : G;
    return {
      ...(w !== undefined && {
        command: w,
      }),
      ...(Z !== undefined && {
        variant: Z,
      }),
    };
  } finally {
    await rm_2(s, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:729513-729785 placement
/**
 * 探测 ssh 命令是否可用：sh -c '<cmd> -G -o SendEnv=GIT_PROTOCOL example.invalid'，超时按进程组 SIGKILL，返回退出码是否为 0。
 */
async function probeSshCommand(e, env, cwd) {
  let s;
  try {
    s = safeSpawn("sh", ["-c", `${e} "$@"`, e, "-G", "-o", "SendEnv=GIT_PROTOCOL", "example.invalid"], {
      cwd,
      env,
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
  } catch {
    return false;
  }
  let timer = setTimeout(killProcessGroup, GIT_PROBE_TIMEOUT_MS, s.pid);
  let { exitCode } = await s;
  clearTimeout(timer);
  return exitCode === 0;
}
//@ chunk-e6aww6q8.js:729785-729854 placement = killCaffeinate (1)
function killProcessGroup(e) {
  try {
    if (e !== undefined) process.kill(-e, "SIGKILL");
  } catch {}
}
//@ chunk-e6aww6q8.js:729854-729916 placement
/**
 * sshCloneFallback：SSH 探测与降级提示。
 */
function sshCloneFallback(notify) {
  let n;
  return {
    notify,
    probeSsh: () => (n ??= isGitHubSshLikelyConfigured()),
  };
}
//@ chunk-e6aww6q8.js:729916-729984 placement
/**
 * sshNotConfiguredMessage：SSH 未配置改走 HTTPS 的说明。
 */
function sshNotConfiguredMessage(e) {
  return `SSH not configured, cloning via HTTPS: ${e}`;
}
//@ chunk-e6aww6q8.js:729984-730052 placement
/**
 * httpsFailedRetrySshMessage：HTTPS 失败改走 SSH 的说明。
 */
function httpsFailedRetrySshMessage(e) {
  return `HTTPS clone failed, retrying with SSH: ${e}`;
}
//@ chunk-e6aww6q8.js:730052-731019 placement
async function readGitSshCommand(e, n, r, s) {
  let h = getPlatform() === "windows";
  if (h !== s) return false;
  let y = withGitNoPromptEnv();
  if (
    getEnvVarCaseInsensitiveOnWindows(y, "GIT_SSH_COMMAND") !== undefined ||
    getEnvVarCaseInsensitiveOnWindows(y, "GIT_SSH") !== undefined
  )
    return false;
  let gitSshConfig = await resolveGitSshConfig(n);
  if (gitSshConfig.command !== undefined) return false;
  let { pinArgs, env } = runGitWithCeilingDirs(r, gitSshConfig);
  let G = await execFileNoThrow(gitExe(), ["ls-remote", "--get-url", "--", n], {
    ...(await prepareGitWorkDir(r, env)),
    stdin: "ignore",
    timeout: 5000,
  });
  if (G.code !== 0 || G.stdout.trim() !== n) {
    logForDebugging(
      `GitHub SSH URL is rewritten by git config, or git could not say (code=${G.code}): staying on SSH`,
    );
    return false;
  }
  if (h) {
    let Z = await execFileNoThrow(gitExe(), [...pinArgs, "ls-remote", "--", n], {
      ...(await prepareGitWorkDir(r, {
        ...env,
        GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND} -G >&2`,
      })),
      stdin: "ignore",
      timeout: 5000,
    });
    return !Z.timedOut && hasDirectGitHubSshHost(Z.stderr);
  }
  if ((await e.probeSsh()) !== "not-configured") return false;
  if ((await whichAsync("ssh")) === null) return true;
  let q = await execFileNoThrow("ssh", ["-G", "git@github.com"], {
    cwd: homeDirOrDefault(),
    timeout: 5000,
  });
  if (q.code === 0 && hasDirectGitHubSshHost(q.stdout)) return true;
  logForDebugging(
    `ssh -G does not show git@github.com going straight to github.com (code=${q.code}): staying on SSH`,
  );
  return false;
}
//@ chunk-e6aww6q8.js:731019-731184 placement
function hasDirectGitHubSshHost(e) {
  let mapped = e
    .split(
      `
`,
    )
    .map((line) => line.trim().toLowerCase());
  return (
    mapped.includes("hostname github.com") && !mapped.some((r) => /^proxy(command|jump)(?! none$)/.test(r))
  );
}
//@ chunk-e6aww6q8.js:731184-731294 placement
function isSshAuthFailureOutput(e) {
  return e.includes("Permission denied (publickey") || e.includes("Host key verification failed");
}
export {
  sshCloneFallback,
  resolveGitSshConfig,
  readGitSshCommand,
  isSshAuthFailureOutput,
  sshNotConfiguredMessage,
  httpsFailedRetrySshMessage,
};
