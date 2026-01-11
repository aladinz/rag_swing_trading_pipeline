# Easy Global Launcher Setup - RAG Trading

## Quickest Solution: Create a Batch File Shortcut

### Step 1: Create the Launcher Batch File
Save this as `rag-trading.bat` and place it in a folder that's in your PATH (or your Desktop/Documents):

```batch
@echo off
cd /d "C:\Users\aladi\Rag_Swing_Trading_Pipeline"
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
)
if "%1"=="build" (
    echo Building for production...
    npm run build
) else (
    echo Starting development server...
    echo.
    echo Frontend: http://localhost:5173/
    echo Backend:  http://localhost:3000/
    echo.
    npm run dev
)
```

### Step 2: Best Locations for the Batch File

**Option A: Add to Project (Recommended)**
- The batch file is already in your project at: `C:\Users\aladi\Rag_Swing_Trading_Pipeline\rag-trading.bat`
- From Command Prompt (cmd.exe), navigate to the project and run: `rag-trading.bat`
- Or run from anywhere with: `cd C:\Users\aladi\Rag_Swing_Trading_Pipeline && rag-trading.bat`

**Option B: Add to a PATH Directory**
- Find writable PATH folders by running in Command Prompt:
  ```batch
  echo %PATH%
  ```
- Copy `rag-trading.bat` to one of those directories
- Then use `rag-trading.bat` from anywhere in Command Prompt

**Option C: Create a Windows Shortcut (Easiest)**
1. Right-click on Desktop → New → Shortcut
2. Enter this for the location:
   ```
   cmd.exe /k cd /d "C:\Users\aladi\Rag_Swing_Trading_Pipeline" && rag-trading.bat
   ```
3. Name it: `RAG Trading` or `Start RAG Trading`
4. Click OK
5. Double-click the shortcut to launch!

### Step 3: Usage

From Command Prompt (cmd.exe):
```bash
# Start development server
cd C:\Users\aladi\Rag_Swing_Trading_Pipeline
rag-trading.bat

# Or for production build
rag-trading.bat build
```

## PowerShell Solution (If You Prefer PowerShell)

If you want to use PowerShell instead:

1. Open PowerShell as Admin
2. Run this command to enable execution:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Create an alias by adding this to your PowerShell profile:
   ```powershell
   function rag-trading { 
       Set-Location "C:\Users\aladi\Rag_Swing_Trading_Pipeline"
       npm run dev @args
   }
   ```

4. Then restart PowerShell and use: `rag-trading`

## Troubleshooting

### "rag-trading.bat is not recognized"
- **In PowerShell**: Use `cmd.exe` instead, or use `.\rag-trading.bat` in the project directory
- **In Command Prompt**: Make sure you're in the right directory or copy the .bat file to a PATH directory

### "npm is not recognized"
- Node.js/npm isn't installed or not in PATH
- Download Node.js from https://nodejs.org/
- Restart your terminal after installation

### Batch file won't execute
- You might need to run Command Prompt as Administrator
- Right-click cmd.exe → Run as administrator

## Recommended: Use Command Prompt (cmd.exe)

The batch file works best in **Command Prompt (cmd.exe)**, not PowerShell. For fastest setup:

1. Open Command Prompt (Win + R, type `cmd`, press Enter)
2. Navigate to the project:
   ```
   cd C:\Users\aladi\Rag_Swing_Trading_Pipeline
   ```
3. Run:
   ```
   rag-trading.bat
   ```

Or use the Desktop shortcut method above for one-click launching!
