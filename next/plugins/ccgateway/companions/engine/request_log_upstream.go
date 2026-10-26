package engine

// The request the CLI finally sent upstream, in the request's log
// (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3). A CLI with
// features.RequestCaptureCapability writes it into the request's temporary
// directory (--capture-request <dir>/sent, --capture-body); the Worker keeps it
// before that directory is removed: its facts and headers as a summary file
// (upstream-request.json), its body as content (upstream-request.body), and
// the facts people search by as flat metadata fields.
import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
)

const (
	upstreamRequestFile = "upstream-request.json"
	upstreamBodyFile    = "upstream-request.body"
	// upstreamFactsMax bounds the CLI's sent.json as it is read.
	upstreamFactsMax = 256 << 10
	// upstreamBetasMax bounds the betas kept in the metadata.
	upstreamBetasMax = 64
)

// logSessionID is the shape of a session ID the log keeps; any other value is
// left out.
var logSessionID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

// sha256Hex is a body digest as the log writes it.
var sha256Hex = regexp.MustCompile(`^[0-9a-f]{64}$`)

// upstreamCapture says what this request's log takes of the request the CLI
// sends: its facts while the log is on, and its body only at the full level
// for a request whose content may be kept raw (not the credential-safe
// capture) and while the log still has room. Read under d.mu (lock).
func (d *requestDiagnostic) upstreamCapture() (request, body bool) {
	if d == nil {
		return false, false
	}
	unlock := d.lock()
	defer unlock()
	if d.directory == "" || d.finished {
		return false, false
	}
	return true, !d.summaryOnly && !d.secretCapture && !d.discarded
}

// upstreamCapture is the CLI's capture prefix in the request's temporary
// directory and whether it writes the body; "" when the CLI cannot or the log
// keeps nothing.
func (g *Gateway) upstreamCapture(d *requestDiagnostic, dir string) (string, bool) {
	if !g.CLIInfo.supports(features.RequestCaptureCapability) {
		return "", false
	}
	request, body := d.upstreamCapture()
	if !request {
		return "", false
	}
	return filepath.Join(dir, "sent"), body
}

// reachedUpstream says whether the CLI certainly sent its request: the
// upstream answered (the response metadata the CLI writes for a success) or
// its error frame is the upstream's own HTTP error. A failure before sending
// (input, a refused login) has no sent request; a transport, timeout or
// interruption failure may have come before or after sending, so it is not
// taken as evidence either.
func (c *cliRun) reachedUpstream() bool {
	if info, err := os.Lstat(c.meta); err == nil && info.Mode().IsRegular() {
		return true
	}
	frame := c.stderr.result()
	return frame != nil && frame.Source == requestfailure.SourceHTTP
}

// sentRequest is the facts the CLI writes in <prefix>.json (§2).
type sentRequest struct {
	Schema        int               `json:"schema"`
	Mode          string            `json:"mode"`
	Attempts      *int              `json:"attempts"`
	Method        string            `json:"method"`
	URL           string            `json:"url"`
	Headers       map[string]string `json:"headers"`
	BodyEncoding  string            `json:"body_encoding"`
	BodyBytes     *int64            `json:"body_bytes"`
	BodySHA256    string            `json:"body_sha256"`
	ContentSHA256 string            `json:"content_sha256"`
	Model         *string           `json:"model"`
	Stream        *bool             `json:"stream"`
}

// keepUpstreamRequest keeps what the CLI wrote under prefix ("" when it was
// not asked) once it has ended; reached says the request certainly went
// upstream (cliRun.reachedUpstream).
func (d *requestDiagnostic) keepUpstreamRequest(prefix string, body, reached bool) {
	if d == nil || prefix == "" {
		if d.enabled() {
			d.setField("upstream_captured", false)
		}
		return
	}
	raw, err := readBounded(prefix+".json", upstreamFactsMax)
	var sent sentRequest
	reason := ""
	switch {
	case os.IsNotExist(err):
		reason = "absent"
	case err != nil:
		reason = "unreadable"
	case json.Unmarshal(raw, &sent) != nil:
		reason = "invalid"
	}
	if reason != "" {
		// A request that failed before sending has nothing to capture: the
		// field is left out, so the viewer does not report it as missed.
		if reached {
			d.setField("upstream_captured", false)
			d.trace("upstream_capture_missing", Object{"reason": reason})
		}
		return
	}
	// The body is opened before the request's lock is taken; the copy runs
	// under it, as every other file of the log is written.
	var source *os.File
	if body {
		if f, err := os.Open(prefix + ".body"); err == nil {
			source = f
			defer f.Close()
		}
	}
	unlock := d.lock()
	defer unlock()
	// A request whose content may hold a credential keeps only its redacted
	// facts (diagnostic_secrets.go); the metadata reads the same.
	redacted := d.redactCaptureLocked(raw)
	if d.secretCapture {
		sent = sentRequest{}
		_ = json.Unmarshal(redacted, &sent)
	}
	d.fields["upstream_captured"] = d.saveLocked(upstreamRequestFile, raw)
	if source != nil {
		d.copyLocked(upstreamBodyFile, source)
	}
	d.upstreamFieldsLocked(sent)
}

// upstreamFieldsLocked writes the sent request's facts as flat metadata
// fields (caller holds d.mu): identifiers and digests only, never content.
func (d *requestDiagnostic) upstreamFieldsLocked(sent sentRequest) {
	if sent.Attempts != nil {
		d.fields["upstream_attempts"] = *sent.Attempts
	}
	if sent.Model != nil {
		d.fields["upstream_model"] = logValue(*sent.Model)
	}
	if sent.Stream != nil {
		d.fields["upstream_stream"] = *sent.Stream
	}
	if sent.BodyBytes != nil {
		d.fields["upstream_body_bytes"] = *sent.BodyBytes
	}
	if sha256Hex.MatchString(sent.BodySHA256) {
		d.fields["upstream_body_sha256"] = sent.BodySHA256
	}
	// Changed compares content: the padding CC's transport adds after a large
	// body is not a change (bodyDigests). A CLI that wrote no content digest
	// (an encoded body) is compared byte for byte.
	switch {
	case sha256Hex.MatchString(sent.ContentSHA256) && d.contentSHA256 != "":
		d.fields["upstream_content_sha256"] = sent.ContentSHA256
		d.fields["body_changed"] = d.contentSHA256 != sent.ContentSHA256
	case sha256Hex.MatchString(sent.BodySHA256):
		if client, ok := d.fields["body_sha256"].(string); ok && client != "" {
			d.fields["body_changed"] = client != sent.BodySHA256
		}
	}
	header := func(name string) string {
		for key, value := range sent.Headers {
			if strings.EqualFold(key, name) {
				return value
			}
		}
		return ""
	}
	if session := header("x-claude-code-session-id"); logSessionID.MatchString(session) {
		d.fields["upstream_session_id"] = session
	}
	if class := header("x-claude-code-request-class"); class != "" {
		d.fields["upstream_request_class"] = logValue(class)
	}
	if betas := splitBetas(header("anthropic-beta")); len(betas) > 0 {
		d.fields["upstream_betas"] = betas
	}
}

// splitBetas is an anthropic-beta value as its list, each beta bounded.
func splitBetas(value string) []string {
	betas := []string{}
	for _, beta := range strings.Split(value, ",") {
		if beta = strings.TrimSpace(beta); beta != "" && len(betas) < upstreamBetasMax {
			betas = append(betas, logValue(beta))
		}
	}
	return betas
}

// copyLocked keeps a content file the CLI wrote, within the request's budget
// (caller holds d.mu). Only raw content goes this way: a request whose content
// must be redacted, or one at the summary level, keeps none.
func (d *requestDiagnostic) copyLocked(name string, source *os.File) bool {
	if d.directory == "" || !d.keeps(name) || d.secretCapture {
		return false
	}
	info, err := source.Stat()
	if err != nil || !info.Mode().IsRegular() {
		return false
	}
	size := min(info.Size(), d.requestLimit()+1)
	if !d.reserve(int(size)) {
		return false
	}
	target, err := os.OpenFile(filepath.Join(d.directory, name), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		d.logFailure(err)
		return false
	}
	copied, err := io.Copy(target, io.LimitReader(source, size))
	if closeErr := target.Close(); err == nil {
		err = closeErr
	}
	if err == nil && copied != size {
		err = io.ErrUnexpectedEOF
	}
	if err != nil {
		d.logFailure(err)
		return false
	}
	return true
}

// clientSession records the client's session: the one in its metadata.user_id
// or, without a usable one, its Claude Code session header.
func (d *requestDiagnostic) clientSession(client clientIdentity, h http.Header) {
	session := client.fields["session_id"]
	if !logSessionID.MatchString(session) {
		session = h.Get("X-Claude-Code-Session-Id")
	}
	if logSessionID.MatchString(session) {
		d.setField("client_session_id", session)
	}
}
