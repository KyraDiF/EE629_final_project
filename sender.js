//******************************************************************************************
//OrbitDB Benchmarking Replication at Scale-- code for sender
//Based on:
//https://github.com/orbitdb/orbit-db/blob/master/benchmarks/benchmark-replication-sender.js
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

const fs = require('fs')

mqclient.on('connect', () => {
  console.log("mqtt connected");
  mqclient.subscribe('orbitdb/data', [], () => {
    console.log('Subscribed to data topic');
  })
})

mqclient.on('message', (topic, message) => {
  if(topic === 'orbitdb/data') {
    console.log('metric received');
    fs.appendFileSync('metrics.csv', message, (err) => {
      if (err) throw err
    })
  }
})


//*******************
//IPFS Configurations
//*******************

const ipfsConf = {
  Addresses: {
    API: '/ip4/127.0.0.1/tcp/5005',
    // Swarm: ['/ip4/0.0.0.0/tcp/0'],
    // Gateway: '/ip4/0.0.0.0/tcp/7654'
    Swarm: [
      '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      "/ip4/0.0.0.0/tcp/4005",
      "/ip6/::/tcp/4005"
    ]
  },
  Bootstrap: [],
  Discovery: {
    MDNS: {
      Enabled: true,
      Interval: 1
    }
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

const conf1 = Object.assign({}, defaultConfig, {
  repo: new IPFSRepo('./orbitdb/benchmarks/replication/client1/ipfs', repoConf)
})

//******************************
//Define variables and constants
//******************************

// Metrics
let metrics1 = {
  totalQueries: 0,
  seconds: 0,
  queriesPerSecond: 0,
  lastTenSeconds: 0,
}

const database = 'benchmark-replication'
const updateCount = 8000
var queryArray = []
const minReceiverNodes = 10;
let peerCount = 0;

//**************
//Main Function
//*************

// Start
console.log("Starting IPFS daemons...")

pMapSeries([conf1,], d => startIpfs('js-ipfs', d))
  .then(async ([ipfs1]) => {
    try {
      // Create the databases
      var fileName = shortid.generate()
      const orbit1 = new OrbitDB(ipfs1.api, `./orbitdb/benchmarks/replication/${fileName}`)
      const db1 = await orbit1.eventlog(database, { overwrite: true })
      //fs.writeFileSync('address.json', db1.address)

      setInterval(function() {
        mqclient.publish('orbitdb/connected', db1.address.toString(),()=>{
          //console.log('message',db1.address.toString(),'published')
        })
      },100)

      let db1Connected = false

      console.log('Waiting for peers to connect...')

      db1.events.on('peer', () => {
        peerCount++;
        console.log(`${peerCount} peers connected`)
        if (peerCount >= minReceiverNodes) {
            db1Connected = true
            console.log('Starting....')
        }
      })

      const startInterval = setInterval(() => {
        if (db1Connected) {
          clearInterval(startInterval)
          // Start the write loop
          queryLoop(db1)

          // Metrics output for the writer, once/sec
          const writeInterval = setInterval(() => {
            outputMetrics("WRITE", db1, metrics1, orbit1)
            if (metrics1.totalQueries === updateCount) {
              clearInterval(writeInterval)
              endProgram(queryArray,orbit1,metrics1)
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

// Write loop
const queryLoop = async (db) => {
  if (metrics1.totalQueries < updateCount) {
    try {
      await db.add(metrics1.totalQueries)
    } catch (e) {
        console.error(e)
    }
    metrics1.totalQueries ++
    metrics1.lastTenSeconds ++
    metrics1.queriesPerSecond ++
    setImmediate(() => queryLoop(db))
  }
}

// Metrics output function
const outputMetrics = (name, db, metrics) => {
    queryArray.push(metrics1.queriesPerSecond)
    metrics.seconds ++
    console.log(`[${name}] ${metrics.queriesPerSecond} queries per second, ${metrics.totalQueries} queries in ${metrics.seconds} seconds (Oplog: ${db._oplog.length})`)
    metrics.queriesPerSecond = 0

    if(metrics.seconds % 10 === 0) {
      console.log(`[${name}] --> Average of ${metrics.lastTenSeconds/10} q/s in the last 10 seconds`)
      metrics.lastTenSeconds = 0
    }
}

//Run when all queries are read
function endProgram (array,orbit,metrics) {
  console.log(`Average queries/second: ${mathjs.mean(array).toFixed(3)}`)
  console.log(`Standard Deviation: ${mathjs.std(array).toFixed(3)}`)
  console.log("Finished")
  fs.appendFileSync('metrics.csv', `Sender Average queries/second:, ${mathjs.mean(array).toFixed(3)},`, (err) => {
    if (err) throw err
  })
  fs.appendFileSync('metrics.csv', `Sender Standard Deviation:, ${mathjs.std(array).toFixed(3)},`, (err) => {
    if (err) throw err
  })
  fs.appendFileSync('metrics.csv', `Sender Time (seconds):, ${metrics.seconds}, \n`, (err) => {
    if (err) throw err;
  })
  orbit.stop()
  console.log('Exiting OrbitDB');
  // fs.unlink('address.json', (err) => {
  //   if (err) throw err;
  // });
  //process.exit(0) //DON'T EXIT b/c readers are still reading and in OrbitDB, at least one node needs to always be online
}
