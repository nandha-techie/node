'use strict';
angular.module('myApp.Folder', [
	'ngMessages',
	'ngLocale',
	'ngCookies',
	'ngRoute',
	'validation.match',
	'angularFileUpload',
])

.config(function($routeProvider){
	// Create New Folder
	$routeProvider.when('/library/folder/new', {
		templateUrl: '/ng/views/new_folder.html',
		controller: 'CreateFolderController',
		requireLogin: true,
		title: 'Create New Folder',
	})
	// View Folder
	.when('/library/folder/:folderId', {
		templateUrl: '/ng/views/view_folder.html',
		controller: 'ViewFolderController',
		requireLogin: true,
		title: 'View Folder',
	})
	// Edit Folder
	.when('/library/folder/:folderId/edit', {
		templateUrl: '/ng/views/edit_folder.html',
		controller: 'EditFolderController',
		requireLogin: true,
		title: 'Edit Folder',
	})
	// Create Nested Folder
	.when('/library/folder/:folderId/new', {
		templateUrl: '/ng/views/new_folder.html',
		controller: 'CreateNestedFolder',
		requireLogin: true,
		title: 'Create New Folder',
	})
})

.controller('CreateFolderController', function($rootScope, $cookieStore, $scope, $route, $location, AlertService, ngDialog, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.folderData = {};
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.createFolder(data).success(function(res, status){
				AlertService.success(res.message);
				$location.path('/library');
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
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$rootScope.isLoading = false;
})

.controller('ViewFolderController', function($rootScope, $cookieStore, $routeParams, $scope, $route, $upload, $sce, $location, AlertService, LibraryService, ngDialog, FolderFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	$scope.paginate = function(){
		$rootScope.isLoading = true;
		LibraryService.getFolder($scope.folderId).success(function(res, status){
			$scope.folder = res.folder;
			$scope.Allfiles = res.files;
			$scope.files = [];
			for (var i = 0; i < $scope.Allfiles.length; i++){
				if($scope.Allfiles[i]){
					$scope.files.push($scope.Allfiles[i]);
				}
			}
			FolderFactory.folder = res.folder;
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
	};
	$scope.gotoHome = function(){
		$rootScope.isLoading = true;
		$location.path("/library");
	};
	$scope.gotoFolder = function(folder){
		if(folder.type == 'folder'){
			$rootScope.isLoading = true;
			$location.path("/library/folder/" + folder._id);
		}
	};
	$scope.gotoQuiz = function(quiz){
		if(quiz.type == 'quiz'){
			$rootScope.isLoading = true;
			$location.path("/library/quiz/" + quiz._id + "/edit");
		}
	};
	$scope.goBack = function(folder){
		if(folder.file.type == 'folder'){
			$rootScope.isLoading = true;
			$location.path("/library/folder/" + folder.rootFolder.fileId);
		}
	};
	$scope.export = function(file, fileType){
		if(file.type == 'polls' || file.type == 'quiz'){
			$rootScope.isLoading = true;
			LibraryService.exportQuizPoll(file.type, file._id, fileType).success(function(res, status){
				var a = document.createElement('a');
				if(fileType == 'xml'){
					a.href = 'data:attachment/xml;charset=utf-8,' + encodeURI(res.data);
					a.download = file.name + '.xml';
				}else if(fileType == 'csv'){
					a.href = res.file;
					a.download = file.name + '.csv';
				}
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
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
		}
	};
	$scope.Handler = function(index, Handler){
		$rootScope.isLoading = true;
		Handler.success(function(res, status){
			$scope.files.splice(index, 1);
			AlertService.success(res.message);
			$scope.closeDialog();
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
	};
	$scope.capitalizeFirstLetter = function(string){
		return string.charAt(0).toUpperCase() + string.slice(1);
	};
	$scope.delete = function(){
		$scope.Handler($scope.index, LibraryService["delete" + $scope.capitalizeFirstLetter($scope.document.type)]($scope.document._id));
	}
	$scope.deleteFolder = function(index, Document){
		if(Document.type == 'folder'){
			$scope.index = index;
			$scope.document = Document;
			ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
		}
	};
	$scope.deleteAttachment = function(index, Document){
		if(Document.type == 'document' || Document.type == 'url'){
			$scope.index = index;
			$scope.document = Document;
			ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
		}
	};
	$scope.deleteQuiz = function(index, Document){
		if(Document.type == 'quiz'){
			$scope.index = index;
			$scope.document = Document;
			ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
		}
	};
	$scope.deletePoll = function(index, Document){
		if(Document.type == 'polls'){
			$scope.index = index;
			$scope.document = Document;
			ngDialog.open({ scope: $scope, template: '/ng/views/confirm.html', className: 'ngdialog-theme-plain', });
		}
	};

	$scope.ImportAEF = function(){
		ngDialog.open({ scope: $scope, template: '/ng/views/import.html', className: 'ngdialog-theme-plain', });
	};
	$scope.data = {};
	$scope.uploadfile = {};
	$scope.uploadfiles = {};
	$scope.imageHandler =function(file){
		$scope.uploadfile = file;
	};
	$scope.import = function (form, data) {
		if(form.$valid){
			if($scope.uploadfile && $scope.uploadfile.name && $scope.uploadfile.name.split(".").pop() == 'aef'){
				$rootScope.isLoading = true;
				$upload.upload({
					url: window.location.origin + '/moderator/library/import/' + $scope.folder._id + '/questions',
					method: 'POST',
					file: $scope.uploadfile,
				}).success(function(res, status) {
					$scope.closeDialog();
					AlertService.success(res.message);
					$route.reload();
				}).error(function(error, status){
					if(status == 401){
						$cookieStore.remove("authuser");
						$location.path("/");
					}else{
						$rootScope.isLoading = false;
						AlertService.error(error.error);
					}
				});
			}else{
				$scope.uploadfiles.$error = { required: true };
			}
		}
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};

	$scope.closeDialog = function(){
		ngDialog.close($scope.dialog.attr('id'));
	};
	$rootScope.$on('ngDialog.opened', function(e, $dialog){
		$scope.dialog = $dialog;
	});
	$scope.gotoPoll = function(poll){
		if(poll.type == 'polls'){
			$rootScope.isLoading = true;
			$location.path("/library/poll/" + poll._id + "/edit");
		}
	};
	$scope.updateLibraries = function(folder, quiz, poll, attachment){
		$scope.files = [];
		for (var i = 0; i < $scope.Allfiles.length; i++){
			if(folder && $scope.Allfiles[i].type == 'folder'){ $scope.files.push($scope.Allfiles[i]); }
			if(quiz && $scope.Allfiles[i].type == 'quiz'){ $scope.files.push($scope.Allfiles[i]); }
			if(poll && $scope.Allfiles[i].type == 'polls'){ $scope.files.push($scope.Allfiles[i]); }
			if(attachment && $scope.Allfiles[i].type == 'document'){ $scope.files.push($scope.Allfiles[i]); }
		}
		if(!folder && !quiz && !poll && !attachment){
			for (var i = 0; i < 8; i++){
				if($scope.Allfiles[i]){
					$scope.files.push($scope.Allfiles[i]);
				}
			}
		}
	};
	$scope.stopActivity = function(file, index){
		$rootScope.isLoading = true;
		LibraryService.stopActivity(file.type, file._id).success(function(res, status){
			AlertService.success(res.message);
			$scope.files[index].start = false;
			$rootScope.$broadcast("urlPath", "live");
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.startActivity = function(file, index, option, feedback, random){
		$rootScope.isLoading = true;
		LibraryService.startActivity(file.type, file._id, { option: option, feedback: feedback, random: random, }).success(function(res, status){
			AlertService.success(res.message);
			var urlPath = "activity/" + res.activity._id + "/question/" + res.questions[0]._id;
			$rootScope.$broadcast("urlPath", urlPath);
			$location.path(urlPath);
			for (var i = 0; i < $scope.files.length; i++){
				$scope.files[i].start = false;
			}
			$scope.files[index].start = true;
			$rootScope.isLoading = false;
		}).error(function(error, status){
			if(status == 401){
				$cookieStore.remove("authuser");
				$location.path("/");
			}else if(status == 404){
				AlertService.error(error.error);
				$location.path('/library');
			}else{
				AlertService.error(error.error);
				$rootScope.isLoading = false;
			}
		});
	};
	$scope.viewDocument = function(file){
		$scope.attachmentImage = false;
		$scope.attachmentPdf = false;
		$scope.attachmentUrl = false;
		$scope.attachmentVideo = false;
		if(file.type == 'document' || file.type == 'url'){
			$rootScope.isLoading = true;
			LibraryService.getAttachment(file._id).success(function(res, status){
				$scope.attachment = res.file;
				if($scope.attachment.attachment.fileType == 'doc' || $scope.attachment.attachment.fileType == 'ppt'){
					$window.open(window.location.origin + '/attachments/' + $scope.attachment.attachment.file, '_blank');
				}else if($scope.attachment.attachment.fileType == 'video'){
					$scope.attachmentVideo = true;
					$scope.config = {
						sources: [{
							src: $sce.trustAsResourceUrl(window.location.origin + $scope.attachment.attachment.path),
							type: "video/" + $scope.attachment.attachment.extension
						}],
						theme: "/bower_components/videogular-themes-default/videogular.min.css",
					};
					ngDialog.open({ scope: $scope, template: '/ng/views/document.html', className: 'ngdialog-theme-plain', });
				}else{
					$scope.attachmentPdf = ($scope.attachment.attachment.fileType == 'pdf') ? true : false;
					$scope.attachmentUrl = ($scope.attachment.attachment.fileType == 'url') ? true : false;
					$scope.attachmentImage = ($scope.attachment.attachment.fileType == 'image') ? true : false;
					if($scope.attachment.attachment.fileType != 'url'){
						$scope.content = window.location.origin + '/attachments/' + $scope.attachment.attachment.file;
					}
					ngDialog.open({ scope: $scope, template: '/ng/views/document.html', className: 'ngdialog-theme-plain', });
				}
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
		}
	};
	$scope.paginate();
})

.controller('EditFolderController', function($rootScope, $cookieStore, $routeParams, $scope, $route, $location, AlertService, LibraryService){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.folderData = {};
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	$scope.update = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.postEditFolder($scope.folderId, data).success(function(res, status){
				AlertService.success(res.message);
				$location.path('/library');
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
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$scope.paginate = function(){
		$rootScope.isLoading = true;
		LibraryService.getEditFolder($scope.folderId).success(function(res, status){
			$scope.folderData = res.file;
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
	};
	$scope.deleteFolder = function(folder){
		if(folder.type == 'folder'){
			$rootScope.isLoading = true;
			LibraryService.deleteFolder(folder._id).success(function(res, status){
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
	};
	$scope.paginate();
})

.controller('CreateNestedFolder', function($rootScope, $cookieStore, $routeParams, $scope, $route, $location, AlertService, LibraryService, FolderFactory){
	$rootScope.isLoading = true;
	if(!$cookieStore.get('authuser')){ $location.path("/login"); }
	$scope.folderData = {};
	$scope.folder = (FolderFactory.folder) ? FolderFactory.folder : null;
	$rootScope.folderId = $scope.folderId = $routeParams.folderId;
	$scope.create = function(form, data){
		angular.forEach(form.$error, function(field){
			angular.forEach(field, function(errorField){
				errorField.$setTouched();
			});
		});
		if(form.$valid){
			$rootScope.isLoading = true;
			LibraryService.createNestedFolder($scope.folderId, data).success(function(res, status){
				AlertService.success(res.message);
				if(FolderFactory.folder){
					$location.path("/library/folder/" + FolderFactory.folder.fileId);
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
		}
	};
	$scope.isEmpty = function(obj){
		for(var prop in obj) if(obj.hasOwnProperty(prop)) return true;
		return false;
	};
	$rootScope.isLoading = false;
})