import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { Menu, X } from 'lucide-react';
import { nav } from '../data/site';
import { navigationStore } from '../stores/navigation';
import Actions from './Actions';

export default function MobileMenu({ path }: { path: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const { menuOpen, setMenuOpen } = useStore(navigationStore);
  // Preserve a native disclosure opened before hydration.
  useEffect(() => setMenuOpen(details.current?.open ?? false), [setMenuOpen]);
  return <details ref={details} className="mobile-menu" open={menuOpen}
    onToggle={(event) => setMenuOpen(event.currentTarget.open)}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }
    }}>
    <summary className="flex select-none items-center gap-4 list-none py-3 pr-0.5 pl-4 text-[15px]">Menu <Menu className="menu-open-icon" size={22} strokeWidth={1.75} aria-hidden="true" /><X className="menu-close-icon" size={22} strokeWidth={1.75} aria-hidden="true" /></summary>
    <nav aria-label="Mobile navigation" onClick={(event) => {
      if ((event.target as Element).closest('a')) setMenuOpen(false);
    }}>
      {nav.map((item) => <a key={item.href} href={item.href} aria-current={path.startsWith(item.href) ? 'page' : undefined}>{item.label}</a>)}
      <Actions />
    </nav>
  </details>;
}
