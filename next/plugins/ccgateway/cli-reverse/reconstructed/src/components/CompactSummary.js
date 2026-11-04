/**
 * components/CompactSummary.tsx
 *
 * 压缩摘要消息："Summarized conversation"，transcript 模式下可展开摘要正文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CompactSummary.tsx
 * pieces: chunk-ah34pb7m.js (5)
 * attribution: placement 4, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { rewriteToolsUsedSummaryTag } from "../utils/messages/untrustedArtifactContent.js";
import { getUserMessageText } from "../utils/messages.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { BLACK_CIRCLE } from "../constants/figures.js";
import { MessageResponse } from "./MessageResponse.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:37715-37719 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:37715", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:37719-37745 placement
function nullRender() {
  return null;
}
//@ chunk-ah34pb7m.js:37745-38008 placement
/**
 * 为消息（uuid/id/plugin）注册 "Placed" 渲染钩子的动作键输入。
 */
function usePlacedActionKeys(props) {
  let $ = useMemoCache(5);
  let { uuid, id, plugin } = props.message;
  let buildInput;
  let inputDeps;
  if ($[0] !== id || $[1] !== plugin || $[2] !== uuid) {
    buildInput = () => ({
      requestId: uuid,
      props: {
        id,
        plugin,
      },
    });
    inputDeps = [uuid, id, plugin];
    $[0] = id;
    $[1] = plugin;
    $[2] = uuid;
    $[3] = buildInput;
    $[4] = inputDeps;
  } else {
    buildInput = $[3];
    inputDeps = $[4];
  }
  return actionKeysNamespace.useRenderHook(
    actionKeysNamespace.useRenderInput("Placed", buildInput, inputDeps),
    nullRender,
  );
}
//@ chunk-ah34pb7m.js:38008-38044 placement
/**
 * 处理压缩摘要文本用于显示。
 */
function renderCompactSummaryText(text, modelOnlyText) {
  text = rewriteToolsUsedSummaryTag(text);
  return text;
}
//@ chunk-ah34pb7m.js:38044-39964 fingerprint (2.1.88 match: CompactSummary, 0.75)
function CompactSummary(props) {
  let $ = useMemoCache(24);
  let { message, screen } = props;
  let isTranscriptMode = screen === "transcript";
  let t1;
  if ($[0] !== message) {
    t1 = renderCompactSummaryText(getUserMessageText(message) || "", message.modelOnlyText);
    $[0] = message;
    $[1] = t1;
  } else t1 = $[1];
  let textContent = t1;
  let metadata = message.summarizeMetadata;
  if (metadata) {
    let t2;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-hidden": true,
          color: "text",
          children: BLACK_CIRCLE,
        }),
      });
      $[2] = t2;
    } else t2 = $[2];
    let t3;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      t3 = jsxProd_default(Text, {
        bold: true,
        children: "Summarized conversation",
      });
      $[3] = t3;
    } else t3 = $[3];
    let t4;
    if ($[4] !== isTranscriptMode || $[5] !== metadata) {
      t4 =
        !isTranscriptMode &&
        jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "Summarized ",
                  metadata.messagesSummarized,
                  " messages",
                  " ",
                  metadata.direction === "up_to" ? "up to this point" : "from this point",
                ],
              }),
              metadata.userContext &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Context: ", "\u201C", metadata.userContext, "\u201D"],
                }),
              jsxProd_default(Text, {
                dimColor: true,
                children: jsxProd_default(ConfigurableShortcutHint, {
                  action: "app:toggleTranscript",
                  context: "Global",
                  fallback: "ctrl+o",
                  description: "expand history",
                  parens: true,
                }),
              }),
            ],
          }),
        });
      $[4] = isTranscriptMode;
      $[5] = metadata;
      $[6] = t4;
    } else t4 = $[6];
    let t5;
    if ($[7] !== isTranscriptMode || $[8] !== textContent) {
      t5 =
        isTranscriptMode &&
        jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            children: textContent,
          }),
        });
      $[7] = isTranscriptMode;
      $[8] = textContent;
      $[9] = t5;
    } else t5 = $[9];
    let t6;
    if ($[10] !== t4 || $[11] !== t5) {
      t6 = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            t2,
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [t3, t4, t5],
            }),
          ],
        }),
      });
      $[10] = t4;
      $[11] = t5;
      $[12] = t6;
    } else t6 = $[12];
    return t6;
  }
  let t2;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        color: "text",
        children: BLACK_CIRCLE,
      }),
    });
    $[13] = t2;
  } else t2 = $[13];
  let t3;
  if ($[14] !== isTranscriptMode) {
    t3 =
      !isTranscriptMode &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " ",
          jsxProd_default(ConfigurableShortcutHint, {
            action: "app:toggleTranscript",
            context: "Global",
            fallback: "ctrl+o",
            description: "expand",
            parens: true,
          }),
        ],
      });
    $[14] = isTranscriptMode;
    $[15] = t3;
  } else t3 = $[15];
  let t4;
  if ($[16] !== t3) {
    t4 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        t2,
        jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default_2(Text, {
            bold: true,
            children: ["Compact summary", t3],
          }),
        }),
      ],
    });
    $[16] = t3;
    $[17] = t4;
  } else t4 = $[17];
  let t5;
  if ($[18] !== isTranscriptMode || $[19] !== textContent) {
    t5 =
      isTranscriptMode &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          children: textContent,
        }),
      });
    $[18] = isTranscriptMode;
    $[19] = textContent;
    $[20] = t5;
  } else t5 = $[20];
  let t6;
  if ($[21] !== t4 || $[22] !== t5) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [t4, t5],
    });
    $[21] = t4;
    $[22] = t5;
    $[23] = t6;
  } else t6 = $[23];
  return t6;
}
export { renderCompactSummaryText, usePlacedActionKeys, CompactSummary };
