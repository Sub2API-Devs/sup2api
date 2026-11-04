
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{C}from"./chunk-2g090z7k.js";var o={admin:"Your organization's settings need an update. Ask your administrator to fix the API key helper configuration.",settings_unloaded:"Couldn't load your organization's settings. Check your connection, then restart Claude Code.",restart_needed:"Restart Claude Code to finish signing in."};class nU extends C{constructor(e){super(o[e],"Stored login held back",`stored_login_refused_${e}`);this.name="StoredLoginHeldBackError"}}
export{nU};
