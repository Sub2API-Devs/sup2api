package ccgateway

import (
	"errors"
	"io"
	"net/http"
)

// errTooLarge: an answer exceeded the size the caller accepts.
var errTooLarge = errors.New("CCGateway answer too large")

// readBounded reads all of r when it holds at most limit bytes; a longer
// answer is errTooLarge (never a truncated value).
func readBounded(r io.Reader, limit int64) ([]byte, error) {
	raw, err := io.ReadAll(io.LimitReader(r, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(raw)) > limit {
		return nil, errTooLarge
	}
	return raw, nil
}

// newNoRedirectClient is an HTTP client over rt that never follows a
// redirect: the controller, the Workers and the gateway never redirect, and
// following one would carry the management or Worker key elsewhere.
func newNoRedirectClient(rt http.RoundTripper) *http.Client {
	return &http.Client{Transport: rt, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}
