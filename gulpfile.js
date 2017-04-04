// get gulp dependencies
var argv = require('minimist')(process.argv.slice(2));
var autoprefixer = require('gulp-autoprefixer');
var babelify = require("babelify");
var browserify = require('browserify');
var browserSync = require('browser-sync');
var buffer = require('vinyl-buffer');
var concat = require('gulp-concat');
var exec = require('child-process-promise').exec;
var fs = require('fs');
var globby = require('globby');
var gulp = require('gulp');
var gulpSequence = require('gulp-sequence').use(gulp);
var gls = require('gulp-live-server');
var gutil = require('gulp-util');
var imagemin = require('gulp-imagemin');
var inject = require('gulp-inject-string');
var jshint = require('gulp-jshint');
var minifyCSS = require('gulp-minify-css');
var nunjucksRender = require('gulp-nunjucks-render');
var pathExists = require('path-exists');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var sourceMaps = require('gulp-sourcemaps');
var through = require('through2');
var uglify = require('gulp-uglify');

var autoPrefixBrowserList = [
  'last 2 version',
  'safari 5',
  'ie 8',
  'ie 9',
  'opera 12.1',
  'ios 6',
  'android 4'
];

var fileNames = {
  html: 'index.html',
  navigator: 'navigator.js',
  scripts: 'scripts.js',
  styles: 'styles.css',
};

var flags = {
  create: ['c', 'create', 'g', 'generate'],
  delete: ['d', 'delete', 'r', 'remove'],
  production: ['p', 'prod', 'production'],
  development: ['d', 'dev', 'development'],
}

var paths = {
  root: "public",
  images: {
    origin:'public/assets/images/*',
    dest:'build/assets/images',
  },
  fonts: {
    origin:'public/assets/fonts/*',
    dest:'build/assets/fonts',
  },
  scripts: {
    all:['public/components/**/*.js', 'public/pages/**/*.js', 'public/general/scripts/*.js',],
    general: 'public/general/scripts/',
    index: 'public/' + fileNames.scripts,
    navigator: 'public/general/scripts/navigator.js',
  },
  styles: {
    all: ['public/**/*.scss', 'public/**/*.sass'],
    general: 'public/general/styles',
    index: 'public/' + fileNames.styles,
    main: 'public/general/styles/index.scss',
  },
  views: {
    all: ['public/pages/**/*.html', 'public/components/**/*.html','public/**/*.njk'],
    general: 'public/general/views',
    index: 'public/' + fileNames.html,
    main: 'public/general/views/index.njk',
  },
  build: {
    root: 'build',
    scripts: 'build',
    styles: 'build',
  },
  pages: 'public/pages',
  components: 'public/components',
};

var commands = {
  compile: {
    html: 'html',
    scripts: 'scripts',
    styles: 'styles',
  },
  deploy: {
    fonts: 'fonts-deploy',
    images: 'images-deploy',
    html: 'html-deploy',
    misc: 'misc-deploy',
    scaffold: 'scaffold',
    scripts: 'scripts-deploy',
    styles: 'styles-deploy',
  },
  clean: 'clean',
  clearExample: 'clear-example',
  component: 'component',
  concatJs: 'concatJs',
  htmlReload: 'html-reload',
  images: 'images',
  jsBrowserify: 'jsBrowserify',
  page: 'page',
  lint: 'lint',
  serve: 'serve',
};


//this is our master task when you run `gulp` in CLI / Terminal
gulp.task('default',
  [
    commands.lint,
    commands.compile.html,
    commands.compile.scripts,
    commands.compile.styles,
    commands.serve,
  ], function() {
    //a list of watchers, so it will watch all of the following files waiting for changes
    gulp.watch(paths.scripts.all, [commands.compile.scripts]);
    gulp.watch(paths.styles.all, [commands.compile.styles]);
    gulp.watch(paths.images.origin, [commands.images]);
    gulp.watch(paths.views.all, [commands.compile.html, commands.htmlReload]);
});

// this will build for production
gulp.task('build', [commands.clean], gulpSequence(
  commands.compile.html,
  commands.compile.scripts,
  commands.compile.styles,
  [
    commands.deploy.scripts,
    commands.deploy.styles,
    commands.deploy.images,
    commands.deploy.fonts,
    commands.deploy.html,
  ]
));

var compileForDev = function(){
  gulpSequence(
    commands.lint,
    commands.compile.html,
    commands.compile.scripts,
    commands.compile.styles
  );
}

// SCRIPTS
//compiling our Javascripts
gulp.task(commands.compile.scripts, function() {
  // gulp expects tasks to return a stream, so we create one here.
 var bundledStream = through();
 bundledStream
   // turns the output bundle stream into a stream containing
   // the normal attributes gulp plugins expect.
   .pipe(source(fileNames.scripts))
   // the rest of the gulp task, as you would normally write it.
   .pipe(buffer())
   .pipe(sourceMaps.init({loadMaps: true}))
     // Add gulp plugins to the pipeline here.
     .on('error', gutil.log)
   .pipe(sourceMaps.write('./'))
   .pipe(gulp.dest(paths.root))
   .pipe(browserSync.reload({stream: true}));

 // "globby" replaces the normal "gulp.src" as Browserify
 // creates it's own readable stream.
 globby(paths.scripts.all).then(function(entries) {
   // create the Browserify instance.
   var b = browserify({
     entries: entries,
     debug: true,
   });

   // pipe the Browserify stream into the stream we created earlier
   // this starts our gulp pipeline.
   b
   .transform("babelify", {presets: ["es2015"]})
   .bundle()
   .pipe(bundledStream)

 }).catch(function(err) {
   // ensure any errors from globby are handled
   bundledStream.emit('error', err);
 });

 // finally, we return the stream, so gulp knows when this task is done.
 return bundledStream;
});


//moving our Javascripts to deployment
gulp.task(commands.deploy.scripts, function() {
    //this is where our dev JS scripts are
    return gulp.src(paths.scripts.index)
                //prevent pipe breaking caused by errors from gulp plugins
                .pipe(plumber())
                //compress :D
                .pipe(uglify())
                //where we will store our finalized, compressed script
                .pipe(gulp.dest(paths.build.scripts));
});

gulp.task(commands.lint, function(){
  return gulp.src(paths.scripts.all)
    //prevent pipe breaking caused by errors from gulp plugins
    .pipe(plumber())
    // linting!
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
});


// STYLES
//compiling our SCSS files
gulp.task(commands.compile.styles, function() {
    //the initializer / master SCSS file, which will just be a file that imports everything
    return gulp.src(paths.styles.main)
                //prevent pipe breaking caused by errors from gulp plugins
                .pipe(plumber({
                  errorHandler: function (err) {
                    console.log(err);
                    this.emit('end');
                  }
                }))
                //get sourceMaps ready
                .pipe(sourceMaps.init())
                //include SCSS and list every "include" folder
                .pipe(sass({
                      errLogToConsole: true,
                }))
                .pipe(autoprefixer({
                   browsers: autoPrefixBrowserList,
                   cascade:  true
                }))
                //catch errors
                .on('error', gutil.log)
                //the final filename of our combined css file
                .pipe(concat(fileNames.styles))
                //get our sources via sourceMaps
                .pipe(sourceMaps.write())
                //where to save our final, compressed css file
                .pipe(gulp.dest(paths.root))
                //notify browserSync to refresh
                .pipe(browserSync.reload({stream: true}));
});

//compiling our SCSS files for deployment
gulp.task(commands.deploy.styles, function() {
    //the initializer / master SCSS file, which will just be a file that imports everything
    return gulp.src(paths.styles.index)
                .pipe(plumber())
                // compress
                .pipe(minifyCSS())
                //where to save our final, compressed css file
                .pipe(gulp.dest(paths.build.styles));
});


// HTML
//basically just keeping an eye on all HTML files
gulp.task(commands.htmlReload, function() {
    //watch any and all HTML files and refresh when something changes
    return gulp.src(paths.views.all)
        .pipe(plumber())
        .pipe(browserSync.reload({stream: true}))
        //catch errors
        .on('error', gutil.log);
});

gulp.task(commands.compile.html, function() {
  // Gets .html and .njk files in pages
  return gulp.src(paths.views.main)
  // Renders template with nunjucks
  .pipe(nunjucksRender({
      path: [paths.root]
    }))
  // output files in public folder
  .pipe(gulp.dest(paths.root))
});

//migrating over all HTML files for deployment
gulp.task(commands.deploy.html, function() {
    //grab html index file
    gulp.src(paths.views.index)
        //prevent pipe breaking caused by errors from gulp plugins
        .pipe(plumber())
        .pipe(gulp.dest(paths.build.root));
});


// ASSETS & MISC
//compressing images & handle SVG files
gulp.task(commands.images, function(tmp) {
    gulp.src(paths.images.origin)
        //prevent pipe breaking caused by errors from gulp plugins
        .pipe(plumber())
        .pipe(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true }))
        .pipe(gulp.dest(paths.images.dest));
});

//compressing images & handle SVG files
gulp.task(commands.deploy.images, function() {
    gulp.src(paths.images.origin)
        //prevent pipe breaking caused by errors from gulp plugins
        .pipe(plumber())
        .pipe(gulp.dest(paths.images.dest));
});

// fonts
gulp.task(commands.deploy.fonts, function() {
    gulp.src(paths.fonts.origin)
        //prevent pipe breaking caused by errors from gulp plugins
        .pipe(plumber())
        .pipe(gulp.dest(paths.fonts.dest));
});


// GENERAL
//cleans our build directory in case things got deleted
gulp.task(commands.clean, function() {
  exec('rm -rf build')
    .catch(function(err){ });
  exec('rm ' + paths.views.index)
    .catch(function(err){ });
  exec('rm ' + paths.scripts.index)
    .catch(function(err){ });
  exec('rm ' + paths.styles.index)
    .catch(function(err){ });
  exec('rm ' + paths.scripts.index + '.map')
    .catch(function(err){ });
});

gulp.task(commands.clearExample, [commands.clean], function() {
  // beware looking further into the bowels of this custom cleanse, ye be warned
  require('./gulpFsTasks.js').cleanExApp(paths, compileForDev);
});

//create folders using shell
gulp.task(commands.deploy.scaffold, function() {
  exec('mkdir build');
  exec('mkdir build/assets');
  exec('mkdir build/assets/fonts');
  exec('mkdir build/assets/images');
});

gulp.task(commands.serve, function() {
    var productionMode = false;
    var env;
    // running with -p or -production flag runs through build folder
    for (var flag in argv){
      if (flags.production.includes(flag)) {
        productionMode = true;
      }
    }
    if (productionMode) {
      var env = 'production';
      // we want to make sure our build files exist before calling them from app.js
      gulpSequence(
        commands.deploy.scripts,
        commands.deploy.styles,
        commands.deploy.images,
        commands.deploy.fonts,
        commands.deploy.html
      )();
    } else {
      var env = 'development';
    }
    // launch our server
    var port = 3000;
    var server = gls('app.js', {env: {NODE_ENV: env, PORT: port}});
    server.start();
    // we use browserSync's great live reloading, listening through proxy server
    browserSync.init({
      proxy: `localhost:${port}`,
      port: (port+1),
      notify: true,
    });
});

// CREATE components and pages
// generate a component
gulp.task(commands.component, function(){
  require('./gulpFsTasks.js').componentTask(argv, flags, paths, compileForDev);
});

//generate a page
gulp.task(commands.page, function(){
  require('./gulpFsTasks.js').pageTask(argv, flags, fileNames, paths, compileForDev);
});
