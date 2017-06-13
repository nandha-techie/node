'use strict';
angular.module('myApp.Profile', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])
// 
.config(function($routeProvider){
	// Moderator Profile
	$routeProvider.when('/profile', {
		templateUrl: '/ng_asparticipant/views/profile.html',
		controller: 'ProfileController',
		requireLogin: true,
		title: "Profile",
	});
})
// 
.controller('ProfileController', function($rootScope, $cookieStore, $location, $route, $scope, ParticipantService, AlertService, Socket){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ window.location = window.location.origin + '/moderator'; }
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			ParticipantService.Update(participantId, data).success(function(res, status){
				$rootScope.$broadcast("updateUser", res.participant);
				AlertService.success("Profile Updated Successfully!");
				$location.path("/");
			}).error(function(error, status){
				if (status == 401){
					$cookieStore.remove('authuser');
					window.location = window.location.origin + '/moderator';
				}else{
					AlertService.error(error.error);
					$rootScope.isLoading = false;
				}
			});
		}
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	ParticipantService.FindByID(participantId).success(function(res, status){
		$scope.authuser = res.data;
		$scope.authuser.password = null;
		$scope.authuser.password_confirmation = null;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if (status == 401){
			$cookieStore.remove('authuser');
			window.location = window.location.origin + '/moderator';
		}else{
			AlertService.error(error.error);
		}
		$rootScope.isLoading = false;
	});
});