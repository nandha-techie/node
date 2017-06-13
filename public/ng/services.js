'use strict';
angular.module('myApp')
// 
.factory("FolderFactory", function(){
	return {};
})
// 
.factory("ActivityFactory", function(){
	return {};
})
// 
.filter('decimalFormat2', function(){
	return function(text){
		if(Number(text) === text && parseFloat(text) % 1 === 0){
			return parseInt(text);
		}else{
			return parseFloat(text).toFixed(2).replace(/0+$/, '');
		}
	};
})
// 
.filter('decimalFormat', function(){
	return function(text){
		if(Number(text) === text && parseFloat(text) % 1 === 0){
			return parseInt(text);
		}else{
			return parseFloat(text).toFixed(0).replace(/0+$/, '');
		}
	};
})
// 
.factory("Socket", function(){
	return io.connect(window.location.origin, { reconnect: true, });
})
// 
.factory("SocketService", function($rootScope, Socket){
	return {
		addUser: function(user){
			Socket.on('connect', function(){
				Socket.emit('adduser', user, user._id);
			});
		},
	};
})
// Moderator Service
.factory('ModeratorService', function($http){
	return {
		getInfo: function(callback){
			return $http.get(window.location.origin + '/moderator/profile?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		updateInfo: function(data){
			return $http.post(window.location.origin + '/moderator/profile', data);
		},
		postChangePwd: function(data){
			return $http.post(window.location.origin + '/moderator/changepwd', data);
		},
	};
})
// Authentication Sericve
.factory('AuthService', function($http){
	return {
		login: function(data){
			return $http.post(window.location.origin + '/moderator/login', data);
		},
		logout: function(){
			return $http.get(window.location.origin + '/moderator/logout');
		},
		forgetPassword: function(data){
			return $http.post(window.location.origin + '/moderator/forgotpasswd', data);
		},
		register: function(data){
			return $http.post(window.location.origin + '/moderator/register', data);
		}
	};
})
// Dashboard Sericve
.factory('DashboardService', function($http){
	return {
		getData: function(){
			return $http.get(window.location.origin + '/moderator/dashboard?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getVersion: function(){
			return $http.get(window.location.origin + '/version?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		exportReport: function(){
			return $http.post(window.location.origin + '/moderator/reports/export?' + moment().format("YYYYMMDDHHmmssSS"));
		},
	};
})

// Alert Messages Sericve
.factory('AlertService', function(){
	var displayNoty = function(message, type, layout, timeout){
		$.noty.closeAll();
		noty({ text: message, type: type, layout: layout, timeout: timeout, });
	};
	return {
		displayNoty: function(message, type, layout, timeout){
			displayNoty(message, type, layout, timeout);
		},
		success: function(message){
			displayNoty(message, 'success', 'topRight', 5000);
		},
		error: function(message){
			displayNoty(message, 'error', 'topRight', 5000);
		},
		info: function(message){
			displayNoty(message, 'information', 'topRight', 5000);
		},
		progressInfo: function(message){
			displayNoty(message, 'information', 'topRight', 5000);
		},
		warning: function(message){
			displayNoty(message, 'warning', 'topRight', 5000);
		},
	};
})
// Reset Password Sericve
.factory('ResetPwdService', function($http){
	return {
		getInfo: function(token){
			return $http.get(window.location.origin + '/moderator/resetpasswd/' + token + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		postInfo: function(token, data){
			return $http.post(window.location.origin + '/moderator/resetpasswd/' + token, data);
		},
	};
})
// Participant Management Sericve
.factory('ParticipantService', function($http){
	return {
		FindAll: function(page, limit, search){
			var page = page || 1, limit = limit || 5, search = search || '';
			return $http.get(window.location.origin + '/moderator/participants?page=' + page + '&limit=' + limit + '&search=' + search + '&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Create: function(participant){
			return $http.post(window.location.origin + '/moderator/participants', participant);
		},
		FindByID: function(id){
			return $http.get(window.location.origin + '/moderator/participant/' + id + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Update: function(id, participant){
			return $http.post(window.location.origin + '/moderator/participant/' + id, participant);
		},
		Delete: function(id){
			return $http.delete(window.location.origin + '/moderator/participant/' + id);
		},
		Ban: function(id){
			return $http.post(window.location.origin + '/moderator/participant/' + id + '/ban');
		},
		Permit: function(id){
			return $http.post(window.location.origin + '/moderator/participant/' + id + '/permit');
		},
		Invite: function(id){
			return $http.post(window.location.origin + '/moderator/participants/' + id + '/invite');
		},
	};
})
// Category Management Sericve
.factory('CategoryServeice', function($http){
	return {
		FindAll: function(page){
			var page = page || 1;
			return $http.get(window.location.origin + '/moderator/categories?page=' + page + '&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Find: function(){
			return $http.get(window.location.origin + '/moderator/categories/all?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Create: function(category){
			return $http.post(window.location.origin + '/moderator/categories', category);
		},
		FindByID: function(id){
			return $http.get(window.location.origin + '/moderator/category/' + id + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Update: function(id, category){
			return $http.post(window.location.origin + '/moderator/category/' + id, category);
		},
		Delete: function(id){
			return $http.delete(window.location.origin + '/moderator/category/' + id);
		},
	};
})
// Library Management Sericve
.factory('LibraryService', function($http, $upload){
	return {
		FindAll: function(){
			return $http.get(window.location.origin + '/moderator/library?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		createFolder: function(data){
			return $http.post(window.location.origin + '/moderator/library/folder/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createNestedFolder: function(folderId, data){
			return $http.post(window.location.origin + '/moderator/library/folder/' + folderId + '/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		deleteFolder: function(folderId){
			return $http.delete(window.location.origin + '/moderator/library/folder/' + folderId);
		},
		getFolder: function(folderId){
			return $http.get(window.location.origin + '/moderator/library/folder/' + folderId + '/view?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getEditFolder: function(folderId){
			return $http.get(window.location.origin + '/moderator/library/folder/' + folderId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		postEditFolder: function(folderId, data){
			return $http.post(window.location.origin + '/moderator/library/folder/' + folderId + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createAttachment: function(data, file){
			return $upload.upload({ url: window.location.origin + '/moderator/library/attachment/new?' + moment().format("YYYYMMDDHHmmssSS"), method: 'POST', data: data, file: file, });
		},
		deleteDocument: function(attachmentId){
			return $http.delete(window.location.origin + '/moderator/library/attachment/' + attachmentId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		deleteUrl: function(attachmentId){
			return $http.delete(window.location.origin + '/moderator/library/attachment/' + attachmentId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getAttachment: function(attachmentId){
			return $http.get(window.location.origin + '/moderator/library/attachment/' + attachmentId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		createNestedAttachment: function(folderId, data, file){
			return $upload.upload({ url: window.location.origin + '/moderator/library/attachment/' + folderId + '/new?' + moment().format("YYYYMMDDHHmmssSS"), method: 'POST', data: data, file: file, });
		},
		createQuiz: function(data){
			return $http.post(window.location.origin + '/moderator/library/quiz/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createNestedQuiz: function(folderId, data){
			return $http.post(window.location.origin + '/moderator/library/quiz/' + folderId + '/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		deleteQuiz: function(quizId){
			return $http.delete(window.location.origin + '/moderator/library/quiz/' + quizId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getQuiz: function(quizId, page){
			var page = page || 1;
			return $http.get(window.location.origin + '/moderator/library/quiz/' + quizId + '?' + moment().format("YYYYMMDDHHmmssSS") + '&page=' + page);
		},
		updateQuiz: function(quizId, data){
			return $http.post(window.location.origin + '/moderator/library/quiz/' + quizId + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createPoll: function(data){
			return $http.post(window.location.origin + '/moderator/library/polls/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createNestedPoll: function(folderId, data){
			return $http.post(window.location.origin + '/moderator/library/polls/' + folderId + '/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		deletePolls: function(pollId){
			return $http.delete(window.location.origin + '/moderator/library/polls/' + pollId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getPoll: function(pollId, page){
			var page = page || 1;
			return $http.get(window.location.origin + '/moderator/library/polls/' + pollId + '?' + moment().format("YYYYMMDDHHmmssSS") + '&page=' + page);
		},
		updatePoll: function(pollId, data){
			return $http.post(window.location.origin + '/moderator/library/polls/' + pollId + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		createPollQuestion: function(pollId, data){
			return $http.post(window.location.origin + '/moderator/library/polls/' + pollId + '/questions/new?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		editPollQuestion: function(pollId, questionId, data){
			return $http.post(window.location.origin + '/moderator/library/polls/' + pollId + '/questions/' + questionId + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		startActivity: function(type, id, data){
			return $http.post(window.location.origin + '/moderator/activities/' + type + '/' + id + '/start?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		stopActivity: function(type, id){
			return $http.post(window.location.origin + '/moderator/activities/' + type + '/' + id + '/stop?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		questionResult: function(id, qid){
			return $http.get(window.location.origin + '/moderator/activity/' + id + '/question/' + qid + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		FindActive: function(){
			return $http.get(window.location.origin + '/moderator/activities/active?&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		updatePollStatus: function(Id, data){
			return $http.post(window.location.origin + '/moderator/share/' + Id + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		updateQuestionStatus: function(Id, data){
			return $http.post(window.location.origin + '/moderator/question/share/' + Id + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		updateQuestion: function(Id){
			return $http.post(window.location.origin + '/moderator/question/' + Id + '/active?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Reports: function(page){
			var page = page || 1;
			return $http.get(window.location.origin + '/moderator/activities/reports?page=' + page + '&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		deleteParticipantActivityStatus: function(id){
			return $http.delete(window.location.origin + '/moderator/participants/activitystatus/' + id);
		},
		ActivitySummary: function(id){
			return $http.get(window.location.origin + '/moderator/activity/' + id + '/summary?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		ActivityQuestionSummary: function(id, questionId){
			return $http.get(window.location.origin + '/moderator/activity/' + id + '/summary/' + questionId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		getAttachments: function(){
			return $http.get(window.location.origin + '/moderator/library/attachments?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		reportSignature: function(reportId, data, file){
			return $upload.upload({ url: window.location.origin + '/moderator/report/' + reportId +  '/signature?' + moment().format("YYYYMMDDHHmmssSS"), method: 'POST', data: data, file: file, });
		},
		sortQuestion: function(questionId, toPosition, fromPosition){
			return $http.get(window.location.origin + '/moderator/question/' + questionId + '/' + toPosition + '/' + fromPosition + '/?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		orderQuestion: function(questionId, toPosition, fromPosition, page){
			return $http.get(window.location.origin + '/moderator/orderquestion/' + questionId + '/' + toPosition + '/' + fromPosition + '/' + page + '/?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		AddSensibleZone: function(imageId, data){
			return $http.post(window.location.origin + '/moderator/library/image/' + imageId + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
		exportQuizPoll: function(type, Id, fileType){
			return $http.post(window.location.origin + '/moderator/library/' + type + '/' + Id + '/export/' + fileType + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
	};
})
// 
.directive('updateLimit', function($parse, $location){
	return {
		require: 'ngModel',
		restrict: 'A',
		link: function(scope, el, attrs, ctrl){
			var limit = $location.search().limit ? $location.search().limit : '5';
			ctrl.$setViewValue(limit);
			ctrl.$render();
		},
	};
})
// 
.directive('updateSearch', function($parse, $location){
	return {
		require: 'ngModel',
		restrict: 'A',
		link: function(scope, el, attrs, ctrl){
			var search = ($location.search().search && typeof $location.search().search != "boolean") ? $location.search().search : '';
			ctrl.$setViewValue(search);
			ctrl.$render();
		},
	};
})
// 
.directive('fileType', function(){
	return{
		type : 'A',
		require: 'ngModel',
		link : function(scope, element, attrs, ngModel){
			$(element).checkboxpicker({
				style: false,
				defaultClass: 'btn-default',
				disabledCursor: 'not-allowed',
				onClass: 'btn-success',
				offClass: 'btn-primary',
				offActiveCls: 'btn-primary',
				onActiveCls: 'btn-success',
				onLabel: 'URL',
				offLabel: 'File',
				offTitle: false,
				onTitle: false,
			});
			$(element).change(function(){
				ngModel.$setViewValue($(element).is(":checked"));
				ngModel.$render();
			});
		}
	}
})
// 
.directive('urlInput', function(){
	return {
		require: '?ngModel',
		link: function(scope, element, attrs, ngModel){
			function allowSchemelessUrls(){
				var URL_REGEXP = /((http|https):\/\/)?(www\.)?(youtube\.com)(\/)|(vimeo\.com)(\/)?([a-zA-Z0-9\-\.]+)\/?/
				ngModel.$parsers.unshift(function(value){
					if (!URL_REGEXP.test(value) && URL_REGEXP.test('http://' + value)){
						return 'http://' + value;
					} else {
						return value;
					}
				});
				ngModel.$validators.url = function(value){
					return ngModel.$isEmpty(value) || URL_REGEXP.test(value);
				};
			}
			if (ngModel && attrs.type === 'url'){
				allowSchemelessUrls();
			}
		}
	};
})
// 
.directive('popover', function(){
	return {
		link: function(scope, element, attrs){
			$(element).popover({
				html : true,
				content : function(e){					
					return $(this).parent('.custom-popover').children('.popover-wrap').html();
				}
			});
			$('body').on('click', function(e){
				if ($(e.target).data('toggle') !== 'popover' && $(e.target).parents('.popover.in').length === 0){
					$('*').popover('hide');
				}
			});
		}
	};
})
// 
.directive('switch', function(){
	return{
		type : 'A',
		require: 'ngModel',
    		link : function(scope, element, attrs, ngModel){
			$(element).checkboxpicker({
				style: false,
				defaultClass: 'btn-default',
				disabledCursor: 'not-allowed',
				onClass: 'btn-success',
				offClass: 'btn-danger',
				onLabel: 'Correct',
				offLabel: 'Off',
				offTitle: false,
				onTitle: false,
			}).change(function(){
				if(scope.questionData.options[attrs.radioId]){
					if(scope.type == 'multiple'){
						scope.checkbox = $(element).is(":checked");
						$("#radio_" + attrs.radioId).prop('checked', $(element).is(":checked"));
						scope.toggleSelection(attrs.optionValue, $(element).is(":checked"));
					}else{
						$("input[name='answer']").prop('checked', false);
						if(!$(element).is(":checked")){
							for (var i = 0; i < attrs.optionLength; i++){
								if(i != parseInt(attrs.radioId)){
									$('#switch_' + i).prop('checked', true);
								}
							}
							$("#radio_" + attrs.radioId).prop('checked', true);
						}
						scope.toggleSelection1(attrs.optionValue, !$(element).is(":checked"));
					}
					ngModel.$setViewValue($(element).is(":checked"));
				}else{
					ngModel.$setViewValue(false);
					var value = (scope.type == 'multiple') ? false : true;
					$('#switch_' + attrs.radioId).prop('checked', value);
				}
			});
		},
	}
})
.directive('switchEdit', function(){
	return{
		type : 'A',
		require: 'ngModel',
    		link : function(scope, element, attrs, ngModel){
			$(element).checkboxpicker({
				style: false,
				defaultClass: 'btn-default',
				disabledCursor: 'not-allowed',
				onClass: 'btn-success',
				offClass: 'btn-danger',
				offLabel: 'Off',
				onLabel: 'Correct',
				offTitle: false,
				onTitle: false,
				reverse: false,
			}).change(function(){
				if(scope.questionData.options[attrs.radioId]){
					if(scope.questionData.type == 'multiple'){
						scope.checkbox = $(element).is(":checked");
						$("#radio_" + attrs.radioId).prop('checked', $(element).is(":checked"));
						scope.toggleSelection(attrs.optionValue, $(element).is(":checked"));
					}else{
						$("input[name='answer']").prop('checked', false);
						if(!$(element).is(":checked")){
							for (var i = 0; i < attrs.optionLength; i++){
								if(i != parseInt(attrs.radioId)){
									$('#switch_' + i).prop('checked', true);
								}
							}
							$("#radio_" + attrs.radioId).prop('checked', true);
						}
						scope.toggleSelection1(attrs.optionValue, !$(element).is(":checked"));
					}
					ngModel.$setViewValue($(element).is(":checked"));
				}else{
					ngModel.$setViewValue(false);
					var value = (scope.questionData.type == 'multiple') ? false : true;
					$('#switch_' + attrs.radioId).prop('checked', value);
				}
			});
		},
	}
})
// Question Management Sericve
.factory('QuestionService', function($http){
	return {
		getById: function(questionId){
			return $http.get(window.location.origin + '/moderator/library/questions/' + questionId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		Create: function(activityId, question){
			return $http.post(window.location.origin + '/moderator/library/questions/' + activityId + '/new?' + moment().format("YYYYMMDDHHmmssSS"), question);
		},
		Delete: function(id){
			return $http.delete(window.location.origin + '/moderator/library/questions/' + id);
		},
		Update: function(id, question){
			return $http.post(window.location.origin + '/moderator/library/questions/' + id, question);
		},
	};
})
// 
.directive('elemReady', function($parse){
	return {
		restrict: 'A',
		link: function($scope, elem, attrs){
			elem.ready(function(){
				// $scope.$apply(function(){
					var func = $parse(attrs.elemReady);
					func($scope);
				// })
			})
		}
	}
})
// 
.directive("chartArea", function(){
	return {
		restrict: "A",
		link: function($scope, element, attrs){
			var ctx = $(element)[0].getContext("2d");
			if(ctx){
				new Chart(ctx).Doughnut($scope.doughnutData, { responsive: true, });
			}
		},
	};
})
// 
.directive('sglclick', function($parse){
	return {
		restrict: 'A',
		link: function(scope, element, attr){
			var fn = $parse(attr['sglclick']);
			var delay = 300, clicks = 0, timer = null;
			element.on('click', function(event){
				clicks++;  //count clicks
				if(clicks === 1){
					timer = setTimeout(function(){
						scope.$apply(function(){
							fn(scope, { $event: event });
						}); 
						clicks = 0;             //after action performed, reset counter
					}, delay);
				}else{
					clearTimeout(timer);    //prevent single-click action
					clicks = 0;             //after action performed, reset counter
				}
			});
		}
	};
})
// addsensible
.directive('addsensible', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attr){
			scope.$watch('view', function(){
				if(scope.view){
					var $img = $(element).imgNotes(), arr = [];
					for (var i = 0; i < scope.count; i++){ arr.push(""); }
					$img.imgNotes("import", arr);
					scope.AddImage($img);
				}
			});
		},
	};
})
.directive('submenu', function($timeout){
	return {
		restrict: 'A',
		link: function(scope, element, attr){
			console.error()
			if(attr.submenu == 'top'){
				$(element).submenupicker();
			}else{
				scope.$watch('ready', function(){
					if(scope.ready){
						$timeout(function(){
							$(element).submenupicker();
						}, 50);
					}
				});
			}
		},
	};
});	