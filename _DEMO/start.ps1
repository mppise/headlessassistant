#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$DemoDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentLog = Join-Path $DemoDir 'agent-server.log'

function Install-Deps($dir) {
    Write-Host "Installing dependencies in $dir..."
    $nm = Join-Path $dir 'node_modules'
    if (Test-Path $nm) { Remove-Item $nm -Recurse -Force }
    npm install --prefix $dir --silent
}

function Stop-Servers {
    Write-Host ''
    Write-Host 'Stopping servers...'
    @($portalProc, $agentProc, $inspectorProc) | Where-Object { $_ -and -not $_.HasExited } | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host 'Cleaning up node_modules...'
    Remove-Item (Join-Path $DemoDir 'agent-server\node_modules')  -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $DemoDir 'payment-portal\node_modules') -Recurse -Force -ErrorAction SilentlyContinue
}

Install-Deps (Join-Path $DemoDir 'payment-portal')
Install-Deps (Join-Path $DemoDir 'agent-server')

Write-Host ''
Write-Host 'Starting payment-portal ->  http://localhost:8080'
$portalProc = Start-Process -FilePath 'node' `
    -ArgumentList (Join-Path $DemoDir 'payment-portal\server.js') `
    -RedirectStandardOutput (Join-Path $DemoDir 'portal.log') `
    -RedirectStandardError  (Join-Path $DemoDir 'portal.log') `
    -NoNewWindow -PassThru

Write-Host 'Starting agent-server   ->  http://localhost:3000'
'' | Set-Content $AgentLog
$agentProc = Start-Process -FilePath 'node' `
    -ArgumentList (Join-Path $DemoDir 'agent-server\server.js') `
    -RedirectStandardOutput $AgentLog `
    -RedirectStandardError  $AgentLog `
    -NoNewWindow -PassThru

Write-Host 'Opening MCP Inspector...'
$inspectorProc = Start-Process -FilePath 'npx' `
    -ArgumentList "@modelcontextprotocol/inspector", 'node', (Join-Path $DemoDir 'agent-server\lib\mcp-server.js') `
    -NoNewWindow -PassThru

Write-Host ''
Write-Host '+---------------------------------------------------------+'
Write-Host '|                                                         |'
Write-Host '|   Open the payment portal in your browser:             |'
Write-Host '|                                                         |'
Write-Host '|      http://localhost:8080                              |'
Write-Host '|                                                         |'
Write-Host '|   Press Ctrl-C to stop both servers.                   |'
Write-Host '|                                                         |'
Write-Host '+---------------------------------------------------------+'
Write-Host ''
Write-Host "Agent server logs -> $AgentLog"
Write-Host ''

try {
    Get-Content -Path $AgentLog -Wait
} finally {
    Stop-Servers
}
