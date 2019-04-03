var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var cleanCSS = require('gulp-clean-css');
var webpack = require('webpack');
var gulpWebpack = require('webpack-stream');
var debug = require('gulp-debug');
var gutil = require("gulp-util");
var checkFilesExist = require('check-files-exist');
var imagemin = require('gulp-imagemin');
var templateCacheCompiler = require('gulp-angular-templatecache');
var minifyHTML = require('gulp-minify-html');
var deployCdn = require('gulp-deploy-azure-cdn');




/*****************************************************
*
*
*               ADMIN DASHBOARD TASKS
*
*
 ******************************************************/

// Array of vendor deps for the admin dashboard
var adminDashboardVendorDependencies = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.min.js',
  'node_modules/clipboard/dist/clipboard.min.js',
  'node_modules/angular/angular.min.js',
  'node_modules/angular-route/angular-route.min.js',
  'node_modules/notie/dist/notie.min.js',
  'node_modules/angular-loading-bar/build/loading-bar.min.js',
  'node_modules/ngclipboard/dist/ngclipboard.min.js'
]

gulp.task('admin-dashboard:build-app-js', function() {
  //FIXME not using webpack-stream although it is recommended
  // We are not using it beacuse it throws weird path errors
  // without an explanation

  webpack(require('./public/modules/admin_dashboard/webpack.config.js'), function(err, stats) {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      // output options
    }));
  });
});

gulp.task('admin-dashboard:cache-bust-app', function() {
  var timestamp = Date.now();
  gulp.src(['views/admin_dashboard/admin_footer.ejs'])
    .pipe(replace(/admin-v.*\.js/, 'admin-v' + timestamp + '.bundle.js'))
    .pipe(replace(/window.CACHE_BUST_VERSION = \".*\";/, 'window.CACHE_BUST_VERSION = \"' + timestamp + '\";'))
    .pipe(gulp.dest('views/admin_dashboard'));
})

gulp.task('admin-dashboard:build-app', function(callback) {
  runSequence(
    'admin-dashboard:build-app-js',
    'admin-dashboard:cache-bust-app',
    callback
  );
});


gulp.task('admin-dashboard:check-vendor-js', function() {
  return checkFilesExist([
    adminDashboardVendorDependencies
  ]);
});



gulp.task('admin-dashboard:minify-vendor-js', function() {
  return gulp.src(adminDashboardVendorDependencies)
    .pipe(concat('vendor.bundle.js'))
    .pipe(gulp.dest('public/modules/admin_dashboard/dist/'))
    .pipe(uglify({
      mangle: false
    }))
    .pipe(gulp.dest('public/modules/admin_dashboard/dist/'))
});



gulp.task('admin-dashboard:cache-bust-vendor', function() {
  var timestamp = Date.now();
  gulp.src(['views/admin_dashboard/admin_footer.ejs'])
    .pipe(replace(/vendor-v.*.js/, 'vendor-v' + Date.now() + '.bundle.js'))
    .pipe(replace(/window.CACHE_BUST_VERSION = \".*\";/, 'window.CACHE_BUST_VERSION = \"' + timestamp + '\";'))
    .pipe(gulp.dest('views/admin_dashboard'));
});

gulp.task('admin-dashboard:build-vendor', function(callback) {
  runSequence(
    'admin-dashboard:check-vendor-js',
    'admin-dashboard:minify-vendor-js',
    'admin-dashboard:cache-bust-vendor',
    callback);
});

var adminDashboardVendorCss = [
      "node_modules/bootstrap/dist/css/bootstrap.css",
      "node_modules/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.min.css",
      "node_modules/ng-tags-input/build/ng-tags-input.min.css",
      "node_modules/notie/dist/notie.css",
      "node_modules/angular-loading-bar/build/loading-bar.min.css",
      'public/modules/data_dashboard/css/*.css',
      'public/modules/admin_dashboard/css/*.css',
      'node_modules/angular-moment-picker/dist/angular-moment-picker.min.css',
      'node_modules/trumbowyg/dist/ui/trumbowyg.min.css',
      'public/css/marketcloud.css'
    ]


gulp.task('admin-dashboard:check-vendor-css', function() {
  return checkFilesExist([
    adminDashboardVendorCss
  ]);
});


//TODO split in vendor and non-vendor
gulp.task('admin-dashboard:minify-css', function() {
  return gulp.src(adminDashboardVendorCss)
    .pipe(cleanCSS({
      compatibility: 'ie8'
    }))
    .pipe(concat('app.bundle.css'))
    .pipe(gulp.dest('public/modules/admin_dashboard/dist/'));
});

gulp.task('admin-dashboard:cache-bust-css', function() {

  return gulp.src([
      'views/admin_dashboard/admin_header.ejs'
    ])
    .pipe(replace(/app-v.*\.bundle\.css/, 'app-v' + Date.now() + '\.bundle\.css'))
    .pipe(gulp.dest('views/admin_dashboard/'));

});


gulp.task('admin-dashboard:build-css', function(callback) {
  runSequence(
    'admin-dashboard:check-vendor-css',
    'admin-dashboard:minify-css',
    'admin-dashboard:cache-bust-css',
    callback);
});







/*****************************************************
*
*
*               STORM DASHBOARD TASKS
*
*
 ******************************************************/

//task that bundles vendor dependencies together
var dataDashboardVendorDependencies = [
  'public/js/schematic.js',
  'node_modules/chart.js/dist/Chart.min.js',
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/angular/angular.min.js',
  'node_modules/angular-route/angular-route.min.js',
  'node_modules/angular-sanitize/angular-sanitize.min.js',
  'node_modules/ng-tags-input/build/ng-tags-input.js',
  'node_modules/angular-messages/angular-messages.min.js',
  'node_modules/angular-loading-bar/build/loading-bar.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.js',
  'node_modules/bootstrap-switch/dist/js/bootstrap-switch.min.js',
  'node_modules/angular-bootstrap-switch/dist/angular-bootstrap-switch.min.js',
  'node_modules/notie/dist/notie.min.js',
  'node_modules/stacktrace-js/dist/stacktrace.min.js',
  'node_modules/angular-file-upload/dist/angular-file-upload.min.js',
  'node_modules/moment/moment.js',
  'node_modules/angular-moment/angular-moment.min.js',
  'node_modules/angular-chart.js/dist/angular-chart.min.js',
  'node_modules/angular-moment-picker/dist/angular-moment-picker.js',
  'public/modules/shared/js/marketcloud.shared.module.js',
  'node_modules/angular-drag-and-drop-lists/angular-drag-and-drop-lists.min.js',
  'node_modules/trumbowyg/dist/trumbowyg.min.js',
  'node_modules/trumbowyg-ng/dist/trumbowyg-ng.min.js',
  'public/modules/shared/js/**/*.js'

]


gulp.task('data-dashboard:check-vendor-js', function() {
  return checkFilesExist([
    dataDashboardVendorDependencies
  ]);
});


gulp.task('data-dashboard:minify-html-templates', function() {
  gulp.src([
      'public/modules/data_dashboard/templates/**/*.html', // Templates for Routes
      'public/modules/data_dashboard/src/components/**/*.html' // Templates for Components
    ])
    .pipe(minifyHTML({
      quotes: true
    }))
    .pipe(templateCacheCompiler('templates.bundle.js',{
      module : 'DataDashboard',
      root : '/modules/data_dashboard/templates/',
      transformUrl: function(url) {
        if (url.indexOf('.component.html') === -1){
          return url;
        }
        var tokens = url.split('/');
        var fileName = tokens[tokens.length-1];
        var componentName = fileName.replace('.component.html','');
        return "/modules/data_dashboard/src/components/"+componentName+'/'+componentName+'.component.html';
      }
    }))
    .pipe(gulp.dest('public/modules/data_dashboard/dist/'));
});

gulp.task('data-dashboard:minify-vendor-js', function() {
  return gulp.src(dataDashboardVendorDependencies)
    .pipe(concat('vendor.bundle.js'))
    .pipe(gulp.dest('public/modules/data_dashboard/dist/'))
    .pipe(uglify({
      mangle: false
    }))
    .pipe(gulp.dest('public/modules/data_dashboard/dist/'))
});



var dataDashboardVendorCss = [
      "node_modules/bootstrap/dist/css/bootstrap.css",
      "node_modules/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.min.css",
      "node_modules/ng-tags-input/build/ng-tags-input.min.css",
      "node_modules/notie/dist/notie.css",
      "node_modules/angular-loading-bar/build/loading-bar.min.css",
      'public/modules/data_dashboard/css/*.css',
      'node_modules/angular-moment-picker/dist/angular-moment-picker.min.css',
      'node_modules/trumbowyg/dist/ui/trumbowyg.min.css',
      'public/css/marketcloud.css'
    ]


gulp.task('data-dashboard:check-vendor-css', function() {
  return checkFilesExist([
    dataDashboardVendorCss
  ]);
});


//TODO split in vendor and non-vendor
gulp.task('data-dashboard:minify-css', function() {
  return gulp.src(dataDashboardVendorCss)
    .pipe(cleanCSS({
      compatibility: 'ie8'
    }))
    .pipe(concat('app.bundle.css'))
    .pipe(gulp.dest('public/modules/data_dashboard/dist/'));
});

gulp.task('data-dashboard:cache-bust-css', function() {

  return gulp.src([
      'views/data_dashboard/data_header.ejs'
    ])
    .pipe(replace(/app-v.*\.bundle\.css/, 'app-v' + Date.now() + '\.bundle\.css'))
    .pipe(gulp.dest('views/data_dashboard/'));

});

/*
* Upload compiled assets to Azure CDN
* This should be part of a production build step
* 
* URL should be replaced, since non-production build will most likely link to filesystem
*/
gulp.task('data-dashboard:upload', function () {
    return gulp.src([
      'public/modules/data_dashboard/dist/*.js',
      'public/modules/data_dashboard/dist/*.map',
      'public/modules/data_dashboard/dist/*.css',
      ]).pipe(deployCdn({
        containerName: 'storm', // container name in blob
        serviceOptions: ['marketcloudstatic01', 'xttEwhEMrBefS2T2Uv9v3lu2M3bY+sJQxE4/WTnCfTeLxF8sESIJBuWSJraf40AKZITgWI9vECcL0HV35CBrpw=='], // custom arguments to azure.createBlobService
        folder: '', // path within container
        zip: true, // gzip files if they become smaller after zipping, content-encoding header will change if file is zipped
        deleteExistingBlobs: true, // true means recursively deleting anything under folder
        concurrentUploadThreads: 10, // number of concurrent uploads, choose best for your network condition
        metadata: {
            cacheControl: 'public, max-age=31530000', // cache in browser
            cacheControlHeader: 'public, max-age=31530000' // cache in azure CDN. As this data does not change, we set it to 1 year
        },
        testRun: false // test run - means no blobs will be actually deleted or uploaded, see log messages for details
    }))
    .on('error', gutil.log);
});

gulp.task('data-dashboard:build-app-js', function() {
  //FIXME not using webpack-stream although it is recommended
  // We are not using it beacuse it throws weird path errors
  // without an explanation

  webpack(require('./public/modules/data_dashboard/webpack.config.js'), function(err, stats) {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      // output options
    }));
  });
})



gulp.task('data-dashboard:clean-dist', function() {
  return gulp.src('public/modules/data_dashboard/dist/*', {
      read: false
    })
    .pipe(clean());
});



gulp.task('data-dashboard:cache-bust-app', function() {
  var timestamp = Date.now();
  gulp.src(['views/data_dashboard/data_footer.ejs'])
    .pipe(replace(/app-v.*\.js/, 'app-v' + timestamp + '.bundle.js'))
    .pipe(replace(/window.CACHE_BUST_VERSION = \".*\";/, 'window.CACHE_BUST_VERSION = \"' + timestamp + '\";'))
    .pipe(gulp.dest('views/data_dashboard'));
})

gulp.task('data-dashboard:cache-bust-templates', function() {
  var timestamp = Date.now();
  gulp.src(['views/data_dashboard/data_footer.ejs'])
    .pipe(replace(/templates-v.*\.js/, 'templates-v' + timestamp + '.bundle.js'))
    .pipe(replace(/window.CACHE_BUST_VERSION = \".*\";/, 'window.CACHE_BUST_VERSION = \"' + timestamp + '\";'))
    .pipe(gulp.dest('views/data_dashboard'));
})



gulp.task('data-dashboard:cache-bust-vendor', function() {
  var timestamp = Date.now();
  gulp.src(['views/data_dashboard/data_footer.ejs'])
    .pipe(replace(/vendor-v.*.js/, 'vendor-v' + Date.now() + '.bundle.js'))
    .pipe(replace(/window.CACHE_BUST_VERSION = \".*\";/, 'window.CACHE_BUST_VERSION = \"' + timestamp + '\";'))
    .pipe(gulp.dest('views/data_dashboard'));
})


gulp.task('data-dashboard:build-app', function(callback) {
  runSequence(
    'data-dashboard:build-app-js',
    'data-dashboard:cache-bust-app',
    callback
  );
});


gulp.task('data-dashboard:build-templates', function(callback) {
  runSequence(
    'data-dashboard:minify-html-templates',
    'data-dashboard:cache-bust-templates',
    callback
  );
});


gulp.task('data-dashboard:build-vendor', function(callback) {
  runSequence(
    'data-dashboard:check-vendor-js',
    'data-dashboard:minify-vendor-js',
    'data-dashboard:cache-bust-vendor',
    callback);
});

gulp.task('data-dashboard:build-css', function(callback) {
  runSequence(
    'data-dashboard:check-vendor-css',
    'data-dashboard:minify-css',
    'data-dashboard:cache-bust-css',
    callback);
});


gulp.task('data-dashboard:build-all', function(callback) {
  runSequence('data-dashboard:clean-dist',
    'data-dashboard:build-vendor',
    'data-dashboard:build-app',
    'data-dashboard:build-css',
    'data-dashboard:build-templates',
    callback);
});







/*****************************************************
*
*
*                   SITE TASKS
*
*
 ******************************************************/



var siteScripts = [
  'node_modules/medium-zoom/dist/medium-zoom.min.js',
  'node_modules/typed.js/lib/typed.min.js',
  'public/modules/site/js/*'
  ]

gulp.task('site:minify-js', function() {
  return gulp.src(siteScripts)
    .pipe(concat('site.bundle.js'))
    .pipe(gulp.dest('public/modules/site/dist/'))
    .pipe(uglify({ mangle: false }))
    .pipe(gulp.dest('public/modules/site/dist/'))
});


//TODO split in vendor and non-vendor
gulp.task('site:minify-css', function() {
  return gulp.src([
      "node_modules/bootstrap/dist/css/bootstrap.css",
      'public/css/marketcloud.css',
      'public/css/site.css'
    ])
    .pipe(cleanCSS({
      compatibility: 'ie8'
    }))
    .pipe(concat('site.bundle.css'))
    .pipe(gulp.dest('public/css/dist'));
});

gulp.task('site:cache-bust-css', function() {

  return gulp.src([
      'views/header.ejs'
    ])
    .pipe(replace(/site-v.*\.bundle\.css/, 'site-v' + Date.now() + '\.bundle\.css'))
    .pipe(gulp.dest('views/'));

});





gulp.task('site:build-css', function(callback) {
  runSequence(
    'site:minify-css',
    'site:cache-bust-css',
    callback);
});


gulp.task('site:imagemin', () =>
  gulp.src('public/img/*')
  .pipe(imagemin())
  .pipe(gulp.dest('public/img/build'))
);