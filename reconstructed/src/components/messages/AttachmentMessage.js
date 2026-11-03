/**
 * components/messages/AttachmentMessage.tsx
 *
 * 附件消息分派：文件/目录/诊断/hook 结果与错误/技能/记忆/计划/队友关停/任务状态等约 40 种附件的显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AttachmentMessage.tsx
 * pieces: chunk-ah34pb7m.js (16)
 * attribution: placement 6, sole-consumer 2, affinity 1, fingerprint 5, layout 2
 */
import { sep, basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create_16, create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { init_react_production, Kc } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { isCoordinatorPanelEnabled, isCoordinatorPanelActive } from "../../utils/transcriptDiagnostics.js";
import { useAppState } from "../../state/AppState.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-ah34pb7m.js:79262-79342 placement
var WITHHELD_FILE_INPUT_SCHEMA = DoctorLazy(() =>
  create_16([
    create({
      file_path: create_2().min(1),
    }),
    create({
      notebook_path: create_2().min(1),
    }),
  ]),
);
//@ chunk-ah34pb7m.js:79342-79346 placement
init_react_production();
//@ chunk-ah34pb7m.js:79389-80073 placement
/**
 * 被扣留文件的一行：说明文本 + 标记 + 加粗路径（从开头截断）。
 */
function WithheldFileLine(props) {
  let g = w(15);
  let { why, path } = props;
  let f;
  if (g[0] !== path || g[1] !== why) {
    f = emptyToolHooksThird.withheldLine(why, path);
    g[0] = path;
    g[1] = why;
    g[2] = f;
  } else f = g[2];
  let h = f;
  let M;
  if (g[3] !== h.lead) {
    M = jsxProd_default(Text, {
      children: h.lead,
    });
    g[3] = h.lead;
    g[4] = M;
  } else M = g[4];
  let T;
  if (g[5] !== h.mark) {
    T = jsxProd_default(Box, {
      flexShrink: 0,
      marginRight: 1,
      children: jsxProd_default(Text, {
        children: h.mark,
      }),
    });
    g[5] = h.mark;
    g[6] = T;
  } else T = g[6];
  let x;
  if (g[7] !== h.path) {
    x = jsxProd_default(Text, {
      bold: true,
      wrap: "truncate-start",
      children: h.path,
    });
    g[7] = h.path;
    g[8] = x;
  } else x = g[8];
  let k;
  if (g[9] !== T || g[10] !== x) {
    k = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [T, x],
    });
    g[9] = T;
    g[10] = x;
    g[11] = k;
  } else k = g[11];
  let b;
  if (g[12] !== M || g[13] !== k) {
    b = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 1,
      children: [M, k],
    });
    g[12] = M;
    g[13] = k;
    g[14] = b;
  } else b = g[14];
  return b;
}
//@ chunk-ah34pb7m.js:80073-80168 placement
function renderWithheldFile(x, k) {
  return jsxProd_default(
    MessageResponse,
    {
      children: jsxProd_default(WithheldFileLine, {
        why: x.why,
        path: x.displayPath,
      }),
    },
    `${k} ${x.path}`,
  );
}
//@ chunk-ah34pb7m.js:80168-80589 placement
/**
 * 列出被扣留的文件（显示前若干条，其余以"还有 N 个"提示）。
 */
function WithheldFilesList(m) {
  let d = w(10);
  let c;
  let flexDirection;
  let f;
  let h;
  if (d[0] !== m.entries) {
    let M = emptyToolHooksThird.withheldShown(m.entries);
    c = Box;
    flexDirection = "column";
    f = M.shown.map(renderWithheldFile);
    h =
      M.more > 0 &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          children: emptyToolHooksThird.withheldMore(M),
        }),
      });
    d[0] = m.entries;
    d[1] = c;
    d[2] = flexDirection;
    d[3] = f;
    d[4] = h;
  } else {
    c = d[1];
    flexDirection = d[2];
    f = d[3];
    h = d[4];
  }
  let T;
  if (d[5] !== c || d[6] !== flexDirection || d[7] !== f || d[8] !== h) {
    T = jsxProd_default_2(c, {
      flexDirection,
      children: [f, h],
    });
    d[5] = c;
    d[6] = flexDirection;
    d[7] = f;
    d[8] = h;
    d[9] = T;
  } else T = d[9];
  return T;
}
//@ chunk-ah34pb7m.js:80589-80593 placement
init_react_production();
//@ chunk-ah34pb7m.js:127634-127672 sole-consumer
function isNonBlank(Zm) {
  return Zm.trim() !== "";
}
//@ chunk-ah34pb7m.js:127672-127710 sole-consumer
function isNonBlank_2(cv) {
  return cv.trim() !== "";
}
//@ chunk-ah34pb7m.js:127710-127748 affinity
function isNonBlank_3(Zh) {
  return Zh.trim() !== "";
}
//@ chunk-ah34pb7m.js:127748-145759 fingerprint = AttachmentMessage (0.493)
/**
 * 附件分派：按 attachment.type 渲染——file/directory/notebook/pdf_reference（"Read N lines"）、file_unchanged、diagnostics、selected_lines_in_ide/diff、hook_*（成功/阻塞错误/非阻塞错误/取消/系统消息/权限决定）、async_hook_response、skill_listing/invoked_skills/dynamic_skill、relevant_memories/nested_memory/account_memory_recall、plan_file_reference、queued_command、task_status、teammate_shutdown_batch、goal_status、tool_hosts_* 等；不在 NULL_RENDERING_TYPES 中的才显示。
 */
function AttachmentMessage(props) {
  let $ = w(281);
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
  let k = hasMetadataHeader === undefined ? false : hasMetadataHeader;
  let b = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let E = followsInboundLabel === undefined ? false : followsInboundLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let L = shouldShowNotice(verbose);
  if (isAgentSwarmsEnabled() && attachment.type === "teammate_mailbox") {
    let W;
    let flexDirection;
    let children;
    let V;
    if ($[0] !== attachment.messages || $[1] !== transcriptMode) {
      V = EARLY_RETURN_SENTINEL;
      X: {
        let parsed = visibleTeammateMailboxMessages(attachment.messages);
        if (parsed.length === 0) {
          V = null;
          break X;
        }
        let z;
        if ($[6] !== transcriptMode) {
          z = (msg_0, idx) => {
            let inkColor = toInkColor(msg_0.color);
            let ae = capIdFrameField(msg_0.from, IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER;
            let pe = msg_0.provenance === "forged";
            let te = pe ? unverifiedSenderLabel(ae) : ae;
            let de = capFrameFieldForDisplay(msg_0.summary);
            let ue = de
              ? jsxProd_default_2(Box, {
                  children: [
                    jsxProd_default_2(Text, {
                      color: inkColor,
                      children: [
                        "@",
                        te,
                        jsxProd_default(Text, {
                          "aria-hidden": true,
                          children: figures_default.pointer,
                        }),
                      ],
                    }),
                    jsxProd_default_2(Text, {
                      children: [" ", de],
                    }),
                  ],
                })
              : null;
            let J = pe ? null : renderTaskRelatedMessage(msg_0.text, te);
            if (J) {
              return {
                kind: "panel",
                node: jsxProd_default_2(
                  Kc,
                  {
                    children: [ue, J],
                  },
                  idx,
                ),
              };
            }
            let se = pe ? null : parseFrameForDisplay(IdleNotificationMessageSchema(), msg_0.text);
            if (se && !msg_0.summary) {
              return {
                kind: "panel",
                node: jsxProd_default(
                  TeammateResultMessage,
                  {
                    displayName: te,
                    inkColor,
                    idleReason: se.idleReason,
                    failureReason: se.failureReason,
                    summary: se.summary,
                    completedTaskId: se.completedTaskId,
                    result: se.result,
                    expanded: transcriptMode,
                  },
                  idx,
                ),
              };
            }
            let ye = pe ? null : parseFrameForDisplay(TaskCompletedMessageSchema(), msg_0.text);
            if (ye) {
              let taskId = capIdFrameField(ye.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
              let taskSubject = ye.taskSubject
                ? capIdFrameField(ye.taskSubject, IDLE_SUMMARY_RECEIVE_BOUND)
                : "";
              return {
                kind: "panel",
                node: jsxProd_default(
                  TaskAssignmentMessage,
                  {
                    displayName: te,
                    inkColor,
                    summary: de,
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
              displayName: te,
              senderName: ae,
              isUnverified: pe,
              inkColor,
              content: planApprovalElement,
              summary: de,
            };
          };
          $[6] = transcriptMode;
          $[7] = z;
        } else z = $[7];
        let mapped = parsed.map(z);
        W = Box;
        flexDirection = "column";
        children = transcriptMode
          ? mapped.map(renderTeammateContentItem)
          : coalesceTeammateMessages(mapped).map(renderCoalescedTeammateItem);
      }
      $[0] = attachment.messages;
      $[1] = transcriptMode;
      $[2] = W;
      $[3] = flexDirection;
      $[4] = children;
      $[5] = V;
    } else {
      W = $[2];
      flexDirection = $[3];
      children = $[4];
      V = $[5];
    }
    if (V !== EARLY_RETURN_SENTINEL) return V;
    let z;
    if ($[8] !== W || $[9] !== flexDirection || $[10] !== children) {
      z = jsxProd_default(W, {
        flexDirection,
        children,
      });
      $[8] = W;
      $[9] = flexDirection;
      $[10] = children;
      $[11] = z;
    } else z = $[11];
    return z;
  }
  switch (attachment.type) {
    case "directory": {
      const children = attachment.displayPath + sep;
      let K;
      if ($[12] !== children) {
        K = jsxProd_default_2(Line, {
          children: [
            "Listed directory ",
            jsxProd_default(Text, {
              bold: true,
              children,
            }),
          ],
        });
        $[12] = children;
        $[13] = K;
      } else K = $[13];
      return K;
    }
    case "file":
    case "already_read_file": {
      let U;
      if ($[14] !== attachment.content || $[15] !== attachment.truncated) {
        U = getFileAttachmentSummaryKind(attachment.content, attachment.truncated);
        $[14] = attachment.content;
        $[15] = attachment.truncated;
        $[16] = U;
      } else U = $[16];
      let Ue = U;
      let K;
      if ($[17] !== attachment.displayPath) {
        K = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[17] = attachment.displayPath;
        $[18] = K;
      } else K = $[18];
      const V = Ue !== undefined && ` (${Ue})`;
      let z;
      if ($[19] !== K || $[20] !== V) {
        z = jsxProd_default_2(Line, {
          children: ["Read ", K, V],
        });
        $[19] = K;
        $[20] = V;
        $[21] = z;
      } else z = $[21];
      return z;
    }
    case "compact_file_reference": {
      let U;
      if ($[22] !== attachment.displayPath) {
        U = jsxProd_default_2(Line, {
          children: [
            "Referenced file ",
            jsxProd_default(Text, {
              bold: true,
              children: attachment.displayPath,
            }),
          ],
        });
        $[22] = attachment.displayPath;
        $[23] = U;
      } else U = $[23];
      return U;
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
      let K;
      if ($[28] !== children) {
        K = jsxProd_default(Text, {
          bold: true,
          children,
        });
        $[28] = children;
        $[29] = K;
      } else K = $[29];
      let V;
      if ($[30] !== attachment.fileSize || $[31] !== attachment.unread) {
        V =
          attachment.unread === "unexamined"
            ? "not read: could not be examined"
            : attachment.unread === "too_large"
              ? `not read: too large, ${formatFileSize(attachment.fileSize)}`
              : "not read";
        $[30] = attachment.fileSize;
        $[31] = attachment.unread;
        $[32] = V;
      } else V = $[32];
      let z;
      if ($[33] !== K || $[34] !== V) {
        z = jsxProd_default_2(Line, {
          children: ["Referenced", " ", K, " ", "(", V, ")"],
        });
        $[33] = K;
        $[34] = V;
        $[35] = z;
      } else z = $[35];
      return z;
    }
    case "pdf_reference": {
      let U;
      if ($[36] !== attachment.displayPath) {
        U = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[36] = attachment.displayPath;
        $[37] = U;
      } else U = $[37];
      let K;
      if ($[38] !== attachment.pageCount || $[39] !== attachment.stillArriving) {
        K = attachment.stillArriving
          ? "queued before download"
          : attachment.pageCount === null
            ? "page count unknown"
            : `${attachment.pageCount} ${plural(attachment.pageCount, "page")}`;
        $[38] = attachment.pageCount;
        $[39] = attachment.stillArriving;
        $[40] = K;
      } else K = $[40];
      let V;
      if ($[41] !== U || $[42] !== K) {
        V = jsxProd_default_2(Line, {
          children: ["Referenced PDF ", U, " (", K, ")"],
        });
        $[41] = U;
        $[42] = K;
        $[43] = V;
      } else V = $[43];
      return V;
    }
    case "selected_lines_in_ide": {
      let U;
      if ($[44] === MEMO_CACHE_SENTINEL) {
        U = jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u29C9 ",
        });
        $[44] = U;
      } else U = $[44];
      const children = attachment.lineEnd - attachment.lineStart + 1;
      let V;
      if ($[45] !== children) {
        V = jsxProd_default(Text, {
          bold: true,
          children,
        });
        $[45] = children;
        $[46] = V;
      } else V = $[46];
      let z;
      if ($[47] !== attachment.displayPath) {
        z = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[47] = attachment.displayPath;
        $[48] = z;
      } else z = $[48];
      let we;
      if ($[49] !== attachment.ideName || $[50] !== V || $[51] !== z) {
        we = jsxProd_default_2(Line, {
          children: [U, "Selected", " ", V, " ", "lines from ", z, " in", " ", attachment.ideName],
        });
        $[49] = attachment.ideName;
        $[50] = V;
        $[51] = z;
        $[52] = we;
      } else we = $[52];
      return we;
    }
    case "selected_lines_in_diff": {
      let U;
      if ($[53] === MEMO_CACHE_SENTINEL) {
        U = jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u29C9 ",
        });
        $[53] = U;
      } else U = $[53];
      let K;
      if ($[54] !== attachment.lineCount) {
        K = jsxProd_default(Text, {
          bold: true,
          children: attachment.lineCount,
        });
        $[54] = attachment.lineCount;
        $[55] = K;
      } else K = $[55];
      let V;
      if ($[56] !== attachment.lineCount) {
        V = plural(attachment.lineCount, "line");
        $[56] = attachment.lineCount;
        $[57] = V;
      } else V = $[57];
      let z;
      if ($[58] !== K || $[59] !== V) {
        z = jsxProd_default_2(Line, {
          children: [U, "Selected", " ", K, " ", V, " from diff view"],
        });
        $[58] = K;
        $[59] = V;
        $[60] = z;
      } else z = $[60];
      return z;
    }
    case "nested_memory": {
      let U;
      if ($[61] !== attachment.displayPath) {
        U = jsxProd_default_2(Line, {
          children: [
            "Loaded ",
            jsxProd_default(Text, {
              bold: true,
              children: attachment.displayPath,
            }),
          ],
        });
        $[61] = attachment.displayPath;
        $[62] = U;
      } else U = $[62];
      return U;
    }
    case "withheld_memory": {
      let U;
      if ($[63] !== attachment.entries) {
        U = jsxProd_default(WithheldFilesList, {
          entries: attachment.entries,
        });
        $[63] = attachment.entries;
        $[64] = U;
      } else U = $[64];
      return U;
    }
    case "relevant_memories": {
      let U;
      if ($[65] === MEMO_CACHE_SENTINEL) {
        U = alwaysFalseMemCtx();
        $[65] = U;
      } else U = $[65];
      let $e = U;
      const marginTop = addMargin ? 1 : 0;
      let V;
      if ($[66] === MEMO_CACHE_SENTINEL) {
        V = jsxProd_default(Box, {
          minWidth: 2,
        });
        $[66] = V;
      } else V = $[66];
      let z;
      if ($[67] !== attachment.memories.length) {
        z = jsxProd_default(Text, {
          bold: true,
          children: attachment.memories.length,
        });
        $[67] = attachment.memories.length;
        $[68] = z;
      } else z = $[68];
      const we = attachment.memories.length === 1 ? "memory" : "memories";
      let De;
      if ($[69] !== isTranscriptMode) {
        De =
          !isTranscriptMode &&
          jsxProd_default_2(Fragment, {
            children: [" ", jsxProd_default(CtrlOToExpand, {})],
          });
        $[69] = isTranscriptMode;
        $[70] = De;
      } else De = $[70];
      let xe;
      if ($[71] !== z || $[72] !== we || $[73] !== De) {
        xe = jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            V,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Recalled ", z, " ", $e ? "local " : "", we, De],
            }),
          ],
        });
        $[71] = z;
        $[72] = we;
        $[73] = De;
        $[74] = xe;
      } else xe = $[74];
      let Pe;
      if ($[75] !== attachment.memories || $[76] !== isTranscriptMode || $[77] !== verbose) {
        Pe =
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
                        $e ? " \xB7 local" : "",
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
        $[78] = Pe;
      } else Pe = $[78];
      let qe;
      if ($[79] !== xe || $[80] !== Pe || $[81] !== marginTop) {
        qe = jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop,
          children: [xe, Pe],
        });
        $[79] = xe;
        $[80] = Pe;
        $[81] = marginTop;
        $[82] = qe;
      } else qe = $[82];
      return qe;
    }
    case "account_memory_recall": {
      attachment.localRecall ?? [];
      return null;
    }
    case "dynamic_skill": {
      let skillCount = attachment.skillNames.length;
      let U;
      if ($[83] !== skillCount) {
        U = plural(skillCount, "skill");
        $[83] = skillCount;
        $[84] = U;
      } else U = $[84];
      let K;
      if ($[85] !== skillCount || $[86] !== U) {
        K = jsxProd_default_2(Text, {
          bold: true,
          children: [skillCount, " ", U],
        });
        $[85] = skillCount;
        $[86] = U;
        $[87] = K;
      } else K = $[87];
      let V;
      if ($[88] !== attachment.displayPath) {
        V = jsxProd_default(Text, {
          bold: true,
          children: attachment.displayPath,
        });
        $[88] = attachment.displayPath;
        $[89] = V;
      } else V = $[89];
      let z;
      if ($[90] !== K || $[91] !== V) {
        z = jsxProd_default_2(Line, {
          children: ["Loaded", " ", K, " ", "from ", V],
        });
        $[90] = K;
        $[91] = V;
        $[92] = z;
      } else z = $[92];
      return z;
    }
    case "skill_listing": {
      if (attachment.isInitial) {
        return null;
      }
      let U;
      if ($[93] !== attachment.skillCount) {
        U = jsxProd_default(Text, {
          bold: true,
          children: attachment.skillCount,
        });
        $[93] = attachment.skillCount;
        $[94] = U;
      } else U = $[94];
      let K;
      if ($[95] !== attachment.skillCount) {
        K = plural(attachment.skillCount, "skill");
        $[95] = attachment.skillCount;
        $[96] = K;
      } else K = $[96];
      let V;
      if ($[97] !== U || $[98] !== K) {
        V = jsxProd_default_2(Line, {
          children: [U, " ", K, " available"],
        });
        $[97] = U;
        $[98] = K;
        $[99] = V;
      } else V = $[99];
      return V;
    }
    case "agent_listing_delta": {
      let U;
      if ($[100] !== attachment.addedTypes || $[101] !== attachment.builtInPluginTypes) {
        let Ro = new Set(stringArray(attachment.builtInPluginTypes));
        U = stringArray(attachment.addedTypes).filter((Uo) => !Ro.has(Uo));
        $[100] = attachment.addedTypes;
        $[101] = attachment.builtInPluginTypes;
        $[102] = U;
      } else U = $[102];
      let go = U;
      if (attachment.isInitial || go.length === 0) {
        return null;
      }
      let count = go.length;
      let K;
      if ($[103] !== count) {
        K = jsxProd_default(Text, {
          bold: true,
          children: count,
        });
        $[103] = count;
        $[104] = K;
      } else K = $[104];
      let V;
      if ($[105] !== count) {
        V = plural(count, "type");
        $[105] = count;
        $[106] = V;
      } else V = $[106];
      let z;
      if ($[107] !== K || $[108] !== V) {
        z = jsxProd_default_2(Line, {
          children: [K, " agent ", V, " available"],
        });
        $[107] = K;
        $[108] = V;
        $[109] = z;
      } else z = $[109];
      return z;
    }
    case "queued_command": {
      let Ge;
      let U;
      let ao;
      if ($[110] !== attachment || $[111] !== b || $[112] !== k || $[113] !== L) {
        ao = joinTextContent(attachment.prompt).trim();
        let imagePasteIds = Array.isArray(attachment.imagePasteIds) ? attachment.imagePasteIds : [];
        let Eo =
          L && b && imagePasteIds.length > 0
            ? getImagePlaceholderIds(ao, messageOrigin(attachment))
            : undefined;
        Ge = Eo === undefined ? imagePasteIds : imagePasteIds.filter((imagePasteId) => !Eo.has(imagePasteId));
        U = k && isTaggedSystemUserText(ao);
        $[110] = attachment;
        $[111] = b;
        $[112] = k;
        $[113] = L;
        $[114] = Ge;
        $[115] = U;
        $[116] = ao;
      } else {
        Ge = $[114];
        U = $[115];
        ao = $[116];
      }
      let Ao = U;
      let param;
      if ($[117] !== ao) {
        param = {
          text: ao,
          type: "text",
        };
        $[117] = ao;
        $[118] = param;
      } else param = $[118];
      let origin;
      if ($[119] !== attachment) {
        origin = messageOrigin(attachment);
        $[119] = attachment;
        $[120] = origin;
      } else origin = $[120];
      const followsCoordinatorLabel = E && attachment.origin?.kind === "coordinator";
      let we;
      if (
        $[121] !== addMargin ||
        $[122] !== attachment.taskDelivery ||
        $[123] !== E ||
        $[124] !== b ||
        $[125] !== isTranscriptMode ||
        $[126] !== messageId ||
        $[127] !== param ||
        $[128] !== origin ||
        $[129] !== followsCoordinatorLabel ||
        $[130] !== verbose
      ) {
        we = jsxProd_default(UserTextMessage, {
          addMargin,
          param,
          verbose,
          isTranscriptMode,
          messageId,
          origin,
          taskDelivery: attachment.taskDelivery,
          followsSpeakerLabel: b,
          followsInboundLabel: E,
          followsCoordinatorLabel,
        });
        $[121] = addMargin;
        $[122] = attachment.taskDelivery;
        $[123] = E;
        $[124] = b;
        $[125] = isTranscriptMode;
        $[126] = messageId;
        $[127] = param;
        $[128] = origin;
        $[129] = followsCoordinatorLabel;
        $[130] = verbose;
        $[131] = we;
      } else we = $[131];
      let De;
      if ($[132] !== Ao || $[133] !== Ge) {
        let xe;
        if ($[135] !== Ao) {
          xe = (ht, Go) =>
            jsxProd_default(
              UserImageMessage,
              {
                imageId: ht,
                startsUserTurn: Ao && Go === 0 ? true : undefined,
              },
              ht,
            );
          $[135] = Ao;
          $[136] = xe;
        } else xe = $[136];
        De = Ge.map(xe);
        $[132] = Ao;
        $[133] = Ge;
        $[134] = De;
      } else De = $[134];
      let xe;
      if ($[137] !== we || $[138] !== De) {
        xe = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [we, De],
        });
        $[137] = we;
        $[138] = De;
        $[139] = xe;
      } else xe = $[139];
      return xe;
    }
    case "plan_file_reference": {
      if (!attachment.planFilePath) {
        let U;
        if ($[140] === MEMO_CACHE_SENTINEL) {
          U = jsxProd_default(Line, {
            children: "Plan referenced",
          });
          $[140] = U;
        } else U = $[140];
        return U;
      }
      let U;
      if ($[141] !== attachment.planFilePath) {
        U = getDisplayPath(attachment.planFilePath);
        $[141] = attachment.planFilePath;
        $[142] = U;
      } else U = $[142];
      let K;
      if ($[143] !== U) {
        K = jsxProd_default_2(Line, {
          children: ["Plan file referenced (", U, ")"],
        });
        $[143] = U;
        $[144] = K;
      } else K = $[144];
      return K;
    }
    case "invoked_skills": {
      if (attachment.skills.length === 0) {
        return null;
      }
      let U;
      if ($[145] !== attachment.skills) {
        U = attachment.skills.map(hookDisplayName).join(", ");
        $[145] = attachment.skills;
        $[146] = U;
      } else U = $[146];
      let Tt = U;
      let K;
      if ($[147] !== Tt) {
        K = jsxProd_default_2(Line, {
          children: ["Skills restored (", Tt, ")"],
        });
        $[147] = Tt;
        $[148] = K;
      } else K = $[148];
      return K;
    }
    case "diagnostics": {
      let U;
      if ($[149] !== attachment || $[150] !== isTranscriptMode || $[151] !== verbose) {
        U = jsxProd_default(DiagnosticsDisplay, {
          attachment,
          verbose,
          isTranscriptMode,
        });
        $[149] = attachment;
        $[150] = isTranscriptMode;
        $[151] = verbose;
        $[152] = U;
      } else U = $[152];
      return U;
    }
    case "mcp_resource": {
      let U;
      if ($[153] !== attachment.name) {
        U = jsxProd_default(Text, {
          bold: true,
          children: attachment.name,
        });
        $[153] = attachment.name;
        $[154] = U;
      } else U = $[154];
      let K;
      if ($[155] !== attachment.server || $[156] !== U) {
        K = jsxProd_default_2(Line, {
          children: ["Read MCP resource ", U, " from", " ", attachment.server],
        });
        $[155] = attachment.server;
        $[156] = U;
        $[157] = K;
      } else K = $[157];
      return K;
    }
    case "command_permissions": {
      return null;
    }
    case "async_hook_response":
    case "async_hook_response_batch": {
      let U;
      if ($[158] !== attachment.hookEvent || $[159] !== attachment.hooks || $[160] !== attachment.type) {
        U =
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
        $[161] = U;
      } else U = $[161];
      let W;
      let children;
      let V;
      if ($[162] !== isTranscriptMode || $[163] !== U || $[164] !== verbose) {
        V = EARLY_RETURN_SENTINEL;
        Mt: {
          let z;
          if ($[168] !== isTranscriptMode || $[169] !== verbose) {
            z = (id) => verbose || (isTranscriptMode && id.hookEvent !== "SessionStart");
            $[168] = isTranscriptMode;
            $[169] = verbose;
            $[170] = z;
          } else z = $[170];
          let filtered = U.filter(z);
          if (filtered.length === 0) {
            V = null;
            break Mt;
          }
          W = Line;
          children = filtered.map(renderAsyncHookCompletedItem);
        }
        $[162] = isTranscriptMode;
        $[163] = U;
        $[164] = verbose;
        $[165] = W;
        $[166] = children;
        $[167] = V;
      } else {
        W = $[165];
        children = $[166];
        V = $[167];
      }
      if (V !== EARLY_RETURN_SENTINEL) return V;
      let z;
      if ($[171] !== W || $[172] !== children) {
        z = jsxProd_default(W, {
          children,
        });
        $[171] = W;
        $[172] = children;
        $[173] = z;
      } else z = $[173];
      return z;
    }
    case "hook_blocking_error": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let ho;
      let U;
      if (
        $[174] !== addMargin ||
        $[175] !== attachment.blockingError.blockingError ||
        $[176] !== attachment.hookName ||
        $[177] !== L
      ) {
        U = EARLY_RETURN_SENTINEL;
        bt: {
          ho = attachment.blockingError.blockingError.trim();
          if (L) {
            U = jsxProd_default(NoticeRowMessage, {
              row: buildHookErrorRow({
                hookName: attachment.hookName,
                blocking: true,
                reason: ho,
              }),
              addMargin,
            });
            break bt;
          }
        }
        $[174] = addMargin;
        $[175] = attachment.blockingError.blockingError;
        $[176] = attachment.hookName;
        $[177] = L;
        $[178] = ho;
        $[179] = U;
      } else {
        ho = $[178];
        U = $[179];
      }
      if (U !== EARLY_RETURN_SENTINEL) return U;
      let K;
      if ($[180] !== attachment.hookName) {
        K = jsxProd_default_2(Line, {
          color: "error",
          children: [attachment.hookName, " hook returned blocking error"],
        });
        $[180] = attachment.hookName;
        $[181] = K;
      } else K = $[181];
      let V;
      if ($[182] !== ho) {
        V = ho
          ? jsxProd_default(Line, {
              color: "error",
              children: ho,
            })
          : null;
        $[182] = ho;
        $[183] = V;
      } else V = $[183];
      let z;
      if ($[184] !== K || $[185] !== V) {
        z = jsxProd_default_2(Fragment, {
          children: [K, V],
        });
        $[184] = K;
        $[185] = V;
        $[186] = z;
      } else z = $[186];
      return z;
    }
    case "hook_non_blocking_error": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let Do;
      let U;
      if (
        $[187] !== addMargin ||
        $[188] !== attachment.hookName ||
        $[189] !== attachment.stderr ||
        $[190] !== attachment.stdout ||
        $[191] !== L
      ) {
        U = EARLY_RETURN_SENTINEL;
        So: {
          Do = firstLineOfHookOutput(attachment.stderr, attachment.stdout);
          if (L) {
            U = jsxProd_default(NoticeRowMessage, {
              row: buildHookErrorRow({
                hookName: attachment.hookName,
                blocking: false,
                reason: Do,
              }),
              addMargin,
            });
            break So;
          }
        }
        $[187] = addMargin;
        $[188] = attachment.hookName;
        $[189] = attachment.stderr;
        $[190] = attachment.stdout;
        $[191] = L;
        $[192] = Do;
        $[193] = U;
      } else {
        Do = $[192];
        U = $[193];
      }
      if (U !== EARLY_RETURN_SENTINEL) return U;
      let K;
      if ($[194] !== attachment.hookName) {
        K = jsxProd_default_2(Line, {
          color: "error",
          children: [attachment.hookName, " hook error"],
        });
        $[194] = attachment.hookName;
        $[195] = K;
      } else K = $[195];
      let V;
      if ($[196] !== Do) {
        V = Do
          ? jsxProd_default(Line, {
              color: "error",
              children: Do,
            })
          : null;
        $[196] = Do;
        $[197] = V;
      } else V = $[197];
      let z;
      if ($[198] !== K || $[199] !== V) {
        z = jsxProd_default_2(Fragment, {
          children: [K, V],
        });
        $[198] = K;
        $[199] = V;
        $[200] = z;
      } else z = $[200];
      return z;
    }
    case "hook_cancelled": {
      if (attachment.hookEvent !== "UserPromptSubmit" || !attachment.timedOut) {
        return null;
      }
      let U;
      if ($[201] !== attachment.timeoutMs) {
        U = attachment.timeoutMs
          ? attachment.timeoutMs < 1000
            ? `${attachment.timeoutMs}ms`
            : `${Math.round(attachment.timeoutMs / 1000)}s`
          : undefined;
        $[201] = attachment.timeoutMs;
        $[202] = U;
      } else U = $[202];
      let Qe = U;
      let xr = attachment.command ? ` [${attachment.command}]` : "";
      const K = Qe !== undefined ? ` after ${Qe}` : "";
      let V;
      if ($[203] !== attachment.hookName || $[204] !== xr || $[205] !== K) {
        V = jsxProd_default_2(Line, {
          color: "error",
          dimColor: false,
          children: [
            attachment.hookName,
            " hook",
            xr,
            " timed out",
            K,
            ` \u2014 output discarded. Raise the hook's "timeout" to allow more time.`,
          ],
        });
        $[203] = attachment.hookName;
        $[204] = xr;
        $[205] = K;
        $[206] = V;
      } else V = $[206];
      return V;
    }
    case "hook_error_during_execution": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let U;
      if ($[207] !== attachment.hookName) {
        U = jsxProd_default_2(Line, {
          children: [attachment.hookName, " hook warning"],
        });
        $[207] = attachment.hookName;
        $[208] = U;
      } else U = $[208];
      return U;
    }
    case "hook_success": {
      return null;
    }
    case "hook_stopped_continuation": {
      if (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop") {
        return null;
      }
      let U;
      if ($[209] !== attachment.hookName || $[210] !== attachment.message) {
        U = jsxProd_default_2(Line, {
          color: "warning",
          children: [attachment.hookName, " hook stopped continuation: ", attachment.message],
        });
        $[209] = attachment.hookName;
        $[210] = attachment.message;
        $[211] = U;
      } else U = $[211];
      return U;
    }
    case "hook_deferred_tool": {
      let U;
      if ($[212] !== attachment.hookName || $[213] !== attachment.toolName) {
        U = jsxProd_default_2(Line, {
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
        $[214] = U;
      } else U = $[214];
      return U;
    }
    case "goal_status": {
      if (attachment.sentinel) {
        return null;
      }
      let Je = attachment.failed === true;
      let No;
      if (
        $[215] !== attachment.durationMs ||
        $[216] !== attachment.iterations ||
        $[217] !== attachment.met ||
        $[218] !== attachment.tokens ||
        $[219] !== Je
      ) {
        No = [];
        if (attachment.met || Je) {
          if (attachment.durationMs !== undefined) {
            let U;
            if ($[221] !== attachment.durationMs) {
              U = formatDuration(attachment.durationMs, {
                mostSignificantOnly: true,
              });
              $[221] = attachment.durationMs;
              $[222] = U;
            } else U = $[222];
            No.push(U);
          }
          if (attachment.iterations !== undefined) {
            const iterations = attachment.iterations;
            let K;
            if ($[223] !== attachment.iterations) {
              K = plural(attachment.iterations, "turn");
              $[223] = attachment.iterations;
              $[224] = K;
            } else K = $[224];
            No.push(`${iterations} ${K}`);
          }
          if (attachment.tokens !== undefined) {
            let U;
            if ($[225] !== attachment.tokens) {
              U = formatTokens(attachment.tokens);
              $[225] = attachment.tokens;
              $[226] = U;
            } else U = $[226];
            No.push(`${U} tokens`);
          }
        }
        $[215] = attachment.durationMs;
        $[216] = attachment.iterations;
        $[217] = attachment.met;
        $[218] = attachment.tokens;
        $[219] = Je;
        $[220] = No;
      } else No = $[220];
      let Rt = No.length > 0 ? ` (${No.join(" \xB7 ")})` : "";
      const status = Je ? "error" : attachment.met ? "success" : "pending";
      let K;
      if ($[227] !== status) {
        K = jsxProd_default(StatusIcon, {
          status,
          withSpace: true,
        });
        $[227] = status;
        $[228] = K;
      } else K = $[228];
      const color = Je ? "error" : undefined;
      const dimColor = !attachment.met && !Je;
      const children = Je
        ? "Goal could not be achieved"
        : attachment.met
          ? "Goal achieved"
          : "Goal not yet met\u2026 continuing";
      let De;
      if ($[229] !== color || $[230] !== dimColor || $[231] !== children) {
        De = jsxProd_default(Text, {
          color,
          dimColor,
          children,
        });
        $[229] = color;
        $[230] = dimColor;
        $[231] = children;
        $[232] = De;
      } else De = $[232];
      let xe;
      if ($[233] !== Rt) {
        xe = Rt
          ? jsxProd_default(Text, {
              dimColor: true,
              children: Rt,
            })
          : null;
        $[233] = Rt;
        $[234] = xe;
      } else xe = $[234];
      let Pe;
      if ($[235] !== verbose) {
        Pe = !verbose
          ? jsxProd_default_2(Text, {
              children: [" ", jsxProd_default(CtrlOToExpand, {})],
            })
          : null;
        $[235] = verbose;
        $[236] = Pe;
      } else Pe = $[236];
      let qe;
      if ($[237] !== xe || $[238] !== Pe || $[239] !== K || $[240] !== De) {
        qe = jsxProd_default_2(Text, {
          children: [K, De, xe, Pe],
        });
        $[237] = xe;
        $[238] = Pe;
        $[239] = K;
        $[240] = De;
        $[241] = qe;
      } else qe = $[241];
      let Dt;
      if ($[242] !== attachment.reason || $[243] !== Je) {
        Dt =
          Je && attachment.reason
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
        $[243] = Je;
        $[244] = Dt;
      } else Dt = $[244];
      let Lo;
      if ($[245] !== attachment.condition || $[246] !== verbose) {
        Lo = verbose
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
        $[247] = Lo;
      } else Lo = $[247];
      let Nt;
      if ($[248] !== attachment.reason || $[249] !== Je || $[250] !== verbose) {
        Nt =
          verbose && !Je && attachment.reason
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
        $[249] = Je;
        $[250] = verbose;
        $[251] = Nt;
      } else Nt = $[251];
      let Ts;
      if ($[252] !== qe || $[253] !== Dt || $[254] !== Lo || $[255] !== Nt) {
        Ts = jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [qe, Dt, Lo, Nt],
        });
        $[252] = qe;
        $[253] = Dt;
        $[254] = Lo;
        $[255] = Nt;
        $[256] = Ts;
      } else Ts = $[256];
      return Ts;
    }
    case "hook_system_message": {
      let U;
      if ($[257] !== attachment.content || $[258] !== attachment.hookName) {
        U = jsxProd_default_2(Line, {
          children: [attachment.hookName, " says: ", attachment.content],
        });
        $[257] = attachment.content;
        $[258] = attachment.hookName;
        $[259] = U;
      } else U = $[259];
      return U;
    }
    case "tool_hosts_notice": {
      let U;
      if ($[260] !== attachment.lines) {
        let filtered = stringArray(attachment.lines).filter(isNonBlank);
        U =
          filtered.length === 0
            ? null
            : jsxProd_default(Line, {
                children: filtered.join(`
`),
              });
        $[260] = attachment.lines;
        $[261] = U;
      } else U = $[261];
      return U;
    }
    case "tool_hosts_correction": {
      let U;
      if ($[262] !== attachment.lines) {
        let filtered = stringArray(attachment.lines).filter(isNonBlank_2);
        U =
          filtered.length === 0
            ? null
            : jsxProd_default(Line, {
                children: filtered.join(`
`),
              });
        $[262] = attachment.lines;
        $[263] = U;
      } else U = $[263];
      return U;
    }
    case "tool_host_result_lines": {
      let U;
      if ($[264] !== attachment.label || $[265] !== attachment.lines || $[266] !== attachment.unverified) {
        let filtered = [
          ...(attachment.unverified === true && typeof attachment.label === "string"
            ? [attachment.label]
            : []),
          ...stringArray(attachment.lines),
        ].filter(isNonBlank_3);
        U =
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
        $[267] = U;
      } else U = $[267];
      return U;
    }
    case "hook_permission_decision": {
      let kt = attachment.decision === "allow" ? "Allowed" : "Denied";
      let U;
      if ($[268] !== attachment.hookEvent) {
        U = jsxProd_default(Text, {
          bold: true,
          children: attachment.hookEvent,
        });
        $[268] = attachment.hookEvent;
        $[269] = U;
      } else U = $[269];
      let K;
      if ($[270] !== kt || $[271] !== U) {
        K = jsxProd_default_2(Line, {
          children: [kt, " by ", U, " hook"],
        });
        $[270] = kt;
        $[271] = U;
        $[272] = K;
      } else K = $[272];
      return K;
    }
    case "task_status": {
      let U;
      if ($[273] !== attachment) {
        U = jsxProd_default(TaskStatusMessage, {
          attachment,
        });
        $[273] = attachment;
        $[274] = U;
      } else U = $[274];
      return U;
    }
    case "teammate_shutdown_batch": {
      let U;
      if ($[275] === MEMO_CACHE_SENTINEL) {
        U = jsxProd_default_2(Text, {
          "aria-hidden": true,
          dimColor: true,
          children: [BLACK_CIRCLE, " "],
        });
        $[275] = U;
      } else U = $[275];
      const count = attachment.count;
      let V;
      if ($[276] !== attachment.count) {
        V = plural(attachment.count, "teammate");
        $[276] = attachment.count;
        $[277] = V;
      } else V = $[277];
      let z;
      if ($[278] !== attachment.count || $[279] !== V) {
        z = jsxProd_default_2(Box, {
          flexDirection: "row",
          width: "100%",
          marginTop: 1,
          children: [
            U,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [count, " ", V, " shut down gracefully"],
            }),
          ],
        });
        $[278] = attachment.count;
        $[279] = V;
        $[280] = z;
      } else z = $[280];
      return z;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-ah34pb7m.js:145759-146048 fingerprint = TaskStatusMessage (1)
function TaskStatusMessage(props) {
  let $ = w(4);
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
//@ chunk-ah34pb7m.js:146048-146614 fingerprint = GenericTaskStatus (0.778)
function GenericTaskStatus(props) {
  let $ = w(6);
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
  let M;
  if ($[3] !== statusText || $[4] !== t2) {
    M = jsxProd_default_2(Box, {
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
    $[5] = M;
  } else M = $[5];
  return M;
}
//@ chunk-ah34pb7m.js:146614-147479 fingerprint = TeammateTaskStatus (0.749)
function TeammateTaskStatus(props) {
  let $ = w(13);
  let { attachment } = props;
  let t1;
  if ($[0] !== attachment.taskId) {
    t1 = (f) => f.tasks[attachment.taskId];
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
  let E;
  if ($[10] !== statusText || $[11] !== t4) {
    E = jsxProd_default_2(Box, {
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
    $[12] = E;
  } else E = $[12];
  return E;
}
//@ chunk-ah34pb7m.js:147479-147839 layout
function getFileAttachmentSummaryKind(content, truncated) {
  if (!isPlainObject(content)) return;
  let file = isPlainObject(content.file) ? content.file : undefined;
  switch (content.type) {
    case "file_unchanged":
      return "unchanged";
    case "notebook":
      return Array.isArray(file?.cells) ? `${file.cells.length} cells` : undefined;
    case "text":
      return typeof file?.numLines === "number" ? `${file.numLines}${truncated ? "+" : ""} lines` : undefined;
    default:
      return typeof file?.originalSize === "number" ? formatFileSize(file.originalSize) : undefined;
  }
}
//@ chunk-ah34pb7m.js:147839-148151 layout
function firstLineOfHookOutput(stderr, stdout) {
  let c = stderr?.trim() ? stderr : stdout?.trim() ? stdout : "";
  if (!c) return "";
  let trimmed = firstLineOf(
    c,
    `

Expected schema:`,
  ).trim();
  let f = 0;
  let index = trimmed.indexOf(`
`);
  while (index !== -1) {
    let trimmed_2 = trimmed.slice(f, index).trim();
    if (trimmed_2) return trimmed_2.length > 200 ? trimmed_2.slice(0, 200) + "\u2026" : trimmed_2;
    f = index + 1;
    index = trimmed.indexOf(
      `
`,
      f,
    );
  }
  let trimmed_2 = trimmed.slice(f).trim();
  return trimmed_2.length > 200 ? trimmed_2.slice(0, 200) + "\u2026" : trimmed_2;
}
//@ chunk-ah34pb7m.js:148151-148396 fingerprint = Line (0.832)
function Line(props) {
  let $ = w(4);
  let { dimColor, children, color } = props;
  let dimColor_2 = dimColor === undefined ? true : dimColor;
  let M;
  if ($[0] !== children || $[1] !== color || $[2] !== dimColor_2) {
    M = jsxProd_default(Box, {
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
    $[3] = M;
  } else M = $[3];
  return M;
}
export { AttachmentMessage };
