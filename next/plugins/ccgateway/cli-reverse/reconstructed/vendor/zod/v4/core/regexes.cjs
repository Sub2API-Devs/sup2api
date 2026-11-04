/**
 * zod/v4/core/regexes.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:116076-123392 cjs-fingerprint
var require_regexes = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.sha1_base64url =
    cjsExports.sha1_base64 =
    cjsExports.sha1_hex =
    cjsExports.md5_base64url =
    cjsExports.md5_base64 =
    cjsExports.md5_hex =
    cjsExports.hex =
    cjsExports.uppercase =
    cjsExports.lowercase =
    cjsExports.undefined =
    cjsExports.null =
    cjsExports.boolean =
    cjsExports.number =
    cjsExports.integer =
    cjsExports.bigint =
    cjsExports.string =
    cjsExports.anyString =
    cjsExports.date =
    cjsExports.iban =
    cjsExports.creditCard =
    cjsExports.e164 =
    cjsExports.httpProtocol =
    cjsExports.domain =
    cjsExports.hostname =
    cjsExports.base64url =
    cjsExports.base64 =
    cjsExports.cidrv6 =
    cjsExports.cidrv4 =
    cjsExports.mac =
    cjsExports.ipv6 =
    cjsExports.ipv4 =
    cjsExports.browserEmail =
    cjsExports.idnEmail =
    cjsExports.unicodeEmail =
    cjsExports.rfc5322Email =
    cjsExports.html5Email =
    cjsExports.email =
    cjsExports.uuid7 =
    cjsExports.uuid6 =
    cjsExports.uuid4 =
    cjsExports.uuid =
    cjsExports.guid =
    cjsExports.extendedDuration =
    cjsExports.duration =
    cjsExports.nanoid =
    cjsExports.ksuid =
    cjsExports.xid =
    cjsExports.ulid =
    cjsExports.cuid2 =
    cjsExports.cuid =
      undefined;
  cjsExports.sha512_base64url =
    cjsExports.sha512_base64 =
    cjsExports.sha512_hex =
    cjsExports.sha384_base64url =
    cjsExports.sha384_base64 =
    cjsExports.sha384_hex =
    cjsExports.sha256_base64url =
    cjsExports.sha256_base64 =
    cjsExports.sha256_hex =
      undefined;
  cjsExports.nanoidOfLength = nanoidOfLength;
  cjsExports.emoji = emoji;
  cjsExports.time = time;
  cjsExports.datetime = datetime;
  var util = __importStar(require_util());
  cjsExports.cuid = /^[cC][0-9a-z]{6,}$/;
  cjsExports.cuid2 = /^[0-9a-z]+$/;
  cjsExports.ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
  cjsExports.xid = /^[0-9a-vA-V]{20}$/;
  cjsExports.ksuid = /^[A-Za-z0-9]{27}$/;
  cjsExports.nanoid = /^[a-zA-Z0-9_-]{21}$/;
  function nanoidOfLength(length) {
    return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
  }
  cjsExports.duration =
    /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  cjsExports.extendedDuration =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  cjsExports.guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var uuid = (version) => {
    if (!version)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(
      `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
    );
  };
  cjsExports.uuid = uuid;
  cjsExports.uuid4 = (0, cjsExports.uuid)(4);
  cjsExports.uuid6 = (0, cjsExports.uuid)(6);
  cjsExports.uuid7 = (0, cjsExports.uuid)(7);
  cjsExports.email =
    /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  cjsExports.html5Email =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  cjsExports.rfc5322Email =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  cjsExports.unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  cjsExports.idnEmail = cjsExports.unicodeEmail;
  cjsExports.browserEmail =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var _emoji =
    "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
  function emoji() {
    return new RegExp(_emoji, "u");
  }
  cjsExports.ipv4 =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  cjsExports.ipv6 =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var mac = (delimiter) => {
    let escapedDelim = util.escapeRegex(delimiter ?? ":");
    return new RegExp(
      `^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`,
    );
  };
  cjsExports.mac = mac;
  cjsExports.cidrv4 =
    /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  cjsExports.cidrv6 =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  cjsExports.base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  cjsExports.base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
  cjsExports.hostname =
    /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  cjsExports.domain = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  cjsExports.httpProtocol = /^https?$/;
  cjsExports.e164 = /^\+[1-9]\d{6,14}$/;
  cjsExports.creditCard = /^\d(?:[ -]?\d){11,18}$/;
  cjsExports.iban = /^[A-Z]{2}(?!00|01|99)\d{2}[A-Z0-9]{11,30}$/;
  var dateSource =
    "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
  function anchor(source) {
    return new RegExp(`^${source}$`);
  }
  cjsExports.date = anchor(dateSource);
  function timeSource(args) {
    return typeof args.precision === "number"
      ? args.precision === -1
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d"
        : args.precision === 0
          ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d"
          : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${args.precision}}`
      : args.seconds
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?"
        : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
  }
  function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime(args) {
    let opts = ["Z"];
    if (args.offset) opts.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
    let qualified = `${timeSource({
      precision: args.precision,
      seconds: true,
    })}(?:${opts.join("|")})`;
    let timeRegex = args.local
      ? `${qualified}|${timeSource({
          precision: args.precision,
        })}`
      : qualified;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  cjsExports.anyString = /^[\s\S]{0,}$/;
  var string = (params) => {
    let regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : "[\\s\\S]*";
    return new RegExp(`^${regex}$`);
  };
  cjsExports.string = string;
  cjsExports.bigint = /^-?\d+n?$/;
  cjsExports.integer = /^-?\d+$/;
  cjsExports.number = /^-?\d+(?:\.\d+)?$/;
  cjsExports.boolean = /^(?:true|false)$/i;
  var _null = /^null$/i;
  cjsExports.null = _null;
  var _undefined = /^undefined$/i;
  cjsExports.undefined = _undefined;
  cjsExports.lowercase = /^[^A-Z]*$/;
  cjsExports.uppercase = /^[^a-z]*$/;
  cjsExports.hex = /^[0-9a-fA-F]*$/;
  function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
  }
  function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
  }
  cjsExports.md5_hex = /^[0-9a-fA-F]{32}$/;
  cjsExports.md5_base64 = fixedBase64(22, "==");
  cjsExports.md5_base64url = fixedBase64url(22);
  cjsExports.sha1_hex = /^[0-9a-fA-F]{40}$/;
  cjsExports.sha1_base64 = fixedBase64(27, "=");
  cjsExports.sha1_base64url = fixedBase64url(27);
  cjsExports.sha256_hex = /^[0-9a-fA-F]{64}$/;
  cjsExports.sha256_base64 = fixedBase64(43, "=");
  cjsExports.sha256_base64url = fixedBase64url(43);
  cjsExports.sha384_hex = /^[0-9a-fA-F]{96}$/;
  cjsExports.sha384_base64 = fixedBase64(64, "");
  cjsExports.sha384_base64url = fixedBase64url(64);
  cjsExports.sha512_hex = /^[0-9a-fA-F]{128}$/;
  cjsExports.sha512_base64 = fixedBase64(86, "==");
  cjsExports.sha512_base64url = fixedBase64url(86);
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_regexes };
