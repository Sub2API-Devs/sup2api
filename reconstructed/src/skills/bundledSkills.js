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
import {
  isBundledSkillsDisabled,
  isBundledSkillsPolicyDenied,
  isSkillOutsideCorePolicy,
} from "./bundledSkillsGate.js";
import { getBundledSkillsRoot } from "../utils/permissions/filesystem.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getPlatform } from "../utils/platform.js";
import { openPinnedForWrite } from "../services/agentImport/importSafety.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../utils/fsFlags.js";

//@ chunk-yjaa68dq.js:620-676 placement
/**
 * 安全写文件用的打开标志（独占创建 + 不跟随符号链接）。
 */
var O_NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0;
var SECURE_WRITE_OPEN_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW_FLAG;
//@ chunk-yjaa68dq.js:676-810 placement
async function writeFileWithMode(e, o, n = 384) {
  let r = await open(e, SECURE_WRITE_OPEN_FLAGS, n);
  try {
    if (n !== 384) await r.chmod(n);
    await r.writeFile(o, "utf8");
  } finally {
    await r.close();
  }
}
//@ chunk-yjaa68dq.js:810-1009 placement
function safeJoinBundledPath(dir, relPath, n = path) {
  let normalized = n.normalize(relPath);
  if (
    n.isAbsolute(normalized) ||
    normalized.split(n.sep).includes("..") ||
    normalized.split("/").includes("..")
  )
    throw Error("bundled file path escapes its extraction dir");
  return n.join(dir, normalized);
}
//@ chunk-yjaa68dq.js:1009-1642 placement
/**
 * 按目录批量写出技能附带文件。
 */
async function writeSkillFiles(dir, files, n) {
  let byParent = new Map();
  for (let [relPath, content] of Object.entries(files)) {
    let target = safeJoinBundledPath(dir, relPath);
    let parent = dirname(target);
    let entry = [target, content, n?.mode?.(relPath) ?? 384];
    let group = byParent.get(parent);
    if (group) group.push(entry);
    else byParent.set(parent, [entry]);
  }
  await Promise.all(
    [...byParent].map(async ([parent, entries]) => {
      await mkdir(parent, {
        recursive: true,
        mode: 448,
      });
      await Promise.all(
        entries.map(([a, d, u]) =>
          writeFileWithMode(a, d, u).catch((error) => {
            if (n?.tolerateExisting && getErrnoCode(error) === "EEXIST") {
              if (n.tolerateExisting !== "verify-content")
                return lstat(a).then((s) => {
                  if (!s.isFile()) throw error;
                });
              return open(a, constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0))
                .then((s) =>
                  s
                    .stat()
                    .then((y) => {
                      if (!y.isFile()) throw error;
                      return s.readFile({
                        encoding: "utf8",
                      });
                    })
                    .finally(() => s.close()),
                )
                .then((s) => {
                  if (s !== d) throw error;
                });
            }
            throw error;
          }),
        ),
      );
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
//@ chunk-yjaa68dq.js:1865-2514 placement
/**
 * 如果 skill 定义带 files（对象或异步函数），首次调用 getPromptForCommand 时把文件解压到 bundled skill 目录，并在提示词前加「Base directory for this skill: <dir>」；并发调用共享同一次解压。
 */
function wireSkillFilesExtraction(definition) {
  let { files } = definition;
  let n = typeof files === "function";
  if (!files || (!n && Object.keys(files).length === 0))
    return {
      skillRoot: undefined,
      getPromptForCommand: definition.getPromptForCommand,
    };
  let r;
  let l;
  let getPromptForCommand = definition.getPromptForCommand;
  let getPromptForCommand_2 = async (d, u) => {
    l ??= (async () => {
      let files_2 = r ?? (n ? await files(u) : files);
      if (Object.keys(files_2).length > 0) r = files_2;
      return extractBundledSkillFiles(definition.name, files_2);
    })();
    let i = l;
    let f;
    try {
      f = await i;
    } catch (error) {
      if (l === i) {
        l = undefined;
        r = undefined;
      }
      throw error;
    }
    if (l === i) l = undefined;
    let promptForCommand = await getPromptForCommand(d, u, f);
    if (f === null) return promptForCommand;
    let y = `Base directory for this skill: ${f}

`;
    if (promptForCommand.length > 0 && promptForCommand[0].type === "text")
      return [
        {
          type: "text",
          text: y + promptForCommand[0].text,
        },
        ...promptForCommand.slice(1),
      ];
    return [
      {
        type: "text",
        text: y,
      },
      ...promptForCommand,
    ];
  };
  return {
    skillRoot: getBundledSkillExtractDir(definition.name),
    getPromptForCommand: getPromptForCommand_2,
  };
}
//@ chunk-yjaa68dq.js:2514-4342 placement = registerBundledSkill (0.515)
/**
 * 把一个内置 skill 定义转成 type:prompt 的命令对象并压入全局 bundledSkills 列表：source/loadedFrom 都是 bundled，isHidden = !userInvocable；description/argumentHint/whenToUse 可为函数（惰性求值）；survivesBundledKillSwitch 的 skill 在总开关关闭时仍保留。
 */
function registerBundledSkill(definition) {
  let { skillRoot, getPromptForCommand } = wireSkillFilesExtraction(definition);
  let r = {
    type: "prompt",
    name: definition.name,
    description: typeof definition.description === "function" ? "" : definition.description,
    menuDescription:
      typeof definition.menuDescription === "function" ? undefined : definition.menuDescription,
    aliases: definition.aliases,
    subcommands: definition.subcommands,
    subcommandsBareOnly: definition.subcommandsBareOnly,
    hasUserSpecifiedDescription: true,
    allowedTools: definition.allowedTools ?? [],
    getAllowedTools: definition.getAllowedTools,
    disallowedTools: definition.disallowedTools ?? [],
    argumentHint: typeof definition.argumentHint === "function" ? undefined : definition.argumentHint,
    whenToUse: typeof definition.whenToUse === "function" ? undefined : definition.whenToUse,
    model: definition.model,
    disableModelInvocation:
      typeof definition.disableModelInvocation === "function"
        ? true
        : (definition.disableModelInvocation ?? false),
    disableBridgeInvocation: definition.disableBridgeInvocation,
    userInvocable: definition.userInvocable ?? true,
    terminalOriented: definition.terminalOriented,
    argsMayContainSlashCommands: definition.argsMayContainSlashCommands,
    contentLength: 0,
    source: "bundled",
    loadedFrom: "bundled",
    hooks: definition.hooks,
    skillRoot,
    context: definition.context,
    getContext: definition.getContext,
    agent: definition.agent,
    background: definition.background,
    formatForegroundForkResult: definition.formatForegroundForkResult,
    isEnabled: definition.isEnabled,
    policyGate: typeof definition.policyGate === "function" ? undefined : definition.policyGate,
    requires: definition.requires,
    isHidden: !(definition.userInvocable ?? true),
    progressMessage: definition.progressMessage ?? "running",
    getPromptForCommand,
    getEffort: definition.getEffort,
    getDefaultEffort: definition.getDefaultEffort,
    onUserTypedArgs: definition.onUserTypedArgs,
    getArgumentCompletions: definition.getArgumentCompletions,
    enterTakesArgumentCompletion: definition.enterTakesArgumentCompletion,
  };
  defineLazyGetter(r, "description", definition.description);
  defineLazyGetter(r, "menuDescription", definition.menuDescription);
  defineLazyGetter(r, "argumentHint", definition.argumentHint);
  defineLazyGetter(r, "whenToUse", definition.whenToUse);
  defineLazyGetterAlt(r, "disableModelInvocation", definition.disableModelInvocation);
  definePolicyGate(r, definition.policyGate);
  let hostState = getHostState();
  if (definition.survivesBundledKillSwitch) hostState.bundledSkillKillSwitchSurvivors.add(r);
  hostState.bundledSkills.push(r);
}
//@ chunk-yjaa68dq.js:4342-4579 placement
function getBundledSkills() {
  let hostState = getHostState();
  if (isBundledSkillsDisabled())
    return hostState.bundledSkills.filter((bundledSkill) =>
      hostState.bundledSkillKillSwitchSurvivors.has(bundledSkill),
    );
  if (isBundledSkillsPolicyDenied())
    return hostState.bundledSkills.filter(
      (bundledSkill) =>
        hostState.bundledSkillKillSwitchSurvivors.has(bundledSkill) ||
        !isSkillOutsideCorePolicy(bundledSkill.name),
    );
  return [...hostState.bundledSkills];
}
//@ chunk-yjaa68dq.js:4579-4750 placement
function isShippedSkillExecutionBlocked(command) {
  if (command.type !== "prompt" || command.source !== "bundled") return false;
  for (let bundledSkillKillSwitchSurvivor of getHostState().bundledSkillKillSwitchSurvivors)
    if (bundledSkillKillSwitchSurvivor === command || bundledSkillKillSwitchSurvivor.name === command.name)
      return false;
  return isSkillOutsideCorePolicy(command.name);
}
//@ chunk-yjaa68dq.js:4750-4795 placement = loadAllCommands (0.375)
/**
 * getRegisteredBundledSkillsIgnoringKillSwitch：返回已注册的全部发行内建技能命令，不看技能开关（用于名字保留）。
 */
function getRegisteredBundledSkillsIgnoringKillSwitch() {
  return [...getHostState().bundledSkills];
}
//@ chunk-yjaa68dq.js:4795-4886 placement
/**
 * 内置 skill 的解压目录：有 bundledSkillFilesElsewhere 时用其 root（posix），否则 getBundledSkillsRoot()/<name>。
 */
function getBundledSkillExtractDir(e) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? posix.join(bundledSkillFilesElsewhere.root, e)
    : join(getBundledSkillsRoot(), e);
}
//@ chunk-yjaa68dq.js:4886-5213 fingerprint = extractBundledSkillFiles (0.558)
/**
 * 把内置 skill 的附带文件写入解压目录（verify-content 模式，内容不同才写）；失败返回 null 并记 skill_bundled_extract 失败。
 */
async function extractBundledSkillFiles(skillName, files) {
  if (Object.keys(files).length === 0) return null;
  let dir = getBundledSkillExtractDir(skillName);
  try {
    await writeBundledSkillFiles(dir, files, "verify-content");
    logFeatureOk("skill_bundled_extract");
    return dir;
  } catch (e) {
    logForDebugging(
      `Failed to extract bundled skill '${skillName}' to ${dir}: ${e instanceof Error ? e.message : String(e)}`,
    );
    logFeatureBad("skill_bundled_extract", "skill_bundled_extract_write_failed");
    return null;
  }
}
//@ chunk-yjaa68dq.js:5213-5450 placement
async function extractAdditionalSkillFiles(e, capabilityDefs) {
  if (Object.keys(capabilityDefs).length === 0) return null;
  let bundledSkillExtractDir = getBundledSkillExtractDir(e);
  try {
    await writeBundledSkillFiles(bundledSkillExtractDir, capabilityDefs, true);
    return bundledSkillExtractDir;
  } catch (error) {
    logForDebugging(
      `Failed to extract additional skill files for '${e}' to ${bundledSkillExtractDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
//@ chunk-yjaa68dq.js:5450-5558 placement
function writeBundledSkillFiles(dir, files, tolerateExisting) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? bundledSkillFilesElsewhere.write(dir, files)
    : writeSkillFiles(dir, files, {
        tolerateExisting,
      });
}
//@ chunk-41w44bgm.js:13979-14053 fingerprint = O_NOFOLLOW (0.659)
/**
 * 平台不支持的 O_NONBLOCK 回退为 0。
 */
var O_NONBLOCK_FLAG = getPlatform() === "windows" ? 0 : constants.O_NONBLOCK;
var O_NOFOLLOW_FLAG_2 = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW;
//@ chunk-e6aww6q8.js:3124728-3124790 fingerprint = prependBaseDir (1)
/**
 * 返回「Base directory for this skill: <dir>」前缀行，skill 提示词前置使用。
 */
function prependBaseDir(baseDir) {
  return `Base directory for this skill: ${baseDir}

`;
}
//@ chunk-hddjmtjj.js:7191-7333 fingerprint = safeWriteFile (0.722)
async function safeWriteFile(n, e, r) {
  let pinnedForWrite = await openPinnedForWrite(n, e);
  if (pinnedForWrite === null) return false;
  try {
    await pinnedForWrite.writeFile(r, {
      encoding: "utf8",
    });
  } finally {
    await pinnedForWrite.close();
  }
  return true;
}
//@ chunk-wy9dbk5f.js:65065-65138 fingerprint = SAFE_WRITE_FLAGS (0.719)
function SAFE_WRITE_FLAGS(e, r) {
  return open(
    e,
    constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS | (r ? constants.O_CREAT | constants.O_EXCL : 0),
    384,
  );
}
export {
  registerBundledSkill,
  runBundledSkillSessionResets,
  getBundledSkills,
  getRegisteredBundledSkillsIgnoringKillSwitch,
  isShippedSkillExecutionBlocked,
  O_NONBLOCK_FLAG,
  O_NOFOLLOW_FLAG_2,
  prependBaseDir,
  getBundledSkillExtractDir,
  registerBundledSkillSessionReset,
  extractAdditionalSkillFiles,
  safeWriteFile,
  SAFE_WRITE_FLAGS,
};
