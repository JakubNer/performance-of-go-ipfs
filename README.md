# Benchmark

Benchmark to see performance of go-ipfs 'files' API relative to overhead of the transport.

Compare compact byte stream websocket requests to this [server.js](./server.js) hosted in a Docker container running at DigitalOcean where the container saves off the data:

1. in memory only
1. on file system volume
1. via IPFS *files* API on file system volume

The desire is to see if it's worth adding complexity on top of just using the IPFS APIs for buffering writes.  If the 
overhead of using IPFS *files* directly is relatively small, no need to add complexity.

# Configuration

The [server.js](./server.js), [driver.js](./driver.js), and [client.js](./client.js) use the same configuration points.

The configuration can be set using environment variables or using `npm config` commands (see *package.json/config* ).

| *Configuration Point* | *Description* | *Sample Value* |
| --- | --- | --- |
| URI | connection URI | ws://localhost |
| PORT | connection port | 8888 |
| USERNAME | basic-auth credential enforced by server.js |  |
| PASSWORD | basic-auth credential enforced by server.js |  |
| FOLDER | temp file folder for filesystem tests | ./tmp |

# Running Benchmark



# Results

```
```

# Running Dev Server Locally

(for benchmark development)

```
npm install
npm run server.js
```

## Logging

For local testing--not benchmark--you can enable debug logging:

```
${env:DEBUG}='server*'
```

# Running Dev Test Client

(for benchmark development)
