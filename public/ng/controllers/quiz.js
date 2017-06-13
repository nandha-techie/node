'use strict';
angular.module('myApp.Quiz', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Create New Attachment
	$routeProvider.when('/library/quiz/new', {
		templateUrl: '/ng/views/new_quiz.html',
		controller: 'CreateQuiz',
		requireLogin: true,
		title: 'Create New Quiz',
	})
	// Create Nested Attachment
	.when('/library/quiz/:folderId/new', {
		templateUrl: '/ng/views/new_quiz.html',
		controller: 'CreateNestedQuiz',
		requireLogin: true,
		title: 'Create Nested Quiz',
	})
	// Edit Quiz
	.when('/library/quiz/:quizId/edit', {
		templateUrl: '/ng/views/edit_quiz.html',
		controller: 'EditQuiz',
		requireLogin: true,
		title: 'Edit Quiz',
	})
	// Create Question
	.when('/library/quiz/:quizId/question/:type/new', {
		templateUrl: '/ng/views/new_question.html',
		controller: 'CreateQuestion',
		requireLogin: true,
		title: 'Create Question',
	})
	// Edit Question
	.when('/library/quiz/:quizId/question/:questionId/edit', {
		templateUrl: '/ng/views/edit_question.html',
		controller: 'EditQuestion',
		requireLogin: true,
		title: 'Edit Question',
	})
})

.controller('CreateQuiz', function($rootScope, $cookieStore, $scope, $route, $location, AlertService, CategoryServeice, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.documentData = {};
	$rootScope.isLoading = true;
	CategoryServeice.Find().success(function(res, status){
		$scope.categories = res.categories;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else{
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		}
	});
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.createQuiz(data).success(function(res, status){
				AlertService.success(res.message);
				$location.path("/library");
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/");
				}else if(status == 404){
					AlertService.error(error.error);
					$location.path('/library');
				}else{
					$rootScope.isLoading = false;
					AlertService.error(error.error);
				}
			});
		}
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$rootScope.isLoading = false;
})

.controller('CreateNestedQuiz', function($rootScope, $cookieStore, $scope, $routeParams, $route, CategoryServeice, $location, AlertService, LibraryService, FolderFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	$scope.documentData = {};
	$scope.folder = (FolderFactory.folder) ? FolderFactory.folder : null;
	CategoryServeice.Find().success(function(res, status){
		$scope.categories = res.categories;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else{
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		}
	});
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.createNestedQuiz($scope.folderId, data).success(function(res, status){
				AlertService.success(res.message);
				if(FolderFactory.folder){
					$location.path("/library/folder/" + FolderFactory.folder.fileId);
				}else{
					$location.path("/library");
				}
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/");
				}else if(status == 404){
					AlertService.error(error.error);
					$location.path('/library');
				}else{
					$rootScope.isLoading = false;
					AlertService.error(error.error);
				}
			});
		}
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$rootScope.isLoading = false;
})

.controller('EditQuiz', function($rootScope, $cookieStore, $scope, $routeParams, $route, $location, AlertService, CategoryServeice, LibraryService, ngDialog, FolderFactory, QuestionService, ActivityFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.quizId = $scope.quizId = $routeParams.quizId;
	$scope.pagination = function(page){
		$scope.page = page;
		$rootScope.isLoading = true;
		LibraryService.getQuiz($scope.quizId, page).success(function(res, status){
			ActivityFactory.activity = $scope.quizData = res.activity;
			$scope.questions = res.questions;
			$scope.pages = res.pages;
			$scope.currentPage = res.currentPage;
			$scope.total = res.total;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	CategoryServeice.Find().success(function(res, status){
		$scope.categories = res.categories;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else{
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		}
	});
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.updateQuiz($scope.quizId, data).success(function(res, status){
				AlertService.success(res.message);
				$scope.foucsed = false;
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/");
				}else if(status == 404){
					AlertService.error(error.error);
					$location.path('/library');
				}else{
					$rootScope.isLoading = false;
					AlertService.error(error.error);
				}
			});
		}
	};
	$scope.deleteDialog = function(id, index){
		$scope.id = id;
		$scope.index = index;
		ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
	};
	$scope.delete = function(id, index){
		$rootScope.isLoading = true;
		QuestionService.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$scope.questions.splice(index, 1);
			$scope.closeDialog();
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.orderQuestion = function(questionId, toPosition, fromPosition, page){
		$rootScope.isLoading = true;
		LibraryService.orderQuestion(questionId, toPosition, fromPosition, page).success(function(res, status){
			$scope.questions = res.questions;
			$scope.total = res.total;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.pagination(1);
})

.controller('CreateQuestion', function($rootScope, $cookieStore, $scope, $routeParams, $window, ngDialog, $route, $location, AlertService, LibraryService, QuestionService, ActivityFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.quizId = $scope.quizId = $routeParams.quizId;
	$rootScope.type = $scope.type = $routeParams.type;
	$scope.types = ["truefalse", "free", "single", "multiple", "blank"];
	$scope.activity = (ActivityFactory.activity) ? ActivityFactory.activity : null;
	$scope.questionData = { quizId: $scope.quizId, type: $scope.type, timelimit: 60, };
	$scope.questionData.options = ($scope.type == 'truefalse') ? ['TRUE', 'FALSE'] : [null, null];
	$scope.questionData.answer = [];
	$scope.questionData.media = [];
	$scope.radio = true;
	$scope.media = [];
	$scope.checkbox = false;
	$scope.$watch('questionData.notimelimit', function(newValue, oldValue){
		$scope.questionData.timelimit = (newValue == true) ? 0 : 60;
	});
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.options.length <= 0 && data.type != 'free' && data.type != 'blank'){
				AlertService.error("Please Add Options");
			}else if(data.answer.length <= 0 && data.type != 'free' && data.type != 'blank'){
				AlertService.error("Please Select Correct Answer");
			}else{
				$rootScope.isLoading = true;
				QuestionService.Create($scope.quizId, data).success(function(res, status){
					AlertService.success(res.message);
					if($scope.activity) $location.path("/library/quiz/" + $scope.activity.fileId + "/edit");
					else $location.path("/library");
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove("authuser");
						$location.path("/");
					}else if(status == 404){
						AlertService.error(error.error);
						$location.path('/library');
					}else{
						$rootScope.isLoading = false;
						AlertService.error(error.error);
					}
				});
			}
		};
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.addAnswer = function(){
		if($scope.type == 'multiple' || $scope.type == 'single'){
			if($scope.questionData.options.length < 26){
				$scope.questionData.options.push(null);
			}else{
				$scope.limitExceed = true;
				AlertService.error("Limit Exceed");
			}
		}
	};
	$scope.updateAnswer1 = function(index, form){
		if(!$scope.isEmpty(form[ "option_" + index ].$error)){
			$('#switch_' + index).prop('checked', false);
		}else{
			AlertService.error("Please Enter Option");
			$("#radio_" + index).attr("checked", false);
			for (var i = 0; i < $scope.questionData.options.length; i++){
				$('#switch_' + i).prop('checked', true);
			}
		}
	};
	$scope.updateAnswer = function(index, value, form){
		if(!$scope.isEmpty(form[ "option_" + index ].$error)){
			$('#switch_' + index).prop('checked', value);
		}else{
			AlertService.error("Please Enter Option");
			$("#radio_" + index).attr("checked", false);
			for (var i = 0; i < $scope.questionData.options.length; i++){
				$('#switch_' + i).prop('checked', false);
			}
		}
	};
	$scope.toggleSelection = function(option, index){
		var idx = $scope.questionData.answer.indexOf(option);
		if (idx > -1){
			$scope.questionData.answer.splice(idx, 1); // is currently selected
		}else{
			$scope.questionData.answer.push(option); // is newly selected
		}
	};
	$scope.toggleSelection1 = function(option, checked){
		$scope.questionData.answer = [];
		var idx = $scope.questionData.answer.indexOf(option);
		if (idx > -1){
			$scope.questionData.answer.splice(idx, 1); // is currently selected
		}else if(checked){
			$scope.questionData.answer.push(option); // is newly selected
		}
	};
	$scope.removeAnswer = function(index){
		if($scope.questionData.type != 'truefalse' && $scope.questionData.options.length > 2){
			$scope.questionData.options.splice(index, 1);
			$scope.questionData.answer.splice(index, 1);
		}
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.addMedia = function(attachment){
		if(attachment){
			$scope.media.push({ attachment: attachment, });
			$scope.questionData.media.push({ attachment: attachment._id, });
			$scope.closeDialog();
		}
	};
	$scope.removeMedia = function(index){
		$scope.media.splice(index, 1);
		$scope.questionData.media.splice(index, 1);
	};
	$scope.getMedia = function(){
		$rootScope.isLoading = true;
		LibraryService.getAttachments().success(function(res, status){
			$scope.attachments = res.attachments;
			if($scope.attachments.length > 0)
				ngDialog.open({ scope: $scope, template: '/ng/views/media.html', className: 'ngdialog-theme-plain', });
			else
				AlertService.error("First Upload any Image or Document");
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.openDocument = function(attachment){
		if(attachment.fileType == 'zip'){
			$window.open(window.location.origin + attachment.docpath, '_blank');
		}else{
			$window.open(window.location.origin + attachment.path, '_blank');
		}
	}
	if($scope.types.indexOf($scope.type) < 0){
		$location.path("/library");
	}else{
		$rootScope.isLoading = false;
	}
})

.controller('EditQuestion', function($rootScope, $cookieStore, $scope, $routeParams, $route, $location, AlertService, LibraryService, QuestionService, $window, ngDialog, ActivityFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.quizId = $scope.quizId = $routeParams.quizId;
	$rootScope.questionId = $scope.questionId = $routeParams.questionId;
	$scope.radio = true;
	$scope.media = [];
	$scope.checkbox = false;
	$scope.questionData = { timelimit: 0, };
	$scope.activity = (ActivityFactory.activity) ? ActivityFactory.activity : null;
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.updateAnswer1 = function(index, form){
		if(!$scope.isEmpty(form[ "option_" + index ].$error)){
			$('#switch_' + index).prop('checked', false);
		}else{
			AlertService.error("Please Enter Option");
			$("#radio_" + index).attr("checked", false);
			for (var i = 0; i < $scope.questionData.options.length; i++){
				$('#switch_' + i).prop('checked', true);
			}
		}
	};
	$scope.updateAnswer = function(index, value, form){
		if(!$scope.isEmpty(form[ "option_" + index ].$error)){
			$('#switch_' + index).prop('checked', value);
		}else{
			AlertService.error("Please Enter Option");
			$("#radio_" + index).attr("checked", false);
			for (var i = 0; i < $scope.questionData.options.length; i++){
				$('#switch_' + i).prop('checked', false);
			}
		}
	};
	$scope.toggleSelection = function(option, index){
		var idx = $scope.questionData.answer.indexOf(option);
		if (idx > -1 && !index){
			$scope.questionData.answer.splice(idx, 1); // is currently selected
		}else if(index && idx < 0){
			$scope.questionData.answer.push(option); // is newly selected
		}
	};
	$scope.toggleSelection1 = function(option, checked){
		$scope.questionData.answer = [];
		var idx = $scope.questionData.answer.indexOf(option);
		if (idx > -1){
			$scope.questionData.answer.splice(idx, 1); // is currently selected
		}else if(checked){
			$scope.questionData.answer.push(option); // is newly selected
		}
	};
	$scope.removeAnswer = function(index){
		if($scope.questionData.type != 'truefalse' && $scope.questionData.options.length > 2){
			$scope.questionData.options.splice(index, 1);
			$scope.questionData.answer.splice(index, 1);
		}
	};
	$scope.addAnswer = function(){
		if($scope.questionData.type == 'multiple' || $scope.questionData.type == 'single'){
			if($scope.questionData.options.length < 26){
				$scope.questionData.options.push(null);
			}else{
				$scope.limitExceed = true;
				AlertService.error("Limit Exceed");
			}
		}
	};
	$scope.deleteDialog = function(id){
		$scope.id = id;
		ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
	};
	$scope.delete = function(id){
		$rootScope.isLoading = true;
		QuestionService.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$scope.closeDialog();
			$location.path('/library');
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	QuestionService.getById($scope.questionId).success(function(res, status){
		$scope.nextQuestion = res.nextQuestion;
		$scope.qno = res.qno;
		$scope.prevQuestion = res.prevQuestion;
		$scope.questionData = res.data;
		$scope.questionData.answer = [];
		$scope.questionData.options = [];
		$scope.activity = res.activity;
		if($scope.questionData.media.length > 0){
			for (var i = 0; i < $scope.questionData.media.length; i++) {
				$scope.media.push({ attachment: $scope.questionData.media[i].attachment, });
			}
			$scope.questionData.media = [];
			for (var i = 0; i < $scope.media.length; i++) {
				$scope.questionData.media.push({ attachment: $scope.media[i].attachment._id, });
			}
		}
		if($scope.questionData.type == 'free' || $scope.questionData.type == 'blank'){
			$scope.questionData.answer.push($scope.questionData.answers[0].answer);
		}else{
			loop1: for (var i = 0; i < $scope.questionData.option.length; i++){
				$scope.questionData.options.push($scope.questionData.option[i].value);
				loop2: for (var j = 0; j < $scope.questionData.answers.length; j++){
					if($scope.questionData.answers[j].optionId == $scope.questionData.option[i]._id){
						$scope.questionData.answer[i] = $scope.questionData.option[i].value;
						break loop2;
					}
				};
			};
		}
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove("authuser");
			$location.path("/");
		}else if(status == 404){
			AlertService.error(error.error);
			$location.path('/library');
		}else{
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		}
	});
	$scope.$watch('questionData.notimelimit', function(newValue, oldValue){
		$scope.questionData.timelimit = (newValue == true) ? 0 : 60;
	});
	$scope.updateAnswerField = function(index){
		$rootScope.isLoading = true;
		setTimeout(function(){
			if($scope.questionData.type != 'free' && $scope.questionData.type != 'blank'){
				loop1: for (var i = 0; i < $scope.questionData.options.length; i++){
					loop2: for (var j = 0; j < $scope.questionData.answer.length; j++){
						if($scope.questionData.answer[j] == $scope.questionData.options[i]){
							$('#switch_' + i).prop('checked', ($scope.questionData.type == 'multiple') ? true : false);
							break loop2;
						}
					};
				};
			}
		}, 100);
		$rootScope.isLoading = false;
	};
	$scope.update = function(form, data){
		$scope.options = {};
		form.answer = {};
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.options.length <= 0 && data.type != 'free' && data.type != 'blank'){
				AlertService.error("Please Add Options");
			}else if(data.answer.length <= 0 && data.type != 'free' && data.type != 'blank'){
				AlertService.error("Please Select Correct Answer");
			}else{
				$rootScope.isLoading = true;
				QuestionService.Update($scope.questionId, data).success(function(res, status){
					AlertService.success(res.message);
					if($scope.activity) $location.path("/library/quiz/" + $scope.activity.fileId + "/edit");
					else $location.path("/library");
				}).error(function(error, status){
					AlertService.error(error.error);
					$rootScope.isLoading = false;
				});
			}
		};
	};
	$scope.addMedia = function(attachment){
		if(attachment){
			$scope.media.push({ attachment: attachment, });
			$scope.questionData.media.push({ attachment: attachment._id, });
			$scope.closeDialog();
		}
	};
	$scope.removeMedia = function(index){
		$scope.media.splice(index, 1);
		$scope.questionData.media.splice(index, 1);
	};
	$scope.getMedia = function(){
		$rootScope.isLoading = true;
		LibraryService.getAttachments().success(function(res, status){
			$scope.attachments = res.attachments;
			if($scope.attachments.length > 0)
				ngDialog.open({ scope: $scope, template: '/ng/views/media.html', className: 'ngdialog-theme-plain', });
			else
				AlertService.error("First Upload any Image or Document");
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.openDocument = function(attachment){
		if(attachment.fileType == 'zip'){
			$window.open(window.location.origin + attachment.docpath, '_blank');
		}else{
			$window.open(window.location.origin + attachment.path, '_blank');
		}
	};
	$scope.sortQuestion = function(activityId, questionId, toPosition, fromPosition){
		$rootScope.isLoading = true;
		LibraryService.sortQuestion(questionId, toPosition, fromPosition).success(function(res, status){
			$scope.nextQuestion = res.nextQuestion;
			$scope.qno = res.qno;
			$scope.prevQuestion = res.prevQuestion;
			$scope.questionData = res.data;
			$scope.questionData.answer = [];
			$scope.questionData.options = [];
			$scope.activity = res.activity;
			if($scope.questionData.media){
				$scope.media = $scope.questionData.media;
				$scope.questionData.media = $scope.media._id;
			}
			if($scope.questionData.type == 'free' || $scope.questionData.type == 'blank'){
				$scope.questionData.answer.push($scope.questionData.answers[0].answer);
			}else{
				loop1: for (var i = 0; i < $scope.questionData.option.length; i++){
					$scope.questionData.options.push($scope.questionData.option[i].value);
					loop2: for (var j = 0; j < $scope.questionData.answers.length; j++){
						if($scope.questionData.answers[j].optionId == $scope.questionData.option[i]._id){
							$scope.questionData.answer[i] = $scope.questionData.option[i].value;
							break loop2;
						}
					};
				};
			}
			$rootScope.isLoading = false;
		}).error(function(error, status){
			$rootScope.isLoading = false;
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				AlertService.error(error.error);
				$location.path("/library");
			}
		});
	};
})
