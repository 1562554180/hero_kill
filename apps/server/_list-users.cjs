const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/hero-legend').then(async () => {
  const db = mongoose.connection.db
  const users = await db.collection('savedocs').find({}, { projection: { userId: 1, _id: 0 } }).toArray()
  console.log('all userIds:')
  for (const u of users) console.log(' ', u.userId)
  console.log(`total: ${users.length}`)
  await mongoose.disconnect()
}).catch(e => { console.error(e); process.exit(1) })
