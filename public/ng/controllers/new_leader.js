'use strict';
angular.module('myApp.LeaderNew', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Register/Signup Route
	$routeProvider.when('/new_leader', {
		templateUrl: '/ng/views/new_leader.html',
		controller: 'LeaderAccountController',
		requireLogin: false,
		title: 'Moderator Register',
	})
})

.controller('LeaderAccountController', function($rootScope, $scope, $cookieStore, $location, AuthService, AlertService){
	$rootScope.isLoading = true;
	if($cookieStore.get('authuser')){ $location.path("/"); }
	$scope.leader = {};
	$scope.emailPattern = /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/;
	$scope.leader.language = "fr";
	$scope.register = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			AuthService.register(data).success(function(res, status){
				AlertService.success(res.message);
				$location.path('/login');
			}).error(function(error, status){
				if(status == 409){
					$location.path('/');
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}
	};
	$rootScope.isLoading = false;
});