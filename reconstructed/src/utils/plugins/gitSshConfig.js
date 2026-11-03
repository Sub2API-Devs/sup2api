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
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  delimiter,
  delimiter as delimiter_2,
  delimiter as delimiter_3,
  delimiter as delimiter_4,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
} from "fs/promises";
import { tmpdir } from "../tempDir.js";
import { logForDebugging } from "../debug.js";
import { readGitConfigScoped } from "../git/gitConfigFilters.js";
import { gitConfigEnvOf } from "../git/gitLanes.js";
import {
  getEnvVarCaseInsensitiveOnWindows,
  unknownSshCommandVariant,
  wrapWithCdCommand,
  xut,
  withGitNoPromptEnv,
  SMe,
  prepareGitWorkDir,
} from "../gitSafeExec.js";
import { getPlatform } from "../platform.js";
import { safeSpawn } from "../safeSpawn.js";
import { oSo } from "./pluginManifestRead.js";
import { isGitHubSshLikelyConfigured } from "./marketplaceManager.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { whichAsync } from "../which.js";

/**
 * 读取用户的 git ssh 设置，为插件与市场克隆生成临时 ssh 配置。
 */
//@ chunk-e6aww6q8.js:728195-729513 placement
async function resolveGitSshConfig(e) {
  if (e.startsWith("file://")) return {};
  let env = process.env,
    r = resolve_7(tmpdir()),
    s = r.includes(delimiter)
      ? void 0
      : await mkdtemp_2(join_26(r, "claude-ssh-config-")).catch(() => {
          return;
        });
  if (s === void 0)
    return (
      logForDebugging(
        `[plugins] could not read your git ssh settings: no private temporary directory could be made under ${r} (the path must not contain '${delimiter}'). Plugin and marketplace clones ignore your core.sshCommand and ssh.variant and use GIT_SSH_COMMAND, GIT_SSH or plain ssh. Set CLAUDE_CODE_TMPDIR to a usable directory to fix this.`,
        { level: "error" },
      ),
      {}
    );
  try {
    let h = await readGitConfigScoped(s, "^(core\\.sshcommand|ssh\\.variant)$", {
      envPins: { ...gitConfigEnvOf(env).env, GIT_CEILING_DIRECTORIES: r },
      base: env,
    });
    if (h === null)
      return (
        logForDebugging(
          "[plugins] could not read your git ssh settings (git config failed or timed out). Plugin and marketplace clones ignore your core.sshCommand and ssh.variant and use GIT_SSH_COMMAND, GIT_SSH or plain ssh.",
          { level: "error" },
        ),
        {}
      );
    let y = (Se) => h.findLast(([ke]) => ke === Se)?.[1],
      S = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_COMMAND"),
      w = S !== void 0 && S.trim() !== "" ? void 0 : y("core.sshcommand"),
      G = getEnvVarCaseInsensitiveOnWindows(env, "GIT_SSH_VARIANT") === void 0 ? y("ssh.variant") : void 0,
      q =
        getPlatform() === "windows" || (G !== void 0 && G !== "auto")
          ? void 0
          : unknownSshCommandVariant(env, w),
      Z = q !== void 0 && (await probeSshCommand(wrapWithCdCommand(xut(), q), env, s)) ? "ssh" : G;
    return { ...(w !== void 0 && { command: w }), ...(Z !== void 0 && { variant: Z }) };
  } finally {
    await rm_14(s, { recursive: !0, force: !0 }).catch(() => {});
  }
}
/**
 * 探测 ssh 命令是否可用：sh -c '<cmd> -G -o SendEnv=GIT_PROTOCOL example.invalid'，超时按进程组 SIGKILL，返回退出码是否为 0。
 */
//@ chunk-e6aww6q8.js:729513-729785 placement
async function probeSshCommand(e, n, r) {
  let s;
  try {
    s = safeSpawn("sh", ["-c", `${e} "$@"`, e, "-G", "-o", "SendEnv=GIT_PROTOCOL", "example.invalid"], {
      cwd: r,
      env: n,
      stdio: "ignore",
      detached: !0,
      windowsHide: !0,
    });
  } catch {
    return !1;
  }
  let h = setTimeout(killProcessGroup, oSo, s.pid),
    { exitCode: exitCode } = await s;
  return (clearTimeout(h), exitCode === 0);
}
//@ chunk-e6aww6q8.js:729785-729854 placement = killCaffeinate (1)
function killProcessGroup(e) {
  try {
    if (e !== void 0) process.kill(-e, "SIGKILL");
  } catch {}
}
//@ chunk-e6aww6q8.js:729854-729916 placement
function Eqs(e) {
  let n;
  return { notify: e, probeSsh: () => (n ??= isGitHubSshLikelyConfigured()) };
}
//@ chunk-e6aww6q8.js:729916-729984 placement
function zpe(e) {
  return `SSH not configured, cloning via HTTPS: ${e}`;
}
//@ chunk-e6aww6q8.js:729984-730052 placement
function yFt(e) {
  return `HTTPS clone failed, retrying with SSH: ${e}`;
}
//@ chunk-e6aww6q8.js:730052-731019 placement
async function readGitSshCommand(e, n, r, s) {
  let h = getPlatform() === "windows";
  if (h !== s) return !1;
  let y = withGitNoPromptEnv();
  if (
    getEnvVarCaseInsensitiveOnWindows(y, "GIT_SSH_COMMAND") !== void 0 ||
    getEnvVarCaseInsensitiveOnWindows(y, "GIT_SSH") !== void 0
  )
    return !1;
  let S = await resolveGitSshConfig(n);
  if (S.command !== void 0) return !1;
  let { pinArgs: pinArgs, env: env } = SMe(r, S),
    G = await execFileNoThrow(gitExe(), ["ls-remote", "--get-url", "--", n], {
      ...(await prepareGitWorkDir(r, env)),
      stdin: "ignore",
      timeout: 5000,
    });
  if (G.code !== 0 || G.stdout.trim() !== n)
    return (
      logForDebugging(
        `GitHub SSH URL is rewritten by git config, or git could not say (code=${G.code}): staying on SSH`,
      ),
      !1
    );
  if (h) {
    let Z = await execFileNoThrow(gitExe(), [...pinArgs, "ls-remote", "--", n], {
      ...(await prepareGitWorkDir(r, { ...env, GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND} -G >&2` })),
      stdin: "ignore",
      timeout: 5000,
    });
    return !Z.timedOut && hasDirectGitHubSshHost(Z.stderr);
  }
  if ((await e.probeSsh()) !== "not-configured") return !1;
  if ((await whichAsync("ssh")) === null) return !0;
  let q = await execFileNoThrow("ssh", ["-G", "git@github.com"], { cwd: xut(), timeout: 5000 });
  if (q.code === 0 && hasDirectGitHubSshHost(q.stdout)) return !0;
  return (
    logForDebugging(
      `ssh -G does not show git@github.com going straight to github.com (code=${q.code}): staying on SSH`,
    ),
    !1
  );
}
//@ chunk-e6aww6q8.js:731019-731184 placement
function hasDirectGitHubSshHost(e) {
  let mapped = e
    .split(
      `
`,
    )
    .map((r) => r.trim().toLowerCase());
  return (
    mapped.includes("hostname github.com") && !mapped.some((r) => /^proxy(command|jump)(?! none$)/.test(r))
  );
}
//@ chunk-e6aww6q8.js:731184-731294 placement
function isSshAuthFailureOutput(e) {
  return e.includes("Permission denied (publickey") || e.includes("Host key verification failed");
}

export { Eqs, resolveGitSshConfig, readGitSshCommand, isSshAuthFailureOutput, zpe, yFt };
