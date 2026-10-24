// Inserted by patch-cli-2.1.304.cjs into the hash-bound entry function (cli.js
// Ve), ahead of its ordinary command handling, as written. e is Ve's argument
// list and s the settings source it gives CC's fast-path policy. The patcher
// replaces the info placeholder below with the profile's version, patch and
// capabilities; the request command itself is its support module
// (request-entry.js), loaded only here, so an ordinary CLI start is unchanged.
if (e[0] === "--ccgateway-info") { console.log(JSON.stringify(CCGATEWAY_INFO)); return }
if (e[0] === "request") { let { runRequest } = await import("./ccgateway-request-entry.js"); process.exit(await runRequest(e.slice(1), s)) }
