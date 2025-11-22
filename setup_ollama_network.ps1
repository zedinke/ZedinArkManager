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
        Write-Host "ℹ️  Tűzfalszabály már létezik, ellenőrzés..." -ForegroundColor Yellow
        $portFilter = Get-NetFirewallRule -DisplayName "Ollama" | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
        if ($portFilter -and $portFilter.LocalPort -eq 11434) {
            Write-Host "✅ Tűzfalszabály már létezik és helyes (11434 port)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Tűzfalszabály létezik, de más porttal. Újra létrehozás..." -ForegroundColor Yellow
            Remove-NetFirewallRule -DisplayName "Ollama" -ErrorAction SilentlyContinue
            New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -Profile Domain,Private,Public | Out-Null
            Write-Host "✅ Tűzfalszabály frissítve" -ForegroundColor Green
        }
    } else {
        New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -Profile Domain,Private,Public | Out-Null
        Write-Host "✅ Tűzfalszabály hozzáadva (11434 port, minden profil)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Tűzfalszabály hozzáadása sikertelen: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "📖 MANUÁLIS BEÁLLÍTÁS:" -ForegroundColor Yellow
    Write-Host "   1. Nyisd meg: wf.msc" -ForegroundColor White
    Write-Host "   2. Bejövő szabályok → Új szabály..." -ForegroundColor White
    Write-Host "   3. Port → TCP → 11434 → Engedélyezés" -ForegroundColor White
    Write-Host "   4. Minden profil (Tartomány, Magán, Nyilvános)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Vagy lásd: WINDOWS_FIREWALL_SETUP.md" -ForegroundColor Cyan
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

