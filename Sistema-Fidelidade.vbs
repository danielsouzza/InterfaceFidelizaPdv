Set WshShell = CreateObject("WScript.Shell")

' Pegar o diretório do script
scriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Ir para o diretório
WshShell.CurrentDirectory = scriptPath

' Executar o BAT sem mostrar janela
WshShell.Run """" & scriptPath & "\Sistema-Fidelidade.bat""", 0, False

Set WshShell = Nothing
