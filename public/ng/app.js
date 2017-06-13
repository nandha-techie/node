'use strict';
angular.module('myApp', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
	'ngIdle',
	'ngDialog',
	'videosharing-embed',
	"ngSanitize",
	"com.2fdevs.videogular",
	"com.2fdevs.videogular.plugins.controls",
	"com.2fdevs.videogular.plugins.overlayplay",
	"com.2fdevs.videogular.plugins.poster",
	'myApp.Leader',
	'myApp.ForgotPwd',
	'myApp.LeaderNew',
	'myApp.Dashboard',
	'myApp.Locked',
	'myApp.ResetPassword',
	'myApp.Profile',
	'myApp.Participant',
	'myApp.Library',
	'myApp.Folder',
	'myApp.Attachment',
	'myApp.Quiz',
	'myApp.Poll',
	'myApp.Preferences',
	'myApp.Live',
	'myApp.Report',
	'myApp.Category',
])

.config(function($routeProvider, IdleProvider, KeepaliveProvider){
	// Otherwise Route
	$routeProvider.otherwise({ redirectTo: '/' });
	IdleProvider.idle(300);
	IdleProvider.timeout(5);
	KeepaliveProvider.interval(10);
}).run(function($rootScope, $location, $cookieStore){
	$rootScope.$location = $location;
	$rootScope.$on("$routeChangeStart", function(event, next, current){
		$rootScope.isLoading = true;
		$('*').popover('hide');
		var sitetitle = ($rootScope.siteinfo) ? $rootScope.siteinfo.title : 'Mobiteach';
		$('title').html(next.title + ' | ' + sitetitle);
		if(next.requireLogin && !$cookieStore.get('authuser')){
			$location.path("/login")
		}else if($cookieStore.get('authuser')){
			if(!next.requireLogin){
				$location.path("/")
			}else if($cookieStore.get('authuser').locked){
				$location.path("/locked");
			}
		}
	});
}).controller('AppController', function($rootScope, $scope, $route, $cookieStore, $location, $http, $timeout, Idle, ngDialog, AlertService, DashboardService, Socket, SocketService, ModeratorService){
	if (!window.location.origin){
		window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
	}
	$rootScope.authuser = $cookieStore.get('authuser');
	$scope.getVersion = function(){
		DashboardService.getVersion().then(function(res, status){
			$scope.version = res.data.version;
			$scope.siteinfo = res.data.siteinfo;
			$rootScope.siteinfo = $scope.siteinfo;
			$('title').html($route.current.$$route.title + ' | ' + $scope.siteinfo.title);
		});
	};
	if ($cookieStore.get('authuser') && !$cookieStore.get('authuser').locked){
		Idle.watch();
	}
	$scope.getVersion();
	$scope.logout = function(){
		ngDialog.open({ scope: $scope, template: '/ng/views/logout.html', className: 'ngdialog-theme-plain', });
	};
	$scope.confirmLogout = function(){
		$cookieStore.remove('authuser');
		$cookieStore.remove('connect.sid');
		$rootScope.isLoading = true;
		var cookies = document.cookie.split(";");
		for (var i = 0; i < cookies.length; i++){
			var cookie = cookies[i];
			var eqPos = cookie.indexOf("=");
			var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
			document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
		}
		window.location = window.location.origin + '/moderator/logout';
	};
	$scope.lock = function(){
		if($cookieStore.get('authuser') && $route.current.$$route.controller != "LockedController"){
			var user = $cookieStore.get('authuser');
			$rootScope.isLoading = true;
			$http.post(window.location.origin + '/moderator/lock', user).success(function(res, status){
				$rootScope.authuser = res.user;
				$cookieStore.remove('participantUser');
				$cookieStore.remove('authuser');
				$cookieStore.put('authuser', res.user);
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
		}
	};
	$scope.$on('IdleTimeout', function(){
		console.log("IdleTimeout");
		$scope.lock();
	});
	$scope.$on("updateUser", function(event){
		$rootScope.authuser = $cookieStore.get('authuser');
	});
	$scope.$on("updateSiteInfo", function(event, siteinfo){
		$scope.siteinfo = siteinfo;
		$rootScope.siteinfo = siteinfo;
		$('title').html($route.current.$$route.title + ' | ' + $scope.siteinfo.title);
	});
	$scope.dashboardTab = function(route){
		if ($route.current && $route.current.$$route){
			return ['DashboardController', 'ProfileController'].indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.participantTab = function(route){
		if ($route.current && $route.current.$$route){
			return ['ParticipantController', 'ParticipantCreate', 'ParticipantEdit'].indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.libraryTab = function(route){
		if ($route.current && $route.current.$$route){
			var arr = [
				'LibraryController',
				'CreateFolderController',
				'ViewFolderController',
				'EditFolderController',
				'CreateAttachment',
				'CreateNestedFolder',
				'CreateNestedAttachment',
				'CreateQuiz',
				'CreateNestedQuiz',
				'EditQuiz',
				'CreateQuestion',
				'EditQuestion',
				'PollCreate',
				'NestedPollCreate',
				'EditPoll',
				'CreatePollQuestion',
				'EditPollQuestion',
				'AddSensibleZone',
			];
			return arr.indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.preferencesTab = function(route){
		if ($route.current && $route.current.$$route){
			// var arr = ['Preferences'];
			var arr = ['Preferences', 'CategoryCreate', 'CategoryEdit'];
			return arr.indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.liveTab = function(route){
		if ($route.current && $route.current.$$route){
			var arr = ['Live'];
			return arr.indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.reportTab = function(route){
		if ($route.current && $route.current.$$route){
			var arr = ['Report', 'ActivityReport', 'LiveReport', 'ReportSignature'];
			return arr.indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.categoryTab = function(route){
		if ($route.current && $route.current.$$route){
			var arr = ['Category', 'CategoryCreate', 'CategoryEdit'];
			return arr.indexOf($route.current.$$route.controller) > -1;
		}
		return false;
	};
	$scope.getActiveLogins = function(){
		Socket.emit("getActiveParticipant", $cookieStore.get("authuser"));
		$scope.mytimeout = $timeout($scope.getActiveLogins, (1000 * 60));
	};
	Socket.on("activeParticipants", function(){
		if($cookieStore.get('authuser') && !$cookieStore.get('authuser').locked){
			$timeout.cancel($scope.mytimeout);
			$scope.getActiveLogins();
		}
	});
	Socket.on("ActiveParticipant", function(logins){
		$scope.logins = logins;
		$scope.activeLogin = $scope.logins.length;
	});
	$scope.openModal = function(size, templateName){
		ngDialog.open({ scope: $scope, template: '/ng/views/clearRoom.html', className: 'ngdialog-theme-plain', });
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.clearRoom = function(){
		$scope.closeDialog();
		$rootScope.isLoading = true;
		$http.post(window.location.origin + '/moderator/logoutparticipants?' + moment().format("YYYYMMDDHHmmssSS")).success(function(res, status){
			AlertService.success(res.message);
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/");
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.urlPath = "live";
	$scope.$on("urlPath", function(event, urlPath){ $scope.urlPath = urlPath; });
	ModeratorService.getInfo().success(function(res, status){
		$rootScope.authuser = res.user;
		$cookieStore.put('authuser', res.user);
		SocketService.addUser(res.user);
		if($cookieStore.get('authuser') && !$cookieStore.get('authuser').locked){
			$timeout.cancel($scope.mytimeout);
			$scope.getActiveLogins();
		}
		$route.reload();
	}).error(function(error, status){
		if (status == 401 && $cookieStore.get('authuser')){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}
	});
});