# Build & Deployment Scripts

This directory contains scripts for building, running, and deploying the application with support for first-time setup and cross-platform compatibility.

## Quick Start

### Windows
```powershell
# First time setup (installs dependencies, creates database)
.\ops\build.ps1 dev

# Or for production
.\ops\build.ps1 prod
```

### Linux / macOS / Ubuntu
```bash
# First time setup (installs dependencies, creates database)
./ops/build.sh dev

# Or for production
./ops/build.sh prod
```

## What Happens on First Install

When you run `./build.sh dev` or `./ops/build.ps1 dev` for the first time, the script will automatically:

1. **Check Environment**: Verify Node.js and npm are installed
2. **Install Dependencies**: Run `npm install` in root and all workspaces
3. **Setup Database**: 
   - Create `.env` file in `apps/api` with default SQLite configuration
   - Generate Prisma client
   - Push database schema (creates/updates the database)
4. **Start Services**: Begin development servers

All subsequent runs will skip dependency installation and database setup (assuming they've already been done).

## Scripts Included

### `build.mjs` (Main Build Script)
- **Platform**: Node.js (works on Windows, macOS, Ubuntu, Linux)
- **Entry Point**: Called by `build.ps1` and `build.sh`
- **Features**:
  - Cross-platform process management
  - Port conflict detection and resolution
  - First-time setup (dependencies, database)
  - Dev and prod modes
  - Health checks for API and Web services

### `build.ps1` (Windows Entry Point)
- **Platform**: PowerShell
- **Usage**: `.\ops\build.ps1 <dev|prod>`
- **Default**: `dev` mode if no argument provided

### `build.sh` (Linux/macOS Entry Point)
- **Platform**: Bash
- **Usage**: `./ops/build.sh <dev|prod>`
- **Default**: `dev` mode if no argument provided
- **Requires**: Executable permissions (`chmod +x ops/build.sh`)

### `deploy.sh` (Manual Deployment)
- **Platform**: Bash
- **Usage**: `./ops/deploy.sh [repo_path]`
- **Default Path**: `/root/whonodeswho`
- **What it does**:
  - Pulls latest changes from `origin/main`
  - Builds and starts Docker containers
  - Perfect for production deployments

### `post-receive` (Git Hook for Auto-Deploy)
- **Platform**: Bash
- **Setup**: Install as `.git/hooks/post-receive` in your repository
- **Triggers**: Automatically when code is pushed/merged to main/master
- **What it does**: Runs `deploy.sh` automatically

## Environment Variables

The system creates a `.env` file in `apps/api` on first run with:

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
NODE_ENV=development
```

You can modify these values in `apps/api/.env` for custom configuration.

## Setting Up Auto-Deployment

### Option 1: GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy on Merge

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        run: ./ops/deploy.sh /path/to/repo
```

### Option 2: Gitea Actions
Similar to GitHub Actions, create `.gitea/workflows/deploy.yml` with the same content.

### Option 3: Git Post-Receive Hook
On your server with the repository:

```bash
# Copy the post-receive hook
cp ops/post-receive .git/hooks/post-receive

# Make it executable
chmod +x .git/hooks/post-receive

# Now every push to main will auto-deploy
git push
```

### Option 4: Manual Deployment
```bash
./ops/deploy.sh /path/to/whonodeswho
```

## Troubleshooting

### "Node.js is not installed"
- Install Node.js from https://nodejs.org
- Verify: `node --version`

### "npm is not installed"
- npm is installed with Node.js
- Verify: `npm --version`

### Database connection errors
- Check `apps/api/.env` exists
- Verify `DATABASE_URL` is set correctly
- Try manually: `cd apps/api && npm run prisma:push`

### Port already in use
- The script will automatically kill processes using ports 3000 (API) and 3005 (Web)
- Or manually: `lsof -i :3000` (Linux/macOS) or `netstat -ano -p tcp | findstr :3000` (Windows)

### Build fails on Linux
- Ensure Node.js version is 18+: `node --version`
- Ensure npm version is 8+: `npm --version`
- Try: `npm cache clean --force && npm install`

## Development Workflow

1. **First time setup**:
   ```bash
   ./ops/build.sh dev
   ```

2. **During development**:
   - The script watches for file changes automatically
   - API: http://127.0.0.1:3000
   - Web: http://127.0.0.1:3005

3. **Stop the dev server**:
   - Press `Ctrl+C` in the terminal

4. **Start production build**:
   ```bash
   ./ops/build.sh prod
   ```

## Docker Deployment

For production with Docker, ensure `docker-compose.yml` exists in the project root:

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

The `deploy.sh` script handles this automatically.
