/**
 * @grpc/grpc-js/build/src/subchannel.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_backoff_timeout } from "./backoff-timeout.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_channelz } from "./channelz.js";
import { require_single_subchannel_channel } from "./single-subchannel-channel.js";

//@ chunk-3k21nfa0.js:198192-205117 cjs-fingerprint
var require_subchannel = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Subchannel = undefined;
  var connectivity_state_1 = require_connectivity_state();
  var backoff_timeout_1 = require_backoff_timeout();
  var logging = require_logging();
  var constants_1 = require_constants();
  var uri_parser_1 = require_uri_parser();
  var subchannel_address_1 = require_subchannel_address();
  var channelz_1 = require_channelz();
  var single_subchannel_channel_1 = require_single_subchannel_channel();
  var TRACER_NAME = "subchannel";
  var KEEPALIVE_MAX_TIME_MS = 2147483647;
  class Subchannel {
    constructor(channelTarget, subchannelAddress, options, credentials, connector) {
      var _a;
      this.channelTarget = channelTarget;
      this.subchannelAddress = subchannelAddress;
      this.options = options;
      this.connector = connector;
      this.connectivityState = connectivity_state_1.ConnectivityState.IDLE;
      this.transport = null;
      this.continueConnecting = false;
      this.stateListeners = new Set();
      this.refcount = 0;
      this.channelzEnabled = true;
      this.dataProducers = new Map();
      this.subchannelChannel = null;
      let backoffOptions = {
        initialDelay: options["grpc.initial_reconnect_backoff_ms"],
        maxDelay: options["grpc.max_reconnect_backoff_ms"],
      };
      this.backoffTimeout = new backoff_timeout_1.BackoffTimeout(() => {
        this.handleBackoffTimer();
      }, backoffOptions);
      this.backoffTimeout.unref();
      this.subchannelAddressString = subchannel_address_1.subchannelAddressToString(subchannelAddress);
      this.keepaliveTime = (_a = options["grpc.keepalive_time_ms"]) !== null && _a !== undefined ? _a : -1;
      if (options["grpc.enable_channelz"] === 0) {
        this.channelzEnabled = false;
        this.channelzTrace = new channelz_1.ChannelzTraceStub();
        this.callTracker = new channelz_1.ChannelzCallTrackerStub();
        this.childrenTracker = new channelz_1.ChannelzChildrenTrackerStub();
        this.streamTracker = new channelz_1.ChannelzCallTrackerStub();
      } else {
        this.channelzTrace = new channelz_1.ChannelzTrace();
        this.callTracker = new channelz_1.ChannelzCallTracker();
        this.childrenTracker = new channelz_1.ChannelzChildrenTracker();
        this.streamTracker = new channelz_1.ChannelzCallTracker();
      }
      this.channelzRef = channelz_1.registerChannelzSubchannel(
        this.subchannelAddressString,
        () => this.getChannelzInfo(),
        this.channelzEnabled,
      );
      this.channelzTrace.addTrace("CT_INFO", "Subchannel created");
      this.trace("Subchannel constructed with options " + JSON.stringify(options, undefined, 2));
      this.secureConnector = credentials._createSecureConnector(channelTarget, options);
    }
    getChannelzInfo() {
      return {
        state: this.connectivityState,
        trace: this.channelzTrace,
        callTracker: this.callTracker,
        children: this.childrenTracker.getChildLists(),
        target: this.subchannelAddressString,
      };
    }
    trace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        TRACER_NAME,
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    refTrace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        "subchannel_refcount",
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    handleBackoffTimer() {
      if (this.continueConnecting)
        this.transitionToState(
          [connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE],
          connectivity_state_1.ConnectivityState.CONNECTING,
        );
      else
        this.transitionToState(
          [connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE],
          connectivity_state_1.ConnectivityState.IDLE,
        );
    }
    startBackoff() {
      this.backoffTimeout.runOnce();
    }
    stopBackoff() {
      this.backoffTimeout.stop();
      this.backoffTimeout.reset();
    }
    startConnectingInternal() {
      let options = this.options;
      if (options["grpc.keepalive_time_ms"]) {
        let adjustedKeepaliveTime = Math.min(this.keepaliveTime, KEEPALIVE_MAX_TIME_MS);
        options = Object.assign(Object.assign({}, options), {
          "grpc.keepalive_time_ms": adjustedKeepaliveTime,
        });
      }
      this.connector.connect(this.subchannelAddress, this.secureConnector, options).then(
        (transport) => {
          if (
            this.transitionToState(
              [connectivity_state_1.ConnectivityState.CONNECTING],
              connectivity_state_1.ConnectivityState.READY,
            )
          ) {
            this.transport = transport;
            if (this.channelzEnabled) this.childrenTracker.refChild(transport.getChannelzRef());
            transport.addDisconnectListener((tooManyPings) => {
              this.transitionToState(
                [connectivity_state_1.ConnectivityState.READY],
                connectivity_state_1.ConnectivityState.IDLE,
              );
              if (tooManyPings && this.keepaliveTime > 0) {
                this.keepaliveTime *= 2;
                logging.log(
                  constants_1.LogVerbosity.ERROR,
                  `Connection to ${uri_parser_1.uriToString(this.channelTarget)} at ${this.subchannelAddressString} rejected by server because of excess pings. Increasing ping interval to ${this.keepaliveTime} ms`,
                );
              }
            });
          } else transport.shutdown();
        },
        (error) => {
          this.transitionToState(
            [connectivity_state_1.ConnectivityState.CONNECTING],
            connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
            `${error}`,
          );
        },
      );
    }
    transitionToState(oldStates, newState, errorMessage) {
      var _a;
      var _b;
      if (oldStates.indexOf(this.connectivityState) === -1) return false;
      if (errorMessage)
        this.trace(
          connectivity_state_1.ConnectivityState[this.connectivityState] +
            " -> " +
            connectivity_state_1.ConnectivityState[newState] +
            ' with error "' +
            errorMessage +
            '"',
        );
      else
        this.trace(
          connectivity_state_1.ConnectivityState[this.connectivityState] +
            " -> " +
            connectivity_state_1.ConnectivityState[newState],
        );
      if (this.channelzEnabled)
        this.channelzTrace.addTrace(
          "CT_INFO",
          "Connectivity state change to " + connectivity_state_1.ConnectivityState[newState],
        );
      let previousState = this.connectivityState;
      switch (((this.connectivityState = newState), newState)) {
        case connectivity_state_1.ConnectivityState.READY:
          this.stopBackoff();
          break;
        case connectivity_state_1.ConnectivityState.CONNECTING:
          this.startBackoff();
          this.startConnectingInternal();
          this.continueConnecting = false;
          break;
        case connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE:
          if (this.channelzEnabled && this.transport)
            this.childrenTracker.unrefChild(this.transport.getChannelzRef());
          if (!((_a = this.transport) === null || _a === undefined)) _a.shutdown();
          this.transport = null;
          if (!this.backoffTimeout.isRunning())
            process.nextTick(() => {
              this.handleBackoffTimer();
            });
          break;
        case connectivity_state_1.ConnectivityState.IDLE:
          if (this.channelzEnabled && this.transport)
            this.childrenTracker.unrefChild(this.transport.getChannelzRef());
          if (!((_b = this.transport) === null || _b === undefined)) _b.shutdown();
          this.transport = null;
          break;
        default:
          throw Error(`Invalid state: unknown ConnectivityState ${newState}`);
      }
      for (let listener of this.stateListeners)
        listener(this, previousState, newState, this.keepaliveTime, errorMessage);
      return true;
    }
    ref() {
      this.refTrace("refcount " + this.refcount + " -> " + (this.refcount + 1));
      this.refcount += 1;
    }
    unref() {
      this.refTrace("refcount " + this.refcount + " -> " + (this.refcount - 1));
      this.refcount -= 1;
      if (this.refcount === 0) {
        this.channelzTrace.addTrace("CT_INFO", "Shutting down");
        channelz_1.unregisterChannelzRef(this.channelzRef);
        this.secureConnector.destroy();
        process.nextTick(() => {
          this.transitionToState(
            [connectivity_state_1.ConnectivityState.CONNECTING, connectivity_state_1.ConnectivityState.READY],
            connectivity_state_1.ConnectivityState.IDLE,
          );
        });
      }
    }
    unrefIfOneRef() {
      if (this.refcount === 1) {
        this.unref();
        return true;
      }
      return false;
    }
    createCall(metadata, host, method, listener) {
      if (!this.transport) throw Error("Cannot create call, subchannel not READY");
      let statsTracker;
      if (this.channelzEnabled) {
        this.callTracker.addCallStarted();
        this.streamTracker.addCallStarted();
        statsTracker = {
          onCallEnd: (status) => {
            if (status.code === constants_1.Status.OK) this.callTracker.addCallSucceeded();
            else this.callTracker.addCallFailed();
          },
        };
      } else statsTracker = {};
      return this.transport.createCall(metadata, host, method, listener, statsTracker);
    }
    startConnecting() {
      process.nextTick(() => {
        if (
          !this.transitionToState(
            [connectivity_state_1.ConnectivityState.IDLE],
            connectivity_state_1.ConnectivityState.CONNECTING,
          )
        ) {
          if (this.connectivityState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE)
            this.continueConnecting = true;
        }
      });
    }
    getConnectivityState() {
      return this.connectivityState;
    }
    addConnectivityStateListener(listener) {
      this.stateListeners.add(listener);
    }
    removeConnectivityStateListener(listener) {
      this.stateListeners.delete(listener);
    }
    resetBackoff() {
      process.nextTick(() => {
        this.backoffTimeout.reset();
        this.transitionToState(
          [connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE],
          connectivity_state_1.ConnectivityState.CONNECTING,
        );
      });
    }
    getAddress() {
      return this.subchannelAddressString;
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    isHealthy() {
      return true;
    }
    addHealthStateWatcher(listener) {}
    removeHealthStateWatcher(listener) {}
    getRealSubchannel() {
      return this;
    }
    realSubchannelEquals(other) {
      return other.getRealSubchannel() === this;
    }
    throttleKeepalive(newKeepaliveTime) {
      if (newKeepaliveTime > this.keepaliveTime) this.keepaliveTime = newKeepaliveTime;
    }
    getCallCredentials() {
      return this.secureConnector.getCallCredentials();
    }
    getChannel() {
      if (!this.subchannelChannel)
        this.subchannelChannel = new single_subchannel_channel_1.SingleSubchannelChannel(
          this,
          this.channelTarget,
          this.options,
        );
      return this.subchannelChannel;
    }
    addDataWatcher(dataWatcher) {
      throw Error("Not implemented");
    }
    getOrCreateDataProducer(name, createDataProducer) {
      let existingProducer = this.dataProducers.get(name);
      if (existingProducer) return existingProducer;
      let newProducer = createDataProducer(this);
      this.dataProducers.set(name, newProducer);
      return newProducer;
    }
    removeDataProducer(name) {
      this.dataProducers.delete(name);
    }
  }
  cjsExports.Subchannel = Subchannel;
});
export { require_subchannel };
