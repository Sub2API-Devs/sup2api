/**
 * commands/wellbeing/index.ts
 *
 * 2.1.316 新增：/wellbeing 命令对象：使用时长与休息提醒设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
//@ chunk-e6aww6q8.js:2050636-2050855 placement
/**
 * /wellbeing 命令对象（local-jsx）；描述：Configure optional break reminders and quiet-hours nudges；别名 ["breaks","break-reminder","downtime"]；isEnabled: ()=>!1；实现 chunk-a7sxm3q7.js 的 L。
 */
var wellbeingCommandDefinition = {
  type: "local-jsx",
  name: "wellbeing",
  aliases: ["breaks", "break-reminder", "downtime"],
  description: "Configure optional break reminders and quiet-hours nudges",
  isEnabled: () => false,
  immediate: true,
  requires: {
    ink: true,
  },
};
var wellbeingCommand = wellbeingCommandDefinition;
export { wellbeingCommand };
