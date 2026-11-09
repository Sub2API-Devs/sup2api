package pkg

import "github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"

// testHostVersion is the core these tests run as: new enough for every
// manifest declaration the fixtures use (pkgtest.Declared needs the
// declarative upstream core).
const testHostVersion = check.UpstreamFirstCore
