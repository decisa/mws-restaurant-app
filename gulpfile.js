var gulp = require('gulp');
var sass = require('gulp-sass');

browserSync.init({
  server: "./"
});


gulp.task('default', function(done) {
  return gulp.watch('./sass/**/*.scss', gulp.parallel('styles'));
  // done();
});

gulp.task('styles', function(done) {
  return gulp
    .src('sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./css'))
  // done();
});

