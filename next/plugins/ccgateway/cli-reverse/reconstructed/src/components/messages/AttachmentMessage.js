/**
 * components/messages/AttachmentMessage.tsx
 *
 * 附件消息分派：文件/目录/诊断/hook 结果与错误/技能/记忆/计划/队友关停/任务状态等约 40 种附件的显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AttachmentMessage.tsx
 * pieces: chunk-wjygkcr4.js (17)
 * attribution: placement 6, layout 3, sole-consumer 2, affinity 1, fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create_16, create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { init_react_production, fragmentTypeExport } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { emptyToolHooksThird } from "../../plugins/functionHooks/toolCallHooks.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";
import { resolveTranscriptMode } from "./transcriptModeContext.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  visibleTeammateMailboxMessages,
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  UNKNOWN_SENDER,
  capFrameFieldForDisplay,
  parseFrameForDisplay,
  IdleNotificationMessageSchema,
  TaskCompletedMessageSchema,
  IDLE_SUMMARY_RECEIVE_BOUND,
  capRawFrameTextForDisplay,
} from "../../utils/teammateMailbox.js";
import { toInkColor } from "../../utils/ink.js";
import { unverifiedSenderLabel, coalesceTeammateMessages } from "./UserTeammateMessage.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { renderTaskRelatedMessage, TaskAssignmentMessage } from "./TaskAssignmentMessage.js";
import { TeammateResultMessage } from "./TeammateResultMessage.js";
import {
  renderTeammateContentItem,
  renderCoalescedTeammateItem,
  isTaggedSystemUserText,
  UserTextMessage,
  hookDisplayName,
  renderAsyncHookCompletedItem,
} from "./UserTextMessage.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { formatFileSize, formatDuration, formatTokens } from "../../utils/format.js";
import { plural, firstLineOf } from "../../utils/stringUtils.js";
import { alwaysFalseMemCtx } from "../../services/accountMemory/memoryContext.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { FilePathLink } from "../FilePathLink.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { stringArray } from "../../utils/collections.js";
import { joinTextContent, messageOrigin } from "../../utils/messageProvenance.js";
import { getImagePlaceholderIds } from "./UserPromptMessage.js";
import { UserImageMessage } from "./UserImageMessage.js";
import { getDisplayPath } from "../../utils/file.js";
import { DiagnosticsDisplay } from "../DiagnosticsDisplay.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { buildHookErrorRow } from "./CompactBoundaryMessage.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { isCoordinatorPanelEnabled, isCoordinatorPanelActive } from "../../utils/transcriptDiagnostics.js";
import { useAppState } from "../../state/AppState.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:81066-81146 placement
var WITHHELD_FILE_INPUT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wjygkcr4.js:81066", () => {
  WITHHELD_FILE_INPUT_SCHEMA = DoctorLazy(() =>
    create_16([
      create({
        file_path: create_2().min(1),
      }),
      create({
        notebook_path: create_2().min(1),
      }),
    ]),
  );
});
//@ chunk-wjygkcr4.js:81146-81150 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:81146", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:81193-81877 placement
/**
 * 被扣留文件的一行：说明文本 + 标记 + 加粗路径（从开头截断）。
 */
function WithheldFileLine(props) {
  let $ = useMemoCache(15);
  let { why, path } = props;
  let withheld;
  if ($[0] !== path || $[1] !== why) {
    withheld = emptyToolHooksThird.withheldLine(why, path);
    $[0] = path;
    $[1] = why;
    $[2] = withheld;
  } else withheld = $[2];
  let line = withheld;
  let leadElement;
  if ($[3] !== line.lead) {
    leadElement = jsxProd_default(Text, {
      children: line.lead,
    });
    $[3] = line.lead;
    $[4] = leadElement;
  } else leadElement = $[4];
  let markBox;
  if ($[5] !== line.mark) {
    markBox = jsxProd_default(Box, {
      flexShrink: 0,
      marginRight: 1,
      children: jsxProd_default(Text, {
        children: line.mark,
      }),
    });
    $[5] = line.mark;
    $[6] = markBox;
  } else markBox = $[6];
  let textElement;
  if ($[7] !== line.path) {
    textElement = jsxProd_default(Text, {
      bold: true,
      wrap: "truncate-start",
      children: line.path,
    });
    $[7] = line.path;
    $[8] = textElement;
  } else textElement = $[8];
  let lineRow;
  if ($[9] !== markBox || $[10] !== textElement) {
    lineRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [markBox, textElement],
    });
    $[9] = markBox;
    $[10] = textElement;
    $[11] = lineRow;
  } else lineRow = $[11];
  let lineBox;
  if ($[12] !== leadElement || $[13] !== lineRow) {
    lineBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 1,
      children: [leadElement, lineRow],
    });
    $[12] = leadElement;
    $[13] = lineRow;
    $[14] = lineBox;
  } else lineBox = $[14];
  return lineBox;
}
//@ chunk-wjygkcr4.js:81877-81972 placement
function renderWithheldFile(file, keyPrefix) {
  return jsxProd_default(
    MessageResponse,
    {
      children: jsxProd_default(WithheldFileLine, {
        why: file.why,
        path: file.displayPath,
      }),
    },
    `${keyPrefix} ${file.path}`,
  );
}
//@ chunk-wjygkcr4.js:81972-82393 placement
/**
 * 列出被扣留的文件（显示前若干条，其余以"还有 N 个"提示）。
 */
function WithheldFilesList(props) {
  let $ = useMemoCache(10);
  let containerComponent;
  let flexDirection;
  let fileElements;
  let moreElement;
  if ($[0] !== props.entries) {
    let grouped = emptyToolHooksThird.withheldShown(props.entries);
    containerComponent = Box;
    flexDirection = "column";
    fileElements = grouped.shown.map(renderWithheldFile);
    moreElement =
      grouped.more > 0 &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          children: emptyToolHooksThird.withheldMore(grouped),
        }),
      });
    $[0] = props.entries;
    $[1] = containerComponent;
    $[2] = flexDirection;
    $[3] = fileElements;
    $[4] = moreElement;
  } else {
    containerComponent = $[1];
    flexDirection = $[2];
    fileElements = $[3];
    moreElement = $[4];
  }
  let containerElement;
  if (
    $[5] !== containerComponent ||
    $[6] !== flexDirection ||
    $[7] !== fileElements ||
    $[8] !== moreElement
  ) {
    containerElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [fileElements, moreElement],
    });
    $[5] = containerComponent;
    $[6] = flexDirection;
    $[7] = fileElements;
    $[8] = moreElement;
    $[9] = containerElement;
  } else containerElement = $[9];
  return containerElement;
}
//@ chunk-wjygkcr4.js:90335-90339 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:90335", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:90339-90343 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:90339", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:129344-129382 sole-consumer
function isNonBlank(text) {
  return text.trim() !== "";
}
//@ chunk-wjygkcr4.js:129382-129420 sole-consumer
function isNonBlank_2(text) {
  return text.trim() !== "";
}
//@ chunk-wjygkcr4.js:129420-129458 affinity
function isNonBlank_3(text) {
  return text.trim() !== "";
}
//@ chunk-wjygkcr4.js:129458-147467 fingerprint (2.1.88 match: AttachmentMessage, 0.492)
/**
 * 附件分派：按 attachment.type 渲染——file/directory/notebook/pdf_reference（"Read N lines"）、file_unchanged、diagnostics、selected_lines_in_ide/diff、hook_*（成功/阻塞错误/非阻塞错误/取消/系统消息/权限决定）、async_hook_response、skill_listing/invoked_skills/dynamic_skill、relevant_memories/nested_memory/account_memory_recall、plan_file_reference、queued_command、task_status、teammate_shutdown_batch、goal_status、tool_hosts_* 等；不在 NULL_RENDERING_TYPES 中的才显示。
 */
function AttachmentMessage(props) {
  let $ = useMemoCache(281);
  let {
    attachment,
    addMargin,
    verbose,
    isTranscriptMode,
    hasMetadataHeader,
    followsSpeakerLabel,
    followsInboundLabel,
    messageId,
  } = props;
  let hasMetadataHeader_2 = hasMetadataHeader === undefined ? false : hasMetadataHeader;
  let followsSpeakerLabel_2 = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let followsInboundLabel_2 = followsInboundLabel === undefined ? false : followsInboundLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let showNotice = shouldShowNotice(verbose);
  if (isAgentSwarmsEnabled() && attachment.type === "teammate_mailbox") {
    let BoxComponent;
    let flexDirection;
    let children;
    let earlyReturn;
    if ($[0] !== attachment.messages || $[1] !== transcriptMode) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      ee: {
        let parsed = visibleTeammateMailboxMessages(attachment.messages);
        if (parsed.length === 0) {
          earlyReturn = null;
          break ee;
        }
        let renderMailboxMessage;
        if ($[6] !== transcriptMode) {
          renderMailboxMessage = (msg_0, idx) => {
            let inkColor = toInkColor(msg_0.color);
            let senderName = capIdFrameField(msg_0.from, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER;
            let isForged = msg_0.provenance === "forged";
            let displayName = isForged ? unverifiedSenderLabel(senderName) : senderName;
            let summary = capFrameFieldForDisplay(msg_0.summary);
            let summaryNode = summary
              ? jsxProd_default_2(Box, {
                  children: [
                    jsxProd_default_2(Text, {
                      color: inkColor,
                      children: [
                        "@",
                        displayName,
                        jsxProd_default(Text, {
                          "aria-hidden": true,
                          children: figures_default.pointer,
                        }),
                      ],
                    }),
                    jsxProd_default_2(Text, {
                      children: [" ", summary],
                    }),
                  ],
                })
              : null;
            let taskMessageNode = isForged ? null : renderTaskRelatedMessage(msg_0.text, displayName);
            if (taskMessageNode) {
              return {
                kind: "panel",
                node: jsxProd_default_2(
                  fragmentTypeExport,
                  {
                    children: [summaryNode, taskMessageNode],
                  },
                  idx,
                ),
              };
            }
            let idleFrame = isForged
              ? null
              : parseFrameForDisplay(IdleNotificationMessageSchema(), msg_0.text);
            if (idleFrame && !msg_0.summary) {
              return {
                kind: "panel",
                node: jsxProd_default(
                  TeammateResultMessage,
                  {
                    displayName,
                    inkColor,
                    idleReason: idleFrame.idleReason,
                    failureReason: idleFrame.failureReason,
                    summary: idleFrame.summary,
                    completedTaskId: idleFrame.completedTaskId,
                    result: idleFrame.result,
                    expanded: transcriptMode,
                  },
                  idx,
                ),
              };
            }
            let completedFrame = isForged
              ? null
              : parseFrameForDisplay(TaskCompletedMessageSchema(), msg_0.text);
            if (completedFrame) {
              let taskId = capIdFrameField(completedFrame.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
              let taskSubject = completedFrame.taskSubject
                ? capIdFrameField(completedFrame.taskSubject, IDLE_SUMMARY_RECEIVE_BOUND)
                : "";
              return {
                kind: "panel",
                node: jsxProd_default(
                  TaskAssignmentMessage,
                  {
                    displayName,
                    inkColor,
                    summary,
                    taskId,
                    taskSubject,
                  },
                  idx,
                ),
              };
            }
            let planApprovalElement = capRawFrameTextForDisplay(msg_0.text, msg_0.from);
            return {
              kind: "text",
              displayName,
              senderName,
              isUnverified: isForged,
              inkColor,
              content: planApprovalElement,
              summary,
            };
          };
          $[6] = transcriptMode;
          $[7] = renderMailboxMessage;
        } else renderMailboxMessage = $[7];
        let messages = parsed.map(renderMailboxMessage);
        BoxComponent = Box;
        flexDirection = "column";
        children = transcriptMode
          ? messages.map(renderTeammateContentItem)
          : coalesceTeammateMessages(messages).map(renderCoalescedTeammateItem);
      }
      $[0] = attachment.messages;
      $[1] = transcriptMode;
      $[2] = BoxComponent;
      $[3] = flexDirection;
      $[4] = children;
      $[5] = earlyReturn;
    } else {
      BoxComponent = $[2];
      flexDirection = $[3];
      children = $[4];
      earlyReturn = $[5];
    }
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    let content;
    if ($[8] !== BoxComponent || $[9] !== flexDirection || $[10] !== children) {
      content = jsxProd_default(BoxComponent, {
        flexDirection,
        children,
      });
      $[8] = BoxComponent;
      $[9] = flexDirection;
      $[10] = children;
      $[11] = content;
    } else content = $[11];
    return content;
  }
  switch (attachment.type) {
    case "directory": {
      const children = attachment.displayPath + sep;
      let directoryLine;
      if ($[12] !== children) {
        directoryLine = jsxProd_default_2(Line, {
          children: [
            "Listed directory ",
            jsxProd_default(Text, {
              bold: true,
              children,
            }),
          ],
        });
        $[12] = children;
        $[13] = directoryLine;
      } else directoryLine = $[13];
      return directoryLine;
    }
    case "file":
    case "already_read_file": {
      let summaryKind;
      if ($[14] !== attachment.content || $[15] !== attachment.truncated) {
        summaryKind = getFileAttachmentSummaryKind(attachment.content, attachment.truncated);
        $[14] = attachment.content;
        $[15] = attachment.truncated;
        $[16] = summaryKind;
      } else summaryKind = $[16];
      let summaryKind_2 = summaryKind;
      let pathText;
      if ($[17] !== attachment.displayPath) {
        pathText = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[17] = attachment.displayPath;
        $[18] = pathText;
      } else pathText = $[18];
      const summarySuffix = summaryKind_2 !== undefined && ` (${summaryKind_2})`;
      let fileLine;
      if ($[19] !== pathText || $[20] !== summarySuffix) {
        fileLine = jsxProd_default_2(Line, {
          children: ["Read ", pathText, summarySuffix],
        });
        $[19] = pathText;
        $[20] = summarySuffix;
        $[21] = fileLine;
      } else fileLine = $[21];
      return fileLine;
    }
    case "compact_file_reference": {
      let referenceLine;
      if ($[22] !== attachment.displayPath) {
        referenceLine = jsxProd_default_2(Line, {
          children: [
            "Referenced file ",
            jsxProd_default(Text, {
              bold: true,
              children: attachment.displayPath,
            }),
          ],
        });
        $[22] = attachment.displayPath;
        $[23] = referenceLine;
      } else referenceLine = $[23];
      return referenceLine;
    }
    case "at_mention_reference": {
      let children;
      if ($[24] !== attachment.displayPath || $[25] !== attachment.mentions || $[26] !== attachment.unread) {
        children =
          attachment.unread === "too_large"
            ? stripInvisibleChars(attachment.displayPath)
            : attachment.mentions.join(", ");
        $[24] = attachment.displayPath;
        $[25] = attachment.mentions;
        $[26] = attachment.unread;
        $[27] = children;
      } else children = $[27];
      let namesText;
      if ($[28] !== children) {
        namesText = jsxProd_default(Text, {
          bold: true,
          children,
        });
        $[28] = children;
        $[29] = namesText;
      } else namesText = $[29];
      let unreadNote;
      if ($[30] !== attachment.fileSize || $[31] !== attachment.unread) {
        unreadNote =
          attachment.unread === "unexamined"
            ? "not read: could not be examined"
            : attachment.unread === "too_large"
              ? `not read: too large, ${formatFileSize(attachment.fileSize)}`
              : "not read";
        $[30] = attachment.fileSize;
        $[31] = attachment.unread;
        $[32] = unreadNote;
      } else unreadNote = $[32];
      let mentionLine;
      if ($[33] !== namesText || $[34] !== unreadNote) {
        mentionLine = jsxProd_default_2(Line, {
          children: ["Referenced", " ", namesText, " ", "(", unreadNote, ")"],
        });
        $[33] = namesText;
        $[34] = unreadNote;
        $[35] = mentionLine;
      } else mentionLine = $[35];
      return mentionLine;
    }
    case "pdf_reference": {
      let pdfPathText;
      if ($[36] !== attachment.displayPath) {
        pdfPathText = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[36] = attachment.displayPath;
        $[37] = pdfPathText;
      } else pdfPathText = $[37];
      let pageText;
      if ($[38] !== attachment.pageCount || $[39] !== attachment.stillArriving) {
        pageText = attachment.stillArriving
          ? "queued before download"
          : attachment.pageCount === null
            ? "page count unknown"
            : `${attachment.pageCount} ${plural(attachment.pageCount, "page")}`;
        $[38] = attachment.pageCount;
        $[39] = attachment.stillArriving;
        $[40] = pageText;
      } else pageText = $[40];
      let pdfLine;
      if ($[41] !== pdfPathText || $[42] !== pageText) {
        pdfLine = jsxProd_default_2(Line, {
          children: ["Referenced PDF ", pdfPathText, " (", pageText, ")"],
        });
        $[41] = pdfPathText;
        $[42] = pageText;
        $[43] = pdfLine;
      } else pdfLine = $[43];
      return pdfLine;
    }
    case "selected_lines_in_ide": {
      let marker;
      if ($[44] === MEMO_CACHE_SENTINEL) {
        marker = jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u29C9 ",
        });
        $[44] = marker;
      } else marker = $[44];
      const children = attachment.lineEnd - attachment.lineStart + 1;
      let linesCountText;
      if ($[45] !== children) {
        linesCountText = jsxProd_default(Text, {
          bold: true,
          children,
        });
        $[45] = children;
        $[46] = linesCountText;
      } else linesCountText = $[46];
      let pathText;
      if ($[47] !== attachment.displayPath) {
        pathText = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[47] = attachment.displayPath;
        $[48] = pathText;
      } else pathText = $[48];
      let selectedLinesLine;
      if ($[49] !== attachment.ideName || $[50] !== linesCountText || $[51] !== pathText) {
        selectedLinesLine = jsxProd_default_2(Line, {
          children: [
            marker,
            "Selected",
            " ",
            linesCountText,
            " ",
            "lines from ",
            pathText,
            " in",
            " ",
            attachment.ideName,
          ],
        });
        $[49] = attachment.ideName;
        $[50] = linesCountText;
        $[51] = pathText;
        $[52] = selectedLinesLine;
      } else selectedLinesLine = $[52];
      return selectedLinesLine;
    }
    case "selected_lines_in_diff": {
      let marker;
      if ($[53] === MEMO_CACHE_SENTINEL) {
        marker = jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u29C9 ",
        });
        $[53] = marker;
      } else marker = $[53];
      let lineCountText;
      if ($[54] !== attachment.lineCount) {
        lineCountText = jsxProd_default(Text, {
          bold: true,
          children: attachment.lineCount,
        });
        $[54] = attachment.lineCount;
        $[55] = lineCountText;
      } else lineCountText = $[55];
      let linesWord;
      if ($[56] !== attachment.lineCount) {
        linesWord = plural(attachment.lineCount, "line");
        $[56] = attachment.lineCount;
        $[57] = linesWord;
      } else linesWord = $[57];
      let diffLinesLine;
      if ($[58] !== lineCountText || $[59] !== linesWord) {
        diffLinesLine = jsxProd_default_2(Line, {
          children: [marker, "Selected", " ", lineCountText, " ", linesWord, " from diff view"],
        });
        $[58] = lineCountText;
        $[59] = linesWord;
        $[60] = diffLinesLine;
      } else diffLinesLine = $[60];
      return diffLinesLine;
    }
    case "nested_memory": {
      let memoryLine;
      if ($[61] !== attachment.displayPath) {
        memoryLine = jsxProd_default_2(Line, {
          children: [
            "Loaded ",
            jsxProd_default(Text, {
              bold: true,
              children: attachment.displayPath,
            }),
          ],
        });
        $[61] = attachment.displayPath;
        $[62] = memoryLine;
      } else memoryLine = $[62];
      return memoryLine;
    }
    case "withheld_memory": {
      let withheldList;
      if ($[63] !== attachment.entries) {
        withheldList = jsxProd_default(WithheldFilesList, {
          entries: attachment.entries,
        });
        $[63] = attachment.entries;
        $[64] = withheldList;
      } else withheldList = $[64];
      return withheldList;
    }
    case "relevant_memories": {
      let isLocalMemory;
      if ($[65] === MEMO_CACHE_SENTINEL) {
        isLocalMemory = alwaysFalseMemCtx();
        $[65] = isLocalMemory;
      } else isLocalMemory = $[65];
      let isLocalMemory_2 = isLocalMemory;
      const marginTop = addMargin ? 1 : 0;
      let indentBox;
      if ($[66] === MEMO_CACHE_SENTINEL) {
        indentBox = jsxProd_default(Box, {
          minWidth: 2,
        });
        $[66] = indentBox;
      } else indentBox = $[66];
      let memoryCountText;
      if ($[67] !== attachment.memories.length) {
        memoryCountText = jsxProd_default(Text, {
          bold: true,
          children: attachment.memories.length,
        });
        $[67] = attachment.memories.length;
        $[68] = memoryCountText;
      } else memoryCountText = $[68];
      const memoriesWord = attachment.memories.length === 1 ? "memory" : "memories";
      let expandHint;
      if ($[69] !== isTranscriptMode) {
        expandHint =
          !isTranscriptMode &&
          jsxProd_default_2(Fragment, {
            children: [" ", jsxProd_default(CtrlOToExpand, {})],
          });
        $[69] = isTranscriptMode;
        $[70] = expandHint;
      } else expandHint = $[70];
      let memoryHeader;
      if ($[71] !== memoryCountText || $[72] !== memoriesWord || $[73] !== expandHint) {
        memoryHeader = jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            indentBox,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Recalled ",
                memoryCountText,
                " ",
                isLocalMemory_2 ? "local " : "",
                memoriesWord,
                expandHint,
              ],
            }),
          ],
        });
        $[71] = memoryCountText;
        $[72] = memoriesWord;
        $[73] = expandHint;
        $[74] = memoryHeader;
      } else memoryHeader = $[74];
      let memoryContent;
      if ($[75] !== attachment.memories || $[76] !== isTranscriptMode || $[77] !== verbose) {
        memoryContent =
          (verbose || isTranscriptMode) &&
          attachment.memories.map((m) =>
            jsxProd_default_2(
              Box,
              {
                flexDirection: "column",
                children: [
                  jsxProd_default(MessageResponse, {
                    children: jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [
                        jsxProd_default(FilePathLink, {
                          filePath: m.path,
                          children: basename(m.path),
                        }),
                        isLocalMemory_2 ? " \xB7 local" : "",
                      ],
                    }),
                  }),
                  isTranscriptMode &&
                    jsxProd_default(Box, {
                      paddingLeft: 5,
                      children: jsxProd_default(Text, {
                        children: jsxProd_default(Ansi, {
                          children: m.content,
                        }),
                      }),
                    }),
                ],
              },
              m.path,
            ),
          );
        $[75] = attachment.memories;
        $[76] = isTranscriptMode;
        $[77] = verbose;
        $[78] = memoryContent;
      } else memoryContent = $[78];
      let memoriesBlock;
      if ($[79] !== memoryHeader || $[80] !== memoryContent || $[81] !== marginTop) {
        memoriesBlock = jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop,
          children: [memoryHeader, memoryContent],
        });
        $[79] = memoryHeader;
        $[80] = memoryContent;
        $[81] = marginTop;
        $[82] = memoriesBlock;
      } else memoriesBlock = $[82];
      return memoriesBlock;
    }
    case "account_memory_recall": {
      attachment.localRecall ?? [];
      return null;
    }
    case "dynamic_skill": {
      let skillCount = attachment.skillNames.length;
      let skillWord;
      if ($[83] !== skillCount) {
        skillWord = plural(skillCount, "skill");
        $[83] = skillCount;
        $[84] = skillWord;
      } else skillWord = $[84];
      let skillCountText;
      if ($[85] !== skillCount || $[86] !== skillWord) {
        skillCountText = jsxProd_default_2(Text, {
          bold: true,
          children: [skillCount, " ", skillWord],
        });
        $[85] = skillCount;
        $[86] = skillWord;
        $[87] = skillCountText;
      } else skillCountText = $[87];
      let pathText;
      if ($[88] !== attachment.displayPath) {
        pathText = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[88] = attachment.displayPath;
        $[89] = pathText;
      } else pathText = $[89];
      let skillLine;
      if ($[90] !== skillCountText || $[91] !== pathText) {
        skillLine = jsxProd_default_2(Line, {
          children: ["Loaded", " ", skillCountText, " ", "from ", pathText],
        });
        $[90] = skillCountText;
        $[91] = pathText;
        $[92] = skillLine;
      } else skillLine = $[92];
      return skillLine;
    }
    case "skill_listing": {
      if (attachment.isInitial) {
        return null;
      }
      let countText;
      if ($[93] !== attachment.skillCount) {
        countText = jsxProd_default(Text, {
          bold: true,
          children: attachment.skillCount,
        });
        $[93] = attachment.skillCount;
        $[94] = countText;
      } else countText = $[94];
      let skillWord;
      if ($[95] !== attachment.skillCount) {
        skillWord = plural(attachment.skillCount, "skill");
        $[95] = attachment.skillCount;
        $[96] = skillWord;
      } else skillWord = $[96];
      let skillsLine;
      if ($[97] !== countText || $[98] !== skillWord) {
        skillsLine = jsxProd_default_2(Line, {
          children: [countText, " ", skillWord, " available"],
        });
        $[97] = countText;
        $[98] = skillWord;
        $[99] = skillsLine;
      } else skillsLine = $[99];
      return skillsLine;
    }
    case "agent_listing_delta": {
      let addedTypes;
      if ($[100] !== attachment.addedTypes || $[101] !== attachment.builtInPluginTypes) {
        let builtInTypes = new Set(stringArray(attachment.builtInPluginTypes));
        addedTypes = stringArray(attachment.addedTypes).filter((typeName) => !builtInTypes.has(typeName));
        $[100] = attachment.addedTypes;
        $[101] = attachment.builtInPluginTypes;
        $[102] = addedTypes;
      } else addedTypes = $[102];
      let agentTypes = addedTypes;
      if (attachment.isInitial || agentTypes.length === 0) {
        return null;
      }
      let count = agentTypes.length;
      let countText;
      if ($[103] !== count) {
        countText = jsxProd_default(Text, {
          bold: true,
          children: count,
        });
        $[103] = count;
        $[104] = countText;
      } else countText = $[104];
      let typeWord;
      if ($[105] !== count) {
        typeWord = plural(count, "type");
        $[105] = count;
        $[106] = typeWord;
      } else typeWord = $[106];
      let agentTypesLine;
      if ($[107] !== countText || $[108] !== typeWord) {
        agentTypesLine = jsxProd_default_2(Line, {
          children: [countText, " agent ", typeWord, " available"],
        });
        $[107] = countText;
        $[108] = typeWord;
        $[109] = agentTypesLine;
      } else agentTypesLine = $[109];
      return agentTypesLine;
    }
    case "queued_command": {
      let imagePasteIds;
      let isTaggedUserText;
      let promptText;
      if (
        $[110] !== attachment ||
        $[111] !== followsSpeakerLabel_2 ||
        $[112] !== hasMetadataHeader_2 ||
        $[113] !== showNotice
      ) {
        promptText = joinTextContent(attachment.prompt).trim();
        let imagePasteIds_2 = Array.isArray(attachment.imagePasteIds) ? attachment.imagePasteIds : [];
        let placeholderIds =
          showNotice && followsSpeakerLabel_2 && imagePasteIds_2.length > 0
            ? getImagePlaceholderIds(promptText, messageOrigin(attachment))
            : undefined;
        imagePasteIds =
          placeholderIds === undefined
            ? imagePasteIds_2
            : imagePasteIds_2.filter((imagePasteId) => !placeholderIds.has(imagePasteId));
        isTaggedUserText = hasMetadataHeader_2 && isTaggedSystemUserText(promptText);
        $[110] = attachment;
        $[111] = followsSpeakerLabel_2;
        $[112] = hasMetadataHeader_2;
        $[113] = showNotice;
        $[114] = imagePasteIds;
        $[115] = isTaggedUserText;
        $[116] = promptText;
      } else {
        imagePasteIds = $[114];
        isTaggedUserText = $[115];
        promptText = $[116];
      }
      let isTaggedUserText_2 = isTaggedUserText;
      let param;
      if ($[117] !== promptText) {
        param = {
          text: promptText,
          type: "text",
        };
        $[117] = promptText;
        $[118] = param;
      } else param = $[118];
      let origin;
      if ($[119] !== attachment) {
        origin = messageOrigin(attachment);
        $[119] = attachment;
        $[120] = origin;
      } else origin = $[120];
      const followsCoordinatorLabel = followsInboundLabel_2 && attachment.origin?.kind === "coordinator";
      let userTextMessage;
      if (
        $[121] !== addMargin ||
        $[122] !== attachment.taskDelivery ||
        $[123] !== followsInboundLabel_2 ||
        $[124] !== followsSpeakerLabel_2 ||
        $[125] !== isTranscriptMode ||
        $[126] !== messageId ||
        $[127] !== param ||
        $[128] !== origin ||
        $[129] !== followsCoordinatorLabel ||
        $[130] !== verbose
      ) {
        userTextMessage = jsxProd_default(UserTextMessage, {
          addMargin,
          param,
          verbose,
          isTranscriptMode,
          messageId,
          origin,
          taskDelivery: attachment.taskDelivery,
          followsSpeakerLabel: followsSpeakerLabel_2,
          followsInboundLabel: followsInboundLabel_2,
          followsCoordinatorLabel,
        });
        $[121] = addMargin;
        $[122] = attachment.taskDelivery;
        $[123] = followsInboundLabel_2;
        $[124] = followsSpeakerLabel_2;
        $[125] = isTranscriptMode;
        $[126] = messageId;
        $[127] = param;
        $[128] = origin;
        $[129] = followsCoordinatorLabel;
        $[130] = verbose;
        $[131] = userTextMessage;
      } else userTextMessage = $[131];
      let imageMessages;
      if ($[132] !== isTaggedUserText_2 || $[133] !== imagePasteIds) {
        let renderImage;
        if ($[135] !== isTaggedUserText_2) {
          renderImage = (imageId, index) =>
            jsxProd_default(
              UserImageMessage,
              {
                imageId,
                startsUserTurn: isTaggedUserText_2 && index === 0 ? true : undefined,
              },
              imageId,
            );
          $[135] = isTaggedUserText_2;
          $[136] = renderImage;
        } else renderImage = $[136];
        imageMessages = imagePasteIds.map(renderImage);
        $[132] = isTaggedUserText_2;
        $[133] = imagePasteIds;
        $[134] = imageMessages;
      } else imageMessages = $[134];
      let queuedBlock;
      if ($[137] !== userTextMessage || $[138] !== imageMessages) {
        queuedBlock = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [userTextMessage, imageMessages],
        });
        $[137] = userTextMessage;
        $[138] = imageMessages;
        $[139] = queuedBlock;
      } else queuedBlock = $[139];
      return queuedBlock;
    }
    case "plan_file_reference": {
      if (!attachment.planFilePath) {
        let planRefLine;
        if ($[140] === MEMO_CACHE_SENTINEL) {
          planRefLine = jsxProd_default(Line, {
            children: "Plan referenced",
          });
          $[140] = planRefLine;
        } else planRefLine = $[140];
        return planRefLine;
      }
      let planPath;
      if ($[141] !== attachment.planFilePath) {
        planPath = getDisplayPath(attachment.planFilePath);
        $[141] = attachment.planFilePath;
        $[142] = planPath;
      } else planPath = $[142];
      let planFileLine;
      if ($[143] !== planPath) {
        planFileLine = jsxProd_default_2(Line, {
          children: ["Plan file referenced (", planPath, ")"],
        });
        $[143] = planPath;
        $[144] = planFileLine;
      } else planFileLine = $[144];
      return planFileLine;
    }
    case "invoked_skills": {
      if (attachment.skills.length === 0) {
        return null;
      }
      let skillNames;
      if ($[145] !== attachment.skills) {
        skillNames = attachment.skills.map(hookDisplayName).join(", ");
        $[145] = attachment.skills;
        $[146] = skillNames;
      } else skillNames = $[146];
      let skillNames_2 = skillNames;
      let skillsLine;
      if ($[147] !== skillNames_2) {
        skillsLine = jsxProd_default_2(Line, {
          children: ["Skills restored (", skillNames_2, ")"],
        });
        $[147] = skillNames_2;
        $[148] = skillsLine;
      } else skillsLine = $[148];
      return skillsLine;
    }
    case "diagnostics": {
      let diagnosticsDisplay;
      if ($[149] !== attachment || $[150] !== isTranscriptMode || $[151] !== verbose) {
        diagnosticsDisplay = jsxProd_default(DiagnosticsDisplay, {
          attachment,
          verbose,
          isTranscriptMode,
        });
        $[149] = attachment;
        $[150] = isTranscriptMode;
        $[151] = verbose;
        $[152] = diagnosticsDisplay;
      } else diagnosticsDisplay = $[152];
      return diagnosticsDisplay;
    }
    case "mcp_resource": {
      let resourceName;
      if ($[153] !== attachment.name) {
        resourceName = jsxProd_default(Text, {
          bold: true,
          children: attachment.name,
        });
        $[153] = attachment.name;
        $[154] = resourceName;
      } else resourceName = $[154];
      let resourceLine;
      if ($[155] !== attachment.server || $[156] !== resourceName) {
        resourceLine = jsxProd_default_2(Line, {
          children: ["Read MCP resource ", resourceName, " from", " ", attachment.server],
        });
        $[155] = attachment.server;
        $[156] = resourceName;
        $[157] = resourceLine;
      } else resourceLine = $[157];
      return resourceLine;
    }
    case "command_permissions": {
      return null;
    }
    case "async_hook_response":
    case "async_hook_response_batch": {
      let hookRows;
      if ($[158] !== attachment.hookEvent || $[159] !== attachment.hooks || $[160] !== attachment.type) {
        hookRows =
          attachment.type === "async_hook_response"
            ? [
                {
                  hookEvent: attachment.hookEvent,
                  count: 1,
                },
              ]
            : attachment.hooks;
        $[158] = attachment.hookEvent;
        $[159] = attachment.hooks;
        $[160] = attachment.type;
        $[161] = hookRows;
      } else hookRows = $[161];
      let LineComponent;
      let children;
      let earlyReturn;
      if ($[162] !== isTranscriptMode || $[163] !== hookRows || $[164] !== verbose) {
        earlyReturn = EARLY_RETURN_SENTINEL;
        wt: {
          let keepHookRow;
          if ($[168] !== isTranscriptMode || $[169] !== verbose) {
            keepHookRow = (id) => verbose || (isTranscriptMode && id.hookEvent !== "SessionStart");
            $[168] = isTranscriptMode;
            $[169] = verbose;
            $[170] = keepHookRow;
          } else keepHookRow = $[170];
          let filtered = hookRows.filter(keepHookRow);
          if (filtered.length === 0) {
            earlyReturn = null;
            break wt;
          }
          LineComponent = Line;
          children = filtered.map(renderAsyncHookCompletedItem);
        }
        $[162] = isTranscriptMode;
        $[163] = hookRows;
        $[164] = verbose;
        $[165] = LineComponent;
        $[166] = children;
        $[167] = earlyReturn;
      } else {
        LineComponent = $[165];
        children = $[166];
        earlyReturn = $[167];
      }
      if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
      let asyncHookLines;
      if ($[171] !== LineComponent || $[172] !== children) {
        asyncHookLines = jsxProd_default(LineComponent, {
          children,
        });
        $[171] = LineComponent;
        $[172] = children;
        $[173] = asyncHookLines;
      } else asyncHookLines = $[173];
      return asyncHookLines;
    }
    case "hook_blocking_error": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let errorText;
      let earlyReturn;
      if (
        $[174] !== addMargin ||
        $[175] !== attachment.blockingError.blockingError ||
        $[176] !== attachment.hookName ||
        $[177] !== showNotice
      ) {
        earlyReturn = EARLY_RETURN_SENTINEL;
        St: {
          errorText = attachment.blockingError.blockingError.trim();
          if (showNotice) {
            earlyReturn = jsxProd_default(NoticeRowMessage, {
              row: buildHookErrorRow({
                hookName: attachment.hookName,
                blocking: true,
                reason: errorText,
              }),
              addMargin,
            });
            break St;
          }
        }
        $[174] = addMargin;
        $[175] = attachment.blockingError.blockingError;
        $[176] = attachment.hookName;
        $[177] = showNotice;
        $[178] = errorText;
        $[179] = earlyReturn;
      } else {
        errorText = $[178];
        earlyReturn = $[179];
      }
      if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
      let blockingLine;
      if ($[180] !== attachment.hookName) {
        blockingLine = jsxProd_default_2(Line, {
          color: "error",
          children: [attachment.hookName, " hook returned blocking error"],
        });
        $[180] = attachment.hookName;
        $[181] = blockingLine;
      } else blockingLine = $[181];
      let reasonLine;
      if ($[182] !== errorText) {
        reasonLine = errorText
          ? jsxProd_default(Line, {
              color: "error",
              children: errorText,
            })
          : null;
        $[182] = errorText;
        $[183] = reasonLine;
      } else reasonLine = $[183];
      let blockingErrorBlock;
      if ($[184] !== blockingLine || $[185] !== reasonLine) {
        blockingErrorBlock = jsxProd_default_2(Fragment, {
          children: [blockingLine, reasonLine],
        });
        $[184] = blockingLine;
        $[185] = reasonLine;
        $[186] = blockingErrorBlock;
      } else blockingErrorBlock = $[186];
      return blockingErrorBlock;
    }
    case "hook_non_blocking_error": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let errorText;
      let earlyReturn;
      if (
        $[187] !== addMargin ||
        $[188] !== attachment.hookName ||
        $[189] !== attachment.stderr ||
        $[190] !== attachment.stdout ||
        $[191] !== showNotice
      ) {
        earlyReturn = EARLY_RETURN_SENTINEL;
        _t: {
          errorText = firstLineOfHookOutput(attachment.stderr, attachment.stdout);
          if (showNotice) {
            earlyReturn = jsxProd_default(NoticeRowMessage, {
              row: buildHookErrorRow({
                hookName: attachment.hookName,
                blocking: false,
                reason: errorText,
              }),
              addMargin,
            });
            break _t;
          }
        }
        $[187] = addMargin;
        $[188] = attachment.hookName;
        $[189] = attachment.stderr;
        $[190] = attachment.stdout;
        $[191] = showNotice;
        $[192] = errorText;
        $[193] = earlyReturn;
      } else {
        errorText = $[192];
        earlyReturn = $[193];
      }
      if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
      let hookErrorLine;
      if ($[194] !== attachment.hookName) {
        hookErrorLine = jsxProd_default_2(Line, {
          color: "error",
          children: [attachment.hookName, " hook error"],
        });
        $[194] = attachment.hookName;
        $[195] = hookErrorLine;
      } else hookErrorLine = $[195];
      let reasonLine;
      if ($[196] !== errorText) {
        reasonLine = errorText
          ? jsxProd_default(Line, {
              color: "error",
              children: errorText,
            })
          : null;
        $[196] = errorText;
        $[197] = reasonLine;
      } else reasonLine = $[197];
      let hookErrorBlock;
      if ($[198] !== hookErrorLine || $[199] !== reasonLine) {
        hookErrorBlock = jsxProd_default_2(Fragment, {
          children: [hookErrorLine, reasonLine],
        });
        $[198] = hookErrorLine;
        $[199] = reasonLine;
        $[200] = hookErrorBlock;
      } else hookErrorBlock = $[200];
      return hookErrorBlock;
    }
    case "hook_cancelled": {
      if (attachment.hookEvent !== "UserPromptSubmit" || !attachment.timedOut) {
        return null;
      }
      let timeoutText;
      if ($[201] !== attachment.timeoutMs) {
        timeoutText = attachment.timeoutMs
          ? attachment.timeoutMs < 1000
            ? `${attachment.timeoutMs}ms`
            : `${Math.round(attachment.timeoutMs / 1000)}s`
          : undefined;
        $[201] = attachment.timeoutMs;
        $[202] = timeoutText;
      } else timeoutText = $[202];
      let timeoutText_2 = timeoutText;
      let commandSuffix = attachment.command ? ` [${attachment.command}]` : "";
      const timeoutSuffix = timeoutText_2 !== undefined ? ` after ${timeoutText_2}` : "";
      let hookCancelledLine;
      if ($[203] !== attachment.hookName || $[204] !== commandSuffix || $[205] !== timeoutSuffix) {
        hookCancelledLine = jsxProd_default_2(Line, {
          color: "error",
          dimColor: false,
          children: [
            attachment.hookName,
            " hook",
            commandSuffix,
            " timed out",
            timeoutSuffix,
            ` \u2014 output discarded. Raise the hook's "timeout" to allow more time.`,
          ],
        });
        $[203] = attachment.hookName;
        $[204] = commandSuffix;
        $[205] = timeoutSuffix;
        $[206] = hookCancelledLine;
      } else hookCancelledLine = $[206];
      return hookCancelledLine;
    }
    case "hook_error_during_execution": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let hookWarningLine;
      if ($[207] !== attachment.hookName) {
        hookWarningLine = jsxProd_default_2(Line, {
          children: [attachment.hookName, " hook warning"],
        });
        $[207] = attachment.hookName;
        $[208] = hookWarningLine;
      } else hookWarningLine = $[208];
      return hookWarningLine;
    }
    case "hook_success": {
      return null;
    }
    case "hook_stopped_continuation": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let hookStoppedLine;
      if ($[209] !== attachment.hookName || $[210] !== attachment.message) {
        hookStoppedLine = jsxProd_default_2(Line, {
          color: "warning",
          children: [attachment.hookName, " hook stopped continuation: ", attachment.message],
        });
        $[209] = attachment.hookName;
        $[210] = attachment.message;
        $[211] = hookStoppedLine;
      } else hookStoppedLine = $[211];
      return hookStoppedLine;
    }
    case "hook_deferred_tool": {
      let hookDeferredLine;
      if ($[212] !== attachment.hookName || $[213] !== attachment.toolName) {
        hookDeferredLine = jsxProd_default_2(Line, {
          color: "warning",
          children: [
            attachment.hookName,
            " deferred ",
            attachment.toolName,
            " \xB7 resume with -p --resume to continue",
          ],
        });
        $[212] = attachment.hookName;
        $[213] = attachment.toolName;
        $[214] = hookDeferredLine;
      } else hookDeferredLine = $[214];
      return hookDeferredLine;
    }
    case "goal_status": {
      if (attachment.sentinel) {
        return null;
      }
      let isFailed = attachment.failed === true;
      let statParts;
      if (
        $[215] !== attachment.durationMs ||
        $[216] !== attachment.iterations ||
        $[217] !== attachment.met ||
        $[218] !== attachment.tokens ||
        $[219] !== isFailed
      ) {
        statParts = [];
        if (attachment.met || isFailed) {
          if (attachment.durationMs !== undefined) {
            let durationText;
            if ($[221] !== attachment.durationMs) {
              durationText = formatDuration(attachment.durationMs, {
                mostSignificantOnly: true,
              });
              $[221] = attachment.durationMs;
              $[222] = durationText;
            } else durationText = $[222];
            statParts.push(durationText);
          }
          if (attachment.iterations !== undefined) {
            const iterations = attachment.iterations;
            let turnWord;
            if ($[223] !== attachment.iterations) {
              turnWord = plural(attachment.iterations, "turn");
              $[223] = attachment.iterations;
              $[224] = turnWord;
            } else turnWord = $[224];
            statParts.push(`${iterations} ${turnWord}`);
          }
          if (attachment.tokens !== undefined) {
            let tokensText;
            if ($[225] !== attachment.tokens) {
              tokensText = formatTokens(attachment.tokens);
              $[225] = attachment.tokens;
              $[226] = tokensText;
            } else tokensText = $[226];
            statParts.push(`${tokensText} tokens`);
          }
        }
        $[215] = attachment.durationMs;
        $[216] = attachment.iterations;
        $[217] = attachment.met;
        $[218] = attachment.tokens;
        $[219] = isFailed;
        $[220] = statParts;
      } else statParts = $[220];
      let statsSuffix = statParts.length > 0 ? ` (${statParts.join(" \xB7 ")})` : "";
      const status = isFailed ? "error" : attachment.met ? "success" : "pending";
      let statusIcon;
      if ($[227] !== status) {
        statusIcon = jsxProd_default(StatusIcon, {
          status,
          withSpace: true,
        });
        $[227] = status;
        $[228] = statusIcon;
      } else statusIcon = $[228];
      const color = isFailed ? "error" : undefined;
      const dimColor = !attachment.met && !isFailed;
      const children = isFailed
        ? "Goal could not be achieved"
        : attachment.met
          ? "Goal achieved"
          : "Goal not yet met\u2026 continuing";
      let goalText;
      if ($[229] !== color || $[230] !== dimColor || $[231] !== children) {
        goalText = jsxProd_default(Text, {
          color,
          dimColor,
          children,
        });
        $[229] = color;
        $[230] = dimColor;
        $[231] = children;
        $[232] = goalText;
      } else goalText = $[232];
      let statsText;
      if ($[233] !== statsSuffix) {
        statsText = statsSuffix
          ? jsxProd_default(Text, {
              dimColor: true,
              children: statsSuffix,
            })
          : null;
        $[233] = statsSuffix;
        $[234] = statsText;
      } else statsText = $[234];
      let expandHint;
      if ($[235] !== verbose) {
        expandHint = !verbose
          ? jsxProd_default_2(Text, {
              children: [" ", jsxProd_default(CtrlOToExpand, {})],
            })
          : null;
        $[235] = verbose;
        $[236] = expandHint;
      } else expandHint = $[236];
      let goalRow;
      if ($[237] !== statsText || $[238] !== expandHint || $[239] !== statusIcon || $[240] !== goalText) {
        goalRow = jsxProd_default_2(Text, {
          children: [statusIcon, goalText, statsText, expandHint],
        });
        $[237] = statsText;
        $[238] = expandHint;
        $[239] = statusIcon;
        $[240] = goalText;
        $[241] = goalRow;
      } else goalRow = $[241];
      let failureReason;
      if ($[242] !== attachment.reason || $[243] !== isFailed) {
        failureReason =
          isFailed && attachment.reason
            ? jsxProd_default(Box, {
                paddingLeft: 2,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children: attachment.reason,
                }),
              })
            : null;
        $[242] = attachment.reason;
        $[243] = isFailed;
        $[244] = failureReason;
      } else failureReason = $[244];
      let conditionRow;
      if ($[245] !== attachment.condition || $[246] !== verbose) {
        conditionRow = verbose
          ? jsxProd_default(Box, {
              paddingLeft: 2,
              children: jsxProd_default_2(Text, {
                dimColor: true,
                wrap: "wrap",
                children: ["Goal: ", attachment.condition],
              }),
            })
          : null;
        $[245] = attachment.condition;
        $[246] = verbose;
        $[247] = conditionRow;
      } else conditionRow = $[247];
      let reasonRow;
      if ($[248] !== attachment.reason || $[249] !== isFailed || $[250] !== verbose) {
        reasonRow =
          verbose && !isFailed && attachment.reason
            ? jsxProd_default(Box, {
                paddingLeft: 2,
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children: ["Reason: ", attachment.reason],
                }),
              })
            : null;
        $[248] = attachment.reason;
        $[249] = isFailed;
        $[250] = verbose;
        $[251] = reasonRow;
      } else reasonRow = $[251];
      let goalBlock;
      if ($[252] !== goalRow || $[253] !== failureReason || $[254] !== conditionRow || $[255] !== reasonRow) {
        goalBlock = jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [goalRow, failureReason, conditionRow, reasonRow],
        });
        $[252] = goalRow;
        $[253] = failureReason;
        $[254] = conditionRow;
        $[255] = reasonRow;
        $[256] = goalBlock;
      } else goalBlock = $[256];
      return goalBlock;
    }
    case "hook_system_message": {
      let hookSystemLine;
      if ($[257] !== attachment.content || $[258] !== attachment.hookName) {
        hookSystemLine = jsxProd_default_2(Line, {
          children: [attachment.hookName, " says: ", attachment.content],
        });
        $[257] = attachment.content;
        $[258] = attachment.hookName;
        $[259] = hookSystemLine;
      } else hookSystemLine = $[259];
      return hookSystemLine;
    }
    case "tool_hosts_notice": {
      let hostsNotice;
      if ($[260] !== attachment.lines) {
        let filtered = stringArray(attachment.lines).filter(isNonBlank);
        hostsNotice =
          filtered.length === 0
            ? null
            : jsxProd_default(Line, {
                children: filtered.join(`
`),
              });
        $[260] = attachment.lines;
        $[261] = hostsNotice;
      } else hostsNotice = $[261];
      return hostsNotice;
    }
    case "tool_hosts_correction": {
      let hostsCorrection;
      if ($[262] !== attachment.lines) {
        let filtered = stringArray(attachment.lines).filter(isNonBlank_2);
        hostsCorrection =
          filtered.length === 0
            ? null
            : jsxProd_default(Line, {
                children: filtered.join(`
`),
              });
        $[262] = attachment.lines;
        $[263] = hostsCorrection;
      } else hostsCorrection = $[263];
      return hostsCorrection;
    }
    case "tool_host_result_lines": {
      let hostResultLines;
      if ($[264] !== attachment.label || $[265] !== attachment.lines || $[266] !== attachment.unverified) {
        let filtered = [
          ...(attachment.unverified === true && typeof attachment.label === "string"
            ? [attachment.label]
            : []),
          ...stringArray(attachment.lines),
        ].filter(isNonBlank_3);
        hostResultLines =
          filtered.length === 0
            ? null
            : jsxProd_default(Line, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: filtered.join(`
`),
                }),
              });
        $[264] = attachment.label;
        $[265] = attachment.lines;
        $[266] = attachment.unverified;
        $[267] = hostResultLines;
      } else hostResultLines = $[267];
      return hostResultLines;
    }
    case "hook_permission_decision": {
      let decisionWord = attachment.decision === "allow" ? "Allowed" : "Denied";
      let hookEventText;
      if ($[268] !== attachment.hookEvent) {
        hookEventText = jsxProd_default(Text, {
          bold: true,
          children: attachment.hookEvent,
        });
        $[268] = attachment.hookEvent;
        $[269] = hookEventText;
      } else hookEventText = $[269];
      let permissionDecisionLine;
      if ($[270] !== decisionWord || $[271] !== hookEventText) {
        permissionDecisionLine = jsxProd_default_2(Line, {
          children: [decisionWord, " by ", hookEventText, " hook"],
        });
        $[270] = decisionWord;
        $[271] = hookEventText;
        $[272] = permissionDecisionLine;
      } else permissionDecisionLine = $[272];
      return permissionDecisionLine;
    }
    case "task_status": {
      let taskStatusMessage;
      if ($[273] !== attachment) {
        taskStatusMessage = jsxProd_default(TaskStatusMessage, {
          attachment,
        });
        $[273] = attachment;
        $[274] = taskStatusMessage;
      } else taskStatusMessage = $[274];
      return taskStatusMessage;
    }
    case "teammate_shutdown_batch": {
      let shutdownMarker;
      if ($[275] === MEMO_CACHE_SENTINEL) {
        shutdownMarker = jsxProd_default_2(Text, {
          "aria-hidden": true,
          dimColor: true,
          children: [BLACK_CIRCLE, " "],
        });
        $[275] = shutdownMarker;
      } else shutdownMarker = $[275];
      const count = attachment.count;
      let teammateWord;
      if ($[276] !== attachment.count) {
        teammateWord = plural(attachment.count, "teammate");
        $[276] = attachment.count;
        $[277] = teammateWord;
      } else teammateWord = $[277];
      let shutdownBatchRow;
      if ($[278] !== attachment.count || $[279] !== teammateWord) {
        shutdownBatchRow = jsxProd_default_2(Box, {
          flexDirection: "row",
          width: "100%",
          marginTop: 1,
          children: [
            shutdownMarker,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [count, " ", teammateWord, " shut down gracefully"],
            }),
          ],
        });
        $[278] = attachment.count;
        $[279] = teammateWord;
        $[280] = shutdownBatchRow;
      } else shutdownBatchRow = $[280];
      return shutdownBatchRow;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-wjygkcr4.js:147467-147756 fingerprint (2.1.88 match: TaskStatusMessage, 1)
function TaskStatusMessage(props) {
  let $ = useMemoCache(4);
  let { attachment } = props;
  if (isCoordinatorPanelEnabled() && !isCoordinatorPanelActive() && attachment.status === "killed") {
    return null;
  }
  if (isAgentSwarmsEnabled() && attachment.taskType === "in_process_teammate") {
    let t1;
    if ($[0] !== attachment) {
      t1 = jsxProd_default(TeammateTaskStatus, {
        attachment,
      });
      $[0] = attachment;
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] !== attachment) {
    t1 = jsxProd_default(GenericTaskStatus, {
      attachment,
    });
    $[2] = attachment;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
//@ chunk-wjygkcr4.js:147756-148322 fingerprint (2.1.88 match: GenericTaskStatus, 0.778)
function GenericTaskStatus(props) {
  let $ = useMemoCache(6);
  let { attachment } = props;
  let statusText =
    attachment.status === "completed"
      ? "completed in background"
      : attachment.status === "killed"
        ? "stopped"
        : attachment.status === "running"
          ? "still running in background"
          : attachment.status;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default_2(Text, {
      "aria-hidden": true,
      dimColor: true,
      children: [BLACK_CIRCLE, " "],
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== attachment.description) {
    t2 = jsxProd_default(Text, {
      bold: true,
      children: attachment.description,
    });
    $[1] = attachment.description;
    $[2] = t2;
  } else t2 = $[2];
  let statusBox;
  if ($[3] !== statusText || $[4] !== t2) {
    statusBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      width: "100%",
      marginTop: 1,
      children: [
        t1,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ['Task "', t2, '" ', statusText],
        }),
      ],
    });
    $[3] = statusText;
    $[4] = t2;
    $[5] = statusBox;
  } else statusBox = $[5];
  return statusBox;
}
//@ chunk-wjygkcr4.js:148322-149187 fingerprint (2.1.88 match: TeammateTaskStatus, 0.749)
function TeammateTaskStatus(props) {
  let $ = useMemoCache(13);
  let { attachment } = props;
  let t1;
  if ($[0] !== attachment.taskId) {
    t1 = (state) => state.tasks[attachment.taskId];
    $[0] = attachment.taskId;
    $[1] = t1;
  } else t1 = $[1];
  let task = useAppState(t1);
  if (task?.type !== "in_process_teammate") {
    let t2;
    if ($[2] !== attachment) {
      t2 = jsxProd_default(GenericTaskStatus, {
        attachment,
      });
      $[2] = attachment;
      $[3] = t2;
    } else t2 = $[3];
    return t2;
  }
  let t2;
  if ($[4] !== task.identity.color) {
    t2 = toInkColor(task.identity.color);
    $[4] = task.identity.color;
    $[5] = t2;
  } else t2 = $[5];
  let agentColor = t2;
  let statusText = attachment.status === "completed" ? "shut down gracefully" : attachment.status;
  let t3;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default_2(Text, {
      "aria-hidden": true,
      dimColor: true,
      children: [BLACK_CIRCLE, " "],
    });
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== agentColor || $[8] !== task.identity.agentName) {
    t4 = jsxProd_default_2(Text, {
      color: agentColor,
      bold: true,
      dimColor: false,
      children: ["@", task.identity.agentName],
    });
    $[7] = agentColor;
    $[8] = task.identity.agentName;
    $[9] = t4;
  } else t4 = $[9];
  let statusBox;
  if ($[10] !== statusText || $[11] !== t4) {
    statusBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      width: "100%",
      marginTop: 1,
      children: [
        t3,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Teammate", " ", t4, " ", statusText],
        }),
      ],
    });
    $[10] = statusText;
    $[11] = t4;
    $[12] = statusBox;
  } else statusBox = $[12];
  return statusBox;
}
//@ chunk-wjygkcr4.js:149187-149508 layout
function getFileAttachmentSummaryKind(content, truncated) {
  if (!isPlainObject(content)) return;
  let file = isPlainObject(content.file) ? content.file : undefined;
  switch (content.type) {
    case "notebook":
      return Array.isArray(file?.cells) ? `${file.cells.length} cells` : undefined;
    case "text":
      return typeof file?.numLines === "number" ? `${file.numLines}${truncated ? "+" : ""} lines` : undefined;
    default:
      return typeof file?.originalSize === "number" ? formatFileSize(file.originalSize) : undefined;
  }
}
//@ chunk-wjygkcr4.js:149508-149820 layout
function firstLineOfHookOutput(stderr, stdout) {
  let output = stderr?.trim() ? stderr : stdout?.trim() ? stdout : "";
  if (!output) return "";
  let trimmed = firstLineOf(
    output,
    `

Expected schema:`,
  ).trim();
  let lineStart = 0;
  let index = trimmed.indexOf(`
`);
  while (index !== -1) {
    let trimmed_2 = trimmed.slice(lineStart, index).trim();
    if (trimmed_2) return trimmed_2.length > 200 ? trimmed_2.slice(0, 200) + "\u2026" : trimmed_2;
    lineStart = index + 1;
    index = trimmed.indexOf(
      `
`,
      lineStart,
    );
  }
  let trimmed_2 = trimmed.slice(lineStart).trim();
  return trimmed_2.length > 200 ? trimmed_2.slice(0, 200) + "\u2026" : trimmed_2;
}
//@ chunk-wjygkcr4.js:149820-150065 fingerprint (2.1.88 match: Line, 0.831)
function Line(props) {
  let $ = useMemoCache(4);
  let { dimColor, children, color } = props;
  let dimColor_2 = dimColor === undefined ? true : dimColor;
  let responseBox;
  if ($[0] !== children || $[1] !== color || $[2] !== dimColor_2) {
    responseBox = jsxProd_default(Box, {
      children: jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color,
          dimColor: dimColor_2,
          wrap: "wrap",
          children,
        }),
      }),
    });
    $[0] = children;
    $[1] = color;
    $[2] = dimColor_2;
    $[3] = responseBox;
  } else responseBox = $[3];
  return responseBox;
}
export { AttachmentMessage };
