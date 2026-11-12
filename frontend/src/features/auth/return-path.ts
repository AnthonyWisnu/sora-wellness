export function loginReturnPath(search: string, origin: string) {
  const raw = new URLSearchParams(search).get('returnTo')
  if (!raw || raw.length>500) return '/dashboard'
  try {
    const target = new URL(raw,origin)
    if (target.origin!==origin || !/^\/events\/[a-z0-9-]+$/.test(target.pathname)) return '/dashboard'
    return target.pathname+target.search
  } catch { return '/dashboard' }
}
