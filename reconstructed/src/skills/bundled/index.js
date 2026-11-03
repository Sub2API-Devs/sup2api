/**
 * skills/bundled/index.ts
 *
 * 并入已有模块：内置技能注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/index.ts
 * pieces: chunk-hantmvxa.js (5), chunk-pjf54ny3.js (1)
 * attribution: placement 2, sole-consumer 3, callgraph-witnessed 1
 */
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import {
  registerDesignSyncSkill,
  registerFewerPermissionPromptsSkill,
  registerDoctorSkill,
  registerExplainUsageSkill,
} from "./_new/buildDoctorPrompt.js";
import { registerDatavizSkill } from "./stuck.js";
import { registerUpdateConfigSkill } from "./updateConfig.js";
import { registerKeybindingsSkill } from "./keybindings.js";
import { registerDebugSkill } from "./debug.js";
import { rn, sn, registerCreatePrSkill, registerSimplifySkill, ln } from "./_new/getSkillifyPrompt.js";
import { registerMemoryTypesSkill } from "./remember.js";
import { registerCodeReviewSkill } from "../../commands/review/reviewCommand.js";
import { command } from "../../commands/commit.js";
import { registerBatchSkill, Ct } from "./batch.js";
import { Co, _o } from "./_new/index.helpers-hant.js";
import { registerCoworkPluginSkill } from "./verify.js";
import { registerClaudeInChromeSkill } from "./claudeInChrome.js";
import { isClaudeInChromeBlockedByEnterpriseMcpConfig } from "../../services/mcp/config.js";

//@ chunk-hantmvxa.js:183105-183126 placement
function Vo() {
  return;
}
//@ chunk-hantmvxa.js:218912-218963 sole-consumer
function pn() {
  return import("./chunk-t40rc4mm.js");
}
/**
 * verify 内置技能的描述文本：端到端验证代码改动是否真的生效。
 */
//@ chunk-hantmvxa.js:218963-219435 sole-consumer
var VERIFY_SKILL_DESCRIPTION =
  "Verify that a code change actually does what it's supposed to by exercising it end-to-end and observing behavior \u2014 drive the affected flow, not just tests or typecheck. Run before committing nontrivial changes; bootstraps this repo's project verify skill if none exists yet. Don't invoke it on a diff that only touches tests, docs, or other code with no runtime surface to drive (a change to product source always has one) \u2014 there's nothing to observe.";
/**
 * 注册内置 verify 技能：描述"端到端验证改动"，模型调用受开关控制；提示词为 SKILL.md 正文，可追加项目 run 技能说明与用户请求。
 */
//@ chunk-hantmvxa.js:219435-219884 sole-consumer
function registerVerifySkill() {
  let e = io(UWn);
  registerBundledSkill({
    name: VERIFY,
    description: VERIFY_SKILL_DESCRIPTION,
    menuDescription: "Try your change and report if it works",
    userInvocable: !0,
    disableModelInvocation: () => !isVerifySkillRolloutOn(),
    files: async () => ({ ...(await pn().then((n) => n.SKILL_FILES)), ...(await e())?.files }),
    async getPromptForCommand(n, s, r) {
      let { SKILL_MD: SKILL_MD } = await pn(),
        y = [parseFrontmatter(SKILL_MD).content.trimStart()],
        w = await e();
      if (w && r) y.push(w.note);
      if (n)
        y.push(`## User Request

${n}`);
      return [
        {
          type: "text",
          text: y.join(`

`),
        },
      ];
    },
  });
}
/**
 * 注册全部内置（bundled）skill，只执行一次。CLAUDE_CODE_ENTRYPOINT=local-agent 时只注册少数几个；否则注册 design、artifact-*、loop、update-config、keybindings-help、debug、memory-types、batch、verify、simplify、commit/pr/code-review、dataviz、cowork-plugin、schedule、send-to-project、claude-code-docs、workflow-authoring、claude-in-chrome、run 等，各自带 isEnabled 门控。
 */
//@ chunk-hantmvxa.js:219884-221037 callgraph-witnessed = initBundledSkills (0.216)
function initBundledSkills() {
  let e = getHostState();
  if (e.bundledSkillsInitialized) return;
  if (((e.bundledSkillsInitialized = !0), env.CLAUDE_CODE_ENTRYPOINT === "local-agent")) {
    if ((registerDesignSkill({ hubMode: !1, designSync: !1 }), isCoworkFramePublishSession()))
      (registerArtifactDesignSkill(),
        registerArtifactDiagramSkill(),
        registerSlidesSkill(),
        createCapabilityProbeCache());
    return;
  }
  (registerDesignSkill({ hubMode: !0, designSync: !0 }),
    registerSlidesSkill(),
    registerDesignSyncSkill(),
    registerDatavizSkill(),
    registerArtifactDesignSkill(),
    registerArtifactDiagramSkill(),
    createCapabilityProbeCache(),
    registerUpdateConfigSkill(),
    registerKeybindingsSkill(),
    registerVerifySkill(),
    registerDebugSkill(),
    Vo(),
    rn(),
    sn(),
    registerMemoryTypesSkill(),
    registerCodeReviewSkill(),
    command(),
    registerCreatePrSkill(),
    registerSimplifySkill(),
    registerBatchSkill(),
    ln(),
    Co(),
    _o(),
    Ct(),
    registerFewerPermissionPromptsSkill(),
    registerDoctorSkill(),
    registerCoworkPluginSkill(),
    registerExplainUsageSkill());
  {
    let { registerCoworkSetupSkill: registerCoworkSetupSkill } = require("./chunk-7rek18ct.js");
    registerCoworkSetupSkill();
  }
  let { registerLoopSkill: registerLoopSkill } = require("./chunk-gbtb0mjv.js");
  registerLoopSkill();
  let {
    registerScheduleRemoteAgentsSkill: registerScheduleRemoteAgentsSkill,
  } = require("./chunk-m3arwd1y.js");
  registerScheduleRemoteAgentsSkill();
  {
    let { registerContinueInProjectsSkill: registerContinueInProjectsSkill } = require("./chunk-9a33p5tx.js");
    registerContinueInProjectsSkill();
  }
  let { registerClaudeApiSkill: registerClaudeApiSkill } = require("./chunk-7dsm65bp.js");
  registerClaudeApiSkill({ disabled: env.CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL === !0 });
  let { registerClaudeCodeSkill: registerClaudeCodeSkill } = require("./chunk-ym2xht5h.js");
  registerClaudeCodeSkill({ disabled: env.CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL === !0 });
  let { registerWorkflowAuthoringSkill: registerWorkflowAuthoringSkill } = require("./chunk-rdqf4e9x.js");
  (registerWorkflowAuthoringSkill(),
    registerClaudeInChromeSkill({
      disabled: isClaudeInChromeBlockedByEnterpriseMcpConfig() || env.CLAUDE_CODE_DISABLE_CFC_PROMPT === !0,
    }));
  let { registerRunSkill: registerRunSkill } = require("./chunk-g8z8w057.js"),
    { registerRunSkillGeneratorSkill: registerRunSkillGeneratorSkill } = require("./chunk-9vtynjjv.js");
  (registerRunSkill(), registerRunSkillGeneratorSkill());
}
//@ chunk-pjf54ny3.js:191-224 placement
async function UWn() {
  return null;
}

export { initBundledSkills, UWn };
