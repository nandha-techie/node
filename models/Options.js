var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
OptionSchema	=	new Schema({
		questionId: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
			required: true, /*Null not allow*/
		},
		value: {
			type: String,
			default: "Option",
		},
		status: {
			type: Boolean,
			default: 1,
		},
		sort: {
			type: Schema.Types.Number,
			default: 0,
		},
	}, {
		collection: 'options', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Question Id
	OptionSchema.virtual('questionIds').get(function(){
		return String(this.questionId);
	});
	/*// remove/delete hook
	OptionSchema.pre('remove', function(next){
		var option = this;
		mongoose.models.ParticipantAnswer.remove({ optionId: option._id }, function(err){
			mongoose.models.QuestionAnswer.remove({ optionId: option._id }, next)
		});
	});*/

module.exports = mongoose.model('Options', OptionSchema);