@echo off
title Sistema de Fidelidade - PDV
color 0A

echo ========================================
echo    Sistema de Fidelidade - PDV
echo ========================================
echo.
echo Iniciando servidor...
echo.

REM Ir para o diretório do script
cd /d "%~dp0"

REM Iniciar servidor em segundo plano
start /B node launcher.js

REM Manter janela aberta
echo.
echo ========================================
echo   SISTEMA RODANDO!
echo ========================================
echo.
echo   Pressione qualquer tecla para FECHAR
echo.
pause > nul

REM Matar processo do Node ao fechar
taskkill /F /IM node.exe > nul 2>&1

echo.
echo Sistema encerrado.
timeout /t 2 > nul
