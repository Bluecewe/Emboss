# Emboss.js
Emboss.js is a JavaScript template engine. It enables for templates to be generated, with or without data, on the fly.

Emboss templates can contain Emboss language, embedded within standard HTML. The language enables HTML structures to be developed involving flow control and dynamic data.

As web development becomes more complex, especially in web apps, template engines significantly smooth the development process.

# Example
Below is an example of an Emboss template, showcasing key functionality.

```HTML
<script type="text/x-html-emboss" id="template1">
	<h1>{{print title}}</h1>
	<h2>{{print subtitle}}</h2>
	{{if typeof people !== 'undefined'}}
		<ul>
		{{for person in people count personCount}}
			{{import 'templatePerson' context person}}
		{{/for}}
		</ul>
	{{/if}}
	{{else}}
		<h1>People could not be found!</h1>
	{{/else}}
	{{if people[0].name == 'Bob'}}
		<h2>Bob is the first person!</h2>
	{{/if}}
	{{elseif people[0].name == 'Bill'}}
		<h2>Bill is the first person!</h2>
	{{/elseif}}
	{{else}}
		<h2>Bob and Bill are not the first person.</h2>
	{{/else}}
	{{execute console.log('Hello World!')}}
</script>
```

Below is a small template which is imported by the previous template.

```HTML
<script type="text/x-html-emboss" id="templatePerson">
	<li>{{print name}}, born {{print dateOfBirth}}, age {{print ((new Date(Date.now())).getFullYear() - dateOfBirth)}}</li>
</script>
```

The template can be provided with the following data.

```JavaScript
{title: 'People', subtitle: 'This is a list of people!', people: [{name: 'Bob', dateOfBirth: 1969}, {name: 'Bill', dateOfBirth: 1983}, {name: 'John', dateOfBirth: 1990}]}
```

Combined with this data, the template outputs the following.

```HTML
People

This is a list of people!

Bob, born 1969, age 46
Bill, born 1983, age 32
John, born 1990, age 25

Bob is the first person!
```
