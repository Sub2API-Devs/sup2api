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
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useIsFullPageNotice, NoticeAccent } from "./design-system/NoticeUnderScene.js";
import { saveGlobalConfig, customApiKeyResponsesOf } from "../utils/config.js";
import { emitCredentialChange } from "../utils/auth/credentialEpoch.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

/**
 * 询问是否使用环境中的 ANTHROPIC_API_KEY（推荐否时使用订阅登录），结果记入配置的已批准/已拒绝列表。
 */
//@ chunk-7hdssadt.js:493-1880 facade-exports = ApproveApiKey (0.444)
function ApproveApiKey(t0) {
  let $ = w(20),
    { customApiKeyTruncated: customApiKeyTruncated, onDone: onDone } = t0,
    { storageV5: storageV5 } = Me(),
    y = useIsFullPageNotice() ? 2 : 0,
    C;
  if ($[0] !== customApiKeyTruncated || $[1] !== onDone || $[2] !== storageV5)
    ((C = function t(value) {
      G: switch (value) {
        case "yes": {
          (saveGlobalConfig((current_0) => {
            let { approved: approved, rejected: rejected } = customApiKeyResponsesOf(current_0);
            return {
              ...current_0,
              customApiKeyResponses: { approved: [...approved, customApiKeyTruncated], rejected: rejected },
            };
          }, storageV5),
            emitCredentialChange(),
            onDone(!0));
          break G;
        }
        case "no": {
          (saveGlobalConfig((current) => {
            let { approved: approved, rejected: rejected } = customApiKeyResponsesOf(current);
            return {
              ...current,
              customApiKeyResponses: { approved: approved, rejected: [...rejected, customApiKeyTruncated] },
            };
          }, storageV5),
            onDone(!1));
        }
      }
    }),
      ($[0] = customApiKeyTruncated),
      ($[1] = onDone),
      ($[2] = storageV5),
      ($[3] = C));
  else C = $[3];
  let onChange = C,
    i;
  if ($[4] !== onChange) ((i = () => onChange("no")), ($[4] = onChange), ($[5] = i));
  else i = $[5];
  let I;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((I = e(NoticeAccent, { bold: !0, children: "ANTHROPIC_API_KEY" })), ($[6] = I));
  else I = $[6];
  let u;
  if ($[7] !== customApiKeyTruncated)
    ((u = r(Text, { children: [I, r(Text, { children: [": sk-ant-...", customApiKeyTruncated] })] })),
      ($[7] = customApiKeyTruncated),
      ($[8] = u));
  else u = $[8];
  let p;
  if ($[9] !== y || $[10] !== u)
    ((p = e(Box, { paddingLeft: y, children: u })), ($[9] = y), ($[10] = u), ($[11] = p));
  else p = $[11];
  let P;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((P = e(Text, { children: "Do you want to use this API key?" })), ($[12] = P));
  else P = $[12];
  let T;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((T = r(Text, { children: ["No (", e(NoticeAccent, { bold: !0, children: "recommended" }), ")"] })),
      ($[13] = T));
  else T = $[13];
  let m;
  if ($[14] !== onChange)
    ((m = e(ConfirmSelect, {
      hideIndexes: !0,
      focus: "cancel",
      cancelLabel: T,
      onConfirm: () => onChange("yes"),
      onCancel: () => onChange("no"),
    })),
      ($[14] = onChange),
      ($[15] = m));
  else m = $[15];
  let k;
  if ($[16] !== i || $[17] !== p || $[18] !== m)
    ((k = r(Dialog, {
      title: "Detected a custom API key in your environment",
      color: "warning",
      onCancel: i,
      exitOnCtrlCD: !0,
      children: [p, P, m],
    })),
      ($[16] = i),
      ($[17] = p),
      ($[18] = m),
      ($[19] = k));
  else k = $[19];
  return k;
}

export { ApproveApiKey };
