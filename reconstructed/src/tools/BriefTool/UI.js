/**
 * tools/BriefTool/UI.tsx
 *
 * SendUserMessage 结果渲染（转录/仅 Brief/普通三种布局）与附件列表组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (3)
 * attribution: fingerprint 3
 */
import { isAbsolute } from "path";
import { hl } from "../../utils/networkPaths.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { getDisplayPath } from "../../utils/file.js";
import { formatFileSize } from "../../utils/format.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import { NoSelect } from "../../ink/components/Input.js";
import { w } from "../../../vendor/react/compiler-runtime.js";

//@ chunk-ah34pb7m.js:23792-24125 fingerprint = _temp (0.855)
function renderAttachmentRow(att) {
  let M = isAbsolute(att.path) && att.pathValidated && !hl(att.path);
  return r(
    Box,
    {
      flexDirection: "row",
      children: [
        r(Text, { dimColor: !0, children: [re.pointerSmall, " ", att.isImage ? "[image]" : "[file]", " "] }),
        M
          ? e(FilePathLink, { filePath: att.path, children: getDisplayPath(att.path) })
          : e(Text, { children: getDisplayPath(att.path) }),
        r(Text, { dimColor: !0, children: [" (", formatFileSize(att.size), ")"] }),
      ],
    },
    att.file_uuid ?? att.path,
  );
}
/**
 * SendUserMessage 结果渲染：转录模式、仅 Brief 模式（Claude 标签+时间）与普通模式三种布局，附附件列表。
 */
//@ chunk-ah34pb7m.js:24125-25088 fingerprint = renderToolResultMessage (0.868)
function renderToolResultMessage_6(output, _progressMessages, options) {
  let hasAttachments = (output.attachments?.length ?? 0) > 0;
  if (!output.message && !hasAttachments) return null;
  if (options?.isTranscriptMode)
    return r(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        e(Box, { minWidth: 2, children: e(Text, { color: "text", children: BLACK_CIRCLE }) }),
        r(Box, {
          flexDirection: "column",
          children: [
            output.message ? e(MarkdownText_2, { children: output.message }) : null,
            e(AttachmentList, { attachments: output.attachments }),
          ],
        }),
      ],
    });
  if (options?.isBriefOnly) {
    let ts = output.sentAt ? formatBriefTimestamp(output.sentAt) : "";
    return r(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingLeft: 2,
      children: [
        r(Box, {
          flexDirection: "row",
          children: [
            e(Text, { color: "briefLabelClaude", children: "Claude" }),
            ts ? r(Text, { dimColor: !0, children: [" ", ts] }) : null,
          ],
        }),
        r(Box, {
          flexDirection: "column",
          children: [
            output.message ? e(MarkdownText_2, { children: output.message }) : null,
            e(AttachmentList, { attachments: output.attachments }),
          ],
        }),
      ],
    });
  }
  return r(Box, {
    flexDirection: "row",
    marginTop: 1,
    children: [
      e(NoSelect, {
        fromLeftEdge: !0,
        minWidth: 2,
        children: e(Text, { color: "text", children: BLACK_CIRCLE }),
      }),
      r(Box, {
        flexDirection: "column",
        children: [
          output.message ? e(MarkdownText_2, { children: output.message }) : null,
          e(AttachmentList, { attachments: output.attachments }),
        ],
      }),
    ],
  });
}
/**
 * 附件列表组件：每行显示 [image]/[file]、可点击路径与大小。
 */
//@ chunk-ah34pb7m.js:25088-25329 fingerprint = AttachmentList (1)
function AttachmentList(t0) {
  let c = w(4),
    { attachments: attachments } = t0;
  if (!attachments || attachments.length === 0) {
    return null;
  }
  let g;
  if (c[0] !== attachments) ((g = attachments.map(renderAttachmentRow)), (c[0] = attachments), (c[1] = g));
  else g = c[1];
  let f;
  if (c[2] !== g)
    ((f = e(Box, { flexDirection: "column", marginTop: 1, children: g })), (c[2] = g), (c[3] = f));
  else f = c[3];
  return f;
}

export { AttachmentList, renderToolResultMessage_6 };
