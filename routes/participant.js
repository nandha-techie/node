var 	express	=	require('express'),
	lodash		=	require('lodash'),
	Async		=	require("async"),
	Multiparty	=	require('connect-multiparty'),
	mongoose	=	require("mongoose"),
	gm		=	require('gm').subClass({ imageMagick: true }),
	path		=	require('path'),
	moment	=	require('moment'),
	_		=	require("underscore"),
	uuid		=	require("uuid"),
	reversePop	=	require('mongoose-reverse-populate'),
	hbs		=	require('nodemailer-express-handlebars'),
	Validator	=	require('validatorjs'),
	randomString	=	require('randomstring'),
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
	return res.render('participant/index', { title: Config.app.name + " - Participant", });
});
// Validate Room Code 
Router.post('/room', Authorization.requiresNotLogin, function(req, res, next){
	var data = req.body, rules = {
		room: "required|min:6|max:6",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all();
		return res.status(400).json({ status: false, error: errors[Object.keys(errors)[0]][0], });
	}else{
		Models.Rooms.findOne({ code: data.room, }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : "Room Not Found";
				return res.status(400).json({ status: false, error: errorMessage, });
			}else return res.status(200).json({ status: true, room: room, message: "Please Login", });
		});
	}
});
// Login by Room Code and Email
Router.post('/room/:roomCode/:loginMethod(loginByEmail|loginByPin|loginByPassword)', Authorization.requiresNotLogin, function(req, res, next){
	var data = req.body,
	roomCode = req.params.roomCode.toUpperCase(),
	loginMethod = req.params.loginMethod,
	rules = {
		email: "required|email",
	}, validation = new Validator(data, rules);
	if(roomCode.length != 6){
		return res.status(400).json({ status: false, error: "Room Not Found", });
	}
	if(validation.fails()){
		var errors = validation.errors.all();
		return res.status(400).json({ status: false, error: errors[Object.keys(errors)[0]][0], });
	}else{
		if(loginMethod == "loginByEmail"){ data.password = "admin123"; }
		Models.Rooms.findOne({ code: roomCode, }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : "Room Not Found";
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Passport.authenticate(loginMethod, function(err, authuser, info){
					if(err || !authuser){
						var errorMessage = err ? err.message : "Invalid Credentials";
						return res.status(400).json({ status: false, error: errorMessage, data: data, });
					}else{
						req.logIn(authuser, function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
							Models.ParticipantLogin.remove({ participantId: authuser._id }, function(err){
								if(err){
									req.logout();
									return res.status(400).json({ status: false, error: err.message, data: data, });
								}else{
									Models.ParticipantLogin.create({ participantId: authuser._id, moderatorId: authuser.moderatorId, roomId: room._id }, function(err, login){
										if(err){
											req.logout();
											return res.status(400).json({ status: false, error: err.message, data: data, });
										}else{
											var participant = authuser,
											qs = participant.toObject();
											qs.password = null;
											qs.room = room;
											req.app.get("io").to(authuser.moderatorId).emit('activeParticipants');
											return res.status(200).json({ status: true, message: "You're logged in successfully.", user: qs, });
										}
									});
								}
							});
						});
					}
				})(req, res, next);
			}
		});
	}
});
// Update Login Info
Router.get('/updatelogin', Authorization.requiresLogin, function(req, res, next){
	Models.ParticipantLogin.findOne({ participantId: req.user._id, }).sort('createdAt').exec(function(err, login){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			login.lastUpdate = moment.utc().format("YYYY-MM-DDTHH:mm:ss");
			login.save(function(err){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else return res.status(200).json({ message: "Updated Successfully", status: true, });
			});
		}
	});
});
// Logout/Signout callback
Router.get('/logout', function(req, res, next){
	if(req.isAuthenticated() && (!req.user.isAdmin && !req.user.isModerator)){
		Models.ParticipantLogin.remove({ participantId: req.user._id, }, function(err){
			if(err) return res.status(400).json({ status: false, error: err.message, });
			else{
				functions.eachSeries(req.cookies, function(value, key, callback){
					res.clearCookie(key);
					callback();
				}, function done(){
					req.app.get("io").to(req.user.moderatorId).emit('activeParticipants');
					req.session.destroy();
					req.logout();
					return res.status(200).redirect("/");
				});
			}
		});
	}else{
		req.logout();
		return res.status(200).redirect("/");
	}
});
// Forgot Password
Router.post('/forgotpasswd', Authorization.requiresNotLogin, function(req, res, next){
	var data = req.body, token = uuid.v4(),
	resetPasswordLink = Config.app.baseUrl + "participant#/resetpwd/" + token,
	rules = {
		room: "required|min:6|max:6",
		email: "required|email",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, });
	}else{
		var email = data.email.toLowerCase(), roomCode = data.room.toUpperCase();
		Models.Rooms.findOne({ code: roomCode, }).exec(function(err, room){
			if(err || !room){
				var errorMessage = err ? err.message : "Room Not Found";
				return res.status(400).json({ status: false, error: errorMessage, });
			}else{
				Models.Participant.findOne({ email: email, roomId: room._id, status: true }).exec(function(err, participant){
					if(err || !participant){
						var errorMessage = err ? err.message : "Participant Not Found",
						status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						Models.ParticipantToken.remove({ participantId: participant._id }, function(err){
							if(err) return res.status(400).json({ status: 0, error: err.message, message: null });
							else{
								Models.ParticipantToken.create({ participantId: participant._id, roomId: room._id, token: token }, function(err, create){
									if(err) return res.status(400).json({ status: 0, error: err.message, message: null });
									else{
										Transporter.sendMail({
											from: Config.mailOptions.from,
											to: participant.email,
											subject: 'Reset Password Link',
											template: 'forgotpass',
											context: {
												url: Config.app.baseUrl,
												resetLink: resetPasswordLink,
												name: participant.name
											},
										}, function(error, info){
											if(error) return res.status(400).json({ status: 0, error: error.message, message: null });
											else{
												console.log('Message sent: ' + info.response);
												return res.status(200).json({ error: null, message: req.__("ResetPasswordMsg"), status: true, });
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
// Reset Password
Router.route('/resetpasswd/:token').get(Authorization.requiresNotLogin, function(req, res, next){
	var token = req.params.token;
	Models.ParticipantToken.findOne({ token: token, }).exec(function(err, data){
		if(err) return res.status(400).json({ status: false, error: err.message, message: null });
		else if(!data) return res.status(400).json({ status: false, error: req.__("TokenNotFound"), message: null });
		else return res.status(200).json({ status: true, message: req.__("PleaseEnterNewPassword"), data: data, });
	});
}).post(Authorization.requiresNotLogin, function(req, res, next){
	var data = req.body, token = req.params.token,
	rules = {
		password: "required|confirmed|min:8|max:25",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, });
	}else{
		Models.ParticipantToken.findOne({ token: token, }).exec(function(err, details){
			if(err) return res.status(400).json({ status: false, error: err.message, message: null });
			else if(!details) return res.status(400).json({ status: false, error: req.__("TokenNotFound"), message: null });
			else{
				Models.Participant.findOne({ _id: details.participantId, roomId: details.roomId, status: true, }).exec(function(err, participant){
					if(err || !participant){
						var errorMessage = err ? err.message : req.__("UserNotFound"),
						status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						participant.password = data.password;
						participant.save(function(err){
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
// User Profile
Router.route("/profile").get(Authorization.requiresLogin, function(req, res, next){
	var participant = req.user,
	qs = participant.toObject();
	delete qs.password;
	Models.Rooms.findOne({ _id: req.user.roomId, moderatorId: req.user.moderatorId }).exec(function(err, room){
		if(err) return res.status(400).json({ status: false, error: req.__("SomeThingWrong"), });
		else{
			qs.room = room;
			return res.status(200).json({ status: true, error: null, user: qs, });
		}
	});
}) // get user data
.post(Authorization.requiresLogin, function(req, res, next){
	var data = req.body;
	Models.Rooms.findOne({ _id: req.user.roomId, moderatorId: req.user.moderatorId }).exec(function(err, room){
		if(err) return res.status(400).json({ status: false, error: req.__("SomeThingWrong"), });
		else{
			Models.Participant.findOne({ _id: req.user._id, }).exec(function(err, participant){
				if(err || !participant){
					var errorMessage = err ? err.message : "Participant Not Found";
					req.flash("error", errorMessage);
				 	return res.status(400).json({ status: false, error: errorMessage, });
				}else{
					var email = data.email.toLowerCase();
					Models.Participant.findOne({ _id: { $ne: req.user._id }, email: email, }).exec(function(err, exists){
						if(err || exists){
							var errorMessage = err ? err.message : "Email Already Registered.Please try with another One!";
							return res.status(400).json({ status: false, error: errorMessage, });
						}else{
							participant.firstname = data.firstname;
							participant.lastname = data.lastname;
							participant.email = email;
							participant.save(function(err){
								if(err) return res.status(400).json({ status: false, error: err.message, data: data, });
								else return res.status(200).json({ status: true, message: req.__("ProfileUpdated"), user: participant, room: room, });
							});
						}
					});
				}
			});
		}
	});
}); // update user data
// get Activities
Router.get('/activities', Authorization.requiresLogin, function(req, res, next){
	var date = moment().format("YYYY-MM-DD"),
	page = req.query.page ? req.query.page : 1,
	limit = 10;
	Models.ParticipantActivityStatus.find({ participantId: req.user._id, status: 'completed' }).exec(function(err, activityStatus){
		if(err) return res.status(400).json({ status: 0, error: err.message, message: null });
		else{
			if(activityStatus.length <= 0){
				var condition = { roomId: req.user.roomId, status: 1, isArchived: false, start: true, };
			}else{
				var Ids = [];
				for (var i = 0; i < activityStatus.length; i++){
					Ids.push(activityStatus[i].activityId);
				}
				var condition = { _id: { $nin: Ids }, roomId: req.user.roomId, status: 1, isArchived: false, start: true, };
			}
			Models.Activities.paginate(condition, { page: page, limit: limit, sort: { startDate: -1 }, }).then(function(activities){
				var pages = functions.getArrayPages(req)(10, activities.pages, page),
				opts = {
					modelArray: activities.docs,
					storeWhere: "ParticipantActivityStatus",
					arrayPop: true,
					idField: "activityId",
					mongooseModel: Models.ParticipantActivityStatus,
					filters: {
						participantId: req.user._id
					},
				};
				if(activities.total > 0){
					reversePop(opts, function(err, popActivities){
						if(err) return res.status(400).json({ status: 0, error: err.message, message: null });
						else{
							return res.status(200).json({
								status: true,
								activities: popActivities,
								pages: pages,
								total: activities.total,
								message: 'Activities Listing',
								limit: limit,
								currentPage: page,
							});
						}
					});
				}else{
					Models.Activities.findOne({ show: true, moderatorId: req.user.moderatorId, type: "polls", start: true, }).populate("categoryId").exec(function(err, activity){
						if(err) return res.status(400).json({ status: false, error: err.message, });
						else if(!activity){
							return res.status(200).json({
								status: true,
								activities: [],
								pages: pages,
								total: activities.total,
								message: 'Activities Listing',
								limit: limit,
								currentPage: page,
							});
						}else functions.PollResult(req, res, next, activity, req.user.moderatorId);
					});
				}
			});
		}
	});
});
// Activities Functions
Router.route('/activity/:activityId')
.get(Authorization.requiresLogin, function(req, res, next){
	var date = moment().format("YYYY-MM-DD"),
	activityId = req.params.activityId,
	limit = 1, qIds = [];
	Models.ParticipantActivityStatus.findOne({ participantId: req.user._id, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
		if(err || participantActivity){
			var errorMessage = err ? err.message : req.__("YouCompleted");
			return res.status(400).json({ status: false, completed: true, message: null, error: errorMessage, });
		}else{
			Models.Activities.findOne({ _id: activityId, roomId: req.user.roomId, start: true, status: 1, }).populate("categoryId").exec(function(err, activity){
				if(err || !activity){
					var errorMessage = err ? err.message : req.__("ActivityNotFound"),
					reqStatus = err ? 400 : 404;
					return res.status(reqStatus).json({ status: false, message: null, error: errorMessage, });
				}else{
					Models.ParticipantAnswer.find({ activityId: activityId, participantId: req.user._id, }).exec(function(err, answers){
						if(err) return res.status(400 ).json({ status: false, message: null, error: err.message, });
						else{
							for (var i = 0; i < answers.length; i++){ qIds.push(answers[i].questionId); };
							if(activity.byParticipant){
								if(activity.random){
									Models.Question.count({ _id: { $nin: qIds }, activityId: activity._id, status: true, }, function(err, count){
										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
										else{
											var rand = Math.floor(Math.random() * count);
											Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).populate("media.attachment").skip(rand).exec(function(err, question){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else if(!question){
													var message = req.__("NotFound");
													return res.status(200).json({ status: true, message: message, question: null, error: null, });
												}else{
													qIds.push(question._id);
													Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).exec(function(err, nextQuestion){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															if(question.type == 'free' || question.type == 'blank'){
																var qs = question.toObject();
																qs.options = [];
																return res.status(200).json({
																	canedit: true,
																	status: true,
																	participant: req.user,
																	activity: activity,
																	question: qs,
																	nextQuestion: nextQuestion,
																	prevQuestion: null,
																});
															}else{
																functions.getOptions(question, function(err, options){
																	if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																	else{
																		var qs = question.toObject();
																		qs.options = options;
																		return res.status(200).json({
																			canedit: true,
																			status: true,
																			participant: req.user,
																			activity: activity,
																			question: qs,
																			nextQuestion: nextQuestion,
																			prevQuestion: null,
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
								}else{
									Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).populate("media.attachment").limit(limit).sort('sort').exec(function(err, question){
										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
										else if(!question){
											var message = req.__("NotFound");
											return res.status(200).json({ status: true, message: message, question: null, error: null, });
										}else{
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
																	canedit: true,
																	status: true,
																	participant: req.user,
																	activity: activity,
																	question: qs,
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
																			canedit: true,
																			status: true,
																			participant: req.user,
																			activity: activity,
																			question: qs,
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
							}else{
								Models.Question.findOne({ activityId: activity._id, status: true, active: true, }).populate("media.attachment").sort('sort').exec(function(err, question){
									if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
									else if(!question) return res.status(200).json({ status: true, message: req.__("NotFound"), question: "wait", error: null, });
									else{
										qIds.push(question._id);
										Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
											if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
											else{
												Models.ParticipantPoints.findOne({ activityId: activity._id, questionId: question._id, participantId: req.user._id, }).exec(function(err, point){
													if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
													else if(point){
														if(question.show){
															var condition = (question.type == 'free' || question.type == 'blank') ? '$answer' : '$optionId';
															Models.ParticipantAnswer.aggregate([
																{
																	$match:{
																		questionId: mongoose.Types.ObjectId(question._id),
																		activityId: mongoose.Types.ObjectId(activity._id),
																	},
																}, { $group: { _id: condition, count: { $sum: 1, }, } }
															], function(err, result){
																if(err){
																	return res.status(400).json({ status: false, error: err.message, });
																}else{
																	Models.ParticipantAnswer.aggregate([{
																		$match:{ questionId: mongoose.Types.ObjectId(question._id), activityId: mongoose.Types.ObjectId(activity._id), },
																	}, {
																		$group: { _id: "$participantId", count: { $sum: 1, }, }
																	}], function(err, activityStatus){
																		if(err) return res.status(400).json({ status: false, error: err.message, });
																		else{
																			Models.QuestionAnswer.find({ questionId: question._id, }).exec(function(err, answers){
																				if(err) return res.status(400).json({ status: false, error: err.message, });
																				else{
																					if(question.type == 'free' || question.type == 'blank'){
																						var correctAnswer = [], notAnswerd;
																						Models.ParticipantAnswer.find({ questionId: question._id, activityId: activityId, }).populate("participantId").exec(function(err, result){
																							if(err) return res.status(400).json({ status: false, error: err.message, });
																							else{
																								Async.forEach(result, function(option, done){
																									var option = option.toObject();
																									option.correct = false;
																									if(option.answer == 'N/A'){
																										option.notAnswered = true;
																										option.answer = "";
																									}else{
																										for (var i = 0; i < answers.length; i++){
																											if(answers[i].answer.toUpperCase() == option.answer.toUpperCase()){
																												option.correct = true;
																											}
																										};
																									}
																									correctAnswer.push(option);
																									done(null);
																								}, function(err){
																									var r = question.toObject();
																									r.options = correctAnswer;
																									return res.status(200).json({ status: true, questionResult: true, activity: activity, question: r, notAnswerd: notAnswerd, participant: req.user, count: activityStatus.length, });
																								});
																							}
																						});
																					}else{
																						functions.getOptions(question, function(err, options){
																							if(err) return res.status(400).json({ status: false, error: err.message, });
																							else{
																								var correctAnswer = [];
																								Async.forEach(options, function(option, done){
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
																									arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(question._id));
																									if(arrId > -1){
																										notAnswerd = { questionId: question._id, count: result[arrId].count, value: 'not answered', };
																									}
																									var r = question.toObject();
																									r.options = correctAnswer;
																									return res.status(200).json({ status: true, questionResult: true, activity: activity, question: r, notAnswerd: notAnswerd, participant: req.user, count: activityStatus.length, });
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
														}else return res.status(200).json({ status: true, message: req.__("NotFound"), question: "wait", error: null, });
													}else{
														if(question.type == 'free' || question.type == 'blank'){
															var qs = question.toObject();
															qs.options = [];
															return res.status(200).json({ canedit: true, status: true, participant: req.user, activity: activity, question: qs, nextQuestion: null, prevQuestion: null, completed: nextQuestion ? false : true, });
														}else{
															functions.getOptions(question, function(err, options){
																if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																else{
																	var qs = question.toObject();
																	qs.options = options;
																	return res.status(200).json({
																		canedit: true,
																		status: true,
																		participant: req.user,
																		activity: activity,
																		question: qs,
																		nextQuestion: null,
																		prevQuestion: null,
																		completed: nextQuestion ? false : true,
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
						}
					});
				}
			});
		}
	});
}) // get next quqstion
.post(Authorization.requiresLogin, function(req, res, next){
	var data = req.body, date = moment().format("YYYY-MM-DD"),
	activityId = req.params.activityId,
	pointsData = {}, point, rules = {
		questionId: "required",
		answers: "required",
	}, validation = new Validator(data, rules);
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.ParticipantActivityStatus.findOne({ participantId: req.user._id, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
			if(err || participantActivity){
				var errorMessage = err ? err.message : req.__("YouCompleted");
				return res.status(400).json({ status: false, message: null, error: errorMessage, });
			}else{
				Models.Activities.findOne({ _id: activityId, roomId: req.user.roomId, status: 1, start: true, }).populate("categoryId").exec(function(err, activity){
					if(err || !activity){
						var errorMessage = err ? err.message : req.__("ActivityNotFound"), reqStatus = err ? 400 : 404;
						return res.status(reqStatus).json({ status: false, message: null, error: errorMessage, });
					}else{
						var questionId = data.questionId,
						answers = data.answers;
						pointsData = {
							activityId: activity._id,
							participantId: req.user._id,
							questionId: questionId,
							notAnswered: false,
							score: data.score,
						};
						Models.Question.findOne({ _id: questionId, moderatorId: req.user.moderatorId, }).exec(function(err, question){
							if(err || !question){
								var errorMessage = err ? err.message : req.__("QuestionNotFound");
								return res.status(400).json({ status: false, message: null, error: errorMessage, });
							}else{
								if(activity.type == 'polls'){
									var answerData = [];
									if(question.type == 'free'){
										var answer = (typeof answers == 'object') ? answers[0] : answers;
										var answerStatus = (answer.toUpperCase() != 'N/A') ? 'correct' : 'incorrect';
										answerData.push({
											activityId: activity._id,
											participantId: req.user._id,
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
											participantId: req.user._id,
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
												participantId: req.user._id,
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
												answerData.push({ activityId: activity._id, participantId: req.user._id, questionId: questionId, optionId: answer1, status: answerStatus });
											};
											pointsData.point = (answers.length > 1) ? (answers[0] == 'N/A' ? 0 : 1) : 1;
										};
									};
									Models.ParticipantPoints.remove({ activityId: activityId, participantId: req.user._id, questionId: questionId }, function(err){
										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
										else{
											Models.ParticipantAnswer.remove({ activityId: activityId, participantId: req.user._id, questionId: questionId }, function(err){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													Models.ParticipantAnswer.create(answerData, function(err, answers1){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															Models.ParticipantPoints.create(pointsData, function(err, points){
																if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																else{
																	Models.ParticipantAnswer.find({ activityId: activityId, participantId: req.user._id, }).exec(function(err, participantAnswers){
																		if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																		else{
																			var qIds = [];
																			for (var i = 0; i < participantAnswers.length; i++){
																				qIds.push(participantAnswers[i].questionId);
																			};
																			Models.Question.findOne({ _id: { $in: qIds }, activityId: activity._id, status: true, }).sort({ sort: -1 }).exec(function(err, prevQuestion){
																				if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																				else{
																					var prevId = prevQuestion ? prevQuestion._id : null;
																					qIds.push(questionId);
																					Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
																						if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																						else{
																							if(nextQuestion){
																								req.app.get("io").to(req.user.moderatorId).emit('moderatorPoll');
																								return res.status(200).json({
																									status: true,
																									nextQuestionId: nextQuestion._id,
																									message: question.feedback,
																									prevId: prevId,
																									point: pointsData.point,
																									error: null,
																								});
																							}else{
																								Models.ParticipantActivityStatus.create({ participantId: req.user._id, activityId: activityId, status: 'completed' }, function(err){
																									if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																									else{
																										req.app.get("io").to(req.user.moderatorId).emit('moderatorPoll');
																										var message = 'Poll ' + req.__("Completed");
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
													participantId: req.user._id,
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
													participantId: req.user._id,
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
														participantId: req.user._id,
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
														answerData.push({ activityId: activity._id, participantId: req.user._id, questionId: questionId, optionId: answer1, status: answerStatus });
													};
													pointsData.point = (answers.length == correctAnswers.length) ? ((points.indexOf("incorrect") > -1) ? 0 : 1) : 0;
												};
											};
											Models.ParticipantPoints.remove({ activityId: activityId, participantId: req.user._id, questionId: questionId }, function(err){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													Models.ParticipantAnswer.remove({ activityId: activityId, participantId: req.user._id, questionId: questionId }, function(err){
														if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
														else{
															Models.ParticipantAnswer.create(answerData, function(err, answers1){
																if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																else{
																	Models.ParticipantPoints.create(pointsData, function(err, points){
																		if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																		else{
																			Models.ParticipantAnswer.find({ activityId: activityId, participantId: req.user._id, }).exec(function(err, participantAnswers){
																				if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																				else{
																					var qIds = [];
																					for (var i = 0; i < participantAnswers.length; i++){
																						qIds.push(participantAnswers[i].questionId);
																					};
																					if(activity.byParticipant && activity.random){
																						qIds.push(questionId);
																						Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
																							if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																							else{
																								if(nextQuestion){
																									req.app.get("io").to(req.user.moderatorId).emit('moderatorQuiz');
																									return res.status(200).json({
																										status: true,
																										nextQuestionId: nextQuestion._id,
																										message: question.feedback,
																										prevId: null,
																										point: pointsData.point,
																										error: null,
																									});
																								}else{
																									Models.ParticipantActivityStatus.create({ participantId: req.user._id, activityId: activityId, status: 'completed' }, function(err){
																										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																										else{
																											req.app.get("io").to(req.user.moderatorId).emit('moderatorQuiz');
																											var message = ((activity.type == 'quiz') ? 'Quiz' : 'Poll') + ' ' + req.__("Completed");
																											return res.status(200).json({
																												status: true,
																												nextQuestionId: null,
																												prevId: null,
																												point: pointsData.point,
																												message: message,
																												error: null,
																											});
																										}
																									});
																								}
																							}
																						});
																					}else{
																						Models.Question.findOne({ _id: { $in: qIds }, activityId: activity._id, status: true, }).sort({ sort: -1 }).exec(function(err, prevQuestion){
																							if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																							else{
																								var prevId = prevQuestion ? prevQuestion._id : null;
																								qIds.push(questionId);
																								Models.Question.findOne({ _id: { $nin: qIds }, activityId: activity._id, status: true, }).sort({ sort: 1 }).exec(function(err, nextQuestion){
																									if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																									else{
																										if(nextQuestion){
																											req.app.get("io").to(req.user.moderatorId).emit('moderatorQuiz');
																											return res.status(200).json({
																												status: true,
																												nextQuestionId: nextQuestion._id,
																												message: question.feedback,
																												prevId: prevId,
																												point: pointsData.point,
																												error: null,
																											});
																										}else{
																											Models.ParticipantActivityStatus.create({ participantId: req.user._id, activityId: activityId, status: 'completed' }, function(err){
																												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
																												else{
																													req.app.get("io").to(req.user.moderatorId).emit('moderatorQuiz');
																													var message = ((activity.type == 'quiz') ? 'Quiz' : 'Poll') + ' ' + req.__("Completed");
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
}); // Submit answer for question
Router.get('/activity/:activityId/:questionId', Authorization.requiresLogin, function(req, res, next){
	var activityId = req.params.activityId,
	questionId = req.params.questionId;	
	Models.ParticipantActivityStatus.findOne({ participantId: req.user._id, activityId: activityId, status: 'completed' }).exec(function(err, participantActivity){
		if(err || participantActivity){
			var errorMessage = err ? err.message : req.__("YouCompleted");
			return res.status(400).json({ status: false, message: null, error: errorMessage, });
		}else{
			Models.Activities.findOne({ _id: activityId, roomId: req.user.roomId, status: 1, }).exec(function(err, activity){
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
									Models.ParticipantAnswer.find({ participantId: req.user._id, questionId: question._id, activityId: activityId, }).exec(function(err, participantAnswer){
										if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
										else{
											Models.Options.find({ questionId: question._id, }).sort("_id").exec(function(err, options){
												if(err) return res.status(400).json({ status: false, message: null, error: err.message, });
												else{
													var answers = [];
													for (var i = 0; i < participantAnswer.length; i++){
														answers.push(participantAnswer[i].answer);
													};
													var qs = question.toObject();
													qs.options = options;
													qs.answers = (question.type == 'free' || question.type == 'blank') ? answers : participantAnswer;
													var canedit = (participantAnswer.length > 0) ? false : true;
													if(nextQuestion){
														Models.ParticipantAnswer.findOne({ participantId: req.user._id, questionId: nextQuestion._id }).exec(function(err, ans){
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
}); // get prev question
// View Poll Results
Router.get("/activity/:id/question/:questionId", Authorization.requiresLogin, function(req, res, next){
	var activityId = req.params.id, questionId = req.params.questionId;
	Models.Activities.findOne({ _id: activityId, moderatorId: req.user.moderatorId, type: "polls" }).exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : req.__("ActivityNotFound");
			return res.status(400).json({ status: false, error: errorMessage, });
		}else{
			Models.ParticipantActivityStatus.find({ activityId: activityId, status: 'completed' }).exec(function(err, activityStatus){
				if(err) return res.status(400).json({ status: false, error: err.message, });
				else if(activityStatus.length <= 0) return res.status(400).json({ status: false, message: req.__("NotFound"), activity: activity, participants: [], question: null, });
				else{
					Models.Question.findOne({ _id: questionId, moderatorId: req.user.moderatorId, activityId: activityId }).exec(function(err, question){
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
										Async.forEach(result, function(option, done){
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
												Async.forEach(options, function(option, done){
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
}); // View Activity Results
// Not Found route
Router.get("/*", Authorization.requiresLogin, function(req, res, next){
	return res.status(404).json({ status: false, error: req.__("NotFound"), });
});

module.exports = Router;