/**
 * utils/sessionModelPin.ts
 *
 * 2.1.316 新增：会话模型固定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0h6s23my.js (6)
 * attribution: placement 6
 */
import { assertResumeNotRefused } from "./transcript/deserialize.js";

//@ chunk-0h6s23my.js:228-277 placement
/**
 * noModelPin：不改变模型的占位结果。
 */
function noModelPin(e, o) {
  return {
    pin: undefined,
    switched: false,
  };
}
//@ chunk-0h6s23my.js:277-309 placement
/**
 * noopModelPinSubscriber：空实现的模型固定订阅者。
 */
function noopModelPinSubscriber(e) {
  return (o, s) => {};
}
//@ chunk-0h6s23my.js:309-332 placement
/**
 * recordModelPinSwitch：记录模型固定切换。
 */
function recordModelPinSwitch(e) {
  assertResumeNotRefused(e);
}
//@ chunk-0h6s23my.js:332-381 placement
/**
 * switchSessionModelPin：切换会话的模型固定。
 */
function switchSessionModelPin(e, o) {
  let s = noModelPin(e, o);
  recordModelPinSwitch(s);
  return s;
}
//@ chunk-0h6s23my.js:381-401 placement
/**
 * noopModelPinReset：空实现的模型固定重置。
 */
function noopModelPinReset(e = false) {}
//@ chunk-0h6s23my.js:401-430 placement
/**
 * modelPinStorageKind：模型固定的存储种类（file）。
 */
function modelPinStorageKind(resume) {
  return "file";
}
export {
  switchSessionModelPin,
  noopModelPinReset,
  noopModelPinSubscriber,
  modelPinStorageKind,
  noModelPin,
  recordModelPinSwitch,
};
