'use strict';
angular.module('myApp.Report', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Reports Listing
	$routeProvider.when('/report', {
		templateUrl: '/ng/views/report.html',
		controller: 'Report',
		requireLogin: true,
		title: 'Reports',
	})
	// Session Signature
	.when('/report/:statusId/upload', {
		templateUrl: '/ng/views/signature.html',
		controller: 'ReportSignature',
		requireLogin: true,
		title: 'Report Signature',
	})
	// Report  Summary
	.when('/report/:statusId/summary', {
		templateUrl: '/ng/views/activity_summary.html',
		controller: 'ActivityReport',
		requireLogin: true,
		title: 'Activity Summary',
	})
	// Report  Summary
	.when('/report/:statusId/summary/:questionId', {
		templateUrl: '/ng/views/question_summary.html',
		controller: 'LiveReport',
		requireLogin: true,
		title: 'Activity Summary',
	})
})

.controller('Report', function($rootScope, $scope, $location, $cookieStore, AlertService, ngDialog, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	var current = $location.url();
	$scope.page = $location.search().page ? $location.search().page : 1;
	$scope.$on('spliceActivity', function(event, index){
		$scope.activities.splice(index, 1);
	});
	$scope.$on('spliceParticipantActivity', function(event, key, index){
		$scope.activities[index].participantStatus.splice(key, 1);
	});
	$scope.paginate = function(page){
		$location.search({ page: page, });
		$rootScope.isLoading = true;
		LibraryService.Reports(page).success(function(res, status){
			$scope.pages = res.pages;
			$scope.total = res.total;
			$scope.currentPage = res.currentPage;
			$scope.activities = res.activities;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/");
			}
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		});
	};
	$scope.deleteReport = function(id, key, index){
		$scope.id = id;
		$scope.key = key;
		$scope.index = index;
		ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.delete = function(){
		$scope.closeDialog();
		$rootScope.isLoading = true;
		LibraryService.deleteParticipantActivityStatus($scope.id).success(function(res, status){
			AlertService.success(res.message);
			$scope.activities[$scope.index].participantStatus.splice($scope.key, 1);
			if($scope.activities[$scope.index].participantStatus.length <= 0){
				$scope.activities.splice($scope.index, 1);
			};
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.paginate($scope.page);
})
.controller('ActivityReport', function($rootScope, $cookieStore, $routeParams, $scope, $location, LibraryService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.statusId = $scope.statusId = $routeParams.statusId;
	LibraryService.ActivitySummary($scope.statusId).success(function(res, status){
		$scope.activity = res.activity;
		$scope.participants = res.participants;
		$scope.questions = res.questions;
		$scope.report = res.report;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove("authuser");
			$location.path("/login");
		}else{
			AlertService.error(error.error);
			$location.path('/report');
		}
	});
})
.controller('ReportSignature', function($rootScope, $cookieStore, $routeParams, $scope, $location, LibraryService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.statusId = $scope.statusId = $routeParams.statusId;	
	LibraryService.ActivitySummary($scope.statusId).success(function(res, status){
		$scope.activity = res.activity;
		$scope.reportData = res.report;
		if($scope.reportData.signature){
			$location.path("/report");
		}else{
			$rootScope.isLoading = false;
		}
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove("authuser");
			$location.path("/login");
		}else{
			AlertService.error(error.error);
			$location.path('/report');
		}
	});

	$scope.reportData = {};
	$scope.fileType = { error: false };
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$scope.file = data.file[0];
			var validExt = ['pdf', 'jpg', 'png'];
			if($scope.file && $scope.file.name && validExt.indexOf($scope.file.name.split(".").pop()) != -1){
				$scope.fileType.error = false;
				$rootScope.isLoading = true;
				LibraryService.reportSignature($scope.statusId, data, $scope.file).success(function(res, status){
					AlertService.success(res.message);
					$location.path("/report");
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove("authuser");
						$location.path("/login");
					}else if(status == 404){
						AlertService.error(error.error);
						$location.path('/report');
					}else{
						$rootScope.isLoading = false;
						AlertService.error(error.error);
					}
				});
			}else{
				$scope.fileType.error = true;
			}
		}
	};
	$scope.changeFile = function(isFile){
		$scope.reportData.file = null;
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
})






.controller('LiveReport', function($rootScope, $scope, $route, $location, $routeParams, $cookieStore, AlertService, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); };
	$scope.colors = ["#5B9BD5", "#ED7D31", "#FFCDD2", "#EC407A", "#B71C1C", "#CE93D8",
		"#9C27B0", "#5E35B1", "#5C6BC0", "#283593", "#42A5F5", "#1976D2", "#4FC3F7",
		"#80DEEA", "#00BCD4", "#00838F", "#004D40", "#81C784", "#388E3C", "#33691E",
		"#D4E157", "#827717", "#BCAAA4", "#795548", "#3E2723", "#212121", "#A5A5A5"];
	$scope.doughnutData = [];
	$scope.isResult = false;
	$rootScope.statusId = $scope.statusId = $routeParams.statusId;
	$rootScope.questionId = $scope.questionId = $routeParams.questionId;
	$scope.getQuestion = function(id, qid){
		$rootScope.isLoading = true;
		LibraryService.ActivityQuestionSummary(id, qid).success(function(res, status){
			$scope.isResult = true;
			$scope.prevQuestion = res.prevQuestion;
			$scope.activity = res.activity;
			$scope.nextQuestion = res.nextQuestion;
			$scope.question = res.question;
			for(var i = 0; i < $scope.question.options.length; i++){
				var color = ($scope.question.options[i].value == 'N/A') ? $scope.colors[26] : $scope.colors[i];
				$scope.doughnutData.push({
					value: $scope.question.options[i].count,
					color: color, highlight: color,
					label: $scope.question.options[i].value,
				});
			}
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
	$scope.getQuestion($rootScope.statusId, $rootScope.questionId);
})