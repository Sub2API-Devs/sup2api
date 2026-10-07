package catalog

import _ "embed"

//go:embed claude-2.1.288.json
var NativeTools []byte

//go:embed claude-2.1.292.json
var NativeTools21292 []byte
