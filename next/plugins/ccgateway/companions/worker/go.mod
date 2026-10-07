module ccgateway/worker

go 1.24

require (
	ccgateway v0.0.0
	github.com/stretchr/testify v1.8.4
)

replace ccgateway => ..

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/santhosh-tekuri/jsonschema/v6 v6.0.3 // indirect
	golang.org/x/text v0.14.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
