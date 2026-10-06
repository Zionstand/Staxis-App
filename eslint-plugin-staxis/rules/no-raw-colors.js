/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw color literals (#hex, rgb(), rgba(), hsl()) in style objects. Use Palette/Colors tokens from staxis-theme instead.',
    },
    messages: {
      rawColor:
        'Raw color "{{value}}" in style property "{{prop}}". Import from @/constants/staxis-theme instead.',
    },
    schema: [],
  },

  create(context) {
    const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/;
    const FUNC_RE = /^(?:rgb|rgba|hsl|hsla)\s*\(/i;

    const COLOR_PROPS = new Set([
      'color',
      'backgroundColor',
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'borderStartColor',
      'borderEndColor',
      'shadowColor',
      'textShadowColor',
      'textDecorationColor',
      'tintColor',
      'overlayColor',
    ]);

    function isColorValue(value) {
      return typeof value === 'string' && (HEX_RE.test(value) || FUNC_RE.test(value));
    }

    function isInsideStyleSheet(node) {
      let current = node;
      while (current) {
        if (
          current.type === 'CallExpression' &&
          current.callee?.type === 'MemberExpression' &&
          current.callee.object?.name === 'StyleSheet' &&
          current.callee.property?.name === 'create'
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function isInsideStyleProp(node) {
      let current = node;
      while (current) {
        if (
          current.type === 'JSXAttribute' &&
          current.name?.name === 'style'
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function checkProperty(node) {
      if (!node.key || !node.value) return;

      const propName =
        node.key.type === 'Identifier'
          ? node.key.name
          : node.key.type === 'Literal'
            ? String(node.key.value)
            : null;

      if (!propName || !COLOR_PROPS.has(propName)) return;
      if (!isInsideStyleSheet(node) && !isInsideStyleProp(node)) return;

      if (node.value.type === 'Literal' && isColorValue(node.value.value)) {
        context.report({
          node: node.value,
          messageId: 'rawColor',
          data: { value: node.value.value, prop: propName },
        });
      }

      if (
        node.value.type === 'TemplateLiteral' &&
        node.value.expressions.length === 0 &&
        node.value.quasis.length === 1
      ) {
        const raw = node.value.quasis[0].value.cooked;
        if (isColorValue(raw)) {
          context.report({
            node: node.value,
            messageId: 'rawColor',
            data: { value: raw, prop: propName },
          });
        }
      }
    }

    return { Property: checkProperty };
  },
};
