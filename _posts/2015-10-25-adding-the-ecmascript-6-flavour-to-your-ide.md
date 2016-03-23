---
layout: post
title: "Adding the ECMAScript 6 flavour to your IDE"
excerpt: "Using ECMAScript 6 features is all cool and feels good, but all that makes little sense without syntax support in an IDE."
classes: article
tags:
 - javascript
---

Using ECMAScript 6 features is all cool and feels good, but all that makes little sense without syntax support in an IDE. Since the specification just has been finished earlier this year, some IDE's still don't support the syntax yet and need some little extra work.

Everyone has their favourite IDE and I can't cover them all. At my work the most used ones are **Sublime Text 3**, **Visual Studio Code**, and **WebStorm**. I think that roughly represents usage in the web developer community, hence I will only cover these.

## Visual Studio Code

With the [June 2015 release](http://blogs.msdn.com/b/vscode/archive/2015/07/06/vs-code-es6.aspx) VSCode finally supports ES6 syntax. Unfortunately it's not activated by default and needs a `jsconfig.json` file in the projects directory. This is a bummer for me, as it kinda feels like still in beta and is just inconvinient.

<div class="clearfix">
<p class="left" style="width:50%;">
Place the <code>jsconfig.json</code> in your project directory <em>(it could also be in the source folder)</em>, restart Visual Studio Code and you will see that all warnings are gone.
</p>
<div class="right" style="width:45%;">
{% highlight json %}
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs"
  }
}
{% endhighlight %}
</div>
</div>

<div class="clearfix" style="margin-top:15px;">
    <div class="left" style="width:48%;">
        <strong>Before:</strong>
        <a href="/../assets/img/2015-10/vsc-without-es6.png" target="_blank"><img class="screenshot" src="/../assets/img/2015-10/vsc-without-es6.png"></a>
    </div>
    <div class="right" style="width:48%;">
        <strong>After, yay!</strong>
        <a href="/../assets/img/2015-10/vsc-with-es6.png" target="_blank"><img class="screenshot" src="/../assets/img/2015-10/vsc-with-es6.png"></a>
    </div>
</div>

## Sublime Text 3

What I really like about Sublime Text is, that it's just a simple text editor which you can upgrade and set up as you want. You are not forced to live with a bloated IDE full of features, but can only install these you really need.

Of course this also has a downside: everything is a bit more complicated. You need to search for the right plugin and feature yourself and if that doesn't work, continue searching.

In this case it wasn't as complicated as I feared in the beginning. I switched between two plugins since and am really happy with the latest.

I started with [JavaScriptNext](https://packagecontrol.io/packages/JavaScriptNext%20-%20ES6%20Syntax) (works for both Sublime Text 2 and 3) and used the highlighter for a few month. It works fine though, except that it doesn't come with support for JSX syntax. A bummer while working on React projects.

<a href="/../assets/img/2015-10/sublimetext-es6-jsnext.png" target="_blank"><img class="screenshot" src="/../assets/img/2015-10/sublimetext-es6-jsnext.png"></a>

Hence I decided to switch and discovered [babel-sublime](https://github.com/babel/babel-sublime) with support for ES6 and JSX syntax (you can it find as **Babel** through Package Control). In my opinion it even looked a bit prettier compared to JavaScriptNext.

<a href="/../assets/img/2015-10/sublimetext-es6-babel.png" target="_blank"><img class="screenshot" src="/../assets/img/2015-10/sublimetext-es6-babel.png"></a>

### Setting as the default syntax

If you don't want to manually change the syntax highlighter everytime you open a JavaScript file, you need to set the plugin as default.

- Open a `.js` or `.jsx` file,
- select `View`, go to `Syntax` -> `Open all with current extension as...`,
- and choose `Babel` -> `JavaScript (Babel)`

## WebStorm

WebStorm is the easiest one of all three. You simply activate ECMAScript 6 highlighting in the settings and you're set. Go to `Preferences` -> `Languages & Frameworks` -> `JavaScript` and set the language version to `ECMAScript 6`. *You might also turn `Prefer Strict mode` on, if you don't have it already.*

<a href="/../assets/img/2015-10/webstorm-es6.png" target="_blank"><img class="screenshot" src="/../assets/img/2015-10/webstorm-es6.png"></a>

## Conclusion

Well and that's it. I hope that upcoming JavaScript updates will be supported quicker in our IDE's. This year was a bit annoying because of the slow support. The reason for it might be that there hasn't been a new version since ES5.1 in 2009, but next year we will already get ES2016 (or ES7).

JavaScript development will evolve faster than ever and our tools need to keep up.