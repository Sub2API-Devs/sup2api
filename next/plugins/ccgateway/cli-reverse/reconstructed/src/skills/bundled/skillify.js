/**
 * skills/bundled/skillify.ts
 *
 * /design 内置 skill（Claude Design 子命令分派），旧版 skillify 位置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/skillify.ts
 * pieces: chunk-ne2890fx.js (2)
 * attribution: file-last-pair 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isBundledSkillGatedOff } from "../bundledSkillsGate.js";
import { DESIGN } from "./bundledSkillNames.js";
import { isDesignSyncAllowed, DESIGN_SYNC_POLICY } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { isDesignSyncEnabled } from "../../services/designSync/gates.js";
import {
  DESIGN_SUBCOMMANDS,
  resolveDesignCommandMode,
  DESIGN_COMMAND_VARIANTS,
  DESIGN_SUBCOMMAND_BY_NAME,
  getDesignPromptForCommand,
} from "./design.js";
import { registerBundledSkill } from "../bundledSkills.js";

//@ chunk-ne2890fx.js:111287-111500 file-last-pair
function extractUserMessages(messages) {
  let isGatedOff = isBundledSkillGatedOff(DESIGN);
  let syncAllowed = isDesignSyncAllowed();
  let syncOffered = !isGatedOff && messages.designSync && syncAllowed;
  let importsEnabled = !isGatedOff && isDesignSyncEnabled();
  let availableValues = new Set([
    ...(syncAllowed ? ["consent", "revoke"] : []),
    ...(syncOffered ? ["sync", "login"] : []),
    ...(importsEnabled ? ["import", "export", "status"] : []),
  ]);
  return DESIGN_SUBCOMMANDS.filter((subcommand) => availableValues.has(subcommand.value));
}
//@ chunk-ne2890fx.js:111500-111998 callgraph-fingerprint (2.1.88 match: registerSkillifySkill, 0.2)
/**
 * 注册 /design 内置 skill（Claude Design：sync/login/consent/revoke/import/export/status 子命令），survivesBundledKillSwitch，带 policyGate；只能用户调用。
 */
function registerDesignSkill(sessionConfig) {
  let commandMode = () => resolveDesignCommandMode(sessionConfig);
  let variant = () => DESIGN_COMMAND_VARIANTS[commandMode() ?? "consent"];
  registerBundledSkill({
    name: DESIGN,
    description: () => variant().description(),
    menuDescription: () => variant().menu(),
    argumentHint: () => variant().hint,
    subcommands: DESIGN_SUBCOMMAND_BY_NAME,
    subcommandsBareOnly: true,
    isEnabled: () => commandMode() !== null,
    survivesBundledKillSwitch: true,
    policyGate: () => (commandMode() === "types" ? undefined : DESIGN_SYNC_POLICY),
    userInvocable: true,
    disableModelInvocation: true,
    async getArgumentCompletions(typedArgs, prefix) {
      if (typedArgs.length > 0) return [];
      let lower = prefix.toLowerCase();
      return extractUserMessages(sessionConfig).filter((subcommand) => subcommand.value.startsWith(lower));
    },
    getPromptForCommand: (args) => getDesignPromptForCommand(args, sessionConfig),
  });
}
export { registerDesignSkill };
