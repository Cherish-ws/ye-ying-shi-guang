@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] 设置代理...
set HTTPS_PROXY=http://127.0.0.1:7890
set HTTP_PROXY=http://127.0.0.1:7890

echo [2/3] 提交改动...
git add .
git commit -m "update: %date% %time%"

echo [3/3] 推送到 GitHub...
git push

echo.
echo 完成。按任意键关闭...
pause >nul
