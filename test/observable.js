const tap = require('tap')
const spawnWrap = require('../')

const NESTED_SYNC = require.resolve('./fixtures/nested/nested-sync-0.js')

const EXPECTED_OUT = '' +
  'Nested 0 (before)\n' +
  'Nested 1 (before)\n' +
  'Nested 2 (before)\n' +
  '[ \'extra\' ]\n' +
  'Nested 2 (after)\n' +
  'Nested 1 (after)\n' +
  'Nested 0 (after)\n'

tap.test('observeSpawn voidSpawn', (t) => {
  const outChunks = []
  spawnWrap
    .observeSpawn(process.execPath, [NESTED_SYNC])
    .subscribe(
      (ev) => {
        // console.log('Intercepted a Node process spawn!')
        const rootProcess = ev.rootProcess
        if (rootProcess !== undefined) {
          // console.log(`(Root process)`)
          rootProcess.stdout.on('data', (chunk) => outChunks.push(chunk))
          // rootProcess.stderr.pipe(process.stderr)
        }
        // console.log(ev.args)
        ev.voidSpawn([...ev.args, 'extra'])
      },
      undefined,
      () => {
        const out = Buffer.concat(outChunks).toString('UTF-8')
        t.equal(out, EXPECTED_OUT)
        t.end()
      }
    )
})

tap.test('observeSpawn proxySpawn', (t) => {
  const outChunks = []
  const errChunks = []
  const proxyOutChunks = []
  const proxyErrChunks = []

  spawnWrap
    .observeSpawn(process.execPath, [NESTED_SYNC])
    .subscribe(
      (ev) => {
        // console.log('Intercepted a Node process spawn!')
        const rootProcess = ev.rootProcess
        if (rootProcess !== undefined) {
          // console.log(`(Root process)`)
          rootProcess.stdout.on('data', (chunk) => outChunks.push(chunk))
          rootProcess.stderr.on('data', (chunk) => errChunks.push(chunk))
          // rootProcess.stderr.pipe(process.stderr)
        }
        // console.log(ev.args)
        const proxy = ev.proxySpawn([...ev.args, 'extra'])
        const thisOutChunks = []
        const thisErrChunks = []
        proxy.stdout.on('data', (chunk) => thisOutChunks.push(chunk))
        proxy.stderr.on('data', (chunk) => thisErrChunks.push(chunk))
        proxyOutChunks.push(thisOutChunks)
        proxyErrChunks.push(thisErrChunks)
      },
      undefined,
      () => {
        const out = Buffer.concat(outChunks).toString('UTF-8')
        const err = Buffer.concat(errChunks).toString('UTF-8')
        const proxyOut = proxyOutChunks.map((chunks) => Buffer.concat(chunks).toString('UTF-8'))
        const proxyErr = proxyErrChunks.map((chunks) => Buffer.concat(chunks).toString('UTF-8'))
        t.equal(out, EXPECTED_OUT)
        t.equal(err, 'FOO\n')
        t.match(
          proxyOut,
          [
            EXPECTED_OUT,
            'Nested 1 (before)\nNested 2 (before)\n[ \'extra\' ]\nNested 2 (after)\nNested 1 (after)\n',
            'Nested 2 (before)\n[ \'extra\' ]\nNested 2 (after)\n'
          ]
        )
        t.match(
          proxyErr,
          [
            'FOO\n',
            'FOO\n',
            'FOO\n'
          ]
        )
        t.end()
      }
    )
})
