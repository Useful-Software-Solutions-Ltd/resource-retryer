var gulp = require('gulp'),
	gldr = require('gulp-load-plugins')({ lazy: true }),
	del = require('del'),
	Server = require('karma').Server;

gulp.task('default', gldr.taskListing);

gulp.task('build', ['copy-source-to-build'], function () {

});

gulp.task('copy-source-to-build', ['minify'], function () {
	return gulp.src('./source/*.js')
		.pipe(gulp.dest('dist'));
});

gulp.task('minify', ['clean-dist'], function () {
	return gulp.src('./source/*.js')
		.pipe(gldr.uglify())
		.pipe(gldr.rename({ suffix: '.min' }))
		.pipe(gulp.dest('dist'));
});


gulp.task('clean-dist', ['run-tests'], function () {
	del('dist/**.*');
});

gulp.task('run-tests', [], function () {
	// Be sure to return the stream 
	return gulp.src('breaksKarma')
		.pipe(gldr.karma({
			configFile: './karma.conf.js',
			action: 'run'
		}))
		.on('error', function (err) {
			throw err;
		});
});