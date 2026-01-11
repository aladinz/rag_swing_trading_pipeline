# RAG Swing Trading Pipeline - Global Launcher Setup

This guide helps you run the RAG Trading application from anywhere on your PC.

## Quick Start

### Option 1: Using Batch File (Easiest - Windows Only)

1. **Add project to PATH** (one-time setup):
   - Press `Win + X` and select "System"
   - Click "Advanced system settings" on the left
   - Click "Environment Variables..." at the bottom right
   - Under "User variables" or "System variables", click "New"
   - Variable name: `RAG_TRADING_HOME`
   - Variable value: `C:\Users\aladi\Rag_Swing_Trading_Pipeline`
   - Click OK on all dialogs

2. **Add launcher directory to PATH**:
   - Open Environment Variables again
   - Edit the `Path` variable
   - Add new entry: `%RAG_TRADING_HOME%`
   - Click OK

3. **Restart your terminal/PowerShell**

4. **Run from anywhere**:
   ```cmd
   rag-trading.bat
   ```

### Option 2: Using PowerShell Script (Recommended)

1. **Enable PowerShell execution policy** (one-time):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Add to PowerShell profile** (optional - for global alias):
   - Open PowerShell
   - Run: `code $PROFILE` or `notepad $PROFILE`
   - Add this line:
     ```powershell
     function rag-trading { & "C:\Users\aladi\Rag_Swing_Trading_Pipeline\rag-trading.ps1" @args }
     ```
   - Save and reload PowerShell

3. **Run from anywhere**:
   ```powershell
   rag-trading              # Start dev server
   rag-trading -Mode build  # Build for production
   ```

### Option 3: Direct Windows PATH (No Environment Variables)

1. **Open PowerShell as Administrator**
2. **Add project to PATH**:
   ```powershell
   $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
   $newPath = "$currentPath;C:\Users\aladi\Rag_Swing_Trading_Pipeline"
   [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
   ```
3. **Restart your terminal and run**:
   ```cmd
   rag-trading.bat
   ```

## Usage

### Start Development Server
```bash
rag-trading              # Using batch file
# OR
rag-trading -Mode dev    # Using PowerShell
```
The application will be available at:
- Frontend: http://localhost:5173/
- Backend: http://localhost:3000/

### Build for Production
```bash
rag-trading build        # Using batch file
# OR
rag-trading -Mode build  # Using PowerShell
```

## Troubleshooting

### "rag-trading.bat is not recognized"
- Make sure you've restarted your terminal after adding to PATH
- Verify the path was added correctly in Environment Variables

### PowerShell won't run the script
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Then try again

### Permission denied when modifying Environment Variables
- Right-click PowerShell and select "Run as administrator"

## Notes

- The launcher will automatically install dependencies if `node_modules` is missing
- Node.js and npm must be installed on your system
- The script works from any directory on your PC
- Press `Ctrl+C` in the terminal to stop the development server
