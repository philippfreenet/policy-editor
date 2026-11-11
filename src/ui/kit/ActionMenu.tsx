import {Menu, MenuButton, MenuItem, MenuItems} from '@headlessui/react'

interface ActionMenuItem {
  danger?: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}

interface ActionMenuProps {
  items: readonly ActionMenuItem[]
  /** Zugänglicher Name des Auslösers „⋯“. */
  label: string
}

/** Aktionsmenü mit Auslöser „⋯“; vollständig per Tastatur bedienbar. */
export function ActionMenu({items, label}: ActionMenuProps): React.JSX.Element {
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton
        aria-label={label}
        className="inline-flex size-6 items-center justify-center rounded text-muted outline-accent hover:bg-sidebar hover:text-fg focus-visible:outline-2"
      >
        <span aria-hidden="true">⋯</span>
      </MenuButton>
      <MenuItems className="absolute right-0 z-30 mt-1 min-w-40 rounded border border-line-strong bg-surface py-1 outline-none">
        {items.map((item, index) => (
          <MenuItem disabled={item.disabled} key={index}>
            <button
              className={`block min-h-6 w-full px-3 py-1 text-left break-words data-focus:bg-sidebar data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-accent data-disabled:opacity-50 ${item.danger === true ? 'text-danger' : 'text-fg'}`}
              onClick={item.onSelect}
              type="button"
            >
              {item.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  )
}
