# remark-hint

Sprinkle hints/tips/warnings on your documents.

## installation

```bash
yarn add remark-hint
```

## usage

Say we have the following markdown:

```markdown
!> Here is a tip.

?> And a warning.

x> Or an error.
```

And our script looks as follows:

```javascript
const remark = require('remark');

remark()
  .use(require('remark-hint'))
  .use(require('remark-html'))
  .process(src, (err, file) => console.log(String(file)));
```

Now, running it yields:

```html
<p class="hint tip">Here is a tip.</p>
<p class="hint warn">And a waring.</p>
<p class="hint error">Or an error.</p>
```

> Take a look at [a sample](test/outputs) of how it looks like.

## license

BSD-3-Clause
