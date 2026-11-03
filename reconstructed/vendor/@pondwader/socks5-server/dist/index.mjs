/**
 * @pondwader/socks5-server/dist/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @pondwader/socks5-server@1.0.10
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-fingerprint 4
 */
import net, { default as net_2 } from "net";

//@ chunk-fq0cr76a.js:694208-697469 esm-fingerprint
var gR = ((e) => ((e[(e.connect = 1)] = "connect"), (e[(e.bind = 2)] = "bind"), (e[(e.udp = 3)] = "udp"), e))(
    gR || {},
  ),
  AE = ((e) => (
    (e[(e.REQUEST_GRANTED = 0)] = "REQUEST_GRANTED"),
    (e[(e.GENERAL_FAILURE = 1)] = "GENERAL_FAILURE"),
    (e[(e.CONNECTION_NOT_ALLOWED = 2)] = "CONNECTION_NOT_ALLOWED"),
    (e[(e.NETWORK_UNREACHABLE = 3)] = "NETWORK_UNREACHABLE"),
    (e[(e.HOST_UNREACHABLE = 4)] = "HOST_UNREACHABLE"),
    (e[(e.CONNECTION_REFUSED = 5)] = "CONNECTION_REFUSED"),
    (e[(e.TTL_EXPIRED = 6)] = "TTL_EXPIRED"),
    (e[(e.COMMAND_NOT_SUPPORTED = 7)] = "COMMAND_NOT_SUPPORTED"),
    (e[(e.ADDRESS_TYPE_NOT_SUPPORTED = 8)] = "ADDRESS_TYPE_NOT_SUPPORTED"),
    e
  ))(AE || {}),
  _H = class {
    constructor(e, n) {
      ((this.errorHandler = () => {}),
        (this.metadata = {}),
        (this.socket = n),
        (this.server = e),
        n.on("error", this.errorHandler),
        n.pause(),
        this.handleGreeting());
    }
    readBytes(e) {
      return new Promise((n) => {
        let allocUnsafe = Buffer.allocUnsafe(e),
          s = 0,
          h = (y) => {
            let min = Math.min(y.length, e - s);
            if ((y.copy(allocUnsafe, s, 0, min), (s += min), s < e)) return;
            (this.socket.removeListener("data", h),
              this.socket.push(y.subarray(min)),
              n(allocUnsafe),
              this.socket.pause());
          };
        (this.socket.on("data", h), this.socket.resume());
      });
    }
    async handleGreeting() {
      if ((await this.readBytes(1)).readUInt8() !== 5) return this.socket.destroy();
      let uInt8 = (await this.readBytes(1)).readUInt8();
      if (uInt8 > 128 || uInt8 === 0) return this.socket.destroy();
      let bytes = await this.readBytes(uInt8),
        s = this.server.authHandler ? 2 : 0;
      if (!bytes.includes(s)) return (this.socket.write(Buffer.from([5, 255])), this.socket.destroy());
      if ((this.socket.write(Buffer.from([5, s])), this.server.authHandler)) this.handleUserPassword();
      else this.handleConnectionRequest();
    }
    async handleUserPassword() {
      await this.readBytes(1);
      let uint8 = (await this.readBytes(1)).readUint8(),
        str = (await this.readBytes(uint8)).toString(),
        uint8_2 = (await this.readBytes(1)).readUint8(),
        str_2 = (await this.readBytes(uint8_2)).toString();
      ((this.username = str), (this.password = str_2));
      let h = !1,
        y = () => {
          if (h) return;
          ((h = !0), this.socket.write(Buffer.from([1, 0])), this.handleConnectionRequest());
        },
        b = () => {
          if (h) return;
          ((h = !0), this.socket.write(Buffer.from([1, 1])), this.socket.destroy());
        },
        authHandler = await this.server.authHandler(this, y, b);
      if (authHandler === !0) y();
      else if (authHandler === !1) b();
    }
    async handleConnectionRequest() {
      await this.readBytes(1);
      let e = (await this.readBytes(1))[0],
        n = gR[e];
      if (!n) return this.socket.destroy();
      ((this.command = n), await this.readBytes(1));
      let uInt8 = (await this.readBytes(1)).readUInt8(),
        s = "";
      switch (uInt8) {
        case 1:
          s = (await this.readBytes(4)).join(".");
          break;
        case 3:
          let uInt8 = (await this.readBytes(1)).readUInt8();
          s = (await this.readBytes(uInt8)).toString();
          break;
        case 4:
          let bytes = await this.readBytes(16);
          for (let O = 0; O < 16; O++) {
            if (O % 2 === 0 && O > 0) s += ":";
            s += `${bytes[O] < 16 ? "0" : ""}${bytes[O].toString(16)}`;
          }
          break;
        default:
          this.socket.destroy();
          return;
      }
      let uInt16BE = (await this.readBytes(2)).readUInt16BE();
      if (!this.server.supportedCommands.has(n))
        return (this.socket.write(Buffer.from([5, 7])), this.socket.destroy());
      ((this.destAddress = s), (this.destPort = uInt16BE));
      let y = !1,
        b = () => {
          if (y) return;
          ((y = !0), this.connect());
        };
      if (!this.server.rulesetValidator) return b();
      let S = () => {
          if (y) return;
          ((y = !0), this.socket.write(Buffer.from([5, 2, 0, 1, 0, 0, 0, 0, 0, 0])), this.socket.destroy());
        },
        rulesetValidator = await this.server.rulesetValidator(this, b, S);
      if (rulesetValidator === !0) b();
      else if (rulesetValidator === !1) S();
    }
    connect() {
      (this.socket.removeListener("error", this.errorHandler),
        this.server.connectionHandler(this, (e) => {
          if (AE[e] === void 0) throw Error(`"${e}" is not a valid status.`);
          if ((this.socket.write(Buffer.from([5, AE[e], 0, 1, 0, 0, 0, 0, 0, 0])), e !== "REQUEST_GRANTED"))
            this.socket.destroy();
        }),
        this.socket.resume());
    }
  };
//@ chunk-fq0cr76a.js:697469-698080 esm-fingerprint
function mR(e, n) {
  if (e.command !== "connect") return n("COMMAND_NOT_SUPPORTED");
  e.socket.on("error", () => {});
  let connection = net_2.createConnection({ host: e.destAddress, port: e.destPort });
  connection.setNoDelay();
  let s = !1;
  return (
    connection.on("error", (h) => {
      if (!s)
        switch (h.code) {
          case "EINVAL":
          case "ENOENT":
          case "ENOTFOUND":
          case "ETIMEDOUT":
          case "EADDRNOTAVAIL":
          case "EHOSTUNREACH":
            n("HOST_UNREACHABLE");
            break;
          case "ENETUNREACH":
            n("NETWORK_UNREACHABLE");
            break;
          case "ECONNREFUSED":
            n("CONNECTION_REFUSED");
            break;
          default:
            n("GENERAL_FAILURE");
        }
    }),
    connection.on("ready", () => {
      ((s = !0), n("REQUEST_GRANTED"), e.socket.pipe(connection).pipe(e.socket));
    }),
    e.socket.on("close", () => connection.destroy()),
    connection
  );
}
//@ chunk-fq0cr76a.js:698080-698757 esm-fingerprint
var wH = class {
  constructor() {
    ((this.supportedCommands = new Set(["connect"])),
      (this.connectionHandler = mR),
      (this.server = net.createServer((e) => {
        (e.setNoDelay(), this._handleConnection(e));
      })));
  }
  listen(...e) {
    return (this.server.listen(...e), this);
  }
  close(e) {
    return (this.server.close(e), this);
  }
  setAuthHandler(e) {
    return ((this.authHandler = e), this);
  }
  disableAuthHandler() {
    return ((this.authHandler = void 0), this);
  }
  setRulesetValidator(e) {
    return ((this.rulesetValidator = e), this);
  }
  disableRulesetValidator() {
    return ((this.rulesetValidator = void 0), this);
  }
  setConnectionHandler(e) {
    return ((this.connectionHandler = e), this);
  }
  useDefaultConnectionHandler() {
    return ((this.connectionHandler = mR), this);
  }
  _handleConnection(e) {
    return (new _H(this, e), this);
  }
};
//@ chunk-fq0cr76a.js:698757-698926 esm-fingerprint
function yR(e) {
  let n = new wH();
  if (e?.auth) n.setAuthHandler((r) => r.username === e.auth.username && r.password === e.auth.password);
  if (e?.port) n.listen(e.port, e.hostname);
  return n;
}

export { yR };
