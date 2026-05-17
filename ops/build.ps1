param(
  [Parameter(Position = 0)]
  [ValidateSet('dev', 'prod')]
  [string]$Mode = 'dev'
)

$OpsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $OpsDir
node "$RootDir/ops/build.mjs" $Mode