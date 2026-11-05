/**
 * skills/bundledSkillCommand.ts
 *
 * 2.1.316 新增：把内置插件的技能包装为提示命令（提取技能文件）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6sf70a86.js (1)
 * attribution: placement 1
 */
import { getHostState } from "../utils/hostEnvironment.js";
import { tagHooksWithSource } from "../utils/hooks/sessionHooks.js";
import { defineLazyGetter, defineLazyGetterAlt, definePolicyGate } from "./skillPropertyGetters.js";

//@ chunk-6sf70a86.js:78269-80164 placement
/**
 * 把内置插件的技能包装为提示命令（提取技能文件）。
 */
function builtinPluginSkillCommand(skill, toolUseContext) {
  let builtinPluginWiredSkills = getHostState().builtinPluginWiredSkills;
  let wired = builtinPluginWiredSkills.get(skill);
  if (!wired) {
    let { wireSkillFilesExtraction } = require("./bundledSkills.js");
    wired = wireSkillFilesExtraction(skill);
    builtinPluginWiredSkills.set(skill, wired);
  }
  let { skillRoot, getPromptForCommand } = wired;
  tagHooksWithSource(skill.hooks ?? {}, toolUseContext);
  let command = {
    type: "prompt",
    name: skill.name,
    description: typeof skill.description === "function" ? "" : skill.description,
    menuDescription: typeof skill.menuDescription === "function" ? undefined : skill.menuDescription,
    aliases: skill.aliases,
    hasUserSpecifiedDescription: true,
    allowedTools: skill.allowedTools ?? [],
    getAllowedTools: skill.getAllowedTools,
    disallowedTools: skill.disallowedTools ?? [],
    argumentHint: typeof skill.argumentHint === "function" ? undefined : skill.argumentHint,
    whenToUse: typeof skill.whenToUse === "function" ? undefined : skill.whenToUse,
    subcommands: skill.subcommands,
    subcommandsBareOnly: skill.subcommandsBareOnly,
    model: skill.model,
    disableModelInvocation:
      typeof skill.disableModelInvocation === "function" ? true : (skill.disableModelInvocation ?? false),
    disableBridgeInvocation: skill.disableBridgeInvocation,
    userInvocable: skill.userInvocable ?? true,
    terminalOriented: skill.terminalOriented,
    argsMayContainSlashCommands: skill.argsMayContainSlashCommands,
    contentLength: 0,
    source: "bundled",
    loadedFrom: "bundled",
    hooks: skill.hooks,
    context: skill.context,
    getContext: skill.getContext,
    agent: skill.agent,
    background: skill.background,
    formatForegroundForkResult: skill.formatForegroundForkResult,
    skillRoot,
    isEnabled: skill.isEnabled ?? (() => true),
    policyGate: typeof skill.policyGate === "function" ? undefined : skill.policyGate,
    requires: skill.requires,
    isHidden: !(skill.userInvocable ?? true),
    progressMessage: skill.progressMessage ?? "running",
    getPromptForCommand,
    getEffort: skill.getEffort,
    getDefaultEffort: skill.getDefaultEffort,
    onUserTypedArgs: skill.onUserTypedArgs,
    getArgumentCompletions: skill.getArgumentCompletions,
    enterTakesArgumentCompletion: skill.enterTakesArgumentCompletion,
  };
  defineLazyGetter(command, "description", skill.description);
  defineLazyGetter(command, "menuDescription", skill.menuDescription);
  defineLazyGetter(command, "argumentHint", skill.argumentHint);
  defineLazyGetter(command, "whenToUse", skill.whenToUse);
  defineLazyGetterAlt(command, "disableModelInvocation", skill.disableModelInvocation);
  definePolicyGate(command, skill.policyGate);
  return command;
}
export { builtinPluginSkillCommand };
