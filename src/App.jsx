import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { getAllItems, getAllCategories, getSetting, seedDefaultData } from './db/db'
import BottomNav from './components/BottomNav'
import StickyBar from './components/StickyBar'
import CheckoutModal from './components/CheckoutModal'
import GCashModal from './components/GCashModal'
import VariantPickerModal from './components/VariantPickerModal'
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
  const { screen, setItems, setCategories, setGcashQR, checkoutOpen, gcashOpen, variantPickerItem } = useStore()

  useEffect(() => {
    seedDefaultData().then(() => {
      getAllItems().then(setItems)
      getAllCategories().then(setCategories)
    })
    getSetting('gcashQR').then(qr => { if (qr) setGcashQR(qr) })
  }, [])

  const Screen = SCREENS[screen] || BentaScreen

  return (
    <div className="flex flex-col h-full bg-bg">
      <main className="flex-1 overflow-y-auto pb-[136px]">
        <Screen />
      </main>

      {screen === 'benta' && <StickyBar />}
      <BottomNav />

      {variantPickerItem && <VariantPickerModal />}
      {checkoutOpen && <CheckoutModal />}
      {gcashOpen && <GCashModal />}
    </div>
  )
}
