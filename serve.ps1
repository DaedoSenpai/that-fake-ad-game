$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Owner = "DaedoSenpai"
$Repo = "that-fake-ad-game"
$Branch = "main"
$UserAgent = "that-fake-ad-game-updater"
$Root = $PSScriptRoot
$ApiHeaders = @{
  "User-Agent" = $UserAgent
  "Accept" = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

function ConvertTo-UnixPath([string]$Path) {
  return ($Path -replace "\\", "/").Trim("/")
}

function Test-SkipPath([string]$RelPath) {
  $n = ConvertTo-UnixPath $RelPath
  if ($n -match "(^|/)\.git(/|$)") { return $true }
  if ($n -match "(^|/)\.cursor(/|$)") { return $true }
  return $false
}

function Test-UpdateSkipPath([string]$RelPath) {
  if (Test-SkipPath $RelPath) { return $true }
  $n = ConvertTo-UnixPath $RelPath
  if ($n -match "(^|/)data(/|$)") { return $true }
  return $false
}

function Get-LocalPath([string]$RelPath) {
  $n = ConvertTo-UnixPath $RelPath
  if (-not $n -or $n.Contains("..")) { throw "Caminho invalido." }
  $full = [System.IO.Path]::GetFullPath((Join-Path $Root ($n -replace "/", [IO.Path]::DirectorySeparatorChar)))
  $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd("\", "/")
  $prefix = ($rootFull + [IO.Path]::DirectorySeparatorChar).ToLowerInvariant()
  if ($full.ToLowerInvariant() -ne $rootFull.ToLowerInvariant() -and -not $full.ToLowerInvariant().StartsWith($prefix)) {
    throw "Caminho fora da pasta do jogo."
  }
  return $full
}

function Get-GitBlobSha([string]$FilePath) {
  $bytes = [byte[]][System.IO.File]::ReadAllBytes($FilePath)
  $header = [byte[]][System.Text.Encoding]::ASCII.GetBytes(("blob {0}`0" -f $bytes.Length))
  $all = New-Object byte[] ($header.Length + $bytes.Length)
  [System.Buffer]::BlockCopy($header, 0, $all, 0, $header.Length)
  [System.Buffer]::BlockCopy($bytes, 0, $all, $header.Length, $bytes.Length)
  $sha = [System.Security.Cryptography.SHA1]::Create()
  try {
    $hash = [byte[]]$sha.ComputeHash($all)
    return ([BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-RawUrl([string]$RelPath) {
  $parts = (ConvertTo-UnixPath $RelPath) -split "/" | ForEach-Object { [Uri]::EscapeDataString($_) }
  return "https://raw.githubusercontent.com/$Owner/$Repo/$Branch/$($parts -join '/')"
}

function Invoke-GitHubGet([string]$Url) {
  try {
    return Invoke-RestMethod -Uri $Url -Headers $ApiHeaders
  } catch {
    $msg = $_.Exception.Message
    $detail = ""
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
    if ($msg -match "403" -or $detail -match "rate limit") {
      throw "O GitHub limitou as consultas. Espera um pouco e tenta de novo."
    }
    if ($msg -match "404" -or $detail -match "Not Found") {
      throw "Nao achei o repositorio publico no GitHub."
    }
    throw "Falha ao falar com o GitHub. $($msg)"
  }
}

function Get-AsUtc($raw) {
  if ($null -eq $raw) { return $null }
  if ($raw -is [datetime]) { return ([datetime]$raw).ToUniversalTime() }
  return [datetime]::Parse($raw.ToString(), [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
}

function Get-RemoteCommitTime([string]$RelPath) {
  $q = [Uri]::EscapeDataString((ConvertTo-UnixPath $RelPath))
  $url = "https://api.github.com/repos/$Owner/$Repo/commits?sha=$Branch&path=$q&per_page=1"
  $commits = @(Invoke-GitHubGet $url)
  if ($commits.Count -lt 1) { return $null }
  $node = $commits[0].commit
  $raw = $null
  if ($node.committer) { $raw = $node.committer.date }
  if ($null -eq $raw -and $node.author) { $raw = $node.author.date }
  return Get-AsUtc $raw
}

function Get-UpdatePlan {
  $treeUrl = "https://api.github.com/repos/$Owner/$Repo/git/trees/${Branch}?recursive=1"
  $tree = Invoke-GitHubGet $treeUrl
  if ($tree.truncated) { throw "A arvore do GitHub veio cortada. O repo ficou grande demais pro updater." }

  $same = New-Object System.Collections.ArrayList
  $download = New-Object System.Collections.ArrayList
  $keepLocal = New-Object System.Collections.ArrayList
  $missing = New-Object System.Collections.ArrayList

  foreach ($entry in @($tree.tree)) {
    if ($entry.type -ne "blob") { continue }
    $rel = ConvertTo-UnixPath ([string]$entry.path)
    if (Test-UpdateSkipPath $rel) { continue }

    $local = Get-LocalPath $rel
    $remoteSha = ([string]$entry.sha).ToLowerInvariant()

    if (-not (Test-Path -LiteralPath $local)) {
      [void]$missing.Add($rel)
      [void]$download.Add(@{ path = $rel; reason = "missing" })
      continue
    }

    $localSha = Get-GitBlobSha $local
    if ($localSha -eq $remoteSha) {
      [void]$same.Add($rel)
      continue
    }

    $remoteTime = Get-RemoteCommitTime $rel
    $localTime = [System.IO.File]::GetLastWriteTimeUtc($local)
    if ($null -eq $remoteTime -or $remoteTime -gt $localTime.AddSeconds(2)) {
      $item = @{
        path = $rel
        reason = "newer"
        localTime = $localTime.ToString("o")
      }
      if ($null -ne $remoteTime) { $item.remoteTime = $remoteTime.ToString("o") }
      [void]$download.Add($item)
    } else {
      [void]$keepLocal.Add(@{
        path = $rel
        remoteTime = $remoteTime.ToString("o")
        localTime = $localTime.ToString("o")
      })
    }
  }

  return @{
    ok = $true
    repo = "$Owner/$Repo"
    branch = $Branch
    same = $same.Count
    download = $download.ToArray()
    keepLocal = $keepLocal.ToArray()
    missing = $missing.ToArray()
  }
}

function Save-RemoteFile([string]$RelPath) {
  $dest = Get-LocalPath $RelPath
  $dir = Split-Path -Parent $dest
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $tmp = $dest + ".update-tmp"
  $url = Get-RawUrl $RelPath
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp -Headers @{ "User-Agent" = $UserAgent }
  if (-not (Test-Path -LiteralPath $tmp)) { throw "Download vazio: $RelPath" }
  Move-Item -LiteralPath $tmp -Destination $dest -Force
}

function Apply-UpdatePlan($Plan) {
  $updated = New-Object System.Collections.ArrayList
  $failed = New-Object System.Collections.ArrayList
  foreach ($item in @($Plan.download)) {
    $rel = [string]$item.path
    try {
      Save-RemoteFile $rel
      [void]$updated.Add($rel)
    } catch {
      [void]$failed.Add(@{ path = $rel; error = $_.Exception.Message })
    }
  }
  return @{
    ok = ($failed.Count -eq 0)
    updated = $updated.ToArray()
    failed = $failed.ToArray()
    keepLocal = $Plan.keepLocal
    same = $Plan.same
  }
}

function ConvertTo-JsonText($Obj) {
  return ($Obj | ConvertTo-Json -Depth 8 -Compress)
}

function Get-Mime([string]$Path) {
  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".gif" { "image/gif" }
    ".webp" { "image/webp" }
    ".svg" { "image/svg+xml" }
    ".ogg" { "audio/ogg" }
    ".mp3" { "audio/mpeg" }
    ".wav" { "audio/wav" }
    ".txt" { "text/plain; charset=utf-8" }
    ".md" { "text/markdown; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Read-RequestBody($Context) {
  $len = $Context.Request.ContentLength64
  if ($len -le 0) { return "" }
  $buf = New-Object byte[] $len
  $read = 0
  while ($read -lt $len) {
    $n = $Context.Request.InputStream.Read($buf, $read, $len - $read)
    if ($n -le 0) { break }
    $read += $n
  }
  return [Text.Encoding]::UTF8.GetString($buf, 0, $read)
}

function Write-HttpBytes($Context, [int]$Status, [string]$ContentType, [byte[]]$Bytes) {
  $Context.Response.StatusCode = $Status
  $Context.Response.ContentType = $ContentType
  $Context.Response.Headers["Cache-Control"] = "no-cache"
  $Context.Response.Headers["Access-Control-Allow-Origin"] = "*"
  $Context.Response.Headers["Access-Control-Allow-Private-Network"] = "true"
  if ($null -eq $Bytes) { $Bytes = @() }
  $Context.Response.ContentLength64 = $Bytes.Length
  if ($Bytes.Length -gt 0) {
    $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  }
  $Context.Response.OutputStream.Close()
}

function Write-HttpText($Context, [int]$Status, [string]$ContentType, [string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($(if ($null -eq $Text) { "" } else { $Text }))
  Write-HttpBytes $Context $Status $ContentType $bytes
}

function Get-SavePath {
  return Get-LocalPath "data/tfag-save.json"
}

function Get-SaveExportPath {
  return Get-LocalPath "data/tfag-save-http.json"
}

function Get-SaveStorePath {
  return Get-LocalPath "data/tfag-save-store.js"
}

function Read-SaveFile([string]$FilePath) {
  if (-not (Test-Path -LiteralPath $FilePath)) { return $null }
  return [IO.File]::ReadAllBytes($FilePath)
}

function Write-SaveJson([string]$FilePath, [string]$Raw) {
  $dir = Split-Path -Parent $FilePath
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($FilePath, $Raw, $utf8)
}

function Handle-SaveGet($Context, [string]$FilePath) {
  $bytes = Read-SaveFile $FilePath
  if ($null -eq $bytes) {
    Write-HttpText $Context 200 "application/json; charset=utf-8" '{"ok":true,"save":null}'
    return
  }
  Write-HttpBytes $Context 200 "application/json; charset=utf-8" $bytes
}

function Handle-SavePost($Context, [string]$FilePath, [switch]$AlsoStore) {
  $raw = Read-RequestBody $Context
  if (-not $raw) {
    Write-HttpText $Context 400 "application/json; charset=utf-8" (ConvertTo-JsonText @{ ok = $false; error = "Save vazio." })
    return
  }
  try {
    $null = $raw | ConvertFrom-Json
  } catch {
    Write-HttpText $Context 400 "application/json; charset=utf-8" (ConvertTo-JsonText @{ ok = $false; error = "Save invalido." })
    return
  }
  Write-SaveJson $FilePath $raw
  if ($AlsoStore) {
    Write-SaveJson (Get-SaveStorePath) ("window.__TFAG_DISK_SAVE = " + $raw + ";")
  }
  Write-HttpText $Context 200 "application/json; charset=utf-8" '{"ok":true}'
}

function Handle-Api($Context, [string]$Path, [string]$Method) {
  if ($Path -eq "/api/save") {
    if ($Method -eq "GET") { Handle-SaveGet $Context (Get-SavePath); return }
    if ($Method -eq "POST") { Handle-SavePost $Context (Get-SavePath) -AlsoStore; return }
    Write-HttpText $Context 405 "application/json; charset=utf-8" (ConvertTo-JsonText @{ ok = $false; error = "Metodo nao permitido." })
    return
  }

  if ($Path -eq "/api/save-export") {
    if ($Method -eq "GET") { Handle-SaveGet $Context (Get-SaveExportPath); return }
    if ($Method -eq "POST") { Handle-SavePost $Context (Get-SaveExportPath); return }
    Write-HttpText $Context 405 "application/json; charset=utf-8" (ConvertTo-JsonText @{ ok = $false; error = "Metodo nao permitido." })
    return
  }

  if ($Path -eq "/api/ping") {
    Write-HttpText $Context 200 "application/json; charset=utf-8" (ConvertTo-JsonText @{
      ok = $true
      updater = $true
      repo = "$Owner/$Repo"
      branch = $Branch
    })
    return
  }

  if ($Path -eq "/api/update") {
    $apply = $false
    if ($Method -eq "POST") {
      $raw = Read-RequestBody $Context
      if ($raw) {
        try {
          $body = $raw | ConvertFrom-Json
          if ($body.apply -eq $true) { $apply = $true }
        } catch { }
      }
    } elseif ($Context.Request.QueryString["apply"] -eq "1") {
      $apply = $true
    }

    $plan = Get-UpdatePlan
    if ($apply) {
      $result = Apply-UpdatePlan $plan
      Write-HttpText $Context 200 "application/json; charset=utf-8" (ConvertTo-JsonText $result)
    } else {
      Write-HttpText $Context 200 "application/json; charset=utf-8" (ConvertTo-JsonText $plan)
    }
    return
  }

  Write-HttpText $Context 404 "application/json; charset=utf-8" (ConvertTo-JsonText @{ ok = $false; error = "Nao achei essa rota." })
}

function Handle-Static($Context, [string]$UrlPath) {
  $rel = $UrlPath.TrimStart("/")
  if (-not $rel) { $rel = "index.html" }
  $rel = [Uri]::UnescapeDataString($rel)
  if (Test-SkipPath $rel) {
    Write-HttpText $Context 404 "text/plain; charset=utf-8" "Nao encontrado."
    return
  }
  $full = Get-LocalPath $rel
  if (-not (Test-Path -LiteralPath $full) -or (Get-Item -LiteralPath $full).PSIsContainer) {
    Write-HttpText $Context 404 "text/plain; charset=utf-8" "Nao encontrado."
    return
  }
  $bytes = [IO.File]::ReadAllBytes($full)
  Write-HttpBytes $Context 200 (Get-Mime $full) $bytes
}

function Handle-Request($Context) {
  try {
    $method = $Context.Request.HttpMethod.ToUpperInvariant()
    $path = [Uri]::UnescapeDataString($Context.Request.Url.AbsolutePath)
    if ($method -eq "OPTIONS") {
      $Context.Response.StatusCode = 204
      $Context.Response.Headers["Access-Control-Allow-Origin"] = "*"
      $Context.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
      $Context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
      $Context.Response.Headers["Access-Control-Allow-Private-Network"] = "true"
      $Context.Response.Close()
      return
    }
    if ($path.StartsWith("/api/")) {
      Handle-Api $Context $path $method
      return
    }
    if ($method -ne "GET" -and $method -ne "HEAD") {
      Write-HttpText $Context 405 "text/plain; charset=utf-8" "Metodo nao permitido."
      return
    }
    Handle-Static $Context $path
  } catch {
    try {
      Write-HttpText $Context 500 "application/json; charset=utf-8" (ConvertTo-JsonText @{
        ok = $false
        error = $_.Exception.Message
        where = $_.ScriptStackTrace
      })
    } catch { }
  }
}

function Start-GameServer {
  $listener = $null
  $port = 0
  foreach ($tryPort in 8765..8780) {
    try {
      $candidate = New-Object System.Net.HttpListener
      $prefix = "http://127.0.0.1:$tryPort/"
      $candidate.Prefixes.Add($prefix)
      $candidate.Start()
      $listener = $candidate
      $port = $tryPort
      break
    } catch {
      if ($candidate) { try { $candidate.Close() } catch { } }
    }
  }
  if (-not $listener) {
    throw "Nao consegui abrir a porta local. Fecha outro Jogar.bat e tenta de novo."
  }

  $url = "http://127.0.0.1:$port/"
  $indexPath = [System.IO.Path]::GetFullPath((Join-Path $Root "index.html"))
  Write-Host ""
  Write-Host "That Fake Ad Game"
  Write-Host "Abrindo o jogo (mesmo save do index.html)."
  Write-Host "Servidor local em $url"
  Write-Host "Deixa essa janela aberta. Fecha ela pra desligar o jogo."
  Write-Host ""
  Start-Process $indexPath | Out-Null

  try {
    while ($listener.IsListening) {
      $context = $listener.GetContext()
      Handle-Request $context
    }
  } finally {
    try { $listener.Stop() } catch { }
    try { $listener.Close() } catch { }
  }
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Start-GameServer
