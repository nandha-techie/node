'use strict';
var app = angular.module('myApp.Poll', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
]);

app.config(function($routeProvider){
	// Poll Creation with Question
	$routeProvider.when('/library/poll/:type/create', {
		templateUrl: '/ng/views/poll_question.html',
		controller: 'PollCreate',
		requireLogin: true,
		title: 'Create Live Voting',
	})
	// Create Nested Poll with Question
	.when('/library/:folderId/poll/:type/create', {
		templateUrl: '/ng/views/poll_question.html',
		controller: 'NestedPollCreate',
		requireLogin: true,
		title: 'Create Live Voting',
	})
	// Edit Poll
	.when('/library/poll/:pollId/edit', {
		templateUrl: '/ng/views/edit_poll.html',
		controller: 'EditPoll',
		requireLogin: true,
		title: 'Edit Poll',
	})
	// Create New Question
	.when('/library/poll/:pollId/question/:type/new', {
		templateUrl: '/ng/views/new_poll_question.html',
		controller: 'CreatePollQuestion',
		requireLogin: true,
		title: 'Create Poll Question',
	})
	// Edit Question
	.when('/library/poll/:pollId/question/:questionId/edit', {
		templateUrl: '/ng/views/edit_poll_question.html',
		controller: 'EditPollQuestion',
		requireLogin: true,
		title: 'Edit Poll Question',
	})
});

var controller = function($rootScope, $scope, $route, $routeParams, $cookieStore, $location, ngDialog, CategoryServeice, $timeout, $window, LibraryService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.type = $scope.type = $routeParams.type;
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	var typeOptions = ['multiple', 'single', 'truefalse', 'free'];
	$scope.questionData = { type: $scope.type, timelimit: 60, };
	$scope.questionData.media = [];
	$scope.media = [];
	$scope.$watchCollection(function(){
		return $routeParams;
	}, function(){
		$timeout(function(){
			if(typeOptions.indexOf($routeParams.type) < 0){
				$location.path('/library');
			};
			$rootScope.isLoading = false;
		}, 20);
	});
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
	if($scope.type == 'truefalse'){
		// $scope.questionData.options = ($cookieStore.get('authuser').language == "en") ? ['TRUE', 'FALSE'] : ['VRAI', 'FAUX'];
		$scope.questionData.options = ['TRUE', 'FALSE'];
	}else{
		$scope.questionData.options = [null, null];
	}
	$scope.addAnswer = function(){
		if($scope.questionData.options.length < 26){
			$scope.questionData.options.push(null);
		}else{
			AlertService.error("Limit Exceed");
		}
	};
	$scope.removeAnswer = function(index){
		if($scope.questionData.type == 'truefalse' && $scope.questionData.options.length > 2){
			$scope.questionData.options.splice(index, 1);
		}else{
			$scope.questionData.options.splice(index, 1);
		}
	};
	$scope.Handler = function(Handler){
		$rootScope.isLoading = true;
		Handler.success(function(res, status){
			AlertService.success(res.message);
			$location.path("/library");
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.options.length <= 0 && data.type != 'free'){
				AlertService.error("Please Add Options");
			}else if($scope.folderId){
				$scope.Handler(LibraryService.createNestedPoll($scope.folderId, data));
			}else{
				$scope.Handler(LibraryService.createPoll(data));
			}
		};
	};
	$scope.$watch('questionData.notimelimit', function(newValue, oldValue){
		$scope.questionData.timelimit = (newValue == true) ? 0 : 60;
	});

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
	$rootScope.isLoading = false;
};

app.controller('PollCreate', controller).controller('NestedPollCreate', controller)
.controller("EditPoll", function($rootScope, $scope, $route, $routeParams, $cookieStore, $location, CategoryServeice, $timeout, $window, LibraryService, ngDialog, QuestionService, AlertService, ActivityFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.pollId = $scope.pollId = $routeParams.pollId;
	$scope.pagination = function(page){
		$rootScope.isLoading = true;
		LibraryService.getPoll($scope.pollId, page).success(function(res, status){
			ActivityFactory.activity = $scope.pollData = res.activity;
			$scope.questions = res.questions;
			$scope.pages = res.pages;
			$scope.currentPage = res.currentPage;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/login");
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
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.updatePoll($scope.pollId, data).success(function(res, status){
				AlertService.success(res.message);
				$scope.foucsed = false;
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/login");
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
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
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
	$scope.pagination(1);
	$rootScope.isLoading = false;
})
.controller("CreatePollQuestion", function($rootScope, $scope, $route, $routeParams, $cookieStore, $location, $timeout, $window, LibraryService, ngDialog, QuestionService, AlertService, ActivityFactory, CategoryServeice){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.pollId = $scope.pollId = $routeParams.pollId;
	$rootScope.type = $scope.type = $routeParams.type;
	var typeOptions = ['multiple', 'single', 'truefalse', 'free'];
	$scope.activity = (ActivityFactory.activity) ? ActivityFactory.activity : null;
	$scope.questionData = { type: $scope.type, timelimit: 60, };
	$scope.questionData.media = [];
	$scope.media = [];
	$scope.$watchCollection(function(){
		return $routeParams;
	}, function(){
		$timeout(function(){
			if(typeOptions.indexOf($routeParams.type) < 0){
				$location.path('/library');
			};
			$rootScope.isLoading = false;
		}, 20);
	});
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
	$scope.$watch('questionData.notimelimit', function(newValue, oldValue){
		$scope.questionData.timelimit = (newValue == true) ? 0 : 60;
	});
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	if($scope.type == 'truefalse'){
		// $scope.questionData.options = ($cookieStore.get('authuser').language == "en") ? ['TRUE', 'FALSE'] : ['VRAI', 'FAUX'];
		$scope.questionData.options = ['TRUE', 'FALSE'];
	}else{
		$scope.questionData.options = [null, null];
	}
	$scope.addAnswer = function(){
		if($scope.questionData.options.length < 26){
			$scope.questionData.options.push(null);
		}else{
			AlertService.error("Limit Exceed");
		}
	};
	$scope.removeAnswer = function(index){
		if($scope.questionData.type == 'truefalse' && $scope.questionData.options.length > 2){
			$scope.questionData.options.splice(index, 1);
		}else{
			$scope.questionData.options.splice(index, 1);
		}
	};
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.options.length <= 0 && data.type != 'free'){
				AlertService.error("Please Add Options");
			}else{
				LibraryService.createPollQuestion($scope.pollId, data).success(function(res, status){
					AlertService.success(res.message);
					if($scope.activity) $location.path("/library/poll/" + $scope.activity.fileId + "/edit");
					else $location.path("/library");
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove('authuser');
						$location.path("/login");
					}else if(status == 404){
						AlertService.error(error.error);
						$location.path('/library');
					}else{
						AlertService.error(error.error);
						$rootScope.isLoading = false;
					}
				});
			}
		};
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
	$rootScope.isLoading = false;	
})
.controller("EditPollQuestion", function($rootScope, $scope, $route, $routeParams, $cookieStore, $location, $timeout, $window, LibraryService, ngDialog, QuestionService, AlertService, ActivityFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.pollId = $scope.pollId = $routeParams.pollId;
	$rootScope.questionId = $scope.questionId = $routeParams.questionId;
	$scope.activity = (ActivityFactory.activity) ? ActivityFactory.activity : null;
	$scope.questionData = { timelimit: 0, };
	$scope.media = [];
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.addAnswer = function(){
		if($scope.questionData.options.length < 26){
			$scope.questionData.options.push(null);
		}else{
			AlertService.error("Limit Exceed");
		}
	};
	$scope.removeAnswer = function(index){
		if($scope.questionData.type == 'truefalse' && $scope.questionData.options.length > 2){
			$scope.questionData.options.splice(index, 1);
		}else{
			$scope.questionData.options.splice(index, 1);
		}
	};
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.options.length <= 0 && data.type != 'free'){
				AlertService.error("Please Add Options");
			}else{
				LibraryService.editPollQuestion($scope.pollId, $scope.questionId, data).success(function(res, status){
					AlertService.success(res.message);
					if($scope.activity) $location.path("/library/poll/" + $scope.activity.fileId + "/edit");
					else $location.path("/library");
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove('authuser');
						$location.path("/login");
					}else if(status == 404){
						AlertService.error(error.error);
						$location.path('/library');
					}else{
						AlertService.error(error.error);
						$rootScope.isLoading = false;
					}
				});
			}
		};
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
			$scope.closeDialog();
			if($scope.activity){
				$location.path('/library/poll/' + $scope.activity.fileId + '/edit');
			}else{
				$location.path('/library');
			}
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
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
		/*$scope.nextQuestion = res.nextQuestion;
		$scope.qno = res.qno;
		$scope.prevQuestion = res.prevQuestion;*/
		$scope.questionData = res.data;
		$scope.activity = res.activity;
		$scope.questionData.answer = [];
		$scope.questionData.options = [];
		if($scope.questionData.media.length > 0){
			for (var i = 0; i < $scope.questionData.media.length; i++) {
				$scope.media.push({ attachment: $scope.questionData.media[i].attachment, });
			}
			$scope.questionData.media = [];
			for (var i = 0; i < $scope.media.length; i++) {
				$scope.questionData.media.push({ attachment: $scope.media[i].attachment._id, });
			}
		}
		if($scope.questionData.type != 'free'){
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
			$location.path("/login");
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
})