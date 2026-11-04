/**
 * components/ApproveApiKey.tsx
 *
 * 检测到环境变量 ANTHROPIC_API_KEY 时询问是否使用（显示 sk-ant-… 截断），结果写入配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ApproveApiKey.tsx
 * pieces: chunk-7hdssadt.js (1)
 * attribution: facade-exports 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useIsFullPageNotice, NoticeAccent } from "./design-system/NoticeUnderScene.js";
import { saveGlobalConfig, customApiKeyResponsesOf } from "../utils/config.js";
import { emitCredentialChange } from "../utils/auth/credentialEpoch.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-7hdssadt.js:493-1880 facade-exports (2.1.88 match: ApproveApiKey, 0.444)
/**
 * 询问是否使用环境中的 ANTHROPIC_API_KEY（推荐否时使用订阅登录），结果记入配置的已批准/已拒绝列表。
 */
function ApproveApiKey(props) {
  let $ = useMemoCache(20);
  let { customApiKeyTruncated, onDone } = props;
  let { storageV5 } = useTheme_2();
  let paddingLeft = useIsFullPageNotice() ? 2 : 0;
  let t1;
  if ($[0] !== customApiKeyTruncated || $[1] !== onDone || $[2] !== storageV5) {
    t1 = function onChange(value) {
      G: switch (value) {
        case "yes": {
          saveGlobalConfig((current) => {
            let { approved, rejected } = customApiKeyResponsesOf(current);
            return {
              ...current,
              customApiKeyResponses: {
                approved: [...approved, customApiKeyTruncated],
                rejected,
              },
            };
          }, storageV5);
          emitCredentialChange();
          onDone(true);
          break G;
        }
        case "no": {
          saveGlobalConfig((current) => {
            let { approved, rejected } = customApiKeyResponsesOf(current);
            return {
              ...current,
              customApiKeyResponses: {
                approved,
                rejected: [...rejected, customApiKeyTruncated],
              },
            };
          }, storageV5);
          onDone(false);
        }
      }
    };
    $[0] = customApiKeyTruncated;
    $[1] = onDone;
    $[2] = storageV5;
    $[3] = t1;
  } else t1 = $[3];
  let onChange = t1;
  let onCancel;
  if ($[4] !== onChange) {
    onCancel = () => onChange("no");
    $[4] = onChange;
    $[5] = onCancel;
  } else onCancel = $[5];
  let t3;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(NoticeAccent, {
      bold: true,
      children: "ANTHROPIC_API_KEY",
    });
    $[6] = t3;
  } else t3 = $[6];
  let children;
  if ($[7] !== customApiKeyTruncated) {
    children = jsxProd_default_2(Text, {
      children: [
        t3,
        jsxProd_default_2(Text, {
          children: [": sk-ant-...", customApiKeyTruncated],
        }),
      ],
    });
    $[7] = customApiKeyTruncated;
    $[8] = children;
  } else children = $[8];
  let bodyElement;
  if ($[9] !== paddingLeft || $[10] !== children) {
    bodyElement = jsxProd_default(Box, {
      paddingLeft,
      children,
    });
    $[9] = paddingLeft;
    $[10] = children;
    $[11] = bodyElement;
  } else bodyElement = $[11];
  let questionElement;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    questionElement = jsxProd_default(Text, {
      children: "Do you want to use this API key?",
    });
    $[12] = questionElement;
  } else questionElement = $[12];
  let cancelLabel;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    cancelLabel = jsxProd_default_2(Text, {
      children: [
        "No (",
        jsxProd_default(NoticeAccent, {
          bold: true,
          children: "recommended",
        }),
        ")",
      ],
    });
    $[13] = cancelLabel;
  } else cancelLabel = $[13];
  let t8;
  if ($[14] !== onChange) {
    t8 = jsxProd_default(ConfirmSelect, {
      hideIndexes: true,
      focus: "cancel",
      cancelLabel,
      onConfirm: () => onChange("yes"),
      onCancel: () => onChange("no"),
    });
    $[14] = onChange;
    $[15] = t8;
  } else t8 = $[15];
  let t9;
  if ($[16] !== onCancel || $[17] !== bodyElement || $[18] !== t8) {
    t9 = jsxProd_default_2(Dialog, {
      title: "Detected a custom API key in your environment",
      color: "warning",
      onCancel,
      exitOnCtrlCD: true,
      children: [bodyElement, questionElement, t8],
    });
    $[16] = onCancel;
    $[17] = bodyElement;
    $[18] = t8;
    $[19] = t9;
  } else t9 = $[19];
  return t9;
}
export { ApproveApiKey };
