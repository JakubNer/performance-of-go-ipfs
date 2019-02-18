# Benchmark

Benchmark to see performance of go-ipfs 'files' API relative to overhead of the transport.

Compare compact byte stream websocket requests to this [server.js](./server.js) hosted in a Docker container where the container saves off the data:

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
| IPFS_HOST | hostname of IPFS service | localhost |
| IPFS_PORT | port number of IPFS service | 5001 |

# Running Benchmark

## With Docker

`npm run compose`

`npm run benchmark`

## With Kubernetes

Build, Tag, Push: 

```
npm run build
npm run tag
npm run push
```

Choose a node in your cluster and select+taint it: 

```
kubectl label nodes $NODE app=performance-of-go-ipfs
kubectl taint nodes $NODE app=performance-of-go-ipfs:NoExecute
```

That should evict all other deployments and make the node available for these tests.

Deploy: `kubectl apply -f k8/deploy.yaml`

The default `k8/deploy.yaml` uses host mounts for data.

> ASIDE: 
> 
> * to get into *server.js* container: `kubectl exec -it $POD --container test-server -- /bin/sh`
> * to get into the IPFS container: `kubectl exec -it $POD --container go-ipfs -- /bin/sh`
> * to see IPFS swarm advertised addresses `ipfs dht findpeer $HASH` where *$HASH* is peer ID of node, see also `ipfs id`
>
> Where *$POD* is the name of your *performance-of-go-ipfs* pod using `kubectl get pods`

Open port-forwarding to your pod for running tests and looking at IPFS UI:

```
kubectl port-forward $POD 8888:8888
kubectl port-forward $POD 5001:5001
```

Where *$POD* is the name of your *performance-of-go-ipfs* pod using `kubectl get pods`

> ASIDE:
>
> To run the performance tests against *Digital Ocean*'s persistent volumes patch in the `k8/do-mount.yaml`: 
>
> ```
> kubectl apply -f k8/do-claims.yaml
> kubectl patch deployment performance-of-go-ipfs --patch "$(cat k8/do-mount.yaml)"
> ```

# Results

All runs on my laptop running Windows 10 with Docker in VirtualBox.

```
-- 10 burst x 1B (run 1)
store-to-memory x 114 ops/sec ±1.63% (77 runs sampled)
store-to-filesystem x 54.76 ops/sec ±2.58% (67 runs sampled)
store-to-ipfs x 8.81 ops/sec ±25.79% (52 runs sampled)

-- 10 burst x 1B (run 2)
store-to-memory x 112 ops/sec ±2.34% (76 runs sampled)
store-to-filesystem x 57.24 ops/sec ±2.68% (69 runs sampled)
store-to-ipfs x 9.60 ops/sec ±24.47% (55 runs sampled)

-- 10 burst x 1KiB (run 1)
store-to-memory x 75.23 ops/sec ±5.98% (75 runs sampled)
store-to-filesystem x 49.31 ops/sec ±1.40% (77 runs sampled)
store-to-ipfs x 8.00 ops/sec ±28.70% (48 runs sampled)

-- 10 burst x 1KiB (run 2)
store-to-memory x 75.19 ops/sec ±2.11% (61 runs sampled)
store-to-filesystem x 48.53 ops/sec ±2.39% (76 runs sampled)
store-to-ipfs x 8.36 ops/sec ±29.74% (50 runs sampled)

-- 10 burst x 1MiB (run 1)
store-to-memory x 0.70 ops/sec ±15.13% (8 runs sampled)
store-to-filesystem x 0.54 ops/sec ±8.69% (7 runs sampled)
store-to-ipfs x 0.35 ops/sec ±39.39% (7 runs sampled)

-- 10 burst x 1MiB (run 2)
store-to-memory x 0.74 ops/sec ±4.24% (8 runs sampled)
store-to-filesystem x 0.55 ops/sec ±1.14% (7 runs sampled)
store-to-ipfs x 0.38 ops/sec ±23.64% (7 runs sampled)

-- 10 burst x 10MiB (run 1)
store-to-memory x 0.05 ops/sec ±15.17% (5 runs sampled)
store-to-filesystem x 0.05 ops/sec ±9.68% (5 runs sampled)
store-to-ipfs x 0.03 ops/sec ±57.93% (5 runs sampled)

-- 10 burst x 10MiB (run 2)
store-to-memory x 0.04 ops/sec ±16.29% (5 runs sampled)
store-to-filesystem x 0.05 ops/sec ±18.60% (5 runs sampled)
store-to-ipfs x 0.03 ops/sec ±46.83% (5 runs sampled)
```

The smaller the files the less impact Websockets have and the more important the storage approach.  

For 1 byte and 1 kibibyte values IPFS is an order of magnitude slower than storing in memory and 5x slower than storing on OS file system.

For 1 Mebibyte  values IPFS is half the speed of memory storage and slightly slower than storing on the OS file system.

For 10 Mebibyte values the choice of storage seems insignificant with respect to the Websocket overhead.

# Running Dev Server Locally

(for benchmark development)

For running benchmark first ensure IPFS is running and configured (see *Configuration* above).  Not necessary if just
running [client.js](./client.js).

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

```
npm install
npm run client.js
```
