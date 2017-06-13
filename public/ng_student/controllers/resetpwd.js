'use strict';
angular.module('myApp.ResetPassword', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])
// 
.config(function($routeProvider){
	// Reset Password Route
	$routeProvider.when('/resetpwd/:token', {
		controller: 'ResetPassword',
		templateUrl: '/ng_student/views/resetpwd.html',
		requireLogin: false,
		title: "Reset Password",
	})
})
// 
.controller("ResetPassword", function($scope, $rootScope, $cookieStore, $routeParams, $route, $location, AlertService, ResetPwdService){
	$scope.token = $routeParams.token;
	$rootScope.isLoading = true;
	if($cookieStore.get('participantUser')){ $location.path("/"); }
	$scope.participantId = null;
	ResetPwdService.getInfo($scope.token).success(function(res, status){
		$scope.participantId = res.data.participantId;
		$rootScope.isLoading = false;
		AlertService.success(res.message);
	}).error(function(error, status){
		if(status == 409){
			$location.path('/');
		}
		AlertService.error(error.error);
		$location.path('/forgetpwd');
	});
	$scope.resetpwd = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if ($scope.participantId == null){
			$location.path('/forgetpwd');
		}else if(form.$valid){
			$rootScope.isLoading = true;
			data.participantId = $scope.participantId;
			ResetPwdService.postInfo($scope.token, data).success(function(res, status){
				AlertService.success(res.message);
				$location.path('/');
			}).error(function(error, status){
				if(status == 409){
					$location.path('/');
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}
	};
});