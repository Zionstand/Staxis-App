const test = require('node:test');
const assert = require('node:assert/strict');
const { verify } = require('./dependency-patches.cjs');
// Refuse adversarial inputs when install scripts were skipped.
verify();
test('all installed consumers use the checked-in backports', () => verify());
test('query-string decoder preserves CommonJS, plus, malformed UTF8, and valid Unicode', () => {
  const query = require('query-string');
  const decode = require('decode-uri-component');
  assert.equal(decode('hello+world'), 'hello world');
  assert.equal(query.parse('x=hello+world').x, 'hello world');
  for (const [value, expected] of [['%F0%9F%98%80','😀'], ['%E2%82%AC','€'], ['%E0%A4%A','%E0%A4%A'], ['%FF%41','%FFA'], ['%C2','�'], ['%FE%FF','��'], ['%ED%A0%80','%ED%A0%80'], ['%','%']]) assert.equal(decode(value), expected);
  const hostile = '%FF'.repeat(100000) + '%41';
  assert.equal(decode(hostile), '%FF'.repeat(100000) + 'A');
  assert.equal(query.parse('x=' + hostile).x, '%FF'.repeat(100000) + 'A');
  assert.throws(() => decode(null), TypeError);
});
test('brace guards preserve Metro patterns and reject pathological nesting including ASTs', () => {
  const braces = require('braces');
  assert.deepEqual(braces.expand('src/{a,b}.js'), ['src/a.js','src/b.js']);
  assert.equal(require('micromatch').some('src/a.js', ['**/*.js']), true);
  assert.throws(() => braces.parse('{'.repeat(17)), RangeError);
  assert.throws(() => braces.parse('{)'.repeat(17)), RangeError);
  assert.throws(() => braces.compile('a'.repeat(4097), { maxLength: Infinity }), RangeError);
  assert.throws(() => require('braces/lib/parse')('{'.repeat(17)), RangeError);
  assert.throws(() => braces.parse('{\\}'.repeat(17)), RangeError);
  assert.throws(() => braces.parse('{"}"'.repeat(17)), RangeError);
  const ast = {nodes: []}; ast.nodes.push(ast);
  for (const method of ['compile', 'expand', 'stringify']) assert.throws(() => braces[method](ast), RangeError);
});
test('brace AST parent cycles fail without hanging and parsed ASTs still expand', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const braces = require('braces');
    const ast = {type:'text', nodes:[]}; ast.parent = ast;
    assert.throws(() => braces.expand(ast), RangeError);
    const a={type:'text', nodes:[]}, b={type:'text', parent:a}; a.parent=b;
    assert.throws(() => braces.expand(a), RangeError);
    assert.deepEqual(braces.expand(braces.parse('src/{a,b}.js')), ['src/a.js','src/b.js']);
  `], { cwd: require('node:path').resolve(__dirname, '..'), timeout: 5000, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('node-forge rejects the exact upstream forged-signature regression', () => {
  const forge = require('node-forge'); const fixture = require('../vendor/security-patches/forge-regression.json');
  const key = forge.pki.rsa.setPublicKey(new forge.jsbn.BigInteger(fixture.modulus,16), new forge.jsbn.BigInteger(fixture.exponent));
  const digest = forge.md.sha256.create().update(fixture.message).digest().getBytes();
  assert.throws(() => key.verify(digest, forge.util.hexToBytes(fixture.signature), undefined, {_skipPaddingChecks:true}), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
});
test('node-forge verifies legitimate signatures, optional NULL, and Expo certificates', () => {
  const forge = require('node-forge');
  const keys = forge.pki.rsa.generateKeyPair({bits:2048,e:65537});
  const digest = forge.md.sha256.create().update('staxis');
  const signature = keys.privateKey.sign(digest);
  assert.equal(keys.publicKey.verify(digest.digest().getBytes(),signature),true);
  assert.equal(keys.publicKey.verify(forge.md.sha256.create().update('changed').digest().getBytes(),signature),false);
  // Exercise DigestAlgorithm with NULL omitted using a real RSA operation.
  const der=forge.asn1.create; const A=forge.asn1;
  const digestInfo=der(A.Class.UNIVERSAL,A.Type.SEQUENCE,true,[der(A.Class.UNIVERSAL,A.Type.SEQUENCE,true,[der(A.Class.UNIVERSAL,A.Type.OID,false,A.oidToDer(forge.pki.oids.sha256).getBytes())]),der(A.Class.UNIVERSAL,A.Type.OCTETSTRING,false,digest.digest().getBytes())]);
  // NONE signs raw bytes; use the explicit scheme object to encode DigestInfo.
  const encoded=keys.privateKey.sign(A.toDer(digestInfo).getBytes(), 'NONE');
  assert.equal(keys.publicKey.verify(digest.digest().getBytes(),encoded),true);
  const cert=forge.pki.createCertificate();cert.publicKey=keys.publicKey;cert.serialNumber='01';cert.validity.notBefore=new Date();cert.validity.notAfter=new Date(Date.now()+86400000);cert.setSubject([{name:'commonName',value:'Staxis dependency test'}]);cert.setIssuer(cert.subject.attributes);cert.sign(keys.privateKey,forge.md.sha256.create());assert.equal(cert.verify(cert),true);
});
