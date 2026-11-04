/**
 * human-signals/build/src/signals.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: human-signals@4.3.1..8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
import { constants } from "os";
import { getRealtimeSignals } from "./realtime.js";
import { signals } from "./core.js";

//@ chunk-m4p5zn6n.js:13732-13975 esm-layout
var getSignals = () => {
  let realtimeSignals = getRealtimeSignals();
  return [...signals, ...realtimeSignals].map(normalizeSignal);
};
var normalizeSignal = ({ name, number, description, action, forced = false, standard }) => {
  let {
    signals: { [name]: constantSignal },
  } = constants;
  let supported = constantSignal !== undefined;
  return {
    name,
    number: supported ? constantSignal : number,
    description,
    supported,
    action,
    forced,
    standard,
  };
};
export { getSignals };
