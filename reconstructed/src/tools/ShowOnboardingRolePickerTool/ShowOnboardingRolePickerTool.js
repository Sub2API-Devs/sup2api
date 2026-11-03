/**
 * tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.ts
 *
 * 2.1.316 新增：ShowOnboardingRolePicker 工具（Cowork 引导中显示角色选择芯片）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hg2zbde4.js (1)
 * attribution: placement 1
 */

//@ chunk-hg2zbde4.js:2980-3974 placement
var SHOWONBOARDINGROLEPICKER = "ShowOnboardingRolePicker",
  asi =
    "Render a clickable role-picker chip row during Cowork onboarding so the user can pick their role and get a matching plugin installed.",
  lsi = `Render a clickable role-picker chip row during Cowork onboarding. Call this when asking the user what kind of work they do so they can pick their role and get a matching plugin installed. The role list is hardcoded in the frontend \u2014 call with no args.

The call blocks until the user responds. Three resolution paths all land in the tool result: chip click or free-form typed answer \u2192 {"role": "Legal"} or {"role": "paralegal"}; X button \u2192 {"dismissed": true}. An empty object {} means the user approved without picking a role \u2014 treat it like a dismissal. Free-form roles may not match the chip list \u2014 search the marketplace with whatever string you get.

Do NOT call this in normal conversation. Only call this when explicitly helping the user set up Cowork for their role/job function.`;

export { SHOWONBOARDINGROLEPICKER, asi, lsi };
