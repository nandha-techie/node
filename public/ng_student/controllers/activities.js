angular.module('myApp.Activities', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
])
// 
.config(["$routeProvider", function($routeProvider){
	$routeProvider.when('/quiz/:activityId', {
		templateUrl : '/ng_student/views/start_activity.html',
		controller:'StartActivityController',
		requireLogin: 1,
		title: "Quiz",
	})
	.when('/activity_alert', {
		templateUrl : '/ng_student/views/activity_alert.html',
		controller:'ActivityAlertController',
		requireLogin: 1,
		title: "Activity Alert",
	})
	// Poll Result Result
	.when('/activity/:activityId/question/:questionId', {
		templateUrl: '/ng_student/views/question_result.html',
		controller: 'QuestionResultController',
		requireLogin: 1,
		title: 'Poll Result Result',
	});
}])
// 
.controller('StartActivityController', function($rootScope, $cookieStore, $location, $route, $sce, $routeParams, $scope, $window, $locale, $timeout, ActivityService, AlertService, Socket, ngDialog){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('participantUser')){ $location.path("/login"); }
	$scope.showQuiz = true;
	$rootScope.activityId = $scope.activityId = $routeParams.activityId;
	$scope.Locale = $locale.translate;
	$scope.colors = ["#5B9BD5", "#ED7D31", "#FFCDD2", "#EC407A", "#B71C1C", "#CE93D8",
		"#9C27B0", "#5E35B1", "#5C6BC0", "#283593", "#42A5F5", "#1976D2", "#4FC3F7",
		"#80DEEA", "#00BCD4", "#00838F", "#004D40", "#81C784", "#388E3C", "#33691E",
		"#D4E157", "#827717", "#BCAAA4", "#795548", "#3E2723", "#212121", "#A5A5A5"];
	$scope.doughnutData = [];
	$scope.questionData = {};
	$scope.questionData.answers = [];
	$scope.answer = [];
	$scope.onShow = false;
	$scope.answerError = {};
	$rootScope.isLoading = true;
	$scope.paginate = function(id){
		$rootScope.isLoading = true;
		ActivityService.FindByID(id).success(function(res, status){
			if(res.question == null){
				AlertService.success(res.message);
				$location.path('/');
			}else if (res.question == "wait"){
				$scope.showQuiz = false;
				$rootScope.isLoading = false;
			}else if (res.questionResult == true){
				$scope.count = res.count;
				$scope.prevQuestion = null;
				$scope.questionResult = res.questionResult;
				$scope.participant = res.participant;
				$scope.nextQuestion = null;
				$scope.notAnswerd = res.notAnswerd;
				$scope.activity = res.activity;
				$scope.canedit = false;
				$scope.question = res.question;
				$scope.questionData.type = $scope.question.type;
				$scope.nextCompleted = false;
				for (var i = 0; i < $scope.question.options.length; i++){
					var answer = ($scope.question.type == 'free' || $scope.question.type == 'blank') ? $scope.question.options[i]._id : $scope.question.options[i].value;
					$scope.doughnutData.push({ value: $scope.question.options[i].count,
						color: $scope.colors[i], highlight: $scope.colors[i],
						label: answer, });
				}
				if($scope.notAnswerd){
					$scope.doughnutData.push({
						value: $scope.notAnswerd.count,
						color: $scope.colors[26],
						highlight: $scope.colors[26],
						label: "N/A",
					});
				}
				$rootScope.isLoading = false;
			}else{
				$scope.prevQuestion = res.prevQuestion;
				$scope.participant = res.participant;
				$scope.nextQuestion = res.nextQuestion;
				$scope.activity = res.activity;
				$scope.canedit = res.canedit;
				$scope.question = res.question;
				$scope.completed = res.completed;
				if($scope.question){
					if($scope.question.timelimit > 0){
						$scope.counter = $scope.question.timelimit;
						$scope.mytimeout = $timeout($scope.onTimeout, 1000);
					}
					$scope.questionData.questionId = $scope.question._id;
					$scope.questionData.type = $scope.question.type;
				}
				$scope.nextCompleted = false;
				$scope.onShow = true;
				$rootScope.isLoading = false;
			}
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('participantUser');
				$location.path("/");
			}
			if(status == 404){
				$location.path('/');
			}
			if(error.completed){
				$location.path('/');
				AlertService.error(error.error);
			}else{
				AlertService.error(error.error);
			}
			$rootScope.isLoading = false;
		});
	};
	$scope.paginate($scope.activityId);
	$scope.updateScore = function(score){
		$scope.questionData.score = score;
	};
	$scope.toggleSelection = function(option, checked){
		var idx = $scope.questionData.answers.indexOf(option);
		if (idx > -1){
			$scope.questionData.answers.splice(idx, 1); // is currently selected
		}else{
			$scope.questionData.answers.push(option); // is newly selected
		}
	};
	$scope.toggleSelection1 = function(option, checked){
		$scope.questionData.answer = [];
		var idx = $scope.questionData.answers.indexOf(option);
		if (idx > -1){
			$scope.questionData.answers.splice(idx, 1); // is currently selected
		}else if(checked){
			$scope.questionData.answers.push(option); // is newly selected
		}
	};
	Socket.on("participantQuestionStatus", function(){
		if($route.current.$$route.controller == "StartActivityController"){
			$timeout.cancel($scope.mytimeout);
			$route.reload();
		}
	});
	Socket.on("participantActivityStatus", function(){
		if($route.current.$$route.controller == "StartActivityController"){
			$scope.activity.show = !$scope.activity.show;
		}
	});
	$scope.openDocument = function(attachment){
		if(attachment.fileType == 'ppt' || attachment.fileType == 'doc' || attachment.fileType == 'zip'){
			$window.open(window.location.origin + attachment.docpath, '_blank');
		}else{
			$window.open(window.location.origin + attachment.path, '_blank');
		}
	}
	Socket.on("participantActivities", function(){
		if($route.current.$$route.controller == "StartActivityController"){
			$rootScope.isLoading = true;
			ActivityService.FindAllQuiz(1).success(function(res, status){
				if(res.activities.length >= 1){
					$location.path('/quiz/' + res.activities[0]._id);
				}else{
					$location.path("/");
				}
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('participantUser');
					$location.path("/");
				}
			});
		}
	});
	Socket.on("activeQuestion", function(){
		if($route.current.$$route.controller == "StartActivityController"){
			$timeout.cancel($scope.mytimeout);
			$route.reload();
		}
	});
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.cancelModal = function(){
		ngDialog.close($scope.dialog.attr('id'));
		if($scope.activity.byParticipant){
			if($scope.nextQuestion){
				$route.reload();
			}else{
				$location.path('activity_alert');
			}
		}else{
			if($scope.completed){
				$location.path('activity_alert');
			}else{
				$rootScope.$broadcast("showQuiz", false);
			}
		}
	};
	$scope.submit = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.type == 'blank'){
				var count = ($scope.question.name.match(/_BLANK/g) || []).length;
				var questionName = $scope.question.name;
				for (var i = 0; i < count; i++){
					var answer = $("#d-nest" + i).val();
					questionName = questionName.replace("_BLANK", answer);
				}
				data.answers = questionName;
			}
			if(data.answers.length > 0){
				$timeout.cancel($scope.mytimeout);
				$rootScope.isLoading = true;
				ActivityService.postByID($scope.activityId, data).success(function(res, status){
					$rootScope.isLoading = false;
					if($scope.activity.type == 'polls'){
						AlertService.success(res.message);
						$location.path("/");
					}else if($scope.activity.byParticipant){
						if ($scope.activity.feedback){
							$scope.point = res.point;
							if(res.point == 0){
								ngDialog.open({ scope: $scope, template: '/ng_student/views/feedback.html', className: 'ngdialog-theme-plain', });
							}else{
								ngDialog.open({ scope: $scope, template: '/ng_student/views/feedback.html', className: 'ngdialog-theme-plain', });
							}
						}else{
							if($scope.nextQuestion){
								$route.reload();
							}else{
								$location.path('activity_alert');
							}
						}
					}else{
						if ($scope.activity.feedback){
							if(res.point == 0){
								ngDialog.open({ scope: $scope, template: '/ng_student/views/feedback.html', className: 'ngdialog-theme-plain', });
							}else{
								ngDialog.open({ scope: $scope, template: '/ng_student/views/feedback.html', className: 'ngdialog-theme-plain', });
							}
						}else{
							if($scope.completed){
								$location.path('activity_alert');
							}else{
								$route.reload();
							}
						}
					}
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove('participantUser');
						$location.path("/login");
					}else if(status == 404){
						$location.path("/");
					}else{
						$rootScope.isLoading = false;
						AlertService.error(error.error);
					}
				});
				$scope.answerError.$error = {};
			}else{
				$scope.answerError.$error = { required: true };
			}
		}
	};
	$scope.$on("showQuiz", function(event, status){
		$scope.showQuiz = status;
	});
	$scope.prevnext = function(id){
		$scope.answerError.$error = {};
		$rootScope.isLoading = true;
		ActivityService.FindByQID($scope.activityId, id).success(function(res, status){
			$timeout.cancel($scope.mytimeout);
			if(res.question == null){
				AlertService.success(res.message);
				$location.path('/');
			}else{
				$timeout.cancel($scope.mytimeout);
				$scope.prevQuestion = res.prevQuestion;
				$scope.participant = res.participant;
				$scope.nextQuestion = res.nextQuestion;
				$scope.nextCompleted = res.nextCompleted;
				$scope.activity = res.activity;
				$scope.canedit = res.canedit;
				$scope.question = res.question;
				if($scope.question && $scope.canedit){
					if($scope.question.timelimit > 0){
						$scope.counter = $scope.question.timelimit;
						$scope.mytimeout = $timeout($scope.onTimeout, 1000);
					}
					$scope.questionData = $scope.question;
					$scope.questionData.questionId = $scope.question._id;
				}
				$rootScope.isLoading = false;
			}
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('participantUser');
				$location.path('/login');
			}
			AlertService.error(error.error);
			$rootScope.isLoading = false;
			if(error.completed){
				$location.path('/');
			}
		});
	};
	$scope.mytimeout = null;
	$scope.onTimeout = function(){
		$scope.counter--;
		if($scope.counter == 0 && $route.current.$$route.controller == "StartActivityController"){
			$timeout.cancel($scope.mytimeout);
			var data = { questionId: $scope.question._id };
			data.answers = ['N/A'];
			$rootScope.isLoading = true;
			ActivityService.postByID($scope.activityId, data).success(function(res, status){
				$rootScope.isLoading = false;
				if($scope.nextQuestion) $route.reload();
				else $location.path('activity_alert');
			}).error(function(error, status){
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}else if($route.current.$$route.controller != "StartActivityController"){
			$timeout.cancel($scope.mytimeout);
		}else{
			$scope.mytimeout = $timeout($scope.onTimeout, 1000);
		}
	};
	$scope.getAttachment = function(attachment){
		var config = null;
		if(attachment.fileType == 'video'){
			config = {
				sources: [{
					src: $sce.trustAsResourceUrl(window.location.origin + attachment.path),
					type: "video/" + attachment.extension
				}],
				theme: "/bower_components/videogular-themes-default/videogular.min.css",
			};
		}
		return config;
	};
})
// 
.controller('ActivityAlertController', function($rootScope, $location, $scope, $route, $cookieStore, $timeout, Socket, ActivityService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('participantUser')){ $location.path("/login"); }
	$scope.goHome = function(){ $location.path("/"); };
	$timeout($scope.goHome, (1000 * 20));
	Socket.on("participantActivities", function(){
		if($route.current.$$route.controller == "ActivityAlertController"){
			$rootScope.isLoading = true;
			ActivityService.FindAllQuiz(1).success(function(res, status){
				if(res.activities.length >= 1){
					$location.path('/quiz/' + res.activities[0]._id);
				}else{
					$location.path("/");
				}
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('participantUser');
					$location.path("/");
				}
			});
		}
	});
	Socket.on("participantActivityStatus", function(){
		if($route.current.$$route.controller == "ActivityAlertController"){
			$timeout.cancel();
			$location.path("/");
		}
	});
	$rootScope.isLoading = false;
})
// 
.controller('QuestionResultController', function($rootScope, $cookieStore, $route, $routeParams, $scope, $location, ActivityService, AlertService, Socket){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('participantUser')){ $location.path("/login"); }
	$rootScope.activityId = $scope.activityId = $routeParams.activityId;
	$rootScope.questionId = $scope.questionId = $routeParams.questionId;
	$scope.colors = ["#5B9BD5", "#ED7D31", "#FFCDD2", "#EC407A", "#B71C1C", "#CE93D8",
		"#9C27B0", "#5E35B1", "#5C6BC0", "#283593", "#42A5F5", "#1976D2", "#4FC3F7",
		"#80DEEA", "#00BCD4", "#00838F", "#004D40", "#81C784", "#388E3C", "#33691E",
		"#D4E157", "#827717", "#BCAAA4", "#795548", "#3E2723", "#212121", "#A5A5A5"];
	$scope.doughnutData = [];
	$scope.getQuestion = function(id, qid){
		$rootScope.isLoading = true;
		ActivityService.questionResult(id, qid).success(function(res, status){
			$scope.count = res.count;
			$scope.question = res.question;
			$scope.notAnswerd = res.notAnswerd;
			for (var i = 0; i < $scope.question.options.length; i++){
				var answer = ($scope.question.type == 'free' || $scope.question.type == 'blank') ? $scope.question.options[i]._id : $scope.question.options[i].value;
				$scope.doughnutData.push({ value: $scope.question.options[i].count,
					color: $scope.colors[i], highlight: $scope.colors[i],
					label: answer, });
			}
			if($scope.notAnswerd){
				$scope.doughnutData.push({
					value: $scope.notAnswerd.count,
					color: $scope.colors[26],
					highlight: $scope.colors[26],
					label: "N/A",
				});
			}
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('participantUser');
				$location.path("/");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
				$location.path("/");
			}
		});
	};
	Socket.on("participantActivities", function(){
		if($route.current.$$route.controller == "QuestionResultController"){
			$rootScope.isLoading = true;
			ActivityService.FindAllQuiz(1).success(function(res, status){
				if(res.activities.length >= 1){
					$location.path('/quiz/' + res.activities[0]._id);
				}else{
					$location.path("/");
				}
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('participantUser');
					$location.path("/");
				}
			});
		}
	});
	$scope.toggleFeedback = function(status){
		$scope.showFeedback = !status;
	};
	$scope.getQuestion($rootScope.activityId, $rootScope.questionId);
});