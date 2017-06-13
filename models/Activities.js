var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
Async			=	require("async"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
ActivitySchema		=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		roomId: {
			type: Schema.Types.ObjectId,
			ref: 'Rooms',
			required: true, /*Null not allow*/
		},
		categoryId: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			// required: true, /*Null not allow*/
		},
		fileId: {
			type: Schema.Types.ObjectId,
			ref: 'File',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		name: {
			type: String,
			default: "Activity",
			validate: [
				validators.isLength(1, 250), /*validate length is between 1 to 25*/
			],
		},
		status: {
			type: Boolean,
			default: 1,
		},
		language: {
			type: String,
			required: true, /*Null not allow*/
			default: "en", /*default Value*/
			enum: ['en', 'fr'],
		},
		type: {
			type: String,
			default: 'quiz',
			enum: ['quiz', 'polls', 'survey'],
		},
		start: {
			type: Boolean,
			default: 0,
		},
		isArchived: {
			type: Boolean,
			default: 0,
		},
		show: {
			type: Boolean,
			default: 0,
		},
		feedback: {
			type: Boolean,
			default: 1,
		},
		byParticipant: {
			type: Boolean,
			default: 1,
		},
		random: {
			type: Boolean,
			default: 0,
		},
		description: {
			type: String,
			validate: [
				validators.isLength({ skipNull: true, skipEmpty: true, }, 0, 300), /*validate length is between 0 to 300*/
			],
		},
	}, {
		collection: 'activities', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// get Language Name
	ActivitySchema.virtual('lang').get(function(){
		return (this.language == 'fr') ? "French" : "English";
	});
	// remove/delete hook
	ActivitySchema.pre('remove', function(next){
		var activity = this;
		mongoose.models.Question.find({ activityId: activity._id, }).exec(function(err, questions){
			if(err) next();
			else{
				Async.eachSeries(questions, function iterator(item, callback){
					item.remove();
					callback();
				}, function done(){ next(); });
			}
		});
	});

module.exports = mongoose.model('Activities', ActivitySchema);