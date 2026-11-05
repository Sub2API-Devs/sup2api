/**
 * utils/sessionModelPin.ts
 *
 * 2.1.316 新增：会话模型固定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h13zwtby.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./codeMode/accepted.js";
import { assertResumeNotRefused } from "./transcript/deserialize.js";

//@ chunk-h13zwtby.js:267-438 placement
/**
 * noModelPin：不改变模型的占位结果。
 */
function noModelPin(context, model) {
  if (codeModeAccepted() || context.replMode === true || context.sdkUrlWorker === true) {
    let codeModeModule = require("./codeMode/applyCodeModePlan.lazy.js");
    return codeModeModule.planCodeModeFromSession(context, model);
  }
  return {
    pin: undefined,
    switched: false,
  };
}
//@ chunk-h13zwtby.js:438-559 placement
/**
 * noopModelPinSubscriber：空实现的模型固定订阅者。
 */
function noopModelPinSubscriber(a) {
  return (b, c) => {
    if (!codeModeAccepted() && b.replMode === true)
      assertResumeNotRefused(
        noModelPin(
          {
            replMode: true,
            messages: [],
            source: a,
            sessionId: c,
          },
          () => {},
        ),
      );
  };
}
//@ chunk-h13zwtby.js:559-652 placement
/**
 * recordModelPinSwitch：记录模型固定切换。
 */
function recordModelPinSwitch(pin) {
  assertResumeNotRefused(pin);
  if (codeModeAccepted()) {
    let codeModeModule = require("./codeMode/applyCodeModePlan.lazy.js");
    codeModeModule.applyCodeModePlan(pin);
  }
}
//@ chunk-h13zwtby.js:652-701 placement
/**
 * switchSessionModelPin：切换会话的模型固定。
 */
function switchSessionModelPin(context, model) {
  let pin = noModelPin(context, model);
  recordModelPinSwitch(pin);
  return pin;
}
//@ chunk-h13zwtby.js:701-786 placement
/**
 * noopModelPinReset：空实现的模型固定重置。
 */
function noopModelPinReset(force = false) {
  if (codeModeAccepted()) {
    let codeModeModule = require("./codeMode/applyCodeModePlan.lazy.js");
    codeModeModule.recordCodeMode(force);
  }
}
export { noopModelPinReset, switchSessionModelPin, noopModelPinSubscriber, noModelPin, recordModelPinSwitch };
