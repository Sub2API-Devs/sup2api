/**
 * @grpc/grpc-js/build/src/load-balancer-pick-first.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_picker } from "./picker.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";
import { require_call_interface } from "./call-interface.js";

//@ chunk-3k21nfa0.js:337190-346338 cjs-fingerprint
var require_load_balancer_pick_first = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LeafLoadBalancer =
    cjsExports.PickFirstLoadBalancer =
    cjsExports.PickFirstLoadBalancingConfig =
      undefined;
  cjsExports.shuffled = shuffled;
  cjsExports.setup = setup;
  var load_balancer_1 = require_load_balancer();
  var connectivity_state_1 = require_connectivity_state();
  var picker_1 = require_picker();
  var subchannel_address_1 = require_subchannel_address();
  var logging = require_logging();
  var constants_1 = require_constants();
  var subchannel_address_2 = require_subchannel_address();
  var net_1 = importMetaRequire("net");
  var call_interface_1 = require_call_interface();
  var TRACER_NAME = "pick_first";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var TYPE_NAME = "pick_first";
  var CONNECTION_DELAY_INTERVAL_MS = 250;
  class PickFirstLoadBalancingConfig {
    constructor(shuffleAddressList) {
      this.shuffleAddressList = shuffleAddressList;
    }
    getLoadBalancerName() {
      return TYPE_NAME;
    }
    toJsonObject() {
      return {
        [TYPE_NAME]: {
          shuffleAddressList: this.shuffleAddressList,
        },
      };
    }
    getShuffleAddressList() {
      return this.shuffleAddressList;
    }
    static createFromJson(obj) {
      if ("shuffleAddressList" in obj && typeof obj.shuffleAddressList !== "boolean")
        throw Error("pick_first config field shuffleAddressList must be a boolean if provided");
      return new PickFirstLoadBalancingConfig(obj.shuffleAddressList === true);
    }
  }
  cjsExports.PickFirstLoadBalancingConfig = PickFirstLoadBalancingConfig;
  class PickFirstPicker {
    constructor(subchannel) {
      this.subchannel = subchannel;
    }
    pick(pickArgs) {
      return {
        pickResultType: picker_1.PickResultType.COMPLETE,
        subchannel: this.subchannel,
        status: null,
        onCallStarted: null,
        onCallEnded: null,
      };
    }
  }
  function shuffled(list) {
    let result = list.slice();
    for (let i_2 = result.length - 1; i_2 > 1; i_2--) {
      let j = Math.floor(Math.random() * (i_2 + 1));
      let temp = result[i_2];
      result[i_2] = result[j];
      result[j] = temp;
    }
    return result;
  }
  function interleaveAddressFamilies(addressList) {
    if (addressList.length === 0) return [];
    let result = [];
    let ipv6Addresses = [];
    let ipv4Addresses = [];
    let ipv6First =
      subchannel_address_2.isTcpSubchannelAddress(addressList[0]) && net_1.isIPv6(addressList[0].host);
    for (let address of addressList)
      if (subchannel_address_2.isTcpSubchannelAddress(address) && net_1.isIPv6(address.host))
        ipv6Addresses.push(address);
      else ipv4Addresses.push(address);
    let firstList = ipv6First ? ipv6Addresses : ipv4Addresses;
    let secondList = ipv6First ? ipv4Addresses : ipv6Addresses;
    for (let i = 0; i < Math.max(firstList.length, secondList.length); i++) {
      if (i < firstList.length) result.push(firstList[i]);
      if (i < secondList.length) result.push(secondList[i]);
    }
    return result;
  }
  var REPORT_HEALTH_STATUS_OPTION_NAME = "grpc-node.internal.pick-first.report_health_status";
  class PickFirstLoadBalancer {
    constructor(channelControlHelper) {
      this.channelControlHelper = channelControlHelper;
      this.children = [];
      this.currentState = connectivity_state_1.ConnectivityState.IDLE;
      this.currentSubchannelIndex = 0;
      this.currentPick = null;
      this.subchannelStateListener = (subchannel, previousState, newState, keepaliveTime, errorMessage) => {
        this.onSubchannelStateUpdate(subchannel, previousState, newState, errorMessage);
      };
      this.pickedSubchannelHealthListener = () => this.calculateAndReportNewState();
      this.stickyTransientFailureMode = false;
      this.reportHealthStatus = false;
      this.lastError = null;
      this.latestAddressList = null;
      this.latestOptions = {};
      this.latestResolutionNote = "";
      this.connectionDelayTimeout = setTimeout(() => {}, 0);
      clearTimeout(this.connectionDelayTimeout);
    }
    allChildrenHaveReportedTF() {
      return this.children.every((child) => child.hasReportedTransientFailure);
    }
    resetChildrenReportedTF() {
      this.children.every((child) => (child.hasReportedTransientFailure = false));
    }
    calculateAndReportNewState() {
      var _a;
      if (this.currentPick) {
        if (this.reportHealthStatus && !this.currentPick.isHealthy()) {
          let errorMessage = `Picked subchannel ${this.currentPick.getAddress()} is unhealthy`;
          this.updateState(
            connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
            new picker_1.UnavailablePicker({
              details: errorMessage,
            }),
            errorMessage,
          );
        } else
          this.updateState(
            connectivity_state_1.ConnectivityState.READY,
            new PickFirstPicker(this.currentPick),
            null,
          );
      } else if (((_a = this.latestAddressList) === null || _a === undefined ? undefined : _a.length) === 0) {
        let errorMessage = `No connection established. Last error: ${this.lastError}. Resolution note: ${this.latestResolutionNote}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
      } else if (this.children.length === 0)
        this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
      else if (this.stickyTransientFailureMode) {
        let errorMessage = `No connection established. Last error: ${this.lastError}. Resolution note: ${this.latestResolutionNote}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
      } else
        this.updateState(
          connectivity_state_1.ConnectivityState.CONNECTING,
          new picker_1.QueuePicker(this),
          null,
        );
    }
    requestReresolution() {
      this.channelControlHelper.requestReresolution();
    }
    maybeEnterStickyTransientFailureMode() {
      if (!this.allChildrenHaveReportedTF()) return;
      this.requestReresolution();
      this.resetChildrenReportedTF();
      if (this.stickyTransientFailureMode) {
        this.calculateAndReportNewState();
        return;
      }
      this.stickyTransientFailureMode = true;
      for (let { subchannel } of this.children) subchannel.startConnecting();
      this.calculateAndReportNewState();
    }
    removeCurrentPick() {
      if (this.currentPick !== null) {
        this.currentPick.removeConnectivityStateListener(this.subchannelStateListener);
        this.channelControlHelper.removeChannelzChild(this.currentPick.getChannelzRef());
        this.currentPick.removeHealthStateWatcher(this.pickedSubchannelHealthListener);
        this.currentPick.unref();
        this.currentPick = null;
      }
    }
    onSubchannelStateUpdate(subchannel, previousState, newState, errorMessage) {
      var _a;
      if (
        (_a = this.currentPick) === null || _a === undefined ? undefined : _a.realSubchannelEquals(subchannel)
      ) {
        if (newState !== connectivity_state_1.ConnectivityState.READY) {
          this.removeCurrentPick();
          this.calculateAndReportNewState();
        }
        return;
      }
      for (let [index, child] of this.children.entries())
        if (subchannel.realSubchannelEquals(child.subchannel)) {
          if (newState === connectivity_state_1.ConnectivityState.READY)
            this.pickSubchannel(child.subchannel);
          if (newState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) {
            child.hasReportedTransientFailure = true;
            if (errorMessage) this.lastError = errorMessage;
            this.maybeEnterStickyTransientFailureMode();
            if (index === this.currentSubchannelIndex) this.startNextSubchannelConnecting(index + 1);
          }
          child.subchannel.startConnecting();
          return;
        }
    }
    startNextSubchannelConnecting(startIndex) {
      clearTimeout(this.connectionDelayTimeout);
      for (let [index, child] of this.children.entries())
        if (index >= startIndex) {
          let subchannelState = child.subchannel.getConnectivityState();
          if (
            subchannelState === connectivity_state_1.ConnectivityState.IDLE ||
            subchannelState === connectivity_state_1.ConnectivityState.CONNECTING
          ) {
            this.startConnecting(index);
            return;
          }
        }
      this.maybeEnterStickyTransientFailureMode();
    }
    startConnecting(subchannelIndex) {
      var _a;
      var _b;
      clearTimeout(this.connectionDelayTimeout);
      this.currentSubchannelIndex = subchannelIndex;
      if (
        this.children[subchannelIndex].subchannel.getConnectivityState() ===
        connectivity_state_1.ConnectivityState.IDLE
      ) {
        trace(
          "Start connecting to subchannel with address " +
            this.children[subchannelIndex].subchannel.getAddress(),
        );
        process.nextTick(() => {
          var _a;
          if (!((_a = this.children[subchannelIndex]) === null || _a === undefined))
            _a.subchannel.startConnecting();
        });
      }
      this.connectionDelayTimeout = setTimeout(() => {
        this.startNextSubchannelConnecting(subchannelIndex + 1);
      }, CONNECTION_DELAY_INTERVAL_MS);
      if (!((_b = (_a = this.connectionDelayTimeout).unref) === null || _b === undefined)) _b.call(_a);
    }
    pickSubchannel(subchannel) {
      trace("Pick subchannel with address " + subchannel.getAddress());
      this.stickyTransientFailureMode = false;
      subchannel.ref();
      this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
      this.removeCurrentPick();
      this.resetSubchannelList();
      subchannel.addConnectivityStateListener(this.subchannelStateListener);
      subchannel.addHealthStateWatcher(this.pickedSubchannelHealthListener);
      this.currentPick = subchannel;
      clearTimeout(this.connectionDelayTimeout);
      this.calculateAndReportNewState();
    }
    updateState(newState, picker, errorMessage) {
      trace(
        connectivity_state_1.ConnectivityState[this.currentState] +
          " -> " +
          connectivity_state_1.ConnectivityState[newState],
      );
      this.currentState = newState;
      this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    resetSubchannelList() {
      for (let child of this.children) {
        child.subchannel.removeConnectivityStateListener(this.subchannelStateListener);
        child.subchannel.unref();
        this.channelControlHelper.removeChannelzChild(child.subchannel.getChannelzRef());
      }
      this.currentSubchannelIndex = 0;
      this.children = [];
    }
    connectToAddressList(addressList, options) {
      trace(
        "connectToAddressList([" +
          addressList.map((address) => subchannel_address_1.subchannelAddressToString(address)) +
          "])",
      );
      let newChildrenList = addressList.map((address) => ({
        subchannel: this.channelControlHelper.createSubchannel(address, options),
        hasReportedTransientFailure: false,
      }));
      for (let { subchannel } of newChildrenList)
        if (subchannel.getConnectivityState() === connectivity_state_1.ConnectivityState.READY) {
          this.pickSubchannel(subchannel);
          return;
        }
      for (let { subchannel } of newChildrenList) {
        subchannel.ref();
        this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
      }
      this.resetSubchannelList();
      this.children = newChildrenList;
      for (let { subchannel } of this.children)
        subchannel.addConnectivityStateListener(this.subchannelStateListener);
      for (let child of this.children)
        if (
          child.subchannel.getConnectivityState() === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE
        )
          child.hasReportedTransientFailure = true;
      this.startNextSubchannelConnecting(0);
      this.calculateAndReportNewState();
    }
    updateAddressList(maybeEndpointList, lbConfig, options, resolutionNote) {
      if (!(lbConfig instanceof PickFirstLoadBalancingConfig)) return false;
      if (!maybeEndpointList.ok) {
        if (this.children.length === 0 && this.currentPick === null)
          this.channelControlHelper.updateState(
            connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
            new picker_1.UnavailablePicker(maybeEndpointList.error),
            maybeEndpointList.error.details,
          );
        return true;
      }
      let endpointList = maybeEndpointList.value;
      this.reportHealthStatus = options[REPORT_HEALTH_STATUS_OPTION_NAME];
      if (lbConfig.getShuffleAddressList()) endpointList = shuffled(endpointList);
      let rawAddressList = [].concat(...endpointList.map((endpoint) => endpoint.addresses));
      trace(
        "updateAddressList([" +
          rawAddressList.map((address) => subchannel_address_1.subchannelAddressToString(address)) +
          "])",
      );
      let addressList = interleaveAddressFamilies(rawAddressList);
      this.latestAddressList = addressList;
      this.latestOptions = options;
      this.connectToAddressList(addressList, options);
      this.latestResolutionNote = resolutionNote;
      if (rawAddressList.length > 0) return true;
      else {
        this.lastError = "No addresses resolved";
        return false;
      }
    }
    exitIdle() {
      if (this.currentState === connectivity_state_1.ConnectivityState.IDLE && this.latestAddressList)
        this.connectToAddressList(this.latestAddressList, this.latestOptions);
    }
    resetBackoff() {}
    destroy() {
      this.resetSubchannelList();
      this.removeCurrentPick();
    }
    getTypeName() {
      return TYPE_NAME;
    }
  }
  cjsExports.PickFirstLoadBalancer = PickFirstLoadBalancer;
  var LEAF_CONFIG = new PickFirstLoadBalancingConfig(false);
  class LeafLoadBalancer {
    constructor(endpoint, channelControlHelper, options, resolutionNote) {
      this.endpoint = endpoint;
      this.options = options;
      this.resolutionNote = resolutionNote;
      this.latestState = connectivity_state_1.ConnectivityState.IDLE;
      let childChannelControlHelper = load_balancer_1.createChildChannelControlHelper(channelControlHelper, {
        updateState: (connectivityState, picker, errorMessage) => {
          this.latestState = connectivityState;
          this.latestPicker = picker;
          channelControlHelper.updateState(connectivityState, picker, errorMessage);
        },
      });
      this.pickFirstBalancer = new PickFirstLoadBalancer(childChannelControlHelper);
      this.latestPicker = new picker_1.QueuePicker(this.pickFirstBalancer);
    }
    startConnecting() {
      this.pickFirstBalancer.updateAddressList(
        call_interface_1.statusOrFromValue([this.endpoint]),
        LEAF_CONFIG,
        Object.assign(Object.assign({}, this.options), {
          [REPORT_HEALTH_STATUS_OPTION_NAME]: true,
        }),
        this.resolutionNote,
      );
    }
    updateEndpoint(newEndpoint, newOptions) {
      this.options = newOptions;
      this.endpoint = newEndpoint;
      if (this.latestState !== connectivity_state_1.ConnectivityState.IDLE) this.startConnecting();
    }
    getConnectivityState() {
      return this.latestState;
    }
    getPicker() {
      return this.latestPicker;
    }
    getEndpoint() {
      return this.endpoint;
    }
    exitIdle() {
      this.pickFirstBalancer.exitIdle();
    }
    destroy() {
      this.pickFirstBalancer.destroy();
    }
  }
  cjsExports.LeafLoadBalancer = LeafLoadBalancer;
  function setup() {
    load_balancer_1.registerLoadBalancerType(TYPE_NAME, PickFirstLoadBalancer, PickFirstLoadBalancingConfig);
    load_balancer_1.registerDefaultLoadBalancerType(TYPE_NAME);
  }
});
export { require_load_balancer_pick_first };
