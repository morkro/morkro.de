/**
 * Grunt setup to build and watch your application.
 * ==============================
 * 
 * Usage:
 *	'grunt dev'			=>		Sets up development environment.
 *	'grunt css'			=>		Compiles Sass to valid CSS, adds relevant vendor prefixes and minifies. 
 * 'grunt js'			=>		Description coming soon.
 * 'grunt watch'		=>		Runs our predefined tasks whenever a file is updated. 
 *									Should be active the whole time while developing.
 * 
 */

module.exports = function(grunt) {
	'use strict';

	// Loads all required grunt tasks which are defined in devDepencies.
	require('load-grunt-tasks')(grunt);

	// Displays execution time of each task in Terminal.
	require('time-grunt')(grunt);

	// Register all grunt tasks.
	grunt.loadTasks('tasks');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// App settings.
		// ==============================
		app: {
			title: 'Moritz Kröger',
			description: 'Digital portfolio of Moritz Kröger',
			update: grunt.template.today('yyyy/mm/dd'),
			directory: {
				dest: {
					'public'	: 'public',
					'assets'	: '<%= app.directory.dest.public %>/assets',
					'scripts': '<%= app.directory.dest.public %>/scripts',
					'markup'	: '<%= app.directory.dest.public %>/markup',
					'css'		: '<%= app.directory.dest.public %>/css'
				},
				build: {
					'sass'	: 'styles/sass',
					'css'		: 'styles/css',
					'assets'	: 'assets',	
					'fonts'	: '<%= app.directory.build.assets %>/fonts',
					'scripts': 'scripts',
					'markup'	: 'markup'
				}
			},
			scripts: [
				/* App initialisation */
				'<%= app.directory.build.scripts %>/app.init.js'
			]
		},

		// Copies files into directory.
		// ==============================
		copy: {
			index: {
				src: '<%= app.directory.build.markup %>/index.html',
				dest: '<%= app.directory.dest.public %>/index.html',
				options: {
					process: function(content, path) {
						var cnt = content;

						cnt = cnt.replace(/<!--\[grunt:app.title\]-->/gm, grunt.config.get('app.title'));
						cnt = cnt.replace(/<!--\[grunt:app.description\]-->/gm, grunt.config.get('app.description'));
						cnt = cnt.replace(/<!--\[grunt:app.author\]-->/gm, grunt.config.get('pkg.author.name'));

						return cnt;
					}
				}
			},
			humans: {
				src: 'humans.txt',
				dest: '<%= app.directory.dest.public %>/humans.txt',
				options: {
					process: function(content, path) {
						var cnt = content;

						cnt = cnt.replace(/<!--\[grunt:app.author.name\]-->/gm, grunt.config.get('pkg.author.name'));
						cnt = cnt.replace(/<!--\[grunt:app.author.email\]-->/gm, grunt.config.get('pkg.author.email'));
						cnt = cnt.replace(/<!--\[grunt:app.update\]-->/gm, grunt.config.get('app.update'));

						return cnt;
					}
				}
			},
			views: {
				expand	: true,
				src		: [
					'<%= app.directory.build.markup %>/imprint.html',
				],
				dest		: '<%= app.directory.dest.markup %>',
				flatten	: true,
				filter	: 'isFile'
			},
			assets: {
				expand	: true,
				src		: '<%= app.directory.build.assets %>/**/*.*',
				dest		: '<%= app.directory.dest.public %>'
			}
		},

		// Deletes files
		// ==============================
		clean: {
			build: {
				src: ['<%= app.directory.dest.public %>']
			}
		},

		// Concatenate files.
		// ==============================
		concat: {
			app: {
				src: '<%= app.scripts %>',
				dest: '<%= app.directory.dest.scripts %>/app.js'
			},
		},

		// Validates your .js files via JSHint.
		// ==============================
		jshint: {
			options: {
				reporter	: require('jshint-stylish'),
				strict	: true,
				eqeqeq	: true,
				noempty	: true,
				sub		: true,
				esnext	: true
			},
			beforeconcat: '<%= app.directory.build.scripts %>/**/*.js'
		},

		// Compiles Sass into valid CSS.
		// ==============================
		sass: {
			options: {
				style: 'compact'
			},
			files: {
				src:  '<%= app.directory.build.sass %>/main.scss',
				dest: '<%= app.directory.build.css %>/main.unprefixed.css'
			}
		},

		// Adds all relevant prefixe based on Caniuse.com database.
		// ==============================
		autoprefixer: {
			options: {
				browsers: ['last 2 version', 'ie 8', 'ie 9']
			},
			files: {
				src: '<%= app.directory.build.css %>/main.unprefixed.css',
				dest: '<%= app.directory.build.css %>/main.css'
			}
		},

		// Minifies CSS.
		// ==============================
		cssmin: {
			main: {
				options: {
					keepSpecialComments: 0
				},
				files: [{
					expand	: true,
					cwd		: '<%= app.directory.build.css %>',
					src		: 'main.css',
					dest		: '<%= app.directory.dest.css %>',
					ext		: '.min.css'
				}]
			}
		},

		// Run predefined tasks whenever watched file patterns are added, changed or deleted.
		// ==============================
		watch: {
			markup: {
				files: ['<%= app.directory.build.markup %>/**/*.html'],
				tasks: ['copy:index', 'copy:views']
			},
			css: {
				files: [
					'<%= app.directory.build.sass %>/**/*.scss',
					'<%= app.directory.build.css %>/**/*.css'
				],
				tasks: ['css']
			},
			js: {
				files: [
					'!<%= app.directory.build.scripts %>/libs/*.js',
					'<%= app.directory.build.scripts %>/**/*.js'
				],
				tasks: ['newer:jshint', 'newer:concat']
			},
			assets: {
				files: '<%= app.directory.build.assets %>/**/*.*',
				tasks: ['newer:copy:assets']
			}
		},

		/**
		 * Awesome task which shows notifications on your Desktop when a specific task is finished.
		 * ==============================
		 */
		notify: {
			build: {
				options: {
					title		: 'Build complete!',
					message	: 'Setup was created successfully.'
				}
			}
		}
	});
};