// Package helperhistory defines the private, versioned hidden-helper carrier.
// Public clients never gain tool execution authority by supplying this data.
package helperhistory

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

const Version = 1
const MaxPayloadBytes = 32 << 20
const MaxSegments = 256
const MaxChainDepth = 512

// Segment inserts complete paired helper messages at an exact public boundary.
// AfterMessage is a zero-based public message index; equal anchors retain array order.
// PublicAnchorDigest is CanonicalDigest(public messages through that index).
// ToolCatalogDigest is CanonicalDigest(the original tools array, including order).
// Only whole hidden rounds are supported, never overlapping visible blocks.
// The anchor and catalog bind identity; neither is a tool registration.
type Segment struct {
	AfterMessage       int               `json:"after_message"`
	PublicAnchorDigest string            `json:"public_anchor_digest"`
	ToolCatalogDigest  string            `json:"tool_catalog_digest"`
	Messages           []json.RawMessage `json:"messages"`
}

type Payload struct {
	Version  int       `json:"version"`
	Segments []Segment `json:"segments"`
}

// Digest hashes the exact supplied bytes, never float64-decoded JSON.
func Digest(raw []byte) string { h := sha256.Sum256(raw); return hex.EncodeToString(h[:]) }
func ValidDigest(s string) bool {
	if len(s) != 64 {
		return false
	}
	b, e := hex.DecodeString(s)
	return e == nil && hex.EncodeToString(b) == s
}

// Validate checks framing only. Worker must additionally verify original main
// request attribution, paired tool IDs and exact anchors before export/import.
func Validate(raw []byte) error {
	if len(raw) == 0 || len(raw) > MaxPayloadBytes {
		return fmt.Errorf("helper history payload size invalid")
	}
	if _, err := strictValue(raw); err != nil {
		return err
	}
	var p Payload
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(&p); err != nil {
		return fmt.Errorf("invalid helper history JSON: %w", err)
	}
	if p.Version != Version || len(p.Segments) > MaxSegments {
		return fmt.Errorf("unsupported helper history framing")
	}
	previous := -1
	for _, s := range p.Segments {
		if s.AfterMessage < 0 || s.AfterMessage < previous || !ValidDigest(s.PublicAnchorDigest) || !ValidDigest(s.ToolCatalogDigest) || len(s.Messages) == 0 || len(s.Messages)%2 != 0 {
			return fmt.Errorf("invalid helper history segment")
		}
		previous = s.AfterMessage
		for i, m := range s.Messages {
			var v struct {
				Role    string          `json:"role"`
				Content json.RawMessage `json:"content"`
			}
			if json.Unmarshal(m, &v) != nil || len(v.Content) == 0 || v.Content[0] != '[' {
				return fmt.Errorf("invalid helper message")
			}
			role := "assistant"
			if i%2 == 1 {
				role = "user"
			}
			if v.Role != role {
				return fmt.Errorf("invalid helper message order")
			}
		}
	}
	return nil
}
