#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { UISwitcherScaffold } = require("./lib/init");
const { VersionSync } = require("./lib/watch");
const { VersionPromoter } = require("./lib/promote");
const {
  findComponentManager,
  resolveTargetPaths,
  classifyTargetKind,
  getTargetIdFromPath,
} = require("./lib/cli-helpers");

function showHelp() {
  console.log(`
branchkit - A CLI tool for managing UI component/page versions

Usage:
  branchkit <component-path>                                  Initialize a new forked target (shorthand)
  branchkit init <component-path>                             Initialize a new forked target (explicit)
  branchkit init --targets "src/**/*.tsx" [--targets "..."]  Initialize many targets via glob(s)
  branchkit init --paths <path> [--paths <path2>]            Initialize many explicit paths
  branchkit watch [directory] [--port <port>]                Watch for version changes
  branchkit new <component-path> [version-id]                Create a new version (single target)
  branchkit new --targets "src/**/*.tsx" [--version v3]      Create versions for many targets
  branchkit fork <component-path> <version-id> [target-version]
  branchkit fork --targets "src/**/*.tsx" --from v1 [--to v2]
  branchkit rename <component-path> <version-id> <new-version-id>
  branchkit rename --targets "src/**/*.tsx" --from v1 --to v2
  branchkit delete <component-path> <version-id>
  branchkit delete --targets "src/**/*.tsx" --version v2
  branchkit promote <component-path> <version-id>
  branchkit promote --targets "src/**/*.tsx" --version v2

Commands:
  init       Convert target file(s) into versioned forked targets
  watch      Start the watch server and discover all versioned targets
  new        Create a new version
  fork       Fork/duplicate a version
  rename     Rename a version
  delete     Delete a version
  promote    Promote a version to be the main target

Aliases:
  duplicate  Alias for fork
  create     Alias for new

Options:
  -h, --help             Show this help message
  -v, --version          Show version number
  -w, --watch            Start watching after init (single-target init)
  --port <port>          Port for watch server (default: 3030); also supports PORT env var
  --lazy                 Use lazy loading for component versions (watch command only)
  --targets <glob/path>  Add a batch target selector; repeatable
  --paths <path>         Add explicit path targets; repeatable
  --from <version>       Source version for fork/rename batch commands
  --to <version>         Target version for fork/rename batch commands
  --version <version>    Version for new/delete/promote batch commands
`);
}

function showVersion() {
  const packageJson = require("./package.json");
  console.log(`branchkit v${packageJson.version}`);
}

function parseArgs(argv) {
  const parsed = {
    positionals: [],
    targets: [],
    paths: [],
    from: null,
    to: null,
    version: null,
    watch: false,
    port: undefined,
    lazy: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "-w":
      case "--watch":
        parsed.watch = true;
        break;
      case "--lazy":
        parsed.lazy = true;
        break;
      case "--targets": {
        const value = argv[i + 1];
        if (!value) throw new Error("--targets requires a value");
        parsed.targets.push(value);
        i++;
        break;
      }
      case "--paths": {
        const value = argv[i + 1];
        if (!value) throw new Error("--paths requires a value");
        parsed.paths.push(value);
        i++;
        break;
      }
      case "--from": {
        const value = argv[i + 1];
        if (!value) throw new Error("--from requires a value");
        parsed.from = value;
        i++;
        break;
      }
      case "--to": {
        const value = argv[i + 1];
        if (!value) throw new Error("--to requires a value");
        parsed.to = value;
        i++;
        break;
      }
      case "--version": {
        const value = argv[i + 1];
        if (!value) throw new Error("--version requires a value");
        parsed.version = value;
        i++;
        break;
      }
      case "--port": {
        const value = argv[i + 1];
        if (!value) throw new Error("--port requires a value");
        const port = parseInt(value, 10);
        if (Number.isNaN(port)) throw new Error(`Invalid port: ${value}`);
        parsed.port = port;
        i++;
        break;
      }
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        parsed.positionals.push(arg);
        break;
    }
  }

  return parsed;
}

function resolveBatchTargets(parsedArgs) {
  const inputs = [...parsedArgs.targets, ...parsedArgs.paths, ...parsedArgs.positionals];
  if (inputs.length === 0) {
    throw new Error("No batch targets provided. Use --targets, --paths, or positional file paths.");
  }
  const resolved = resolveTargetPaths(inputs, { cwd: process.cwd() });
  if (resolved.length === 0) {
    throw new Error("No files matched the provided targets.");
  }
  return resolved;
}

function getTargetLabel(targetPath) {
  const kind = classifyTargetKind(targetPath);
  const targetId = getTargetIdFromPath(targetPath, process.cwd());
  return `${targetId} (${kind})`;
}

function printBatchSummary(command, results) {
  const ok = results.filter((r) => r.status === "ok");
  const skipped = results.filter((r) => r.status === "skip");
  const failed = results.filter((r) => r.status === "fail");

  console.log(`\n${command} summary:`);
  console.log(`  OK: ${ok.length}`);
  console.log(`  SKIP: ${skipped.length}`);
  console.log(`  FAIL: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed targets:");
    for (const failure of failed) {
      console.log(`  - ${failure.target}: ${failure.message}`);
    }
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

function runBatch(command, targetPaths, handler) {
  const results = [];

  for (const targetPath of targetPaths) {
    const targetLabel = getTargetLabel(targetPath);
    try {
      handler(targetPath);
      console.log(`[OK] ${targetLabel}`);
      results.push({ status: "ok", target: targetLabel });
    } catch (error) {
      console.log(`[FAIL] ${targetLabel}: ${error.message}`);
      results.push({ status: "fail", target: targetLabel, message: error.message });
    }
  }

  printBatchSummary(command, results);
}

function assertVersionFormat(manager, version, fieldName) {
  if (!manager.validateVersionKey(version)) {
    throw new Error(`Invalid ${fieldName} format: ${version}`);
  }
}

function runNew(manager, optionalVersion) {
  let targetVersion;
  if (optionalVersion) {
    assertVersionFormat(manager, optionalVersion, "version");
    targetVersion = optionalVersion;
  } else {
    const nextVersionNum = manager.getNextVersionNumber();
    targetVersion = manager.versionNumberToKey(nextVersionNum);
  }

  const targetFilePath = manager.getVersionFilePath(targetVersion);
  if (fs.existsSync(targetFilePath)) {
    throw new Error(`Version already exists: ${targetVersion}`);
  }

  const extension = manager.getMostCommonExtension();
  const fileVersion = manager.versionKeyToFileVersion(targetVersion);
  const finalFilePath = path.join(manager.watchDir, `${manager.componentName}.v${fileVersion}${extension}`);

  const displayVersion = targetVersion.replace(/^v/, "").replace(/_/g, ".").toUpperCase();
  const importSuffix = manager.versionToImportSuffix(fileVersion);
  const componentName = `${manager.componentName}${importSuffix}`;

  const templateContent = extension === ".tsx" || extension === ".jsx"
    ? `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div>\n      ${displayVersion}\n    </div>\n  );\n}\n`
    : `import React from 'react';\n\nexport default function ${componentName}() {\n  return React.createElement('div', null, '${displayVersion}');\n}\n`;

  fs.writeFileSync(finalFilePath, templateContent, "utf8");
  manager.generateVersionsFile();
}

function runFork(manager, sourceVersion, optionalTargetVersion) {
  assertVersionFormat(manager, sourceVersion, "source version");

  const sourceFilePath = manager.getVersionFilePath(sourceVersion);
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`Source version file not found: ${sourceVersion}`);
  }

  let targetVersion;
  if (optionalTargetVersion) {
    assertVersionFormat(manager, optionalTargetVersion, "target version");
    targetVersion = optionalTargetVersion;
  } else {
    const nextVersionNum = manager.getNextVersionNumber();
    targetVersion = manager.versionNumberToKey(nextVersionNum);
  }

  const targetFilePath = manager.getVersionFilePath(targetVersion);
  if (fs.existsSync(targetFilePath)) {
    throw new Error(`Target version already exists: ${targetVersion}`);
  }

  const sourceContent = fs.readFileSync(sourceFilePath, "utf8");
  const extension = path.extname(sourceFilePath);
  const fileVersion = manager.versionKeyToFileVersion(targetVersion);
  const finalTargetPath = path.join(manager.watchDir, `${manager.componentName}.v${fileVersion}${extension}`);

  fs.writeFileSync(finalTargetPath, sourceContent, "utf8");
  manager.generateVersionsFile();
}

function runRename(manager, oldVersion, newVersionId) {
  assertVersionFormat(manager, oldVersion, "source version");
  assertVersionFormat(manager, newVersionId, "target version");

  if (oldVersion === newVersionId) {
    throw new Error("Source and target versions are the same");
  }

  const fileVersion = manager.versionKeyToFileVersion(oldVersion);
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  let sourceFilePath = null;

  for (const ext of extensions) {
    const candidatePath = path.join(manager.watchDir, `${manager.componentName}.v${fileVersion}${ext}`);
    if (fs.existsSync(candidatePath)) {
      sourceFilePath = candidatePath;
      break;
    }
  }

  if (!sourceFilePath) {
    throw new Error(`Source version file not found: ${oldVersion}`);
  }

  const targetFileVersion = manager.versionKeyToFileVersion(newVersionId);
  for (const ext of extensions) {
    const candidatePath = path.join(manager.watchDir, `${manager.componentName}.v${targetFileVersion}${ext}`);
    if (fs.existsSync(candidatePath)) {
      throw new Error(`Target version already exists: ${newVersionId}`);
    }
  }

  const extension = path.extname(sourceFilePath);
  const finalTargetPath = path.join(manager.watchDir, `${manager.componentName}.v${targetFileVersion}${extension}`);
  const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

  const importSuffix = manager.versionToImportSuffix(fileVersion);
  const newImportSuffix = manager.versionToImportSuffix(targetFileVersion);
  const oldComponentName = `${manager.componentName}${importSuffix}`;
  const newComponentName = `${manager.componentName}${newImportSuffix}`;

  const updatedContent = sourceContent.replace(new RegExp(oldComponentName, "g"), newComponentName);

  fs.writeFileSync(finalTargetPath, updatedContent, "utf8");
  fs.unlinkSync(sourceFilePath);
  manager.generateVersionsFile();
}

function runDelete(manager, deleteVersionId) {
  assertVersionFormat(manager, deleteVersionId, "version");

  const filePath = manager.getVersionFilePath(deleteVersionId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Version file not found: ${deleteVersionId}`);
  }

  const versionFiles = manager.getVersionFiles();
  if (versionFiles.length === 1) {
    throw new Error("Cannot delete the last remaining version.");
  }

  fs.unlinkSync(filePath);
  manager.generateVersionsFile();
}

function runPromote(componentPath, versionId) {
  const promoter = new VersionPromoter(componentPath, versionId);
  promoter.promote();
}

const rawArgs = process.argv.slice(2);
const command = rawArgs[0];

const knownCommands = [
  "init",
  "watch",
  "new",
  "fork",
  "rename",
  "delete",
  "promote",
  "duplicate",
  "create",
];

if (rawArgs.includes("-h") || rawArgs.includes("--help")) {
  showHelp();
  process.exit(0);
}

if (rawArgs.includes("-v") || rawArgs.includes("--version")) {
  showVersion();
  process.exit(0);
}

if (command && !knownCommands.includes(command)) {
  try {
    const parsed = parseArgs(rawArgs);
    const shouldWatch = parsed.watch;
    const scaffolder = new UISwitcherScaffold(command, shouldWatch);
    scaffolder.scaffold();
  } catch (error) {
    console.error(`Error during scaffolding: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

let parsed;
try {
  parsed = parseArgs(rawArgs.slice(1));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const hasBatchInputs = parsed.targets.length > 0 || parsed.paths.length > 0;

switch (command) {
  case "init": {
    if (hasBatchInputs || parsed.positionals.length > 1) {
      const targets = resolveBatchTargets(parsed);
      runBatch("init", targets, (targetPath) => {
        const baseName = path.basename(targetPath, path.extname(targetPath));
        const versionsFile = path.join(path.dirname(targetPath), `${baseName}.versions.ts`);
        if (fs.existsSync(versionsFile)) {
          throw new Error("Already initialized (versions file exists)");
        }
        const scaffolder = new UISwitcherScaffold(targetPath, false);
        scaffolder.scaffold();
      });
      break;
    }

    const argument = parsed.positionals[0];
    if (!argument) {
      console.error("Error: Component path is required for init command");
      process.exit(1);
    }

    try {
      const scaffolder = new UISwitcherScaffold(argument, parsed.watch);
      scaffolder.scaffold();
    } catch (error) {
      console.error(`Error during scaffolding: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "watch": {
    const watchDir = parsed.positionals[0] || process.cwd();
    try {
      new VersionSync(watchDir, {
        lazy: parsed.lazy,
        ...(parsed.port ? { port: parsed.port } : {}),
      });
    } catch (error) {
      console.error(`Error during watching: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "new":
  case "create": {
    if (hasBatchInputs) {
      const targets = resolveBatchTargets(parsed);
      runBatch("new", targets, (targetPath) => {
        const manager = findComponentManager(targetPath);
        runNew(manager, parsed.version);
      });
      break;
    }

    const argument = parsed.positionals[0];
    if (!argument) {
      console.error("Error: Component path is required");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);
      runNew(manager, parsed.positionals[1] || parsed.version);
      console.log(`✅ Created new version for ${manager.componentName}`);
    } catch (error) {
      console.error(`Error creating version: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "fork":
  case "duplicate": {
    if (hasBatchInputs) {
      if (!parsed.from) {
        console.error("Error: --from is required in batch mode");
        process.exit(1);
      }
      const targets = resolveBatchTargets(parsed);
      runBatch("fork", targets, (targetPath) => {
        const manager = findComponentManager(targetPath);
        runFork(manager, parsed.from, parsed.to);
      });
      break;
    }

    const argument = parsed.positionals[0];
    const sourceVersion = parsed.positionals[1] || parsed.from;
    const targetVersion = parsed.positionals[2] || parsed.to;

    if (!argument || !sourceVersion) {
      console.error("Error: Component path and source version are required");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);
      runFork(manager, sourceVersion, targetVersion);
      console.log(`✅ Forked version for ${manager.componentName}`);
    } catch (error) {
      console.error(`Error forking version: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "rename": {
    if (hasBatchInputs) {
      if (!parsed.from || !parsed.to) {
        console.error("Error: --from and --to are required in batch mode");
        process.exit(1);
      }
      const targets = resolveBatchTargets(parsed);
      runBatch("rename", targets, (targetPath) => {
        const manager = findComponentManager(targetPath);
        runRename(manager, parsed.from, parsed.to);
      });
      break;
    }

    const argument = parsed.positionals[0];
    const oldVersion = parsed.positionals[1] || parsed.from;
    const newVersionId = parsed.positionals[2] || parsed.to;

    if (!argument || !oldVersion || !newVersionId) {
      console.error("Error: component path, old version, and new version are required");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);
      runRename(manager, oldVersion, newVersionId);
      console.log(`✅ Renamed version for ${manager.componentName}`);
    } catch (error) {
      console.error(`Error renaming version: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "delete": {
    if (hasBatchInputs) {
      if (!parsed.version) {
        console.error("Error: --version is required in batch mode");
        process.exit(1);
      }
      const targets = resolveBatchTargets(parsed);
      runBatch("delete", targets, (targetPath) => {
        const manager = findComponentManager(targetPath);
        runDelete(manager, parsed.version);
      });
      break;
    }

    const argument = parsed.positionals[0];
    const deleteVersionId = parsed.positionals[1] || parsed.version;

    if (!argument || !deleteVersionId) {
      console.error("Error: component path and version are required");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);
      runDelete(manager, deleteVersionId);
      console.log(`✅ Deleted version for ${manager.componentName}`);
    } catch (error) {
      console.error(`Error deleting version: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  case "promote": {
    if (hasBatchInputs) {
      if (!parsed.version) {
        console.error("Error: --version is required in batch mode");
        process.exit(1);
      }
      const targets = resolveBatchTargets(parsed);
      runBatch("promote", targets, (targetPath) => {
        runPromote(targetPath, parsed.version);
      });
      break;
    }

    const argument = parsed.positionals[0];
    const versionId = parsed.positionals[1] || parsed.version;

    if (!argument || !versionId) {
      console.error("Error: component path and version ID are required");
      process.exit(1);
    }

    try {
      runPromote(argument, versionId);
    } catch (error) {
      console.error(`Error during promotion: ${error.message}`);
      process.exit(1);
    }
    break;
  }

  default:
    if (!command) {
      showHelp();
      process.exit(0);
    }
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
