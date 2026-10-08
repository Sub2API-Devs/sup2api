// Package resources defines the shared, fixed provider resource transport contract.
package resources

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

const (
	InternalPrefix         = "/_ccgateway/resources"
	IdentityPath           = InternalPrefix + "/identity"
	PrincipalHeader        = "X-CCGateway-Resource-Principal"
	GenerationHeader       = "X-CCGateway-Resource-Generation"
	HardBodyLimit    int64 = 512 << 20
)

type Identity struct {
	PrincipalID string `json:"principal_id"`
	Generation  string `json:"generation"`
	AuthType    string `json:"auth_type,omitempty"`
}
type Operation struct{ Method, Path, RawQuery string }

var segment = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]{0,255}$`)

// ValidateOperation permits only resource paths, never a hostname or model API.
func ValidateOperation(op Operation) (bool, error) {
	if !strings.HasPrefix(op.Path, "/") || strings.Contains(op.Path, "%") {
		return false, fmt.Errorf("invalid resource path")
	}
	parts := strings.Split(strings.TrimPrefix(op.Path, "/"), "/")
	if len(parts) < 2 || parts[0] != "v1" || (parts[1] != "files" && parts[1] != "skills") {
		return false, fmt.Errorf("unknown resource endpoint")
	}
	for _, part := range parts {
		if !segment.MatchString(part) {
			return false, fmt.Errorf("invalid resource path segment")
		}
	}
	allowed, upload := false, false
	switch parts[1] {
	case "files":
		switch len(parts) {
		case 2:
			allowed = op.Method == "GET" || op.Method == "POST"
			upload = op.Method == "POST"
		case 3:
			allowed = op.Method == "GET" || op.Method == "DELETE"
		case 4:
			allowed = parts[3] == "content" && op.Method == "GET"
		}
	case "skills":
		switch len(parts) {
		case 2:
			allowed = op.Method == "GET" || op.Method == "POST"
			upload = op.Method == "POST"
		case 3:
			allowed = op.Method == "GET" || op.Method == "DELETE"
		case 4:
			allowed = parts[3] == "versions" && (op.Method == "GET" || op.Method == "POST")
			upload = allowed && op.Method == "POST"
		case 5:
			allowed = parts[3] == "versions" && (op.Method == "GET" || op.Method == "DELETE")
		}
	}
	if !allowed {
		return false, fmt.Errorf("unsupported resource method or path")
	}
	query, err := url.ParseQuery(op.RawQuery)
	if err != nil {
		return false, fmt.Errorf("invalid resource query")
	}
	for key := range query {
		valid := op.Method == "GET" && ((parts[1] == "files" && len(parts) == 2 && (key == "limit" || key == "page" || key == "before_id" || key == "after_id" || key == "ids" || key == "ids[]")) || (parts[1] == "skills" && (len(parts) == 2 || len(parts) == 4) && (key == "limit" || key == "page" || key == "source")))
		if !valid {
			return false, fmt.Errorf("unsupported resource query parameter")
		}
	}
	return upload, nil
}
