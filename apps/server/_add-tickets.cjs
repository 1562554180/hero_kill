const mongoose = require('mongoose')
const USER_ID = process.argv[2]
const AMOUNT = parseInt(process.argv[3] || '500', 10)
if (!USER_ID) { console.error('usage: node _add-tickets.cjs <userId> [amount]'); process.exit(1) }
mongoose.connect('mongodb://localhost:27017/hero-legend').then(async () => {
  const col = mongoose.connection.db.collection('savedocs')
  const doc = await col.findOne({ userId: USER_ID })
  if (!doc) { console.error('user not found:', USER_ID); process.exit(1) }
  const has = (doc.materials || []).some(m => m.type === 'treasureTicket')
  if (has) {
    await col.updateOne({ userId: USER_ID, 'materials.type': 'treasureTicket' }, { $inc: { 'materials.$.amount': AMOUNT } })
  } else {
    await col.updateOne({ userId: USER_ID }, { $push: { materials: { type: 'treasureTicket', amount: AMOUNT } } })
  }
  const fresh = await col.findOne({ userId: USER_ID })
  const amt = (fresh.materials || []).find(m => m.type === 'treasureTicket')?.amount ?? 0
  console.log(`OK ${USER_ID}: +${AMOUNT} → ${amt}`)
  await mongoose.disconnect()
}).catch(e => { console.error(e); process.exit(1) })
