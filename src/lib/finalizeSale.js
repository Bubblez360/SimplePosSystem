import { useStore } from '../store/useStore'
import { recordSale, getAllItems } from '../db/db'
import { printReceipt, isPrinterConnected } from '../utils/printer'
import { t } from '../i18n'

// Shared tail of the cash and GCash payment paths: persist the sale, print,
// reset the cart, and show the receipt. Throws if the sale could not be saved
// so the caller can keep the order on screen and let the vendor retry.
export async function finalizeSale(saleData, { cashGiven = '', change = 0 } = {}) {
  const sale = await recordSale(saleData)

  const s = useStore.getState()
  const receipt = {
    id: sale.id,
    ref: sale.ref,
    orderNo: sale.orderNo,
    date: sale.date,
    lines: saleData.lines,
    total: saleData.total,
    method: saleData.method,
    cashGiven,
    change,
    discount: saleData.discount,
  }

  if (isPrinterConnected()) {
    printReceipt({ ...receipt, businessName: s.businessName, lang: s.lang })
      .catch(() => useStore.getState().showToast(t('printFailed', s.lang), 'warn'))
  }

  s.clearCart()
  s.setCheckoutOpen(false)
  s.setGcashOpen(false)
  s.setLastSale(receipt)
  s.setReceiptOpen(true)

  // Stock was decremented in IndexedDB; refresh the catalog so badges and the
  // oversell guard see the new numbers instead of the stale in-memory copy.
  getAllItems().then(items => useStore.getState().setItems(items))
  return sale
}
