import { useEffect } from 'react';
import { useStore } from 'zustand';
import { architectures, filterArtifacts, formatBytes, platforms } from '../lib/download-utils';
import { useRelease } from '../lib/use-release';
import { downloadStore } from '../stores/downloads';

export default function DownloadSelector() {
  const { artifacts, notes } = useRelease();
  const { filters: { platform, architecture, kind }, ready, enable, setFilter, resetFilters } = useStore(downloadStore);
  useEffect(enable, [enable]);
  const filtered = filterArtifacts(artifacts, { platform, architecture, kind });
  const kinds = [...new Set(artifacts.map((a) => a.kind))];
  return <>
    <div className="download-filters" aria-label="Filter downloads">
      <div className="filter-field"><label htmlFor="download-platform">Platform</label><select id="download-platform" value={platform} disabled={!ready} onChange={(e) => setFilter('platform', e.target.value)}><option value="">All platforms</option>{platforms.map((p) => <option key={p}>{p}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="download-architecture">Architecture</label><select id="download-architecture" value={architecture} disabled={!ready} onChange={(e) => setFilter('architecture', e.target.value)}><option value="">All architectures</option>{architectures.map((a) => <option key={a}>{a}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="download-kind">Package format</label><select id="download-kind" value={kind} disabled={!ready} onChange={(e) => setFilter('kind', e.target.value)}><option value="">All formats</option>{kinds.map((k) => <option key={k}>{k}</option>)}</select></div>
    </div>
    <div className="filter-status"><p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'package' : 'packages'}{platform ? ` for ${platform}` : ' across all platforms'}</p>{ready && (platform || architecture || kind) && <button type="button" className="filter-reset" onClick={resetFilters}>Reset filters</button>}</div>
    <div className="package-grid" aria-label="Available packages">
      {filtered.map((a) => <article className="package" key={a.id}>
        <div className="package-top"><span className="package-platform">{a.platform}</span><span className="package-arch">{a.architecture}</span></div>
        <h3>{a.kind}</h3><p className="package-size">{formatBytes(a.bytes)}{a.cli === 'yes' ? ' · CLI only' : ''}</p>
        <a className="button secondary" href={a.url} aria-label={`Download ${a.platform} ${a.architecture} ${a.kind} — ${a.name}`}>Download {a.kind} <span aria-hidden="true">↓</span></a>
        <p className="package-filename mono">{a.name}</p>
        <details><summary>Verification & package details</summary><p>Signing: {a.signing === 'unsigned' ? 'unsigned, per upstream documentation' : 'not independently verified'}.</p><p>CLI: {a.cli === 'yes' ? 'included in this CLI package' : 'check the installation guide for this package'}.</p>{a.digest ? <><p>SHA-256 from GitHub release metadata:</p><code>{a.digest.slice(7)}</code><p>A checksum is not a publisher signature.</p></> : <p>No checksum was provided in the release metadata.</p>}</details>
      </article>)}
    </div>
    {filtered.length === 0 && <div className="empty-state"><h3>No matching package.</h3><p>No package matches this selection. Choose another format or <a href={notes}>view the releases</a>.</p></div>}
  </>;
}
