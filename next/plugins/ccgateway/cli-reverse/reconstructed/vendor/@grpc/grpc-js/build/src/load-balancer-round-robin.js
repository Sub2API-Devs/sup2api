/**
 * @grpc/grpc-js/build/src/load-balancer-round-robin.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_picker } from "./picker.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_load_balancer_pick_first } from "./load-balancer-pick-first.js";

//@ chunk-3k21nfa0.js:356504-360044 cjs-fingerprint
var require_load_balancer_round_robin = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.RoundRobinLoadBalancer = undefined;
  cjsExports.setup = setup;
  var load_balancer_1 = require_load_balancer();
  var connectivity_state_1 = require_connectivity_state();
  var picker_1 = require_picker();
  var logging = require_logging();
  var constants_1 = require_constants();
  var subchannel_address_1 = require_subchannel_address();
  var load_balancer_pick_first_1 = require_load_balancer_pick_first();
  var TRACER_NAME = "round_robin";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var TYPE_NAME = "round_robin";
  class RoundRobinLoadBalancingConfig {
    getLoadBalancerName() {
      return TYPE_NAME;
    }
    constructor() {}
    toJsonObject() {
      return {
        [TYPE_NAME]: {},
      };
    }
    static createFromJson(obj) {
      return new RoundRobinLoadBalancingConfig();
    }
  }
  class RoundRobinPicker {
    constructor(children, nextIndex = 0) {
      this.children = children;
      this.nextIndex = nextIndex;
    }
    pick(pickArgs) {
      let childPicker = this.children[this.nextIndex].picker;
      this.nextIndex = (this.nextIndex + 1) % this.children.length;
      return childPicker.pick(pickArgs);
    }
    peekNextEndpoint() {
      return this.children[this.nextIndex].endpoint;
    }
  }
  function rotateArray(list, startIndex) {
    return [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }
  class RoundRobinLoadBalancer {
    constructor(channelControlHelper) {
      this.channelControlHelper = channelControlHelper;
      this.children = [];
      this.currentState = connectivity_state_1.ConnectivityState.IDLE;
      this.currentReadyPicker = null;
      this.updatesPaused = false;
      this.lastError = null;
      this.childChannelControlHelper = load_balancer_1.createChildChannelControlHelper(channelControlHelper, {
        updateState: (connectivityState, picker, errorMessage) => {
          if (
            this.currentState === connectivity_state_1.ConnectivityState.READY &&
            connectivityState !== connectivity_state_1.ConnectivityState.READY
          )
            this.channelControlHelper.requestReresolution();
          if (errorMessage) this.lastError = errorMessage;
          this.calculateAndUpdateState();
        },
      });
    }
    countChildrenWithState(state) {
      return this.children.filter((child) => child.getConnectivityState() === state).length;
    }
    calculateAndUpdateState() {
      if (this.updatesPaused) return;
      if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.READY) > 0) {
        let readyChildren = this.children.filter(
          (child) => child.getConnectivityState() === connectivity_state_1.ConnectivityState.READY,
        );
        let index = 0;
        if (this.currentReadyPicker !== null) {
          let nextPickedEndpoint = this.currentReadyPicker.peekNextEndpoint();
          index = readyChildren.findIndex((child) =>
            subchannel_address_1.endpointEqual(child.getEndpoint(), nextPickedEndpoint),
          );
          if (index < 0) index = 0;
        }
        this.updateState(
          connectivity_state_1.ConnectivityState.READY,
          new RoundRobinPicker(
            readyChildren.map((child) => ({
              endpoint: child.getEndpoint(),
              picker: child.getPicker(),
            })),
            index,
          ),
          null,
        );
      } else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.CONNECTING) > 0)
        this.updateState(
          connectivity_state_1.ConnectivityState.CONNECTING,
          new picker_1.QueuePicker(this),
          null,
        );
      else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) > 0) {
        let errorMessage = `round_robin: No connection established. Last error: ${this.lastError}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
      } else
        this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
      for (let child of this.children)
        if (child.getConnectivityState() === connectivity_state_1.ConnectivityState.IDLE) child.exitIdle();
    }
    updateState(newState, picker, errorMessage) {
      trace(
        connectivity_state_1.ConnectivityState[this.currentState] +
          " -> " +
          connectivity_state_1.ConnectivityState[newState],
      );
      if (newState === connectivity_state_1.ConnectivityState.READY) this.currentReadyPicker = picker;
      else this.currentReadyPicker = null;
      this.currentState = newState;
      this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    resetSubchannelList() {
      for (let child of this.children) child.destroy();
      this.children = [];
    }
    updateAddressList(maybeEndpointList, lbConfig, options, resolutionNote) {
      if (!(lbConfig instanceof RoundRobinLoadBalancingConfig)) return false;
      if (!maybeEndpointList.ok) {
        if (this.children.length === 0)
          this.updateState(
            connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
            new picker_1.UnavailablePicker(maybeEndpointList.error),
            maybeEndpointList.error.details,
          );
        return true;
      }
      let startIndex = (Math.random() * maybeEndpointList.value.length) | 0;
      let endpointList = rotateArray(maybeEndpointList.value, startIndex);
      this.resetSubchannelList();
      if (endpointList.length === 0) {
        let errorMessage = `No addresses resolved. Resolution note: ${resolutionNote}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
      }
      trace("Connect to endpoint list " + endpointList.map(subchannel_address_1.endpointToString));
      this.updatesPaused = true;
      this.children = endpointList.map(
        (endpoint) =>
          new load_balancer_pick_first_1.LeafLoadBalancer(
            endpoint,
            this.childChannelControlHelper,
            options,
            resolutionNote,
          ),
      );
      for (let child of this.children) child.startConnecting();
      this.updatesPaused = false;
      this.calculateAndUpdateState();
      return true;
    }
    exitIdle() {}
    resetBackoff() {}
    destroy() {
      this.resetSubchannelList();
    }
    getTypeName() {
      return TYPE_NAME;
    }
  }
  cjsExports.RoundRobinLoadBalancer = RoundRobinLoadBalancer;
  function setup() {
    load_balancer_1.registerLoadBalancerType(
      TYPE_NAME,
      RoundRobinLoadBalancer,
      RoundRobinLoadBalancingConfig,
    );
  }
});
export { require_load_balancer_round_robin };
