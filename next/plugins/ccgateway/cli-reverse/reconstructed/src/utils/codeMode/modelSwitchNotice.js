/**
 * utils/codeMode/modelSwitchNotice.ts
 *
 * 主模型切换时提示“Code 模式在该模型上未测试”（resume 时不提示）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qhxw5yav.js (2)
 * attribution: placement 2
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { createSignal } from "../signal.js";
import { isOn } from "./accepted.js";
import { isEvaluatedModel } from "../codeModeOptIn.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { CODE_MODE_LABEL } from "../../constants/codeMode.js";

//@ chunk-qhxw5yav.js:13372-13395 placement
/**
 * Code 模式在各宿主上的模型提示存储。
 */
var modelNoticeSlot = new SessionRootSlot(() => createSignal());
//@ chunk-qhxw5yav.js:13395-13526 placement
/**
 * 主模型切换后提示“Code 模式在该模型上未测试”（resume 时不提示）。
 */
function noteCodeModeModel(sessionId, model, origin) {
  if (origin !== "resume" && isOn())
    modelNoticeSlot
      .of(sessionId)
      .emit(
        isEvaluatedModel(parseUserSpecifiedModel(model))
          ? null
          : `${CODE_MODE_LABEL} isn't tested on this model \xB7 Run /model to switch`,
      );
}
export { modelNoticeSlot, noteCodeModeModel };
