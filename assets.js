var path		=	require("path");
module.exports	=	function(assets){
	// Assets Path
	assets.root = path.join(__dirname, '/public');
	// Styles
	assets.addCss("/assets/css/font-awesome.min.css", "css");
	assets.addCss("/assets/css/simple-line-icons.min.css", "css");
	assets.addCss("/assets/css/quizyfillblank.css", "css");
	assets.addCss("/javascripts/ngDialog/css/ngDialog.min.css", "css");
	assets.addCss("/javascripts/ngDialog/css/ngDialog-theme-plain.min.css", "css");
	assets.addCss("/assets/css/bootstrap.css", "css");
	assets.addCss("/assets/css/components.min.css", "css");
	assets.addCss("/assets/css/login.min.css", "css");
	assets.addCss("/assets/css/layout.min.css", "css");
	assets.addCss("/assets/css/blue.min.css", "css");
	assets.addCss("/assets/css/jquery.raty.css", "css");
	assets.addCss("/bower_components/bootstrap-submenu/dist/css/bootstrap-submenu.min.css", "css");
	assets.addCss("/assets/css/offline-themes/offline-theme-slide.css", "css");
	assets.addCss("/assets/css/style.css", "css");

	// Moderator & Participant Scripts
	assets.addJs("/javascripts/jquery/dist/jquery.min.js", "script");
	assets.addJs("/bower_components/bootstrap-submenu/dist/js/bootstrap-submenu.js", "script");
	assets.addJs("/javascripts/bootstrap-sass/assets/javascripts/bootstrap.min.js", "script");
	assets.addJs("/assets/js/vendor/jquery.raty.js", "script");
	assets.addJs("/assets/js/vendor/bootstrap-checkbox.min.js", "script");
	assets.addJs("/assets/js/vendor/Chart.js", "script");
	assets.addJs("/javascripts/angular/angular.min.js", "script");
	assets.addJs("/bower_components/angular-sanitize/angular-sanitize.min.js", "script");
	assets.addJs("/bower_components/videogular/videogular.js", "script");
	assets.addJs("/bower_components/videogular-controls/vg-controls.js", "script");
	assets.addJs("/bower_components/videogular-overlay-play/vg-overlay-play.js", "script");
	assets.addJs("/bower_components/videogular-poster/vg-poster.js", "script");
	assets.addJs("/bower_components/videogular-buffering/vg-buffering.js", "script");
	assets.addJs("/javascripts/angular-messages/angular-messages.min.js", "script");
	assets.addJs("/javascripts/angular-route/angular-route.min.js", "script");
	assets.addJs("/javascripts/angular-cookie/angular-cookies.min.js", "script");
	assets.addJs("/javascripts/ngDialog/js/ngDialog.min.js", "script");
	assets.addJs("/assets/js/ng-videosharing-embed.min.js", "script");
	assets.addJs("/javascripts/angular-validation-match/dist/angular-validation-match.min.js", "script");
	assets.addJs("/javascripts/noty/jquery.noty.packaged.min.js", "script");
	assets.addJs("/javascripts/angular/angular-file-upload-shim.js", "script");
	assets.addJs("/javascripts/angular/angular-file-upload.min.js", "script");
	assets.addJs("/javascripts/moment-with-locales.min.js", "script");
	assets.addJs("/javascripts/ng-idle/angular-idle.min.js", "script");
	assets.addJs("/assets/js/offline.min.js", "script");
	assets.addJs("/assets/js/vendor/jquery.ui.js", "script");
	assets.addJs("/assets/js/vendor/jquery.fs.zoetrope.min.js", "script");
	assets.addJs("/assets/js/vendor/toe.min.js", "script");
	assets.addJs("/assets/js/vendor/jquery.mousewheel.min.js", "script");
	assets.addJs("/assets/js/vendor/imgViewer.min.js", "script");
	assets.addJs("/assets/js/vendor/imgNotes.js", "script");
	assets.addJs("/assets/js/vendor/html2canvas.js", "script");
	assets.addJs("/assets/js/vendor/jquery.plugin.html2canvas.js", "script");
	assets.addJs("/assets/js/vendor/jquery.quizyfillblank.js", "script");
	
	// Moderator App Scripts
	assets.addJs("/ng/controllers/leader.js", "leader");
	assets.addJs("/ng/controllers/forgetpwd.js", "leader");
	assets.addJs("/ng/controllers/new_leader.js", "leader");
	assets.addJs("/ng/controllers/dashboard.js", "leader");
	assets.addJs("/ng/controllers/locked.js", "leader");
	assets.addJs("/ng/controllers/resetpwd.js", "leader");
	assets.addJs("/ng/controllers/profile.js", "leader");
	assets.addJs("/ng/controllers/participants.js", "leader");
	assets.addJs("/ng/controllers/library.js", "leader");
	assets.addJs("/ng/controllers/folder.js", "leader");
	assets.addJs("/ng/controllers/attachment.js", "leader");
	assets.addJs("/ng/controllers/quiz.js", "leader");
	assets.addJs("/ng/controllers/polls.js", "leader");
	assets.addJs("/ng/controllers/preferences.js", "leader");
	assets.addJs("/ng/controllers/live.js", "leader");
	assets.addJs("/ng/controllers/report.js", "leader");
	assets.addJs("/ng/controllers/category.js", "leader");
	assets.addJs("/ng/app.js", "leader");
	assets.addJs("/ng/services.js", "leader");

	// Participant App Scripts
	assets.addJs("/ng_student/controllers/dashboard.js", "student");
	assets.addJs("/ng_student/controllers/student.js", "student");
	assets.addJs("/ng_student/controllers/resetpwd.js", "student");
	assets.addJs("/ng_student/controllers/forgetpwd.js", "student");
	assets.addJs("/ng_student/controllers/profile.js", "student");
	assets.addJs("/ng_student/controllers/activities.js", "student");
	assets.addJs("/ng_student/app.js", "student");
	assets.addJs("/ng_student/services.js", "student");

	
	assets.addJs("/ng_asparticipant/controllers/dashboard.js", "asparticipant");
	assets.addJs("/ng_asparticipant/controllers/profile.js", "asparticipant");
	assets.addJs("/ng_asparticipant/controllers/activities.js", "asparticipant");
	assets.addJs("/ng_asparticipant/app.js", "asparticipant");
	assets.addJs("/ng_asparticipant/services.js", "asparticipant");
};