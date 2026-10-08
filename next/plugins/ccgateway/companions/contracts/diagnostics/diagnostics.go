// Package diagnostics carries tenant-authorized correlation without prompt content.
package diagnostics

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

const GrantHeader = "X-CCGateway-Diagnostics-Previous"
const TrackingHeader = "X-CCGateway-Diagnostics-Track"
const ReadyHeader = "X-CCGateway-Diagnostics-Ready"

func Hash(id string) (string, error) {
	if id == "" || len(id) > 512 || strings.ContainsAny(id, "\x00\r\n") {
		return "", fmt.Errorf("invalid diagnostics message ID")
	}
	v := sha256.Sum256([]byte(id))
	return hex.EncodeToString(v[:]), nil
}
