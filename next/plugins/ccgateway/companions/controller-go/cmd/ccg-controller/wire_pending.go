//go:build !ccgwired

package main

import "errors"

// errNotWired: this binary was built without the business packages.
//
// PENDING: the coordinator deletes this file and the ccgwired build tag of
// wire.go once accounts, updates, uploads, cleanup and admin are merged.
// Until then `serve` must fail loudly (exit 70), never look like it runs.
var errNotWired = errors.New("serve is not wired yet: built without the ccgwired tag (business packages pending)")

func build(deps) (*services, error) { return nil, errNotWired }
