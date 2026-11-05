/**
 * services/selfHostedRunner/launcherHooks.ts
 *
 * 2.1.316 新增：自托管 runner 的启动器钩子（launcher_hooks）与会话 git 配置/提示文件准备
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (47)
 * attribution: placement 45, layout 2
 */
import { homedir, tmpdir } from "os";
import { join, dirname, basename } from "path";
import { stat, mkdtemp, readFile, rm, mkdir, unlink, writeFile, readdir, rename } from "fs/promises";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { loadRawTranscriptJsonl } from "../../components/Feedback.js";
import {
  LAUNCHER_HOOK_EVENTS,
  LAUNCHER_HOOK_FILENAME_PATTERN,
  MAX_REPO_NOT_FOUND_OUTPUT_BYTES,
  SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS,
  decodeSessionJwt,
} from "./sessionLaunch.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { withFsOpTimeout, withBoundedTimeout, BoundedTimeoutError } from "../../utils/boundedTimeout.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { writeFileAtomic, retryFsOpLong } from "../../utils/atomicPublishWrite.js";
import { CCR_GIT_DIR_NAME, isHooksDirSafe, isHostConfigSnapshotError } from "./hostConfigSnapshot.js";
import { relocateConfigureGitArtifacts, configureGitOverlayEntries } from "./configureGit.js";
import { writeNewFile } from "./governedGit.js";
import {
  LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
  lifecycleHookGpgProgramPins,
  CheckoutHookFailedError,
} from "../../selfHostedRunner/lifecycleHooks.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { MAX_SETTINGS_JSON_BYTES } from "../../utils/settings/settings.js";
import { getHttpStatus } from "../../selfHostedRunner/runnerApiErrors.js";
import { RepoSettingsRejectedError } from "./repoSettingsConfinement.js";
import { runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-asf5gh8x.js:65793-65935 placement
function envPositiveMs(envName) {
  let rawValue = getEnvVar(envName);
  if (rawValue === undefined || rawValue === "") return 0;
  let value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 2147483647);
}
//@ chunk-asf5gh8x.js:65935-65964 layout
function hasEnvVar(ms) {
  return !!getEnvVar(ms);
}
//@ chunk-asf5gh8x.js:65964-66001 layout
function getEnvVar(envName) {
  return process.env[envName];
}
//@ chunk-asf5gh8x.js:66001-66015 placement
var DEFAULT_STARTUP_TIMEOUT_MS = 900000;
//@ chunk-asf5gh8x.js:66015-66158 placement
function getStartupTimeoutMs() {
  let envSelfHostedRunnerStartupTimeoutMs = process.env.SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS;
  return envSelfHostedRunnerStartupTimeoutMs === undefined || envSelfHostedRunnerStartupTimeoutMs === ""
    ? DEFAULT_STARTUP_TIMEOUT_MS
    : envPositiveMs("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS");
}
//@ chunk-asf5gh8x.js:66158-66336 placement
function getDrainWaitMs() {
  let envSelfHostedRunnerDrainWaitMs = process.env.SELF_HOSTED_RUNNER_DRAIN_WAIT_MS;
  return envSelfHostedRunnerDrainWaitMs !== undefined && envSelfHostedRunnerDrainWaitMs !== ""
    ? envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_MS")
    : envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_BG_TASKS_MS");
}
//@ chunk-asf5gh8x.js:76968-77732 placement
/**
 * 校验服务器下发的 launcher_hooks：数组、事件名、文件名、重名、脚本大小。
 */
function validateLauncherHooks(hooks) {
  if (!Array.isArray(hooks)) return `launcher_hooks: not an array (got ${loadRawTranscriptJsonl(hooks)})`;
  let seenFilenames = new Set();
  for (let [index, hook] of hooks.entries()) {
    if (hook === null || typeof hook !== "object")
      return `launcher_hooks[${index}]: not an object (got ${loadRawTranscriptJsonl(hook)})`;
    if (typeof hook.event !== "string" || !LAUNCHER_HOOK_EVENTS.has(hook.event))
      return `launcher_hooks[${index}]: unknown event ${loadRawTranscriptJsonl(hook.event)}`;
    if (typeof hook.filename !== "string" || !LAUNCHER_HOOK_FILENAME_PATTERN.test(hook.filename))
      return `launcher_hooks[${index}]: invalid filename ${loadRawTranscriptJsonl(hook.filename)}`;
    let lower = hook.filename.toLowerCase();
    if (seenFilenames.has(lower))
      return `launcher_hooks[${index}]: duplicate filename ${jsonStringify(hook.filename)} (case-insensitive)`;
    seenFilenames.add(lower);
    let scriptBytes = typeof hook.script === "string" ? Buffer.byteLength(hook.script, "utf8") : 0;
    if (scriptBytes === 0 || scriptBytes > MAX_REPO_NOT_FOUND_OUTPUT_BYTES)
      return `launcher_hooks[${index}] ${jsonStringify(hook.filename)}: script size ${scriptBytes} out of range (1..${MAX_REPO_NOT_FOUND_OUTPUT_BYTES})`;
  }
  return;
}
//@ chunk-asf5gh8x.js:77732-78230 placement
/**
 * 启动器钩子与会话 github 准备的相关常量：MCP 配置文件名、空 MCP 配置、检出失败说明、各类超时与最低 git 版本。
 */
var CHECKOUT_DISPLAY_LIMIT = 2000;
var INGRESS_TOKEN_FILE_TIMEOUT_MS = 1e4;
var LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS = 60000;
var MCP_CONFIG_DELIVERED_JSON = "mcp-config.delivered.json";
var EMPTY_MCP_CONFIG_JSON = '{"mcpServers":{}}';
var CHECKOUT_FAILURE_NOTES = {
  rm_failed: {
    note: "; its partial checkout could not be removed and may remain visible to this session",
    sad: "context_source_checkout_cleanup_failed",
  },
  kept_prepared_twin: {
    note: "; its checkout path names an already-prepared repository (same name, different casing) and was left in place",
    sad: "context_source_checkout_kept_prepared_twin",
  },
};
var SIGKILL_DELAY_MS = 30000;
var HOOK_WORKDIR_TIMEOUT_MS = 60000;
var POST_HOOK_TIMEOUT_MS = 60000;
var TOKEN_FILE_POLL_MS = 5000;
var INGRESS_TOKEN_DEADLINE_MS = SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS + 3 * TOKEN_FILE_POLL_MS + 5000;
var PUSH_ON_RELEASE_TIMEOUT_MS = 30000;
var SETUP_STEP_DEADLINE_MS = 3000;
var MIN_GIT_VERSION_FOR_MOUNT = [2, 26];
//@ chunk-asf5gh8x.js:78230-78282 placement
/**
 * 会话 JWT 是否仍在有效期内。
 */
function isSessionJwtFresh(token, nowSeconds = Date.now() / 1000) {
  return (decodeSessionJwt(token) ?? 0) > nowSeconds;
}
//@ chunk-asf5gh8x.js:78282-78305 placement
/**
 * 恒返回 0 的占位实现（当前没有混合登录令牌）。
 */
function noHybridToken() {
  return 0;
}
//@ chunk-asf5gh8x.js:78305-78385 placement
/**
 * 使用自定义 OAuth 地址时给凭据标签加 -custom-oauth 后缀。
 */
function customOauthUrlSuffix(apiBaseUrl) {
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return "-custom-oauth";
  return "";
}
//@ chunk-asf5gh8x.js:78385-79830 placement
/**
 * 读取操作员 ~/.gitconfig 与 XDG git 配置，供会话 git 使用。
 */
async function snapshotOperatorGitConfig(onStatus) {
  let envGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
  let homeDir = process.env.HOME || homedir();
  let configHome = process.env.XDG_CONFIG_HOME || join(homeDir, ".config");
  let candidatePaths = envGitConfigGlobal
    ? [envGitConfigGlobal]
    : [join(configHome, "git", "config"), join(homeDir, ".gitconfig")];
  let entries = [];
  for (let configPath of candidatePaths) {
    try {
      await withFsOpTimeout(stat(configPath), `stat ${configPath}`);
    } catch (error) {
      if (!isENOENT(error))
        onStatus(
          `[runner] governed git: could not read ${configPath} for gitconfig seed (${error}); skipping it`,
        );
      continue;
    }
    try {
      let listed = await runGit(["config", "--file", configPath, "--list", "-z"]);
      for (let record of listed.split("\x00")) {
        if (!record) continue;
        let index = record.indexOf(`
`);
        let key = index === -1 ? record : record.slice(0, index);
        let value = index === -1 ? "true" : record.slice(index + 1);
        entries.push([key, value]);
      }
      onStatus(`[runner] governed git: captured gitconfig seed from ${configPath} (startup snapshot)`);
    } catch (error) {
      onStatus(
        `[runner] governed git: could not parse ${configPath} for gitconfig seed (${error}); skipping it`,
      );
    }
  }
  let filtered = entries.filter(([key, value]) => SAFE_GIT_CONFIG_KEYS(key, value));
  if (filtered.length < entries.length) {
    let gitConfigKeyFamily = (fullKey) => {
      let index = fullKey.indexOf(".");
      let index_2 = fullKey.lastIndexOf(".");
      return index === index_2 ? fullKey : `${fullKey.slice(0, index)}.*${fullKey.slice(index_2)}`;
    };
    let filtered = entries.filter(([key, value]) => !SAFE_GIT_CONFIG_KEYS(key, value));
    let sorted = normalizeCaseForComparison_2(filtered.map(([key]) => gitConfigKeyFamily(key))).sort();
    onStatus(
      `[runner] governed git: seed filter dropped ${filtered.length} non-allowlisted gitconfig entries (families: ${sorted.join(", ")})`,
    );
  }
  if (filtered.length === 0) return "";
  let seedDir;
  try {
    seedDir = await mkdtemp(join(tmpdir(), "ccr-govseed-"));
    let seedPath = join(seedDir, "seed.gitconfig");
    for (let [key, value] of filtered) await runGit(["config", "--file", seedPath, "--add", key, value]);
    return await withFsOpTimeout(readFile(seedPath, "utf8"), `read ${seedPath}`);
  } catch (error) {
    onStatus(
      `[runner] governed git: seed serialization failed (${error}); governed sessions seed an empty gitconfig`,
    );
    return "";
  } finally {
    if (seedDir)
      await rm(seedDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-asf5gh8x.js:79830-80273 placement
function SAFE_GIT_CONFIG_KEYS(key, value) {
  let lower = key.toLowerCase();
  if (lower.startsWith("user.")) return true;
  if (lower === "core.autocrlf" || lower === "core.safecrlf" || lower === "core.eol") return true;
  if (lower === "push.negotiate") return true;
  if (lower.startsWith("url.") && lower.endsWith(".insteadof")) {
    let sliced = key.slice(4, key.length - 10);
    return !/\/\/[^/]*@/.test(sliced);
  }
  if (lower.startsWith("alias.")) return !value.trimStart().startsWith("!");
  if (lower.startsWith("http.")) {
    let sliced = lower.slice(5);
    if (sliced.includes(".")) return false;
    return NON_PORTABLE_GIT_KEYS.has(sliced);
  }
  return false;
}
//@ chunk-asf5gh8x.js:80273-80345 placement
var NON_PORTABLE_GIT_KEYS = new Set(["postbuffer", "lowspeedlimit", "lowspeedtime", "version"]);
//@ chunk-asf5gh8x.js:80345-80931 placement
async function runGit(args) {
  return await new Promise((resolve, reject) => {
    let child = spawn("git", args, {
      cwd: undefined,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...cgroupSpawnOptions("helper"),
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => (stdout += String(data)));
    child.stderr?.on("data", (data) => (stderr += String(data)));
    let timer = setTimeout((proc) => proc.kill("SIGKILL"), SIGKILL_DELAY_MS, child);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (exitCode === 0) resolve(stdout);
      else
        reject(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `git ${args[0]} ${args[1] ?? ""} exited ${exitCode}: ${stderr.trim()}`,
            "git invocation for the governed per-session gitconfig failed",
          ),
        );
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
//@ chunk-asf5gh8x.js:80931-80972 placement
/**
 * 以 0600 权限原子地写入文件。
 */
async function writeFileAtomicDefaultMode(path, contents) {
  await writeFileAtomic(path, contents, 384);
}
//@ chunk-asf5gh8x.js:80972-81011 placement
/**
 * 会话 CCR git 的 hooks 目录路径。
 */
function hooksDirPath(configDir) {
  return join(configDir, "hooks", CCR_GIT_DIR_NAME);
}
//@ chunk-asf5gh8x.js:81011-82785 placement
/**
 * --configure-git：在会话目录生成受控 gitconfig、钩子桩与签名工件。
 */
async function materializeSessionGitConfig(options) {
  let { configDir, baseDir, hookStubs, signingArtifacts, onDebug, onStatus } = options;
  let hooksGitDir = hooksDirPath(configDir);
  if (signingArtifacts.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: code-sign artifacts must be present to materialize ${hooksGitDir} (got ${hookStubs.length} stubs, ${signingArtifacts.length} signing artifacts)`,
      "--configure-git: incomplete startup artifacts for the session-scoped git dir",
    );
  let hooksDir = join(configDir, "hooks");
  let checkHooksDirPlain = () =>
    isHooksDirSafe(configDir, onStatus).catch((error) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: could not inspect ${hooksDir} \u2014 ${error instanceof Error ? error.message : String(error)}`,
        "--configure-git: could not inspect configDir/hooks",
      );
    });
  let didCreateHooksGitDir = false;
  try {
    if (!(await checkHooksDirPlain())) {
      onStatus(
        `[runner:session] ${hooksDir} was not a plain directory \u2014 replaced it before materializing session-scoped git artifacts`,
      );
      await withFsOpTimeout(
        rm(hooksDir, {
          force: true,
        }),
        `rm ${hooksDir}`,
      );
    }
    await withFsOpTimeout(
      mkdir(hooksDir, {
        recursive: true,
        mode: 448,
      }),
      `mkdir ${hooksDir}`,
    );
    if (!(await checkHooksDirPlain()))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: ${hooksDir} is still not a plain directory after repair \u2014 refusing to materialize session-scoped git artifacts`,
        "--configure-git: configDir/hooks is not a plain directory",
      );
    await withFsOpTimeout(
      rm(hooksGitDir, {
        recursive: true,
        force: true,
      }),
      `rm ${hooksGitDir}`,
    );
    await withFsOpTimeout(
      mkdir(hooksGitDir, {
        mode: 448,
      }),
      `mkdir ${hooksGitDir}`,
    );
    didCreateHooksGitDir = true;
    if (hookStubs.length > 0)
      await withFsOpTimeout(
        mkdir(join(hooksGitDir, "git-hooks"), {
          mode: 448,
        }),
        `mkdir ${join(hooksGitDir, "git-hooks")}`,
      );
    let artifacts = [
      ...relocateConfigureGitArtifacts(signingArtifacts, baseDir, hooksGitDir),
      ...relocateConfigureGitArtifacts(hookStubs, baseDir, hooksGitDir).map((artifact) => ({
        ...artifact,
        mode: 493,
      })),
    ];
    for (let artifact of artifacts)
      await withFsOpTimeout(
        writeNewFile(artifact.path, artifact.content, artifact.mode),
        `write ${artifact.path}`,
      );
    onDebug(
      `[runner:session] materialized ${artifacts.length} session-scoped --configure-git artifacts under ${hooksGitDir}`,
    );
    return hooksGitDir;
  } catch (error) {
    if (didCreateHooksGitDir && (await isHooksDirSafe(configDir, onStatus).catch(() => false)))
      await withFsOpTimeout(
        rm(hooksGitDir, {
          recursive: true,
          force: true,
        }),
        `rm ${hooksGitDir}`,
      ).catch(() => {});
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: could not materialize session-scoped git artifacts under ${hooksGitDir} \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "--configure-git: could not materialize session-scoped git artifacts",
    );
  }
}
//@ chunk-asf5gh8x.js:82785-82851 placement
/**
 * 生成 core.hooksPath 条目（默认 /dev/null）。
 */
function hooksPathEntry(snapshot) {
  return ["core.hooksPath", snapshot?.hooksPath ?? "/dev/null"];
}
//@ chunk-asf5gh8x.js:82851-82958 placement
function sessionGitConfig(configDir, snapshot, paths = ALLOWED_SIGNING_PROGRAMS) {
  return [
    ...configureGitOverlayEntries(configDir).map(([key, value]) =>
      key === "core.hooksPath" ? hooksPathEntry(snapshot) : [key, value],
    ),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(paths, false),
  ];
}
//@ chunk-asf5gh8x.js:82958-83037 placement
/**
 * 取 git 覆盖条目，可选择去掉 core.hooksPath。
 */
function overlayEntriesWithoutHooks(configDir, dropHooksPath) {
  let entries = configureGitOverlayEntries(configDir);
  return dropHooksPath ? entries.filter(([key]) => key !== "core.hooksPath") : entries;
}
//@ chunk-asf5gh8x.js:83037-83120 placement
var ALLOWED_SIGNING_PROGRAMS = {
  gpg: "/usr/bin/gpg",
  gpgsm: "/usr/bin/gpgsm",
  sshKeygen: "/usr/bin/ssh-keygen",
};
//@ chunk-asf5gh8x.js:83120-83225 placement
function lifecycleHookGitConfig(snapshot, paths = ALLOWED_SIGNING_PROGRAMS) {
  return [
    hooksPathEntry(snapshot),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(paths, true),
    ["commit.gpgsign", "false"],
    ["tag.gpgsign", "false"],
  ];
}
//@ chunk-asf5gh8x.js:83225-84015 placement
/**
 * 校验并写入 launcher_hooks 脚本；失败时整组丢弃。
 */
async function installLauncherHooks(configDir, hooks, writtenPaths, onStatus) {
  let validationError = validateLauncherHooks(hooks);
  if (validationError !== undefined) {
    onStatus(
      `[runner:session] launcher_hooks validation failed \u2014 dropping (CCR deploy regression, session continues without CCR-supplied hooks): ${validationError}`,
    );
    logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_validation_failed");
    return;
  }
  let hooksByEvent = {};
  if (!(await isHooksDirSafe(configDir, onStatus))) {
    logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_hooksdir_not_plain_dir");
    return;
  }
  let launcherHooksDir = join(configDir, "hooks", ".ccr-launcher");
  await withFsOpTimeout(
    rm(launcherHooksDir, {
      recursive: true,
      force: true,
    }),
    `rm ${launcherHooksDir}`,
  );
  await withFsOpTimeout(
    mkdir(launcherHooksDir, {
      recursive: true,
      mode: 448,
    }),
    `mkdir ${launcherHooksDir}`,
  );
  for (let hook of hooks) {
    let hookPath = join(launcherHooksDir, hook.filename);
    writtenPaths.push(hookPath);
    await withFsOpTimeout(unlink(hookPath), `unlink ${hookPath}`).catch(() => {});
    await withFsOpTimeout(
      writeFile(hookPath, hook.script, {
        flag: "wx",
        mode: 448,
      }),
      `writeFile ${hookPath}`,
    );
    (hooksByEvent[hook.event] ??= []).push({
      matcher: "",
      hooks: [
        {
          type: "command",
          command: hookPath,
          args: [],
        },
      ],
    });
  }
  return hooksByEvent;
}
//@ chunk-asf5gh8x.js:84015-84912 placement
/**
 * 把服务器的 auto mode 列表写成 launcher-settings.json（超过 --settings 文件大小上限则不应用）。
 */
async function writeLauncherSettings(configDir, launcherConfig, writtenPaths, onDebug, onStatus) {
  let hooksByEvent =
    !Array.isArray(launcherConfig.hooks) || launcherConfig.hooks.length > 0
      ? await installLauncherHooks(configDir, launcherConfig.hooks, writtenPaths, onStatus)
      : undefined;
  let autoMode = launcherConfig.autoMode;
  let settingsJson = jsonStringify(
    {
      hooks: hooksByEvent,
      autoMode,
    },
    null,
    2,
  );
  if (autoMode !== undefined && Buffer.byteLength(settingsJson, "utf8") > MAX_SETTINGS_JSON_BYTES) {
    onStatus(
      `[runner:warn] the server's auto mode lists would take launcher-settings.json past the ${MAX_SETTINGS_JSON_BYTES}-byte limit on a --settings file, so none of them apply in this session. Launcher hooks are unaffected (a server-side fault: nothing on this runner needs changing)`,
    );
    autoMode = undefined;
    settingsJson = jsonStringify(
      {
        hooks: hooksByEvent,
      },
      null,
      2,
    );
  }
  if (hooksByEvent === undefined && autoMode === undefined) return;
  let settingsPath = join(configDir, "launcher-settings.json");
  writtenPaths.push(settingsPath);
  await withFsOpTimeout(unlink(settingsPath), `unlink ${settingsPath}`).catch(() => {});
  await withFsOpTimeout(
    writeFile(settingsPath, settingsJson, {
      flag: "wx",
      mode: 384,
    }),
    `writeFile ${settingsPath}`,
  );
  onDebug(
    `[runner:session] Wrote ${settingsPath} (${hooksByEvent === undefined ? "no" : Object.keys(hooksByEvent).length} launcher hook event(s), autoMode block ${autoMode === undefined ? "absent" : "present"})`,
  );
  return {
    settingsPath,
    hooksRegistered: hooksByEvent !== undefined,
    autoModeWritten: autoMode !== undefined,
  };
}
//@ chunk-asf5gh8x.js:84912-85093 placement
async function writeBestEffort(debugTokenDir, fileName, contents, onStatus) {
  try {
    await mkdir(debugTokenDir, {
      recursive: true,
      mode: 448,
    });
    await writeFile(`${debugTokenDir}/${fileName}`, contents, {
      mode: 384,
    });
  } catch (error) {
    onStatus(`[runner:debug] failed to write ${fileName} to ${debugTokenDir} (best-effort): ${error}`);
  }
}
//@ chunk-asf5gh8x.js:85093-85161 placement
function getToolServerConfigDir(baseDir, sessionId) {
  return join(baseDir, "_sessions", `${sessionId}.tool-server-config`);
}
//@ chunk-asf5gh8x.js:85161-85224 placement
function getSessionClaudeConfigDir(baseDir, sessionId) {
  return join(baseDir, "_sessions", `${sessionId}.claude-config`);
}
//@ chunk-asf5gh8x.js:85224-85285 placement
function getIngressTokenTempPrefix(baseDir, epoch) {
  return join(baseDir, `.session_ingress_token.e${epoch}`);
}
//@ chunk-asf5gh8x.js:85285-85345 placement
/**
 * 是否为不小于 1 的整数。
 */
function isPositiveInteger(value) {
  return value !== undefined && Number.isInteger(value) && value >= 1;
}
//@ chunk-asf5gh8x.js:85345-85378 placement
/**
 * 是否为大于 1 的正整数。
 */
function isGreaterThanOne(value) {
  return isPositiveInteger(value) && value > 1;
}
//@ chunk-asf5gh8x.js:85378-85725 placement
/**
 * 写会话 ingress 令牌文件（staged-file 方式）。
 */
async function writeSessionIngressTokenFile(
  tokenPath,
  token,
  onStatus,
  onStuck,
  tokenFileOpTimeoutMs = INGRESS_TOKEN_FILE_TIMEOUT_MS,
) {
  try {
    await withStuckTimeout(
      mkdir(dirname(tokenPath), {
        recursive: true,
        mode: 448,
      }),
      tokenFileOpTimeoutMs,
      "[runner:session] mkdir for session-ingress token file",
      onStuck,
    );
    await withStuckTimeout(
      writeFileAtomic(tokenPath, token, 384),
      tokenFileOpTimeoutMs,
      "[runner:session] write session-ingress token file",
      onStuck,
    );
    return true;
  } catch (error) {
    onStatus(
      `[runner:session] session-ingress token file write failed (staged-file fetches degraded): ${error}`,
    );
    return false;
  }
}
//@ chunk-asf5gh8x.js:85725-85869 placement
async function withStuckTimeout(promise, timeoutMs, label, onStuck) {
  let isSettled = false;
  promise.then(
    () => {
      isSettled = true;
    },
    () => {
      isSettled = true;
    },
  );
  try {
    return await withBoundedTimeout(promise, timeoutMs, label);
  } catch (error) {
    if (!isSettled)
      onStuck?.(
        promise.then(
          () => {},
          () => {},
        ),
      );
    throw error;
  }
}
//@ chunk-asf5gh8x.js:85869-86813 placement
/**
 * 删除会话 ingress 令牌文件并清扫残留临时文件。
 */
async function cleanupSessionIngressTokenFiles(
  tokenPath,
  onStatus,
  onStuck,
  tokenFileOpTimeoutMs = INGRESS_TOKEN_FILE_TIMEOUT_MS,
) {
  try {
    await withStuckTimeout(
      unlink(tokenPath),
      tokenFileOpTimeoutMs,
      "[runner:session] unlink session-ingress token file",
      onStuck,
    );
  } catch (error) {
    if (!isENOENT(error)) onStatus(`[runner:session] session-ingress token file cleanup failed: ${error}`);
  }
  let match = /\.session_ingress_token\.e(\d+)$/.exec(tokenPath);
  if (!match) {
    onStatus("[runner:session] token temp sweep skipped: target path has no parseable epoch");
    return;
  }
  let targetEpoch = Number(match[1]);
  let dir = dirname(tokenPath);
  try {
    let entries = await withStuckTimeout(
      readdir(dir),
      tokenFileOpTimeoutMs,
      "[runner:session] readdir for token temp sweep",
      onStuck,
    );
    for (let entry of entries) {
      if (!entry.startsWith(".session_ingress_token.")) continue;
      let match = /^\.session_ingress_token\.e(\d+)\.tmp\./.exec(entry);
      if (!match) {
        if (entry.includes(".tmp."))
          onStatus("[runner:session] token temp sweep skipped an unparseable sibling");
        continue;
      }
      if (Number(match[1]) > targetEpoch) continue;
      try {
        await withStuckTimeout(
          unlink(join(dir, entry)),
          tokenFileOpTimeoutMs,
          "[runner:session] unlink token temp file",
          onStuck,
        );
      } catch (error) {
        if (!isENOENT(error)) onStatus(`[runner:session] token temp sweep failed for a sibling: ${error}`);
      }
    }
  } catch (error) {
    if (!isENOENT(error)) onStatus(`[runner:session] token temp sweep readdir failed: ${error}`);
  }
}
//@ chunk-asf5gh8x.js:87114-87296 placement
async function serializeByKey(canonicalLocks, key, fn) {
  let previous = canonicalLocks.get(key) ?? Promise.resolve();
  let release;
  let promise = new Promise((resolve) => {
    release = resolve;
  });
  canonicalLocks.set(key, promise);
  await previous.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (canonicalLocks.get(key) === promise) canonicalLocks.delete(key);
  }
}
//@ chunk-asf5gh8x.js:87296-87310 placement
var DEFAULT_GIT_SLOTS = 2;
var DEFAULT_HOOK_SLOTS = 1;
//@ chunk-asf5gh8x.js:87310-87334 placement
/**
 * 并发槽位调度中表示「被取消」的错误。
 */
class SlotCancelledError extends Error {}
//@ chunk-asf5gh8x.js:87334-87385 placement
/**
 * 无法取得并发槽位时的占位句柄（take 恒 false，leave 空实现）。
 */
var NO_SLOTS_AVAILABLE = {
  take: () => Promise.resolve(false),
  leave: () => {},
};
//@ chunk-asf5gh8x.js:87385-88203 placement
/**
 * 按种类（hook/git）并发上限执行一组任务：git 任务等待前面的 hook 任务完成，一个失败后让排队任务放弃，最终抛出优先错误或返回全部结果。
 */
async function runWithSlots(kinds, limits, run, isPreferred = () => false) {
  let runningCounts = {
    hook: 0,
    git: 0,
  };
  let waiters = {
    hook: [],
    git: [],
  };
  let errors = [];
  let promises = [];
  let finishedFlags = [];
  let results = [];
  let runOneSlot = async (index) => {
    let kind = kinds[index];
    let holdsSlot = false;
    let leave = () => {
      if (!holdsSlot) return;
      holdsSlot = false;
      let wake = waiters[kind].shift();
      if (wake) wake(true);
      else runningCounts[kind]--;
    };
    let take = async () => {
      let waitedForHook = false;
      let pendingHooks =
        kind === "git"
          ? promises.filter(
              (hookPromise, otherIndex) =>
                otherIndex < index && kinds[otherIndex] === "hook" && !finishedFlags[otherIndex],
            )
          : [];
      if (pendingHooks.length > 0) {
        waitedForHook = true;
        await Promise.all(pendingHooks);
      }
      let hasSlot = errors.length === 0;
      if (hasSlot && runningCounts[kind] < limits[kind]) runningCounts[kind]++;
      else if (hasSlot) {
        waitedForHook = true;
        hasSlot = await new Promise((resolve) => waiters[kind].push(resolve));
        if (hasSlot && errors.length > 0) {
          holdsSlot = true;
          leave();
          hasSlot = false;
        }
      }
      if (!hasSlot) throw new SlotCancelledError();
      holdsSlot = true;
      return waitedForHook;
    };
    try {
      results[index] = await run(index, {
        take,
        leave,
      });
    } catch (error) {
      if (!(error instanceof SlotCancelledError)) {
        errors.push({
          index,
          error,
        });
        for (let waiter of [...waiters.hook, ...waiters.git]) waiter(false);
        waiters.hook.length = 0;
        waiters.git.length = 0;
      }
    } finally {
      leave();
      finishedFlags[index] = true;
    }
  };
  kinds.forEach((kind, index) => {
    promises.push(runOneSlot(index));
  });
  await Promise.all(promises);
  let sorted = errors.sort((left, right) => left.index - right.index);
  let chosen = sorted.find((failure) => isPreferred(failure.error)) ?? sorted[0];
  if (chosen) throw chosen.error;
  return results;
}
//@ chunk-asf5gh8x.js:88203-88694 placement
/**
 * 会话分支在远端不存在（多为合并后被删除）。
 */
class SourceRefNotFoundError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  repo;
  ref;
  constructor(repo, ref) {
    let subject = ref ? `The branch '${ref}'` : "The session's branch";
    super(
      `${subject} couldn't be found in the remote repository ${repo}. If it was never pushed, push it. If it was deleted after a merge, restore it from its pull request. Then send a new message, or start a new session from a branch that has been pushed. (couldn't find remote ref)`,
      "source ref not found on remote (branch deleted after merge)",
    );
    this.name = "SourceRefNotFoundError";
    this.repo = repo;
    this.ref = ref;
  }
}
//@ chunk-asf5gh8x.js:88694-88728 placement
var setupFailureKindSymbol = Symbol("setupFailureKind");
//@ chunk-asf5gh8x.js:88728-88886 placement
function tagFailureStage(error, value) {
  try {
    if (
      error !== null &&
      typeof error === "object" &&
      !(setupFailureKindSymbol in error) &&
      Object.isExtensible(error)
    )
      Object.defineProperty(error, setupFailureKindSymbol, {
        value,
        enumerable: false,
      });
  } catch {}
  return error;
}
//@ chunk-asf5gh8x.js:88886-90006 placement
/**
 * 准备阶段错误分类用的 errno 集合与仓库设置拒绝项到失败种类的映射。
 */
var FILESYSTEM_ERROR_CODES = new Set([
  "EACCES",
  "EPERM",
  "ENOENT",
  "ENOTDIR",
  "EISDIR",
  "EEXIST",
  "ENOTEMPTY",
  "ENOSPC",
  "EDQUOT",
  "EROFS",
  "EIO",
  "EMFILE",
  "ENFILE",
  "ELOOP",
  "ENAMETOOLONG",
  "EBUSY",
  "ETXTBSY",
  "EXDEV",
  "ESTALE",
  "EFBIG",
]);
var NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EAI_FAIL",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "EPIPE",
  "EPROTO",
  "ERR_SOCKET_CONNECTION_TIMEOUT",
  "ERR_NETWORK",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
]);
var REPO_SETTINGS_REJECTION_LABELS = {
  "permissions.additionalDirectories": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "permissions.allow": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "permissions.allow (bare write-tool rule)": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "permissions.allow (sandbox-arm projection)": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "sandbox.filesystem.allowWrite": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "sandbox.filesystem.allowRead": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "operator-posture override": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
  "scan-fs-error": "SETUP_FAILURE_KIND_FILESYSTEM_ERROR",
};
//@ chunk-asf5gh8x.js:90006-90302 placement
/**
 * 把准备阶段错误归类为 SETUP_FAILURE_KIND_*（文件系统、API、网络等）。
 */
function classifySetupFailure(error) {
  if (error instanceof BoundedTimeoutError || isHostConfigSnapshotError(error))
    return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  if (getHttpStatus(error) !== undefined) return "SETUP_FAILURE_KIND_ANTHROPIC_API_ERROR";
  let errnoCode = getErrnoCode(error);
  if (errnoCode !== undefined) {
    if (FILESYSTEM_ERROR_CODES.has(errnoCode)) return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
    if (NETWORK_ERROR_CODES.has(errnoCode)) return "SETUP_FAILURE_KIND_NETWORK_ERROR";
  }
  return;
}
//@ chunk-asf5gh8x.js:90302-90509 placement
function classifySourcePrepFailure(error) {
  let kind = "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  try {
    if (
      error !== null &&
      typeof error === "object" &&
      classifySetupFailure(error) === "SETUP_FAILURE_KIND_FILESYSTEM_ERROR"
    )
      kind = "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  } catch {}
  return tagFailureStage(error, kind);
}
//@ chunk-asf5gh8x.js:90509-90842 placement
function setupFailureKindOf(error) {
  if (error === null || typeof error !== "object") return "SETUP_FAILURE_KIND_OTHER";
  let taggedKind = error[setupFailureKindSymbol];
  if (taggedKind !== undefined) return taggedKind;
  if (error instanceof RepoSettingsRejectedError) return REPO_SETTINGS_REJECTION_LABELS[error.entry.kind];
  if (error instanceof SourceRefNotFoundError) return "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
  if (error instanceof CheckoutHookFailedError) return "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  return classifySetupFailure(error) ?? "SETUP_FAILURE_KIND_OTHER";
}
//@ chunk-asf5gh8x.js:90842-91638 placement
/**
 * --remove-session-state：把会话目录改名为 .removing- 后删除。
 */
async function removeSessionState(options) {
  let {
    sessionId,
    targets,
    onStatus,
    timeoutMs = LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
    label = "--remove-session-state",
    noDeleteInPlace = false,
  } = options;
  let removed = [];
  await Promise.allSettled(
    targets.map(async (target) => {
      let asidePath = join(dirname(target.path), `.removing-${basename(target.path)}-${randomUUID()}`);
      let currentPath = asidePath;
      let renamePromise = noDeleteInPlace
        ? retryFsOpLong(target.path, asidePath, rename)
        : rename(target.path, asidePath);
      let isSettled = false;
      renamePromise.then(
        () => (isSettled = true),
        () => (isSettled = true),
      );
      try {
        await withBoundedTimeout(renamePromise, timeoutMs, `rename ${target.path}`);
      } catch (error) {
        if (isENOENT(error)) {
          removed.push(target.path);
          return;
        }
        if (!isSettled || noDeleteInPlace) {
          onStatus(
            `[runner:session] ${sessionId}: ${label} could not set ${target.path} aside (${error}) \u2014 left for disk recycle${isSettled ? "" : ` (it may appear as ${asidePath})`}`,
          );
          return;
        }
        currentPath = target.path;
      }
      try {
        await withBoundedTimeout(
          rm(currentPath, {
            recursive: target.recursive,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          }),
          timeoutMs,
          `rm ${currentPath}`,
        );
        removed.push(target.path);
      } catch (error) {
        onStatus(
          `[runner:session] ${sessionId}: ${label} could not remove ${target.path}${currentPath === asidePath ? ` (set aside as ${asidePath})` : ""} \u2014 left for disk recycle: ${error}`,
        );
      }
    }),
  );
  return removed;
}

// The import cycle this module closes (8 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/selfHostedRunner/launcherHooks.js");
export {
  ALLOWED_SIGNING_PROGRAMS,
  isSessionJwtFresh,
  getSessionClaudeConfigDir,
  lifecycleHookGitConfig,
  INGRESS_TOKEN_DEADLINE_MS,
  getToolServerConfigDir,
  writeBestEffort,
  validateLauncherHooks,
  INGRESS_TOKEN_FILE_TIMEOUT_MS,
  isGreaterThanOne,
  getIngressTokenTempPrefix,
  LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
  writeSessionIngressTokenFile,
  customOauthUrlSuffix,
  materializeSessionGitConfig,
  sessionGitConfig,
  writeFileAtomicDefaultMode,
  overlayEntriesWithoutHooks,
  runGit,
  DEFAULT_GIT_SLOTS,
  serializeByKey,
  CHECKOUT_FAILURE_NOTES,
  SourceRefNotFoundError,
  classifySourcePrepFailure,
  runWithSlots,
  DEFAULT_HOOK_SLOTS,
  NO_SLOTS_AVAILABLE,
  MIN_GIT_VERSION_FOR_MOUNT,
  PUSH_ON_RELEASE_TIMEOUT_MS,
  tagFailureStage,
  EMPTY_MCP_CONFIG_JSON,
  MCP_CONFIG_DELIVERED_JSON,
  writeLauncherSettings,
  POST_HOOK_TIMEOUT_MS,
  CHECKOUT_DISPLAY_LIMIT,
  setupFailureKindOf,
  SETUP_STEP_DEADLINE_MS,
  removeSessionState,
  SIGKILL_DELAY_MS,
  cleanupSessionIngressTokenFiles,
  getStartupTimeoutMs,
  envPositiveMs,
  hasEnvVar,
  HOOK_WORKDIR_TIMEOUT_MS,
  getDrainWaitMs,
  noHybridToken,
  DEFAULT_STARTUP_TIMEOUT_MS,
  snapshotOperatorGitConfig,
};
