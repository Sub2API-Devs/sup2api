package engine

import (
	"net/http"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
)

type providerResponseKey struct{}

// Response facts belong to this request, never to an auxiliary classifier.
// Shared by Request comparison copies; a copied Request never copies a mutex.
type providerResponseFacts struct {
	mu     sync.Mutex
	header http.Header
}

func captureProviderResponseFacts(response *http.Response) {
	if response.Request == nil || response.StatusCode < 200 || response.StatusCode >= 300 {
		return
	}
	facts, _ := response.Request.Context().Value(providerResponseKey{}).(*providerResponseFacts)
	if facts == nil {
		return
	}
	facts.mu.Lock()
	facts.header = httpfacts.Select(response.Header)
	facts.mu.Unlock()
}

func (f *providerResponseFacts) apply(destination http.Header) {
	if f == nil {
		return
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	httpfacts.Apply(destination, f.header)
}
