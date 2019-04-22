# EE629_final_project
Test OrbitDB at Scale:

Modify benchmark-replication and benchmark-replication-sender to work at scale
One sender and several receivers
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
