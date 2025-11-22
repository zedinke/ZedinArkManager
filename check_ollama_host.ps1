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
$currentHost = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "Machine")
if ($currentHost) {
    Write-Host "   Jelenlegi ertek: $currentHost" -ForegroundColor White
} else {
    Write-Host "   Nincs beallitva" -ForegroundColor Red
}

# OLLAMA_HOST beallitasa
Write-Host ""
Write-Host "2. OLLAMA_HOST beallitasa: 0.0.0.0:11434..." -ForegroundColor Yellow
try {
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
    Write-Host "   OK: OLLAMA_HOST beallitva: 0.0.0.0:11434" -ForegroundColor Green
    
    # Ellenorzes
    $newHost = [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "Machine")
    Write-Host "   Ellenorzes: $newHost" -ForegroundColor Green
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
Write-Host "   Futtasd ezt a parancsot egy uj PowerShell ablakban:" -ForegroundColor Cyan
Write-Host "   ollama serve" -ForegroundColor White
Write-Host ""
Write-Host "   VAGY inditsd el az Ollama-t a szokasos modon" -ForegroundColor Cyan

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

