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

/**
 * 把内置插件的技能包装为提示命令（提取技能文件）。
 */
//@ chunk-bfnfj4kx.js:78223-80118 placement
function builtinPluginSkillCommand(e, o) {
  let builtinPluginWiredSkills = getHostState().builtinPluginWiredSkills,
    r = builtinPluginWiredSkills.get(e);
  if (!r) {
    let { wireSkillFilesExtraction: wireSkillFilesExtraction } = require("./chunk-et4cgz1y.js");
    ((r = wireSkillFilesExtraction(e)), builtinPluginWiredSkills.set(e, r));
  }
  let { skillRoot: skillRoot, getPromptForCommand: getPromptForCommand } = r;
  tagHooksWithSource(e.hooks ?? {}, o);
  let p = {
    type: "prompt",
    name: e.name,
    description: typeof e.description === "function" ? "" : e.description,
    menuDescription: typeof e.menuDescription === "function" ? void 0 : e.menuDescription,
    aliases: e.aliases,
    hasUserSpecifiedDescription: !0,
    allowedTools: e.allowedTools ?? [],
    getAllowedTools: e.getAllowedTools,
    disallowedTools: e.disallowedTools ?? [],
    argumentHint: typeof e.argumentHint === "function" ? void 0 : e.argumentHint,
    whenToUse: typeof e.whenToUse === "function" ? void 0 : e.whenToUse,
    subcommands: e.subcommands,
    subcommandsBareOnly: e.subcommandsBareOnly,
    model: e.model,
    disableModelInvocation:
      typeof e.disableModelInvocation === "function" ? !0 : (e.disableModelInvocation ?? !1),
    disableBridgeInvocation: e.disableBridgeInvocation,
    userInvocable: e.userInvocable ?? !0,
    terminalOriented: e.terminalOriented,
    argsMayContainSlashCommands: e.argsMayContainSlashCommands,
    contentLength: 0,
    source: "bundled",
    loadedFrom: "bundled",
    hooks: e.hooks,
    context: e.context,
    getContext: e.getContext,
    agent: e.agent,
    background: e.background,
    formatForegroundForkResult: e.formatForegroundForkResult,
    skillRoot: skillRoot,
    isEnabled: e.isEnabled ?? (() => !0),
    policyGate: typeof e.policyGate === "function" ? void 0 : e.policyGate,
    requires: e.requires,
    isHidden: !(e.userInvocable ?? !0),
    progressMessage: e.progressMessage ?? "running",
    getPromptForCommand: getPromptForCommand,
    getEffort: e.getEffort,
    getDefaultEffort: e.getDefaultEffort,
    onUserTypedArgs: e.onUserTypedArgs,
    getArgumentCompletions: e.getArgumentCompletions,
    enterTakesArgumentCompletion: e.enterTakesArgumentCompletion,
  };
  return (
    defineLazyGetter(p, "description", e.description),
    defineLazyGetter(p, "menuDescription", e.menuDescription),
    defineLazyGetter(p, "argumentHint", e.argumentHint),
    defineLazyGetter(p, "whenToUse", e.whenToUse),
    defineLazyGetterAlt(p, "disableModelInvocation", e.disableModelInvocation),
    definePolicyGate(p, e.policyGate),
    p
  );
}

export { builtinPluginSkillCommand };
