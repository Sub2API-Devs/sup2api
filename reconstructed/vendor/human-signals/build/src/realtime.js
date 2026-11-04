/**
 * human-signals/build/src/realtime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: human-signals@4.3.1..8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 2
 */
import { onetime } from "../../../onetime/index.js";

//@ chunk-m4p5zn6n.js:9596-9606 esm-layout
var onetime_default = onetime;
//@ chunk-m4p5zn6n.js:9662-9868 esm-layout
var getRealtimeSignals = () => {
  let length = REALTIME_SIGNAL_MAX - REALTIME_SIGNAL_MIN + 1;
  return Array.from(
    {
      length,
    },
    getRealtimeSignal,
  );
};
var getRealtimeSignal = (value, index) => ({
  name: `SIGRT${index + 1}`,
  number: REALTIME_SIGNAL_MIN + index,
  action: "terminate",
  description: "Application-specific signal (realtime)",
  standard: "posix",
});
var REALTIME_SIGNAL_MIN = 34;
var REALTIME_SIGNAL_MAX = 64;
export { onetime_default, getRealtimeSignals, REALTIME_SIGNAL_MAX };
