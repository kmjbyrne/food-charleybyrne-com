// Which category branches are open is the reader's choice, so it survives
// navigation instead of being derived from the current route.
export const useCategoryExpansion = () => {
  const open = useState<Record<string, boolean>>('category-open', () => ({}))

  const toggle = (path: string) => {
    open.value = { ...open.value, [path]: !open.value[path] }
  }

  const expand = (path: string) => {
    const parts = path.split('/').filter(Boolean)
    const next = { ...open.value }
    for (let i = 1; i <= parts.length; i++) {
      next[parts.slice(0, i).join('/')] = true
    }
    open.value = next
  }

  return { open, toggle, expand }
}
