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
		templateUrl: '/ng_student/views/profile.html',
		controller: 'ProfileController',
		requireLogin: true,
		title: "Profile",
	});
})
// 
.controller('ProfileController', function($rootScope, $cookieStore, $location, $route, $scope, UserService, AlertService, ActivityService, Socket){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('participantUser')){ $location.path("/"); }
	UserService.getInfo().success(function(res, status){
		$scope.authuser = res.user;
		$scope.authuser.password = null;
		$scope.authuser.password_confirmation = null;
		$cookieStore.put('participantUser', res.user);
	}).error(function(error, status){
		$rootScope.isLoading = false;
		if (status == 401){
			$cookieStore.remove('participantUser');
			$location.path("/room");
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
			UserService.updateInfo(data).success(function(res, status){
				var user = res.user;
				user.room = res.room;
				$cookieStore.put('participantUser', user);
				AlertService.success(res.message);
				$rootScope.$broadcast("updateUser");
				$location.path("/");
			}).error(function(error, status){
				$rootScope.isLoading = false;
				if (status == 401){
					$cookieStore.remove('participantUser');
					$location.path("/room");
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
	Socket.on("participantActivities", function(){
		if($route.current.$$route.controller == "ProfileController"){
			$rootScope.isLoading = true;
			ActivityService.FindAllQuiz(1).success(function(res, status){
				if(res.activities.length >= 1){
					$location.path('/quiz/' + res.activities[0]._id);
				}else{
					$location.path("/");
				}
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('participantUser');
					$location.path("/room");
				}
			});
		}
	});
	$rootScope.isLoading = false;
});