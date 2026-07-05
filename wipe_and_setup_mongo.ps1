# Script untuk reset dan setup MongoDB Replica Set lokal (1 device)
# Jalankan menggunakan PowerShell as Administrator

Write-Host "Menghentikan semua proses mongod yang sedang berjalan..."
Stop-Process -Name "mongod" -Force -ErrorAction SilentlyContinue

Write-Host "Menghapus data MongoDB lama..."
$baseDir = "$PWD\data"
$branches = @("jkt", "bgr", "dpk", "tgr", "bks")

foreach ($branch in $branches) {
    $dirPath = Join-Path $baseDir $branch
    if (Test-Path $dirPath) {
        Remove-Item -Path $dirPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    Write-Host "Folder data disiapkan: $dirPath"
}

Write-Host "Menjalankan 5 instance MongoDB di background..."
Start-Process -WindowStyle Hidden mongod -ArgumentList "--replSet rsRental --port 27021 --dbpath `"$baseDir\jkt`""
Start-Process -WindowStyle Hidden mongod -ArgumentList "--replSet rsRental --port 27022 --dbpath `"$baseDir\bgr`""
Start-Process -WindowStyle Hidden mongod -ArgumentList "--replSet rsRental --port 27023 --dbpath `"$baseDir\dpk`""
Start-Process -WindowStyle Hidden mongod -ArgumentList "--replSet rsRental --port 27024 --dbpath `"$baseDir\tgr`""
Start-Process -WindowStyle Hidden mongod -ArgumentList "--replSet rsRental --port 27025 --dbpath `"$baseDir\bks`""

Write-Host "Menunggu 10 detik agar MongoDB siap..."
Start-Sleep -Seconds 10

Write-Host "Menginisialisasi Replica Set rsRental..."
$initCmd = @"
rs.initiate({
  _id: 'rsRental',
  members: [
    { _id: 0, host: '127.0.0.1:27021' },
    { _id: 1, host: '127.0.0.1:27022' },
    { _id: 2, host: '127.0.0.1:27023' },
    { _id: 3, host: '127.0.0.1:27024' },
    { _id: 4, host: '127.0.0.1:27025' }
  ]
})
"@

# Jalankan command inisialisasi di port 27021
$initCmd | mongosh --port 27021 --quiet

Write-Host "Setup Selesai! Replica set berjalan lokal."
