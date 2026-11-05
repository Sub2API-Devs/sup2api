/**
 * tools/ArtifactTool/liveSessionPrompt.ts
 *
 * 2.1.316 新增：实时会话提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isArtifactToolsetSplit } from "../../services/artifacts/artifactToolGates.js";
import {
  artifactLiveEditPromptGateOpen,
  artifactLivePathsSchemaOpen,
  artifactRoomPromptGateOpen,
  artifactHandlersPromptGateOpen,
  artifactPreviewPromptGateOpen,
} from "../../services/artifacts/artifactToolSchema.js";
import {
  artifactToolsPresent,
  liftPromptParagraphs,
  PROMPT_SPELLING_SWAPS,
  PROMPT_SPELLING_SWAPS_FULL,
} from "./pagePrompt.js";
import { ROOM_PROMPT_PARAGRAPH } from "./promptText.js";
import { ARTIFACT_CAPABILITY_KEY, SELF } from "../../services/artifacts/capabilityDeclaration.js";
import { ARTIFACT_DATA_TOOL_NAME, ARTIFACT_CHECK_TOOL_NAME } from "./constants.js";
import { previewEngineKind } from "../../services/artifactPreview/browserDiscovery.js";

//@ chunk-ne2890fx.js:4318-4339 placement
/**
 * 本会话追加 Artifact 提示段所用的 live 编辑模块（未注入时为 null）。
 */
var artifactLiveEditModule = null;
var ROOM = "room";
//@ chunk-ne2890fx.js:4339-4868 placement
/**
 * 拆分工具集时为本会话追加的 Artifact 提示段：页面状态存放位置、Live files/sync、Live room，以及交付前的验证说明。
 */
function liveSessionPromptSections(tools, capabilities) {
  if (!isArtifactToolsetSplit()) return [];
  let sections = [];
  let liveEditOn = artifactLiveEditModule !== null && artifactLiveEditPromptGateOpen();
  let stateHome = stateHomeSection(
    capabilities,
    artifactToolsPresent(tools).data,
    artifactLiveEditModule !== null && liveEditOn && artifactLivePathsSchemaOpen()
      ? artifactLiveEditModule.STATE_HOME_LIVE_FILE_ROW
      : "",
  );
  if (stateHome !== "") sections.push(stateHome);
  if (artifactLiveEditModule !== null && liveEditOn)
    sections.push(
      `## Live files \u2014 this session

${(artifactLivePathsSchemaOpen() ? liftPromptParagraphs(artifactLiveEditModule.LIVE_FILES_PROMPT, artifactLiveEditModule.LIVE_FILES_RESPELLINGS) : "").trim()}${liftPromptParagraphs(artifactLiveEditModule.SYNC_PROMPT, artifactToolsPresent(tools).comments ? artifactLiveEditModule.SYNC_RESPELLINGS : artifactLiveEditModule.SYNC_RESPELLINGS_NO_TOOL)}`.replace(
        `



`,
        `

`,
      ),
    );
  if (artifactRoomPromptGateOpen() && capabilities.includes(ROOM))
    sections.push(`## Live room \u2014 this session

${liftPromptParagraphs(ROOM_PROMPT_PARAGRAPH, artifactToolsPresent(tools).comments ? PROMPT_SPELLING_SWAPS : PROMPT_SPELLING_SWAPS_FULL)}`);
  let verifySection = verifyBeforeHandoverSection(tools, capabilities);
  if (verifySection !== "") sections.push(verifySection);
  return sections;
}
//@ chunk-ne2890fx.js:4868-5848 placement
/**
 * "页面状态放在哪里"段落：按声明的能力说明浏览器存储、artifact 能力（页面即记录、整页重新发布）、db 能力（页面外数据、访问规则、实时快照）各自适用场景。
 */
function stateHomeSection(capabilities, hasDataTool, liveFileRow) {
  let hasArtifactCapability = capabilities.includes(ARTIFACT_CAPABILITY_KEY) || capabilities.includes(SELF);
  if (!hasArtifactCapability && !capabilities.includes("db")) return "";
  return `## Where a page keeps its state \u2014 this session

${[
  "- A per-viewer convenience (a remembered tab, a draft): browser storage; it never reaches other viewers or Claude.",
  hasArtifactCapability
    ? "- The page itself is the record (a poll, a sign-up sheet, a checklist): the `artifact` capability \u2014 a viewer who can write republishes the whole page from its state; every open view reloads to the winner, a concurrent save rejects `conflict`, and read-only viewers cannot save. Such a page regenerates the whole document from its state: keep the head, tokens and structure and change only the content."
    : "",
  capabilities.includes("db")
    ? `- Data outside the page (${hasDataTool ? "Claude seeds or reads it, " : ""}more than the page shows, private per viewer, many writers at once): the \`db\` capability \u2014 documents under access rules, live through \`onSnapshot\`, kept across republishes.`
    : "",
  liveFileRow,
].filter(Boolean).join(`
`)}`;
}
//@ chunk-ne2890fx.js:5848-6986 placement
/**
 * "交付链接前先验证"段落：声明了能力的页面只做一次功能检查（preview 一次、db 每个集合 list 一次并用低权限复读、endpoints 各 GET 路由调用一次），然后一句话告诉用户验证了什么。
 */
function verifyBeforeHandoverSection(tools, capabilities) {
  let toolsPresent = artifactToolsPresent(tools);
  let filtered = [
    toolsPresent.data && capabilities.includes("db")
      ? `after the first publish, one \`${ARTIFACT_DATA_TOOL_NAME}\` \`list\` of each collection the page writes, and, where its rules hide something from ordinary viewers, the same read with a lower \`as_level\`, which must not show what the rules hide from such a viewer`
      : "",
    artifactHandlersPromptGateOpen() && capabilities.includes("endpoints")
      ? "for declared endpoints, `get_endpoints` once and one `call_endpoint` on each GET route (a writing route only when the user wants a test record made)"
      : "",
  ].filter(Boolean);
  if (filtered.length === 0) return "";
  return `## Verify before you hand over the link \u2014 this session

A page whose \`capabilities\` you declared in this session gets one functional pass, not a render loop: ${[toolsPresent.check && artifactPreviewPromptGateOpen() && previewEngineKind() === "local_chrome" ? `before publishing, one \`${ARTIFACT_CHECK_TOOL_NAME}\` preview of the page (capabilities are unavailable in the preview, so that code does not run there)` : "", ...filtered].filter(Boolean).join("; ")}. Then tell the user in one line what you exercised and what you could not. An Artifact made from an Artifact type is not such a page: its capabilities come from the type, and the type's instructions govern any checking.`;
}
export { liveSessionPromptSections };
