/*jslint browser: true, regexp: true, nomen: true */
/*global require */

var _ = require('underscore'),
    fs = require('fs'),
    argv = require('yargs').argv,
    browserify = require('browserify'),
    connect = require('gulp-connect'),
    deploy = require('gulp-gh-pages'),
    esc = require('escape-html'),
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
    shell = require('gulp-shell'),
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
    loader: swig.loaders.fs(__dirname + '/site/assets/templates'),
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

function loadCheckstyle(file_name) {
    'use strict';

    var content,
        file = path.join(__dirname, '/checkstyle/', file_name);

    try {
        /*jslint stupid: true*/
        fs.accessSync(file, fs.R_OK);
        content = fs.readFileSync(file);
        /*jslint stupid: false*/
    } catch (err) {
        return esc('<!-- ERROR missing "' + file_name + '" -->');
    }

    return esc(content);
}


gulp.task('cleanpages', function () {
    'use strict';

    return gulp.src(['dist/*.html'], {read: false})
        .pipe(rimraf());
});

gulp.task('pages', ['cleanpages'], function () {
    'use strict';

    var html, markdown;

    /*jslint unparam: true*/
    html = gulp.src(['site/content/pages/*.html'])
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
                file: file,
                load_checkstyle: loadCheckstyle
            };

            tpl = swig.compileFile(file.path);
            file.contents = new Buffer(tpl(data), 'utf8');
            this.push(file);
            cb();
        }));
    /*jslint unparam: false*/

    markdown = gulp.src('site/content/pages/*.md')
        .pipe(frontMatter({property: 'page', remove: true}))
        .pipe(marked())
        .pipe(applyTemplate('site/assets/templates/page.html'))
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

gulp.task('cleanstyles', function () {
    'use strict';

    return gulp.src('dist/styles', {read: false})
        .pipe(rimraf());
});

gulp.task('styles', ['cleanstyles'], function () {
    'use strict';

    return gulp.src('site/assets/styles/**')
        .pipe(gulp.dest('dist/styles'));
});

gulp.task('cleanfonts', function () {
    'use strict';

    return gulp.src('dist/fonts', {read: false})
        .pipe(rimraf());
});

gulp.task('fonts', ['cleanfonts'], function () {
    'use strict';

    return gulp.src('site/assets/fonts/**')
        .pipe(gulp.dest('dist/fonts'));
});

gulp.task('cleanscripts', function () {
    'use strict';

    return gulp.src('dist/scripts', {read: false})
        .pipe(rimraf());
});

gulp.task('scripts', ['cleanscripts'], function () {
    'use strict';

    return gulp.src('site/assets/scripts/**')
        .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', function () {
    'use strict';

    return gulp.src('dist', {read: false})
        .pipe(rimraf());
});

gulp.task('content', ['pages']);
gulp.task('default', ['content', 'styles', 'scripts', 'fonts']);

gulp.task('watch', ['default'], function () {
    'use strict';

    gulp.watch(['site/assets/templates/**'], ['content']);
    gulp.watch(['site/assets/styles/**'], ['styles']);
    gulp.watch(['site/assets/images/**'], ['images']);
    gulp.watch(['site/assets/fonts/**'], ['fonts']);
    gulp.watch(['site/assets/extra/**'], ['extra']);

    gulp.watch(['site/content/pages/**'], ['pages']);

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

gulp.task('checkstyle', shell.task(['xmllint --noent checkstyle/apex_checks.xml | xmllint --format - > apex_checks_combined.xml']));