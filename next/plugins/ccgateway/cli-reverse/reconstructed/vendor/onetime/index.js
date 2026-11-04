/**
 * onetime/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: onetime@7.0.0
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { mimicFunction } from "../mimic-function/index.js";

//@ chunk-m4p5zn6n.js:9126-9455 esm-layout
var calledFunctions = new WeakMap();
var onetime = (function_, options = {}) => {
  if (typeof function_ !== "function") throw TypeError("Expected a function");
  let returnValue;
  let callCount = 0;
  let functionName = function_.displayName || function_.name || "<anonymous>";
  let onetime = function (...arguments_) {
    calledFunctions.set(onetime, ++callCount);
    if (callCount === 1) {
      returnValue = function_.apply(this, arguments_);
      function_ = null;
    } else if (options.throw === true) throw Error(`Function \`${functionName}\` can only be called once`);
    return returnValue;
  };
  mimicFunction(onetime, function_);
  calledFunctions.set(onetime, callCount);
  return onetime;
};
//@ chunk-m4p5zn6n.js:9455-9596 esm-fingerprint
onetime.callCount = (function_) => {
  if (!calledFunctions.has(function_))
    throw Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
  return calledFunctions.get(function_);
};
export { onetime };
