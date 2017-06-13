var 	mongoose 	=	require('mongoose'),
validators 		=	require('mongoose-validators'),
timestamps		=	require('mongoose-timestamp'),
moment		=	require("moment"),
Path			=	require("path"),
mongoosePaginate 	=	require('mongoose-paginate'),
findOrCreate 		=	require('mongoose-findorcreate'),
Schema 		=	mongoose.Schema,
CategorySchema	=	new Schema({
		moderatorId: {
			type: Schema.Types.ObjectId,
			ref: 'Moderator',
			required: true, /*Null not allow*/
		},
		name: {
			type: String,
			required: true,
		},
		status: {
			type: Boolean,
			default: 1,
		},
	}, {
		collection: 'category', // table name
		toObject: {
			virtuals: true, // enable virtual fields
		},
		toJSON: {
			virtuals: true, // enable virtual fields
		},
	}).plugin(timestamps).plugin(findOrCreate).plugin(mongoosePaginate);
	/*// remove/delete hook
	CategorySchema.pre('remove', function(next){
		var category = this;
		mongoose.models.File.remove({ categoryId: category._id }, next);
	});*/

module.exports = mongoose.model('Category', CategorySchema);