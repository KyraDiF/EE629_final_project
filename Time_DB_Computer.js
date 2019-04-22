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
  config: {
      Addresses: {
        Swarm: [
          // Use IPFS dev signal server
          // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          // Use local signal server
          // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
        ]
      }
    }
}

//create IPFS instance
const ipfs = new IPFS(ipfsOptions)

//create OrbitDB instance
ipfs.on('ready', async () => {
  try {
    const orbitdb = new OrbitDB(ipfs)
    console.log("IPFS instance is ready")
    const db = await orbitdb.eventlog('fourth-database')
    console.log('Address of the database: ' + db.address.toString())
    ///orbitdb/QmbWMp5tdkN6JNgc2agotprhXh3iqdzX2Q5BfmKXCegTZE/fourth-database
    setInterval(async () => {
     await db.add({ time: new Date().getTime() })
    }, 1000)
  } catch (e) {
    console.log(e);
  }
})
