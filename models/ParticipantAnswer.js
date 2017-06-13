
var mongoose			=	require('mongoose'),
validators 			=	require('mongoose-validators'),
timestamps			=	require('mongoose-timestamp'),
moment			=	require("moment"),
bcrypt				=	require("bcrypt"),
mongoosePaginate 		=	require('mongoose-paginate'),
findOrCreate 			=	require('mongoose-findorcreate'),
Schema 			=	mongoose.Schema,
ParticipantAnswerSchema	=	new Schema({
		participantId: {
			type: Schema.Types.ObjectId,
			ref: 'Participant',
		},
		activityId: {
			type: Schema.Types.ObjectId,
			ref: 'Activities',
		},
		questionId: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
		},
		optionId: {
			type: Schema.Types.ObjectId,
			ref: 'Options',
		},
		answer: {
			type: String,
		},
		status: {
			type: String,
			enum: ['correct', 'incorrect'],
		},
	}, {
		collection: 'participentanswer', // table name
		toObject: { virtuals: true }, // enable virtual fields
		toJSON: { virtuals: true }, // enable virtual fields
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Participant Id
	ParticipantAnswerSchema.virtual('participantIds').get(function(){
		return String(this.participantId);
	});
	// Parse Question Id
	ParticipantAnswerSchema.virtual('questionIds').get(function(){
		return String(this.questionId);
	});
	// Parse Option Id
	ParticipantAnswerSchema.virtual('optionIds').get(function(){
		return String(this.optionId);
	});

module.exports = mongoose.model('ParticipantAnswer', ParticipantAnswerSchema);