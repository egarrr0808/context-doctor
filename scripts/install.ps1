param(
  [switch]$Local,
  [switch]$VSCode,
  [ValidateSet("powershell")]
  [string]$Completion
)

$ErrorActionPreference = "Stop"

function Need($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Need node
Need npm

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($Local) {
  Push-Location $Root
  npm install
  npm run build
  npm link --workspace '@context-doctor/core'
  npm link --workspace context-doctor
  Pop-Location
} else {
  npm install -g context-doctor
}

if ($Completion) {
  context-doctor completion powershell | Add-Content $PROFILE
  Write-Host "Added PowerShell completion to $PROFILE"
}

if ($VSCode) {
  Need code
  Push-Location $Root
  npm run build
  npm run pack:vscode
  code --install-extension (Join-Path $Root "packages/vscode/context-doctor-vscode-0.1.0.vsix")
  Pop-Location
}

context-doctor doctor
Write-Host "Installed. Try: context-doctor explain"
