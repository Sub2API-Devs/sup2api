/**
 * zod/v4/core/regexes.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:116076-123392 cjs-fingerprint
var Ul = x(function (q) {
  var SZ =
      (q && q.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    kZ =
      (q && q.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    EZ =
      (q && q.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) SZ(t, e, key);
        }
        return (kZ(t, e), t);
      };
  Object.defineProperty(q, "__esModule", { value: !0 });
  q.sha1_base64url =
    q.sha1_base64 =
    q.sha1_hex =
    q.md5_base64url =
    q.md5_base64 =
    q.md5_hex =
    q.hex =
    q.uppercase =
    q.lowercase =
    q.undefined =
    q.null =
    q.boolean =
    q.number =
    q.integer =
    q.bigint =
    q.string =
    q.anyString =
    q.date =
    q.iban =
    q.creditCard =
    q.e164 =
    q.httpProtocol =
    q.domain =
    q.hostname =
    q.base64url =
    q.base64 =
    q.cidrv6 =
    q.cidrv4 =
    q.mac =
    q.ipv6 =
    q.ipv4 =
    q.browserEmail =
    q.idnEmail =
    q.unicodeEmail =
    q.rfc5322Email =
    q.html5Email =
    q.email =
    q.uuid7 =
    q.uuid6 =
    q.uuid4 =
    q.uuid =
    q.guid =
    q.extendedDuration =
    q.duration =
    q.nanoid =
    q.ksuid =
    q.xid =
    q.ulid =
    q.cuid2 =
    q.cuid =
      void 0;
  q.sha512_base64url =
    q.sha512_base64 =
    q.sha512_hex =
    q.sha384_base64url =
    q.sha384_base64 =
    q.sha384_hex =
    q.sha256_base64url =
    q.sha256_base64 =
    q.sha256_hex =
      void 0;
  q.nanoidOfLength = AZ;
  q.emoji = TZ;
  q.time = DZ;
  q.datetime = MZ;
  var PZ = EZ(Ee());
  q.cuid = /^[cC][0-9a-z]{6,}$/;
  q.cuid2 = /^[0-9a-z]+$/;
  q.ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
  q.xid = /^[0-9a-vA-V]{20}$/;
  q.ksuid = /^[A-Za-z0-9]{27}$/;
  q.nanoid = /^[a-zA-Z0-9_-]{21}$/;
  function AZ(e) {
    return new RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
  }
  q.duration =
    /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  q.extendedDuration =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  q.guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var IZ = (e) => {
    if (!e)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(
      `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
    );
  };
  q.uuid = IZ;
  q.uuid4 = (0, q.uuid)(4);
  q.uuid6 = (0, q.uuid)(6);
  q.uuid7 = (0, q.uuid)(7);
  q.email =
    /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  q.html5Email =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  q.rfc5322Email =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  q.unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  q.idnEmail = q.unicodeEmail;
  q.browserEmail =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var CZ =
    "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
  function TZ() {
    return new RegExp(CZ, "u");
  }
  q.ipv4 =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  q.ipv6 =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var $Z = (e) => {
    let escapeRegex = PZ.escapeRegex(e ?? ":");
    return new RegExp(
      `^(?:[0-9A-F]{2}${escapeRegex}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapeRegex}){5}[0-9a-f]{2}$`,
    );
  };
  q.mac = $Z;
  q.cidrv4 =
    /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  q.cidrv6 =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  q.base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  q.base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
  q.hostname =
    /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  q.domain = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  q.httpProtocol = /^https?$/;
  q.e164 = /^\+[1-9]\d{6,14}$/;
  q.creditCard = /^\d(?:[ -]?\d){11,18}$/;
  q.iban = /^[A-Z]{2}(?!00|01|99)\d{2}[A-Z0-9]{11,30}$/;
  var uP =
    "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
  function RZ(e) {
    return new RegExp(`^${e}$`);
  }
  q.date = RZ(uP);
  function T_(e) {
    return typeof e.precision === "number"
      ? e.precision === -1
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d"
        : e.precision === 0
          ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d"
          : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${e.precision}}`
      : e.seconds
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?"
        : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
  }
  function DZ(e) {
    return new RegExp(`^${T_(e)}$`);
  }
  function MZ(e) {
    let t = ["Z"];
    if (e.offset) t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
    let n = `${T_({ precision: e.precision, seconds: !0 })}(?:${t.join("|")})`,
      o = e.local ? `${n}|${T_({ precision: e.precision })}` : n;
    return new RegExp(`^${uP}T(?:${o})$`);
  }
  q.anyString = /^[\s\S]{0,}$/;
  var jZ = (e) => {
    let t = e ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ""}}` : "[\\s\\S]*";
    return new RegExp(`^${t}$`);
  };
  q.string = jZ;
  q.bigint = /^-?\d+n?$/;
  q.integer = /^-?\d+$/;
  q.number = /^-?\d+(?:\.\d+)?$/;
  q.boolean = /^(?:true|false)$/i;
  var xZ = /^null$/i;
  q.null = xZ;
  var LZ = /^undefined$/i;
  q.undefined = LZ;
  q.lowercase = /^[^A-Z]*$/;
  q.uppercase = /^[^a-z]*$/;
  q.hex = /^[0-9a-fA-F]*$/;
  function Zu(e, t) {
    return new RegExp(`^[A-Za-z0-9+/]{${e}}${t}$`);
  }
  function Vu(e) {
    return new RegExp(`^[A-Za-z0-9_-]{${e}}$`);
  }
  q.md5_hex = /^[0-9a-fA-F]{32}$/;
  q.md5_base64 = Zu(22, "==");
  q.md5_base64url = Vu(22);
  q.sha1_hex = /^[0-9a-fA-F]{40}$/;
  q.sha1_base64 = Zu(27, "=");
  q.sha1_base64url = Vu(27);
  q.sha256_hex = /^[0-9a-fA-F]{64}$/;
  q.sha256_base64 = Zu(43, "=");
  q.sha256_base64url = Vu(43);
  q.sha384_hex = /^[0-9a-fA-F]{96}$/;
  q.sha384_base64 = Zu(64, "");
  q.sha384_base64url = Vu(64);
  q.sha512_hex = /^[0-9a-fA-F]{128}$/;
  q.sha512_base64 = Zu(86, "==");
  q.sha512_base64url = Vu(86);
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(q);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(q, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(q, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(q);
  })();
});

export { Ul };
