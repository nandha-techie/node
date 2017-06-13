'use strict';
angular.module('myApp.Profile', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Profile
	$routeProvider.when('/profile', {
		templateUrl: '/ng/views/profile.html',
		controller: 'ProfileController',
		requireLogin: true,
		title: "Profile",
	});
})

.controller('ProfileController', function($rootScope, $cookieStore, $location, $scope, ModeratorService, AlertService, $compile){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	ModeratorService.getInfo().success(function(res, status){
		$scope.authuser = res.user;
		$scope.authuser.participantLogin = String($scope.authuser.participantLogin);
		$cookieStore.put('authuser', res.user);
		$scope.authuser.password_confirmation = null;
	}).error(function(error, status){
		$rootScope.isLoading = false;
		if (status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else{
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
			ModeratorService.updateInfo(data).success(function(res, status){
				var user = res.user;
				user.room = res.room;
				$cookieStore.put('authuser', user);
				AlertService.success(res.message);
				$rootScope.$broadcast("updateUser");
				$location.path("/");
			}).error(function(error, status){
				$rootScope.isLoading = false;
				if (status == 401){
					$cookieStore.remove('authuser');
					$location.path("/login");
				}else{
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
});