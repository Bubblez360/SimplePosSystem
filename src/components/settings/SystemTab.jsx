import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { exportAllData, importAllData } from '../../db/db'
import { connectPrinter, disconnectPrinter, isSupported as printerSupported } from '../../utils/printer'
import { t } from '../../i18n'
import Icon from '../Icon'
import { GUIDE_URL } from '../HelpModal'
import PremiumCard from './PremiumCard'
import { SectionLabel, SettingGroup, SettingRow, SegControl } from './rows'

export default function SystemTab() {
  const lang = useStore(s => s.lang)
  const setLang = useStore(s => s.setLang)
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const currentShift = useStore(s => s.currentShift)
  const setShiftModalOpen = useStore(s => s.setShiftModalOpen)
  const printerConnected = useStore(s => s.printerConnected)
  const setPrinterConnected = useStore(s => s.setPrinterConnected)
  const setHelpOpen = useStore(s => s.setHelpOpen)
  const showToast = useStore(s => s.showToast)
  const [restoring, setRestoring] = useState(false)
  const isFil = lang === 'fil'

  async function handleExport() {
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tindapos-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast(t('backupSuccess', lang))
    } catch {
      showToast(isFil ? 'Hindi ma-export ang backup.' : 'Export failed.', 'error')
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !window.confirm(t('importConfirm', lang))) return
    setRestoring(true)
    try {
      await importAllData(JSON.parse(await file.text()))
      showToast(t('restoreSuccess', lang))
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      showToast(t('restoreError', lang), 'error')
      setRestoring(false)
    }
  }

  async function handleConnectPrinter() {
    try {
      await connectPrinter()
      setPrinterConnected(true)
      showToast(isFil ? 'Printer nakakonekta!' : 'Printer connected!')
    } catch (err) {
      if (err?.name === 'NotFoundError') return // user closed the picker
      showToast(
        isFil
          ? 'Hindi makonekta sa printer. Siguraduhing naka-on, nakakonekta, at hindi ginagamit ng ibang app.'
          : "Couldn't connect. Make sure the printer is on, paired, and not in use by another app.",
        'error',
      )
    }
  }

  const printerSub = !printerSupported()
    ? t('noPrinterSupport', lang)
    : printerConnected ? t('printerConnected', lang) : isFil ? 'Walang koneksyon' : 'Not connected'

  return (
    <div>
      <div className="mt-4"><PremiumCard /></div>

      <SectionLabel>{isFil ? 'Operasyon' : 'Operations'}</SectionLabel>
      <SettingGroup>
        <SettingRow
          icon="clock"
          tone="amber"
          label="Shift"
          sub={currentShift
            ? `${isFil ? 'Bukas mula' : 'Open since'} ${new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : isFil ? 'Walang bukas na shift' : 'No open shift'}
          right={
            <button type="button" onClick={() => setShiftModalOpen(true)} className={currentShift ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
              {currentShift ? t('closeShift', lang) : t('openShift', lang)}
            </button>
          }
        />
        <SettingRow
          icon="printer"
          tone={printerConnected ? 'green' : 'muted'}
          label="Receipt Printer"
          sub={printerSub}
          right={printerSupported() && (
            printerConnected ? (
              <button type="button" className="btn-secondary btn-sm !border-green !text-green" onClick={async () => { await disconnectPrinter(); setPrinterConnected(false) }}>
                {t('disconnectPrinter', lang)}
              </button>
            ) : (
              <button type="button" className="btn-secondary btn-sm" onClick={handleConnectPrinter}>
                {isFil ? 'Ikonekta' : 'Connect'}
              </button>
            )
          )}
        />
      </SettingGroup>

      <SectionLabel>Display</SectionLabel>
      <SettingGroup>
        <SettingRow
          icon={theme === 'dark' ? 'moon' : 'sun'}
          tone="amber"
          label={t('theme', lang)}
          right={<SegControl label={t('theme', lang)} options={[['light', t('lightMode', lang)], ['dark', t('darkMode', lang)]]} value={theme} onChange={setTheme} />}
        />
        <SettingRow
          icon="globe"
          label={t('language', lang)}
          right={<SegControl label={t('language', lang)} options={[['fil', 'Filipino'], ['eng', 'English']]} value={lang} onChange={setLang} />}
        />
      </SettingGroup>

      <SectionLabel>Data</SectionLabel>
      <SettingGroup>
        <SettingRow
          icon="upload"
          tone="green"
          label={t('exportBackup', lang)}
          sub={isFil ? 'I-download bilang .json file' : 'Download as .json file'}
          right={<Icon name="chevron-right" size={18} className="text-faint" />}
          onClick={handleExport}
        />
        <label className={`flex items-center gap-3 px-4 py-3 min-h-[60px] cursor-pointer hover:bg-surface-2/70 transition-colors ${restoring ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="w-10 h-10 rounded-xl bg-surface-2 text-muted flex items-center justify-center shrink-0"><Icon name="download" size={20} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold">{restoring ? (isFil ? 'Nire-restore…' : 'Restoring…') : t('importBackup', lang)}</span>
            <span className="block text-[12px] text-muted mt-0.5">{isFil ? 'Palitan lahat ng data' : 'Replace all local data'}</span>
          </span>
          <Icon name="chevron-right" size={18} className="text-faint" />
          <input type="file" accept=".json,application/json" className="sr-only" onChange={handleImport} disabled={restoring} />
        </label>
        <SettingRow
          icon="help"
          label={isFil ? 'Tulong' : 'Help'}
          sub={isFil ? 'Mga madalas na tanong' : 'Frequently asked questions'}
          right={<Icon name="chevron-right" size={18} className="text-faint" />}
          onClick={() => setHelpOpen(true)}
        />
        <SettingRow
          icon="book"
          label="User Guide"
          sub={isFil ? 'Buksan sa browser' : 'Open in browser'}
          right={<Icon name="chevron-right" size={18} className="text-faint" />}
          href={GUIDE_URL}
        />
      </SettingGroup>
    </div>
  )
}
