// Package platforms re-exports the built-in platforms of the core, which
// live in the SDK (sdk/platforms) so that plugin authors and the packaging
// CLI can run the same checks against them as the host does. Server modules
// keep importing this package; it adds nothing of its own.
package platforms

import (
	sdkplatforms "github.com/Sub2API-Devs/sup2api/next/sdk/platforms"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Builtin returns copies of the built-in platforms, sorted by id.
func Builtin() []manifest.Platform { return sdkplatforms.Builtin() }

// IsBuiltin reports whether id is a built-in platform id.
func IsBuiltin(id string) bool { return sdkplatforms.IsBuiltin(id) }
