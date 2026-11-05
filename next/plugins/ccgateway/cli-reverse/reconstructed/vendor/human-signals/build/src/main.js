/**
 * human-signals/build/src/main.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: human-signals@4.3.1..8.0.1
 * pieces: chunk-t889g22j.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "os";
import { getSignals } from "./signals.js";
import { REALTIME_SIGNAL_MAX } from "./realtime.js";

//@ chunk-t889g22j.js:13974-14619 esm-fingerprint
var getSignalsByName = () => {
  let signals = getSignals();
  return Object.fromEntries(signals.map(getSignalByName));
};
var getSignalByName = ({ name, number, description, supported, action, forced, standard }) => [
  name,
  {
    name,
    number,
    description,
    supported,
    action,
    forced,
    standard,
  },
];
var signalsByName = getSignalsByName();
var getSignalsByNumber = () => {
  let signals = getSignals();
  let length = REALTIME_SIGNAL_MAX + 1;
  let signalsA = Array.from(
    {
      length,
    },
    (value, number) => getSignalByNumber(number, signals),
  );
  return Object.assign({}, ...signalsA);
};
var getSignalByNumber = (number, signals) => {
  let signal = findSignalByNumber(number, signals);
  if (signal === undefined) return {};
  let { name, description, supported, action, forced, standard } = signal;
  return {
    [number]: {
      name,
      number,
      description,
      supported,
      action,
      forced,
      standard,
    },
  };
};
var findSignalByNumber = (number, signals) => {
  let signal = signals.find(({ name }) => constants.signals[name] === number);
  if (signal !== undefined) return signal;
  return signals.find((signalA) => signalA.number === number);
};
var signalsByNumber = getSignalsByNumber();
export { signalsByName };
