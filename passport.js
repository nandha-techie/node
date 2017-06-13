var	passport 		=	require('passport'),
	lodash			=	require('lodash'),
	LocalStrategy		=	require('passport-local').Strategy,
	RememberMe		=	require("passport-remember-me").Strategy,
	Models			=	require('./models'),
	utils			=	require("./utils");

	// Serialize sessions
	passport.serializeUser(function(user, done){
		done(null, user);
	});
	
	// Deserialize sessions
	passport.deserializeUser(function(data, done){
		if(data.isAdmin){
			serializeUser(Models.Admin, data, done);
		}else if(data.isModerator){
			serializeUser(Models.Moderator, data, done);
		}else{
			serializeUser(Models.Participant, data, done);
		}
	});

	// Participant Login with ajax
	passport.use("ParticipantAjax", new LocalStrategy({ usernameField: 'email', passwordField: 'password', passReqToCallback: true, }, function(req, email, password, done){
		var roomCode = req.body.roomCode.toUpperCase();
		var email = req.body.email.toLowerCase();
		Models.Rooms.findOne({ code: roomCode }).exec(function(err, room){
			if(err){
				return done(err);
			}else if(!room){
				return done(null, false, { message: 'Unknown Room' });
			}else{
				Models.Participant.findOne({ email: email, roomId: room._id, status: true }).exec(function(err, participant){
					if(err){
						return done(err);
					}else if(!participant){
						return done(null, false, { message: 'Unknown Participant' });
					}else{
						console.log('LoginAjax (Participant) : { id: ' + participant._id + ', email: ' + participant.email + ' }');
						return done(null, participant);
					}
				});
			}
		});
	}));

	passport.use("loginByEmail", new LocalStrategy({ usernameField: 'email', passwordField: 'password', passReqToCallback: true, }, function(req, email, password, done){
		var email = req.body.email.toLowerCase(),
		roomCode = req.params.roomCode.toUpperCase();
		Models.Rooms.findOne({ code: roomCode }).exec(function(err, room){
			if(err){
				return done(err);
			}else if(!room){
				return done(null, false, { message: 'Unknown Room' });
			}else{
				Models.Participant.findOne({ email: email, roomId: room._id, status: true }).exec(function(err, participant){
					if(err){
						return done(err);
					}else if(!participant){
						return done(null, false, { message: 'Unknown Participant' });
					}else{
						console.log('LoginAjax (Participant) : { id: ' + participant._id + ', email: ' + participant.email + ' }');
						return done(null, participant);
					}
				});
			}
		});
	}));
	passport.use("loginByPin", new LocalStrategy({ usernameField: 'email', passwordField: 'pin', passReqToCallback: true, }, function(req, email, pin, done){
		var email = req.body.email.toLowerCase(),
		roomCode = req.params.roomCode.toUpperCase();
		Models.Rooms.findOne({ code: roomCode, }).exec(function(err, room){
			if(err){
				return done(err);
			}else if(!room){
				return done(null, false, { message: 'Unknown Room' });
			}else{
				Models.Participant.findOne({ email: email, roomId: room._id, status: true, }).exec(function(err, participant){
					if(err){
						return done(err);
					}else if(!participant){
						return done(null, false, { message: 'Unknown Participant' });
					}else{
						room.comparePin(pin, function(err, isMatch){
							if(err){
								return done(err);
							}else if(isMatch){
								console.log('LoginAjax (Participant) : { id: ' + participant._id + ', email: ' + participant.email + ' }');
								return done(null, participant);
							}else{
								return done(null, false, { message: 'Invalid Pin' });
							}
						});
					}
				});
			}
		});
	}));
	passport.use("loginByPassword", new LocalStrategy({ usernameField: 'email', passwordField: 'password', passReqToCallback: true, }, function(req, email, password, done){
		var email = req.body.email.toLowerCase(),
		roomCode = req.params.roomCode.toUpperCase();
		Models.Rooms.findOne({ code: roomCode }).exec(function(err, room){
			if(err){
				return done(err);
			}else if(!room){
				return done(null, false, { message: 'Unknown Room' });
			}else{
				Models.Participant.findOne({ email: email, roomId: room._id, status: true, }).exec(function(err, participant){
					if(err){
						return done(err);
					}else if(!participant){
						return done(null, false, { message: 'Unknown Participant' });
					}else{
						participant.comparePassword(password, function(err, isMatch){
							if(err){
								return done(err);
							}else if(isMatch){
								console.log('LoginAjax (Participant) : { id: ' + participant._id + ', email: ' + participant.email + ' }');
								return done(null, participant);
							}else{
								return done(null, false, { message: 'Invalid password' });
							}
						});
					}
				});
			}
		});
	}));

	// admin Login
	passport.use('admin', new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, function(email, password, done){
		Models.Admin.findOne({ email: email }).exec(function(err, admin){
			if(err){
				return done(err);
			}else if(!admin){
				return done(null, false, { message: 'Unknown user' });
			}else{
				admin.comparePassword(password, function(err, isMatch){
					if(err){
						return done(err);
					}else if(isMatch){
						console.log('Login (local) : { id: ' + admin._id + ', email: ' + admin.email + ' }');
						return done(null, admin);
					}else{
						return done(null, false, { message: 'Invalid password' });
					}
				});
			}
		});
	}));

	// Moderator Login with ajax(email)
	passport.use("ModeratorAjax", new LocalStrategy({ usernameField: 'email', passwordField: 'password', passReqToCallback: true, }, function(req, email, password, done){
		var email = req.body.email.toLowerCase();
		Models.Moderator.findOne({ email: email }).exec(function(err, moderator){
			if(err){
				return done(err);
			}else if(!moderator){
				return done(null, false, { message: 'Unknown user' });
			}else{
				moderator.comparePassword(password, function(err, isMatch){
					if(err){
						return done(err);
					}else if(isMatch){
						console.log('Login (local) : { id: ' + moderator._id + ', username: ' + moderator.username + ' }');
						return done(null, moderator);
					}else{
						return done(null, false, { message: 'Invalid password' });
					}
				});
			}
		});
	}));

	passport.use(new RememberMe(function(token, done){
		Token.consume(token, function(err, user){
			if(err){ return done(err); }
			if(!user){ return done(null, false); }
			return done(null, user);
		});
	}, function(user, done){
		var token = utils.generateToken(64);
		Token.save(token, { userId: user.id }, function(err){
			if(err){ return done(err); }
			return done(null, token);
		});
	}));

module.exports = passport;


var serializeUser =  function(model, data, done){
	model.findOne({ _id: data._id }).exec(function(err, user){
		if(err){
			return done(err, null);
		}else if(!user){
			return done(null, false);
		}else{
			if(data.locked){ user.set('locked', true, { strict: false, }); }
			return done(null, user);
		}
	});	
};