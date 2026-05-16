Set shell = CreateObject("WScript.Shell")
projectPath = "C:\Users\rkali\Desktop\Apka\czech-language-helper-main"
command = "cmd.exe /c cd /d """ & projectPath & """ && if not exist dist\index.html call npm run build && call npm run desktop:start"
shell.Run command, 0, False
