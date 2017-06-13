var 	express	=	require('express'),
	lodash		=	require('lodash'),
	multiparty	=	require('connect-multiparty'),
	gm		=	require('gm').subClass({ imageMagick: true }),
	path		=	require('path'),
	moment	=	require('moment'),
	Passport	=	require('../passport'),
	Authorization	=	require('../authorization'),
	Models		=	require("../models"),
	Router		=	express.Router(),
	Multipart	=	multiparty();

/*Router.use(function(req, res, next){
	Models.Version.findOne().sort({ createdAt: -1 }).exec(function(err, version){
		if(version){
			res.locals.version = version;
		}
		next();
	});
});*/

module.exports = Router;