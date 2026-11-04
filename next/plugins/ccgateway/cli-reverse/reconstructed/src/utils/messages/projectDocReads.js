/**
 * utils/messages/projectDocReads.ts
 *
 * 2.1.316 新增：项目文档已读提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { randomUUID } from "crypto";
import { wrapInSystemReminder, createAssistantMessage, createUserMessage } from "../messages.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { projectReadInputFor, projectReadRecord } from "../../services/projects/projectReadRecords.js";
import { hashAgentId } from "../agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4910966-4911482 placement
/**
 * 项目文档读取结果的消息 id 前缀（projectread_）。
 */
var PROJECT_DOC_READS_NOTICE; // deferred: uses wrapInSystemReminder (../messages.js) of its import cycle while loading; runs once the cycle is complete
var projectDocsReadNotice;
var projectDocsReadLaterNotice;
deferInit("chunk-e6aww6q8.js:4910966", () => {
  PROJECT_DOC_READS_NOTICE = "projectread_";
  projectDocsReadNotice = wrapInSystemReminder(
    "Docs of this project were read before your first reply in this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
  );
  projectDocsReadLaterNotice = wrapInSystemReminder(
    "Docs of this project were read for this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
  );
});
//@ chunk-e6aww6q8.js:4911482-4911951 placement
/**
 * 把会话中跟踪到的 Projects 文档读取重建为一组消息：提示（会话中途或开头）、一条调用 Projects 工具读取各文档的助手消息，以及对应的工具结果。
 */
function buildProjectDocReadsReplay(attachment, turnId) {
  let reads = trackedProjectReads(attachment);
  if (reads === undefined || reads.length === 0) return;
  let mapped = reads.map(({ docId }, index) => ({
    type: "tool_use",
    id: `${PROJECT_DOC_READS_NOTICE}${turnId}_${index}`,
    name: PROJECTS_TOOL_NAME,
    input: projectReadInputFor(docId),
  }));
  let assistantMessage = createAssistantMessage({
    content: mapped,
    uuid: () => hashAgentId("call", turnId),
  });
  return {
    notice: createUserMessage({
      content:
        attachment.type === "project_doc_reads" && attachment.midChat === true
          ? projectDocsReadLaterNotice
          : projectDocsReadNotice,
      isMeta: true,
      uuid: hashAgentId("notice", turnId),
    }),
    call: {
      ...assistantMessage,
      message: {
        ...assistantMessage.message,
        id: randomUUID(),
      },
    },
    results: createUserMessage({
      content: reads.map((read, index) => ({
        type: "tool_result",
        tool_use_id: mapped[index].id,
        content: projectReadRecord(read).result,
      })),
      isMeta: true,
      uuid: turnId,
    }),
  };
}
export { PROJECT_DOC_READS_NOTICE, buildProjectDocReadsReplay };
