/**
 * node-forge/lib/tls.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xi } from "./asn1.js";
import { iu } from "./hmac.js";
import { jh } from "./md5.js";
import { sc } from "./pem.js";
import { kS } from "./pki.js";
import { Ci } from "./random.js";
import { cu } from "./sha1.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:211753-249438 cjs-fingerprint
var US = x(function (Bfe, UA) {
  var nt = Tn();
  Xi();
  iu();
  jh();
  sc();
  kS();
  Ci();
  cu();
  Zn();
  var um = function (e, n, r, s) {
      var buffer = nt.util.createBuffer(),
        y = e.length >> 1,
        b = y + (e.length & 1),
        substr = e.substr(0, b),
        substr_2 = e.substr(y, b),
        buffer_2 = nt.util.createBuffer(),
        create = nt.hmac.create();
      r = n + r;
      var ceil = Math.ceil(s / 16),
        ceil_2 = Math.ceil(s / 20);
      create.start("MD5", substr);
      var buffer_3 = nt.util.createBuffer();
      buffer_2.putBytes(r);
      for (var K = 0; K < ceil; ++K)
        (create.start(null, null),
          create.update(buffer_2.getBytes()),
          buffer_2.putBuffer(create.digest()),
          create.start(null, null),
          create.update(buffer_2.bytes() + r),
          buffer_3.putBuffer(create.digest()));
      create.start("SHA1", substr_2);
      var buffer_4 = nt.util.createBuffer();
      (buffer_2.clear(), buffer_2.putBytes(r));
      for (var K = 0; K < ceil_2; ++K)
        (create.start(null, null),
          create.update(buffer_2.getBytes()),
          buffer_2.putBuffer(create.digest()),
          create.start(null, null),
          create.update(buffer_2.bytes() + r),
          buffer_4.putBuffer(create.digest()));
      return (buffer.putBytes(nt.util.xorBytes(buffer_3.getBytes(), buffer_4.getBytes(), s)), buffer);
    },
    zG = function (e, n, r) {
      var create = nt.hmac.create();
      create.start("SHA1", e);
      var buffer = nt.util.createBuffer();
      return (
        buffer.putInt32(n[0]),
        buffer.putInt32(n[1]),
        buffer.putByte(r.type),
        buffer.putByte(r.version.major),
        buffer.putByte(r.version.minor),
        buffer.putInt16(r.length),
        buffer.putBytes(r.fragment.bytes()),
        create.update(buffer.getBytes()),
        create.digest().getBytes()
      );
    },
    QG = function (e, n, r) {
      var s = !1;
      try {
        var deflate = e.deflate(n.fragment.getBytes());
        ((n.fragment = nt.util.createBuffer(deflate)), (n.length = deflate.length), (s = !0));
      } catch (error) {}
      return s;
    },
    e6 = function (e, n, r) {
      var s = !1;
      try {
        var inflate = e.inflate(n.fragment.getBytes());
        ((n.fragment = nt.util.createBuffer(inflate)), (n.length = inflate.length), (s = !0));
      } catch (error) {}
      return s;
    },
    yi = function (e, n) {
      var r = 0;
      switch (n) {
        case 1:
          r = e.getByte();
          break;
        case 2:
          r = e.getInt16();
          break;
        case 3:
          r = e.getInt24();
          break;
        case 4:
          r = e.getInt32();
          break;
      }
      return nt.util.createBuffer(e.getBytes(r));
    },
    ki = function (e, n, r) {
      (e.putInt(r.length(), n << 3), e.putBuffer(r));
    },
    se = {};
  se.Versions = {
    TLS_1_0: { major: 3, minor: 1 },
    TLS_1_1: { major: 3, minor: 2 },
    TLS_1_2: { major: 3, minor: 3 },
  };
  se.SupportedVersions = [se.Versions.TLS_1_1, se.Versions.TLS_1_0];
  se.Version = se.SupportedVersions[0];
  se.MaxFragment = 15360;
  se.ConnectionEnd = { server: 0, client: 1 };
  se.PRFAlgorithm = { tls_prf_sha256: 0 };
  se.BulkCipherAlgorithm = { none: null, rc4: 0, des3: 1, aes: 2 };
  se.CipherType = { stream: 0, block: 1, aead: 2 };
  se.MACAlgorithm = { none: null, hmac_md5: 0, hmac_sha1: 1, hmac_sha256: 2, hmac_sha384: 3, hmac_sha512: 4 };
  se.CompressionMethod = { none: 0, deflate: 1 };
  se.ContentType = { change_cipher_spec: 20, alert: 21, handshake: 22, application_data: 23, heartbeat: 24 };
  se.HandshakeType = {
    hello_request: 0,
    client_hello: 1,
    server_hello: 2,
    certificate: 11,
    server_key_exchange: 12,
    certificate_request: 13,
    server_hello_done: 14,
    certificate_verify: 15,
    client_key_exchange: 16,
    finished: 20,
  };
  se.Alert = {};
  se.Alert.Level = { warning: 1, fatal: 2 };
  se.Alert.Description = {
    close_notify: 0,
    unexpected_message: 10,
    bad_record_mac: 20,
    decryption_failed: 21,
    record_overflow: 22,
    decompression_failure: 30,
    handshake_failure: 40,
    bad_certificate: 42,
    unsupported_certificate: 43,
    certificate_revoked: 44,
    certificate_expired: 45,
    certificate_unknown: 46,
    illegal_parameter: 47,
    unknown_ca: 48,
    access_denied: 49,
    decode_error: 50,
    decrypt_error: 51,
    export_restriction: 60,
    protocol_version: 70,
    insufficient_security: 71,
    internal_error: 80,
    user_canceled: 90,
    no_renegotiation: 100,
  };
  se.HeartbeatMessageType = { heartbeat_request: 1, heartbeat_response: 2 };
  se.CipherSuites = {};
  se.getCipherSuite = function (e) {
    var n = null;
    for (var key in se.CipherSuites) {
      var s = se.CipherSuites[key];
      if (s.id[0] === e.charCodeAt(0) && s.id[1] === e.charCodeAt(1)) {
        n = s;
        break;
      }
    }
    return n;
  };
  se.handleUnexpected = function (e, n) {
    var r = !e.open && e.entity === se.ConnectionEnd.client;
    if (!r)
      e.error(e, {
        message: "Unexpected message. Received TLS record out of order.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.unexpected_message },
      });
  };
  se.handleHelloRequest = function (e, n, r) {
    if (!e.handshaking && e.handshakes > 0)
      (se.queue(
        e,
        se.createAlert(e, {
          level: se.Alert.Level.warning,
          description: se.Alert.Description.no_renegotiation,
        }),
      ),
        se.flush(e));
    e.process();
  };
  se.parseHelloMessage = function (e, n, r) {
    var s = null,
      h = e.entity === se.ConnectionEnd.client;
    if (r < 38)
      e.error(e, {
        message: h
          ? "Invalid ServerHello message. Message too short."
          : "Invalid ClientHello message. Message too short.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    else {
      var fragment = n.fragment,
        b = fragment.length();
      if (
        ((s = {
          version: { major: fragment.getByte(), minor: fragment.getByte() },
          random: nt.util.createBuffer(fragment.getBytes(32)),
          session_id: yi(fragment, 1),
          extensions: [],
        }),
        h)
      )
        ((s.cipher_suite = fragment.getBytes(2)), (s.compression_method = fragment.getByte()));
      else ((s.cipher_suites = yi(fragment, 2)), (s.compression_methods = yi(fragment, 1)));
      if (((b = r - (b - fragment.length())), b > 0)) {
        var S = yi(fragment, 2);
        while (S.length() > 0) s.extensions.push({ type: [S.getByte(), S.getByte()], data: yi(S, 2) });
        if (!h)
          for (var w = 0; w < s.extensions.length; ++w) {
            var R = s.extensions[w];
            if (R.type[0] === 0 && R.type[1] === 0) {
              var D = yi(R.data, 2);
              while (D.length() > 0) {
                var byte = D.getByte();
                if (byte !== 0) break;
                e.session.extensions.server_name.serverNameList.push(yi(D, 2).getBytes());
              }
            }
          }
      }
      if (e.session.version) {
        if (s.version.major !== e.session.version.major || s.version.minor !== e.session.version.minor)
          return e.error(e, {
            message: "TLS version change is disallowed during renegotiation.",
            send: !0,
            alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.protocol_version },
          });
      }
      if (h) e.session.cipherSuite = se.getCipherSuite(s.cipher_suite);
      else {
        var buffer = nt.util.createBuffer(s.cipher_suites.bytes());
        while (buffer.length() > 0)
          if (
            ((e.session.cipherSuite = se.getCipherSuite(buffer.getBytes(2))), e.session.cipherSuite !== null)
          )
            break;
      }
      if (e.session.cipherSuite === null)
        return e.error(e, {
          message: "No cipher suites in common.",
          send: !0,
          alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.handshake_failure },
          cipherSuite: nt.util.bytesToHex(s.cipher_suite),
        });
      if (h) e.session.compressionMethod = s.compression_method;
      else e.session.compressionMethod = se.CompressionMethod.none;
    }
    return s;
  };
  se.createSecurityParameters = function (e, n) {
    var r = e.entity === se.ConnectionEnd.client,
      bytes = n.random.bytes(),
      h = r ? e.session.sp.client_random : bytes,
      y = r ? bytes : se.createRandom().getBytes();
    e.session.sp = {
      entity: e.entity,
      prf_algorithm: se.PRFAlgorithm.tls_prf_sha256,
      bulk_cipher_algorithm: null,
      cipher_type: null,
      enc_key_length: null,
      block_length: null,
      fixed_iv_length: null,
      record_iv_length: null,
      mac_algorithm: null,
      mac_length: null,
      mac_key_length: null,
      compression_algorithm: e.session.compressionMethod,
      pre_master_secret: null,
      master_secret: null,
      client_random: h,
      server_random: y,
    };
  };
  se.handleServerHello = function (e, n, r) {
    var helloMessage = se.parseHelloMessage(e, n, r);
    if (e.fail) return;
    if (helloMessage.version.minor <= e.version.minor) e.version.minor = helloMessage.version.minor;
    else
      return e.error(e, {
        message: "Incompatible TLS version.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.protocol_version },
      });
    e.session.version = e.version;
    var bytes = helloMessage.session_id.bytes();
    if (bytes.length > 0 && bytes === e.session.id)
      ((e.expect = DA),
        (e.session.resuming = !0),
        (e.session.sp.server_random = helloMessage.random.bytes()));
    else ((e.expect = n6), (e.session.resuming = !1), se.createSecurityParameters(e, helloMessage));
    ((e.session.id = bytes), e.process());
  };
  se.handleClientHello = function (e, n, r) {
    var helloMessage = se.parseHelloMessage(e, n, r);
    if (e.fail) return;
    var bytes = helloMessage.session_id.bytes(),
      y = null;
    if (e.sessionCache) {
      if (((y = e.sessionCache.getSession(bytes)), y === null)) bytes = "";
      else if (y.version.major !== helloMessage.version.major || y.version.minor > helloMessage.version.minor)
        ((y = null), (bytes = ""));
    }
    if (bytes.length === 0) bytes = nt.random.getBytes(32);
    if (
      ((e.session.id = bytes), (e.session.clientHelloVersion = helloMessage.version), (e.session.sp = {}), y)
    )
      ((e.version = e.session.version = y.version), (e.session.sp = y.sp));
    else {
      var b;
      for (var S = 1; S < se.SupportedVersions.length; ++S)
        if (((b = se.SupportedVersions[S]), b.minor <= helloMessage.version.minor)) break;
      ((e.version = { major: b.major, minor: b.minor }), (e.session.version = e.version));
    }
    if (y !== null)
      ((e.expect = LS),
        (e.session.resuming = !0),
        (e.session.sp.client_random = helloMessage.random.bytes()));
    else
      ((e.expect = e.verifyClient !== !1 ? c6 : PS),
        (e.session.resuming = !1),
        se.createSecurityParameters(e, helloMessage));
    if (
      ((e.open = !0),
      se.queue(e, se.createRecord(e, { type: se.ContentType.handshake, data: se.createServerHello(e) })),
      e.session.resuming)
    )
      (se.queue(
        e,
        se.createRecord(e, { type: se.ContentType.change_cipher_spec, data: se.createChangeCipherSpec() }),
      ),
        (e.state.pending = se.createConnectionState(e)),
        (e.state.current.write = e.state.pending.write),
        se.queue(e, se.createRecord(e, { type: se.ContentType.handshake, data: se.createFinished(e) })));
    else if (
      (se.queue(e, se.createRecord(e, { type: se.ContentType.handshake, data: se.createCertificate(e) })),
      !e.fail)
    ) {
      if (
        (se.queue(
          e,
          se.createRecord(e, { type: se.ContentType.handshake, data: se.createServerKeyExchange(e) }),
        ),
        e.verifyClient !== !1)
      )
        se.queue(
          e,
          se.createRecord(e, { type: se.ContentType.handshake, data: se.createCertificateRequest(e) }),
        );
      se.queue(e, se.createRecord(e, { type: se.ContentType.handshake, data: se.createServerHelloDone(e) }));
    }
    (se.flush(e), e.process());
  };
  se.handleCertificate = function (e, n, r) {
    if (r < 3)
      return e.error(e, {
        message: "Invalid Certificate message. Message too short.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    var fragment = n.fragment,
      h = { certificate_list: yi(fragment, 3) },
      y,
      b,
      S = [];
    try {
      while (h.certificate_list.length() > 0)
        ((y = yi(h.certificate_list, 3)),
          (b = nt.asn1.fromDer(y)),
          (y = nt.pki.certificateFromAsn1(b, !0)),
          S.push(y));
    } catch (error) {
      return e.error(e, {
        message: "Could not parse certificate list.",
        cause: error,
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.bad_certificate },
      });
    }
    var w = e.entity === se.ConnectionEnd.client;
    if ((w || e.verifyClient === !0) && S.length === 0)
      e.error(e, {
        message: w ? "No server certificate provided." : "No client certificate provided.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    else if (S.length === 0) e.expect = w ? NA : PS;
    else {
      if (w) e.session.serverCertificate = S[0];
      else e.session.clientCertificate = S[0];
      if (se.verifyCertificateChain(e, S)) e.expect = w ? NA : PS;
    }
    e.process();
  };
  se.handleServerKeyExchange = function (e, n, r) {
    if (r > 0)
      return e.error(e, {
        message: "Invalid key parameters. Only RSA is supported.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.unsupported_certificate },
      });
    ((e.expect = r6), e.process());
  };
  se.handleClientKeyExchange = function (e, n, r) {
    if (r < 48)
      return e.error(e, {
        message: "Invalid key parameters. Only RSA is supported.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.unsupported_certificate },
      });
    var fragment = n.fragment,
      h = { enc_pre_master_secret: yi(fragment, 2).getBytes() },
      y = null;
    if (e.getPrivateKey)
      try {
        ((y = e.getPrivateKey(e, e.session.serverCertificate)), (y = nt.pki.privateKeyFromPem(y)));
      } catch (error) {
        e.error(e, {
          message: "Could not get private key.",
          cause: error,
          send: !0,
          alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
        });
      }
    if (y === null)
      return e.error(e, {
        message: "No private key set.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
      });
    try {
      var sp = e.session.sp;
      sp.pre_master_secret = y.decrypt(h.enc_pre_master_secret);
      var clientHelloVersion = e.session.clientHelloVersion;
      if (
        clientHelloVersion.major !== sp.pre_master_secret.charCodeAt(0) ||
        clientHelloVersion.minor !== sp.pre_master_secret.charCodeAt(1)
      )
        throw Error("TLS version rollback attack detected.");
    } catch (error) {
      sp.pre_master_secret = nt.random.getBytes(48);
    }
    if (((e.expect = LS), e.session.clientCertificate !== null)) e.expect = u6;
    e.process();
  };
  se.handleCertificateRequest = function (e, n, r) {
    if (r < 3)
      return e.error(e, {
        message: "Invalid CertificateRequest. Message too short.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    var fragment = n.fragment,
      h = { certificate_types: yi(fragment, 1), certificate_authorities: yi(fragment, 2) };
    ((e.session.certificateRequest = h), (e.expect = s6), e.process());
  };
  se.handleCertificateVerify = function (e, n, r) {
    if (r < 2)
      return e.error(e, {
        message: "Invalid CertificateVerify. Message too short.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    var fragment = n.fragment;
    fragment.read -= 4;
    var bytes = fragment.bytes();
    fragment.read += 4;
    var y = { signature: yi(fragment, 2).getBytes() },
      buffer = nt.util.createBuffer();
    (buffer.putBuffer(e.session.md5.digest()),
      buffer.putBuffer(e.session.sha1.digest()),
      (buffer = buffer.getBytes()));
    try {
      var clientCertificate = e.session.clientCertificate;
      if (!clientCertificate.publicKey.verify(buffer, y.signature, "NONE"))
        throw Error("CertificateVerify signature does not match.");
      (e.session.md5.update(bytes), e.session.sha1.update(bytes));
    } catch (error) {
      return e.error(e, {
        message: "Bad signature in CertificateVerify.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.handshake_failure },
      });
    }
    ((e.expect = LS), e.process());
  };
  se.handleServerHelloDone = function (e, n, r) {
    if (r > 0)
      return e.error(e, {
        message: "Invalid ServerHelloDone message. Invalid length.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.record_overflow },
      });
    if (e.serverCertificate === null) {
      var s = {
          message: "No server certificate provided. Not enough security.",
          send: !0,
          alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.insufficient_security },
        },
        h = 0,
        verify = e.verify(e, s.alert.description, h, []);
      if (verify !== !0) {
        if (verify || verify === 0) {
          if (typeof verify === "object" && !nt.util.isArray(verify)) {
            if (verify.message) s.message = verify.message;
            if (verify.alert) s.alert.description = verify.alert;
          } else if (typeof verify === "number") s.alert.description = verify;
        }
        return e.error(e, s);
      }
    }
    if (e.session.certificateRequest !== null)
      ((n = se.createRecord(e, { type: se.ContentType.handshake, data: se.createCertificate(e) })),
        se.queue(e, n));
    ((n = se.createRecord(e, { type: se.ContentType.handshake, data: se.createClientKeyExchange(e) })),
      se.queue(e, n),
      (e.expect = a6));
    var b = function (S, w) {
      if (S.session.certificateRequest !== null && S.session.clientCertificate !== null)
        se.queue(
          S,
          se.createRecord(S, { type: se.ContentType.handshake, data: se.createCertificateVerify(S, w) }),
        );
      (se.queue(
        S,
        se.createRecord(S, { type: se.ContentType.change_cipher_spec, data: se.createChangeCipherSpec() }),
      ),
        (S.state.pending = se.createConnectionState(S)),
        (S.state.current.write = S.state.pending.write),
        se.queue(S, se.createRecord(S, { type: se.ContentType.handshake, data: se.createFinished(S) })),
        (S.expect = DA),
        se.flush(S),
        S.process());
    };
    if (e.session.certificateRequest === null || e.session.clientCertificate === null) return b(e, null);
    se.getClientSignature(e, b);
  };
  se.handleChangeCipherSpec = function (e, n) {
    if (n.fragment.getByte() !== 1)
      return e.error(e, {
        message: "Invalid ChangeCipherSpec message received.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.illegal_parameter },
      });
    var r = e.entity === se.ConnectionEnd.client;
    if ((e.session.resuming && r) || (!e.session.resuming && !r))
      e.state.pending = se.createConnectionState(e);
    if (
      ((e.state.current.read = e.state.pending.read),
      (!e.session.resuming && r) || (e.session.resuming && !r))
    )
      e.state.pending = null;
    ((e.expect = r ? i6 : d6), e.process());
  };
  se.handleFinished = function (e, n, r) {
    var fragment = n.fragment;
    fragment.read -= 4;
    var bytes = fragment.bytes();
    fragment.read += 4;
    var bytes_2 = n.fragment.getBytes();
    ((fragment = nt.util.createBuffer()),
      fragment.putBuffer(e.session.md5.digest()),
      fragment.putBuffer(e.session.sha1.digest()));
    var b = e.entity === se.ConnectionEnd.client,
      S = b ? "server finished" : "client finished",
      sp = e.session.sp,
      R = 12,
      D = um;
    if (((fragment = D(sp.master_secret, S, fragment.getBytes(), R)), fragment.getBytes() !== bytes_2))
      return e.error(e, {
        message: "Invalid verify_data in Finished message.",
        send: !0,
        alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.decrypt_error },
      });
    if (
      (e.session.md5.update(bytes),
      e.session.sha1.update(bytes),
      (e.session.resuming && b) || (!e.session.resuming && !b))
    )
      (se.queue(
        e,
        se.createRecord(e, { type: se.ContentType.change_cipher_spec, data: se.createChangeCipherSpec() }),
      ),
        (e.state.current.write = e.state.pending.write),
        (e.state.pending = null),
        se.queue(e, se.createRecord(e, { type: se.ContentType.handshake, data: se.createFinished(e) })));
    ((e.expect = b ? o6 : f6),
      (e.handshaking = !1),
      ++e.handshakes,
      (e.peerCertificate = b ? e.session.serverCertificate : e.session.clientCertificate),
      se.flush(e),
      (e.isConnected = !0),
      e.connected(e),
      e.process());
  };
  se.handleAlert = function (e, n) {
    var fragment = n.fragment,
      s = { level: fragment.getByte(), description: fragment.getByte() },
      h;
    switch (s.description) {
      case se.Alert.Description.close_notify:
        h = "Connection closed.";
        break;
      case se.Alert.Description.unexpected_message:
        h = "Unexpected message.";
        break;
      case se.Alert.Description.bad_record_mac:
        h = "Bad record MAC.";
        break;
      case se.Alert.Description.decryption_failed:
        h = "Decryption failed.";
        break;
      case se.Alert.Description.record_overflow:
        h = "Record overflow.";
        break;
      case se.Alert.Description.decompression_failure:
        h = "Decompression failed.";
        break;
      case se.Alert.Description.handshake_failure:
        h = "Handshake failure.";
        break;
      case se.Alert.Description.bad_certificate:
        h = "Bad certificate.";
        break;
      case se.Alert.Description.unsupported_certificate:
        h = "Unsupported certificate.";
        break;
      case se.Alert.Description.certificate_revoked:
        h = "Certificate revoked.";
        break;
      case se.Alert.Description.certificate_expired:
        h = "Certificate expired.";
        break;
      case se.Alert.Description.certificate_unknown:
        h = "Certificate unknown.";
        break;
      case se.Alert.Description.illegal_parameter:
        h = "Illegal parameter.";
        break;
      case se.Alert.Description.unknown_ca:
        h = "Unknown certificate authority.";
        break;
      case se.Alert.Description.access_denied:
        h = "Access denied.";
        break;
      case se.Alert.Description.decode_error:
        h = "Decode error.";
        break;
      case se.Alert.Description.decrypt_error:
        h = "Decrypt error.";
        break;
      case se.Alert.Description.export_restriction:
        h = "Export restriction.";
        break;
      case se.Alert.Description.protocol_version:
        h = "Unsupported protocol version.";
        break;
      case se.Alert.Description.insufficient_security:
        h = "Insufficient security.";
        break;
      case se.Alert.Description.internal_error:
        h = "Internal error.";
        break;
      case se.Alert.Description.user_canceled:
        h = "User canceled.";
        break;
      case se.Alert.Description.no_renegotiation:
        h = "Renegotiation not supported.";
        break;
      default:
        h = "Unknown error.";
        break;
    }
    if (s.description === se.Alert.Description.close_notify) return e.close();
    (e.error(e, {
      message: h,
      send: !1,
      origin: e.entity === se.ConnectionEnd.client ? "server" : "client",
      alert: s,
    }),
      e.process());
  };
  se.handleHandshake = function (e, n) {
    var fragment = n.fragment,
      byte = fragment.getByte(),
      int24 = fragment.getInt24();
    if (int24 > fragment.length())
      return ((e.fragmented = n), (n.fragment = nt.util.createBuffer()), (fragment.read -= 4), e.process());
    ((e.fragmented = null), (fragment.read -= 4));
    var bytes = fragment.bytes(int24 + 4);
    if (((fragment.read += 4), byte in cm[e.entity][e.expect])) {
      if (e.entity === se.ConnectionEnd.server && !e.open && !e.fail)
        ((e.handshaking = !0),
          (e.session = {
            version: null,
            extensions: { server_name: { serverNameList: [] } },
            cipherSuite: null,
            compressionMethod: null,
            serverCertificate: null,
            clientCertificate: null,
            md5: nt.md.md5.create(),
            sha1: nt.md.sha1.create(),
          }));
      if (
        byte !== se.HandshakeType.hello_request &&
        byte !== se.HandshakeType.certificate_verify &&
        byte !== se.HandshakeType.finished
      )
        (e.session.md5.update(bytes), e.session.sha1.update(bytes));
      cm[e.entity][e.expect][byte](e, n, int24);
    } else se.handleUnexpected(e, n);
  };
  se.handleApplicationData = function (e, n) {
    (e.data.putBuffer(n.fragment), e.dataReady(e), e.process());
  };
  se.handleHeartbeat = function (e, n) {
    var fragment = n.fragment,
      byte = fragment.getByte(),
      int16 = fragment.getInt16(),
      bytes = fragment.getBytes(int16);
    if (byte === se.HeartbeatMessageType.heartbeat_request) {
      if (e.handshaking || int16 > bytes.length) return e.process();
      (se.queue(
        e,
        se.createRecord(e, {
          type: se.ContentType.heartbeat,
          data: se.createHeartbeat(se.HeartbeatMessageType.heartbeat_response, bytes),
        }),
      ),
        se.flush(e));
    } else if (byte === se.HeartbeatMessageType.heartbeat_response) {
      if (bytes !== e.expectedHeartbeatPayload) return e.process();
      if (e.heartbeatReceived) e.heartbeatReceived(e, nt.util.createBuffer(bytes));
    }
    e.process();
  };
  var t6 = 0,
    n6 = 1,
    NA = 2,
    r6 = 3,
    s6 = 4,
    DA = 5,
    i6 = 6,
    o6 = 7,
    a6 = 8,
    l6 = 0,
    c6 = 1,
    PS = 2,
    u6 = 3,
    LS = 4,
    d6 = 5,
    f6 = 6,
    {
      handleUnexpected: handleUnexpected,
      handleChangeCipherSpec: handleChangeCipherSpec,
      handleAlert: handleAlert,
      handleHandshake: handleHandshake,
      handleApplicationData: handleApplicationData,
      handleHeartbeat: handleHeartbeat,
    } = se,
    BS = [];
  BS[se.ConnectionEnd.client] = [
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleChangeCipherSpec, handleAlert, handleUnexpected, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleApplicationData, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
  ];
  BS[se.ConnectionEnd.server] = [
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleChangeCipherSpec, handleAlert, handleUnexpected, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleApplicationData, handleHeartbeat],
    [handleUnexpected, handleAlert, handleHandshake, handleUnexpected, handleHeartbeat],
  ];
  var {
      handleHelloRequest: handleHelloRequest,
      handleServerHello: handleServerHello,
      handleCertificate: handleCertificate,
      handleServerKeyExchange: handleServerKeyExchange,
      handleCertificateRequest: handleCertificateRequest,
      handleServerHelloDone: handleServerHelloDone,
      handleFinished: handleFinished,
    } = se,
    cm = [];
  cm[se.ConnectionEnd.client] = [
    [
      handleUnexpected,
      handleUnexpected,
      handleServerHello,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleCertificate,
      handleServerKeyExchange,
      handleCertificateRequest,
      handleServerHelloDone,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleServerKeyExchange,
      handleCertificateRequest,
      handleServerHelloDone,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleCertificateRequest,
      handleServerHelloDone,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleServerHelloDone,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleFinished,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleHelloRequest,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
  ];
  var {
    handleClientHello: handleClientHello,
    handleClientKeyExchange: handleClientKeyExchange,
    handleCertificateVerify: handleCertificateVerify,
  } = se;
  cm[se.ConnectionEnd.server] = [
    [
      handleUnexpected,
      handleClientHello,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleCertificate,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleClientKeyExchange,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleCertificateVerify,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleFinished,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
    [
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
      handleUnexpected,
    ],
  ];
  se.generateKeys = function (e, n) {
    var r = um,
      s = n.client_random + n.server_random;
    if (!e.session.resuming)
      ((n.master_secret = r(n.pre_master_secret, "master secret", s, 48).bytes()),
        (n.pre_master_secret = null));
    s = n.server_random + n.client_random;
    var h = 2 * n.mac_key_length + 2 * n.enc_key_length,
      y = e.version.major === se.Versions.TLS_1_0.major && e.version.minor === se.Versions.TLS_1_0.minor;
    if (y) h += 2 * n.fixed_iv_length;
    var b = r(n.master_secret, "key expansion", s, h),
      S = {
        client_write_MAC_key: b.getBytes(n.mac_key_length),
        server_write_MAC_key: b.getBytes(n.mac_key_length),
        client_write_key: b.getBytes(n.enc_key_length),
        server_write_key: b.getBytes(n.enc_key_length),
      };
    if (y)
      ((S.client_write_IV = b.getBytes(n.fixed_iv_length)),
        (S.server_write_IV = b.getBytes(n.fixed_iv_length)));
    return S;
  };
  se.createConnectionState = function (e) {
    var n = e.entity === se.ConnectionEnd.client,
      r = function () {
        var y = {
          sequenceNumber: [0, 0],
          macKey: null,
          macLength: 0,
          macFunction: null,
          cipherState: null,
          cipherFunction: function (b) {
            return !0;
          },
          compressionState: null,
          compressFunction: function (b) {
            return !0;
          },
          updateSequenceNumber: function () {
            if (y.sequenceNumber[1] === 4294967295) ((y.sequenceNumber[1] = 0), ++y.sequenceNumber[0]);
            else ++y.sequenceNumber[1];
          },
        };
        return y;
      },
      s = { read: r(), write: r() };
    if (
      ((s.read.update = function (y, b) {
        if (!s.read.cipherFunction(b, s.read))
          y.error(y, {
            message: "Could not decrypt record or bad MAC.",
            send: !0,
            alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.bad_record_mac },
          });
        else if (!s.read.compressFunction(y, b, s.read))
          y.error(y, {
            message: "Could not decompress record.",
            send: !0,
            alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.decompression_failure },
          });
        return !y.fail;
      }),
      (s.write.update = function (y, b) {
        if (!s.write.compressFunction(y, b, s.write))
          y.error(y, {
            message: "Could not compress record.",
            send: !1,
            alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
          });
        else if (!s.write.cipherFunction(b, s.write))
          y.error(y, {
            message: "Could not encrypt record.",
            send: !1,
            alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
          });
        return !y.fail;
      }),
      e.session)
    ) {
      var sp = e.session.sp;
      switch (
        (e.session.cipherSuite.initSecurityParameters(sp),
        (sp.keys = se.generateKeys(e, sp)),
        (s.read.macKey = n ? sp.keys.server_write_MAC_key : sp.keys.client_write_MAC_key),
        (s.write.macKey = n ? sp.keys.client_write_MAC_key : sp.keys.server_write_MAC_key),
        e.session.cipherSuite.initConnectionState(s, e, sp),
        sp.compression_algorithm)
      ) {
        case se.CompressionMethod.none:
          break;
        case se.CompressionMethod.deflate:
          ((s.read.compressFunction = e6), (s.write.compressFunction = QG));
          break;
        default:
          throw Error("Unsupported compression algorithm.");
      }
    }
    return s;
  };
  se.createRandom = function () {
    var date = new Date(),
      n = +date + date.getTimezoneOffset() * 60000,
      buffer = nt.util.createBuffer();
    return (buffer.putInt32(n), buffer.putBytes(nt.random.getBytes(28)), buffer);
  };
  se.createRecord = function (e, n) {
    if (!n.data) return null;
    var r = {
      type: n.type,
      version: { major: e.version.major, minor: e.version.minor },
      length: n.data.length(),
      fragment: n.data,
    };
    return r;
  };
  se.createAlert = function (e, n) {
    var buffer = nt.util.createBuffer();
    return (
      buffer.putByte(n.level),
      buffer.putByte(n.description),
      se.createRecord(e, { type: se.ContentType.alert, data: buffer })
    );
  };
  se.createClientHello = function (e) {
    e.session.clientHelloVersion = { major: e.version.major, minor: e.version.minor };
    var buffer = nt.util.createBuffer();
    for (var r = 0; r < e.cipherSuites.length; ++r) {
      var s = e.cipherSuites[r];
      (buffer.putByte(s.id[0]), buffer.putByte(s.id[1]));
    }
    var h = buffer.length(),
      buffer_2 = nt.util.createBuffer();
    buffer_2.putByte(se.CompressionMethod.none);
    var b = buffer_2.length(),
      buffer_3 = nt.util.createBuffer();
    if (e.virtualHost) {
      var buffer_4 = nt.util.createBuffer();
      (buffer_4.putByte(0), buffer_4.putByte(0));
      var buffer_5 = nt.util.createBuffer();
      (buffer_5.putByte(0), ki(buffer_5, 2, nt.util.createBuffer(e.virtualHost)));
      var buffer_6 = nt.util.createBuffer();
      (ki(buffer_6, 2, buffer_5), ki(buffer_4, 2, buffer_6), buffer_3.putBuffer(buffer_4));
    }
    var O = buffer_3.length();
    if (O > 0) O += 2;
    var id = e.session.id,
      V = id.length + 1 + 2 + 4 + 28 + 2 + h + 1 + b + O,
      buffer_7 = nt.util.createBuffer();
    if (
      (buffer_7.putByte(se.HandshakeType.client_hello),
      buffer_7.putInt24(V),
      buffer_7.putByte(e.version.major),
      buffer_7.putByte(e.version.minor),
      buffer_7.putBytes(e.session.sp.client_random),
      ki(buffer_7, 1, nt.util.createBuffer(id)),
      ki(buffer_7, 2, buffer),
      ki(buffer_7, 1, buffer_2),
      O > 0)
    )
      ki(buffer_7, 2, buffer_3);
    return buffer_7;
  };
  se.createServerHello = function (e) {
    var id = e.session.id,
      r = id.length + 1 + 2 + 4 + 28 + 2 + 1,
      buffer = nt.util.createBuffer();
    return (
      buffer.putByte(se.HandshakeType.server_hello),
      buffer.putInt24(r),
      buffer.putByte(e.version.major),
      buffer.putByte(e.version.minor),
      buffer.putBytes(e.session.sp.server_random),
      ki(buffer, 1, nt.util.createBuffer(id)),
      buffer.putByte(e.session.cipherSuite.id[0]),
      buffer.putByte(e.session.cipherSuite.id[1]),
      buffer.putByte(e.session.compressionMethod),
      buffer
    );
  };
  se.createCertificate = function (e) {
    var n = e.entity === se.ConnectionEnd.client,
      r = null;
    if (e.getCertificate) {
      var s;
      if (n) s = e.session.certificateRequest;
      else s = e.session.extensions.server_name.serverNameList;
      r = e.getCertificate(e, s);
    }
    var buffer = nt.util.createBuffer();
    if (r !== null)
      try {
        if (!nt.util.isArray(r)) r = [r];
        var y = null;
        for (var b = 0; b < r.length; ++b) {
          var S = nt.pem.decode(r[b])[0];
          if (S.type !== "CERTIFICATE" && S.type !== "X509 CERTIFICATE" && S.type !== "TRUSTED CERTIFICATE") {
            var w = Error(
              'Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".',
            );
            throw ((w.headerType = S.type), w);
          }
          if (S.procType && S.procType.type === "ENCRYPTED")
            throw Error("Could not convert certificate from PEM; PEM is encrypted.");
          var buffer_2 = nt.util.createBuffer(S.body);
          if (y === null) y = nt.asn1.fromDer(buffer_2.bytes(), !1);
          var buffer_3 = nt.util.createBuffer();
          (ki(buffer_3, 3, buffer_2), buffer.putBuffer(buffer_3));
        }
        if (((r = nt.pki.certificateFromAsn1(y)), n)) e.session.clientCertificate = r;
        else e.session.serverCertificate = r;
      } catch (error) {
        return e.error(e, {
          message: "Could not send certificate list.",
          cause: error,
          send: !0,
          alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.bad_certificate },
        });
      }
    var O = 3 + buffer.length(),
      buffer_4 = nt.util.createBuffer();
    return (
      buffer_4.putByte(se.HandshakeType.certificate),
      buffer_4.putInt24(O),
      ki(buffer_4, 3, buffer),
      buffer_4
    );
  };
  se.createClientKeyExchange = function (e) {
    var buffer = nt.util.createBuffer();
    (buffer.putByte(e.session.clientHelloVersion.major),
      buffer.putByte(e.session.clientHelloVersion.minor),
      buffer.putBytes(nt.random.getBytes(46)));
    var sp = e.session.sp;
    sp.pre_master_secret = buffer.getBytes();
    var publicKey = e.session.serverCertificate.publicKey;
    buffer = publicKey.encrypt(sp.pre_master_secret);
    var h = buffer.length + 2,
      buffer_2 = nt.util.createBuffer();
    return (
      buffer_2.putByte(se.HandshakeType.client_key_exchange),
      buffer_2.putInt24(h),
      buffer_2.putInt16(buffer.length),
      buffer_2.putBytes(buffer),
      buffer_2
    );
  };
  se.createServerKeyExchange = function (e) {
    var n = 0,
      buffer = nt.util.createBuffer();
    if (n > 0) (buffer.putByte(se.HandshakeType.server_key_exchange), buffer.putInt24(n));
    return buffer;
  };
  se.getClientSignature = function (e, n) {
    var buffer = nt.util.createBuffer();
    (buffer.putBuffer(e.session.md5.digest()),
      buffer.putBuffer(e.session.sha1.digest()),
      (buffer = buffer.getBytes()),
      (e.getSignature =
        e.getSignature ||
        function (s, h, y) {
          var b = null;
          if (s.getPrivateKey)
            try {
              ((b = s.getPrivateKey(s, s.session.clientCertificate)), (b = nt.pki.privateKeyFromPem(b)));
            } catch (error) {
              s.error(s, {
                message: "Could not get private key.",
                cause: error,
                send: !0,
                alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
              });
            }
          if (b === null)
            s.error(s, {
              message: "No private key set.",
              send: !0,
              alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.internal_error },
            });
          else h = b.sign(h, null);
          y(s, h);
        }),
      e.getSignature(e, buffer, n));
  };
  se.createCertificateVerify = function (e, n) {
    var r = n.length + 2,
      buffer = nt.util.createBuffer();
    return (
      buffer.putByte(se.HandshakeType.certificate_verify),
      buffer.putInt24(r),
      buffer.putInt16(n.length),
      buffer.putBytes(n),
      buffer
    );
  };
  se.createCertificateRequest = function (e) {
    var buffer = nt.util.createBuffer();
    buffer.putByte(1);
    var buffer_2 = nt.util.createBuffer();
    for (var key in e.caStore.certs) {
      var h = e.caStore.certs[key],
        distinguishedNameToAsn1 = nt.pki.distinguishedNameToAsn1(h.subject),
        toDer = nt.asn1.toDer(distinguishedNameToAsn1);
      (buffer_2.putInt16(toDer.length()), buffer_2.putBuffer(toDer));
    }
    var S = 1 + buffer.length() + 2 + buffer_2.length(),
      buffer_3 = nt.util.createBuffer();
    return (
      buffer_3.putByte(se.HandshakeType.certificate_request),
      buffer_3.putInt24(S),
      ki(buffer_3, 1, buffer),
      ki(buffer_3, 2, buffer_2),
      buffer_3
    );
  };
  se.createServerHelloDone = function (e) {
    var buffer = nt.util.createBuffer();
    return (buffer.putByte(se.HandshakeType.server_hello_done), buffer.putInt24(0), buffer);
  };
  se.createChangeCipherSpec = function () {
    var buffer = nt.util.createBuffer();
    return (buffer.putByte(1), buffer);
  };
  se.createFinished = function (e) {
    var buffer = nt.util.createBuffer();
    (buffer.putBuffer(e.session.md5.digest()), buffer.putBuffer(e.session.sha1.digest()));
    var r = e.entity === se.ConnectionEnd.client,
      sp = e.session.sp,
      h = 12,
      y = um,
      b = r ? "client finished" : "server finished";
    buffer = y(sp.master_secret, b, buffer.getBytes(), h);
    var buffer_2 = nt.util.createBuffer();
    return (
      buffer_2.putByte(se.HandshakeType.finished),
      buffer_2.putInt24(buffer.length()),
      buffer_2.putBuffer(buffer),
      buffer_2
    );
  };
  se.createHeartbeat = function (e, n, r) {
    if (typeof r > "u") r = n.length;
    var buffer = nt.util.createBuffer();
    (buffer.putByte(e), buffer.putInt16(r), buffer.putBytes(n));
    var h = buffer.length(),
      max = Math.max(16, h - r - 3);
    return (buffer.putBytes(nt.random.getBytes(max)), buffer);
  };
  se.queue = function (e, n) {
    if (!n) return;
    if (n.fragment.length() === 0) {
      if (
        n.type === se.ContentType.handshake ||
        n.type === se.ContentType.alert ||
        n.type === se.ContentType.change_cipher_spec
      )
        return;
    }
    if (n.type === se.ContentType.handshake) {
      var bytes = n.fragment.bytes();
      (e.session.md5.update(bytes), e.session.sha1.update(bytes), (bytes = null));
    }
    var s;
    if (n.fragment.length() <= se.MaxFragment) s = [n];
    else {
      s = [];
      var bytes_2 = n.fragment.bytes();
      while (bytes_2.length > se.MaxFragment)
        (s.push(
          se.createRecord(e, { type: n.type, data: nt.util.createBuffer(bytes_2.slice(0, se.MaxFragment)) }),
        ),
          (bytes_2 = bytes_2.slice(se.MaxFragment)));
      if (bytes_2.length > 0)
        s.push(se.createRecord(e, { type: n.type, data: nt.util.createBuffer(bytes_2) }));
    }
    for (var y = 0; y < s.length && !e.fail; ++y) {
      var b = s[y],
        write = e.state.current.write;
      if (write.update(e, b)) e.records.push(b);
    }
  };
  se.flush = function (e) {
    for (var n = 0; n < e.records.length; ++n) {
      var r = e.records[n];
      (e.tlsData.putByte(r.type),
        e.tlsData.putByte(r.version.major),
        e.tlsData.putByte(r.version.minor),
        e.tlsData.putInt16(r.fragment.length()),
        e.tlsData.putBuffer(e.records[n].fragment));
    }
    return ((e.records = []), e.tlsDataReady(e));
  };
  var OS = function (e) {
      switch (e) {
        case !0:
          return !0;
        case nt.pki.certificateError.bad_certificate:
          return se.Alert.Description.bad_certificate;
        case nt.pki.certificateError.unsupported_certificate:
          return se.Alert.Description.unsupported_certificate;
        case nt.pki.certificateError.certificate_revoked:
          return se.Alert.Description.certificate_revoked;
        case nt.pki.certificateError.certificate_expired:
          return se.Alert.Description.certificate_expired;
        case nt.pki.certificateError.certificate_unknown:
          return se.Alert.Description.certificate_unknown;
        case nt.pki.certificateError.unknown_ca:
          return se.Alert.Description.unknown_ca;
        default:
          return se.Alert.Description.bad_certificate;
      }
    },
    y6 = function (e) {
      switch (e) {
        case !0:
          return !0;
        case se.Alert.Description.bad_certificate:
          return nt.pki.certificateError.bad_certificate;
        case se.Alert.Description.unsupported_certificate:
          return nt.pki.certificateError.unsupported_certificate;
        case se.Alert.Description.certificate_revoked:
          return nt.pki.certificateError.certificate_revoked;
        case se.Alert.Description.certificate_expired:
          return nt.pki.certificateError.certificate_expired;
        case se.Alert.Description.certificate_unknown:
          return nt.pki.certificateError.certificate_unknown;
        case se.Alert.Description.unknown_ca:
          return nt.pki.certificateError.unknown_ca;
        default:
          return nt.pki.certificateError.bad_certificate;
      }
    };
  se.verifyCertificateChain = function (e, n) {
    try {
      var r = {};
      for (var key in e.verifyOptions) r[key] = e.verifyOptions[key];
      ((r.verify = function (y, b, S) {
        var w = OS(y),
          verify = e.verify(e, y, b, S);
        if (verify !== !0) {
          if (typeof verify === "object" && !nt.util.isArray(verify)) {
            var D = Error("The application rejected the certificate.");
            if (
              ((D.send = !0),
              (D.alert = { level: se.Alert.Level.fatal, description: se.Alert.Description.bad_certificate }),
              verify.message)
            )
              D.message = verify.message;
            if (verify.alert) D.alert.description = verify.alert;
            throw D;
          }
          if (verify !== y) verify = y6(verify);
        }
        return verify;
      }),
        nt.pki.verifyCertificateChain(e.caStore, n, r));
    } catch (error) {
      var h = error;
      if (typeof h !== "object" || nt.util.isArray(h))
        h = { send: !0, alert: { level: se.Alert.Level.fatal, description: OS(error) } };
      if (!("send" in h)) h.send = !0;
      if (!("alert" in h)) h.alert = { level: se.Alert.Level.fatal, description: OS(h.error) };
      e.error(e, h);
    }
    return !e.fail;
  };
  se.createSessionCache = function (e, n) {
    var r = null;
    if (e && e.getSession && e.setSession && e.order) r = e;
    else {
      ((r = {}), (r.cache = e || {}), (r.capacity = Math.max(n || 100, 1)), (r.order = []));
      for (var key in e)
        if (r.order.length <= n) r.order.push(key);
        else delete e[key];
      ((r.getSession = function (h) {
        var y = null,
          b = null;
        if (h) b = nt.util.bytesToHex(h);
        else if (r.order.length > 0) b = r.order[0];
        if (b !== null && b in r.cache) {
          ((y = r.cache[b]), delete r.cache[b]);
          for (var key in r.order)
            if (r.order[key] === b) {
              r.order.splice(key, 1);
              break;
            }
        }
        return y;
      }),
        (r.setSession = function (h, y) {
          if (r.order.length === r.capacity) {
            var bytesToHex = r.order.shift();
            delete r.cache[bytesToHex];
          }
          var bytesToHex = nt.util.bytesToHex(h);
          (r.order.push(bytesToHex), (r.cache[bytesToHex] = y));
        }));
    }
    return r;
  };
  se.createConnection = function (e) {
    var n = null;
    if (e.caStore)
      if (nt.util.isArray(e.caStore)) n = nt.pki.createCaStore(e.caStore);
      else n = e.caStore;
    else n = nt.pki.createCaStore();
    var r = e.cipherSuites || null;
    if (r === null) {
      r = [];
      for (var key in se.CipherSuites) r.push(se.CipherSuites[key]);
    }
    var h = e.server ? se.ConnectionEnd.server : se.ConnectionEnd.client,
      y = e.sessionCache ? se.createSessionCache(e.sessionCache) : null,
      b = {
        version: { major: se.Version.major, minor: se.Version.minor },
        entity: h,
        sessionId: e.sessionId,
        caStore: n,
        sessionCache: y,
        cipherSuites: r,
        connected: e.connected,
        virtualHost: e.virtualHost || null,
        verifyClient: e.verifyClient || !1,
        verify:
          e.verify ||
          function (D, O, L, V) {
            return O;
          },
        verifyOptions: e.verifyOptions || {},
        getCertificate: e.getCertificate || null,
        getPrivateKey: e.getPrivateKey || null,
        getSignature: e.getSignature || null,
        input: nt.util.createBuffer(),
        tlsData: nt.util.createBuffer(),
        data: nt.util.createBuffer(),
        tlsDataReady: e.tlsDataReady,
        dataReady: e.dataReady,
        heartbeatReceived: e.heartbeatReceived,
        closed: e.closed,
        error: function (D, O) {
          if (((O.origin = O.origin || (D.entity === se.ConnectionEnd.client ? "client" : "server")), O.send))
            (se.queue(D, se.createAlert(D, O.alert)), se.flush(D));
          var L = O.fatal !== !1;
          if (L) D.fail = !0;
          if ((e.error(D, O), L)) D.close(!1);
        },
        deflate: e.deflate || null,
        inflate: e.inflate || null,
      };
    ((b.reset = function (D) {
      ((b.version = { major: se.Version.major, minor: se.Version.minor }),
        (b.record = null),
        (b.session = null),
        (b.peerCertificate = null),
        (b.state = { pending: null, current: null }),
        (b.expect = b.entity === se.ConnectionEnd.client ? t6 : l6),
        (b.fragmented = null),
        (b.records = []),
        (b.open = !1),
        (b.handshakes = 0),
        (b.handshaking = !1),
        (b.isConnected = !1),
        (b.fail = !(D || typeof D > "u")),
        b.input.clear(),
        b.tlsData.clear(),
        b.data.clear(),
        (b.state.current = se.createConnectionState(b)));
    }),
      b.reset());
    var S = function (D, O) {
        var L = O.type - se.ContentType.change_cipher_spec,
          V = BS[D.entity][D.expect];
        if (L in V) V[L](D, O);
        else se.handleUnexpected(D, O);
      },
      w = function (D) {
        var O = 0,
          input = D.input,
          V = input.length();
        if (V < 5) O = 5 - V;
        else {
          D.record = {
            type: input.getByte(),
            version: { major: input.getByte(), minor: input.getByte() },
            length: input.getInt16(),
            fragment: nt.util.createBuffer(),
            ready: !1,
          };
          var K = D.record.version.major === D.version.major;
          if (K && D.session && D.session.version) K = D.record.version.minor === D.version.minor;
          if (!K)
            D.error(D, {
              message: "Incompatible TLS version.",
              send: !0,
              alert: { level: se.Alert.Level.fatal, description: se.Alert.Description.protocol_version },
            });
        }
        return O;
      },
      R = function (D) {
        var O = 0,
          input = D.input,
          V = input.length();
        if (V < D.record.length) O = D.record.length - V;
        else {
          (D.record.fragment.putBytes(input.getBytes(D.record.length)), input.compact());
          var read = D.state.current.read;
          if (read.update(D, D.record)) {
            if (D.fragmented !== null)
              if (D.fragmented.type === D.record.type)
                (D.fragmented.fragment.putBuffer(D.record.fragment), (D.record = D.fragmented));
              else
                D.error(D, {
                  message: "Invalid fragmented record.",
                  send: !0,
                  alert: {
                    level: se.Alert.Level.fatal,
                    description: se.Alert.Description.unexpected_message,
                  },
                });
            D.record.ready = !0;
          }
        }
        return O;
      };
    return (
      (b.handshake = function (D) {
        if (b.entity !== se.ConnectionEnd.client)
          b.error(b, { message: "Cannot initiate handshake as a server.", fatal: !1 });
        else if (b.handshaking) b.error(b, { message: "Handshake already in progress.", fatal: !1 });
        else {
          if (b.fail && !b.open && b.handshakes === 0) b.fail = !1;
          ((b.handshaking = !0), (D = D || ""));
          var O = null;
          if (D.length > 0) {
            if (b.sessionCache) O = b.sessionCache.getSession(D);
            if (O === null) D = "";
          }
          if (D.length === 0 && b.sessionCache) {
            if (((O = b.sessionCache.getSession()), O !== null)) D = O.id;
          }
          if (
            ((b.session = {
              id: D,
              version: null,
              cipherSuite: null,
              compressionMethod: null,
              serverCertificate: null,
              certificateRequest: null,
              clientCertificate: null,
              sp: {},
              md5: nt.md.md5.create(),
              sha1: nt.md.sha1.create(),
            }),
            O)
          )
            ((b.version = O.version), (b.session.sp = O.sp));
          ((b.session.sp.client_random = se.createRandom().getBytes()),
            (b.open = !0),
            se.queue(
              b,
              se.createRecord(b, { type: se.ContentType.handshake, data: se.createClientHello(b) }),
            ),
            se.flush(b));
        }
      }),
      (b.process = function (D) {
        var O = 0;
        if (D) b.input.putBytes(D);
        if (!b.fail) {
          if (b.record !== null && b.record.ready && b.record.fragment.isEmpty()) b.record = null;
          if (b.record === null) O = w(b);
          if (!b.fail && b.record !== null && !b.record.ready) O = R(b);
          if (!b.fail && b.record !== null && b.record.ready) S(b, b.record);
        }
        return O;
      }),
      (b.prepare = function (D) {
        return (
          se.queue(
            b,
            se.createRecord(b, { type: se.ContentType.application_data, data: nt.util.createBuffer(D) }),
          ),
          se.flush(b)
        );
      }),
      (b.prepareHeartbeatRequest = function (D, O) {
        if (D instanceof nt.util.ByteBuffer) D = D.bytes();
        if (typeof O > "u") O = D.length;
        return (
          (b.expectedHeartbeatPayload = D),
          se.queue(
            b,
            se.createRecord(b, {
              type: se.ContentType.heartbeat,
              data: se.createHeartbeat(se.HeartbeatMessageType.heartbeat_request, D, O),
            }),
          ),
          se.flush(b)
        );
      }),
      (b.close = function (D) {
        if (!b.fail && b.sessionCache && b.session) {
          var O = { id: b.session.id, version: b.session.version, sp: b.session.sp };
          ((O.sp.keys = null), b.sessionCache.setSession(O.id, O));
        }
        if (b.open) {
          if (((b.open = !1), b.input.clear(), b.isConnected || b.handshaking))
            ((b.isConnected = b.handshaking = !1),
              se.queue(
                b,
                se.createAlert(b, {
                  level: se.Alert.Level.warning,
                  description: se.Alert.Description.close_notify,
                }),
              ),
              se.flush(b));
          b.closed(b);
        }
        b.reset(D);
      }),
      b
    );
  };
  UA.exports = nt.tls = nt.tls || {};
  for (wf in se) if (typeof se[wf] !== "function") nt.tls[wf] = se[wf];
  var wf;
  nt.tls.prf_tls1 = um;
  nt.tls.hmac_sha1 = zG;
  nt.tls.createSessionCache = se.createSessionCache;
  nt.tls.createConnection = se.createConnection;
});

export { US };
