/**
 * tools/BriefTool/UI.tsx
 *
 * SendUserMessage 结果渲染（转录/仅 Brief/普通三种布局）与附件列表组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/UI.tsx
 * pieces: chunk-wjygkcr4.js (3)
 * attribution: fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute } from "path";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { getDisplayPath } from "../../utils/file.js";
import { formatFileSize } from "../../utils/format.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import { NoSelect } from "../../ink/components/Input.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";

//@ chunk-wjygkcr4.js:24075-24408 fingerprint (2.1.88 match: _temp, 0.856)
function renderAttachmentRow(att) {
  let canLink = isAbsolute(att.path) && att.pathValidated && !isUntouchableSpelling(att.path);
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [figures_default.pointerSmall, " ", att.isImage ? "[image]" : "[file]", " "],
        }),
        canLink
          ? jsxProd_default(FilePathLink, {
              filePath: att.path,
              children: getDisplayPath(att.path),
            })
          : jsxProd_default(Text, {
              children: getDisplayPath(att.path),
            }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" (", formatFileSize(att.size), ")"],
        }),
      ],
    },
    att.file_uuid ?? att.path,
  );
}
//@ chunk-wjygkcr4.js:24408-25371 fingerprint (2.1.88 match: renderToolResultMessage, 0.869)
/**
 * SendUserMessage 结果渲染：转录模式、仅 Brief 模式（Claude 标签+时间）与普通模式三种布局，附附件列表。
 */
function renderToolResultMessage_6(output, _progressMessages, options) {
  let hasAttachments = (output.attachments?.length ?? 0) > 0;
  if (!output.message && !hasAttachments) return null;
  if (options?.isTranscriptMode)
    return jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            color: "text",
            children: BLACK_CIRCLE,
          }),
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            output.message
              ? jsxProd_default(MarkdownText_2, {
                  children: output.message,
                })
              : null,
            jsxProd_default(AttachmentList, {
              attachments: output.attachments,
            }),
          ],
        }),
      ],
    });
  if (options?.isBriefOnly) {
    let ts = output.sentAt ? formatBriefTimestamp(output.sentAt) : "";
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingLeft: 2,
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Text, {
              color: "briefLabelClaude",
              children: "Claude",
            }),
            ts
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" ", ts],
                })
              : null,
          ],
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            output.message
              ? jsxProd_default(MarkdownText_2, {
                  children: output.message,
                })
              : null,
            jsxProd_default(AttachmentList, {
              attachments: output.attachments,
            }),
          ],
        }),
      ],
    });
  }
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    marginTop: 1,
    children: [
      jsxProd_default(NoSelect, {
        fromLeftEdge: true,
        minWidth: 2,
        children: jsxProd_default(Text, {
          color: "text",
          children: BLACK_CIRCLE,
        }),
      }),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          output.message
            ? jsxProd_default(MarkdownText_2, {
                children: output.message,
              })
            : null,
          jsxProd_default(AttachmentList, {
            attachments: output.attachments,
          }),
        ],
      }),
    ],
  });
}
//@ chunk-wjygkcr4.js:25371-25612 fingerprint (2.1.88 match: AttachmentList, 1)
/**
 * 附件列表组件：每行显示 [image]/[file]、可点击路径与大小。
 */
function AttachmentList(props) {
  let $ = useMemoCache(4);
  let { attachments } = props;
  if (!attachments || attachments.length === 0) {
    return null;
  }
  let children;
  if ($[0] !== attachments) {
    children = attachments.map(renderAttachmentRow);
    $[0] = attachments;
    $[1] = children;
  } else children = $[1];
  let t2;
  if ($[2] !== children) {
    t2 = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      children,
    });
    $[2] = children;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
export { AttachmentList, renderToolResultMessage_6 };
