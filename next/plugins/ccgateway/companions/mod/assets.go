package mod

import "embed"

// Files includes the hidden plugin manifest as well as the hooks.
//
//go:embed all:.claude-plugin all:hooks all:search
var Files embed.FS
