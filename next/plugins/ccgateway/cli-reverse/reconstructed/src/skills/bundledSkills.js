/**
 * skills/bundledSkills.ts
 *
 * 并入已有模块：按目录批量写出技能附带文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundledSkills.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ndr12bqk.js (1), chunk-xc4g26h5.js (15), chunk-xrwmcqkn.js (1)
 * attribution: fingerprint 4, placement 14
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
import { openPinnedForWrite } from "../services/agentImport/importSafety.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../utils/fsFlags.js";

//@ chunk-xc4g26h5.js:620-676 placement
/**
 * 安全写文件用的打开标志（独占创建 + 不跟随符号链接）。
 */
var O_NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0;
var SECURE_WRITE_OPEN_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW_FLAG;
//@ chunk-xc4g26h5.js:676-810 placement
async function writeFileWithMode(filePath, content, mode = 384) {
  let handle = await open(filePath, SECURE_WRITE_OPEN_FLAGS, mode);
  try {
    if (mode !== 384) await handle.chmod(mode);
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}
//@ chunk-xc4g26h5.js:810-1009 placement
function safeJoinBundledPath(dir, relPath, pathModule = path) {
  let normalized = pathModule.normalize(relPath);
  if (
    pathModule.isAbsolute(normalized) ||
    normalized.split(pathModule.sep).includes("..") ||
    normalized.split("/").includes("..")
  )
    throw Error("bundled file path escapes its extraction dir");
  return pathModule.join(dir, normalized);
}
//@ chunk-xc4g26h5.js:1009-1642 placement
/**
 * 按目录批量写出技能附带文件。
 */
async function writeSkillFiles(dir, files, options) {
  let byParent = new Map();
  for (let [relPath, content] of Object.entries(files)) {
    let target = safeJoinBundledPath(dir, relPath);
    let parent = dirname(target);
    let entry = [target, content, options?.mode?.(relPath) ?? 384];
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
        entries.map(([filePath, content, mode]) =>
          writeFileWithMode(filePath, content, mode).catch((error) => {
            if (options?.tolerateExisting && getErrnoCode(error) === "EEXIST") {
              if (options.tolerateExisting !== "verify-content")
                return lstat(filePath).then((existing) => {
                  if (!existing.isFile()) throw error;
                });
              return open(filePath, constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0))
                .then((handle) =>
                  handle
                    .stat()
                    .then((stats) => {
                      if (!stats.isFile()) throw error;
                      return handle.readFile({
                        encoding: "utf8",
                      });
                    })
                    .finally(() => handle.close()),
                )
                .then((current) => {
                  if (current !== content) throw error;
                });
            }
            throw error;
          }),
        ),
      );
    }),
  );
}
//@ chunk-xc4g26h5.js:1642-1701 placement
function registerBundledSkillSessionReset(hook) {
  getHostState().bundledSkillSessionResetHooks.push(hook);
}
//@ chunk-xc4g26h5.js:1701-1865 placement
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
//@ chunk-xc4g26h5.js:1865-2514 placement
/**
 * 如果 skill 定义带 files（对象或异步函数），首次调用 getPromptForCommand 时把文件解压到 bundled skill 目录，并在提示词前加「Base directory for this skill: <dir>」；并发调用共享同一次解压。
 */
function wireSkillFilesExtraction(definition) {
  let { files } = definition;
  let isFilesFunction = typeof files === "function";
  if (!files || (!isFilesFunction && Object.keys(files).length === 0))
    return {
      skillRoot: undefined,
      getPromptForCommand: definition.getPromptForCommand,
    };
  let cachedFiles;
  let inFlight;
  let getPromptForCommand = definition.getPromptForCommand;
  let getPromptForCommand_2 = async (args, context) => {
    inFlight ??= (async () => {
      let files_2 = cachedFiles ?? (isFilesFunction ? await files(context) : files);
      if (Object.keys(files_2).length > 0) cachedFiles = files_2;
      return extractBundledSkillFiles(definition.name, files_2);
    })();
    let pending = inFlight;
    let extractDir;
    try {
      extractDir = await pending;
    } catch (error) {
      if (inFlight === pending) {
        inFlight = undefined;
        cachedFiles = undefined;
      }
      throw error;
    }
    if (inFlight === pending) inFlight = undefined;
    let promptForCommand = await getPromptForCommand(args, context, extractDir);
    if (extractDir === null) return promptForCommand;
    let baseDirHeader = `Base directory for this skill: ${extractDir}

`;
    if (promptForCommand.length > 0 && promptForCommand[0].type === "text")
      return [
        {
          type: "text",
          text: baseDirHeader + promptForCommand[0].text,
        },
        ...promptForCommand.slice(1),
      ];
    return [
      {
        type: "text",
        text: baseDirHeader,
      },
      ...promptForCommand,
    ];
  };
  return {
    skillRoot: getBundledSkillExtractDir(definition.name),
    getPromptForCommand: getPromptForCommand_2,
  };
}
//@ chunk-xc4g26h5.js:2514-4342 placement (2.1.88 match: registerBundledSkill, 0.515)
/**
 * 把一个内置 skill 定义转成 type:prompt 的命令对象并压入全局 bundledSkills 列表：source/loadedFrom 都是 bundled，isHidden = !userInvocable；description/argumentHint/whenToUse 可为函数（惰性求值）；survivesBundledKillSwitch 的 skill 在总开关关闭时仍保留。
 */
function registerBundledSkill(definition) {
  let { skillRoot, getPromptForCommand } = wireSkillFilesExtraction(definition);
  let command = {
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
  defineLazyGetter(command, "description", definition.description);
  defineLazyGetter(command, "menuDescription", definition.menuDescription);
  defineLazyGetter(command, "argumentHint", definition.argumentHint);
  defineLazyGetter(command, "whenToUse", definition.whenToUse);
  defineLazyGetterAlt(command, "disableModelInvocation", definition.disableModelInvocation);
  definePolicyGate(command, definition.policyGate);
  let hostState = getHostState();
  if (definition.survivesBundledKillSwitch) hostState.bundledSkillKillSwitchSurvivors.add(command);
  hostState.bundledSkills.push(command);
}
//@ chunk-xc4g26h5.js:4342-4579 placement
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
//@ chunk-xc4g26h5.js:4579-4750 placement
function isShippedSkillExecutionBlocked(command) {
  if (command.type !== "prompt" || command.source !== "bundled") return false;
  for (let bundledSkillKillSwitchSurvivor of getHostState().bundledSkillKillSwitchSurvivors)
    if (bundledSkillKillSwitchSurvivor === command || bundledSkillKillSwitchSurvivor.name === command.name)
      return false;
  return isSkillOutsideCorePolicy(command.name);
}
//@ chunk-xc4g26h5.js:4750-4795 placement (2.1.88 match: loadAllCommands, 0.376)
/**
 * getRegisteredBundledSkillsIgnoringKillSwitch：返回已注册的全部发行内建技能命令，不看技能开关（用于名字保留）。
 */
function getRegisteredBundledSkillsIgnoringKillSwitch() {
  return [...getHostState().bundledSkills];
}
//@ chunk-xc4g26h5.js:4795-4886 placement
/**
 * 内置 skill 的解压目录：有 bundledSkillFilesElsewhere 时用其 root（posix），否则 getBundledSkillsRoot()/<name>。
 */
function getBundledSkillExtractDir(skillName) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? posix.join(bundledSkillFilesElsewhere.root, skillName)
    : join(getBundledSkillsRoot(), skillName);
}
//@ chunk-xc4g26h5.js:4886-5213 fingerprint (2.1.88 match: extractBundledSkillFiles, 0.558)
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
//@ chunk-xc4g26h5.js:5213-5450 placement
async function extractAdditionalSkillFiles(skillName, capabilityDefs) {
  if (Object.keys(capabilityDefs).length === 0) return null;
  let bundledSkillExtractDir = getBundledSkillExtractDir(skillName);
  try {
    await writeBundledSkillFiles(bundledSkillExtractDir, capabilityDefs, true);
    return bundledSkillExtractDir;
  } catch (error) {
    logForDebugging(
      `Failed to extract additional skill files for '${skillName}' to ${bundledSkillExtractDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
//@ chunk-xc4g26h5.js:5450-5558 placement
function writeBundledSkillFiles(dir, files, tolerateExisting) {
  let bundledSkillFilesElsewhere = getHostState().bundledSkillFilesElsewhere;
  return bundledSkillFilesElsewhere
    ? bundledSkillFilesElsewhere.write(dir, files)
    : writeSkillFiles(dir, files, {
        tolerateExisting,
      });
}
//@ chunk-5xgkngpb.js:3211256-3211318 fingerprint (2.1.88 match: prependBaseDir, 1)
/**
 * 返回「Base directory for this skill: <dir>」前缀行，skill 提示词前置使用。
 */
function prependBaseDir(baseDir) {
  return `Base directory for this skill: ${baseDir}

`;
}
//@ chunk-ndr12bqk.js:7224-7366 fingerprint (2.1.88 match: safeWriteFile, 0.722)
async function safeWriteFile(filePath, directory, content) {
  let pinnedForWrite = await openPinnedForWrite(filePath, directory);
  if (pinnedForWrite === null) return false;
  try {
    await pinnedForWrite.writeFile(content, {
      encoding: "utf8",
    });
  } finally {
    await pinnedForWrite.close();
  }
  return true;
}
//@ chunk-xrwmcqkn.js:61137-61210 fingerprint (2.1.88 match: SAFE_WRITE_FLAGS, 0.719)
function SAFE_WRITE_FLAGS(filePath, isExclusive) {
  return open(
    filePath,
    constants.O_WRONLY | NOFOLLOW_NONBLOCK_FLAGS | (isExclusive ? constants.O_CREAT | constants.O_EXCL : 0),
    384,
  );
}
export {
  registerBundledSkill,
  getRegisteredBundledSkillsIgnoringKillSwitch,
  getBundledSkills,
  prependBaseDir,
  runBundledSkillSessionResets,
  isShippedSkillExecutionBlocked,
  registerBundledSkillSessionReset,
  safeWriteFile,
  getBundledSkillExtractDir,
  extractAdditionalSkillFiles,
  SAFE_WRITE_FLAGS,
  wireSkillFilesExtraction,
};
