$branchCode = "bks"
$mongoUri = "mongodb://10.11.98.176:27017/rentsync_$branchCode?replicaSet=rsRental"
Write-Host "Result1: $mongoUri"

$envContent = "MONGO_URI=OLD"
$envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=$mongoUri"
Write-Host "Result2: $envContent"
