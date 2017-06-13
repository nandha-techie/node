'use strict';
angular.module('myApp.Dashboard', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Login Route
	$routeProvider.when('/', {
		templateUrl: '/ng/views/dashboard.html',
		controller: 'DashboardController',
		requireLogin: true,
		title: 'Moderator Dashboard',
	});
})

.controller('DashboardController', function($rootScope, $scope, $location, $cookieStore, $timeout, dateFilter, AlertService, DashboardService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); 	}
	$scope.datetime = {};
	$scope.updateTime = function(){
		$timeout(function(){
			$scope.datetime.time = moment.utc().format('hh:mm:ss');
			$scope.datetime.date = moment.utc().locale("fr").format("dddd D MMM YYYY");
			$scope.updateTime();
		},1000);
	};
	$scope.recents = [];
	DashboardService.getData().success(function(res, status){
		$scope.files = res.files;
		$scope.participants = res.participants;
		$scope.report = res.report;
		$scope.interaction = res.interaction;
		$scope.systems = res.systems;
		$scope.activities = res.activities;
		$scope.recentActivities = res.recents;
		for (var i = 0; i < 8; i++){
			if($scope.recentActivities[i]){
				$scope.recents.push($scope.recentActivities[i]);
			}
		}
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
	$scope.showAllActivity = function(){
		$scope.recents = [];
		for (var i = 0; i < $scope.recentActivities.length; i++){
			if($scope.recentActivities[i]){
				$scope.recents.push($scope.recentActivities[i]);
			}
		}
	};
	var user_activities = ["user_create", "user_update", "user_delete", "user_ban", "user_permit", "info_update"];
	var folder_activities = ["folder_create", "folder_update", "folder_delete"];
	var attachment_activities = ["attachment_create", "attachment_delete"];
	var activity_activities = ["activity_create", "activity_start", "activity_stop", "activity_update", "activity_delete"];
	$scope.updateActivities = function(user, folder, attachment, activity){
		$scope.recents = [];
		for (var i = 0; i < $scope.recentActivities.length; i++){
			if(user && (user_activities.indexOf($scope.recentActivities[i].type) >= 0)){
				$scope.recents.push($scope.recentActivities[i]);
			}
			if(folder && (folder_activities.indexOf($scope.recentActivities[i].type) >= 0)){
				$scope.recents.push($scope.recentActivities[i]);
			}
			if(attachment && (attachment_activities.indexOf($scope.recentActivities[i].type) >= 0)){
				$scope.recents.push($scope.recentActivities[i]);
			}
			if(activity && (activity_activities.indexOf($scope.recentActivities[i].type) >= 0)){
				$scope.recents.push($scope.recentActivities[i]);
			}
		}
		if(!user && !folder && !attachment && !activity){
			for (var i = 0; i < 8; i++){
				if($scope.recentActivities[i]){
					$scope.recents.push($scope.recentActivities[i]);
				}
			}
		}
	};
	$scope.updateTime();
});