import assert from 'node:assert/strict';
globalThis.HTMLRewriter = class { on(){ return this; } transform(r){ return r; } };
const calls = [];
globalThis.fetch = async (u, init) => {
  const url = new URL(u); calls.push(url.host + url.pathname);
  if (url.host.startsWith('new') && url.pathname === '/missing') return new Response('nf', { status: 404 });
  if (url.host.startsWith('new') && url.pathname === '/down') throw new Error('down');
  if (url.pathname === '/redir') return new Response(null, { status: 301, headers: { location: 'https://old.netlify.app/target' } });
  return new Response('<html><head></head>from ' + url.host, { headers: { 'content-type': 'text/html' } });
};
const { default: worker, decide } = await import('./worker.js');
const env = { NEW_SITE_PERCENT: '10', OLD_ORIGIN: 'https://old.netlify.app', NEW_ORIGIN: 'https://new.netlify.app' };
const req = (path, o = {}) => new Request('https://www.microdegree.work' + path, { headers: o.headers || {}, method: o.method || 'GET' });

// split ratio over many fresh visitors
let n = 0; for (let i = 0; i < 20000; i++) { const d = decide({ method:'GET', pathname:'/', userAgent:'Mozilla', cookieHeader:'', searchParams:new URLSearchParams(), percent:10, randomBucket:()=>Math.floor(Math.random()*100) }); if (d.variant==='new') n++; }
console.log('new share:', (n/200).toFixed(1)+'%'); assert(n/200 > 9 && n/200 < 11);

// sticky + monotonic ramp
const base = { method:'GET', pathname:'/', userAgent:'Mozilla', searchParams:new URLSearchParams(), randomBucket:()=>0 };
assert.equal(decide({ ...base, cookieHeader:'md_bucket=5', percent:10 }).variant, 'new');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=15', percent:10 }).variant, 'old');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=15', percent:25 }).variant, 'new');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=5', percent:0 }).variant, 'old');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=garbage', percent:10, randomBucket:()=>77 }).variant, 'old');
// pins
assert.equal(decide({ ...base, cookieHeader:'md_bucket=1', percent:100, userAgent:'Googlebot/2.1' }).variant, 'old');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=1', percent:100, pathname:'/blog/x' }).variant, 'old');
assert.equal(decide({ ...base, cookieHeader:'md_bucket=1', percent:100, pathname:'/blogger' }).variant, 'new'); // prefix must match whole segment
assert.equal(decide({ ...base, cookieHeader:'md_bucket=1', percent:100, method:'POST' }).variant, 'old');
// QA override
assert.equal(decide({ ...base, cookieHeader:'md_bucket=99', percent:10, searchParams:new URLSearchParams('md_variant=new') }).variant, 'new');
assert.equal(decide({ ...base, cookieHeader:'md_variant=new;md_bucket=99', percent:10 }).variant, 'new');
assert.equal(decide({ ...base, cookieHeader:'md_variant=new;md_bucket=99', percent:10, searchParams:new URLSearchParams('md_variant=reset') }).variant, 'old');

// end-to-end through the worker
let r = await worker.fetch(req('/', { headers:{ cookie:'md_bucket=3', 'user-agent':'Mozilla' } }), env);
assert.equal(await r.text(), '<html><head></head>from new.netlify.app'); assert.match(r.headers.get('x-md-variant'), /^new/);
assert.equal(r.headers.get('set-cookie'), null); // already bucketed: no new cookie
r = await worker.fetch(req('/', { headers:{ 'user-agent':'Mozilla' } }), env);
assert.match(r.headers.get('set-cookie'), /^md_bucket=\d+; Path=\/; Max-Age=2592000; SameSite=Lax; Secure; Domain=microdegree\.work/);
assert.match(r.headers.get('vary'), /Cookie/);
r = await worker.fetch(req('/missing', { headers:{ cookie:'md_bucket=3', 'user-agent':'Mozilla' } }), env);
assert.match(await r.text(), /from old\.netlify\.app/); assert.match(r.headers.get('x-md-variant'), /^old/); // 404 on new -> old
r = await worker.fetch(req('/down', { headers:{ cookie:'md_bucket=3', 'user-agent':'Mozilla' } }), env);
assert.match(await r.text(), /from old\.netlify\.app/); // new site down -> old
r = await worker.fetch(req('/redir', { headers:{ cookie:'md_bucket=50', 'user-agent':'Mozilla' } }), env);
assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://www.microdegree.work/target'); // Location rewritten to public host
console.log('all worker tests passed');
