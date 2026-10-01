param([string]$GoBinary = 'go')

# These correctness assertions FAIL on audit baseline 7ec4a9fbc.
# Only in-memory Redis and a local PostgreSQL protocol stub are used.
# Go overlays add tests without changing production packages.
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$serverRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../server'))
$temporaryRoot = Join-Path $env:TEMP ('sup2api-multinode-audit-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
$replacementMap = @{}
$replacementMap[(Join-Path $serverRoot 'internal/cluster/audit_multinode_test.go')] = Join-Path $PSScriptRoot 'slots_test.go.txt'
$replacementMap[(Join-Path $serverRoot 'internal/plugin/grpcruntime/audit_multinode_test.go')] = Join-Path $PSScriptRoot 'configure_test.go.txt'
$overlayPath = Join-Path $temporaryRoot 'overlay.json'
$overlayJson = @{ Replace = $replacementMap } | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($overlayPath, $overlayJson, [Text.UTF8Encoding]::new($false))
$savedEnvironment = @{}
$testEnvironment = @{
    TEST_DATABASE_URL = ''
    TEST_REDIS_URL = ''
    GOCACHE = (Join-Path $temporaryRoot 'go-cache')
    GOPROXY = 'off'
    GOSUMDB = 'off'
}
$resultCode = 1
try {
    foreach ($key in $testEnvironment.Keys) {
        $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $testEnvironment[$key], 'Process')
    }
    Push-Location -LiteralPath $serverRoot
    try {
        & $GoBinary test -overlay $overlayPath ./internal/cluster ./internal/plugin/grpcruntime -run '^TestAudit' -count=1 -timeout 30s -v
        $resultCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    foreach ($key in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process')
    }
}
Write-Output "Audit overlay and build cache: $temporaryRoot"
exit $resultCode
