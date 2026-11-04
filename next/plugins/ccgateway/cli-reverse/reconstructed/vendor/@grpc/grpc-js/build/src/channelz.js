/**
 * @grpc/grpc-js/build/src/channelz.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { Qc } from "../../../../@js-sdsl/ordered-map/dist/cjs/index.js";
import { Ae } from "./connectivity-state.js";
import { k } from "./constants.js";
import { Pe } from "./subchannel-address.js";
import { fs } from "./admin.js";
import { vs } from "./make-client.js";
import { fo } from "../../../proto-loader/build/src/index.js";

//@ chunk-pwh5dx3n.js:175802-185435 cjs-fingerprint
var Zt = x(function (cjsExports) {
  var __dirname_2 =
    "/home/runner/work/claude-cli-internal/claude-cli-internal/node_modules/@grpc/grpc-js/build/src";
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.registerChannelzSocket =
    cjsExports.registerChannelzServer =
    cjsExports.registerChannelzSubchannel =
    cjsExports.registerChannelzChannel =
    cjsExports.ChannelzCallTrackerStub =
    cjsExports.ChannelzCallTracker =
    cjsExports.ChannelzChildrenTrackerStub =
    cjsExports.ChannelzChildrenTracker =
    cjsExports.ChannelzTrace =
    cjsExports.ChannelzTraceStub =
      undefined;
  cjsExports.unregisterChannelzRef = unregisterChannelzRef;
  cjsExports.getChannelzHandlers = getChannelzHandlers;
  cjsExports.getChannelzServiceDefinition = getChannelzServiceDefinition;
  cjsExports.setup = setup;
  var net_1 = Be("net");
  var ordered_map_1 = Qc();
  var connectivity_state_1 = Ae();
  var constants_1 = k();
  var subchannel_address_1 = Pe();
  var admin_1 = fs();
  var make_client_1 = vs();
  function channelRefToMessage(ref) {
    return {
      channel_id: ref.id,
      name: ref.name,
    };
  }
  function subchannelRefToMessage(ref) {
    return {
      subchannel_id: ref.id,
      name: ref.name,
    };
  }
  function serverRefToMessage(ref) {
    return {
      server_id: ref.id,
    };
  }
  function socketRefToMessage(ref) {
    return {
      socket_id: ref.id,
      name: ref.name,
    };
  }
  var TARGET_RETAINED_TRACES = 32;
  var DEFAULT_MAX_RESULTS = 100;
  class ChannelzTraceStub {
    constructor() {
      this.events = [];
      this.creationTimestamp = new Date();
      this.eventsLogged = 0;
    }
    addTrace() {}
    getTraceMessage() {
      return {
        creation_timestamp: dateToProtoTimestamp(this.creationTimestamp),
        num_events_logged: this.eventsLogged,
        events: [],
      };
    }
  }
  cjsExports.ChannelzTraceStub = ChannelzTraceStub;
  class ChannelzTrace {
    constructor() {
      this.events = [];
      this.eventsLogged = 0;
      this.creationTimestamp = new Date();
    }
    addTrace(severity, description, child) {
      let timestamp = new Date();
      this.events.push({
        description,
        severity,
        timestamp,
        childChannel:
          (child === null || child === undefined ? undefined : child.kind) === "channel" ? child : undefined,
        childSubchannel:
          (child === null || child === undefined ? undefined : child.kind) === "subchannel"
            ? child
            : undefined,
      });
      if (this.events.length >= TARGET_RETAINED_TRACES * 2)
        this.events = this.events.slice(TARGET_RETAINED_TRACES);
      this.eventsLogged += 1;
    }
    getTraceMessage() {
      return {
        creation_timestamp: dateToProtoTimestamp(this.creationTimestamp),
        num_events_logged: this.eventsLogged,
        events: this.events.map((event) => ({
          description: event.description,
          severity: event.severity,
          timestamp: dateToProtoTimestamp(event.timestamp),
          channel_ref: event.childChannel ? channelRefToMessage(event.childChannel) : null,
          subchannel_ref: event.childSubchannel ? subchannelRefToMessage(event.childSubchannel) : null,
        })),
      };
    }
  }
  cjsExports.ChannelzTrace = ChannelzTrace;
  class ChannelzChildrenTracker {
    constructor() {
      this.channelChildren = new ordered_map_1.OrderedMap();
      this.subchannelChildren = new ordered_map_1.OrderedMap();
      this.socketChildren = new ordered_map_1.OrderedMap();
      this.trackerMap = {
        ["channel"]: this.channelChildren,
        ["subchannel"]: this.subchannelChildren,
        ["socket"]: this.socketChildren,
      };
    }
    refChild(child) {
      let tracker = this.trackerMap[child.kind];
      let trackedChild = tracker.find(child.id);
      if (trackedChild.equals(tracker.end()))
        tracker.setElement(
          child.id,
          {
            ref: child,
            count: 1,
          },
          trackedChild,
        );
      else trackedChild.pointer[1].count += 1;
    }
    unrefChild(child) {
      let tracker = this.trackerMap[child.kind];
      let trackedChild = tracker.getElementByKey(child.id);
      if (trackedChild !== undefined) {
        trackedChild.count -= 1;
        if (trackedChild.count === 0) tracker.eraseElementByKey(child.id);
      }
    }
    getChildLists() {
      return {
        channels: this.channelChildren,
        subchannels: this.subchannelChildren,
        sockets: this.socketChildren,
      };
    }
  }
  cjsExports.ChannelzChildrenTracker = ChannelzChildrenTracker;
  class ChannelzChildrenTrackerStub extends ChannelzChildrenTracker {
    refChild() {}
    unrefChild() {}
  }
  cjsExports.ChannelzChildrenTrackerStub = ChannelzChildrenTrackerStub;
  class ChannelzCallTracker {
    constructor() {
      this.callsStarted = 0;
      this.callsSucceeded = 0;
      this.callsFailed = 0;
      this.lastCallStartedTimestamp = null;
    }
    addCallStarted() {
      this.callsStarted += 1;
      this.lastCallStartedTimestamp = new Date();
    }
    addCallSucceeded() {
      this.callsSucceeded += 1;
    }
    addCallFailed() {
      this.callsFailed += 1;
    }
  }
  cjsExports.ChannelzCallTracker = ChannelzCallTracker;
  class ChannelzCallTrackerStub extends ChannelzCallTracker {
    addCallStarted() {}
    addCallSucceeded() {}
    addCallFailed() {}
  }
  cjsExports.ChannelzCallTrackerStub = ChannelzCallTrackerStub;
  var entityMaps = {
    ["channel"]: new ordered_map_1.OrderedMap(),
    ["subchannel"]: new ordered_map_1.OrderedMap(),
    ["server"]: new ordered_map_1.OrderedMap(),
    ["socket"]: new ordered_map_1.OrderedMap(),
  };
  var generateRegisterFn = (kind) => {
    let nextId = 1;
    function getNextId() {
      return nextId++;
    }
    let entityMap = entityMaps[kind];
    return (name, getInfo, channelzEnabled) => {
      let id = getNextId();
      let ref = {
        id,
        name,
        kind,
      };
      if (channelzEnabled)
        entityMap.setElement(id, {
          ref,
          getInfo,
        });
      return ref;
    };
  };
  cjsExports.registerChannelzChannel = generateRegisterFn("channel");
  cjsExports.registerChannelzSubchannel = generateRegisterFn("subchannel");
  cjsExports.registerChannelzServer = generateRegisterFn("server");
  cjsExports.registerChannelzSocket = generateRegisterFn("socket");
  function unregisterChannelzRef(ref) {
    entityMaps[ref.kind].eraseElementByKey(ref.id);
  }
  function parseIPv6Section(addressSection) {
    let numberValue = Number.parseInt(addressSection, 16);
    return [(numberValue / 256) | 0, numberValue % 256];
  }
  function parseIPv6Chunk(addressChunk) {
    if (addressChunk === "") return [];
    let bytePairs = addressChunk.split(":").map((section) => parseIPv6Section(section));
    return [].concat(...bytePairs);
  }
  function isIPv6MappedIPv4(ipAddress) {
    return (
      net_1.isIPv6(ipAddress) &&
      ipAddress.toLowerCase().startsWith("::ffff:") &&
      net_1.isIPv4(ipAddress.substring(7))
    );
  }
  function ipv4AddressStringToBuffer(ipAddress) {
    return Buffer.from(Uint8Array.from(ipAddress.split(".").map((segment) => Number.parseInt(segment))));
  }
  function ipAddressStringToBuffer(ipAddress) {
    if (net_1.isIPv4(ipAddress)) return ipv4AddressStringToBuffer(ipAddress);
    else if (isIPv6MappedIPv4(ipAddress)) return ipv4AddressStringToBuffer(ipAddress.substring(7));
    else if (net_1.isIPv6(ipAddress)) {
      let leftSection;
      let rightSection;
      let doubleColonIndex = ipAddress.indexOf("::");
      if (doubleColonIndex === -1) {
        leftSection = ipAddress;
        rightSection = "";
      } else {
        leftSection = ipAddress.substring(0, doubleColonIndex);
        rightSection = ipAddress.substring(doubleColonIndex + 2);
      }
      let leftBuffer = Buffer.from(parseIPv6Chunk(leftSection));
      let rightBuffer = Buffer.from(parseIPv6Chunk(rightSection));
      let middleBuffer = Buffer.alloc(16 - leftBuffer.length - rightBuffer.length, 0);
      return Buffer.concat([leftBuffer, middleBuffer, rightBuffer]);
    } else return null;
  }
  function connectivityStateToMessage(state) {
    switch (state) {
      case connectivity_state_1.ConnectivityState.CONNECTING:
        return {
          state: "CONNECTING",
        };
      case connectivity_state_1.ConnectivityState.IDLE:
        return {
          state: "IDLE",
        };
      case connectivity_state_1.ConnectivityState.READY:
        return {
          state: "READY",
        };
      case connectivity_state_1.ConnectivityState.SHUTDOWN:
        return {
          state: "SHUTDOWN",
        };
      case connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE:
        return {
          state: "TRANSIENT_FAILURE",
        };
      default:
        return {
          state: "UNKNOWN",
        };
    }
  }
  function dateToProtoTimestamp(date) {
    if (!date) return null;
    let millisSinceEpoch = date.getTime();
    return {
      seconds: (millisSinceEpoch / 1000) | 0,
      nanos: (millisSinceEpoch % 1000) * 1e6,
    };
  }
  function getChannelMessage(channelEntry) {
    let resolvedInfo = channelEntry.getInfo();
    let channelRef = [];
    let subchannelRef = [];
    resolvedInfo.children.channels.forEach((el) => {
      channelRef.push(channelRefToMessage(el[1].ref));
    });
    resolvedInfo.children.subchannels.forEach((el) => {
      subchannelRef.push(subchannelRefToMessage(el[1].ref));
    });
    return {
      ref: channelRefToMessage(channelEntry.ref),
      data: {
        target: resolvedInfo.target,
        state: connectivityStateToMessage(resolvedInfo.state),
        calls_started: resolvedInfo.callTracker.callsStarted,
        calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
        calls_failed: resolvedInfo.callTracker.callsFailed,
        last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
        trace: resolvedInfo.trace.getTraceMessage(),
      },
      channel_ref: channelRef,
      subchannel_ref: subchannelRef,
    };
  }
  function GetChannel(call, callback) {
    let channelId = parseInt(call.request.channel_id, 10);
    let channelEntry = entityMaps.channel.getElementByKey(channelId);
    if (channelEntry === undefined) {
      callback({
        code: constants_1.Status.NOT_FOUND,
        details: "No channel data found for id " + channelId,
      });
      return;
    }
    callback(null, {
      channel: getChannelMessage(channelEntry),
    });
  }
  function GetTopChannels(call, callback) {
    let maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    let resultList = [];
    let startId = parseInt(call.request.start_channel_id, 10);
    let channelEntries = entityMaps.channel;
    let i;
    for (
      i = channelEntries.lowerBound(startId);
      !i.equals(channelEntries.end()) && resultList.length < maxResults;
      i = i.next()
    )
      resultList.push(getChannelMessage(i.pointer[1]));
    callback(null, {
      channel: resultList,
      end: i.equals(channelEntries.end()),
    });
  }
  function getServerMessage(serverEntry) {
    let resolvedInfo = serverEntry.getInfo();
    let listenSocket = [];
    resolvedInfo.listenerChildren.sockets.forEach((el) => {
      listenSocket.push(socketRefToMessage(el[1].ref));
    });
    return {
      ref: serverRefToMessage(serverEntry.ref),
      data: {
        calls_started: resolvedInfo.callTracker.callsStarted,
        calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
        calls_failed: resolvedInfo.callTracker.callsFailed,
        last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
        trace: resolvedInfo.trace.getTraceMessage(),
      },
      listen_socket: listenSocket,
    };
  }
  function GetServer(call, callback) {
    let serverId = parseInt(call.request.server_id, 10);
    let serverEntry = entityMaps.server.getElementByKey(serverId);
    if (serverEntry === undefined) {
      callback({
        code: constants_1.Status.NOT_FOUND,
        details: "No server data found for id " + serverId,
      });
      return;
    }
    callback(null, {
      server: getServerMessage(serverEntry),
    });
  }
  function GetServers(call, callback) {
    let maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    let startId = parseInt(call.request.start_server_id, 10);
    let serverEntries = entityMaps.server;
    let resultList = [];
    let i;
    for (
      i = serverEntries.lowerBound(startId);
      !i.equals(serverEntries.end()) && resultList.length < maxResults;
      i = i.next()
    )
      resultList.push(getServerMessage(i.pointer[1]));
    callback(null, {
      server: resultList,
      end: i.equals(serverEntries.end()),
    });
  }
  function GetSubchannel(call, callback) {
    let subchannelId = parseInt(call.request.subchannel_id, 10);
    let subchannelEntry = entityMaps.subchannel.getElementByKey(subchannelId);
    if (subchannelEntry === undefined) {
      callback({
        code: constants_1.Status.NOT_FOUND,
        details: "No subchannel data found for id " + subchannelId,
      });
      return;
    }
    let resolvedInfo = subchannelEntry.getInfo();
    let listenSocket = [];
    resolvedInfo.children.sockets.forEach((el) => {
      listenSocket.push(socketRefToMessage(el[1].ref));
    });
    let subchannelMessage = {
      ref: subchannelRefToMessage(subchannelEntry.ref),
      data: {
        target: resolvedInfo.target,
        state: connectivityStateToMessage(resolvedInfo.state),
        calls_started: resolvedInfo.callTracker.callsStarted,
        calls_succeeded: resolvedInfo.callTracker.callsSucceeded,
        calls_failed: resolvedInfo.callTracker.callsFailed,
        last_call_started_timestamp: dateToProtoTimestamp(resolvedInfo.callTracker.lastCallStartedTimestamp),
        trace: resolvedInfo.trace.getTraceMessage(),
      },
      socket_ref: listenSocket,
    };
    callback(null, {
      subchannel: subchannelMessage,
    });
  }
  function subchannelAddressToAddressMessage(subchannelAddress) {
    var _a;
    if (subchannel_address_1.isTcpSubchannelAddress(subchannelAddress))
      return {
        address: "tcpip_address",
        tcpip_address: {
          ip_address:
            (_a = ipAddressStringToBuffer(subchannelAddress.host)) !== null && _a !== undefined
              ? _a
              : undefined,
          port: subchannelAddress.port,
        },
      };
    else
      return {
        address: "uds_address",
        uds_address: {
          filename: subchannelAddress.path,
        },
      };
  }
  function GetSocket(call, callback) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    let socketId = parseInt(call.request.socket_id, 10);
    let socketEntry = entityMaps.socket.getElementByKey(socketId);
    if (socketEntry === undefined) {
      callback({
        code: constants_1.Status.NOT_FOUND,
        details: "No socket data found for id " + socketId,
      });
      return;
    }
    let resolvedInfo = socketEntry.getInfo();
    let securityMessage = resolvedInfo.security
      ? {
          model: "tls",
          tls: {
            cipher_suite: resolvedInfo.security.cipherSuiteStandardName ? "standard_name" : "other_name",
            standard_name:
              (_a = resolvedInfo.security.cipherSuiteStandardName) !== null && _a !== undefined
                ? _a
                : undefined,
            other_name:
              (_b = resolvedInfo.security.cipherSuiteOtherName) !== null && _b !== undefined ? _b : undefined,
            local_certificate:
              (_c = resolvedInfo.security.localCertificate) !== null && _c !== undefined ? _c : undefined,
            remote_certificate:
              (_d = resolvedInfo.security.remoteCertificate) !== null && _d !== undefined ? _d : undefined,
          },
        }
      : null;
    let socketMessage = {
      ref: socketRefToMessage(socketEntry.ref),
      local: resolvedInfo.localAddress ? subchannelAddressToAddressMessage(resolvedInfo.localAddress) : null,
      remote: resolvedInfo.remoteAddress
        ? subchannelAddressToAddressMessage(resolvedInfo.remoteAddress)
        : null,
      remote_name: (_e = resolvedInfo.remoteName) !== null && _e !== undefined ? _e : undefined,
      security: securityMessage,
      data: {
        keep_alives_sent: resolvedInfo.keepAlivesSent,
        streams_started: resolvedInfo.streamsStarted,
        streams_succeeded: resolvedInfo.streamsSucceeded,
        streams_failed: resolvedInfo.streamsFailed,
        last_local_stream_created_timestamp: dateToProtoTimestamp(
          resolvedInfo.lastLocalStreamCreatedTimestamp,
        ),
        last_remote_stream_created_timestamp: dateToProtoTimestamp(
          resolvedInfo.lastRemoteStreamCreatedTimestamp,
        ),
        messages_received: resolvedInfo.messagesReceived,
        messages_sent: resolvedInfo.messagesSent,
        last_message_received_timestamp: dateToProtoTimestamp(resolvedInfo.lastMessageReceivedTimestamp),
        last_message_sent_timestamp: dateToProtoTimestamp(resolvedInfo.lastMessageSentTimestamp),
        local_flow_control_window: resolvedInfo.localFlowControlWindow
          ? {
              value: resolvedInfo.localFlowControlWindow,
            }
          : null,
        remote_flow_control_window: resolvedInfo.remoteFlowControlWindow
          ? {
              value: resolvedInfo.remoteFlowControlWindow,
            }
          : null,
      },
    };
    callback(null, {
      socket: socketMessage,
    });
  }
  function GetServerSockets(call, callback) {
    let serverId = parseInt(call.request.server_id, 10);
    let serverEntry = entityMaps.server.getElementByKey(serverId);
    if (serverEntry === undefined) {
      callback({
        code: constants_1.Status.NOT_FOUND,
        details: "No server data found for id " + serverId,
      });
      return;
    }
    let startId = parseInt(call.request.start_socket_id, 10);
    let maxResults = parseInt(call.request.max_results, 10) || DEFAULT_MAX_RESULTS;
    let allSockets = serverEntry.getInfo().sessionChildren.sockets;
    let resultList = [];
    let i;
    for (
      i = allSockets.lowerBound(startId);
      !i.equals(allSockets.end()) && resultList.length < maxResults;
      i = i.next()
    )
      resultList.push(socketRefToMessage(i.pointer[1].ref));
    callback(null, {
      socket_ref: resultList,
      end: i.equals(allSockets.end()),
    });
  }
  function getChannelzHandlers() {
    return {
      GetChannel,
      GetTopChannels,
      GetServer,
      GetServers,
      GetSubchannel,
      GetSocket,
      GetServerSockets,
    };
  }
  var loadedChannelzDefinition = null;
  function getChannelzServiceDefinition() {
    if (loadedChannelzDefinition) return loadedChannelzDefinition;
    let loaderLoadSync = fo().loadSync;
    let loadSync = loaderLoadSync("channelz.proto", {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [`${__dirname_2}/../../proto`],
    });
    loadedChannelzDefinition =
      make_client_1.loadPackageDefinition(loadSync).grpc.channelz.v1.Channelz.service;
    return loadedChannelzDefinition;
  }
  function setup() {
    admin_1.registerAdminService(getChannelzServiceDefinition, getChannelzHandlers);
  }
});
export { Zt };
