/**
 * skills/bundled/artifactTypeAlias.ts
 *
 * 2.1.316 新增。Design/Slides 技能的提示：用已发布的 Artifact 类型新建 artifact。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6fr52gnc.js (7)
 * attribution: placement 7
 */
import { isArtifactToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import {
  artifactTypeListAndCreatePromptGateOpen,
  artifactQuickstartPromptGateOpen,
} from "../../services/artifacts/artifactToolSchema.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { isBuiltInArtifactHiddenForMcp } from "../../services/artifacts/artifactsMcpTools.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { registerLoremIpsumSkill } from "./loremIpsum.js";

//@ chunk-6fr52gnc.js:412-427 placement
var SLIDES = "slides";
//@ chunk-6fr52gnc.js:427-461 placement
function isArtifactTypeAliasEnabled() {
  return isArtifactToolEnabled() && artifactTypeListAndCreatePromptGateOpen();
}
//@ chunk-6fr52gnc.js:461-522 placement
function orgAllowsArtifactTypeAlias(options) {
  return options.policyKey === undefined || isPolicyAllowed(options.policyKey);
}
//@ chunk-6fr52gnc.js:522-557 placement
/**
 * 判断某类型别名是否可用（功能开关 + 组织策略）。
 */
function isArtifactTypeAliasReady(options) {
  return isArtifactTypeAliasEnabled() && orgAllowsArtifactTypeAlias(options);
}
//@ chunk-6fr52gnc.js:557-1063 placement
/**
 * slides 内置技能使用的类型别名定义。
 */
var DESIGN_TYPE_ALIAS = {
  name: "design",
  intent: "design",
  typeTitle: "Design",
  policyKey: "allow_cobalt_plinth_bramble",
  nounPhrase: "a design",
  askWhenNoBrief: "what they want designed",
  description: "Make a new Design artifact from a brief",
  argumentHint: "[what to design]",
};
var SLIDES_TYPE_ALIAS = {
  name: SLIDES,
  intent: "slides",
  typeTitle: "Slides",
  policyKey: "allow_cobalt_plinth_juniper",
  nounPhrase: "a slide deck",
  askWhenNoBrief: "what the deck should be about",
  description: "Make a new Slides deck artifact from a brief",
  argumentHint: "[what the deck is about]",
};
//@ chunk-6fr52gnc.js:1063-4783 placement
/**
 * Design/Slides 技能的提示：用已发布的 Artifact 类型新建 artifact。
 */
function buildArtifactTypeAliasPrompt(
  { name: commandName, intent, typeTitle, nounPhrase, askWhenNoBrief },
  brief,
) {
  let trimmed = brief.trim();
  return [
    (isBuiltInArtifactHiddenForMcp()
      ? intent !== undefined
        ? `\`/${commandName}\` was invoked: a request for ${nounPhrase} made as a NEW Artifact from the published Artifact type titled "${typeTitle}". Find that type among the Artifact types your artifact tools offer this user, the way their own guidance says to (if that leaves more than one with that title, ask the user which before creating). Create the new Artifact from it with a \`title\` drawn from the brief and nothing else yet, because the result of that call carries the type's instructions, then fill it by following them. If no type titled "${typeTitle}" is offered to this user, say so plainly; if the tool result that told you so suggests another route, take it, and otherwise offer to make ${nounPhrase} another way.`
        : `\`/${commandName}\` was invoked: a request for ${nounPhrase} made as a NEW Artifact from the published Artifact type titled "${typeTitle}". Skip any quickstart step your artifact tools have, which has no option for this type: list all the Artifact types they offer this user and take the first-party type titled "${typeTitle}" (a first-party row starts with a tier in brackets, such as \`[core]\`; if no row has one, go by title alone; if more than one row fits, ask the user which before creating). Create the new Artifact from it with a \`title\` drawn from the brief and nothing else yet, because the result of that call carries the type's instructions, then fill it by following them. If no type that fits is offered to this user, say so plainly and offer to make ${nounPhrase} another way.`
      : undefined) ??
      (intent === undefined
        ? `\`/${commandName}\` was invoked: a request for ${nounPhrase} made as a NEW Artifact from the published Artifact type titled "${typeTitle}". ${artifactQuickstartPromptGateOpen() ? "No quickstart call is needed: use" : "Use"} the \`${ARTIFACT_TOOL_NAME}\` tool to list the Artifact types available to this user (\`type_query: "${typeTitle}"\`), take the first-party type titled "${typeTitle}" (a first-party row opens with its tier in brackets, such as \`[core]\`; if more than one has that title, ask the user which before creating), create the new Artifact from its \`type_url\` \u2014 a \`title\` drawn from the brief, and no files at first so the type's instructions arrive \u2014 then fill it by following those instructions. If no first-party type titled "${typeTitle}" is listed for this user, say so plainly and offer to make ${nounPhrase} another way.`
        : artifactQuickstartPromptGateOpen()
          ? `\`/${commandName}\` was invoked: a request for ${nounPhrase} made as a NEW Artifact from the published Artifact type titled "${typeTitle}". Call the \`${ARTIFACT_TOOL_NAME}\` tool with \`action: "quickstart"\` and \`intent: "${intent}"\` (adding \`design_systems: false\` if you already have a design system's link or the user declined one), then do what its result says: create the new Artifact from the type it names \u2014 a \`title\` drawn from the brief, and no files at first so the type's instructions arrive \u2014 and fill it by following those instructions. If it says no such type is listed for this user, say so plainly, then do what it says instead.`
          : `\`/${commandName}\` was invoked: a request for ${nounPhrase} made as a NEW Artifact from the published Artifact type titled "${typeTitle}". Use the \`${ARTIFACT_TOOL_NAME}\` tool the way its Artifact-types guidance describes: list the Artifact types available to this user (\`type_query: "${typeTitle}"\`), take the listed type whose title is "${typeTitle}" (if more than one has that title, ask the user which before creating), create the new Artifact from its \`type_url\` \u2014 a \`title\` drawn from the brief, and no files at first so the type's instructions arrive \u2014 then fill it by following those instructions. If no type titled "${typeTitle}" is listed for this user, say so plainly and offer to make ${nounPhrase} another way.`),
    trimmed
      ? `The brief:

${trimmed}`
      : `No brief was given \u2014 ask the user ${askWhenNoBrief} before creating anything.`,
  ].join(`

`);
}
//@ chunk-6fr52gnc.js:4783-4803 placement
function registerSlidesSkill() {
  registerLoremIpsumSkill(SLIDES_TYPE_ALIAS);
}
export {
  isArtifactTypeAliasReady,
  buildArtifactTypeAliasPrompt,
  registerSlidesSkill,
  isArtifactTypeAliasEnabled,
  orgAllowsArtifactTypeAlias,
  DESIGN_TYPE_ALIAS,
};
