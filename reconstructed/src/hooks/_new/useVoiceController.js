/**
 * hooks/_new/useVoiceController.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a658aeqp.js (3)
 * attribution: sole-consumer-new 3
 */
import { basename } from "path";
import { GLOBAL_KEYTERMS, splitIdentifier, fileNameWords } from "../../services/voiceKeyterms.js";
import { getProjectRoot } from "../../bootstrap/state.js";
import { getBranch } from "../../utils/git.js";
import { useHost } from "../../context/session.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useVoiceStateStore } from "../../context/voice.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { useVoice } from "../useVoice.js";
import {
  connectVoiceStream,
  isVoiceStreamAvailable,
  probeVoiceConnectivity,
} from "../../services/voiceStreamSTT.js";
import { useStoreSelector } from "../useStoreSelector.js";

//@ chunk-a658aeqp.js:18925-18934 sole-consumer-new
var I = 50;
/**
 * 构造语音转写关键词：全局词表 + 项目目录名 + 当前分支名拆出的词 + 最近文件名中的词，最多 I 个。
 */
//@ chunk-a658aeqp.js:18934-19201 sole-consumer-new
async function getVoiceKeyterms(e) {
  let i = new Set(GLOBAL_KEYTERMS);
  try {
    let r = getProjectRoot();
    if (r) {
      let n = basename(r);
      if (n.length > 2 && n.length <= 50) i.add(n);
    }
  } catch {}
  try {
    let r = await getBranch();
    if (r) for (let n of splitIdentifier(r)) i.add(n);
  } catch {}
  if (e)
    for (let r of e) {
      if (i.size >= I) break;
      for (let n of fileNameWords(r)) i.add(n);
    }
  return [...i].slice(0, I);
}
/**
 * 语音输入控制钩子：创建语音控制器，处理转写结果、错误、启用状态与按住/切换模式。
 */
//@ chunk-a658aeqp.js:19201-19798 sole-consumer-new
function useVoiceController({
  onTranscript: onTranscript,
  onError: onError,
  enabled: enabled,
  focusMode: focusMode,
  mode: mode = "hold",
}) {
  let h = useHost(),
    { credentials: credentials } = Me(),
    V = useClock(),
    b = useVoiceStateStore(),
    k = useTerminalFocus(),
    C = {
      onTranscript: onTranscript,
      onError: onError,
      enabled: enabled,
      focusMode: focusMode,
      mode: mode,
      isFocused: k,
    },
    [v] = y(
      () =>
        new useVoice({
          host: h,
          clock: V,
          voiceStore: b,
          loadVoiceModule: () => import("./chunk-ga5txjrx.js"),
          connectVoiceStream: (F, d, S) => connectVoiceStream(F, d, S),
          credentials: credentials,
          isVoiceStreamAvailable: () => isVoiceStreamAvailable(),
          probeVoiceConnectivity: () => probeVoiceConnectivity(),
          getVoiceKeyterms: () => getVoiceKeyterms(),
          inputs: C,
        }),
    );
  (P(() => {
    v.setInputs(C);
  }),
    P(() => v.dispose, [v]));
  let { state: state } = useStoreSelector(v);
  return { state: state, handleKeyEvent: v.handleKeyEvent, cancelRecording: v.cancelRecording };
}

export { I, getVoiceKeyterms };
