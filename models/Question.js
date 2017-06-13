var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
QuestionSchema	=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		activityId: {
			type: Schema.Types.ObjectId,
			ref: 'Activities',
			required: true, /*Null not allow*/
		},
		media: [{
			attachment: {
				type: Schema.Types.ObjectId,
				ref: 'Attachment',
			},
		}],
		name: {
			type: String,
			default: "What is the question?",
			required: true, /*Null not allow*/
		},
		status: {
			type: Boolean,
			default: 1,
		},
		type: {
			type: String,
			default: 'single',
			enum: ['truefalse', 'single', 'multiple', 'free', 'blank'],
		},
		sort: {
			type: Schema.Types.Number,
			default: 0,
		},
		feedback: {
			type: String,
		},
		active: {
			type: Schema.Types.Boolean,
			default: 0,
		},
		random: {
			type: Schema.Types.Boolean,
			default: 0,
		},
		timelimit: {
			type: Schema.Types.Number,
			default: 0,
		},
		show: {
			type: Schema.Types.Boolean,
			default: 0,
		},
	}, {
		collection: 'question', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// status Color
	QuestionSchema.virtual('statusColor').get(function(){
		return (this.status) ? "green" : "red";
	});
	// Type Text
	QuestionSchema.virtual('typeText').get(function(){
		return (this.type.charAt(0).toUpperCase() + this.type.slice(1)).replace('_', ' ');
	});
	// Parse Activity Id
	QuestionSchema.virtual('activityIds').get(function(){
		return String(this.activityId);
	});
	// remove/delete hook
	QuestionSchema.pre('remove', function(next){
		var question = this;
		mongoose.models.QuestionAnswer.remove({ questionId: question._id }, function(err){
			mongoose.models.Options.remove({ questionId: question._id }, next);
		});
	});

module.exports = mongoose.model('Question', QuestionSchema);