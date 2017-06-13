'use strict';
angular.module('myApp.Participant', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Participants Listing
	$routeProvider.when('/participants', {
		templateUrl: '/ng/views/participants.html',
		controller: 'ParticipantController',
		requireLogin: true,
		title: 'Participants',
		reloadOnSearch: false,
	})
	// Create New Participant
	.when('/participants/new', {
		templateUrl: '/ng/views/new_participant.html',
		controller: 'ParticipantCreate',
		requireLogin: true,
		title: 'Create Participant',
	})
	// Edit an Participant by Id
	.when('/participants/:participantId', {
		templateUrl: '/ng/views/edit_participant.html',
		controller: 'ParticipantEdit',
		requireLogin: true,
		title: 'Edit Participant',
	});
})

.controller('ParticipantController', function($rootScope, $cookieStore, $scope, $http, $route, $location, ParticipantService, AlertService, ngDialog){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.$on('spliceStudent', function(event, index){
		$scope.participants.splice(index, 1);
	});
	$scope.limit = $location.search().limit ? $location.search().limit : '5';
	$scope.page = $location.search().page ? $location.search().page : 1;
	$scope.search = ($location.search().search && typeof $location.search().search != "boolean") ? $location.search().search : '';
	$scope.paginate = function(page, limit, search){
		$rootScope.isLoading = true;
		ParticipantService.FindAll(page, limit, search).success(function(res, status){
			$scope.pages = res.pages;
			$scope.total = res.total;
			$scope.skip = res.skip + 1;
			$scope.record = res.currentPage * res.limit;
			$scope.currentPage = res.currentPage;
			$scope.participants = res.participants;
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
	$scope.Invite = function(participant){
		$rootScope.isLoading = true;
		ParticipantService.Invite(participant._id).success(function(res, status){
			AlertService.success(res.message);
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
		ParticipantService.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$scope.participants.splice(index, 1);
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
	$scope.pagination = function(page, limit){
		$scope.page = page;
		$scope.limit = limit;
		if(limit == -1){ $scope.page = 1; }
		if($scope.search != '' && $scope.search != null){
			$location.search({ limit: $scope.limit, page: $scope.page, search: $scope.search, });
			$scope.paginate($scope.page, $scope.limit, $scope.search);
		}else{
			$location.search({ limit: $scope.limit, page: $scope.page, });
			$scope.paginate($scope.page, $scope.limit);
		}
	};
	$scope.limits = [{ value: 5, label: 5, }, { value: 10, label: 10, }, { value: 15, label: 15, }, { value: 20, label: 20, }, { value: -1, label: "All" }];
	if($scope.limit == -1){
		$scope.page = 1;
		$location.search({ limit: $scope.limit, page: $scope.page, });
	}
	$scope.Search = function(search){
		$scope.search = search;
		$scope.page = 1;
		$location.search({ limit: $scope.limit, page: $scope.page, search: search, });
		$scope.paginate($scope.page, $scope.limit, search);
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.paginate($scope.page, $scope.limit, $scope.search);
	$scope.sortType = '_id'; // set the default sort type
	$scope.sortReverse = false;
})

.controller('ParticipantEdit', function($rootScope, $cookieStore, $routeParams, $route, $scope, $location, ParticipantService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.participantId = $scope.participantId = $routeParams.participantId;
	ParticipantService.FindByID($rootScope.participantId).success(function(res, status){
		$scope.participantData = res.data;
		$scope.participantData.email_confirmation = $scope.participantData.email;
		$scope.participantData.password = $scope.participantData.password_confirmation = null;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 404){
			$location.path("/participants");
		}
		if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}
		$rootScope.isLoading = false;
		AlertService.error(error.error);
	});
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			ParticipantService.Update($rootScope.participantId, data).success(function(res, status){
				AlertService.success(res.message);
				$rootScope.isLoading = false;
				$location.path('/participants');
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
	$scope.ban = function(){
		$rootScope.isLoading = true;
		ParticipantService.Ban($rootScope.participantId).success(function(res, status){
			AlertService.success(res.message);
			$scope.participantData.status = false;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}
			AlertService.error(error.error);
			$rootScope.isLoading = false;
		});
	};
	$scope.permit = function(){
		$rootScope.isLoading = true;
		ParticipantService.Permit($rootScope.participantId).success(function(res, status){
			AlertService.success(res.message);
			$scope.participantData.status = true;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}
			AlertService.error(error.error);
			$rootScope.isLoading = false;
		});
	};
	$scope.delete = function(id){
		$rootScope.isLoading = true;
		ParticipantService.Delete(id).success(function(res, status){
			AlertService.success(res.message);
			$location.path("/participants");
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

.controller('ParticipantCreate', function($rootScope, $cookieStore, $scope, $location, $window, ParticipantService, AlertService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.participantData = {};
	$scope.participantData.language = "fr";
	$scope.participantData.status = "1";
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			ParticipantService.Create(data).success(function(res, status){
				AlertService.success(res.message);
				$rootScope.isLoading = false;
				$location.path('/participants');
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
	};
	$rootScope.isLoading = false;
});