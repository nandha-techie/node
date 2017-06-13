var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
bcrypt			=	require("bcrypt"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
AdminSchema	=	new Schema({
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
		isAdmin: {
			type: Boolean,
			default: 1,
		},
		language: {
			type: String,
			required: true, /*Null not allow*/
			default: "en", /*default Value*/
			enum: ['en', 'fr'],
		},
	}, {
		collection: 'admin', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// get Full Name
	AdminSchema.virtual('name').get(function(){
		return this.firstname + " " + this.lastname;
	});
	// Password Encryption
	AdminSchema.pre('save', function(next){
		var admin = this;
		admin.isAdmin = 1;
		// only hash the password if it has been modified (or is new)
		if(!admin.isModified('password')) return next();
		// generate a salt
		bcrypt.genSalt(10, function(err, salt){
			if(err) return next(err);
			// hash the password using our new salt
			bcrypt.hash(admin.password, salt, function(err, hash){
				if(err) return next(err);
				// override the cleartext password with the hashed one
				admin.password = hash;
				next();
			});
		});
	});
	// method to check weather password is correct
	AdminSchema.methods.comparePassword = function(password, callback){
		bcrypt.compare(password, this.password, function(err, isMatch){
			if(err) return callback(err);
			else return callback(null, isMatch);
		});
	};

var Admin = module.exports = mongoose.model('Admin', AdminSchema);

// create if email not exists
Admin.findOrCreate({ email: "admin@mobiteach.com" }, { firstname: "Mobiteach", lastname: "Admin", email: "admin@mobiteach.com", password: "admin123" }, function(err, admin){});