# Duke
A rules-based file directory walker.
<div style="text-align: right">
<span><i>“You’ll find I’m full of surprises.”</i></span> 
<p>Duke Dirwalker</p> 
</div>

Converting a set of patterns into a set of file paths (globing) and starting some
processing on those paths afterwards is not feasible for many practical
tasks.

## Concept

**_`Walker`_** instance gets initialized with _`rootPath`_ and _`client`_ parameters.
