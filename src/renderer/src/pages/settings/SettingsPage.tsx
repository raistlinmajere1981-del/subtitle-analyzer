import { Archive, Database } from 'lucide-react';
import type { ReactElement } from 'react';
import type { ToolState } from '../../../../shared/archive';

export function SettingsPage({ archivePath, tools }: { archivePath: string; tools: ToolState[] }): ReactElement {
  return (
    <section className="settings-grid">
      <div className="panel">
        <div className="section-heading">
          <Database size={18} />
          <span>Yerel kurulum</span>
        </div>
        <div className="install-list">
          <InstallRow tool="Node.js" version={window.subtitleAnalyzer?.versions.node ?? '24+ onerilir'} state="Hazir" />
          <InstallRow tool="Electron" version={window.subtitleAnalyzer?.versions.electron ?? 'dev'} state="Hazir" />
          {tools.map((tool) => (
            <InstallRow key={tool.tool} tool={tool.tool} version={tool.version} state={tool.state} />
          ))}
          {tools.length === 0 && <InstallRow tool="Sistem araclari" version="Kontrol ediliyor" state="Hata" />}
        </div>
      </div>
      <div className="panel">
        <div className="section-heading">
          <Archive size={18} />
          <span>Arsiv varsayilanlari</span>
        </div>
        <div className="settings-form">
          <label>
            Arsiv klasoru
            <input readOnly value={archivePath || 'Hazirlaniyor'} />
          </label>
          <label>
            Kaynak kapsami
            <input readOnly value="Kanal odakli" />
          </label>
          <label>
            Yenileme modu
            <input readOnly value="Sadece manuel" />
          </label>
          <label>
            Altyazi kapsami
            <input readOnly value="TR + original" />
          </label>
        </div>
      </div>
    </section>
  );
}

function InstallRow({ tool, version, state }: { tool: string; version: string; state: string }): ReactElement {
  return (
    <div className="install-row">
      <span>
        <strong>{tool}</strong>
        <small>{version}</small>
      </span>
      <span className={`ready-chip ${state !== 'Hazir' ? 'warning' : ''}`}>{state}</span>
    </div>
  );
}
