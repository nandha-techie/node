var mongoose 	=	require('mongoose');
var validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
VersionSchema	=	new Schema({
		number: {
			type: String,
			required: true, /*Null not allow*/
			index: {
				unique: true, /*unique validation/index*/
			},
		},
		date: {
			type: Date,
			default: Date.now
		}
	}, {
		collection: 'version', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	// 
	VersionSchema.virtual('formatDate').get(function(){
		return moment(this.date).format("MM/DD/YYYY");
	});

var Version = module.exports = mongoose.model('Version', VersionSchema);

// create if version not exists
Version.findOrCreate({ number: "1.5.0", }, { number: "1.5.0" }, function(err, version){});