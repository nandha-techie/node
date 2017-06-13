var 	express	=	require('express'),
	lodash		=	require('lodash'),
	async		=	require("async"),
	mongoose	=	require("mongoose"),
	Multiparty	=	require('connect-multiparty'),
	gm		=	require('gm').subClass({ imageMagick: true }),
	path		=	require('path'),
	moment	=	require('moment'),
	_		=	require("underscore"),
	uuid		=	require("uuid"),
	Request	=	require("request"),
	QRCode	=	require('qrcode'),
	o2x		=	require('object-to-xml'),
	hbs		=	require('nodemailer-express-handlebars'),
	Validator	=	require('validatorjs'),
	Parser		=	require('xml2json'),
	exec		=	require('child_process').exec,
	js2xmlparser	=	require("js2xmlparser"),
	randomString	=	require('randomstring'),
	fs		=	require("fs"),
	Zip		=	require('node-7z'),
	forEach	=	require('forEachAsync').forEachAsync,
	Passport	=	require('../passport'),
	Models		=	require('../models'),
	Authorization	=	require('../authorization'),
	Config		=	require("../config"),
	functions	=	require("../functions"),
	multipart	=	Multiparty(),
	Router		=	express.Router(),
	Transporter	=	Config.mail.nodemail;

Transporter.use('compile', hbs(Config.mail.options));
Validator.register('confirmed', function(val, req, key){
	var confirmedKey = key + '_confirmation';
	if(this.validator.input[confirmedKey].toUpperCase() === val.toUpperCase()){
		return true;
	}
	return false;
}, 'The email confirmation does not match.');
// GET home page
Router.get('/', function(req, res, next){
	return res.render('moderator/index', { title: Config.app.name + " - Moderator", });
});
/*Login via Ajax*/
Router.post('/login', Authorization.isModeratorNotAuthorized, function(req, res, next){
	var data = req.body,
	email = data.email.toLowerCase();
	Passport.authenticate('ModeratorAjax', function(err, authuser, info){
		if(err) return res.status(400).json({ status: 0, error: err.message });
		else if(!authuser) return res.status(400).json({ status: 0, error: req.__("InvalidCredentials"), message: null });
		else{
			req.logIn(authuser, function(err){
				if(err){
					req.logout();
					return res.status(400).json({ status: 0, error: err.message });
				}
				var qs = authuser.toObject();
				delete qs.password;
				Models.Rooms.findOne({ moderatorId: authuser._id }).exec(function(err, room){
					if(err){
						req.logout();
						return res.status(400).json({ status: false, error: err.message, });
					}else{
						qs.room = room;
						return res.status(200).json({ status: true, error: [], message: req.__("LoggedIn"), user: qs, });
					}
				});
			});
		}
	})(req, res, next);
}); // check Moderator entered details with database (Ajax)
// Active Paticipants
Router.get("/activeparticipant", Authorization.isModeratorAuthorized, function(req, res, next){
	var date = moment().subtract(2, "minutes").format("YYYY-MM-DDTHH:mm:ss");
	Models.ParticipantLogin.remove({ lastUpdate: { $lt: date } });
	Models.ParticipantLogin.find({ moderatorId: req.user._id, lastUpdate: { $gte: date } }).exec(function(err, logins){
		if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
		else return res.status(200).json({ status: true, logins: logins, });
	});
}); // get Active Paticipants
// Logout All Logged In Participants
Router.post("/logoutparticipants", Authorization.isModeratorAuthorized, function(req, res, next){
	Models.Rooms.findOne({ moderatorId: req.user._id }).exec(function(err, room){
		if(err || !room){
			var errorMessage = err ? err.message : req.__("NotFound");
			return res.status(400).json({ status: false, error: errorMessage, });
		}else{
			req.app.get("io").to(room.code).emit('participantLogOut');
			return res.status(200).json({ status: true, message: req.__("UpdatedSuccessfully"), });
		}
	});
});
// Forgot Password
Router.post('/forgotpasswd', Authorization.isModeratorNotAuthorized, function(req, res, next){
	var data = req.body, token = uuid.v4(),
	resetPasswordLink = Config.app.baseUrl + "moderator#/resetpwd/" + token,
	rules = { email: "required|email", }, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, });
	}else{
		var email = data.email.toLowerCase();
		async.waterfall([
			function(callback){ Models.Moderator.findOne({ email: email, }).exec(callback); },
			function(moderator, callback){
				if(!moderator) callback({ message: req.__("EmailNotFound"), });
				else{
					Models.Token.remove({ moderatorId: moderator._id }, function(err){
						Models.Token.create({ moderatorId: moderator._id, token: token }, function(err, create){
							callback(err, moderator, create);
						});
					});
				}
			},
			function(moderator, create, callback){
				Transporter.sendMail({
					from: Config.mailOptions.from,
					to: moderator.email,
					subject: 'Reset Password Link',
					template: 'forgotpass',
					context: {
						url: Config.app.baseUrl,
						resetLink: resetPasswordLink,
						name: moderator.name
					},
				}, function(err, info){
					callback(err, moderator, create, info)
				});
			},
		], function(err, moderator, create, info){
			if(err) return res.status(404).json({ status: false, error: err.message, });
			else return res.status(200).json({ error: null, message: req.__("ResetPasswordMsg"), status: true, });
		});
	}
});
// Moderator Register
Router.post('/register', Authorization.isModeratorNotAuthorized, function(req, res, next){
	var data = req.body,
	password = Math.random().toString(24).slice(2),
	rules = {
		firstname: "required|min:3|max:25",
		lastname: "required|min:3|max:25",
		email: "required|email",
		accepted: "required|in:true",
	}, validation = new Validator(data, rules);
	data.password = password;
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, data: data, error: error, });
	}else{
		var email = data.email.toLowerCase();
		Models.Moderator.findOne({ email: email }).exec(function(err, exists){
			if(err || exists){
				var errorMessage = err ? err.message : req.__("EmailAlreadyRegistered");
				return res.status(400).json({ status: false, data: data, error: errorMessage, });
			}else{
				var moderatorData = {
					username: moment().format("YYYYMMDDTHHmmssSS"),
					firstname: data.firstname,
					lastname: data.lastname,
					email: email,
					password: data.password,
				};
				if(data.organisation){ moderatorData.organisation = data.organisation; }
				Models.Moderator.create(moderatorData, function(err, moderator){
					if(err) return res.status(400).json({ status: false, data: data, error: err.message, });
					else{
						var code = randomString.generate({ capitalization: "uppercase", length: 6 }), // random 6 digit code (number and upper case characters)
						date = new Date().getTime();
						Models.Folder.create({ moderatorId: moderator._id, name: code, isRoot: true, }, function(err, folder){
							if(err){
								moderator.remove();
								return res.status(400).json({ status: false, data: data, error: err.message, });
							}else{
								var upload = path.join(__dirname, '../public/qrimage/'),
								url = Config.app.baseUrl + "participant#/room",
								qrFile = moment().format("YYYYMMDDHHmmssSS-[qr.png]"),
								qrPath = upload + qrFile;
								functions.mkDirNotExists([upload,]);
								QRCode.save(qrPath, url, function(err, written){
									if(err){
										moderator.remove();
										return res.status(400).json({ status: false, error: err.message, data: data, });
									}else{
										Models.Rooms.create({ moderatorId: moderator._id, code: code, startDate: date, qrFile: qrFile, }, function(err, room){
											if(err){
												moderator.remove();
												return res.status(400).json({ status: false, data: data, error: err.message, });
											}else{
												var mailOptions = {
													from: Config.mailOptions.from,
													to: email,
													template: 'moderator',
													subject: 'Creation of your user account',
													context: {
														url: Config.app.baseUrl,
														email: email,
														password: data.password,
														name: moderator.name,
														room: room.code,
														moderatorUrl: Config.app.baseUrl + 'moderator',
													},
												};
												Transporter.sendMail(mailOptions, function(error, info){
													if(error){
														moderator.remove();
														room.remove();
														return res.status(400).json({ status: false, data: data, error: error.message, });
													}else{
														functions.createFeed({ user: moderator }, 'register', 'You Are Registered Successfully.');
														return res.status(201).json({ status: true, error: null, message: req.__("RegisteredSuccessfully"), });
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
});
// Sign Out
Router.get('/logout', function(req, res, next){
	async.eachSeries(req.cookies, function(key, callback){
		res.clearCookie(key);
		callback();
	}, function done(){
		req.session.destroy();
		req.logout();
		return res.status(200).redirect("/");
	});
});
// Lock Screen
Router.post("/lock", Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body;
	Models.Moderator.findOne({ _id: data._id, }).select("-password").exec(function(err, moderator){ // with email
		if(err || !moderator){
			var errorMessage = err ? err.message : req.__("UserNotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: 0, error: errorMessage, });
		}else{
			var qs = moderator.toObject();
			Models.Rooms.findOne({ moderatorId: moderator._id }).exec(function(err, room){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					qs.locked = true;
					req.session.passport.user.locked = true;
					qs.room = room;
					return res.status(200).json({ status: true, error: [], message: req.__("LoggedIn"), user: qs, });
				}
			});
		}
	});
});
// Un Lock Screen
Router.post("/unlock", function(req, res, next){
	if(!req.isAuthenticated()) return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	else if(req.isAuthenticated() && !req.user.isModerator) return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	else{
		var data = req.body;
		Models.Moderator.findOne({ _id: data._id, }).exec(function(err, moderator){ // with email
			if(err || !moderator){
				var errorMessage = err ? err.message : req.__("UserNotFound"),
				status = err ? 400 : 404;
				return res.status(status).json({ status: 0, error: errorMessage, });
			}else{
				moderator.comparePassword(data.password, function(err, isMatch){
					if(err) return res.status(400).json({ status: 0, error: err.message, message: null });
					else if(isMatch){
						var qs = moderator.toObject();
						delete qs.password;
						Models.Rooms.findOne({ moderatorId: moderator._id }).exec(function(err, room){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								req.session.passport.user.locked = false;
								qs.room = room;
								return res.status(200).json({ status: true, error: [], message: req.__("LoggedIn"), user: qs, });
							}
						});
					}else return res.status(400).json({ status: 0, error: req.__("InvalidCredentials") });
				});
			}
		});
	}
});
// Reset Password
Router.route('/resetpasswd/:token')
.get(Authorization.isModeratorNotAuthorized, function(req, res, next){
	var token = req.params.token;
	Models.Token.findOne({ token: token }).exec(function(err, data){
		if(err || !data){
			var errorMessage = err ? err.message : req.__("TokenNotFound");
			return res.status(400).json({ status: false, error: errorMessage, });
		}else return res.status(200).json({ status: true, message: req.__("PleaseEnterNewPassword"), data: data, });
	});
}).post(Authorization.isModeratorNotAuthorized, function(req, res, next){
	var data = req.body, token = req.params.token,
	rules = { password: "required|confirmed|min:8|max:25",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, });
	}else{
		Models.Token.findOne({ token: token }).exec(function(err, details){
			if(err || !details){
				var errorMessage = err ? err.message : req.__("TokenNotFound");
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Models.Moderator.findOne({ _id: details.moderatorId }).exec(function(err, moderator){
					if(err || !moderator){
						var errorMessage = err ? err.message : req.__("UserNotFound"),
						status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						moderator.password = data.password;
						moderator.save(function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								details.remove();
								return res.status(200).json({ status: true, message: req.__("PasswordUpdated"), error: null });
							}
						});
					}
				});
			}
		});
	}
});
// Moderator Profile
Router.route("/profile")
.get(function(req, res, next){
	if(!req.isAuthenticated()) return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	else if(req.isAuthenticated() && !req.user.isModerator) return res.status(401).json({ status: false, error: req.__("Unauthorized"), message: req.__("Unauthorized"), });
	else{
		var code = randomString.generate({ capitalization: "uppercase", length: 6 }), // random 6 digit code (number and upper case characters)
		date = new Date().getTime(), moderator = req.user,
		pin = randomString.generate({ charset: "numeric", length: 4 }), // random 4 digit code (number and upper case characters)
		qs = moderator.toObject();
		qs.password = null;
		Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(function(err, room){
			if(err) return res.status(400).json({ status: false, error: req.__("SomeThingWrong"), });
			else if(!room){
				var upload = path.join(__dirname, '../public/qrimage/'),
				url = Config.app.baseUrl + "participant#/room",
				qrFile = moment().format("YYYYMMDDHHmmssSS-[qr.png]"),
				qrPath = upload + qrFile;
				functions.mkDirNotExists([upload,]);
				QRCode.save(qrPath, url, function(err, written){
					if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
					else{
						Models.Rooms.create({ moderatorId: req.user._id, code: code, qrFile: qrFile, }, function(err, room){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								qs.room = room;
								return res.status(200).json({ status: true, error: null, user: qs, });
							}
						});
					}
				});
			}else{
				qs.room = room;
				return res.status(200).json({ status: true, error: null, user: qs, });
			}
		});
	}
}).post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, rules = {
		firstname: "required|min:3|max:25",
		lastname: "required|min:3|max:25",
		email: "required|email",
		participantLogin: "required|in:0,1,2",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, data: data, error: error, });
	}else{
		Models.Rooms.findOne({ moderatorId: req.user._id }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : req.__("SomeThingWrong");
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Models.Moderator.findOne({ _id: req.user._id }).exec(function(err, moderator){
					if(err || !moderator){
						var errorMessage = err ? err.message : req.__("ModeratorNotFound");
						return res.status(400).json({ status: false, error: errorMessage, });
					}else{
						var email = data.email.toLowerCase();
						Models.Moderator.findOne({ _id: { $ne: req.user._id }, email: email }).exec(function(err, exists){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else if(exists) return res.status(400).json({ status: false, error: req.__("EmailAlreadyRegistered"), });
							else{
								// var changeLang = (moderator.language == data.language) ? false : true;
								moderator.firstname = data.firstname;
								moderator.lastname = data.lastname;
								moderator.email = email;
								moderator.language = data.language;
								moderator.organisation = (data.organisation) ? data.organisation : undefined;
								if(data.password){ moderator.password = data.password; }
								/*moderator.participantLogin = parseInt(data.participantLogin);
								room.participantLogin = parseInt(data.participantLogin);
								room.save(function(err){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else{*/
										moderator.save(function(err){
											if(err) return res.status(400).json({ status: false, error: err.message, });
											else return res.status(200).json({ status: false, message: req.__("ProfileUpdated"), user: moderator, room: room, });
										});
									/*}
								});*/
							}
						});
					}
				});
			}
		});
	}
});
// Participants Management
Router.route("/participants").get(Authorization.isModeratorAuthorized, function(req, res, next){
	var page = req.query.page ? parseInt(req.query.page) : 1,
	limit = req.query.limit ? parseInt(req.query.limit) : 5,
	search = req.query.search ? req.query.search : '',
	date = moment().subtract(2, "minutes").format("YYYY-MM-DDTHH:mm:ss");
	var condition = { moderatorId: req.user._id },
	regex = new RegExp(search, 'i');
	if(search){
		condition = { moderatorId: req.user._id,
			$or: [{ firstname: { $regex: regex, }
			}, { lastname: { $regex: regex, }
			}, { email: { $regex: regex, } }]
		};
	}
	Models.Participant.count({ moderatorId: req.user._id, }).exec(function(err, count){
		if(err) return res.status(400).json({ status: false, error: err.message, message:null });
		else{
			if(limit < 0){ limit = count; }
			var skip = (page - 1) * limit;
			Models.Participant.find(condition).limit(limit).skip(skip).exec(function(err, participants){
				if(err) return res.status(400).json({ status: false, error: err.message, message:null });
				else{
					var numPage = (search) ? participants.length : count;
					var pages = functions.getArrayPages(req)(10, Math.ceil(numPage / limit), page);
					Models.ParticipantLogin.find({ moderatorId: req.user._id, lastUpdate: { $gte: date } }).exec(function(err, logins){
						if(err) return res.status(400).json({ status: false, error: err.message, message:null });
						else{
							var resultParticipants = participants.map(function(participant){
								var tmpParticipant = participant.toObject();
								tmpParticipant.logIn = (Object.keys(_.indexBy(logins, 'participantId')).indexOf(String(tmpParticipant._id)) > -1);
								return tmpParticipant;
							});
							return res.status(200).json({
								status: true,
								participants: resultParticipants,
								pages: pages,
								currentPage: page,
								total: count,
								limit: limit,
								skip: skip,
							});
						}
					});
				}
			});
		}
	});
}) // Participants Listing
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, rules = {
		firstname: "required|min:3|max:25",
		lastname: "required|min:3|max:25",
		email: "required|email",
		password: "required|min:8|max:25|confirmed",
		language: "required|in:en,fr"
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ error: error, status: false, data: data, });
	}else{
		var email = data.email.toLowerCase();
		Models.Rooms.findOne({ moderatorId: req.user._id }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : req.__("UnableCreateParticipant");
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Models.Participant.findOne({ email: email, moderatorId: req.user._id }).exec(function(err, exists){
					if(err || exists){
						var errorMessage = err ? err.message : req.__("EmailAlreadyRegistered");
						return res.status(400).json({ status: false, error: errorMessage, data: data, });
					}else{
						var participantData = {
							firstname: data.firstname,
							lastname: data.lastname,
							email: email,
							password: data.password,
							status: data.status,
							language: data.language,
							roomId: room._id,
							moderatorId: req.user._id,
						}, mailOptions = {
							from: Config.mailOptions.from,
							to: email,
							template: 'participant',
							subject: 'Mobiteach - Invitation',
							context: {
								url: Config.app.baseUrl,
								participantUrl: Config.app.baseUrl + 'participant',
								email: email,
								password: data.password,
								moderator: req.user.name,
								name: data.firstname + " " + data.lastname,
								room: room.code,
								pin: room.pin,
								participantLogin0: (room.participantLogin == 0),
								participantLogin1: (room.participantLogin == 1),
								participantLogin2: (room.participantLogin == 2),
							},
						};
						if(data.organisation){ participantData.organisation = data.organisation; }
						Models.Participant.create(participantData, function(err, participant){
							if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
							else{
								Transporter.sendMail(mailOptions, function(error, info){
									functions.createFeed(req, 'user_create', participant.name + ' Student Added Successfully.');
									return res.status(200).json({ status: true, message: req.__('ParticipantsCreatedSuccessfully'), participant: participant, });
								});
							}
						});
					}
				});
			}
		});
	}
}); // create new Participant function
// Participant Management
Router.route("/participant/:id/").get(Authorization.isModeratorAuthorized, function(req, res, next){
	var participantId = req.params.id;
	Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id }).exec(function(err, participant){
		if(err || !participant){
			var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else return res.status(200).json({ status: true, data: participant, error: null, });
	});
}) // get Participant details by id
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var participantId = req.params.id,
	data = req.body,
	rules = {
		firstname: "required|min:3|max:25",
		lastname: "required|min:3|max:25",
		email: "required|email",
		language: "required|in:en,fr",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id }).exec(function(err, participant){
			if(err || !participant){
				var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, data: data, });
			}else{
				var email = data.email.toLowerCase();
				Models.Participant.findOne({ _id: { $ne: participantId }, email: email, moderatorId: req.user._id, }).exec(function(err, exists){
					if(err || exists){
						var errorMessage = err ? err.message : req.__("EmailAlreadyRegistered");
						return res.status(400).json({ status: false, error: errorMessage, data: data, });
					}else{
						participant.firstname = data.firstname;
						participant.lastname = data.lastname;
						participant.email = email;
						participant.language = data.language;
						if(data.organisation){ participant.organisation = data.organisation; }
						if(data.password){ participant.password = data.password; }
						participant.save(function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
							else{
								functions.createFeed(req, 'user_update', participant.name + ' Student Updated Successfully.');
								return res.status(200).json({ status: true, participant: participant, message: req.__("ParticipantsUpdatedSuccessfully"), });
							}
						});
					}
				});
			}
		});
	}
}) // update Participant details by id
.delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var participantId = req.params.id;
	Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(function(err, participant){
		if(err || !participant){
			var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			var participantName = participant.name;
			participant.remove(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					functions.createFeed(req, 'user_delete', participantName + ' Student Deleted Successfully.');
					return res.status(200).json({ status: true, error: null, message: req.__("ParticipantDeletedSuccessfully"), });
				}
			});
		}
	});
}); // delete Participant by id
// Ban Participant
Router.post("/participant/:id/ban", Authorization.isModeratorAuthorized, function(req, res, next){
	var participantId = req.params.id;
	Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, status: true, }).exec(function(err, participant){
		if(err || !participant){
			var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			participant.status = false;
			participant.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
				else{
					functions.createFeed(req, 'user_ban', participant.name + ' Student Baned Successfully.');
					return res.status(200).json({ status: true, error: null, message: req.__("UpdatedSuccessfully"), });
				}
			});
		}
	});
}); // Ban Participant by id
// Permit Participant
Router.post("/participant/:id/permit", Authorization.isModeratorAuthorized, function(req, res, next){
	var participantId = req.params.id;
	Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, status: false, }).exec(function(err, participant){
		if(err || !participant){
			var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			participant.status = true;
			participant.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
				else{
					functions.createFeed(req, 'user_permit', participant.name + ' Student Permited Successfully.');
					return res.status(200).json({ status: true, error: null, message: req.__("UpdatedSuccessfully"), });
				}
			});
		}
	});
}); // Permit Participant by id
// Moderator Library
Router.route("/library").get(Authorization.isModeratorAuthorized, function(req, res, next){
	var code = randomString.generate({ capitalization: "uppercase", length: 6 }); // random 6 digit code (number and upper case characters)
	Models.Folder.findOrCreate({ moderatorId: req.user._id, isRoot: true, }, { moderatorId: req.user._id, name: code, isRoot: true, }, function(err, folder){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			async.parallel({
				files: function(callback){
					Models.File.find({ folderId: folder._id, moderatorId: req.user._id, }).exec(callback);
				},
				attachments: function(callback){
					Models.Attachment.find({ moderatorId: req.user._id, }).exec(callback);
				},
			}, function(err, results){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					for(var i = 0; i < results.files.length; i++){
						var file = results.files[i].toObject();
						for (var j = 0; j < results.attachments.length; j++){
							if(String(results.attachments[j].fileId) == String(results.files[i]._id)){
								file.attachment = results.attachments[j];
							}
						}
						results.files[i] = file;
					}
					return res.status(200).json({ status: true, folder: folder, files: results.files, });
				}
			});
		}
	});
});
// Create New Folder
Router.route("/library/folder/:folderId?/new")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body,
	folderId = req.params.folderId,
	rules = {
		name: "required|min:2|max:25",
	}, validation = new Validator(data, rules),
	code = randomString.generate({ capitalization: "uppercase", length: 6 });
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		functions.getBaseFolder(req, code, function(err, folder){
			if(err || !folder){
				var errorMessage = err ? err.message : "Fodler Not Found",
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.File.create({ folderId: folder._id, moderatorId: req.user._id, name: data.name, description: data.description, type: 'folder', }, function(err, file){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						Models.Folder.create({ moderatorId: req.user._id, name: data.name, isRoot: false, fileId: file._id, }, function(err, subfolder){
							if(err){
								file.remove();
								return res.status(400).json({ status: false, error: err.message, });
							}else{
								functions.createFeed(req, 'folder_create', subfolder.name + ' Folder Created Successfully.');
								return res.status(200).json({ status: true, message: "Folder Created Successfully", });
							}
						});
					}
				});
			}
		});
	}
});
// Folder Management
Router.route("/library/folder/:folderId")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var folderId = req.params.folderId;
	Models.File.findOne({ _id: folderId, moderatorId: req.user._id, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : "Folder Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else return res.status(200).json({ status: true, file: file, });
	});
})
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var folderId = req.params.folderId,
	data = req.body, rules = {
		name: "required|min:2|max:25",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Folder.findOne({ fileId: folderId, moderatorId: req.user._id, }).exec(function(err, folder){
			if(err || !folder){
				var errorMessage = err ? err.message : "Folder Not Found",
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.File.findOne({ _id: folderId, moderatorId: req.user._id, }).exec(function(err, file){
					if(err || !file){
						var errorMessage = err ? err.message : "Folder Not Found",
						status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						folder.name = data.name;
						folder.save(function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								file.name = data.name;
								file.description = data.description;
								file.save(function(err){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else{
										functions.createFeed(req, 'folder_update', folder.name + ' Folder Updated Successfully.');
										return res.status(200).json({ status: true, message: "Folder Updated Successfully!", });
									}
								});
							}
						});
					}
				});
			}
		});
	}
})
.delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var folderId = req.params.folderId;
	Models.Folder.findOne({ fileId: folderId, moderatorId: req.user._id, }).exec(function(err, folder){
		if(err || !folder){
			var errorMessage = err ? err.message : "Folder Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.File.find({ folderId: folder._id, moderatorId: req.user._id, }).exec(function(err, files){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else if(files.length > 0) return res.status(400).json({ status: false, error: "Unable to delete folder", });
				else{
					var folderName = folder.name;
					folder.remove(function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							functions.createFeed(req, 'folder_delete', folderName + ' Folder Deleted Successfully.');
							return res.status(200).json({ status: true, error: null, message: "Folder Deleted Successfully", });
						}
					});
				}
			});
		}
	});

});
// Fodler View
Router.route("/library/folder/:folderId/view")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var folderId = req.params.folderId;
	Models.Folder.findOne({ fileId: folderId, moderatorId: req.user._id, }).exec(function(err, folder){
		if(err || !folder){
			var errorMessage = err ? err.message : "Folder Not Found", status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.File.findOne({ _id: folderId, moderatorId: req.user._id, }).exec(function(err, file){
				if(err || !file){
					var errorMessage = err ? err.message : "Folder Not Found",
					status = err ? 400 : 404;
					return res.status(status).json({ status: false, error: errorMessage, });
				}else{
					Models.Folder.findOne({ _id: file.folderId, moderatorId: req.user._id, }).exec(function(err, rootFolder){
						if(err || !rootFolder){
							var errorMessage = err ? err.message : "Folder Not Found",
							status = err ? 400 : 404;
							return res.status(status).json({ status: false, error: errorMessage, });
						}else{
							async.parallel({
								files: function(callback){
									Models.File.find({ folderId: folder._id, moderatorId: req.user._id, }).exec(callback);
								},
								attachments: function(callback){
									Models.Attachment.find({ moderatorId: req.user._id, }).exec(callback);
								},
							}, function(err, results){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else{
									for(var i = 0; i < results.files.length; i++){
										var attachment = results.files[i].toObject();
										for (var j = 0; j < results.attachments.length; j++){
											if(String(results.attachments[j].fileId) == String(results.files[i]._id)){
												attachment.attachment = results.attachments[j];
											}
										}
										results.files[i] = attachment;
									}
									var newFolder = folder.toObject();
									newFolder.file = file;
									newFolder.rootFolder = rootFolder;
									return res.status(200).json({ status: true, folder: newFolder, files: results.files, });
								}
							});
						}
					});
				}
			});
		}
	});
});
// Create New Attachment
Router.post("/library/attachment/:folderId?/new", Authorization.isModeratorAuthorized, multipart, function(req, res, next){
	var data = req.body, folderId = req.params.folderId,
	rules = {
		isFile: "required",
		title: "required",
	}, file = req.files.file,
	code = randomString.generate({ capitalization: "uppercase", length: 6 });
	if(data.isFile == "true") rules.file = "required";
	else rules.url = "required|url";
	var validation = new Validator(data, rules),
	upload = path.join(__dirname, '../public/attachments/'),
	thumbnail = path.join(upload, '/thumbnail/');
	functions.mkDirNotExists([upload, thumbnail,]);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		var type = (data.isFile == "true") ? 'file' : 'url', docType = 'document';
		// docType = (data.isFile == "true") ? 'document' : 'url';
		functions.getBaseFolder(req, code, function(err, folder){
			if(err || !folder){
				var errorMessage = err ? err.message : "Fodler Not Found",
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.File.create({ folderId: folder._id, moderatorId: req.user._id, name: data.title, type: docType, }, function(err, attrfile){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						if(data.isFile == "true"){
							var originalFilename = file.originalFilename.replace(/ /g,''),
							originalExtension = path.extname(originalFilename),
							extension = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.png', '.zip'],
							fileName = moment().format("YYYYMMDDHHmmssSS-") + originalFilename,
							filePath = upload + fileName,
							fileType = (['.jpg', '.png'].indexOf(originalExtension) > -1) ? 'image' : ((['.doc', '.docx'].indexOf(originalExtension) > -1) ? 'doc' : ((['.ppt', '.pptx'].indexOf(originalExtension) > -1) ? 'ppt' : ((['.pdf'].indexOf(originalExtension) > -1) ? 'pdf' : 'zip')));
							if(extension.indexOf(originalExtension) != -1){
								async.waterfall([
									function(callback){ fs.readFile(file.path, callback); },
									function(fileData, callback){ fs.writeFile(filePath, fileData, callback); },
									function(callback){
										if(fileType == 'image'){ gm(filePath).resize(200, 150, '!').write(thumbnail + fileName, function(err){}); }
										functions.generateHtml(fileType, filePath, originalFilename, callback);
									},
									function(message, callback){
										var attachmentData = { moderatorId: req.user._id, 
											fileId: attrfile._id, type: type, title: data.title, 
											file: fileName, fileType: fileType, };
										if(fileType == 'zip') attachmentData.directory = message.directory;
										Models.Attachment.create(attachmentData, callback);
									},
								], function(err, attachment){
									if(err){
										attrfile.remove();
										return res.status(400).json({ status: false, error: err.message, });
									}else{
										functions.createFeed(req, 'attachment_create', attachment.title + ' Attachment Created Successfully.');
										var attrfile1 = attrfile.toObject();
										attrfile1.attachment = attachment;
										return res.status(200).json({ status: true, message: "Attachment Created Successfully", attachment: attrfile1, fileType: fileType, });
									}
								});
							}else return res.status(400).json({ status: false, error: "File Type not Accepted.Please select Pdf, Document and Image Files", });
						}else{
							functions.GetYouTubeVimeoID(data.url, function(err, video){
								if(err){
									attrfile.remove();
									return res.status(400).json({ status: false, error: err.message, });
								}else{
									var fileName = moment().format("YYYYMMDDHHmmssSS-") + video.id + '.jpg',
									filePath = upload + fileName;
									Request(video.originalFilePath).pipe(fs.createWriteStream(filePath))
									Models.Attachment.create({ moderatorId: req.user._id, fileId: attrfile._id, type: type, file: fileName, title: data.title, url: data.url, fileType: 'url' }, function(err, attachment){
										if(err){
											attrfile.remove();
											return res.status(400).json({ status: false, error: err.message, });
										}else{
											functions.createFeed(req, 'attachment_create', attachment.title + ' Attachment Created Successfully.');
											return res.status(200).json({ status: true, message: "Attachment Created Successfully", });
										}
									});
								}
							});
						}
					}
				});
			}
		});
	}
});
// Attachment Management
Router.route("/library/attachment/:attachmentId")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var attachmentId = req.params.attachmentId;
	Models.File.findOne({ _id: attachmentId, moderatorId: req.user._id, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : "Attachment Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.Folder.findOne({ _id: file.folderId, moderatorId: req.user._id, }).exec(function(err, folder){
				if(err || !folder){
					var errorMessage = err ? err.message : "Attachment Not Found",
					status = err ? 400 : 404;
					return res.status(status).json({ status: false, error: errorMessage, });
				}else{
					Models.Attachment.findOne({ fileId: attachmentId, moderatorId: req.user._id, }).exec(function(err, attachment){
						if(err || !attachment){
							var errorMessage = err ? err.message : "Attachment Not Found",
							status = err ? 400 : 404;
							return res.status(status).json({ status: false, error: errorMessage, });
						}else{
							var fileData = file.toObject();
							fileData.attachment = attachment;
							fileData.rootFolder = folder;
							return res.status(200).json({ status: true, file: fileData, });
						}
					});
				}
			});
		}
	})
})
.delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var attachmentId = req.params.attachmentId;
	Models.Attachment.findOne({ fileId: attachmentId, moderatorId: req.user._id, }).exec(function(err, attachment){
		if(err || !attachment){
			var errorMessage = err ? err.message : "Attachment Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			var upload = path.join(__dirname, '../public/attachments/'),
			thumbnail = path.join(upload, '/thumbnail/'), file = path.join(upload, attachment.file),
			thumbFile = path.join(thumbnail, attachment.file), title = attachment.title,
			originalFile = path.join(upload, attachment.file.replace(path.extname(attachment.file), ""));
			attachment.remove(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					functions.unlinkFiles([file, thumbFile, originalFile, ]);
					functions.createFeed(req, 'attachment_delete', title + ' Attachment Deleted Successfully.');
					return res.status(200).json({ status: true, error: null, message: "Attachment Deleted Successfully", });
				}
			});
		}
	});
});
// Activities (Quiz) Creation
Router.route("/library/quiz/:folderId?/new")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, folderId = req.params.folderId,
	rules = {
		name: "required|min:2|max:25",
		// category: "required",
	}, validation = new Validator(data, rules),
	code = randomString.generate({ capitalization: "uppercase", length: 6 });
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : req.__("UnableCreateActivity");
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				functions.getBaseFolder(req, code, function(err, folder){
					if(err || !folder){
						var errorMessage = err ? err.message : "Fodler Not Found", status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						Models.File.create({ folderId: folder._id, moderatorId: req.user._id, name: data.name, type: 'quiz', }, function(err, attrfile){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								var categoryId = (data.category) ? data.category : undefined;
								Models.Activities.create({ moderatorId: req.user._id, roomId: room._id, fileId: attrfile._id, name: data.name, type: 'quiz', categoryId: categoryId, }, function(err, activity){
									if(err){
										attrfile.remove();
										return res.status(400).json({ status: false, error: err.message, data: data, });
									}else{
										functions.createFeed(req, 'activity_create', activity.name + ' Activity Created Successfully.');
										return res.status(200).json({ status: true, message: "Quiz Created Successfully", });
									}
								});
							}
						});
					}
				});
			}
		});
	}
}); // Create New Activity
// Create New Question
Router.post("/library/questions/:activityId/new", Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, rules = {
		name: "required|min:5",
		type: "required|in:truefalse,single,multiple,free,blank",
		answer: "required|array",
	}, activityId = req.params.activityId;
	if(data.type && data.type != 'free' && data.type != 'blank'){ rules.options = "required|array"; }
	var validation = new Validator(data, rules);
	Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, type: "quiz", }).exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : "Quiz Not Found", status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else if(validation.fails()){
			var errors = validation.errors.all(),
			error = errors[Object.keys(errors)[0]][0];
			return res.status(400).json({ status: false, error: error, data: data, });
		}else{
			Models.Question.count({ moderatorId: req.user._id, activityId: activity._id }, function(err, count){
				if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
				else{
					var questionData = { moderatorId: req.user._id, activityId: activity._id, 
						name: data.name, status: true, type: data.type,
						sort: (count + 1), timelimit: data.timelimit,
					};
					questionData.media = (data.media && data.media.length > 0) ? data.media : undefined;
					questionData.random = (data.random) ? data.random : 0;
					questionData.feedback = (data.feedback) ? data.feedback : undefined;
					Models.Question.create(questionData, function(err, question){
						if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
						else{
							if(question.type == 'free' || question.type == 'blank'){
								forEach(data.answer, function(Rnext, element, index, array){
									if(element != null && element != false){
										Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
											if(!err && count <= 0){
												Models.QuestionAnswer.create({ questionId: question._id, answer: element }, function(err, questionanswer){
													Rnext();
												});
											}else Rnext();
										});
									}else Rnext();
								}).then(function(){
									return res.status(200).json({ status: true, error: null, message: "Question Created Successfully", });
								});
							}else if(question.type == "truefalse"){
								var options = ['TRUE', 'FALSE'];
								forEach(options, function(nextProperty, element, index, array){
									if(element != 'null' && element != null){
										Models.Options.create({ questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
											if(err) nextProperty();
											else{
												forEach(data.answer, function(Rnext, val, index, array){
													if(val == element  && (val != 'null' && val != null)){
														Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
															if(!err && count <= 0){
																Models.QuestionAnswer.create({ questionId: question._id, optionId: option._id }, function(err, questionanswer){
																	Rnext();
																});
															}else Rnext();
														});
													}else Rnext();
												}).then(function(){ nextProperty(); });
											}
										});
									}else nextProperty();
								}).then(function(){
									return res.status(200).json({ status: true, error: null, message: "Question Created Successfully", });
								});
							}else{
								forEach(data.options, function(nextProperty, element, index, array){
									if(element != 'null' && element != null){
										Models.Options.create({ questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
											if(err) nextProperty();
											else{
												forEach(data.answer, function(nextAnswer, Avalue, index, array){
													if(Avalue == element  && (Avalue != 'null' && Avalue != null)){
														if(question.type == 'single'){
															Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
																if(!err && count <= 0){
																	Models.QuestionAnswer.create({ questionId: question._id, optionId: option._id }, function(err, answer){
																		nextAnswer();
																	});
																}else nextAnswer();
															});
														}else{
															Models.QuestionAnswer.create({ questionId: question._id, optionId: option._id }, function(err, answer){
																nextAnswer();
															});
														}
													}else nextAnswer();
												}).then(function(){ nextProperty(); });
											}
										});
									}else nextProperty();
								}).then(function(){
									return res.status(200).json({ status: true, error: null, message: "Question Created Successfully", });
								});
							}
						}
					});
				}
			});
		}
	});
});
// Questions Management
Router.route("/library/questions/:questionId")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId;
	Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, }).populate("media.attachment").exec(function(err, question){
		if(err || !question){
			var errorMessage = err ? err.message : req.__("QuestionNotFound"), status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.Activities.findOne({ _id: question.activityId, moderatorId: req.user._id, }).exec(function(err, activity){
				if(err || !activity){
					var errorMessage = err ? err.message : req.__("QuestionNotFound"), status = err ? 400 : 404;
					return res.status(status).json({ status: false, error: errorMessage, });
				}else{
					async.parallel({
						questions: function(callback){
							Models.Question.find({ moderatorId: req.user._id, activityId: question.activityId }).sort('sort').exec(callback);
						},
						prevQuestion: function(callback){
							Models.Question.findOne({ sort: { $lt: question.sort }, moderatorId: req.user._id, activityId: question.activityId }).sort('-sort').exec(callback);
						},
						nextQuestion: function(callback){
							Models.Question.findOne({ sort: { $gt: question.sort }, moderatorId: req.user._id, activityId: question.activityId }).sort('sort').exec(callback);
						},
						options: function(callback){ Models.Options.find({ questionId: questionId, }).sort('_id').exec(callback); },
						answers: function(callback){ Models.QuestionAnswer.find({ questionId: questionId }).exec(callback); },
					}, function(err, results){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							var array = Object.keys(_.indexBy(results.questions, '_id')),
							qs = question.toObject(),
							qno = array.indexOf(questionId) + 1;
							qs.option = results.options;
							qs.answers = results.answers;
							return res.status(200).json({
								status: true, data: qs,
								qno: qno, activity: activity,
								prevQuestion: results.prevQuestion,
								nextQuestion: results.nextQuestion,
							});
						}
					});
				}
			});
		}
	});
})
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId,
	data = req.body, rules = {
		name: "required|min:5",
		type: "required|in:truefalse,single,multiple,free,blank",
		answer: "required|array",
	};
	if(data.type && data.type != 'free' && data.type != 'blank'){ rules.options = "required|array"; }
	var validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, }).exec(function(err, question){
			if(err || !question){
				var errorMessage = err ? err.message : "Question Not Found",
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.Activities.findOne({ moderatorId: req.user._id, _id: question.activityId, type: 'quiz' }).exec(function(err, activity){
					if(err || !activity){
						var errorMessage = err ? err.message : "Unable Edit Question",
						status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						Models.QuestionAnswer.remove({ questionId: question._id }, function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
							else{
								question.name = data.name;
								question.timelimit = data.timelimit;
								question.media = (data.media && data.media.length > 0) ? data.media : undefined;
								question.random = (data.random) ? data.random : 0;
								question.feedback = (data.feedback) ? data.feedback : undefined;
								if(data.type == 'free' || data.type == 'blank'){
									Models.Options.remove({ questionId: question._id }, function(err){
										if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
										else{
											forEach(data.answer, function(nextAns, element, index, array){
												if(element != 'null' && element != null){
													Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
														if(!err && count <= 0){
															Models.QuestionAnswer.create({ questionId: question._id, answer: element }, function(err, questionanswer){
																nextAns();
															});
														}else nextAns();
													});
												}else nextAns();
											}).then(function(){
												question.save(function(err){
													if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
													else return res.status(200).json({ status: true, message: 'Question Updated Successfully', error: null, });
												});
											});
										}
									});
								}else{
									Models.Options.find({ questionId: question._id, value: { $nin: data.options } }).exec(function(err, options1){
										if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
										else{
											forEach(options1, function(nextOpts, val, index, array){
												if(val){ val.remove(); }
												nextOpts();
											}).then(function(){
												var options = (data.type == 'truefalse') ? ['TRUE', 'FALSE'] : data.options;
												forEach(options, function(nextProperty, element, index, array){
													if(element != 'null' && element != null){
														Models.Options.findOrCreate({ questionId: question._id, value: element, }, { questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
															if(err) nextProperty();
															else{
																forEach(data.answer, function(nextAnswer, Avalue, index, array){
																	if(Avalue == element  && (Avalue != 'null' && Avalue != null)){
																		if(question.type != 'multiple'){
																			Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
																				if(!err && count <= 0){
																					Models.QuestionAnswer.findOrCreate({ questionId: question._id, optionId: option._id }, { questionId: question._id, optionId: option._id }, function(err, answer){
																						nextAnswer();
																					});
																				}else nextAnswer();
																			});
																		}else{
																			Models.QuestionAnswer.findOrCreate({ questionId: question._id, optionId: option._id }, { questionId: question._id, optionId: option._id }, function(err, answer){
																				nextAnswer();
																			});
																		}
																	}else nextAnswer();
																}).then(function(){ nextProperty(); });
															}
														});
													}else nextProperty();
												}).then(function(){
													question.save(function(err){
														if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
														else return res.status(200).json({ status: true, message: 'Question Updated Successfully', error: null, });
													});
												});
											});
										}
									});
								}
							}
						});
					}
				});
			}
		});
	}
})
.delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId;
	Models.Question.findOne({ _id: questionId, moderatorId: req.user._id }).exec(function(err, question){
		if(err || !question){
			var errorMessage = err ? err.message : "Question Not Found", status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.QuestionAnswer.remove({ questionId: questionId }, function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					Models.Options.remove({ questionId: questionId }, function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							question.remove();
							return res.status(200).json({ status: true, error: null, message: "Question Deleted Successfully", });
						}
					});
				}
			});
		}
	});
});
// Poll Creation
Router.route("/library/polls/:folderId?/new")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, rules = {
		name: "required|min:5",
		type: "required|in:truefalse,single,multiple,free",
		// category: "required",
	}, code = randomString.generate({ capitalization: "uppercase", length: 6 });
	if(data.type && data.type != 'free'){ rules.options = "required|array"; }
	var validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		functions.getBaseFolder(req, code, function(err, folder){
			if(err || !folder){
				var errorMessage = err ? err.message : "Fodler Not Found", status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.Activities.update({  moderatorId: req.user._id, type: "polls", }, { show: false }, { multi: true }, function(err, activities){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						Models.Rooms.findOne({ moderatorId: req.user._id }).exec(function(err, room){
							if(err || !room){
								var error = err ? err.message : "Unable Create Voting";
								return res.status(400).json({ status: false, error: error, });
							}else{
								Models.File.create({ folderId: folder._id, moderatorId: req.user._id, name: "Poll", type: 'polls', }, function(err, attrfile){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else{
										var categoryId = (data.category) ? data.category : undefined;
										var activityData = { moderatorId: req.user._id,
											roomId: room._id, name: "Poll",
											fileId: attrfile._id, status: 1,
											type: 'polls', language: 'en',
											isArchived: 0, start: 0,
											categoryId: categoryId,
										};
										Models.Activities.create(activityData, function(err, poll){
											if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
											else{
												Models.Question.count({ status: true, activityId: poll._id }, function(err, count){
													if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
													else if(count >= 1) return res.status(400).json({ status: false, error: "Question Already Created For this Vote", data: data, });
													else{
														var sort = count + 1,
														questionData = {
															moderatorId: req.user._id,
															activityId: poll._id,
															name: data.name,
															status: 1,
															type: data.type,
															sort: sort,
															point: 1,
															timelimit: data.timelimit,
														};
														questionData.media = (data.media && data.media.length > 0) ? data.media : undefined;
														questionData.random = (data.random) ? data.random : 0;
														Models.Question.create(questionData, function(err, question){
															if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
															else{
																if(question.type != "free"){
																	// var options =  (question.type != "truefalse") ? data.options : ((req.user.language == "en") ? ['TRUE', 'FALSE'] : ['VRAI', 'FAUX']);
																	var options =  (question.type == "truefalse") ? ['TRUE', 'FALSE'] : data.options;
																	forEach(options, function(nextProperty, element, index, array){
																		if(element != 'null' && element != null){
																			Models.Options.create({ questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
																				nextProperty();
																			});
																		}else nextProperty();
																	}).then(function(){
																		poll.save(function(err){
																			functions.createFeed(req, 'activity_create', poll.name + ' Activity Created Successfully.');
																			return res.status(200).json({ status: true, poll: poll, message: "Live Voting Created Successfully", });
																		});
																	});
																}else{
																	poll.save(function(err){
																		functions.createFeed(req, 'activity_create', poll.name + ' Activity Created Successfully.');
																		return res.status(200).json({ status: true, poll: poll, message: "Live Voting Created Successfully", });
																	});
																}
															}
														});
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	};
}); // Create New Poll
// Polls Management
Router.route("/library/polls/:pollId").get(Authorization.isModeratorAuthorized, function(req, res, next){
	var pollId = req.params.pollId, limit = 10,
	page = req.query.page ? parseInt(req.query.page) : 1;
	functions.GetQuizPolls(req, page, limit, 'polls', pollId, function(error, success){
		if(error) return res.status(error.statusCode).json(error);
		else return res.status(200).json(success);
	});
}).post(Authorization.isModeratorAuthorized, function(req, res, next){
	var pollId = req.params.pollId;
	functions.UpdateQuizPoll(pollId, req, res, next, "polls");
}).delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var pollId = req.params.pollId;
	functions.DeleteQuizPoll(pollId, req, res, next, "polls");
});
// Quiz Activity Management
Router.route("/library/quiz/:activityId").get(Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId, limit = 10,
	page = req.query.page ? parseInt(req.query.page) : 1;
	functions.GetQuizPolls(req, page, limit, 'quiz', activityId, function(error, success){
		if(error) return res.status(error.statusCode).json(error);
		else return res.status(200).json(success);
	});
}).post(Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId;
	functions.UpdateQuizPoll(activityId, req, res, next, "quiz");	
}).delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId;
	functions.DeleteQuizPoll(activityId, req, res, next, "quiz");
});
// Create Poll Question
Router.route("/library/polls/:pollId/questions/new")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, activityId = req.params.pollId,
	rules = {
		name: "required|min:5",
		type: "required|in:truefalse,single,multiple,free",
	};
	if(data.type && data.type != 'free'){ rules.options = "required|array"; }
	var validation = new Validator(data, rules);
	Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, type: "polls", }).exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : "Poll Not Found", status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else if(validation.fails()){
			var errors = validation.errors.all(),
			error = errors[Object.keys(errors)[0]][0];
			return res.status(400).json({ status: false, error: error, data: data, });
		}else{
			Models.Question.count({ status: true, activityId: activity._id }, function(err, count){
				if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
				else if(count >= 1) return res.status(400).json({ status: false, error: "Question Already Created For this Vote", data: data, });
				else{
					var sort = count + 1,
					questionData = {
						moderatorId: req.user._id,
						activityId: activity._id,
						name: data.name,
						status: 1,
						type: data.type,
						sort: sort,
						point: 1,
						timelimit: data.timelimit,
					};
					questionData.feedback = (data.feedback) ? data.feedback : undefined;
					questionData.random = (data.random) ? data.random : 0;
					questionData.media = (data.media && data.media.length > 0) ? data.media : undefined;
					Models.Question.create(questionData, function(err, question){
						if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
						else{
							if(question.type != "free"){
								// var options =  (question.type != "truefalse") ? data.options : ((req.user.language == "en") ? ['TRUE', 'FALSE'] : ['VRAI', 'FAUX']);
								var options =  (question.type == "truefalse") ? ['TRUE', 'FALSE'] : data.options;
								forEach(options, function(nextProperty, element, index, array){
									if(element != 'null' && element != null){
										Models.Options.create({ questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
											nextProperty();
										});
									}else nextProperty();
								}).then(function(){
									return res.status(200).json({ status: true, message: "Created Successfully", });
								});
							}else return res.status(200).json({ status: true, message: "Created Successfully", });
						}
					});
				}
			});
		}
	});
});
// Edit Poll Question
Router.route("/library/polls/:pollId/questions/:questionId")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body,
	activityId = req.params.pollId,
	questionId = req.params.questionId,
	rules = { name: "required|min:5", };
	if(data.type && data.type != 'free'){ rules.options = "required|array"; }
	var validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Question.findOne({ activityId: activityId, _id: questionId, moderatorId: req.user._id, }).exec(function(err, question){
			if(err || !question){
				var errorMessage = err ? err.message : "Question Not Found", status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				question.name = data.name;	
				question.timelimit = data.timelimit;
				question.media = (data.media && data.media.length > 0) ? data.media : undefined;
				question.random = (data.random) ? data.random : 0;
				question.feedback = (data.feedback) ? data.feedback : undefined;
				if(data.type == 'free'){
					Models.Options.remove({ questionId: question._id }, function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
						else{
							question.save(function(err){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else return res.status(200).json({ status: true, message: "Updated Successfully", });
							});
						}
					});
				}else{
					Models.Options.find({ questionId: question._id, value: { $nin: data.options } }).exec(function(err, options1){
						if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
						else{
							forEach(options1, function(nextOpts, val, index, array){
								if(val){ val.remove(); }
								nextOpts();
							}).then(function(){
								var options = (data.type == 'truefalse') ? ['TRUE', 'FALSE'] : data.options;
								forEach(options, function(nextProperty, element, index, array){
									if(element != 'null' && element != null){
										Models.Options.findOrCreate({ questionId: question._id, value: element, }, { questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
											nextProperty();
										});
									}else nextProperty();
								}).then(function(){
									question.save(function(err){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else return res.status(200).json({ status: true, message: "Updated Successfully", });
									});
								});
							});
						}
					});
				}
			}
		});
	}
});
// Start Activity
Router.post("/activities/:type(quiz|polls)/:activityId/start", Authorization.isModeratorAuthorized, function(req, res, next){
	var type = req.params.type,
	activityId = req.params.activityId,
	data = req.body;
	Models.Activities.findOne({ moderatorId: req.user._id, start: true, }).exec(function(err, startactivity){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).exec(function(err, file){
				if(err || !file){
					var errorMessage = err ? err.message : req.__("NotFound");
					return res.status(400).json({ status: false, message: null, error: errorMessage, });
				}else{
					Models.Activities.findOne({ fileId: activityId, moderatorId: req.user._id, type: type, }).exec(function(err, activity){
						if(err || !activity){
							var errorMessage = err ? err.message : req.__("NotFound");
							return res.status(400).json({ status: false, message: null, error: errorMessage, });
						}else{
							async.waterfall([
								function(callback){
									functions.createReport(req, startactivity, function(err, report){ callback(err); });
								},
								function(callback){
									Models.ParticipantPoints.remove({ activityId: activity._id, }, function(err){ callback(err); });
								},
								function(callback){
									Models.ParticipantAnswer.remove({ activityId: activity._id, }, function(err){ callback(err); });
								},
								function(callback){
									Models.ParticipantActivityStatus.remove({ activityId: activity._id, }, function(err){ callback(err); });
								},
								function(callback){
									Models.Question.find({ moderatorId: req.user._id, activityId: activity._id, }).sort("sort").exec(function(err, questions){ callback(err, questions); });
								},
								function(questions, callback){
									if(questions.length > 0) Models.File.update({ _id: { $ne: activityId }, moderatorId: req.user._id, }, { start: false, }, { multi: true }, function(err, files){ callback(err, questions); });
									else callback({ message: req.__("UnableStartActivityFirstCreateQuestion"), });
								},
								function(questions, callback){
									Models.Activities.update({ _id: { $ne: activity._id }, moderatorId: req.user._id, }, { show: false, start: false, }, { multi: true }, function(err, activities){ callback(err, questions); });
								},
							], function(err, questions){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else{
									activity.start = true;
									activity.show = data.option;
									file.start = true;
									activity.byParticipant = data.option;
									activity.random = (data.option == true) ? data.random : false;
									activity.feedback = data.feedback;
									file.save(function(err){
										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
										else{
											activity.save(function(err){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													functions.emitEvent(req, 'participantActivities');
													functions.createFeed(req, 'activity_start', activity.name + ' Activity Started Successfully.');
													return res.status(200).json({ questions: questions, status: true, activity: activity, message: req.__("UpdatedSuccessfully"), });
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
});
// Stop Activities
Router.post("/activities/:type(quiz|polls)/:activityId/stop", Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId, type = req.params.type;
	Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : req.__("NotFound");
			return res.status(400).json({ status: false, message: null, error: errorMessage, });
		}else{
			Models.Activities.findOne({ fileId: activityId, moderatorId: req.user._id, type: type, start: true, }).exec(function(err, activity){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else if(activity){
					async.waterfall([
						function(callback){
							functions.createReport(req, activity, function(err, report){ callback(err); });
						},
						function(callback){
							Models.ParticipantPoints.remove({ activityId: activity._id, }, function(err){ callback(err); });
						},
						function(callback){
							Models.ParticipantAnswer.remove({ activityId: activity._id, }, function(err){ callback(err); });
						},
						function(callback){
							Models.ParticipantActivityStatus.remove({ activityId: activity._id, }, function(err){ callback(err); });
						},
					], function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							file.start = false;
							activity.start = false;
							activity.show = false;
							activity.save(function(err){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else{
									file.save(function(err){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else{
											functions.emitEvent(req, 'participantActivities');
											functions.createFeed(req, 'activity_stop', activity.name + ' Activity Stopped Successfully.');
											return res.status(200).json({ status: true, error: null, message: req.__("UpdatedSuccessfully"), });
										}
									});
								}
							});
						}
					});
				}else return res.status(200).json({ status: true, error: null, message: req.__("UpdatedSuccessfully"), });
			});
		}
	});
});
// Share Question Results
Router.post("/question/share/:questionId", Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId,
	data = req.body;
	async.parallel({
		questions: function(callback){
			Models.Question.update({  moderatorId: req.user._id, _id: { $ne: questionId, }, }, { show: false }, { multi: true }, callback);
		},
		question: function(callback){
			Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, }).exec(callback);
		},
	}, function(err, results){
		if(err || !results.question){
			var errorMessage = err ? err.message : req.__("QuestionNotFound"), status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			results.question.show = data.show;
			results.question.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					functions.emitEvent(req, 'participantQuestionStatus');
					return res.status(200).json({ status: true, message: req.__("UpdatedSuccessfully"), });
				}
			});
		}
	});
});
// Share Polls Results
Router.post("/share/:activityId", Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId, data = req.body;
	async.parallel({
		activities: function(callback){
			Models.Activities.update({  moderatorId: req.user._id, type: "polls", _id: { $ne: activityId, }, }, { show: false }, { multi: true }, callback);
		},
		activity: function(callback){
			Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, show: !data.show, type: "polls", }).exec(callback);
		},
	}, function(err, results){
		if(err || !results.activity){
			var errorMessage = err ? err.message : req.__("ActivityNotFound"), status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			results.activity.show = data.show;
			results.activity.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					functions.emitEvent(req, 'participantActivityStatus');
					return res.status(200).json({ status: true, message: req.__("UpdatedSuccessfully"), });
				}
			});
		}
	});
});
// View Activity Results
Router.get("/activity/:id/question/:questionId", Authorization.isModeratorAuthorized, function(req, res, next){
	var limit = 10, participantIds = [],
	activityId = req.params.id,
	questionId = req.params.questionId,
	page = req.query.page ? req.query.page : 1;
	Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, }).populate("categoryId").exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : req.__("ActivityNotFound");
			return res.status(400).json({ status: false, error: errorMessage, });
		}else{
			Models.ParticipantAnswer.aggregate([{
				$match:{ questionId: mongoose.Types.ObjectId(questionId), activityId: mongoose.Types.ObjectId(activityId), },
			}, {
				$group: { _id: "$participantId", count: { $sum: 1, }, }
			}], function(err, activityStatus){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					Models.Question.find({ moderatorId: req.user._id, activityId: activityId }).sort("sort").exec(function(err, questions){
						if(err) return res.status(404).json({ status: false, error: err.message, });
						else{
							Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, activityId: activityId }).populate("media.attachment").exec(function(err, question){
								if(err || !question){
									var errorMessage = err ? err.message : req.__("QuestionNotFound");
									return res.status(404).json({ status: false, error: errorMessage, });
								}else{
									var question = question.toObject();
									Models.Question.findOne({ sort: { $lt: question.sort }, moderatorId: req.user._id, activityId: activityId }).sort('-sort').exec(function(err, prevQuestion){
										if(err) return res.status(404).json({ status: false, error: err.message, });
										else{
											Models.Question.findOne({ sort: { $gt: question.sort }, moderatorId: req.user._id, activityId: activityId }).sort('sort').exec(function(err, nextQuestion){
												if(err) return res.status(404).json({ status: false, error: err.message, });
												else{
													var condition = (question.type == 'free' || question.type == 'blank') ? '$answer' : '$optionId';
													Models.ParticipantAnswer.aggregate([{
														$match:{
															questionId: mongoose.Types.ObjectId(questionId),
															activityId: mongoose.Types.ObjectId(activityId),
														},
													}, {
														$group: { _id: condition, count: { $sum: 1, }, }
													}], function(err, result){
														if(err) return res.status(400).json({ status: false, error: err.message, });
														else{
															var array = Object.keys(_.indexBy(questions, '_id')),
															qno = array.indexOf(questionId) + 1;
															if(activity.type == 'polls'){
																if(question.type == 'free'){
																	var correctAnswer = [], notAnswerd;
																	async.forEach(result, function(option, done){
																		if(option._id == 'N/A'){
																			notAnswerd = { questionId: questionId, count: option.count };
																		}else{
																			option.correct = true;
																			correctAnswer.push(option);
																		}
																		done(null);
																	}, function(err){
																		question.options = correctAnswer;
																		return res.status(200).json({
																			status: true,
																			totalQuestion: questions.length,
																			currentQuestion: qno,
																			prevQuestion: prevQuestion,
																			nextQuestion: nextQuestion,
																			count: activityStatus.length,
																			questions: questions,
																			question: question,
																			notAnswerd: notAnswerd,
																			activity: activity,
																		});
																	});
																}else{
																	Models.Options.find({ questionId: questionId, status: true }).sort("_id").exec(function(err, options){
																		if(err) return res.status(400).json({ status: false, error: err.message, });
																		else{
																			var correctAnswer = [];
																			async.forEach(options, function(option, done){
																				var option1 = option.toObject();
																				option1.correct = true;
																				var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(option._id));
																				option1.count = (arrId > -1) ? result[arrId].count : 0;
																				correctAnswer.push(option1);
																				done(null);
																			}, function(err){
																				var notAnswerd,
																				arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(questionId));
																				if(arrId > -1){
																					notAnswerd = {
																						questionId: questionId,
																						count: result[arrId].count,
																						value: 'not answered',
																					};
																				}
																				question.options = correctAnswer;
																				return res.status(200).json({
																					status: true,
																					totalQuestion: questions.length,
																					currentQuestion: qno,
																					prevQuestion: prevQuestion,
																					nextQuestion: nextQuestion,
																					count: activityStatus.length,
																					questions: questions,
																					question: question,
																					notAnswerd: notAnswerd,
																					activity: activity,
																				});
																			});
																		}
																	});
																}
															}else{
																Models.QuestionAnswer.find({ questionId: questionId, }).exec(function(err, answers){
																	if(err) return res.status(400).json({ status: false, error: err.message, });
																	else{
																		if(question.type == 'free' || question.type == 'blank'){
																			var correctAnswer = [], notAnswerd;
																			async.forEach(result, function(option, done){
																				if(option._id == 'N/A'){
																					notAnswerd = { questionId: questionId, count: option.count };
																				}else{
																					option.correct = true;
																					correctAnswer.push(option);
																				}
																				done(null);
																			}, function(err){
																				question.options = correctAnswer;
																				return res.status(200).json({
																					status: true,
																					totalQuestion: questions.length,
																					currentQuestion: qno,
																					prevQuestion: prevQuestion,
																					nextQuestion: nextQuestion,
																					count: activityStatus.length,
																					questions: questions,
																					question: question,
																					notAnswerd: notAnswerd,
																					activity: activity,
																				});
																			});
																		}else{
																			Models.Options.find({ questionId: questionId, status: true }).sort("_id").exec(function(err, options){
																				if(err) return res.status(400).json({ status: false, error: err.message, });
																				else{
																					var correctAnswer = [];
																					async.forEach(options, function(option, done){
																						var option1 = option.toObject();
																						option1.correct = false;
																						forloop: for (var i = 0; i < answers.length; i++){
																							if(String(answers[i].optionId) == String(option._id)){
																								option1.correct = true;
																								break forloop;
																							}
																						};
																						var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(option._id));
																						option1.count = (arrId > -1) ? result[arrId].count : 0;
																						correctAnswer.push(option1);
																						done(null);
																					}, function(err){
																						var notAnswerd,
																						arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(questionId));
																						if(arrId > -1){
																							notAnswerd = {
																								questionId: questionId,
																								count: result[arrId].count,
																								value: 'not answered',
																							};
																						}
																						question.options = correctAnswer;
																						return res.status(200).json({
																							status: true,
																							totalQuestion: questions.length,
																							currentQuestion: qno,
																							prevQuestion: prevQuestion,
																							nextQuestion: nextQuestion,
																							count: activityStatus.length,
																							questions: questions,
																							question: question,
																							notAnswerd: notAnswerd,
																							activity: activity,
																						});
																					});
																				}
																			});
																		}
																	}
																});
															}
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
}); // View Activity Results
// Get Active Activity
Router.route("/activities/active").get(Authorization.isModeratorAuthorized, function(req, res, next){
	Models.Activities.findOne({ moderatorId: req.user._id, start: true, }).exec(function(err, activity){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else if(!activity) return res.status(200).json({ status: false, activity: null, questions: [], });
		else{
			Models.Question.find({ moderatorId: req.user._id, activityId: activity._id, }).sort({ sort: 1 }).exec(function(err, questions){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else return res.status(200).json({ status: true, activity: activity, questions: questions, });
			});
		}
	});
});
// Change Current Question
Router.post("/question/:questionId/active", Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId;
	Models.Question.findOne({ _id: questionId, }).exec(function(err, question){
		if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
		else{
			Models.Question.update({ _id: { $ne: questionId, }, moderatorId: req.user._id, activityId: question.activityId, }, { active: false, }, { multi: true, }, function(err, questions){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					question.active = true;
					question.save(function(err){
						if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
						else{
							functions.emitEvent(req, 'activeQuestion');
							return res.status(200).json({ status: true, error: null, message: req.__("UpdatedSuccessfully"), });
						}
					});
				}
			});
		}
	});
});
// Reports Management
Router.get("/activities/reports", Authorization.isModeratorAuthorized, function(req, res, next){
	var page = req.query.page ? req.query.page : 1,
	limit = 10, activityIds = [], totalActivities = [];
	Models.Report.find({ moderatorId: req.user._id, }).sort({ createdAt: -1 }).exec(function(err, reports){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else if(reports.length <= 0){
			var errorMessage = err ? err.message : req.__("NotFound");
			return res.status(200).json({ status: true, activities: [], pages: [], total: 0, limit: limit, currentPage: page, });
		}else{
			for (var i = 0; i < reports.length; i++){ activityIds.push(reports[i].activityId); };
			Models.Activities.paginate({ _id: { $in: activityIds }, moderatorId: req.user._id, }, { page: page, limit: limit, sort: { _id: -1 },  }).then(function(activities){
				var pages = functions.getArrayPages(req)(10, activities.pages, page);
				async.forEach(activities.docs, function(activity, done){
					var activity = activity.toObject();
					activity.participantStatus = [];
					forEach(reports, function(Rnext, element, index, array){
						if(String(element.activityId) == String(activity._id)){
							activity.participantStatus.push(element);
						}
						Rnext();
					}).then(function(){
						totalActivities.push(activity);
						done(null);
					});
				}, function(err){
					return res.status(200).json({ status: true, activities: totalActivities, pages: pages, total: activities.total, limit: limit, currentPage: page, });
				});
			});
		}
	});
}); // Activity Reports Management
// Delete the Activities completed by Participant
Router.delete("/participants/activitystatus/:Id", Authorization.isModeratorAuthorized, function(req, res, next){
	var Id = req.params.Id;
	Models.Report.findOne({ _id: Id, moderatorId: req.user._id, }).exec(function(err, participantActivity){
		if(err || !participantActivity){
			var errorMessage = err ? err.message : req.__("ParticipantActivityFound");
			return res.status(400).json({ error: errorMessage, status: false, });
		}else{
			participantActivity.remove();
			return res.status(200).json({ message: req.__("ParticipantActivityDeletedSuccessfully"), status: true, });
		}
	});
});
// View Activity Results
Router.get("/activity/:Id/summary", Authorization.isModeratorAuthorized, function(req, res, next){
	var Id = req.params.Id, limit = 5,
	Ids = [], participantIds = [], totalParticipants = [],
	totalQuestion = [], questionPercent = [], participantPercent = [];
	Models.Report.findOne({ _id: Id, moderatorId: req.user._id, }).exec(function(err, report){
		if(err || !report){
			var errorMessage = err ? err.message : req.__("NotFound");
			return res.status(400).json({ status: false, message: null, error: errorMessage, });
		}else{
			Models.Activities.findOne({ _id: report.activityId, moderatorId: req.user._id, status: 1, }).exec(function(err, activity){
				if(err || !activity){
					var errorMessage = err ? err.message : "Activity Not Found!";
					return res.status(400).json({ status: false, message: null, error: errorMessage, });
				}else{
					for (var i = 0; i < report.reports.length; i++){ participantIds.push(report.reports[i].participantId); };
					Models.Participant.find({ _id: { $in: participantIds }, moderatorId: req.user._id, }).exec(function(err, participants){
						if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
						else{
							for (var i = 0; i < report.reports.length; i++){ Ids.push(report.reports[i].questionId); }
							Models.Question.find({ _id: { $in: Ids, }, activityId: report.activityId, moderatorId: req.user._id, status: 1, }).sort('sort').exec(function(err, questions){
								if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
								else{
									var report1 = report.toObject();
									delete report1.reports;
									return res.status(200).json({ status: true, report: report1, questions: questions, activity: activity, });
								}
							});
						}
					});
				}
			});
		}
	});
});
// View Activity Results
Router.get("/activity/:Id/summary/:questionId", Authorization.isModeratorAuthorized, function(req, res, next){
	var Id = req.params.Id, questionId = req.params.questionId;
	async.waterfall([
		function(callback){
			Models.Report.findOne({ _id: Id, moderatorId: req.user._id, "reports.questionId": questionId, }).exec(callback);
		},
		function(report, callback){
			if(!report) callback({ message: req.__("NotFound"), });
			else{
				var activityId = report.activityId;
				Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, }).populate("categoryId").exec(function(err, activity){
					callback(err, report, activity);
				});
			}
		},
		function(report, activity, callback){
			if(!activity) callback({ message: req.__("NotFound"), });
			else{
				var activityId = activity._id;
				Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, activityId: activityId }).exec(function(err, question){
					if(err || !question){
						var error = err ? err : { message: req.__("QuestionNotFound"), };
						callback(error);
					}else{
						var question = question.toObject();
						Models.Question.findOne({ sort: { $lt: question.sort }, moderatorId: req.user._id, activityId: activityId }).sort('-sort').exec(function(err, prevQuestion){
							Models.Question.findOne({ sort: { $gt: question.sort }, moderatorId: req.user._id, activityId: activityId }).sort('sort').exec(function(err, nextQuestion){
								callback(err, report, activity, question, prevQuestion, nextQuestion);
							});
						});
					}
				});
			}
		},
	], function(err, report, activity, question, prevQuestion, nextQuestion){
		if(err) return res.status(404).json({ status: false, error: err.message, });
		else{
			question.options = [];
			for (var i = 0; i < report.reports.length; i++){
				if(String(report.reports[i].questionId) == String(questionId)){
					question.options = report.reports[i].options;
				}
			}
			return res.status(200).json({
				status: true, activity: activity,
				prevQuestion: prevQuestion,
				nextQuestion: nextQuestion,
				question: question,
			});
		}
	});
});
// Create New Attachment
Router.route("/siteinfo").post(Authorization.isModeratorAuthorized, multipart, function(req, res, next){
	var data = req.body, rules = {
		title: "required",
		metakey: "required",
		metadescription: "required",
	};
	var validation = new Validator(data, rules),
	upload = path.join(__dirname, '../public/uploads/');
	var rootPath = path.normalize(__dirname + '/../public');
	functions.mkDirNotExists([upload,]);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Moderator.findOne({ _id: req.user._id }).exec(function(err, moderator){
			if(err || !moderator){
				var errorMessage = err ? err.message : req.__("ModeratorNotFound");
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(function(err, room){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						if(data.pin != room.pin){ room.pin = data.pin; }
						moderator.participantLogin = parseInt(data.participantLogin);
						room.participantLogin = parseInt(data.participantLogin);
						room.save(function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								moderator.save(function(err){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else{
										Models.SiteInfo.findOne({ moderatorId: req.user._id, }).sort("-createdAt").exec(function(err, siteinfo){
											if(err) return res.status(400).json({ status: false, error: err.message, });
											else{
												if(req.files){
													var file = req.files.file, 
													originalFilename = file.originalFilename,
													originalExtension = path.extname(originalFilename),
													extension = ['.jpg', '.png'],
													fileName = moment().format("YYYYMMDDHHmmssSS-") + originalFilename,
													filePath = upload + fileName, fileSize = fs.statSync(file.path)['size'];
													if(fileSize > 1048576) return res.status(400).json({ status: false, error: "Please Select an image less than 1 Mb", });
													else if(extension.indexOf(originalExtension) != -1){
														fs.readFile(file.path, function(err, fileData){
															if(err) return res.status(400).json({ status: false, error: err.message, });
															else{
																fs.writeFile(filePath, fileData, function(err){
																	if(err) return res.status(400).json({ status: false, error: err.message, });
																	else{
																		gm(filePath).resize(195, 68, '!').write(filePath, function(err){
																			if(err) return res.status(400).json({ status: false, error: err.message, });
																			else{
																				var filePath1 = filePath.replace(rootPath, '');
																				siteinfo.title = data.title;
																				siteinfo.file = originalFilename;
																				siteinfo.metakey = data.metakey;
																				siteinfo.logo = filePath1;
																				siteinfo.metadescription = data.metadescription;
																				siteinfo.save(function(err){
																					if(err) return res.status(400).json({ status: false, error: err.message, });
																					else{
																						functions.createFeed(req, 'info_update', 'You Are Updated Site Info.');
																						return res.status(200).json({ status: true, message: "Site Info Updated Successfully!", siteinfo: siteinfo, room: room, });
																					}
																				});
																			}
																		});
																	}
																});
															}
														});
													}else return res.status(400).json({ status: false, error: "File Type not Accepted.Please select Image Files(png, jpg)", });
												}else{
													siteinfo.title = data.title;
													siteinfo.metakey = data.metakey;
													siteinfo.metadescription = data.metadescription;
													siteinfo.save(function(err){
														if(err) return res.status(400).json({ status: false, error: err.message, });
														else{
															functions.createFeed(req, 'info_update', 'You Are Updated Site Info.');
															return res.status(200).json({ status: true, message: "Site Info Updated Successfully!", siteinfo: siteinfo, room: room, });
														}
													});
												}
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	}
})
// Delete Custom Logo
.put(Authorization.isModeratorAuthorized, function(req, res, next){
	Models.SiteInfo.findOne({ moderatorId: req.user._id, }).sort("-createdAt").exec(function(err, siteinfo){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			siteinfo.logo = "/assets/images/logo-3.png";
			siteinfo.file = "logo-3.png";
			siteinfo.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else return res.status(200).json({ status: true, message: req.__("UpdatedSuccessfully"), siteinfo: siteinfo, });
			});
		}
	});
});
// get Medias
Router.get('/library/attachments', Authorization.isModeratorAuthorized, function(req, res, next){
	Models.Attachment.find({ moderatorId: req.user._id, }).exec(function(err, attachments){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else return res.status(200).json({ status: false, attachments: attachments, });
	});
});
// Dashboard Page
Router.get("/dashboard", Authorization.isModeratorAuthorized, function(req, res, next){
	var user_activity = ["user_create", "user_update", "user_delete", "user_ban", "user_permit", "info_update"];
	async.parallel({
		room: function(callback){
			Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback);
		},
		recents: function(callback){
			Models.Feeds.find({ moderatorId: req.user._id, }).sort("-createdAt").exec(callback);
		},
		files: function(callback){
			Models.File.find({ moderatorId: req.user._id, }).exec(callback);
		},
		participants: function(callback){
			Models.Participant.find({ moderatorId: req.user._id, }).exec(callback);
		},
		interaction: function(callback){
			Models.Report.count({ moderatorId: req.user._id, }).exec(callback);
		},
		report: function(callback){
			Models.Report.findOne({ moderatorId: req.user._id, }).sort("-createdAt").select("-reports").lean().exec(callback);
		},
		systems: function(callback){
			Models.Feeds.find({ moderatorId: req.user._id, type: { $nin: user_activity, }, }).sort("-createdAt").exec(callback);
		},
		activities: function(callback){
			Models.Feeds.find({ moderatorId: req.user._id, type: { $in: user_activity, }, }).sort("-createdAt").exec(callback);
		},
		status: function(callback){ callback(null, true); }, 
	}, function(err, results){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			var reportTime = results.report ? moment.utc(results.report.createdAt).format("HH[h]mm") : '00h00';
			results.report = reportTime;
			return res.status(200).json(results);
		}
	});
});
// Categories Management
Router.route("/categories")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var page = req.query.page ? req.query.page : 1, limit = 10;
	Models.Category.paginate({ moderatorId: req.user._id, }, { page: page, limit: limit, sort: { createdAt: -1 },  }).then(function(categories){
		var pages = functions.getArrayPages(req)(10, categories.pages, page);
		return res.status(200).json({
			status: true,
			categories: categories.docs,
			pages: pages,
			total: categories.total,
			limit: limit,
			currentPage: page,
		});
	});
}) // Categories Listing
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body, rules = {
		name: "required|min:3|max:25",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, data: data, error: error, });
	}else{
		Models.Category.create({ name: data.name, moderatorId: req.user._id, }, function(err, category){
			if(err) return res.status(404).json({ status: false, error: err.message, });
			else{
				functions.createFeed(req, 'category_create', data.name + ' Category Created Successfully.');
				return res.status(200).json({ message: "Category Created Successfully", status: true, });
			}
		});
	}
}); // Create New Category
Router.route("/category/:categoryId/")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var categoryId = req.params.categoryId;
	Models.Category.findOne({ _id: categoryId, moderatorId: req.user._id }).exec(function(err, category){
		if(err || !category){
			var errorMessage = err ? err.message : "Category Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else return res.status(200).json({ status: true, data: category, error: null, });
	});
}) // get Category details by id
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var categoryId = req.params.categoryId,
	data = req.body, rules = {
		name: "required|min:3|max:25",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.Category.findOne({ _id: categoryId, moderatorId: req.user._id }).exec(function(err, category){
			if(err || !category){
				var errorMessage = err ? err.message : req.__("ParticipantNotFound"),
				status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, data: data, });
			}else{
				category.name = data.name;
				category.save(function(err){
					if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
					else{
						functions.createFeed(req, 'category_update', category.name + ' Category Updated Successfully.');
						return res.status(200).json({ status: true, message: req.__("UpdatedSuccessfully"), });
					}
				});
			}
		});
	}
}) // update Category details by id
.delete(Authorization.isModeratorAuthorized, function(req, res, next){
	var categoryId = req.params.categoryId;
	Models.Category.findOne({ _id: categoryId, moderatorId: req.user._id, }).exec(function(err, category){
		if(err || !category){
			var errorMessage = err ? err.message : req.__("NotFound"),
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.Activities.find({ categoryId: categoryId, moderatorId: req.user._id, }).exec(function(err, activities){
				if(err) return res.status(status).json({ status: false, error: err.message, });
				else if(activities.length <= 0){
					var categoryName = category.name;
					category.remove(function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							functions.createFeed(req, 'category_delete', categoryName + ' Category Deleted Successfully.');
							return res.status(200).json({ status: true, message: req.__("DeletedSuccessfully"), });
						}
					});
				}else return res.status(400).json({ status: false, error: "Unable to Delete Category.", });
			});
		}
	});
}); // delete Category by id
// Categories Listing
Router.route("/categories/all")
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	Models.Category.find({ moderatorId: req.user._id, }).exec(function(err, categories){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else return res.status(200).json({ status: true, categories: categories, });
	});
}); // Categories Listing
// Add Session Signature
Router.post("/report/:reportId/signature", Authorization.isModeratorAuthorized, multipart, function(req, res, next){
	var reportId = req.params.reportId,
	file = req.files.file,
	upload = path.join(__dirname, '../public/signature/');
	functions.mkDirNotExists([upload,]);
	Models.Report.findOne({ _id: reportId, moderatorId: req.user._id, }).exec(function(err, participantActivity){
		if(err || !participantActivity){
			var errorMessage = err ? err.message : req.__("ParticipantActivityFound");
			return res.status(400).json({ error: errorMessage, status: false, });
		}else if(!file) return res.status(400).json({ status: false, error: "Please select File", });
		else{
			var originalFilename = file.originalFilename.replace(/ /g,''),
			originalExtension = path.extname(originalFilename),
			extension = ['.pdf', '.jpg', '.png'],
			fileName = moment().format("YYYYMMDDHHmmssSS-") + originalFilename,
			filePath = upload + fileName;
			if(extension.indexOf(originalExtension) != -1){
				fs.readFile(file.path, function(err, fileData){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						fs.writeFile(filePath, fileData, function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								participantActivity.signature = fileName;
								participantActivity.save(function(err){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else return res.status(200).json({ message: req.__("UpdatedSuccessfully"), status: true, });
								});
							}
						});
					}
				});
			}else return res.status(400).json({ status: false, error: "File Type not Accepted.Please select Pdf and Image File", });
		}
	});
});
// orderquestion
Router.get("/orderquestion/:questionId/:to/:from/:page", Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId,
	page = req.query.page ? parseInt(req.query.page) : 1,
	toPosition = req.params.to, fromPosition = req.params.from;
	functions.SortQuestion(req, questionId, fromPosition, toPosition, function(err, question, toQuestion){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			Models.Question.paginate({ moderatorId: req.user._id, activityId: question.activityId, }, { page: page, limit: 10, sort: { sort: 1 }, }).then(function(questions){
				return res.status(200).json({ status: true, questions: questions.docs, total: questions.total, });
			});
		}
	});
});
// Change Question Sort Order
Router.get("/question/:questionId/:to/:from", Authorization.isModeratorAuthorized, function(req, res, next){
	var questionId = req.params.questionId,
	toPosition = req.params.to,
	fromPosition = req.params.from;
	functions.SortQuestion(req, questionId, fromPosition, toPosition, function(err, question, toQuestion){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			async.parallel({
				activity: function(callback){
					Models.Activities.findOne({ _id: question.activityId, moderatorId: req.user._id, }).exec(callback);
				},
				questions: function(callback){
					Models.Question.find({ moderatorId: req.user._id, activityId: question.activityId }).sort('sort').exec(callback);
				},
				prevQuestion: function(callback){
					Models.Question.findOne({ sort: { $lt: question.sort }, moderatorId: req.user._id, activityId: question.activityId }).sort('-sort').exec(callback);
				},
				nextQuestion: function(callback){
					Models.Question.findOne({ sort: { $gt: question.sort }, moderatorId: req.user._id, activityId: question.activityId }).sort('sort').exec(callback);
				},
				options: function(callback){ Models.Options.find({ questionId: questionId, }).sort('_id').exec(callback); },
				answers: function(callback){ Models.QuestionAnswer.find({ questionId: questionId }).exec(callback); },
			}, function(err, results){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else{
					var array = Object.keys(_.indexBy(results.questions, '_id')),
					qs = question.toObject(),
					qno = array.indexOf(questionId) + 1;
					qs.option = results.options;
					qs.answers = results.answers;
					return res.status(200).json({
						status: true, data: qs, qno: qno,
						activity: results.activity,
						prevQuestion: results.prevQuestion,
						nextQuestion: results.nextQuestion,
					});
				}
			});
		}
	});
});
// Export Reports
Router.route("/reports/export")
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	Models.Report.find({ moderatorId: req.user._id, }).exec(function(err, reports){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else if(reports.length <= 0) return res.status(400).json({ status: false, error: "Unable Export Reports", });
		else return res.status(200).json({ status: true, message: "The file was saved!", file: JSON.stringify(reports), });
	});
});

// Attachment Management
Router.post("/library/image/:imageId", Authorization.isModeratorAuthorized, function(req, res, next){
	var imageId = req.params.imageId, data = req.body,
	upload = path.join(__dirname, '../public/attachments/'),
	thumbnail = path.join(upload, '/thumbnail/');
	functions.mkDirNotExists([upload, thumbnail,]);
	Models.File.findOne({ _id: imageId, moderatorId: req.user._id, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : "Image Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.Attachment.findOne({ fileId: imageId, moderatorId: req.user._id, }).exec(function(err, attachment){
				if(err || !attachment){
					var errorMessage = err ? err.message : "Image Not Found",
					status = err ? 400 : 404;
					return res.status(status).json({ status: false, error: errorMessage, });
				}else{
					attachment.marker = attachment.marker + data.marker;
					var filePath = upload + attachment.file,
					image = data.image.replace(/^data:image\/png;base64,/, "");
					attachment.save(function(err){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							fs.writeFile(filePath, image, 'base64', function(err){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else{
									gm(filePath).resize(200, 150, '!').write(thumbnail + attachment.file, function(err){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else return res.status(200).json({ status: true, message: "Updated Successfully", });
									});
								}
							});
						}
					});
				}
			});
		}
	})
});
// Participant QR Code
Router.route("/qrcode").get(Authorization.isModeratorAuthorized, function(req, res, next){
	async.parallel({
		room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
		siteinfo: function(callback){ Models.SiteInfo.findOne({ moderatorId: req.user._id }).sort("-createdAt").exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).redirect("/moderator");
		else{
			return res.render('moderator/qrcode', {
				title: Config.app.name + " - Moderator",
				url: Config.app.baseUrl + '#/participant',
				room: results.room, siteinfo: results.siteinfo,
				datetime: {
					time: moment.utc().format('HH:mm'),
					date: moment.utc().locale("fr").format("dddd D MMM YYYY"),
				}
			});
		}
	});
}); // get Participant QR Code by id
// Moderator as Participant
Router.get('/:participantId/asparticipant', function(req, res, next){
	if(!req.isAuthenticated() || (req.isAuthenticated() && !req.user.isModerator) || (req.isAuthenticated() && req.user.isModerator && req.session.passport.user.locked)){
		return res.status(400).redirect("/moderator");
	}else{
		var participantId = req.params.participantId;
		async.parallel({
			room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
			participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
		}, function(err, results){
			if(err) return res.status(400).redirect("/moderator");
			else return res.render('moderator/participant', { title: Config.app.name + " - Moderator", participantId: participantId, });
		});
	}
});
// get Activities
Router.get('/:participantId/activities', Authorization.isModeratorAuthorized, function(req, res, next){
	var date = moment().format("YYYY-MM-DD"),
	page = req.query.page ? req.query.page : 1,
	participantId = req.params.participantId,
	limit = 10, Ids = [];
	async.parallel({
		room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
		participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
		activityStatus: function(callback){ Models.ParticipantActivityStatus.find({ participantId: participantId, status: 'completed' }).exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).json({ status: 0, error: err.message, });
		else{
			var condition = { moderatorId: req.user._id, status: 1, isArchived: false, start: true, };
			if(results.activityStatus.length > 0){
				for (var i = 0; i < results.activityStatus.length; i++){ Ids.push(results.activityStatus[i].activityId); }
				condition = { _id: { $nin: Ids }, moderatorId: req.user._id, status: 1, isArchived: false, start: true, };
			}
			Models.Activities.paginate(condition, { page: page, limit: limit, sort: { startDate: -1 }, }).then(function(activities){
				var pages = functions.getArrayPages(req)(10, activities.pages, page);
				if(activities.total > 0){
					return res.status(200).json({ status: true,
						limit: limit, pages: pages,
						activities: activities.docs,
						total: activities.total,
						message: 'Activities Listing',
						currentPage: page,
					});
				}else{
					Models.Activities.findOne({ show: true, moderatorId: req.user._id, type: "polls", start: true, }).populate("categoryId").exec(function(err, activity){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else if(!activity){
							return res.status(200).json({ status: true,
								activities: [], pages: pages,
								total: activities.total,
								message: 'Activities Listing',
								limit: limit, currentPage: page,
							});
						}else functions.PollResult(req, res, next, activity, req.user._id);
					});
				}
			});
		}
	});
});
// Activities Functions
Router.route('/:participantId/activity/:activityId')
.get(Authorization.isModeratorAuthorized, function(req, res, next){
	var date = moment().format("YYYY-MM-DD"),
	activityId = req.params.activityId,
	participantId = req.params.participantId,
	limit = 1, qIds = [];
	async.parallel({
		room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
		participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).json({ status: 0, error: err.message, });
		else{
			Models.ParticipantActivityStatus.findOne({ participantId: participantId, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
				if(err || participantActivity){
					var errorMessage = err ? err.message : req.__("YouCompleted");
					return res.status(400).json({ status: false, completed: true, message: null, error: errorMessage, });
				}else{
					Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, start: true, status: 1, }).populate("categoryId").exec(function(err, activity){
						if(err || !activity){
							var errorMessage = err ? err.message : req.__("ActivityNotFound"),
							reqStatus = err ? 400 : 404;
							return res.status(reqStatus).json({ status: false, message: null, error: errorMessage, });
						}else{
							Models.ParticipantAnswer.find({ activityId: activityId, participantId: participantId, }).exec(function(err, answers){
								if(err) return res.status(400 ).json({ status: false, message: null, error: err.message, });
								else{
									for (var i = 0; i < answers.length; i++){ qIds.push(answers[i].questionId); };
									Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).populate("media.attachment").limit(limit).sort('sort').exec(function(err, question){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else if(!question) return res.status(200).json({ status: true, message: req.__("NotFound"), question: null, });
										else{
											Models.Question.findOne({ _id: { $in: qIds }, activityId: activity._id, status: true, }).sort({ sort: -1 }).exec(function(err, prevQuestion){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													qIds.push(question._id);
													Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															if(question.type == 'free' || question.type == 'blank'){
																var qs = question.toObject();
																qs.options = [];
																return res.status(200).json({
																	canedit: true, status: true,
																	participant: results.participant,
																	activity: activity, question: qs,
																	nextQuestion: nextQuestion,
																	prevQuestion: prevQuestion,
																});
															}else{
																functions.getOptions(question, function(err, options){
																	if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																	else{
																		var qs = question.toObject();
																		qs.options = options;
																		return res.status(200).json({
																			canedit: true, status: true,
																			participant: results.participant,
																			activity: activity, question: qs,
																			nextQuestion: nextQuestion,
																			prevQuestion: prevQuestion,
																		});
																	}
																});
															}
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
}) // get next quqstion
.post(Authorization.isModeratorAuthorized, function(req, res, next){
	var data = req.body,
	date = moment().format("YYYY-MM-DD"),
	activityId = req.params.activityId,
	participantId = req.params.participantId,
	pointsData = {}, point, rules = {
		questionId: "required",
		answers: "required",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		async.parallel({
			room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
			participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
		}, function(err, results){
			if(err) return res.status(400).json({ status: 0, error: err.message, });
			else{
				Models.ParticipantActivityStatus.findOne({ participantId: participantId, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
					if(err || participantActivity){
						var errorMessage = err ? err.message : req.__("YouCompleted");
						return res.status(400).json({ status: false, message: null, error: errorMessage, });
					}else{
						Models.Activities.findOne({ _id: activityId, roomId: results.room._id, status: 1, start: true, }).populate("categoryId").exec(function(err, activity){
							if(err || !activity){
								var errorMessage = err ? err.message : req.__("ActivityNotFound"),
								reqStatus = err ? 400 : 404;
								return res.status(reqStatus).json({ status: false, message: null, error: errorMessage, });
							}else{
								var questionId = data.questionId,
								answers = data.answers;
								pointsData = {
									activityId: activity._id,
									participantId: participantId,
									questionId: questionId,
									notAnswered: false,
									score: data.score,
								};
								async.parallel({
									room: function(callback){ Models.ParticipantPoints.remove({ activityId: activityId, participantId: participantId, questionId: questionId }, callback); },
									participant: function(callback){ Models.ParticipantAnswer.remove({ activityId: activityId, participantId: participantId, questionId: questionId }, callback); },
									question: function(callback){ Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, }).exec(callback); },
								}, function(err, results){
									if(err || !results.question){
										var errorMessage = err ? err.message : req.__("QuestionNotFound");
										return res.status(400).json({ status: false, message: null, error: errorMessage, });
									}else{
										var question = results.question;
										if(activity.type == 'polls'){
											var answerData = [];
											if(question.type == 'free'){
												var answer = (typeof answers == 'object') ? answers[0] : answers;
												var answerStatus = (answer.toUpperCase() != 'N/A') ? 'correct' : 'incorrect';
												answerData.push({
													activityId: activity._id,
													participantId: participantId,
													questionId: questionId,
													answer: answer,
													status: answerStatus
												});
												pointsData.point = (answerStatus == 'correct') ? 1 : 0;
												if(answer == 'N/A'){ pointsData.notAnswered = true; }
											}else if(question.type == 'truefalse' || question.type == 'single'){
												var answer = (typeof answers == 'object') ? answers[0] : answers;
												var answerStatus = (answer != 'N/A') ? 'correct' : 'incorrect';
												var answer1 = (answer == 'N/A') ? questionId : answer;
												answerData.push({
													activityId: activity._id,
													participantId: participantId,
													questionId: questionId,
													optionId: answer1,
													status: answerStatus
												});
												pointsData.point = (answerStatus == 'correct') ? 1 : 0;
												if(answer == 'N/A'){ pointsData.notAnswered = true; }
											}else{
												if(typeof answers != 'object'){
													var answerStatus = '';
													answerStatus = (answers != 'N/A') ? 'correct' : 'incorrect';
													answerData.push({
														activityId: activity._id,
														participantId: participantId,
														questionId: questionId,
														optionId: answers,
														status: answerStatus
													});
													pointsData.point = (answerStatus == 'correct') ? 1 : 0;
													if(answers == 'N/A'){ pointsData.notAnswered = true; }
												}else{
													var points = [];
													loop1: for (var i = 0; i < answers.length; i++){
														var answerStatus = (answers[i] != 'N/A') ? 'correct' : 'incorrect';
														points.push(answerStatus);
														var answer1 = (answers[i] == 'N/A') ? questionId : answers[i];
														if(answers[i] == 'N/A'){ pointsData.notAnswered = true; }
														answerData.push({ activityId: activity._id, participantId: participantId, questionId: questionId, optionId: answer1, status: answerStatus });
													};
													pointsData.point = (answers.length > 1) ? (answers[0] == 'N/A' ? 0 : 1) : 1;
												};
											};													
											Models.ParticipantAnswer.create(answerData, function(err, answers1){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													Models.ParticipantPoints.create(pointsData, function(err, points){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															Models.ParticipantActivityStatus.create({ participantId: participantId, activityId: activityId, status: 'completed' }, function(err){
																if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																else{
																	var message = 'Poll ' + req.__("Completed");
																	return res.status(200).json({
																		status: true, prevId: null,
																		nextQuestionId: null,
																		point: pointsData.point,
																		message: message,
																	});
																}
															});
														}
													});
												}
											});
										}else{
											Models.QuestionAnswer.find({ questionId: questionId, }).exec(function(err, correctAnswers){
												if(err || correctAnswers.length <= 0){
													var errorMessage = err ? err.message : req.__("AnswerforthisQuestionNotFound");
													return res.status(400).json({ status: false, message: null, error: errorMessage, });
												}else{
													var answerData = [];
													if(question.type == 'free' || question.type == 'blank'){
														var questionName = question.name,
														count = (questionName.match(/_BLANK/g) || []).length;
														for (var i = 0; i < count; i++){
															var str = (i == 0) ? '.*' : '.*\.';
															questionName = questionName.replace("_BLANK", str);
														}
														var re = new RegExp(questionName, 'i'),
														answer = (typeof answers == 'object') ? answers[0] : answers;
														if(!re.exec(answer) && question.type == 'blank'){
															return res.status(400).json({ status: false, message: null, error: "Please Enter Valid answer", });
														}
														var answerStatus = (answer.toUpperCase() === correctAnswers[0].answer.toUpperCase()) ? 'correct' : 'incorrect';
														answerData.push({
															activityId: activity._id,
															participantId: participantId,
															questionId: questionId,
															answer: answer,
															status: answerStatus
														});
														pointsData.point = (answerStatus == 'correct') ? 1 : 0;
														if(answer == 'N/A'){ pointsData.notAnswered = true; }
													}else if(question.type == 'truefalse' || question.type == 'single'){
														var answer = (typeof answers == 'object') ? answers[0] : answers;
														var answerStatus = (answer == correctAnswers[0].optionId) ? 'correct' : 'incorrect';
														var answer1 = (answer == 'N/A') ? questionId : answer;
														answerData.push({
															activityId: activity._id,
															participantId: participantId,
															questionId: questionId,
															optionId: answer1,
															status: answerStatus
														});
														pointsData.point = (answerStatus == 'correct') ? 1 : 0;
														if(answer == 'N/A'){ pointsData.notAnswered = true; }
													}else{
														if(typeof answers != 'object'){
															var answerStatus = '';
															for (var i = 0; i < correctAnswers.length; i++){
																answerStatus = (answers == correctAnswers[i].optionId) ? 'correct' : 'incorrect';
																if(answerStatus == 'correct'){
																	break;
																}
															};
															answerData.push({
																activityId: activity._id,
																participantId: participantId,
																questionId: questionId,
																optionId: answers,
																status: answerStatus
															});
															pointsData.point = (answerStatus == 'correct' && correctAnswers.length == 1) ? 1 : 0;
															if(answers == 'N/A'){ pointsData.notAnswered = true; }
														}else{
															var points = [];
															loop1: for (var i = 0; i < answers.length; i++){
																loop2: for (var j = 0; j < correctAnswers.length; j++){
																	var answerStatus = (answers[i] == correctAnswers[j].optionId) ? 'correct' : 'incorrect';
																	if(answerStatus == 'correct'){
																		break loop2;
																	}
																};
																points.push(answerStatus);
																var answer1 = (answers[i] == 'N/A') ? questionId : answers[i];
																if(answers[i] == 'N/A'){ pointsData.notAnswered = true; }
																answerData.push({ activityId: activity._id, participantId: participantId, questionId: questionId, optionId: answer1, status: answerStatus });
															};
															pointsData.point = (answers.length == correctAnswers.length) ? ((points.indexOf("incorrect") > -1) ? 0 : 1) : 0;
														};
													};
													Models.ParticipantAnswer.create(answerData, function(err, answers1){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															Models.ParticipantPoints.create(pointsData, function(err, points){
																if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																else{
																	Models.ParticipantAnswer.find({ activityId: activityId, participantId: participantId, }).exec(function(err, participantAnswers){
																		if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																		else{
																			var qIds = [];
																			for (var i = 0; i < participantAnswers.length; i++){ qIds.push(participantAnswers[i].questionId); };
																			Models.Question.findOne({ _id: { $in: qIds }, activityId: activity._id, status: true, }).sort({ sort: -1 }).exec(function(err, prevQuestion){
																				if(err) return res.status(400).json({ status: false, error: err.message, });
																				else{
																					var prevId = prevQuestion ? prevQuestion._id : null;
																					qIds.push(questionId);
																					Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
																						if(err) return res.status(400).json({ status: false, error: err.message, });
																						else if(nextQuestion){
																							return res.status(200).json({
																								status: true,
																								nextQuestionId: nextQuestion._id,
																								message: question.feedback,
																								prevId: prevId,
																								point: pointsData.point,
																								error: null,
																							});
																						}else{
																							Models.ParticipantActivityStatus.create({ participantId: participantId, activityId: activityId, status: 'completed' }, function(err){
																								if(err) return res.status(400).json({ status: false, error: err.message, });
																								else{
																									var message = 'Quiz' + ' ' + req.__("Completed");
																									return res.status(200).json({
																										status: true,
																										nextQuestionId: null,
																										prevId: prevId,
																										point: pointsData.point,
																										message: message,
																										error: null,
																									});
																								}
																							});
																						}
																					});
																				}
																			});
																		}
																	});
																}
															});
														}
													});
												}
											});
										}
									}
								});
							}
						});
					}
				});
			}
		});
	}
}); // Submit answer for question
Router.get('/:participantId/activity/:activityId/:questionId', Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.activityId,
	participantId = req.params.participantId,
	questionId = req.params.questionId;
	async.parallel({
		room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
		participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).json({ status: 0, error: err.message, });
		else{
			Models.ParticipantActivityStatus.findOne({ participantId: participantId, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
				if(err || participantActivity){
					var errorMessage = err ? err.message : req.__("YouCompleted");
					return res.status(400).json({ status: false, message: null, error: errorMessage, });
				}else{
					Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, status: 1, }).exec(function(err, activity){
						if(err || !activity){
							var errorMessage = err ? err.message : req.__("ActivityNotFound");
							return res.status(400).json({ status: false, message: null, error: errorMessage, });
						}else{
							Models.Question.findOne({ _id: { $in: [questionId] }, activityId: activity._id, status: true, }).populate("media.attachment").limit(1).sort('sort').exec(function(err, question){
								if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
								else if(!question) return res.status(400).json({ status: false, completed: true, message: null, error: req.__("NotFound"), });
								else{
									Models.Question.findOne({ sort: { $lt: question.sort }, activityId: activity._id, status: true, }).sort({ sort: -1 }).limit(1).exec(function(err, previousQuestion){
										Models.Question.findOne({ sort: { $gt: question.sort }, activityId: activity._id, status: true, }).sort({ sort: 1 }).limit(1).exec(function(err, nextQuestion){
											Models.ParticipantAnswer.find({ participantId: participantId, questionId: question._id, activityId: activityId, }).exec(function(err, participantAnswer){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													Models.Options.find({ questionId: question._id, }).sort("_id").exec(function(err, options){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															var answers = [];
															for (var i = 0; i < participantAnswer.length; i++){ answers.push(participantAnswer[i].answer); };
															var qs = question.toObject();
															qs.options = options;
															qs.answers = (question.type == 'free' || question.type == 'blank') ? answers : participantAnswer;
															var canedit = (participantAnswer.length > 0) ? false : true;
															if(nextQuestion){
																Models.ParticipantAnswer.findOne({ participantId: participantId, questionId: nextQuestion._id }).exec(function(err, ans){
																	if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																	else{
																		var next = ans ? true : false;
																		return res.status(200).json({
																			status: true,
																			canedit: canedit,
																			participant: req.user,
																			activity: activity,
																			question: qs,
																			nextQuestion: nextQuestion,
																			nextCompleted: next,
																			prevQuestion: previousQuestion,
																		});
																	}
																});
															}else{
																return res.status(200).json({
																	status: true,
																	participant: req.user,
																	activity: activity,
																	canedit: canedit,
																	question: qs,
																	nextQuestion: nextQuestion,
																	nextCompleted: false,
																	prevQuestion: previousQuestion,
																});
															}
														}
													});
												}
											});
										});
									});
								}
							});
						}
					});
				}
			});
		}
	});
}); // get prev question
// View Poll Results
Router.get("/:participantId/activity/:id/question/:questionId", Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.id,
	participantId = req.params.participantId,
	questionId = req.params.questionId;
	async.parallel({
		room: function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
		participant: function(callback){ Models.Participant.findOne({ _id: participantId, moderatorId: req.user._id, }).exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).json({ status: 0, error: err.message, });
		else{
			Models.Activities.findOne({ _id: activityId, moderatorId: req.user._id, type: "polls" }).exec(function(err, activity){
				if(err || !activity){
					var errorMessage = err ? err.message : req.__("ActivityNotFound");
					return res.status(400).json({ status: false, error: errorMessage, });
				}else{
					Models.ParticipantActivityStatus.find({ activityId: activityId, status: 'completed' }).exec(function(err, activityStatus){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else if(activityStatus.length <= 0) return res.status(400).json({ status: false, message: req.__("NotFound"), activity: activity, participants: [], question: null, });
						else{
							Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, activityId: activityId }).exec(function(err, question){
								if(err || !question){
									var errorMessage = err ? err.message : req.__("QuestionNotFound");
									return res.status(404).json({ status: false, error: errorMessage, });
								}else{
									var question = question.toObject(),
									condition = (question.type == 'free' || question.type == 'blank') ? '$answer' : '$optionId';
									Models.ParticipantAnswer.aggregate([{
										$match:{
											questionId: mongoose.Types.ObjectId(questionId),
											activityId: mongoose.Types.ObjectId(activityId),
										},
									}, {
										$group: { _id: condition, count: { $sum: 1, }, }
									}], function(err, result){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else{
											if(question.type == 'free' || question.type == 'blank'){
												var correctAnswer = [], notAnswerd;
												async.forEach(result, function(option, done){
													if(option._id == 'N/A'){
														notAnswerd = { questionId: questionId, count: option.count };
													}else{
														option.correct = true;
														correctAnswer.push(option);
													}
													done(null);
												}, function(err){
													question.options = correctAnswer;
													return res.status(200).json({
														status: true,
														count: activityStatus.length,
														question: question,
														notAnswerd: notAnswerd,
														activity: activity,
													});
												});
											}else{
												Models.Options.find({ questionId: questionId, status: true }).exec(function(err, options){
													if(err) return res.status(400).json({ status: false, error: err.message, });
													else{
														var correctAnswer = [];
														async.forEach(options, function(option, done){
															var option1 = option.toObject();
															option1.correct = true;
															var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(option._id));
															option1.count = (arrId > -1) ? result[arrId].count : 0;
															correctAnswer.push(option1);
															done(null);
														}, function(err){
															var notAnswerd,
															arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(questionId));
															if(arrId > -1){
																notAnswerd = {
																	questionId: questionId,
																	count: result[arrId].count,
																	value: 'not answered',
																};
															}
															question.options = correctAnswer;
															return res.status(200).json({
																status: true,
																count: activityStatus.length,
																question: question,
																notAnswerd: notAnswerd,
																activity: activity,
															});
														});
													}
												});
											}
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
}); // View Activity Results
// Folder Management
Router.get("/library/folder/:folderId/export", Authorization.isModeratorAuthorized, function(req, res, next){
	var folderId = req.params.folderId;
	Models.File.findOne({ _id: folderId, moderatorId: req.user._id, }).select({ "__v": 0, "createdAt": 0, "updatedAt": 0, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : "Folder Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			var file1 = JSON.parse(JSON.stringify(file));
			var data = { folder: [file1, file1,] };
			var xml = js2xmlparser("folders", data)
			fs.writeFileSync('file.xml', xml);
			return res.status(200).json({ status: true, file: file, });
		}
	});
});
// Activities (Quiz, Poll) XML Export
Router.post("/library/:type(quiz|polls)/:Id/export/:fileType(xml|csv|qef)", Authorization.isModeratorAuthorized, function(req, res, next){
	var activityId = req.params.Id, type = req.params.type,
	fileType = req.params.fileType;
	Models.Activities.findOne({ moderatorId: req.user._id, fileId: activityId, type: type, }).exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : "Activity Not Found",
			status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else if(fileType == 'xml' || fileType == 'qef') functions.xmlExport(activityId, type, fileType, activity, req, res, next);
		else if(fileType == 'csv') functions.csvExport(activityId, type, fileType, activity, req, res, next);
		else return res.status(400).json({ status: false, error: req.__("SomeThingWrong"), });
		
	});
});
// Invite Participant
Router.post("/participants/:Id/invite", Authorization.isModeratorAuthorized, function(req, res, next){
	var Id = req.params.Id;
	/*Models.Participant.findOne({ _id: Id, moderatorId: req.user._id, }).exec(function(err, participant){
		if(err || !participant){
			var errorMessage = err ? err.message : req.__("ParticipantNotFound");
			return res.status(400).json({ status: false, error: errorMessage, });
		}else{
			Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(function(err, room){
				if(err || !room){
					var errorMessage = err ? err.message : req.__("ParticipantNotFound");
					return res.status(400).json({ status: false, error: errorMessage, });
				}else{
					participant.decryptPassword(function(err, password){
						var mailOptions = {
							from: Config.mailOptions.from,
							to: participant.email,
							template: 'participant',
							subject: 'Mobiteach - Invitation',
							context: {
								url: Config.app.baseUrl,
								participantUrl: Config.app.baseUrl + 'participant',
								email: participant.email,
								password: password,
								moderator: req.user.name,
								name: participant.name,
								room: room.code,
								pin: room.pin,
								participantLogin0: (room.participantLogin == 0),
								participantLogin1: (room.participantLogin == 1),
								participantLogin2: (room.participantLogin == 2),
							},
						};
						Transporter.sendMail(mailOptions, function(error, info){
							console.log(error);
							return res.status(200).json({ status: true, message: 'Invitation Send Successfully', });
						});
					});
				}
			});
		}
	});*/
	async.waterfall([
		function(callback){ Models.Participant.findOne({ _id: Id, moderatorId: req.user._id, }).exec(callback); },
		function(participant, cb){
			if(!participant) cb({ message: req.__("ParticipantNotFound"), });
			else{
				Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(function(err, room){
					if(!room) cb({ message: req.__("ParticipantNotFound"), });
					else cb(err, participant, room);
				});
			}
		},
		function(participant, room, cb){
			participant.decryptPassword(function(err, password){ cb(err, participant, room, password); });
		},
		function(participant, room, password, cb){
			Transporter.sendMail({
				from: Config.mailOptions.from, to: participant.email,
				template: 'participant', subject: 'Mobiteach - Invitation',
				context: {
					url: Config.app.baseUrl, participantUrl: Config.app.baseUrl + 'participant',
					email: participant.email, password: password, moderator: req.user.name,
					name: participant.name, room: room.code, pin: room.pin,
					participantLogin0: (room.participantLogin == 0),
					participantLogin1: (room.participantLogin == 1),
					participantLogin2: (room.participantLogin == 2),
				},
			}, function(err, info){ cb(err, participant, room, password, info); });
		},
	], function(err, participant, room, password, info){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else return res.status(200).json({ status: true, message: 'Invitation Send Successfully', });
	});
});
// Import Questions
Router.post("/library/import/:folderId?/questions", Authorization.isModeratorAuthorized, multipart, function(req, res, next){
	var folderId = req.params.folderId, file = req.files.file,
	originalFilename = file.originalFilename.replace(/ /g,''),
	originalExtension = path.extname(originalFilename),
	extension = ['.aef'], upload = path.join(__dirname, '../public/attachments/'),
	thumbnail = path.join(upload, '/thumbnail/'), myTask = new Zip(),
	unzipaef1 = path.join(__dirname, '../public/unzipaef/'),
	code = randomString.generate({ capitalization: "uppercase", length: 6 }),
	unzipaef = path.join(unzipaef1, moment().format("YYYYMMDDTHHmmssSS/"));
	functions.mkDirNotExists([upload, thumbnail, unzipaef1, unzipaef,]);
	if(extension.indexOf(originalExtension) != -1){
		async.waterfall([
			function(callback){ Models.Rooms.findOne({ moderatorId: req.user._id, }).exec(callback); },
			function(room, cb){
				if(!room) cb({ message: "Some Thing Wrong", });
				else{
					functions.getBaseFolder(req, code, function(err, folder){
						if(!folder) cb({ message: "Some Thing Wrong", });
						else cb(err, room, folder);
					});
				}
			},
		], function(err, room, folder){
			if(err) return res.status(400).json({ status: false, error: err.message, });
			else{
				myTask.extractFull(file.path, unzipaef).then(function(){
					fs.readFile(unzipaef + "aef.xml", 'utf-8', function(err, data){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else{
							var result = JSON.parse(Parser.toJson(data)), baseFolder = folder;
							async.forEachOf(result.aef, function(item, index, callback){
								if(index == "qfolders"){
									var folderData = _.isArray(item.qfolder) ? item.qfolder : [item.qfolder];
									forEach(folderData, function(nextProperty, qfolder, key, array){
										async.waterfall([
											function(cb){ Models.File.create({ folderId: baseFolder._id, moderatorId: req.user._id, name: qfolder.name, type: 'folder', }, cb); },
											function(file, cb){
												Models.Folder.create({ moderatorId: req.user._id, name: qfolder.name, isRoot: false, fileId: file._id, }, function(err, subfolder){
													if(err) file.remove();
													cb(err, subfolder);
												});
											},
										], function(err, subfolder){
											if(!err) baseFolder = subfolder;
											nextProperty();
										});
									}).then(function(){ callback(); });
								}else if(index == "assessments") callback();
								else callback();
							}, function(err){
								if(err) return res.status(400).json({ status: false, error: err.message, });
								else{
									async.waterfall([
										function(callback){
											Models.Category.findOrCreate({ moderatorId: req.user._id, }, { name: "Default", moderatorId: req.user._id }, function(err, category){ callback(err, category); });
										},
										function(category, callback){
											Models.File.create({ folderId: baseFolder._id, moderatorId: req.user._id, name: "import", type: 'quiz', }, function(err, attrfile){ callback(err, category, attrfile); });
										},
										function(category, attrfile, cb){
											Models.Activities.create({ moderatorId: req.user._id, roomId: room._id, fileId: attrfile._id, name: "import", type: 'quiz', categoryId: category._id, }, function(err, activity){
												if(err) attrfile.remove();
												cb(err, attrfile, activity);
											});
										},
										function(attrfile, activity, cb){ fs.readFile(unzipaef + "qef.xml", 'utf-8', function(err, data){ cb(err, attrfile, activity, data); }); },
									], function(err, attrfile, activity, data){
										if(err) return res.status(400).json({ status: false, error: err.message, });
										else{
											var result = JSON.parse(Parser.toJson(data));
											async.forEachOf(result.qef, function(item, index, nextQuestion){
												if(index == "questions"){
													var count = 1, questionsData = _.isArray(item.question) ? item.question : [item.question];
													forEach(questionsData, function(nextProperty, question, key, array){
														if(question.qtype == "CM"){
															var type = ((question.choiceInteraction.multipleAnswer == '1') ? 'multiple' : 'single'),
															medias = [];
															questionData = { moderatorId: req.user._id,
																activityId: activity._id, name: question.title,
																type: type, status: ((question.status == 'Ready') ? true : false),
																sort: count, timelimit: parseInt(question.timeLimit),
																status: true, random: ((question.choiceInteraction.shuffle == '0') ? false : true),
															}, options = [], answer = [];
															for (var i = 0; i < question.choiceInteraction.simpleChoices.answer.length; i++) {
																if(question.choiceInteraction.simpleChoices.answer[i].image && question.choiceInteraction.simpleChoices.answer[i].image.media){
																	medias.push(question.choiceInteraction.simpleChoices.answer[i].image.media);
																}
																options.push(question.choiceInteraction.simpleChoices.answer[i].label);
																if(question.choiceInteraction.simpleChoices.answer[i].iscorrect == '1'){
																	answer.push(question.choiceInteraction.simpleChoices.answer[i].label);
																}
															}
															count = count + 1;
															if(question.choiceInteraction.image && question.choiceInteraction.image.media){
																medias.push(question.choiceInteraction.image.media);
															}
															functions.CreateImportMedia(req, baseFolder, medias, unzipaef, upload, thumbnail, function(err, attachments){
																if(err) nextProperty();
																else{
																	questionData.media = attachments;
																	functions.CreateImportQuestion(questionData, answer, options, function(err, createdQuestion){
																		nextProperty();
																	});
																}
															});
														}else if(question.qtype == "FITB"){
															var questionData = { moderatorId: req.user._id,
																activityId: activity._id, name: question.title, status: true,
																type: "free", status: ((question.status == 'Ready') ? true : false),
																sort: count, timelimit: parseInt(question.timeLimit),
															}, medias = [];
															count = count + 1;
															if(question.fitbInteraction.image && question.fitbInteraction.image.media){
																medias.push(question.fitbInteraction.image.media);
															}
															functions.CreateImportMedia(req, baseFolder, medias, unzipaef, upload, thumbnail, function(err, attachments){
																if(err) nextProperty();
																else{
																	questionData.media = attachments;
																	functions.CreateImportQuestion(questionData, ['answer'], [], function(err, createdQuestion){
																		nextProperty();
																	});
																}
															});
														}else nextProperty();
													}).then(function(){ nextQuestion(); });

												}else nextQuestion();
											}, function(err){
												if(err) return res.status(400).json({ status: false, error: err.message, });
												else{
													if(fs.lstatSync(unzipaef).isDirectory()) exec('rm -rf ' + unzipaef);
													return res.status(200).json({ status: true, message: "Imported Successfully. Please Update Question answers!", });
												}
											});
										}
									});
								}
							});
						}
					});
				}).catch(function (err){
					return res.status(400).json({ status: false, error: err.message, });
				});
			}
		});
	}else return res.status(400).json({ status: false, error: "File Type not Accepted.Please select AEF Files", });
});
// Not Found route
Router.get("/*", Authorization.isModeratorAuthorized, function(req, res, next){
	return res.status(404).json({ status: false, error: req.__("NotFound"), });
});

module.exports = Router;