@echo off
chcp 65001 >nul
cd /d %~dp0
py update_food_data.py
if errorlevel 1 (
  echo.
  echo 如果提示找不到 py，请改用：python update_food_data.py
)
pause
