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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { wrapInSystemReminder, createAssistantMessage, createUserMessage } from "../messages.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { dYo, enr } from "../../services/projects/projectReadRecords.js";
import { hashAgentId } from "../agentId.js";

//@ chunk-e6aww6q8.js:4910966-4911482 placement
var PROJECT_DOC_READS_NOTICE = "projectread_",
  Uxs = wrapInSystemReminder(
    "Docs of this project were read before your first reply in this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
  ),
  jxs = wrapInSystemReminder(
    "Docs of this project were read for this chat. The `project_read` calls and results that follow are those reads. You did not make them. Each call names its doc by an internal id. To read or write a doc yourself, use its name.",
  );
/**
 * 把会话中跟踪到的 Projects 文档读取重建为一组消息：提示（会话中途或开头）、一条调用 Projects 工具读取各文档的助手消息，以及对应的工具结果。
 */
//@ chunk-e6aww6q8.js:4911482-4911951 placement
function buildProjectDocReadsReplay(e, n) {
  let r = trackedProjectReads(e);
  if (r === void 0 || r.length === 0) return;
  let mapped = r.map(({ docId: docId }, S) => ({
      type: "tool_use",
      id: `${PROJECT_DOC_READS_NOTICE}${n}_${S}`,
      name: PROJECTS_TOOL_NAME,
      input: dYo(docId),
    })),
    h = createAssistantMessage({ content: mapped, uuid: () => hashAgentId("call", n) });
  return {
    notice: createUserMessage({
      content: e.type === "project_doc_reads" && e.midChat === !0 ? jxs : Uxs,
      isMeta: !0,
      uuid: hashAgentId("notice", n),
    }),
    call: { ...h, message: { ...h.message, id: randomUUID_2() } },
    results: createUserMessage({
      content: r.map((y, S) => ({ type: "tool_result", tool_use_id: mapped[S].id, content: enr(y).result })),
      isMeta: !0,
      uuid: n,
    }),
  };
}

export { PROJECT_DOC_READS_NOTICE, buildProjectDocReadsReplay };
