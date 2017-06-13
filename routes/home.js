var 	express	=	require('express'),
	moment	=	require("moment"),
	Auth		=	require('basic-auth'),
	Async		=	require("async"),
	compare	=	require('compare-version')
	config		=	require("../config"),
	Models		=	require("../models"),
	Router		=	express.Router();

/* GET Home Page */
Router.get('/', function(req, res, next){
	var year = moment().format("YYYY");
	Models.SiteInfo.findOne().sort({ createdAt: -1 }).exec(function(err, siteinfo){
		var siteDetails = err ? { "title": "Mobiteach", "metakey": "Mobiteach", "metadescription": "Mobiteach", "logo": "/assets/images/logo-3.png", "file": "logo-3.png", } : siteinfo;
		Models.Version.findOne().sort({ createdAt: -1 }).exec(function(err, version){
			var versionDetails = err ? { number: "1.0.0", formatDate: moment().format("MM/DD/YYYY"), } : version.toObject();
			versionDetails.year = moment().format("YYYY");
			return res.status(200).render('index.html', { status: true, version: versionDetails, siteinfo: siteDetails, year: year, });
		});
	});
});
// 
Router.get('/version', function(req, res, next){
	Models.Version.findOne().sort({ createdAt: -1 }).exec(function(err, version){
		var versionDetails = err ? { number: "1.0.0", formatDate: moment().format("MM/DD/YYYY"), } : version.toObject();
		versionDetails.year = moment().format("YYYY");
		if(req.isAuthenticated()){
			var Id = "";
			if(req.user.isModerator) Id = req.user._id;
			else if(req.user.isParticipant) Id = req.user.moderatorId;
			Models.SiteInfo.findOrCreate({ moderatorId: Id, }, { title: "Mobiteach", metakey: "Mobiteach", metadescription: "Mobiteach", logo: "/assets/images/logo-3.png", file: "logo-3.png", moderatorId: Id, }, function(err, siteinfo){
				var siteDetails = err ? { "title": "Mobiteach", "metakey": "Mobiteach", "metadescription": "Mobiteach", "logo": "/assets/images/logo-3.png", "file": "logo-3.png", } : siteinfo;
				return res.status(200).json({ status: true, version: versionDetails, siteinfo: siteDetails, });
			});
		}else{
			Models.SiteInfo.findOne().sort({ createdAt: -1 }).exec(function(err, siteinfo){
				var siteDetails = err ? { "title": "Mobiteach", "metakey": "Mobiteach", "metadescription": "Mobiteach", "logo": "/assets/images/logo-3.png", "file": "logo-3.png", } : siteinfo;
				return res.status(200).json({ status: true, version: versionDetails, siteinfo: siteDetails, });
			});
		}
	});
});
// Update Version 
Router.get('/updateversion', function(req, res, next){
	var credentials = Auth(req);
	if(!credentials || credentials.name !== 'admin' || credentials.pass !== 'updateversion'){
		res.statusCode = 401;
		res.setHeader('WWW-Authenticate', 'Basic realm="example"');
		res.end('Access denied');
	}else res.render('updateversion.html', { title: config.app.name + " - " + req.__("UpdateVersion"), Locale: req.getCatalog(), });
}).post('/updateversion', function(req, res, next){
	var data = req.body, credentials = Auth(req);
	if(!credentials || credentials.name !== 'admin' || credentials.pass !== 'updateversion'){
		res.statusCode = 401;
		res.setHeader('WWW-Authenticate', 'Basic realm="example"');
		res.end('Access denied');
	}else{
		Models.Version.findOne().sort({ createdAt: -1 }).exec(function(err, version){
			if(err){
				req.flash("error", err.message);
				return res.status(400).redirect("/updateversion");
			}else if(!version || compare(data.number, version.number) == 1){
				Models.Version.create({ number: data.number, date: moment.utc().format("YYYY-MM-DDTHH:mm:ss"), }, function(err, version){
					if(err){
						req.flash("error", err.message);
						return res.status(400).redirect("/updateversion");
					}else{
						req.flash("success", req.__("UpdatedSuccessfully"));
						return res.status(200).redirect("/updateversion");
					}
				});
			}else{
				req.flash("error", req.__("InvalidVersion"));
				return res.status(400).redirect("/updateversion");
			}
		});
	}
});

module.exports = Router;