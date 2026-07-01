const SENSITIVE_KEY_PATTERN = '(?:password|passphrase|secret|token|private[_-]?key(?:path)?)'
const assignmentPattern = new RegExp(`(${SENSITIVE_KEY_PATTERN}\\s*[=:]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,;]+)`, 'gi')
const jsonPattern = new RegExp(`(["']${SENSITIVE_KEY_PATTERN}["']\\s*:\\s*)"[^"]*"`, 'gi')
const pemPattern = /(-----BEGIN [^-]+-----)[\s\S]*?(-----END [^-]+-----)/g

export function sanitizeSensitiveText(message: string) {
  return message
    .replace(assignmentPattern, '$1[redacted]')
    .replace(jsonPattern, '$1"[redacted]"')
    .replace(pemPattern, '$1[redacted]$2')
}

