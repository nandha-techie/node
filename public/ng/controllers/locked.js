'use strict';
angular.module('myApp.Locked', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Login Route
	$routeProvider.when('/locked', {
		templateUrl: '/ng/views/locked.html',
		controller: 'LockedController',
		requireLogin: true,
		title: 'User Locked',
	});
})

.controller('LockedController', function($rootScope, $scope, $location, $http, $cookieStore, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){
		$location.path("/login");
	}
	if ($cookieStore.get('authuser') && !$cookieStore.get('authuser').locked){
		$location.path("/");
	}
	$scope.authuser = $cookieStore.get('authuser');
	$rootScope.isLoading = false;
	$scope.unlock = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			data._id = $scope.authuser._id;
			$rootScope.isLoading = true;
			$http.post(window.location.origin + '/moderator/unlock', data).success(function(res, status){
				$rootScope.authuser = res.user;
				$cookieStore.remove('participantUser');
				$cookieStore.remove('authuser');
				$cookieStore.put('authuser', res.user);
				// AlertService.success(res.message);
				window.location.reload();
			}).error(function(error, status){
				if(status == 409){
					$location.path('/');
				}
				if (status == 401){
					$cookieStore.remove('authuser');
					$location.path("/login");
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		};
	};
});