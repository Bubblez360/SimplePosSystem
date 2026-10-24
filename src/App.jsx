import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { getAllItems, getAllCategories, getSetting, seedDefaultData } from './db/db'
import { initAutoSync } from './lib/sync'
import { t } from './i18n'
import BottomNav from './components/BottomNav'
import CartBar from './components/cart/CartBar'
import CheckoutModal from './components/CheckoutModal'
import GCashModal from './components/GCashModal'
import VariantPickerModal from './components/VariantPickerModal'
import InstallPrompt from './components/InstallPrompt'
import ShiftModal from './components/ShiftModal'
import HelpModal from './components/HelpModal'
import OnboardingModal from './components/OnboardingModal'
import Toast from './components/Toast'
import BentaScreen from './screens/BentaScreen'
import MenuScreen from './screens/MenuScreen'
import UlatScreen from './screens/UlatScreen'
import SettingScreen from './screens/SettingScreen'

// Receipt pulls in the Lottie runtime; load it on first sale, not at startup.
const ReceiptModal = lazy(() => import('./components/ReceiptModal'))

const SCREENS = {
  benta: BentaScreen,
  menu: MenuScreen,
  ulat: UlatScreen,
  setting: SettingScreen,
}

export default function App() {
  const screen = useStore(s => s.screen)
  const theme = useStore(s => s.theme)
  const lang = useStore(s => s.lang)
  const showToast = useStore(s => s.showToast)
  const setItems = useStore(s => s.setItems)
  const setCategories = useStore(s => s.setCategories)
  const setGcashQR = useStore(s => s.setGcashQR)
  const setLogo = useStore(s => s.setLogo)
  const checkoutOpen = useStore(s => s.checkoutOpen)
  const gcashOpen = useStore(s => s.gcashOpen)
  const variantPickerItem = useStore(s => s.variantPickerItem)
  const receiptOpen = useStore(s => s.receiptOpen)
  const shiftModalOpen = useStore(s => s.shiftModalOpen)
  const helpOpen = useStore(s => s.helpOpen)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('hasSeenGuide'))

  useEffect(() => {
    seedDefaultData()
      .then(() => Promise.all([getAllItems().then(setItems), getAllCategories().then(setCategories)]))
      .catch(() => showToast(t('storageError', lang), 'error')) // e.g. private mode: app opens, empty
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) }).catch(() => {})
    getSetting('logo').then(logo => { if (logo) setLogo(logo) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at startup
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181513' : '#F59E0B')
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang === 'eng' ? 'en' : 'fil'
  }, [lang])

  // Auto-sync unsynced sales to the cloud when online / refocused / periodically.
  useEffect(() => initAutoSync(), [])

  function handleCloseOnboarding() {
    localStorage.setItem('hasSeenGuide', '1')
    setShowOnboarding(false)
  }

  const Screen = SCREENS[screen] || BentaScreen

  return (
    <div className="h-full bg-bg text-text">
      <main
        id="main"
        key={screen}
        className={`h-full overflow-y-auto overscroll-contain lg:pl-[88px] ${
          screen === 'benta' ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:overflow-hidden' : 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0'
        }`}
      >
        <div className={screen === 'benta' ? 'lg:h-full' : 'w-full max-w-2xl lg:max-w-3xl mx-auto'}>
          <Screen />
        </div>
      </main>

      {screen === 'benta' && <CartBar />}
      <BottomNav />
      <Toast />

      {variantPickerItem && <VariantPickerModal />}
      {checkoutOpen && <CheckoutModal />}
      {gcashOpen && <GCashModal />}
      {receiptOpen && <Suspense fallback={null}><ReceiptModal /></Suspense>}
      {shiftModalOpen && <ShiftModal />}
      {helpOpen && <HelpModal />}
      <InstallPrompt />
      {showOnboarding && <OnboardingModal lang={lang} onClose={handleCloseOnboarding} />}
    </div>
  )
}
