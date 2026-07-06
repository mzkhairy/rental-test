# Script Start All Local Servers
# Menjalankan kelima API cabang dalam jendela PowerShell yang terpisah

$baseDir = (Get-Item -Path ".\").FullName

Write-Host "Menjalankan 5 instance API (Node.js) untuk semua cabang..."

# Daftar cabang dan file .env mereka
$branches = @("bks", "bgr", "dpk", "jkt", "tgr")

foreach ($code in $branches) {
    if (Test-Path ".env.$code") {
        Write-Host "Starting Node server untuk cabang: $code"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir'; node -r dotenv/config server.js dotenv_config_path=.env.$code"
    } else {
        Write-Host "[WARNING] File .env.$code tidak ditemukan! Pastikan sudah menjalankan setup_local.ps1" -ForegroundColor Yellow
    }
}

Write-Host "Semua server telah dijalankan di jendela terpisah!" -ForegroundColor Green
