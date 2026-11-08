package proxy

import (
	"crypto/tls"
	"testing"
)

func TestDivertedOnlyWhenForwardingToAReadyPeer(t *testing.T) {
	peerReady := true
	clientTLS := &tls.Config{MinVersion: tls.VersionTLS13}
	r := New(Config{PeerTLS: clientTLS, PeerTransport: PeerTransport(clientTLS), PeerReady: func(Route) bool { return peerReady }, LocalReady: func() bool { return true }})
	if r.Diverted() {
		t.Fatal("maintenance route counted as diverted")
	}
	if err := r.SetRoute(Route{Mode: "local-serving", LocalURL: "http://127.0.0.1:1", CoreBootID: "b", Revision: 1}); err != nil {
		t.Fatal(err)
	}
	if r.Diverted() {
		t.Fatal("local serving counted as diverted")
	}
	if err := r.SetRoute(Route{Mode: "forward-only", PeerURL: "https://peer.internal:7443", CoreBootID: "b", Revision: 2, PeerRevision: 1}); err != nil {
		t.Fatal(err)
	}
	if !r.Diverted() {
		t.Fatal("forwarding to a ready peer not counted as diverted")
	}
	peerReady = false
	if r.Diverted() {
		t.Fatal("forwarding to an unready peer counted as diverted")
	}
}
