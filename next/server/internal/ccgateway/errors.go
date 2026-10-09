package ccgateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// reasonMessages are the English messages of the details.reason codes the
// core produces itself (CONTRACTS §49.12). The console translates the code;
// the message is the fallback for codes it does not know.
var reasonMessages = map[string]string{
	"not_configured":       "Account runtimes are not configured or the Docker host cannot be reached.",
	"not_synchronized":     "The account runtime is not ready yet; try again shortly.",
	"sync_failed":          "The account runtime could not be synchronized (container creation or the proxy check failed).",
	"runtime_unavailable":  "The account runtime is unavailable.",
	"no_proxy":             "The runtime has no proxy; choose a proxy first.",
	"proxy_disabled":       "The runtime's proxy is disabled.",
	"proxy_not_found":      "The proxy does not exist or is not visible to you.",
	"account_disabled":     "The account is disabled or deleted.",
	"api_key_account":      "API key accounts do not use OAuth authorization.",
	"draft_not_found":      "The draft runtime does not exist, was saved already, expired or belongs to someone else.",
	"draft_not_authorized": "Claude Code is not signed in in this runtime yet.",
	// Runtime installation (§49.16).
	"ssh_not_configured":   "Save an SSH connection to the Docker host first.",
	"ssh_failed":           "The Docker host could not be reached over SSH, or the remote command failed.",
	"image_pull_failed":    "A runtime image could not be pulled on the Docker host.",
	"controller_unhealthy": "The controller is not healthy (after an install: the new one was rolled back, see details.rollback).",
	"controller_outdated":  "The controller does not support updating workers in place; upgrade the controller first (no account container was changed).",
	"install_failed":       "The runtime could not be installed on the Docker host.",
	"install_in_progress":  "Another runtime installation is running.",
	// Control panel mode (§53).
	"runtimes_disabled":         "Turn on per-account runtimes first.",
	"invalid_host":              "The control panel address must be an IP address or a DNS name.",
	"invalid_email":             "The ACME account email is invalid.",
	"config_changed":            "The CCGateway configuration changed during the installation; check it and install again.",
	"gateway_failed":            "The HTTPS gateway (Caddy) could not be started on the Docker host.",
	"ca_unavailable":            "The root certificate of the gateway's internal CA could not be read.",
	"gateway_unreachable":       "The core cannot reach the controller through the HTTPS gateway (see details.stage: connect, tls or http); check the firewall and DNS, then install again.",
	"controller_not_configured": "This operation needs the control panel connection mode.",
	"invalid_request":           "The request is invalid.",
	"too_many_uploads":          "Too many unfinished uploads; delete one or wait for it to expire.",
	"offset_mismatch":           "The upload offset does not match; continue from details.offset.",
	"incomplete":                "The upload is not complete yet.",
	"checksum_mismatch":         "The uploaded file does not match its SHA-256.",
	"load_failed":               "The image could not be loaded (expected a docker save tar or gzip tar).",
	"invalid_image":             "The image reference is invalid or the image is not allowed.",
	"upgrade_in_progress":       "A controller upgrade is running.",
}

// reasonError is base with the English message of reason and
// details.reason = reason.
func reasonError(base *core.Error, reason string) *core.Error {
	msg := reasonMessages[reason]
	if msg == "" {
		msg = base.Message
	}
	return base.WithMessage(msg).WithDetails(map[string]any{"reason": reason})
}

// transportError maps a failed controller call.
func transportError(e error) *core.Error {
	if errors.Is(e, errNotConfigured) || errors.Is(e, errUnreachable) {
		return reasonError(core.ErrUnavailable, "not_configured")
	}
	return reasonError(core.ErrUnavailable, "runtime_unavailable")
}

var codePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

// parseRuntimeError reads the error code and message of a controller
// ({"error":"<code>"}) or business container
// ({"type":"error","error":{"type":"<code>","message":"..."}}) answer. A code
// that is not a lowercase identifier (older images sent sentences) is "";
// the message loses control characters and is cut to 200 runes.
func parseRuntimeError(raw []byte) (code, message string) {
	var container struct {
		Error struct {
			Type    string `json:"type"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(raw, &container) == nil {
		code, message = container.Error.Type, container.Error.Message
	} else {
		var controller struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(raw, &controller) == nil {
			code = controller.Error
		}
	}
	if !codePattern.MatchString(code) {
		code = ""
	}
	msg := []rune(strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, message)))
	if len(msg) > 200 {
		msg = msg[:200]
	}
	return code, string(msg)
}

// runtimeError maps a non-200 answer of the controller or of the business
// container behind it. 400: the container's (or controller's) code becomes
// details.reason, unknown codes included, with the container's message.
// 409: not synchronized yet (or an API key runtime). Anything else: 503.
func runtimeError(status int, raw []byte) *core.Error {
	code, msg := parseRuntimeError(raw)
	switch status {
	case http.StatusBadRequest:
		if code == "" {
			return core.ErrInvalidArgument.WithMessage("The account runtime rejected the request.")
		}
		if msg == "" {
			msg = reasonMessages[code]
		}
		if msg == "" {
			msg = "The account runtime rejected the request."
		}
		return core.ErrInvalidArgument.WithMessage(msg).WithDetails(map[string]any{"reason": code})
	case http.StatusConflict:
		if code == "api_key_account" {
			return reasonError(core.ErrInvalidArgument, code)
		}
		return reasonError(core.ErrUnavailable, "not_synchronized")
	default:
		if code == "" || code == "not_found" || code == "method_not_allowed" {
			return reasonError(core.ErrUnavailable, "runtime_unavailable")
		}
		return reasonError(core.ErrUnavailable, code)
	}
}
