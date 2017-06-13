'use strict';
angular.module('myApp.Live', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Login Route
	$routeProvider.when('/live', {
		templateUrl: '/ng/views/live.html',
		controller: 'Live',
		requireLogin: true,
		title: 'Live',
	})
	// Question Result
	.when('/activity/:activityId/question/:questionId', {
		templateUrl: '/ng/views/live.html',
		controller: 'Live',
		requireLogin: true,
		title: 'Question Result',
	})
})

.controller('Live', function($rootScope, $scope, $route, $location, $routeParams, $cookieStore, $sce, $window, AlertService, LibraryService, Socket){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); };
	$scope.colors = ["#5B9BD5", "#ED7D31", "#FFCDD2", "#EC407A", "#B71C1C", "#CE93D8",
		"#9C27B0", "#5E35B1", "#5C6BC0", "#283593", "#42A5F5", "#1976D2", "#4FC3F7",
		"#80DEEA", "#00BCD4", "#00838F", "#004D40", "#81C784", "#388E3C", "#33691E",
		"#D4E157", "#827717", "#BCAAA4", "#795548", "#3E2723", "#212121", "#A5A5A5"];
	$scope.doughnutData = [];
	$scope.isResult = false;
	$rootScope.activityId = $scope.activityId = $routeParams.activityId;
	$rootScope.questionId = $scope.questionId = $routeParams.questionId;
	$scope.getQuestion = function(id, qid){
		$rootScope.isLoading = true;
		LibraryService.questionResult(id, qid).success(function(res, status){
			$scope.isResult = true;
			$scope.activity = res.activity;
			$scope.totalQuestion = res.totalQuestion;
			$scope.currentQuestion = res.currentQuestion;
			$scope.prevQuestion = res.prevQuestion;
			$scope.nextQuestion = res.nextQuestion;
			$scope.count = res.count;
			$scope.questions = res.questions;
			$scope.question = res.question;
			$scope.notAnswerd = res.notAnswerd;
			$scope.showFeedback = ($scope.question.feedback) ? true : false;
			if(!$scope.activity.byParticipant){
				LibraryService.updateQuestion($scope.question._id);
			}
			for (var i = 0; i < $scope.question.options.length; i++){
				// var answer = ($scope.question.type == 'free' || $scope.question.type == 'blank') ? $scope.question.options[i].answer : $scope.question.options[i].value;
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
				$cookieStore.remove('authuser');
				$location.path("/login");
			}
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		});
	};
	$scope.paginate = function(){
		$rootScope.isLoading = true;
		LibraryService.FindActive().success(function(res, status){
			$scope.activity = res.activity;
			$scope.questions = res.questions;
			if($scope.activity && $scope.questions.length > 0){
				var urlPath = "activity/" + $scope.activity._id + "/question/" + $scope.questions[0]._id;
				$rootScope.$broadcast("urlPath", urlPath);
				$location.path(urlPath);
			}
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/login");
			}
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		});
	};
	if($routeParams.activityId && $routeParams.questionId){
		$scope.getQuestion($rootScope.activityId, $rootScope.questionId);
	}else{
		$scope.paginate();
	}
	$scope.toggleFeedback = function(status){
		$scope.showFeedback = !status;
	};
	$scope.openDocument = function(attachment){
		if(attachment.fileType == 'ppt' || attachment.fileType == 'doc' || attachment.fileType == 'zip'){
			$window.open(window.location.origin + attachment.docpath, '_blank');
		}else{
			$window.open(window.location.origin + attachment.path, '_blank');
		}
	}
	$scope.stopActivity = function(file){
		$rootScope.isLoading = true;
		LibraryService.stopActivity(file.type, file.fileId).success(function(res, status){
			AlertService.success(res.message);
			$rootScope.$broadcast("urlPath", "live");
			$location.path("/library");
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
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
	Socket.on("moderatorPoll", function(){
		if($route.current.$$route.controller == "Live"){
			$route.reload();
		}
	});
	Socket.on("moderatorQuiz", function(){
		if($route.current.$$route.controller == "Live"){
			$route.reload();
		}
	});
	$scope.updateStatus = function(activity, show){
		if(activity.type == 'polls'){
			$rootScope.isLoading = true;
			LibraryService.updatePollStatus(activity._id, { show: show }).success(function(res, status){
				activity.show = show;
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('authuser');
					$location.path('/login');
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}
	};
	$scope.updateQuestion = function(question, show){
		if($scope.activity.type == 'quiz'){
			$rootScope.isLoading = true;
			LibraryService.updateQuestionStatus(question._id, { show: show }).success(function(res, status){
				question.show = show;
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('authuser');
					$location.path('/login');
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
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
	$rootScope.isLoading = false;
});