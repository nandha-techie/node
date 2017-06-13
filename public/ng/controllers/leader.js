'use strict';
angular.module('myApp.Leader', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Login Route
	$routeProvider.when('/login', {
		templateUrl: '/ng/views/leader.html',
		controller: 'leaderController',
		requireLogin: false,
		title: 'Moderator Login',
	});
})

.controller('leaderController', function($rootScope, $scope, $location, $cookieStore, AuthService, AlertService){
	$rootScope.isLoading = true;
	$scope.login = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			AuthService.login(data).success(function(res, status){
				$rootScope.authuser = res.user;
				$cookieStore.remove('participantUser');
				$cookieStore.put('authuser', res.user);
				$rootScope.$broadcast("Login", res.user);
				window.location.reload();
			}).error(function(error, status){
				if(status == 409){
					$location.path('/');
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}
	};
	if($cookieStore.get('authuser')){ $location.path("/"); }
	$rootScope.isLoading = false;
});