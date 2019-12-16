# 🙋🏻‍♀️ Moritz Kröger Portfolio [![Netlify Status](https://api.netlify.com/api/v1/badges/9cda398d-be03-491b-a9ac-afdfd2245bc1/deploy-status)](https://app.netlify.com/sites/moritz/deploys)

Here lies the source code of my personal website [moritz.berlin](https://moritz.berlin). All code is open and free to use for everyone.

## Technology Stack

The website uses a static page generator running with Ruby to build the website, and Node.js to compile the front-end JavaScript.

### [Jekyll](http://jekyllrb.com/)

Static page generator, build with Ruby. Used to generate the entire website.

### [Rollup](https://rollupjs.org/)

Rollup is used to bundle all my JavaScript into a single file.

### [Font Face Observer](https://github.com/bramstein/fontfaceobserver)

This amazing tool helps me preventing a FOUC (flash of unstyled content) on my website, by observing if custom fonts are finished loading and applying a class to the `<body>`.

### [ESLint](https://github.com/eslint/eslint)

I use ESLint to keep my code base clean.
