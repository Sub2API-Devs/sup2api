/**
 * @grpc/grpc-js/build/src/load-balancing-call.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_constants } from "./constants.js";
import { require_deadline } from "./deadline.js";
import { require_metadata } from "./metadata.js";
import { require_picker } from "./picker.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_logging } from "./logging.js";
import { require_control_plane_status } from "./control-plane-status.js";

//@ chunk-pwh5dx3n.js:237579-243577 cjs-fingerprint
var require_load_balancing_call = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LoadBalancingCall = undefined;
  var connectivity_state_1 = require_connectivity_state();
  var constants_1 = require_constants();
  var deadline_1 = require_deadline();
  var metadata_1 = require_metadata();
  var picker_1 = require_picker();
  var uri_parser_1 = require_uri_parser();
  var logging = require_logging();
  var control_plane_status_1 = require_control_plane_status();
  var http2 = importMetaRequire("http2");
  var TRACER_NAME = "load_balancing_call";
  class LoadBalancingCall {
    constructor(channel, callConfig, methodName, host, credentials, deadline, callNumber) {
      var _a;
      var _b;
      this.channel = channel;
      this.callConfig = callConfig;
      this.methodName = methodName;
      this.host = host;
      this.credentials = credentials;
      this.deadline = deadline;
      this.callNumber = callNumber;
      this.child = null;
      this.readPending = false;
      this.pendingMessage = null;
      this.pendingHalfClose = false;
      this.ended = false;
      this.metadata = null;
      this.listener = null;
      this.onCallEnded = null;
      this.childStartTime = null;
      let splitPath = this.methodName.split("/");
      let serviceName = "";
      if (splitPath.length >= 2) serviceName = splitPath[1];
      let hostname =
        (_b =
          (_a = uri_parser_1.splitHostPort(this.host)) === null || _a === undefined ? undefined : _a.host) !==
          null && _b !== undefined
          ? _b
          : "localhost";
      this.serviceUrl = `https://${hostname}/${serviceName}`;
      this.startTime = new Date();
    }
    getDeadlineInfo() {
      var _a;
      var _b;
      let deadlineInfo = [];
      if (this.childStartTime) {
        if (this.childStartTime > this.startTime) {
          if ((_a = this.metadata) === null || _a === undefined ? undefined : _a.getOptions().waitForReady)
            deadlineInfo.push("wait_for_ready");
          deadlineInfo.push(
            `LB pick: ${deadline_1.formatDateDifference(this.startTime, this.childStartTime)}`,
          );
        }
        deadlineInfo.push(...this.child.getDeadlineInfo());
        return deadlineInfo;
      } else {
        if ((_b = this.metadata) === null || _b === undefined ? undefined : _b.getOptions().waitForReady)
          deadlineInfo.push("wait_for_ready");
        deadlineInfo.push("Waiting for LB pick");
      }
      return deadlineInfo;
    }
    trace(text) {
      logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, "[" + this.callNumber + "] " + text);
    }
    outputStatus(status, progress) {
      var _a;
      var _b;
      if (!this.ended) {
        this.ended = true;
        this.trace(
          "ended with status: code=" +
            status.code +
            ' details="' +
            status.details +
            '" start time=' +
            this.startTime.toISOString(),
        );
        let finalStatus = Object.assign(Object.assign({}, status), {
          progress,
        });
        if (!((_a = this.listener) === null || _a === undefined)) _a.onReceiveStatus(finalStatus);
        if (!((_b = this.onCallEnded) === null || _b === undefined))
          _b.call(this, finalStatus.code, finalStatus.details, finalStatus.metadata);
      }
    }
    doPick() {
      var _a;
      var _b;
      if (this.ended) return;
      if (!this.metadata) throw Error("doPick called before start");
      this.trace("Pick called");
      let finalMetadata = this.metadata.clone();
      let pickResult = this.channel.doPick(finalMetadata, this.callConfig.pickInformation);
      let subchannelString = pickResult.subchannel
        ? "(" + pickResult.subchannel.getChannelzRef().id + ") " + pickResult.subchannel.getAddress()
        : "" + pickResult.subchannel;
      switch (
        (this.trace(
          "Pick result: " +
            picker_1.PickResultType[pickResult.pickResultType] +
            " subchannel: " +
            subchannelString +
            " status: " +
            ((_a = pickResult.status) === null || _a === undefined ? undefined : _a.code) +
            " " +
            ((_b = pickResult.status) === null || _b === undefined ? undefined : _b.details),
        ),
        pickResult.pickResultType)
      ) {
        case picker_1.PickResultType.COMPLETE:
          this.credentials
            .compose(pickResult.subchannel.getCallCredentials())
            .generateMetadata({
              method_name: this.methodName,
              service_url: this.serviceUrl,
            })
            .then(
              (credsMetadata) => {
                var _a;
                if (this.ended) {
                  this.trace("Credentials metadata generation finished after call ended");
                  return;
                }
                finalMetadata.merge(credsMetadata);
                if (finalMetadata.get("authorization").length > 1)
                  this.outputStatus(
                    {
                      code: constants_1.Status.INTERNAL,
                      details: '"authorization" metadata cannot have multiple values',
                      metadata: new metadata_1.Metadata(),
                    },
                    "PROCESSED",
                  );
                if (
                  pickResult.subchannel.getConnectivityState() !==
                  connectivity_state_1.ConnectivityState.READY
                ) {
                  this.trace(
                    "Picked subchannel " +
                      subchannelString +
                      " has state " +
                      connectivity_state_1.ConnectivityState[pickResult.subchannel.getConnectivityState()] +
                      " after getting credentials metadata. Retrying pick",
                  );
                  this.doPick();
                  return;
                }
                if (this.deadline !== 1 / 0)
                  finalMetadata.set("grpc-timeout", deadline_1.getDeadlineTimeoutString(this.deadline));
                try {
                  this.child = pickResult.subchannel
                    .getRealSubchannel()
                    .createCall(finalMetadata, this.host, this.methodName, {
                      onReceiveMetadata: (metadata) => {
                        this.trace("Received metadata");
                        this.listener.onReceiveMetadata(metadata);
                      },
                      onReceiveMessage: (message) => {
                        this.trace("Received message");
                        this.listener.onReceiveMessage(message);
                      },
                      onReceiveStatus: (status) => {
                        this.trace("Received status");
                        if (status.rstCode === http2.constants.NGHTTP2_REFUSED_STREAM)
                          this.outputStatus(status, "REFUSED");
                        else this.outputStatus(status, "PROCESSED");
                      },
                    });
                  this.childStartTime = new Date();
                } catch (error) {
                  this.trace(
                    "Failed to start call on picked subchannel " +
                      subchannelString +
                      " with error " +
                      error.message,
                  );
                  this.outputStatus(
                    {
                      code: constants_1.Status.INTERNAL,
                      details: "Failed to start HTTP/2 stream with error " + error.message,
                      metadata: new metadata_1.Metadata(),
                    },
                    "NOT_STARTED",
                  );
                  return;
                }
                if (!((_a = pickResult.onCallStarted) === null || _a === undefined)) _a.call(pickResult);
                this.onCallEnded = pickResult.onCallEnded;
                this.trace("Created child call [" + this.child.getCallNumber() + "]");
                if (this.readPending) this.child.startRead();
                if (this.pendingMessage)
                  this.child.sendMessageWithContext(this.pendingMessage.context, this.pendingMessage.message);
                if (this.pendingHalfClose) this.child.halfClose();
              },
              (error) => {
                let { code, details } = control_plane_status_1.restrictControlPlaneStatusCode(
                  typeof error.code === "number" ? error.code : constants_1.Status.UNKNOWN,
                  `Getting metadata from plugin failed with error: ${error.message}`,
                );
                this.outputStatus(
                  {
                    code,
                    details,
                    metadata: new metadata_1.Metadata(),
                  },
                  "PROCESSED",
                );
              },
            );
          break;
        case picker_1.PickResultType.DROP:
          let { code, details } = control_plane_status_1.restrictControlPlaneStatusCode(
            pickResult.status.code,
            pickResult.status.details,
          );
          setImmediate(() => {
            this.outputStatus(
              {
                code,
                details,
                metadata: pickResult.status.metadata,
              },
              "DROP",
            );
          });
          break;
        case picker_1.PickResultType.TRANSIENT_FAILURE:
          if (this.metadata.getOptions().waitForReady) this.channel.queueCallForPick(this);
          else {
            let { code, details } = control_plane_status_1.restrictControlPlaneStatusCode(
              pickResult.status.code,
              pickResult.status.details,
            );
            setImmediate(() => {
              this.outputStatus(
                {
                  code,
                  details,
                  metadata: pickResult.status.metadata,
                },
                "PROCESSED",
              );
            });
          }
          break;
        case picker_1.PickResultType.QUEUE:
          this.channel.queueCallForPick(this);
      }
    }
    cancelWithStatus(status, details) {
      var _a;
      this.trace("cancelWithStatus code: " + status + ' details: "' + details + '"');
      if (!((_a = this.child) === null || _a === undefined)) _a.cancelWithStatus(status, details);
      this.outputStatus(
        {
          code: status,
          details,
          metadata: new metadata_1.Metadata(),
        },
        "PROCESSED",
      );
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.child) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : this.channel.getTarget();
    }
    start(metadata, listener) {
      this.trace("start called");
      this.listener = listener;
      this.metadata = metadata;
      this.doPick();
    }
    sendMessageWithContext(context, message) {
      this.trace("write() called with message of length " + message.length);
      if (this.child) this.child.sendMessageWithContext(context, message);
      else
        this.pendingMessage = {
          context,
          message,
        };
    }
    startRead() {
      this.trace("startRead called");
      if (this.child) this.child.startRead();
      else this.readPending = true;
    }
    halfClose() {
      this.trace("halfClose called");
      if (this.child) this.child.halfClose();
      else this.pendingHalfClose = true;
    }
    setCredentials(credentials) {
      throw Error("Method not implemented.");
    }
    getCallNumber() {
      return this.callNumber;
    }
    getAuthContext() {
      if (this.child) return this.child.getAuthContext();
      else return null;
    }
  }
  cjsExports.LoadBalancingCall = LoadBalancingCall;
});
export { require_load_balancing_call };
