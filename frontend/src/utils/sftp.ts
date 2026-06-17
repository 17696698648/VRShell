export function joinRemotePath(parentPath: string, name: string) {
  const cleanName = name.replace(/^\/+/, '')
  return parentPath === '/' ? `/${cleanName}` : `${parentPath.replace(/\/+$/, '')}/${cleanName}`
}

export function parentRemotePath(path: string) {
  const parts = path.split('/').filter(Boolean).slice(0, -1)
  return parts.length > 0 ? `/${parts.join('/')}` : '/'
}

export function isLikelyBinaryFile(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  const binaryExtensions = new Set([
    '7z', 'avi', 'bin', 'bmp', 'class', 'dll', 'doc', 'docx', 'dylib', 'exe',
    'gif', 'gz', 'ico', 'jar', 'jpeg', 'jpg', 'mov', 'mp3', 'mp4', 'o', 'pdf',
    'png', 'ppt', 'pptx', 'rar', 'so', 'tar', 'wasm', 'webp', 'xls', 'xlsx', 'zip',
  ])
  return binaryExtensions.has(extension)
}

export function detectFileLanguage(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  const name = fileName.toLowerCase()

  // Special filenames (no extension)
  const nameMap: Record<string, string> = {
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    license: 'text',
    readme: 'markdown',
  }
  if (nameMap[name]) return nameMap[name]

  const languageMap: Record<string, string> = {
    // TypeScript / JavaScript
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    vue: 'vue',
    svelte: 'html',

    // Data / Config
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    ini: 'text',
    conf: 'shell',
    env: 'text',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    less: 'css',

    // Documentation
    md: 'markdown',
    mdx: 'markdown',
    txt: 'text',
    log: 'text',

    // Shell
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'shell',
    bat: 'shell',

    // Languages
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'text',      // Kotlin — no CM6 package, fallback to text
    c: 'cpp',
    h: 'cpp',
    cpp: 'cpp',
    hpp: 'cpp',
    cs: 'text',      // C# — fallback text
    php: 'php',
    rb: 'ruby',
    sql: 'sql',
    lua: 'text',     // Lua — fallback text
    r: 'text',       // R — fallback text

    // Images (won't be editable, but just in case)
    png: 'text',
    jpg: 'text',
    jpeg: 'text',
    gif: 'text',
    svg: 'xml',
    webp: 'text',
    ico: 'text',

    // Archives (won't be editable)
    zip: 'text',
    tar: 'text',
    gz: 'text',
    rar: 'text',
    '7z': 'text',

    // Other
    pdf: 'text',
    lock: 'text',
  }
  return languageMap[extension] ?? 'text'
}
