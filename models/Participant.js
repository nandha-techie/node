var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
crypto			=	require('crypto'),
algorithm		=	'aes-256-ctr',
text			=	'd6F3Efeq',
Schema 		=	mongoose.Schema,
ParticipantSchema	=	new Schema({
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
		firstname: {
			type: String,
			required: true, /*Null not allow*/
			validate: [
				validators.isLength(3, 25), /*validate length is between 3 to 25*/
			],
		},
		lastname: {
			type: String,
			required: true, /*Null not allow*/
			validate: [
				validators.isLength(3, 25), /*validate length is between 3 to 25*/
			],
		},
		email: {
			type: String,
			required: true, /*Null not allow*/
			validate: [
				validators.isEmail(), /*validate is email*/
			],
		},
		password: {
			type: String,
			required: true, /*Null not allow*/
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
		organisation: {
			type: String,
		},
		isParticipant: {
			type: Boolean,
			default: 1,
		},
	}, {
		collection: 'participant', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// get Full Name
	ParticipantSchema.virtual('name').get(function(){
		return this.firstname + " " + this.lastname;
	});
	// status Color
	ParticipantSchema.virtual('statusColor').get(function(){
		return (this.status) ? "green" : "red";
	});
	ParticipantSchema.virtual('lang').get(function(){
		return (this.language == 'fr') ? "French" : "English";
	});
	// Parse moderatorId Id
	ParticipantSchema.virtual('moderatorIds').get(function(){
		return String(this.moderatorId);
	});
	// Password Encryption
	ParticipantSchema.pre('save', function(next){
		var participant = this;
		participant.isParticipant = 1;
		// only hash the password if it has been modified (or is new)
		if(!participant.isModified('password') && !participant.isModified('pin')) return next();
		/*bcrypt.genSalt(10, function(err, salt){
			if(err){
				return next(err, null);
			}else{
				// hash the password using our new salt
				bcrypt.hash(participant.password, salt, function(err, hash){
					if(err) return next(err, null);
					else{
						participant.password = hash;
						return next();
					}
				});
			}
		});*/
		participant.password = encrypt(participant.password);
		return next();
	});
	// remove/delete hook
	ParticipantSchema.pre('remove', function(next){
		var participant = this;
		mongoose.models.ParticipantLogin.remove({ participantId: participant._id }, next);
	});
	// method to check weather password is correct
	ParticipantSchema.methods.comparePassword = function(password, callback){
		/*bcrypt.compare(password, this.password, function(err, isMatch){
			if(err) return callback(err);
			else return callback(null, isMatch);
		});*/
		return callback(null, (this.password == encrypt(password)));
	};
	// 
	ParticipantSchema.methods.decryptPassword = function(callback){
		return callback(null, decrypt(this.password));
	};

module.exports = mongoose.model('Participant', ParticipantSchema);

function encrypt(password){
	var cipher	=	crypto.createCipher(algorithm, text),
	crypted	=	cipher.update(password, 'utf8', 'hex');
	crypted	+=	cipher.final('hex');
	return crypted;
};
function decrypt(password){
	var decipher	=	crypto.createDecipher(algorithm, text),
	dec		=	decipher.update(password, 'hex', 'utf8');
	dec		+=	decipher.final('utf8');
	return dec;
};