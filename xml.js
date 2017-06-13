var	fs	=	require('fs'),
	_	=	require("underscore"),
Parser		=	require('xml2json'),
Models		=	require("./models");



fs.readFile('xml.xml', 'utf-8', function(err, data){
	var result = JSON.parse(Parser.toJson(data));
	_.each(result.qef, function(item, index){
		console.log(index);
		if(index == 'qfolders'){
			console.log(item.qfolder);
		}else if(index == 'activity'){
			console.log(item);
		}else if(index == 'questions'){
			console.log(item.question);
		}else if(index == 'assessments'){
			console.log(item.assessment);
		}
	});
});