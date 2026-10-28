// Inserted by patch-cli.cjs into the hash-bound CLI entry function, ahead of
// its ordinary command handling, as written. The version's anchors
// (patches/<version>.cjs) name the entry's argument list (CCGATEWAY_ARGS) and
// the settings source it gives CC's fast-path policy (CCGATEWAY_SETTINGS); the
// patcher replaces the info placeholder with the profile's version, patch and
// capabilities. Both commands are support modules loaded only here, so an
// ordinary CLI start is unchanged: request-entry.js for `request`, and the
// management command (usage, profile and Files/Skills calls through CC's own
// runtime) for `ccgateway-mgmt`.
if (CCGATEWAY_ARGS[0] === "--ccgateway-info") { console.log(JSON.stringify(CCGATEWAY_INFO)); return }
if (CCGATEWAY_ARGS[0] === "request") { let { runRequest } = await import("./ccgateway-request-entry.js"); process.exit(await runRequest(CCGATEWAY_ARGS.slice(1), CCGATEWAY_SETTINGS)) }
if (CCGATEWAY_ARGS[0] === "ccgateway-mgmt") { let { runManagementCommand } = await import("./ccgateway-management-command.js"); process.exit(await runManagementCommand(CCGATEWAY_ARGS.slice(1))) }
