var LocalFunctions	=	{},
	querystring	=	require('querystring'),
	url 		=	require('url'),
	csvjson	=	require('csvjson'),
	lodash		=	require('lodash'),
	fs		=	require("fs"),
	gm		=	require('gm').subClass({ imageMagick: true }),
	moment	=	require('moment'),
	Validator	=	require('validatorjs'),
	Request	=	require("request"),
	Parser		=	require('xml2json'),
	js2xmlparser	=	require("js2xmlparser"),
	randomString	=	require('randomstring'),
	forEach	=	require('forEachAsync').forEachAsync,
	util		=	require('util'),
	MyStream	=	require('json2csv-stream-plus'),
	exec		=	require('child_process').exec,
	pdftohtml	=	require('pdftohtmljs'),
	Async		=	require("async"),
	Zip		=	require('node-7z'),
	glob		=	require("glob"),
	Mongoose 	=	require('mongoose'),
	path		=	require("path"),
	_		=	require("underscore"),
	Models		=	require("./models");

LocalFunctions.href	=	function(req){
	return function(prev, params){
		var query = lodash.clone(req.query);
		if(typeof query.page === 'undefined'){ query.page = 1; }
		if(typeof prev === 'object'){
			params = prev;
			prev = false;
		}else{
			prev = (typeof prev === 'boolean') ? prev : false;
			query.page = prev ? query.page-= 1 : query.page += 1;
			query.page = (query.page < 1) ? 1 : query.page;
		}
		// allow overriding querystring params
		// (useful for sorting and filtering)
		// another alias for `lodash.assign` is `lodash.extend`
		if(lodash.isObject(params)) query = lodash.assign(query, params);
		return url.parse(req.originalUrl).pathname + '?' + querystring.stringify(query);
	};
};
LocalFunctions.getArrayPages = function(req){
	return function(limit, pageCount, page){
		var maxPage = pageCount, limit = limit || 3; // limit default is 3
		if(limit > 0){
			var start = (page - limit) > 0 ? (page - limit) : 1,
			end = (page + limit) > maxPage ? maxPage : (page + limit),
			pages = [], href = LocalFunctions.href(req)();
			for (var i = start; i <= end; i++){
				var url = href.replace('page=' + (page + 1), 'page=' + i);
				pages.push({ number: i, url: url });
			}
			return pages;
		}
	};
};
LocalFunctions.withIndex = function(iterator){
	return function(value, index, callback){
		return iterator(value, index, callback);
	};
}
LocalFunctions.eachSeries = function(arr, iterator, callback){
	return Async.eachOfSeries(arr, LocalFunctions.withIndex(iterator), callback);
};
LocalFunctions.createFeed = function(req, type, description){
	Models.Feeds.create({ moderatorId: req.user.id, type: type, description: description, }); // create user feed
};
LocalFunctions.getBaseFolder = function(req, code, callback){
	if(req.params.folderId){
		Models.Folder.findOne({ _id: req.params.folderId, moderatorId: req.user._id, isRoot: false, }).exec(callback);
	}else{
		Models.Folder.findOrCreate({ moderatorId: req.user._id, isRoot: true, }, { moderatorId: req.user._id, name: code, isRoot: true, }, callback);
	}
};
LocalFunctions.GetQuizPolls = function(req, page, limit, type, activityId, callback){
	Models.Activities.findOne({ moderatorId: req.user._id, fileId: activityId, type: type, }).exec(function(err, activity){
		if(err || !activity){
			var errorMessage = err ? err.message : "Activity Not Found", status = err ? 400 : 404;
			return callback({ status: false, error: errorMessage, statusCode: status }, null);
		}else{
			Models.Question.paginate({ moderatorId: req.user._id, activityId: activity._id, }, { page: page, limit: limit, sort: { sort: 1 }, }).then(function(questions){
				var pages = LocalFunctions.getArrayPages(req)(10, questions.pages, page);
				return callback(null, { status: true, activity: activity, pages: pages, questions: questions.docs, limit: limit, currentPage: page, total: questions.total, });
			});
		}
	});
};
LocalFunctions.UpdateQuizPoll = function(activityId, req, res, next, type){
	var data = req.body,
	rules = {
		name: "required|min:2|max:25",
		// categoryId: "required",
	}, validation = new Validator(data, rules),
	code = randomString.generate({ capitalization: "uppercase", length: 6 });
	if(validation.fails()){
		var errors = validation.errors.all(),
		error = errors[Object.keys(errors)[0]][0];
		return res.status(400).json({ status: false, error: error, data: data, });
	}else{
		Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).exec(function(err, file){
			if(err || !file){
				var errorMessage = err ? err.message : "Activity Not Found", status = err ? 400 : 404;
				return res.status(status).json({ status: false, error: errorMessage, });
			}else{
				Models.Activities.findOne({ moderatorId: req.user._id, fileId: activityId, type: type, }).exec(function(err, activity){
					if(err || !activity){
						var errorMessage = err ? err.message : "Activity Not Found", status = err ? 400 : 404;
						return res.status(status).json({ status: false, error: errorMessage, });
					}else{
						file.name = data.name;
						activity.name = data.name;
						// activity.categoryId = data.categoryId;
						activity.categoryId = (data.categoryId) ? data.categoryId : undefined;
						file.save(function(err){
							if(err) return res.status(400).json({ status: false, error: err.message, });
							else{
								activity.save(function(err){
									if(err) return res.status(400).json({ status: false, error: err.message, });
									else{
										LocalFunctions.createFeed(req, 'activity_update', activity.name + ' Activity Updated Successfully.');
										return res.status(200).json({ status: true, message: "Updated Successfully", });
									}
								});
							}
						});
					}
				});
			}
		});
	}
};
LocalFunctions.DeleteQuizPoll = function(activityId, req, res, next, type){
	Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).exec(function(err, file){
		if(err || !file){
			var errorMessage = err ? err.message : "Activity Not Found", status = err ? 400 : 404;
			return res.status(status).json({ status: false, error: errorMessage, });
		}else{
			Models.Activities.findOne({ moderatorId: req.user._id, fileId: activityId, type: type, }).exec(function(err, activity){
				if(err || !activity){
					var errorMessage = err ? err.message : "Activity Not Found", status = err ? 400 : 404;
					return res.status(status).json({ status: false, error: errorMessage, });
				}else{
					file.remove(function(err){
						if(err) return res.status(status).json({ status: false, error: err.message, });
						else{
							var activityName = activity.name;
							activity.remove(function(err){
								if(err) return res.status(status).json({ status: false, error: err.message, });
								else{
									LocalFunctions.createFeed(req, 'activity_delete', activityName + ' Deleted Successfully.');
									return res.status(200).json({ status: true, message: "Activity Deleted Successfully", });
								}
							})
						}
					});
				}
			});
		}
	});
};
LocalFunctions.createReport = function(req, activity, callback){
	if(activity){
		var report = {
			moderatorId: req.user._id,
			activityId: activity._id,
			createdAt: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
		}, activityId = activity._id;
		report.reports = [];
		report.participants = [];
		Models.ParticipantPoints.aggregate([{ $match: { activityId: Mongoose.Types.ObjectId(activity._id), }, }, { $group: { _id: "$participantId", } }], function(err, participantPoints){
			if(err) return callback(err, null);
			else if(participantPoints.length <= 0) return callback(null, null);
			else{
				for (var i = 0; i < participantPoints.length; i++){
					report.participants.push({ participantId: participantPoints[i]._id, });
				}
				Models.ParticipantPoints.aggregate([{ $match: { activityId: Mongoose.Types.ObjectId(activity._id), }, }, { $group: { _id: "$questionId", point: { $first: "$point", }, } }], function(err, points){
					if(err) return callback(err, null);
					else if(points.length <= 0) return callback(null, null);
					else{
						forEach(points, function(Rnext, element, index, array){
							var questionId = element._id;
							Models.Question.findOne({ _id: questionId, moderatorId: req.user._id, activityId: activityId, }).exec(function(err, question){
								if(err || !question) Rnext();
								else{
									var condition = (question.type == 'free' || question.type == 'blank') ? '$answer' : '$optionId';
									Models.ParticipantAnswer.aggregate([{
										$match: {
											questionId: Mongoose.Types.ObjectId(questionId),
											activityId: Mongoose.Types.ObjectId(activityId),
										},
									}, {
										$group: { _id: condition, count: { $sum: 1, }, },
									}], function(err, result){
										if(err) Rnext();
										else{
											if(activity.type == 'polls'){
												if(question.type == 'free' || question.type == 'blank'){
													var correctAnswer = [], notAnswerd;
													Async.forEach(result, function(option, done){
														correctAnswer.push({ value: option._id, count: option.count, correct: element.point, });
														done(null);
													}, function(err){
														report.reports.push({ questionId: questionId, options: correctAnswer, });
														Rnext();
													});
												}else{
													Models.Options.find({ questionId: questionId, status: true }).sort("_id").exec(function(err, options){
														if(err) return res.status(400).json({ status: false, error: err.message, });
														else{
															var correctAnswer = [];
															Async.forEach(options, function(option, done){
																var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(option._id)),
																count = (arrId > -1) ? result[arrId].count : 0;
																correctAnswer.push({ value: option.value, count: count, correct: element.point, });
																done(null);
															}, function(err){
																var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(questionId));
																if(arrId > -1){
																	correctAnswer.push({ count: result[arrId].count, value: 'N/A', correct: 0, });
																}
																report.reports.push({ questionId: questionId, options: correctAnswer, });
																Rnext();
															});
														}
													});
												}
											}else{
												Models.QuestionAnswer.find({ questionId: questionId, }).exec(function(err, answers){
													if(err) return res.status(400).json({ status: false, error: err.message, });
													else{
														if(question.type == 'free' || question.type == 'blank'){
															var correctAnswer = [];
															Async.forEach(result, function(option, done){
																correctAnswer.push({ value: option._id, count: option.count, correct: element.point, });
																done(null);
															}, function(err){
																report.reports.push({ questionId: questionId, options: correctAnswer, });
																Rnext();
															});
														}else{
															Models.Options.find({ questionId: questionId, status: true }).sort("_id").exec(function(err, options){
																if(err) return res.status(400).json({ status: false, error: err.message, });
																else{
																	var correctAnswer = [];
																	Async.forEach(options, function(option, done){
																		var arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(option._id)),
																		count = (arrId > -1) ? result[arrId].count : 0;
																		correctAnswer.push({ count: count, value: option.value, correct: element.point, });
																		done(null);
																	}, function(err){
																		var notAnswerd,
																		arrId = Object.keys(_.indexBy(result, '_id')).indexOf(String(questionId));
																		if(arrId > -1){
																			correctAnswer.push({ count: result[arrId].count, value: 'N/A', correct: 0, });
																		}
																		report.reports.push({ questionId: questionId, options: correctAnswer, });
																		Rnext();
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
						}).then(function(){
							Models.Report.create(report, function(err, report){
								if(err) return callback(err, null);
								else return callback(null, report);
							});
						});
					}
				});
			}
		});
	}else return callback(null, null);
};
LocalFunctions.PollResult = function(req, res, next, activity, moderatorId){
	var activityId = activity._id;
	Models.ParticipantActivityStatus.find({ activityId: activityId, status: 'completed' }).exec(function(err, activityStatus){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else if(activityStatus.length <= 0) return res.status(400).json({ status: false, message: req.__("NotFound"), activity: activity, participants: [], question: null, });
		else{
			Models.Question.findOne({ moderatorId: moderatorId, activityId: activityId }).exec(function(err, question){
				if(err || !question){
					var errorMessage = err ? err.message : req.__("QuestionNotFound");
					return res.status(404).json({ status: false, error: errorMessage, });
				}else{
					var question = question.toObject(),
					questionId = question._id,
					condition = (question.type == 'free' || question.type == 'blank') ? '$answer' : '$optionId';
					Models.ParticipantAnswer.aggregate([{
						$match:{
							questionId: Mongoose.Types.ObjectId(questionId),
							activityId: Mongoose.Types.ObjectId(activityId),
						},
					}, { $group: { _id: condition, count: { $sum: 1, }, } 
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
										result: true,
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
												result: true,
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
};
LocalFunctions.GetYouTubeVimeoID = function(url, callback){
	var youtube = /((http|https):\/\/)?(www\.)?(youtube\.com)(\/)?([a-zA-Z0-9\-\.]+)\/?/,
	vimeo = /((http|https):\/\/)?(www\.)?(vimeo\.com)(\/)?([a-zA-Z0-9\-\.]+)\/?/;
	if(youtube.test(url)){
		var ID = '',
		url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
		if(url[2] !== undefined){
			ID = url[2].split(/[^0-9a-z_\-]/i);
			ID = ID[0];
			var originalFilePath = 'http://img.youtube.com/vi/' + ID + '/1.jpg';
			return callback(null, { originalFilePath: originalFilePath, id: ID, vimeo: false, youtube: true, });
		}else return callback({ message: "Please Enter Valid URL", }, null);
	}else if(vimeo.test(url)){
		var Vimeo = "https://vimeo.com/api/oembed.json?url=" + url + "&width=200";
		Request(Vimeo, function(err, response, body){
			if(!err && response.statusCode == 200){
				var info = JSON.parse(body), originalFilePath = info.thumbnail_url;
				return callback(null, { originalFilePath: originalFilePath, id: info.video_id, vimeo: true, youtube: false, });
			}
		});
	}else return callback({ message: "Please Enter Valid URL", }, null);
};
LocalFunctions.generateHtml = function(filetype, filename, originalFilename, callback){
	if(filetype == 'image' || filetype == 'video') return callback(null, 'Image does not have html.' );
	else{
		var file = path.basename(filename),
		originalFile = file.replace(path.extname(file), ""),
		upload = path.join(__dirname, '/public/attachments/' + originalFile + '/');
		if(!fs.existsSync(upload)){ fs.mkdirSync(upload, 755); }; // create upload path if not exists
		if(filetype == "pdf"){
			var converter = new pdftohtml(filename, "public/attachments/" + originalFile + '/' + originalFile + ".html");
			converter.convert();
			converter.success(function(){
				return callback(null, 'html of ' + originalFile + '.html has been successfully generated.' );
			}).error(function(err){
				return callback(err, null);
			});
		}else if(filetype == "doc" || filetype == "ppt"){
			exec('unoconv -f html -o public/attachments/' + originalFile + '/' + originalFile + '.html ' + filename, function(err, stdout, stderr){
				if(err) return callback(err, null);
				else return callback(null, 'html of ' + filename + ' has been successfully generated.' );
			});
		}else{
			var myTask = new Zip();
			myTask.extractFull(filename, upload).then(function() {
				var file1 = path.parse(originalFilename).name + ".pptx",
				file2 = path.parse(originalFilename).name + ".ppt";
				if(fs.existsSync(path.join(upload + file1)) || fs.existsSync(path.join(upload + file2))){
					glob("**/index.html", { cwd: upload, }, function(err, files){
						exec('sudo chmod 755 -R ' + upload);
						if(err) callback(err, null);
						else if(files.length > 0) callback(null, { directory: files[0], });
						else callback({ message: "File structure not Accepted.Please select valid file", }, null);
					});
				}else callback({ message: "File structure not Accepted.Please select valid file", }, null);
				// return callback(null, 'html of ' + filename + ' has been successfully generated.' );
			}).catch(function (err) {
				return callback(err, null);
			});
		}
	}
};
LocalFunctions.getOptions = function(question, callback){
	if(question.random){
		var columns = ['_id', '-_id', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'value', '-value'];
		var column = columns[Math.floor(Math.random() * columns.length)];
		Models.Options.find({ questionId: question._id, status: true, }).sort(column).exec(callback);
	}else Models.Options.find({ questionId: question._id, status: true, }).sort('_id').exec(callback);
};
LocalFunctions.emitEvent = function(req, event){
	Models.Rooms.findOne({ moderatorId: req.user._id }).exec(function(err, room){
		if(!err && room) req.app.get("io").to(room.code).emit(event);
	});
};
LocalFunctions.getRootFolders = function(req, activity, callback){
	Models.File.findOne({ _id: activity.fileId, moderatorId: req.user._id, }).populate("folderId").exec(function(err, folder){
		if(!err && folder){
			if(folder.folderId.isRoot) return callback(null, []);
			else untilIsRoot(folder, req, [folder.folderId._id], callback);
		}else return callback(err, folder);
	});
};
LocalFunctions.getExportQuestions = function(req, activity, callback){
	Models.Question.find({ moderatorId: req.user._id, activityId: activity._id, }).populate("media").sort('sort').exec(function(err, questions){
		if(err) return callback(err, []);
		else{
			Async.parallel({
				options: function(callback){ Models.Options.find().exec(callback); },
				answers: function(callback){ Models.QuestionAnswer.find().exec(callback); },
			}, function(err, results){
				if(err) return callback(err, []);
				else{
					var newQuestions = [], newMedias = [];
					forEach(questions, function(Rnext, element, index, array){
						var question = { id: element._id, timeLimit: element.timelimit, 
							sort: element.sort, name: element.name, 
							feedback: element.feedback, type: element.type,
							parentextId: element.activityId,
						};
						var media = {};
						if(element.media){
							media = { title: element.media.title, type: element.media.type, fileType: element.media.fileType, };
							if(element.media.type == 'url'){
								media.url = element.media.url;
								// media.path = element.media.path;
							}else{
								media.file = element.media.file;
								newMedias.push({ file: element.media.path });
								// media.path = element.media.path;
								// media.docpath = element.media.docpath;
							}
						}
						if(element.type == 'free' || element.type == 'blank'){
							var newAnswers = [];
							for (var i = 0; i < results.answers.length; i++){
								if(String(element._id) == String(results.answers[i].questionId)){
									newAnswers.push({ '@': { iscorrect: 1, name: results.answers[i].answer, questionId: element._id, }, });
								}
							}
							newQuestions.push({ '@': question, simpleChoices:{ answer: newAnswers, }, media: { '@': media }, });
							Rnext();
						}else{
							var newAnswers = [];
							Async.forEach(results.options, function(option, done){
								if(String(element._id) == String(option.questionId)){
									var iscorrect = 0;
									loop: for (var i = 0; i < results.answers.length; i++){
										if(String(results.answers[i].optionId) == String(option._id) && String(element._id) == String(results.answers[i].questionId)) {
											iscorrect = 1;
											break loop;
										}
									};
									newAnswers.push({ '@': { iscorrect: iscorrect, name: option.value, questionId: element._id, }, });
								}
								done(null);
							}, function(err){
								newQuestions.push({ '@': question, simpleChoices:{ answer: newAnswers, }, media: { '@': media }, });
								Rnext();
							});
						}
					}).then(function(){
						return callback(null, { newQuestions: newQuestions, newMedias: newMedias, });
					});
				}
			});
		}
	});
};
LocalFunctions.getExportReports = function(req, activity, callback){
	Models.Report.find({ moderatorId: req.user._id, activityId: activity._id, }).populate("reports.questionId").exec(function(err, reports){
		if(err) return callback(err, []);
		else{
			var newReports = [];
			forEach(reports, function(Rnext, element, index, array){
				var questions = [];
				forEach(element.reports, function(Qnext, element, index, array){
					var options = [];
					for (var i = 0; i < element.options.length; i++){
						options.push({ '@': { value: element.options[i].value, count: element.options[i].count, }, });
					}
					questions.push({ '@': { name: element.questionId.name, }, answers: options, });
					Qnext();
				}).then(function(){
					newReports.push({ '@': { activityId: element.activityId }, questions: questions, });
					Rnext();
				});
			}).then(function(){
				return callback(null, newReports);
			});
		}
	});
};
// 
LocalFunctions.xmlExport = function(activityId, type, fileType, activity, req, res, next){
	Async.parallel({
		activityfile: function(callback){
			Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).populate("folderId").exec(callback);
		},
		folders: function(callback){
			LocalFunctions.getRootFolders(req, activity, callback);
		},
		questions: function(callback){
			LocalFunctions.getExportQuestions(req, activity, callback);
		},
		reports: function(callback){
			LocalFunctions.getExportReports(req, activity, callback);
		},
	}, function(err, results){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			if(fileType == 'xml'){
				var data = {
					qfolders:{ qfolder: JSON.parse(JSON.stringify(results.folders)), },
					activity: { '@': { name: activity.name, id: activity._id, parentextId: results.activityfile.folderId.fileId, }, },
					questions: { question: JSON.parse(JSON.stringify(results.questions.newQuestions)), },
					assessments: {
						assessment: JSON.parse(JSON.stringify(results.reports)),
					},
				};
				var xml = js2xmlparser("qef", data);
				return res.status(200).json({ status: true, message: "Completed", data: xml, });
				/*var xml = js2xmlparser("qef", data),
				upload = path.join(__dirname, '../public/xml/'),
				fileName = moment().format("YYYYMMDDHHmmssSS-[qef.xml]");
				if(!fs.existsSync(upload)){ fs.mkdirSync(upload, 755); }; // create upload path if not exists
				exec('sudo chmod 755 -R ' + upload);
				fs.writeFile(upload + fileName, xml, function(err){
					if(err){
						return res.status(400).json({ status: false, error: err.message, });
					}else{
						return res.status(200).json({ status: true, message: "Completed", data: xml, });
					}
				});*/
			}else if(fileType == 'qef'){
				var data = {
					qfolders:{ qfolder: JSON.parse(JSON.stringify(results.folders)), },
					activity: { '@': { name: activity.name, id: activity._id, parentextId: results.activityfile.folderId.fileId, }, },
					questions: { question: JSON.parse(JSON.stringify(results.questions.newQuestions)), },
					assessments: {
						assessment: JSON.parse(JSON.stringify(results.reports)),
					},
				};
				var xml = js2xmlparser("qef", data);
				return res.status(200).json({ status: true, message: "Completed", data: xml, });
			}
		}
	});
};
LocalFunctions.csvExport = function(activityId, type, fileType, activity, req, res, next){
	var data = [], upload = path.join(__dirname, '/public/json/'),
	parser = new MyStream({ del: ';' });
	if (!fs.existsSync(upload)){ fs.mkdirSync(upload, 755); }; // create upload path if not exists
	exec('sudo chmod 755 -R ' + upload);
	Async.parallel({
		activityfile: function(callback){
			Models.File.findOne({ _id: activityId, moderatorId: req.user._id, type: type, }).populate("folderId").exec(callback);
		},
		OptionCount: function(callback){
			Models.Options.aggregate([{ $group: { _id: '$questionId', count: { $sum: 1, }, } }, { $sort: { count: -1, } }], callback);
		},
		AnswerCount: function(callback){
			Models.QuestionAnswer.aggregate([{ $group: { _id: '$questionId', count: { $sum: 1, }, } }, { $sort: { count: -1, } }], callback);
		},
		questions: function(callback){
			Models.Question.find({ moderatorId: req.user._id, activityId: activity._id, }).populate("media").sort('sort').exec(callback);
		},
		options: function(callback){ Models.Options.find().exec(callback); },
		answers: function(callback){ Models.QuestionAnswer.find().exec(callback); },
	}, function(err, results){
		if(err) return res.status(400).json({ status: false, error: err.message, });
		else{
			var maxOption = (results.OptionCount.length > 0) ? results.OptionCount[0].count : 4,
			maxAnswer = (results.AnswerCount.length > 0) ? results.AnswerCount[0].count : 3;
			forEach(results.questions, function(Qnext, question, Qindex, Qarray){
				var optionCount = 1, answerCount = 1, object = {
					name: question.name,
					type: question.type,
					feedback: question.feedback,
					id: question._id,
					timeLimit: question.timelimit,
					sort: question.sort,
					parentextId: (results.activityfile.folderId.fileId) ? results.activityfile.folderId.fileId : 0,
					parentextName: results.activityfile.name,
				};
				for(var i = 1; i <= maxOption; i++){ object['option#' + i] = 'null'; };
				for(var i = 1; i <= maxAnswer; i++){ object['answer#' + i] = 'null'; };
				if(question.type == 'free' || question.type == 'blank'){
					forEach(results.answers, function(Anext, answer, Aindex, Aarray){
						if(String(answer.questionId) == String(question._id)){
							object['answer#1'] = answer.answer;
						}
						Anext();
					}).then(function(){
						jsonObject = JSON.stringify(object);
						data.push(jsonObject);
						Qnext();
					});
				}else{
					forEach(results.options, function(Onext, option, Oindex, Oarray){
						if(String(option.questionId) == String(question._id)){
							object['option#' + optionCount] = option.value;
							optionCount++;
							forEach(results.answers, function(Anext, answer, Aindex, Aarray){
								if(String(answer.questionId) == String(question._id) && String(answer.optionId) == String(option._id)){
									object['answer#' + answerCount] = option.value;
									answerCount++;
								}
								Anext();
							}).then(function(){
								Onext();
							});
						}else Onext();
					}).then(function(){
						jsonObject = JSON.stringify(object);
						data.push(jsonObject);
						Qnext();
					});
				}
			}).then(function(){
				var jsonFile = upload + moment().format("[questions-]YYYYMMDDHHmmssSS[.json]"),
				csvFile = upload + moment().format("[questions-]YYYYMMDDHHmmssSS[.csv]");
				fs.writeFile(jsonFile, data, function(err){
					if(err) return res.status(400).json({ status: false, error: err.message, });
					else{
						fs.createReadStream(jsonFile).pipe(parser).pipe(fs.createWriteStream(csvFile));
						parser.on('end', function(data){
							fs.unlink(jsonFile);
							var csvFile1 = csvFile.replace(path.join(__dirname, '/public'), "");
							return res.status(200).json({ status: true, file: csvFile1, });
							/*fs.unlink(csvFile);
							return res.download(csvFile, 'questions.csv');*/
						});
					}
				});
			});
		}
	});
};
LocalFunctions.mkDirNotExists = function(array){
	_.each(array, function(item, index){
		if(!fs.existsSync(item)){ fs.mkdirSync(item, 755); }; // create path if not exists
		exec('sudo chmod 755 -R ' + item);
	});
};
LocalFunctions.unlinkFiles = function(array){
	_.each(array, function(item, index){
		if(fs.existsSync(item)){
			if(fs.lstatSync(item).isDirectory()) exec('rm -rf ' + item);
			else fs.unlinkSync(item);
		}; // delete path if exists
	});
};
LocalFunctions.CreateImportQuestion = function(questionData, answer, options, callback){
	Models.Question.create(questionData, function(err, question){
		if(err) callback(err);
		else if(question.type == 'free' || question.type == 'blank'){
			forEach(answer, function(Rnext, element, index, array){
				if(element != null && element != false){
					Models.QuestionAnswer.count({ questionId: question._id }, function(err, count){
						if(!err && count <= 0){
							Models.QuestionAnswer.create({ questionId: question._id, answer: element }, function(err, questionanswer){
								Rnext();
							});
						}else Rnext();
					});
				}else Rnext(); 
			}).then(function(){ callback(null, question); });
		}else{
			forEach(options, function(nextOption, element, index, array){
				if(element != 'null' && element != null){
					Models.Options.create({ questionId: question._id, value: element, status: 1, sort: 1 }, function(err, option){
						if(err) nextOption();
						else{
							forEach(answer, function(nextAnswer, Avalue, index, array){
								if(Avalue == element  && (Avalue != 'null' && Avalue != null)){
									if(question.type == 'single' || question.type == "truefalse"){
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
							}).then(function(){ nextOption(); });
						}
					});
				}else nextOption();
			}).then(function(){ callback(null, question); 	});
		}
	});
};
LocalFunctions.CreateImportMedia = function(req, folder, medias, unzipaef, upload, thumbnail, nextProperty){
	var attachments = [];
	forEach(medias, function(Rnext, media, index, array){
		var code = randomString.generate({ capitalization: "uppercase", length: 6 }),
		name = media.path.replace(/\/$/, "");
		Models.File.create({ folderId: folder._id, moderatorId: req.user._id, name: name, type: 'document', }, function(err, docfile){
			if(err) Rnext();
			else if(media.isURL == "true"){
				Async.waterfall([
					function(callback){ LocalFunctions.GetYouTubeVimeoID(media.url, function(err, video){ callback(err, video) }); },
					function(video, callback){
						var fileName = moment().format("YYYYMMDDHHmmssSS-") + video.id + '.jpg',
						filePath = upload + fileName;
						Request(video.originalFilePath).pipe(fs.createWriteStream(filePath));
						Models.Attachment.create({ moderatorId: req.user._id, fileId: docfile._id, type: 'url', file: fileName, title: name, url: media.url, fileType: 'url' }, callback);
					},
				], function(err, attachment){
					if(err) docfile.remove();
					else attachments.push({ attachment: attachment._id });
					Rnext();
				});
			}else{
				var mediaFile = unzipaef + media.name,
				originalFilename = media.name.replace(/ /g,''),
				originalExtension = path.extname(originalFilename),
				extension = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.png', '.zip', '.mp4', '.mkv', '.flv'],
				fileName = moment().format("YYYYMMDDHHmmssSS-") + originalFilename,
				filePath = upload + fileName,
				/*fileType = (['.jpg', '.png'].indexOf(originalExtension) > -1) ? 'image' : ((['.doc', '.docx'].indexOf(originalExtension) > -1) ? 'doc' : ((['.ppt', '.pptx'].indexOf(originalExtension) > -1) ? 'ppt' : ((['.pdf'].indexOf(originalExtension) > -1) ? 'pdf' : 'zip')));*/
				fileType = (['.jpg', '.png'].indexOf(originalExtension) > -1) ? 'image' : ((['.doc', '.docx'].indexOf(originalExtension) > -1) ? 'doc' : ((['.ppt', '.pptx'].indexOf(originalExtension) > -1) ? 'ppt' : ((['.pdf'].indexOf(originalExtension) > -1) ? 'pdf' : ((['.zip'].indexOf(originalExtension) > -1) ? 'zip' : 'video'))));
				if(extension.indexOf(originalExtension) != -1){
					Async.waterfall([
						function(callback){ fs.readFile(mediaFile, function(err, fileData){ callback(err, fileData) }); },
						function(fileData, callback){ fs.writeFile(filePath, fileData, callback); },
						function(callback){
							if(fileType == 'image'){ gm(filePath).resize(200, 150, '!').write(thumbnail + fileName, function(err){}); }
							LocalFunctions.generateHtml(fileType, filePath, originalFilename, callback);
						},
						function(message, callback){
							var attachmentData = { moderatorId: req.user._id, 
								fileId: docfile._id, type: 'file', title: name, 
								file: fileName, fileType: fileType, };
							if(fileType == 'zip') attachmentData.directory = message.directory;
							Models.Attachment.create(attachmentData, callback);
						},
					], function(err, attachment){
						if(err) docfile.remove();
						else attachments.push({ attachment: attachment._id });
						Rnext();
					});
				}else{
					docfile.remove();
					Rnext(); 
				}
			}
		});
	}).then(function(){ nextProperty(null, attachments); });
};
// Sort/Order Questions
LocalFunctions.SortQuestion = function(req, questionId, fromPosition, toPosition, callback){
	Async.waterfall([
		function(callback){
			Models.Question.findOne({ _id: questionId, sort: fromPosition, moderatorId: req.user._id, }).exec(callback);
		},
		function(question, cb){
			if(!question) cb({ message: req.__("QuestionNotFound"), });
			else{
				Models.Question.findOne({ moderatorId: req.user._id, activityId: question.activityId, sort: toPosition }).exec(function(err, toQuestion){
					if(!toQuestion) cb({ message: req.__("QuestionNotFound"), });
					else cb(err, question, toQuestion);
				});
			}
		},
		function(question, toQuestion, cb){
			toQuestion.sort = fromPosition;
			toQuestion.active = false;
			toQuestion.save(function(err){ cb(err, question, toQuestion); });
		},
		function(question, toQuestion, cb){
			question.sort = toPosition;
			question.active = (toPosition == 1) ? true : false;
			question.save(function(err){ cb(err, question, toQuestion); });
		},
	], callback);
};

module.exports = LocalFunctions;

var untilIsRoot = function(folder, req, Ids, callback){
	Models.File.findOne({ _id: folder.folderId.fileId, moderatorId: req.user._id, }).populate("folderId").exec(function(err, folder){
		if(err && !folder) return callback(err, null);
		else if(folder){
			Ids.push(folder.folderId._id);
			if(folder && !folder.folderId.isRoot) untilIsRoot(folder, req, Ids, callback);
			else{
				Models.File.find({ folderId: { $in: Ids, }, moderatorId: req.user._id, type: 'folder', }).populate("folderId").exec(function(err, folders){
					if(err) return callback(err, null);
					else if(folders.length <= 0) return callback(null, []);
					else{
						var newFolders = [];
						var path = 'Root';
						for (var i = 0; i < folders.length; i++){
							var folder = {};
							path = path + ' > ' + folders[i].name;
							folder.id = folders[i]._id;
							folder.name = folders[i].name;
							folder.parentextId = (folders[i].folderId.isRoot) ? 0 : folders[i].folderId.fileId;
							folder.fullpath = path;
							folder.description = folders[i].description;
							newFolders.push({ '@': folder, });
						};
						return callback(null, newFolders);
					}
				});
			}
		}
	});
};