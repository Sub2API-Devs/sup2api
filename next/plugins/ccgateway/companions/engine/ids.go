package engine

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
)

// uuidPattern is the shape of a UUID (request log directories, client
// session IDs).
var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// cliSessionPattern is the session the CLI adopts (cli-mods request-identity.js
// accepts exactly a lowercase version 4 UUID, as crypto.randomUUID makes and
// formatUUID writes); another value would fail the request in the CLI.
var cliSessionPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// uuid is a random version 4 UUID.
func uuid() string {
	var b [16]byte
	if _, e := rand.Read(b[:]); e != nil {
		panic(e)
	}
	return formatUUID(b)
}

// digestUUID formats the first 16 bytes of a SHA-256 sum as a version 4 UUID.
func digestUUID(sum [32]byte) string {
	var b [16]byte
	copy(b[:], sum[:16])
	return formatUUID(b)
}

func formatUUID(b [16]byte) string {
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	s := hex.EncodeToString(b[:])
	return s[:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:]
}
