const mongoose = require('mongoose')
const URI = 'mongodb://localhost:27017/hero-legend'

;(async () => {
  await mongoose.connect(URI)
  const db = mongoose.connection.db
  const userId = 'user-1780910321685'
  const save = await db.collection('saves').findOne({ userId })
  if (!save) { console.log('USER NOT FOUND'); process.exit(1) }
  const all = save.treasures ?? []
  const toDelete = all.filter(t => t.type === 'sub' && (t.starLevel ?? 0) <= 3)
  const toKeep = all.filter(t => !(t.type === 'sub' && (t.starLevel ?? 0) <= 3))
  console.log(`userId=${userId}`)
  console.log(`treasures total = ${all.length}`)
  console.log(`to DELETE (sub & starLevel<=3): ${toDelete.length}`)
  console.log(`to KEEP: ${toKeep.length}`)
  const byStar = {}
  for (const t of toDelete) byStar[t.starLevel] = (byStar[t.starLevel] ?? 0) + 1
  console.log('DELETE breakdown by star:', byStar)
  console.log('sample DELETE items (first 5):')
  console.log(toDelete.slice(0, 5).map(t => ({ id: t.id, name: t.name, type: t.type, starLevel: t.starLevel, count: t.count })))
  const keepKey = {}
  for (const t of toKeep) { const k = `${t.type}-${t.starLevel}`; keepKey[k] = (keepKey[k] ?? 0) + 1 }
  console.log('KEEP breakdown by type-star:', keepKey)
  await mongoose.disconnect()
})().catch(e => { console.error(e); process.exit(1) })
