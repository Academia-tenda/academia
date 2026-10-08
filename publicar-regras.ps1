$ErrorActionPreference='Stop'
Set-Location 'C:\Users\ferna\Documents\Open code\Academia'
firebase login
firebase deploy --only firestore:rules
Write-Host ''
Write-Host 'Concluido! A permissao nova foi publicada. Feche e reabra o app no celular de quem vai ser professor.'