# Ollama hálózati elérhetőség beállítása
# Ez a script beállítja, hogy az Ollama a hálózatról is elérhető legyen

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Ollama hálózati elérhetőség beállítása" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ellenőrzés: admin jogosultság
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Admin jogosultság szükséges!" -ForegroundColor Red
    Write-Host "   Futtasd PowerShell-ben 'Run as Administrator' módban" -ForegroundColor Yellow
    exit 1
}

# Környezeti változó beállítása
Write-Host "📝 OLLAMA_HOST környezeti változó beállítása..." -ForegroundColor Yellow
try {
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
    Write-Host "✅ OLLAMA_HOST beállítva: 0.0.0.0:11434" -ForegroundColor Green
} catch {
    Write-Host "❌ Hiba a környezeti változó beállításakor: $_" -ForegroundColor Red
    exit 1
}

# Tűzfalszabály hozzáadása
Write-Host ""
Write-Host "🔥 Tűzfalszabály hozzáadása (11434 port)..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "Ollama" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Host "ℹ️  Tűzfalszabály már létezik, frissítés..." -ForegroundColor Yellow
        Remove-NetFirewallRule -DisplayName "Ollama" -ErrorAction SilentlyContinue
    }
    New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow | Out-Null
    Write-Host "✅ Tűzfalszabály hozzáadva" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Tűzfalszabály hozzáadása sikertelen: $_" -ForegroundColor Yellow
    Write-Host "   Próbáld meg manuálisan a Windows Tűzfal beállításokban" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ BEÁLLÍTÁS BEFEJEZVE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  FONTOS LÉPÉSEK:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Indítsd újra az Ollama-t:" -ForegroundColor Cyan
Write-Host "   taskkill /F /IM ollama.exe" -ForegroundColor White
Write-Host "   ollama serve" -ForegroundColor White
Write-Host ""
Write-Host "2. Ellenőrzés:" -ForegroundColor Cyan
Write-Host "   netstat -an | findstr :11434" -ForegroundColor White
Write-Host "   Látnod kell: 0.0.0.0:11434 (nem csak 127.0.0.1:11434)" -ForegroundColor White
Write-Host ""
Write-Host "3. Tesztelés (másik gépről):" -ForegroundColor Cyan
Write-Host "   curl http://[PUBLIKUS_IP]:11434/api/tags" -ForegroundColor White
Write-Host ""
Write-Host "4. Ha NAT mögött vagy, állítsd be a port forwarding-et a routerben:" -ForegroundColor Cyan
Write-Host "   Port: 11434 → Kliens gép belső IP-je" -ForegroundColor White
Write-Host ""

