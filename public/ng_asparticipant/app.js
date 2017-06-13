'use strict';
angular.module('myApp', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'ngDialog',
	"ngSanitize",
	"com.2fdevs.videogular",
	"com.2fdevs.videogular.plugins.controls",
	"com.2fdevs.videogular.plugins.overlayplay",
	"com.2fdevs.videogular.plugins.poster",
	'videosharing-embed',
	'myApp.Dashboard',
	'myApp.Profile',
	'myApp.Activities',
])
.config(function($routeProvider){
	// Otherwise Route
	$routeProvider.otherwise({ redirectTo: '/' });
}).run(function($rootScope, $location, $cookieStore){
	$rootScope.$location = $location;
	$rootScope.$on( "$routeChangeStart", function(event, next, current){
		$('*').popover('hide');
		var sitetitle = ($rootScope.siteinfo) ? $rootScope.siteinfo.title : 'Mobiteach';
		$('title').html(next.title + ' | ' + sitetitle);
		if(next.requireLogin && !$cookieStore.get('authuser')){
			window.location = window.location.origin + '/moderator';
		}else if($cookieStore.get('authuser')){
			if($cookieStore.get('authuser').locked){
				window.location = window.location.origin + '/moderator';
			}
		}
	});
})
.controller('AppController', function($rootScope, $cookieStore, $scope, $location, $route, $timeout, $http, ModeratorService, ParticipantService, AlertService, Socket, SocketService){
	$rootScope.isLoading = true;
	if (!window.location.origin){
		window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
	}
	$scope.getVersion = function(){
		$http.get(window.location.origin + '/version').then(function(res, status){
			$scope.version = res.data.version;
			$scope.siteinfo = res.data.siteinfo;
			$rootScope.siteinfo = $scope.siteinfo;
			$('title').html($route.current.$$route.title + ' | ' + $scope.siteinfo.title);
		});
	};
	$scope.load = function(){
		$route.reload();
	};
	$scope.logout = function(){
		window.location = window.location.origin + '/moderator#/participants';
	};
	$scope.$on("updateUser", function(event, user){
		$rootScope.authuser = user;
		$rootScope.authuser.room = $cookieStore.get('authuser').room;
		$scope.authuser = $rootScope.authuser;
	});
	$scope.getVersion();
	$scope.postActiveLogins = function(){
		Socket.emit('updateLogin', $cookieStore.get('authuser'));
		$scope.mytimeout = $timeout($scope.postActiveLogins, (1000 * 120));
	};
	ModeratorService.getInfo().success(function(res, status){
		$cookieStore.put('authuser', res.user);
		SocketService.addUser(res.user);
	}).error(function(error, status){
		if (status == 401 && $cookieStore.get('authuser')){
			$cookieStore.remove('authuser');
			window.location = window.location.origin + '/moderator';
		}
	});
	ParticipantService.FindByID(participantId).success(function(res, status){
		$scope.authuser = res.data;
		$scope.authuser.room = $cookieStore.get('authuser').room;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if (status == 401 && $cookieStore.get('authuser')){
			$cookieStore.remove('authuser');
			window.location = window.location.origin + '/moderator';
		}
	});
});