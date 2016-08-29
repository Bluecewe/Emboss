'use strict';

(function()
{
	// Library Initialisation
	if (window.Emboss)
	{
		throw 'EmbossError: Emboss could not be initialised due to name conflict.';
	}
	else
	{
		window.Emboss = new Emboss();
	};
	// Library
	function Emboss()
	{
		var embossBlocksExpression = /({{.*?}})/i;
		var keywords = {
			print: 'print',
			if: 'if',
			elseif: 'elseif',
			else: 'else',
			for: 'for',
			each: 'each',
			import: 'import',
			execute: 'execute',
			ignore: 'ignore',
			neglect: 'neglect'
		};
		var secondOrderKeywords = {
			in: 'in',
			count: 'count',
			key: 'key',
			context: 'context'
		};
		var childlessKeywords = {
			print: 'print',
			import: 'import',
			execute: 'execute'
		};
		var basicVariableExpression = /^[a-z_][\w]*$/i;
		var bloatspace = /[\f\n\r\t\v​\u00A0\u1680​\u180e\u2000​\u2001\u2002​\u2003\u2004​\u2005\u2006​\u2007\u2008​\u2009\u200a​\u2028\u2029​\u2028\u2029​\u202f\u205f​\u3000]/g;
		var precompiledTemplates = {};
		var strictScoping = true;
		// Getters and Setters
		Object.defineProperty(this, 'strictScoping',
		{
			get: function()
			{
				return strictScoping;
			},
			set: function(value)
			{
				if (typeof value === 'boolean')
				{
					strictScoping = value;
				}
				else
				{
					throwError('strictScoping must be boolean.', null, null, true);
				};
			}
		});
		// Public
		this.compile = function(source)
		{
			var validatedSource = validateTemplateSource(source);
			var tree = getBlockTree(validatedSource.validatedSource, validatedSource.templateID);
			var precompiledTemplate = generatePrecompiledTemplate(tree, validatedSource.templateID);
			return precompiledTemplate;
		};
		this.render = function(template, data)
		{
			data = validateTemplateData(data);
			if (typeof template === 'function')
			{
				return internalRender(template, data);
			}
			else if (template instanceof HTMLScriptElement || typeof template === 'string')
			{
				return internalRender(this.compile(template), data);
			}
			else
			{
				throwError('Template must be HTMLScriptElement, function, or string.');
			};
		};
		this.bulkPrecompile = function()
		{
			var bulkPrecompiledTemplates = [];
			var scriptElements = document.getElementsByTagName('script');
			for (var scriptIndex = 0; scriptIndex < scriptElements.length; scriptIndex++)
			{
				var scriptElement = scriptElements.item(scriptIndex);
				if (scriptElement.getAttribute('type') == 'text/x-html-emboss')
				{
					var ignore = false;
					if (scriptElement.dataset.embossIgnore)
					{
						if (scriptElement.dataset.embossIgnore === 'true')
						{
							ignore = true;
						};
					};
					if (!ignore)
					{
						var precompiledTemplateAssigned = 'Emboss.storePrecompiledTemplate(' + this.compile(scriptElement) + ', "' + scriptElement.id + '");';
						bulkPrecompiledTemplates.push(precompiledTemplateAssigned);
					};
				};
			};
			var saveAnchor = document.createElement('a');
			var blob = new Blob(bulkPrecompiledTemplates, {type: 'application/javascript'});
			saveAnchor.href = URL.createObjectURL(blob);
			saveAnchor.download = 'precompiledTemplates.js';
			saveAnchor.click();
		};
		this.storePrecompiledTemplate = function(precompiledTemplate, id)
		{
			if (typeof precompiledTemplate !== 'function')
			{
				throwError('Precompiled template must be of type function to store.', null, null, true);
			};
			if (precompiledTemplates[id])
			{
				console.log('EmbossWarning: Stored precompiled template overwritten due to ID conflict.', null, null, true);
			};
			precompiledTemplates[id] = precompiledTemplate;
		};
		this.getPrecompiledTemplate = function(id)
		{
			return precompiledTemplates[id];
		};
		// Private
		// Functionality Methods
		function internalRender(compiledTemplate, data)
		{
			try
			{
				return compiledTemplate.call({}, data);
			}
			catch (ErrorEvent)
			{
				throwError('Error during template render. Ensure JavaScript expressions are valid and all integral data is being provided. Error reported by JavaScript: \n' + ErrorEvent.message, null, null, true);
			};
		};
		function validateTemplateSource(source)
		{
			var validatedSource = null;
			var templateID = null;
			if (source === undefined || source === null)
			{
				throwError('Source undefined or null.');
			}
			else
			{
				if (source instanceof HTMLScriptElement)
				{
					validatedSource = source.innerHTML;
					templateID = source.id;
				}
				else if (typeof source === 'string')
				{
					validatedSource = source;
				}
				else
				{
					throwError('Source must be HTMLScriptElement or string.');
				};
			};
			validatedSource = validatedSource.replace(bloatspace, '');
			return {validatedSource: validatedSource, templateID: templateID};
		};
		function validateTemplateData(data)
		{
			var validatedData = null;
			if (typeof data === 'object')
			{
				validatedData = data;
			}
			else if (typeof data === 'undefined')
			{
				validatedData = null;
			}
			else
			{
				throwError('Data must be JSON-compatible object.');
			};
			return validatedData;
		};
		function getBlockTree(blockSource, templateID)
		{
			var blocks = blockSource.split(embossBlocksExpression);
			while (blocks.indexOf('') !== -1)
			{
				blocks.splice(blocks.indexOf(''), 1);
			};
			var blockPointer = null;
			var blockStack = [];
			var blockTree = [];
			for (var blockIndex = 0; blockIndex < blocks.length; blockIndex++)
			{
				var blockText = blocks[blockIndex];
				var pair = getBlockKeywordArgumentPair(blockText);
				var keyword = pair.keyword;
				var argument = pair.argument;
				var closer = pair.closer;
				var outputBlockText = false;
				if (keywords[keyword])
				{
					var blockIgnored = false;
					var blockNeglected = false;
					if (blockStack.length > 0)
					{
						var frontStackBlock = blockStack[blockStack.length - 1];
						if (frontStackBlock.keyword === keywords['ignore'])
						{
							if (closer && keyword === keywords['ignore'])
							{
								blockStack.pop();
								blockPointer = blockPointer.parent;
							};
							blockIgnored = true;
						}
						else if (frontStackBlock.keyword === keywords['neglect'])
						{
							if (closer && keyword === keywords['neglect'])
							{
								blockStack.pop();
								blockPointer = blockPointer.parent;
							}
							else
							{
								outputBlockText = true;
							};
							blockNeglected = true;
						};
					};
					if (!(blockIgnored || blockNeglected))
					{
						if (closer)
						{
							if (blockStack.length === 0)
							{
								throwError('No opening tag: got closer "' + keyword + '" without opener.');
							}
							else
							{
								var openerBlock = blockStack.pop();
								if (openerBlock.keyword === keyword)
								{
									blockPointer = blockPointer.parent;
								}
								else
								{
									throwError('Invalid closer: got "' + keyword + '", expected "' + openerBlock.keyword + '".');
								};
							};
						}
						else
						{
							var newBlock = new Block(blockPointer, blockText, keyword, argument, templateID);
							if (keyword !== keywords['ignore'])
							{
								addBlockToTree(blockTree, blockPointer, newBlock);
							};
							if (keywords[childlessKeywords[keyword]])
							{
								if (keyword === keywords['import'])
								{
									var importArguments = conductImportStatement(newBlock);
									var importedScriptElement = conductImportStatement(newBlock);
									var validatedSource = validateTemplateSource(importArguments.scriptElement);
									var importedTree = getBlockTree(validatedSource.validatedSource, importArguments.templateID);
									for (var importedTreeBlockIndex = 0; importedTreeBlockIndex < importedTree.length; importedTreeBlockIndex++)
									{
										var importedBlock = importedTree[importedTreeBlockIndex];
										newBlock.appendChildBlock(importedBlock);
									};
								};
							}
							else
							{
								blockStack.push(newBlock);
								blockPointer = newBlock;
							};
						};
					};
				}
				else
				{
					outputBlockText = true;
				};
				if (outputBlockText)
				{
					addBlockToTree(blockTree, blockPointer, blockText);
				};
			};
			if (blockStack.length > 0)
			{
				var openerBlock = blockStack[blockStack.length - 1];
				throwError('No closing tag: got "' + openerBlock.keyword + '" without closer.');
			};
			return blockTree;
		};
		function getBlockKeywordArgumentPair(blockText)
		{
			blockText = blockText.replace(/[{}]/g, '');
			var spaceIndex = blockText.indexOf(' ');
			var keyword = blockText;
			var argument = '';
			var closer = false;
			if (spaceIndex > -1)
			{
				keyword = blockText.slice(0, spaceIndex);
				argument = blockText.slice(spaceIndex + 1);
			};
			if (keyword.substring(0, 1) === '/')
			{
				closer = true;
				keyword = keyword.substring(1);
			};
			return {keyword: keyword, argument: argument, closer: closer};
		};
		function addBlockToTree(blockTree, blockPointer, block)
		{
			if (blockPointer)
			{
				blockPointer.appendChildBlock(block);
			}
			else
			{
				blockTree.push(block);
			};
		};
		function conductImportStatement(block)
		{
			var firstDelimiterIndex = block.argument.indexOf('\'');
			var secondDelimiterIndex = -1;
			if (firstDelimiterIndex > -1)
			{
				secondDelimiterIndex = block.argument.indexOf('\'', firstDelimiterIndex + 1);
			};
			if (firstDelimiterIndex > -1 && secondDelimiterIndex > -1)
			{
				var templateID = block.argument.substring(firstDelimiterIndex + 1, secondDelimiterIndex);
				var scriptElement = document.getElementById(templateID);
				if (scriptElement)
				{
					return {scriptElement: scriptElement, templateID: templateID};
				}
				else
				{
					throwError('Could not find script element for import expression.', block);
				};
			}
			else
			{
				throwError('Missing script ID in import expression.', block);
			};
		};
		function generatePrecompiledTemplate(tree, templateID)
		{
			var code = 'var EmbossInternalData = {};';
			code += 'if (templateData){';
			code += 'for (EmbossInternalData.templateDataIndex = 0; EmbossInternalData.templateDataIndex < Object.keys(templateData).length; EmbossInternalData.templateDataIndex++){';
			code += 'EmbossInternalData.templateDataKey = Object.keys(templateData)[EmbossInternalData.templateDataIndex];';
			code += 'if (EmbossInternalData.templateDataKey === "EmbossInternalData"){throw {message: "EmbossError: Template data keys may not use \'EmbossInternalData\' name."}};';
			code += 'eval("var " + EmbossInternalData.templateDataKey + " = " + JSON.stringify(templateData[EmbossInternalData.templateDataKey]) + ";");';
			code += '};};';
			code += 'var compiledHTML = "";';
			code += inspectChildren(tree, {loopIndexIdentifierCount: 0}, null);
			code += 'return compiledHTML;';
			try
			{
				var precompiledTemplate = new Function('templateData', code);
			}
			catch (ErrorEvent)
			{
				throwError('Error in template. Ensure JavaScript expressions are valid. Error reported by JavaScript: \n' + ErrorEvent.message, null, templateID);
			};
			return precompiledTemplate;
		};
		function inspectChildren(children, loops, importScope)
		{
			var childrenCode = '';
			var ifPointer = null;
			for (var blockIndex = 0; blockIndex < children.length; blockIndex++)
			{
				var block = children[blockIndex];
				var isBlockConditional = true;
				if (block instanceof Block)
				{
					if (block.keyword === keywords['if'])
					{
						ifPointer = block;
					}
					else if (block.keyword === keywords['elseif'] || block.keyword === keywords['else'])
					{
						if (!ifPointer)
						{
							throwError('Must be preceded by if tag.', block);
						};
					}
					else
					{
						isBlockConditional = false;
					};
				}
				else
				{
					isBlockConditional = false;
				};
				if (!isBlockConditional)
				{
					if (ifPointer)
					{
						ifPointer = null;
						childrenCode += ';';
					};
				};
				childrenCode += inspectBlock(block, loops, importScope);
			};
			return childrenCode;
		};
		function inspectBlock(block, loops, importScope)
		{
			var blockCode = [];
			if (block instanceof Block)
			{
				if (block.keyword === keywords['if'])
				{
					blockCode += 'if (' + block.argument + '){';
					blockCode += inspectChildren(block.children, loops, importScope);
					blockCode += '}';
				}
				else if (block.keyword === keywords['elseif'])
				{
					blockCode += 'else if (' + block.argument + '){';
					blockCode += inspectChildren(block.children, loops, importScope);
					blockCode += '}';
				}
				else if (block.keyword === keywords['else'])
				{
					blockCode += 'else {';
					blockCode += inspectChildren(block.children, loops, importScope);
					blockCode += '}';
				}
				else if (block.keyword === keywords['for'])
				{
					if (strictScoping)
					{
						blockCode += '(function(){';
					};
					blockCode += 'for (' + block.argument + '){';
					blockCode += inspectChildren(block.children, loops, importScope);
					blockCode += '};';
					if (strictScoping)
					{
						blockCode += '})();';
					};
				}
				else if (block.keyword === keywords['each'])
				{
					var eachArguments = getEachArguments(block);
					var loopIndexIdentifier = 'loopIndexIdentifier' + loops.loopIndexIdentifierCount;
					loops.loopIndexIdentifierCount++;
					if (strictScoping)
					{
						blockCode += '(function(){';
					};
					blockCode += 'for (EmbossInternalData.' + loopIndexIdentifier + ' = 0; EmbossInternalData.' + loopIndexIdentifier + ' < Object.keys(' + eachArguments.arrayExpression + ').length; EmbossInternalData.' + loopIndexIdentifier + '++){';
					if (eachArguments.keyIdentifier)
					{
						blockCode += 'var ' + eachArguments.keyIdentifier + ' = [Object.keys(' + eachArguments.arrayExpression + ')[EmbossInternalData.' + loopIndexIdentifier + ']];';
						blockCode += 'var ' + eachArguments.itemIdentifier + ' = ' + eachArguments.arrayExpression + '[' + eachArguments.keyIdentifier + '];';
					}
					else
					{
						blockCode += 'var ' + eachArguments.itemIdentifier + ' = ' + eachArguments.arrayExpression + '[Object.keys(' + eachArguments.arrayExpression + ')[EmbossInternalData.' + loopIndexIdentifier + ']];';
					};
					if (eachArguments.countIdentifier)
					{
						blockCode += 'var ' + eachArguments.countIdentifier + ' = EmbossInternalData.' + loopIndexIdentifier + ';';
					};
					blockCode += inspectChildren(block.children, loops, importScope);
					blockCode += '};';
					if (strictScoping)
					{
						blockCode += '})();';
					};
				}
				else if (block.keyword === keywords['print'])
				{
					blockCode += 'compiledHTML += ' + block.argument + ';';
				}
				else if (block.keyword === keywords['neglect'])
				{
					blockCode += inspectChildren(block.children, loops, importScope);
				}
				else if (block.keyword === keywords['import'])
				{
					var contextFound = false;
					var firstDelimiterIndex = block.argument.indexOf('\'');
					var secondDelimiterIndex = block.argument.indexOf('\'', firstDelimiterIndex);
					var contextKeywordIndex = block.argument.indexOf(secondOrderKeywords['context']);
					if (contextKeywordIndex > -1)
					{
						var augmentedImportScope = null;
						var contextExpressionIndex = contextKeywordIndex + (secondOrderKeywords['context'].length + 1);
						var contextExpression = block.argument.substring(contextExpressionIndex, block.argument.length);
						if (contextExpression.trim().length > 0)
						{
							contextFound = true;
						}
						else
						{
							throwError('Context argument missing.', block);
						};
					};
					if (contextFound)
					{
						if (strictScoping)
						{
							blockCode += '(function(){';
						};
						blockCode += 'for (EmbossInternalData.contextDataIndex = 0; EmbossInternalData.contextDataIndex < Object.keys(' + contextExpression + ').length; EmbossInternalData.contextDataIndex++){';
						blockCode += 'EmbossInternalData.contextDataKey = Object.keys(' + contextExpression + ')[EmbossInternalData.contextDataIndex];';
						blockCode += 'if (EmbossInternalData.contextDataKey === "EmbossInternalData"){throw {message: "EmbossError: Template data keys may not use \'EmbossInternalData\' name."}};';
						blockCode += 'eval("var " + EmbossInternalData.contextDataKey + " = " + JSON.stringify(' + contextExpression + '[EmbossInternalData.contextDataKey]) + ";");';
						blockCode += '};';
					};
					blockCode += inspectChildren(block.children, loops, importScope);
					if (strictScoping && contextFound)
					{
						blockCode += '})();';
					};
				}
				else if (block.keyword === keywords['execute'])
				{
					blockCode += block.argument + ';';
				};
			}
			else if (typeof(block) == 'string')
			{
				blockCode += 'compiledHTML += ' + JSON.stringify(block) + ';';
			}
			else
			{
				throwError('Unknown block type.');
			};
			return blockCode;
		};
		function getEachArguments(block)
		{
			var argument = block.argument.trim();
			var frontPartExpression = /^([a-z_][\w]*) in /;
			var backPartExpression = /(?: (count|key) ([a-z_][\w]*)(?: (count|key) ([a-z_][\w]*))?)$/;
			var frontPart = frontPartExpression.exec(argument);
			var backPart = backPartExpression.exec(argument);
			var itemIdentifier = null;
			var arrayExpression = null;
			var countIdentifier = null;
			var keyIdentifier = null;
			if (frontPart)
			{
				itemIdentifier = frontPart[1];
				if (itemIdentifier)
				{
					if (backPart)
					{
						arrayExpression = argument.substring(frontPartExpression.exec(argument)[0].length, backPartExpression.exec(argument).index);
						var keywords = [{keyword: backPart[1], identifier: backPart[2]}, {keyword: backPart[3], identifier: backPart[4]}];
						for (var index in keywords)
						{
							var keyword = keywords[index];
							if (keyword.keyword)
							{
								if (keyword.keyword === secondOrderKeywords['count'])
								{
									countIdentifier = keyword.identifier;
								}
								else
								{
									keyIdentifier = keyword.identifier;
								};
							};
						};
					}
					else
					{
						arrayExpression = argument.substring(frontPart[0].length, argument.length);
					};
				}
				else
				{
					throwError('Item identifier not found.', block);
				};
			}
			else
			{
				throwError('Each arguments not found.', block);
			};
			return {itemIdentifier: itemIdentifier, arrayExpression: arrayExpression, countIdentifier: countIdentifier, keyIdentifier: keyIdentifier};
		};
		// Utility Methods
		function throwError(errorMessage, block, templateID, omitTemplate)
		{
			if (!templateID)
			{
				var templateID = 'Anonymous Template';
			};
			var blockExpression = '';
			if (block)
			{
				blockExpression = 'Error in block ("' + block.keyword + ' ' + block.argument + '"): ';
				templateID = 'Template: ' + block.templateID;
			};
			if (omitTemplate)
			{
				var templateID = '';
			}
			else
			{
				var templateID = ' (' + templateID + ')';
			};
			throw ('EmbossError' + templateID + ': ' + blockExpression + errorMessage);
		};
		// Objects
		function Block(parent, text, keyword, argument, templateID)
		{
			this.parent = parent;
			this.text = text;
			this.keyword = keyword;
			this.argument = argument;
			this.templateID = templateID;
			this.children = [];
			this.appendChildBlock = function(block)
			{
				this.children.push(block);
			};
		};
	};
}
)();