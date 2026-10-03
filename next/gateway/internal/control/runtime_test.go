package control

import "testing"

func TestBundleLocationKeepsPublisherAndPeerSourcesApart(t *testing.T) {
	digest := "ab12"
	for _, c := range []struct {
		base, want string
		peer       bool
	}{
		{"https://releases.example.com/sup2api", "https://releases.example.com/sup2api/ab12.tar.gz", false},
		{"https://releases.example.com/sup2api/", "https://releases.example.com/sup2api/ab12.tar.gz", false},
		{"https://node-a:7443/internal/blobs", "https://node-a:7443/internal/blobs/ab12", true},
		{"https://node-a:7443/internal/blobs/", "https://node-a:7443/internal/blobs/ab12", true},
	} {
		got, peer := bundleLocation(c.base, digest)
		if got != c.want || peer != c.peer {
			t.Errorf("%s: got %s peer=%v", c.base, got, peer)
		}
	}
}
