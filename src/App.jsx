import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { getAllItems } from './db/db'
import { getSetting } from './db/db'
import BottomNav from './components/BottomNav'
import StickyBar from './components/StickyBar'
import CheckoutModal from './components/CheckoutModal'
import GCashModal from './components/GCashModal'
import BentaScreen from './screens/BentaScreen'
import MenuScreen from './screens/MenuScreen'
import UlatScreen from './screens/UlatScreen'
import SettingScreen from './screens/SettingScreen'

const SCREENS = {
  benta: BentaScreen,
  menu: MenuScreen,
  ulat: UlatScreen,
  setting: SettingScreen,
}

export default function App() {
  const { screen, setItems, setGcashQR, checkoutOpen, gcashOpen } = useStore()

  useEffect(() => {
    getAllItems().then(setItems)
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
  }, [])

  const Screen = SCREENS[screen] || BentaScreen

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Main scrollable area */}
      <main className="flex-1 overflow-y-auto pb-[136px]">
        <Screen />
      </main>

      {/* Always-visible UI */}
      {screen === 'benta' && <StickyBar />}
      <BottomNav />

      {/* Modals */}
      {checkoutOpen && <CheckoutModal />}
      {gcashOpen && <GCashModal />}
    </div>
  )
}
