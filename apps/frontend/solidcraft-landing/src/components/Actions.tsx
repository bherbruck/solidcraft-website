import { AppWindow, Download } from 'lucide-react';
import { site } from '../data/site';

export default function Actions({ compact = false }: { compact?: boolean }) {
  return <div className={`actions${compact ? ' compact' : ''}`}>
    <a className="button primary" href="/download/"><Download size={18} strokeWidth={1.5} aria-hidden="true" />{compact ? 'Download' : 'Download SolidCraft'}</a>
    <a className="button secondary" href={site.app}><AppWindow size={18} strokeWidth={1.5} aria-hidden="true" />Try in your browser</a>
  </div>;
}
