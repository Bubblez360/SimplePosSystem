const ESC = 0x1B
const GS = 0x1D

function bytes(...vals) { return new Uint8Array(vals) }

const CMD = {
  init:       bytes(ESC, 0x40),
  center:     bytes(ESC, 0x61, 0x01),
  left:       bytes(ESC, 0x61, 0x00),
  boldOn:     bytes(ESC, 0x45, 0x01),
  boldOff:    bytes(ESC, 0x45, 0x00),
  doubleSize: bytes(ESC, 0x21, 0x30),
  normalSize: bytes(ESC, 0x21, 0x00),
  feed:       bytes(0x0A),
  cut:        bytes(GS, 0x56, 0x42, 0x00),
}

const enc = new TextEncoder()

function concat(...chunks) {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { out.set(c, offset); offset += c.length }
  return out
}

function padLine(left, right, width = 32) {
  const gap = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(gap) + right
}

let _port = null
let _writer = null

export function isSupported() {
  return 'serial' in navigator
}

export function isPrinterConnected() {
  return !!_writer
}

export async function connectPrinter() {
  if (!isSupported()) throw new Error('Web Serial API not supported')
  _port = await navigator.serial.requestPort()
  await _port.open({ baudRate: 9600 })
  _writer = _port.writable.getWriter()
}

export async function disconnectPrinter() {
  try {
    if (_writer) { _writer.releaseLock(); _writer = null }
    if (_port) { await _port.close(); _port = null }
  } catch (_) { /* ignore */ }
}

export async function printReceipt({ businessName, ref, date, lines, total, method, cashGiven, change, discount, lang }) {
  if (!_writer) return
  const isFil = lang === 'fil'
  const W = 32

  const parts = [
    CMD.init,
    CMD.center,
    CMD.boldOn,
    CMD.doubleSize,
    enc.encode((businessName || 'TindaPOS') + '\n'),
    CMD.normalSize,
    CMD.boldOff,
    enc.encode('--------------------------------\n'),
    CMD.left,
    enc.encode(`Ref: ${ref}\n`),
    enc.encode(`${new Date(date).toLocaleString(isFil ? 'fil-PH' : 'en-PH')}\n`),
    enc.encode(`${isFil ? 'Paraan' : 'Method'}: ${method === 'gcash' ? 'GCash' : 'Cash'}\n`),
    enc.encode('--------------------------------\n'),
  ]

  for (const line of lines) {
    parts.push(enc.encode(padLine(`${line.qty}x ${line.name}`, `P${line.subtotal.toFixed(2)}`, W) + '\n'))
    if (line.addons?.length) parts.push(enc.encode(`  + ${line.addons.join(', ')}\n`))
    if (line.note) parts.push(enc.encode(`  * ${line.note}\n`))
  }

  parts.push(enc.encode('--------------------------------\n'))

  if (discount?.amount > 0) {
    parts.push(enc.encode(padLine(isFil ? 'Diskwento' : 'Discount', `-P${discount.amount.toFixed(2)}`, W) + '\n'))
  }

  parts.push(CMD.boldOn)
  parts.push(enc.encode(padLine(isFil ? 'KABUUAN' : 'TOTAL', `P${total.toFixed(2)}`, W) + '\n'))
  parts.push(CMD.boldOff)

  if (method === 'cash' && cashGiven) {
    parts.push(enc.encode(padLine(isFil ? 'Ibinigay' : 'Cash', `P${parseFloat(cashGiven).toFixed(2)}`, W) + '\n'))
    parts.push(enc.encode(padLine(isFil ? 'Sukli' : 'Change', `P${parseFloat(change).toFixed(2)}`, W) + '\n'))
  }

  parts.push(enc.encode('--------------------------------\n'))
  parts.push(CMD.center)
  parts.push(enc.encode((isFil ? 'Salamat sa inyong pagbili!' : 'Thank you!') + '\n'))
  parts.push(CMD.feed, CMD.feed, CMD.feed, CMD.cut)

  await _writer.write(concat(...parts))
}
