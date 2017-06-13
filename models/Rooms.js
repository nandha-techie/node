var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
randomString		=	require('randomstring'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
RoomSchema		=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		code: {
			type: String,
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		participantLogin: {
			type: Schema.Types.Number,
			required: true, /*Null not allow*/
			default: 1, /*default Value*/
			enum: [0, 1, 2],
		},
		pin: {
			type: String,
			required: true, /*Null not allow*/
			validate: [
				validators.isLength(4, 4), /*validate length is between 4 to 4*/
			],
			default: randomString.generate({ charset: "numeric", length: 4 }), // random 4 digit code (number and upper case characters)
		},
		qrFile: {
			type: String,
			required: true, /*Null not allow*/
		},
		startDate: {
			type: Date,
			default: Date.now,
		},
	}, {
		collection: 'rooms', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// get Full Name
	RoomSchema.virtual('date').get(function(){
		// return moment(this.createdAt).format("dd MMMM, YYYY");
		return moment().format("dd MMMM, YYYY");
	});
	// method to check weather pin is correct
	RoomSchema.methods.comparePin = function(pin, callback){
		return callback(null, (pin == this.pin));
	};

module.exports = mongoose.model('Rooms', RoomSchema);