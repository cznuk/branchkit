const fs = require("fs");
const path = require("path");

const SUPPORTED_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function isGlobPattern(value) {
  return /[*?[\]{}]/.test(value);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(globPattern) {
  // Supports *, **, ?, and {a,b}.
  let pattern = toPosixPath(globPattern);

  pattern = pattern.replace(/\{([^}]+)\}/g, (_, inner) => {
    const alternatives = inner
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => escapeRegex(item));
    return `(${alternatives.join("|")})`;
  });

  pattern = pattern.replace(/\*\*\//g, "::GLOBSTAR_DIR::");

  let regex = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.startsWith("::GLOBSTAR_DIR::", i)) {
      regex += "(?:.*\\/)?";
      i += "::GLOBSTAR_DIR::".length - 1;
      continue;
    }

    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        regex += ".*";
        i++;
      } else {
        regex += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      regex += "[^/]";
      continue;
    }
    if (char === "/") {
      regex += "\\/";
      continue;
    }
    regex += escapeRegex(char);
  }

  return new RegExp(`^${regex}$`);
}

function isVersionArtifact(filePath) {
  const base = path.basename(filePath);
  if (base.endsWith('.versions.ts')) return true;
  return /\.v\d+(?:_\d+)?\.[jt]sx?$/.test(base);
}

function walkFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function classifyTargetKind(filePath) {
  const normalized = toPosixPath(filePath);
  const basename = path.basename(filePath);
  if (
    normalized.includes("/pages/") ||
    normalized.includes("/app/") ||
    /(^|\/)page\.[jt]sx?$/.test(normalized) ||
    /Page\.[jt]sx?$/.test(basename)
  ) {
    return "page";
  }
  return "component";
}

function getTargetIdFromPath(filePath, rootDir = process.cwd()) {
  const abs = path.resolve(filePath);
  const rel = path.relative(path.resolve(rootDir), abs);
  const noExt = rel.replace(/\.[^/.]+$/, "");
  return toPosixPath(noExt);
}

function resolveTargetPaths(targetInputs = [], options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const collected = new Set();
  const allFiles = walkFiles(cwd)
    .filter((filePath) => SUPPORTED_EXTENSIONS.has(path.extname(filePath)))
    .filter((filePath) => !isVersionArtifact(filePath))
    .map((filePath) => path.resolve(filePath));

  for (const input of targetInputs) {
    if (!input || typeof input !== "string") continue;

    const normalizedInput = toPosixPath(input.trim());
    if (!normalizedInput) continue;

    if (isGlobPattern(normalizedInput)) {
      const matcher = globToRegex(normalizedInput.startsWith("/") ? normalizedInput.slice(1) : normalizedInput);
      for (const filePath of allFiles) {
        const rel = toPosixPath(path.relative(cwd, filePath));
        if (matcher.test(rel)) {
          collected.add(filePath);
        }
      }
      continue;
    }

    const absoluteInput = path.resolve(cwd, input);
    if (!fs.existsSync(absoluteInput)) {
      throw new Error(`Target does not exist: ${input}`);
    }

    const stat = fs.statSync(absoluteInput);
    if (stat.isDirectory()) {
      for (const filePath of walkFiles(absoluteInput)) {
        if (SUPPORTED_EXTENSIONS.has(path.extname(filePath)) && !isVersionArtifact(filePath)) {
          collected.add(path.resolve(filePath));
        }
      }
      continue;
    }

    if (!SUPPORTED_EXTENSIONS.has(path.extname(absoluteInput))) {
      throw new Error(`Unsupported target file extension: ${input}`);
    }

    if (isVersionArtifact(absoluteInput)) {
      throw new Error(`Version artifact cannot be targeted directly: ${input}`);
    }

    collected.add(absoluteInput);
  }

  return Array.from(collected).sort();
}

/**
 * Find a ComponentManager from a component path (similar to VersionPromoter.findVersionsFile)
 */
function findComponentManager(componentPath) {
  const { ComponentManager } = require("./watch");
  const resolvedPath = path.resolve(componentPath);

  // If it's a direct path to versions file
  if (fs.existsSync(resolvedPath) && resolvedPath.endsWith(".versions.ts")) {
    return new ComponentManager(resolvedPath);
  }

  // If it's a directory, look for versions file
  if (fs.existsSync(resolvedPath)) {
    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(resolvedPath);
      const versionsFile = files.find((f) => f.endsWith(".versions.ts"));
      if (versionsFile) {
        return new ComponentManager(path.join(resolvedPath, versionsFile));
      }
    } else if (stat.isFile()) {
      // If it's a component file, look in the same directory
      const dir = path.dirname(resolvedPath);
      const componentName = path.basename(resolvedPath, path.extname(resolvedPath));
      const versionsFile = path.join(dir, `${componentName}.versions.ts`);
      if (fs.existsSync(versionsFile)) {
        return new ComponentManager(versionsFile);
      }
    }
  }

  // Try searching by component name
  if (!componentPath.includes("/") && !componentPath.includes("\\")) {
    const found = recursiveSearchVersionsFile(process.cwd(), componentPath);
    if (found) {
      return new ComponentManager(found);
    }
  }

  throw new Error(`Component not found: ${componentPath}`);
}

function recursiveSearchVersionsFile(dir, componentName) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === `${componentName}.versions.ts`) {
          return fullPath;
        }
      } else if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          const found = recursiveSearchVersionsFile(path.join(dir, entry.name), componentName);
          if (found) return found;
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return null;
}

module.exports = {
  classifyTargetKind,
  findComponentManager,
  getTargetIdFromPath,
  resolveTargetPaths,
  toPosixPath,
};
