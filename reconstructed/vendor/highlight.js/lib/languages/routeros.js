/**
 * highlight.js/lib/languages/routeros.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:394771-397360 cjs-fingerprint
var Os = x(function (qg, Rs) {
  function rm(e) {
    let r = { className: "variable", variants: [{ begin: /\$[\w\d#@][\w\d_]*/ }, { begin: /\$\{(.*?)\}/ }] },
      i = {
        className: "string",
        begin: /"/,
        end: /"/,
        contains: [
          e.BACKSLASH_ESCAPE,
          r,
          { className: "variable", begin: /\$\(/, end: /\)/, contains: [e.BACKSLASH_ESCAPE] },
        ],
      },
      c = { className: "string", begin: /'/, end: /'/ };
    return {
      name: "MikroTik RouterOS script",
      aliases: ["mikrotik"],
      case_insensitive: !0,
      keywords: {
        $pattern: /:?[\w-]+/,
        literal: "true false yes no nothing nil null",
        keyword:
          "foreach do while for if from to step else on-error and or not in :" +
          "foreach do while for if from to step else on-error and or not in".split(" ").join(" :") +
          " :" +
          "global local beep delay put len typeof pick log time set find environment terminal error execute parse resolve toarray tobool toid toip toip6 tonum tostr totime"
            .split(" ")
            .join(" :"),
      },
      contains: [
        {
          variants: [
            { begin: /\/\*/, end: /\*\// },
            { begin: /\/\//, end: /$/ },
            { begin: /<\//, end: />/ },
          ],
          illegal: /./,
        },
        e.COMMENT("^#", "$"),
        i,
        c,
        r,
        {
          begin: /[\w-]+=([^\s{}[\]()>]+)/,
          relevance: 0,
          returnBegin: !0,
          contains: [
            { className: "attribute", begin: /[^=]+/ },
            {
              begin: /=/,
              endsWithParent: !0,
              relevance: 0,
              contains: [
                i,
                c,
                r,
                {
                  className: "literal",
                  begin: "\\b(" + "true false yes no nothing nil null".split(" ").join("|") + ")\\b",
                },
                { begin: /("[^"]*"|[^\s{}[\]]+)/ },
              ],
            },
          ],
        },
        { className: "number", begin: /\*[0-9a-fA-F]+/ },
        {
          begin:
            "\\b(" +
            "add remove enable disable set get print export edit find run debug error info warning"
              .split(" ")
              .join("|") +
            ")([\\s[(\\]|])",
          returnBegin: !0,
          contains: [{ className: "built_in", begin: /\w+/ }],
        },
        {
          className: "built_in",
          variants: [
            {
              begin:
                "(\\.\\./|/|\\s)((" +
                "traffic-flow traffic-generator firewall scheduler aaa accounting address-list address align area bandwidth-server bfd bgp bridge client clock community config connection console customer default dhcp-client dhcp-server discovery dns e-mail ethernet filter firmware gps graphing group hardware health hotspot identity igmp-proxy incoming instance interface ip ipsec ipv6 irq l2tp-server lcd ldp logging mac-server mac-winbox mangle manual mirror mme mpls nat nd neighbor network note ntp ospf ospf-v3 ovpn-server page peer pim ping policy pool port ppp pppoe-client pptp-server prefix profile proposal proxy queue radius resource rip ripng route routing screen script security-profiles server service service-port settings shares smb sms sniffer snmp snooper socks sstp-server system tool tracking type upgrade upnp user-manager users user vlan secret vrrp watchdog web-access wireless pptp pppoe lan wan layer7-protocol lease simple raw"
                  .split(" ")
                  .join("|") +
                ");?\\s)+",
            },
            { begin: /\.\./, relevance: 0 },
          ],
        },
      ],
    };
  }
  Rs.exports = rm;
});

export { Os };
