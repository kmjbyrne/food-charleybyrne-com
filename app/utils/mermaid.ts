type Mermaid = typeof import('mermaid')['default']

let instance: Promise<Mermaid> | null = null
let appliedDark: boolean | null = null

// Mermaid is ~500KB parsed, so it is only fetched the first time a recipe
// actually contains a diagram.
async function importMermaid(): Promise<Mermaid> {
  if (!instance) {
    instance = import('mermaid')
      .then(m => m.default)
      .catch((error) => {
        instance = null
        throw error
      })
  }
  return instance
}

function themeFor(isDark: boolean) {
  return {
    startOnLoad: false,
    theme: isDark ? 'dark' as const : 'neutral' as const,
    securityLevel: 'strict' as const,
    fontFamily: 'inherit',
    flowchart: { curve: 'basis' as const, padding: 12 },
    themeVariables: {
      darkMode: isDark,
      background: isDark ? '#1e1c16' : '#fafafa',
      primaryColor: isDark ? '#2a2f22' : '#eef2e6',
      primaryTextColor: isDark ? '#f0ede5' : '#1e2416',
      primaryBorderColor: isDark ? '#4f6b3a' : '#8a9a5b',
      lineColor: isDark ? '#6b7563' : '#9aa38b',
      secondaryColor: isDark ? '#26241c' : '#f4f6ef',
      tertiaryColor: isDark ? '#2e3422' : '#e4ead8',
      textColor: isDark ? '#f0ede5' : '#1e2416',
      mainBkg: isDark ? '#24291d' : '#ffffff',
      secondBkg: isDark ? '#2e3422' : '#f2f5ec',
      labelTextColor: isDark ? '#f0ede5' : '#1e2416',
      edgeLabelBackground: isDark ? '#1e1c16' : '#fafafa'
    }
  }
}

export async function loadMermaid(isDark: boolean): Promise<Mermaid | null> {
  if (import.meta.server) return null
  let mermaid: Mermaid
  try {
    mermaid = await importMermaid()
  } catch {
    return null
  }
  if (appliedDark !== isDark) {
    mermaid.initialize(themeFor(isDark))
    appliedDark = isDark
  }
  return mermaid
}
