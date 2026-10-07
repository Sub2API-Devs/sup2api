module ccgateway

go 1.24

require github.com/santhosh-tekuri/jsonschema/v6 v6.0.3

require github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts v0.0.0

replace github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts => ./contracts

require golang.org/x/text v0.14.0 // indirect
