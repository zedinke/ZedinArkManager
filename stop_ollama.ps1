# Ollama folyamatok leallitasa

Write-Host "Ollama folyamatok keresese..." -ForegroundColor Yellow

# Ollama folyamatok keresese
$ollamaProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue

if ($ollamaProcesses) {
    Write-Host "Talalt Ollama folyamatok: $($ollamaProcesses.Count)" -ForegroundColor White
    
    foreach ($process in $ollamaProcesses) {
        Write-Host "  - PID: $($process.Id), Name: $($process.Name)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Leallitas..." -ForegroundColor Yellow
    
    try {
        # Eloszor probaljuk meg normalisan leallitani
        $ollamaProcesses | Stop-Process -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Ha meg mindig fut, kényszerített leallitas
        $remainingProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Host "Kényszerített leallitas..." -ForegroundColor Yellow
            $remainingProcesses | Stop-Process -Force -ErrorAction Stop
            Start-Sleep -Seconds 2
        }
        
        Write-Host "OK: Ollama folyamatok leallitva" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Nem sikerult leallitani az Ollama-t: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Probald meg manuálisan:" -ForegroundColor Yellow
        Write-Host "  taskkill /F /IM ollama.exe" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "Nincs futó Ollama folyamat" -ForegroundColor Green
}

# Ellenorzes: van-e meg Ollama folyamat?
$remainingProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host ""
    Write-Host "FIGYELMEZTETES: Meg mindig fut Ollama folyamat!" -ForegroundColor Red
    Write-Host "Futtasd: taskkill /F /IM ollama.exe" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "OK: Nincs futó Ollama folyamat" -ForegroundColor Green
    Write-Host "Most mar elindithatod: ollama serve" -ForegroundColor Cyan
}

Write-Host ""

