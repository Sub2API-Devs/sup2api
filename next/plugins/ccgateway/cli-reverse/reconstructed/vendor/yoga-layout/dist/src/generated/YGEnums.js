/**
 * yoga-layout/dist/src/generated/YGEnums.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: yoga-layout@3.2.1
 * pieces: chunk-bzr73sfg.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 */
import { init_react_production } from "../../../../react/cjs/react.production.js";

//@ chunk-bzr73sfg.js:145459-145463 esm-layout
init_react_production();
//@ chunk-bzr73sfg.js:145463-145488 esm-layout
var concurrentRoot = 1;
var continuousEventPriority = 8;
var defaultEventPriority = 32;
var discreteEventPriority = 2;
//@ chunk-bzr73sfg.js:145488-145497 esm-layout
var noEventPriority = 0;
//@ chunk-bzr73sfg.js:145497-145505 esm-layout
/**
 * yoga 边枚举：Left/Top/Right/Bottom/Start/End/Horizontal/Vertical/All（0–8）。
 */
var Edge;
//@ chunk-bzr73sfg.js:145505-145717 esm-fingerprint
((Edge) => {
  Edge[(Edge.Left = 0)] = "Left";
  Edge[(Edge.Top = 1)] = "Top";
  Edge[(Edge.Right = 2)] = "Right";
  Edge[(Edge.Bottom = 3)] = "Bottom";
  Edge[(Edge.Start = 4)] = "Start";
  Edge[(Edge.End = 5)] = "End";
  Edge[(Edge.Horizontal = 6)] = "Horizontal";
  Edge[(Edge.Vertical = 7)] = "Vertical";
  Edge[(Edge.All = 8)] = "All";
})((Edge ||= {}));
export {
  discreteEventPriority,
  continuousEventPriority,
  defaultEventPriority,
  noEventPriority,
  concurrentRoot,
};
