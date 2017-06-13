var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
mongoosePaginate 	=	require('mongoose-paginate'),
Async			=	require("async"),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
ModeratorSchema	=	new Schema({
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
		username: {
			type: String,
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
			validate: [
				validators.isLength(8, 25), /*validate length is between 3 to 25*/
			],
		},
		email: {
			type: String,
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
			validate: [
				validators.isEmail(), /*validate is email*/
			],
		},
		password: {
			type: String,
			required: true, /*Null not allow*/
			// validate: [validators.isLength(8, 25), /*validate length is between 8 to 25*/],
		},
		isModerator: {
			type: Boolean,
			default: 1,
		},
		language: {
			type: String,
			required: true, /*Null not allow*/
			default: "fr", /*default Value*/
			enum: ['en', 'fr'],
		},
		organisation: {
			type: String,
		},
		note:{
			type: String,
			default: "note",
		},
		mobile: {
			type: Schema.Types.Number,
			// default: 9876543210,
			validate: [
				validators.isLength(10, 10), /*validate length is between 10 to 10*/
			],
		},
		participantLogin: {
			type: Schema.Types.Number,
			required: true, /*Null not allow*/
			default: 1, /*default Value*/
			enum: [0, 1, 2],
		},
	}, {
		collection: 'moderator', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// get Full Name
	ModeratorSchema.virtual('name').get(function(){
		return this.firstname + " " + this.lastname;
	});
	// Password Encryption
	ModeratorSchema.pre('save', function(next){
		var moderator = this;
		moderator.isModerator = 1;
		// only hash the password if it has been modified (or is new)
		if(!moderator.isModified('password')) return next();
		// generate a salt
		bcrypt.genSalt(10, function(err, salt){
			if(err) return next(err);
			// hash the password using our new salt
			bcrypt.hash(moderator.password, salt, function(err, hash){
				if(err) return next(err);
				// override the cleartext password with the hashed one
				moderator.password = hash;
				next();
			});
		});
	});	
	// remove/delete hook
	ModeratorSchema.pre('remove', function(next){
		var moderator = this;
		mongoose.models.Rooms.remove({ moderatorId: moderator._id }, function(err){
			mongoose.models.Activities.remove({ moderatorId: moderator._id }, function(err){
				mongoose.models.Participant.remove({ moderatorId: moderator._id }, function(err){
					mongoose.models.Question.find({ moderatorId: moderator._id }).exec(function(err, questions){
						if(err) next();
						else{
							Async.eachSeries(questions, function iterator(item, callback){
								item.remove();
								callback();
							}, function done(){ next(); });
						}
					});
				});
			});
		});
	});
	// method to check weather password is correct
	ModeratorSchema.methods.comparePassword = function(password, callback){
		bcrypt.compare(password, this.password, function(err, isMatch){
			if(err) return callback(err);
			else return callback(null, isMatch);
		});
	};

var Moderator = module.exports = mongoose.model('Moderator', ModeratorSchema);

// create if email not exists
Moderator.findOrCreate({ email: "moderator@mobiteach.com", }, { username: moment().format("YYYYMMDDTHHmmssSS"), firstname: "Mobiteach", lastname: "Moderator", email: "moderator@mobiteach.com", password: "admin123" }, function(err, moderator){});