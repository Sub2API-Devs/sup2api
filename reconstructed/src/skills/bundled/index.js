/**
 * skills/bundled/index.ts
 *
 * 并入已有模块：内置技能注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/index.ts
 * pieces: chunk-hantmvxa.js (7), chunk-pjf54ny3.js (1)
 * attribution: placement 4, sole-consumer 3, callgraph-witnessed 1
 */
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { registerBundledSkill } from "../bundledSkills.js";
import { VERIFY } from "./bundledSkillNames.js";
import { isVerifySkillRolloutOn } from "../../services/projectsRelay/relayGates.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { env } from "../../utils/env.js";
import { registerDesignSkill } from "./skillify.js";
import { isCoworkFramePublishSession } from "../../services/artifacts/artifactToolGates.js";
import { registerArtifactDesignSkill } from "./artifactDesign.js";
import { registerArtifactDiagramSkill } from "./artifactDiagram.js";
import { registerSlidesSkill } from "./artifactTypeAlias.js";
import { createCapabilityProbeCache } from "../../tools/ArtifactTool/capabilitiesPrompt.js";
import { registerDesignSyncSkill } from "./designSync.js";
import { registerDatavizSkill } from "./stuck.js";
import { registerUpdateConfigSkill } from "./updateConfig.js";
import { registerKeybindingsSkill } from "./keybindings.js";
import { registerDebugSkill } from "./debug.js";
import { noopStuckSkillStub } from "./skillifyPrompt.js";
import { noopSimplifySkillStub, registerCreatePrSkill } from "./createPr.js";
import { registerMemoryTypesSkill } from "./remember.js";
import { registerCodeReviewSkill } from "../../commands/review/reviewCommand.js";
import { command } from "../../commands/commit.js";
import { registerSimplifySkill } from "./simplify.js";
import { registerBatchSkill, noopBatchSkillStub } from "./batch.js";
import { noopUpdateConfigSkillStub } from "./stuckPrompt.js";
import { registerFewerPermissionPromptsSkill } from "./fewerPermissionPrompts.js";
import { registerDoctorSkill } from "./doctor.js";
import { registerCoworkPluginSkill } from "./verify.js";
import { registerExplainUsageSkill } from "./explainUsageSkill.js";
import { registerClaudeInChromeSkill } from "./claudeInChrome.js";
import { isClaudeInChromeBlockedByEnterpriseMcpConfig } from "../../services/mcp/config.js";

//@ chunk-pjf54ny3.js:191-224 placement
/**
 * 恒返回 null 的占位函数。
 */
async function alwaysNull() {
  return null;
}
//@ chunk-hantmvxa.js:99414-99429 placement
function noopCoworkPluginSkillStub() {}
//@ chunk-hantmvxa.js:99429-99444 placement
function noopCoworkSetupSkillStub() {}
//@ chunk-hantmvxa.js:183105-183126 placement
/**
 * 空函数（占位）。
 */
function noop() {
  return;
}
//@ chunk-hantmvxa.js:218912-218963 sole-consumer
/**
 * 动态加载 verify 技能内容模块。
 */
function loadVerifyContentModule() {
  return import("./verifyContent.js");
}
//@ chunk-hantmvxa.js:218963-219435 sole-consumer
/**
 * verify 内置技能的描述文本：端到端验证代码改动是否真的生效。
 */
var VERIFY_SKILL_DESCRIPTION =
  "Verify that a code change actually does what it's supposed to by exercising it end-to-end and observing behavior \u2014 drive the affected flow, not just tests or typecheck. Run before committing nontrivial changes; bootstraps this repo's project verify skill if none exists yet. Don't invoke it on a diff that only touches tests, docs, or other code with no runtime surface to drive (a change to product source always has one) \u2014 there's nothing to observe.";
//@ chunk-hantmvxa.js:219435-219884 sole-consumer
/**
 * 注册内置 verify 技能：描述"端到端验证改动"，模型调用受开关控制；提示词为 SKILL.md 正文，可追加项目 run 技能说明与用户请求。
 */
function registerVerifySkill() {
  let loadExtraContent = memoizeAlias(alwaysNull);
  registerBundledSkill({
    name: VERIFY,
    description: VERIFY_SKILL_DESCRIPTION,
    menuDescription: "Try your change and report if it works",
    userInvocable: true,
    disableModelInvocation: () => !isVerifySkillRolloutOn(),
    files: async () => ({
      ...(await loadVerifyContentModule().then((verifyContentModule) => verifyContentModule.SKILL_FILES)),
      ...(await loadExtraContent())?.files,
    }),
    async getPromptForCommand(args, context, toolUseContext) {
      let { SKILL_MD } = await loadVerifyContentModule();
      let parts = [parseFrontmatter(SKILL_MD).content.trimStart()];
      let extraContent = await loadExtraContent();
      if (extraContent && toolUseContext) parts.push(extraContent.note);
      if (args)
        parts.push(`## User Request

${args}`);
      return [
        {
          type: "text",
          text: parts.join(`

`),
        },
      ];
    },
  });
}
//@ chunk-hantmvxa.js:219884-221037 callgraph-witnessed = initBundledSkills (0.216)
/**
 * 注册全部内置（bundled）skill，只执行一次。CLAUDE_CODE_ENTRYPOINT=local-agent 时只注册少数几个；否则注册 design、artifact-*、loop、update-config、keybindings-help、debug、memory-types、batch、verify、simplify、commit/pr/code-review、dataviz、cowork-plugin、schedule、send-to-project、claude-code-docs、workflow-authoring、claude-in-chrome、run 等，各自带 isEnabled 门控。
 */
function initBundledSkills() {
  let hostState = getHostState();
  if (hostState.bundledSkillsInitialized) return;
  hostState.bundledSkillsInitialized = true;
  if (env.CLAUDE_CODE_ENTRYPOINT === "local-agent") {
    registerDesignSkill({
      hubMode: false,
      designSync: false,
    });
    if (isCoworkFramePublishSession()) {
      registerArtifactDesignSkill();
      registerArtifactDiagramSkill();
      registerSlidesSkill();
      createCapabilityProbeCache();
    }
    return;
  }
  registerDesignSkill({
    hubMode: true,
    designSync: true,
  });
  registerSlidesSkill();
  registerDesignSyncSkill();
  registerDatavizSkill();
  registerArtifactDesignSkill();
  registerArtifactDiagramSkill();
  createCapabilityProbeCache();
  registerUpdateConfigSkill();
  registerKeybindingsSkill();
  registerVerifySkill();
  registerDebugSkill();
  noop();
  noopStuckSkillStub();
  noopSimplifySkillStub();
  registerMemoryTypesSkill();
  registerCodeReviewSkill();
  command();
  registerCreatePrSkill();
  registerSimplifySkill();
  registerBatchSkill();
  noopUpdateConfigSkillStub();
  noopCoworkPluginSkillStub();
  noopCoworkSetupSkillStub();
  noopBatchSkillStub();
  registerFewerPermissionPromptsSkill();
  registerDoctorSkill();
  registerCoworkPluginSkill();
  registerExplainUsageSkill();
  {
    let { registerCoworkSetupSkill } = require("./setupCowork.js");
    registerCoworkSetupSkill();
  }
  let { registerLoopSkill } = require("./loop.js");
  registerLoopSkill();
  let { registerScheduleRemoteAgentsSkill } = require("./scheduleRemoteAgents.js");
  registerScheduleRemoteAgentsSkill();
  {
    let {
      registerContinueInProjectsSkill,
    } = require("../../commands/send-to-project/registerContinueInProjectsSkill.lazy.js");
    registerContinueInProjectsSkill();
  }
  let { registerClaudeApiSkill } = require("./claudeApiSkill.js");
  registerClaudeApiSkill({
    disabled: env.CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL === true,
  });
  let { registerClaudeCodeSkill } = require("./claudeApi.js");
  registerClaudeCodeSkill({
    disabled: env.CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL === true,
  });
  let { registerWorkflowAuthoringSkill } = require("./workflowAuthoring.js");
  registerWorkflowAuthoringSkill();
  registerClaudeInChromeSkill({
    disabled: isClaudeInChromeBlockedByEnterpriseMcpConfig() || env.CLAUDE_CODE_DISABLE_CFC_PROMPT === true,
  });
  let { registerRunSkill } = require("./run.js");
  let { registerRunSkillGeneratorSkill } = require("./runSkillGenerator.js");
  registerRunSkill();
  registerRunSkillGeneratorSkill();
}
export { initBundledSkills, alwaysNull };
