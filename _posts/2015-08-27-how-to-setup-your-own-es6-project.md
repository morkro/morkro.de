---
layout: post
title: "How to setup an ES6 production-ready project"
excerpt: "Since ES6 got a really good hype this year and the specification has eventually been finished, I wanted to start using it. By today I have turned almost all my private projects and a couple of client projects into a solid ES6 setup."
tags:
 - ecmascript2015
 - javascript
---

As ES6 is really hyped this year and the specification has eventually been finished, I wanted to start using it. I have been _(okay I still am)_ the guy at work who took every chance talking about ES6 and all the glory it provides. Which might not have been the best idea with a lot of back-end developers joining the discussion:

> Sounds cool Moritz, but when can we use it? :trollface:

Sad to say that browser support is still under heavy development, and using it in a production environment was beyond considering. 
So I accepted our fate, having to wait for a couple of years. And what about _all_ the browser who won't have any ES6 features but still need to be supported? _Sigh_, let's add another few years.

Fortunately ES6 turns JavaScript into the [language for compilers](https://www.youtube.com/watch?v=PlmsweSNhTw). And there are already plenty of **ES6 to ES5** transpilers, which make it possible to write ES6 for production-ready projects today. _A dream comes true!_ By now I have turned almost all my private projects and a couple of client projects into a solid ES6 setup.

**In this article I want to share my experience on how to create a good production-ready ES6 setup for front-end projects.**

## Getting started: Choosing a transpiler

Compiler or transpiler? Let me explain this here because I was also confused when I first stumbled upon this. A **compiler** turns a high-level programming language into a low-level programming language. Whereas a **transpiler**, or [_source-to-source compiler_](https://en.wikipedia.org/wiki/Source-to-source_compiler), remains on the same level of complexity translating from one high-level programming language to another.

The **three major transpiler** out there are [Babel.js](https://babeljs.io/) with currently [**71%**](http://kangax.github.io/compat-table/es6/#babel) of feature compatibility, [Traceur](https://github.com/google/traceur-compiler) supporting [**59%**](http://kangax.github.io/compat-table/es6/#tr) and [TypeScript](http://www.typescriptlang.org/) with [**52%**](http://kangax.github.io/compat-table/es6/#typescript). This is already quite good and the majority of features are supported _(a lot of the unsupported features refer to Subclassing and Proxying)_. I recommend using Babel as it provides the best support and you probably want to feel as free as possible writing ES6. 

The features I tend to use the most are `=>` arrow functions, classes, `const` and `let`, template strings and modules. And I am really trying to find a good use case for generator functions. This can quickly change based on my project requirements though, but I guess this is what most developers will want to use at the beginning.

### Adding the final ES6 feeling

Babel is great, but lacks one huge feature: **ES6 modules**. [**Browserify**](http://browserify.org/) to the rescue! With its CommonJS support that is very similiar to modules, we can `require('modules')` in the browser and properly put all dependencies into bundles. For me it added the final _ES6 feel_.

## Combine and automate

Browserify + Babel is a common setup today and together they cover a lot of features which front-end developers are most interested about. Even though both have their own Command Line Interface, it is quite annoying and time consuming to type `$ browserify` everytime a file has been modified.
So I suggest to use a task runner, as this is part of a default front-end setup nowadays. 

For the rest of this article I will use **Grunt** as an example, but everything is easily portable to a Gulp setup.

### The project's structure

{% highlight plaintext %}
cool-es6-project/
├── dist/
│  ├── assets/...
│  ├── styles.min.css
│  ├── app.js
│  ├── index.html
├── src/
│  ├── scripts/
│  │  ├── module.js
│  │  ├── index.js
│  ├── styles/...
│  ├── assets/...
│  ├── index.html
├── Gruntfile.js
├── package.json
└── .eslintrc
{% endhighlight %}

This is very simplified for this article and would be more advanced in a bigger project. Feel free to have a look at my example boilerplate [FrontBook](https://github.com/morkro/FrontBook), where I also showcase `views/`, `assets/` and `styles/`.

### Create the `package.json`

A `package.json` usually contains relevant meta data for the project. Here are the ES6 `devDependencies`:

{% highlight json %}
{
  "name": "cool-es6-project",
  "devDependencies": {
    "grunt": "0.4.x",
    "babelify": "^6.1.2",
    "grunt-browserify": "^3.8.0",
    "grunt-eslint": "^16.0.0",
    "grunt-contrib-watch": "0.6.x"
  }
}
{% endhighlight %}

The modules used for this are:

- [`grunt`](http://gruntjs.com/): The JavaScript task runner
- [`babelify`](https://github.com/babel/babelify): Babel.js transformer for Browserify
- [`grunt-browserify`](https://github.com/jmreidy/grunt-browserify): Browserify Grunt task
- [`grunt-eslint`](https://github.com/sindresorhus/grunt-eslint): ESLint Grunt task
- [`grunt-contrib-watch`](https://github.com/gruntjs/grunt-contrib-watch): Grunt task to watch over changed files

Run `npm install` from the projects directory to make sure all dependencies are installed and you won't run into any errors.

### Define tasks in `Gruntfile.js`

{% highlight javascript %}
module.exports = function (grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('dev', ['browserify', 'eslint', 'watch']);
  grunt.registerTask('build', ['browserify', 'eslint']);

  grunt.initConfig({
    /**
     * Write ES6 today, compile it to ES5.
     */
    browserify: {
      dist: {
        options: {
          transform: [
            ['babelify', { loose: 'all' }]
          ],
          browserifyOptions: { debug: true }
        },
        files: {
          'dist/app.js': ['src/scripts/**/*.js']
        }
      }
    },
    /**
     * Validates ES6 files via ESLint.
     */
    eslint: {
      options: {
        configFile: '.eslintrc'
      },
      target: 'src/scripts/**/*.js'
    },
    /**
     * Run predefined tasks whenever watched files are added, 
     * modified or deleted.
     */
    watch: {
      scripts: {
        files: ['src/scripts/**/*.js'],
        tasks: ['browserify', 'eslint']
      }
    }
  });
};
{% endhighlight %}

We defined two tasks at the beginning: 

- `grunt build`: Compiles your ES6 code to proper ES5 code and tests it via ESLint.
- `grunt dev`: This is basically the same as `grunt build`, just with an additional `watch` task. So when anything changes in your code, everything will be compiled and linted automatically.

In the `browserify` task we define to use `babelify` with the `loose: 'all'` option. This tells babelify to keep the ES5 code as close as possible to the ES6 code. In `browserifyOptions` we add `debug: true`, which enables source maps for better debugging. There are a couple of more [Babel](http://babeljs.io/docs/usage/options/) and [Browserify](https://github.com/substack/node-browserify#var-b--browserifyfiles-or-opts) options available, but in the beginning this should be fine. The task then simply runs through all files in `src/scripts/` and compiles them to `dist/`.

### Linting

Code needs to be tested. I recently moved from JSHint to [**ESLint**](http://eslint.org/) just because I like the possibility of creating my own rules and all the other available options. For me it also felt slightly easier to get it to work with ES6 code.

My ES6 specific configurations are:

### `.eslintrc`

{% highlight json %}
{
  "env": {
    "browser": true,
    "es6": true
  },
  "ecmaFeatures": {
    "arrowFunctions": true,
    "binaryLiterals": true,
    "blockBindings": true,
    "classes": true,
    "defaultParams": true,
    "destructuring": true,
    "forOf": true,
    "generators": true,
    "modules": true,
    "objectLiteralComputedProperties": true,
    "objectLiteralDuplicateProperties": true,
    "objectLiteralShorthandMethods": true,
    "objectLiteralShorthandProperties": true,
    "octalLiterals": true,
    "regexUFlag": true,
    "regexYFlag": true,
    "spread": true,
    "superInFunctions": false,
    "templateStrings": true,
    "unicodeCodePointEscapes": true,
    "globalReturn": true,
    "jsx": true
  }
}
{% endhighlight %}
<div class="note--snippet">
	<p>Take a look at the rest of my <code>.eslintrc</code> configuration <a href="https://github.com/morkro/FrontBook/blob/master/.eslintrc" target="_blank">here</a>.</p>
</div>

Let's be honest: I just turned everything on because _I want all ES6 features_. If I don't want specific features, I would just disable them.

## Coding in ECMAScript 6

Our setup is ready and idly waiting to compile some ES6 code for us. Great! Let's start then. I assume that you at least have some knowledge of the [ES6 features](http://es6-features.org/) and how they work. I will only briefly showcase a few of these, including **modules**.

We will create a simple module using the new `class` syntax, `export` it and then `import` in our `index.js` to use it.

### `module.js`

{% highlight javascript %}
'use strict';

const INTERVAL = 1000;

class Timer {
  constructor(element) {
    this.element = element;
  }
  
  getTime() {
    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();

    return hours + ':' + minutes;
  }

  update() {
    this.element.textContent = this.getTime();

    setInterval(() => {
      this.element.textContent = this.getTime();
    }, INTERVAL);
  }
}

export default Timer;
{% endhighlight %}
<div class="note--snippet">
	<p>We could also use a template string in <code>getTime()</code>, but unfortunately the syntax highlighter I use don't support them yet.</p>
</div>

The `module.js` contains a class called `Timer`, which takes an HTML element as argument in its constructor function. The `const` variable `INTERVAL` is not accessible from outside of the file and neither is part of the global scope, even though it's used inside of the class. The class has a simple `getTime()` function to return the current time and an `update()` function to apply the current time to the HTML element passed in the constructor.

### `index.js`

{% highlight javascript %}
import Timer from './module.js';

let timeElement = new Timer( document.querySelector('time') );

timeElement.update();
{% endhighlight %}

This is pretty straight-forward. We imported the class, assigned it to the `timeElement` variable and called `update()` to initialise the module.

Pretty cool, isn't it? We don't have to worry much about the global scope anymore and can eventually think in a more modularised way. 

### The ES5 output

Since all this will be compiled to proper ES5 code, let's take a quick look at how the output looks like:

{% highlight javascript %}
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _moduleJs = require('./module.js');

var _moduleJs2 = _interopRequireDefault(_moduleJs);

var timeElement = new _moduleJs2['default'](document.querySelector('time'));

timeElement.update();

},{"./module.js":2}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var INTERVAL = 1000;

var Timer = (function () {
  function Timer(element) {
    _classCallCheck(this, Timer);

    this.element = element;
  }

  Timer.prototype.getTime = function getTime() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();

    return hours + ':' + minutes;
  };

  Timer.prototype.update = function update() {
    var _this = this;

    this.element.textContent = this.getTime();

    setInterval(function () {
      _this.element.textContent = _this.getTime();
    }, INTERVAL);
  };

  return Timer;
})();

exports['default'] = Timer;
module.exports = exports['default'];

},{}]},{},[1,2])
{% endhighlight %}

As you can see Browserify use a helper function at the beginning to bundle all modules in one single file. But what I think is most important here, is that the code of `module.js` and `index.js` pretty much look the same. You can easily recognise your code and still understand what is going on.

This file can be found in `dist/app.js` and should be included in your HTML views:

{% highlight html %}
<script type="text/javascript" src="app.js"></script>
{% endhighlight %}

## What to keep in mind

As mentioned earlier, some features not supported yet. Subclassing `Date`, `Array` and `DOM` doesn't work because of the limitations of ES5. It also depends a little bit on what your production environment will be like. Do you need to support Internet Explorer 8? Then keep in mind that `Object.defineProperty` (which is used to polyfill getters and setters) doesn't work there.

Babel has a short [table](https://babeljs.io/docs/advanced/caveats/) of its caveats.

### Babel and `Object.assign`

This is another thing. `Object.assign` is only supported with [Chrome 45 and Firefox 34](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Browser_compatibility). If you use it though, Babel won't polyfill it and just keep it as is. In order to add the polyfill, we have to modify our `transform` option in the `Gruntfile.js` to use the `runtime` transformer. 

There is also a [`babel-plugin-object-assign`](https://github.com/babel-plugins/babel-plugin-object-assign) plugin which replaces all occurences of `Object.assign` with an extend helper.

## Conclusion

So, that's it. We could now move on and extend this setup with a good view handling or add a CSS preprocessor such as Sass. Whatever fits your project. Thanks to **Babel** and **Browserify** it's already possible to _write_ ES6 code, but still _use_ ES5 code on the production environment. By that we can have a lot of fun **and** keep support for browser without complete feature support.

I have made own ES6 boilerplate called [**<img src="/../assets/logos/frontbook.svg" width="18" height="18" style="vertical-align:baseline;"> FrontBook**](https://github.com/morkro/FrontBook) open source and like to share it here. It also covers some more topics such as views, styles and assets. Feel free to check it out for your own projects and customise to your needs.

----

## TL;DR

A good ES6 setup requires three main dependencies: [Babel.js](https://babeljs.io/), [Browserify](http://browserify.org/) and a task runner such as [Grunt](http://gruntjs.com/) or [gulp](http://gulpjs.com/). Babel [covers 71%](http://kangax.github.io/compat-table/es6/#babel) of the ES6 feature set and Browserify adds the great module system. 

Running `$ browserify` in the command line every time you modify something is quite annoying and time consuming. Let's use a task runner for that. You will need:

- `grunt-browserify` using the `transform: ['babelify']` option,
- ideally a linter such as `grunt-eslint`,
- `grunt-watch` to check for any modified files.

Take care using features such as `Object.assign`, as this still needs an [additional plugin](https://github.com/babel-plugins/babel-plugin-object-assign) to work in all browser.