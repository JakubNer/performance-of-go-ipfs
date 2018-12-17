const Benchmark = require('benchmark')

const ITERATIONS = 1;
const NUM_BYTES = 1024;



function create_local(name, data) {

}

function update_local(name, data) {

}

function read_local(name) {

}

function delete_local(name) {

}

function create_ipfs(name, data) {

}

function update_ipfs(name, data) {

}

function read_ipfs(name) {

}

function delete_ipfs(name) {

}

const cb = function(cb){
  cb(null, true)
}
let suite = new Benchmark.Suite()
suite
.add('donePromise', {
  defer: true,
  fn: function(deferred) {
    deferred.resolve(donePromise);
  }})
.add('value', {
  defer: true,
  fn: function(deferred) {
    deferred.resolve(value);
  }})
.add('fn', {
  defer: true,
  fn: function(deferred) {
    deferred.resolve(fn());
  }})

  // add listeners
  .on('cycle', event => console.log("%s", event.target))
  .on('complete', function(){
    console.log('fastest :: ' + this.filter('fastest').map('name'))
  })
  .on('error', error => console.error(error))
  .run({ 'async': true })