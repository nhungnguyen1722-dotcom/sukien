@echo off
chcp 65001 >nul
echo ====================================================
echo Đang cấu hình và sửa lỗi Chứng chỉ SSL cho GitHub Copilot...
echo ====================================================

:: Kiểm tra quyền Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Cần quyền Administrator. Đang yêu cầu cấp quyền...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [+] 1. Bật lại tính năng tự động cập nhật chứng chỉ gốc Windows (DisableRootAutoUpdate = 0)...
reg add "HKLM\SOFTWARE\Policies\Microsoft\SystemCertificates\AuthRoot" /v DisableRootAutoUpdate /t REG_DWORD /d 0 /f

echo [+] 2. Thêm chứng chỉ gốc USERTrust ECC Certification Authority vào Windows Root Store...
certutil -addstore -f root "%~dp0usertrust_ecc.cer"

if exist "%~dp0cert_2.cer" (
    echo [+] 3. Cài đặt chứng chỉ trung gian Sectigo Root E46...
    certutil -addstore -f ca "%~dp0cert_2.cer"
)

if exist "%~dp0cert_1.cer" (
    echo [+] 4. Cài đặt chứng chỉ trung gian Sectigo DV E36...
    certutil -addstore -f ca "%~dp0cert_1.cer"
)

echo.
echo ====================================================
echo [+] Kiểm tra kết nối HTTPS tới GitHub API:
echo ====================================================
curl.exe -I https://api.github.com/copilot_internal/user

echo.
echo ====================================================
echo HOÀN TẤT! Hãy khởi động lại VS Code (Reload Window) để Copilot hoạt động.
echo ====================================================
pause
