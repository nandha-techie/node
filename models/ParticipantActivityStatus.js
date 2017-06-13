var 	mongoose 			=	require('mongoose'),
	validators 			=	require('mongoose-validators'),
	timestamps			=	require('mongoose-timestamp'),
	moment			=	require("moment"),
	bcrypt				=	require("bcrypt"),
	mongoosePaginate 		=	require('mongoose-paginate'),
	findOrCreate 			=	require('mongoose-findorcreate'),
	Schema 			=	mongoose.Schema,
ParticipantActivityStatusSchema	=	new Schema({
		participantId: {
			type: Schema.Types.ObjectId,
			ref: 'Participant',
		},
		activityId: {
			type: Schema.Types.ObjectId,
			ref: 'Activities',
		},
		status: {
			type: String,
			required: true, /*Null not allow*/
			default: "completed", /*default Value*/
			enum: ['completed', 'pending'],
		},
	}, {
		collection: 'participantactivitystatus', // table name
		toObject: { virtuals: true }, // enable virtual fields
		toJSON: { virtuals: true }, // enable virtual fields
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// Parse Participant Id
	ParticipantActivityStatusSchema.virtual('participantIds').get(function(){
		return String(this.participantId);
	});
	// Parse Activity Id
	ParticipantActivityStatusSchema.virtual('activityIds').get(function(){
		return String(this.activityId);
	});
	// date time conversion
	ParticipantActivityStatusSchema.virtual('datetime').get(function(){
		return moment(this.createdAt).format("DD/MM/YYYY - hh") + 'h' + moment(this.createdAt).format("mm");
	});

module.exports = mongoose.model('ParticipantActivityStatus', ParticipantActivityStatusSchema);