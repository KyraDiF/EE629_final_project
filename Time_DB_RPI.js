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
const ipfs2 = new IPFS(ipfsOptions)

//create OrbitDB instance
ipfs2.on('ready', async () => {
  try {
    const orbitdb2 = new OrbitDB(ipfs2)
    console.log("IPFS instance is ready")

    const db2 = await orbitdb2.eventlog('/orbitdb/QmbWMp5tdkN6JNgc2agotprhXh3iqdzX2Q5BfmKXCegTZE/fourth-database')
    db2.events.on('replicated', () => {
     const result = db2.iterator({ limit: -1 }).collect().map(e => e.payload.value)
     console.log(result)
    })
  } catch (e) {
    console.log(e);
  }
})
