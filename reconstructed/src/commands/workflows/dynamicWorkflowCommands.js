/**
 * commands/workflows/dynamicWorkflowCommands.ts
 *
 * 2.1.316 新增。把动态工作流注册成斜杠命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qzez70vf.js (3)
 * attribution: placement 3
 */
import { isWorkflowsDisabled, isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";
import { allWorkflowsForHost } from "../../services/workflow/loadWorkflows.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isWorkflowAuthoringSkillVisible } from "../../skills/skillVisibility.js";
import { WORKFLOW_AUTHORING } from "../../skills/bundled/bundledSkillNames.js";

//@ chunk-qzez70vf.js:11972-12025 placement
async function refreshDynamicWorkflowsIfEnabled(o, n) {
  if (isWorkflowsDisabled()) return;
  await allWorkflowsForHost(o, n);
}
//@ chunk-qzez70vf.js:12025-13135 placement
/**
 * 动态生成的 prompt 命令对象（name=o.name）；描述：o.description。
 */
function dynamicWorkflowToCommand(o) {
  return {
    type: "prompt",
    name: o.name,
    description: o.description,
    hasUserSpecifiedDescription: true,
    whenToUse: o.whenToUse,
    progressMessage: "running dynamic workflow",
    contentLength: o.script.length,
    source: o.source === "built-in" ? "bundled" : o.source,
    loadedFrom: o.source === "built-in" ? "bundled" : o.source === "plugin" ? "plugin" : "skills",
    ...(o.source === "plugin" && {
      pluginInfo: {
        pluginManifest: o.pluginManifest,
        repository: o.plugin,
        ...(o.serverPluginId !== undefined && {
          serverPluginId: o.serverPluginId,
        }),
      },
    }),
    kind: "workflow",
    disableModelInvocation:
      typeof o.disableModelInvocation === "function" ? o.disableModelInvocation() : o.disableModelInvocation,
    async getPromptForCommand(args, context) {
      let s = o.phases
        ? `

Phases:
` +
          o.phases.map((phase) => `- ${phase.title}${phase.detail ? `: ${phase.detail}` : ""}`).join(`
`)
        : "";
      let trimmed = args.trim();
      let i = jsonStringify(o.name);
      let a = trimmed ? `{ name: ${i}, args: ${jsonStringify(trimmed)} }` : `{ name: ${i} }`;
      let l = isWorkflowAuthoringSkillVisible(context?.options?.tools)
        ? `

If the user asks you to modify this workflow or write a new script, load the \`${WORKFLOW_AUTHORING}\` skill first.`
        : "";
      return [
        {
          type: "text",
          text: `Run the "${o.name}" workflow.

${o.description}${
            o.whenToUse
              ? `

${o.whenToUse}`
              : ""
          }${s}

Invoke: Workflow(${a})${l}`,
        },
      ];
    },
  };
}
//@ chunk-qzez70vf.js:13135-13205 placement
async function listDynamicWorkflowCommands(o, n) {
  if (!isWorkflowsAvailable()) return [];
  return (await allWorkflowsForHost(o, n)).map(dynamicWorkflowToCommand);
}
