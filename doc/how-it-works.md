**`Walker`** class instance has `walkSync()` method,
which does most of the job. It traverses directory hierarchy width-first,
calling application-defined handlers, as it goes. The walk() code
is re-enterable and it can run in parallel promise instances.

Simplified internal algorithm use by `walk()` and `walkSync()` methods:
```javascript
function walkSync (root, options) {
  let action, context, directory
  const walkContext = defaults({}, options, this.options)
  const fifo = [{ dir: '', locals: walkContext.locals || {} }]

  while (!this.terminate && (context = fifo.shift()) !== undefined) {
    const { dir } = context

    directory = fs.opendirSync(join(root, dir))
    if ((action = onBegin(context)) === DO_ABORT) break
    if (action === DO_SKIP) continue

    while (({ name, type } = directory.readSync())) {
      action = onEntry({ name, type, ...context })
      if (action === DO_ABORT) discardPushedEntriesAndBreak()
      //  The entries pushed here will be processed next.
      if (action !== DO_SKIP && type === 'dir') fifo.push({dir: join(dir, name)})
    }
    directory.closeSync()

    if ((action = onEnd({action, ...context})) === DO_ABORT) break
  }
  return walkContext.error ? walkContext.error : walkContext
}
```
Application - specific handlers `onBegin`, `onEnd`, `onEntry` and 
`onError` are all optional, but 
`Walker` just won't do much good without them.

Things really get exciting, when we apply some business logic in our handlers.
See [another example](examples/list.js).
