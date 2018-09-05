var gulp = require('gulp');
var sass = require('gulp-sass');
//var watch = require('gulp-watch');
var browserSync = require('browser-sync').create();
var reload      = browserSync.reload;

browserSync.init({
  server: "./"
});
browserSync.stream();

gulp.task('default', function(done) {
  return gulp.watch('./sass/**/*.scss', gulp.parallel('styles'));
  //done();
});

gulp.task('styles', function(done) {
  return gulp
    .src('sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./css'))
    // .pipe(browserSync.stream({match: '**/*.css'}));

    .pipe(browserSync.reload({stream: true}));
  done();
});

