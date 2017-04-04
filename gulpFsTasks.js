// get gulp dependencies
var argv = require('minimist')(process.argv.slice(2));
var exec = require('child-process-promise').exec;
var gulp = require('gulp');
var inject = require('gulp-inject-string');
var pathExists = require('path-exists');
var rename = require('gulp-rename');

var types = {
  component: 'component',
  page: 'page',
}

var componentTask = function(argv, flags, paths, compileForDev){
  var createKeys = [];
  var deleteKeys = [];
  // check flags to see if any are keys for a creation or deletion
  for (var loopingKey in argv) {
    if (flags.create.includes(loopingKey)) {
      if (typeof argv[loopingKey] === "string") {
        createKeys.push(loopingKey);
      }
    }
    if (flags.delete.includes(loopingKey)) {
      if (typeof argv[loopingKey] === "string") {
        deleteKeys.push(loopingKey);
      }
    }
  }
  if (createKeys.length < 1 && deleteKeys.length < 1) {
    console.log("task failed, please use format:\n'gulp component -g [component-name]'\n to create a component'");
    console.log("or \n'gulp component -d [component-name]'\n to delete a component'");
    return;
  }
  // loop through and conduct creations
  for (var i = 0; i < createKeys.length; i++) {
    if (!(/^[A-Za-z0-9\-\_]+$/.test(argv[createKeys[i]]))) {
      console.log(`${argv[createKeys[i]]} contains illegal characters - aborting`);
      return;
    }
    var name = argv[createKeys[i]];
    pathExists(`${paths.components}/${name}`).then(exists =>{
      if (exists) {
        console.log(`component folder ${name} already exists!`);
      } else {
        createComponent(name, paths);
      }
    })
  }
  // loop through and delete relevant material
  for (var i = 0; i < deleteKeys.length; i++) {
    var name = argv[deleteKeys[i]];
    pathExists(`${paths.components}/${name}`).then(exists =>{
      if (!exists) {
        console.log(`no component folder for "${name}" exists`);
      } else {
        deleteComponent(name, paths);
      }
    })
  }
  compileForDev();
}

var createComponent = function(name, paths){
  console.log(`creating component: ${name}`);
  var fldrPath = `${paths.components}/${name}`;
  let type = types.component;
  exec(`mkdir ${fldrPath}`);
  exec(`touch ${fldrPath}/${name}-index.njk`);
  exec(`touch ${fldrPath}/${name}-scripts.js`);
  exec(`touch ${fldrPath}/_${name}-styles.scss`);
  importInStyleIndex(name, paths, type);
  addDivWrapper(fldrPath, name, type);
  addStylesWrapper(fldrPath, name, type);
  addScriptsWrapper(fldrPath, name, type);
}

var deleteComponent = function(name, paths){
  console.log(`removing component: ${name}`);
  var fldrPath = `${paths.components}/${name}`;
  var type = types.component;
  exec(`rm -rf ${fldrPath}`);
  removeFromStyleIndex(name, paths, type);
}

var pageTask = function(argv, flags, fileNames, paths, compileForDev) {
  var createKeys = [];
  var deleteKeys = [];
  // check flags to see if any are keys for a creation or deletion
  for (var loopingKey in argv) {
    if (flags.create.includes(loopingKey)) {
      if (typeof argv[loopingKey] === "string") {
        createKeys.push(loopingKey);
      }
    }
    if (flags.delete.includes(loopingKey)) {
      if (typeof argv[loopingKey] === "string") {
        deleteKeys.push(loopingKey);
      }
    }
  }
  // if no relevant keys exist, break
  if (createKeys.length < 1 && deleteKeys.length < 1) {
    console.log("task failed, please use format:\n'gulp page -g [page-name]'\n to create a page'");
    console.log("or \n'gulp page -d [page-name]'\n to delete a page'");
    return;
  }
  // loop through and conduct creations
  for (var i = 0; i < createKeys.length; i++) {
    // check name for illegal characters
    if (!(/^[A-Za-z0-9\-\_]+$/.test(argv[createKeys[i]]))) {
      console.log(`${argv[createKeys[i]]} contains illegal characters - aborting`);
      return;
    }
    var name = argv[createKeys[i]];
    pathExists(`${paths.pages}/${name}`).then(exists =>{
      if (exists) {
        console.log(`page folder ${name} already exists!`);
      } else {
        console.log(`creating page: ${name}`);
        createPage(name, fileNames, paths);
      }
    })
  }
  // loop through and delete relevant material
  for (var i = 0; i < deleteKeys.length; i++) {
    var name = argv[deleteKeys[i]];
    if (name === "error" || name === "home") {
      console.log("cannot auto-delete 'error' or 'home' pages. see README to manually go through process, or run 'gulp clear-example from original project clone to remove content'.");
      return;
    }
    pathExists(`${paths.pages}/${name}`).then(exists =>{
      if (!exists) {
        console.log(`no page folder for "${name}" exists`);
      } else {
        console.log(`removing page: ${name}`);
        deletePage(name, fileNames, paths);
      }
    })
  }
  compileForDev();
}

var createPage = function(name, fileNames, paths){
  var fldrPath = `${paths.pages}/${name}`;
  var type = types.page;
  exec(`mkdir ${fldrPath}`);
  exec(`touch ${fldrPath}/${name}-index.njk`);
  exec(`touch ${fldrPath}/${name}-scripts.js`);
  exec(`touch ${fldrPath}/_${name}-styles.scss`);
  importInStyleIndex(name, paths, type);
  addDivWrapper(fldrPath, name, type);
  addStylesWrapper(fldrPath, name, type);
  addScriptsWrapper(fldrPath, name, type);
  addPageNav(name, fileNames, paths);
}

var deletePage = function(name, fileNames, paths){
  var fldrPath = `${paths.pages}/${name}`;
  var type = types.page;
  exec(`rm -rf ${fldrPath}`);
  removeFromStyleIndex(name, paths, type);
  removePageNav(name, fileNames, paths);
}

var cleanExApp = function(paths, compileForDev){
  console.log('this may take a moment');
    pathExists(`${paths.components}/welcome-message`).then(exists =>{
    if (!exists) {
      console.log('this command is very sensitive, please only use on original clone!');
      return;
    }
    console.log('clearing components');
    exec('gulp component -d welcome-message').then(()=>{
      exec('gulp component -d navbar').then(()=>{
        // circumstancial clearance for usage of navbar component in layout file
        gulp.src(paths.views.general + '/layout.njk')
          .pipe(inject.replace(`{% include "components/navbar/navbar-index.njk" %}`, ''))
          .pipe(rename('layout.njk'))
          .pipe(gulp.dest(paths.views.general));
        exec(`rm ${paths.root}/assets/images/francoise.jpg`).then(()=>{
          console.log('clearing about page');
          exec('gulp page -d about').then(()=>{
            console.log('clearing interfaces');
            exec(`rm ${paths.styles.general}/abstracts/_interfaces.scss`).then(()=>{
              exec(`touch ${paths.styles.general}/abstracts/_interfaces.scss`).then(()=>{
                console.log('clearing general.scss');
                exec(`rm ${paths.styles.general}/base/_general.scss`).then(()=>{
                  exec(`touch ${paths.styles.general}/base/_general.scss`).then(()=>{
                    var name = 'home';
                    var fldrPath = `${paths.pages}/${name}`;
                    console.log('clearing home page content');
                    exec(`rm ${fldrPath}/${name}-index.njk`).then(()=>{
                      exec(`rm ${fldrPath}/_${name}-styles.scss`).then(()=>{
                        exec(`rm ${fldrPath}/${name}-scripts.js`).then(()=>{
                          exec(`touch ${fldrPath}/${name}-index.njk`).then(()=>{
                            exec(`touch ${fldrPath}/_${name}-styles.scss`).then(()=>{
                              exec(`touch ${fldrPath}/${name}-scripts.js`).then(()=>{
                                repopulateClearedContent(fldrPath, name, paths);
                                name = 'error';
                                fldrPath = `${paths.pages}/${name}`;
                                console.log('clearing error page content');
                                exec(`rm ${fldrPath}/${name}-index.njk`).then(()=>{
                                  exec(`rm ${fldrPath}/_${name}-styles.scss`).then(()=>{
                                    exec(`rm ${fldrPath}/${name}-scripts.js`).then(()=>{
                                      exec(`touch ${fldrPath}/${name}-index.njk`).then(()=>{
                                        exec(`touch ${fldrPath}/_${name}-styles.scss`).then(()=>{
                                          exec(`touch ${fldrPath}/${name}-scripts.js`).then(()=>{
                                            repopulateClearedContent(fldrPath, name, paths);
                                            compileForDev();
                                          });
                                        });
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  // how about that flying V, huh? DUCKS FLY TOGETHER!
}

var repopulateClearedContent = function(fldrPath, name, paths){
  addDivWrapper(fldrPath, name, types.page);
  addStylesWrapper(fldrPath, name, types.page);
  addScriptsWrapper(fldrPath, name, types.page);
}

var importInStyleIndex = function(name, paths, type){
  var flag;
  if (type === types.component) {
    flag = 'COMPONENTS'
  } else if (type === types.page) {
    flag = 'PAGES'
  }
  gulp.src(paths.styles.main)
    .pipe(inject.after(`//!${flag}!`, `\n@import './../../${type}s/${name}/_${name}-styles';`))
    .pipe(rename(`index.scss`))
    .pipe(gulp.dest(paths.styles.general));
}

var removeFromStyleIndex = function(name, paths, type){
  gulp.src(paths.styles.main)
  .pipe(inject.replace(`\n@import './../../${type}s/${name}/_${name}-styles';`, ''))
  .pipe(rename('index.scss'))
  .pipe(gulp.dest(paths.styles.general));
}

var addDivWrapper = function(fldrPath, name, type){
  var openingDivTag;
  if (type === types.component) {
    openingDivTag = `<div class='${type}-${name} ${type}'>`;
  } else if (type === types.page) {
    openingDivTag = `<div id='${type}-${name}' class='${type} hidden'>`;
  }
  gulp.src(`${fldrPath}/${name}-index.njk`)
    .pipe(inject.prepend(`<!--use this wrapper to keep everything within ${type}!-->` +
      `\n${openingDivTag}\n`))
    .pipe(inject.append(`\n</div>`))
    .pipe(rename(`${name}-index.njk`))
    .pipe(gulp.dest(`${fldrPath}/`));
}

var addStylesWrapper = function(fldrPath, name, type){
  var elementType;
  if (type === types.component) {
    elementType = ".";
  } else if (type === types.page) {
    elementType = "#";
  }
  gulp.src(`${fldrPath}/_${name}-styles.scss`)
    .pipe(inject.prepend(`// use this wrapper to preserve scope!\n${elementType}${type}-${name} {\n`))
    .pipe(inject.append(`\n}`))
    .pipe(rename(`_${name}-styles.scss`))
    .pipe(gulp.dest(`${fldrPath}/`));
}


var addScriptsWrapper = function(fldrPath, name, type){
  gulp.src(`${fldrPath}/${name}-scripts.js`)
    .pipe(inject.prepend(`/* jshint esversion: 6 */` +
      `\n\nexports.mount = function(){` +
      `\n\n};`))
    .pipe(rename(`${name}-scripts.js`))
    .pipe(gulp.dest(`${fldrPath}/`));
}

var addPageNav = function(name, fileNames, paths){
  // replace hyphens with underscores for routing object's prop key
  var nameKey = name.replace(/-/g, "_");
  gulp.src(paths.scripts.navigator)
    .pipe(inject.before('//!PAGES!',
    `\t${nameKey}: {` +
      `\n\t\t\thash: '${name}',` +
      `\n\t\t\tdivId: 'page-${name}',` +
      `\n\t\t\tjs: imports.${name}_js,` +
    `\n\t\t},\n\t`))
    .pipe(inject.before('//!JS_IMPORTS!',
      `${nameKey}_js: require('./../../pages/${name}/${name}-scripts'),\n\t\t`))
    .pipe(rename(fileNames.navigator))
    .pipe(gulp.dest(paths.scripts.navigator.split(fileNames.navigator)[0]));
  // we also automatically include new page in nunjucks index
  gulp.src(paths.views.main)
    .pipe(inject.after('<!--PAGES-->', `\n\t{% include './pages/${name}/${name}-index.njk' %}`))
    .pipe(rename("index.njk"))
    .pipe(gulp.dest(paths.views.main.split("index.njk")[0]));
}

removePageNav = function(name, fileNames, paths){
  var nameKey = name.replace(/-/g, "_");
  gulp.src(paths.scripts.navigator)
  .pipe(inject.replace(
    `\t${nameKey}: {` +
      `\n\t\t\thash: '${name}',` +
      `\n\t\t\tdivId: 'page-${name}',` +
      `\n\t\t\tjs: imports.${name}_js,` +
    `\n\t\t},\n\t`
    , ''))
  .pipe(inject.replace(`${nameKey}_js: `, '// DEPRECATED --'))
  .pipe(rename(fileNames.navigator))
  .pipe(gulp.dest(paths.scripts.navigator.split(fileNames.navigator)[0]));
  // delete page's html inclusion in nunjucks index
  gulp.src(paths.views.main)
  .pipe(inject.replace(`\n\t{% include './pages/${name}/${name}-index.njk' %}`, ''))
  .pipe(rename("index.njk"))
  .pipe(gulp.dest(paths.views.main.split("index.njk")[0]));
}

exports.cleanExApp = cleanExApp;
exports.componentTask = componentTask;
exports.pageTask = pageTask;
