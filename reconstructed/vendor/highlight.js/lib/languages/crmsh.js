/**
 * highlight.js/lib/languages/crmsh.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:87064-88643 cjs-fingerprint
var mn = x(function (Gu, pn) {
  function yl(e) {
    let n =
        "group clone ms master location colocation order fencing_topology rsc_ticket acl_target acl_group user role tag xml",
      a = "property rsc_defaults op_defaults",
      s = "params meta operations op rule attributes utilization",
      o =
        "read write deny defined not_defined in_range date spec in ref reference attribute type xpath version and or lt gt tag lte gte eq ne \\",
      r = "number string",
      i = "Master Started Slave Stopped start promote demote stop monitor true false";
    return {
      name: "crmsh",
      aliases: ["crm", "pcmk"],
      case_insensitive: !0,
      keywords: {
        keyword: "params meta operations op rule attributes utilization " + o + " number string",
        literal: "Master Started Slave Stopped start promote demote stop monitor true false",
      },
      contains: [
        e.HASH_COMMENT_MODE,
        {
          beginKeywords: "node",
          starts: { end: "\\s*([\\w_-]+:)?", starts: { className: "title", end: "\\s*[\\$\\w_][\\w_-]*" } },
        },
        {
          beginKeywords: "primitive rsc_template",
          starts: {
            className: "title",
            end: "\\s*[\\$\\w_][\\w_-]*",
            starts: { end: "\\s*@?[\\w_][\\w_\\.:-]*" },
          },
        },
        {
          begin: "\\b(" + n.split(" ").join("|") + ")\\s+",
          keywords: n,
          starts: { className: "title", end: "[\\$\\w_][\\w_-]*" },
        },
        {
          beginKeywords: "property rsc_defaults op_defaults",
          starts: { className: "title", end: "\\s*([\\w_-]+:)?" },
        },
        e.QUOTE_STRING_MODE,
        { className: "meta", begin: "(ocf|systemd|service|lsb):[\\w_:-]+", relevance: 0 },
        { className: "number", begin: "\\b\\d+(\\.\\d+)?(ms|s|h|m)?", relevance: 0 },
        { className: "literal", begin: "[-]?(infinity|inf)", relevance: 0 },
        { className: "attr", begin: /([A-Za-z$_#][\w_-]+)=/, relevance: 0 },
        { className: "tag", begin: "</?", end: "/?>", relevance: 0 },
      ],
    };
  }
  pn.exports = yl;
});

export { mn };
