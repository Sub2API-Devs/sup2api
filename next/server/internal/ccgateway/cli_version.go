package ccgateway

// The image decides the Claude Code version (cli-from-image-v1, 2026-11-02):
// a new account runtime runs the CLI its image packages, an existing one
// keeps the CLI it runs until an administrator updates it in place (all
// runtimes through runtime/workers, one through runtimes/:key/worker). The
// core names no version in the runtime configuration and none in the
// request policy it sends; the Worker knows its own CLI, and the request
// path checks the capabilities a policy needs, not a version.

// cliFromImageFeature is the controller feature that lets the core leave
// the CLI to the image (a runtime configuration without "cli", a paired
// update without cli_version).
const cliFromImageFeature = "cli-from-image-v1"

// PinnedCLIVersion is the Claude Code version a controller without
// cli-from-image-v1 is asked for when the stored policy names none: the
// version the bundled runtime image packages.
const PinnedCLIVersion = "2.1.312"

// legacyCLI is the profile a controller without cli-from-image-v1 is sent:
// the stored policy's cli_version (else the pinned one), as before.
func legacyCLI(cfg Config) *RuntimeCLI {
	return &RuntimeCLI{Version: cfg.EffectiveRequestPolicy().CLIVersion, RequestMode: runtimeDefaultMode, DisableAutoUpdate: true}
}
