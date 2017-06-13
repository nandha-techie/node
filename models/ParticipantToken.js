var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
TokenSchema	=	new Schema({
		participantId: {
			type: Schema.Types.ObjectId,
			ref: 'Participant',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		roomId: {
			type: Schema.Types.ObjectId,
			ref: 'Room',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		token: {
			type: String,
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		expiresAt: {
			type: Date,
			expires: '1d', /*Delete After one day*/
			default: Date.now
		}
	}, {
		collection: 'participanttoken', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);

module.exports = mongoose.model('ParticipantToken', TokenSchema);