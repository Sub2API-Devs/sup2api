/**
 * skills/bundledSkillCommand.ts
 *
 * 2.1.316 新增：把内置插件的技能包装为提示命令（提取技能文件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (1)
 * attribution: placement 1
 */
import { getHostState } from "../utils/hostEnvironment.js";
import { tagHooksWithSource } from "../utils/hooks/sessionHooks.js";
import { defineLazyGetter, defineLazyGetterAlt, definePolicyGate } from "./skillPropertyGetters.js";

//@ chunk-bfnfj4kx.js:78223-80118 placement
/**
 * 把内置插件的技能包装为提示命令（提取技能文件）。
 */
function builtinPluginSkillCommand(skill, o) {
  let builtinPluginWiredSkills = getHostState().builtinPluginWiredSkills;
  let r = builtinPluginWiredSkills.get(skill);
  if (!r) {
    let { wireSkillFilesExtraction } = require("./chunk-et4cgz1y.js");
    r = wireSkillFilesExtraction(skill);
    builtinPluginWiredSkills.set(skill, r);
  }
  let { skillRoot, getPromptForCommand } = r;
  tagHooksWithSource(skill.hooks ?? {}, o);
  let p = {
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
  defineLazyGetter(p, "description", skill.description);
  defineLazyGetter(p, "menuDescription", skill.menuDescription);
  defineLazyGetter(p, "argumentHint", skill.argumentHint);
  defineLazyGetter(p, "whenToUse", skill.whenToUse);
  defineLazyGetterAlt(p, "disableModelInvocation", skill.disableModelInvocation);
  definePolicyGate(p, skill.policyGate);
  return p;
}
export { builtinPluginSkillCommand };
