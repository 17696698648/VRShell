const SENSITIVE_KEY_PATTERN = '(?:authorization|password|passphrase|secret|access[_-]?token|refresh[_-]?token|token|private[_-]?key(?:path)?)'
const assignmentPattern = new RegExp(`(${SENSITIVE_KEY_PATTERN}\\s*[=:]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,;]+)`, 'gi')
const jsonPattern = new RegExp(`(["']${SENSITIVE_KEY_PATTERN}["']\\s*:\\s*)"[^"]*"`, 'gi')
const pemPattern = /(-----BEGIN [^-]+-----)[\s\S]*?(-----END [^-]+-----)/g
const bearerPattern = /(authorization\s*:\s*)bearer\s+[^\s,;]+/gi
const windowsUserPathPattern = /([A-Z]:\\Users\\)[^\\\s]+/gi
const linuxHomePathPattern = /(\/home\/)[^/\s]+/g
const macUserPathPattern = /(\/Users\/)[^/\s]+/g

export function sanitizeSensitiveText(message: string) {
  return message
    .replace(bearerPattern, '$1[redacted]')
    .replace(assignmentPattern, '$1[redacted]')
    .replace(jsonPattern, '$1"[redacted]"')
    .replace(pemPattern, '$1[redacted]$2')
    .replace(windowsUserPathPattern, '$1[redacted]')
    .replace(linuxHomePathPattern, '$1[redacted]')
    .replace(macUserPathPattern, '$1[redacted]')
}
