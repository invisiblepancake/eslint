/**
 * @fileoverview Rule to flag when a function has too many parameters
 * @author Ilya Volodin
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const astUtils = require("./utils/ast-utils");
const { upperCaseFirst } = require("../shared/string-utils");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../shared/types').Rule} */
module.exports = {
	meta: {
		type: "suggestion",

		docs: {
			description:
				"Enforce a maximum number of parameters in function definitions",
			recommended: false,
			url: "https://eslint.org/docs/latest/rules/max-params",
		},

		schema: [
			{
				oneOf: [
					{
						type: "integer",
						minimum: 0,
					},
					{
						type: "object",
						properties: {
							maximum: {
								type: "integer",
								minimum: 0,
							},
							max: {
								type: "integer",
								minimum: 0,
							},
							countVoidThis: {
								type: "boolean",
								description:
									"Whether to count a `this` declaration when the type is `void`.",
							},
						},
						additionalProperties: false,
					},
				],
			},
		],
		messages: {
			exceed: "{{name}} has too many parameters ({{count}}). Maximum allowed is {{max}}.",
		},
	},

	create(context) {
		const sourceCode = context.sourceCode;
		const option = context.options[0];
		let numParams = 3;
		let countVoidThis = false;

		if (typeof option === "object") {
			if (
				Object.hasOwn(option, "maximum") ||
				Object.hasOwn(option, "max")
			) {
				numParams = option.maximum || option.max;
			}
			if (Object.hasOwn(option, "countVoidThis")) {
				countVoidThis = option.countVoidThis;
			}
		}
		if (typeof option === "number") {
			numParams = option;
		}

		/**
		 * Removes 'this' parameter with void type annotation from parameter count
		 * @param {ASTNode} node The node to process.
		 * @returns {ASTNode} The processed node.
		 * @private
		 */
		function removeVoidThisParam(node) {
			if (
				node.params.length === 0 ||
				node.params[0].type !== "Identifier" ||
				node.params[0].name !== "this" ||
				node.params[0].typeAnnotation?.typeAnnotation.type !==
					"TSVoidKeyword"
			) {
				return node;
			}

			return {
				...node,
				params: node.params.slice(1),
			};
		}

		/**
		 * Checks a function to see if it has too many parameters.
		 * @param {ASTNode} node The node to check.
		 * @returns {void}
		 * @private
		 */
		function checkFunction(node) {
			const processedNode = !countVoidThis
				? removeVoidThisParam(node)
				: node;

			if (processedNode.params.length > numParams) {
				context.report({
					loc: astUtils.getFunctionHeadLoc(node, sourceCode),
					node,
					messageId: "exceed",
					data: {
						name: upperCaseFirst(
							astUtils.getFunctionNameWithKind(node)
						),
						count: processedNode.params.length,
						max: numParams,
					},
				});
			}
		}

		return {
			FunctionDeclaration: checkFunction,
			ArrowFunctionExpression: checkFunction,
			FunctionExpression: checkFunction,
			TSDeclareFunction: checkFunction,
			TSFunctionType: checkFunction,
		};
	},
};
