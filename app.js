var 	express	=	require('express'),
	path		=	require('path'),
	favicon	=	require('serve-favicon'),
	logger		=	require('morgan'),
	cookieParser	=	require('cookie-parser'),
	bodyParser	=	require('body-parser'),
	moment	=	require("moment"),
	nunjucks	=	require('nunjucks'),
	nunjucksDate	=	require('nunjucks-date'),
	dateFilter	=	require('nunjucks-date-filter'),
	Mongoose	=	require('mongoose'),
	Flash		=	require('express-flash'),
	errorhandler	=	require('errorhandler'),
	redis		=	require('redis'),
	session	=	require('express-session'),
	RedisStore	=	require('connect-redis')(session),
	timeout	=	require('connect-timeout'),
	i18n		=	require('i18n'),
	compression	=	require('compression'),
	Routes		=	require('./routes'),
	Config		= 	require('./config'),
	Passport 	= 	require('./passport'),
	app		=	express(),
	secret_key	=	Config.secret_key,
	Client		=	redis.createClient();

// database connection
Mongoose.connect('mongodb://localhost/' + Config.db.name, function(err){
	if(err) console.log('connection error', err);
	else console.log('connection successful');
}).set('debug', Config.mongooseDebug);

// locale
i18n.configure({
	locales: ['en', 'fr'],
	directory: __dirname + '/locales',
	defaultLocale: 'en',
});
app.use(i18n.init);

app.locals = function(){};
var CoffeeScript = require("coffee-script/register"),
BundleUp = require('bundle-up'),
ban = BundleUp(app, __dirname + '/assets', {
	staticRoot: path.join(__dirname, '/public'),
	staticUrlRoot: '/',
	bundle: true,
	// minifyCss: true,
	minifyCss: false,
	// minifyJs: true,
	minifyJs: false,
});

app.use(compression()); //use compression
// view engine setup
nunjucksDate.setDefaultFormat('MMMM Do YYYY, h:mm:ss a');
app.set('views', path.join(__dirname, 'views'));
var env = nunjucks.configure(app.get('views'), { autoescape: true, express: app });
env.addFilter('date', dateFilter);
nunjucksDate.install(env);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: false, }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
	secret: secret_key,
	store: new RedisStore({
		host: 'localhost',
		port: 6379,
		client: Client
	}),
	proxy: true,
	resave: true,
	saveUninitialized: true,
}));
app.use(Flash());
app.use(Passport.initialize());
app.use(Passport.session());
app.use(Passport.authenticate('remember-me'));

app.use(function(req, res, next){
	res.locals.js  = ban.js.files;
	res.locals.css = ban.css.files;
	res.locals.__ = res.__ = function(){
		return i18n.__.apply(req, arguments);
	};
	if(req.isAuthenticated()){
		res.locals.user = req.user;
		res.locals.originalUrl = req.originalUrl;
		if(req.session.passport.user.locked){ res.locals.user.locked = true; }
		if(req.user.language){
			req.setLocale(req.user.language);
		}
	}
	next();
});

var basicAuth = require('basic-auth'), auth = function(req, res, next){
	function unauthorized(res){
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};
	var user = basicAuth(req);
	if(!user || !user.name || !user.pass) return unauthorized(res);
	if(user.name === 'admin' && user.pass === 'admin123') return next();
	else return unauthorized(res);
};
app.use('/', auth, Routes.home)
	.use('/admin', auth, Routes.admin)
	.use('/moderator', auth, Routes.moderator)
	.use('/participant', auth, Routes.participant);

// app.use('/', Routes.home)
// 	.use('/admin', Routes.admin)
// 	.use('/moderator', Routes.moderator)
// 	.use('/participant', Routes.participant);

// catch 404 and forward to error handler
app.use(function(req, res, next){
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
	app.use(function(err, req, res, next){
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next){
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;