var mongoose			=	require('mongoose'),
validators 			=	require('mongoose-validators'),
timestamps			=	require('mongoose-timestamp'),
moment			=	require("moment"),
bcrypt				=	require("bcrypt"),
mongoosePaginate 		=	require('mongoose-paginate'),
findOrCreate 			=	require('mongoose-findorcreate'),
Schema 			=	mongoose.Schema,
QuestionAnswerSchema	=	new Schema({
		questionId: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
			required: true, /*Null not allow*/
		},
		optionId: {
			type: Schema.Types.ObjectId,
			ref: 'Options',
		},
		answer: {
			type: String,
		},
	}, {
		collection: 'questionanswer', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Question Id
	QuestionAnswerSchema.virtual('questionIds').get(function(){
		return String(this.questionId);
	});
	// Parse Option Id
	QuestionAnswerSchema.virtual('optionIds').get(function(){
		return String(this.optionId);
	});

module.exports = mongoose.model('QuestionAnswer', QuestionAnswerSchema);