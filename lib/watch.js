const fs = require("fs")
const path = require("path")
const chokidar = require("chokidar")

class VersionSync {
  constructor(watchPath) {
    // If given a component name, search for it recursively
    if (!watchPath.includes('/') && !fs.existsSync(watchPath)) {
      this.watchDir = this.findComponentDirectory(watchPath)
    } else {
      this.watchDir = path.resolve(watchPath)
    }
    
    if (!this.watchDir || !fs.existsSync(this.watchDir)) {
      console.error(`Directory not found: ${watchPath}`)
      if (!watchPath.includes('/')) {
        console.error(`Searched recursively for component "${watchPath}" but no directory with versions.ts was found.`)
      }
      process.exit(1)
    }

    this.versionsFile = path.join(this.watchDir, "versions.ts")
    this.currentVersionFiles = new Set()
    this.currentVersionKeys = new Set()
    this.pendingDescriptionTransfers = new Map() // Track key renames for description transfer
    this.previousVersionsData = {} // Store previous version data for comparison
    this.recentlyHandledKeyChange = false // Flag to prevent duplicate handling

    console.log(`Watching directory: ${this.watchDir}`)
    this.generateVersionsFile()
    this.updatePreviousVersionsData() // Initialize with current state
    this.startWatching()
  }

  findComponentDirectory(componentName) {
    const searchDirectories = [
      process.cwd(),
      path.join(process.cwd(), 'frontend'),
      path.join(process.cwd(), 'src'),
      path.join(process.cwd(), 'frontend/src'),
    ]

    for (const searchDir of searchDirectories) {
      if (fs.existsSync(searchDir)) {
        const found = this.recursiveSearch(searchDir, componentName)
        if (found) return found
      }
    }

    return null
  }

  recursiveSearch(dir, componentName) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name)
          
          // Check if this directory has the component name and versions.ts
          if (entry.name === componentName) {
            const versionsFile = path.join(fullPath, 'versions.ts')
            if (fs.existsSync(versionsFile)) {
              return fullPath
            }
          }
          
          // Recursively search subdirectories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const found = this.recursiveSearch(fullPath, componentName)
            if (found) return found
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return null
  }

  getVersionFiles() {
    const files = fs.readdirSync(this.watchDir)
    const versionFiles = files
      .filter((file) => {
        const match = file.match(/^v([\d_]+)\.(tsx?|jsx?)$/)
        return match && fs.statSync(path.join(this.watchDir, file)).isFile()
      })
      .sort((a, b) => {
        const aVersion = this.parseVersionString(a.match(/^v([\d_]+)/)[1])
        const bVersion = this.parseVersionString(b.match(/^v([\d_]+)/)[1])

        // Compare major version first, then minor
        if (aVersion.major !== bVersion.major) {
          return aVersion.major - bVersion.major
        }
        return aVersion.minor - bVersion.minor
      })

    return versionFiles
  }

  parseVersionString(versionStr) {
    // Convert v1_2 to {major: 1, minor: 2}
    const parts = versionStr.split("_")
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1] || "0"),
    }
  }

  versionToId(versionStr) {
    // Convert v1_2 to v1.2
    return `v${versionStr.replace(/_/g, ".")}`
  }

  versionToImportSuffix(versionStr) {
    // Convert v1_2 to V1_2 for import names
    return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`
  }

  generateImportName(fileName) {
    const match = fileName.match(/^v([\d_]+)/)
    if (!match) return null

    const folderName = path.basename(this.watchDir)
    const versionStr = match[1]

    return `${folderName}${this.versionToImportSuffix(versionStr)}`
  }

  generateVersionKey(fileName, index) {
    const match = fileName.match(/^v([\d_]+)/)
    if (!match) return null

    return `v${match[1]}`
  }

  generateVersionsFile() {
    const versionFiles = this.getVersionFiles()

    // Update our tracking sets
    this.currentVersionFiles = new Set(versionFiles)
    this.currentVersionKeys = new Set(
      versionFiles
        .map((file) => {
          const match = file.match(/^v([\d_]+)/)
          return match ? `v${match[1]}` : null
        })
        .filter(Boolean)
    )

    if (versionFiles.length === 0) {
      console.log(
        "No version files found matching pattern v{number}[_{number}].(ts|tsx|js|jsx)"
      )
      return
    }

    // Parse existing versions to preserve custom labels/descriptions
    const existingVersions = this.parseVersionsFile().versions

    // Generate imports
    const imports = versionFiles
      .map((file) => {
        const importName = this.generateImportName(file)
        const filePath = `./${file.replace(/\.(tsx?|jsx?)$/, "")}`
        return `import ${importName} from "${filePath}"`
      })
      .join("\n")

    // Generate VERSIONS object
    const versions = versionFiles
      .map((file, index) => {
        const importName = this.generateImportName(file)
        const key = this.generateVersionKey(file, index)
        const versionStr = key.substring(1) // Remove 'v' prefix
        const defaultLabel = this.versionToId(`v${versionStr}`)
          .substring(1)
          .toUpperCase() // Remove extra 'v'

        // Check for pending description transfers first
        let existingVersion = existingVersions[key] || {}
        console.log(`[DEBUG] Processing key: ${key}`)
        console.log(`[DEBUG] Existing version for ${key}:`, existingVersion)
        console.log(`[DEBUG] Pending transfers:`, Object.fromEntries(this.pendingDescriptionTransfers))
        
        if (this.pendingDescriptionTransfers.has(key)) {
          const sourceKey = this.pendingDescriptionTransfers.get(key)
          // Use previous versions data for the transfer since current may be overwritten
          const sourceVersion = this.previousVersionsData[sourceKey] || existingVersions[sourceKey] || {}
          console.log(`[DEBUG] Source version for transfer (${sourceKey}):`, sourceVersion)
          // Transfer description and label from source
          existingVersion = {
            ...existingVersion,
            description: sourceVersion.description,
            label: sourceVersion.label
          }
          this.pendingDescriptionTransfers.delete(key)
          console.log(`[DEBUG] After transfer, existingVersion:`, existingVersion)
          console.log(`  Transferred description from ${sourceKey} to ${key}`)
        }

        const label = existingVersion.label || defaultLabel
        const description = existingVersion.description

        let versionBlock = `  "${key}": {
    render: ${importName},
    label: "${label}",`
        
        if (description) {
          versionBlock += `
    description: "${description}",`
        }
        
        versionBlock += `
  }`
        
        return versionBlock
      })
      .join(",\n")

    const content = `${imports}

export const VERSIONS = {
${versions},
}
`

    fs.writeFileSync(this.versionsFile, content, "utf8")
    console.log(
      `Generated ${this.versionsFile} with ${versionFiles.length} versions`
    )
  }

  parseVersionsFile() {
    try {
      const content = fs.readFileSync(this.versionsFile, "utf8")
      const versionsMatch = content.match(
        /export const VERSIONS = \{([\s\S]*)\}/
      )
      if (!versionsMatch) return { keys: new Set(), versions: {} }

      const versionsContent = versionsMatch[1]
      const versionBlocks = this.extractVersionBlocks(versionsContent)
      
      const keys = new Set(Object.keys(versionBlocks))
      return { keys, versions: versionBlocks }
    } catch (error) {
      return { keys: new Set(), versions: {} }
    }
  }

  extractVersionBlocks(versionsContent) {
    const versions = {}
    const lines = versionsContent.split('\n')
    let currentKey = null
    let currentBlock = []
    let braceDepth = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Check if this line starts a new version block
      const keyMatch = trimmed.match(/^["']?(v[^"':s]*)["']?\s*:\s*\{/)
      if (keyMatch) {
        // Save previous block if exists
        if (currentKey && currentBlock.length > 0) {
          versions[currentKey] = this.parseVersionBlock(currentBlock.join('\n'))
        }
        
        currentKey = keyMatch[1]
        currentBlock = [line]
        braceDepth = 1
        continue
      }
      
      if (currentKey) {
        currentBlock.push(line)
        
        // Count braces to know when block ends
        for (const char of trimmed) {
          if (char === '{') braceDepth++
          if (char === '}') braceDepth--
        }
        
        // Block is complete
        if (braceDepth === 0) {
          versions[currentKey] = this.parseVersionBlock(currentBlock.join('\n'))
          currentKey = null
          currentBlock = []
        }
      }
    }
    
    // Handle last block if file doesn't end with comma
    if (currentKey && currentBlock.length > 0) {
      versions[currentKey] = this.parseVersionBlock(currentBlock.join('\n'))
    }
    
    return versions
  }

  parseVersionBlock(blockContent) {
    const version = {}
    
    // Extract render component
    const renderMatch = blockContent.match(/render:\s*([^,\n}]+)/)
    if (renderMatch) {
      version.render = renderMatch[1].trim()
    }
    
    // Extract label
    const labelMatch = blockContent.match(/label:\s*["']([^"']*)["']/)
    if (labelMatch) {
      version.label = labelMatch[1]
    }
    
    // Extract description if it exists
    const descriptionMatch = blockContent.match(/description:\s*["']([^"']*)["']/)
    if (descriptionMatch) {
      version.description = descriptionMatch[1]
    }
    
    return version
  }

  handleFileRename() {
    console.log('[DEBUG] handleFileRename called')
    
    // Skip if we recently handled this as a key change
    if (this.recentlyHandledKeyChange) {
      console.log('[DEBUG] Skipping file rename - recently handled as key change')
      return false
    }
    
    const currentFiles = this.getVersionFiles()
    const currentSet = new Set(currentFiles)
    const previousSet = this.currentVersionFiles
    
    console.log('[DEBUG] Current files:', currentFiles)
    console.log('[DEBUG] Previous files:', Array.from(previousSet))
    console.log('[DEBUG] Previous versions data:', JSON.stringify(this.previousVersionsData, null, 2))

    // Find files that were added or removed
    const added = currentFiles.filter((file) => !previousSet.has(file))
    const removed = Array.from(previousSet).filter(
      (file) => !currentSet.has(file)
    )

    if (added.length > 0 || removed.length > 0) {
      console.log("File rename detected:")
      if (removed.length > 0) console.log(`  Removed: ${removed.join(", ")}`)
      if (added.length > 0) console.log(`  Added: ${added.join(", ")}`)

      // Handle 1:1 file renames to preserve descriptions
      if (removed.length === 1 && added.length === 1) {
        const oldFile = removed[0]
        const newFile = added[0]
        const oldKey = oldFile.replace(/\.(tsx?|jsx?)$/, '')
        const newKey = newFile.replace(/\.(tsx?|jsx?)$/, '')
        
        console.log(`[DEBUG] File rename: ${oldFile} -> ${newFile}`)
        console.log(`[DEBUG] Key mapping: ${oldKey} -> ${newKey}`)
        console.log(`[DEBUG] Previous data for ${oldKey}:`, this.previousVersionsData[oldKey])
        
        // Mark for description transfer
        this.pendingDescriptionTransfers.set(newKey, oldKey)
        console.log(`[DEBUG] Set pending transfer: ${newKey} <- ${oldKey}`)
        console.log(`  Marking description transfer: ${oldKey} → ${newKey}`)
      }

      this.generateVersionsFile()
      this.updatePreviousVersionsData() // Update for next change
      return true
    }
    return false
  }

  updatePreviousVersionsData() {
    const parsed = this.parseVersionsFile()
    this.previousVersionsData = { ...parsed.versions }
    console.log('[DEBUG] Updated previousVersionsData:', JSON.stringify(this.previousVersionsData, null, 2))
  }

  handleVersionsKeyChange() {
    console.log('[DEBUG] handleVersionsKeyChange called')
    const parsed = this.parseVersionsFile()
    const currentKeys = parsed.keys
    const previousKeys = this.currentVersionKeys
    
    console.log('[DEBUG] Current parsed versions:', JSON.stringify(parsed.versions, null, 2))
    console.log('[DEBUG] Previous versions data:', JSON.stringify(this.previousVersionsData, null, 2))
    console.log('[DEBUG] Current keys:', Array.from(currentKeys))
    console.log('[DEBUG] Previous keys:', Array.from(previousKeys))

    // Find keys that were added or removed
    const added = Array.from(currentKeys).filter(
      (key) => !previousKeys.has(key)
    )
    const removed = Array.from(previousKeys).filter(
      (key) => !currentKeys.has(key)
    )

    if (added.length > 0 || removed.length > 0) {
      console.log("VERSIONS key change detected:")
      if (removed.length > 0)
        console.log(`  Removed keys: ${removed.join(", ")}`)
      if (added.length > 0) console.log(`  Added keys: ${added.join(", ")}`)

      // Handle 1:1 renames (one removed, one added)
      if (removed.length === 1 && added.length === 1) {
        const oldKey = removed[0]
        const newKey = added[0]

        const oldFileName = `${oldKey}.tsx`
        const newFileName = `${newKey}.tsx`

        const oldFilePath = path.join(this.watchDir, oldFileName)
        const newFilePath = path.join(this.watchDir, newFileName)

        if (fs.existsSync(oldFilePath)) {
          console.log(`Renaming file: ${oldFileName} → ${newFileName}`)
          
          // For versions.ts key edits, the new key already has the correct data
          // We just need to rename the file - no need to transfer descriptions
          console.log('[DEBUG] Key change in versions.ts - preserving current data')
          console.log('[DEBUG] oldKey:', oldKey, 'newKey:', newKey)
          
          fs.renameSync(oldFilePath, newFilePath)

          // Don't regenerate - versions.ts already has correct data
          // Just update our tracking to match the file system
          this.currentVersionKeys = currentKeys
          this.updatePreviousVersionsData() // Update for next change
          
          // Set flag to prevent file rename handler from running
          this.recentlyHandledKeyChange = true
          setTimeout(() => { this.recentlyHandledKeyChange = false }, 500)
          
          return true
        }
      }

      // Update tracking
      this.currentVersionKeys = currentKeys
      this.updatePreviousVersionsData() // Update for next change
      return true
    }
    return false
  }

  startWatching() {
    console.log("Watching for file changes...")

    const watcher = chokidar.watch(this.watchDir, {
      ignored: /^\./, 
      persistent: true,
      ignoreInitial: true
    })

    watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("\nStopping file watcher...")
      watcher.close()
      process.exit(0)
    })

    process.on("SIGTERM", () => {
      console.log("\nStopping file watcher...")
      watcher.close()
      process.exit(0)
    })
  }

  handleFileChange(eventType, filePath) {
    const filename = path.basename(filePath)
    const isVersionFile = /^v[\d_]+\.(tsx?|jsx?)$/.test(filename)
    const isVersionsFile = filename === "versions.ts"

    if (isVersionFile) {
      console.log(`Detected change: ${eventType} ${filename}`)

      // Small delay to ensure file operations are complete
      setTimeout(() => {
        // Check if this is a rename operation
        if (!this.handleFileRename()) {
          // If not a rename, just regenerate
          this.generateVersionsFile()
        }
      }, 100)
    } else if (isVersionsFile && eventType === "change") {
      // Handle changes to versions.ts file
      console.log(`Detected change: ${eventType} ${filename}`)
      setTimeout(() => {
        this.handleVersionsKeyChange()
      }, 100)
    }
  }
}

module.exports = { VersionSync }