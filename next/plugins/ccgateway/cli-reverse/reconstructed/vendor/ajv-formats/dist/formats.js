/**
 * ajv-formats/dist/formats.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-efaj9q04.js (1), chunk-qq5knpkd.js (1)
 * attribution: cjs-fingerprint 2
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import {
  initModule,
  interopDefault,
} from "../../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";
import {
  require_ref_error,
  require_code_2,
  require_codegen,
  require_names,
  require_compile,
  require_util,
  require_fast_deep_equal,
  require_dataType,
  require_validate,
  require_core,
  require_validation_error,
} from "../../ajv/dist/core.js";

//@ chunk-efaj9q04.js:416-8167 cjs-fingerprint
var require_formats = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.formatNames = cjsExports.fastFormats = cjsExports.fullFormats = undefined;
  function fmtDef(validate, compare) {
    return {
      validate,
      compare,
    };
  }
  cjsExports.fullFormats = {
    date: fmtDef(date, compareDate),
    time: fmtDef(getTime(true), compareTime),
    "date-time": fmtDef(getDateTime(true), compareDateTime),
    "iso-time": fmtDef(getTime(), compareIsoTime),
    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri,
    "uri-reference":
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    "uri-template":
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email:
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname:
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    byte,
    int32: {
      type: "number",
      validate: validateInt32,
    },
    int64: {
      type: "number",
      validate: validateInt64,
    },
    float: {
      type: "number",
      validate: validateNumber,
    },
    double: {
      type: "number",
      validate: validateNumber,
    },
    password: true,
    binary: true,
  };
  cjsExports.fastFormats = {
    ...cjsExports.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
    "date-time": fmtDef(
      /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
      compareDateTime,
    ),
    "iso-time": fmtDef(
      /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      compareIsoTime,
    ),
    "iso-date-time": fmtDef(
      /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      compareIsoDateTime,
    ),
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    email:
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  };
  cjsExports.formatNames = Object.keys(cjsExports.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(str) {
    let matches = DATE.exec(str);
    if (!matches) return false;
    let year = +matches[1];
    let month = +matches[2];
    let day = +matches[3];
    return (
      month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month])
    );
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2)) return;
    if (d1 > d2) return 1;
    if (d1 < d2) return -1;
    return 0;
  }
  var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function getTime(strictTimeZone) {
    return function (str) {
      let matches = TIME.exec(str);
      if (!matches) return false;
      let hr = +matches[1];
      let min = +matches[2];
      let sec = +matches[3];
      let tz = matches[4];
      let tzSign = matches[5] === "-" ? -1 : 1;
      let tzH = +(matches[6] || 0);
      let tzM = +(matches[7] || 0);
      if (tzH > 23 || tzM > 59 || (strictTimeZone && !tz)) return false;
      if (hr <= 23 && min <= 59 && sec < 60) return true;
      let utcMin = min - tzM * tzSign;
      let utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
      return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
    };
  }
  function compareTime(s1, s2) {
    if (!(s1 && s2)) return;
    let t1 = new Date("2020-01-01T" + s1).valueOf();
    let t2 = new Date("2020-01-01T" + s2).valueOf();
    if (!(t1 && t2)) return;
    return t1 - t2;
  }
  function compareIsoTime(t1, t2) {
    if (!(t1 && t2)) return;
    let a1 = TIME.exec(t1);
    let a2 = TIME.exec(t2);
    if (!(a1 && a2)) return;
    t1 = a1[1] + a1[2] + a1[3];
    t2 = a2[1] + a2[2] + a2[3];
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
    return 0;
  }
  var DATE_TIME_SEPARATOR = /t|\s/i;
  function getDateTime(strictTimeZone) {
    let time = getTime(strictTimeZone);
    return function (str) {
      let dateTime = str.split(DATE_TIME_SEPARATOR);
      return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
    };
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return;
    let d1 = new Date(dt1).valueOf();
    let d2 = new Date(dt2).valueOf();
    if (!(d1 && d2)) return;
    return d1 - d2;
  }
  function compareIsoDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return;
    let [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    let [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    let res = compareDate(d1, d2);
    if (res === undefined) return;
    return res || compareTime(t1, t2);
  }
  var NOT_URI_FRAGMENT = /\/|:/;
  var URI =
    /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }
  var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
  }
  var MIN_INT32 = -2147483648;
  var MAX_INT32 = 2147483647;
  function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  }
  function validateInt64(value) {
    return Number.isInteger(value);
  }
  function validateNumber() {
    return true;
  }
  var Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str)) return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
});
//@ chunk-qq5knpkd.js:202245-260247 cjs-fingerprint
var require_id = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let def = {
    keyword: "id",
    code() {
      throw Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
    },
  };
  cjsExports.default = def;
});
var require_ref = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.callRef = cjsExports.getValidate = undefined;
  let ref_error_1 = require_ref_error();
  let code_1 = require_code_2();
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let compile_1 = require_compile();
  let util_1 = require_util();
  let def = {
    keyword: "$ref",
    schemaType: "string",
    code(cxt) {
      let { gen, schema: $ref, it } = cxt;
      let { baseId, schemaEnv: env, validateName, opts, self: ajv } = it;
      let { root } = env;
      if (($ref === "#" || $ref === "#/") && baseId === root.baseId) return callRootRef();
      let schOrEnv = compile_1.resolveRef.call(ajv, root, baseId, $ref);
      if (schOrEnv === undefined) throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
      if (schOrEnv instanceof compile_1.SchemaEnv) return callValidate(schOrEnv);
      return inlineRefSchema(schOrEnv);
      function callRootRef() {
        if (env === root) return callRef(cxt, validateName, env, env.$async);
        let rootName = gen.scopeValue("root", {
          ref: root,
        });
        return callRef(cxt, codegen_1._`${rootName}.validate`, root, root.$async);
      }
      function callValidate(sch) {
        callRef(cxt, getValidate(cxt, sch), sch, sch.$async);
      }
      function inlineRefSchema(sch) {
        let schName = gen.scopeValue(
          "schema",
          opts.code.source === true
            ? {
                ref: sch,
                code: (0, codegen_1.stringify)(sch),
              }
            : {
                ref: sch,
              },
        );
        let valid = gen.name("valid");
        let schCxt = cxt.subschema(
          {
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref,
          },
          valid,
        );
        cxt.mergeEvaluated(schCxt);
        cxt.ok(valid);
      }
    },
  };
  function getValidate(cxt, sch) {
    let { gen } = cxt;
    return sch.validate
      ? gen.scopeValue("validate", {
          ref: sch.validate,
        })
      : codegen_1._`${gen.scopeValue("wrapper", {
          ref: sch,
        })}.validate`;
  }
  cjsExports.getValidate = getValidate;
  function callRef(cxt, v_2, sch, $async) {
    let { gen, it } = cxt;
    let { allErrors, schemaEnv: env, opts } = it;
    let passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
    if ($async) callAsyncRef();
    else callSyncRef();
    function callAsyncRef() {
      if (!env.$async) throw Error("async schema referenced by sync schema");
      let valid = gen.let("valid");
      gen.try(
        () => {
          gen.code(codegen_1._`await ${(0, code_1.callValidateCode)(cxt, v_2, passCxt)}`);
          addEvaluatedFrom(v_2);
          if (!allErrors) gen.assign(valid, true);
        },
        (e) => {
          gen.if(codegen_1._`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors) gen.assign(valid, false);
        },
      );
      cxt.ok(valid);
    }
    function callSyncRef() {
      cxt.result(
        (0, code_1.callValidateCode)(cxt, v_2, passCxt),
        () => addEvaluatedFrom(v_2),
        () => addErrorsFrom(v_2),
      );
    }
    function addErrorsFrom(source) {
      let errs = codegen_1._`${source}.errors`;
      gen.assign(
        names_1.default.vErrors,
        codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
      );
      gen.assign(names_1.default.errors, codegen_1._`${names_1.default.vErrors}.length`);
    }
    function addEvaluatedFrom(source) {
      var _a;
      if (!it.opts.unevaluated) return;
      let schEvaluated =
        (_a = sch === null || sch === undefined ? undefined : sch.validate) === null || _a === undefined
          ? undefined
          : _a.evaluated;
      if (it.props !== true)
        if (schEvaluated && !schEvaluated.dynamicProps) {
          if (schEvaluated.props !== undefined)
            it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        } else {
          let props = gen.var("props", codegen_1._`${source}.evaluated.props`);
          it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
        }
      if (it.items !== true)
        if (schEvaluated && !schEvaluated.dynamicItems) {
          if (schEvaluated.items !== undefined)
            it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        } else {
          let items = gen.var("items", codegen_1._`${source}.evaluated.items`);
          it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
        }
    }
  }
  cjsExports.callRef = callRef;
  cjsExports.default = def;
});
var require_core_3 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let id_1 = require_id();
  let ref_1 = require_ref();
  let core = [
    "$schema",
    "$id",
    "$defs",
    "$vocabulary",
    {
      keyword: "$comment",
    },
    "definitions",
    id_1.default,
    ref_1.default,
  ];
  cjsExports.default = core;
});
var require_limitNumber = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let ops = codegen_1.operators;
  let KWDs = {
    maximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT,
    },
    minimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT,
    },
    exclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE,
    },
    exclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE,
    },
  };
  let def = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "number",
    $data: true,
    error: {
      message: ({ keyword, schemaCode }) => codegen_1.str`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) =>
        codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
    },
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      cxt.fail$data(codegen_1._`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
    },
  };
  cjsExports.default = def;
});
var require_multipleOf = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let def = {
    keyword: "multipleOf",
    type: "number",
    schemaType: "number",
    $data: true,
    error: {
      message: ({ schemaCode }) => codegen_1.str`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => codegen_1._`{multipleOf: ${schemaCode}}`,
    },
    code(cxt) {
      let { gen, data, schemaCode, it } = cxt;
      let prec = it.opts.multipleOfPrecision;
      let res = gen.let("res");
      let invalid = prec
        ? codegen_1._`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
        : codegen_1._`${res} !== parseInt(${res})`;
      cxt.fail$data(codegen_1._`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
    },
  };
  cjsExports.default = def;
});
var require_ucs2length = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  function ucs2length(str) {
    let len = str.length;
    let length = 0;
    let pos = 0;
    let value;
    while (pos < len) {
      length++;
      value = str.charCodeAt(pos++);
      if (value >= 55296 && value <= 56319 && pos < len) {
        value = str.charCodeAt(pos);
        if ((value & 64512) === 56320) pos++;
      }
    }
    return length;
  }
  cjsExports.default = ucs2length;
  ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
});
var require_limitLength = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let ucs2length_1 = require_ucs2length();
  let def = {
    keyword: ["maxLength", "minLength"],
    type: "string",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        let comp = keyword === "maxLength" ? "more" : "fewer";
        return codegen_1.str`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
    },
    code(cxt) {
      let { keyword, data, schemaCode, it } = cxt;
      let op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
      let len =
        it.opts.unicode === false
          ? codegen_1._`${data}.length`
          : codegen_1._`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
      cxt.fail$data(codegen_1._`${len} ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
var require_pattern = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let code_1 = require_code_2();
  let util_1 = require_util();
  let codegen_1 = require_codegen();
  let def = {
    keyword: "pattern",
    type: "string",
    schemaType: "string",
    $data: true,
    error: {
      message: ({ schemaCode }) => codegen_1.str`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => codegen_1._`{pattern: ${schemaCode}}`,
    },
    code(cxt) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      let u = it.opts.unicodeRegExp ? "u" : "";
      if ($data) {
        let { regExp } = it.opts.code;
        let regExpCode =
          regExp.code === "new RegExp" ? codegen_1._`new RegExp` : (0, util_1.useFunc)(gen, regExp);
        let valid = gen.let("valid");
        gen.try(
          () => gen.assign(valid, codegen_1._`${regExpCode}(${schemaCode}, ${u}).test(${data})`),
          () => gen.assign(valid, false),
        );
        cxt.fail$data(codegen_1._`!${valid}`);
      } else {
        let regExp = (0, code_1.usePattern)(cxt, schema);
        cxt.fail$data(codegen_1._`!${regExp}.test(${data})`);
      }
    },
  };
  cjsExports.default = def;
});
var require_limitProperties = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let def = {
    keyword: ["maxProperties", "minProperties"],
    type: "object",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        let comp = keyword === "maxProperties" ? "more" : "fewer";
        return codegen_1.str`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
    },
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      let op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data(codegen_1._`Object.keys(${data}).length ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
var require_required = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let code_1 = require_code_2();
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "required",
    type: "object",
    schemaType: "array",
    $data: true,
    error: {
      message: ({ params: { missingProperty } }) =>
        codegen_1.str`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => codegen_1._`{missingProperty: ${missingProperty}}`,
    },
    code(cxt) {
      let { gen, schema, schemaCode, data, $data, it } = cxt;
      let { opts } = it;
      if (!$data && schema.length === 0) return;
      let useLoop = schema.length >= opts.loopRequired;
      if (it.allErrors) allErrorsMode();
      else exitOnErrorMode();
      if (opts.strictRequired) {
        let props = cxt.parentSchema.properties;
        let { definedProperties } = cxt.it;
        for (let requiredKey of schema)
          if (
            (props === null || props === undefined ? undefined : props[requiredKey]) === undefined &&
            !definedProperties.has(requiredKey)
          ) {
            let msg = `required property "${requiredKey}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
            (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
          }
      }
      function allErrorsMode() {
        if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
        else for (let prop of schema) (0, code_1.checkReportMissingProp)(cxt, prop);
      }
      function exitOnErrorMode() {
        let missing = gen.let("missing");
        if (useLoop || $data) {
          let valid = gen.let("valid", true);
          cxt.block$data(valid, () => loopUntilMissing(missing, valid));
          cxt.ok(valid);
        } else {
          gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
      function loopAllRequired() {
        gen.forOf("prop", schemaCode, (prop) => {
          cxt.setParams({
            missingProperty: prop,
          });
          gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
        });
      }
      function loopUntilMissing(missing, valid) {
        cxt.setParams({
          missingProperty: missing,
        });
        gen.forOf(
          missing,
          schemaCode,
          () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          },
          codegen_1.nil,
        );
      }
    },
  };
  cjsExports.default = def;
});
var require_limitItems = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let def = {
    keyword: ["maxItems", "minItems"],
    type: "array",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        let comp = keyword === "maxItems" ? "more" : "fewer";
        return codegen_1.str`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
    },
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      let op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data(codegen_1._`${data}.length ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
var require_equal = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let equal = require_fast_deep_equal();
  equal.code = 'require("ajv/dist/runtime/equal").default';
  cjsExports.default = equal;
});
var require_uniqueItems = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let dataType_1 = require_dataType();
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let equal_1 = require_equal();
  let def = {
    keyword: "uniqueItems",
    type: "array",
    schemaType: "boolean",
    $data: true,
    error: {
      message: ({ params: { i: earlierIndex, j } }) =>
        codegen_1.str`must NOT have duplicate items (items ## ${j} and ${earlierIndex} are identical)`,
      params: ({ params: { i: earlierIndex, j } }) => codegen_1._`{i: ${earlierIndex}, j: ${j}}`,
    },
    code(cxt) {
      let { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
      if (!$data && !schema) return;
      let valid = gen.let("valid");
      let itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
      cxt.block$data(valid, validateUniqueItems, codegen_1._`${schemaCode} === false`);
      cxt.ok(valid);
      function validateUniqueItems() {
        let i = gen.let("i", codegen_1._`${data}.length`);
        let j = gen.let("j");
        cxt.setParams({
          i,
          j,
        });
        gen.assign(valid, true);
        gen.if(codegen_1._`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
      }
      function canOptimize() {
        return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
      }
      function loopN(i, j) {
        let item = gen.name("item");
        let wrongType = (0, dataType_1.checkDataTypes)(
          itemTypes,
          item,
          it.opts.strictNumbers,
          dataType_1.DataType.Wrong,
        );
        let indices = gen.const("indices", codegen_1._`{}`);
        gen.for(codegen_1._`;${i}--;`, () => {
          gen.let(item, codegen_1._`${data}[${i}]`);
          gen.if(wrongType, codegen_1._`continue`);
          if (itemTypes.length > 1)
            gen.if(codegen_1._`typeof ${item} == "string"`, codegen_1._`${item} += "_"`);
          gen
            .if(codegen_1._`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, codegen_1._`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            })
            .code(codegen_1._`${indices}[${item}] = ${i}`);
        });
      }
      function loopN2(i, j) {
        let eql = (0, util_1.useFunc)(gen, equal_1.default);
        let outer = gen.name("outer");
        gen.label(outer).for(codegen_1._`;${i}--;`, () =>
          gen.for(codegen_1._`${j} = ${i}; ${j}--;`, () =>
            gen.if(codegen_1._`${eql}(${data}[${i}], ${data}[${j}])`, () => {
              cxt.error();
              gen.assign(valid, false).break(outer);
            }),
          ),
        );
      }
    },
  };
  cjsExports.default = def;
});
var require_const = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let equal_1 = require_equal();
  let def = {
    keyword: "const",
    $data: true,
    error: {
      message: "must be equal to constant",
      params: ({ schemaCode }) => codegen_1._`{allowedValue: ${schemaCode}}`,
    },
    code(cxt) {
      let { gen, data, $data, schemaCode, schema } = cxt;
      if ($data || (schema && typeof schema == "object"))
        cxt.fail$data(codegen_1._`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
      else cxt.fail(codegen_1._`${schema} !== ${data}`);
    },
  };
  cjsExports.default = def;
});
var require_enum = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let equal_1 = require_equal();
  let def = {
    keyword: "enum",
    schemaType: "array",
    $data: true,
    error: {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => codegen_1._`{allowedValues: ${schemaCode}}`,
    },
    code(cxt) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      if (!$data && schema.length === 0) throw Error("enum must have non-empty array");
      let useLoop = schema.length >= it.opts.loopEnum;
      let eql;
      let getEql = () =>
        eql !== null && eql !== undefined ? eql : (eql = (0, util_1.useFunc)(gen, equal_1.default));
      let valid;
      if (useLoop || $data) {
        valid = gen.let("valid");
        cxt.block$data(valid, loopEnum);
      } else {
        if (!Array.isArray(schema)) throw Error("ajv implementation error");
        let vSchema = gen.const("vSchema", schemaCode);
        valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
      }
      cxt.pass(valid);
      function loopEnum() {
        gen.assign(valid, false);
        gen.forOf("v", schemaCode, (v) =>
          gen.if(codegen_1._`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()),
        );
      }
      function equalCode(vSchema, i) {
        let sch = schema[i];
        return typeof sch === "object" && sch !== null
          ? codegen_1._`${getEql()}(${data}, ${vSchema}[${i}])`
          : codegen_1._`${data} === ${sch}`;
      }
    },
  };
  cjsExports.default = def;
});
var require_validation_2 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let limitNumber_1 = require_limitNumber();
  let multipleOf_1 = require_multipleOf();
  let limitLength_1 = require_limitLength();
  let pattern_1 = require_pattern();
  let limitProperties_1 = require_limitProperties();
  let required_1 = require_required();
  let limitItems_1 = require_limitItems();
  let uniqueItems_1 = require_uniqueItems();
  let const_1 = require_const();
  let enum_1 = require_enum();
  let validation = [
    limitNumber_1.default,
    multipleOf_1.default,
    limitLength_1.default,
    pattern_1.default,
    limitProperties_1.default,
    required_1.default,
    limitItems_1.default,
    uniqueItems_1.default,
    {
      keyword: "type",
      schemaType: ["string", "array"],
    },
    {
      keyword: "nullable",
      schemaType: "boolean",
    },
    const_1.default,
    enum_1.default,
  ];
  cjsExports.default = validation;
});
var require_additionalItems = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateAdditionalItems = undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "additionalItems",
    type: "array",
    schemaType: ["boolean", "object"],
    before: "uniqueItems",
    error: {
      message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
    },
    code(cxt) {
      let { parentSchema, it } = cxt;
      let { items } = parentSchema;
      if (!Array.isArray(items)) {
        (0, util_1.checkStrictMode)(
          it,
          '"additionalItems" is ignored when "items" is not an array of schemas',
        );
        return;
      }
      validateAdditionalItems(cxt, items);
    },
  };
  function validateAdditionalItems(cxt, items) {
    let { gen, schema, data, keyword, it } = cxt;
    it.items = true;
    let len = gen.const("len", codegen_1._`${data}.length`);
    if (schema === false) {
      cxt.setParams({
        len: items.length,
      });
      cxt.pass(codegen_1._`${len} <= ${items.length}`);
    } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
      let valid = gen.var("valid", codegen_1._`${len} <= ${items.length}`);
      gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
      cxt.ok(valid);
    }
    function validateItems(valid) {
      gen.forRange("i", items.length, len, (i) => {
        cxt.subschema(
          {
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num,
          },
          valid,
        );
        if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
      });
    }
  }
  cjsExports.validateAdditionalItems = validateAdditionalItems;
  cjsExports.default = def;
});
var require_items = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateTuple = undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let code_1 = require_code_2();
  let def = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "array", "boolean"],
    before: "uniqueItems",
    code(cxt) {
      let { schema, it } = cxt;
      if (Array.isArray(schema)) return validateTuple(cxt, "additionalItems", schema);
      it.items = true;
      if ((0, util_1.alwaysValidSchema)(it, schema)) return;
      cxt.ok((0, code_1.validateArray)(cxt));
    },
  };
  function validateTuple(cxt, extraItems, schArr = cxt.schema) {
    let { gen, parentSchema, data, keyword, it } = cxt;
    checkStrictTuple(parentSchema);
    if (it.opts.unevaluated && schArr.length && it.items !== true)
      it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
    let valid = gen.name("valid");
    let len = gen.const("len", codegen_1._`${data}.length`);
    schArr.forEach((sch, i) => {
      if ((0, util_1.alwaysValidSchema)(it, sch)) return;
      gen.if(codegen_1._`${len} > ${i}`, () =>
        cxt.subschema(
          {
            keyword,
            schemaProp: i,
            dataProp: i,
          },
          valid,
        ),
      );
      cxt.ok(valid);
    });
    function checkStrictTuple(sch) {
      let { opts, errSchemaPath } = it;
      let l = schArr.length;
      let fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
      if (opts.strictTuples && !fullTuple) {
        let msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
        (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
      }
    }
  }
  cjsExports.validateTuple = validateTuple;
  cjsExports.default = def;
});
var require_prefixItems = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let items_1 = require_items();
  let def = {
    keyword: "prefixItems",
    type: "array",
    schemaType: ["array"],
    before: "uniqueItems",
    code: (cxt) => (0, items_1.validateTuple)(cxt, "items"),
  };
  cjsExports.default = def;
});
var require_items2020 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let utilModule = require_util();
  let codeModule = require_code_2();
  let additionalItemsModule = require_additionalItems();
  let def = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    error: {
      message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
    },
    code(cxt) {
      let { schema, parentSchema, it } = cxt;
      let { prefixItems } = parentSchema;
      it.items = true;
      if ((0, utilModule.alwaysValidSchema)(it, schema)) return;
      if (prefixItems) (0, additionalItemsModule.validateAdditionalItems)(cxt, prefixItems);
      else cxt.ok((0, codeModule.validateArray)(cxt));
    },
  };
  cjsExports.default = def;
});
var require_contains = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "contains",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    trackErrors: true,
    error: {
      message: ({ params: { min, max } }) =>
        max === undefined
          ? codegen_1.str`must contain at least ${min} valid item(s)`
          : codegen_1.str`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) =>
        max === undefined
          ? codegen_1._`{minContains: ${min}}`
          : codegen_1._`{minContains: ${min}, maxContains: ${max}}`,
    },
    code(cxt) {
      let { gen, schema, parentSchema, data, it } = cxt;
      let min;
      let max;
      let { minContains, maxContains } = parentSchema;
      if (it.opts.next) {
        min = minContains === undefined ? 1 : minContains;
        max = maxContains;
      } else min = 1;
      let len = gen.const("len", codegen_1._`${data}.length`);
      cxt.setParams({
        min,
        max,
      });
      if (max === undefined && min === 0) {
        (0, util_1.checkStrictMode)(
          it,
          '"minContains" == 0 without "maxContains": "contains" keyword ignored',
        );
        return;
      }
      if (max !== undefined && min > max) {
        (0, util_1.checkStrictMode)(it, '"minContains" > "maxContains" is always invalid');
        cxt.fail();
        return;
      }
      if ((0, util_1.alwaysValidSchema)(it, schema)) {
        let cond = codegen_1._`${len} >= ${min}`;
        if (max !== undefined) cond = codegen_1._`${cond} && ${len} <= ${max}`;
        cxt.pass(cond);
        return;
      }
      it.items = true;
      let valid = gen.name("valid");
      if (max === undefined && min === 1) validateItems(valid, () => gen.if(valid, () => gen.break()));
      else if (min === 0) {
        gen.let(valid, true);
        if (max !== undefined) gen.if(codegen_1._`${data}.length > 0`, validateItemsWithCount);
      } else {
        gen.let(valid, false);
        validateItemsWithCount();
      }
      cxt.result(valid, () => cxt.reset());
      function validateItemsWithCount() {
        let schValid = gen.name("_valid");
        let count = gen.let("count", 0);
        validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
      }
      function validateItems(_valid, block) {
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema(
            {
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true,
            },
            _valid,
          );
          block();
        });
      }
      function checkLimits(count) {
        gen.code(codegen_1._`${count}++`);
        if (max === undefined) gen.if(codegen_1._`${count} >= ${min}`, () => gen.assign(valid, true).break());
        else {
          gen.if(codegen_1._`${count} > ${max}`, () => gen.assign(valid, false).break());
          if (min === 1) gen.assign(valid, true);
          else gen.if(codegen_1._`${count} >= ${min}`, () => gen.assign(valid, true));
        }
      }
    },
  };
  cjsExports.default = def;
});
var require_dependencies = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateSchemaDeps = cjsExports.validatePropertyDeps = cjsExports.error = undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let code_1 = require_code_2();
  cjsExports.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      let property_ies = depsCount === 1 ? "property" : "properties";
      return codegen_1.str`must have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({
      params: { property, depsCount, deps, missingProperty },
    }) => codegen_1._`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`,
  };
  let def = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: cjsExports.error,
    code(cxt) {
      let [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    },
  };
  function splitDependencies({ schema }) {
    let propertyDeps = {};
    let schemaDeps = {};
    for (let key in schema) {
      if (key === "__proto__") continue;
      let deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    let { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0) return;
    let missing = gen.let("missing");
    for (let prop in propertyDeps) {
      let deps = propertyDeps[prop];
      if (deps.length === 0) continue;
      let hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", "),
      });
      if (it.allErrors)
        gen.if(hasProperty, () => {
          for (let depProp of deps) (0, code_1.checkReportMissingProp)(cxt, depProp);
        });
      else {
        gen.if(codegen_1._`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
        (0, code_1.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
  }
  cjsExports.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    let { gen, data, keyword, it } = cxt;
    let valid = gen.name("valid");
    for (let prop in schemaDeps) {
      if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop])) continue;
      gen.if(
        (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
        () => {
          let schCxt = cxt.subschema(
            {
              keyword,
              schemaProp: prop,
            },
            valid,
          );
          cxt.mergeValidEvaluated(schCxt, valid);
        },
        () => gen.var(valid, true),
      );
      cxt.ok(valid);
    }
  }
  cjsExports.validateSchemaDeps = validateSchemaDeps;
  cjsExports.default = def;
});
var require_propertyNames = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "propertyNames",
    type: "object",
    schemaType: ["object", "boolean"],
    error: {
      message: "property name must be valid",
      params: ({ params }) => codegen_1._`{propertyName: ${params.propertyName}}`,
    },
    code(cxt) {
      let { gen, schema, data, it } = cxt;
      if ((0, util_1.alwaysValidSchema)(it, schema)) return;
      let valid = gen.name("valid");
      gen.forIn("key", data, (key) => {
        cxt.setParams({
          propertyName: key,
        });
        cxt.subschema(
          {
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true,
          },
          valid,
        );
        gen.if((0, codegen_1.not)(valid), () => {
          cxt.error(true);
          if (!it.allErrors) gen.break();
        });
      });
      cxt.ok(valid);
    },
  };
  cjsExports.default = def;
});
var require_additionalProperties = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let code_1 = require_code_2();
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let util_1 = require_util();
  let def = {
    keyword: "additionalProperties",
    type: ["object"],
    schemaType: ["boolean", "object"],
    allowUndefined: true,
    trackErrors: true,
    error: {
      message: "must NOT have additional properties",
      params: ({ params }) => codegen_1._`{additionalProperty: ${params.additionalProperty}}`,
    },
    code(cxt) {
      let { gen, schema, parentSchema, data, errsCount, it } = cxt;
      if (!errsCount) throw Error("ajv implementation error");
      let { allErrors, opts } = it;
      it.props = true;
      if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema)) return;
      let props = (0, code_1.allSchemaProperties)(parentSchema.properties);
      let patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
      checkAdditionalProperties();
      cxt.ok(codegen_1._`${errsCount} === ${names_1.default.errors}`);
      function checkAdditionalProperties() {
        gen.forIn("key", data, (key) => {
          if (!props.length && !patProps.length) additionalPropertyCode(key);
          else gen.if(isAdditional(key), () => additionalPropertyCode(key));
        });
      }
      function isAdditional(key) {
        let definedProp;
        if (props.length > 8) {
          let propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
          definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
        } else if (props.length)
          definedProp = (0, codegen_1.or)(...props.map((p) => codegen_1._`${key} === ${p}`));
        else definedProp = codegen_1.nil;
        if (patProps.length)
          definedProp = (0, codegen_1.or)(
            definedProp,
            ...patProps.map((p) => codegen_1._`${(0, code_1.usePattern)(cxt, p)}.test(${key})`),
          );
        return (0, codegen_1.not)(definedProp);
      }
      function deleteAdditional(key) {
        gen.code(codegen_1._`delete ${data}[${key}]`);
      }
      function additionalPropertyCode(key) {
        if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === false)) {
          deleteAdditional(key);
          return;
        }
        if (schema === false) {
          cxt.setParams({
            additionalProperty: key,
          });
          cxt.error();
          if (!allErrors) gen.break();
          return;
        }
        if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          let valid = gen.name("valid");
          if (opts.removeAdditional === "failing") {
            applyAdditionalSchema(key, valid, false);
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.reset();
              deleteAdditional(key);
            });
          } else {
            applyAdditionalSchema(key, valid);
            if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
      }
      function applyAdditionalSchema(key, valid, errors) {
        let subschema = {
          keyword: "additionalProperties",
          dataProp: key,
          dataPropType: util_1.Type.Str,
        };
        if (errors === false)
          Object.assign(subschema, {
            compositeRule: true,
            createErrors: false,
            allErrors: false,
          });
        cxt.subschema(subschema, valid);
      }
    },
  };
  cjsExports.default = def;
});
var require_properties = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let validate_1 = require_validate();
  let code_1 = require_code_2();
  let util_1 = require_util();
  let additionalProperties_1 = require_additionalProperties();
  let def = {
    keyword: "properties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      let { gen, schema, parentSchema, data, it } = cxt;
      if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === undefined)
        additionalProperties_1.default.code(
          new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"),
        );
      let allProps = (0, code_1.allSchemaProperties)(schema);
      for (let prop of allProps) it.definedProperties.add(prop);
      if (it.opts.unevaluated && allProps.length && it.props !== true)
        it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
      let properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
      if (properties.length === 0) return;
      let valid = gen.name("valid");
      for (let prop of properties) {
        if (hasDefault(prop)) applyPropertySchema(prop);
        else {
          gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
          applyPropertySchema(prop);
          if (!it.allErrors) gen.else().var(valid, true);
          gen.endIf();
        }
        cxt.it.definedProperties.add(prop);
        cxt.ok(valid);
      }
      function hasDefault(prop) {
        return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== undefined;
      }
      function applyPropertySchema(prop) {
        cxt.subschema(
          {
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop,
          },
          valid,
        );
      }
    },
  };
  cjsExports.default = def;
});
var require_patternProperties = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let code_1 = require_code_2();
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let util_2 = require_util();
  let def = {
    keyword: "patternProperties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      let { gen, schema, data, parentSchema, it } = cxt;
      let { opts } = it;
      let patterns = (0, code_1.allSchemaProperties)(schema);
      let alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
      if (
        patterns.length === 0 ||
        (alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true))
      )
        return;
      let checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
      let valid = gen.name("valid");
      if (it.props !== true && !(it.props instanceof codegen_1.Name))
        it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
      let { props } = it;
      validatePatternProperties();
      function validatePatternProperties() {
        for (let pat of patterns) {
          if (checkProperties) checkMatchingProperties(pat);
          if (it.allErrors) validateProperties(pat);
          else {
            gen.var(valid, true);
            validateProperties(pat);
            gen.if(valid);
          }
        }
      }
      function checkMatchingProperties(pat) {
        for (let prop in checkProperties)
          if (new RegExp(pat).test(prop))
            (0, util_1.checkStrictMode)(
              it,
              `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`,
            );
      }
      function validateProperties(pat) {
        gen.forIn("key", data, (key) => {
          gen.if(codegen_1._`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
            let alwaysValid = alwaysValidPatterns.includes(pat);
            if (!alwaysValid)
              cxt.subschema(
                {
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str,
                },
                valid,
              );
            if (it.opts.unevaluated && props !== true) gen.assign(codegen_1._`${props}[${key}]`, true);
            else if (!alwaysValid && !it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        });
      }
    },
  };
  cjsExports.default = def;
});
var require_not = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let util_1 = require_util();
  let def = {
    keyword: "not",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    code(cxt) {
      let { gen, schema, it } = cxt;
      if ((0, util_1.alwaysValidSchema)(it, schema)) {
        cxt.fail();
        return;
      }
      let valid = gen.name("valid");
      cxt.subschema(
        {
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false,
        },
        valid,
      );
      cxt.failResult(
        valid,
        () => cxt.reset(),
        () => cxt.error(),
      );
    },
    error: {
      message: "must NOT be valid",
    },
  };
  cjsExports.default = def;
});
var require_anyOf = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let def = {
    keyword: "anyOf",
    schemaType: "array",
    trackErrors: true,
    code: require_code_2().validateUnion,
    error: {
      message: "must match a schema in anyOf",
    },
  };
  cjsExports.default = def;
});
var require_oneOf = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "oneOf",
    schemaType: "array",
    trackErrors: true,
    error: {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => codegen_1._`{passingSchemas: ${params.passing}}`,
    },
    code(cxt) {
      let { gen, schema, parentSchema, it } = cxt;
      if (!Array.isArray(schema)) throw Error("ajv implementation error");
      if (it.opts.discriminator && parentSchema.discriminator) return;
      let schArr = schema;
      let valid = gen.let("valid", false);
      let passing = gen.let("passing", null);
      let schValid = gen.name("_valid");
      cxt.setParams({
        passing,
      });
      gen.block(validateOneOf);
      cxt.result(
        valid,
        () => cxt.reset(),
        () => cxt.error(true),
      );
      function validateOneOf() {
        schArr.forEach((sch, i) => {
          let schCxt;
          if ((0, util_1.alwaysValidSchema)(it, sch)) gen.var(schValid, true);
          else
            schCxt = cxt.subschema(
              {
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true,
              },
              schValid,
            );
          if (i > 0)
            gen
              .if(codegen_1._`${schValid} && ${valid}`)
              .assign(valid, false)
              .assign(passing, codegen_1._`[${passing}, ${i}]`)
              .else();
          gen.if(schValid, () => {
            gen.assign(valid, true);
            gen.assign(passing, i);
            if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1.Name);
          });
        });
      }
    },
  };
  cjsExports.default = def;
});
var require_allOf = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let util_1 = require_util();
  let def = {
    keyword: "allOf",
    schemaType: "array",
    code(cxt) {
      let { gen, schema, it } = cxt;
      if (!Array.isArray(schema)) throw Error("ajv implementation error");
      let valid = gen.name("valid");
      schema.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch)) return;
        let schCxt = cxt.subschema(
          {
            keyword: "allOf",
            schemaProp: i,
          },
          valid,
        );
        cxt.ok(valid);
        cxt.mergeEvaluated(schCxt);
      });
    },
  };
  cjsExports.default = def;
});
var require_if = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "if",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    error: {
      message: ({ params }) => codegen_1.str`must match "${params.ifClause}" schema`,
      params: ({ params }) => codegen_1._`{failingKeyword: ${params.ifClause}}`,
    },
    code(cxt) {
      let { gen, parentSchema, it } = cxt;
      if (parentSchema.then === undefined && parentSchema.else === undefined)
        (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
      let hasThen = hasSchema(it, "then");
      let hasElse = hasSchema(it, "else");
      if (!hasThen && !hasElse) return;
      let valid = gen.let("valid", true);
      let schValid = gen.name("_valid");
      validateIf();
      cxt.reset();
      if (hasThen && hasElse) {
        let ifClause = gen.let("ifClause");
        cxt.setParams({
          ifClause,
        });
        gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
      } else if (hasThen) gen.if(schValid, validateClause("then"));
      else gen.if((0, codegen_1.not)(schValid), validateClause("else"));
      cxt.pass(valid, () => cxt.error(true));
      function validateIf() {
        let schCxt = cxt.subschema(
          {
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false,
          },
          schValid,
        );
        cxt.mergeEvaluated(schCxt);
      }
      function validateClause(keyword, ifClause) {
        return () => {
          let schCxt = cxt.subschema(
            {
              keyword,
            },
            schValid,
          );
          gen.assign(valid, schValid);
          cxt.mergeValidEvaluated(schCxt, valid);
          if (ifClause) gen.assign(ifClause, codegen_1._`${keyword}`);
          else
            cxt.setParams({
              ifClause: keyword,
            });
        };
      }
    },
  };
  function hasSchema(it, keyword) {
    let schema = it.schema[keyword];
    return schema !== undefined && !(0, util_1.alwaysValidSchema)(it, schema);
  }
  cjsExports.default = def;
});
var require_thenElse = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let util_1 = require_util();
  let def = {
    keyword: ["then", "else"],
    schemaType: ["object", "boolean"],
    code({ keyword, parentSchema, it }) {
      if (parentSchema.if === undefined)
        (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
    },
  };
  cjsExports.default = def;
});
var require_format_6 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let additionalItemsModule = require_additionalItems();
  let prefixItemsModule = require_prefixItems();
  let itemsModule = require_items();
  let items2020Module = require_items2020();
  let containsModule = require_contains();
  let dependenciesModule = require_dependencies();
  let propertyNamesModule = require_propertyNames();
  let additionalPropertiesModule = require_additionalProperties();
  let propertiesModule = require_properties();
  let patternPropertiesModule = require_patternProperties();
  let notModule = require_not();
  let anyOfModule = require_anyOf();
  let oneOfModule = require_oneOf();
  let allOfModule = require_allOf();
  let ifModule = require_if();
  let thenElseModule = require_thenElse();
  function applicator(draft2019 = false) {
    let vocabularies = [
      notModule.default,
      anyOfModule.default,
      oneOfModule.default,
      allOfModule.default,
      ifModule.default,
      thenElseModule.default,
      propertyNamesModule.default,
      additionalPropertiesModule.default,
      dependenciesModule.default,
      propertiesModule.default,
      patternPropertiesModule.default,
    ];
    if (draft2019) vocabularies.push(prefixItemsModule.default, items2020Module.default);
    else vocabularies.push(additionalItemsModule.default, itemsModule.default);
    vocabularies.push(containsModule.default);
    return vocabularies;
  }
  cjsExports.default = applicator;
});
var require_format = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let def = {
    keyword: "format",
    type: ["number", "string"],
    schemaType: "string",
    $data: true,
    error: {
      message: ({ schemaCode }) => codegen_1.str`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => codegen_1._`{format: ${schemaCode}}`,
    },
    code(cxt, ruleType) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      let { opts, errSchemaPath, schemaEnv, self: ajvInstance } = it;
      if (!opts.validateFormats) return;
      if ($data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        let fmts = gen.scopeValue("formats", {
          ref: ajvInstance.formats,
          code: opts.code.formats,
        });
        let fDef = gen.const("fDef", codegen_1._`${fmts}[${schemaCode}]`);
        let fType = gen.let("fType");
        let format = gen.let("format");
        gen.if(
          codegen_1._`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`,
          () =>
            gen
              .assign(fType, codegen_1._`${fDef}.type || "string"`)
              .assign(format, codegen_1._`${fDef}.validate`),
          () => gen.assign(fType, codegen_1._`"string"`).assign(format, fDef),
        );
        cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
        function unknownFmt() {
          if (opts.strictSchema === false) return codegen_1.nil;
          return codegen_1._`${schemaCode} && !${format}`;
        }
        function invalidFmt() {
          let callFormat = schemaEnv.$async
            ? codegen_1._`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
            : codegen_1._`${format}(${data})`;
          let validData = codegen_1._`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
          return codegen_1._`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
        }
      }
      function validateFormat() {
        let formatDef = ajvInstance.formats[schema];
        if (!formatDef) {
          unknownFormat();
          return;
        }
        if (formatDef === true) return;
        let [fmtType, format, fmtRef] = getFormat(formatDef);
        if (fmtType === ruleType) cxt.pass(validCondition());
        function unknownFormat() {
          if (opts.strictSchema === false) {
            ajvInstance.logger.warn(unknownMsg());
            return;
          }
          throw Error(unknownMsg());
          function unknownMsg() {
            return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
          }
        }
        function getFormat(fmtDef) {
          let code =
            fmtDef instanceof RegExp
              ? (0, codegen_1.regexpCode)(fmtDef)
              : opts.code.formats
                ? codegen_1._`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}`
                : undefined;
          let fmt = gen.scopeValue("formats", {
            key: schema,
            ref: fmtDef,
            code,
          });
          if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp))
            return [fmtDef.type || "string", fmtDef.validate, codegen_1._`${fmt}.validate`];
          return ["string", fmtDef, fmt];
        }
        function validCondition() {
          if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
            if (!schemaEnv.$async) throw Error("async format in sync schema");
            return codegen_1._`await ${fmtRef}(${data})`;
          }
          return typeof format == "function"
            ? codegen_1._`${fmtRef}(${data})`
            : codegen_1._`${fmtRef}.test(${data})`;
        }
      }
    },
  };
  cjsExports.default = def;
});
var require_format_2 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let formatPlugins = [require_format().default];
  cjsExports.default = formatPlugins;
});
var require_metadata = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.contentVocabulary = cjsExports.metadataVocabulary = undefined;
  cjsExports.metadataVocabulary = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples",
  ];
  cjsExports.contentVocabulary = ["contentMediaType", "contentEncoding", "contentSchema"];
});
var require_draft7 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let core_1 = require_core_3();
  let validation_1 = require_validation_2();
  let applicator_1 = require_format_6();
  let format_1 = require_format_2();
  let metadata_1 = require_metadata();
  let draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    (0, applicator_1.default)(),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary,
  ];
  cjsExports.default = draft7Vocabularies;
});
var require_types = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DiscrError = undefined;
  var DiscrError;
  (function (DiscrError) {
    DiscrError.Tag = "tag";
    DiscrError.Mapping = "mapping";
  })(DiscrError || (cjsExports.DiscrError = DiscrError = {}));
});
var require_discriminator = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let types_1 = require_types();
  let compile_1 = require_compile();
  let refErrorModule = require_ref_error();
  let util_1 = require_util();
  let def = {
    keyword: "discriminator",
    type: "object",
    schemaType: "object",
    error: {
      message: ({ params: { discrError, tagName } }) =>
        discrError === types_1.DiscrError.Tag
          ? `tag "${tagName}" must be string`
          : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) =>
        codegen_1._`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
    },
    code(cxt) {
      let { gen, data, schema, parentSchema, it } = cxt;
      let { oneOf } = parentSchema;
      if (!it.opts.discriminator) throw Error("discriminator: requires discriminator option");
      let tagName = schema.propertyName;
      if (typeof tagName != "string") throw Error("discriminator: requires propertyName");
      if (schema.mapping) throw Error("discriminator: mapping is not supported");
      if (!oneOf) throw Error("discriminator: requires oneOf keyword");
      let valid = gen.let("valid", false);
      let tag = gen.const("tag", codegen_1._`${data}${(0, codegen_1.getProperty)(tagName)}`);
      gen.if(
        codegen_1._`typeof ${tag} == "string"`,
        () => validateMapping(),
        () =>
          cxt.error(false, {
            discrError: types_1.DiscrError.Tag,
            tag,
            tagName,
          }),
      );
      cxt.ok(valid);
      function validateMapping() {
        let mapping = getMapping();
        gen.if(false);
        for (let tagValue in mapping) {
          gen.elseIf(codegen_1._`${tag} === ${tagValue}`);
          gen.assign(valid, applyTagSchema(mapping[tagValue]));
        }
        gen.else();
        cxt.error(false, {
          discrError: types_1.DiscrError.Mapping,
          tag,
          tagName,
        });
        gen.endIf();
      }
      function applyTagSchema(schemaProp) {
        let _valid = gen.name("valid");
        let schCxt = cxt.subschema(
          {
            keyword: "oneOf",
            schemaProp,
          },
          _valid,
        );
        cxt.mergeEvaluated(schCxt, codegen_1.Name);
        return _valid;
      }
      function getMapping() {
        var _a;
        let oneOfMapping = {};
        let topRequired = hasRequired(parentSchema);
        let tagRequired = true;
        for (let i = 0; i < oneOf.length; i++) {
          let sch = oneOf[i];
          if (
            (sch === null || sch === undefined ? undefined : sch.$ref) &&
            !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)
          ) {
            let $ref = sch.$ref;
            sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, $ref);
            if (sch instanceof compile_1.SchemaEnv) sch = sch.schema;
            if (sch === undefined) throw new refErrorModule.default(it.opts.uriResolver, it.baseId, $ref);
          }
          let propSch =
            (_a = sch === null || sch === undefined ? undefined : sch.properties) === null || _a === undefined
              ? undefined
              : _a[tagName];
          if (typeof propSch != "object")
            throw Error(
              `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`,
            );
          tagRequired = tagRequired && (topRequired || hasRequired(sch));
          addMappings(propSch, i);
        }
        if (!tagRequired) throw Error(`discriminator: "${tagName}" must be required`);
        return oneOfMapping;
        function hasRequired({ required }) {
          return Array.isArray(required) && required.includes(tagName);
        }
        function addMappings(sch, i) {
          if (sch.const) addMapping(sch.const, i);
          else if (sch.enum) for (let tagValue of sch.enum) addMapping(tagValue, i);
          else throw Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
        function addMapping(tagValue, i) {
          if (typeof tagValue != "string" || tagValue in oneOfMapping)
            throw Error(`discriminator: "${tagName}" values must be unique strings`);
          oneOfMapping[tagValue] = i;
        }
      }
    },
  };
  cjsExports.default = def;
});
var require_json_schema_draft_07 = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "http://json-schema.org/draft-07/schema#",
    title: "Core schema meta-schema",
    definitions: {
      schemaArray: {
        type: "array",
        minItems: 1,
        items: {
          $ref: "#",
        },
      },
      nonNegativeInteger: {
        type: "integer",
        minimum: 0,
      },
      nonNegativeIntegerDefault0: {
        allOf: [
          {
            $ref: "#/definitions/nonNegativeInteger",
          },
          {
            default: 0,
          },
        ],
      },
      simpleTypes: {
        enum: ["array", "boolean", "integer", "null", "number", "object", "string"],
      },
      stringArray: {
        type: "array",
        items: {
          type: "string",
        },
        uniqueItems: true,
        default: [],
      },
    },
    type: ["object", "boolean"],
    properties: {
      $id: {
        type: "string",
        format: "uri-reference",
      },
      $schema: {
        type: "string",
        format: "uri",
      },
      $ref: {
        type: "string",
        format: "uri-reference",
      },
      $comment: {
        type: "string",
      },
      title: {
        type: "string",
      },
      description: {
        type: "string",
      },
      default: true,
      readOnly: {
        type: "boolean",
        default: false,
      },
      examples: {
        type: "array",
        items: true,
      },
      multipleOf: {
        type: "number",
        exclusiveMinimum: 0,
      },
      maximum: {
        type: "number",
      },
      exclusiveMaximum: {
        type: "number",
      },
      minimum: {
        type: "number",
      },
      exclusiveMinimum: {
        type: "number",
      },
      maxLength: {
        $ref: "#/definitions/nonNegativeInteger",
      },
      minLength: {
        $ref: "#/definitions/nonNegativeIntegerDefault0",
      },
      pattern: {
        type: "string",
        format: "regex",
      },
      additionalItems: {
        $ref: "#",
      },
      items: {
        anyOf: [
          {
            $ref: "#",
          },
          {
            $ref: "#/definitions/schemaArray",
          },
        ],
        default: true,
      },
      maxItems: {
        $ref: "#/definitions/nonNegativeInteger",
      },
      minItems: {
        $ref: "#/definitions/nonNegativeIntegerDefault0",
      },
      uniqueItems: {
        type: "boolean",
        default: false,
      },
      contains: {
        $ref: "#",
      },
      maxProperties: {
        $ref: "#/definitions/nonNegativeInteger",
      },
      minProperties: {
        $ref: "#/definitions/nonNegativeIntegerDefault0",
      },
      required: {
        $ref: "#/definitions/stringArray",
      },
      additionalProperties: {
        $ref: "#",
      },
      definitions: {
        type: "object",
        additionalProperties: {
          $ref: "#",
        },
        default: {},
      },
      properties: {
        type: "object",
        additionalProperties: {
          $ref: "#",
        },
        default: {},
      },
      patternProperties: {
        type: "object",
        additionalProperties: {
          $ref: "#",
        },
        propertyNames: {
          format: "regex",
        },
        default: {},
      },
      dependencies: {
        type: "object",
        additionalProperties: {
          anyOf: [
            {
              $ref: "#",
            },
            {
              $ref: "#/definitions/stringArray",
            },
          ],
        },
      },
      propertyNames: {
        $ref: "#",
      },
      const: true,
      enum: {
        type: "array",
        items: true,
        minItems: 1,
        uniqueItems: true,
      },
      type: {
        anyOf: [
          {
            $ref: "#/definitions/simpleTypes",
          },
          {
            type: "array",
            items: {
              $ref: "#/definitions/simpleTypes",
            },
            minItems: 1,
            uniqueItems: true,
          },
        ],
      },
      format: {
        type: "string",
      },
      contentMediaType: {
        type: "string",
      },
      contentEncoding: {
        type: "string",
      },
      if: {
        $ref: "#",
      },
      then: {
        $ref: "#",
      },
      else: {
        $ref: "#",
      },
      allOf: {
        $ref: "#/definitions/schemaArray",
      },
      anyOf: {
        $ref: "#/definitions/schemaArray",
      },
      oneOf: {
        $ref: "#/definitions/schemaArray",
      },
      not: {
        $ref: "#",
      },
    },
    default: true,
  };
});
var require_ajv = initModule((cjsExports, cjsModule) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MissingRefError =
    cjsExports.ValidationError =
    cjsExports.CodeGen =
    cjsExports.Name =
    cjsExports.nil =
    cjsExports.stringify =
    cjsExports.str =
    cjsExports._ =
    cjsExports.KeywordCxt =
    cjsExports.Ajv =
      undefined;
  let core_1 = require_core();
  let draft7_1 = require_draft7();
  let discriminator_1 = require_discriminator();
  let draft7MetaSchema = require_json_schema_draft_07();
  let META_SUPPORT_DATA = ["/properties"];
  let META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  var Ajv = class extends core_1.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta) return;
      let metaSchema = this.opts.$data
        ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA)
        : draft7MetaSchema;
      this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
    }
  };
  cjsExports.Ajv = Ajv;
  cjsModule.exports = cjsExports = Ajv;
  cjsModule.exports.Ajv = Ajv;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = Ajv;
  var validate_1 = require_validate();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return codegen_1._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return codegen_1.str;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return codegen_1.stringify;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return codegen_1.nil;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return codegen_1.Name;
    },
  });
  Object.defineProperty(cjsExports, "CodeGen", {
    enumerable: true,
    get: function () {
      return codegen_1.CodeGen;
    },
  });
  var validation_error_1 = require_validation_error();
  Object.defineProperty(cjsExports, "ValidationError", {
    enumerable: true,
    get: function () {
      return validation_error_1.default;
    },
  });
  var ref_error_1 = require_ref_error();
  Object.defineProperty(cjsExports, "MissingRefError", {
    enumerable: true,
    get: function () {
      return ref_error_1.default;
    },
  });
});
var require_dynamicAnchor = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.dynamicAnchor = undefined;
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let compile_1 = require_compile();
  let ref_1 = require_ref();
  let def = {
    keyword: "$dynamicAnchor",
    schemaType: "string",
    code: (cxt) => dynamicAnchor(cxt, cxt.schema),
  };
  function dynamicAnchor(cxt, anchor) {
    let { gen, it } = cxt;
    it.schemaEnv.root.dynamicAnchors[anchor] = true;
    let v = codegen_1._`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
    let validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
    gen.if(codegen_1._`!${v}`, () => gen.assign(v, validate));
  }
  cjsExports.dynamicAnchor = dynamicAnchor;
  function _getValidate(cxt) {
    let { schemaEnv, schema, self: ajvInstance } = cxt.it;
    let { root, baseId, localRefs, meta } = schemaEnv.root;
    let { schemaId } = ajvInstance.opts;
    let sch = new compile_1.SchemaEnv({
      schema,
      schemaId,
      root,
      baseId,
      localRefs,
      meta,
    });
    compile_1.compileSchema.call(ajvInstance, sch);
    return (0, ref_1.getValidate)(cxt, sch);
  }
  cjsExports.default = def;
});
var require_dynamicRef = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.dynamicRef = undefined;
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let ref_1 = require_ref();
  let def = {
    keyword: "$dynamicRef",
    schemaType: "string",
    code: (cxt) => dynamicRef(cxt, cxt.schema),
  };
  function dynamicRef(cxt, ref) {
    let { gen, keyword, it } = cxt;
    if (ref[0] !== "#") throw Error(`"${keyword}" only supports hash fragment reference`);
    let anchor = ref.slice(1);
    if (it.allErrors) _dynamicRef();
    else {
      let valid = gen.let("valid", false);
      _dynamicRef(valid);
      cxt.ok(valid);
    }
    function _dynamicRef(valid) {
      if (it.schemaEnv.root.dynamicAnchors[anchor]) {
        let validate = gen.let(
          "_v",
          codegen_1._`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`,
        );
        gen.if(validate, _callRef(validate, valid), _callRef(it.validateName, valid));
      } else _callRef(it.validateName, valid)();
    }
    function _callRef(validate, valid) {
      return valid
        ? () =>
            gen.block(() => {
              (0, ref_1.callRef)(cxt, validate);
              gen.let(valid, true);
            })
        : () => (0, ref_1.callRef)(cxt, validate);
    }
  }
  cjsExports.dynamicRef = dynamicRef;
  cjsExports.default = def;
});
var require_recursiveAnchor = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let dynamicAnchor_1 = require_dynamicAnchor();
  let util_1 = require_util();
  let def = {
    keyword: "$recursiveAnchor",
    schemaType: "boolean",
    code(cxt) {
      if (cxt.schema) (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
      else (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
    },
  };
  cjsExports.default = def;
});
var require_recursiveRef = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let dynamicRef_1 = require_dynamicRef();
  let def = {
    keyword: "$recursiveRef",
    schemaType: "string",
    code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema),
  };
  cjsExports.default = def;
});
var require_format_3 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let format_1 = require_dynamicAnchor();
  let dynamicRefModule = require_dynamicRef();
  let recursiveAnchorModule = require_recursiveAnchor();
  let recursiveRefModule = require_recursiveRef();
  let format = [
    format_1.default,
    dynamicRefModule.default,
    recursiveAnchorModule.default,
    recursiveRefModule.default,
  ];
  cjsExports.default = format;
});
var require_dependentRequired = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let dependencies_1 = require_dependencies();
  let def = {
    keyword: "dependentRequired",
    type: "object",
    schemaType: "object",
    error: dependencies_1.error,
    code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt),
  };
  cjsExports.default = def;
});
var require_dependentSchemas = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let dependencies_1 = require_dependencies();
  let def = {
    keyword: "dependentSchemas",
    type: "object",
    schemaType: "object",
    code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt),
  };
  cjsExports.default = def;
});
var require_limitContains = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let util_1 = require_util();
  let def = {
    keyword: ["maxContains", "minContains"],
    type: "array",
    schemaType: "number",
    code({ keyword, parentSchema, it }) {
      if (parentSchema.contains === undefined)
        (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
    },
  };
  cjsExports.default = def;
});
var require_format_4 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let format_1 = require_dependentRequired();
  let dependentSchemasModule = require_dependentSchemas();
  let limitContainsModule = require_limitContains();
  let format = [format_1.default, dependentSchemasModule.default, limitContainsModule.default];
  cjsExports.default = format;
});
var require_unevaluatedProperties = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let names_1 = require_names();
  let def = {
    keyword: "unevaluatedProperties",
    type: "object",
    schemaType: ["boolean", "object"],
    trackErrors: true,
    error: {
      message: "must NOT have unevaluated properties",
      params: ({ params }) => codegen_1._`{unevaluatedProperty: ${params.unevaluatedProperty}}`,
    },
    code(cxt) {
      let { gen, schema, data, errsCount, it } = cxt;
      if (!errsCount) throw Error("ajv implementation error");
      let { allErrors, props } = it;
      if (props instanceof codegen_1.Name)
        gen.if(codegen_1._`${props} !== true`, () =>
          gen.forIn("key", data, (key) =>
            gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key)),
          ),
        );
      else if (props !== true)
        gen.forIn("key", data, (key) =>
          props === undefined
            ? unevaluatedPropCode(key)
            : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)),
        );
      it.props = true;
      cxt.ok(codegen_1._`${errsCount} === ${names_1.default.errors}`);
      function unevaluatedPropCode(key) {
        if (schema === false) {
          cxt.setParams({
            unevaluatedProperty: key,
          });
          cxt.error();
          if (!allErrors) gen.break();
          return;
        }
        if (!(0, util_1.alwaysValidSchema)(it, schema)) {
          let valid = gen.name("valid");
          cxt.subschema(
            {
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str,
            },
            valid,
          );
          if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
        }
      }
      function unevaluatedDynamic(evaluatedProps, key) {
        return codegen_1._`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
      }
      function unevaluatedStatic(evaluatedProps, key) {
        let ps = [];
        for (let p in evaluatedProps) if (evaluatedProps[p] === true) ps.push(codegen_1._`${key} !== ${p}`);
        return (0, codegen_1.and)(...ps);
      }
    },
  };
  cjsExports.default = def;
});
var require_unevaluatedItems = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let def = {
    keyword: "unevaluatedItems",
    type: "array",
    schemaType: ["boolean", "object"],
    error: {
      message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
    },
    code(cxt) {
      let { gen, schema, data, it } = cxt;
      let items = it.items || 0;
      if (items === true) return;
      let len = gen.const("len", codegen_1._`${data}.length`);
      if (schema === false) {
        cxt.setParams({
          len: items,
        });
        cxt.fail(codegen_1._`${len} > ${items}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        let valid = gen.var("valid", codegen_1._`${len} <= ${items}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
        cxt.ok(valid);
      }
      it.items = true;
      function validateItems(valid, from) {
        gen.forRange("i", from, len, (i) => {
          cxt.subschema(
            {
              keyword: "unevaluatedItems",
              dataProp: i,
              dataPropType: util_1.Type.Num,
            },
            valid,
          );
          if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    },
  };
  cjsExports.default = def;
});
var require_format_5 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let format_1 = require_unevaluatedProperties();
  let unevaluatedItemsModule = require_unevaluatedItems();
  let format = [format_1.default, unevaluatedItemsModule.default];
  cjsExports.default = format;
});
var require_draft7_2 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let validation_1 = require_core_3();
  let validationModule = require_validation_2();
  let applicator_1 = require_format_6();
  let core_1 = require_format_3();
  let formatModule4 = require_format_4();
  let formatModule5 = require_format_5();
  let format_1 = require_format_2();
  let metadata_1 = require_metadata();
  let draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    validationModule.default,
    (0, applicator_1.default)(true),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary,
    formatModule4.default,
    formatModule5.default,
  ];
  cjsExports.default = draft7Vocabularies;
});
var require_schema = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/schema",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
      "https://json-schema.org/draft/2020-12/vocab/applicator": true,
      "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
      "https://json-schema.org/draft/2020-12/vocab/validation": true,
      "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
      "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
      "https://json-schema.org/draft/2020-12/vocab/content": true,
    },
    $dynamicAnchor: "meta",
    title: "Core and Validation specifications meta-schema",
    allOf: [
      {
        $ref: "meta/core",
      },
      {
        $ref: "meta/applicator",
      },
      {
        $ref: "meta/unevaluated",
      },
      {
        $ref: "meta/validation",
      },
      {
        $ref: "meta/meta-data",
      },
      {
        $ref: "meta/format-annotation",
      },
      {
        $ref: "meta/content",
      },
    ],
    type: ["object", "boolean"],
    $comment:
      "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
    properties: {
      definitions: {
        $comment: '"definitions" has been replaced by "$defs".',
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        deprecated: true,
        default: {},
      },
      dependencies: {
        $comment:
          '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
        type: "object",
        additionalProperties: {
          anyOf: [
            {
              $dynamicRef: "#meta",
            },
            {
              $ref: "meta/validation#/$defs/stringArray",
            },
          ],
        },
        deprecated: true,
        default: {},
      },
      $recursiveAnchor: {
        $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
        $ref: "meta/core#/$defs/anchorString",
        deprecated: true,
      },
      $recursiveRef: {
        $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
        $ref: "meta/core#/$defs/uriReferenceString",
        deprecated: true,
      },
    },
  };
});
var require_applicator = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/applicator",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    },
    $dynamicAnchor: "meta",
    title: "Applicator vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      prefixItems: {
        $ref: "#/$defs/schemaArray",
      },
      items: {
        $dynamicRef: "#meta",
      },
      contains: {
        $dynamicRef: "#meta",
      },
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      properties: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        default: {},
      },
      patternProperties: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        propertyNames: {
          format: "regex",
        },
        default: {},
      },
      dependentSchemas: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        default: {},
      },
      propertyNames: {
        $dynamicRef: "#meta",
      },
      if: {
        $dynamicRef: "#meta",
      },
      then: {
        $dynamicRef: "#meta",
      },
      else: {
        $dynamicRef: "#meta",
      },
      allOf: {
        $ref: "#/$defs/schemaArray",
      },
      anyOf: {
        $ref: "#/$defs/schemaArray",
      },
      oneOf: {
        $ref: "#/$defs/schemaArray",
      },
      not: {
        $dynamicRef: "#meta",
      },
    },
    $defs: {
      schemaArray: {
        type: "array",
        minItems: 1,
        items: {
          $dynamicRef: "#meta",
        },
      },
    },
  };
});
var require_unevaluated = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    },
    $dynamicAnchor: "meta",
    title: "Unevaluated applicator vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      unevaluatedItems: {
        $dynamicRef: "#meta",
      },
      unevaluatedProperties: {
        $dynamicRef: "#meta",
      },
    },
  };
});
var require_content = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/content",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/content": true,
    },
    $dynamicAnchor: "meta",
    title: "Content vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      contentEncoding: {
        type: "string",
      },
      contentMediaType: {
        type: "string",
      },
      contentSchema: {
        $dynamicRef: "#meta",
      },
    },
  };
});
var require_core_2 = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/core",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
    },
    $dynamicAnchor: "meta",
    title: "Core vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      $id: {
        $ref: "#/$defs/uriReferenceString",
        $comment: "Non-empty fragments not allowed.",
        pattern: "^[^#]*#?$",
      },
      $schema: {
        $ref: "#/$defs/uriString",
      },
      $ref: {
        $ref: "#/$defs/uriReferenceString",
      },
      $anchor: {
        $ref: "#/$defs/anchorString",
      },
      $dynamicRef: {
        $ref: "#/$defs/uriReferenceString",
      },
      $dynamicAnchor: {
        $ref: "#/$defs/anchorString",
      },
      $vocabulary: {
        type: "object",
        propertyNames: {
          $ref: "#/$defs/uriString",
        },
        additionalProperties: {
          type: "boolean",
        },
      },
      $comment: {
        type: "string",
      },
      $defs: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
      },
    },
    $defs: {
      anchorString: {
        type: "string",
        pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
      },
      uriString: {
        type: "string",
        format: "uri",
      },
      uriReferenceString: {
        type: "string",
        format: "uri-reference",
      },
    },
  };
});
var require_format_annotation = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    },
    $dynamicAnchor: "meta",
    title: "Format vocabulary meta-schema for annotation results",
    type: ["object", "boolean"],
    properties: {
      format: {
        type: "string",
      },
    },
  };
});
var require_meta_data = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    },
    $dynamicAnchor: "meta",
    title: "Meta-data vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      title: {
        type: "string",
      },
      description: {
        type: "string",
      },
      default: true,
      deprecated: {
        type: "boolean",
        default: false,
      },
      readOnly: {
        type: "boolean",
        default: false,
      },
      writeOnly: {
        type: "boolean",
        default: false,
      },
      examples: {
        type: "array",
        items: true,
      },
    },
  };
});
var require_validation = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/validation",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/validation": true,
    },
    $dynamicAnchor: "meta",
    title: "Validation vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      type: {
        anyOf: [
          {
            $ref: "#/$defs/simpleTypes",
          },
          {
            type: "array",
            items: {
              $ref: "#/$defs/simpleTypes",
            },
            minItems: 1,
            uniqueItems: true,
          },
        ],
      },
      const: true,
      enum: {
        type: "array",
        items: true,
      },
      multipleOf: {
        type: "number",
        exclusiveMinimum: 0,
      },
      maximum: {
        type: "number",
      },
      exclusiveMaximum: {
        type: "number",
      },
      minimum: {
        type: "number",
      },
      exclusiveMinimum: {
        type: "number",
      },
      maxLength: {
        $ref: "#/$defs/nonNegativeInteger",
      },
      minLength: {
        $ref: "#/$defs/nonNegativeIntegerDefault0",
      },
      pattern: {
        type: "string",
        format: "regex",
      },
      maxItems: {
        $ref: "#/$defs/nonNegativeInteger",
      },
      minItems: {
        $ref: "#/$defs/nonNegativeIntegerDefault0",
      },
      uniqueItems: {
        type: "boolean",
        default: false,
      },
      maxContains: {
        $ref: "#/$defs/nonNegativeInteger",
      },
      minContains: {
        $ref: "#/$defs/nonNegativeInteger",
        default: 1,
      },
      maxProperties: {
        $ref: "#/$defs/nonNegativeInteger",
      },
      minProperties: {
        $ref: "#/$defs/nonNegativeIntegerDefault0",
      },
      required: {
        $ref: "#/$defs/stringArray",
      },
      dependentRequired: {
        type: "object",
        additionalProperties: {
          $ref: "#/$defs/stringArray",
        },
      },
    },
    $defs: {
      nonNegativeInteger: {
        type: "integer",
        minimum: 0,
      },
      nonNegativeIntegerDefault0: {
        $ref: "#/$defs/nonNegativeInteger",
        default: 0,
      },
      simpleTypes: {
        enum: ["array", "boolean", "integer", "null", "number", "object", "string"],
      },
      stringArray: {
        type: "array",
        items: {
          type: "string",
        },
        uniqueItems: true,
        default: [],
      },
    },
  };
});
var require_json_schema_2020_12 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let metaSchema = require_schema();
  let applicator = require_applicator();
  let unevaluated = require_unevaluated();
  let content = require_content();
  let core = require_core_2();
  let format = require_format_annotation();
  let metadata = require_meta_data();
  let validation = require_validation();
  let META_SUPPORT_DATA = ["/properties"];
  function addMetaSchema2020($data) {
    [
      metaSchema,
      applicator,
      unevaluated,
      content,
      core,
      with$data(this, format),
      metadata,
      with$data(this, validation),
    ].forEach((sch) => this.addMetaSchema(sch, undefined, false));
    return this;
    function with$data(ajv, sch) {
      return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
    }
  }
  cjsExports.default = addMetaSchema2020;
});
var require_2020 = initModule((cjsExports, cjsModule) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MissingRefError =
    cjsExports.ValidationError =
    cjsExports.CodeGen =
    cjsExports.Name =
    cjsExports.nil =
    cjsExports.stringify =
    cjsExports.str =
    cjsExports._ =
    cjsExports.KeywordCxt =
    cjsExports.Ajv2020 =
      undefined;
  let core_1 = require_core();
  let draft2020_1 = require_draft7_2();
  let discriminator_1 = require_discriminator();
  let json_schema_2020_12_1 = require_json_schema_2020_12();
  let META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
  var Ajv2020 = class extends core_1.default {
    constructor(opts = {}) {
      super({
        ...opts,
        dynamicRef: true,
        next: true,
        unevaluated: true,
      });
    }
    _addVocabularies() {
      super._addVocabularies();
      draft2020_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      let { $data, meta } = this.opts;
      if (!meta) return;
      json_schema_2020_12_1.default.call(this, $data);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
    }
  };
  cjsExports.Ajv2020 = Ajv2020;
  cjsModule.exports = cjsExports = Ajv2020;
  cjsModule.exports.Ajv2020 = Ajv2020;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = Ajv2020;
  var validate_1 = require_validate();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return codegen_1._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return codegen_1.str;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return codegen_1.stringify;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return codegen_1.nil;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return codegen_1.Name;
    },
  });
  Object.defineProperty(cjsExports, "CodeGen", {
    enumerable: true,
    get: function () {
      return codegen_1.CodeGen;
    },
  });
  var validation_error_1 = require_validation_error();
  Object.defineProperty(cjsExports, "ValidationError", {
    enumerable: true,
    get: function () {
      return validation_error_1.default;
    },
  });
  var ref_error_1 = require_ref_error();
  Object.defineProperty(cjsExports, "MissingRefError", {
    enumerable: true,
    get: function () {
      return ref_error_1.default;
    },
  });
});
var require_formats_2 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.formatNames = cjsExports.fastFormats = cjsExports.fullFormats = undefined;
  function fmtDef(validate, compare) {
    return {
      validate,
      compare,
    };
  }
  cjsExports.fullFormats = {
    date: fmtDef(date, compareDate),
    time: fmtDef(getTime(true), compareTime),
    "date-time": fmtDef(getDateTime(true), compareDateTime),
    "iso-time": fmtDef(getTime(), compareIsoTime),
    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri,
    "uri-reference":
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    "uri-template":
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email:
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname:
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    byte,
    int32: {
      type: "number",
      validate: validateInt32,
    },
    int64: {
      type: "number",
      validate: validateInt64,
    },
    float: {
      type: "number",
      validate: validateNumber,
    },
    double: {
      type: "number",
      validate: validateNumber,
    },
    password: true,
    binary: true,
  };
  cjsExports.fastFormats = {
    ...cjsExports.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
    "date-time": fmtDef(
      /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
      compareDateTime,
    ),
    "iso-time": fmtDef(
      /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      compareIsoTime,
    ),
    "iso-date-time": fmtDef(
      /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      compareIsoDateTime,
    ),
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    email:
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  };
  cjsExports.formatNames = Object.keys(cjsExports.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  let DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  let DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function date(str) {
    let matches = DATE.exec(str);
    if (!matches) return false;
    let year = +matches[1];
    let month = +matches[2];
    let day = +matches[3];
    return (
      month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month])
    );
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2)) return;
    if (d1 > d2) return 1;
    if (d1 < d2) return -1;
    return 0;
  }
  let TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function getTime(strictTimeZone) {
    return function (str) {
      let matches = TIME.exec(str);
      if (!matches) return false;
      let hr = +matches[1];
      let min = +matches[2];
      let sec = +matches[3];
      let tz = matches[4];
      let tzSign = matches[5] === "-" ? -1 : 1;
      let tzH = +(matches[6] || 0);
      let tzM = +(matches[7] || 0);
      if (tzH > 23 || tzM > 59 || (strictTimeZone && !tz)) return false;
      if (hr <= 23 && min <= 59 && sec < 60) return true;
      let utcMin = min - tzM * tzSign;
      let utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
      return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
    };
  }
  function compareTime(s1, s2) {
    if (!(s1 && s2)) return;
    let t1 = new Date("2020-01-01T" + s1).valueOf();
    let t2 = new Date("2020-01-01T" + s2).valueOf();
    if (!(t1 && t2)) return;
    return t1 - t2;
  }
  function compareIsoTime(t1, t2) {
    if (!(t1 && t2)) return;
    let a1 = TIME.exec(t1);
    let a2 = TIME.exec(t2);
    if (!(a1 && a2)) return;
    t1 = a1[1] + a1[2] + a1[3];
    t2 = a2[1] + a2[2] + a2[3];
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
    return 0;
  }
  let DATE_TIME_SEPARATOR = /t|\s/i;
  function getDateTime(strictTimeZone) {
    let time = getTime(strictTimeZone);
    return function (str) {
      let dateTime = str.split(DATE_TIME_SEPARATOR);
      return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
    };
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return;
    let d1 = new Date(dt1).valueOf();
    let d2 = new Date(dt2).valueOf();
    if (!(d1 && d2)) return;
    return d1 - d2;
  }
  function compareIsoDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return;
    let [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    let [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    let res = compareDate(d1, d2);
    if (res === undefined) return;
    return res || compareTime(t1, t2);
  }
  let NOT_URI_FRAGMENT = /\/|:/;
  let URI =
    /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }
  let BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
  }
  let MIN_INT32 = -2147483648;
  let MAX_INT32 = 2147483647;
  function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  }
  function validateInt64(value) {
    return Number.isInteger(value);
  }
  function validateNumber() {
    return true;
  }
  let Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str)) return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
});
var require_limit = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.formatLimitDefinition = undefined;
  let ajv_1 = require_ajv();
  let codegen_1 = require_codegen();
  let ops = codegen_1.operators;
  let KWDs = {
    formatMaximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT,
    },
    formatMinimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT,
    },
    formatExclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE,
    },
    formatExclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE,
    },
  };
  let error = {
    message: ({ keyword, schemaCode }) => codegen_1.str`should be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode }) =>
      codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
  };
  cjsExports.formatLimitDefinition = {
    keyword: Object.keys(KWDs),
    type: "string",
    schemaType: "string",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, schemaCode, keyword, it } = cxt;
      let { opts, self: ajvInstance } = it;
      if (!opts.validateFormats) return;
      let fCxt = new ajv_1.KeywordCxt(it, ajvInstance.RULES.all.format.definition, "format");
      if (fCxt.$data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        let fmts = gen.scopeValue("formats", {
          ref: ajvInstance.formats,
          code: opts.code.formats,
        });
        let fmt = gen.const("fmt", codegen_1._`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data(
          (0, codegen_1.or)(
            codegen_1._`typeof ${fmt} != "object"`,
            codegen_1._`${fmt} instanceof RegExp`,
            codegen_1._`typeof ${fmt}.compare != "function"`,
            compareCode(fmt),
          ),
        );
      }
      function validateFormat() {
        let format = fCxt.schema;
        let fmtDef = ajvInstance.formats[format];
        if (!fmtDef || fmtDef === true) return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function")
          throw Error(`"${keyword}": format "${format}" does not define "compare" function`);
        let fmt = gen.scopeValue("formats", {
          key: format,
          ref: fmtDef,
          code: opts.code.formats
            ? codegen_1._`${opts.code.formats}${(0, codegen_1.getProperty)(format)}`
            : undefined,
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return codegen_1._`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
      }
    },
    dependencies: ["format"],
  };
  let formatLimitPlugin = (ajv) => {
    ajv.addKeyword(cjsExports.formatLimitDefinition);
    return ajv;
  };
  cjsExports.default = formatLimitPlugin;
});
var require_ajv_formats = initModule((cjsExports, cjsModule) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let formats_1 = require_formats_2();
  let limit_1 = require_limit();
  let codegen_1 = require_codegen();
  let fullName = new codegen_1.Name("fullFormats");
  let fastName = new codegen_1.Name("fastFormats");
  let formatsPlugin = (
    ajv,
    opts = {
      keywords: true,
    },
  ) => {
    if (Array.isArray(opts)) {
      addFormats(ajv, opts, formats_1.fullFormats, fullName);
      return ajv;
    }
    let [formats, exportName] =
      opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    addFormats(ajv, opts.formats || formats_1.formatNames, formats, exportName);
    if (opts.keywords) (0, limit_1.default)(ajv);
    return ajv;
  };
  formatsPlugin.get = (name, mode = "full") => {
    let f = (mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats)[name];
    if (!f) throw Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv, list, fs, exportName) {
    var _a;
    var _b;
    if (!((_a = (_b = ajv.opts.code).formats) !== null && _a !== undefined))
      _b.formats = codegen_1._`require("ajv-formats/dist/formats").${exportName}`;
    for (let f of list) ajv.addFormat(f, fs[f]);
  }
  cjsModule.exports = cjsExports = formatsPlugin;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = formatsPlugin;
});
var ajvModule = require_ajv();
var Ajv2020 = require_2020();
var import_ajv_formats = interopDefault(require_ajv_formats(), 1);
var DRAFT_2020_12_URIS = new Set([
  "https://json-schema.org/draft/2020-12/schema",
  "http://json-schema.org/draft/2020-12/schema",
]);
var formatsPlugin = import_ajv_formats.default;
export { require_formats, Ajv2020, formatsPlugin, DRAFT_2020_12_URIS, ajvModule };
