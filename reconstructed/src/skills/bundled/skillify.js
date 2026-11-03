/**
 * skills/bundled/skillify.ts
 *
 * /design 内置 skill（Claude Design 子命令分派），旧版 skillify 位置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/skillify.ts
 * pieces: chunk-hantmvxa.js (2)
 * attribution: file-last-pair 1, callgraph-fingerprint 1
 */
import { isBundledSkillGatedOff } from "../bundledSkillsGate.js";
import { DESIGN } from "./bundledSkillNames.js";
import { isDesignSyncAllowed, DESIGN_SYNC_POLICY } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { isDesignSyncEnabled } from "../../services/designSync/gates.js";
import {
  DESIGN_SUBCOMMANDS,
  resolveDesignCommandMode,
  DESIGN_COMMAND_VARIANTS,
  rt,
  getDesignPromptForCommand,
} from "./design.js";
import { registerBundledSkill } from "../bundledSkills.js";

//@ chunk-hantmvxa.js:111106-111319 file-last-pair
function extractUserMessages(messages) {
  let n = isBundledSkillGatedOff(DESIGN);
  let s = isDesignSyncAllowed();
  let r = !n && messages.designSync && s;
  let h = !n && isDesignSyncEnabled();
  let y = new Set([
    ...(s ? ["consent", "revoke"] : []),
    ...(r ? ["sync", "login"] : []),
    ...(h ? ["import", "export", "status"] : []),
  ]);
  return DESIGN_SUBCOMMANDS.filter((w) => y.has(w.value));
}
//@ chunk-hantmvxa.js:111319-111817 callgraph-fingerprint = registerSkillifySkill (0.199)
/**
 * 注册 /design 内置 skill（Claude Design：sync/login/consent/revoke/import/export/status 子命令），survivesBundledKillSwitch，带 policyGate；只能用户调用。
 */
function registerDesignSkill(messages) {
  let n = () => resolveDesignCommandMode(messages);
  let s = () => DESIGN_COMMAND_VARIANTS[n() ?? "consent"];
  registerBundledSkill({
    name: DESIGN,
    description: () => s().description(),
    menuDescription: () => s().menu(),
    argumentHint: () => s().hint,
    subcommands: rt,
    subcommandsBareOnly: true,
    isEnabled: () => n() !== null,
    survivesBundledKillSwitch: true,
    policyGate: () => (n() === "types" ? undefined : DESIGN_SYNC_POLICY),
    userInvocable: true,
    disableModelInvocation: true,
    async getArgumentCompletions(r, h) {
      if (r.length > 0) return [];
      let lower = h.toLowerCase();
      return extractUserMessages(messages).filter((w) => w.value.startsWith(lower));
    },
    getPromptForCommand: (r) => getDesignPromptForCommand(r, messages),
  });
}
export { registerDesignSkill };
