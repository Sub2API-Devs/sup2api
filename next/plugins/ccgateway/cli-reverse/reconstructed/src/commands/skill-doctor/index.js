/**
 * commands/skill-doctor/index.ts
 *
 * /skill-doctor 的 local-jsx 与 thin-client 两个命令对象：列出未使用却占上下文的技能（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2082083-2082491 placement
/**
 * /skill-doctor 的 local-jsx 与 thin-client 两个命令对象：列出未使用却占上下文的技能。
 */
var skillDoctorCommand = {
  type: "local-jsx",
  name: "skill-doctor",
  description: "Show which loaded skills are unused and costing context",
  immediate: true,
  thinClientDispatch: "twin",
};
var skillDoctorNonInteractiveCommand = {
  type: "local",
  name: "skill-doctor",
  description: "Show which loaded skills are unused and costing context",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./skill-doctor.js"),
};
export { skillDoctorCommand, skillDoctorNonInteractiveCommand };
