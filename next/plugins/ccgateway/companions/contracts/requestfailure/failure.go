// Package requestfailure carries failure facts across the trusted boundaries
// of a CCGateway request: which side produced an error answer, and why. The
// markers must never be accepted from a provider: the Worker strips them from
// upstream answers (httpfacts.Apply) and only its own writers set them.
package requestfailure

import (
	"net/http"
	"regexp"
)

// SourceHeader names who produced an error answer.
const SourceHeader = "X-CCGateway-Error-Source"

// The sources. The CLI's request command reports the first five in its
// stderr frame (the Worker writes them on); the last two are the gateway's
// own refusals (2026-10-23, audit C2/A6).
const (
	// SourceHTTP: an upstream HTTP error, passed through byte for byte.
	SourceHTTP = "http"
	// SourceInput, SourceTransport, SourceTimeout, SourceInterrupted,
	// SourceInternal: the CLI failed before or while talking to the upstream.
	SourceInput       = "input"
	SourceTransport   = "transport"
	SourceTimeout     = "timeout"
	SourceInterrupted = "interrupted"
	SourceInternal    = "internal"
	// SourceGateway: the Worker refused the request itself (its key, the
	// request policy, the body, its concurrency) before running the CLI.
	SourceGateway = "gateway"
	// SourceCore: the core refused the request before asking any Worker (the
	// account's state, the configuration, the feature policy, a Worker
	// without the required capabilities).
	SourceCore = "core"
)

// ReasonHeader carries a machine-readable reason with a gateway or core
// answer (a lowercase identifier: not_synchronized, configuration_error,
// concurrency_limit, ...). The body's type stays an official Anthropic error
// type; this header is for the plugin and the logs.
const ReasonHeader = "X-CCGateway-Error-Reason"

var reasonPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

// Source is the single valid source of h, or "".
func Source(h http.Header) string {
	return SourceOf(h.Values(SourceHeader))
}

// SourceOf is Source for header values already read (the plugin host hands
// headers to a plugin as a lowercase map).
func SourceOf(values []string) string {
	if len(values) != 1 {
		return ""
	}
	switch values[0] {
	case SourceHTTP, SourceInput, SourceTransport, SourceTimeout, SourceInterrupted, SourceInternal, SourceGateway, SourceCore:
		return values[0]
	}
	return ""
}

// Local reports whether a source names the gateway's own refusal (core or
// Worker), as opposed to the upstream's answer or the CLI's failure to
// reach it.
func Local(source string) bool {
	return source == SourceGateway || source == SourceCore
}

// Reason is the valid reason of h, or "".
func Reason(h http.Header) string {
	return ReasonOf(h.Get(ReasonHeader))
}

// ReasonOf is Reason for a value already read.
func ReasonOf(value string) string {
	if reasonPattern.MatchString(value) {
		return value
	}
	return ""
}
