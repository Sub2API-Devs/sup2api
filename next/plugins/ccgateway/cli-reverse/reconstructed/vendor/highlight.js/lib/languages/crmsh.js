/**
 * highlight.js/lib/languages/crmsh.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-636gp747.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-636gp747.js:87064-88643 cjs-fingerprint
var require_crmsh = __commonJS(function (cjsExports, cjsModule) {
  function crmsh(hljs) {
    let COMMANDS =
      "group clone ms master location colocation order fencing_topology rsc_ticket acl_target acl_group user role tag xml";
    let PROPERTY_SETS = "property rsc_defaults op_defaults";
    let KEYWORDS = "params meta operations op rule attributes utilization";
    let OPERATORS =
      "read write deny defined not_defined in_range date spec in ref reference attribute type xpath version and or lt gt tag lte gte eq ne \\";
    let TYPES = "number string";
    let LITERALS = "Master Started Slave Stopped start promote demote stop monitor true false";
    return {
      name: "crmsh",
      aliases: ["crm", "pcmk"],
      case_insensitive: true,
      keywords: {
        keyword: "params meta operations op rule attributes utilization " + OPERATORS + " number string",
        literal: "Master Started Slave Stopped start promote demote stop monitor true false",
      },
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          beginKeywords: "node",
          starts: {
            end: "\\s*([\\w_-]+:)?",
            starts: {
              className: "title",
              end: "\\s*[\\$\\w_][\\w_-]*",
            },
          },
        },
        {
          beginKeywords: "primitive rsc_template",
          starts: {
            className: "title",
            end: "\\s*[\\$\\w_][\\w_-]*",
            starts: {
              end: "\\s*@?[\\w_][\\w_\\.:-]*",
            },
          },
        },
        {
          begin: "\\b(" + COMMANDS.split(" ").join("|") + ")\\s+",
          keywords: COMMANDS,
          starts: {
            className: "title",
            end: "[\\$\\w_][\\w_-]*",
          },
        },
        {
          beginKeywords: "property rsc_defaults op_defaults",
          starts: {
            className: "title",
            end: "\\s*([\\w_-]+:)?",
          },
        },
        hljs.QUOTE_STRING_MODE,
        {
          className: "meta",
          begin: "(ocf|systemd|service|lsb):[\\w_:-]+",
          relevance: 0,
        },
        {
          className: "number",
          begin: "\\b\\d+(\\.\\d+)?(ms|s|h|m)?",
          relevance: 0,
        },
        {
          className: "literal",
          begin: "[-]?(infinity|inf)",
          relevance: 0,
        },
        {
          className: "attr",
          begin: /([A-Za-z$_#][\w_-]+)=/,
          relevance: 0,
        },
        {
          className: "tag",
          begin: "</?",
          end: "/?>",
          relevance: 0,
        },
      ],
    };
  }
  cjsModule.exports = crmsh;
});
export { require_crmsh };
