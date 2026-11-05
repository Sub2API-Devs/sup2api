/**
 * @grpc/grpc-js/build/src/single-subchannel-channel.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_call_number } from "./call-number.js";
import { require_channelz } from "./channelz.js";
import { require_compression_filter } from "./compression-filter.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_constants } from "./constants.js";
import { require_control_plane_status } from "./control-plane-status.js";
import { require_deadline } from "./deadline.js";
import { require_filter_stack } from "./filter-stack.js";
import { require_metadata } from "./metadata.js";
import { require_resolver } from "./resolver.js";
import { require_uri_parser } from "./uri-parser.js";

//@ chunk-3k21nfa0.js:193423-198192 cjs-fingerprint
var require_single_subchannel_channel = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SingleSubchannelChannel = undefined;
  var call_number_1 = require_call_number();
  var channelz_1 = require_channelz();
  var compression_filter_1 = require_compression_filter();
  var connectivity_state_1 = require_connectivity_state();
  var constants_1 = require_constants();
  var control_plane_status_1 = require_control_plane_status();
  var deadline_1 = require_deadline();
  var filter_stack_1 = require_filter_stack();
  var metadata_1 = require_metadata();
  var resolver_1 = require_resolver();
  var uri_parser_1 = require_uri_parser();
  class SubchannelCallWrapper {
    constructor(subchannel, method, filterStackFactory, options, callNumber) {
      var _a;
      var _b;
      this.subchannel = subchannel;
      this.method = method;
      this.options = options;
      this.callNumber = callNumber;
      this.childCall = null;
      this.pendingMessage = null;
      this.readPending = false;
      this.halfClosePending = false;
      this.pendingStatus = null;
      this.readFilterPending = false;
      this.writeFilterPending = false;
      let splitPath = this.method.split("/");
      let serviceName = "";
      if (splitPath.length >= 2) serviceName = splitPath[1];
      let hostname =
        (_b =
          (_a = uri_parser_1.splitHostPort(this.options.host)) === null || _a === undefined
            ? undefined
            : _a.host) !== null && _b !== undefined
          ? _b
          : "localhost";
      this.serviceUrl = `https://${hostname}/${serviceName}`;
      let timeout = deadline_1.getRelativeTimeout(options.deadline);
      if (timeout !== 1 / 0)
        if (timeout <= 0) this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, "Deadline exceeded");
        else
          setTimeout(() => {
            this.cancelWithStatus(constants_1.Status.DEADLINE_EXCEEDED, "Deadline exceeded");
          }, timeout);
      this.filterStack = filterStackFactory.createFilter();
    }
    cancelWithStatus(status, details) {
      if (this.childCall) this.childCall.cancelWithStatus(status, details);
      else
        this.pendingStatus = {
          code: status,
          details,
          metadata: new metadata_1.Metadata(),
        };
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.childCall) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : this.subchannel.getAddress();
    }
    async start(metadata, listener) {
      if (this.pendingStatus) {
        listener.onReceiveStatus(this.pendingStatus);
        return;
      }
      if (this.subchannel.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY) {
        listener.onReceiveStatus({
          code: constants_1.Status.UNAVAILABLE,
          details: "Subchannel not ready",
          metadata: new metadata_1.Metadata(),
        });
        return;
      }
      let filteredMetadata = await this.filterStack.sendMetadata(Promise.resolve(metadata));
      let credsMetadata;
      try {
        credsMetadata = await this.subchannel.getCallCredentials().generateMetadata({
          method_name: this.method,
          service_url: this.serviceUrl,
        });
      } catch (e) {
        let error = e;
        let { code, details } = control_plane_status_1.restrictControlPlaneStatusCode(
          typeof error.code === "number" ? error.code : constants_1.Status.UNKNOWN,
          `Getting metadata from plugin failed with error: ${error.message}`,
        );
        listener.onReceiveStatus({
          code,
          details,
          metadata: new metadata_1.Metadata(),
        });
        return;
      }
      credsMetadata.merge(filteredMetadata);
      let childListener = {
        onReceiveMetadata: async (metadata) => {
          listener.onReceiveMetadata(await this.filterStack.receiveMetadata(metadata));
        },
        onReceiveMessage: async (message) => {
          this.readFilterPending = true;
          let filteredMessage = await this.filterStack.receiveMessage(message);
          this.readFilterPending = false;
          listener.onReceiveMessage(filteredMessage);
          if (this.pendingStatus) listener.onReceiveStatus(this.pendingStatus);
        },
        onReceiveStatus: async (status) => {
          let filteredStatus = await this.filterStack.receiveTrailers(status);
          if (this.readFilterPending) this.pendingStatus = filteredStatus;
          else listener.onReceiveStatus(filteredStatus);
        },
      };
      this.childCall = this.subchannel.createCall(
        credsMetadata,
        this.options.host,
        this.method,
        childListener,
      );
      if (this.readPending) this.childCall.startRead();
      if (this.pendingMessage)
        this.childCall.sendMessageWithContext(this.pendingMessage.context, this.pendingMessage.message);
      if (this.halfClosePending && !this.writeFilterPending) this.childCall.halfClose();
    }
    async sendMessageWithContext(context, message) {
      this.writeFilterPending = true;
      let filteredMessage = await this.filterStack.sendMessage(
        Promise.resolve({
          message,
          flags: context.flags,
        }),
      );
      this.writeFilterPending = false;
      if (this.childCall) {
        this.childCall.sendMessageWithContext(context, filteredMessage.message);
        if (this.halfClosePending) this.childCall.halfClose();
      } else
        this.pendingMessage = {
          context,
          message: filteredMessage.message,
        };
    }
    startRead() {
      if (this.childCall) this.childCall.startRead();
      else this.readPending = true;
    }
    halfClose() {
      if (this.childCall && !this.writeFilterPending) this.childCall.halfClose();
      else this.halfClosePending = true;
    }
    getCallNumber() {
      return this.callNumber;
    }
    setCredentials(credentials) {
      throw Error("Method not implemented.");
    }
    getAuthContext() {
      if (this.childCall) return this.childCall.getAuthContext();
      else return null;
    }
  }
  class SingleSubchannelChannel {
    constructor(subchannel, target, options) {
      this.subchannel = subchannel;
      this.target = target;
      this.channelzEnabled = false;
      this.channelzTrace = new channelz_1.ChannelzTrace();
      this.callTracker = new channelz_1.ChannelzCallTracker();
      this.childrenTracker = new channelz_1.ChannelzChildrenTracker();
      this.channelzEnabled = options["grpc.enable_channelz"] !== 0;
      this.channelzRef = channelz_1.registerChannelzChannel(
        uri_parser_1.uriToString(target),
        () => ({
          target: `${uri_parser_1.uriToString(target)} (${subchannel.getAddress()})`,
          state: this.subchannel.getConnectivityState(),
          trace: this.channelzTrace,
          callTracker: this.callTracker,
          children: this.childrenTracker.getChildLists(),
        }),
        this.channelzEnabled,
      );
      if (this.channelzEnabled) this.childrenTracker.refChild(subchannel.getChannelzRef());
      this.filterStackFactory = new filter_stack_1.FilterStackFactory([
        new compression_filter_1.CompressionFilterFactory(this, options),
      ]);
    }
    close() {
      if (this.channelzEnabled) this.childrenTracker.unrefChild(this.subchannel.getChannelzRef());
      channelz_1.unregisterChannelzRef(this.channelzRef);
    }
    getTarget() {
      return uri_parser_1.uriToString(this.target);
    }
    getConnectivityState(tryToConnect) {
      throw Error("Method not implemented.");
    }
    watchConnectivityState(currentState, deadline, callback) {
      throw Error("Method not implemented.");
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    createCall(method, deadline) {
      let callOptions = {
        deadline,
        host: resolver_1.getDefaultAuthority(this.target),
        flags: constants_1.Propagate.DEFAULTS,
        parentCall: null,
      };
      return new SubchannelCallWrapper(
        this.subchannel,
        method,
        this.filterStackFactory,
        callOptions,
        call_number_1.getNextCallNumber(),
      );
    }
  }
  cjsExports.SingleSubchannelChannel = SingleSubchannelChannel;
});
export { require_single_subchannel_channel };
