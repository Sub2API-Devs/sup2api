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
import { homedir, homedir as homedir_2, homedir as homedir_3, tmpdir } from "os";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  basename,
  basename as basename_2,
  basename as basename_3,
} from "path";
import {
  stat,
  stat as stat_2,
  mkdtemp,
  mkdtemp as mkdtemp_2,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  writeFile,
  writeFile as writeFile_2,
  readdir,
  readdir as readdir_2,
  rename,
  rename as rename_2,
} from "fs/promises";
import { spawn } from "child_process";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { loadRawTranscriptJsonl } from "../../components/Feedback.js";
import { lc, LAUNCHER_HOOK_FILENAME_PATTERN, Od, fd, decodeSessionJwt } from "./sessionLaunch.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { z_, withBoundedTimeout, BoundedTimeoutError } from "../../utils/boundedTimeout.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { uniq } from "../../utils/collections.js";
import { Nd } from "../../utils/toolCgroup.js";
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
import { SYSTEM_PROMPT_FILE_ARGS } from "./childArgs.js";
import { RUNNER_DECLARES_ARG_KEY } from "./runnerDeclaration.js";
import { getHttpStatus } from "../../selfHostedRunner/runnerApiErrors.js";
import { RepoSettingsRejectedError } from "./repoSettingsConfinement.js";

/**
 * 校验服务器下发的 launcher_hooks：数组、事件名、文件名、重名、脚本大小。
 */
//@ chunk-hm0ce8vc.js:67301-68065 placement
function validateLauncherHooks(hooks) {
  if (!Array.isArray(hooks)) return `launcher_hooks: not an array (got ${loadRawTranscriptJsonl(hooks)})`;
  let n = new Set();
  for (let [r, s] of hooks.entries()) {
    if (s === null || typeof s !== "object")
      return `launcher_hooks[${r}]: not an object (got ${loadRawTranscriptJsonl(s)})`;
    if (typeof s.event !== "string" || !lc.has(s.event))
      return `launcher_hooks[${r}]: unknown event ${loadRawTranscriptJsonl(s.event)}`;
    if (typeof s.filename !== "string" || !LAUNCHER_HOOK_FILENAME_PATTERN.test(s.filename))
      return `launcher_hooks[${r}]: invalid filename ${loadRawTranscriptJsonl(s.filename)}`;
    let lower = s.filename.toLowerCase();
    if (n.has(lower))
      return `launcher_hooks[${r}]: duplicate filename ${jsonStringify(s.filename)} (case-insensitive)`;
    n.add(lower);
    let o = typeof s.script === "string" ? Buffer.byteLength(s.script, "utf8") : 0;
    if (o === 0 || o > Od)
      return `launcher_hooks[${r}] ${jsonStringify(s.filename)}: script size ${o} out of range (1..${Od})`;
  }
  return;
}
//@ chunk-hm0ce8vc.js:68065-68216 placement
function envPositiveMs(e) {
  let n = process.env[e];
  if (n === void 0 || n === "") return 0;
  let r = Number(n);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return Math.min(r, 2147483647);
}
//@ chunk-hm0ce8vc.js:68216-68230 placement
var si = 900000;
//@ chunk-hm0ce8vc.js:68230-68373 placement
function getStartupTimeoutMs() {
  let envSelfHostedRunnerStartupTimeoutMs = process.env.SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS;
  return envSelfHostedRunnerStartupTimeoutMs === void 0 || envSelfHostedRunnerStartupTimeoutMs === ""
    ? si
    : envPositiveMs("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS");
}
//@ chunk-hm0ce8vc.js:68373-68551 placement
function getDrainWaitMs() {
  let envSelfHostedRunnerDrainWaitMs = process.env.SELF_HOSTED_RUNNER_DRAIN_WAIT_MS;
  return envSelfHostedRunnerDrainWaitMs !== void 0 && envSelfHostedRunnerDrainWaitMs !== ""
    ? envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_MS")
    : envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_WAIT_BG_TASKS_MS");
}
//@ chunk-hm0ce8vc.js:68551-69049 placement
var CHECKOUT_DISPLAY_LIMIT = 2000,
  Sr = 1e4,
  Xr = 60000,
  MCP_CONFIG_DELIVERED_JSON = "mcp-config.delivered.json",
  Sc = '{"mcpServers":{}}',
  go = {
    rm_failed: {
      note: "; its partial checkout could not be removed and may remain visible to this session",
      sad: "context_source_checkout_cleanup_failed",
    },
    kept_prepared_twin: {
      note: "; its checkout path names an already-prepared repository (same name, different casing) and was left in place",
      sad: "context_source_checkout_kept_prepared_twin",
    },
  },
  Dr = 30000,
  Cd = 60000,
  $d = 60000,
  Ec = 5000,
  wc = fd + 3 * Ec + 5000,
  _s = 30000,
  Qd = 3000,
  Md = [2, 26];
//@ chunk-hm0ce8vc.js:69049-69101 placement
function vc(e, n = Date.now() / 1000) {
  return (decodeSessionJwt(e) ?? 0) > n;
}
//@ chunk-hm0ce8vc.js:69101-69124 placement
function vi() {
  return 0;
}
//@ chunk-hm0ce8vc.js:69124-69204 placement
function Rc(e) {
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return "-custom-oauth";
  return "";
}
/**
 * 读取操作员 ~/.gitconfig 与 XDG git 配置，供会话 git 使用。
 */
//@ chunk-hm0ce8vc.js:69204-70649 placement
async function snapshotOperatorGitConfig(e) {
  let envGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL,
    r = process.env.HOME || homedir_3(),
    s = process.env.XDG_CONFIG_HOME || join_4(r, ".config"),
    a = envGitConfigGlobal ? [envGitConfigGlobal] : [join_4(s, "git", "config"), join_4(r, ".gitconfig")],
    o = [];
  for (let h of a) {
    try {
      await z_(stat_2(h), `stat ${h}`);
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
`),
          y = index === -1 ? S : S.slice(0, index),
          v = index === -1 ? "true" : S.slice(index + 1);
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
        let index = T.indexOf("."),
          index_2 = T.lastIndexOf(".");
        return index === index_2 ? T : `${T.slice(0, index)}.*${T.slice(index_2)}`;
      },
      filtered = o.filter(([T, y]) => !SAFE_GIT_CONFIG_KEYS(T, y)),
      sorted = uniq(filtered.map(([T]) => h(T))).sort();
    e(
      `[runner] governed git: seed filter dropped ${filtered.length} non-allowlisted gitconfig entries (families: ${sorted.join(", ")})`,
    );
  }
  if (filtered.length === 0) return "";
  let u;
  try {
    u = await mkdtemp_2(join_4(tmpdir(), "ccr-govseed-"));
    let h = join_4(u, "seed.gitconfig");
    for (let [p, S] of filtered) await runGit(["config", "--file", h, "--add", p, S]);
    return await z_(readFile_3(h, "utf8"), `read ${h}`);
  } catch (error) {
    return (
      e(
        `[runner] governed git: seed serialization failed (${error}); governed sessions seed an empty gitconfig`,
      ),
      ""
    );
  } finally {
    if (u) await rm_3(u, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:70649-71092 placement
function SAFE_GIT_CONFIG_KEYS(e, n) {
  let lower = e.toLowerCase();
  if (lower.startsWith("user.")) return !0;
  if (lower === "core.autocrlf" || lower === "core.safecrlf" || lower === "core.eol") return !0;
  if (lower === "push.negotiate") return !0;
  if (lower.startsWith("url.") && lower.endsWith(".insteadof")) {
    let sliced = e.slice(4, e.length - 10);
    return !/\/\/[^/]*@/.test(sliced);
  }
  if (lower.startsWith("alias.")) return !n.trimStart().startsWith("!");
  if (lower.startsWith("http.")) {
    let sliced = lower.slice(5);
    if (sliced.includes(".")) return !1;
    return kc.has(sliced);
  }
  return !1;
}
//@ chunk-hm0ce8vc.js:71092-71164 placement
var kc = new Set(["postbuffer", "lowspeedlimit", "lowspeedtime", "version"]);
//@ chunk-hm0ce8vc.js:71164-71750 placement
async function runGit(e) {
  return await new Promise((n, r) => {
    let s = spawn("git", e, {
        cwd: void 0,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: !0,
        ...Nd("helper"),
        env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" },
      }),
      a = "",
      o = "";
    (s.stdout?.on("data", (u) => (a += String(u))), s.stderr?.on("data", (u) => (o += String(u))));
    let l = setTimeout((u) => u.kill("SIGKILL"), Dr, s);
    (s.on("close", (u) => {
      if ((clearTimeout(l), u === 0)) n(a);
      else
        r(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `git ${e[0]} ${e[1] ?? ""} exited ${u}: ${o.trim()}`,
            "git invocation for the governed per-session gitconfig failed",
          ),
        );
    }),
      s.on("error", (u) => {
        (clearTimeout(l), r(u));
      }));
  });
}
//@ chunk-hm0ce8vc.js:71750-71791 placement
async function Tc(e, n) {
  await writeFileAtomic(e, n, 384);
}
//@ chunk-hm0ce8vc.js:71791-71830 placement
function yc(e) {
  return join_4(e, "hooks", CCR_GIT_DIR_NAME);
}
/**
 * --configure-git：在会话目录生成受控 gitconfig、钩子桩与签名工件。
 */
//@ chunk-hm0ce8vc.js:71830-73604 placement
async function materializeSessionGitConfig(e) {
  let {
      configDir: configDir,
      baseDir: baseDir,
      hookStubs: hookStubs,
      signingArtifacts: signingArtifacts,
      onDebug: onDebug,
      onStatus: onStatus,
    } = e,
    u = yc(configDir);
  if (signingArtifacts.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: code-sign artifacts must be present to materialize ${u} (got ${hookStubs.length} stubs, ${signingArtifacts.length} signing artifacts)`,
      "--configure-git: incomplete startup artifacts for the session-scoped git dir",
    );
  let h = join_4(configDir, "hooks"),
    p = () =>
      isHooksDirSafe(configDir, onStatus).catch((T) => {
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `--configure-git: could not inspect ${h} \u2014 ${T instanceof Error ? T.message : String(T)}`,
          "--configure-git: could not inspect configDir/hooks",
        );
      }),
    S = !1;
  try {
    if (!(await p()))
      (onStatus(
        `[runner:session] ${h} was not a plain directory \u2014 replaced it before materializing session-scoped git artifacts`,
      ),
        await z_(rm_3(h, { force: !0 }), `rm ${h}`));
    if ((await z_(mkdir_4(h, { recursive: !0, mode: 448 }), `mkdir ${h}`), !(await p())))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `--configure-git: ${h} is still not a plain directory after repair \u2014 refusing to materialize session-scoped git artifacts`,
        "--configure-git: configDir/hooks is not a plain directory",
      );
    if (
      (await z_(rm_3(u, { recursive: !0, force: !0 }), `rm ${u}`),
      await z_(mkdir_4(u, { mode: 448 }), `mkdir ${u}`),
      (S = !0),
      hookStubs.length > 0)
    )
      await z_(mkdir_4(join_4(u, "git-hooks"), { mode: 448 }), `mkdir ${join_4(u, "git-hooks")}`);
    let T = [
      ...relocateConfigureGitArtifacts(signingArtifacts, baseDir, u),
      ...relocateConfigureGitArtifacts(hookStubs, baseDir, u).map((y) => ({ ...y, mode: 493 })),
    ];
    for (let y of T) await z_(writeNewFile(y.path, y.content, y.mode), `write ${y.path}`);
    return (
      onDebug(
        `[runner:session] materialized ${T.length} session-scoped --configure-git artifacts under ${u}`,
      ),
      u
    );
  } catch (error) {
    if (S && (await isHooksDirSafe(configDir, onStatus).catch(() => !1)))
      await z_(rm_3(u, { recursive: !0, force: !0 }), `rm ${u}`).catch(() => {});
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `--configure-git: could not materialize session-scoped git artifacts under ${u} \u2014 ${error instanceof Error ? error.message : String(error)}`,
      "--configure-git: could not materialize session-scoped git artifacts",
    );
  }
}
//@ chunk-hm0ce8vc.js:73604-73670 placement
function tu(e) {
  return ["core.hooksPath", e?.hooksPath ?? "/dev/null"];
}
//@ chunk-hm0ce8vc.js:73670-73777 placement
function sessionGitConfig(e, n, r = ALLOWED_SIGNING_PROGRAMS) {
  return [
    ...configureGitOverlayEntries(e).map(([s, a]) => (s === "core.hooksPath" ? tu(n) : [s, a])),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(r, !1),
  ];
}
//@ chunk-hm0ce8vc.js:73777-73856 placement
function Oc(e, n) {
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
function lifecycleHookGitConfig(e, n = ALLOWED_SIGNING_PROGRAMS) {
  return [
    tu(e),
    ...LIFECYCLE_HOOK_GIT_NEUTRAL_PINS,
    ...lifecycleHookGpgProgramPins(n, !0),
    ["commit.gpgsign", "false"],
    ["tag.gpgsign", "false"],
  ];
}
/**
 * 校验并写入 launcher_hooks 脚本；失败时整组丢弃。
 */
//@ chunk-hm0ce8vc.js:74044-74834 placement
async function installLauncherHooks(e, n, r, s) {
  let a = validateLauncherHooks(n);
  if (a !== void 0) {
    (s(
      `[runner:session] launcher_hooks validation failed \u2014 dropping (CCR deploy regression, session continues without CCR-supplied hooks): ${a}`,
    ),
      logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_validation_failed"));
    return;
  }
  let o = {};
  if (!(await isHooksDirSafe(e, s))) {
    logFeatureBad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_hooksdir_not_plain_dir");
    return;
  }
  let l = join_4(e, "hooks", ".ccr-launcher");
  (await z_(rm_3(l, { recursive: !0, force: !0 }), `rm ${l}`),
    await z_(mkdir_4(l, { recursive: !0, mode: 448 }), `mkdir ${l}`));
  for (let u of n) {
    let h = join_4(l, u.filename);
    (r.push(h),
      await z_(unlink_2(h), `unlink ${h}`).catch(() => {}),
      await z_(writeFile_2(h, u.script, { flag: "wx", mode: 448 }), `writeFile ${h}`),
      (o[u.event] ??= []).push({ matcher: "", hooks: [{ type: "command", command: h, args: [] }] }));
  }
  return o;
}
/**
 * 把服务器的 auto mode 列表写成 launcher-settings.json（超过 --settings 文件大小上限则不应用）。
 */
//@ chunk-hm0ce8vc.js:74834-75731 placement
async function writeLauncherSettings(e, n, r, s, a) {
  let o =
      !Array.isArray(n.hooks) || n.hooks.length > 0 ? await installLauncherHooks(e, n.hooks, r, a) : void 0,
    autoMode = n.autoMode,
    u = jsonStringify({ hooks: o, autoMode: autoMode }, null, 2);
  if (autoMode !== void 0 && Buffer.byteLength(u, "utf8") > MAX_SETTINGS_JSON_BYTES)
    (a(
      `[runner:warn] the server's auto mode lists would take launcher-settings.json past the ${MAX_SETTINGS_JSON_BYTES}-byte limit on a --settings file, so none of them apply in this session. Launcher hooks are unaffected (a server-side fault: nothing on this runner needs changing)`,
    ),
      (autoMode = void 0),
      (u = jsonStringify({ hooks: o }, null, 2)));
  if (o === void 0 && autoMode === void 0) return;
  let h = join_4(e, "launcher-settings.json");
  return (
    r.push(h),
    await z_(unlink_2(h), `unlink ${h}`).catch(() => {}),
    await z_(writeFile_2(h, u, { flag: "wx", mode: 384 }), `writeFile ${h}`),
    s(
      `[runner:session] Wrote ${h} (${o === void 0 ? "no" : Object.keys(o).length} launcher hook event(s), autoMode block ${autoMode === void 0 ? "absent" : "present"})`,
    ),
    { settingsPath: h, hooksRegistered: o !== void 0, autoModeWritten: autoMode !== void 0 }
  );
}
//@ chunk-hm0ce8vc.js:75731-75912 placement
async function writeBestEffort(e, n, r, s) {
  try {
    (await mkdir_4(e, { recursive: !0, mode: 448 }), await writeFile_2(`${e}/${n}`, r, { mode: 384 }));
  } catch (error) {
    s(`[runner:debug] failed to write ${n} to ${e} (best-effort): ${error}`);
  }
}
//@ chunk-hm0ce8vc.js:75912-75980 placement
function getToolServerConfigDir(e, n) {
  return join_4(e, "_sessions", `${n}.tool-server-config`);
}
//@ chunk-hm0ce8vc.js:75980-76043 placement
function getSessionClaudeConfigDir(e, n) {
  return join_4(e, "_sessions", `${n}.claude-config`);
}
//@ chunk-hm0ce8vc.js:76043-76104 placement
function getIngressTokenTempPrefix(e, n) {
  return join_4(e, `.session_ingress_token.e${n}`);
}
//@ chunk-hm0ce8vc.js:76104-76164 placement
function Nc(e) {
  return e !== void 0 && Number.isInteger(e) && e >= 1;
}
//@ chunk-hm0ce8vc.js:76164-76197 placement
function $c(e) {
  return Nc(e) && e > 1;
}
/**
 * 写会话 ingress 令牌文件（staged-file 方式）。
 */
//@ chunk-hm0ce8vc.js:76197-76544 placement
async function writeSessionIngressTokenFile(e, n, r, s, a = Sr) {
  try {
    return (
      await withStuckTimeout(
        mkdir_4(dirname_4(e), { recursive: !0, mode: 448 }),
        a,
        "[runner:session] mkdir for session-ingress token file",
        s,
      ),
      await withStuckTimeout(
        writeFileAtomic(e, n, 384),
        a,
        "[runner:session] write session-ingress token file",
        s,
      ),
      !0
    );
  } catch (error) {
    return (
      r(`[runner:session] session-ingress token file write failed (staged-file fetches degraded): ${error}`),
      !1
    );
  }
}
//@ chunk-hm0ce8vc.js:76544-76688 placement
async function withStuckTimeout(e, n, r, s) {
  let a = !1;
  e.then(
    () => {
      a = !0;
    },
    () => {
      a = !0;
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
/**
 * 删除会话 ingress 令牌文件并清扫残留临时文件。
 */
//@ chunk-hm0ce8vc.js:76688-77632 placement
async function cleanupSessionIngressTokenFiles(e, n, r, s = Sr) {
  try {
    await withStuckTimeout(unlink_2(e), s, "[runner:session] unlink session-ingress token file", r);
  } catch (error) {
    if (!isENOENT(error)) n(`[runner:session] session-ingress token file cleanup failed: ${error}`);
  }
  let match = /\.session_ingress_token\.e(\d+)$/.exec(e);
  if (!match) {
    n("[runner:session] token temp sweep skipped: target path has no parseable epoch");
    return;
  }
  let o = Number(match[1]),
    l = dirname_4(e);
  try {
    let u = await withStuckTimeout(readdir_2(l), s, "[runner:session] readdir for token temp sweep", r);
    for (let h of u) {
      if (!h.startsWith(".session_ingress_token.")) continue;
      let match = /^\.session_ingress_token\.e(\d+)\.tmp\./.exec(h);
      if (!match) {
        if (h.includes(".tmp.")) n("[runner:session] token temp sweep skipped an unparseable sibling");
        continue;
      }
      if (Number(match[1]) > o) continue;
      try {
        await withStuckTimeout(unlink_2(join_4(l, h)), s, "[runner:session] unlink token temp file", r);
      } catch (error) {
        if (!isENOENT(error)) n(`[runner:session] token temp sweep failed for a sibling: ${error}`);
      }
    }
  } catch (error) {
    if (!isENOENT(error)) n(`[runner:session] token temp sweep readdir failed: ${error}`);
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
    ...SYSTEM_PROMPT_FILE_ARGS,
    "agents",
    RUNNER_DECLARES_ARG_KEY,
  ]),
  Mc = new Set(["add-dir", "setting-sources"]),
  ev = new Set([...CHILD_FORWARDED_FLAGS, "deep-link-origin", "deep-link-cwd-b64", "worktree", "tmux"]);
//@ chunk-hm0ce8vc.js:77907-78089 placement
async function serializeByKey(e, n, r) {
  let s = e.get(n) ?? Promise.resolve(),
    a,
    promise = new Promise((l) => {
      a = l;
    });
  (e.set(n, promise), await s.catch(() => {}));
  try {
    return await r();
  } finally {
    if ((a(), e.get(n) === promise)) e.delete(n);
  }
}
//@ chunk-hm0ce8vc.js:78089-78103 placement
var Dc = 2,
  Lc = 1;
//@ chunk-hm0ce8vc.js:78103-78127 placement
class hi extends Error {}
//@ chunk-hm0ce8vc.js:78127-78178 placement
var Uc = { take: () => Promise.resolve(!1), leave: () => {} };
/**
 * 按种类（hook/git）并发上限执行一组任务：git 任务等待前面的 hook 任务完成，一个失败后让排队任务放弃，最终抛出优先错误或返回全部结果。
 */
//@ chunk-hm0ce8vc.js:78178-78996 placement
async function runWithSlots(kinds, limits, run, isPreferred = () => !1) {
  let a = { hook: 0, git: 0 },
    o = { hook: [], git: [] },
    l = [],
    u = [],
    h = [],
    p = [],
    S = async (v) => {
      let w = kinds[v],
        E = !1,
        A = () => {
          if (!E) return;
          E = !1;
          let K = o[w].shift();
          if (K) K(!0);
          else a[w]--;
        },
        G = async () => {
          let K = !1,
            L = w === "git" ? u.filter((oe, ge) => ge < v && kinds[ge] === "hook" && !h[ge]) : [];
          if (L.length > 0) ((K = !0), await Promise.all(L));
          let D = l.length === 0;
          if (D && a[w] < limits[w]) a[w]++;
          else if (D) {
            if (((K = !0), (D = await new Promise((oe) => o[w].push(oe))), D && l.length > 0))
              ((E = !0), A(), (D = !1));
          }
          if (!D) throw new hi();
          return ((E = !0), K);
        };
      try {
        p[v] = await run(v, { take: G, leave: A });
      } catch (error) {
        if (!(error instanceof hi)) {
          l.push({ index: v, error: error });
          for (let L of [...o.hook, ...o.git]) L(!1);
          ((o.hook.length = 0), (o.git.length = 0));
        }
      } finally {
        (A(), (h[v] = !0));
      }
    };
  (kinds.forEach((v, w) => {
    u.push(S(w));
  }),
    await Promise.all(u));
  let sorted = l.sort((v, w) => v.index - w.index),
    y = sorted.find((v) => isPreferred(v.error)) ?? sorted[0];
  if (y) throw y.error;
  return p;
}
/**
 * 会话分支在远端不存在（多为合并后被删除）。
 */
//@ chunk-hm0ce8vc.js:78996-79487 placement
class SourceRefNotFoundError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  repo;
  ref;
  constructor(e, n) {
    let r = n ? `The branch '${n}'` : "The session's branch";
    super(
      `${r} couldn't be found in the remote repository ${e}. If it was never pushed, push it. If it was deleted after a merge, restore it from its pull request. Then send a new message, or start a new session from a branch that has been pushed. (couldn't find remote ref)`,
      "source ref not found on remote (branch deleted after merge)",
    );
    ((this.name = "SourceRefNotFoundError"), (this.repo = e), (this.ref = n));
  }
}
//@ chunk-hm0ce8vc.js:79487-79521 placement
var pi = Symbol("setupFailureKind");
//@ chunk-hm0ce8vc.js:79521-79679 placement
function tagFailureStage(e, n) {
  try {
    if (e !== null && typeof e === "object" && !(pi in e) && Object.isExtensible(e))
      Object.defineProperty(e, pi, { value: n, enumerable: !1 });
  } catch {}
  return e;
}
//@ chunk-hm0ce8vc.js:79679-80799 placement
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
  ]),
  Gc = new Set([
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
  ]),
  Hc = {
    "permissions.additionalDirectories": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "permissions.allow": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "permissions.allow (bare write-tool rule)": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "permissions.allow (sandbox-arm projection)": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "sandbox.filesystem.allowWrite": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "sandbox.filesystem.allowRead": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "operator-posture override": "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED",
    "scan-fs-error": "SETUP_FAILURE_KIND_FILESYSTEM_ERROR",
  };
/**
 * 把准备阶段错误归类为 SETUP_FAILURE_KIND_*（文件系统、API、网络等）。
 */
//@ chunk-hm0ce8vc.js:80799-81095 placement
function classifySetupFailure(e) {
  if (e instanceof BoundedTimeoutError || isHostConfigSnapshotError(e))
    return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  if (getHttpStatus(e) !== void 0) return "SETUP_FAILURE_KIND_ANTHROPIC_API_ERROR";
  let n = getErrnoCode(e);
  if (n !== void 0) {
    if (FILESYSTEM_ERROR_CODES.has(n)) return "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
    if (Gc.has(n)) return "SETUP_FAILURE_KIND_NETWORK_ERROR";
  }
  return;
}
//@ chunk-hm0ce8vc.js:81095-81302 placement
function classifySourcePrepFailure(e) {
  let n = "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  try {
    if (
      e !== null &&
      typeof e === "object" &&
      classifySetupFailure(e) === "SETUP_FAILURE_KIND_FILESYSTEM_ERROR"
    )
      n = "SETUP_FAILURE_KIND_FILESYSTEM_ERROR";
  } catch {}
  return tagFailureStage(e, n);
}
//@ chunk-hm0ce8vc.js:81302-81635 placement
function setupFailureKindOf(e) {
  if (e === null || typeof e !== "object") return "SETUP_FAILURE_KIND_OTHER";
  let n = e[pi];
  if (n !== void 0) return n;
  if (e instanceof RepoSettingsRejectedError) return Hc[e.entry.kind];
  if (e instanceof SourceRefNotFoundError) return "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
  if (e instanceof CheckoutHookFailedError) return "SETUP_FAILURE_KIND_SOURCE_PREP_FAILED";
  return classifySetupFailure(e) ?? "SETUP_FAILURE_KIND_OTHER";
}
/**
 * --remove-session-state：把会话目录改名为 .removing- 后删除。
 */
//@ chunk-hm0ce8vc.js:81635-82431 placement
async function removeSessionState(e) {
  let {
      sessionId: sessionId,
      targets: targets,
      onStatus: onStatus,
      timeoutMs: timeoutMs = Xr,
      label: label = "--remove-session-state",
      noDeleteInPlace: noDeleteInPlace = !1,
    } = e,
    u = [];
  return (
    await Promise.allSettled(
      targets.map(async (h) => {
        let p = join_4(dirname_4(h.path), `.removing-${basename_3(h.path)}-${randomUUID_2()}`),
          S = p,
          T = noDeleteInPlace ? retryFsOpLong(h.path, p, rename_2) : rename_2(h.path, p),
          y = !1;
        T.then(
          () => (y = !0),
          () => (y = !0),
        );
        try {
          await withBoundedTimeout(T, timeoutMs, `rename ${h.path}`);
        } catch (error) {
          if (isENOENT(error)) {
            u.push(h.path);
            return;
          }
          if (!y || noDeleteInPlace) {
            onStatus(
              `[runner:session] ${sessionId}: ${label} could not set ${h.path} aside (${error}) \u2014 left for disk recycle${y ? "" : ` (it may appear as ${p})`}`,
            );
            return;
          }
          S = h.path;
        }
        try {
          (await withBoundedTimeout(
            rm_3(S, { recursive: h.recursive, force: !0, maxRetries: 3, retryDelay: 100 }),
            timeoutMs,
            `rm ${S}`,
          ),
            u.push(h.path));
        } catch (error) {
          onStatus(
            `[runner:session] ${sessionId}: ${label} could not remove ${h.path}${S === p ? ` (set aside as ${p})` : ""} \u2014 left for disk recycle: ${error}`,
          );
        }
      }),
    ),
    u
  );
}

export {
  ALLOWED_SIGNING_PROGRAMS,
  vc,
  getSessionClaudeConfigDir,
  lifecycleHookGitConfig,
  wc,
  getToolServerConfigDir,
  writeBestEffort,
  validateLauncherHooks,
  Sr,
  $c,
  getIngressTokenTempPrefix,
  Xr,
  writeSessionIngressTokenFile,
  Rc,
  materializeSessionGitConfig,
  sessionGitConfig,
  Tc,
  Oc,
  runGit,
  Dc,
  serializeByKey,
  go,
  SourceRefNotFoundError,
  classifySourcePrepFailure,
  runWithSlots,
  Lc,
  Uc,
  Md,
  _s,
  tagFailureStage,
  Sc,
  MCP_CONFIG_DELIVERED_JSON,
  writeLauncherSettings,
  $d,
  CHECKOUT_DISPLAY_LIMIT,
  setupFailureKindOf,
  Qd,
  removeSessionState,
  Dr,
  cleanupSessionIngressTokenFiles,
  getStartupTimeoutMs,
  Mc,
  CHILD_FORWARDED_FLAGS,
  envPositiveMs,
  Cd,
  getDrainWaitMs,
  vi,
  si,
  snapshotOperatorGitConfig,
};
