'use strict';
angular.module('myApp.Dashboard', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])
// 
.config(function($routeProvider){
	// Participant Login Route
	$routeProvider.when('/', {
		templateUrl: '/ng_student/views/dashboard.html',
		controller: 'DashboardController',
		requireLogin: true,
		title: 'Participant Dashboard',
	});
})
// 
.controller('DashboardController', function($rootScope, $scope, $location, $route, $cookieStore, AlertService, ActivityService, Socket){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('participantUser')){ $location.path("/login"); }
	$scope.colors = ["#5B9BD5", "#ED7D31", "#FFCDD2", "#EC407A", "#B71C1C", "#CE93D8",
		"#9C27B0", "#5E35B1", "#5C6BC0", "#283593", "#42A5F5", "#1976D2", "#4FC3F7",
		"#80DEEA", "#00BCD4", "#00838F", "#004D40", "#81C784", "#388E3C", "#33691E",
		"#D4E157", "#827717", "#BCAAA4", "#795548", "#3E2723", "#212121", "#A5A5A5"];
	$scope.doughnutData = [];
	$scope.paginate = function(){
		ActivityService.FindAllQuiz(1).success(function(res, status){
			if(res.result){
				$scope.result = true;
				$scope.count = res.count;
				$scope.question = res.question;
				$scope.activity = res.activity;
				$scope.notAnswerd = res.notAnswerd;
				for (var i = 0; i < $scope.question.options.length; i++){
					var answer = ($scope.question.type == 'free') ? $scope.question.options[i]._id : $scope.question.options[i].value;
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
			}else{
				$scope.result = false;
				$scope.pages = res.pages;
				$scope.total = res.total;
				$scope.currentPage = res.currentPage;
				$scope.activities = res.activities;
				if($scope.activities.length >= 1){
					$location.path('/quiz/' + $scope.activities[0]._id);
				}
			}
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('participantUser');
				$location.path("/room");
			}
			$rootScope.isLoading = false;
		});
	};
	Socket.on("participantActivities", function(){
		if($route.current.$$route.controller == "DashboardController"){
			$scope.paginate();
		}
	});
	Socket.on("participantActivityStatus", function(){
		if($route.current.$$route.controller == "DashboardController"){
			$route.reload();
		}
	});
	$scope.paginate();
});