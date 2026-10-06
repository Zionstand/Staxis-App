/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw numeric literals for typography and radius properties in style objects. Use Type/Radius/Spacing tokens from staxis-theme instead.',
    },
    messages: {
      rawFontSize:
        'Raw fontSize {{value}}. Use a Type preset from @/constants/staxis-theme (e.g. Type.cardTitle).',
      rawLetterSpacing:
        'Raw letterSpacing {{value}}. Use a Type preset from @/constants/staxis-theme.',
      rawLineHeight:
        'Raw lineHeight {{value}}. Use a Type preset from @/constants/staxis-theme.',
      rawRadius:
        'Raw borderRadius {{value}}. Use Radius.sm/md/lg/pill from @/constants/staxis-theme.',
    },
    schema: [],
  },

  create(context) {
    const FONT_PROPS = new Set(['fontSize']);
    const SPACING_LETTER = new Set(['letterSpacing']);
    const LINE_HEIGHT = new Set(['lineHeight']);
    const RADIUS_PROPS = new Set([
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderTopStartRadius',
      'borderTopEndRadius',
      'borderBottomStartRadius',
      'borderBottomEndRadius',
    ]);

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

      if (!propName) return;
      if (!isInsideStyleSheet(node) && !isInsideStyleProp(node)) return;

      const isLiteral =
        node.value.type === 'Literal' && typeof node.value.value === 'number';
      const isNegativeUnary =
        node.value.type === 'UnaryExpression' &&
        node.value.operator === '-' &&
        node.value.argument?.type === 'Literal' &&
        typeof node.value.argument.value === 'number';

      if (!isLiteral && !isNegativeUnary) return;

      const numValue = isLiteral
        ? node.value.value
        : -node.value.argument.value;

      if (FONT_PROPS.has(propName)) {
        context.report({
          node: node.value,
          messageId: 'rawFontSize',
          data: { value: numValue },
        });
      } else if (SPACING_LETTER.has(propName)) {
        context.report({
          node: node.value,
          messageId: 'rawLetterSpacing',
          data: { value: numValue },
        });
      } else if (LINE_HEIGHT.has(propName)) {
        context.report({
          node: node.value,
          messageId: 'rawLineHeight',
          data: { value: numValue },
        });
      } else if (RADIUS_PROPS.has(propName)) {
        context.report({
          node: node.value,
          messageId: 'rawRadius',
          data: { value: numValue },
        });
      }
    }

    return { Property: checkProperty };
  },
};
