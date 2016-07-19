gulp = require('gulp')
fs = require('fs')
browserify = require('browserify')
eslint = require('gulp-eslint')
less = require('gulp-less')
coffee = require('gulp-coffee')
source = require('vinyl-source-stream')
stringify = require('stringify')
path = require('path')

config =
   entryFile: './index.js'
   inputDir: '.'
   outputDir: './dist/'
   outputFile: 'index.js'

getBundler = (config) ->
   browserify(config.entryFile, { debug: true })
   .transform(stringify, {
      appliesTo: { includeExtensions: ['.html', '.css'] },
      minify: true
   })

bundle = (config) ->
   getBundler(config).bundle().on('error', (err) ->
      console.log 'Error: ' + err.message
   )
   .pipe source(config.outputFile)
   .pipe gulp.dest(config.outputDir)

gulp.task 'css', ->
   gulp.src(config.inputDir + '/less/style.less')
      .pipe(less({
         paths: [path.join(config.inputDir, 'node_modules')]
      }))
      .pipe gulp.dest(config.outputDir + '/css')

bundler = undefined

gulp.task 'build-persistent', ->
   bundle(config)

gulp.task 'build', ['build-persistent'], ->
   process.exit 0

gulp.task 'lint', ->
   # ESLint ignores files with "node_modules" paths.
   # So, it's best to have gulp ignore the directory as well.
   # Also, Be sure to return the stream from the task;
   # Otherwise, the task may end before the stream has finished.
   gulp.src(['**/*.js','!node_modules/**'])
      # eslint() attaches the lint output to the "eslint" property
      # of the file object so it can be used by other modules.
      .pipe(eslint())
      # eslint.format() outputs the lint results to the console.
      # Alternatively use eslint.formatEach() (see Docs).
      .pipe(eslint.format())
      # To have the process exit with an error code (1) on
      # lint error, return the stream and pipe to failAfterError last.
      .pipe(eslint.failAfterError());

# The default task (called when you run `gulp` from cli)
gulp.task('default', ['lint', 'css', 'build'])
