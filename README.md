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
kubectl taint nodes $NODE app=performance-of-go-ipfs:NoSchedule
```

Then manually evict all other pods on that node in the "default" namespace: we want to avoid messing with *DaemonSets* in other namespaces (e.g. *kube-system*).

When you're done performance testing remove the taint from the node: `kubectl taint nodes $NODE app:NoSchedule-`

Note that deployment requires *kustomize* [https://github.com/kubernetes-sigs/kustomize](https://github.com/kubernetes-sigs/kustomize).

To deploy: `kustomize build k8/host | kubectl apply -f -`

The default `k8/host` deployment uses host mounts for data.

> ASIDE: 
> 
> * to get into *server.js* container: `kubectl exec -it $POD --container test-server -- /bin/sh`
> * to get into the IPFS container: `kubectl exec -it $POD --container go-ipfs -- /bin/sh`
> * to see IPFS swarm advertised addresses `ipfs dht findpeer $HASH` where *$HASH* is peer ID of node, see also `ipfs id`
> * to see logs from the *test-server*: `kubectl logs deployment/performance-of-go-ipfs --container test-server -f`
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
> To run the performance tests against *Digital Ocean*'s persistent volumes patch in the `k8/digitalocean` *kustomization*: 
>
> `kustomize build k8/digitalocean | kubectl apply -f -`
>
> in *bash*:
> ```
> kubectl patch deployment performance-of-go-ipfs --patch "$(cat k8/do-mount.yaml)"
> ```
> 
> in *PowerShell*:
> ```
> kubectl patch deployment performance-of-go-ipfs --patch "$((cat k8/do-mount.yaml) -join ""`n"")"
> ```

# Results

## Runs with *test-server* and *go-ipfs* in Docker (Win10/VirtualBox) and *driver.js* on laptop host

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

## Runs with *test-server* and *go-ipfs* on Kubernetes node (1vCPU/2GiB mem) on *DigitalOcean* and *driver.js* on laptop client

* regardless if *host moutned* or using *persistent mount*, all metrics are very close and are a wash
* for 1 byte *store-to-filesystem* is a wash whether using *host mount* or *persistent volume mount*
* for 1KiB *persistent volume mount* outperformed *host mount*, but again, it's really a wash
* at 1MiB network delays are the limiter so storage medium is immaterial

### Writing to Host Mount

```
Run for size: 1B
connected
store-to-memory x 21.73 ops/sec ±5.85% (55 runs sampled)
store-to-filesystem x 16.27 ops/sec ±4.08% (49 runs sampled)
store-to-ipfs x 2.89 ops/sec ±52.42% (27 runs sampled)
fastest :: store-to-memory

Run for size: 1B
connected
store-to-memory x 20.60 ops/sec ±7.21% (52 runs sampled)
store-to-filesystem x 19.30 ops/sec ±6.23% (49 runs sampled)
store-to-ipfs x 3.58 ops/sec ±61.19% (32 runs sampled)
fastest :: store-to-memory

Run for size: 1KiB
connected
store-to-memory x 9.24 ops/sec ±6.53% (46 runs sampled)
store-to-filesystem x 8.38 ops/sec ±12.23% (43 runs sampled)
store-to-ipfs x 2.00 ops/sec ±59.14% (23 runs sampled)
fastest :: store-to-memory,store-to-filesystem

Run for size: 1KiB
connected
store-to-memory x 8.77 ops/sec ±9.95% (44 runs sampled)
store-to-filesystem x 9.47 ops/sec ±5.59% (49 runs sampled)
store-to-ipfs x 3.04 ops/sec ±58.21% (26 runs sampled)
fastest :: store-to-filesystem,store-to-memory

Run for size: 1MiB
connected
store-to-memory x 0.04 ops/sec ±15.58% (5 runs sampled)
store-to-filesystem x 0.04 ops/sec ±19.28% (5 runs sampled)
store-to-ipfs x 0.04 ops/sec ±36.09% (5 runs sampled)
fastest :: store-to-memory,store-to-filesystem,store-to-ipfs

Run for size: 1MiB
connected
store-to-memory x 0.04 ops/sec ±37.31% (5 runs sampled)
store-to-filesystem x 0.03 ops/sec ±41.52% (5 runs sampled)
store-to-ipfs x 0.03 ops/sec ±58.72% (5 runs sampled)
fastest :: store-to-memory,store-to-ipfs,store-to-filesystem
```

### Writing to Persistent Volume Mount

```
Run for size: 1B
connected
store-to-memory x 19.68 ops/sec ±10.67% (54 runs sampled)
store-to-filesystem x 19.04 ops/sec ±4.15% (51 runs sampled)
store-to-ipfs x 1.08 ops/sec ±74.60% (13 runs sampled)
fastest :: store-to-filesystem

Run for size: 1B
connected
store-to-memory x 15.95 ops/sec ±17.58% (42 runs sampled)
store-to-filesystem x 16.84 ops/sec ±4.47% (56 runs sampled)
store-to-ipfs x 3.62 ops/sec ±43.99% (28 runs sampled)
fastest :: store-to-filesystem

Run for size: 1KiB
connected
store-to-memory x 10.26 ops/sec ±6.74% (50 runs sampled)
store-to-filesystem x 9.55 ops/sec ±3.53% (49 runs sampled)
store-to-ipfs x 2.94 ops/sec ±68.46% (28 runs sampled)
fastest :: store-to-memory,store-to-filesystem

Run for size: 1KiB
connected
store-to-memory x 9.66 ops/sec ±8.07% (48 runs sampled)
store-to-filesystem x 9.10 ops/sec ±5.43% (46 runs sampled)
store-to-ipfs x 2.95 ops/sec ±69.93% (29 runs sampled)
fastest :: store-to-memory,store-to-filesystem

Run for size: 1MiB
connected
store-to-memory x 0.03 ops/sec ±29.54% (5 runs sampled)
store-to-filesystem x 0.04 ops/sec ±13.34% (5 runs sampled)
store-to-ipfs x 0.04 ops/sec ±6.88% (5 runs sampled)
fastest :: store-to-ipfs,store-to-filesystem

Run for size: 1MiB
connected
store-to-memory x 0.04 ops/sec ±11.56% (5 runs sampled)
store-to-filesystem x 0.04 ops/sec ±18.97% (5 runs sampled)
store-to-ipfs x 0.04 ops/sec ±24.58% (5 runs sampled)
fastest :: store-to-filesystem,store-to-memory,store-to-ipfs
```

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
