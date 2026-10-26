// Inserted by patch-cli.cjs into the hash-bound CLI entry function, ahead of
// its ordinary command handling, as written. The version's anchors
// (patches/<version>.cjs) name the entry's argument list (CCGATEWAY_ARGS) and
// the settings source it gives CC's fast-path policy (CCGATEWAY_SETTINGS); the
// patcher replaces the info placeholder with the profile's version, patch and
// capabilities. The request command itself is its support module
// (request-entry.js), loaded only here, so an ordinary CLI start is unchanged.
if (CCGATEWAY_ARGS[0] === "--ccgateway-info") { console.log(JSON.stringify(CCGATEWAY_INFO)); return }
if (CCGATEWAY_ARGS[0] === "request") { let { runRequest } = await import("./ccgateway-request-entry.js"); process.exit(await runRequest(CCGATEWAY_ARGS.slice(1), CCGATEWAY_SETTINGS)) }
