/**
 * @grpc/grpc-js/build/src/channel-options.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:41007-42367 cjs-fingerprint
var require_channel_options = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.recognizedOptions = undefined;
  cjsExports.channelOptionsEqual = channelOptionsEqual;
  cjsExports.recognizedOptions = {
    "grpc.ssl_target_name_override": true,
    "grpc.primary_user_agent": true,
    "grpc.secondary_user_agent": true,
    "grpc.default_authority": true,
    "grpc.keepalive_time_ms": true,
    "grpc.keepalive_timeout_ms": true,
    "grpc.keepalive_permit_without_calls": true,
    "grpc.service_config": true,
    "grpc.max_concurrent_streams": true,
    "grpc.initial_reconnect_backoff_ms": true,
    "grpc.max_reconnect_backoff_ms": true,
    "grpc.use_local_subchannel_pool": true,
    "grpc.max_send_message_length": true,
    "grpc.max_receive_message_length": true,
    "grpc.enable_http_proxy": true,
    "grpc.enable_channelz": true,
    "grpc.dns_min_time_between_resolutions_ms": true,
    "grpc.enable_retries": true,
    "grpc.per_rpc_retry_buffer_size": true,
    "grpc.retry_buffer_size": true,
    "grpc.max_connection_age_ms": true,
    "grpc.max_connection_age_grace_ms": true,
    "grpc-node.max_session_memory": true,
    "grpc.service_config_disable_resolution": true,
    "grpc.client_idle_timeout_ms": true,
    "grpc-node.tls_enable_trace": true,
    "grpc.lb.ring_hash.ring_size_cap": true,
    "grpc-node.retry_max_attempts_limit": true,
    "grpc-node.flow_control_window": true,
    "grpc.server_call_metric_recording": true,
  };
  function channelOptionsEqual(options1, options2) {
    let keys1 = Object.keys(options1).sort();
    let keys2 = Object.keys(options2).sort();
    if (keys1.length !== keys2.length) return false;
    for (let i = 0; i < keys1.length; i += 1) {
      if (keys1[i] !== keys2[i]) return false;
      if (options1[keys1[i]] !== options2[keys2[i]]) return false;
    }
    return true;
  }
});
export { require_channel_options };
