const u = require('unist-builder');

const classNames = {
  'hint tip': /^!&gt;|!>\s/,
  'hint warn': /^\?&gt;|\?>\s/,
  'hint error': /^x&gt;|x>\s/,
};

// from github.com/syntax-tree/unist-util-map/blob/bb0567f651517b2d521af711d7376475b3d8446a/index.js
const map = (tree, iteratee) => {
  const preorder = (node, index, parent) => {
    const newNode = iteratee(node, index, parent);

    if (Array.isArray(newNode.children)) {
      newNode.children = newNode.children.map((child, index) => {
        return preorder(child, index, node);
      });
    }

    return newNode;
  };

  return preorder(tree, null, null);
};

module.exports = () => (tree) => {
  return map(tree, (node) => {
    const { children = [] } = node;
    if (node.type !== 'paragraph') {
      return node;
    }

    const [{ value, type }, ...siblings] = children;
    if (type !== 'text') {
      return node;
    }

    if (!Object.values(classNames).some((r) => r.test(value))) {
      return node;
    }

    const [className, r] = Object.entries(classNames).find(([, r]) => {
      return r.test(value);
    });

    const newChild = {
      type,
      value: value.replace(r, ''),
    };

    const props = {
      data: {
        class: className,
        hProperties: {
          class: className,
        },
      },
    };

    return u('paragraph', props, [newChild, ...siblings]);
  });
};
