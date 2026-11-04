/**
 * commands/install-github-app/OptionalActionsSetupStep.tsx
 *
 * 2.1.316 新增：GitHub App 安装向导的可选 Actions 配置步骤与 OAuth 状态面板
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4v9zy7gn.js (2)
 * attribution: placement 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PASTE_HERE_MSG_2 } from "./OAuthFlowStep.js";
import { TextInput } from "../../components/TextInput.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-4v9zy7gn.js:37793-39822 placement
function OAuthStatusPanel(props) {
  let $ = useMemoCache(26);
  let {
    oauthStatus,
    showPastePrompt,
    pastedCode,
    setPastedCode,
    cursorOffset,
    setCursorOffset,
    textInputColumns,
    onSubmitCode,
  } = props;
  let showCursor = useIsScreenReaderEnabled();
  switch (oauthStatus.state) {
    case "starting": {
      let codeInput;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        codeInput = jsxProd_default(WorkerBadge, {
          message: "Starting authentication\u2026",
        });
        $[0] = codeInput;
      } else codeInput = $[0];
      return codeInput;
    }
    case "waiting_for_login": {
      let statusLine;
      if ($[1] !== showPastePrompt) {
        statusLine =
          !showPastePrompt &&
          jsxProd_default(WorkerBadge, {
            message: "Opening browser to sign in with your Claude account\u2026",
          });
        $[1] = showPastePrompt;
        $[2] = statusLine;
      } else statusLine = $[2];
      let footer;
      if (
        $[3] !== cursorOffset ||
        $[4] !== showCursor ||
        $[5] !== oauthStatus.url ||
        $[6] !== onSubmitCode ||
        $[7] !== pastedCode ||
        $[8] !== setCursorOffset ||
        $[9] !== setPastedCode ||
        $[10] !== showPastePrompt ||
        $[11] !== textInputColumns
      ) {
        footer =
          showPastePrompt &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                children: PASTE_HERE_MSG_2,
              }),
              jsxProd_default(TextInput, {
                value: pastedCode,
                onChange: setPastedCode,
                onSubmit: (code) => onSubmitCode(code, oauthStatus.url),
                cursorOffset,
                onChangeCursorOffset: setCursorOffset,
                columns: textInputColumns,
                focus: true,
                showCursor,
              }),
            ],
          });
        $[3] = cursorOffset;
        $[4] = showCursor;
        $[5] = oauthStatus.url;
        $[6] = onSubmitCode;
        $[7] = pastedCode;
        $[8] = setCursorOffset;
        $[9] = setPastedCode;
        $[10] = showPastePrompt;
        $[11] = textInputColumns;
        $[12] = footer;
      } else footer = $[12];
      let hint;
      if ($[13] !== statusLine || $[14] !== footer) {
        hint = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [statusLine, footer],
        });
        $[13] = statusLine;
        $[14] = footer;
        $[15] = hint;
      } else hint = $[15];
      return hint;
    }
    case "processing": {
      let altHint;
      if ($[16] === MEMO_CACHE_SENTINEL) {
        altHint = jsxProd_default(WorkerBadge, {
          message: "Processing authentication\u2026",
        });
        $[16] = altHint;
      } else altHint = $[16];
      return altHint;
    }
    case "success": {
      let errorLine;
      if ($[17] === MEMO_CACHE_SENTINEL) {
        errorLine = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default(Text, {
              color: "success",
              children: "\u2713 Authentication token created successfully!",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Using token for GitHub Actions setup\u2026",
            }),
          ],
        });
        $[17] = errorLine;
      } else errorLine = $[17];
      return errorLine;
    }
    case "error": {
      const children = oauthStatus.verbatim ? oauthStatus.message : `OAuth error: ${oauthStatus.message}`;
      let helpBox;
      if ($[18] !== children) {
        helpBox = jsxProd_default(Text, {
          color: "error",
          children,
        });
        $[18] = children;
        $[19] = helpBox;
      } else helpBox = $[19];
      let retryHint;
      if ($[20] !== oauthStatus.toRetry) {
        retryHint = oauthStatus.toRetry
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "Press Enter to try again, or any other key to cancel",
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children: "Press any key to return to API key selection",
            });
        $[20] = oauthStatus.toRetry;
        $[21] = retryHint;
      } else retryHint = $[21];
      let header;
      if ($[22] !== helpBox || $[23] !== retryHint) {
        header = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [helpBox, retryHint],
        });
        $[22] = helpBox;
        $[23] = retryHint;
        $[24] = header;
      } else header = $[24];
      return header;
    }
    case "about_to_retry": {
      let footer;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        footer = jsxProd_default(Box, {
          flexDirection: "column",
          gap: 1,
          children: jsxProd_default(Text, {
            color: "permission",
            children: "Retrying\u2026",
          }),
        });
        $[25] = footer;
      } else footer = $[25];
      return footer;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-4v9zy7gn.js:39822-40689 placement
function OptionalActionsSetupStep(props) {
  let $ = useMemoCache(8);
  let { onSelect, onCancel } = props;
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = [
      {
        label: "Set up GitHub Actions workflows",
        value: "setup",
      },
      {
        label: "Skip for now (you can run /install-github-app again later)",
        value: "skip",
      },
    ];
    $[0] = content;
  } else content = $[0];
  let options = content;
  let onDone;
  if ($[1] !== onSelect) {
    onDone = (value) => {
      onSelect(value);
    };
    $[1] = onSelect;
    $[2] = onDone;
  } else onDone = $[2];
  let onChange = onDone;
  let title;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    title = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "GitHub App installed!",
      }),
    });
    $[3] = title;
  } else title = $[3];
  let description;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    description = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children:
          "The Claude GitHub App is now installed. You can optionally set up GitHub Actions workflows so Claude responds to @claude mentions in issues and PRs.",
      }),
    });
    $[4] = description;
  } else description = $[4];
  let footer;
  if ($[5] !== onChange || $[6] !== onCancel) {
    footer = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        title,
        description,
        jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default(ModelSelector, {
            options,
            onChange,
            onCancel,
          }),
        }),
      ],
    });
    $[5] = onChange;
    $[6] = onCancel;
    $[7] = footer;
  } else footer = $[7];
  return footer;
}
export { OAuthStatusPanel, OptionalActionsSetupStep };
