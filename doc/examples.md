## Examples

There is three examples there in [examples/](../examples) directory.
All they accept _-h_ command-line option for help.

### count.js
[This simple application](../examples/count.js) demonstrates minimalistic use of Walker.
However, calling it with arguments like '/dev' or '~' may give interesting results.

Most of it's 45 code lines is actually about presenting results, not walking.

### list.js
[This slightly more complex application](../examples/list.js) searches npm projects
and does some simple analysis on them.

It derives a _custom child class_ from `Walker`, demonstrates _**rule system switching**_,
**_parallel processing_** and _**sharing data**_ between "threads".

### parse.js
[This demo](../examples/parse.js) interprets command line arguments as rule definitions,
constructs a `Ruler` instance and dumps it's contents.
