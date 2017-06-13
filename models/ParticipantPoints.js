
var mongoose			=	require('mongoose'),
validators 			=	require('mongoose-validators'),
timestamps			=	require('mongoose-timestamp'),
moment			=	require("moment"),
bcrypt				=	require("bcrypt"),
mongoosePaginate 		=	require('mongoose-paginate'),
findOrCreate 			=	require('mongoose-findorcreate'),
Schema 			=	mongoose.Schema,
ParticipantPointSchema	=	new Schema({
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
		point: {
			type: Schema.Types.Number,
		},
		score: {
			type: Schema.Types.Number,
			default: 1,
		},
		notAnswered: {
			type: Boolean,
			default: 0,
		},
	}, {
		collection: 'participantpoints', // table name
		toObject: { virtuals: true }, // enable virtual fields
		toJSON: { virtuals: true }, // enable virtual fields
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Participant Id
	ParticipantPointSchema.virtual('participantIds').get(function(){
		return String(this.participantId);
	});
	// Parse Question Id
	ParticipantPointSchema.virtual('questionIds').get(function(){
		return String(this.questionId);
	});
	// Parse Activity Id
	ParticipantPointSchema.virtual('activityIds').get(function(){
		return String(this.activityId);
	});

module.exports = mongoose.model('ParticipantPoint', ParticipantPointSchema);