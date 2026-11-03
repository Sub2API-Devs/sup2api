/**
 * skills/bundledSkills.ts
 *
 * 并入已有模块：按目录批量写出技能附带文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundledSkills.ts
 * pieces: chunk-41w44bgm.js (1), chunk-e6aww6q8.js (1), chunk-hddjmtjj.js (1), chunk-wy9dbk5f.js (1), chunk-yjaa68dq.js (15)
 * attribution: fingerprint 5, placement 14
 */
import { constants } from "fs";
import { open, mkdir, lstat } from "fs/promises";
import path, { dirname, posix, join } from "path";
import { getErrnoCode } from "../utils/errors.js";
import { getHostState } from "../utils/hostEnvironment.js";
import { logForDebugging } from "../utils/debug.js";
import { defineLazyGetter, defineLazyGetterAlt, definePolicyGate } from "./skillPropertyGetters.js";
import { I3, e6e, D4 } from "./bundledSkillsGate.js";
import { getBundledSkillsRoot } from "../utils/permissions/filesystem.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getPlatform } from "../utils/platform.js";
import { openPinnedForWrite } from "../services/agentImport/importSafety.js";
import { ws } from "../utils/fsFlags.js";

//@ chunk-yjaa68dq.js:620-676 placement
var S = constants.O_NOFOLLOW ?? 0,
  T = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | S;
//@ chunk-yjaa68dq.js:676-810 placement
async function writeFileWithMode(e, o, n = 384) {
  let r = await open(e, T, n);
  try {
    if (n !== 384) await r.chmod(n);
    await r.writeFile(o, "utf8");
  } finally {
    await r.close();
  }
}
//@ chunk-yjaa68dq.js:810-1009 placement
function safeJoinBundledPath(e, o, n = path) {
  let normalized = n.normalize(o);
  if (
    n.isAbsolute(normalized) ||
    normalized.split(n.sep).includes("..") ||
    normalized.split("/").includes("..")
  )
    throw Error("bundled file path escapes its extraction dir");
  return n.join(e, normalized);
}
/**
 * 按目录批量写出技能附带文件。
 */
//@ chunk-yjaa68dq.js:1009-1642 placement
async function writeSkillFiles(e, o, n) {
  let byParent = new Map();
  for (let [l, p] of Object.entries(o)) {
    let target = safeJoinBundledPath(e, l),
      parent = dirname(target),
      u = [target, p, n?.mode?.(l) ?? 384],
      group = byParent.get(parent);
    if (group) group.push(u);
    else byParent.set(parent, [u]);
  }
  await Promise.all(
    [...byParent].map(async ([l, p]) => {
      (await mkdir(l, { recursive: !0, mode: 448 }),
        await Promise.all(
          p.map(([a, d, u]) =>
            writeFileWithMode(a, d, u).catch((i) => {
              if (n?.tolerateExisting && getErrnoCode(i) === "EEXIST") {
                if (n.tolerateExisting !== "verify-content")
                  return lstat(a).then((s) => {
                    if (!s.isFile()) throw i;
                  });
                return open(a, constants.O_RDONLY | S | (constants.O_NONBLOCK ?? 0))
                  .then((s) =>
                    s
                      .stat()
                      .then((y) => {
                        if (!y.isFile()) throw i;
                        return s.readFile({ encoding: "utf8" });
                      })
                      .finally(() => s.close()),
                  )
                  .then((s) => {
                    if (s !== d) throw i;
                  });
              }
              throw i;
            }),
          ),
        ));
    }),
  );
}
//@ chunk-yjaa68dq.js:1642-1701 placement
function registerBundledSkillSessionReset(e) {
  getHostState().bundledSkillSessionResetHooks.push(e);
}
//@ chunk-yjaa68dq.js:1701-1865 placement
function runBundledSkillSessionResets() {
  for (let bundledSkillSessionResetHook of getHostState().bundledSkillSessionResetHooks)
    try {
      bundledSkillSessionResetHook();
    } catch (error) {
      logForDebugging(
        `[skills] session-reset hook failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
}
/**
 * 如果 skill 定义带 files（对象或异步函数），首次调用 getPromptForCommand 时把文件解压到 bundled skill 目录，并在提示词前加「Base directory for this skill: <dir>」；并发调用共享同一次解压。
 */
//@ chunk-yjaa68dq.js:1865-2514 placement
function wireSkillFilesExtraction(e) {
  let { files: files } = e,
    n = typeof files === "function";
  if (!files || (!n && Object.keys(files).length === 0))
    return { skillRoot: void 0, getPromptForCommand: e.getPromptForCommand };
  let r,
    l,
    getPromptForCommand = e.getPromptForCommand,
    a = async (d, u) => {
      l ??= (async () => {
        let b = r ?? (n ? await files(u) : files);
        if (Object.keys(b).length > 0) r = b;
        return extractBundledSkillFiles(e.name, b);
      })();
      let i = l,
        f;
      try {
        f = await i;
      } catch (error) {
        if (l === i) ((l = void 0), (r = void 0));
        throw error;
      }
      if (l === i) l = void 0;
      let s = await getPromptForCommand(d, u, f);
      if (f === null) return s;
      let y = `Base directory for this skill: ${f}

`;
      if (s.length > 0 && s[0].type === "text") return [{ type: "text", text: y + s[0].text }, ...s.slice(1)];
      return [{ type: "text", text: y }, ...s];
    };
  return { skillRoot: getBundledSkillExtractDir(e.name), getPromptForCommand: a };
}
/**
 * 把一个内置 skill 定义转成 type:prompt 的命令对象并压入全局 bundledSkills 列表：source/loadedFrom 都是 bundled，isHidden = !userInvocable；description/argumentHint/whenToUse 可为函数（惰性求值）；survivesBundledKillSwitch 的 skill 在总开关关闭时仍保留。
 */
//@ chunk-yjaa68dq.js:2514-4342 placement = registerBundledSkill (0.515)
function registerBundledSkill(definition) {
  let { skillRoot: skillRoot, getPromptForCommand: getPromptForCommand } =
      wireSkillFilesExtraction(definition),
    r = {
      type: "prompt",
      name: definition.name,
      description: typeof definition.description === "function" ? "" : definition.description,
      menuDescription: typeof definition.menuDescription === "function" ? void 0 : definition.menuDescription,
      aliases: definition.aliases,
      subcommands: definition.subcommands,
      subcommandsBareOnly: definition.subcommandsBareOnly,
      hasUserSpecifiedDescription: !0,
      allowedTools: definition.allowedTools ?? [],
      getAllowedTools: definition.getAllowedTools,
      disallowedTools: definition.disallowedTools ?? [],
      argumentHint: typeof definition.argumentHint === "function" ? void 0 : definition.argumentHint,
      whenToUse: typeof definition.whenToUse === "function" ? void 0 : definition.whenToUse,
      model: definition.model,
      disableModelInvocation:
        typeof definition.disableModelInvocation === "function"
          ? !0
          : (definition.disableModelInvocation ?? !1),
      disableBridgeInvocation: definition.disableBridgeInvocation,
      userInvocable: definition.userInvocable ?? !0,
      terminalOriented: definition.terminalOriented,
      argsMayContainSlashCommands: definition.argsMayContainSlashCommands,
      contentLength: 0,
      source: "bundled",
      loadedFrom: "bundled",
      hooks: definition.hooks,
      skillRoot: skillRoot,
      context: definition.context,
      getContext: definition.getContext,
      agent: definition.agent,
      background: definition.background,
      formatForegroundForkResult: definition.formatForegroundForkResult,
      isEnabled: definition.isEnabled,
      policyGate: typeof definition.policyGate === "function" ? void 0 : definition.policyGate,
      requires: definition.requires,
      isHidden: !(definition.userInvocable ?? !0),
      progressMessage: definition.progressMessage ?? "running",
      getPromptForCommand: getPromptForCommand,
      getEffort: definition.getEffort,
      getDefaultEffort: definition.getDefaultEffort,
      onUserTypedArgs: definition.onUserTypedArgs,
      getArgumentCompletions: definition.getArgumentCompletions,
      enterTakesArgumentCompletion: definition.enterTakesArgumentCompletion,
    };
  (defineLazyGetter(r, "description", definition.description),
    defineLazyGetter(r, "menuDescription", definition.menuDescription),
    defineLazyGetter(r, "argumentHint", definition.argumentHint),
    defineLazyGetter(r, "whenToUse", definition.whenToUse),
    defineLazyGetterAlt(r, "disableModelInvocation", definition.disableModelInvocation),
    definePolicyGate(r, definition.policyGate));
  let l = getHostState();
  if (definition.survivesBundledKillSwitch) l.bundledSkillKillSwitchSurvivors.add(r);
  l.bundledSkills.push(r);
}
//@ chunk-yjaa68dq.js:4342-4579 placement
function getBundledSkills() {
  let e = getHostState();
  if (I3())
    return e.bundledSkills.filter((bundledSkill) => e.bundledSkillKillSwitchSurvivors.has(bundledSkill));
  if (e6e())
    return e.bundledSkills.filter(
      (bundledSkill) => e.bundledSkillKillSwitchSurvivors.has(bundledSkill) || !D4(bundledSkill.name),
    );
  return [...e.bundledSkills];
}
//@ chunk-yjaa68dq.js:4579-4750 placement
function isShippedSkillExecutionBlocked(e) {
  if (e.type !== "prompt" || e.source !== "bundled") return !1;
  for (let bundledSkillKillSwitchSurvivor of getHostState().bundledSkillKillSwitchSurvivors)
    if (bundledSkillKillSwitchSurvivor === e || bundledSkillKillSwitchSurvivor.name === e.name) return !1;
  return D4(e.name);
}
/**
 * getRegisteredBundledSkillsIgnoringKillSwitch：返回已注册的全部发行内建技能命令，不看技能开关（用于名字保留）。
 */
//@ chunk-yjaa68dq.js:4750-4795 placement = loadAllCommands (0.375)
function getRegisteredBundledSkillsIgnoringKillSwitch() {
  return [...getHostState().bundledSkills];
}
/**
 * 内置 skill 的解压目录：有 bundledSkillFilesElsewhere 时用其 root（posix），否则 getBundledSkillsRoot()/<name>。
 */
//@ chunk-yjaa68dq.js:4795-4886 placement
function getBundledSkillExtractDir(e) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? posix.join(bundledSkillFilesElsewhere.root, e)
    : join(getBundledSkillsRoot(), e);
}
/**
 * 把内置 skill 的附带文件写入解压目录（verify-content 模式，内容不同才写）；失败返回 null 并记 skill_bundled_extract 失败。
 */
//@ chunk-yjaa68dq.js:4886-5213 fingerprint = extractBundledSkillFiles (0.558)
async function extractBundledSkillFiles(skillName, files) {
  if (Object.keys(files).length === 0) return null;
  let dir = getBundledSkillExtractDir(skillName);
  try {
    return (
      await writeBundledSkillFiles(dir, files, "verify-content"),
      logFeatureOk("skill_bundled_extract"),
      dir
    );
  } catch (error) {
    return (
      logForDebugging(
        `Failed to extract bundled skill '${skillName}' to ${dir}: ${error instanceof Error ? error.message : String(error)}`,
      ),
      logFeatureBad("skill_bundled_extract", "skill_bundled_extract_write_failed"),
      null
    );
  }
}
//@ chunk-yjaa68dq.js:5213-5450 placement
async function extractAdditionalSkillFiles(e, o) {
  if (Object.keys(o).length === 0) return null;
  let n = getBundledSkillExtractDir(e);
  try {
    return (await writeBundledSkillFiles(n, o, !0), n);
  } catch (error) {
    return (
      logForDebugging(
        `Failed to extract additional skill files for '${e}' to ${n}: ${error instanceof Error ? error.message : String(error)}`,
      ),
      null
    );
  }
}
//@ chunk-yjaa68dq.js:5450-5558 placement
function writeBundledSkillFiles(e, o, n) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? bundledSkillFilesElsewhere.write(e, o)
    : writeSkillFiles(e, o, { tolerateExisting: n });
}
//@ chunk-41w44bgm.js:13979-14053 fingerprint = O_NOFOLLOW (0.659)
var Fs = getPlatform() === "windows" ? 0 : constants.O_NONBLOCK,
  O_NOFOLLOW_FLAG = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW;
/**
 * 返回「Base directory for this skill: <dir>」前缀行，skill 提示词前置使用。
 */
//@ chunk-e6aww6q8.js:3124728-3124790 fingerprint = prependBaseDir (1)
function prependBaseDir(e) {
  return `Base directory for this skill: ${e}

`;
}
//@ chunk-hddjmtjj.js:7191-7333 fingerprint = safeWriteFile (0.722)
async function safeWriteFile(n, e, r) {
  let l = await openPinnedForWrite(n, e);
  if (l === null) return !1;
  try {
    await l.writeFile(r, { encoding: "utf8" });
  } finally {
    await l.close();
  }
  return !0;
}
//@ chunk-wy9dbk5f.js:65065-65138 fingerprint = SAFE_WRITE_FLAGS (0.719)
function SAFE_WRITE_FLAGS(e, r) {
  return open(e, constants.O_WRONLY | ws | (r ? constants.O_CREAT | constants.O_EXCL : 0), 384);
}

export {
  registerBundledSkill,
  runBundledSkillSessionResets,
  getBundledSkills,
  getRegisteredBundledSkillsIgnoringKillSwitch,
  isShippedSkillExecutionBlocked,
  Fs,
  O_NOFOLLOW_FLAG,
  prependBaseDir,
  getBundledSkillExtractDir,
  registerBundledSkillSessionReset,
  extractAdditionalSkillFiles,
  safeWriteFile,
  SAFE_WRITE_FLAGS,
};
