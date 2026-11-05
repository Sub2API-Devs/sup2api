module ccgateway/worker

go 1.24

require (
	ccgateway v0.0.0
	github.com/stretchr/testify v1.8.4
)

replace ccgateway => ..

require github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts v0.0.0

replace github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts => ../contracts

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/redis/go-redis/v9 v9.22.0 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/sys v0.30.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
