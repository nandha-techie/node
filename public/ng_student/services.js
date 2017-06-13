'use strict';
angular.module('myApp')
// 
.filter('decimalFormat', function(){
	return function(text){
		if(Number(text) === text && parseFloat(text) % 1 === 0){
			return parseInt(text);
		}else{
			return parseFloat(text).toFixed(2).replace(/0+$/, '');
		}
	};
})
// 
.filter('decimalFormat1', function(){
	return function(text){
		if(Number(text) === text && parseFloat(text) % 1 === 0){
			return parseInt(text);
		}else{
			return parseFloat(text).toFixed(1).replace(/0+$/, '');
		}
	};
})
// 
.factory("Socket", function(){
	return io.connect(window.location.origin, { reconnect: true, });
})
// 
.factory("SocketService", function($rootScope, Socket){
	return {
		addUser: function(user){
			Socket.on('connect', function(){
				Socket.emit('adduser', user, user.room.code);
			});
		},
	};
})
// 
.factory('UserService', function($http){
	return {
		getInfo: function(callback){
			return $http.get(window.location.origin + '/participant/profile?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		updateInfo: function(data){
			return $http.post(window.location.origin + '/participant/profile', data);
		},
		postLoginInfo: function(){
			return $http.get(window.location.origin + '/participant/updatelogin?' + moment().format("YYYYMMDDHHmmssSS"));
		},
	};
})
// 
.factory('AuthService', function($http){
	return {
		checkRoom: function(data){
			return $http.post(window.location.origin + '/participant/room', data);
		},
		loginByEmail: function(roomCode, data){
			return $http.post(window.location.origin + '/participant/room/' + roomCode + '/loginByEmail', data);
		},
		loginByPin: function(roomCode, data){
			return $http.post(window.location.origin + '/participant/room/' + roomCode + '/loginByPin', data);
		},
		loginByPassword: function(roomCode, data){
			return $http.post(window.location.origin + '/participant/room/' + roomCode + '/loginByPassword', data);
		},
		forgetPassword: function(data){
			return $http.post(window.location.origin + '/participant/forgotpasswd', data);
		},
	};
})
// Reset Password Sericve
.factory('ResetPwdService', function($http){
	return {
		getInfo: function(token){
			return $http.get(window.location.origin + '/participant/resetpasswd/' + token + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		postInfo: function(token, data){
			return $http.post(window.location.origin + '/participant/resetpasswd/' + token + '?' + moment().format("YYYYMMDDHHmmssSS"), data);
		},
	};
})
// 
.factory('ActivityService', function($http){
	return {
		FindAllQuiz: function(page){
			var page = page || 1;
			return $http.get(window.location.origin + '/participant/activities?page=' + page + '&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		FindAllPolls: function(page){
			var page = page || 1;
			return $http.get(window.location.origin + '/participant/activities?page=' + page + '&' + moment().format("YYYYMMDDHHmmssSS"));
		},
		FindByID: function(id){
			return $http.get(window.location.origin + '/participant/activity/' + id + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		postByID: function(id, data){
			return $http.post(window.location.origin + '/participant/activity/' + id, data);
		},
		FindByQID: function(activityId, questionId){
			return $http.get(window.location.origin + '/participant/activity/' + activityId + '/' + questionId + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
		questionResult: function(id, qid){
			return $http.get(window.location.origin + '/participant/activity/' + id + '/question/' + qid + '?' + moment().format("YYYYMMDDHHmmssSS"));
		},
	};
})
// Alert Messages Sericve
.factory('AlertService', function(){
	var displayNoty = function(message, type, layout, timeout){
		$.noty.closeAll();
		noty({ text: message, type: type, layout: layout, timeout: timeout, });
	};
	return {
		displayNoty: function(message, type, layout, timeout){
			displayNoty(message, type, layout, timeout);
		},
		success: function(message){
			displayNoty(message, 'success', 'topRight', 5000);
		},
		error: function(message){
			displayNoty(message, 'error', 'topRight', 5000);
		},
		info: function(message){
			displayNoty(message, 'information', 'topRight', 5000);
		},
		progressInfo: function(message){
			displayNoty(message, 'information', 'topRight', 5000);
		},
		warning: function(message){
			displayNoty(message, 'warning', 'topRight', 5000);
		},
	};
})
// 
.directive('capitalize', function(){
	return {
		require: 'ngModel',
		link: function(scope, element, attrs, modelCtrl){
			var capitalize = function(inputValue){
			if(inputValue == undefined) inputValue = '';
				var capitalized = inputValue.toUpperCase();
				if(capitalized !== inputValue){
					modelCtrl.$setViewValue(capitalized);
					modelCtrl.$render();
				}         
				return capitalized;
			}
			modelCtrl.$parsers.push(capitalize);
			capitalize(scope[attrs.ngModel]);  // capitalize initial value
		}
	};
})
.directive('custom', ['$parse', function($parse){
	return {
		restrict: 'A',
		require: ['ngModel'],
		link: function(scope, element, attrs, ctrls){
			element.on("input", function(e){
				if(element.val().length == attrs.maxlength){
					var nextinput = element.parent().next('div').children("input");
					if(nextinput.length === 0){
						nextinput = element.parent().parent().parent().next('div').children("input");
					}
					if(nextinput.length){
						nextinput[0].focus();
					}
				}
			});
		}
	}
}])
// 
.directive('switchEdit', function(){
	return{
		type : 'A',
		require: 'ngModel',
    		link : function(scope, element, attrs, ngModel){
			$(element).checkboxpicker({
				style: false,
				defaultClass: 'btn-default',
				disabledCursor: 'not-allowed',
				onClass: 'btn-success',
				offClass: 'btn-danger',
				offLabel: 'Off',
				onLabel: 'Correct',
				offTitle: false,
				onTitle: false,
				reverse: false,
			}).change(function(){
				if(scope.questionData.type == 'multiple'){
					scope.checkbox = $(element).is(":checked");
					$("#radio_" + attrs.radioId).prop('checked', $(element).is(":checked"));
					scope.toggleSelection(attrs.optionValue, $(element).is(":checked"));
				}else{
					$("input[name='answer']").prop('checked', false);
					if(!$(element).is(":checked")){
						for (var i = 0; i < attrs.optionLength; i++){
							if(i != parseInt(attrs.radioId)){
								$('#switch_' + i).prop('checked', true);
							}
						}
						$("#radio_" + attrs.radioId).prop('checked', true);
					}
					scope.toggleSelection1(attrs.optionValue, !$(element).is(":checked"));
				}
				ngModel.$setViewValue($(element).is(":checked"));
			});
		},
	}
})
// 
.directive('rating', function(){
	return {
		restrict: 'A',
		// require: ['ngModel'],
		link: function(scope, element, attrs, ctrls){
			$(element).raty({
				starHalf : '/assets/images/star-half.png',
				starOff : '/assets/images/star-off.png',
				starOn : '/assets/images/star-on.png'
			}).on("click", function(){
				scope.updateScore($(element).raty("score"));
			});
		}
	}
})
// 
.directive("chartArea", function(){
	return {
		restrict: "A",
		link: function($scope, element, attrs){
			var ctx = $(element)[0].getContext("2d");
			if(ctx){
				new Chart(ctx).Doughnut($scope.doughnutData, { responsive: true, });
			}
		},
	};
})
// 
.directive('quizFillblank', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attrs, ctrls){
			scope.$watch('onShow', function(){
				if(scope.onShow && scope.question.type == 'blank'){
					var question = scope.question.name.split("_BLANK");
					var count = (scope.question.name.match(/_BLANK/g) || []).length;
					var answer = [];
					for (var i = 0; i < count; i++){ answer.push(1); }
					$(element).quizyFillBlank({
						textItems: question,
						anItems: [],
						anItemsCorrect: answer,
						blockSize: 150,
						allowTouchDrag: false,
						/*onFinishCall: function(param){
							console.log(param);
						}*/
					});
				}
			});
		},
	};
})