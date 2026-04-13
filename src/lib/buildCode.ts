const BUILD_CODE_PREFIX = 'BuildCodeV1:'

type BuildPayload = {
  version: 1
  selectedIds: string[]
}

function encodeBase64Url(value: string) {
  const utf8 = new TextEncoder().encode(value)
  let binary = ''

  utf8.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const withPadding = `${normalized}${padding}`

  const binary = atob(withPadding)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function exportBuildCode(selectedIds: Iterable<string>) {
  const normalizedIds = [...selectedIds].sort()

  if (normalizedIds.length === 0) {
    return ''
  }

  const payload: BuildPayload = {
    version: 1,
    selectedIds: normalizedIds,
  }

  return encodeBase64Url(JSON.stringify(payload))
}

export function parseBuildCode(code: string) {
  const trimmed = code.trim()

  if (trimmed === '') {
    throw new Error('Build code is empty.')
  }

  let parsed: unknown

  try {
    const encoded = trimmed.startsWith(BUILD_CODE_PREFIX)
      ? trimmed.slice(BUILD_CODE_PREFIX.length)
      : trimmed
    parsed = JSON.parse(decodeBase64Url(encoded))
  } catch {
    throw new Error('Build code is malformed or could not be decoded.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('version' in parsed) ||
    !('selectedIds' in parsed) ||
    (parsed as BuildPayload).version !== 1 ||
    !Array.isArray((parsed as BuildPayload).selectedIds)
  ) {
    throw new Error('Build code payload is invalid.')
  }

  const invalidEntry = (parsed as BuildPayload).selectedIds.find((value) => typeof value !== 'string')

  if (invalidEntry !== undefined) {
    throw new Error('Build code contains an invalid upgrade id.')
  }

  return [...new Set((parsed as BuildPayload).selectedIds)].sort()
}
