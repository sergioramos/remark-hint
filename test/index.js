const hint = require('../');

const test = require('ava');
const { transform } = require('@babel/core');
const { join } = require('path');
const puppeteer = require('puppeteer');
const mdx = require('@mdx-js/mdx');
const { readFile, readFileSync, writeFile } = require('mz/fs');
const prettier = require('prettier');
const virtual = require('@rollup/plugin-virtual');
const rollup = require('rollup');
const React = require('react');
const ReactDOM = require('react-dom/server');
const remark = require('remark');

const { CI = 'false' } = process.env;
const FIXTURE = join(__dirname, 'fixture.md');
const OUTPUTS = join(__dirname, 'outputs');
const CSS = readFileSync(join(__dirname, 'style.css'));
const STYLE = `<style>${CSS}</style>`;

const compileJsx = async (src, options) => {
  const config = await prettier.resolveConfig(__filename);

  const jsx = await mdx(src, {
    commonmark: true,
    gfm: true,
    remarkPlugins: [[hint, options]],
  });

  const { code } = transform(jsx.replace(/^\/\*\s*?@jsx\s*?mdx\s\*\//, ''), {
    sourceType: 'module',
    presets: [require.resolve('@babel/preset-react')],
  });

  const bundle = await rollup.rollup({
    input: 'main.js',
    treeshake: true,
    plugins: [
      virtual({
        'main.js': "import React from 'react';\n".concat(code),
      }),
      require('rollup-plugin-babel')({
        sourceType: 'module',
        presets: [require.resolve('@babel/preset-react')],
      }),
    ],
  });

  const result = await bundle.generate({
    format: 'iife',
    name: 'Main',
    exports: 'named',
    globals: {
      react: 'React',
    },
  });

  // eslint-disable-next-line no-new-func
  const fn = new Function('React', `${result.output[0].code};\nreturn Main;`);
  const element = React.createElement(fn(React).default);

  return prettier.format(STYLE.concat(ReactDOM.renderToStaticMarkup(element)), {
    ...config,
    parser: 'html',
  });
};

const compile = async (src, options) => {
  const config = await prettier.resolveConfig(__filename);

  const handleResult = (resolve, reject) => {
    return (err, file) => {
      if (err) {
        return reject(err);
      }

      return resolve(
        prettier.format(STYLE.concat(String(file)), {
          ...config,
          parser: 'html',
        }),
      );
    };
  };

  return new Promise((resolve, reject) => {
    return remark()
      .use(hint, options)
      .use(require('remark-html'))
      .process(src, handleResult(resolve, reject));
  });
};

const takeScreenshot = async (html, path) => {
  if (JSON.parse(CI)) {
    return;
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);
  await page.setContent(html, { waitUntil: 'networkidle2' });
  await page.screenshot({ path, fullPage: true });

  await browser.close();
};

test('default', async (t) => {
  const markdown = await readFile(FIXTURE);
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'index.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'index.png'));

  t.snapshot(output);
});

test('jsx', async (t) => {
  const markdown = await readFile(FIXTURE);
  const output = await compileJsx(markdown, { jsx: true });

  await writeFile(join(OUTPUTS, 'index-jsx.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'index-jsx.png'));

  t.snapshot(output);
});
