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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let _ = w(26);
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
      let k;
      if (_[0] === MEMO_CACHE_SENTINEL) {
        k = jsxProd_default(WorkerBadge, {
          message: "Starting authentication\u2026",
        });
        _[0] = k;
      } else k = _[0];
      return k;
    }
    case "waiting_for_login": {
      let k;
      if (_[1] !== showPastePrompt) {
        k =
          !showPastePrompt &&
          jsxProd_default(WorkerBadge, {
            message: "Opening browser to sign in with your Claude account\u2026",
          });
        _[1] = showPastePrompt;
        _[2] = k;
      } else k = _[2];
      let E;
      if (
        _[3] !== cursorOffset ||
        _[4] !== showCursor ||
        _[5] !== oauthStatus.url ||
        _[6] !== onSubmitCode ||
        _[7] !== pastedCode ||
        _[8] !== setCursorOffset ||
        _[9] !== setPastedCode ||
        _[10] !== showPastePrompt ||
        _[11] !== textInputColumns
      ) {
        E =
          showPastePrompt &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                children: PASTE_HERE_MSG_2,
              }),
              jsxProd_default(TextInput, {
                value: pastedCode,
                onChange: setPastedCode,
                onSubmit: (x) => onSubmitCode(x, oauthStatus.url),
                cursorOffset,
                onChangeCursorOffset: setCursorOffset,
                columns: textInputColumns,
                focus: true,
                showCursor,
              }),
            ],
          });
        _[3] = cursorOffset;
        _[4] = showCursor;
        _[5] = oauthStatus.url;
        _[6] = onSubmitCode;
        _[7] = pastedCode;
        _[8] = setCursorOffset;
        _[9] = setPastedCode;
        _[10] = showPastePrompt;
        _[11] = textInputColumns;
        _[12] = E;
      } else E = _[12];
      let T;
      if (_[13] !== k || _[14] !== E) {
        T = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [k, E],
        });
        _[13] = k;
        _[14] = E;
        _[15] = T;
      } else T = _[15];
      return T;
    }
    case "processing": {
      let k;
      if (_[16] === MEMO_CACHE_SENTINEL) {
        k = jsxProd_default(WorkerBadge, {
          message: "Processing authentication\u2026",
        });
        _[16] = k;
      } else k = _[16];
      return k;
    }
    case "success": {
      let k;
      if (_[17] === MEMO_CACHE_SENTINEL) {
        k = jsxProd_default_2(Box, {
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
        _[17] = k;
      } else k = _[17];
      return k;
    }
    case "error": {
      const children = oauthStatus.verbatim ? oauthStatus.message : `OAuth error: ${oauthStatus.message}`;
      let E;
      if (_[18] !== children) {
        E = jsxProd_default(Text, {
          color: "error",
          children,
        });
        _[18] = children;
        _[19] = E;
      } else E = _[19];
      let T;
      if (_[20] !== oauthStatus.toRetry) {
        T = oauthStatus.toRetry
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "Press Enter to try again, or any other key to cancel",
            })
          : jsxProd_default(Text, {
              dimColor: true,
              children: "Press any key to return to API key selection",
            });
        _[20] = oauthStatus.toRetry;
        _[21] = T;
      } else T = _[21];
      let W;
      if (_[22] !== E || _[23] !== T) {
        W = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [E, T],
        });
        _[22] = E;
        _[23] = T;
        _[24] = W;
      } else W = _[24];
      return W;
    }
    case "about_to_retry": {
      let k;
      if (_[25] === MEMO_CACHE_SENTINEL) {
        k = jsxProd_default(Box, {
          flexDirection: "column",
          gap: 1,
          children: jsxProd_default(Text, {
            color: "permission",
            children: "Retrying\u2026",
          }),
        });
        _[25] = k;
      } else k = _[25];
      return k;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-4v9zy7gn.js:39822-40689 placement
function OptionalActionsSetupStep(props) {
  let f = w(8);
  let { onSelect, onCancel } = props;
  let C;
  if (f[0] === MEMO_CACHE_SENTINEL) {
    C = [
      {
        label: "Set up GitHub Actions workflows",
        value: "setup",
      },
      {
        label: "Skip for now (you can run /install-github-app again later)",
        value: "skip",
      },
    ];
    f[0] = C;
  } else C = f[0];
  let options = C;
  let o;
  if (f[1] !== onSelect) {
    o = (v) => {
      onSelect(v);
    };
    f[1] = onSelect;
    f[2] = o;
  } else o = f[2];
  let onChange = o;
  let g;
  if (f[3] === MEMO_CACHE_SENTINEL) {
    g = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "GitHub App installed!",
      }),
    });
    f[3] = g;
  } else g = f[3];
  let _;
  if (f[4] === MEMO_CACHE_SENTINEL) {
    _ = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children:
          "The Claude GitHub App is now installed. You can optionally set up GitHub Actions workflows so Claude responds to @claude mentions in issues and PRs.",
      }),
    });
    f[4] = _;
  } else _ = f[4];
  let k;
  if (f[5] !== onChange || f[6] !== onCancel) {
    k = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        g,
        _,
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
    f[5] = onChange;
    f[6] = onCancel;
    f[7] = k;
  } else k = f[7];
  return k;
}
export { OAuthStatusPanel, OptionalActionsSetupStep };
