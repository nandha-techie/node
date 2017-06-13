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
	'myApp.Student',
	'myApp.ResetPassword',
	'myApp.ForgotPwd',
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
		if(next.requireLogin && !$cookieStore.get('participantUser')){
			$location.path("/room");
		}else if($cookieStore.get('participantUser')){
			if(!next.requireLogin){
				$location.path("/");
			}else if($cookieStore.get('participantUser').locked){
				$location.path("/locked");
			}
		}
	});
})

.controller('AppController', function($rootScope, $cookieStore, $scope, $location, $route, $timeout, $http, UserService, AlertService, Socket, SocketService, ActivityService){
	if (!window.location.origin){
		window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
	}
	$rootScope.authuser = $cookieStore.get('participantUser');
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
		$rootScope.isLoading = true;
		$cookieStore.remove('participantUser');
		$cookieStore.remove('connect.sid');
		var cookies = document.cookie.split(";");
		for (var i = 0; i < cookies.length; i++){
			var cookie = cookies[i];
			var eqPos = cookie.indexOf("=");
			var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
			document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
		}
		window.location = window.location.origin + '/participant/logout';
	};
	$scope.$on("updateUser", function(event){
		$rootScope.authuser = $cookieStore.get('participantUser');
	});
	$scope.getVersion();
	$scope.postActiveLogins = function(){
		/*UserService.postLoginInfo().error(function(error, status){
			if(status == 401){
				$cookieStore.remove('participantUser');
				$location.path("/");
			}
		});*/
		Socket.emit('updateLogin', $cookieStore.get('participantUser'));
		$scope.mytimeout = $timeout($scope.postActiveLogins, (1000 * 120));
	};
	Socket.on("participantLogOut", function(){
		$scope.logout();
	});
	UserService.getInfo().success(function(res, status){
		$scope.authuser = res.user;
		$timeout.cancel($scope.mytimeout);
		$scope.postActiveLogins();
		$cookieStore.put('participantUser', res.user);
		SocketService.addUser(res.user);
		$route.reload();
	}).error(function(error, status){
		if (status == 401 && $cookieStore.get('participantUser')){
			$cookieStore.remove('participantUser');
			$location.path("/room");
		}
	});
});