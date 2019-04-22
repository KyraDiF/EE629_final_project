//************************************
//OrbitDB Getting started test program
//************************************

const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

//turn on Pubsub feature
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  },
}

//create IPFS instance
const ipfs = new IPFS(ipfsOptions)

//create OrbitDB instance
ipfs.on('ready', async () => {
  try {
    const orbitdb = new OrbitDB(ipfs)
    console.log("IPFS instance is ready")
    const db = await orbitdb.eventlog('first-database')
    console.log('Address of the database: ' + db.address.toString())
    ///orbitdb/QmTbXdtoHJ2mrA5R3tdecbV4re9e7MyxDhRZ98sXKriVtB/first-database
    const hash = await db.add({name: 'User1'})
    const result = await db.get(hash)
    console.log(result.payload.value);
  } catch (e) {
    console.log(e);
  }
})
