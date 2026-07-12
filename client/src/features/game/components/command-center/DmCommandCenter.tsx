import { Fragment, type ReactNode } from 'react'
import '../../../../styles/dm-theme.css'

export function DmCommandCenter({
  enabled,
  collapsed,
  contextOpen,
  children,
}: {
  enabled: boolean
  collapsed: boolean
  contextOpen: boolean
  children: ReactNode
}) {
  if (!enabled) return <Fragment>{children}</Fragment>

  return (
    <div
      className={`dm-command-center${collapsed ? ' is-nav-collapsed' : ''}${
        contextOpen ? ' is-context-open' : ''
      }`}
    >
      {children}
    </div>
  )
}
