import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { getAllItems, getAllCategories, getSetting, seedDefaultData } from './db/db'
import BottomNav from './components/BottomNav'
import StickyBar from './components/StickyBar'
import CheckoutModal from './components/CheckoutModal'
import GCashModal from './components/GCashModal'
import VariantPickerModal from './components/VariantPickerModal'
import ReceiptModal from './components/ReceiptModal'
import InstallPrompt from './components/InstallPrompt'
import ShiftModal from './components/ShiftModal'
import BentaScreen from './screens/BentaScreen'
import MenuScreen from './screens/MenuScreen'
import UlatScreen from './screens/UlatScreen'
import SettingScreen from './screens/SettingScreen'

const GUIDE_URL = 'https://kingnoob3605.github.io/SimplePosSystem/'

function OnboardingModal({ lang, onClose }) {
  function openGuide() {
    window.open(GUIDE_URL, '_blank', 'noopener,noreferrer')
    onClose()
  }
  const isFil = lang === 'fil'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 pb-8">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-amber px-5 pt-5 pb-4">
          <p className="text-2xl font-extrabold text-white leading-tight">
            {isFil ? '👋 Kamusta, boss!' : '👋 Welcome, boss!'}
          </p>
          <p className="text-sm font-semibold text-amber-dark mt-1">
            {isFil ? 'Bago ka pa lang — basahin muna ang guide!' : "You're new here — check out the guide!"}
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {[
            { icon: '🛒', text: isFil ? 'Mag-add ng items sa Menu tab' : 'Add your items in the Menu tab' },
            { icon: '💳', text: isFil ? 'I-upload ang GCash QR mo sa Settings' : 'Upload your GCash QR in Settings' },
            { icon: '📊', text: isFil ? 'Tingnan ang benta mo sa Ulat tab' : 'Track your sales in the Report tab' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
              <p className="text-sm font-semibold text-text">{text}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={openGuide}
            className="w-full h-12 rounded-btn bg-amber text-white font-extrabold text-sm flex items-center justify-center gap-2"
          >
            📖 {isFil ? 'Buksan ang User Guide' : 'Open User Guide'}
          </button>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-btn border border-border text-sm font-bold text-muted"
          >
            {isFil ? 'Sige, gets ko na' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SCREENS = {
  benta: BentaScreen,
  menu: MenuScreen,
  ulat: UlatScreen,
  setting: SettingScreen,
}

export default function App() {
  const { screen, setItems, setCategories, setGcashQR, setLogo, theme, checkoutOpen, gcashOpen, variantPickerItem, receiptOpen, shiftModalOpen, lang } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('hasSeenGuide'))

  useEffect(() => {
    seedDefaultData().then(() => {
      getAllItems().then(setItems)
      getAllCategories().then(setCategories)
    })
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
    getSetting('logo').then(logo => { if (logo) setLogo(logo) })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleCloseOnboarding() {
    localStorage.setItem('hasSeenGuide', '1')
    setShowOnboarding(false)
  }

  const Screen = SCREENS[screen] || BentaScreen

  return (
    <div className="flex flex-col h-full bg-bg">
      <main className="flex-1 overflow-y-auto pb-[136px]">
        <div className="w-full max-w-3xl mx-auto">
          <Screen />
        </div>
      </main>

      {screen === 'benta' && <StickyBar />}
      <BottomNav />

      {variantPickerItem && <VariantPickerModal />}
      {checkoutOpen && <CheckoutModal />}
      {gcashOpen && <GCashModal />}
      {receiptOpen && <ReceiptModal />}
      {shiftModalOpen && <ShiftModal />}
      <InstallPrompt />
      {showOnboarding && <OnboardingModal lang={lang} onClose={handleCloseOnboarding} />}
    </div>
  )
}
