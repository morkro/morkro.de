# Moritz Kröger Portfolio [![Build Status](https://travis-ci.org/morkro/morkro.de.svg?branch=master)](https://travis-ci.org/morkro/morkro.de)
Here lies the source code of my personal website [moritz.berlin](http://moritz.berlin). All code is open and free to use for everyone.

## Technology Stack
The website uses a static page generator running with Ruby to build the website, and Node.js to compile the front-end JavaScript.

### [Jekyll](http://jekyllrb.com/)
Static page generator, build with Ruby. Used to generate the entire website.

### [Browserify](https://github.com/substack/node-browserify) + [Babel](https://github.com/babel/babel)
Browserify bundles my client-side JavaScript into one file (so I can use a module system while developing), and uses Babel to transpile my code into cross-browser compatible ES5 code.

### [Font Face Observer](https://github.com/bramstein/fontfaceobserver)
This amazing tool helps me preventing a FOUC (flash of unstyled content) on my website, by observing if custom fonts are finished loading and applying a class to the `<body>`.

### [ESLint](https://github.com/eslint/eslint)
I use ESLint to keep my code base clean.
