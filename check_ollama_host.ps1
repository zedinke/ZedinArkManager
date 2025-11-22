# Ollama HOST ellenorzes es beallitas

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Ollama HOST ellenorzes es beallitas" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ellenorzes: admin jogosultsag
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Admin jogosultsag szukseges!" -ForegroundColor Red
    Write-Host "   Futtasd PowerShell-ben 'Run as Administrator' modban" -ForegroundColor Yellow
    exit 1
}

# Jelenlegi OLLAMA_HOST ellenorzes
Write-Host "1. Jelenlegi OLLAMA_HOST ellenorzes..." -ForegroundColor Yellow
$currentHostMachine = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "Machine")
$currentHostUser = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "User")
$currentHostProcess = $env:OLLAMA_HOST

Write-Host "   Machine (gep szintu): $currentHostMachine" -ForegroundColor White
Write-Host "   User (felhasznalo szintu): $currentHostUser" -ForegroundColor White
Write-Host "   Process (jelenlegi session): $currentHostProcess" -ForegroundColor White

# OLLAMA_HOST beallitasa - MINDKET helyen (User es Machine)
Write-Host ""
Write-Host "2. OLLAMA_HOST beallitasa: 0.0.0.0:11434..." -ForegroundColor Yellow
Write-Host "   (Beallitjuk User es Machine szinten is)" -ForegroundColor Cyan
try {
    # Eloszor toroljuk a regi ertekeket (ha vannak)
    if ($currentHostMachine) {
        [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", $null, "Machine")
        Write-Host "   Regi Machine ertek torolve" -ForegroundColor Yellow
    }
    if ($currentHostUser) {
        [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", $null, "User")
        Write-Host "   Regi User ertek torolve" -ForegroundColor Yellow
    }
    
    # Uj ertek beallitasa MINDKET helyen
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")
    
    # Jelenlegi session-ben is beallitjuk
    $env:OLLAMA_HOST = "0.0.0.0:11434"
    
    Write-Host "   OK: OLLAMA_HOST beallitva: 0.0.0.0:11434 (Machine, User, Process)" -ForegroundColor Green
    
    # Ellenorzes
    $newHostMachine = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "Machine")
    $newHostUser = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "User")
    Write-Host "   Ellenorzes Machine: $newHostMachine" -ForegroundColor Green
    Write-Host "   Ellenorzes User: $newHostUser" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Hiba a kornyezeti valtozo beallitasakor: $_" -ForegroundColor Red
    exit 1
}

# Ollama folyamatok leallitasa
Write-Host ""
Write-Host "3. Ollama folyamatok leallitasa..." -ForegroundColor Yellow
$ollamaProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollamaProcesses) {
    Write-Host "   Talalt Ollama folyamatok: $($ollamaProcesses.Count)" -ForegroundColor White
    try {
        Stop-Process -Name "ollama" -Force -ErrorAction Stop
        Write-Host "   OK: Ollama folyamatok leallitva" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "   ERROR: Nem sikerult leallitani az Ollama-t: $_" -ForegroundColor Red
        Write-Host "   Probald meg manuálisan: taskkill /F /IM ollama.exe" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Nincs futó Ollama folyamat" -ForegroundColor Green
}

# Ollama ujrainditasa
Write-Host ""
Write-Host "4. Ollama ujrainditasa..." -ForegroundColor Yellow
Write-Host "   FONTOS: Uj PowerShell ablakban futtasd, hogy a kornyezeti valtozo betoltodjon!" -ForegroundColor Red
Write-Host ""
Write-Host "   Legegyszerubb mod:" -ForegroundColor Cyan
Write-Host "   1. Zarjuk be ezt a PowerShell ablakot" -ForegroundColor White
Write-Host "   2. Nyiss egy UJ PowerShell ablakot (nem kell admin)" -ForegroundColor White
Write-Host "   3. Futtasd: ollama serve" -ForegroundColor White
Write-Host ""
Write-Host "   VAGY futtasd ezt a parancsot itt (uj session):" -ForegroundColor Cyan
Write-Host "   $env:OLLAMA_HOST='0.0.0.0:11434'; ollama serve" -ForegroundColor White

# Ellenorzes: netstat
Write-Host ""
Write-Host "5. Ellenorzes (futtasd az Ollama inditasa utan):" -ForegroundColor Yellow
Write-Host "   netstat -an | findstr :11434" -ForegroundColor White
Write-Host ""
Write-Host "   Latnod kell: 0.0.0.0:11434 (nem csak 127.0.0.1:11434)" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "OK: BEALLITAS BEFEJEZVE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "FONTOS: Inditsd ujra az Ollama-t, hogy a valtozas ervenyesuljon!" -ForegroundColor Yellow
Write-Host ""

