#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);
const API_DIR = join(ROOT_DIR, "apps", "api");

const FRONTEND_PORT = 3005;
const API_PORT = 3000;
const API_HEALTH_URL = `http://127.0.0.1:${API_PORT}/health`;
const WEB_HEALTH_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const mode = process.argv[2];
if (!mode || !["dev", "prod"].includes(mode)) {
  console.error("Usage: node ops/build.mjs <dev|prod>");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const children = [];

function log(message) {
  console.log(`[build:${mode}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkEnvironment() {
  log("Checking environment setup...");

  // Check Node.js
  try {
    const nodeVersion = execSync("node --version", { encoding: "utf8" });
    log(`Node.js: ${nodeVersion.trim()}`);
  } catch {
    throw new Error("Node.js is not installed. Please install Node.js from https://nodejs.org");
  }

  // Check npm
  try {
    const npmVersion = execSync("npm --version", { encoding: "utf8" });
    log(`npm: ${npmVersion.trim()}`);
  } catch {
    throw new Error("npm is not installed. Please install npm.");
  }
}

async function setupDependencies() {
  const nodeModulesExists = existsSync(join(ROOT_DIR, "node_modules"));
  const apiNodeModulesExists = existsSync(join(API_DIR, "node_modules"));

  if (!nodeModulesExists || !apiNodeModulesExists) {
    log("Installing dependencies (this may take a few minutes on first install)...");
    try {
      execSync("npm install", {
        cwd: ROOT_DIR,
        stdio: "inherit",
        shell: isWindows,
      });
      log("Dependencies installed successfully.");
    } catch (error) {
      throw new Error("Failed to install dependencies");
    }
  } else {
    log("Dependencies already installed.");
  }
}

async function setupDatabase() {
  log("Setting up database...");

  // Check for .env file
  const envPath = join(API_DIR, ".env");
  if (!existsSync(envPath)) {
    log("Creating .env file with default DATABASE_URL (SQLite)...");
    const dbPath = join(API_DIR, "prisma", "dev.db");
    const envContent = `DATABASE_URL="file:./prisma/dev.db"\nPORT=${API_PORT}\nNODE_ENV=development\n`;
    
    try {
      const fs = await import("node:fs/promises");
      await fs.writeFile(envPath, envContent);
      log(".env file created.");
    } catch (error) {
      throw new Error("Failed to create .env file");
    }
  } else {
    log(".env file already exists.");
  }

  // Generate Prisma client
  try {
    log("Generating Prisma client...");
    execSync("npm run prisma:generate", {
      cwd: API_DIR,
      stdio: "inherit",
      shell: isWindows,
    });
  } catch (error) {
    throw new Error("Failed to generate Prisma client");
  }

  // Push Prisma schema
  try {
    log("Pushing database schema (creating/updating database)...");
    execSync("npm run prisma:push", {
      cwd: API_DIR,
      stdio: ["pipe", "inherit", "inherit"],
      shell: isWindows,
    });
  } catch (error) {
    throw new Error("Failed to push database schema");
  }

  log("Database setup complete.");
}

async function initializeOnFirstRun() {
  log("Running first-time initialization...");
  await checkEnvironment();
  await setupDependencies();
  await setupDatabase();
  log("Initialization complete!");
}

function collectPidsFromPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const parts = trimmed.split(/\s+/);
        if (parts.length < 5) {
          continue;
        }
        const localAddress = parts[1] ?? "";
        const state = (parts[3] ?? "").toUpperCase();
        const pid = parts[4];
        if (!localAddress.endsWith(`:${port}`)) {
          continue;
        }
        if (state !== "LISTENING" && state !== "ESTABLISHED") {
          continue;
        }
        if (/^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }
      return [...pids];
    }

    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split(/\r?\n/)
      .map((pid) => pid.trim())
      .filter((pid) => /^\d+$/.test(pid));
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

async function freePort(port) {
  const pids = collectPidsFromPort(port);
  if (pids.length === 0) {
    log(`Port ${port} is free.`);
    return;
  }

  log(`Port ${port} is in use by PID(s): ${pids.join(", ")}. Stopping them...`);
  for (const pid of pids) {
    killPid(pid);
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(300);
    if (collectPidsFromPort(port).length === 0) {
      log(`Port ${port} has been released.`);
      return;
    }
  }

  throw new Error(`Failed to free port ${port}.`);
}

function startProcess(label, command, args, extraEnv = {}) {
  log(`Starting ${label}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  children.push(child);
  return child;
}

async function waitForHealthy(url, label, timeoutMs = 60000, intervalMs = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        log(`${label} health check passed at ${url}`);
        return;
      }
    } catch {
      // Keep retrying until timeout.
    }
    await sleep(intervalMs);
  }
  throw new Error(`${label} health check failed at ${url}`);
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed && child.exitCode === null) {
      try {
        if (isWindows && child.pid) {
          execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
        } else {
          child.kill("SIGTERM");
        }
      } catch {
        // Ignore process teardown errors.
      }
    }
  }
}

function wireShutdownHandlers() {
  const shutdown = () => {
    log("Shutting down child processes...");
    stopChildren();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function bootDev() {
  await freePort(API_PORT);
  await freePort(FRONTEND_PORT);

  const api = startProcess(
    "API (dev)",
    "npm",
    ["run", "start:dev", "--workspace", "@relationflow/api"],
    { PORT: String(API_PORT) },
  );

  const web = startProcess(
    "Web (dev)",
    "npm",
    [
      "run",
      "dev",
      "--workspace",
      "@relationflow/web",
      "--",
      "--host",
      "0.0.0.0",
      "--port",
      String(FRONTEND_PORT),
      "--strictPort",
    ],
  );

  wireShutdownHandlers();

  await waitForHealthy(API_HEALTH_URL, "API");
  await waitForHealthy(WEB_HEALTH_URL, "Web");
  log(`Dev stack is ready. Web: ${WEB_HEALTH_URL} | API: http://127.0.0.1:${API_PORT}`);

  await waitForExit(api, web);
}

function runCommand(command, args, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    log(`Running ${label}: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: isWindows,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

async function bootProd() {
  await freePort(API_PORT);
  await freePort(FRONTEND_PORT);

  await runCommand(
    "npm",
    ["run", "build", "--workspace", "@relationflow/api"],
    "API build",
  );
  await runCommand(
    "npm",
    ["run", "build", "--workspace", "@relationflow/web"],
    "Web build",
  );

  const api = startProcess(
    "API (prod)",
    "npm",
    ["run", "start:prod", "--workspace", "@relationflow/api"],
    { PORT: String(API_PORT) },
  );

  const web = startProcess(
    "Web (prod)",
    "npm",
    [
      "run",
      "preview",
      "--workspace",
      "@relationflow/web",
      "--",
      "--host",
      "0.0.0.0",
      "--port",
      String(FRONTEND_PORT),
      "--strictPort",
    ],
  );

  wireShutdownHandlers();

  await waitForHealthy(API_HEALTH_URL, "API");
  await waitForHealthy(WEB_HEALTH_URL, "Web");
  log(`Prod stack is ready. Web: ${WEB_HEALTH_URL} | API: http://127.0.0.1:${API_PORT}`);

  await waitForExit(api, web);
}

function waitForExit(api, web) {
  return new Promise(() => {
    const onExit = (name, code) => {
      log(`${name} exited with code ${code}. Stopping remaining processes...`);
      stopChildren();
      process.exit(code ?? 1);
    };

    api.on("exit", (code) => onExit("API", code));
    web.on("exit", (code) => onExit("Web", code));
  });
}

(async () => {
  try {
    await initializeOnFirstRun();
    
    if (mode === "dev") {
      await bootDev();
      return;
    }
    await bootProd();
  } catch (error) {
    stopChildren();
    console.error(`[build:${mode}] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
