# EE629 Final Project
# OrbitDB Tested at Scale with MQTT Functionality Added

OrbitDB: https://github.com/orbitdb/orbit-db
IPFS: https://ipfs.io/

This code is built off of the benchmark code available on the OrbitDB github. Read below for the changes I made to test OrbitDB with multiple peers across multiple devices and benchmark their performance.

Test OrbitDB at Scale:

First, install these on all devices that you want to test OrbitDB on. Make sure that your node modules folder is in the same directory as your code files:
- Install Node.js
- Install yarn (yarn tends to work better than npm with IPFS and OrbitDB)
- Install IPFS and OrbitDB using yarn
  - yarn add ipfs
  - yarn add orbit-db
-Install other packages necessary for this code to run:
- yarn add ipfsd-ctl
- yarn add p-map-pMapSeries
- yarn add mathjs
- yarn add MQTT

-If you get error "Cannot read property 'toString' of undefined", then do:
- yarn add ipfs@0.33.0

To run code:
- Start sender.js on one devices
- Wait for the prompt "Waiting for peers to connect"
- Then start receiver.js in separate command prompts/separate devices
- Modify the sender.js file for the number of desired receiving peers. Code as-is in this repository is set for two receivers
- If you are having trouble understanding this code/concept, start with the Getting Started code in this repo or on the OrbitDB github
- You will probably run into many errors that you will have to look up as OrbitDB is still under development

-Modify benchmark-replication and benchmark-replication-sender to work at scale
-One sender and several receivers
Changes:
Use MQTT to share the OrbitDB address with all peers. Sender publishes address to ‘orbitdb/connected’

Use math.js to calculate the mean and standard deviation of the query data in both sender and receiver programs.

In the receiver program, use MQTT to publish the mean, standard deviation, and total seconds to ‘orbitdb/data’, which is then read by the sender program.

Use ‘fs’ (node.js package) in sender program to write those metrics to a .csv file

Use shortid package to generate random file paths for ipfs. This is necessary because otherwise, all receiver peers will be attempting to write to the same path.

In both programs, add a peerCount to the ‘peer’ event in db.events.on, so that none of the peers begin querying the database until all are connected

Tried to have sender program start without waiting for peers, but had trouble because the receivers, once connected, did not read from the database from the beginning, only from the point at which they connected.
Add the following addresses in both programs **but make sure ports are different from each peer**:
 Addresses: {
    API: '/ip4/127.0.0.1/tcp/5005'
    Swarm: [
  /dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      "/ip4/0.0.0.0/tcp/4005",
      "/ip6/::/tcp/4005"
    ]
  },

Enable relay hop on the receiver program

**Can use docker to deploy hundreds of receiver nodes on AWS or similar
