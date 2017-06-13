/*Generic require login routing middleware */
// check user is Login Status
exports.requiresLogin 		=	function (req, res, next) {
	if(!req.isAuthenticated()) {
		return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	}else if(req.isAuthenticated() && (req.user.isAdmin || req.user.isModerator)) {
		return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	}
	return next();
};
// check user is Login Status
exports.requiresNotLogin 		=	function (req, res, next) {
	if(req.isAuthenticated() && !(req.user.isAdmin || req.user.isModerator)) {
		return res.status(409).json({ status: false, error: req.__("YouAlreadyLoggedIn"), message: req.__("YouAlreadyLoggedIn"), });
	}
	return next();
};
// check Moderator is Login Status
exports.isModeratorAuthorized		=	function (req, res, next) {
	if(!req.isAuthenticated()) {
		return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	}else if(req.isAuthenticated() && !req.user.isModerator) {
		return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	}else if(req.isAuthenticated() && req.user.isModerator && req.session.passport.user.locked) {
		return res.status(401).json({ status: false, error: "Please Unlock your Account", message: "Please Unlock your Account", });
	}
	return next();
};
// check Moderator is Login Status
exports.isModeratorNotAuthorized	=	function (req, res, next) {
	if(req.isAuthenticated() && req.user.isModerator) {
		return res.status(409).json({ status: false, error: req.__("YouAlreadyLoggedIn"), message: req.__("YouAlreadyLoggedIn"), });
	}
	return next();
};
// check admin is Login Status
exports.isAdminAuthorized		=	function (req, res, next) {
	if(!req.isAuthenticated()) {
		return res.redirect("/admin/login");
	}else if(req.isAuthenticated() && !req.user.isAdmin) {
		return res.redirect("/admin/login");
	}
	return next();
};
// check admin is Login Status
exports.isAdminNotAuthorized	=	function (req, res, next) {
	if(req.isAuthenticated() && req.user.isAdmin) {
		return res.redirect("/admin");
	}
	return next();
};
// check request from same domain(localhost)
exports.isLocal	=	function (req, res, next) {
	var ip = require('ip'),
	localIp = req.connection.remoteAddress || req.socket.remoteAddress || req.headers['x-forwarded-for'];
	if(ip.isEqual(ip.address(), localIp)){
		return next();
	}
	return res.redirect((req.baseUrl || "/admin"));
};