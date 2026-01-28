const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

class VersionSync {
  constructor(watchPath) {
    // If given a component name or path, search for *.versions.ts file
    if (watchPath.endsWith(".versions.ts")) {
      // Direct path to versions file
      this.versionsFile = path.resolve(watchPath);
    } else if (!watchPath.includes("/") && !fs.existsSync(watchPath)) {
      // Component name - search for matching *.versions.ts file
      this.versionsFile = this.findVersionsFile(watchPath);
    } else {
      // Path to directory or file - try to find versions file
      const resolvedPath = path.resolve(watchPath);
      if (fs.statSync(resolvedPath).isFile()) {
        // If it's a file, assume it's a versions file
        this.versionsFile = resolvedPath;
      } else {
        // If it's a directory, search for *.versions.ts files in it
        this.versionsFile = this.findVersionsFileInDirectory(resolvedPath);
      }
    }

    if (!this.versionsFile || !fs.existsSync(this.versionsFile)) {
      console.error(`Versions file not found: ${watchPath}`);
      if (!watchPath.includes("/")) {
        console.error(
          `Searched recursively for component "${watchPath}" but no *.versions.ts file was found.`,
        );
      }
      process.exit(1);
    }

    this.watchDir = path.dirname(this.versionsFile);
    this.componentName = this.extractComponentName(this.versionsFile);
    this.currentVersionFiles = new Set();
    this.currentVersionKeys = new Set();
    this.pendingDescriptionTransfers = new Map(); // Track key renames for description transfer
    this.previousVersionsData = {}; // Store previous version data for comparison
    this.recentlyHandledKeyChange = false; // Flag to prevent duplicate handling
    this.wsClients = new Set(); // Store WebSocket connections
    this.server = null; // Express server instance
    this.wss = null; // WebSocket server instance

    console.log(`Watching directory: ${this.watchDir}`);
    console.log(`Component name: ${this.componentName}`);
    console.log(`Versions file: ${path.basename(this.versionsFile)}`);
    this.generateVersionsFile();
    this.updatePreviousVersionsData(); // Initialize with current state
    this.startServer(); // Start Express and WebSocket server
    this.startWatching();
  }

  extractComponentName(versionsFilePath) {
    const basename = path.basename(versionsFilePath, ".versions.ts");
    // Remove file extension if present (e.g., "Component.tsx" -> "Component")
    // Version files are named like "Component.v1.tsx", not "Component.tsx.v1.tsx"
    const ext = path.extname(basename);
    if (ext) {
      return basename.slice(0, -ext.length);
    }
    return basename;
  }

  findVersionsFile(componentName) {
    const searchDirectories = [
      process.cwd(),
      path.join(process.cwd(), "frontend"),
      path.join(process.cwd(), "src"),
      path.join(process.cwd(), "frontend/src"),
    ];

    for (const searchDir of searchDirectories) {
      if (fs.existsSync(searchDir)) {
        const found = this.recursiveSearchVersionsFile(
          searchDir,
          componentName,
        );
        if (found) return found;
      }
    }

    return null;
  }

  findVersionsFileInDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: false });
      const versionsFiles = entries.filter((file) =>
        file.endsWith(".versions.ts"),
      );
      if (versionsFiles.length === 1) {
        return path.join(dir, versionsFiles[0]);
      } else if (versionsFiles.length > 1) {
        console.error(
          `Multiple *.versions.ts files found in ${dir}. Please specify which one to watch.`,
        );
        process.exit(1);
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return null;
  }

  recursiveSearchVersionsFile(dir, componentName) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(dir, entry.name);
          // Check if this file matches ComponentName.versions.ts pattern
          if (entry.name === `${componentName}.versions.ts`) {
            return fullPath;
          }
        } else if (entry.isDirectory()) {
          // Recursively search subdirectories
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            const found = this.recursiveSearchVersionsFile(
              path.join(dir, entry.name),
              componentName,
            );
            if (found) return found;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return null;
  }

  getVersionFiles() {
    const files = fs.readdirSync(this.watchDir);
    const versionPattern = new RegExp(
      `^${this.componentName}\\.v([\\d_]+)\\.(tsx?|jsx?)$`,
    );
    const versionFiles = files
      .filter((file) => {
        const match = file.match(versionPattern);
        return match && fs.statSync(path.join(this.watchDir, file)).isFile();
      })
      .sort((a, b) => {
        const aMatch = a.match(versionPattern);
        const bMatch = b.match(versionPattern);
        const aVersion = this.parseVersionString(aMatch[1]);
        const bVersion = this.parseVersionString(bMatch[1]);

        // Compare major version first, then minor
        if (aVersion.major !== bVersion.major) {
          return aVersion.major - bVersion.major;
        }
        return aVersion.minor - bVersion.minor;
      });

    return versionFiles;
  }

  parseVersionString(versionStr) {
    // Convert v1_2 to {major: 1, minor: 2}
    const parts = versionStr.split("_");
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1] || "0"),
    };
  }

  versionToId(versionStr) {
    // Convert v1_2 to v1.2
    return `v${versionStr.replace(/_/g, ".")}`;
  }

  versionToImportSuffix(versionStr) {
    // Convert v1_2 to V1_2 for import names
    return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`;
  }

  generateImportName(fileName) {
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    const match = fileName.match(versionPattern);
    if (!match) return null;

    const versionStr = match[1];
    return `${this.componentName}${this.versionToImportSuffix(versionStr)}`;
  }

  generateVersionKey(fileName, index) {
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    const match = fileName.match(versionPattern);
    if (!match) return null;

    return `v${match[1]}`;
  }

  generateVersionsFile() {
    const versionFiles = this.getVersionFiles();

    // Update our tracking sets
    this.currentVersionFiles = new Set(versionFiles);
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    this.currentVersionKeys = new Set(
      versionFiles
        .map((file) => {
          const match = file.match(versionPattern);
          return match ? `v${match[1]}` : null;
        })
        .filter(Boolean),
    );

    if (versionFiles.length === 0) {
      console.log(
        "No version files found matching pattern v{number}[_{number}].(ts|tsx|js|jsx)",
      );
      return;
    }

    // Parse existing versions to preserve custom labels/descriptions
    const existingVersions = this.parseVersionsFile().versions;

    // Generate imports
    const imports = versionFiles
      .map((file) => {
        const importName = this.generateImportName(file);
        const filePath = `./${file.replace(/\.(tsx?|jsx?)$/, "")}`;
        return `import ${importName} from "${filePath}"`;
      })
      .join("\n");

    // Generate VERSIONS object
    const versions = versionFiles
      .map((file, index) => {
        const importName = this.generateImportName(file);
        const key = this.generateVersionKey(file, index);
        const versionStr = key.substring(1); // Remove 'v' prefix
        const defaultLabel = this.versionToId(`v${versionStr}`)
          .substring(1)
          .toUpperCase(); // Remove extra 'v'

        // Check for pending description transfers first
        let existingVersion = existingVersions[key] || {};

        if (this.pendingDescriptionTransfers.has(key)) {
          const sourceKey = this.pendingDescriptionTransfers.get(key);
          // Use previous versions data for the transfer since current may be overwritten
          const sourceVersion =
            this.previousVersionsData[sourceKey] ||
            existingVersions[sourceKey] ||
            {};
          // Transfer description and label from source
          existingVersion = {
            ...existingVersion,
            description: sourceVersion.description,
            label: sourceVersion.label,
          };
          this.pendingDescriptionTransfers.delete(key);
          console.log(`  Transferred description from ${sourceKey} to ${key}`);
        }

        const label = existingVersion.label || defaultLabel;
        const description = existingVersion.description;

        let versionBlock = `  "${key}": {
    render: ${importName},
    label: "${label}",`;

        if (description) {
          versionBlock += `
    description: "${description}",`;
        }

        versionBlock += `
  }`;

        return versionBlock;
      })
      .join(",\n");

    const content = `${imports}

export const VERSIONS = {
${versions},
}
`;

    fs.writeFileSync(this.versionsFile, content, "utf8");
    console.log(
      `Generated ${this.versionsFile} with ${versionFiles.length} versions`,
    );
    // Broadcast file change to WebSocket clients
    this.broadcastFileChange();
  }

  parseVersionsFile() {
    try {
      const content = fs.readFileSync(this.versionsFile, "utf8");
      const versionsMatch = content.match(
        /export const VERSIONS = \{([\s\S]*)\}/,
      );
      if (!versionsMatch) return { keys: new Set(), versions: {} };

      const versionsContent = versionsMatch[1];
      const versionBlocks = this.extractVersionBlocks(versionsContent);

      const keys = new Set(Object.keys(versionBlocks));
      return { keys, versions: versionBlocks };
    } catch (error) {
      return { keys: new Set(), versions: {} };
    }
  }

  // Helper methods for file operations
  versionKeyToFileVersion(versionKey) {
    // Convert v1_2 to 1_2
    return versionKey.replace(/^v/, "");
  }

  fileVersionToVersionKey(fileVersion) {
    // Convert 1_2 to v1_2
    return `v${fileVersion}`;
  }

  detectFileExtension(versionKey) {
    // Check which extension exists for this version
    const fileVersion = this.versionKeyToFileVersion(versionKey);
    const extensions = [".tsx", ".ts", ".jsx", ".js"];

    for (const ext of extensions) {
      const filePath = path.join(
        this.watchDir,
        `${this.componentName}.v${fileVersion}${ext}`,
      );
      if (fs.existsSync(filePath)) {
        return ext;
      }
    }

    // Default to .tsx if none found
    return ".tsx";
  }

  getVersionFilePath(versionKey) {
    // Get the full file path for a version key
    const fileVersion = this.versionKeyToFileVersion(versionKey);
    const extension = this.detectFileExtension(versionKey);
    return path.join(
      this.watchDir,
      `${this.componentName}.v${fileVersion}${extension}`,
    );
  }

  getNextVersionNumber() {
    // Calculate next available version number
    const versionFiles = this.getVersionFiles();
    if (versionFiles.length === 0) {
      return { major: 1, minor: 0 };
    }

    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)`);
    let maxMajor = 0;
    let maxMinor = 0;

    versionFiles.forEach((file) => {
      const match = file.match(versionPattern);
      if (match) {
        const version = this.parseVersionString(match[1]);
        if (version.major > maxMajor) {
          maxMajor = version.major;
          maxMinor = version.minor;
        } else if (version.major === maxMajor && version.minor > maxMinor) {
          maxMinor = version.minor;
        }
      }
    });

    // Return next major version
    return { major: maxMajor + 1, minor: 0 };
  }

  getMostCommonExtension() {
    // Get the most common file extension from existing version files
    const versionFiles = this.getVersionFiles();
    if (versionFiles.length === 0) {
      return ".tsx";
    }

    const extensions = {};
    versionFiles.forEach((file) => {
      const ext = path.extname(file);
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    // Return most common extension
    return Object.keys(extensions).reduce((a, b) =>
      extensions[a] > extensions[b] ? a : b,
    );
  }

  versionNumberToKey(versionNumber) {
    // Convert {major: 2, minor: 0} to "v2"
    // Convert {major: 1, minor: 2} to "v1_2"
    if (versionNumber.minor === 0) {
      return `v${versionNumber.major}`;
    }
    return `v${versionNumber.major}_${versionNumber.minor}`;
  }

  validateVersionKey(versionKey) {
    // Validate version key format: v{number}[_{number}]
    return /^v\d+(_\d+)?$/.test(versionKey);
  }

  extractVersionBlocks(versionsContent) {
    const versions = {};
    const lines = versionsContent.split("\n");
    let currentKey = null;
    let currentBlock = [];
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this line starts a new version block
      const keyMatch = trimmed.match(/^["']?(v[^"':s]*)["']?\s*:\s*\{/);
      if (keyMatch) {
        // Save previous block if exists
        if (currentKey && currentBlock.length > 0) {
          versions[currentKey] = this.parseVersionBlock(
            currentBlock.join("\n"),
          );
        }

        currentKey = keyMatch[1];
        currentBlock = [line];
        braceDepth = 1;
        continue;
      }

      if (currentKey) {
        currentBlock.push(line);

        // Count braces to know when block ends
        for (const char of trimmed) {
          if (char === "{") braceDepth++;
          if (char === "}") braceDepth--;
        }

        // Block is complete
        if (braceDepth === 0) {
          versions[currentKey] = this.parseVersionBlock(
            currentBlock.join("\n"),
          );
          currentKey = null;
          currentBlock = [];
        }
      }
    }

    // Handle last block if file doesn't end with comma
    if (currentKey && currentBlock.length > 0) {
      versions[currentKey] = this.parseVersionBlock(currentBlock.join("\n"));
    }

    return versions;
  }

  parseVersionBlock(blockContent) {
    const version = {};

    // Extract render component
    const renderMatch = blockContent.match(/render:\s*([^,\n}]+)/);
    if (renderMatch) {
      version.render = renderMatch[1].trim();
    }

    // Extract label
    const labelMatch = blockContent.match(/label:\s*["']([^"']*)["']/);
    if (labelMatch) {
      version.label = labelMatch[1];
    }

    // Extract description if it exists
    const descriptionMatch = blockContent.match(
      /description:\s*["']([^"']*)["']/,
    );
    if (descriptionMatch) {
      version.description = descriptionMatch[1];
    }

    return version;
  }

  handleFileRename() {
    // Skip if we recently handled this as a key change
    if (this.recentlyHandledKeyChange) {
      return false;
    }

    const currentFiles = this.getVersionFiles();
    const currentSet = new Set(currentFiles);
    const previousSet = this.currentVersionFiles;

    // Find files that were added or removed
    const added = currentFiles.filter((file) => !previousSet.has(file));
    const removed = Array.from(previousSet).filter(
      (file) => !currentSet.has(file),
    );

    if (added.length > 0 || removed.length > 0) {
      console.log("File rename detected:");
      if (removed.length > 0) console.log(`  Removed: ${removed.join(", ")}`);
      if (added.length > 0) console.log(`  Added: ${added.join(", ")}`);

      // Handle 1:1 file renames to preserve descriptions
      if (removed.length === 1 && added.length === 1) {
        const oldFile = removed[0];
        const newFile = added[0];
        // Extract version keys from ComponentName.v1.tsx format
        const oldMatch = oldFile.match(
          new RegExp(`^${this.componentName}\\.v([\\d_]+)`),
        );
        const newMatch = newFile.match(
          new RegExp(`^${this.componentName}\\.v([\\d_]+)`),
        );
        if (oldMatch && newMatch) {
          const oldKey = `v${oldMatch[1]}`;
          const newKey = `v${newMatch[1]}`;
          // Mark for description transfer
          this.pendingDescriptionTransfers.set(newKey, oldKey);
          console.log(`  Marking description transfer: ${oldKey} → ${newKey}`);
        }
      }

      this.generateVersionsFile();
      this.updatePreviousVersionsData(); // Update for next change
      this.broadcastFileChange(); // Notify WebSocket clients
      return true;
    }
    return false;
  }

  updatePreviousVersionsData() {
    const parsed = this.parseVersionsFile();
    this.previousVersionsData = { ...parsed.versions };
  }

  handleVersionsKeyChange() {
    const parsed = this.parseVersionsFile();
    const currentKeys = parsed.keys;
    const previousKeys = this.currentVersionKeys;

    // Find keys that were added or removed
    const added = Array.from(currentKeys).filter(
      (key) => !previousKeys.has(key),
    );
    const removed = Array.from(previousKeys).filter(
      (key) => !currentKeys.has(key),
    );

    if (added.length > 0 || removed.length > 0) {
      console.log("VERSIONS key change detected:");
      if (removed.length > 0)
        console.log(`  Removed keys: ${removed.join(", ")}`);
      if (added.length > 0) console.log(`  Added keys: ${added.join(", ")}`);

      // Handle 1:1 renames (one removed, one added)
      if (removed.length === 1 && added.length === 1) {
        const oldKey = removed[0];
        const newKey = added[0];

        // Extract version number from key (e.g., "v1" -> "1")
        const oldVersion = oldKey.replace(/^v/, "");
        const newVersion = newKey.replace(/^v/, "");
        const oldFileName = `${this.componentName}.v${oldVersion}.tsx`;
        const newFileName = `${this.componentName}.v${newVersion}.tsx`;

        const oldFilePath = path.join(this.watchDir, oldFileName);
        const newFilePath = path.join(this.watchDir, newFileName);

        if (fs.existsSync(oldFilePath)) {
          console.log(`Renaming file: ${oldFileName} → ${newFileName}`);

          // For versions.ts key edits, the new key already has the correct data
          // We just need to rename the file - no need to transfer descriptions

          fs.renameSync(oldFilePath, newFilePath);

          // Don't regenerate - versions.ts already has correct data
          // Just update our tracking to match the file system
          this.currentVersionKeys = currentKeys;
          this.updatePreviousVersionsData(); // Update for next change

          // Set flag to prevent file rename handler from running
          this.recentlyHandledKeyChange = true;
          setTimeout(() => {
            this.recentlyHandledKeyChange = false;
          }, 500);

          return true;
        }
      }

      // Update tracking
      this.currentVersionKeys = currentKeys;
      this.updatePreviousVersionsData(); // Update for next change
      return true;
    }
    return false;
  }

  startServer() {
    const app = express();
    const port = process.env.PORT || 3001;

    // Enable CORS for all routes
    app.use(cors());

    // Create HTTP server
    this.server = http.createServer(app);

    // Create WebSocket server
    this.wss = new WebSocket.Server({ server: this.server });

    // Handle WebSocket connections
    this.wss.on("connection", (ws) => {
      this.wsClients.add(ws);
      console.log(
        `[WebSocket] Client connected (${this.wsClients.size} total)`,
      );

      // Send initial connection acknowledgment
      ws.send(
        JSON.stringify({
          type: "ack",
          payload: { message: "Connected to uifork watch server" },
        }),
      );

      // Handle incoming messages
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              payload: { message: "Invalid message format" },
            }),
          );
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.wsClients.delete(ws);
        console.log(
          `[WebSocket] Client disconnected (${this.wsClients.size} total)`,
        );
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("[WebSocket] Error:", error);
        this.wsClients.delete(ws);
      });
    });

    // Start server
    this.server.listen(port, () => {
      console.log(
        `[Server] Express server running on http://localhost:${port}`,
      );
      console.log(
        `[Server] WebSocket server running on ws://localhost:${port}/ws`,
      );
    });
  }

  handleWebSocketMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case "duplicate_version":
        this.handleDuplicateVersion(ws, payload);
        break;
      case "delete_version":
        this.handleDeleteVersion(ws, payload);
        break;
      case "new_version":
        this.handleNewVersion(ws, payload);
        break;
      case "rename_version":
        this.handleRenameVersion(ws, payload);
        break;
      default:
        console.warn(`[WebSocket] Unknown message type: ${type}`);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: `Unknown message type: ${type}` },
          }),
        );
    }
  }

  handleDuplicateVersion(ws, payload) {
    const { version, newVersion } = payload;
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (!this.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      // Find source file
      const sourceFilePath = this.getVersionFilePath(version);
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source version file not found: ${version}`);
      }

      // Determine target version
      let targetVersion;
      if (newVersion) {
        if (!this.validateVersionKey(newVersion)) {
          throw new Error(`Invalid target version format: ${newVersion}`);
        }
        targetVersion = newVersion;
      } else {
        // Calculate next available version
        const nextVersionNum = this.getNextVersionNumber();
        targetVersion = this.versionNumberToKey(nextVersionNum);
      }

      // Check if target version already exists
      const targetFilePath = this.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Target version already exists: ${targetVersion}`);
      }

      // Read source file content
      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

      // Detect extension from source file
      const extension = path.extname(sourceFilePath);

      // Create target file path with correct extension
      const fileVersion = this.versionKeyToFileVersion(targetVersion);
      const finalTargetPath = path.join(
        this.watchDir,
        `${this.componentName}.v${fileVersion}${extension}`,
      );

      // Write copied content to new file
      fs.writeFileSync(finalTargetPath, sourceContent, "utf8");

      console.log(
        `[WebSocket] Duplicate version: ${version} → ${targetVersion}`,
      );
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${this.componentName}`);
      console.log(`  Source: ${path.basename(sourceFilePath)}`);
      console.log(`  Target: ${path.basename(finalTargetPath)}`);

      // Regenerate versions file
      this.generateVersionsFile();

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully duplicated ${version} → ${targetVersion}`,
            version: targetVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Duplicate version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleDeleteVersion(ws, payload) {
    const { version } = payload;
    const timestamp = new Date().toISOString();

    try {
      if (!version) {
        throw new Error("Missing version parameter");
      }

      if (!this.validateVersionKey(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      // Find file to delete
      const filePath = this.getVersionFilePath(version);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Version file not found: ${version}`);
      }

      // Check if this is the only version remaining
      const versionFiles = this.getVersionFiles();
      if (versionFiles.length === 1) {
        throw new Error(
          "Cannot delete the last remaining version. At least one version must exist.",
        );
      }

      // Delete the file
      fs.unlinkSync(filePath);

      console.log(`[WebSocket] Delete version: ${version}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${this.componentName}`);
      console.log(`  Deleted: ${path.basename(filePath)}`);

      // Regenerate versions file
      this.generateVersionsFile();

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully deleted version ${version}`,
            version: version,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Delete version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleNewVersion(ws, payload) {
    const { version } = payload;
    const timestamp = new Date().toISOString();

    try {
      // Determine target version
      let targetVersion;
      if (version) {
        if (!this.validateVersionKey(version)) {
          throw new Error(`Invalid version format: ${version}`);
        }
        targetVersion = version;
      } else {
        // Calculate next available version
        const nextVersionNum = this.getNextVersionNumber();
        targetVersion = this.versionNumberToKey(nextVersionNum);
      }

      // Check if target version already exists
      const targetFilePath = this.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Version already exists: ${targetVersion}`);
      }

      // Determine file extension (use most common from existing files)
      const extension = this.getMostCommonExtension();

      // Create file path
      const fileVersion = this.versionKeyToFileVersion(targetVersion);
      const finalFilePath = path.join(
        this.watchDir,
        `${this.componentName}.v${fileVersion}${extension}`,
      );

      // Format version name for display (v2 -> V2, v1_2 -> V1.2)
      const displayVersion = targetVersion
        .replace(/^v/, "")
        .replace(/_/g, ".")
        .toUpperCase();

      // Generate component name for the function
      const importSuffix = this.versionToImportSuffix(fileVersion);
      const componentName = `${this.componentName}${importSuffix}`;

      // Create template content
      let templateContent;
      if (extension === ".tsx" || extension === ".jsx") {
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return (
    <div>
      ${displayVersion}
    </div>
  );
}
`;
      } else {
        // For .ts or .js files
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return React.createElement('div', null, '${displayVersion}');
}
`;
      }

      // Write new file
      fs.writeFileSync(finalFilePath, templateContent, "utf8");

      console.log(`[WebSocket] New version: ${targetVersion}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${this.componentName}`);
      console.log(`  Created: ${path.basename(finalFilePath)}`);
      console.log(`  Display: ${displayVersion}`);

      // Regenerate versions file
      this.generateVersionsFile();

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully created new version ${targetVersion}`,
            version: targetVersion,
            displayVersion: displayVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] New version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  handleRenameVersion(ws, payload) {
    const { version, newVersion } = payload;
    const timestamp = new Date().toISOString();

    try {
      if (!version || !newVersion) {
        throw new Error("Missing version or newVersion parameter");
      }

      if (!this.validateVersionKey(version)) {
        throw new Error(`Invalid source version format: ${version}`);
      }

      if (!this.validateVersionKey(newVersion)) {
        throw new Error(`Invalid target version format: ${newVersion}`);
      }

      if (version === newVersion) {
        throw new Error("Source and target versions are the same");
      }

      // Find source file - check all possible extensions
      const fileVersion = this.versionKeyToFileVersion(version);
      const extensions = [".tsx", ".ts", ".jsx", ".js"];
      let sourceFilePath = null;

      for (const ext of extensions) {
        const candidatePath = path.join(
          this.watchDir,
          `${this.componentName}.v${fileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          sourceFilePath = candidatePath;
          break;
        }
      }

      if (!sourceFilePath) {
        throw new Error(
          `Source version file not found: ${version}. Checked: ${extensions
            .map((ext) => `${this.componentName}.v${fileVersion}${ext}`)
            .join(", ")}`,
        );
      }

      // Check if target version already exists (check all extensions)
      const targetFileVersion = this.versionKeyToFileVersion(newVersion);
      let targetFilePath = null;
      for (const ext of extensions) {
        const candidatePath = path.join(
          this.watchDir,
          `${this.componentName}.v${targetFileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          targetFilePath = candidatePath;
          break;
        }
      }

      if (targetFilePath) {
        throw new Error(`Target version already exists: ${newVersion}`);
      }

      // Use the extension from the source file
      const extension = path.extname(sourceFilePath);

      // Create target file path with correct extension
      const finalTargetPath = path.join(
        this.watchDir,
        `${this.componentName}.v${targetFileVersion}${extension}`,
      );

      // Read source file content
      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

      // Update component name in content if it's a function component
      // This handles cases where the component name includes the version
      const importSuffix = this.versionToImportSuffix(fileVersion);
      const oldImportSuffix = this.versionToImportSuffix(
        this.versionKeyToFileVersion(version),
      );
      const oldComponentName = `${this.componentName}${oldImportSuffix}`;
      const newComponentName = `${this.componentName}${importSuffix}`;

      // Replace component name in content
      let updatedContent = sourceContent.replace(
        new RegExp(oldComponentName, "g"),
        newComponentName,
      );

      // Write to new file
      fs.writeFileSync(finalTargetPath, updatedContent, "utf8");

      // Delete old file
      fs.unlinkSync(sourceFilePath);

      console.log(`[WebSocket] Rename version: ${version} → ${newVersion}`);
      console.log(`  Timestamp: ${timestamp}`);
      console.log(`  Component: ${this.componentName}`);
      console.log(`  Source: ${path.basename(sourceFilePath)}`);
      console.log(`  Target: ${path.basename(finalTargetPath)}`);

      // Regenerate versions file
      this.generateVersionsFile();

      ws.send(
        JSON.stringify({
          type: "ack",
          payload: {
            message: `Successfully renamed ${version} → ${newVersion}`,
            version: version,
            newVersion: newVersion,
          },
        }),
      );
    } catch (error) {
      console.error(`[WebSocket] Rename version error: ${error.message}`);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: error.message },
        }),
      );
    }
  }

  broadcastFileChange() {
    const message = JSON.stringify({
      type: "file_changed",
      payload: {
        message: "Versions file updated",
        component: this.componentName,
      },
    });

    this.wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  shutdownServer() {
    return new Promise((resolve) => {
      if (this.wss) {
        // Close all WebSocket connections
        this.wsClients.forEach((client) => {
          client.close();
        });
        this.wsClients.clear();

        // Close WebSocket server
        this.wss.close(() => {
          console.log("[Server] WebSocket server closed");
        });
      }

      if (this.server) {
        this.server.close(() => {
          console.log("[Server] Express server closed");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  startWatching() {
    console.log("Watching for file changes...");

    const watcher = chokidar.watch(this.watchDir, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on("add", (filePath) => this.handleFileChange("add", filePath))
      .on("change", (filePath) => this.handleFileChange("change", filePath))
      .on("unlink", (filePath) => this.handleFileChange("unlink", filePath));

    // Handle process termination
    const shutdown = async () => {
      console.log("\nStopping file watcher and server...");
      watcher.close();
      await this.shutdownServer();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  handleFileChange(eventType, filePath) {
    const filename = path.basename(filePath);
    const versionPattern = new RegExp(
      `^${this.componentName}\\.v([\\d_]+)\\.(tsx?|jsx?)$`,
    );
    const isVersionFile = versionPattern.test(filename);
    const isVersionsFile = filename === `${this.componentName}.versions.ts`;

    if (isVersionFile) {
      console.log(`Detected change: ${eventType} ${filename}`);

      // Small delay to ensure file operations are complete
      setTimeout(() => {
        // Check if this is a rename operation
        if (!this.handleFileRename()) {
          // If not a rename, just regenerate
          this.generateVersionsFile();
        }
      }, 100);
    } else if (isVersionsFile && eventType === "change") {
      // Handle changes to ComponentName.versions.ts file
      console.log(`Detected change: ${eventType} ${filename}`);
      setTimeout(() => {
        this.handleVersionsKeyChange();
      }, 100);
    }
  }
}

module.exports = { VersionSync };
