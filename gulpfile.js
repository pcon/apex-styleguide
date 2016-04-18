/*jslint browser: true, regexp: true, nomen: true */
/*global require */

var _ = require('underscore'),
    argv = require('yargs').argv,
    browserify = require('browserify'),
    connect = require('gulp-connect'),
    deploy = require('gulp-gh-pages'),
    frontMatter = require('gulp-front-matter'),
    gulp = require('gulp'),
    gulpif = require('gulp-if'),
    gutil = require('gulp-util'),
    htmlmin = require('gulp-htmlmin'),
    marked = require('gulp-marked'),
    merge = require('merge-stream'),
    path = require('path'),
    rename = require('gulp-rename'),
    rimraf = require('gulp-rimraf'),
    sass = require('gulp-sass'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    uglify = require('gulp-uglify'),
    slugify = require('slug'),
    swig = require('swig'),
    swigExtras = require('swig-extras'),
    through = require('through2'),
    watchify = require('watchify');

/**
 * Debug mode may be set in one of these manners:
 * - gulp --debug=[true | false]
 * - export NODE_DEBUG=[true | false]
 */
var DEBUG,
    USER_DEBUG = (argv.debug || process.env.NODE_DEBUG);
if (USER_DEBUG === undefined && argv._.indexOf('deploy') > -1) {
    DEBUG = false;
} else {
    DEBUG = USER_DEBUG !== 'false';
}

var site = {
    'title': 'Apex Styleguide',
    'url': 'http://localhost:9000',
    'urlRoot': '/',
    'author': 'Patrick Connelly',
    'email': 'patrick@deadlypenguin.com',
    'time': new Date()
};

swig.setDefaults({
    loader: swig.loaders.fs(__dirname + '/assets/templates'),
    cache: false
});
swigExtras.useFilter(swig, 'truncate');
swig.setFilter('slugify', slugify);

/*jslint unparam: true*/
function applyTemplate(templateFile) {
    'use strict';

    var tpl = swig.compileFile(path.join(__dirname, templateFile));

    return through.obj(function (file, enc, cb) {
        var data = {
            site: site,
            page: file.page,
            content: file.contents.toString(),
            file: file
        };

        file.contents = new Buffer(tpl(data), 'utf8');
        this.push(file);
        cb();
    });
}
/*jslint unparam: false*/

gulp.task('cleanpages', function () {
    'use strict';

    return gulp.src(['dist/*.html'], {read: false})
        .pipe(rimraf());
});

gulp.task('pages', ['cleanpages'], function () {
    'use strict';

    var html, markdown;

    /*jslint unparam: true*/
    html = gulp.src(['content/pages/*.html'])
        .pipe(frontMatter({property: 'page', remove: true}))
        .pipe(through.obj(function (file, enc, cb) {
            var data, tpl;

            file.page.url = path.basename(file.path);

            if (file.page.url === 'index.html') {
                file.page.url = '';
            }

            data = {
                site: site,
                page: file.page,
                file: file
            };

            tpl = swig.compileFile(file.path);
            file.contents = new Buffer(tpl(data), 'utf8');
            this.push(file);
            cb();
        }));
    /*jslint unparam: false*/

    markdown = gulp.src('content/pages/*.md')
        .pipe(frontMatter({property: 'page', remove: true}))
        .pipe(marked())
        .pipe(applyTemplate('assets/templates/page.html'))
        .pipe(rename({extname: '.html'}));

    return merge(html, markdown)
        .pipe(gulpif(!DEBUG, htmlmin({
            // This option seems logical, but it breaks gulp-rev-all
            removeAttributeQuotes: false,

            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            removeStyleLinkTypeAttributes: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true
        })))
        .pipe(gulp.dest('dist'))
        .pipe(connect.reload());
});

gulp.task('clean', function () {
    'use strict';

    return gulp.src('dist', {read: false})
        .pipe(rimraf());
});

gulp.task('content', ['pages']);
gulp.task('default', ['content']);

gulp.task('watch', ['default'], function () {
    'use strict';

    gulp.watch(['assets/templates/**'], ['content']);
    gulp.watch(['assets/styles/**'], ['styles']);
    gulp.watch(['assets/images/**'], ['images']);
    gulp.watch(['assets/fonts/**'], ['fonts']);
    gulp.watch(['assets/extra/**'], ['extra']);

    gulp.watch(['content/pages/**'], ['pages']);
    gulp.watch(['content/posts/**'], ['posts', 'rss']);

    connect.server({
        root: ['dist'],
        port: 9000,
        livereload: true
    });
});

gulp.task('dist', ['default']);

gulp.task('deploy', ['dist'], function () {
    'use strict';

    return gulp.src('./dist/**/*')
        .pipe(deploy());
});