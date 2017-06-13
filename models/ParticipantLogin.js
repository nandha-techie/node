var mongoose			=	require('mongoose'),
validators 			=	require('mongoose-validators'),
timestamps			=	require('mongoose-timestamp'),
moment			=	require("moment"),
mongoosePaginate 		=	require('mongoose-paginate'),
findOrCreate 			=	require('mongoose-findorcreate'),
Schema 			=	mongoose.Schema,
ParticipantLoginSchema	=	new Schema({
		participantId: {
			type: Schema.Types.ObjectId,
			ref: 'Participant',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
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
		lastUpdate: {
			type: Date,
			default: Date.now,
		}
	}, {
		collection: 'participantlogin', // table name
		toObject: { virtuals: true }, // enable virtual fields
		toJSON: { virtuals: true }, // enable virtual fields
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Participant Id
	ParticipantLoginSchema.virtual('participantIds').get(function(){
		return String(this.participantId);
	});

module.exports = mongoose.model('ParticipantLogin', ParticipantLoginSchema);