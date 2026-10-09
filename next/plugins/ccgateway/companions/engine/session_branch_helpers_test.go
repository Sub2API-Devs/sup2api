package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

// testBranch is an indexed main-thread session branch whose index namespace
// is logical, for tests that drive prepareHistory and commit directly.
func testBranch(logical string) sessionBranch {
	u := upstreamSessionID(logical)
	return sessionBranch{Client: logical, ID: u, Upstream: u, Logical: logical}
}

// setTestSession puts a client session into a /v1/messages request the way
// CC does: as metadata.user_id (§53.12; an opaque string selects the session
// by digest). The legacy X-CCGateway-Session-ID header no longer does.
func setTestSession(t *testing.T, r *http.Request, session string) {
	t.Helper()
	if err := addClientSession(r, session); err != nil {
		t.Fatal(err)
	}
}

// fixtureClientSession serves h as a CC client would reach it: every
// /v1/messages request without metadata gets metadata.user_id = session, so
// the requests of one fixture are one client session. (Before §53.12 they
// shared the implicit logical session "auto".)
func fixtureClientSession(h http.Handler, session string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/v1/messages") {
			if err := addClientSession(r, session); err != nil && err != errHasMetadata {
				http.Error(w, err.Error(), 400)
				return
			}
		}
		h.ServeHTTP(w, r)
	})
}

var errHasMetadata = errors.New("request already names its metadata")

func addClientSession(r *http.Request, session string) error {
	if strings.HasSuffix(r.URL.Path, "/count_tokens") {
		return errors.New("count_tokens requests carry no metadata")
	}
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	restore := func(b []byte) {
		r.Body = io.NopCloser(bytes.NewReader(b))
		r.ContentLength = int64(len(b))
		r.Header.Del("Content-Length")
	}
	body, err := decodeObject(raw)
	if err != nil {
		restore(raw)
		return err
	}
	if _, exists := body["metadata"]; exists {
		restore(raw)
		return errHasMetadata
	}
	body["metadata"] = Object{"user_id": session}
	raw, _ = json.Marshal(body)
	restore(raw)
	return nil
}
