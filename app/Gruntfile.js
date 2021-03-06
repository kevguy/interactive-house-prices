var fs = require('fs');
var Builder = require('systemjs-builder');

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        visuals: { },

        watch: {
            mainJS: {
                files: ['src/js/**/*', '!src/js/embed/**/*', 'src/worker.html'],
                tasks: ['buildInteractive', 'copy:interactive']
            },
            embedJS: {
                files: ['src/js/**/*', '!src/js/main.js'],
                tasks: ['buildEmbed']
            },
            assets: {
                files: ['src/assets/**/*', '!src/assets/minimap/*', 'src/assets/minimap/bg.png', 'src/assets/minimap/districts*.png'],
                tasks: ['copy:assets']
            },
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass:interactive'],
            },
            harness: {
                files: ['harness/**/*'],
                tasks: ['harness']
            },
            embed: {
                files: ['src/html/embed/**/*.html'],
                tasks: ['template:embed']
            },
        },

        clean: {
            build: ['build']
        },

        sass: {
            options: {
                sourceMap: true
            },
            interactive: {
                files: [
                    {expand: true, cwd: 'src/css', src: ['*.scss', '!_*.scss'], ext: '.css', dest: 'build'}
                ]
            },
            harness: {
                files: {
                    'build/fonts.css': 'harness/fonts.scss'
                }
            }
        },

        'template': {
            'options': {
                'data': {
                    'assetPath': '<%= visuals.assetPath %>',
                }
            },
            'harness': {
                'files': {
                    'build/interactive.html': ['harness/interactive.html.tpl'],
                    'build/immersive.html': ['harness/immersive.html.tpl']
                }
            },
            'bootjs': {
                'files': {
                    'build/boot.js': ['src/js/boot.js.tpl'],
                }
            },
            'embed': {
                'files': [{expand: true, cwd: 'src/html/', src: ['**/*.html'], dest: 'build'}]
            }
        },

        copy: {
            harness: {
                files: [
                    {expand: true, cwd: 'harness/', src: ['curl.js', 'index.html'], dest: 'build'},
                ]
            },
            interactive: {
                files: [
                    {src: 'src/worker.html', dest: 'build/worker.html'},
                    {src: 'src/js/districts.js', dest: 'build/districts.js'},
                    {src: 'src/js/jspm_packages/github/mbostock/topojson@1.6.19/topojson.min.js', dest: 'build/topojson.js'},
                    {src: 'src/js/lib/leaflet.js', dest: 'build/leaflet.js'}
                ]
            },
            assets: {
                files: [{expand: true, cwd: 'src/', src: ['assets/**/*', '!assets/minimap/*', 'assets/minimap/bg.png', 'assets/minimap/districts*.png'], dest: 'build'}]
            },
            deploy: {
                files: [
                    { // BOOT
                        expand: true, cwd: 'build/',
                        src: ['boot.js', 'embed/**/*.html'],
                        dest: 'deploy/<%= visuals.timestamp %>'
                    },
                    { // ASSETS
                        expand: true, cwd: 'build/',
                        src: ['*.js', '!boot.js', '*.js.map', '*.css', '*.css.map', 'worker.html', 'assets/**/*'],
                        dest: 'deploy/<%= visuals.timestamp %>/<%= visuals.timestamp %>'
                    }
                ]
            }
        },

        symlink: {
            options: {
                overwrite: false
            },
            fonts: {
                src: 'bower_components/guss-webfonts/webfonts',
                dest: 'build/fonts/0.1.0'
            },
        },

        prompt: {
            visuals: {
                options: {
                    questions: [
                        {
                            config: 'visuals.s3.stage',
                            type: 'list',
                            message: 'Deploy to TEST or PRODUCTION URL?',
                            choices: [{
                                name: 'TEST: <%= visuals.s3.domain %>testing/<%= visuals.s3.path %>',
                                value: 'TEST'
                            },{
                                name: 'PROD: <%= visuals.s3.domain %><%= visuals.s3.path %>',
                                value: 'PROD'
                            }]
                        },
                        {
                            config: 'visuals.confirmDeploy',
                            type: 'confirm',
                            message: 'Deploying to PRODUCTION. Are you sure?',
                            default: false,
                            when: function(answers) {
                                return answers['visuals.s3.stage'] === 'PROD';
                            }
                        }
                    ],
                    then: function(answers) {
                        if (grunt.config('visuals.s3.stage') !== 'PROD') { // first Q
                            var prodPath = grunt.config('visuals.s3.path');
                            var testPath = 'testing/' + prodPath;
                            grunt.config('visuals.s3.path', testPath);
                        } else if (answers['visuals.confirmDeploy'] !== true) { // second Q
                            grunt.fail.warn('Please confirm to deploy to production.');
                        }
                    }
                }
            },
        },

        aws_s3: {
            options: {
                accessKeyId: '<%= visuals.aws.AWSAccessKeyID %>',
                secretAccessKey: '<%= visuals.aws.AWSSecretKey %>',
                region: 'us-east-1',
                debug: grunt.option('dry'),
                bucket: '<%= visuals.s3.bucket %>'
            },
            production: {
                options: {
                },
                files: [
                    { // ASSETS
                        expand: true,
                        cwd: 'deploy/<%= visuals.timestamp %>',
                        src: ['<%= visuals.timestamp %>/**/*'],
                        dest: '<%= visuals.s3.path %>',
                        params: { CacheControl: 'max-age=2678400' }
                    },
                    { // BOOT
                        expand: true,
                        cwd: 'deploy/<%= visuals.timestamp %>',
                        src: ['boot.js', 'embed/**/*.html'],
                        dest: '<%= visuals.s3.path %>',
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8000,
                    base: 'build',
                    middleware: function (connect, options, middlewares) {
                        // inject a custom middleware http://stackoverflow.com/a/24508523
                        middlewares.unshift(function (req, res, next) {
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', '*');
                            return next();
                        });
                        return middlewares;
                    }
                }
            }
        }
    });

    grunt.registerTask('buildInteractive', function () {
        var builder = new Builder();
        var minified = grunt.config('visuals.minified');
        builder.loadConfig('./src/js/config.js').then(function () {
            return builder.buildSFX('./src/js/main.js', './build/main.js', {
                'sfxFormat': 'amd',
                'runtime': false,
                'minify': minified,
                'mangle': minified,
                'sourceMaps': minified ? true : 'inline'
            });
        }).then(this.async()).catch(function (e) {
            grunt.fail.fatal(e);
        });
    });

    grunt.registerTask('buildEmbed', function () {
        var builder = new Builder();
        var minified = grunt.config('visuals.minified');
        builder.loadConfig('./src/js/config.js').then(function () {
            var promises = grunt.file.expand('./src/js/embed/*.js').map(function (embed) {
                console.log(embed, embed.replace('src/js/embed/', 'build/'));
                return builder.buildSFX(embed, embed.replace('src/js/embed/', 'build/'), {
                    'sfxFormat': 'amd',
                    'runtime': false,
                    'minify': minified,
                    'mangle': minified,
                    'sourceMaps': minified ? true : 'inline'
                });
            });
            return Promise.all(promises);
        }).then(this.async()).catch(function (e) {
            grunt.fail.fatal(e);
        });
    });

    grunt.registerTask('loadDeployConfig', function() {
        if (!grunt.file.exists('cfg/aws-keys.json')) grunt.fail.fatal('./cfg/aws-keys.json missing');
        grunt.config('visuals', {
            s3: grunt.file.readJSON('./cfg/s3.json'),
            aws: grunt.file.readJSON('./cfg/aws-keys.json'),
            timestamp: Date.now(),
            minified: true,
            assetPath: '<%= visuals.s3.domain %><%= visuals.s3.path %>/<%= visuals.timestamp %>'
        });
    })

    grunt.registerTask('boot_url', function() {
        grunt.log.write('\nBOOT URL: '['green'].bold)
        grunt.log.writeln(grunt.template.process('<%= visuals.s3.domain %><%= visuals.s3.path %>/boot.js'))
    })

    grunt.registerTask('harness', ['copy:harness', 'template:harness', 'sass:harness', 'symlink:fonts'])
    grunt.registerTask('interactive', ['buildInteractive', 'buildEmbed', 'copy:interactive', 'template:bootjs', 'template:embed', 'sass:interactive', 'copy:assets'])
    grunt.registerTask('default', ['clean', 'harness', 'interactive', 'connect', 'watch']);
    grunt.registerTask('build', ['clean', 'interactive']);
    grunt.registerTask('deploy', ['loadDeployConfig', 'prompt:visuals', 'build', 'copy:deploy', 'aws_s3', 'boot_url']);

    grunt.loadNpmTasks('grunt-aws');

}
