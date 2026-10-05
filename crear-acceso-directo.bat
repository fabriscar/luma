@echo off
REM Crea el icono "LUMA" en el escritorio. Se ejecuta una sola vez.
cd /d "%~dp0"
powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\LUMA.lnk'); $s.TargetPath = '%~dp0iniciar-luma.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0luma.ico'; $s.WindowStyle = 7; $s.Save()"
if errorlevel 1 (
    echo No se pudo crear el acceso directo.
) else (
    echo Listo: tenes el icono LUMA en el escritorio.
)
pause
