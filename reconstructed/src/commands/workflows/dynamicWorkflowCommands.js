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
async function refreshDynamicWorkflowsIfEnabled(host, storageV5) {
  if (isWorkflowsDisabled()) return;
  await allWorkflowsForHost(host, storageV5);
}
//@ chunk-qzez70vf.js:12025-13135 placement
/**
 * 动态生成的 prompt 命令对象（name=o.name）；描述：o.description。
 */
function dynamicWorkflowToCommand(workflow) {
  return {
    type: "prompt",
    name: workflow.name,
    description: workflow.description,
    hasUserSpecifiedDescription: true,
    whenToUse: workflow.whenToUse,
    progressMessage: "running dynamic workflow",
    contentLength: workflow.script.length,
    source: workflow.source === "built-in" ? "bundled" : workflow.source,
    loadedFrom:
      workflow.source === "built-in" ? "bundled" : workflow.source === "plugin" ? "plugin" : "skills",
    ...(workflow.source === "plugin" && {
      pluginInfo: {
        pluginManifest: workflow.pluginManifest,
        repository: workflow.plugin,
        ...(workflow.serverPluginId !== undefined && {
          serverPluginId: workflow.serverPluginId,
        }),
      },
    }),
    kind: "workflow",
    disableModelInvocation:
      typeof workflow.disableModelInvocation === "function"
        ? workflow.disableModelInvocation()
        : workflow.disableModelInvocation,
    async getPromptForCommand(args, context) {
      let phasesNote = workflow.phases
        ? `

Phases:
` +
          workflow.phases.map((phase) => `- ${phase.title}${phase.detail ? `: ${phase.detail}` : ""}`).join(`
`)
        : "";
      let trimmed = args.trim();
      let nameJson = jsonStringify(workflow.name);
      let invocation = trimmed
        ? `{ name: ${nameJson}, args: ${jsonStringify(trimmed)} }`
        : `{ name: ${nameJson} }`;
      let authoringNote = isWorkflowAuthoringSkillVisible(context?.options?.tools)
        ? `

If the user asks you to modify this workflow or write a new script, load the \`${WORKFLOW_AUTHORING}\` skill first.`
        : "";
      return [
        {
          type: "text",
          text: `Run the "${workflow.name}" workflow.

${workflow.description}${
            workflow.whenToUse
              ? `

${workflow.whenToUse}`
              : ""
          }${phasesNote}

Invoke: Workflow(${invocation})${authoringNote}`,
        },
      ];
    },
  };
}
//@ chunk-qzez70vf.js:13135-13205 placement
async function listDynamicWorkflowCommands(host, storageV5) {
  if (!isWorkflowsAvailable()) return [];
  return (await allWorkflowsForHost(host, storageV5)).map(dynamicWorkflowToCommand);
}
export { listDynamicWorkflowCommands, refreshDynamicWorkflowsIfEnabled };
