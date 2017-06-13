'use strict';
angular.module('myApp.Student', [
	'ngMessages',
	'ngRoute',
	'ngCookies',
	'validation.match',
])
// 
.config(function($routeProvider){
	// Validate Room Code
	$routeProvider.when('/room', {
		templateUrl: '/ng_student/views/room.html',
		controller: 'RoomController',
		requireLogin: false,
		title: 'Student Room',
	})
	// Login by User Name Only
	.when('/room/:roomCode/login1', {
		templateUrl: '/ng_student/views/login1.html',
		controller: 'LoginController',
		requireLogin: false,
		title: 'Student Login',
	})
	// Login by User Name and PIN
	.when('/room/:roomCode/login2', {
		templateUrl: '/ng_student/views/login2.html',
		controller: 'LoginController',
		requireLogin: false,
		title: 'Student Login',
	})
	// Login by User Name and Password
	.when('/room/:roomCode/login3', {
		templateUrl: '/ng_student/views/login3.html',
		controller: 'LoginController',
		requireLogin: false,
		title: 'Student Login',
	})
})
// 
.controller('RoomController', function($rootScope, $location, $scope, $cookieStore, UserService, AuthService, AlertService){
	$rootScope.isLoading = true;
	$scope.login = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			AuthService.checkRoom(data).success(function(res, status){
				if(res.room.participantLogin == 0){
					$location.path('/room/' + res.room.code + '/login1');
				}else if(res.room.participantLogin == 1){
					$location.path('/room/' + res.room.code + '/login2');
				}else if(res.room.participantLogin == 2){
					$location.path('/room/' + res.room.code + '/login3');
				}
			}).error(function(error, status){
				if(status == 409){
					$location.path("/");
				}
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			});
		}
	};
	if($cookieStore.get('participantUser')){ $location.path("/"); }
	$rootScope.isLoading = false;
})
// 
.controller('LoginController', function($rootScope, $location, $scope, $routeParams, $cookieStore, UserService, AuthService, AlertService){
	$rootScope.isLoading = true;
	$rootScope.roomCode = $scope.roomCode = $routeParams.roomCode;
	if(!$routeParams.roomCode || $routeParams.roomCode.length != 6){ $location.path("/room"); }
	$scope.Handler = function(Handler){
		$rootScope.isLoading = true;
		Handler.success(function(res, status){
			$rootScope.authuser = res.user;
			$cookieStore.remove('authuser');
			$cookieStore.put('participantUser', res.user);
			window.location.reload();
		}).error(function(error, status){
			if(status == 409){
				$location.path("/");
			}
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		});
	};
	$scope.loginByEmail = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$scope.Handler(AuthService.loginByEmail($scope.roomCode, data));
		}
	};
	$scope.loginByPin = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			data.pin = data.pin1 + data.pin2 + data.pin3 + data.pin4;
			$scope.Handler(AuthService.loginByPin($scope.roomCode, data));
		}
	};
	$scope.loginByPassword = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$scope.Handler(AuthService.loginByPassword($scope.roomCode, data));
		}
	};
	$scope.goBack = function(){
		$location.path("/room");
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	if($cookieStore.get('participantUser')){ $location.path("/"); }
	$rootScope.isLoading = false;
})