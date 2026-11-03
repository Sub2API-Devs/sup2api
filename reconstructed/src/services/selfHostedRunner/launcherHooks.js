/**
 * services/selfHostedRunner/launcherHooks.ts
 *
 * 2.1.316 新增：自托管 runner 的启动器钩子（launcher_hooks）与会话 git 配置/提示文件准备
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (46)
 * attribution: placement 46
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
import { uniq } from "../../utils/collections.js";
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
import { SYSTEM_PROMPT_FILE_ARGS as SYSTEM_PROMPT_FILE_ARGS_2 } from "./childArgs.js";
import { RUNNER_DECLARES_ARG_KEY } from "./runnerDeclaration.js";
import { getHttpStatus } from "../../selfHostedRunner/runnerApiErrors.js";
import { RepoSettingsRejectedError } from "./repoSettingsConfinement.js";

//@ chunk-hm0ce8vc.js:67301-68065 placement
/**
 * 校验服务器下发的 launcher_hooks：数组、事件名、文件名、重名、脚本大小。
 */
function validateLauncherHooks(hooks) {
  if (!Array.isArray(hooks)) return `launcher_hooks: not an array (got ${loadRawTranscriptJsonl(hooks)})`;
  let n = new Set();
  for (let [r, s] of hooks.entries()) {
    if (s === null || typeof s !== "object")
      return `launcher_hooks[${r}]: not an object (got ${loadRawTranscriptJsonl(s)})`;
    if (typeof s.event !== "string" || !LAUNCHER_HOOK_EVENTS.has(s.event))
      return `launcher_hooks[${r}]: unknown event ${loadRawTranscriptJsonl(s.event)}`;
    if (typeof s.filename !== "string" || !LAUNCHER_HOOK_FILENAME_PATTERN.test(s.filename))
      return `launcher_hooks[${r}]: invalid filename ${loadRawTranscriptJsonl(s.filename)}`;
    let lower = s.filename.toLowerCase();
    if (n.has(lower))
      return `launcher_hooks[${r}]: duplicate filename ${jsonStringify(s.filename)} (case-insensitive)`;
    n.add(lower);
    let o = typeof s.script === "string" ? Buffer.byteLength(s.script, "utf8") : 0;
    if (o === 0 || o > MAX_REPO_NOT_FOUND_OUTPUT_BYTES)
      return `launcher_hooks[${r}] ${jsonStringify(s.filename)}: script size ${o} out of range (1..${MAX_REPO_NOT_FOUND_OUTPUT_BYTES})`;
  }
  return;
}
//@ chunk-hm0ce8vc.js:68065-68216 placement
function envPositiveMs(e) {
  let n = process.env[e];
  if (n === undefined || n === "") return 0;
  let r = Number(n);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return Math.min(r, 2147483647);
}
//@ chunk-hm0ce8vc.js:68216-68230 placement
var DEFAULT_STARTUP_TIMEOUT_MS = 900000;
//@ chunk-hm0ce8vc.js:68230-68373 placement
function getStartupTimeoutMs() {
  let envSelfHostedRunnerStartupTimeoutMs = process.env.SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS;
  return envSelfHostedRunnerStartupTimeoutMs === undefined || envSelfHostedRunnerStartupTimeoutMs === ""
    ? DEFAULT_STARTUP_TIMEOUT_MS
    : envPositiveMs("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS");
}
//@ chunk-hm0ce8vc.js:68373-68551 placement
function getDrainWaitMs() {
  let envSelfHostedRunnerDrainWaitMs = process.env.SELF_HOSTED_RUNNER_DRAIN_WAIT_MS;
  return envSelfHostedRunnerDrainWaitMs !== undefined && envSelfHostedRunnerDrainWaitMs !== ""
    ? envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_MS")
    : envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_BG_TASKS_MS");
}
//@ chunk-hm0ce8vc.js:68551-69049 placement
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
//@ chunk-hm0ce8vc.js:69049-69101 placement
/**
 * 会话 JWT 是否仍在有效期内。
 */
function isSessionJwtFresh(e, n = Date.now() / 1000) {
  return (decodeSessionJwt(e) ?? 0) > n;
}
//@ chunk-hm0ce8vc.js:69101-69124 placement
/**
 * 恒返回 0 的占位实现（当前没有混合登录令牌）。
 */
function noHybridToken() {
  return 0;
}
//@ chunk-hm0ce8vc.js:69124-69204 placement
/**
 * 使用自定义 OAuth 地址时给凭据标签加 -custom-oauth 后缀。
 */
function customOauthUrlSuffix(apiBaseUrl) {
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return "-custom-oauth";
  return "";
}
//@ chunk-hm0ce8vc.js:69204-70649 placement
/**
 * 读取操作员 ~/.gitconfig 与 XDG git 配置，供会话 git 使用。
 */
async function snapshotOperatorGitConfig(e) {
  let envGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
  let r = process.env.HOME || homedir();
  let s = process.env.XDG_CONFIG_HOME || join(r, ".config");
  let a = envGitConfigGlobal ? [envGitConfigGlobal] : [join(s, "git", "config"), join(r, ".gitconfig")];
  let o = [];
  for (let h of a) {
    try {
      await withFsOpTimeout(stat(h), `stat ${h}`);
    } catch (error) {
      if (!isENOENT(error))
        e(`[runner] governed git: could not read ${h} for gitconfig seed (${error}); skipping it`);
      continue;
    }
    try {
      let p = await runGit(["config", "--file", h, "--list", "-z"]);
      for (let S of p.split("\x00")) {
        if (!S) continue;
        let index = S.indexOf(`
`);
        let y = index === -1 ? S : S.slice(0, index);
        let v = index === -1 ? "true" : S.slice(index + 1);
        o.push([y, v]);
      }
      e(`[runner] governed git: captured gitconfig seed from ${h} (startup snapshot)`);
    } catch (error) {
      e(`[runner] governed git: could not parse ${h} for gitconfig seed (${error}); skipping it`);
    }
  }
  let filtered = o.filter(([h, p]) => SAFE_GIT_CONFIG_KEYS(h, p));
  if (filtered.length < o.length) {
    let h = (T) => {
      let index = T.indexOf(".");
      let index_2 = T.lastIndexOf(".");
      return index === index_2 ? T : `${T.slice(0, index)}.*${T.slice(index_2)}`;
    };
    let filtered = o.filter(([T, y]) => !SAFE_GIT_CONFIG_KEYS(T, y));
    let sorted = uniq(filtered.map(([T]) => h(T))).sort();
    e(
      `[runner] governed git: seed filter dropped ${filtered.length} non-allowlisted gitconfig entries (families: ${sorted.join(", ")})`,
    );
  }
  if (filtered.length === 0) return "";
  let u;
  try {
    u = await mkdtemp(join(tmpdir(), "ccr-govseed-"));
    let h = join(u, "seed.gitconfig");
    for (let [p, S] of filtered) await runGit(["config", "--file", h, "--add", p, S]);
    return await withFsOpTimeout(readFile(h, "utf8"), `read ${h}`);
  } catch (error) {
    e(
      `[runner] governed git: seed serialization failed (${error}); governed sessions seed an empty gitconfig`,
    );
    return "";
  } finally {
    if (u)
      await rm(u, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:70649-71092 placement
function SAFE_GIT_CONFIG_KEYS(e, n) {
  let lower = e.toLowerCase();
  if (lower.startsWith("user.")) return true;
  if (lower === "core.autocrlf" || lower === "core.safecrlf" || lower === "core.eol") return true;
  if (lower === "push.negotiate") return true;
  if (lower.startsWith("url.") && lower.endsWith(".insteadof")) {
    let sliced = e.slice(4, e.length - 10);
    return !/\/\/[^/]*@/.test(sliced);
  }
  if (lower.startsWith("alias.")) return !n.trimStart().startsWith("!");
  if (lower.startsWith("http.")) {
    let sliced = lower.slice(5);
    if (sliced.includes(".")) return false;
    return NON_PORTABLE_GIT_KEYS.has(sliced);
  }
  return false;
}
//@ chunk-hm0ce8vc.js:71092-71164 placement
var NON_PORTABLE_GIT_KEYS = new Set(["postbuffer", "lowspeedlimit", "lowspeedtime", "version"]);
//@ chunk-hm0ce8vc.js:71164-71750 placement
async function runGit(e) {
  return await new Promise((resolve, reject) => {
    let s = spawn("git", e, {
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
    let a = "";
    let o = "";
    s.stdout?.on("data", (u) => (a += String(u)));
    s.stderr?.on("data", (u) => (o += String(u)));
    let timer = setTimeout((u) => u.kill("SIGKILL"), SIGKILL_DELAY_MS, s);
    s.on("close", (u) => {
      clearTimeout(timer);
      if (u === 0) resolve(a);
      else
        reject(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `git ${e[0]} ${e[1] ?? ""} exited ${u}: ${o.trim()}`,
            "git invocation for the governed per-session gitconfig failed",
          ),
        );
    });
    s.on("error", (u) => {
      clearTimeout(timer);
      reject(u);
    });
  });
}
//@ chunk-hm0ce8vc.js:71750-71791 placement
/**
 * 以 0600 权限原子地写入文件。
 */
async function writeFileAtomicDefaultMode(e, n) {
  await writeFileAtomic(e, n, 384);
}
//@ chunk-hm0ce8vc.js:71791-71830 placement
/**
 * 会话 CCR git 的 hooks 目录路径。
 */
function hooksDirPath(configDir) {
  return join(configDir, "hooks", CCR_GIT_DIR_NAME);
}
//@ chunk-hm0ce8vc.js:71830-73604 placement
/**
 * --configure-git：在会话目录生成受控 gitconfig、钩子桩与签名工件。
 */
async function materializeSessionGitConfig(e) {
  let { configDir, baseDir, hookStubs, signingArtifacts, onDebug, onStatus } = e;
  let u = hooksDirPath(configDir);
  if (signingArtifacts.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: code-sign artifacts must be present to materialize ${u} (got ${hookStubs.length} stubs, ${signingArtifacts.length} signing artifacts)`,
      "--configure-git: incomplete startup artifacts for the session-scoped git dir",
    );
  let h = join(configDir, "hooks");
  let p = () =>
    isHooksDirSafe(configDir, onStatus).catch((error) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: could not inspect ${h} \u2014 ${error instanceof Error ? error.message : String(error)}`,
        "--configure-git: could not inspect configDir/hooks",
      );
    });
  let S = false;
  try {
    if (!(await p())) {
      onStatus(
        `[runner:session] ${h} was not a plain directory \u2014 replaced it before materializing session-scoped git artifacts`,
      );
      await withFsOpTimeout(
        rm(h, {
          force: true,
        }),
        `rm ${h}`,
      );
    }
    await withFsOpTimeout(
      mkdir(h, {
        recursive: true,
        mode: 448,
      }),
      `mkdir ${h}`,
    );
    if (!(await p()))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: ${h} is still not a plain directory after repair \u2014 refusing to materialize session-scoped git artifacts`,
        "--configure-git: configDir/hooks is not a plain directory",
      );
    await withFsOpTimeout(
      rm(u, {
        recursive: true,
        force: true,
      }),
      `rm ${u}`,
    );
    await withFsOpTimeout(
      mkdir(u, {
        mode: 448,
      }),
      `mkdir ${u}`,
    );
    S = true;
    if (hookStubs.length > 0)
      await withFsOpTimeout(
        mkdir(join(u, "git-hooks"), {
          mode: 448,
        }),
        `mkdir ${join(u, "git-hooks")}`,
      );
    let T = [
      ...relocateConfigureGitArtifacts(signingArtifacts, baseDir, u),
      ...relocateConfigureGitArtifacts(hookStubs, baseDir, u).map((y) => ({
        ...y,
        mode: 493,
      })),
    ];
    for (let y of T) await withFsOpTimeout(writeNewFile(y.path, y.content, y.mode), `write ${y.path}`);
    onDebug(`[runner:session] materialized ${T.length} session-scoped --configure-git artifacts under ${u}`);
    return u;
  } catch (error) {
    if (S && (await isHooksDirSafe(configDir, onStatus).catch(() => false)))
      await withFsOpTimeout(
        rm(u, {
          recursive: true,
          force: true,
        }),
        `rm ${u}`,
      ).catch(() => {});
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: could not materialize session-scoped git artifacts under ${u} \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "--configure-git: could not materialize session-scoped git artifacts",
    );
  }
}
//@ chunk-hm0ce8vc.js:73604-73670 placement
/**
 * 生成 core.hooksPath 条目（默认 /dev/null）。
 */
function hooksPathEntry(e) {
  return ["core.hooksPath", e?.hooksPath ?? "/dev/null"];
}
//@ chunk-hm0ce8vc.js:73670-73777 placement
function sessionGitConfig(e, operatorGitSnapshot, hookGitPrograms = ALLOWED_SIGNING_PROGRAMS) {
  return [
    ...configureGitOverlayEntries(e).map(([s, a]) =>
      s === "core.hooksPath" ? hooksPathEntry(operatorGitSnapshot) : [s, a],
    ),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(hookGitPrograms, false),
  ];
}
//@ chunk-hm0ce8vc.js:73777-73856 placement
/**
 * 取 git 覆盖条目，可选择去掉 core.hooksPath。
 */
function overlayEntriesWithoutHooks(e, n) {
  let r = configureGitOverlayEntries(e);
  return n ? r.filter(([s]) => s !== "core.hooksPath") : r;
}
//@ chunk-hm0ce8vc.js:73856-73939 placement
var ALLOWED_SIGNING_PROGRAMS = {
  gpg: "/usr/bin/gpg",
  gpgsm: "/usr/bin/gpgsm",
  sshKeygen: "/usr/bin/ssh-keygen",
};
//@ chunk-hm0ce8vc.js:73939-74044 placement
function lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms = ALLOWED_SIGNING_PROGRAMS) {
  return [
    hooksPathEntry(operatorGitSnapshot),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(hookGitPrograms, true),
    ["commit.gpgsign", "false"],
    ["tag.gpgsign", "false"],
  ];
}
//@ chunk-hm0ce8vc.js:74044-74834 placement
/**
 * 校验并写入 launcher_hooks 脚本；失败时整组丢弃。
 */
async function installLauncherHooks(e, hooks, r, s) {
  let a = validateLauncherHooks(hooks);
  if (a !== undefined) {
    s(
      `[runner:session] launcher_hooks validation failed \u2014 dropping (CCR deploy regression, session continues without CCR-supplied hooks): ${a}`,
    );
    logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_validation_failed");
    return;
  }
  let o = {};
  if (!(await isHooksDirSafe(e, s))) {
    logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_hooksdir_not_plain_dir");
    return;
  }
  let l = join(e, "hooks", ".ccr-launcher");
  await withFsOpTimeout(
    rm(l, {
      recursive: true,
      force: true,
    }),
    `rm ${l}`,
  );
  await withFsOpTimeout(
    mkdir(l, {
      recursive: true,
      mode: 448,
    }),
    `mkdir ${l}`,
  );
  for (let u of hooks) {
    let h = join(l, u.filename);
    r.push(h);
    await withFsOpTimeout(unlink(h), `unlink ${h}`).catch(() => {});
    await withFsOpTimeout(
      writeFile(h, u.script, {
        flag: "wx",
        mode: 448,
      }),
      `writeFile ${h}`,
    );
    (o[u.event] ??= []).push({
      matcher: "",
      hooks: [
        {
          type: "command",
          command: h,
          args: [],
        },
      ],
    });
  }
  return o;
}
//@ chunk-hm0ce8vc.js:74834-75731 placement
/**
 * 把服务器的 auto mode 列表写成 launcher-settings.json（超过 --settings 文件大小上限则不应用）。
 */
async function writeLauncherSettings(sessionClaudeConfigDir, n, r, onDebug, onStatus) {
  let o =
    !Array.isArray(n.hooks) || n.hooks.length > 0
      ? await installLauncherHooks(sessionClaudeConfigDir, n.hooks, r, onStatus)
      : undefined;
  let autoMode = n.autoMode;
  let u = jsonStringify(
    {
      hooks: o,
      autoMode,
    },
    null,
    2,
  );
  if (autoMode !== undefined && Buffer.byteLength(u, "utf8") > MAX_SETTINGS_JSON_BYTES) {
    onStatus(
      `[runner:warn] the server's auto mode lists would take launcher-settings.json past the ${MAX_SETTINGS_JSON_BYTES}-byte limit on a --settings file, so none of them apply in this session. Launcher hooks are unaffected (a server-side fault: nothing on this runner needs changing)`,
    );
    autoMode = undefined;
    u = jsonStringify(
      {
        hooks: o,
      },
      null,
      2,
    );
  }
  if (o === undefined && autoMode === undefined) return;
  let h = join(sessionClaudeConfigDir, "launcher-settings.json");
  r.push(h);
  await withFsOpTimeout(unlink(h), `unlink ${h}`).catch(() => {});
  await withFsOpTimeout(
    writeFile(h, u, {
      flag: "wx",
      mode: 384,
    }),
    `writeFile ${h}`,
  );
  onDebug(
    `[runner:session] Wrote ${h} (${o === undefined ? "no" : Object.keys(o).length} launcher hook event(s), autoMode block ${autoMode === undefined ? "absent" : "present"})`,
  );
  return {
    settingsPath: h,
    hooksRegistered: o !== undefined,
    autoModeWritten: autoMode !== undefined,
  };
}
//@ chunk-hm0ce8vc.js:75731-75912 placement
async function writeBestEffort(debugTokenDir, n, r, onStatus) {
  try {
    await mkdir(debugTokenDir, {
      recursive: true,
      mode: 448,
    });
    await writeFile(`${debugTokenDir}/${n}`, r, {
      mode: 384,
    });
  } catch (error) {
    onStatus(`[runner:debug] failed to write ${n} to ${debugTokenDir} (best-effort): ${error}`);
  }
}
//@ chunk-hm0ce8vc.js:75912-75980 placement
function getToolServerConfigDir(baseDir, n) {
  return join(baseDir, "_sessions", `${n}.tool-server-config`);
}
//@ chunk-hm0ce8vc.js:75980-76043 placement
function getSessionClaudeConfigDir(baseDir, n) {
  return join(baseDir, "_sessions", `${n}.claude-config`);
}
//@ chunk-hm0ce8vc.js:76043-76104 placement
function getIngressTokenTempPrefix(e, n) {
  return join(e, `.session_ingress_token.e${n}`);
}
//@ chunk-hm0ce8vc.js:76104-76164 placement
/**
 * 是否为不小于 1 的整数。
 */
function isPositiveInteger(e) {
  return e !== undefined && Number.isInteger(e) && e >= 1;
}
//@ chunk-hm0ce8vc.js:76164-76197 placement
/**
 * 是否为大于 1 的正整数。
 */
function isGreaterThanOne(e) {
  return isPositiveInteger(e) && e > 1;
}
//@ chunk-hm0ce8vc.js:76197-76544 placement
/**
 * 写会话 ingress 令牌文件（staged-file 方式）。
 */
async function writeSessionIngressTokenFile(
  e,
  n,
  onStatus,
  s,
  tokenFileOpTimeoutMs = INGRESS_TOKEN_FILE_TIMEOUT_MS,
) {
  try {
    await withStuckTimeout(
      mkdir(dirname(e), {
        recursive: true,
        mode: 448,
      }),
      tokenFileOpTimeoutMs,
      "[runner:session] mkdir for session-ingress token file",
      s,
    );
    await withStuckTimeout(
      writeFileAtomic(e, n, 384),
      tokenFileOpTimeoutMs,
      "[runner:session] write session-ingress token file",
      s,
    );
    return true;
  } catch (error) {
    onStatus(
      `[runner:session] session-ingress token file write failed (staged-file fetches degraded): ${error}`,
    );
    return false;
  }
}
//@ chunk-hm0ce8vc.js:76544-76688 placement
async function withStuckTimeout(e, n, r, s) {
  let a = false;
  e.then(
    () => {
      a = true;
    },
    () => {
      a = true;
    },
  );
  try {
    return await withBoundedTimeout(e, n, r);
  } catch (error) {
    if (!a)
      s?.(
        e.then(
          () => {},
          () => {},
        ),
      );
    throw error;
  }
}
//@ chunk-hm0ce8vc.js:76688-77632 placement
/**
 * 删除会话 ingress 令牌文件并清扫残留临时文件。
 */
async function cleanupSessionIngressTokenFiles(
  e,
  onStatus,
  r,
  tokenFileOpTimeoutMs = INGRESS_TOKEN_FILE_TIMEOUT_MS,
) {
  try {
    await withStuckTimeout(
      unlink(e),
      tokenFileOpTimeoutMs,
      "[runner:session] unlink session-ingress token file",
      r,
    );
  } catch (error) {
    if (!isENOENT(error)) onStatus(`[runner:session] session-ingress token file cleanup failed: ${error}`);
  }
  let match = /\.session_ingress_token\.e(\d+)$/.exec(e);
  if (!match) {
    onStatus("[runner:session] token temp sweep skipped: target path has no parseable epoch");
    return;
  }
  let o = Number(match[1]);
  let l = dirname(e);
  try {
    let u = await withStuckTimeout(
      readdir(l),
      tokenFileOpTimeoutMs,
      "[runner:session] readdir for token temp sweep",
      r,
    );
    for (let h of u) {
      if (!h.startsWith(".session_ingress_token.")) continue;
      let match = /^\.session_ingress_token\.e(\d+)\.tmp\./.exec(h);
      if (!match) {
        if (h.includes(".tmp.")) onStatus("[runner:session] token temp sweep skipped an unparseable sibling");
        continue;
      }
      if (Number(match[1]) > o) continue;
      try {
        await withStuckTimeout(
          unlink(join(l, h)),
          tokenFileOpTimeoutMs,
          "[runner:session] unlink token temp file",
          r,
        );
      } catch (error) {
        if (!isENOENT(error)) onStatus(`[runner:session] token temp sweep failed for a sibling: ${error}`);
      }
    }
  } catch (error) {
    if (!isENOENT(error)) onStatus(`[runner:session] token temp sweep readdir failed: ${error}`);
  }
}
//@ chunk-hm0ce8vc.js:77632-77907 placement
var CHILD_FORWARDED_FLAGS = new Set([
  "sdk-url",
  "resume",
  "print",
  "input-format",
  "output-format",
  "replay-user-messages",
  "debug-file",
  "mcp-config",
  "settings",
  ...SYSTEM_PROMPT_FILE_ARGS_2,
  "agents",
  RUNNER_DECLARES_ARG_KEY,
]);
var CHILD_EXTRA_FORWARDED_FLAGS = new Set(["add-dir", "setting-sources"]);
var LAUNCHER_ONLY_FLAGS = new Set([
  ...CHILD_FORWARDED_FLAGS,
  "deep-link-origin",
  "deep-link-cwd-b64",
  "worktree",
  "tmux",
]);
//@ chunk-hm0ce8vc.js:77907-78089 placement
async function serializeByKey(canonicalLocks, n, r) {
  let s = canonicalLocks.get(n) ?? Promise.resolve();
  let a;
  let promise = new Promise((resolve) => {
    a = resolve;
  });
  canonicalLocks.set(n, promise);
  await s.catch(() => {});
  try {
    return await r();
  } finally {
    a();
    if (canonicalLocks.get(n) === promise) canonicalLocks.delete(n);
  }
}
//@ chunk-hm0ce8vc.js:78089-78103 placement
var DEFAULT_GIT_SLOTS = 2;
var DEFAULT_HOOK_SLOTS = 1;
//@ chunk-hm0ce8vc.js:78103-78127 placement
/**
 * 并发槽位调度中表示「被取消」的错误。
 */
class SlotCancelledError extends Error {}
//@ chunk-hm0ce8vc.js:78127-78178 placement
/**
 * 无法取得并发槽位时的占位句柄（take 恒 false，leave 空实现）。
 */
var NO_SLOTS_AVAILABLE = {
  take: () => Promise.resolve(false),
  leave: () => {},
};
//@ chunk-hm0ce8vc.js:78178-78996 placement
/**
 * 按种类（hook/git）并发上限执行一组任务：git 任务等待前面的 hook 任务完成，一个失败后让排队任务放弃，最终抛出优先错误或返回全部结果。
 */
async function runWithSlots(kinds, limits, run, isPreferred = () => false) {
  let a = {
    hook: 0,
    git: 0,
  };
  let o = {
    hook: [],
    git: [],
  };
  let l = [];
  let u = [];
  let h = [];
  let p = [];
  let S = async (v) => {
    let w = kinds[v];
    let E = false;
    let A = () => {
      if (!E) return;
      E = false;
      let K = o[w].shift();
      if (K) K(true);
      else a[w]--;
    };
    let take = async () => {
      let K = false;
      let L = w === "git" ? u.filter((oe, ge) => ge < v && kinds[ge] === "hook" && !h[ge]) : [];
      if (L.length > 0) {
        K = true;
        await Promise.all(L);
      }
      let D = l.length === 0;
      if (D && a[w] < limits[w]) a[w]++;
      else if (D) {
        K = true;
        D = await new Promise((resolve) => o[w].push(resolve));
        if (D && l.length > 0) {
          E = true;
          A();
          D = false;
        }
      }
      if (!D) throw new SlotCancelledError();
      E = true;
      return K;
    };
    try {
      p[v] = await run(v, {
        take,
        leave: A,
      });
    } catch (error) {
      if (!(error instanceof SlotCancelledError)) {
        l.push({
          index: v,
          error,
        });
        for (let L of [...o.hook, ...o.git]) L(false);
        o.hook.length = 0;
        o.git.length = 0;
      }
    } finally {
      A();
      h[v] = true;
    }
  };
  kinds.forEach((kind, w) => {
    u.push(S(w));
  });
  await Promise.all(u);
  let sorted = l.sort((v, w) => v.index - w.index);
  let y = sorted.find((v) => isPreferred(v.error)) ?? sorted[0];
  if (y) throw y.error;
  return p;
}
//@ chunk-hm0ce8vc.js:78996-79487 placement
/**
 * 会话分支在远端不存在（多为合并后被删除）。
 */
class SourceRefNotFoundError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  repo;
  ref;
  constructor(repo, ref) {
    let r = ref ? `The branch '${ref}'` : "The session's branch";
    super(
      `${r} couldn't be found in the remote repository ${repo}. If it was never pushed, push it. If it was deleted after a merge, restore it from its pull request. Then send a new message, or start a new session from a branch that has been pushed. (couldn't find remote ref)`,
      "source ref not found on remote (branch deleted after merge)",
    );
    this.name = "SourceRefNotFoundError";
    this.repo = repo;
    this.ref = ref;
  }
}
//@ chunk-hm0ce8vc.js:79487-79521 placement
var setupFailureKindSymbol = Symbol("setupFailureKind");
//@ chunk-hm0ce8vc.js:79521-79679 placement
function tagFailureStage(e, value) {
  try {
    if (e !== null && typeof e === "object" && !(setupFailureKindSymbol in e) && Object.isExtensible(e))
      Object.defineProperty(e, setupFailureKindSymbol, {
        value,
        enumerable: false,
      });
  } catch {}
  return e;
}
//@ chunk-hm0ce8vc.js:79679-80799 placement
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
//@ chunk-hm0ce8vc.js:80799-81095 placement
/**
 * 把准备阶段错误归类为 SETUP_FAILURE_KIND_*（文件系统、API、网络等）。
 */
function classifySetupFailure(e) {
  if (e instanceof BoundedTimeoutError || isHostConfigSnapshotError(e))
    return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  if (getHttpStatus(e) !== undefined) return "SETUP_FAILURE_KIND_ANTHROPIC_API_ERROR";
  let errnoCode = getErrnoCode(e);
  if (errnoCode !== undefined) {
    if (FILESYSTEM_ERROR_CODES.has(errnoCode)) return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
    if (NETWORK_ERROR_CODES.has(errnoCode)) return "SETUP_FAILURE_KIND_NETWORK_ERROR";
  }
  return;
}
//@ chunk-hm0ce8vc.js:81095-81302 placement
function classifySourcePrepFailure(error) {
  let n = "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  try {
    if (
      error !== null &&
      typeof error === "object" &&
      classifySetupFailure(error) === "SETUP_FAILURE_KIND_FILESYSTEM_ERROR"
    )
      n = "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  } catch {}
  return tagFailureStage(error, n);
}
//@ chunk-hm0ce8vc.js:81302-81635 placement
function setupFailureKindOf(error) {
  if (error === null || typeof error !== "object") return "SETUP_FAILURE_KIND_OTHER";
  let n = error[setupFailureKindSymbol];
  if (n !== undefined) return n;
  if (error instanceof RepoSettingsRejectedError) return REPO_SETTINGS_REJECTION_LABELS[error.entry.kind];
  if (error instanceof SourceRefNotFoundError) return "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
  if (error instanceof CheckoutHookFailedError) return "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  return classifySetupFailure(error) ?? "SETUP_FAILURE_KIND_OTHER";
}
//@ chunk-hm0ce8vc.js:81635-82431 placement
/**
 * --remove-session-state：把会话目录改名为 .removing- 后删除。
 */
async function removeSessionState(e) {
  let {
    sessionId,
    targets,
    onStatus,
    timeoutMs = LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
    label = "--remove-session-state",
    noDeleteInPlace = false,
  } = e;
  let u = [];
  await Promise.allSettled(
    targets.map(async (target) => {
      let p = join(dirname(target.path), `.removing-${basename(target.path)}-${randomUUID()}`);
      let S = p;
      let T = noDeleteInPlace ? retryFsOpLong(target.path, p, rename) : rename(target.path, p);
      let y = false;
      T.then(
        () => (y = true),
        () => (y = true),
      );
      try {
        await withBoundedTimeout(T, timeoutMs, `rename ${target.path}`);
      } catch (error) {
        if (isENOENT(error)) {
          u.push(target.path);
          return;
        }
        if (!y || noDeleteInPlace) {
          onStatus(
            `[runner:session] ${sessionId}: ${label} could not set ${target.path} aside (${error}) \u2014 left for disk recycle${y ? "" : ` (it may appear as ${p})`}`,
          );
          return;
        }
        S = target.path;
      }
      try {
        await withBoundedTimeout(
          rm(S, {
            recursive: target.recursive,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          }),
          timeoutMs,
          `rm ${S}`,
        );
        u.push(target.path);
      } catch (error) {
        onStatus(
          `[runner:session] ${sessionId}: ${label} could not remove ${target.path}${S === p ? ` (set aside as ${p})` : ""} \u2014 left for disk recycle: ${error}`,
        );
      }
    }),
  );
  return u;
}
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
  CHILD_EXTRA_FORWARDED_FLAGS,
  CHILD_FORWARDED_FLAGS,
  envPositiveMs,
  HOOK_WORKDIR_TIMEOUT_MS,
  getDrainWaitMs,
  noHybridToken,
  DEFAULT_STARTUP_TIMEOUT_MS,
  snapshotOperatorGitConfig,
};
