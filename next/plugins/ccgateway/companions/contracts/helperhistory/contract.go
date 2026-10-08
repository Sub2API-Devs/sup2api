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
const PayloadVersion1 = 1
const PayloadVersion2 = 2
const SegmentSystemOnly = "system_only"
const SegmentWholeRound = "whole_round"
const MaxPayloadBytes = 32 << 20
const MaxSegments = 256
const MaxChainDepth = 512

// Segment inserts hidden protocol messages at an exact public boundary.
// AfterMessage is a zero-based public message index; equal anchors retain array order.
// PublicAnchorDigest is CanonicalDigest(public messages through that index).
// ToolCatalogDigest is CanonicalDigest(the original tools array, including order).
// Version 1 carries whole hidden rounds; version 2 also permits separately
// attributed system-only gaps. Neither can overlap visible public messages.
// The anchor and catalog bind identity; neither is a tool registration.
type Segment struct {
	Kind               string            `json:"kind,omitempty"`
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
	if (p.Version != PayloadVersion1 && p.Version != PayloadVersion2) || len(p.Segments) > MaxSegments {
		return fmt.Errorf("unsupported helper history framing")
	}
	previous := -1
	for _, s := range p.Segments {
		if p.Version == PayloadVersion1 && s.Kind != "" || p.Version == PayloadVersion2 && s.Kind != SegmentSystemOnly && s.Kind != SegmentWholeRound {
			return fmt.Errorf("invalid helper segment kind for payload version")
		}
		if s.AfterMessage < 0 || s.AfterMessage < previous || !ValidDigest(s.PublicAnchorDigest) || !ValidDigest(s.ToolCatalogDigest) || len(s.Messages) == 0 {
			return fmt.Errorf("invalid helper history segment")
		}
		previous = s.AfterMessage
		pairIndex := 0
		for _, m := range s.Messages {
			var v struct {
				Role    string          `json:"role"`
				Content json.RawMessage `json:"content"`
			}
			if json.Unmarshal(m, &v) != nil || len(v.Content) == 0 || (v.Content[0] != '[' && !(v.Role == "system" && v.Content[0] == '"')) {
				return fmt.Errorf("invalid helper message")
			}
			if s.Kind == SegmentSystemOnly {
				if v.Role != "system" {
					return fmt.Errorf("system-only helper segment contains non-system message")
				}
				var content any
				_ = json.Unmarshal(v.Content, &content)
				switch c := content.(type) {
				case string:
					if c == "" {
						return fmt.Errorf("empty helper system content")
					}
				case []any:
					if len(c) == 0 {
						return fmt.Errorf("empty helper system content")
					}
				default:
					return fmt.Errorf("invalid helper system content")
				}
				continue
			}
			if v.Role == "system" && pairIndex == 0 {
				continue
			}
			role := "assistant"
			if pairIndex%2 == 1 {
				role = "user"
			}
			if v.Role != role {
				return fmt.Errorf("invalid helper message order")
			}
			pairIndex++
		}
		if s.Kind != SegmentSystemOnly && (pairIndex == 0 || pairIndex%2 != 0) {
			return fmt.Errorf("incomplete helper message pair")
		}
	}
	return nil
}
