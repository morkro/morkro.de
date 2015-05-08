/**
 * Grunt: Tasks
 */
module.exports = function(grunt) {
	'use strict';
	
	// Combines all CSS related tasks.
	grunt.registerTask('css', [
		'sass',
		'autoprefixer',
		'cssmin'
	]);

	// Task to build the dev environment.
	grunt.registerTask('dev', [
		'clean:build',	// Remove public folder
		'css',			// Sass, Autoprefixer, CSSmin
		'copy',			// Copy files into /public folder
		'jshint',		// JSHint all JavaScript
		'concat',		// Concat JS, copy libraries into /public and add auth url.
		'notify'			// Note user that everything went fine.
	]);

	// Task to build the prod environment.
	grunt.registerTask('prod', [
		'clean:prod',	// Remove public folder
		'css',			// Sass, Autoprefixer, CSSmin
		'copy',			// Copy files into /public folder
		'jshint',		// JSHint all JavaScript
		'concat',		// Concat JS, copy libraries into /public and add auth url.
		'compress'		// Creates .zip file of output
	]);
};