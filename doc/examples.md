## Examples

_**Note:** The examples, as well as tests, are not installed by npm,
so to actually try them, please clone the source repository first:
```
git clone https://github.com/valango/duke.git
```
first to actually play with examples._

There are some examples in [examples/](../examples) directory.
To run, type in a terminal something like:
```shell script
node examples/count -h
```

### count.js
[This simple application](../examples/count.js)
demonstrates minimalistic use of Walker.

Just 30 code lines do all the business logic - the rest are wrapping the eye candy.
Hey - it even finds and tracks _symbolic links_ and reports the broken ones! ;).
![](https://github.com/valango/duke/blob/master/assets/counts.png)

### list.js
[This slightly more complex application](../examples/list.js)
Finds Node.js projects and does some simple analysis on them. 

This code demonstrates dynamic strategy, rules swithcing and other techniques.
![](https://github.com/valango/duke/blob/master/assets/list.png)

### parse.js
[This demo](../examples/parse.js)
interprets command line arguments as rule definitions,
constructs a `Ruler` instance and simulates directory path walking.

![](https://github.com/valango/duke/blob/master/assets/parse.png)

This tool helps developer to experiment with rule stuff and understand the details.
