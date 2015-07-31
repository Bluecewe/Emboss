# Emboss.js
Emboss.js is a JavaScript template engine. It enables for templates to be generated, with or without data, on the fly.

Emboss templates can contain Emboss language, embedded within standard HTML. The language enables HTML structures to be developed involving flow control and dynamic data.

As web development becomes more complex, especially in web apps, template engines significantly smooth the development process.

# Basic Example
Below is an example of a simple Emboss template. We will step through the important parts, showcasing key functionality.

```HTML
<!DOCTYPE html>
<html>
	<head>
		<title>Example</title>
		<script type="application/javascript" src="Emboss.js"></script>
		<script type="text/x-html-emboss" id="template1">
			{{if title && subtitle}}
				<h1>{{print title}}</h1>
				<h2>{{print subtitle}}</h2>
			{{/if}}
		</script>
		<script type="application/javascript">
			window.onload = function()
			{
				var templateData = {title: 'This Is A Title', subtitle: 'This is a subtitle!'};
				document.body.innerHTML = Emboss.compile(document.getElementById('template1'), templateData);
			};
		</script>
	</head>
	<body>
	</body>
</html>
```

First, Emboss must be included in the webpage. Nothing more is needed. The library will set itself up.

```HTML
<script type="application/javascript" src="Emboss.js"></script>
```

Next, we define a simple template in a script tag.

```HTML
<script type="text/x-html-emboss" id="template1">
	{{if title && subtitle}}
		<h1>{{print title}}</h1>
		<h2>{{print subtitle}}</h2>
	{{/if}}
</script>
```

The template consists of two HTML elements. Within each of these elements is an Emboss print tag. Both of these elements are enclosed within an Emboss if tag.

If tags output their contents if their condition is considered by JavaScript to be true. Here, if both the title and subtitle variables exist, the tag’s contents - the two HTML elements - will be output.

Print tags output a value. Here, the two print tags will output the values of the title and subtitle variables.

Now, the template needs to be compiled.

```HTML
<script type="application/javascript">
	window.onload = function()
	{
		var templateData = {title: 'This Is A Title', subtitle: 'This is a subtitle!'};
		document.body.innerHTML = Emboss.compile(document.getElementById('template1'), templateData);
	};
</script>
```

Once the page is loaded, we define some data in an object.

We provide the template, and the data object, to Emboss.compile().

Emboss will compile the template, and then return the output.

The page’s body tag is set to the output of the template compilation. The user will see the following in their page.

```HTML
This Is A Title
This is a subtitle!
```

This is a simple use of Emboss. See the second example for a showcase of Emboss’ more sophisticated capabilities.
