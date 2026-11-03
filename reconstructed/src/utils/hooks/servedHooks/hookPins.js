/**
 * utils/hooks/servedHooks/hookPins.ts
 *
 * 2.1.316 新增：钩子命令固定（pin）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { join, dirname, relative, isAbsolute, basename } from "path";
import { realpath, open, lstat, mkdtemp, writeFile, rm as rm_2 } from "fs/promises";
import { constants } from "fs";
import { tmpdir as tmpdir_2 } from "os";
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, literal, string, record, discriminatedUnion } from "../../../../vendor/zod/v4/classic/schemas.js";
import { servedCallsDir } from "../../../remote/tools/servedCallLog.js";
import { computeContentHash } from "../../commitAttribution.js";
import { getFileReader } from "../../fileStore.js";
import { isENOENT, errorMessage } from "../../errors.js";
import { jsonParseRaw, toJsonLine, jsonStringify } from "../../slowOperations.js";
import {
  isViolinPegOn,
  isViolinOverstandOn,
  resolveHookSandboxMode,
  checkHookSandboxAvailable,
  isPathWithinNormalizedCase,
  replaceCommandProgram,
  buildHookSandboxDevices,
  buildSandboxedHookEnv,
  wrapLinuxHookCommand,
  wrapProjectHookInSandbox,
} from "./hookSandbox.js";
import { resolveOptions, EMPTY_PATH_DIR, mergeHookEnv } from "../hookCommandResolution.js";
import { logForDebugging } from "../../debug.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSource } from "../../settings/settings.js";
import { sortKeysDeep } from "../../settings/settingsSourceTrust.js";
import { foldPathSegments } from "../../plugins/pluginCachePaths.js";
import { truncateToLength, printableText } from "../../stringUtils.js";
import { READ_LIMITS, O_NOFOLLOW_FLAG } from "../../fsBoundRead.js";
import { getProjectConfigRoot } from "../../../bootstrap/state.js";
import { analyzeHookCommand, checkScriptFile } from "../hookCommandAnalysis.js";
import { pathsOverlapForPlatform, anyPairMatches } from "../../settings/stickyRoots.js";
import { verifyOpenedPath } from "../../fsSafety/hardenedRead.js";
import { onUnavailableNoop } from "./hostPaths.js";
import {
  logServedHookHeld_2,
  projectHookUnavailable,
  runServedHook,
  sandboxFallbackAsk,
  runServedHookProcess,
} from "./runServedHook.js";
import { uniq } from "../../collections.js";
import {
  HOOK_NOT_RECORDED_QUESTION,
  hookScriptChangedQuestion,
  HOOK_CHANGED_QUESTION,
  HOOK_UPDATED_NOT_ACCEPTED_QUESTION,
  HOOK_CHANGED_ASKING_PERSON,
  HOOK_CHANGED_ASKS_INSTEAD,
} from "./notices.js";
import { claudeTempDir, tmpdir } from "../../tempDir.js";
import { getPlatform } from "../../platform.js";
import { createCombinedAbortSignal } from "../../combinedAbortSignal.js";
import { shellQuoteArgs } from "../../bash/bashPipeCommand.js";

//@ chunk-e6aww6q8.js:906646-906863 placement
var HOOK_PINS_VERSION = 1;
var hookPinsFileSchema = DoctorLazy(() =>
  u({
    version: literal(HOOK_PINS_VERSION),
    project: string(),
    pins: record(
      string().regex(/^[0-9a-f]{64}$/),
      discriminatedUnion("kind", [
        u({
          kind: literal("script"),
          path: string(),
          sha256: string().regex(/^[0-9a-f]{64}$/),
        }),
        u({
          kind: literal("inline"),
        }),
        u({
          kind: literal("unpinnable"),
        }),
      ]),
    ),
  }),
);
//@ chunk-e6aww6q8.js:906863-906935 placement
function hookPinsPath(e) {
  return join(servedCallsDir(), `hook-pins-${computeContentHash(e).slice(0, 32)}.jsonl`);
}
//@ chunk-e6aww6q8.js:906935-907173 placement
async function readAcceptedHookPins(e) {
  let n;
  try {
    n = await getFileReader().read(hookPinsPath(e));
  } catch (error) {
    return isENOENT(error) ? undefined : new Map();
  }
  try {
    let r = hookPinsFileSchema().safeParse(jsonParseRaw(n.trim()));
    return r.success && r.data.project === e ? new Map(Object.entries(r.data.pins)) : new Map();
  } catch {
    return new Map();
  }
}
//@ chunk-e6aww6q8.js:907173-907314 placement
async function writeAcceptedHookPins(projectDir, n) {
  await getFileReader().mkdir(servedCallsDir(), 448);
  await getFileReader().atomicWrite(
    hookPinsPath(projectDir),
    toJsonLine({
      version: HOOK_PINS_VERSION,
      project: projectDir,
      pins: Object.fromEntries(n),
    }),
    384,
  );
}
//@ chunk-e6aww6q8.js:907314-907377 placement
/**
 * 项目钩子固定状态的附带临时目录与各类上限（超时、文件大小、标签字符数、重试次数）。
 */
var EXTRA_TMP_DIR = "/var/tmp";
var DEFAULT_PINNED_HOOK_TIMEOUT = 10;
var MAX_PINNED_SCRIPT_BYTES = 2048;
var MAX_SEEN_HOOK_PINS = 256;
var MAX_INLINE_CHECK_LABEL_CHARS = 120;
var MAX_PROJECT_PIN_STRIKES = 3;
var MAX_SET_ASIDE_ASKS = 3;
//@ chunk-e6aww6q8.js:907377-907868 placement
/**
 * 接入时创建项目 hook 固定状态：记录项目命令 hook，失败时记录日志。
 */
function createProjectHookPinsState(e) {
  if (!isViolinPegOn()) return;
  return {
    pinned: pinProjectCommandHooks(e.projectDir, e.launchDir, resolveOptions(e.envAtAttach)).catch(
      (error) => {
        logForDebugging(
          `[remote-tools] could not record this project's command hooks at attach (${errorMessage(error)}); none is run`,
        );
        return {
          current: new Map(),
          accepted: new Map(),
        };
      },
    ),
    strikes: new Map(),
    stopped: new Set(),
    changedSinceAttach: new Set(),
    setAside: new Set(),
    setAsideAsked: new Map(),
    declinedSetAside: new Set(),
    seen: new Set(),
    shownChanged: new Set(),
    acceptedUpdated: new Set(),
    updatedAsks: new Map(),
    declinedChangedSinceLast: new Set(),
    said: new Set(),
  };
}
//@ chunk-e6aww6q8.js:907868-908202 placement
/**
 * 汇总各设置源的 PreToolUse 命令 hook 并固定其脚本摘要。
 */
async function pinProjectCommandHooks(projectDir, launchDir, home) {
  let flattened = SETTING_SOURCES.flatMap((S) =>
    (getSettingsForSource(S)?.hooks?.PreToolUse ?? []).flatMap((w) =>
      w.hooks.flatMap((hook) =>
        hook.type === "command"
          ? [
              {
                key: hookPinKey(w.matcher ?? "", hook),
                hook,
              },
            ]
          : [],
      ),
    ),
  );
  let results = await Promise.all([projectDir, launchDir].map((S) => realpath(S).catch(() => S)));
  let y = new Map();
  for (let { key, hook } of flattened) y.set(key, await pinCommandHook(hook, projectDir, home, results));
  return {
    current: y,
    accepted: await readAcceptedHookPins(projectDir),
  };
}
//@ chunk-e6aww6q8.js:908202-908576 placement
/**
 * 保存本次会话已见过的 hook 固定项。
 */
async function saveSeenHookPins(reach) {
  let projectHooks = reach.projectHooks;
  if (projectHooks === undefined) return;
  try {
    let { current: r, accepted } = await projectHooks.pinned;
    if (projectHooks.seen.size === 0) return;
    let h = accepted === undefined ? projectHooks.seen : projectHooks.shownChanged;
    let y = new Map(accepted);
    for (let S of h) {
      let pin = r.get(S)?.pin;
      if (pin !== undefined) y.set(S, pin);
    }
    await writeAcceptedHookPins(reach.projectDir, y);
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record this project's command hooks for next time (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:908576-908631 placement
function hookPinKey(matcher, hook) {
  return computeContentHash(
    jsonStringify(
      sortKeysDeep({
        matcher,
        hook,
      }),
    ),
  );
}
//@ chunk-e6aww6q8.js:908631-908777 placement
function isSameHookPin(e, n) {
  return (
    (e.kind === "inline" && n.kind === "inline") ||
    (e.kind === "script" &&
      n.kind === "script" &&
      e.sha256 === n.sha256 &&
      foldPathSegments(e.path) === foldPathSegments(n.path))
  );
}
//@ chunk-e6aww6q8.js:908777-908933 placement
function describeHookPin(e) {
  if (e === undefined) return "none";
  switch (e.kind) {
    case "script":
      return truncateToLength(e.sha256, 12);
    case "inline":
      return "inline";
    case "unpinnable":
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:908933-909023 placement
function openPinnedScript(e) {
  return open(
    e,
    constants.O_RDONLY |
      constants.O_NONBLOCK |
      READ_LIMITS |
      (O_NOFOLLOW_FLAG === 0 ? constants.O_NOFOLLOW : O_NOFOLLOW_FLAG),
  );
}
//@ chunk-e6aww6q8.js:909023-909459 placement
/**
 * 为一个项目 PreToolUse 命令钩子计算"固定标识"：无法分析的命令记为 inline；能解析到脚本且脚本在允许目录内、是唯一硬链接的稳定文件时记录路径与 sha256，否则 unpinnable。
 */
async function pinCommandHook(hook, n, home, s) {
  let h = getProjectConfigRoot() ?? n;
  let y = analyzeHookCommand(hook, {
    home,
    projectDir: h,
    hookCwd: h,
    defaultShell: "bash",
    shellPrefix: undefined,
  });
  if (y.kind === "opaque")
    return {
      pin: {
        kind: "inline",
      },
    };
  let S;
  try {
    S = await realpath(y.resolvedPath);
  } catch {
    return {
      pin: {
        kind: "unpinnable",
      },
    };
  }
  if (!pathsOverlapForPlatform([S], s))
    return {
      pin: {
        kind: "unpinnable",
      },
    };
  let w = await hashStableScriptFile(S);
  return w === undefined
    ? {
        pin: {
          kind: "unpinnable",
        },
      }
    : {
        pin: {
          kind: "script",
          path: S,
          sha256: w.sha256,
        },
        script: {
          bytes: w.bytes,
          site: y.site,
        },
      };
}
//@ chunk-e6aww6q8.js:909459-909916 placement
/**
 * 对稳定的脚本文件计算哈希：只接受无硬链接的普通文件且目录无符号链接。
 */
async function hashStableScriptFile(
  e,
  n = {
    lstat: (r) =>
      lstat(r, {
        bigint: true,
      }),
    open: openPinnedScript,
  },
) {
  try {
    let stats = await n.lstat(e);
    if (!stats.isFile() || stats.nlink !== 1n || (await realpath(dirname(e))) !== dirname(e)) return;
    let s = await n.open(e);
    let h = false;
    try {
      let stats_2 = await s.stat({
        bigint: true,
      });
      let w =
        stats_2.ino === stats.ino && stats_2.dev === stats.dev ? await verifyOpenedPath(s, e) : undefined;
      h = w?.ok === true && w.value === true;
    } finally {
      if (!h) await s.close().catch(() => {});
    }
    if (!h) return;
    let y = await checkScriptFile(e, {
      open: async () => s,
    });
    return y.ok
      ? {
          sha256: y.sha256,
          bytes: y.bytes,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:909916-914278 placement
/**
 * 固定（pin）钩子命令：确定程序与脚本内容，Windows 下无法解析时标记。
 */
async function pinHookCommand(e) {
  let projectHooks = e.reach.projectHooks;
  if (!isViolinPegOn() || projectHooks === undefined || !e.fromSettingsFile || e.held === "windows_unparsed")
    return;
  if (e.held === "unreadable") return onUnavailableNoop(e, "unpinnable");
  if ((e.hook.shell ?? "bash") !== "bash") return onUnavailableNoop(e, "shell");
  if (e.shellPrefix !== undefined && e.shellPrefix !== "") return onUnavailableNoop(e, "shell_prefix");
  let mapped = e.matcherTexts.map((matcherText) => hookPinKey(matcherText, e.hook));
  if (mapped.some((qt) => projectHooks.stopped.has(qt))) return onUnavailableNoop(e, "stopped");
  let s = isViolinOverstandOn();
  if (s && mapped.some((qt) => projectHooks.setAside.has(qt))) {
    logServedHookHeld_2(e, "set_aside_after_change", {});
    return {
      hook: e.hook,
      outcome: "success",
    };
  }
  let { hook } = e;
  let y = await e.reach.current();
  let S = y.includes("/")
    ? {
        unavailable: "unknown_reach",
      }
    : resolveHookSandboxMode(e.readRules);
  if ("unavailable" in S) return projectHookUnavailable(e, projectHooks, S.unavailable);
  let { mode } = S;
  let L = uniq([
    ...e.readableDirs,
    ...(await Promise.all(
      e.readableDirs.map((readableDir) => realpath(readableDir).catch(() => readableDir)),
    )),
  ]);
  let { current: G, accepted } = await projectHooks.pinned;
  let found = mapped.find((qt) => G.has(qt));
  let Se = found === undefined ? undefined : G.get(found);
  let ke =
    Se === undefined || (found !== undefined && projectHooks.changedSinceAttach.has(found))
      ? undefined
      : await pinCommandHook(hook, e.reach.projectDir, e.home, L);
  if (found === undefined || Se === undefined) return;
  if (Se.pin.kind === "unpinnable") return onUnavailableNoop(e, "unpinnable");
  projectHooks.seen.add(found);
  let we = ke === undefined || !isSameHookPin(Se.pin, ke.pin);
  if (we && !s) {
    projectHooks.changedSinceAttach.add(found);
    logServedHookHeld_2(e, "held_changed_since_attach", {});
    return {
      hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: HOOK_NOT_RECORDED_QUESTION,
      heldForServedCall: true,
    };
  }
  let Ee = we ? Se : ke;
  let Ae = accepted?.get(found);
  if (
    accepted !== undefined &&
    (Ae === undefined || !isSameHookPin(Ae, Se.pin)) &&
    !(s && projectHooks.acceptedUpdated.has(found))
  ) {
    let qt =
      !s || projectHooks.declinedChangedSinceLast.has(found)
        ? undefined
        : (projectHooks.updatedAsks.get(found) ?? {
            question: hookScriptChangedQuestion(describeHookPin(Ae), describeHookPin(Se.pin)),
            puts: 0,
          });
    if (qt !== undefined) projectHooks.updatedAsks.set(found, qt);
    logServedHookHeld_2(
      e,
      "held_changed_since_last_serve",
      s && qt === undefined
        ? {}
        : {
            key: found,
          },
    );
    let Zt = !projectHooks.said.has("changed_note");
    projectHooks.said.add("changed_note");
    return {
      hook,
      outcome: "success",
      permissionBehavior: "ask",
      hookPermissionDecisionReason: !s
        ? HOOK_CHANGED_QUESTION
        : (qt?.question ?? HOOK_UPDATED_NOT_ACCEPTED_QUESTION),
      heldForServedCall: true,
      ...(Zt && {
        additionalContext: s ? HOOK_CHANGED_ASKING_PERSON : HOOK_CHANGED_ASKS_INSTEAD,
      }),
    };
  }
  let Ie = await realpath(e.reach.projectDir);
  if (
    (Ee.pin.kind === "script" && !pathsOverlapForPlatform([Ee.pin.path], L)) ||
    !pathsOverlapForPlatform([Ie], L)
  )
    return onUnavailableNoop(e, "outside_readable");
  let Me =
    mode === "linux"
      ? await checkHookSandboxAvailable({
          pathValue: e.environment.extra.PATH ?? EMPTY_PATH_DIR,
          reach: y,
          home: e.home,
          readableDirs: e.readableDirs,
        })
      : undefined;
  if (Me !== undefined && "unavailable" in Me) return projectHookUnavailable(e, projectHooks, Me.unavailable);
  let We = Ee.pin.kind === "script" ? relative(Ie, Ee.pin.path) : "";
  let ze =
    We === "" || We.startsWith("..")
      ? "an inline check"
      : truncateToLength(printableText(We), MAX_INLINE_CHECK_LABEL_CHARS);
  let lt = mergeHookEnv(e.environment);
  let Je = [...y, e.home, await realpath(e.home).catch(() => e.home), claudeTempDir(), ...(Me?.homes ?? [])];
  let nt = (...qt) =>
    anyPairMatches(qt, Je) ||
    (Me !== undefined && qt.some((Zt) => Je.some((rn) => isPathWithinNormalizedCase(Zt, rn))));
  let pt = getPlatform() === "linux";
  let Et;
  for (let qt of [lt.TMPDIR, tmpdir_2(), ...(pt ? [EXTRA_TMP_DIR] : [])]) {
    if (qt === undefined || !isAbsolute(qt)) continue;
    let Zt = await realpath(qt).catch(() => {
      return;
    });
    if (Zt !== undefined && !nt(qt, Zt)) {
      Et = {
        spelled: qt,
        real: Zt,
      };
      break;
    }
  }
  let yt;
  let gt;
  try {
    if (Et === undefined) throw Error("no temp directory here lies outside what the session can write");
    yt = await realpath(await mkdtemp(join(Et.real, "hook-")));
  } catch (error) {
    logForDebugging(`[remote-tools] no private temp directory for a project hook (${errorMessage(error)})`, {
      level: "error",
    });
    return runServedHook(e, projectHooks, found, ze, mode, we, sandboxFallbackAsk(ze, "no_private_tmp", ""));
  }
  let min = Math.min(hook.timeout ?? DEFAULT_PINNED_HOOK_TIMEOUT, DEFAULT_PINNED_HOOK_TIMEOUT);
  let combinedAbortSignal = createCombinedAbortSignal(e.signal, {
    timeoutMs: min * 1000,
  });
  let Yt = false;
  try {
    if (nt(yt))
      return runServedHook(
        e,
        projectHooks,
        found,
        ze,
        mode,
        we,
        sandboxFallbackAsk(ze, "private_tmp_in_reach", ""),
      );
    if (Ee.script === undefined) gt = hook;
    else {
      let rn = join(yt, basename(We).replace(/[^A-Za-z0-9._-]/g, "_") || "check");
      await writeFile(rn, Ee.script.bytes, {
        mode: 320,
        flag: "wx",
      });
      gt = replaceCommandProgram(hook, Ee.script.site, rn);
    }
    let qt =
      mode === "linux"
        ? undefined
        : {
            mode,
            config: await buildHookSandboxDevices({
              mode,
              projectRoots: L,
              home: e.home,
              privateTmp: yt,
              tempRoots: [Et.spelled, tmpdir_2(), tmpdir()].flatMap((rn) =>
                basename(rn) === "T" ? [rn, dirname(rn)] : [rn],
              ),
            }),
          };
    let match = await e.exec({
      hook: {
        ...gt,
        timeout: min,
      },
      cwd: e.reach.projectDir,
      base: buildSandboxedHookEnv({
        judged: lt,
        pathValue: e.environment.extra.PATH ?? EMPTY_PATH_DIR,
        home: Me === undefined ? e.home : yt,
        privateTmp: yt,
      }),
      signal: combinedAbortSignal.signal,
      wrap: async (rn) => {
        let pn;
        if (Me !== undefined)
          pn = wrapLinuxHookCommand(
            rn,
            {
              ...Me,
              privateTmp: yt,
              cwd: Ie,
            },
            e.readRules,
          );
        else if (qt !== undefined)
          pn = await wrapProjectHookInSandbox(
            `export TMPDIR=${shellQuoteArgs([yt])}; ${rn}`,
            qt.config,
            combinedAbortSignal.signal,
            e.readRules,
            {
              mode: qt.mode,
              commandId: `served-hook:${randomUUID()}`,
            },
          );
        Yt = pn === undefined;
        return pn;
      },
    });
    if (e.signal?.aborted === true)
      return {
        hook,
        outcome: "cancelled",
      };
    return runServedHook(
      e,
      projectHooks,
      found,
      ze,
      mode,
      we,
      Yt
        ? sandboxFallbackAsk(ze, combinedAbortSignal.signal.aborted ? "timeout" : "not_wrapped", "")
        : runServedHookProcess(match, ze, we),
    );
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be run in the sandbox (${errorMessage(error)})`,
      {
        level: "error",
      },
    );
    return runServedHook(e, projectHooks, found, ze, mode, we, sandboxFallbackAsk(ze, "wrap_failed", ""));
  } finally {
    combinedAbortSignal.cleanup();
    await rm_2(yt, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
export {
  pinHookCommand,
  saveSeenHookPins,
  MAX_SEEN_HOOK_PINS,
  MAX_PINNED_SCRIPT_BYTES,
  MAX_SET_ASIDE_ASKS,
  MAX_PROJECT_PIN_STRIKES,
  createProjectHookPinsState,
};
