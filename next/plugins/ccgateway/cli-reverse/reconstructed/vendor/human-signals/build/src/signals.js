/**
 * human-signals/build/src/signals.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: human-signals@4.3.1..8.0.1
 * pieces: chunk-t889g22j.js (1)
 * attribution: esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "os";
import { getRealtimeSignals } from "./realtime.js";
import { signals } from "./core.js";

//@ chunk-t889g22j.js:13731-13974 esm-layout
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
