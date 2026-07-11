import { useRef, useState, type ChangeEvent } from 'react'
import { Download, HardDrive, LoaderCircle, Upload, X } from 'lucide-react'
import type {
  CampaignPackage,
  CampaignPackageImportReport,
} from '../../../../shared/types/campaign-package'
import { authHeaders } from '../auth/session-storage'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export function BackupRestoreControl({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [report, setReport] = useState<CampaignPackageImportReport | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function downloadBackup() {
    setBusy(true)
    setStatus('')
    setReport(null)

    try {
      const response = await fetch(
        `${API_URL}/campaigns/${encodeURIComponent(campaignId)}/package/export`,
        {
          credentials: 'include',
          headers: authHeaders(),
        },
      )
      if (!response.ok) throw new Error('No se pudo crear el respaldo')
      const campaignPackage = (await response.json()) as CampaignPackage
      const blob = new Blob([JSON.stringify(campaignPackage, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${slugify(campaignPackage.manifest.campaignName)}-backup-v${campaignPackage.schemaVersion}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setStatus('Respaldo creado')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo crear el respaldo')
    } finally {
      setBusy(false)
    }
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setStatus('')
    setReport(null)

    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('El respaldo excede 8 MB')
      }
      const campaignPackage = JSON.parse(await file.text()) as unknown
      const response = await fetch(`${API_URL}/campaign-packages/import`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 1,
          mode: 'apply-copy',
          package: campaignPackage,
          requestId: crypto.randomUUID(),
        }),
      })
      const nextReport = (await response.json()) as CampaignPackageImportReport
      setReport(nextReport)
      if (!response.ok || !nextReport.ok) {
        throw new Error(
          nextReport.issues.find((issue) => issue.severity === 'error')?.message ??
            'El respaldo no es valido',
        )
      }
      setStatus('Copia restaurada')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo restaurar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="icon-button"
        title="Respaldos"
        aria-label="Respaldos"
        onClick={() => setOpen(true)}
      >
        <HardDrive size={18} />
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="backup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-title"
          >
            <header>
              <div>
                <span className="eyebrow">Campaña</span>
                <h2 id="backup-title">Respaldos</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="backup-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => void downloadBackup()}
              >
                {busy ? <LoaderCircle className="is-spinning" size={18} /> : <Download size={18} />}
                Exportar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={18} />
                Restaurar copia
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => void restoreBackup(event)}
              />
            </div>

            {status ? <p className="backup-status" role="status">{status}</p> : null}
            {report?.appliedResources?.campaignId ? (
              <dl className="backup-report">
                <div>
                  <dt>ID</dt>
                  <dd>{report.appliedResources.campaignId}</dd>
                </div>
                <div>
                  <dt>Assets</dt>
                  <dd>{report.counts?.assets ?? 0}</dd>
                </div>
                <div>
                  <dt>Sesiones</dt>
                  <dd>{report.counts?.sessions ?? 0}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  )
}

function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'campaign'
  )
}
