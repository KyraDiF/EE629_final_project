//******************************************************************************************
//OrbitDB Benchmarking Replication -- code for "receiver"
//https://github.com/orbitdb/orbit-db/blob/master/benchmarks/benchmark-replication.js
//******************************************************************************************

'use strict'

const IPFS = require('ipfs')
const IPFSRepo = require('ipfs-repo')
const DatastoreLevel = require('datastore-level')
const OrbitDB = require('orbit-db')
const startIpfs = require('./node_modules/orbit-db/test/utils/start-ipfs')
const pMapSeries = require('p-map-series')
const mathjs = require('mathjs')
const shortid = require('shortid')
const mqtt = require('mqtt')
const mqclient = mqtt.connect('mqtt://broker.hivemq.com')


// //A universal counter that will exit the program after a certain amount of time
// setInterval(function() {
//   universalCount ++
//   if(universalCount === 600) {
//       console.log('Maximum timeout!');
//       endProgram(queryArray, metrics2, fileName)
//       process.exit(1)
//   }
// },1000)

mqclient.on('connect', () => {
  console.log("mqtt connected");
  mqclient.subscribe('orbitdb/connected', [], () => {
    console.log('Subscribed to address topic');
  })
})

//*******************
//IPFS Configurations
//*******************
const ipfsConf = {
  Addresses: {
     API: '/ip4/127.0.0.1/tcp/5001',
    // Gateway: '/ip4/0.0.0.0/tcp/0'
    Swarm: [
      '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
       "/ip4/0.0.0.0/tcp/4001",
       "/ip6/::/tcp/4001"
    ]
  },
  Bootstrap: [],
  Discovery: {
    MDNS: {
      Enabled: true,
      Interval: 1
    },
  },
  Swarm: {
    EnableRelayHop: true
  }
}

const repoConf = {
  storageBackends: {
    blocks: DatastoreLevel,
  },
}

const defaultConfig = Object.assign({}, {
  start: true,
  EXPERIMENTAL: {
    pubsub: true
  },
  config: ipfsConf
})

const conf2 = Object.assign({}, defaultConfig, {
  repo: new IPFSRepo('./orbitdb/benchmarks/replication/client22faf/ipfs', repoConf)
})

//******************************
//Define variables and constants
//******************************

// Metrics
let metrics2 = {
  totalQueries: 0,
  seconds: 0,
  queriesPerSecond: 0,
  lastTenSeconds: 0,
}

const database = 'benchmark-replication'
const updateCount = 8000
var queryArray = []
let peerCount = 0
const minReceiverNodes = 10
let address = ''
//let universalCount = 0

//**************
//Main Function
//*************

// Start
console.log("Starting IPFS daemons...")

pMapSeries([conf2], d => startIpfs('js-ipfs', d))
  .then(async ([ipfs2]) => {
    try {
      await new Promise(function(resolve, reject) {
        mqclient.on('message', (topic, message) => {
          const timeout = setInterval(function() {
            if(topic === 'orbitdb/connected') {
              address = message.toString()
              //console.log('connected')
              clearInterval(timeout)
              //mqclient.end()
              resolve();
            }
          },100)
        })
      })
      // Create the databases
      var fileName = shortid.generate()
      const orbit2 = new OrbitDB(ipfs2.api, `./orbitdb/benchmarks/replication/${fileName}`)

      //await waitForAddress()

      //read address from address.json
      //const address = fs.readFileSync('address.json')
      var connected = false

      console.log(address.toString());
      const db2 = await orbit2.eventlog(address)
      await db2.load()


      let db2Connected = false
      let writerConnected = false

      console.log('Waiting for peers to connect...')

      db2.events.on('peer', () => {
        peerCount++
        if (peerCount >= minReceiverNodes) {
            db2Connected = true
            console.log('All peers connected')
        }
      })


      const startInterval = setInterval(() => {
        if (db2Connected) {
          clearInterval(startInterval)
          // Metrics output for the reader
          let prevCount = 0
          const timer = setInterval(() => {
            try {
              metrics2.totalQueries = db2._oplog.length
              metrics2.queriesPerSecond = metrics2.totalQueries - prevCount
              metrics2.lastTenSeconds += metrics2.queriesPerSecond
              prevCount = metrics2.totalQueries

              queryArray.push(metrics2.queriesPerSecond)

              outputMetrics("READ", db2, metrics2, orbit2)

              if (db2._oplog.length === updateCount) {
                endProgram(queryArray, metrics2, fileName)
                orbit2.stop()
                console.log('Exiting OrbitDB');
                clearInterval(timer)
                //process.exit(0)
              }
            } catch (e) {
              console.error(e)
            }
          }, 1000)
        }
      }, 100)
    } catch (e) {
      console.log(e)
      process.exit(1)
    }
  })

//**********
//Functions
//*********

// Metrics output function
const outputMetrics = (name, db, metrics, orbit) => {
    metrics.seconds ++
    console.log(`[${name}] ${metrics.queriesPerSecond} queries per second, ${metrics.totalQueries} queries in ${metrics.seconds} seconds (Oplog: ${db._oplog.length})`)
    metrics.queriesPerSecond = 0

    if(metrics.seconds % 10 === 0) {
      console.log(`[${name}] --> Average of ${metrics.lastTenSeconds/10} q/s in the last 10 seconds`)
      if(metrics.lastTenSeconds === 0){
        throw new Error("No longer receiving queries")
      }
      metrics.lastTenSeconds = 0
    }
}


//Read address of OrbitDB from file written by sender
// function waitForAddress () {
//   return new Promise(function(resolve, reject) {
//     const timeout = setInterval(function() {
//       const fileExists = fs.existsSync('address.json')
//       if (fileExists) {
//         console.log('OrbitDB address found');
//         clearInterval(timeout)
//         resolve();
//       }
//     },100)
//   })
// }

//Run when all queries are read OR when program times out
function endProgram (array, metrics, fileName) {
  console.log(`Average queries/second: ${mathjs.mean(array).toFixed(3)}`)
  console.log(`Standard Deviation: ${mathjs.std(array).toFixed(3)}`)
  console.log(`in ${metrics.seconds} seconds`);
  console.log("Finished")
  // fs.appendFileSync('metrics.csv', `Average queries/second:, ${mathjs.mean(array).toFixed(3)},`, (err) => {
  //   if (err) throw err
  // })
  // fs.appendFileSync('metrics.csv', `Standard Deviation:, ${mathjs.std(array).toFixed(3)},`, (err) => {
  //   if (err) throw err;
  // })
  // fs.appendFileSync('metrics.csv', `Time (seconds):, ${metrics.seconds}, \n`, (err) => {
  //   if (err) throw err;
  // })


  mqclient.publish('orbitdb/data', `${fileName}: Average queries/second:, ${mathjs.mean(array).toFixed(3)},`,()=>{
    console.log('average published');
  })
  mqclient.publish('orbitdb/data', `${fileName}: Standard Deviation:, ${mathjs.std(array).toFixed(3)},`,()=>{
    console.log('standard deviation published');
  })
  mqclient.publish('orbitdb/data', `${fileName}: Time (seconds):, ${metrics.seconds}, \n`,()=>{
    console.log('seconds published');
  })

  //process.exit(0)
}
