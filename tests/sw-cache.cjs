// 无第三方依赖。执行：node tests/sw-cache.cjs
// 模拟仍然有效的旧 HTTP 缓存，验证安装、后台更新和版本隔离。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const origin = 'https://little-ears.test/';
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const absolute = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
class WorkerRequest extends Request {
  constructor(input, options) { super(typeof input === 'string' ? absolute(input) : input, options); }
}
function boot() {
  const listeners = new Map(), buckets = new Map(), requests = [];
  let offline = false, skipped = false, claimed = false;
  async function network(input) {
    const request = input instanceof Request ? input : new WorkerRequest(input);
    requests.push(request);
    if (offline) throw new Error('offline');
    // A default fetch would return a stale but still fresh HTTP entry.
    return new Response(request.cache === 'reload' ? 'deployed:' + new URL(request.url).pathname : 'old-http-cache');
  }
  function bucket() {
    const entries = new Map();
    return {
      entries,
      async match(key, options = {}) {
        const url = absolute(key);
        const found = [...entries].find(([stored]) => options.ignoreSearch
          ? stored.split('?')[0] === url.split('?')[0] : stored === url);
        return found?.[1].clone();
      },
      async put(key, response) { entries.set(absolute(key), response.clone()); },
      async addAll(requests) {
        for (const request of requests) await this.put(request, await network(request));
      }
    };
  }
  const caches = {
    async open(name) { if (!buckets.has(name)) buckets.set(name, bucket()); return buckets.get(name); },
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); }
  };
  const context = vm.createContext({
    Request: WorkerRequest, Response, URL, caches, fetch: network,
    self: {
      location: new URL(origin + 'sw.js'),
      addEventListener: (type, listener) => listeners.set(type, listener),
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } }
    }
  });
  vm.runInContext(source, context);
  async function dispatch(type, request) {
    const pending = [];
    let response;
    listeners.get(type)({ request, waitUntil: promise => pending.push(promise), respondWith: promise => { response = promise; } });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  return { caches, requests, dispatch, get skipped() { return skipped; }, get claimed() { return claimed; }, setOffline: value => { offline = value; } };
}
(async () => {
  const worker = boot();
  await worker.dispatch('install');
  const cache = await worker.caches.open('little-ears-v5');
  assert.ok(worker.skipped);
  assert.equal(cache.entries.size, 20);
  for (const [url, response] of cache.entries) {
    assert.equal(await response.clone().text(), 'deployed:' + new URL(url).pathname, `stale precache: ${url}`);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"?]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m => m[1]);
  assert.equal(refs.length, 6);
  for (const ref of refs) {
    assert.equal(new URL(ref, origin).search, '?v=5');
    assert.ok(await cache.match(ref), `missing HTML resource: ${ref}`);
  }
  console.log('PASS: install bypasses old HTTP cache; all HTML JS/CSS references are versioned and precached');

  const key = './assets/js/store.js?v=5';
  await cache.put(key, new Response('cached-v5'));
  const served = await worker.dispatch('fetch', new WorkerRequest(key));
  assert.equal(await served.text(), 'cached-v5');
  assert.equal(await (await cache.match(key)).text(), 'deployed:/assets/js/store.js');
  console.log('PASS: stale-while-revalidate serves cached data and persists the deployed body instead of stale HTTP bytes');

  await cache.put('./assets/js/store.js', new Response('old-unversioned'));
  await cache.put('./assets/js/store.js?v=4', new Response('old-v4'));
  worker.setOffline(true);
  const exact = await worker.dispatch('fetch', new WorkerRequest(key));
  assert.equal(await exact.text(), 'deployed:/assets/js/store.js');
  const absent = await worker.dispatch('fetch', new WorkerRequest('./assets/js/store.js?v=6'));
  assert.equal(absent.status, 503);
  // Navigation query strings must still resolve to the precached index.html.
  const navigation = new WorkerRequest(origin + '?source=homescreen');
  Object.defineProperty(navigation, 'mode', { value: 'navigate' });
  const home = await worker.dispatch('fetch', navigation);
  assert.equal(await home.text(), 'deployed:/index.html');
  console.log('PASS: offline resource versions match exactly; navigation queries still use index.html');

  await worker.caches.open('little-ears-v4');
  await worker.caches.open('another-app');
  await worker.dispatch('activate');
  assert.deepEqual(await worker.caches.keys(), ['little-ears-v5', 'another-app']);
  assert.ok(worker.claimed);
  assert.ok(worker.requests.every(request => request.cache === 'reload'));
  console.log('PASS: activation removes old app caches and claims clients');
})().catch(error => { console.error(error); process.exitCode = 1; });
