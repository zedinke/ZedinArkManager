# Ollama halozati elerhetoseg beallitasa
# Ez a script beallitja, hogy az Ollama a halozatrol is elerheto legyen

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Ollama halozati elerhetoseg beallitasa" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ellenorzes: admin jogosultsag
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Admin jogosultsag szukseges!" -ForegroundColor Red
    Write-Host "   Futtasd PowerShell-ben 'Run as Administrator' modban" -ForegroundColor Yellow
    exit 1
}

# Kornyezeti valtozo beallitasa
Write-Host "OLLAMA_HOST kornyezeti valtozo beallitasa..." -ForegroundColor Yellow
try {
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
    Write-Host "OK: OLLAMA_HOST beallitva: 0.0.0.0:11434" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Hiba a kornyezeti valtozo beallitasakor: $_" -ForegroundColor Red
    exit 1
}

# Tuzfalszabaly hozzaadasa
Write-Host ""
Write-Host "Tuzfalszabaly hozzaadasa (11434 port)..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "Ollama" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Host "INFO: Tuzfalszabaly mar letezik, ellenorzes..." -ForegroundColor Yellow
        $portFilter = Get-NetFirewallRule -DisplayName "Ollama" | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
        if ($portFilter -and $portFilter.LocalPort -eq 11434) {
            Write-Host "OK: Tuzfalszabaly mar letezik es helyes (11434 port)" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Tuzfalszabaly letezik, de mas porttal. Ujra letrehozas..." -ForegroundColor Yellow
            Remove-NetFirewallRule -DisplayName "Ollama" -ErrorAction SilentlyContinue
            New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -Profile Domain,Private,Public | Out-Null
            Write-Host "OK: Tuzfalszabaly frissitve" -ForegroundColor Green
        }
    } else {
        New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -Profile Domain,Private,Public | Out-Null
        Write-Host "OK: Tuzfalszabaly hozzaadva (11434 port, minden profil)" -ForegroundColor Green
    }
} catch {
    Write-Host "ERROR: Tuzfalszabaly hozzaadasa sikertelen: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "MANUALIS BEALLITAS:" -ForegroundColor Yellow
    Write-Host "   1. Nyisd meg: wf.msc" -ForegroundColor White
    Write-Host "   2. Bejovo szabalyok -> Uj szabaly..." -ForegroundColor White
    Write-Host "   3. Port -> TCP -> 11434 -> Engedelyezes" -ForegroundColor White
    Write-Host "   4. Minden profil (Tartomany, Magan, Nyilvanos)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Vagy lasd: WINDOWS_FIREWALL_SETUP.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "OK: BEALLITAS BEFEJEZVE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "FONTOS LEPESEK:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Inditsd ujra az Ollama-t:" -ForegroundColor Cyan
Write-Host "   taskkill /F /IM ollama.exe" -ForegroundColor White
Write-Host "   ollama serve" -ForegroundColor White
Write-Host ""
Write-Host "2. Ellenorzes:" -ForegroundColor Cyan
Write-Host "   netstat -an | findstr :11434" -ForegroundColor White
Write-Host "   Latnod kell: 0.0.0.0:11434 (nem csak 127.0.0.1:11434)" -ForegroundColor White
Write-Host ""
Write-Host "3. Teszteles (masik geprol):" -ForegroundColor Cyan
Write-Host "   curl http://[PUBLIKUS_IP]:11434/api/tags" -ForegroundColor White
Write-Host ""
Write-Host "4. Ha NAT mogott vagy, allitsd be a port forwarding-et a routerben:" -ForegroundColor Cyan
Write-Host "   Port: 11434 -> Kliens gep belso IP-je" -ForegroundColor White
Write-Host ""
