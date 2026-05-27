#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$DemoDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentLog   = Join-Path $DemoDir 'agent-server.log'
$AgentPyLog = Join-Path $DemoDir 'agent-server-py.log'

function Install-Deps($dir) {
    Write-Host "Installing dependencies in $dir..."
    $nm = Join-Path $dir 'node_modules'
    if (Test-Path $nm) { Remove-Item $nm -Recurse -Force }
    npm install --prefix $dir --silent
}

function Install-PyDeps($dir) {
    Write-Host "Installing Python dependencies in $dir..."
    pip3 install -q -r (Join-Path $dir 'requirements.txt')
}

function Stop-Servers {
    Write-Host ''
    Write-Host 'Stopping servers...'
    @($portalProc, $agentProc, $agentPyProc, $inspectorJsProc, $inspectorPyProc) |
        Where-Object { $_ -and -not $_.HasExited } |
        ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    Write-Host 'Cleaning up node_modules...'
    Remove-Item (Join-Path $DemoDir 'agent-server\node_modules')  -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $DemoDir 'payment-portal\node_modules') -Recurse -Force -ErrorAction SilentlyContinue
}

Install-Deps (Join-Path $DemoDir 'payment-portal')
Install-Deps (Join-Path $DemoDir 'agent-server')
Install-PyDeps (Join-Path $DemoDir 'agent-server-py')

Write-Host ''
Write-Host 'Starting payment-portal     ->  http://localhost:8080'
$portalProc = Start-Process -FilePath 'npm' `
    -ArgumentList 'start', '--prefix', (Join-Path $DemoDir 'payment-portal') `
    -RedirectStandardOutput (Join-Path $DemoDir 'portal.log') `
    -RedirectStandardError  (Join-Path $DemoDir 'portal.log') `
    -NoNewWindow -PassThru

Write-Host 'Starting agent-server (JS)  ->  http://localhost:3000'
'' | Set-Content $AgentLog
$agentProc = Start-Process -FilePath 'node' `
    -ArgumentList (Join-Path $DemoDir 'agent-server\server.js') `
    -RedirectStandardOutput $AgentLog `
    -RedirectStandardError  $AgentLog `
    -WorkingDirectory (Join-Path $DemoDir 'agent-server') `
    -Environment @{ PORT = '3000' } `
    -NoNewWindow -PassThru

Write-Host 'Starting agent-server (Py)  ->  http://localhost:3001'
'' | Set-Content $AgentPyLog
$agentPyProc = Start-Process -FilePath 'python3' `
    -ArgumentList 'server.py' `
    -RedirectStandardOutput $AgentPyLog `
    -RedirectStandardError  $AgentPyLog `
    -WorkingDirectory (Join-Path $DemoDir 'agent-server-py') `
    -Environment @{ PORT = '3001' } `
    -NoNewWindow -PassThru

Write-Host 'Opening MCP Inspector (JS)  ->  http://localhost:6274'
$inspectorJsProc = Start-Process -FilePath 'npx' `
    -ArgumentList '@modelcontextprotocol/inspector', '--transport', 'stdio', 'node', (Join-Path $DemoDir 'agent-server\lib\mcp-server.js') `
    -NoNewWindow -PassThru

Write-Host 'Opening MCP Inspector (Py)  ->  http://localhost:6275'
$inspectorPyProc = Start-Process -FilePath 'npx' `
    -ArgumentList '@modelcontextprotocol/inspector', 'python3', (Join-Path $DemoDir 'agent-server-py\lib\mcp_server.py') `
    -Environment @{ CLIENT_PORT = '6275'; SERVER_PORT = '6278' } `
    -NoNewWindow -PassThru

Write-Host ''
Write-Host '+-----------------------------------------------------------+'
Write-Host '|                                                           |'
Write-Host '|   Open the payment portal in your browser:               |'
Write-Host '|                                                           |'
Write-Host '|      http://localhost:8080                                |'
Write-Host '|                                                           |'
Write-Host '|   Agent server (Node.js) ->  http://localhost:3000       |'
Write-Host '|   Agent server (Python)  ->  http://localhost:3001       |'
Write-Host '|                                                           |'
Write-Host '|   MCP Inspector (JS)     ->  http://localhost:6274       |'
Write-Host '|   MCP Inspector (Py)     ->  http://localhost:6275       |'
Write-Host '|                                                           |'
Write-Host '|   Press Ctrl-C to stop all servers.                      |'
Write-Host '|                                                           |'
Write-Host '+-----------------------------------------------------------+'
Write-Host ''
Write-Host "Agent server logs (JS) -> $AgentLog"
Write-Host "Agent server logs (Py) -> $AgentPyLog"
Write-Host ''

try {
    # Tail both log files by polling them in a loop (PowerShell has no native multi-file tail).
    $jsPos  = (Get-Item $AgentLog).Length
    $pyPos  = (Get-Item $AgentPyLog).Length
    while ($true) {
        Start-Sleep -Milliseconds 200
        $jsLen = (Get-Item $AgentLog).Length
        if ($jsLen -gt $jsPos) {
            $stream = [System.IO.File]::Open($AgentLog, 'Open', 'Read', 'ReadWrite')
            $stream.Seek($jsPos, 'Begin') | Out-Null
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host -NoNewline $reader.ReadToEnd()
            $jsPos = $stream.Position
            $reader.Close(); $stream.Close()
        }
        $pyLen = (Get-Item $AgentPyLog).Length
        if ($pyLen -gt $pyPos) {
            $stream = [System.IO.File]::Open($AgentPyLog, 'Open', 'Read', 'ReadWrite')
            $stream.Seek($pyPos, 'Begin') | Out-Null
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host -NoNewline $reader.ReadToEnd()
            $pyPos = $stream.Position
            $reader.Close(); $stream.Close()
        }
    }
} finally {
    Stop-Servers
}
