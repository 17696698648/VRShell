import type { SftpFileIcon, SftpFileItem, SftpSortKey, SftpTreeNode } from '../types'

function createBrandIcon(type: string, color: string): SftpFileIcon {
  return { type, label: type.toUpperCase().slice(0, 4), color, variant: 'brand' }
}

const brandLabels: Record<string, string> = {
  css: 'CSS',
  docker: 'DK',
  git: 'GIT',
  html: 'HTML',
  java: 'JAVA',
  javascript: 'JS',
  json: 'JSON',
  shell: 'SH',
  typescript: 'TS',
  vue: 'VUE',
}

function createOfficialFileIcon(type: string, color: string): SftpFileIcon {
  return { type, label: (brandLabels[type] ?? type.toUpperCase()).slice(0, 4), color, variant: 'brand' }
}

function createBadgeIcon(label: string, color: string): SftpFileIcon {
  return { type: 'file-type', label: label.slice(0, 4), color, variant: 'badge' }
}

export function getSftpFileIcon(fileName: string, isDirectory: boolean, isSymlink = false): SftpFileIcon {
  if (isSymlink) {
    return { type: 'link', color: '#d8b4fe' }
  }
  if (isDirectory) {
    return { type: 'folder', color: '#60a5fa' }
  }

  const name = fileName.trim().toLowerCase()
  const extensionMatch = name.match(/\.([^.\s]+)$/)
  const extension = extensionMatch?.[1] ?? ''

  // Special filenames (no extension)
  const specialNames: Record<string, SftpFileIcon> = {
    dockerfile:     createOfficialFileIcon('docker', '#67e8f9'),
    makefile:       createBadgeIcon('MK', '#fcd34d'),
    license:        createBadgeIcon('LIC', '#cbd5e1'),
    readme:         createBadgeIcon('MD', '#cbd5e1'),
    '.gitignore':   createOfficialFileIcon('git', '#fca5a5'),
    '.env':         createBadgeIcon('ENV', '#fde047'),
    'package.json': createBadgeIcon('PKG', '#86efac'),
    'tsconfig.json': createBadgeIcon('TS', '#93c5fd'),
  }
  if (specialNames[name]) return specialNames[name]

  // Extension-based mapping
  const extMap: Record<string, SftpFileIcon> = {
    // JVM / packages
    jar: createBadgeIcon('JAR', '#fdba74'),
    war: createBadgeIcon('WAR', '#fdba74'),
    ear: createBadgeIcon('EAR', '#fdba74'),
    rpm: createBadgeIcon('RPM', '#fca5a5'),

    // TypeScript / JavaScript
    ts:  createOfficialFileIcon('typescript', '#93c5fd'),
    tsx: createOfficialFileIcon('typescript', '#93c5fd'),
    js:  createOfficialFileIcon('javascript', '#fde047'),
    jsx: createOfficialFileIcon('javascript', '#fde047'),
    mjs: createOfficialFileIcon('javascript', '#fde047'),
    cjs: createOfficialFileIcon('javascript', '#fde047'),

    // Vue / Svelte
    vue:    createOfficialFileIcon('vue', '#86efac'),
    svelte: createBadgeIcon('SV', '#fdba74'),

    // Data / Config
    json: createOfficialFileIcon('json', '#fde047'),
    yaml: createBadgeIcon('YAML', '#d8b4fe'),
    yml:  createBadgeIcon('YML', '#d8b4fe'),
    toml: createBadgeIcon('TOML', '#d8b4fe'),
    xml:  createBadgeIcon('XML', '#fdba74'),
    ini:  createBadgeIcon('INI', '#cbd5e1'),
    conf: createBadgeIcon('CONF', '#cbd5e1'),
    cfg:  createBadgeIcon('CFG', '#cbd5e1'),
    properties: createBadgeIcon('PROP', '#cbd5e1'),
    env:  createBadgeIcon('ENV', '#fde047'),

    // Web
    html: createOfficialFileIcon('html', '#fb923c'),
    htm:  createOfficialFileIcon('html', '#fb923c'),
    css:  createOfficialFileIcon('css', '#7dd3fc'),
    scss: createBadgeIcon('SCSS', '#d8b4fe'),
    less: createBadgeIcon('LESS', '#7dd3fc'),

    // Documentation
    md:  createBadgeIcon('MD', '#cbd5e1'),
    mdx: createBadgeIcon('MDX', '#cbd5e1'),
    txt: createBadgeIcon('TXT', '#cbd5e1'),
    log: createBadgeIcon('LOG', '#cbd5e1'),

    // Shell
    sh:   createOfficialFileIcon('shell', '#86efac'),
    bash: createBadgeIcon('BASH', '#86efac'),
    zsh:  createBadgeIcon('ZSH', '#86efac'),
    ps1:  createBadgeIcon('PS1', '#86efac'),
    bat:  createBadgeIcon('BAT', '#cbd5e1'),
    cmd:  createBadgeIcon('CMD', '#cbd5e1'),

    // Languages
    py:   createBadgeIcon('PY', '#93c5fd'),
    rs:   createBadgeIcon('RS', '#fcd34d'),
    go:   createBadgeIcon('GO', '#67e8f9'),
    java: createOfficialFileIcon('java', '#fca5a5'),
    kt:   createBadgeIcon('KT', '#d8b4fe'),
    kts:  createBadgeIcon('KTS', '#d8b4fe'),
    c:    createBadgeIcon('C', '#93c5fd'),
    h:    createBadgeIcon('H', '#93c5fd'),
    cpp:  createBadgeIcon('CPP', '#93c5fd'),
    hpp:  createBadgeIcon('HPP', '#93c5fd'),
    cs:   createBadgeIcon('CS', '#d8b4fe'),
    php:  createBadgeIcon('PHP', '#c4b5fd'),
    rb:   createBadgeIcon('RB', '#fca5a5'),
    sql:  createBadgeIcon('SQL', '#7dd3fc'),
    lua:  createBadgeIcon('LUA', '#93c5fd'),
    r:    createBadgeIcon('R', '#93c5fd'),

    // Images
    png:  createBadgeIcon('PNG', '#f9a8d4'),
    jpg:  createBadgeIcon('JPG', '#f9a8d4'),
    jpeg: createBadgeIcon('JPG', '#f9a8d4'),
    gif:  createBadgeIcon('GIF', '#f9a8d4'),
    svg:  createBadgeIcon('SVG', '#fcd34d'),
    webp: createBadgeIcon('WEBP', '#f9a8d4'),
    ico:  createBadgeIcon('ICO', '#f9a8d4'),

    // Archives
    zip: createBadgeIcon('ZIP', '#fcd34d'),
    tar: createBadgeIcon('TAR', '#fcd34d'),
    gz:  createBadgeIcon('GZ', '#fcd34d'),
    tgz: createBadgeIcon('TGZ', '#fcd34d'),
    rar: createBadgeIcon('RAR', '#fcd34d'),
    '7z': createBadgeIcon('7Z', '#fcd34d'),

    // Other
    pdf:  createBadgeIcon('PDF', '#fca5a5'),
    lock: createBadgeIcon('LOCK', '#cbd5e1'),
  }

    return extMap[extension] ?? { type: 'file', color: '#cbd5e1', variant: 'lucide' }
}

export function createSftpTreeNode(file: SftpFileItem, depth: number): SftpTreeNode {
  return {
    ...file,
    children: [],
    depth,
    expanded: false,
    loading: false,
    loaded: false,
  }
}

export function sortSftpTreeNodes(nodes: SftpTreeNode[], key: SftpSortKey, sortDirection: 'asc' | 'desc') {
  const direction = sortDirection === 'asc' ? 1 : -1

  return [...nodes].sort((fileA, fileB) => {
    if (fileA.isDirectory !== fileB.isDirectory) {
      return fileA.isDirectory ? -1 : 1
    }

    if (key === 'size') {
      return (fileA.sizeBytes - fileB.sizeBytes) * direction
    }

    if (key === 'modified') {
      return (fileA.modified - fileB.modified) * direction
    }

    return fileA.name.localeCompare(fileB.name) * direction
  })
}

export function flattenSftpTree(nodes: SftpTreeNode[], key: SftpSortKey, sortDirection: 'asc' | 'desc'): SftpTreeNode[] {
  return sortSftpTreeNodes(nodes, key, sortDirection).flatMap((node) => [
    node,
    ...(node.expanded ? flattenSftpTree(node.children, key, sortDirection) : []),
  ])
}

export function filterSftpTree(nodes: SftpTreeNode[], keyword: string, key: SftpSortKey, sortDirection: 'asc' | 'desc'): SftpTreeNode[] {
  return sortSftpTreeNodes(nodes, key, sortDirection).flatMap((node) => {
    const matchingChildren = node.children.length > 0 ? filterSftpTree(node.children, keyword, key, sortDirection) : []
    const matches = node.name.toLowerCase().includes(keyword)

    if (!matches && matchingChildren.length === 0) {
      return []
    }

    return [node, ...matchingChildren]
  })
}

export function collapseSftpTree(nodes: SftpTreeNode[]) {
  nodes.forEach((node) => {
    node.expanded = false
    collapseSftpTree(node.children)
  })
}
