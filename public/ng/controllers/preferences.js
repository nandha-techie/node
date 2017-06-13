'use strict';
angular.module('myApp.Preferences', [
	'ngMessages',
	'ngCookies',
	'ngLocale',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Moderator Login Route
	$routeProvider.when('/preferences', {
		templateUrl: '/ng/views/preferences.html',
		controller: 'Preferences',
		requireLogin: true,
		title: 'Outils & Préférences',
	});
})

.controller('Preferences', function($rootScope, $scope, $route, $location, $cookieStore, $upload, $http, AlertService, DashboardService, CategoryServeice, ngDialog){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.data = {};
	$scope.origin = window.location.origin;
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.file = {};
	$scope.files = {};
	$scope.imageHandler = function(file){
		if(file.size <= 1048576){
			$scope.file = file;
		}else{
			$("#logo").trigger("click");
			AlertService.error("Please Select an image less than 1 Mb");
		}
	};
	$scope.GeneratePIN = function(){
		$scope.pin = (Math.floor(1000 + Math.random() * 9000));
		$scope.room.pin = $scope.data.pin = $scope.pin;
		$scope.pins = ("" + $scope.pin).split("");
	};
	$scope.ClearPIN = function(){
		$scope.data.pin = "0000";
		$scope.pins = "0000".split("");
	};
	$scope.exportReports = function(){
		if($scope.interaction > 0){
			$rootScope.isLoading = true;
			DashboardService.exportReport().success(function(res, status){
				var data = "text/json;charset=utf-8," + encodeURIComponent(res.file);
				var a = document.createElement('a');
				a.href = 'data:' + data;
				a.download = 'reports.json';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/login");
				}else{
					$rootScope.isLoading = false;
					AlertService.error(error.error);
				}
			});
		}
	};
	$scope.getVersion = function(){
		DashboardService.getVersion().then(function(res, status){
			$scope.version = res.data.version;
			$scope.data = res.data.siteinfo;
			$rootScope.$broadcast("updateSiteInfo", res.data.siteinfo);
			DashboardService.getData().success(function(res, status){
				$scope.files = res.files;
				$scope.participants = res.participants;
				$scope.report = res.report;
				$scope.interaction = res.interaction;
				$scope.systems = res.systems;
				$scope.activities = res.activities;
				$scope.recentActivities = res.recents;
				$scope.room = res.room;
				$scope.data.participantLogin = String(res.room.participantLogin);
				$scope.data.pin = $scope.room.pin;
				$scope.pins = ("" + $scope.room.pin).split("");
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove("authuser");
					$location.path("/login");
				}else{
					$rootScope.isLoading = false;
					AlertService.error(error.error);
				}
			});
		});
	};
	$scope.removeLogo = function(){
		$rootScope.isLoading = true;
		$http.put(window.location.origin + '/moderator/siteinfo?' + moment().format("YYYYMMDDHHmmssSS")).success(function(res, status){
			$scope.data = res.siteinfo;
			$rootScope.$broadcast("updateSiteInfo", res.siteinfo);
			$scope.data.pin = $scope.room.pin;
			$scope.data.participantLogin = String($scope.room.participantLogin);
			$scope.pins = ("" + $scope.room.pin).split("");
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.Handler = function(Handler){
		$rootScope.isLoading = true;
		Handler.success(function(res, status){
			AlertService.success(res.message);
			$rootScope.$broadcast("updateSiteInfo", res.siteinfo);
			$scope.data = res.siteinfo;
			$scope.data.pin = $scope.room.pin;
			$scope.data.participantLogin = String(res.room.participantLogin);
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if(data.pin && data.pin != '0000'){
				$rootScope.isLoading = true;
				if($scope.file.name){
					$scope.Handler($upload.upload({
						url: window.location.origin + '/moderator/siteinfo?' + moment().format("YYYYMMDDHHmmssSS"),
						method: 'POST', data: data, file: $scope.file,
					}));
				}else{
					$scope.Handler($http.post(window.location.origin + '/moderator/siteinfo?' + moment().format("YYYYMMDDHHmmssSS"), data));
				}
			}else{
				AlertService.error("Please Generate PIN First");
			}
		}
	};

	$scope.page = $location.search().page ? $location.search().page : 1;
	$scope.paginate = function(page, limit, search){
		$rootScope.isLoading = true;
		CategoryServeice.FindAll(page).success(function(res, status){
			$scope.pages = res.pages;
			$scope.total = res.total;
			$scope.currentPage = res.currentPage;
			$scope.categories = res.categories;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.deleteDialog = function(id, index){
		$scope.id = id;
		$scope.index = index;
		ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
	};
	$scope.delete = function(id, index){
		$rootScope.isLoading = true;
		CategoryServeice.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$scope.categories.splice(index, 1);
			$scope.closeDialog();
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.pagination = function(page){
		$scope.page = page;
		$scope.paginate($scope.page);
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.paginate($scope.page);

	$scope.getVersion();
});