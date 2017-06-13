'use strict';
angular.module('myApp.ForgotPwd', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Forgot Password Route
	$routeProvider.when('/forgetpwd', {
		templateUrl: '/ng/views/forgetpwd.html', 
		controller: 'ForgetPwdController',
		requireLogin: false,
		title: 'Forget Password',
	});
})

.controller('ForgetPwdController', function($rootScope, $scope, $location, $cookieStore, AuthService, AlertService){
	$rootScope.isLoading = true;
	if($cookieStore.get('authuser')){ $location.path("/"); }
	$scope.forgetpwd = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			AuthService.forgetPassword(data).success(function(res, status){
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
	}
	$rootScope.isLoading = false;
});