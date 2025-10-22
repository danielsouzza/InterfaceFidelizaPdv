@echo off
title Sistema de Fidelidade - Electron
color 0A

echo ========================================
echo    Sistema de Fidelidade - Electron
echo ========================================
echo.
echo Iniciando com Electron...
echo.

REM Ir para o diretório do script
cd /d "%~dp0"

REM Executar com Electron
npm run electron

REM Se der erro, pausar para ver a mensagem
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ERRO AO INICIAR!
    echo ========================================
    echo.
    echo Verifique se as dependencias estao instaladas.
    echo Execute: instalar.bat
    echo.
    pause
)
