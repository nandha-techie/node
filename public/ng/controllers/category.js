'use strict';
angular.module('myApp.Category', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Participants Listing
	$routeProvider.when('/category', {
		templateUrl: '/ng/views/category.html',
		controller: 'Category',
		requireLogin: true,
		title: 'Categories',
		reloadOnSearch: false,
	})
	// Create New Category
	.when('/category/new', {
		templateUrl: '/ng/views/new_category.html',
		controller: 'CategoryCreate',
		requireLogin: true,
		title: 'Create Category',
	})
	// Edit an Category by Id
	.when('/category/:categoryId', {
		templateUrl: '/ng/views/edit_category.html',
		controller: 'CategoryEdit',
		requireLogin: true,
		title: 'Edit Category',
	});
})

.controller('Category', function($rootScope, $cookieStore, $scope, $http, $route, $location, CategoryServeice, AlertService, ngDialog){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
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
})

.controller('CategoryEdit', function($rootScope, $cookieStore, $routeParams, $route, $scope, $location, CategoryServeice, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.categoryId = $scope.categoryId = $routeParams.categoryId;
	CategoryServeice.FindByID($rootScope.categoryId).success(function(res, status){
		$scope.categoryData = res.data;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 404){
			$location.path("/preferences");
		}else if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else{
			$rootScope.isLoading = false;
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
			CategoryServeice.Update($rootScope.categoryId, data).success(function(res, status){
				AlertService.success(res.message);
				$rootScope.isLoading = false;
				$location.path('/preferences');
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('authuser');
					$location.path("/login");
				}
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			});
		};
	};
	$scope.delete = function(id){
		$rootScope.isLoading = true;
		CategoryServeice.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$location.path("/preferences");
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
})

.controller('CategoryCreate', function($rootScope, $cookieStore, $scope, $location, CategoryServeice, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.categoryData = {};
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			CategoryServeice.Create(data).success(function(res, status){
				AlertService.success(res.message);
				$location.path('/preferences');
				$rootScope.isLoading = false;
			}).error(function(error, status){
				if(status == 401){
					$cookieStore.remove('authuser');
					$location.path('/login');
				}else{
					AlertService.error(error.error);
					$rootScope.isLoading = false;
				}
			});
		};
	};
	$rootScope.isLoading = false;
});