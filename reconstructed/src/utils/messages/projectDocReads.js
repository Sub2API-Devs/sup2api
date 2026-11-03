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

//@ chunk-e6aww6q8.js:4910966-4911482 placement
/**
 * 项目文档读取结果的消息 id 前缀（projectread_）。
 */
var PROJECT_DOC_READS_NOTICE = "projectread_";
var projectDocsReadNotice = wrapInSystemReminder(
  "Docs of this project were read before your first reply in this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
);
var projectDocsReadLaterNotice = wrapInSystemReminder(
  "Docs of this project were read for this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
);
//@ chunk-e6aww6q8.js:4911482-4911951 placement
/**
 * 把会话中跟踪到的 Projects 文档读取重建为一组消息：提示（会话中途或开头）、一条调用 Projects 工具读取各文档的助手消息，以及对应的工具结果。
 */
function buildProjectDocReadsReplay(e, n) {
  let r = trackedProjectReads(e);
  if (r === undefined || r.length === 0) return;
  let mapped = r.map(({ docId }, S) => ({
    type: "tool_use",
    id: `${PROJECT_DOC_READS_NOTICE}${n}_${S}`,
    name: PROJECTS_TOOL_NAME,
    input: projectReadInputFor(docId),
  }));
  let assistantMessage = createAssistantMessage({
    content: mapped,
    uuid: () => hashAgentId("call", n),
  });
  return {
    notice: createUserMessage({
      content:
        e.type === "project_doc_reads" && e.midChat === true
          ? projectDocsReadLaterNotice
          : projectDocsReadNotice,
      isMeta: true,
      uuid: hashAgentId("notice", n),
    }),
    call: {
      ...assistantMessage,
      message: {
        ...assistantMessage.message,
        id: randomUUID(),
      },
    },
    results: createUserMessage({
      content: r.map((y, S) => ({
        type: "tool_result",
        tool_use_id: mapped[S].id,
        content: projectReadRecord(y).result,
      })),
      isMeta: true,
      uuid: n,
    }),
  };
}
export { PROJECT_DOC_READS_NOTICE, buildProjectDocReadsReplay };
