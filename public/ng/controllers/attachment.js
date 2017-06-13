'use strict';
var app = angular.module('myApp.Attachment', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Create New Attachment
	$routeProvider.when('/library/attachment/new', {
		templateUrl: '/ng/views/new_attachment.html',
		controller: 'CreateAttachment',
		requireLogin: true,
		title: 'Create New Attachment',
	})
	// Create Nested Attachment
	.when('/library/attachment/:folderId/new', {
		templateUrl: '/ng/views/new_attachment.html',
		controller: 'CreateNestedAttachment',
		requireLogin: true,
		title: 'Create Nested Attachment',
	})
	// Add Sensible Zone
	.when("/library/image/:imageId/addsensible", {
		templateUrl: '/ng/views/addsensible.html',
		controller: 'AddSensibleZone',
		requireLogin: true,
		title: 'Add Sensible Zone',
	});
});

var controller = function($rootScope, $cookieStore, $scope, $routeParams, $route, $location, ngDialog, AlertService, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	$scope.documentData = {};
	$scope.documentData.isFile = true;
	$scope.fileType = { error: false };
	$scope.changeFile = function(isFile){
		$scope.documentData.file = null;
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
		$location.path("/library");
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.Handler = function(Handler){
		$rootScope.isLoading = true;
		Handler.success(function(res, status){
			AlertService.success(res.message);
			if(res.fileType == "image"){
				$scope.file = res.attachment;
				ngDialog.open({ scope: $scope, template: '/ng/views/confirm_marker.html', className: 'ngdialog-theme-plain', showClose: false, closeByEscape: false, });
				$rootScope.isLoading = false;
			}else{
				$location.path("/library");
			}
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove('authuser');
				$location.path("/login");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
			}else{
				$rootScope.isLoading = false;
				AlertService.error(error.error);
			}
		});
	};
	$scope.createAttachment = function(data, file){
		if($scope.folderId){
			$scope.Handler(LibraryService.createNestedAttachment($scope.folderId, data, file));
		}else{
			$scope.Handler(LibraryService.createAttachment(data, file));
		}
	};
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			if($scope.documentData.isFile){
				$scope.file = data.file[0];
				var validExt = ['pdf', 'doc', 'docx', 'jpg', 'png', 'ppt', 'pptx', 'zip'];
				if($scope.file && $scope.file.name && validExt.indexOf($scope.file.name.split(".").pop()) != -1){
					$scope.fileType.error = false;
					$scope.createAttachment(data, $scope.file);
				}else{
					$scope.fileType.error = true;
				}
			}else{
				$scope.createAttachment(data, new Blob(['Im a pretend file for specs']));
			}
		}
	};
	$scope.addsensible = function(file){
		ngDialog.close($scope.dialog.attr('id'));
		if(file.attachment.fileType == "image"){
			$location.path("/library/image/" + file._id + "/addsensible");
		}
	};
	$rootScope.isLoading = false;
};

app.controller('CreateAttachment', controller).controller('CreateNestedAttachment', controller)

.controller("AddSensibleZone", function($rootScope, $cookieStore, $scope, $routeParams, $route, $location, ngDialog, AlertService, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.imageId = $scope.imageId = $routeParams.imageId;
	$scope.view = false;
	LibraryService.getAttachment($scope.imageId).success(function(res, status){
		$scope.attachment = res.file;
		$scope.count = res.file.attachment.marker;
		if($scope.attachment.attachment.fileType != 'image'){
			$location.path("/library");
		}
		$scope.view = true;
		$rootScope.isLoading = false;
	}).error(function(error, status){
		if(status == 401){
			$cookieStore.remove('authuser');
			$location.path("/login");
		}else if(status == 404){
			AlertService.error(error.error);
			$location.path('/library');
		}else{
			$rootScope.isLoading = false;
			AlertService.error(error.error);
		}
	});
	$scope.addMarkar = function(){
		$scope.count = $scope.image.imgNotes("count");
		$scope.image.imgNotes("option", "canEdit", true);
	};
	$scope.saveImage = function(){
		html2canvas($('.viewport'), {
			onrendered: function(canvas){
				var img = canvas.toDataURL();
				var imgTag = "<img src='"+img+"'/>";
				$('#output-img').html(imgTag);
				$rootScope.isLoading = true;
				LibraryService.AddSensibleZone($scope.imageId, { image: img, marker: $scope.count, }).success(function(res, status){
					AlertService.success(res.message);
					$location.path("/library");
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove('authuser');
						$location.path("/login");
					}else if(status == 404){
						AlertService.error(error.error);
						$location.path('/library');
					}else{
						$rootScope.isLoading = false;
						AlertService.error(error.error);
					}
				});
			}
		});
	};
	$scope.AddImage = function(image){
		$scope.image = image;
	};
});